import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';
import { E, areaFrontal, envolventeDe, puntoSeccion, semiAncho, type Est } from './forma';
import { barrido, cintaPiel, enPiel, espejo, estacion, parcheM, piel, thetaY, torno, type Rango } from './apteraPiel';
import { malla, unir } from './apteraDetalle';
import { APLASTADO, R_RUEDA, cabina, caja, geometriasRueda, materiales, retrovisor, ruedaDelantera, ruedaTrasera, sinSombra, type Mats } from './aeroriderDetalle';

/*
 * AeroRider: a Dutch fully enclosed velomobile with electric assist, designed
 * by the aerospace engineer Gjalt Wijma (hull wind-tunnel tested at Delft from 1999,
 * production model announced for 2003: New Atlas, 2004).
 * Two steered wheels in front, one driven wheel behind, one seat. Drawn in code.
 *
 * SOURCED
 * - 2 780 x 850 x 1 200 mm, wheelbase 1 270 mm, 72 kg without batteries
 *   (190 kg laden), three 20-inch wheels with Vredestein 20 x 2.00 tyres, glass-
 *   fibre polyester shell with foam core and aluminium inserts, gelcoat white
 *   or yellow, 600 W motor driving the rear wheel by a toothed belt, 45 km/h,
 *   8-speed Shimano Nexus hub, hydraulic disc brakes in front (Magura) and a
 *   mechanical drum at the rear that is also the parking brake, two joysticks
 *   for steering (7 m turning radius), front and rear lights and indicators,
 *   two mirrors, a wiper, a canopy that "opens forward and locks" with large
 *   removable side windows and a removable roof panel, two electric fans and
 *   two NACA inlets, 120 l of luggage space: AQUA data sheet («AQUA: Aerorider»,
 *   aeromenredace.blogspot.com, 2008), the same source as the «Otros
 *   velomóviles» entry in `referencias.ts`.
 * - Joystick steering and 45 km/h: New Atlas (newatlas.com, article 1811, 2004).
 * - The whole upper part of the cockpit tilts up, the windscreen is fixed,
 *   side windows and roof window come out, small mirrors left and right, a
 *   console box in the middle with the switches and the speed read-out, the
 *   pedals at the very front, the left lever is also the throttle: OliNo test
 *   (olino.org, 30 Jan 2008). «A large portion of the greenhouse tilts forward
 *   to allow entry», «steering is accomplished with sidesticks»:
 *   3greenwheels.blogspot.com (2007). White body, three removable windows, the
 *   two fans scoop from under the front, «a scoop on each side panel», two
 *   chains joined on two sprockets in the middle: the owner's blog
 *   (aerorider.blogspot.com, 2005). Motor belt on the left of the rear wheel,
 *   chain and gears on the right, front disc brakes: the same owner's photo
 *   captions on Flickr (tag «aerorider»). Fully enclosed «including the
 *   underside»: elektroauto-forum.de (2004). Its pedal-only sibling, the
 *   Sunrider (2.80 x 0.84 m), hangs each front wheel from one side
 *   (ligfiets.net), which is how the front wheels are drawn here.
 *
 * NOT VERIFIED AGAINST ANY PHOTO: the sandbox could not load a single picture
 * of the AeroRider, and none was found on public GitHub. The photo Eugenio
 * attached (white three-wheeler, dark canopy) is NOT an AeroRider: it runs on
 * five-spoke cast motorcycle wheels with disc brakes and shows four wheels,
 * where the AeroRider has three 20-inch bicycle wheels. So the whole surface is
 * a RECONSTRUCTION inside the published overall sizes:
 * - Nose 0.60 m ahead of the front axle and tail 0.91 m behind the rear one
 *   (the pedals sit ahead of the front wheels, the luggage behind the seat);
 *   front track 0.64 m, as in the «Otros velomóviles» entry (not published:
 *   with 850 mm of body it leaves the wheels inside the shell).
 * - The side profile, the plan taper, the section, the canopy shut lines and
 *   hinges, the window shapes, where the wheel openings, NACA inlets, fan
 *   intakes, lamps and mirrors sit and how big they are; the seat, sticks,
 *   console, cranks and chain line; the dark smoked tint of the glass.
 * No logos, badges or lettering: the garage compares shapes, not brands.
 *
 * Axes: X forward, Y up, Z lateral (+Z is the vehicle's right). Front axle at
 * x = 0, rear wheel at x = −1.27, ground at y = 0. Metres.
 */

