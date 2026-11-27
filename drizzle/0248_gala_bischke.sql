-- 2026-11-27 (Eugenio): «a Gala, en personas ponle el apellido de Gala "Bischke"».
-- Personas (`BDTMUR01Z33IJ3N`) of luzhumanidad.com has one row named just «Gala» (`BDFNT8Z1K6QBI9AF`, page
-- `KWNT0ZTDE51I21W`, read from the public API on 2026-11-27). The row is found by table and current name rather
-- than by that id alone, and only when exactly one row is called «Gala»: if the name was already changed by hand,
-- or there are two, nothing happens. The name lives in two places, the Nombre cell and the title of the person's
-- page; both change.
DO $$
DECLARE
  tabla      text := 'BDTMUR01Z33IJ3N';
  col_nombre text := 'BDCMUR01Z37GLYB';
  nuevo      text := 'Gala Bischke';
  n          int;
  f          record;
BEGIN
  SELECT count(*) INTO n FROM bd_filas
  WHERE tabla_id = tabla AND deleted_at IS NULL AND btrim(valores->>col_nombre) = 'Gala';
  IF n <> 1 THEN
    RAISE NOTICE 'Gala: % filas llamadas «Gala» en Personas; no se cambia nada', n;
    RETURN;
  END IF;
  SELECT id, pagina_id INTO f FROM bd_filas
  WHERE tabla_id = tabla AND deleted_at IS NULL AND btrim(valores->>col_nombre) = 'Gala';

  UPDATE bd_filas SET valores = jsonb_set(valores, ARRAY[col_nombre], to_jsonb(nuevo)), updated_at = now()
  WHERE id = f.id;
  IF f.pagina_id IS NOT NULL THEN
    UPDATE knowledge_windows SET title = nuevo, version = version + 1, updated_at = now()
    WHERE id = f.pagina_id AND deleted_at IS NULL AND btrim(title) = 'Gala';
  END IF;
  RAISE NOTICE 'Gala: fila % y página % renombradas a «%»', f.id, f.pagina_id, nuevo;
END $$;
