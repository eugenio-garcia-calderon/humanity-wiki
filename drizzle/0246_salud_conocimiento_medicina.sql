-- 2026-11-27 (Eugenio), luzhumanidad.com: «Agrega el área de innovación llamada Salud y mete el proyecto de
-- Plataforma de Agregación del conocimiento de la medicina… empieza a crear la página web… habla de que hemos
-- desarrollado desde Luz y Humanidad diferentes formas de visualización del conocimiento, tanto en mapas,
-- esquemas, ramificaciones, y que estamos trabajando para lanzar esta plataforma… si hay alguien interesado en
-- trabajar en ello, que se sume al equipo, y si quieren saber más, que se suscriban. Agrega a Amparo Ariza, que
-- hizo sus prácticas en Luz y Humanidad con este proyecto en 2025. Se inició en su parte de ideación en 2024 y
-- esperamos tener una beta en 2027.»
--
-- 1. A sector «Innovación en Salud» (icon «Salud», areas Salud and Medicina) in `sitio.sectores` of the root page
--    `KWMUO4S4V663`, after «Innovación en Agricultura». The same shape 0242 used.
-- 2. The project, as 0241 did for «Agricultura sintrópica»: a page and its row in «Proyectos» (`BDTMUOOFFNGJIEG`),
--    Tipo «Invento o modelo», Estado «En curso», Fecha Inicio 2024, area «Salud» (`BDFMUZDCA6M7W5H`, the row of
--    Sistemas read from production on 2026-11-27) and, in «Equipo Humano», Amparo Ariza Tejada
--    (`BDFNT8GN6IYZ2YVO`, already in Personas with area Salud).
--    Address: luzhumanidad.com/conocimiento-medicina. The images live in `public/conocimiento-medicina/` and the
--    page reuses two drawings the lab already published (the map of Grinberg's theory and the diagram of the
--    optimised public economy).
--    «Suscribirse»: the site has one newsletter, not one per project, so the button goes to it (`#boletin-correo`,
--    the footer of every page) and the text says it is the newsletter of Luz & Humanidad. «Súmate al equipo» opens
--    the contact form with this project and «Voluntariado» chosen (`/colabora?proyecto=…&motivo=…`).
--
-- Guarded like 0241/0242: does nothing on a database without these rows, and never twice.
DO $$
DECLARE
  tabla        text := 'BDTMUOOFFNGJIEG';
  raiz         text := 'KWMUO4S4V663';
  col_nombre   text := 'BDCMUOOFFNJE1A5';
  col_estado   text := 'BDCJ64F1ASLAPH';
  col_fecha    text := 'BDCMUR28JC1UKN9';
  col_areas    text := 'BDCMUVNOEH62ZFF';
  col_equipo   text := 'BDCMUVMW1GFJEIW';
  col_tipo     text := 'BDCTIPOPROYECT1';
  op_en_curso  text := 'OPT4E5WTHWLKCV';
  op_invento   text := 'OPTTIPOINVENTO1';
  area_salud   text := 'BDFMUZDCA6M7W5H';
  amparo       text := 'BDFNT8GN6IYZ2YVO';
  pagina       text := 'KWSALUDMEDICI01';
  fila         text := 'BDFSALUDMEDIC01';
  ruta         text := 'conocimiento-medicina';
  base         text := 'https://humanity.wiki/conocimiento-medicina/';
  titulo       text := 'Plataforma de agregación del conocimiento de la medicina';
  u            text;
  t            record;
  cfg          jsonb;
  sector       jsonb := jsonb_build_object('titulo', 'Innovación en Salud', 'icono', 'Salud',
    'areas', jsonb_build_array('Salud', 'Medicina'), 'destacado', true);
