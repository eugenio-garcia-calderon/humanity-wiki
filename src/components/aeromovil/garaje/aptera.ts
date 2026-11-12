import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';
import { E, areaFrontal, envolventeDe, puntoSeccion, semiAncho, semiAnchoEn, type Est } from './forma';
import { barrido, cintaPiel, enPiel, espejo, estacion, finas, normalSeccion, parcheM, piel, thetaY, type Rango } from './apteraPiel';
import { APLASTADO, cabina, camaraLateral, geometriasRueda, limpia, malla, materiales, rueda, type Mats } from './apteraDetalle';

/**
 * Aptera (Launch Edition y vehículos de preserie, 2023–2025), dibujado por código.
 *
 * PUBLICADO (lo único que no es estimación): largo 4 496 mm, ancho 2 225 mm
 * (con los carenados de las ruedas), alto 1 422 mm, batalla 2 743 mm, 998 kg y
 * Cd 0,13 declarado (Wikipedia, ficha del Aptera); bajos a 5″ (127 mm) y llantas
 * de 16″ (FAQ de Aptera).
 *
 * ESTIMADO (no hay planos acotados abiertos): se ha sacado casando fotos y
 * renders de prensa con el modelo. Para cada foto se calcula la cámara (posición,
 * orientación y focal) a partir de puntos conocidos —el apoyo de las tres
 * ruedas, el centro del morro, lo alto del techo—, se dibuja el modelo encima
 * con esa misma cámara y se proyectan sobre él los rasgos de la foto (pilares,
 * esquinas de los cristales, juntas); donde no coinciden, se corrige. Dos fotos
 * buenas (el render de la Launch Edition y un Gamma con teleobjetivo) difieren
 * entre sí unos 10–15 cm a lo largo en la zona de las puertas: el modelo va por
 * el medio. Margen: unos ±3 cm en alturas y anchuras y ±8 cm a lo largo.
 * - Vía delantera 1,95 m y carenados de 0,275 m de ancho (1,95 + 0,275 = 2,225):
 *   en el render frontal de la Launch Edition y en una foto trasera con
 *   teleobjetivo el carenado mide el 14–15 % de la vía.
 * - Voladizos 0,88 m delante y 0,87 m detrás (el trasero sale de restar).
 * - Carrocería de 1,58 m en la cabina; la cola es un ala de 1,26 m en el borde
 *   de salida, a 0,75–0,79 m del suelo (la punta de la cola cae en z ≈ ±0,6 en
 *   las dos fotos buenas; los prototipos de 2020–2021 la tenían más ancha, ~1,5 m).
 * - Quilla de la rueda trasera de 0,37 m de ancho (foto trasera); acaba en un
 *   filo vertical unos 0,25 m por delante de la punta de la cola. La rueda asoma 0,19 m.
 * - Techo más alto en x ≈ −1,47; capó solar a ~19° y parabrisas a ~27°.
 * - Pilar delantero: pie en (x −0,32; y 0,84), arriba en (−1,06; 1,33); la
 *   ventanilla empieza 0,3 m más atrás (el triángulo negro de la puerta) y la
 *   cintura sube de 0,85 a 1,0 m hacia atrás. La puerta acaba en x ≈ −1,62.
 * - Carenados de 0,98 m de largo arriba y 1,07 m abajo, 0,71 m de alto, de
 *   perfil en «D»: delante redondos y muy inclinados, detrás un canto recto
 *   inclinado. Tira ámbar en el borde de ataque y faldones de fieltro abajo.
 * - Colores de la Launch Edition: plata; la parte baja del morro y la quilla
 *   en grafito; capó, parabrisas, techo y portón, la banda negra con células
 *   en diagonal (como en las fotos de cerca).
 * - Morro (2026-11-12, Eugenio: «el morro está deformado»): una bala baja y
 *   ancha, no un hocico alto y estrecho. En planta, una U amplia (medio ancho
 *   0,40 m a 6 cm de la punta, 0,65 m a la altura de los carenados, como en la
 *   vista cenital); de lado, la punta redondeada a 0,53 m. Cada sección es más
 *   ancha donde va la tira de luz, que corre por ese borde de la punta hasta
 *   delante de los carenados, con el capó abombado encima y la barbilla oscura
 *   metida debajo (render de la Launch Edition de frente, foto en carretera del
 *   coche de 2024).
 * - Cúpula (misma fecha: «la parte de arriba de la cúpula está deformada»): el
 *   techo es plano de lado a lado y los costados casi verticales hasta la
 *   cintura. En la foto trasera con teleobjetivo la silueta mide 0,94 m de ancho
 *   5 cm por debajo del techo y 1,30 m 14 cm por debajo; el modelo anterior,
 *   un huevo, medía 0,64 y 0,94. La luneta del portón es grande, como en esa foto.
 * - Puertas en mariposa y portón: ver «puertas y portón», más abajo.
 * Cámaras resueltas (2026-11-12) sobre el render de la Launch Edition en 3/4, la
 * foto en carretera de 2024, la foto trasera con teleobjetivo y una lateral en
 * la nieve; con cada una, el modelo dibujado al lado de la foto con la misma
 * cámara, y en la trasera el ancho de la silueta fila a fila.
 * Referencias (solo para medir, ninguna copiada): render de la Launch Edition
 * de enero de 2023 (3/4 delantero y frontal con puertas abiertas), render de la
 * Union Edition (2024), fotos de un prototipo Gamma en carretera (3/4 con
 * teleobjetivo), de un Gamma en la nieve (lateral), de un prototipo por detrás
 * (teleobjetivo), una vista cenital de un prototipo de 2021 y un detalle de las
 * células solares; todas de prensa de Aptera.
 *
 * El cuerpo son estaciones (`forma.ts`) con secciones superelípticas; de ellas
 * salen la malla, la silueta del túnel y el área frontal. Cristales, paneles
 * solares, luces y la banda negra son parches pegados a la piel entre curvas
 * (`apteraPiel.ts`), y la piel tiene agujeros detrás del cristal claro para que
 * se vea la cabina. Materiales, ruedas y cabina, en `apteraDetalle.ts`. Sin
 * logotipos ni letras: el garaje compara formas, no marcas.
 *
 * Ejes del garaje: X hacia delante, Y arriba, Z lateral (+Z es la derecha del
 * coche). Eje delantero en x = 0, rueda trasera en x = −2,743, suelo en y = 0. Metros.
 */

const LARGO = 4.496, BATALLA = 2.743;
const VOLADIZO = 0.88; // delantero, estimado; el trasero sale de restar: 4,496 − 2,743 − 0,88 = 0,873
const COLA = VOLADIZO - LARGO; // x de la punta de la cola: −3,616
const VIA = 1.95, ANCHO_POD = 0.275; // estimados; VIA + ANCHO_POD = 2,225, el ancho publicado
const R = 0.295, ANCHO_RUEDA = 0.165; // radio del neumático (llanta de 16″) y ancho, estimados

