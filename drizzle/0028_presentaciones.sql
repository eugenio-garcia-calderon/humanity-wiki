-- Presentaciones estilo PowerPoint (2026-08-08): nuevo kind 'presentacion'
-- para ventanas cuyo contenido es config.diapositivas — cada diapositiva con
-- sus elementos (texto, imagen, forma) posicionados en un lienzo de 960×540.
ALTER TABLE knowledge_windows DROP CONSTRAINT IF EXISTS knowledge_windows_kind_check;
ALTER TABLE knowledge_windows ADD CONSTRAINT knowledge_windows_kind_check CHECK (kind IN (
  'publicacion','imagen','video','wikipedia','enlace','mapa','grafica',
  'ficha','cronologia','autores','documento','grafo','texto','producto','soluciones',
  'tarea','tabla','proyecto',
  'pagina',
  'presentacion'
));
