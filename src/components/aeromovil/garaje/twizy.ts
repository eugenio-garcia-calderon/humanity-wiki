import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { VehiculoGaraje } from './tipos';

/**
 * Renault Twizy 80 (2012–).
 *
 * La carrocería es una malla real, no un dibujo por código: el modelo «SD Twizy»
 * de StreetDrone (github.com/streetdrone-home/SD-TwizyModel, © 2020 StreetDrone
 * Limited, licencia Apache 2.0; copia de la licencia y lista de cambios en
 * public/aeromovil/garaje/LICENSE-SDTwizy.txt). Se ha convertido a un binario
 * compacto (public/aeromovil/garaje/twizy.bin, ~395 KB) con
 * scripts/aeromovil/twizy_convertir.py, y se ha ajustado a la ficha de Renault:
 *
 *  - Batalla 1 686 mm, alto 1 454 mm, voladizo trasero 339 mm. El STL original
 *    medía 1 650 mm de batalla, 1 577 de alto y su cápsula trasera sobresalía
 *    ~18 cm por detrás del guardabarros; la ficha dice que van enrasados, así
 *    que la cápsula se ha acortado con una compresión suave desde el asiento
 *    trasero hacia atrás. El punto más bajo queda a 115 mm (ficha: 120 mm).
 *  - Las ruedas del STL eran bloques: se dibujan aquí, por código, con la
 *    medida real (125/80 R13 delante, 145/80 R13 detrás).
 *
 * Ejes: X hacia delante, Y arriba, Z lateral. Eje delantero en x = 0, eje
 * trasero en x = −1,686, suelo en y = 0. Metros.
 */

const BATALLA = 1.686;
const VIA_DEL = 1.094, VIA_TRAS = 1.080;
const R_DEL = 0.265, R_TRAS = 0.281;
const ANCHO_DEL = 0.125, ANCHO_TRAS = 0.145;
const R_LLANTA = 0.165; // 13 pulgadas
const URL_MALLA = '/aeromovil/garaje/twizy.bin';

// ---------------------------------------------------------------- materiales
function materiales() {
  const D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: D, ...p });
  return {
    blanco: fis({ color: 0xf1f2f0, roughness: 0.26, metalness: 0.04, clearcoat: 1, clearcoatRoughness: 0.04 }),
    negroBrillo: fis({ color: 0x0f1012, roughness: 0.16, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 }),
    plastico: fis({ color: 0x2c2f34, roughness: 0.78, metalness: 0.02 }),
    guardabarros: fis({ color: 0x1f2124, roughness: 0.5, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    salpicadero: fis({ color: 0x3b3e44, roughness: 0.72, metalness: 0.02 }),
    negro: fis({ color: 0x1c1e21, roughness: 0.62, metalness: 0.02 }),
    grafito: fis({ color: 0x34383e, roughness: 0.45, metalness: 0.15, clearcoat: 0.4 }),
    tela: fis({ color: 0x2a2d32, roughness: 0.92, metalness: 0, sheen: 0.5, sheenColor: new THREE.Color(0x5a6070) }),
    goma: fis({ color: 0x151515, roughness: 0.88, metalness: 0 }),
    llanta: fis({ color: 0xc8ccd2, roughness: 0.22, metalness: 0.9, clearcoat: 1, clearcoatRoughness: 0.08 }),
    reflector: fis({ color: 0xf4f6fa, roughness: 0.1, metalness: 1, emissive: 0x2a2e36 }),
    luzBlanca: fis({ color: 0xfafcff, emissive: 0xdde8ff, emissiveIntensity: 0.8, roughness: 0.2 }),
    faroLente: fis({ color: 0xffffff, roughness: 0.02, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.22, depthWrite: false }),
    cromo: fis({ color: 0xe8eaee, roughness: 0.08, metalness: 1 }),
    acero: fis({ color: 0x6d7178, roughness: 0.4, metalness: 0.85 }),
    disco: fis({ color: 0x8a8d92, roughness: 0.35, metalness: 0.9 }),
    muelle: fis({ color: 0xc8372b, roughness: 0.35, metalness: 0.4, clearcoat: 0.6 }),
    cristal: fis({ color: 0xa9c4d6, roughness: 0.03, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.26, depthWrite: false }),
    lunaTrasera: fis({ color: 0x0d151c, roughness: 0.05, metalness: 0.2, clearcoat: 1 }),
    ambar: fis({ color: 0xff9a1a, emissive: 0xff7a00, emissiveIntensity: 0.35, roughness: 0.25, clearcoat: 1 }),
    rojo: fis({ color: 0xc0101a, emissive: 0x900008, emissiveIntensity: 0.55, roughness: 0.15, clearcoat: 1 }),
  };
}
type Mats = ReturnType<typeof materiales>;
type ClaseMat = keyof Mats;

// ---------------------------------------------------------------- utilidades
const malla = (g: THREE.BufferGeometry, m: THREE.Material, nombre?: string) => {
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (nombre) o.name = nombre; return o;
};

/** Contorno 2D con las esquinas redondeadas (radio por esquina o común). */
function forma(pts: [number, number][], r: number | number[]): THREE.Shape {
  const s = new THREE.Shape(), n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Vector2(...pts[i]), a = new THREE.Vector2(...pts[(i - 1 + n) % n]), b = new THREE.Vector2(...pts[(i + 1) % n]);
    const rr = Array.isArray(r) ? r[i] : r;
    const da = a.clone().sub(p), db = b.clone().sub(p);
    const ra = Math.min(rr, da.length() / 2), rb = Math.min(rr, db.length() / 2);
    const p1 = p.clone().add(da.normalize().multiplyScalar(ra)), p2 = p.clone().add(db.normalize().multiplyScalar(rb));
    if (i === 0) s.moveTo(p1.x, p1.y); else s.lineTo(p1.x, p1.y);
    s.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
  }
  s.closePath();
  return s;
}

