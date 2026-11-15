-- 2026-11-15 (Eugenio): «Lo de votar por temas, llámalo así. En el menú y en el título».
-- Chapter 7 of «Política» is now «Votar por temas» and the second section is
-- «Geometrías y votar por temas». 0220 wrote the project page sentence that still says
-- «Geometrías y decisión directa … decidir subir, bajar, abrir o cerrar»; this rewrites
-- only that sentence, only if nobody has edited it since, and bumps `version` so the
-- collaborative copy (pagina_yjs) does not write the old text back.

UPDATE knowledge_windows
   SET config = jsonb_set(config, '{bloques,1,texto}',
         to_jsonb(replace(config->'bloques'->1->>'texto',
           'El segundo apartado, Geometrías y decisión directa, muestra a cada partido como una figura, con lo que cuida y lo que abandona en inmigración y en servicios públicos, frente a un círculo que cuidaría de todo, y propone una democracia directa: ver los datos de cada materia y decidir subir, bajar, abrir o cerrar.',
           'El segundo apartado, Geometrías y votar por temas, muestra a cada partido como una figura, con lo que cuida y lo que abandona en inmigración y en servicios públicos, frente a un círculo que cuidaría de todo, y propone votar por temas: ver cómo ha evolucionado cada dato y votar con un deslizador cuánto subir, bajar, abrir o cerrar.')), false),
       version = version + 1
 WHERE id = 'KWMOBSPOLARIZ01'
   AND config->'bloques'->1->>'id' = 'Bobspolariz02'
   AND config->'bloques'->1->>'texto' LIKE '%El segundo apartado, Geometrías y decisión directa, muestra a cada partido%';
