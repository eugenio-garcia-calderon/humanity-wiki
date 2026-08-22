-- ============================================================================
-- VERACIDAD · FASE 1: LOS CIMIENTOS DEL DEBATE (2026-08-22)
-- ============================================================================
-- Eugenio: «un sistema de veracidad dentro de la APP para que lo que la gente
-- publique sea información coherente con la otra información que hay, y poder
-- generar un espectro de visiones sobre una verdad, y que haya debates visuales
-- sobre los temas más relevantes. Inspírate en Kialo».
--
-- ── QUÉ SE GUARDA AQUÍ, Y POR QUÉ NO VALÍA EL GRAFO QUE YA HAY ──────────────
-- El grafo de conocimiento ya sabe decir «A apoya a B» y «A contradice a B».
-- Lo que no sabe decir es CUÁNTO, SEGÚN QUIÉN y CON QUÉ PRUEBA. Y sobre todo:
-- en un grafo, un nodo puede colgar de varios sitios, y entonces se pierde de
-- qué se está discutiendo exactamente. Un debate es un ÁRBOL a propósito: cada
-- argumento responde a UNA afirmación y solo a una. Ese es el hallazgo de
-- Kialo y es lo que hace que una discusión de 300 mensajes siga siendo legible.
--
-- ── LO QUE ESTE SISTEMA NO HACE ────────────────────────────────────────────
-- No dictamina quién tiene razón. Guarda las posturas, sus razones y sus
-- fuentes, y deja ver el reparto. Una wiki que quiere competir con Wikipedia
-- no gana escribiendo la verdad en una sola voz: gana enseñando el desacuerdo
-- con sus motivos a la vista.
--
-- ── TRES TABLAS, NINGUNA TABLA DE UNIÓN ────────────────────────────────────
-- `src/db/CLAUDE.md` prohíbe la tabla de unión número 44, y con razón. Aquí no
-- hay ninguna: `argumentos` cuelga de su padre por `parent_id` (un árbol, no
-- una relación de muchos a muchos) y `veracidad_fuentes` pertenece a lo que
-- cita. Los votos tampoco estrenan tabla: la fase 5 usará `ratings`, que ya
-- guarda (usuario, tipo de entidad, entidad, puntuación).

-- ── EL DEBATE ───────────────────────────────────────────────────────────────
-- La tesis es una frase que se puede afirmar o negar. No una pregunta abierta
-- ni un tema: «La energía nuclear es la vía más rápida para descarbonizar
-- España», no «hablemos de nuclear». Si no se puede estar en contra de ella,
-- no es una tesis y no genera debate.
CREATE TABLE IF NOT EXISTS debates (
  id            text PRIMARY KEY,
  -- Identificador permanente que pide la Constitución (regla 5).
  uuid          uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  slug          text NOT NULL UNIQUE,
  tesis         text NOT NULL,
  -- Lo que hay que saber ANTES de argumentar: definiciones, alcance, fecha.
  -- Sin esto la mitad de un debate se va en discutir qué significaba la frase.
  contexto      text,
  -- abierto → se puede argumentar · cerrado → se lee, no se escribe.
  -- Cerrar NUNCA borra el lado perdedor: retrata en qué punto quedó y cuándo.
  estado        text NOT NULL DEFAULT 'abierto',

  -- ── EL TERRITORIO ES OPCIONAL, Y ESO SE APARTA DE LA CONSTITUCIÓN ─────────
  -- La regla 3 dice que toda entidad pertenece a un territorio. «¿Es la nuclear
  -- la vía más rápida para descarbonizar?» no es española ni andaluza. Forzar
  -- un territorio obligaría a mentir, y un dato inventado para rellenar una
  -- casilla es peor que una casilla vacía. NULL significa «global», y significa
  -- eso de forma distinguible: no es un territorio que falte, es que no lo hay.
  -- Divergencia anotada en memory/03_DECISIONS.md, pendiente de que Eugenio la
  -- confirme. No se toca docs/: la especificación es suya.
  territory_id  text REFERENCES territories(id),

  -- De qué cuelga el debate: un indicador, un reto, una publicación, un grafo.
  -- Los dos NULL = debate suelto. Se guarda como (tipo, id) y no como una clave
  -- foránea por cada tipo posible, que es como se llega a 43 tablas de unión.
  entidad_tipo  text,
  entidad_id    text,

  autor_user_id text REFERENCES users(id),
  vistas        integer NOT NULL DEFAULT 0,
  is_ai_generated boolean NOT NULL DEFAULT false,

  created_by    text,
  updated_by    text,
  version       integer NOT NULL DEFAULT 1,
  archived_at   timestamp,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),

  -- Un estado que no está en la lista es un error, no un valor raro. Sin este
  -- CHECK, un 'Abierto' con mayúscula desaparecería de todas las consultas sin
  -- que nadie viera un fallo.
  CONSTRAINT debates_estado_ck CHECK (estado IN ('abierto', 'cerrado')),
  -- O van los dos, o no va ninguno: media referencia no apunta a nada.
  CONSTRAINT debates_entidad_ck CHECK (
    (entidad_tipo IS NULL AND entidad_id IS NULL) OR
    (entidad_tipo IS NOT NULL AND entidad_id IS NOT NULL)
  )
);