function extruir(s: THREE.Shape, prof: number, bisel: number, curva = 10): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: curva });
  g.translate(0, 0, -prof / 2); g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------- la malla
/**
 * Formato TWZ1 (lo escribe el guion de conversión): 'TWZ1', uint32 con el largo
 * del JSON, el JSON (relleno a 4 bytes) y, por cada parte, las posiciones en
 * int16 (décimas de milímetro) y los índices en uint16, cada bloque relleno a 4.
 */
interface Parte { m: ClaseMat; geo: THREE.BufferGeometry }
let carga: Promise<Parte[]> | null = null;

function leerMalla(buf: ArrayBuffer): Parte[] {
  const cab = new TextDecoder().decode(new Uint8Array(buf, 0, 4));
  if (cab !== 'TWZ1') throw new Error(`twizy.bin: cabecera «${cab}», se esperaba TWZ1`);
  const n = new DataView(buf).getUint32(4, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, n))) as { escala: number; partes: { m: ClaseMat; v: number; i: number }[] };
  let off = 8 + n;
  const relleno = () => { off += (4 - (off % 4)) % 4; };
  return meta.partes.map(p => {
    const q = new Int16Array(buf, off, p.v * 3); off += p.v * 6; relleno();
    const idx = new Uint16Array(buf, off, p.i); off += p.i * 2; relleno();
    const pos = new Float32Array(p.v * 3);
    for (let k = 0; k < pos.length; k++) pos[k] = q[k] * meta.escala;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
    // Aristas vivas donde la malla las tiene (marco de la puerta, faros) y
    // superficie suave en el resto: normales «con pliegue» a 35°.
    return { m: p.m, geo: toCreasedNormals(g, (35 * Math.PI) / 180) };
  });
}

/** Descarga la malla una sola vez por página; si falla, el siguiente intento vuelve a pedirla. */
function cargarMalla(): Promise<Parte[]> {
  if (!carga) {
    carga = fetch(URL_MALLA)
      .then(r => { if (!r.ok) throw new Error(`twizy.bin: HTTP ${r.status}`); return r.arrayBuffer(); })
      .then(leerMalla)
      .catch(e => { carga = null; throw e; });
  }
  return carga;
}

// ---------------------------------------------------------------- esquina
/**
 * Una esquina: rueda + disco y pinza + mangueta. Los muelles, amortiguadores y
 * brazos ya vienen en la malla, en su sitio. Centro de la rueda en el origen,
 * Z hacia fuera del coche.
 */
