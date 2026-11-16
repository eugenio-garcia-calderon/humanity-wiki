// ============================================================================
// CUADRICICLO BASCULANTE · el modelo 3D (2026-11-15)
// ============================================================================
// The viewer's layers for this family, built from the pure model
// (geometriaBasculante.ts). Two parts:
//   · `construirBasculante`: everything, once per change of the parameters.
//     The skin is ONE grid over (x, θ) whose lines fall on every zone's edge
//     (glass, solar roof, the black belly, the nose's accent, the light bars),
//     so each cell is one material and the edges are clean; the rear arches'
//     openings are cells left out, their lips hidden under a rubber trim.
//   · `posarBasculante`: only the moving parts, every frame of «Bascular» or
//     «Simular curva»: the four corners (wheel, fairing, upright, hub motor) and
//     the four arms of the two parallelograms. The viewer turns the whole car φ
//     about the ground under its centre line; here the arms turn back by β
//     (they stay level with the road) and each corner rides on their ends.
//
// The materials and the small helpers (tubes, spheres, the car wheel, the
// riders) are the viewer's own, passed in (`AyudasVisor`): «Rayos X», «Corte»
// and the body colour act on them as on every other vehicle.
import * as THREE from 'three';
import { CELULA, type P3, type PuntosOcupante } from '../geometria';
import { ANGULO_CUPULA_B, esquinaEn, type Esquina, type ModeloBasculante } from '../geometriaBasculante';
import { dentroPoligono } from './smera';
import { construirDetallesSmera } from './smera3d';

type V3 = [number, number, number];
export type CapaB = 'carenado' | 'cristales' | 'solar' | 'chasis' | 'suspension' | 'direccion' | 'ruedas' | 'asientos' | 'ocupantes' | 'motor' | 'baterias' | 'transmision';
type Mat = THREE.Material;
/** The viewer's materials this builder uses. */
export interface MatsB {
  body: Mat; glass: Mat; solar: Mat; goma: Mat; morro: Mat; bajos: Mat; faro: Mat; piloto: Mat; intermitenteI: Mat; intermitenteD: Mat;
  alu: Mat; susp: Mat; stanch: Mat; black: Mat; seat: Mat; motor: Mat; batt: Mat; carcasa: Mat; muelle: Mat; cableHV: Mat; techoInterior: Mat;
}
/** The viewer's helpers (visor/primitivas.ts, visor/ocupante.ts), so the parts look like every other vehicle's. */
export interface AyudasVisor {
  tube: (g: THREE.Object3D, a: V3, b: V3, d: number, mat: Mat) => void;
  sphere: (g: THREE.Object3D, c: V3, r: number, mat: Mat, escala?: V3) => THREE.Mesh;
  disk: (g: THREE.Object3D, c: V3, r: number, w: number, mat: Mat) => void;
  cajaRedonda: (g: THREE.Object3D, c: V3, s: V3, mat: Mat, r?: number) => THREE.Mesh;
  ruedaCoche: (g: THREE.Object3D, M: never, x: number, y: number, z: number, r: number, w: number, disco: number, giro: number) => THREE.Group;
  muelle: (g: THREE.Object3D, a: V3, b: V3, r: number, vueltas: number, mat: Mat) => void;
  tuboCurvo: (g: THREE.Object3D, pts: V3[], d: number, mat: Mat) => void;
  ocupante: (g: THREE.Object3D, M: never, m: { occPts: (piloto: boolean) => PuntosOcupante }, lat: number, piloto: boolean) => void;
  /** the viewer's material set, as the wheel and rider helpers want it */
  M: unknown;
}

/** The pivots that open the canopy (one per layer: its frame, its glass, its solar roof), as the Bala's. */
export const PIVOTES_CUPULA_B = ['cupula-b-carroceria', 'cupula-b-cristal', 'cupula-b-solar'] as const;

