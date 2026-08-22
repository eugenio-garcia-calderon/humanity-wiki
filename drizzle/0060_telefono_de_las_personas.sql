-- ============================================================================
-- EL TELÉFONO DE UNA PERSONA (2026-08-22)
-- ============================================================================
-- Eugenio, en el hormiguero: «crear un sistema para sincronizar los contactos
-- de mi teléfono y poder agregarles a proyectos, y también mandarles mensajes a
-- través de WhatsApp, sea como sea».
--
-- Para las tres cosas hace falta lo mismo y no lo había: el número. Las
-- personas de tu mundo (`game_agents` de tipo «persona») tenían nombre, rol,
-- foto y proyectos, pero ninguna forma de llegar a ellas fuera de aquí.
--
-- SE GUARDA EN LA PERSONA, no en una tabla de contactos aparte. Una lista de
-- contactos separada obligaría a casarla con las personas que ya existen —por
-- nombre, que es justo el dato que se repite— y el día que no casaran tendrías
-- a la misma persona dos veces.
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS telefono text;

-- De dónde salió: escrito a mano, o traído de la agenda del teléfono. Sirve
-- para saber qué se puede volver a importar sin pisar lo que escribiste tú.
ALTER TABLE game_agents ADD COLUMN IF NOT EXISTS telefono_origen text;

-- Para no meter dos veces el mismo contacto: se busca por número dentro de TU
-- mundo. Único por usuario, no global — dos personas distintas pueden tener el
-- mismo contacto en sus mundos, y son suyos.
CREATE UNIQUE INDEX IF NOT EXISTS game_agents_telefono_idx
  ON game_agents (user_id, telefono)
  WHERE telefono IS NOT NULL AND archived_at IS NULL;
