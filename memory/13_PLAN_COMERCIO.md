# Comercio — una herramienta para vender, al nivel de Shopify

Eugenio, 2026-08-22: «pon una herramienta nueva que sea Comercio, donde el
usuario pueda añadir ahí sus productos y servicios, al estilo shopify, estudia
todas las funcionalidades de shopify y wix store, y haz una lista y hazla una
por una». Y antes: «tiene que ser un ecommerce real y funcional».

Se reutiliza lo que ya hay: la tabla `products`, el Mercado, el cobro con
Stripe Connect, las reservas de stock, los pedidos y el carrito.

## Qué tiene Shopify / Wix Store, y qué tenemos

| | Shopify / Wix | Aquí, hoy |
|---|---|---|
| Ficha con galería de fotos | Sí | **Una sola foto**, y la mayoría sin ninguna |
| Descripción con formato | Sí | Un párrafo de texto plano |
| Variantes (talla, color, sabor) | Sí | **No existe** |
| Referencia / SKU | Sí | **No existe** |
| Stock por variante | Sí | Stock único por producto |
| Opiniones y valoraciones | Sí | **No existe** |
| Colecciones o categorías propias | Sí | Una categoría de una lista cerrada de la plataforma |
| Productos relacionados | Sí | **No existe** |
| Buscador y filtros dentro de la tienda | Sí | **No existe** |
| Carrito | Sí | Sí |
| Cupones y descuentos | Sí | **No existe** |
| Zonas de envío con precios distintos | Sí | Un precio único de envío |
| Impuestos | Sí | **No existe** |
| Pedidos con estado y seguimiento | Sí | Sí |
| Devoluciones y reembolsos | Sí | **No existe** |
| Ficha de cliente e historial | Sí | Sólo correo en el pedido |
| Entrega de producto digital | Sí | **Se cobra y no se entrega nada** |
| Borrador / publicado | Sí | Todo nace publicado |
| Aviso de stock bajo | Sí | **No existe** |
| Diseño de la tienda | Sí | Portada, rejilla y columnas (fase 9 de tiendas) |
| Dominio propio | Sí | Subdominio por persona |
| Analítica de visitas y ventas | Sí | **No existe** |
| Carrito abandonado | Sí | **No existe** |

## Lo que hay que arreglar antes de añadir nada

Probado el 2026-08-22 en `claude-dos.humanity.wiki/tienda-2`, y Eugenio tiene
razón en las tres:

1. **Ni una foto.** El producto de prueba se creó sin imágenes y la ficha
   enseña un hueco.
2. **Ni una descripción de verdad.** Una línea.
3. **El título del producto no lleva a ninguna parte.** No hay ficha propia: el
   producto sólo existe como tarjeta dentro de una página.

Y el botón de comprar no salía porque el cobro estaba apagado a la espera de su
decisión. Ya está encendido; Stripe sigue en modo pruebas.

## Las 10 fases

### Fase 1 — La ficha de producto, de verdad
Página propia por producto (`/tienda/:producto` dentro del subdominio):
galería de fotos, descripción con formato, precio, variantes cuando las haya,
añadir a la cesta y volver a la tienda. Hoy un producto no tiene dónde vivir.

### Fase 2 — El creador de comercio dentro de Páginas
Eugenio lo pidió primero: «céntrate primero en mejorar el creador de comercio
dentro de páginas». Poner un producto en una página tiene que ser elegirlo de
una lista o crearlo ahí mismo, con sus fotos, sin salir a otra pantalla.

### Fase 3 — Opiniones y valoraciones
Estrellas y comentario, sólo de quien compró —el pedido lo demuestra— para que
una opinión signifique algo. Media visible en la ficha y en la rejilla.

### Fase 4 — La herramienta Comercio
Su sitio en el menú. Lista de productos, alta y edición con fotos, stock,
envío, borrador o publicado, y un panel de pedidos. Reutiliza `products` y las
rutas de `publicar.ts`.

### Fase 5 — Variantes y referencia
Talla, color, sabor, con su propio precio y su propio stock. Es lo que separa
vender miel de vender camisetas.

### Fase 6 — Colecciones, buscador y relacionados
Que quien entra encuentre. Una tienda de treinta productos sin buscador no se
puede usar.

### Fase 7 — Descuentos y cupones
Códigos, porcentaje o importe, caducidad y límite de usos.

### Fase 8 — Entrega de lo digital
Hoy un PDF se cobra y no se entrega. Enlace de descarga tras el pago, con
caducidad.

### Fase 9 — Impuestos, zonas de envío y devoluciones
El IVA y los reembolsos por Stripe. Zonas con precios distintos.

### Fase 10 — Analítica y carrito abandonado
Cuánta gente entró, cuánta compró, qué se quedó en la cesta.

