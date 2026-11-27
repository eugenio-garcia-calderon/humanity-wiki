-- 2026-11-27 (Eugenio), luzhumanidad.com:
--  «Has puesto en política proyectos que son de energía como el de la Tienda Solar y Solidaria, o que son de
--   innovación en ECONOMÍA: genera esta categoría para incluir a los proyectos de SOLAR CROWD.»
--  «El link de política de herramientas políticas dentro de geometría política lleva a una página 404 en vez de
--   llevarte a las cinco herramientas políticas.»
--  «Añade en la página web una sección de los principios y valores del laboratorio a la hora de innovar.»
--
-- On the root page (`KWMUO4S4V663`) and its «Proyectos» table (`BDTMUOOFFNGJIEG`):
--
-- 1. WHY THEY WERE IN POLÍTICA. 0238 turned the old socioeconomic sector (areas Política, Economía, Sociología,
--    Justicia, Trabajo, Demografía) into «Innovación en Política», so every project whose category is Economía or
--    Trabajo kept landing there — Crowd and the Tienda among them since 0244 shows them as inventions.
--    Now: «Innovación en Política» keeps Política, Sociología, Justicia and Demografía; a new sector
--    «Innovación en Economía» (icon «Economía», full width) right after it takes Economía, Trabajo and Finanzas.
-- 2. Economía pública optimizada is one of the five political tools but its category is Economía: it also gets
--    the «Política» category, and since «Política» comes first it stays with the other four.
-- 3. The Tienda Solar Solidaria (`BDFMVDU4N2KAWOC`) gets the category Energía (that of Sol Solidario, its mother),
--    instead of whatever it had. Crowd (`BDFNTSTY4XY5SH4B`) gets Economía: it is the first project of the new sector.
--    Categories are rows of the «Sistemas» table (`sitio.sistemas` of the root) found by their name, the same rule
--    as `bd/enlaces.ts`: the title of the row's page, or its first text column.
-- 4. THE 404. 0238 hid the «Política» row (`BDFOBSPOLARIZ01`) so it would leave the home page. A page is public
--    through the rows that show it, and a hidden row stops that (`subirDesdePagina` in sitios.ts), so /politica
--    stopped being public while its five tools, each with its own row, kept working. The page is now public on its
--    own (`publico = true`); the row stays hidden, so the home page does not change.
-- 5. `sitio.principios` on the root: the four principles of the laboratory, shown on the home page by
--    `PrincipiosSitio.tsx`. In the configuration (not in the code) so the English and Portuguese replicas
--    translate them like the rest of the home page.
--
-- Every step checks that what it touches exists and can run twice.
DO $$
DECLARE
  raiz      text := 'KWMUO4S4V663';
  tabla     text := 'BDTMUOOFFNGJIEG';
  col_cat   text := 'BDCMUVNOEH62ZFF';
  hub       text := 'KWMOBSPOLARIZ01';
  tienda    text := 'BDFMVDU4N2KAWOC';
  crowd     text := 'BDFNTSTY4XY5SH4B';
  t_sist    text;
  cat_pol   text;
  cat_eco   text;
  cat_ene   text;
  fila_epo  text;
  autor     text;
  cfg       jsonb;
  sector    jsonb := jsonb_build_object('titulo', 'Innovación en Economía', 'icono', 'Economía',
    'areas', jsonb_build_array('Economía', 'Trabajo', 'Finanzas'), 'destacado', true);
