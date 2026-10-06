-- ============================================================================
-- BLOQUES SINCRONIZADOS (2026-10-06, carril editorA, #22 de la lista de Notion)
-- ============================================================================
-- Un bloque que está en varias páginas a la vez: se edita en una y cambia en
-- todas. Su contenido (un árbol de bloques, el mismo formato que
-- `knowledge_windows.config->'bloques'`) vive AQUÍ, una sola vez. Cada página
-- que lo usa lleva un bloque `{"tipo":"sincronizado","sincId":…}` y, dentro,
-- una COPIA del contenido que el servidor mantiene al día al guardar (así la
-- búsqueda, la exportación y la página pública no tienen que venir aquí).
-- Ver `src/server/edicionPaginas.ts`.
CREATE TABLE IF NOT EXISTS bloques_sincronizados (
  id               text PRIMARY KEY,
  creator_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- La página donde nació (la «original» de Notion). Si se borra, el bloque
  -- sigue vivo en las demás.
  pagina_origen    text REFERENCES knowledge_windows(id) ON DELETE SET NULL,
  bloques          jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Sube en cada guardado: dos páginas guardando a la vez no se pisan sin
  -- enterarse (el guardado manda la versión de la que partía).
  version          integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       text REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS bloques_sincronizados_creator ON bloques_sincronizados (creator_user_id);
CREATE INDEX IF NOT EXISTS bloques_sincronizados_origen ON bloques_sincronizados (pagina_origen);
CREATE INDEX IF NOT EXISTS bloques_sincronizados_updated_by ON bloques_sincronizados (updated_by);