export const LARGO = 2.78, ANCHO = 0.85, ALTO = 1.2, BATALLA = 1.27;
export const VIA = 0.64; // estimated, as in the «Otros velomóviles» entry
const X_MORRO = 0.6, X_COLA = Math.round((X_MORRO - LARGO) * 1000) / 1000; // −2.18
const GRADO = Math.PI / 180;

// ---------------------------------------------------------------- shape
/**
 * The shell, nose to tail: a round, blunt nose, a deck that rises into the
 * windscreen with hardly a break (one curve from nose to roof, like a visor),
 * the highest point over the rider's head, then a long tail that narrows and
 * ends in a small flat face for the tail lamp. Widest (0.85 m) over the front
 * wheels, at about their top; the canopy is much narrower than the body.
 */
const CUERPO: Est[] = [
  E(X_MORRO, 0.395, 0.405, 0.004, 0.005, 0.004, 2.2),
  E(0.590, 0.330, 0.470, 0.10, 0.12, 0.09, 2.4),
  E(0.560, 0.265, 0.530, 0.18, 0.215, 0.16, 2.5),
  E(0.500, 0.205, 0.595, 0.25, 0.295, 0.215, 2.6),
  E(0.400, 0.160, 0.660, 0.30, 0.355, 0.24, 2.7),
  E(0.250, 0.130, 0.725, 0.33, 0.400, 0.245, 2.75),
  E(0.100, 0.118, 0.790, 0.335, 0.416, 0.24, 2.75),
  E(-0.050, 0.112, 0.880, 0.335, 0.4205, 0.23, 2.7),
  E(-0.250, 0.108, 1.010, 0.33, 0.4205, 0.215, 2.6),
  E(-0.500, 0.106, 1.130, 0.32, 0.414, 0.20, 2.5),
  E(-0.780, 0.108, 1.200, 0.305, 0.403, 0.19, 2.45),
  E(-1.050, 0.120, 1.170, 0.28, 0.38, 0.185, 2.45),
  E(-1.300, 0.155, 1.070, 0.245, 0.34, 0.175, 2.5),
  E(-1.550, 0.215, 0.930, 0.195, 0.28, 0.155, 2.5),
  E(-1.800, 0.300, 0.785, 0.14, 0.205, 0.12, 2.45),
  E(-2.000, 0.385, 0.665, 0.085, 0.13, 0.08, 2.35),
  E(-2.130, 0.445, 0.590, 0.045, 0.072, 0.045, 2.25),
  E(X_COLA, 0.465, 0.565, 0.032, 0.05, 0.03, 2.2),
];

// ---------------------------------------------------------------- lines on the skin (side view, +z side)
const lim = (v: number) => Math.min(1, Math.max(0, v));
/** Interpolates a table [x, value] with x decreasing. */
function tabla(p: [number, number][], x: number): number {
  if (x >= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) if (x >= p[i + 1][0]) { const t = (p[i][0] - x) / (p[i][0] - p[i + 1][0]); return p[i][1] + (p[i + 1][1] - p[i][1]) * t; }
  return p[p.length - 1][1];
}
/** The canopy's lower edge (its shut line along each side), rising a little towards the back. */
const BELT_P: [number, number][] = [[0.16, 0.66], [0.0, 0.648], [-0.3, 0.645], [-0.6, 0.655], [-0.9, 0.68], [-1.1, 0.715], [-1.25, 0.75]];
const BELT = (x: number) => tabla(BELT_P, x);
/** Front and rear shut lines of the canopy (it tilts forward on two hinges at the front one). */
const XC_F = 0.14, XC_R = -1.22;
/** Side edge of the windscreen (the A-pillar's front edge), seen from the side. */
const PILAR_P: [number, number][] = [[0.11, 0.69], [0.0, 0.73], [-0.15, 0.82], [-0.3, 0.94], [-0.48, 1.105]];
const PILAR = (x: number) => tabla(PILAR_P, x);
const XW_F = 0.112, XW_T = -0.48; // windscreen base and top edge
const XS_F = 0.07, XS_T = -1.06; // side window front and back
const XT_F = -0.53, XT_T = -1.03; // roof window
const RIEL = 50 * GRADO, TECHO = 61 * GRADO; // side windows up to 50°; roof window from 61° to 119°

