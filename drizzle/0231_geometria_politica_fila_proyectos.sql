-- 2026-11-18 (Eugenio): «sigue sin funcionar» — luzhumanidad.com/geometria-politica, 404.
--
-- The page «Política» is a row of the «Proyectos» table of Luz & Humanidad (0194 gave it
-- `bd_filas.pagina_id`). A one-part address on the domain only opens a page that hangs from
-- the domain page, and a page hangs from a table row too (`madresValidas`, src/server/permisos.ts,
-- first branch: the row's table is shown by a page of the same owner). The copy made by 0229
-- has no row, so it was not a child and answered 404. 0230 gave it a `subpagina` link, which
-- is the second branch and is not enough on its own.
--
-- This gives the copy the same row as «Política», in the same table, named «Geometría política».
-- It runs once: it skips when the copy already has a row.
DO $$
DECLARE
  base  text := 'KWMOBSPOLARIZ01';
  geo   text := 'KWGEOPOLARIZ01';
  f     record;
  nuevos jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM bd_filas WHERE pagina_id = geo AND deleted_at IS NULL) THEN RETURN; END IF;
  SELECT * INTO f FROM bd_filas WHERE pagina_id = base AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
  IF f.id IS NULL THEN RETURN; END IF;

  -- Every text cell that still says the old name now says the geometry's name.
  SELECT jsonb_object_agg(k, CASE WHEN jsonb_typeof(v) = 'string'
           AND (v #>> '{}') IN ('Política', 'Observatorio de Polarización', 'Observatorio de Polarización Política')
         THEN to_jsonb('Geometría política'::text) ELSE v END)
  INTO nuevos FROM jsonb_each(f.valores) AS x(k, v);

  INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
  VALUES ('BDFGEOPOLARIZ01', f.tabla_id, COALESCE(nuevos, f.valores),
          (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = f.tabla_id),
          geo, f.created_by, f.updated_by)
  ON CONFLICT (id) DO NOTHING;
END $$;
