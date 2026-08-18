-- ============================================================================
-- 0030 — Juego Vital: archivo de cada agente (fotos y documentos)
-- ============================================================================
-- Cada persona o proyecto del mundo guarda su propio archivo: fotos, PDFs,
-- lo que el jugador quiera dejarle. Mismo patrón que `memoria` (un array
-- jsonb en la propia fila) en vez de una tabla nueva: se lee y se escribe
-- siempre junto al agente, nunca por separado.
--
-- Cada entrada: {url, nombre, tipo, es_imagen, created_at}

ALTER TABLE game_agents
  ADD COLUMN IF NOT EXISTS archivos jsonb NOT NULL DEFAULT '[]'::jsonb;
