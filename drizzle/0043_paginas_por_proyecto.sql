-- ============================================================================
-- UNA PÁGINA PUEDE PERTENECER A UN PROYECTO (2026-08-20, petición de Eugenio:
-- «crea ese lugar donde están todas las páginas ordenadas por PROYECTOS»).
-- ============================================================================
-- Una página YA existe: es un `knowledge_windows` de tipo 'pagina', con su
-- editor tipo Notion en /documentos/:id. Lo que no existía era la forma de
-- decir a qué proyecto pertenece.
--
-- POR QUÉ UNA COLUMNA Y NO UNA TABLA INTERMEDIA: una página está en UN
-- proyecto o en ninguno, no en varios a la vez. Una tabla `pagina_proyectos`
-- sería la número 44 del proyecto y permitiría estados que no queremos (la
-- misma página colgando de tres sitios). Si algún día hace falta compartir una
-- página entre proyectos, esa tabla se añade entonces y esta columna se migra.
--
-- ON DELETE SET NULL: borrar un proyecto no puede llevarse por delante las
-- páginas que escribiste dentro. Se quedan sin proyecto, en «Sueltas».
ALTER TABLE knowledge_windows
  ADD COLUMN IF NOT EXISTS proyecto_id text REFERENCES proyectos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_windows_proyecto
  ON knowledge_windows (proyecto_id) WHERE proyecto_id IS NOT NULL;
