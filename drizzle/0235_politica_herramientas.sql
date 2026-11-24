-- 2026-11-24 (Eugenio): «En la URL de política tienen que aparecer todas las herramientas que
-- estamos desarrollando de política, pero solo como tarjetas que si pinchas te lleva a esa URL…
-- Tenemos 5 herramientas en total. Haz una tarjeta por cada una de ellas, una URL por cada una de
-- ellas y ordénalo todo bien.» Asked whether to review before publishing: «No quiero revisar».
--
-- «Política» (`KWMOBSPOLARIZ01`, `/politica`) framed the whole observatory document. After this:
--
--   /politica                       «Política»: only the cards (`config.aplicacion` = 'politica-herramientas',
--                                   src/pages/PoliticaHerramientas.tsx)
--   /observatorio-de-polarizacion   new page, the document with `config.vista` = 'observatorio'
--   /perfiles-politicos             new page, the document with `config.vista` = 'perfiles'
--   /geometria-politica             unchanged (`KWGEOPOLARIZ01`, 0229)
--   /democracia-directa             new page, the document with `config.vista` = 'decidir'
--   /economia-publica               new page, `config.aplicacion` = 'economia-publica' (src/pages/EconomiaPublica.tsx)
--
-- «Política» links the five as `subpagina` blocks, in the order of the cards. That is what makes
-- them hang from the site (`madresValidas`, src/server/permisos.ts: «Política» hangs from the root
-- through its row in «Proyectos», 0194), so `luzhumanidad.com/<slug>` opens them.
--
-- Each title slugifies to its slug («Perfiles políticos» → perfiles-politicos), as with «Política»
-- and «Geometría política»: the readable address (`rutaBonita`) is the same whichever it tries first.
--
-- A tool whose address the owner already uses for another page is not created again: that page is
-- the one linked. The old address of the observatory, `observatorio-de-polarizacion/espana`, now
-- answers with a 301 to the new observatory page instead of to the cards.
--
-- The texts that described the observatory move with it to its page; «Política» gets a text of its
-- own. `version` is bumped so the collaborative copy (pagina_yjs) does not write the old blocks back.
-- Runs once: only while «Política» still frames the document.
DO $$
DECLARE
  hub     text := 'KWMOBSPOLARIZ01';
  geo     text := 'KWGEOPOLARIZ01';
  u       text;
  cfg     jsonb;
  pub     boolean;
  proy    text;
  portada text;
  h       record;
  id_real text;
  cfg_h   jsonb;
  enlaces jsonb := '[]'::jsonb;
  obs     text;
  n       int := 0;
