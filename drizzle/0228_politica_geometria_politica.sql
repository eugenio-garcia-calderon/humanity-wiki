-- 2026-11-18 (Eugenio): «Pon geometría política en vez de política, tanto en la URL como
-- en el menú de arriba a la derecha».
--
-- The project page (`KWMOBSPOLARIZ01`, see 0194, 0220 and 0227) takes the name
-- «Geometría política» and the short address `/geometria-politica`:
--
-- 1. Slug `politica` → `geometria-politica`. The old one-part address
--    goes to `direcciones_anteriores` (0158), so every link already shared answers with a 301.
--    Never takes an address another page of the same owner already uses.
-- 2. Title `Política` → `Geometría política` (the name in the site menus and in the cards).
-- 3. The first text block of the page names the page by its new name. It is only rewritten
--    while it is still exactly what 0227 wrote; `version` is bumped so the collaborative copy
--    (pagina_yjs) does not write the old text back.
DO $$
DECLARE
  pagina  text := 'KWMOBSPOLARIZ01';
  vieja   text := 'politica';
  nueva   text := 'geometria-politica';
  u       text;
  actual  text;
  titulo  text;
  cfg     jsonb;
  antes   jsonb;
BEGIN
  SELECT creator_user_id, slug, title, config INTO u, actual, titulo, cfg
  FROM knowledge_windows WHERE id = pagina AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;
  antes := cfg;

  IF actual = vieja AND NOT EXISTS (
       SELECT 1 FROM knowledge_windows
       WHERE creator_user_id = u AND slug = nueva AND id <> pagina AND deleted_at IS NULL) THEN
    UPDATE knowledge_windows SET slug = nueva, updated_at = now() WHERE id = pagina;
    INSERT INTO direcciones_anteriores (duenyo_user_id, slug, pagina_id)
    VALUES (u, vieja, pagina)
    ON CONFLICT (duenyo_user_id, slug) DO UPDATE SET pagina_id = EXCLUDED.pagina_id, created_at = now();
  END IF;

  IF titulo = 'Política' THEN
    UPDATE knowledge_windows SET title = 'Geometría política', updated_at = now() WHERE id = pagina;
  END IF;

  IF cfg #>> '{bloques,0,id}' = 'Bobspolariz01' AND strpos(cfg #>> '{bloques,0,texto}',
       'Política es una página interactiva sobre la política en España.') = 1 THEN
    cfg := jsonb_set(cfg, '{bloques,0,texto}', to_jsonb(replace(cfg #>> '{bloques,0,texto}',
      'Política es una página interactiva sobre la política en España.',
      'Geometría política es una página interactiva sobre la política en España.')));
  END IF;

  IF cfg IS DISTINCT FROM antes THEN
    UPDATE knowledge_windows SET config = cfg, version = version + 1, updated_at = now() WHERE id = pagina;
  END IF;
END $$;
