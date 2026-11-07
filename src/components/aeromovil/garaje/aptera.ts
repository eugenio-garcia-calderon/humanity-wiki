import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';
import { E, areaFrontal, cinta, envolventeDe, loft, muestrear, parche, semiAncho, semiAnchoEn, thetaEnAltura, type Est } from './forma';

/**
 * Aptera (Launch Edition y prototipos de preserie, 2023–2025), dibujado por código.
 *
 * Medidas publicadas: largo 4 496 mm, ancho 2 225 mm (con los carenados de las
 * ruedas), alto 1 422 mm, batalla 2 743 mm (Wikipedia, ficha del Aptera); bajos
 * a 5″ (127 mm) y neumáticos de 16″ (FAQ de Aptera).
 *
 * Lo demás NO se publica: sale de medir a ojo fotos y renders de prensa (no
 * hay planos acotados abiertos), siempre dentro de esas cotas. Es estimación,
 * con un margen de unos ±5 cm en las anchuras y ±10 cm en las posiciones:
 * - vía delantera 1,90 m y carenados de 0,32 m de ancho (1,90 + 0,32 = 2,22);
 * - voladizo delantero 0,88 m y trasero 0,87 m: en la vista cenital de un
 *   prototipo de 2021 el morro asoma unos 0,4 m por delante de los carenados
 *   (en el Paradigm de 2019 no asomaba: el morro se alargó después);
 * - carrocería de 1,57 m en la cabina, 1,32 m a la altura del eje delantero y
 *   un morro en U, de 1,0 m de ancho a 0,25 m de la punta;
 * - techo más alto en x ≈ −1,47 (detrás de las cabezas); capó solar a ~20° y
 *   parabrisas a ~27° que lo continúa sin corte; cintura a 0,88–0,90 m;
 * - la cola es un «ala»: casi tan ancha como la cabina (1,29 m en el borde de
 *   salida, a 0,75–0,79 m del suelo) y fina, con la tira roja de lado a lado y
 *   por los costados; debajo, una quilla estrecha (0,5 m) que carena la rueda
 *   trasera y acaba en un filo vertical bajo el centro de la cola. La rueda
 *   trasera asoma unos 0,19 m por debajo de la quilla;
 * - carenados delanteros de 1,1 m de largo y 0,74 m de alto, con la tira ámbar
 *   en el borde de ataque y faldones oscuros abajo; un brazo carenado y una
 *   biela fina por rueda; las luces largas son la tira blanca del morro.
 * Referencias miradas (solo para medir proporciones, no copiadas): renders de
 * la Launch Edition (2023) y la Union Edition (2024), foto de un prototipo
 * Gamma, foto lateral del Paradigm (2019) y vista cenital de un prototipo de
 * 2021, todas de prensa de Aptera.
 *
 * No hay una malla abierta del Aptera (las que hay son de pago o sin
 * licencia), así que el cuerpo son estaciones (`forma.ts`): de las mismas
 * salen la malla, la silueta del túnel y el área frontal. Sin logotipos ni
 * letras: el garaje compara formas, no marcas.
 *
 * Ejes del garaje: X hacia delante, Y arriba, Z lateral. Eje delantero en
 * x = 0, rueda trasera en x = −2,743, suelo en y = 0. Metros.
 */

const LARGO = 4.496, BATALLA = 2.743;
const VOLADIZO = 0.88; // delantero, estimado; el trasero sale de restar: 4,496 − 2,743 − 0,88 = 0,873
const COLA = VOLADIZO - LARGO; // x de la punta de la cola: −3,616
const VIA = 1.90;
const R = 0.295, ANCHO_RUEDA = 0.17;

// ---------------------------------------------------------------- forma
/**
 * El cuerpo, de la punta del morro al borde de salida de la cola. Delante, un
 * morro bajo y ancho (en planta, una U) con el capó casi plano; la cabina,
 * ancha abajo y estrecha arriba; detrás, la cola se aplana hasta ser un ala
 * ancha y fina. La quilla de la rueda trasera va aparte (`QUILLA`).
 */