-- ── EL ARGUMENTO ────────────────────────────────────────────────────────────
-- Cada argumento es a su vez una afirmación: se le puede responder a favor o en
-- contra, y así hasta donde haga falta. `parent_id` NULL quiere decir que
-- cuelga de la tesis del debate, que es la raíz del árbol.
CREATE TABLE IF NOT EXISTS argumentos (
  id            text PRIMARY KEY,
  uuid          uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  debate_id     text NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  parent_id     text REFERENCES argumentos(id) ON DELETE CASCADE,

  -- Las mismas tres palabras que ya usa el grafo (apoya / contradice / matiza),
  -- para que la plataforma tenga UN vocabulario y no dos.
  postura       text NOT NULL,
  texto         text NOT NULL,
  -- Se guarda al escribirlo en vez de calcularlo subiendo por los padres: se
  -- pinta en cada fila de la pantalla y recorrer el árbol hacia arriba por cada
  -- una es exactamente como se hace lenta una lista larga.
  profundidad   integer NOT NULL DEFAULT 1,

  -- ── EL ESTADO DE VERACIDAD ───────────────────────────────────────────────
  -- sin_fuente  nadie ha citado nada — y se DICE, no se calla
  -- con_fuente  tiene al menos una fuente, sin revisar
  -- verificada  alguien de nivel Conocimiento comprobó que la fuente lo sostiene
  -- disputada   hay un contraargumento verificado enfrente
  -- refutada    se comprobó que es falsa. Se queda a la vista, tachada
  -- La fase 2 gobierna las transiciones; aquí solo se guarda.
  veracidad     text NOT NULL DEFAULT 'sin_fuente',

  -- ── IMPACTO: NULL NO ES CERO ─────────────────────────────────────────────
  -- NULL = todavía no ha votado nadie. 0 = ha votado gente y no mueve a nadie.
  -- Son dos cosas distintas y la pantalla las dice distinto; si se inicializara
  -- a 0, un argumento recién escrito parecería uno ya rechazado.
  impacto       double precision,
  votos         integer NOT NULL DEFAULT 0,

  autor_user_id text REFERENCES users(id),
  is_ai_generated boolean NOT NULL DEFAULT false,

  created_by    text,
  updated_by    text,
  version       integer NOT NULL DEFAULT 1,
  archived_at   timestamp,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),

  CONSTRAINT argumentos_postura_ck CHECK (postura IN ('a_favor', 'en_contra', 'matiza')),
  CONSTRAINT argumentos_veracidad_ck CHECK (
    veracidad IN ('sin_fuente', 'con_fuente', 'verificada', 'disputada', 'refutada')
  ),
  -- Un argumento no puede ser su propio padre. Un ciclo más largo lo impide el
  -- código al crear (la profundidad sale del padre y solo se puede crecer).
  CONSTRAINT argumentos_no_autopadre_ck CHECK (parent_id IS NULL OR parent_id <> id)
);

-- ── LA FUENTE ───────────────────────────────────────────────────────────────
-- Una fuente pertenece a lo que cita, por eso lleva (tipo, id) y no una tabla
-- por cada cosa citable. Hoy cita debates y argumentos; mañana, un indicador o
-- una publicación, sin migración nueva.
CREATE TABLE IF NOT EXISTS veracidad_fuentes (
  id            text PRIMARY KEY,
  entidad_tipo  text NOT NULL,
  entidad_id    text NOT NULL,

  titulo        text NOT NULL,
  url           text,
  autor         text,
  publicado_en  date,
  -- Qué clase de prueba es. Un estudio revisado y un tuit no pesan igual, y el
  -- lector tiene derecho a verlo antes de que nadie se lo puntúe.
  tipo          text NOT NULL DEFAULT 'documento',
  -- La frase exacta que sostiene la afirmación. Un enlace a un PDF de 200
  -- páginas no es una fuente: es una tarea para el lector.
  cita          text,

  autor_user_id text REFERENCES users(id),
  created_by    text,
  updated_by    text,
  version       integer NOT NULL DEFAULT 1,
  archived_at   timestamp,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),

  CONSTRAINT veracidad_fuentes_tipo_ck CHECK (
    tipo IN ('estudio', 'informe', 'noticia', 'dato', 'documento', 'observacion', 'otra')
  ),
  CONSTRAINT veracidad_fuentes_entidad_ck CHECK (entidad_tipo IN ('debate', 'argumento'))
);

-- ── ÍNDICES ─────────────────────────────────────────────────────────────────
-- Las tres preguntas que hará la pantalla, y ninguna más por ahora.

-- «Dame el árbol de este debate» — la consulta de cada apertura de pantalla.
CREATE INDEX IF NOT EXISTS argumentos_debate_idx
  ON argumentos (debate_id, parent_id, created_at) WHERE archived_at IS NULL;

-- «Los debates vivos, los más movidos primero».
CREATE INDEX IF NOT EXISTS debates_abiertos_idx
  ON debates (estado, updated_at DESC) WHERE archived_at IS NULL;

-- «¿De qué se discute en este indicador / reto / publicación?».
CREATE INDEX IF NOT EXISTS debates_entidad_idx
  ON debates (entidad_tipo, entidad_id) WHERE archived_at IS NULL AND entidad_tipo IS NOT NULL;

-- «Las fuentes de esto».
CREATE INDEX IF NOT EXISTS veracidad_fuentes_entidad_idx
  ON veracidad_fuentes (entidad_tipo, entidad_id) WHERE archived_at IS NULL;
