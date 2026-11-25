#!/usr/bin/env node
// Measures per aspect and level for the Geometría test, written by the evaluador-geometria agent.
//   node scripts/geometria-medidas.mjs --verificar [tema]   validate scripts/medidas/datos/*.json
//   node scripts/geometria-medidas.mjs --aplicar            validate all and build public/geometria-figura/medidas.json
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DATOS = JSON.parse(fs.readFileSync(path.join(RAIZ, "public/geometria-figura/datos.json"), "utf8"));
const DIR = path.join(RAIZ, "scripts/medidas/datos");
const SALIDA = path.join(RAIZ, "public/geometria-figura/medidas.json");

// Labels and party names stay out of the measures: the page values measures, not people
const PROHIBIDO = /\b(antisistema|ultras?|radical(es)?|extremas?|extremos?|extremistas?|fachas?|izquierda|derecha|PP|PSOE|Vox|Sumar|Podemos|Bildu|ERC|Junts|PNV|Frente Amplio)\b/i;
const CIFRA = /\d+([.,]\d+)?\s?(%|€|euros|millones|mil millones)/i;

function validar(k) {
  const err = [];
  const tema = DATOS.temas.find((t) => t.k === k);
  if (!tema) return [`tema desconocido: ${k}`];
  const f = path.join(DIR, `${k}.json`);
  if (!fs.existsSync(f)) return [`falta ${path.relative(RAIZ, f)}`];
  let d;
  try { d = JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return [`JSON no válido: ${e.message}`]; }
  const largo = (s, a, b, donde) => { if (typeof s !== "string" || s.trim().length < a || s.trim().length > b) err.push(`${donde}: debe tener entre ${a} y ${b} caracteres (tiene ${typeof s === "string" ? s.trim().length : "nada"})`); };
  const limpio = (s, donde) => { const m = typeof s === "string" && s.match(PROHIBIDO); if (m) err.push(`${donde}: no se usa «${m[0]}»`); };
  if (d.tema !== k) err.push(`"tema" debe ser "${k}"`);
  const ev = d.evaluacion || {};
  if (!Number.isInteger(ev.nota) || ev.nota < 1 || ev.nota > 10) err.push("evaluacion.nota: entero de 1 a 10");
  largo(ev.resumen, 40, 600, "evaluacion.resumen");
  if (!Array.isArray(ev.problemas) || ev.problemas.length < 3) err.push("evaluacion.problemas: al menos 3");
  else ev.problemas.forEach((p, j) => { largo(p.problema, 15, 400, `problema ${j + 1}`); largo(p.mejora, 15, 400, `problema ${j + 1} (mejora)`); });
  if (!Array.isArray(d.aspectos) || d.aspectos.length !== tema.ejes.length) { err.push(`aspectos: deben ser ${tema.ejes.length}`); return err; }
  d.aspectos.forEach((a, i) => {
    const donde = `aspecto ${i + 1}`;
    if (a.i !== i) err.push(`${donde}: "i" debe ser ${i}`);
    if (a.n !== tema.ejes[i].n) err.push(`${donde}: "n" debe ser «${tema.ejes[i].n}»`);
    if (!Array.isArray(a.niveles) || a.niveles.length !== 5) { err.push(`${donde}: 5 niveles`); return; }
    const vistos = new Set();
    a.niveles.forEach((nv, j) => {
      const dn = `${donde}, nivel ${j}`;
      if (nv.nivel !== j) err.push(`${dn}: "nivel" debe ser ${j}`);
      largo(nv.resumen, 40, 200, `${dn} (resumen)`); limpio(nv.resumen, `${dn} (resumen)`);
      const [mn, mx] = j === 0 ? [2, 3] : [3, 5];
      if (!Array.isArray(nv.medidas) || nv.medidas.length < mn || nv.medidas.length > mx) { err.push(`${dn}: de ${mn} a ${mx} medidas`); return; }
      nv.medidas.forEach((m, q) => {
        const dm = `${dn}, medida ${q + 1}`;
        largo(m.nombre, 3, 70, `${dm} (nombre)`); largo(m.texto, 40, 300, `${dm} (texto)`);
        limpio(m.nombre, dm); limpio(m.texto, dm);
        if (typeof m.nombre === "string" && /\.\s*$/.test(m.nombre)) err.push(`${dm}: el nombre va sin punto final`);
        const clave = String(m.nombre || "").toLowerCase().trim();
        if (vistos.has(clave)) err.push(`${dm}: nombre repetido en este aspecto («${m.nombre}»)`);
        vistos.add(clave);
        // Who wins and who loses, first degree (directly) and second degree (through others), short labels
        const co = m.colectivos;
        if (!co || typeof co !== "object") err.push(`${dm}: faltan "colectivos"`);
        else {
          for (const lado of ["beneficia", "perjudica"]) for (const grado of ["directo", "indirecto"]) {
            const l = co[lado] && co[lado][grado];
            if (!Array.isArray(l) || l.length > 4) { err.push(`${dm}: colectivos.${lado}.${grado} debe ser una lista de 0 a 4`); continue; }
            l.forEach((g) => { largo(g, 3, 70, `${dm} (colectivo «${g}»)`); limpio(g, `${dm} (colectivo)`); });
          }
          if (!(co.beneficia && Array.isArray(co.beneficia.directo) && co.beneficia.directo.length)) err.push(`${dm}: al menos un colectivo que se beneficia en primer grado`);
          const pj = co.perjudica || {};
          if (![...(pj.directo || []), ...(pj.indirecto || [])].length && !(typeof co.sin_perjuicio === "string" && co.sin_perjuicio.trim().length >= 20)) err.push(`${dm}: o algún perjudicado, o "sin_perjuicio" explicando por qué nadie pierde`);
        }
        if (CIFRA.test(m.texto || "") && m.meta !== true && !/^https?:\/\//.test(m.fuente || "")) err.push(`${dm}: tiene una cifra; marca "meta": true si es un objetivo, o pon "fuente" si es un dato`);
      });
    });
  });
  return err;
}

// ---------------------------------------------------------------------------
// Pages: /medidas/ (index), /medidas/<aspecto>/ and /medidas/<aspecto>/<nivel>/, one per level,
// so every «Ver más» lands on its own address (SEO). Plus public/geometria-figura/paginas.json,
// the list the sitemap of luzhumanidad.com reads (src/server/sitios.ts).
// ---------------------------------------------------------------------------
const SITIO = "https://luzhumanidad.com";
const NIV = ["Indefinido", "Básico", "Intermedio", "Avanzado", "Ideal"];
const NIV_TITULO = ["Indefinido", "Medidas básicas", "Medidas intermedias", "Medidas avanzadas", "Medidas ideales"];
const NIV_SLUG = ["indefinido", "basico", "intermedio", "avanzado", "ideal"];
const TEMA_SLUG = { inm: "inmigracion", ser: "servicios", eco: "economia", tra: "trabajo", viv: "vivienda", amb: "clima", ter: "territorio", der: "derechos", ins: "instituciones", ext: "exterior" };
const MARCA = "<!-- generado por scripts/geometria-medidas.mjs: no editar a mano -->";
function slugify(t) { return String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const minus = (t) => t.charAt(0).toLowerCase() + t.slice(1);
const colorNivel = (t, n) => (n === 4 ? "#F6BE3B" : n === 0 ? "#E5484D" : t.c);
const recorta = (t, n = 158) => (t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n - 1)) + "…");