function esquina(delantera: boolean, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = delantera ? 'esquina-delantera' : 'esquina-trasera';
  const R = delantera ? R_DEL : R_TRAS, ancho = delantera ? ANCHO_DEL : ANCHO_TRAS;
  g.add(rueda(R, ancho, M));
  const zi = -ancho / 2; // cara interior
  const disco = new THREE.LatheGeometry([new THREE.Vector2(0.05, -0.006), new THREE.Vector2(0.118, -0.006), new THREE.Vector2(0.118, 0.006), new THREE.Vector2(0.05, 0.006)], 48);
  disco.rotateX(Math.PI / 2); disco.translate(0, 0, zi * 0.35); g.add(malla(disco, M.disco, 'disco'));
  const pinza = extruir(forma([[-0.05, 0.08], [0.05, 0.08], [0.04, 0.125], [-0.04, 0.125]], 0.012), 0.03, 0.004, 4);
  pinza.rotateZ(delantera ? -0.9 : 0.9 + Math.PI); pinza.translate(0, 0, zi * 0.35 - 0.004); g.add(malla(pinza, M.grafito, 'pinza'));
  const mang = extruir(forma([[-0.03, -0.14], [0.03, -0.14], [0.045, 0.0], [0.03, 0.15], [-0.02, 0.15], [-0.045, 0.0]], 0.015), 0.03, 0.006, 4);
  mang.translate(0, 0, zi - 0.03); g.add(malla(mang, M.acero, 'mangueta'));
  return g;
}

// ---------------------------------------------------------------- rueda
/** Neumático por torno, con dibujo tallado en la banda de rodadura. Eje en Z. */
function neumatico(R: number, ancho: number): THREE.BufferGeometry {
  const hw = ancho / 2, perfil: THREE.Vector2[] = [];
  const rTalon = R_LLANTA + 0.004, hFlanco = R - rTalon;
  // flanco interior (de talón a hombro), banda, flanco exterior
  const flanco = (lado: number, inv: boolean) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 7; i++) {
      const t = i / 7, r = rTalon + hFlanco * (0.08 + 0.84 * t);
      const bulto = Math.sin(Math.PI * Math.min(1, t * 1.15)) * 0.012;
      pts.push(new THREE.Vector2(r, lado * (hw * 0.86 + bulto + 0.01 * t)));
    }
    return inv ? pts.reverse() : pts;
  };
  perfil.push(new THREE.Vector2(rTalon - 0.004, -hw * 0.84));
  perfil.push(...flanco(-1, false));
  // hombro redondeado
  for (let i = 1; i <= 5; i++) { const a = Math.PI / 2 * (i / 5); perfil.push(new THREE.Vector2(R - 0.014 + 0.014 * Math.sin(a), -(hw - 0.006) + 0.006 * (1 - Math.cos(a)) - 0.004 * (1 - Math.sin(a)))); }
  const nb = 16;
  for (let i = 1; i < nb; i++) perfil.push(new THREE.Vector2(R, -(hw - 0.006) + (2 * (hw - 0.006)) * (i / nb)));
  for (let i = 0; i <= 5; i++) { const a = Math.PI / 2 * (1 - i / 5); perfil.push(new THREE.Vector2(R - 0.014 + 0.014 * Math.sin(a), (hw - 0.006) - 0.006 * (1 - Math.cos(a)) + 0.004 * (1 - Math.sin(a)))); }
  perfil.push(...flanco(1, true));
  perfil.push(new THREE.Vector2(rTalon - 0.004, hw * 0.84));
  const g = new THREE.LatheGeometry(perfil, 128);
  // dibujo: surcos circunferenciales y tacos en flecha
  const p = g.attributes.position as THREE.BufferAttribute, lim = hw - 0.008;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < R - 0.0015 || Math.abs(y) > lim) continue;
    const phi = Math.atan2(z, x), ay = Math.abs(y);
    const u = phi * 32 / (2 * Math.PI) + ay * 9;
    const f = u - Math.floor(u);
    const surco = ay < 0.005 || Math.abs(ay - lim * 0.62) < 0.004 || (f < 0.2 && ay > 0.008);
    if (surco) { const k = (R - 0.007) / r; p.setX(i, x * k); p.setZ(i, z * k); }
  }
  g.rotateX(Math.PI / 2); g.computeVertexNormals();
  return g;
}

