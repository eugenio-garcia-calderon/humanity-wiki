import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';
import { E, loft, semiAnchoEn, type Est } from './forma';

/*
 * The Cirrus Vision Jet SF50 G2 (2026-11-15, Eugenio, with a photo of one in flight: «Haz un modelo 3d de este avión
 * exacto, el modelo tal cual y ponlo en el garaje»). On the ground, gear down, in the garage's axes: x forward (nose
 * gear at x = 0), y up, z to the right; metres. No maker's marks and no registration.
 *
 * SOURCED (globalair.com, «Vision SF50-G2 specifications»)
 * - Length 30 ft 11 in (9.42 m), wingspan 38 ft 8 in (11.79 m), height 10 ft 11 in (3.33 m).
 * - Cabin 5 ft 1 in wide (1.55 m), 4 ft 1 in high (1.24 m), 11 ft 6 in long (3.51 m).
 * - Empty 3 550 lb (1 610 kg), maximum take-off 6 000 lb; one Williams FJ33-5A turbofan; 317 kt maximum (587 km/h).
 *
 * FROM PHOTOS (no published figure): the stations, the wing's chords, sweep and dihedral, the V-tail's 42° and its
 * chords, the nacelle on the spine behind the cabin, the gear's positions and tracks. Estimates, sized so the
 * published length, span and height come out.
 */
export const LARGO = 9.42, ENVERGADURA = 11.79, ALTO = 3.33;
/** Nose tip and tail tip in x (m): the nose gear at x = 0. */
const X_PUNTA = 1.55, X_COLA = X_PUNTA - LARGO;
/** Main gear: behind the nose gear and its track (m). */
const X_PRINCIPAL = -3.3, VIA_PRINCIPAL = 3.0;

/** The fuselage, nose to tail cone: x, belly, top, half-widths low / middle / high. */
const FUSELAJE: Est[] = [
  E(X_PUNTA, 0.94, 0.98, 0.02, 0.025, 0.02, 2),
  E(1.47, 0.76, 1.12, 0.13, 0.19, 0.12, 2.1),
  E(1.22, 0.62, 1.36, 0.28, 0.38, 0.24, 2.2),
  E(0.80, 0.53, 1.63, 0.43, 0.58, 0.34, 2.3),
  E(0.30, 0.50, 1.92, 0.54, 0.73, 0.44, 2.4),
  E(-0.30, 0.50, 2.07, 0.60, 0.80, 0.54, 2.5),
  E(-1.20, 0.52, 2.10, 0.62, 0.82, 0.58, 2.5),
  E(-2.40, 0.55, 2.08, 0.60, 0.80, 0.56, 2.5),
  E(-3.40, 0.62, 2.02, 0.54, 0.73, 0.50, 2.4),
  E(-4.50, 0.78, 1.92, 0.44, 0.57, 0.42, 2.3),
  E(-5.60, 0.98, 1.86, 0.31, 0.41, 0.31, 2.2),
  E(-6.60, 1.18, 1.80, 0.17, 0.24, 0.19, 2.1),
  E(-7.25, 1.38, 1.72, 0.07, 0.10, 0.08, 2),
  E(-7.40, 1.52, 1.57, 0.015, 0.02, 0.015, 2),
];

/** The dark front: the nose's top and the cockpit, down to a line that sweeps back along the windows. */
function oscuro(x: number, y: number): boolean {
  if (x < -2.9) return false;
  const yLinea = 0.98 + 0.34 * Math.min(1, Math.max(0, (X_PUNTA - x) / 2.0));
  const xFin = -0.95 - (2.05 - y) * 1.15;
  // and the band along the side windows, ending in a point behind the second one
  const banda = y > 1.30 && y < 1.88 && x > -2.40 + Math.abs(y - 1.59) * 1.6;
  return y > yLinea && (x > xFin || banda);
}
/** The windscreen and the cockpit's side windows (glass inside the dark front). */
/** The cabin's oval windows, two a side behind the cockpit: centre x, y and half-axes. */
const VENTANAS: [number, number, number, number][] = [[-1.42, 1.58, 0.21, 0.19], [-2.02, 1.58, 0.21, 0.19]];
function cristal(x: number, y: number, z: number): boolean {
  if (x < 0.75 && x > -0.25 && y > 1.40 + (0.75 - x) * 0.1 && y < 2.0) return true;
  if (x < -0.25 && x > -0.95 && y > 1.38 && y < 1.86 && Math.abs(z) > 0.5) return true;
  return Math.abs(z) > 0.45 && VENTANAS.some(([xc, yc, a, b]) => ((x - xc) / a) ** 2 + ((y - yc) / b) ** 2 < 1);
}

