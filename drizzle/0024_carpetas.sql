-- CARPETAS PERSONALES (2026-08-08, user request): "un menú lateral izquierdo
-- que sean carpetas donde el usuario puede ordenar sus publicaciones… una
-- publicación puede estar en muchas carpetas a la vez".
--
-- Cada persona organiza en sus propias carpetas lo que ve —lo suyo y lo de la
-- humanidad, es una carpeta de marcadores personal, no de propiedad—. Una
-- publicación real vive en cinco tablas distintas (knowledge_windows,
-- publications, knowledge_graphs, proyectos, user_maps); en vez de cinco
-- tablas de unión, una sola con (tipo, entity_id), como ya hace
-- publicacion_meta y como pide src/db/CLAUDE.md.

CREATE TABLE IF NOT EXISTS carpetas (
  id         text PRIMARY KEY,
  user_id    text NOT NULL REFERENCES users(id),
  nombre     text NOT NULL,
  color      text,
  orden      int NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carpetas_user_idx ON carpetas (user_id, orden);
-- Nombre único por persona (sin distinguir mayúsculas): evita "Salud" y
-- "salud" como dos carpetas distintas cuando la IA y el usuario van creando.
CREATE UNIQUE INDEX IF NOT EXISTS carpetas_user_nombre_idx ON carpetas (user_id, lower(nombre));

CREATE TABLE IF NOT EXISTS carpeta_publicaciones (
  carpeta_id text NOT NULL REFERENCES carpetas(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('ventana','muro','lienzo','proyecto','mapa')),
  entity_id  text NOT NULL,
  added_by   text,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (carpeta_id, tipo, entity_id)
);
CREATE INDEX IF NOT EXISTS carpeta_publicaciones_entity_idx ON carpeta_publicaciones (tipo, entity_id);
