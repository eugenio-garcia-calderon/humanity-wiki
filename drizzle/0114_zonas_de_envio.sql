-- ============================================================================
-- 0114 — Zonas de envío y recogida en persona (2026-08-24, comercio F8)
-- ============================================================================
-- Eugenio (24-08), a «¿se vende fuera de España?»: zonas de envío CON precios
-- distintos, y además recogida en persona. Hasta hoy había una sola tarifa por
-- producto, igual para el pueblo de al lado que para Alemania: o se perdía
-- dinero en los envíos lejos, o se cobraba de más a los de cerca.
--
-- LAS ZONAS, y por qué estas cuatro:
--   · `peninsula`         España peninsular.
--   · `no_peninsular`     Baleares, Canarias, Ceuta y Melilla. Van juntas
--                         porque para un transportista son el mismo problema
--                         (barco o avión) y porque el vendedor de una aldea no
--                         tiene por qué saber distinguirlas en un formulario.
--   · `europa`            Unión Europea (la lista vive en el servidor, en un
--                         solo sitio, para poder corregirla sin migrar).
--   · `resto`             Todo lo demás.
-- La zona se deduce del país y del código postal del DESTINO, nunca se elige a
-- mano: elegirla a mano es invitar a pagar el porte barato y pedir el envío
-- caro.
CREATE TABLE IF NOT EXISTS producto_envio_zonas (
  producto_id            text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  zona                   text NOT NULL CHECK (zona IN ('peninsula', 'no_peninsular', 'europa', 'resto')),
  centimos               integer NOT NULL CHECK (centimos >= 0),
  gratis_desde_centimos  integer CHECK (gratis_desde_centimos IS NULL OR gratis_desde_centimos >= 0),
  updated_at             timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY (producto_id, zona)
);

-- NO SE ENVÍA A DONDE NO SE ENVÍA. Una zona sin fila es una zona a la que este
-- vendedor no manda: se dice antes de cobrar, no después. Como todo lo de esta
-- casa, se hereda de lo que ya había: quien tenía `envio_centimos` puesto sigue
-- teniéndolo como tarifa de PENÍNSULA, y las demás zonas quedan cerradas hasta
-- que él las abra. Así nadie amanece vendiendo a Alemania sin saberlo.
INSERT INTO producto_envio_zonas (producto_id, zona, centimos, gratis_desde_centimos)
SELECT id, 'peninsula', envio_centimos, envio_gratis_desde_centimos
FROM products WHERE envio_centimos IS NOT NULL
ON CONFLICT DO NOTHING;

-- RECOGIDA EN PERSONA: para lo de la aldea y lo de proximidad. Sin gastos de
-- envío y sin pedir dirección; el sitio y el cuándo los escribe el vendedor.
ALTER TABLE products ADD COLUMN IF NOT EXISTS recogida_en_persona boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS recogida_donde text;

-- Y en el pedido queda constancia de cómo se entregó lo que se compró: si fue
-- recogida, no hay dirección que reclamar.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS entrega_tipo text NOT NULL DEFAULT 'envio'
  CHECK (entrega_tipo IN ('envio', 'recogida', 'digital'));
