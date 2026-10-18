#!/usr/bin/env node
// ============================================================================
// LOAD THE WIKIPRODUCTS PRODUCT DATA (2026-10-18, W3)
// ============================================================================
// Reads the researched data in `datos/portatil/` and `datos/domestico/` (next
// to this file) and writes it, through /api/v1 and as the owner of the key,
// into the databases that `crear-esquema.mjs` made from `esquema-bd.json`.
//
//   HW_API_KEY=hw_live_… node scripts/wikiproducts/cargar.mjs \
//       [--base http://localhost:3005] [--solo portatil|domestico] [--seco]
//
//   --seco   no network: builds every row against `esquema-bd.json` and says
//            what would be written, which data keys have no column and which
//            values a column would refuse. Run it before a real load.
//   --solo   only one of the two data folders.
//   --detalle  print each changed cell, old → new.
//
// IDEMPOTENT. A row is recognised by its «Nombre» (the title of its page):
// products by their name, brands and shops by theirs, claims, recalls and
// offers by a title built from the product (see `titulo*` below). Run it again
// and it only writes cells whose value changed; it never deletes a row — a row
// that is no longer in the data is reported, and removing it is a person's call
// (house rule: knowledge is archived, not deleted).
//
// PROVENANCE. Every value in the data is {valor, naturaleza, fuente, fecha,
// nota}. The value goes to the cell; the rest goes to the row's `provenance`
// for that column (W1, `bd/plantillaFicha.ts`), so the sheet can say «según la
// marca», «medido por…» or «el fabricante no publica». A `no_publicado` value
// leaves the cell empty and still records its provenance.
//
// The key needs write scope. Writes are limited to 30 a minute per key; on a
// 429 the script waits what the server says and carries on.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opcion = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const BASE = (opcion('--base', process.env.HW_BASE || process.env.HW_URL || 'http://localhost:3000')).replace(/\/$/, '');
const CLAVE = process.env.HW_API_KEY;
const SECO = args.includes('--seco');
const DETALLE = args.includes('--detalle');
const SOLO = opcion('--solo', null);
const dir = path.dirname(fileURLToPath(import.meta.url));
const RUTA_ESQUEMA = opcion('--esquema', path.join(dir, 'esquema-bd.json'));
if (!SECO && !CLAVE) { console.error('Falta HW_API_KEY (una clave hw_live_… con alcance de escritura). Para probar sin servidor: --seco'); process.exit(1); }
if (!existsSync(RUTA_ESQUEMA)) { console.error(`No encuentro ${RUTA_ESQUEMA} (lo deja el frente W1 junto a crear-esquema.mjs).`); process.exit(1); }

const leer = f => JSON.parse(readFileSync(f, 'utf8'));
const esquema = leer(RUTA_ESQUEMA);
const tablaDef = clave => esquema.tablas.find(t => t.clave === clave);

// ── 1. THE DATA ──────────────────────────────────────────────────────────────
// Which product table each data file goes to. Power stations share the
// power bank table (plan §2.0), told apart by «Tipo».
const FICHEROS = [
  { carpeta: 'portatil', fichero: 'powerbanks.json', tabla: 'powerbanks', tipo: 'Powerbank' },
  { carpeta: 'portatil', fichero: 'estaciones.json', tabla: 'powerbanks', tipo: 'Estación de energía portátil' },
  { carpeta: 'portatil', fichero: 'paneles.json', tabla: 'paneles-solares-portatiles' },
  { carpeta: 'portatil', fichero: 'luces.json', tabla: 'luces-solares-portatiles' },
  { carpeta: 'domestico', fichero: 'paneles.json', tabla: 'paneles-solares-domesticos' },
  { carpeta: 'domestico', fichero: 'baterias.json', tabla: 'baterias-domesticas' },
].filter(f => !SOLO || f.carpeta === SOLO);
const carpetas = [...new Set(FICHEROS.map(f => f.carpeta))];

