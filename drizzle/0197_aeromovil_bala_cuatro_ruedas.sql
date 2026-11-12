-- 2026-11-11 (Eugenio): «Haz un vehículo igual que el triciclo bala, pero esta
-- vez que tenga 4 ruedas. Duplica el proyecto para que se pueda editar […] con
-- las mismas medidas que están ahora guardadas en el triciclo».
--
-- The four-wheel Bala is a Triciclo design with "tTraseras": "dos" (two rear
-- wheels in pods). This copies the saved Triciclo's parameters as they are in
-- production at deploy time, so every measure Eugenio saved carries over.
-- Source row: the default design if it is a Triciclo (the one he has been
-- editing), otherwise the most recently saved team Triciclo. The copy is a
-- separate team design, not the default; the Triciclo is left untouched.
-- Runs once: skipped if a team four-wheel Bala already exists.
INSERT INTO aeromovil_disenos (nombre, parametros, autor, origen, created_by)
SELECT 'Bala de cuatro ruedas (copia del Triciclo Bala)',
       parametros || '{"tTraseras": "dos"}'::jsonb,
       autor, 'equipo', created_by
FROM aeromovil_disenos
WHERE archived_at IS NULL AND parametros->>'disposicion' = 'triciclo'
  AND COALESCE(parametros->>'tTraseras', 'una') = 'una'
  AND (por_defecto OR origen = 'equipo')
  AND NOT EXISTS (
    SELECT 1 FROM aeromovil_disenos
    WHERE origen = 'equipo' AND archived_at IS NULL
      AND parametros->>'disposicion' = 'triciclo' AND parametros->>'tTraseras' = 'dos'
  )
ORDER BY por_defecto DESC, updated_at DESC
LIMIT 1;