const CUERPO: Est[] = [
  E(0.880, 0.430, 0.490, 0.006, 0.009, 0.008, 2.2),
  E(0.872, 0.34, 0.530, 0.13, 0.18, 0.16, 2.4),
  E(0.850, 0.29, 0.548, 0.22, 0.29, 0.27, 2.6),
  E(0.810, 0.255, 0.562, 0.29, 0.38, 0.36, 2.7),
  E(0.740, 0.23, 0.578, 0.35, 0.45, 0.43, 2.8),
  E(0.650, 0.21, 0.600, 0.40, 0.51, 0.48, 2.8),
  E(0.450, 0.185, 0.650, 0.46, 0.58, 0.54, 2.8),
  E(0.200, 0.160, 0.740, 0.50, 0.625, 0.56, 2.7),
  E(0.000, 0.145, 0.850, 0.53, 0.655, 0.55, 2.6),
  E(-0.280, 0.133, 1.000, 0.57, 0.70, 0.54, 2.5),
  E(-0.570, 0.128, 1.165, 0.61, 0.74, 0.53, 2.55),
  E(-0.990, 0.127, 1.355, 0.64, 0.78, 0.52, 2.6),
  E(-1.470, 0.127, 1.422, 0.64, 0.78, 0.52, 2.6),
  // detrás de la cabina el fondo se estrecha en V: de lado la cola es un ala
  // que sale del costado, y por debajo asoma la quilla
  E(-1.900, 0.140, 1.375, 0.60, 0.765, 0.52, 2.6),
  E(-2.300, 0.250, 1.255, 0.42, 0.745, 0.54, 2.7),
  E(-2.700, 0.420, 1.125, 0.26, 0.715, 0.55, 2.8),
  E(-3.100, 0.560, 0.950, 0.24, 0.68, 0.56, 3.0),
  E(-3.400, 0.660, 0.850, 0.26, 0.655, 0.57, 3.2),
  E(-3.570, 0.715, 0.805, 0.34, 0.64, 0.58, 3.4),
  E(COLA, 0.748, 0.790, 0.45, 0.63, 0.56, 3.4),
];

/**
 * La quilla que carena la rueda trasera: nace bajo la cabina, envuelve la
 * rueda con los costados casi verticales y se cierra en un filo vertical bajo
 * el centro de la cola. Por arriba queda escondida dentro del cuerpo.
 */
const QUILLA: Est[] = [
  E(-1.75, 0.140, 0.40, 0.40, 0.48, 0.45, 2.6),
  E(-2.10, 0.150, 0.55, 0.32, 0.36, 0.34, 2.8),
  E(-2.45, 0.168, 0.66, 0.26, 0.28, 0.27, 3.0),
  E(-BATALLA, 0.188, 0.72, 0.235, 0.25, 0.24, 3.2),
  E(-3.05, 0.212, 0.76, 0.19, 0.20, 0.19, 3.2),
  E(-3.35, 0.248, 0.78, 0.105, 0.11, 0.105, 3.0),
  E(-3.55, 0.285, 0.785, 0.035, 0.038, 0.035, 2.8),
  E(COLA + 0.006, 0.30, 0.78, 0.008, 0.009, 0.008, 2.6),
];

/**
 * Carenado de una rueda delantera, centrado en su eje (x relativa al eje,
 * z = 0): de lado, una «D» alta con el frente muy redondo; en planta, una
 * gota que se afila detrás. Por abajo deja ver unos 8 cm de neumático.
 */
const CARENADO: Est[] = [
  E(0.475, 0.28, 0.40, 0.010, 0.014, 0.012, 2.2),
  E(0.455, 0.16, 0.520, 0.065, 0.08, 0.065, 2.4),
  E(0.400, 0.10, 0.605, 0.11, 0.125, 0.10, 2.6),
  E(0.300, 0.08, 0.668, 0.14, 0.152, 0.122, 2.8),
  E(0.150, 0.08, 0.722, 0.153, 0.160, 0.133, 2.9),
  E(-0.080, 0.08, 0.742, 0.153, 0.160, 0.133, 2.9),
  E(-0.300, 0.085, 0.722, 0.145, 0.153, 0.127, 2.9),
  E(-0.450, 0.10, 0.690, 0.122, 0.13, 0.11, 2.8),
  E(-0.560, 0.125, 0.650, 0.08, 0.085, 0.072, 2.6),
  E(-0.630, 0.165, 0.600, 0.02, 0.022, 0.018, 2.4),
];

