-- ============================================================================
-- LAS RAMAS DE UN PROYECTO (2026-08-25)
-- ============================================================================
-- Eugenio: «permite al usuario que en cada proyecto pueda crear ramas dentro
-- del proyecto, que esas ramas a nivel visual se bifurquen como un árbol —
-- invertido, de arriba hacia abajo— y que esas ramas puedan tener subramas».
--
-- ── POR QUÉ NO SIRVE LO QUE YA HAY ─────────────────────────────────────────
-- Un proyecto ya tiene `grupos` y `columnas`, guardados como JSON dentro de la
-- propia fila. Los dos son LISTAS PLANAS y valen para lo que son —las columnas
-- de un tablero y las etiquetas de una tarjeta—, pero una rama con subramas es
-- un árbol, y un árbol dentro de un JSON no se puede preguntar: «dame todo lo
-- que cuelga de aquí» obligaría a leer el proyecto entero y recorrerlo en
-- memoria cada vez.
--
-- Por eso una tabla y no una clave más en ese JSON. Y es una tabla de entidad,
-- no una de unión de las 43 que avisa `src/db/CLAUDE.md`: una rama es una cosa
-- con nombre propio, no el cruce de otras dos.
--
-- ── SIN LÍMITE DE PROFUNDIDAD, COMO EN LOS TEMAS ───────────────────────────
-- `padre_id` apuntando a la propia tabla. La misma forma que `subtemas` (0120)
-- y por el mismo motivo: Eugenio dijo «subramas» y nadie sabe cuántos niveles
-- va a querer alguien dentro de un año. Poner un tope aquí sería inventarse un
-- número que habría que quitar después.
CREATE TABLE IF NOT EXISTS proyecto_ramas (
  id           text PRIMARY KEY,
  proyecto_id  text NOT NULL REFERENCES proyectos(id) ON DELETE CASCADE,
  padre_id     text REFERENCES proyecto_ramas(id) ON DELETE CASCADE,
  nombre       text NOT NULL,
  -- Una línea de qué es esa rama. Opcional: obligar a describir cada rama
  -- convierte crear una en un formulario, y esto tiene que ser escribir un
  -- nombre y ya.
  nota         text,
  -- El color lo elige quien la crea y se hereda si no dice nada. Es lo que
  -- hace que un árbol de veinte ramas se lea de un vistazo.
  color        text,
  orden        integer NOT NULL DEFAULT 0,
  creador_user_id text,
  created_at   timestamp DEFAULT now(),
  updated_at   timestamp DEFAULT now(),
  archived_at  timestamp
);

-- Pintar el árbol de un proyecto es UNA consulta que trae todas sus ramas de
-- golpe; quien lo dibuja lo monta con `padre_id`. Por eso el índice es por
-- proyecto y no por padre: nunca se pide «las hijas de esta rama» sueltas.
CREATE INDEX IF NOT EXISTS proyecto_ramas_por_proyecto
  ON proyecto_ramas (proyecto_id) WHERE archived_at IS NULL;

-- La clave foránea de `padre_id` lleva su índice, como manda `drizzle/CLAUDE.md`:
-- sin él, archivar una rama con hijas obliga a Postgres a recorrer la tabla
-- entera para encontrarlas.
CREATE INDEX IF NOT EXISTS proyecto_ramas_por_padre
  ON proyecto_ramas (padre_id) WHERE archived_at IS NULL;

-- NO DOS HERMANAS CON EL MISMO NOMBRE, y por la misma razón que en `subtemas`:
-- un árbol donde «Diseño» aparece dos veces bajo la misma rama deja de servir
-- para encontrar nada. `coalesce(padre_id,'')` porque en SQL dos NULL no son
-- iguales entre sí, así que sin eso las ramas de primer nivel podrían
-- repetirse todas las veces que se quisiera.
CREATE UNIQUE INDEX IF NOT EXISTS proyecto_ramas_sin_hermanas_repetidas
  ON proyecto_ramas (proyecto_id, coalesce(padre_id, ''), lower(nombre))
  WHERE archived_at IS NULL;

-- UNA RAMA NO PUEDE COLGAR DE OTRO PROYECTO. Sin esto, una llamada mal hecha
-- mete una rama de un proyecto dentro del árbol de otro, y esa rama aparece en
-- un sitio donde su dueño no la puede ver ni borrar. Es el mismo disparador
-- que `subtemas_heredan` en 0120 y por el mismo motivo: es la clase de fallo
-- que no se ve el día que se escribe.
CREATE OR REPLACE FUNCTION rama_hereda_proyecto() RETURNS trigger AS $$
BEGIN
  IF NEW.padre_id IS NOT NULL THEN
    SELECT proyecto_id INTO NEW.proyecto_id FROM proyecto_ramas WHERE id = NEW.padre_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS proyecto_ramas_heredan ON proyecto_ramas;
CREATE TRIGGER proyecto_ramas_heredan BEFORE INSERT OR UPDATE ON proyecto_ramas
  FOR EACH ROW EXECUTE FUNCTION rama_hereda_proyecto();
