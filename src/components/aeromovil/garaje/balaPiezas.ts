import * as THREE from 'three';
import { E, loft } from './forma';
import { barrido, curva, parcheM, piel, thetaY, torno } from './apteraPiel';
import { APLASTADO, geometriasRueda } from './apteraDetalle';
import { type FormaBala } from './balaForma';
import { ALETA, ASIENTO, BUTACA, anchoSalpicadero, brazosDe, escalaManillar, podDe, semiAncho, semiRespaldoButaca, techoEn, type Asientos } from './balaMedidas';
export { ALETA, ASIENTO, POD, POD_SEMIANCHO, brazosDe, extremoManillar, podDe, techoEn, type Asientos } from './balaMedidas';

/*
 * Materials and the separate parts of the «Cuadriciclo Bala en rombo»: wheels, the
 * lateral wheel pods and their arms, the tail fin, the interior (saddle,
 * tank, handlebar, dash, footrests, grab rail, backrest) and the camera pods.
 * The skin, the canopy glass and everything painted on the skin are in
 * `balaModelo.ts`. Everything is drawn by code; no logos or lettering.
 *
 * Every part takes the shape (`FormaBala`): the garage model passes the
 * reference shape, the editor its own (2026-11-09, «permíteme editarlo»).
 * Parts placed by hand in the reference drawing follow the shape through its
 * x map (`F.X`), its belly lift (`F.dSuelo`) and, for the lateral wheels, the
 * ratio of their radius to the reference 20″.
 *
 * Livery: the Aeromóvil family's. The Aeromóvil 1 is pearl white with a dark
 * navy nose piece and red lamps (Visor3D.tsx: 0xf4f5f6, 0x182544,
 * 0xd33a2c); the Bala takes the same three: white body, navy nose cone, tail
 * cone, belly, canopy frame, fin and arms, and red only in small details
 * (a pinstripe, the fin tip, the rear light ring).
 */

// ======================================================================= materials
/** Glass casts no shadow: a depth material that discards every fragment (see xl1Modelo.ts). */
export const sinSombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, opacity: 0 });

/** LED row for the lamps: small bright cells on a dark field (u along the strip). */
function texturaLed(rojo: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const W = 256, H = 16, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = rojo ? '#3a0204' : '#202832'; c.fillRect(0, 0, W, H);
  for (let x = 2; x < W; x += 8) {
    const g = c.createRadialGradient(x + 2, H / 2, 0.5, x + 2, H / 2, 5);
    g.addColorStop(0, rojo ? '#ff6a5a' : '#ffffff'); g.addColorStop(0.5, rojo ? '#e0141a' : '#dce9ff'); g.addColorStop(1, rojo ? 'rgba(90,0,4,0)' : 'rgba(40,50,60,0)');
    c.fillStyle = g; c.fillRect(x - 4, 0, 12, H);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Fine grain for the pearl paint (roughness and a whisper of bump), like the Aeromóvil's. */
function texturaGrano(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#8c8c8c'; c.fillRect(0, 0, N, N);
  let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) { const v = 100 + Math.floor(rnd() * 70); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(rnd() * N, rnd() * N, 1, 1); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6);
  return t;
}
/** Stitched saddle: a quilted diamond pattern in dark leather (u along the saddle). */
function texturaAsiento(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#2a2d33'; c.fillRect(0, 0, N, N);
  c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 3;
  for (let k = -N; k < 2 * N; k += 32) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + N, N); c.stroke(); c.beginPath(); c.moveTo(k, N); c.lineTo(k + N, 0); c.stroke(); }
  c.strokeStyle = 'rgba(200,30,40,0.55)'; c.lineWidth = 1; // red stitching, a small red detail
  for (let k = -N; k < 2 * N; k += 32) { c.setLineDash([3, 3]); c.beginPath(); c.moveTo(k + 2, 0); c.lineTo(k + N + 2, N); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4);
  return t;
}

/**
 * One solar cell of the Triciclo's roof (2026-11-10, round two): monocrystalline, with its clipped corners, its fine
 * fingers and three busbars. uv (1, 1) is one 125 mm cell (the A1's `CELULA`).
 * Round 4 (2026-11-13, Eugenio: «los paneles solares también tienen que ser más discretos como los del aptera, y con ese
 * toque cristalizado»): dark navy-to-black cells on a dark slate backsheet, the grid faint (fingers at 10 %, busbars at
 * 22 %), the colours of the garage Aptera's cells (apteraDetalle.ts): before, bright blue cells on a light grey backsheet
 * with white busbars. A first try with a black backsheet and 6 % / 18 % lines read as plain glass from the 3/4 view.
 */
function texturaSolar(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#2a303b'; c.fillRect(0, 0, N, N);   // the backsheet showing between the cells: dark slate
  const m = 3, k = 14;
  c.beginPath(); c.moveTo(m + k, m); c.lineTo(N - m - k, m); c.lineTo(N - m, m + k); c.lineTo(N - m, N - m - k); c.lineTo(N - m - k, N - m); c.lineTo(m + k, N - m); c.lineTo(m, N - m - k); c.lineTo(m, m + k); c.closePath();
  const g = c.createLinearGradient(0, 0, N, N); g.addColorStop(0, '#0d1830'); g.addColorStop(0.5, '#0a1226'); g.addColorStop(1, '#0e1a33');
  c.fillStyle = g; c.fill();
  c.save(); c.clip();
  c.strokeStyle = 'rgba(120,140,170,0.10)'; c.lineWidth = 0.6;
  for (let y = m + 2; y < N; y += 3.2) { c.beginPath(); c.moveTo(0, y); c.lineTo(N, y); c.stroke(); }
  c.strokeStyle = 'rgba(150,165,190,0.22)'; c.lineWidth = 1;
  for (const x of [N * 0.25, N * 0.5, N * 0.75]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, N); c.stroke(); }
  c.restore();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/**
 * The glass tint with its black frit: each glass vertex carries `borde`, its
 * distance to the glass outline minus the frit width. The shader thresholds
 * the interpolated distance over one pixel (fwidth), so the frit's inner edge
 * is a crisp, antialiased curve however close the camera gets (the technique
 * of xl1Modelo.ts).
 */
function frit(m: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  m.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float borde;\nvarying float vBorde;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBorde = borde;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vBorde;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        '{ float w = max(fwidth(vBorde), 1e-5); float f = smoothstep(-w, w, vBorde);',
        // smoke-blue tint, see-through: 64 % over the cabin
        '  diffuseColor.rgb = mix(vec3(0.008, 0.009, 0.012), vec3(0.020, 0.030, 0.042), f);',
        '  diffuseColor.a = mix(1.0, 0.64, f); }',
      ].join('\n'));
  };
  m.customProgramCacheKey = () => 'bala-frit';
  return m;
}

