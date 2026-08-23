# De dónde salen las formas del mapa

`paises-110m.json` (108 KB) son las fronteras del mundo a escala 1:110 000 000,
en formato **TopoJSON**: comparte cada frontera entre los dos países que la
tocan, así que ocupa la cuarta parte que el mismo mundo en GeoJSON.

- **Origen**: [world-atlas](https://github.com/topojson/world-atlas) v2.0.2,
  fichero `countries-110m.json`, sacado con `npm pack world-atlas@2`.
- **Datos**: [Natural Earth](https://www.naturalearthdata.com/), dominio público.
- **Licencia del paquete**: ISC, © 2013-2019 Michael Bostock.

Cada forma lleva como identificador su **código ISO 3166-1 numérico**. La tabla
que traduce ese número a un país está en `src/utils/graficas/paises.ts`, con la
explicación de cómo se generó y cómo se comprobó.

Tres formas no tienen código ISO —Kosovo, Somalilandia y el norte de Chipre— y
no es un fallo: no lo tienen. El mapa las deja en gris y avisa de las filas que
no ha podido situar.

**No se sube al bundle**: se pide con `fetch` la primera vez que alguien abre un
mapa, y se queda en la caché del navegador.
