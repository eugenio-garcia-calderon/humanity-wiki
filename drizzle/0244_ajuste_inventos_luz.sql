-- 2026-11-26 (Eugenio), luzhumanidad.com: «saca la Plataforma de Financiación Colectiva Solar Crowd como inventos. Los
-- Productos Solares de la Tienda también. La Bicicleta Solar ponla como invento, y el activismo energético en España
-- como comunidad beneficiaria para cambiar la ley del impuesto al Sol. La divulgación en colegios, también ponlos como
-- beneficiarios, y los cursos.»
-- The «Tipo» column from 0243 (`BDCTIPOPROYECT1`). Crowd and the Tienda live inside Sol Solidario: marked as inventions
-- they now also show among the inventions on the home page (`VistaProyectosSitio`). Runs twice with the same result.
DO $$
DECLARE
  tabla text := 'BDTMUOOFFNGJIEG';
  col   text := 'BDCTIPOPROYECT1';
  inv   text := 'OPTTIPOINVENTO1';
  ben   text := 'OPTTIPOBENEFIC1';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bd_columnas WHERE id = col AND tabla_id = tabla) THEN RETURN; END IF;
  UPDATE bd_filas SET valores = valores || jsonb_build_object(col, inv), updated_at = now()
  WHERE tabla_id = tabla AND id IN ('BDFNTSTY4XY5SH4B', 'BDFMVDU4N2KAWOC', 'BDFMUVNM5UY0H12')
    AND valores->>col IS DISTINCT FROM inv;
  UPDATE bd_filas SET valores = valores || jsonb_build_object(col, ben), updated_at = now()
  WHERE tabla_id = tabla AND id IN ('BDFMVDXKJOXKN8D', 'BDFMVDXLR7NO8FR', 'BDFMVDU8V45HILF')
    AND valores->>col IS DISTINCT FROM ben;
END $$;
