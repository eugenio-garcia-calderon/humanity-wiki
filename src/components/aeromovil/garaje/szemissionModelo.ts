import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { puntoSeccion, semiAncho } from './forma';
import { barrido, estacion, normalSeccion, piel, thetaY, torno } from './apteraPiel';
import {
  BATALLA, CUERPO, CUPULA, LARGO, R_LLANTA, R_RUEDA, ANCHO_RUEDA, VIA_DEL, VIA_TRAS, X_COLA, anchoCuerpo,
} from './szemissionForma';

/*
 * The garage SZEmission built in three.js: painted body, canopy, cabin,
 * wheels, lights and small parts. The shape is in `szemissionForma.ts`.
 *
 * - The body is one closed skin (`piel`, from the Aptera helpers) with a hole
 *   under the clear glass, and the same triangles drawn again from inside in a
 *   dark material: that is the cabin tub seen through the windows.
 * - The livery is a canvas drawn in side view (u = x, v = y) and projected
 *   across the car, so every stripe is a straight colour field as on the real
 *   car: yellow nose and front half, silver rear, black lower body, three black
 *   diagonal stripes on the tail, the thin red-white-green pinstripe, blank
 *   white number panels and the shut lines (door, front-wheel hatch). A second
 *   canvas with the same drawing carries roughness and metalness (silver is
 *   metallic, the yellow is not).
 * - The canopy is a separate skin whose lower part, inside the body, is cut
 *   away. Clear glass (windshield and the door windows) and the dark tinted
 *   rest (roof strip, pillars, the long tail of the bubble) are two material
 *   groups; the clear glass darkens to a black frit at its edges per vertex.
 * - No logos, names or numbers anywhere: the garage compares shapes.
 * - Materials and textures are made once per page; the car is built once into
 *   a template and `construir()` hands out copies of its geometries (the
 *   viewer disposes those). Mirrored parts share one geometry.
 */

const conDocumento = () => typeof document !== 'undefined';
const lim = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
/** Linear interpolation in a table [x, value] given from front to back (x decreasing). */
function tabla(p: [number, number][], x: number): number {
  if (x >= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) if (x >= p[i + 1][0]) { const t = (p[i][0] - x) / (p[i][0] - p[i + 1][0]); return p[i][1] + (p[i + 1][1] - p[i][1]) * t; }
  return p[p.length - 1][1];
}

// ======================================================================= livery (side view)
/** Height of the top of the black lower body, along the car. */
const NEGRO: [number, number][] = [[1.0, 0.345], [0.6, 0.35], [0.36, 0.35], [0.26, 0.26], [0.1, 0.245], [-0.4, 0.24], [-1.0, 0.242], [-1.4, 0.255], [-1.8, 0.285], [-2.15, 0.318], [-2.5, 0.345]];
/** Centre line of the red-white-green pinstripe (side view), nose to tail. */
const FILETE: [number, number][] = [[0.95, 0.36], [0.8, 0.364], [0.64, 0.372], [0.5, 0.42], [0.36, 0.49], [0.2, 0.54], [0.05, 0.56], [-0.2, 0.578], [-0.6, 0.6], [-1.0, 0.612], [-1.35, 0.605], [-1.65, 0.575], [-1.95, 0.505], [-2.2, 0.43], [-2.33, 0.392]];
/** Yellow/silver boundary: a diagonal leaning back, from (−0.98, 0.20) to (−0.72, 0.70). */
const fronteraX = (y: number) => -0.98 + (y - 0.2) * 0.52;
/** The door (gull-wing, hinged on the canopy ridge) and the front-wheel hatch, side view. */
export const PUERTA = { x0: -0.31, x1: -0.90, y0: 0.255 };
const TAPA_RUEDA = { x0: 0.30, x1: -0.27, y0: 0.25, y1: 0.48, r: 0.085 };
/** Blank race-number panel on each side (on the door, behind the wheel hatch). */
const DORSAL = { x0: -0.37, x1: -0.56, y0: 0.30, y1: 0.55 };

const LIV = { W: 2048, H: 704, YMAX: 1.1 };
const px = (x: number) => ((x - X_COLA) / LARGO) * LIV.W;
const py = (y: number) => (1 - y / LIV.YMAX) * LIV.H;

