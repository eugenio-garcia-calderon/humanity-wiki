-- ============================================================================
-- EL REGISTRO SELLADO: SOLO CRECE, Y SE NOTA SI ALGUIEN LO TOCA (2026-08-22)
-- ============================================================================
-- Fase 0 de `memory/09_TARGET_ARCHITECTURE/03_SECURITY_AND_CHAIN.md`, y la base
-- sobre la que se apoyan la fase 1 (el libro de puntos) y la fase 2 (el anclaje
-- diario fuera de nuestro control).
--
-- Eugenio: «no puede ser corrompible». Hoy `entity_history` guarda muy bien lo
-- que cambió, y se puede editar y borrar como cualquier tabla: quien altera un
-- dato puede alterar también su rastro, y entonces el rastro no vale nada.
--
-- ── CÓMO SE NOTA ────────────────────────────────────────────────────────────
-- Cada anotación lleva la HUELLA de la anterior. Quitar una, cambiar una letra
-- de una, o meter una en medio rompe todas las huellas siguientes, y el
-- verificador dice EXACTAMENTE en cuál se rompió. No impide el cambio: lo hace
-- imposible de esconder, que es lo que se puede prometer de verdad.
--
-- ── LA SAL, Y POR QUÉ NO SOBRA ──────────────────────────────────────────────
-- Cada anotación lleva su propia sal aleatoria. Sirve para la fase 2: lo que se
-- publica fuera es un resumen del día construido con estas huellas, y las
-- directrices finales del Comité Europeo de Protección de Datos (7 de julio de
-- 2026) dicen que la huella de un dato personal SIGUE SIENDO un dato personal.
-- Con sal, y guardando la sal aquí dentro, lo que sale fuera no se puede
-- relacionar con nadie — y borrar la sal deja el resumen publicado sin relación
-- posible con la persona, que es como se cumple el derecho de supresión sin
-- reescribir lo ya publicado.
--
-- ── LOS DISPARADORES NO SON LA SEGURIDAD, SON LA HIGIENE ────────────────────
-- `UPDATE` y `DELETE` quedan prohibidos por disparador. Eso para el accidente y
-- el atajo de madrugada, que es lo que de verdad pasa. NO para a quien tenga
-- permisos para quitar el disparador: contra eso está la cadena de huellas, y
-- sobre todo el anclaje de la fase 2, que se publica donde no mandamos.

CREATE TABLE IF NOT EXISTS registro_sellado (
  n              BIGSERIAL PRIMARY KEY,
  momento        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  -- Qué clase de hecho: 'puntos', 'permiso', 'dato', 'sesion'…
  clase          TEXT         NOT NULL,
  -- Quién lo hizo: id de persona, id de agente IA, o 'sistema'.
  actor          TEXT         NOT NULL,
  -- Sobre qué: el id de la cosa. Puede ser NULL si el hecho no va de una cosa.
  asunto         TEXT,
  datos          JSONB        NOT NULL DEFAULT '{}'::jsonb,
  sal            TEXT         NOT NULL,
  huella         TEXT         NOT NULL,
  huella_previa  TEXT         NOT NULL
);

CREATE INDEX IF NOT EXISTS registro_sellado_momento_idx ON registro_sellado (momento);
CREATE INDEX IF NOT EXISTS registro_sellado_clase_idx   ON registro_sellado (clase, momento);
CREATE INDEX IF NOT EXISTS registro_sellado_asunto_idx  ON registro_sellado (asunto);

-- Una huella no puede repetirse: si dos anotaciones tuvieran la misma, la
-- cadena tendría dos continuaciones válidas y «la verdad» dejaría de ser una.
CREATE UNIQUE INDEX IF NOT EXISTS registro_sellado_huella_idx ON registro_sellado (huella);

-- ── LA PIEZA QUE HACE QUE DOS A LA VEZ NO PARTAN LA CADENA ──────────────────
-- Anotar es: leer la última huella, calcular la siguiente, escribir. Si dos
-- peticiones hacen eso a la vez, las dos leen la misma última huella y las dos
-- escriben — y la cadena se bifurca, con dos anotaciones que dicen venir de la
-- misma. Ninguna de las dos miente y el verificador no puede elegir.
--
-- Este índice lo impide en la base de datos, que es el único sitio donde dos
-- peticiones se ven: solo UNA anotación puede decir que viene de una huella
-- dada. La segunda choca, y quien anota reintenta leyendo la nueva última.
-- Se prefiere esto a un cerrojo porque un cerrojo hay que acordarse de cogerlo,
-- y basta un sitio que no lo coja para que la garantía deje de existir.
CREATE UNIQUE INDEX IF NOT EXISTS registro_sellado_previa_idx ON registro_sellado (huella_previa);

CREATE OR REPLACE FUNCTION registro_sellado_solo_crece() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'El registro sellado solo admite anotaciones nuevas. Para corregir algo, anota la corrección (%).', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS registro_sellado_sin_update ON registro_sellado;
CREATE TRIGGER registro_sellado_sin_update
  BEFORE UPDATE ON registro_sellado
  FOR EACH ROW EXECUTE FUNCTION registro_sellado_solo_crece();

DROP TRIGGER IF EXISTS registro_sellado_sin_delete ON registro_sellado;
CREATE TRIGGER registro_sellado_sin_delete
  BEFORE DELETE ON registro_sellado
  FOR EACH ROW EXECUTE FUNCTION registro_sellado_solo_crece();

-- ============================================================================
-- LOS ANCLAJES: el resumen de cada día, y dónde se publicó (fase 2)
-- ============================================================================
-- Se crea ya, vacía, porque el verificador tiene que poder distinguir «este día
-- no está anclado todavía» de «este día no cuadra». Sin esta tabla solo podría
-- decir dos cosas, y diría la equivocada.
CREATE TABLE IF NOT EXISTS registro_anclajes (
  dia            DATE         PRIMARY KEY,
  raiz           TEXT         NOT NULL,   -- raíz de Merkle de las huellas del día
  desde_n        BIGINT       NOT NULL,
  hasta_n        BIGINT       NOT NULL,
  -- Dónde se publicó y cuándo. NULL mientras solo esté calculada: calculada no
  -- es publicada, y confundirlas sería prometer una prueba que no existe.
  publicado_en   TEXT,
  publicado_at   TIMESTAMPTZ,
  referencia     TEXT,                    -- el recibo: OpenTimestamps, transacción…
  creado_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
