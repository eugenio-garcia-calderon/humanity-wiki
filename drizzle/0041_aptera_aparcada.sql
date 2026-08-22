-- ============================================================================
-- 0041 — Tu Aptera aparcada, y convertida en proyecto (2026-08-19)
-- ============================================================================
-- Petición de Eugenio: «hazme una réplica de mi vehículo volador y déjalo
-- aparcado como el camión como un objeto que no se mueve y conviértelo en un
-- proyecto con tareas pendientes».
--
-- Tres piezas:
--   1. El proyecto «Aptera», con los mismos grupos que el Camión camperizado.
--   2. Sus tarjetas pendientes, como punto de partida para que las edites.
--   3. La nave aparcada al lado del camión, que ADEMÁS es el portal de ese
--      proyecto: atravesarla te mete dentro sin dejar de ser una nave.
--
-- Todo va condicionado a que exista el usuario: si esta migración corre en una
-- base sin él (una copia limpia), no hace nada en vez de reventar.

DO $$
DECLARE
  u text := 'U_ADMIN_EUGENIO';
  proy text := 'PRY_APTERA_EUGENIO';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = u) THEN RETURN; END IF;

  -- 1. El proyecto -----------------------------------------------------------
  INSERT INTO proyectos (id, titulo, descripcion, slug, creador_user_id, grupos, publico, created_by, updated_by)
  VALUES (
    proy,
    'Aptera',
    'Mi vehículo volador: un triciclo solar con dos brazos en V y un rotor en cada punta. Aparcado en la aldea, al lado del camión.',
    'aptera',
    u,
    '[{"id":"producto","color":"#7c3aed","label":"Producto"},
      {"id":"diseno","color":"#db2777","label":"Diseño"},
      {"id":"tecnico","color":"#0284c7","label":"Técnico"},
      {"id":"contenido","color":"#16a34a","label":"Contenido"},
      {"id":"personas","color":"#d97706","label":"Personas"},
      {"id":"dinero","color":"#475569","label":"Dinero"}]'::jsonb,
    true, u, u
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Las tarjetas pendientes ----------------------------------------------
  -- Un punto de partida, no una verdad: están para que las cambies. Todas
  -- nacen «por_hacer» porque eso es lo que pediste — tareas PENDIENTES.
  INSERT INTO roadmap_items (id, grupo, titulo, resumen, estado, prioridad, autor_user_id, bloques, orden, proyecto_id, created_by, updated_by)
  SELECT * FROM (VALUES
    ('RI_APT_01', 'producto', 'Decidir para qué es', 'Transporte propio, prototipo para enseñar, o pieza de la aldea. De esto cuelga todo lo demás.', 'por_hacer', 'alta', u, '[]'::jsonb, 0, proy, u, u),
    ('RI_APT_02', 'diseno',   'Medidas reales del chasis', 'Largo, ancho y alto con las alas plegadas y desplegadas. Sin esto no se puede calcular nada.', 'por_hacer', 'alta', u, '[]'::jsonb, 1, proy, u, u),
    ('RI_APT_03', 'diseno',   'Dónde aparca', 'Necesita sitio con las alas plegadas y espacio libre encima para despegar.', 'por_hacer', 'media', u, '[]'::jsonb, 2, proy, u, u),
    ('RI_APT_04', 'tecnico',  'Autonomía y batería', 'Cuánto vuela con una carga y con qué se recarga. La DJI Power 1000 V2 del Mercado da 1024 Wh.', 'por_hacer', 'alta', u, '[]'::jsonb, 3, proy, u, u),
    ('RI_APT_05', 'tecnico',  'Los cuatro rotores', 'Empuje necesario, redundancia si falla uno, y ruido en despegue.', 'por_hacer', 'alta', u, '[]'::jsonb, 4, proy, u, u),
    ('RI_APT_06', 'tecnico',  'Panel solar del techo', 'Cuántos vatios entran de verdad al día y qué parte de un vuelo cubren.', 'por_hacer', 'media', u, '[]'::jsonb, 5, proy, u, u),
    ('RI_APT_07', 'tecnico',  'Qué dice la ley', 'Qué hace falta para volar esto legalmente en España: licencia, seguro, dónde sí y dónde no.', 'por_hacer', 'alta', u, '[]'::jsonb, 6, proy, u, u),
    ('RI_APT_08', 'contenido','Grabar el primer vuelo', 'Es la pieza que mejor cuenta el proyecto, y solo se puede grabar una vez.', 'por_hacer', 'media', u, '[]'::jsonb, 7, proy, u, u),
    ('RI_APT_09', 'personas', 'Quién sabe de esto', 'Buscar a alguien con horas de vuelo en multirrotor antes de decidir nada técnico.', 'por_hacer', 'media', u, '[]'::jsonb, 8, proy, u, u),
    ('RI_APT_10', 'dinero',   'Cuánto cuesta llegar al prototipo', 'Presupuesto hasta que despegue por primera vez, no hasta que esté terminado.', 'por_hacer', 'alta', u, '[]'::jsonb, 9, proy, u, u)
  ) AS v(id, grupo, titulo, resumen, estado, prioridad, autor_user_id, bloques, orden, proyecto_id, created_by, updated_by)
  WHERE NOT EXISTS (SELECT 1 FROM roadmap_items WHERE proyecto_id = proy);

  -- 3. La nave aparcada, que es el portal del proyecto ----------------------
  -- Al lado del camión camperizado (que está sobre −9,6 / −21,8).
  INSERT INTO game_world_items (id, user_id, tipo, modelo, nombre, x, z, rot, escala, portal_proyecto_id)
  VALUES ('WM_APTERA_APARCADA', u, 'prop', 'aptera', 'Aptera', -16.5, -20.5, 0.6, 1, proy)
  ON CONFLICT (id) DO NOTHING;
END $$;