type Pinceles = { plata: string; amarillo: string; negro: string; blanco: string; rojo: string; verde: string; junta: string; franja: string };
/** Draws the livery with the given "paints" (colours for the colour map, roughness/metalness codes for the other one). */
function dibujarLibrea(c: CanvasRenderingContext2D, P: Pinceles) {
  const { W, H } = LIV;
  c.fillStyle = P.plata; c.fillRect(0, 0, W, H);
  // yellow front half, behind it silver; a silver band inside the yellow and a yellow one inside the silver
  const banda = (d0: number, d1: number, ya: number, yb: number, color: string) => {
    c.fillStyle = color; c.beginPath();
    c.moveTo(px(fronteraX(yb) + d0), py(yb)); c.lineTo(px(fronteraX(yb) + d1), py(yb));
    c.lineTo(px(fronteraX(ya) + d1), py(ya)); c.lineTo(px(fronteraX(ya) + d0), py(ya)); c.closePath(); c.fill();
  };
  banda(0, 3, 0, LIV.YMAX, P.amarillo);
  banda(0.09, 0.15, 0.22, 0.68, P.plata);
  banda(-0.16, -0.11, 0.22, 0.68, P.amarillo);
  // three black diagonal stripes on the tail, leaning back like the boundary
  for (let k = 0; k < 3; k++) {
    const xc = -1.80 - 0.125 * k, w = 0.052;
    const xa = (y: number) => xc + (y - 0.45) * 0.62;
    c.fillStyle = P.negro; c.beginPath();
    c.moveTo(px(xa(0.2) - w / 2), py(0.2)); c.lineTo(px(xa(0.2) + w / 2), py(0.2));
    c.lineTo(px(xa(0.72) + w / 2), py(0.72)); c.lineTo(px(xa(0.72) - w / 2), py(0.72)); c.closePath(); c.fill();
  }
  // black lower body and the black end of the tail
  c.fillStyle = P.negro; c.beginPath(); c.moveTo(px(1.0), H);
  for (let x = 1.0; x >= -2.5; x -= 0.02) c.lineTo(px(x), py(tabla(NEGRO, x)));
  c.lineTo(px(-2.5), H); c.closePath(); c.fill();
  c.fillRect(0, 0, px(-2.392), H);
  // number panel: blank, white, rounded
  c.fillStyle = P.blanco; c.beginPath();
  if (c.roundRect) c.roundRect(px(DORSAL.x1), py(DORSAL.y1), px(DORSAL.x0) - px(DORSAL.x1), py(DORSAL.y0) - py(DORSAL.y1), 10);
  else c.rect(px(DORSAL.x1), py(DORSAL.y1), px(DORSAL.x0) - px(DORSAL.x1), py(DORSAL.y0) - py(DORSAL.y1));
  c.fill();
  // the pinstripe: red over white over green, ~6 mm each, with a thin dark keyline
  const linea = (dy: number, color: string, ancho: number) => {
    c.strokeStyle = color; c.lineWidth = ancho; c.lineJoin = 'round'; c.beginPath();
    for (let x = 0.95; x >= -2.33; x -= 0.02) { const y = tabla(FILETE, x) + dy; if (x === 0.95) c.moveTo(px(x), py(y)); else c.lineTo(px(x), py(y)); }
    c.stroke();
  };
  const mm = H / (LIV.YMAX * 1000);
  linea(0, P.franja, 22 * mm); linea(0.006, P.rojo, 6 * mm); linea(0, P.blanco, 6 * mm); linea(-0.006, P.verde, 6 * mm);
  // shut lines: the door (front and rear edges up over the deck, the sill) and the front-wheel hatch
  c.strokeStyle = P.junta; c.lineWidth = 3.4 * mm; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(px(PUERTA.x0), py(0.80)); c.lineTo(px(PUERTA.x0), py(PUERTA.y0));
  c.lineTo(px(PUERTA.x1), py(PUERTA.y0)); c.lineTo(px(PUERTA.x1 + 0.02), py(0.80));
  c.stroke();
  const T = TAPA_RUEDA;
  c.beginPath();
  if (c.roundRect) c.roundRect(px(T.x1), py(T.y1), px(T.x0) - px(T.x1), py(T.y0) - py(T.y1), T.r * LIV.W / LARGO);
  else c.rect(px(T.x1), py(T.y1), px(T.x0) - px(T.x1), py(T.y0) - py(T.y1));
  c.stroke();
  // the lower edge of the door: a light sill strip (as in the photos)
  c.fillStyle = P.blanco; c.fillRect(px(PUERTA.x1 + 0.02), py(PUERTA.y0 - 0.008), px(PUERTA.x0 - 0.05) - px(PUERTA.x1 + 0.02), 14 * mm);
}

