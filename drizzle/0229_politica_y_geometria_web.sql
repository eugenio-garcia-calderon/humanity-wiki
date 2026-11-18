-- 2026-11-18 (Eugenio): «haz una web dedicada para la geometría quitando el resto de cosas
-- del menú y poniéndolas en Política como URL, y dejando Geometría Política como URL para
-- este tema».
--
-- Two pages from the same interactive document (`public/observatorio-polarizacion/index.html`,
-- told apart by `config.vista`):
--   - `KWMOBSPOLARIZ01` goes back to being «Política», the whole observatory at `/politica`.
--     Its old address `observatorio-de-polarizacion/espana` already answers with a 301 to it.
--   - `KWGEOPOLARIZ01`, new, is «Geometría política», the geometries alone, at
--     `/geometria-politica`. It is a copy of the page as 0228 left it, with its own cover.
--
-- Every step only runs while the page is still in the state 0228 left it, so a second run
-- does nothing.
DO $$
DECLARE
  base      text := 'KWMOBSPOLARIZ01';
  geo       text := 'KWGEOPOLARIZ01';
  img_v     text := 'https://humanity.wiki/observatorio-polarizacion/portada.jpg';
  img_n     text := 'https://humanity.wiki/observatorio-polarizacion/portada-geometrias.jpg';
  u         text;
  actual    text;
  cfg       jsonb;
  cfg_geo   jsonb;
  geo_texto text;
  texto_pol text := 'Política es una página interactiva sobre la política en España. Su primer apartado es el Observatorio de Polarización Política, en cinco capítulos.';
  sub_pol   text := 'Cómo se polariza España, qué cuida y qué abandona cada partido, y una propuesta para decidir por temas con datos';
BEGIN
  SELECT creator_user_id, slug, config INTO u, actual, cfg
  FROM knowledge_windows WHERE id = base AND deleted_at IS NULL;
  IF u IS NULL OR actual <> 'geometria-politica' THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM knowledge_windows WHERE id = geo) THEN RETURN; END IF;

  -- 1. The geometry page is a copy of the current one, with its own cover (the copy is made
  --    from the row as it is now, before «Política» takes its address back).
  geo_texto := 'Geometría política es una página interactiva sobre la política en España. Cada partido es una figura en diez temas, de la vivienda a la defensa, con lo que cuida y lo que deja fuera frente a un círculo ideal, y cada persona puede dibujar la suya.';
  cfg_geo := jsonb_set(cfg, '{vista}', '"geometria"'::jsonb);
  cfg_geo := jsonb_set(cfg_geo, '{subtitulo}', to_jsonb('Los partidos no son puntos, son formas: qué cuida y qué deja fuera cada partido en diez temas, frente a un círculo ideal'::text));
  cfg_geo := jsonb_set(cfg_geo, '{portada}', to_jsonb(img_n));
  cfg_geo := jsonb_set(cfg_geo, '{imagenCompartir}', to_jsonb(img_n));
  cfg_geo := jsonb_set(cfg_geo, '{bloques,0,texto}', to_jsonb(geo_texto));
  cfg_geo := jsonb_set(cfg_geo, '{bloques,2,url}', to_jsonb(img_n));

  -- 2. «Política» is the whole observatory again, at /politica.
  DELETE FROM direcciones_anteriores WHERE duenyo_user_id = u AND slug = 'politica' AND pagina_id = base;
  UPDATE knowledge_windows SET slug = 'politica', title = 'Política', updated_at = now() WHERE id = base;

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
  SELECT geo, 'Geometría política', kind, cfg_geo, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, 'geometria-politica'
  FROM knowledge_windows WHERE id = base;

  cfg := jsonb_set(cfg, '{portada}', to_jsonb(img_v));
  cfg := jsonb_set(cfg, '{imagenCompartir}', to_jsonb(img_v));
  cfg := jsonb_set(cfg, '{bloques,2,url}', to_jsonb(img_v));
  cfg := jsonb_set(cfg, '{subtitulo}', to_jsonb(sub_pol));
  cfg := jsonb_set(cfg, '{bloques,0,texto}', to_jsonb(texto_pol));
  UPDATE knowledge_windows SET config = cfg, version = version + 1, updated_at = now() WHERE id = base;
END $$;
