-- 2026-11-24 (Eugenio), luzhumanidad.com home: «Esas 5 herramientas políticas intégralas en la web de
-- Luz & Humanidad, reciclando esas ilustraciones, y en vez de llamarlo Innovación en el sector
-- socioeconómico, llámalo Innovación en Política, bien grande, y que aparezcan ahí las 5. Humanity.wiki
-- sácala de ahí y ponla en Otras innovaciones, y llama a esa categoría "Informática". Y Política ya no
-- tiene sentido, ya que es una categoría en sí misma.» And: «La portada del proyecto Aeromóvil haz que
-- sea esta imagen».
--
-- On the root page (`KWMUO4S4V663`) and its «Proyectos» table (`BDTMUOOFFNGJIEG`):
--  1. The sector with icon «Economía» becomes «Innovación en Política», icon «Política», `destacado`
--     (both columns of the 2 × 2 grid, larger title: VistaProyectosSitio.tsx). «Otras innovaciones»
--     becomes «Informática», with that category's icon (`sitio.iconoOtros`).
--  2. Five rows in it, in this order: Observatorio de polarización, Perfiles políticos, Geometría
--     política, Democracia directa, Economía pública optimizada. Three are new rows (pages from 0235);
--     Geometría política gets the «Política» category; Economía pública optimizada keeps «Economía».
--  3. The «Política» row (`BDFOBSPOLARIZ01`) is hidden (`oculta`), not deleted: /politica still opens,
--     and its page still carries the five tools for anyone who has the address.
--  4. Humanity.wiki (`BDFMVDP4SCGRXS9`) moves from «Política» to «Informática», which no sector names,
--     so it lands in the last sector, now called «Informática».
--  5. The cover of each of the five pages is its illustration (public/politica/tarjetas/*.webp, drawn
--     from src/components/politica/VisualesHerramientas.tsx); the previous one stays in
--     `config.portadaAnterior`. The Aeromóvil (`KWMUQWKEQYOVMC`) gets the picture Eugenio sent
--     (public/aeromovil/portada-aeromovil.webp), the previous one kept the same way.
-- Relations live in `bd_enlaces` (src/server/bd/enlaces.ts), one row per link; the category column
-- is `BDCMUVNOEH62ZFF` and its targets are rows of «Sistemas»: «Política» `BDFMUZDLMG4BBYL`,
-- «Informática» `BDFMUZDMMG2VCEJ`. Every step checks what it touches exists, and can run twice.
DO $$
DECLARE
  raiz    text := 'KWMUO4S4V663';
  tabla   text := 'BDTMUOOFFNGJIEG';
  col_cat text := 'BDCMUVNOEH62ZFF';
  col_nom text := 'BDCMUOOFFNJE1A5';
  cat_pol text := 'BDFMUZDLMG4BBYL';
  cat_inf text := 'BDFMUZDMMG2VCEJ';
  fila_pol text := 'BDFOBSPOLARIZ01';
  base    record;
  base_orden int;
  h       record;
  fid     text;
  cfg     jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL)
     OR NOT EXISTS (SELECT 1 FROM bd_tablas WHERE id = tabla AND deleted_at IS NULL)
     OR NOT EXISTS (SELECT 1 FROM bd_columnas WHERE id = col_cat AND archived_at IS NULL)
     OR NOT EXISTS (SELECT 1 FROM bd_filas WHERE id = cat_pol AND deleted_at IS NULL) THEN
    RETURN;
  END IF;

  -- 1. The sectors
  SELECT config INTO cfg FROM knowledge_windows WHERE id = raiz;
  IF jsonb_typeof(cfg->'sitio'->'sectores') = 'array' THEN
    cfg := jsonb_set(cfg, '{sitio,sectores}', (
      SELECT jsonb_agg(CASE WHEN s->>'icono' IN ('Economía', 'Política')
        THEN s || jsonb_build_object('titulo', 'Innovación en Política', 'icono', 'Política', 'destacado', true)
        ELSE s END ORDER BY o)
      FROM jsonb_array_elements(cfg->'sitio'->'sectores') WITH ORDINALITY AS x(s, o)));
    cfg := jsonb_set(jsonb_set(cfg, '{sitio,sectorOtros}', to_jsonb('Informática'::text)), '{sitio,iconoOtros}', to_jsonb('Informática'::text));
    UPDATE knowledge_windows SET config = cfg, version = version + 1, updated_at = now() WHERE id = raiz;
  END IF;

  -- 2. The five tools, in order, starting where «Política» was
  SELECT * INTO base FROM bd_filas WHERE id = fila_pol AND deleted_at IS NULL;
  base_orden := COALESCE(base.orden, (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla));
  FOR h IN SELECT * FROM (VALUES
      (0, 'KWOBSERVPOL01',   'BDFOBSERVPOL01',  'Observatorio de polarización', '/politica/tarjetas/observatorio.webp', true),
      (1, 'KWPERFILESPOL01', 'BDFPERFILESPOL1', 'Perfiles políticos',           '/politica/tarjetas/perfiles.webp',     true),
      (2, 'KWGEOPOLARIZ01',  'BDFGEOPOLARIZ01', 'Geometría política',           '/politica/tarjetas/geometria.webp',    true),
      (3, 'KWDEMODIRECTA01', 'BDFDEMODIRECT01', 'Democracia directa',           '/politica/tarjetas/democracia.webp',   true),
      (4, 'KWMODELOSOCIO01', NULL,              'Economía pública optimizada',  '/politica/tarjetas/economia.webp',     false)
    ) AS t(n, pagina, fila, nombre, portada, politica)
  LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM knowledge_windows WHERE id = h.pagina AND deleted_at IS NULL);
    SELECT id INTO fid FROM bd_filas WHERE tabla_id = tabla AND pagina_id = h.pagina AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
    IF fid IS NULL AND h.fila IS NOT NULL THEN
      INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
      VALUES (h.fila, tabla,
              COALESCE(base.valores, '{}'::jsonb) || jsonb_build_object(col_nom, h.nombre),
              base_orden + h.n, h.pagina, base.created_by, base.updated_by)
      ON CONFLICT (id) DO NOTHING;
      fid := h.fila;
    END IF;
    CONTINUE WHEN fid IS NULL;
    UPDATE bd_filas SET orden = base_orden + h.n, oculta = false, updated_at = now() WHERE id = fid;
    IF h.politica THEN
      INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
      VALUES ('BDE' || substr(md5(fid || cat_pol), 1, 14), col_cat, fid, 'fila', cat_pol, 0, base.created_by)
      ON CONFLICT DO NOTHING;
    END IF;
    -- 5. Its illustration as its cover
    UPDATE knowledge_windows
       SET config = jsonb_set(config || CASE WHEN config ? 'portadaAnterior' OR NOT (config ? 'portada') THEN '{}'::jsonb
                                            ELSE jsonb_build_object('portadaAnterior', config->'portada') END,
                              '{portada}', to_jsonb(h.portada)),
           version = version + 1, updated_at = now()
     WHERE id = h.pagina AND config->>'portada' IS DISTINCT FROM h.portada;
    fid := NULL;
  END LOOP;

  -- 3. «Política» leaves the list
  UPDATE bd_filas SET oculta = true, updated_at = now() WHERE id = fila_pol AND oculta = false;

  -- 4. Humanity.wiki: from «Política» to «Informática»
  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = 'BDFMVDP4SCGRXS9' AND deleted_at IS NULL)
     AND EXISTS (SELECT 1 FROM bd_filas WHERE id = cat_inf AND deleted_at IS NULL) THEN
    DELETE FROM bd_enlaces WHERE columna_id = col_cat AND fila_origen = 'BDFMVDP4SCGRXS9' AND destino_id = cat_pol;
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDE' || substr(md5('BDFMVDP4SCGRXS9' || cat_inf), 1, 14), col_cat, 'BDFMVDP4SCGRXS9', 'fila', cat_inf, 0, base.created_by)
    ON CONFLICT DO NOTHING;
  END IF;

  -- The Aeromóvil's cover
  UPDATE knowledge_windows
     SET config = jsonb_set(config || CASE WHEN config ? 'portadaAnterior' OR NOT (config ? 'portada') THEN '{}'::jsonb
                                          ELSE jsonb_build_object('portadaAnterior', config->'portada') END,
                            '{portada}', to_jsonb('/aeromovil/portada-aeromovil.webp'::text)),
         version = version + 1, updated_at = now()
   WHERE id = 'KWMUQWKEQYOVMC' AND deleted_at IS NULL AND config->>'portada' IS DISTINCT FROM '/aeromovil/portada-aeromovil.webp';
END $$;