// ---------------------------------------------------------------- forma
/**
 * El cuerpo, de la punta del morro al borde de salida de la cola: morro bajo y
 * ancho (una U en planta), capó casi plano, cabina ancha abajo y estrecha
 * arriba, y detrás la cola que se aplana en un ala ancha y fina: hacia la punta
 * las secciones son una lente (exponente bajo), con el canto de los costados
 * vivo y el lomo abombado. La quilla de la rueda trasera va aparte.
 */
export const CUERPO: Est[] = [
  // the nose: a wide, low bullet. In plan a broad U (half-width 0.40 m 6 cm behind the tip, 0.65 m at
  // x = 0.45); each section is widest high up, where the light bar runs (the leading edge, 0.53 m at the
  // tip rising to 0.59 m at its rear end), with the hood crowned above it and the dark chin tucked under
  // it. Fitted section by section to those targets (wb/wm/wt/n), so the widest line is where the light is.
  E(0.880, 0.515, 0.540, 0.010, 0.012, 0.014, 2.0),
  E(0.875, 0.478, 0.560, 0.225, 0.168, 0.283, 1.70),
  E(0.865, 0.445, 0.574, 0.306, 0.248, 0.424, 1.70),
  E(0.850, 0.410, 0.588, 0.382, 0.311, 0.561, 1.70),
  E(0.820, 0.365, 0.604, 0.431, 0.377, 0.687, 1.79),
  E(0.780, 0.328, 0.620, 0.453, 0.432, 0.761, 1.88),
  E(0.720, 0.292, 0.640, 0.473, 0.486, 0.840, 1.96),
  E(0.650, 0.265, 0.660, 0.481, 0.521, 0.893, 2.02),
  E(0.550, 0.238, 0.690, 0.518, 0.559, 0.960, 2.01),
  E(0.450, 0.214, 0.720, 0.531, 0.584, 1.003, 2.03),
  E(0.300, 0.186, 0.763, 0.576, 0.615, 1.053, 1.97),
  E(0.150, 0.165, 0.806, 0.592, 0.630, 1.076, 1.96),
  E(0.000, 0.150, 0.852, 0.610, 0.644, 1.096, 1.95),
  // windshield and cabin: broad all the way up, the roof flat across (the rear telephoto photo: 0.47 m
  // half-width only 5 cm under the roof, 0.65 m 14 cm under it), the sides almost vertical to the beltline
  E(-0.280, 0.134, 1.000, 0.926, 0.742, 0.956, 2.0),
  E(-0.570, 0.128, 1.165, 0.879, 0.763, 0.946, 2.37),
  E(-0.990, 0.127, 1.355, 0.80, 0.785, 0.86, 2.5),
  E(-1.470, 0.127, 1.422, 0.848, 0.787, 0.897, 2.535),
  E(-1.900, 0.140, 1.375, 0.74, 0.777, 0.88, 2.55),
  // the tail: the underside rises and tucks in, the top stays broad (the hatch) and flattens into the wing
  E(-2.300, 0.250, 1.255, 0.46, 0.745, 0.80, 2.7),
  E(-2.700, 0.420, 1.125, 0.28, 0.71, 0.72, 2.8),
  E(-3.100, 0.560, 0.950, 0.25, 0.68, 0.64, 2.75),
  E(-3.400, 0.660, 0.850, 0.27, 0.665, 0.60, 2.6),
  E(-3.570, 0.715, 0.805, 0.34, 0.645, 0.58, 2.45),
  E(COLA, 0.748, 0.790, 0.45, 0.632, 0.56, 2.35),
];

/**
 * La quilla que carena la rueda trasera: nace bajo la cabina, envuelve la
 * rueda con los costados casi verticales y se cierra en un filo vertical bajo
 * la cola, unos 0,25 m antes de la punta. Por arriba queda dentro del cuerpo.
 */
const QUILLA: Est[] = [
  E(-1.75, 0.140, 0.40, 0.33, 0.40, 0.37, 2.6),
  E(-2.10, 0.150, 0.55, 0.25, 0.27, 0.26, 2.8),
  E(-2.45, 0.168, 0.66, 0.19, 0.20, 0.20, 3.2),
  E(-BATALLA, 0.188, 0.72, 0.175, 0.185, 0.18, 3.6),
  E(-3.02, 0.218, 0.75, 0.14, 0.15, 0.145, 3.4),
  E(-3.24, 0.255, 0.77, 0.075, 0.08, 0.075, 3.0),
  E(-3.35, 0.285, 0.775, 0.02, 0.022, 0.02, 2.6),
  E(-3.37, 0.298, 0.775, 0.004, 0.005, 0.004, 2.4),
];

/**
 * Carenado de una rueda delantera, centrado en su eje (x relativa al eje,
 * z = 0, +z hacia fuera): de lado una «D» con el frente redondo; detrás el
 * canto se inclina (abajo llega más atrás que arriba, ver `cizalla`).
 */
export const CARENADO: Est[] = [
  E(0.505, 0.215, 0.36, 0.010, 0.012, 0.010, 2.2),
  E(0.490, 0.140, 0.45, 0.055, 0.065, 0.055, 2.4),
  E(0.455, 0.105, 0.53, 0.090, 0.100, 0.085, 2.7),
  E(0.400, 0.092, 0.60, 0.115, 0.123, 0.104, 3.0),
  E(0.320, 0.088, 0.645, 0.127, 0.133, 0.112, 3.3),
  E(0.200, 0.086, 0.686, 0.132, 0.1375, 0.116, 3.6),
  E(0.050, 0.086, 0.708, 0.133, 0.1375, 0.118, 3.8),
  E(-0.080, 0.086, 0.712, 0.133, 0.1375, 0.118, 3.8),
  E(-0.200, 0.088, 0.703, 0.132, 0.1365, 0.117, 3.8),
  E(-0.320, 0.092, 0.682, 0.129, 0.133, 0.113, 3.6),
  E(-0.400, 0.096, 0.652, 0.120, 0.124, 0.105, 3.2),
  E(-0.445, 0.100, 0.625, 0.090, 0.094, 0.080, 2.9),
  E(-0.468, 0.104, 0.600, 0.035, 0.037, 0.030, 2.5),
  E(-0.475, 0.106, 0.585, 0.004, 0.005, 0.004, 2.2),
];
/** Inclina el canto de detrás del carenado: arriba acaba en x ≈ −0,42 y abajo en x ≈ −0,57. */
function cizalla(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), s = Math.min(1, Math.max(0, (-0.25 - x) / 0.25)), k = s * s * (3 - 2 * s);
    p.setX(i, x + k * (p.getY(i) - 0.40) * 0.33);
  }
  p.needsUpdate = true; g.computeVertexNormals();
  return g;
}

