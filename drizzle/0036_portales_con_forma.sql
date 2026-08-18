-- Portales con FORMA propia (2026-08-18, petición de Eugenio): un objeto,
-- una pieza del pueblo o una persona pueden SER un portal sin perder su
-- aspecto. El vínculo al mapa (proyecto) viaja en esta columna; si es null,
-- no es portal. Las personas usan game_agents.proyecto_id, que ya existía.
ALTER TABLE game_world_items ADD COLUMN IF NOT EXISTS portal_proyecto_id text;
ALTER TABLE game_world_overrides ADD COLUMN IF NOT EXISTS portal_proyecto_id text;
