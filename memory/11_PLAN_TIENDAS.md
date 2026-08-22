# Tiendas y webs en el subdominio de cada persona — plan en 10 fases

Eugenio, 2026-08-22: «prueba a hacer un ecommerce en ese subdominio y mira lo
que te funciona y lo que no», «dentro de scope es también crear landing pages y
una web atractivas con múltiples productos, y testearlo todo».

Medido en PRODUCCIÓN el 2026-08-22 con la cuenta `claude2@lighthumanity.org`
(nivel 1) y con la tienda de prueba publicada en
`claude-dos.humanity.wiki/tienda`. No es una estimación: es lo que pasó al
intentarlo.

## Lo que YA funciona

| | |
|---|---|
| El subdominio resuelve y sirve la página | sin cuenta, sin sesión |
| Texto, títulos, listas, citas, imágenes, vídeo, tablas | se ven en público |
| `products` en la base de datos | precio, moneda, stock, imágenes, garantía, devoluciones |
| Cobro de un producto por Stripe | con Connect, reparto al vendedor y comisión de plataforma |
| La compra queda registrada | fila en `transactions` desde el webhook |

## Lo que NO funciona, medido

| # | Qué pasó | Dónde |
|---|---|---|
| 1 | Nivel 1 no puede crear un producto: **403** | `POST /api/products` |
| 2 | Un visitante sin cuenta no puede comprar: **401** | `POST /api/stripe/checkout/product` |
| 3 | El bloque de producto enseña solo el nombre: ni precio, ni foto, ni botón | `BloquesLectura.tsx` |
| 4 | Pulsar el producto **saca al comprador de la tienda** al mercado global, con los productos de todos los demás | `pubUrl` → `/mercado?producto=` |
| 5 | No hay carrito: un pago por producto | `checkout/product` |
| 6 | No se pide dirección de envío ni se cobra el envío | `checkout/product` |
| 7 | No se comprueba ni se descuenta el stock: se puede comprar con stock 0 | `checkout/product` |
| 8 | El vendedor no tiene pedidos: solo una fila en `transactions` | no existe tabla de pedidos |
| 9 | Tras pagar, el comprador aterriza en el dominio principal | `return_url` fijo a `APP_URL/mercado` |
| 10 | Crear una página por API ignora el título y los bloques | `POST /api/documentos` |
| 11 | No hay maquetación: una columna, sin portada, sin rejilla, sin columnas | `BloquesLectura.tsx` |
| 12 | La raíz del subdominio enseña la aplicación, no la tienda | `App.tsx` |

## Las 10 fases

Ordenadas por lo que desbloquea a la siguiente. Cada una se prueba antes de
pasar a la siguiente, y cada una sale en **su propio despliegue**
(ver `deploy/CLAUDE.md`).

### Fase 1 — La raíz del subdominio es la casa de esa persona
Hoy `claude-dos.humanity.wiki` enseña la aplicación entera. Debe enseñar la
portada de ese espacio: quién es, qué publica, qué vende. Sin esto, todo lo
demás cuelga de una dirección que no existe. Resuelve el 12.

### Fase 2 — El bloque de producto se ve como un producto
Foto, nombre, precio, disponibilidad y un botón. Hoy es una línea de texto.
Es el cambio con más efecto por menos código. Resuelve el 3.

### Fase 3 — Comprar sin cuenta
Un comprador no se registra para comprar; se va. Correo + dirección en el
propio pago, y la cuenta después si quiere. Resuelve el 2, y sin esto ninguna
tienda vende. **Es la fase que decide si esto es una tienda o un escaparate.**

### Fase 4 — Dirección de envío, coste de envío e impuestos
Stripe lo hace con `shipping_address_collection` y `shipping_options`; hoy no
se piden. Un producto físico sin dirección no se puede enviar. Resuelve el 6.

### Fase 5 — Stock de verdad
Comprobar antes de cobrar y descontar al cobrar. Vender lo que no hay es la
única forma de perder a un cliente antes de conocerlo. Resuelve el 7.

### Fase 6 — Pedidos, para quien vende y para quien compra
Una tabla de pedidos con estado (pagado, enviado, entregado, devuelto).
`transactions` dice que entró dinero, no qué hay que meter en una caja.
Resuelve el 8 y el 9 (volver a la tienda tras pagar).

### Fase 7 — Carrito
Varios productos en un pago. Hasta aquí se puede vivir sin él; a partir de dos
productos, no. Resuelve el 5.

### Fase 8 — Vender sin permiso especial
Que crear un producto no exija nivel 2. Con un límite mientras no haya
reputación, no con una puerta cerrada. Resuelve el 1.

### Fase 9 — Maquetación: portadas y rejillas
Bloques de portada, rejilla de productos, dos y tres columnas, fondo y color.
Es lo que separa «una página con cosas» de «una web bonita». Resuelve el 11.

### Fase 10 — La tienda completa, probada de punta a punta
Una tienda real con varios productos, portada, rejilla, carrito, envío e
impuestos, comprada por alguien sin cuenta, con el pedido llegando al vendedor.
Y el arreglo del 10 por el camino.

## Cómo se prueba cada fase

En producción, en `claude-dos.humanity.wiki`, con prefijo `AI` en todo lo que
se cree y borrándolo al terminar. Y mirando **el contenido**, no el código de
estado: este servidor devuelve la aplicación entera para cualquier ruta, así
que un 200 no demuestra que exista una pantalla. Ya ha engañado dos veces.
