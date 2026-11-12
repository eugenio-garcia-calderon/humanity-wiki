/**
 * Checks for the wind tunnel's panel method (src/components/aeromovil/tunel/).
 * Run with: npx tsx scripts/tunel-pruebas.ts
 *
 *  1. Sphere in free stream: Cp = 1 − (9/4)·sin²θ.
 *  2. Prolate spheroid (4:1) in axial flow: surface speed = (1 + k₁)·sin(angle to the stream).
 *  3. Ground image: the flow of a body over the road is symmetric about y = 0.
 *  4. Calibration table: estimate vs published Cd for the garage cars.
 */
import { mallaElipsoide } from '../src/components/aeromovil/tunel/malla';
import { resolverFlujo, campoDeVelocidad } from '../src/components/aeromovil/tunel/paneles';
import { calcularTunel } from '../src/components/aeromovil/tunel/calculo';
import { CONSTANTES, EXPOSICION, RUEDAS_GARAJE } from '../src/components/aeromovil/tunel/arrastre';
import { CALIBRACION } from '../src/components/aeromovil/tunel/calibracion';
import { cuerpoAeromovil, peticionDe } from '../src/components/aeromovil/tunel/cuerpos';
import { VEHICULOS_GARAJE } from '../src/components/aeromovil/garaje';
import { PARAMETROS_A1, PARAMETROS_BALA, PARAMETROS_GOTA, PARAMETROS_TRICICLO, ajustarCarenado, areas, calcular, crearModelo } from '../src/components/aeromovil/geometria';
import { cuerpoGaraje } from '../src/components/aeromovil/tunel/cuerpos';

let fallos = 0;
const ok = (cond: boolean, msg: string) => { console.log(`${cond ? 'OK   ' : 'FALLA'} ${msg}`); if (!cond) fallos++; };

// ---- 1. sphere
for (const [nI, nJ] of [[24, 12], [40, 16]]) {
  const M = mallaElipsoide(1, 1, 0, nI, nJ);
  const S = resolverFlujo(M, { suelo: false });
  let maxErr = 0, rms = 0;
  for (let p = 0; p < M.n; p++) {
    const x = M.c[3 * p], y = M.c[3 * p + 1], z = M.c[3 * p + 2], r = Math.hypot(x, y, z);
    const s2 = 1 - (x / r) ** 2, cpA = 1 - 2.25 * s2, e = Math.abs(S.cp[p] - cpA);
    maxErr = Math.max(maxErr, e); rms += e * e;
  }
  rms = Math.sqrt(rms / M.n);
  ok(maxErr < 0.05, `esfera ${nI}×${nJ} (${M.n} paneles por mitad): error máx. de Cp ${maxErr.toFixed(4)}, rms ${rms.toFixed(4)} (${(S.ms.matriz + S.ms.resolver + S.ms.velocidades).toFixed(0)} ms)`);
}

// ---- 2. prolate spheroid, a/b = 4
{
  const a = 2, b = 0.5, e = Math.sqrt(1 - (b / a) ** 2);
  const al0 = (2 * (1 - e * e) / e ** 3) * (0.5 * Math.log((1 + e) / (1 - e)) - e), k1 = al0 / (2 - al0);
  const M = mallaElipsoide(a, b, 0, 40, 16);
  const S = resolverFlujo(M, { suelo: false });
  let maxErr = 0, rms = 0, n = 0;
  for (let p = 0; p < M.n; p++) {
    const nx = M.nor[3 * p], vA = (1 + k1) * Math.sqrt(Math.max(0, 1 - nx * nx));
    const v = Math.hypot(S.vel[3 * p], S.vel[3 * p + 1], S.vel[3 * p + 2]), err = Math.abs(v - vA);
    maxErr = Math.max(maxErr, err); rms += err * err; n++;
  }
  rms = Math.sqrt(rms / n);
  ok(maxErr < 0.05, `elipsoide 4:1: velocidad en la superficie, error máx. ${maxErr.toFixed(4)}, rms ${rms.toFixed(4)} (analítica: 1 + k₁ = ${(1 + k1).toFixed(4)})`);
}

