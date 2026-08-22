-- TRANSFERENCIAS DE PUNTOS ENTRE PERSONAS (2026-08-22, decisión de Eugenio:
-- «van a ser transferibles» — piloto de ~1000 usuarios, interruptor apagado
-- en producción hasta que él lo encienda).
--
-- No hay tabla nueva: una transferencia son DOS movimientos en el libro que
-- ya existe (`movimientos_puntos`), uno negativo en quien envía y uno
-- positivo en quien recibe, cada uno con la otra persona como entidad
-- (`entidad_tipo = 'user'`, `entidad_id = <la otra cuenta>`). Duplicar el
-- libro en una tabla de transferencias sería tener dos verdades sobre el
-- mismo dinero.
--
-- Postgres no permite ampliar un CHECK: se suelta y se vuelve a poner.
-- `saldo_inicial` es el motivo del apunte de apertura de más abajo.
ALTER TABLE movimientos_puntos DROP CONSTRAINT IF EXISTS movimientos_puntos_motivo_check;
ALTER TABLE movimientos_puntos ADD CONSTRAINT movimientos_puntos_motivo_check CHECK (
  motivo IN (
    'regalo_bienvenida', 'compra', 'vista_publicacion', 'gasto_ia', 'ajuste_admin',
    'transferencia_enviada', 'transferencia_recibida', 'saldo_inicial'
  )
);

-- El saldo no puede quedar negativo por una transferencia. El UPDATE del
-- servidor ya lo comprueba (`WHERE puntos >= cantidad`), pero la base de
-- datos es quien tiene la última palabra: sin esta restricción, un fallo del
-- servidor podría dejar saldos en rojo y el libro no cuadraría con nada.
-- `NOT VALID`: la regla vale para toda escritura NUEVA sin exigir que las
-- filas antiguas ya la cumplan — si alguna cuenta quedó en negativo por el
-- pasado, la migración no revienta; esa cuenta simplemente no podrá enviar.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_puntos_no_negativos;
ALTER TABLE users ADD CONSTRAINT users_puntos_no_negativos CHECK (puntos >= 0) NOT VALID;

-- EL APUNTE DE APERTURA: el libro tiene que empezar cuadrado. A partir de
-- aquí el saldo se deriva del libro (cuadre nocturno del servidor), así que
-- toda diferencia HOY entre la columna `users.puntos` y la suma del libro
-- se anota como apertura — el 100 del DEFAULT en cuentas creadas por SQL
-- directo sin justificante, un ajuste antiguo sin apunte, lo que sea. Con
-- esto el primer cuadre da cero descuadres POR CONSTRUCCIÓN, y el saldo de
-- nadie cambia por estrenar el cuadre (revisión de prog4: un respaldo de
-- 100 fijo habría reescrito el dinero de cualquier cuenta distinta de 100).
INSERT INTO movimientos_puntos (id, user_id, cantidad, motivo)
SELECT 'MPAPERTURA' || u.id, u.id, u.puntos - coalesce(m.suma, 0), 'saldo_inicial'
FROM users u
LEFT JOIN (
  SELECT user_id, sum(cantidad) AS suma FROM movimientos_puntos GROUP BY user_id
) m ON m.user_id = u.id
WHERE abs(u.puntos - coalesce(m.suma, 0)) >= 0.005;
