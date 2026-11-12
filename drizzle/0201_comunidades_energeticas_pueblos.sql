-- 2026-11-12 (Eugenio): «vamos a agrupar varios proyectos que están dentro del
-- mismo proyecto general: la comunidad energética de Villalbilla y la de Nuevo
-- Baztán en "Comunidades energéticas en pueblos" (modelo asociativo
-- público-privado para el impulso de comunidades energéticas), sacarlas del
-- grupo principal de proyectos y que se puedan añadir más».
--
-- 1. The «Proyectos» table (`BDTMUOOFFNGJIEG`) gets the «subelementos» function
--    (the same columns `activarFuncion` in src/server/bd.ts creates: «Elemento
--    madre», one, `rol = 'madre'` ↔ «Subelementos», many, `rol = 'hijos'`),
--    unless it already has it.
-- 2. The new project: its page and its row, same recipe as 0194 (team Eugenio,
--    area of the Villalbilla row, status «en curso», year 2024).
-- 3. Villalbilla (`BDFNTERGPU6IU32T`) and Nuevo Baztán (`BDFNTK94IVQCCNSX`) get
--    the new project as their «Elemento madre». The home grid hides rows with a
--    mother; the mother's page shows them (`SubproyectosSitio.tsx`).
-- Guarded: nothing happens without the table, and nothing is created twice.
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
  villalbilla  text := 'BDFNTERGPU6IU32T';
  baztan       text := 'BDFNTK94IVQCCNSX';
  pagina       text := 'KWCOMENERGPUEB01';
  fila         text := 'BDFCOMENERGPUE01';
  ruta         text := 'comunidades-energeticas-en-pueblos/espana';
  imagen       text := '/uploads/2026/11/144a05f5-696a-4695-ad96-35c067d081d2.jpg';
  col_madre    text;
  col_hijos    text;
  ultima       int;
  u            text;
  t            record;
  hijo         text;
  n            int := 0;
