// ============================================================================
// UN CLIC, UNA CARGA (2026-08-23, Programador 8)
// ============================================================================
//   BASE=http://localhost:3009 node scripts/probar-clic-sin-espera.mjs
//
// Eugenio: «tarda en responder y ponerle a cargar esa URL, es como si por 1 o 2
// segundos estuviese haciendo un proceso que no es cargar esa web».
//
// Lo era: al pulsar un enlace, la página se cargaba DOS VECES. La primera al
// seguir el enlace; la segunda porque el marco llevaba `key={url}`, la propia
// página avisaba por `postMessage` de a dónde había ido, eso cambiaba la clave,
// y React tiraba el marco y montaba otro — que volvía a cargar desde cero lo
// que ya estaba cargado.
//
// Esta prueba CUENTA LAS CARGAS. Es la única forma de que no vuelva: el
// síntoma es «va lento», que no falla ninguna prueba.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3009';
let fallos = 0;
const comprobar = (bien, texto) => { if (!bien) fallos++; console.log(`${bien ? '✅' : '❌'} ${texto}`); };

const nav = await chromium.launch({ args: ['--no-sandbox'] });
const p = await (await nav.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
try {
  await p.request.post(`${BASE}/api/auth/register`, {
    data: { email: `clic${Date.now()}@prueba.local`, password: 'Prueba1234!', name: 'Un Clic' },
  });

  const docs = [], leer = [];
  p.on('request', r => {
    const u = r.url();
    if (u.includes('/api/navegador/leer')) leer.push(Date.now());
    else if (r.resourceType() === 'document' && /\/api\/navegador\/(ver|instantanea)\?/.test(u)) docs.push(Date.now());
  });

  await p.goto(BASE, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('humanity:abrir-ventana',
    { detail: { id: 'n1', clase: 'navegador', titulo: 'Navegador', destino: 'https://www.apple.com/es/', delante: true } })));
  await p.waitForTimeout(9000);
  comprobar(docs.length === 1, `Abrir una web la carga UNA vez (${docs.length})`);
  comprobar(leer.length === 0,
    `Y NO se vuelve a descargar en el servidor para sacar el título (${leer.length} llamadas a «leer»)`);

  docs.length = 0; leer.length = 0;
  const marco = p.frameLocator('iframe[title="Navegador"]');
  const enlace = marco.locator('a[href*="navegador/ver"]').filter({ hasText: /Mac/i }).first();
  if (await enlace.count()) {
    await enlace.click({ timeout: 10000 });
    await p.waitForTimeout(10000);
    comprobar(docs.length === 1,
      `Pulsar un enlace la carga UNA vez — antes eran dos y eso era la espera (${docs.length})`);
    comprobar(leer.length === 0, `Sin segunda descarga en el servidor (${leer.length})`);
  } else {
    comprobar(false, 'No se ha encontrado el enlace del menú para pulsar');
  }

  // ── LO QUE EL ARREGLO PODRÍA HABER ROTO ─────────────────────────────────
  // El arreglo es un freno: «no cargues, que ya está puesta». Un freno mal
  // puesto deja la barra y los botones sin efecto, y eso es peor que la espera
  // que se venía a quitar. Se comprueban los tres caminos que SÍ tienen que
  // cargar.
  docs.length = 0;
  await p.getByTitle('Atrás').click();
  await p.waitForTimeout(6000);
  comprobar(docs.length >= 1, `«Atrás» sigue cargando (${docs.length})`);

  docs.length = 0;
  await p.getByTitle('Adelante').click();
  await p.waitForTimeout(6000);
  comprobar(docs.length >= 1, `«Adelante» sigue cargando (${docs.length})`);

  docs.length = 0;
  const barra = p.getByPlaceholder('Escribe una dirección o busca…');
  await barra.click(); await barra.fill('https://es.wikipedia.org/wiki/Agua'); await barra.press('Enter');
  await p.waitForTimeout(7000);
  comprobar(docs.length >= 1, `La barra sigue cargando (${docs.length})`);

  docs.length = 0;
  await p.getByTitle('Recargar').click().catch(() => p.getByTitle('Actualizar').click());
  await p.waitForTimeout(6000);
  comprobar(docs.length >= 1, `Recargar sigue cargando (${docs.length})`);

  // Y la subida a instantánea, que también es una orden nuestra sobre la MISMA
  // dirección — el caso donde el freno es más fácil de equivocar.
  docs.length = 0;
  await barra.click(); await barra.fill('https://www.amazon.es'); await barra.press('Enter');
  await p.waitForTimeout(15000);
  comprobar(await p.getByText('instantánea', { exact: true }).count() > 0,
    'Una web de JavaScript sigue subiendo a instantánea');

  // Y que el título siga llegando, que era lo que hacía la llamada que se ha
  // quitado. Sin esto, el arreglo cambia una espera por una pestaña sin nombre.
  const titulo = await p.locator('[title*="Apple"], [title*="Mac"]').first().count();
  comprobar(titulo > 0 || (await p.title()).length > 0, 'El título de la pestaña sigue llegando, ahora desde la propia página');
} finally {
  await nav.close();
}

console.log(fallos === 0 ? '\n✅ TODO PASA · un clic, una carga' : `\n❌ ${fallos} fallos`);
process.exit(fallos === 0 ? 0 : 1);
