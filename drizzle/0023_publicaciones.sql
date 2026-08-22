-- TODO ES UNA PUBLICACIÓN (2026-08-08, user request): a map, a canvas, a
-- project, a book, a document — every one of them is something a person
-- published, so every one of them needs the same three things: its author can
-- edit it, its author can make it public or private, and its author can send it
-- to the recycle bin.
--
-- What was already there and is reused rather than duplicated:
--   knowledge_graphs.status  'publicado' / 'borrador'  → public / private
--   proyectos.publico        boolean                   → public / private
--   publications.visibility  'public' / 'private'      → public / private
--   knowledge_windows        had NO visibility at all  → added here
--
-- The recycle bin (Constitution v1.1, rule 6) only existed for windows. The
-- other three kinds could only be archived, which is not what the user asked
-- for: they asked for a bin with a countdown, the same one for everything.

-- 1. A window can now be private: it stays in its graph for its author and
--    disappears from everyone else's listings.
ALTER TABLE knowledge_windows ADD COLUMN IF NOT EXISTS publico boolean NOT NULL DEFAULT true;

-- 2. The 15-day bin, for the four kinds that did not have it.
ALTER TABLE knowledge_graphs ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE proyectos        ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE publications     ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE user_maps        ADD COLUMN IF NOT EXISTS deleted_at timestamp;

-- Partial indexes: the sweep only ever looks at the few rows in the bin, and
-- every read path filters `deleted_at IS NULL`, which is the common case.
CREATE INDEX IF NOT EXISTS knowledge_graphs_papelera_idx ON knowledge_graphs (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS proyectos_papelera_idx        ON proyectos        (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS publications_papelera_idx     ON publications     (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_maps_papelera_idx        ON user_maps        (deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. Two things every publication needs and none of the five tables had:
--    is it finished or still being built, and who else may work on it.
--
-- One shared table instead of ten columns spread over five tables. Rows are
-- created lazily on the first change, so "no row" means the honest default:
-- still in progress, no collaborators. This is NOT a junction table of the
-- kind src/db/CLAUDE.md forbids — it follows the `(entity_type, entity_id)`
-- shape the codebase already uses in graph_entity_links and publication_links.
CREATE TABLE IF NOT EXISTS publicacion_meta (
  tipo          text NOT NULL,          -- ventana | muro | lienzo | proyecto | mapa
  entity_id     text NOT NULL,
  estado        text NOT NULL DEFAULT 'en_desarrollo',
  colaboradores jsonb NOT NULL DEFAULT '[]'::jsonb,   -- ["U_…", …]
  updated_by    text,
  updated_at    timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (tipo, entity_id),
  CONSTRAINT publicacion_meta_tipo_check  CHECK (tipo IN ('ventana','muro','lienzo','proyecto','mapa')),
  CONSTRAINT publicacion_meta_estado_check CHECK (estado IN ('en_desarrollo','terminado'))
);

-- Lookup is "am I a collaborator on this?", which is a jsonb containment test.
CREATE INDEX IF NOT EXISTS publicacion_meta_colaboradores_idx
  ON publicacion_meta USING gin (colaboradores);