// ---- 3. ground image
{
  const M = mallaElipsoide(1.5, 0.5, 0.75, 32, 12);
  const S = resolverFlujo(M, { suelo: true }), V = campoDeVelocidad(S), a = new Float64Array(3), b = new Float64Array(3);
  let asim = 0, vySuelo = 0;
  for (const [x, y, z] of [[2, 0.3, 0.2], [0, 0.1, 0.6], [-1.7, 0.4, 0.1], [0.5, 1.4, 0.3], [-0.5, 0.05, 0]]) {
    V(x, y, z, a); V(x, -y, z, b);
    asim = Math.max(asim, Math.abs(a[0] - b[0]), Math.abs(a[1] + b[1]), Math.abs(a[2] - b[2]));
    V(x, 0, z, a); vySuelo = Math.max(vySuelo, Math.abs(a[1]));
  }
  ok(asim < 1e-9 && vySuelo < 1e-9, `imagen del suelo: asimetría ${asim.toExponential(1)}, velocidad vertical en el suelo ${vySuelo.toExponential(1)}`);
  // and the ground pulls: under the body the air is faster than over a lone body
  const S0 = resolverFlujo(M, { suelo: false });
  const abajo = (s: typeof S) => { let m = 1e9; for (let p = 0; p < M.n; p++) if (M.nor[3 * p + 1] < -0.9) m = Math.min(m, s.cp[p]); return m; };
  ok(abajo(S) < abajo(S0), `con suelo, Cp mínimo bajo el cuerpo ${abajo(S).toFixed(3)} frente a ${abajo(S0).toFixed(3)} sin suelo (el aire se acelera entre el cuerpo y la carretera)`);
}

