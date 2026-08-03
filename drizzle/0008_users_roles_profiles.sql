-- Fase 2 — Usuarios, roles y perfiles
--
-- Implementa 06_SOCIAL_NETWORK.md (4 niveles de usuario, perfil completo) y
-- la parte de usuarios de 04_DATABASE.md.
--
-- Niveles de rol (06_SOCIAL_NETWORK.md):
--   0  visitante no registrado (no existe fila: solo consulta)
--   1  usuario           -> publicar, comentar, reaccionar, seguir
--   2  usuario verificado-> + crear retos/soluciones/productos/demandas en su territorio
--   3  generador         -> + revisar contenido y crear en cualquier territorio
--   4  administrador     -> todo

-- ---------------------------------------------------------------------------
-- users: credenciales, rol y perfil
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_level integer NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

-- Perfil (06_SOCIAL_NETWORK.md + petición del usuario)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS socials jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id text REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reputation integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS impact_score integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamp;

CREATE INDEX IF NOT EXISTS users_role_level_idx ON users (role_level);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (lower(email));

-- ---------------------------------------------------------------------------
-- Territorios / objetivos / indicadores del perfil
-- ---------------------------------------------------------------------------
-- "Territorios donde trabaja", "objetivos favoritos", "indicadores favoritos".
-- Relaciones explícitas por id (principio 8 de la Constitución), nunca texto.
CREATE TABLE IF NOT EXISTS user_territories (
  user_id text NOT NULL REFERENCES users(id),
  territory_id text NOT NULL REFERENCES territories(id),
  PRIMARY KEY (user_id, territory_id)
);

CREATE TABLE IF NOT EXISTS user_objectives (
  user_id text NOT NULL REFERENCES users(id),
  objective_id text NOT NULL REFERENCES objectives(id),
  PRIMARY KEY (user_id, objective_id)
);

CREATE TABLE IF NOT EXISTS user_indicators (
  user_id text NOT NULL REFERENCES users(id),
  indicator_id text NOT NULL REFERENCES indicators(id),
  PRIMARY KEY (user_id, indicator_id)
);

-- ---------------------------------------------------------------------------
-- Sesiones
-- ---------------------------------------------------------------------------
-- Token opaco aleatorio en cookie httpOnly, no JWT: permite revocar una sesión
-- concreta al instante (cerrar sesión, expulsar un dispositivo) sin esperar a
-- que caduque un token firmado, y deja rastro auditable de accesos, que es lo
-- que pide el principio de trazabilidad.
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL,
  last_seen_at timestamp NOT NULL DEFAULT now(),
  user_agent text,
  ip text,
  revoked_at timestamp
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Recuperación de contraseña
-- ---------------------------------------------------------------------------
-- La estructura se crea ahora aunque todavía no haya proveedor de correo
-- configurado (decisión del usuario: "el tema del correo avanza sin
-- verificación primero"), siguiendo el patrón ya usado con marcadores y
-- métricas: construir la estructura antes de tener el canal real.
CREATE TABLE IF NOT EXISTS password_resets (
  token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  expires_at timestamp NOT NULL,
  used_at timestamp
);

CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets (user_id);
