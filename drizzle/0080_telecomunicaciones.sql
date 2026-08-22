-- ============================================================================
-- TELECOMUNICACIONES · MENSAJES EN VIVO, LLAMADAS Y VIDEOLLAMADAS (2026-08-22)
-- ============================================================================
-- Eugenio: «quiero que esta plataforma sustituya a WhatsApp, que se pueda
-- enviar mensajes y hacer llamadas y videollamadas compartiendo pantalla etc.
-- Y que con un número de la persona le puedas encontrar en la base de datos y
-- enviarle un mensaje o llamarle, y le saltará en su aplicación».
--
-- ── QUÉ FALTABA, EXACTAMENTE ───────────────────────────────────────────────
-- Los mensajes entre personas existían desde el 2026-08-20 (tabla `mensajes`).
-- Lo que no existía era nada de esto:
--
--   1. UN NÚMERO. La tabla `users` no tenía teléfono. Sin número no hay
--      «búscame por mi móvil», que es la puerta de entrada de WhatsApp entera:
--      no te agregan por un nombre de usuario, te encuentran por tu número.
--   2. LLAMADAS. No había ni tabla ni registro de nada.
--   3. LA SEGUNDA MARCA DE VERIFICACIÓN. `mensajes` sabía si lo habías LEÍDO,
--      no si te había LLEGADO. Son dos cosas distintas y las dos se enseñan.
--   4. ADJUNTOS. Un chat sin fotos ni notas de voz no sustituye a WhatsApp.
--
-- ── LO QUE NO SE GUARDA AQUÍ, A PROPÓSITO ──────────────────────────────────
-- EL AUDIO Y EL VÍDEO DE UNA LLAMADA NO PASAN POR ESTA BASE DE DATOS NI POR EL
-- SERVIDOR. Van de un navegador al otro directamente (WebRTC, cifrado de
-- extremo a extremo por definición del protocolo). Aquí queda el REGISTRO de
-- la llamada —quién, a quién, cuándo, cuánto duró, cómo acabó—, que es lo que
-- hace falta para pintar un historial y lo que la Constitución pide poder
-- auditar. El contenido de la conversación no lo tiene nadie más que las dos
-- personas, y esa es una diferencia de fondo con WhatsApp, donde la lista de
-- con quién hablas y cuándo sí vive en un servidor ajeno.

