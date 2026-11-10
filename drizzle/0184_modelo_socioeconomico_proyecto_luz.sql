-- 2026-11-10 (Eugenio): «crea una nueva página dentro de los proyectos, un nuevo
-- proyecto en luzhumanidad.com, dentro de Humanity Wiki, que se llame modelo
-- socioeconómico optimizado».
--
-- Same recipe as 0181 (the consciousness project): the projects of
-- luzhumanidad.com are the rows of one database, «Proyectos»
-- (`BDTMUOOFFNGJIEG`, the `sitio.proyectos` of the site's root page
-- `KWMUO4S4V663`). A project is a row plus its page, the same two rows
-- `POST /api/bd/tablas/:id/filas` would create, plus:
--
--   · the page's `slug` = 'modelo-socioeconomico-optimizado/impuesto-unico':
--     a two-part address resolves by slug (`porRuta`, src/server/sitios.ts)
--     and the project card links to it;
--   · `config.aplicacion` = 'modelo-socioeconomico': the page shows the
--     interactive model (`APLICACIONES` in src/pages/SubpaginaSitio.tsx). Its
--     blocks — two paragraphs and the picture of the scheme — are what the
--     card, the server HTML and search engines read;
--   · links (`bd_enlaces`) the way the grid writes a relation: team «Eugenio
--     García-Calderón Huerta» (`BDFMVDVHJK2BBSN`, on every project of the
--     site) and, if the areas table has one whose name starts with «Econom»,
--     that area. The area id was not read from production (no access from this
--     session), so it is looked up by name and skipped if there is none.
--
-- Table, column, option and person ids are the ones 0181 read from production
-- on 2026-11-10. Everything is guarded: in a database without that table, that
-- page or those columns (a clean copy) it does nothing, and it never touches a
-- row that already exists.
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
  pagina       text := 'KWMODELOSOCIO01';
  fila         text := 'BDFMODELOSOCIO1';
  ruta         text := 'modelo-socioeconomico-optimizado/impuesto-unico';
  imagen       text := 'https://humanity.wiki/modelo-socioeconomico/esquema.jpg';
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
    pagina, 'Modelo socioeconómico optimizado', 'pagina',
    jsonb_build_object(
      'aplicacion', 'modelo-socioeconomico',
      'subtitulo', 'Un único impuesto del 20 % sobre cada pago, repartido al instante entre ocho escalas: de la persona al planeta',
      'portada', imagen,
      'imagenCompartir', imagen,
      'bloques', jsonb_build_array(
        jsonb_build_object('id', 'Bmodelosocio01', 'tipo', 'parrafo', 'texto',
          'Un modelo socioeconómico con un solo impuesto: el 20 % de cada transacción, sea una compra o el pago de un sueldo, sin ningún otro impuesto ni tasa. El propio sistema de pago lo aparta al instante y lo reparte a partes iguales, un 2,5 % para cada una de las ocho escalas en las que vivimos: la persona, la comunidad vecinal o la familia, el municipio, la provincia, la región, la nación, el continente y el planeta.'),
        jsonb_build_object('id', 'Bmodelosocio02', 'tipo', 'parrafo', 'texto',
          'En cada escala, una asamblea ciudadana elige las prioridades y un comité técnico las cumple al menor coste, de la forma más eficaz y ecológica. La página lo compara con el sistema fiscal español actual, con más de cien impuestos y cotizaciones y cientos de tasas, e incluye una matriz interactiva de responsabilidades por escala y ámbito, un esquema del recorrido del dinero y el cálculo para una persona de un pueblo de 400 habitantes de Madrid.'),
        jsonb_build_object('id', 'Bmodelosocio03', 'tipo', 'imagen', 'url', imagen,
          'alt', 'Esquema del modelo: cada pago aporta el 20 % al sistema de pago, que lo pasa a un fondo común abierto; el fondo da un 2,5 % a cada una de las ocho escalas, que devuelven servicios a las personas, y las personas votan las prioridades de cada escala.')
      )
    ),
    CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
    u, false, u, u, t.proyecto_id, ruta
  );

  INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
  VALUES (
    fila, tabla,
    jsonb_build_object(col_nombre, 'Modelo socioeconómico optimizado', col_estado, op_en_curso, col_fecha, '2026'),
    (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla),
    pagina, u, u
  );

  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = persona AND deleted_at IS NULL) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDEMODELOSOCIO2', col_equipo, fila, 'fila', persona, 0, u)
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
      WHERE tabla_id = tabla_areas AND deleted_at IS NULL AND valores->>col_titulo ILIKE 'econom%'
      ORDER BY orden LIMIT 1;
      IF area IS NOT NULL THEN
        INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
        VALUES ('BDEMODELOSOCIO1', col_areas, fila, 'fila', area, 0, u)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;
END $$;
