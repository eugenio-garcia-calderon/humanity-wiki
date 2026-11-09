import * as THREE from 'three';
import { barrido, torno } from './apteraPiel';
import { malla, unir } from './apteraDetalle';

/**
 * Materials, procedural textures, wheels and the cockpit of the garage
 * AeroRider (`aerorider.ts`). Everything is drawn in code; nothing is
 * downloaded. No logos or lettering.
 *
 * Sourced details used here (AQUA data sheet, 2008; OliNo test, 2008; owner's
 * blog, 2005; see `aerorider.ts`): three 20″ wheels with 20 × 2.00 moped tyres,
 * hydraulic disc brakes on the two front wheels and a mechanical drum (roller)
 * brake at the rear, 8-speed Shimano Nexus hub in the rear wheel, motor driving
 * the rear wheel by a toothed belt on its left side and the pedals by chain on
 * its right side (two chains joined on an intermediate shaft), steering by two
 * side sticks (the left one also the throttle and rear brake, the right one the
 * gear shift and front brakes), a centre console box with the light, wiper and
 * fan switches and the speed read-out, and an adjustable bucket seat with a
 * headrest. Sizes and positions of all of these are estimated.
 */

// ---------------------------------------------------------------- textures
const conDocumento = () => typeof document !== 'undefined';

