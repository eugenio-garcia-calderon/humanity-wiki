-- ============================================================================
-- Fase 12 (2026-08-05): facturación de IA, mapas de usuario y productos en grafos
-- ============================================================================

-- 1) Libro de consumo de IA por usuario. Cada llamada al modelo que hace un
--    usuario registrado apunta aquí su coste real en créditos de Anthropic
--    (céntimos de €, aproximación 1$≈1€) más la comisión del 50% de la
--    plataforma. `settled_at` se rellena cuando el usuario paga el saldo.
CREATE TABLE IF NOT EXISTS ai_usage_charges (
  id            serial PRIMARY KEY,
  user_id       text NOT NULL,
  kind          text NOT NULL DEFAULT 'chat',   -- chat | grafo | mapa
  model         text NOT NULL,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_cents    double precision NOT NULL,      -- coste Anthropic
  fee_cents     double precision NOT NULL,      -- comisión plataforma (50%)
  total_cents   double precision NOT NULL,      -- coste + comisión
  conversation_id text,
  settled_at    timestamp,
  created_at    timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_charges_user_idx ON ai_usage_charges (user_id, settled_at);

-- 2) Mapas de usuario: vistas del mapa de la humanidad creadas y publicadas
--    a nombre de una persona (vía chat IA o manualmente), indexadas y
--    valorables como los grafos. `config` guarda qué carga el mapa
--    (territorio, nivel, objetivo...).
CREATE TABLE IF NOT EXISTS user_maps (
  id              text PRIMARY KEY,
  title           text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description     text,
  creator_user_id text,
  config          jsonb NOT NULL DEFAULT '{}'::jsonb,
  trigger_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  status          text NOT NULL DEFAULT 'publicado',
  is_ai_generated boolean NOT NULL DEFAULT false,
  views           integer NOT NULL DEFAULT 0
);
SELECT rh_add_audit_columns('user_maps');

-- 3) Los productos del Mercado pueden aparecer como ventanas en los grafos.
ALTER TABLE knowledge_windows DROP CONSTRAINT IF EXISTS knowledge_windows_kind_check;
ALTER TABLE knowledge_windows ADD CONSTRAINT knowledge_windows_kind_check CHECK (kind IN (
  'publicacion','imagen','video','wikipedia','enlace','mapa','grafica',
  'ficha','cronologia','autores','documento','grafo','texto','producto'
));