function texturasLibrea(): { mapa: THREE.CanvasTexture; orm: THREE.CanvasTexture } | null {
  if (!conDocumento()) return null;
  const hacer = (P: Pinceles) => {
    const cv = document.createElement('canvas'); cv.width = LIV.W; cv.height = LIV.H;
    const c = cv.getContext('2d'); if (!c) return null;
    dibujarLibrea(c, P);
    const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  };
  const mapa = hacer({ plata: '#c3c7cc', amarillo: '#f2a900', negro: '#121315', blanco: '#f1f1ee', rojo: '#c8102e', verde: '#1f7a3a', junta: '#24262a', franja: '#c3c7cc' });
  // roughness in G, metalness in B (three.js reads them from those channels)
  const orm = hacer({ plata: 'rgb(0,80,150)', amarillo: 'rgb(0,52,0)', negro: 'rgb(0,90,40)', blanco: 'rgb(0,70,0)', rojo: 'rgb(0,60,0)', verde: 'rgb(0,60,0)', junta: 'rgb(0,200,0)', franja: 'rgb(0,80,150)' });
  if (!mapa || !orm) return null;
  mapa.colorSpace = THREE.SRGBColorSpace;
  return { mapa, orm };
}

// ======================================================================= materials
/** Clear glass casts no shadow: its shadow pass uses a depth material that discards every fragment (alphaTest). */
const sinSombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, opacity: 0 });

