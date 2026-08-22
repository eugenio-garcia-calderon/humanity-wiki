-- ============================================================================
-- ENVÍO DE PRODUCTOS — fase 4 del plan de tiendas (2026-08-22)
-- ============================================================================
-- Se podía cobrar un producto físico sin pedir jamás una dirección. El dinero
-- entraba y nadie sabía a dónde mandar la caja.
--
-- Tres columnas, todas NULAS por defecto, y el nulo significa algo distinto en
-- cada una. Ese es el punto: «no lo ha configurado» no puede confundirse con
-- «es gratis», o todo el catálogo que ya existe pasaría a anunciar envío
-- gratuito que nadie ha prometido.

ALTER TABLE products
  -- Cuánto cuesta enviarlo. NULL = quien vende no lo ha puesto todavía, y
  -- entonces no se ofrece envío: se cobra el producto y se acuerda aparte.
  -- 0 = envío gratis, dicho a propósito. Son cosas distintas.
  ADD COLUMN IF NOT EXISTS envio_centimos integer,

  -- A partir de cuánto sale gratis el envío. NULL = nunca sale gratis.
  ADD COLUMN IF NOT EXISTS envio_gratis_desde_centimos integer,

  -- Cuántos días tarda, como texto corto («2 a 4 días laborables»). Es lo
  -- primero que pregunta quien compra y hoy no había dónde ponerlo.
  ADD COLUMN IF NOT EXISTS envio_plazo text;

-- Un precio de envío negativo no existe. Y el umbral de envío gratis por
-- debajo de cero convertiría todo pedido en gratuito sin querer.
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_envio_no_negativo;
ALTER TABLE products
  ADD CONSTRAINT products_envio_no_negativo
  CHECK (
    (envio_centimos IS NULL OR envio_centimos >= 0) AND
    (envio_gratis_desde_centimos IS NULL OR envio_gratis_desde_centimos >= 0)
  );

COMMENT ON COLUMN products.envio_centimos IS
  'Coste de envío en céntimos. NULL = sin envío configurado (no se ofrece); 0 = envío gratis.';
COMMENT ON COLUMN products.envio_gratis_desde_centimos IS
  'Importe a partir del cual el envío es gratis. NULL = nunca.';
