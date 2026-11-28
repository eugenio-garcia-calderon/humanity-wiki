-- 2026-11-28 (Eugenio), luzhumanidad.com: «Debajo de cada sección de innovación pon la visión de futuro que queremos
-- traer a la humanidad con este laboratorio… La parte de las visiones es muy importante. Quiero que tenga una
-- relevancia grande y que esté el título del área de innovación junto con la visión justo debajo.» He dictated the
-- visions of Movilidad, Energía, Política, Vivienda, Informática, Salud, Educación y cultura and Seguridad; they are
-- shortened and polished here, as he asked («todas estas frases las puedes acortar un poquito, maquillar»).
-- Economía and Agricultura had none: theirs are a proposal in the same spirit, to be confirmed by him.
-- «Y en seguridad… vas a publicar un proyecto que sea el de desmantelamiento militar progresivo… que estamos todavía
-- en construcción de ese proyecto, pero la visión vas a poner…»
--
-- 1. `vision` {texto, claves} in each sector of `sitio.sectores` of the root page `KWMUO4S4V663`, matched by its
--    `icono`; `sitio.visionOtros` for «Informática» (the group of projects no sector claims). They live in the
--    configuration, not in the code, so the English and Portuguese replicas translate them and Eugenio can edit them.
-- 2. A sector «Innovación en Seguridad» (icon Seguridad, areas Seguridad and Defensa) at the end.
-- 3. A row «Seguridad» in the areas table (`BDTMUO8UV0QOPLO`) if there is none with that name.
-- 4. The project «Desmantelamiento militar progresivo»: page `KWDESMILITAR01` and row `BDFDESMILITAR01` in Proyectos,
--    Estado «Ideación», Fecha Inicio 2026, Tipo invento, area Seguridad. Its page says it is under construction and
--    carries the vision, with «Quiero sumarme al equipo» (form with this project; the form names projects by the
--    address the title gives, see 0247) and «Suscribirme» (the newsletter: there is no per-project subscription).
--
-- Each part is guarded on its own and none runs twice.
DO $$
DECLARE
  raiz        text := 'KWMUO4S4V663';
  tabla       text := 'BDTMUOOFFNGJIEG';
  sistemas    text := 'BDTMUO8UV0QOPLO';
  col_sis     text := 'BDCMUO8UV0UYRNB';
  col_nombre  text := 'BDCMUOOFFNJE1A5';
  col_estado  text := 'BDCJ64F1ASLAPH';
  col_fecha   text := 'BDCMUR28JC1UKN9';
  col_areas   text := 'BDCMUVNOEH62ZFF';
  col_tipo    text := 'BDCTIPOPROYECT1';
  op_ideacion text := 'OPTMV7Z2VEVWLKC';
  op_invento  text := 'OPTTIPOINVENTO1';
  pagina      text := 'KWDESMILITAR01';
  fila        text := 'BDFDESMILITAR01';
  titulo      text := 'Desmantelamiento militar progresivo';
  ruta        text := 'desmantelamiento-militar-progresivo';
  base        text := 'https://humanity.wiki/desmantelamiento-militar/';
  vision_seg  text := 'Una seguridad cercana y descentralizada: la persona protege a su familia, la comunidad a sus familias, el pueblo a sus comunidades y la región a sus pueblos. Un solo cuerpo, con valores altísimos y las personas de más capacidad y corazón al frente, que sepa combinar mano izquierda y firmeza para garantizar el orden y la paz sin recortar la libertad de pueblos y personas.';
  visiones    jsonb;
  cfg         jsonb;
  sectores    jsonb;
  u           text;
  t           record;
  area_seg    text;