let MATS: ReturnType<typeof crearMateriales> | null = null;
/** A new set of materials: the editor's Bala has its own, so «Rayos X» and «Corte» never touch the garage's. */
export function crearMateriales() {
  const F = THREE.FrontSide, D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: F, ...p });
  // parts laid on the skin: drawn a hair in front of it, so they never flicker
  const decal = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, ...p });
  const grano = texturaGrano(), asiento = texturaAsiento(), solar = texturaSolar();
  const pintura = { color: 0xf4f5f6, metalness: 0.12, roughness: 0.32, roughnessMap: grano, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.15, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 1.1 };
  const azul = { color: 0x182544, metalness: 0.2, roughness: 0.32, roughnessMap: grano, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1 };
  return {
    // the Aeromóvil's pearl white and its navy (Visor3D.tsx `body` and `morro`)
    chapa: fis(pintura),
    marino: fis(azul),
    chapaCalco: decal(pintura),
    marinoCalco: decal(azul),
    // inside of the skin, seen through the canopy: dark trim
    // (its shadow side is the back too: by default a back-side material puts the skin's front faces in the
    // shadow map, and the lit skin then shadows itself in dashes)
    forro: new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.92, metalness: 0, side: THREE.BackSide, shadowSide: THREE.BackSide }),
    rojo: decal({ color: 0xc8202c, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }),
    rojoPieza: fis({ color: 0xc8202c, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }),
    marinoDoble: fis({ ...azul, side: D }),
    chapaDoble: fis({ ...pintura, side: D }),
    rojoDoble: fis({ color: 0xc8202c, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, side: D }),
    junta: decal({ color: 0x0a0a0b, roughness: 0.95, polygonOffsetFactor: -4, polygonOffsetUnits: -6, side: D }),
    // glass: tint and black frit at the edge, both drawn by the `frit` shader ...
    tinte: frit(fis({ color: 0xffffff, transparent: true, depthWrite: false, alphaTest: 0.01, roughness: 0.1, metalness: 0, side: D })),
    // ... plus its reflections, added on top so they do not fade with the tint
    reflejo: fis({ color: 0x000000, roughness: 0.03, metalness: 0, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.7 }),
    lente: decal({ color: 0x000000, roughness: 0.02, transparent: true, depthWrite: false, alphaTest: 0.01, blending: THREE.AdditiveBlending, envMapIntensity: 1.9, polygonOffsetFactor: -6, polygonOffsetUnits: -8 }),
    negroBrillo: decal({ color: 0x07080a, roughness: 0.12, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.04 }),
    negroMate: decal({ color: 0x0d0e10, roughness: 0.7, metalness: 0.05 }),
    grisOscuro: decal({ color: 0x2a2c30, roughness: 0.55, metalness: 0.25 }),
    led: decal({ color: 0xffffff, emissive: 0xf3f8ff, emissiveIntensity: 1.3, roughness: 0.3, polygonOffsetFactor: -5, polygonOffsetUnits: -6 }),
    ledTira: decal({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.95, emissiveMap: texturaLed(false), map: texturaLed(false), roughness: 0.25, polygonOffsetFactor: -5, polygonOffsetUnits: -6 }),
    rojoLed: decal({ color: 0xffffff, emissive: 0xff2a20, emissiveIntensity: 0.85, emissiveMap: texturaLed(true), map: texturaLed(true), roughness: 0.2, polygonOffsetFactor: -5, polygonOffsetUnits: -6 }),
    ambar: fis({ color: 0xffb321, emissive: 0xff9a00, emissiveIntensity: 0.8, roughness: 0.25, clearcoat: 1 }),
    proyector: fis({ color: 0x0c0f14, roughness: 0.02, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.01 }),
    // the Triciclo's solar roof (round two): cells under a glossy film; both faces (from inside it is the cabin's roof)
    // (round 4, «con ese toque cristalizado»: the garage Aptera's panel material (apteraDetalle.ts), a mirror-like clear
    // coat over a satin base, so the sky reflects on it and it reads as part of the glass)
    solar: fis({ color: solar ? 0xffffff : 0x0c1428, map: solar, roughness: 0.2, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4, side: D, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
    // wheels
    goma: fis({ color: 0x18191b, roughness: 0.86, metalness: 0 }),
    tapa: fis({ color: 0xd9dcdf, metalness: 0.6, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.08 }),
    tapaOscura: fis({ color: 0x23262b, metalness: 0.5, roughness: 0.35 }),
    // interior
    cuero: fis({ color: 0xffffff, map: asiento, roughness: 0.62, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color(0x6a7080), sheenRoughness: 0.6 }),
    carbono: fis({ color: 0x1a1b1e, roughness: 0.35, metalness: 0.2, clearcoat: 0.8 }),
    plastico: fis({ color: 0x17181a, roughness: 0.55, metalness: 0.1, side: D }),
    gomaMate: fis({ color: 0x111214, roughness: 0.9, metalness: 0 }),
    aluminio: fis({ color: 0xb8bec5, metalness: 0.9, roughness: 0.28 }),
    pantalla: fis({ color: 0x05080c, emissive: 0x16324a, emissiveIntensity: 0.7, roughness: 0.1, clearcoat: 1 }),
  };
}
export function mats() { return MATS ?? (MATS = crearMateriales()); }
export type Mats = ReturnType<typeof crearMateriales>;

export const malla = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre?: string, sombra = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = sombra; o.receiveShadow = true; if (nombre) o.name = nombre; return o;
};

// ======================================================================= wheels
/**
 * A wheel: tyre with a rounded sidewall and grooves, flattened at the contact
 * patch, and a smooth aero cover on both faces (geometry from apteraDetalle.ts).
 * Axle along Z; the group's origin is the axle.
 */
function rueda(R: number, ancho: number, M: Mats, nombre: string): THREE.Group {
  const G = geometriasRueda(R, ancho);
  const g = new THREE.Group(); g.name = nombre;
  g.add(malla(G.neumatico, M.goma, 'neumatico'));
  for (const lado of [1, -1]) {
    const t = new THREE.Group(); t.scale.z = lado; g.add(t);
    t.add(malla(G.tapa, M.tapa, 'tapacubos'), malla(G.ranura, M.tapaOscura, 'tapacubos'), malla(G.centro, M.tapaOscura, 'tapacubos'));
  }
  return g;
}
/**
 * The four wheels: 24″ front and rear on the centre line (inside the body), 20″ lateral ones in the pods (the reference sizes).
 * The Triciclo (2026-11-10, `triciclo`): no front centre wheel; the wheels in pods are its front, steering ones
 * ('rueda-direccion', `userData.lado` ±1, turned by the viewer about their vertical axis).
 */
export function ruedas(F: FormaBala, M: Mats, triciclo = false, traseras: FormaBala | null = null): THREE.Group {
  const g = new THREE.Group(); g.name = 'ruedas';
  if (triciclo) {
    // the «Cuadriciclo Bala clásico» (2026-11-11): two rear wheels in their pods, at the rear track (`traseras`, the rear pods' view of the shape)
    if (traseras) for (const s of [1, -1]) { const t = rueda(traseras.R_LAT, traseras.ANCHO_NEU_LAT, M, 'rueda-trasera'); t.position.set(traseras.X_LAT, traseras.R_LAT - APLASTADO, s * traseras.VIA_LAT / 2); g.add(t); }
    else { const tras = rueda(F.R_DEL, F.ANCHO_NEU, M, 'rueda-trasera'); tras.position.set(-F.BATALLA, F.R_DEL - APLASTADO, 0); g.add(tras); }
    for (const s of [1, -1]) { const d = rueda(F.R_LAT, F.ANCHO_NEU_LAT, M, 'rueda-direccion'); d.position.set(F.X_LAT, F.R_LAT - APLASTADO, s * F.VIA_LAT / 2); d.userData.lado = s; g.add(d); }
    return g;
  }
  const del = rueda(F.R_DEL, F.ANCHO_NEU, M, 'rueda-delantera'); del.position.set(0, F.R_DEL - APLASTADO, 0); g.add(del);
  const tras = del.clone(); tras.name = 'rueda-trasera'; tras.position.set(-F.BATALLA, F.R_DEL - APLASTADO, 0); g.add(tras);
  const lat = rueda(F.R_LAT, F.ANCHO_NEU_LAT, M, 'rueda-lateral'); lat.position.set(F.X_LAT, F.R_LAT - APLASTADO, F.VIA_LAT / 2); g.add(lat);
  const izq = lat.clone(); izq.position.z = -F.VIA_LAT / 2; g.add(izq);
  return g;
}

