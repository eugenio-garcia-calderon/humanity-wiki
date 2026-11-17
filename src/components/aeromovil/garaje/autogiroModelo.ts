import * as THREE from 'three';
import { parche, semiAnchoEn, thetaEnAltura, type Est } from './forma';
import {
  ALTO, HELICE, HELICE_CENTRO, INCLINACION_ROTOR, MASTIL_BASE, MASTIL_CABEZA, POD, ROTOR, R_MORRO, R_PRINCIPAL,
  VIA_PRINCIPAL, X_PRINCIPAL, Y_ROTOR, bordeCupula,
} from './autogiroForma';

/*
 * The ELA Eclipse REVO autogyro's mesh (2026-11-17, Eugenio with a photo: «haz un modelo 3D del autogiro de ELA
 * Aviación, el último modelo»). Parked: rotor blades fore and aft, as it stands on the apron. Copper satin paint like
 * the photo. Generic geometry only: no maker's lettering and no registration.
 * Parts: the pod with its bubble canopy (one skin), two tandem seats and the panel inside, the faired rotor mast with
 * its head and two blades, the engine cowl, a 3-blade pusher propeller with spinner, the tail boom under the propeller,
 * a horizontal stabiliser with a fin at each tip and a central fin, the nose wheel on its fork, and the main wheels in
 * spats on flat spring-steel legs.
 */

type V3 = [number, number, number];

/** A mesh from rows of points (rows × columns). */
function rejilla(filas: V3[][], mat: THREE.Material, cerrar = false): THREE.Mesh {
  const pos: number[] = [], idx: number[] = [], nj = filas[0].length;
  for (const f of filas) for (const p of f) pos.push(...p);
  const nc = cerrar ? nj : nj - 1;
  for (let i = 0; i < filas.length - 1; i++) for (let j = 0; j < nc; j++) {
    const a = i * nj + j, b = i * nj + (j + 1) % nj, c = a + nj, d = b + nj;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}
/** Symmetric aerofoil (NACA 00xx), closed: trailing edge, over the top to the nose, back under. u along the chord. */
function perfil(espesor: number, n = 12): [number, number][] {
  const yt = (u: number) => 5 * espesor * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const u = 1 - (1 - Math.cos(Math.PI * i / n)) / 2; out.push([u, yt(u)]); }
  for (let i = 1; i < n; i++) { const u = (1 - Math.cos(Math.PI * i / n)) / 2; out.push([u, -yt(u)]); }
  return out;
}
/**
 * A tail surface between two sections. Each section: leading-edge point (x, y, z), chord (along −x) and thickness.
 * `normal` is the thickness direction: [0,1,0] for a horizontal surface, [0,0,1] for a vertical fin.
 */
function superficie(secs: { p: V3; cuerda: number; t: number }[], normal: V3, mat: THREE.Material): THREE.Mesh {
  const fila = (s: { p: V3; cuerda: number; t: number }, plano = false) =>
    perfil(s.t).map(([u, v]) => { const e = plano ? 0 : v * s.cuerda; return [s.p[0] - u * s.cuerda, s.p[1] + e * normal[1], s.p[2] + e * normal[2]] as V3; });
  const filas = secs.map(s => fila(s));
  filas.unshift(fila(secs[0], true)); filas.push(fila(secs[secs.length - 1], true));
  return rejilla(filas, mat, true);
}
/** A cylinder from a to b. */
function barra(a: V3, b: V3, r: number, mat: THREE.Material, r2 = r): THREE.Mesh {
  const A = new THREE.Vector3(...a), v = new THREE.Vector3(...b).sub(A), L = v.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, L, 14), mat);
  m.position.copy(A).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize());
  return m;
}

