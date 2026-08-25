-- ============================================================================
-- IMÁGENES: LA QUINTA FORMA, QUE ESTABA A CERO (2026-08-25)
-- ============================================================================
-- Eugenio pidió cinco formas —mapas, imágenes, vídeos, textos y gráficas— y la
-- imagen era la única que no tenía ni una. Quedó dicho así en la entrega
-- anterior en vez de disimularlo, y esto es cerrarlo.
--
-- ── DE WIKIMEDIA COMMONS, Y NO DE UNA BÚSQUEDA DE IMÁGENES ─────────────────
-- Porque aquí **la licencia es un dato y no una suposición**. Cada fichero trae
-- su licencia y su autor en la propia respuesta de la API, así que se guardan
-- al lado de la imagen y se enseñan con ella. Una foto sin licencia
-- comprobable no es contenido: es un problema esperando a que alguien lo mire.
--
-- Y no hace falta clave de nadie. De las fuentes que faltaban, era la única que
-- no dependía de que se active o se pague algo.
--
-- ── ELEGIDAS A MANO, Y SE NOTA EN CUÁLES ───────────────────────────────────
-- El script (`scripts/agregador/imagenes-commons.mjs`) trajo 89 candidatas de
-- doce búsquedas y **no elige**: buscar «electric scooter» devuelve patinetes,
-- motos y cortacéspedes. Estas catorce están miradas una por una, y tres de
-- ellas no son la foto bonita del catálogo:
--
--   · el triciclo eléctrico **de 1881**, que coloca todo lo demás — esto no es
--     una novedad, es una idea que perdió contra el motor de explosión y ha
--     vuelto cuando la batería la ha hecho viable;
--   · el patinete de París **colgado de una farola**, porque una colección que
--     sólo enseñe flotas ordenadas cuenta la mitad de lo que pasó — y París
--     acabó votando su retirada;
--   · el **rickshaw de Uzbekistán**, que es dónde está el volumen de verdad
--     del tema y no se parece a nada de lo que se vende en Europa.

-- ── DÓNDE VIVE LA IMAGEN ────────────────────────────────────────────────────
-- `url` sigue siendo A DÓNDE SE VA al pulsar —la página de Commons, con su
-- autor y su licencia— y `medio_url` es LO QUE SE PINTA. Son dos cosas
-- distintas y meterlas en la misma columna obligaría a elegir entre enseñar la
-- foto o poder atribuirla.
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS medio_url text;
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS licencia text;
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS autor text;

-- La atribución no es un adorno: CC BY-SA obliga a nombrar al autor y a decir
-- la licencia. Guardarlos en su columna es lo que permite cumplirlo en la
-- pantalla sin que nadie tenga que acordarse.

