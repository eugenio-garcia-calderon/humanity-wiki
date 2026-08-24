-- ============================================================================
-- 0117 — Las cifras del dinero, en un solo sitio y ajustables (2026-08-24)
-- ============================================================================
-- Eugenio (24-08): «créame en Administración una página que me permita saber
-- todas las variables económicas de la plataforma y ajustarlas desde ese
-- dashboard, y que cuando la modifique de ahí se cambie en todos los lugares».
--
-- Hasta hoy cada cifra (comisión, bienvenida, reparto, caducidad…) vivía en
-- una variable de entorno del servidor: para cambiar un número había que
-- desplegar, y nadie podía ver todas juntas. Eso además hacía imposible
-- contestar «¿qué comisión había en marzo?».
--
-- DOS TABLAS Y NO UNA, y es a propósito:
--   · `ajustes_economicos` es el valor VIGENTE de cada cifra. Una fila por
--     clave. Es lo que lee el servidor.
--   · `ajustes_economicos_historial` es de SOLO AÑADIR: cada cambio deja
--     quién, cuándo, de qué valor a cuál y por qué. Las cifras del dinero se
--     cambian pocas veces y se preguntan mucho tiempo después.
-- El valor por defecto NO vive aquí: vive en el código (`src/server/ajustes.ts`),
-- para que una base de datos vacía siga arrancando con cifras sensatas.
CREATE TABLE IF NOT EXISTS ajustes_economicos (
  clave           text PRIMARY KEY,
  valor           text NOT NULL,
  actualizado_por text REFERENCES users(id) ON DELETE SET NULL,
  updated_at      timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ajustes_economicos_historial (
  id          text PRIMARY KEY,
  clave       text NOT NULL,
  valor_antes text,
  valor_nuevo text NOT NULL,
  motivo      text,
  actor       text REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ajustes_historial_clave_idx ON ajustes_economicos_historial (clave, created_at DESC);

-- LA DECISIÓN DE EUGENIO DEL 24-08: la comisión pasa del 5 % al 12 % en euros
-- y del 2,5 % al 10 % en puntos. Se escribe aquí como valor vigente para que
-- entre en vigor con la migración, y queda en el historial con su motivo —
-- una comisión que cambia sin dejar rastro es una comisión que nadie puede
-- explicar después.
INSERT INTO ajustes_economicos (clave, valor) VALUES
  ('COMISION_BPS', '1200'),
  ('PUNTOS_COMISION_BPS', '1000')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

INSERT INTO ajustes_economicos_historial (id, clave, valor_antes, valor_nuevo, motivo)
VALUES
  ('AJH_INICIAL_EUR', 'COMISION_BPS', '500', '1200', 'Decisión de Eugenio del 24-08-2026: la comisión del mercado pasa del 5 % al 12 %.'),
  ('AJH_INICIAL_PTS', 'PUNTOS_COMISION_BPS', '250', '1000', 'Decisión de Eugenio del 24-08-2026: la comisión pagando con puntos pasa del 2,5 % al 10 %.')
ON CONFLICT (id) DO NOTHING;
