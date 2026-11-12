-- 2026-11-12 (Eugenio): «quiero que el modelo socioeconómico optimizado esté
-- embebido en la página luzhumanidad.com/modelo-socioeconomico-optimizado/
-- impuesto-unico, pero quitando lo de impuesto único en la URL».
--
-- 1. The project page (`KWMODELOSOCIO01`, created by 0184) moves to the
--    one-part address `modelo-socioeconomico-optimizado`. A one-part address
--    resolves by slug (`porContexto`, src/server/sitios.ts).
-- 2. The old address is kept in `direcciones_anteriores` (0158), so links
--    already shared answer with a 301 to the new one (`anterior`, sitios.ts).
-- 3. The texts 0184 wrote still said «0, 20 y 40 %»; the model moved to
--    10/25/40 on top of the price on 2026-11-11. They are what the project
--    card, the server HTML and search engines read, so they are corrected —
--    only where they are still exactly what 0184 wrote (an edit made by hand
--    in the editor is left alone).
--
-- Guarded: does nothing in a database without that page, and never takes an
-- address another page of the same owner already uses.
DO $$
DECLARE
  pagina  text := 'KWMODELOSOCIO01';
  vieja   text := 'modelo-socioeconomico-optimizado/impuesto-unico';
  nueva   text := 'modelo-socioeconomico-optimizado';
  u       text;
  actual  text;
  cfg     jsonb;
BEGIN
  SELECT creator_user_id, slug, config INTO u, actual, cfg
  FROM knowledge_windows WHERE id = pagina AND deleted_at IS NULL;
  IF u IS NULL THEN RETURN; END IF;

  IF actual = vieja AND NOT EXISTS (
       SELECT 1 FROM knowledge_windows
       WHERE creator_user_id = u AND slug = nueva AND id <> pagina AND deleted_at IS NULL) THEN
    UPDATE knowledge_windows SET slug = nueva, updated_at = now() WHERE id = pagina;
    INSERT INTO direcciones_anteriores (duenyo_user_id, slug, pagina_id)
    VALUES (u, vieja, pagina)
    ON CONFLICT (duenyo_user_id, slug) DO UPDATE SET pagina_id = EXCLUDED.pagina_id, created_at = now();
  END IF;

  IF cfg->>'subtitulo' = 'Un solo impuesto sobre cada pago, en tres tramos (0, 20 y 40 %), repartido al instante entre ocho escalas: de la persona al planeta' THEN
    cfg := jsonb_set(cfg, '{subtitulo}', to_jsonb('Un solo impuesto que se suma al precio de cada pago, como el IVA, en tres tramos (10, 25 y 40 %), repartido al instante entre ocho escalas: de la persona al planeta'::text));
  END IF;
  IF cfg #>> '{bloques,0,texto}' = 'Un modelo socioeconómico con un solo impuesto sobre cada transacción, sin ningún otro impuesto ni tasa, en tres tramos: 0 % en lo de primera necesidad (agua, energía, vivienda, movilidad, comida), 20 % en lo de segunda necesidad y 40 % en el ocio y el lujo; en los sueldos, 0 % si los paga una empresa pequeña, 20 % una mediana y 40 % una grande. El propio sistema de pago lo aparta al instante y lo reparte en ocho partes iguales entre las escalas en las que vivimos: la persona, la comunidad vecinal o la familia, el municipio, la provincia, la región, la nación, el continente y el planeta.' THEN
    cfg := jsonb_set(cfg, '{bloques,0,texto}', to_jsonb('Un modelo socioeconómico con un solo impuesto sobre cada transacción, sin ningún otro impuesto ni tasa, que se suma al precio como el IVA, en tres tramos: 10 % en lo de primera necesidad (agua, energía, vivienda, movilidad, comida), 25 % en lo de segunda necesidad y 40 % en el ocio y el lujo; en los sueldos, 10 % si los paga una empresa pequeña, 25 % una mediana y 40 % una grande. El propio sistema de pago lo aparta al instante y lo reparte en ocho partes iguales entre las escalas en las que vivimos: la persona, la comunidad vecinal o la familia, el municipio, la provincia, la región, la nación, el continente y el planeta.'::text));
  END IF;
  IF cfg #>> '{bloques,2,alt}' = 'Esquema del modelo: cada pago aporta su tramo (0, 20 o 40 %) al sistema de pago, que lo pasa a un fondo común abierto; el fondo da un octavo a cada una de las ocho escalas, que lo reparten en tercios y devuelven servicios a las personas, y las personas votan las prioridades de cada escala.' THEN
    cfg := jsonb_set(cfg, '{bloques,2,alt}', to_jsonb('Esquema del modelo: cada pago aporta su tramo (10, 25 o 40 %) al sistema de pago, que lo pasa a un fondo común abierto; el fondo da un octavo a cada una de las ocho escalas, que lo reparten en tercios y devuelven servicios a las personas, y las personas votan las prioridades de cada escala.'::text));
  END IF;
  IF cfg IS DISTINCT FROM (SELECT config FROM knowledge_windows WHERE id = pagina) THEN
    UPDATE knowledge_windows SET config = cfg, updated_at = now() WHERE id = pagina;
  END IF;
END $$;
