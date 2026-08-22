-- ============================================================================
-- 0029 — Juego Vital: agentes del mundo (personas y proyectos)
-- ============================================================================
-- Cada cosa que el jugador crea en su mundo (una persona relevante, un
-- proyecto vital) es un AGENTE: tiene aspecto, posición en el mapa, memoria
-- propia (la información que el jugador le va metiendo) y su propia
-- conversación con la IA, de modo que hablar con él es hablar con alguien que
-- recuerda lo suyo y solo lo suyo.
--
-- `persona_user_id` queda preparado para el día en que esa persona se registre
-- de verdad en la plataforma y reclame su avatar (salvaguardas en
-- memory/10_JUEGO_VITAL.md).

CREATE TABLE IF NOT EXISTS game_agents (
  id               text PRIMARY KEY,
  -- Dueño del mundo donde vive el agente.
  user_id          text NOT NULL REFERENCES users(id),
  tipo             text NOT NULL CHECK (tipo IN ('persona', 'proyecto')),
  nombre           text NOT NULL,
  rol              text,
  descripcion      text,
  foto_url         text,
  -- Colores del avatar low-poly (ropa, pelo, piel) o del edificio.
  apariencia       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Lo que el jugador le ha ido contando: [{texto, created_at}]
  memoria          jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Enlace a la entidad real cuando existe.
  proyecto_id      text,
  persona_user_id  text REFERENCES users(id),
  -- Dónde está plantado en el mundo (metros).
  x                real NOT NULL DEFAULT 0,
  z                real NOT NULL DEFAULT 0,
  -- Su hilo de conversación con la IA.
  conversation_id  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       text,
  updated_by       text,
  archived_at      timestamptz
);

CREATE INDEX IF NOT EXISTS game_agents_user_idx ON game_agents (user_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS game_agents_conv_idx ON game_agents (conversation_id);
