-- 2026-11-12 (Eugenio), luzhumanidad.com:
--   «Añade innovación en vivienda y comunidad (Viviendas Mínimas Viables, Modelo
--   Urbanístico Orgánico, Fábrica de Casas, Villabosque, Oasis del Jarama,
--   Ikigaia); oculta de cara al público La Voz Verde y Wiki Creator App; el
--   sector socioeconómico, también político; Pedaleo Solar, en el energético y
--   llámalo Activismo energético, aunque menciona que se llamaba Pedaleo Solar;
--   bajo el logo, Optimización de los sistemas de la humanidad; quita lo de
--   impulsamos proyectos…; y Colaborar, arriba a la derecha en el menú.»
DO $$
DECLARE
  raiz         text := 'KWMUO4S4V663';
  tabla        text := 'BDTMUOOFFNGJIEG';
  col_nombre   text := 'BDCMUOOFFNJE1A5';
  col_areas    text := 'BDCMUVNOEH62ZFF';
  villalbilla  text := 'BDFNTERGPU6IU32T';
  pedaleo      text := 'BDFMVDXKJOXKN8D';
  pag_pedaleo  text := 'KWMVDXKJP37DNE';
  vieja        text := 'pedaleo-solar';
  nueva        text := 'activismo-energetico';
  energia      text;
  u            text;
  actual       text;
BEGIN
  -- 1. The root: sectors, slogan, no headline, Colaborar in the bar.
  UPDATE knowledge_windows
     SET config = jsonb_set(jsonb_set(jsonb_set(jsonb_set(config,
           '{sitio,sectores}', jsonb_build_array(
             jsonb_build_object('titulo', 'Innovación en el sector de la movilidad', 'icono', 'Movilidad',
               'areas', jsonb_build_array('Movilidad', 'Transporte')),
             jsonb_build_object('titulo', 'Innovación en el sector socioeconómico y político', 'icono', 'Economía',
               'areas', jsonb_build_array('Política', 'Economía', 'Sociología', 'Justicia', 'Trabajo', 'Demografía')),
             jsonb_build_object('titulo', 'Innovación en el sector energético', 'icono', 'Energía',
               'areas', jsonb_build_array('Energía')),
             jsonb_build_object('titulo', 'Innovación en vivienda y comunidad', 'icono', 'Vivienda',
               'areas', jsonb_build_array('Vivienda', 'Urbanismo', 'Comunidad')),
             jsonb_build_object('titulo', 'Innovación en educación, cultura y conciencia', 'icono', 'Educación',
               'areas', jsonb_build_array('Educación', 'Cultura', 'Arte', 'Conciencia', 'Psicología', 'Humanología')))),
           '{sitio,eslogan}', to_jsonb('Optimización de los sistemas de la humanidad'::text)),
           '{sitio,presentacion}', 'false'::jsonb),
           '{sitio,colaborarEnBarra}', 'true'::jsonb),
         version = version + 1
   WHERE id = raiz AND config ? 'sitio';

  -- 2. Hidden from the public (still in the table and the editor).
  UPDATE bd_filas SET oculta = true, updated_at = now()
   WHERE id IN ('BDFMVDWYF0HZMEL', 'BDFMVDP1QOM1602') AND tabla_id = tabla;

  -- 3. Pedaleo Solar → Activismo energético, in the energy sector.
  SELECT creator_user_id, slug INTO u, actual FROM knowledge_windows WHERE id = pag_pedaleo AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;
  UPDATE bd_filas SET valores = jsonb_set(valores, ARRAY[col_nombre], to_jsonb('Activismo energético'::text)), updated_at = now()
   WHERE id = pedaleo AND valores->>col_nombre = 'Pedaleo Solar';
  UPDATE knowledge_windows
     SET title = 'Activismo energético',
         config = jsonb_set(config, '{subtitulo}', to_jsonb('Pedaleo Solar: 3.890 km en bicicleta solar por España contra el impuesto al sol'::text)),
         version = version + 1, updated_at = now()
   WHERE id = pag_pedaleo AND title = 'Pedaleo Solar';
  -- Its address follows the name; the old one answers with a 301 (`direcciones_anteriores`, 0158).
  IF COALESCE(actual, vieja) = vieja AND NOT EXISTS (
       SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = nueva AND id <> pag_pedaleo AND deleted_at IS NULL) THEN
    UPDATE knowledge_windows SET slug = nueva WHERE id = pag_pedaleo;
    INSERT INTO direcciones_anteriores (duenyo_user_id, slug, pagina_id) VALUES (u, vieja, pag_pedaleo)
    ON CONFLICT (duenyo_user_id, slug) DO UPDATE SET pagina_id = EXCLUDED.pagina_id, created_at = now();
  END IF;
  -- Its category: Energía (the one Villalbilla has) instead of Política.
  SELECT destino_id INTO energia FROM bd_enlaces WHERE columna_id = col_areas AND fila_origen = villalbilla ORDER BY orden LIMIT 1;
  IF energia IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bd_enlaces WHERE columna_id = col_areas AND fila_origen = pedaleo AND destino_id = energia) THEN
    DELETE FROM bd_enlaces WHERE columna_id = col_areas AND fila_origen = pedaleo;
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDEPEDALEOENER1', col_areas, pedaleo, 'fila', energia, 0, u) ON CONFLICT DO NOTHING;
  END IF;
END $$;
