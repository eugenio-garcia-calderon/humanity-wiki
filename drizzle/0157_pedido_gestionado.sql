-- ============================================================================
-- PEDIDO GESTIONADO Y COMISIÓN POR LÍNEA (2026-10-18, Wikiproducts W5)
-- ============================================================================
-- Wikiproducts no tiene almacén. Cobra el PVP de cada oferta en su propia
-- tienda y compra al distribuidor por cuenta del cliente (opción A del plan,
-- en modo pruebas). Una cesta con dos tiendas es un solo pago, un pedido para
-- quien compra, y DOS pedidos que alguien tiene que hacer a mano a cada
-- distribuidor. Esa segunda mitad no existía en ningún sitio.
--
-- La comisión es lo que el distribuidor nos paga por haber enseñado su oferta.
-- No se suma al precio: quien compra paga lo mismo que en la tienda. Se enseña
-- igual, línea a línea, porque así lo promete el código ético.

-- ── 1. LO QUE LA FILA DE LA OFERTA LE DICE AL PRODUCTO DE DETRÁS ────────────
-- `bd/tienda.ts` copia la fila en el producto al leer la tabla. Estas cinco
-- columnas son la parte de la fila que solo tiene una oferta: quién la vende
-- de verdad, cuánto nos paga, dónde está en su web y cuánto tarda.
--   comision_pct NULL  = «sin acuerdo»: no cobramos nada por esta oferta.
--   distribuidor_id    = la fila del distribuidor (bd_filas.id), texto y sin
--                        clave foránea: la fila puede ir a la papelera y el
--                        pedido tiene que seguir diciendo a quién se compró.
ALTER TABLE products ADD COLUMN IF NOT EXISTS comision_pct numeric(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS distribuidor_id text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS distribuidor_nombre text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS oferta_enlace text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS oferta_plazo text;

-- ── 2. LA LÍNEA DEL PEDIDO GUARDA LA COMISIÓN DE AQUEL DÍA ─────────────────
-- Copiada al pagar, como el nombre y el precio: si mañana cambia el acuerdo,
-- este pedido sigue diciendo lo que se cobró.
ALTER TABLE pedido_lineas ADD COLUMN IF NOT EXISTS comision_pct numeric(5,2);
ALTER TABLE pedido_lineas ADD COLUMN IF NOT EXISTS comision_centimos integer;
ALTER TABLE pedido_lineas ADD COLUMN IF NOT EXISTS distribuidor_id text;
ALTER TABLE pedido_lineas ADD COLUMN IF NOT EXISTS distribuidor_nombre text;

-- ── 3. LA COLA: LO QUE HAY QUE PEDIR A CADA DISTRIBUIDOR ────────────────────
-- Una fila por pedido y distribuidor. No es una tabla de unión: guarda el
-- estado de un trabajo (pedirlo, que salga, que llegue) y lo que contestó la
-- tienda (su número de pedido, el seguimiento).
CREATE TABLE IF NOT EXISTS pedidos_distribuidor (
  id text PRIMARY KEY,
  pedido_id text NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  distribuidor_id text NOT NULL,
  distribuidor_nombre text NOT NULL,
  -- pendiente → pedido_hecho → enviado → entregado; `incidencia` cuando la
  -- tienda no lo tiene o no contesta, `cancelado` si no se puede servir.
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'pedido_hecho', 'enviado', 'entregado', 'incidencia', 'cancelado')),
  -- Lo cobrado al cliente por lo de esta tienda, y lo que la tienda nos debe.
  importe_centimos integer NOT NULL DEFAULT 0,
  envio_centimos integer NOT NULL DEFAULT 0,
  comision_centimos integer NOT NULL DEFAULT 0,
  referencia_distribuidor text,
  seguimiento text,
  nota text,
  gestionado_por text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, distribuidor_id)
);
-- El índice de la clave foránea a pedidos lo da el UNIQUE (empieza por pedido_id).
CREATE INDEX IF NOT EXISTS pedidos_distribuidor_estado_idx ON pedidos_distribuidor (estado, created_at);
CREATE INDEX IF NOT EXISTS pedidos_distribuidor_gestor_idx ON pedidos_distribuidor (gestionado_por);

COMMENT ON TABLE pedidos_distribuidor IS
  'Pedido gestionado: lo que hay que comprar a cada distribuidor por cuenta del cliente. Ver src/server/pedidoGestionado.ts.';
