-- ============================================================================
-- Preferencias de interfaz por usuario (Fase 10)
-- ============================================================================
-- El usuario pidió que el ancho configurado de los paneles (asistente IA,
-- filtros del mapa, panel de territorio...) quede grabado en su cuenta, no
-- solo en el navegador. Un único jsonb evita crear una columna por cada
-- preferencia futura; hoy solo se usa `panelWidths` (mapa clave -> % ancho).
ALTER TABLE users ADD COLUMN IF NOT EXISTS ui_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
