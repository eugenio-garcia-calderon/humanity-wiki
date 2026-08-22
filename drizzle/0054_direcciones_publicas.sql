-- ============================================================================
-- DIRECCIONES PÚBLICAS: UN NOMBRE PARA CADA USUARIO Y UNA PARA CADA PÁGINA
-- ============================================================================
-- Hoy una página publicada se comparte como `humanity.wiki/paginas/KWMSKG9OVGZZ`.
-- Ese identificador no se puede leer por teléfono, no dice de qué va, y no dice
-- de quién es. Lo que se pide es lo que hace Notion:
--
--     lighthumanity.humanity.wiki/astillero-solar
--
-- ── POR QUÉ UN NOMBRE POR USUARIO Y NO UNA SOLA BOLSA DE DIRECCIONES ────────
-- Si todas las páginas del mundo compartieran un único espacio de nombres, la
-- primera persona que publicara «astillero-solar» se lo quedaría para siempre y
-- todas las demás tendrían que llamarlo «astillero-solar-2». Esa es exactamente
-- la razón por la que Notion da un subdominio a cada espacio: la unicidad se
-- exige DENTRO de cada usuario, y así dos personas pueden tener cada una su
-- «astillero-solar» sin pelearse. De ahí el índice único por (usuario, slug) y
-- no sobre el slug solo.
--
-- ── LA PARTE QUE NO ES CÓDIGO, Y HAY QUE DECIRLA ────────────────────────────
-- El subdominio necesita DOS cosas que no están en este repositorio y que no
-- puede resolver una migración:
--   1. Un registro DNS comodín `*.humanity.wiki` en Cloudflare.
--   2. Que Caddy sepa servir ese comodín. Hoy `deploy/Caddyfile` solo declara
--      el dominio a secas, y su propio comentario recuerda que añadir `www`
--      quemó el cupo de Let's Encrypt (5 fallos/hora) en agosto. La vía sin ese
--      riesgo es un certificado de origen de Cloudflare para `*.humanity.wiki`,
--      que dura 15 años y no depende de validaciones.
--
-- POR ESO ESTA MIGRACIÓN NO GUARDA UNA URL, GUARDA UNA IDENTIDAD. `handle` y
-- `slug` son el nombre reservado; cómo se sirven es una decisión de entrega que
-- se puede cambiar sin tocar un dato:
--   · hoy, sin nada de infraestructura:   humanity.wiki/@lighthumanity/astillero-solar
--   · con el comodín puesto:              lighthumanity.humanity.wiki/astillero-solar
-- Las dos direcciones apuntan a la misma fila. Reservar el nombre hoy es lo que
-- permite que el día que exista el comodín no haya que migrar nada ni romper
-- ningún enlace ya compartido.
-- ============================================================================

-- ── EL NOMBRE DE CADA USUARIO ───────────────────────────────────────────────
-- Es lo que será su subdominio. Se guarda SIEMPRE en minúsculas: los dominios
-- no distinguen mayúsculas, así que «LightHumanity» y «lighthumanity» son la
-- misma dirección y no pueden ser dos filas distintas.
ALTER TABLE users ADD COLUMN IF NOT EXISTS handle text;

-- Longitud y alfabeto de un subdominio válido (RFC 1123): letras, números y
-- guiones, sin empezar ni acabar en guión. El límite de 30 no es técnico —caben
-- 63— sino de producto: un nombre que no se puede dictar por teléfono no sirve
-- para lo que se pide aquí, que es compartirlo.
ALTER TABLE users ADD CONSTRAINT users_handle_formato
  CHECK (handle IS NULL OR handle ~ '^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])$');

CREATE UNIQUE INDEX IF NOT EXISTS users_handle_idx ON users (handle) WHERE handle IS NOT NULL;

-- ── NOMBRES QUE NADIE PUEDE COGER ───────────────────────────────────────────
-- Tabla en vez de una lista en el código a propósito: esta lista va a crecer
-- cada vez que se cree un servicio nuevo, y si vive en el código hay que
-- desplegar para añadir uno — con el agravante de que para entonces puede que
-- alguien ya se lo haya quedado.
CREATE TABLE IF NOT EXISTS handles_reservados (
  handle text PRIMARY KEY,
  motivo text NOT NULL
);

INSERT INTO handles_reservados (handle, motivo) VALUES
  -- Si alguien coge estos, se queda con correo o certificados de la plataforma.
  ('www', 'infraestructura'), ('mail', 'infraestructura'), ('smtp', 'infraestructura'),
  ('imap', 'infraestructura'), ('mx', 'infraestructura'), ('ns', 'infraestructura'),
  ('ftp', 'infraestructura'), ('cdn', 'infraestructura'), ('static', 'infraestructura'),
  ('assets', 'infraestructura'), ('autoconfig', 'infraestructura'), ('autodiscover', 'infraestructura'),
  -- Servicios de la plataforma, existan ya o no. Reservarlos antes es gratis.
  ('api', 'plataforma'), ('app', 'plataforma'), ('admin', 'plataforma'),
  ('auth', 'plataforma'), ('login', 'plataforma'), ('cuenta', 'plataforma'),
  ('blog', 'plataforma'), ('docs', 'plataforma'), ('help', 'plataforma'),
  ('ayuda', 'plataforma'), ('soporte', 'plataforma'), ('status', 'plataforma'),
  ('dev', 'plataforma'), ('test', 'plataforma'), ('staging', 'plataforma'),
  ('mapa', 'plataforma'), ('mapas', 'plataforma'), ('explorar', 'plataforma'),
  ('mercado', 'plataforma'), ('proyectos', 'plataforma'), ('personas', 'plataforma'),
  -- La marca. Que nadie pueda publicar en «humanity.humanity.wiki» y hacerse
  -- pasar por la plataforma: es el caso que convierte un nombre bonito en un
  -- problema de confianza.
  ('humanity', 'marca'), ('humanitywiki', 'marca'), ('oficial', 'marca'),
  ('luzyhumanidad', 'marca'), ('lighthumanity', 'marca')
ON CONFLICT (handle) DO NOTHING;

-- ── LA DIRECCIÓN DE CADA PÁGINA ─────────────────────────────────────────────
ALTER TABLE knowledge_windows ADD COLUMN IF NOT EXISTS slug text;

-- ÚNICO POR USUARIO, NO EN EL MUNDO. Es la mitad que hace que el subdominio
-- sirva de algo: dos personas pueden publicar cada una su «astillero-solar».
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_windows_slug_idx
  ON knowledge_windows (creator_user_id, slug) WHERE slug IS NOT NULL;

-- ── DEJAR DE INDEXARSE EN BUSCADORES, POR PÁGINA ────────────────────────────
-- Publicar y ser encontrable son dos decisiones distintas: alguien puede querer
-- mandar un enlace a tres personas sin que la página acabe en Google. Es la
-- misma separación que hace Notion en ese diálogo. Por defecto SÍ se indexa,
-- porque publicar al común es el objetivo del producto.
ALTER TABLE knowledge_windows ADD COLUMN IF NOT EXISTS indexable boolean NOT NULL DEFAULT true;
