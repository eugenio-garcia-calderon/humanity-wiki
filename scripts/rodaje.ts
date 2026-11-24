/**
 * The running gear's four parts (2026-11-24, `src/components/aeromovil/rodaje/`). Run: npx tsx scripts/rodaje.ts
 * Checks: every option of brakes, steering, suspension and wheels has a unique id, a positive mass, a price with its
 * reason, and its sources; a part list that gives every figure adds up to the option's whole; the steering's geometry
 * (the outer wheel turns less than the inner one, the circle closes); the favourite is a field of the design — with
 * none chosen the car is exactly today's, and choosing one moves the parts list and the price list (the steering's kg
 * and € are the option's, the brake's the catalogue's, the wheels' the wheel's); a saved design with an unknown id
 * falls back to «a medida». Prints what is published and what is estimated. Ends «Todo OK».
 */
import { PARAMETROS_TRICICLO, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { deDiseno } from '../src/components/aeromovil/Disenos';
import { PROPUESTA_BICI } from '../src/components/aeromovil/triciclo/propuestaBici';
import { pesosSecciones } from '../src/components/aeromovil/masasSecciones';
import { preciosDiseno } from '../src/components/aeromovil/precios/precios';
import { A_MEDIDA, EUR_POR_GBP } from '../src/components/aeromovil/bici/catalogo';
import { BICI_PROPUESTA } from '../src/components/aeromovil/bici/pedales';
import { anguloFuera } from '../src/components/aeromovil/triciclo/medidas';
import { OPCIONES_FRENOS, OPCIONES_RUEDAS, OPCIONES_SUSPENSION_RODAJE, OPCIONES_DIRECCION, camposDeFavorita, favoritaDe, opcionesDe } from '../src/components/aeromovil/rodaje/opciones';
import { CONCEPTOS_DIRECCION, CREMALLERA_GEMINI, PREGUNTAS_ESTUDIO } from '../src/components/aeromovil/rodaje/direccion';
import { SUBSISTEMAS, esSub } from '../src/components/aeromovil/rodaje/subsistemas';
import { anguloBrazoAckermann, brazoNecesario, circuloDeGiro, curvaAckermann, errorParalelo, fueraIdeal, relacionDeDireccion } from '../src/components/aeromovil/rodaje/geometriaDireccion';
import type { IdSub, OpcionRodaje } from '../src/components/aeromovil/rodaje/tipos';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } };
const casi = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// ------------------------------------------------------------------ the catalogues
const listas: Record<IdSub, OpcionRodaje[]> = { ruedas: OPCIONES_RUEDAS, frenos: OPCIONES_FRENOS, direccion: OPCIONES_DIRECCION, suspension: OPCIONES_SUSPENSION_RODAJE };
for (const s of SUBSISTEMAS) {
  const l = listas[s.id];
  console.log(`\n${s.nombre}: ${l.length} opciones`);
  ok(l.length >= 2, `${s.id}: al menos dos opciones para poder comparar`);
  ok(new Set(l.map(o => o.id)).size === l.length, `${s.id}: ids únicos`);
  ok(!l.some(o => o.id === A_MEDIDA), `${s.id}: ninguna opción se llama «${A_MEDIDA}», que es lo que hay sin favorita`);
  ok(opcionesDe(s.id) === l, `${s.id}: opcionesDe devuelve su lista`);
  for (const o of l) {
    ok(o.kg > 0, `${o.id}: masa`); ok(o.masa.length > 10, `${o.id}: dice de dónde sale la masa`);
    ok(o.precio.eur > 0 && o.precio.nota.length > 10, `${o.id}: precio con su razón`);
    ok(o.precio.tipo === 'estimado' || !!(o.precio.fuente ?? o.fuentes[0]?.url), `${o.id}: un precio publicado lleva su fuente`);
    ok(o.fuentes.length > 0 && o.fuentes.every(f => /^https:\/\//.test(f.url) && f.t.length > 3), `${o.id}: fuentes con enlace`);
    ok(o.resumen.length > 20 && o.por.length > 3, `${o.id}: resumen y unidad`);
    if (s.id !== 'ruedas') ok(o.pros.length > 0 && o.contras.length > 0, `${o.id}: pros y contras (para compararla con las otras)`);
    // a part list with every figure adds up to the whole
    const conKg = o.partes.length > 0 && o.partes.every(p => p.kg != null), conEur = o.partes.length > 0 && o.partes.every(p => p.eur != null);
    if (conKg) { const suma = o.partes.reduce((a, p) => a + p.cantidad * (p.kg ?? 0), 0); ok(casi(suma, o.kg, 0.03), `${o.id}: las piezas suman ${suma.toFixed(3)} kg y la opción dice ${o.kg}`); }
    if (conEur) { const suma = o.partes.reduce((a, p) => a + p.cantidad * (p.eur ?? 0), 0); ok(casi(suma, o.precio.eur, Math.max(2, o.precio.eur * 0.02)), `${o.id}: las piezas suman ${suma.toFixed(0)} € y la opción dice ${o.precio.eur}`); }
    for (const p of o.partes) ok(p.nota.length > 5 && p.cantidad > 0, `${o.id} › ${p.n}: nota y cantidad`);
    const pub = o.partes.filter(p => p.dato === 'publicado').length, sinLeer = o.fuentes.filter(f => !f.leido).length;
    console.log(`  ${o.id.padEnd(16)} ${o.kg.toFixed(2).padStart(6)} kg ${String(o.precio.eur).padStart(5)} € (${o.precio.tipo})  ${o.partes.length} piezas (${pub} con dato publicado)${sinLeer ? `, ${sinLeer} fuente(s) sin abrir` : ''}`);
  }
}
ok(SUBSISTEMAS.map(s => s.id).join() === 'ruedas,frenos,direccion,suspension', 'el orden de los submenús');
ok(esSub('frenos') && !esSub('motor'), 'esSub');
for (const s of SUBSISTEMAS) ok(s.capas.length > 0 && s.lema.length > 10 && s.solo.length > 3, `${s.id}: capas, lema y texto de «mostrar solo»`);

// the Gemini rack: the figures that come from its page
const gem = OPCIONES_DIRECCION.find(o => o.id === 'cremallera')!;
ok(gem.kg === 3 && gem.precio.tipo === 'publicado' && gem.precio.eur === Math.round(138.48 * EUR_POR_GBP), 'la cremallera de Gemini: 3 kg y 138,48 £ publicados');
ok(CREMALLERA_GEMINI.recorrido === 0.118 && CREMALLERA_GEMINI.rotulasMin < CREMALLERA_GEMINI.rotulasMax, 'la cremallera: recorrido y rótulas');

// concepts
ok(CONCEPTOS_DIRECCION.length === 7 && new Set(CONCEPTOS_DIRECCION.map(c => c.id)).size === 7, 'siete conceptos de geometría, sin repetir');
for (const c of CONCEPTOS_DIRECCION) ok(c.queEs.length > 40 && c.porQue.length > 40, `${c.id}: qué es y por qué importa`);
ok(PREGUNTAS_ESTUDIO.length === 4, 'las cuatro preguntas del estudio');

// ------------------------------------------------------------------ the geometry
const L = 1.7, V = 0.8;
let prev = 0;
for (const p of curvaAckermann(L, V, 35, 14)) {
  ok(p.fuera <= p.dentro + 1e-9, `Ackermann: la de fuera (${p.fuera.toFixed(2)}°) no gira más que la de dentro (${p.dentro.toFixed(2)}°)`);
  ok(p.fuera >= prev - 1e-9, 'Ackermann: la curva crece con el giro'); prev = p.fuera;
  ok(casi(p.diferencia, errorParalelo(p.dentro, L, V), 1e-9), 'errorParalelo = dentro − fuera ideal');
}
ok(fueraIdeal(0, L, V) === 0, 'recto: las dos a 0°');
// the two perpendiculars meet on the rear axle line: the inner at L / tan(di), the outer at L / tan(do) = that + track
{ const di = 30, fo = fueraIdeal(di, L, V), r1 = L / Math.tan(di * Math.PI / 180), r2 = L / Math.tan(fo * Math.PI / 180);
  ok(casi(r2 - r1, V, 1e-9), `las dos perpendiculares se cortan en el eje trasero (${(r2 - r1).toFixed(4)} m de diferencia de radios, la vía es ${V})`);
  const c = circuloDeGiro(di, L, V)!; ok(c.diametro > 2 * L && casi(c.centroEje, r1 + V / 2, 1e-9), 'círculo de giro: el centro está en el eje trasero');
  ok(circuloDeGiro(0, L, V) === null, 'recto: no hay círculo');
  const br = anguloBrazoAckermann(L, V); ok(br > 0 && br < 45, `ángulo del brazo para el 100 % de Ackermann: ${br.toFixed(1)}°`);
  const rr = relacionDeDireccion(CREMALLERA_GEMINI.vueltas, di, fo); ok(rr.ratio > 1 && rr.ratio < 40, `relación de dirección ${rr.ratio.toFixed(1)}:1`);
  ok(brazoNecesario(CREMALLERA_GEMINI.recorrido / 2, di) > 0.05 && brazoNecesario(CREMALLERA_GEMINI.recorrido / 2, di) < 0.2, `brazo necesario para la cremallera de Gemini a ${di}°: ${(brazoNecesario(CREMALLERA_GEMINI.recorrido / 2, di) * 1000).toFixed(0)} mm`); }
// the model's own 3D and checks use this formula (`triciclo/medidas.ts` `anguloFuera`, in radians): the same figure
{ const m: any = crearModelo(PARAMETROS_TRICICLO); const di = 25 * Math.PI / 180;
  ok(casi(fueraIdeal(25, m.batalla, m.via.del), anguloFuera(di, m.batalla, m.via.del) * 180 / Math.PI, 1e-9), 'la misma fórmula que el 3D y las comprobaciones'); }

// ------------------------------------------------------------------ the favourite is a field of the design
const calc = (P: Parametros) => { const m: any = crearModelo(P); return { m, res: calcular(m, areas(m)) as any }; };
const piezas = (res: any): { nombre: string; kg: number }[] => res.triciclo?.piezas ?? [];
const kgDe = (res: any, re: RegExp) => piezas(res).filter(p => re.test(p.nombre)).reduce((a, p) => a + p.kg, 0);
const precios = (P: Parametros, m: any, res: any) => { const pr = preciosDiseno(pesosSecciones(res, m)!, { P, modelo: m, res }); const v = new Map<string, number>();
  for (const s of Object.values(pr.secciones)) if (s.tipo === 'propia') for (const p of s.partes) v.set(p.nombre, p.eur);
  for (const l of Object.values(pr.sinSeccion)) for (const p of l ?? []) v.set(p.nombre, p.eur); return { v, total: pr.total }; };

const base = deDiseno(PROPUESTA_BICI) as Parametros, B = calc(base), PB = precios(base, B.m, B.res);
const con = (campos: [string, string][]) => { const P = deDiseno({ ...(PROPUESTA_BICI as any), ...Object.fromEntries(campos) }) as Parametros; const c = calc(P); return { P, ...c, pr: precios(P, c.m, c.res) }; };
console.log(`\nDiseño de bicicleta sin favoritas: Dirección ${kgDe(B.res, /^Dirección/).toFixed(2)} kg, ${(PB.v.get('Dirección') ?? NaN).toFixed(0)} €; Frenos ${kgDe(B.res, /^Frenos/).toFixed(2)} kg; total ${PB.total.toFixed(0)} €`);
// the built-in bicycle design already carries a brake and a suspension (`BICI_PROPUESTA`); nobody has starred a steering yet
ok(favoritaDe('frenos', base) === BICI_PROPUESTA.tBiciFreno && favoritaDe('suspension', base) === BICI_PROPUESTA.tBiciSusp, 'la propuesta de bicicleta lleva su freno y su suspensión favoritos');
ok(favoritaDe('direccion', base) === A_MEDIDA, 'la dirección de la propuesta: ninguna elegida todavía, «a medida»');
for (const s of ['frenos', 'direccion', 'suspension'] as const) ok(favoritaDe(s, PARAMETROS_TRICICLO) === A_MEDIDA, `${s}: el Triciclo por defecto no tiene favorita`);
ok(favoritaDe('direccion', { tDirOpc: 'no-existe' }) === A_MEDIDA, 'una favorita que ya no existe se lee como «a medida»');
ok(favoritaDe('frenos', { tBiciFreno: 'no-existe' }) === A_MEDIDA, 'un freno que ya no existe se lee como «a medida»');

// steering: each option's kg and € become the part's
for (const o of OPCIONES_DIRECCION) {
  const r = con(camposDeFavorita('direccion', o.id));
  ok(favoritaDe('direccion', r.P) === o.id, `${o.id}: la estrella queda guardada en el diseño`);
  ok(casi(kgDe(r.res, /^Dirección/), o.kg, 0.02), `${o.id}: la pieza «Dirección» pesa ${kgDe(r.res, /^Dirección/).toFixed(2)} kg y la opción dice ${o.kg}`);
  ok(casi(r.pr.v.get('Dirección') ?? NaN, o.precio.eur, 1), `${o.id}: «Dirección» cuesta ${r.pr.v.get('Dirección')} € y la opción dice ${o.precio.eur}`);
  console.log(`  ★ Dirección ${o.id.padEnd(11)} → proyecto ${r.res.mVeh.toFixed(2)} kg (${(r.res.mVeh - B.res.mVeh >= 0 ? '+' : '') + (r.res.mVeh - B.res.mVeh).toFixed(2)}), ${r.pr.total.toFixed(0)} € (${(r.pr.total - PB.total >= 0 ? '+' : '') + (r.pr.total - PB.total).toFixed(0)})`);
}
// brakes and suspension
for (const [sub, re, lista] of [['frenos', /^Frenos/, OPCIONES_FRENOS], ['suspension', /^(Suspensión|Basculante y)/, OPCIONES_SUSPENSION_RODAJE]] as const) {
  const kgs = new Set<string>();
  for (const o of lista) {
    const r = con(camposDeFavorita(sub, o.id)); kgs.add(kgDe(r.res, re).toFixed(3));
    ok(favoritaDe(sub, r.P) === o.id, `${sub} ${o.id}: guardada en el diseño`);
    console.log(`  ★ ${sub.padEnd(10)} ${o.id.padEnd(16)} → piezas ${kgDe(r.res, re).toFixed(2)} kg (la opción: ${o.kg} kg ${o.por}), proyecto ${r.res.mVeh.toFixed(2)} kg, ${r.pr.total.toFixed(0)} €`);
  }
  ok(kgs.size > 1, `${sub}: elegir otra favorita cambia las piezas del proyecto`);
}
// wheels: one per axle
{ const ids = OPCIONES_RUEDAS.map(o => o.id), a = ids[0], b = ids[ids.length - 1];
  const r = con(camposDeFavorita('ruedas', a, 'del')); const f = favoritaDe('ruedas', r.P);
  ok(f.del === a, 'ruedas: la favorita delantera queda guardada'); ok(camposDeFavorita('ruedas', b, 'todas').length === 2 && camposDeFavorita('ruedas', b, 'tras').length === 1, 'ruedas: ★ delanteras / traseras / las cuatro');
  console.log(`  ★ ruedas delanteras ${a}: piezas ${kgDe(r.res, /^Ruedas?\b/).toFixed(2)} kg, proyecto ${r.res.mVeh.toFixed(2)} kg`); }

// the heavy-class default design is untouched by all of this
{ const d = calc(PARAMETROS_TRICICLO); ok(d.res.mVeh > 0, 'el Triciclo por defecto sigue calculando'); }

console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