/** Grey speckle: seat fabric and the grain of the tyre sidewall. */
function texturaRuido(base: string, puntos: number, alfa: number, tam = 128, semilla = 7): THREE.CanvasTexture | null {
  if (!conDocumento()) return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = tam;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = base; c.fillRect(0, 0, tam, tam);
  let s = semilla; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < puntos; i++) {
    const v = Math.floor(rnd() * 255); c.fillStyle = `rgba(${v},${v},${v},${alfa})`;
    c.fillRect(rnd() * tam, rnd() * tam, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/**
 * A 185 mm brake rotor seen face on, for a ring geometry with planar UVs:
 * the braking track with two rings of round holes, five arms out to the
 * mounting circle; everything else transparent (alphaTest cuts it out).
 */
function texturaDisco(): THREE.CanvasTexture | null {
  if (!conDocumento()) return null;
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'); if (!c) return null;
  const C = S / 2, k = C / 0.0925; // pixels per metre (outer radius = edge of the canvas)
  c.clearRect(0, 0, S, S);
  // braking track
  c.fillStyle = '#c4c8cd'; c.beginPath(); c.arc(C, C, 0.0925 * k, 0, Math.PI * 2); c.arc(C, C, 0.068 * k, 0, Math.PI * 2, true); c.fill();
  // fine machining rings
  c.strokeStyle = 'rgba(90,95,100,0.35)'; c.lineWidth = 1;
  for (let r = 0.07; r < 0.092; r += 0.0016) { c.beginPath(); c.arc(C, C, r * k, 0, Math.PI * 2); c.stroke(); }
  // two staggered rings of holes, punched out
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 24; i++) for (const [r, d] of [[0.0755, 0], [0.0855, 0.5]] as [number, number][]) {
    const a = ((i + d) / 24) * Math.PI * 2; c.beginPath(); c.arc(C + Math.cos(a) * r * k, C + Math.sin(a) * r * k, 0.0032 * k, 0, Math.PI * 2); c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  // five arms and the mounting ring
  c.fillStyle = '#9da2a8';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    c.save(); c.translate(C, C); c.rotate(a);
    c.beginPath(); c.moveTo(0.022 * k, -0.007 * k); c.lineTo(0.07 * k, -0.012 * k); c.lineTo(0.07 * k, 0.004 * k); c.lineTo(0.022 * k, 0.009 * k); c.closePath(); c.fill();
    c.restore();
  }
  c.beginPath(); c.arc(C, C, 0.03 * k, 0, Math.PI * 2); c.arc(C, C, 0.017 * k, 0, Math.PI * 2, true); c.fill();
  c.fillStyle = '#55595e';
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; c.beginPath(); c.arc(C + Math.cos(a) * 0.0235 * k, C + Math.sin(a) * 0.0235 * k, 0.0025 * k, 0, Math.PI * 2); c.fill(); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** The fan intakes under the nose: a dark slotted grille. */
function texturaRejilla(): THREE.CanvasTexture | null {
  if (!conDocumento()) return null;
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#26282b'; c.fillRect(0, 0, 64, 64);
  c.fillStyle = '#050506';
  for (let y = 4; y < 64; y += 8) c.fillRect(0, y, 64, 4);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 30);
  return t;
}

// ---------------------------------------------------------------- materials
/**
 * Glass that casts no shadow (it is see-through tinted polycarbonate, and its
 * shadow would black out the cockpit). The viewer turns castShadow on for every
 * mesh, so the shadow pass gets a depth material with opacity 0: the shadow map
 * copies the glass material's alphaTest onto it and discards every fragment.
 */
export const sinSombra = new THREE.MeshDepthMaterial({ depthPacking: THREE.BasicDepthPacking, opacity: 0 });

let MATS: ReturnType<typeof crearMateriales> | null = null;
/** Created once per page and shared by every build (the model is built once and cloned). */
export const materiales = () => MATS ?? (MATS = crearMateriales());
export type Mats = ReturnType<typeof crearMateriales>;

function crearMateriales() {
  const F = THREE.FrontSide, D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: F, ...p });
  // patches laid on the skin: drawn a hair in front of it, so they never flicker
  const calco = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...p });
  const tela = texturaRuido('#2b2d31', 3200, 0.2, 128, 11), flanco = texturaRuido('#1b1c1e', 1400, 0.18, 128, 3);
  if (tela) tela.repeat.set(10, 10);
  if (flanco) flanco.repeat.set(6, 1);
  const disco = texturaDisco(), rejilla = texturaRejilla();
  return {
    // white gelcoat on glass-fibre polyester (AQUA sheet: «gelcoat white or yellow»; white is what the photos described show)
    pintura: fis({ color: 0xeeede6, roughness: 0.3, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.1 }),
    pinturaCalco: calco({ color: 0xeeede6, roughness: 0.3, metalness: 0, clearcoat: 0.75, clearcoatRoughness: 0.1 }),
    // the inside of the shell, seen through the glass and the wheel openings
    forro: new THREE.MeshStandardMaterial({ color: 0x0f1011, roughness: 0.92, metalness: 0, side: THREE.BackSide }),
    pozo: fis({ color: 0x18191b, roughness: 0.92, side: D }),
    // tinted polycarbonate: the colour and opacity come per vertex (black border, smoked grey inside)
    cristal: calco({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, alphaTest: 0.01, metalness: 0, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 1.1, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: D }),
    junta: calco({ color: 0x0b0c0d, roughness: 0.75, polygonOffsetFactor: -6, polygonOffsetUnits: -6, side: D }),
    burlete: fis({ color: 0x111213, roughness: 0.8, side: D }),
    // a NACA inlet is a shallow ramp into the skin: drawn as a dark grey patch whose shade deepens towards the mouth (vertex colours)
    naca: calco({ color: 0xffffff, vertexColors: true, roughness: 0.6, clearcoat: 0.3, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    rejilla: calco({ color: rejilla ? 0xffffff : 0x111214, map: rejilla, roughness: 0.8, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    // wheels
    goma: fis({ color: 0x1c1d1f, roughness: 0.88, metalness: 0 }),
    flanco: fis({ color: flanco ? 0xffffff : 0x1b1c1e, map: flanco, roughness: 0.9, metalness: 0 }),
    llanta: fis({ color: 0xc6cace, metalness: 0.85, roughness: 0.28, side: D }),
    radio: fis({ color: 0xd6d9dd, metalness: 0.9, roughness: 0.22 }),
    buje: fis({ color: 0xb4b8bd, metalness: 0.8, roughness: 0.32, side: D }),
    disco: fis({ color: 0xffffff, map: disco, alphaTest: 0.5, metalness: 0.85, roughness: 0.32, side: D }),
    pinza: fis({ color: 0x2b2d31, metalness: 0.5, roughness: 0.4 }),
    aluminio: fis({ color: 0xa9afb5, metalness: 0.85, roughness: 0.3, side: D }),
    acero: fis({ color: 0x5d6166, metalness: 0.85, roughness: 0.4, side: D }),
    cadena: fis({ color: 0x3b3d41, metalness: 0.7, roughness: 0.45 }),
    // cockpit
    tela: fis({ color: tela ? 0xffffff : 0x34363a, map: tela, roughness: 0.96, metalness: 0, side: D, sheen: 0.3, sheenColor: new THREE.Color(0x888888), sheenRoughness: 0.8 }),
    plastico: fis({ color: 0x2a2c30, roughness: 0.6, metalness: 0.05, side: D }),
    negro: fis({ color: 0x141518, roughness: 0.5, metalness: 0.1, side: D }),
    gomaMando: fis({ color: 0x0f1011, roughness: 0.85 }),
    pantalla: fis({ color: 0x0a0f14, emissive: 0x1d3f52, emissiveIntensity: 0.55, roughness: 0.1, clearcoat: 1 }),
    interruptor: fis({ color: 0xb9bdc2, metalness: 0.6, roughness: 0.3 }),
    // lights and mirrors
    cromo: fis({ color: 0xe6e8ec, metalness: 1, roughness: 0.07, side: D }),
    lente: fis({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false, alphaTest: 0.01, metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.7 }),
    luz: fis({ color: 0xffffff, emissive: 0xf4f7ff, emissiveIntensity: 1.2, roughness: 0.3 }),
    ambar: calco({ color: 0xffa32a, emissive: 0xff8a00, emissiveIntensity: 0.35, roughness: 0.18, clearcoat: 1, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    rojo: calco({ color: 0x9c0a12, emissive: 0xff1424, emissiveIntensity: 0.45, roughness: 0.18, clearcoat: 1, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    espejo: fis({ color: 0xdfe6ee, metalness: 1, roughness: 0.03 }),
  };
}

// ---------------------------------------------------------------- shapes
/** A box with soft edges (a superellipsoid): cheaper than a bevelled box and reads the same through tinted glass. */
export function caja(sx: number, sy: number, sz: number, r: number, seg = 16): THREE.BufferGeometry {
  const s = new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.6))), p = s.attributes.position as THREE.BufferAttribute;
  const e = Math.max(0.12, Math.min(0.5, 2.2 * r / Math.min(sx, sy, sz))), f = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
  for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i)) * sx / 2, f(p.getY(i)) * sy / 2, f(p.getZ(i)) * sz / 2);
  s.deleteAttribute('uv'); s.computeVertexNormals();
  return s;
}

/** A straight round bar between two points. */
export function barra(a: THREE.Vector3, b: THREE.Vector3, r: number, lados = 8): THREE.BufferGeometry {
  const d = b.clone().sub(a), g = new THREE.CylinderGeometry(r, r, d.length(), lados, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); g.deleteAttribute('uv');
  return g;
}

/** A sprocket or toothed pulley in the XY plane (axis along Z), `n` teeth, thickness `e`, centred on z = 0. */
export function pinon(n: number, r: number, e: number, hueco = 0.3): THREE.BufferGeometry {
  const s = new THREE.Shape(), h = Math.min(0.006, r * 0.09);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, da = (Math.PI * 2) / n;
    const pts: [number, number][] = [[a0, r - h], [a0 + da * 0.25, r + h * 0.15], [a0 + da * 0.5, r + h * 0.15], [a0 + da * 0.75, r - h]];
    pts.forEach(([a, rr], k) => { const x = Math.cos(a) * rr, y = Math.sin(a) * rr; if (i === 0 && k === 0) s.moveTo(x, y); else s.lineTo(x, y); });
  }
  s.closePath();
  const agujero = new THREE.Path(); agujero.absarc(0, 0, r * hueco, 0, Math.PI * 2, true); s.holes.push(agujero);
  const g = new THREE.ExtrudeGeometry(s, { depth: e, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -e / 2); g.deleteAttribute('uv');
  return g;
}

// ---------------------------------------------------------------- wheels
/**
 * 20″ wheel (ISO 406 rim) with a 20 × 2.00 moped tyre (AQUA sheet: Vredestein
 * 20″ × 2.00″; OliNo: delivered on moped tyres). Tyre radius 0.252 m (bead
 * seat 0.203 m plus a ~49 mm section), section width 52 mm, round crown with a
 * block tread, slightly flattened where it touches the ground. Axle along Z,
 * centre at the origin; the wheel goes at y = R − APLASTADO.
 */
export const R_RUEDA = 0.252, ANCHO_NEU = 0.052, APLASTADO = 0.004;
const R_ASIENTO = 0.203, R_NIPLE = 0.186;

export function geometriasRueda() {
  const R = R_RUEDA, a = ANCHO_NEU / 2, rc = R - a;
  // tyre section: bead → sidewall → round crown → sidewall → bead
  const flanco = (sg: number): [number, number][] => [[R_ASIENTO + 0.0035, sg * 0.0115], [R_ASIENTO + 0.0045, sg * 0.0165], [R_ASIENTO + 0.008, sg * 0.0225], [rc - 0.006, sg * (a + 0.0004)]];
  const corona: [number, number][] = [];
  for (let k = 0; k <= 26; k++) { const f = -Math.PI / 2 + Math.PI * k / 26; corona.push([rc + a * Math.cos(f), a * Math.sin(f)]); }
  const perfilFlanco = [...flanco(-1), [rc, -a] as [number, number]];
  const perfilCorona = corona;
  const perfilFlanco2 = [[rc, a] as [number, number], ...flanco(1).reverse()];
  const NB = 44; // tread blocks around
  const aplastar = (ang: number, r: number) => { const s = -Math.sin(ang); return s > 0 && r * s > R - APLASTADO ? (R - APLASTADO) / s : r; };
  const corona3 = torno(perfilCorona, NB * 4, (ang, h, r) => {
    let rr = r; const v = h / a;
    if (Math.abs(v) < 0.86) {
      // a zig-zag centre rib and slanted shoulder blocks, as on a moped tyre
      const u = (ang / (Math.PI * 2)) * NB;
      const centro = Math.abs(v) < 0.1 ? (u - Math.floor(u) < 0.5 ? 1 : 0) : 0;
      const hombro = Math.abs(v) > 0.18 && ((u + 0.9 * Math.abs(v)) - Math.floor(u + 0.9 * Math.abs(v))) < 0.24 ? 1 : 0;
      const ranura = Math.abs(Math.abs(v) - 0.14) < 0.05 ? 1 : 0;
      if (centro || hombro || ranura) rr -= 0.0024;
    }
    return aplastar(ang, rr);
  });
  const flancos = unir([torno(perfilFlanco, 96, (ang, _h, r) => aplastar(ang, r)), torno(perfilFlanco2, 96, (ang, _h, r) => aplastar(ang, r))]);
  // the rim: hook flanges, a flat sidewall and a double-wall spoke bed (silver aluminium)
  const llanta = torno([
    [R_ASIENTO + 0.0035, 0.0118], [R_ASIENTO + 0.0052, 0.0122], [R_ASIENTO + 0.0055, 0.0108], [R_ASIENTO - 0.004, 0.0105], [R_ASIENTO - 0.012, 0.0102],
    [R_NIPLE + 0.0005, 0.0075], [R_NIPLE - 0.0015, 0.0], [R_NIPLE + 0.0005, -0.0075],
    [R_ASIENTO - 0.012, -0.0102], [R_ASIENTO - 0.004, -0.0105], [R_ASIENTO + 0.0055, -0.0108], [R_ASIENTO + 0.0052, -0.0122], [R_ASIENTO + 0.0035, -0.0118],
  ], 72);
  return { corona: corona3, flancos, llanta, radiosDel: radios(0.0275, 0.026), radiosTras: radios(0.044, 0.034) };
}
export type GeoRueda = ReturnType<typeof geometriasRueda>;

/** 36 spokes, three-cross, from hub flanges of radius `rf` at z = ±zf to the rim. */
function radios(rf: number, zf: number): THREE.BufferGeometry {
  const gs: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 36; i++) {
    const lado = i % 2 ? 1 : -1, dir = Math.floor(i / 2) % 2 ? 1 : -1;
    const ar = (i / 36) * Math.PI * 2, ah = ar + dir * (Math.PI / 3);
    const h = new THREE.Vector3(Math.cos(ah) * rf, Math.sin(ah) * rf, lado * zf);
    const r = new THREE.Vector3(Math.cos(ar) * R_NIPLE, Math.sin(ar) * R_NIPLE, lado * 0.0025);
    gs.push(barra(h, r, 0.001, 5));
    // the nipple at the rim
    gs.push(barra(r.clone().multiplyScalar(0.985), r.clone().multiplyScalar(1.03), 0.0018, 6));
  }
  return unir(gs);
}

