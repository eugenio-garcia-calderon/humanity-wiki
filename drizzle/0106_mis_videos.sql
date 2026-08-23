-- ============================================================================
-- TUS VÍDEOS DE YOUTUBE, PINTADOS AQUÍ (2026-08-23) — fase 3 de 5
-- ============================================================================
-- Eugenio: «poder acceder de manera segura a tus correos y vídeos guardados de
-- YouTube etc, pero los pintaremos a nuestra manera».
--
-- ── POR QUÉ HAY COPIA LOCAL, Y QUÉ CUESTA ───────────────────────────────────
-- Decisión de Eugenio el 2026-08-23, preguntado expresamente: «guardarlos para
-- ir rápido». La alternativa era pedírselos a Google cada vez que se abre la
-- pantalla, que no guarda nada de nadie pero tarda un segundo largo en cada
-- visita y deja la pantalla en blanco cuando Google va lento.
--
-- Lo que cuesta, dicho aquí para que conste: **estas filas salen del servidor
-- cada noche en la copia de seguridad.** Son títulos de vídeos, no correos, así
-- que el daño de una filtración es «se sabe qué ves en YouTube» — real, y muy
-- por debajo de lo que sería con el correo. Por eso el correo no se guarda y
-- esto sí.
--
-- ── NO ES UNA CACHÉ, ES UNA COPIA CON FECHA ─────────────────────────────────
-- `visto_at` dice cuándo se trajo de Google. La pantalla lo enseña —«al día
-- hace 3 minutos»— en vez de fingir que lo que ves es lo que hay ahora mismo en
-- tu cuenta. Un listado viejo que se presenta como actual es la forma más
-- barata de que alguien crea que ha perdido un vídeo.
CREATE TABLE IF NOT EXISTS videos_guardados (
  -- La misma persona puede tener el mismo vídeo por dos motivos: le dio a «me
  -- gusta» Y está en una lista suya. Son dos filas y las dos son ciertas.
  id           bigserial PRIMARY KEY,
  user_id      text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id     text NOT NULL,
  titulo       text NOT NULL,
  canal        text,
  miniatura    text,
  -- ISO 8601 tal como lo da YouTube (PT4M13S). Se guarda crudo y se traduce al
  -- pintarlo: convertirlo aquí obligaría a una migración el día que YouTube
  -- añada un formato nuevo.
  duracion     text,
  publicado_at timestamptz,
  /** De dónde salió: 'gusta' | 'lista' | 'suscripcion'. */
  origen       text NOT NULL,
  lista_id     text,
  lista_nombre text,
  visto_at     timestamptz NOT NULL DEFAULT now()
);

-- Un vídeo, un motivo, una persona. Sin esto, cada sincronización duplicaría
-- toda la lista en vez de ponerla al día.
CREATE UNIQUE INDEX IF NOT EXISTS videos_guardados_unico_idx
  ON videos_guardados (user_id, video_id, origen, coalesce(lista_id, ''));

-- La consulta de la pantalla: los míos, los más nuevos primero.
CREATE INDEX IF NOT EXISTS videos_guardados_persona_idx
  ON videos_guardados (user_id, publicado_at DESC NULLS LAST);
