-- 2026-11-12 (Eugenio): «coge la configuración de los sliders del triciclo bala y
-- aplícasela al cuadriciclo bala nuevo, y cámbiale el nombre a cuadriciclo bala»;
-- then: «El antiguo llámalo cuadriciclo bala en rombo, y el nuevo cuadriciclo bala
-- clásico».
--
-- 1. The four-wheel team design (Triciclo with "tTraseras": "dos", created by 0197)
--    gets the saved Triciclo's parameters again, as they are at deploy time, and
--    the name «Cuadriciclo Bala clásico». Same source rule as 0197: the default
--    design if it is a Triciclo, otherwise the most recently saved team Triciclo.
--    The rear track is not carried (the Triciclo has none), so it opens equal to
--    the front track. If 0197 found nothing to copy, the row is created here.
-- 2. Team designs of the old rombo family ("disposicion": "bala") whose name
--    starts with «Cuadriciclo Bala» become «Cuadriciclo Bala en rombo…». Visitor
--    designs keep the name their author gave them.
-- The NOTICEs say in the deploy log which row was copied and what changed.
DO $$
DECLARE
  src record;
  dst_id integer;
  n integer;
BEGIN
  SELECT id, nombre, parametros, updated_at, autor, created_by INTO src
  FROM aeromovil_disenos
  WHERE archived_at IS NULL AND parametros->>'disposicion' = 'triciclo'
    AND COALESCE(parametros->>'tTraseras', 'una') = 'una'
    AND (por_defecto OR origen = 'equipo')
  ORDER BY por_defecto DESC, updated_at DESC
  LIMIT 1;

  IF src.id IS NULL THEN
    RAISE NOTICE '0198: no saved Triciclo found, four-wheel design left as it is';
  ELSE
    SELECT id INTO dst_id
    FROM aeromovil_disenos
    WHERE origen = 'equipo' AND archived_at IS NULL
      AND parametros->>'disposicion' = 'triciclo' AND parametros->>'tTraseras' = 'dos'
    ORDER BY (nombre LIKE 'Bala de cuatro ruedas%') DESC, created_at ASC
    LIMIT 1;

    IF dst_id IS NULL THEN
      INSERT INTO aeromovil_disenos (nombre, parametros, autor, origen, created_by)
      VALUES ('Cuadriciclo Bala clásico', src.parametros || '{"tTraseras": "dos"}'::jsonb,
              src.autor, 'equipo', src.created_by)
      RETURNING id INTO dst_id;
      RAISE NOTICE '0198: created four-wheel design %', dst_id;
    ELSE
      UPDATE aeromovil_disenos
      SET parametros = src.parametros || '{"tTraseras": "dos"}'::jsonb,
          nombre = 'Cuadriciclo Bala clásico',
          updated_at = now()
      WHERE id = dst_id;
      RAISE NOTICE '0198: updated four-wheel design %', dst_id;
    END IF;
    RAISE NOTICE '0198: copied from Triciclo % «%», saved %', src.id, src.nombre, src.updated_at;
    RAISE NOTICE '0198: parametros %', src.parametros::text;
  END IF;

  UPDATE aeromovil_disenos
  SET nombre = 'Cuadriciclo Bala en rombo' || substr(nombre, length('Cuadriciclo Bala') + 1)
  WHERE origen = 'equipo' AND parametros->>'disposicion' = 'bala'
    AND nombre LIKE 'Cuadriciclo Bala%' AND nombre NOT LIKE 'Cuadriciclo Bala en rombo%';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '0198: % rombo design(s) renamed', n;
END $$;