/**
 * A front wheel: single-sided (Sunrider, its pedal-only sibling: front wheels
 * hung from one side), so the hub carries the stub axle and the 185 mm disc
 * with its hydraulic caliper on the inner side (−z in the wheel's frame; the
 * group is mirrored for the left wheel). The outside shows a plain hub cap.
 */
export function ruedaDelantera(G: GeoRueda, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  g.add(malla(G.corona, M.goma, 'neumatico'), malla(G.flancos, M.flanco, 'neumatico'), malla(G.llanta, M.llanta, 'llanta'), malla(G.radiosDel, M.radio, 'radios'));
  const buje = torno([[0.012, 0.036], [0.02, 0.034], [0.03, 0.03], [0.03, 0.022], [0.019, 0.019], [0.018, -0.019], [0.03, -0.022], [0.03, -0.03], [0.022, -0.036], [0.018, -0.046]], 28);
  g.add(malla(buje, M.buje, 'buje'));
  const tapa = torno([[0.0125, 0.036], [0.011, 0.04], [0.006, 0.0425], [0, 0.043]], 24);
  g.add(malla(tapa, M.aluminio, 'buje'));
  const disco = new THREE.RingGeometry(0.017, 0.0925, 64, 1); disco.translate(0, 0, -0.048);
  g.add(malla(disco, M.disco, 'disco'));
  // the caliper, behind and above the axle, on the stub-axle carrier
  const pinza = caja(0.052, 0.034, 0.03, 0.008); pinza.translate(0, 0.081, -0.048); pinza.rotateZ(Math.PI * 0.62);
  const eje = barra(new THREE.Vector3(0, 0, -0.03), new THREE.Vector3(0, 0, -0.085), 0.0085, 14);
  const mangueta = caja(0.05, 0.13, 0.03, 0.01); mangueta.translate(0, 0.02, -0.088);
  g.add(malla(unir([pinza, eje, mangueta]), M.pinza, 'freno'));
  return g;
}