// ======================================================================= pods
/** Height of the navy waterline on the pods: the body's at the lateral wheels (balaModelo.ts), which lifts with the belly. */
const Y_FLOTACION_POD = 0.39;
/** Radius of the reference lateral wheel (20″): the pod is drawn for it. */
const R_LAT_REF = 0.254;
export function carenados(F: FormaBala, M: Mats, trasero = false): THREE.Group {
  // `trasero` (2026-11-11, the «Cuadriciclo Bala clásico»): the rear pods, from the rear pods' view of the shape; named
  // apart and without `lado`, so the viewer never steers them
  const g = new THREE.Group(); g.name = trasero ? 'carenados-traseros' : 'carenados';
  const POD = podDe(F), k = F.R_LAT / R_LAT_REF, Y_FLOT = Y_FLOTACION_POD + F.dSuelo * 0.6, semiAnchoPod = semiAncho(POD);
  const casco = piel(POD, { N: 56, sub: 6 });
  // the pod's ends (the Triciclo's pods change length: read from the pod itself; the Cuadriciclo en rombo's stay the drawn numbers)
  const o = F.D.pod, xP0 = o ? POD[0].x - 1e-4 * k : 0.3849 * k, xP1 = o ? POD[POD.length - 1].x + 1e-4 * k : -0.5499 * k, xLuz = o ? POD[0].x : 0.385 * k;
  // navy below the body's waterline (0.39 m at the pods), so the line runs on across them
  const falda = parcheM(POD, xP0, xP1, e => {
    if (e.yb >= Y_FLOT) return null;
    const a = thetaY(e, Math.min(Y_FLOT, e.yt - 0.002)); return [Math.PI - a, 2 * Math.PI + a];
  }, { nx: 90, nth: 26, delta: 0.0012, bordes: true });
  // the red pinstripe carries on across the pod, at the body's height (outer and inner faces)
  const filete = (lado: 0 | 1) => parcheM(POD, xP0, xP1, e => {
    const y0 = Y_FLOT + 0.011, y1 = Y_FLOT + 0.019;
    if (e.yb >= y0 || e.yt <= y1) return null;
    const a = thetaY(e, y0), b = thetaY(e, y1); return lado ? [Math.PI - b, Math.PI - a] : [a, b];
  }, { nx: 90, nth: 2, delta: 0.0016, bordes: true });
  const filetes = [filete(0), filete(1)];
  // front indicator: a slim amber lens down the leading edge, outer side
  const luz: THREE.Vector3[] = [];
  for (let j = 0; j <= 12; j++) {
    const y = o ? R_LAT_REF * k + ((0.40 - 0.13 * j / 12) * k - R_LAT_REF * k) * o.esc : (0.40 - 0.13 * j / 12) * k;
    // x of the leading edge at this height, then 1.5 cm back and on the outer side
    let x = xLuz; for (let xx = xLuz; xx > (o ? xLuz - 0.185 * k : 0.2 * k); xx -= 0.002) if (semiAnchoPod(xx, y) > 0.02) { x = xx; break; }
    const w = semiAnchoPod(x - 0.012, y);
    luz.push(new THREE.Vector3(x - 0.012, y, w * 0.72 + 0.003));
  }
  const ambar = barrido(luz, () => [0.007, 0.004], { lados: 8, arriba: new THREE.Vector3(1, 0, 0) });
  for (const s of [1, -1] as const) {
    // `lado`: the Triciclo's viewer turns its (front) pods with the wheels, about this group's vertical axis
    const c = new THREE.Group(); c.name = trasero ? 'carenado-trasero' : 'carenado'; if (!trasero) c.userData.lado = s; c.position.set(F.X_LAT, 0, s * F.VIA_LAT / 2); c.scale.z = s; g.add(c);
    c.add(malla(casco, M.chapa, 'carenado'), malla(falda, M.marinoCalco, 'carenado-falda'), malla(ambar, M.ambar, 'intermitente', false));
    for (const f of filetes) c.add(malla(f, M.rojo, 'filete', false));
    // arms: from inside the body skin to inside the pod
    for (const b of brazosDe(F)) {
      // (the Triciclo lifted, round three: from the body at `yCuerpo` down to the pod at `y`)
      const xb = F.X_LAT + b.x, z0 = F.ladoZ(xb, b.yCuerpo) - 0.008, z1 = F.VIA_LAT / 2 - 0.02;
      if (!Number.isFinite(z0)) continue;
      const ruta = [new THREE.Vector3(xb, b.yCuerpo, s * z0), new THREE.Vector3(xb, (b.yCuerpo + b.y) / 2 + 0.003, s * (z0 + z1) / 2), new THREE.Vector3(xb, b.y, s * z1)];
      g.add(malla(barrido(ruta, () => [b.cuerda / 2, b.grueso / 2], { lados: 16 }), M.marino, 'brazo'));
    }
  }
  return g;
}
// ======================================================================= fin
/**
 * The tail fin: a small swept stabiliser on the end of the tail cone, as on a
 * jet. Root chord along the skin from x = −2.50 to −3.05; tip chord 0.14 m at
 * 1.00 m up (about 0.35 m above the falling tail); leading edge swept ~45°.
 * Symmetric aerofoil section (NACA 00xx thickness, 3 cm at the root, 1.2 cm
 * at the tip), navy with a red tip cap (painted).
 */