const productos = [];
for (const f of FICHEROS) {
  const ruta = path.join(dir, 'datos', f.carpeta, f.fichero);
  if (!existsSync(ruta)) { console.log(`  (no está ${f.carpeta}/${f.fichero}: se salta)`); continue; }
  for (const p of leer(ruta).productos) productos.push({ ...p, _tabla: f.tabla, _tipo: f.tipo, _origen: `${f.carpeta}/${f.fichero}` });
}
// Brands and shops of both folders, merged by id: the fuller record wins and
// fills its gaps from the other (Anker and EcoFlow are in both).
const nombresDistintos = [];
const lleno = o => Object.values(o).filter(v => v != null && v !== '' && !(Array.isArray(v) && !v.length)).length;
const unirPorId = lista => {
  const m = new Map();
  for (const x of lista) {
    const a = m.get(x.id);
    if (!a) { m.set(x.id, x); continue; }
    const [mas, menos] = lleno(x) > lleno(a) ? [x, a] : [a, x];
    // The name is what the sheet shows and how a row is found again: the first
    // one seen wins (portable before home), and a mismatch is reported.
    const out = { ...mas, nombre: a.nombre };
    if (x.nombre !== a.nombre) nombresDistintos.push(`${x.id}: «${a.nombre}» y «${x.nombre}» (se usa el primero)`);
    for (const [k, v] of Object.entries(menos)) {
      if (out[k] == null || out[k] === '') out[k] = v;
      else if (k === 'fuentes' && Array.isArray(v) && Array.isArray(out[k])) out[k] = [...out[k], ...v];
    }
    m.set(x.id, out);
  }
  return m;
};
const leerLista = (f, k) => carpetas.flatMap(c => { const r = path.join(dir, 'datos', c, f); return existsSync(r) ? leer(r)[k] || [] : []; });
const marcas = unirPorId(leerLista('marcas.json', 'marcas'));
const distribuidores = unirPorId(leerLista('distribuidores.json', 'distribuidores'));

// ── 2. FROM A DATA VALUE TO A CELL ──────────────────────────────────────────
const esDato = x => x && typeof x === 'object' && !Array.isArray(x) && ('valor' in x || 'naturaleza' in x || 'origen' in x);
const NATURALEZAS = new Set(['declarado', 'medido', 'calculado', 'no_publicado']);
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** A URL as the server's check wants it: spaces in a pasted file name are %20. */
const urlLimpia = u => (typeof u === 'string' ? u.trim().replace(/ /g, '%20') : u);

/** Provenance for a data value, or null when it carries none. */
function procedenciaDe(d) {
  if (!esDato(d)) return null;
  let naturaleza = d.naturaleza ?? d.origen;
  if (naturaleza === 'desconocido') naturaleza = 'no_publicado';
  if (!NATURALEZAS.has(naturaleza)) return null;
  const f = urlLimpia(d.fuente);
  const fuente = typeof f === 'string' && /^https?:\/\/\S+$/.test(f) ? f.slice(0, 1000) : null;
  // The server refuses «declarado»/«medido» with no source, and rightly: the
  // value still loads, its provenance does not, and the dry run counts it.
  if (!fuente && (naturaleza === 'declarado' || naturaleza === 'medido')) return { rechazo: `«${naturaleza}» sin fuente` };
  const out = { nature: naturaleza, source: fuente, date: typeof d.fecha === 'string' && FECHA.test(d.fecha) ? d.fecha : null };
  if (typeof d.nota === 'string' && d.nota) out.note = d.nota.slice(0, 500);
  return out;
}

const sinAcentos = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const NUMERO = /^-?\d+(?:[.,]\d+)?$/;

