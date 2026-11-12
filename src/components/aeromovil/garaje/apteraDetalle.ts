import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { barrido, torno } from './apteraPiel';

/**
 * Materials, procedural textures and the small parts of the garage Aptera:
 * wheels, cabin, cameras, wiper. Everything is drawn by code; no texture or
 * model is downloaded. No logos or lettering.
 */

// ---------------------------------------------------------------- textures
const conDocumento = () => typeof document !== 'undefined';

/**
 * Solar cells as on the real car: square cells with cut corners, laid at 45°
 * (a diamond grid), on the lighter backsheet that shows in the gaps. One tile
 * holds one whole cell and four quarters; it repeats every `PASO_CELDA` m.
 */
export const PASO_CELDA = 0.165;
function texturaCeldas(): THREE.CanvasTexture | null {
  if (!conDocumento()) return null;
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#353c48'; c.fillRect(0, 0, S, S);
  // a cell: half-diagonal h (in px), corners cut by k
  const h = S / 2 - 4, k = 14;
  const celda = (cx: number, cy: number) => {
    c.beginPath();
    c.moveTo(cx - h + k, cy - k); c.lineTo(cx - k, cy - h + k); c.lineTo(cx + k, cy - h + k); c.lineTo(cx + h - k, cy - k);
    c.lineTo(cx + h - k, cy + k); c.lineTo(cx + k, cy + h - k); c.lineTo(cx - k, cy + h - k); c.lineTo(cx - h + k, cy + k);
    c.closePath();
    const gr = c.createLinearGradient(cx - h, cy - h, cx + h, cy + h);
    gr.addColorStop(0, '#0d1830'); gr.addColorStop(0.5, '#0a1226'); gr.addColorStop(1, '#0e1a33');
    c.fillStyle = gr; c.fill();
    // fine contact fingers along one side of the cell, barely visible
    c.save(); c.clip(); c.strokeStyle = 'rgba(120,140,170,0.10)'; c.lineWidth = 1;
    for (let t = -h; t <= h; t += 6) { c.beginPath(); c.moveTo(cx + t - h, cy + t + h); c.lineTo(cx + t + h, cy + t - h); c.stroke(); }
    c.strokeStyle = 'rgba(150,165,190,0.14)'; c.lineWidth = 2;
    for (const t of [-h / 2.2, h / 2.2]) { c.beginPath(); c.moveTo(cx + t - h, cy - t - h); c.lineTo(cx + t + h, cy - t + h); c.stroke(); }
    c.restore();
  };
  for (const [x, y] of [[0, 0], [S, 0], [0, S], [S, S], [S / 2, S / 2]]) celda(x, y);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.repeat.set(1 / PASO_CELDA, 1 / PASO_CELDA);
  return t;
}