// ------------------------------------------------------------------ the skin
function pielDe(m: ModeloBasculante) {
  const { xs, ths } = m.rejilla, F = m.F, nu = xs.length, nv = ths.length;
  const pos: P3[][] = xs.map(x => { const f = F.frame(x); return ths.map(t => F.sec(f, t)); });
  // normals by finite differences over the whole grid (θ wraps round): no shading seams between zones
  const nor: P3[][] = pos.map((fila, i) => fila.map((_, j) => {
    if (i === 0) return [1, 0, 0] as P3;   // the nose's tip
    const a = pos[Math.min(nu - 1, i + 1)][j], b = pos[i - 1][j];
    const jp = j === nv - 1 ? 1 : j + 1, jm = j === 0 ? nv - 2 : j - 1, c = pos[i][jp], d = pos[i][jm];
    const du = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dt = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    const n: P3 = [dt[1] * du[2] - dt[2] * du[1], dt[2] * du[0] - dt[0] * du[2], dt[0] * du[1] - dt[1] * du[0]];
    const L = Math.hypot(...n) || 1; return [n[0] / L, n[1] / L, n[2] / L];
  }));
  type Cubo = { p: number[]; n: number[]; uv: number[]; i: number[]; mapa: Map<number, number> };
  const cubos = new Map<string, Cubo>();
  const meter = (c: Cubo, i: number, j: number) => {
    const k = i * nv + j; let v = c.mapa.get(k);
    if (v === undefined) { v = c.p.length / 3; c.mapa.set(k, v); const q = pos[i][j]; c.p.push(...q); c.n.push(...nor[i][j]); c.uv.push(q[0] / CELULA, q[2] / CELULA); }
    return v;
  };
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) {
    const a0 = pos[i][j], d0 = pos[i + 1][j + 1], c0: P3 = [(a0[0] + d0[0]) / 2, (a0[1] + d0[1]) / 2, (a0[2] + d0[2]) / 2];
    if (m.hueco(c0)) continue;
    const xc = (xs[i] + xs[i + 1]) / 2, tc = (ths[j] + ths[j + 1]) / 2;
    // (the Smera's doors: their cells go to each door's own group, which turns on its hinge)
    const ep = m.smera ? m.enPuerta(xc, tc) : 0;
    const clave = `${m.enCupula(xc, tc) ? 'cupula' : ep ? `puerta${ep}` : 'fijo'}|${m.zona(xc, tc)}`;
    let c = cubos.get(clave); if (!c) { c = { p: [], n: [], uv: [], i: [], mapa: new Map() }; cubos.set(clave, c); }
    const a = meter(c, i, j), a1 = meter(c, i, j + 1), b = meter(c, i + 1, j), b1 = meter(c, i + 1, j + 1);
    if (i === 0) c.i.push(a1, b1, b); else c.i.push(a, a1, b, a1, b1, b);
  }
  const out: { cupula: boolean; puerta: 0 | 1 | -1; zona: string; geo: THREE.BufferGeometry }[] = [];
  for (const [clave, c] of cubos) {
    const [donde, zona] = clave.split('|');
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(c.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(c.n, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(c.uv, 2));
    g.setIndex(c.i); out.push({ cupula: donde === 'cupula', puerta: donde === 'puerta1' ? 1 : donde === 'puerta-1' ? -1 : 0, zona, geo: g });
  }
  // the tail's end face: a flat cap closing the edge
  const ult = pos[nu - 1], cx = xs[nu - 1], cy = ult.reduce((s, p) => s + p[1], 0) / ult.length;
  const cap: number[] = [cx, cy, 0], idx: number[] = [], normales: number[] = [-1, 0, 0];
  for (let j = 0; j < nv; j++) { cap.push(...ult[j]); normales.push(-1, 0, 0); }
  for (let j = 1; j < nv; j++) idx.push(0, j + 1, j);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(cap, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3)); g.setIndex(idx);
  out.push({ cupula: false, puerta: 0, zona: 'tapa', geo: g });
  return out;
}

