-- Aeromóvil, Cuadriciclo Bala clásico, round 3 of the body (2026-11-12, Eugenio): shorter flatter nose ending in
-- an Aptera-like line, central headlamp, flat tail, flatter roof, roof-to-hatch drop, hatch starting behind the
-- doors, no fin, solar panel on the nose, and a second door per side hinged on a new C-pillar.
-- Merges only the new keys into the saved design (same selector as 0209); every other value is kept.
-- The production DB is not reachable from the agents: the before value and the result are printed with RAISE NOTICE.
DO $$
DECLARE dst record;
BEGIN
  SELECT id, nombre, parametros INTO dst FROM aeromovil_disenos
  WHERE origen = 'equipo' AND archived_at IS NULL
    AND parametros->>'disposicion' = 'triciclo' AND parametros->>'tTraseras' = 'dos'
  ORDER BY (nombre LIKE 'Cuadriciclo Bala clásico%') DESC, created_at ASC LIMIT 1;
  IF dst.id IS NULL THEN
    RAISE NOTICE '0212: no saved Cuadriciclo Bala clásico found, nothing changed';
  ELSE
    RAISE NOTICE '0212: design % «%» before: %', dst.id, dst.nombre, dst.parametros::text;
    UPDATE aeromovil_disenos SET parametros = parametros || '{"tMorro":0.3,"tMorroLinea":1,"tMorroAlto":-0.03,"tFaro":"si","tFaroD":0.16,"tColaPlana":1,"tTechoPlano":0.5,"tCaida":0.2,"tConAleta":"no","tSolarMorro":"si","tMalIni":1.95,"tMalLado":30,"tPuertas2":"si","tPuerta2Parte":1.33,"tBisagra2Y":0.85,"tBisagra2Inc":15,"tPuerta2Abre":110,"tLineaCupula":0}'::jsonb, updated_at = now() WHERE id = dst.id;
    RAISE NOTICE '0212: design % updated with the round-3 body (nose, headlamp, flat tail, roof, hatch, no fin, nose solar, second doors)', dst.id;
  END IF;
END $$;
