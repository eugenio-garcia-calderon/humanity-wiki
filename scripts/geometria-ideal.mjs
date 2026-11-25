#!/usr/bin/env node
// ============================================================================
// EL NIVEL «IDEAL» DE LA GEOMETRÍA POLÍTICA: TEXTOS Y PÁGINAS (2026-11-25)
// ============================================================================
// Cada aspecto de cada tema tiene cinco niveles: Antisistema, Básico, Intermedio, Avanzado e Ideal.
// El texto corto de los cinco vive en la página de la geometría (`TEMAS`, campo `niv` de cada aspecto,
// en `public/observatorio-polarizacion/index.html`). La ficha larga de cada Ideal (medidas, qué supone,
// referencias, objeciones y fuentes) vive en `scripts/ideal/datos/<tema>.json`, un fichero por tema.
//
//   node scripts/geometria-ideal.mjs             genera public/ideal/<slug>/index.html y public/ideal/index.html
//   node scripts/geometria-ideal.mjs --aplicar   además escribe en la página de la geometría el texto de
//                                                Antisistema e Ideal de cada aspecto, y el título y la
//                                                dirección de su ficha (`it`, `is`)
//   node scripts/geometria-ideal.mjs --verificar falla si las páginas generadas no coinciden con los datos
//
// Después de `--aplicar` hay que regenerar los datos del test: node scripts/geometria-datos.mjs

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGINA = path.join(raiz, 'public/observatorio-polarizacion/index.html');
const DATOS = path.join(raiz, 'scripts/ideal/datos');
const SALIDA = path.join(raiz, 'public/ideal');
const NIVELES = ['Antisistema', 'Básico', 'Intermedio', 'Avanzado', 'Ideal'];

let html = fs.readFileSync(PAGINA, 'utf8');

/** Dónde acaba el corchete, la llave o el paréntesis que se abre en `i` (ignorando cadenas). */
function cierre(texto, i) {
  let prof = 0, cad = null, esc = false;
  for (; i < texto.length; i++) {
    const c = texto[i];
    if (cad) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === cad) cad = null; continue; }
    if (c === '"' || c === "'" || c === '`') cad = c;
    else if ('{[('.includes(c)) prof++;
    else if ('}])'.includes(c)) { prof--; if (prof === 0) return i; }
  }
  throw new Error('No cierra.');
}
function bloque(nombre) {
  const inicio = html.indexOf(`const ${nombre} = `);
  if (inicio < 0) throw new Error(`No encuentro «const ${nombre} =».`);
  const fin = cierre(html, html.indexOf('=', inicio) + 1);
  return { inicio, fin: html.indexOf(';', fin) + 1 };
}
function leerTemas() {
  const b = bloque('TEMAS');
  return vm.runInNewContext(html.slice(b.inicio, b.fin) + '\n;TEMAS', {}, { timeout: 2000 });
}

const temas = leerTemas();
const claves = Object.keys(temas);
const datos = {};
for (const k of claves) {
  const f = path.join(DATOS, `${k}.json`);
  if (fs.existsSync(f)) datos[k] = JSON.parse(fs.readFileSync(f, 'utf8'));
}

