-- ============================================================================
-- UNA PÁGINA DENTRO DE OTRA (2026-09-30)
-- ============================================================================
-- Eugenio: «en el creador de bloques dentro de una página falta poder crear una
-- página dentro de una página, como hace Notion».
--
-- La página hija es una `knowledge_windows` normal (mismo editor, mismo
-- Compartir, mismo dominio propio): lo único nuevo es saber de quién cuelga.
-- Eso da la miga de pan («↑ volver a la página madre») y permite que la lista
-- de páginas no las pinte como si fueran sueltas.
--
-- SET NULL y no CASCADE a propósito: borrar la madre no puede borrar lo que hay
-- dentro sin avisar. La hija se queda suelta y se sigue viendo en la lista.
ALTER TABLE knowledge_windows
  ADD COLUMN IF NOT EXISTS padre_id text REFERENCES knowledge_windows(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS knowledge_windows_padre_id_idx ON knowledge_windows (padre_id);
