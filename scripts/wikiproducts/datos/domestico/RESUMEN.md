# Productos domésticos — estado a 2026-10-18

36 productos: 18 paneles solares domésticos y 18 baterías domésticas.

| Fichero | Qué es |
|---|---|
| `paneles.json`, `baterias.json` | Los datos finales, en el formato común con portátiles (`../portatil/ESQUEMA.md`) |
| `marcas.json` (34), `distribuidores.json` (22) | Empresas y tiendas, con ids como los de portátiles (`autosolar-es`, `tienda-solar-es`…) |
| `indice.csv` | Una fila por producto: estado, nº de afirmaciones, retiradas, ofertas, precio mínimo |
| `paneles/*.json`, `baterias/*.json` | Borradores de investigación, uno por producto (de aquí sale todo) |
| `unir.mjs` | Regenera los ficheros finales desde los borradores: `node unir.mjs` |
| `revisar.mjs` | Comprueba que cada dato tiene fuente, fecha y naturaleza: `node revisar.mjs` (hoy: 0 avisos) |

Cifras: 123 afirmaciones publicitarias verificadas (76 matizables, 33 sin pruebas, 11 ciertas,
3 falsas), 19 retiradas o alertas, 56 ofertas con fecha. Comisión: «sin acuerdo» en todas.

## Paneles
AIKO Neostar, aleo solar LEO-N (descatalogado), Astronergy ASTRO N7s, Atersa A-455M GS,
Canadian Solar TOPHiKu6, DMEGC Infinity RT, Huasun Himalaya G10, JA Solar DeepBlue 4.0 Pro,
Jinko Tiger Neo 3.0, LONGi Hi-MO 6 Explorer, LONGi Hi-MO X10 Explorer, Maxeon 7,
Meyer Burger White (descatalogado), Qcells Q.TRON BLK M-G2+, REC Alpha Pure-R,
Risen RSM108 TOPCon, Tongwei TNC 2.0, Trina Vertex S+.

## Baterías
AlphaESS SMILE-G3, Anker SOLIX X1, BYD Battery-Box Premium HVS, Dyness Tower, EcoFlow PowerOcean,
Enphase IQ Battery 5P, Fox ESS EP11/EP5, GoodWe Lynx Home F, Growatt ARK XH, Huawei LUNA2000,
LG RESU, Pylontech Force H2/H3, SENEC.Home (descatalogado), SolarEdge Home Battery,
sonnenBatterie 10, Sungrow SBR (descatalogado), Tesla Powerwall 2 (descatalogado), Tesla Powerwall 3.

## Huecos conocidos (cada ficha los lista en `pendiente`)
- **EU Safety Gate no se pudo consultar directamente** (la red del entorno bloquea
  `ec.europa.eu` y la web es dinámica). Las búsquedas se hicieron en CPSC, ACCC, Health Canada,
  OPSS (Reino Unido) y prensa. Antes de que la web diga «ninguna retirada conocida» conviene
  abrir Safety Gate a mano o permitir ese dominio.
- Sin precio público con IVA en España: Canadian Solar, Qcells, Huasun, Maxeon, aleo, Astronergy
  y Tongwei (solo UE), AlphaESS, Anker, sonnen, Pylontech, Sungrow. Muchos fabricantes venden
  solo a instaladores.
- Fabricante de las celdas de la batería: no publicado en la mayoría.
- Fotos y códigos de barras (EAN): casi todos vacíos.
- Precios de instalación: ninguna oferta con instalación incluida tiene precio público.
