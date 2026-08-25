-- ============================================================================
-- SUBTEMAS Y EL MENÚ DE CADA UNO (2026-08-25)
-- ============================================================================
-- Eugenio, dos peticiones que son la misma cosa:
--
--   «Añade subtemas dentro de los objetivos. Que sean grupos de temas que a su
--    vez tengan pestañas y tengan subtemas dentro de los subtemas.»
--
--   «Haz que el menú izquierdo el usuario lo pueda reordenar y pueda darle a un
--    botón de favorito… igual hay algún tema que el usuario quiere ocultar.»
--
-- Y cuatro decisiones suyas, preguntadas antes de escribir nada:
--   · los subtemas son COMUNES: los ve todo el mundo;
--   · cualquiera puede crear uno, SIN revisión — sólo se evita duplicarlos;
--   · SIN LÍMITE de profundidad;
--   · una publicación puede estar en varios, de objetivos distintos;
--   · ocultar un tema lo quita del MENÚ, no del muro.

-- ── EL ÁRBOL ────────────────────────────────────────────────────────────────
-- `padre_id` apuntando a la propia tabla es lo que da la profundidad sin
-- límite. Los de primer nivel tienen `padre_id NULL` y cuelgan de un objetivo.
--
-- POR QUÉ EL OBJETIVO SE REPITE EN CADA FILA en vez de deducirlo subiendo por
-- los padres: para pintar el menú de AGUA hace falta una consulta y no una
-- cadena de tantas consultas como niveles tenga la rama más honda. Es
-- información duplicada a propósito, y la garantía de que no se contradiga está
-- en el disparador de más abajo.
CREATE TABLE IF NOT EXISTS subtemas (
  id           text PRIMARY KEY,
  objetivo_id  text NOT NULL,
  padre_id     text REFERENCES subtemas(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  -- El nombre reducido a lo esencial (sin tildes, sin mayúsculas, sin signos).
  -- Es lo que impide dos hermanos que sólo se distinguen en el acento.
  nombre_clave text NOT NULL,
  creador_user_id text,
  orden        integer NOT NULL DEFAULT 0,
  created_at   timestamp DEFAULT now(),
  archived_at  timestamp
);

-- NO DOS HERMANOS CON EL MISMO NOMBRE. Eugenio: «solo se intenta que no se
-- dupliquen». Ésta es la mitad que puede garantizar la base de datos; la otra
-- —«Desalación» contra «Desalinización»— no la sabe el SQL y la hace la IA al
-- crear, proponiendo el que ya existe.
--
-- `coalesce(padre_id,'')` porque en SQL dos NULL no son iguales entre sí, así
-- que sin esto los subtemas de primer nivel —que tienen padre NULL— podrían
-- repetirse todas las veces que se quisiera.
CREATE UNIQUE INDEX IF NOT EXISTS subtemas_sin_hermanos_repetidos
  ON subtemas (objetivo_id, coalesce(padre_id, ''), nombre_clave)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS subtemas_por_objetivo ON subtemas (objetivo_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS subtemas_por_padre ON subtemas (padre_id) WHERE archived_at IS NULL;

-- EL OBJETIVO DE UN HIJO ES EL DE SU PADRE, Y NO SE PUEDE DISCUTIR. Sin esto,
-- una llamada mal hecha puede colgar «Desalación» de un padre de AGUA diciendo
-- que es de ENERGÍA, y entonces el mismo nodo sale en dos menús distintos y
-- desaparece de uno al recargar. Es la clase de fallo que no se ve el día que
-- se escribe.
CREATE OR REPLACE FUNCTION subtema_hereda_objetivo() RETURNS trigger AS $$
BEGIN
  IF NEW.padre_id IS NOT NULL THEN
    SELECT objetivo_id INTO NEW.objetivo_id FROM subtemas WHERE id = NEW.padre_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subtemas_heredan ON subtemas;
CREATE TRIGGER subtemas_heredan BEFORE INSERT OR UPDATE ON subtemas
  FOR EACH ROW EXECUTE FUNCTION subtema_hereda_objetivo();

-- ── QUÉ PUBLICACIÓN ESTÁ EN QUÉ SUBTEMA ─────────────────────────────────────
-- Sí, es una tabla de unión más, y el `CLAUDE.md` de `src/db/` avisa de que ya
-- hay 43. Aquí hace falta de verdad y no hay alternativa honesta: Eugenio
-- eligió que una publicación pueda estar en varios subtemas de objetivos
-- distintos —un vídeo de regadío está en Agua > Riego y en Alimentación—, y eso
-- es una relación de muchos a muchos. Meterlo como lista dentro de la
-- publicación impediría preguntar «qué hay en este subtema» sin recorrerlas
-- todas.
--
-- `tipo` porque lo que se clasifica no son sólo publicaciones del muro: también
-- ventanas, lienzos y mapas. Es la misma pareja (tipo, id) que ya usan
-- `publicacion_meta` y las denuncias.
CREATE TABLE IF NOT EXISTS subtema_contenido (
  subtema_id  text NOT NULL REFERENCES subtemas(id) ON DELETE CASCADE,
  tipo        text NOT NULL,
  entity_id   text NOT NULL,
  puesto_por  text,
  created_at  timestamp DEFAULT now(),
  PRIMARY KEY (subtema_id, tipo, entity_id)
);
CREATE INDEX IF NOT EXISTS subtema_contenido_por_cosa ON subtema_contenido (tipo, entity_id);

-- ── EL MENÚ DE CADA PERSONA ─────────────────────────────────────────────────
-- Favorito, oculto y orden. Una fila por persona y tema, y sólo cuando esa
-- persona ha tocado algo: quien no toca nada no ocupa ninguna fila y ve el
-- orden de siempre.
--
-- `clave` sirve para las dos cosas que hay en ese menú — un objetivo (`O001`) o
-- un subtema (su id)— porque la preferencia es la misma y separarlas en dos
-- tablas obligaría a leer dos y mezclarlas para pintar una sola lista.
CREATE TABLE IF NOT EXISTS preferencias_menu (
  user_id    text NOT NULL,
  clave      text NOT NULL,
  favorito   boolean NOT NULL DEFAULT false,
  -- OCULTO ES SÓLO DEL MENÚ (decisión de Eugenio). No filtra el muro ni el
  -- buscador: ordena tu navegación sin cegarte. Si algún día se quiere filtrar
  -- de verdad, será otra columna con otro nombre, no ésta cambiando de
  -- significado.
  oculto     boolean NOT NULL DEFAULT false,
  orden      integer,
  updated_at timestamp DEFAULT now(),
  PRIMARY KEY (user_id, clave)
);
