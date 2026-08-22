-- ============================================================================
-- PERSONAS: EL CRM (2026-08-20, petición de Eugenio: «en la sección de
-- personas, crea una página donde se puedan ver todas […] permite crear grupos
-- […] y ponerlo como favoritos […] esto es como un CRM, tienes que tener
-- complejidad de datos como Salesforce permitiendo conectarlo todo con las
-- herramientas y proyectos»).
-- ============================================================================
-- FASE 1 y 2: la ficha de una persona y los grupos.
--
-- LA DECISIÓN QUE MANDA SOBRE TODO LO DEMÁS: **no se crea una tabla de
-- contactos**. Ya existe.
--
-- En la plataforma hay hoy tres cosas que son «personas» y conviene no
-- confundirlas:
--
--   · `users`        — cuentas reales de la plataforma. No son tuyas: son de
--                      quien las abrió, y su nombre lo pone esa persona.
--   · `organizations`— organizaciones.
--   · `game_agents`  — LA GENTE DE TU MUNDO. Las creas tú, tienen memoria,
--                      pueden apuntar a una cuenta real (`persona_user_id`) y
--                      ya cuelgan de proyectos (`proyecto_ids`).
--
-- Ese tercero YA ES un fichero de contactos: tu lista de gente, con lo que
-- sabes de cada cual. Crear una tabla `contactos` al lado habría sido la
-- cuarta cosa llamada «persona» en el mismo producto — el error que ya costó
-- cuatro páginas «Universo» borradas. Así que se le añade lo que le falta.

ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS email           text;
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS telefono        text;
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS empresa         text;
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS web             text;
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS ubicacion       text;
-- Lo que estás haciendo con esa persona. Es lo que convierte una lista de
-- contactos en un CRM: no «quién es», sino «en qué punto estamos».
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS estado          text;
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS ultimo_contacto timestamptz;
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS favorito        boolean NOT NULL DEFAULT false;
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS etiquetas       jsonb   NOT NULL DEFAULT '[]'::jsonb;
-- A QUÉ GRUPOS PERTENECE. Un array y no una tabla intermedia, siguiendo el
-- precedente que ya hay en esta misma tabla (`proyecto_ids`): una persona está
-- en tres o cuatro grupos, no en tres mil, y una tabla más sería la 44.ª del
-- proyecto. Con índice GIN, «quién está en este grupo» sigue siendo rápido.
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS grupo_ids       jsonb   NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_agents_grupos ON game_agents USING gin (grupo_ids);
CREATE INDEX IF NOT EXISTS idx_agents_favorito ON game_agents (user_id)
  WHERE favorito AND archived_at IS NULL;

-- ----------------------------------------------------------------------------
-- LOS GRUPOS
-- ----------------------------------------------------------------------------
-- Tuyos: «Clientes», «Aldea», «Inversores». Un grupo FAVORITO sale en el menú
-- lateral, que es lo que pidió Eugenio: los que usas se ponen a mano.
CREATE TABLE IF NOT EXISTS grupos_personas (
  id          text PRIMARY KEY,
  nombre      text NOT NULL,
  descripcion text,
  icono       text,
  color       text,
  favorito    boolean NOT NULL DEFAULT false,
  orden       integer NOT NULL DEFAULT 0,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_grupos_persona_user ON grupos_personas (user_id)
  WHERE archived_at IS NULL;
