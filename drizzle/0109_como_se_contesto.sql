-- ============================================================================
-- CÓMO SE CONTESTÓ CADA PREGUNTA DEL CHAT (2026-08-23, Programador 8)
-- ============================================================================
-- Desde el «buscador primero» (#290), una parte de lo que se escribe en el chat
-- se contesta con lo que hay publicado y NO llega a ningún modelo. Eso está muy
-- bien y no se puede demostrar: una pregunta resuelta en la plataforma **no
-- deja ni una fila** en ninguna tabla — no pasa por `/api/ai/chat`, así que no
-- hay `ai_messages` ni `ai_usage_charges`. Solo se sabe lo que SÍ costó, que es
-- justo la mitad que no hacía falta contar.
--
-- Esta tabla cuenta la otra mitad: una fila por pregunta, diciendo quién la
-- contestó. Con las dos mitades en la MISMA tabla, la proporción sale de una
-- consulta y no de cruzar dos tablas que significan cosas distintas
-- (`ai_usage_charges` solo existe cuando hubo cobro; una respuesta gratis o
-- fallida no está ahí).
--
-- ── LO QUE NO SE GUARDA, A PROPÓSITO ────────────────────────────────────────
-- **No se guarda el texto de la pregunta, ni quién la hizo.** Para saber qué
-- proporción contesta la plataforma no hace falta ninguna de las dos cosas, y
-- una tabla con las preguntas de la gente es una tabla que hay que proteger,
-- anonimizar y borrar. Esto es un contador, y un contador no necesita dueño.
--
-- ── LO QUE ESTO NO DEMUESTRA ────────────────────────────────────────────────
-- La fila la manda el navegador, así que se puede falsear. No se protege más
-- porque lo peor que consigue quien lo haga es estropear una estadística
-- propia: aquí no hay dinero, ni permisos, ni datos de nadie. Si algún día este
-- número decide algo que importe, entonces tendrá que contarlo el servidor.
CREATE TABLE IF NOT EXISTS chat_como_se_contesto (
  id          BIGSERIAL PRIMARY KEY,
  -- 'plataforma' = lo contestó el buscador con lo que hay publicado.
  -- 'modelo'     = hubo que llamar a la IA (incluida la escalada tras no
  --                encontrar nada, que se apunta como 'modelo': lo que cuenta
  --                es quién acabó contestando).
  resuelta    TEXT NOT NULL CHECK (resuelta IN ('plataforma', 'modelo')),
  -- Cuántos resultados se enseñaron, cuando contestó la plataforma. Distingue
  -- «contesté con ocho fichas» de «contesté que no hay nada», que son dos
  -- respuestas distintas aunque las dos sean gratis.
  resultados  INTEGER,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Se consulta siempre por fecha («del último mes»), nunca por id.
CREATE INDEX IF NOT EXISTS idx_chat_como_se_contesto_fecha
  ON chat_como_se_contesto (created_at DESC);