/**
 * The rear wheel: Shimano Nexus 8 hub (AQUA sheet) with its finned roller
 * brake on the left, a 20-tooth sprocket on the right (chain from the pedals)
 * and a toothed belt pulley on the left (motor drive, owner's photo captions).
 */
export function ruedaTrasera(G: GeoRueda, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  g.add(malla(G.corona, M.goma, 'neumatico'), malla(G.flancos, M.flanco, 'neumatico'), malla(G.llanta, M.llanta, 'llanta'), malla(G.radiosTras, M.radio, 'radios'));
  const buje = torno([[0.02, 0.058], [0.03, 0.052], [0.046, 0.04], [0.046, 0.032], [0.03, 0.03], [0.034, 0.0], [0.03, -0.03], [0.046, -0.032], [0.046, -0.04], [0.03, -0.05], [0.02, -0.056]], 32);
  g.add(malla(buje, M.buje, 'buje'));
  // roller brake: finned drum on the left
  const aletas: [number, number][] = [];
  for (let k = 0; k <= 8; k++) { const z = -0.058 - k * 0.0035; aletas.push([k % 2 ? 0.058 : 0.046, z]); }
  aletas.push([0.02, -0.088]);
  g.add(malla(torno(aletas, 40), M.acero, 'freno'));
  const pinon20 = pinon(20, 0.041, 0.0025); pinon20.translate(0, 0, 0.062);
  const polea = pinon(48, 0.078, 0.009, 0.5); polea.translate(0, 0, -0.05);
  g.add(malla(pinon20, M.acero, 'pinon'), malla(polea, M.negro, 'polea'));
  return g;
}

