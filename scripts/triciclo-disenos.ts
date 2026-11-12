/**
 * Saved designs and the Triciclo Bala (2026-11-10). Run with: npx tsx scripts/triciclo-disenos.ts [carpeta-de-main]
 *
 *  - Round trip: the default Triciclo, and one with every field moved, survive save → open unchanged; a saved
 *    `{"disposicion": "triciclo"}` (what the team base design will be) opens with the defaults.
 *  - Clamping: out-of-range numbers build a model with the values at the ends of their sliders; wrong types and
 *    unknown options fall back to the defaults (a design written by hand cannot build an impossible triciclo).
 *  - The body at the defaults is the Cuadriciclo Bala's default body: the same envelope, and every body mesh
 *    (skin, canopy, livery, lamps, fin) the same vertex for vertex.
 *  - Old designs untouched: with `carpeta-de-main` (a copy of main's src/, e.g. from `git archive`), the Gota,
 *    the Aeromóvil 1 and the Cuadriciclo designs open to the same parameters and the same results as on main.
 */
import * as THREE from 'three';
import { PARAMETROS_A1, PARAMETROS_BALA, PARAMETROS_GOTA, PARAMETROS_TRICICLO, TRICICLO_DEFECTO, areas, calcular, crearModelo, type Parametros } from '../src/components/aeromovil/geometria';
import { aDiseno, deDiseno } from '../src/components/aeromovil/Disenos';
import { camposTriciclo, deslizadoresTriciclo, opcionesCabinaTriciclo, rangoTriciclo, type ModeloTriciclo } from '../src/components/aeromovil/geometriaTriciclo';
import type { ModeloBala } from '../src/components/aeromovil/geometriaBala';
import { construirCon, crearMateriales } from '../src/components/aeromovil/garaje/balaModelo';
import { CLASICO_GUARDADO, MIGRACION_0209 } from './clasicoGuardado';

