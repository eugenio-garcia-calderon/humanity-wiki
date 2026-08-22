-- CUPONES DE DESCUENTO DEL VENDEDOR (2026-08-22, fase 7 del plan de comercio,
-- Programador 7 — economía y mercado). Lo que Shopify llama «descuentos»: un
-- código que el vendedor crea, con porcentaje o importe fijo, mínimo de
-- compra, caducidad y número de usos. EL DESCUENTO LO PAGA EL VENDEDOR: se
-- rebaja de su precio; la comisión de la plataforma se calcula sobre lo que
-- realmente se cobra. Ni la plataforma ni los puntos intervienen aquí.
--
-- No es una tabla de unión: es la definición de una oferta, de un vendedor.
CREATE TABLE IF NOT EXISTS cupones (
  id               text PRIMARY KEY,
  vendedor_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  codigo           text NOT NULL,                    -- se guarda en MAYÚSCULAS
  tipo             text NOT NULL CHECK (tipo IN ('porcentaje', 'fijo')),
  valor            integer NOT NULL CHECK (valor > 0), -- % (1-100) o céntimos
  minimo_centimos  integer NOT NULL DEFAULT 0,
  caduca_at        timestamp,                         -- NULL = no caduca
  usos_max         integer,                           -- NULL = sin límite
  usos             integer NOT NULL DEFAULT 0,
  activo           boolean NOT NULL DEFAULT true,
  created_at       timestamp NOT NULL DEFAULT now(),
  updated_at       timestamp NOT NULL DEFAULT now(),
  UNIQUE (vendedor_user_id, codigo)
);
CREATE INDEX IF NOT EXISTS cupones_vendedor_idx ON cupones (vendedor_user_id, activo);

-- Qué cupón se aplicó a cada pedido, por su código (el pedido es un hecho del
-- pasado: aunque el cupón se borre o cambie, el pedido sigue diciendo qué se
-- aplicó aquel día) y cuánto rebajó.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cupon_codigo text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS descuento_centimos integer NOT NULL DEFAULT 0;
