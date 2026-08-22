-- ============================================================================
-- SABER SI LA CACHÉ ACIERTA (2026-08-22)
-- ============================================================================
-- Eugenio: «piensa en cuando tengamos cientos de miles de chats al día».
--
-- A ese volumen, la caché de contexto es la diferencia entre una factura y
-- otra diez veces mayor. Y hasta hoy **no había forma de saber si estaba
-- acertando**: se guardaba lo que costó cada petición, pero no cuánto de la
-- entrada se releyó de la caché. Con ese dato ausente, una caché rota y una
-- caché perfecta producen exactamente el mismo registro.
--
-- Es la regla de la casa aplicada al dinero: si el sistema no puede decir «no
-- estoy acertando», nadie se entera hasta que llega la factura.
ALTER TABLE ai_usage_charges ADD COLUMN IF NOT EXISTS cache_read_tokens integer NOT NULL DEFAULT 0;

-- Para la pregunta que se va a hacer todos los días cuando esto tenga volumen:
-- «¿qué porcentaje de la entrada estamos releyendo de caché, por modelo?».
CREATE INDEX IF NOT EXISTS ai_usage_cache_idx ON ai_usage_charges (model, created_at DESC);
