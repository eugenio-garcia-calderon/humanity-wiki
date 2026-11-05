-- 2026-11-05 (Eugenio): «permite guardar configuraciones de los parámetros y
-- tener varios diseños con varias configuraciones, para no perderlas cuando se
-- recarga la página o cuando se quiere empezar un nuevo diseño. Que esos
-- diseños estén en el menú».
--
-- Un diseño = un nombre y el juego completo de parámetros del visor
-- (`src/components/aeromovil/geometria.ts`), en un jsonb. Se guarda el
-- parámetro, no el resultado: el visor, los planos y el STEP se recalculan a
-- partir de él, así un diseño viejo se beneficia de cada mejora del modelo.
--
-- ── QUIÉN PUEDE QUÉ ─────────────────────────────────────────────────────
-- Guardar uno nuevo: cualquiera, sin cuenta (con freno). Cambiarlo o quitarlo:
-- el dueño del Aeromóvil, un administrador, o quien lo creó desde ese mismo
-- navegador, que recibe una clave al crearlo. De la clave solo se guarda su
-- huella SHA-256: en la copia de seguridad no viaja nada que sirva para editar.
-- Quitar es archivar (`archived_at`), nunca borrar.
CREATE TABLE IF NOT EXISTS aeromovil_disenos (
  id          serial PRIMARY KEY,
  nombre      text    NOT NULL,
  parametros  jsonb   NOT NULL,
  autor       text,
  origen      text    NOT NULL DEFAULT 'visitante' CHECK (origen IN ('visitante', 'equipo')),
  clave_hash  text,
  created_by  text    REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS aeromovil_disenos_vivos_idx ON aeromovil_disenos(updated_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS aeromovil_disenos_created_by_idx ON aeromovil_disenos(created_by);

-- El diseño de partida: el que se publicó el 2026-11-05. Parámetros vacíos =
-- «los de por defecto del visor», así sigue siendo el de partida aunque cambien.
INSERT INTO aeromovil_disenos (nombre, parametros, autor, origen)
SELECT 'Gota base (por defecto)', '{}'::jsonb, 'Equipo', 'equipo'
WHERE NOT EXISTS (SELECT 1 FROM aeromovil_disenos WHERE origen = 'equipo');
