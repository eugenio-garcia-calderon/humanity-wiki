-- 2026-11-05 (Eugenio): «un botón de crear nuevo diseño en cada una de las
-- imágenes… que se quede ahí cargando, te diga el tiempo estimado y cuando esté
-- listo aparezca un mensaje de diseño listo».
--
-- El botón NO llama a ninguna IA: apunta el encargo aquí. Lo dibuja una tarea
-- programada de Claude en la cuenta de Eugenio, que pasa cada hora, se anota en
-- `calendario_arte_robot`, toma los encargos «en_cola», los dibuja, sube la
-- imagen por `/api/calendario-arte/subir` y marca el encargo «listo».
-- (Una suscripción no puede atender peticiones de terceros desde un servidor:
-- https://code.claude.com/docs/en/legal-and-compliance)
--
-- Sin datos personales: ni IP ni cuenta de quien lo pidió. El freno por IP vive
-- en `frenos`, que se barre solo.
CREATE TABLE IF NOT EXISTS calendario_arte_disenos (
  id            serial PRIMARY KEY,
  anio          integer NOT NULL,
  mes           integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  prompt        text NOT NULL,
  -- en_cola → dibujando → listo | error ; listo → descartado (y vuelta)
  estado        text NOT NULL DEFAULT 'en_cola'
                CHECK (estado IN ('en_cola', 'dibujando', 'listo', 'error', 'descartado')),
  url           text,
  nota          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  empezado_at   timestamptz,
  terminado_at  timestamptz
);
CREATE INDEX IF NOT EXISTS calendario_arte_disenos_anio ON calendario_arte_disenos (anio, estado);

-- Una sola fila: cuándo pasó por última vez el dibujante automático. Con eso se
-- calcula la hora estimada que ve quien pide un diseño.
CREATE TABLE IF NOT EXISTS calendario_arte_robot (
  id             integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ultima_pasada  timestamptz,
  intervalo_min  integer NOT NULL DEFAULT 60
);
