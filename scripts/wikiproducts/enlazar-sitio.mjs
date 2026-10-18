#!/usr/bin/env node
// ============================================================================
// PUT THE WIKIPRODUCTS DATABASES INTO THE SITE (2026-10-18, W3a)
// ============================================================================
// A table has no visibility of its own: a visitor sees it only when a
// published page shows it in a «basedatos» block (`sitios.ts`, tablaVisible).
// After `cargar.mjs` the tables were full and nobody could see them. This
// script, through /api/v1 and as the owner of the key:
//
//   1. adds to each subcategory page the gallery of its products table,
//      removes the «se están cargando» notice and folds (closed) each heading
//      with text under it above the gallery, so a phone sees products first;
//   2. gives the four supporting tables (brands, shops, ad claims, recalls) a
//      page each, inside «Cómo trabajamos», so the brand, claims and recalls
//      linked from a product sheet can be seen too (a link to a table nobody
//      can read is not shown, `bd.ts` /relaciones);
//   3. recomputes the readable address of every row (/powerbanks/anker-…);
//   4. (W2, 2026-10-18) gives the home page a «Secciones del sitio» block: the
//      five subcategories with a picture and how many products each has; gives
//      each category page the same cards for its own subcategories
//      (`ambito: 'pagina'`); and drops the old lists' headings and paragraphs,
//      keeping their subpage links, which the reader hides (`enTarjetas`);
//   5. (W2) adds to the site menu the links of `sitio.json` → `menu` that are
//      missing (POST /api/v1/pages/:id/site/menu/links). A link to a page
//      that does not exist yet is left for the next run, not a failure. Then
//      removes the links of `sitio.json` → `quitar_del_menu` that go to the
//      home page («Inicio»: the site name already links there, and the link
//      cost the bar the room it needed at 1,024 px).
//
// The offers tables need no page: whoever sees a product sheet sees its offers
// when both tables have the same owner (`ofertas.ts`, W5 #609).
//
// Idempotent: a page that already shows its table is left alone, a notice
// that is gone is not looked for again, a supporting page is found again by
// the table it shows. It never deletes a page or a row; the only things it
// removes are the notice block, the old category lists' headings and
// paragraphs and the menu links of `quitar_del_menu` (pages keep their
// history, so each removal can be undone).
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
    // (W2, evaluator round 2) On the phone the buying guide («Qué conviene
    // mirar» and its list) pushed every product below the fold. Each heading
    // above the gallery that has text under it is folded, closed: one line
    // until someone opens it. Nothing is deleted, and the server HTML still
    // carries the text for search engines.
    let plegados = 0;
    const r = (puesto || quitados) && !SECO ? await api('GET', `/api/v1/pages/${s.pagina}`) : q;
    const bl = r.blocks || [];
    const galeria = bl.findIndex(b => b?.tipo === 'basedatos');
    for (let i = 0; i < galeria; i++) {
      const b = bl[i];
      if (!/^titulo[23]$/.test(b?.tipo || '') || b.plegable) continue;
      const siguiente = bl[i + 1];
      if (!siguiente || /^titulo[123]$/.test(siguiente.tipo || '') || siguiente.tipo === 'basedatos') continue;
      await api('POST', `/api/v1/pages/${s.pagina}/blocks/${encodeURIComponent(b.id)}/fold`, {});
      plegados++;
      // What it folded is no longer at the top level: skip it, as the API does.
      const nivel = Number(b.tipo.slice(-1));
      while (i + 1 < galeria && !(/^titulo[123]$/.test(bl[i + 1]?.tipo || '') && Number(bl[i + 1].tipo.slice(-1)) <= nivel)) i++;
    }
    const linea = `${p.title}: ${puesto ? `+ galería de «${tituloDe(s.tabla)}»` : 'ya enseñaba su tabla'}${quitados ? `, − ${quitados} aviso(s) de carga` : ''}${plegados ? `, ${plegados} guía(s) plegada(s)` : ''}`;
    console.log(`  ${linea}`); if (puesto || quitados || plegados) hechos.push(linea);
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

