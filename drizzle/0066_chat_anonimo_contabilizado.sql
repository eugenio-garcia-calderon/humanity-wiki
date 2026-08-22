-- ============================================================================
-- EL CHAT ANÓNIMO TAMBIÉN CUESTA DINERO (2026-08-22)
-- ============================================================================
-- `POST /api/ai/chat` contesta sin sesión: es intencionado —el propio prompt
-- llama «visitante no registrado» a quien pregunta— y Eugenio ha decidido hoy
-- que siga siendo así, **sin límite de preguntas gratis**.
--
-- Lo que no era intencionado es que ese gasto no se apuntara en ningún sitio.
-- El INSERT en `ai_usage_charges` estaba dentro de un «if (req.user)», así que
-- cada pregunta de un visitante se pagaba y no dejaba rastro: el panel de
-- costes enseñaba menos de lo que dice la factura, y la diferencia crecía
-- justo con el uso. A cientos de miles de chats al día, enterarse por el
-- extracto del banco.
--
-- No poner límite es una decisión. No poder verlo, no.
--
-- `user_id` deja de ser obligatorio. NULL significa exactamente lo que parece:
-- **no había nadie identificado**. Es preferible a inventarse un usuario
-- «anónimo» de mentira, porque entonces habría una fila en `users` que no
-- corresponde a ninguna persona y cualquier recuento de usuarios la contaría.
--
-- Las consultas del panel filtran por `user_id = <alguien>`, así que siguen
-- devolviendo lo mismo; las que suman el gasto de la plataforma ahora suman
-- también esto, que es el objetivo.
ALTER TABLE ai_usage_charges ALTER COLUMN user_id DROP NOT NULL;

-- Para poder responder «cuánto costó el chat abierto este mes» sin recorrer la
-- tabla entera.
CREATE INDEX IF NOT EXISTS ai_usage_anonimo_idx
  ON ai_usage_charges (created_at DESC) WHERE user_id IS NULL;
