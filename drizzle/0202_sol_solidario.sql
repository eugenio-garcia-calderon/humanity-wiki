-- 2026-11-12 (Eugenio): «crea el proyecto de Sol Solidario con su página web,
-- dentro de luzhumanidad.com, con el menú arriba y abajo el Sol Solidario; y
-- ahí añade todos los proyectos que tengan que ver con llevar energía solar a
-- los colectivos más vulnerables que sufren la pobreza energética… para que se
-- quede despejadito el menú de proyectos».
--
-- Same recipe as 0201 (Comunidades energéticas en pueblos):
--   1. the row «Sol Solidario» in «Proyectos» (`BDTMUOOFFNGJIEG`) and its page,
--      whose `config.aplicacion = 'sol-solidario'` is src/pages/SolSolidario.tsx.
--      Its blocks are what the card, the server HTML and search engines read.
--      `config.solSolidario` will hold the bank accounts (empty until Eugenio
--      gives them: the page hides the transfer boxes meanwhile);
--   2. twelve projects get it as their «Elemento madre» (the column 0201
--      created), so they leave the home grid and show up on its page.
-- Guarded: nothing without the table or the column, nothing twice, and a
-- project that already has a mother keeps it.
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
  kenia        text := 'BDFNTUT0U667BPC1';
  pagina       text := 'KWSOLSOLIDARIO1';
  fila         text := 'BDFSOLSOLIDAR01';
  ruta         text := 'sol-solidario';
  imagen       text := '/uploads/2026/11/notas/19-luz-del-amazonas/8fb6ef153f07.jpg';
  hijos        text[] := ARRAY[
    'BDFNTQXJ0188QSIS',  -- Cañada Solar
    'BDFNTQY7O0GRDO60',  -- Hogar Lázaro Solar
    'BDFMVE3WNNR65YX',   -- Centro Zaqueo Solar
    'BDFNTDOF56F159B6',  -- Casa Nueva Sagunto
    'BDFMVDU8V45HILF',   -- Cursos Instaladores Solares
    'BDFNTVJGQ1NQ04D9',  -- Luz del Amazonas
    'BDFNT9W2HZNFZW27',  -- Luz de Guajira
    'BDFNTXJQF1VH0BFF',  -- Luz para Honduras
    'BDFNTUT0U667BPC1',  -- Luz para Kenia
    'BDFNTHIX1L0M795D',  -- Riego Solar Mozambique
    'BDFNTSTY4XY5SH4B',  -- Plataforma de Inversión Solar Crowd
    'BDFMVDU4N2KAWOC'    -- Tienda Solar Solidaria
  ];
  col_madre    text;
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
  SELECT id INTO col_madre FROM bd_columnas WHERE tabla_id = tabla AND archived_at IS NULL AND config->>'rol' = 'madre' LIMIT 1;
  IF col_madre IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina)
     AND NOT EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     AND NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = ruta) THEN
    INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
    VALUES (
      pagina, 'Sol Solidario', 'pagina',
      jsonb_build_object(
        'aplicacion', 'sol-solidario',
        'subtitulo', 'Energía solar para quien más la necesita: centros de acogida en España y comunidades sin electricidad en Latinoamérica y África',
        'portada', imagen,
        'imagenCompartir', imagen,
        'solSolidario', '{}'::jsonb,
        'bloques', jsonb_build_array(
          jsonb_build_object('id', 'Bsolsolid01', 'tipo', 'parrafo', 'texto',
            'Sol Solidario es la rama de Light for Humanity que lleva energía solar a las personas que sufren la pobreza energética. Desde 2018 ha llevado luz a decenas de miles de personas en seis países: centros de acogida y barrios sin luz en España, comunidades rurales sin electricidad del Amazonas brasileño, La Guajira colombiana y Honduras, y hogares y cultivos de Kenia y Mozambique.'),
          jsonb_build_object('id', 'Bsolsolid02', 'tipo', 'parrafo', 'texto',
            'Se financia con donaciones y con préstamos solidarios: personas que prestan su dinero, lo recuperan y lo vuelven a poner a trabajar. Los préstamos de Sol Solidario son a 7 años, con devoluciones anuales, al 0 % de interés y desde 1.000 euros.'),
          jsonb_build_object('id', 'Bsolsolid03', 'tipo', 'imagen', 'url', imagen,
            'alt', 'Un niño del Amazonas brasileño, a la luz de una lámpara de queroseno.')
        )
      ),
      CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
      u, false, u, u, t.proyecto_id, ruta
    );

    INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
    VALUES (
      fila, tabla,
      jsonb_build_object(col_nombre, 'Sol Solidario', col_estado, op_en_curso, col_fecha, '2018'),
      -- First among the projects it gathers.
      COALESCE((SELECT min(orden) FROM bd_filas WHERE id = ANY(hijos)), (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla)),
      pagina, u, u
    );

    IF EXISTS (SELECT 1 FROM bd_filas WHERE id = persona AND deleted_at IS NULL) THEN
      INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
      VALUES ('BDESOLSOLIDAR01', col_equipo, fila, 'fila', persona, 0, u) ON CONFLICT DO NOTHING;
    END IF;
    -- The same area (category) as Luz para Kenia: Energía.
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    SELECT 'BDESOLSOLIDAR02', col_areas, fila, 'fila', e.destino_id, 0, u
    FROM bd_enlaces e WHERE e.columna_id = col_areas AND e.fila_origen = kenia
    ORDER BY e.orden LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = fila) THEN
    FOREACH hijo IN ARRAY hijos LOOP
      n := n + 1;
      IF EXISTS (SELECT 1 FROM bd_filas WHERE id = hijo AND deleted_at IS NULL)
         AND NOT EXISTS (SELECT 1 FROM bd_enlaces WHERE columna_id = col_madre AND fila_origen = hijo) THEN
        INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
        VALUES ('BDESOLSOLIDM' || lpad(n::text, 2, '0'), col_madre, hijo, 'fila', fila, n, u) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;
END $$;
