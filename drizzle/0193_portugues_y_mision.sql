-- 2026-11-10 (Eugenio): the mission as the home headline, and the Portuguese replica of
-- luzhumanidad.com at pt.lighthumanity.org (rule 11 of the Constitution, src/server/traducciones.ts).
UPDATE knowledge_windows
   SET config = jsonb_set(config, '{sitio,portada,titular}', to_jsonb('Impulsamos proyectos que resuelven los grandes retos del ser humano.'::text)), version = version + 1
 WHERE id = 'KWMUO4S4V663' AND config->'sitio'->'portada' IS NOT NULL;

INSERT INTO dominios_paginas (id, dominio, propietario_user_id, pagina_id, entidad_tipo, entidad_id, estado)
SELECT 'DOMPTLIGHTHUMANITY', 'pt.lighthumanity.org', creator_user_id, id, 'pagina', id, 'pendiente'
  FROM knowledge_windows WHERE id = 'KWMUO4S4V663'
ON CONFLICT (dominio) DO NOTHING;
