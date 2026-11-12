-- 2026-11-12 (Eugenio): «luzhumanidad.com/modelo-socioeconomico-optimizado — no
-- sale lo que te he pedido en esta url».
--
-- Read in production from a browser on that page: the address resolves to the
-- right page (`KWMODELOSOCIO01`), but its `config` no longer has `aplicacion`
-- — it has `cabecera` and a subtitle edited by hand instead. The page editor
-- rebuilds `config` from a fixed list of keys (`CLAVES_AJUSTES`,
-- AjustesPagina.tsx) and `aplicacion` was not on it, so saving the page from
-- the editor silently turned the app back into a plain page of blocks. That
-- list now carries it; this puts the key back, touching nothing else (the
-- hand-edited subtitle and header stay as they are).
UPDATE knowledge_windows
SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{aplicacion}', '"modelo-socioeconomico"'::jsonb),
    updated_at = now()
WHERE id = 'KWMODELOSOCIO01'
  AND deleted_at IS NULL
  AND COALESCE(config->>'aplicacion', '') = '';
