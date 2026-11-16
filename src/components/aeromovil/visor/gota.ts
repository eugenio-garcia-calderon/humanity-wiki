// Aeromóvil Gota: the skin surface, accessories, fixed parts and the leaning moving part.
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import { ARM_UP, CELULA, TRAVEL_F, TRAVEL_R, enZona, tramosTubo, type ModeloGota, type ModeloConPiel, type Piel, type Superficie } from '../geometria';
import type { CapaId, V3 } from './capas';
import type { Mats } from './materiales';
import { tube, sphere, box, disk, vaciar, tuboCurvo, desplazar, etiquetar } from './primitivas';
import { rueda, asiento, ocupante } from './ocupante';
import { accesoriosA1, construirFijoA1 } from './a1';

export const rot = (p: [number, number], c: [number, number], a: number): [number, number] => {
  const cs = Math.cos(a), sn = Math.sin(a), dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
};

export const unicos = (v: number[]) => { v.sort((a, b) => a - b); const o: number[] = []; for (const x of v) if (!o.length || x - o[o.length - 1] > 1e-4) o.push(x); return o; };

/** Una superficie de piel: una rejilla (u, θ) que respeta los bordes de cristales, paneles, puertas y huecos. */
export function construirSuperficie(S: Superficie) {
  const T = S.tMax, cerrada = T > Math.PI * 1.5;
  const us: number[] = [], ts: number[] = [];
  const nU = 160, nT = cerrada ? 112 : 56;
  for (let i = 0; i <= nU; i++) us.push(S.u0 + (S.u1 - S.u0) * (1 - Math.cos(Math.PI * i / nU)) / 2);
  for (let j = 0; j <= nT; j++) ts.push(T * j / nT);
  const enRango = (u: number) => u >= S.u0 - 1e-9 && u <= S.u1 + 1e-9;
  for (const z of [...S.zonas, ...S.puertas]) {
    if (enRango(z.u0)) us.push(z.u0); if (enRango(z.u1)) us.push(z.u1);
    for (const t of [z.t0, z.t1]) { const tt = cerrada ? ((t % T) + T) % T : Math.min(T, Math.max(0, t)); ts.push(tt); }
    // Un arco elíptico se recorta celda a celda: más celdas dentro de su
    // rectángulo para que apenas se vean los dientes.
    if (z.elipse) {
      for (let k = 1; k < 28; k++) { const u = z.u0 + (z.u1 - z.u0) * k / 28; if (enRango(u)) us.push(u); }
      for (let k = 1; k < 20; k++) { const t = z.t0 + (z.t1 - z.t0) * k / 20; ts.push(cerrada ? ((t % T) + T) % T : Math.min(T, Math.max(0, t))); }
    }
    // El montante inclinado del parabrisas: filas y columnas finas en su rectángulo, y el marco tapa el resto.
    if (z.tDe && 'piel' in z && (z.piel === 'cristal' || z.piel === 'marco' || z.piel === 'hueco')) {
      for (let k = 1; k < 36; k++) { const u = z.u0 + (z.u1 - z.u0) * k / 36; if (enRango(u)) us.push(u); }
      for (let k = 1; k < 12; k++) ts.push(z.t0 + (z.t1 - z.t0) * k / 12);
    }
  }
  // Un borde que varía a lo largo (la banda negra en V) no se recorta: la
  // rejilla se deforma fila a fila para que ese borde caiga justo en dos
  // columnas de la malla, y así queda una línea limpia y no una escalera.
  const banda = S.zonas.find(z => z.tDe && z.piel === 'bajos');
  let medL = 0, medR = 0;
  if (banda) {
    for (let k = 0; k <= 20; k++) { const [a, b] = banda.tDe!(banda.u0 + (banda.u1 - banda.u0) * k / 20); medL += a / 21; medR += b / 21; }
    ts.push(medL, medR);
    for (let k = 1; k < 90; k++) { const u = banda.u0 + (banda.u1 - banda.u0) * k / 90; if (enRango(u)) us.push(u); }
  }
  const U = unicos(us), TH = unicos(ts.map(t => (t >= T - 1e-6 ? T : t)));
  if (TH[TH.length - 1] < T) TH.push(T);
  const nu = U.length, nv = TH.length;
  const cerca = (t: number) => { let j = 0; for (let k = 1; k < nv; k++) if (Math.abs(TH[k] - t) < Math.abs(TH[j] - t)) j = k; return j; };
  const jL = banda ? cerca(medL) : -1, jR = banda ? cerca(medR) : -1;
  const real = (i: number, t: number) => {
    if (!banda || jL < 1 || jR <= jL || jR >= nv - 1) return t;
    const u = U[i]; if (u < banda.u0 || u > banda.u1) return t;
    // Solo se deforma la mitad de abajo (de π a 2π): la de arriba, con las puertas y los paneles, se queda como está.
    const [a, b] = banda.tDe!(u), pts: [number, number][] = [[0, 0], [Math.PI, Math.PI], [TH[jL], a], [TH[jR], b], [T, T]];
    for (let k = 0; k < 4; k++) if (t <= pts[k + 1][0]) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1]; return x1 > x0 ? y0 + (y1 - y0) * (t - x0) / (x1 - x0) : y1; }
    return t;
  };
  const pos: V3[][] = U.map((u, i) => { const f = S.frame(u); return TH.map(t => S.sec(f, real(i, t))); });
  // Normales por diferencias finitas sobre la rejilla completa: así no hay
  // costuras de sombreado entre zonas vecinas.
  const nor: V3[][] = pos.map((fila, i) => fila.map((_, j) => {
    const ip = Math.min(nu - 1, i + 1), im = Math.max(0, i - 1);
    const a = pos[ip][j], b = pos[im][j];
    const jp = j === nv - 1 ? (cerrada ? 1 : nv - 1) : j + 1, jm = j === 0 ? (cerrada ? nv - 2 : 0) : j - 1;
    const c = pos[i][jp], d = pos[i][jm];
    const du = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dt = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    const n: V3 = [dt[1] * du[2] - dt[2] * du[1], dt[2] * du[0] - dt[0] * du[2], dt[0] * du[1] - dt[1] * du[0]];
    const L = Math.hypot(...n) || 1; return [n[0] / L, n[1] / L, n[2] / L];
  }));
  // Coordenadas de textura: proyección en planta (x, z), así las células
  // solares se ven rectangulares desde arriba; los costados casi verticales
  // no llevan células (son flanco negro o ventanilla).
  type Cubo = { p: number[]; n: number[]; uv: number[]; i: number[]; mapa: Map<number, number> };
  const cubos = new Map<string, Cubo>();
  const meter = (c: Cubo, i: number, j: number) => {
    const k = i * nv + j; let v = c.mapa.get(k);
    if (v === undefined) {
      v = c.p.length / 3; c.mapa.set(k, v);
      const q = pos[i][j]; c.p.push(...q); c.n.push(...nor[i][j]); c.uv.push(q[0] / CELULA, q[2] / CELULA);
    }
    return v;
  };
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) {
    const uc = (U[i] + U[i + 1]) / 2, tc = (real(i, TH[j]) + real(i, TH[j + 1]) + real(i + 1, TH[j]) + real(i + 1, TH[j + 1])) / 4;
    const zona = S.zonas.find(z => enZona(z, uc, tc));
    const piel: Piel = zona ? zona.piel : S.pielBase;
    if (piel === 'hueco') continue;
    const puerta = S.puertas.find(z => enZona(z, uc, tc));
    const clave = `${puerta?.id ?? 'fijo'}|${piel}`;
    let c = cubos.get(clave);
    if (!c) { c = { p: [], n: [], uv: [], i: [], mapa: new Map() }; cubos.set(clave, c); }
    const a = meter(c, i, j), a1 = meter(c, i, j + 1), b = meter(c, i + 1, j), b1 = meter(c, i + 1, j + 1);
    c.i.push(a, a1, b, a1, b1, b);
  }
  const out: { puerta: string; piel: Piel; geo: THREE.BufferGeometry }[] = [];
  for (const [clave, c] of cubos) {
    const [puerta, piel] = clave.split('|') as [string, Piel];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(c.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(c.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(c.uv, 2));
    g.setIndex(c.i);
    out.push({ puerta, piel, geo: g });
  }
  return out;
}

