-- 2026-11-06 (Eugenio, con fotos del VW XL1 y del Aptera): «haz una versión
-- 3D idéntica a la anterior cambiando solo el frontal, que sea plano el
-- parabrisas como el XL1 pero más estrecho… inspírate en el parabrisas del
-- Aptera en cuanto a la curva que tiene». Es el Aeromóvil 1 con
-- `parabrisas = 'plano'`; todo lo demás son los valores por defecto, así
-- que mejora con ellos. El de por defecto sigue siendo el de burbuja.
INSERT INTO aeromovil_disenos (nombre, parametros, autor, origen)
SELECT 'Aeromóvil 1 · parabrisas plano', '{"disposicion": "cuatro", "parabrisas": "plano"}'::jsonb, 'Equipo', 'equipo'
WHERE NOT EXISTS (SELECT 1 FROM aeromovil_disenos WHERE origen = 'equipo' AND parametros->>'parabrisas' = 'plano');
