-- 2026-11-12 (Eugenio): «llamado Observatorio de Polarización Política».
--
-- Renames the project created by 0194: the page title (what the card, the menu
-- and the browser tab show) and the «Nombre» cell of its row in «Proyectos».
-- The address stays `/observatorio-de-polarizacion/espana`, so no link breaks.
-- Only touches them if they still carry the old name, and bumps `version` so
-- the collaborative copy (pagina_yjs) does not write the old title back.
UPDATE knowledge_windows
   SET title = 'Observatorio de Polarización Política',
       config = jsonb_set(config, '{bloques,2,alt}', to_jsonb('Portada del Observatorio de Polarización Política: seis formas de mirar una sociedad dividida.'::text), false),
       version = version + 1
 WHERE id = 'KWMOBSPOLARIZ01'
   AND title = 'Observatorio de Polarización';

UPDATE bd_filas
   SET valores = jsonb_set(valores, '{BDCMUOOFFNJE1A5}', to_jsonb('Observatorio de Polarización Política'::text))
 WHERE id = 'BDFOBSPOLARIZ01'
   AND valores->>'BDCMUOOFFNJE1A5' = 'Observatorio de Polarización';
