-- ============================================================================
-- EL HORMIGUERO: LO QUE FALLA Y LO QUE FALTA (2026-08-22)
-- ============================================================================
-- Eugenio: «crea un botón que sea de una hormiga en el menú superior junto a
-- las notificaciones, y ahí permite al usuario crear tareas para el equipo de
-- desarrollo de la APP […] las tareas que vayas haciendo las marcarás con un
-- punto verde, y las que estén esperando estarán en rojo, y las que necesiten
-- una atención humana las pondrás en naranja y dirás qué te hace falta».
--
-- ES UNA TABLA PROPIA Y NO `roadmap_items`. Las tareas de un proyecto son del
-- usuario y viven en su tablero; esto es el canal entre él y quien programa, y
-- mezclarlos haría que sus tareas de trabajo y los fallos de la aplicación
-- compitieran por el mismo sitio.
--
-- TRES ESTADOS Y NO CUATRO. Rojo esperando, naranja bloqueado por una persona,
-- verde hecho. No hay «en curso» a propósito: desde fuera, algo empezado y algo
-- por empezar son lo mismo —no está—, y un estado más solo sirve para que
-- parezca que se avanza.
CREATE TABLE IF NOT EXISTS incidencias (
  id            text PRIMARY KEY,
  titulo        text NOT NULL,
  detalle       text,
  -- 'fallo' | 'mejora'
  clase         text NOT NULL DEFAULT 'fallo',
  -- 'esperando' (rojo) | 'bloqueada' (naranja) | 'hecha' (verde)
  estado        text NOT NULL DEFAULT 'esperando',
  -- QUÉ HACE FALTA cuando está bloqueada. Sin esto, el naranja diría «te
  -- necesito» y no para qué, que es justo lo que hay que saber.
  necesita      text,
  -- Lo que respondió quien programa. Es un canal de ida y vuelta, no un buzón.
  respuesta     text,
  autor_user_id text REFERENCES users(id),
  created_at    timestamp DEFAULT now(),
  updated_at    timestamp DEFAULT now(),
  archived_at   timestamp
);

CREATE INDEX IF NOT EXISTS incidencias_estado_idx ON incidencias (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS incidencias_autor_idx  ON incidencias (autor_user_id);
