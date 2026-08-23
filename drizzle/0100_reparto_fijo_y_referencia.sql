-- REPARTO MENSUAL FIJO Y PRECIO DE REFERENCIA (2026-08-23, Eugenio: «el
-- reparto mensual, al principio de manera fija, repartiendo X puntos por mes:
-- que esos puntos sean 1000, y que la relación sea que correr el modelo más
-- barato con una tarea simple valga 1 punto, y eso ponga el valor de
-- referencia para el resto»).
--
-- 1. El motivo del apunte del reparto. El reparto EMITE puntos nuevos (no
--    salen de nadie): por eso solo hay apuntes positivos, uno por persona y
--    mes, con el mes como entidad (`entidad_tipo = 'reparto'`, `entidad_id =
--    'YYYY-MM'`). Con eso, «¿ya se repartió agosto?» es una consulta, y
--    repetirlo es imposible por construcción.
ALTER TABLE movimientos_puntos DROP CONSTRAINT IF EXISTS movimientos_puntos_motivo_check;
ALTER TABLE movimientos_puntos ADD CONSTRAINT movimientos_puntos_motivo_check CHECK (
  motivo IN (
    'regalo_bienvenida', 'compra', 'vista_publicacion', 'gasto_ia', 'ajuste_admin',
    'transferencia_enviada', 'transferencia_recibida', 'saldo_inicial', 'gasto_servicio',
    'compra_con_puntos', 'venta_en_puntos', 'comision_puntos', 'devolucion_puntos',
    'reparto_mensual'
  )
);

-- 2. El precio de referencia: UNA TAREA SIMPLE CON EL MODELO DE IA MÁS BARATO
--    = 1 PUNTO. El resto de la cesta se expresa como múltiplo de esa unidad,
--    derivado del coste relativo público de cada recurso (orientativo, como
--    todos: cada servicio se revisa publicando una fila nueva cuando empiece a
--    cobrar de verdad). La historia de precios es de solo-añadir: las filas
--    anteriores siguen ahí con su fecha.
INSERT INTO tokenomics_precios (id, servicio, nombre, unidad, puntos, nota)
VALUES
  ('TP1_IA_SIMPLE',      'ia_tarea_simple',       'IA: una tarea simple con el modelo más barato', '1 tarea simple (modelo básico)', 1.0000,  'Unidad de referencia de la cesta (decisión del emisor, 2026-08-23): 1 punto.'),
  ('TP1_IA_AVANZADA',    'ia_tarea_avanzada',     'IA: una tarea con un modelo avanzado',           '1 tarea (modelo avanzado)',      20.0000, 'Orientativo: unas 20 veces el coste por token del modelo básico.'),
  ('TP1_ALMACENAMIENTO', 'almacenamiento_gb_mes', 'Almacenamiento en la nube',                      '1 GB durante un mes',             5.0000,  'Orientativo: derivado del coste relativo frente a la tarea simple. El cobro real aún no está encendido.'),
  ('TP1_COMPUTO',        'computo_hora',          'Procesamiento en la nube',                       '1 hora de cómputo medio',         25.0000, 'Orientativo: derivado del coste relativo frente a la tarea simple. El cobro real aún no está encendido.'),
  -- El servicio antiguo «ia_accion_estandar» (0,05) queda RETIRADO: la unidad
  -- es ahora `ia_tarea_simple`. No se borra (la historia es de solo-añadir):
  -- se publica una fila cuyo nombre empieza por RETIRADO y la API deja de
  -- enseñarla entre los vigentes.
  ('TP1_RETIRA_IA_EST',  'ia_accion_estandar',    'RETIRADO: sustituido por ia_tarea_simple',       '—',                               0.0001,  'RETIRADO el 2026-08-23: la unidad de referencia pasa a ser ia_tarea_simple (1 punto).')
ON CONFLICT (id) DO NOTHING;
