-- Aeromóvil, Cuadriciclo Bala clásico, round 4 (2026-11-13, Eugenio): a wider rear passenger door (C-pillar to
-- 2.10 m, split at 1.40 m), the hatch moved behind it (2.20 m), and a 10 cm laminate frame around the roof
-- solar panel and across the top of the windscreen. Merges only these keys into the saved design (same selector
-- as 0209, 0212 and 0213); every other value is kept.
-- The production DB is not reachable from the agents: the before value and the result are printed with RAISE NOTICE.
DO $$
DECLARE dst record;
BEGIN
  SELECT id, nombre, parametros INTO dst FROM aeromovil_disenos
  WHERE origen = 'equipo' AND archived_at IS NULL
    AND parametros->>'disposicion' = 'triciclo' AND parametros->>'tTraseras' = 'dos'
  ORDER BY (nombre LIKE 'Cuadriciclo Bala clásico%') DESC, created_at ASC LIMIT 1;
  IF dst.id IS NULL THEN
    RAISE NOTICE '0217: no saved Cuadriciclo Bala clásico found, nothing changed';
  ELSE
    RAISE NOTICE '0217: design % «%» before: %', dst.id, dst.nombre, dst.parametros::text;
    UPDATE aeromovil_disenos SET parametros = parametros || '{"tPuertaTras":2.10,"tPuerta2Parte":1.40,"tMalIni":2.20,"tMarcoTecho":0.10}'::jsonb, updated_at = now() WHERE id = dst.id;
    RAISE NOTICE '0217: design % updated with the round-4 doors and roof frame', dst.id;
  END IF;
END $$;
