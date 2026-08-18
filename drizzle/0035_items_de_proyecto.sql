-- ============================================================================
-- PLAZA DEL PROYECTO (2026-08-18, petición de Eugenio): al cruzar el portal
-- de un proyecto aparece un mapa abierto con una plaza donde PLANTAR la
-- información de ese proyecto. Esos objetos son los mismos game_world_items
-- de siempre, pero anclados al proyecto: dentro se ven los suyos, en la
-- aldea solo los que no tienen proyecto.
-- ============================================================================
ALTER TABLE game_world_items ADD COLUMN IF NOT EXISTS proyecto_id text;
CREATE INDEX IF NOT EXISTS game_world_items_proyecto_idx ON game_world_items (proyecto_id);
