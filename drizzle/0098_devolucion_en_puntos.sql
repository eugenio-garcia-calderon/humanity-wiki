-- DEVOLVER UNA COMPRA PAGADA CON PUNTOS (2026-08-23, Programador 7 — economía
-- y mercado; fase 9 del plan de comercio, la parte que ya toca porque las
-- compras con puntos están vivas en producción).
--
-- El libro es de solo-añadir: una devolución no borra la venta, la DESHACE con
-- apuntes contrarios — el comprador recupera lo que pagó, el vendedor devuelve
-- su neto y la plataforma devuelve su comisión. Los tres apuntes llevan el
-- mismo motivo y el pedido como entidad; el signo dice quién devuelve y quién
-- recupera. Si el vendedor ya no tiene saldo para devolver, no se devuelve a
-- medias: se dice y no se toca nada.
ALTER TABLE movimientos_puntos DROP CONSTRAINT IF EXISTS movimientos_puntos_motivo_check;
ALTER TABLE movimientos_puntos ADD CONSTRAINT movimientos_puntos_motivo_check CHECK (
  motivo IN (
    'regalo_bienvenida', 'compra', 'vista_publicacion', 'gasto_ia', 'ajuste_admin',
    'transferencia_enviada', 'transferencia_recibida', 'saldo_inicial', 'gasto_servicio',
    'compra_con_puntos', 'venta_en_puntos', 'comision_puntos', 'devolucion_puntos'
  )
);
