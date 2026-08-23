// ============================================================================
// EL NAVEGADOR SIN LAG (2026-08-23, Programador 8)
// ============================================================================
//   BASE=http://localhost:3009 node scripts/probar-navegador-sin-lag.mjs
//
// Lo que hay que demostrar, y en este orden:
//
//   1. Una web normal se lee SIN encender ningún Chromium en el servidor. Es
//      donde estaba el gasto y el retardo.
//   2. El servidor sabe decir cuándo una web NO se puede leer así, en vez de
//      dejar al usuario mirando una página en blanco.
//   3. Esa se dibuja con una instantánea y llega ENTERA, sin retransmitir nada.
//   4. Y que el modo ligero es el de fábrica: si esto vuelve a arrancar en
//      «remoto» algún día, la prueba lo canta.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const BASE = process.env.BASE || 'http://localhost:3009';
let fallos = 0;
const comprobar = (bien, texto) => { if (!bien) fallos++; console.log(`${bien ? '✅' : '❌'} ${texto}`); };
const chromiumsDelServidor = () => Number(execSync(
  "ps -Ao command | grep -c '[h]eadless_shell\\|[c]hromium.*--headless' || true").toString().trim());

const nav = await chromium.launch({ args: ['--no-sandbox'] });
const ctx = await nav.newContext();
const p = await ctx.newPage();

try {
  // Una sesión, por la puerta normal.
  const correo = `nolag${Date.now()}@prueba.local`;
  const alta = await p.request.post(`${BASE}/api/auth/register`, {
    data: { email: correo, password: 'Prueba1234!', name: 'Prueba Sin Lag' },
  });
  comprobar(alta.ok(), `Sesión de prueba creada (${alta.status()})`);

  console.log('\n── Una web normal: sin Chromium y sin retardo');
  const antes = chromiumsDelServidor();
  const leer = await (await p.request.get(`${BASE}/api/navegador/leer?url=${encodeURIComponent('https://es.wikipedia.org/wiki/Agua')}`)).json();
  comprobar(leer.necesitaRender === false, `Wikipedia se lee tal cual (necesitaRender=${leer.necesitaRender})`);
  comprobar((leer.texto || '').length > 500, `Y trae texto de verdad (${(leer.texto || '').length} car.)`);
  const ver = await p.request.get(`${BASE}/api/navegador/ver?url=${encodeURIComponent('https://es.wikipedia.org/wiki/Agua')}`);
  comprobar(ver.ok(), `El proxy la sirve (${ver.status()})`);
  comprobar(chromiumsDelServidor() <= antes, 'Y NO se ha encendido ningún Chromium en el servidor');

  console.log('\n── Una aplicación de JavaScript: se detecta en vez de salir en blanco');
  // AQUÍ HABÍA EL PAÍS Y ERA UNA MALA ELECCIÓN. Al medirlo a pelo con `fetch`
  // devolvía 54 caracteres y parecía una aplicación de JavaScript; por el proxy
  // —que manda una identificación de navegador de verdad— devuelve la portada
  // entera. La prueba fallaba porque mi expectativa estaba mal, no el código.
  // Amazon sí lo necesita de verdad: sin JavaScript no hay resultados.
  const app = await (await p.request.get(`${BASE}/api/navegador/leer?url=${encodeURIComponent('https://www.amazon.es')}`, { timeout: 25000 })).json();
  comprobar(app.necesitaRender === true, `Amazon pide render (necesitaRender=${app.necesitaRender})`);

  console.log('\n── La instantánea: dibujada una vez, entregada entera');
  const t0 = Date.now();
  const foto = await p.request.get(`${BASE}/api/navegador/instantanea?url=${encodeURIComponent('https://www.amazon.es/s?k=teclado')}`, { timeout: 40000 });
  const ms = Date.now() - t0;
  comprobar(foto.ok(), `Responde (${foto.status()}) en ${ms} ms`);
  const html = await foto.text();
  const texto = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  comprobar(texto.length > 5000, `Y llega la página entera, no una foto (${texto.length} car. de texto)`);
  // Lo que la distingue de retransmitir: es HTML, no imágenes.
  comprobar(!/data:image\/(png|jpeg);base64/.test(html.slice(0, 5000)),
    'No es un fotograma: es HTML, así que el texto se puede seleccionar y copiar');
  comprobar(/\/api\/navegador\/ver\?url=/.test(html),
    'Sus imágenes y estilos vienen reescritos por nuestro proxy');

  console.log('\n── El modo de fábrica');
  const fuente = execSync("grep -c \"useState<'remoto' | 'proxy'>('proxy')\" src/components/ventanas/Navegador.tsx").toString().trim();
  comprobar(fuente === '1', 'El navegador arranca en modo ligero, no en retransmisión');
} finally {
  await nav.close();
}

console.log(fallos === 0 ? '\n✅ TODO PASA · sin retransmitir nada' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
