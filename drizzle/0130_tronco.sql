-- ============================================================================
-- EL TRONCO DEL CONOCIMIENTO (2026-08-26) — fase 1
-- ============================================================================
-- Eugenio: «vamos a explorar cómo quedaría esa rueda si fuese en forma de
-- árbol, donde en la base tienes la palabra red de conocimiento y sube un
-- tronco gordo que se divide en tres áreas: la parte social, la parte física y
-- la parte tecnológica. Y a raíz de esas tres ramas surgen los quince
-- objetivos… el árbol tiene que ir de izquierda a derecha».
--
-- ── POR QUÉ UNA TABLA DE ARISTAS Y NO UNA COLUMNA `madre_id` ───────────────
-- Preguntado antes de escribir, y contestado por él: **una rama puede colgar
-- de varias madres**. Eso no es un árbol, es un grafo, y un grafo no cabe en
-- una columna: `madre_id` sólo puede guardar un valor, así que la segunda
-- madre no tendría dónde escribirse. Con una fila por arista caben todas, y
-- la clave primaria `(hijo, madre)` impide escribir dos veces la misma.
--
-- Le dije que yo habría hecho un árbol, y por qué: con dos madres, la misma
-- rama se dibuja repetida en dos sitios y «¿dónde vive esto?» deja de tener
-- una respuesta. Eligió el grafo. Queda escrito aquí para que dentro de un año
-- se sepa que fue una decisión y no un descuido.
--
-- ── LO QUE ESTA TABLA NO GUARDA ───────────────────────────────────────────
-- Sólo la capa de arriba: raíz → ramas → objetivos. De los objetivos hacia
-- abajo ya manda `subtemas`, que existe desde 0120 y tiene 1080 filas. Dos
-- tablas para el mismo árbol suena a error y no lo es: arriba hay quince
-- nombres que decide la casa, y abajo un millón que propone la gente. Lo que
-- cambia una vez al año y lo que cambia cada hora no se guardan igual.

CREATE TABLE IF NOT EXISTS tronco_ramas (
  id          text PRIMARY KEY,
  nombre      text NOT NULL,
  color       text NOT NULL DEFAULT '#94a3b8',
  orden       int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- `hijo` y `madre` son ids de cualquier cosa del tronco: 'RAIZ', una rama
-- ('TR_…') o un objetivo ('O001'). Sin clave foránea a propósito — los quince
-- objetivos viven en el código (`src/utils/objetivos.ts`), no en una tabla, y
-- una foránea contra algo que no existe no se puede declarar.
CREATE TABLE IF NOT EXISTS tronco_aristas (
  hijo       text NOT NULL,
  madre      text NOT NULL,
  orden      int  NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hijo, madre)
);

CREATE INDEX IF NOT EXISTS tronco_aristas_madre_idx ON tronco_aristas (madre);

-- ── EL REPARTO A, QUE ES EL QUE ELIGIÓ ────────────────────────────────────
-- Le ofrecí tres. Éste es el suyo: social / ecología / tecnología. Le dije el
-- número que me preocupa —SOCIAL se lleva 7 de los 15, y una rama con la mitad
-- de todo dentro no ordena— y lo eligió igual. Se puede mover arrastrando, que
-- para eso es la fase 1.
INSERT INTO tronco_ramas (id, nombre, color, orden) VALUES
  ('TR_ECOLOGIA',   'ECOLOGÍA',   '#10b981', 0),
  ('TR_TECNOLOGIA', 'TECNOLOGÍA', '#06b6d4', 1),
  ('TR_SOCIAL',     'SOCIAL',     '#a855f7', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tronco_aristas (hijo, madre, orden) VALUES
  ('TR_ECOLOGIA',   'RAIZ', 0),
  ('TR_TECNOLOGIA', 'RAIZ', 1),
  ('TR_SOCIAL',     'RAIZ', 2),

  ('O001', 'TR_ECOLOGIA',   0),  -- AGUA
  ('O002', 'TR_ECOLOGIA',   1),  -- ALIMENTACIÓN
  ('O006', 'TR_ECOLOGIA',   2),  -- ECOSISTEMAS
  ('O009', 'TR_ECOLOGIA',   3),  -- ENERGÍA
  ('O004', 'TR_ECOLOGIA',   4),  -- SALUD

  ('O003', 'TR_TECNOLOGIA', 0),  -- VIVIENDA
  ('O008', 'TR_TECNOLOGIA', 1),  -- MOVILIDAD
  ('O010', 'TR_TECNOLOGIA', 2),  -- TECNOLOGÍA

  ('O005', 'TR_SOCIAL',     0),  -- CONVIVENCIA
  ('O007', 'TR_SOCIAL',     1),  -- EDUCACIÓN
  ('O011', 'TR_SOCIAL',     2),  -- EMPLEO
  ('O012', 'TR_SOCIAL',     3),  -- GOBERNANZA
  ('O013', 'TR_SOCIAL',     4),  -- ECONOMÍA
  ('O014', 'TR_SOCIAL',     5),  -- CULTURA
  ('O015', 'TR_SOCIAL',     6)   -- ESPIRITUALIDAD
ON CONFLICT (hijo, madre) DO NOTHING;
