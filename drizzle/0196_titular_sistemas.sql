-- 2026-11-11 (Eugenio): the home headline also says the projects optimise humanity's systems.
UPDATE knowledge_windows
   SET config = jsonb_set(config, '{sitio,portada,titular}', to_jsonb('Impulsamos proyectos que optimizan los sistemas de la humanidad y resuelven sus grandes retos.'::text)), version = version + 1
 WHERE id = 'KWMUO4S4V663' AND config->'sitio'->'portada' IS NOT NULL;
