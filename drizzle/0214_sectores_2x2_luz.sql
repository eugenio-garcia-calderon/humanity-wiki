-- 2026-11-13 (Eugenio), luzhumanidad.com: «oculta la sección de proyectos que nos inspiran… también
-- la de dónde trabajamos. Y las tarjetas de innovación por sectores, en una matriz de 2 × 2: arriba
-- la movilidad y a la derecha la energía; abajo la política y socioeconómico, y a la derecha la
-- vivienda y comunidad». Se ordenan los sectores (cada uno conserva su color, que va por su icono) y
-- se apagan las dos secciones con `mostrarInspiran` y `mostrarMapa` (sus datos no se tocan: poner
-- `true` las devuelve). Se puede aplicar dos veces.
UPDATE knowledge_windows w
SET config = jsonb_set(jsonb_set(jsonb_set(w.config,
      '{sitio,sectores}',
      (SELECT jsonb_agg(s ORDER BY CASE s->>'icono'
         WHEN 'Movilidad' THEN 1 WHEN 'Energía' THEN 2 WHEN 'Economía' THEN 3
         WHEN 'Vivienda' THEN 4 WHEN 'Educación' THEN 5 ELSE 6 END)
       FROM jsonb_array_elements(w.config->'sitio'->'sectores') s)),
    '{sitio,mostrarInspiran}', 'false'::jsonb),
  '{sitio,mostrarMapa}', 'false'::jsonb)
WHERE w.id = 'KWMUO4S4V663' AND jsonb_typeof(w.config->'sitio'->'sectores') = 'array';