/** Grey speckle for the felt skirts of the pods and the tyre sidewall grain. */
function texturaRuido(base: string, puntos: number, alfa: number, tam = 128): THREE.CanvasTexture | null {
  if (!conDocumento()) return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = tam;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = base; c.fillRect(0, 0, tam, tam);
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < puntos; i++) {
    const v = Math.floor(rnd() * 255); c.fillStyle = `rgba(${v},${v},${v},${alfa})`;
    c.fillRect(rnd() * tam, rnd() * tam, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

/** The LED module in the middle of the nose light bar: five square emitters in a dark frame. */
function texturaModulo(): THREE.CanvasTexture | null {
  if (!conDocumento()) return null;
  const W = 256, H = 48, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#d9dee6'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#20242a'; c.fillRect(6, 6, W - 12, H - 12);
  for (let i = 0; i < 5; i++) {
    const x = 16 + i * 46;
    c.fillStyle = '#fbfdff'; c.fillRect(x, 11, 38, H - 22);
    c.fillStyle = '#9aa3ad'; c.fillRect(x + 6, 15, 26, H - 30);
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x + 19, H / 2, 6, 0, Math.PI * 2); c.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ---------------------------------------------------------------- materials
export function materiales() {
  const F = THREE.FrontSide, D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: F, ...p });
  // patches laid on the skin: drawn a hair in front of it, so they never flicker
  const calco = (p: THREE.MeshPhysicalMaterialParameters) => fis({ polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...p });
  const celdas = texturaCeldas(), fieltro = texturaRuido('#3b3d41', 2600, 0.35), modulo = texturaModulo();
  if (fieltro) fieltro.repeat.set(5, 5);
  return {
    // Launch Edition silver; the lower nose and the keel in dark graphite
    pintura: fis({ color: 0xa6adb4, metalness: 0.55, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.035 }),
    grafito: fis({ color: 0x2c3036, metalness: 0.5, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.05 }),
    grafitoCalco: calco({ color: 0x2c3036, metalness: 0.5, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.05 }),
    bajos: fis({ color: 0x17191c, metalness: 0.1, roughness: 0.8 }),
    // the dark band (pillars, frames, the ends of the canopy): black gloss
    banda: calco({ color: 0x0a0c0f, metalness: 0.2, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.03 }),
    solar: calco({ color: celdas ? 0xffffff : 0x0c1428, map: celdas, metalness: 0.15, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.02 }),
    // glass: the colour and the opacity come per vertex (black frit at the border, tinted clear inside)
    cristal: calco({ color: 0xffffff, vertexColors: true, transparent: true, depthWrite: false, metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.01, envMapIntensity: 1.4, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: D }),
    junta: calco({ color: 0x0d0e10, metalness: 0, roughness: 0.7, polygonOffsetFactor: -6, polygonOffsetUnits: -6, side: D }),
    // the rubber frame around the door and boot openings, on the fixed body: under the closed panel, seen
    // when it opens (one without polygon offset for the painted part, one like the dark band for the rest)
    marco: fis({ color: 0x141518, metalness: 0, roughness: 0.85, side: D }),
    marcoBanda: calco({ color: 0x141518, metalness: 0, roughness: 0.85, side: D }),
    // the moving panels (doors, hatch): the same paint and band, drawn in front of the fixed skin they sit on
    pinturaPieza: calco({ color: 0xa6adb4, metalness: 0.55, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.035 }),
    bandaPieza: calco({ color: 0x0a0c0f, metalness: 0.2, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.03, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    // floors and the bulkhead seen through the open doors and hatch
    tapizado: fis({ color: 0x1d1f22, roughness: 0.9, metalness: 0, side: D }),
    luz: calco({ color: 0xffffff, emissive: 0xf2f6ff, emissiveIntensity: 1.6, roughness: 0.25, polygonOffsetFactor: -5, polygonOffsetUnits: -5 }),
    modulo: calco({ color: modulo ? 0xffffff : 0xdde3ea, map: modulo, emissive: 0xffffff, emissiveMap: modulo, emissiveIntensity: 1.3, roughness: 0.2, polygonOffsetFactor: -7, polygonOffsetUnits: -7 }),
    lente: fis({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false, metalness: 0, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.0, envMapIntensity: 1.6 }),
    ambar: fis({ color: 0xffb321, emissive: 0xff9a00, emissiveIntensity: 0.9, roughness: 0.25, clearcoat: 1 }),
    piloto: fis({ color: 0x9a0610, emissive: 0xff1424, emissiveIntensity: 0.75, roughness: 0.18, clearcoat: 1 }),
    fieltro: calco({ color: 0xffffff, map: fieltro, roughness: 1, metalness: 0, side: D }),
    negro: fis({ color: 0x111215, metalness: 0.2, roughness: 0.45 }),
    lenteCamara: fis({ color: 0x050608, metalness: 0.6, roughness: 0.05, clearcoat: 1 }),
    goma: fis({ color: 0x18191b, roughness: 0.86, metalness: 0 }),
    tapa: fis({ color: 0x9aa1a8, metalness: 0.75, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.08 }),
    tapaOscura: fis({ color: 0x2a2d31, metalness: 0.5, roughness: 0.35 }),
    // cabin
    forro: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.9, metalness: 0, side: THREE.BackSide }),
    salpicadero: fis({ color: 0x24272b, roughness: 0.7, metalness: 0.05 }),
    claro: fis({ color: 0xcfc8ba, roughness: 0.85, metalness: 0 }),
    asiento: fis({ color: 0xdcd4c4, roughness: 0.95, metalness: 0, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.8 }),
    asientoGris: fis({ color: 0x55585e, roughness: 0.95, metalness: 0 }),
    pantalla: fis({ color: 0x07090c, emissive: 0x0e1c2c, emissiveIntensity: 0.6, roughness: 0.06, metalness: 0.2, clearcoat: 1 }),
  };
}
export type Mats = ReturnType<typeof materiales>;

/** Merges parts that share a material into one geometry (one draw call), keeping only positions and normals. */
export function unir(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const limpias = geos.map(g => {
    const n = g.index ? g.toNonIndexed() : g, c = new THREE.BufferGeometry();
    c.setAttribute('position', n.attributes.position);
    if (!n.attributes.normal) n.computeVertexNormals();
    c.setAttribute('normal', n.attributes.normal);
    return c;
  });
  return mergeGeometries(limpias)!;
}

export const malla = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre: string, sombra = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = sombra; o.receiveShadow = true; o.name = nombre; return o;
};

