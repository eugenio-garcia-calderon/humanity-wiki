-- ============================================================================
-- 0112 — Avisos de pedido por WhatsApp (2026-08-24, comercio F6)
-- ============================================================================
-- Eugenio (24-08): «les mandamos un whatsapp, no un email, que es más moderno,
-- montémoslo». Hasta hoy, quien compraba SIN cuenta solo tenía su código en la
-- pantalla: si cerraba la pestaña, lo perdía. Ese era el agujero más grande
-- del comercio.
--
-- 1. El teléfono del pedido. No se saca del perfil al enviar: se copia AQUÍ
--    cuando se compra, como los datos fiscales del recibo. Si quien compró
--    cambia de número mañana, el pedido de hoy sigue diciendo a qué número se
--    avisó. Normalizado (solo dígitos con prefijo, E.164 sin `+`), la misma
--    forma que `users.telefono` (0080).
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS telefono_contacto text;
DO $$ BEGIN
  ALTER TABLE pedidos ADD CONSTRAINT pedidos_telefono_formato
    CHECK (telefono_contacto IS NULL OR telefono_contacto ~ '^[0-9]{6,15}$') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. El libro de lo enviado. Un aviso de WhatsApp cuesta dinero y molesta a
--    alguien: se anota SIEMPRE, se haya enviado de verdad o no (modo apagado),
--    con lo que se mandó y qué contestó Meta. Sirve para tres cosas: no
--    repetir el mismo aviso, poder responder «esto se te envió tal día», y
--    ver el gasto antes de que sorprenda.
--    `estado`: 'simulado' (apagado: no salió de aquí) · 'enviado' · 'fallido'.
CREATE TABLE IF NOT EXISTS whatsapp_enviados (
  id           text PRIMARY KEY,
  user_id      text REFERENCES users(id) ON DELETE SET NULL,
  telefono     text NOT NULL,
  motivo       text NOT NULL,
  entidad_tipo text,
  entidad_id   text,
  plantilla    text,
  texto        text NOT NULL,
  estado       text NOT NULL DEFAULT 'simulado',
  respuesta    text,
  created_at   timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_enviados_entidad_idx ON whatsapp_enviados (entidad_tipo, entidad_id, motivo);
CREATE INDEX IF NOT EXISTS whatsapp_enviados_fecha_idx ON whatsapp_enviados (created_at DESC);
-- Un mismo aviso, una sola vez: mismo motivo y misma entidad no se repiten.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_enviados_una_vez_idx
  ON whatsapp_enviados (motivo, entidad_tipo, entidad_id, telefono)
  WHERE entidad_id IS NOT NULL;
