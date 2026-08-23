-- ============================================================================
-- 0104 — Caducidad (10 años) e inactividad (24 meses) de los puntos (2026-08-23)
-- ============================================================================
-- Decisión de Eugenio (22-08): «caducidad de 10 años; si usuario no activo en
-- 24 meses, entonces pierde saldo». Los términos (Avisos legales, v1.0) lo
-- recogen. Aquí solo nacen los dos motivos del libro: las pérdidas son
-- apuntes CONTRARIOS (negativos), como toda corrección — el libro sigue
-- siendo de solo añadir y la historia de cada punto se lee entera.
--   · `caducidad`          — la parte del saldo más antigua que 10 años (los
--                            puntos se gastan por orden de llegada, así que
--                            lo que queda es lo más reciente: caduca
--                            max(0, saldo − ingresos de los últimos 10 años)).
--   · `perdida_inactividad` — el saldo entero de una cuenta sin señal de vida
--                            en 24 meses.
-- El barrido que los escribe nace APAGADO (`PUNTOS_CADUCIDAD`): `off` calcula
-- y canta, `avisar` solo avisa por la campana (30 y 7 días antes; 90 días
-- antes para caducidad), `on` avisa y ejecuta. Lo enciende Eugenio.
ALTER TABLE movimientos_puntos DROP CONSTRAINT IF EXISTS movimientos_puntos_motivo_check;
ALTER TABLE movimientos_puntos ADD CONSTRAINT movimientos_puntos_motivo_check CHECK (
  motivo IN (
    'regalo_bienvenida', 'compra', 'vista_publicacion', 'gasto_ia', 'ajuste_admin',
    'transferencia_enviada', 'transferencia_recibida', 'saldo_inicial', 'gasto_servicio',
    'compra_con_puntos', 'venta_en_puntos', 'comision_puntos', 'devolucion_puntos',
    'reparto_mensual', 'caducidad', 'perdida_inactividad'
  )
);
-- Para «¿ya le avisé de esto?»: los avisos de puntos llevan entity_type
-- 'puntos' y una clave en entity_id; esta consulta es la que se repite.
CREATE INDEX IF NOT EXISTS notifications_puntos_clave_idx ON notifications (user_id, type, entity_id) WHERE entity_type = 'puntos';