// ---------------------------------------------------------------- wheels
/**
 * 16″ wheel with a smooth aero cover, as on the Launch Edition: tyre with a
 * rounded sidewall, four grooves and sipes, slightly flattened where it
 * touches the ground. Axle along Z, centre at the origin; the group goes at
 * y = R − APLASTADO so the flat patch rests on the ground.
 */
export const APLASTADO = 0.007;
export function geometriasRueda(R: number, ancho: number) {
  const w = ancho / 2, rL = 0.2032 + 0.006; // 16″ rim radius plus the bead
  const flanco = (sg: number): [number, number][] => [
    [rL - 0.004, sg * (w - 0.016)], [rL + 0.01, sg * (w - 0.004)], [rL + 0.03, sg * (w + 0.003)],
    [(rL + R) / 2, sg * (w + 0.006)], [R - 0.03, sg * (w + 0.002)], [R - 0.014, sg * (w - 0.006)], [R - 0.004, sg * (w - 0.018)],
  ];
  const t = w - 0.02, banda: [number, number][] = [];
  for (let k = 0; k <= 12; k++) banda.push([R, -t + 2 * t * k / 12]);
  const surcos = [-0.62, -0.2, 0.2, 0.62];
  const perfil: [number, number][] = [...flanco(-1), ...banda.map(([r, h]) => [surcos.some(s => Math.abs(h / t - s) < 0.06) ? r - 0.007 : r, h] as [number, number]), ...flanco(1).reverse()];
  const N = 64; // sipes around
  const neumatico = torno(perfil, 100, (a, h, r) => {
    let rr = r;
    if (r > R - 0.0025) { const hn = h / t, f = (a / (Math.PI * 2)) * N + Math.abs(hn) * 1.3; if (Math.abs(hn) > 0.3 && f - Math.floor(f) < 0.18) rr -= 0.004; }
    // flat contact patch at the bottom (a = 3π/2: −y)
    const s = -Math.sin(a); if (s > 0 && rr * s > R - APLASTADO) rr = (R - APLASTADO) / s;
    return rr;
  });
  // the aero cover: a shallow dish over the rim, with a fine groove near the edge and a centre cap
  const hD = (r: number) => w - 0.004 - 0.012 * (1 - (r / rL) ** 2);
  // (profiles run from the rim inwards: with `torno`'s winding that leaves the face looking at +z)
  const disco: [number, number][] = [];
  for (let k = 0; k <= 8; k++) { const r = (rL - 0.002) * (1 - k / 8); disco.push([r, hD(r)]); }
  const tapa = torno(disco, 64);
  const ranura = torno([[rL - 0.024, hD(rL - 0.024) + 0.0012], [rL - 0.03, hD(rL - 0.03) + 0.0012]], 64);
  const centro = torno([[0.05, hD(0.05)], [0.045, hD(0.045) + 0.002], [0.03, hD(0.03) + 0.005], [0, hD(0) + 0.006]], 48);
  return { neumatico, tapa, ranura, centro };
}
export type GeoRueda = ReturnType<typeof geometriasRueda>;

