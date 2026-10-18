// Merges the per-product drafts (paneles/*.json, baterias/*.json) into the shared format
// of ../portatil/ESQUEMA.md: paneles.json, baterias.json, marcas.json, distribuidores.json
// and indice.csv. The drafts stay as the research record; the merged files are what loads.
// Usage: node unir.mjs
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const HOY = new Date().toISOString().slice(0, 10);

const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const NATURALEZA = { declarado: 'declarado', medido: 'medido', calculado: 'calculado',
  desconocido: 'no_publicado', no_publicado: 'no_publicado' };

// A datum is any object with a "valor" key. Rename origen→naturaleza inside data only.
function normalizar(x) {
  if (Array.isArray(x)) return x.map(normalizar);
  if (!x || typeof x !== 'object') return x;
  const out = {};
  const esDato = 'valor' in x;
  for (const [k, v] of Object.entries(x)) {
    if (esDato && (k === 'origen' || k === 'naturaleza')) out.naturaleza = NATURALEZA[v] || v;
    else out[k] = normalizar(v);
  }
  if (esDato && out.valor === null && !out.naturaleza) out.naturaleza = 'no_publicado';
  return out;
}

// Distributor id convention of the portable thread: amazon-es, leroymerlin-es…
function distribuidorId(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const partes = host.split('.');
    const tld = partes.at(-1);
    const nombre = partes.length > 2 && ['co', 'com'].includes(partes.at(-2)) ? partes.at(-3) : partes.at(-2);
    // Country-code domains keep their suffix (amazon-es); generic ones (.com, .store) do not.
    return tld.length === 2 ? `${slug(nombre)}-${tld}` : slug(nombre);
  } catch { return null; }
}

// Stable brand ids: product URLs are built from them, so they must not change between loads.
// Ids shared with ../portatil/marcas.json (anker, ecoflow) are kept identical.
const MARCA_ID = { 'Maxeon (SunPower fuera de EE. UU.)': 'maxeon', 'Tongwei (TW Solar)': 'tongwei',
  'DMEGC Solar': 'dmegc', 'Risen Energy': 'risen', 'Anker SOLIX': 'anker', 'JinkoSolar': 'jinko',
  'Trina Solar': 'trina', 'LG Energy Solution': 'lg', 'aleo solar': 'aleo', 'Aleo Solar': 'aleo' };


// Flattens the draft's nested warranty block into the site's columns (W1 schema, PR #600).
const urlsDe = (o) => [...new Set((o?.fuentes || []).map((f) => (typeof f === 'string' ? f : f?.url)).filter(Boolean))];
function garantiaColumnas(g, dt) {
  if (!g) return;
  const doc = g.rendimiento?.fuente || g.producto?.fuente || null;
  const dato = (valor, unidad, fuente, nota) => ({ valor: valor ?? null, unidad, naturaleza: valor == null ? 'no_publicado' : 'declarado',
    fuente: valor == null ? null : fuente, fecha: g.producto?.fecha || g.rendimiento?.fecha || HOY, ...(nota ? { nota } : {}) });
  const fuenteDe = (x) => x?.fuente || doc;
  if (g.producto) dt.garantia_producto_anios = dato(g.producto.anios, 'años', fuenteDe(g.producto), g.producto.nota);
  if (g.rendimiento) {
    const r = g.rendimiento;
    const extra = [r.primer_anio_pct != null && `Pérdida el primer año: ${r.primer_anio_pct} %.`,
      r.lineal_anual_pct != null && `Después, ${r.lineal_anual_pct} %/año.`, r.nota].filter(Boolean).join(' ');
    dt.garantia_rendimiento_anios = dato(r.anios, 'años', fuenteDe(r), extra || undefined);
    const fin = typeof r.porcentaje_final === 'number' ? Math.round(r.porcentaje_final * 100) / 10000 : null;
    dt.garantia_rendimiento_final_pct = dato(fin, 'fracción', fuenteDe(r), 'Capacidad o potencia garantizada al final del plazo (0,8 = 80 %).');
  }
  const lp = (g.letra_pequena || []).map((x) => (typeof x === 'string' ? x : [x.texto || x.condicion, x.fuente].filter(Boolean).join(' Fuente: ')));
  if (lp.length) dt.garantia_letra_pequena = dato(lp.join('\n'), null, doc, 'Cada línea lleva su fuente cuando no es el documento de garantía.');
  const qr = typeof g.quien_responde === 'string' ? g.quien_responde : g.quien_responde?.valor || g.quien_responde?.texto;
  if (qr) dt.garantia_quien_responde = dato(qr, null, g.quien_responde?.fuente || doc);
}

