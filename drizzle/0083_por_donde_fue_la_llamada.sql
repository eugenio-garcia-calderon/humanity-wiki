-- ============================================================================
-- POR DÓNDE FUE CADA LLAMADA (2026-08-22)
-- ============================================================================
-- Con el TURN de Cloudflare enchufado, una llamada puede ir por tres caminos y
-- **solo uno de los tres cuesta dinero**. Esta columna dice cuál fue.
--
-- No es telemetría por curiosidad: es la única forma de saber lo que va a
-- costar el mes que viene ANTES de que llegue la factura, y de comprobar que
-- la escalera funciona. Si el 80 % de las llamadas saliera «retransmitida»,
-- algo está mal —lo normal es entre un 10 % y un 15 %— y sin esta columna eso
-- solo se descubre pagando.
--
--   local          los dos en la misma red. Ni STUN ni nada. Gratis
--   directo        redes distintas, conexión directa de navegador a navegador.
--                  STUN solo dijo «tu dirección pública es esta». Gratis
--   retransmitida  no había camino directo y el audio pasó por Cloudflare.
--                  ESTE es el que se paga: 0,05 $/GB después de 1.000 GB
--   desconocido    la llamada acabó antes de poder mirarlo, o el navegador no
--                  quiso decirlo. Se distingue de NULL a propósito: NULL es
--                  «esta llamada es anterior a que existiera esta columna»
--
-- NO SE GUARDA NINGUNA DIRECCIÓN IP. El navegador sabe por qué dirección fue
-- la llamada y aquí solo se apunta el TIPO de camino. Guardar la IP sería
-- guardar dónde estaba cada persona, y para calcular una factura no hace falta
-- saber desde dónde llamó nadie.
ALTER TABLE llamadas ADD COLUMN IF NOT EXISTS via text;

DO $$ BEGIN
  ALTER TABLE llamadas ADD CONSTRAINT llamadas_via_valores
    CHECK (via IS NULL OR via IN ('local', 'directo', 'retransmitida', 'desconocido')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Para la cuenta del mes: «cuántas se retransmitieron y cuánto duraron».
-- Índice parcial porque las retransmitidas van a ser una de cada diez.
CREATE INDEX IF NOT EXISTS llamadas_retransmitidas_idx
  ON llamadas (creada_at DESC) WHERE via = 'retransmitida';
