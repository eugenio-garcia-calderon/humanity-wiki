-- 2026-11-27: fix for 0246. The button «Quiero sumarme al equipo» of the page `KWSALUDMEDICI01` pointed to
-- `/colabora?proyecto=conocimiento-medicina`, but the contact form identifies a project by its address on the
-- site, which comes from the title and not from `knowledge_windows.slug`: production lists it as
-- `plataforma-de-agregacion-del-conocimiento-de-la-medicina` (`GET /api/sitio/KWMUO4S4V663/formulario`, read after
-- the deploy). With the wrong value the form opened without the project chosen. Only that block's url changes.
UPDATE knowledge_windows
SET config = jsonb_set(config, '{bloques}', (
      SELECT jsonb_agg(CASE WHEN b->>'id' = 'Bsaludmed15'
        THEN jsonb_set(b, '{boton,url}', to_jsonb('/colabora?proyecto=plataforma-de-agregacion-del-conocimiento-de-la-medicina&motivo=voluntariado'::text))
        ELSE b END ORDER BY o)
      FROM jsonb_array_elements(config->'bloques') WITH ORDINALITY AS x(b, o))),
    version = version + 1, updated_at = now()
WHERE id = 'KWSALUDMEDICI01' AND deleted_at IS NULL
  AND jsonb_typeof(config->'bloques') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(config->'bloques') b
              WHERE b->>'id' = 'Bsaludmed15' AND b->'boton'->>'url' LIKE '/colabora?proyecto=conocimiento-medicina%');