BEGIN
  SELECT b.*, p.publico AS proyecto_publico INTO t
  FROM bd_tablas b LEFT JOIN proyectos p ON p.id = b.proyecto_id
  WHERE b.id = tabla AND b.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT creator_user_id INTO u FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  -- 1. Subelementos.
  SELECT id INTO col_madre FROM bd_columnas WHERE tabla_id = tabla AND archived_at IS NULL AND config->>'rol' = 'madre' LIMIT 1;
  IF col_madre IS NULL THEN
    col_madre := 'BDCPROYMADRE01'; col_hijos := 'BDCPROYHIJOS01';
    SELECT COALESCE(max(orden), -1) INTO ultima FROM bd_columnas WHERE tabla_id = tabla;
    INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, opciones, config, orden) VALUES
      (col_madre, tabla, 'Elemento madre', 'relacion', '[]'::jsonb,
       jsonb_build_object('tabla_destino', tabla, 'varios', false, 'rol', 'madre', 'reciproca_id', col_hijos), ultima + 1),
      (col_hijos, tabla, 'Subelementos', 'relacion', '[]'::jsonb,
       jsonb_build_object('tabla_destino', tabla, 'varios', true, 'rol', 'hijos', 'inversa_de', col_madre), ultima + 2)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 2. The project.
  IF NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina)
     AND NOT EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     AND NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = ruta) THEN
    INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
    VALUES (
      pagina, 'Comunidades energéticas en pueblos', 'pagina',
      jsonb_build_object(
        'subtitulo', 'Modelo asociativo público-privado para el impulso de comunidades energéticas',
        'portada', imagen,
        'imagenCompartir', imagen,
        'subproyectos', jsonb_build_object('titulo', 'Las comunidades energéticas del modelo'),
        'bloques', jsonb_build_array(
          jsonb_build_object('id', 'Bcomenpue01', 'tipo', 'parrafo', 'texto',
            'Un modelo creado en 2024 para que los vecinos de un pueblo compartan la energía solar de los tejados municipales sin que el ayuntamiento tenga que invertir. Con él ya se han impulsado comunidades energéticas en diferentes pueblos de España, y sigue abierto a los que se quieran sumar.'),
          jsonb_build_object('id', 'Bcomenpue02', 'tipo', 'titulo2', 'texto', 'La innovación: un acuerdo de colaboración'),
          jsonb_build_object('id', 'Bcomenpue03', 'tipo', 'parrafo', 'texto',
            'La asociación, en este caso Light for Humanity, firma con el ayuntamiento un acuerdo de cesión de tejados municipales. Sobre esos tejados, los vecinos compran una participación a través de una empresa instaladora, en este caso Comunidad Solar, y entre todos crean una instalación fotovoltaica. El ayuntamiento no tiene que realizar la inversión y, a cambio, el municipio recibe el 10 % de la energía que se genera.'),
          jsonb_build_object('id', 'Bcomenpue04', 'tipo', 'titulo2', 'texto', 'Quién hace qué'),
          jsonb_build_object('id', 'Bcomenpue05', 'tipo', 'lista', 'texto',
            'La asociación es la garante de que la empresa privada hace la instalación y el mantenimiento de forma adecuada, y crea un grupo local dentro de la asociación que representa a los vecinos en el proyecto.'),
          jsonb_build_object('id', 'Bcomenpue06', 'tipo', 'lista', 'texto',
            'El ayuntamiento cede los tejados municipales sin realizar ninguna inversión y recibe el 10 % de la energía generada.'),
          jsonb_build_object('id', 'Bcomenpue07', 'tipo', 'lista', 'texto',
            'La empresa instaladora se encarga de la instalación, la legalización con la distribuidora, la puesta en marcha y el mantenimiento de la planta.'),
          jsonb_build_object('id', 'Bcomenpue08', 'tipo', 'lista', 'texto',
            'Los vecinos compran su participación y reciben la parte de la energía que les corresponde.'),
          jsonb_build_object('id', 'Bcomenpue09', 'tipo', 'titulo2', 'texto', 'Autoconsumo colectivo'),
          jsonb_build_object('id', 'Bcomenpue10', 'tipo', 'parrafo', 'texto',
            'A cada participante se le asigna un coeficiente de reparto bajo la ley del autoconsumo colectivo. Pueden participar los vecinos que están dentro de un radio de 5 kilómetros de la instalación, que es lo que permite actualmente la ley.'),
          jsonb_build_object('id', 'Bcomenpue11', 'tipo', 'titulo2', 'texto', 'Súmate'),
          jsonb_build_object('id', 'Bcomenpue12', 'tipo', 'parrafo', 'texto',
            'Estamos abiertos a seguir colaborando con nuevos ayuntamientos, instaladores y vecinos que quieran seguir impulsando la energía local y renovable en sus pueblos.')
        )
      ),
      CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
      u, false, u, u, t.proyecto_id, ruta
    );

    INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
    VALUES (
      fila, tabla,
      jsonb_build_object(col_nombre, 'Comunidades energéticas en pueblos', col_estado, op_en_curso, col_fecha, '2024'),
      -- Where Villalbilla was in the grid.
      COALESCE((SELECT orden FROM bd_filas WHERE id = villalbilla), (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla)),
      pagina, u, u
    );

    IF EXISTS (SELECT 1 FROM bd_filas WHERE id = persona AND deleted_at IS NULL) THEN
      INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
      VALUES ('BDECOMENERGPU01', col_equipo, fila, 'fila', persona, 0, u) ON CONFLICT DO NOTHING;
    END IF;
    -- The same area (category) as Villalbilla: Energía.
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    SELECT 'BDECOMENERGPU02', col_areas, fila, 'fila', e.destino_id, 0, u
    FROM bd_enlaces e WHERE e.columna_id = col_areas AND e.fila_origen = villalbilla
    ORDER BY e.orden LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Villalbilla and Nuevo Baztán, inside it (only if they have no mother yet).
  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = fila) THEN
    FOREACH hijo IN ARRAY ARRAY[villalbilla, baztan] LOOP
      n := n + 1;
      IF EXISTS (SELECT 1 FROM bd_filas WHERE id = hijo AND deleted_at IS NULL)
         AND NOT EXISTS (SELECT 1 FROM bd_enlaces WHERE columna_id = col_madre AND fila_origen = hijo) THEN
        INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
        VALUES ('BDECOMENERGPM0' || n, col_madre, hijo, 'fila', fila, 0, u) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;
