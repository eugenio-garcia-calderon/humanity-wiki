-- 2026-11-11 (Eugenio): «publícalo en Luzhumanidad como "Observatorio de
-- Polarización"».
--
-- Same recipe as 0181 and 0184: a project of luzhumanidad.com is a row of
-- «Proyectos» (`BDTMUOOFFNGJIEG`, the `sitio.proyectos` of the root page
-- `KWMUO4S4V663`) plus its page:
--
--   · slug 'observatorio-de-polarizacion/espana' (two parts, resolved by
--     `porRuta` in src/server/sitios.ts; the project card links to it);
--   · `config.aplicacion` = 'observatorio-polarizacion': the page frames the
--     interactive document `public/observatorio-polarizacion/index.html`
--     (`APLICACIONES` in src/pages/SubpaginaSitio.tsx). Its blocks are what the
--     card, the server HTML and search engines read;
--   · links: team «Eugenio García-Calderón Huerta» (`BDFMVDVHJK2BBSN`) and,
--     looked up by name, an area starting with «Sociolog», «Polít» or «Socie»
--     (skipped if none).
--
-- Ids of table, columns, option and person are the ones 0181 read from
-- production. Everything is guarded: on a database without them it does
-- nothing, and it never touches a row that already exists.
DO $$
DECLARE
  tabla        text := 'BDTMUOOFFNGJIEG';
  raiz         text := 'KWMUO4S4V663';
  col_nombre   text := 'BDCMUOOFFNJE1A5';
  col_estado   text := 'BDCJ64F1ASLAPH';
  col_fecha    text := 'BDCMUR28JC1UKN9';
  col_areas    text := 'BDCMUVNOEH62ZFF';
  col_equipo   text := 'BDCMUVMW1GFJEIW';
  op_en_curso  text := 'OPT4E5WTHWLKCV';
  persona      text := 'BDFMVDVHJK2BBSN';
  pagina       text := 'KWMOBSPOLARIZ01';
  fila         text := 'BDFOBSPOLARIZ01';
  ruta         text := 'observatorio-de-polarizacion/espana';
  imagen       text := 'https://humanity.wiki/observatorio-polarizacion/portada.jpg';
  u            text;
  t            record;
  tabla_areas  text;
  col_titulo   text;
  area         text;
BEGIN
  SELECT b.*, p.publico AS proyecto_publico INTO t
  FROM bd_tablas b LEFT JOIN proyectos p ON p.id = b.proyecto_id
  WHERE b.id = tabla AND b.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT creator_user_id INTO u FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  IF (SELECT count(*) FROM bd_columnas WHERE tabla_id = tabla AND archived_at IS NULL
        AND id IN (col_nombre, col_estado, col_fecha, col_areas, col_equipo)) < 5 THEN RETURN; END IF;

  -- Never twice: not if the page, the row or the address already exist.
  IF EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina)
     OR EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     OR EXISTS (SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = ruta) THEN RETURN; END IF;

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
  VALUES (
    pagina, 'Observatorio de Polarización', 'pagina',
    jsonb_build_object(
      'aplicacion', 'observatorio-polarizacion',
      'subtitulo', 'Cómo se polariza España: un simulador, cien años de historia, cinco tipos ideales, sus líderes, sus palabras y un test para saber hacia dónde te escoras',
      'portada', imagen,
      'imagenCompartir', imagen,
      'bloques', jsonb_build_array(
        jsonb_build_object('id', 'Bobspolariz01', 'tipo', 'parrafo', 'texto',
          'Un observatorio interactivo de la polarización política en España. Un simulador muestra qué se mueve primero cuando sube la presión del grupo, las ideas o la temperatura, y lo compara con la autoubicación real del barómetro del CIS de septiembre de 2026. Una cronología recorre cien años, de 1923 a 2026, con la forma de la sociedad en cada etapa y lo que costó.'),
        jsonb_build_object('id', 'Bobspolariz02', 'tipo', 'parrafo', 'texto',
          'Cinco tipos ideales, de la extrema izquierda a la extrema derecha, más el libertarismo y el socialismo patriótico, con su psicología, su relato, su lenguaje y sus contradicciones; los líderes que hoy representan cada dirección; el origen de etiquetas como fascista o comunista; cómo se miran entre sí; la escalera que lleva del desacuerdo a la violencia; las consecuencias de cada fase; un test de quince preguntas y el método, con sus fuentes.'),
        jsonb_build_object('id', 'Bobspolariz03', 'tipo', 'imagen', 'url', imagen,
          'alt', 'Portada del Observatorio de Polarización: «Una sociedad se mide por la forma de su centro».')
      )
    ),
    CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
    u, false, u, u, t.proyecto_id, ruta
  );

  INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
  VALUES (
    fila, tabla,
    jsonb_build_object(col_nombre, 'Observatorio de Polarización', col_estado, op_en_curso, col_fecha, '2026'),
    (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla),
    pagina, u, u
  );

  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = persona AND deleted_at IS NULL) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDEOBSPOLARIZ02', col_equipo, fila, 'fila', persona, 0, u)
    ON CONFLICT DO NOTHING;
  END IF;

  -- The area, by name: the areas table is the destination of the «Áreas»
  -- relation; its title is its first text column.
  SELECT config->>'tabla_destino' INTO tabla_areas FROM bd_columnas WHERE id = col_areas;
  IF tabla_areas IS NOT NULL THEN
    SELECT id INTO col_titulo FROM bd_columnas
    WHERE tabla_id = tabla_areas AND tipo = 'texto' AND archived_at IS NULL
    ORDER BY orden, created_at LIMIT 1;
    IF col_titulo IS NOT NULL THEN
      SELECT id INTO area FROM bd_filas
      WHERE tabla_id = tabla_areas AND deleted_at IS NULL AND (valores->>col_titulo ILIKE 'sociolog%' OR valores->>col_titulo ILIKE 'polít%' OR valores->>col_titulo ILIKE 'socie%')
      ORDER BY (valores->>col_titulo ILIKE 'sociolog%') DESC, orden LIMIT 1;
      IF area IS NOT NULL THEN
        INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
        VALUES ('BDEOBSPOLARIZ01', col_areas, fila, 'fila', area, 0, u)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
END $$;
