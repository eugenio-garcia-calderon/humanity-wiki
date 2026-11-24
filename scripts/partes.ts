/**
 * The vehicle's parts (2026-11-24, `src/components/aeromovil/partes/`): the running gear's four, then the motor's four (motor,
 * controller, reduction gear, petrol engine), the battery and the chassis frame. Run: npx tsx scripts/partes.ts
 * The motor makers' parts and the page's own choices (the battery's place, the tubes' material) are TRIED on a copy of the design
 * (`alternativas.ts`): each option's figures are the ones the project shows when it is chosen. Checks for the running gear's four: every option of brakes, steering, suspension and wheels has a unique id, a positive mass, a price with its
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
import { OPCIONES_FRENOS, OPCIONES_RUEDAS, OPCIONES_SUSPENSION_RODAJE, OPCIONES_DIRECCION, camposDeFavorita, favoritaDe, opcionesDe } from '../src/components/aeromovil/partes/opciones';
import { CONCEPTOS_DIRECCION, CREMALLERA_GEMINI, PREGUNTAS_ESTUDIO } from '../src/components/aeromovil/partes/direccion';
import { SUBSISTEMAS, esSub, partesDe, subsistema, tieneSub } from '../src/components/aeromovil/partes/subsistemas';
import { OPCIONES_CONTROLADOR, OPCIONES_MOTOR, OPCIONES_REDUCTORA, OPCIONES_TERMICO, elegidasDe, selectorVisible } from '../src/components/aeromovil/partes/opciones';
import { grupoPieza } from '../src/components/aeromovil/triciclo/masas';
import { numerosActuales, sinParteDe } from '../src/components/aeromovil/partes/numeros';
import { evaluar } from '../src/components/aeromovil/partes/alternativas';
import { datosDelDiseno } from '../src/components/aeromovil/partes/datosDiseno';
import { anotarDecision, ultimaDecision } from '../src/components/aeromovil/partes/decisiones';
import { CONTROLADORES, MOTORES, REDUCTORAS, TERMICOS, precioEuros } from '../src/components/aeromovil/catalogoTren';
import { anguloBrazoAckermann, brazoNecesario, circuloDeGiro, curvaAckermann, errorParalelo, fueraIdeal, relacionDeDireccion } from '../src/components/aeromovil/partes/geometriaDireccion';
import type { IdSub, OpcionRodaje } from '../src/components/aeromovil/partes/tipos';

let fallos = 0;
const ok = (c: boolean, m: string) => { if (!c) { console.log(`FALLA ${m}`); fallos++; } };
const casi = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// ------------------------------------------------------------------ the catalogues
const listas: Record<string, OpcionRodaje[]> = { ruedas: OPCIONES_RUEDAS, frenos: OPCIONES_FRENOS, direccion: OPCIONES_DIRECCION, suspension: OPCIONES_SUSPENSION_RODAJE };
for (const s of SUBSISTEMAS.filter(x => x.dep === 'rodaje')) {
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
ok(SUBSISTEMAS.map(s => s.id).join() === 'ruedas,frenos,direccion,suspension,motor,controlador,reductora,termico,carenado,cristales,solar,accesos,retrovisores,luces,asientos,mandos,salpicadero,acabado,bateria,bastidor', 'el orden de los submenús');
ok(esSub('frenos') && esSub('motor') && !esSub('nada'), 'esSub');
ok(new Set(SUBSISTEMAS.map(s => s.id)).size === SUBSISTEMAS.length, 'ids de partes únicos');
ok(SUBSISTEMAS.every(s => (s.origen === 'catalogo' ? !!s.campo : (s.selectores?.length ?? 0) > 0)), 'cada parte dice de dónde salen sus opciones');
ok(['rodaje', 'propulsion', 'energia', 'chasis', 'carroceria', 'interior'].every(tieneSub) && !tieneSub('proyecto'), 'tieneSub: los seis departamentos tienen sus partes');
ok(partesDe('carroceria', PARAMETROS_TRICICLO).map(s => s.id).join() === 'carenado,cristales,solar,accesos,retrovisores,luces' && partesDe('interior', PARAMETROS_TRICICLO).map(s => s.id).join() === 'asientos,mandos,salpicadero,acabado', 'las partes de la carrocería y del interior, en su orden');
ok(partesDe('propulsion', PARAMETROS_TRICICLO).map(s => s.id).join() === 'motor,controlador,reductora' && partesDe('propulsion', { tPropulsion: 'phev' }).map(s => s.id).join() === 'motor,controlador,reductora,termico', 'el motor de gasolina solo está en el híbrido enchufable');
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


// ------------------------------------------------------------------ the motor makers' parts, tried on a copy of the design
const P0 = PARAMETROS_TRICICLO as Parametros, PH = { ...PARAMETROS_TRICICLO, tPropulsion: 'phev', tHibArq: 'reparto' } as Parametros;
const eurDe = (c: { precio?: any }) => { const e = precioEuros(c.precio); return e == null ? null : Math.round(e); };
const CATALOGOS = [
  { sub: 'motor', lista: OPCIONES_MOTOR, cat: MOTORES as readonly any[], P: P0, pieza: /^Motor(es)? de buje/ },
  { sub: 'controlador', lista: OPCIONES_CONTROLADOR, cat: CONTROLADORES as readonly any[], P: P0, pieza: /^Controlador/ },
  { sub: 'reductora', lista: OPCIONES_REDUCTORA, cat: REDUCTORAS as readonly any[], P: P0, pieza: /^Motor: reductora/ },
  { sub: 'termico', lista: OPCIONES_TERMICO, cat: TERMICOS as readonly any[], P: PH, pieza: /^Motor de gasolina/ },
] as const;
for (const { sub, lista, cat, P, pieza } of CATALOGOS) {
  console.log(`\n${sub}: ${lista.length} opciones del catálogo`);
  ok(lista.length === cat.length && opcionesDe(sub) === lista, `${sub}: una opción por pieza del catálogo`);
  ok(new Set(lista.map(o => o.id)).size === lista.length && !lista.some(o => o.id === A_MEDIDA), `${sub}: ids únicos y ninguno es «${A_MEDIDA}»`);
  ok(favoritaDe(sub, P) === A_MEDIDA, `${sub}: el diseño de partida no tiene favorita`);
  ok(favoritaDe(sub, { [subsistema(sub).campo as string]: 'no-existe' }) === A_MEDIDA, `${sub}: una favorita que ya no existe se lee como «a medida»`);
  const base0 = evaluar(sub, P, [])!; ok(!!base0, `${sub}: el diseño de partida se calcula`);
  const huellas = new Set<string>();
  for (const o of lista) {
    const c = cat.find(x => x.id === o.id)!;
    ok(o.calculando === true && o.fuentes.length > 0 && o.fuentes.every(f => /^https:\/\//.test(f.url) && !!f.leido), `${o.id}: sale «calculando» y con sus fuentes leídas`);
    ok(o.resumen.length > 20 && (o.datos?.length ?? 0) >= 4 && o.datos!.every(([k, v]) => k.length > 2 && v.length > 0 && !/NaN|undefined/.test(v)), `${o.id}: resumen y ficha de datos`);
    ok(o.datoKg === (c.kg != null ? 'publicado' : 'estimado'), `${o.id}: dice si la masa es publicada o estimada`);
    if (c.kg != null) ok(o.partes[0]?.kg === c.kg, `${o.id}: la pieza lleva la masa del catálogo`);
    const e = eurDe(c);
    ok(e == null ? o.precio.tipo === 'estimado' : o.precio.tipo === 'publicado' && o.precio.eur === e, `${o.id}: el precio publicado se convierte a € y el que falta se dice estimado`);
    // choosing it: the star writes the catalogue field and the project's part follows
    const campos = camposDeFavorita(sub, o.id); ok(campos.length === 1 && campos[0][1] === o.id, `${o.id}: la estrella escribe un campo del diseño`);
    const Q = { ...P, ...Object.fromEntries(campos) } as Parametros; ok(favoritaDe(sub, Q) === o.id, `${o.id}: queda guardada en el diseño`);
    const ev = evaluar(sub, P, campos);
    if (!ev) { ok(false, `${o.id}: se pudo probar en el diseño`); continue; }
    ok(ev.comprobaciones.every(x => x.nombre.length > 3), `${o.id}: sus comprobaciones tienen nombre`);
    const lineas = ev.partes.filter(p => pieza.test(p.nombre)), kgL = lineas.reduce((a, p) => a + p.kg, 0), eurL = lineas.reduce((a, p) => a + p.eur, 0);
    if (sub === 'reductora' && c.kg == null) ok(ev.partes.length === 0 && ev.kg === 0, `${o.id}: sin masa publicada el proyecto no añade la pieza`);
    else {
      ok(lineas.length > 0, `${o.id}: el proyecto lleva la pieza «${sub}» con ella`);
      // the petrol engine is five lines of the mass list (block, exhaust, intake, pumps): together they weigh what the catalogue says
      if (lineas.length && c.kg != null) ok(casi(kgL, c.kg, 0.05), `${o.id}: el proyecto pesa ${kgL.toFixed(2)} kg${lineas.length > 1 ? ` (en ${lineas.length} líneas)` : ''} y el catálogo dice ${c.kg}`);
      if (lineas.length && e != null) ok(casi(eurL, e, 1.5), `${o.id}: el proyecto cuenta ${eurL.toFixed(0)} € y la tienda ${e}${lineas.length > 1 ? ` (repartido en ${lineas.length} líneas)` : ''}`);
    }
    huellas.add(`${ev.kg.toFixed(2)}|${ev.eur.toFixed(0)}`);
    console.log(`  ★ ${o.id.padEnd(22)} proyecto: ${ev.kg.toFixed(2).padStart(6)} kg ${ev.eur.toFixed(0).padStart(5)} € · vehículo ${ev.vehiculoKg.toFixed(1)} kg · ${ev.comprobaciones.filter(x => !x.bien).length}/${ev.comprobaciones.length} comprobaciones fallan · masa ${o.datoKg}, precio ${o.precio.tipo}`);
  }
  ok(huellas.size >= 3, `${sub}: elegir otra favorita cambia lo que lleva el proyecto (${huellas.size} resultados distintos)`);
  // «a medida» is today's car
  const med = evaluar(sub, P, camposDeFavorita(sub, A_MEDIDA))!; ok(casi(med.kg, base0.kg, 1e-9) && casi(med.eur, base0.eur, 1e-9), `${sub}: «a medida» es el diseño de hoy`);
}
ok(OPCIONES_REDUCTORA.length === 7 && OPCIONES_MOTOR.length === 16 && OPCIONES_CONTROLADOR.length === 12 && OPCIONES_TERMICO.length === 9, 'el catálogo: 16 motores, 12 controladores, 7 reductoras, 9 motores de gasolina');

// ------------------------------------------------------------------ the page's own choices: the battery's place, the chassis
console.log('\nbateria y bastidor: las opciones son las del diseño, probadas con el modelo');
ok(opcionesDe('bateria', P0).map(o => o.id).join() === 'tBatDisp:reparto,tBatDisp:chasis', 'batería: dos sitios');
ok(opcionesDe('bastidor', P0).map(o => o.id).join() === 'tChMat:al6061,tChMat:cromoly,tChMat:carbono', 'bastidor: tres materiales; los largueros hasta el eje solo con dos ruedas traseras');
ok(opcionesDe('bastidor', { ...P0, tTraseras: 'dos' }).map(o => o.id).join() === 'tChMat:al6061,tChMat:cromoly,tChMat:carbono,tChLargo:torreta,tChLargo:eje', 'bastidor con cuatro ruedas: cinco opciones, en dos decisiones');
ok(selectorVisible('tChLargo', { tTraseras: 'dos' }) && !selectorVisible('tChLargo', { tTraseras: 'una' }) && !selectorVisible('tChLargo', { tTraseras: 'dos', tRuedas: 'rombo' }) && selectorVisible('tChMat', {}), 'selectorVisible');
ok(elegidasDe('bateria', P0).join() === 'tBatDisp:reparto' && elegidasDe('bastidor', P0).join() === 'tChMat:cromoly', 'un diseño que nunca tocó la elección se lee con su valor de siempre');
ok(elegidasDe('bastidor', { ...P0, tChMat: 'carbono' }).join() === 'tChMat:carbono' && elegidasDe('bateria', { ...P0, tBatDisp: 'chasis' }).join() === 'tBatDisp:chasis', 'la estrella queda en lo que el diseño lleva');
ok(JSON.stringify(camposDeFavorita('bastidor', 'tChMat:carbono')) === '[["tChMat","carbono"]]' && JSON.stringify(camposDeFavorita('bateria', 'tBatDisp:chasis')) === '[["tBatDisp","chasis"]]', 'la estrella de una opción del modelo escribe el campo del diseño');
for (const { sub, P } of [{ sub: 'bateria', P: P0 }, { sub: 'bastidor', P: { ...P0, tTraseras: 'dos' } as Parametros }] as const) {
  const evs: Record<string, ReturnType<typeof evaluar>> = {};
  for (const o of opcionesDe(sub, P)) {
    ok(o.calculando === true && !!o.grupo && !!o.decision && o.resumen.length > 30, `${o.id}: sale «calculando», con su decisión y su texto`);
    const ev = evaluar(sub, P, camposDeFavorita(sub, o.id)); evs[o.id] = ev;
    if (!ev) { ok(false, `${o.id}: se pudo probar`); continue; }
    ok(ev.kg > 0 && ev.eur > 0 && ev.partes.length > 0 && ev.extra.length >= 3, `${o.id}: kg, € y datos de lo que lleva el proyecto con ella`);
    console.log(`  ★ ${o.id.padEnd(18)} → ${sub} ${ev.kg.toFixed(2)} kg, ${ev.eur.toFixed(0)} €; vehículo ${ev.vehiculoKg.toFixed(1)} kg; ${ev.extra.slice(1, 3).map(x => `${x[0]} ${x[1]}`).join('; ')}`);
  }
  if (sub === 'bastidor') {
    const k = (id: string) => evs[`tChMat:${id}`]!.kg;
    ok(k('carbono') < k('al6061') && k('al6061') < k('cromoly'), `bastidor: el carbono pesa menos que el aluminio y el aluminio menos que el cromoly (${k('carbono').toFixed(1)} < ${k('al6061').toFixed(1)} < ${k('cromoly').toFixed(1)} kg)`);
    ok(evs['tChLargo:eje']!.kg > evs['tChLargo:torreta']!.kg, 'bastidor: los largueros hasta el eje trasero llevan más tubo');
  } else {
    const alto = (id: string) => evs[id]!.extra.find(x => x[0].startsWith('Altura del centro'))?.[1];
    ok(!!alto('tBatDisp:reparto') && !!alto('tBatDisp:chasis') && alto('tBatDisp:reparto') !== alto('tBatDisp:chasis'), `batería: cambiar el sitio mueve el centro de gravedad (${alto('tBatDisp:reparto')} → ${alto('tBatDisp:chasis')})`);
  }
}

// ------------------------------------------------------------------ Carrocería and Interior: the page's own choices, tried with the model
console.log('\ncarrocería e interior: las opciones son las del diseño, probadas con el modelo');
const PD = { ...P0, tAcceso: 'puertas', tPuertas2: 'si', tAcabado: 'paneles', tTapiz: 'cueroCognac' } as Parametros;
const ids = (sub: IdSub, P: Parametros) => opcionesDe(sub, P).map(o => o.id).join();
ok(ids('carenado', P0) === 'tMatCarenado:carbonoLino,tMatCarenado:vidrio,tMatCarenado:carbono,tCubierta:redonda,tCubierta:lisa,tColaCorte:no,tColaCorte:kamm,tConAleta:si,tConAleta:no', 'carrocería: material, cubierta, cola y aleta');
ok(ids('accesos', P0) === 'tAcceso:cupula,tAcceso:puertas' && ids('accesos', PD) === 'tAcceso:cupula,tAcceso:puertas,tMaletero:cola,tMaletero:aptera,tPuertas2:no,tPuertas2:si', 'puertas y maletero: la tapa del maletero y la segunda puerta solo existen con puertas');
ok(ids('asientos', P0) === 'tAsientos:horcajadas,tAsientos:butacas,tAsientos:filas,tTapiz:serie,tTapiz:cueroCognac,tTapiz:cueroNegro,tTapiz:alcantara,tTapiz:tela,tCinturon:no,tCinturon:negro,tCinturon:gris,tCinturon:marron,tCinturon:rojo', 'asientos: la costura solo existe con una tapicería que no sea la de serie');
ok(ids('asientos', PD).includes('tCostura:recta') && !ids('asientos', P0).includes('tCostura'), 'asientos: con tapicería de cuero aparece la costura');
ok(ids('acabado', P0) === 'tAcabado:chasis,tAcabado:paneles,tAcabado:lujo,tConsolaCentral:no,tConsolaCentral:si' && ['tMoldura:madera', 'tConsolaTecho:apagada', 'tAmbiente:azul', 'tForroColor:crema'].every(i => ids('acabado', PD).includes(i)), 'acabado interior: molduras, consola, luz y color solo con forro');
ok(selectorVisible('tMaletero', { tAcceso: 'puertas' }) && !selectorVisible('tMaletero', { tAcceso: 'cupula' }) && !selectorVisible('tMoldura', { tAcabado: 'chasis' }) && selectorVisible('tMoldura', { tAcabado: 'lujo' }) && !selectorVisible('tCostura', { tTapiz: 'serie' }) && selectorVisible('tCostura', { tTapiz: 'tela' }), 'selectorVisible: puertas, forro y tapicería');
ok(elegidasDe('carenado', P0).join() === 'tMatCarenado:carbonoLino,tCubierta:redonda,tColaCorte:no,tConAleta:si' && elegidasDe('accesos', P0).join() === 'tAcceso:cupula', 'un diseño que nunca tocó la elección se lee con su valor de siempre (carrocería)');
// every piece of the mass list belongs to at most one part, and to a part of its own department
for (const [nombre, Q] of [['por defecto', P0], ['completo', { ...PD, tMaletero: 'aptera', tAcabado: 'lujo', tMoldura: 'madera', tConsolaTecho: 'encendida', tAmbiente: 'azul', tConsolaCentral: 'si', tCinturon: 'rojo', tCostura: 'recta', tSolarCola: 'si', tSolarMorro: 'si', tRetrovisores: 'espejos', tMando: 'volante', tSalpicadero: 'blanco', tAsientos: 'filas', tFaro: 'si' } as Parametros], ['cuatro ruedas', { ...P0, tTraseras: 'dos' } as Parametros], ['rombo', { ...P0, tRuedas: 'rombo' } as Parametros]] as const) {
  const { res } = calc(Q), sueltas: string[] = [];
  for (const p of res.triciclo!.piezas) {
    const dueñas = SUBSISTEMAS.filter(x => x.piezas.test(p.nombre));
    ok(dueñas.length <= 1, `diseño ${nombre}: «${p.nombre}» no puede ser de dos partes (${dueñas.map(x => x.id)})`);
    ok(dueñas.every(x => x.dep === grupoPieza(p.nombre)), `diseño ${nombre}: «${p.nombre}» es de otro departamento que su parte`);
    if (!dueñas.length) sueltas.push(`${p.nombre} ${p.kg.toFixed(1)} kg`);
  }
  console.log(`  ${nombre}: piezas sin parte propia: ${sueltas.join('; ') || 'ninguna'}`);
}
// the summary of a department: its parts plus the lines no part claims add up to the department's mass (the pedals of a bicycle design, the hybrid's planetary gear)
for (const [nombre, Q] of [['por defecto', P0], ['híbrido', PH], ['bicicleta', { ...PARAMETROS_TRICICLO, ...BICI_PROPUESTA } as Parametros]] as const) {
  const { m, res } = calc(Q), pr = preciosDiseno(pesosSecciones(res, m)!, { P: Q, modelo: m, res });
  for (const dep of ['rodaje', 'propulsion', 'carroceria', 'interior'] as const) {
    const delDep = res.triciclo!.piezas.filter((p: { nombre: string }) => grupoPieza(p.nombre) === dep).reduce((a: number, p: { kg: number }) => a + p.kg, 0);
    const kg = partesDe(dep, Q).reduce((a, x) => a + numerosActuales(x.id, pr).kg, 0), otras = sinParteDe(dep, pr);
    ok(casi(kg + otras.reduce((a, p) => a + p.kg, 0), delDep, 0.01), `diseño ${nombre}, ${dep}: las partes (${kg.toFixed(2)} kg) y las piezas sin parte (${otras.map(p => `${p.nombre} ${p.kg.toFixed(2)}`).join('; ') || 'ninguna'}) suman lo que el departamento (${delDep.toFixed(2)} kg)`);
  }
}
const evsDe: Record<string, Record<string, NonNullable<ReturnType<typeof evaluar>>>> = {};
for (const { sub, P } of [{ sub: 'carenado', P: P0 }, { sub: 'cristales', P: P0 }, { sub: 'solar', P: P0 }, { sub: 'accesos', P: PD }, { sub: 'retrovisores', P: P0 }, { sub: 'luces', P: P0 }, { sub: 'asientos', P: PD }, { sub: 'mandos', P: P0 }, { sub: 'salpicadero', P: P0 }, { sub: 'acabado', P: { ...PD, tAcabado: 'paneles' } as Parametros }] as const) {
  const evs: Record<string, NonNullable<ReturnType<typeof evaluar>>> = (evsDe[sub] = {});
  for (const o of opcionesDe(sub, P)) {
    ok(o.calculando === true && !!o.grupo && !!o.decision && o.resumen.length > 20, `${sub} › ${o.id}: sale «calculando», con su decisión y su texto`);
    const ev = evaluar(sub, P, camposDeFavorita(sub, o.id));
    if (!ev) { ok(false, `${sub} › ${o.id}: se pudo probar`); continue; }
    evs[o.id] = ev;
    ok(Number.isFinite(ev.kg) && Number.isFinite(ev.eur) && ev.kg >= 0 && ev.eur >= 0 && ev.extra.length >= 3, `${sub} › ${o.id}: kg, € y datos de lo que lleva el proyecto con ella`);
    ok(ev.extra.every(([, v]) => !/NaN|undefined|Infinity/.test(v)) && ev.comprobaciones.every(c => !/NaN|undefined/.test(c.nombre)), `${sub} › ${o.id}: sin NaN`);
  }
  console.log(`  ${sub.padEnd(12)} ${Object.entries(evs).map(([id, e]) => `${id.split(':')[1]} ${e.kg.toFixed(1)} kg/${e.eur.toFixed(0)} €`).join(' · ')}`);
}
{ const k = (sub: string, id: string) => evsDe[sub][id]?.kg ?? NaN;
  ok(k('carenado', 'tMatCarenado:carbonoLino') < k('carenado', 'tMatCarenado:carbono') && k('carenado', 'tMatCarenado:carbono') < k('carenado', 'tMatCarenado:vidrio'), `carrocería: carbono-lino < carbono < vidrio (${k('carenado', 'tMatCarenado:carbonoLino').toFixed(1)} < ${k('carenado', 'tMatCarenado:carbono').toFixed(1)} < ${k('carenado', 'tMatCarenado:vidrio').toFixed(1)} kg)`);
  ok(k('solar', 'tSolarCola:si') > k('solar', 'tSolarCola:no') && k('solar', 'tSolarMorro:si') > k('solar', 'tSolarMorro:no'), 'paneles solares: más superficie, más peso');
  ok(k('accesos', 'tAcceso:puertas') > k('accesos', 'tAcceso:cupula') && k('accesos', 'tPuertas2:si') > k('accesos', 'tPuertas2:no'), 'puertas: las bisagras y los cierres pesan; la segunda puerta, más');
  ok(k('retrovisores', 'tRetrovisores:espejos') > k('retrovisores', 'tRetrovisores:camaras'), 'retrovisores: los espejos son una pieza; las cámaras no cuentan masa en el modelo');
  ok(k('luces', 'tFaro:si') > k('luces', 'tFaro:no') && k('luces', 'tFaro:barra') > k('luces', 'tFaro:no'), 'luces: sin faro no hay pieza');
  ok(k('asientos', 'tAsientos:filas') > k('asientos', 'tAsientos:horcajadas') && k('asientos', 'tCinturon:negro') > k('asientos', 'tCinturon:no'), 'asientos: cuatro plazas pesan más que dos; los cinturones suman');
  ok(k('mandos', 'tMando:volante') > k('mandos', 'tMando:manillar'), 'mando: el volante con su columna pesa más que el manillar');
  ok(k('salpicadero', 'tSalpicadero:blanco') > k('salpicadero', 'tSalpicadero:si') && k('salpicadero', 'tSalpicadero:si') > k('salpicadero', 'tSalpicadero:no'), 'salpicadero: blanco > de lado a lado > la pantallita');
  ok(k('acabado', 'tAcabado:lujo') > k('acabado', 'tAcabado:paneles') && k('acabado', 'tAcabado:paneles') > k('acabado', 'tAcabado:chasis') && k('acabado', 'tConsolaCentral:si') > k('acabado', 'tConsolaCentral:no'), 'acabado interior: lujo > paneles > chasis a la vista; el reposabrazos suma');
}

// ------------------------------------------------------------------ the numbers of each part in this design, and the decisions log
{ const { m, res } = calc(P0), { m: mH, res: rH } = calc(PH);
  const { m: mC, res: rC } = calc({ ...PD, tMaletero: 'aptera', tAcabado: 'lujo', tMoldura: 'madera', tConsolaTecho: 'encendida', tAmbiente: 'azul', tConsolaCentral: 'si', tCinturon: 'rojo', tCostura: 'recta', tSolarCola: 'si', tRetrovisores: 'espejos', tMando: 'volante', tSalpicadero: 'blanco', tFaro: 'barra' } as Parametros);
  for (const s of ['carenado', 'cristales', 'solar', 'accesos', 'retrovisores', 'luces', 'asientos', 'mandos', 'salpicadero', 'acabado'] as const) {
    for (const [nombre, mm, rr, PP] of [['por defecto', m, res, P0], ['completo', mC, rC, PD]] as const) {
      const d = datosDelDiseno(s, PP, mm, rr);
      ok(d.length >= 1 && d.every(([k, v]) => k.length > 3 && v.length > 0 && !/NaN|undefined|Infinity/.test(v)), `${s} (${nombre}): datos del diseño, sin NaN`);
    }
  }
  ok(datosDelDiseno('acabado', PD, mC, rC).some(([k]) => /molduras/i.test(k)), 'acabado: la lista del interior trae las molduras cuando hay forro');
  for (const s of ['motor', 'controlador', 'reductora', 'bateria', 'bastidor'] as const) {
    const d = datosDelDiseno(s, P0, m, res);
    ok(d.length >= 3 && d.every(([k, v]) => k.length > 3 && v.length > 0 && !/NaN|undefined|Infinity/.test(v)), `${s}: datos del diseño, sin NaN`);
  }
  const t = datosDelDiseno('termico', PH, mH, rH); ok(t.length >= 3 && t.every(([, v]) => !/NaN|undefined/.test(v)), 'motor de gasolina: datos del diseño');
  ok(datosDelDiseno('frenos', P0, m, res).length === 0, 'las partes del rodaje no repiten datos que ya tienen su sección');
}
{ let l = anotarDecision(undefined, 'bastidor', { opcion: 'carbono', decision: 'tChMat', fecha: '2026-11-24' });
  l = anotarDecision(l, 'bastidor', { opcion: 'carbono', decision: 'tChMat', fecha: '2026-11-24' });
  ok(l.bastidor.length === 1, 'la misma decisión dos veces se anota una');
  l = anotarDecision(l, 'bastidor', { opcion: 'carbono', decision: 'tChLargo', fecha: '2026-11-24' });
  ok(l.bastidor.length === 2 && ultimaDecision(l, 'bastidor')?.decision === 'tChLargo', 'la misma opción de otra decisión de la parte sí cuenta'); }

// the heavy-class default design is untouched by all of this
{ const d = calc(PARAMETROS_TRICICLO); ok(d.res.mVeh > 0, 'el Triciclo por defecto sigue calculando'); }

console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK');
process.exit(fallos ? 1 : 0);
