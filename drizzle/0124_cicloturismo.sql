-- ============================================================================
-- LA RAMA CON ERRATA QUE DUPLICABA LA DE PROG8 (2026-08-25)
-- ============================================================================
-- La siembra dejó en MOVILIDAD un «Cicloturismo y micormovilidad» que es el
-- mismo campo que «Movilidad eléctrica ligera», que ya existía con 31 subtemas
-- y 50 publicaciones dentro. Lo encontró prog8 mirando su propio objetivo.
--
-- ── POR QUÉ SE COLÓ, Y ESO ES LO IMPORTANTE ─────────────────────────────────
-- El desempatador que compara significados vive en `POST /api/temas`. La
-- siembra entró **por SQL directo**, así que nunca pasó por él: la puerta que
-- puse contra los duplicados tenía al lado una ventana abierta, y la ventana
-- era mi propia semilla. Arreglado en `scripts/sembrar-subtemas.mjs`, que ahora
-- pregunta antes de insertar.
--
-- ── Y LA ERRATA LO HACÍA PERMANENTE ─────────────────────────────────────────
-- «micormovilidad» está mal escrito (micro-, no micor-). Con el nombre
-- normalizado para comparar, una errata **no se parece a nada**: la falta de
-- ortografía es justo lo que lo volvía único e invisible para siempre.
--
-- ── QUÉ SE HACE CON ELLO ────────────────────────────────────────────────────
-- Se retira la rama entera —ella y sus ocho hijas—, y no se funde: sus hijas
-- son nombres genéricos sin una sola cosa colgada, y el campo ya está cubierto
-- por una rama viva con contenido de verdad. Fundir habría sido duplicar
-- treinta y un subtemas para no perder ocho vacíos.
--
-- Se ARCHIVA, no se borra: si mañana resulta que hacía falta, está.
--
-- Y se queda «Cicloturismo» como tema propio, que es lo que prog8 señaló y es
-- cierto: hacer turismo en bicicleta no es un vehículo eléctrico ligero. Con el
-- nombre bien escrito y sin arrastrar lo que no era suyo.

UPDATE subtemas SET archived_at = now()
 WHERE archived_at IS NULL
   AND (id = 'ST_MT8VNIJN_44I7D' OR padre_id = 'ST_MT8VNIJN_44I7D');

INSERT INTO subtemas (id, objetivo_id, padre_id, nombre, nombre_clave, creador_user_id, orden) VALUES
  ('ST_CICLOTURISMO', 'O008', NULL, 'Cicloturismo', 'cicloturismo', 'SEMILLA', 7)
ON CONFLICT DO NOTHING;