type P2 = [number, number];
/** The fin of this shape: chords follow the tail through its x map; `alto` is the height of the tip's leading edge above the road. */
export function aleta(F: FormaBala, M: Mats, alto = ALETA.punta[0][1]): THREE.Group {
  const g = new THREE.Group(); g.name = 'aleta';
  const NU = 40, NV = 24, { grueso } = ALETA;
  const raiz = ALETA.raiz.map(F.X) as [number, number];
  const punta: [P2, P2] = [[F.X(ALETA.punta[0][0]), alto], [F.X(ALETA.punta[1][0]), alto === ALETA.punta[0][1] ? ALETA.punta[1][1] : alto - 0.01]];
  const pos: number[] = [], idxA: number[] = [], idxR: number[] = [];
  // chordwise columns: up the right side from the trailing edge to the leading edge and back down the left
  const cols = 2 * NU + 1;
  const espesor = (u: number) => 2.969 * Math.sqrt(u) - 1.26 * u - 3.516 * u * u + 2.843 * u ** 3 - 1.036 * u ** 4; // NACA 00xx, peak 1.0
  for (let j = 0; j <= NV; j++) {
    const v = j / NV;
    // the tip is rounded off: the section shrinks over the last 10 % of the span
    const q = Math.max(0, (v - 0.9) / 0.1), cierre = Math.sqrt(Math.max(0, 1 - q * q));
    for (let c = 0; c < cols; c++) {
      const lado = c < NU ? 1 : c > NU ? -1 : 0, k = c <= NU ? NU - c : c - NU;
      const u = 0.5 - 0.5 * Math.cos(Math.PI * k / NU); // 0 at the leading edge (centre column), more columns at both edges
      const uu = 1 - u; // 1 at the leading edge
      const xr = raiz[0] + (raiz[1] - raiz[0]) * (1 - uu), yr = techoEn(F, Math.max(F.X(-3.09), xr)) - 0.012;
      const xt = punta[0][0] + (punta[1][0] - punta[0][0]) * (1 - uu), yt = punta[0][1] + (punta[1][1] - punta[0][1]) * (1 - uu);
      const x = xr + (xt - xr) * v, y = yr + (yt - yr) * v;
      const chord = 1 - uu; // 0 at the leading edge, 1 at the trailing edge
      const z = lado * (grueso[0] + (grueso[1] - grueso[0]) * v) * espesor(Math.max(0, chord)) * cierre;
      pos.push(x, y, z);
    }
  }
  for (let j = 0; j < NV; j++) for (let c = 0; c < cols - 1; c++) {
    const a = j * cols + c, b = a + 1, d = a + cols, e = d + 1;
    (j >= NV - 3 ? idxR : idxA).push(a, b, d, b, e, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex([...idxA, ...idxR]); geo.addGroup(0, idxA.length, 0); geo.addGroup(idxA.length, idxR.length, 1);
  geo.computeVertexNormals();
  const m = malla(geo, [M.marinoDoble, M.rojoDoble], 'aleta');
  g.add(m);
  return g;
}

// ======================================================================= interior
/**
 * What shows through the canopy: a motorcycle cockpit for two, astride.
 * Pilot's hips at x ≈ −1.06 on the front of a stepped saddle (seat 0.44 m
 * up), the passenger's at x ≈ −1.54 on the raised rear part (0.47 m), with a
 * small backrest and a grab rail round it. Between the pilot's knees a navy
 * «tank» rises to the steering head, with the dash screen and the handlebar
 * on top. Pilot's footboards forward of the knees, passenger's footpegs beside
 * the pilot's hips. Simple volumes: they are seen through tinted glass.
 */
/**
 * The cockpit for these seats. The drawing is the reference one; moving a rider
 * moves what belongs to them: the pilot's end of the saddle, the rear of the
 * tank and the footboards with the pilot; the passenger's end, the backrest,
 * the grab rail and the footpegs with the passenger; the saddle in between is
 * stretched. The steering head, dash and handlebar stay over the front wheel.
 * Everything that stands on the floor lifts with the belly; parts that reach
 * out sideways (bars, footrests, rail, saddle) narrow with a narrower body.
 */
/**
 * The Triciclo's cockpit (2026-11-10): both riders lean on a backrest that reclines
 * (`recPil`, `recPas`, degrees back from the vertical), the handlebar and the pilot's
 * footboards move (`man`, `pies`: [x, y] in m), and the frame is drawn by the
 * viewer from the model's tubes, so the carbon spine is left out.
 */
export interface CabinaTriciclo {
  recPil: number; recPas: number; man: [number, number]; pies: [number, number];
  /**
   * Round three (2026-11-11): «tres filas» instead of the astride saddle. Car-style seats (geometriaTriciclo.ts
   * `AsientoFila`): hips x, centre z, cushion top y, size, recline and folded. Absent: the astride cockpit.
   */
  filas?: AsientoCoche[];
  /**
   * 2026-11-12 (the «Cuadriciclo Bala clásico»), all optional, absent = as before: what the saddle stands on (it thins
   * down to it, never into it); how much the passenger's footpegs rise onto the battery pack; a steering wheel instead
   * of the handlebar (hub, rim radius, tilt), on a column from the steering head; a dashboard from side to side.
   */
  sueloSillin?: number;
  alzaPas?: number;
  volante?: { c: [number, number]; r: number; inc: number } | null;
  cabezaDireccion?: [number, number, number];
  salpicadero?: { x0: number; x1: number; yTop: number; yBajo: number; yBajoDel: number; blanco?: boolean } | null;
  /**
   * Round 3 interior (2026-11-12), absent = as before: two Aptera-style buckets in tandem instead of the saddle (hips x,
   * cushion top y, recline), and the pilot's pedals (the ankle's x, the heel's height, each foot's z) instead of the footboards.
   */
  butacas?: AsientoCoche[];
  pedales?: { x: number; talon: number; z: number } | null;
}
/** A car-style seat of the Triciclo's three rows (the same fields as geometriaTriciclo.ts `AsientoFila`). */
export interface AsientoCoche { fila: 1 | 2 | 3; x: number; z: number; y: number; ancho: number; fondo: number; respaldo: number; rec: number; plegado: boolean }
/**
 * A car-style seat: a thin pan and cushion (6 cm) from 17 cm behind the hips forward (the backrest's rear face), and a backrest hinged at the
 * cushion's rear edge, reclined `rec`; the pilot's and row 2's with a headrest. Folded, the backrest lies forward
 * flat on the cushion (its back up, 7 cm over the cushion: the boot's floor, as `volumenMaletero` counts it).
 */
function asientoCoche(g: THREE.Group, M: Mats, a: AsientoCoche) {
  const x0 = a.x - 0.17, grueso = 0.07, w = a.ancho;
  const cojin = new THREE.Mesh(new THREE.BoxGeometry(a.fondo, 0.06, w), M.cuero); cojin.position.set(x0 + a.fondo / 2, a.y - 0.03, a.z); cojin.name = 'asiento'; g.add(cojin);
  // the side bolsters of the cushion
  for (const s of [1, -1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(a.fondo * 0.85, 0.035, 0.05), M.cuero); b.position.set(x0 + a.fondo * 0.5, a.y + 0.012, a.z + s * (w / 2 - 0.025)); g.add(b); }
  const respaldo = new THREE.Group(); respaldo.name = a.plegado ? 'respaldo-plegado' : 'respaldo';
  const placa = new THREE.Mesh(new THREE.BoxGeometry(grueso, a.respaldo, w * 0.96), M.cuero); placa.position.set(-grueso / 2, a.respaldo / 2, 0); respaldo.add(placa);
  if (a.fila < 3) { const cab = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.13, Math.min(0.24, w * 0.55)), M.cuero); cab.position.set(-0.04, a.respaldo + 0.08, 0); respaldo.add(cab); }
  // hinged at the cushion's rear top edge
  respaldo.position.set(x0 + grueso, a.y, a.z);
  if (a.plegado) { respaldo.rotation.z = -Math.PI / 2; respaldo.position.set(x0, a.y + grueso, a.z); }
  else respaldo.rotation.z = a.rec * Math.PI / 180;
  g.add(respaldo);
}
/** A thin post between two points (for the backrests' supports). */
function poste(g: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const v = b.clone().sub(a), L = v.length(); if (L < 1e-4) return;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), mat); m.position.copy(a).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); g.add(m);
}
export function cabina(F: FormaBala, M: Mats, A: Asientos = ASIENTO, t?: CabinaTriciclo): THREE.Group {
  const g = new THREE.Group(); g.name = 'cabina';
  const R0 = ASIENTO, piso = F.dSuelo + F.elevar, kz = Math.min(1, F.kW);
  const dxPil = A.xPiloto - R0.xPiloto, dyPil = A.yPiloto - R0.yPiloto, dxPas = A.xPasajero - R0.xPasajero, dyPas = A.yPasajero - R0.yPasajero;
  // along the saddle: 0 at the pilot's hips, 1 at the passenger's (clamped), for the stretch in between
  const w = (x: number) => Math.min(1, Math.max(0, (R0.xPiloto - x) / (R0.xPiloto - R0.xPasajero)));
  const sx = (x: number) => x + dxPil + (dxPas - dxPil) * w(x), sy = (x: number) => dyPil + (dyPas - dyPil) * w(x);
  const Es = (x: number, yb: number, yt: number, wb: number, wm: number, wt: number, n: number) => {
    const e = E(sx(x), yb + sy(x), yt + sy(x), wb * kz, wm * kz, wt * kz, n);
    // 2026-11-12: a saddle brought down onto the frame (or the battery pack) thins instead of going into it
    const suelo = t?.sueloSillin;
    if (suelo != null && e.yb < suelo + 0.005) { e.yb = suelo + 0.005; e.yt = Math.max(e.yt, e.yb + 0.03); }
    return e;
  };
  // stepped saddle (UVs from the loft are not there: the quilting uses a box projection below)
  const sillin = loft([
    Es(-0.835, 0.405, 0.442, 0.03, 0.045, 0.035, 2.4),
    Es(-0.88, 0.37, 0.452, 0.06, 0.085, 0.07, 2.6),
    Es(-0.97, 0.335, 0.448, 0.10, 0.125, 0.11, 3.0),
    Es(-1.07, 0.33, 0.440, 0.135, 0.155, 0.14, 3.2),
    Es(-1.17, 0.33, 0.448, 0.15, 0.162, 0.15, 3.2),
    Es(-1.225, 0.335, 0.484, 0.15, 0.162, 0.15, 3.2),
    Es(-1.30, 0.34, 0.476, 0.152, 0.164, 0.152, 3.2),
    Es(-1.48, 0.35, 0.470, 0.155, 0.166, 0.155, 3.2),
    Es(-1.63, 0.36, 0.474, 0.145, 0.156, 0.145, 3.0),
    Es(-1.71, 0.38, 0.480, 0.11, 0.125, 0.11, 2.6),
    Es(-1.745, 0.42, 0.472, 0.04, 0.055, 0.045, 2.2),
  ], { N: 48, sub: 6 });
  cajaUV(sillin, 0.5);
  if (t?.butacas) for (const a of t.butacas) butaca(g, M, a);
  else if (!t?.filas) g.add(malla(sillin, M.cuero, 'sillin'));
  else for (const a of t.filas) asientoCoche(g, M, a);
  // passenger backrest: a pad leaning back 12°, on two short posts
  {
    const pad = loft([
      E(0.03, -0.15, 0.15, 0.12, 0.15, 0.12, 3.2),
      E(0.0, -0.16, 0.16, 0.135, 0.16, 0.135, 3.4),
      E(-0.03, -0.15, 0.15, 0.12, 0.15, 0.12, 3.2),
    ], { N: 40, sub: 4 });
    cajaUV(pad, 0.4);
    if (!t) {
      const o = malla(pad, M.cuero, 'respaldo'); o.position.set(-1.80 + dxPas, 0.65 + dyPas, 0); o.rotation.z = 0.21; o.scale.z = kz; g.add(o);
      for (const z of [-0.09, 0.09]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.2, 10), M.aluminio); p.position.set(-1.76 + dxPas, 0.49 + dyPas, z * kz); p.rotation.z = 0.21; g.add(p); }
    } else if (!t.filas && !t.butacas) {
      // the Triciclo: each rider's backrest against their back, reclined about the hips (the pilot's narrower,
      // so the passenger's knees pass beside it), on two posts from the saddle
      const respaldo = (x0: number, y0: number, rec: number, ancho: number, base: [number, number]) => {
        const r = rec * Math.PI / 180, d = [-Math.sin(r), Math.cos(r)], atras = [-Math.cos(r), -Math.sin(r)];
        const H = [x0, y0 + 0.108], c = [H[0] + d[0] * 0.30 + atras[0] * 0.155, H[1] + d[1] * 0.30 + atras[1] * 0.155];
        const o = malla(pad, M.cuero, 'respaldo'); o.position.set(c[0], c[1], 0); o.rotation.z = r; o.scale.set(1, 0.9, kz * ancho); g.add(o);
        for (const z of [-0.08, 0.08]) poste(g, new THREE.Vector3(base[0], base[1], z * kz * ancho), new THREE.Vector3(c[0] - d[0] * 0.10 + atras[0] * 0.035, c[1] - d[1] * 0.10 + atras[1] * 0.035, z * kz * ancho), 0.011, M.aluminio);
      };
      respaldo(A.xPiloto, A.yPiloto, t.recPil, 0.8, [-1.21 + dxPil, 0.45 + dyPil]);
      respaldo(A.xPasajero, A.yPasajero, t.recPas, 1, [-1.72 + dxPas, 0.44 + dyPas]);
    }
  }
  // the saddle's frame below it and the spine forward to the steering head (dark): on the floor (not on the Triciclo: its frame is the viewer's tubes)
  if (!t) {
    const Ep = (x: number, yb: number, yt: number, wb: number, wm: number, wt: number, n: number) => E(x, yb + piso, yt + piso, wb, wm, wt, n);
    const viga = loft([
      Ep(-0.30, 0.50, 0.60, 0.03, 0.04, 0.03, 2.4), Ep(-0.6, 0.30, 0.42, 0.045, 0.055, 0.045, 2.6),
      Ep(-0.9, 0.20, 0.34, 0.07, 0.08, 0.07, 3), Ep(-1.8, 0.20, 0.36, 0.08, 0.09, 0.08, 3), Ep(-1.95, 0.24, 0.32, 0.03, 0.04, 0.03, 2.4),
    ], { N: 24, sub: 4 });
    g.add(malla(viga, M.carbono, 'chasis'));
  }
  // the navy tank between the pilot's knees, up to the steering head: its rear follows the pilot, its front stays at the head
  const wt = (x: number) => Math.min(1, Math.max(0, (-0.27 - x) / 0.59));
  const Et = (x: number, yb: number, yt: number, wb: number, wm: number, wt0: number, n: number) => {
    const k = wt(x), dy = piso + (dyPil - piso) * k;
    return E(x + dxPil * k, yb + dy, yt + dy, wb, wm, wt0, n);
  };
  const deposito = loft([
    Et(-0.27, 0.70, 0.835, 0.03, 0.05, 0.035, 2.4),
    Et(-0.33, 0.60, 0.865, 0.07, 0.095, 0.075, 2.6),
    Et(-0.45, 0.52, 0.86, 0.095, 0.125, 0.10, 2.8),
    Et(-0.60, 0.47, 0.79, 0.10, 0.13, 0.10, 2.8),
    Et(-0.74, 0.44, 0.63, 0.09, 0.115, 0.085, 2.6),
    Et(-0.83, 0.42, 0.50, 0.05, 0.07, 0.05, 2.4),
    Et(-0.86, 0.43, 0.46, 0.01, 0.02, 0.01, 2.2),
  ], { N: 40, sub: 6 });
  // (2026-11-12: with a steering wheel or a dashboard, neither the tank nor its little screen: the dashboard and the column take their place)
  const cabinaCoche = !!(t?.volante || t?.salpicadero);
  if (!cabinaCoche) g.add(malla(deposito, M.marino, 'deposito'));
  // dash: a small screen in a carbon hood on top of the tank, facing the pilot (at the steering head)
  if (!cabinaCoche) {
    const capo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.012, 0.21), M.carbono); capo.position.set(-0.43, 0.868 + piso, 0); capo.rotation.z = 0.75; g.add(capo);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.085), M.pantalla); pant.position.set(-0.452, 0.85 + piso, 0); pant.rotation.set(0, -Math.PI / 2, 0); pant.rotateX(-0.82); g.add(pant);
  }
  if (t?.salpicadero) { if (t.salpicadero.blanco) salpicaderoBlanco(g, F, M, t.salpicadero, t.volante ?? null); else salpicadero(g, F, M, t.salpicadero); }
  if (t?.volante) volante(g, M, t.volante, t.cabezaDireccion ?? [-0.44, 0.80 + piso, 0], !t.salpicadero);
  // handlebar: clamp on the steering head, bars swept back to the grips, levers ahead of them
  if (!t?.volante) {
    const mx = t ? t.man[0] : 0, my = t ? t.man[1] : 0, kb = t ? escalaManillar(F, t.man) : escalaManillar(F);
    const p = (x: number, y: number, z: number) => new THREE.Vector3(x + mx, y + piso + my, z * kb);
    const barra = (s: number) => curva([p(-0.46, 0.875, 0), p(-0.50, 0.885, s * 0.08), p(-0.55, 0.885, s * 0.17), p(-0.585, 0.872, s * 0.215)], 8);
    for (const s of [1, -1]) {
      g.add(malla(barrido(barra(s), () => [0.011, 0.011], { lados: 10 }), M.aluminio, 'manillar'));
      const puno = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.11, 14), M.gomaMate); puno.position.set(-0.592 + mx, 0.870 + piso + my, s * 0.265 * kb); puno.rotation.x = Math.PI / 2; g.add(puno);
      const tope = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.012, 14), M.aluminio); tope.position.set(-0.592 + mx, 0.870 + piso + my, s * 0.325 * kb); tope.rotation.x = Math.PI / 2; g.add(tope);
      const leva = curva([p(-0.56, 0.882, s * 0.18), p(-0.545, 0.882, s * 0.24), p(-0.555, 0.878, s * 0.295)], 6);
      g.add(malla(barrido(leva, () => [0.006, 0.003], { lados: 6 }), M.plastico, 'maneta'));
    }
    const abraz = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.07), M.carbono); abraz.position.set(-0.46 + mx, 0.87 + piso + my, 0); g.add(abraz);
    // the Triciclo's riser: the clamp stands on the steering head however far the bars move
    if (t && (mx || my)) poste(g, new THREE.Vector3(-0.46, 0.85 + piso, 0), new THREE.Vector3(-0.46 + mx, 0.86 + piso + my, 0), 0.016, M.carbono);
  }
  // pilot's footboards forward of the knees (toes up 20°), passenger's footpegs beside the pilot's hips
  const px = t ? t.pies[0] : 0, py = t ? t.pies[1] : 0;
  if (t?.pedales) pedales(g, M, t.pedales);
  if (!t?.butacas) for (const s of [1, -1]) {
    const tabla = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.012, 0.09), M.aluminio); tabla.position.set(-0.55 + dxPil + px, 0.205 + piso + py, s * 0.15 * kz); tabla.rotation.z = 0.35; g.add(tabla);
    const goma = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.006, 0.07), M.gomaMate); goma.position.set(-0.55 + dxPil + px, 0.214 + piso + py, s * 0.15 * kz); goma.rotation.z = 0.35; g.add(goma);
    if (t?.filas) continue;
    // (2026-11-12: onto the battery pack where it runs under them, `alzaPas`)
    const alza = t?.alzaPas ?? 0;
    const estribo = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.09, 12), M.gomaMate); estribo.position.set(-1.30 + dxPas, 0.27 + piso + alza, s * 0.20 * kz); estribo.rotation.x = Math.PI / 2; g.add(estribo);
    const soporte = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.06), M.aluminio); soporte.position.set(-1.30 + dxPas, 0.255 + piso + alza, s * 0.13 * kz); g.add(soporte);
  }
  // grab rail round the back of the passenger's seat (not with three rows)
  if (!t?.filas && !t?.butacas) {
    const p = (x: number, y: number, z: number) => new THREE.Vector3(x + dxPas, y + dyPas, z * kz);
    const riel = curva([p(-1.42, 0.49, 0.185), p(-1.54, 0.53, 0.20), p(-1.66, 0.555, 0.175), p(-1.73, 0.565, 0.10), p(-1.745, 0.568, 0), p(-1.73, 0.565, -0.10), p(-1.66, 0.555, -0.175), p(-1.54, 0.53, -0.20), p(-1.42, 0.49, -0.185)], 8);
    g.add(malla(barrido(riel, () => [0.012, 0.012], { lados: 10 }), M.aluminio, 'asidero'));
  }
  return g;
}
/**
 * 2026-11-12, Eugenio: «cambia el manillar por un volante». A car-style steering wheel: a 3 cm-thick rim (radius
 * `r`) tilted `inc` from the vertical with its top forward, three spokes (at a quarter to three and at six), a hub,
 * and the column from the hub forward and down along the wheel's axis to the steering head. With no dashboard, a
 * small instrument pod sits on the column.
 */
