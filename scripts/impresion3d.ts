/**
 * «Carrocería impresa en 3D» (2026-11-27, `materiales/impresion3d.ts`): checks the data and prints the bicycle design's figures.
 * Run: npx tsx scripts/impresion3d.ts — must end «Todo OK».
 */
import { crearModelo, calcular as calcularModelo, areas, ajustarCarenado } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { PROPUESTA_BICI } from '../src/components/aeromovil/triciclo/propuestaBici';
import { FUENTES_IMPRESION, IMPRESORAS, PAREDES, PLASTICOS, RUTAS, calcular, holguraDilatacion, ruta } from '../src/components/aeromovil/materiales/impresion3d';

const fallos: string[] = [];
const ok = (c: boolean, m: string) => { if (!c) fallos.push(m); };
const P = deDiseno(PROPUESTA_BICI as never), m = crearModelo(ajustarCarenado(P)), r = calcularModelo(m, areas(m));
const area = r.triciclo!.piel - r.triciclo!.cristal;
console.log(`Vehículo de producción (bicicleta): piel opaca ${area.toFixed(2)} m², largo ${m.Lf.toFixed(2)} m, carrocería hoy ${(r.masas['Carrocería'] ?? 0).toFixed(1)} kg`);
for (const p of PLASTICOS) for (const w of PAREDES) for (const i of IMPRESORAS) {
  const c = calcular(area, p.id, w.id, i.id, 4);
  ok(Object.values(c).every(v => Number.isFinite(v) && v >= 0), `${p.id}/${w.id}/${i.id}: un número no válido`);
}
const maciza = calcular(area, 'asa', 'maciza', 'mediana', 4), sand = calcular(area, 'asa', 'sandwich', 'mediana', 4);
ok(sand.kgPiel > maciza.kgPiel, 'el sándwich debería pesar más que la pared maciza');
ok(calcular(area, 'asa', 'sandwich', 'escritorio', 4).piezas > sand.piezas && calcular(area, 'asa', 'sandwich', 'pellets', 1).piezas < sand.piezas, 'una cama mayor debería dar menos paneles');
ok(calcular(area, 'asa', 'sandwich', 'mediana', 8).dias < calcular(area, 'asa', 'sandwich', 'mediana', 2).dias, 'más impresoras deberían tardar menos días');
console.log(`ASA sándwich, 4 medianas: ${sand.kgPiel.toFixed(0)} kg, ${sand.piezas} paneles, ${sand.horasImpresora.toFixed(0)} h de máquina, ${sand.dias.toFixed(1)} días, ${sand.eurTotal.toFixed(0)} €`);
for (const x of RUTAS) { const v = ruta(x, area); console.log(`  ${x.corto.padEnd(18)} ${v.kg.toFixed(0)} kg  ${v.eur.toFixed(0)} €  ${v.horas.toFixed(0)} h`); ok(v.kg > 0 && v.eur > 0, `${x.id}: ruta sin cifras`); }
console.log(`dilatación sobre ${m.Lf.toFixed(2)} m y 40 °C: ${holguraDilatacion(m.Lf).toFixed(1)} mm más que el acero`);
ok(FUENTES_IMPRESION.every(f => /^https:\/\//.test(f.url)) && new Set(FUENTES_IMPRESION.map(f => f.url)).size === FUENTES_IMPRESION.length, 'fuentes: URL repetida o no https');
console.log(`\n${fallos.length ? `${fallos.length} FALLOS:\n${fallos.map(x => ` ✗ ${x}`).join('\n')}` : 'Todo OK'}`);
process.exit(fallos.length ? 1 : 0);
