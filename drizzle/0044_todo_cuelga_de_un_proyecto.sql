-- ============================================================================
-- TODO CUELGA DE UN PROYECTO (2026-08-20, reestructuración pedida por Eugenio:
-- «reestructurar toda la plataforma en 1. los proyectos, 2. las herramientas,
-- 3. los productos de cada proyecto, 4. las personas»).
-- ============================================================================
-- La columna vertebral de la plataforma pasa a ser el PROYECTO: cada cosa que
-- creas con una herramienta pertenece a un proyecto, o a ninguno.
--
-- Ya lo tenían: roadmap_items (tareas), knowledge_windows (páginas),
-- game_world_items y game_agents. Faltaban estas tres, y sin ellas el árbol
-- del menú no podría enseñar «Camión camperizado → Esquemas → …».
--
-- MISMO CRITERIO QUE EN 0043: una columna, no una tabla intermedia. Una cosa
-- está en UN proyecto o en ninguno; permitir que cuelgue de varios a la vez
-- traería estados que nadie quiere y una tabla más de las 43 que ya hay.
--
-- ON DELETE SET NULL en todas: borrar un proyecto no puede llevarse por
-- delante el esquema, el mapa o el producto que hiciste dentro.

ALTER TABLE knowledge_graphs
  ADD COLUMN IF NOT EXISTS proyecto_id text REFERENCES proyectos(id) ON DELETE SET NULL;

ALTER TABLE user_maps
  ADD COLUMN IF NOT EXISTS proyecto_id text REFERENCES proyectos(id) ON DELETE SET NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS proyecto_id text REFERENCES proyectos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_graphs_proyecto
  ON knowledge_graphs (proyecto_id) WHERE proyecto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_maps_proyecto
  ON user_maps (proyecto_id) WHERE proyecto_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_proyecto
  ON products (proyecto_id) WHERE proyecto_id IS NOT NULL;
