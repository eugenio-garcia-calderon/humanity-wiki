-- ============================================================================
-- 0108 — Carrito abandonado y favoritos (2026-08-23, comercio segunda vuelta, F3)
-- ============================================================================
-- 1. La cesta guardada: una fila por persona y tienda con las líneas tal como
--    están en el navegador. Sirve para dos cosas: recuperar la cesta en otro
--    dispositivo, y avisar («dejaste 3 cosas en la cesta de X») a las 24 h
--    sin comprar, UNA vez por cesta (`avisada_at`). Se borra al vaciarla o al
--    comprar. Sin sesión no hay fila: no se persigue a nadie anónimo.
CREATE TABLE IF NOT EXISTS cestas_guardadas (
  user_id    text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tienda     text NOT NULL,
  lineas     jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamp NOT NULL DEFAULT now(),
  avisada_at timestamp,
  PRIMARY KEY (user_id, tienda)
);
CREATE INDEX IF NOT EXISTS cestas_guardadas_tienda_idx ON cestas_guardadas (tienda, updated_at);

-- 2. Favoritos (lista de deseos): qué guardó cada persona y a qué precio, para
--    avisar cuando el precio baje. El precio guardado se pone al día con cada
--    aviso, así que una segunda bajada vuelve a avisar.
CREATE TABLE IF NOT EXISTS favoritos_productos (
  user_id         text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  producto_id     text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  precio_centimos integer,
  created_at      timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, producto_id)
);
CREATE INDEX IF NOT EXISTS favoritos_productos_producto_idx ON favoritos_productos (producto_id);
