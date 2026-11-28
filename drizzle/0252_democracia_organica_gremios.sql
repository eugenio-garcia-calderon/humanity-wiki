-- 2026-11-28 (Eugenio, 20:10): «Elimina lo del sorteo… haz que los gremios de los oficios elijan a un
-- representante… los tecnócratas… hacen propuestas a ese colectivo… un periodo de consulta pública…
-- una cámara general… en la cámara general todos votan. En las cámaras de oficios solo votan los
-- profesionales… el sistema de guardianes… al ejecutivo le quedan las funciones básicas de recaudación
-- y de asignación.»
--
-- The study (public/democracia-organica-moderna/index.html) was rewritten around that model. This
-- brings the page that frames it (`KWDEMOORGANIC01`, created by 0251) in line: subtitle, the text that
-- search engines and the project card read, and a new card picture under a new name
-- (`organica-v2.webp`), so no cached copy of the old picture (with «Sorteo») survives the change.
-- Only touches the page if it exists, and only bumps the version when something actually changes.
DO $$
DECLARE
  pagina  text := 'KWDEMOORGANIC01';
  portada text := '/politica/tarjetas/organica-v2.webp';
  nuevo   jsonb;
BEGIN
  SELECT config
         || jsonb_build_object(
              'subtitulo', 'Una democracia de doble raíz: todos votan lo común y cada oficio regula lo suyo',
              'portada', portada, 'imagenCompartir', portada,
              'bloques', jsonb_build_array(
                jsonb_build_object('id', 'Bdemorg01', 'tipo', 'parrafo', 'texto',
                  'Democracia orgánica moderna es un ejercicio de diseño institucional de Luz & Humanidad. Mantiene el sufragio universal, la libertad de asociación y los partidos libres, y añade una segunda raíz de representación: los oficios, donde deciden quienes los ejercen.'),
                jsonb_build_object('id', 'Bdemorg02', 'tipo', 'titulo1', 'texto', 'Qué propone'),
                jsonb_build_object('id', 'Bdemorg03', 'tipo', 'lista', 'texto', 'Una Cámara General que elige toda la ciudadanía en cada escala: hace las leyes comunes, coordina los oficios y evalúa el sistema entero.'),
                jsonb_build_object('id', 'Bdemorg04', 'tipo', 'lista', 'texto', 'Cámaras de oficios donde solo votan los profesionales acreditados (una persona puede estar en varias): los tecnócratas proponen, hay consulta pública abierta a todos y votan los miembros; lo que afecta a terceros lo valida la Cámara General.'),
                jsonb_build_object('id', 'Bdemorg05', 'tipo', 'lista', 'texto', 'Justicia y guardianes de la seguridad organizados de abajo arriba, con mandos por concurso y sin nombramientos de partido; medios sin dinero discrecional ni directivos nombrados por el poder.'),
                jsonb_build_object('id', 'Bdemorg06', 'tipo', 'lista', 'texto', 'Un Gobierno elegido por la ciudadanía que solo recauda y asigna: ni legisla ni nombra.'),
                jsonb_build_object('id', 'Bdemorg07', 'tipo', 'lista', 'texto', 'El mismo patrón en cada escala, del municipio a la nación, con representantes que responden ante quien los eligió, y la democracia directa por temas.'),
                jsonb_build_object('id', 'Bdemorg08', 'tipo', 'parrafo', 'texto',
                  'La página compara el modelo con la España de hoy en quince fallos del diseño, cada uno con el hecho, la crítica, la mejor defensa del sistema actual y la propuesta, y expone sus principios, ocho hipótesis comprobables, las críticas que recibirá, una lista de lagunas por resolver y una transición en tres fases. Se distingue expresamente de la «democracia orgánica» del franquismo, que carecía de libertades.')
              ))
  INTO nuevo
  FROM knowledge_windows WHERE id = pagina AND deleted_at IS NULL;
  IF nuevo IS NULL THEN RETURN; END IF;
  UPDATE knowledge_windows SET config = nuevo, version = version + 1, updated_at = now()
  WHERE id = pagina AND config IS DISTINCT FROM nuevo;
  RAISE NOTICE 'Democracia orgánica moderna: página % al día', pagina;
END $$;
