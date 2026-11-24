-- 2026-11-24 (Eugenio): «gestión documental de todo lo necesario… checklist de lo que nos falta… ensayos… compliance… un
-- generador y un editor de esos documentos para que entre la IA y el ingeniero podamos ir resolviéndolos».
--
-- THE MANUFACTURER'S FILE of the pedal cycle with pedal assistance (RD 339/2014): the conformity matrix (which evidence
-- backs each legal obligation), the test reports, the legal documents (technical file, manual, declaration…) and the
-- manufacturer's own details. One row per key, the value a JSON document:
--   fabricante          the maker's details (company name, address, responsible person, brand, model)
--   matriz              the matrix state: per obligation and evidence slot, its state, a note and the attached files
--   ensayo:<id>         one test: its attempts (conditions, measured values, conclusion, signature)
--   doc:<id>            one legal document: the sections the engineer edited (the rest is generated from the design)
-- Not a junction table and not a table per entity: the catalogue (what must exist) lives in the code, this table only
-- holds what somebody wrote. `version` is the optimistic lock: two tabs (or the engineer and an AI session) editing the
-- same document get a conflict instead of silently overwriting each other.
--
-- ── WHAT LEAVES THE BUILDING EVERY NIGHT ─────────────────────────────────────
-- The nightly dump copies this table: the company's name and address and the name of the person who signs are in it BY
-- DESIGN (they go in the declaration of conformity). No identity-document numbers, no card or bank numbers: the form
-- does not ask for them. The files themselves are not here (`aeromovil_adjuntos` registers them; the bytes stay on the
-- volume). Only the Aeromóvil's owner or an admin can read or write it (src/server/aeromovilExpediente.ts).
CREATE TABLE IF NOT EXISTS aeromovil_expediente (
  clave      text PRIMARY KEY CHECK (clave ~ '^[a-z0-9][a-z0-9:_-]{0,79}$'),
  valor      jsonb   NOT NULL,
  version    integer NOT NULL DEFAULT 1,
  updated_by text    REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aeromovil_expediente_updated_by_idx ON aeromovil_expediente(updated_by);
