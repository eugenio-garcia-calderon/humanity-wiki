-- 2026-11-15 (Eugenio): «POLITICA. Así se debe llamar ahora en vez de observatorio
-- de polarización política», and later the same day: «deja la parte de observatorio de
-- polarización política como un apartado de la web general llamada POLITICA». So the
-- page is «Política» and the original five chapters are its first section
-- («Apartado 1 · Observatorio de Polarización Política»). The page gains two chapters: 6 · Geometrías (each party
-- as a shape over eight aspects of immigration and of public vs private services, and
-- the ideal circle) and 7 · Decidir por temas (a direct-democracy prototype). Words and
-- sources moves to chapter 8.
--
-- Renames the project created by 0194 and renamed by 0200 (`KWMOBSPOLARIZ01`) and its
-- row in «Proyectos». The address stays `/observatorio-de-polarizacion/espana`, so no
-- link breaks. Every statement only acts if the text is still the one an earlier
-- migration wrote (nobody edited it in the editor since) and bumps `version` so the
-- collaborative copy (pagina_yjs) does not write the old text back.

UPDATE knowledge_windows
   SET title = 'Política',
       version = version + 1
 WHERE id = 'KWMOBSPOLARIZ01'
   AND title = 'Observatorio de Polarización Política';

UPDATE knowledge_windows
   SET config = jsonb_set(config, '{bloques,2,alt}', to_jsonb('Portada de Política: siete formas de mirar una sociedad dividida y una de decidir juntos.'::text), false),
       version = version + 1
 WHERE id = 'KWMOBSPOLARIZ01'
   AND config->'bloques'->2->>'alt' = 'Portada del Observatorio de Polarización Política: seis formas de mirar una sociedad dividida.';

UPDATE knowledge_windows
   SET config = jsonb_set(config, '{subtitulo}', to_jsonb('Cómo se polariza España, qué cuida y qué abandona cada partido, y una propuesta para decidir por temas con datos'::text), false),
       version = version + 1
 WHERE id = 'KWMOBSPOLARIZ01'
   AND config->>'subtitulo' = 'Cómo se polariza España: el estudio real del CIS, cien años de historia, las miradas de cada bando, doce perfiles con sus líderes y la escalera que lleva del desacuerdo al abismo';

UPDATE knowledge_windows
   SET config = jsonb_set(config, '{bloques,0,texto}',
         to_jsonb(replace(config->'bloques'->0->>'texto',
           'Un observatorio interactivo de la polarización política en España, en seis capítulos.',
           'Política es una página interactiva sobre la política en España. Su primer apartado es el Observatorio de Polarización Política, en cinco capítulos.')), false),
       version = version + 1
 WHERE id = 'KWMOBSPOLARIZ01'
   AND config->'bloques'->0->>'id' = 'Bobspolariz01'
   AND config->'bloques'->0->>'texto' LIKE 'Un observatorio interactivo de la polarización política en España, en seis capítulos.%';

UPDATE knowledge_windows
   SET config = jsonb_set(config, '{bloques,1,texto}',
         to_jsonb((config->'bloques'->1->>'texto') || ' El segundo apartado, Geometrías y decisión directa, muestra a cada partido como una figura, con lo que cuida y lo que abandona en inmigración y en servicios públicos, frente a un círculo que cuidaría de todo, y propone una democracia directa: ver los datos de cada materia y decidir subir, bajar, abrir o cerrar.'), false),
       version = version + 1
 WHERE id = 'KWMOBSPOLARIZ01'
   AND config->'bloques'->1->>'id' = 'Bobspolariz02'
   AND config->'bloques'->1->>'texto' LIKE '%y las fuentes, una a una.';

UPDATE bd_filas
   SET valores = jsonb_set(valores, '{BDCMUOOFFNJE1A5}', to_jsonb('Política'::text))
 WHERE id = 'BDFOBSPOLARIZ01'
   AND valores->>'BDCMUOOFFNJE1A5' = 'Observatorio de Polarización Política';