/** One front fairing's shell, in its own axes (x' forward from the axle, y up, z outwards; `s` mirrors it to the left). */
function carenadoDe(m: ModeloBasculante, s: number) {
  const p = m.pod!, nx = 44, nt = 48, pos: number[] = [], idx: number[] = [];
  const xsl: number[] = []; for (let i = 0; i <= nx; i++) xsl.push(p.x0 + (p.x1 - p.x0) * (1 - Math.cos(Math.PI * i / nx)) / 2);
  for (const xl of xsl) { const t0 = p.th0(xl); for (let j = 0; j <= nt; j++) { const q = p.punto(xl, t0 + (Math.PI - 2 * t0) * j / nt); pos.push(q[0], q[1], s * q[2]); } }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nt; j++) { const a = i * (nt + 1) + j, b = a + nt + 1; if (s > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  // the two lower lips (where the shell opens over the tyre)
  const labios = [0, nt].map(j => xsl.map(xl => { const t0 = p.th0(xl), q = p.punto(xl, t0 + (Math.PI - 2 * t0) * j / nt); return [q[0], q[1], s * q[2]] as V3; }));
  return { geo: g, labios };
}

/** The group of one corner in one layer: placed at the lower arm's end, with a child that steers. */
function esquinaGrupo(capa: THREE.Group, q: Esquina) {
  const g = new THREE.Group(); g.name = `esq-${q.id}`; g.userData.esquina = q.id;
  const dir = new THREE.Group(); dir.name = 'dir'; g.add(dir); capa.add(g);
  return dir;
}

/** A side outline (x, y) extruded across the car, centred on z, with rounded edges. */
function extruir(g: THREE.Object3D, pts: [number, number][], ancho: number, mat: Mat, z = 0) {
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: ancho, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 6 });
  geo.translate(0, 0, z - ancho / 2);
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; g.add(mesh); return mesh;
}
/** A polyline thickened to a closed outline (its two sides `grosor` apart). */
function engrosar(l: [number, number][], grosor: number): [number, number][] {
  const a: [number, number][] = [], b: [number, number][] = [];
  for (let i = 0; i < l.length; i++) {
    const p = l[Math.max(0, i - 1)], q = l[Math.min(l.length - 1, i + 1)], tx = q[0] - p[0], ty = q[1] - p[1], L = Math.hypot(tx, ty) || 1, nx = -ty / L, ny = tx / L;
    a.push([l[i][0] + nx * grosor / 2, l[i][1] + ny * grosor / 2]); b.push([l[i][0] - nx * grosor / 2, l[i][1] - ny * grosor / 2]);
  }
  return [...a, ...b.reverse()];
}

/**
 * Everything, in the viewer's layers. `calidad` 'rapida' leaves out the riders while a slider is dragged (as the Bala).
 * The canopy's three pivots go into `puertasG` under 'cupula' («Abrir cúpula»).
 */
