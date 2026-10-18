#!/usr/bin/env node
// ============================================================================
// PUT THE WIKIPRODUCTS DATABASES INTO THE SITE (2026-10-18, W3a)
// ============================================================================
// A table has no visibility of its own: a visitor sees it only when a
// published page shows it in a «basedatos» block (`sitios.ts`, tablaVisible).
// After `cargar.mjs` the tables were full and nobody could see them. This
// script, through /api/v1 and as the owner of the key:
//
//   1. adds to each subcategory page the gallery of its products table and
//      removes the «se están cargando» notice;
//   2. gives the four supporting tables (brands, shops, ad claims, recalls) a
//      page each, inside «Cómo trabajamos», so the brand, claims and recalls
//      linked from a product sheet can be seen too (a link to a table nobody
//      can read is not shown, `bd.ts` /relaciones);
//   3. recomputes the readable address of every row (/powerbanks/anker-…).
//
// The offers tables need no page: whoever sees a product sheet sees its offers
// when both tables have the same owner (`ofertas.ts`, W5 #609).
//
// Idempotent: a page that already shows its table is left alone, a notice
// that is gone is not looked for again, a supporting page is found again by
// the table it shows. It never deletes a page or a row; the only thing it
// removes is the notice block.
//
//   HW_API_KEY=hw_live_… node scripts/wikiproducts/enlazar-sitio.mjs [--base http://localhost:3000] [--seco]
//
// `sitio.json` (next to this file) says which page is which. Pages are named
// by id because titles are Eugenio's to change.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opcion = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const BASE = (opcion('--base', process.env.HW_BASE || process.env.HW_URL || 'http://localhost:3000')).replace(/\/$/, '');
const CLAVE = process.env.HW_API_KEY;
const SECO = args.includes('--seco');
if (!CLAVE) { console.error('Falta HW_API_KEY (una clave hw_live_… con alcance de escritura).'); process.exit(1); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const esquema = JSON.parse(readFileSync(path.join(dir, 'esquema-bd.json'), 'utf8'));
const sitio = JSON.parse(readFileSync(path.join(dir, 'sitio.json'), 'utf8'));
const tituloDe = clave => esquema.tablas.find(t => t.clave === clave)?.titulo;

let escrituras = 0;
async function api(metodo, ruta, cuerpo) {
  if (SECO && metodo !== 'GET') { console.log(`  (seco) ${metodo} ${ruta}`); return {}; }
  for (let intento = 0; intento < 8; intento++) {
    const r = await fetch(BASE + ruta, {
      method: metodo,
      headers: { Authorization: `Bearer ${CLAVE}`, 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    if (r.status === 429) {
      const s = Number(r.headers.get('retry-after')) || 10;
      process.stdout.write(`  … límite de la API, espero ${s} s\n`);
      await new Promise(ok => setTimeout(ok, s * 1000));
      continue;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(`${metodo} ${ruta} → ${r.status}: ${j.error || JSON.stringify(j)}`); e.status = r.status; throw e; }
    if (metodo !== 'GET') escrituras++;
    return j;
  }
  throw new Error(`${metodo} ${ruta}: demasiados reintentos`);
}

const fallos = [];
const hechos = [];
const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** Every block, nested ones included. */
const todos = l => (Array.isArray(l) ? l : []).flatMap(b => [b, ...todos(b?.bloques)]);
const muestra = (p, tabla) => todos(p.blocks).some(b => b?.tipo === 'basedatos' && b.tabla_id === tabla);

// ── The tables, by title ────────────────────────────────────────────────────
const tablas = {};
for (const t of (await api('GET', '/api/v1/databases')).data) tablas[t.title] = t.id;
const idTabla = clave => {
  const id = tablas[tituloDe(clave)];
  if (!id) throw new Error(`No existe la base de datos «${tituloDe(clave) || clave}». Ejecuta antes crear-esquema.mjs y cargar.mjs.`);
  return id;
};

/** Adds the table's gallery to the page unless it already shows it. */
async function ponerTabla(pagina, clave, vista) {
  const tabla = idTabla(clave);
  if (muestra(pagina, tabla)) return false;
  await api('POST', `/api/v1/pages/${pagina.id}/blocks`, { block: { type: 'database', database_id: tabla, view: vista } });
  return true;
}

// ── 1. Subcategory pages ────────────────────────────────────────────────────
const aviso = new RegExp(sitio.aviso, 'i');
console.log('== Subcategorías ==');
for (const s of sitio.subcategorias) {
  try {
    const p = await api('GET', `/api/v1/pages/${s.pagina}`);
    const puesto = await ponerTabla(p, s.tabla, s.vista || 'galeria');
    let quitados = 0;
    // Re-read after adding: the block list and the version changed.
    const q = puesto && !SECO ? await api('GET', `/api/v1/pages/${s.pagina}`) : p;
    for (const b of todos(q.blocks)) {
      if (b?.tipo === 'basedatos' || typeof b?.texto !== 'string' || !aviso.test(b.texto)) continue;
      await api('DELETE', `/api/v1/pages/${s.pagina}/blocks/${b.id}`);
      quitados++;
    }
    const linea = `${p.title}: ${puesto ? `+ galería de «${tituloDe(s.tabla)}»` : 'ya enseñaba su tabla'}${quitados ? `, − ${quitados} aviso(s) de carga` : ''}`;
    console.log(`  ${linea}`); if (puesto || quitados) hechos.push(linea);
  } catch (e) { fallos.push(`${s.tabla}: ${e.message}`); console.log(`  ✗ ${s.tabla}: ${e.message}`); }
}

// ── 2. The supporting tables, one page each inside «Cómo trabajamos» ──────
console.log('== Páginas de datos ==');
try {
  const m = sitio.datos;
  let madre = null;
  for (let cursor = null, n = 0; !madre && n < 20; n++) {
    const r = await api('GET', `/api/v1/pages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    madre = r.data.find(p => (m.madre_id && p.id === m.madre_id) || normal(p.title) === normal(m.madre_titulo)) || null;
    cursor = r.next_cursor; if (!cursor) break;
  }
  if (!madre) throw new Error(`No encuentro la página «${m.madre_titulo}».`);
  let pm = await api('GET', `/api/v1/pages/${madre.id}`);
  // Its subpages, to find a supporting page made by an earlier run.
  const hijas = [];
  for (const b of todos(pm.blocks)) {
    if (b?.tipo !== 'subpagina' || !b.entityId) continue;
    try { hijas.push(await api('GET', `/api/v1/pages/${b.entityId}`)); } catch { /* a subpage that is gone */ }
  }
  for (const d of m.paginas) {
    try {
      const tabla = idTabla(d.tabla);
      const ya = hijas.find(h => muestra(h, tabla));
      if (ya) { console.log(`  ${ya.title}: ya existía`); continue; }
      const nueva = await api('POST', '/api/v1/pages', { title: d.titulo, markdown: d.texto });
      await ponerTabla({ id: nueva.id, blocks: [] }, d.tabla, d.vista || 'galeria');
      await api('POST', `/api/v1/pages/${madre.id}/blocks`, { block: { type: 'subpage', page_id: nueva.id } });
      const linea = `${d.titulo}: página nueva dentro de «${pm.title}», con la tabla «${tituloDe(d.tabla)}»`;
      console.log(`  + ${linea}`); hechos.push(linea);
    } catch (e) { fallos.push(`${d.tabla}: ${e.message}`); console.log(`  ✗ ${d.tabla}: ${e.message}`); }
  }
} catch (e) { fallos.push(`páginas de datos: ${e.message}`); console.log(`  ✗ ${e.message}`); }

// ── 3. Readable addresses ───────────────────────────────────────────────────
console.log('== Direcciones de las fichas ==');
let rutas = 0;
// Every table that has a route template (products, and since W2 #620 brands,
// shops, claims and recalls too). A table without one answers 400: skipped.
for (const t of esquema.tablas) {
  if (!tablas[t.titulo]) continue;
  try { rutas += (await api('POST', `/api/v1/databases/${tablas[t.titulo]}/routes`)).routes_updated || 0; }
  catch (e) { if (e.status !== 400) fallos.push(`rutas ${t.clave}: ${e.message}`); }
}
console.log(`  ${rutas} direcciones puestas al día`);

console.log(`\nHecho: ${hechos.length} cambios, ${escrituras} escrituras, ${fallos.length} fallos.`);
if (fallos.length) { for (const f of fallos) console.log(`  ✗ ${f}`); process.exit(1); }
