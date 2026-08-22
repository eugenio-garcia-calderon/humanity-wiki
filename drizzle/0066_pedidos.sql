-- ============================================================================
-- PEDIDOS — fase 6 del plan de tiendas (2026-08-22)
-- ============================================================================
-- Una compra dejaba una fila en `transactions`, que dice que entró dinero. No
-- dice qué hay que meter en una caja ni a qué calle mandarla, y quien vende no
-- tenía dónde mirarlo. Un apunte contable no es un pedido.
--
-- Tampoco lo tenía quien compra: pagaba, y a partir de ahí no había forma de
-- saber si su cosa estaba en camino. Sin cuenta, además, no hay «mis pedidos»
-- donde mirar — por eso cada pedido lleva un código que se puede consultar sin
-- entrar en ningún sitio.

CREATE TABLE IF NOT EXISTS pedidos (
  id text PRIMARY KEY,

  -- El código que se le da a quien compra. Corto, sin letras que se confundan
  -- al leerlo en voz alta o copiarlo de un correo. Es la única forma de
  -- consultar un pedido cuando no hay cuenta con la que entrar.
  codigo text NOT NULL UNIQUE,

  producto_id text REFERENCES products(id) ON DELETE SET NULL,
  -- El nombre se copia AQUÍ, no se lee del producto. Si mañana el vendedor le
  -- cambia el nombre o lo retira, el pedido tiene que seguir diciendo qué se
  -- compró aquel día. Un pedido es un hecho del pasado.
  producto_nombre text NOT NULL,
  unidades integer NOT NULL CHECK (unidades > 0),

  importe_centimos integer NOT NULL,
  envio_centimos integer NOT NULL DEFAULT 0,
  moneda text NOT NULL DEFAULT 'EUR',

  -- Quién compra. Puede no tener cuenta: entonces sólo hay correo, y basta.
  comprador_user_id text REFERENCES users(id) ON DELETE SET NULL,
  comprador_email text,
  comprador_nombre text,

  -- La dirección, tal como la devolvió la pasarela. En un solo campo y no en
  -- ocho columnas: cada país escribe una dirección a su manera y partirla en
  -- «provincia» y «código postal» rompe la mitad de Europa.
  direccion_envio jsonb,

  vendedor_user_id text REFERENCES users(id) ON DELETE SET NULL,

  -- `pagado` → `enviado` → `entregado`, y `devuelto` si vuelve. Empieza en
  -- pagado porque un pedido sólo existe cuando el dinero ha entrado: antes es
  -- un intento, y los intentos viven en `reservas_stock`.
  estado text NOT NULL DEFAULT 'pagado'
    CHECK (estado IN ('pagado', 'enviado', 'entregado', 'devuelto', 'cancelado')),
  seguimiento text,
  nota_vendedor text,

  stripe_session_id text UNIQUE,
  transaction_id text,

  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- «¿Qué tengo que enviar?» es la pregunta que hace quien vende cada mañana.
CREATE INDEX IF NOT EXISTS pedidos_vendedor_idx
  ON pedidos (vendedor_user_id, estado, created_at DESC);

-- Y «¿dónde está lo mío?», por correo, para quien compró sin cuenta.
CREATE INDEX IF NOT EXISTS pedidos_email_idx ON pedidos (lower(comprador_email));

COMMENT ON TABLE pedidos IS
  'Lo que hay que enviar y a dónde. transactions dice que entró dinero; esto dice qué hacer con él.';
