-- 2026-11-27 (Eugenio), luzhumanidad.com:
--   «Los principios hazlos un poco más bonitos y que tengan más o menos el mismo tamaño. O sea que igual tienes que
--   acortar algunos de ellos.» / «La bicicleta solar empezó realmente en 2017. Entonces en cómo ha crecido el
--   laboratorio tiene que aparecer en 2017 ese proyecto.»
--
-- 1. `sitio.principios.lista` of the root page `KWMUO4S4V663` (written by 0245): the same four principles and the
--    same ideas, each with a one-line summary and two short points, so the four cards have about the same height.
--    Only replaced if the list is still the one 0245 wrote (its first summary unchanged): if someone edited the
--    principles by hand since, this leaves them alone and says so.
-- 2. «Bicicleta Solar» (its page `KWMUVNM5V1518I`, read from the public home data): the year of its Fecha Inicio
--    goes from 2018 to 2017. «Nuestra historia» reads the first four-digit number of that cell, so only the year is
--    replaced and anything else in the cell stays. Only if it still says 2018.
DO $$
DECLARE
  raiz      text := 'KWMUO4S4V663';
  tabla     text := 'BDTMUOOFFNGJIEG';
  col_fecha text := 'BDCMUR28JC1UKN9';
  cfg       jsonb;
  n         int;
BEGIN
  -- 1. The principles
  SELECT config INTO cfg FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF cfg IS NOT NULL AND cfg->'sitio'->'principios'->'lista'->0->>'resumen'
       = 'Innovamos desde la persona hacia el planeta, para una libertad responsable sobre una base social sólida.' THEN
    UPDATE knowledge_windows SET config = jsonb_set(cfg, '{sitio,principios,lista}', jsonb_build_array(
        jsonb_build_object('id', 'abajo-arriba', 'icono', 'escalas',
          'titulo', 'De abajo hacia arriba',
          'resumen', 'Innovamos desde la persona hacia el planeta, sobre una base social sólida.',
          'puntos', jsonb_build_array(
            'Lo fundamental no depende de grandes estructuras: más resiliencia y eficiencia.',
            'Innovaciones accesibles, descentralizadas y al servicio de la vida.')),
        jsonb_build_object('id', 'naturaleza', 'icono', 'naturaleza',
          'titulo', 'En sintonía con la naturaleza',
          'resumen', 'Somos parte de la naturaleza: es nuestro hogar último.',
          'puntos', jsonb_build_array(
            'No contaminar y sumar en positivo con cada acción.',
            'Tener en cuenta a los demás seres vivos y sus ecosistemas.')),
        jsonb_build_object('id', 'paz', 'icono', 'paz',
          'titulo', 'Paz y cooperación',
          'resumen', 'Frente a la guerra y la rivalidad, soluciones que nos acercan.',
          'puntos', jsonb_build_array(
            'Fomentar lo que une a los seres humanos.',
            'Alejarnos de la violencia en todos sus ámbitos.')),
        jsonb_build_object('id', 'oportunidades', 'icono', 'oportunidades',
          'titulo', 'Igualdad de oportunidades y cuidado',
          'resumen', 'Que todo ser humano pueda prosperar en su vida.',
          'puntos', jsonb_build_array(
            'Las mismas oportunidades para todas las personas.',
            'Cuidado para quien no puede prosperar por su cuenta.'))
      )), version = version + 1, updated_at = now()
    WHERE id = raiz;
    RAISE NOTICE 'Principios: textos acortados';
  ELSE
    RAISE NOTICE 'Principios: no son los de 0245 (o no existen); no se tocan';
  END IF;

  -- 2. Bicicleta Solar, 2017
  UPDATE bd_filas
  SET valores = jsonb_set(valores, ARRAY[col_fecha], to_jsonb(regexp_replace(valores->>col_fecha, '\m2018\M', '2017'))),
      updated_at = now()
  WHERE tabla_id = tabla AND pagina_id = 'KWMUVNM5V1518I' AND deleted_at IS NULL
    AND substring(valores->>col_fecha from '\m\d{4}\M') = '2018';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'Bicicleta Solar: % fila(s) pasan de 2018 a 2017', n;
END $$;
