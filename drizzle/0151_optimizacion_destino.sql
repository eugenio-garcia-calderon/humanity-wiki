-- A QUÉ DIRECCIÓN SE HIZO CADA MEDICIÓN (2026-10-13): el dominio propio de la página, o humanity.wiki si no tiene.
-- Así una medición no se compara con otra hecha en un sitio distinto.
ALTER TABLE optimizacion_mediciones ADD COLUMN IF NOT EXISTS destino text;
