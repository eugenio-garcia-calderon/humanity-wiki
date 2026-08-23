-- ============================================================================
-- 0111 — «Avísame cuando vuelva» (2026-08-23, comercio F5)
-- ============================================================================
-- Quien quiere algo agotado deja dicho que le avisen. Una fila por persona,
-- producto y variante (la variante vacía '' es «sin variante»); cuando vuelve
-- a haber stock, el barrido del comercio avisa UNA vez (`avisado_at`) y la
-- fila se queda como memoria: si se vuelve a agotar y a reponer, no se repite
-- salvo que la persona lo pida otra vez (borra y vuelve a pedir).
CREATE TABLE IF NOT EXISTS avisos_stock (
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  producto_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variante_id text,
  created_at  timestamp NOT NULL DEFAULT now(),
  avisado_at  timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS avisos_stock_persona_producto_variante_idx ON avisos_stock (user_id, producto_id, coalesce(variante_id, ''));
CREATE INDEX IF NOT EXISTS avisos_stock_pendientes_idx ON avisos_stock (producto_id) WHERE avisado_at IS NULL;
