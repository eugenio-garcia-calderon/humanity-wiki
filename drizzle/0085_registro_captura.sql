-- ============================================================================
-- CAPTURAR LOS CAMBIOS DESDE LA BASE DE DATOS, NO DESDE LA APLICACIÓN (2026-08-22)
-- ============================================================================
-- Fase B de `memory/09_TARGET_ARCHITECTURE/04_DATA_INTEGRITY_TIERS.md`.
--
-- ── POR QUÉ EN LA BASE DE DATOS Y NO EN EL CÓDIGO ──────────────────────────
-- Un registro escrito por la aplicación anota lo que hace la aplicación. Y el
-- camino más probable para corromper un dato aquí NO pasa por la aplicación:
-- es alguien con la contraseña de PostgreSQL escribiendo un `UPDATE` a mano.
-- Eso una capa de código no lo ve, y por tanto no lo anota.
--
-- Un disparador sí. Da igual quién escriba —el servidor, un `psql` de
-- madrugada, una migración, otro programa— la fila queda capturada.
--
-- ── LO QUE SE GUARDA ES LA HUELLA DE LA FILA, NO LA FILA ───────────────────
-- De cada cambio se guarda un resumen criptográfico del contenido anterior y
-- del nuevo, no una copia. Tres motivos, en orden de importancia:
--
--   1. Basta para demostrar manipulación: si la fila de hoy no da la huella que
--      se selló ayer, alguien la ha cambiado por fuera.
--   2. El resumen del día se publica FUERA (fase D), y las directrices del CEPD
--      (02/2025 v2.0) dicen que la huella de un dato personal sigue siendo un
--      dato personal. Aquí lo que se publica es un resumen de resúmenes con sal;
--      guardar copias del contenido haría de este registro una segunda base de
--      datos con todo dentro, y con dos sitios donde filtrarse.
--   3. Ocupa lo mismo cambie un campo o cambien cien.
--
-- Quien necesite el CONTENIDO anterior lo sigue teniendo en `entity_history`.
-- Este registro responde a otra pregunta: «¿esto es lo mismo que había?».
--
-- ── EL BUZÓN, Y POR QUÉ NO SE SELLA DENTRO DEL DISPARADOR ──────────────────
-- Encadenar y firmar dentro del disparador metería una operación en serie
-- —cada escritura esperando a la anterior— dentro de cada transacción de la
-- plataforma. Un fallo al firmar tumbaría un guardado normal, y la seguridad
-- que rompe el trabajo se acaba quitando.
--
-- Así que el disparador solo deja una nota en `registro_pendiente` (rápido,
-- sin firmar) y un proceso aparte la pasa al registro sellado. Es el patrón
-- «buzón de salida», el mismo que usa medio mundo para no acoplar dos cosas que
-- fallan por motivos distintos.
--
-- ── Y SI ALGUIEN BORRA DEL BUZÓN ANTES DE QUE SE SELLE ─────────────────────
-- Se nota. `id` es una secuencia: si al sellar falta el 41 entre el 40 y el 42,
-- el hueco se anota en el registro sellado como tal. No se puede saber QUÉ
-- decía la nota que faltaba — pero saber que faltaba una ya es la diferencia
-- entre un borrado silencioso y uno que deja marca.

