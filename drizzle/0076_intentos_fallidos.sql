-- ============================================================================
-- 0076 — El rastro de los intentos fallidos (2026-08-22, prog6)
-- ============================================================================
-- `auth.ts` no tenía NINGÚN límite de intentos: diez contraseñas mal seguidas,
-- diez 401 y ninguna traba. Encontrado por prog4 revisando otra cosa, y anotado
-- en el tablero de seguridad.
--
-- ── POR QUÉ UNA TABLA, SI EL FRENO VA EN MEMORIA ───────────────────────────
-- Son DOS COSAS DISTINTAS y por eso no comparten contador:
--
--   · EL FRENO — cuánto hay que esperar antes del siguiente intento. Vive en
--     memoria, es rápido, y SE LIMPIA AL ACERTAR: si no, cualquiera puede
--     dejar fuera de su cuenta a otra persona fallando adrede. Perderlo en un
--     reinicio cuesta poco.
--
--   · ESTE REGISTRO — qué pasó. NO se limpia nunca, ni al acertar. Si fuera el
--     mismo contador, quien prueba mil contraseñas y acierta la última se
--     llevaría borrado su propio rastro de propina, que es exactamente el caso
--     que hay que poder ver después. (Corrección de prog4; regla de la casa:
--     dos verdades distintas no se colapsan en un número.)
--
-- ── LO QUE NO SE GUARDA ────────────────────────────────────────────────────
-- Ni la contraseña, ni nada parecido a ella, ni siquiera su longitud. Un
-- registro de intentos que guarde lo que se intentó es una lista de
-- contraseñas — y desde hoy esa lista saldría del servidor en la copia de cada
-- noche.
--
-- El correo se guarda TAL CUAL y a propósito: sin él no se puede responder
-- «¿atacaron esta cuenta?», que es para lo que existe esto. No es un secreto
-- que la tabla `users` no tenga ya.
CREATE TABLE IF NOT EXISTS intentos_fallidos (
  id          bigserial PRIMARY KEY,
  -- 'login' | 'registro' | 'restablecer' — para qué puerta se intentaba.
  puerta      text NOT NULL,
  -- La cuenta contra la que se intentó, si se sabe. Puede no saberse: un
  -- correo que no existe también es un intento, y de hecho es la señal de que
  -- alguien está probando correos.
  cuenta      text,
  -- Existía o no. Distingue «se equivocó de contraseña» de «está probando a
  -- ver qué correos hay dados de alta», que son dos ataques distintos.
  cuenta_existe boolean,
  ip          text NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Las dos preguntas que se le harán: «¿cuántos fallos lleva esta cuenta en la
-- última hora?» y lo mismo por IP. Cada una con su índice; el orden de las
-- columnas es el de la consulta, primero el filtro y después la fecha.
CREATE INDEX IF NOT EXISTS intentos_fallidos_cuenta_idx ON intentos_fallidos (cuenta, creado_en DESC);
CREATE INDEX IF NOT EXISTS intentos_fallidos_ip_idx     ON intentos_fallidos (ip, creado_en DESC);