// ---------------------------------------------------------------------------
// --aplicar: los textos cortos, a la página de la geometría
// ---------------------------------------------------------------------------
if (process.argv.includes('--aplicar')) {
  const b = bloque('TEMAS');
  let cuerpo = html.slice(b.inicio, b.fin);
  let cambios = 0;
  for (const k of claves) {
    const d = datos[k];
    if (!d) continue;
    const ini = cuerpo.indexOf(`\n  ${k}: {`);
    if (ini < 0) throw new Error(`No encuentro el tema ${k}.`);
    const fin = cierre(cuerpo, cuerpo.indexOf('{', ini));
    let t = cuerpo.slice(ini, fin + 1);
    // El primer `niv: [` es el del tema; después, uno por aspecto, en orden.
    let pos = 0, n = -1;
    for (;;) {
      const p = t.indexOf('niv: [', pos);
      if (p < 0) break;
      const a = p + 5, z = cierre(t, a);
      const actual = vm.runInNewContext(t.slice(a, z + 1));
      const medio = actual.length === 5 ? actual.slice(1, 4) : actual;
      if (medio.length !== 3) throw new Error(`${k}: un «niv» con ${actual.length} textos.`);
      const asp = n >= 0 ? d.aspectos[n] : null;
      const anti = n < 0 ? d.anti_tema : asp.anti, ideal = n < 0 ? d.ideal_tema : asp.ideal;
      let nuevo = '[' + [anti, ...medio, ideal].map((x) => JSON.stringify(x)).join(', ') + ']';
      let hasta = z + 1;
      if (asp) {
        // `it` y `is` van justo detrás; si ya estaban, se sustituyen
        const resto = t.slice(hasta).match(/^, it: "(?:[^"\\]|\\.)*", is: "[a-z0-9-]*"/);
        if (resto) hasta += resto[0].length;
        // Un tema con el ideal pendiente (`pendiente: true`) no tiene todavía ficha: sin `it` ni `is`
        if (asp.slug) nuevo += `, it: ${JSON.stringify(asp.titulo)}, is: ${JSON.stringify(asp.slug)}`;
      }
      if (t.slice(a, hasta) !== nuevo) cambios++;
      t = t.slice(0, a) + nuevo + t.slice(hasta);
      pos = a + nuevo.length; n++;
    }
    if (n !== d.aspectos.length) throw new Error(`${k}: ${n} aspectos en la página y ${d.aspectos.length} en los datos.`);
    cuerpo = cuerpo.slice(0, ini) + t + cuerpo.slice(fin + 1);
  }
  html = html.slice(0, b.inicio) + cuerpo + html.slice(b.fin);
  fs.writeFileSync(PAGINA, html);
  console.log(`Página de la geometría: ${cambios} textos de nivel actualizados.`);
}

// ---------------------------------------------------------------------------
// Las páginas: public/ideal/<slug>/index.html y el índice public/ideal/index.html
// ---------------------------------------------------------------------------
const SITIO = 'https://luzhumanidad.com';
const MARCA = '<!-- generado por scripts/geometria-ideal.mjs: no editar a mano -->';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

const temasAhora = leerTemas(); // con los textos ya aplicados
const fichas = [];
for (const k of claves) {
  const d = datos[k], t = temasAhora[k];
  if (!d || d.pendiente) continue;
  d.aspectos.forEach((a, i) => fichas.push({ k, t, e: t.ejes[i], a, i }));
}
const repetidos = fichas.map((f) => f.a.slug).filter((s, i, todos) => todos.indexOf(s) !== i);
if (repetidos.length) { console.error('Direcciones repetidas: ' + repetidos.join(', ')); process.exit(1); }

const cabecera = (titulo, descripcion, ruta) => `<!doctype html>
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
<link rel="stylesheet" href="/ideal/ideal.css">
</head>
<body>
<header class="top"><a class="marca" href="${SITIO}/geometria-politica">Geometría política</a><a class="todos" href="/ideal/">Todos los ideales</a></header>`;
const pie = `<footer class="pie">
<p>Cada ideal es una propuesta de esta web, no un hecho ni una recomendación de voto. Es un borrador de trabajo, abierto a corrección: los ejemplos de otros países se han tomado de las fuentes enlazadas.</p>
<p>Herramienta educativa sin afiliación política. Un proyecto de <a href="${SITIO}/">Luz &amp; Humanidad</a>.</p>
</footer>
</body>
</html>
`;

