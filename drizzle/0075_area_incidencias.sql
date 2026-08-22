-- ============================================================================
-- 0075 — El Hormiguero deja de ser dos tableros en uno (2026-08-22, prog6)
-- ============================================================================
-- Eugenio, hoy: «hay cuatro cosas de seguridad en el hormiguero, cuando
-- termines de hacer el kanban de seguridad propio traslada ahí esas cuestiones
-- para limpiar el hormiguero, que es un tema para el público».
--
-- El Hormiguero lo lee cualquiera: es donde la gente de fuera cuenta lo que se
-- le rompe. Cuatro notas abiertas ahí decían, en texto llano, que el login no
-- tiene límite de intentos y que la aplicación entra a la base de datos como
-- superusuario. Eso es un mapa para quien quiera aprovecharlo, publicado en la
-- página que más se mira.
--
-- POR QUÉ UNA COLUMNA Y NO UNA TABLA NUEVA: la maquinaria del Hormiguero ya
-- resuelve estados, adjuntos, permisos, el token de los programadores IA y el
-- archivado. Un tablero paralelo sería una segunda lista que nadie mira — y
-- las notas de seguridad son justo las que no pueden acabar en una lista que
-- nadie mira.
--
-- 'general' por defecto: las 16 notas que ya existen se quedan exactamente
-- donde estaban. El traslado de las cuatro se hace aparte y a mano, para que
-- quede en el registro qué se movió y por qué.
ALTER TABLE incidencias
  ADD COLUMN IF NOT EXISTS area text NOT NULL DEFAULT 'general';

-- Las dos consultas del tablero filtran por aquí y ordenan por fecha, así que
-- el índice cubre las dos. Son 16 filas hoy y el índice no se nota; se pone
-- ahora porque añadirlo después de que el tablero tenga tres años de notas es
-- cuando duele.
CREATE INDEX IF NOT EXISTS incidencias_area_idx
  ON incidencias (area, created_at DESC);
