-- 2026-11-12 (Eugenio): «haz un web en luzhumanidad.com que sea de la cadena de
-- valor de instalación de energía solar en España, desde el diseño de la
-- instalación, presupuesto, sourcing, instalación, legalización,
-- mantenimiento, monitoreo, optimización, reparto en comunidades, etc. Hazlo
-- visual». And: «hazlo de forma horizontal la cadena, con desplegables».
--
-- Same recipe as 0202 (Sol Solidario): the row «Cadena de valor solar» in
-- «Proyectos» (`BDTMUOOFFNGJIEG`) and its page, whose `config.aplicacion =
-- 'cadena-solar'` is src/pages/CadenaSolar.tsx, served at /cadena-solar under
-- the site bar. Its blocks are what the card, the server HTML and search
-- engines read. Area: Energía (taken from Luz para Kenia, as 0202 does).
-- Guarded: nothing without the table, nothing twice.
DO $$
DECLARE
  tabla        text := 'BDTMUOOFFNGJIEG';
  raiz         text := 'KWMUO4S4V663';
  col_nombre   text := 'BDCMUOOFFNJE1A5';
  col_estado   text := 'BDCJ64F1ASLAPH';
  col_fecha    text := 'BDCMUR28JC1UKN9';
  col_areas    text := 'BDCMUVNOEH62ZFF';
  col_equipo   text := 'BDCMUVMW1GFJEIW';
  op_inicial   text := 'OPTFOCOPRINC01';
  persona      text := 'BDFMVDVHJK2BBSN';
  kenia        text := 'BDFNTUT0U667BPC1';
  pagina       text := 'KWCADENASOLAR01';
  fila         text := 'BDFCADENASOLAR1';
  ruta         text := 'cadena-solar';
  imagen       text := '/uploads/2026/11/144a05f5-696a-4695-ad96-35c067d081d2.jpg';
  u            text;
  t            record;
BEGIN
  SELECT b.*, p.publico AS proyecto_publico INTO t
  FROM bd_tablas b LEFT JOIN proyectos p ON p.id = b.proyecto_id
  WHERE b.id = tabla AND b.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT creator_user_id INTO u FROM knowledge_windows WHERE id = raiz AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  IF EXISTS (SELECT 1 FROM knowledge_windows WHERE id = pagina)
     OR EXISTS (SELECT 1 FROM bd_filas WHERE id = fila)
     OR EXISTS (SELECT 1 FROM knowledge_windows WHERE creator_user_id = u AND slug = ruta) THEN
    RETURN;
  END IF;

  INSERT INTO knowledge_windows (id, title, kind, config, publico, creator_user_id, is_ai_generated, created_by, updated_by, proyecto_id, slug)
  VALUES (
    pagina, 'Cadena de valor solar', 'pagina',
    jsonb_build_object(
      'aplicacion', 'cadena-solar',
      'subtitulo', 'Los once eslabones de una instalación solar en España: estudio, diseño, presupuesto, compras, instalación, legalización, monitorización, mantenimiento, optimización, reparto en comunidades y reciclaje',
      'portada', imagen,
      'imagenCompartir', imagen,
      'bloques', jsonb_build_array(
        jsonb_build_object('id', 'Bcadsolar01', 'tipo', 'parrafo', 'texto',
          'La cadena de valor de una instalación de energía solar en España, del primer vistazo a la factura al reciclaje del último panel: estudio del consumo y del tejado, diseño e ingeniería, presupuesto y financiación, compra de equipos, instalación, legalización ante el ayuntamiento, la comunidad autónoma, la distribuidora y la comercializadora, monitorización, mantenimiento, optimización, reparto de la energía en autoconsumo colectivo y comunidades energéticas, y fin de vida.'),
        jsonb_build_object('id', 'Bcadsolar02', 'tipo', 'parrafo', 'texto',
          'Para cada eslabón: sus actividades, quién las hace, cuánto tarda, dónde se atasca y cómo se puede mejorar. Con los plazos (montar una instalación lleva días; legalizarla, meses), el reparto del precio y un simulador de coeficientes de reparto fijos y horarios entre vecinos.'),
        jsonb_build_object('id', 'Bcadsolar03', 'tipo', 'imagen', 'url', imagen,
          'alt', 'Paneles solares en las dos aguas de un tejado de teja.')
      )
    ),
    CASE WHEN t.proyecto_id IS NOT NULL THEN COALESCE(t.proyecto_publico, false) ELSE false END,
    u, false, u, u, t.proyecto_id, ruta
  );

  INSERT INTO bd_filas (id, tabla_id, valores, orden, pagina_id, created_by, updated_by)
  VALUES (
    fila, tabla,
    jsonb_build_object(col_nombre, 'Cadena de valor solar', col_estado, op_inicial, col_fecha, '2026'),
    (SELECT COALESCE(max(orden), -1) + 1 FROM bd_filas WHERE tabla_id = tabla),
    pagina, u, u
  );

  IF EXISTS (SELECT 1 FROM bd_filas WHERE id = persona AND deleted_at IS NULL) THEN
    INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
    VALUES ('BDECADENASOLA01', col_equipo, fila, 'fila', persona, 0, u) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO bd_enlaces (id, columna_id, fila_origen, clase, destino_id, orden, created_by)
  SELECT 'BDECADENASOLA02', col_areas, fila, 'fila', e.destino_id, 0, u
  FROM bd_enlaces e WHERE e.columna_id = col_areas AND e.fila_origen = kenia
  ORDER BY e.orden LIMIT 1
  ON CONFLICT DO NOTHING;
END $$;
