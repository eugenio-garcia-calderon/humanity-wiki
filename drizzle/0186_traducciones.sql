-- 2026-11-10 (Eugenio): luzhumanidad.com is the Spanish source and lighthumanity.org its English
-- twin. Each Spanish text is one row per language; a row with no translation is a pending task.
-- See src/server/traducciones.ts and rule 11 of docs/99_CONSTITUTION.md.
CREATE TABLE IF NOT EXISTS traducciones_textos (
  idioma        text NOT NULL,
  hash          text NOT NULL,
  original      text NOT NULL,
  traduccion    text,
  tipo          text NOT NULL DEFAULT 'contenido' CHECK (tipo IN ('contenido', 'interfaz')),
  contexto      text,
  creada_at     timestamptz NOT NULL DEFAULT now(),
  visto_at      timestamptz NOT NULL DEFAULT now(),
  traducida_at  timestamptz,
  PRIMARY KEY (idioma, hash)
);
CREATE INDEX IF NOT EXISTS traducciones_pendientes_idx ON traducciones_textos (idioma, tipo) WHERE traduccion IS NULL;
