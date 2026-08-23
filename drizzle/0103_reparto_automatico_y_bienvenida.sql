-- ============================================================================
-- 0103 — Reparto automático, bienvenida de 5.000 y «días de uso» (2026-08-23)
-- ============================================================================
-- Eugenio: «haz que sea automático el reparto de puntos, y también que el
-- usuario nuevo tenga 5000 puntos iniciales, y que reciba 1000 puntos al mes
-- fijo si está activo y usando la plataforma al menos 3 veces al mes, y luego
-- variables en función de su reputación social».
--
-- 1. El saldo deja de nacer por el DEFAULT de la columna (100, migración 0026).
--    Desde ahora el regalo de bienvenida lo pone UNA sola función del servidor
--    (`registrarRegaloBienvenida`) en una transacción: columna y apunte del
--    libro a la vez, con la cifra de `PUNTOS_BIENVENIDA` (5.000). Con el
--    DEFAULT en 0 la cifra vive en un solo sitio y libro y columna no pueden
--    discrepar por cambiarla. Las cuentas que ya existen no se tocan: su 100
--    sigue cuadrado con su apunte.
ALTER TABLE users ALTER COLUMN puntos SET DEFAULT 0;

-- 2. Días de uso: una fila por persona y día con alguna petición con sesión
--    (la pone el middleware de sesión). Es lo mínimo para que «activo: al
--    menos 3 días al mes» sea comprobable; no guarda qué hizo nadie, solo que
--    estuvo. El reparto lee de aquí: activo en el mes = count(dia) ≥ 3.
CREATE TABLE IF NOT EXISTS actividad_diaria (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dia     date NOT NULL DEFAULT current_date,
  PRIMARY KEY (user_id, dia)
);
CREATE INDEX IF NOT EXISTS actividad_diaria_dia_idx ON actividad_diaria (dia);

-- 3. Relleno del MES EN CURSO con lo que ya sabemos (sesiones abiertas o
--    vistas, vistas válidas, reacciones y comentarios): para que el mes del
--    despliegue no empiece de cero y nadie pierda el fijo por una tabla recién
--    nacida. Solo de este mes hacia atrás no: antes no había nada que pagar.
INSERT INTO actividad_diaria (user_id, dia)
SELECT DISTINCT x.user_id, x.dia FROM (
  SELECT user_id, created_at::date   AS dia FROM sessions       WHERE created_at   >= date_trunc('month', now())
  UNION ALL
  SELECT user_id, last_seen_at::date AS dia FROM sessions       WHERE last_seen_at >= date_trunc('month', now())
  UNION ALL
  SELECT user_id, dia                        FROM vistas_validas WHERE dia          >= date_trunc('month', now())::date
  UNION ALL
  SELECT user_id, created_at::date   AS dia FROM reactions      WHERE created_at   >= date_trunc('month', now())
  UNION ALL
  SELECT author_user_id, created_at::date   FROM comments       WHERE created_at   >= date_trunc('month', now())
) x JOIN users u ON u.id = x.user_id
WHERE x.user_id IS NOT NULL AND x.dia IS NOT NULL
ON CONFLICT DO NOTHING;
