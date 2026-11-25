-- 2026-11-25 (Eugenio): «vamos a crear dentro de Luz de Humanidad una nueva página que sea
-- relacionada con la innovación en agricultura… centrarlo en España… el olivo, la viña, el
-- almendro, y el emergente es el pistacho… puedes llamar así a este proyecto: agricultura
-- sintrópica».
--
-- The same two rows 0181 wrote for «Conciencia del ser humano»: a page and its row in the
-- projects database of luzhumanidad.com («Proyectos», `BDTMUOOFFNGJIEG`, shown by the site's
-- root page `KWMUO4S4V663`). The ids of the table, its columns, the «en curso» option and the
-- team person are the ones 0181 read from production on 2026-11-10.
--
--   · slug 'agricultura-sintropica': luzhumanidad.com/agricultura-sintropica. A one-part
--     address opens because the page is the page of a row of a table the root page shows
--     (`madresValidas`, first branch; the lesson of 0231).
--   · config.aplicacion = 'agricultura-sintropica': the page shows the designer and simulator
--     (`APLICACIONES` in src/pages/SubpaginaSitio.tsx). Its blocks are what the project card,
--     the server HTML and search engines read.
--   · area: the row of the areas table whose name starts with «Alimenta» or «Agricultura»,
--     looked up by name (that table is the one 0181's area «Conciencia» belongs to). No such
--     row → no area link; nothing else changes.
--
-- Guarded like 0181: on a database without that table, page or columns it does nothing, and
-- it never runs twice (page id, row id or address already present).
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
  area_ref     text := 'BDFMVSECNUE13';
  persona      text := 'BDFMVDVHJK2BBSN';
  pagina       text := 'KWAGRISINTROP01';
  fila         text := 'BDFAGRISINTROP1';
  ruta         text := 'agricultura-sintropica';
  imagen       text := 'https://humanity.wiki/bosque-sintropico/portada.jpg';
  u            text;
  area         text;
  t            record;
BEGIN
  SELECT b.*, p.publico AS proyecto_publico INTO t
  FROM bd_tablas b LEFT JOIN proyectos p ON p.id = b.proyecto_id
  WHERE b.id = tabla AND b.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT creator_user_id INTO u FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  IF (SELECT count(*) FROM bd_columnas WHERE tabla_id = tabla AND archived_at IS NULL
        AND id IN (col_nombre, col_estado, col_fecha, col_areas, col_equipo)) < 5 THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina)
     OR EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     OR EXISTS (SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = ruta) THEN RETURN; END IF;

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
  VALUES (
    pagina, 'Agricultura sintrópica', 'pagina',
    jsonb_build_object(
      'aplicacion', 'agricultura-sintropica',
      'subtitulo', 'Diseñador y simulador de bosques sintrópicos para el almendro, el olivo, la viña y el pistacho en España',
      'portada', imagen,
      'imagenCompartir', imagen,
      'bloques', jsonb_build_array(
        jsonb_build_object('id', 'Bagrisintrop01', 'tipo', 'parrafo', 'texto',
          'España lidera el mundo en superficie de almendro, olivo y viña, y el pistacho es su cultivo emergente, pero buena parte está en secano, donde un almendro produce una fracción de lo que da con agua. Este proyecto mide y prototipa cuánto puede subir la producción de esas especies clave la agricultura sintrópica: rodear cada árbol de especies auxiliares que le den nitrógeno, sombra, biomasa y agua retenida en el suelo. La herramienta diseña el bosque en 3D sobre una parcela configurable (la geometría que se repite, numerada de la especie clave a la cubierta), lo compara con el modelo actual, simula su crecimiento durante 30 años, da consejos y exporta los planos para plantarlo. Con ingenieros agrícolas y forestales y agricultores sintrópicos.'),
        jsonb_build_object('id', 'Bagrisintrop02', 'tipo', 'imagen', 'url', imagen,
          'alt', 'Vista 3D de una parcela de una hectárea: a la izquierda el bosque sintrópico con almendros rodeados de especies auxiliares, pasillos y zanjas de agua; a la derecha el almendral convencional con los árboles solos.')
      )
    ),
    CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
    u, false, u, u, t.proyecto_id, ruta
  );

  INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
  VALUES (
    fila, tabla,
    jsonb_build_object(col_nombre, 'Agricultura sintrópica', col_estado, op_en_curso, col_fecha, '2026'),
    (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla),
    pagina, u, u
  );

  SELECT f.id INTO area FROM bd_filas f
  WHERE f.tabla_id = (SELECT tabla_id FROM bd_filas WHERE id = area_ref) AND f.deleted_at IS NULL
    AND EXISTS (SELECT 1 FROM jsonb_each_text(f.valores) v WHERE v.value ILIKE 'Alimenta%' OR v.value ILIKE 'Agricultura%')
  ORDER BY f.orden LIMIT 1;
  IF area IS NOT NULL THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDEAGRISINTROP1', col_areas, fila, 'fila', area, 0, u)
    ON CONFLICT DO NOTHING;
  END IF;
  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = persona AND deleted_at IS NULL) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDEAGRISINTROP2', col_equipo, fila, 'fila', persona, 0, u)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
