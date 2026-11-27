/**
 * «Chasis y carrocería › Materiales y estructura» (2026-11-27): checks the data of `materiales/datos.ts` and prints what the
 * charts show. Run: npx tsx scripts/materiales.ts — must end «Todo OK».
 */
import { ARQUITECTURAS, CRITERIOS, FUENTES, IMPORTANCIA_INICIAL, PRESETS, MATERIALES, PANELES, ZONAS, puntuacion, type Rango } from '../src/components/aeromovil/materiales/datos';

const fallos: string[] = [];
const ok = (c: boolean, m: string) => { if (!c) fallos.push(m); };
const enRango = (r: Rango, v: number) => r[0] <= v && v <= r[1];
const f = (v: number, d = 1) => v.toFixed(d).replace('.', ',');

for (const m of MATERIALES) {
  ok(enRango(m.E, m.e), `${m.id}: E ${m.e} fuera de [${m.E}]`);
  ok(enRango(m.eurKg, m.eur), `${m.id}: €/kg ${m.eur} fuera de [${m.eurKg}]`);
  ok(enRango(m.sea, m.seaMedio), `${m.id}: SEA ${m.seaMedio} fuera de [${m.sea}]`);
  ok(enRango(m.co2, m.co2Medio), `${m.id}: CO₂ ${m.co2Medio} fuera de [${m.co2}]`);
  ok(m.fibra ? m.wf > 0.3 && m.wf < 0.8 : m.wf === 1, `${m.id}: fracción de fibra ${m.wf}`);
  ok(m.usar.length > 0 && m.evitar.length > 0, `${m.id}: sin «usar» o «evitar»`);
}
console.log('Panel igual de rígido que 2 mm de vidrio:');
for (const p of PANELES) {
  console.log(`  ${p.id.padEnd(9)} ${f(p.espesor, 2)} mm  ${f(p.kg)} kg/m²  ${Math.round(p.eur)} €/m² (${Math.round(p.eurRango[0])}–${Math.round(p.eurRango[1])})  ${f(p.co2)} kg CO₂/m²`);
  ok(p.eurRango[0] <= p.eur && p.eur <= p.eurRango[1] && p.co2Rango[0] <= p.co2 && p.co2 <= p.co2Rango[1], `${p.id}: el valor medio del panel no está dentro de su rango`);
}
const ids = new Set(ARQUITECTURAS.map(a => a.id));
ok(ids.size === ARQUITECTURAS.length, 'arquitecturas: ids repetidos');
console.log('\nArquitecturas (puntuación con la importancia inicial):');
for (const a of [...ARQUITECTURAS].sort((x, y) => puntuacion(y, IMPORTANCIA_INICIAL) - puntuacion(x, IMPORTANCIA_INICIAL))) {
  ok(a.masa[0] < a.masa[1] && a.prototipo[0] < a.prototipo[1] && a.horas[0] < a.horas[1], `${a.id}: un rango al revés`);
  ok(CRITERIOS.every(c => a.notas[c.id] >= 1 && a.notas[c.id] <= 5), `${a.id}: una nota fuera de 1–5`);
  console.log(`  ${String(puntuacion(a, IMPORTANCIA_INICIAL)).padStart(3)}  ${a.corto.padEnd(18)} ${a.masa.join('–')} kg  ${a.prototipo.join('–')} k€  ${a.horas.join('–')} h`);
}
// the order of mass must agree with the «peso» mark (lighter ⇒ never a lower mark)
for (const a of ARQUITECTURAS) for (const b of ARQUITECTURAS) if ((a.masa[0] + a.masa[1]) < (b.masa[0] + b.masa[1]) - 8) ok(a.notas.peso >= b.notas.peso, `${a.id} pesa menos que ${b.id} y tiene peor nota de peso`);
for (const a of ARQUITECTURAS) for (const b of ARQUITECTURAS) if ((a.prototipo[0] + a.prototipo[1]) < (b.prototipo[0] + b.prototipo[1]) - 3) ok(a.notas.prototipo >= b.notas.prototipo, `${a.id} cuesta menos que ${b.id} y tiene peor nota de prototipo`);
for (const pr of PRESETS) console.log(`  ${pr.nombre}: ${[...ARQUITECTURAS].sort((x, y) => puntuacion(y, pr.importancia) - puntuacion(x, pr.importancia)).map(a => `${a.corto} ${puntuacion(a, pr.importancia)}`).join(' · ')}`);
ok(ZONAS.length >= 8, 'zonas: menos de 8');
ok(FUENTES.every(x => /^https:\/\//.test(x.url)) && new Set(FUENTES.map(x => x.url)).size === FUENTES.length, 'fuentes: URL repetida o no https');

console.log(`\n${fallos.length ? `${fallos.length} FALLOS:\n${fallos.map(x => ` ✗ ${x}`).join('\n')}` : 'Todo OK'}`);
process.exit(fallos.length ? 1 : 0);
