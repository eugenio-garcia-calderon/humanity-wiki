-- 0233 — ORDEN DE LOS ASPECTOS EN LAS FIGURAS (2026-11-19, Eugenio).
-- Los aspectos de cada tema cambiaron de posición en el hexágono para que los de izquierda
-- queden a la izquierda y los de derecha a la derecha. Las puntuaciones se guardan por POSICIÓN
-- dentro de cada tema, así que una figura publicada antes se leería mal sin convertirla.
--
-- Esta migración NO toca las filas que ya existen: sólo añade la columna. Todas las figuras
-- anteriores quedan con `orden` = 1 y `src/server/figuras.ts` las convierte al leerlas
-- (`comun.aOrdenNuevo`). Las nuevas se guardan con `orden` = 2 y no se convierten.
-- Así, si hubiera que volver atrás, los datos originales siguen intactos.

ALTER TABLE figuras_geometria ADD COLUMN IF NOT EXISTS orden smallint NOT NULL DEFAULT 1;
