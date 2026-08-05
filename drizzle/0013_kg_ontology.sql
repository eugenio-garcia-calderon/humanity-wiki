-- ============================================================================
-- Ontología aplicada e inferencia (Fase 11b) — mejores prácticas de grafos
-- de conocimiento (2026-08-05, petición del usuario)
-- ============================================================================
-- De los seis componentes canónicos de un grafo de conocimiento (entidades,
-- identificadores, atributos, relaciones, ontología, inferencia), esta
-- migración cierra los dos que faltaban:
--
-- 1. ONTOLOGÍA: los vocabularios de tipos de ventana y de relación dejan de
--    ser solo listas en el código — la base de datos los aplica con CHECK.
--    Un tipo nuevo exige decisión consciente (migración), no un typo.
-- 2. ANCLAJE AL GRAFO GENERAL: `graph_entity_links` conecta cada grafo de
--    conocimiento con las entidades de la plataforma de las que trata
--    (territorios, objetivos, retos…). Sobre esa tabla se INFIEREN los
--    "grafos relacionados" (comparten entidades) sin que nadie los enlace
--    a mano — la primera regla de razonamiento de la plataforma.

ALTER TABLE knowledge_windows DROP CONSTRAINT IF EXISTS knowledge_windows_kind_check;
ALTER TABLE knowledge_windows ADD CONSTRAINT knowledge_windows_kind_check CHECK (kind IN (
  'publicacion', 'imagen', 'video', 'wikipedia', 'enlace', 'mapa',
  'grafica', 'ficha', 'cronologia', 'autores', 'documento', 'grafo', 'texto'
));

ALTER TABLE graph_edges DROP CONSTRAINT IF EXISTS graph_edges_relation_check;
ALTER TABLE graph_edges ADD CONSTRAINT graph_edges_relation_check CHECK (relation IN (
  'contexto', 'causa', 'dato', 'fuente', 'apoya', 'contradice', 'matiza'
));

-- De qué entidades de la plataforma trata un grafo. `relation` con
-- vocabulario propio y cerrado: trata_sobre (el tema), afecta_a (impacto),
-- se_apoya_en (base de datos/indicadores usados).
CREATE TABLE IF NOT EXISTS graph_entity_links (
  graph_id text NOT NULL REFERENCES knowledge_graphs(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  relation text NOT NULL DEFAULT 'trata_sobre'
    CHECK (relation IN ('trata_sobre', 'afecta_a', 'se_apoya_en')),
  PRIMARY KEY (graph_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS graph_entity_links_entity_idx ON graph_entity_links (entity_type, entity_id);
