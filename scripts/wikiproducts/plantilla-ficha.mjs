#!/usr/bin/env node
// ============================================================================
// THE ORDER OF EVERY PRODUCT SHEET (2026-10-18, W1)
// ============================================================================
// Eugenio: «inspírate en las landing pages de Amazon… que la información esté
// más compacta». The layout lives in `plantilla-ficha.json`; this script puts
// it on the sheet template of every product table, through /api/v1 and as the
// owner of the key. Every product page reads its blocks from that template,
// so one run reorders all the sheets.
//
// Idempotent: a template whose data blocks already follow the layout is not
// touched. Otherwise its data blocks are removed and the layout is added in
// order; a block of the same kind keeps its settings (the offers' or the
// ratings' options). Blocks that are not data blocks (text someone wrote on
// the template) stay where they are. A data block the layout does not name
// goes away — today that is the expert booking, dropped from the MVP
// (Eugenio, 2026-10-18: «quita lo de las consultas de expertos»).
//
//   HW_API_KEY=hw_live_… node scripts/wikiproducts/plantilla-ficha.mjs [--base http://localhost:3000] [--seco]
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
const { bloques: DISENO } = JSON.parse(readFileSync(path.join(dir, 'plantilla-ficha.json'), 'utf8'));
// The data block types (`TIPOS_BLOQUE_DATOS` in src/utils/bloques.ts).
const DE_DATOS = new Set(['propiedad', 'comparador', 'alternativas', 'afirmacion', 'retirada', 'ofertas', 'valoracion', 'experto', 'chat', 'secciones', 'menuTemas', 'contenidoTema']);

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
      console.log(`  … límite de la API, espero ${s} s`);
      await new Promise(ok => setTimeout(ok, s * 1000));
      continue;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status}: ${j.error || JSON.stringify(j)}`);
    return j;
  }
  throw new Error(`${metodo} ${ruta}: demasiados reintentos`);
}

/** What makes two blocks «the same place» in the layout. */
const clave = b => {
  const d = b.datos || {};
  return b.tipo === 'propiedad' ? `propiedad:${d.estilo || 'tabla'}:${d.grupo || d.rol || ''}` : b.tipo;
};
const igual = (a, b) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {});

const tablas = (await api('GET', '/api/v1/databases')).data;
let cambiadas = 0;
for (const t of esquema.tablas.filter(x => x.subcategoria)) {
  const tabla = tablas.find(x => x.title === t.titulo);
  if (!tabla) { console.log(`! ${t.titulo}: no existe todavía (crear-esquema.mjs primero)`); continue; }
  // A second call returns the template that already exists.
  const plantilla = (await api('PATCH', `/api/v1/databases/${tabla.id}`, { create_template: true })).template_page_id;
  if (!plantilla) { console.log(`  (seco) plantilla de ${t.titulo}`); continue; }
  const pagina = await api('GET', `/api/v1/pages/${plantilla}`);
  const actuales = (pagina.blocks || []).filter(b => DE_DATOS.has(b?.tipo));
  const previos = new Map(actuales.map(b => [clave(b), b]));
  // Same kind of block: its own settings first, the layout's title and style on top.
  const objetivo = DISENO.map(b => ({ tipo: b.tipo, datos: { ...(previos.get(clave(b))?.datos || {}), ...b.datos } }));
  if (actuales.length === objetivo.length && actuales.every((b, i) => b.tipo === objetivo[i].tipo && igual(b.datos, objetivo[i].datos))) {
    console.log(`= ${t.titulo}: la ficha ya tiene este orden`);
    continue;
  }
  console.log(`~ ${t.titulo}: ${actuales.length} bloques → ${objetivo.length}${actuales.some(b => b.tipo === 'experto') ? ' (sin el de expertos)' : ''}`);
  for (const b of actuales) await api('DELETE', `/api/v1/pages/${plantilla}/blocks/${b.id}`);
  let tras = null;
  for (const b of objetivo) {
    const r = await api('POST', `/api/v1/pages/${plantilla}/blocks`, { block: { type: b.tipo, data: b.datos }, after: tras });
    tras = r.block?.id ?? null;
  }
  cambiadas++;
}
console.log(`\nHecho: ${cambiadas} plantillas de ficha reordenadas.`);
