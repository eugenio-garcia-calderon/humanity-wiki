#!/usr/bin/env node
// ============================================================================
// LAS IMÁGENES AL COMPARTIR DEL ESCAPARATE (2026-11-07, luzhumanidad.com)
// ============================================================================
// Eugenio: «con alta calidad, no quiero nada cutre». Cada página pública del escaparate
// lleva una imagen de 1200 × 630 para WhatsApp, LinkedIn, X, Facebook y Telegram, hecha
// aquí, sin conexión con nadie más que con el propio sitio: se lee lo que la web ya
// enseña (el HTML de cada página y `/api/sitio/portada/:raiz`), se pinta `plantilla.html`
// con Chromium y se guarda en JPEG. Ver README.md.
//
//   node scripts/imagenes-compartir/generar.mjs                      todas, en local (salida/)
//   node scripts/imagenes-compartir/generar.mjs --solo /,/aeromovil  solo esas direcciones
//   node scripts/imagenes-compartir/generar.mjs --publicar           y además las sube y las pone
//
// Opciones: --sitio <dominio> (luzhumanidad.com) · --solo <rutas separadas por comas> ·
// --tipos portada,proyecto,persona,pagina · --salida <carpeta> · --publicar · --forzar
// (sustituye también una imagen puesta a mano que esté bien) · --crudo (guarda el PNG).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(AQUI, '../../package.json'));
const sharp = require('sharp');
const { chromium } = require('playwright');

// ── LAS OPCIONES ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const opcion = (n, def = null) => { const i = args.indexOf(`--${n}`); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const SITIO = String(opcion('sitio', 'luzhumanidad.com')).replace(/^https?:\/\//, '').replace(/\/+$/, '');
const ORIGEN = `https://${SITIO}`;
const SOLO = opcion('solo') ? String(opcion('solo')).split(',').map(s => s.trim()).filter(Boolean).map(s => (s.startsWith('/') ? s : `/${s}`)) : null;
const TIPOS = new Set(String(opcion('tipos', 'portada,proyecto,persona,pagina')).split(','));
const SALIDA = path.resolve(String(opcion('salida', path.join(AQUI, 'salida'))));
const PUBLICAR = !!opcion('publicar');
const FORZAR = !!opcion('forzar');
const CRUDO = !!opcion('crudo');
/** Donde viven en el servidor (el nombre lleva la huella del contenido: si cambia, cambia la
 *  dirección y las cachés de las redes la piden de nuevo). */
export const CARPETA = '2026/11/compartir';
const MAX_BYTES = 250 * 1024;

// ── LO QUE NO SALE DE LOS DATOS ─────────────────────────────────────────────
/** El mosaico de la portada: fotos de proyectos (no capturas ni planos), variadas en área y
 *  lugar. Por su dirección; la que falte (un proyecto oculto o borrado) se salta y se rellena
 *  con otras portadas en JPEG. */
const MOSAICO = [
  '/barco-solar-electrico', '/riego-solar-mozambique', '/canada-solar', '/luz-para-kenia',
  '/comunidad-y-ecoaldea-villabosque', '/pedaleo-solar', '/luz-para-honduras', '/bicicleta-solar',
];
/** El encuadre de una portada cuando el automático no acierta y la página no trae el suyo
 *  (`config.encuadre`, el mismo que usa su cabecera: si Eugenio lo pone en el editor, manda ese).
 *  `x`/`y` en %, como `object-position`. */
const ENCUADRES = {
  '/barco-solar-electrico': { x: 50, y: 52 },   // la persona de pie en el barco, entera
  '/comunidad-nuevo-baztan': { x: 50, y: 45 },  // las placas, como en su tarjeta de la portada
  '/plataforma-de-inversion-solar-crowd': { x: 50, y: 0 },
};

