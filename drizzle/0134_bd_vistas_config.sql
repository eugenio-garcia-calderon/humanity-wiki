-- ============================================================================
-- TABLAS · VISTAS AL NIVEL DE NOTION (2026-10-05, carril «bd»)
-- ============================================================================
-- La tabla `bd_vistas` (0059) nació con filtros, orden y agrupación, pero
-- nada del cliente la usaba. Ahora cada vista guarda también lo que es propio
-- de su FORMA y no cabe en las columnas que ya tenía:
--
--   tablero      → qué columnas del tablero se esconden
--   calendario   → qué propiedad de fecha manda
--   línea        → fecha de inicio y de fin
--   gráfico      → tipo, por qué se agrupa, qué se cuenta o se suma
--   formulario   → campos, obligatorios, ayudas, página de gracias, si es público
--   y en todas   → el subgrupo y las propiedades que se ven en la tarjeta
--
-- ── POR QUÉ UN jsonb Y NO UNA COLUMNA POR COSA ──────────────────────────────
-- Cada forma necesita cosas distintas y casi ninguna se consulta desde SQL:
-- se leen enteras al pintar la vista. Una columna por ajuste serían quince
-- columnas casi siempre vacías. El filtro y el orden SÍ siguen en sus
-- columnas, porque son los que el servidor aplica al leer.
ALTER TABLE bd_vistas ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── FILAS QUE SE REPITEN ────────────────────────────────────────────────────
-- `{cada, unidad: 'dia'|'semana'|'mes', modo: 'al_completar'|'calendario',
--   columna_fecha, columna_hecho, proxima}`. Vive en la fila y no en la tabla:
-- en una misma tabla de tareas unas se repiten cada lunes y otras no.
-- NULL = no se repite, que es casi siempre: de ahí el índice parcial, para que
-- el reloj que las busca no recorra la tabla entera.
ALTER TABLE bd_filas ADD COLUMN IF NOT EXISTS recurrencia jsonb;
CREATE INDEX IF NOT EXISTS bd_filas_recurrencia_idx ON bd_filas (tabla_id) WHERE recurrencia IS NOT NULL AND deleted_at IS NULL;
