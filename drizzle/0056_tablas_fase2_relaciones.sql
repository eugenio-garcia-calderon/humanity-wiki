-- ============================================================================
-- TABLAS · FASE 2 — LOS TIPOS QUE APUNTAN A ALGO
-- ============================================================================
-- Una celda que apunta no guarda un valor: guarda a QUIÉN señala. Cuatro
-- destinos: una persona, un proyecto, una publicación, o una fila de otra tabla.
--
-- ── UNA SOLA TABLA DE ENLACES, Y ES LA DECISIÓN QUE MANDA ───────────────────
-- El `CLAUDE.md` prohíbe crear tablas de unión nuevas: ya hay 43 de 115. Y una
-- capa de relaciones es, literalmente, un generador de tablas de unión: una por
-- cada par de tablas que alguien decida enlazar, para siempre.
--
-- Por eso NO se crea una tabla por relación. Se crea UNA, genérica, con la
-- misma forma que este repositorio ya inventó tres veces por su cuenta
-- (`graph_entity_links`, `publication_links`, `transaction_links`):
-- (columna, origen, destino). Con eso, añadir un tipo de destino nuevo mañana
-- —una organización, un territorio— no es una migración, es una fila más en el
-- CHECK.
--
-- ── LA RELACIÓN SE GUARDA UNA VEZ; LA VUELTA ES UNA CONSULTA ────────────────
-- Si «este componente pertenece a este proveedor» se guardara además como
-- «este proveedor tiene este componente», habría dos filas diciendo lo mismo y
-- llegaría el día en que una se actualizara y la otra no. Dos verdades que se
-- contradicen es el fallo que este equipo lleva persiguiendo toda la semana en
-- otras cuatro capas.
-- Así que se guarda UNA fila, y la dirección contraria se pregunta con un
-- índice por el otro lado. De ahí los dos índices: sin el de destino, cada
-- agregado de la fase 5 sería un recorrido completo de la tabla.
-- ============================================================================

ALTER TABLE bd_columnas DROP CONSTRAINT IF EXISTS bd_columnas_tipo_check;

ALTER TABLE bd_columnas ADD CONSTRAINT bd_columnas_tipo_check CHECK (tipo IN (
  'texto', 'numero', 'fecha', 'seleccion', 'casilla',
  'texto_largo', 'url', 'email', 'telefono',
  'moneda', 'porcentaje', 'duracion', 'valoracion', 'seleccion_multiple',
  -- Fase 2: los que apuntan
  'persona', 'proyecto', 'publicacion', 'relacion'
));

-- ── TODOS LOS ENLACES DEL SISTEMA ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bd_enlaces (
  id          text PRIMARY KEY,
  -- De qué columna sale. Es lo que dice qué clase de destino es y con qué
  -- tabla se casa: la configuración vive en la columna, no repetida aquí.
  columna_id  text NOT NULL REFERENCES bd_columnas(id) ON DELETE CASCADE,
  -- La fila que apunta. Siempre una fila de una tabla de usuario.
  fila_origen text NOT NULL REFERENCES bd_filas(id) ON DELETE CASCADE,
  -- A qué apunta. `clase` dice a qué tabla del sistema pertenece `destino_id`.
  -- Se guarda la CLASE y no una columna por tipo porque, si no, añadir un
  -- destino nuevo sería alterar la tabla en producción.
  clase       text NOT NULL CHECK (clase IN ('persona', 'proyecto', 'publicacion', 'fila')),
  destino_id  text NOT NULL,
  -- Para poder ordenar los enlaces de una celda: «los tres responsables» tienen
  -- un orden y se espera que se conserve.
  orden       integer NOT NULL DEFAULT 0,
  created_at  timestamp NOT NULL DEFAULT now(),
  created_by  text
);

-- El mismo enlace dos veces no significa nada, y sí produce sumas dobles en la
-- fase 5. Se impide en la base y no solo en el código: es el único sitio donde
-- no se puede olvidar.
CREATE UNIQUE INDEX IF NOT EXISTS bd_enlaces_unico_idx
  ON bd_enlaces (columna_id, fila_origen, clase, destino_id);

-- IDA: «¿a qué apunta esta celda?»
CREATE INDEX IF NOT EXISTS bd_enlaces_origen_idx  ON bd_enlaces (fila_origen, columna_id, orden);
-- VUELTA: «¿quién apunta a esto?». Éste es el que hace que los agregados de la
-- fase 5 sean una consulta y no un recorrido.
CREATE INDEX IF NOT EXISTS bd_enlaces_destino_idx ON bd_enlaces (clase, destino_id, columna_id);

-- ── QUÉ GUARDA `config` EN UNA COLUMNA QUE APUNTA ───────────────────────────
--   relacion    { tabla_destino: '<id de bd_tablas>', varios: bool }
--   persona     { varios: bool }
--   proyecto    { varios: bool }
--   publicacion { varios: bool }
--
-- `varios` decide si la celda admite uno o muchos. Es un ajuste y no dos tipos
-- distintos porque pasar de uno a varios no debe perder lo que ya había.