/** θ moved d metres (measured on the skin) from θ towards `dir`. */
function adentro(e: Est, th: number, d: number, dir: 1 | -1): number {
  const [y1, z1] = puntoSeccion(e, th - 0.003), [y2, z2] = puntoSeccion(e, th + 0.003);
  const v = Math.hypot(y2 - y1, z2 - z1) / 0.006 || 1;
  return th + dir * d / v;
}
const encoger = (e: Est, r: Rango | null, d: number): Rango | null => {
  if (!r) return null;
  const a = adentro(e, r[0], d, 1), b = adentro(e, r[1], d, -1);
  return b > a ? [a, b] : null;
};
/** Rounded corners: how much a range closes near an end in x (0 none, 1 fully). */
const esquina = (x: number, xFin: number, radio: number, haciaAtras: boolean) => {
  const q = lim(haciaAtras ? (xFin + radio - x) / radio : (x - (xFin - radio)) / radio);
  return 1 - Math.sqrt(1 - q * q);
};
const cerrar = (r: Rango, k: number): Rango | null => { const m = (r[0] + r[1]) / 2, a = r[0] + (m - r[0]) * k, b = r[1] - (r[1] - m) * k; return b - a > 1e-4 ? [a, b] : null; };

interface Vidrio { x0: number; x1: number; rango: (e: Est) => Rango | null; franja: number }
/** The windscreen: wraps down to the canopy edge at its base and narrows to a visor towards the roof. */
const PARABRISAS: Vidrio = {
  x0: XW_F, x1: XW_T, franja: 0.035,
  rango: e => {
    const y = Math.max(BELT(e.x) + 0.035, PILAR(e.x));
    if (y >= e.yt - 0.012) return null;
    const a = thetaY(e, y), r: Rango = [a, Math.PI - a];
    return cerrar(r, esquina(e.x, XW_T, 0.05, true));
  },
};
/** Side window (+z): behind the A-pillar (9 cm along x), from the canopy edge up to the roof rail, rounded at the back. */
const VENTANILLA: Vidrio = {
  x0: XS_F, x1: XS_T, franja: 0.025,
  rango: e => {
    const x = e.x, lo = BELT(x) + 0.03;
    let hi = Math.min(thetaY(e, PILAR(x + 0.09)), RIEL);
    const a = thetaY(e, lo);
    hi = a + (hi - a) * (1 - 0.85 * esquina(x, XS_T, 0.12, true));
    return hi > a + 0.01 ? [a, hi] : null;
  },
};
const VENTANILLA_IZQ: Vidrio = { ...VENTANILLA, rango: e => { const r = VENTANILLA.rango(e); return r ? espejo(r) : null; } };
const TECHO_V: Vidrio = {
  x0: XT_F, x1: XT_T, franja: 0.025,
  rango: e => cerrar([TECHO, Math.PI - TECHO], Math.max(esquina(e.x, XT_F, 0.07, false), esquina(e.x, XT_T, 0.07, true))),
};
const VIDRIOS = [PARABRISAS, VENTANILLA, VENTANILLA_IZQ, TECHO_V];

/** Is (x, θ) in the clear part of a glass? There the skin is cut, to see the cockpit (the cut's edge hides under the black border). */
function claroRapido(m: number) {
  let ux = NaN, rs: { a: number; b: number }[] = [];
  return (x: number, th: number) => {
    if (x !== ux) {
      ux = x; rs = [];
      const e = estacion(CUERPO, x);
      for (const v of VIDRIOS) {
        const d = v.franja * m;
        if (x > v.x0 - d || x < v.x1 + d) continue;
        const r = encoger(e, v.rango(e), d); if (r) rs.push({ a: r[0], b: r[1] });
      }
    }
    for (const r of rs) if (th > r.a && th < r.b) return true;
    return false;
  };
}
/** Glass colour per vertex: an opaque black border, smoked grey and see-through inside. */
const colorVidrio = (franja: number) => (_u: number, _v: number, borde: number): [number, number, number, number] => {
  const t = lim((borde - franja) / 0.006);
  return [0.012 + 0.024 * t, 0.014 + 0.027 * t, 0.017 + 0.03 * t, 1 - 0.26 * t];
};

