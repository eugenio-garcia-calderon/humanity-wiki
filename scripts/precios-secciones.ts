/**
 * The price of each side-panel section (2026-11-17, `precios/`). Run: npx tsx scripts/precios-secciones.ts [diseño.json …]
 * For every vehicle with sections (defaults, Triciclo variants, and any design given): every part of the mass model has
 * a price ≥ 0 with a reason; each section's price is the sum of its parts; the departments are their own sections plus
 * the parts with no section, and add up to the vehicle; every part is counted once (the «ajusta» sections repeat parts
 * at the same price and do not count); a price set by the user replaces the estimate and moves the total by exactly the
 * difference, and «volver al estimado» brings it back; a catalogue motor with a published price is priced from it;
 * labour = Σ hours × €/h; project = materials + labour. Prints the sections and the totals. Ends «Todo OK».
 */
import { readFileSync } from 'fs';
import { PARAMETROS_A1, PARAMETROS_BASCULANTE, PARAMETROS_GOTA, PARAMETROS_TRICICLO, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { pesosSecciones } from '../src/components/aeromovil/masasSecciones';
import { conPrecio, eur } from '../src/components/aeromovil/precios/precios';
import { conManoObra } from '../src/components/aeromovil/precios/manoObra';
import { costeProyecto } from '../src/components/aeromovil/precios/coste';
import { MOTORES, precioEuros } from '../src/components/aeromovil/catalogoTren';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } };
const cerca = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));
const suma = (ps: { eur: number }[]) => ps.reduce((a, p) => a + p.eur, 0);
const calc = (P: Parametros) => { const m = crearModelo(P); return { m, res: calcular(m, areas(m)) }; };

const casos: [string, Parametros][] = [
  ['Gota', PARAMETROS_GOTA], ['Aeromóvil 1', PARAMETROS_A1], ['Basculante', PARAMETROS_BASCULANTE], ['Triciclo', PARAMETROS_TRICICLO],
  ['Triciclo cuatro ruedas', { ...PARAMETROS_TRICICLO, tTraseras: 'dos' } as Parametros],
  ['Triciclo en rombo', { ...PARAMETROS_TRICICLO, tRuedas: 'rombo' } as Parametros],
  ['Triciclo puertas, volante, salpicadero, filas, híbrido, basculación, lujo', { ...PARAMETROS_TRICICLO, tAcceso: 'puertas', tMaletero: 'aptera', tPuertas2: 'si', tMando: 'volante', tSalpicadero: 'blanco', tAsientos: 'filas', tPropulsion: 'phev', tBascula: 'si', tAcabado: 'lujo', tCinturon: 'negro', tFaro: 'barra', tRetrovisores: 'espejos', tSolarCola: 'si', tSolarMorro: 'si', tChMat: 'al6061', tBatDisp: 'chasis' } as Parametros],
];
for (const f of process.argv.slice(2)) casos.push([f, deDiseno(JSON.parse(readFileSync(f, 'utf8')))]);