// ---------------------------------------------------------------- cockpit
/**
 * The seat: an adjustable bucket seat with a headrest (AQUA sheet; OliNo:
 * «er zit een soort welving in»). A side-view profile from the front of the
 * cushion to the top of the headrest, swept across its width; the sides rise
 * into bolsters, the headrest is narrower. Fabric on the face, dark shell behind.
 */
function asiento(M: Mats): THREE.Group {
  const perfil: [number, number][] = [[-0.36, 0.305], [-0.44, 0.275], [-0.55, 0.255], [-0.66, 0.255], [-0.735, 0.285], [-0.79, 0.37], [-0.85, 0.5], [-0.91, 0.64], [-0.965, 0.78], [-1.0, 0.86], [-1.025, 0.93], [-1.04, 1.0], [-1.045, 1.045]];
  const curva = new THREE.CatmullRomCurve3(perfil.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal').getPoints(36);
  const n = curva.length;
  const nor = curva.map((_, i) => { const a = curva[Math.max(0, i - 1)], b = curva[Math.min(n - 1, i + 1)]; const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; });
  // half width along the profile: cushion and backrest 0.22 m, a neck, the headrest 0.13 m
  const ancho = (i: number) => { const y = curva[i].y; return y < 0.86 ? 0.22 : y < 0.92 ? 0.22 - (0.22 - 0.12) * (y - 0.86) / 0.06 : 0.13; };
  const us = [-1, -0.94, -0.82, -0.6, -0.3, 0, 0.3, 0.6, 0.82, 0.94, 1];
  const alto = (u: number, i: number) => { const b = curva[i].y < 0.86 ? 1 : 0.4; const q = Math.abs(u); return b * (q > 0.8 ? 0.055 + 0.01 * (q - 0.8) / 0.2 : 0.06 * q ** 4) - 0.008 * (1 - u * u); };
  const cara: number[] = [], dorso: number[] = [];
  for (let i = 0; i < n; i++) for (const u of us) {
    const h = alto(u, i), [nx, ny] = nor[i], w = ancho(i);
    cara.push(curva[i].x + nx * h, curva[i].y + ny * h, u * w);
    dorso.push(curva[i].x - nx * 0.03, curva[i].y - ny * 0.03, u * w * 1.02);
  }
  const m = us.length, idx: number[] = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) { const a = i * m + j, b = a + 1, c = a + m, d = c + 1; idx.push(a, c, b, b, c, d); }
  const hacer = (pos: number[]) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const g = new THREE.Group(); g.name = 'asiento';
  g.add(malla(hacer(cara), M.tela, 'asiento'), malla(hacer(dorso), M.plastico, 'asiento'));
  // the seat's rails on the floor
  const rieles = [-0.11, 0.11].map(z => { const r = caja(0.36, 0.03, 0.025, 0.008); r.translate(-0.58, 0.17, z); return r; });
  g.add(malla(unir(rieles), M.aluminio, 'asiento'));
  return g;
}