/** Brazos de cada rueda delantera (lado +z): cuerda, grosor, altura, de z0 (cuerpo) a z1 (carenado). */
const POD_DENTRO = VIA / 2 - ANCHO_POD / 2 + 0.01;
const BRAZO = { x: 0.02, cuerda: 0.13, grueso: 0.032, y: 0.48, z0: 0.6, z1: POD_DENTRO };
const BIELA = { x: -0.02, cuerda: 0.16, grueso: 0.026, y: 0.25, z0: 0.48, z1: POD_DENTRO };

// ---------------------------------------------------------------- dibujo de la piel
const GRADO = Math.PI / 180;
const lim = (v: number) => Math.min(1, Math.max(0, v));
const suave = (v: number) => { const t = lim(v); return t * t * (3 - 2 * t); };
/** Interpola en una tabla [x, valor] con x decreciente. */
function tabla(p: [number, number][], x: number): number {
  if (x >= p[0][0]) return p[0][1];
  for (let i = 0; i < p.length - 1; i++) if (x >= p[i + 1][0]) { const t = (p[i][0] - x) / (p[i][0] - p[i + 1][0]); return p[i][1] + (p[i + 1][1] - p[i][1]) * t; }
  return p[p.length - 1][1];
}

/**
 * La tira de luz del morro: altura de su eje y media altura, de la punta
 * (donde cruza el morro de lado a lado) hacia atrás por cada costado hasta
 * x = 0,50, donde acaba en punta.
 */
const LUZ_Y: [number, number][] = [[0.880, 0.529], [0.860, 0.531], [0.800, 0.537], [0.700, 0.552], [0.600, 0.574], [0.550, 0.592], [0.500, 0.612], [0.420, 0.648]];
const LUZ_H: [number, number][] = [[0.880, 0.012], [0.800, 0.015], [0.650, 0.019], [0.520, 0.019], [0.420, 0.0]];
const X_LUZ = 0.42;
/**
 * Borde de abajo de la banda negra, visto de lado: encima de la tira de luz,
 * sube por el costado del capó hasta el pie del pilar delantero (x = −0,32) y
 * sigue por debajo de la ventanilla, subiendo hacia atrás (la cintura sube unos
 * 15 cm de delante a atrás de la puerta: medido en el render de la Launch
 * Edition y en la foto del Gamma).
 */
const BORDE_PUNTOS: [number, number][] = [[X_LUZ, 0.655], [0.30, 0.668], [0.15, 0.692], [0.0, 0.722], [-0.15, 0.775], [-0.32, 0.838], [-0.65, 0.848], [-1.0, 0.893], [-1.3, 0.938], [-1.6, 0.982], [-1.9, 1.012], [-2.2, 1.05]];
const BORDE = (x: number) => x > X_LUZ ? tabla(LUZ_Y, x) + tabla(LUZ_H, x) + 0.007 : tabla(BORDE_PUNTOS, x);
/** Borde del parabrisas en el costado, visto de lado: del pie del pilar (−0,32; 0,84) al techo (−1,06; 1,33). */
const PILAR = (x: number) => 0.84 + (1.33 - 0.84) * lim((-0.32 - x) / 0.74);
/** Borde de delante de la ventanilla: de (−0,65; 0,855) a (−1,09; 1,245). Entre los dos, el pilar negro. */
const PILAR_V = (x: number) => 0.855 + (1.245 - 0.855) * lim((-0.65 - x) / 0.44);
const X_PARABRISAS = -0.13, X_TECHO = -1.04; // arranque del parabrisas en el centro y su borde de arriba
const TECHO = 60 * GRADO; // borde del techo solar: de 60° a 120°
const X_FIN_BANDA = -3.30;

/** θ un poco más adentro (d metros medidos sobre la piel) desde θ, hacia `dir`. */
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
/** Esquinas redondeadas: cuánto se cierra un rango cerca de un extremo en x (0 nada, 1 del todo). */
const esquina = (x: number, xFin: number, radio: number, haciaAtras: boolean) => {
  const q = lim(haciaAtras ? (xFin + radio - x) / radio : (x - (xFin - radio)) / radio);
  return 1 - Math.sqrt(1 - q * q);
};
const cerrar = (r: Rango, k: number): Rango | null => { const m = (r[0] + r[1]) / 2, a = r[0] + (m - r[0]) * k, b = r[1] - (r[1] - m) * k; return b - a > 1e-4 ? [a, b] : null; };

/** Ángulo del borde de abajo de la banda negra en cada estación (lado +z); la banda va de ahí a su espejo. */
function bordeBanda(e: Est): number | null {
  const x = e.x;
  if (x > -2.2) { const y = BORDE(x); return y >= e.yt - 0.004 ? null : thetaY(e, y); }
  // detrás de las puertas sube hasta la anchura del portón (60°) y acaba redonda
  const a0 = thetaY(e, BORDE(-2.2)), t = suave((-2.2 - x) / 0.5), a = a0 + (60 * GRADO - a0) * t;
  const q = lim((-2.95 - x) / (-2.95 - X_FIN_BANDA));
  return a + (Math.PI / 2 - a) * (1 - Math.sqrt(1 - q * q));
}
const banda = (e: Est): Rango | null => { const a = bordeBanda(e); return a === null || a >= Math.PI / 2 - 1e-3 ? null : [a, Math.PI - a]; };

// Cristales: rango exterior (con la franja negra serigrafiada) y anchura de esa franja.
interface Vidrio { x0: number; x1: number; rango: (e: Est) => Rango | null; franja: number }
const PARABRISAS: Vidrio = {
  x0: X_PARABRISAS, x1: X_TECHO, franja: 0.05,
  rango: e => {
    const y = Math.max(BORDE(e.x), PILAR(e.x));
    if (y >= e.yt - 0.01) return null;
    const a = thetaY(e, y);
    return [a, Math.PI - a];
  },
};
/**
 * Ventanilla de la puerta (lado +z), medida en las mismas fotos: delante el
 * pilar negro, arriba un borde que baja un poco hacia atrás (1,245 → 1,205),
 * detrás un canto inclinado (abajo más adelante que arriba) con la esquina de
 * arriba redondeada, y abajo la cintura.
 */
