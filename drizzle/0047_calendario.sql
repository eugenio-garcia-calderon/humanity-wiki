-- ============================================================================
-- CALENDARIO (2026-08-20, petición de Eugenio: «añade una herramienta más:
-- Calendario […] genera la lógica para que todo esté integrado en el
-- calendario, que sea un calendario TOP, con todas las funcionalidades»).
-- ============================================================================
-- FASE 1: los cimientos.
--
-- DOS COSAS DISTINTAS, y hay que verlas por separado para que esto no se
-- vuelva un lío:
--
--   1. UN EVENTO es algo que PASA en un momento: una reunión, un viaje, una
--      llamada. Vive en su propia tabla porque no existía nada parecido.
--
--   2. UNA TAREA CON FECHA es una tarea de siempre que además vence un día.
--      NO se copia al calendario: se le añade una fecha a la tarea y el
--      calendario la lee de donde ya vive. Copiarla habría creado dos verdades
--      —la del tablero y la del calendario— que se separan al primer cambio.
--
-- Por eso aquí hay una tabla nueva Y una columna nueva, no una tabla nueva
-- sola.

CREATE TABLE IF NOT EXISTS eventos (
  id               text PRIMARY KEY,
  titulo           text NOT NULL,
  descripcion      text,
  -- Con zona horaria: una reunión a las 10:00 en Madrid es a las 10:00 en
  -- Madrid aunque la mires desde otro sitio. Sin `timestamptz` eso se pierde.
  inicio           timestamptz NOT NULL,
  fin              timestamptz,
  -- Un evento de todo el día no tiene hora: se pinta como una banda, no como
  -- un bloque a una hora concreta.
  todo_el_dia      boolean NOT NULL DEFAULT false,
  lugar            text,
  color            text,
  icono            text,
  -- Todo cuelga de un proyecto o de ninguno, como el resto de la plataforma.
  proyecto_id      text REFERENCES proyectos(id) ON DELETE SET NULL,
  creador_user_id  text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- FASE 3: repetición en formato iCalendar (RRULE). Se deja la columna desde
  -- ya para no tener que migrar una tabla con datos dentro.
  repeticion       text,
  created_by       text,
  updated_by       text,
  version          integer NOT NULL DEFAULT 1,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  archived_at      timestamptz
);

-- La consulta que se hace SIEMPRE: «qué tengo entre estas dos fechas».
CREATE INDEX IF NOT EXISTS idx_eventos_rango
  ON eventos (creador_user_id, inicio) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_proyecto
  ON eventos (proyecto_id) WHERE proyecto_id IS NOT NULL AND archived_at IS NULL;

-- UNA TAREA PUEDE VENCER UN DÍA. Es una fecha, no un instante: «el jueves»,
-- no «el jueves a las 14:32».
ALTER TABLE roadmap_items ADD COLUMN IF NOT EXISTS vence_el date;
CREATE INDEX IF NOT EXISTS idx_roadmap_vence
  ON roadmap_items (vence_el) WHERE vence_el IS NOT NULL AND archived_at IS NULL;
