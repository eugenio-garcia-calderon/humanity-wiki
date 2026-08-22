-- COMISIÓN DE LA PLATAFORMA EN PUNTOS, A LA MITAD (2026-08-23, Eugenio:
-- «se les hace un 50 % de descuento en la comisión cuando utilizan un sistema
-- de intercambio de puntos en vez de moneda fiat»).
--
-- Cuando una venta se cobra en puntos, la plataforma se queda el 2,5 % en
-- puntos (la mitad del 5 % de las ventas en euros). Para que ese 2,5 % exista
-- en el libro hace falta una CUENTA DE LA PLATAFORMA que lo reciba: una fila de
-- `users` que no es una persona — no entra, no tiene contraseña válida, no
-- sale en listados públicos (archived_at nulo pero role 0 y correo interno).
-- Cada apunte de comisión lleva el pedido como entidad, así que la
-- trazabilidad es la misma que la de cualquier otro movimiento.
INSERT INTO users (id, email, name, display_name, password_hash, role_level, email_verified, created_by, puntos)
VALUES ('U_PLATAFORMA', 'plataforma@humanity.wiki', 'Humanity.wiki', 'Humanity.wiki (plataforma)', 'no-entra', 0, true, 'U_PLATAFORMA', 0)
ON CONFLICT (id) DO NOTHING;

-- El motivo del apunte de comisión (positivo en la cuenta de la plataforma;
-- el vendedor cobra su venta ya neta, así que no hay apunte negativo aparte:
-- el libro dice lo que cada uno recibió, que es la verdad).
ALTER TABLE movimientos_puntos DROP CONSTRAINT IF EXISTS movimientos_puntos_motivo_check;
ALTER TABLE movimientos_puntos ADD CONSTRAINT movimientos_puntos_motivo_check CHECK (
  motivo IN (
    'regalo_bienvenida', 'compra', 'vista_publicacion', 'gasto_ia', 'ajuste_admin',
    'transferencia_enviada', 'transferencia_recibida', 'saldo_inicial', 'gasto_servicio',
    'compra_con_puntos', 'venta_en_puntos', 'comision_puntos'
  )
);
