-- 2026-11-18 (Eugenio): «da error 404 el luzhumanidad.com/geometria-politica».
--
-- A one-part address on a domain (`luzhumanidad.com/geometria-politica`) only opens a page
-- that hangs from the domain's own page: `cuelgaDe` (src/server/sitios.ts) follows the
-- `subpagina` blocks of each parent (`config.bloques` and `config.botones`, see `bloquesDe`).
-- 0229 copied «Política» into «Geometría política» but did not give the copy that link,
-- so the address answered 404.
--
-- This adds, to every page of the same owner that already links «Política» as a subpage,
-- one link to «Geometría política» in the same list (bloques or botones), with the same
-- shape. It runs once per parent: it skips a parent that already links the geometry page.
DO $$
DECLARE
  base  text := 'KWMOBSPOLARIZ01';
  geo   text := 'KWGEOPOLARIZ01';
  r     record;
  campo text;
  b     jsonb;
  nuevo jsonb;
  u     text;
BEGIN
  SELECT creator_user_id INTO u FROM knowledge_windows WHERE id = geo AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  FOR r IN
    SELECT w.id, w.config FROM knowledge_windows w
    WHERE w.creator_user_id = u AND w.id <> geo AND w.deleted_at IS NULL
      AND (w.config->'bloques' @> jsonb_build_array(jsonb_build_object('tipo','subpagina','entityId',base))
        OR w.config->'botones' @> jsonb_build_array(jsonb_build_object('tipo','subpagina','entityId',base)))
  LOOP
    FOREACH campo IN ARRAY ARRAY['bloques','botones'] LOOP
      SELECT e INTO b FROM jsonb_array_elements(COALESCE(r.config->campo, '[]'::jsonb)) e
      WHERE e->>'tipo' = 'subpagina' AND e->>'entityId' = base LIMIT 1;
      CONTINUE WHEN b IS NULL;
      IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(r.config->campo, '[]'::jsonb)) e WHERE e->>'entityId' = geo) THEN
        nuevo := jsonb_set(b, '{entityId}', to_jsonb(geo));
        nuevo := jsonb_set(nuevo, '{id}', to_jsonb('Bgeopolariz01'::text));
        IF nuevo ? 'pubTitulo' THEN nuevo := jsonb_set(nuevo, '{pubTitulo}', to_jsonb('Geometría política'::text)); END IF;
        UPDATE knowledge_windows
        SET config = jsonb_set(r.config, ARRAY[campo], COALESCE(r.config->campo, '[]'::jsonb) || jsonb_build_array(nuevo)),
            version = version + 1, updated_at = now()
        WHERE id = r.id;
      END IF;
    END LOOP;
  END LOOP;
END $$;