// ---------------------------------------------------------------- wheel openings
/**
 * Each front wheel shows through an arch in the lower side of the shell (side
 * view: an ellipse around the wheel, up to y = 0.43) that runs on round the
 * lower corner into the underside, as far as a line of constant θ about 0.18 m
 * from the centre line; the rear wheel through a slot in the bottom of the
 * tail. That bottom line lies exactly on a column of the skin's grid (θ is cut
 * at whole steps of 2π/N), so it is straight; the stepped side of the cut hides
 * under the rubber edge.
 */
const N_PIEL = 152, PASO_TH = (2 * Math.PI) / N_PIEL;
const TH_CORTE = 125 * PASO_TH - 2 * Math.PI; // −1.116 rad: 11 grid steps above the bottom centre line (3π/2 = 114 steps)
const ARCO = { cx: 0, cy: 0.2, ax: 0.315, ay: 0.23 };
const enArco = (x: number, y: number) => ((x - ARCO.cx) / ARCO.ax) ** 2 + ((y - ARCO.cy) / ARCO.ay) ** 2 < 1;
const RANURA = { x: -BATALLA, ax: 0.29, z: 0.055, y: 0.26 };
function huecoRueda() {
  let ux = NaN, e: Est | null = null;
  return (x: number, th: number) => {
    if (x > 0.34 || (x < -0.34 && x > -0.95) || x < -1.6) return false;
    if (x !== ux) { ux = x; e = estacion(CUERPO, x); }
    const [y, z] = puntoSeccion(e!, th);
    if (Math.abs(x) < 0.34) {
      // θ measured from the +z side (−π..π); the left side is its mirror (π − θ)
      const a = th > Math.PI ? th - 2 * Math.PI : th, b = Math.PI - th;
      const lado = (a > TH_CORTE && a < Math.PI / 2) || (b > TH_CORTE && b < Math.PI / 2);
      return lado && enArco(x, y);
    }
    return Math.abs(x - RANURA.x) < RANURA.ax && Math.abs(z) < RANURA.z && y < RANURA.y;
  };
}

/** Skin point and outward normal at (x, θ), from finite differences across and along the shell. */
function enLaPiel(x: number, th: number, d = 0): { p: THREE.Vector3; n: THREE.Vector3 } {
  const P = (xx: number, tt: number) => enPiel(estacion(CUERPO, xx), tt);
  const t1 = P(x, th + 0.004).sub(P(x, th - 0.004)), t2 = P(x - 0.003, th).sub(P(x + 0.003, th));
  const n = new THREE.Vector3().crossVectors(t1, t2).normalize();
  return { p: P(x, th).addScaledVector(n, d), n };
}
/** θ on the lower half of the section where |z| = z (for patches under the body, +z side). */
function thetaZAbajo(e: Est, z: number): number {
  let lo = 1.5 * Math.PI, hi = 2 * Math.PI;
  for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (puntoSeccion(e, m)[1] < z) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/** Frontmost x of the nose at height y on the centre line. */
function frenteMorro(y: number): number {
  let lo = 0.4, hi = X_MORRO;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (semiAncho(estacion(CUERPO, m), y) > 0.002) lo = m; else hi = m; }
  return lo;
}