// ── LEER EL SITIO ───────────────────────────────────────────────────────────
const UA = 'Mozilla/5.0 (compatible; HumanityWiki-imagenes-compartir/1.0; +https://humanity.wiki)';
async function pedir(url, tipo = 'text/html') {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { accept: tipo, 'user-agent': UA }, redirect: 'follow' });
      if (r.ok) return r;
      if (r.status === 404) return r;
    } catch { /* se reintenta */ }
    await new Promise(r => setTimeout(r, 800 * (i + 1)));
  }
  throw new Error(`no se pudo leer ${url}`);
}
/** Lo que el servidor deja escrito en el HTML para el navegador (`window.__SITIO__`). */
async function precargado(ruta) {
  const r = await pedir(ORIGEN + ruta);
  if (!r.ok) return null;
  const h = await r.text();
  const i = h.indexOf('window.__SITIO__=');
  if (i < 0) return null;
  const desde = i + 'window.__SITIO__='.length;
  const hasta = h.indexOf('</script>', desde);
  return JSON.parse(h.slice(desde, hasta).trim().replace(/;$/, ''));
}
const cacheImg = path.join(SALIDA, '.cache');
/** Una imagen del sitio, en el disco (se baja una vez). */
async function bajar(url) {
  const abs = /^https?:\/\//.test(url) ? url : ORIGEN + url;
  fs.mkdirSync(cacheImg, { recursive: true });
  const f = path.join(cacheImg, crypto.createHash('sha1').update(abs).digest('hex').slice(0, 16));
  if (fs.existsSync(f)) return f;
  const r = await pedir(abs, 'image/*');
  if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) return null;
  fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  return f;
}
const esPropia = (u) => typeof u === 'string' && /^\/uploads\/(?!privado\/)/.test(u);

// ── PREPARAR LAS FOTOS ──────────────────────────────────────────────────────
/** La foto recortada a la medida (a sangre), en JPEG dentro de un data-URL, y si es oscura.
 *  Con encuadre, el recorte lo hace el navegador (`object-position`) sobre la foto entera;
 *  sin él, `sharp` busca la zona con más interés (`attention`: contraste, color y piel). */
async function foto(fichero, ancho, alto, encuadre) {
  const base = sharp(fichero, { failOn: 'none' }).rotate();
  const { channels } = await base.clone().stats();
  const luz = channels.slice(0, 3).reduce((s, c) => s + c.mean, 0) / (3 * 255);
  const img = encuadre
    ? base.resize({ width: ancho * 2, height: alto * 2, fit: 'outside', withoutEnlargement: true })
    : base.resize(ancho, alto, { fit: 'cover', position: sharp.strategy.attention, kernel: 'lanczos3' }).sharpen({ sigma: 0.6 });
  const buf = await img.jpeg({ quality: 92 }).toBuffer();
  return { src: `data:image/jpeg;base64,${buf.toString('base64')}`, oscura: luz < 0.28, clara: luz > 0.62 };
}

// ── EL SITIO, SUS PÁGINAS Y SUS DATOS ───────────────────────────────────────
console.log(`· ${SITIO}: leyendo el sitio…`);
const inicio = await precargado('/');
if (!inicio?.resolver?.body?.id) throw new Error(`${SITIO} no parece un sitio de la plataforma`);
const RAIZ = inicio.resolver.body.id;
const raiz = inicio.paginas?.[RAIZ];
if (!raiz) throw new Error('no llega la portada del sitio');
const cfgSitio = raiz.config?.sitio || {};
if (cfgSitio.escaparate !== true) console.warn('  (aviso: el sitio no es un escaparate; se generan igual)');
const portadaApi = await (await pedir(`${ORIGEN}/api/sitio/portada/${RAIZ}`, 'application/json')).json();
const proyectoDe = new Map((portadaApi.proyectos || []).map(p => [p.pagina, p]));
const logo = esPropia(raiz.config?.icono) ? await bajar(raiz.config.icono) : null;
const MARCA = {
  nombre: String(raiz.titulo || '').trim() || SITIO,
  eslogan: String(raiz.config?.subtitulo || '').trim() || null,
  logo: logo ? `data:image/png;base64,${(await sharp(logo).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()).toString('base64')}` : null,
};
/** La frase de la portada: la misma regla que `lemaDe` en `PresentacionSitio.tsx`. */
function lemaDe(cfg) {
  const propio = cfg?.sitio?.portada?.lema;
  if (typeof propio === 'string' && propio.trim()) return propio.trim();
  const d = String(cfg?.sitio?.seo?.descripcion || cfg?.descripcion || '').trim();
  const resto = d.includes(':') ? d.slice(d.indexOf(':') + 1).trim() : d;
  return resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : '';
}
const PRINCIPAL = new Set(['Desarrollo principal actual', 'Foco principal']);

