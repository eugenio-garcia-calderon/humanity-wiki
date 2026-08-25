-- ============================================================================
-- LA CONSTELACIÓN DE MOVILIDAD (2026-08-25)
-- ============================================================================
-- Generado por `scripts/agregador/constelacion.py`, que lleva escrito el porqué
-- de cada decisión. Lo que llega aquí son sólo los resultados.
--
-- Tres cosas por pieza, y las tres son ejes distintos:
--   · `cluster`  — con qué otras habla de lo mismo (medido, no opinado);
--   · `genero`   — qué TIPO de pieza es (reseña, informe, reportaje…);
--   · `mapa_x/y` — dónde cae en el mapa, por significado.
--
-- Y `contenido_vecino`, que son las aristas: las tres piezas más parecidas a
-- cada una. Ésa es la parte de «red» del asunto — el árbol de temas no puede
-- expresar «esto se parece a aquello» porque no es una jerarquía.

ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS cluster_id text;
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS genero text;
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS mapa_x real;
ALTER TABLE contenido_agregado ADD COLUMN IF NOT EXISTS mapa_y real;

-- Los grupos, con su nombre y su sitio en el mapa. `tema_id` porque cada tema
-- tendrá los suyos: agrupar las piezas de MOVILIDAD con las de AGUA daría
-- grupos ciertos y completamente inútiles.
CREATE TABLE IF NOT EXISTS contenido_cluster (
  id          text PRIMARY KEY,
  tema_id     text NOT NULL,
  nombre      text NOT NULL,
  frase       text,
  x           real, y real,
  cuantas     integer NOT NULL DEFAULT 0,
  modelo      text,
  calculado_el timestamp DEFAULT now()
);

-- Las aristas. `parecido` de 0 a 1 se guarda **con** la arista y no se
-- recalcula al pintar: es lo que permite decir «se parecen un 72 %» en vez de
-- pedirle al lector que se fíe.
CREATE TABLE IF NOT EXISTS contenido_vecino (
  id        text NOT NULL,
  vecino_id text NOT NULL,
  parecido  real NOT NULL,
  PRIMARY KEY (id, vecino_id)
);
CREATE INDEX IF NOT EXISTS contenido_vecino_por_id ON contenido_vecino (id);


DELETE FROM contenido_cluster WHERE tema_id = 'O008';
INSERT INTO contenido_cluster (id, tema_id, nombre, frase, x, y, cuantas, modelo) VALUES
  ('CL_O008_0', 'O008', 'Vehículos Ligeros de Reparto Comercial', 'Usos de ciclomotores, triciclos y bicicletas dedicados a la logística de mercancías y transporte especializado.', 67.39, 48.49, 8, 'gemini-embedding-001 + gemini-3.6-flash'),
  ('CL_O008_1', 'O008', 'Bicicletas Eléctricas para Uso Personal', 'Modelos urbanos y vivencias individuales sobre el impacto de la bicicleta asistida en la rutina diaria.', 80.54, 56.44, 8, 'gemini-embedding-001 + gemini-3.6-flash'),
  ('CL_O008_2', 'O008', 'Informes Industriales y Mercado Global', 'Investigaciones macroeconómicas, datos estadísticos del sector y estudios de la industria de la movilidad eléctrica.', 56.15, 26.34, 8, 'gemini-embedding-001 + gemini-3.6-flash'),
  ('CL_O008_4', 'O008', 'Normativa y Seguridad Vial Urbana', 'Regulaciones administrativas, leyes de la DGT y recomendaciones para reducir riesgos en patinetes y VMP.', 23.67, 41.31, 19, 'gemini-embedding-001 + gemini-3.6-flash'),
  ('CL_O008_5', 'O008', 'Datos de Micromovilidad Compartida', 'Paneles municipales, especificaciones técnicas abiertas y seguimiento de sistemas públicos de alquiler.', 32.54, 80.33, 8, 'gemini-embedding-001 + gemini-3.6-flash'),
  ('CL_O008_6', 'O008', 'Marcas y Pruebas de E-Cargo', 'Analisis en profundidad de bicicletas de carga, certificaciones y novedades de fabricantes especializados.', 87.73, 44.59, 13, 'gemini-embedding-001 + gemini-3.6-flash');

