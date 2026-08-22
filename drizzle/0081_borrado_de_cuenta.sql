-- ============================================================================
-- BORRAR LA CUENTA DESDE DENTRO DE LA APLICACIÓN (2026-08-22)
-- ============================================================================
-- App Store y Google Play lo EXIGEN: una aplicación que deja crear cuenta y no
-- deja borrarla se rechaza. Hoy no existe, así que esto bloquea el lanzamiento.
--
-- Decidido por Eugenio: el contenido **se anonimiza y se queda** —nadie pierde
-- lo que construyó encima de lo que escribió otro— y hay **papelera de 15
-- días**: volver a entrar cancela el borrado.
--
-- ── LA FILA NO SE BORRA, SE VACÍA. Y NO ES UNA COMODIDAD ───────────────────
-- Medido: **49 tablas apuntan a `users`**. Borrar la fila rompería sus
-- proyectos, sus publicaciones, sus mensajes, sus movimientos de puntos y los
-- comentarios que otras personas dejaron debajo de lo suyo. Lo que la ley pide
-- es que sus datos personales desaparezcan, no que se lleve por delante el
-- trabajo de los demás.
--
-- Así que se vacían **nombre, correo, avatar y `google_id`**, y todo lo que
-- escribió queda a nombre de una cuenta sin persona detrás.
--
-- ── DOS FECHAS, PORQUE SON DOS COSAS DISTINTAS ─────────────────────────────
-- `deleted_at`      cuándo lo pidió. Empieza la cuenta atrás de 15 días.
-- `anonimizado_en`  cuándo se vació de verdad. Antes de esto se puede volver.
--
-- Con una sola no se puede distinguir «lo pidió ayer y puede volver» de «ya se
-- ejecutó y no hay marcha atrás», y esa diferencia es justo la papelera.
--
-- ── POR QUÉ EL CORREO NO PUEDE QUEDAR EN NULL ──────────────────────────────
-- `users_email_unique` y `users_email_lower_key` son índices ÚNICOS sobre una
-- columna `NOT NULL`. Dos cuentas borradas chocarían entre sí — la segunda
-- persona que borre su cuenta se encontraría con un error y su cuenta seguiría
-- viva. Aviso del Programador 4, y es de los que solo se ven leyendo el
-- esquema.
--
-- Se sustituye por `borrado-<uuid>@cuenta.invalid`:
--   · único, porque lleva un uuid;
--   · irreversible, porque el uuid no tiene NADA que ver con el correo de
--     antes — no es un hash, no se puede probar contra una lista;
--   · y `.invalid` está reservado por la RFC 2606 para no existir jamás, así
--     que no puede convertirse por accidente en la dirección de alguien.
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at     timestamp;
ALTER TABLE users ADD COLUMN IF NOT EXISTS anonimizado_en timestamp;

-- Para que la tarea diaria encuentre lo que le toca sin recorrer la tabla.
CREATE INDEX IF NOT EXISTS users_pendientes_de_vaciar_idx
  ON users (deleted_at) WHERE deleted_at IS NOT NULL AND anonimizado_en IS NULL;