/** Brazos carenados de cada rueda delantera: cuerda, grosor, altura, de z0 a z1. */
const BRAZO = { x: 0, cuerda: 0.20, grueso: 0.045, y: 0.50, z0: 0.55, z1: VIA / 2 - 0.1 };
const BIELA = { x: 0, cuerda: 0.06, grueso: 0.03, y: 0.27, z0: 0.50, z1: VIA / 2 - 0.1 };

// Cristales, paneles solares y luces: parches pegados a la piel, con bordes
// que siguen curvas (la línea de cintura, el corte del techo) y no la rejilla.
const GRADO = Math.PI / 180;
const lim = (v: number) => Math.min(1, Math.max(0, v));
/**
 * Borde superior del panel de color de la carrocería, visto de lado: arranca
 * en la tira de luz del morro, sube por el costado del capó hasta el pie del
 * parabrisas y sigue por debajo de la ventanilla. Todo lo que queda por
 * encima (capó, parabrisas, ventanillas, techo) es la banda oscura.
 */
const BORDE_PUNTOS: [number, number][] = [[0.8, 0.548], [0.6, 0.566], [0.4, 0.595], [0.2, 0.645], [0, 0.715], [-0.2, 0.785], [-0.4, 0.85], [-0.6, 0.875], [-1.6, 0.9]];
function BORDE(x: number): number {
  const p = BORDE_PUNTOS;
  if (x >= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) if (x >= p[i + 1][0]) return p[i][1] + (p[i + 1][1] - p[i][1]) * (p[i][0] - x) / (p[i][0] - p[i + 1][0]);
  return p[p.length - 1][1];
}
const TECHO = 64 * GRADO;
const PARABRISAS = -0.12, TECHO_DELANTE = -1.0;
/** Ventanilla del lado z > 0: de la cintura al borde del techo, con la esquina de atrás redondeada. */
function ventanilla(e: Est): [number, number] {
  const a = thetaEnAltura(e, BORDE(e.x)), q = lim((-1.45 - e.x) / 0.21);
  return [a + (TECHO - a) * (1 - Math.sqrt(1 - q * q)), TECHO];
}
/** Banda oscura del techo y del portón: algo más ancha detrás de las puertas, se cierra al final con la punta redonda. */
function porton(e: Est): [number, number] {
  const ancho = TECHO + (60 * GRADO - TECHO) * lim((-1.66 - e.x) / 0.3);
  const q = lim((-2.95 - e.x) / 0.38), a = ancho + (Math.PI / 2 - ancho) * (1 - Math.sqrt(1 - q * q));
  return [a, Math.PI - a];
}
const espejo = (r: [number, number]): [number, number] => [Math.PI - r[1], Math.PI - r[0]];
const banda = (e: Est): [number, number] => { const a = thetaEnAltura(e, BORDE(e.x)); return [a, Math.PI - a]; };

/** Borde de ataque de un carenado a la altura y: la x más adelantada de la piel. */
function bordeDeAtaque(es: Est[], y: number): number {
  for (const e of muestrear(es, 24)) if (semiAncho(e, y) > 0.02) return e.x;
  return es[es.length - 1].x;
}

// ---------------------------------------------------------------- materiales
function materiales() {
  const D = THREE.DoubleSide;
  const fis = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial({ side: D, ...p });
  return {
    pintura: fis({ color: 0x8e979f, roughness: 0.3, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.05 }),
    cristal: fis({ color: 0x0a0e13, roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02 }),
    solar: fis({ color: 0x0c1424, roughness: 0.22, metalness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.08, sheen: 0.25, sheenColor: new THREE.Color(0x2a4080) }),
    piloto: fis({ color: 0xd0101c, emissive: 0xb00010, emissiveIntensity: 0.9, roughness: 0.15, clearcoat: 1 }),
    luz: fis({ color: 0xf6f8ff, emissive: 0xdfe8ff, emissiveIntensity: 1.1, roughness: 0.15 }),
    ambar: fis({ color: 0xffb020, emissive: 0xf09000, emissiveIntensity: 0.8, roughness: 0.2 }),
    negro: fis({ color: 0x15171a, roughness: 0.5, metalness: 0.1 }),
    junta: fis({ color: 0x2c3036, roughness: 0.6, metalness: 0.2 }),
    fieltro: fis({ color: 0x3a3d42, roughness: 1, metalness: 0 }),
    goma: fis({ color: 0x141414, roughness: 0.9 }),
    tapa: fis({ color: 0x2a2e33, roughness: 0.35, metalness: 0.6, clearcoat: 0.6 }),
  };
}
type Mats = ReturnType<typeof materiales>;