/** Plain text for a text cell, whatever shape the data has. */
function aTexto(v, unidad) {
  if (v == null || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (typeof v === 'number') return unidad && !['año', 'años'].includes(unidad) ? `${v} ${unidad}` : String(v);
  if (Array.isArray(v)) { const t = v.map(x => aTexto(x)).filter(Boolean); return t.length ? t.join('\n') : null; }
  if (typeof v === 'object') {
    if (esDato(v)) return aTexto(v.valor, v.unidad);
    if (v.url) return [v.titulo || v.title || v.tipo, v.url].filter(Boolean).join(' — ');
    return Object.entries(v).filter(([, x]) => x != null && x !== '').map(([k, x]) => `${k}: ${aTexto(x)}`).join('; ') || null;
  }
  return String(v);
}

/** The cell value for a column, or {rechazo} saying why it cannot go there. */
function aCelda(col, crudo) {
  const v = esDato(crudo) ? crudo.valor : crudo;
  const unidad = esDato(crudo) ? crudo.unidad : undefined;
  if (v == null || v === '') return { valor: null };
  switch (col.tipo) {
    case 'numero': case 'moneda': case 'porcentaje': {
      let n = typeof v === 'number' ? v : NUMERO.test(String(v).trim()) ? Number(String(v).trim().replace(',', '.')) : null;
      // «2009 (según solarquotes)» or «21 de julio de 2020» in a year column:
      // the year is the value, when there is exactly one.
      const anios = String(v).match(/\b(?:1[89]|20)\d\d\b/g);
      if (n === null && /anio|fundacion/.test(col.config?.clave || '') && anios?.length === 1) n = Number(anios[0]);
      if (n === null || !Number.isFinite(n)) return { rechazo: `no es un número: «${String(aTexto(v)).slice(0, 60)}»` };
      // A percentage goes as «23» and is stored 0.23 (`bd/tipos.ts`). The home
      // data writes a few as a fraction, and says so in the unit.
      if (col.tipo === 'porcentaje' && /^fracci[oó]n$/i.test(unidad || '')) n *= 100;
      return { valor: col.tipo === 'porcentaje' ? String(Number(n.toPrecision(12))) : n };
    }
    case 'casilla': {
      if (typeof v === 'boolean') return { valor: v };
      const t = sinAcentos(v);
      if (/^(si|yes|true)\b/.test(t)) return { valor: true };
      if (/^(no|false)\b/.test(t)) return { valor: false };
      return { rechazo: `no es sí/no: «${String(v).slice(0, 60)}»` };
    }
    case 'seleccion': {
      const op = (col.opciones || []).map(o => (typeof o === 'string' ? o : o.label));
      const t = sinAcentos(aTexto(v));
      const igual = op.find(o => sinAcentos(o) === t) || op.find(o => t.startsWith(sinAcentos(o)));
      return igual ? { valor: igual } : { rechazo: `«${String(aTexto(v)).slice(0, 60)}» no es una de: ${op.join(', ')}` };
    }
    case 'fecha': {
      const t = String(v).trim();
      return /^\d{4}(-\d{2}(-\d{2})?)?$/.test(t) ? { valor: t } : { rechazo: `no es una fecha: «${t.slice(0, 40)}»` };
    }
    case 'url': {
      const t = urlLimpia(typeof v === 'object' ? v.url : String(v));
      return t && /^https?:\/\/\S+$/.test(t) ? { valor: t } : { rechazo: `no es una dirección: «${String(t).slice(0, 60)}»` };
    }
    case 'texto': case 'texto_largo': {
      const t = aTexto(v, unidad);
      return { valor: t && col.tipo === 'texto' ? t.replace(/\s*\n\s*/g, '; ').slice(0, 2000) : t };
    }
    default: return { rechazo: `tipo de columna que este programa no escribe: ${col.tipo}` };
  }
}

// Columns nobody loads: computed (aggregates, community votes) or the buy button.
const NO_SE_CARGA = new Set(['agregado', 'comunidad', 'compra', 'formula']);

// ── 3. ROW BUILDERS ─────────────────────────────────────────────────────────
// Each returns {tabla, nombre, campos: {columnKey: raw value}, relaciones:
// {columnKey: [ref…]}}. A ref is {tabla, nombre}, resolved to a row id once the
// row it points to exists.
const ultimaFecha = lista => lista.map(x => x?.fecha).filter(f => typeof f === 'string' && FECHA.test(f)).sort().pop() || null;
const fuentesTexto = l => (Array.isArray(l) ? l.map(f => (typeof f === 'string' ? f : [f.titulo, f.url].filter(Boolean).join(' — '))).join('\n') : aTexto(l));
const corto = (s, n) => { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

const tituloAfirmacion = (p, a) => `«${corto(a.afirmacion, 90)}» · ${p.nombre}`;
const tituloRetirada = (p, r) => `${r.organismo}${r.referencia ? ' ' + corto(r.referencia, 40) : ''} · ${p.nombre}`;
const tituloOferta = (p, o) => `${p.nombre} · ${distribuidores.get(o.distribuidor_id)?.nombre || o.distribuidor_id}`;

function filaMarca(m) {
  return { tabla: 'marcas', nombre: m.nombre, campos: { ...m, datos_publicos: m.datos_publicos, fuentes: fuentesTexto(m.fuentes) } };
}
function filaDistribuidor(d) {
  return { tabla: 'distribuidores', nombre: d.nombre, campos: { ...d, fuentes: fuentesTexto(d.fuentes) } };
}
function filaAfirmacion(p, a) {
  const fecha = ultimaFecha(a.fuentes || []);
  return {
    tabla: 'afirmaciones', nombre: tituloAfirmacion(p, a), _de: p._origen + '/' + p.id,
    campos: {
      afirmacion: a.afirmacion, donde: a.donde, explicacion: a.explicacion, fuentes: fuentesTexto(a.fuentes), fecha,
      // «sin_pruebas» in the data, «Sin pruebas» on the sheet.
      veredicto: String(a.veredicto || '').replace(/_/g, ' '),
    },
  };
}
function filaRetirada(p, r) {
  return {
    tabla: 'retiradas', nombre: tituloRetirada(p, r), _de: p._origen + '/' + p.id,
    campos: {
      titulo: `${r.organismo}: ${p.nombre}`, ...r,
      motivo: [r.motivo, r.nota].filter(Boolean).join('\n'), nota: undefined, fecha_consulta: undefined,
      modelos_afectados: r.modelos_afectados ?? r.modelos ?? p.modelo,
    },
  };
}
function filaOferta(p, o) {
  const sinAcuerdo = o.comision == null || /sin acuerdo/i.test(String(o.comision));
  return {
    tabla: `ofertas-${p._tabla}`, nombre: tituloOferta(p, o),
    campos: {
      ...o,
      // The offers contract (W5, #593): «sin acuerdo» is an empty commission.
      comision: sinAcuerdo ? null : o.comision,
      acuerdo: sinAcuerdo ? 'Sin acuerdo' : null,
      // Stock is a number of units; the data has words. Only a number goes in.
      stock: typeof o.stock === 'number' ? o.stock : null,
      incluye_instalacion: o.incluye_instalacion,
      nota: o.nota,
    },
    relaciones: { producto: [{ tabla: p._tabla, nombre: p.nombre }], distribuidor: o.distribuidor_id ? [{ tabla: 'distribuidores', nombre: distribuidores.get(o.distribuidor_id)?.nombre }] : [] },
  };
}
const ESTADOS = { 'a la venta': 'A la venta', descatalogado: 'Descatalogado', desconocido: 'Desconocido', 'no se vende en espana': 'No se vende en España' };
function filaProducto(p) {
  // Every nested group of the data flattens into one bag of keys that the
  // columns pick from by `config.clave`. The first key found wins.
  const campos = {};
  const echar = o => { for (const [k, v] of Object.entries(o || {})) if (!(k in campos)) campos[k] = v; };
  echar(p.datos_tecnicos);
  echar(p.origen);
  // (The home data keeps a nested `garantias` too; its values are already in
  // `datos_tecnicos` under the column keys, so it is not read.)
  const comprobadas = p.retiradas_comprobadas || [];
  echar({
    nombre: p.nombre, modelo: p.modelo,
    ean: (p.ean || []).map(e => e.valor).filter(Boolean).join(' ') || null,
    estado: ESTADOS[sinAcentos(p.estado || '')] || p.estado,
    anio_lanzamiento: p.anio_lanzamiento,
    // The photo and its credit are not written here: `fotos.mjs` downloads
    // each one, keeps a copy on our server and fills both cells.
    resumen: p.resumen,
    tipo: p._tipo,
    certificados: p.certificados,
    documentos: (p.documentos || []).map(d => [d.titulo || d.tipo, d.url].filter(Boolean).join(' — ')),
    compatibles: p.compatibles,
    retiradas_busqueda: comprobadas.map(c => `${c.organismo} (${c.fecha || 's. f.'}): ${c.resultado}${c.url_busqueda ? ' — ' + c.url_busqueda : ''}${c.nota ? '. ' + c.nota : ''}`),
    retiradas_fecha: ultimaFecha(comprobadas),
    revisado: ultimaFecha(Object.values(p.datos_tecnicos || {})) || null,
    pendiente: p.pendiente,
  });
  return {
    tabla: p._tabla, nombre: p.nombre, campos, _producto: p._origen + '/' + p.id,
    relaciones: {
      marca: p.marca_id ? [{ tabla: 'marcas', nombre: marcas.get(p.marca_id)?.nombre }] : [],
      afirmaciones: (p.afirmaciones || []).map(a => ({ tabla: 'afirmaciones', nombre: tituloAfirmacion(p, a) })),
      retiradas: (p.retiradas || []).map(r => ({ tabla: 'retiradas', nombre: tituloRetirada(p, r) })),
    },
  };
}

// In dependency order: what is pointed at goes first.
const filas = [
  ...[...marcas.values()].map(filaMarca),
  ...[...distribuidores.values()].map(filaDistribuidor),
  ...productos.flatMap(p => (p.afirmaciones || []).map(a => filaAfirmacion(p, a))),
  ...productos.flatMap(p => (p.retiradas || []).map(r => filaRetirada(p, r))),
  ...productos.map(filaProducto),
  ...productos.flatMap(p => (p.ofertas || []).map(o => filaOferta(p, o))),
];

// Two offers of one product in one shop (two variants), two recalls by one
// agency: the second and later get « (2)», « (3)»… in data order, so the
// title stays stable from one load to the next as long as the data keeps its order.
{
  const vistos = new Map();
  for (const f of filas) {
    const k = `${f.tabla}\u0000${f.nombre}`;
    const n = (vistos.get(k) || 0) + 1;
    vistos.set(k, n);
    if (n > 1) f.nombre = `${f.nombre} (${n})`;
  }
  // Products point at their claims and recalls by title: give them the new ones.
  const porProducto = new Map();
  for (const f of filas) if (f.tabla === 'afirmaciones' || f.tabla === 'retiradas') {
    const k = `${f.tabla}\u0000${f._de}`;
    (porProducto.get(k) || porProducto.set(k, []).get(k)).push(f.nombre);
  }
  for (const f of filas) if (f._producto) for (const t of ['afirmaciones', 'retiradas']) {
    f.relaciones[t] = (porProducto.get(`${t}\u0000${f._producto}`) || []).map(nombre => ({ tabla: t, nombre }));
  }
}

// ── 4. ROW → API BODY ───────────────────────────────────────────────────────
const informe = { sinColumna: new Map(), rechazos: [], sinProcedencia: 0, procRechazada: [], refsRotas: [], repetidas: [] };

/** {values, provenance, refs} for the API, by column NAME (the API takes names). */
function cuerpoDe(fila) {
  const def = tablaDef(fila.tabla);
  if (!def) throw new Error(`esquema-bd.json no tiene la tabla «${fila.tabla}»`);
  // Every table is born with a «Nombre» text column that titles each row's
  // page (`crear-esquema.mjs`); it is also how this script finds the row again.
  const values = { Nombre: fila.nombre }, provenance = {}, refs = {};
  const usadas = new Set(['garantias', 'id', 'marca_id', 'distribuidor_id', 'producto_id', 'subcategoria', '_tabla', '_tipo', '_origen']);
  for (const c of def.columnas) {
    if (NO_SE_CARGA.has(c.tipo)) continue;
    const clave = c.config?.clave || c.clave;
    if (c.tipo === 'relacion') {
      if (fila.relaciones?.[clave]) refs[c.nombre] = fila.relaciones[clave];
      usadas.add(clave);
      continue;
    }
    if (clave === 'nombre') { usadas.add(clave); continue; }
    if (!(clave in fila.campos)) continue;
    usadas.add(clave);
    const crudo = fila.campos[clave];
    const r = aCelda(c, crudo);
    if (r.rechazo) informe.rechazos.push(`${fila.tabla} · ${corto(fila.nombre, 50)} · ${c.nombre}: ${r.rechazo}`);
    else if (r.valor !== null || esDato(crudo)) values[c.nombre] = r.valor;
    const pr = procedenciaDe(crudo);
    // A range («21–22 %») in a number column: the cell stays empty and the
    // published wording travels in the source note, so it is not lost.
    if (r.rechazo && pr && !pr.rechazo) pr.note = corto(`Publicado como «${aTexto(crudo.valor)}». ${pr.note || ''}`, 500);
    if (pr?.rechazo) informe.procRechazada.push(`${corto(fila.nombre, 50)} · ${c.nombre}: ${pr.rechazo}`);
    else if (pr) provenance[c.nombre] = pr;
    else if (esDato(crudo) && r.valor !== null) informe.sinProcedencia++;
  }
  for (const k of Object.keys(fila.campos)) {
    if (usadas.has(k) || fila.campos[k] == null) continue;
    const e = `${fila.tabla} · ${k}`;
    informe.sinColumna.set(e, (informe.sinColumna.get(e) || 0) + 1);
  }
  return { values, provenance, refs };
}

// ── 5. THE API ──────────────────────────────────────────────────────────────
let escrituras = 0;
async function api(metodo, ruta, cuerpo) {
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
    if (!r.ok) { const e = new Error(`${metodo} ${ruta} → ${r.status}: ${j.error || JSON.stringify(j)}${j.fallos ? ' ' + JSON.stringify(j.fallos) : ''}`); e.status = r.status; throw e; }
    if (metodo !== 'GET') escrituras++;
    return j;
  }
  throw new Error(`${metodo} ${ruta}: demasiados reintentos`);
}

/** Every row of a table: {nombre → {id, values, provenance}}. */
async function filasDe(tablaId) {
  const out = new Map();
  let cursor = null;
  do {
    const j = await api('GET', `/api/v1/databases/${tablaId}/rows?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    for (const f of j.data) {
      const n = f.values?.Nombre ?? Object.values(f.values || {})[0];
      if (typeof n === 'string') {
        if (out.has(n)) informe.repetidas.push(n);
        else out.set(n, f);
      }
    }
    cursor = j.next_cursor;
  } while (cursor);
  return out;
}

// The rows endpoint gives a choice back as its option id («OPT…») while it
// takes the label on write, and the column listing has labels only, not ids.
// So a stored option id is taken as unchanged: a changed choice in the data
// is only rewritten when another cell of the row changes too.
const esOpcion = x => typeof x === 'string' && /^OPT[A-Z0-9]{8,}$/.test(x);
// The server stores a URL as `new URL(x).toString()` («…mi.com» → «…mi.com/»).
const comoUrl = x => { try { return typeof x === 'string' && /^https?:\/\//.test(x) ? new URL(x).toString() : x; } catch { return x; } };
/** Is the value we would send (`a`) what the server already has (`b`)? */
const igual = (a, b, tipo) => {
  if (esOpcion(b)) return true;
  a = comoUrl(a); b = comoUrl(b);
  // A percentage goes as «23» and comes back 0.23.
  if (tipo === 'porcentaje' && a != null && b != null) return Math.abs(Number(a) / 100 - Number(b)) < 1e-9;
  const norm = x => (x === undefined || x === '' || (Array.isArray(x) && !x.length) ? null : Array.isArray(x) ? x.map(y => (y && typeof y === 'object' ? y.id : y)).join('|') : x);
  const na = norm(a), nb = norm(b);
  if (typeof na === 'number' || typeof nb === 'number') return Number(na) === Number(nb);
  return String(na) === String(nb);
};

// ── 6. RUN ──────────────────────────────────────────────────────────────────
const cuerpos = filas.map(f => ({ fila: f, ...cuerpoDe(f) }));
const porTabla = cuerpos.reduce((a, c) => ((a[c.fila.tabla] = (a[c.fila.tabla] || 0) + 1), a), {});
console.log(`Datos: ${productos.length} productos de ${carpetas.join(' y ')}; ${filas.length} filas en total.`);
for (const [t, n] of Object.entries(porTabla)) console.log(`  ${String(n).padStart(4)}  ${tablaDef(t).titulo}`);

// Every reference must name a row this load writes (or the load is wrong).
const nombres = new Set(cuerpos.map(c => `${c.fila.tabla}\u0000${c.fila.nombre}`));
for (const c of cuerpos) for (const [col, lista] of Object.entries(c.refs)) for (const r of lista) {
  if (!r.nombre || !nombres.has(`${r.tabla}\u0000${r.nombre}`)) informe.refsRotas.push(`${corto(c.fila.nombre, 50)} · ${col} → ${r.tabla}/${r.nombre ?? '(sin nombre)'}`);
}
const dup = new Map();
for (const c of cuerpos) { const k = `${c.fila.tabla}\u0000${c.fila.nombre}`; dup.set(k, (dup.get(k) || 0) + 1); }
const duplicadas = [...dup].filter(([, n]) => n > 1).map(([k, n]) => `${k.replace('\u0000', ' / ')} ×${n}`);

function contar() {
  const lista = (titulo, l, max = 15) => {
    if (!l.length) return;
    console.log(`\n${titulo} (${l.length}):`);
    for (const x of l.slice(0, max)) console.log(`  · ${x}`);
    if (l.length > max) console.log(`  … y ${l.length - max} más`);
  };
  lista('Valores que su columna no admite (no se escriben)', informe.rechazos, 40);
  lista('Procedencias que el servidor rechazaría (el valor sí se escribe)', informe.procRechazada);
  lista('Claves de los datos sin columna en esquema-bd.json', [...informe.sinColumna].map(([k, n]) => `${k} (${n})`), 40);
  lista('Referencias a filas que no existen', informe.refsRotas);
  lista('Filas con el mismo nombre (la segunda pisaría a la primera)', duplicadas);
  lista('Nombres repetidos ya en el servidor', informe.repetidas);
  lista('Una misma marca o tienda con dos nombres en los datos', [...new Set(nombresDistintos)]);
  if (informe.sinProcedencia) console.log(`\n${informe.sinProcedencia} valores con forma de dato pero sin «naturaleza» válida: se escriben sin procedencia.`);
}

if (SECO) {
  contar();
  const celdas = cuerpos.reduce((a, c) => a + Object.keys(c.values).length, 0);
  const proc = cuerpos.reduce((a, c) => a + Object.keys(c.provenance).length, 0);
  console.log(`\nEn seco: ${cuerpos.length} filas, ${celdas} celdas, ${proc} procedencias. Nada se ha enviado.`);
  process.exit(informe.refsRotas.length || duplicadas.length ? 1 : 0);
}
if (duplicadas.length) { contar(); console.error('\nHay filas con el mismo nombre: corrige los datos antes de cargar.'); process.exit(1); }

// Tables by title, as `crear-esquema.mjs` made them. If some are missing and
// that script is here, it runs first: it is idempotent and only adds.
let existentes = (await api('GET', '/api/v1/databases')).data;
const faltan = [...new Set(cuerpos.map(c => c.fila.tabla))].filter(t => !existentes.some(x => x.title === tablaDef(t).titulo));
const crear = path.join(dir, 'crear-esquema.mjs');
if (faltan.length && existsSync(crear) && RUTA_ESQUEMA === path.join(dir, 'esquema-bd.json')) {
  console.log(`\nFaltan ${faltan.length} bases de datos: ejecuto crear-esquema.mjs --plantillas primero.`);
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [crear, '--base', BASE, '--plantillas'], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) { console.error('crear-esquema.mjs ha fallado.'); process.exit(1); }
  existentes = (await api('GET', '/api/v1/databases')).data;
}
const tablas = {};
for (const t of new Set(cuerpos.map(c => c.fila.tabla))) {
  const def = tablaDef(t);
  const e = existentes.find(x => x.title === def.titulo);
  if (!e) { console.error(`\nNo existe la base de datos «${def.titulo}». Ejecuta antes crear-esquema.mjs con esta misma clave.`); process.exit(1); }
  const info = await api('GET', `/api/v1/databases/${e.id}`);
  const nombresCol = new Set(info.columns.map(c => c.name));
  const tipos = Object.fromEntries(info.columns.map(c => [c.name, c.type]));
  tablas[t] = { id: e.id, columnas: nombresCol, tipos, filas: await filasDe(e.id) };
}

// A money cell is parsed from its text (`bd/tipos.ts`, «moneda»), where
// «0.138» reads as the Spanish thousands «138». A decimal amount therefore
// goes with a decimal comma, «0,138», which reads the same either way.
const paraEnviar = (values, tipos) => Object.fromEntries(Object.entries(values).map(([k, v]) =>
  [k, tipos[k] === 'moneda' && typeof v === 'number' && !Number.isInteger(v) ? String(v).replace('.', ',') : v]));

const hecho = { creadas: 0, cambiadas: 0, iguales: 0, fallos: [] };
for (const c of cuerpos) {
  const t = tablas[c.fila.tabla];
  const values = {};
  for (const [k, v] of Object.entries(c.values)) if (t.columnas.has(k)) values[k] = v;
  for (const [col, lista] of Object.entries(c.refs)) {
    if (!t.columnas.has(col)) continue;
    values[col] = lista.map(r => tablas[r.tabla]?.filas.get(r.nombre)?.id).filter(Boolean);
  }
  const provenance = Object.fromEntries(Object.entries(c.provenance).filter(([k]) => t.columnas.has(k)));
  const previa = t.filas.get(c.fila.nombre);
  try {
    if (!previa) {
      const r = await api('POST', `/api/v1/databases/${t.id}/rows`, { values: paraEnviar(values, t.tipos), provenance });
      t.filas.set(c.fila.nombre, { id: r.id, values });
      hecho.creadas++;
      process.stdout.write(`  + ${corto(c.fila.nombre, 80)}\n`);
    } else {
      let cambian = Object.fromEntries(Object.entries(values).filter(([k, v]) => !igual(v, previa.values?.[k], t.tipos[k])));
      // Once the row is written anyway, its choices go with it (see `esOpcion`).
      if (Object.keys(cambian).length) cambian = { ...Object.fromEntries(Object.entries(values).filter(([k]) => esOpcion(previa.values?.[k]))), ...cambian };
      const procCambia = Object.fromEntries(Object.entries(provenance).filter(([k, v]) => JSON.stringify(previa.provenance?.[k] ? { nature: previa.provenance[k].naturaleza, source: previa.provenance[k].fuente, date: previa.provenance[k].fecha, ...(previa.provenance[k].nota ? { note: previa.provenance[k].nota } : {}) } : null) !== JSON.stringify(v)));
      if (!Object.keys(cambian).length && !Object.keys(procCambia).length) { hecho.iguales++; continue; }
      await api('PATCH', `/api/v1/databases/${t.id}/rows/${previa.id}`, {
        ...(Object.keys(cambian).length ? { values: paraEnviar(cambian, t.tipos) } : {}),
        ...(Object.keys(procCambia).length ? { provenance: procCambia } : {}),
      });
      hecho.cambiadas++;
      process.stdout.write(`  ~ ${corto(c.fila.nombre, 70)} (${Object.keys(cambian).length} celdas, ${Object.keys(procCambia).length} fuentes)\n`);
      if (DETALLE) for (const k of [...Object.keys(cambian), ...Object.keys(procCambia)]) process.stdout.write(`      ${k}: ${JSON.stringify(previa.values?.[k] ?? previa.provenance?.[k] ?? null).slice(0, 80)} → ${JSON.stringify(cambian[k] ?? procCambia[k]).slice(0, 80)}\n`);
    }
  } catch (e) {
    hecho.fallos.push(`${corto(c.fila.nombre, 60)}: ${e.message}`);
    process.stdout.write(`  ! ${corto(c.fila.nombre, 60)}: ${e.message}\n`);
  }
}

// Rows on the server that this data does not have: reported, never deleted.
const sobran = [];
for (const [t, info] of Object.entries(tablas)) {
  const mias = new Set(cuerpos.filter(c => c.fila.tabla === t).map(c => c.fila.nombre));
  for (const n of info.filas.keys()) if (!mias.has(n)) sobran.push(`${tablaDef(t).titulo} / ${n}`);
}

// Readable addresses (/powerbanks/anker-737…): W2 computes them from each
// table's `route` template; after a bulk load, one call per table brings
// every row's address up to date.
let rutas = 0;
const fallosRutas = [];
for (const t of new Set(productos.map(p => p._tabla))) {
  try { const r = await api('POST', `/api/v1/databases/${tablas[t].id}/routes`, {}); rutas += Number(r.routes_updated ?? r.updated ?? 0) || 0; }
  catch (e) { fallosRutas.push(`${tablaDef(t).titulo}: ${e.message}`); }
}

contar();
if (sobran.length) { console.log(`\nFilas en el servidor que estos datos no tienen (no se tocan) (${sobran.length}):`); for (const s of sobran.slice(0, 20)) console.log(`  · ${s}`); }
if (hecho.fallos.length) { console.log(`\nFallos (${hecho.fallos.length}):`); for (const f of hecho.fallos) console.log(`  ! ${f}`); }
if (fallosRutas.length) { console.log('\nDirecciones sin recalcular (se calcularán al visitar cada ficha o el sitemap):'); for (const f of fallosRutas) console.log(`  ! ${f}`); }
console.log(`\nHecho: ${hecho.creadas} filas nuevas, ${hecho.cambiadas} cambiadas, ${hecho.iguales} iguales; ${escrituras} escrituras; ${rutas} direcciones puestas al día.`);
process.exit(hecho.fallos.length ? 1 : 0);