// ---------------------------------------------------------------- small parts
/** A round lamp along +z: black bezel, chrome reflector, emitter and a clear domed lens; `lente` tints the lens (rear lamp). */
function lampara(M: Mats, r: number, emisor: THREE.Material, lenteColor?: THREE.Material): THREE.Group {
  const g = new THREE.Group(); g.name = 'faro';
  g.add(malla(torno([[r * 0.86, 0.004], [r, 0.006], [r * 1.12, 0.002], [r * 1.12, -0.006]], 40), M.negro, 'faro'));
  g.add(malla(torno([[r * 0.86, 0.003], [r * 0.6, -0.008], [r * 0.25, -0.016], [r * 0.12, -0.018]], 40), M.cromo, 'faro'));
  const bombilla = new THREE.SphereGeometry(r * 0.16, 14, 10); bombilla.translate(0, 0, -0.01);
  g.add(malla(bombilla, emisor, 'faro', false));
  const domo = torno([[0, 0.012], [r * 0.4, 0.011], [r * 0.75, 0.0085], [r * 0.95, 0.005]], 40);
  const lente = malla(domo, lenteColor ?? M.lente, 'faro', false); lente.userData.sinSombra = true; g.add(lente);
  return g;
}
/** Orients a group built along +z so that +z follows `n`, at `p`. */
function colocar(o: THREE.Object3D, p: THREE.Vector3, n: THREE.Vector3) {
  o.position.copy(p); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n.clone().normalize());
}

/**
 * A front wheel well (+z side): a curved liner around the wheel, cut where it
 * would leave the shell, and a flat inner wall closed by a chord at the
 * bottom. Without it the arch would show the empty inside of the body.
 */
function pasoRueda(z0: number): THREE.BufferGeometry {
  const rc = R_RUEDA + 0.035, yc = R_RUEDA, a0 = -16 * GRADO, a1 = Math.PI + 16 * GRADO, n = 40, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n, x = Math.cos(a) * rc, y = yc + Math.sin(a) * rc;
    const zFuera = Math.min(0.405, semiAncho(estacion(CUERPO, x), y) - 0.006);
    pos.push(x, y, z0, x, y, Math.max(z0 + 0.01, zFuera));
  }
  for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const liner = new THREE.BufferGeometry(); liner.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); liner.setIndex(idx); liner.computeVertexNormals();
  const s = new THREE.Shape(); s.absarc(0, yc, rc, a0, a1, false); s.closePath();
  const pared = new THREE.ShapeGeometry(s, 24); pared.translate(0, 0, z0);
  return unir([liner, pared]);
}

// ---------------------------------------------------------------- assembly
/**
 * The vehicle is built once per page into a template that never goes into
 * the scene; every `construir()` returns a copy with its own geometries (the
 * viewer disposes them) and the shared materials.
 */
let PLANTILLA: THREE.Group | null = null;
function construir(): THREE.Group {
  if (!PLANTILLA) PLANTILLA = construirPlantilla();
  const g = PLANTILLA.clone(true), copias = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    let c = copias.get(m.geometry); if (!c) { c = m.geometry.clone(); copias.set(m.geometry, c); }
    m.geometry = c;
    // (clone() does not carry customDepthMaterial: see-through parts get it back here)
    if (m.userData.sinSombra) m.customDepthMaterial = sinSombra;
  });
  return g;
}