function paginaFicha(f) {
  const { k, t, e, a } = f;
  const hermanas = fichas.filter((x) => x.k === k && x !== f);
  const escalera = [4, 3, 2, 1, 0].map((n) => `<li class="n${n}"><b>${NIVELES[n]}</b><span>${esc(e.niv[n])}</span></li>`).join('\n');
  return cabecera(`${a.titulo} · El ideal en ${t.n} · Geometría política`, a.ideal, `/ideal/${a.slug}/`) + `
<main style="--tc:${esc(t.c)}">
<p class="ceja"><a href="${SITIO}/geometria-politica?tema=${k}">${esc(t.n)}</a> · ${esc(e.n)} · <b>Nivel ideal</b></p>
<h1>${esc(a.titulo)}</h1>
<p class="lede">${esc(a.ideal)}</p>
<p>${esc(a.resumen)}</p>

<section>
<h2>Qué habría que hacer</h2>
<ol class="medidas">
${a.medidas.map((m) => `<li>${esc(m)}</li>`).join('\n')}
</ol>
</section>

<section>
<h2>Qué supondría</h2>
<div class="tres">
<div><h3>Para las personas</h3><p>${esc(a.supone.personas)}</p></div>
<div><h3>Para las cuentas públicas</h3><p>${esc(a.supone.cuentas)}</p></div>
<div><h3>Cómo se pone en marcha</h3><p>${esc(a.supone.puesta_en_marcha)}</p></div>
</div>
</section>

<section>
<h2>Por qué integra y no elige bando</h2>
<p>${esc(a.integra)}</p>
</section>
${a.referencias.length ? `
<section>
<h2>Dónde se hace ya algo parecido</h2>
<ul class="refs">
${a.referencias.map((r) => `<li><b>${esc(r.lugar)}.</b> ${esc(r.que)} <a href="${esc(r.url)}" rel="noopener nofollow" target="_blank">${esc(host(r.url))} ↗</a></li>`).join('\n')}
</ul>
</section>` : ''}
${a.objeciones.length ? `
<section>
<h2>Las objeciones más serias</h2>
<dl class="obj">
${a.objeciones.map((o) => `<dt>${esc(o.o)}</dt><dd>${esc(o.r)}</dd>`).join('\n')}
</dl>
</section>` : ''}

<section>
<h2>De antisistema a ideal: los cinco niveles de este aspecto</h2>
<p class="nota">${esc(e.d)}</p>
<ol class="escalera">
${escalera}
</ol>
<p><a class="boton" href="${SITIO}/geometria-politica?tema=${k}">Ver hasta dónde llega cada partido en ${esc(t.n)} →</a></p>
</section>
${a.fuentes.length ? `
<section>
<h2>Fuentes</h2>
<ul class="fuentes">
${a.fuentes.map((x) => `<li><a href="${esc(x.url)}" rel="noopener nofollow" target="_blank">${esc(x.t)}</a> <small>${esc(host(x.url))}</small></li>`).join('\n')}
</ul>
</section>` : ''}

<nav class="otras" aria-label="Los demás ideales de ${esc(t.n)}">
<h2>Los demás ideales de ${esc(t.n)}</h2>
<ul>
${hermanas.map((x) => `<li><a href="/ideal/${x.a.slug}/"><b>${esc(x.a.titulo)}</b><span>${esc(x.e.n)}</span></a></li>`).join('\n')}
</ul>
</nav>
</main>
` + pie;
}

function paginaIndice() {
  const grupos = claves.filter((k) => datos[k] && !datos[k].pendiente).map((k) => {
    const t = temasAhora[k];
    return `<section style="--tc:${esc(t.c)}">
<h2>${esc(t.n)}</h2>
<p class="nota">${esc(t.niv[4])}</p>
<ul class="lista">
${fichas.filter((f) => f.k === k).map((f) => `<li><a href="/ideal/${f.a.slug}/"><b>${esc(f.a.titulo)}</b><span>${esc(f.e.n)}</span><p>${esc(f.a.ideal)}</p></a></li>`).join('\n')}
</ul>
</section>`;
  }).join('\n');
  return cabecera('Los ideales de la Geometría política', `Las ${fichas.length} propuestas ideales, una por aspecto, de los diez temas de la Geometría política: lo que habría que hacer por encima de lo avanzado.`, '/ideal/') + `
<main class="indice">
<p class="ceja">Geometría política · <b>Nivel ideal</b></p>
<h1>El ideal, aspecto por aspecto</h1>
<p class="lede">Cada aspecto de cada tema tiene cinco niveles: antisistema, básico, intermedio, avanzado e ideal. El ideal es la aspiración: lo que de verdad habría que hacer, aunque hoy probablemente no llegue ningún partido. Aquí están los ${fichas.length} publicados hasta ahora, cada uno con su página.${claves.some((k) => datos[k]?.pendiente) ? ' Faltan los de ' + claves.filter((k) => datos[k]?.pendiente).map((k) => temasAhora[k].n).join(' y ') + ', en preparación.' : ''}</p>
${grupos}
</main>
` + pie;
}

