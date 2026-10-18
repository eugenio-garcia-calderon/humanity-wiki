#!/usr/bin/env node
// ============================================================================
// CREATE THE WIKIPRODUCTS DATABASES (2026-10-18, W1)
// ============================================================================
// Reads `esquema-bd.json` (next to this file) and creates, through /api/v1 and
// as the owner of the key, every table and column that does not exist yet.
// Idempotent: run it again and it only adds what is missing — a table is
// recognised by its title, a column by `config.clave` (or its name). It never
// renames, retypes or deletes anything: changing a column that already holds
// data is a decision for a person, not for a script.
//
//   HW_API_KEY=hw_live_… node scripts/wikiproducts/crear-esquema.mjs \
//       [--base http://localhost:3000] [--plantillas] [--salida ids.json]
//
//   --plantillas  also give each product table its sheet template (a page with
//                 the default layout, see `src/server/bd/plantillaFicha.ts`).
//   --salida      writes {table_key: {id, columns: {column_key: id}}} for the
//                 loaders (`cargar.mjs`).
//
// The key needs write scope. Writes are limited to 30 a minute per key; on a
// 429 the script waits what the server says and carries on.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opcion = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const BASE = (opcion('--base', process.env.HW_BASE || 'http://localhost:3000')).replace(/\/$/, '');
const CLAVE = process.env.HW_API_KEY;
const PLANTILLAS = args.includes('--plantillas');
const SALIDA = opcion('--salida', null);
if (!CLAVE) { console.error('Falta HW_API_KEY (una clave hw_live_… con alcance de escritura).'); process.exit(1); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const esquema = JSON.parse(readFileSync(path.join(dir, 'esquema-bd.json'), 'utf8'));
const PRODUCTO = new Set(esquema.tablas.filter(t => t.subcategoria).map(t => t.clave));

async function api(metodo, ruta, cuerpo) {
  for (let intento = 0; intento < 6; intento++) {
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
    if (!r.ok) throw new Error(`${metodo} ${ruta} → ${r.status}: ${j.error || JSON.stringify(j)}${j.fallos ? ' ' + JSON.stringify(j.fallos) : ''}`);
    return j;
  }
  throw new Error(`${metodo} ${ruta}: demasiados reintentos`);
}

/** The column as the API takes it, with keys resolved to ids. `null` when it
 *  depends on something that does not exist yet. */
function columnaParaApi(c, ids, tablaClave) {
  const config = { ...c.config };
  if (config.tabla_destino_clave) {
    const destino = ids[config.tabla_destino_clave]?.id;
    if (!destino) return null;
    config.tabla_destino = destino;
    delete config.tabla_destino_clave;
  }
  if (config.agregado) {
    const a = config.agregado;
    const rel = ids[tablaClave]?.columns[a.columna_relacion_clave];
    if (!rel) return null;
    const relDef = esquema.tablas.find(t => t.clave === tablaClave).columnas.find(x => x.clave === a.columna_relacion_clave);
    const destinoTabla = relDef.config.tabla_destino_clave;
    config.columna_relacion = rel;
    config.operacion = a.operacion;
    config.direccion = 'origen';
    if (a.columna_destino_clave) {
      const d = ids[destinoTabla]?.columns[a.columna_destino_clave];
      if (!d) return null;
      config.columna_destino = d;
    }
    delete config.agregado;
  }
  return { name: c.nombre, type: c.tipo, options: c.opciones, config };
}

const ids = {};
const creadas = { tablas: 0, columnas: 0 };

const existentes = (await api('GET', '/api/v1/databases')).data;
for (const t of esquema.tablas) {
  let tabla = existentes.find(x => x.title === t.titulo);
  if (!tabla) {
    tabla = await api('POST', '/api/v1/databases', { title: t.titulo, description: t.descripcion, icon: t.icono });
    creadas.tablas++;
    console.log(`+ ${t.titulo}`);
  } else console.log(`= ${t.titulo}`);
  const def = await api('GET', `/api/v1/databases/${tabla.id}`);
  ids[t.clave] = { id: tabla.id, columns: {} };
  const porClave = new Map(def.columns.filter(c => c.config?.clave).map(c => [c.config.clave, c]));
  const porNombre = new Map(def.columns.map(c => [c.name.toLowerCase(), c]));
  for (const c of t.columnas) {
    const ya = porClave.get(c.clave) || porNombre.get(c.nombre.toLowerCase());
    if (ya) { ids[t.clave].columns[c.clave] = ya.id; continue; }
    const cuerpo = columnaParaApi(c, ids, t.clave);
    if (!cuerpo) { console.log(`  ! ${c.nombre}: depende de algo que aún no existe; vuelve a ejecutar`); continue; }
    const nueva = await api('POST', `/api/v1/databases/${tabla.id}/columns`, cuerpo);
    ids[t.clave].columns[c.clave] = nueva.id;
    creadas.columnas++;
    console.log(`  + ${c.nombre}${nueva.warning ? ` (${nueva.warning})` : ''}`);
  }
  // The «Nombre» column every table is born with gets its key too, so the
  // loaders can address it like any other.
  const nombre = def.columns.find(c => c.name === 'Nombre');
  if (nombre && !ids[t.clave].columns.nombre) ids[t.clave].columns.nombre = nombre.id;
  if (PLANTILLAS && PRODUCTO.has(t.clave)) {
    const p = await api('PATCH', `/api/v1/databases/${tabla.id}`, { create_template: true });
    ids[t.clave].template_page_id = p.template_page_id;
    console.log(`  plantilla de ficha: ${p.template_page_id}`);
  }
}

console.log(`\nHecho: ${creadas.tablas} tablas y ${creadas.columnas} columnas nuevas.`);
if (SALIDA) { writeFileSync(SALIDA, JSON.stringify(ids, null, 2)); console.log(`Identificadores en ${SALIDA}`); }