function construirPlantilla(): THREE.Group {
  const M = materiales();
  const g = new THREE.Group(); g.name = 'aerorider';
  /** The piece and its mirror on the −z side (mirrored by the object's scale: faces keep looking out). */
  const par = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre: string, sombra = true) => {
    const a = malla(geo, m, nombre, sombra), b = malla(geo, m, nombre, sombra); b.scale.z = -1; g.add(a, b); return [a, b];
  };

  // --- the shell: white gelcoat outside, dark inside; cut behind the clear glass and at the wheels
  const claro = claroRapido(0.5), rueda = huecoRueda();
  const paso = (x: number) => Math.abs(x) < 0.34 ? 0.008 : (x < 0.36 && x > -1.12) || (x < -0.95 && x > -1.6) ? 0.011 : 0.02;
  const piel_ = piel(CUERPO, { N: N_PIEL, paso, nClases: 1, clase: (x, th) => claro(x, th) || rueda(x, th) ? -1 : 0 });
  // the same triangles again with a back-face material: the inside of the shell (one mesh, so in
  // «Superponer», which gives a mesh one material, the shell is drawn once)
  piel_.addGroup(0, piel_.index!.count, 1);
  g.add(malla(piel_, [M.pintura, M.forro], 'carroceria'));

  // --- glass: windscreen, side windows and the roof window, each with its black border
  for (const v of VIDRIOS) {
    const o = malla(parcheM(CUERPO, v.x0, v.x1, v.rango, { nx: 56, nth: 44, delta: 0.004, bordes: true, color: colorVidrio(v.franja) }), M.cristal, 'cristal', false);
    o.userData.sinSombra = true; g.add(o);
  }

  // --- the canopy's shut lines: across the deck at the hinges, along both sides, across behind the head
  const transversal = (x: number, ancho: number) => parcheM(CUERPO, x + ancho / 2, x - ancho / 2, e => { const a = thetaY(e, BELT(x)); return [a, Math.PI - a]; }, { nx: 1, nth: 90, delta: 0.0015 });
  g.add(malla(unir([transversal(XC_F, 0.005), transversal(XC_R, 0.005)]), M.junta, 'junta', false));
  {
    const lado: [number, number][] = [];
    for (let k = 0; k <= 14; k++) { const x = XC_F + (XC_R - XC_F) * k / 14; lado.push([x, BELT(x)]); }
    par(cintaPiel(CUERPO, lado, 0.005, { pasos: 90, delta: 0.0015 }), M.junta, 'junta', false);
  }
  // two hinges at the front edge, and a lock at the back on each side
  {
    const e = estacion(CUERPO, XC_F), bis: THREE.BufferGeometry[] = [];
    for (const z of [0.17, -0.17]) {
      let th = Math.PI / 2; for (let i = 0; i < 30; i++) { const [, zz] = puntoSeccion(e, th); th += (zz - z) * 1.5; }
      const { p, n } = enLaPiel(XC_F, th, 0.006);
      const k = new THREE.CylinderGeometry(0.0085, 0.0085, 0.055, 14); k.rotateX(Math.PI / 2);
      const placa = caja(0.05, 0.006, 0.04, 0.002); placa.translate(-0.02, -0.004, 0);
      const pieza = unir([k, placa]);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      pieza.applyQuaternion(q); pieza.translate(p.x, p.y, p.z); bis.push(pieza);
    }
    g.add(malla(unir(bis), M.negro, 'bisagra'));
    const e2 = estacion(CUERPO, XC_R + 0.045), th2 = thetaY(e2, BELT(XC_R) + 0.04), { p, n } = enLaPiel(XC_R + 0.045, th2, 0.001);
    const cerr = torno([[0.013, 0.0], [0.013, 0.003], [0.009, 0.005], [0.004, 0.005], [0.0035, 0.0055], [0, 0.0055]], 20);
    const o = malla(cerr, M.cromo, 'cerradura'); colocar(o, p, n);
    const o2 = o.clone(); o2.position.z *= -1; o2.quaternion.set(-o.quaternion.x, -o.quaternion.y, o.quaternion.z, o.quaternion.w); g.add(o, o2);
  }

  // --- wiper, parked along the base of the windscreen
  {
    const x = XW_F - 0.03, e = estacion(CUERPO, x), pts: THREE.Vector3[] = [];
    const thZ = (z: number) => { let lo = 0.15, hi = Math.PI - 0.15; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (puntoSeccion(e, m)[1] > z) lo = m; else hi = m; } return (lo + hi) / 2; };
    for (let k = 0; k <= 12; k++) { const z = 0.17 - 0.38 * k / 12; pts.push(enPiel(e, thZ(z), 0.012)); }
    const brazo = barrido(pts, t => [0.006 + 0.005 * (1 - t), 0.005], { lados: 8 });
    const eje = new THREE.CylinderGeometry(0.014, 0.017, 0.02, 16), q = enLaPiel(x, thZ(0.17));
    eje.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.n)); eje.translate(q.p.x, q.p.y, q.p.z);
    g.add(malla(unir([brazo, eje]), M.negro, 'limpiaparabrisas'));
  }

  // --- wheel openings: a black rubber edge along each front arch and the wheel wells
  {
    // the edge as a closed loop: the ellipse over the wheel, then back along the θ line underneath
    const borde: THREE.Vector3[] = [], xs: number[] = [];
    for (let k = 0; k <= 120; k++) {
      const f = Math.PI * k / 120, x = ARCO.cx + ARCO.ax * Math.cos(f), y = ARCO.cy + ARCO.ay * Math.sin(f);
      const e = estacion(CUERPO, x), th = thetaY(e, y);
      if (th < TH_CORTE) continue;
      borde.push(enPiel(e, th, 0.003)); xs.push(x);
    }
    const xa = xs[0], xb = xs[xs.length - 1];
    for (let k = 1; k < 24; k++) { const x = xb + (xa - xb) * k / 24; borde.push(enPiel(estacion(CUERPO, x), TH_CORTE, 0.003)); }
    par(barrido(borde, () => [0.011, 0.011], { lados: 10, cerrado: true }), M.burlete, 'burlete', false);
    par(pasoRueda(0.215), M.pozo, 'paso-rueda');
  }

  // --- NACA inlets, one on each side panel ahead of the canopy, and the two fan intakes under the nose
  {
    const naca = (e: Est): Rango | null => {
      const u = lim((0.40 - e.x) / 0.17); if (u <= 0 || u >= 1) return null;
      const w = 0.004 + 0.024 * Math.pow(u, 1.6) * (1 - esquina(e.x, 0.23, 0.02, true) * 0.9), yc = 0.53;
      const a = thetaY(e, yc - w), b = thetaY(e, yc + w); return b > a ? [a, b] : null;
    };
    // shade: skin-grey at the tip, dark at the mouth where the ramp is deepest
    const sombra = (u: number): [number, number, number, number] => { const t = lim((u + 0.40) / 0.17); const c = 0.55 - 0.47 * t * t; return [c, c * 1.01, c * 1.03, 1]; };
    par(parcheM(CUERPO, 0.40, 0.23, naca, { nx: 30, nth: 10, delta: 0.0012, color: u => sombra(u) }), M.naca, 'naca', false);
    // the lip at the back of each inlet
    const e = estacion(CUERPO, 0.228), lab: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) lab.push(enPiel(e, thetaY(e, 0.53 - 0.027 + 0.054 * k / 8), 0.003));
    par(barrido(lab, () => [0.004, 0.006], { lados: 8, arriba: new THREE.Vector3(1, 0, 0) }), M.pintura, 'naca');
    const rejilla = (e: Est): Rango | null => { const a = thetaZAbajo(e, 0.05), b = thetaZAbajo(e, 0.12); return b > a ? [a, b] : null; };
    par(parcheM(CUERPO, 0.40, 0.31, rejilla, { nx: 12, nth: 10, delta: 0.0015 }), M.rejilla, 'rejilla', false);
  }

  // --- lights: one headlamp in the nose, amber indicators on its flanks; tail lamp and rear indicators
  {
    const y = 0.44, x = frenteMorro(y), { p, n } = enLaPiel(x - 0.004, Math.PI / 2, -0.004);
    const faro = lampara(M, 0.042, M.luz); colocar(faro, p, n); g.add(faro);
    const intermitente = (x0: number, x1: number, yc: number, h: number) => (e: Est): Rango | null => {
      const k = Math.max(esquina(e.x, x0, 0.015, false), esquina(e.x, x1, 0.015, true)), hh = h * (1 - k);
      if (hh < 0.002) return null; return [thetaY(e, yc - hh), thetaY(e, yc + hh)];
    };
    par(parcheM(CUERPO, 0.53, 0.475, intermitente(0.53, 0.475, 0.445, 0.012), { nx: 16, nth: 8, delta: 0.002 }), M.ambar, 'intermitente', false);
    par(parcheM(CUERPO, -2.045, -2.14, intermitente(-2.045, -2.14, 0.52, 0.016), { nx: 16, nth: 8, delta: 0.002 }), M.ambar, 'intermitente', false);
    const piloto = lampara(M, 0.03, M.rojo, M.rojo); colocar(piloto, new THREE.Vector3(X_COLA - 0.003, 0.515, 0), new THREE.Vector3(-1, 0, 0)); g.add(piloto);
  }

  // --- mirrors: small and round, on the body sides just ahead of the canopy
  for (const s of [1, -1] as const) {
    const e = estacion(CUERPO, 0.2), { p, n } = enLaPiel(0.2, thetaY(e, 0.6));
    const r = retrovisor(M, p, n); if (s < 0) r.scale.z = -1; g.add(r);
  }

  // --- wheels: two in front (single-sided hubs, discs inboard), one behind
  const G = geometriasRueda(), yR = R_RUEDA - APLASTADO;
  for (const s of [1, -1] as const) {
    const r = ruedaDelantera(G, M); r.position.set(0, yR, s * VIA / 2); r.scale.z = s; g.add(r);
    // the suspension arm from the wheel well to the stub axle
    const brazo = barrido([new THREE.Vector3(-0.2, 0.2, s * 0.13), new THREE.Vector3(-0.09, yR - 0.01, s * 0.2), new THREE.Vector3(-0.01, yR, s * 0.232)], () => [0.022, 0.012], { lados: 10 });
    g.add(malla(brazo, M.negro, 'suspension'));
  }
  const rt = ruedaTrasera(G, M); rt.position.set(-BATALLA, yR, 0); g.add(rt);

  // --- the cockpit: seat, side sticks, console, pedals and the drive
  g.add(cabina(M, -BATALLA, yR));

  g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}

