-- 2026-11-28 (Eugenio): «Quiero que hagas un ejercicio de crear un modelo de democracia orgánica moderna…
-- Esta página web que vas a crear la pongas como un proyecto dentro de Luz de Humanidad, un proyecto que
-- está dentro del área de política… Y ya en esa página de política que tenemos de la URL /política, pues
-- ahí ya metes este sexto bloque.»
--
--  1. New page «Democracia orgánica moderna» (`KWDEMOORGANIC01`, slug `democracia-organica`), owned like the
--     other five tools (same owner, project and visibility as «Política», as 0235 did). `config.aplicacion`
--     = 'democracia-organica' frames the study (public/democracia-organica-moderna/index.html,
--     src/pages/DemocraciaOrganica.tsx). Its blocks are what search engines and the project card read.
--  2. «Política» (`KWMOBSPOLARIZ01`) links it as its sixth `subpagina` block (that is what makes
--     luzhumanidad.com/democracia-organica resolve) and its text names six tools. The cards a person sees are
--     src/pages/PoliticaHerramientas.tsx: the two lists must match.
--  3. A row in «Proyectos» (`BDTMUOOFFNGJIEG`), `BDFDEMOORGANI01`, in the «Política» category, built from the
--     «Democracia directa» row like 0238 built the others; its card picture is in
--     src/components/sitio/disenoUno/herramientas.tsx.
-- Every step checks what it touches exists, and can run twice.
DO $$
DECLARE
  hub     text := 'KWMOBSPOLARIZ01';
  pagina  text := 'KWDEMOORGANIC01';
  ruta    text := 'democracia-organica';
  titulo  text := 'Democracia orgánica moderna';
  tabla   text := 'BDTMUOOFFNGJIEG';
  col_cat text := 'BDCMUVNOEH62ZFF';
  col_nom text := 'BDCMUOOFFNJE1A5';
  cat_pol text := 'BDFMUZDLMG4BBYL';
  fila    text := 'BDFDEMOORGANI01';
  hermana text := 'BDFDEMODIRECT01';
  portada text := '/politica/tarjetas/organica.webp';
  u       text;
  cfg     jsonb;
  pub     boolean;
  proy    text;
  base    record;
BEGIN
  SELECT creator_user_id, config, publico, proyecto_id INTO u, cfg, pub, proy
  FROM knowledge_windows WHERE id = hub AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  -- 1. The page
  IF NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina) THEN
    -- Nobody else may hold the address as an old one, or it would answer with a 301 elsewhere
    DELETE FROM direcciones_anteriores WHERE duenyo_user_id = u AND slug = ruta;
    INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
    VALUES (pagina, titulo, 'pagina', jsonb_build_object(
      'aplicacion', 'democracia-organica',
      'subtitulo', 'Una democracia de doble raíz: cada persona, un voto igual, y cada comunidad, su voz',
      'portada', portada, 'imagenCompartir', portada,
      'bloques', jsonb_build_array(
        jsonb_build_object('id', 'Bdemorg01', 'tipo', 'parrafo', 'texto',
          'Democracia orgánica moderna es un ejercicio de diseño institucional de Luz & Humanidad. Mantiene el sufragio universal, la libertad de asociación y los partidos libres, y añade una segunda raíz de representación: los territorios, los oficios y ciudadanos elegidos por sorteo, en una Cámara de la Sociedad de tres tercios.'),
        jsonb_build_object('id', 'Bdemorg02', 'tipo', 'titulo1', 'texto', 'Qué propone'),
        jsonb_build_object('id', 'Bdemorg03', 'tipo', 'lista', 'texto', 'Un Gobierno elegido aparte del Parlamento, con mandato fijo, y una Cámara de los Ciudadanos elegida por un sistema mixto proporcional.'),
        jsonb_build_object('id', 'Bdemorg04', 'tipo', 'lista', 'texto', 'Una Cámara de la Sociedad con un tercio territorial, un tercio de oficios elegido por cada sector y un tercio por sorteo, con la «doble llave» en las leyes sectoriales.'),
        jsonb_build_object('id', 'Bdemorg05', 'tipo', 'lista', 'texto', 'Jueces, Tribunal Constitucional, Fiscalía y órganos de control con orígenes mezclados y concursos públicos: ningún poder elige él solo a quien lo controla.'),
        jsonb_build_object('id', 'Bdemorg06', 'tipo', 'lista', 'texto', 'Medios sin publicidad institucional discrecional ni directivos nombrados por políticos.'),
        jsonb_build_object('id', 'Bdemorg07', 'tipo', 'lista', 'texto', 'El mismo patrón en cada escala, de la comunidad vecinal a la nación, y la democracia directa por temas como cuarta vía.'),
        jsonb_build_object('id', 'Bdemorg08', 'tipo', 'parrafo', 'texto',
          'La página compara el modelo con la España de hoy en quince fallos del diseño, cada uno con el hecho, la crítica, la mejor defensa del sistema actual y la propuesta, y expone sus principios, sus siete hipótesis comprobables, las críticas que recibirá y una transición en tres fases. Se distingue expresamente de la «democracia orgánica» del franquismo, que carecía de libertades.')
      )),
      pub, u, false, u, u, proy, ruta);
  END IF;

  -- 2. «Política»: the sixth block and its text
  IF cfg->>'aplicacion' = 'politica-herramientas'
     AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(cfg->'bloques', '[]'::jsonb)) b WHERE b->>'entityId' = pagina) THEN
    cfg := jsonb_set(cfg, '{bloques}', (
      SELECT COALESCE(jsonb_agg(CASE WHEN b->>'id' = 'Bpolher0001'
        THEN b || jsonb_build_object('texto', 'Política reúne las herramientas de Luz & Humanidad para entender la política en España y decidir mejor: el Observatorio de polarización, los Perfiles políticos, la Geometría política, la Democracia directa, la Economía pública y la Democracia orgánica moderna. Cada una tiene su propia página.')
        ELSE b END ORDER BY o), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(cfg->'bloques', '[]'::jsonb)) WITH ORDINALITY AS x(b, o))
      || jsonb_build_array(jsonb_build_object('id', 'Bpolhers06', 'tipo', 'subpagina', 'entityId', pagina, 'pubTitulo', titulo)));
    UPDATE knowledge_windows SET config = cfg, version = version + 1, updated_at = now() WHERE id = hub;
  END IF;

  -- 3. The project row, in «Política»
  IF EXISTS (SELECT 1 FROM bd_tablas WHERE id = tabla AND deleted_at IS NULL)
     AND NOT EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     AND NOT EXISTS (SELECT 1 FROM bd_filas WHERE tabla_id = tabla AND pagina_id = pagina AND deleted_at IS NULL) THEN
    SELECT * INTO base FROM bd_filas WHERE id = hermana AND deleted_at IS NULL;
    INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
    VALUES (fila, tabla,
            COALESCE(base.valores, '{}'::jsonb) || jsonb_build_object(col_nom, titulo),
            (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla),
            pagina, COALESCE(base.created_by, u), COALESCE(base.updated_by, u));
    IF EXISTS (SELECT 1 FROM bd_columnas WHERE id = col_cat AND archived_at IS NULL)
       AND EXISTS (SELECT 1 FROM bd_filas WHERE id = cat_pol AND deleted_at IS NULL) THEN
      INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
      VALUES ('BDE' || substr(md5(fila || cat_pol), 1, 14), col_cat, fila, 'fila', cat_pol, 0, COALESCE(base.created_by, u))
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RAISE NOTICE 'Democracia orgánica moderna: página %, fila %', pagina, fila;
END $$;