const CSS = `/* generado por scripts/geometria-ideal.mjs: no editar a mano */
:root{--ink:#0F172A;--ink2:#334155;--muted:#64748B;--line:#E2E8F0;--bg:#FFFFFF;--bg2:#F8FAFC;--oro:#B98A1B;--oro2:#F6BE3B;--rojo:#E5484D;--tc:#5FB3E6}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.6 "Public Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 20px;background:#0F172A;color:#fff;font-size:15px}
.top a{text-decoration:none;font-weight:600}
.top .todos{font-weight:500;opacity:.85}
main{max-width:860px;margin:0 auto;padding:36px 20px 20px}
.ceja{margin:0 0 10px;font-size:13.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.ceja b{color:var(--oro)}
h1{margin:0 0 14px;font-size:clamp(2rem,5vw,3rem);line-height:1.08;letter-spacing:-.025em;font-weight:800}
.lede{font-size:1.25rem;line-height:1.5;color:var(--ink);padding:16px 18px;border:2px solid var(--oro2);border-radius:16px;background:#FFFBEB}
h2{margin:40px 0 12px;font-size:1.4rem;line-height:1.2;letter-spacing:-.01em}
h3{margin:0 0 6px;font-size:1rem}
p{margin:0 0 14px}
.nota{color:var(--muted);font-size:15.5px}
.medidas{padding-left:1.3em;display:grid;gap:10px;margin:0}
.medidas li::marker{font-weight:700;color:var(--oro)}
.tres{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.tres>div{padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--bg2);font-size:15.5px}
.tres p{margin:0;color:var(--ink2)}
.refs,.fuentes{padding-left:1.2em;display:grid;gap:10px;margin:0}
.refs a,.fuentes a{color:#1D4ED8}
.fuentes small{color:var(--muted)}
.obj{margin:0;display:grid;gap:6px}
.obj dt{font-weight:700;margin-top:10px}
.obj dd{margin:0;padding-left:14px;border-left:3px solid var(--line);color:var(--ink2)}
.escalera{list-style:none;margin:0 0 18px;padding:0;display:grid;gap:8px}
.escalera li{display:grid;grid-template-columns:8.5em minmax(0,1fr);gap:12px;padding:10px 14px;border:1px solid var(--line);border-left:5px solid var(--tc);border-radius:12px;font-size:15.5px}
.escalera li.n4{border-color:var(--oro2);border-left-color:var(--oro2);background:#FFFBEB}
.escalera li.n0{border-left-color:var(--rojo)}
.escalera li.n0 b{color:var(--rojo)}
.escalera li.n4 b{color:var(--oro)}
.boton{display:inline-block;padding:10px 16px;border-radius:999px;background:#0F172A;color:#fff;text-decoration:none;font-weight:600;font-size:15.5px}
.otras ul,.lista{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.otras a,.lista a{display:block;height:100%;padding:12px 14px;border:1px solid var(--line);border-top:4px solid var(--tc);border-radius:12px;text-decoration:none;background:var(--bg)}
.otras a:hover,.lista a:hover{border-color:var(--oro2)}
.otras a b,.lista a b{display:block;line-height:1.3}
.otras a span,.lista a span{display:block;font-size:13.5px;color:var(--muted);margin-top:2px}
.lista a p{margin:8px 0 0;font-size:14.5px;line-height:1.45;color:var(--ink2)}
.indice{max-width:1040px}
.indice section h2{padding-top:8px;border-top:4px solid var(--tc);display:inline-block}
.pie{max-width:860px;margin:30px auto 0;padding:20px;border-top:1px solid var(--line);font-size:14px;color:var(--muted)}
.pie p{margin:0 0 6px}
@media (max-width:700px){.tres,.otras ul,.lista{grid-template-columns:minmax(0,1fr)} .escalera li{grid-template-columns:minmax(0,1fr);gap:2px} body{font-size:16px}}
`;

const salida = new Map();
salida.set('ideal.css', CSS);
salida.set('index.html', paginaIndice());
for (const f of fichas) salida.set(`${f.a.slug}/index.html`, paginaFicha(f));

if (process.argv.includes('--verificar')) {
  const mal = [...salida].filter(([r, txt]) => { const p = path.join(SALIDA, r); return !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== txt; }).map(([r]) => r);
  if (mal.length) { console.error(`Páginas del ideal sin regenerar (${mal.length}): ${mal.slice(0, 5).join(', ')}… Ejecuta: node scripts/geometria-ideal.mjs`); process.exit(1); }
  console.log(`Las ${fichas.length} páginas del ideal están al día.`);
} else {
  // Se borran las fichas generadas antes (una dirección puede haber cambiado) y se escriben todas
  if (fs.existsSync(SALIDA)) for (const n of fs.readdirSync(SALIDA)) {
    const p = path.join(SALIDA, n, 'index.html');
    if (fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes(MARCA)) fs.rmSync(path.join(SALIDA, n), { recursive: true });
  }
  for (const [r, txt] of salida) { const p = path.join(SALIDA, r); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, txt); }
  console.log(`Escritas ${fichas.length} páginas del ideal y su índice en public/ideal/.`);
}
