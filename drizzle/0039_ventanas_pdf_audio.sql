-- ============================================================================
-- 0039 — Dos tipos de ventana nuevos: PDF y audio (2026-08-19)
-- ============================================================================
-- Petición de Eugenio: «que haga ⌘V y se pegue en el formato que sea, ya sea
-- una imagen, un vídeo y se hace embed, un archivo pdf, etc.».
--
-- Hasta hoy un PDF pegado acababa siendo un 'enlace', es decir, un botón de
-- descarga: para leerlo tenías que sacarlo de la página. Ahora se lee dentro,
-- en el visor del navegador. Lo mismo con el audio, que se escucha en el sitio.
--
-- El CHECK se reemplaza entero porque Postgres no sabe añadir un valor a una
-- lista existente. No toca ninguna fila: solo amplía lo que se acepta.
ALTER TABLE knowledge_windows DROP CONSTRAINT IF EXISTS knowledge_windows_kind_check;

ALTER TABLE knowledge_windows ADD CONSTRAINT knowledge_windows_kind_check
  CHECK (kind = ANY (ARRAY[
    'publicacion', 'imagen', 'video', 'wikipedia', 'enlace', 'mapa',
    'grafica', 'ficha', 'cronologia', 'autores', 'documento', 'grafo',
    'texto', 'producto', 'soluciones', 'tarea', 'tabla', 'proyecto',
    'pagina', 'presentacion',
    -- Nuevos
    'pdf', 'audio'
  ]::text[]));
