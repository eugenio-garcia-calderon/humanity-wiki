-- Canvas ergonomics, Miro-style (2026-08-08, user request).
--
-- Geometry lives on the PLACEMENT (graph_windows), not on the window itself:
-- the same knowledge window can sit on two canvases at different sizes, which
-- is exactly what the "connect, do not duplicate" recommender relies on.
ALTER TABLE graph_windows ADD COLUMN IF NOT EXISTS w      double precision;         -- null = tamaño natural
ALTER TABLE graph_windows ADD COLUMN IF NOT EXISTS h      double precision;
ALTER TABLE graph_windows ADD COLUMN IF NOT EXISTS rot    double precision NOT NULL DEFAULT 0;
ALTER TABLE graph_windows ADD COLUMN IF NOT EXISTS z      integer          NOT NULL DEFAULT 0;
ALTER TABLE graph_windows ADD COLUMN IF NOT EXISTS locked boolean          NOT NULL DEFAULT false;

-- Connector look (arrow heads, line type, colour, width, curvature) and the
-- position/size of its relation circle. Both are presentation, so jsonb keeps
-- them extensible without a migration per knob.
ALTER TABLE graph_edges ADD COLUMN IF NOT EXISTS style  jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE graph_edges ADD COLUMN IF NOT EXISTS layout jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE graph_edges ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;

-- PAPELERA (recycle bin). Deliberately separate from `archived_at`:
--   archived_at  editorial withdrawal, kept forever (Constitution, rule 6)
--   deleted_at   the user asked to delete it; purged for real after 15 days
-- Keeping them apart means the purge sweep can never touch anything that was
-- merely archived by another flow.
ALTER TABLE knowledge_windows ADD COLUMN IF NOT EXISTS deleted_at timestamp;
CREATE INDEX IF NOT EXISTS knowledge_windows_deleted_idx ON knowledge_windows (deleted_at)
  WHERE deleted_at IS NOT NULL;