function volante(g: THREE.Group, M: Mats, v: { c: [number, number]; r: number; inc: number }, cabeza: [number, number, number], pod: boolean) {
  const n = new THREE.Vector3(-Math.cos(v.inc), Math.sin(v.inc), 0), up = new THREE.Vector3(Math.sin(v.inc), Math.cos(v.inc), 0);
  const c = new THREE.Vector3(v.c[0], v.c[1], 0), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  const aro = new THREE.Mesh(new THREE.TorusGeometry(v.r, 0.015, 14, 64), M.gomaMate); aro.position.copy(c); aro.quaternion.copy(q); aro.name = 'volante'; g.add(aro);
  const buje = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.045, 24), M.carbono); buje.position.copy(c).addScaledVector(n, -0.01);
  buje.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); g.add(buje);
  for (const d of [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1), up.clone().negate()]) poste(g, c.clone().addScaledVector(n, -0.01), c.clone().addScaledVector(d, v.r * 0.97), 0.011, M.aluminio);
  // the column: along the wheel's axis forward and down, then a universal joint to the steering head
  const L0 = Math.max(0.05, (cabeza[0] - v.c[0]) / Math.max(0.3, Math.cos(v.inc))), codo = c.clone().addScaledVector(n, -L0);
  poste(g, c.clone().addScaledVector(n, -0.03), codo, 0.022, M.carbono);
  poste(g, codo, new THREE.Vector3(...cabeza), 0.018, M.aluminio);
  if (pod) {
    const caja = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.17), M.carbono); caja.position.copy(c).addScaledVector(n, -0.09).addScaledVector(up, v.r * 0.55); caja.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), n.clone().negate())); g.add(caja);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.055), M.pantalla); pant.position.copy(caja.position).addScaledVector(n, 0.026); pant.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); g.add(pant);
  }
}
/**
 * 2026-11-12, Eugenio: «crea el salpicadero». A dashboard from side to side under the windscreen, 2 cm inside the skin
 * (balaMedidas.ts `anchoSalpicadero`), from where the nose is just taller than it back to its rear face; deeper in front
 * than at the rear face. On it, facing the pilot, a wide instrument display (as the Aptera's, behind the wheel) and a
 * centre screen; along its top edge, a soft pad.
 */