let MATS: ReturnType<typeof crearMateriales> | null = null;
function crearMateriales() {
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  const calco = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...p });
  const L = texturasLibrea();
  return {
    // the painted carbon body: livery map, roughness/metalness map, clear coat
    pintura: fis({
      color: 0xffffff, map: L?.mapa ?? null, roughnessMap: L?.orm ?? null, metalnessMap: L?.orm ?? null,
      roughness: L ? 1 : 0.3, metalness: L ? 1 : 0.2, clearcoat: 1, clearcoatRoughness: 0.04,
      ...(L ? {} : { color: 0xf5c400 }),
    }),
    // the inside of the skin: the cabin tub, matt dark
    forro: new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: 0.92, metalness: 0, side: THREE.BackSide }),
    // dark tinted part of the canopy: roof strip, pillars, the tail of the bubble
    tintado: fis({ color: 0x050607, roughness: 0.08, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.0 }),
    // clear glass: colour and opacity per vertex (black frit at the edges), reflections on top
    cristal: fis({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.01, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 2.0, side: THREE.DoubleSide }),
    negroBrillo: calco({ color: 0x07080a, roughness: 0.12, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03 }),
    led: calco({ color: 0xffffff, emissive: 0xeef4ff, emissiveIntensity: 1.5, roughness: 0.3, polygonOffsetFactor: -4, polygonOffsetUnits: -6 }),
    rojoLuz: calco({ color: 0x8a0710, emissive: 0xff1424, emissiveIntensity: 0.8, roughness: 0.18, clearcoat: 1 }),
    goma: fis({ color: 0x161719, roughness: 0.88, metalness: 0 }),
    tapa: fis({ color: 0x0c0d0f, roughness: 0.22, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
    correa: fis({ color: 0xd4141c, roughness: 0.75, metalness: 0 }),
    plastico: fis({ color: 0x17181b, roughness: 0.6, metalness: 0.1 }),
    carbono: fis({ color: 0x1c1e22, roughness: 0.35, metalness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    aluminio: fis({ color: 0x9a9fa6, roughness: 0.35, metalness: 0.9 }),
    tela: fis({ color: 0x2a2c31, roughness: 0.95, metalness: 0 }),
    arnes: fis({ color: 0xc01520, roughness: 0.8, metalness: 0 }),
    pantalla: fis({ color: 0x05080c, emissive: 0x15304a, emissiveIntensity: 0.7, roughness: 0.08, clearcoat: 1 }),
  };
}
function mats() { return MATS ?? (MATS = crearMateriales()); }
type Mats = ReturnType<typeof crearMateriales>;

const malla = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre: string) => {
  const o = new THREE.Mesh(g, m); o.name = nombre; o.castShadow = true; o.receiveShadow = true; return o;
};
/** Merges parts that share a material (positions and normals only). */
function unir(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  return mergeGeometries(geos.map(g => {
    const n = g.index ? g.toNonIndexed() : g, c = new THREE.BufferGeometry();
    c.setAttribute('position', n.attributes.position);
    if (!n.attributes.normal) n.computeVertexNormals();
    c.setAttribute('normal', n.attributes.normal);
    return c;
  }))!;
}

// ======================================================================= glass
/** Height of the body's upper surface at (x, |z|), by bisection (the canopy's base and the frit need it). */
function alturaCubiertaExacta(x: number, z: number): number {
  const e = estacion(CUERPO, x);
  let lo = (e.yb + e.yt) / 2, hi = e.yt;
  if (semiAncho(e, lo) < z) return lo;
  for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (semiAncho(e, m) >= z) lo = m; else hi = m; }
  return lo;
}
/** The same, from a table every 1 cm over the cabin (x −1.0 … 0.45, |z| 0 … 0.34), bilinear in between. */
const CUB = { x0: -1.0, x1: 0.45, z1: 0.34, d: 0.01 };
let TABLA_CUB: Float32Array | null = null;
function alturaCubierta(x: number, z: number): number {
  const nx = Math.round((CUB.x1 - CUB.x0) / CUB.d) + 1, nz = Math.round(CUB.z1 / CUB.d) + 1;
  if (!TABLA_CUB) {
    TABLA_CUB = new Float32Array(nx * nz);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) TABLA_CUB[i * nz + j] = alturaCubiertaExacta(CUB.x0 + i * CUB.d, j * CUB.d);
  }
  if (x < CUB.x0 || x > CUB.x1 || z > CUB.z1) return alturaCubiertaExacta(x, z);
  const fi = (x - CUB.x0) / CUB.d, fj = z / CUB.d, i = Math.min(nx - 2, Math.floor(fi)), j = Math.min(nz - 2, Math.floor(fj)), u = fi - i, v = fj - j;
  const T = TABLA_CUB, a = T[i * nz + j], b = T[(i + 1) * nz + j], c = T[i * nz + j + 1], d = T[(i + 1) * nz + j + 1];
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
/**
 * How far (m) a canopy point is inside the clear glass: > 0 clear, ≤ 0 dark.
 * Windshield: everything ahead of the A-pillar (x > −0.31). Door windows:
 * between the pillars (x −0.345 … −0.90) and below the roof strip (y 0.93).
 */
const X_PILAR = -0.31, X_VENT0 = -0.345, X_VENT1 = -0.90, Y_TECHO = 0.93;
function margenClaro(x: number, y: number, z: number): number {
  if (x > X_PILAR) return Math.min(x - X_PILAR, 0.43 - x, y - alturaCubierta(x, Math.abs(z)) - 0.012);
  if (x < X_VENT0 && x > X_VENT1) {
    const m = Math.min(X_VENT0 - x, x - X_VENT1, Y_TECHO - y);
    return m <= -0.05 ? m : Math.min(m, y - alturaCubierta(x, Math.abs(z)) - 0.012);
  }
  return -1;
}

// ======================================================================= the parts
/** A station lookup that remembers the last x (the skin asks N times per row with the same x). */
function porFila(es: typeof CUERPO) {
  let ux = NaN, ue = es[0];
  return (x: number) => { if (x !== ux) { ux = x; ue = estacion(es, x); } return ue; };
}
const ES_HUECO = (x: number, y: number, z: number, anchoK: (x: number, y: number) => number) => x < 0.37 && x > -1.0 && y > 0.45 && Math.abs(z) < anchoK(x, y) - 0.028;