const VENTANILLA: Vidrio = {
  x0: -0.65, x1: -1.73, franja: 0.032,
  rango: e => {
    const x = e.x;
    let lo = BORDE(x) + 0.012, hi = 1.245 - 0.04 * lim((-1.09 - x) / 0.64);
    if (x > -1.09) hi = Math.min(hi, PILAR_V(x));
    if (x < -1.57) lo = Math.max(lo, 1.0 + 0.205 * lim((-1.57 - x) / 0.16));
    hi -= 0.16 * esquina(x, -1.73, 0.16, true);
    if (hi <= lo + 0.002) return null;
    return [thetaY(e, lo), thetaY(e, hi)];
  },
};
const VENTANILLA_IZQ: Vidrio = { ...VENTANILLA, rango: e => { const r = VENTANILLA.rango(e); return r ? espejo(r) : null; } };
/** θ on the upper half of the section (between 0 and π/2) where the skin is `z` metres off the centre line. */
function thetaZ(e: Est, z: number): number {
  let lo = 0, hi = Math.PI / 2;
  for (let i = 0; i < 28; i++) { const m = (lo + hi) / 2; if (puntoSeccion(e, m)[1] > z) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/**
 * Luneta del portón: grande, casi del ancho del portón, desde justo detrás de
 * la bisagra (1,28 m de alto) hasta 0,92 m (foto trasera con teleobjetivo: el
 * cristal ocupa de z −0,48 a +0,45 y de 0,92 a 1,32 m de alto), con las
 * esquinas redondas.
 */
const X_LUNETA0 = -2.17, X_LUNETA1 = -3.12;
const LUNETA: Vidrio = {
  x0: X_LUNETA0, x1: X_LUNETA1, franja: 0.04,
  rango: e => {
    const b = encoger(e, banda(e), 0.05); if (!b) return null;
    const t = lim((X_LUNETA0 - e.x) / (X_LUNETA0 - X_LUNETA1)), z = 0.47 - 0.07 * t;
    const a = Math.max(b[0], thetaZ(e, z)); if (Math.PI - a <= a) return null;
    return cerrar([a, Math.PI - a], Math.max(esquina(e.x, X_LUNETA0, 0.10, false), esquina(e.x, X_LUNETA1, 0.24, true)));
  },
};
const VIDRIOS = [PARABRISAS, VENTANILLA, VENTANILLA_IZQ, LUNETA];

// ---------------------------------------------------------------- puertas y portón
/**
 * PUERTAS (la de la derecha, +z; la izquierda es su espejo). Cada una es el
 * costado de la cabina con su ventanilla, el triángulo negro de delante y una
 * tira del techo: en las fotos con las puertas abiertas (render de la Launch
 * Edition de frente, Gamma en el desierto) el hueco se mete en el techo y entre
 * las dos puertas solo queda la espina del techo solar. Por abajo llega a la
 * junta de siempre: del pie del pilar baja por detrás del carenado, corre a
 * 0,27 m del suelo y sube por detrás de la ventanilla hasta el techo.
 *
 * Se abren «en mariposa» (así las llaman las pruebas de prensa del Gamma):
 * la bisagra va a lo largo del pilar delantero, del pie (x −0,32, y 0,84) a
 * lo alto (x −1,06, y 1,33), siguiendo la piel; el canto de delante de la
 * puerta gira sobre sí mismo y no barre el parabrisas, y la puerta sube hacia
 * fuera hasta quedar con la punta de atrás arriba, atrás y afuera. Con 110°
 * su largo apunta a (−0,57; 0,72; 0,38), como en la foto del Gamma en el
 * desierto (la puerta cercana sube hacia atrás a unos 50°) y en el render de
 * la Launch Edition de frente (las dos puertas casi de pie, abiertas hacia
 * fuera, enseñando la cara de fuera). Dato estimado: Aptera no publica la
 * bisagra ni el ángulo.
 */
const TH_COSTURA = 57.5 * GRADO; // borde de arriba de la puerta, en el techo (el techo solar empieza en 60°)
/** Borde de abajo de la puerta, visto de lado, de delante a atrás (x decreciente). */
const PUERTA_BAJO: [number, number][] = [[-0.32, 0.838], [-0.40, 0.73], [-0.49, 0.60], [-0.60, 0.46], [-0.72, 0.35], [-0.86, 0.29], [-1.15, 0.27], [-1.42, 0.29], [-1.56, 0.37], [-1.61, 0.50], [-1.635, 0.70], [-1.65, 0.90], [-1.665, 1.02], [-1.72, 1.12], [-1.78, 1.22], [-1.83, 1.31]];
const X_PUERTA0 = -0.32, X_PUERTA1 = -1.84;
/** The hinge line on the skin (right side), along the A-pillar: its foot is the pivot, the axis points up it. */
const BISAGRA_PUERTA = (() => {
  // 17 mm out of the skin: closer in, the door's front edge cuts the A-pillar near the foot when fully open
  const pie = (() => { const e = estacion(CUERPO, -0.325); return enPiel(e, thetaY(e, 0.835), 0.017); })();
  const alto = (() => { const e = estacion(CUERPO, -1.04); return enPiel(e, thetaY(e, 1.31), 0.017); })();
  const eje = alto.clone().sub(pie).normalize();
  return { pie, eje: [eje.x, eje.y, eje.z] as [number, number, number] };
})();
const EJE_PUERTA = BISAGRA_PUERTA.eje;
const ANGULO_PUERTA = 110;
/** θ-range of the right door at a station (null outside it). */
function rangoPuerta(e: Est): Rango | null {
  const x = e.x; if (x > X_PUERTA0 || x < X_PUERTA1) return null;
  const lo = thetaY(e, tabla(PUERTA_BAJO, x));
  let hi = TH_COSTURA;
  if (x > -1.10) hi = Math.min(hi, thetaY(e, PILAR(x)) - 0.006);
  return hi > lo + 1e-3 ? [lo, hi] : null;
}
/**
 * PORTÓN (maletero): toda la banda negra de detrás de la cabina, con la
 * luneta, de x −1,95 (justo detrás de las puertas) a la punta de la banda; la
 * bisagra va de lado a lado en el techo y la cola sube 50°, como el portón del
 * render de 2020 con el portón abierto (con dos amortiguadores). La cola con
 * los pilotos y la quilla se quedan fijas. Estimado: Aptera no publica cotas
 * del portón.
 */
const X_BISAGRA_MAL = -1.95;
const ANGULO_PORTON = 50;
const rangoPorton = (e: Est): Rango | null => e.x > X_BISAGRA_MAL || e.x < X_FIN_BANDA ? null : encoger(e, banda(e), 0.012);
/**
 * ¿El cuadro de la piel con centro (x, θ) cae entero en una puerta (de
 * cualquiera de los dos lados) o en el portón? Lo que se mueve sale de la
 * parte fija con un agujero. Se mira en las cuatro esquinas del cuadro (medio
 * paso `dx`, `dth` a cada lado): así el agujero nunca se sale del borde de la
 * pieza, y lo que la piel fija asoma hacia dentro lo tapa el marco del hueco.
 * Guarda los rangos de cada x (la piel pregunta muchas veces por las mismas).
 */
function movilRapido(dx: number, dth: number) {
  const cache = new Map<number, [Rango | null, Rango | null]>();
  const rangos = (x: number) => {
    let r = cache.get(x);
    if (!r) {
      const e = estacion(CUERPO, x);
      r = [x <= X_PUERTA0 && x >= X_PUERTA1 ? rangoPuerta(e) : null, x <= X_BISAGRA_MAL && x >= X_FIN_BANDA ? rangoPorton(e) : null];
      cache.set(x, r);
    }
    return r;
  };
  const dentro = (x: number, th: number): 0 | 1 | 2 | 3 => {
    const [rp, rm] = rangos(x), t = th > Math.PI * 1.5 ? th - 2 * Math.PI : th;
    if (rp && t > rp[0] && t < rp[1]) return 1;
    if (rp && Math.PI - t > rp[0] && Math.PI - t < rp[1]) return 2;
    return rm && t > rm[0] && t < rm[1] ? 3 : 0;
  };
  return (x: number, th: number): boolean => {
    const k = dentro(x - dx, th - dth);
    return k !== 0 && dentro(x - dx, th + dth) === k && dentro(x + dx, th - dth) === k && dentro(x + dx, th + dth) === k;
  };
}

/**
 * ¿Está (x, θ) en el cristal claro? Ahí la piel se agujerea para ver la
 * cabina. `m` es qué parte de la franja negra se mete el agujero (0,5: hasta
 * su mitad, así el borde escalonado del agujero queda tapado por la franja).
 * Guarda la última x: la piel pregunta N veces por cada fila.
 */
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

/** Color por vértice del cristal: franja negra opaca en el borde, tintado y transparente dentro. */
const colorVidrio = (franja: number) => (_u: number, _v: number, borde: number): [number, number, number, number] => {
  const t = lim((borde - franja) / 0.006);
  return [0.012 + 0.03 * t, 0.014 + 0.045 * t, 0.017 + 0.05 * t, 1 - 0.62 * t];
};

/** x de la cara de delante del morro a la altura y y a la distancia z del centro. */
function frenteMorro(z: number, y: number): number {
  let lo = 0.55, hi = 0.88;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (semiAncho(estacion(CUERPO, m), y) >= Math.abs(z)) lo = m; else hi = m; }
  return lo;
}

// ---------------------------------------------------------------- montaje
function construir(): THREE.Group {
  const M = materiales();
  const g = new THREE.Group(); g.name = 'aptera';
  /** La pieza y su espejo en el lado −z (el espejo va en la escala del objeto, así las caras siguen mirando fuera). */
  const par = (geo: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], nombre: string, sombra = true) => {
    g.add(malla(geo, m, nombre, sombra)); const o = malla(geo, m, nombre, sombra); o.scale.z = -1; g.add(o);
  };

  // --- carrocería: plata, con los bajos oscuros y agujeros detrás del cristal claro y donde van las
  // puertas y el portón (esas piezas se dibujan aparte, cada una colgada de su bisagra)
  // (medio cuadro de la piel: filas de 1,6 cm en esa zona y 136 columnas; la banda negra tiene cuadros más pequeños)
  const claro = claroRapido(0.5), movil = movilRapido(0.008, Math.PI / 136);
  const fuera = (x: number, th: number) => claro(x, th) || movil(x, th);
  const fondo = (th: number) => Math.abs(th - 1.5 * Math.PI) < 0.38;
  // filas cada ~2 cm donde los cristales cortan la piel (así el borde escalonado del agujero cabe bajo la
  // franja negra), más separadas en el morro y la cola; la tapa de delante va en grafito como el morro
  const pasoPiel = (x: number) => x < -0.05 && x > -3.25 ? 0.016 : 0.035;
  const carroceria = piel(CUERPO, { N: 136, paso: pasoPiel, nClases: 3, grupoTapas: [2, 0], clase: (x, th) => fuera(x, th) ? -1 : fondo(th) && x > -2.15 ? 1 : 0 });
  // por dentro, la misma piel en oscuro (el tapizado que se ve por los cristales): un cuarto grupo que
  // repite todos los triángulos con un material de caras traseras. Al ser la misma malla, sus agujeros
  // coinciden con los de fuera y por el borde del cristal no se cuela luz; y en «Superponer», que pone un
  // solo material a la malla, la piel se pinta una vez y no dos
  carroceria.addGroup(0, carroceria.index!.count, 3);
  g.add(malla(carroceria, [M.pintura, M.bajos, M.grafito, M.forro], 'carroceria'));
  g.add(malla(piel(QUILLA, { N: 56, sub: 8 }), M.grafito, 'quilla'));
  g.add(cabina(M), interior(M));

  // --- la banda negra: capó, pilares, marcos, techo y portón (con agujeros en el cristal claro)
  // (its cells are ~2.3 cm along x and up to ~4.7° around: the opening test uses that size, so a cell that crosses
  // the door line stays, under the door, instead of leaving a gap)
  const movilBanda = movilRapido(0.012, 0.025);
  g.add(malla(parcheM(CUERPO, 0.879, X_FIN_BANDA, banda, { nx: 180, nth: 76, delta: 0.002, quitar: (x, th) => claro(x, th) || movilBanda(x, th) }), M.banda, 'banda-negra'));
  // capó solar, 4 cm dentro de la banda, con las esquinas de delante redondas
  const capo = (e: Est) => {
    const r = encoger(e, banda(e), 0.04); if (!r) return null;
    return cerrar(r, Math.max(esquina(e.x, 0.80, 0.16, false), esquina(e.x, X_PARABRISAS + 0.05, 0.03, true)));
  };
  g.add(malla(parcheM(CUERPO, 0.80, X_PARABRISAS + 0.05, capo, { nx: 50, nth: 44, delta: 0.0035 }), M.solar, 'capo-solar'));
  // techo solar: la espina fija del techo, de detrás del parabrisas a la bisagra del portón
  const X_FIN_TECHO = X_BISAGRA_MAL + 0.03;
  const techo = (e: Est) => {
    const r = encoger(e, [TECHO, Math.PI - TECHO], 0.035); if (!r) return null;
    return cerrar(r, Math.max(esquina(e.x, X_TECHO - 0.05, 0.08, false), esquina(e.x, X_FIN_TECHO, 0.06, true)));
  };
  g.add(malla(parcheM(CUERPO, X_TECHO - 0.05, X_FIN_TECHO, techo, { nx: 64, nth: 32, delta: 0.0035 }), M.solar, 'techo-solar'));
  // cristales, con su franja negra (el parabrisas es fijo; la ventanilla va en la puerta y la luneta en el portón)
  const vidrio = (v: Vidrio, delta = 0.005) => malla(parcheM(CUERPO, v.x0, v.x1, v.rango, { nx: 48, nth: 40, delta, bordes: true, color: colorVidrio(v.franja) }), M.cristal, 'cristal', false);
  g.add(vidrio(PARABRISAS));

  // --- puertas: cada una cuelga de un pivote en su bisagra (el visor las gira, ver `pivotes`); la
  // izquierda es la misma pieza en un grupo con la escala z en −1
  {
    const P = BISAGRA_PUERTA.pie;
    const piv = new THREE.Group(); piv.name = 'puerta-d'; piv.position.copy(P);
    // the moving panels stand 4 mm out of the fixed skin, with a polygon offset: the fixed cells that cross the
    // cut stay under them without flickering (a real door stands proud of its frame by about that)
    const pielPuerta = parcheM(CUERPO, X_PUERTA0, X_PUERTA1, rangoPuerta, { nx: 120, nth: 64, delta: 0.004, quitar: claro });
    const bandaPuerta = (e: Est): Rango | null => {
      const r = rangoPuerta(e), b = banda(e); if (!r || !b) return null;
      const a = Math.max(r[0], b[0]); return r[1] > a + 1e-3 ? [a, r[1]] : null;
    };
    piv.add(
      malla(pielPuerta, M.pinturaPieza, 'puerta'), malla(pielPuerta, M.forro, 'puerta-forro'),
      malla(parcheM(CUERPO, X_PUERTA0, X_PUERTA1, bandaPuerta, { nx: 120, nth: 40, delta: 0.0045, quitar: claro }), M.bandaPieza, 'banda-negra'),
      vidrio(VENTANILLA, 0.0065),
      // la junta va en el canto de la puerta: cerrada es la raya entre puerta y carrocería
      malla(cintaPiel(CUERPO, PUERTA_BAJO, 0.0045, { pasos: 110, delta: 0.0055 }), M.junta, 'junta', false),
    );
    {
      const ruta: THREE.Vector3[] = [];
      for (let k = 0; k <= 30; k++) {
        const x = -0.97 + (X_PUERTA1 + 0.012 + 0.97) * k / 30, e = estacion(CUERPO, x);
        if (thetaY(e, PILAR(x)) - 0.006 >= TH_COSTURA - 1e-3) ruta.push(enPiel(e, TH_COSTURA, 0.0055));
      }
      if (ruta.length > 1) piv.add(malla(barrido(ruta, () => [0.0022, 0.0012], { lados: 6 }), M.junta, 'junta', false));
    }
    // la cámara lateral va en la puerta (en las fotos con la puerta abierta sube con ella)
    const eC = estacion(CUERPO, -0.52); piv.add(camaraLateral(M, enPiel(eC, thetaY(eC, 0.885)), 1));
    for (const o of piv.children) o.position.sub(P);
    const izq = new THREE.Group(); izq.name = 'lado-izquierdo'; izq.scale.z = -1;
    const pivI = piv.clone(); pivI.name = 'puerta-i'; izq.add(pivI);
    g.add(piv, izq);
  }
  // --- portón: la banda negra de detrás de la cabina con la luneta, colgada de la bisagra del techo
  {
    const H = new THREE.Vector3(X_BISAGRA_MAL, estacion(CUERPO, X_BISAGRA_MAL).yt - 0.012, 0);
    const piv = new THREE.Group(); piv.name = 'porton'; piv.position.copy(H);
    const concha = parcheM(CUERPO, X_BISAGRA_MAL, X_FIN_BANDA, rangoPorton, { nx: 110, nth: 64, delta: 0.0045, quitar: claro });
    piv.add(malla(concha, M.bandaPieza, 'banda-negra'), malla(concha, M.forro, 'porton-forro'), vidrio(LUNETA, 0.0065));
    for (const o of piv.children) o.position.sub(H);
    g.add(piv);
  }

  // --- morro: parte baja en grafito, hasta la tira de luz y una junta que baja desde su punta
  // the chin's rear seam leaves the light bar where its side part begins and runs down and back to the
  // rounded rear end of the chin, ahead of the pods (the LE render and the road photo of the 2024 car)
  const COSTURA: [number, number][] = [[0.56, 0.569], [0.53, 0.50], [0.49, 0.42], [0.44, 0.35], [0.39, 0.29], [0.34, 0.24], [0.30, 0.21]];
  const alturaMorro = (x: number) => x > COSTURA[0][0] ? tabla(LUZ_Y, x) - tabla(LUZ_H, x) - 0.005 : x >= 0.30 ? (() => {
    for (let i = 0; i < COSTURA.length - 1; i++) if (x <= COSTURA[i][0] && x >= COSTURA[i + 1][0]) { const t = (COSTURA[i][0] - x) / (COSTURA[i][0] - COSTURA[i + 1][0]); return COSTURA[i][1] + (COSTURA[i + 1][1] - COSTURA[i][1]) * t; }
    return COSTURA[0][1];
  })() : -1;
  const morro = (e: Est): Rango | null => {
    const y = alturaMorro(e.x); if (y <= e.yb + 0.004) return null;
    const a = thetaY(e, Math.min(y, e.yt)); return [Math.PI - a, 2 * Math.PI + a];
  };
  g.add(malla(parcheM(CUERPO, 0.8799, 0.295, morro, { nx: 90, nth: 48, delta: 0.0025, bordes: true }), M.grafitoCalco, 'morro'));
  par(cintaPiel(CUERPO, COSTURA, 0.005, { pasos: 40, delta: 0.003 }), M.junta, 'junta', false);

  // --- tira de luz blanca del morro: carcasa negra, guía de luz y lente
  const tira = (h: number, dy: number) => (e: Est): Rango | null => {
    if (e.x < X_LUZ) return null;
    const c = tabla(LUZ_Y, e.x), hh = tabla(LUZ_H, e.x) * h + dy;
    if (hh <= 0.0005) return null;
    const a = thetaY(e, c - hh), b = thetaY(e, c + hh);
    return b > a ? [a, b] : null;
  };
  for (const [h, dy, delta, mat] of [[1, 0.004, 0.0035, M.banda], [0.62, 0, 0.005, M.luz], [1, 0.002, 0.008, M.lente]] as [number, number, number, THREE.Material][]) {
    const geo = parcheM(CUERPO, 0.8799, X_LUZ, tira(h, dy), { nx: 60, nth: 8, delta });
    par(geo, mat, 'faro', false);
  }
  // el módulo de las luces largas, en el centro del morro: cinco emisores en un marco
  {
    const yc = tabla(LUZ_Y, 0.875), pos: number[] = [], uv: number[] = [], idx: number[] = [];
    const nz = 16, hy = 0.012;
    for (let i = 0; i <= nz; i++) for (let j = 0; j <= 1; j++) {
      const z = -0.085 + 0.17 * i / nz, y = yc + (j ? hy : -hy);
      pos.push(frenteMorro(z, y) + 0.0065, y, z); uv.push(i / nz, j);
    }
    for (let i = 0; i < nz; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    g.add(malla(geo, M.modulo, 'faro', false));
  }
  // un sensor redondo a cada lado del morro
  for (const s of [1, -1]) {
    const e = estacion(CUERPO, 0.62), th = thetaY(e, 0.47), p = enPiel(e, th, 0.002), [ny, nz] = normalSeccion(e, th);
    const sensor = new THREE.CircleGeometry(0.011, 20); const o = malla(sensor, M.negro, 'sensor', false);
    o.position.set(p.x, p.y, s * p.z); o.lookAt(p.x + 0.4, p.y + ny, s * (p.z + nz)); g.add(o);
  }

  // --- pilotos: el borde de salida de la cola (dos tramos) y los cantos de los costados
  {
    const ruta: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) { const x = -3.18 + (COLA + 0.03 + 3.18) * k / 10, e = estacion(CUERPO, x); ruta.push(enPiel(e, 0.02, 0.003)); }
    const ec = estacion(CUERPO, COLA + 0.006), yc = (ec.yb + ec.yt) / 2 + 0.002;
    for (let k = 0; k <= 12; k++) { const z = semiAncho(ec, yc) - 0.01 - (semiAncho(ec, yc) - 0.13) * k / 12; ruta.push(new THREE.Vector3(COLA - 0.003, yc, z)); }
    par(barrido(ruta, () => [0.006, 0.0115], { lados: 10 }), M.piloto, 'piloto', false);
    // la zona de la matrícula entre los dos tramos, oscura
    const placa = new THREE.BoxGeometry(0.008, 0.026, 0.25); placa.translate(COLA - 0.0005, yc, 0);
    g.add(malla(placa, M.banda, 'trasera', false));
  }

  // --- el marco de los huecos, en la parte fija: una banda oscura de 4 cm por dentro del borde de la
  // puerta y del portón. El agujero de la piel va por cuadros y deja el borde escalonado; el marco lo
  // tapa y se lee como la goma del hueco. Va en un grupo por hueco que el visor solo enseña con la pieza
  // abierta (`conHueco` en `pivotes`): cerrado quedaría a milímetros de la pieza y parpadearía.
  {
    const marcoPuertas = new THREE.Group(); marcoPuertas.name = 'marco-puertas'; marcoPuertas.visible = false;
    const marcoPorton = new THREE.Group(); marcoPorton.name = 'marco-porton'; marcoPorton.visible = false;
    g.add(marcoPuertas, marcoPorton);
    const par = (geo: THREE.BufferGeometry, m: THREE.Material, nombre: string, _s: boolean, dest: THREE.Group = marcoPuertas) => {
      dest.add(malla(geo, m, nombre, false)); const o = malla(geo, m, nombre, false); o.scale.z = -1; dest.add(o);
    };
    // 4 cm hacia dentro del borde y 4 mm hacia fuera (por las rendijas)
    const A = 0.044, F = 0.004, corte = PUERTA_BAJO.findIndex(([x]) => x <= -1.665);
    /** The side curve moved `d` metres towards the inside of the door (the door is above and ahead of its lower edge). */
    const haciaDentro = (c: [number, number][], d: number): [number, number][] => c.map(([x, y], i) => {
      const [xa, ya] = c[Math.max(0, i - 1)], [xb, yb] = c[Math.min(c.length - 1, i + 1)];
      const l = Math.hypot(xb - xa, yb - ya) || 1, tx = (xb - xa) / l, ty = (yb - ya) / l;
      return [x + ty * d, y - tx * d];
    });
    // por abajo (zona pintada): bajo la piel de la puerta, a 1 mm
    par(cintaPiel(CUERPO, haciaDentro(PUERTA_BAJO.slice(0, corte + 1), A / 2 - F), A, { pasos: 90, delta: 0.001 }), M.marco, 'marco', false);
    // detrás de la ventanilla, el pilar delantero y la costura del techo (zona negra): entre la banda y la puerta
    par(cintaPiel(CUERPO, haciaDentro(PUERTA_BAJO.slice(corte - 1), A / 2 - F), A, { pasos: 30, delta: 0.0023 }), M.marcoBanda, 'marco', false);
    const pilar: [number, number][] = [];
    for (let k = 0; k <= 12; k++) { const x = X_PUERTA0 - 0.62 * k / 12; pilar.push([x, PILAR(x) - 0.006 - A / 2 + F]); }
    par(cintaPiel(CUERPO, pilar, A, { pasos: 40, delta: 0.0023 }), M.marcoBanda, 'marco', false);
    const costura = (e: Est): Rango | null => {
      if (thetaY(e, PILAR(e.x)) - 0.006 < TH_COSTURA) return null;
      return [adentro(e, TH_COSTURA, A - F, -1), adentro(e, TH_COSTURA, F, 1)];
    };
    par(parcheM(CUERPO, -0.90, X_PUERTA1 - 0.02, costura, { nx: 50, nth: 2, delta: 0.0023 }), M.marcoBanda, 'marco', false);
    // el portón: sus dos cantos y el de delante, junto a la bisagra
    const canto = (e: Est): Rango | null => { const r = rangoPorton(e); return r ? [adentro(e, r[0], F, -1), adentro(e, r[0], A - F, 1)] : null; };
    par(parcheM(CUERPO, X_BISAGRA_MAL, X_FIN_BANDA, canto, { nx: 90, nth: 2, delta: 0.0023 }), M.marcoBanda, 'marco', false, marcoPorton);
    marcoPorton.add(malla(parcheM(CUERPO, X_BISAGRA_MAL + F, X_BISAGRA_MAL - A + F, rangoPorton, { nx: 2, nth: 40, delta: 0.0023 }), M.marcoBanda, 'marco', false));
  }

  // --- el limpiaparabrisas (las cámaras que hacen de retrovisor van en las puertas)
  {
    const x = X_PARABRISAS - 0.035, e = estacion(CUERPO, x), pts: THREE.Vector3[] = [];
    const thZ = (z: number) => { let lo = 0.2, hi = Math.PI - 0.2; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (puntoSeccion(e, m)[1] > z) lo = m; else hi = m; } return (lo + hi) / 2; };
    for (let k = 0; k <= 12; k++) { const z = -0.34 + 0.78 * k / 12; pts.push(enPiel(e, thZ(z), 0.014)); }
    g.add(limpia(M, pts));
  }

  // --- carenados delanteros: fieltros, tira ámbar, brazos y ruedas
  const pod = cizalla(piel(CARENADO, { N: 64, sub: 8 }));
  const fieltro = (x0: number, x1: number, h: (x: number) => number) => cizalla(parcheM(CARENADO, x0, x1, e => {
    const y = h(e.x); if (y <= e.yb + 0.003) return null; const a = thetaY(e, Math.min(y, e.yt - 0.002)); return [Math.PI - a, 2 * Math.PI + a];
  }, { nx: 30, nth: 30, delta: 0.003 }));
  const fDelante = fieltro(0.505, 0.12, x => 0.095 + 0.215 * suave((x - 0.16) / 0.26));
  const fDetras = fieltro(-0.20, -0.475, x => 0.095 + 0.19 * suave((-0.22 - x) / 0.18));
  // la tira ámbar: por el borde de ataque, del hombro a media altura, en la esquina de fuera
  const luzPod: THREE.Vector3[] = [];
  for (let k = 0; k <= 16; k++) {
    const y = 0.675 - 0.29 * k / 16;
    let x = 0.505; for (const e of finas(CARENADO)) if (semiAncho(e, y) > 0.03) { x = e.x; break; }
    const e = estacion(CARENADO, x - 0.03);
    luzPod.push(enPiel(e, thetaY(e, y), 0.002));
  }
  const ambar = cizalla(barrido(luzPod, () => [0.012, 0.0055], { lados: 10, arriba: new THREE.Vector3(1, 0, 1).normalize() }));
  const geoRueda = geometriasRueda(R, ANCHO_RUEDA);
  for (const s of [1, -1] as const) {
    const c = new THREE.Group(); c.position.z = s * VIA / 2; c.scale.z = s; g.add(c);
    c.add(malla(pod, M.pintura, 'carenado'), malla(fDelante, M.fieltro, 'faldon'), malla(fDetras, M.fieltro, 'faldon'), malla(ambar, M.ambar, 'intermitente', false));
    const r = rueda(geoRueda, M, s); r.position.set(0, R - APLASTADO, s * VIA / 2); g.add(r);
    for (const b of [BRAZO, BIELA]) {
      const z0 = Math.max(b.z0, semiAnchoEn(CUERPO, b.x, b.y) - 0.02);
      const ruta = [new THREE.Vector3(b.x, b.y, s * z0), new THREE.Vector3(b.x, b.y + 0.004, s * (z0 + b.z1) / 2), new THREE.Vector3(b.x, b.y, s * b.z1)];
      g.add(malla(barrido(ruta, () => [b.cuerda / 2, b.grueso / 2], { lados: 14 }), M.negro, 'brazo'));
    }
  }
  const rt = rueda(geoRueda, M, 1, true); rt.position.set(-BATALLA, R - APLASTADO, 0); g.add(rt);
  return g;
}

