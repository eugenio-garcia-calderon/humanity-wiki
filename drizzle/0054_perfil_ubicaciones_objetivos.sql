-- ============================================================================
-- EL PERFIL: HASTA TRES UBICACIONES Y LOS OBJETIVOS QUE TE IMPORTAN
-- (2026-08-22, Eugenio: «permite añadir hasta 3 ubicaciones en el perfil
-- mediante un selector de ubicaciones» y «permite al usuario escoger entre los
-- 14 objetivos los que más le interesen y aparecerán en su perfil»)
-- ============================================================================
-- DOS COLUMNAS NUEVAS Y NO UNA TABLA DE UNIÓN: son listas cortas —tres y
-- catorce como mucho— que solo se leen con el perfil y nunca al revés. Este
-- proyecto ya tiene 43 tablas de unión; añadir dos más para guardar tres
-- cadenas de texto sería pagar un JOIN en cada perfil por nada.
--
-- `location` (el texto libre de siempre) SE QUEDA: hay perfiles que lo usan y
-- borrarlo sería tirar lo que la gente escribió. `ubicaciones` es la lista
-- nueva, elegida del catálogo real de territorios.

ALTER TABLE users ADD COLUMN IF NOT EXISTS ubicaciones jsonb DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS objetivos   jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN users.ubicaciones IS
  'Hasta 3 territorios elegidos del catálogo: [{"id":"T011","nombre":"Italia"}]. El tope se aplica en el servidor.';
COMMENT ON COLUMN users.objetivos IS
  'Ids de los objetivos que le interesan, del catálogo de 14: ["O001","O009"].';
