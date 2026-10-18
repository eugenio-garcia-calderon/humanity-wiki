-- ============================================================================
-- WIKIPRODUCTS: VISITORS CAN SIGN IN AND REGISTER (2026-10-18, W4)
-- ============================================================================
-- Voting a product (`valoraciones`) and «Sugerir una corrección» need an
-- account, and a site only shows «Entrar» when it has members turned on
-- (`sitio_config.activo`, read by `miembros.ts` sitioYRegla). The Wikiproducts
-- site had none, so nobody could take part. Eugenio's brief: a place where
-- «tú puedes calificar a los productos» and «la comunidad de usuarios» ranks
-- them, so registration is open.
--
-- This does exactly what «Activar» in the members panel does the first time
-- (`PUT /api/sitio-miembros/:raiz/config`): the config row, open registration,
-- and a «Miembros» category that may see, comment (which covers voting and
-- suggesting), save and buy, set as the default. The magic-link option stays
-- on, as the panel leaves it; `miembros.ts` hides it while no mail is set up.
--
-- Only when the site exists here and has NO config yet: if its owner already
-- configured members (or turned them off on purpose), nothing changes. On any
-- database without the wikiproducts.humanity.wiki address (local copies,
-- tests) it does nothing at all. To undo: the members panel of the root page.

WITH raiz AS (
  SELECT d.pagina_id AS id, w.creator_user_id AS dueno
  FROM dominios_paginas d JOIN knowledge_windows w ON w.id = d.pagina_id
  WHERE d.dominio = 'wikiproducts.humanity.wiki' AND d.estado IN ('pendiente', 'activo')
    AND d.pagina_id IS NOT NULL AND w.deleted_at IS NULL
    AND NOT EXISTS (SELECT 1 FROM sitio_config c WHERE c.raiz_id = d.pagina_id)
  LIMIT 1
),
cat AS (
  INSERT INTO sitio_categorias (id, raiz_id, nombre, permisos, orden)
  SELECT 'SC' || upper(substr(md5(random()::text || id), 1, 14)), id, 'Miembros',
         '{"ver":true,"comentar":true,"guardar":true,"comprar":true}'::jsonb, 0
  FROM raiz
  RETURNING id, raiz_id
)
INSERT INTO sitio_config (raiz_id, activo, registro, categoria_defecto, creado_por)
SELECT cat.raiz_id, true, 'abierto', cat.id, raiz.dueno
FROM cat JOIN raiz ON raiz.id = cat.raiz_id;
