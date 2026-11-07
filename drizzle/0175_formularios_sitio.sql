-- 0175 — LOS FORMULARIOS DE UN SITIO ESCAPARATE (2026-11-07, Eugenio en luzhumanidad.com:
-- «con alta calidad, no quiero nada cutre»). Quien visita escribe para colaborar o se
-- apunta al boletín; quien publica el sitio lo ve en `/paginas/:id/formularios`.
-- El código está en `src/server/formulariosSitio.ts`.
--
-- POR QUÉ DOS TABLAS PROPIAS Y NO DOS BASES DE DATOS DE LA PLATAFORMA. Era lo
-- preferido (filtros y exportar gratis), pero el 2026-11-07 se comprobó en
-- producción que `GET /api/data/:entity/:id/history` (server.ts) contesta SIN SESIÓN
-- con la instantánea de cualquier fila de `entity_history`, y cada vez que alguien
-- edita una celda de una base de datos (`escribirCeldas`, bd.ts) se guarda ahí la
-- fila entera de antes. Marcar un mensaje como «respondido» habría dejado su nombre,
-- su correo y su texto legibles para cualquiera que tuviera el id. Estas tablas no
-- pasan por ninguna ruta genérica: sólo por las de su módulo, que exigen administrar
-- la página raíz, y no se ven en el navegador de base de datos
-- (`seguridad/transparencia.ts`).
--
-- LO QUE NO SE GUARDA, a propósito: ni la IP (el límite de envíos vive en memoria y
-- con una huella que cambia en cada arranque), ni el navegador, ni el testigo de
-- confirmar (sólo su huella SHA-256).

CREATE TABLE IF NOT EXISTS sitio_mensajes (
  id                   text PRIMARY KEY,
  raiz_id              text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  -- NULL después de «Borrar sus datos» (el derecho de supresión): la fila se queda
  -- sin nada que diga quién era, para que las cifras sigan cuadrando.
  nombre               text,
  email                text,
  mensaje              text,
  motivo               text NOT NULL CHECK (motivo IN ('voluntariado', 'donacion', 'empresa', 'prensa', 'otro')),
  -- El proyecto elegido: su nombre corto (`/aeromovil` → `aeromovil`) y cómo se llamaba
  -- al escribir, por si después cambia de nombre o deja de verse.
  proyecto_slug        text,
  proyecto_titulo      text,
  -- La página desde la que se envió (sólo la ruta: sin dominio, sin `?` y sin `#`).
  origen               text,
  -- El texto exacto que aceptó (la casilla y la información que la acompañaba) y cuándo.
  consentimiento_texto text NOT NULL,
  consentimiento_at    timestamptz NOT NULL,
  estado               text NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo', 'leido', 'respondido', 'archivado')),
  -- Cuándo salió de verdad el aviso por correo a la dirección de contacto del sitio.
  -- NULL: no salió (hoy, sin proveedor de correo, nunca sale).
  aviso_enviado_at     timestamptz,
  datos_borrados_at    timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sitio_mensajes_raiz ON sitio_mensajes (raiz_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sitio_suscriptores (
  id                   text PRIMARY KEY,
  raiz_id              text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  -- En minúsculas. NULL después de la baja: darse de baja borra la dirección.
  email                text CHECK (email = lower(email)),
  estado               text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'baja')),
  -- La huella SHA-256 del enlace de confirmar que salió en el último correo. El
  -- enlace en sí no se guarda.
  token_confirmar      text,
  -- El de baja SÍ se guarda tal cual: tiene que poder ir en cada correo que salga
  -- (también en los boletines de mañana), y lo único que abre es dejar de recibirlos.
  token_baja           text,
  consentimiento_texto text NOT NULL,
  consentimiento_at    timestamptz NOT NULL,
  origen               text,
  confirmado_at        timestamptz,
  baja_at              timestamptz,
  -- El último correo que salió DE VERDAD hacia esta dirección. NULL: ninguno.
  -- Sirve también de freno: como mucho uno cada diez minutos a la misma dirección.
  correo_enviado_at    timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sitio_suscriptores_email ON sitio_suscriptores (raiz_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS sitio_suscriptores_raiz ON sitio_suscriptores (raiz_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS sitio_suscriptores_confirmar ON sitio_suscriptores (token_confirmar) WHERE token_confirmar IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS sitio_suscriptores_baja ON sitio_suscriptores (token_baja) WHERE token_baja IS NOT NULL;
