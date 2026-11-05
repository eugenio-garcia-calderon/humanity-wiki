-- 2026-11-05 (Eugenio): «un apartado de otros velomóviles… y que permita crear
-- otros modelos 3D en base a otras fotos que se vayan cargando».
--
-- Los velomóviles de catálogo (AeroRider, Quatrevelo) viven en el código
-- (`src/components/aeromovil/referencias.ts`). Aquí se guardan los que alguien
-- crea desde sus fotos: `datos` es la silueta ya recortada (perfil lateral,
-- media anchura en planta, ruedas y medidas), nunca la foto. La foto no sale
-- del navegador de quien la sube.
--
-- Misma regla que los diseños (0167): crear, cualquiera con freno; quitar,
-- quien lo creó (cuenta o clave de su navegador, guardada solo como huella
-- SHA-256) o el dueño del Aeromóvil. Quitar es archivar.
CREATE TABLE IF NOT EXISTS aeromovil_referencias (
  id          serial PRIMARY KEY,
  nombre      text    NOT NULL,
  datos       jsonb   NOT NULL,
  autor       text,
  clave_hash  text,
  created_by  text    REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS aeromovil_referencias_vivas_idx ON aeromovil_referencias(created_at DESC) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS aeromovil_referencias_created_by_idx ON aeromovil_referencias(created_by);
