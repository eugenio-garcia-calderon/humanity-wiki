-- 2026-11-10 (Eugenio): «pon un botón de añadir mejoras o comentarios sobre el
-- esquema» on humanity.wiki/conciencia (and its page on luzhumanidad.com).
--
-- A mailbox, like `aeromovil_tareas`: anyone can leave an improvement or a
-- comment without an account (held up by a per-IP brake, a honeypot field and
-- a cap on pending items in `src/server/conciencia.ts`). An administrator
-- marks each one done or discarded once it is applied to the map; the AI reads
-- the pending ones from `/api/conciencia/comentarios.txt`.
--
-- What is NOT stored: the IP or any contact detail. `autor` is the name the
-- person chose to type, if any. This table travels in the nightly backup.
CREATE TABLE IF NOT EXISTS conciencia_comentarios (
  id            serial PRIMARY KEY,
  texto         text NOT NULL,
  autor         text,
  autor_user_id text REFERENCES users(id) ON DELETE SET NULL,
  estado        text NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'hecha', 'descartada')),
  respuesta     text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  resuelto_at   timestamptz
);
CREATE INDEX IF NOT EXISTS conciencia_comentarios_estado_idx ON conciencia_comentarios(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS conciencia_comentarios_autor_idx ON conciencia_comentarios(autor_user_id);
