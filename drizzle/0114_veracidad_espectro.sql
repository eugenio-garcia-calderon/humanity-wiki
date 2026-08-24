-- ============================================================================
-- VERACIDAD · FASE 6: EL ESPECTRO DE VISIONES (2026-08-22)
-- ============================================================================
-- Lo que Eugenio pidió por su nombre el primer día: «poder generar un espectro
-- de visiones sobre una verdad».
--
-- ── NO HAY TABLA NUEVA, Y ESO ES LA DECISIÓN ────────────────────────────────
-- La postura de cada persona NO se guarda: se calcula al leer, a partir de los
-- votos que ya están en `ratings`. Guardarla habría sido preguntarle a la gente
-- dónde se sitúa —o deducirlo una vez y congelarlo—, y las dos cosas mienten en
-- cuanto alguien cambia un voto. Lo que se dibuja sale siempre de lo que la
-- gente sostiene HOY.
--
-- Y sale del ÁRBOL, no de la lista: un «a favor» colgado de un argumento «en
-- contra» refuerza el lado contrario a la tesis. El signo se hereda por el
-- camino, que es justo lo que un grafo plano no sabría decir.
--
-- Esta migración, por tanto, solo mueve tarjetas del tablero.

UPDATE roadmap_items SET estado = 'hecho', updated_at = now()
WHERE id IN (
  'RM_VER_F6_POSTURA',   -- dónde está cada persona, calculado de sus votos
  'RM_VER_F6_ESPECTRO',  -- el reparto dibujado, con su aviso cuando hay poca gente
  'RM_VER_F6_VISIONES'   -- cada banda con su argumento más fuerte
);
