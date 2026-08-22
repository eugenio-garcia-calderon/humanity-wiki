-- ============================================================================
-- 0042 — La pizarra de cada producto (2026-08-19)
-- ============================================================================
-- Petición de Eugenio: «cuando en el mapa 3D se hace clic en un producto que se
-- abra una ventana como la de las tareas, como si fuese una nueva página, donde
-- el admin de ese producto puede añadir información y reorganizarla en esa
-- pizarra 2D: vídeos, fotos, botones de compra, productos relacionados…».
--
-- Es la MISMA idea que el lienzo de una tarjeta de proyecto: una lista de
-- bloques con su posición. Se guarda igual (jsonb con x/y) a propósito — un
-- modelo distinto para la misma pizarra habría sido dos cosas que mantener.
--
-- Cada bloque es `{ tipo, x, y, ... }`:
--   texto    → una nota
--   imagen   → `url`
--   video    → `url` (YouTube)
--   enlace   → `url`
--   boton    → `texto` (lo que pone) + `url` (a dónde lleva). El de comprar.
--   producto → `url` = el ID de OTRO producto. Un relacionado.
ALTER TABLE products ADD COLUMN IF NOT EXISTS bloques jsonb NOT NULL DEFAULT '[]'::jsonb;

-- --- Quién puede editar la página de la DJI --------------------------------
-- La migración 0040 creó el producto sin dueño (`created_by` nulo), y sin dueño
-- nadie puede editar su página: la ficha se abriría en solo lectura para todo
-- el mundo, incluido quien la pidió. Se le asigna a Eugenio si existe.
UPDATE products SET created_by = 'U_ADMIN_EUGENIO', updated_by = 'U_ADMIN_EUGENIO'
WHERE id = 'PRD_DJI_POWER_1000_V2'
  AND created_by IS NULL
  AND EXISTS (SELECT 1 FROM users WHERE id = 'U_ADMIN_EUGENIO');

-- --- La landing de la DJI Power 1000 V2, montada con esa lógica -------------
-- Sus fotos son las que ya tiene la ficha (enlazadas al CDN de DJI, no
-- copiadas); los datos, los mismos de la migración 0040.
UPDATE products SET bloques = '[
  {"tipo":"texto","x":40,"y":30,
   "texto":"1024 Wh de batería LFP y 2600 W de salida continua.\n\nMueve más del 99 % de los aparatos de una casa: una nevera, una bomba de agua, una sierra de mesa."},
  {"tipo":"imagen","x":330,"y":30,
   "url":"https://www.djiusa.com/cdn/shop/files/DJIPower1000V2.webp?v=1786601222&width=1946"},
  {"tipo":"boton","x":40,"y":210,
   "texto":"Comprar · 649 €","url":"https://www.djistoreiberia.com/product/dji-power-1000-v2/"},
  {"tipo":"texto","x":40,"y":300,
   "texto":"Carga del 0 al 80 % en 37 minutos, y llena en 56.\n\n26 dB de ruido: menos que una biblioteca. Se puede tener en la misma habitación mientras duermes."},
  {"tipo":"imagen","x":330,"y":300,
   "url":"https://www.djiusa.com/cdn/shop/files/DJI_Power_1000_V2_d640edbd-dec6-429d-9b2e-97c4b80c05d5.webp?v=1776757209&width=1946"},
  {"tipo":"texto","x":650,"y":30,
   "texto":"DURA UNA DÉCADA\n\nBatería LFP: conserva más del 80 % de su capacidad después de 4000 ciclos. Cargándola a diario, más de diez años."},
  {"tipo":"texto","x":650,"y":210,
   "texto":"CONEXIONES\n\n2 tomas de corriente (versión europea)\n2 USB-C de hasta 140 W\n2 USB-A de hasta 24 W\n1 SDC + 1 SDC Lite"},
  {"tipo":"texto","x":650,"y":420,
   "texto":"AMPLIABLE\n\nHasta 11 264 Wh conectando cinco baterías de expansión."},
  {"tipo":"enlace","x":40,"y":500,
   "url":"https://www.dji.com/es/power-1000-v2"},
  {"tipo":"texto","x":330,"y":500,
   "texto":"14,2 kg · 448 × 225 × 230 mm\nDe −10 a 45 °C (carga: de 0 a 45 °C)\nGarantía de 2 años"}
]'::jsonb
WHERE id = 'PRD_DJI_POWER_1000_V2' AND bloques = '[]'::jsonb;
