-- 2026-11-12 (Eugenio): «Llámalo "Modelo Público Optimizado"». Renames the
-- project page (`KWMODELOSOCIO01`) and its projects-table row again, from
-- either earlier name (0184's or 0207's); a name changed by hand in the editor
-- is left alone. Addresses do not change.
UPDATE knowledge_windows
SET title = 'Modelo Público Optimizado', updated_at = now()
WHERE id = 'KWMODELOSOCIO01' AND title IN ('Modelo socioeconómico optimizado', 'Modelo De País Optimizado');

UPDATE bd_filas f
SET valores = jsonb_set(f.valores, ARRAY[k.key], to_jsonb('Modelo Público Optimizado'::text)), updated_at = now()
FROM bd_filas g, jsonb_each_text(g.valores) AS k(key, value)
WHERE f.id = g.id AND f.pagina_id = 'KWMODELOSOCIO01'
  AND k.value IN ('Modelo socioeconómico optimizado', 'Modelo De País Optimizado');
