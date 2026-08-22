-- ENTREGA DE LO DIGITAL (2026-08-22, fase 8 del plan de comercio, adelantada
-- por el Programador 7 — economía y mercado: «hoy un PDF se cobra y no se
-- entrega», el agujero más feo de la lista).
--
-- Un producto digital lleva SU ARCHIVO: la dirección de un fichero guardado en
-- la zona PRIVADA de subidas (`/uploads/privado/...`), que el servidor no
-- sirve nunca como estático. El archivo solo sale por la ruta de descarga del
-- pedido, que comprueba código + correo del comprador y que el pedido sigue
-- vivo. Así «se cobra y se entrega» deja de ser una promesa y pasa a ser un
-- hecho con llave: solo quien pagó descarga, y la descarga queda en el pedido.
ALTER TABLE products ADD COLUMN IF NOT EXISTS archivo_digital text;
COMMENT ON COLUMN products.archivo_digital IS
  'URL interna (/uploads/privado/...) del fichero que se entrega al pagar un producto digital. NULL = sin archivo: se avisa al vendedor.';