// ---- 4. calibration against the published Cd
{
  console.log('\nCalibración (resolución media, 80 km/h):');
  const filas = VEHICULOS_GARAJE.filter(v => v.aero && v.envolvente && RUEDAS_GARAJE[v.id]).map(v => {
    const R = calcularTunel({ id: v.id, envolvente: v.envolvente!, n: v.seccion ?? 3, resolucion: 'media', lineas: 'pocas', area: v.aero!.area, ruedas: RUEDAS_GARAJE[v.id].ruedas, ejes: [0, -v.batalla] });
    const q = R.porVelocidad[1], A = v.aero!.area;
    // the drag model is linear in the three constants: Cd = base + K_BASE·b + K_RUEDA·r + DCD
    const r = RUEDAS_GARAJE[v.id].ruedas.reduce((s, w) => s + w.d * w.w * EXPOSICION[w.tipo], 0) / A;
    return { id: v.id, nombre: v.nombre, pub: v.aero!.cd, base: q.cd.friccion + q.cd.forma, b: q.areaBase / A, r, est: q.cd.total, ms: R.ms.total, cerrado: v.id !== 'twizy' };
  });
  // Fit DCD_DETALLES on the closed cars, least squares on the relative error. K_BASE and K_RUEDA stay at
  // their literature values: fitting K_BASE too drives it to the edge of its range (shown below for the record).
  const ajustar = (usar: typeof filas, tambienBase = false) => {
    let mejor = { kb: CONSTANTES.K_BASE, dd: 0, e: Infinity };
    for (let kb = tambienBase ? 0.05 : CONSTANTES.K_BASE; kb <= (tambienBase ? 0.6001 : CONSTANTES.K_BASE); kb += 0.005) for (let dd = 0; dd <= 0.1; dd += 0.0005) {
      let e = 0; for (const f of usar) e += ((f.base + kb * f.b + CONSTANTES.K_RUEDA * f.r + dd - f.pub) / f.pub) ** 2;
      if (e < mejor.e) mejor = { kb, dd, e };
    }
    return mejor;
  };
  const cerrados = filas.filter(f => f.cerrado), aj = ajustar(cerrados), aj2 = ajustar(cerrados, true);
  console.log(`  ajuste (coches cerrados, K_BASE = ${CONSTANTES.K_BASE} y K_RUEDA = ${CONSTANTES.K_RUEDA} fijas): DCD_DETALLES = ${aj.dd.toFixed(4)}  ·  en arrastre.ts: ${CONSTANTES.DCD_DETALLES}`);
  console.log(`  (si también se ajustara K_BASE: K_BASE = ${aj2.kb.toFixed(3)}, DCD_DETALLES = ${aj2.dd.toFixed(4)}; no se usa)`);
  ok(Math.abs(aj.dd - CONSTANTES.DCD_DETALLES) < 0.0011, 'la constante de arrastre.ts es la del ajuste');
  console.log('  coche                              publicado  estimado  error   sin ese coche en el ajuste');
  const loo: number[] = [];
  for (const f of filas) {
    const otros = cerrados.filter(g => g.id !== f.id), a2 = ajustar(otros);
    const est2 = f.base + a2.kb * f.b + CONSTANTES.K_RUEDA * f.r + a2.dd, e2 = (est2 - f.pub) / f.pub;
    if (f.cerrado) loo.push(e2);
    const e = (f.est - f.pub) / f.pub;
    console.log(`  ${f.nombre.padEnd(34)} ${f.pub.toFixed(3).padStart(8)}  ${f.est.toFixed(3).padStart(8)}  ${(e * 100).toFixed(0).padStart(4)} %   ${est2.toFixed(3)} (${(e2 * 100).toFixed(0)} %)${f.cerrado ? '' : '  ← abierto por los lados, fuera del ajuste'}   [${f.ms.toFixed(0)} ms]`);
  }
  const rms = Math.sqrt(loo.reduce((s, e) => s + e * e, 0) / loo.length);
  console.log(`  banda (error medio cuadrático dejando cada coche cerrado fuera del ajuste): ±${(rms * 100).toFixed(0)} %  ·  en calibracion.ts: ±${(CALIBRACION.banda * 100).toFixed(0)} %`);
  ok(Math.abs(rms - CALIBRACION.banda) < 0.011, 'la banda de calibracion.ts es la de esta prueba');
  for (const f of filas) {
    const g = CALIBRACION.coches.find(c => c.id === f.id);
    const sinEl = f.cerrado ? (() => { const a2 = ajustar(cerrados.filter(x => x.id !== f.id)); return f.base + a2.kb * f.b + CONSTANTES.K_RUEDA * f.r + a2.dd; })() : f.est;
    ok(!!g && Math.abs(g.estimado - f.est) < 0.002 && Math.abs(g.sinEl - sinEl) < 0.002 && g.publicado === f.pub, `${f.id}: la tabla guardada (${g?.estimado.toFixed(3)}, sin él ${g?.sinEl.toFixed(3)}) coincide con el cálculo (${f.est.toFixed(3)}, ${sinEl.toFixed(3)})`);
  }
  // our design, the four vehicles (the Bala and the Triciclo have no editor formula: their only Cd is the tunnel's)
  // (2026-11-11: and the «Bala de cuatro ruedas», the Triciclo with two rear wheels in pods)
  for (const P0 of [PARAMETROS_A1, PARAMETROS_GOTA, PARAMETROS_BALA, PARAMETROS_TRICICLO, { ...PARAMETROS_TRICICLO, tTraseras: 'dos' } as typeof PARAMETROS_TRICICLO]) {
    const m = crearModelo(ajustarCarenado(P0)), res = calcular(m, areas(m));
    const c = cuerpoAeromovil(m, res.A), nombre = m.tipo === 'a1' ? 'Aeromóvil 1' : m.tipo === 'bala' ? 'Cuadriciclo Bala' : m.tipo === 'triciclo' ? (m.cuatro ? 'Bala de cuatro ruedas' : 'Triciclo Bala') : 'Aeromóvil Gota';
    for (const resol of ['baja', 'media', 'alta'] as const) {
      const R = calcularTunel({ ...peticionDe(c, resol, 'normal') });
      const q = R.porVelocidad[1];
      console.log(`  ${nombre} (${resol}, ${R.paneles} paneles, ${R.ms.total.toFixed(0)} ms): Cd túnel ${q.cd.total.toFixed(3)} (${(q.cd.total * (1 - CALIBRACION.banda)).toFixed(3)}–${(q.cd.total * (1 + CALIBRACION.banda)).toFixed(3)}) · ${Number.isFinite(res.Cd) ? `fórmula del editor ${res.Cd.toFixed(3)}` : 'sin fórmula del editor'} · Cl ${R.cl.toFixed(2)} (del. ${R.clDel.toFixed(2)}, tras. ${R.clTras.toFixed(2)}) · Cd potencial ${R.cdPotencial.toFixed(3)}`);
    }
    if (m.tipo === 'bala') {
      // the editor's default Bala is the garage's Bala: the same body goes through the tunnel
      const g = cuerpoGaraje({ id: 'bala', x: 0, z: 0 })!;
      ok(JSON.stringify(g.envolvente) === JSON.stringify(c.envolvente) && g.area === c.area && g.n === c.n && JSON.stringify(g.ruedas) === JSON.stringify(c.ruedas),
        `el Bala del editor por defecto entra en el túnel igual que el del garaje (silueta, sección ${c.n}, área ${c.area.toFixed(3)} m², ruedas)`);
    }
    if (m.tipo === 'triciclo') {
      // the Triciclo's body is the Cuadriciclo's: the same silhouette and area; its own three wheels, front axle and rear axle
      const g = cuerpoGaraje({ id: 'bala', x: 0, z: 0 })!;
      ok(JSON.stringify(g.envolvente) === JSON.stringify(c.envolvente) && g.area === c.area && g.n === c.n,
        `el Triciclo por defecto entra en el túnel con la silueta y el área del Cuadriciclo (${c.area.toFixed(3)} m²)`);
      if (m.cuatro) ok(c.ruedas.length === 4 && c.ruedas.every(r => r.tipo === 'carenado') && Math.abs(c.ejes[0] - m.xF) < 1e-9 && Math.abs(c.ejes[1] - m.xR) < 1e-9,
        `la Bala de cuatro ruedas lleva las cuatro carenadas (eje delantero en x = ${m.xF.toFixed(2)}, trasero en x = ${m.xR.toFixed(2)})`);
      else ok(c.ruedas.length === 3 && c.ruedas.filter(r => r.tipo === 'carenado').length === 2 && Math.abs(c.ejes[0] - m.xF) < 1e-9 && Math.abs(c.ejes[1] - m.xR) < 1e-9,
        `el Triciclo lleva tres ruedas (dos carenadas delante, eje en x = ${m.xF.toFixed(2)}; una dentro detrás, en x = ${m.xR.toFixed(2)})`);
      // its results use the numbers-only run (in the background): it must give the Cd of the full run
      for (const resol of ['baja', 'media'] as const) {
        const a = calcularTunel({ ...peticionDe(c, resol, 'pocas'), soloNumeros: true }), b = calcularTunel({ ...peticionDe(c, resol, 'normal') });
        ok(a.porVelocidad.every((q, i) => Math.abs(q.cd.total - b.porVelocidad[i].cd.total) < 1e-9),
          `Triciclo (${resol}): el cálculo solo de cifras da el mismo Cd que el completo (${a.porVelocidad.map(q => q.cd.total.toFixed(3)).join(' / ')} a 50/80/120 km/h)`);
      }
    }
  }
}

if (fallos) { console.log(`\n${fallos} comprobación(es) fallida(s)`); process.exitCode = 1; }
