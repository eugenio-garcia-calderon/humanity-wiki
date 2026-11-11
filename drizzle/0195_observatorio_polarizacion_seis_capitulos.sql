-- 2026-11-11 (Eugenio): the Observatorio de Polarización is reorganised into six
-- chapters (today's Spain with the CIS study, a hundred years, perceptions,
-- twelve profiles, from «us» to the enemy, words and sources). The self-test,
-- the «exit» chapter and the method chapter are gone, and there are now twelve
-- profiles instead of five plus two.
--
-- The page created by 0194 (`KWMOBSPOLARIZ01`) keeps the old card text, which
-- still promises a test. This rewrites its subtitle and its two text blocks.
-- It only acts if those blocks are still the ones 0194 wrote (nobody has edited
-- them in the editor since), and bumps `version` so the collaborative copy
-- (pagina_yjs) does not write the old config back.
UPDATE knowledge_windows
   SET config = config
         || jsonb_build_object(
              'subtitulo', 'Cómo se polariza España: el estudio real del CIS, cien años de historia, las miradas de cada bando, doce perfiles con sus líderes y la escalera que lleva del desacuerdo al abismo',
              'bloques', jsonb_build_array(
                jsonb_build_object('id', 'Bobspolariz01', 'tipo', 'parrafo', 'texto',
                  'Un observatorio interactivo de la polarización política en España, en seis capítulos. Empieza por un estudio real, el barómetro del CIS de septiembre de 2026, y un modelo que muestra qué se mueve primero cuando sube la presión del grupo, las ideas o la temperatura, y lo que cuesta cada fase. Sigue con cien años de historia, de 1923 a 2026, con la forma de la sociedad en cada etapa.'),
                jsonb_build_object('id', 'Bobspolariz02', 'tipo', 'parrafo', 'texto',
                  'Después, las miradas: cómo nombra cada bando a los demás y cómo cuenta un mismo hecho. Doce perfiles, de la extrema izquierda a la extrema derecha, más el anarcocomunismo, el socialismo patriótico, el libertarismo, el anarcocapitalismo y tres independentismos, con su psicología, su relato, su contradicción y sus líderes. Los círculos de pertenencia, la escalera del conflicto, el origen de etiquetas como fascista o comunista y las fuentes, una a una.'),
                config->'bloques'->2
              )
            ),
       version = version + 1
 WHERE id = 'KWMOBSPOLARIZ01'
   AND config->'bloques'->0->>'id' = 'Bobspolariz01'
   AND config->'bloques'->1->>'texto' LIKE 'Cinco tipos ideales%'
   AND jsonb_array_length(config->'bloques') = 3;
