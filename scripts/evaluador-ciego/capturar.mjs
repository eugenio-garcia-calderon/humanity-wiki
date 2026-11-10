// ============================================================================
// EVALUADOR CIEGO — the captures (2026-11-10, Eugenio)
// ============================================================================
// Eugenio: «genera un bot que te puntúe del 1 al 10 la sofisticación, la calidad
// del contenido, la visualización, la experiencia de usuario … que no sepa de qué
// va la historia y que te diga más o menos lo que se intenta transmitir».
//
// This script makes what the blind evaluator looks at: screenshots of a page
// (desktop, phone, each section, and optional interaction states) plus its
// visible text. The evaluator itself is an AI agent with NO context about the
// project, given only this folder and PROMPT.md. See README.md.
//
//   node scripts/evaluador-ciego/capturar.mjs <url> <carpeta> [estados.json]
//
// estados.json (optional): [{ "nombre": "anillo-region", "pasos": [{ "hover": "css selector" } | { "foco": "…" } | { "click": "…" } | { "esperar": 500 }], "captura": "css selector or empty for the viewport" }]
// Uses the system Chrome when there is one (CHROME env var or /usr/bin/google-chrome).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const [url, carpeta, estadosRuta] = process.argv.slice(2);
if (!url || !carpeta) { console.error('Uso: node capturar.mjs <url> <carpeta> [estados.json]'); process.exit(1); }
fs.mkdirSync(carpeta, { recursive: true });
const chrome = process.env.CHROME || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
const errores = [];
const f = n => path.join(carpeta, n);

for (const [nombre, vp] of [['escritorio', { width: 1440, height: 900 }], ['movil', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', e => errores.push(`${nombre}: ${e.message}`));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  // The sticky header would cover each section's capture: hide it there.
  await page.screenshot({ path: f(`${nombre}-01-portada.png`) });
  if (nombre === 'movil') {
    // A page wider than the phone scrolls sideways: the evaluator cannot see that, so say it.
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    if (ancho > vp.width) errores.push(`movil: la página mide ${ancho} px de ancho en una pantalla de ${vp.width} px`);
    // One phone screen at the start of every section, so the evaluator sees all of them.
    const ids = await page.evaluate(() => [...document.querySelectorAll('main > section[id]')].map(s => s.id));
    let k = 2;
    for (const id of ids) {
      await page.evaluate(i => document.getElementById(i)?.scrollIntoView({ block: 'start' }), id);
      await page.waitForTimeout(300);
      await page.screenshot({ path: f(`movil-${String(k++).padStart(2, '0')}-${id}.png`) });
    }
  } else {
    fs.writeFileSync(f('texto.txt'), await page.evaluate(() => (document.querySelector('main') || document.body).innerText));
    await page.addStyleTag({ content: 'header.sticky{position:static!important}' });
    const ids = await page.evaluate(() => [...document.querySelectorAll('main > section[id]')].map(s => s.id));
    let k = 2;
    for (const id of ids) {
      const el = await page.$(`#${id}`);
      await el.screenshot({ path: f(`escritorio-${String(k++).padStart(2, '0')}-${id}.png`) });
    }
    if (estadosRuta) {
      for (const e of JSON.parse(fs.readFileSync(estadosRuta, 'utf8'))) {
        for (const p of e.pasos) {
          if (p.hover) await page.hover(p.hover);
          if (p.foco) await page.focus(p.foco);
          if (p.click) await page.click(p.click);
          if (p.esperar) await page.waitForTimeout(p.esperar);
        }
        await page.waitForTimeout(400);
        const el = e.captura ? await page.$(e.captura) : null;
        await (el || page).screenshot({ path: f(`estado-${e.nombre}.png`) });
      }
    }
  }
  await ctx.close();
}
await browser.close();
console.log(errores.length ? `Errores de la página:\n${errores.join('\n')}` : 'Capturas hechas, sin errores de la página.');
