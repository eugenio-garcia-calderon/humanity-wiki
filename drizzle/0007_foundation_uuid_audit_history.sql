-- Fase 1 — Cimientos del Grafo de Conocimiento
--
-- Aplica a las entidades ya existentes los requisitos transversales de
-- 99_CONSTITUTION.md y 04_DATABASE.md:
--   principio 5  -> UUID permanente en toda entidad
--   principio 4  -> toda modificación genera historial
--   principio 6  -> nunca se elimina conocimiento (archivado, no borrado)
--   principio 2  -> toda entidad tiene autor (created_by / updated_by)
--
-- Decisión (ver 03_DECISIONS.md, 2026-08-03): el `id` de texto legible que ya
-- usan las URLs, los registros de iconos y los GeoJSON SE MANTIENE como clave
-- primaria e identificador público. El `uuid` se añade AL LADO como
-- identificador permanente global. Así se cumple la Constitución sin romper
-- ninguna funcionalidad existente.

-- ---------------------------------------------------------------------------
-- 1. Columnas transversales sobre las entidades existentes
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  entity_tables text[] := ARRAY[
    -- Entidades de conocimiento
    'territories', 'objectives', 'challenges', 'causes', 'solutions',
    'indicators', 'markers', 'metrics', 'measurement_stations',
    'organizations', 'projects', 'content', 'users',
    -- Observaciones (también son conocimiento trazable)
    'indicator_observations', 'marker_observations', 'metric_observations'
  ];
BEGIN
  FOREACH t IN ARRAY entity_tables LOOP
    -- gen_random_uuid() es nativo desde PostgreSQL 13 (aquí corre PG17),
    -- no hace falta la extensión pgcrypto.
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS uuid uuid NOT NULL DEFAULT gen_random_uuid()', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS created_by text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_by text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1', t);
    -- archived_at NULL = entidad viva. Distinto de NULL = archivada (oculta,
    -- pero nunca borrada) — sustituye al DELETE físico.
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS archived_at timestamp', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()', t);

    EXECUTE format('CREATE UNIQUE INDEX IF NOT EXISTS %I ON %I (uuid)', t || '_uuid_key', t);
    -- Todas las lecturas filtran por archived_at IS NULL, así que conviene índice.
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (archived_at)', t || '_archived_at_idx', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Historial universal
-- ---------------------------------------------------------------------------
-- 04_DATABASE.md propone una tabla de historial por entidad
-- (publication_history, challenge_history...). Se implementa en su lugar UNA
-- tabla polimórfica: mismo contenido y misma garantía, pero sin tener que
-- crear (y mantener sincronizada) una tabla nueva cada vez que se añade una
-- entidad al dominio — que es exactamente lo que va a pasar en las fases
-- siguientes (publicaciones, productos, demandas, iniciativas...).
-- El snapshot guarda la fila COMPLETA anterior al cambio, así que cualquier
-- versión pasada puede reconstruirse íntegra.
CREATE TABLE IF NOT EXISTS entity_history (
  id serial PRIMARY KEY,
  entity_type text NOT NULL,          -- 'challenges', 'solutions', 'indicators'...
  entity_id text NOT NULL,            -- id de texto legible
  entity_uuid uuid,                   -- uuid permanente
  version integer NOT NULL,           -- versión resultante de este cambio
  operation text NOT NULL,            -- create | update | archive | restore
  snapshot jsonb NOT NULL,            -- fila completa tras el cambio
  previous jsonb,                     -- fila completa antes del cambio (null en create)
  changed_by text,
  changed_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entity_history_entity_idx ON entity_history (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS entity_history_uuid_idx ON entity_history (entity_uuid);
CREATE INDEX IF NOT EXISTS entity_history_changed_at_idx ON entity_history (changed_at DESC);