INSERT INTO contenido_agregado
  (id, origen, formato, url, medio_url, origen_id, titulo, fuente, licencia, autor,
   idioma, publicado_el, nota_ia, nota_modelo, nota_el, calidad, calidad_por, estado,
   comprobado_el, puesto_por) VALUES
  ('AGR_MEL_IMG_001', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:TIER_mobility_ONO_electric_cargo_bike_Berlin_2021.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/9/9a/TIER_mobility_ONO_electric_cargo_bike_Berlin_2021.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail_unscaled',
   'TIER mobility ONO electric cargo bike Berlin 2021',
   'Un ONO de reparto en una calle de Berlín',
   'Wikimedia Commons', 'CC BY-SA 3.0', 'Pedant01',
   NULL, '2021-09-30'::date,
   'El vehículo del que habla media colección, en la calle y con su caja cargada. Enseña de un vistazo lo que un párrafo tarda en explicar: que esto ocupa el sitio de una furgoneta y no el de una bicicleta.',
   'claude-opus-5', now(), 84, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_002', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:2021-05-18_Bicicleta_el%C3%A8ctrica_de_c%C3%A0rrega_a_Alaqu%C3%A0s.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/2021-05-18_Bicicleta_el%C3%A8ctrica_de_c%C3%A0rrega_a_Alaqu%C3%A0s.jpg/1280px-2021-05-18_Bicicleta_el%C3%A8ctrica_de_c%C3%A0rrega_a_Alaqu%C3%A0s.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   '2021-05-18 Bicicleta elèctrica de càrrega a Alaquàs',
   'Bicicleta eléctrica de carga en Alaquàs (Valencia)',
   'Wikimedia Commons', 'CC BY-SA 4.0', 'Pacopac',
   NULL, '2021-05-18'::date,
   'La única imagen española de la tanda, y la que contesta a «esto es cosa de Ámsterdam». Es un municipio valenciano de 30.000 habitantes.',
   'claude-opus-5', now(), 80, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_003', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:DHL_postal_cargo_bike_Amsterdam.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/DHL_postal_cargo_bike_Amsterdam.jpg/1280px-DHL_postal_cargo_bike_Amsterdam.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'DHL postal cargo bike Amsterdam',
   'Bicicleta de reparto postal de DHL en Ámsterdam',
   'Wikimedia Commons', 'CC BY-SA 3.0', 'Brbbl',
   NULL, '2011-11-28'::date,
   'Un operador logístico grande usando esto como flota, no como prueba piloto. Es el dato que separa el reparto en bici de una idea simpática.',
   'claude-opus-5', now(), 78, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_004', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Riese_%26_Mueller_Delite_(IMG_20220504_090150_1).jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Riese_%26_Mueller_Delite_%28IMG_20220504_090150_1%29.jpg/1280px-Riese_%26_Mueller_Delite_%28IMG_20220504_090150_1%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Riese & Mueller Delite (IMG 20220504 090150 1)',
   'Una Riese & Müller Delite',
   'Wikimedia Commons', 'CC BY-SA 4.0', 'Matti Blume',
   NULL, '2022-05-04'::date,
   'La marca cuya fábrica se recorre en dos de los vídeos, aquí como producto acabado. Sirve para poner cara a lo que allí se está montando.',
   'claude-opus-5', now(), 74, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_005', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Cowboy_3_pedelec_in_a_forest.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Cowboy_3_pedelec_in_a_forest.jpg/1280px-Cowboy_3_pedelec_in_a_forest.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Cowboy 3 pedelec in a forest',
   'Una Cowboy 3, bicicleta de pedaleo asistido',
   'Wikimedia Commons', 'CC BY-SA 4.0', 'Elmschrat',
   NULL, '2021-06-06'::date,
   'El aspecto que tiene hoy una bici eléctrica de ciudad: sin batería colgando ni cables a la vista. Que no se note es precisamente lo que la ha vuelto vendible.',
   'claude-opus-5', now(), 68, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_006', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Sunstar_electric_fodling_bike.JPG',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Sunstar_electric_fodling_bike.JPG/1280px-Sunstar_electric_fodling_bike.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Sunstar electric fodling bike',
   'Bicicleta eléctrica plegable',
   'Wikimedia Commons', 'CC BY-SA 3.0', 'Clément Bucco-Lechat',
   NULL, '2012-10-07'::date,
   'El formato que resuelve el problema del portal y del tren, que es el que decide la compra en una ciudad densa más que la autonomía.',
   'claude-opus-5', now(), 66, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_007', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Seattle_(WA,_USA),_Pike_Street,_E-Scooter_--_2022_--_1460.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Seattle_%28WA%2C_USA%29%2C_Pike_Street%2C_E-Scooter_--_2022_--_1460.jpg/1280px-Seattle_%28WA%2C_USA%29%2C_Pike_Street%2C_E-Scooter_--_2022_--_1460.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Seattle (WA, USA), Pike Street, E-Scooter -- 2022 -- 1460',
   'Patinete eléctrico en Pike Street, Seattle',
   'Wikimedia Commons', 'CC BY-SA 4.0', 'Dietmar Rabich',
   NULL, NULL,
   'Un patinete en su sitio natural: la calzada de una ciudad con carril. Seattle es además la ciudad cuyos datos abiertos de patinete están en esta misma colección.',
   'claude-opus-5', now(), 70, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_008', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Vandalized_Lime_scooter_on_lamppost_in_Paris.jpeg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Vandalized_Lime_scooter_on_lamppost_in_Paris.jpeg/1280px-Vandalized_Lime_scooter_on_lamppost_in_Paris.jpeg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Vandalized Lime scooter on lamppost in Paris',
   'Un patinete Lime colgado de una farola en París',
   'Wikimedia Commons', 'CC BY-SA 4.0', 'Akela NDE ( talk )',
   NULL, '2021-09-23'::date,
   'El reverso, y por eso está aquí. París acabó votando la retirada de los patinetes compartidos en 2023; una colección que solo enseñara flotas ordenadas estaría contando la mitad.',
   'claude-opus-5', now(), 76, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_009', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Emmy_Sharing_Electric_Scooters_Parking_Munich.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Emmy_Sharing_Electric_Scooters_Parking_Munich.jpg/1280px-Emmy_Sharing_Electric_Scooters_Parking_Munich.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Emmy Sharing Electric Scooters Parking Munich',
   'Flota de motos compartidas aparcada en Múnich',
   'Wikimedia Commons', 'CC BY-SA 4.0', 'Nikolay Komarov',
   NULL, '2019-09-28'::date,
   'El aparcamiento agrupado es la respuesta que dieron las ciudades al problema de la acera. Es la solución que se discute en los informes del ITF de esta misma lista.',
   'claude-opus-5', now(), 64, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_010', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Revel_electric_moped_IMG_4875_(50522806976).jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Revel_electric_moped_IMG_4875_%2850522806976%29.jpg/1280px-Revel_electric_moped_IMG_4875_%2850522806976%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Revel electric moped IMG 4875 (50522806976)',
   'Ciclomotor eléctrico compartido de Revel',
   'Wikimedia Commons', 'CC BY-SA 2.0', 'Elvert Barnes',
   NULL, '2020-10-23'::date,
   'El ciclomotor eléctrico compartido, un formato que apenas existe en España y que en Nueva York mueve millones de viajes.',
   'claude-opus-5', now(), 66, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_011', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Moscow,_Yandex.Eda_electric_moped_Aug_2025_01.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Moscow%2C_Yandex.Eda_electric_moped_Aug_2025_01.jpg/1280px-Moscow%2C_Yandex.Eda_electric_moped_Aug_2025_01.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Moscow, Yandex.Eda electric moped Aug 2025 01',
   'Ciclomotor eléctrico de reparto de comida',
   'Wikimedia Commons', 'CC0', 'Retired electrician',
   NULL, '2025-08-02'::date,
   'El uso que más crece del ciclomotor eléctrico en el mundo, y el que menos aparece en la conversación europea sobre movilidad ligera.',
   'claude-opus-5', now(), 62, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_012', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:1881_a_tricycle_%C3%A9lectrique_electropolis.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/1881_a_tricycle_%C3%A9lectrique_electropolis.jpg/1280px-1881_a_tricycle_%C3%A9lectrique_electropolis.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   '1881 a tricycle électrique electropolis',
   'Triciclo eléctrico de 1881',
   'Wikimedia Commons', 'Public domain', 'Raoul Marquis',
   NULL, NULL,
   'Ciento cuarenta años. Es la imagen que mejor coloca todo lo demás: la movilidad eléctrica ligera no es una novedad que haya que probar, es una idea que perdió contra el motor de explosión y ha vuelto cuando la batería la ha hecho viable.',
   'claude-opus-5', now(), 86, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_013', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Electric_Rickshaw_Tricycle._Bukhara._Uzbekistan.jpg',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Electric_Rickshaw_Tricycle._Bukhara._Uzbekistan.jpg/1280px-Electric_Rickshaw_Tricycle._Bukhara._Uzbekistan.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Electric Rickshaw Tricycle. Bukhara. Uzbekistan',
   'Triciclo eléctrico de pasajeros en Bujará (Uzbekistán)',
   'Wikimedia Commons', 'CC BY-SA 4.0', 'Jamshid Nurkulov',
   NULL, '2025-08-24'::date,
   'Aquí está el volumen real del tema. El IEA cuenta más de un millón de triciclos eléctricos vendidos en un año, y casi ninguno se parece a lo que se vende en Europa.',
   'claude-opus-5', now(), 72, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8'),
  ('AGR_MEL_IMG_014', 'commons', 'imagen',
   'https://commons.wikimedia.org/wiki/File:Bosch_Pedelec_Battery.JPG',
   'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Bosch_Pedelec_Battery.JPG/1280px-Bosch_Pedelec_Battery.JPG?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'Bosch Pedelec Battery',
   'Batería de una bicicleta de pedaleo asistido, de Bosch',
   'Wikimedia Commons', 'CC0', 'Stefan Bellini',
   NULL, '2015-12-20'::date,
   'La pieza de la que va medio tema: la que decide el precio, el peso, la autonomía y el riesgo de incendio. Verla suelta ayuda a entender por qué se certifica ella y no la bicicleta.',
   'claude-opus-5', now(), 70, 'Elegida a mano entre 89 candidatas de Commons.',
   'vivo', now(), 'agente:prog8')
ON CONFLICT (id) DO NOTHING;

-- ── A QUÉ SUBTEMA VA CADA UNA ───────────────────────────────────────────────
INSERT INTO subtema_contenido (subtema_id, tipo, entity_id, puesto_por) VALUES
  ('ST_MEL_CARGA_REP', 'agregado', 'AGR_MEL_IMG_001', 'agente:prog8'),
  ('ST_MEL_CARGA', 'agregado', 'AGR_MEL_IMG_002', 'agente:prog8'),
  ('ST_MEL_CARGA_REP', 'agregado', 'AGR_MEL_IMG_003', 'agente:prog8'),
  ('ST_MEL_BICI', 'agregado', 'AGR_MEL_IMG_004', 'agente:prog8'),
  ('ST_MEL_BICI', 'agregado', 'AGR_MEL_IMG_005', 'agente:prog8'),
  ('ST_MEL_BICI_LIGERA', 'agregado', 'AGR_MEL_IMG_006', 'agente:prog8'),
  ('ST_MEL_VMP', 'agregado', 'AGR_MEL_IMG_007', 'agente:prog8'),
  ('ST_MEL_VMP_COMP', 'agregado', 'AGR_MEL_IMG_008', 'agente:prog8'),
  ('ST_MEL_VMP_COMP', 'agregado', 'AGR_MEL_IMG_009', 'agente:prog8'),
  ('ST_MEL_CICLO', 'agregado', 'AGR_MEL_IMG_010', 'agente:prog8'),
  ('ST_MEL_CICLO', 'agregado', 'AGR_MEL_IMG_011', 'agente:prog8'),
  ('ST_MEL_TRICI', 'agregado', 'AGR_MEL_IMG_012', 'agente:prog8'),
  ('ST_MEL_TRICI', 'agregado', 'AGR_MEL_IMG_013', 'agente:prog8'),
  ('ST_MEL_BAT', 'agregado', 'AGR_MEL_IMG_014', 'agente:prog8')
ON CONFLICT DO NOTHING;
