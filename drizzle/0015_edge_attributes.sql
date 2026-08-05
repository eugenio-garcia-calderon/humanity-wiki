-- ============================================================================
-- Las conexiones como protagonistas (Fase 11e, 2026-08-05)
-- ============================================================================
-- Petición del usuario: las relaciones de un grafo unen conceptos y merecen
-- protagonismo — al hacer clic en el círculo o en la flecha deben mostrarse
-- los atributos de esa unión. Se les añade descripción (por qué existe esta
-- conexión, qué significa), autoría y fechas. Con entity_type='graph_edges'
-- las tablas polimórficas de ratings y comments ya les sirven tal cual.
ALTER TABLE graph_edges ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE graph_edges ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE graph_edges ADD COLUMN IF NOT EXISTS updated_by text;
ALTER TABLE graph_edges ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
ALTER TABLE graph_edges ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
