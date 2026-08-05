-- Ventana de SOLUCIONES en tarjetas dentro de los grafos (petición del
-- usuario, 2026-08-05): la tecnología de tarjetas de soluciones de la
-- plataforma, embebida como ventana de conocimiento.
ALTER TABLE knowledge_windows DROP CONSTRAINT IF EXISTS knowledge_windows_kind_check;
ALTER TABLE knowledge_windows ADD CONSTRAINT knowledge_windows_kind_check CHECK (kind IN (
  'publicacion','imagen','video','wikipedia','enlace','mapa','grafica',
  'ficha','cronologia','autores','documento','grafo','texto','producto','soluciones'
));
