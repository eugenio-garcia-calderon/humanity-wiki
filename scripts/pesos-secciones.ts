/**
 * The weight of each side-panel section (2026-11-17, `masasSecciones.ts`). Run: npx tsx scripts/pesos-secciones.ts [diseño.json …]
 * For every vehicle (defaults, Triciclo variants, and any design given): the sections (+ the parts with no section)
 * add up to each department's total of the department tabs (`kgPorDepartamento`), and the departments to the vehicle's
 * empty mass; each split (laminate by zone, frame into tubes and joints) adds up to the part it splits; and no section
 * of one department holds a part of another. Prints each section's kg. Ends «Todo OK».
 */
import { readFileSync } from 'fs';
import { PARAMETROS_A1, PARAMETROS_BASCULANTE, PARAMETROS_GOTA, PARAMETROS_TRICICLO, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { kgPorDepartamento } from '../src/components/aeromovil/PesosDepartamento';
import { pesosSecciones, type PartePeso } from '../src/components/aeromovil/masasSecciones';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } };
const cerca = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));
const suma = (ps: { kg: number }[]) => ps.reduce((a, p) => a + p.kg, 0);
const hijosCuadran = (p: PartePeso, donde: string): void => {
  if (!p.hijos) return;
  ok(cerca(suma(p.hijos), p.kg), `${donde} › ${p.nombre}: sus piezas suman ${suma(p.hijos)} y la pieza ${p.kg}`);
  for (const h of p.hijos) { ok(h.kg >= -1e-9, `${donde} › ${h.nombre} negativo (${h.kg})`); hijosCuadran(h, `${donde} › ${p.nombre}`); }
};

const casos: [string, Parametros][] = [
  ['Gota', PARAMETROS_GOTA], ['Aeromóvil 1', PARAMETROS_A1], ['Basculante', PARAMETROS_BASCULANTE], ['Triciclo', PARAMETROS_TRICICLO],
  ['Triciclo cuatro ruedas', { ...PARAMETROS_TRICICLO, tTraseras: 'dos' } as Parametros],
  ['Triciclo en rombo', { ...PARAMETROS_TRICICLO, tRuedas: 'rombo' } as Parametros],
  ['Triciclo puertas, volante, salpicadero, filas, híbrido, basculación, lujo', { ...PARAMETROS_TRICICLO, tAcceso: 'puertas', tMaletero: 'aptera', tPuertas2: 'si', tMando: 'volante', tSalpicadero: 'blanco', tAsientos: 'filas', tPropulsion: 'phev', tBascula: 'si', tAcabado: 'lujo', tCinturon: 'negro', tFaro: 'barra', tRetrovisores: 'espejos', tSolarCola: 'si', tSolarMorro: 'si', tChMat: 'al6061', tBatDisp: 'chasis' } as Parametros],
  ['Triciclo aluminio con uniones mínimas', { ...PARAMETROS_TRICICLO, tChMat: 'carbono', tChUniones: 1 } as Parametros],
];
for (const f of process.argv.slice(2)) casos.push([f, deDiseno(JSON.parse(readFileSync(f, 'utf8')))]);

for (const [n, P] of casos) {
  const m = crearModelo(P), res = calcular(m, areas(m)), ps = pesosSecciones(res, m);
  console.log(`\n== ${n}: ${res.mVeh.toFixed(2)} kg en vacío`);
  if (!ps) { ok(false, `${n}: sin secciones`); continue; }
  const deps = kgPorDepartamento(res);
  const porDep: Record<string, number> = {};
  for (const [k, s] of Object.entries(ps.secciones)) {
    const [d, b] = k.split('|');
    console.log(`   ${s.tipo === 'ajusta' ? '(ajusta)' : '        '} ${d.padEnd(11)} ${b.padEnd(28)} ${s.kg.toFixed(2).padStart(7)} kg`);
    ok(cerca(suma(s.partes), s.kg), `${n} › ${b}: el total no es la suma de sus partes`);
    for (const p of s.partes) hijosCuadran(p, `${n} › ${b}`);
    if (s.tipo === 'propia') porDep[d] = (porDep[d] ?? 0) + s.kg;
  }
  for (const [d, l] of Object.entries(ps.sinSeccion)) {
    for (const p of l!) console.log(`   (sin desplegable) ${d.padEnd(11)} ${p.nombre.padEnd(28)} ${p.kg.toFixed(2).padStart(7)} kg`);
    porDep[d] = (porDep[d] ?? 0) + suma(l!);
  }
  ok(cerca(Object.values(porDep).reduce((a, b) => a + b, 0), res.mVeh), `${n}: las secciones suman ${Object.values(porDep).reduce((a, b) => a + b, 0)} y el vehículo ${res.mVeh}`);
  // («proyecto» is the empty vehicle and «masas» (2026-11-17) the vehicle with everyone on board: whole-vehicle totals, not departments)
  if (deps) for (const [d, kg] of Object.entries(deps)) if (d !== 'proyecto' && d !== 'masas') ok(cerca(porDep[d] ?? 0, kg!), `${n} › departamento ${d}: secciones ${porDep[d]} ≠ pestaña ${kg}`);
}
console.log(fallos ? `\n${fallos} fallos` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
