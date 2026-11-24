-- 2026-11-24 (Eugenio): «Cuando hablamos de la economía pública me refería a esta URL
-- [humanity.wiki/modelo-socioeconomico]… simplemente tienes que cambiar la URL… en vez de modelo
-- socioeconómico, pone economía pública optimizada. Y llámalo así… la de modelo socioeconómico
-- desaparece y aparece la URL actualizada. Pero la web se mantiene la misma. No la modifiques…
-- no crees una paralela de economía pública.»
--
-- 1. The model's page on luzhumanidad.com (`KWMODELOSOCIO01`, 0184, 0199, 0215) is named
--    «Economía pública optimizada» and moves to `/economia-publica-optimizada`; its old address
--    answers with a 301 (`direcciones_anteriores`). Its row in «Proyectos» takes the new name.
--    Only from the names earlier migrations wrote: a name changed by hand is left alone.
-- 2. The parallel page 0235 made (`KWECONPUBLICA01`, `/economia-publica`) is archived, not
--    deleted (CLAUDE.md, forbidden item 2), and its address answers with a 301 to the model.
-- 3. «Política» (`KWMOBSPOLARIZ01`) links the model instead of that page, under the new name.
-- Runs once per step; on a database without these pages it does nothing.
DO $$
DECLARE
  modelo text := 'KWMODELOSOCIO01';
  copia  text := 'KWECONPUBLICA01';
  hub    text := 'KWMOBSPOLARIZ01';
  nueva  text := 'economia-publica-optimizada';
  nombre text := 'Economía pública optimizada';
  u      text;
  actual text;
  titulo text;
  cfg    jsonb;
  b      jsonb;
  nuevos jsonb := '[]'::jsonb;
  cambio boolean := false;
BEGIN
  SELECT creator_user_id, slug, title INTO u, actual, titulo
  FROM knowledge_windows WHERE id = modelo AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  -- 1. Name and address of the model
  IF titulo IN ('Modelo de optimización socioeconómica', 'Modelo socioeconómico optimizado', 'Modelo De País Optimizado', 'Modelo Público Optimizado') THEN
    UPDATE knowledge_windows SET title = nombre, updated_at = now() WHERE id = modelo;
  END IF;
  IF actual IS DISTINCT FROM nueva AND NOT EXISTS (
       SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = nueva AND id <> modelo AND deleted_at IS NULL) THEN
    DELETE FROM direcciones_anteriores WHERE duenyo_user_id = u AND slug = nueva;
    UPDATE knowledge_windows SET slug = nueva, updated_at = now() WHERE id = modelo;
    IF actual IS NOT NULL THEN
      INSERT INTO direcciones_anteriores (duenyo_user_id, slug, pagina_id) VALUES (u, actual, modelo)
      ON CONFLICT (duenyo_user_id, slug) DO UPDATE SET pagina_id = EXCLUDED.pagina_id, created_at = now();
    END IF;
  END IF;
  UPDATE bd_filas f
  SET valores = jsonb_set(f.valores, ARRAY[k.key], to_jsonb(nombre)), updated_at = now()
  FROM bd_filas g, jsonb_each_text(g.valores) AS k(key, value)
  WHERE f.id = g.id AND f.pagina_id = modelo
    AND k.value IN ('Modelo de optimización socioeconómica', 'Modelo socioeconómico optimizado', 'Modelo De País Optimizado', 'Modelo Público Optimizado');

  -- 2. The parallel page goes; its address leads to the model
  IF EXISTS (SELECT 1 FROM knowledge_windows WHERE id = copia AND archived_at IS NULL AND deleted_at IS NULL
               AND config->>'aplicacion' = 'economia-publica') THEN
    UPDATE knowledge_windows SET archived_at = now(), slug = NULL, updated_at = now() WHERE id = copia;
    INSERT INTO direcciones_anteriores (duenyo_user_id, slug, pagina_id) VALUES (u, 'economia-publica', modelo)
    ON CONFLICT (duenyo_user_id, slug) DO UPDATE SET pagina_id = EXCLUDED.pagina_id, created_at = now();
  END IF;

  -- 3. «Política» links the model
  SELECT config INTO cfg FROM knowledge_windows WHERE id = hub AND deleted_at IS NULL;
  IF cfg IS NULL OR cfg->>'aplicacion' IS DISTINCT FROM 'politica-herramientas' THEN RETURN; END IF;
  FOR b IN SELECT e FROM jsonb_array_elements(COALESCE(cfg->'bloques', '[]'::jsonb)) e LOOP
    IF b->>'tipo' = 'subpagina' AND b->>'entityId' = copia THEN
      b := b || jsonb_build_object('entityId', modelo, 'pubTitulo', nombre); cambio := true;
    ELSIF b->>'id' = 'Bpolher0001' AND strpos(b->>'texto', 'y la Economía pública.') > 0 THEN
      b := jsonb_set(b, '{texto}', to_jsonb(replace(b->>'texto', 'y la Economía pública.', 'y la Economía pública optimizada.'))); cambio := true;
    END IF;
    nuevos := nuevos || jsonb_build_array(b);
  END LOOP;
  IF cambio THEN
    UPDATE knowledge_windows SET config = jsonb_set(cfg, '{bloques}', nuevos), version = version + 1, updated_at = now() WHERE id = hub;
  END IF;
END $$;
