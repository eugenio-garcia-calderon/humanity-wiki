-- ============================================================================
-- UN DOMINIO PUEDE APUNTAR A CUALQUIER COSA, NO SÓLO A UNA PÁGINA (2026-08-25)
-- ============================================================================
-- Eugenio: «permite compartir los proyectos como si fuesen páginas […] inserta
-- esa tecnología también en los proyectos […] crea un módulo que sea como una
-- los dos, para que en un futuro, si queremos también compartir otras
-- herramientas, no tengamos que duplicar código y utilicemos siempre la misma
-- cajita de compartir».
--
-- ── LO QUE HABÍA ───────────────────────────────────────────────────────────
-- `dominios_paginas.pagina_id` apuntaba a `knowledge_windows` y a nada más. Con
-- eso, compartir un proyecto obligaba a una columna `proyecto_id` al lado, y la
-- siguiente herramienta a una tercera — y a un `CASE` en cada consulta para
-- saber cuál de las tres mirar. Cuatro columnas, tres nulas siempre.
--
-- ── LO QUE HAY AHORA ───────────────────────────────────────────────────────
-- La pareja `(entidad_tipo, entidad_id)`, que es **la misma forma que ya usan**
-- `subtema_contenido`, `publicacion_meta` y las denuncias. Añadir «mapas» o
-- «esquemas» a lo compartible pasa a ser una entrada en un registro de código,
-- sin tocar la base ni las consultas.
--
-- `pagina_id` SE QUEDA, y no por pereza: hay dominios funcionando en producción
-- ahora mismo y una migración que renombra la columna con la que se sirven es
-- una migración que puede dejar sitios caídos. Se rellena la pareja nueva desde
-- ella, el código pasa a leer la pareja, y `pagina_id` queda como lo que es —
-- un resto— hasta que se pueda tirar sin prisa.
--
-- ── POR QUÉ NO SE RENOMBRA LA TABLA ────────────────────────────────────────
-- `dominios_paginas` ya no guarda sólo páginas y el nombre miente un poco.
-- Renombrarla ahora obliga a tocar todo lo que la nombra en el mismo despliegue
-- en que se cambia lo que hace, y son dos riesgos que no tienen por qué correrse
-- juntos. Queda dicho aquí para que el siguiente lo lea antes de extrañarse.

ALTER TABLE dominios_paginas ADD COLUMN IF NOT EXISTS entidad_tipo text;
ALTER TABLE dominios_paginas ADD COLUMN IF NOT EXISTS entidad_id   text;

-- Lo que ya hay, traducido a la forma nueva. Sin esto, todos los dominios
-- existentes dejarían de resolver el día que el código lea la pareja.
UPDATE dominios_paginas
   SET entidad_tipo = 'pagina', entidad_id = pagina_id
 WHERE pagina_id IS NOT NULL AND entidad_id IS NULL;

-- Un dominio apunta a UNA cosa o a ninguna —«ninguna» es el espacio de su
-- dueño— pero nunca a media: un tipo sin id, o un id sin tipo, es una fila que
-- el resolvedor no sabría leer y que nadie sabría arreglar.
ALTER TABLE dominios_paginas DROP CONSTRAINT IF EXISTS dominios_entidad_entera;
ALTER TABLE dominios_paginas ADD CONSTRAINT dominios_entidad_entera
  CHECK ((entidad_tipo IS NULL) = (entidad_id IS NULL));

-- Para la pregunta «¿qué dominios apuntan a esto?», que es la que hace la
-- pantalla de compartir de cada herramienta cada vez que se abre.
CREATE INDEX IF NOT EXISTS dominios_por_entidad
  ON dominios_paginas (entidad_tipo, entidad_id);
