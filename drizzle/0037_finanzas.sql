-- ============================================================================
-- FINANZAS DEL JUEGO VITAL (2026-08-19, fase 10, petición de Eugenio: «un
-- sistema de dinero a lo Grand Theft Auto donde uno pueda ver los recursos que
-- tiene; un sistema donde pueda establecer objetivos financieros y de
-- adquisiciones; y ver el cómputo total de necesidades económicas de cada
-- proyecto, con su presupuesto para los próximos años»).
--
-- Tres tablas, una por cada cosa que pidió:
--   game_finanzas          — lo que TIENES (efectivo, banco, ingresos, gastos)
--   objetivos_financieros  — lo que QUIERES (ahorrar, comprar algo, facturar)
--   presupuestos_proyecto  — lo que CUESTA cada proyecto, año a año
-- ============================================================================

-- 1. Los recursos del jugador. Una fila por persona.
CREATE TABLE IF NOT EXISTS game_finanzas (
  user_id        text PRIMARY KEY,
  efectivo       numeric(14,2) NOT NULL DEFAULT 0,
  banco          numeric(14,2) NOT NULL DEFAULT 0,
  ingresos_mes   numeric(14,2) NOT NULL DEFAULT 0,
  gastos_mes     numeric(14,2) NOT NULL DEFAULT 0,
  moneda         text NOT NULL DEFAULT 'EUR',
  actualizado_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Objetivos: ahorrar una cantidad, comprar algo o llegar a un ingreso.
CREATE TABLE IF NOT EXISTS objetivos_financieros (
  id           text PRIMARY KEY,
  user_id      text NOT NULL,
  titulo       text NOT NULL,
  -- ahorro | adquisicion | ingreso
  tipo         text NOT NULL DEFAULT 'ahorro',
  objetivo     numeric(14,2) NOT NULL,
  acumulado    numeric(14,2) NOT NULL DEFAULT 0,
  fecha_limite date,
  -- Un objetivo puede colgar de un proyecto (comprar la furgoneta DEL proyecto)
  proyecto_id  text,
  nota         text,
  creado_at    timestamptz NOT NULL DEFAULT now(),
  archived_at  timestamptz
);
CREATE INDEX IF NOT EXISTS idx_objetivos_fin_user ON objetivos_financieros(user_id) WHERE archived_at IS NULL;

-- 3. El presupuesto de cada proyecto, línea a línea y año a año.
CREATE TABLE IF NOT EXISTS presupuestos_proyecto (
  id          text PRIMARY KEY,
  proyecto_id text NOT NULL,
  anio        integer NOT NULL,
  concepto    text NOT NULL,
  importe     numeric(14,2) NOT NULL,
  -- gasto | ingreso: un proyecto también puede facturar
  tipo        text NOT NULL DEFAULT 'gasto',
  nota        text,
  creado_by   text,
  creado_at   timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_presu_proyecto ON presupuestos_proyecto(proyecto_id, anio) WHERE archived_at IS NULL;
