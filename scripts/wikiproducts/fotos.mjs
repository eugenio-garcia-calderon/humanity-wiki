#!/usr/bin/env node
// ============================================================================
// ONE PHOTO PER PRODUCT, KEPT ON OUR SERVER (2026-10-18, W3a)
// ============================================================================
// Eugenio, 2026-10-18: «Utiliza las fotos de los productos y esas fotos las
// puedes coger de los distribuidores … no te preocupes por el tema de
// copyright». So the photo is the one the maker or a shop publishes for the
// product, credited to whoever published it.
//
// For each product row, in this order, the first that gives a real image wins:
//   1. `datos/fotos.json`: a Wikimedia Commons file (`commons`), a page to read
//      the photo from (`pagina`) or an image address (`imagen`). Commons first
//      because it carries an author and a licence of its own.
//   2. The image address in the product data (`foto.url`).
//   3. The product pages of the shops in its offers.
//   4. The page in the product data (`foto.fuente`), unless it is a home page.
// A page gives its photo through `og:image` (what any shop sets for the
// preview when its page is shared), `twitter:image` or the JSON-LD `image`.
//
// The image is downloaded HERE and stored through `POST /api/v1/uploads`, so
// the sheet points at a copy of ours: shop CDNs block, move and expire their
// files. The credit goes to «Licencia de la foto», which the sheet shows under
// the photo (W1 #623): «Foto: <maker or shop> — <page it came from>».
//
// Idempotent: a row whose photo is already one of ours and whose credit names
// the same page is left alone. `--forzar` downloads again.
//
//   HW_API_KEY=hw_live_… node scripts/wikiproducts/fotos.mjs [--base …] [--seco] [--solo <product id>] [--forzar]
//   WP_URL_PUBLICA: the address the stored photo is served at (production:
//   https://humanity.wiki). Defaults to --base.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opcion = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
const BASE = (opcion('--base', process.env.HW_BASE || process.env.HW_URL || 'http://localhost:3000')).replace(/\/$/, '');
const PUBLICA = (process.env.WP_URL_PUBLICA || BASE).replace(/\/$/, '');
const CLAVE = process.env.HW_API_KEY;
const SECO = args.includes('--seco');
const FORZAR = args.includes('--forzar');
const SOLO = opcion('--solo', null);
if (!CLAVE && !SECO) { console.error('Falta HW_API_KEY (una clave hw_live_… con alcance de escritura).'); process.exit(1); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const leer = f => JSON.parse(readFileSync(f, 'utf8'));
const esquema = leer(path.join(dir, 'esquema-bd.json'));
const tablaDef = clave => esquema.tablas.find(t => t.clave === clave);
const nombreCol = (tabla, clave) => tablaDef(tabla)?.columnas.find(c => c.clave === clave)?.nombre;

// Same files and tables as `cargar.mjs`.
const FICHEROS = [
  ['portatil', 'powerbanks.json', 'powerbanks'], ['portatil', 'estaciones.json', 'powerbanks'],
  ['portatil', 'paneles.json', 'paneles-solares-portatiles'], ['portatil', 'luces.json', 'luces-solares-portatiles'],
  ['domestico', 'paneles.json', 'paneles-solares-domesticos'], ['domestico', 'baterias.json', 'baterias-domesticas'],
];
const productos = [];
for (const [c, f, tabla] of FICHEROS) {
  const r = path.join(dir, 'datos', c, f);
  if (existsSync(r)) for (const p of leer(r).productos) productos.push({ ...p, _tabla: tabla });
}
const porId = lista => new Map(lista.map(x => [x.id, x]));
const leerLista = (f, k) => ['portatil', 'domestico'].flatMap(c => { const r = path.join(dir, 'datos', c, f); return existsSync(r) ? leer(r)[k] || [] : []; });
const marcas = porId(leerLista('marcas.json', 'marcas'));
const tiendas = porId(leerLista('distribuidores.json', 'distribuidores'));
const pedidas = existsSync(path.join(dir, 'datos', 'fotos.json')) ? leer(path.join(dir, 'datos', 'fotos.json')).fotos || {} : {};

// ── Reading the web ─────────────────────────────────────────────────────────
const NAVEGADOR = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' };
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const raiz = h => h.split('.').slice(-2).join('.');
/** Public https addresses only: nothing on this machine or its network.
 *  `WP_FOTOS_PRUEBA=si` lets a local test serve pages from 127.0.0.1. */
const PRUEBA = process.env.WP_FOTOS_PRUEBA === 'si';
function segura(u) {
  try {
    const x = new URL(u);
    if (PRUEBA && x.protocol === 'http:' && x.hostname === '127.0.0.1') return true;
    if (x.protocol !== 'https:') return false;
    const h = x.hostname;
    return !(h === 'localhost' || /^[\d.]+$/.test(h) || h.includes(':') || /\.(local|internal|lan)$/.test(h));
  } catch { return false; }
}
/** A home page («tesla.com/», «sonnen.es», «enphase.com/es-es») shows a
 *  banner, not this product. */
const esPortada = u => { try { return new URL(u).pathname.split('/').filter(s => s && !/^[a-z]{2}([-_][a-z]{2})?$/i.test(s)).length === 0; } catch { return true; } };

async function traer(u, ms = 20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(u, { headers: NAVEGADOR, redirect: 'follow', signal: c.signal }); }
  finally { clearTimeout(t); }
}

