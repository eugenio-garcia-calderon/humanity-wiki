-- ============================================================================
-- MENSAJES ENTRE PERSONAS (2026-08-20, petición de Eugenio: «haz mensajería
-- entre personas, pero que el agente de Anita y el agente de Eugenio memoricen
-- el contenido resumido del mensaje para no perder esa memoria»).
-- ============================================================================
-- Hasta hoy en la plataforma solo se hablaba CON LA IA (`ai_conversations`).
-- Esto es lo otro: dos personas de verdad escribiéndose.
--
-- SIN TABLA DE CONVERSACIÓN. Un mensaje sabe de quién es y para quién va, y la
-- conversación es «todos los mensajes entre estos dos», que se saca con un
-- índice. Una tabla `conversaciones` con sus participantes sería la número 44
-- del proyecto y no aportaría nada mientras las conversaciones sean de dos.
-- El día que haya grupos, esa tabla se añade entonces.
--
-- Se ARCHIVA, no se borra (regla 6 de la Constitución): `archived_at`.
CREATE TABLE IF NOT EXISTS mensajes (
  id             text PRIMARY KEY,
  de_user_id     text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  para_user_id   text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  texto          text NOT NULL,
  leido_at       timestamp,
  created_at     timestamp NOT NULL DEFAULT now(),
  archived_at    timestamp
);

-- La consulta que se hace siempre: «dame la conversación entre estos dos, por
-- fecha». Con `least/greatest` el índice sirve en los dos sentidos, así que no
-- hacen falta dos índices ni una columna de pareja.
CREATE INDEX IF NOT EXISTS idx_mensajes_pareja ON mensajes
  (least(de_user_id, para_user_id), greatest(de_user_id, para_user_id), created_at);

-- Y la otra: «cuántos tengo sin leer».
CREATE INDEX IF NOT EXISTS idx_mensajes_sin_leer ON mensajes (para_user_id)
  WHERE leido_at IS NULL AND archived_at IS NULL;
