/**
 * The 3D robot (2026-11-24, Eugenio: «genera un bot que te diga todo lo que falla, porque por ejemplo paneles solares pincho y
 * no se muestran los paneles solares, o retrovisores pincho y se muestra todo el vehículo salvo la cúpula»).
 *
 * Opens the real page (`/aeromovil`) in a real browser with a saved design, goes to every department, clicks every part of its
 * submenu and, for each one, reads what the 3D viewer is drawing (`window.__am3d`, `components/aeromovil/visor/inspeccion.ts`)
 * and where it lands on the screen (`window.__am3dVista`). For each part it checks:
 *   1. it draws something (or, if the design has none of it, the page says so: «Este diseño no lleva …»);
 *   2. everything of the part is drawn (every piece named for it) and nothing else (`ESPERA` below: what each part is, by the
 *      builders' own names, written apart from the tags the viewer filters by);
 *   3. what it draws is on the screen and big enough to see;
 *   4. no two parts of a department draw the same thing («pincho en mando, salpicadero, asientos y no cambia»);
 * and for the page: the 3D window is at most 52 % of the screen's height and the part's panel starts on the first screen.
 *
 * Run (the dev server must be up; `npm run dev` does not read .env, see CLAUDE.md):
 *   npx tsx scripts/robot-3d.ts [--url http://localhost:3000] [--diseno completo,puertas] [--dep carroceria,interior] [--movil] [--ver]
 * If the browser Playwright wants is not installed, point `ROBOT_CHROMIUM` at any Chromium. Designs: defecto, completo, puertas, phev,
 * cuatro (`DISENOS`). Prints one line per part and, at the end, every failure; exits
 * with 1 if any. Ends «Todo OK» when none. About 1 minute per design (the first load of the viewer is slow under software WebGL).
 */