type V3 = [number, number, number];
/** A mesh from rows of points (rows × columns), both faces drawn. */
function rejilla(filas: V3[][], mat: THREE.Material, cerrar = false): THREE.Mesh {
  const pos: number[] = [], idx: number[] = [], nj = filas[0].length;
  for (const f of filas) for (const p of f) pos.push(...p);
  const nc = cerrar ? nj : nj - 1;
  for (let i = 0; i < filas.length - 1; i++) for (let j = 0; j < nc; j++) {
    const a = i * nj + j, b = i * nj + (j + 1) % nj, c = a + nj, d = b + nj;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
}
/** A symmetric aerofoil (NACA 00xx thickness), closed: points from the trailing edge over the top to the nose and back under. */
function perfil(espesor: number, n = 22): [number, number][] {
  const yt = (u: number) => 5 * espesor * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4);
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const u = 1 - (1 - Math.cos(Math.PI * i / n)) / 2; out.push([u, yt(u)]); }
  for (let i = 1; i < n; i++) { const u = (1 - Math.cos(Math.PI * i / n)) / 2; out.push([u, -yt(u)]); }
  return out;
}
/**
 * A lifting surface from root to tip: at each span station its leading edge (x), its chord, the point its chord line
 * passes through (y, z), the direction "up" of its section (for a dihedral) and its thickness ratio.
 */
function superficie(estaciones: { x: number; cuerda: number; p: [number, number]; arriba: [number, number]; t: number }[], mat: THREE.Material): THREE.Mesh {
  const filas: V3[][] = estaciones.map(e => perfil(e.t).map(([u, v]) => [e.x - u * e.cuerda, e.p[0] + v * e.cuerda * e.arriba[0], e.p[1] + v * e.cuerda * e.arriba[1]] as V3));
  // the tip closed by a row shrunk onto its chord line
  const u = estaciones[estaciones.length - 1];
  filas.push(perfil(u.t).map(([s]) => [u.x - s * u.cuerda, u.p[0], u.p[1]] as V3));
  return rejilla(filas, mat, true);
}

