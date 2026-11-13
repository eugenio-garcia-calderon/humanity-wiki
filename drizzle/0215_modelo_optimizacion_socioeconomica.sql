-- 2026-11-13 (Eugenio): the project's name, in the middle of the site bar, is
-- «Modelo de optimización socioeconómica». Renames the project page
-- (`KWMODELOSOCIO01`) and its projects-table row from any earlier name
-- (0184, 0207, 0208); a name changed by hand in the editor is left alone.
-- Addresses do not change.
UPDATE knowledge_windows
SET title = 'Modelo de optimización socioeconómica', updated_at = now()
WHERE id = 'KWMODELOSOCIO01'
  AND title IN ('Modelo socioeconómico optimizado', 'Modelo De País Optimizado', 'Modelo Público Optimizado');

UPDATE bd_filas f
SET valores = jsonb_set(f.valores, ARRAY[k.key], to_jsonb('Modelo de optimización socioeconómica'::text)), updated_at = now()
FROM bd_filas g, jsonb_each_text(g.valores) AS k(key, value)
WHERE f.id = g.id AND f.pagina_id = 'KWMODELOSOCIO01'
  AND k.value IN ('Modelo socioeconómico optimizado', 'Modelo De País Optimizado', 'Modelo Público Optimizado');
