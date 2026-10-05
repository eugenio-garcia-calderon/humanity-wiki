-- ============================================================================
-- MIEMBROS EN LOS SITIOS PUBLICADOS, AL ESTILO SOFTR (2026-10-05, carril acceso)
-- ============================================================================
-- Una página publicada (con su subdominio o su dominio propio) puede tener
-- MIEMBROS: gente que se registra o entra DENTRO de ese sitio, con su marca, y
-- que según su categoría ve unas páginas, secciones o bloques y no otros.
-- El diseño completo, y el porqué de cada pieza, está en la cabecera de
-- `src/server/miembros.ts`. Aquí sólo las tablas.

-- La configuración del sitio: una fila por página raíz que ha activado
-- «Permitir registro».
CREATE TABLE IF NOT EXISTS sitio_config (
  raiz_id            text PRIMARY KEY REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  activo             boolean NOT NULL DEFAULT false,
  -- 'abierto': entra quien se registra · 'aprobacion': queda pendiente hasta
  -- que el editor lo aprueba · 'invitacion': sólo entra quien fue invitado.
  registro           text NOT NULL DEFAULT 'abierto' CHECK (registro IN ('abierto', 'aprobacion', 'invitacion')),
  enlace_magico      boolean NOT NULL DEFAULT true,
  categoria_defecto  text,
  mensaje            text,
  creado_por         text REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sitio_config_creado_por ON sitio_config (creado_por);

-- Las categorías (roles) con nombre propio, y qué puede hacer cada una.
-- `permisos`: {"ver","comentar","guardar","comprar","editar","todo"} a true/false.
CREATE TABLE IF NOT EXISTS sitio_categorias (
  id          text PRIMARY KEY,
  raiz_id     text NOT NULL REFERENCES sitio_config(raiz_id) ON DELETE CASCADE,
  nombre      text NOT NULL CHECK (length(trim(nombre)) BETWEEN 1 AND 60),
  color       text,
  permisos    jsonb NOT NULL DEFAULT '{"ver": true}'::jsonb,
  orden       integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sitio_categorias_raiz ON sitio_categorias (raiz_id);

-- Los miembros. `user_id` es la cuenta de la plataforma (se reutiliza: una
-- persona, una contraseña); vacío mientras sólo es una invitación.
CREATE TABLE IF NOT EXISTS sitio_miembros (
  id             text PRIMARY KEY,
  raiz_id        text NOT NULL REFERENCES sitio_config(raiz_id) ON DELETE CASCADE,
  user_id        text REFERENCES users(id) ON DELETE CASCADE,
  email          text NOT NULL CHECK (email = lower(email)),
  nombre         text,
  categoria_id   text REFERENCES sitio_categorias(id) ON DELETE SET NULL,
  estado         text NOT NULL DEFAULT 'activo' CHECK (estado IN ('invitado', 'pendiente', 'activo', 'bloqueado')),
  invitado_por   text REFERENCES users(id) ON DELETE SET NULL,
  aprobado_en    timestamptz,
  ultima_visita  timestamptz,
  visitas        integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sitio_miembros_email ON sitio_miembros (raiz_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS sitio_miembros_usuario ON sitio_miembros (raiz_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sitio_miembros_user_id ON sitio_miembros (user_id);
CREATE INDEX IF NOT EXISTS sitio_miembros_categoria ON sitio_miembros (categoria_id);
CREATE INDEX IF NOT EXISTS sitio_miembros_invitado_por ON sitio_miembros (invitado_por);

-- Las sesiones DENTRO de un sitio. No son `sessions`: una sesión de sitio no
-- abre la plataforma, sólo ese sitio, en ese anfitrión. Se guarda la huella
-- (sha256) del testigo, nunca el testigo.
CREATE TABLE IF NOT EXISTS sitio_sesiones (
  huella      text PRIMARY KEY,
  miembro_id  text NOT NULL REFERENCES sitio_miembros(id) ON DELETE CASCADE,
  raiz_id     text NOT NULL REFERENCES sitio_config(raiz_id) ON DELETE CASCADE,
  host        text NOT NULL,
  caduca      timestamptz NOT NULL,
  revocada    timestamptz,
  ip          text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sitio_sesiones_miembro ON sitio_sesiones (miembro_id);
CREATE INDEX IF NOT EXISTS sitio_sesiones_raiz ON sitio_sesiones (raiz_id);

-- Los enlaces mágicos: huella, un solo uso, 20 minutos.
CREATE TABLE IF NOT EXISTS sitio_enlaces (
  huella      text PRIMARY KEY,
  raiz_id     text NOT NULL REFERENCES sitio_config(raiz_id) ON DELETE CASCADE,
  email       text NOT NULL,
  host        text NOT NULL,
  caduca      timestamptz NOT NULL,
  usado_en    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sitio_enlaces_raiz ON sitio_enlaces (raiz_id);

-- Qué ve cada categoría. `bloque_id = ''` es la página entera (y lo que cuelga
-- de ella); si no, un bloque, o una sección si `alcance = 'seccion'` (el
-- título y todo lo que hay hasta el siguiente título de su nivel).
-- `categorias` vacío = cualquier miembro activo.
CREATE TABLE IF NOT EXISTS sitio_restricciones (
  pagina_id   text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  bloque_id   text NOT NULL DEFAULT '',
  raiz_id     text NOT NULL REFERENCES sitio_config(raiz_id) ON DELETE CASCADE,
  alcance     text NOT NULL DEFAULT 'bloque' CHECK (alcance IN ('pagina', 'bloque', 'seccion')),
  categorias  text[] NOT NULL DEFAULT '{}',
  -- Si la página era pública al restringirla: al quitar la regla, vuelve a
  -- estar como estaba.
  era_publica boolean NOT NULL DEFAULT false,
  creado_por  text REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pagina_id, bloque_id)
);
CREATE INDEX IF NOT EXISTS sitio_restricciones_raiz ON sitio_restricciones (raiz_id);
CREATE INDEX IF NOT EXISTS sitio_restricciones_creado_por ON sitio_restricciones (creado_por);

-- Lo que cada miembro guarda del sitio (sus favoritos).
CREATE TABLE IF NOT EXISTS sitio_guardados (
  miembro_id  text NOT NULL REFERENCES sitio_miembros(id) ON DELETE CASCADE,
  pagina_id   text NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (miembro_id, pagina_id)
);
CREATE INDEX IF NOT EXISTS sitio_guardados_pagina ON sitio_guardados (pagina_id);

-- ── LA REGLA QUE NO SE PUEDE SALTAR NINGUNA RUTA ───────────────────────────
-- Una página «solo miembros» NO es pública, nunca. Hay más de cien sitios en
-- el código que leen `publico = true` (el muro, el buscador, el sitemap, los
-- perfiles…), y basta con que uno no conozca las restricciones para que el
-- contenido privado salga a la calle. En vez de enseñárselas a los cien, la
-- base de datos garantiza que una página restringida tiene `publico = false`:
-- da igual qué ruta intente publicarla.
CREATE OR REPLACE FUNCTION pagina_restringida_no_publica() RETURNS trigger AS $$
BEGIN
  IF NEW.publico AND EXISTS (
    SELECT 1 FROM sitio_restricciones r WHERE r.pagina_id = NEW.id AND r.bloque_id = ''
  ) THEN
    NEW.publico := false;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pagina_restringida_no_publica ON knowledge_windows;
CREATE TRIGGER pagina_restringida_no_publica
  BEFORE INSERT OR UPDATE OF publico ON knowledge_windows
  FOR EACH ROW EXECUTE FUNCTION pagina_restringida_no_publica();