/** Las direcciones a pintar: las del sitemap (portada, proyectos y personas) o las pedidas. */
let rutas = SOLO;
if (!rutas) {
  const xml = await (await pedir(`${ORIGEN}/sitemap.xml`, 'application/xml')).text();
  rutas = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]).pathname);
}

const paginas = [];
for (const ruta of rutas) {
  const pre = ruta === '/' ? inicio : await precargado(ruta);
  const id = ruta === '/' ? RAIZ : Object.keys(pre?.paginas || {})[0];
  const p = id ? pre.paginas[id] : null;
  if (!p) { console.warn(`  ✗ ${ruta}: no se encuentra la página (¿pública?)`); continue; }
  const cfg = p.config || {};
  const tipo = id === RAIZ ? 'portada'
    : p.fila?.tabla_id && p.fila.tabla_id === cfgSitio.proyectos ? 'proyecto'
    : p.fila?.tabla_id && p.fila.tabla_id === cfgSitio.personas ? 'persona' : 'pagina';
  if (!TIPOS.has(tipo)) continue;
  const slug = ruta === '/' ? 'portada' : ruta.split('/').filter(Boolean).pop();
  const d = { ruta, id, slug, tipo, titulo: String(p.titulo || '').trim(), dominio: SITIO, marca: MARCA };
  if (tipo === 'portada') {
    d.titulo = lemaDe(cfg) || d.titulo;
    d.ajuste = [60, 44, 3];
    const elegidos = MOSAICO.map(r => portadaApi.proyectos.find(x => x.url === r)).filter(Boolean);
    for (const x of portadaApi.proyectos) if (elegidos.length < 8 && !elegidos.includes(x) && /\.jpe?g$/i.test(x.portada || '')) elegidos.push(x);
    d.fotosMosaico = elegidos.slice(0, 8).map(x => x.portada).filter(esPropia);
  } else if (tipo === 'proyecto') {
    const x = proyectoDe.get(id);
    if (!x) { console.warn(`  ✗ ${ruta}: el proyecto no está en la portada (¿oculto?)`); continue; }
    d.titulo = x.titulo;
    d.foto = esPropia(x.portada) ? x.portada : null;
    d.encuadre = (cfg.portada === x.portada && cfg.encuadre) || ENCUADRES[ruta] || null;
    const ano = x.ano ? (PRINCIPAL.has(x.estado) ? `Desde ${x.ano}` : x.ano) : null;
    d.lineas = [
      [ano, x.areas?.[0], x.estado],
      [ano, x.estado],
      [x.estado],
    ].map(l => l.map((t, i) => t && { texto: t, ...(t === x.estado && i === l.length - 1 ? { color: x.color || '#94a3b8' } : {}) }).filter(Boolean));
    d.texto = null;
  } else if (tipo === 'persona') {
    d.foto = esPropia(cfg.portada) ? cfg.portada : null;
    const ld = (Array.isArray(p.meta?.jsonLd) ? p.meta.jsonLd : []).find(j => j?.['@type'] === 'ProfilePage');
    d.proyectos = (ld?.mainEntity?.subjectOf || []).map(s => s?.name).filter(Boolean).slice(0, 4);
    // Solo lo que dice su página: los proyectos en cuyo «equipo humano» está.
    d.lineas = [[]];
    d.ajuste = [74, 48, 2];
  } else {
    d.foto = esPropia(cfg.portada) ? cfg.portada : null;
    d.encuadre = cfg.encuadre || ENCUADRES[ruta] || null;
    const t = String(cfg.subtitulo || cfg.descripcion || '').trim();
    d.texto = t ? (t.length > 140 ? t.slice(0, 139).replace(/\s+\S*$/, '') + '…' : t) : null;
    d.lineas = [[]];
  }
  paginas.push(d);
}
console.log(`· ${paginas.length} páginas: ${[...new Set(paginas.map(p => p.tipo))].map(t => `${paginas.filter(p => p.tipo === t).length} ${t}`).join(', ')}`);