/** Faros, pilotos, intermitentes, retrovisores y limpiaparabrisas del Aeromóvil Gota. */
export function accesorios(g: THREE.Object3D, M: Mats, m: ModeloGota) {
  const sobre = (u: number, th: number, off = 0.004) => m.sec(m.frame(u), th, off);
  const anillo = (u: number, mat: THREE.Material, r: number) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 64; j++) pts.push(new THREE.Vector3(...sobre(u, j / 64 * 2 * Math.PI)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, r, 6, true), mat));
  };
  anillo(0.010, M.faro, 0.009);                 // luz diurna alrededor del morro
  for (const th of [0.10 * Math.PI, 0.90 * Math.PI]) {   // faros
    const q = sobre(0.028, th, 0.0);
    const s = sphere(g, q, 0.05, M.faro, [0.45, 0.42, 1.25]); s.lookAt(q[0] + 1, q[1], q[2]);
  }
  // Pilotos traseros: dos faros con carcasa y luz de posición y freno,
  // y la tercera luz de freno en lo alto de la cola.
  for (const th of [0.12 * Math.PI, 0.88 * Math.PI]) {
    const q = sobre(0.955, th, 0.0), f = m.frame(0.955), n = new THREE.Vector3(-0.6, q[1] - f.zc, q[2]).normalize();
    const caja = sphere(g, q, 0.09, M.carcasa, [0.55, 0.62, 0.3]); caja.lookAt(q[0] + n.x, q[1] + n.y, q[2] + n.z);
    const lente = sphere(g, [q[0] + n.x * 0.02, q[1] + n.y * 0.02, q[2] + n.z * 0.02], 0.078, M.piloto, [0.62, 0.66, 0.28]);
    lente.lookAt(q[0] + n.x * 2, q[1] + n.y * 2, q[2] + n.z * 2);
  }
  const fr = sobre(0.93, Math.PI / 2, 0.006); box(g, fr, [0.02, 0.018, 0.22], M.piloto);
  // Intermitentes: delante a los lados y detrás, ámbar
  for (const [th, mat] of [[0.02 * Math.PI, M.intermitenteI], [0.98 * Math.PI, M.intermitenteD]] as const) {
    sphere(g, sobre(0.06, th, 0.004), 0.022, mat, [1.6, 0.7, 0.6]);
    sphere(g, sobre(0.94, th, 0.004), 0.018, mat, [1.4, 0.7, 0.6]);
  }
  // Retrovisores en la base del parabrisas
  const uR = m.zonasPiel[0].u0 + 0.025;
  for (const s of [1, -1]) {
    const base = sobre(uR, s > 0 ? 0.13 * Math.PI : 0.87 * Math.PI, 0);
    const punta: V3 = [base[0] - 0.02, base[1] + 0.04, base[2] + s * 0.13];
    tube(g, base, punta, 0.016, M.black);
    sphere(g, [punta[0] - 0.02, punta[1] + 0.01, punta[2] + s * 0.03], 0.05, M.body, [1.0, 0.65, 1.15]);
  }
  // Limpiaparabrisas: brazo y escobilla sobre el cristal
  const uL = m.zonasPiel[0].u0 + 0.02;
  const piv = sobre(uL, 0.32 * Math.PI, 0.012);
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 12; k++) pts.push(new THREE.Vector3(...sobre(uL + 0.035 * k / 12, (0.34 + 0.28 * k / 12) * Math.PI, 0.012)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.005, 6), M.black));
  sphere(g, piv, 0.012, M.black);
}

