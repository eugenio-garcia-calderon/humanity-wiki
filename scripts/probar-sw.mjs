// ============================================================================
// QUÉ INTERCEPTA EL SERVICE WORKER  ·  node scripts/probar-sw.mjs
// ============================================================================
// EXISTE POR UN FALLO CONCRETO (2026-08-23). `hw-v4` metía TODA respuesta de
// `/api/` por una rama que hace `res.clone()` y `await copia.blob()`. Sobre
// `/api/telecom/conexion` —Server-Sent Events, que no termina nunca— eso deja
// un `waitUntil` colgado para siempre y obliga al navegador a guardar el flujo
// entero en memoria. Desde fuera: «la aplicación se queda constantemente, a
// veces recargando, durante minutos».
//
// POR QUÉ UNA PRUEBA Y NO SOLO EL ARREGLO. Este fallo no se ve en local con una
// pestaña y dos minutos de sesión: hace falta estar dentro, con la conexión
// permanente abierta, y esperar. Y **el navegador de automatización no puede
// correr un service worker** (está escrito en `src/pwa.ts`), así que la única
// forma barata de comprobarlo es esta: ejecutar el fichero de verdad con un
// `self` de mentira y mirar a qué peticiones les hace `respondWith`.
//
// La prueba distingue las dos versiones: contra el `sw.js` de producción del
// 2026-08-23 daba 4 en verde y 1 en rojo; contra el arreglado, 5 en verde.
//
// REGLA QUE DEFIENDE: un service worker no toca una respuesta que no termina.
// Si algún día alguien añade otro flujo, que esta prueba se ponga roja.

// Ejecuta public/sw.js con un `self` de mentira y le lanza peticiones reales
// para ver CUÁLES intercepta. El navegador de automatización no puede correr un
// service worker; esto sí prueba lo único que importa aquí: que la conexión
// permanente no pase por la rama que la clona.
import fs from 'node:fs';
import vm from 'node:vm';

const codigo = fs.readFileSync('public/sw.js', 'utf8');
const oyentes = {};
const self = {
  addEventListener: (t, f) => { (oyentes[t] ||= []).push(f); },
  location: { origin: 'https://humanity.wiki' },
  skipWaiting: () => {}, clients: { claim: async () => {}, matchAll: async () => [] },
};
const contexto = {
  self, caches: { keys: async () => [], open: async () => ({ put: async () => {}, keys: async () => [] }), match: async () => null, delete: async () => {} },
  fetch: async () => ({ ok: true, clone: () => ({ blob: async () => new Blob() }), headers: new Map() }),
  URL, Headers, Response, Request, Blob, console, setTimeout, TypeError,
};
vm.createContext(contexto);
vm.runInContext(codigo, contexto);

const manejador = oyentes.fetch[0];
const casos = [
  ['CONEXIÓN PERMANENTE (SSE)', 'https://humanity.wiki/api/telecom/conexion', { accept: 'text/event-stream' }, false],
  ['una API normal',            'https://humanity.wiki/api/proyectos',        { accept: 'application/json' }, true],
  ['el muro',                   'https://humanity.wiki/api/publicaciones',    {},                            true],
  ['una página',                'https://humanity.wiki/proyectos/algo',       { accept: 'text/html' },        true],
  ['con ?sw=off',               'https://humanity.wiki/?sw=off',              {},                            false],
];

let ok = 0, ko = 0;
for (const [nombre, url, cabeceras, esperaInterceptar] of casos) {
  let intercepto = false;
  const req = { method: 'GET', url, headers: { get: (k) => cabeceras[k.toLowerCase()] ?? null } };
  manejador({ request: req, respondWith: () => { intercepto = true; }, waitUntil: () => {} });
  const bien = intercepto === esperaInterceptar;
  console.log(`  ${bien ? 'OK   ' : 'FALLO'} ${nombre.padEnd(28)} intercepta=${intercepto}  (esperado ${esperaInterceptar})`);
  bien ? ok++ : ko++;
}
console.log(`\n════ ${ok} en verde, ${ko} en rojo ════`);
process.exit(ko ? 1 : 0);
