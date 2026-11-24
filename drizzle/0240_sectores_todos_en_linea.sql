-- 2026-11-24 (Eugenio), luzhumanidad.com home: «hazlo también en la innovación en vivienda y la innovación en
-- cultura. Y así ya tenemos todas las tarjetas en el mismo formato.»
--
-- Like 0239 for Movilidad and Energía: the sectors with icon «Vivienda» and «Educación» on the root page
-- (`KWMUO4S4V663`) become `destacado` (full width, five cards at once, the slider beyond five), with the short
-- titles Eugenio used: «Innovación en Vivienda» and «Innovación en Cultura». The last sector, «Informática»,
-- which is not in the list, goes full width too (`sitio.otrosDestacado`), so every sector has the same format.
-- Runs twice without changing anything more.
DO $$
DECLARE
  raiz  text := 'KWMUO4S4V663';
  cfg   jsonb;
  nuevo jsonb;
BEGIN
  SELECT config INTO cfg FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF cfg IS NULL OR jsonb_typeof(cfg->'sitio'->'sectores') IS DISTINCT FROM 'array' THEN RETURN; END IF;
  nuevo := jsonb_set(cfg, '{sitio,sectores}', (
    SELECT jsonb_agg(CASE s->>'icono'
      WHEN 'Vivienda'  THEN s || jsonb_build_object('titulo', 'Innovación en Vivienda', 'destacado', true)
      WHEN 'Educación' THEN s || jsonb_build_object('titulo', 'Innovación en Cultura', 'destacado', true)
      ELSE s END ORDER BY o)
    FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o)));
  nuevo := jsonb_set(nuevo, '{sitio,otrosDestacado}', 'true'::jsonb);
  IF nuevo IS DISTINCT FROM cfg THEN
    UPDATE knowledge_windows SET config = nuevo, version = version + 1, updated_at = now() WHERE id = raiz;
  END IF;
END $$;
