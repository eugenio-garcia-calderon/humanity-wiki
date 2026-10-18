# Datos de productos portátiles (W3a)

Estado a 2026-10-18. Los JSON mandan; los CSV son vistas para mirar en una hoja de cálculo y
se regeneran con `node fusionar.mjs` (también rehace `marcas.json` y `distribuidores.json` a
partir de los cuatro ficheros de producto). Forma de los datos: `ESQUEMA.md`.

| Fichero | Productos |
|---|---|
| `powerbanks.json` | 13 (3 con panel solar integrado) |
| `estaciones.json` | 10 (de 245 Wh a 2.048 Wh) |
| `paneles.json` | 17 (de 20 W a 400 W) |
| `luces.json` | 18 (faroles, linternas y kits) |

Total: 58 productos, 26 marcas, 32 distribuidores, 77 ofertas, 129 afirmaciones
publicitarias con veredicto, 11 retiradas (en 4 powerbanks: Anker Zolo A1689, Anker
PowerCore 10000 A1263, Xiaomi 33 W PB2030MI, INIU B41).

## Qué falta y por qué

- **Amazon.es no deja leer sus páginas**: no hay ningún precio de Amazon comprobado. Las
  ofertas sin `precio_eur` son enlaces reales sin precio leído.
- **Retiradas**: las bases de datos de los organismos (Safety Gate, CPSC, Health Canada, ACCC)
  no se pudieron consultar directamente; se buscó por marca en sus webs. Cada producto lo dice
  en `retiradas_comprobadas`.
- **País de fabricación**: conocido en pocos productos; casi siempre `no_publicado`.
- **Fotos**: ninguna recogida todavía (`foto.url` vacío).
- **EAN**: 20 de 58.
- Cada producto lista lo que queda por comprobar en `pendiente`.

## Decisiones de revisión

- Una afirmación sólo es «cierta» con una comprobación independiente (medición de un tercero).
  Que cuadre con la ficha de la propia marca no basta: esas se dejaron en «sin pruebas».
- La oferta de MediaMarkt de la DJI Power 1000 V2 no se asignó a la Power 1000 (es otro
  modelo); está en `pendiente` de esa ficha.
- Hiluckey HI-S025: la medición de capacidad (techtest.org) es de la versión de 2020 con
  microUSB; el veredicto «falsa» lo dice en la explicación.

## Para la carga

Los carga `scripts/wikiproducts/cargar.mjs` (lee esta carpeta y `../domestico/`), después de
`crear-esquema.mjs`. Prueba sin servidor: `node scripts/wikiproducts/cargar.mjs --seco`.
Las URL de ficha son `/<subcategoria>/<marca>-<modelo>`; los `id` de producto y marca son
estables, en minúsculas y sin acentos: no renombrarlos entre cargas. Las filas se reconocen
por su nombre, así que cambiar el `nombre` de un producto crea una fila nueva (la vieja se
avisa, no se borra).