BEGIN
  SELECT creator_user_id, config, publico, proyecto_id INTO u, cfg, pub, proy
  FROM knowledge_windows WHERE id = hub AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;
  IF cfg->>'aplicacion' IS DISTINCT FROM 'observatorio-polarizacion' THEN RETURN; END IF;
  portada := cfg->>'portada';

  FOR h IN
    SELECT * FROM (VALUES
      (1, 'KWOBSERVPOL01',   'observatorio-de-polarizacion', 'Observatorio de polarización', 'observatorio-polarizacion', 'observatorio',
          'Cómo está dividida España: el barómetro del CIS, cien años de historia, cómo mira cada bando y cómo se pasa del desacuerdo al enemigo',
          NULL::text),
      (2, 'KWPERFILESPOL01', 'perfiles-politicos', 'Perfiles políticos', 'observatorio-polarizacion', 'perfiles',
          'Doce perfiles, de la extrema izquierda a la extrema derecha: su psicología, su relato, su lenguaje, sus contradicciones y sus líderes',
          'Perfiles políticos es una página interactiva con doce perfiles de la política española, de la extrema izquierda a la extrema derecha, más el libertarismo y el socialismo patriótico: su psicología, su relato, su lenguaje, sus contradicciones y los líderes que hoy representan cada dirección.'),
      (3, geo, 'geometria-politica', 'Geometría política', NULL, NULL, NULL, NULL),
      (4, 'KWDEMODIRECTA01', 'democracia-directa', 'Democracia directa', 'observatorio-polarizacion', 'decidir',
          'Votar cosas concretas, no colores: ver el estado de cada tema con sus datos y decidir cuánto subir, bajar, abrir o cerrar',
          'Democracia directa es una propuesta para votar por temas en lugar de por partidos. Cada persona ve el estado real de cada materia y cómo ha cambiado, con sus datos oficiales, y vota cuánto subir, bajar, abrir o cerrar cada medida, dando más peso a lo que más le importa.'),
      (5, 'KWECONPUBLICA01', 'economia-publica', 'Economía pública', 'economia-publica', NULL,
          'En qué se gasta el dinero público en cada escala, de la Unión Europea a una familia, y una propuesta para ordenarlo',
          'Economía pública muestra en qué se gasta hoy el dinero público en cada escala: la Unión Europea, España, la Comunidad de Madrid, un municipio, una comunidad de vecinos y una familia, cada una con su reparto, y las propuestas para ordenarlo. Forma parte del Modelo de optimización socioeconómica.')
    ) AS t(orden, id, slug, titulo, aplicacion, vista, subtitulo, texto)
    ORDER BY orden
  LOOP
    id_real := NULL;
    IF h.id = geo THEN
      SELECT id INTO id_real FROM knowledge_windows WHERE id = geo AND deleted_at IS NULL;
      IF id_real IS NULL THEN
        SELECT id INTO id_real FROM knowledge_windows WHERE creator_user_id = u AND slug = h.slug AND deleted_at IS NULL;
      END IF;
    ELSE
      -- The owner may already have a page at this address: link it instead of making a second one
      SELECT id INTO id_real FROM knowledge_windows
      WHERE creator_user_id = u AND slug = h.slug AND deleted_at IS NULL AND id <> hub;
      IF id_real IS NULL AND NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE id = h.id) THEN
        cfg_h := jsonb_build_object('aplicacion', h.aplicacion, 'subtitulo', h.subtitulo);
        IF h.vista IS NOT NULL THEN cfg_h := cfg_h || jsonb_build_object('vista', h.vista); END IF;
        IF h.aplicacion = 'observatorio-polarizacion' AND portada IS NOT NULL THEN
          cfg_h := cfg_h || jsonb_build_object('portada', portada, 'imagenCompartir', COALESCE(cfg->>'imagenCompartir', portada));
        END IF;
        -- The observatory keeps the blocks that described it; the others get their own text
        cfg_h := cfg_h || jsonb_build_object('bloques', CASE
          WHEN h.vista = 'observatorio' THEN COALESCE(cfg->'bloques', '[]'::jsonb)
          ELSE jsonb_build_array(jsonb_build_object('id', 'Bpolher' || h.orden || '01', 'tipo', 'parrafo', 'texto', h.texto))
        END);
        -- Nobody else may hold the address as an old one, or it would answer with a 301 elsewhere
        DELETE FROM direcciones_anteriores WHERE duenyo_user_id = u AND slug = h.slug;
        INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
        VALUES (h.id, h.titulo, 'pagina', cfg_h, pub, u, false, u, u, proy, h.slug);
        id_real := h.id;
      ELSIF id_real IS NULL THEN
        SELECT id INTO id_real FROM knowledge_windows WHERE id = h.id AND deleted_at IS NULL;
      END IF;
    END IF;
    IF h.vista = 'observatorio' THEN obs := id_real; END IF;
    IF id_real IS NOT NULL THEN
      n := n + 1;
      enlaces := enlaces || jsonb_build_array(jsonb_build_object('id', 'Bpolhers0' || h.orden, 'tipo', 'subpagina', 'entityId', id_real, 'pubTitulo', h.titulo));
    END IF;
  END LOOP;

  -- The observatory's old address follows the observatory
  IF obs IS NOT NULL THEN
    UPDATE direcciones_anteriores SET pagina_id = obs, created_at = now()
    WHERE duenyo_user_id = u AND slug = 'observatorio-de-polarizacion/espana' AND pagina_id = hub;
  END IF;

  -- «Política»: the cards. No `vista` any more; its own text, then one link per tool.
  cfg := (cfg - 'vista')
    || jsonb_build_object(
      'aplicacion', 'politica-herramientas',
      'subtitulo', 'Herramientas para entender la política en España y decidir mejor',
      'bloques', jsonb_build_array(jsonb_build_object('id', 'Bpolher0001', 'tipo', 'parrafo', 'texto',
        'Política reúne las herramientas de Luz & Humanidad para entender la política en España y decidir mejor: el Observatorio de polarización, los Perfiles políticos, la Geometría política, la Democracia directa y la Economía pública. Cada una tiene su propia página.'))
        || enlaces);
  UPDATE knowledge_windows SET config = cfg, title = 'Política', version = version + 1, updated_at = now() WHERE id = hub;
  RAISE NOTICE 'Política: % herramientas enlazadas', n;
END $$;
