-- Fases 3, 4 y 5 — Grafo, Red Social y Mercado
--
-- Completa el modelo de dominio de 02_DOMAIN_MODEL.md y 04_DATABASE.md con
-- las entidades que faltaban, cerrando la cadena de 99_CONSTITUTION.md:
--
--   Territorio -> Objetivo -> Indicador -> Marcador -> Reto -> Solución ->
--   Necesidad -> Producto -> Demanda -> Transacción -> Iniciativa ->
--   Resultados -> Caso de éxito -> Nuevo conocimiento
--
-- Convención de identificadores: se mantiene el `id text` legible como clave
-- primaria (NEC*, PUB*, PRD*, DEM*, INI*, CAS*) por coherencia con las
-- entidades ya existentes y para que las URLs y los joins sigan siendo
-- legibles; la columna `uuid` cumple el principio 5 de la Constitución.

-- ===========================================================================
-- Columnas transversales (mismas que la Fase 1) para las tablas nuevas
-- ===========================================================================
-- Se define como función para no repetir 6 ALTER por tabla.
CREATE OR REPLACE FUNCTION rh_add_audit_columns(tbl text) RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS uuid uuid NOT NULL DEFAULT gen_random_uuid()', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by text', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_by text', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_at timestamp', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()', tbl);
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()', tbl);
  EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (uuid)', tbl || '_uuid_key', tbl);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (archived_at)', tbl || '_archived_at_idx', tbl);
END;
$$ LANGUAGE plpgsql;

-- ===========================================================================
-- FASE 3 — NECESIDADES (el eslabón que faltaba entre Solución y Producto)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS needs (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  -- 07_MARKETPLACE.md: una necesidad puede resolverse mediante producto,
  -- servicio, donación, voluntariado, organización o financiación.
  kind text,
  quantity text,
  urgency text,               -- baja | media | alta | critica
  status text DEFAULT 'abierta'
);
SELECT rh_add_audit_columns('needs');

CREATE TABLE IF NOT EXISTS solution_needs (
  solution_id text NOT NULL REFERENCES solutions(id),
  need_id text NOT NULL REFERENCES needs(id),
  PRIMARY KEY (solution_id, need_id)
);

CREATE TABLE IF NOT EXISTS need_territories (
  need_id text NOT NULL REFERENCES needs(id),
  territory_id text NOT NULL REFERENCES territories(id),
  PRIMARY KEY (need_id, territory_id)
);

-- ===========================================================================
-- FASE 5 — PRODUCTOS Y DEMANDAS
-- ===========================================================================
-- Nota: NO existe una entidad "Servicio" separada (instrucción explícita del
-- usuario: "eliminar la separación Producto/Servicio, solo existe PRODUCTO").
-- "Servicio" es un valor del campo `category`.
CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text,
  price_cents integer,
  currency text DEFAULT 'EUR',
  kind text DEFAULT 'fisico',        -- fisico | digital
  modality text DEFAULT 'unico',     -- unico | suscripcion
  billing_period text,               -- mensual | trimestral | anual (si suscripcion)
  stock integer,
  warranty text,
  return_policy text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  organization_id text REFERENCES organizations(id),
  status text DEFAULT 'activo'
);
SELECT rh_add_audit_columns('products');

CREATE TABLE IF NOT EXISTS demands (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  budget_cents integer,
  currency text DEFAULT 'EUR',
  urgency text,                      -- baja | media | alta | critica
  -- 07_MARKETPLACE.md: Abierta | En negociación | Cubierta | Cancelada
  status text NOT NULL DEFAULT 'abierta',
  organization_id text REFERENCES organizations(id)
);
SELECT rh_add_audit_columns('demands');

-- ===========================================================================
-- FASE 7 — INICIATIVAS Y CASOS DE ÉXITO
-- ===========================================================================
-- `projects` se conserva intacto; `initiatives` se puebla a partir de él en
-- un script de migración de datos aparte, para no romper las páginas
-- existentes mientras se hace la transición.
CREATE TABLE IF NOT EXISTS initiatives (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  type text,
  status text,
  image text,
  territory_id text REFERENCES territories(id),
  budget_planned_cents integer,
  budget_executed_cents integer,
  currency text DEFAULT 'EUR',
  started_at date,
  ended_at date,
  duration_note text,
  outcome text,
  lessons text,
  -- Trazabilidad de la procedencia si vino de la tabla `projects`.
  legacy_project_id text
);
SELECT rh_add_audit_columns('initiatives');

CREATE TABLE IF NOT EXISTS success_cases (
  id text PRIMARY KEY,
  title text NOT NULL,
  problem text,
  solution_summary text,
  impact text,
  cost_cents integer,
  currency text DEFAULT 'EUR',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  territory_id text REFERENCES territories(id),
  initiative_id text REFERENCES initiatives(id)
);
SELECT rh_add_audit_columns('success_cases');

