-- ============================================================================
-- CARPETAS DENTRO DE CARPETAS (2026-10-05)
-- ============================================================================
-- Eugenio: «no está funcionando lo de arrastrar una página y meterla dentro de
-- otra… no la página general, meterla dentro de otra página general». Lo que
-- está arriba del todo en el menú son carpetas, y una carpeta no podía ir
-- dentro de otra. Una carpeta tiene UNA madre o ninguna: es una columna.
-- Borrar la madre deja a las hijas arriba del todo, igual que a sus páginas.
ALTER TABLE proyectos ADD COLUMN IF NOT EXISTS padre_id text REFERENCES proyectos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS proyectos_padre_id_idx ON proyectos(padre_id);