/** Rueda completa (neumático, llanta de 13", buje, tornillos), eje Z hacia fuera. */
function rueda(R: number, ancho: number, M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  g.add(malla(neumatico(R, ancho), M.goma, 'neumatico'));
  // tambor de la llanta
  const hw = ancho / 2;
  const tambor = new THREE.LatheGeometry([
    new THREE.Vector2(R_LLANTA + 0.006, -hw * 0.88), new THREE.Vector2(R_LLANTA - 0.004, -hw * 0.8), new THREE.Vector2(R_LLANTA - 0.008, -hw * 0.2),
    new THREE.Vector2(R_LLANTA - 0.008, hw * 0.55), new THREE.Vector2(R_LLANTA - 0.004, hw * 0.8), new THREE.Vector2(R_LLANTA + 0.007, hw * 0.88), new THREE.Vector2(R_LLANTA + 0.004, hw * 0.94),
  ], 72);
  tambor.rotateX(Math.PI / 2); g.add(malla(tambor, M.llanta));
  // cara: disco con 8 ventanas trapezoidales (radios)
  const cara = new THREE.Shape(); cara.absarc(0, 0, R_LLANTA - 0.006, 0, Math.PI * 2, false);
  const nv = 8;
  for (let k = 0; k < nv; k++) {
    const a0 = (k / nv) * Math.PI * 2 + 0.17, a1 = ((k + 1) / nv) * Math.PI * 2 - 0.17, r0 = 0.062, r1 = R_LLANTA - 0.024;
    const h = new THREE.Path();
    h.moveTo(r0 * Math.cos(a0 + 0.12), r0 * Math.sin(a0 + 0.12));
    h.lineTo(r1 * Math.cos(a0), r1 * Math.sin(a0));
    h.absarc(0, 0, r1, a0, a1, false);
    h.lineTo(r0 * Math.cos(a1 - 0.12), r0 * Math.sin(a1 - 0.12));
    h.absarc(0, 0, r0, a1 - 0.12, a0 + 0.12, true);
    cara.holes.push(h);
  }
  const gc = extruir(cara, 0.008, 0.004, 7); gc.translate(0, 0, hw * 0.45); g.add(malla(gc, M.llanta, 'llanta'));
  // tapacubos y tornillos
  const tapa = new THREE.LatheGeometry([new THREE.Vector2(0, 0.026), new THREE.Vector2(0.02, 0.024), new THREE.Vector2(0.034, 0.016), new THREE.Vector2(0.04, 0.004), new THREE.Vector2(0.041, 0)], 36);
  tapa.rotateX(Math.PI / 2); tapa.translate(0, 0, hw * 0.45 + 0.008); g.add(malla(tapa, M.grafito));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4, t = new THREE.CylinderGeometry(0.008, 0.009, 0.014, 6);
    t.rotateX(Math.PI / 2); t.translate(0.05 * Math.cos(a), 0.05 * Math.sin(a), hw * 0.45 + 0.012); g.add(malla(t, M.cromo));
  }
  return g;
}


