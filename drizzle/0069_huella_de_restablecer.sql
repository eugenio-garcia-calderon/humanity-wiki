-- ============================================================================
-- EL ENLACE DE RESTABLECER CONTRASEÑA SE GUARDABA EN CLARO (2026-08-22)
-- ============================================================================
-- Encontrado por el Programador 4 revisando otra cosa.
--
-- `password_resets.token` guardaba el token TAL CUAL. Quien pudiera leer la
-- base de datos —una copia de seguridad, una réplica, un `pg_dump` pegado en un
-- chat, alguien de dentro— se llevaba **todos los enlaces de restablecer que
-- estuvieran vivos**, y con cada uno se cambia la contraseña de esa persona sin
-- saber la anterior.
--
-- Y desde hoy hay copias de seguridad diarias, así que el problema ya no es
-- teórico: hay un fichero, todas las noches, con esos tokens dentro.
--
-- ── LA CORRECCIÓN ES LA QUE YA USA LA CASA ─────────────────────────────────
-- Se guarda `sha256(token)` y se compara la huella, exactamente como
-- `agentes_ia.token_hash` desde el primer día. El token vive en el enlace que
-- recibe la persona y en ningún sitio más. Cuesta una línea, y es la diferencia
-- entre que una copia de seguridad filtrada sea una vergüenza o sea una
-- entrada.
--
-- ── LOS VIVOS SE INVALIDAN, NO SE CONVIERTEN ───────────────────────────────
-- Se podría calcular la huella de los que hay y guardarla, y los enlaces
-- pendientes seguirían valiendo. NO SE HACE. Un token que ha estado en claro en
-- la base de datos y en las copias de seguridad ya no es secreto: convertirlo
-- sería conservar exactamente lo que hay que tirar. Se marcan usados y quien
-- tuviera uno a medias pide otro — un minuto de molestia para quien esté
-- justo en ese paso, frente a dejar vivo lo que ya se filtró.
UPDATE password_resets SET used_at = now() WHERE used_at IS NULL;

-- La columna nueva. Se deja la vieja por ahora: quitarla es un cambio
-- irreversible y esta migración ya hace lo que importa. Se borra en cuanto
-- haya pasado un despliegue sin sorpresas.
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS password_resets_hash_idx ON password_resets (token_hash);

-- Lo que había en `token` ya no vale para nada y es justo lo que no queremos
-- en la próxima copia: se vacía.
-- `gen_random_uuid()` se evalúa POR FILA, que es lo que hace falta: `token` es
-- la clave primaria y un mismo valor para todas reventaría la migración. El
-- primer intento de esto usaba un subselect con un solo uuid — habría fallado
-- en la segunda fila, y en local solo hay dos.
UPDATE password_resets
SET token = 'gastado-' || gen_random_uuid()::text
WHERE token NOT LIKE 'gastado-%';
