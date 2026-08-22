-- ============================================================================
-- QUIÉN PUEDE HACER SONAR TU TELÉFONO (2026-08-22)
-- ============================================================================
-- La capa de telecomunicaciones salió esta mañana pudiendo llamar a cualquiera
-- con una cuenta. El coordinador del equipo lo paró antes de fusionarlo con
-- una pregunta que no tiene respuesta técnica: «¿puede alguien llamarme sin
-- conocerme? Un timbre que suena a petición de cualquiera es la puerta al
-- acoso». Tiene razón, y aquí está la respuesta.
--
-- ── POR QUÉ AQUÍ ES PEOR QUE EN WHATSAPP, Y NO AL REVÉS ────────────────────
-- En WhatsApp, para llamarte hace falta tu número, y tu número lo tiene quien
-- tú se lo diste. Aquí NO hace falta: cada persona tiene su página pública con
-- su identificador a la vista, así que sin esta columna cualquiera que sepa
-- navegar puede hacer sonar el teléfono de cualquiera, tenga su número o no.
-- Eso no es «como WhatsApp»: es bastante peor que WhatsApp.
--
-- ── POR QUÉ «CONOCIDOS» ES LO QUE VIENE PUESTO ─────────────────────────────
-- Porque el valor por defecto es el que van a tener casi todas las personas, y
-- la pregunta no es «¿qué es más cómodo?» sino «¿qué pasa el día que alguien
-- use esto para molestar a otra persona?». Abrirlo es una casilla; cerrarlo
-- después de la primera llamada a las tres de la mañana, no.
--
-- Y no cierra nada de lo que se pidió: a quien no te conoce le sale «escríbele
-- primero», que es exactamente el camino que ya existe. Un mensaje no despierta
-- a nadie; un timbre sí.
--
--   todos      cualquiera con una cuenta puede llamarte
--   conocidos  quien ya se ha escrito contigo, a quien tú tienes en tu agenda
--              importada, o a quien sigues
--   nadie      solo mensajes
ALTER TABLE users ADD COLUMN IF NOT EXISTS llamadas_de text NOT NULL DEFAULT 'conocidos';

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_llamadas_de_valores
    CHECK (llamadas_de IN ('todos', 'conocidos', 'nadie')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
