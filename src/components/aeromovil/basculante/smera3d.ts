// ============================================================================
// CUADRICICLO BASCULANTE · the Smera body's details in 3D (2026-11-15)
// ============================================================================
// What the skin alone does not carry (basculante/smera.ts has the measures):
// the mudguards on the wheels (the front ones steer and lean with them), the
// headlamp clusters (a black teardrop housing with three round lamps on a
// diagonal, each in a chrome ring), the low black bumper bar, the roof's visor
// and its two fins over the rear window, the tail lamps, the plate and the
// rear bumper, and the door handles (on the doors, so they open with them).
import * as THREE from 'three';
import type { ModeloBasculante } from '../geometriaBasculante';
import type { AyudasVisor, CapaB, MatsB } from './modelo3d';

type V3 = [number, number, number];

/** A mesh from a grid of points (rows × columns), both faces drawn. */
function rejilla(pts: V3[][], mat: THREE.Material): THREE.Mesh {
  const pos: number[] = [], idx: number[] = [], nj = pts[0].length;
  for (const fila of pts) for (const p of fila) pos.push(...p);
  for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < nj - 1; j++) { const a = i * nj + j, b = a + nj; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}

/** A side-view outline extruded across the car between z0 and z1 (rounded edges). */
function extruirZ(pts: [number, number][], z0: number, z1: number, mat: THREE.Material): THREE.Mesh {
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) sh.lineTo(p[0], p[1]); sh.closePath();
  const ancho = Math.abs(z1 - z0), geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.002, ancho - 0.012), bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, Math.min(z0, z1) + 0.006);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m;
}

/**
 * Where the skin is at a height y and a distance z off the centre line, coming from the front: the foremost x whose
 * section reaches that far out at that height, and the surface's normal there (pointing out).
 */
function enFrente(m: ModeloBasculante, y: number, z: number): { p: THREE.Vector3; n: THREE.Vector3 } | null {
  const F = m.F, xEn = (yy: number, zz: number) => { for (let x = m.xn; x > m.xt; x -= 0.002) { const w = F.ladoZ(x, yy); if (Number.isFinite(w) && w >= Math.abs(zz)) return x; } return NaN; };
  const x = xEn(y, z); if (!Number.isFinite(x)) return null;
  const e = 0.01, dy = (xEn(y + e, z) - xEn(y - e, z)) / (2 * e), dz = (xEn(y, Math.abs(z) + e) - xEn(y, Math.abs(z) - e)) / (2 * e) * Math.sign(z || 1);
  const n = new THREE.Vector3(1, Number.isFinite(dy) ? -dy : 0, Number.isFinite(dz) ? -dz : 0).normalize();
  return { p: new THREE.Vector3(x, y, z), n };
}