export function construirBasculante(G: Record<CapaB, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: MatsB, m: ModeloBasculante, A: AyudasVisor, opc: { calidad: 'completa' | 'rapida'; sinPasajero: boolean }) {
  const F = m.F;
  // ── the skin, the canopy apart on its hinge at the windscreen's foot
  const pivotes = PIVOTES_CUPULA_B.map(n => { const p = new THREE.Group(); p.name = n; p.position.set(...m.bisagra); p.userData = { eje: new THREE.Vector3(0, 0, 1), angulo: ANGULO_CUPULA_B * Math.PI / 180, tipo: 'puerta' }; return p; });
  const MAT: Record<string, Mat> = { carroceria: M.body, cristal: M.glass, solar: M.solar, bajos: M.bajos, morro: M.morro, faro: M.faro, piloto: M.piloto, tapa: m.smera ? M.body : M.bajos };
  // the Smera's two doors, hinged at their front edge on a vertical axis, opening outwards 65°
  const puertasS = new Map<1 | -1, THREE.Group>();
  if (m.smera && m.det) {
    const xh = Math.max(...m.det.puerta.map(p => p[0])), yh = (m.det.puerta[0][1] + m.det.puerta[1][1]) / 2, zh = F.ladoZ(xh, yh);
    for (const s of [1, -1] as const) {
      const p = new THREE.Group(); p.name = `puerta-smera-${s > 0 ? 'der' : 'izq'}`; p.position.set(xh, 0, s * (Number.isFinite(zh) ? zh : 0.35));
      p.userData = { eje: new THREE.Vector3(0, 1, 0), angulo: s * 65 * Math.PI / 180, tipo: 'puerta' };
      puertasS.set(s, p); G.carenado.add(p);
    }
    puertasG.set('puertas', [...puertasS.values()]);
  }
  const CAPA: Record<string, CapaB> = { cristal: 'cristales', solar: 'solar' };
  for (const t of pielDe(m)) {
    const mesh = new THREE.Mesh(t.geo, MAT[t.zona] ?? M.body); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = `piel-${t.zona}`;
    const capa = CAPA[t.zona] ?? 'carenado';
    if (t.cupula) { const piv = pivotes[capa === 'cristales' ? 1 : capa === 'solar' ? 2 : 0]; mesh.position.set(-m.bisagra[0], -m.bisagra[1], -m.bisagra[2]); piv.add(mesh); }
    else if (t.puerta && puertasS.get(t.puerta)) { const piv = puertasS.get(t.puerta)!; mesh.position.copy(piv.position).multiplyScalar(-1); piv.add(mesh); }
    else G[capa].add(mesh);
  }
  ([['carenado', 0], ['cristales', 1], ['solar', 2]] as const).forEach(([capa, k]) => { G[capa].add(pivotes[k]); });
  if (!m.smera) puertasG.set('cupula', [...pivotes]);
  // rubber trims along the canopy's edges, the A-pillars and the arches' lips (they hide the cells' steps); the ones
  // on the canopy's edges rise with it
  for (const l of m.lineas) {
    if (l.length < 2) continue;
    const enCup = !m.smera && l.every(p => p[0] <= m.xWs + 1e-6 && p[0] >= m.xCup - 1e-6 && p[1] > F.frame(p[0]).yc);
    // (the Smera's window trims are on the doors: they open with them; the door's own outline stays, as its seal)
    const ladoPuerta = m.smera && m.det && l.every(p => dentroPoligono(m.det!.ventana, p[0], p[1]) || Math.min(...m.det!.ventana.map(v => Math.hypot(v[0] - p[0], v[1] - p[1]))) < 0.02) ? Math.sign(l[0][2]) as 1 | -1 : 0;
    const curva = new THREE.CatmullRomCurve3(l.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curva, Math.max(12, l.length * 2), 0.0065, 6, false), M.bajos);
    // (the door's outline: a seal on the body and the same edge on the door, which hides its cells' steps when open)
    const contornoPuerta = m.smera && m.det && l.length > 20 && l.every(p => Math.min(...m.det!.puerta.map((v, i, a) => { const w = a[(i + 1) % a.length], dx = w[0] - v[0], dy = w[1] - v[1], t = Math.max(0, Math.min(1, ((p[0] - v[0]) * dx + (p[1] - v[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(v[0] + dx * t - p[0], v[1] + dy * t - p[1]); })) < 0.01);
    if (contornoPuerta) { const piv = puertasS.get(Math.sign(l[0][2]) as 1 | -1); if (piv) { const copia = mesh.clone(); copia.position.copy(piv.position).multiplyScalar(-1); piv.add(copia); } }
    if (enCup) { mesh.position.set(-m.bisagra[0], -m.bisagra[1], -m.bisagra[2]); pivotes[0].add(mesh); }
    else if (ladoPuerta && puertasS.get(ladoPuerta)) { const piv = puertasS.get(ladoPuerta)!; mesh.position.copy(piv.position).multiplyScalar(-1); piv.add(mesh); }
    else G.carenado.add(mesh);
  }
  // the inside of the canopy's roof (a light lining under the solar panel), and the rear arches' liners
  {
    const xs: number[] = []; for (let x = m.xS0; x >= m.xS1 - 1e-9; x -= (m.xS0 - m.xS1) / 24) xs.push(x);
    if (m.conSolar && !m.smera) {
      const pos: number[] = [], idx: number[] = [], nt = 20, t0 = F.thVentana, t1 = Math.PI - F.thVentana;
      for (const x of xs) for (let j = 0; j <= nt; j++) { const q = F.sec(F.frame(x), t0 + (t1 - t0) * j / nt, -0.01); pos.push(q[0] - m.bisagra[0], q[1] - m.bisagra[1], q[2] - m.bisagra[2]); }
      for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < nt; j++) { const a = i * (nt + 1) + j, b = a + nt + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      pivotes[2].add(new THREE.Mesh(g, M.techoInterior));
    }
    const a = m.arco;
    for (const s of [1, -1]) {
      const R = (a.yTop - a.y0), ancho = a.zOut - a.zIn;
      // (the upper half: after the turn about x, the cylinder's −z half is the one that points up)
      const geo = new THREE.CylinderGeometry(a.rx, a.rx, ancho, 40, 1, true, Math.PI / 2, Math.PI);
      const liner = new THREE.Mesh(geo, M.bajos); liner.rotation.x = Math.PI / 2; liner.scale.set(1, 1, R / a.rx);
      liner.position.set(a.x, a.y0, s * (a.zIn + ancho / 2)); G.carenado.add(liner);
      // and its inner wall: the arch's outline closed at the wheel well's inner side, so the inside of the car does not show
      const yb = F.bajos(a.x) + 0.005, pared = new THREE.Shape(); pared.moveTo(a.x - a.rx, yb);
      for (let k = 0; k <= 24; k++) { const t = Math.PI * k / 24; pared.lineTo(a.x - a.rx * Math.cos(t), a.y0 + R * Math.sin(t)); }
      pared.lineTo(a.x + a.rx, yb); pared.closePath();
      const tapa = new THREE.Mesh(new THREE.ShapeGeometry(pared, 4), M.bajos); tapa.position.z = s * a.zIn; G.carenado.add(tapa);
    }
    // the front wells (the wheels in the nose): the roof over the tyre, from the inner wall out to the side skin, and
    // the inner wall, which follows the steered tyre's inner face along x; both seen from below and from inside
    if (m.arcoDel && m.pasoDel) {
      const a = m.arcoDel, pd = m.pasoDel, nx = 48, nz = 10;
      const forro = (M.bajos as THREE.Material).clone(); forro.side = THREE.DoubleSide;
      const malla = (punto: (i: number, j: number) => V3, ni: number, nj: number) => {
        const pos: number[] = [], idx: number[] = [];
        for (let i = 0; i <= ni; i++) for (let j = 0; j <= nj; j++) pos.push(...punto(i, j));
        for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) { const k = i * (nj + 1) + j, k2 = k + nj + 1; idx.push(k, k + 1, k2, k + 1, k2 + 1, k2); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
      };
      const xA = (i: number) => a.x - a.rx + 2 * a.rx * i / nx;
      for (const s of [1, -1]) {
        const techo = malla((i, j) => {
          const x = xA(i), y = Math.max(F.bajos(x) + 0.004, m.yArcoDel(x)), z0 = pd.zIn(x), w = F.ladoZ(x, y), z1 = Math.max(z0, (Number.isFinite(w) ? w : z0) - 0.004);
          return [x, y, s * (z0 + (z1 - z0) * j / nz)];
        }, nx, nz);
        const mt = new THREE.Mesh(techo, forro); mt.receiveShadow = true; G.carenado.add(mt);
        const pared = malla((i, j) => { const x = xA(i), y0 = F.bajos(x) + 0.004, y1 = Math.max(y0, m.yArcoDel(x)); return [x, y0 + (y1 - y0) * j / nz, s * pd.zIn(x)]; }, nx, nz);
        G.carenado.add(new THREE.Mesh(pared, forro));
      }
    }
  }
  // the light bars' ends: the indicators (amber, the viewer blinks them), and the cameras on the A-pillars (as the Aptera's)
  // (not on the Smera body: it has its own lamps, and no cameras)
  if (!m.smera) for (const s of [1, -1]) {
    const thF = s > 0 ? m.faro.thK + 0.08 : Math.PI - m.faro.thK - 0.08;
    const pF = F.sec(F.frame(m.faro.x - 0.004), thF, 0.002), mt = s > 0 ? M.intermitenteD : M.intermitenteI;
    A.sphere(G.carenado, pF, 0.018, mt, [0.9, 0.55, 1.3]);
    const pT = F.sec(F.frame(m.piloto.x), s > 0 ? 0.05 : Math.PI - 0.05, 0.002);
    A.sphere(G.carenado, pT, 0.016, mt, [0.7, 0.6, 1.2]);
  }
  if (!m.smera) for (const c of m.camaras) {
    const cap = A.sphere(G.carenado, [c[0], c[1] + 0.01, c[2] + Math.sign(c[2]) * 0.035], 0.028, M.bajos, [1.8, 0.75, 0.75]);
    cap.rotation.y = Math.sign(c[2]) * 0.15;
    A.tube(G.carenado, [c[0] + 0.01, c[1], c[2]], [c[0], c[1] + 0.01, c[2] + Math.sign(c[2]) * 0.03], 0.012, M.bajos);
  }

  // ── the corners: wheel (and the rear ones' hub motors), fairing, upright with its spring, the stub axle
  for (const q of m.esquinas) {
    const yR = q.r - q.yInf, s = q.s;
    const dRueda = esquinaGrupo(G.ruedas, q);
    A.ruedaCoche(dRueda, A.M as never, 0, yR, s * Math.max(1e-6, q.e), q.r, q.w, Math.min(0.26, q.r * 0.95), 0);
    if (q.eje === 'tras') { const dm = esquinaGrupo(G.motor, q); A.disk(dm, [0, yR, s * (q.e - q.w * 0.12)], m.motor.r, m.motor.ancho, M.motor); }
    const dS = esquinaGrupo(G.suspension, q), h = q.ySup - q.yInf;
    // the upright: a telescopic pillar (as the Piaggio MP3's) from the lower arm to the upper one, the wheel's carrier
    // sliding on it with the spring, and the stub axle out to the hub
    A.tube(dS, [0, -0.02, 0], [0, h + 0.035, 0], 0.045, M.alu);
    A.tube(dS, [0, yR - 0.05, 0], [0, yR + 0.05, 0], 0.06, M.stanch);
    A.muelle(dS, [0, yR + 0.06, 0], [0, h - 0.02, 0], 0.034, 6, M.muelle);
    A.tube(dS, [0, yR, 0], [0, yR, s * (q.e - q.w / 2 - 0.004)], 0.03, M.black);
    if (q.eje === 'del') A.tube(dS, [0, yR + 0.02, 0], [0.09, yR + 0.04, -s * 0.03], 0.018, M.alu);   // the steering arm
    if (q.eje === 'del' && m.pod) {
      const dC = esquinaGrupo(G.carenado, q), pod = carenadoDe(m, s), mesh = new THREE.Mesh(pod.geo, M.body);
      mesh.position.set(0, yR, s * q.e); mesh.castShadow = true; mesh.name = 'carenado'; dC.add(mesh);
      for (const l of pod.labios) {
        const pts = l.map(p => new THREE.Vector3(p[0], p[1] + yR, p[2] + s * q.e)), lip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.006, 6, false), M.bajos);
        dC.add(lip);
      }
      // a small light at the fairing's nose, as the Aptera's
      A.sphere(dC, [m.pod.x1 - 0.012, yR + 0.02, s * q.e], 0.022, M.faro, [0.6, 0.5, 1.4]);
    }
  }
  // the arms: one across the car at each of the four pivots (lower and upper, front and rear), with the frame's shaft
  for (const eje of ['del', 'tras'] as const) {
    const q = m.esquinas.find(e => e.eje === eje)!;
    for (const [n, y] of [['inf', q.yInf], ['sup', q.ySup]] as const) {
      const g = new THREE.Group(); g.name = `brazo-${eje}-${n}`; g.userData.brazo = eje; g.position.set(q.x, y, 0); G.suspension.add(g);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.028, 2 * q.Lk + 0.04), M.susp); b.castShadow = true; g.add(b);
      for (const s of [1, -1]) A.tube(g, [-0.035, 0, s * q.Lk], [0.035, 0, s * q.Lk], 0.03, M.black);
      A.tube(g, [-0.06, 0, 0], [0.06, 0, 0], 0.04, M.black);
      A.tube(G.chasis, [q.x - 0.08, y, 0], [q.x + 0.08, y, 0], 0.022, M.stanch);
    }
  }
  // the tilt actuator: a motor with its reduction box on the front tower, driving the lower arm
  { const a = m.actuador.c; A.disk(G.suspension, [a[0] - 0.09, a[1], 0], m.actuador.r, m.actuador.largo * 0.6, M.motor); A.cajaRedonda(G.suspension, [a[0] - 0.09, a[1] - 0.06, 0], [0.09, 0.07, 0.10], M.carcasa, 0.01); }

  // ── the frame
  for (const t of m.tubos) { if (t.curva) A.tuboCurvo(G.chasis, t.curva as V3[], t.d, M.alu); else A.tube(G.chasis, t.a as V3, t.b as V3, t.d, M.alu); }
  // ── steering: the yoke, its column down to the rack, the rack across, the tie rods (they move: `posarBasculante`)
  {
    const v = m.volante, c: V3 = [v.c[0], v.c[1], 0];
    // (the Smera: a round wheel, as a car's)
    const aro = new THREE.Mesh(new THREE.TorusGeometry(v.r, m.smera ? 0.018 : 0.016, 12, 48, m.smera ? Math.PI * 2 : Math.PI * 1.55), M.black);
    aro.position.set(...c); aro.rotation.order = 'YXZ'; aro.rotation.y = Math.PI / 2; aro.rotation.x = -v.inc; aro.rotateZ(-Math.PI * 0.275 + Math.PI); aro.castShadow = true; G.direccion.add(aro);
    const barra = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 2 * v.r), M.black); barra.position.set(...c); barra.rotation.z = -v.inc; G.direccion.add(barra);
    A.sphere(G.direccion, c, 0.045, M.carcasa, [0.6, 1, 1]);
    A.tube(G.direccion, m.columna[0] as V3, m.columna[1] as V3, 0.028, M.alu);
    const k = m.cremallera; A.tube(G.direccion, [k.x, k.y, -k.z], [k.x, k.y, k.z], 0.034, M.black);
    for (const s of [1, -1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 10), M.alu); bar.name = `bieleta-${s > 0 ? 'der' : 'izq'}`; bar.userData.lado = s; G.direccion.add(bar);
    }
    // the dashboard under the windscreen: a dark shelf with the screen
    // (under the windscreen's foot, at the belt's height: since 2026-11-15 there is no bonnet of its own above it)
    const xd = m.xWs - 0.06, yd = Math.min(F.techo(xd - 0.12) - 0.16, F.sec(F.frame(xd), F.thCintura)[1] - 0.02), wd = (F.ladoZ(xd, yd) || 0.2) - 0.02;
    if (wd > 0.06) { A.cajaRedonda(G.direccion, [xd - 0.06, yd, 0], [0.16, 0.035, 2 * wd], M.black, 0.012); A.cajaRedonda(G.direccion, [xd - 0.12, yd + 0.06, 0], [0.012, 0.09, 0.20], M.glass, 0.004); }
  }
  // ── the seats: a shell along each rider's back, cushion and headrest
  m.asientos.forEach(a => { extruir(G.asientos, engrosar(a.contorno, a.grosor), a.ancho - 0.024, M.seat); });
  // the pedals and the passenger's footrests
  { const o = m.occPts(true); for (const s of [1, -1]) A.cajaRedonda(G.asientos, [o.F[0] + 0.07, o.F[1] + 0.02, s * 0.075], [0.04, 0.16, 0.07], M.black, 0.01); }
  { const o = m.occPts(false); for (const s of [1, -1]) A.cajaRedonda(G.asientos, [o.F[0] + 0.05, o.F[1] - 0.06, s * (o.anchoPiernas?.[1] ?? 0.27)], [0.20, 0.02, 0.09], M.alu, 0.006); }
  // ── the battery boxes, their orange cable, the controllers
  for (const b of m.baterias) {
    A.cajaRedonda(G.baterias, [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0], [b.x1 - b.x0, b.y1 - b.y0, 2 * b.hz], M.batt, 0.012);
    A.cajaRedonda(G.baterias, [(b.x0 + b.x1) / 2, b.y1 + 0.006, 0], [(b.x1 - b.x0) * 0.6, 0.012, b.hz], M.black, 0.004);
  }
  const iv = m.inversor; A.cajaRedonda(G.motor, [(iv.x0 + iv.x1) / 2, (iv.y0 + iv.y1) / 2, 0], [iv.x1 - iv.x0, iv.y1 - iv.y0, 2 * iv.hz], M.carcasa, 0.01);
  if (m.baterias.length) {
    const b0 = m.baterias[0], pts = [new THREE.Vector3(b0.x1, b0.y1, 0.06), new THREE.Vector3((b0.x1 + iv.x0) / 2, (b0.y1 + iv.y0) / 2 + 0.04, 0.08), new THREE.Vector3(iv.x0, (iv.y0 + iv.y1) / 2, 0.06)];
    G.baterias.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.008, 8, false), M.cableHV));
  }
  // ── the riders
  if (opc.calidad === 'completa') for (const q of m.plazas) { if (opc.sinPasajero && !q.piloto) continue; A.ocupante(G.ocupantes, A.M as never, { occPts: () => q.pts }, 0, q.piloto); }
  if (m.smera) construirDetallesSmera(G, M, m, A, puertasS);
  for (const k of Object.keys(G) as CapaB[]) G[k].traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}

