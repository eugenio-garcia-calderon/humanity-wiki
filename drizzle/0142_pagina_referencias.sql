-- 2026-10-06 (carril editorB, #6). Quién enlaza o nombra a quién entre páginas.
--
-- Dos preguntas que el editor tiene que contestar al instante y que, sin esta
-- tabla, obligarían a leer el JSON de TODAS las páginas cada vez:
--   · «Enlazan aquí»: ¿qué páginas mencionan o enlazan a ésta?  (clase 'pagina')
--   · «¿ya avisé a esta persona de que la nombré?»             (clase 'persona')
-- La verdad sigue siendo el contenido de la página (`knowledge_windows.config`):
-- esta tabla es un índice que se rehace entero al guardar (ver
-- `edicionPaginas.ts`), nunca una segunda fuente. Si se borra, se reconstruye.
CREATE TABLE IF NOT EXISTS pagina_referencias (
  origen_id  text    NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  clase      text    NOT NULL CHECK (clase IN ('pagina', 'persona')),
  -- id de la página o de la persona nombrada; sin clave foránea a propósito:
  -- un enlace a una página borrada sigue siendo un enlace roto, no un error.
  destino_id text    NOT NULL,
  -- Sólo `persona`: la persona ya recibió su aviso. Dos guardados seguidos no
  -- pueden avisar dos veces; quitar la mención y ponerla de nuevo, sí.
  avisado    boolean NOT NULL DEFAULT false,
  PRIMARY KEY (origen_id, clase, destino_id)
);
-- La PK ya indexa `origen_id` (clave foránea). Éste es el de «¿quién me enlaza?».
CREATE INDEX IF NOT EXISTS idx_pagina_referencias_destino ON pagina_referencias (clase, destino_id);

-- Las páginas que ya existían: enlaces internos escritos en el texto…
INSERT INTO pagina_referencias (origen_id, clase, destino_id)
SELECT DISTINCT w.id, 'pagina', m[1]
FROM knowledge_windows w, regexp_matches(w.config::text, '\(/paginas/([A-Za-z0-9_-]+)\)', 'g') AS m
WHERE w.kind = 'pagina' AND w.deleted_at IS NULL AND m[1] <> w.id
ON CONFLICT DO NOTHING;

-- …y bloques «Página» (subpáginas), a cualquier profundidad.
INSERT INTO pagina_referencias (origen_id, clase, destino_id)
SELECT DISTINCT w.id, 'pagina', b->>'entityId'
FROM knowledge_windows w,
     jsonb_path_query(COALESCE(w.config, '{}'::jsonb), 'strict $.bloques.** ? (@.type() == "object" && @.tipo == "subpagina")', '{}', true) AS b
WHERE w.kind = 'pagina' AND w.deleted_at IS NULL
  AND b->>'entityId' IS NOT NULL AND b->>'entityId' <> w.id
ON CONFLICT DO NOTHING;