function salpicadero(g: THREE.Group, F: FormaBala, M: Mats, s: { x0: number; x1: number; yTop: number; yBajo: number; yBajoDel: number }) {
  const est = [];
  for (let i = 0; i <= 8; i++) {
    const u = i / 8, x = s.x0 + (s.x1 - s.x0) * u, yb = s.yBajoDel + (s.yBajo - s.yBajoDel) * u * u, yt = s.yTop - 0.012 * Math.max(0, (u - 0.85) / 0.15);
    est.push(E(x, yb, yt, anchoSalpicadero(F, x, yb), anchoSalpicadero(F, x, (yb + yt) / 2), anchoSalpicadero(F, x, yt), 6));
  }
  g.add(malla(loft(est, { N: 64, sub: 4 }), M.carbono, 'salpicadero'));
  // the rear face's pad and the displays, facing the pilot (the face leans back 20°)
  const yM = (s.yTop + s.yBajo) / 2, w = anchoSalpicadero(F, s.x1, yM);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.035, 2 * w - 0.04), M.plastico); pad.position.set(s.x1 + 0.005, s.yTop - 0.02, 0); g.add(pad);
  const panel = (ancho: number, alto: number, z: number) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto), M.pantalla); p.position.set(s.x1 - 0.003, s.yTop - 0.06, z);
    p.rotation.set(0, -Math.PI / 2, 0); p.rotateX(-0.35); g.add(p);
  };
  panel(Math.min(0.30, 2 * w - 0.2), 0.07, 0);
  if (w > 0.28) panel(0.14, 0.08, Math.min(0.24, w - 0.1));
}
/**
 * Round 3 interior (2026-11-12, Eugenio: «los asientos por los bonitos como los de la Aptera»): a sculpted bucket in
 * one light shell (the body's pearl white), a dark quilted cushion and backrest pad, the headrest grown out of the shell
 * above a waist, wings at the shoulders and bolsters at the cushion's sides, on a slim pair of rails. Sizes: `BUTACA`
 * (balaMedidas.ts), which the checks read too. Named 'butaca' (the cushion's shell) and 'respaldo-butaca'.
 */
