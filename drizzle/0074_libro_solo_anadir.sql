-- EL LIBRO DE PUNTOS ES DE SOLO-AÑADIR (2026-08-22, acuerdo prog7/prog4:
-- «un libro, un sello» — el libro es la verdad, el registro sellado de
-- seguridad es la prueba. Para que el sello valga algo, el libro no puede
-- editarse: una corrección es un apunte contrario, nunca una edición).
--
-- Se hace cumplir con DISPARADORES y no con permisos de rol, porque en los
-- despliegues actuales la aplicación se conecta con el usuario administrador
-- de la base: un REVOKE a ese rol o no ata o se lo puede devolver él mismo.
-- (Un superusuario puede tirar los disparadores, y ESO es exactamente lo que
-- el registro sellado de prog4 deja anotado.)
CREATE OR REPLACE FUNCTION movimientos_puntos_solo_anadir() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'movimientos_puntos es de solo-añadir: una corrección es un apunte contrario (otorgarPuntos con signo opuesto), nunca una edición.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS movimientos_puntos_inmutables ON movimientos_puntos;
CREATE TRIGGER movimientos_puntos_inmutables
  BEFORE UPDATE OR DELETE ON movimientos_puntos
  FOR EACH ROW EXECUTE FUNCTION movimientos_puntos_solo_anadir();

-- TRUNCATE NO PASA POR LOS DISPARADORES DE FILA: tira la tabla entera sin
-- recorrer filas, así que el de arriba no saltaría. Hace falta uno de
-- sentencia (revisión de prog4 — el mismo hueco existía en su registro
-- sellado y lo tapó al leer este fichero).
DROP TRIGGER IF EXISTS movimientos_puntos_sin_truncate ON movimientos_puntos;
CREATE TRIGGER movimientos_puntos_sin_truncate
  BEFORE TRUNCATE ON movimientos_puntos
  FOR EACH STATEMENT EXECUTE FUNCTION movimientos_puntos_solo_anadir();