/**
 * The subpage links of `pagina` that point at `ids` are drawn as section cards
 * (the reader hides those links; they stay, because they say what hangs from
 * what). This removes what introduced each link: a «###» heading with the
 * linked page's title and the paragraph right under it, and then a «##»
 * heading left with nothing visible under it. With `poner`, it first adds the
 * cards block (`ambito: 'pagina'`) where the list began. Nothing else is
 * touched, and every removal stays in the page's history.
 */
async function enTarjetas(pagina, ids, poner) {
  let bl = pagina.blocks || [];
  const enlaces = bl.filter(b => b?.tipo === 'subpagina' && ids.has(b.entityId));
  if (!enlaces.length) return;
  const titulos = new Set(enlaces.map(b => normal(b.pubTitulo)).filter(Boolean));
  const quitar = new Set();
  bl.forEach((b, i) => {
    if (b?.tipo !== 'titulo3' || !titulos.has(normal(b.texto))) return;
    quitar.add(b.id);
    if (bl[i + 1]?.tipo === 'parrafo') quitar.add(bl[i + 1].id);
  });
  bl.forEach((b, i) => {
    if (b?.tipo !== 'titulo2') return;
    let fin = bl.findIndex((x, j) => j > i && /^titulo[12]$/.test(x?.tipo || ''));
    if (fin < 0) fin = bl.length;
    const queda = bl.slice(i + 1, fin).filter(x => !quitar.has(x.id));
    if (queda.length && queda.every(x => x.tipo === 'subpagina' && ids.has(x.entityId))) quitar.add(b.id);
  });
  if (poner && !todos(bl).some(b => b?.tipo === 'secciones')) {
    const desde = bl.findIndex(b => quitar.has(b.id) || (b?.tipo === 'subpagina' && ids.has(b.entityId)));
    await api('POST', `/api/v1/pages/${pagina.id}/blocks`, { block: { type: 'secciones', data: { titulo: '', ambito: 'pagina' } }, after: desde > 0 ? bl[desde - 1].id : null });
    const linea = `${pagina.title}: + tarjetas de sus subcategorías`;
    console.log(`  + ${linea}`); hechos.push(linea);
  }
  for (const id of quitar) await api('DELETE', `/api/v1/pages/${pagina.id}/blocks/${encodeURIComponent(id)}`);
  if (quitar.size) {
    const linea = `${pagina.title}: − ${quitar.size} títulos y textos de la lista vieja (ya están en las tarjetas)`;
    console.log(`  ${linea}`); hechos.push(linea);
  }
}

