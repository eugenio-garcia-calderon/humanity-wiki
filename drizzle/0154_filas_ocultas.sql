-- ============================================================================
-- ENTRADAS OCULTAS AL PÚBLICO (2026-10-18, petición de Eugenio)
-- ============================================================================
-- «Permite ocultar una entrada de una base de datos entera, para que no se vea
-- cuando esté publicada.» Una fila oculta solo la ve quien puede editar la
-- tabla (su dueño o un administrador); el resto no la recibe del servidor.
-- Sin índice: se filtra junto a `tabla_id`, que ya tiene el suyo, y casi todas
-- las filas valen `false`.
ALTER TABLE bd_filas ADD COLUMN IF NOT EXISTS oculta boolean NOT NULL DEFAULT false;
