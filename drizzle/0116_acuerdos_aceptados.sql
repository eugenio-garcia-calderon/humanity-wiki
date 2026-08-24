-- ============================================================================
-- 0116 — Acuerdos aceptados: quién firmó qué y cuándo (2026-08-24)
-- ============================================================================
-- Eugenio (24-08): «crea tú esos contratos como si fueses mi asesor». El
-- contrato de servicio de cobro es el que permite que la plataforma cobre un
-- carrito de varias tiendas y luego liquide a cada una.
--
-- UN CONTRATO QUE NO SE PUEDE PROBAR NO VALE. Por eso esto no es un `boolean`
-- en `users`: se guarda QUÉ VERSIÓN aceptó cada persona, cuándo, desde qué IP
-- y con qué navegador. Si mañana el contrato cambia, las aceptaciones viejas
-- siguen diciendo lo que se aceptó entonces — que es justo lo que hay que
-- poder demostrar. Solo-añadir: nunca se edita una fila.
CREATE TABLE IF NOT EXISTS acuerdos_aceptados (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Qué acuerdo: 'cobro' (mandato de cobro), y los que vengan.
  acuerdo     text NOT NULL,
  version     text NOT NULL,
  ip          text,
  user_agent  text,
  created_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS acuerdos_aceptados_user_idx ON acuerdos_aceptados (user_id, acuerdo, created_at DESC);
-- La misma versión del mismo acuerdo no se firma dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS acuerdos_aceptados_una_vez_idx ON acuerdos_aceptados (user_id, acuerdo, version);