/** The details. `puertas`: the two door pivots (+1 right, −1 left), for the handles. */
export function construirDetallesSmera(G: Record<CapaB, THREE.Group>, M: MatsB, m: ModeloBasculante, A: AyudasVisor, puertas: Map<1 | -1, THREE.Group>) {
  const d = m.det, F = m.F; if (!d) return;
  const pintura = (M.body as THREE.Material).clone(); pintura.side = THREE.DoubleSide;
  const negro = (M.bajos as THREE.Material).clone(); negro.side = THREE.DoubleSide;
  const blanco = new THREE.MeshStandardMaterial({ color: 0xf1f1ee, roughness: 0.45, metalness: 0.0 });

  // ── the mudguards: in each corner's group, the front ones in its steering child (they turn and lean with the wheel)
  for (const q of m.esquinas) {
    const s = q.s, yR = q.r - q.yInf, R = q.r + 0.032, [a0, a1] = q.eje === 'del' ? d.guardabarrosDel : d.guardabarrosTras;
    const filas: V3[][] = [];
    for (let k = 0; k <= 28; k++) {
      const a = (a0 + (a1 - a0) * k / 28) * Math.PI / 180, x = -R * Math.sin(a), y = yR + R * Math.cos(a);
      filas.push([[x, y, s * (q.e - q.w / 2 - 0.018)], [x * 1.03, y + (y - yR) * 0.03, s * q.e], [x, y, s * (q.e + q.w / 2 + 0.022)]]);
    }
    const guard = rejilla(filas, pintura); guard.name = 'guardabarros';
    const grupo = new THREE.Group(); grupo.name = `esq-${q.id}`; grupo.userData.esquina = q.id;
    const dir = new THREE.Group(); dir.name = 'dir'; grupo.add(dir); G.carenado.add(grupo);
    (q.eje === 'del' ? dir : grupo).add(guard);
    // its black edge, as the car's
    const borde = new THREE.CatmullRomCurve3(filas.map(f => new THREE.Vector3(...f[2])));
    (q.eje === 'del' ? dir : grupo).add(new THREE.Mesh(new THREE.TubeGeometry(borde, 40, 0.005, 6, false), M.bajos));
  }

  // ── the bumper bar, low at the front between the wheels
  { const b = d.barra; A.cajaRedonda(G.carenado, [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, 0], [b.x1 - b.x0, b.y1 - b.y0, 2 * b.hz], M.bajos, 0.02); }

  // ── the headlamp clusters: a black teardrop housing on the nose's upper corner, three lamps on its diagonal
  for (const s of [1, -1] as const) {
    const f = enFrente(m, d.faro.y, s * d.faro.z); if (!f) continue;
    const n = f.n, arriba = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize(), lado = new THREE.Vector3().crossVectors(n, arriba).normalize();
    // the diagonal, from its tip (down and in, towards the centre) up and out (`lado` points to +z on either side)
    const diag = arriba.clone().multiplyScalar(Math.cos(0.45)).addScaledVector(lado, s * Math.sin(0.45)).normalize();
    const caja = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), M.bajos);
    const base = new THREE.Matrix4().makeBasis(n, diag, new THREE.Vector3().crossVectors(n, diag).normalize());
    caja.quaternion.setFromRotationMatrix(base); caja.scale.set(0.022, d.faro.alto / 2, d.faro.ancho / 2);
    caja.position.copy(f.p).addScaledVector(n, 0.004); caja.castShadow = true; G.carenado.add(caja);
    for (const [t, r] of [[-0.30, 0.034], [0.05, 0.027], [0.34, 0.023]] as const) {
      const c = f.p.clone().addScaledVector(diag, t * d.faro.alto).addScaledVector(n, 0.016);
      const lente = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), M.faro); lente.position.copy(c); lente.scale.set(0.55, 1, 1);
      lente.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), n); G.carenado.add(lente);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.0045, 8, 32), M.alu); aro.position.copy(c);
      aro.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); G.carenado.add(aro);
    }
  }

  // ── the roof's visor over the rear window, and its two fins
  {
    // (as wide as the roof is high there: it ends where the roof's sides have come down past it)
    const xV = d.visera[0][0], f = F.frame(xV), yV = d.visera[0][1] - 0.012;
    const hw = Number.isFinite(F.ladoZ(xV, yV)) ? F.ladoZ(xV, yV) : f.hw * 0.6;
    G.carenado.add(extruirZ(d.visera, -hw, hw, pintura));
  }

  // ── the tail: the lamps (red over amber) on the rounded back's corners, the plate on its flat middle and the bumper
  {
    // where the back is at (y, z), coming from behind, and its outward normal there (x = xr(y, z) seen from behind)
    const xt = m.xt, xr = (y: number, z: number) => { for (let x = m.xt; x < m.xn; x += 0.002) { const w = F.ladoZ(x, y); if (Number.isFinite(w) && w >= Math.abs(z)) return x; } return NaN; };
    const detras = (y: number, z: number): { p: THREE.Vector3; n: THREE.Vector3 } => {
      const x = xr(y, z); if (!Number.isFinite(x)) return { p: new THREE.Vector3(xt, y, z), n: new THREE.Vector3(-1, 0, 0) };
      const e = 0.012, dy = (xr(y + e, z) - xr(y - e, z)) / (2 * e), dz = (xr(y, Math.abs(z) + e) - xr(y, Math.max(0, Math.abs(z) - e))) / (Math.abs(z) + e - Math.max(0, Math.abs(z) - e)) * Math.sign(z || 1);
      return { p: new THREE.Vector3(x, y, z), n: new THREE.Vector3(-1, Number.isFinite(dy) ? dy : 0, Number.isFinite(dz) ? dz : 0).normalize() };
    };
    const disco = (y: number, z: number, r: number, mat: THREE.Material) => {
      const { p, n } = detras(y, z), eje = n.lengthSq() > 0 ? n : new THREE.Vector3(-1, 0, 0);
      const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.014, 28), mat); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje); g.position.copy(p).addScaledVector(eje, 0.003); G.carenado.add(g);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(r + 0.004, 0.004, 8, 28), M.alu); aro.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), eje); aro.position.copy(p).addScaledVector(eje, 0.006); G.carenado.add(aro);
    };
    d.pilotos.forEach(([y, z], k) => { for (const s of [1, -1]) disco(y, s * z, k === 0 ? 0.042 : 0.034, k === 0 ? M.piloto : M.intermitenteD); });
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.008, d.matricula.alto, d.matricula.ancho), blanco); pl.position.set(xt - 0.006, d.matricula.y, 0); G.carenado.add(pl);
    const pt = d.paragolpesTras; A.cajaRedonda(G.carenado, [xt + 0.01, (pt.y0 + pt.y1) / 2, 0], [0.06, pt.y1 - pt.y0, 2 * pt.hz], M.bajos, 0.015);
  }

  // ── the door handles, on the doors
  for (const s of [1, -1] as const) {
    const [x, y] = d.manilla, z = F.ladoZ(x, y); if (!Number.isFinite(z)) continue;
    const piv = puertas.get(s), mango = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.075, 4, 10), M.alu);
    mango.rotation.z = Math.PI / 2 - 0.12; mango.position.set(x, y, s * (z + 0.007));
    if (piv) { mango.position.sub(piv.position); piv.add(mango); } else G.carenado.add(mango);
  }
  for (const k of Object.keys(G) as CapaB[]) G[k].traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}
