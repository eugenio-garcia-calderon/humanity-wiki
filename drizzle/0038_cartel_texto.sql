-- ============================================================================
-- EL TEXTO PROPIO DE UNA PIEZA DEL PUEBLO (2026-08-19, petición de Eugenio:
-- «haz que los carteles de cada camino también se pueda editar su nombre y
-- mover como el resto de elementos»).
--
-- Mover y borrar ya funcionaban con `game_world_overrides`. Lo que faltaba era
-- guardar un TEXTO: los seis carteles de las sendas traen el suyo de fábrica
-- («Huerto y bosque comestible»), y Eugenio quiere poder llamarlos como él
-- quiera sin tocar el código.
--
-- Se guarda aquí y no en una tabla nueva porque es exactamente lo mismo que
-- x, z y rot: un retoque del jugador sobre una pieza de serie. Vale para
-- cualquier pieza que algún día lleve rótulo, no solo para los carteles.
-- ============================================================================

ALTER TABLE game_world_overrides ADD COLUMN IF NOT EXISTS texto text;
