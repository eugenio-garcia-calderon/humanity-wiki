-- ============================================================================
-- QUÉ MODELO PROPUSO CADA ACCIÓN (2026-08-20, paso 2 del plan de costes:
-- «caché → medición → contexto dinámico → routing → RAG»).
-- ============================================================================
-- La métrica que decide todo lo demás es el COSTE POR ACCIÓN CORRECTA: no
-- sirve de nada que un modelo sea diez veces más barato si falla el triple.
--
-- Para calcularla hay que poder decir «esta acción la propuso este modelo», y
-- hasta hoy no se podía: `ai_proposed_actions` solo guarda la conversación, y
-- desde que existe el router una misma conversación puede pasar por tres
-- modelos distintos. Emparejar por hora de creación sería adivinar — y la
-- medición nace precisamente para dejar de adivinar.
--
-- Las filas anteriores se quedan con NULL: no se puede saber, y una suposición
-- retroactiva contaminaría justo los datos que queremos limpios. Cuentan como
-- «sin modelo» y salen aparte en el panel.
ALTER TABLE ai_proposed_actions ADD COLUMN IF NOT EXISTS model text;

-- El panel agrupa por modelo y estado; con miles de filas esto se nota.
CREATE INDEX IF NOT EXISTS ai_proposed_actions_model_idx ON ai_proposed_actions (model, status);
