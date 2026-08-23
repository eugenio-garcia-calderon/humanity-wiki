-- ============================================================================
-- LA LLAVE DE LA AGENDA (2026-08-23)
-- ============================================================================
-- Para traerse los contactos desde un iPhone sin exportar ningún fichero hace
-- falta que algo de fuera de la web —un Atajo de Apple— pueda entregarlos. Y un
-- Atajo no tiene sesión: no hay navegador, no hay cookie, no hay a quién
-- preguntarle la contraseña.
--
-- Por eso una llave: un secreto largo que la persona pega una vez en su Atajo y
-- que sirve **solo para traer contactos**. No abre la cuenta, no lee nada, no
-- publica nada. Si se filtra, lo peor que puede hacer quien la tenga es
-- meterte contactos en tu propia agenda, y se revoca en un clic.
--
-- ── SE GUARDA LA HUELLA, NO LA LLAVE ────────────────────────────────────────
-- Igual que las contraseñas y que los tokens de los agentes: aquí vive un
-- SHA-256, no el secreto. Si alguien se lleva esta tabla no se lleva ninguna
-- llave utilizable. La llave de verdad se enseña UNA VEZ, al crearla, y no se
-- puede volver a ver — se hace otra, que es lo correcto: una llave que se puede
-- volver a consultar es una llave que vive para siempre en una pantalla.
--
-- ── UNA VIVA POR PERSONA ────────────────────────────────────────────────────
-- Crear una nueva revoca la anterior. No es una limitación: es lo que hace que
-- «me he equivocado, hazme otra» sea también «invalida la que se me escapó»,
-- sin tener que entender qué es revocar.
CREATE TABLE IF NOT EXISTS llaves_agenda (
  id           text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  huella       text NOT NULL,
  creada_at    timestamptz NOT NULL DEFAULT now(),
  -- Cuándo se usó por última vez. Sirve para que la persona vea «tu iPhone
  -- mandó contactos hace 2 minutos» y sepa que el Atajo funciona, en vez de
  -- quedarse mirando una pantalla sin saber si llegó algo.
  usada_at     timestamptz,
  revocada_at  timestamptz
);

-- La búsqueda de cada petición del Atajo es por huella. Único entre las vivas:
-- dos llaves con la misma huella serían el mismo secreto repartido dos veces.
CREATE UNIQUE INDEX IF NOT EXISTS llaves_agenda_huella_viva_idx
  ON llaves_agenda (huella) WHERE revocada_at IS NULL;

CREATE INDEX IF NOT EXISTS llaves_agenda_persona_idx
  ON llaves_agenda (user_id) WHERE revocada_at IS NULL;
