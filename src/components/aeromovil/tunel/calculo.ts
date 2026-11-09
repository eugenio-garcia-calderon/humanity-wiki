import { cuerpoDeEnvolvente, dentro, type Cuerpo, type Envolvente, type Resolucion } from './malla';
import { campoDeVelocidad, resolverFlujo, type Solucion } from './paneles';
import { capaLimite, lineasDeSuperficie, remansoDelantero } from './capaLimite';
import { desgloseCd, type Desglose, type RuedaTunel } from './arrastre';

/**
 * One body through the tunnel: panel solution, boundary layer at the three
 * comparison speeds, drag and lift, critical points, centreline profiles and
 * streamlines. Pure computation (no DOM, no three.js), run in a Web Worker by
 * `cliente.ts` and directly by scripts/tunel-pruebas.ts.
 */

export const VELOCIDADES_TUNEL = [50, 80, 120];
/** Streamline seeds per half (the other half is the mirror image). */
export const LINEAS = { pocas: { ny: 6, nz: 3 }, normal: { ny: 9, nz: 4 }, muchas: { ny: 13, nz: 6 } } as const;
export type CantidadLineas = keyof typeof LINEAS;

export interface PeticionTunel {
  id: string;
  envolvente: Envolvente;
  n: number;
  resolucion: Resolucion;
  lineas: CantidadLineas;
  /** Reference area for Cd (m²): the published one, or the editor's for our design. */
  area: number;
  ruedas: RuedaTunel[];
  /** Front and rear axle x (m), to split the lift. */
  ejes: [number, number];
}

export interface PuntoCritico { p: [number, number, number]; cp: number; tipo: 'remanso' | 'succion'; nombre: string }
export interface Perfil { x: number[]; cp: number[] }

export interface PorVelocidad {
  kmh: number;
  /** Separation, adverse-gradient onset and transition points along the surface streamlines (3·K, z ≥ 0 half, bottom → top). */
  separacion: number[]; adverso: number[]; transicion: number[];
  /** Streamlines that reach the tail without separating. */
  pegadas: number;
  /** Forebody bubbles (3·m). */
  burbujas: number[];
  /** Area enclosed by the separation line (m²) and mean x of the separation. */
  areaBase: number; xSeparacion: number;
  cd: Desglose;
  /** Separation x on the top centreline, side and bottom (for the section chart). */
  sepTecho: number; sepLado: number; sepBajos: number;
  advTecho: number; advLado: number; advBajos: number;
}

export interface ResultadoTunel {
  id: string; clave: string; resolucion: Resolucion; paneles: number;
  ms: { malla: number; matriz: number; resolver: number; velocidades: number; capa: number; lineas: number; total: number };
  /** Skin: nodes of the half mesh (nI+1)·(nJ+1)·3 and Cp at each node. */
  piel: { nI: number; nJ: number; nodos: Float32Array; cp: Float32Array };
  geometria: { xMorro: number; xCola: number; xMax: number; areaMax: number; mojada: number; largo: number; alto: number; ancho: number; yMin: number };
  criticos: PuntoCritico[];
  porVelocidad: PorVelocidad[];
  /** Lift coefficient (positive up) on the reference area, total and per axle. Potential flow with the ground image. */
  cl: number; clDel: number; clTras: number;
  /** Potential-flow pressure drag (should be ≈ 0, d'Alembert): a check on the numerics. */
  cdPotencial: number;
  perfiles: { techo: Perfil; lado: Perfil; bajos: Perfil };
  /** Streamlines (z ≥ 0 seeds): positions 3·m, speed per point, start offsets; `centro` marks lines on z = 0. */
  lineas: { p: Float32Array; v: Float32Array; inicio: Int32Array; centro: Uint8Array };
}

/** A short, stable key for the cache: same silhouette + options → same result. */
export function claveTunel(p: PeticionTunel): string {
  const s = JSON.stringify([p.envolvente.map(e => e.map(v => Math.round(v * 1000))), p.n, p.resolucion, p.lineas, Math.round(p.area * 1000), p.ruedas, p.ejes]);
  let h1 = 0x811c9dc5, h2 = 0x1234567;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519); }
  return `${p.id}:${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}:${p.resolucion}:${p.lineas}`;
}

