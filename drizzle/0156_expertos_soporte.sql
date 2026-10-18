-- ============================================================================
-- CHAT DE AYUDA Y CONSULTAS CON EXPERTOS EN LOS SITIOS (2026-10-18, W6 Wikiproducts)
-- ============================================================================
-- Dos piezas para cualquier sitio publicado con Wiki Creator:
--   · un chat de ayuda: quien visita la web escribe y el equipo del sitio le
--     contesta, con o sin cuenta;
--   · expertos que venden una consulta: el visitante elige un hueco de su
--     agenda, la paga y queda una conversación abierta con el experto.
-- El diseño y el porqué de cada pieza está en las cabeceras de
-- `src/server/soporte.ts` y `src/server/expertos.ts`. Aquí sólo las tablas.

-- Los expertos de un sitio. `user_id` es la cuenta con la que contesta y la
-- que cobra (su cuenta de Stripe Connect, si la tiene). Puede estar vacía:
-- entonces el equipo del sitio contesta en su nombre y le paga aparte.
CREATE TABLE IF NOT EXISTS expertos (
  id               text PRIMARY KEY,
  raiz_id          text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  user_id          text REFERENCES users(id) ON DELETE SET NULL,
  nombre           text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 120),
  especialidad     text,
  bio              text,
  foto_url         text,
  precio_centimos  integer NOT NULL CHECK (precio_centimos BETWEEN 0 AND 10000000),
  moneda           text NOT NULL DEFAULT 'EUR',
  duracion_min     integer NOT NULL DEFAULT 45 CHECK (duracion_min BETWEEN 15 AND 240),
  -- Lo que se queda el sitio de cada consulta, en puntos básicos (100 = 1 %).
  -- Se enseña a quien reserva: la comisión es pública o no es transparente.
  comision_bps     integer NOT NULL DEFAULT 0 CHECK (comision_bps BETWEEN 0 AND 5000),
  zona_horaria     text NOT NULL DEFAULT 'Europe/Madrid',
  -- [{"dia":1..7 (lunes=1), "desde":"10:00", "hasta":"14:00"}]
  disponibilidad   jsonb NOT NULL DEFAULT '[]'::jsonb,
  antelacion_horas integer NOT NULL DEFAULT 24 CHECK (antelacion_horas BETWEEN 0 AND 720),
  enlace_reunion   text,
  activo           boolean NOT NULL DEFAULT true,
  orden            integer NOT NULL DEFAULT 0,
  created_by       text REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  archived_at      timestamptz
);
CREATE INDEX IF NOT EXISTS expertos_raiz ON expertos (raiz_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS expertos_user_id ON expertos (user_id);
CREATE INDEX IF NOT EXISTS expertos_created_by ON expertos (created_by);

-- Una conversación del chat de ayuda. Quien escribe es una cuenta
-- (`cliente_user_id`) o un visitante sin cuenta, reconocido por la huella
-- (sha256) del testigo de su cookie: nunca se guarda el testigo.
-- `experto_id` vacío = el soporte del sitio; lleno = la conversación de una
-- consulta con ese experto.
CREATE TABLE IF NOT EXISTS soporte_conversaciones (
  id                text PRIMARY KEY,
  raiz_id           text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  pagina_id         text REFERENCES knowledge_windows(id) ON DELETE SET NULL,
  cliente_user_id   text REFERENCES users(id) ON DELETE SET NULL,
  invitado_huella   text,
  cliente_nombre    text,
  cliente_email     text,
  experto_id        text REFERENCES expertos(id) ON DELETE SET NULL,
  estado            text NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
  ultimo_at         timestamptz NOT NULL DEFAULT now(),
  sin_leer_equipo   integer NOT NULL DEFAULT 0,
  sin_leer_cliente  integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  archived_at       timestamptz,
  CHECK (cliente_user_id IS NOT NULL OR invitado_huella IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS soporte_conv_raiz ON soporte_conversaciones (raiz_id, ultimo_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS soporte_conv_pagina ON soporte_conversaciones (pagina_id);
CREATE INDEX IF NOT EXISTS soporte_conv_cliente ON soporte_conversaciones (cliente_user_id);
CREATE INDEX IF NOT EXISTS soporte_conv_invitado ON soporte_conversaciones (invitado_huella) WHERE invitado_huella IS NOT NULL;
CREATE INDEX IF NOT EXISTS soporte_conv_experto ON soporte_conversaciones (experto_id);

CREATE TABLE IF NOT EXISTS soporte_mensajes (
  id               text PRIMARY KEY,
  conversacion_id  text NOT NULL REFERENCES soporte_conversaciones(id) ON DELETE CASCADE,
  -- 'cliente' quien pregunta · 'equipo' el sitio o el experto · 'sistema'
  -- los avisos que escribe el servidor (consulta pagada, cancelada…).
  de               text NOT NULL CHECK (de IN ('cliente', 'equipo', 'sistema')),
  autor_user_id    text REFERENCES users(id) ON DELETE SET NULL,
  texto            text NOT NULL CHECK (length(texto) BETWEEN 1 AND 5000),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS soporte_mensajes_conv ON soporte_mensajes (conversacion_id, created_at);
CREATE INDEX IF NOT EXISTS soporte_mensajes_autor ON soporte_mensajes (autor_user_id);

-- Una consulta reservada con un experto. 'reservando' retiene el hueco
-- mientras se paga (caduca con `expira_at`, como la sesión de Stripe);
-- 'pagada' es firme; 'hecha' y 'cancelada' cierran.
-- `cobro`: 'directo' = Stripe ya le pasó su parte al experto (Connect);
-- 'plataforma' = el dinero entró en la cuenta del sitio y se le debe
-- `neto_experto_centimos` hasta que alguien apunte la transferencia.
CREATE TABLE IF NOT EXISTS consultas_experto (
  id                      text PRIMARY KEY,
  experto_id              text NOT NULL REFERENCES expertos(id) ON DELETE CASCADE,
  raiz_id                 text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  conversacion_id         text REFERENCES soporte_conversaciones(id) ON DELETE SET NULL,
  cliente_user_id         text REFERENCES users(id) ON DELETE SET NULL,
  cliente_email           text,
  cliente_nombre          text,
  tema                    text,
  inicio                  timestamptz NOT NULL,
  fin                     timestamptz NOT NULL,
  estado                  text NOT NULL DEFAULT 'reservando'
                          CHECK (estado IN ('reservando', 'pagada', 'hecha', 'cancelada', 'caducada')),
  expira_at               timestamptz,
  importe_centimos        integer NOT NULL DEFAULT 0,
  comision_centimos       integer NOT NULL DEFAULT 0,
  neto_experto_centimos   integer NOT NULL DEFAULT 0,
  moneda                  text NOT NULL DEFAULT 'EUR',
  cobro                   text CHECK (cobro IN ('directo', 'plataforma', 'gratis')),
  stripe_session_id       text UNIQUE,
  stripe_payment_intent   text,
  pagada_at               timestamptz,
  reembolsada_at          timestamptz,
  pagado_experto_at       timestamptz,
  transferencia_ref       text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CHECK (fin > inicio)
);
-- Dos personas no pueden quedarse el mismo hueco: la base de datos lo
-- impide aunque las dos reserven en el mismo milisegundo.
CREATE UNIQUE INDEX IF NOT EXISTS consultas_hueco_unico ON consultas_experto (experto_id, inicio)
  WHERE estado IN ('reservando', 'pagada', 'hecha');
CREATE INDEX IF NOT EXISTS consultas_experto_raiz ON consultas_experto (raiz_id, inicio);
CREATE INDEX IF NOT EXISTS consultas_experto_conv ON consultas_experto (conversacion_id);
CREATE INDEX IF NOT EXISTS consultas_experto_cliente ON consultas_experto (cliente_user_id);