const decodificar = s => s.replace(/&amp;/g, '&').replace(/&#x2F;/gi, '/').replace(/&#47;/g, '/').replace(/&quot;/g, '"');
/** The product photo a page declares for itself. */
export function imagenDePagina(html, base) {
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const atr = (tag, a) => tag.match(new RegExp(`\\b${a}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))?.slice(2).find(x => x != null);
  const candidatos = [];
  for (const nombre of ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']) {
    for (const t of meta) if ((atr(t, 'property') || atr(t, 'name') || '').toLowerCase() === nombre) { const c = atr(t, 'content'); if (c) candidatos.push(c); }
  }
  const link = html.match(/<link\b[^>]*rel\s*=\s*["']image_src["'][^>]*>/i)?.[0];
  if (link) { const h = atr(link, 'href'); if (h) candidatos.push(h); }
  for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const pila = [JSON.parse(m[1])];
      while (pila.length) {
        const x = pila.pop();
        if (Array.isArray(x)) { pila.push(...x); continue; }
        if (!x || typeof x !== 'object') continue;
        const tipo = [].concat(x['@type'] || []).join(' ');
        if (/Product/i.test(tipo) && x.image) {
          const i = [].concat(x.image)[0];
          const u = typeof i === 'string' ? i : i?.url || i?.contentUrl;
          if (u) candidatos.push(u);
        }
        if (x['@graph']) pila.push(x['@graph']);
      }
    } catch { /* a broken JSON-LD block is not our problem */ }
  }
  for (const c of candidatos) {
    try {
      const u = new URL(decodificar(c.trim()), base).toString();
      if (segura(u) && !/logo|favicon|placeholder|sprite/i.test(u)) return u;
    } catch { /* not an address */ }
  }
  return null;
}

/** Width and height from the first bytes of a PNG, JPEG, WebP or GIF. */
export function medidas(b) {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') return { w: b.readUInt16LE(6), h: b.readUInt16LE(8) };
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const f = b.toString('ascii', 12, 16);
    if (f === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (f === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (f === 'VP8L') { const n = b.readUInt32LE(21); return { w: 1 + (n & 0x3fff), h: 1 + ((n >> 14) & 0x3fff) }; }
  }
  if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

const TIPOS = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1, 'image/avif': 1, 'image/gif': 1 };
const MAX = 8 * 1024 * 1024;
/** Download an image and check it is one, and big enough to be a product
 *  photo rather than an icon. Returns {bytes, tipo} or a reason. */
async function descargar(u) {
  if (!segura(u)) return { motivo: 'dirección no pública' };
  const r = await traer(u);
  if (!r.ok) return { motivo: `HTTP ${r.status}` };
  let tipo = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const bytes = Buffer.from(await r.arrayBuffer());
  if (bytes.length > MAX) return { motivo: `pesa ${Math.round(bytes.length / 1048576)} MB` };
  if (bytes.length < 4000) return { motivo: 'demasiado pequeña' };
  // Some CDNs say «application/octet-stream»: trust the bytes, not the header.
  const m = medidas(bytes);
  if (!TIPOS[tipo]) {
    if (bytes[0] === 0xff && bytes[1] === 0xd8) tipo = 'image/jpeg';
    else if (bytes.readUInt32BE(0) === 0x89504e47) tipo = 'image/png';
    else if (bytes.toString('ascii', 8, 12) === 'WEBP') tipo = 'image/webp';
    else if (bytes.toString('ascii', 4, 12).startsWith('ftypavi')) tipo = 'image/avif';
    else return { motivo: `no es una imagen (${tipo || 'sin tipo'})` };
  }
  if (m && (m.w < 250 || m.h < 250)) return { motivo: `demasiado pequeña (${m.w}×${m.h})` };
  return { bytes, tipo };
}

/** Who published a page: a shop of ours by its web, else the brand. */
function quienPublica(p, pagina) {
  const h = raiz(host(pagina));
  for (const t of tiendas.values()) if (t.web && raiz(host(t.web)) === h) return t.nombre;
  for (const o of p.ofertas || []) if (raiz(host(o.url || '')) === h) return tiendas.get(o.distribuidor_id)?.nombre || host(pagina);
  const m = marcas.get(p.marca_id);
  if (m?.web && raiz(host(m.web)) === h) return m.nombre;
  return m?.nombre && h.includes(String(m.nombre).toLowerCase().split(/\s+/)[0]) ? m.nombre : host(pagina);
}

// ── Commons ─────────────────────────────────────────────────────────────────
const LIBRE = /^(cc0|cc-?0|public domain|pd\b.*|cc[- ]by(-sa)?[- ]\d(\.\d)?(\s.*)?)$/i;
const plano = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
async function deCommons(fichero) {
  const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo'
    + '&iiprop=url|extmetadata|mime&iiurlwidth=1000&titles=' + encodeURIComponent(`File:${fichero}`);
  const r = await fetch(u, { headers: { 'User-Agent': 'Wikiproducts/1.0 (https://wikiproducts.humanity.wiki; carga de fotos)' } });
  const pg = (await r.json()).query?.pages?.[0];
  const ii = pg?.imageinfo?.[0];
  if (!ii) return { motivo: `«${fichero}» no está en Commons` };
  const m = ii.extmetadata || {};
  const lic = plano(m.LicenseShortName?.value);
  if (!LIBRE.test(lic)) return { motivo: `licencia «${lic || 'ninguna'}»` };
  const autor = plano(m.Artist?.value).slice(0, 120) || 'autor desconocido';
  return { imagen: ii.thumburl || ii.url, credito: `Foto: ${autor}, ${lic}, Wikimedia Commons — ${ii.descriptionurl}`, pagina: ii.descriptionurl };
}

// ── For one product: where to look, in order ────────────────────────────────
function candidatos(p) {
  const out = [];
  const pe = pedidas[p.id];
  if (pe?.commons) out.push({ commons: pe.commons });
  if (pe?.imagen) out.push({ imagen: pe.imagen, pagina: pe.pagina || pe.imagen });
  else if (pe?.pagina) out.push({ pagina: pe.pagina });
  if (p.foto?.url) out.push({ imagen: p.foto.url, pagina: p.foto.fuente || p.foto.url });
  for (const o of p.ofertas || []) if (o.url && !esPortada(o.url)) out.push({ pagina: o.url });
  if (p.foto?.fuente && !esPortada(p.foto.fuente)) out.push({ pagina: p.foto.fuente });
  const vistos = new Set();
  return out.filter(c => { const k = c.commons || c.imagen || c.pagina; if (vistos.has(k)) return false; vistos.add(k); return true; });
}

async function buscarFoto(p) {
  const intentos = [];
  for (const c of candidatos(p)) {
    try {
      let imagen = c.imagen, pagina = c.pagina, credito = null;
      if (c.commons) {
        const x = await deCommons(c.commons);
        if (!x.imagen) { intentos.push(`Commons: ${x.motivo}`); continue; }
        ({ imagen, pagina, credito } = x);
      } else if (!imagen) {
        if (!segura(pagina)) { intentos.push(`${host(pagina)}: dirección no válida`); continue; }
        const r = await traer(pagina);
        if (!r.ok) { intentos.push(`${host(pagina)}: HTTP ${r.status}`); continue; }
        imagen = imagenDePagina(await r.text(), r.url || pagina);
        if (!imagen) { intentos.push(`${host(pagina)}: la página no declara foto`); continue; }
      }
      const d = await descargar(imagen);
      if (!d.bytes) { intentos.push(`${host(imagen)}: ${d.motivo}`); continue; }
      return { ...d, pagina, credito: credito || `Foto: ${quienPublica(p, pagina)} — ${pagina}` };
    } catch (e) { intentos.push(`${host(c.pagina || c.imagen || '') || 'Commons'}: ${e.name === 'AbortError' ? 'no responde' : e.message}`); }
  }
  return { intentos };
}

// ── The API ─────────────────────────────────────────────────────────────────
let escrituras = 0;
async function api(metodo, ruta, cuerpo, tipo) {
  for (let intento = 0; intento < 8; intento++) {
    const r = await fetch(BASE + ruta, {
      method: metodo,
      headers: { Authorization: `Bearer ${CLAVE}`, 'Content-Type': tipo || 'application/json' },
      body: cuerpo === undefined ? undefined : tipo ? cuerpo : JSON.stringify(cuerpo),
    });
    if (r.status === 429) {
      const s = Number(r.headers.get('retry-after')) || 10;
      process.stdout.write(`  … límite de la API, espero ${s} s\n`);
      await new Promise(ok => setTimeout(ok, s * 1000));
      continue;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${metodo} ${ruta.split('?')[0]} → ${r.status}: ${j.error || JSON.stringify(j)}`);
    if (metodo !== 'GET') escrituras++;
    return j;
  }
  throw new Error(`${metodo} ${ruta}: demasiados reintentos`);
}
async function filasDe(tablaId) {
  const out = new Map();
  let cursor = null;
  do {
    const j = await api('GET', `/api/v1/databases/${tablaId}/rows?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    for (const f of j.data) if (typeof f.values?.Nombre === 'string') out.set(f.values.Nombre, f);
    cursor = j.next_cursor;
  } while (cursor);
  return out;
}

// ── Run ─────────────────────────────────────────────────────────────────────
const lista = productos.filter(p => !SOLO || p.id === SOLO);
if (SECO) {
  for (const p of lista) console.log(`  ${p.id}: ${candidatos(p).map(c => c.commons ? `commons:${c.commons}` : c.imagen ? `imagen:${host(c.imagen)}` : host(c.pagina)).join(' → ') || '(nada donde buscar)'}`);
  console.log(`\nEn seco: ${lista.length} productos, ${lista.filter(p => candidatos(p).length).length} con algún sitio donde buscar.`);
  process.exit(0);
}

const tablas = {};
for (const t of (await api('GET', '/api/v1/databases')).data) tablas[t.title] = t.id;
const filas = {};
const nuestra = u => typeof u === 'string' && u.startsWith(PUBLICA + '/uploads/');
const res = { puestas: [], iguales: 0, sin: [], fallos: [] };
for (const p of lista) {
  const titulo = tablaDef(p._tabla).titulo;
  if (!tablas[titulo]) { res.fallos.push(`${p.id}: no existe la tabla «${titulo}»`); continue; }
  filas[titulo] ??= await filasDe(tablas[titulo]);
  const fila = filas[titulo].get(p.nombre);
  if (!fila) { res.fallos.push(`${p.id}: no hay fila «${p.nombre}» (ejecuta antes cargar.mjs)`); continue; }
  const cFoto = nombreCol(p._tabla, 'foto'), cCred = nombreCol(p._tabla, 'foto_licencia');
  const ya = fila.values?.[cFoto], cred = String(fila.values?.[cCred] || '');
  const cs = candidatos(p);
  if (!FORZAR && nuestra(ya) && cs.some(c => cred.includes(c.pagina || '\u0000') || (c.commons && cred.includes('Wikimedia Commons')))) { res.iguales++; continue; }
  const f = await buscarFoto(p);
  if (!f.bytes) { res.sin.push(`${p.id}: ${f.intentos.length ? f.intentos.join('; ') : 'nada donde buscar'}`); continue; }
  try {
    const sub = await api('POST', `/api/v1/uploads?type=${encodeURIComponent(f.tipo)}`, f.bytes, 'application/octet-stream');
    await api('PATCH', `/api/v1/databases/${tablas[titulo]}/rows/${fila.id}`, { values: { [cFoto]: PUBLICA + sub.url, [cCred]: f.credito } });
    res.puestas.push(p.id);
    console.log(`  + ${p.nombre.slice(0, 60)} · ${f.credito.slice(0, 90)}`);
  } catch (e) { res.fallos.push(`${p.id}: ${e.message}`); console.log(`  ! ${p.id}: ${e.message}`); }
}
if (res.sin.length) { console.log(`\nSin foto (${res.sin.length}):`); for (const s of res.sin) console.log(`  · ${s}`); }
if (res.fallos.length) { console.log(`\nFallos (${res.fallos.length}):`); for (const s of res.fallos) console.log(`  ! ${s}`); }
console.log(`\nHecho: ${res.puestas.length} fotos nuevas, ${res.iguales} ya estaban, ${res.sin.length} sin foto, ${res.fallos.length} fallos; ${escrituras} escrituras.`);
process.exit(res.fallos.length ? 1 : 0);
