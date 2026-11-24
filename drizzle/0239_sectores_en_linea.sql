-- 2026-11-24 (Eugenio), luzhumanidad.com home: «Me gusta mucho cómo has hecho la innovación en política,
-- poniéndolo todo en una única línea y estrechito… haz lo mismo para la innovación en energía y innovación en
-- movilidad. Acorta los títulos y ponlo todo en una línea… Si hay más de 5 tarjetas, pues pones ya el slider.»
--
-- The sectors with icon «Movilidad» and «Energía» on the root page (`KWMUO4S4V663`) become `destacado`, like
-- «Innovación en Política» (0238): full width, five cards at once, the slider beyond five. Their titles are
-- shortened to «Innovación en Movilidad» and «Innovación en Energía». Runs twice without changing anything more.
DO $$
DECLARE
  raiz text := 'KWMUO4S4V663';
  cfg  jsonb;
  nuevo jsonb;
BEGIN
  SELECT config INTO cfg FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF cfg IS NULL OR jsonb_typeof(cfg->'sitio'->'sectores') IS DISTINCT FROM 'array' THEN RETURN; END IF;
  nuevo := (
    SELECT jsonb_agg(CASE s->>'icono'
      WHEN 'Movilidad' THEN s || jsonb_build_object('titulo', 'Innovación en Movilidad', 'destacado', true)
      WHEN 'Energía'   THEN s || jsonb_build_object('titulo', 'Innovación en Energía', 'destacado', true)
      ELSE s END ORDER BY o)
    FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o));
  IF nuevo IS DISTINCT FROM cfg->'sitio'->'sectores' THEN
    UPDATE knowledge_windows SET config = jsonb_set(cfg, '{sitio,sectores}', nuevo), version = version + 1, updated_at = now() WHERE id = raiz;
  END IF;
END $$;
