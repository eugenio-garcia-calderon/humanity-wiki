-- ============================================================================
-- A SHOP INSIDE A DATABASE (2026-10-06, prog8)
-- ============================================================================
-- Eugenio: «que el creador de páginas se pueda utilizar también para crear
-- productos… no deja de ser una base de datos, donde puede haber un producto o
-- varios. Y una propiedad puede ser botón de compra».
--
-- Only ONE new column type: `compra` (the buy button). Price, shipping, stock
-- and variants are the types that already exist (`moneda`, `numero`,
-- `seleccion_multiple`) carrying a `config.rol`, so sorting, filters, sums and
-- charts keep working on them with no new code.
--
-- Each row that sells is backed by an ordinary row in `products`, so the cart,
-- checkout, orders, stock reservations and payouts are reused as they are.
-- `bd_fila_id` is that link; `bd_tabla_id` lets one UPDATE retire the products
-- of rows that were deleted. `bd_huella` is a fingerprint of what the row said
-- the last time it was copied: the copy only writes when it changed.

ALTER TABLE bd_columnas DROP CONSTRAINT IF EXISTS bd_columnas_tipo_check;
ALTER TABLE bd_columnas ADD CONSTRAINT bd_columnas_tipo_check CHECK (tipo IN (
  'texto', 'numero', 'fecha', 'seleccion', 'casilla',
  'texto_largo', 'url', 'email', 'telefono',
  'moneda', 'porcentaje', 'duracion', 'valoracion', 'seleccion_multiple',
  'persona', 'proyecto', 'publicacion', 'relacion',
  'imagen', 'video', 'documento',
  'formula', 'agregado', 'condicional',
  -- 2026-10-06: the buy button. Stores nothing in the row.
  'compra'
));

ALTER TABLE products ADD COLUMN IF NOT EXISTS bd_fila_id  text REFERENCES bd_filas(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bd_tabla_id text REFERENCES bd_tablas(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS bd_huella   text;
CREATE UNIQUE INDEX IF NOT EXISTS products_bd_fila_uidx ON products (bd_fila_id) WHERE bd_fila_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS products_bd_tabla_idx ON products (bd_tabla_id) WHERE bd_tabla_id IS NOT NULL;
