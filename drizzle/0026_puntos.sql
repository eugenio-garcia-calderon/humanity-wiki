-- PUNTOS DE HUMANITY.WIKI (2026-08-08, user request): un sistema de puntos
-- interno — "en un futuro serán puntos tokenizados con blockchain, de
-- momento es un sistema de puntos interno" — que sirve ya para comprar
-- dentro de la app y usar la IA, con saldo decimal (céntimos de punto).
--
-- El saldo vive en `users.puntos` con DEFAULT 100: Postgres aplica el valor
-- por defecto también a las filas YA existentes al añadir la columna (fast
-- default, PG 11+), así que da de alta a cada usuario registrado hoy con
-- 100 puntos en la misma sentencia que da de alta a los que se registren
-- mañana — sin backfill aparte para el número, solo para su justificante.
ALTER TABLE users ADD COLUMN IF NOT EXISTS puntos numeric(12,2) NOT NULL DEFAULT 100;

-- El libro de movimientos: cada alta, compra o céntimo ganado por una vista
-- queda con su motivo — la misma exigencia de procedencia que pide
-- src/db/CLAUDE.md para cualquier dato, aplicada aquí al dinero interno.
CREATE TABLE IF NOT EXISTS movimientos_puntos (
  id             text PRIMARY KEY,
  user_id        text NOT NULL REFERENCES users(id),
  cantidad       numeric(12,2) NOT NULL,   -- positivo = ingreso, negativo = gasto
  motivo         text NOT NULL,
  entidad_tipo   text,
  entidad_id     text,
  stripe_checkout_session_id text,
  created_at     timestamp NOT NULL DEFAULT now(),
  CONSTRAINT movimientos_puntos_motivo_check CHECK (
    motivo IN ('regalo_bienvenida', 'compra', 'vista_publicacion', 'gasto_ia', 'ajuste_admin')
  )
);
CREATE INDEX IF NOT EXISTS movimientos_puntos_user_idx ON movimientos_puntos (user_id, created_at DESC);

-- El justificante del regalo de bienvenida para quien YA tenía cuenta antes
-- de esta migración (los que se registren desde ahora lo reciben en el mismo
-- código que los da de alta — ver src/server/auth.ts).
INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo)
SELECT 'MPWELCOME' || u.id, u.id, 100, 'regalo_bienvenida'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM movimientos_puntos m WHERE m.user_id = u.id AND m.motivo = 'regalo_bienvenida'
);
