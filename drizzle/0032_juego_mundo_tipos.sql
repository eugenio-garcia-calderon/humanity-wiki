-- ============================================================================
-- JUEGO VITAL — más cosas plantables en el mapa (2026-08-18, petición de
-- Eugenio): proyectos se plantan como agentes (ya existía), y como OBJETOS
-- del mundo entran lienzos, mapas, links y embeds de vídeo y música. Todos
-- se abren en una ventana interna sin salir del juego.
-- ============================================================================
ALTER TABLE game_world_items DROP CONSTRAINT IF EXISTS game_world_items_tipo_check;
ALTER TABLE game_world_items ADD CONSTRAINT game_world_items_tipo_check CHECK (
  tipo IN ('prop', 'nota', 'imagen', 'documento', 'enlace', 'video', 'musica', 'lienzo', 'mapa')
);
