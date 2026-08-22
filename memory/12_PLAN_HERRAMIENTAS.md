# Que todas las herramientas funcionen — plan en 10 fases

Eugenio, 2026-08-22: «eres el encargado de todas las herramientas, que todas
funcionen a su nivel esperado. Pruébalas todas, una a una… si ves pasos que se
pueden atajar, adelante, herramientas que se pueden interconectar, adelante».

Primera pasada hecha el 2026-08-22 sobre las **43 rutas** de la aplicación, con
una sesión de nivel 1 —que es lo que tiene un usuario nuevo— y contra la API de
producción.

## Lo primero: la API está sana

Doce herramientas consultadas en producción. Ninguna devuelve error. Páginas,
tablas, publicaciones, proyectos, mercado, mensajes, calendario, tareas,
círculos, hormiguero, IA y archivos responden y traen datos.

**El problema no es que las herramientas estén rotas. Es que no se llega a
ellas.**

## El hallazgo central: el menú «Crear» no crea nada

`src/components/ai/AIAssistant.tsx`, líneas 224-231. Las ocho entradas son
esto:

```
{ label: 'Proyecto',    destino: '/proyectos'  }
{ label: 'Tarea',       destino: '/tareas'     }
{ label: 'Página',      destino: '/paginas'    }
…
```

Un **destino**, no una acción. Pulsar «Crear → Tarea» te deja en la lista de
tareas, sin diálogo y sin tarea. Comprobado en pantalla, no sólo leído.

Es el botón más visible de la aplicación y promete algo que no hace. Quien lo
pulsa dos veces y no consigue nada deja de pulsarlo.

Y faltan tres entradas: **Producto**, **Tabla** y **Lienzo**.

## Consecuencia medida: no se puede vender desde la interfaz

- El menú «Crear» no ofrece producto.
- `/mercado` no tiene botón de crear.
- `POST /api/products` exige nivel 2 — un usuario nuevo recibe 403.
- La ruta que sí funciona para nivel 1, `POST /api/publicar/mis-productos`, la
  escribí ayer y **no tiene ninguna pantalla**.

O sea: la plataforma sabe vender de punta a punta —carrito, envío, stock,
pedidos— y ningún usuario puede poner nada a la venta sin llamar a la API a
mano.

## Cuántos pasos cuesta empezar algo

| Quiero… | Pasos hoy | Debería |
|---|---|---|
| Una página | Crear → Página (va a la lista) → «Nueva página» → escribir un título → Aceptar | 1 |
| Una tarea | Crear → Tarea (va a la lista) → buscar el botón | 1 |
| Un producto | **No se puede** | 1 |
| Una tabla | No está en «Crear»; hay que ir a /tablas | 1 |

Escribir un título ANTES de tener la página es el paso que más sobra: nadie
sabe cómo se llama lo que todavía no ha escrito. Notion abre la página vacía y
el título se pone al escribirlo.

## Las 10 fases

Ordenadas por cuánta gente se topa con cada cosa.

### Fase 1 — Que «Crear» cree
Cada entrada abre la cosa nueva, ya creada y lista para escribir. Sin lista
intermedia y sin pedir el título antes. Es el cambio que más veces al día nota
un usuario, y toca un solo fichero.

### Fase 2 — Vender desde la interfaz
Pantalla para crear y editar productos sobre la ruta que ya existe para nivel
1, y entrada «Producto» en «Crear». Hoy la plataforma cobra pero no deja poner
nada a la venta.

### Fase 3 — «Crear» completo
Añadir Tabla y Lienzo, y revisar que las ocho existentes llevan a algo que se
puede usar sin instrucciones.

### Fase 4 — Una herramienta, una forma de crear
Cada herramienta tiene hoy su propio botón, su propio sitio y su propio
diálogo. Unificar el gesto: el mismo botón, el mismo sitio, el mismo
comportamiento.

### Fase 5 — Que las herramientas se enlacen entre ellas
Una tarea que apunta a una página. Una página que enseña una tabla —esto ya
funciona— y una tabla que enseña un proyecto. Hoy cada herramienta es una isla
salvo las que se conectaron a mano.

### Fase 6 — Lo que se ve al entrar sin nada creado
Una cuenta nueva ve listas vacías. Cada herramienta debería decir en una línea
para qué sirve y ofrecer el primer paso hecho.

### Fase 7 — Repaso de cada herramienta por dentro
Una a una, usándolas de verdad: páginas, tablas, lienzos, mapas, esquemas,
calendario, tareas, muro, mensajes, archivos, proyectos, mercado, IA.

### Fase 8 — Móvil en todas
La deuda medida: objetivos táctiles por debajo de 44 px y `100vh` en iOS. Ya
arreglado en la cesta; queda el resto.

### Fase 9 — Atajos
Lo que se hace muchas veces al día debería costar un gesto: duplicar, mover
entre proyectos, convertir una nota en tarea.

### Fase 10 — Repaso final de punta a punta
Una cuenta nueva, de cero, haciendo una de cada cosa sin ayuda.

## Cómo se prueba

Con una sesión de **nivel 1**, que es lo que tiene alguien que acaba de
entrar. Probar como administrador esconde exactamente los fallos que sufre la
mayoría — el 403 de crear un producto no se ve desde una cuenta de nivel 4.

Y mirando la pantalla, no la API. En esta primera pasada me equivoqué tres
veces leyendo mal mis propias comprobaciones: una sesión puesta después de
cargar la página, una clave de JSON que no existía, y un botón que sí abría un
diálogo. Las tres veces lo que fallaba era la medición, no la aplicación.
