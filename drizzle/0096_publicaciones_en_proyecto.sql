-- Publicaciones dentro de un proyecto.
--
-- Eugenio (2026-08-22): «quiero que la página de proyectos me permita crear
-- publicaciones dentro del proyecto de manera sencilla, y que me diga si la
-- publicación tiene imagen o vídeo y me deje adjuntar archivos, referencias».
--
-- Las páginas, esquemas y mapas ya nacían dentro de un proyecto —cada una tiene
-- su `proyecto_id` desde la 0022— pero las publicaciones del muro no. Esta es la
-- columna que faltaba para que colgar una publicación de un proyecto sea lo
-- mismo que colgar una página, y no un caso aparte.
--
-- Adjuntos y referencias NO necesitan tabla nueva: `publications.media` y
-- `publications.links` existen desde la 0009 y ya distinguen imagen, vídeo y
-- documento. Lo que faltaba era poder escribirlos después de crear la
-- publicación, y eso es código, no esquema.

ALTER TABLE publications ADD COLUMN IF NOT EXISTS proyecto_id text REFERENCES proyectos(id);

-- Toda clave foránea lleva índice (norma de la casa, 2026-08-22): sin él,
-- borrar un proyecto obliga a Postgres a recorrer entera la tabla de
-- publicaciones, y listar las de un proyecto también.
CREATE INDEX IF NOT EXISTS publications_proyecto_idx ON publications (proyecto_id);