// ---------------------------------------------------------------- data
const MITAD_ESPEJO = (() => {
  // where the mirror heads end up (for the frontal area): same placement as in the assembly
  const e = estacion(CUERPO, 0.2), th = thetaY(e, 0.6), [y, z] = puntoSeccion(e, th);
  return { y: y + 0.05, z: z + 0.095 };
})();

/** Silhouette for the tunnel: the shell every 5 cm, plus the flat tail face (the 5 cm steps stop 3 cm short of it). */
function envolvente(): [number, number, number, number][] {
  const env = envolventeDe(CUERPO), e = CUERPO[CUERPO.length - 1];
  let hw = 0; for (let j = 0; j <= 20; j++) hw = Math.max(hw, semiAncho(e, e.yb + (e.yt - e.yb) * (j / 20)));
  if (env[env.length - 1][0] > X_COLA + 0.005) env.push([X_COLA, e.yb, e.yt, Math.round(hw * 1000) / 1000]);
  return env;
}

/** Frontal area: shell, the tyres below it and the two mirror heads. */
const AREA = areaFrontal([
  { es: CUERPO, z0: 0 },
  { rect: [VIA / 2 - 0.026, VIA / 2 + 0.026, 0, 0.13] },
  { rect: [-VIA / 2 - 0.026, -VIA / 2 + 0.026, 0, 0.13] },
  { rect: [-0.026, 0.026, 0, 0.16] },
  { rect: [MITAD_ESPEJO.z - 0.045, MITAD_ESPEJO.z + 0.045, MITAD_ESPEJO.y - 0.03, MITAD_ESPEJO.y + 0.03] },
  { rect: [-MITAD_ESPEJO.z - 0.045, -MITAD_ESPEJO.z + 0.045, MITAD_ESPEJO.y - 0.03, MITAD_ESPEJO.y + 0.03] },
]);
export const AREA_M2 = Math.round(AREA * 100) / 100;

