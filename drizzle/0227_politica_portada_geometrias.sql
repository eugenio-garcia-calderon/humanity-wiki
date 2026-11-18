-- 2026-11-18 (Eugenio): «coge la sección de geometría política y colócala en una página
-- única donde ese sea la página de inicio y el resto de cosas sean cosas secundarias…
-- colocarla en una landing page que sea el inicio y dame la URL para poder compartirla».
--
-- The interactive document now opens on the party geometries; the observatory and
-- «Votar por temas» follow as secondary sections. This migration gives the project page
-- (`KWMOBSPOLARIZ01`, created by 0194, renamed by 0200/0220) a short address to share:
--
-- 1. Slug `observatorio-de-polarizacion/espana` → `politica`. A one-part address resolves
--    by slug before a page title (`porSlug`, src/server/sitios.ts). The old address goes
--    to `direcciones_anteriores` (0158), so every link already shared answers with a 301.
--    Never takes an address another page of the same owner already uses.
-- 2. The share image becomes the geometry cover (`portada-geometrias.jpg`; a new file
--    name, so no cache keeps serving the old picture under the new meaning).
-- 3. The texts the card, the server HTML and search engines read now start with the
--    geometries. Each one only if it is still exactly what an earlier migration wrote;
--    every change bumps `version` so the collaborative copy (pagina_yjs) does not write
--    the old text back.
DO $$
DECLARE
  pagina  text := 'KWMOBSPOLARIZ01';
  vieja   text := 'observatorio-de-polarizacion/espana';
  nueva   text := 'politica';
  img_v   text := 'https://humanity.wiki/observatorio-polarizacion/portada.jpg';
  img_n   text := 'https://humanity.wiki/observatorio-polarizacion/portada-geometrias.jpg';
  u       text;
  actual  text;
  cfg     jsonb;
  antes   jsonb;
BEGIN
  SELECT creator_user_id, slug, config INTO u, actual, cfg
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

  IF cfg->>'portada' = img_v THEN cfg := jsonb_set(cfg, '{portada}', to_jsonb(img_n)); END IF;
  IF cfg->>'imagenCompartir' = img_v THEN cfg := jsonb_set(cfg, '{imagenCompartir}', to_jsonb(img_n)); END IF;
  IF cfg #>> '{bloques,2,id}' = 'Bobspolariz03' AND cfg #>> '{bloques,2,url}' = img_v THEN
    cfg := jsonb_set(cfg, '{bloques,2,url}', to_jsonb(img_n));
    cfg := jsonb_set(cfg, '{bloques,2,alt}', to_jsonb('Portada de Política: las figuras de varios partidos en vivienda sobre un círculo ideal, con el titular «Los partidos no son puntos, son formas».'::text));
  END IF;

  IF cfg->>'subtitulo' = 'Cómo se polariza España, qué cuida y qué abandona cada partido, y una propuesta para decidir por temas con datos' THEN
    cfg := jsonb_set(cfg, '{subtitulo}', to_jsonb('Los partidos no son puntos, son formas: qué cuida y qué deja fuera cada partido en diez temas, frente a un círculo ideal. Y además, cómo se polariza España y una propuesta para votar por temas'::text));
  END IF;

  IF cfg #>> '{bloques,0,id}' = 'Bobspolariz01' AND strpos(cfg #>> '{bloques,0,texto}',
       'Política es una página interactiva sobre la política en España. Su primer apartado es el Observatorio de Polarización Política, en cinco capítulos.') = 1 THEN
    cfg := jsonb_set(cfg, '{bloques,0,texto}', to_jsonb(replace(cfg #>> '{bloques,0,texto}',
      'Política es una página interactiva sobre la política en España. Su primer apartado es el Observatorio de Polarización Política, en cinco capítulos.',
      'Política es una página interactiva sobre la política en España. Empieza por las geometrías: cada partido es una figura en diez temas, de la vivienda a la defensa, con lo que cuida y lo que deja fuera frente a un círculo ideal, y cada persona puede dibujar la suya. Después viene el Observatorio de Polarización Política, en cinco capítulos.')));
  END IF;

  IF cfg #>> '{bloques,1,id}' = 'Bobspolariz02' AND strpos(cfg #>> '{bloques,1,texto}',
       'El segundo apartado, Geometrías y votar por temas, muestra a cada partido como una figura, con lo que cuida y lo que abandona en inmigración y en servicios públicos, frente a un círculo que cuidaría de todo, y propone votar por temas:') > 0 THEN
    cfg := jsonb_set(cfg, '{bloques,1,texto}', to_jsonb(replace(cfg #>> '{bloques,1,texto}',
      'El segundo apartado, Geometrías y votar por temas, muestra a cada partido como una figura, con lo que cuida y lo que abandona en inmigración y en servicios públicos, frente a un círculo que cuidaría de todo, y propone votar por temas:',
      'El segundo apartado, Votar por temas, propone')));
  END IF;

  IF cfg IS DISTINCT FROM antes THEN
    UPDATE knowledge_windows SET config = cfg, version = version + 1, updated_at = now() WHERE id = pagina;
  END IF;
END $$;
