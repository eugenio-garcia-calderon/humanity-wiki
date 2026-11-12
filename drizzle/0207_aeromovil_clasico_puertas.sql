-- 2026-11-12 (Eugenio), for the «Cuadriciclo Bala clásico»: battery along the frame
-- sticking out 50 % of its width, seats much lower, a steering wheel instead of the
-- handlebar, a dashboard, doors and windows like the Aptera's, mirrors, a long hatch
-- like the Aptera's and the solar panel running to the tail tip.
--
-- Adds the new keys to the saved team design (Triciclo with "tTraseras": "dos").
-- Only these keys change; everything else Eugenio saved stays as it is. The pack is
-- 150 % of the frame width, 1.75 m long and 10 cm thick: 16.0 kWh (the saved design
-- had 20.5 kWh split around the body; a pack thick enough for 20.5 kWh would keep the
-- seats at 0.36 m and bring back three red head checks). The NOTICEs say in the
-- deploy log which row changed and what it had before.
DO $$
DECLARE
  dst record;
BEGIN
  SELECT id, nombre, parametros INTO dst
  FROM aeromovil_disenos
  WHERE origen = 'equipo' AND archived_at IS NULL
    AND parametros->>'disposicion' = 'triciclo' AND parametros->>'tTraseras' = 'dos'
  ORDER BY (nombre LIKE 'Cuadriciclo Bala clásico%') DESC, created_at ASC
  LIMIT 1;

  IF dst.id IS NULL THEN
    RAISE NOTICE '0207: no saved Cuadriciclo Bala clásico found, nothing changed';
  ELSE
    RAISE NOTICE '0207: design % «%» before: %', dst.id, dst.nombre, dst.parametros::text;
    UPDATE aeromovil_disenos
    SET parametros = parametros || '{"tBatDisp":"chasis","tBatLargo":1.75,"tBatAncho":150,"tBatAlto":0.10,"tBatX":0.60,"tMando":"volante","tVolX":0,"tVolY":-0.03,"tVolInc":30,"tVolD":0.32,"tSalpicadero":"si","tSalpY":0,"tSalpFondo":0.16,"tAcceso":"puertas","tPuertaDel":0.80,"tPuertaTras":1.86,"tUmbral":0.34,"tCintura":0,"tBisagraY":0.05,"tBisagraInc":13,"tBisagraDentro":20,"tPuertaAbre":110,"tRetrovisores":"espejos","tMaletero":"aptera","tMalIni":1.70,"tMalAbre":36,"tMalLado":55,"tSolarCola":"si","tPilY":0.33,"tPasY":0.33}'::jsonb,
        updated_at = now()
    WHERE id = dst.id;
    RAISE NOTICE '0207: design % updated with doors, hatch, wheel, dashboard, mirrors, pack along the frame, solar to the tail', dst.id;
  END IF;
END $$;
