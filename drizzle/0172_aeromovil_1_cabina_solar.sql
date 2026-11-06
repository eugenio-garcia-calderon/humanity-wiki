-- 2026-11-06 (Eugenio): «pon por defecto que el parabrisas sea plano… quita
-- la opción de parabrisas burbuja». El parabrisas plano con techo solar es
-- ahora la única cabina del Aeromóvil 1, así que el diseño del equipo
-- «Aeromóvil 1 · parabrisas plano» (migración 0171) ya no se distingue del
-- de por defecto. Se archiva (nunca se borra), por si alguien lo tenía abierto.
UPDATE aeromovil_disenos
SET archived_at = now(), updated_at = now()
WHERE origen = 'equipo' AND archived_at IS NULL AND parametros->>'parabrisas' = 'plano';
