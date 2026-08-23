-- ============================================================================
-- 0107 — Variantes de producto: talla, color… con precio y stock propios
-- (2026-08-23, comercio segunda vuelta, fase 2; Eugenio: «dale a variantes»)
-- ============================================================================
-- Una variante es una fila hija del producto: un nombre («Talla M · Rojo»),
-- un SKU opcional, un precio propio (nulo = el del producto) y un stock propio
-- (nulo = no se lleva la cuenta). Nunca se borra una variante que alguien ya
-- compró: se desactiva (`activo = false`) y la línea del pedido conserva su
-- nombre.
CREATE TABLE IF NOT EXISTS producto_variantes (
  id              text PRIMARY KEY,
  producto_id     text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  nombre          text NOT NULL,
  sku             text,
  precio_centimos integer CHECK (precio_centimos IS NULL OR precio_centimos >= 0),
  stock           integer CHECK (stock IS NULL OR stock >= 0),
  orden           integer NOT NULL DEFAULT 0,
  activo          boolean NOT NULL DEFAULT true,
  created_at      timestamp NOT NULL DEFAULT now(),
  updated_at      timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS producto_variantes_producto_idx ON producto_variantes (producto_id, activo, orden);

-- La variante elegida viaja con la línea del pedido (id y nombre, por si la
-- variante cambia de nombre o se desactiva mañana).
ALTER TABLE pedido_lineas ADD COLUMN IF NOT EXISTS variante_id text;
ALTER TABLE pedido_lineas ADD COLUMN IF NOT EXISTS variante_nombre text;

-- Y con la reserva de stock mientras se paga: una sesión de pago puede llevar
-- dos variantes del mismo producto, así que la unicidad pasa a (sesión,
-- producto, variante). La variante vacía ('') es «sin variante».
ALTER TABLE reservas_stock ADD COLUMN IF NOT EXISTS variante_id text;
DROP INDEX IF EXISTS reservas_stock_sesion_producto_idx;
CREATE UNIQUE INDEX IF NOT EXISTS reservas_stock_sesion_producto_variante_idx
  ON reservas_stock (stripe_session_id, producto_id, coalesce(variante_id, ''));