/**
 * Una celda solar (cuadrada, con las esquinas cortadas) sobre la junta más
 * clara que la separa de las vecinas: se repite por el capó, el techo y el
 * portón. Sin `document` (fuera del navegador) no hay textura y el panel queda liso.
 */
function texturaCeldas(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d'); if (!c) return null;
  c.fillStyle = '#202e48'; c.fillRect(0, 0, 128, 128);
  const a = 5, b = 123, k = 16;
  c.fillStyle = '#0c1526';
  c.beginPath(); c.moveTo(a + k, a); c.lineTo(b - k, a); c.lineTo(b, a + k); c.lineTo(b, b - k); c.lineTo(b - k, b); c.lineTo(a + k, b); c.lineTo(a, b - k); c.lineTo(a, a + k); c.closePath(); c.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

const malla = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre?: string) => {
  const o = new THREE.Mesh(g, m); o.castShadow = true; o.receiveShadow = true; if (nombre) o.name = nombre; return o;
};
/** La misma pieza en el lado z < 0. */
const otroLado = (g: THREE.BufferGeometry) => { const c = g.clone(); c.scale(1, 1, -1); return c; };

/** Rueda de 16″ con tapacubos aerodinámico liso. Eje en Z, centro en el origen. */
function rueda(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'rueda';
  const hw = ANCHO_RUEDA / 2, rL = 0.205;
  const perfil: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + Math.PI * (i / 16); perfil.push(new THREE.Vector2(rL + (R - rL) * (0.55 + 0.45 * Math.cos(a)), hw * Math.sin(a))); }
  const neu = new THREE.LatheGeometry(perfil, 72); neu.rotateX(Math.PI / 2); g.add(malla(neu, M.goma, 'neumatico'));
  const tapa = new THREE.LatheGeometry([new THREE.Vector2(0, hw * 0.95), new THREE.Vector2(rL * 0.6, hw * 0.92), new THREE.Vector2(rL + 0.01, hw * 0.75), new THREE.Vector2(rL + 0.01, -hw * 0.75), new THREE.Vector2(0, -hw * 0.95)], 64);
  tapa.rotateX(Math.PI / 2); g.add(malla(tapa, M.tapa, 'tapacubos'));
  return g;
}

/** Brazo de sección elíptica, de lado a lado (z0 → z1), en el lado z > 0. */
function brazo(b: typeof BRAZO, m: THREE.Material, s: number) {
  const geo = new THREE.CylinderGeometry(1, 1, b.z1 - b.z0, 24);
  geo.rotateX(Math.PI / 2); geo.scale(b.cuerda / 2, b.grueso / 2, 1);
  const o = malla(geo, m, 'brazo'); o.position.set(b.x, b.y, s * (b.z0 + b.z1) / 2); return o;
}

