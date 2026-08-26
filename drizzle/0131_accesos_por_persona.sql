-- ============================================================================
-- ACCESO POR PERSONA: LECTURA O EDICIÓN (2026-08-25, fase 3 de «todo son
-- páginas»)
-- ============================================================================
-- Eugenio: «existe la opción de que la página sea semiprivada, donde das acceso
-- a esa página a personas concretas. Esas personas pueden tener diferentes
-- accesos, de solo lectura o también de edición».
--
-- ── LA FORMA ES LA GENÉRICA, A PROPÓSITO ───────────────────────────────────
-- No es una tabla `pagina_usuario`: es la pareja `(entidad_tipo, entidad_id)`
-- que ya usan `dominios_paginas` (0129), `subtema_contenido` y las denuncias.
-- El día que un proyecto o un mapa quieran acceso por persona, es una fila más
-- con otro `entidad_tipo`, no otra tabla. `src/db/CLAUDE.md` lleva escrito
-- desde el principio que hay 43 tablas de unión de dos claves y que la salida
-- es esta forma; crear la 44 sería empeorar el problema que ese documento pide
-- no empeorar.
--
-- ── QUÉ SIGNIFICA CADA ROL, PARA QUE NO HAYA DOS LECTURAS ──────────────────
--   · 'lectura': ve la página aunque sea privada. No puede tocarla.
--   · 'edicion': además puede editarla. Editar NO incluye borrar ni cambiar
--     quién accede: eso queda del autor y de un administrador, porque dar
--     acceso de edición a alguien no es nombrarlo dueño.
CREATE TABLE IF NOT EXISTS accesos_entidad (
  entidad_tipo  text NOT NULL,
  entidad_id    text NOT NULL,
  user_id       text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rol           text NOT NULL CHECK (rol IN ('lectura', 'edicion')),
  otorgado_por  text REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad_tipo, entidad_id, user_id)
);

-- La pregunta de cada carga de página es «¿qué acceso tiene ESTA persona a ESTA
-- cosa?», que ya la contesta la clave primaria. Ésta es la otra pregunta:
-- «¿a qué cosas tengo acceso yo?», para poder listarlas algún día.
CREATE INDEX IF NOT EXISTS accesos_por_usuario ON accesos_entidad (user_id);