const cabecera = (titulo, descripcion, ruta, tc) => `<!doctype html>
<html lang="es">
<head>
${MARCA}
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<link rel="canonical" href="${SITIO}${ruta}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descripcion)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${SITIO}${ruta}">
<link rel="stylesheet" href="/ideal/ideal.css">
<link rel="stylesheet" href="/medidas/medidas.css">
</head>
<body style="--tc:${esc(tc || "#5FB3E6")}">
<header class="top"><a class="marca" href="${SITIO}/geometria-politica">Geometría política</a><span class="navs"><a class="todos" href="/partidos/">Partidos</a><a class="todos" href="/medidas/">Todas las medidas</a></span></header>`;
const pie = `<footer class="pie">
<p>Estas medidas son propuestas de trabajo de esta web, ordenadas de menos a más exigentes; no son un hecho ni una recomendación de voto. Las cifras marcadas como objetivo son metas propuestas; los datos llevan su fuente.</p>
<p>Herramienta educativa sin afiliación política. Un proyecto de <a href="${SITIO}/">Luz &amp; Humanidad</a>.</p>
</footer>
</body>
</html>
`;
const CSS = `/* generado por scripts/geometria-medidas.mjs: no editar a mano */
.navs{display:flex;gap:16px}
.pildoras{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 18px;padding:0;list-style:none}
.pildoras a,.pildoras span{display:inline-block;padding:6px 12px;border-radius:999px;border:1.5px solid var(--line);font-size:14px;text-decoration:none;color:var(--ink2)}
.pildoras span{border-color:var(--c);background:color-mix(in srgb,var(--c) 16%,#fff);color:var(--ink);font-weight:700}
.pildoras a:hover{border-color:var(--c)}
.lede.nv{border-color:var(--c);background:color-mix(in srgb,var(--c) 9%,#fff)}
.mds{padding-left:1.3em;display:grid;gap:14px;margin:0}
.mds li::marker{color:var(--c);font-size:1.1em}
.mds li b{display:block;font-size:1.05rem;color:var(--ink)}
.mds li p{margin:2px 0 0;color:var(--ink2)}
.mds .meta{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:var(--bg2);border:1px solid var(--line);font-size:12px;color:var(--muted);vertical-align:2px}
.mds .fte{font-size:13.5px;color:#1D4ED8;margin-left:4px}
.cols{display:grid;gap:4px;margin-top:8px;font-size:14px}
.col{display:flex;flex-wrap:wrap;gap:2px 10px;align-items:baseline;padding:6px 10px;border-radius:10px}
.col b{font-size:13px;min-width:7.5em}
.col em{font-style:normal;color:var(--muted)}
.col.mas{background:#ECFDF5}.col.mas b{color:#047857}
.col.menos{background:#FEF2F2}.col.menos b{color:#B91C1C}
.col.cero{background:var(--bg2)}.col.cero b{color:var(--ink2)}
.antes details{border:1px solid var(--line);border-left:5px solid var(--c);border-radius:12px;padding:10px 14px;margin:0 0 8px;background:var(--bg2)}
.antes summary{cursor:pointer;font-weight:600}
.antes ul{margin:8px 0 0;padding-left:1.2em;font-size:15px;color:var(--ink2)}
.sig{padding:16px 18px;border:1px dashed var(--c);border-radius:14px}
.sig b{color:var(--ink)}
.acciones{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.boton.claro{background:#fff;color:var(--ink);border:1.5px solid var(--ink)}
.niveles-asp{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.niveles-asp li{padding:14px 16px;border:1px solid var(--line);border-left:5px solid var(--c);border-radius:12px}
.niveles-asp h3 a{text-decoration:none}
.niveles-asp p{margin:4px 0 6px;color:var(--ink2);font-size:15.5px}
.niveles-asp small{color:var(--muted)}
.partidos .pt-grupo{margin:0 0 14px}
.partidos h3{margin:0 0 8px;font-size:1rem;color:var(--ink2)}
.partidos ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.partidos li{display:grid;grid-template-columns:14px minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--bg)}
.partidos li i{width:14px;height:14px;border-radius:50%;margin-top:5px}
.partidos li small{display:block;margin-top:4px;font-size:14px;line-height:1.45;color:var(--ink2)}
.partidos li small a{color:#1D4ED8}
.chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:8px;font-size:13px}
.chips em{font-style:normal;color:var(--muted)}
.pt-n{text-decoration:none}
.pt-n:hover b{text-decoration:underline}
.chip{text-decoration:none;padding:2px 9px;border-radius:999px;border:1px solid var(--pc);background:color-mix(in srgb,var(--pc) 12%,#fff);color:var(--ink)}
.tabla-ind{width:100%;border-collapse:collapse;font-size:15px}
.tabla-ind td,.tabla-ind th{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.tabla-ind td a{display:inline-block;margin:2px 6px 2px 0;font-size:13.5px;color:#1D4ED8}
`;