function construir(): THREE.Group {
  const g = new THREE.Group();
  const blanco = new THREE.MeshPhysicalMaterial({ color: 0xf1f2f4, roughness: 0.32, metalness: 0.05, clearcoat: 0.8, clearcoatRoughness: 0.15 });
  const azul = new THREE.MeshPhysicalMaterial({ color: 0x18202e, roughness: 0.22, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
  const vidrio = new THREE.MeshPhysicalMaterial({ color: 0x0a1018, roughness: 0.04, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.02 });
  const gris = new THREE.MeshStandardMaterial({ color: 0x8d949c, roughness: 0.45, metalness: 0.4 });
  const negro = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.7 });
  const goma = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb8bec5, roughness: 0.3, metalness: 0.85 });

  // ── fuselage: paint, the dark front and the glass are one surface
  const geo = loft(FUSELAJE, { N: 200, sub: 24, nClases: 3, clase: (x, y, z) => (cristal(x, y, z) ? 2 : oscuro(x, y) ? 1 : 0) });
  const fus = new THREE.Mesh(geo, [blanco, azul, vidrio]); fus.castShadow = true; fus.receiveShadow = true; fus.name = 'fuselaje'; g.add(fus);

  // (the cabin's oval windows are glass in the same skin: `VENTANAS`; a dark rim round each)
  for (const sd of [1, -1]) for (const [x, y, a, b] of VENTANAS) {
    const z = semiAnchoEn(FUSELAJE, x, y);
    const marco = new THREE.Mesh(new THREE.TorusGeometry(1, 0.03, 6, 48), metal); marco.scale.set(a + 0.005, b + 0.005, 0.2);
    marco.position.set(x, y, sd * (z + 0.004)); marco.rotation.y = sd > 0 ? 0 : Math.PI; g.add(marco);
  }
  // the main door's seam on the left side (a thin dark line)
  { const z = semiAnchoEn(FUSELAJE, -1.75, 1.2); const c = new THREE.Mesh(new THREE.TorusGeometry(1, 0.004, 4, 48), negro); c.scale.set(0.55, 0.6, 1); c.position.set(-1.75, 1.25, -(z + 0.003)); c.rotation.y = Math.PI; g.add(c); }

  // ── wing: low, 5° dihedral, slight sweep, small upturned tips (winglets); its root inside the fuselage
  const yRaiz = 0.72, diedro = 5 * Math.PI / 180, semi = ENVERGADURA / 2;
  for (const s of [1, -1]) {
    const est: Parameters<typeof superficie>[0] = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12, z = 0.45 + (semi - 0.32 - 0.45) * t;
      est.push({ x: -1.90 - 0.55 * t, cuerda: 2.15 - 1.15 * t, p: [yRaiz + (z - 0.45) * Math.tan(diedro), s * z], arriba: [Math.cos(diedro), -s * Math.sin(diedro)], t: 0.15 - 0.04 * t });
    }
    // the winglet: turning up over the last 0.32 m of span
    const u = est[est.length - 1];
    for (let k = 1; k <= 5; k++) {
      const a = (k / 5) * 1.15, r = 0.30, zc = Math.abs(u.p[1]), yc = u.p[0] + r;
      const z = zc + r * Math.sin(a), y = yc - r * Math.cos(a);
      est.push({ x: u.x - 0.05 * k, cuerda: u.cuerda * (1 - 0.07 * k), p: [y, s * z], arriba: [Math.cos(diedro + a), -s * Math.sin(diedro + a)], t: 0.10 });
    }
    const ala = superficie(est, blanco); ala.name = 'ala'; g.add(ala);
    // navigation light on the tip: green on the right, red on the left
    const ul = est[est.length - 1];
    const luz = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), new THREE.MeshStandardMaterial({ color: s > 0 ? 0x18c050 : 0xd02020, emissive: s > 0 ? 0x0a6020 : 0x701010 }));
    luz.position.set(ul.x - 0.05, ul.p[0], ul.p[1]); g.add(luz);
  }

  // ── V-tail: two surfaces at 42° from the spine's end
  const ang = 42 * Math.PI / 180, largoCola = 2.35;
  for (const s of [1, -1]) {
    const est: Parameters<typeof superficie>[0] = [];
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, d = largoCola * t;
      est.push({ x: -5.85 - 1.05 * t, cuerda: 1.75 - 0.95 * t, p: [1.72 + d * Math.sin(ang), s * (0.12 + d * Math.cos(ang))], arriba: [Math.cos(ang), -s * Math.sin(ang)], t: 0.11 - 0.03 * t });
    }
    const v = superficie(est, blanco); v.name = 'cola'; g.add(v);
  }

  // ── the engine on the spine: nacelle, its fairing down to the fuselage, the intake and the exhaust between the tails
  const yMotor = 2.20;
  const gondola = loft([
    E(-3.70, yMotor - 0.33, yMotor + 0.33, 0.30, 0.34, 0.30, 2), E(-3.95, yMotor - 0.40, yMotor + 0.40, 0.37, 0.41, 0.37, 2),
    E(-4.60, yMotor - 0.42, yMotor + 0.42, 0.39, 0.43, 0.39, 2), E(-5.60, yMotor - 0.36, yMotor + 0.36, 0.33, 0.36, 0.33, 2),
    E(-6.30, yMotor - 0.26, yMotor + 0.26, 0.23, 0.26, 0.23, 2),
  ], { N: 64, sub: 8, tapas: false });
  g.add(Object.assign(new THREE.Mesh(gondola, azul), { castShadow: true, name: 'gondola' }));
  const carenado = loft([
    E(-3.80, 1.9, 2.0, 0.05, 0.06, 0.04, 2.4), E(-4.1, 1.84, 2.2, 0.32, 0.36, 0.3, 2.6), E(-5.2, 1.80, 2.15, 0.3, 0.33, 0.27, 2.6), E(-6.2, 1.76, 2.02, 0.2, 0.22, 0.17, 2.4),
  ], { N: 48, sub: 6 });
  g.add(Object.assign(new THREE.Mesh(carenado, blanco), { castShadow: true }));
  const boca = new THREE.Mesh(new THREE.CircleGeometry(0.3, 40), negro); boca.position.set(-3.72, yMotor, 0); boca.rotation.y = Math.PI / 2; g.add(boca);
  const labio = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.025, 10, 48), metal); labio.position.set(-3.70, yMotor, 0); labio.rotation.y = Math.PI / 2; g.add(labio);
  const tobera = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.25, 32, 1, true), gris); tobera.rotation.z = Math.PI / 2; tobera.position.set(-6.42, yMotor, 0); g.add(tobera);
  const fondo = new THREE.Mesh(new THREE.CircleGeometry(0.19, 32), negro); fondo.position.set(-6.3, yMotor, 0); fondo.rotation.y = -Math.PI / 2; g.add(fondo);

  // ── landing gear, down: nose wheel at x = 0, the mains under the wings
  const rueda = (r: number, w: number, x: number, z: number) => {
    const n = new THREE.Mesh(new THREE.TorusGeometry(r - w * 0.35, w * 0.42, 12, 32), goma); n.position.set(x, r, z); g.add(n);
    const llanta = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, w * 0.8, 24), metal); llanta.rotation.x = Math.PI / 2; llanta.position.set(x, r, z); g.add(llanta);
  };
  const pata = (a: V3, b: V3, r = 0.04) => {
    const A = new THREE.Vector3(...a), v = new THREE.Vector3(...b).sub(A), L = v.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 14), metal); m.position.copy(A).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); m.castShadow = true; g.add(m);
  };
  rueda(0.19, 0.13, 0, 0); pata([0, 0.19, 0.09], [0.05, 0.58, 0.04], 0.03); pata([0, 0.19, -0.09], [0.05, 0.58, -0.04], 0.03); pata([0.05, 0.58, 0], [0.05, 0.75, 0], 0.045);
  for (const s of [1, -1]) {
    const z = s * VIA_PRINCIPAL / 2, yAla = yRaiz + (VIA_PRINCIPAL / 2 - 0.45) * Math.tan(diedro);
    rueda(0.24, 0.15, X_PRINCIPAL, z); pata([X_PRINCIPAL, 0.24, z - s * 0.1], [X_PRINCIPAL + 0.1, yAla - 0.05, z - s * 0.35], 0.05);
    // the gear door, standing open along the leg
    const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.012), blanco); tapa.position.set(X_PRINCIPAL + 0.05, yAla - 0.25, z - s * 0.3); g.add(tapa);
  }
  g.traverse(o => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

export const VEHICULO: VehiculoGaraje = {
  id: 'visionJet',
  nombre: 'Cirrus Vision Jet SF50',
  largo: LARGO, ancho: ENVERGADURA, alto: ALTO, batalla: -X_PRINCIPAL,
  viaDel: 0, viaTras: VIA_PRINCIPAL,
  fuente: 'globalair.com, «Vision SF50-G2 specifications»: largo 30 ft 11 in (9,42 m), envergadura 38 ft 8 in (11,79 m), alto 10 ft 11 in (3,33 m), cabina 1,55 × 1,24 × 3,51 m, 1 610 kg en vacío, un turbofán Williams FJ33-5A, 587 km/h. Las formas (secciones, ala, cola en V, góndola, tren) están medidas en fotos: son estimaciones',
  masa: 1610,
  morroCola: [X_PUNTA, X_COLA],
  construir,
};
