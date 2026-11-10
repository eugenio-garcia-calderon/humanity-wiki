-- 2026-11-10 (Eugenio): «Estudio sobre la conciencia del ser humano», a new
-- project on humanity.wiki/conciencia. A visual, editable map of Jacobo
-- Grinberg's syntergic theory: concepts and arrows that can be dragged,
-- renamed, recoloured and reconnected «para que podamos ir perfilando».
--
-- ── ONE ROW PER MAP, THE WHOLE MAP AS JSON ────────────────────────────────
-- The map is edited and drawn as one picture; splitting it into node and edge
-- rows would mean dozens of writes for one drag. `clave` = 'principal' today;
-- the column exists so a second map (another study) needs no migration.
-- `datos` NULL means «the map that ships in the code» (src/data/concienciaMapa.ts),
-- exactly like `calendario_arte_meses`: the row only holds what someone changed.
--
-- ── `version` SO TWO PEOPLE DO NOT OVERWRITE EACH OTHER ──────────────────
-- The second person to save gets a 409 instead of erasing the first one's work.
CREATE TABLE IF NOT EXISTS conciencia_mapas (
  clave       text PRIMARY KEY,
  datos       jsonb,
  version     integer NOT NULL DEFAULT 1,
  updated_by  text REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conciencia_mapas_updated_by_idx ON conciencia_mapas(updated_by);

-- History (Constitution, rule 4: every modification leaves history). A copy of
-- the map BEFORE it changes, at most one every 10 minutes while someone edits
-- (autosave writes every second or two) and always before restoring or going
-- back to the original. The last 300 are kept.
--
-- What is NOT stored: the IP or anything identifying whoever edited. This table
-- travels in the nightly backup.
CREATE TABLE IF NOT EXISTS conciencia_mapas_historial (
  id            serial PRIMARY KEY,
  clave         text    NOT NULL,
  datos         jsonb   NOT NULL,
  version       integer NOT NULL,
  -- Who left the map like this. NULL = deleted account.
  autor_user_id text    REFERENCES users(id) ON DELETE SET NULL,
  motivo        text    NOT NULL DEFAULT 'edición',
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conciencia_mapas_historial_clave_idx ON conciencia_mapas_historial(clave, created_at DESC);
CREATE INDEX IF NOT EXISTS conciencia_mapas_historial_autor_idx ON conciencia_mapas_historial(autor_user_id);
