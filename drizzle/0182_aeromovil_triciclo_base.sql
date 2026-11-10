-- 2026-11-10 (Eugenio): «Desarrolla una ramificación del cuadriciclo bala […]
-- vamos a llamarlo triciclo bala». The Triciclo Bala is the editor's fourth
-- family (`disposicion = 'triciclo'`). The «Diseños» list is built from this
-- table, and each family has a team base design in it (`origen = 'equipo'`),
-- as 0170 did for the Aeromóvil 1 and 0178 for the Cuadriciclo Bala.
--
-- Empty parameters apart from the family: `deDiseno` (Disenos.tsx) fills the
-- rest from PARAMETROS_TRICICLO. Idempotent.
INSERT INTO aeromovil_disenos (nombre, parametros, autor, origen)
SELECT 'Triciclo Bala (biplaza a horcajadas, tres ruedas)', '{"disposicion": "triciclo"}'::jsonb, 'Equipo', 'equipo'
WHERE NOT EXISTS (
  SELECT 1 FROM aeromovil_disenos
  WHERE origen = 'equipo' AND parametros->>'disposicion' = 'triciclo' AND archived_at IS NULL
);