function carroceria(M: Mats): THREE.Mesh {
  // rows every 1.2 cm along the cabin (the hole's stepped edge hides under the canopy), 2.4 cm elsewhere
  const paso = (x: number) => (x < 0.42 && x > -1.05 ? 0.013 : x > 0.9 || x < -2.38 ? 0.008 : 0.024);
  const g = piel(CUERPO, {
    N: 144, paso, nClases: 1, clase: (() => {
      const eC = porFila(CUERPO), eK = porFila(CUPULA);
      const anchoK = (x: number, y: number) => (x > 0.43 || x < -2.36 ? 0 : semiAncho(eK(x), y));
      return (x: number, th: number) => { const [y, z] = puntoSeccion(eC(x), th); return ES_HUECO(x, y, z, anchoK) ? -1 : 0; };
    })(),
  });
  // side-view UVs for the livery
  const p = g.attributes.position as THREE.BufferAttribute, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - X_COLA) / LARGO; uv[i * 2 + 1] = p.getY(i) / LIV.YMAX; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  // the same triangles again, drawn from inside in the dark lining
  g.addGroup(0, g.index!.count, 1);
  return malla(g, [M.pintura, M.forro], 'carroceria');
}

function cupula(M: Mats): THREE.Mesh {
  const paso = (x: number) => (x > -1.05 ? 0.009 : 0.02);
  const g = piel(CUPULA, {
    N: 160, paso, nClases: 2, tapas: false, clase: (() => {
      const eC = porFila(CUERPO), eK = porFila(CUPULA);
      return (x: number, th: number) => {
        const [y, z] = puntoSeccion(eK(x), th);
        if (Math.abs(z) < semiAncho(eC(x), y) - 0.006) return -1; // inside the body: cut away
        return margenClaro(x, y, z) > 0 ? 1 : 0;
      };
    })(),
  });
  // per-vertex colour of the clear glass: a black frit fading into a light grey-green tint
  const p = g.attributes.position as THREE.BufferAttribute, col = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    const t = lim((margenClaro(p.getX(i), p.getY(i), p.getZ(i)) - 0.004) / 0.03);
    col.set([0.012 + 0.03 * t, 0.014 + 0.036 * t, 0.016 + 0.04 * t, 1 - 0.45 * t], i * 4);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const o = malla(g, [M.tintado, M.cristal], 'cupula');
  o.customDepthMaterial = sinSombra; // only the clear group would need it; the dark one is drawn by the body's shadow anyway
  return o;
}

/**
 * A ribbon on the body skin (+z side) along a side-view curve, with a width
 * that can vary along it (`ancho(t)`, t ∈ [0, 1]): headlamp slits, LED lines.
 */
function cintaCuerpo(ctrl: [number, number][], ancho: (t: number) => number, delta: number, pasos = 40): THREE.BufferGeometry {
  const pts = new THREE.CatmullRomCurve3(ctrl.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'catmullrom', 0.5).getPoints(pasos);
  const pos: number[] = [], idx: number[] = [];
  const enLado = (x: number, y: number) => {
    const e = estacion(CUERPO, x), th = thetaY(e, y), [py0, pz] = puntoSeccion(e, th), [ny, nz] = normalSeccion(e, th);
    pos.push(x, py0 + ny * delta, pz + nz * delta);
  };
  pts.forEach((p, k) => {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const w = ancho(k / pasos) / 2;
    enLado(p.x - ty * w, p.y + tx * w); enLado(p.x + ty * w, p.y - tx * w);
  });
  for (let k = 0; k < pts.length - 1; k++) { const a = 2 * k; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** A soft-edged box (a superellipsoid): seat cushions, dash, hinge blocks. */
function caja(sx: number, sy: number, sz: number, r: number): THREE.BufferGeometry {
  const s = new THREE.SphereGeometry(1, 18, 12), p = s.attributes.position as THREE.BufferAttribute;
  const e = Math.max(0.12, Math.min(0.5, 2.2 * r / Math.min(sx, sy, sz))), f = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i)) * sx / 2, f(p.getY(i)) * sy / 2, f(p.getZ(i)) * sz / 2);
  s.deleteAttribute('uv'); s.computeVertexNormals();
  return s;
}