function matricula(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'matricula';
  const placa = extruir(forma([[-0.27, -0.062], [0.27, -0.062], [0.27, 0.062], [-0.27, 0.062]], 0.012), 0.006, 0.002, 4);
  placa.rotateY(-Math.PI / 2);
  let mat: THREE.Material = M.blanco;
  if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas'); cv.width = 1040; cv.height = 220;
    const c = cv.getContext('2d');
    if (c) {
      c.fillStyle = '#f7f7f2'; c.fillRect(0, 0, 1040, 220);
      c.fillStyle = '#1f4fb0'; c.fillRect(0, 0, 90, 220);
      c.fillStyle = '#ffd400'; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.beginPath(); c.arc(45 + 26 * Math.cos(a), 70 + 26 * Math.sin(a), 4, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#fff'; c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.fillText('E', 45, 185);
      c.fillStyle = '#111'; c.font = 'bold 150px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('4821 KTW', 565, 118);
      c.strokeStyle = '#111'; c.lineWidth = 8; c.strokeRect(4, 4, 1032, 212);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
      tx.wrapS = THREE.RepeatWrapping; tx.repeat.x = -1; // la cara mira hacia atrás: se invierte para leerse bien
      mat = new THREE.MeshPhysicalMaterial({ map: tx, roughness: 0.35, clearcoat: 0.5 });
    }
  }
  // UV de la cara trasera: la placa extruida no trae UV útiles, así que se usa un plano encima.
  const fondo = malla(placa, M.negro); fondo.position.set(-1.968, 0.33, 0); g.add(fondo);
  const cara = new THREE.PlaneGeometry(0.52, 0.11); cara.rotateY(-Math.PI / 2);
  const o = malla(cara, mat, 'placa'); o.position.set(-1.9755, 0.33, 0); g.add(o);
  return g;
}

// ---------------------------------------------------------------- faros
/**
 * Los faros redondos. En la malla son un cilindro de 12 caras con la tapa
 * plana; aquí se pone dentro la parábola cromada, la lámpara y la lente. El
 * centro y el radio salen de esa pieza del STL ya transformada (la elipse es
 * por la escala vertical de 0,907).
 */
function faros(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'faros';
  for (const s of [1, -1]) {
    const f = new THREE.Group(); f.position.set(-0.018, 0.758, s * 0.3065); f.scale.set(1, 0.905, 1);
    const parabola = new THREE.LatheGeometry([new THREE.Vector2(0.006, -0.034), new THREE.Vector2(0.022, -0.027), new THREE.Vector2(0.038, -0.015), new THREE.Vector2(0.05, -0.004), new THREE.Vector2(0.054, 0)], 40);
    parabola.rotateZ(-Math.PI / 2); f.add(malla(parabola, M.reflector, 'parabola'));
    const lampara = new THREE.SphereGeometry(0.011, 14, 10); lampara.translate(-0.018, 0, 0); f.add(malla(lampara, M.luzBlanca, 'lampara'));
    const tapa = new THREE.CylinderGeometry(0.016, 0.016, 0.006, 20); tapa.rotateZ(Math.PI / 2); tapa.translate(-0.006, 0, 0); f.add(malla(tapa, M.reflector));
    const lente = new THREE.SphereGeometry(0.16, 40, 8, 0, Math.PI * 2, 0, 0.35); lente.rotateZ(-Math.PI / 2); lente.translate(-0.152, 0, 0); f.add(malla(lente, M.faroLente, 'lente'));
    const aro = new THREE.TorusGeometry(0.0545, 0.0035, 8, 48); aro.rotateY(Math.PI / 2); aro.translate(0.001, 0, 0); f.add(malla(aro, M.cromo, 'aro-faro'));
    g.add(f);
  }
  return g;
}

// ---------------------------------------------------------------- conjunto
function construir(): THREE.Group {
  const M = materiales();
  const g = new THREE.Group(); g.name = 'twizy';
  const ruedas: [number, number, boolean][] = [[0, R_DEL, true], [-BATALLA, R_TRAS, false]];
  for (const [x, R, del] of ruedas) for (const s of [1, -1]) {
    const via = (del ? VIA_DEL : VIA_TRAS) / 2;
    const e = esquina(del, M); e.position.set(x, R, s * via); e.scale.z = s; g.add(e);
  }
  g.add(faros(M));
  g.add(matricula(M)); // en la parte baja de la trasera, enrasada con la malla (x = −1,965)
  // La carrocería llega cuando termina la descarga (~395 KB, una vez por página).
  // Si no llega, el coche se queda en ruedas y el error sale en la consola:
  // un Twizy sin cuerpo se ve roto, que es justo lo que tiene que parecer.
  const cuerpo = new THREE.Group(); cuerpo.name = 'carroceria'; g.add(cuerpo);
  cargarMalla().then(partes => {
    for (const p of partes) cuerpo.add(malla(p.geo, M[p.m] ?? M.plastico, p.m));
  }).catch(e => console.error('[garaje] no se pudo cargar la carrocería del Twizy:', e));
  return g;
}

