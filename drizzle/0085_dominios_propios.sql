-- ============================================================================
-- DOMINIO PROPIO PARA UNA PÁGINA — como en Notion (2026-08-22)
-- ============================================================================
-- Eugenio: «para mí la clave sería permitir que el usuario ponga su dominio
-- propio en una de sus páginas como hace notion».
--
-- Hoy una página publicada vive en `humanity.wiki/@nombre/pagina` o en
-- `nombre.humanity.wiki/pagina`. Las dos dicen dónde está alojada. Un dominio
-- propio deja de decirlo: `lamieldelasierra.com` es de quien lo compró, y eso
-- cambia lo que la página parece.
--
-- ── POR QUÉ HACE FALTA UNA TABLA Y NO UNA COLUMNA ───────────────────────────
-- Un dominio no es un atributo de la página: tiene vida propia. Se reserva
-- antes de apuntar a ninguna parte, se verifica, puede fallar la verificación,
-- puede cambiar de página sin dejar de ser tuyo, y hay que poder decir POR QUÉ
-- no funciona. Una columna `dominio` en `knowledge_windows` no sabría decir
-- «el DNS todavía no apunta aquí», que es lo que va a pasarle a casi todo el
-- mundo el primer día.

CREATE TABLE IF NOT EXISTS dominios_paginas (
  id text PRIMARY KEY,

  -- Siempre en minúsculas y sin `www.` ni protocolo: se normaliza al guardar.
  -- ÚNICO en toda la plataforma: dos personas no pueden reclamar el mismo
  -- dominio, y quien lo tiene lo tiene hasta que lo suelta.
  dominio text NOT NULL UNIQUE,

  propietario_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- A qué apunta. NULL = al espacio de esa persona (su portada), que es lo
  -- que quiere quien compra un dominio para su tienda entera y no para una
  -- página suelta.
  pagina_id text REFERENCES knowledge_windows(id) ON DELETE SET NULL,

  -- `pendiente`  reservado, el DNS todavía no apunta aquí
  -- `activo`     el certificado se emitió y la página se sirve
  -- `fallo`      se intentó y no se pudo; `ultimo_error` dice por qué
  -- `retirado`   su dueño lo quitó; se conserva la fila para no perder el
  --              rastro de quién lo tuvo
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'activo', 'fallo', 'retirado')),

  -- El porqué, en palabras, para que la pantalla no tenga que adivinarlo.
  -- NULL no es «todo bien»: es «no ha habido ningún intento todavía».
  ultimo_error text,
  ultimo_intento_at timestamp,

  -- Cuándo se sirvió por primera vez de verdad. Es lo que distingue «dice que
  -- está activo» de «alguien lo ha abierto y funcionó».
  activo_desde timestamp,

  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- LA CONSULTA MÁS CALIENTE DE TODA LA PLATAFORMA, y conviene saberlo: Caddy
-- pregunta «¿puedo emitir un certificado para este dominio?» en cada petición
-- de un dominio que no conoce todavía. Sin índice, cada intento de conexión
-- —incluidos los de quien escanea internet probando dominios— sería un barrido
-- de la tabla.
CREATE UNIQUE INDEX IF NOT EXISTS dominios_paginas_dominio_idx
  ON dominios_paginas (dominio);

-- «Qué dominios tengo yo», que es lo que pide la pantalla de compartir.
CREATE INDEX IF NOT EXISTS dominios_paginas_propietario_idx
  ON dominios_paginas (propietario_user_id, created_at DESC);

COMMENT ON TABLE dominios_paginas IS
  'Dominios propios apuntando a una página o a un espacio. Caddy consulta esta tabla antes de emitir un certificado.';
COMMENT ON COLUMN dominios_paginas.pagina_id IS
  'NULL = el dominio apunta a la portada del espacio de su dueño, no a una página suelta.';
