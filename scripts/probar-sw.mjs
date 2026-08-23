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
// La respuesta que devolverá el `fetch` del siguiente caso. Se cambia entre
// casos para poder preguntar dos cosas distintas: si el fichero INTERCEPTA la
// petición, y si además la GUARDA en caché.
let respuestaDeTurno = { tipo: 'application/json' };
let seGuardo = false;
const contexto = {
  self,
  caches: {
    keys: async () => [],
    open: async () => ({ put: async () => { seGuardo = true; }, keys: async () => [], delete: async () => {} }),
    match: async () => null,
    delete: async () => {},
  },
  fetch: async () => ({
    ok: true,
    type: 'basic',
    headers: new Headers({ 'content-type': respuestaDeTurno.tipo }),
    clone() { return { blob: async () => new Blob(), headers: this.headers }; },
  }),
  URL, Headers, Response, Request, Blob, console, setTimeout, TypeError,
};
vm.createContext(contexto);
vm.runInContext(codigo, contexto);

const manejador = oyentes.fetch[0];
const J = 'application/json';
const SSE = 'text/event-stream';

// nombre · url · cabeceras · ¿intercepta? · content-type de la respuesta · ¿la guarda?
const casos = [
  // LOS TRES FLUJOS QUE VIVEN BAJO /api/. Sólo el primero lo descubrió Eugenio;
  // los otros dos aparecieron leyendo, que es como se encuentran estos.
  ['chat: conexión permanente', '/api/telecom/conexion',                  { accept: SSE }, false, SSE, false],
  ['navegador remoto',          '/api/navegador/remoto/7/pantalla',       { accept: SSE }, false, SSE, false],
  ['IA escribiendo un documento (sin cabecera Accept)', '/api/documentos/7/flujo', {},     true,  SSE, false],

  // DESCARGAS BINARIAS BAJO /api/. Se sirven, no se guardan: un Word ocupaba
  // una de las 200 plazas de la caché de datos y echaba de ahí lo que sirve
  // para trabajar sin conexión.
  ['documento en Word',         '/api/documentos/7/docx', {}, true, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', false],
  ['documento en PDF',          '/api/documentos/7/pdf',  {}, true, 'application/pdf', false],

  // LO QUE SÍ TIENE QUE SEGUIR GUARDÁNDOSE, o el avión vuelve a ser un muro.
  ['tus proyectos',             '/api/proyectos',     { accept: J }, true, J, true],
  ['el muro',                   '/api/publicaciones', {},            true, J, true],

  // Y el resto del fichero, sin tocar.
  ['una página de la app',      '/proyectos/algo',    { accept: 'text/html' }, true, 'text/html', null],
  ['con ?sw=off',               '/?sw=off',           {},                      false, 'text/html', null],
];

let ok = 0, ko = 0;
for (const [nombre, ruta, cabeceras, esperaInterceptar, tipoRespuesta, esperaGuardar] of casos) {
  respuestaDeTurno = { tipo: tipoRespuesta };
  seGuardo = false;
  let intercepto = false;
  const pendientes = [];
  const req = {
    method: 'GET', mode: ruta.startsWith('/api') ? 'cors' : 'navigate',
    destination: '', url: 'https://humanity.wiki' + ruta,
    headers: { get: (k) => cabeceras[k.toLowerCase()] ?? null },
  };
  manejador({
    request: req,
    respondWith: (p) => { intercepto = true; pendientes.push(Promise.resolve(p)); },
    waitUntil: (p) => { pendientes.push(Promise.resolve(p)); },
  });
  await Promise.allSettled(pendientes);
  await new Promise((r) => setTimeout(r, 0));

  let bien = intercepto === esperaInterceptar;
  let detalle = `intercepta=${intercepto}`;
  if (esperaGuardar !== null) {
    bien = bien && seGuardo === esperaGuardar;
    detalle += ` guarda=${seGuardo} (esperado ${esperaGuardar})`;
  }
  console.log(`  ${bien ? 'OK   ' : 'FALLO'} ${nombre.padEnd(38)} ${detalle}`);
  bien ? ok++ : ko++;
}
console.log(`\n════ ${ok} en verde, ${ko} en rojo ════`);
process.exit(ko ? 1 : 0);
