-- ============================================================================
-- BASES DE DATOS DE USUARIO — CAPA 1: TABLAS CON COLUMNAS TIPADAS
-- ============================================================================
-- Hoy la plataforma no tiene base de datos de usuario. Tiene páginas con
-- bloques y un tablero con 18 campos escritos en el código, y el bloque
-- «tabla» del editor es TEXTO PLANO: nada ahí sabe que 620 es un número. Esta
-- migración es la primera de tres capas — tipos, después relaciones, después
-- fórmulas y agregados.
--
-- ── LAS CUATRO DECISIONES QUE NO SE PUEDEN CAMBIAR DESPUÉS ──────────────────
--
-- 1. UNA COLUMNA SE IDENTIFICA POR SU `id`, NUNCA POR SU NOMBRE. `bd_filas.
--    valores` es un jsonb con forma {"<id_columna>": <valor>}, jamás
--    {"Coste unitario": 620}. Si la identidad fuese el nombre, renombrar una
--    columna perdería los datos de golpe y las fórmulas de la capa 3 serían
--    imposibles de sostener: el día que alguien renombra «Coste unitario» se
--    romperían todas las fórmulas del espacio, en silencio.
--    Y POR EL MISMO MOTIVO, LAS OPCIONES DE UNA SELECCIÓN TAMBIÉN LLEVAN `id`.
--    El caso real que lo justifica es del astillero solar: una columna
--    «Sentido» con las opciones «Mayor mejor» / «Menor mejor» decide en qué
--    dirección se compara un ensayo. Si la opción se identificara por su
--    texto, renombrarla INVERTIRÍA el veredicto sin avisar — un dato incorrecto
--    presentado como correcto, que es el peor fallo que puede tener esta capa.
--
-- 2. LAS DEFINICIONES DE COLUMNA SON FILAS DE VERDAD, NO jsonb. En este repo
--    hay 30 columnas jsonb y la migración 0049 guarda así las columnas del
--    tablero, con buen motivo: «son tres etiquetas que solo tienen sentido
--    dentro de su proyecto y nunca se consultan por separado». Aquí es lo
--    contrario: estas definiciones se consultan ENTRE filas, necesitan
--    identidad propia y van a ser referenciadas por fórmulas. Los VALORES sí
--    van en jsonb, porque las celdas de una fila siempre se leen juntas.
--
-- 3. UNA FILA TIENE CUERPO DESDE EL PRIMER DÍA (`pagina_id`). En el astillero,
--    cada proveedor es una página con su contrato y sus actas, y eso es la
--    mitad de la utilidad. Si las filas nacen siendo «solo celdas», ponerles
--    cuerpo después es migrar datos que ya son de los usuarios. Hoy cuesta una
--    columna y el editor de bloques ya está hecho.
--
-- 4. LOS PERMISOS SE PREGUNTAN AL CONTENEDOR (`proyecto_id`), NUNCA A LA TABLA
--    NI A LA FILA. Es la forma que ya usa `archivo.ts`: así no pueden existir
--    dos verdades sobre quién ve qué, y un proyecto que pasa de privado a
--    público arrastra lo suyo sin migrar nada.
--
-- ── LO QUE NO ESTÁ AQUÍ, A PROPÓSITO ────────────────────────────────────────
-- Relaciones, fórmulas, agregados, vistas guardadas, orden y filtro
-- guardados, selección múltiple, columnas de persona y de fichero. Todo eso es
-- barato UNA VEZ que este modelo existe y carísimo antes.
--
-- Cuando lleguen las relaciones (capa 2) NO se creará una tabla por relación:
-- el `CLAUDE.md` prohíbe tablas de unión nuevas —ya hay 43 de 115— y una capa
-- de relaciones es, literalmente, un generador de tablas de unión. Será UNA
-- sola tabla genérica `bd_enlaces (columna_id, fila_origen, fila_destino)` con
-- índice por los DOS lados: la relación se guarda una vez y la vuelta es una
-- consulta, nunca una segunda fila que pueda contradecir a la primera. No se
-- crea todavía porque en la capa 1 no hay nada que guardar en ella.
-- ============================================================================