/**
 * A side stick on the +z side (the group is mirrored for the left one): a
 * lever from a pivot on the floor beside the seat to an upright grip with a
 * brake lever in front of it. `giro` adds the twist ring (throttle on the left,
 * gear shift on the right). Thin rods run forward to the front wheel's steering arm.
 */
function palanca(M: Mats, giro: 'gas' | 'cambio'): THREE.Group {
  const g = new THREE.Group(); g.name = 'mando';
  const pivote = caja(0.07, 0.05, 0.05, 0.012); pivote.translate(-0.42, 0.27, 0.25);
  const tubo = barra(new THREE.Vector3(-0.42, 0.27, 0.25), new THREE.Vector3(-0.345, 0.5, 0.275), 0.011, 12);
  g.add(malla(unir([pivote, tubo]), M.negro, 'mando'));
  const empu = barra(new THREE.Vector3(-0.345, 0.5, 0.275), new THREE.Vector3(-0.325, 0.62, 0.275), 0.0165, 16);
  const pomo = caja(0.04, 0.025, 0.04, 0.012); pomo.translate(-0.322, 0.632, 0.275);
  g.add(malla(unir([empu, pomo]), M.gomaMando, 'mando'));
  const anillo = barra(new THREE.Vector3(-0.343, 0.51, 0.275), new THREE.Vector3(-0.339, 0.535, 0.275), giro === 'gas' ? 0.019 : 0.0185, 18);
  g.add(malla(anillo, giro === 'gas' ? M.plastico : M.aluminio, 'mando'));
  // brake lever: a blade pivoting at the top, in front of the grip
  const ruta = [new THREE.Vector3(-0.31, 0.61, 0.275), new THREE.Vector3(-0.29, 0.585, 0.275), new THREE.Vector3(-0.287, 0.545, 0.275), new THREE.Vector3(-0.295, 0.515, 0.275)];
  const leva = barrido(ruta, () => [0.004, 0.009], { lados: 8, arriba: new THREE.Vector3(0, 0, 1) });
  const bomba = caja(0.045, 0.022, 0.03, 0.008); bomba.translate(-0.322, 0.605, 0.275);
  g.add(malla(unir([leva, bomba]), M.aluminio, 'mando'));
  // steering rod forward to the wheel's arm, under the knees
  g.add(malla(barra(new THREE.Vector3(-0.42, 0.26, 0.245), new THREE.Vector3(-0.07, 0.235, 0.222), 0.006, 8), M.acero, 'direccion'));
  return g;
}

