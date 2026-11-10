-- 2026-11-10 (Eugenio): «publícalo como un proyecto dentro de Luz y Humanidad
-- para que esté ese dominio y esté visible cuando se pinche en ese proyecto,
-- que sea luzhumanidad/conciencia del ser humano/teoría sintergética, y ahí
-- aparezca este mapa».
--
-- The projects of luzhumanidad.com are the rows of one database, «Proyectos»
-- (`BDTMUOOFFNGJIEG`, the `sitio.proyectos` of the site's root page
-- `KWMUO4S4V663`). A project is a row plus its page. This adds one of each,
-- the same two rows `POST /api/bd/tablas/:id/filas` would create
-- (`crearFila` + `crearPaginaDeFila` in src/server/bd.ts), plus:
--
--   · the page's `slug` = 'conciencia-del-ser-humano/teoria-sintergica': the
--     two-part address resolves by slug (`porRuta`, src/server/sitios.ts) and
--     the project card links to it (`tarjetasDe` → `ruta`);
--   · `config.aplicacion` = 'conciencia': the page shows the map
--     (`APLICACIONES` in src/pages/SubpaginaSitio.tsx). Its blocks — a
--     paragraph and the picture of the map — are what the card, the server
--     HTML and search engines read;
--   · two links (`bd_enlaces`), the way the grid writes a relation: area
--     «Conciencia» (`BDFMVSECNUE13`) and team «Eugenio García-Calderón Huerta»
--     (`BDFMVDVHJK2BBSN`, on every project of the site).
--
-- Every id was read from production on 2026-11-10 through the public read API
-- (`/api/bd/tablas/:id?lectura=1` on luzhumanidad.com). Everything is guarded:
-- in a database without that table, that page or those columns (a clean copy)
-- it does nothing, and it never touches a row that already exists. The author
-- is the owner of the site's root page, so the page lives in his space (@luz)
-- like the other projects.
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
  area         text := 'BDFMVSECNUE13';
  persona      text := 'BDFMVDVHJK2BBSN';
  pagina       text := 'KWCONCIENCIASH01';
  fila         text := 'BDFCONCIENCIASH1';
  ruta         text := 'conciencia-del-ser-humano/teoria-sintergica';
  imagen       text := 'https://humanity.wiki/estudio-conciencia/mapa-teoria-sintergica.jpg';
  u            text;
  t            record;
BEGIN
  SELECT b.*, p.publico AS proyecto_publico INTO t
  FROM bd_tablas b LEFT JOIN proyectos p ON p.id = b.proyecto_id
  WHERE b.id = tabla AND b.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT creator_user_id INTO u FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  -- The columns must be the ones read on 2026-11-10.
  IF (SELECT count(*) FROM bd_columnas WHERE tabla_id = tabla AND archived_at IS NULL
        AND id IN (col_nombre, col_estado, col_fecha, col_areas, col_equipo)) < 5 THEN RETURN; END IF;

  -- Never twice: not if the page, the row or the address already exist.
  IF EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina)
     OR EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     OR EXISTS (SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = ruta) THEN RETURN; END IF;

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
  VALUES (
    pagina, 'Conciencia del ser humano', 'pagina',
    jsonb_build_object(
      'aplicacion', 'conciencia',
      'subtitulo', 'Teoría sintérgica de Jacobo Grinberg: cómo interactúan los seres conscientes a través de la matriz fundamental del universo',
      'portada', imagen,
      'imagenCompartir', imagen,
      'bloques', jsonb_build_array(
        jsonb_build_object('id', 'Bconciencia01', 'tipo', 'parrafo', 'texto',
          'Un mapa animado y editable de la teoría sintérgica de Jacobo Grinberg. El ser humano 1 a la izquierda, el ser humano 2 a la derecha y, en el centro, la matriz fundamental del universo (la «lattice»). Entre ellos, las tres maneras en que interactúan dos seres conscientes: despiertos, por los sentidos (la voz hace vibrar el aire y el campo neuronal del otro lo decodifica); dormidos, por el hipercampo; y meditando, por la telepatía, la visión extraocular y la visión remota. Con los estudios científicos de Grinberg y las réplicas posteriores.'),
        jsonb_build_object('id', 'Bconciencia02', 'tipo', 'imagen', 'url', imagen,
          'alt', 'Mapa de la teoría sintérgica: dos personas con su campo neuronal en forma de malla, la matriz fundamental del universo en el centro y tres franjas (vigilia, estado onírico y meditación) que las conectan.')
      )
    ),
    CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
    u, false, u, u, t.proyecto_id, ruta
  );

  INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
  VALUES (
    fila, tabla,
    jsonb_build_object(col_nombre, 'Conciencia del ser humano', col_estado, op_en_curso, col_fecha, '2026'),
    (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla),
    pagina, u, u
  );

  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = area AND deleted_at IS NULL) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDECONCIENCIASH1', col_areas, fila, 'fila', area, 0, u)
    ON CONFLICT DO NOTHING;
  END IF;
  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = persona AND deleted_at IS NULL) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDECONCIENCIASH2', col_equipo, fila, 'fila', persona, 0, u)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