BEGIN
  SELECT config, creator_user_id INTO cfg, autor FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF cfg IS NULL THEN RETURN; END IF;

  -- 1. The sectors
  IF jsonb_typeof(cfg->'sitio'->'sectores') = 'array'
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(cfg->'sitio'->'sectores') s WHERE s->>'icono' = 'Economía') THEN
    cfg := jsonb_set(cfg, '{sitio,sectores}', (
      SELECT jsonb_agg(s ORDER BY k) FROM (
        SELECT CASE WHEN s->>'icono' = 'Política'
                    THEN s || jsonb_build_object('areas', jsonb_build_array('Política', 'Sociología', 'Justicia', 'Demografía'))
                    ELSE s END AS s, (o * 2)::numeric AS k
        FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o)
        UNION ALL
        SELECT sector, COALESCE((SELECT o * 2 + 1 FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o)
                                 WHERE s->>'icono' = 'Política' LIMIT 1), 1000)
      ) t));
  END IF;

  -- 5. The principles (only if the root has none yet: Eugenio may edit them afterwards)
  IF jsonb_typeof(cfg->'sitio') = 'object' AND NOT (cfg->'sitio' ? 'principios') THEN
    cfg := jsonb_set(cfg, '{sitio,principios}', jsonb_build_object(
      'titulo', 'Nuestros principios',
      'texto', 'Los valores que guían cada innovación del laboratorio.',
      'lista', jsonb_build_array(
        jsonb_build_object('id', 'abajo-arriba', 'icono', 'escalas',
          'titulo', 'De abajo hacia arriba',
          'resumen', 'Innovamos desde la persona hacia el planeta, para una libertad responsable sobre una base social sólida.',
          'puntos', jsonb_build_array(
            'Del individuo a la familia, la comunidad, los pueblos y ciudades, las regiones, los Estados, los continentes y el planeta.',
            'Lo fundamental no debe depender de grandes estructuras: así ganamos resiliencia, capacidad de adaptación y eficiencia en el uso de los recursos y en la toma de decisiones.',
            'Las innovaciones son accesibles, se gestionan de forma descentralizada y están al servicio de los seres vivos.')),
        jsonb_build_object('id', 'naturaleza', 'icono', 'naturaleza',
          'titulo', 'En sintonía con la naturaleza',
          'resumen', 'El ser humano forma parte de la naturaleza y no puede separarse de ella: es su hogar último.',
          'puntos', jsonb_build_array(
            'No contaminar y aportar una suma positiva con cada acción.',
            'Tener en cuenta a los demás seres vivos y las dinámicas de los ecosistemas.')),
        jsonb_build_object('id', 'paz', 'icono', 'paz',
          'titulo', 'Paz y cooperación',
          'resumen', 'Frente a la guerra y la rivalidad, soluciones que nos acercan a la paz y a la cooperación.',
          'puntos', jsonb_build_array(
            'Fomentar lo que une a los seres humanos y nos aleja de la violencia en todos sus ámbitos.')),
        jsonb_build_object('id', 'oportunidades', 'icono', 'oportunidades',
          'titulo', 'Igualdad de oportunidades y cuidado',
          'resumen', 'Las mismas oportunidades para que todo ser humano pueda prosperar en su vida.',
          'puntos', jsonb_build_array(
            'Y cuidado para quienes no pueden prosperar por su propia cuenta.'))
      )));
  END IF;

  IF cfg IS DISTINCT FROM (SELECT config FROM knowledge_windows WHERE id = raiz) THEN
    UPDATE knowledge_windows SET config = cfg, version = version + 1, updated_at = now() WHERE id = raiz;
  END IF;

  -- 4. /politica public again
  UPDATE knowledge_windows SET publico = true, updated_at = now()
   WHERE id = hub AND deleted_at IS NULL AND publico IS DISTINCT FROM true;

  -- 2 and 3. Categories
  IF NOT EXISTS (SELECT 1 FROM bd_tablas WHERE id = tabla AND deleted_at IS NULL)
     OR NOT EXISTS (SELECT 1 FROM bd_columnas WHERE id = col_cat AND archived_at IS NULL) THEN
    RETURN;
  END IF;
  t_sist := cfg->'sitio'->>'sistemas';
  IF t_sist IS NULL THEN RETURN; END IF;
  SELECT f.id INTO cat_pol FROM bd_filas f
   WHERE f.tabla_id = t_sist AND f.deleted_at IS NULL AND lower(COALESCE(
     (SELECT kw.title FROM knowledge_windows kw WHERE kw.id = f.pagina_id AND kw.deleted_at IS NULL),
     (SELECT f.valores->>c.id FROM bd_columnas c WHERE c.tabla_id = f.tabla_id AND c.tipo = 'texto' AND c.archived_at IS NULL ORDER BY c.orden, c.created_at LIMIT 1), '')) = 'política'
   ORDER BY f.created_at LIMIT 1;
  SELECT f.id INTO cat_eco FROM bd_filas f
   WHERE f.tabla_id = t_sist AND f.deleted_at IS NULL AND lower(COALESCE(
     (SELECT kw.title FROM knowledge_windows kw WHERE kw.id = f.pagina_id AND kw.deleted_at IS NULL),
     (SELECT f.valores->>c.id FROM bd_columnas c WHERE c.tabla_id = f.tabla_id AND c.tipo = 'texto' AND c.archived_at IS NULL ORDER BY c.orden, c.created_at LIMIT 1), '')) = 'economía'
   ORDER BY f.created_at LIMIT 1;
  SELECT f.id INTO cat_ene FROM bd_filas f
   WHERE f.tabla_id = t_sist AND f.deleted_at IS NULL AND lower(COALESCE(
     (SELECT kw.title FROM knowledge_windows kw WHERE kw.id = f.pagina_id AND kw.deleted_at IS NULL),
     (SELECT f.valores->>c.id FROM bd_columnas c WHERE c.tabla_id = f.tabla_id AND c.tipo = 'texto' AND c.archived_at IS NULL ORDER BY c.orden, c.created_at LIMIT 1), '')) = 'energía'
   ORDER BY f.created_at LIMIT 1;

  -- 2. Economía pública optimizada also «Política», first
  SELECT id INTO fila_epo FROM bd_filas WHERE tabla_id = tabla AND pagina_id = 'KWMODELOSOCIO01' AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF fila_epo IS NOT NULL AND cat_pol IS NOT NULL THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDE' || substr(md5(fila_epo || cat_pol), 1, 14), col_cat, fila_epo, 'fila', cat_pol, -1, autor)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. The Tienda: Energía. Crowd: Economía.
  IF cat_ene IS NOT NULL AND EXISTS (SELECT 1 FROM bd_filas WHERE id = tienda AND deleted_at IS NULL) THEN
    DELETE FROM bd_enlaces WHERE columna_id = col_cat AND fila_origen = tienda AND destino_id <> cat_ene;
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDE' || substr(md5(tienda || cat_ene), 1, 14), col_cat, tienda, 'fila', cat_ene, 0, autor)
    ON CONFLICT DO NOTHING;
  END IF;
  IF cat_eco IS NOT NULL AND EXISTS (SELECT 1 FROM bd_filas WHERE id = crowd AND deleted_at IS NULL) THEN
    DELETE FROM bd_enlaces WHERE columna_id = col_cat AND fila_origen = crowd AND destino_id <> cat_eco;
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDE' || substr(md5(crowd || cat_eco), 1, 14), col_cat, crowd, 'fila', cat_eco, 0, autor)
    ON CONFLICT DO NOTHING;
  END IF;
  RAISE NOTICE 'Economía %, Energía %, Política %, EPO %', cat_eco, cat_ene, cat_pol, fila_epo;
END $$;