// ── PINTAR ──────────────────────────────────────────────────────────────────
// En un Mac compartido por varios bots, un hueco para Chromium (`HUECO_CHROMIUM`, opcional).
if (process.env.HUECO_CHROMIUM) await (await import(process.env.HUECO_CHROMIUM)).tomarHueco();
const plantilla = fs.readFileSync(path.join(AQUI, 'plantilla.html'), 'utf8');
fs.mkdirSync(SALIDA, { recursive: true });
const navegador = await chromium.launch();
const hoja = await navegador.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const hechas = [];
for (const d of paginas) {
  try {
    const datos = { tipo: d.tipo, titulo: d.titulo, marca: d.marca, dominio: d.dominio, texto: d.texto || null, proyectos: d.proyectos || null, ajuste: d.ajuste || null };
    if (d.foto) {
      const f = await bajar(d.foto);
      if (f) {
        const persona = d.tipo === 'persona';
        const r = await foto(f, persona ? 800 : 1200, persona ? 800 : 630, d.encuadre);
        datos.foto = r.src; datos.oscura = r.oscura; datos.clara = r.clara; datos.encuadre = d.encuadre;
      }
    }
    if (d.fotosMosaico) {
      datos.mosaico = [];
      for (const u of d.fotosMosaico) { const f = await bajar(u); if (f) datos.mosaico.push((await foto(f, 600, 630, null)).src); }
    }
    // La línea pequeña, de la más completa a la más corta: la primera que quepa entera.
    let listo = null;
    for (const linea of d.lineas || [[]]) {
      datos.linea = linea;
      await hoja.setContent(plantilla.replace('<script>', () => `<script>window.DATOS=${JSON.stringify(datos).replace(/</g, '\\u003c')};</script>\n<script>`), { waitUntil: 'load' });
      await hoja.waitForFunction(() => document.body.dataset.listo, null, { timeout: 20000 });
      listo = await hoja.evaluate(() => document.body.dataset.listo);
      if (!/línea/.test(listo)) break;
    }
    if (listo !== 'si') { console.warn(`  ✗ ${d.ruta}: ${listo}`); continue; }
    const png = await hoja.screenshot({ type: 'png' });
    if (CRUDO) fs.writeFileSync(path.join(SALIDA, `${d.slug}.png`), png);
    // JPEG progresivo (mozjpeg) por debajo de 250 KB: se baja la calidad hasta que quepa.
    let jpg = null;
    for (const q of [86, 82, 78, 74, 70]) {
      jpg = await sharp(png).jpeg({ quality: q, mozjpeg: true, progressive: true, chromaSubsampling: '4:2:0' }).toBuffer();
      if (jpg.length <= MAX_BYTES) break;
    }
    const huella = crypto.createHash('sha256').update(jpg).digest('hex').slice(0, 10);
    const nombre = `${d.slug}-${huella}.jpg`;
    fs.writeFileSync(path.join(SALIDA, nombre), jpg);
    const m = await sharp(jpg).metadata();
    hechas.push({ ...d, marca: undefined, fotosMosaico: undefined, lineas: undefined, linea: datos.linea.map(x => x.texto).join(' · '), fichero: path.join(SALIDA, nombre), url: `/uploads/${CARPETA}/${nombre}`, bytes: jpg.length, ancho: m.width, alto: m.height });
    console.log(`  ✓ ${d.ruta} → ${nombre} (${Math.round(jpg.length / 1024)} KB)`);
  } catch (e) {
    console.warn(`  ✗ ${d.ruta}: ${e.message}`);
  }
}
await navegador.close();
fs.writeFileSync(path.join(SALIDA, 'manifiesto.json'), JSON.stringify(hechas, null, 1));
console.log(`· ${hechas.length} imágenes en ${SALIDA} (manifiesto.json)`);
if (!PUBLICAR || !hechas.length) process.exit(hechas.length === paginas.length ? 0 : 1);