/** Names a suction peak by where it sits on the body. */
function nombreSuccion(C: Cuerpo, x: number, ny: number, nz: number): string {
  const f = (C.xMorro - x) / C.largo;
  if (ny < -0.55) return f < 0.25 ? 'Succión bajo el morro' : f > 0.7 ? 'Succión bajo la cola' : 'Succión en los bajos';
  if (ny > 0.55) return f < 0.2 ? 'Succión sobre el morro' : f < 0.45 ? 'Succión en el parabrisas' : f < 0.75 ? 'Succión en el techo' : 'Succión en la cola';
  if (Math.abs(nz) > 0.5) return f < 0.25 ? 'Succión en el costado del morro' : f > 0.7 ? 'Succión en el costado de la cola' : 'Succión en el costado';
  return f < 0.25 ? 'Succión en el morro' : 'Succión en la cola';
}

export function calcularTunel(P: PeticionTunel): ResultadoTunel {
  const t0 = performance.now();
  const C = cuerpoDeEnvolvente(P.envolvente, P.n, P.resolucion);
  const M = C.malla, nI = M.nI, nJ = M.nJ, t1 = performance.now();
  const S = resolverFlujo(M, { suelo: true });
  const t2 = performance.now();

  // ---- skin: Cp at the nodes (mean of the panels around each node)
  const W = nJ + 1, cpN = new Float32Array((nI + 1) * W), cuenta = new Float32Array((nI + 1) * W);
  for (let i = 0; i < nI; i++) for (let j = 0; j < nJ; j++) {
    const p = i * nJ + j;
    for (const [di, dj] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const q = (i + di) * W + j + dj; cpN[q] += S.cp[p]; cuenta[q]++; }
  }
  for (let q = 0; q < cpN.length; q++) cpN[q] /= Math.max(1, cuenta[q]);
  // the tips: every node there is the same point, so they share one value (the panels' mean)
  for (const i of [0, nI]) { let s = 0; for (let j = 0; j <= nJ; j++) s += cpN[i * W + j]; for (let j = 0; j <= nJ; j++) cpN[i * W + j] = s / W; }

  // ---- geometry summary
  let yMin = 1e9, alto = 0, ancho = 0;
  for (let q = 0; q < (nI + 1) * W; q++) { yMin = Math.min(yMin, M.nodos[3 * q + 1]); alto = Math.max(alto, M.nodos[3 * q + 1]); ancho = Math.max(ancho, 2 * M.nodos[3 * q + 2]); }

  // ---- forces from the pressure field (both halves)
  let fy = 0, my = 0, fx = 0;
  const xm = (P.ejes[0] + P.ejes[1]) / 2, bat = Math.max(0.3, P.ejes[0] - P.ejes[1]);
  for (let p = 0; p < M.n; p++) {
    const dF = -S.cp[p] * M.area[p] * 2;
    fy += dF * M.nor[3 * p + 1]; fx += dF * M.nor[3 * p]; my += dF * M.nor[3 * p + 1] * (M.c[3 * p] - xm);
  }
  const cl = fy / P.area, clDel = (fy / 2 + my / bat) / P.area, clTras = (fy / 2 - my / bat) / P.area;
  // drag is along −x (the air goes to −x): the force on the body in −x is the drag
  const cdPotencial = -fx / P.area;

  // ---- critical points: stagnation and suction peaks (local minima of panel Cp)
  const criticos: PuntoCritico[] = [];
  const rem = remansoDelantero(C, S);
  criticos.push({ p: [M.c[3 * rem], M.c[3 * rem + 1], M.c[3 * rem + 2]], cp: S.cp[rem], tipo: 'remanso', nombre: 'Punto de remanso' });
  const minimos: number[] = [];
  for (let i = 1; i < nI - 1; i++) for (let j = 0; j < nJ; j++) {
    const p = i * nJ + j, v = S.cp[p];
    if (v > -0.12) continue;
    let es = true;
    for (let di = -2; di <= 2 && es; di++) for (let dj = -2; dj <= 2; dj++) {
      if (!di && !dj) continue;
      const ii = i + di; let jj = j + dj;
      if (ii < 0 || ii >= nI) continue;
      if (jj < 0) jj = -jj - 1; if (jj >= nJ) jj = 2 * nJ - jj - 1; // across the symmetry plane: the mirror panel
      if (S.cp[ii * nJ + jj] < v) { es = false; break; }
    }
    if (es) minimos.push(p);
  }
  minimos.sort((a, b) => S.cp[a] - S.cp[b]);
  const elegidos: number[] = [];
  for (const p of minimos) {
    if (elegidos.length >= 5) break;
    if (elegidos.some(q => Math.hypot(M.c[3 * p] - M.c[3 * q], M.c[3 * p + 1] - M.c[3 * q + 1], M.c[3 * p + 2] - M.c[3 * q + 2]) < 0.35)) continue;
    elegidos.push(p);
  }
  for (const p of elegidos) criticos.push({ p: [M.c[3 * p], M.c[3 * p + 1], M.c[3 * p + 2]], cp: S.cp[p], tipo: 'succion', nombre: nombreSuccion(C, M.c[3 * p], M.nor[3 * p + 1], M.nor[3 * p + 2]) });

  // ---- centreline profiles: top (last column), bottom (first) and the most sideways column at the largest section
  const perfil = (j: number): Perfil => { const x: number[] = [], cp: number[] = []; for (let i = 0; i < nI; i++) { x.push(M.c[3 * (i * nJ + j)]); cp.push(S.cp[i * nJ + j]); } return { x, cp }; };
  let jLado = 0, iMax = 0;
  for (let i = 0; i < nI; i++) if (Math.abs(M.c[3 * i * nJ] - C.xMax) < Math.abs(M.c[3 * iMax * nJ] - C.xMax)) iMax = i;
  for (let j = 0; j < nJ; j++) if (M.nor[3 * (iMax * nJ + j) + 2] > M.nor[3 * (iMax * nJ + jLado) + 2]) jLado = j;
  const perfiles = { techo: perfil(nJ - 1), lado: perfil(jLado), bajos: perfil(0) };

  // ---- boundary layer at each speed
  const t3 = performance.now();
  const { lineas: sup } = lineasDeSuperficie(C, S);
  const K = sup.length, sigmaSuave = 0.6 * C.largo / nI;
  const porVelocidad: PorVelocidad[] = VELOCIDADES_TUNEL.map(kmh => {
    const U = kmh / 3.6, capa = capaLimite(sup, U, C.xMax, sigmaSuave);
    const separacion: number[] = [], adverso: number[] = [], transicion: number[] = [], burbujas: number[] = [];
    let pegadas = 0;
    capa.forEach((r, k) => {
      const L = sup[k], q = (i: number) => [L.p[3 * i], L.p[3 * i + 1], L.p[3 * i + 2]];
      separacion.push(...q(r.iSeparacion)); adverso.push(...q(r.iAdverso));
      transicion.push(...(r.iTransicion >= 0 ? q(r.iTransicion) : [NaN, NaN, NaN]));
      if (r.iBurbuja >= 0) burbujas.push(...q(r.iBurbuja));
      if (r.pegada) pegadas++;
    });
    // Base area: each streamline owns a sector of the section where it separates (½·r²·Δφ around the
    // section's centre, Δφ halfway to its neighbours, the mirror lines closing the ring). A line that
    // stays attached to the tail tip has r ≈ 0 and adds nothing.
    const fi: number[] = [], rr: number[] = [];
    for (let k = 0; k < K; k++) {
      const x = separacion[3 * k], s = C.seccion(x), dy = separacion[3 * k + 1] - s.yc, dz = separacion[3 * k + 2];
      fi.push(Math.atan2(dy, Math.max(0, dz))); rr.push(Math.hypot(dy, dz));
    }
    let areaBase = 0;
    for (let k = 0; k < K; k++) {
      const antes = k > 0 ? fi[k - 1] : -Math.PI - fi[k], despues = k < K - 1 ? fi[k + 1] : Math.PI - fi[k];
      areaBase += 2 * 0.5 * rr[k] * rr[k] * Math.max(0, (despues - antes) / 2); // × 2: both halves
    }
    let xs = 0; for (let k = 0; k < K; k++) xs += separacion[3 * k]; xs /= K;
    const cd = desgloseCd({ U, largo: C.largo, mojada: C.mojada, areaMax: C.areaMax, areaBase, areaRef: P.area, ruedas: P.ruedas });
    // top / side / bottom: the streamline that ends nearest each of them
    const cerca = (pts3: number[], quien: (y: number, z: number) => number) => { let mejor = 0, v = -1e9; for (let k = 0; k < K; k++) { const s = quien(pts3[3 * k + 1], pts3[3 * k + 2]); if (s > v) { v = s; mejor = k; } } return pts3[3 * mejor]; };
    const sec = C.secMax;
    return {
      kmh, separacion, adverso, transicion, pegadas, burbujas, areaBase, xSeparacion: xs, cd,
      sepTecho: sup[K - 1] ? separacion[3 * (K - 1)] : NaN, sepBajos: separacion[0], sepLado: cerca(separacion, (y, z) => z - Math.abs(y - sec.yc)),
      advTecho: adverso[3 * (K - 1)], advBajos: adverso[0], advLado: cerca(adverso, (y, z) => z - Math.abs(y - sec.yc)),
    };
  });
  const t4 = performance.now();

  // ---- streamlines through the computed field (RK4 on arc length)
  const V = campoDeVelocidad(S), lin = LINEAS[P.lineas];
  const sec = C.secMax, techo = alto, bM = ancho / 2;
  const xIni = C.xMorro + 1.2, xFin = C.xCola - 3.2;
  const ps: number[] = [], vs: number[] = [], inicio: number[] = [], centro: number[] = [];
  const v1 = new Float64Array(3), v2 = new Float64Array(3), v3 = new Float64Array(3), v4 = new Float64Array(3);
  const dir = (x: number, y: number, z: number, o: Float64Array) => { V(x, y, z, o); const m = Math.hypot(o[0], o[1], o[2]) || 1e-9; o[0] /= m; o[1] /= m; o[2] /= m; return m; };
  /** Rough distance to the body (m), for the step size. */
  const distancia = (x: number, y: number, z: number) => {
    if (x > C.xMorro) return Math.hypot(x - C.xMorro, y - sec.yc, z) * 0.7;
    if (x < C.xCola) return Math.hypot(C.xCola - x, y - sec.yc, z) * 0.7;
    const s = C.seccion(x);
    if (s.a < 1e-4) return 0.05;
    const r = Math.pow(Math.pow(Math.abs(z) / s.b, C.n) + Math.pow(Math.abs(y - s.yc) / s.a, C.n), 1 / C.n);
    return Math.max(0, (r - 1) * Math.min(s.a, s.b));
  };
  for (let iy = 0; iy < lin.ny; iy++) for (let iz = 0; iz < lin.nz; iz++) {
    let x = xIni, y = 0.05 + (techo + 0.3 - 0.05) * (iy / (lin.ny - 1)), z = iz === 0 ? 0 : (bM + 0.3) * (iz / (lin.nz - 1));
    inicio.push(ps.length / 3); centro.push(iz === 0 ? 1 : 0);
    for (let it = 0; it < 700 && x > xFin; it++) {
      const h = Math.min(0.16, Math.max(0.015, 0.35 * distancia(x, y, z)));
      const m = dir(x, y, z, v1);
      ps.push(x, y, z); vs.push(m);
      dir(x + 0.5 * h * v1[0], y + 0.5 * h * v1[1], z + 0.5 * h * v1[2], v2);
      dir(x + 0.5 * h * v2[0], y + 0.5 * h * v2[1], z + 0.5 * h * v2[2], v3);
      dir(x + h * v3[0], y + h * v3[1], z + h * v3[2], v4);
      x += h / 6 * (v1[0] + 2 * v2[0] + 2 * v3[0] + v4[0]);
      y += h / 6 * (v1[1] + 2 * v2[1] + 2 * v3[1] + v4[1]);
      z += h / 6 * (v1[2] + 2 * v2[2] + 2 * v3[2] + v4[2]);
      if (iz === 0) z = 0; // a line on the symmetry plane stays on it
      y = Math.max(0.005, y);
      if (dentro(C, x, y, z)) {
        // numerical drift into the body: back onto the surface along the section's radius
        const s = C.seccion(x); let lo = 1, hi = 3;
        const fuera = (f: number) => !dentro(C, x, s.yc + (y - s.yc) * f, z * f, 1.0);
        if (Math.hypot(y - s.yc, z) < 1e-6) y += 1e-3;
        for (let k = 0; k < 20; k++) { const mm = (lo + hi) / 2; if (fuera(mm)) hi = mm; else lo = mm; }
        y = s.yc + (y - s.yc) * hi * 1.01; z *= hi * 1.01;
      }
    }
  }
  const t5 = performance.now();

  return {
    id: P.id, clave: claveTunel(P), resolucion: P.resolucion, paneles: M.n * 2,
    ms: { malla: t1 - t0, matriz: S.ms.matriz, resolver: S.ms.resolver, velocidades: S.ms.velocidades, capa: t4 - t3, lineas: t5 - t4, total: t5 - t0 },
    piel: { nI, nJ, nodos: Float32Array.from(M.nodos), cp: cpN },
    geometria: { xMorro: C.xMorro, xCola: C.xCola, xMax: C.xMax, areaMax: C.areaMax, mojada: C.mojada, largo: C.largo, alto, ancho, yMin },
    criticos, porVelocidad, cl, clDel, clTras, cdPotencial, perfiles,
    lineas: { p: Float32Array.from(ps), v: Float32Array.from(vs), inicio: Int32Array.from(inicio), centro: Uint8Array.from(centro) },
  };
}

/** Only for the checks: the raw objects. */
export function _interno(P: PeticionTunel): { C: Cuerpo; S: Solucion } {
  const C = cuerpoDeEnvolvente(P.envolvente, P.n, P.resolucion);
  return { C, S: resolverFlujo(C.malla, { suelo: true }) };
}
