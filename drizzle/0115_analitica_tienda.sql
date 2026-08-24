-- ============================================================================
-- 0115 — ¿Vende o no vende? Analítica de tienda (2026-08-24, comercio F9)
-- ============================================================================
-- Eugenio eligió esto lo primero de los cuatro pendientes: «que el vendedor vea
-- si vende». Hoy quien vende no sabe si no vende porque nadie entra, o porque
-- entran y no compran — que son dos problemas opuestos: el primero se arregla
-- enseñando el producto, el segundo cambiándolo (precio, fotos, descripción).
--
-- Agregado por día y producto, no un registro por visita: para lo que hay que
-- contestar («¿esto se ve?, ¿se enceta?, ¿se compra?») basta el recuento, y así
-- no se guarda el rastro de nadie. No hay `user_id` en esta tabla A PROPÓSITO.
CREATE TABLE IF NOT EXISTS producto_metricas (
  producto_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  dia         date NOT NULL DEFAULT current_date,
  -- VISITAS, no personas: una misma persona que entra tres veces cuenta tres.
  -- Se llama así en la pantalla para no dar por «gente» lo que son visitas.
  visitas     integer NOT NULL DEFAULT 0,
  encestados  integer NOT NULL DEFAULT 0,
  PRIMARY KEY (producto_id, dia)
);
CREATE INDEX IF NOT EXISTS producto_metricas_dia_idx ON producto_metricas (dia);