const SUBCAT = { paneles: 'paneles-solares-domesticos', baterias: 'baterias-domesticas' };
const marcas = new Map();
const distribuidores = new Map();
const indice = [];
const errores = [];

for (const carpeta of ['paneles', 'baterias']) {
  const productos = [];
  const dir = path.join(DIR, carpeta);
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    let b;
    try { b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { errores.push(`${carpeta}/${f}: ${e.message}`); continue; }
    b = normalizar(b);
    const marcaId = MARCA_ID[b.marca] || slug(b.marca);
    const emp = b.empresa || {};
    if (!marcas.has(marcaId)) {
      marcas.set(marcaId, {
        id: marcaId, nombre: b.marca, razon_social: emp.razon_social ?? null,
        pais_sede: emp.pais_sede ?? null, matriz: emp.matriz ?? null, fundacion: emp.fundacion ?? null,
        web: emp.web ?? null, cotiza: emp.cotiza_en ?? emp.cotiza ?? null,
        datos_publicos: emp.notas ?? [], fuentes: emp.fuentes ?? [],
      });
    } else {
      const m = marcas.get(marcaId);
      for (const n of emp.notas || []) if (!JSON.stringify(m.datos_publicos).includes(JSON.stringify(n))) m.datos_publicos.push(n);
    }
    const origen = { ...(b.origen || {}) };
    if (emp.fabricante_celulas && !origen.fabricante_celulas) origen.fabricante_celulas = emp.fabricante_celulas;
    // Known factories → the "fabrica" column, unless the draft already has a sourced value.
    const fabricas = origen.fabricas_conocidas || emp.fabricas_conocidas;
    delete origen.fabricas_conocidas;
    const fabricaTexto = typeof origen.fabrica === 'string' ? origen.fabrica : null;
    if ((!origen.fabrica || fabricaTexto) && Array.isArray(fabricas) && fabricas.length) {
      const fuentes = urlsDe(emp);
      origen.fabrica = { valor: fabricas.join('; '), unidad: null, naturaleza: fuentes.length ? 'declarado' : 'no_publicado',
        fuente: fuentes[0] || null, fecha: HOY, nota: [fabricaTexto, fuentes.length > 1 && `Otras fuentes: ${fuentes.slice(1).join(' ')}`].filter(Boolean).join(' ') || undefined };
      if (!fuentes.length) origen.fabrica.valor = null;
    } else if (fabricaTexto) origen.fabrica = { valor: null, unidad: null, naturaleza: 'no_publicado', fuente: null, fecha: HOY, nota: fabricaTexto };
    if (!origen.pais_fabricacion && emp.pais_fabricacion) origen.pais_fabricacion = emp.pais_fabricacion;

    const ofertas = (b.ofertas || []).map((o) => {
      const id = o.distribuidor_id || distribuidorId(o.url);
      if (id && !distribuidores.has(id)) {
        let web = null; try { web = new URL(o.url).origin; } catch {}
        distribuidores.set(id, { id, nombre: o.distribuidor, tipo: o.tipo ?? null, pais: o.pais ?? null, web });
      }
      const { distribuidor, tipo, pais, envio, ...resto } = o;
      // envio_eur is a currency column: only a number goes in; any wording moves to the note.
      const envioEur = typeof o.envio_eur === 'number' ? o.envio_eur : typeof envio === 'number' ? envio : null;
      const nota = [o.nota, typeof envio === 'string' && envio && `Envío: ${envio}`].filter(Boolean).join(' · ') || undefined;
      return { distribuidor_id: id, ...resto, envio_eur: envioEur, nota, comision: o.comision || 'sin acuerdo' };
    });

    const comprobadas = Array.isArray(b.retiradas_comprobadas) ? b.retiradas_comprobadas
      : b.retiradas_busqueda ? [{ organismo: 'varios', fecha: HOY, resultado: b.retiradas.length ? `${b.retiradas.length} encontrada(s)` : 'ninguna encontrada', nota: b.retiradas_busqueda }] : [];

    const dt = { ...(b.datos_tecnicos || {}) };
    garantiaColumnas(b.garantias, dt);
    // PVEL result → pruebas_independientes, keeping its own naturaleza (a brand press release stays "declarado").
    if (dt.resultado_pvel) {
      const pv = dt.resultado_pvel; delete dt.resultado_pvel;
      const pi = dt.pruebas_independientes;
      if (!pi || pi.valor == null) dt.pruebas_independientes = { ...pv, nota: [pv.nota, pi?.nota].filter(Boolean).join(' ') || undefined };
      else if (pv.valor != null) pi.nota = [pi.nota, `Kiwa PVEL: ${pv.valor} (${pv.naturaleza}; ${pv.fuente})`].filter(Boolean).join(' ');
      else if (pv.nota) pi.nota = [pi.nota, `Kiwa PVEL: ${pv.nota}`].filter(Boolean).join(' ');
    }
    const ean = Array.isArray(b.ean) ? b.ean : b.ean && b.ean.valor ? [b.ean] : [];
    const p = {
      id: b.slug || slug(f.replace(/\.json$/, '')), nombre: b.nombre, marca_id: marcaId,
      modelo: b.modelo, variante_ficha: b.variante_ficha, subcategoria: SUBCAT[carpeta],
      ean, estado: b.estado || 'desconocido', anio_lanzamiento: b.anio_lanzamiento ?? null,
      foto: b.foto || b.imagen || null, resumen: b.resumen,
      datos_tecnicos: dt, garantias: b.garantias || null, origen,
      certificados: b.certificados || [], documentos: b.documentos || [],
      afirmaciones: (b.afirmaciones || []).map((a) => ({ ...a, veredicto: String(a.veredicto || '').replace(' ', '_') })),
      retiradas: b.retiradas || [], retiradas_comprobadas: comprobadas,
      ofertas, compatibles: b.compatibles || [], pendiente: b.pendiente || [],
    };
    productos.push(p);
    const precios = ofertas.map((o) => o.precio_eur).filter((n) => typeof n === 'number');
    indice.push([p.subcategoria, p.id, p.nombre, b.marca, p.estado, p.afirmaciones.length,
      p.retiradas.length, ofertas.length, precios.length ? Math.min(...precios) : '', p.pendiente.length]);
  }
  fs.writeFileSync(path.join(DIR, `${carpeta}.json`), JSON.stringify({ generado: HOY, productos }, null, 2));
}

fs.writeFileSync(path.join(DIR, 'marcas.json'), JSON.stringify({ marcas: [...marcas.values()] }, null, 2));
fs.writeFileSync(path.join(DIR, 'distribuidores.json'), JSON.stringify({ distribuidores: [...distribuidores.values()] }, null, 2));
const csv = (v) => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v);
fs.writeFileSync(path.join(DIR, 'indice.csv'),
  ['subcategoria,id,nombre,marca,estado,afirmaciones,retiradas,ofertas,precio_min_eur,pendientes', ...indice.map((r) => r.map(csv).join(','))].join('\n') + '\n');
console.log(`productos: ${indice.length}, marcas: ${marcas.size}, distribuidores: ${distribuidores.size}`);
if (errores.length) { console.error('errores:\n' + errores.join('\n')); process.exitCode = 1; }