/**
 * Wheel with a 95/80 R16-class tyre and flat black aero covers on both sides
 * (the photos show black discs). Axle along Z, centre at the origin.
 */
function geometriasRueda() {
  const R = R_RUEDA, w = ANCHO_RUEDA / 2, rL = R_LLANTA + 0.006;
  const perfil: [number, number][] = [
    [rL - 0.004, -(w - 0.014)], [rL + 0.012, -(w - 0.002)], [rL + 0.03, -(w + 0.004)], [(rL + R) / 2, -(w + 0.006)],
    [R - 0.024, -(w + 0.001)], [R - 0.01, -(w - 0.008)], [R - 0.002, -(w - 0.022)], [R, -(w - 0.032)],
    [R, w - 0.032], [R - 0.002, w - 0.022], [R - 0.01, w - 0.008], [R - 0.024, w + 0.001],
    [(rL + R) / 2, w + 0.006], [rL + 0.03, w + 0.004], [rL + 0.012, w - 0.002], [rL - 0.004, w - 0.014],
  ];
  const aplastado = 0.006;
  const neumatico = torno(perfil, 96, (a, _h, r) => { const s = -Math.sin(a); return s > 0 && r * s > R - aplastado ? (R - aplastado) / s : r; });
  // the cover: a very shallow dish over the rim and the bead, with a small hub cap
  const hD = (r: number) => w + 0.002 - 0.008 * (1 - (r / (rL + 0.03)) ** 2);
  const disco: [number, number][] = [];
  for (let k = 0; k <= 8; k++) { const r = (rL + 0.03) * (1 - k / 8); disco.push([r, hD(r)]); }
  const tapa = torno(disco, 72);
  const buje = torno([[0.035, hD(0.035) + 0.0005], [0.03, hD(0.03) + 0.004], [0.0, hD(0) + 0.005]], 32);
  return { neumatico, tapa, buje };
}

function rueda(G: ReturnType<typeof geometriasRueda>, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  g.add(malla(G.neumatico, M.goma, 'neumatico'));
  for (const lado of [1, -1]) {
    const t = new THREE.Group(); t.scale.z = lado; g.add(t);
    t.add(malla(G.tapa, M.tapa, 'tapacubos'), malla(G.buje, M.plastico, 'tapacubos'));
  }
  return g;
}

/**
 * The cabin seen through the glass: the driver's reclined carbon seat shell
 * with a red harness, the small rectangular steering wheel on its column, a
 * slim dash with a display, the roll hoop behind the seat and the floor. No
 * driver: the garage shows the car.
 */
