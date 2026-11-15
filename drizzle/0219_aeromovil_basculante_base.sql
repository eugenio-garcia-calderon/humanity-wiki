-- 2026-11-15 (Eugenio, «Prompt 3»): «Añade además del Lumeneo Smera un modelo 3D de alta
-- calidad pero con un techo un 25% más bajo y un culo terminado más como el Aptera […]
-- permite modificarlo con slider todos los aspectos. y que bascule! con un botón».
-- The Cuadriciclo Basculante is the editor's fifth family (`disposicion = 'basculante'`).
-- Like 0178 (Bala) and 0186 (Triciclo), each family has a team base design in this table,
-- which is what puts it in the «Diseños» list and in the garage's first row.
--
-- Empty parameters apart from the family: `deDiseno` (Disenos.tsx) fills the rest from
-- PARAMETROS_BASCULANTE, so the design follows the code's defaults. Idempotent.
INSERT INTO aeromovil_disenos (nombre, parametros, autor, origen)
SELECT 'Cuadriciclo Basculante', '{"disposicion": "basculante"}'::jsonb, 'Equipo', 'equipo'
WHERE NOT EXISTS (
  SELECT 1 FROM aeromovil_disenos
  WHERE origen = 'equipo' AND parametros->>'disposicion' = 'basculante' AND archived_at IS NULL
);
