-- ============================================================================
-- USUARIOS DE PROGRAMADOR IA (2026-08-22)
-- ============================================================================
-- Eugenio: «crea un código que te permita sin mayor complicación tener un
-- usuario de programador IA propia, crea uno para ti y otro para el programador
-- de IA 2, y así podréis daros permisos de edición del hormiguero y será más
-- fácil trabajar desde producción».
--
-- Hasta hoy, para poner una nota en verde había dos caminos y los dos malos:
-- fabricar a mano una sesión de Eugenio en producción —entrar como él sin su
-- contraseña— o escribir en la base de datos por SSH, que no deja nada que
-- nadie pueda revisar. Esto es el tercero.
--
-- ── NO SON PERSONAS, Y POR ESO NO ESTÁN EN `users` ─────────────────────────
-- Meterlos en `users` les daría cuenta, sesión, cookie y, con ella, TODA la
-- plataforma: publicar, borrar, entrar en proyectos privados. Un agente no
-- necesita nada de eso y dárselo sería regalar una llave maestra por poder
-- pintar un punto verde. Viven en su propia tabla y solo saben hacer una cosa.
--
-- ── EL TOKEN NO SE GUARDA, SE GUARDA SU HUELLA ─────────────────────────────
-- Igual que una contraseña. Si alguien se lleva un volcado de la base de datos,
-- no se lleva ninguna llave: se lleva huellas, que no abren nada. El token se
-- enseña UNA vez, al crearlo, y quien lo crea lo guarda donde toque.
--
-- ── HASTA DÓNDE LLEGA, Y POR QUÉ TAN POCO ──────────────────────────────────
-- Un agente lee el hormiguero, y en el hormiguero escribe cualquiera. Es decir:
-- el agente lee texto de desconocidos MIENTRAS tiene una llave de producción en
-- la mano. Si esa llave abriera la plataforma entera, bastaría una nota escrita
-- con mala idea para dirigirlo.
--
-- Por eso la llave abre exactamente una puerta: crear notas, cambiarles el
-- estado y contestarlas. Lo peor que puede pasar con ella es que un tablero
-- quede con un color equivocado — visible, reversible y con el nombre de quien
-- lo hizo al lado.
CREATE TABLE IF NOT EXISTS agentes_ia (
  id          text PRIMARY KEY,
  -- Cómo se le llama en la pantalla: «Claude 1», «Claude 2».
  nombre      text NOT NULL,
  -- SHA-256 del token. Nunca el token.
  token_hash  text NOT NULL UNIQUE,
  -- Se desactiva sin borrar: así el historial sigue diciendo quién contestó
  -- qué, aunque ese agente ya no trabaje aquí.
  activo      boolean NOT NULL DEFAULT true,
  ultimo_uso  timestamp,
  created_at  timestamp NOT NULL DEFAULT now(),
  created_by  text REFERENCES users(id)
);

-- Se busca siempre igual: «¿de quién es esta huella, y sigue activo?».
CREATE INDEX IF NOT EXISTS agentes_ia_hash_idx ON agentes_ia (token_hash) WHERE activo;

-- ── QUIÉN CONTESTÓ ──────────────────────────────────────────────────────────
-- Sin esto, el tablero diría «hecha» sin decir por quién, y con dos agentes
-- trabajando a la vez eso es justo lo que hay que poder distinguir. Es texto y
-- no una clave foránea a propósito: una nota contestada por un agente que luego
-- se retire tiene que seguir diciendo quién la contestó.
ALTER TABLE incidencias ADD COLUMN IF NOT EXISTS respondido_por text;
