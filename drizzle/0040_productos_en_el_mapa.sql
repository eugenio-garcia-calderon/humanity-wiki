-- ============================================================================
-- 0040 — Productos en el Mapa 3D + la DJI Power 1000 V2 en el Mercado
-- ============================================================================
-- Petición de Eugenio (2026-08-19): «coge las características de la DJI Power
-- 1000 V2 y crea en la Base de datos un producto con sus fotos y
-- características y precio, y crea la posibilidad de meter en el mapa 3D
-- productos».
--
-- Dos cosas:
--   1. El Mapa 3D admite un objeto nuevo, `producto`, que APUNTA a una fila de
--      `products`. No copia el precio ni la foto: los lee de la ficha real, así
--      que si cambias el precio en el Mercado cambia también en el mundo.
--   2. La DJI Power 1000 V2, con sus datos reales (agosto 2026).

-- --- 1. El objeto `producto` en el mundo ------------------------------------
ALTER TABLE game_world_items DROP CONSTRAINT IF EXISTS game_world_items_tipo_check;

ALTER TABLE game_world_items ADD CONSTRAINT game_world_items_tipo_check
  CHECK (tipo = ANY (ARRAY[
    'prop', 'nota', 'imagen', 'documento', 'enlace',
    'video', 'musica', 'lienzo', 'mapa',
    'producto'
  ]::text[]));

-- A qué producto del Mercado apunta. Nulo en todo lo demás.
ALTER TABLE game_world_items ADD COLUMN IF NOT EXISTS producto_id text;

DO $$ BEGIN
  ALTER TABLE game_world_items
    ADD CONSTRAINT game_world_items_producto_id_fkey
    FOREIGN KEY (producto_id) REFERENCES products(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS game_world_items_producto_idx
  ON game_world_items (producto_id) WHERE producto_id IS NOT NULL;

-- --- 2. La DJI Power 1000 V2 -----------------------------------------------
-- Datos de la web oficial de DJI (dji.com/es/power-1000-v2) y precio de DJI
-- Store Iberia en agosto de 2026. Las FOTOS se ENLAZAN al CDN de DJI, no se
-- copian a nuestro servidor: son suyas, y enlazarlas deja la propiedad donde
-- está. Si esto llega a venderse de verdad hay que sustituirlas por fotos
-- propias o con permiso de DJI.
INSERT INTO products (
  id, name, description, category, price_cents, currency,
  kind, modality, stock, warranty, return_policy, images, status
) VALUES (
  'PRD_DJI_POWER_1000_V2',
  'DJI Power 1000 V2',
  E'Estación de energía portátil de 1024 Wh con batería LFP (litio-ferrofosfato) y 2600 W de salida continua: mueve más del 99 % de los aparatos de una casa, desde una nevera a una sierra de mesa.\n\n'
  || E'**Lo que la distingue**\n'
  || E'- Carga del 0 al 80 % en 37 minutos, y llena en 56 minutos.\n'
  || E'- 26 dB de ruido: menos que una biblioteca. Se puede tener en la misma habitación mientras se duerme.\n'
  || E'- Batería LFP: conserva más del 80 % de su capacidad después de 4000 ciclos. Cargándola a diario, más de diez años.\n'
  || E'- Ampliable hasta 11 264 Wh conectando cinco baterías de expansión.\n\n'
  || E'**Ficha técnica**\n'
  || E'- Capacidad: 1024 Wh\n'
  || E'- Química: LFP (litio-ferrofosfato)\n'
  || E'- Vida útil: >80 % de capacidad a los 4000 ciclos\n'
  || E'- Salida CA continua: 2600 W (220-240 V, 50/60 Hz, máx. 10,9 A)\n'
  || E'- Tomas de corriente: 2 (versión europea)\n'
  || E'- USB-C: 2, hasta 140 W cada uno (EPR)\n'
  || E'- USB-A: 2, hasta 24 W cada uno\n'
  || E'- Puertos SDC: 1 SDC + 1 SDC Lite (carga rápida de baterías de dron y coche)\n'
  || E'- Carga: 37 min al 80 %, 56 min al 100 %\n'
  || E'- Ruido: 26 dB\n'
  || E'- Peso: 14,2 kg\n'
  || E'- Medidas: 448 × 225 × 230 mm\n'
  || E'- Temperatura de uso: −10 a 45 °C (carga: 0 a 45 °C)\n\n'
  || E'**Para qué sirve en una aldea regenerativa**: respaldo de nevera y bomba de agua en un corte de luz, energía para rodajes y drones lejos de la red, y almacenamiento de una placa solar sin obra ni instalación.',
  'energia',
  64900,                      -- 649,00 € — DJI Store Iberia, agosto 2026
  'EUR',
  'fisico',
  'unico',
  NULL,                       -- sin stock declarado: es una ficha de catálogo
  '2 años',
  'Devolución en 14 días naturales sin dar explicaciones (derecho de desistimiento).',
  '["https://www.djiusa.com/cdn/shop/files/DJIPower1000V2.webp?v=1786601222&width=1946","https://www.djiusa.com/cdn/shop/files/DJI_Power_1000_V2_d640edbd-dec6-429d-9b2e-97c4b80c05d5.webp?v=1776757209&width=1946","https://www.djiusa.com/cdn/shop/files/3_b3464708-a5c9-4335-859d-1b7f40a3f515.webp?v=1776757209&width=1946","https://www.djiusa.com/cdn/shop/files/4_4faebbdd-47f6-4a4b-b93e-084b8210c97a.webp?v=1776757209&width=1946"]'::jsonb,
  'activo'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_cents = EXCLUDED.price_cents,
  images = EXCLUDED.images,
  updated_at = now();
