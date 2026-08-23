-- ============================================================================
-- 0097 — El freno de los límites deja de vivir en un solo proceso (2026-08-23)
-- ============================================================================
-- El freno de `src/server/limites/` era un `Map` en memoria. Con un proceso
-- funciona; el día que el trabajo se reparta entre los ocho núcleos de la
-- máquina pasan a ser OCHO FRENOS INDEPENDIENTES y el límite real se multiplica
-- por ocho — en silencio, sin un error, sin una línea en el registro.
--
-- Esto lo arregla ANTES de que ocurra, que es la única forma de arreglarlo:
-- después no se nota. Estaba escrito como deuda en `limites/CLAUDE.md` y en el
-- tablero de servidores desde que se escribió el módulo.
--
-- ── QUÉ CAMBIA ADEMÁS, Y ES A FAVOR ────────────────────────────────────────
-- Hasta hoy, reiniciar el servidor borraba todos los frenos: un despliegue le
-- regalaba a quien estuviera probando contraseñas empezar de cero. Ahora no.
-- El coste es una consulta por intento en las puertas de entrada, que son las
-- rutas menos transitadas de la plataforma.
--
-- ── LO QUE NO ES ESTA TABLA ────────────────────────────────────────────────
-- No es el rastro. `intentos_fallidos` guarda lo que pasó y no se limpia nunca;
-- esto guarda cuánto hay que esperar AHORA y se borra sola. Son dos verdades
-- distintas y por eso son dos tablas: si fueran una, limpiar el freno borraría
-- la prueba del ataque.
CREATE TABLE IF NOT EXISTS frenos (
  -- `puerta:tipo:valor` — p. ej. `login:cuenta:ana@x.com` o `login:ip:1.2.3.4`.
  clave       text PRIMARY KEY,
  fallos      int NOT NULL DEFAULT 0,
  -- Hasta cuándo hay que esperar. Nulo mientras se está dentro del margen de
  -- gracia: hay fallos contados pero todavía no se frena a nadie.
  hasta       timestamptz,
  actualizado timestamptz NOT NULL DEFAULT now()
);

-- Para el barrido de las que ya no frenan a nadie. Sin él, esta tabla crecería
-- con la IP de todo el que se equivocó una vez hace tres meses.
CREATE INDEX IF NOT EXISTS frenos_actualizado_idx ON frenos (actualizado);