BEGIN
  -- 1. The sector
  SELECT config INTO cfg FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF cfg IS NOT NULL AND jsonb_typeof(cfg->'sitio'->'sectores') = 'array'
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(cfg->'sitio'->'sectores') s WHERE s->>'icono' = 'Salud') THEN
    UPDATE knowledge_windows SET config = jsonb_set(cfg, '{sitio,sectores}', (
      SELECT jsonb_agg(s ORDER BY k)
      FROM (
        SELECT s, (o * 2)::numeric AS k FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o)
        UNION ALL
        SELECT sector, COALESCE((SELECT o * 2 + 1 FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o)
                                 WHERE s->>'icono' = 'Agricultura' LIMIT 1), 1000)
      ) q)), version = version + 1, updated_at = now()
    WHERE id = raiz;
  END IF;

  -- 2. The project
  SELECT b.*, p.publico AS proyecto_publico INTO t
  FROM bd_tablas b LEFT JOIN proyectos p ON p.id = b.proyecto_id
  WHERE b.id = tabla AND b.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT creator_user_id INTO u FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  IF (SELECT count(*) FROM bd_columnas WHERE tabla_id = tabla AND archived_at IS NULL
        AND id IN (col_nombre, col_estado, col_fecha, col_areas, col_equipo, col_tipo)) < 6 THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina)
     OR EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     OR EXISTS (SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = ruta) THEN RETURN; END IF;

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
  VALUES (
    pagina, titulo, 'pagina',
    jsonb_build_object(
      'subtitulo', 'Todo lo que sabe la medicina, unido en un solo mapa: sus ramas, sus esquemas y cómo se conectan.',
      'portada', base || 'portada.jpg',
      'imagenCompartir', base || 'ramas.jpg',
      'bloques', jsonb_build_array(
        jsonb_build_object('id', 'Bsaludmed01', 'tipo', 'parrafo', 'texto',
          'Desde Luz & Humanidad hemos desarrollado diferentes formas de visualizar el conocimiento: mapas, esquemas y ramificaciones que dejan ver de un vistazo cómo se relacionan las ideas, las disciplinas y los datos. Ahora queremos llevarlas a uno de los campos más grandes y más repartidos que existen: la medicina.'),
        jsonb_build_object('id', 'Bsaludmed02', 'tipo', 'titulo1', 'texto', 'Formas de ver el conocimiento'),
        jsonb_build_object('id', 'Bsaludmed03', 'tipo', 'parrafo', 'texto',
          'Un mapa enseña dónde está cada cosa y qué la rodea. Un esquema enseña el camino: qué entra, qué pasa y qué sale. Una ramificación enseña de dónde viene cada rama y qué cuelga de ella. Son las tres formas que ya usamos en nuestros proyectos.'),
        jsonb_build_object('id', 'Bsaludmed04', 'tipo', 'imagen', 'url', 'https://humanity.wiki/estudio-conciencia/mapa-teoria-sintergica.jpg',
          'pie', 'Mapa: la teoría sintérgica, del estudio sobre la conciencia del ser humano.',
          'alt', 'Mapa de la teoría sintérgica: dos personas y los campos que las unen, en capas.'),
        jsonb_build_object('id', 'Bsaludmed05', 'tipo', 'imagen', 'url', 'https://humanity.wiki/modelo-socioeconomico/esquema.jpg',
          'pie', 'Esquema: cómo circula el dinero en la economía pública optimizada.',
          'alt', 'Esquema de la economía pública optimizada: los pagos, el fondo común y las ocho escalas.'),
        jsonb_build_object('id', 'Bsaludmed06', 'tipo', 'imagen', 'url', base || 'ramas.jpg',
          'pie', 'Ramificaciones: así imaginamos la medicina en la plataforma (las ramas son un ejemplo).',
          'alt', 'La medicina en el centro y, alrededor, ocho ramas con sus subramas: cardiología, nutrición, salud pública, psiquiatría, pediatría, inmunología, neurología y medicina integrativa.'),
        jsonb_build_object('id', 'Bsaludmed07', 'tipo', 'titulo1', 'texto', 'La plataforma'),
        jsonb_build_object('id', 'Bsaludmed08', 'tipo', 'parrafo', 'texto',
          'Estamos trabajando para lanzar una plataforma de agregación del conocimiento de la medicina: un lugar donde reunir lo que se sabe de cada rama de la salud y ver cómo se conectan entre sí, en vez de tenerlo repartido en especialidades que rara vez se miran unas a otras.'),
        jsonb_build_object('id', 'Bsaludmed09', 'tipo', 'titulo1', 'texto', 'El camino'),
        jsonb_build_object('id', 'Bsaludmed10', 'tipo', 'lista', 'texto', '2024: empieza la ideación del proyecto.'),
        jsonb_build_object('id', 'Bsaludmed11', 'tipo', 'lista', 'texto', '2025: Amparo Ariza hace sus prácticas en Luz & Humanidad con este proyecto.'),
        jsonb_build_object('id', 'Bsaludmed12', 'tipo', 'lista', 'texto', '2027: esperamos tener una primera versión beta de la plataforma.'),
        jsonb_build_object('id', 'Bsaludmed13', 'tipo', 'titulo1', 'texto', 'Súmate al equipo'),
        jsonb_build_object('id', 'Bsaludmed14', 'tipo', 'parrafo', 'texto',
          'Si te interesa trabajar en ello, desde la medicina, la investigación, el diseño o la programación, súmate al equipo.'),
        jsonb_build_object('id', 'Bsaludmed15', 'tipo', 'boton', 'texto', 'Quiero sumarme al equipo',
          'boton', jsonb_build_object('tipo', 'enlace', 'url', '/colabora?proyecto=' || ruta || '&motivo=voluntariado', 'estilo', 'oscuro')),
        jsonb_build_object('id', 'Bsaludmed16', 'tipo', 'titulo1', 'texto', '¿Quieres saber más?'),
        jsonb_build_object('id', 'Bsaludmed17', 'tipo', 'parrafo', 'texto',
          'Suscríbete al boletín de Luz & Humanidad y te contaremos cómo avanza la plataforma y cuándo abrimos la beta.'),
        jsonb_build_object('id', 'Bsaludmed18', 'tipo', 'boton', 'texto', 'Suscribirme',
          'boton', jsonb_build_object('tipo', 'enlace', 'url', '#boletin-correo', 'estilo', 'claro'))
      )
    ),
    CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
    u, false, u, u, t.proyecto_id, ruta
  );

  INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
  VALUES (
    fila, tabla,
    jsonb_build_object(col_nombre, titulo, col_estado, op_en_curso, col_fecha, '2024', col_tipo, op_invento),
    (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla),
    pagina, u, u
  );

  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = area_salud AND deleted_at IS NULL) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDESALUDMEDIC1', col_areas, fila, 'fila', area_salud, 0, u)
    ON CONFLICT DO NOTHING;
  END IF;
  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = amparo AND deleted_at IS NULL) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDESALUDMEDIC2', col_equipo, fila, 'fila', amparo, 0, u)
    ON CONFLICT DO NOTHING;
  END IF;
  RAISE NOTICE 'Salud: sector y proyecto % (página %) creados', fila, pagina;
END $$;
