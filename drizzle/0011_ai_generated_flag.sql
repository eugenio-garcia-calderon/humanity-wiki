-- ============================================================================
-- Marca de dato generado por IA / pendiente de revisión (Fase 10)
-- ============================================================================
-- El usuario pidió que, al introducir números de prueba (aleatorios) para no
-- dejar vacíos los objetivos de los países de Europa recién añadidos, quede
-- marcado en la propia base de datos qué es un dato real ya verificado y qué
-- es un dato generado por la IA a modo de prueba, para saber qué revisar.
--
-- Se marca en dos niveles:
--  - `territories.is_ai_generated`: el territorio en sí se creó con datos de
--    prueba (para el aviso visible en el panel de territorio).
--  - `indicator_observations.is_ai_generated`: el valor concreto de cada
--    indicador es un número aleatorio, no una medición real.
ALTER TABLE territories ADD COLUMN IF NOT EXISTS is_ai_generated boolean NOT NULL DEFAULT false;
ALTER TABLE indicator_observations ADD COLUMN IF NOT EXISTS is_ai_generated boolean NOT NULL DEFAULT false;
