-- 2026-11-10 (Eugenio): lighthumanity.org stops redirecting and becomes the English replica of
-- luzhumanidad.com (rule 11 of the Constitution, src/server/traducciones.ts). Its translations
-- are already loaded in `traducciones_textos`.
UPDATE dominios_paginas
   SET redirigir_a = NULL, entidad_tipo = 'pagina', entidad_id = 'KWMUO4S4V663', pagina_id = 'KWMUO4S4V663',
       propietario_user_id = (SELECT creator_user_id FROM knowledge_windows WHERE id = 'KWMUO4S4V663'), updated_at = now()
 WHERE dominio = 'lighthumanity.org';
