#!/usr/bin/env node
// Measures per aspect and level for the Geometría test, written by the evaluador-geometria agent.
//   node scripts/geometria-medidas.mjs --verificar [tema]   validate scripts/medidas/datos/*.json
//   node scripts/geometria-medidas.mjs --aplicar            validate all and build public/geometria-figura/medidas.json
import fs from "node:fs";
import path from "node:path";

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
<header class="top"><a class="marca" href="${SITIO}/geometria-politica">Geometría política</a><a class="todos" href="/medidas/">Todas las medidas</a></header>`;
const pie = `<footer class="pie">
<p>Estas medidas son propuestas de trabajo de esta web, ordenadas de menos a más exigentes; no son un hecho ni una recomendación de voto. Las cifras marcadas como objetivo son metas propuestas; los datos llevan su fuente.</p>
<p>Herramienta educativa sin afiliación política. Un proyecto de <a href="${SITIO}/">Luz &amp; Humanidad</a>.</p>
</footer>
</body>
</html>
`;
const CSS = `/* generado por scripts/geometria-medidas.mjs: no editar a mano */
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
.tabla-ind{width:100%;border-collapse:collapse;font-size:15px}
.tabla-ind td,.tabla-ind th{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
.tabla-ind td a{display:inline-block;margin:2px 6px 2px 0;font-size:13.5px;color:#1D4ED8}
`;

function paginas(temas) {
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
    const lista = (nv) => `<ul class="mds">${nv.medidas.map((m) => `<li><b>${esc(m.nombre)}${m.meta ? `<span class="meta">objetivo propuesto</span>` : ""}</b><p>${esc(m.texto)}${/^https?:\/\//.test(m.fuente || "") ? ` <a class="fte" href="${esc(m.fuente)}" rel="noopener nofollow" target="_blank">fuente: ${esc(host(m.fuente))} ↗</a>` : ""}</p></li>`).join("\n")}</ul>`;
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
${a.niveles.map((nv, n) => `<li style="--c:${colorNivel(t, n)}"><h3><a href="/medidas/${slug}/${NIV_SLUG[n]}/">${NIV_TITULO[n]} →</a></h3><p>${esc(nv.resumen)}</p><small>${nv.medidas.map((m) => esc(m.nombre)).join(" · ")}</small></li>`).join("\n")}
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
      out.temas[k] = d.aspectos.map((a) => a.niveles.map((nv) => [nv.resumen.trim(), nv.medidas.map((m) => [m.nombre.trim(), m.texto.trim()])]));
    }
    out.rutas = Object.fromEntries(temas.map((k) => [k, DATOS.temas.find((t) => t.k === k).ejes.map((e) => slugify(e.n))]));
    fs.writeFileSync(SALIDA, JSON.stringify(out));
    console.log(`Escrito ${path.relative(RAIZ, SALIDA)} (${Math.round(fs.statSync(SALIDA).size / 1024)} KB)`);
    paginas(temas);
  }
} else {
  console.log("Uso: --verificar [tema] | --aplicar");
}