## Segunda vuelta (23-08-2026, Eugenio: «dale a variantes, carrito, etc. y cinco cosas importantes que aún no tenemos, en 5 fases»)

Inventario antes de planear (lo que YA hay y no se repite): 8 fotos con galería en
la ficha, stock con reservas y «agotado», categorías, buscador y filtros en
/mercado, nº de seguimiento al marcar enviado, tarifas de envío y envío gratis
desde X, cupones, puntos, devoluciones, entrega de lo digital, reseñas, resumen
de ventas, borradores. Lo que NO había: variantes, carrito abandonado,
descripción con formato, aviso de pedido nuevo al vendedor (¡vendía y no lo
sabía!), aviso de estado al comprador, preguntar al vendedor, favoritos,
recibo/factura con IVA, «avísame cuando vuelva», valoración del vendedor.

| Fase | Qué | Estado |
|---|---|---|
| **F1** | **Avisos de comercio** por la campana: `pedido_nuevo` al vendedor (puntos y Stripe) y `pedido_estado` al comprador (enviado con seguimiento, entregado, devuelto, cancelado) · **Preguntar al vendedor** desde la ficha (mensaje directo) · **Descripción con formato** (Markdown del asistente) · `/comercio?pestana=pedidos` | hecha 23-08 (PR fase 1) |
| **F2** | **Variantes/SKU**: talla, color… con precio y stock por variante; la variante elegida viaja en cesta, pedido y línea; «agotado» por variante | hecha 23-08 (PR fase 2, 0107) |
| **F3** | **Carrito abandonado**: la cesta se guarda en el servidor con sesión; a las 24 h sin comprar, aviso por la campana con enlace a la cesta; panel del vendedor ve cuántas cestas se quedan a medias · **Favoritos / lista de deseos** con aviso si baja el precio | hecha 23-08 (PR fase 3, 0108) |
| **F4** | **Recibo/factura imprimible** por pedido (comprador y vendedor), con **IVA desglosado** y datos fiscales del vendedor (NIF, dirección) en su panel; tipo de IVA por producto | hecha 23-08 la parte que no depende del asesor (PR fase 4, 0110): datos fiscales + IVA por producto + RECIBO no fiscal. **Factura numerada: esperando a Eugenio/asesor** (facturación en nombre del vendedor) |
| **F5** | **«Avísame cuando vuelva»** (stock, por producto o variante; aviso por la campana una vez) · **productos relacionados** en la ficha («También en esta tienda») · **valoración del vendedor** (solo agregado de reseñas verificadas de sus productos; con menos de `MIN_RESENAS_VALORACION_VENDEDOR`=3 no se enseña nada) | hecha 23-08 (PR fase 5, 0111) |

Las cinco cosas nuevas que no teníamos: avisos de pedido (F1), preguntar al
vendedor (F1), favoritos (F3), recibo/factura con IVA (F4), avísame cuando
vuelva + valoración del vendedor (F5).

### Tercera vuelta (24-08-2026, Eugenio: «mejora el ecommerce, qué funcionalidades te faltan»)

Respuestas suyas: avisos por **WhatsApp** en vez de correo · la **devolución la pide el comprador** · **zonas de envío + recogida en persona** · y las cuatro prioridades a la vez (analítica de tienda, estado «preparando» y fechas, buscador y orden, cesta de varias tiendas).

| Fase | Qué | Estado |
|---|---|---|
| **F6** | **WhatsApp**: enlaces `wa.me` que funcionan hoy + envío automático por la Cloud API de Meta, apagado hasta que haya cuenta, número y plantillas aprobadas; teléfono en el pedido; libro de lo enviado | hecha 24-08 (0112) |
| **F7** | **Devolución pedida por el comprador** (con motivo; el vendedor acepta o rechaza) · estado **«preparando»** y **fecha estimada de entrega** | hecha 24-08 (0113) |
| **F8** | **Zonas de envío** (península, Baleares/Canarias, Europa, resto) con precio por zona · **recogida en persona** | hecha 24-08 (0114) |
| **F9** | **Analítica de tienda**: vistas → añadidos a la cesta → comprados, por producto | hecha 24-08 (0115) |
| **F10** | **Buscador, orden y paginación** en el mercado | hecha 24-08 |
| **F11** | **Cesta de varias tiendas**: agrupada por tienda, se pagan una detrás de otra (un cobro = una tienda, porque cada vendedor cobra en su cuenta). Pago único repartido entre varias cuentas: pendiente de Eugenio/asesor | hecha 24-08 |

## La regla de las pruebas

Todo lo que se cree para probar lleva **PRUEBA** delante en el título, y se
borra al terminar. Eugenio, 2026-08-22: «puedes añadir toda esta info con la
etiqueta de PRUEBA delante de todo».