/**
 * Pedals and drive: bottom bracket at the very front (OliNo: «helemaal vooraan
 * zijn de trappers»), 170 mm cranks, a 52-tooth ring, the first chain (in
 * tubes) back to an intermediate shaft and a second chain to the rear wheel
 * on the right (owner's blog: «two chains ... join on two sprockets in about
 * the middle»). Positions estimated.
 */
export const BB = new THREE.Vector3(0.3, 0.43, 0);
const INTER = new THREE.Vector3(-0.3, 0.2, 0);
function transmision(M: Mats, xRueda: number, yRueda: number): THREE.Group {
  const g = new THREE.Group(); g.name = 'transmision';
  const zP = 0.058, zS = 0.064;
  // bottom bracket on a short boom down to the floor
  const caja_ = barra(BB.clone().setZ(-0.04), BB.clone().setZ(0.04), 0.021, 16);
  const botavara = barra(BB.clone().add(new THREE.Vector3(-0.01, -0.01, 0)), new THREE.Vector3(0.05, 0.14, 0), 0.022, 12);
  g.add(malla(unir([caja_, botavara]), M.negro, 'pedalier'));
  const plato = pinon(52, 0.105, 0.003, 0.72); plato.translate(BB.x, BB.y, zP);
  const plato2 = pinon(4, 0.075, 0.004, 0.25); plato2.translate(BB.x, BB.y, zP + 0.004); // the spider
  g.add(malla(unir([plato, plato2]), M.aluminio, 'plato'));
  // cranks at 40° below the horizontal, opposite each other, with platform pedals
  const ang = -0.7;
  for (const s of [1, -1]) {
    const a = s > 0 ? ang : ang + Math.PI, fin = BB.clone().add(new THREE.Vector3(Math.cos(a) * 0.17, Math.sin(a) * 0.17, s * 0.078));
    const biela = barrido([BB.clone().setZ(s * 0.072), fin], () => [0.012, 0.007], { lados: 10, arriba: new THREE.Vector3(0, 0, 1) });
    const pedal = caja(0.085, 0.022, 0.1, 0.008); pedal.rotateZ(0.5); pedal.translate(fin.x, fin.y, fin.z + s * 0.062);
    g.add(malla(biela, M.aluminio, 'biela'), malla(pedal, M.negro, 'pedal'));
  }
  // intermediate shaft with its two sprockets
  const s1 = pinon(32, 0.065, 0.003, 0.4); s1.translate(INTER.x, INTER.y, zP);
  const s2 = pinon(18, 0.037, 0.003, 0.4); s2.translate(INTER.x, INTER.y, zS);
  const ejeI = barra(INTER.clone().setZ(-0.03), INTER.clone().setZ(0.075), 0.012, 12);
  g.add(malla(unir([s1, s2]), M.acero, 'pinon'), malla(ejeI, M.negro, 'eje'));
  // chains: straight runs tangent to the sprockets (first one inside its tubes)
  const tangentes = (c1: THREE.Vector3, r1: number, c2: THREE.Vector3, r2: number, z: number) => {
    const d = c2.clone().sub(c1), L = Math.hypot(d.x, d.y), b = Math.atan2(d.y, d.x), al = Math.asin((r1 - r2) / L);
    return [1, -1].map(sg => {
      const n = b + sg * (Math.PI / 2 + al);
      return [new THREE.Vector3(c1.x + Math.cos(n) * r1, c1.y + Math.sin(n) * r1, z), new THREE.Vector3(c2.x + Math.cos(n) * r2, c2.y + Math.sin(n) * r2, z)];
    });
  };
  const cad: THREE.BufferGeometry[] = [], tubos: THREE.BufferGeometry[] = [];
  for (const [a, b] of tangentes(BB, 0.106, INTER, 0.066, zP)) {
    cad.push(barra(a, b, 0.0035, 6));
    tubos.push(barra(a.clone().lerp(b, 0.12), a.clone().lerp(b, 0.88), 0.0085, 10));
  }
  const rT = new THREE.Vector3(xRueda, yRueda, 0);
  for (const [a, b] of tangentes(INTER, 0.038, rT, 0.042, zS)) cad.push(barra(a, b, 0.0035, 6));
  g.add(malla(unir(cad), M.cadena, 'cadena'), malla(unir(tubos), M.negro, 'tubo-cadena'));
  // the motor and its belt to the pulley on the rear wheel's left side
  const motor = barra(new THREE.Vector3(xRueda + 0.3, 0.27, -0.06), new THREE.Vector3(xRueda + 0.3, 0.27, -0.15), 0.048, 20);
  const polea = barra(new THREE.Vector3(xRueda + 0.3, 0.27, -0.0425), new THREE.Vector3(xRueda + 0.3, 0.27, -0.0575), 0.014, 12);
  g.add(malla(motor, M.acero, 'motor'), malla(polea, M.aluminio, 'motor'));
  const correa = tangentes(new THREE.Vector3(xRueda + 0.3, 0.27, 0), 0.016, rT, 0.08, -0.05).map(([a, b]) => barra(a, b, 0.0045, 4));
  g.add(malla(unir(correa), M.negro, 'correa'));
  // a battery box under the seat
  const bat = caja(0.3, 0.09, 0.14, 0.01); bat.translate(-0.62, 0.205, -0.06);
  g.add(malla(bat, M.plastico, 'bateria'));
  return g;
}

