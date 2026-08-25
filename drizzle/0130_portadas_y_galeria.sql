-- ============================================================================
-- PORTADAS Y GALERÍA DE UN PROYECTO (2026-08-26)
-- ============================================================================
-- Eugenio: «permite a las ramas del proyecto añadir imágenes de portada a cada
-- rama. Y también permite añadir una galería de imágenes general al proyecto,
-- justo debajo del título, con descripción de cada imagen opcional. […] y
-- también añade la posibilidad de crear imágenes de portada de esos proyectos,
-- que aparecerán en las tarjetas cuando estemos en la visión general».
--
-- Son tres cosas y **sólo una de ellas es una tabla**.
--
-- ── UNA PORTADA ES UN CAMPO, NO UNA TABLA ──────────────────────────────────
-- Un proyecto tiene UNA portada y una rama tiene UNA portada. Eso es una
-- columna. Una tabla `portadas(entidad_tipo, entidad_id, url)` para guardar un
-- valor único por fila es una junction table de las 43 que ya sobran, y además
-- deja abierta la pregunta de qué pasa cuando hay dos filas para la misma cosa
-- — una pregunta que una columna no puede ni plantear.
--
-- ── UNA GALERÍA SÍ ES UNA TABLA ────────────────────────────────────────────
-- Son muchas por proyecto, van ordenadas y cada una lleva su descripción.
--
-- ── POR QUÉ NO SE REUTILIZA `archivos` ─────────────────────────────────────
-- Los adjuntos de un proyecto ya viven en `archivos`, y con `clase='imagen'`
-- se podría llamar galería a un subconjunto de ellos. No se hace, y la razón
-- es de producto, no de código: **son dos cosas distintas para quien las usa**.
-- Los archivos son el material del proyecto —un PDF, un contrato, la captura
-- que pegaste ayer— y la galería es lo que el proyecto ENSEÑA de sí mismo,
-- debajo del título, ordenado a mano y con pie de foto. Mezclarlas significa
-- que adjuntar una factura la publica en la portada, y que quitarla de la
-- portada la borra de los archivos. Ninguna de las dos es lo que nadie espera.
-- El precio es una tabla más y está escrito aquí para que se lea como decisión.

-- ── LA PORTADA DE CADA RAMA ────────────────────────────────────────────────
ALTER TABLE proyecto_ramas ADD COLUMN IF NOT EXISTS portada_url text;

-- ── LA PORTADA DEL PROYECTO, la que se ve en las tarjetas del listado ──────
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS portada_url text;

-- ── LA GALERÍA ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proyecto_imagenes (
  id               text PRIMARY KEY,
  proyecto_id      text NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  url              text NOT NULL,
  -- Opcional, como se pidió: una foto que se explica sola no necesita pie, y
  -- obligar a escribirlo es obligar a escribir «foto» debajo de una foto.
  descripcion      text,
  orden            integer NOT NULL DEFAULT 0,
  creador_user_id  text,
  created_at       timestamp NOT NULL DEFAULT now(),
  updated_at       timestamp NOT NULL DEFAULT now(),
  archived_at      timestamp
);

-- La clave foránea lleva su índice en la misma migración que la declara: es la
-- regla de `drizzle/CLAUDE.md`, y aquí además es la consulta que hace la página
-- del proyecto cada vez que se abre. Lleva `orden` dentro porque el listado
-- siempre pide las dos cosas juntas y así sale ya ordenado del índice.
CREATE INDEX IF NOT EXISTS proyecto_imagenes_por_proyecto
  ON proyecto_imagenes (proyecto_id, orden, created_at);