/** A wheel; the silver cover goes on the `exterior` side (+1: +z), and on both sides when `ambos` (the rear wheel shows both). */
export function rueda(G: GeoRueda, M: Mats, exterior: 1 | -1, ambos = false): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  g.add(malla(G.neumatico, M.goma, 'neumatico'));
  for (const lado of [exterior, -exterior]) {
    const t = new THREE.Group(); t.scale.z = lado; g.add(t);
    if (lado === exterior || ambos) t.add(malla(G.tapa, M.tapa, 'tapacubos'), malla(G.ranura, M.tapaOscura, 'tapacubos'), malla(G.centro, M.tapaOscura, 'tapacubos'));
    else t.add(malla(G.tapa, M.tapaOscura, 'tapacubos'));
  }
  return g;
}

// ---------------------------------------------------------------- cabin
/**
 * What shows through the glass: two seats side by side (light upholstery with
 * grey bolsters), the dashboard with its centre screen, the steering wheel on
 * the left (−z) and the screens of the side cameras. Simple volumes: they are
 * seen through tinted glass, and an empty glass shell is what makes a model look like a toy.
 */
export function cabina(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'cabina';
  // a box with soft edges: a superellipsoid (much cheaper to build than a bevelled box)
  const caja = (sx: number, sy: number, sz: number, r: number) => {
    const s = new THREE.SphereGeometry(1, 16, 10), p = s.attributes.position as THREE.BufferAttribute;
    const e = Math.max(0.12, Math.min(0.5, 2.2 * r / Math.min(sx, sy, sz))), f = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), e);
    for (let i = 0; i < p.count; i++) p.setXYZ(i, f(p.getX(i)) * sx / 2, f(p.getY(i)) * sy / 2, f(p.getZ(i)) * sz / 2);
    s.deleteAttribute('uv'); s.computeVertexNormals();
    return s;
  };
  const crema: THREE.BufferGeometry[] = [], gris: THREE.BufferGeometry[] = [];
  for (const z of [-0.33, 0.33]) {
    // cushion and backrest, the backrest leaning back ~22°
    const cojin = caja(0.5, 0.11, 0.46, 0.045); cojin.rotateZ(0.12); cojin.translate(-1.42, 0.33, z); crema.push(cojin);
    const respaldo = caja(0.12, 0.72, 0.46, 0.05); respaldo.translate(0, 0.36, 0); respaldo.rotateZ(0.38); respaldo.translate(-1.66, 0.33, z); crema.push(respaldo);
    for (const s of [-1, 1]) {
      const lado = caja(0.14, 0.62, 0.07, 0.03); lado.translate(0.02, 0.33, 0); lado.rotateZ(0.38); lado.translate(-1.66, 0.36, z + s * 0.24); gris.push(lado);
      const ala = caja(0.46, 0.08, 0.07, 0.03); ala.rotateZ(0.12); ala.translate(-1.42, 0.38, z + s * 0.24); gris.push(ala);
    }
  }
  g.add(malla(unir(crema), M.asiento, 'asiento'), malla(unir(gris), M.asientoGris, 'asiento'));
  // dashboard: a dark top and a light lower band, across the whole cabin
  const tablero = caja(0.36, 0.11, 1.18, 0.05); tablero.translate(-0.78, 0.80, 0);
  const banda = caja(0.24, 0.07, 1.14, 0.03); banda.translate(-0.86, 0.71, 0);
  const consola = caja(0.5, 0.16, 0.2, 0.04); consola.translate(-1.1, 0.34, 0);
  g.add(malla(unir([tablero, consola]), M.salpicadero, 'salpicadero'), malla(banda, M.claro, 'salpicadero'));
  // centre screen, standing on the dashboard and facing the seats
  const pantalla = caja(0.02, 0.17, 0.29, 0.008); pantalla.rotateZ(-0.2); pantalla.translate(-0.94, 0.95, 0.02);
  const pequenas: THREE.BufferGeometry[] = [pantalla];
  // side camera screens at both ends of the dashboard
  for (const z of [-0.5, 0.5]) { const p = caja(0.015, 0.07, 0.12, 0.005); p.translate(-0.88, 0.9, z); pequenas.push(p); }
  g.add(malla(unir(pequenas), M.pantalla, 'pantalla'));
  // steering wheel (a rounded rectangle, flat at the bottom) and its column, on the left
  const aro: THREE.Vector3[] = [];
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const r = 0.17 / Math.pow(Math.pow(Math.abs(c), 4) + Math.pow(Math.abs(s), 4), 0.25);
    aro.push(new THREE.Vector3(0, s * r * 0.85, c * r));
  }
  const volante = barrido(aro, () => [0.016, 0.016], { lados: 8, cerrado: true, arriba: new THREE.Vector3(1, 0, 0) });
  const buje = caja(0.05, 0.11, 0.16, 0.03);
  const columna = new THREE.CylinderGeometry(0.03, 0.035, 0.32, 12); columna.rotateZ(Math.PI / 2 + 0.45); columna.translate(0.15, -0.07, 0);
  const vol = unir([volante, buje, columna]);
  vol.rotateZ(0.42); vol.translate(-1.06, 0.83, -0.33);
  g.add(malla(vol, M.negro, 'volante'));
  return g;
}

