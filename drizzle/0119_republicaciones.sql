-- ============================================================================
-- REPUBLICAR (2026-08-24)
-- ============================================================================
-- Eugenio: «poder hacer una republicación de otro autor y que aparezca arriba
-- el que republica con o sin comentario y abajo el autor original y el
-- contenido, y que se pueda republicar de todas las redes sociales, no solo
-- contenido de la plataforma».
--
-- ── UNA REPUBLICACIÓN ES UNA PUBLICACIÓN, NO UNA TABLA NUEVA ────────────────
-- Tiene autor, texto, fecha, apoyos, comentarios y se modera igual. Lo único
-- que añade es DE DÓNDE VIENE lo que hay debajo. Una tabla aparte habría
-- obligado a duplicar el muro, la papelera, el bloqueo entre personas y las
-- denuncias — y a acordarse de las cinco cada vez que cambiara una.
-- (Ya hay 43 tablas de unión en este proyecto; ver src/db/CLAUDE.md.)
--
-- ── DOS PROCEDENCIAS QUE NO SE PUEDEN CONFUNDIR ────────────────────────────
-- Lo de dentro y lo de fuera se guardan en columnas DISTINTAS a propósito:
--
--   republica_pub_id  → una publicación de aquí. Se lee viva: si su autor la
--                       edita o la borra, la republicación se entera.
--   republica_url     → algo de fuera (X, Instagram, YouTube, un periódico).
--                       Aquí no se puede leer nada vivo, así que se guarda una
--                       COPIA de lo que se vio, en `republica_fuente`.
--
-- Guardarlo todo en un solo campo obligaría a adivinar cuál es cuál mirando si
-- parece una URL, y el día que un id se parezca a una dirección la
-- republicación apuntaría a otro sitio. Son dos cosas y ocupan dos sitios.
--
-- ── POR QUÉ LO DE FUERA SE COPIA Y LO DE DENTRO NO ─────────────────────────
-- Es la misma decisión que este proyecto ya tomó con lo medido y lo simulado:
-- no se puede afirmar lo que no se puede comprobar. De una publicación de aquí
-- sabemos si sigue existiendo; de un tuit no. Copiarlo permite seguir
-- enseñándolo cuando el original desaparece, y `republica_fuente.visto_el` dice
-- **cuándo se vio**, para que nadie lo lea como si fuera de ahora.

ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS republica_pub_id text,
  ADD COLUMN IF NOT EXISTS republica_url    text,
  ADD COLUMN IF NOT EXISTS republica_fuente jsonb;

-- Sólo una de las dos, nunca las dos. Sin esto, una fila con las dos llenas
-- sería una republicación que apunta a dos sitios y nadie sabría cuál pintar.
ALTER TABLE publications
  DROP CONSTRAINT IF EXISTS publications_republica_una_sola;
ALTER TABLE publications
  ADD CONSTRAINT publications_republica_una_sola
  CHECK (republica_pub_id IS NULL OR republica_url IS NULL);

-- Para contar cuántas veces se ha republicado algo, y para encontrar las
-- republicaciones de una publicación cuando su autor la borra.
CREATE INDEX IF NOT EXISTS publications_republica_pub_idx
  ON publications (republica_pub_id) WHERE republica_pub_id IS NOT NULL;
