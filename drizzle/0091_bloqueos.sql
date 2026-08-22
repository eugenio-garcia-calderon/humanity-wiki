-- ===========================================================================
-- BLOQUEAR A UNA PERSONA (2026-08-22)
-- ===========================================================================
-- Último requisito de Apple que dependía de nosotros. La App Store rechaza una
-- aplicación con contenido de otras personas que no deje **bloquear a alguien**
-- además de denunciar contenido: denunciar es sobre una cosa, bloquear es sobre
-- una persona, y quien está siendo molestado necesita lo segundo.
--
-- EN LOS DOS SENTIDOS, y esto es lo que Apple comprueba. No basta con que yo
-- deje de ver lo suyo: él tampoco puede ver lo mío, ni seguirme, ni comentarme.
-- Una tabla con una sola fila describe las dos direcciones, y por eso el
-- predicado de abajo mira los dos órdenes.
--
-- EN SILENCIO. No hay campo de aviso ni notificación, a propósito. Avisar a
-- quien bloqueas convierte el bloqueo en una provocación, que es justo de lo que
-- huye quien lo pulsa.

CREATE TABLE IF NOT EXISTS bloqueos (
  id           serial PRIMARY KEY,
  -- Quien bloquea.
  usuario_id   text NOT NULL REFERENCES users(id),
  -- A quién bloquea.
  bloqueado_id text NOT NULL REFERENCES users(id),
  created_at   timestamp NOT NULL DEFAULT now(),
  -- Bloquear dos veces a la misma persona es la misma cosa, no dos.
  CONSTRAINT bloqueos_unicos UNIQUE (usuario_id, bloqueado_id),
  -- Bloquearse a uno mismo no significa nada y rompería el propio muro.
  CONSTRAINT bloqueos_no_a_uno_mismo CHECK (usuario_id <> bloqueado_id)
);

-- Los dos sentidos de la búsqueda, porque el filtro pregunta por los dos.
CREATE INDEX IF NOT EXISTS bloqueos_usuario_idx   ON bloqueos (usuario_id);
CREATE INDEX IF NOT EXISTS bloqueos_bloqueado_idx ON bloqueos (bloqueado_id);

-- ---------------------------------------------------------------------------
-- UN SOLO SITIO DONDE VIVE LA REGLA
-- ---------------------------------------------------------------------------
-- La alternativa era repetir un `NOT IN (SELECT …)` en el muro, en las
-- publicaciones, en los comentarios, en los lienzos, en los proyectos y en las
-- personas. **Cinco copias de una regla son cinco sitios donde olvidarla** — y
-- así es exactamente como un bloqueo acaba filtrando el muro y no los
-- comentarios, que desde fuera se lee como que el bloqueo no funciona.
--
-- (La idea es del agente que lleva la parte económica del servidor, que la
-- ofreció sin que se la pidiéramos.)
--
-- Con esta función, cada consulta añade una línea y todas dicen lo mismo:
--
--     AND NOT bloqueado_entre(${yo}, p.autor_user_id)
--
-- STABLE: dentro de una misma consulta el resultado no cambia, así que el
-- planificador puede llamarla una vez por fila en vez de una vez por
-- comparación. No es IMMUTABLE porque lee una tabla que sí cambia entre
-- consultas.
CREATE OR REPLACE FUNCTION bloqueado_entre(a text, b text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM bloqueos
     WHERE (usuario_id = a AND bloqueado_id = b)
        OR (usuario_id = b AND bloqueado_id = a)
  );
$$;

-- ---------------------------------------------------------------------------
-- BLOQUEAR ROMPE EL SEGUIMIENTO, EN LOS DOS SENTIDOS
-- ---------------------------------------------------------------------------
-- Si no, quien bloqueas te sigue apareciendo como seguidor y tú en su lista.
-- El bloqueo es la decisión más fuerte de las dos, así que gana.
CREATE OR REPLACE FUNCTION bloqueo_rompe_seguimiento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- `follows` es POLIMÓRFICA: no tiene `following_user_id`. Se sigue a
  -- cualquier cosa con `(entity_type, entity_id)`, y una persona es
  -- `entity_type = 'users'` (comprobado en `social.ts:415`, no supuesto —
  -- la primera versión de este disparador usaba una columna inexistente).
  DELETE FROM follows
   WHERE entity_type = 'users'
     AND ( (follower_user_id = NEW.usuario_id   AND entity_id = NEW.bloqueado_id)
        OR (follower_user_id = NEW.bloqueado_id AND entity_id = NEW.usuario_id) );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bloqueos_rompen_seguimiento ON bloqueos;
CREATE TRIGGER bloqueos_rompen_seguimiento
  AFTER INSERT ON bloqueos
  FOR EACH ROW EXECUTE FUNCTION bloqueo_rompe_seguimiento();
