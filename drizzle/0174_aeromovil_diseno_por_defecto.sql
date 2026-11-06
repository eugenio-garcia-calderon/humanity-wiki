-- Diseño por defecto del Aeromóvil (2026-11-06, Eugenio: «permite poner otros
-- diseños por defecto; poner el Aptera Like por defecto»). Uno como mucho:
-- es el que abre quien llega por primera vez y el que carga «Empezar uno nuevo».
ALTER TABLE aeromovil_disenos ADD COLUMN IF NOT EXISTS por_defecto boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS aeromovil_disenos_por_defecto_idx ON aeromovil_disenos ((true)) WHERE por_defecto AND archived_at IS NULL;
-- Si no existe ninguno con ese nombre, no queda ninguno por defecto (COALESCE: id = NULL daría NULL).
UPDATE aeromovil_disenos SET por_defecto = COALESCE(id = (
  SELECT id FROM aeromovil_disenos WHERE lower(nombre) = 'aptera like' AND archived_at IS NULL ORDER BY updated_at DESC LIMIT 1
), false);
