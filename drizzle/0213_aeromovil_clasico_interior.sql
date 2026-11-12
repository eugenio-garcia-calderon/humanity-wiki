-- Aeromóvil, Cuadriciclo Bala clásico, round 3 of the interior (2026-11-12, Eugenio): Aptera-style seats, the white
-- dashboard, the frame rails run to the rear axle and spread to 30 cm, and the pack width kept at its 0.40 m (16 kWh)
-- on the wider frame (115 % of it). Merges only these keys into the saved design (same selector as 0209 and 0212).
-- The production DB is not reachable from the agents: the before value and the result are printed with RAISE NOTICE.
DO $$
DECLARE dst record;
BEGIN
  SELECT id, nombre, parametros INTO dst FROM aeromovil_disenos
  WHERE origen = 'equipo' AND archived_at IS NULL
    AND parametros->>'disposicion' = 'triciclo' AND parametros->>'tTraseras' = 'dos'
  ORDER BY (nombre LIKE 'Cuadriciclo Bala clásico%') DESC, created_at ASC LIMIT 1;
  IF dst.id IS NULL THEN
    RAISE NOTICE '0213: no saved Cuadriciclo Bala clásico found, nothing changed';
  ELSE
    RAISE NOTICE '0213: design % «%» before: %', dst.id, dst.nombre, dst.parametros::text;
    UPDATE aeromovil_disenos SET parametros = parametros || '{"tAsientos":"butacas","tSalpicadero":"blanco","tChLargo":"eje","tChSep":0.30,"tBatAncho":115}'::jsonb, updated_at = now() WHERE id = dst.id;
    RAISE NOTICE '0213: design % updated with the round-3 interior (Aptera seats, white dashboard, rails to the rear axle at 30 cm)', dst.id;
  END IF;
END $$;
