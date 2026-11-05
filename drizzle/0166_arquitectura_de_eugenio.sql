-- 2026-11-05 (Eugenio): «añade a eugenio@lighthumanity.org para que le aparezca
-- en sus páginas» — la Arquitectura de la Comunidad Circular Humana
-- (`/arquitectura`, el mundo 3D editable).
--
-- Same pattern as 0165 (Aeromóvil Gota): the sidebar lists the pages inside a
-- project (`/api/menu/arbol`), so two rows are needed:
--   1. The project «Comunidad Circular Humana», owned by Eugenio.
--   2. The page «Arquitectura · Comunidad Circular Humana» inside it, owned by
--      Eugenio, with `config.ruta = '/arquitectura'`: the menu opens the 3D tool
--      instead of the document editor (see `src/server/menu.ts`).
--
-- Guarded by the account existing (a clean database does nothing instead of
-- failing) and never overwrites: if the project or the page exist, they stay.
DO $$
DECLARE
  u text;
  proy text := 'PRY_COMUNIDAD_CIRCULAR_HUMANA';
BEGIN
  SELECT id INTO u FROM users WHERE lower(email) = 'eugenio@lighthumanity.org' LIMIT 1;
  IF u IS NULL THEN RETURN; END IF;

  INSERT INTO proyectos (id, titulo, descripcion, slug, creador_user_id, publico, icono, created_by, updated_by)
  SELECT proy, 'Comunidad Circular Humana',
         'Diseño urbanístico fractal: nido, familia, comunidad, pueblo y ciudad con la misma regla. Mundo 3D editable, medidas y planos CAD en humanity.wiki/arquitectura.',
         'comunidad-circular-humana', u, true, 'lucide:Landmark', u, u
  WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = proy OR slug = 'comunidad-circular-humana');

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id)
  VALUES (
    'KW_ARQUITECTURA_COMUNIDAD', 'Arquitectura · Comunidad Circular Humana', 'pagina',
    jsonb_build_object('ruta', '/arquitectura', 'icono', 'lucide:Landmark', 'bloques', '[]'::jsonb),
    true, u, false, u, u,
    (SELECT id FROM proyectos WHERE id = proy AND creador_user_id = u)
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
