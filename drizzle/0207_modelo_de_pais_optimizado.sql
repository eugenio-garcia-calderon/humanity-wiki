-- 2026-11-12 (Eugenio): «Cambia el nombre al proyecto, y pon "Modelo De País
-- Optimizado"». Renames the project page (`KWMODELOSOCIO01`, created by 0184)
-- and its row in the projects table. The addresses do not change, so every
-- link already shared keeps working.
--
-- Only where the name is still exactly the one 0184 wrote: a name changed by
-- hand in the editor is left alone. Does nothing in a database without them.
UPDATE knowledge_windows
SET title = 'Modelo De País Optimizado', updated_at = now()
WHERE id = 'KWMODELOSOCIO01' AND title = 'Modelo socioeconómico optimizado';

UPDATE bd_filas f
SET valores = jsonb_set(f.valores, ARRAY[k.key], to_jsonb('Modelo De País Optimizado'::text)), updated_at = now()
FROM bd_filas g, jsonb_each_text(g.valores) AS k(key, value)
WHERE f.id = g.id AND f.pagina_id = 'KWMODELOSOCIO01' AND k.value = 'Modelo socioeconómico optimizado';