/**
 * Lo que se ve por las puertas y el portón abiertos: el suelo de la cabina, el
 * del maletero (una bandeja plana a 0,78 m, como en la foto del maletero abierto
 * del coche de prensa) y una mampara detrás de los asientos, hasta la altura de
 * los respaldos. Planos oscuros que siguen la piel por dentro, 1,5 cm adentro.
 */
function interior(M: Mats): THREE.Group {
  const g = new THREE.Group(); g.name = 'interior';
  const HOLGURA = 0.015;
  /** A flat floor at height y between x0 and x1 (x decreasing), as wide as the skin there. */
  const suelo = (y: number, x0: number, x1: number, n: number) => {
    const pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, w = Math.max(0, semiAncho(estacion(CUERPO, x), y) - HOLGURA);
      pos.push(x, y, -w, x, y, w);
    }
    for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  /** An upright wall at x, from y0 to y1, as wide as the skin at each height. */
  const mampara = (x: number, y0: number, y1: number, n: number) => {
    const e = estacion(CUERPO, x), pos: number[] = [], idx: number[] = [];
    for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n, w = Math.max(0, semiAncho(e, y) - HOLGURA); pos.push(x, y, -w, x, y, w); }
    for (let i = 0; i < n; i++) { const a = 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  g.add(malla(suelo(0.30, -0.45, X_BISAGRA_MAL - 0.02, 40), M.tapizado, 'suelo'));
  g.add(malla(suelo(0.78, X_BISAGRA_MAL - 0.02, -3.22, 40), M.tapizado, 'suelo'));
  g.add(malla(mampara(X_BISAGRA_MAL - 0.02, 0.30, 1.02, 24), M.tapizado, 'mampara'));
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
  { rect: [-ANCHO_RUEDA / 2, ANCHO_RUEDA / 2, 0, 0.19] },
  { rect: [VIA / 2 - ANCHO_RUEDA / 2, VIA / 2 + ANCHO_RUEDA / 2, 0, 0.09] },
  { rect: [-VIA / 2 - ANCHO_RUEDA / 2, -VIA / 2 + ANCHO_RUEDA / 2, 0, 0.09] },
]);
const AREA_M2 = Math.round(AREA * 100) / 100;

