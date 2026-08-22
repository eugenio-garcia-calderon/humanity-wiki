-- VISIÓN Y HOJA DE RUTA (2026-08-08, user request): the operational board that
-- says what humanity.wiki is for, what is built, what is being built and what
-- is missing — grouped so hundreds of features stay readable.
--
-- One entity table, not a junction: `bloques` holds the detail of each feature
-- as an ordered list of text/image blocks, the same idea as a knowledge window
-- but without dragging the whole graph machinery into a planning board.
CREATE TABLE IF NOT EXISTS roadmap_items (
  id          text PRIMARY KEY,
  grupo       text NOT NULL,
  titulo      text NOT NULL,
  resumen     text,
  estado      text NOT NULL DEFAULT 'por_hacer',
  prioridad   text NOT NULL DEFAULT 'media',
  autor_user_id text REFERENCES users(id),
  bloques     jsonb NOT NULL DEFAULT '[]'::jsonb,
  orden       integer NOT NULL DEFAULT 0,
  created_by  text,
  updated_by  text,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now(),
  archived_at timestamp,
  CONSTRAINT roadmap_items_estado_check CHECK (estado IN ('hecho', 'en_curso', 'por_hacer')),
  CONSTRAINT roadmap_items_prioridad_check CHECK (prioridad IN ('alta', 'media', 'baja')),
  CONSTRAINT roadmap_items_grupo_check CHECK (grupo IN (
    'canvas', 'mapas', 'datos', 'social', 'mercado', 'diseno', 'ia', 'infra', 'gobernanza'
  ))
);

CREATE INDEX IF NOT EXISTS roadmap_items_grupo_idx  ON roadmap_items (grupo);
CREATE INDEX IF NOT EXISTS roadmap_items_estado_idx ON roadmap_items (estado);
