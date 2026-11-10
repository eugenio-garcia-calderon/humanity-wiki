-- 0182 — LOS PRÉSTAMOS FIRMADOS EN UN SITIO (2026-11-10, Eugenio en solarcrowd.com:
-- «un botón que sea realizar préstamo… que rellene sus datos, acepte las condiciones,
-- firme, adjunte el justificante de la transferencia y le dé a formalizar préstamo»).
-- El código está en `src/server/prestamos.ts`; el bloque, en `bloquesDatos/prestamo`.
--
-- POR QUÉ UNA TABLA PROPIA, como `sitio_mensajes` (0175): las filas de una base de datos
-- de la plataforma dejan su historia en `entity_history`, que se lee sin sesión. Aquí hay
-- un DNI, un domicilio y un IBAN. Esta tabla solo la tocan las rutas de su módulo, que
-- exigen administrar la página donde está el bloque.
--
-- LO QUE SE GUARDA Y POR QUÉ: lo que el contrato necesita (las partes, el importe, el
-- interés, el plazo y la cuenta de devolución), el texto exacto que se firmó y su huella
-- SHA-256, y dónde están la firma, el justificante y el PDF (en `/uploads/privado/`, que
-- no sirve el estático). No se guarda la IP: solo una huella con sal que cambia en cada
-- arranque, para los frenos, y ni siquiera eso en la fila.

CREATE TABLE IF NOT EXISTS prestamos_firmados (
  id                 text PRIMARY KEY,
  -- La página que lleva el bloque (la ficha del préstamo) y el bloque, por si hay dos.
  pagina_id          text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  bloque_id          text NOT NULL,
  -- Cómo se llamaba la entidad al firmar, por si después cambia el bloque.
  entidad            text NOT NULL,
  -- NULL después de «Borrar sus datos»: la fila se queda con las cifras y sin la persona.
  nombre             text,
  documento          text,
  domicilio          text,
  email              text,
  telefono           text,
  iban_devolucion    text,
  importe            numeric(12, 2) NOT NULL CHECK (importe > 0),
  interes            numeric(5, 2) NOT NULL CHECK (interes >= 0),
  plazo_meses        integer NOT NULL CHECK (plazo_meses > 0),
  -- El contrato tal cual se leyó y firmó, y su huella. Lo que aceptó, casilla a casilla.
  contrato_texto     text,
  contrato_huella    text NOT NULL,
  aceptaciones       jsonb NOT NULL DEFAULT '[]'::jsonb,
  firmado_at         timestamptz NOT NULL DEFAULT now(),
  firma_url          text,
  justificante_url   text,
  pdf_url            text,
  -- recibido: llegó; verificado: la transferencia está en la cuenta de la entidad;
  -- devuelto: la entidad ya pagó; incidencia: algo va mal; anulado: no sigue adelante.
  estado             text NOT NULL DEFAULT 'recibido'
                     CHECK (estado IN ('recibido', 'verificado', 'devuelto', 'incidencia', 'anulado')),
  -- Cuándo salió de verdad la copia a cada destinatario (NULL: no salió).
  copia_prestamista_at timestamptz,
  aviso_admin_at     timestamptz,
  borrado_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS prestamos_firmados_pagina_idx ON prestamos_firmados (pagina_id, created_at DESC);