function butaca(g: THREE.Group, M: Mats, a: AsientoCoche) {
  const B = BUTACA, S = B.semi, o = new THREE.Group(); o.position.set(a.x, a.y, a.z); g.add(o);
  // the seat pan's shell: a shallow rounded tub from the cushion's front edge back to the backrest's shell
  const xs = [B.delante, B.delante - 0.03, 0.10, -0.08, -B.detras + 0.02, -B.detras];
  const pan = loft(xs.map((x, i) => { const k = i === 0 ? 0.86 : i === xs.length - 1 ? 0.9 : 1; return E(x, -B.pan, 0.012 + (i === 0 ? -0.006 : 0), S.cojin * 0.78 * k, S.cojin * k, S.cojin * 0.94 * k, 3.4); }), { N: 40, sub: 4 });
  o.add(malla(pan, M.chapa, 'butaca'));
  // the cushion's pad, dark and quilted, sunk into the tub, and the white bolsters at its sides, rising to the rear
  const cojin = loft([E(B.delante - 0.025, -0.012, 0.018, 0.15, 0.17, 0.16, 3), E(0.05, -0.012, 0.03, 0.16, 0.18, 0.17, 3.2), E(-B.bisagra + 0.01, -0.012, 0.026, 0.155, 0.175, 0.165, 3)], { N: 36, sub: 4 });
  cajaUV(cojin, 0.35); o.add(malla(cojin, M.cuero, 'cojin-butaca'));
  for (const s of [1, -1]) {
    const flanco = loft([E(B.delante - 0.04, -0.01, 0.035, 0.02, 0.028, 0.02, 2.4), E(0.0, -0.01, 0.06, 0.028, 0.034, 0.026, 2.6), E(-B.bisagra, -0.01, 0.075, 0.03, 0.036, 0.028, 2.6)], { N: 24, sub: 4 });
    flanco.translate(0, 0, s * (S.cojin - 0.035)); o.add(malla(flanco, M.chapa, 'flanco-butaca'));
  }
  // the slim base: two rails under the tub (the frame's posts meet them)
  for (const s of [1, -1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.014, 0.025), M.grisOscuro); r.position.set(0.04, -B.pan - 0.007, s * 0.13); o.add(r); }
  // the backrest, hinged at its front face's foot and reclined `rec`: shell, wings, headrest and its pad
  const R = new THREE.Group(); R.name = 'respaldo-butaca'; R.position.set(-B.bisagra, 0, 0); R.rotation.z = a.rec * Math.PI / 180; o.add(R);
  const H = B.respaldo, Hc = H + B.cabezal, gr = B.grueso;
  const seccion = (x: number, k: number, y0: number, y1: number) => { const w = (h: number) => semiRespaldoButaca(h) * k; return E(x, y0, y1, w(y0), w((y0 + y1) / 2), w(y1), 3.6); };
  const concha = loft([seccion(0.004, 0.94, -0.03, H - 0.01), seccion(-0.012, 1, -0.045, H), seccion(-gr + 0.012, 1, -0.045, H), seccion(-gr, 0.92, -0.03, H - 0.015)], { N: 44, sub: 3 });
  R.add(malla(concha, M.chapa, 'respaldo-butaca'));
  // the headrest out of the same shell: a waist at the neck, then the head's pad
  const cab = loft([0.0, -0.01, -gr + 0.015, -gr + 0.002].map((x, i) => { const k = i === 0 || i === 3 ? 0.9 : 1; return E(x, H - 0.05, Hc - (i === 0 || i === 3 ? 0.01 : 0), S.cuello * k, S.cabezal * k, S.cabezal * 0.86 * k, 3.2); }), { N: 40, sub: 3 });
  R.add(malla(cab, M.chapa, 'cabezal-butaca'));
  // the pads, dark, standing 2 cm proud of the shell's face; and the shoulder wings, a little forward of it
  const pad = loft([E(0.022, 0.03, H - 0.07, 0.165, 0.17, 0.15, 3.2), E(0.006, 0.02, H - 0.06, 0.175, 0.18, 0.16, 3.2)], { N: 36, sub: 3 });
  cajaUV(pad, 0.35); R.add(malla(pad, M.cuero, 'pad-butaca'));
  const padCab = loft([E(0.016, H + 0.035, Hc - 0.035, 0.07, 0.08, 0.07, 3), E(0.002, H + 0.03, Hc - 0.03, 0.075, 0.085, 0.075, 3)], { N: 28, sub: 3 });
  cajaUV(padCab, 0.35); R.add(malla(padCab, M.cuero, 'pad-cabezal'));
  for (const s of [1, -1]) {
    const ala = loft([E(0.03, 0.10, H - 0.12, 0.012, 0.02, 0.012, 2.4), E(0.0, 0.08, H - 0.10, 0.018, 0.026, 0.016, 2.4)], { N: 20, sub: 3 });
    ala.translate(0, 0, s * (S.hombros - 0.02)); R.add(malla(ala, M.chapa, 'ala-butaca'));
  }
}
/** Round 3 interior: the pilot's pedals: a heel plate on the floor and two pads (brake and accelerator) leaning back towards the feet. */
function pedales(g: THREE.Group, M: Mats, p: { x: number; talon: number; z: number }) {
  const placa = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 2 * p.z + 0.12), M.grisOscuro); placa.position.set(p.x - 0.02, p.talon - 0.004, 0); placa.name = 'pedales'; g.add(placa);
  for (const s of [1, -1]) {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.012, s > 0 ? 0.20 : 0.075, s > 0 ? 0.06 : 0.10), M.aluminio);
    pad.position.set(p.x + 0.13, p.talon + (s > 0 ? 0.11 : 0.12), s * p.z); pad.rotation.z = 0.5; g.add(pad);
    poste(g, new THREE.Vector3(p.x + 0.16, p.talon + 0.17, s * p.z), new THREE.Vector3(p.x + 0.24, p.talon + 0.30, s * p.z), 0.008, M.grisOscuro);
  }
}
/**
 * Round 3 interior (2026-11-12, Eugenio: «hace un salpicadero también más bonito, blanco y con más detalles»): the same
 * volume as the plain dashboard (it follows the windscreen's foot, 2 cm inside the skin), in the body's pearl white, with
 * a soft dark lip along its rear edge, an instrument binnacle facing the pilot, a centre screen floating on a stem, air
 * vents at both ends and in the middle, a row of buttons, and, with a steering wheel, the column's shroud and two stalks.
 */
