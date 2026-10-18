-- ============================================================================
-- VALORACIONES DE LA COMUNIDAD, POR CRITERIO (2026-10-18, Wikiproducts W4)
-- ============================================================================
-- A database row (a product, a distributor) is rated 1-5 on several criteria
-- (calidad, precio, garantía, ecología, salud, estética, ética; atención al
-- cliente for a distributor). Each criterion is a column of type `comunidad`
-- in the row's table, so the vote is keyed by (row, column, person).
--
-- This is NOT a junction table (CLAUDE.md, rule 6): it stores a fact of its
-- own, the note someone gave, and it is the only place that fact lives.
--
-- What is deliberately NOT stored:
--   · whether the voter is a verified buyer. It is read from `pedidos` every
--     time, so a refund (`devuelto`) takes the extra weight away by itself.
--   · the computed score. It comes out of `src/server/valoraciones.ts` on read,
--     like formulas: storing it would give two truths.
--
-- In a backup a month from now a vote is (opaque user id, row, column, 1-5).
-- When an account is anonymised the vote stays, like a comment does, attached
-- to an id that no longer names anybody. A hard DELETE of the user cascades.

CREATE TABLE IF NOT EXISTS valoraciones (
  id          text PRIMARY KEY,
  fila_id     text NOT NULL REFERENCES bd_filas(id) ON DELETE CASCADE,
  columna_id  text NOT NULL REFERENCES bd_columnas(id) ON DELETE CASCADE,
  user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nota        smallint NOT NULL CHECK (nota BETWEEN 1 AND 5),
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now()
);

-- One person, one vote per row and criterion. Enforced here and not only in
-- code: it is the rule the whole ranking rests on.
CREATE UNIQUE INDEX IF NOT EXISTS valoraciones_unica_idx ON valoraciones (fila_id, columna_id, user_id);
-- Read path: every vote of a column, for the whole table (the Bayesian prior
-- needs the table's mean). Also covers the `columna_id` foreign key.
CREATE INDEX IF NOT EXISTS valoraciones_columna_idx ON valoraciones (columna_id, fila_id);
-- Foreign key on users (drizzle/CLAUDE.md: every FK carries an index).
CREATE INDEX IF NOT EXISTS valoraciones_user_idx ON valoraciones (user_id);

COMMENT ON TABLE valoraciones IS
  'Community votes 1-5 per row and criterion (column of type comunidad). Score computed on read in src/server/valoraciones.ts; never reads commission.';

-- The new column type. The list is the one from 0144 plus `comunidad`.
-- WARNING for whoever adds the next type: this constraint is redefined whole,
-- so a later migration must copy THIS list, not 0144's.
ALTER TABLE bd_columnas DROP CONSTRAINT IF EXISTS bd_columnas_tipo_check;
ALTER TABLE bd_columnas ADD CONSTRAINT bd_columnas_tipo_check CHECK (tipo IN (
  'texto', 'numero', 'fecha', 'seleccion', 'casilla',
  'texto_largo', 'url', 'email', 'telefono',
  'moneda', 'porcentaje', 'duracion', 'valoracion', 'seleccion_multiple',
  'persona', 'proyecto', 'publicacion', 'relacion',
  'imagen', 'video', 'documento',
  'formula', 'agregado', 'condicional',
  'compra',
  -- 2026-10-18: a community rating criterion. Stores nothing in the row.
  'comunidad'
));
