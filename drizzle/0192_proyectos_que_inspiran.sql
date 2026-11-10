-- 2026-11-10 (Eugenio): «una sección al final, antes del footer, con una base de datos de proyectos
-- que inspiran a Luz y Humanidad». A database of the site like Proyectos: a table, its rows with their
-- pages, a block on the root page (a table is public when a visible page shows it) and `sitio.inspiran`.
-- Guarded: it does nothing without the root page or if the table already exists.
DO $$
DECLARE
  raiz    text := 'KWMUO4S4V663';
  tabla   text := 'BDTLUZINSPIRAN01';
  c_nom   text := 'BDCLUZINSPNOMBRE';
  c_url   text := 'BDCLUZINSPENLACE';
  c_amb   text := 'BDCLUZINSPAMBITO';
  op_dat  text := 'OPTINSPDATOS';
  op_rob  text := 'OPTINSPROBOTICA';
  op_sol  text := 'OPTINSPSOLAR';
  op_efi  text := 'OPTINSPEFICIENCIA';
  u text; p text; pub boolean; r record; i int := 0;
BEGIN
  SELECT creator_user_id INTO u FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF u IS NULL OR EXISTS (SELECT 1 FROM bd_tablas WHERE id = tabla) THEN RETURN; END IF;
  SELECT b.proyecto_id, COALESCE(pr.publico, false) INTO p, pub FROM bd_tablas b LEFT JOIN proyectos pr ON pr.id = b.proyecto_id WHERE b.id = 'BDTMUOOFFNGJIEG';

  INSERT INTO bd_tablas (id, titulo, proyecto_id, creador_user_id, created_by, updated_by) VALUES (tabla, 'Proyectos que nos inspiran', p, u, u, u);
  INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, opciones, orden) VALUES
    (c_nom, tabla, 'Nombre', 'texto', '[]'::jsonb, 0),
    (c_url, tabla, 'Enlace', 'url', '[]'::jsonb, 1),
    (c_amb, tabla, 'Ámbito', 'seleccion', jsonb_build_array(
      jsonb_build_object('id', op_dat, 'label', 'Datos abiertos', 'color', '#0f766e'),
      jsonb_build_object('id', op_rob, 'label', 'Robótica', 'color', '#4338ca'),
      jsonb_build_object('id', op_sol, 'label', 'Competición solar', 'color', '#b45309'),
      jsonb_build_object('id', op_efi, 'label', 'Eficiencia energética', 'color', '#15803d')), 2);

  FOR r IN SELECT * FROM (VALUES
    ('Our World in Data', 'https://ourworldindata.org/', op_dat, 'Datos e investigación abiertos y gratuitos para avanzar frente a los mayores problemas del mundo.'),
    ('Robodienst', 'https://robodienst.com/', op_rob, 'Herramientas y rutas de aprendizaje gratuitas para entender cómo se construyen los robots humanoides.'),
    ('World Solar Challenge', 'https://worldsolarchallenge.org/', op_sol, 'La gran carrera de coches solares: unos 3.000 km por Australia, de Darwin a Adelaida.'),
    ('Shell Eco-marathon', 'https://www.shellecomarathon.com/', op_efi, 'Competición en la que estudiantes diseñan y construyen vehículos que llegan lo más lejos posible con la mínima energía.')
  ) AS v(nombre, enlace, ambito, texto) LOOP
    i := i + 1;
    INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id)
    VALUES ('KWLUZINSPIRA0' || i, r.nombre, 'pagina', jsonb_build_object('subtitulo', r.texto, 'bloques', '[]'::jsonb), pub, u, false, u, u, p);
    INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
    VALUES ('BDFLUZINSPIRA0' || i, tabla, jsonb_build_object(c_nom, r.nombre, c_url, r.enlace, c_amb, r.ambito), i, 'KWLUZINSPIRA0' || i, u, u);
  END LOOP;

  UPDATE knowledge_windows
     SET config = jsonb_set(
           jsonb_set(config, '{sitio,inspiran}', to_jsonb(tabla)),
           '{bloques}', COALESCE(config->'bloques', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', 'Bluzlab0insp', 'tipo', 'basedatos', 'tabla_id', tabla, 'sinAnadir', true, 'ocultarMandosPublica', true))),
         version = version + 1
   WHERE id = raiz;
END $$;
