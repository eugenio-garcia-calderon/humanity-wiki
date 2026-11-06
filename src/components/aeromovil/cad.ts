// ============================================================================
// AEROMÓVIL 1 · geometría lista para CadQuery (2026-11-06)
// ============================================================================
// El Aeromóvil Gota tiene su geometría copiada a mano en `aeromovil_cad.py`.
// Para el Aeromóvil 1 no se copia nada: el visor exporta la geometría ya
// calculada (parches de piel como rejillas de puntos, tubos, ruedas, cajas,
// asientos y maniquíes) y `public/aeromovil/aeromovil_1_cad.py` la convierte
// en STEP tal cual. Una sola fuente de verdad: lo que ves es lo que se exporta.
//
// Unidades: metros, ejes del visor (x delante, y arriba, z izquierda). El
// script pasa a milímetros y a Z arriba.
import { contornoSeccion, enZona, type Modelo, type P3, type Piel, type Superficie } from './geometria';
import { suspensionA1 } from './geometriaA1';

export interface ParcheCAD { nombre: string; capa: string; piel: Piel; puerta: string; rejilla: P3[][] }

const CAPA_DE: Record<Piel, string> = { carroceria: 'Carroceria', bajos: 'Carroceria', cristal: 'Cristales', solar: 'Paneles solares', hueco: '' };
const unicos = (v: number[]) => { v.sort((a, b) => a - b); const o: number[] = []; for (const x of v) if (!o.length || x - o[o.length - 1] > 1e-5) o.push(x); return o; };

/**
 * Los parches de una superficie: la rejilla (u, θ) se parte por los bordes de
 * zonas y puertas, cada celda se clasifica por su centro (como en el visor) y
 * después se funden las celdas vecinas de la misma pieza, primero a lo largo
 * de θ y luego de u, para que el CAD reciba pocas caras grandes.
 */
export function parchesDe(S: Superficie): ParcheCAD[] {
  const T = S.tMax, cerrada = T > 1.5 * Math.PI;
  const us = [S.u0, S.u1], ts = [0, T];
  const meterT = (t: number) => ts.push(cerrada ? ((t % T) + T) % T : Math.min(T, Math.max(0, t)));
  for (const z of [...S.zonas, ...S.puertas]) {
    for (const u of [z.u0, z.u1]) if (u > S.u0 && u < S.u1) us.push(u);
    for (const t of [z.t0, z.t1]) meterT(t);
    if (z.elipse) {
      for (let k = 1; k < 24; k++) { const u = z.u0 + (z.u1 - z.u0) * k / 24; if (u > S.u0 && u < S.u1) us.push(u); }
      for (let k = 1; k < 16; k++) meterT(z.t0 + (z.t1 - z.t0) * k / 16);
    }
  }
  const U = unicos(us), TH = unicos(ts);
  // La clave de cada celda: qué pieza es (la banda negra es carrocería en el CAD).
  type Celda = { clave: string; piel: Piel; puerta: string; nombre: string } | null;
  const celdas: Celda[][] = [];
  for (let i = 0; i < U.length - 1; i++) {
    const fila: Celda[] = [];
    for (let j = 0; j < TH.length - 1; j++) {
      const uc = (U[i] + U[i + 1]) / 2, tc = (TH[j] + TH[j + 1]) / 2;
      const zona = S.zonas.find(z => enZona(z, uc, tc));
      let piel: Piel = zona ? zona.piel : S.pielBase;
      if (piel === 'hueco') { fila.push(null); continue; }
      if (piel === 'bajos') piel = 'carroceria';
      const puerta = S.puertas.find(z => enZona(z, uc, tc));
      const base = piel === 'solar' ? (zona?.nombre ?? 'Paneles solares') : S.id === 'cupula' ? 'Cúpula' : 'Carrocería';
      const nombre = `${puerta ? puerta.nombre + ' · ' : ''}${base}`;
      fila.push({ clave: `${puerta?.id ?? 'fijo'}|${piel}|${base}`, piel, puerta: puerta?.id ?? 'fijo', nombre });
    }
    celdas.push(fila);
  }
  // Fundir a lo largo de θ: tramos [j0, j1) de la misma clave en cada fila.
  type Tramo = { j0: number; j1: number; c: NonNullable<Celda> };
  const tramos: Tramo[][] = celdas.map(fila => {
    const o: Tramo[] = [];
    for (let j = 0; j < fila.length; j++) {
      const c = fila[j]; if (!c) continue;
      const ult = o[o.length - 1];
      if (ult && ult.j1 === j && ult.c.clave === c.clave) ult.j1 = j + 1; else o.push({ j0: j, j1: j + 1, c });
    }
    return o;
  });
  // Fundir a lo largo de u: tramos iguales en filas consecutivas.
  const out: ParcheCAD[] = [];
  const usado = tramos.map(f => f.map(() => false));
  const cuenta = new Map<string, number>();
  for (let i = 0; i < tramos.length; i++) for (let k = 0; k < tramos[i].length; k++) {
    if (usado[i][k]) continue;
    const t = tramos[i][k]; let i1 = i + 1;
    while (i1 < tramos.length) {
      const q = tramos[i1].findIndex((r, kk) => !usado[i1][kk] && r.j0 === t.j0 && r.j1 === t.j1 && r.c.clave === t.c.clave);
      if (q < 0) break; usado[i1][q] = true; i1++;
    }
    usado[i][k] = true;
    const u0 = U[i], u1 = U[i1], t0 = TH[t.j0], t1 = TH[t.j1];
    const nu = Math.max(2, Math.min(60, Math.round((u1 - u0) * 110))), nv = Math.max(2, Math.min(48, Math.round((t1 - t0) / T * (cerrada ? 72 : 36))));
    const rejilla: P3[][] = [];
    for (let a = 0; a <= nu; a++) {
      // En las puntas (u = 0 y 1) la sección es un punto: se para un pelo antes.
      const u = Math.min(0.999, Math.max(0.001, u0 + (u1 - u0) * a / nu)), f = S.frame(u), fila: P3[] = [];
      for (let b = 0; b <= nv; b++) fila.push(S.sec(f, t0 + (t1 - t0) * b / nv));
      rejilla.push(fila);
    }
    const n = (cuenta.get(t.c.nombre) ?? 0) + 1; cuenta.set(t.c.nombre, n);
    out.push({ nombre: `${t.c.nombre} ${n}`, capa: CAPA_DE[t.c.piel], piel: t.c.piel, puerta: t.c.puerta, rejilla });
  }
  return out;
}

