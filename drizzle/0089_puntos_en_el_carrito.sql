-- PUNTOS COMO DESCUENTO EN EL CARRITO (2026-08-22, decisión de Eugenio: «se
-- pueden utilizar en descuento en el mercado que pueden ser de hasta el 100 %
-- si hay puntos suficientes, como hace Amazon con sus colaboradores»).
-- Interruptor `PUNTOS_DESCUENTO`, APAGADO en producción hasta que él lo encienda.
--
-- CÓMO SE PAGA EL DESCUENTO — la decisión de diseño, escrita para que se lea
-- como decisión: el vendedor COBRA EN PUNTOS la parte pagada con puntos
-- (transferencia comprador → vendedor en el libro) y en euros el resto. La
-- plataforma no saca euros de caja para cubrir descuentos: el punto circula y
-- sigue siendo lo que compra (un vale de utilidad), no un pasivo en euros.
-- Por eso el vendedor OPTA por aceptar puntos producto a producto — el
-- «abanico limitado de productos» del piloto es exactamente lo que los
-- vendedores marquen aquí.
ALTER TABLE products ADD COLUMN IF NOT EXISTS acepta_puntos boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN products.acepta_puntos IS
  'El vendedor acepta cobrar este producto (total o parcialmente) en puntos. Por defecto no.';

-- Lo que cada pedido se pagó con puntos, para que el pedido lo diga sin
-- consultar el libro (el libro sigue siendo la verdad; esto es el resumen).
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS puntos_usados numeric(12,2) NOT NULL DEFAULT 0;

-- Los dos motivos del libro para una compra con puntos: el comprador gasta
-- (`compra_con_puntos`, negativo) y el vendedor cobra (`venta_en_puntos`,
-- positivo). Entidad: el pedido.
ALTER TABLE movimientos_puntos DROP CONSTRAINT IF EXISTS movimientos_puntos_motivo_check;
ALTER TABLE movimientos_puntos ADD CONSTRAINT movimientos_puntos_motivo_check CHECK (
  motivo IN (
    'regalo_bienvenida', 'compra', 'vista_publicacion', 'gasto_ia', 'ajuste_admin',
    'transferencia_enviada', 'transferencia_recibida', 'saldo_inicial', 'gasto_servicio',
    'compra_con_puntos', 'venta_en_puntos'
  )
);
