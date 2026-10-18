-- ============================================================================
-- 0158 · Direcciones anteriores de una página (2026-10-18, Wikiproducts W2)
-- ============================================================================
-- SEO R2: las fichas de un sitio tienen direcciones legibles
-- (`/powerbanks/anker-737-powercore-24k`), sacadas de sus datos con la
-- plantilla `config.ruta` de su base de datos. Si cambia el nombre, cambia la
-- dirección, y la vieja tiene que seguir llevando a la ficha con un 301 PARA
-- SIEMPRE: es la que ya está en Google, en enlaces y en mensajes.
--
-- Aquí se guarda cada dirección que una página tuvo. Es un historial, no una
-- tabla de unión. La dirección se guarda como `slug` (sin barra inicial) y es
-- única por dueño, igual que `knowledge_windows.slug`.

CREATE TABLE IF NOT EXISTS direcciones_anteriores (
  duenyo_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug           text NOT NULL,
  pagina_id      text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  created_at     timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (duenyo_user_id, slug)
);

-- Cada clave ajena con su índice (drizzle/CLAUDE.md). `duenyo_user_id` ya
-- encabeza la clave primaria.
CREATE INDEX IF NOT EXISTS direcciones_anteriores_pagina_idx ON direcciones_anteriores (pagina_id);
