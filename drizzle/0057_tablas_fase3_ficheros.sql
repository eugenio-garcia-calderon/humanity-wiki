-- ============================================================================
-- TABLAS · FASE 3 — LAS CELDAS QUE LLEVAN FICHEROS
-- ============================================================================
-- Imagen, vídeo y documento. Tres tipos y no uno solo porque lo que cambia es
-- qué se ACEPTA y cómo se ENSEÑA: una imagen se ve en la celda, un vídeo se
-- reproduce, un documento se descarga. El almacenamiento es el mismo para los
-- tres.
--
-- ── NO SE INVENTA UN SEGUNDO ALMACÉN ────────────────────────────────────────
-- Los bytes ya tienen dónde vivir: el volumen `/data/uploads`, fuera del
-- repositorio, que usan el chat, el editor y el Mundo 3D. Y `archivos` (de
-- `archivo.ts`, hecho anoche) ya anota de qué cuelga cada fichero, con los
-- permisos heredados del contenedor.
--
-- Así que aquí NO hay tabla nueva de ficheros. Se añade una tercera columna de
-- contenedor a `archivos` —`fila_id`— igual que ya tiene `proyecto_id`,
-- `tarea_id` y `pagina_id`. Un fichero de una celda es un fichero colgado de
-- una fila, y punto.
--
-- POR QUÉ IMPORTA: si se hubiera creado un almacén propio, habría dos sitios
-- donde un fichero puede perderse, dos formas de calcular quién puede verlo, y
-- la limpieza de huérfanos tendría que saber de los dos. Con esto, un fichero
-- de una celda hereda los permisos de la tabla igual que uno de un proyecto
-- hereda los del proyecto, y no hay dos verdades sobre quién ve qué.
-- ============================================================================

ALTER TABLE bd_columnas DROP CONSTRAINT IF EXISTS bd_columnas_tipo_check;

ALTER TABLE bd_columnas ADD CONSTRAINT bd_columnas_tipo_check CHECK (tipo IN (
  'texto', 'numero', 'fecha', 'seleccion', 'casilla',
  'texto_largo', 'url', 'email', 'telefono',
  'moneda', 'porcentaje', 'duracion', 'valoracion', 'seleccion_multiple',
  'persona', 'proyecto', 'publicacion', 'relacion',
  -- Fase 3: los que llevan ficheros
  'imagen', 'video', 'documento'
));

-- ── UNA FILA COMO CONTENEDOR DE FICHEROS ────────────────────────────────────
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS fila_id text REFERENCES bd_filas(id) ON DELETE CASCADE;

-- Qué columna de esa fila. Sin esto, una fila con dos columnas de imagen no
-- podría distinguir cuál es la portada y cuál el plano.
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS columna_id text REFERENCES bd_columnas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS archivos_fila_idx ON archivos (fila_id, columna_id, created_at);

-- ── QUÉ GUARDA `config` ─────────────────────────────────────────────────────
--   imagen     { varios: bool }
--   video      { varios: bool }
--   documento  { varios: bool }
--
-- No se guarda una lista de extensiones permitidas por columna: el tipo ya dice
-- qué familia acepta, y dejar que cada columna redefina eso son mil formas de
-- configurar mal lo mismo.
