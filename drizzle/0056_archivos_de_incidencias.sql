-- ============================================================================
-- ADJUNTAR ARCHIVOS A UNA NOTA DEL HORMIGUERO (2026-08-22)
-- ============================================================================
-- Eugenio, en el propio hormiguero: «permite adjuntar archivos cuando se
-- reporta un bug». Tiene toda la razón: la mitad de los fallos se cuentan mucho
-- mejor con una captura que con un párrafo, y hasta hoy había que describir con
-- palabras lo que se estaba viendo.
--
-- SE REUSA LA TABLA `archivos`, que ya guarda los adjuntos de proyectos, tareas
-- y páginas, en vez de crear una tabla nueva. Un adjunto es la misma cosa
-- cuelgue de donde cuelgue —mismos bytes, mismo tipo, mismo tamaño, mismo quién
-- lo subió— y una segunda tabla sería un segundo sitio donde arreglar cada
-- fallo de los adjuntos. Es además la regla de la casa: 43 tablas de unión son
-- suficientes.
--
-- UNA COLUMNA MÁS Y NO UNA COLUMNA «TIPO + ID». Con `contenedor_tipo` y
-- `contenedor_id` genéricos no habría forma de que la base de datos comprobara
-- que el id existe: se podrían colgar archivos de una nota borrada y nadie se
-- enteraría. Con una columna por contenedor, la clave foránea lo impide.
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS incidencia_id text
  REFERENCES incidencias(id) ON DELETE CASCADE;

-- Se pregunta siempre igual: «los archivos de esta nota». Parcial, porque la
-- inmensa mayoría de las filas de `archivos` no son de una incidencia y no
-- tienen por qué ocupar sitio en este índice.
CREATE INDEX IF NOT EXISTS archivos_incidencia_idx
  ON archivos (incidencia_id) WHERE incidencia_id IS NOT NULL;

-- ── Y LA REGLA DE «UN SOLO CONTENEDOR», AL DÍA ──────────────────────────────
-- `archivos` tiene una comprobación que exige que un fichero cuelgue de
-- EXACTAMENTE UNA cosa: sin ella, una fila con proyecto y página a la vez
-- aparecería en dos sitios y borrar uno dejaría el otro apuntando al vacío.
--
-- La comprobación contaba tres contenedores. Con el cuarto sin contar, colgar
-- un fichero de una nota daba «violates check constraint» — comprobado en
-- pruebas antes de subir esto. Se rehace contando los cuatro.
--
-- (`fila_id` y `columna_id`, de las tablas, NO entran en la cuenta a propósito:
-- no son un contenedor alternativo sino un uso ADEMÁS del suyo — el fichero
-- sigue colgando de su proyecto y una celda lo señala.)
ALTER TABLE archivos DROP CONSTRAINT IF EXISTS archivos_un_solo_contenedor;
ALTER TABLE archivos ADD CONSTRAINT archivos_un_solo_contenedor CHECK (
  (proyecto_id IS NOT NULL)::int + (tarea_id IS NOT NULL)::int
  + (pagina_id IS NOT NULL)::int + (incidencia_id IS NOT NULL)::int = 1
);
