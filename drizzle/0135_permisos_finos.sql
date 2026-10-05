-- ============================================================================
-- PERMISOS FINOS POR PÁGINA (2026-10-05, carril «acceso», #12)
-- ============================================================================
-- Eugenio quiere igualar a Notion: cuatro roles (Ver, Comentar, Editar,
-- Administrar), invitar por correo a quien todavía no tiene cuenta, dar acceso
-- a un equipo de una vez y que una página hija herede de su madre salvo que se
-- cambie. Lo de antes (0131) era «lectura» o «edición» y por persona.
--
-- ── LOS ROLES, PARA QUE NO HAYA DOS LECTURAS ───────────────────────────────
--   · 'ver'      la ve aunque sea privada.
--   · 'comentar' además comenta (y responde, resuelve sus hilos).
--   · 'editar'   además cambia el contenido. No borra la página.
--   · 'admin'    además decide quién entra (personas, equipos, invitaciones).
--                Sigue sin poder borrarla ni publicarla en la web: eso es de
--                quien la creó. Dar «Administrar» es delegar la puerta, no
--                regalar la casa.
-- Los dos nombres viejos se traducen aquí, una vez, y desaparecen: dos
-- palabras para lo mismo son dos verdades que acaban separándose.

ALTER TABLE accesos_entidad DROP CONSTRAINT IF EXISTS accesos_entidad_rol_check;
UPDATE accesos_entidad SET rol = 'ver' WHERE rol = 'lectura';
UPDATE accesos_entidad SET rol = 'editar' WHERE rol = 'edicion';
ALTER TABLE accesos_entidad ADD CONSTRAINT accesos_entidad_rol_check
  CHECK (rol IN ('ver', 'comentar', 'editar', 'admin'));
-- `otorgado_por` es clave foránea y no tenía índice (regla de drizzle/CLAUDE.md).
CREATE INDEX IF NOT EXISTS accesos_entidad_otorgado_por ON accesos_entidad (otorgado_por);

-- ── EQUIPOS ─────────────────────────────────────────────────────────────────
-- Un grupo de personas con nombre («Diseño», «Junta»), al que se le da acceso
-- a una página de una vez. Entrar en el equipo es entrar en todo lo que el
-- equipo ve; salir, lo mismo al revés. No es `grupos_personas` (0048): aquello
-- agrupa contactos de la agenda, que no tienen por qué tener cuenta.
CREATE TABLE IF NOT EXISTS equipos (
  id               text PRIMARY KEY,
  nombre           text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 80),
  icono            text,
  descripcion      text,
  creador_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  archived_at      timestamptz
);
CREATE INDEX IF NOT EXISTS equipos_creador ON equipos (creador_user_id);

CREATE TABLE IF NOT EXISTS equipo_miembros (
  equipo_id    text NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'admin' gestiona quién está en el equipo. Quien lo crea nace admin.
  rol          text NOT NULL DEFAULT 'miembro' CHECK (rol IN ('miembro', 'admin')),
  anadido_por  text REFERENCES users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (equipo_id, user_id)
);
CREATE INDEX IF NOT EXISTS equipo_miembros_usuario ON equipo_miembros (user_id);
CREATE INDEX IF NOT EXISTS equipo_miembros_anadido_por ON equipo_miembros (anadido_por);

-- El acceso de un equipo: la misma forma genérica que `accesos_entidad`.
CREATE TABLE IF NOT EXISTS accesos_equipo (
  entidad_tipo  text NOT NULL,
  entidad_id    text NOT NULL,
  equipo_id     text NOT NULL REFERENCES equipos(id) ON DELETE CASCADE,
  rol           text NOT NULL CHECK (rol IN ('ver', 'comentar', 'editar', 'admin')),
  otorgado_por  text REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad_tipo, entidad_id, equipo_id)
);
CREATE INDEX IF NOT EXISTS accesos_equipo_equipo ON accesos_equipo (equipo_id);
CREATE INDEX IF NOT EXISTS accesos_equipo_otorgado_por ON accesos_equipo (otorgado_por);

-- ── INVITACIONES A QUIEN AÚN NO TIENE CUENTA ───────────────────────────────
-- Se guarda el correo y el rol. Se cumple sola el día que alguien entra con
-- ese correo (al crear la sesión, ver `cumplirInvitaciones`): no hace falta
-- ningún enlace ni ningún token, porque lo que prueba que eres tú es haber
-- entrado en la cuenta de ese correo.
CREATE TABLE IF NOT EXISTS invitaciones_acceso (
  id            text PRIMARY KEY,
  entidad_tipo  text NOT NULL,
  entidad_id    text NOT NULL,
  email         text NOT NULL CHECK (email = lower(email) AND position('@' in email) > 1),
  rol           text NOT NULL CHECK (rol IN ('ver', 'comentar', 'editar', 'admin')),
  invitado_por  text REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  cumplida_en   timestamptz,
  cumplida_por  text REFERENCES users(id) ON DELETE SET NULL
);
-- Una invitación viva por correo y cosa: invitar dos veces cambia el rol.
CREATE UNIQUE INDEX IF NOT EXISTS invitaciones_acceso_viva
  ON invitaciones_acceso (entidad_tipo, entidad_id, email) WHERE cumplida_en IS NULL;
-- «¿Qué me espera a mí?», la pregunta de cada inicio de sesión.
CREATE INDEX IF NOT EXISTS invitaciones_acceso_email ON invitaciones_acceso (email) WHERE cumplida_en IS NULL;
CREATE INDEX IF NOT EXISTS invitaciones_acceso_invitado_por ON invitaciones_acceso (invitado_por);
CREATE INDEX IF NOT EXISTS invitaciones_acceso_cumplida_por ON invitaciones_acceso (cumplida_por);

-- ── HERENCIA ────────────────────────────────────────────────────────────────
-- Sin fila = hereda, que es lo normal. Una fila con `hereda = false` dice
-- «esta página tiene sus propios permisos»: no recibe los de su madre.
CREATE TABLE IF NOT EXISTS accesos_herencia (
  entidad_tipo  text NOT NULL,
  entidad_id    text NOT NULL,
  hereda        boolean NOT NULL DEFAULT true,
  cambiado_por  text REFERENCES users(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad_tipo, entidad_id)
);
CREATE INDEX IF NOT EXISTS accesos_herencia_cambiado_por ON accesos_herencia (cambiado_por);