const _y = new THREE.Vector3(0, 1, 0);
/**
 * The moving parts at a lean `phi` (rad, + to the right) and a steering `delta` (rad, + to the left), in the body's
 * axes (the viewer turns the car itself by φ). Cheap: only transforms, no geometry.
 */
export function posarBasculante(G: Record<CapaB, THREE.Group>, m: ModeloBasculante, phi: number, delta: number) {
  const estado = new Map<string, ReturnType<typeof esquinaEn>>();
  const B = m.batalla, t = m.via.del;
  for (const q of m.esquinas) {
    // Ackermann: the inner wheel turns `delta`, the outer one less
    let d = 0;
    if (q.eje === 'del' && Math.abs(delta) > 1e-6) { const interior = q.s * delta < 0; const di = Math.abs(delta), dout = Math.atan(B / (B / Math.tan(di) + t)); d = Math.sign(delta) * (interior ? di : dout); }
    const E = esquinaEn(q, phi, d); estado.set(q.id, E);
    for (const capa of Object.values(G)) for (const o of capa.children) {
      if (o.userData.esquina !== q.id) continue;
      o.position.set(...E.base);
      const dir = o.getObjectByName('dir'); if (dir) dir.rotation.y = d;
    }
  }
  for (const o of G.suspension.children) if (o.userData.brazo) {
    const q = m.esquinas.find(e => e.eje === o.userData.brazo)!;
    o.rotation.x = -esquinaEn(q, phi).beta;
  }
  // the tie rods: from the rack's ends to the steering arms (9 cm ahead of each upright, 4 cm over the axle)
  const k = m.cremallera;
  for (const o of G.direccion.children) if (o.name.startsWith('bieleta-')) {
    const s = o.userData.lado as 1 | -1, q = m.esquinas.find(e => e.eje === 'del' && e.s === s)!, E = estado.get(q.id)!;
    const ang = (() => { for (const c of G.ruedas.children) if (c.userData.esquina === q.id) return (c.getObjectByName('dir')?.rotation.y ?? 0); return 0; })();
    const brazo = new THREE.Vector3(0.09, q.r - q.yInf + 0.04, -s * 0.03).applyAxisAngle(_y, ang);
    const b = new THREE.Vector3(E.base[0], E.base[1], E.base[2]).add(brazo), a = new THREE.Vector3(k.x, k.y, s * k.z);
    const v = b.clone().sub(a), L = v.length();
    o.position.copy(a).addScaledVector(v, 0.5); o.quaternion.setFromUnitVectors(_y, v.normalize()); o.scale.set(1, L, 1);
  }
}