/** La parte fija: piel, accesorios, chasis, asientos, ocupantes, baterías. */
export function construirFijo(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: Mats, m: ModeloConPiel, sinPasajero = false) {
  for (const k of ['carenado', 'cristales', 'solar', 'chasis', 'direccion', 'asientos', 'ocupantes', 'motor', 'transmision', 'baterias'] as CapaId[]) vaciar(G[k]);
  puertasG.clear();
  const capaDe: Record<Piel, CapaId> = { carroceria: 'carenado', bajos: 'carenado', cristal: 'cristales', solar: 'solar', hueco: 'carenado', marco: 'carenado', morro: 'carenado' };
  const matDe: Record<Piel, THREE.Material> = { carroceria: M.body, bajos: M.bajos, cristal: M.glass, solar: M.solar, hueco: M.body, marco: M.goma, morro: M.morro };
  const compDe: Record<Piel, string> = { carroceria: 'carroceria', bajos: 'carroceria', cristal: 'cupula', solar: 'solar', hueco: 'carroceria', marco: 'cupula', morro: 'carroceria' };
  for (const S of m.superficies) for (const pieza of construirSuperficie(S)) {
    const mesh = new THREE.Mesh(pieza.geo, matDe[pieza.piel]);
    mesh.castShadow = pieza.piel !== 'cristal'; mesh.receiveShadow = true;
    mesh.userData.componente = pieza.puerta === 'fijo' ? compDe[pieza.piel] : (pieza.puerta.startsWith('maletero') ? 'maleteros' : 'puertas');
    const capa = G[capaDe[pieza.piel]];
    // Techo interior: bajo el panel solar de la cúpula, una piel lisa y clara 4 mm por dentro, para no ver células desde el habitáculo.
    const forro = S.id === 'cupula' && pieza.piel === 'solar' ? new THREE.Mesh(desplazar(pieza.geo, -0.004), M.techoInterior) : null;
    if (forro) { forro.userData.componente = mesh.userData.componente; forro.receiveShadow = true; }
    if (pieza.puerta === 'fijo') { capa.add(mesh); if (forro) capa.add(forro); continue; }
    // Cada trozo de puerta o tapa cuelga de un pivote en su bisagra
    const def = S.puertas.find(p => p.id === pieza.puerta)!;
    const piv = new THREE.Group(); piv.position.set(...def.bisagra[0]);
    piv.userData = { eje: new THREE.Vector3(...def.bisagra[1]).sub(new THREE.Vector3(...def.bisagra[0])).normalize(), angulo: def.angulo * Math.PI / 180, tipo: def.tipo };
    mesh.position.set(-def.bisagra[0][0], -def.bisagra[0][1], -def.bisagra[0][2]);
    piv.add(mesh); if (forro) { forro.position.copy(mesh.position); piv.add(forro); } capa.add(piv);
    if (!puertasG.has(pieza.puerta)) puertasG.set(pieza.puerta, []);
    puertasG.get(pieza.puerta)!.push(piv);
  }
  if (m.tipo === 'a1') accesoriosA1(G.carenado, M, m); else accesorios(G.carenado, M, m);
  etiquetar(G.carenado, 'luces');

  const tubos = m.tubosChasis();
  for (const t of tubos) if (t.grupo !== 'Suspensión') {
    const destino = t.grupo === 'Dirección' && m.tipo === 'a1' ? G.direccion : t.grupo === 'Transmisión' ? G.transmision : G.chasis;
    const mat = t.grupo === 'Dirección' ? (t.comprado ? M.black : M.alu) : t.grupo === 'Transmisión' ? M.black : M.alu;
    const antes = destino.children.length;
    if (t.curva) tuboCurvo(destino, t.curva, t.d, t.d < 0.01 ? M.black : mat); else tube(destino, t.a, t.b, t.d, mat);
    for (let i = antes; i < destino.children.length; i++) destino.children[i].userData.componente = t.grupo === 'Dirección' ? 'direccion' : t.grupo === 'Transmisión' ? 'transmision' : 'chasis';
  }
  // Uniones soldadas: donde el extremo de un tubo toca a otro, un cordón
  // (esfera algo mayor que el tubo) en vez de dos cilindros que se cruzan.
  const soldables = tubos.filter(t => t.grupo === 'Chasis');
  const dSeg = (p: V3, a: V3, b: V3) => {
    const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const tt = Math.max(0, Math.min(1, (w[0] * v[0] + w[1] * v[1] + w[2] * v[2]) / (v[0] ** 2 + v[1] ** 2 + v[2] ** 2 || 1)));
    return Math.hypot(w[0] - tt * v[0], w[1] - tt * v[1], w[2] - tt * v[2]);
  };
  for (const t of soldables) for (const p of [t.a, t.b]) {
    const toca = soldables.some(o => o !== t && tramosTubo(o).some(([a, b]) => dSeg(p, a, b) < o.d / 2 + t.d / 2 + 0.004));
    if (toca) sphere(G.chasis, p, t.d / 2 * 1.18, M.soldadura).userData.componente = 'chasis';
  }
  for (const a of m.asientos) { if (sinPasajero && !a.piloto) continue; asiento(G.asientos, M, m, a.piloto, a.lat, a.ancho); ocupante(G.ocupantes, M, m, a.lat, a.piloto); }
  etiquetar(G.asientos, 'asientos');
  if (m.tipo === 'a1') {
    construirFijoA1(G, M, m);
  } else {
    const by = m.P.clear + 0.055;
    for (const [x0, z0] of [[m.xPil - 0.05, 0.045], [m.xPil - 0.05, -0.145], [m.xPas, 0.17], [m.xPas, -0.27]]) {
      box(G.baterias, [x0 + 0.185, by, z0 + 0.05], [0.37, 0.08, 0.10], M.batt);
    }
    etiquetar(G.baterias, 'bateria');
  }
}