BEGIN
  SELECT config, creator_user_id INTO cfg, u FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF cfg IS NULL OR jsonb_typeof(cfg->'sitio'->'sectores') <> 'array' THEN RETURN; END IF;

  visiones := jsonb_build_object(
    'Movilidad', jsonb_build_object(
      'texto', 'Una movilidad que nos lleve del punto A al punto B lo antes posible, con la menor energía y sin dejar a nadie atrás.',
      'claves', jsonb_build_array('Eficiente', 'Ligera', 'Segura', 'Accesible', 'Ecológica', 'Compartida')),
    'Energía', jsonb_build_object(
      'texto', 'Una energía limpia, generada cerca de donde se usa, a un precio justo y con una red en manos de la ciudadanía, no de unas pocas empresas. Con la tecnología a nuestro alcance para que nunca falte: estable hoy, mañana y dentro de décadas.',
      'claves', jsonb_build_array('Ecológica', 'Local', 'Económica', 'Ciudadana', 'Estable')),
    'Política', jsonb_build_object(
      'texto', 'Una política del debate y no de los colores, que trascienda las ideologías y busque lo que nos une. Que respete a quien piensa distinto, se enriquezca con la diversidad y escuche a quien tiene experiencia y sabiduría, lejos del populismo y la revancha. Una democracia directa, basada en el mérito y en la participación de cada día, no en un voto cada cuatro años.',
      'claves', jsonb_build_array('Debate', 'Encuentro', 'Respeto', 'Diversidad', 'Experiencia', 'Democracia directa')),
    'Economía', jsonb_build_object(
      'texto', 'Una economía al servicio de las personas y del planeta: que financie lo que de verdad importa, reparta oportunidades y deje la riqueza donde se crea.',
      'claves', jsonb_build_array('Justa', 'Ciudadana', 'Transparente', 'Local')),
    'Vivienda', jsonb_build_object(
      'texto', 'Hogares con sitio para varias generaciones, cerca de la familia, en barrios pensados para crear comunidad. Autosuficientes de la persona al pueblo, para resistir lo que venga, y que reúnan energía, movilidad, educación, salud y seguridad para vivir en armonía con la naturaleza: el lugar donde el ser humano se regenera y crea paraísos en la Tierra.',
      'claves', jsonb_build_array('Intergeneracional', 'Comunitaria', 'Autosuficiente', 'Resiliente', 'En armonía con la naturaleza')),
    'Agricultura', jsonb_build_object(
      'texto', 'Una agricultura que regenera la tierra en vez de agotarla: suelos vivos, agua cuidada, alimentos sanos y cercanos, y campos que vuelven a dar vida a los pueblos.',
      'claves', jsonb_build_array('Regenerativa', 'Sana', 'Cercana', 'Biodiversa')),
    'Educación', jsonb_build_object(
      'texto', 'Una educación de nuestro tiempo, que deje crecer a cada persona con todas sus diferencias, basada en el progreso, la cooperación y la paz. Y una cultura que trascienda lo que nos separa y nos centre en lo que nos une.',
      'claves', jsonb_build_array('Actual', 'Diversa', 'Cooperativa', 'En paz', 'Unión')),
    'Salud', jsonb_build_object(
      'texto', 'Todas las ciencias de la salud unidas, para que ante cualquier enfermedad tengamos a mano todos los caminos hacia la salud. Una sanidad humana, accesible, cuidadosa y bien dotada, que no esté dominada por el interés económico.',
      'claves', jsonb_build_array('Integradora', 'Humana', 'Accesible', 'Cuidadosa', 'Bien dotada')),
    'Seguridad', jsonb_build_object(
      'texto', vision_seg,
      'claves', jsonb_build_array('Cercana', 'Descentralizada', 'Unificada', 'Con valores', 'En paz', 'Libre'))
  );

  -- 1 + 2. Visions into the sectors that have none yet, and the Seguridad sector
  sectores := cfg->'sitio'->'sectores';
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(sectores) s WHERE s->>'icono' = 'Seguridad') THEN
    sectores := sectores || jsonb_build_array(jsonb_build_object('titulo', 'Innovación en Seguridad', 'icono', 'Seguridad',
      'areas', jsonb_build_array('Seguridad', 'Defensa'), 'destacado', true));
  END IF;
  sectores := (SELECT jsonb_agg(CASE WHEN s ? 'vision' OR NOT (visiones ? (s->>'icono')) THEN s
                                     ELSE s || jsonb_build_object('vision', visiones->(s->>'icono')) END ORDER BY o)
               FROM jsonb_array_elements(sectores) WITH ORDINALITY AS x(s, o));
  cfg := jsonb_set(cfg, '{sitio,sectores}', sectores);
  IF NOT (cfg->'sitio' ? 'visionOtros') THEN
    cfg := jsonb_set(cfg, '{sitio,visionOtros}', jsonb_build_object(
      'texto', 'Un conocimiento libre, diverso, profundo y conectado, en todos los formatos. Y unas redes de comunicación en manos de la ciudadanía, no de unas pocas empresas.',
      'claves', jsonb_build_array('Libre', 'Diverso', 'Profundo', 'Conectado', 'Ciudadano')));
  END IF;
  UPDATE knowledge_windows SET config = cfg, version = version + 1, updated_at = now()
  WHERE id = raiz AND config IS DISTINCT FROM cfg;
  RAISE NOTICE 'Visiones: % sectores con visión', (SELECT count(*) FROM jsonb_array_elements(sectores) s WHERE s ? 'vision');

  -- 3. The area «Seguridad»
  SELECT id INTO area_seg FROM bd_filas
  WHERE tabla_id = sistemas AND deleted_at IS NULL AND btrim(valores->>col_sis) IN ('Seguridad', 'Defensa')
  ORDER BY (btrim(valores->>col_sis) = 'Seguridad') DESC LIMIT 1;
  IF area_seg IS NULL AND EXISTS (SELECT 1 FROM bd_tablas WHERE id = sistemas AND deleted_at IS NULL) THEN
    area_seg := 'BDFSEGURIDAD001';
    INSERT INTO bd_filas (id, tabla_id, valores, orden, created_by, updated_by)
    VALUES (area_seg, sistemas, jsonb_build_object(col_sis, 'Seguridad'),
            (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = sistemas), u, u)
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'Seguridad: área creada (%)', area_seg;
  END IF;

  -- 4. The project
  SELECT b.*, p.publico AS proyecto_publico INTO t
  FROM bd_tablas b LEFT JOIN proyectos p ON p.id = b.proyecto_id
  WHERE b.id = tabla AND b.deleted_at IS NULL;
  IF NOT FOUND OR u IS NULL THEN RETURN; END IF;
  IF (SELECT count(*) FROM bd_columnas WHERE tabla_id = tabla AND archived_at IS NULL
        AND id IN (col_nombre, col_estado, col_fecha, col_areas, col_tipo)) < 5 THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina) OR EXISTS (SELECT 1 FROM bd_filas WHERE id = fila) THEN RETURN; END IF;

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
  VALUES (
    pagina, titulo, 'pagina',
    jsonb_build_object(
      'subtitulo', 'De los ejércitos a una seguridad cercana y en paz, paso a paso.',
      'portada', base || 'portada.jpg',
      'bloques', jsonb_build_array(
        jsonb_build_object('id', 'Bdesmil01', 'tipo', 'parrafo', 'texto',
          'Estamos construyendo este proyecto. Todavía no hay un plan publicado: aquí está la visión hacia la que queremos caminar.'),
        jsonb_build_object('id', 'Bdesmil02', 'tipo', 'titulo1', 'texto', 'La visión'),
        jsonb_build_object('id', 'Bdesmil03', 'tipo', 'parrafo', 'texto', vision_seg),
        jsonb_build_object('id', 'Bdesmil04', 'tipo', 'lista', 'texto', 'La persona protege a su familia.'),
        jsonb_build_object('id', 'Bdesmil05', 'tipo', 'lista', 'texto', 'La comunidad protege a sus familias.'),
        jsonb_build_object('id', 'Bdesmil06', 'tipo', 'lista', 'texto', 'El pueblo protege a sus comunidades.'),
        jsonb_build_object('id', 'Bdesmil07', 'tipo', 'lista', 'texto', 'La región protege a sus pueblos.'),
        jsonb_build_object('id', 'Bdesmil08', 'tipo', 'titulo1', 'texto', 'Súmate al equipo'),
        jsonb_build_object('id', 'Bdesmil09', 'tipo', 'parrafo', 'texto', 'Si quieres ayudar a darle forma, súmate al equipo.'),
        jsonb_build_object('id', 'Bdesmil10', 'tipo', 'boton', 'texto', 'Quiero sumarme al equipo',
          'boton', jsonb_build_object('tipo', 'enlace', 'url', '/colabora?proyecto=' || ruta || '&motivo=voluntariado', 'estilo', 'oscuro')),
        jsonb_build_object('id', 'Bdesmil11', 'tipo', 'titulo1', 'texto', '¿Quieres saber más?'),
        jsonb_build_object('id', 'Bdesmil12', 'tipo', 'parrafo', 'texto',
          'Suscríbete al boletín de Luz & Humanidad y te contaremos cuándo publicamos el proyecto.'),
        jsonb_build_object('id', 'Bdesmil13', 'tipo', 'boton', 'texto', 'Suscribirme',
          'boton', jsonb_build_object('tipo', 'enlace', 'url', '#boletin-correo', 'estilo', 'claro'))
      )
    ),
    CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
    u, false, u, u, t.proyecto_id, ruta
  );
  INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
  VALUES (fila, tabla,
    jsonb_build_object(col_nombre, titulo, col_estado, op_ideacion, col_fecha, '2026', col_tipo, op_invento),
    (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla), pagina, u, u);
  IF area_seg IS NOT NULL THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDEDESMILITAR1', col_areas, fila, 'fila', area_seg, 0, u)
    ON CONFLICT DO NOTHING;
  END IF;
  RAISE NOTICE 'Seguridad: proyecto % (página %) creado', fila, pagina;
END $$;