// ── PUBLICAR ────────────────────────────────────────────────────────────────
// Se sube cada imagen y se pone en `config.imagenCompartir` de su página. Una imagen puesta
// a mano se respeta si está bien (1200 × 630 y se abre); si no, se cambia y se dice.
const { leer, copiar, escribirClave, subir, literal } = await import('./produccion.mjs');
const actuales = new Map(leer(`SELECT id, config->>'imagenCompartir' AS img FROM knowledge_windows WHERE id IN (${hechas.map(h => literal(h.id)).join(', ')})`).map(r => [r.id, r.img]));
async function medir(url) {
  try {
    const r = await pedir(/^https?:/.test(url) ? url : ORIGEN + url, 'image/*');
    if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) return null;
    const m = await sharp(Buffer.from(await r.arrayBuffer())).metadata();
    return { ancho: m.width, alto: m.height };
  } catch { return null; }
}
const cambios = [], informe = [];
for (const h of hechas) {
  const antes = actuales.get(h.id) || null;
  if (antes === h.url) { informe.push({ ruta: h.ruta, accion: 'igual', url: h.url }); continue; }
  const nuestra = !antes || antes.startsWith(`/uploads/${CARPETA}/`);
  if (!nuestra && !FORZAR) {
    const m = await medir(antes);
    if (m && m.ancho === 1200 && m.alto === 630) { informe.push({ ruta: h.ruta, accion: 'conservada (puesta a mano, 1200 × 630)', antes, propuesta: h.url }); continue; }
    informe.push({ ruta: h.ruta, accion: m ? `cambiada (la de antes medía ${m.ancho} × ${m.alto})` : 'cambiada (la de antes no se abría)', antes, url: h.url });
  } else informe.push({ ruta: h.ruta, accion: antes ? (nuestra ? 'renovada' : 'cambiada (--forzar)') : 'nueva', antes, url: h.url });
  cambios.push({ id: h.id, valor: h.url });
}
// Se suben todas (también la propuesta de una que se conserva: así se puede ver y elegir).
subir(hechas.filter(h => informe.find(i => i.ruta === h.ruta)?.accion !== 'igual').map(h => h.fichero), CARPETA);
for (const h of hechas) {
  const m = await medir(h.url);
  if (!m || m.ancho !== 1200 || m.alto !== 630) throw new Error(`${h.url} no se sirve bien después de subirla: no se cambia ninguna página`);
}
const copia = copiar(cambios.map(c => c.id), 'imagen-compartir');
const n = escribirClave('{imagenCompartir}', cambios);
fs.writeFileSync(path.join(SALIDA, 'informe.json'), JSON.stringify(informe, null, 1));
for (const i of informe) console.log(`  ${i.ruta}: ${i.accion}${i.url ? ` → ${i.url}` : ''}${i.propuesta ? ` (propuesta: ${i.propuesta})` : ''}`);
console.log(`· ${n} páginas cambiadas${copia ? `; copia de antes en ${copia}` : ''}`);
