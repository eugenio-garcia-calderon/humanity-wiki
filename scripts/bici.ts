/**
 * Bicycle components (2026-11-24, `src/components/aeromovil/bici/`). Run: npx tsx scripts/bici.ts
 * Checks: every bicycle catalogue part has a positive mass, a price with its note and a source; every bicycle wheel has
 * a price; the default Triciclo is untouched by the class (no pedals, no bicycle part, `tClase` 'pesado'); the preset
 * `VALORES_BICI` stays inside the bicycle ranges; the built-in «Vehículo de producción (bicicleta)» builds, weighs less
 * than 200 kg, has pedals whose feet fit, and every one of its parts has a price with a reason.
 * Prints the proposal's parts with mass and price, its failing checks and its pedalling. Ends «Todo OK».
 */
import { PARAMETROS_TRICICLO, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { FRENOS_BICI, GENERADORES_PEDAL, SUSPENSIONES_BICI, precioRuedaBici } from '../src/components/aeromovil/bici/catalogo';
import { RANGOS_BICI, VALORES_BICI } from '../src/components/aeromovil/bici/clase';
import { CATALOGO_RUEDAS } from '../src/components/aeromovil/ruedas/catalogo';
import { PROPUESTA_BICI } from '../src/components/aeromovil/triciclo/propuestaBici';
import { pesosSecciones } from '../src/components/aeromovil/masasSecciones';
import { preciosDiseno, eur } from '../src/components/aeromovil/precios/precios';
import { costeProyecto } from '../src/components/aeromovil/precios/coste';
import { kgPorDepartamento } from '../src/components/aeromovil/PesosDepartamento';
import { energiaTriciclo } from '../src/components/aeromovil/triciclo/energia';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } };

for (const p of [...FRENOS_BICI, ...SUSPENSIONES_BICI, ...GENERADORES_PEDAL]) {
  ok(p.kg > 0, `${p.id}: masa`); ok(p.precio.eur > 0 && p.precio.nota.length > 10, `${p.id}: precio con nota`);
  ok(/^https:\/\//.test(p.fuente), `${p.id}: fuente`); ok(p.precio.tipo === 'estimado' || !!(p.precio.fuente ?? p.fuente), `${p.id}: precio publicado con fuente`);
}
const ids = [...FRENOS_BICI, ...SUSPENSIONES_BICI, ...GENERADORES_PEDAL].map(p => p.id);
ok(new Set(ids).size === ids.length, 'ids únicos');
const ruedasBici = Object.entries(CATALOGO_RUEDAS).filter(([, r]) => (r as any).perfil === 'bici').map(([id]) => ({ id }));
ok(ruedasBici.length >= 8, `ruedas de bicicleta: ${ruedasBici.length}`);
for (const r of ruedasBici) ok(!!precioRuedaBici(r.id), `rueda ${r.id}: precio`);

const calc = (P: Parametros) => { const m: any = crearModelo(P); return { m, res: calcular(m, areas(m)) as any }; };
const d = calc(PARAMETROS_TRICICLO);
ok(d.m.pedalesBici == null, 'por defecto, sin pedales'); ok((PARAMETROS_TRICICLO as any).tClase === 'pesado', 'por defecto, vehículo pesado');
for (const [k, v] of Object.entries(VALORES_BICI)) { const r = (RANGOS_BICI as any)[k]; if (r && typeof v === 'number') ok(v >= r[0] && v <= r[1], `VALORES_BICI.${k} = ${v} fuera de ${r[0]}–${r[1]}`); }

const P = deDiseno(PROPUESTA_BICI), { m, res } = calc(P);
console.log(`\n«Vehículo de producción (bicicleta)»: ${res.mVeh.toFixed(1)} kg en vacío, ${res.mTot.toFixed(0)} kg con ocupantes`);
ok(res.mVeh < 200, `pesa ${res.mVeh.toFixed(0)} kg: más de 200`);
ok(!!m.pedalesBici && m.pedalesBici.holgura >= 0.01, 'los pies caben al dar la vuelta'); ok(m.pedalesBici?.alcance >= 0.02, 'la pierna llega');
const ps = pesosSecciones(res, m)!, pr = preciosDiseno(ps, { P, modelo: m, res });
const vistos = new Map<string, { kg: number; eur: number; como: string; origen: string }>();
for (const s of Object.values(pr.secciones)) if (s.tipo === 'propia') for (const p of s.partes) vistos.set(p.nombre, p);
for (const l of Object.values(pr.sinSeccion)) for (const p of l ?? []) vistos.set(p.nombre, p);
for (const [n, p] of vistos) { ok(p.eur >= 0 && p.como.length > 8, `precio de «${n}»`); console.log(`  ${n.slice(0, 50).padEnd(50)} ${p.kg.toFixed(2).padStart(7)} kg ${eur(p.eur).padStart(9)}  ${p.origen === 'catalogo' ? 'tienda  ' : 'estimado'}  ${p.como.slice(0, 110)}`); }
console.log(`  TOTAL de piezas y materiales: ${eur(pr.total)}`);
ok(Math.abs([...vistos.values()].reduce((a, p) => a + p.eur, 0) - pr.total) < 1e-6, 'el total es la suma de las piezas');
for (const n of ['Ruedas', 'Frenos', 'Suspensión delantera', 'Pedales: generador, bielas y pedales']) ok([...vistos.keys()].includes(n), `falta la pieza «${n}»`);
const malos = res.comprobaciones.filter((c: any) => c.holgura < c.minimo);
console.log(`  Comprobaciones: ${res.comprobaciones.length}, en rojo ${malos.length}`);
for (const c of malos) console.log(`    ROJO ${c.nombre.slice(0, 100)} ${c.mostrar ?? ''}`);
const e: any = energiaTriciclo(m, res.mTot, { cd: 0.16, areaRef: res.areas?.frontal ?? 1.05 });
console.log(`  Con Cd 0,16 (supuesto; el del túnel lo da la web): ${e.WhKm.toFixed(1)} Wh/km, ${e.autonomia.toFixed(0)} km; velocidad con la potencia nominal ${e.vmaxNominal.toFixed(0)} km/h`);
if (e.pedaleo) console.log(`  Pedaleando ${e.pedaleo.W} W: ${e.pedaleo.electricos.toFixed(0)} W eléctricos, ${Math.round(e.pedaleo.parte * 100)} % de lo que pide, ${e.pedaleo.WhKm.toFixed(1)} Wh/km, ${e.pedaleo.autonomia.toFixed(0)} km; solo con las piernas ${e.pedaleo.vSolo.toFixed(0)} km/h`);
// (2026-11-24) labour: a bicycle-class vehicle counts assembly only
const c = costeProyecto(P, m, res)!, cPesado = costeProyecto(deDiseno({ ...(PROPUESTA_BICI as any), tClase: 'pesado' }), m, res)!;
for (const p of c.partidas) console.log(`  ${p.nombre.padEnd(30)} ${String(p.h).padStart(4)} h × ${p.eurh} €/h = ${eur(p.eur)}`);
console.log(`  Mano de obra de montaje ${eur(c.manoObra)} (como vehículo pesado: ${eur(cPesado.manoObra)}) · total del proyecto ${eur(c.total)}`);
ok(c.partidas.every(p => p.id.startsWith('b-')) && !c.partidas.some(p => /iseño|ngenier|omologa|oldes/.test(p.nombre)), 'la mano de obra de bicicleta es solo montaje');
ok(c.manoObra < cPesado.manoObra / 4, 'la mano de obra de bicicleta no es la de un vehículo grande');
ok(Math.abs(Object.values(c.precios.porDep).reduce((a, b) => a + (b ?? 0), 0) + c.manoObra - c.total) < 1e-6, 'pestañas + mano de obra = total del proyecto');
ok(kgPorDepartamento(res)?.masas === undefined, '«Masas» sin cifra');
console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
