-- 2026-11-12 (Eugenio): «no veo lo de la optimización con inteligencia
-- artificial y software de la cadena de valor, integrado en el proyecto que
-- aparece en luzhumanidad.com, fusiónalo».
--
-- One page instead of two: the page of «Optimización del sistema de energía»
-- (0205) now shows the app `cadena-solar` (src/pages/CadenaSolar.tsx), which
-- opens with the Suntropy investment and carries a «Con IA y software» layer on
-- every link. Its blocks stay, plus one about that layer, for the card, the
-- server HTML and search engines.
-- The «Cadena de valor solar» row (0204) leaves «Proyectos» (soft delete, so
-- it is no longer a sub-project of itself); its page stays so old links work.
-- Guarded: nothing if the page is gone; run twice, the block is added once.
UPDATE knowledge_windows
SET config = jsonb_set(
      config || jsonb_build_object('aplicacion', 'cadena-solar',
        'subtitulo', 'IA y software para toda la cadena de valor solar, con Suntropy, pionera en España en optimización'),
      '{bloques}',
      COALESCE(config->'bloques', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', 'Boptener11', 'tipo', 'parrafo', 'texto',
        'La cadena de valor solar en doce eslabones (captación, estudio, diseño, presupuesto, compras, instalación, legalización, monitorización, mantenimiento, optimización, reparto en comunidades y fin de vida) y, en cada uno, lo que la inteligencia artificial y el software pueden optimizar.'))),
    updated_at = now()
WHERE id = 'KWOPTIMENERGIA1' AND deleted_at IS NULL
  AND NOT (config->'bloques' @> '[{"id":"Boptener11"}]'::jsonb);

UPDATE bd_filas SET deleted_at = now()
WHERE id = 'BDFCADENASOLAR1' AND deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM knowledge_windows WHERE id = 'KWOPTIMENERGIA1' AND deleted_at IS NULL);
