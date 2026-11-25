-- 2026-11-25 (Eugenio), luzhumanidad.com: «añade innovación en Agricultura en luz&humanidad y añade ahí el
-- proyecto de "modelo de agricultura sintrópica"… que ahora está en informática, pero ese no es su sitio».
--
-- The project (row BDFAGRISINTROP1, from 0241) has the area «Alimentación», which no sector of the root page
-- (`KWMUO4S4V663`) collects, so it fell into the last group, «Informática». A new sector «Innovación en
-- Agricultura» (icon «Agricultura», lime, full width like the others) gathers Alimentación, Agricultura and
-- Agroecología. It goes after «Innovación en Vivienda», before «Innovación en Cultura». Runs twice without
-- changing anything more.
DO $$
DECLARE
  raiz  text := 'KWMUO4S4V663';
  cfg   jsonb;
  nuevo jsonb;
  sector jsonb := jsonb_build_object('titulo', 'Innovación en Agricultura', 'icono', 'Agricultura',
    'areas', jsonb_build_array('Alimentación', 'Agricultura', 'Agroecología'), 'destacado', true);
BEGIN
  SELECT config INTO cfg FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF cfg IS NULL OR jsonb_typeof(cfg->'sitio'->'sectores') IS DISTINCT FROM 'array' THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(cfg->'sitio'->'sectores') s WHERE s->>'icono' = 'Agricultura') THEN RETURN; END IF;
  nuevo := jsonb_set(cfg, '{sitio,sectores}', (
    SELECT jsonb_agg(s ORDER BY k)
    FROM (
      SELECT s, (o * 2)::numeric AS k FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o)
      UNION ALL
      SELECT sector, COALESCE((SELECT o * 2 + 1 FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o)
                               WHERE s->>'icono' = 'Vivienda' LIMIT 1), 1000)
    ) t));
  UPDATE knowledge_windows SET config = nuevo, version = version + 1, updated_at = now() WHERE id = raiz;
END $$;