-- Cada pieza: su grupo, su tipo y su sitio.
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='testimonio', mapa_x=86.78, mapa_y=46.14 WHERE id='AGR_MEL_001';
UPDATE contenido_agregado SET cluster_id='CL_O008_1', genero='testimonio', mapa_x=82.60, mapa_y=61.56 WHERE id='AGR_MEL_002';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='reportaje', mapa_x=61.96, mapa_y=63.20 WHERE id='AGR_MEL_003';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='reseña', mapa_x=98.66, mapa_y=48.13 WHERE id='AGR_MEL_004';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='testimonio', mapa_x=97.99, mapa_y=78.04 WHERE id='AGR_MEL_005';
UPDATE contenido_agregado SET cluster_id='CL_O008_1', genero='testimonio', mapa_x=81.99, mapa_y=81.63 WHERE id='AGR_MEL_006';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='reportaje', mapa_x=97.59, mapa_y=36.52 WHERE id='AGR_MEL_007';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='reseña', mapa_x=88.40, mapa_y=27.96 WHERE id='AGR_MEL_008';
UPDATE contenido_agregado SET cluster_id='CL_O008_1', genero='reseña', mapa_x=75.94, mapa_y=57.41 WHERE id='AGR_MEL_009';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='testimonio', mapa_x=93.72, mapa_y=85.87 WHERE id='AGR_MEL_010';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='divulgación', mapa_x=77.22, mapa_y=14.47 WHERE id='AGR_MEL_011';
UPDATE contenido_agregado SET cluster_id='CL_O008_1', genero='divulgación', mapa_x=79.56, mapa_y=21.85 WHERE id='AGR_MEL_012';
UPDATE contenido_agregado SET cluster_id='CL_O008_2', genero='reportaje', mapa_x=73.60, mapa_y=12.99 WHERE id='AGR_MEL_013';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='divulgación', mapa_x=71.97, mapa_y=17.74 WHERE id='AGR_MEL_014';
UPDATE contenido_agregado SET cluster_id='CL_O008_1', genero='reseña', mapa_x=84.51, mapa_y=44.00 WHERE id='AGR_MEL_015';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='reseña', mapa_x=64.54, mapa_y=22.90 WHERE id='AGR_MEL_016';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='testimonio', mapa_x=100.00, mapa_y=63.30 WHERE id='AGR_MEL_017';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='reseña', mapa_x=96.59, mapa_y=59.33 WHERE id='AGR_MEL_018';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='divulgación', mapa_x=40.01, mapa_y=21.77 WHERE id='AGR_MEL_019';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='informe', mapa_x=9.40, mapa_y=22.87 WHERE id='AGR_MEL_020';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='informe', mapa_x=14.72, mapa_y=22.06 WHERE id='AGR_MEL_021';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='informe', mapa_x=10.63, mapa_y=35.88 WHERE id='AGR_MEL_022';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='informe', mapa_x=9.00, mapa_y=27.18 WHERE id='AGR_MEL_023';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='reportaje', mapa_x=7.93, mapa_y=9.86 WHERE id='AGR_MEL_024';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='reportaje', mapa_x=0.00, mapa_y=29.68 WHERE id='AGR_MEL_025';
UPDATE contenido_agregado SET cluster_id='CL_O008_0', genero='informe', mapa_x=55.87, mapa_y=9.05 WHERE id='AGR_MEL_026';
UPDATE contenido_agregado SET cluster_id='CL_O008_2', genero='informe', mapa_x=42.04, mapa_y=0.00 WHERE id='AGR_MEL_027';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='divulgación', mapa_x=34.53, mapa_y=19.21 WHERE id='AGR_MEL_028';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='norma', mapa_x=30.54, mapa_y=17.16 WHERE id='AGR_MEL_029';
UPDATE contenido_agregado SET cluster_id='CL_O008_2', genero='informe', mapa_x=64.14, mapa_y=58.00 WHERE id='AGR_MEL_030';
UPDATE contenido_agregado SET cluster_id='CL_O008_2', genero='informe', mapa_x=67.86, mapa_y=58.52 WHERE id='AGR_MEL_031';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='informe', mapa_x=25.13, mapa_y=53.84 WHERE id='AGR_MEL_032';
UPDATE contenido_agregado SET cluster_id='CL_O008_1', genero='informe', mapa_x=68.03, mapa_y=62.32 WHERE id='AGR_MEL_033';
UPDATE contenido_agregado SET cluster_id='CL_O008_2', genero='divulgación', mapa_x=38.42, mapa_y=3.96 WHERE id='AGR_MEL_034';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='norma', mapa_x=53.76, mapa_y=27.47 WHERE id='AGR_MEL_035';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='norma', mapa_x=21.48, mapa_y=11.44 WHERE id='AGR_MEL_036';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='informe', mapa_x=38.96, mapa_y=14.60 WHERE id='AGR_MEL_037';
UPDATE contenido_agregado SET cluster_id='CL_O008_2', genero='datos', mapa_x=41.02, mapa_y=25.68 WHERE id='AGR_MEL_038';
UPDATE contenido_agregado SET cluster_id='CL_O008_5', genero='datos', mapa_x=9.92, mapa_y=84.73 WHERE id='AGR_MEL_039';
UPDATE contenido_agregado SET cluster_id='CL_O008_5', genero='datos', mapa_x=16.64, mapa_y=87.68 WHERE id='AGR_MEL_040';
UPDATE contenido_agregado SET cluster_id='CL_O008_5', genero='norma', mapa_x=26.65, mapa_y=100.00 WHERE id='AGR_MEL_041';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='norma', mapa_x=16.64, mapa_y=90.19 WHERE id='AGR_MEL_042';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='norma', mapa_x=13.91, mapa_y=90.97 WHERE id='AGR_MEL_043';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='divulgación', mapa_x=20.80, mapa_y=95.76 WHERE id='AGR_MEL_044';
UPDATE contenido_agregado SET cluster_id='CL_O008_5', genero='datos', mapa_x=12.11, mapa_y=91.20 WHERE id='AGR_MEL_045';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='norma', mapa_x=3.36, mapa_y=83.70 WHERE id='AGR_MEL_046';
UPDATE contenido_agregado SET cluster_id='CL_O008_2', genero='datos', mapa_x=61.63, mapa_y=20.92 WHERE id='AGR_MEL_047';
UPDATE contenido_agregado SET cluster_id='CL_O008_5', genero='informe', mapa_x=40.80, mapa_y=81.84 WHERE id='AGR_MEL_048';
UPDATE contenido_agregado SET cluster_id='CL_O008_0', genero='divulgación', mapa_x=78.34, mapa_y=54.18 WHERE id='AGR_MEL_049';
UPDATE contenido_agregado SET cluster_id='CL_O008_2', genero='datos', mapa_x=60.49, mapa_y=30.69 WHERE id='AGR_MEL_050';
UPDATE contenido_agregado SET cluster_id='CL_O008_5', genero='imagen', mapa_x=77.78, mapa_y=69.11 WHERE id='AGR_MEL_IMG_001';
UPDATE contenido_agregado SET cluster_id='CL_O008_0', genero='imagen', mapa_x=78.78, mapa_y=69.18 WHERE id='AGR_MEL_IMG_002';
UPDATE contenido_agregado SET cluster_id='CL_O008_0', genero='imagen', mapa_x=79.00, mapa_y=89.50 WHERE id='AGR_MEL_IMG_003';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='imagen', mapa_x=96.97, mapa_y=44.01 WHERE id='AGR_MEL_IMG_004';
UPDATE contenido_agregado SET cluster_id='CL_O008_1', genero='imagen', mapa_x=89.21, mapa_y=61.72 WHERE id='AGR_MEL_IMG_005';
UPDATE contenido_agregado SET cluster_id='CL_O008_1', genero='imagen', mapa_x=82.48, mapa_y=61.06 WHERE id='AGR_MEL_IMG_006';
UPDATE contenido_agregado SET cluster_id='CL_O008_5', genero='imagen', mapa_x=32.54, mapa_y=70.12 WHERE id='AGR_MEL_IMG_007';
UPDATE contenido_agregado SET cluster_id='CL_O008_5', genero='imagen', mapa_x=43.85, mapa_y=57.94 WHERE id='AGR_MEL_IMG_008';
UPDATE contenido_agregado SET cluster_id='CL_O008_4', genero='imagen', mapa_x=26.21, mapa_y=52.69 WHERE id='AGR_MEL_IMG_009';
UPDATE contenido_agregado SET cluster_id='CL_O008_0', genero='imagen', mapa_x=44.08, mapa_y=62.44 WHERE id='AGR_MEL_IMG_010';
UPDATE contenido_agregado SET cluster_id='CL_O008_0', genero='imagen', mapa_x=60.87, mapa_y=41.39 WHERE id='AGR_MEL_IMG_011';
UPDATE contenido_agregado SET cluster_id='CL_O008_0', genero='imagen', mapa_x=72.96, mapa_y=33.98 WHERE id='AGR_MEL_IMG_012';
UPDATE contenido_agregado SET cluster_id='CL_O008_0', genero='imagen', mapa_x=69.21, mapa_y=28.16 WHERE id='AGR_MEL_IMG_013';
UPDATE contenido_agregado SET cluster_id='CL_O008_6', genero='imagen', mapa_x=80.78, mapa_y=30.68 WHERE id='AGR_MEL_IMG_014';

