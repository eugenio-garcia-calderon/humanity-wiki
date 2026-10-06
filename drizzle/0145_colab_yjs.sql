-- 2026-10-06 (carril colab). Edición colaborativa en tiempo real con Yjs.
--
-- Dos tablas, una idea: el documento Yjs de una página (su estado binario) se
-- guarda aquí; la COPIA LEGIBLE sigue siendo `knowledge_windows.config.bloques`,
-- que se deriva de él (ver la cabecera de `src/server/colabServidor.ts`). Si
-- estas tablas se borran no se pierde ninguna página: el documento se vuelve a
-- construir desde `config.bloques` la próxima vez que alguien la abra.
--
--   pagina_yjs              el estado COMPACTADO (una fila por página)
--   pagina_yjs_actualiz     el registro de lo que ha pasado DESDE esa compactación
--
-- Guardar el estado entero tras cada tecla reescribiría cientos de KB por
-- pulsación; añadir sólo la actualización (decenas de bytes) y compactar de
-- vez en cuando (al pasar de 50 filas o 256 KB, o al cerrarse la sala) es lo
-- que hace y recomienda la propia gente de Yjs.
CREATE TABLE IF NOT EXISTS pagina_yjs (
  pagina_id        text PRIMARY KEY REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  estado           bytea       NOT NULL,
  -- La `knowledge_windows.version` con la que el documento y `config.bloques`
  -- dicen lo mismo. Si la página tiene una versión MAYOR, alguien escribió
  -- `config` por fuera de Yjs (la IA, la API, restaurar una versión…) y hay
  -- que reconciliar al abrirla.
  version_derivada integer     NOT NULL DEFAULT 0,
  bytes            integer     NOT NULL DEFAULT 0,
  compactado_en    timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagina_yjs_actualiz (
  id         bigserial PRIMARY KEY,
  pagina_id  text        NOT NULL REFERENCES knowledge_windows(id) ON DELETE CASCADE,
  actualiz   bytea       NOT NULL,
  -- Quién la envió (para atribuir el guardado). Sin clave foránea a propósito:
  -- borrar a una persona no debe tocar el registro de edición de una página.
  autor_id   text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Clave foránea con su índice, y en el orden en que se lee: «todo lo de esta
-- página desde la actualización N».
CREATE INDEX IF NOT EXISTS idx_pagina_yjs_actualiz_pagina ON pagina_yjs_actualiz (pagina_id, id);
