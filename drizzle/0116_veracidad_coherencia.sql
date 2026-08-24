-- ============================================================================
-- VERACIDAD · FASE 8: COHERENCIA CON LO QUE YA HAY (2026-08-24)
-- ============================================================================
-- La otra mitad del encargo del primer día, la que faltaba: «que lo que la
-- gente publique sea información coherente con la otra información que hay».
--
-- ── SE BUSCA LA CONTRADICCIÓN, NO SE SUPONE ────────────────────────────────
-- Antes de publicar un argumento se busca de verdad qué hay escrito que se le
-- parezca, y se enseña con su postura y su sello. Nadie decide por ti: se te
-- pone delante lo que ya se dijo y tú eliges si sigues, si lo citas o si lo
-- respondes. Avisar DESPUÉS es abrir una discusión; avisar ANTES es dar la
-- oportunidad de traer la fuente.
--
-- ── POR QUÉ BÚSQUEDA DE TEXTO Y NO LA IA ───────────────────────────────────
-- Un modelo diría «esto contradice a aquello» con una seguridad que no tiene, y
-- un aviso equivocado que aparece mientras escribes se aprende a ignorar en dos
-- días — y después ya no avisa de nada. El índice de texto solo dice lo que
-- puede demostrar: «estas frases se parecen a la tuya, míralas». La IA entra en
-- la fase 10, y entrará proponiendo, nunca decidiendo.
--
-- `spanish` y no `simple`: sin la configuración del idioma, «energía» y
-- «energías» son dos palabras distintas y la mitad de los parecidos se pierden.

-- Los argumentos: es donde se escribe casi todo.
CREATE INDEX IF NOT EXISTS argumentos_texto_idx
  ON argumentos USING gin (to_tsvector('spanish', texto))
  WHERE archived_at IS NULL;

-- Y las tesis, para poder decir «de esto ya hay un debate abierto» en vez de
-- dejar que se abra el mismo dos veces (regla 7 de la Constitución: evitar
-- duplicados).
CREATE INDEX IF NOT EXISTS debates_tesis_idx
  ON debates USING gin (to_tsvector('spanish', tesis))
  WHERE archived_at IS NULL;

UPDATE roadmap_items SET estado = 'hecho', updated_at = now()
WHERE id IN (
  'RM_VER_F8_DETECTAR',  -- se busca qué hay escrito que se parezca
  'RM_VER_F8_AVISAR'     -- y se enseña ANTES de publicar, no después
);
