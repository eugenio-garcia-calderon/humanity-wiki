-- ============================================================================
-- LO QUE PIDE EL EQUIPO Y LO QUE PROPONE CUALQUIERA (2026-08-22)
-- ============================================================================
-- Eugenio: «haz una diferenciación entre las notas creadas por un ADMIN como
-- eugenio@lighthumanity.org de las creadas por usuarios de otro nivel, y haz
-- caso directo a las de ADMIN, y las creadas por otros usuarios cada X tiempo
-- las revisaremos para que yo las apruebe contigo».
--
-- El hormiguero nació siendo el canal entre él y quien programa. En cuanto la
-- plataforma tenga gente dentro, será también el buzón por donde entre lo que
-- pida cualquiera — y eso es bueno, pero no puede entrar por la misma puerta:
-- una lista donde una idea suelta de un desconocido pesa igual que una decisión
-- del que dirige el producto deja de decir qué hay que hacer.
--
-- ── DOS COSAS, NO UNA ───────────────────────────────────────────────────────
-- `de_admin` — quién la escribió: alguien del equipo, o alguien de fuera.
-- `estado`   — en qué punto está.
--
-- Se guardan separadas a propósito. Con un solo campo («propuesta») se perdería
-- de quién vino en cuanto se aprobara, y entonces no se podría medir cuántas de
-- las que entran por el buzón acaban haciéndose — que es justo lo que dirá si
-- el buzón sirve para algo.
--
-- ── ES UNA FOTO, NO UNA CONSULTA ────────────────────────────────────────────
-- `de_admin` se decide al escribir la nota y no se vuelve a mirar. Preguntarle
-- al usuario su rol de HOY cambiaría el pasado: a alguien que ascienda se le
-- reescribirían todas sus notas viejas como si siempre hubiera sido del equipo.
ALTER TABLE incidencias ADD COLUMN IF NOT EXISTS de_admin boolean NOT NULL DEFAULT false;

-- Las nueve que ya existen son suyas: las escribió él, que es administrador.
-- Sin esto aparecerían como propuestas de fuera y habría que aprobar lo que ya
-- está hecho.
UPDATE incidencias SET de_admin = true
WHERE autor_user_id IN (SELECT id FROM users WHERE role_level >= 4);

-- Se pregunta «qué hay pendiente de aprobar» tanto como «qué hay que hacer».
CREATE INDEX IF NOT EXISTS incidencias_propuestas_idx
  ON incidencias (estado, de_admin, created_at DESC) WHERE archived_at IS NULL;
