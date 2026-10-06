-- ============================================================================
-- COMENTARIOS DE PÁGINA, COMPLETOS (2026-10-06, carril acceso, #11)
-- ============================================================================
-- Hilos anclados a un trozo de texto (o a la página entera), con respuestas,
-- resolver y reabrir, menciones que avisan, y también en páginas privadas
-- entre quienes tienen acceso. Lo de antes (`comments` con entity_type
-- 'bloque') era un comentario suelto por bloque y sólo en páginas públicas:
-- se queda donde está, para no romper lo ya escrito.
--
-- Una fila por comentario. La primera de un hilo lleva `ancla` y el estado
-- (resuelto); las respuestas apuntan a ella con `hilo_id`.
CREATE TABLE IF NOT EXISTS comentarios_pagina (
  id             text PRIMARY KEY,
  pagina_id      text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  hilo_id        text REFERENCES comentarios_pagina(id) ON DELETE CASCADE,
  autor_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cuerpo         text NOT NULL CHECK (length(cuerpo) BETWEEN 1 AND 5000),
  -- {"bloque": id, "texto": "lo seleccionado", "antes": "…", "despues": "…"}
  -- El texto de alrededor sirve para volver a encontrar el trozo si se repite.
  ancla          jsonb,
  resuelto_en    timestamptz,
  resuelto_por   text REFERENCES users(id) ON DELETE SET NULL,
  editado_en     timestamptz,
  borrado_en     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comentarios_pagina_pagina ON comentarios_pagina (pagina_id, created_at);
CREATE INDEX IF NOT EXISTS comentarios_pagina_hilo ON comentarios_pagina (hilo_id);
CREATE INDEX IF NOT EXISTS comentarios_pagina_autor ON comentarios_pagina (autor_user_id);
CREATE INDEX IF NOT EXISTS comentarios_pagina_resuelto_por ON comentarios_pagina (resuelto_por);
