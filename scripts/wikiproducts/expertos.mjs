#!/usr/bin/env node
// ============================================================================
// PAID EXPERT CONSULTATIONS ON THE WIKIPRODUCTS SITE (2026-10-18, W6)
// ============================================================================
// The «Reservar experto» block existed but nothing on the site offered it: the
// evaluator found no «experto» anywhere. This script, through /api/v1 and as
// the owner of the key:
//
//   1. creates the page «Consultar a un experto» (with the full block) as a
//      subpage of the site root, unless a page under the root already shows
//      an `experto` block;
//   2. gives the experts of `expertos.json` their place, once each: one that
//      already exists by name is left as it is (`only_new`), because after the
//      first run the panel on the page is where price and hours are changed;
//   3. adds the short version of the block to the sheet template of every
//      product table, right after the offers, unless it is already there.
//
// Idempotent, and it never deletes anything. With an empty expert list it
// still does 1 and 3: the block hides itself on a sheet while there are no
// experts, so nothing empty shows.
//
//   HW_API_KEY=hw_live_… node scripts/wikiproducts/expertos.mjs [--base http://localhost:3000] [--seco]
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
const conf = JSON.parse(readFileSync(path.join(dir, opcion('--config', 'expertos.json')), 'utf8'));

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
const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
/** Every block, nested ones included. */
const todos = l => (Array.isArray(l) ? l : []).flatMap(b => [b, ...todos(b?.bloques)]);

async function buscarPagina(id, titulo) {
  for (let cursor = null, n = 0; n < 20; n++) {
    const r = await api('GET', `/api/v1/pages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    const p = r.data.find(x => (id && x.id === id) || (!id && normal(x.title) === normal(titulo)));
    if (p) return p;
    cursor = r.next_cursor; if (!cursor) break;
  }
  return null;
}

// ── 1. The experts page ─────────────────────────────────────────────────────
console.log('== Página de expertos ==');
let paginaExpertos = null;
try {
  const c = conf.pagina;
  const madre = await buscarPagina(c.madre_id, c.madre_titulo);
  if (!madre) throw new Error(`No encuentro la página raíz «${c.madre_id || c.madre_titulo}».`);
  const pm = await api('GET', `/api/v1/pages/${madre.id}`);
  for (const b of todos(pm.blocks)) {
    if (b?.tipo !== 'subpagina' || !b.entityId) continue;
    try {
      const h = await api('GET', `/api/v1/pages/${b.entityId}`);
      if (todos(h.blocks).some(x => x?.tipo === 'experto')) { paginaExpertos = h; break; }
    } catch { /* a subpage that is gone */ }
  }
  if (paginaExpertos) console.log(`  ${paginaExpertos.title}: ya existía (${paginaExpertos.id})`);
  else {
    const nueva = await api('POST', '/api/v1/pages', { title: c.titulo, markdown: c.texto });
    await api('POST', `/api/v1/pages/${nueva.id}/blocks`, { block: { type: 'experto', data: { ...(c.bloque || {}) } } });
    await api('POST', `/api/v1/pages/${madre.id}/blocks`, { block: { type: 'subpage', page_id: nueva.id } });
    paginaExpertos = nueva;
    console.log(`  + ${c.titulo}: página nueva dentro de «${pm.title}» (${nueva.id})`);
  }
} catch (e) { fallos.push(`página: ${e.message}`); console.log(`  ✗ ${e.message}`); }

// ── 2. The experts ──────────────────────────────────────────────────────────
console.log('== Expertos ==');
if (!paginaExpertos?.id) console.log('  (sin página, no hay dónde darlos de alta)');
else if (!conf.expertos?.length) console.log('  ninguno en expertos.json: se dan de alta en el panel de la página');
else {
  try {
    const r = await api('PUT', `/api/v1/pages/${paginaExpertos.id}/experts`, { experts: conf.expertos, only_new: true });
    for (const x of r.experts || []) console.log(`  ${x.created ? '+' : '='} ${x.name}${x.untouched ? ' (ya estaba: lo manda el panel)' : ''}`);
  } catch (e) { fallos.push(`expertos: ${e.message}`); console.log(`  ✗ ${e.message}`); }
}

// ── 3. The short block in every product sheet ───────────────────────────────
console.log('== Fichas de producto ==');
const tablas = {};
for (const t of (await api('GET', '/api/v1/databases')).data) tablas[t.title] = t.id;
for (const t of esquema.tablas.filter(x => x.subcategoria)) {
  const id = tablas[t.titulo];
  if (!id) { console.log(`  · ${t.titulo}: no existe todavía`); continue; }
  try {
    // A second call returns the template that already exists.
    const plantilla = SECO ? null : (await api('PATCH', `/api/v1/databases/${id}`, { create_template: true })).template_page_id;
    if (!plantilla) { console.log(`  (seco) plantilla de ${t.titulo}`); continue; }
    const p = await api('GET', `/api/v1/pages/${plantilla}`);
    if (todos(p.blocks).some(b => b?.tipo === 'experto')) { console.log(`  ${t.titulo}: ya lo tenía`); continue; }
    const tras = (p.blocks || []).find(b => b?.tipo === conf.ficha.despues_de)?.id || null;
    const datos = { ...(conf.ficha.bloque || {}), ...(paginaExpertos?.id ? { pagina: paginaExpertos.id } : {}) };
    await api('POST', `/api/v1/pages/${plantilla}/blocks`, { block: { type: 'experto', data: datos }, after: tras });
    console.log(`  + ${t.titulo}: recuadro de expertos ${tras ? `tras «${conf.ficha.despues_de}»` : 'al final'}`);
  } catch (e) { fallos.push(`${t.titulo}: ${e.message}`); console.log(`  ✗ ${t.titulo}: ${e.message}`); }
}

console.log(`\nHecho: ${escrituras} escrituras, ${fallos.length} fallos.`);
if (fallos.length) { for (const f of fallos) console.log(`  ✗ ${f}`); process.exit(1); }
