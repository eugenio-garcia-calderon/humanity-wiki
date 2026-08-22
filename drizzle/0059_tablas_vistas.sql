-- ============================================================================
-- TABLAS · FASE 9 — VISTAS: ORDENAR, FILTRAR, AGRUPAR Y ESCONDER
-- ============================================================================
-- Una vista NO es una tabla distinta: es una forma de mirar la misma. Por eso
-- no duplica ni una fila — guarda solo el criterio.
--
-- ── POR QUÉ UNA TABLA Y NO UN jsonb EN `bd_tablas` ──────────────────────────
-- Porque una vista es DE ALGUIEN. Dos personas mirando la misma tabla quieren
-- ordenarla distinto, y si el criterio viviera en la tabla, ordenar sería
-- ordenársela a todo el mundo. `usuario_id` a NULL significa «de la tabla, para
-- todos»; con valor, «mía».
--
-- ── EL FILTRO SE GUARDA COMO DATOS, NO COMO TEXTO ───────────────────────────
-- `[{columna, operador, valor}]` y no «estado = pendiente». Un filtro en texto
-- habría que analizarlo en cada lectura, y sobre todo se rompería al renombrar
-- una columna — que es justo lo que este modelo lleva ocho fases evitando.
-- ============================================================================

CREATE TABLE IF NOT EXISTS bd_vistas (
  id          text PRIMARY KEY,
  tabla_id    text NOT NULL REFERENCES bd_tablas(id) ON DELETE CASCADE,
  nombre      text NOT NULL,
  -- NULL = la vista es de la tabla y la ve todo el mundo.
  usuario_id  text,
  -- 'tabla' hoy. Kanban, calendario y galería son la misma vista con otra
  -- forma de pintarse, así que caben aquí sin tabla nueva.
  forma       text NOT NULL DEFAULT 'tabla',
  -- [{columna_id, direccion: 'asc'|'desc'}]
  orden_por   jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- [{columna_id, operador, valor}]
  filtros     jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Qué columnas NO se ven. Se guardan las ESCONDIDAS y no las visibles: así
  -- una columna nueva aparece sola en todas las vistas, en vez de quedarse
  -- invisible hasta que alguien la añada a mano una por una.
  ocultas     jsonb NOT NULL DEFAULT '[]'::jsonb,
  agrupar_por text,
  orden       integer NOT NULL DEFAULT 0,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now(),
  archived_at timestamp
);

CREATE INDEX IF NOT EXISTS bd_vistas_tabla_idx ON bd_vistas (tabla_id, usuario_id, orden);
