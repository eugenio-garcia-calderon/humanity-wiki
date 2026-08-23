-- ============================================================================
-- TU CUENTA DE GOOGLE, CONECTADA A LA PLATAFORMA (2026-08-23)
-- ============================================================================
-- Fase 2 de 5 del plan de Eugenio: «desarrollaremos una función para
-- conectarnos a tu cuenta de Google mediante API y poder acceder de manera
-- segura a tus correos y vídeos guardados de YouTube etc, pero los pintaremos a
-- nuestra manera».
--
-- ── ESTO NO ES «ENTRAR CON GOOGLE», Y NO HAY QUE MEZCLARLOS ─────────────────
-- La plataforma ya tenía «entrar con Google» (`POST /api/auth/google`), que usa
-- un identificador firmado para saber quién eres y **no da acceso a nada más**:
-- ni a tu correo, ni a tus vídeos, ni a tu calendario. Se acaba en el momento
-- en que entras.
--
-- Esto es lo otro: un permiso que TÚ concedes, que dura, y que deja a la
-- plataforma pedirle cosas a Google en tu nombre mientras no lo retires. Son
-- dos cosas distintas y por eso viven en tablas distintas: `users.google_id`
-- dice quién eres; esta tabla dice qué nos has dejado hacer.
--
-- ── LO QUE SE GUARDA, Y POR QUÉ ESTÁ CIFRADO ────────────────────────────────
-- El `refresh_token` de Google es la llave que permite pedir tus datos una y
-- otra vez sin volver a preguntarte. Es, con diferencia, **el dato más
-- peligroso que esta plataforma va a guardar de nadie**: quien lo tenga puede
-- leer tu correo mañana, y pasado.
--
-- Por eso no se guarda en claro. Va por el cifrado de sobre de
-- `src/server/seguridad/cifrado.ts` (de prog4): cada dato lleva su propia
-- llave, y esa llave va envuelta con la maestra. Quien se lleve esta tabla se
-- lleva ruido.
--
-- Y hay una razón concreta y medida para insistir: **desde el 2026-08-22 la
-- base de datos entera se copia fuera del servidor cada noche.** Todo lo que
-- esté aquí en claro viaja en esa copia. Está escrito en el `CLAUDE.md` de la
-- raíz porque ya pasó tres veces en un solo día con otros datos.
--
-- ── LOS PERMISOS SE GUARDAN, Y ESO NO ES BUROCRACIA ─────────────────────────
-- `permisos` es la lista exacta de lo que concediste. Sirve para dos cosas que
-- no se pueden hacer sin ella: enseñarte en la pantalla qué le has dejado ver a
-- la plataforma, y saber si hay que volver a pedirte permiso cuando una función
-- nueva necesite uno que no diste. Sin esto, la alternativa es pedir todo por
-- adelantado «por si acaso», que es exactamente lo que hace que la gente diga
-- que no.
CREATE TABLE IF NOT EXISTS cuentas_google (
  -- Una por persona. Conectar otra cuenta sustituye a la anterior: dos cuentas
  -- de Google a la vez es una función que nadie ha pedido y que multiplica por
  -- dos las preguntas de «¿de cuál de las dos es este correo?».
  user_id            text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- El identificador de Google, que no cambia aunque cambies de correo.
  google_sub         text NOT NULL,
  -- Se guarda para poder enseñarte CUÁL cuenta tienes conectada. Sin esto, la
  -- pantalla solo puede decir «conectada», y con dos cuentas personales nadie
  -- sabe cuál es.
  email              text,
  -- La llave, en dos piezas: el dato cifrado y su llave envuelta.
  refresco_cifrado   jsonb NOT NULL,
  refresco_llave     jsonb NOT NULL,
  permisos           text[] NOT NULL DEFAULT '{}',
  conectada_at       timestamptz NOT NULL DEFAULT now(),
  -- Cuándo se usó por última vez para pedirle algo a Google. Es lo que te deja
  -- ver en pantalla que la conexión sigue viva, y a nosotros detectar las que
  -- Google ha revocado por su cuenta.
  usada_at           timestamptz,
  -- Si Google deja de aceptar la llave (la retiraste desde tu cuenta de Google,
  -- caducó, cambiaste la contraseña), se apunta aquí en vez de borrar la fila:
  -- así la pantalla puede decir «se ha desconectado, vuelve a conectarla» en
  -- lugar de fingir que nunca existió.
  rota_desde         timestamptz,
  rota_porque        text
);

-- El barrido que busca conexiones muertas, y la pantalla de cada persona.
CREATE INDEX IF NOT EXISTS cuentas_google_rotas_idx
  ON cuentas_google (rota_desde) WHERE rota_desde IS NOT NULL;
