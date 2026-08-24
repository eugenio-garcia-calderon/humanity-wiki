-- ============================================================================
-- 0113 — La devolución la pide el comprador · «preparando» · fecha estimada
-- (2026-08-24, comercio F7; Eugenio: «sí, que la pida el comprador»)
-- ============================================================================
-- Hasta hoy solo el vendedor podía marcar un pedido como devuelto: quien había
-- comprado tenía que escribirle y confiar. Ahora lo pide quien compró, con un
-- motivo, y el vendedor acepta o rechaza diciendo por qué. Los puntos vuelven
-- SOLO al aceptar.
--
-- Tabla y no columnas: una devolución rechazada y otra pedida después son dos
-- hechos distintos, y el libro de esta casa es de solo añadir. La última fila
-- manda; las anteriores cuentan lo que pasó.
CREATE TABLE IF NOT EXISTS devoluciones (
  id            text PRIMARY KEY,
  pedido_id     text NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  pedida_por    text REFERENCES users(id) ON DELETE SET NULL,
  -- Quien compró sin cuenta también puede pedirla: se identifica con su correo
  -- y su código, igual que para ver el pedido.
  pedida_email  text,
  motivo        text NOT NULL,
  estado        text NOT NULL DEFAULT 'pedida' CHECK (estado IN ('pedida', 'aceptada', 'rechazada')),
  respuesta     text,
  resuelta_por  text REFERENCES users(id) ON DELETE SET NULL,
  resuelta_en   timestamp,
  created_at    timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS devoluciones_pedido_idx ON devoluciones (pedido_id, created_at DESC);
-- Una petición viva por pedido: no se piden tres devoluciones del mismo.
CREATE UNIQUE INDEX IF NOT EXISTS devoluciones_una_viva_idx ON devoluciones (pedido_id) WHERE estado = 'pedida';

-- LA FECHA ESTIMADA DE ENTREGA. La pone el vendedor; el comprador la ve en su
-- pedido. Nula = no la ha dicho, y entonces no se enseña ninguna: inventar una
-- fecha de entrega es prometer en nombre de otro.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entrega_estimada date;

-- «PREPARANDO»: el hueco entre «pagado» y «enviado». Sin él, un pedido que
-- alguien está empaquetando parece un pedido olvidado.
--
-- El estado SÍ tiene una restricción en la base (`pedidos_estado_check`), y
-- hay que ampliarla: sin esto, marcar «preparando» falla con un error de
-- Postgres que nadie entiende. Lo cazó la prueba en local; el comentario que
-- había aquí antes decía lo contrario y era falso.
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN ('pagado', 'preparando', 'enviado', 'entregado', 'devuelto', 'cancelado'));
