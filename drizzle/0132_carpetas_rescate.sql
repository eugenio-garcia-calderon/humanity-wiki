-- ============================================================================
-- PROYECTOS → CARPETAS: RESCUE EVERYTHING A PROJECT HELD INTO PAGES (2026-09-30)
-- ============================================================================
-- Eugenio: «a lo que antes llamábamos proyectos ahora se va a llamar CARPETAS,
-- y en las carpetas puedes meter PÁGINAS y nada más que páginas […] no te
-- preocupes de eliminar información, intenta rescatar la info poniéndola en
-- páginas».
--
-- The `proyectos` row IS the folder from now on (same id, slug, owner, icon,
-- cover, public flag). Pages already hang from it through
-- `knowledge_windows.proyecto_id`. What did not fit a pages-only folder is
-- copied here into ordinary pages inside that folder:
--
--   · «Sobre <folder>»      description, vision, cover, gallery, branches, files
--   · «Tareas de <folder>»  the board, one checklist per column, with notes
--   · «Publicaciones de …»  the project wall
--   · «Más de <folder>»     links to its diagrams, maps, products, tables, events
--
-- NOTHING IS DELETED OR MOVED. The source rows stay exactly where they were
-- (tasks still show up in /tareas, files still hang from the project). This
-- migration only INSERTs pages.
--
-- ALL RESCUED PAGES ARE BORN PRIVATE. Some of this was visible on a public
-- project and some was not (tasks, files); deciding per piece what a stranger
-- may read is the owner's call, not a migration's. Publishing is one click.
--
-- IDEMPOTENT: every page carries `config.rescate = '<project id>:<part>'` and is
-- skipped if it already exists, so re-running the file changes nothing.
-- A part with nothing in it produces no page: an empty page is noise.

CREATE OR REPLACE FUNCTION pg_temp.rb_id() RETURNS text LANGUAGE sql AS $$
  SELECT 'B' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)
$$;