-- ── EL NÚMERO DE TELÉFONO ───────────────────────────────────────────────────
-- SE GUARDA NORMALIZADO: solo dígitos, con prefijo de país y sin el `+`
-- (`34600123456`). Es lo que ya hace `src/utils/telefono.ts` desde esta misma
-- mañana para los contactos importados, y tiene que ser idéntico en los dos
-- lados: la gracia de todo esto es cruzar «los números de mi agenda» con «los
-- números de la gente registrada», y dos formatos distintos no cruzan nada.
--
-- La restricción es `NOT VALID` a propósito: no hay ninguna fila con teléfono
-- todavía, así que no hay nada que revalidar, y así no se bloquea la tabla de
-- personas en producción mientras la migración corre.
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono text;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_telefono_formato
    CHECK (telefono IS NULL OR telefono ~ '^[0-9]{6,15}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ÚNICO, Y ESO ES UNA DECISIÓN. Un número identifica a UNA persona: si dos
-- cuentas pudieran declarar el mismo, «búscame por mi móvil» devolvería dos
-- resultados y ninguno sería de fiar. El índice parcial deja fuera los nulos,
-- que son casi todas las filas de hoy.
CREATE UNIQUE INDEX IF NOT EXISTS users_telefono_idx
  ON users (telefono) WHERE telefono IS NOT NULL;

-- ¿QUIERES QUE TE ENCUENTREN POR EL NÚMERO? Por defecto sí —sin eso no hay
-- sustituto de WhatsApp— pero se puede apagar. Quien lo apaga sigue pudiendo
-- llamar y escribir; simplemente deja de aparecer en la búsqueda por número.
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono_buscable boolean NOT NULL DEFAULT true;

-- ── LOS MENSAJES CRECEN: ENTREGA Y ADJUNTOS ────────────────────────────────
-- `entregado_at` es la segunda marca. Se pone cuando el mensaje llega al
-- aparato de la otra persona (su conexión abierta lo recibe), no cuando el
-- servidor lo guarda. La diferencia importa: «guardado» solo dice que el
-- servidor hizo su trabajo; lo que quiere saber quien escribe es si le ha
-- llegado a la otra persona.
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS entregado_at timestamp;

-- El adjunto: una foto, un audio, un documento. La URL la devuelve
-- `/api/uploads`, que ya existía y ya decide él la extensión a partir del tipo
-- real. Aquí solo se apunta. `adjunto_segundos` es para las notas de voz: sin
-- eso, la barra de reproducción no puede pintar cuánto dura hasta que el
-- audio se ha descargado entero.
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS adjunto_url text;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS adjunto_tipo text;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS adjunto_nombre text;
ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS adjunto_segundos integer;

-- UN MENSAJE PUEDE SER SOLO UNA FOTO. Hasta ahora `texto` era obligatorio y
-- con sentido, porque no había otra cosa que mandar. Se relaja a «o texto o
-- adjunto», que es lo que impide de verdad guardar un mensaje vacío.
ALTER TABLE mensajes ALTER COLUMN texto DROP NOT NULL;

DO $$ BEGIN
  ALTER TABLE mensajes ADD CONSTRAINT mensajes_algo_que_decir
    CHECK (coalesce(texto, '') <> '' OR adjunto_url IS NOT NULL) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── LAS LLAMADAS ────────────────────────────────────────────────────────────
-- Una fila por intento de llamada, incluidos los que no se contestan: una
-- llamada perdida es información —es LA información, muchas veces— y no
-- guardarla dejaría un historial que miente por omisión.
CREATE TABLE IF NOT EXISTS llamadas (
  id            text PRIMARY KEY,
  -- Identificador permanente que pide la Constitución (regla 5).
  uuid          uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  de_user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  para_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Con qué se empieza. Se puede encender la cámara a mitad de una llamada de
  -- voz: esto es cómo NACIÓ, no cómo terminó.
  tipo          text NOT NULL DEFAULT 'audio' CHECK (tipo IN ('audio', 'video')),

  -- EL FINAL DE UNA LLAMADA TIENE SEIS FORMAS Y NO DAN IGUAL:
  --   sonando        está sonando ahora mismo
  --   en_curso       descolgada, hablando
  --   terminada      alguien colgó después de hablar
  --   rechazada      la otra persona la rechazó a propósito
  --   perdida        sonó y nadie lo cogió
  --   cancelada      quien llamaba colgó antes de que la cogieran
  --   sin_conexion   la otra persona no tenía la aplicación abierta
  -- «Rechazada» y «perdida» se parecen y no son lo mismo, y quien llamó no
  -- debe poder distinguirlas: a los dos se les enseña «no contestada».
  estado        text NOT NULL DEFAULT 'sonando'
                CHECK (estado IN ('sonando', 'en_curso', 'terminada', 'rechazada',
                                  'perdida', 'cancelada', 'sin_conexion')),

  -- Si en algún momento alguien compartió pantalla. Se apunta porque cambia lo
  -- que fue esa llamada (una reunión de trabajo, no una charla).
  compartio_pantalla boolean NOT NULL DEFAULT false,

  creada_at     timestamptz NOT NULL DEFAULT now(),
  contestada_at timestamptz,
  terminada_at  timestamptz,
  -- Duración en segundos, ya calculada. Se guarda en vez de restar dos fechas
  -- cada vez que se pinta el historial, y sobre todo: es lo que se cobra o se
  -- audita el día que una llamada valga puntos.
  segundos      integer,

  -- La papelera de 15 días de la Constitución, igual que en todo lo demás.
  archived_at   timestamptz,
  deleted_at    timestamptz
);

-- El historial se lee SIEMPRE por persona y por fecha. Dos índices, uno por
-- cada lado de la llamada, porque «mis llamadas» son las que hice y las que
-- recibí y en Postgres eso es un OR que no usa un índice compuesto de los dos.
CREATE INDEX IF NOT EXISTS llamadas_de_idx   ON llamadas (de_user_id, creada_at DESC);
CREATE INDEX IF NOT EXISTS llamadas_para_idx ON llamadas (para_user_id, creada_at DESC);

-- Las que están vivas ahora mismo. Es la consulta del camino crítico —cada
-- señal de WebRTC comprueba que la llamada existe y es de quien dice ser— y
-- son cuatro filas en toda la tabla, así que el índice parcial las tiene
-- prácticamente en memoria.
CREATE INDEX IF NOT EXISTS llamadas_vivas_idx
  ON llamadas (estado) WHERE estado IN ('sonando', 'en_curso');