-- Las aristas.
DELETE FROM contenido_vecino WHERE id IN ('AGR_MEL_001','AGR_MEL_002','AGR_MEL_003','AGR_MEL_004','AGR_MEL_005','AGR_MEL_006','AGR_MEL_007','AGR_MEL_008','AGR_MEL_009','AGR_MEL_010','AGR_MEL_011','AGR_MEL_012','AGR_MEL_013','AGR_MEL_014','AGR_MEL_015','AGR_MEL_016','AGR_MEL_017','AGR_MEL_018','AGR_MEL_019','AGR_MEL_020','AGR_MEL_021','AGR_MEL_022','AGR_MEL_023','AGR_MEL_024','AGR_MEL_025','AGR_MEL_026','AGR_MEL_027','AGR_MEL_028','AGR_MEL_029','AGR_MEL_030','AGR_MEL_031','AGR_MEL_032','AGR_MEL_033','AGR_MEL_034','AGR_MEL_035','AGR_MEL_036','AGR_MEL_037','AGR_MEL_038','AGR_MEL_039','AGR_MEL_040','AGR_MEL_041','AGR_MEL_042','AGR_MEL_043','AGR_MEL_044','AGR_MEL_045','AGR_MEL_046','AGR_MEL_047','AGR_MEL_048','AGR_MEL_049','AGR_MEL_050','AGR_MEL_IMG_001','AGR_MEL_IMG_002','AGR_MEL_IMG_003','AGR_MEL_IMG_004','AGR_MEL_IMG_005','AGR_MEL_IMG_006','AGR_MEL_IMG_007','AGR_MEL_IMG_008','AGR_MEL_IMG_009','AGR_MEL_IMG_010','AGR_MEL_IMG_011','AGR_MEL_IMG_012','AGR_MEL_IMG_013','AGR_MEL_IMG_014');
INSERT INTO contenido_vecino (id, vecino_id, parecido) VALUES
  ('AGR_MEL_001', 'AGR_MEL_049', 0.7566),
  ('AGR_MEL_001', 'AGR_MEL_017', 0.7505),
  ('AGR_MEL_001', 'AGR_MEL_018', 0.7475),
  ('AGR_MEL_002', 'AGR_MEL_017', 0.7467),
  ('AGR_MEL_002', 'AGR_MEL_031', 0.7423),
  ('AGR_MEL_002', 'AGR_MEL_006', 0.7326),
  ('AGR_MEL_003', 'AGR_MEL_002', 0.7005),
  ('AGR_MEL_003', 'AGR_MEL_031', 0.6985),
  ('AGR_MEL_003', 'AGR_MEL_005', 0.6902),
  ('AGR_MEL_004', 'AGR_MEL_017', 0.7658),
  ('AGR_MEL_004', 'AGR_MEL_005', 0.7465),
  ('AGR_MEL_004', 'AGR_MEL_018', 0.7362),
  ('AGR_MEL_005', 'AGR_MEL_017', 0.8602),
  ('AGR_MEL_005', 'AGR_MEL_049', 0.8090),
  ('AGR_MEL_005', 'AGR_MEL_018', 0.8070),
  ('AGR_MEL_006', 'AGR_MEL_005', 0.7573),
  ('AGR_MEL_006', 'AGR_MEL_017', 0.7482),
  ('AGR_MEL_006', 'AGR_MEL_031', 0.7339),
  ('AGR_MEL_007', 'AGR_MEL_IMG_004', 0.8390),
  ('AGR_MEL_007', 'AGR_MEL_008', 0.7460),
  ('AGR_MEL_007', 'AGR_MEL_017', 0.7086),
  ('AGR_MEL_008', 'AGR_MEL_IMG_004', 0.7751),
  ('AGR_MEL_008', 'AGR_MEL_007', 0.7460),
  ('AGR_MEL_008', 'AGR_MEL_011', 0.7343),
  ('AGR_MEL_009', 'AGR_MEL_IMG_006', 0.7263),
  ('AGR_MEL_009', 'AGR_MEL_006', 0.7109),
  ('AGR_MEL_009', 'AGR_MEL_015', 0.7051),
  ('AGR_MEL_010', 'AGR_MEL_005', 0.7712),
  ('AGR_MEL_010', 'AGR_MEL_017', 0.7611),
  ('AGR_MEL_010', 'AGR_MEL_006', 0.7328),
  ('AGR_MEL_011', 'AGR_MEL_027', 0.7410),
  ('AGR_MEL_011', 'AGR_MEL_008', 0.7343),
  ('AGR_MEL_011', 'AGR_MEL_017', 0.7330),
  ('AGR_MEL_012', 'AGR_MEL_015', 0.7302),
  ('AGR_MEL_012', 'AGR_MEL_IMG_014', 0.6996),
  ('AGR_MEL_012', 'AGR_MEL_011', 0.6926),
  ('AGR_MEL_013', 'AGR_MEL_007', 0.6922),
  ('AGR_MEL_013', 'AGR_MEL_014', 0.6157),
  ('AGR_MEL_013', 'AGR_MEL_011', 0.6100),
  ('AGR_MEL_014', 'AGR_MEL_018', 0.7317),
  ('AGR_MEL_014', 'AGR_MEL_004', 0.7145),
  ('AGR_MEL_014', 'AGR_MEL_017', 0.7123),
  ('AGR_MEL_015', 'AGR_MEL_012', 0.7302),
  ('AGR_MEL_015', 'AGR_MEL_018', 0.7224),
  ('AGR_MEL_015', 'AGR_MEL_IMG_006', 0.7180),
  ('AGR_MEL_016', 'AGR_MEL_IMG_011', 0.7229),
  ('AGR_MEL_016', 'AGR_MEL_014', 0.6794),
  ('AGR_MEL_016', 'AGR_MEL_002', 0.6771),
  ('AGR_MEL_017', 'AGR_MEL_005', 0.8602),
  ('AGR_MEL_017', 'AGR_MEL_049', 0.8137),
  ('AGR_MEL_017', 'AGR_MEL_004', 0.7658),
  ('AGR_MEL_018', 'AGR_MEL_005', 0.8070),
  ('AGR_MEL_018', 'AGR_MEL_049', 0.7844),
  ('AGR_MEL_018', 'AGR_MEL_017', 0.7642),
  ('AGR_MEL_019', 'AGR_MEL_029', 0.8004),
  ('AGR_MEL_019', 'AGR_MEL_028', 0.7443),
  ('AGR_MEL_019', 'AGR_MEL_020', 0.6772),
  ('AGR_MEL_020', 'AGR_MEL_021', 0.8292),
  ('AGR_MEL_020', 'AGR_MEL_023', 0.8257),
  ('AGR_MEL_020', 'AGR_MEL_022', 0.8176),
  ('AGR_MEL_021', 'AGR_MEL_020', 0.8292),
  ('AGR_MEL_021', 'AGR_MEL_022', 0.8100),
  ('AGR_MEL_021', 'AGR_MEL_023', 0.7850),
  ('AGR_MEL_022', 'AGR_MEL_020', 0.8176),
  ('AGR_MEL_022', 'AGR_MEL_025', 0.8115),
  ('AGR_MEL_022', 'AGR_MEL_021', 0.8100),
  ('AGR_MEL_023', 'AGR_MEL_020', 0.8257),
  ('AGR_MEL_023', 'AGR_MEL_021', 0.7850),
  ('AGR_MEL_023', 'AGR_MEL_022', 0.7570),
  ('AGR_MEL_024', 'AGR_MEL_025', 0.8897),
  ('AGR_MEL_024', 'AGR_MEL_021', 0.7540),
  ('AGR_MEL_024', 'AGR_MEL_IMG_009', 0.7529),
  ('AGR_MEL_025', 'AGR_MEL_024', 0.8897),
  ('AGR_MEL_025', 'AGR_MEL_022', 0.8115),
  ('AGR_MEL_025', 'AGR_MEL_020', 0.8039),
  ('AGR_MEL_026', 'AGR_MEL_027', 0.7874),
  ('AGR_MEL_026', 'AGR_MEL_038', 0.7362),
  ('AGR_MEL_026', 'AGR_MEL_IMG_013', 0.6990),
  ('AGR_MEL_027', 'AGR_MEL_038', 0.7974),
  ('AGR_MEL_027', 'AGR_MEL_026', 0.7874),
  ('AGR_MEL_027', 'AGR_MEL_011', 0.7410),
  ('AGR_MEL_028', 'AGR_MEL_019', 0.7443),
  ('AGR_MEL_028', 'AGR_MEL_029', 0.7371),
  ('AGR_MEL_028', 'AGR_MEL_021', 0.7353),
  ('AGR_MEL_029', 'AGR_MEL_019', 0.8004),
  ('AGR_MEL_029', 'AGR_MEL_028', 0.7371),
  ('AGR_MEL_029', 'AGR_MEL_021', 0.7055),
  ('AGR_MEL_030', 'AGR_MEL_031', 0.7932),
  ('AGR_MEL_030', 'AGR_MEL_033', 0.7765),
  ('AGR_MEL_030', 'AGR_MEL_050', 0.7643),
  ('AGR_MEL_031', 'AGR_MEL_033', 0.8022),
  ('AGR_MEL_031', 'AGR_MEL_030', 0.7932),
  ('AGR_MEL_031', 'AGR_MEL_050', 0.7866),
  ('AGR_MEL_032', 'AGR_MEL_048', 0.7916),
  ('AGR_MEL_032', 'AGR_MEL_030', 0.7387),
  ('AGR_MEL_032', 'AGR_MEL_031', 0.7268),
  ('AGR_MEL_033', 'AGR_MEL_031', 0.8022),
  ('AGR_MEL_033', 'AGR_MEL_030', 0.7765),
  ('AGR_MEL_033', 'AGR_MEL_049', 0.7431),
  ('AGR_MEL_034', 'AGR_MEL_037', 0.7622),
  ('AGR_MEL_034', 'AGR_MEL_036', 0.7454),
  ('AGR_MEL_034', 'AGR_MEL_021', 0.7198),
  ('AGR_MEL_035', 'AGR_MEL_036', 0.7297),
  ('AGR_MEL_035', 'AGR_MEL_034', 0.7077),
  ('AGR_MEL_035', 'AGR_MEL_IMG_014', 0.6924),
  ('AGR_MEL_036', 'AGR_MEL_034', 0.7454),
  ('AGR_MEL_036', 'AGR_MEL_020', 0.7423),
  ('AGR_MEL_036', 'AGR_MEL_035', 0.7297),
  ('AGR_MEL_037', 'AGR_MEL_034', 0.7622),
  ('AGR_MEL_037', 'AGR_MEL_036', 0.7238),
  ('AGR_MEL_037', 'AGR_MEL_023', 0.7032),
  ('AGR_MEL_038', 'AGR_MEL_027', 0.7974),
  ('AGR_MEL_038', 'AGR_MEL_026', 0.7362),
  ('AGR_MEL_038', 'AGR_MEL_039', 0.7291),
  ('AGR_MEL_039', 'AGR_MEL_040', 0.7836),
  ('AGR_MEL_039', 'AGR_MEL_046', 0.7815),
  ('AGR_MEL_039', 'AGR_MEL_023', 0.7493),
  ('AGR_MEL_040', 'AGR_MEL_039', 0.7836),
  ('AGR_MEL_040', 'AGR_MEL_046', 0.7236),
  ('AGR_MEL_040', 'AGR_MEL_045', 0.7227),
  ('AGR_MEL_041', 'AGR_MEL_044', 0.8093),
  ('AGR_MEL_041', 'AGR_MEL_042', 0.7406),
  ('AGR_MEL_041', 'AGR_MEL_039', 0.7341),
  ('AGR_MEL_042', 'AGR_MEL_044', 0.7689),
  ('AGR_MEL_042', 'AGR_MEL_041', 0.7406),
  ('AGR_MEL_042', 'AGR_MEL_046', 0.7105),
  ('AGR_MEL_043', 'AGR_MEL_039', 0.7445),
  ('AGR_MEL_043', 'AGR_MEL_041', 0.7288),
  ('AGR_MEL_043', 'AGR_MEL_044', 0.7177),
  ('AGR_MEL_044', 'AGR_MEL_041', 0.8093),
  ('AGR_MEL_044', 'AGR_MEL_042', 0.7689),
  ('AGR_MEL_044', 'AGR_MEL_046', 0.7577),
  ('AGR_MEL_045', 'AGR_MEL_039', 0.7370),
  ('AGR_MEL_045', 'AGR_MEL_046', 0.7343),
  ('AGR_MEL_045', 'AGR_MEL_040', 0.7227),
  ('AGR_MEL_046', 'AGR_MEL_039', 0.7815),
  ('AGR_MEL_046', 'AGR_MEL_044', 0.7577),
  ('AGR_MEL_046', 'AGR_MEL_045', 0.7343),
  ('AGR_MEL_047', 'AGR_MEL_050', 0.8611),
  ('AGR_MEL_047', 'AGR_MEL_031', 0.7077),
  ('AGR_MEL_047', 'AGR_MEL_027', 0.7029),
  ('AGR_MEL_048', 'AGR_MEL_032', 0.7916),
  ('AGR_MEL_048', 'AGR_MEL_031', 0.7720),
  ('AGR_MEL_048', 'AGR_MEL_030', 0.7557),
  ('AGR_MEL_049', 'AGR_MEL_017', 0.8137),
  ('AGR_MEL_049', 'AGR_MEL_005', 0.8090),
  ('AGR_MEL_049', 'AGR_MEL_018', 0.7844),
  ('AGR_MEL_050', 'AGR_MEL_047', 0.8611),
  ('AGR_MEL_050', 'AGR_MEL_031', 0.7866),
  ('AGR_MEL_050', 'AGR_MEL_030', 0.7643),
  ('AGR_MEL_IMG_001', 'AGR_MEL_IMG_003', 0.7099),
  ('AGR_MEL_IMG_001', 'AGR_MEL_IMG_004', 0.6831),
  ('AGR_MEL_IMG_001', 'AGR_MEL_IMG_007', 0.6791),
  ('AGR_MEL_IMG_002', 'AGR_MEL_IMG_003', 0.7105),
  ('AGR_MEL_IMG_002', 'AGR_MEL_017', 0.6865),
  ('AGR_MEL_IMG_002', 'AGR_MEL_049', 0.6758),
  ('AGR_MEL_IMG_003', 'AGR_MEL_049', 0.7318),
  ('AGR_MEL_IMG_003', 'AGR_MEL_IMG_002', 0.7105),
  ('AGR_MEL_IMG_003', 'AGR_MEL_IMG_001', 0.7099),
  ('AGR_MEL_IMG_004', 'AGR_MEL_007', 0.8390),
  ('AGR_MEL_IMG_004', 'AGR_MEL_008', 0.7751),
  ('AGR_MEL_IMG_004', 'AGR_MEL_IMG_014', 0.6889),
  ('AGR_MEL_IMG_005', 'AGR_MEL_IMG_014', 0.7162),
  ('AGR_MEL_IMG_005', 'AGR_MEL_IMG_006', 0.7138),
  ('AGR_MEL_IMG_005', 'AGR_MEL_IMG_012', 0.6859),
  ('AGR_MEL_IMG_006', 'AGR_MEL_009', 0.7263),
  ('AGR_MEL_IMG_006', 'AGR_MEL_006', 0.7213),
  ('AGR_MEL_IMG_006', 'AGR_MEL_001', 0.7204),
  ('AGR_MEL_IMG_007', 'AGR_MEL_IMG_008', 0.7505),
  ('AGR_MEL_IMG_007', 'AGR_MEL_039', 0.7183),
  ('AGR_MEL_IMG_007', 'AGR_MEL_040', 0.7088),
  ('AGR_MEL_IMG_008', 'AGR_MEL_IMG_007', 0.7505),
  ('AGR_MEL_IMG_008', 'AGR_MEL_IMG_009', 0.6817),
  ('AGR_MEL_IMG_008', 'AGR_MEL_IMG_001', 0.6719),
  ('AGR_MEL_IMG_009', 'AGR_MEL_025', 0.7629),
  ('AGR_MEL_IMG_009', 'AGR_MEL_024', 0.7529),
  ('AGR_MEL_IMG_009', 'AGR_MEL_021', 0.6928),
  ('AGR_MEL_IMG_010', 'AGR_MEL_IMG_011', 0.7244),
  ('AGR_MEL_IMG_010', 'AGR_MEL_040', 0.6832),
  ('AGR_MEL_IMG_010', 'AGR_MEL_016', 0.6718),
  ('AGR_MEL_IMG_011', 'AGR_MEL_049', 0.7689),
  ('AGR_MEL_IMG_011', 'AGR_MEL_IMG_010', 0.7244),
  ('AGR_MEL_IMG_011', 'AGR_MEL_016', 0.7229),
  ('AGR_MEL_IMG_012', 'AGR_MEL_IMG_013', 0.7030),
  ('AGR_MEL_IMG_012', 'AGR_MEL_014', 0.6954),
  ('AGR_MEL_IMG_012', 'AGR_MEL_IMG_011', 0.6868),
  ('AGR_MEL_IMG_013', 'AGR_MEL_050', 0.7048),
  ('AGR_MEL_IMG_013', 'AGR_MEL_IMG_012', 0.7030),
  ('AGR_MEL_IMG_013', 'AGR_MEL_026', 0.6990),
  ('AGR_MEL_IMG_014', 'AGR_MEL_IMG_005', 0.7162),
  ('AGR_MEL_IMG_014', 'AGR_MEL_012', 0.6996),
  ('AGR_MEL_IMG_014', 'AGR_MEL_034', 0.6984)
ON CONFLICT DO NOTHING;