/**
 * Silueta del coche para el túnel de viento: [x, suelo de la carrocería,
 * techo, media anchura] cada 5 cm, sacada de la malla proyectada (sin
 * retrovisores ni ruedas). Es la que usa el túnel para calcular el aire alrededor del coche.
 */
const ENVOLVENTE: [number, number, number, number][] = [
  [0.3, 0.23, 0.36, 0.18], [0.25, 0.12, 0.6, 0.28], [0.2, 0.12, 0.63, 0.46], [0.15, 0.12, 0.63, 0.46], [0.1, 0.13, 0.65, 0.46], [0.05, 0.13, 0.84, 0.47],
  [0.0, 0.14, 0.89, 0.5], [-0.05, 0.15, 0.92, 0.5], [-0.1, 0.15, 0.94, 0.51], [-0.15, 0.16, 0.96, 0.52], [-0.2, 0.16, 1.0, 0.49], [-0.25, 0.16, 1.04, 0.5],
  [-0.3, 0.16, 1.08, 0.5], [-0.35, 0.16, 1.11, 0.5], [-0.4, 0.17, 1.14, 0.5], [-0.45, 0.17, 1.16, 0.5], [-0.5, 0.17, 1.17, 0.49], [-0.55, 0.17, 1.19, 0.51],
  [-0.6, 0.17, 1.22, 0.51], [-0.65, 0.17, 1.24, 0.51], [-0.7, 0.17, 1.26, 0.51], [-0.75, 0.17, 1.28, 0.51], [-0.8, 0.17, 1.32, 0.5], [-0.85, 0.17, 1.34, 0.5],
  [-0.9, 0.17, 1.34, 0.5], [-0.95, 0.17, 1.36, 0.5], [-1.0, 0.17, 1.37, 0.49], [-1.05, 0.18, 1.38, 0.49], [-1.1, 0.18, 1.4, 0.48], [-1.15, 0.18, 1.41, 0.48],
  [-1.2, 0.18, 1.42, 0.47], [-1.25, 0.18, 1.42, 0.47], [-1.3, 0.18, 1.43, 0.47], [-1.35, 0.18, 1.44, 0.46], [-1.4, 0.18, 1.44, 0.46], [-1.45, 0.18, 1.44, 0.46],
  [-1.5, 0.17, 1.45, 0.46], [-1.55, 0.16, 1.45, 0.46], [-1.6, 0.15, 1.45, 0.46], [-1.65, 0.14, 1.45, 0.46], [-1.7, 0.13, 1.45, 0.46], [-1.75, 0.13, 1.45, 0.46],
  [-1.8, 0.13, 1.45, 0.46], [-1.85, 0.13, 1.44, 0.46], [-1.9, 0.15, 1.44, 0.45], [-1.95, 0.18, 1.34, 0.45], [-2.0, 0.54, 1.06, 0.41],
];

export const VEHICULO: VehiculoGaraje = {
  id: 'twizy', nombre: 'Renault Twizy',
  largo: 2.338, ancho: 1.237, alto: 1.454, batalla: BATALLA, viaDel: VIA_DEL, viaTras: VIA_TRAS,
  fuente: 'Renault, ficha técnica Twizy 80 (2012): largo 2 338 mm, ancho 1 237 mm (1 381 con retrovisores), alto 1 454 mm, batalla 1 686 mm, vías 1 094/1 080 mm, voladizos 313/339 mm; malla «SD Twizy» de StreetDrone (Apache 2.0)',
  // Cd 0,64: auto-data.net (ficha Twizy ZE 6.1 kWh). El área frontal no la da
  // Renault: 1,45 m² es la proyección de esta malla con ruedas y retrovisores.
  aero: { cd: 0.64, area: 1.45, masaVacio: 474, plazas: 2, vmax: 80, fuente: 'Cd 0,64, 474 kg en vacío y 80 km/h de velocidad máxima: auto-data.net (ficha Twizy ZE). Área frontal 1,45 m², medida sobre la malla (con retrovisores)' },
  envolvente: ENVOLVENTE,
  construir,
};
