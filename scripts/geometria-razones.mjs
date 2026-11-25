#!/usr/bin/env node
// ============================================================================
// WRITES THE REASONS BEHIND PARTY LEVELS INTO THE GEOMETRY PAGE
// ============================================================================
// Source: `scripts/razones/datos/<group>.json` (one file per party or group of
// parties). Each cell says why a party sits below the basic level in one aspect
// (`contra`: it proposes something that clashes with the basic level; `vacio`:
// no proposal was located) or that it does reach the basic level (`sube`).
//
//   node scripts/geometria-razones.mjs --aplicar    rewrites the RAZONES block and the levels that go up
//   node scripts/geometria-razones.mjs --verificar  fails if the page does not match the data
//
// Run `node scripts/geometria-datos.mjs` afterwards: levels may have changed.

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagina = path.join(raiz, 'public/observatorio-polarizacion/index.html');
const dir = path.join(raiz, 'scripts/razones/datos');
const INI = '/* RAZONES:inicio (generado por scripts/geometria-razones.mjs; no editar a mano) */';
const FIN = '/* RAZONES:fin */';

let html = fs.readFileSync(pagina, 'utf8');
function bloque(nombre) {
  const inicio = html.indexOf(`const ${nombre} = `);
  let i = html.indexOf('=', inicio) + 1, prof = 0, cad = null, esc = false;
  for (; i < html.length; i++) {
    const c = html[i];
    if (cad) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === cad) cad = null; continue; }
    if (c === '"' || c === "'" || c === '`') cad = c;
    else if ('{[('.includes(c)) prof++;
    else if ('}])'.includes(c)) { prof--; if (prof === 0) return [inicio, html.indexOf(';', i) + 1]; }
  }
  throw new Error(`«${nombre}» no cierra.`);
}
const [pi, pf] = bloque('PARTIDOS'), [ti, tf] = bloque('TEMAS');
const { PARTIDOS, TEMAS } = vm.runInNewContext(html.slice(pi, pf) + '\n' + html.slice(ti, tf) + '\n;({ PARTIDOS, TEMAS })', {});

const errores = [], razones = {}, niveles = [];
const PROGRAMAS = ['29-N 2026', '23-J 2023', 'otra'];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  for (const c of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).celdas) {
    const d = `${f}: ${c.partido}/${c.tema}/${c.i}`;
    const t = TEMAS[c.tema];
    if (!PARTIDOS.some((p) => p.k === c.partido) || !t || !t.ejes[c.i]) { errores.push(`${d}: casilla inexistente`); continue; }
    if (!['contra', 'vacio', 'sube'].includes(c.tipo)) errores.push(`${d}: tipo «${c.tipo}»`);
    if (c.tipo === 'sube' ? ![1, 2].includes(c.nivel) : c.nivel !== 0) errores.push(`${d}: nivel ${c.nivel} no cuadra con «${c.tipo}»`);
    if (!c.razon || c.razon.length > 420) errores.push(`${d}: razón vacía o de más de 420 caracteres`);
    if (/antisistema|ultra|radical|extrem/i.test(c.razon || '')) errores.push(`${d}: la razón usa una etiqueta, no un hecho`);
    if (c.tipo !== 'vacio' && !(c.fuente && /^https:\/\//.test(c.fuente.url || '') && c.fuente.t)) errores.push(`${d}: «${c.tipo}» sin fuente`);
    if (c.fuente && !PROGRAMAS.includes(c.fuente.programa)) errores.push(`${d}: programa «${c.fuente.programa}»`);
    if (razones[c.partido]?.[c.tema]?.[c.i]) errores.push(`${d}: casilla repetida`);
    ((razones[c.partido] ??= {})[c.tema] ??= {})[c.i] = {
      tp: c.tipo, r: c.razon, ...(c.fuente ? { f: c.fuente.t, u: c.fuente.url, p: c.fuente.programa } : {}),
    };
    niveles.push([c.partido, c.tema, c.i, c.nivel]);
  }
}
if (errores.length) { console.error(errores.join('\n')); process.exit(1); }

// Levels: each topic writes `pk: [a, b, …]` inside its `v: { … }`. Rewrite only the cells that the data covers.
let cambios = 0;
for (const [pk, tk, i, nivel] of niveles) {
  const v = TEMAS[tk].v[pk];
  if (v[i] === nivel) continue;
  const [a] = bloque('TEMAS');
  const desdeTema = html.indexOf(`\n  ${tk}: {`, a), desdeV = html.indexOf('\n    v: {', desdeTema);
  const re = new RegExp(`(\\b${pk}: \\[)([^\\]]*)(\\])`);
  const trozo = html.slice(desdeV, html.indexOf('}', desdeV));
  const m = re.exec(trozo);
  if (!m) { console.error(`No encuentro los niveles de ${pk} en ${tk}`); process.exit(1); }
  v[i] = nivel;
  html = html.slice(0, desdeV) + trozo.replace(re, `$1${v.join(', ')}$3`) + html.slice(desdeV + trozo.length);
  cambios++;
}

const texto = `${INI}\nconst RAZONES = ${JSON.stringify(razones)};\n${FIN}`;
const a = html.indexOf(INI);
if (a >= 0) html = html.slice(0, a) + texto + html.slice(html.indexOf(FIN, a) + FIN.length);
else { const [, f] = bloque('TEMAS'); html = html.slice(0, f) + '\n\n' + texto + html.slice(f); }

const total = niveles.length, cuenta = (tp) => Object.values(razones).flatMap((x) => Object.values(x)).flatMap((x) => Object.values(x)).filter((x) => x.tp === tp).length;
if (process.argv.includes('--verificar')) {
  if (html !== fs.readFileSync(pagina, 'utf8')) { console.error('La página no coincide con scripts/razones/datos. Ejecuta: node scripts/geometria-razones.mjs --aplicar'); process.exit(1); }
  console.log(`Razones al día: ${total} casillas.`);
} else if (process.argv.includes('--aplicar')) {
  fs.writeFileSync(pagina, html);
  console.log(`Razones escritas: ${total} casillas (${cuenta('contra')} contra lo básico, ${cuenta('vacio')} sin propuesta localizada, ${cuenta('sube')} suben de nivel). Niveles cambiados en la página: ${cambios}.`);
} else console.log(`${total} casillas válidas. Usa --aplicar o --verificar.`);
