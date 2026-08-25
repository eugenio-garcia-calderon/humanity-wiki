-- ============================================================================
-- EL AGREGADOR: CONTENIDO DE FUERA, COLGADO DEL ÁRBOL DE TEMAS (2026-08-25)
-- ============================================================================
-- Eugenio: «eres un agregador de publicaciones de redes como YouTube y X […]
-- hacer lo mejor posible para enseñar contenido relevante en forma de mapas,
-- imágenes, vídeos, textos y gráficas cada vez que alguien pulse en un tema
-- concreto», y «puedes añadir un breve comentario como "IA" de por qué es
-- relevante esta publicación».
--
-- El árbol donde cuelga esto NO es de este fichero: es el de `subtemas`
-- (0120, prog2). Aquí sólo se guarda lo que viene de fuera; la clasificación
-- la hace `subtema_contenido`, que ya existe, con `tipo = 'agregado'`.
--
-- ── POR QUÉ UNA TABLA APARTE Y NO DENTRO DE `publications` ──────────────────
-- Una publicación del muro la escribe alguien de la plataforma y es suya. Esto
-- no: es un enlace a algo que vive en YouTube o en la web de la OCDE, que
-- puede cambiar o desaparecer sin avisarnos, y que no tiene autor aquí. Meter
-- las dos cosas en la misma tabla obligaría a que la mitad de las columnas
-- estuvieran vacías en cada fila, y —peor— haría que un enlace roto de fuera
-- se pareciera a una publicación borrada de dentro. Son dos cosas distintas y
-- se guardan aparte.
--
-- Lo que SÍ comparten es el árbol de temas. Ese es el punto: cuando alguien
-- pulsa «Movilidad eléctrica ligera» tiene que ver lo de dentro y lo de fuera
-- mezclado y ordenado por lo bueno que es, no en dos pestañas.

CREATE TABLE IF NOT EXISTS contenido_agregado (
  id           text PRIMARY KEY,

  -- De dónde viene: 'youtube', 'x', 'web', 'pdf', 'articulo', 'datos'.
  origen       text NOT NULL,

  -- QUÉ ES, para poder pintarlo. Eugenio pidió cinco formas y son éstas:
  -- 'video' | 'imagen' | 'texto' | 'grafica' | 'mapa'.
  -- Va separado de `origen` porque no se deducen el uno del otro: un mapa vivo
  -- puede venir de la web y un vídeo puede venir de un informe.
  formato      text NOT NULL,

  url          text NOT NULL,
  -- El identificador dentro de su casa (el `v=` de YouTube, el id del post).
  -- Sirve para no guardar dos veces lo mismo aunque la URL venga con basura
  -- de seguimiento pegada detrás.
  origen_id    text,

  titulo       text NOT NULL,
  fuente       text,           -- el canal, el medio o la institución
  idioma       text,           -- 'es', 'en', …
  publicado_el date,           -- fecha de la publicación original, no de cuándo la cogimos

  -- ── EL COMENTARIO DE LA IA ────────────────────────────────────────────────
  -- Eugenio: «puedes añadir un breve comentario como "IA" de por qué es
  -- relevante esta publicación».
  --
  -- Se guarda el MODELO que lo escribió junto al texto, y no en un ajuste
  -- global, porque estas notas van a sobrevivir a varios cambios de modelo. El
  -- día que una nota diga una tontería, lo primero que hay que poder saber es
  -- quién la escribió y cuándo.
  nota_ia      text,
  nota_modelo  text,
  nota_el      timestamp,

  -- ── LO QUE DECIDE EL ORDEN ────────────────────────────────────────────────
  -- `calidad` es un número de 0 a 100 puesto por quien clasifica, y es lo que
  -- ordena la portada de un subtema. NO es popularidad: una tesis con doce
  -- visitas puede valer más que un vídeo con dos millones, y si se ordena por
  -- visitas la portada del tema acaba siendo la lista de lo más visto de
  -- YouTube, que es justo lo que ya existe en otro sitio.
  calidad      integer NOT NULL DEFAULT 50,
  -- Por qué se le puso esa nota, en una línea. Sin esto, `calidad` es un número
  -- que nadie puede discutir ni corregir.
  calidad_por  text,

  -- ── SI EL ENLACE SIGUE VIVO ───────────────────────────────────────────────
  -- `estado`: 'vivo' | 'bloquea_robots' | 'roto'.
  --
  -- «bloquea_robots» existe por una razón que costó descubrir y que no se debe
  -- perder: la OCDE, Elsevier, Taylor & Francis y Statista devuelven 403 a un
  -- programa y 200 a una persona. Si el comprobador trata el 403 como enlace
  -- roto, el agregador se va tirando solo, y por orden, las fuentes MÁS serias
  -- que tiene. Un 403 no es un enlace muerto: es una puerta que no abre a los
  -- robots.
  estado       text NOT NULL DEFAULT 'vivo',
  comprobado_el timestamp,

  puesto_por   text,           -- qué usuario o agente lo trajo
  created_at   timestamp DEFAULT now(),
  archived_at  timestamp
);

-- NO GUARDAR DOS VECES EL MISMO VÍDEO. La pareja (origen, origen_id) es la
-- identidad de verdad; la URL no vale porque la misma cosa llega con distintos
-- parámetros pegados. Parcial, para que los que no tienen id propio (una web
-- suelta) no choquen todos entre sí por ser NULL.
CREATE UNIQUE INDEX IF NOT EXISTS contenido_agregado_sin_repetir
  ON contenido_agregado (origen, origen_id)
  WHERE origen_id IS NOT NULL AND archived_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contenido_agregado_url_unica
  ON contenido_agregado (url) WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS contenido_agregado_por_formato
  ON contenido_agregado (formato) WHERE archived_at IS NULL;

-- Para pintar un subtema: se entra por `subtema_contenido` y se ordena por
-- calidad. Este índice es el que hace que esa portada no recorra la tabla.
CREATE INDEX IF NOT EXISTS contenido_agregado_por_calidad
  ON contenido_agregado (calidad DESC) WHERE archived_at IS NULL;
