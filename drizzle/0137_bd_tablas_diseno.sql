-- ============================================================================
-- TABLAS · CÓMO SE VE LA PÁGINA DE UNA FILA (2026-10-06, carril «bd»)
-- ============================================================================
-- «Personalizar diseño», como en Notion: si las propiedades de la página de
-- cada fila van en una columna o en dos, y si las vacías se pliegan bajo
-- «N propiedades más». Es de la TABLA y no de cada fila: todas las fichas de
-- un mismo tipo se leen igual, que es lo que permite comparar una con otra.
-- jsonb porque son unos pocos ajustes que se leen siempre juntos.
ALTER TABLE bd_tablas ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;
