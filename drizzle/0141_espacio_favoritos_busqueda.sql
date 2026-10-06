-- ============================================================================
-- ESPACIO · FAVORITOS, RECIENTES Y BÚSQUEDA (2026-10-06, carril «espacio»)
-- ============================================================================
-- Favoritos y recientes se guardan POR PERSONA en el servidor (no en el
-- navegador): así te siguen al cambiar de dispositivo. `entidad_id` es de
-- texto y sin clave foránea a propósito: apunta a tres tablas distintas
-- (páginas, carpetas y bases de datos según `tipo`). Lo que ya no existe o
-- ya no puedes ver se descarta al LEER, con la misma regla que el buscador.

CREATE TABLE IF NOT EXISTS favoritos_espacio (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('pagina', 'carpeta', 'bd')),
  entidad_id text NOT NULL,
  orden      integer NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tipo, entidad_id)   -- el índice de `user_id` ya está aquí
);

CREATE TABLE IF NOT EXISTS recientes_espacio (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo       text NOT NULL CHECK (tipo IN ('pagina', 'carpeta', 'bd')),
  entidad_id text NOT NULL,
  abierto_en timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tipo, entidad_id)
);
CREATE INDEX IF NOT EXISTS recientes_espacio_usuario_fecha_idx ON recientes_espacio (user_id, abierto_en DESC);

-- ── Búsqueda de texto completo en español ───────────────────────────────────
-- `rh_norm` quita acentos (misma tabla de equivalencias que el cliente, letra
-- por letra) para que «avion» encuentre «avión». No se usa la extensión
-- `unaccent`: pide permisos de superusuario y no queremos que un despliegue
-- dependa de ellos.
CREATE OR REPLACE FUNCTION rh_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT translate(lower(coalesce(t, '')), 'áéíóúüàèìòùâêîôûñ', 'aeiouuaeiouaeioun')
$$;

-- Todo el texto escrito en una página, a cualquier profundidad (los
-- desplegables anidan bloques). Los bloques guardan su texto en `texto`.
CREATE OR REPLACE FUNCTION rh_texto_pagina(config jsonb) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT coalesce(string_agg(v, ' '), '') FROM jsonb_array_elements_text(
    jsonb_path_query_array(coalesce(config, '{}'::jsonb), 'strict $.bloques.**.texto ? (@.type() == "string")', '{}', true)
  ) v
$$;

-- Con el esquema por delante (`public.`): al construir un índice Postgres
-- limpia el `search_path`, y sin él no encuentra las funciones.
-- El título pesa (A) mucho más que el cuerpo (C): una página que se llama
-- como lo que buscas va antes que una que lo menciona de pasada.
CREATE OR REPLACE FUNCTION rh_doc_pagina(titulo text, config jsonb) RETURNS tsvector
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT setweight(to_tsvector('spanish', public.rh_norm(titulo)), 'A')
      || setweight(to_tsvector('spanish', public.rh_norm(public.rh_texto_pagina(config))), 'C')
$$;

CREATE INDEX IF NOT EXISTS knowledge_windows_pagina_fts_idx
  ON knowledge_windows USING gin (rh_doc_pagina(title, config))
  WHERE kind = 'pagina' AND archived_at IS NULL AND deleted_at IS NULL;