/** Aeromóvil Gota: suspensiones comprimidas, paralelogramo inclinado, ruedas y motor. */
export function construirMovilGota(G: Record<CapaId, THREE.Group>, M: Mats, m: ModeloGota, coche: THREE.Group, inclinacion: number) {
  const ph = inclinacion * Math.PI / 180, c = m.P.comp, AX = m.AX;
  coche.rotation.x = ph;
  vaciar(G.suspension); vaciar(G.ruedas); vaciar(G.motor);
  const s = G.suspension;
  const fwc: [number, number] = [AX[0] * c * TRAVEL_F, m.rF + AX[1] * c * TRAVEL_F];
  for (const zs of [-1, 1]) {
    const z = zs * 0.07;
    const lo: [number, number] = [fwc[0] + AX[0] * 0.40, fwc[1] + AX[1] * 0.40];
    const stb: [number, number] = [m.crown[0] - AX[0] * (m.A2C - 0.28), m.crown[1] - AX[1] * (m.A2C - 0.28)];
    tube(s, [fwc[0], fwc[1], z], [lo[0], lo[1], z], 0.05, M.susp);
    tube(s, [stb[0], stb[1], z], [m.crown[0], m.crown[1], z], 0.036, M.stanch);
  }
  const arco: [number, number] = [fwc[0] + AX[0] * 0.36, fwc[1] + AX[1] * 0.36];
  tube(s, [arco[0], arco[1], -0.07], [arco[0], arco[1], 0.07], 0.03, M.susp);
  tube(s, [m.crown[0], m.crown[1], -0.09], [m.crown[0], m.crown[1], 0.09], 0.04, M.black);
  tube(s, [fwc[0], fwc[1], -0.085], [fwc[0], fwc[1], 0.085], 0.015, M.black);
  const PIV = m.PIV, ax0: [number, number] = [m.xR, m.rR];
  let th = 0;
  for (let i = 0; i < 6; i++) {
    const p = rot(ax0, PIV, th), err = (m.rR + c * TRAVEL_R) - p[1], dd = (rot(ax0, PIV, th + 1e-4)[1] - p[1]) / 1e-4;
    th += err / dd;
  }
  const rax = rot(ax0, PIV, th), rock = rot([PIV[0], PIV[1] + 0.13], PIV, th);
  for (const zs of [-1, 1]) tube(s, [PIV[0], PIV[1], zs * 0.075], [rax[0], rax[1], zs * 0.075], 0.032, M.susp);
  tube(s, [PIV[0], PIV[1], -0.08], [PIV[0], PIV[1], 0.08], 0.03, M.black);
  tube(s, [PIV[0], PIV[1], 0], [rock[0], rock[1], 0], 0.03, M.susp);
  const fm: [number, number] = [m.xCruceta, m.ys + 0.02], mid: [number, number] = [fm[0] + (rock[0] - fm[0]) * 0.55, fm[1] + (rock[1] - fm[1]) * 0.55];
  tube(s, [fm[0], fm[1], 0], [mid[0], mid[1], 0], 0.055, M.black);
  tube(s, [mid[0], mid[1], 0], [rock[0], rock[1], 0], 0.02, M.stanch);
  const A = m.ARM_A, ca = Math.cos(ph), sa = Math.sin(ph);
  for (const yy of [m.ys, m.ys + ARM_UP]) for (const dx of [-0.03, 0.03]) tube(s, [m.xL + dx, yy - A * sa, -A * ca], [m.xL + dx, yy + A * sa, A * ca], 0.025, M.susp);
  const lw: Record<number, [number, number]> = {};
  for (const zs of [-1, 1]) {
    const z = zs * A * ca, dy = zs * A * sa;
    tube(s, [m.xL, Math.min(m.ys, m.rL) + dy - 0.02, z], [m.xL, m.ys + ARM_UP + dy + 0.02, z], 0.035, M.alu);
    tube(s, [m.xL, m.rL + dy, z], [m.xL, m.rL + dy, z + zs * 0.08], 0.02, M.black);
    lw[zs] = [z + zs * 0.08, dy];
  }
  tube(s, [m.xL, m.ys + ARM_UP + 0.04, 0], [m.xL, m.ys + 0.25 * sa, 0.25 * ca], 0.03, M.black);

  rueda(G.ruedas, M, fwc[0], fwc[1], 0, m.rF);
  rueda(G.ruedas, M, rax[0], rax[1], 0, m.rR);
  for (const zs of [-1, 1]) rueda(G.ruedas, M, m.xL, m.rL + lw[zs][1], lw[zs][0], m.rL);

  const mo = G.motor, BB = m.BB;
  disk(mo, [rax[0], rax[1], 0], 0.095, 0.06, M.motor);
  disk(mo, [BB[0], BB[1], 0], 0.06, 0.08, M.motor);
  for (const zs of [-1, 1]) {
    const a = 0.6 + (zs > 0 ? 0 : Math.PI), pe: [number, number] = [BB[0] + 0.165 * Math.cos(a), BB[1] + 0.165 * Math.sin(a)];
    tube(mo, [BB[0], BB[1], zs * 0.05], [pe[0], pe[1], zs * 0.07], 0.02, M.black);
    tube(mo, [pe[0], pe[1], zs * 0.07], [pe[0], pe[1], zs * 0.16], 0.02, M.black);
  }
  box(mo, [m.xPas + 0.55, m.ys + m.P.spineD / 2000 + 0.025, 0], [0.20, 0.05, 0.07], M.black);
  const cable = new THREE.CatmullRomCurve3(([
    [BB[0], BB[1] - 0.05, 0.05], [BB[0] - 0.25, m.ys + 0.06, 0.05], [m.xPas + 0.55, m.ys + 0.07, 0.04],
    [PIV[0], PIV[1] + 0.05, 0.05], [rax[0] + 0.05, rax[1] + 0.04, 0.05],
  ] as V3[]).map(p => new THREE.Vector3(...p)));
  mo.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 80, 0.006, 6, false), M.motor));
  etiquetar(G.suspension, 'suspension'); etiquetar(G.ruedas, 'ruedas'); etiquetar(G.motor, 'motor');
}