import { chromium, type Page } from 'playwright';
import { PARAMETROS_TRICICLO } from '../src/components/aeromovil/geometria';
import { NOMBRE_DEP, PESTANAS_CON_PARTES, partesDePestana, pestanaDe, type Subsistema } from '../src/components/aeromovil/partes/subsistemas';
import type { Pieza3D } from '../src/components/aeromovil/visor/inspeccion';
import type { CapaId } from '../src/components/aeromovil/visor/capas';

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? null : process.argv[i + 1] ?? ''; };
const URL_BASE = (arg('url') ?? process.env.ROBOT_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const MOVIL = process.argv.includes('--movil');
const VER = process.argv.includes('--ver');

/** The designs it tries: the default one and the changes that bring in the pieces the default does not have (doors, wheel, dashboard, solar roof…). */
const DISENOS: Record<string, Record<string, unknown>> = {
  defecto: {},
  completo: { tAsientos: 'filas', tMando: 'volante', tSalpicadero: 'blanco', tAcceso: 'puertas', tRetrovisores: 'espejos', tMaletero: 'aptera', tSolarCola: 'si', tFaro: 'barra', tSolarMorro: 'si', tPuertas2: 'si', tAcabado: 'lujo', tTapiz: 'cueroCognac', tCostura: 'recta', tMoldura: 'madera', tConsolaTecho: 'encendida', tConsolaCentral: 'si', tCinturon: 'rojo', tAmbiente: 'azul' },
  puertas: { tAcceso: 'puertas', tPuertas2: 'si', tAcabado: 'paneles', tTapiz: 'cueroCognac' },
  phev: { tPropulsion: 'phev', tHibArq: 'reparto' },
  cuatro: { tTraseras: 'dos' },
};

/**
 * What each part is, written apart from the tags: by the layers its pieces live in and by the names the builders give them
 * (`garaje/bala*.ts`, `visor/triciclo.ts`). `es`: the pieces that are the part (tested on «route tag»); `no`: pieces that match `es`
 * and are not. Every piece that is the part must be drawn whole, and nothing that is not may be drawn.
 */
interface Espera { capas: CapaId[]; es?: RegExp; no?: RegExp }
const TRIM = 'forro|borde-ventana|moldura|luz-ambiente|reposabrazos|portavasos|suelo-moqueta|funda-torreta|consola|foco';
const ESPERA: Record<string, Espera> = {
  // Rodaje
  ruedas: { capas: ['ruedas'], es: /./, no: /freno|disco|pinza/ },
  frenos: { capas: ['ruedas'], es: /freno|disco|pinza/ },
  direccion: { capas: ['direccion', 'ruedas'] },
  suspension: { capas: ['suspension', 'ruedas'] },
  // Motor
  // (the motor layer's meshes have no names: the tags of `piezasMotor.ts` are all there is to tell them apart)
  motor: { capas: ['motor'], es: /(motor-electrico|hibrido-mg2)$/ },
  controlador: { capas: ['motor'], es: /controlador$/ },
  reductora: { capas: ['motor', 'transmision'], es: /hibrido-(planetario|embrague|caja|arbol|cadena|diferencial)$/ },
  termico: { capas: ['motor'], es: /(hibrido-(motor|deposito|escape|admision|filtro-aire|filtro-aceite|bomba-agua|bomba-aceite|carter|manguitos|mg1|generador|p2)|refrigeracion-(radiador|tubos))$/ },
  // Carrocería
  carenado: { capas: ['carenado'], es: /./, no: new RegExp(`retrovisor|panel-solar|cuello-panel|faro|piloto|intermitente|puerta-|·porton|junta-(puerta|porton)|montante|bisagra-trasera|refrigeracion|${TRIM}`) },
  cristales: { capas: ['cristales'], es: /./, no: /panel-solar/ },
  solar: { capas: ['carenado', 'cristales'], es: /panel-solar|cuello-panel/ },
  accesos: { capas: ['carenado', 'cristales'], es: /puerta|·porton|junta-porton|maletero|montante|bisagra-trasera/, no: new RegExp(`retrovisor|panel-solar|aleta|${TRIM}`) },
  retrovisores: { capas: ['carenado'], es: /retrovisor|camara|capsula/ },
  luces: { capas: ['carenado'], es: /faro|piloto|intermitente|lente-faro/ },
  // Interior
  asientos: { capas: ['asientos'], es: /asiento|respaldo|sillin|butaca|cabezal|cojin|cinturon|flanco|pad-/, no: /salpicadero|volante|relojes|pantalla|mandos|acabado/ },
  mandos: { capas: ['asientos'], es: /volante|manillar|maneta|funda-columna|mandos/, no: /salpicadero/ },
  salpicadero: { capas: ['asientos'], es: /salpicadero|relojes|pantalla-central/ },
  acabado: { capas: ['asientos', 'carenado'], es: new RegExp(`${TRIM}|acabado`) },
  // Batería, Chasis
  bateria: { capas: ['baterias'] },
  bastidor: { capas: ['chasis'] },
};

const fallos: string[] = [];
const falla = (donde: string, msg: string) => { fallos.push(`${donde}: ${msg}`); console.log(`    ✗ ${msg}`); };

async function abrir(P: Record<string, unknown>, dep: string): Promise<Page> {
  const browser = await navegador();
  const ctx = await browser.newContext({ viewport: MOVIL ? { width: 390, height: 844 } : { width: 1400, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', e => falla('página', `error de la página: ${String(e).slice(0, 200)}`));
  // software WebGL draws a frame in a few hundred ms: the page's own animations (the camera moving to a part) are slowed to match
  await page.addInitScript(() => { window.requestAnimationFrame = cb => window.setTimeout(() => cb(performance.now()), 250) as unknown as number; });
  await page.route('**/api/**', async r => {
    const u = new URL(r.request().url());
    if (u.pathname === '/api/aeromovil/dueno') return r.fulfill({ json: { nombre: 'Robot', puedeDecidir: true, sesion: true } });
    return r.fulfill({ json: [] });
  });
  await page.route(/^https?:\/\/(?!(localhost|127\.0\.0\.1))/, r => r.abort());
  await page.goto(`${URL_BASE}/aeromovil`, { waitUntil: 'commit', timeout: 120000 });
  await page.evaluate(([p, d]) => { localStorage.clear(); localStorage.setItem('aeromovil.parametros.v5', p); localStorage.setItem('aeromovil.departamento', d); }, [JSON.stringify(P), dep]);
  await page.goto(`${URL_BASE}/aeromovil`, { waitUntil: 'commit', timeout: 120000 });
  await page.waitForFunction(() => typeof (window as unknown as { __am3d?: unknown }).__am3d === 'function', null, { timeout: 300000 });
  await page.waitForTimeout(5000);
  if (!VER) await page.addStyleTag({ content: 'canvas{visibility:hidden!important}' });
  return page;
}
let nav: Awaited<ReturnType<typeof chromium.launch>> | null = null;
async function navegador() { return nav ??= await chromium.launch({ headless: !VER, executablePath: process.env.ROBOT_CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); }

interface Vista { x0: number; x1: number; y0: number; y1: number; n: number }
const piezas = (page: Page) => page.evaluate(() => (window as unknown as { __am3d: (n: number) => Pieza3D[] }).__am3d(3));
const vista = (page: Page) => page.evaluate(() => (window as unknown as { __am3dVista: () => Vista | null }).__am3dVista());
/** waits until the camera has stopped (the move to a part takes a second or two under software WebGL) */
async function quieto(page: Page): Promise<Vista | null> {
  let a: Vista | null = null;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(600);
    const b = await vista(page);
    if (a && b && ['x0', 'x1', 'y0', 'y1'].every(k => Math.abs((a as never)[k] - (b as never)[k]) < 0.002)) return b;
    if (!a && !b && i > 3) return null;
    a = b;
  }
  return a;
}

const texto = (f: Pieza3D) => `${f.ruta} ${f.componente}`;
const dibujadas = (fs: Pieza3D[]) => fs.filter(f => f.visibles > 0);
const firma = (fs: Pieza3D[]) => dibujadas(fs).map(f => `${f.capa}|${f.ruta}|${f.componente}|${f.visibles}`).sort().join('\n');

/** The checks of one part. Returns what it draws, for the comparison between parts. */
function comprobar(donde: string, s: Subsistema, fs: Pieza3D[], v: Vista | null, aviso: string | null): string {
  const e = ESPERA[s.id];
  const vis = dibujadas(fs);
  if (!e) { falla(donde, `el robot no sabe qué es «${s.id}»: añádelo a ESPERA`); return firma(fs); }
  const n = vis.reduce((a, f) => a + f.visibles, 0);
  if (!vis.length) {
    if (aviso) console.log(`    · no dibuja nada y lo dice: «${aviso}»`);
    else falla(donde, 'no se dibuja nada y la página no explica por qué');
    return firma(fs);
  }
  if (aviso) falla(donde, `dibuja ${n} piezas y a la vez dice «${aviso}»`);
  // nothing outside its layers
  const fuera = vis.filter(f => !e.capas.includes(f.capa));
  if (fuera.length) falla(donde, `se ve lo que no es suyo (capas ${[...new Set(fuera.map(f => f.capa))].join(', ')}): ${fuera.slice(0, 4).map(f => f.ruta).join('; ')}`);
  const esSuya = (f: Pieza3D) => e.capas.includes(f.capa) && (!e.es || (e.es.test(texto(f)) && !(e.no?.test(texto(f)))));
  // every piece of the part, whole
  const faltan = fs.filter(f => esSuya(f) && f.visibles < f.mallas);
  if (faltan.length) falla(donde, `faltan piezas suyas: ${faltan.slice(0, 5).map(f => `${f.capa}/${f.ruta} (${f.visibles}/${f.mallas})`).join('; ')}${faltan.length > 5 ? ` y ${faltan.length - 5} más` : ''}`);
  // and nothing else of its layers
  const sobran = vis.filter(f => e.capas.includes(f.capa) && !esSuya(f));
  if (sobran.length) falla(donde, `se ve lo que no es suyo: ${sobran.slice(0, 5).map(f => `${f.capa}/${f.ruta} [${f.componente || 'sin etiqueta'}]`).join('; ')}${sobran.length > 5 ? ` y ${sobran.length - 5} más` : ''}`);
  // on the screen, and big enough to see
  if (!v) falla(donde, 'dibuja piezas pero no caen en pantalla');
  else {
    const ancho = v.x1 - v.x0, alto = v.y1 - v.y0;
    if (v.x0 < -1.02 || v.x1 > 1.02 || v.y0 < -1.02 || v.y1 > 1.02) falla(donde, `se sale de la ventana (x ${v.x0.toFixed(2)}…${v.x1.toFixed(2)}, y ${v.y0.toFixed(2)}…${v.y1.toFixed(2)})`);
    if (Math.max(ancho, alto) < 0.3) falla(donde, `sale demasiado pequeño: ocupa el ${(Math.max(ancho, alto) * 50).toFixed(0)} % de la ventana`);
  }
  return firma(fs);
}

async function recorrer(nombre: string, cambios: Record<string, unknown>, deps: string[]) {
  const P = { ...PARAMETROS_TRICICLO, ...cambios } as Record<string, unknown>;
  console.log(`\n══ diseño «${nombre}»${MOVIL ? ' (móvil 390 px)' : ''}`);
  const page = await abrir(P, deps[0]);
  const alto = page.viewportSize()!.height;
  let ventanaMedida = false;
  for (const dep of deps) {
    const partes = partesDePestana(dep, P as never);
    console.log(`  ── ${NOMBRE_DEP[dep as keyof typeof NOMBRE_DEP]}: ${partes.map(p => p.nombre).join(' · ')}`);
    await page.locator('nav[aria-label="Departamentos"] button', { hasText: NOMBRE_DEP[dep as keyof typeof NOMBRE_DEP] }).first().click({ force: true, timeout: 120000 });
    await page.waitForTimeout(1500);
    if (partes.length >= 2) {
      const botones = (await page.locator(`nav[aria-label^="Partes"] button`).allInnerTexts()).map(t => t.split('\n')[0].trim());
      const esperados = ['Resumen', ...partes.map(p => p.nombre)];
      if (JSON.stringify(botones) !== JSON.stringify(esperados)) falla(`${nombre} · ${dep}`, `el submenú ofrece [${botones.join(', ')}] y debería ofrecer [${esperados.join(', ')}]`);
    }
    const firmas = new Map<string, string>();
    for (const s of partes) {
      const donde = `${nombre} · ${NOMBRE_DEP[dep as keyof typeof NOMBRE_DEP]} · ${s.nombre}`;
      if (partes.length >= 2) await page.locator('nav[aria-label^="Partes"] button', { hasText: new RegExp(`^\\s*${s.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).first().click({ force: true, timeout: 120000 });
      await page.waitForTimeout(800);
      const v = await quieto(page), fs = await piezas(page);
      const aviso = (await page.locator('[data-vacio-3d]').allInnerTexts())[0] ?? null;
      const dib = dibujadas(fs), mallas = dib.reduce((a, f) => a + f.visibles, 0);
      console.log(`  ${s.nombre.padEnd(18)} ${String(mallas).padStart(4)} mallas en ${[...new Set(dib.map(f => f.capa))].join('+') || '—'}${v ? `  pantalla ${(v.x0).toFixed(2)}…${v.x1.toFixed(2)} × ${v.y0.toFixed(2)}…${v.y1.toFixed(2)}` : ''}`);
      const f = comprobar(donde, s, fs, v, aviso);
      // two parts that draw exactly the same are the «no cambia lo que se ve» complaint
      for (const [otra, g] of firmas) if (f === g && dib.length) falla(donde, `se ve exactamente igual que «${otra}»`);
      firmas.set(s.nombre, f);
      if (!ventanaMedida && !(await page.locator('section[aria-label="Vista 3D"]').count() === 0)) {
        ventanaMedida = true;
        const caja = (await page.locator('section[aria-label="Vista 3D"]').boundingBox())!;
        const tope = MOVIL ? 0.46 : 0.52;
        console.log(`    ventana 3D: ${Math.round(caja.height)} px de ${alto} (${Math.round(caja.height / alto * 100)} %)`);
        if (caja.height > tope * alto) falla(donde, `la ventana 3D mide el ${Math.round(caja.height / alto * 100)} % de la pantalla (tope ${Math.round(tope * 100)} %)`);
      }
      const panel = page.locator(`section[aria-label="${NOMBRE_DEP[dep as keyof typeof NOMBRE_DEP]}: ${s.nombre}"]`);
      if (await panel.count()) { const pb = await panel.first().boundingBox(); if (pb && pb.y > alto - 60 && !MOVIL) falla(donde, `el panel de la parte empieza fuera de la primera pantalla (a ${Math.round(pb.y)} px de ${alto})`); }
    }
  }
  await page.context().close();
}

const diseños = (arg('diseno') ?? Object.keys(DISENOS).join(',')).split(',').filter(Boolean);
// (2026-11-27) one entry per TAB: «chasis» is inside «Chasis y carrocería» (`pestanaDe`)
const deps = [...new Set((arg('dep') ?? PESTANAS_CON_PARTES.join(',')).split(',').filter(Boolean).map(pestanaDe))];
for (const d of diseños) { if (!DISENOS[d]) { console.log(`diseño desconocido «${d}»: ${Object.keys(DISENOS).join(', ')}`); process.exit(2); } await recorrer(d, DISENOS[d], deps); }
await (await navegador()).close();

console.log(`\n${fallos.length ? `${fallos.length} FALLOS:\n${fallos.map(f => ` ✗ ${f}`).join('\n')}` : 'Todo OK'}`);
process.exit(fallos.length ? 1 : 0);