function cabina(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'cabina';
  // seat shell: cushion and backrest (leaning back ~32°), with side wings
  const cojin = caja(0.40, 0.06, 0.40, 0.025); cojin.rotateZ(0.10); cojin.translate(-0.42, 0.17, 0);
  const respaldo = caja(0.06, 0.66, 0.42, 0.03); respaldo.translate(0, 0.33, 0); respaldo.rotateZ(0.56); respaldo.translate(-0.60, 0.17, 0);
  const alas: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const a = caja(0.07, 0.5, 0.04, 0.015); a.translate(0.035, 0.27, 0); a.rotateZ(0.56); a.translate(-0.60, 0.19, s * 0.21); alas.push(a);
  }
  const reposa = caja(0.07, 0.16, 0.24, 0.03); reposa.rotateZ(0.56); reposa.translate(-0.94, 0.80, 0);
  g.add(malla(unir([cojin, respaldo, reposa, ...alas]), M.carbono, 'asiento'));
  // padding on the backrest
  const acolchado = caja(0.03, 0.52, 0.32, 0.015); acolchado.translate(0.035, 0.32, 0); acolchado.rotateZ(0.56); acolchado.translate(-0.60, 0.17, 0);
  g.add(malla(acolchado, M.tela, 'asiento'));
  // harness: two shoulder straps and a lap belt
  const correas: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const c = caja(0.012, 0.42, 0.045, 0.004); c.translate(0.06, 0.2, 0); c.rotateZ(0.56); c.translate(-0.62, 0.37, s * 0.08); correas.push(c);
  }
  const cintura = caja(0.05, 0.012, 0.36, 0.004); cintura.translate(-0.43, 0.25, 0); correas.push(cintura);
  g.add(malla(unir(correas), M.arnes, 'arnes'));
  // steering: a small rectangular wheel with grips, on a column going down to the floor ahead
  const aro: THREE.Vector3[] = [];
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const r = 1 / Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), 0.25);
    aro.push(new THREE.Vector3(0, s * r * 0.075, c * r * 0.13));
  }
  const volante = barrido(aro, () => [0.013, 0.013], { lados: 8, cerrado: true, arriba: new THREE.Vector3(1, 0, 0) });
  const cubo = caja(0.04, 0.08, 0.11, 0.015);
  const vol = unir([volante, cubo]); vol.rotateZ(0.5); vol.translate(-0.14, 0.52, 0);
  // the column runs forward and down from the hub to the front bulkhead
  const columna = barrido([new THREE.Vector3(-0.13, 0.515, 0), new THREE.Vector3(0.05, 0.44, 0), new THREE.Vector3(0.30, 0.33, 0)], () => [0.015, 0.015], { lados: 10 });
  g.add(malla(unir([vol, columna]), M.plastico, 'volante'));
  // dash: a slim cowl under the windshield base with a display
  const tablero = caja(0.22, 0.05, 0.46, 0.02); tablero.rotateZ(0.25); tablero.translate(0.10, 0.575, 0);
  g.add(malla(tablero, M.plastico, 'salpicadero'));
  const pantalla = caja(0.012, 0.06, 0.11, 0.004); pantalla.rotateZ(-0.35); pantalla.translate(0.02, 0.61, 0);
  g.add(malla(pantalla, M.pantalla, 'pantalla'));
  // roll hoop behind the seat, following the canopy 4 cm inside it
  const arco: THREE.Vector3[] = [];
  const xa = -0.98, e = estacion(CUPULA, xa);
  for (let k = 0; k <= 24; k++) {
    const th = 0.12 + (Math.PI - 0.24) * k / 24, [y, z] = puntoSeccion(e, th);
    const yc = (e.yb + e.yt) / 2;
    arco.push(new THREE.Vector3(xa, yc + (y - yc) * 0.86, z * 0.82));
  }
  arco.unshift(new THREE.Vector3(xa, 0.2, arco[0].z)); arco.push(new THREE.Vector3(xa, 0.2, arco[arco.length - 1].z));
  g.add(malla(barrido(arco, () => [0.016, 0.016], { lados: 10 }), M.aluminio, 'arco'));
  // floor: a dark plate over the inside of the skin
  const suelo = new THREE.PlaneGeometry(1.25, 0.9); suelo.rotateX(-Math.PI / 2); suelo.translate(-0.3, 0.14, 0);
  g.add(malla(suelo, M.tela, 'suelo'));
  return g;
}

// ======================================================================= assembly
let PLANTILLA: THREE.Group | null = null;
export function construir(): THREE.Group {
  if (!PLANTILLA) PLANTILLA = construirPlantilla();
  const g = PLANTILLA.clone(true), copias = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  g.traverse(o => {
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    let c = copias.get(m.geometry); if (!c) { c = m.geometry.clone(); copias.set(m.geometry, c); }
    m.geometry = c;
    if (m.name === 'cupula') m.customDepthMaterial = sinSombra;
  });
  return g;
}

