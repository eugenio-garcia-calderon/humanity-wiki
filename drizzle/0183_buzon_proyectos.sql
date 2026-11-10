-- 2026-11-10 (Eugenio): the «Modelo socioeconómico optimizado» project gets a
-- mailbox for improvements, like the consciousness map and the Aeromóvil.
--
-- Those two each have their own table (`aeromovil_tareas`,
-- `conciencia_comentarios`) with the same shape. Instead of a third copy, this
-- is ONE table for every project page that wants a mailbox, keyed by
-- `proyecto`. The server only accepts the project keys it knows
-- (`PROYECTOS` in src/server/buzonProyectos.ts), so nobody can open a mailbox
-- for a name of their own. Moving the two older tables here is logged as debt
-- (memory/09_TARGET_ARCHITECTURE/02_TECH_DEBT.md).
--
-- Anyone can write without an account (held up by a per-IP brake, a honeypot
-- field and a cap on pending items); an administrator marks each item done or
-- discarded. What is NOT stored: the IP or any contact detail. `autor` is the
-- name the person chose to type, if any. This table travels in the nightly backup.
CREATE TABLE IF NOT EXISTS buzon_proyectos (
  id            serial PRIMARY KEY,
  proyecto      text NOT NULL,
  texto         text NOT NULL,
  autor         text,
  autor_user_id text REFERENCES users(id) ON DELETE SET NULL,
  estado        text NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'hecha', 'descartada')),
  respuesta     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  resuelto_at   timestamptz
);
CREATE INDEX IF NOT EXISTS buzon_proyectos_estado_idx ON buzon_proyectos(proyecto, estado, created_at DESC);
CREATE INDEX IF NOT EXISTS buzon_proyectos_autor_idx ON buzon_proyectos(autor_user_id);
