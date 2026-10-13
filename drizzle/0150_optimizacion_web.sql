-- HISTORIAL DE MEDICIONES DE LA OPTIMIZACIÓN WEB (2026-10-13). Cada medición de una página publicada guarda lo que
-- tardó y pesó tal como la recibe un visitante, para poder decir si ha empeorado respecto a las anteriores.
CREATE TABLE IF NOT EXISTS optimizacion_mediciones (
  id bigserial PRIMARY KEY,
  pagina_id text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  medido_at timestamp NOT NULL DEFAULT now(),
  ms_html integer, ms_contenido integer, ms_imagenes integer, ms_total integer,
  bytes_html integer, bytes_imagenes integer, bytes_max integer,
  n_imagenes integer, n_tablas integer
);
CREATE INDEX IF NOT EXISTS optimizacion_mediciones_pagina_idx ON optimizacion_mediciones (pagina_id, medido_at DESC);