function construir(): THREE.Group {
  const M = materiales();
  const g = new THREE.Group(); g.name = 'aptera';
  const par = (geo: THREE.BufferGeometry, m: THREE.Material, nombre: string) => { g.add(malla(geo, m, nombre)); g.add(malla(otroLado(geo), m, nombre)); };
  g.add(malla(loft(CUERPO, { N: 112, sub: 10 }), M.pintura, 'carroceria'));
  g.add(malla(loft(QUILLA, { N: 64, sub: 8 }), M.pintura, 'quilla'));

  // La banda oscura de arriba: capó solar, parabrisas que lo continúa, ventanillas, techo y portón solares.
  // Las celdas miden unos 15 cm: la textura se repite según lo que mide cada panel.
  const celdas = texturaCeldas();
  const solar = (largo: number, ancho: number): THREE.Material => {
    if (!celdas) return M.solar;
    const t = celdas.clone(); t.repeat.set(Math.round(largo / 0.15), Math.round(ancho / 0.15)); t.needsUpdate = true;
    const m = M.solar.clone(); m.map = t; m.color.set(0xffffff); return m;
  };
  g.add(malla(parche(CUERPO, 0.835, PARABRISAS, banda, { nth: 64 }), solar(0.95, 1.05), 'capo-solar'));
  g.add(malla(parche(CUERPO, PARABRISAS, TECHO_DELANTE, banda, { nth: 64 }), M.cristal, 'parabrisas'));
  g.add(malla(parche(CUERPO, TECHO_DELANTE, -1.66, ventanilla), M.cristal, 'ventanilla'));
  g.add(malla(parche(CUERPO, TECHO_DELANTE, -1.66, e => espejo(ventanilla(e))), M.cristal, 'ventanilla'));
  g.add(malla(parche(CUERPO, TECHO_DELANTE, -3.33, porton, { nx: 100 }), solar(2.35, 0.62), 'techo-solar'));

  // Tira de luz del morro, en el borde del capó, de lado a lado: por encima de
  // la punta (donde el morro es más bajo que la tira) y por los costados.
  const Y0 = 0.506, Y1 = 0.546;
  g.add(malla(parche(CUERPO, 0.879, 0.70, e => e.yt <= Y1 + 0.004 ? [thetaEnAltura(e, Y0), Math.PI - thetaEnAltura(e, Y0)] : null, { nx: 24, nth: 48, delta: 0.004 }), M.luz, 'faro'));
  const faroLado = (e: Est): [number, number] | null => e.yt > Y1 + 0.004 ? [thetaEnAltura(e, Y0), thetaEnAltura(e, Y1)] : null;
  g.add(malla(parche(CUERPO, 0.879, 0.62, faroLado, { nx: 30, nth: 4, delta: 0.004 }), M.luz, 'faro'));
  g.add(malla(parche(CUERPO, 0.879, 0.62, e => { const r = faroLado(e); return r ? espejo(r) : null; }, { nx: 30, nth: 4, delta: 0.004 }), M.luz, 'faro'));

  // Pilotos: el borde de salida de la cola entero y una tira por cada costado.
  g.add(malla(parche(CUERPO, COLA + 0.028, COLA, () => [-Math.PI / 2, 1.5 * Math.PI], { nx: 4, nth: 96, delta: 0.002 }), M.piloto, 'piloto'));
  par(cinta(CUERPO, [[-2.80, 0.81], [-3.20, 0.79], [COLA + 0.02, 0.769]], 0.022), M.piloto, 'piloto');

  // Juntas de la puerta (se abre hacia arriba, con la bisagra delante).
  par(cinta(CUERPO, [[-0.40, 0.872], [-0.37, 0.66], [-0.43, 0.44], [-0.58, 0.31], [-1.05, 0.27], [-1.50, 0.30], [-1.72, 0.44], [-1.82, 0.70], [-1.80, 0.98], [-1.70, 1.25]], 0.008, { pasos: 80, delta: 0.002 }), M.junta, 'junta');

  // Cámaras en lugar de retrovisores, al pie del parabrisas.
  for (const s of [1, -1]) {
    const cam = new THREE.SphereGeometry(1, 20, 12); cam.scale(0.08, 0.028, 0.032);
    const c = malla(cam, M.negro, 'camara'); c.position.set(-0.46, 0.90, s * (semiAnchoEn(CUERPO, -0.46, 0.90) + 0.035)); g.add(c);
  }

  // Carenados delanteros con su tira ámbar en el borde de ataque, los brazos y las ruedas.
  const curvaLuz: [number, number][] = [];
  for (let y = 0.70; y >= 0.29; y -= 0.082) curvaLuz.push([bordeDeAtaque(CARENADO, y) - 0.045, y]);
  const luzPod = cinta(CARENADO, curvaLuz, 0.04, { delta: 0.004 });
  const fieltro = (x0: number, x1: number, h0: number, h1: number) =>
    parche(CARENADO, x0, x1, e => [-Math.PI / 2, thetaEnAltura(e, h0 + (h1 - h0) * lim((x0 - e.x) / (x0 - x1)))], { nx: 24, nth: 16 });
  const fDelante = fieltro(0.475, 0.12, 0.30, 0.085), fDetras = fieltro(-0.63, -0.40, 0.27, 0.09);
  for (const s of [1, -1]) {
    const pod = new THREE.Group(); pod.position.z = s * VIA / 2; g.add(pod);
    pod.add(malla(loft(CARENADO, { N: 64, sub: 8 }), M.pintura, 'carenado'));
    // la luz va en el lado de fuera de cada carenado
    pod.add(malla(s > 0 ? luzPod : otroLado(luzPod), M.ambar, 'intermitente'));
    for (const f of [fDelante, fDetras]) { pod.add(malla(f, M.fieltro, 'faldon')); pod.add(malla(otroLado(f), M.fieltro, 'faldon')); }
    g.add(brazo(BRAZO, M.pintura, s));
    g.add(brazo(BIELA, M.negro, s));
    const r = rueda(M); r.position.set(0, R, s * VIA / 2); g.add(r);
  }
  const rt = rueda(M); rt.position.set(-BATALLA, R, 0); g.add(rt);
  return g;
}

