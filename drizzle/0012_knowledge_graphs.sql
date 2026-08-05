-- ============================================================================
-- Grafos de Conocimiento (Fase 11) — la nueva forma de acceder al conocimiento
-- ============================================================================
-- Un Grafo de Conocimiento es un lienzo curado sobre un tema, compuesto de
-- Ventanas de Conocimiento conectadas entre sí. La "memoria" de qué se carga
-- y dónde vive AQUÍ, en la base de datos (no en la IA): el grafo es un acto
-- editorial reproducible, versionable y con autor. La IA solo enruta
-- ("Ceuta Frontera Amenaza" → abrir el grafo) y propone borradores nuevos.
--
-- Decisiones del usuario (2026-08-05): creación abierta a cualquier usuario
-- registrado (nivel 1); canvas libre; los grafos y las ventanas tienen
-- creador y valoración 0-10.

-- El grafo: tema, creador, y las palabras clave que lo invocan desde el chat.
CREATE TABLE IF NOT EXISTS knowledge_graphs (
  id text PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  creator_user_id text REFERENCES users(id),
  -- Frases/palabras normalizadas (minúsculas, sin tildes) que el buscador/chat
  -- usa para resolver "qué grafo abrir" sin gastar una llamada a la IA.
  trigger_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'publicado', -- borrador | publicado
  is_ai_generated boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0
);
SELECT rh_add_audit_columns('knowledge_graphs');

-- La ventana: pieza de conocimiento REUTILIZABLE (una misma ventana puede
-- aparecer en varios grafos — la gente remezcla ventanas ajenas en grafos
-- nuevos y la autoría original se conserva).
CREATE TABLE IF NOT EXISTS knowledge_windows (
  id text PRIMARY KEY,
  title text NOT NULL,
  -- publicacion | imagen | video | wikipedia | enlace | mapa | grafica |
  -- ficha | cronologia | autores | documento | grafo
  kind text NOT NULL,
  -- Configuración específica por tipo: {publication_id} | {image_url, source_name,
  -- source_url} | {youtube_id, channel} | {wiki_lang, wiki_page} | {url} |
  -- {map_url} | {chart:{...}} | {facts:[...]} | {events:[...]} | {authors:[...]} |
  -- {quote, quote_translation, source_name, source_url, context} | {graph_slug}
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  creator_user_id text REFERENCES users(id),
  is_ai_generated boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0
);
SELECT rh_add_audit_columns('knowledge_windows');

-- Posición de cada ventana EN cada grafo (la memoria espacial del lienzo).
CREATE TABLE IF NOT EXISTS graph_windows (
  graph_id text NOT NULL REFERENCES knowledge_graphs(id),
  window_id text NOT NULL REFERENCES knowledge_windows(id),
  x double precision NOT NULL DEFAULT 0,
  y double precision NOT NULL DEFAULT 0,
  PRIMARY KEY (graph_id, window_id)
);

-- Conexiones tipadas entre ventanas. from_window_id NULL = nodo central del
-- grafo. Los tipos "apoya/contradice/matiza" permiten mapear la controversia
-- honestamente: mostrar la complejidad es la misión de la plataforma.
CREATE TABLE IF NOT EXISTS graph_edges (
  id serial PRIMARY KEY,
  graph_id text NOT NULL REFERENCES knowledge_graphs(id),
  from_window_id text REFERENCES knowledge_windows(id),
  to_window_id text NOT NULL REFERENCES knowledge_windows(id),
  relation text NOT NULL DEFAULT 'contexto', -- contexto | causa | dato | fuente | apoya | contradice | matiza
  label text
);
CREATE INDEX IF NOT EXISTS graph_edges_graph_idx ON graph_edges (graph_id);

-- Valoración 0-10 (un voto por usuario y entidad), polimórfica como
-- reactions/saves/follows: sirve para ventanas, grafos y publicaciones.
CREATE TABLE IF NOT EXISTS ratings (
  user_id text NOT NULL REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  score integer NOT NULL CHECK (score >= 0 AND score <= 10),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS ratings_entity_idx ON ratings (entity_type, entity_id);

-- Comentarios polimórficos: hasta ahora solo existían sobre publicaciones
-- (publication_id NOT NULL). Se añaden entity_type/entity_id para poder
-- comentar ventanas y grafos, con backfill de lo existente — nada se rompe.
ALTER TABLE comments ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS entity_id text;
UPDATE comments SET entity_type = 'publications', entity_id = publication_id
  WHERE entity_type IS NULL AND publication_id IS NOT NULL;
ALTER TABLE comments ALTER COLUMN publication_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS comments_entity_idx ON comments (entity_type, entity_id);
