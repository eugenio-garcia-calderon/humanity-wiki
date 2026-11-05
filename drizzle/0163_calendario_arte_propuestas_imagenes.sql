-- 2026-11-05 (Eugenio): el botón «Añadir propuesta de mejora» del calendario,
-- como el «¿Qué mejorarías?» de los sitios: texto, dictado por voz e imágenes.
-- Las imágenes se suben por la puerta del calendario (`/api/calendario-arte/subir`)
-- y aquí se guardan sus direcciones (hasta tres por propuesta).
ALTER TABLE calendario_arte_ideas ADD COLUMN IF NOT EXISTS imagenes jsonb NOT NULL DEFAULT '[]'::jsonb;
