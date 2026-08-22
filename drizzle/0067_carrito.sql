-- ============================================================================
-- CARRITO — fase 7 del plan de tiendas (2026-08-22)
-- ============================================================================
-- Hasta ahora, un pago = un producto. Quien quería la miel Y la vela pagaba
-- dos veces, con dos envíos y dos recibos. A partir de dos productos eso deja
-- de ser una molestia y pasa a ser un motivo para no comprar.

-- ── 1. UNA SESIÓN DE PAGO PUEDE RESERVAR VARIAS COSAS ───────────────────────
-- La restricción de antes decía «una reserva por sesión», que era verdad
-- cuando sólo se compraba un producto. Ahora una sesión reserva una línea por
-- producto: lo único a la vez es que el MISMO producto no se reserve dos
-- veces dentro del mismo pago.
ALTER TABLE reservas_stock DROP CONSTRAINT IF EXISTS reservas_stock_stripe_session_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS reservas_stock_sesion_producto_idx
  ON reservas_stock (stripe_session_id, producto_id);

-- ── 2. LAS LÍNEAS DE UN PEDIDO ──────────────────────────────────────────────
-- Se guarda el nombre y el precio de CADA línea, copiados en el momento de
-- comprar. Un pedido es un hecho del pasado: si mañana sube el precio o
-- cambia el nombre, el pedido tiene que seguir diciendo lo que se compró y
-- por cuánto.
CREATE TABLE IF NOT EXISTS pedido_lineas (
  id text PRIMARY KEY,
  pedido_id text NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id text REFERENCES products(id) ON DELETE SET NULL,
  producto_nombre text NOT NULL,
  unidades integer NOT NULL CHECK (unidades > 0),
  precio_unitario_centimos integer NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pedido_lineas_pedido_idx ON pedido_lineas (pedido_id);

-- ── 3. EL PEDIDO DEJA DE TENER UN SOLO PRODUCTO ─────────────────────────────
-- `producto_id` y `unidades` se quedan por los pedidos de un solo producto que
-- ya existen, pero dejan de ser obligatorios: en un carrito el producto está
-- en las líneas. `producto_nombre` sigue siendo obligatorio y pasa a ser el
-- resumen legible («Miel de romero y 2 cosas más»), que es lo que hace falta
-- para enseñar una lista de pedidos sin consultar las líneas de cada uno.
ALTER TABLE pedidos ALTER COLUMN unidades DROP NOT NULL;

COMMENT ON TABLE pedido_lineas IS
  'Lo que llevaba un pedido, con nombre y precio copiados al comprar. Ver fase 7 de memory/11_PLAN_TIENDAS.md.';
COMMENT ON COLUMN pedidos.producto_nombre IS
  'Resumen legible del pedido. El detalle está en pedido_lineas.';