-- Indicadores antes/después: es lo que convierte una iniciativa en impacto
-- medible (principio 13 de 01_PRINCIPLES.md).
CREATE TABLE IF NOT EXISTS initiative_results (
  id serial PRIMARY KEY,
  initiative_id text NOT NULL REFERENCES initiatives(id),
  indicator_id text REFERENCES indicators(id),
  marker_id text REFERENCES markers(id),
  value_before double precision,
  value_after double precision,
  unit text,
  measured_at date,
  note text,
  created_at timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS initiative_results_initiative_idx ON initiative_results (initiative_id);

-- ===========================================================================
-- FASE 4 — RED SOCIAL
-- ===========================================================================
CREATE TABLE IF NOT EXISTS publications (
  id text PRIMARY KEY,
  author_user_id text REFERENCES users(id),
  author_organization_id text REFERENCES organizations(id),
  title text,
  body text,
  -- texto | imagen | video | documento | enlace
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  visibility text NOT NULL DEFAULT 'publica',
  status text NOT NULL DEFAULT 'publicada',   -- publicada | en_revision | reportada
  pinned boolean NOT NULL DEFAULT false
);
SELECT rh_add_audit_columns('publications');
CREATE INDEX IF NOT EXISTS publications_author_idx ON publications (author_user_id);
CREATE INDEX IF NOT EXISTS publications_created_idx ON publications (created_at DESC);

-- ---------------------------------------------------------------------------
-- Enlaces polimórficos: el corazón del grafo
-- ---------------------------------------------------------------------------
-- Una publicación puede referirse a CUALQUIER entidad (05_KNOWLEDGE_GRAPH.md:
-- "Publicación -> referencia -> cualquier entidad"). Una tabla de unión por
-- pareja habría exigido 12 tablas y una más por cada entidad futura; esta
-- tabla única cubre todas y hace trivial la regla "toda publicación debe
-- aparecer automáticamente en todas las entidades relacionadas".
CREATE TABLE IF NOT EXISTS publication_links (
  publication_id text NOT NULL REFERENCES publications(id),
  entity_type text NOT NULL,   -- territories | objectives | indicators | markers | metrics | challenges | solutions | needs | products | demands | initiatives | success_cases | users | organizations | causes
  entity_id text NOT NULL,
  PRIMARY KEY (publication_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS publication_links_entity_idx ON publication_links (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Interacciones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id text PRIMARY KEY,
  publication_id text NOT NULL REFERENCES publications(id),
  author_user_id text NOT NULL REFERENCES users(id),
  parent_comment_id text REFERENCES comments(id),   -- respuestas anidadas
  body text NOT NULL
);
SELECT rh_add_audit_columns('comments');
CREATE INDEX IF NOT EXISTS comments_publication_idx ON comments (publication_id);

-- Reacciones sobre cualquier entidad, no solo publicaciones.
CREATE TABLE IF NOT EXISTS reactions (
  user_id text NOT NULL REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  kind text NOT NULL DEFAULT 'apoyo',   -- apoyo | interesa | aporta
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id, kind)
);
CREATE INDEX IF NOT EXISTS reactions_entity_idx ON reactions (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS saves (
  user_id text NOT NULL REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

-- Seguir personas, organizaciones, territorios, objetivos, indicadores y
-- retos (06_SOCIAL_NETWORK.md). Polimórfico por el mismo motivo que los
-- enlaces de publicación.
CREATE TABLE IF NOT EXISTS follows (
  follower_user_id text NOT NULL REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_user_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS follows_entity_idx ON follows (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS notifications (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  entity_type text,
  entity_id text,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, read_at);

-- Moderación: reportar sin borrar nunca (principio 6).
CREATE TABLE IF NOT EXISTS content_reports (
  id serial PRIMARY KEY,
  reporter_user_id text REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'abierto',  -- abierto | revisado | descartado
  reviewed_by text REFERENCES users(id),
  reviewed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

-- ===========================================================================
-- RELACIONES DEL GRAFO entre las entidades nuevas y las existentes
-- ===========================================================================
-- Todas explícitas y por id (principio 8 de la Constitución).

-- Producto
CREATE TABLE IF NOT EXISTS product_territories (
  product_id text NOT NULL REFERENCES products(id),
  territory_id text NOT NULL REFERENCES territories(id),
  PRIMARY KEY (product_id, territory_id));
CREATE TABLE IF NOT EXISTS product_objectives (
  product_id text NOT NULL REFERENCES products(id),
  objective_id text NOT NULL REFERENCES objectives(id),
  PRIMARY KEY (product_id, objective_id));
CREATE TABLE IF NOT EXISTS product_indicators (
  product_id text NOT NULL REFERENCES products(id),
  indicator_id text NOT NULL REFERENCES indicators(id),
  PRIMARY KEY (product_id, indicator_id));
CREATE TABLE IF NOT EXISTS product_challenges (
  product_id text NOT NULL REFERENCES products(id),
  challenge_id text NOT NULL REFERENCES challenges(id),
  PRIMARY KEY (product_id, challenge_id));
CREATE TABLE IF NOT EXISTS product_solutions (
  product_id text NOT NULL REFERENCES products(id),
  solution_id text NOT NULL REFERENCES solutions(id),
  PRIMARY KEY (product_id, solution_id));
CREATE TABLE IF NOT EXISTS product_needs (
  product_id text NOT NULL REFERENCES products(id),
  need_id text NOT NULL REFERENCES needs(id),
  PRIMARY KEY (product_id, need_id));

-- Demanda
CREATE TABLE IF NOT EXISTS demand_territories (
  demand_id text NOT NULL REFERENCES demands(id),
  territory_id text NOT NULL REFERENCES territories(id),
  PRIMARY KEY (demand_id, territory_id));
CREATE TABLE IF NOT EXISTS demand_indicators (
  demand_id text NOT NULL REFERENCES demands(id),
  indicator_id text NOT NULL REFERENCES indicators(id),
  PRIMARY KEY (demand_id, indicator_id));
CREATE TABLE IF NOT EXISTS demand_challenges (
  demand_id text NOT NULL REFERENCES demands(id),
  challenge_id text NOT NULL REFERENCES challenges(id),
  PRIMARY KEY (demand_id, challenge_id));
CREATE TABLE IF NOT EXISTS demand_needs (
  demand_id text NOT NULL REFERENCES demands(id),
  need_id text NOT NULL REFERENCES needs(id),
  PRIMARY KEY (demand_id, need_id));
CREATE TABLE IF NOT EXISTS demand_products (
  demand_id text NOT NULL REFERENCES demands(id),
  product_id text NOT NULL REFERENCES products(id),
  PRIMARY KEY (demand_id, product_id));

-- Iniciativa
CREATE TABLE IF NOT EXISTS initiative_challenges (
  initiative_id text NOT NULL REFERENCES initiatives(id),
  challenge_id text NOT NULL REFERENCES challenges(id),
  PRIMARY KEY (initiative_id, challenge_id));
CREATE TABLE IF NOT EXISTS initiative_solutions (
  initiative_id text NOT NULL REFERENCES initiatives(id),
  solution_id text NOT NULL REFERENCES solutions(id),
  PRIMARY KEY (initiative_id, solution_id));
CREATE TABLE IF NOT EXISTS initiative_objectives (
  initiative_id text NOT NULL REFERENCES initiatives(id),
  objective_id text NOT NULL REFERENCES objectives(id),
  PRIMARY KEY (initiative_id, objective_id));
CREATE TABLE IF NOT EXISTS initiative_organizations (
  initiative_id text NOT NULL REFERENCES initiatives(id),
  organization_id text NOT NULL REFERENCES organizations(id),
  PRIMARY KEY (initiative_id, organization_id));
CREATE TABLE IF NOT EXISTS initiative_products (
  initiative_id text NOT NULL REFERENCES initiatives(id),
  product_id text NOT NULL REFERENCES products(id),
  quantity integer,
  PRIMARY KEY (initiative_id, product_id));
CREATE TABLE IF NOT EXISTS initiative_demands (
  initiative_id text NOT NULL REFERENCES initiatives(id),
  demand_id text NOT NULL REFERENCES demands(id),
  PRIMARY KEY (initiative_id, demand_id));
CREATE TABLE IF NOT EXISTS initiative_participants (
  initiative_id text NOT NULL REFERENCES initiatives(id),
  user_id text NOT NULL REFERENCES users(id),
  role text,
  PRIMARY KEY (initiative_id, user_id));
CREATE TABLE IF NOT EXISTS initiative_territories (
  initiative_id text NOT NULL REFERENCES initiatives(id),
  territory_id text NOT NULL REFERENCES territories(id),
  PRIMARY KEY (initiative_id, territory_id));

-- Caso de éxito
CREATE TABLE IF NOT EXISTS success_case_initiatives (
  success_case_id text NOT NULL REFERENCES success_cases(id),
  initiative_id text NOT NULL REFERENCES initiatives(id),
  PRIMARY KEY (success_case_id, initiative_id));

-- ===========================================================================
-- FASE 6 — ECONOMÍA (estructura; Stripe se activa al final)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS stripe_accounts (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id),
  organization_id text REFERENCES organizations(id),
  stripe_account_id text NOT NULL UNIQUE,
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  country text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  -- compra | donacion | suscripcion | patrocinio
  kind text NOT NULL,
  -- pendiente | procesando | pagado | reembolsado | cancelado | fallido
  status text NOT NULL DEFAULT 'pendiente',
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  platform_fee_cents integer DEFAULT 0,
  payer_user_id text REFERENCES users(id),
  payee_user_id text REFERENCES users(id),
  payee_organization_id text REFERENCES organizations(id),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  concept text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_payer_idx ON transactions (payer_user_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions (status);

-- 09_STRIPE.md: "toda transacción deberá poder relacionarse con" cualquier
-- entidad del grafo. Mismo patrón polimórfico.
CREATE TABLE IF NOT EXISTS transaction_links (
  transaction_id text NOT NULL REFERENCES transactions(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  PRIMARY KEY (transaction_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS transaction_links_entity_idx ON transaction_links (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS refunds (
  id text PRIMARY KEY,
  transaction_id text NOT NULL REFERENCES transactions(id),
  amount_cents integer NOT NULL,
  reason text,
  stripe_refund_id text,
  created_by text REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now()
);

-- Apoyo a creadores (tipo Patreon): donación puntual o recurrente.
CREATE TABLE IF NOT EXISTS supports (
  id text PRIMARY KEY,
  supporter_user_id text NOT NULL REFERENCES users(id),
  beneficiary_user_id text REFERENCES users(id),
  beneficiary_organization_id text REFERENCES organizations(id),
  initiative_id text REFERENCES initiatives(id),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  recurring boolean NOT NULL DEFAULT false,
  period text,                      -- mensual | trimestral | anual
  status text NOT NULL DEFAULT 'activo',
  stripe_subscription_id text,
  created_at timestamp NOT NULL DEFAULT now(),
  cancelled_at timestamp
);
CREATE INDEX IF NOT EXISTS supports_beneficiary_idx ON supports (beneficiary_user_id);

-- ===========================================================================
-- FASE 9 — ASISTENTE IA (estructura; se activa con ANTHROPIC_API_KEY)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id),
  title text,
  -- Permiso de edición elegido por el usuario para esta conversación:
  -- manual (solo sugiere) | aceptar (pide confirmación) | autonomo
  edit_mode text NOT NULL DEFAULT 'manual',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  archived_at timestamp
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id serial PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES ai_conversations(id),
  role text NOT NULL,               -- user | assistant | system
  content text NOT NULL,
  -- Distinguir de dónde salió cada dato: plataforma vs internet (petición
  -- explícita del usuario).
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  entities_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  input_tokens integer,
  output_tokens integer,
  cost_cents double precision,
  duration_ms integer,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_messages_conversation_idx ON ai_messages (conversation_id);

-- Acciones propuestas por la IA. NUNCA se ejecutan directamente por el
-- modelo: quedan aquí, el backend valida permisos y solo entonces se
-- aplican. Es el "Agente de Acciones" separado que pide el encargo.
CREATE TABLE IF NOT EXISTS ai_proposed_actions (
  id serial PRIMARY KEY,
  conversation_id text REFERENCES ai_conversations(id),
  user_id text REFERENCES users(id),
  action_type text NOT NULL,        -- CREATE_PRODUCT | UPDATE_INDICATOR | ...
  entity_type text,
  entity_id text,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  rationale text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- propuesta | aceptada | rechazada | ejecutada | fallida
  status text NOT NULL DEFAULT 'propuesta',
  decided_by text REFERENCES users(id),
  decided_at timestamp,
  result jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_proposed_actions_status_idx ON ai_proposed_actions (status);

-- Base de conocimiento para RAG: fragmentos indexados de cualquier entidad.
CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
  id serial PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  content text NOT NULL,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- El vector de embeddings se añadirá cuando se active la IA; se deja como
  -- jsonb para no exigir pgvector todavía.
  embedding jsonb,
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_knowledge_entity_idx ON ai_knowledge_chunks (entity_type, entity_id);
-- Búsqueda por texto completo en español mientras no haya embeddings.
CREATE INDEX IF NOT EXISTS ai_knowledge_content_idx ON ai_knowledge_chunks
  USING gin (to_tsvector('spanish', content));

-- Vacíos de conocimiento detectados a partir de preguntas sin buena respuesta.
CREATE TABLE IF NOT EXISTS ai_knowledge_gaps (
  id serial PRIMARY KEY,
  question text NOT NULL,
  occurrences integer NOT NULL DEFAULT 1,
  territory_id text REFERENCES territories(id),
  objective_id text REFERENCES objectives(id),
  indicator_id text REFERENCES indicators(id),
  status text NOT NULL DEFAULT 'abierto',
  last_seen_at timestamp NOT NULL DEFAULT now(),
  created_at timestamp NOT NULL DEFAULT now()
);
