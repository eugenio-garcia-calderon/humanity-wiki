-- Documentos estilo Notion (2026-08-08): nuevo kind 'pagina' para las
-- ventanas cuyo contenido es una lista de bloques (config.bloques) — el
-- documento que el chat genera en directo y que se edita en /documentos/:id.
ALTER TABLE knowledge_windows DROP CONSTRAINT IF EXISTS knowledge_windows_kind_check;
ALTER TABLE knowledge_windows ADD CONSTRAINT knowledge_windows_kind_check CHECK (kind IN (
  'publicacion','imagen','video','wikipedia','enlace','mapa','grafica',
  'ficha','cronologia','autores','documento','grafo','texto','producto','soluciones',
  'tarea','tabla','proyecto',
  'pagina'
));