-- ── UNA BASE DE DATOS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bd_tablas (
  id               text PRIMARY KEY,
  titulo           text NOT NULL,
  icono            text,
  descripcion      text,
  -- EL CONTENEDOR. De aquí sale quién puede ver y escribir; ver decisión 4.
  proyecto_id      text REFERENCES proyectos(id),
  creador_user_id  text NOT NULL,
  orden            integer NOT NULL DEFAULT 0,
  created_by       text,
  updated_by       text,
  created_at       timestamp NOT NULL DEFAULT now(),
  updated_at       timestamp NOT NULL DEFAULT now(),
  -- Archivar, nunca borrar (constitución, regla 6). `deleted_at` es la
  -- papelera de 15 días, el único camino al borrado definitivo.
  archived_at      timestamp,
  deleted_at       timestamp
);

CREATE INDEX IF NOT EXISTS bd_tablas_proyecto_idx ON bd_tablas (proyecto_id);
CREATE INDEX IF NOT EXISTS bd_tablas_creador_idx  ON bd_tablas (creador_user_id);

-- ── LAS COLUMNAS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bd_columnas (
  -- Identidad estable. Lo que se guarda en `bd_filas.valores` es ESTO.
  id          text PRIMARY KEY,
  tabla_id    text NOT NULL REFERENCES bd_tablas(id) ON DELETE CASCADE,
  -- Solo lo que se ve. Se puede renombrar libremente y no rompe nada: ése es
  -- justamente el objetivo de separar `id` de `nombre`.
  nombre      text NOT NULL,
  -- CINCO TIPOS Y NI UNO MÁS en la capa 1. El criterio para elegirlos no ha
  -- sido «los más usados» sino los que cambian lo que el sistema puede
  -- CALCULAR O VALIDAR. Correo, teléfono y enlace son texto con un icono y una
  -- expresión regular: no habilitan nada nuevo y no bloquean a nadie.
  tipo        text NOT NULL CHECK (tipo IN ('texto', 'numero', 'fecha', 'seleccion', 'casilla')),
  -- Para `seleccion`: [{"id": "mayor_mejor", "label": "Mayor mejor", "color": "#..."}].
  -- Mismo patrón que `proyectos.grupos`, que ya está en producción.
  opciones    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Ajustes del tipo: decimales y unidad de un número, formato de una fecha.
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  orden       integer NOT NULL DEFAULT 0,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now(),
  archived_at timestamp
);

CREATE INDEX IF NOT EXISTS bd_columnas_tabla_idx ON bd_columnas (tabla_id, orden);

-- ── LAS FILAS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bd_filas (
  -- Identidad permanente desde el día uno. Una fila NO se identifica por su
  -- posición ni se reindexa al borrar: si lo hiciera, las relaciones de la
  -- capa 2 se romperían solas al borrar cualquier fila anterior.
  id          text PRIMARY KEY,
  tabla_id    text NOT NULL REFERENCES bd_tablas(id) ON DELETE CASCADE,
  -- {"<id_columna>": <valor YA TIPADO>}. Un número se guarda como número de
  -- JSON y una fecha como texto ISO — nunca «todo cadena, ya se convertirá»,
  -- porque entonces las fórmulas de la capa 3 tendrían que adivinar el tipo y
  -- acabaríamos escribiendo un intérprete que hace de analizador.
  -- Una clave AUSENTE es una celda vacía. Ver la nota de los tres estados en
  -- `src/server/bd.ts`: hacia fuera nunca se devuelve un `null` pelado.
  valores     jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- EL CUERPO DE LA FILA (decisión 3): la página donde vive el contrato, las
  -- actas o las fotos. Se crea solo cuando alguien abre la fila y escribe.
  pagina_id   text REFERENCES knowledge_windows(id),
  orden       integer NOT NULL DEFAULT 0,
  created_by  text,
  updated_by  text,
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now(),
  archived_at timestamp,
  deleted_at  timestamp
);

CREATE INDEX IF NOT EXISTS bd_filas_tabla_idx  ON bd_filas (tabla_id, orden);
-- Para poder filtrar por el valor de una celda sin recorrer la tabla entera.
CREATE INDEX IF NOT EXISTS bd_filas_valores_idx ON bd_filas USING gin (valores);
