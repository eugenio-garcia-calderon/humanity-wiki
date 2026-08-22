-- ============================================================================
-- RESERVA DE STOCK MIENTRAS SE PAGA — fase 5 del plan de tiendas (2026-08-22)
-- ============================================================================
-- El agujero: comprobar el stock al abrir el pago y descontarlo al cobrarlo
-- deja un hueco de varios minutos en medio. Dos personas con el último tarro
-- de miel pasan las dos la comprobación, las dos pagan, y una se queda sin
-- tarro con el dinero cobrado. No es raro: es exactamente lo que pasa cuando
-- algo se agota, que es cuando más gente lo mira a la vez.
--
-- La reserva tapa el hueco: el tarro deja de estar disponible EN CUANTO se
-- abre el pago, y vuelve solo si el pago se abandona.
--
-- POR QUÉ UNA TABLA Y NO UNA COLUMNA `reservado` EN `products`:
-- una columna no sabe QUIÉN reservó ni CUÁNDO caduca, así que un pago
-- abandonado dejaría el stock retenido para siempre sin nadie a quien
-- devolvérselo. Cada reserva tiene que poder caducar por su cuenta.

CREATE TABLE IF NOT EXISTS reservas_stock (
  id text PRIMARY KEY,
  producto_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unidades integer NOT NULL CHECK (unidades > 0),

  -- La sesión de pago de Stripe. ÚNICA: si un aviso de Stripe llega dos veces
  -- —y llegan— no puede descontarse el stock dos veces por la misma compra.
  stripe_session_id text NOT NULL UNIQUE,

  -- `abierta`   se está pagando: retiene stock
  -- `confirmada` se pagó: el stock ya está descontado de products
  -- `liberada`  se abandonó o caducó: ya no retiene nada
  estado text NOT NULL DEFAULT 'abierta'
    CHECK (estado IN ('abierta', 'confirmada', 'liberada')),

  -- Una reserva que nadie cierra tiene que soltarse sola. Sin esto, un pago
  -- abandonado deja el último tarro invisible para siempre.
  expira_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- La pregunta que se hace en cada compra: «¿cuánto hay reservado ahora mismo
-- de este producto?». Sin índice son dos consultas por producto y por visita.
CREATE INDEX IF NOT EXISTS reservas_stock_vivas_idx
  ON reservas_stock (producto_id, expira_at)
  WHERE estado = 'abierta';

COMMENT ON TABLE reservas_stock IS
  'Stock retenido mientras alguien paga. Se libera solo al caducar: ver fase 5 de memory/11_PLAN_TIENDAS.md.';