/** Silueta para el túnel: la del cuerpo, con la quilla de la rueda trasera por debajo. */
function envolvente(): [number, number, number, number][] {
  const cuerpo = envolventeDe(CUERPO), quilla = envolventeDe(QUILLA);
  return cuerpo.map(([x, yb, yt, hw]) => {
    let k = 0; while (k < quilla.length - 2 && !((quilla[k][0] - x) * (quilla[k + 1][0] - x) <= 0)) k++;
    const a = quilla[k], b = quilla[k + 1];
    if (!b || (a[0] - x) * (b[0] - x) > 0) return [x, yb, yt, hw];
    const t = b[0] !== a[0] ? (x - a[0]) / (b[0] - a[0]) : 0, yq = a[1] + (b[1] - a[1]) * t;
    return [x, Math.round(Math.min(yb, yq) * 1000) / 1000, yt, hw];
  });
}

/** Área frontal: cuerpo, quilla, dos carenados, brazos y lo que asoma de las ruedas por debajo. */
const AREA = areaFrontal([
  { es: CUERPO, z0: 0 }, { es: QUILLA, z0: 0 },
  { es: CARENADO, z0: VIA / 2 }, { es: CARENADO, z0: -VIA / 2 },
  ...[BRAZO, BIELA].flatMap(b => [
    { rect: [b.z0, b.z1, b.y - b.grueso / 2, b.y + b.grueso / 2] as [number, number, number, number] },
    { rect: [-b.z1, -b.z0, b.y - b.grueso / 2, b.y + b.grueso / 2] as [number, number, number, number] },
  ]),
  { rect: [-ANCHO_RUEDA / 2, ANCHO_RUEDA / 2, 0, 0.13] },
  { rect: [VIA / 2 - ANCHO_RUEDA / 2, VIA / 2 + ANCHO_RUEDA / 2, 0, 0.08] },
  { rect: [-VIA / 2 - ANCHO_RUEDA / 2, -VIA / 2 + ANCHO_RUEDA / 2, 0, 0.08] },
]);
const AREA_M2 = Math.round(AREA * 100) / 100;

export const VEHICULO: VehiculoGaraje = {
  id: 'aptera', nombre: 'Aptera',
  largo: LARGO, ancho: 2.225, alto: 1.422, batalla: BATALLA, viaDel: VIA, viaTras: 0,
  fuente: 'Wikipedia, ficha del Aptera (Launch Edition): largo 4 496 mm, ancho 2 225 mm, alto 1 422 mm, batalla 2 743 mm, Cd 0,13 declarado; FAQ de Aptera: bajos a 5″, neumáticos de 16″. Estimado a partir de fotos y renders de prensa (no publicado): vía 1,90 m, voladizos 0,88 m delante y 0,87 m detrás, carrocería de 1,57 m, cola en ala de 1,29 m',
  aero: { cd: 0.13, area: AREA_M2, masaVacio: 998, plazas: 2, vmax: 162.5, fuente: `Cd 0,13: lo declara Aptera (enero de 2023, Wikipedia), sin ensayo publicado. 998 kg (Launch Edition de 44 kWh, Wikipedia); 162,5 km/h (FAQ de Aptera). Área frontal ${AREA_M2.toLocaleString('es-ES')} m², medida sobre este modelo (cuerpo, quilla, carenados, brazos y lo que asoma de las ruedas), cuyas cotas no publicadas son estimadas` },
  envolvente: envolvente(),
  seccion: 2.5,
  construir,
};
