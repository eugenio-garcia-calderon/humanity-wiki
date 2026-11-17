-- 2026-11-17 (Eugenio): «permite añadir un comentario en cada una de ellas [las secciones: motor gasolina, motor
-- eléctrico, morro, cola…] para poder tomar notas de cosas importantes… que ese comentario tenga una fecha y un autor.
-- Si está registrado en la página… se podrá saber quién es el autor, si no será anónimo».
--
-- One row per note. Not a junction table: a note is its own thing, with text and an author.
--
-- ── WHERE A NOTE BELONGS ────────────────────────────────────────────────────
-- `diseno_id` + `vehiculo` + `seccion`: the saved design that was open, the vehicle family (`disposicion`), and the
-- section's title as the panel shows it («Motor de gasolina», «Morro»). With no saved design open, `diseno_id` is NULL
-- and the note belongs to the vehicle family. Notes travel with the design: whoever opens it, on any device, sees them.
--
-- ── THE AUTHOR IS AN ID, NOT A NAME ─────────────────────────────────────────
-- Only `created_by` is stored; the name is read from `users` when the note is shown. In tomorrow's backup this table
-- holds text and an opaque id, and when an account is emptied (`vaciarCuentas.ts`) its notes read «Usuario eliminado»
-- with nothing to clean here. Notes need a session (src/server/aeromovilNotas.ts): an anonymous note stays in the
-- browser that wrote it and never reaches this table.
CREATE TABLE IF NOT EXISTS aeromovil_notas (
  id          serial PRIMARY KEY,
  diseno_id   integer REFERENCES aeromovil_disenos(id) ON DELETE CASCADE,
  vehiculo    text    NOT NULL CHECK (vehiculo IN ('cuatro', 'rombo', 'bala', 'triciclo', 'basculante')),
  seccion     text    NOT NULL CHECK (char_length(seccion) BETWEEN 1 AND 120),
  texto       text    NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 2000),
  created_by  text    REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz,
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS aeromovil_notas_destino_idx ON aeromovil_notas(diseno_id, vehiculo) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS aeromovil_notas_created_by_idx ON aeromovil_notas(created_by);
