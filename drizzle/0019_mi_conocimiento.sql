-- Mi Conocimiento (2026-08-07, user request): the personal infinite canvas.
-- Three new window kinds so the canvas can hold work items, not just media:
--   tarea     a task card    config: {done, due, notes}
--   tabla     a Notion-like inline table  config: {cols: [{id,name,type}], rows: [{...}]}
--   proyecto  a project card config: {status, goal, steps: [{text,done}]}
ALTER TABLE knowledge_windows DROP CONSTRAINT IF EXISTS knowledge_windows_kind_check;
ALTER TABLE knowledge_windows ADD CONSTRAINT knowledge_windows_kind_check CHECK (kind IN (
  'publicacion','imagen','video','wikipedia','enlace','mapa','grafica',
  'ficha','cronologia','autores','documento','grafo','texto','producto','soluciones',
  'tarea','tabla','proyecto'
));