/** The console box between the knees with its small control panel (OliNo: lights, wiper, fans; speed read-out). */
function consola(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'consola';
  const cuerpo = caja(0.24, 0.15, 0.115, 0.025); cuerpo.translate(-0.06, 0.42, 0);
  const panel = caja(0.012, 0.075, 0.1, 0.006); panel.rotateZ(-0.55); panel.translate(-0.175, 0.475, 0);
  g.add(malla(cuerpo, M.plastico, 'consola'), malla(panel, M.negro, 'consola'));
  const lcd = new THREE.PlaneGeometry(0.06, 0.03); lcd.rotateY(-Math.PI / 2); lcd.rotateZ(-0.55); lcd.translate(-0.1825, 0.487, 0);
  g.add(malla(lcd, M.pantalla, 'pantalla', false));
  const teclas: THREE.BufferGeometry[] = [];
  for (const z of [-0.03, -0.01, 0.01, 0.03]) { const t = barra(new THREE.Vector3(-0.181, 0.455, z), new THREE.Vector3(-0.192, 0.452, z), 0.0045, 10); teclas.push(t); }
  g.add(malla(unir(teclas), M.interruptor, 'consola'));
  return g;
}

/** Everything inside the shell, in the car's frame. */
export function cabina(M: Mats, xRueda: number, yRueda: number): THREE.Group {
  const g = new THREE.Group(); g.name = 'cabina';
  g.add(asiento(M), consola(M), transmision(M, xRueda, yRueda));
  const der = palanca(M, 'cambio'); g.add(der);
  const izq = palanca(M, 'gas'); izq.scale.z = -1; g.add(izq);
  return g;
}

/**
 * A small round mirror on a stalk out of the body side (OliNo: «links en
 * rechts zijn kleine spiegels gemonteerd»), +z side; mirrored for the left.
 */
export function retrovisor(M: Mats, base: THREE.Vector3, normal: THREE.Vector3): THREE.Group {
  const g = new THREE.Group(); g.name = 'retrovisor';
  // a short stalk out of the body, swept back a little
  const p0 = base.clone().addScaledVector(normal, -0.004);
  const p1 = base.clone().add(new THREE.Vector3(-0.01, 0.016, 0.035));
  const p2 = base.clone().add(new THREE.Vector3(-0.02, 0.03, 0.062));
  g.add(malla(barrido([p0, p1, p2], t => [0.008 - 0.002 * t, 0.007], { lados: 10 }), M.negro, 'retrovisor'));
  // the housing: an oval cup about 90 x 60 mm, open towards the back
  const cuenco = torno([[0, 0.026], [0.018, 0.024], [0.032, 0.016], [0.041, 0.006], [0.045, 0], [0.043, -0.003]], 32);
  cuenco.rotateY(Math.PI / 2); cuenco.scale(1, 0.66, 1); // axis along x; the open side looks back (−x)
  const centro = base.clone().add(new THREE.Vector3(-0.035, 0.05, 0.095));
  const casco = malla(cuenco, M.negro, 'retrovisor'); casco.position.copy(centro); casco.rotation.y = 0.1; g.add(casco);
  const vidrio = new THREE.CircleGeometry(0.04, 32); vidrio.rotateY(-Math.PI / 2); vidrio.scale(1, 0.66, 1); vidrio.translate(-0.0025, 0, 0);
  const v = malla(vidrio, M.espejo, 'retrovisor', false); v.position.copy(centro); v.rotation.y = 0.1; g.add(v);
  return g;
}