CREATE TABLE IF NOT EXISTS registro_pendiente (
  id             BIGSERIAL PRIMARY KEY,
  momento        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  tabla          TEXT         NOT NULL,
  operacion      TEXT         NOT NULL,   -- INSERT | UPDATE | DELETE
  clave          TEXT,                    -- el id de la fila, si la tabla tiene uno
  huella_nueva   TEXT,                    -- NULL en un DELETE
  huella_vieja   TEXT,                    -- NULL en un INSERT
  -- Quién escribió, según la propia base de datos: el rol y el nombre que
  -- declara la conexión. Un `psql` a mano y el servidor no se parecen aquí, y
  -- esa diferencia es justo lo que interesa ver.
  actor_bd       TEXT         NOT NULL,
  -- El número de transacción de PostgreSQL. Es lo que permite demostrar que
  -- dos filas se escribieron JUNTAS o no se escribió ninguna — que en un libro
  -- de puntos es la diferencia entre «Ana le dio 10 a Luis» y dos apuntes
  -- sueltos que podrían no tener nada que ver. Sin esto, el registro cuenta dos
  -- hechos donde hubo uno.
  txid           BIGINT       NOT NULL DEFAULT txid_current(),
  sellado_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS registro_pendiente_sin_sellar_idx
  ON registro_pendiente (id) WHERE sellado_at IS NULL;

-- ── EL DISPARADOR ───────────────────────────────────────────────────────────
-- `AFTER`, para no poder impedir la escritura: esto vigila, no autoriza. Quien
-- autoriza es la tabla de permisos, y son dos trabajos distintos.
CREATE OR REPLACE FUNCTION registro_capturar() RETURNS TRIGGER AS $$
DECLARE
  huella_n TEXT;
  huella_v TEXT;
  clave_fila TEXT;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    huella_n := encode(sha256(convert_to(to_jsonb(NEW)::text, 'UTF8')), 'hex');
    clave_fila := to_jsonb(NEW) ->> 'id';
  END IF;
  IF TG_OP <> 'INSERT' THEN
    huella_v := encode(sha256(convert_to(to_jsonb(OLD)::text, 'UTF8')), 'hex');
    clave_fila := coalesce(clave_fila, to_jsonb(OLD) ->> 'id');
  END IF;

  -- Un UPDATE que no cambia nada no es un cambio. Sin esto, un `UPDATE … SET
  -- x = x` masivo llenaría el registro de ruido y escondería lo de verdad.
  IF TG_OP = 'UPDATE' AND huella_n = huella_v THEN
    RETURN NULL;
  END IF;

  INSERT INTO registro_pendiente (tabla, operacion, clave, huella_nueva, huella_vieja, actor_bd, txid)
  VALUES (TG_TABLE_NAME, TG_OP, clave_fila, huella_n, huella_v,
          current_user || '@' || coalesce(nullif(current_setting('application_name', true), ''), 'sin-nombre'),
          txid_current());
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ── A QUÉ TABLAS SE LE PONE ─────────────────────────────────────────────────
-- Las de capa 3 (`src/server/seguridad/clasificacion.ts`) MENOS estas, y cada
-- exclusión con su motivo, que es lo que impide que la lista se pudra:
--
--   registro_sellado, registro_anclajes, registro_pendiente
--       recursión: sellar escribiría, y esa escritura pediría ser sellada.
--   entity_history
--       ya es un registro, y de los que más crecen. Sellar el registro del
--       registro duplica el volumen sin añadir garantía: lo que protege a
--       `entity_history` es que las tablas que resume están vigiladas.
--   stripe_events, ai_usage_charges
--       volumen alto y llegan de fuera (webhooks, cada mensaje del chat).
--       Entran en la segunda tanda, cuando haya medida de cuánto pesa esto.
--   comments, publications, incidencias, mensajes, argumentos,
--   content_reports, ai_proposed_actions, initiative_results, reservas_stock
--       son de capa 3 por autoría o trazabilidad, no porque corromperlas mueva
--       dinero o permisos. Segunda tanda, por el mismo motivo de volumen.
--   sessions
--       ES LA EXCLUSIÓN QUE MÁS DUELE, y va con su motivo entero porque alguien
--       la va a querer añadir. Una fila insertada ahí a mano ES entrar como esa
--       persona: es justo lo que interesa ver.
--
--       Pero `auth.ts:223` hace `UPDATE sessions SET last_seen_at = now()` **en
--       cada petición autenticada**, sin freno. Con el disparador puesto, cada
--       vez que alguien carga una página se capturaría una nota, y cada nota se
--       encadena y se firma en serie: el registro quedaría lleno de «fulano
--       cargó una página» y el sellador no alcanzaría nunca. Un registro donde
--       el 99 % es rutina no lo lee nadie — la misma razón por la que el tablero
--       de seguridad solo anota las lecturas de los agentes.
--
--       Ignorar solo esa columna tampoco vale de forma barata: la huella se
--       calcula sobre la fila entera, así que habría que calcularla sin esa
--       columna en el disparador Y sin ella al comprobar, o `comprobarFila`
--       daría DISTINTA en cuanto alguien recargara. Se hace bien o no se hace.
--
--       Lo que se pierde mientras tanto, dicho claro: **una sesión fabricada a
--       mano no queda anotada**. Se recupera anotando el alta de sesión desde
--       `auth.ts`, que es un hecho de la aplicación y no una fila que cambia
--       sola. Está en la fase B2.
--
-- Se aplica solo a las tablas que existan: hay ramas donde alguna todavía no.
DO $$
DECLARE
  t TEXT;
  vigiladas TEXT[] := ARRAY[
    -- quién es quién, y quién manda
    'users', 'password_resets', 'agentes_ia', 'handles_reservados', 'memberships',
    -- dinero
    'transactions', 'transaction_links', 'refunds', 'stripe_accounts', 'movimientos_puntos',
    'supports', 'pedidos', 'pedido_lineas', 'presupuestos_proyecto',
    -- el bien común medido
    'territories', 'indicators', 'indicator_observations', 'metrics', 'metric_observations',
    'markers', 'marker_observations', 'measurement_stations', 'objectives', 'veracidad_fuentes'
  ];
BEGIN
  FOREACH t IN ARRAY vigiladas LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS registro_captura ON %I', t);
      EXECUTE format(
        'CREATE TRIGGER registro_captura AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION registro_capturar()', t);
    END IF;
  END LOOP;
END $$;
