-- PROYECTOS DE CADA PERSONA (2026-08-08, user request): the same board that
-- runs humanity.wiki's own roadmap, available to anyone for their own project.
--
-- Each project brings its own groups (label + colour), so the board stays
-- readable whatever the subject is; the platform roadmap keeps the nine fixed
-- groups and is simply the project with proyecto_id NULL.
CREATE TABLE IF NOT EXISTS proyectos (
  id          text PRIMARY KEY,
  titulo      text NOT NULL,
  descripcion text,
  vision      text,
  slug        text UNIQUE NOT NULL,
  creador_user_id text REFERENCES users(id),
  grupos      jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{id,label,color}]
  publico     boolean NOT NULL DEFAULT true,
  created_by  text,
  updated_by  text,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now(),
  archived_at timestamp
);

CREATE INDEX IF NOT EXISTS proyectos_creador_idx ON proyectos (creador_user_id);

-- Las tarjetas pasan a poder pertenecer a un proyecto. NULL = la hoja de ruta
-- de la propia plataforma, que es la que ya existe.
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS proyecto_id text REFERENCES proyectos(id);
CREATE INDEX IF NOT EXISTS roadmap_items_proyecto_idx ON roadmap_items (proyecto_id);

-- El grupo solo está encorsetado en la hoja de ruta de la plataforma: cada
-- proyecto define los suyos y no tendría sentido limitarlos a nuestros nueve.
ALTER TABLE roadmap_items DROP CONSTRAINT IF EXISTS roadmap_items_grupo_check;
ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_grupo_check CHECK (
  proyecto_id IS NOT NULL
  OR grupo IN ('canvas','mapas','datos','social','mercado','diseno','ia','infra','gobernanza')
);
