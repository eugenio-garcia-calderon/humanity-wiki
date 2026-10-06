-- ============================================================================
-- API PÚBLICA Y WEBHOOKS (2026-10-06, carril «espacio», #24)
-- ============================================================================
-- CLAVES DE API. Lo que se guarda es el hash SHA-256 de la clave entera, nunca
-- la clave: se enseña UNA vez al crearla y no hay forma de recuperarla. Vale
-- SHA-256 a secas (y no un hash lento como bcrypt) porque la clave no es una
-- contraseña elegida por una persona sino 32 bytes aleatorios: no hay
-- diccionario que probar. `prefijo` son los primeros caracteres, para que la
-- lista diga «hw_live_ab12…» y se pueda reconocer cuál es cuál.
CREATE TABLE IF NOT EXISTS api_claves (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  prefijo     text NOT NULL,
  hash        text NOT NULL UNIQUE,
  alcance     text NOT NULL CHECK (alcance IN ('lectura', 'escritura')),
  creada_en   timestamp NOT NULL DEFAULT now(),
  ultimo_uso  timestamp,
  revocada_en timestamp
);
CREATE INDEX IF NOT EXISTS api_claves_user_idx ON api_claves (user_id);

-- LÍMITE DE TASA, en Postgres y no en memoria (misma razón que `frenos`: con
-- varios procesos, un contador en memoria multiplicaría el límite sin avisar).
-- Una fila por clave y minuto.
CREATE TABLE IF NOT EXISTS api_uso (
  clave_id text NOT NULL REFERENCES api_claves(id) ON DELETE CASCADE,
  minuto   timestamp NOT NULL,
  n        integer NOT NULL DEFAULT 0,
  PRIMARY KEY (clave_id, minuto)
);

-- WEBHOOKS SALIENTES. `secreto` hay que poder leerlo para firmar cada envío,
-- así que no se guarda como hash; se enseña al crear y al regenerar.
-- `tabla_id` limita el webhook a una base de datos (null = todas las tuyas).
CREATE TABLE IF NOT EXISTS webhooks (
  id            text PRIMARY KEY,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url           text NOT NULL,
  secreto       text NOT NULL,
  eventos       text[] NOT NULL,
  tabla_id      text,
  activo        boolean NOT NULL DEFAULT true,
  motivo_pausa  text,
  fallos_seguidos integer NOT NULL DEFAULT 0,
  creado_en     timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhooks_user_idx ON webhooks (user_id);

-- LA COLA Y EL REGISTRO DE ENTREGAS, en una sola tabla: una entrega nace
-- `pendiente`, y termina `ok` o `fallo` (agotados los reintentos), con lo que
-- pasó en cada intento a la vista.
CREATE TABLE IF NOT EXISTS webhook_entregas (
  id              text PRIMARY KEY,
  webhook_id      text NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  evento          text NOT NULL,
  payload         jsonb NOT NULL,
  estado          text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'ok', 'fallo')),
  intentos        integer NOT NULL DEFAULT 0,
  proximo_intento timestamp NOT NULL DEFAULT now(),
  ultimo_codigo   integer,
  ultimo_error    text,
  creada_en       timestamp NOT NULL DEFAULT now(),
  entregada_en    timestamp
);
CREATE INDEX IF NOT EXISTS webhook_entregas_webhook_idx ON webhook_entregas (webhook_id, creada_en DESC);
CREATE INDEX IF NOT EXISTS webhook_entregas_cola_idx ON webhook_entregas (proximo_intento) WHERE estado = 'pendiente';
