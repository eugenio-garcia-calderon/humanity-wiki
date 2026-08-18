-- ============================================================================
-- JUEGO VITAL — personas en proyectos + mundo editable (2026-08-18)
-- ============================================================================
-- 1. Las personas FORMAN PARTE de proyectos (petición de Eugenio: «que no se
--    añadan en el kanban sino en una sección de personas ad hoc»). Un jsonb
--    con los ids en vez de la tabla de cruce nº 44: a esta escala (decenas de
--    personas por usuario) se lee entero de una vez y no se consulta por SQL.
-- 2. El mundo 3D se puede editar como un Miro: objetos creados por el jugador
--    (props, notas, documentos, imágenes) y retoques sobre el pueblo semilla
--    (mover, eliminar o cambiar el diseño de una casa, farola, árbol…).

ALTER TABLE game_agents
  ADD COLUMN IF NOT EXISTS proyecto_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Objetos que el jugador planta en su mundo.
CREATE TABLE IF NOT EXISTS game_world_items (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users(id),
  tipo        text NOT NULL,           -- prop | nota | imagen | documento
  modelo      text,                    -- catálogo, solo tipo 'prop' (casa, arbol…)
  texto       text,                    -- el contenido de una nota
  url         text,                    -- imagen o documento subido
  nombre      text,                    -- nombre visible del archivo
  x           double precision NOT NULL DEFAULT 0,
  z           double precision NOT NULL DEFAULT 0,
  rot         double precision NOT NULL DEFAULT 0,
  escala      double precision NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  CONSTRAINT game_world_items_tipo_check CHECK (tipo IN ('prop', 'nota', 'imagen', 'documento'))
);
CREATE INDEX IF NOT EXISTS game_world_items_user_idx ON game_world_items (user_id);

-- Retoques del pueblo semilla, uno por objeto tocado.
CREATE TABLE IF NOT EXISTS game_world_overrides (
  user_id    text NOT NULL REFERENCES users(id),
  seed_id    text NOT NULL,            -- 'casa:3', 'farola:2', 'arbol:517'…
  eliminado  boolean NOT NULL DEFAULT false,
  x          double precision,
  z          double precision,
  rot        double precision,
  modelo     text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, seed_id)
);

-- ----------------------------------------------------------------------------
-- Rescate de datos: las personas que se habían metido en el tablero como
-- tarjetas pasan a ser MIEMBROS del proyecto, y su tarjeta se archiva.
-- (El kanban es para tareas; una persona no es una tarea pendiente.)
-- ----------------------------------------------------------------------------

-- (a) tarjetas que ya apuntaban a la persona con un bloque {tipo:'agente'}
WITH refs AS (
  SELECT r.id AS card_id, r.proyecto_id, b->>'agente_id' AS agente_id
  FROM roadmap_items r, jsonb_array_elements(r.bloques) b
  WHERE r.archived_at IS NULL AND r.proyecto_id IS NOT NULL
    AND b->>'tipo' = 'agente' AND b->>'agente_id' IS NOT NULL
)
UPDATE game_agents a
SET proyecto_ids = a.proyecto_ids || to_jsonb(refs.proyecto_id), updated_at = now()
FROM refs
WHERE a.id = refs.agente_id AND NOT a.proyecto_ids ? refs.proyecto_id;

-- (b) tarjetas antiguas del grupo «personas» que solo llevan el nombre
WITH refs AS (
  SELECT r.id AS card_id, r.proyecto_id, a.id AS agente_id
  FROM roadmap_items r
  JOIN game_agents a
    ON a.archived_at IS NULL AND a.tipo = 'persona'
   AND a.user_id = COALESCE(r.autor_user_id, r.created_by)
   AND lower(trim(a.nombre)) = lower(trim(r.titulo))
  WHERE r.archived_at IS NULL AND r.proyecto_id IS NOT NULL AND r.grupo = 'personas'
)
UPDATE game_agents a
SET proyecto_ids = a.proyecto_ids || to_jsonb(refs.proyecto_id), updated_at = now()
FROM refs
WHERE a.id = refs.agente_id AND NOT a.proyecto_ids ? refs.proyecto_id;

-- (c) y esas tarjetas se archivan: la persona ya vive en su sección
UPDATE roadmap_items r SET archived_at = now()
WHERE r.archived_at IS NULL AND r.proyecto_id IS NOT NULL
  AND (
    EXISTS (SELECT 1 FROM jsonb_array_elements(r.bloques) b WHERE b->>'tipo' = 'agente')
    OR (r.grupo = 'personas' AND EXISTS (
      SELECT 1 FROM game_agents a
      WHERE a.archived_at IS NULL AND a.tipo = 'persona'
        AND a.user_id = COALESCE(r.autor_user_id, r.created_by)
        AND lower(trim(a.nombre)) = lower(trim(r.titulo))
    ))
  );

-- Hilos de conocimiento: un objeto puede apuntar a otros (nota → persona,
-- documento → proyecto…), como las flechas de un Miro pero en 3D.
ALTER TABLE game_world_items
  ADD COLUMN IF NOT EXISTS enlaces jsonb NOT NULL DEFAULT '[]'::jsonb;