CREATE OR REPLACE FUNCTION pg_temp.rb(tipo text, texto text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('id', pg_temp.rb_id(), 'tipo', tipo, 'texto', coalesce(texto, ''))
$$;

CREATE OR REPLACE FUNCTION pg_temp.rb_img(url text, pie text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('id', pg_temp.rb_id(), 'tipo', 'imagen', 'url', url, 'pie', coalesce(pie, ''))
$$;

-- A file as the block the editor would have made for it.
CREATE OR REPLACE FUNCTION pg_temp.rb_archivo(url text, nombre text, mime text, bytes bigint) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE
    WHEN coalesce(mime, '') LIKE 'image/%' THEN pg_temp.rb_img(url, nombre)
    ELSE jsonb_strip_nulls(jsonb_build_object(
      'id', pg_temp.rb_id(), 'tipo', 'medio', 'url', url, 'pie', coalesce(nombre, ''),
      'medio', CASE WHEN mime LIKE 'video/%' THEN 'video'
                    WHEN mime LIKE 'audio/%' THEN 'audio'
                    WHEN mime = 'application/pdf' THEN 'pdf'
                    ELSE 'archivo' END,
      'medioBytes', bytes))
  END
$$;

-- Plain text with blank lines → one paragraph per chunk.
CREATE OR REPLACE FUNCTION pg_temp.rb_parrafos(t text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT coalesce(jsonb_agg(pg_temp.rb('parrafo', trim(x)) ORDER BY n), '[]'::jsonb)
  FROM regexp_split_to_table(coalesce(t, ''), E'\\n\\s*\\n') WITH ORDINALITY AS s(x, n)
  WHERE trim(x) <> ''
$$;

-- Markdown link text; brackets in a title would break the link.
CREATE OR REPLACE FUNCTION pg_temp.enlace(titulo text, url text) RETURNS text LANGUAGE sql AS $$
  SELECT '[' || replace(replace(coalesce(nullif(trim(titulo), ''), 'Sin título'), '[', '('), ']', ')') || '](' || url || ')'
$$;

CREATE OR REPLACE FUNCTION pg_temp.crear_pagina(p proyectos, parte text, titulo text, bloques jsonb, icono text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF bloques IS NULL OR jsonb_array_length(bloques) = 0 THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM knowledge_windows
             WHERE kind = 'pagina' AND config->>'rescate' = p.id || ':' || parte) THEN
    RETURN;
  END IF;
  INSERT INTO knowledge_windows
    (id, title, kind, config, publico, creator_user_id, is_ai_generated,
     created_by, updated_by, proyecto_id)
  VALUES
    ('KWR' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 11)),
     titulo, 'pagina',
     jsonb_build_object('bloques', bloques, 'icono', icono, 'rescate', p.id || ':' || parte),
     false, p.creador_user_id, false, p.creador_user_id, p.creador_user_id, p.id);
END $$;

DO $$
DECLARE
  p proyectos;
  b jsonb;
  col record;
  t record;
  x record;
  nombres jsonb;
BEGIN
  FOR p IN SELECT * FROM proyectos WHERE archived_at IS NULL AND deleted_at IS NULL AND creador_user_id IS NOT NULL LOOP

    -- ── 1. SOBRE LA CARPETA ────────────────────────────────────────────────
    b := '[]'::jsonb;
    IF p.portada_url IS NOT NULL AND p.portada_url <> '' THEN
      b := b || jsonb_build_array(pg_temp.rb_img(p.portada_url, 'Portada'));
    END IF;
    b := b || pg_temp.rb_parrafos(p.descripcion);
    IF coalesce(trim(p.vision), '') <> '' THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Visión'), pg_temp.rb('cita', trim(p.vision)));
    END IF;

    IF EXISTS (SELECT 1 FROM proyecto_imagenes WHERE proyecto_id = p.id AND archived_at IS NULL) THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Galería'));
      FOR x IN SELECT url, descripcion FROM proyecto_imagenes
               WHERE proyecto_id = p.id AND archived_at IS NULL ORDER BY orden, created_at LOOP
        b := b || jsonb_build_array(pg_temp.rb_img(x.url, x.descripcion));
      END LOOP;
    END IF;

    -- Branches are a tree; indentation with «—» keeps the shape readable in a
    -- flat list without inventing a nested-list block the editor lacks.
    IF EXISTS (SELECT 1 FROM proyecto_ramas WHERE proyecto_id = p.id AND archived_at IS NULL) THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Ramas'));
      FOR x IN
        WITH RECURSIVE arbol AS (
          SELECT id, nombre, nota, 0 AS nivel, ARRAY[lpad(orden::text, 6, '0') || id] AS camino
          FROM proyecto_ramas WHERE proyecto_id = p.id AND archived_at IS NULL AND padre_id IS NULL
          UNION ALL
          SELECT r.id, r.nombre, r.nota, a.nivel + 1, a.camino || (lpad(r.orden::text, 6, '0') || r.id)
          FROM proyecto_ramas r JOIN arbol a ON r.padre_id = a.id
          WHERE r.archived_at IS NULL AND a.nivel < 10
        )
        SELECT nombre, nota, nivel FROM arbol ORDER BY camino
      LOOP
        b := b || jsonb_build_array(pg_temp.rb('lista',
          repeat('— ', x.nivel) || '**' || coalesce(x.nombre, '') || '**'
          || CASE WHEN coalesce(trim(x.nota), '') <> '' THEN ': ' || trim(x.nota) ELSE '' END));
      END LOOP;
    END IF;

    IF EXISTS (SELECT 1 FROM archivos WHERE proyecto_id = p.id AND archived_at IS NULL) THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Archivos'));
      FOR x IN SELECT url, nombre, mime, bytes FROM archivos
               WHERE proyecto_id = p.id AND archived_at IS NULL ORDER BY created_at LOOP
        b := b || jsonb_build_array(pg_temp.rb_archivo(x.url, x.nombre, x.mime, x.bytes));
      END LOOP;
    END IF;
    PERFORM pg_temp.crear_pagina(p, 'sobre', 'Sobre ' || p.titulo, b, coalesce(p.icono, '📁'));

    -- ── 2. TAREAS ──────────────────────────────────────────────────────────
    b := '[]'::jsonb;
    nombres := coalesce(p.columnas, '{}'::jsonb);
    FOR col IN SELECT * FROM (VALUES (1, 'por_hacer', 'Por hacer'), (2, 'en_curso', 'En curso'), (3, 'hecho', 'Hecho')) v(n, clave, nombre) ORDER BY n LOOP
      IF NOT EXISTS (SELECT 1 FROM roadmap_items WHERE proyecto_id = p.id AND archived_at IS NULL
                     AND coalesce(estado, 'por_hacer') = col.clave) THEN CONTINUE; END IF;
      b := b || jsonb_build_array(pg_temp.rb('titulo2', coalesce(nombres->>col.clave, col.nombre)));
      FOR t IN SELECT * FROM roadmap_items WHERE proyecto_id = p.id AND archived_at IS NULL
               AND coalesce(estado, 'por_hacer') = col.clave ORDER BY orden NULLS LAST, created_at LOOP
        b := b || jsonb_build_array(jsonb_build_object(
          'id', pg_temp.rb_id(), 'tipo', 'tarea', 'hecho', col.clave = 'hecho',
          'texto', coalesce(t.icono || ' ', '') || coalesce(t.titulo, '')
                   || CASE WHEN t.vence_el IS NOT NULL THEN ' · vence el ' || to_char(t.vence_el, 'DD/MM/YYYY') ELSE '' END
                   || CASE WHEN coalesce(t.prioridad, '') NOT IN ('', 'media') THEN ' · prioridad ' || t.prioridad ELSE '' END));
        b := b || pg_temp.rb_parrafos(t.resumen);
        -- The card's own notes: text, images, videos.
        IF jsonb_typeof(t.bloques) = 'array' THEN
          FOR x IN SELECT e FROM jsonb_array_elements(t.bloques) AS e LOOP
            IF x.e->>'tipo' = 'texto' AND coalesce(trim(x.e->>'texto'), '') <> '' THEN
              b := b || pg_temp.rb_parrafos(x.e->>'texto');
            ELSIF x.e->>'tipo' = 'imagen' AND coalesce(x.e->>'url', '') <> '' THEN
              b := b || jsonb_build_array(pg_temp.rb_img(x.e->>'url', x.e->>'pie'));
            ELSIF x.e->>'tipo' = 'video' AND coalesce(x.e->>'url', '') <> '' THEN
              b := b || jsonb_build_array(jsonb_build_object('id', pg_temp.rb_id(), 'tipo', 'medio',
                        'medio', 'video', 'url', x.e->>'url', 'pie', coalesce(x.e->>'pie', '')));
            END IF;
          END LOOP;
        END IF;
        -- Files attached to the card.
        FOR x IN SELECT url, nombre, mime, bytes FROM archivos
                 WHERE tarea_id = t.id AND archived_at IS NULL ORDER BY created_at LOOP
          b := b || jsonb_build_array(pg_temp.rb_archivo(x.url, x.nombre, x.mime, x.bytes));
        END LOOP;
      END LOOP;
    END LOOP;
    PERFORM pg_temp.crear_pagina(p, 'tareas', 'Tareas de ' || p.titulo, b, '✅');

    -- ── 3. PUBLICACIONES DEL MURO ──────────────────────────────────────────
    b := '[]'::jsonb;
    FOR x IN SELECT title, body, media, created_at FROM publications
             WHERE proyecto_id = p.id AND archived_at IS NULL AND deleted_at IS NULL
             ORDER BY created_at DESC LOOP
      b := b || jsonb_build_array(pg_temp.rb('titulo2',
             coalesce(nullif(trim(x.title), ''), 'Publicación') || ' · ' || to_char(x.created_at, 'DD/MM/YYYY')));
      b := b || pg_temp.rb_parrafos(x.body);
      IF jsonb_typeof(x.media) = 'array' THEN
        b := b || coalesce((
          SELECT jsonb_agg(CASE WHEN m->>'tipo' = 'video'
                   THEN jsonb_build_object('id', pg_temp.rb_id(), 'tipo', 'medio', 'medio', 'video', 'url', m->>'url', 'pie', '')
                   ELSE pg_temp.rb_img(m->>'url', '') END)
          FROM jsonb_array_elements(x.media) m WHERE coalesce(m->>'url', '') <> ''), '[]'::jsonb);
      END IF;
      b := b || jsonb_build_array(jsonb_build_object('id', pg_temp.rb_id(), 'tipo', 'separador'));
    END LOOP;
    PERFORM pg_temp.crear_pagina(p, 'muro', 'Publicaciones de ' || p.titulo, b, '📣');

    -- ── 4. LO DEMÁS: ENLACES A LO QUE NO ES UNA PÁGINA ─────────────────────
    -- Diagrams, maps, products, tables and events keep living in their own
    -- tools; the folder keeps a signpost to each so nothing is lost from view.
    b := '[]'::jsonb;
    IF EXISTS (SELECT 1 FROM knowledge_graphs WHERE proyecto_id = p.id AND archived_at IS NULL AND deleted_at IS NULL) THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Esquemas'));
      FOR x IN SELECT title, slug, id FROM knowledge_graphs WHERE proyecto_id = p.id AND archived_at IS NULL AND deleted_at IS NULL ORDER BY created_at LOOP
        b := b || jsonb_build_array(pg_temp.rb('lista', pg_temp.enlace(x.title, '/esquemas/' || coalesce(x.slug, x.id))));
      END LOOP;
    END IF;
    IF EXISTS (SELECT 1 FROM user_maps WHERE proyecto_id = p.id AND archived_at IS NULL AND deleted_at IS NULL) THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Mapas'));
      FOR x IN SELECT title, slug, id FROM user_maps WHERE proyecto_id = p.id AND archived_at IS NULL AND deleted_at IS NULL ORDER BY created_at LOOP
        b := b || jsonb_build_array(pg_temp.rb('lista', pg_temp.enlace(x.title, '/mapas/' || coalesce(x.slug, x.id))));
      END LOOP;
    END IF;
    IF EXISTS (SELECT 1 FROM products WHERE proyecto_id = p.id AND archived_at IS NULL) THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Productos'));
      FOR x IN SELECT name, id FROM products WHERE proyecto_id = p.id AND archived_at IS NULL ORDER BY created_at LOOP
        b := b || jsonb_build_array(pg_temp.rb('lista', pg_temp.enlace(x.name, '/mercado?producto=' || x.id)));
      END LOOP;
    END IF;
    IF EXISTS (SELECT 1 FROM bd_tablas WHERE proyecto_id = p.id AND archived_at IS NULL AND deleted_at IS NULL) THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Tablas'));
      FOR x IN SELECT id, titulo FROM bd_tablas WHERE proyecto_id = p.id AND archived_at IS NULL AND deleted_at IS NULL ORDER BY orden, created_at LOOP
        -- The live table itself, not a link: the editor's database block.
        b := b || jsonb_build_array(jsonb_build_object('id', pg_temp.rb_id(), 'tipo', 'basedatos',
                  'tabla_id', x.id, 'texto', coalesce(x.titulo, '')));
      END LOOP;
    END IF;
    IF EXISTS (SELECT 1 FROM eventos WHERE proyecto_id = p.id AND archived_at IS NULL) THEN
      b := b || jsonb_build_array(pg_temp.rb('titulo2', 'Eventos'));
      FOR x IN SELECT titulo, inicio, lugar FROM eventos WHERE proyecto_id = p.id AND archived_at IS NULL ORDER BY inicio LOOP
        b := b || jsonb_build_array(pg_temp.rb('lista',
          to_char(x.inicio, 'DD/MM/YYYY HH24:MI') || ' — ' || coalesce(x.titulo, '')
          || CASE WHEN coalesce(x.lugar, '') <> '' THEN ' (' || x.lugar || ')' ELSE '' END));
      END LOOP;
    END IF;
    PERFORM pg_temp.crear_pagina(p, 'mas', 'Más de ' || p.titulo, b, '🔗');

  END LOOP;
END $$;
