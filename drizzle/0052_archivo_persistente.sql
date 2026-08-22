-- ============================================================================
-- EL ARCHIVO: LOS FICHEROS SE QUEDAN EN ALGÚN SITIO (2026-08-21, aprobado por
-- Eugenio tras el hallazgo del Tester: «puedo enseñarle mi informe de CFD a la
-- IA una vez, pero no dejarlo colgado del proyecto para que mañana lo abra
-- otro»).
-- ============================================================================
-- SUBIR YA SE PODÍA en cuatro sitios (el chat, el bloque de imagen, el
-- documento y el Mundo 3D). Lo que faltaba es que lo subido SE QUEDARA: un
-- fichero entraba, se usaba una vez y se perdía de vista. Esto es la libreta
-- que dice qué fichero es de qué.
--
-- LOS BYTES NO SE MUEVEN. Siguen donde ya estaban: el volumen /data/uploads,
-- separado del repositorio (comprobado en producción, 2026-08-21). Esta tabla
-- solo apunta a ellos. Reaprovechar el almacén que ya funciona es más barato
-- y más seguro que inventar otro.
--
-- PERMISOS: NO LOS TIENE. Un fichero se ve si se ve la cosa de la que cuelga —
-- proyecto privado, fichero privado; proyecto público, fichero público. Una
-- capa de permisos por fichero es de las que casi nadie configura bien, y si
-- algún día hace falta se añade encima. Al revés no se puede.
CREATE TABLE IF NOT EXISTS archivos (
  id            text PRIMARY KEY,
  -- Dónde están los bytes: la ruta que devolvió /api/uploads.
  url           text NOT NULL,
  nombre        text NOT NULL,          -- como lo llamó quien lo subió
  mime          text NOT NULL,
  bytes         bigint NOT NULL,
  clase         text NOT NULL,          -- imagen | video | audio | pdf | archivo

  -- DE QUÉ CUELGA. Exactamente uno de los tres, nunca dos: un fichero está en
  -- un sitio. La restricción de abajo lo hace cumplir en vez de confiar.
  proyecto_id   text REFERENCES proyectos(id) ON DELETE CASCADE,
  tarea_id      text REFERENCES roadmap_items(id) ON DELETE CASCADE,
  pagina_id     text REFERENCES knowledge_windows(id) ON DELETE CASCADE,

  descripcion   text,
  subido_por    text NOT NULL REFERENCES users(id),
  created_at    timestamp NOT NULL DEFAULT now(),
  archived_at   timestamp,

  CONSTRAINT archivos_un_solo_contenedor CHECK (
    (proyecto_id IS NOT NULL)::int + (tarea_id IS NOT NULL)::int + (pagina_id IS NOT NULL)::int = 1
  )
);

-- Se consulta siempre por contenedor: «los ficheros de este proyecto».
CREATE INDEX IF NOT EXISTS archivos_proyecto_idx ON archivos (proyecto_id) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS archivos_tarea_idx    ON archivos (tarea_id)    WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS archivos_pagina_idx   ON archivos (pagina_id)   WHERE archived_at IS NULL;