/** The dimension lines: length, wheelbase, overall width (with the fairings) and the body's, height, both tracks. */
export function cotasBasculante(g: THREE.Object3D, m: ModeloBasculante, cota: (a: V3, b: V3, ext: [V3, V3][], texto: string, off?: V3) => void, mm: (v: number) => string) {
  const y = 0.004, W = m.anchoTotal, zL = -(W / 2 + 0.38), zB = -(W / 2 + 0.16);
  cota([m.xt, y, zL], [m.xn, y, zL], [[[m.xt, y, 0], [m.xt, y, zL - 0.05]], [[m.xn, y, 0], [m.xn, y, zL - 0.05]]], `largo ${mm(m.Lf)}`, [0.55, 0.11, -0.08]);
  cota([m.xR, y, zB], [0, y, zB], [[[m.xR, y, 0], [m.xR, y, zB - 0.04]], [[0, y, -W / 2 + 0.1], [0, y, zB - 0.04]]], `batalla ${mm(m.batalla)}`, [-0.35, 0.11, 0.04]);
  const xA = m.xn + 0.40;
  cota([xA, y, -W / 2], [xA, y, W / 2], [[[0, y, -W / 2], [xA + 0.05, y, -W / 2]], [[0, y, W / 2], [xA + 0.05, y, W / 2]]], `ancho ${mm(W)}`, [0.12, 0.1, 0]);
  const xC = -1.2, hw = m.anchoCuerpo / 2;
  cota([xC, 0.62, -hw], [xC, 0.62, hw], [], `carrocería ${mm(m.anchoCuerpo)}`, [0.10, 0.12, 0]);
  const xH = m.xt - 0.30, xTope = -m.campos.qCaida;
  cota([xH, 0, zL], [xH, m.alto, zL], [[[xH - 0.05, m.alto, zL], [xTope, m.alto, zL]]], `alto ${mm(m.alto)}`, [-0.36, 0, 0]);
  cota([0, y, -m.via.del / 2], [0, y, m.via.del / 2], [], `vía del. ${mm(m.via.del)}`, [0.30, 0.11, 0]);
  cota([m.xR, y, -m.via.tras / 2], [m.xR, y, m.via.tras / 2], [], `vía tras. ${mm(m.via.tras)}`, [-0.30, 0.11, 0]);
}
