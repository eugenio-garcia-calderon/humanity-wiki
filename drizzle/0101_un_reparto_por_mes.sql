-- UN REPARTO POR MES Y PERSONA, GARANTIZADO POR LA BASE DE DATOS (2026-08-23,
-- revisión de prog6 sobre la 0100: «si "una sola vez por mes" es disciplina y
-- no una restricción de la base de datos, el primer doble clic emite 2.000»).
--
-- La ruta ya comprobaba el mes dentro de la transacción, pero dos
-- transacciones simultáneas pueden pasar las dos esa comprobación antes de
-- que ninguna escriba. Un índice ÚNICO parcial sobre (mes, persona) para los
-- apuntes de reparto cierra esa ventana sin que nadie tenga que acordarse: la
-- segunda escritura falla sola y su transacción entera se deshace.
CREATE UNIQUE INDEX IF NOT EXISTS movimientos_puntos_un_reparto_por_mes
  ON movimientos_puntos (entidad_id, user_id)
  WHERE motivo = 'reparto_mensual' AND entidad_tipo = 'reparto';