// ---------------------------------------------------------------------------
// One page per party: /partidos/<partido>/ (+ /partidos/). Its figure in each topic, and per topic one
// bullet per aspect: the level it reaches, what it proposes (RAZONES, with source) and what that level
// contains (this site's measures, labelled as such: they are not the party's words).
// ---------------------------------------------------------------------------
function leerTemasCompletos() {
  const html = fs.readFileSync(path.join(RAIZ, "public/observatorio-polarizacion/index.html"), "utf8");
  const bloque = (nombre) => {
    const inicio = html.indexOf(`const ${nombre} = `); if (inicio < 0) throw new Error(`No encuentro ${nombre}`);
    let i = html.indexOf("=", inicio) + 1, prof = 0, enCadena = null, esc2 = false;
    for (; i < html.length; i++) {
      const c = html[i];
      if (enCadena) { if (esc2) esc2 = false; else if (c === "\\") esc2 = true; else if (c === enCadena) enCadena = null; continue; }
      if (c === '"' || c === "'" || c === "`") enCadena = c;
      else if ("{[(".includes(c)) prof++;
      else if ("}])".includes(c)) { prof--; if (prof === 0) return html.slice(inicio, html.indexOf(";", i) + 1); }
    }
    throw new Error(`${nombre} no cierra`);
  };
  return vm.runInNewContext(bloque("TEMAS") + "\n;TEMAS", {}, { timeout: 2000 });
}
function radar(vals, color, tam, etiquetas) {
  const n = vals.length, C = tam / 2, R = tam / 2 - (etiquetas ? 22 : 6);
  const xy = (i, nv) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n, d = (R * (nv + 1)) / 5; return [C + d * Math.cos(a), C + d * Math.sin(a)]; };
  let o = `<svg viewBox="0 0 ${tam} ${tam}" role="img" aria-hidden="true">`;
  for (let nv = 0; nv < 5; nv++) o += `<circle cx="${C}" cy="${C}" r="${((R * (nv + 1)) / 5).toFixed(1)}" fill="none" stroke="${nv === 4 ? "#F6BE3B" : nv === 0 ? "#E5484D" : "#CBD5E1"}" stroke-width="${nv === 4 ? 1.6 : 1}"/>`;
  for (let i = 0; i < n; i++) { const [x, y] = xy(i, 4); o += `<line x1="${C}" y1="${C}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#CBD5E1"/>`; }
  o += `<polygon points="${vals.map((v, i) => xy(i, v).map((q) => q.toFixed(1)).join(",")).join(" ")}" fill="${color}" fill-opacity=".25" stroke="${color}" stroke-width="2.2" stroke-linejoin="round"/>`;
  vals.forEach((v, i) => { const [x, y] = xy(i, v); o += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${etiquetas ? 4 : 2.6}" fill="${color}"/>`; if (etiquetas) { const [lx, ly] = xy(i, 4.85); o += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" fill="#64748B">${i + 1}</text>`; } });
  return o + "</svg>";
}
const CSS_PARTIDOS = `
.pt-cab{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.pt-cab i{width:22px;height:22px;border-radius:50%;background:var(--pc)}
.reparto{display:flex;height:14px;border-radius:99px;overflow:hidden;margin:6px 0 4px;border:1px solid var(--line)}
.reparto span{display:block;height:100%}
.leyenda-niv{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:13.5px;color:var(--ink2)}
.leyenda-niv b{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.mapa-temas{list-style:none;margin:18px 0 0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.mapa-temas a{display:block;padding:8px 8px 10px;border:1px solid var(--line);border-top:4px solid var(--tc);border-radius:12px;text-decoration:none;text-align:center;font-size:13.5px;font-weight:600;background:var(--bg)}
.mapa-temas a:hover{border-color:var(--pc)}
.mapa-temas svg{width:100%;height:auto;display:block}
.mapa-temas small{display:block;font-weight:400;color:var(--muted)}
.tema-p{margin-top:44px;padding-top:12px;border-top:4px solid var(--tc)}
.tema-p .fig{display:grid;grid-template-columns:minmax(180px,240px) minmax(0,1fr);gap:20px;align-items:start}
.tema-p .fig svg{width:100%;height:auto}
.tema-p .postura{margin:0;color:var(--ink2)}
.tema-p .postura b{color:var(--ink)}
.asp{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:12px}
.asp>li{padding:12px 14px;border:1px solid var(--line);border-left:5px solid var(--c);border-radius:12px}
.asp .t{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px}
.asp .t b{font-size:1.02rem}
.asp .niv{display:inline-block;padding:2px 10px;border-radius:999px;background:color-mix(in srgb,var(--c) 16%,#fff);border:1px solid var(--c);font-size:13px;font-weight:700}
.asp .rz{margin:8px 0 0;font-size:15px;color:var(--ink2)}
.asp .rz a{color:#1D4ED8}
.asp .inc{margin:8px 0 2px;font-size:14px;color:var(--muted)}
.asp .nombres{margin:0;padding-left:1.2em;display:grid;gap:2px;font-size:15px}
.asp .nombres li::marker{color:var(--c)}
.asp details{margin-top:8px;font-size:14.5px}
.asp summary{cursor:pointer;color:var(--ink2);font-weight:600}
.asp details ul{margin:6px 0 0;padding-left:1.2em;color:var(--ink2)}
.asp .mas{font-size:14px;color:#1D4ED8}
.otros-p{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0;padding:0}
.otros-p a{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid var(--line);border-radius:999px;text-decoration:none;font-weight:600}
.otros-p i{width:10px;height:10px;border-radius:50%;background:var(--pc)}
.lista-p{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.lista-p a{display:block;padding:14px;border:1px solid var(--line);border-top:5px solid var(--pc);border-radius:14px;text-decoration:none;background:var(--bg)}
.lista-p a:hover{border-color:var(--pc)}
.lista-p b{font-size:1.15rem}
.lista-p p{margin:6px 0 0;font-size:14px;color:var(--ink2)}
@media (max-width:700px){.mapa-temas{grid-template-columns:repeat(2,minmax(0,1fr))}.tema-p .fig{grid-template-columns:minmax(0,1fr)}.tema-p .fig svg{max-width:240px}.lista-p{grid-template-columns:minmax(0,1fr)}}
`;
const COL_NIV = ["#E5484D", "#94A3B8", "#64748B", "#334155", "#F6BE3B"];
function paginasPartidos(temas, RAZONES, todos, escribir) {
  const TEMAS = leerTemasCompletos();
  const rutas = [];
  fs.appendFileSync(path.join(RAIZ, "public/medidas/medidas.css"), CSS_PARTIDOS);
  const ESCR = (rel, html) => { const f = path.join(RAIZ, "public/partidos", rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
  fs.rmSync(path.join(RAIZ, "public/partidos"), { recursive: true, force: true });
  const reparto = (p) => { const c = [0, 0, 0, 0, 0]; for (const k of temas) for (const v of DATOS.temas.find((t) => t.k === k).v[p.k]) c[Math.floor(v + 0.01)]++; return c; };
  const barra = (c) => { const tot = c.reduce((a, b) => a + b, 0); return `<div class="reparto" role="img" aria-label="${NIV.map((n, j) => `${n}: ${c[j]}`).join(", ")}">${c.map((x, j) => (x ? `<span style="width:${((x / tot) * 100).toFixed(2)}%;background:${COL_NIV[j]}" title="${NIV[j]}: ${x}"></span>` : "")).join("")}</div><div class="leyenda-niv">${c.map((x, j) => `<span><b style="background:${COL_NIV[j]}"></b>${NIV[j]}: ${x}</span>`).join("")}</div>`; };
  for (const p of DATOS.partidos) {
    const ps = slugify(p.n), ruta = `/partidos/${ps}/`, c = reparto(p), tot = c.reduce((a, b) => a + b, 0);
    const desc = `Dónde se sitúa ${p.n} en los diez temas de la geometría política, aspecto por aspecto: el nivel al que llega, lo que propone con sus fuentes y lo que incluye cada nivel.`;
    let h = cabecera(`${p.n}: su geometría política y sus propuestas por temas · Geometría política`, desc, ruta, p.c) + `
<main style="--pc:${esc(p.c)}">
<p class="ceja"><a href="/partidos/">Partidos</a> · <a href="${SITIO}/geometria-politica">Geometría política</a></p>
<div class="pt-cab"><i aria-hidden="true"></i><h1 style="margin:0">${esc(p.n)}</h1></div>
<p class="lede nv" style="--c:${esc(p.c)}">Su geometría en los diez temas: en cada aspecto, hasta qué nivel llega (de indefinido a ideal), qué propone y qué incluye ese nivel.</p>
<section><h2>En los ${tot} aspectos</h2>${barra(c)}
<ul class="mapa-temas">${temas.map((k) => { const t = DATOS.temas.find((x) => x.k === k), v = t.v[p.k]; return `<li><a href="#${TEMA_SLUG[k]}" style="--tc:${esc(t.c)}">${radar(v, p.c, 120, false)}${esc(t.n)}<small>Básico o más en ${v.filter((x) => x >= 1).length} de ${v.length}</small></a></li>`; }).join("")}</ul>
</section>`;
    for (const k of temas) {
      const t = DATOS.temas.find((x) => x.k === k), T = TEMAS[k], v = t.v[p.k];
      h += `
<section class="tema-p" id="${TEMA_SLUG[k]}" style="--tc:${esc(t.c)}">
<h2>${esc(t.n)}</h2>
<div class="fig">${radar(v, p.c, 260, true)}<div><p class="postura"><b>Su postura en el tema:</b> ${esc(T && T.t && T.t[p.k] ? T.t[p.k] : "Sin texto todavía.")}</p><p class="nota" style="margin-top:8px">${esc(t.q)}</p><p><a class="mas" href="${SITIO}/geometria-politica?tema=${TEMA_SLUG[k]}">Ver ${esc(t.n.toLowerCase())} con los demás partidos →</a></p></div></div>
<ol class="asp">
${t.ejes.map((e, i) => {
  const l = Math.floor(v[i] + 0.01), col = colorNivel(t, l), x = todos.find((y) => y.k === k && y.i === i);
  const rz = RAZONES[p.k] && RAZONES[p.k][k] && RAZONES[p.k][k][String(i)];
  const nv = x.a.niveles[l];
  return `<li style="--c:${col}"><div class="t"><b>${i + 1}. ${esc(e.n)}</b><span class="niv">${NIV[l]}</span></div>`
    + (rz ? `<p class="rz"><b>${rz.tp === "vacio" ? "Qué hemos buscado" : "Qué propone"}:</b> ${esc(rz.r)}${/^https?:\/\//.test(rz.u || "") ? ` <a href="${esc(rz.u)}" rel="noopener nofollow" target="_blank">Fuente: ${esc(rz.f || host(rz.u))} ↗</a>` : ""}</p>` : "")
    + `<p class="inc">${l === 0 ? "Quedarse en indefinido aquí es:" : `El nivel ${NIV[l].toLowerCase()} incluye (medidas de esta web):`}</p><ul class="nombres">${nv.medidas.map((m) => `<li>${esc(m.nombre)}</li>`).join("")}</ul>`
    + `<details><summary>Ver cada medida explicada</summary><p style="margin:6px 0 0">${esc(nv.resumen)}</p><ul>${nv.medidas.map((m) => `<li><b>${esc(m.nombre)}.</b> ${esc(m.texto)}${htmlColectivos(m)}</li>`).join("")}</ul></details>`
    + `<p style="margin:8px 0 0"><a class="mas" href="/medidas/${x.slug}/${NIV_SLUG[l]}/">Ver el nivel y qué partidos están en él →</a>${l < 4 ? ` · <a class="mas" href="/medidas/${x.slug}/${NIV_SLUG[l + 1]}/">Qué le falta para el siguiente nivel →</a>` : ""}</p></li>`;
}).join("\n")}
</ol>
</section>`;
    }
    h += `
<section><h2>Otros partidos</h2><ul class="otros-p">${DATOS.partidos.filter((q) => q !== p).map((q) => `<li><a href="/partidos/${slugify(q.n)}/" style="--pc:${esc(q.c)}"><i></i>${esc(q.n)}</a></li>`).join("")}</ul>
<p class="nota" style="margin-top:16px">Los niveles los asigna esta web a partir de programas y declaraciones públicas; «Qué propone» y «Qué hemos buscado» resumen lo localizado, con su fuente cuando la hay. Las medidas de cada nivel son propuestas de esta web, no del partido. No es una recomendación de voto.</p>
<div class="acciones"><a class="boton" href="${SITIO}/geometria-politica">Haz el test y compara tu geometría con la de ${esc(p.n)} →</a></div>
</section>
</main>
` + pie;
    ESCR(`${ps}/index.html`, h);
    rutas.push(ruta);
  }
  const ind = cabecera("Los partidos y su geometría política · Geometría política", "La geometría política de cada partido en diez temas: hasta dónde llega en cada aspecto, qué propone y con qué fuentes.", "/partidos/") + `
<main class="indice">
<p class="ceja"><a href="${SITIO}/geometria-politica">Geometría política</a></p>
<h1>Los partidos y su geometría</h1>
<p class="lede nv" style="--c:#5FB3E6">Elige un partido para ver su figura en los diez temas y, tema por tema, el nivel al que llega en cada aspecto, lo que propone y sus fuentes.</p>
<ul class="lista-p">${DATOS.partidos.map((p) => { const c = reparto(p); return `<li><a href="/partidos/${slugify(p.n)}/" style="--pc:${esc(p.c)}"><b>${esc(p.n)}</b>${barra(c)}<p>Básico o más en ${c.slice(1).reduce((a, b) => a + b, 0)} de ${c.reduce((a, b) => a + b, 0)} aspectos.</p></a></li>`; }).join("")}</ul>
</main>
` + pie;
  ESCR("index.html", ind);
  rutas.push("/partidos/");
  console.log(`Páginas de partidos: ${rutas.length}`);
  return rutas;
}

// Party positions: the levels live in datos.json (TEMAS[k].v), the reasons in the RAZONES constant of the
// geometry page (one per party and aspect, with its source). Same data the level side panel shows.
// «A quién beneficia y a quién perjudica», first and second degree (Eugenio, 2026-11-25)
function htmlColectivos(m) {
  const c = m.colectivos; if (!c) return "";
  const fila = (cls, tit, d, i) => (d.length || i.length) ? `<div class="col ${cls}"><b>${tit}</b>${d.length ? `<span><em>1.er grado:</em> ${d.map(esc).join(", ")}</span>` : ""}${i.length ? `<span><em>2.º grado:</em> ${i.map(esc).join(", ")}</span>` : ""}</div>` : "";
  return `<div class="cols">${fila("mas", "Se benefician", c.beneficia.directo, c.beneficia.indirecto)}${fila("menos", "Se perjudican", c.perjudica.directo, c.perjudica.indirecto)}${!c.perjudica.directo.length && !c.perjudica.indirecto.length && c.sin_perjuicio ? `<div class="col cero"><b>Nadie pierde de forma clara</b><span>${esc(c.sin_perjuicio)}</span></div>` : ""}</div>`;
}
function leerRazones() {
  const html = fs.readFileSync(path.join(RAIZ, "public/observatorio-polarizacion/index.html"), "utf8");
  const m = html.match(/^const RAZONES = (\{.*\});\s*$/m);
  if (!m) throw new Error("No encuentro la constante RAZONES en la página de la geometría");
  return JSON.parse(m[1]);
}
function htmlPartidos(t, i, n, RAZONES) {
  const grupos = { aqui: [], mas: [], menos: [] };
  for (const p of DATOS.partidos) {
    const l = Math.max(0, Math.min(4, Math.floor((t.v[p.k] || [])[i] + 0.01)));
    if (!Number.isInteger(l)) continue;
    grupos[l === n ? "aqui" : l > n ? "mas" : "menos"].push([p, l]);
  }
  const fila = ([p, l]) => {
    const rz = RAZONES[p.k] && RAZONES[p.k][t.k] && RAZONES[p.k][t.k][String(i)];
    const est = l === n ? "" : l > n ? ` · llega a ${NIV[l].toLowerCase()}` : ` · se queda en ${NIV[l].toLowerCase()}`;
    const por = rz ? `<small><b>${rz.tp === "vacio" ? "Qué hemos buscado" : "Qué propone"}:</b> ${esc(rz.r)}${/^https?:\/\//.test(rz.u || "") ? ` <a href="${esc(rz.u)}" rel="noopener nofollow" target="_blank">Fuente: ${esc(rz.f || host(rz.u))} ↗</a>` : ""}</small>` : "";
    return `<li><i style="background:${esc(p.c)}"></i><span><a class="pt-n" href="/partidos/${slugify(p.n)}/#${TEMA_SLUG[t.k]}"><b>${esc(p.n)}</b></a>${est}${por}</span></li>`;
  };
  const grupo = (tit, lista) => (lista.length ? `<div class="pt-grupo"><h3>${tit} (${lista.length})</h3><ul>${lista.map(fila).join("")}</ul></div>` : "");
  return `<section class="partidos" id="partidos">
<h2>Qué partidos están en este nivel</h2>
${grupo(n === 0 ? "Se quedan por debajo de lo básico" : `Están justo en ${NIV[n].toLowerCase()}`, grupos.aqui)}
${grupo(n === 0 ? "Pasan de ahí" : n === 4 ? "Van más allá" : "Están más avanzados", grupos.mas)}
${grupo(n === 0 ? "" : "Se quedan fuera: no llegan a este nivel", grupos.menos)}
<p class="nota">Posición de cada partido valorada por esta web a partir de sus programas y declaraciones públicas, en una escala de cinco niveles. Se asignó con la descripción corta de cada nivel: todavía no se ha revisado medida por medida con esta lista. Donde hay un texto que justifica el nivel, sale debajo del nombre con su fuente. No es una recomendación de voto. ¿Ves un error? <a href="${SITIO}/geometria-politica?tema=${TEMA_SLUG[t.k]}">Díselo al equipo desde la geometría</a>.</p>
</section>`;
}
const chipsPartidos = (t, i, n) => DATOS.partidos.filter((p) => Math.floor((t.v[p.k] || [])[i] + 0.01) === n).map((p) => `<a class="chip" href="/partidos/${slugify(p.n)}/#${TEMA_SLUG[t.k]}" style="--pc:${esc(p.c)}">${esc(p.n)}</a>`).join("");

function paginas(temas) {
  const RAZONES = leerRazones();
  const RAIZ_M = path.join(RAIZ, "public/medidas");
  fs.rmSync(RAIZ_M, { recursive: true, force: true });
  const escribir = (rel, html) => { const f = path.join(RAIZ_M, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
  escribir("medidas.css", CSS);
  const rutas = [];
  const vistos = new Map();
  const todos = [];
  for (const k of temas) {
    const t = DATOS.temas.find((x) => x.k === k);
    const d = JSON.parse(fs.readFileSync(path.join(DIR, `${k}.json`), "utf8"));
    t.ejes.forEach((e, i) => {
      const slug = slugify(e.n);
      if (vistos.has(slug)) throw new Error(`Dirección repetida: /medidas/${slug}/ (${vistos.get(slug)} y ${k})`);
      vistos.set(slug, k);
      todos.push({ k, t, e, i, slug, a: d.aspectos[i] });
    });
  }
  for (const x of todos) {
    const { k, t, e, slug, a } = x;
    const hermanos = todos.filter((y) => y.k === k && y !== x);
    const enTema = `${SITIO}/geometria-politica?tema=${TEMA_SLUG[k]}`;
    const pildoras = (actual) => `<ul class="pildoras" aria-label="Niveles">${NIV.map((n, j) => `<li style="--c:${colorNivel(t, j)}">${j === actual ? `<span aria-current="page">${n}</span>` : `<a href="/medidas/${slug}/${NIV_SLUG[j]}/">${n}</a>`}</li>`).join("")}</ul>`;
    const lista = (nv) => `<ul class="mds">${nv.medidas.map((m) => `<li><b>${esc(m.nombre)}${m.meta ? `<span class="meta">objetivo propuesto</span>` : ""}</b><p>${esc(m.texto)}${/^https?:\/\//.test(m.fuente || "") ? ` <a class="fte" href="${esc(m.fuente)}" rel="noopener nofollow" target="_blank">fuente: ${esc(host(m.fuente))} ↗</a>` : ""}</p>${htmlColectivos(m)}</li>`).join("\n")}</ul>`;
    // one page per level
    a.niveles.forEach((nv, n) => {
      const ruta = `/medidas/${slug}/${NIV_SLUG[n]}/`;
      const c = colorNivel(t, n);
      const titulo = n === 0 ? `Qué es quedarse en «indefinido» en ${minus(e.n)} · ${t.n}` : `${NIV_TITULO[n]} en ${minus(e.n)} · ${t.n}`;
      const antes = n > 1 ? `<section class="antes"><h2>Lo que ya incluye</h2><p class="nota">Cada nivel incluye todo lo de los anteriores.</p>${a.niveles.slice(1, n).map((p, j) => `<details style="--c:${colorNivel(t, j + 1)}"><summary>${NIV_TITULO[j + 1]}</summary><ul>${p.medidas.map((m) => `<li>${esc(m.nombre)}</li>`).join("")}</ul><p><a href="/medidas/${slug}/${NIV_SLUG[j + 1]}/">Ver las ${NIV_TITULO[j + 1].toLowerCase()} →</a></p></details>`).join("")}</section>` : "";
      const sig = n < 4 ? `<section><h2>${n === 0 ? "Lo mínimo para salir de aquí" : "El siguiente paso"}</h2><div class="sig" style="--c:${colorNivel(t, n + 1)}"><b>${NIV_TITULO[n + 1]}.</b> ${esc(a.niveles[n + 1].resumen)} <a href="/medidas/${slug}/${NIV_SLUG[n + 1]}/">Ver las medidas →</a></div></section>` : "";
      const ideal = n === 4 && e.is ? `<p><a class="boton claro" href="/ideal/${e.is}/">La propuesta ideal completa: ${esc(e.it)} →</a></p>` : "";
      const html = cabecera(`${titulo} · Geometría política`, recorta(nv.resumen), ruta, t.c) + `
<main style="--c:${c}">
<p class="ceja"><a href="${enTema}">${esc(t.n)}</a> · <a href="/medidas/${slug}/">${esc(e.n)}</a> · <b style="color:${c}">${NIV[n]}</b></p>
<h1>${esc(n === 0 ? `${e.n}: nivel indefinido` : `${e.n}: ${NIV_TITULO[n].toLowerCase()}`)}</h1>
${pildoras(n)}
<p class="lede nv">${esc(nv.resumen)}</p>
<section>
<h2>${n === 0 ? "Cómo se reconoce este nivel" : "Las medidas"}</h2>
${lista(nv)}
</section>
${ideal}
${htmlPartidos(t, x.i, n, RAZONES)}
${antes}
${sig}
<section>
<h2>Qué mide este aspecto</h2>
<p>${esc(e.d)}</p>
<div class="acciones"><a class="boton" href="${enTema}">Haz el test y mira tu geometría en ${esc(t.n)} →</a><a class="boton claro" href="/medidas/${slug}/">Los cinco niveles de este aspecto</a></div>
</section>
<nav class="otras" aria-label="Otros aspectos de ${esc(t.n)}">
<h2>${NIV_TITULO[n] === "Indefinido" ? "Otros aspectos" : `${NIV_TITULO[n]} en otros aspectos`} de ${esc(t.n)}</h2>
<ul>
${hermanos.map((y) => `<li><a href="/medidas/${y.slug}/${NIV_SLUG[n]}/"><b>${esc(y.e.n)}</b><span>${esc(recorta(y.a.niveles[n].resumen, 110))}</span></a></li>`).join("\n")}
</ul>
</nav>
</main>
` + pie;
      escribir(`${slug}/${NIV_SLUG[n]}/index.html`, html);
      rutas.push(ruta);
    });
    // the aspect page: the five levels
    const ruta = `/medidas/${slug}/`;
    const html = cabecera(`${e.n}: de indefinido a ideal · ${t.n} · Geometría política`, recorta(e.d), ruta, t.c) + `
<main>
<p class="ceja"><a href="${enTema}">${esc(t.n)}</a> · <b>Los cinco niveles</b></p>
<h1>${esc(e.n)}</h1>
<p class="lede nv" style="--c:${t.c}">${esc(e.d)}</p>
<ol class="niveles-asp">
${a.niveles.map((nv, n) => `<li style="--c:${colorNivel(t, n)}"><h3><a href="/medidas/${slug}/${NIV_SLUG[n]}/">${NIV_TITULO[n]} →</a></h3><p>${esc(nv.resumen)}</p><small>${nv.medidas.map((m) => esc(m.nombre)).join(" · ")}</small>${chipsPartidos(t, x.i, n) ? `<div class="chips"><em>En este nivel:</em> ${chipsPartidos(t, x.i, n)}</div>` : ""}</li>`).join("\n")}
</ol>
<div class="acciones"><a class="boton" href="${enTema}">Haz el test y mira tu geometría en ${esc(t.n)} →</a>${e.is ? `<a class="boton claro" href="/ideal/${e.is}/">La propuesta ideal completa →</a>` : ""}</div>
<nav class="otras" aria-label="Otros aspectos de ${esc(t.n)}">
<h2>Otros aspectos de ${esc(t.n)}</h2>
<ul>
${hermanos.map((y) => `<li><a href="/medidas/${y.slug}/"><b>${esc(y.e.n)}</b><span>${esc(recorta(y.e.d, 110))}</span></a></li>`).join("\n")}
</ul>
</nav>
</main>
` + pie;
    escribir(`${slug}/index.html`, html);
    rutas.push(ruta);
  }
  // the index
  const ind = cabecera("Medidas por nivel, de indefinido a ideal · Geometría política", "Más de mil medidas concretas sobre inmigración, servicios, economía, trabajo, vivienda, clima, territorio, derechos, instituciones y exterior, ordenadas en cinco niveles.", "/medidas/") + `
<main class="indice">
<p class="ceja">Geometría política</p>
<h1>Medidas por nivel, de indefinido a ideal</h1>
<p class="lede nv" style="--c:#5FB3E6">Para cada aspecto de cada tema, qué supone quedarse en indefinido y qué medidas concretas hay en los niveles básico, intermedio, avanzado e ideal. Cada nivel incluye el anterior.</p>
${temas.map((k) => { const t = DATOS.temas.find((x) => x.k === k); return `<section style="--tc:${esc(t.c)}"><h2>${esc(t.n)}</h2><table class="tabla-ind"><tbody>${todos.filter((y) => y.k === k).map((y) => `<tr><th><a href="/medidas/${y.slug}/">${esc(y.e.n)}</a></th><td>${NIV.map((n, j) => `<a href="/medidas/${y.slug}/${NIV_SLUG[j]}/">${n}</a>`).join("")}</td></tr>`).join("")}</tbody></table></section>`; }).join("\n")}
<p class="acciones"><a class="boton" href="${SITIO}/geometria-politica">Haz el test de geometría política →</a><a class="boton claro" href="/ideal/">Las propuestas ideales</a></p>
</main>
` + pie;
  escribir("index.html", ind);
  rutas.push("/medidas/");
  rutas.push(...paginasPartidos(temas, RAZONES, todos, escribir));
  // what the sitemap announces: these pages and the ideal ones
  const ideal = fs.existsSync(path.join(RAIZ, "public/ideal")) ? fs.readdirSync(path.join(RAIZ, "public/ideal"), { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => `/ideal/${x.name}/`) : [];
  const hoy = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(RAIZ, "public/geometria-figura/paginas.json"), JSON.stringify({ fecha: hoy, rutas: ["/ideal/", ...ideal, ...rutas] }));
  console.log(`Páginas: ${rutas.length} en /medidas/ (+ ${ideal.length + 1} del ideal en el sitemap)`);
}

const args = process.argv.slice(2);
const temas = args[1] ? [args[1]] : DATOS.temas.map((t) => t.k);
if (args[0] === "--verificar" || args[0] === "--aplicar") {
  let mal = 0;
  for (const k of temas) {
    const e = validar(k);
    if (e.length) { mal++; console.log(`✗ ${k}: ${e.length} problema(s)`); e.slice(0, 40).forEach((x) => console.log("   - " + x)); }
    else console.log(`✓ ${k}: el tema está bien`);
  }
  if (mal) process.exit(1);
  if (args[0] === "--aplicar") {
    // Compact copy for the page: per topic, per aspect, per level → [resumen, [[nombre, texto], …]]
    const out = { version: 1, temas: {} };
    for (const k of temas) {
      const d = JSON.parse(fs.readFileSync(path.join(DIR, `${k}.json`), "utf8"));
      out.temas[k] = d.aspectos.map((a) => a.niveles.map((nv) => [nv.resumen.trim(), nv.medidas.map((m) => { const c = m.colectivos; return c ? [m.nombre.trim(), m.texto.trim(), [c.beneficia.directo, c.beneficia.indirecto, c.perjudica.directo, c.perjudica.indirecto], c.sin_perjuicio || ""] : [m.nombre.trim(), m.texto.trim()]; })]));
    }
    out.rutas = Object.fromEntries(temas.map((k) => [k, DATOS.temas.find((t) => t.k === k).ejes.map((e) => slugify(e.n))]));
    fs.writeFileSync(SALIDA, JSON.stringify(out));
    console.log(`Escrito ${path.relative(RAIZ, SALIDA)} (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
    paginas(temas);
  }
} else {
  console.log("Uso: --verificar [tema] | --aplicar");
}
