-- 0232 — LAS FIGURAS DEL TEST DE GEOMETRÍA POLÍTICA (2026-11-19, Eugenio).
-- Quien quiere puede construir su figura con deslizadores, publicarla con un nombre
-- (sin registrarse) y, si quiere, recibir sus resultados por correo.
-- El código está en `src/server/figuras.ts`; la cuenta compartida, en
-- `public/geometria-figura/comun.js`.
--
-- DECISIONES DE EUGENIO (2026-11-19):
--   · Se publica al momento, sin revisión previa. Quien administra la plataforma puede
--     ocultar una figura (`estado = 'oculta'`), que deja de verse sin borrarse.
--   · El correo se GUARDA mientras exista la figura, para poder enviar los resultados y
--     ofrecer el boletín. Borrar la figura borra también el correo.
--   · La galería es pública: cualquiera ve la lista con los nombres y las figuras.
--
-- LO QUE NO SE GUARDA, a propósito:
--   · Ni la IP: el límite de envíos vive en memoria, igual que los formularios de los sitios.
--   · La clave para borrar la figura nunca se guarda en claro, sólo su huella SHA-256.
--     La clave se muestra UNA vez, al publicar, y viaja en el correo de resultados si lo pidió.
--   · El texto de la casilla de novedades se guarda tal cual se leyó: es la prueba del
--     consentimiento, igual que en el boletín de los sitios.
--
-- QUIÉN LA LEE: sólo sus rutas. No está en el historial de entidades (no pasa por
-- `escribirCeldas`) y está CERRADA en el navegador de base de datos
-- (`src/server/seguridad/transparencia.ts`), porque tiene correos.
--
-- COPIAS DE SEGURIDAD: las copias diarias conservan las filas borradas hasta que caduquen.
-- Borrar una figura la quita de la base de datos, no de las copias ya hechas.

CREATE TABLE IF NOT EXISTS figuras_geometria (
  id                      text PRIMARY KEY,
  nombre                  text NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 40),
  -- 10 temas, cada uno con una cifra de 0 a 10 por aspecto (6 u 8 según el tema).
  -- La validación completa está en `figuraValida` (comun.js): aquí sólo se pide que sea una lista.
  puntuaciones            jsonb NOT NULL CHECK (jsonb_typeof(puntuaciones) = 'array'),
  -- NULL si no quiso dejar correo. Nunca se devuelve por ninguna ruta pública.
  correo                  text CHECK (correo IS NULL OR char_length(correo) <= 254),
  quiere_novedades        boolean NOT NULL DEFAULT false,
  -- Lo que se le mostró junto a la casilla, en el momento en que la marcó.
  texto_consentimiento    text,
  clave_hash              text NOT NULL,
  estado                  text NOT NULL DEFAULT 'publicada' CHECK (estado IN ('publicada', 'oculta')),
  resultados_enviados_at  timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- La galería pide «las publicadas, la más nueva primero».
CREATE INDEX IF NOT EXISTS figuras_geometria_lista ON figuras_geometria (estado, created_at DESC);
