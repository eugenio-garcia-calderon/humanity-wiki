-- ============================================================================
-- UN PROYECTO ES UNA PÁGINA (2026-09-30)
-- ============================================================================
-- Eugenio: «fusiona el creador de páginas y el creador de proyectos; una página
-- puede ser un proyecto o una publicación o una web. Pero mantén solo una
-- herramienta, la del creador de páginas con el estilo de Notion donde
-- añadimos bloques, y que luego eso lo podemos compartir y conectar un dominio».
-- Y sobre los proyectos que ya existen: «convertirlos en páginas».
--
-- ── QUÉ CAMBIA Y QUÉ NO ────────────────────────────────────────────────────
-- La tabla `proyectos` SE QUEDA: de ella cuelgan las tarjetas del tablero
-- (roadmap_items), las ramas, la galería, los presupuestos, y el `proyecto_id`
-- de diez tablas más. Lo que cambia es la PUERTA: cada proyecto tiene desde hoy
-- una página (`pagina_id`) que es donde se ve y se edita, con el tablero como
-- un bloque más entre el texto. El proyecto pasa a ser «la página que tiene un
-- tablero». Crear un proyecto es crear una página y ponerle un tablero.
--
-- ── LOS QUE YA EXISTEN ─────────────────────────────────────────────────────
-- A cada proyecto vivo sin página se le crea una: mismo título, mismo icono,
-- misma portada, misma privacidad y mismo dueño; dentro, la descripción, la
-- visión y el bloque del tablero. La página nace DENTRO del propio proyecto
-- (`proyecto_id`), así que en la lista de páginas aparece en su carpeta.
--
-- Sin `slug` a propósito: el proyecto ya tiene el suyo y `compartir` resuelve
-- una dirección mirando las dos tablas; darle a la página el mismo slug sería
-- inventar un choque. Compartir la página le pondrá el suyo cuando toque.
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS pagina_id text REFERENCES knowledge_windows(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS proyectos_pagina_id_idx ON proyectos (pagina_id);

DO $$
DECLARE
  p RECORD;
  nuevo_id text;
  bloques jsonb;
BEGIN
  FOR p IN
    SELECT id, titulo, descripcion, vision, icono, portada_url, publico, creador_user_id
    FROM proyectos
    WHERE pagina_id IS NULL AND archived_at IS NULL AND deleted_at IS NULL
  LOOP
    nuevo_id := 'KW' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 14));
    bloques := '[]'::jsonb;
    IF coalesce(trim(p.descripcion), '') <> '' THEN
      bloques := bloques || jsonb_build_array(jsonb_build_object('id', 'B' || substr(md5(random()::text), 1, 8), 'tipo', 'parrafo', 'texto', p.descripcion));
    END IF;
    IF coalesce(trim(p.vision), '') <> '' THEN
      bloques := bloques || jsonb_build_array(jsonb_build_object('id', 'B' || substr(md5(random()::text), 1, 8), 'tipo', 'cita', 'texto', p.vision));
    END IF;
    bloques := bloques || jsonb_build_array(jsonb_build_object('id', 'B' || substr(md5(random()::text), 1, 8), 'tipo', 'tablero', 'entityId', p.id, 'pubTitulo', p.titulo));

    INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id)
    VALUES (
      nuevo_id, p.titulo, 'pagina',
      jsonb_strip_nulls(jsonb_build_object('bloques', bloques, 'icono', p.icono, 'portada', p.portada_url)),
      coalesce(p.publico, false), p.creador_user_id, false, p.creador_user_id, p.creador_user_id, p.id
    );
    UPDATE proyectos SET pagina_id = nuevo_id WHERE id = p.id;
  END LOOP;
END $$;
