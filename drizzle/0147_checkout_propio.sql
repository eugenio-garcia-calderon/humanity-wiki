-- CHECKOUT EN NUESTRO DOMINIO, DIRECCIONES GUARDADAS Y BOTONES DE DONACIÓN (2026-10-08)
--
-- 1) La dirección de envío y la de facturación de cada persona registrada. UNA de
--    cada tipo (clave user_id + tipo): la facturación puede declararse «igual que
--    el envío» y entonces NO guarda copia —dos sitios donde viva la misma verdad
--    acaban diciendo cosas distintas—, se lee de la de envío.
CREATE TABLE IF NOT EXISTS direcciones_usuario (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('envio', 'facturacion')),
  igual_que_envio boolean NOT NULL DEFAULT false,
  nombre text, nif text, linea1 text, linea2 text, cp text, ciudad text, provincia text,
  pais text NOT NULL DEFAULT 'ES', telefono text,
  updated_at timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tipo)
);

-- 2) Lo que se escribió en NUESTRO formulario al pagar, ligado a la sesión de Stripe:
--    Stripe ya no pide la dirección (la pedimos nosotros), así que el aviso de pago
--    la lee de aquí. Va en tabla y no en los metadatos de Stripe (500 caracteres por valor).
CREATE TABLE IF NOT EXISTS checkout_direcciones (
  stripe_session_id text PRIMARY KEY,
  envio jsonb,
  facturacion jsonb,
  telefono text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_direcciones_creado_idx ON checkout_direcciones (created_at);

-- 3) El pedido guarda a quién se factura y con qué NIF (copia: si cambia su dirección
--    mañana, esta factura sigue diciendo lo de hoy).
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS direccion_facturacion jsonb;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprador_nif text;

-- 4) El botón de compra de una base de datos tiene cuatro formas (comprar, cesta, donar,
--    donación con recompensa). El producto que hay detrás guarda cuál: de ello depende
--    cómo se cobra (una donación no lleva IVA y la cantidad la pone quien dona).
ALTER TABLE products ADD COLUMN IF NOT EXISTS bd_modo text;