export const VEHICULO: VehiculoGaraje = {
  id: 'aerorider', nombre: 'AeroRider',
  largo: LARGO, ancho: ANCHO, alto: ALTO, batalla: BATALLA, viaDel: VIA, viaTras: 0,
  fuente: `Ficha técnica del AeroRider (AQUA, aeromenredace.blogspot.com, 2008; la misma de «Otros velomóviles»): 2 780 × 850 × 1 200 mm, batalla 1 270 mm, 72 kg sin baterías, una plaza, tres ruedas de 20″ con neumáticos 20 × 2,00, motor de 600 W, 45 km/h, discos hidráulicos delante y tambor detrás, dos palancas laterales para dirigir, capota que se abre hacia delante con ventanillas y techo desmontables, dos tomas NACA, dos retrovisores y limpiaparabrisas; detalles de la prueba de OliNo (2008) y del blog de un propietario (2005). No se ha podido ver ninguna foto: la forma (perfil, planta, sección, cristales, aberturas de las ruedas, luces) es una reconstrucción dentro de esas medidas, y la vía de 0,64 m y los voladizos (0,60 m delante, 0,91 m detrás) están estimados. No hay Cd publicado; área frontal de este modelo: ${AREA_M2.toLocaleString('es-ES')} m²`,
  envolvente: envolvente(),
  seccion: 2.5,
  construir,
};
