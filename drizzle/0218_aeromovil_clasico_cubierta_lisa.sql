-- Aeromóvil, Cuadriciclo Bala clásico (2026-11-13, Eugenio): the Aptera-like smooth body. A full-width flat tail
-- with the hatch and tail panel as one piece, a deck built so it cannot form mounds, the belly sweeping up to a
-- thin trailing edge, a wide raised nose with a light bar across it. Merges only these keys into the saved design
-- (same selector as 0209, 0212, 0213 and 0217); every other value is kept.
-- The production DB is not reachable from the agents: the before value and the result are printed with RAISE NOTICE.
DO $$
DECLARE dst record;
BEGIN
  SELECT id, nombre, parametros INTO dst FROM aeromovil_disenos
  WHERE origen = 'equipo' AND archived_at IS NULL
    AND parametros->>'disposicion' = 'triciclo' AND parametros->>'tTraseras' = 'dos'
  ORDER BY (nombre LIKE 'Cuadriciclo Bala clásico%') DESC, created_at ASC LIMIT 1;
  IF dst.id IS NULL THEN
    RAISE NOTICE '0218: no saved Cuadriciclo Bala clásico found, nothing changed';
  ELSE
    RAISE NOTICE '0218: design % «%» before: %', dst.id, dst.nombre, dst.parametros::text;
    UPDATE aeromovil_disenos SET parametros = parametros || '{"tCubierta":"lisa","tColaAncho":1,"tColaGrosor":0.04,"tColaBombeo":0.01,"tBajosIni":0.8,"tBajosCurva":1,"tPuntaCola":0.59,"tMorroAncho":0.8,"tMorroGrosor":0.10,"tMorroBombeo":0.02,"tMorroAlto":0.15,"tFaro":"barra"}'::jsonb, updated_at = now() WHERE id = dst.id;
    RAISE NOTICE '0218: design % updated with the smooth body (full-width tail, one-piece hatch, belly sweep, wide nose, light bar)', dst.id;
  END IF;
END $$;
