// Checks for the «Modelo de optimización socioeconómica» that no compiler catches (Eugenio, 2026-11-15: «más real y
// certero»). Run: npx tsx scripts/modelo-comprobar.mts — exits 1 when something fails.
//  1. Every «fuente» link points at a source that exists: a missing id renders nothing, so the figure looks sourced
//     in the code and unsourced on the page.
//  2. Wage rates by company size equal their tiers, and the eight scales split the money into exact eighths.
//  3. No working note addressed to a person ("Eugenio decide…") is left in the public text.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../src/', import.meta.url));
const listas: Record<string, Record<string, unknown>> = {};
for (const f of readdirSync(root + 'data').filter(f => f.endsWith('.ts'))) {
  const M = await import(root + 'data/' + f).catch(e => (console.log('x', f, String(e).slice(0, 80)), {}));
  for (const [k, v] of Object.entries(M)) if (/^F/.test(k) && v && typeof v === 'object') listas[k] = Array.isArray(v) ? Object.fromEntries(v.map((x: any) => [x.id, x])) : v as any;
}
const dir = root + 'components/modeloSocioeconomico/';
const files = readdirSync(dir).filter(f => f.endsWith('.tsx')).concat(readdirSync(dir + 'graficos').map(f => 'graficos/' + f));
const faltan: string[] = []; let usos = 0;
for (const f of files) {
  const s = readFileSync(dir + f, 'utf8');
  for (const m of s.matchAll(/<Fuente id="([^"]+)"/g)) { usos++; if (!listas.FUENTE?.[m[1]]) faltan.push(`${f}: Fuente ${m[1]}`); }
  const listaDe = (src: string) => {
    const x = src.match(/(?:const f = |=> )(\w+)\[id\]/)?.[1];
    if (!x) return undefined;
    return src.match(new RegExp(`(\\w+) as ${x}\\b`))?.[1] ?? x;
  };
  let lista = listaDe(s);
  if (!lista) {
    const desde = s.match(/import \{[^}]*\bF\b[^}]*\} from '\.\/(\w+)'/)?.[1];
    if (desde) lista = listaDe(readFileSync(dir + desde + '.tsx', 'utf8'));
  }
  for (const m of s.matchAll(/<F id="([^"]+)"/g)) { usos++;
    if (!lista) faltan.push(`${f}: F sin lista ${m[1]}`);
    else if (!listas[lista]) faltan.push(`${f}: lista ${lista} no cargada`);
    else if (!listas[lista][m[1]]) faltan.push(`${f}: F ${m[1]} (${lista})`);
  }
}


const M = await import(root + 'data/modeloSocioeconomico.ts');
for (const e of M.EMPLEADORES) if (e.tramo && e.tipo !== M.TRAMO[e.tramo].tipo) faltan.push(`EMPLEADORES ${e.id}: ${e.tipo} ≠ tramo ${e.tramo}`);
if (Math.abs(M.OCTAVO * M.ESCALAS.length - 1) > 1e-9) faltan.push('OCTAVO × escalas ≠ 1');
const textos = [...files.map(f => dir + f), ...readdirSync(root + 'data').filter(f => f.endsWith('.ts')).map(f => root + 'data/' + f)];
for (const p of textos) readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
  if (/Eugenio/.test(l) && !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l) && /['"`>]/.test(l.replace(/\/\/.*$/, ''))) {
    const sin = l.replace(/\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, '');
    if (/Eugenio/.test(sin)) faltan.push(`${p.replace(root, 'src/')}:${i + 1}: nota de trabajo en el texto público`);
  }
});
const unicos = [...new Set(faltan)];
console.log(`${usos} enlaces a fuentes revisados.`);
if (unicos.length) { console.log(unicos.join('\n')); process.exit(1); }
console.log('Todo en orden.');