let fallos = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'OK   ' : 'FALLA'} ${m}`); if (!c) fallos++; };
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ── round trip
ok(igual(deDiseno(aDiseno(PARAMETROS_TRICICLO)), { ...PARAMETROS_TRICICLO, comp: 0 }), 'el Triciclo por defecto se guarda y se abre igual');
ok(igual(camposTriciclo(deDiseno({ disposicion: 'triciclo' })), TRICICLO_DEFECTO), 'un diseño guardado solo con {"disposicion": "triciclo"} abre con las medidas por defecto');
{
  const P: Parametros = { ...PARAMETROS_TRICICLO };
  const T = camposTriciclo(P);
  for (const f of deslizadoresTriciclo()) { const [a, b] = rangoTriciclo(f.clave, T); (P as unknown as Record<string, unknown>)[f.clave] = +(a + (b - a) * 0.3).toFixed(4); }
  Object.assign(P, { tMatCarenado: 'vidrio', tChMat: 'al6061', tRuedaDel: '24', tRuedaTras: '26' });
  const Q = deDiseno(JSON.parse(JSON.stringify(aDiseno(P))));
  ok(igual(camposTriciclo(Q), camposTriciclo(P)), 'un Triciclo con todos los campos cambiados se guarda y se abre igual');
  const m = crearModelo(Q) as ModeloTriciclo;
  ok(m.tipo === 'triciclo' && m.ruedas.length === 3, 'y abre como triciclo, con tres ruedas');
}

// ── the «Bala de cuatro ruedas» (2026-11-11): a Triciclo design with two rear wheels
{
  const base = { ...PARAMETROS_TRICICLO, tVia: 2.1, tBatalla: 2.6 } as Parametros;
  const viejo = JSON.parse(JSON.stringify(aDiseno(base))); delete viejo.tTraseras; delete viejo.tViaTras;
  const Q = deDiseno({ ...viejo, tTraseras: 'dos' });
  ok(Q.tViaTras === 2.1 && camposTriciclo(Q).tTraseras === 'dos', `un diseño guardado sin vía trasera, al pasar a cuatro ruedas: vía trasera = la delantera (${Q.tViaTras} m)`);
  const m = crearModelo(Q) as ModeloTriciclo, m3 = crearModelo(deDiseno(viejo)) as ModeloTriciclo;
  ok(m.ruedas.length === 4 && m.cuatro && !m.faldon && m3.ruedas.length === 3 && !m3.cuatro, 'abre con cuatro ruedas (y sin faldón); el mismo diseño sin «dos», con tres');
  const T4 = camposTriciclo(Q), T3 = camposTriciclo(deDiseno(viejo));
  const distintos = (Object.keys(T3) as (keyof typeof T3)[]).filter(k => k !== 'tTraseras' && T3[k] !== T4[k]);
  ok(!distintos.length, `todas las demás medidas son las del triciclo${distintos.length ? ` (distintas: ${distintos.join(', ')})` : ''}`);
  const sinCuerpo = (mm: ModeloTriciclo) => JSON.stringify(mm.F.envolvente());
  ok(sinCuerpo(m) === sinCuerpo(m3), 'y la misma carrocería');
}

// ── 2026-11-12: the clásico with every new option on survives save → open, and builds what it says
{
  const P = { ...PARAMETROS_TRICICLO, tTraseras: 'dos', tBatDisp: 'chasis', tMando: 'volante', tSalpicadero: 'si', tAcceso: 'puertas', tRetrovisores: 'espejos', tMaletero: 'aptera', tPilY: 0.37, tPasY: 0.37 } as Parametros;
  const Q = deDiseno(JSON.parse(JSON.stringify(aDiseno(P))));
  ok(igual(camposTriciclo(Q), camposTriciclo(P)), 'el clásico con batería a lo largo del bastidor, volante, salpicadero, puertas, retrovisores y portón se guarda y se abre igual');
  const m = crearModelo(Q) as ModeloTriciclo;
  ok(!!m.paquete && !!m.volante && !!m.salpicadero && !!m.puerta && !!m.porton && !!m.retrovisor && m.baterias.length === 1, 'y abre con todo eso');
  ok(Math.abs(m.sillines.yPiloto - 0.37) < 1e-9, `y con los asientos a 37 cm (más bajo que el mínimo de antes, 38): ${m.sillines.yPiloto} m`);
  const noA = crearModelo({ ...P, tAcceso: 'cupula' } as Parametros) as ModeloTriciclo;
  ok(!noA.puerta && !noA.porton, 'el portón largo sin puertas no existe (con la cúpula entera, la parte de atrás de la cúpula se abre con ella)');
}

// ── clamping
{
  const P = deDiseno({ disposicion: 'triciclo', tVia: 9, tPilY: -1, tKWh: 999, tRecPil: 90, tGiro: 80, tPodEsc: 0.1, tBatalla: 5 } as Partial<Parametros>);
  const m = crearModelo(P) as ModeloTriciclo, T = m.campos, f = (k: string) => deslizadoresTriciclo().find(x => x.clave === k)!;
  ok(Math.abs(m.F.VIA_LAT - f('tVia').max) < 1e-9, `vía 9 m → ${m.F.VIA_LAT} m (el máximo del deslizador)`);
  // (its minimum depends on the belly since round two: `rangoTriciclo`)
  // (2026-11-12: a design without `tMando` was saved before the seats could come down onto the frame: it opens at the
  // floor it had then, 38 cm less what its belly came down (Disenos.tsx `asientosDeAntes`); a current one, at the new minimum)
  ok(Math.abs(m.sillines.yPiloto - Math.max(0.30, 0.38 + Math.min(0, T.tSuelo - 0.124))) < 1e-9, `sillín del piloto a −1 m, diseño de antes → ${m.sillines.yPiloto} m (el mínimo de entonces con esa panza)`);
  {
    const n = crearModelo(deDiseno({ disposicion: 'triciclo', tPilY: -1, tMando: 'manillar' } as Partial<Parametros>)) as ModeloTriciclo;
    ok(Math.abs(n.sillines.yPiloto - rangoTriciclo('tPilY', n.campos)[0]) < 1e-9 && n.sillines.yPiloto < 0.30, `sillín del piloto a −1 m, diseño de ahora → ${n.sillines.yPiloto.toFixed(3)} m (6 cm sobre los largueros)`);
  }
  ok(Math.abs(m.rec.piloto - f('tRecPil').max) < 1e-9 && Math.abs(m.giro * 180 / Math.PI - f('tGiro').max) < 1e-9, `reclinado 90° → ${m.rec.piloto}°; giro 80° → ${Math.round(m.giro * 180 / Math.PI)}°`);
  ok(Math.abs(m.F.BATALLA - f('tBatalla').max) < 1e-9 && m.F.D.pod!.esc === f('tPodEsc').min, `batalla de la carrocería 5 m → ${m.F.BATALLA} m; carenado ×0,1 → ×${m.F.D.pod!.esc}`);
  const res = calcular(m, areas(m));
  ok(Math.abs(res.triciclo!.bateria.kg - f('tKWh').max * 1000 / T.tWhKg) < 1e-9, `batería de 999 kWh → ${f('tKWh').max} kWh (${Math.round(res.triciclo!.bateria.kg)} kg, ${Math.round(res.triciclo!.bateria.litros)} L)`);
  void T;
  const Q = deDiseno({ disposicion: 'triciclo', tVia: 'ancha', tRuedaDel: '99', tChMat: 'madera', tSuelo: Number.NaN } as unknown as Partial<Parametros>);
  const U = camposTriciclo(Q);
  ok(U.tVia === TRICICLO_DEFECTO.tVia && U.tRuedaDel === TRICICLO_DEFECTO.tRuedaDel && U.tChMat === TRICICLO_DEFECTO.tChMat && U.tSuelo === TRICICLO_DEFECTO.tSuelo, 'un texto donde va un número, una rueda o un material que no existen y un NaN: los de por defecto');
}

// ── the body at the defaults is the Cuadriciclo's
{
  const mb = crearModelo(PARAMETROS_BALA) as ModeloBala, mt = crearModelo(PARAMETROS_TRICICLO) as ModeloTriciclo;
  ok(igual(mb.F.envolvente(), mt.F.envolvente()), `la silueta del Triciclo por defecto es la del Cuadriciclo (${mt.F.envolvente().length} estaciones)`);
  const M = crearMateriales();
  const cuerpo = (g: THREE.Group) => {
    // the body: everything but the wheels, the pods and their arms, the cockpit and the Triciclo's spat
    const o: Record<string, Float32Array[]> = {};
    for (const c of g.children) {
      if (['carenados', 'ruedas', 'cabina', 'faldon'].includes(c.name)) continue;
      c.updateMatrixWorld(true);
      c.traverse(x => { const m = x as THREE.Mesh; if (!m.isMesh) return; (o[m.name] ??= []).push(m.geometry.getAttribute('position').array as Float32Array); });
    }
    return o;
  };
  const a = cuerpo(construirCon(mb.F, { M, cupulaAparte: true, asientos: mb.sillines, aleta: mb.aleta }));
  // built as the viewer builds it: since round three (2026-11-11) with the boot lid apart ('porton', its shut line
  // 'junta-porton'; the skin keeps every vertex, the lid takes its cells, and the fin rides on it unchanged)
  const tri = (m: ModeloTriciclo) => cuerpo(construirCon(m.F, { M, cupulaAparte: true, asientos: m.sillines, aleta: m.aleta, triciclo: { recPil: m.rec.piloto, recPas: m.rec.pasajero, man: m.man, pies: m.pies, faldon: m.faldon, ventanas: m.opcVentanas, maletero: true } }));
  // round two (2026-11-10): the solar roof and the window frames ride on the canopy glass ('panel-solar', 'pilar');
  // everything else, glass included, is still the Cuadriciclo's to the last vertex
  const PORTON = ['porton', 'junta-porton'];
  const NUEVAS = ['panel-solar', 'pilar', ...PORTON];
  const comparar = (b: Record<string, Float32Array[]>, nuevas: string[], texto: string) => {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).filter(k => !nuevas.includes(k)).sort();
    let n = 0; const distintas: string[] = [];
    for (const k of ka) for (let i = 0; i < a[k].length; i++) { n++; const p = a[k][i], q = b[k]?.[i]; if (!q || p.length !== q.length || p.some((v, j) => v !== q[j])) distintas.push(k); }
    const faltan = nuevas.filter(k => !b[k]);
    ok(igual(ka, kb) && !distintas.length && !faltan.length, `${texto}: ${n} mallas (${ka.join(', ')})${nuevas.length ? ` + ${nuevas.join(', ')}` : ''}${distintas.length ? ` · distintas: ${distintas.join(', ')}` : ''}${faltan.length ? ` · faltan: ${faltan.join(', ')}` : ''}`);
  };
  comparar(tri(mt), NUEVAS, 'la carrocería por defecto es la del Cuadriciclo, vértice a vértice, más el techo solar y los montantes');
  const sinNada = crearModelo({ ...PARAMETROS_TRICICLO, tVentanas: 'burbuja', tSolar: 99 }) as ModeloTriciclo;
  comparar(tri(sinNada), PORTON, 'con la cúpula de una pieza y sin techo solar, es la del Cuadriciclo entera, vértice a vértice (más la tapa del maletero)');
}

// ── old designs, against main
const main = process.argv[2];
if (!main) console.log('(sin la carpeta de main: no se comparan los diseños antiguos)');
else {
  const g = await import(`${main}/src/components/aeromovil/geometria.ts`);
  const d = await import(`${main}/src/components/aeromovil/Disenos.tsx`);
  const viejos: [string, Partial<Parametros>][] = [
    ['Gota de antes del 2026-11-06 (sin disposicion)', { B: 2.7, xLm: 1.3, W: 1.2, H: 1.3, puerta: 'gaviota' } as Partial<Parametros>],
    ['Aeromóvil Gota por defecto', PARAMETROS_GOTA], ['Aeromóvil 1 por defecto', PARAMETROS_A1],
    ['Aeromóvil 1 cambiado', { ...PARAMETROS_A1, L: 4.1, viaF: 1.3, kWh: 30, recPil: 45, chasis: 'celosia' }],
    ['Cuadriciclo Bala por defecto', PARAMETROS_BALA], ['Cuadriciclo Bala cambiado', { ...PARAMETROS_BALA, bBatalla: 2.6, bAncho: 0.8, bRuedaLat: '24', bPilY: 0.48 }],
    ['Bala de base del equipo', { disposicion: 'bala' }],
  ];
  const limpio = (r: unknown) => JSON.parse(JSON.stringify(r, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v)));
  // round three (2026-11-11): the Triciclo too. Results are compared without what round three added to them
  // (`maletero`, `ocupantes`) and without the new fields in `P`: everything that existed must be the same number.
  const triciclos: [string, Partial<Parametros>][] = [
    ['Triciclo Bala por defecto', PARAMETROS_TRICICLO], ['Triciclo de base del equipo', { disposicion: 'triciclo' }],
    ['Triciclo cambiado', { ...PARAMETROS_TRICICLO, tSuelo: 0.158, tAncho: 1.0, tBatalla: 2.9, tCupFin: 2.5, tKWh: 20, tRecPas: 20, tRuedaDel: 'c14', tVentanas: 'burbuja' } as Partial<Parametros>],
    ['Triciclo bajo y estrecho', { ...PARAMETROS_TRICICLO, tSuelo: 0.05, tAncho: 0.77, tAlto: 1.2, tPilY: 0.30 } as Partial<Parametros>],
    // (2026-11-12: the «Cuadriciclo Bala clásico» as 0198 left it, before this round's options)
    ['Cuadriciclo Bala clásico (sin las opciones nuevas)', { ...PARAMETROS_TRICICLO, tTraseras: 'dos', tViaTras: 1.8 } as Partial<Parametros>],
    // (round 2: the real one, as saved in production)
    ['Cuadriciclo Bala clásico guardado (el de verdad)', CLASICO_GUARDADO],
    // (round 3 interior: and as it is in production since migration 0209, with round 2's keys)
    ['Cuadriciclo Bala clásico con la 0209 (el de verdad, hoy)', { ...CLASICO_GUARDADO, ...MIGRACION_0209 } as Partial<Parametros>],
  ];
  /** Saved with keys main already has: opened as they are on both sides (the others, as saved before 2026-11-12: `deAntes`). */
  const ACTUALES = ['Cuadriciclo Bala clásico con la 0209 (el de verdad, hoy)'];
  // (2026-11-11: and the «Bala de cuatro ruedas»'s two, which with one rear wheel change nothing)
  // (2026-11-12: and the battery layout, steering wheel, dashboard, doors, mirrors and hatch, all off by default)
  const NUEVOS = ['tAsientos', 'tFila2', 'tFila3', 'tFila2X', 'tFila3X', 'tRecFila', 'tTraseras', 'tViaTras',
    'tBatDisp', 'tBatLargo', 'tBatAncho', 'tBatAlto', 'tBatX', 'tMando', 'tVolX', 'tVolY', 'tVolInc', 'tVolD', 'tSalpicadero', 'tSalpY', 'tSalpFondo',
    'tAcceso', 'tPuertaDel', 'tPuertaTras', 'tUmbral', 'tCintura', 'tBisagraY', 'tBisagraInc', 'tBisagraDentro', 'tPuertaAbre', 'tRetrovisores', 'tMaletero', 'tMalIni', 'tMalAbre', 'tMalLado', 'tSolarCola',
    // round 3 interior (2026-11-12)
    'tChLargo', 'tChSep',
    // round 3 body (2026-11-12): every one of them at its default builds what there was
    'tMorroLinea', 'tMorroAlto', 'tFaro', 'tFaroD', 'tColaPlana', 'tTechoPlano', 'tCaida', 'tConAleta', 'tSolarMorro', 'tPuertas2', 'tPuerta2Parte', 'tBisagra2Y', 'tBisagra2Inc', 'tPuerta2Abre', 'tLineaCupula'];
  const NUEVOS_12 = NUEVOS.slice(8);
  /** The design as it was saved before 2026-11-12: without the keys that did not exist (this module's defaults carry them). */
  const deAntes = (P: Partial<Parametros>) => Object.fromEntries(Object.entries(P).filter(([k]) => !NUEVOS_12.includes(k))) as Partial<Parametros>;
  /** The seat heights as built: a stored height under the old floor opens at that floor (`asientosDeAntes`), which is what main built. */
  const asientosComoMain = (o: Partial<Parametros>, m: { sillines: { yPiloto: number; yPasajero: number }; elevar: number }) => ({ ...o, tPilY: m.sillines.yPiloto - m.elevar, tPasY: m.sillines.yPasajero - m.elevar });
  const sinNuevos = (o: object) => Object.fromEntries(Object.entries(o).filter(([k]) => !NUEVOS.includes(k)));
  /**
   * Round 3 interior (2026-11-12, «revisa el tema de los pesos»): the running gear is now sized for its load, the car
   * wheels re-weighed and the battery bears on the rails, so every number that comes from a mass changes, on purpose.
   * Those are taken out of the comparison and listed («CAMBIA»); everything else must still be the same number.
   */
  const DE_MASA = (c: { nombre: string }) => /^(Vuelco|Bastidor: coeficiente|Neumáticos: carga)/.test(c.nombre);
  const quitarMasas = (r: Record<string, any>) => {
    const t = r.triciclo, o = { masas: r.masas, mVeh: r.mVeh, mTot: r.mTot, piezas: t.piezas, cg: t.cg, vuelco: t.vuelco, bastidor: { ...t.bastidor }, checks: r.comprobaciones.filter(DE_MASA) };
    for (const k of ['masas', 'mVeh', 'mTot', 'Mmax', 'tension', 'seguridad']) delete r[k];
    for (const k of ['piezas', 'cg', 'vuelco']) delete t[k];
    delete t.bastidor.M; delete t.bastidor.tension; delete t.bastidor.seguridad;
    r.comprobaciones = r.comprobaciones.filter((c: { nombre: string }) => !DE_MASA(c));
    return o;
  };
  /** The paths (a.b[2].c) where two results differ. */
  const diferencias = (a: unknown, b: unknown, ruta = ''): string[] => {
    if (JSON.stringify(a) === JSON.stringify(b)) return [];
    if (a && b && typeof a === 'object' && typeof b === 'object') return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap(k => diferencias((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${ruta}.${k}`));
    return [`${ruta} ${JSON.stringify(a)?.slice(0, 40)} → ${JSON.stringify(b)?.slice(0, 40)}`];
  };
  const n1 = (v: number) => v.toFixed(1), n2 = (v: number) => v.toFixed(2);
  const listarMasas = (nombre: string, A: ReturnType<typeof quitarMasas>, B: ReturnType<typeof quitarMasas>) => {
    const l: string[] = [`vacío ${n1(A.mVeh)} → ${n1(B.mVeh)} kg`, `con ocupantes ${n1(A.mTot)} → ${n1(B.mTot)} kg`, `vuelco ${n2(A.vuelco.ssf)} → ${n2(B.vuelco.ssf)} g (piloto solo ${n2(A.vuelco.ssfSolo)} → ${n2(B.vuelco.ssfSolo)})`,
      `reparto delante ${Math.round(A.vuelco.repartoDel * 100)} → ${Math.round(B.vuelco.repartoDel * 100)} %`, `c. de g. ${(A.cg.y * 100).toFixed(1)} → ${(B.cg.y * 100).toFixed(1)} cm de alto`, `largueros ×${n2(A.bastidor.seguridad)} → ×${n2(B.bastidor.seguridad)}`];
    for (const k of new Set([...Object.keys(A.masas), ...Object.keys(B.masas)])) if (Math.abs((A.masas[k] ?? 0) - (B.masas[k] ?? 0)) > 0.005) l.push(`${k} ${n2(A.masas[k] ?? 0)} → ${n2(B.masas[k] ?? 0)} kg`);
    const color = (cs: { nombre: string; holgura: number; minimo: number; mostrar?: string }[]) => Object.fromEntries(cs.map(c => [c.nombre.replace(/con (dos|tres|cuatro|uno) /, 'con N '), `${c.holgura < c.minimo ? 'ROJO' : 'ok'} ${c.mostrar ?? ''}`]));
    const ca = color(A.checks), cb = color(B.checks);
    for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) if (ca[k] !== cb[k]) l.push(`«${k}»: ${ca[k] ?? '(no existía)'} → ${cb[k]}`);
    console.log(`CAMBIA ${nombre} (masas, a propósito):\n        ${l.join('\n        ')}`);
  };
  for (const [nombre, P] of triciclos) {
    // (round 3 interior: both sides open the design as it was saved; before, main got today's PARAMETROS_TRICICLO with
    // `tMando` and this side without it, so «Triciclo bajo y estrecho» failed on main itself: the seats' old floor)
    const actual = ACTUALES.includes(nombre), a = d.deDiseno(actual ? P : deAntes(P)), b = deDiseno(actual ? P : deAntes(P));
    const ma = g.crearModelo(a), mb2 = crearModelo(b) as ModeloTriciclo;
    ok(igual(sinNuevos(asientosComoMain(a, ma)), sinNuevos(asientosComoMain(b, mb2))), `${nombre}: abre con los mismos parámetros que en main (más los campos nuevos, por defecto; los asientos, a la altura a la que se construyen)`);
    const ra = limpio(g.calcular(ma, g.areas(ma))), rb = limpio(calcular(mb2, areas(mb2)));
    listarMasas(nombre, quitarMasas(ra), quitarMasas(rb));
    // (only against a main from before round three: since it merged, main has them too and they must match as well;
    // 2026-11-11, found with the «Bala de cuatro ruedas»: this failed against main itself)
    if (!ra.triciclo.maletero) {
      delete rb.triciclo.maletero; delete rb.triciclo.ocupantes;
      // the boot is a new check at the end of the list
      rb.comprobaciones = rb.comprobaciones.filter((c: { nombre: string }) => !c.nombre.startsWith('Maletero'));
    }
    ok(igual(ra, rb), `${nombre}: mismos resultados que en main, aparte de las masas (área, cabezas, comprobaciones${igual(ra, rb) ? '' : `; distintos: ${diferencias(ra, rb).slice(0, 6).join(', ')}`})`);
  }
  // 2026-11-11 (the «Bala de cuatro ruedas»): with one rear wheel, every mesh of the whole vehicle as on main
  {
    const bm = await import(`${main}/src/components/aeromovil/garaje/balaModelo.ts`);
    const todo = (cons: typeof construirCon, mats: unknown, m: ModeloTriciclo, extra: object) => {
      const gr = cons(m.F, { M: mats as ReturnType<typeof crearMateriales>, cupulaAparte: true, asientos: m.sillines, aleta: m.aleta, triciclo: { recPil: m.rec.piloto, recPas: m.rec.pasajero, man: m.man, pies: m.pies, faldon: m.faldon, ventanas: m.opcVentanas, maletero: true, ...(m.filas ? { filas: m.asientosFilas } : {}), ...extra } });
      gr.updateMatrixWorld(true); const o: string[] = [];
      gr.traverse(x => { const q = x as THREE.Mesh; if (!q.isMesh) return; const p = q.geometry.getAttribute('position'), v = new THREE.Vector3(); let h = 0; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p as THREE.BufferAttribute, i).applyMatrix4(q.matrixWorld); h += v.x * 1.3 + v.y * 2.7 + v.z * 3.1; } o.push(`${q.name}:${p.count}:${h.toFixed(6)}`); });
      return o;
    };
    const gtm = await import(`${main}/src/components/aeromovil/geometriaTriciclo.ts`);
    for (const [nombre, P] of triciclos) {
      const actual = ACTUALES.includes(nombre), ma = g.crearModelo(d.deDiseno(actual ? P : deAntes(P))), mb2 = crearModelo(deDiseno(actual ? P : deAntes(P))) as ModeloTriciclo;
      // (2026-11-12: this side as the viewer builds it now, `opcionesCabinaTriciclo`: the new options at their defaults must draw nothing new)
      // (round 3 interior: and main's side as main's viewer builds it, with its own `opcionesCabinaTriciclo`)
      const a = todo(bm.construirCon, bm.crearMateriales(), ma, gtm.opcionesCabinaTriciclo ? gtm.opcionesCabinaTriciclo(ma) : { traseras: ma.traseras ?? null }), b = todo(construirCon, crearMateriales(), mb2, opcionesCabinaTriciclo(mb2));
      ok(igual(a, b), `${nombre}: todas las mallas del vehículo (${a.length}: carrocería, carenados, ruedas, cabina) iguales que en main, vértice a vértice`);
    }
  }
  for (const [nombre, P] of viejos) {
    const a = d.deDiseno(P), b = deDiseno(P);
    ok(igual(a, b), `${nombre}: abre con los mismos parámetros que en main`);
    const ma = g.crearModelo(g.ajustarCarenado(a)), mb2 = crearModelo(b);
    const ra = limpio(g.calcular(ma, g.areas(ma))), rb = limpio(calcular(mb2, areas(mb2)));
    ok(igual(ra, rb), `${nombre}: mismos resultados que en main (área, Cd, masas, comprobaciones${b.disposicion === 'bala' ? ', cabezas' : ''})`);
  }
}

console.log(fallos ? `\n${fallos} fallos` : '\nTodo OK');
if (fallos) process.exitCode = 1;