/** Todo lo que el script necesita para construir el STEP. */
export function datosCAD(m: Modelo) {
  const P = m.P;
  const parches = m.superficies.flatMap(parchesDe);
  const tubos = m.tubosChasis().map(t => ({ nombre: t.nombre, grupo: t.grupo, a: t.a, b: t.b, d: t.d, pared: t.pared, comprado: !!t.comprado, curva: t.curva ?? null }));
  const ruedas = m.ruedas.map((r, i) => ({ nombre: r.nombre, x: r.x, y: r.r, z: r.z, r: r.r, w: r.w, disco: m.tipo === 'a1' ? suspensionA1(m, i, 0).disco : 0.16, coche: m.tipo === 'a1' }));
  const asientos = m.asientos.map(a => ({ ...a, piezas: m.asientoPiezas(a.piloto) }));
  const ocupantes = m.asientos.map(a => {
    const o = m.occPts(a.piloto), lat = a.lat, d = o.d;
    const lo = (t: number): P3 => [o.H[0] + d[0] * t, o.H[1] + d[1] * t, lat];
    const dh = o.dh ?? d, zr = o.anchoPiernas?.[0] ?? 0.09, zp = o.anchoPiernas?.[1] ?? 0.11;
    const seg: { a: P3; b: P3; r: number }[] = [
      { a: lo(-0.02), b: lo(0.10), r: 0.12 }, { a: lo(0.12), b: lo(0.30), r: 0.12 }, { a: lo(0.30), b: lo(0.47), r: 0.13 }, { a: lo(0.50), b: [o.C[0] - dh[0] * 0.08, o.C[1] - dh[1] * 0.08, lat], r: 0.045 },
    ];
    for (const s of [-1, 1]) {
      seg.push({ a: [o.H[0], o.H[1], lat + s * zr], b: [o.K[0], o.K[1], lat + s * (zr + zp) / 2], r: 0.068 });
      seg.push({ a: [o.K[0], o.K[1], lat + s * (zr + zp) / 2], b: [o.F[0], o.F[1], lat + s * zp], r: 0.052 });
      const hom: P3 = [o.H[0] + d[0] * 0.46, o.H[1] + d[1] * 0.46, lat + s * 0.19], mano: P3 = [o.mano[0], o.mano[1], lat + s * o.anchoMano];
      const codo: P3 = [(hom[0] + mano[0]) / 2, (hom[1] + mano[1]) / 2 - 0.08, (hom[2] + mano[2]) / 2 + s * 0.05];
      seg.push({ a: hom, b: codo, r: 0.046 }, { a: codo, b: mano, r: 0.038 });
    }
    return { nombre: a.piloto ? 'Piloto' : 'Pasajero', segmentos: seg, cabeza: { c: [o.C[0], o.C[1], lat] as P3, r: 0.10 } };
  });
  const cajas: { nombre: string; capa: string; c: P3; s: P3 }[] = [];
  const cilindros: { nombre: string; capa: string; c: P3; r: number; largo: number; eje: 'x' | 'y' | 'z' }[] = [];
  const toros: { nombre: string; capa: string; c: P3; R: number; r: number; eje: P3 }[] = [];
  if (m.tipo === 'a1') {
    for (const b of m.baterias) cajas.push({ nombre: b.nombre, capa: 'Baterias', c: [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0], s: [b.x1 - b.x0, b.y1 - b.y0, 2 * b.hz] });
    cilindros.push({ nombre: 'Motor', capa: 'Motor', c: m.motor.c, r: m.motor.r, largo: m.motor.largo, eje: 'z' });
    cajas.push({ nombre: 'Inversor', capa: 'Motor', c: m.inversor.c, s: m.inversor.s });
    cajas.push({ nombre: 'Cargador', capa: 'Motor', c: m.cargador.c, s: m.cargador.s });
    cajas.push({ nombre: 'Reductora con diferencial', capa: 'Transmision', c: m.reductora.c, s: m.reductora.s });
    cajas.push({ nombre: 'Cremallera', capa: 'Direccion', c: m.cremallera, s: [0.07, 0.07, 0.16] });
    const v = m.volante, inc = v.inclinacion;
    toros.push({ nombre: 'Volante', capa: 'Direccion', c: [v.c[0], v.c[1], 0], R: v.r, r: 0.016, eje: [Math.cos(inc), Math.sin(inc), 0] });
    cajas.push({ nombre: 'Reposapiés', capa: 'Chasis', c: [m.reposapies[0] + 0.05, m.reposapies[1] + 0.06, 0], s: [0.03, 0.22, 0.36] });
    for (let i = 0; i < 4; i++) {
      const q = suspensionA1(m, i, 0), r = m.ruedas[i];
      tubos.push({ nombre: `Mangueta ${r.nombre.replace('Rueda ', '')}`, grupo: 'Suspensión', a: q.rotula, b: q.arriba, d: 0.034, pared: 0, comprado: true, curva: null });
      tubos.push({ nombre: `Buje ${r.nombre.replace('Rueda ', '')}`, grupo: 'Suspensión', a: [r.x, r.r, q.s * (Math.abs(r.z) - 0.07)], b: [r.x, r.r, q.s * (Math.abs(r.z) - 0.02)], d: 0.03, pared: 0, comprado: true, curva: null });
    }
  } else {
    const by = P.clear + 0.055;
    for (const [x0, z0] of [[m.xPil - 0.05, 0.045], [m.xPil - 0.05, -0.145], [m.xPas, 0.17], [m.xPas, -0.27]]) cajas.push({ nombre: 'Batería', capa: 'Baterias', c: [x0 + 0.185, by, z0 + 0.05], s: [0.37, 0.08, 0.10] });
  }
  // Cuadernas de control: el contorno de la carrocería cada 10 cm, por si el CAD prefiere loftear.
  const cuadernas: { x: number; puntos: [number, number][] }[] = [];
  for (let d = 0.10; d < m.Lf - 0.05; d += 0.10) cuadernas.push({ x: m.xn - d, puntos: contornoSeccion(m, d / m.Lf, 64) });
  return {
    version: 1, tipo: m.tipo, nombre: m.tipo === 'a1' ? 'Aeromovil_1' : 'Aeromovil_Gota', unidades: 'm',
    medidas: { L: m.Lf, W: P.W, H: P.H, B: P.B, clear: P.clear },
    espesores: { carroceria: P.espCarenado / 1000, cristal: P.espCristal / 1000, solar: 0.003 },
    parches, tubos, ruedas, asientos, ocupantes, cajas, cilindros, toros, cuadernas,
  };
}

/** El JSON que se descarga: números a 0,1 mm para que pese poco. */
export const jsonCAD = (m: Modelo) => JSON.stringify(datosCAD(m), (_k, v) => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v));