function construirPlantilla(): THREE.Group {
  const M = mats();
  const g = new THREE.Group(); g.name = 'szemission';
  const add = (o: THREE.Object3D) => { g.add(o); return o; };
  /** The part and its mirror on the −z side (shared geometry, mirrored by scale). */
  const par = (geo: THREE.BufferGeometry, m: THREE.Material, nombre: string) => {
    add(malla(geo, m, nombre)); const o = malla(geo, m, nombre); o.scale.z = -1; add(o);
  };

  add(carroceria(M));
  add(cupula(M));
  add(cabina(M));

  // ---- slit headlamps on the nose shoulders: a black glossy slit tapering at both ends, an LED line inside
  const FARO: [number, number][] = [[0.80, 0.462], [0.70, 0.486], [0.58, 0.512], [0.48, 0.532], [0.42, 0.541]];
  const ahusado = (h: number) => (t: number) => h * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t * 1.05))), 0.45) * (0.55 + 0.45 * (1 - t));
  par(cintaCuerpo(FARO, ahusado(0.03), 0.0015), M.negroBrillo, 'faro');
  par(cintaCuerpo(FARO.slice(0, 4), ahusado(0.007), 0.0028, 30), M.led, 'faro');

  // ---- tail lamp: a red strip across the tip of the tail lip
  {
    // follows the rounded end of the lip in plan, 2 mm proud of the skin
    const ruta: THREE.Vector3[] = [], y = 0.346;
    for (let k = 0; k <= 14; k++) {
      const z = -0.075 + 0.15 * k / 14;
      let lo = -2.449, hi = -2.30;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (anchoCuerpo(m, y) >= Math.abs(z)) hi = m; else lo = m; }
      ruta.push(new THREE.Vector3(hi - 0.002, y, z));
    }
    add(malla(barrido(ruta, () => [0.0045, 0.0065], { lados: 10, arriba: new THREE.Vector3(0, 1, 0) }), M.rojoLuz, 'piloto'));
  }

  // ---- red towing strap under the nose (the rules ask for a towing point at the front)
  {
    const lazo: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) { const a = Math.PI * k / 16; lazo.push(new THREE.Vector3(0.80 + 0.018 * Math.cos(a), 0.165 - 0.085 - 0.02 * Math.sin(a), 0)); }
    lazo.unshift(new THREE.Vector3(0.818, 0.168, 0)); lazo.push(new THREE.Vector3(0.782, 0.168, 0));
    add(malla(barrido(lazo, () => [0.022, 0.0035], { lados: 8, arriba: new THREE.Vector3(0, 0, 1) }), M.correa, 'remolque'));
    const base = caja(0.06, 0.012, 0.05, 0.004); base.translate(0.80, 0.168, 0);
    add(malla(base, M.plastico, 'remolque'));
  }

  // ---- wiper, parked on the windshield (pivot at the top, as in the photo in front of the building)
  {
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 14; k++) {
      const x = -0.30 + (0.20 + 0.30) * k / 14, e = estacion(CUPULA, x), [y] = puntoSeccion(e, Math.PI / 2 - 0.10);
      const [ny, nz] = normalSeccion(e, Math.PI / 2 - 0.10), [, z] = puntoSeccion(e, Math.PI / 2 - 0.10);
      pts.push(new THREE.Vector3(x, y + ny * 0.007, z + nz * 0.007));
    }
    add(malla(barrido(pts, t => [0.004 + 0.003 * (1 - t), 0.0035], { lados: 8 }), M.plastico, 'limpiaparabrisas'));
    const pivote = new THREE.CylinderGeometry(0.012, 0.015, 0.014, 14); pivote.translate(pts[0].x, pts[0].y - 0.006, pts[0].z);
    add(malla(pivote, M.plastico, 'limpiaparabrisas'));
  }

  // ---- gull-wing door hinges on the canopy ridge
  {
    const bisagras: THREE.BufferGeometry[] = [];
    for (const x of [-0.46, -0.80]) {
      const e = estacion(CUPULA, x), b = caja(0.05, 0.012, 0.022, 0.004);
      b.translate(x, e.yt + 0.003, 0); bisagras.push(b);
    }
    add(malla(unir(bisagras), M.aluminio, 'bisagra'));
  }

  // ---- wheels (front track 1.00, rear 0.80); the left ones are the same geometry turned round
  const G = geometriasRueda();
  for (const [x, via] of [[0, VIA_DEL], [-BATALLA, VIA_TRAS]] as [number, number][]) {
    for (const s of [1, -1]) { const r = rueda(G, M); r.position.set(x, R_RUEDA - 0.006, s * via / 2); add(r); }
  }

  g.traverse(o => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
