-- ============================================================================
-- TABLAS · FORMULARIOS PÚBLICOS (2026-10-06, carril «bd»)
-- ============================================================================
-- Una vista «Formulario» de una base de datos se publica con un enlace
-- (`/formulario/<token>`) y cada respuesta crea una fila. El token vive dentro
-- de `bd_vistas.config.formulario.token`, y las peticiones públicas llegan SOLO
-- con él: hay que encontrar la vista por ese valor. Un índice sobre la
-- expresión, parcial (solo los formularios con enlace), para que cada visita
-- al formulario no recorra todas las vistas de la plataforma.
CREATE UNIQUE INDEX IF NOT EXISTS bd_vistas_formulario_token_idx
  ON bd_vistas ((config -> 'formulario' ->> 'token'))
  WHERE config -> 'formulario' ->> 'token' IS NOT NULL AND archived_at IS NULL;
