-- ============================================================================
-- 0118 — Liquidaciones: lo que la plataforma le debe a cada tienda (2026-08-24)
-- ============================================================================
-- Eugenio (24-08): «lo podemos resolver con un gestor de cobro donde la
-- plataforma cobra en cuenta un dinero y luego le entrega al vendedor ese
-- dinero… una operación de servicio de cobro a las tiendas» — y, tras
-- redactarse el contrato: «lo demás queda validado y se puede subir, genera la
-- lógica de cobro con estas variables».
--
-- Cuando una compra lleva cosas de varias tiendas, el dinero entra ENTERO en la
-- cuenta de la plataforma y hay que devolvérselo a cada una. Esta tabla es esa
-- deuda: una fila por pedido y tienda, con lo que se le debe, lo que se queda
-- la plataforma de comisión y cuándo toca pagarle según el contrato.
--
-- ES DINERO AJENO Y SE TRATA COMO TAL: la fila nace en cuanto se cobra (no
-- cuando alguien se acuerda), dice desde el primer momento cuándo vence, y
-- pasa a `pagada` solo cuando el proveedor de pago confirma la transferencia,
-- con su identificador guardado. Si algo se devuelve o el banco reclama el
-- cargo, la fila pasa a `retenida` o `cancelada` — nunca se borra.
CREATE TABLE IF NOT EXISTS liquidaciones (
  id                  text PRIMARY KEY,
  pedido_id           text NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  vendedor_user_id    text NOT NULL REFERENCES users(id),
  -- Lo cobrado a quien compró por las cosas de ESTA tienda, y el porte suyo.
  bruto_centimos      integer NOT NULL CHECK (bruto_centimos >= 0),
  envio_centimos      integer NOT NULL DEFAULT 0,
  -- Lo que se queda la plataforma (comisión vigente al cobrar, no la de hoy:
  -- lo que se pactó cuando se vendió es lo que vale).
  comision_centimos   integer NOT NULL DEFAULT 0 CHECK (comision_centimos >= 0),
  comision_bps        integer NOT NULL DEFAULT 0,
  neto_centimos       integer NOT NULL CHECK (neto_centimos >= 0),
  moneda              text NOT NULL DEFAULT 'EUR',
  -- 'pendiente' (aún no vence) · 'lista' (vencida, toca pagar) · 'pagada'
  -- · 'retenida' (devolución o contracargo en curso) · 'cancelada'.
  estado              text NOT NULL DEFAULT 'pendiente'
                      CHECK (estado IN ('pendiente', 'lista', 'pagada', 'retenida', 'cancelada')),
  vence_el            timestamp NOT NULL,
  pagada_en           timestamp,
  -- El identificador de la transferencia en el proveedor de pago: sin esto,
  -- «está pagada» sería una palabra nuestra y no un hecho comprobable.
  transferencia_ref   text,
  motivo_retencion    text,
  created_at          timestamp NOT NULL DEFAULT now(),
  updated_at          timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS liquidaciones_vendedor_idx ON liquidaciones (vendedor_user_id, estado, vence_el);
CREATE INDEX IF NOT EXISTS liquidaciones_vencimiento_idx ON liquidaciones (estado, vence_el);
-- Una liquidación por pedido y tienda: un aviso repetido del proveedor de
-- pago no puede crear dos deudas por lo mismo.
CREATE UNIQUE INDEX IF NOT EXISTS liquidaciones_una_por_pedido_idx ON liquidaciones (pedido_id, vendedor_user_id);

-- El pedido recuerda cómo se cobró: 'directo' (la tienda cobró en su cuenta,
-- como hasta hoy) o 'agregado' (cobró la plataforma y le debe una liquidación).
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cobro_tipo text NOT NULL DEFAULT 'directo'
  CHECK (cobro_tipo IN ('directo', 'agregado'));
