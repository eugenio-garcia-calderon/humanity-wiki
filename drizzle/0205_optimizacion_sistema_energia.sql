-- 2026-11-12 (Eugenio): «a este proyecto [la cadena de valor solar] añádelo en
-- la base de datos de proyectos que es optimización del sistema de energía… y
-- pon bastante arriba que Luz y Humanidad ha invertido en la empresa Suntropy
-- para desarrollar sistemas inteligentes y optimizar el sector de la energía.
-- Esa inversión se hizo en 2022 y desde entonces se ha incubado a Pablo
-- Sánchez, fundador de Suntropy… pon una foto suya… enlázale… Suntropy añádelo
-- como pionero en España en optimización».
--
-- There was no such project, so this creates it with the recipe of 0201/0202:
--   1. the row «Optimización del sistema de energía» in «Proyectos»
--      (`BDTMUOOFFNGJIEG`) and its page, a plain block page: the Suntropy
--      investment goes right under the opening paragraph, with Pablo Sánchez's
--      photo (his own portada) and a link to his page (row BDFNT0XYK47IFHY2 of
--      Personas, page KWNT8UVIDZT008J). He and Eugenio are its «Equipo Humano».
--   2. «Cadena de valor solar» (0204) gets it as its «Elemento madre», so it
--      leaves the home grid and shows up on this page.
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
  eugenio      text := 'BDFMVDVHJK2BBSN';
  pablo        text := 'BDFNT0XYK47IFHY2';
  pagina_pablo text := 'KWNT8UVIDZT008J';
  foto_pablo   text := '/uploads/2026/10/90900c44-6880-4566-aa65-116803d25584.png';
  cadena       text := 'BDFCADENASOLAR1';
  pagina       text := 'KWOPTIMENERGIA1';
  fila         text := 'BDFOPTIMENERGI1';
  ruta         text := 'optimizacion-sistema-energia';
  imagen       text := '/uploads/2026/11/144a05f5-696a-4695-ad96-35c067d081d2.jpg';
  col_madre    text;
  u            text;
  t            record;
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
      pagina, 'Optimización del sistema de energía', 'pagina',
      jsonb_build_object(
        'subtitulo', 'Sistemas inteligentes para optimizar el sector de la energía, con Suntropy, pionera en España',
        'portada', imagen,
        'imagenCompartir', imagen,
        'subproyectos', jsonb_build_object('titulo', 'Proyectos de optimización'),
        'bloques', jsonb_build_array(
          jsonb_build_object('id', 'Boptener01', 'tipo', 'parrafo', 'texto',
            'Llevar la energía solar a todos los tejados exige que cada paso cueste menos y rinda más: encontrar al cliente, estudiar su consumo, diseñar, presupuestar, legalizar, mantener y repartir la energía. Luz & Humanidad trabaja para optimizar el sistema de energía con herramientas inteligentes que hagan cada eslabón más rápido, más barato y más justo.'),
          jsonb_build_object('id', 'Boptener02', 'tipo', 'titulo2', 'texto', 'Nuestra inversión en Suntropy'),
          jsonb_build_object('id', 'Boptener03', 'tipo', 'imagen', 'url', foto_pablo,
            'alt', 'Pablo Sánchez, fundador de Suntropy.'),
          jsonb_build_object('id', 'Boptener04', 'tipo', 'parrafo', 'texto',
            'En 2022, Luz & Humanidad invirtió en **Suntropy**, empresa pionera en España en la optimización del autoconsumo solar con sistemas inteligentes, para desarrollar herramientas que optimicen el sector de la energía.'),
          jsonb_build_object('id', 'Boptener05', 'tipo', 'parrafo', 'texto',
            'Desde entonces, Luz & Humanidad incuba a su fundador, [Pablo Sánchez](/paginas/' || pagina_pablo || '), para desarrollar los proyectos de optimización del laboratorio.'),
          jsonb_build_object('id', 'Boptener06', 'tipo', 'titulo2', 'texto', 'Qué optimiza Suntropy'),
          jsonb_build_object('id', 'Boptener07', 'tipo', 'lista', 'texto',
            'La captación de clientes: convierte el interés en contactos de calidad para las empresas instaladoras.'),
          jsonb_build_object('id', 'Boptener08', 'tipo', 'lista', 'texto',
            'El estudio y el diseño: estudios de autoconsumo solar hechos en minutos en lugar de días.'),
          jsonb_build_object('id', 'Boptener09', 'tipo', 'lista', 'texto',
            'El presupuesto: propuestas automáticas, claras y comparables.'),
          jsonb_build_object('id', 'Boptener10', 'tipo', 'parrafo', 'texto',
            'Son los primeros eslabones de la cadena de valor solar, los más caros y los que más clientes pierden. Más en [suntropy.ai](https://www.suntropy.ai).')
        )
      ),
      CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
      u, false, u, u, t.proyecto_id, ruta
    );

    INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
    VALUES (
      fila, tabla,
      jsonb_build_object(col_nombre, 'Optimización del sistema de energía', col_estado, op_en_curso, col_fecha, '2022'),
      -- Where the value chain was.
      COALESCE((SELECT orden FROM bd_filas WHERE id = cadena), (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla)),
      pagina, u, u
    );

    IF EXISTS (SELECT 1 FROM bd_filas WHERE id = pablo AND deleted_at IS NULL) THEN
      INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
      VALUES ('BDEOPTIMENERG01', col_equipo, fila, 'fila', pablo, 0, u) ON CONFLICT DO NOTHING;
    END IF;
    IF EXISTS (SELECT 1 FROM bd_filas WHERE id = eugenio AND deleted_at IS NULL) THEN
      INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
      VALUES ('BDEOPTIMENERG02', col_equipo, fila, 'fila', eugenio, 1, u) ON CONFLICT DO NOTHING;
    END IF;
    -- The same area as the value chain: Energía.
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    SELECT 'BDEOPTIMENERG03', col_areas, fila, 'fila', e.destino_id, 0, u
    FROM bd_enlaces e WHERE e.columna_id = col_areas AND e.fila_origen = cadena
    ORDER BY e.orden LIMIT 1
    ON CONFLICT DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     AND EXISTS (SELECT 1 FROM bd_filas WHERE id = cadena AND deleted_at IS NULL)
     AND NOT EXISTS (SELECT 1 FROM bd_enlaces WHERE columna_id = col_madre AND fila_origen = cadena) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDEOPTIMENERGM1', col_madre, cadena, 'fila', fila, 1, u) ON CONFLICT DO NOTHING;
  END IF;
END $$;