export const VEHICULO: VehiculoGaraje = {
  id: 'aptera', nombre: 'Aptera',
  largo: LARGO, ancho: 2.225, alto: 1.422, batalla: BATALLA, viaDel: VIA, viaTras: 0,
  fuente: 'Wikipedia, ficha del Aptera (Launch Edition): largo 4 496 mm, ancho 2 225 mm, alto 1 422 mm, batalla 2 743 mm, Cd 0,13 declarado; FAQ de Aptera: bajos a 5″, llantas de 16″. Estimado casando fotos y renders de prensa con el modelo (no publicado): vía 1,95 m, carenados de 0,275 m, voladizos 0,88 m delante y 0,87 m detrás, carrocería de 1,58 m, cola en ala de 1,26 m, forma del morro y de la cúpula, ventanillas, pilares, y las bisagras y los ángulos de las puertas (en mariposa, 110°) y del portón (50°)',
  aero: { cd: 0.13, area: AREA_M2, masaVacio: 998, plazas: 2, vmax: 162.5, fuente: `Cd 0,13: lo declara Aptera (enero de 2023, Wikipedia), sin ensayo publicado. 998 kg (Launch Edition de 44 kWh, Wikipedia); 162,5 km/h (FAQ de Aptera). Área frontal ${AREA_M2.toLocaleString('es-ES')} m², medida sobre este modelo (cuerpo, quilla, carenados, brazos y lo que asoma de las ruedas), cuyas cotas no publicadas son estimadas` },
  envolvente: envolvente(),
  seccion: 2.5,
  construir,
  pivotes: [
    { nombre: 'puerta-d', tipo: 'puerta', eje: EJE_PUERTA, angulo: ANGULO_PUERTA, conHueco: 'marco-puertas' },
    // la izquierda está en un grupo con la escala z en −1: el mismo giro, visto en espejo
    { nombre: 'puerta-i', tipo: 'puerta', eje: EJE_PUERTA, angulo: ANGULO_PUERTA, conHueco: 'marco-puertas' },
    { nombre: 'porton', tipo: 'maletero', eje: [0, 0, -1], angulo: ANGULO_PORTON, conHueco: 'marco-porton' },
  ],
};