// ---------------------------------------------------------------- small parts
/**
 * Side camera instead of a mirror (the Launch Edition has none): a slim black
 * blade out of the door, swept back, with the camera pod at its end.
 */
export function camaraLateral(M: Mats, base: THREE.Vector3, lado: 1 | -1): THREE.Group {
  const g = new THREE.Group(); g.name = 'camara';
  const p = (dx: number, dy: number, dz: number) => base.clone().add(new THREE.Vector3(dx, dy, dz * lado));
  const ruta = [p(0.02, -0.005, -0.02), p(-0.02, 0.0, 0.05), p(-0.08, 0.012, 0.12), p(-0.14, 0.02, 0.165)];
  g.add(malla(barrido(ruta, t => [0.011 - 0.003 * t, 0.006], { lados: 10 }), M.negro, 'camara'));
  const capsula = torno([[0, -0.05], [0.012, -0.046], [0.019, -0.03], [0.02, 0], [0.017, 0.025], [0.01, 0.04], [0, 0.045]], 20);
  capsula.rotateY(Math.PI / 2); capsula.scale(1, 0.85, 1);
  const c = malla(capsula, M.negro, 'camara'); c.position.copy(p(-0.165, 0.02, 0.172)); g.add(c);
  const lente = new THREE.CircleGeometry(0.008, 16); lente.rotateY(-Math.PI / 2);
  const l = malla(lente, M.lenteCamara, 'camara', false); l.position.copy(p(-0.165 - 0.0505, 0.02, 0.172)); g.add(l);
  return g;
}

/** The single wiper, parked along the base of the windshield. */
export function limpia(M: Mats, puntos: THREE.Vector3[]): THREE.Group {
  const g = new THREE.Group(); g.name = 'limpiaparabrisas';
  g.add(malla(barrido(puntos, t => [0.007 + 0.006 * (1 - t), 0.006], { lados: 8 }), M.negro, 'limpiaparabrisas'));
  const eje = new THREE.CylinderGeometry(0.018, 0.022, 0.03, 16); eje.translate(puntos[0].x, puntos[0].y, puntos[0].z);
  g.add(malla(eje, M.negro, 'limpiaparabrisas'));
  return g;
}