function salpicaderoBlanco(g: THREE.Group, F: FormaBala, M: Mats, s: { x0: number; x1: number; yTop: number; yBajo: number; yBajoDel: number }, v: { c: [number, number]; r: number; inc: number } | null) {
  const est = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10, x = s.x0 + (s.x1 - s.x0) * u, yb = s.yBajoDel + (s.yBajo - s.yBajoDel) * u * u, yt = s.yTop - 0.02 * Math.max(0, (u - 0.8) / 0.2) ** 2;
    est.push(E(x, yb, yt, anchoSalpicadero(F, x, yb), anchoSalpicadero(F, x, (yb + yt) / 2), anchoSalpicadero(F, x, yt), 6));
  }
  g.add(malla(loft(est, { N: 64, sub: 4 }), M.chapa, 'salpicadero'));
  const yM = (s.yTop + s.yBajo) / 2, w = anchoSalpicadero(F, s.x1, yM);
  // the soft lip along the rear top edge
  const labio = curva(Array.from({ length: 9 }, (_, i) => { const z = (i / 8 * 2 - 1) * (anchoSalpicadero(F, s.x1, s.yTop - 0.03) - 0.03); return new THREE.Vector3(s.x1 + 0.004, s.yTop - 0.022, z); }), 6);
  g.add(malla(barrido(labio, () => [0.012, 0.009], { lados: 10 }), M.gomaMate, 'labio-salpicadero'));
  // a facing panel on the rear face: (ancho, alto) at height y and z, leaning back 20°
  const enCara = (o: THREE.Object3D, y: number, z: number, atras = 0) => { o.position.set(s.x1 - atras, y, z); o.rotation.set(0, -Math.PI / 2, 0); o.rotateX(-0.35); g.add(o); return o; };
  // the instrument binnacle behind the wheel: a white hood over a wide display
  const capucha = loft([E(0.0, -0.05, 0.035, 0.15, 0.16, 0.13, 3), E(-0.05, -0.04, 0.03, 0.15, 0.16, 0.13, 3), E(-0.075, -0.012, 0.02, 0.13, 0.14, 0.11, 3)], { N: 32, sub: 3 });
  capucha.translate(s.x1, s.yTop - 0.015, 0); g.add(malla(capucha, M.chapa, 'relojes'));
  enCara(new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.07), M.pantalla), s.yTop - 0.045, 0, 0.055);
  // the centre screen, floating on a stem to the pilot's right, turned a little towards him
  const zc = Math.min(0.27, w - 0.16);
  if (zc > 0.17) {
    const marco = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.15, 0.25), M.chapa); marco.position.set(s.x1 - 0.06, s.yTop + 0.04, zc); marco.rotation.set(0, 0.25, 0.30); marco.name = 'pantalla-central'; g.add(marco);
    const pant = new THREE.Mesh(new THREE.PlaneGeometry(0.23, 0.13), M.pantalla); pant.position.copy(marco.position); pant.rotation.copy(marco.rotation); pant.rotateY(-Math.PI / 2); pant.translateZ(0.0075); g.add(pant);
    poste(g, new THREE.Vector3(s.x1 - 0.02, s.yTop - 0.01, zc), marco.position.clone(), 0.012, M.grisOscuro);
    // a row of buttons under it
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 14), i % 2 ? M.aluminio : M.negroBrillo); b.rotation.z = Math.PI / 2 - 0.35; b.position.set(s.x1 - 0.004, yM - 0.03, zc - 0.08 + i * 0.04); g.add(b); }
  }
  // the vents: a dark rounded slot with three slats, at both ends and either side of the binnacle
  for (const z of [w - 0.08, -(w - 0.08), 0.20, -0.20].filter(z => Math.abs(z) > 0.18 || w > 0.36)) {
    const caja = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.045, 0.10), M.grisOscuro); enCara(caja, yM - 0.005, z, 0.004);
    for (let k = -1; k <= 1; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.004, 0.092), M.aluminio); enCara(l, yM - 0.005 + k * 0.013, z, 0.005); }
  }
  // with a wheel: the column's shroud from the dashboard to the hub, and the two stalks
  if (v) {
    const n = new THREE.Vector3(-Math.cos(v.inc), Math.sin(v.inc), 0), c = new THREE.Vector3(v.c[0], v.c[1], 0);
    const a = c.clone().addScaledVector(n, -0.06), b = c.clone().addScaledVector(n, -Math.max(0.10, (s.x1 - v.c[0]) / Math.max(0.3, Math.cos(v.inc)) + 0.03));
    const L = a.distanceTo(b), funda = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, L, 24), M.chapa);
    funda.position.copy(a).add(b).multiplyScalar(0.5); funda.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); funda.name = 'funda-columna'; g.add(funda);
    for (const z of [1, -1]) poste(g, a.clone().addScaledVector(n, -0.01).add(new THREE.Vector3(0, 0, z * 0.04)), a.clone().addScaledVector(n, -0.03).add(new THREE.Vector3(0, -0.01, z * 0.14)), 0.006, M.negroBrillo);
  }
}
/** Box-projected UVs (metres / scale) so the quilting has a constant size. */
function cajaUV(geo: THREE.BufferGeometry, escala: number) {
  const p = geo.attributes.position as THREE.BufferAttribute, n = geo.attributes.normal as THREE.BufferAttribute, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    const [u, v] = ay >= ax && ay >= az ? [p.getX(i), p.getZ(i)] : az >= ax ? [p.getX(i), p.getY(i)] : [p.getZ(i), p.getY(i)];
    uv[2 * i] = u / escala; uv[2 * i + 1] = v / escala;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// ======================================================================= cameras
/** Camera pod instead of a mirror (as on the XL1): a white capsule on the body side with a dark lens looking back. */
export function camara(F: FormaBala, M: Mats, x: number, y: number): THREE.Group {
  const z = F.ladoZ(x, y);
  const pod = new THREE.Group(); pod.name = 'camara-lateral';
  const casco = torno([[0, 0.06], [0.008, 0.055], [0.016, 0.038], [0.019, 0.012], [0.018, -0.02], [0.015, -0.04], [0.013, -0.048]], 28);
  casco.rotateY(Math.PI / 2); casco.scale(1, 0.62, 1);
  pod.add(malla(casco, M.chapa, 'capsula'));
  const tapa = new THREE.Mesh(new THREE.CircleGeometry(0.013, 24).rotateY(-Math.PI / 2), M.marino); tapa.scale.set(1, 0.62, 1); tapa.position.x = -0.0481; pod.add(tapa);
  const ojo = new THREE.Mesh(new THREE.CircleGeometry(0.0055, 20).rotateY(-Math.PI / 2), M.proyector); ojo.position.set(-0.0486, 0, 0); pod.add(ojo);
  const pie = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.008, 0.035), M.marino); pie.position.set(0.004, -0.002, -0.018); pod.add(pie);
  pod.position.set(x, y, z + 0.014);
  return pod;
}
