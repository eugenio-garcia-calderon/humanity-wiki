-- 2026-11-05 (Eugenio): «haz que cualquier persona sin necesidad de
-- registrarse pueda editar el contenido desde este enlace».
--
-- Abrir la edición a cualquiera sin cuenta solo es razonable si todo cambio se
-- puede deshacer: por eso nace el historial (Constitución, regla 4: «toda
-- modificación genera historial», que hasta hoy este calendario no cumplía).
--
-- Una copia del mes ANTES de cambiarlo, como mucho una cada 10 minutos
-- mientras se edita (el autoguardado escribe cada segundo; una fila por
-- pulsación serían miles al día) y siempre antes de restaurar o volver al
-- original. Se guardan las últimas 300 por mes.
--
-- Qué NO se guarda: la IP ni nada que identifique a quien editó sin cuenta.
-- Esta tabla viaja cada noche en la copia de seguridad.
CREATE TABLE IF NOT EXISTS calendario_arte_historial (
  id            serial PRIMARY KEY,
  anio          integer NOT NULL,
  mes           integer NOT NULL CHECK (mes BETWEEN 0 AND 12),
  contenido     jsonb   NOT NULL,
  referencias   jsonb   NOT NULL,
  version       integer NOT NULL,
  -- Quién dejó el mes así. Nulo = visitante sin cuenta (o cuenta borrada).
  autor_user_id text    REFERENCES users(id) ON DELETE SET NULL,
  motivo        text    NOT NULL DEFAULT 'edición',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calendario_arte_historial_mes_idx ON calendario_arte_historial(anio, mes, created_at DESC);
CREATE INDEX IF NOT EXISTS calendario_arte_historial_autor_idx ON calendario_arte_historial(autor_user_id);

-- Quién guardó por última vez: ahora puede ser nadie con cuenta.
-- (`updated_by` ya admitía nulos; esto solo lo deja escrito.)
COMMENT ON COLUMN calendario_arte_meses.updated_by IS 'Nulo = visitante sin cuenta (edición abierta desde 2026-11-05).';