// ── 4. The home page shows the site's sections (W2, evaluator round 1) ─────
console.log('== Portada ==');
let portada = null;
try {
  const m = sitio.portada;
  if (m) {
    if (m.id) portada = { id: m.id };
    for (let cursor = null, n = 0; !portada && n < 20; n++) {
      const r = await api('GET', `/api/v1/pages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      portada = r.data.find(p => (m.id && p.id === m.id) || (!m.id && normal(p.title) === normal(m.titulo))) || null;
      cursor = r.next_cursor; if (!cursor) break;
    }
    if (!portada) throw new Error(`No encuentro la página «${m.titulo}».`);
    const p = await api('GET', `/api/v1/pages/${portada.id}`);
    if (todos(p.blocks).some(b => b?.tipo === 'secciones')) console.log(`  ${p.title}: ya enseñaba las secciones`);
    else {
      // Before the first heading: right under the introduction, above the fold.
      const i = (p.blocks || []).findIndex(b => /^titulo[123]$/.test(b?.tipo || ''));
      const after = i > 0 ? p.blocks[i - 1].id : null;
      await api('POST', `/api/v1/pages/${portada.id}/blocks`, { block: { type: 'secciones', data: { titulo: m.bloque_titulo || '' } }, after });
      const linea = `${p.title}: + bloque «Secciones del sitio»`;
      console.log(`  + ${linea}`); hechos.push(linea);
    }

    // 4b. Each category (a subpage of the home page whose own subpages are the
    // subcategories) shows them as cards too, not as a list of links; and the
    // headings and paragraphs that introduced each link, on the home page and
    // in each category, go: the cards already carry the name and the text.
    const subcats = new Set(sitio.subcategorias.map(x => x.pagina));
    const hijas = (await api('GET', `/api/v1/pages/${portada.id}`)).blocks?.filter(b => b?.tipo === 'subpagina' && b.entityId) || [];
    const categorias = new Set();
    for (const h of hijas) {
      const c = await api('GET', `/api/v1/pages/${h.entityId}`);
      if (!(c.blocks || []).some(b => b?.tipo === 'subpagina' && subcats.has(b.entityId))) continue;
      categorias.add(c.id);
      await enTarjetas(c, subcats, true);
    }
    await enTarjetas(await api('GET', `/api/v1/pages/${portada.id}`), categorias, false);
  }
} catch (e) { fallos.push(`portada: ${e.message}`); console.log(`  ✗ ${e.message}`); }

// ── 5. The site menu (W2) ───────────────────────────────────────────────────
console.log('== Menú ==');
if ((sitio.menu?.length || sitio.quitar_del_menu?.length) && portada) {
  try {
    const actual = await api('GET', `/api/v1/pages/${portada.id}/site`);
    let paginas = null;
    for (const l of sitio.menu || []) {
      if (!paginas) {
        paginas = [];
        for (let cursor = null, n = 0; n < 20; n++) {
          const r = await api('GET', `/api/v1/pages?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
          paginas.push(...r.data); cursor = r.next_cursor; if (!cursor) break;
        }
      }
      const destino = paginas.find(p => (l.pagina_id && p.id === l.pagina_id) || (!l.pagina_id && normal(p.title) === normal(l.pagina_titulo)));
      if (!destino) { console.log(`  ${l.texto}: la página «${l.pagina_titulo}» todavía no existe, se deja para la siguiente pasada`); continue; }
      if (actual.menu.links.some(e => e?.destino?.tipo === 'pagina' && e.destino.id === destino.id)) { console.log(`  ${l.texto}: ya estaba en el menú`); continue; }
      await api('POST', `/api/v1/pages/${portada.id}/site/menu/links`, { link: { text: l.texto, page_id: destino.id } });
      const linea = `menú: + «${l.texto}» → ${destino.title}`;
      console.log(`  + ${linea}`); hechos.push(linea);
    }
    // Only a link to the home page with that text: a link someone added to a
    // real page called «Inicio» is not ours to remove.
    const aPortada = (e) => e?.destino?.tipo === 'inicio' || (e?.destino?.tipo === 'url' && e.destino.url === '/');
    for (const texto of sitio.quitar_del_menu || []) {
      const sobran = actual.menu.links.filter(e => aPortada(e) && normal(e.texto) === normal(texto));
      if (!sobran.length) { console.log(`  ${texto}: no está en el menú`); continue; }
      for (const e of sobran) {
        await api('DELETE', `/api/v1/pages/${portada.id}/site/menu/links/${encodeURIComponent(e.id)}`);
        const linea = `menú: − «${e.texto}» (la portada ya se abre desde el nombre del sitio)`;
        console.log(`  ${linea}`); hechos.push(linea);
      }
    }
  } catch (e) { fallos.push(`menú: ${e.message}`); console.log(`  ✗ ${e.message}`); }
}

console.log(`\nHecho: ${hechos.length} cambios, ${escrituras} escrituras, ${fallos.length} fallos.`);
if (fallos.length) { for (const f of fallos) console.log(`  ✗ ${f}`); process.exit(1); }
