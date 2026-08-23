-- ============================================================================
-- 0110 — Datos fiscales del vendedor e IVA por producto (2026-08-23, comercio F4)
-- ============================================================================
-- La fase 4 EMPIEZA por pedir los datos, no por imprimir facturas (revisión
-- del Dashboard: «una factura con un dato fiscal inventado o vacío es peor que
-- no tener factura»). Hoy en la plataforma no existía ningún dato fiscal.
--   · `datos_fiscales`: lo que el vendedor declara de sí mismo. Una fila por
--     persona; se edita desde Comercio. NO se lee al imprimir una factura
--     (cuando las haya): se copiará dentro de la factura al emitirla.
--   · `products.iva_pct`: tipo de IVA del producto (21 / 10 / 4 / 0); nulo =
--     el tipo por defecto del vendedor. Los precios de la plataforma llevan
--     el IVA incluido (precios de consumidor).
-- Mientras Eugenio y su asesor no digan cómo se factura en nombre del
-- vendedor, lo único que se emite es un RECIBO: documento NO fiscal, sin
-- número, que dice lo que se compró y lo que se pagó.
CREATE TABLE IF NOT EXISTS datos_fiscales (
  user_id       text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nombre_fiscal text,
  nif           text,
  direccion     text,
  cp            text,
  ciudad        text,
  pais          text NOT NULL DEFAULT 'ES',
  iva_defecto   numeric(4,2) NOT NULL DEFAULT 21 CHECK (iva_defecto >= 0 AND iva_defecto <= 100),
  serie_factura text,
  updated_at    timestamp NOT NULL DEFAULT now()
);
ALTER TABLE products ADD COLUMN IF NOT EXISTS iva_pct numeric(4,2) CHECK (iva_pct IS NULL OR (iva_pct >= 0 AND iva_pct <= 100));