for (const [n, P] of casos) {
  const { m, res } = calc(P), c = costeProyecto(P, m, res);
  console.log(`\n== ${n}`);
  if (!c) { ok(false, `${n}: sin precios`); continue; }
  const ps = pesosSecciones(res, m)!, pr = c.precios;
  const unicas = new Map<string, number>(), porDep: Record<string, number> = {};
  for (const [k, s] of Object.entries(pr.secciones)) {
    const [d, b] = k.split('|');
    ok(s.partes.length === ps.secciones[k].partes.length, `${n} › ${b}: ${s.partes.length} precios para ${ps.secciones[k].partes.length} piezas`);
    ok(cerca(suma(s.partes), s.eur), `${n} › ${b}: el precio no es la suma de sus piezas`);
    for (const p of s.partes) {
      ok(Number.isFinite(p.eur) && p.eur >= 0 && p.como.length > 5, `${n} › ${p.nombre}: precio ${p.eur} sin razón`);
      ok(p.max >= p.eur && p.paso > 0, `${n} › ${p.nombre}: el deslizador no llega a su precio`);
      if (unicas.has(p.nombre)) ok(unicas.get(p.nombre) === p.eur, `${n} › ${p.nombre}: dos precios distintos`);
      if (s.tipo === 'propia') { ok(!unicas.has(p.nombre) || s.tipo !== 'propia', ''); unicas.set(p.nombre, p.eur); porDep[d] = (porDep[d] ?? 0) + p.eur; }
    }
    console.log(`   ${s.tipo === 'ajusta' ? '(ajusta)' : '        '} ${d.padEnd(11)} ${b.padEnd(28)} ${eur(s.eur).padStart(9)}`);
  }
  for (const [d, l] of Object.entries(pr.sinSeccion)) for (const p of l!) { unicas.set(p.nombre, p.eur); porDep[d] = (porDep[d] ?? 0) + p.eur; console.log(`   (sin desplegable) ${d.padEnd(11)} ${p.nombre.padEnd(28)} ${eur(p.eur).padStart(9)}`); }
  // every «ajusta» part is a part some own section (or «sin desplegable») already counts
  for (const [k, s] of Object.entries(pr.secciones)) if (s.tipo === 'ajusta') for (const p of s.partes) ok(unicas.has(p.nombre), `${n} › ${k}: ${p.nombre} solo está en una sección que ajusta`);
  for (const [d, v] of Object.entries(pr.porDep)) ok(cerca(v!, porDep[d] ?? 0), `${n} › departamento ${d}: ${v} ≠ ${porDep[d]}`);
  ok(cerca(pr.total, [...unicas.values()].reduce((a, b) => a + b, 0)), `${n}: el total ${pr.total} no es cada pieza una vez`);
  ok(cerca(c.manoObra, c.partidas.reduce((a, p) => a + p.h * p.eurh, 0)) && cerca(c.total, c.materiales + c.manoObra), `${n}: mano de obra o total mal sumados`);
  ok(pr.propios === 0 && c.partidas.every(p => !p.propio), `${n}: sin precios propios, nada debería salir como propio`);
  console.log(`   materiales ${eur(c.materiales)} · mano de obra ${eur(c.manoObra)} (${c.partidas.reduce((a, p) => a + p.h, 0)} h) · total ${eur(c.total)} · ${c.eurKg ? eur(c.eurKg) : '—'}/kg`);
  console.log(`   por departamento: ${Object.entries(pr.porDep).map(([d, v]) => `${d} ${eur(v!)}`).join(', ')}`);

  // a price set by the user, and back to the estimate
  const p0 = [...Object.values(pr.secciones)].find(s => s.tipo === 'propia')!.partes[0];
  const P2 = { ...P, precios: conPrecio(P, p0.nombre, p0.estimado + 123) } as Parametros, c2 = costeProyecto(P2, m, res)!;
  ok(cerca(c2.materiales - c.materiales, 123) && c2.precios.propios === 1, `${n}: poner ${p0.nombre} a +123 € mueve el total ${c2.materiales - c.materiales}`);
  const P3 = { ...P2, precios: conPrecio(P2, p0.nombre, null) } as Parametros;
  ok(P3.precios === undefined && cerca(costeProyecto(P3, m, res)!.materiales, c.materiales), `${n}: volver al estimado deja el diseño como estaba`);
  const P4 = { ...P, manoObra: conManoObra(P, 'pintura', { h: 10, eurh: 50 }) } as Parametros, c4 = costeProyecto(P4, m, res)!;
  const pin = c.partidas.find(p => p.id === 'pintura')!;
  ok(cerca(c4.manoObra - c.manoObra, 500 - pin.eur) && c4.partidas.find(p => p.id === 'pintura')!.propio, `${n}: la mano de obra propia no cuenta bien`);
}

// a catalogue motor with a published price is priced from it
{
  const mot = MOTORES.find(x => x.precio && x.montaje === 'buje')!;
  const P = { ...PARAMETROS_TRICICLO, tCatMotor: mot.id } as Parametros, { m, res } = calc(P), c = costeProyecto(P, m, res)!;
  const p = Object.values(c.precios.secciones).flatMap(s => s.partes).find(x => /^Motor(es)? de buje/.test(x.nombre))!;
  ok(p.origen === 'catalogo' && cerca(p.eur, precioEuros(mot.precio)!), `motor del catálogo ${mot.modelo}: ${p.eur} € (${p.origen}) en vez de ${precioEuros(mot.precio)}`);
  console.log(`\nmotor del catálogo: ${p.nombre} = ${eur(p.eur)} — ${p.como}`);
}
// a saved design without prices opens with no prices (the estimates), and its prices survive save → open
{
  const d = deDiseno({ disposicion: 'triciclo' });
  ok(d.precios === undefined && d.manoObra === undefined, 'un diseño guardado sin precios abre sin precios propios');
  const e = deDiseno(JSON.parse(JSON.stringify({ disposicion: 'triciclo', precios: { 'Batería': 3000 }, manoObra: { pintura: { h: 12 } } })));
  ok(e.precios?.['Batería'] === 3000 && e.manoObra?.pintura?.h === 12, 'los precios propios se guardan y se abren igual');
}
console.log(fallos ? `\n${fallos} fallos` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
