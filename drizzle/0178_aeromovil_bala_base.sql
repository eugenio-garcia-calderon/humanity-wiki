-- 2026-11-09 (Eugenio): «no veo el Bala en el selector de diseños». The
-- Cuadriciclo Bala became an editor family the same day (`disposicion = 'bala'`,
-- PR #924), but it only showed in the «Vehículo» picker. The «Diseños» list is
-- built from this table, and each family has a team base design in it
-- (`origen = 'equipo'`), as 0170 did for the Aeromóvil 1.
--
-- Empty parameters apart from the family: `deDiseno` (Disenos.tsx) fills the
-- rest from PARAMETROS_BALA, the garage Bala's measures. Idempotent.
INSERT INTO aeromovil_disenos (nombre, parametros, autor, origen)
SELECT 'Cuadriciclo Bala (biplaza a horcajadas)', '{"disposicion": "bala"}'::jsonb, 'Equipo', 'equipo'
WHERE NOT EXISTS (
  SELECT 1 FROM aeromovil_disenos
  WHERE origen = 'equipo' AND parametros->>'disposicion' = 'bala' AND archived_at IS NULL
);
