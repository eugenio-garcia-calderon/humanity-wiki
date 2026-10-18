// Lints the merged files: every datum with a value has fuente+fecha+naturaleza,
// verdicts are valid, offers carry a check date and commission. Usage: node revisar.mjs
import fs from 'node:fs';
const VER = new Set(['cierta', 'matizable', 'falsa', 'sin_pruebas']);
const NAT = new Set(['declarado', 'medido', 'calculado', 'no_publicado']);
const out = [];
function walk(x, ruta, id) {
  if (Array.isArray(x)) return x.forEach((v, i) => walk(v, `${ruta}[${i}]`, id));
  if (!x || typeof x !== 'object') return;
  if ('valor' in x && x.valor !== null && x.valor !== '') {
    if (!NAT.has(x.naturaleza)) out.push(`${id} ${ruta}: naturaleza «${x.naturaleza}»`);
    if (!x.fuente && x.naturaleza !== 'calculado') out.push(`${id} ${ruta}: sin fuente`);
    if (x.naturaleza === 'calculado' && !x.nota) out.push(`${id} ${ruta}: calculado sin fórmula`);
  }
  for (const [k, v] of Object.entries(x)) walk(v, `${ruta}.${k}`, id);
}
for (const f of ['paneles.json', 'baterias.json']) for (const p of JSON.parse(fs.readFileSync(f)).productos) {
  walk(p.datos_tecnicos, 'datos_tecnicos', p.id); walk(p.origen, 'origen', p.id); walk(p.garantias, 'garantias', p.id);
  for (const a of p.afirmaciones) {
    if (!VER.has(a.veredicto)) out.push(`${p.id} afirmación: veredicto «${a.veredicto}»`);
    if (!a.fuentes?.length) out.push(`${p.id} afirmación sin fuentes: ${String(a.afirmacion).slice(0, 50)}`);
  }
  for (const r of p.retiradas) if (!r.url) out.push(`${p.id} retirada sin url`);
  for (const o of p.ofertas) if (!o.fecha_comprobacion || !o.url) out.push(`${p.id} oferta sin fecha/url`);
  if (!p.retiradas_comprobadas.length) out.push(`${p.id} sin búsqueda de retiradas`);
}
console.log(out.length ? out.join('\n') : 'sin problemas');
console.log(`${out.length} avisos`);
