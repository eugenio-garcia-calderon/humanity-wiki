-- 2026-11-05 (Eugenio): «haz que la página de aeromóvil sea de la propiedad
-- de eugenio@lighthumanity.org y que aparezca en su menú lateral como página».
--
-- El menú lateral enseña las páginas dentro de su proyecto (`/api/menu/arbol`),
-- así que hacen falta dos filas:
--   1. El proyecto «Aeromóvil Gota», de Eugenio.
--   2. La página «Aeromóvil Gota» dentro de él, de Eugenio, con
--      `config.ruta = '/aeromovil'`: el menú lleva a la página propia del
--      Aeromóvil en vez de abrir el editor de documentos.
--
-- Ser el creador de esa página es lo que hace a Eugenio dueño del Aeromóvil:
-- `src/server/aeromovil.ts` lee `creator_user_id` de esta fila para decidir
-- quién marca las tareas como hechas o descartadas.
--
-- Todo va condicionado a que exista la cuenta: en una base sin ella (una copia
-- limpia) no hace nada en vez de fallar. Y no pisa nada: si el proyecto o la
-- página ya existen, se quedan como están.
DO $$
DECLARE
  u text;
  proy text := 'PRY_AEROMOVIL_GOTA';
BEGIN
  SELECT id INTO u FROM users WHERE lower(email) = 'eugenio@lighthumanity.org' LIMIT 1;
  IF u IS NULL THEN RETURN; END IF;

  INSERT INTO proyectos (id, titulo, descripcion, slug, creador_user_id, publico, icono, created_by, updated_by)
  SELECT proy, 'Aeromóvil Gota',
         'Vehículo de pedaleo asistido para tres en tándem, con carenado en gota, paneles solares y ruedas laterales basculantes. Diseño, tareas, plan y planos en humanity.wiki/aeromovil.',
         'aeromovil-gota', u, true, 'lucide:Car', u, u
  WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = proy OR slug = 'aeromovil-gota');

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id)
  VALUES (
    'KW_AEROMOVIL_GOTA', 'Aeromóvil Gota', 'pagina',
    jsonb_build_object('ruta', '/aeromovil', 'icono', 'lucide:Car', 'bloques', '[]'::jsonb),
    true, u, false, u, u,
    (SELECT id FROM proyectos WHERE id = proy AND creador_user_id = u)
  )
  ON CONFLICT (id) DO NOTHING;
END $$;
