-- Productos nacidos de una base de datos (`products.bd_fila_id`): sus tarifas de
-- envío por zona. El carrito no cobra el envío de un producto físico sin tarifa
-- para la zona del destino y decía «no se envía a ese destino» siempre, porque
-- la sincronización de `bd/tienda.ts` creaba el producto pero no sus tarifas.
-- Cuatro zonas, con el precio de `envio_centimos` (gratis si no hay). Solo
-- inserta lo que falta: no pisa lo que un vendedor ajustó a mano. Idempotente.
INSERT INTO producto_envio_zonas (producto_id, zona, centimos, updated_at)
SELECT p.id, z.zona, COALESCE(p.envio_centimos, 0), now()
FROM products p
CROSS JOIN (VALUES ('peninsula'), ('no_peninsular'), ('europa'), ('resto')) AS z(zona)
WHERE p.bd_fila_id IS NOT NULL
ON CONFLICT (producto_id, zona) DO NOTHING;
