-- LA CESTA DE SERVICIO CON PRECIO PUBLICADO (2026-08-22, Eugenio: «crea el
-- sistema para que podamos arrancar a usar un sistema de puntos bien
-- diseñado que cuando tengamos lo del MiCA solo haya que hacer algún
-- pequeño ajuste»)
--
-- La pieza que convierte «1 punto = 1 €» (dinero electrónico, licencia) en
-- «1 punto = lo que compra» (token de utilidad): una tabla de precios en
-- puntos por unidad de servicio, PÚBLICA por API y CON HISTORIA. Un precio
-- nunca se edita: cambiar un precio es INSERTAR una fila nueva con su
-- `vigente_desde`, y el vigente es el más reciente. Así cualquiera puede
-- verificar qué compraba un punto en cualquier fecha — que es exactamente lo
-- que un libro blanco tiene que poder citar y un regulador preguntar.
CREATE TABLE IF NOT EXISTS tokenomics_precios (
  id            text PRIMARY KEY,
  servicio      text NOT NULL,             -- clave estable: 'almacenamiento_gb_mes', …
  nombre        text NOT NULL,             -- para personas: 'Almacenamiento en la nube'
  unidad        text NOT NULL,             -- '1 GB durante un mes', '1 hora de cómputo', …
  puntos        numeric(12,4) NOT NULL CHECK (puntos > 0),  -- puntos por unidad
  nota          text,                      -- 'orientativo hasta que el servicio cobre', …
  vigente_desde timestamp NOT NULL DEFAULT now(),
  actor         text                       -- quién publicó este precio (user id), NULL = migración
);
CREATE INDEX IF NOT EXISTS tokenomics_precios_servicio_idx ON tokenomics_precios (servicio, vigente_desde DESC);

-- El mismo candado que el libro de movimientos (0074): la historia de
-- precios es de solo-añadir, con su propio mensaje para que el error diga la
-- verdad de ESTA tabla.
CREATE OR REPLACE FUNCTION tokenomics_precios_solo_anadir() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'tokenomics_precios es de solo-añadir: cambiar un precio es publicar una fila nueva, nunca editar o borrar la historia.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tokenomics_precios_inmutables ON tokenomics_precios;
CREATE TRIGGER tokenomics_precios_inmutables
  BEFORE UPDATE OR DELETE ON tokenomics_precios
  FOR EACH ROW EXECUTE FUNCTION tokenomics_precios_solo_anadir();
DROP TRIGGER IF EXISTS tokenomics_precios_sin_truncate ON tokenomics_precios;
CREATE TRIGGER tokenomics_precios_sin_truncate
  BEFORE TRUNCATE ON tokenomics_precios
  FOR EACH STATEMENT EXECUTE FUNCTION tokenomics_precios_solo_anadir();

-- Los precios de partida, los mismos que la página /tokenomics declara como
-- orientativos. Nacen aquí para que la API tenga qué publicar desde el
-- primer día; cuando cada servicio empiece a cobrar de verdad, el precio
-- vigente se revisa publicando una fila nueva (decisión del emisor).
INSERT INTO tokenomics_precios (id, servicio, nombre, unidad, puntos, nota)
VALUES
  ('TP0_ALMACENAMIENTO', 'almacenamiento_gb_mes', 'Almacenamiento en la nube', '1 GB durante un mes', 0.1000, 'Orientativo: el cobro real de este servicio aún no está encendido.'),
  ('TP0_COMPUTO',        'computo_hora',          'Procesamiento en la nube',  '1 hora de cómputo medio', 1.0000, 'Orientativo: el cobro real de este servicio aún no está encendido.'),
  ('TP0_IA_ESTANDAR',    'ia_accion_estandar',    'Modelos de IA (acción estándar)', '1 acción asistida con el modelo estándar', 0.0500, 'Orientativo: el cobro real de este servicio aún no está encendido.')
ON CONFLICT (id) DO NOTHING;

-- Y el motivo con el que la puerta única de gasto (`cobrarServicio`) anota
-- cualquier cobro de servicio en el libro — la clave del servicio viaja en
-- `entidad_tipo`. Se amplía el CHECK aquí porque esta migración es la que
-- estrena el gasto por servicios.
ALTER TABLE movimientos_puntos DROP CONSTRAINT IF EXISTS movimientos_puntos_motivo_check;
ALTER TABLE movimientos_puntos ADD CONSTRAINT movimientos_puntos_motivo_check CHECK (
  motivo IN (
    'regalo_bienvenida', 'compra', 'vista_publicacion', 'gasto_ia', 'ajuste_admin',
    'transferencia_enviada', 'transferencia_recibida', 'saldo_inicial', 'gasto_servicio'
  )
);
