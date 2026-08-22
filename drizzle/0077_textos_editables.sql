-- ============================================================================
-- LOS TEXTOS DE LAS PÁGINAS, EDITABLES POR UN ADMINISTRADOR (2026-08-22)
-- ============================================================================
-- Eugenio: «permite a los ADMIN editar todos los textos de esas páginas de
-- información y todas las tareas también».
--
-- Va una pieza para los cinco que la necesitan, en vez de cinco formas
-- distintas de editar un párrafo. Lo que se guarda aquí es **contenido público
-- de la plataforma**, no una nota de nadie: por eso lleva quién lo cambió y
-- cuándo.
--
-- ── EL TEXTO POR DEFECTO NO ESTÁ AQUÍ, ESTÁ EN EL CÓDIGO ───────────────────
-- Esta tabla guarda solo lo que ALGUIEN HA CAMBIADO. El texto original vive
-- donde vive la página, dentro del componente. Es la diferencia entre una
-- página que sale vacía si la tabla está vacía y una que sale entera desde el
-- primer día y solo cambia cuando alguien decide cambiarla.
--
-- Y hace que borrar una fila sea «volver al original», que es la marcha atrás
-- que la gente busca sin que haya que programarla.
--
-- ── UN SOLO IDIOMA, Y ES UNA DECISIÓN ──────────────────────────────────────
-- `clave -> valor`, sin columna de idioma. Hoy la plataforma está entera en
-- español y no hay traducción ni en marcha ni en el plan. Añadir una columna
-- que nadie usa es adivinar el futuro y encima cobrar por adelantado: cada
-- consulta y cada índice cargarían con ella.
--
-- Si algún día hay idiomas, el camino es corto y está pensado: la clave pasa a
-- ser `(clave, idioma)` con `'es'` por defecto para todo lo que ya hay. Queda
-- escrito para que se vea que fue una decisión y no un descuido.
--
-- ── LA CLAVE SE ESCRIBE PARA QUE LA LEA UNA PERSONA ────────────────────────
-- `servidores.intro`, no `texto_17`. El día que alguien vea un párrafo raro en
-- producción y quiera saber de dónde sale, la clave es lo único que le va a
-- ayudar: `pagina.seccion` se busca en el código en tres segundos.
CREATE TABLE IF NOT EXISTS textos_editables (
  clave       text PRIMARY KEY,
  valor       text NOT NULL,
  -- Quién y cuándo. Es contenido público: quien lo cambia responde por él.
  editado_por text REFERENCES users(id),
  updated_at  timestamp NOT NULL DEFAULT now(),
  created_at  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_textos_editables_editado_por ON textos_editables (editado_por);