export function construir(): THREE.Group {
  const g = new THREE.Group();
  const cobre = new THREE.MeshPhysicalMaterial({ color: 0xb4683a, roughness: 0.42, metalness: 0.78, clearcoat: 0.35, clearcoatRoughness: 0.35, side: THREE.DoubleSide });
  const vidrio = new THREE.MeshPhysicalMaterial({ color: 0x5f8fa8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.38, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const negro = new THREE.MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.6, metalness: 0.2 });
  const grafito = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.45, metalness: 0.3 });
  const goma = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.92 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xc3c8cd, roughness: 0.3, metalness: 0.85 });
  const tapiz = new THREE.MeshStandardMaterial({ color: 0x34383d, roughness: 0.85 });

  // ── pod: two patches of the same skin that meet on the canopy's edge (a smooth line, not the mesh's steps).
  // The glass covers the section from its lower edge on one side, over the top, to the other side; the paint the rest.
  const x0 = POD[0].x, x1 = POD[POD.length - 1].x, opc = { delta: 0, nx: 150, nth: 56 };
  const tCupula = (e: Est) => { const y = bordeCupula(e.x); return y < e.yt - 0.005 ? thetaEnAltura(e, Math.max(y, e.yb + 0.005)) : null; };
  const piel = new THREE.Mesh(parche(POD, x0, x1, e => { const t = tCupula(e); return t == null ? [-Math.PI / 2, 1.5 * Math.PI] : [Math.PI - t, 2 * Math.PI + t]; }, opc), cobre);
  piel.name = 'fuselaje'; g.add(piel);
  const cupula = new THREE.Mesh(parche(POD, x0, x1, e => { const t = tCupula(e); return t == null ? null : [t, Math.PI - t]; }, { ...opc, nth: 40 }), vidrio);
  cupula.name = 'cupula'; cupula.renderOrder = 2; g.add(cupula);
  // the nose tip closed with a small cone (the skin narrows to 8 mm there)
  { const c = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), cobre); c.position.set(x0, (POD[0].yb + POD[0].yt) / 2, 0); g.add(c); }
  // the landing light under the nose's cheek, one a side (a dark lens)
  for (const s of [1, -1]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), negro); l.scale.set(0.1, 0.035, 0.02);
    l.position.set(-0.05, 0.62, s * 0.255); l.rotation.y = s * 0.45; g.add(l);
  }
  // the recessed step panel low on each side
  for (const s of [1, -1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.13, 0.008), cobre); p.position.set(-0.75, 0.55, s * (semiAnchoEn(POD, -0.75, 0.55) + 0.004)); p.rotation.x = s * 0.12; g.add(p);
  }

  // ── inside: two tandem seats (the rear one higher) and the instrument panel
  for (const [x, y] of [[-0.5, 0.42], [-1.22, 0.5]] as [number, number][]) {
    const asiento = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.42), tapiz); asiento.position.set(x, y, 0); g.add(asiento);
    const resp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.62, 0.42), tapiz); resp.position.set(x - 0.27, y + 0.3, 0); resp.rotation.z = 0.28; g.add(resp);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.22), tapiz); cab.position.set(x - 0.38, y + 0.68, 0); cab.rotation.z = 0.28; g.add(cab);
    g.add(barra([x + 0.32, y + 0.02, 0], [x + 0.28, y + 0.38, 0], 0.012, negro)); // control stick
  }
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.4), grafito); panel.position.set(-0.3, 0.9, 0); panel.rotation.z = -0.5; g.add(panel);
  const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.15), new THREE.MeshStandardMaterial({ color: 0x0c2233, emissive: 0x0a2a40, roughness: 0.2 }));
  pantalla.position.set(-0.355, 0.92, 0); pantalla.rotation.set(0, -Math.PI / 2, 0); pantalla.rotateX(-0.5); g.add(pantalla);

  // ── rotor mast: a faired pylon, thin across the airflow, slightly raked back
  {
    const [xb, yb] = MASTIL_BASE, [xc, yc] = MASTIL_CABEZA;
    const m = barra([xb, yb, 0], [xc, yc, 0], 0.14, cobre, 0.07); m.scale.z = 0.42; m.name = 'mastil'; g.add(m);
    // its root fairing on the cowl
    const raiz = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), cobre); raiz.scale.set(0.3, 0.12, 0.13); raiz.position.set(xb - 0.02, yb + 0.02, 0); g.add(raiz);
    // rotor head: block, teeter bolt and hub bar; the whole rotor tilted back
    const rotor = new THREE.Group(); rotor.position.set(xc, yc, 0); rotor.rotation.z = INCLINACION_ROTOR; rotor.name = 'rotor'; g.add(rotor);
    const cabeza = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.1), metal); cabeza.position.y = 0.04; rotor.add(cabeza);
    rotor.add(barra([0, Y_ROTOR - yc, -0.07], [0, Y_ROTOR - yc, 0.07], 0.018, metal));
    const buje = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), metal); buje.position.y = Y_ROTOR - yc; rotor.add(buje);
    // two blades fore and aft (parked), 0.2 m chord, dark grey; a slight droop at rest
    const R = ROTOR / 2, cuerda = 0.2;
    for (const s of [1, -1]) {
      const filas: V3[][] = [];
      for (let k = 0; k <= 10; k++) {
        const r = 0.22 + (R - 0.22) * k / 10, caida = -0.05 * (k / 10) ** 2;
        filas.push(perfil(0.12, 8).map(([u, v]) => [s * r, Y_ROTOR - yc + caida + v * cuerda, s * (cuerda * 0.25 - u * cuerda)] as V3));
      }
      const pala = rejilla(filas, grafito, true); pala.name = 'pala'; rotor.add(pala);
    }
  }

  // ── pusher propeller: spinner and three blades (Helix-type composite), black
  {
    const [xh, yh] = HELICE_CENTRO;
    const helice = new THREE.Group(); helice.position.set(xh, yh, 0); helice.name = 'helice'; g.add(helice);
    const cono = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 24), negro); cono.rotation.z = Math.PI / 2; cono.position.x = -0.1; helice.add(cono);
    const R = HELICE / 2;
    for (let k = 0; k < 3; k++) {
      const a = k * 2 * Math.PI / 3, filas: V3[][] = [];
      for (let i = 0; i <= 8; i++) {
        const r = 0.08 + (R - 0.08) * i / 8, c = 0.11 * (1 - 0.45 * i / 8), paso = 0.55 - 0.3 * i / 8;
        filas.push(perfil(0.1, 6).map(([u, v]) => {
          const ch = (0.5 - u) * c, th = v * c;
          // chord in the plane of rotation turned by the pitch
          const ax = -ch * Math.sin(paso) + th * Math.cos(paso), tg = ch * Math.cos(paso) + th * Math.sin(paso);
          return [ax, r * Math.cos(a) - tg * Math.sin(a), r * Math.sin(a) + tg * Math.cos(a)] as V3;
        }));
      }
      helice.add(rejilla(filas, negro, true));
    }
    // exhaust stub under the cowl
    g.add(barra([-2.2, 0.68, 0.13], [-2.42, 0.62, 0.15], 0.025, metal));
  }

  // ── tail boom: from the keel, low under the propeller disc, rising to the tail
  {
    const curva = new THREE.CatmullRomCurve3([[-1.7, 0.36, 0], [-2.4, 0.27, 0], [-3.2, 0.36, 0], [-3.85, 0.6, 0], [-4.3, 0.82, 0]].map(p => new THREE.Vector3(...p as V3)));
    const boom = new THREE.Mesh(new THREE.TubeGeometry(curva, 48, 0.05, 12), cobre); boom.name = 'botalon'; g.add(boom);
  }
  // ── tail: horizontal stabiliser, a fin at each tip and the central fin
  {
    const yS = 0.84, semi = 0.8;
    const est = superficie([{ p: [-4.16, yS, -semi], cuerda: 0.36, t: 0.12 }, { p: [-4.12, yS, 0], cuerda: 0.44, t: 0.12 }, { p: [-4.16, yS, semi], cuerda: 0.36, t: 0.12 }], [0, 1, 0], cobre);
    est.name = 'estabilizador'; g.add(est);
    for (const s of [1, -1]) {
      const f = superficie([{ p: [-4.14, 0.6, s * semi], cuerda: 0.36, t: 0.1 }, { p: [-4.17, yS, s * semi], cuerda: 0.4, t: 0.1 }, { p: [-4.36, 1.28, s * semi], cuerda: 0.26, t: 0.1 }], [0, 0, 1], cobre);
      f.name = 'deriva'; g.add(f);
    }
    const central = superficie([{ p: [-4.12, 0.62, 0], cuerda: 0.4, t: 0.11 }, { p: [-3.98, 0.86, 0], cuerda: 0.66, t: 0.12 }, { p: [-4.3, 1.52, 0], cuerda: 0.36, t: 0.1 }], [0, 0, 1], cobre);
    central.name = 'deriva'; g.add(central);
  }

  // ── landing gear: nose wheel on a fork, the mains in spats on flat spring-steel legs
  const rueda = (r: number, w: number, x: number, z: number) => {
    const n = new THREE.Mesh(new THREE.TorusGeometry(r - w * 0.38, w * 0.45, 12, 32), goma); n.position.set(x, r, z); g.add(n);
    const llanta = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, w * 0.75, 24), metal); llanta.rotation.x = Math.PI / 2; llanta.position.set(x, r, z); g.add(llanta);
  };
  rueda(R_MORRO, 0.12, 0, 0);
  for (const s of [1, -1]) g.add(barra([0, R_MORRO, s * 0.075], [-0.04, 0.47, s * 0.05], 0.016, cobre));
  g.add(barra([-0.04, 0.47, 0], [-0.05, 0.52, 0], 0.03, metal));
  for (const s of [1, -1]) {
    const z = s * VIA_PRINCIPAL / 2;
    rueda(R_PRINCIPAL, 0.13, X_PRINCIPAL, z);
    // spring-steel leg: a flat bar from the keel to the axle
    const a = new THREE.Vector3(-1.72, 0.36, s * 0.2), b = new THREE.Vector3(X_PRINCIPAL + 0.02, R_PRINCIPAL + 0.03, z - s * 0.1);
    const v = b.clone().sub(a), pata = new THREE.Mesh(new THREE.BoxGeometry(0.075, v.length(), 0.018), cobre);
    pata.position.copy(a).addScaledVector(v, 0.5); pata.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(pata);
    // spat: the top of an egg over the wheel, open underneath
    const tapa = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), cobre);
    tapa.scale.set(0.34, 0.27, 0.12); tapa.position.set(X_PRINCIPAL - 0.03, R_PRINCIPAL + 0.02, z); tapa.name = 'carenado'; g.add(tapa);
  }

  g.traverse(o => { if ((o as THREE.Mesh).isMesh) { const m = o as THREE.Mesh; m.castShadow = m.material !== vidrio; m.receiveShadow = true; } });
  g.userData.alto = ALTO;
  return g;
}
