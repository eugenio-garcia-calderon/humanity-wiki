-- 2026-11-25 (Eugenio), luzhumanidad.com: «separa lo que son invenciones de lo que son comunidades beneficiadas. Las
-- comunidades beneficiadas ponlas abajo… las comunidades energéticas, los proyectos solidarios de energía… y en el
-- modelo de ecocomunidad, Ikigaia, Villabosque, Oasis del Jarama… separa los modelos y luego las creaciones».
--
-- 1. A select column «Tipo» in the projects table (`BDTMUOOFFNGJIEG`) with two options: «Invento o modelo» and
--    «Comunidad beneficiada». Eugenio can change it per row in the table.
-- 2. The beneficiary communities get «Comunidad beneficiada»: the solar communities (Mazarrón, Pisuerga, Villalbilla,
--    Nuevo Baztán), the projects of Sol Solidario that bring energy to people (Kenia, Amazonas, Hogar Lázaro, Cañada,
--    Guajira, Sagunto, Zaqueo, Honduras, Mozambique) and the ecovillages (Villabosque, Oasis del Jarama, Ikigaia).
--    The other top-level projects get «Invento o modelo». Sol Solidario's tools (Crowd, Tienda, Cursos) stay empty:
--    they keep living inside Sol Solidario only.
-- 3. `sitio.beneficiarias` on the root page (`KWMUO4S4V663`) names the column and the option, so the home page
--    shows those rows apart, below the sectors (`VistaProyectosSitio`).
-- Guarded: does nothing without the table or the page, and never overwrites a value already set.
DO $$
DECLARE
  tabla  text := 'BDTMUOOFFNGJIEG';
  raiz   text := 'KWMUO4S4V663';
  col    text := 'BDCTIPOPROYECT1';
  inv    text := 'OPTTIPOINVENTO1';
  ben    text := 'OPTTIPOBENEFIC1';
  madre  text := 'BDCPROYMADRE01';
  benef  text[] := ARRAY['BDFNTDZT1HORE597','BDFNTRQ9WI5JQF95','BDFNTERGPU6IU32T','BDFNTK94IVQCCNSX',
    'BDFNTUT0U667BPC1','BDFNTVJGQ1NQ04D9','BDFNTQY7O0GRDO60','BDFNTQXJ0188QSIS','BDFNT9W2HZNFZW27','BDFNTDOF56F159B6',
    'BDFMVE3WNNR65YX','BDFNTXJQF1VH0BFF','BDFNTHIX1L0M795D',
    'BDFNTJ0N1NEAULJM','BDFNT4EAQR7DZYML','BDFMVDY616C76ZH'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM bd_tablas WHERE id = tabla AND deleted_at IS NULL) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL) THEN RETURN; END IF;

  INSERT INTO bd_columnas (id, tabla_id, nombre, tipo, opciones, config, orden)
  VALUES (col, tabla, 'Tipo', 'seleccion',
    jsonb_build_array(
      jsonb_build_object('id', inv, 'label', 'Invento o modelo', 'color', '#337ea9'),
      jsonb_build_object('id', ben, 'label', 'Comunidad beneficiada', 'color', '#448361')),
    '{}'::jsonb, (SELECT COALESCE(max(orden), -1) + 1 FROM bd_columnas WHERE tabla_id = tabla))
  ON CONFLICT (id) DO NOTHING;

  UPDATE bd_filas SET valores = valores || jsonb_build_object(col, ben)
  WHERE tabla_id = tabla AND id = ANY(benef) AND deleted_at IS NULL AND NOT (valores ? col);

  UPDATE bd_filas SET valores = valores || jsonb_build_object(col, inv)
  WHERE tabla_id = tabla AND deleted_at IS NULL AND NOT (valores ? col) AND NOT (id = ANY(benef))
    AND COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(valores->madre) = 'array' THEN valores->madre END), 0) = 0
    AND NOT EXISTS (SELECT 1 FROM bd_enlaces e WHERE e.fila_origen = bd_filas.id AND e.columna_id = madre);

  UPDATE knowledge_windows
  SET config = jsonb_set(config, '{sitio,beneficiarias}', jsonb_build_object('columna', col, 'opcion', ben)),
      version = version + 1, updated_at = now()
  WHERE id = raiz AND jsonb_typeof(config->'sitio') = 'object'
    AND config->'sitio'->'beneficiarias' IS DISTINCT FROM jsonb_build_object('columna', col, 'opcion', ben);
END $$;
