-- 2026-11-12 (Eugenio): «agrupa los proyectos de la página de inicio en sectores:
-- innovación en el sector de la movilidad, en el socioeconómico (la parte
-- política y económica), en el energético, en la educación, cultura y
-- conciencia (arte, educación, psicología), y si alguno se queda fuera, otras
-- innovaciones». And: «debajo de Luz Humanidad pon Evolución, Sistemas,
-- Humanidad, sin determinantes».
--
-- `sitio.sectores` of the root page: each sector names the categories (rows of
-- Sistemas, by name) whose projects it gathers (VistaProyectosSitio.tsx).
-- `sitio.eslogan` is the line under the name in the bar (CabeceraSitio.tsx);
-- `subtitulo` stays as the page's own subtitle, which the title and search
-- engines read. `version` goes up so the collaborative copy (pagina_yjs) does
-- not write the old config back.
UPDATE knowledge_windows
   SET config = jsonb_set(
         jsonb_set(config, '{sitio,sectores}', jsonb_build_array(
           jsonb_build_object('titulo', 'Innovación en el sector de la movilidad', 'icono', 'Movilidad',
             'areas', jsonb_build_array('Movilidad', 'Transporte')),
           jsonb_build_object('titulo', 'Innovación en el sector socioeconómico', 'icono', 'Economía',
             'areas', jsonb_build_array('Política', 'Economía', 'Sociología', 'Justicia', 'Trabajo', 'Demografía')),
           jsonb_build_object('titulo', 'Innovación en el sector energético', 'icono', 'Energía',
             'areas', jsonb_build_array('Energía')),
           jsonb_build_object('titulo', 'Innovación en educación, cultura y conciencia', 'icono', 'Educación',
             'areas', jsonb_build_array('Educación', 'Cultura', 'Arte', 'Conciencia', 'Psicología', 'Humanología'))
         )),
         '{sitio,eslogan}', to_jsonb('Evolución · Sistemas · Humanidad'::text)),
       version = version + 1
 WHERE id = 'KWMUO4S4V663' AND config ? 'sitio';

UPDATE knowledge_windows
   SET config = jsonb_set(config, '{sitio,sectorOtros}', to_jsonb('Otras innovaciones'::text)), version = version + 1
 WHERE id = 'KWMUO4S4V663' AND config ? 'sitio';
