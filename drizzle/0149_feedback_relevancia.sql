-- Feedback: relevancia 1-10 (1 detalle, 5 relevante, 10 crítico) para que la IA sepa qué hacer primero.
ALTER TABLE incidencias ADD COLUMN IF NOT EXISTS relevancia smallint NOT NULL DEFAULT 5;
DO $$ BEGIN
  ALTER TABLE incidencias ADD CONSTRAINT incidencias_relevancia_check CHECK (relevancia BETWEEN 1 AND 10);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
