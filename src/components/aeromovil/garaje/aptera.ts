import * as THREE from 'three';
import type { VehiculoGaraje } from './tipos';
import { E, areaFrontal, envolventeDe, puntoSeccion, semiAncho, semiAnchoEn, type Est } from './forma';
import { barrido, cintaPiel, enPiel, espejo, estacion, finas, normalSeccion, parcheM, piel, thetaY, type Rango } from './apteraPiel';
import { APLASTADO, cabina, camaraLateral, geometriasRueda, limpia, malla, materiales, rueda } from './apteraDetalle';

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
 * - Carrocería de 1,57 m en la cabina; la cola es un ala de 1,26 m en el borde
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
const CUERPO: Est[] = [
  E(0.880, 0.468, 0.548, 0.006, 0.009, 0.008, 2.2),
  E(0.872, 0.385, 0.574, 0.13, 0.18, 0.16, 2.4),
  E(0.850, 0.325, 0.590, 0.22, 0.29, 0.27, 2.6),
  E(0.810, 0.283, 0.600, 0.29, 0.38, 0.36, 2.7),
  E(0.740, 0.250, 0.611, 0.35, 0.45, 0.43, 2.8),
  E(0.650, 0.226, 0.625, 0.40, 0.51, 0.48, 2.8),
  E(0.450, 0.193, 0.668, 0.46, 0.58, 0.54, 2.8),
  E(0.200, 0.163, 0.748, 0.50, 0.625, 0.56, 2.7),
  E(0.000, 0.147, 0.852, 0.53, 0.655, 0.55, 2.6),
  E(-0.280, 0.134, 1.000, 0.57, 0.70, 0.54, 2.5),
  E(-0.570, 0.128, 1.165, 0.61, 0.745, 0.53, 2.55),
  E(-0.990, 0.127, 1.355, 0.64, 0.785, 0.52, 2.6),
  E(-1.470, 0.127, 1.422, 0.645, 0.79, 0.52, 2.6),
  E(-1.900, 0.140, 1.375, 0.60, 0.78, 0.52, 2.6),
  E(-2.300, 0.250, 1.255, 0.42, 0.765, 0.54, 2.8),
  E(-2.700, 0.420, 1.125, 0.28, 0.735, 0.55, 2.9),
  E(-3.100, 0.560, 0.950, 0.25, 0.695, 0.56, 2.8),
  E(-3.400, 0.660, 0.850, 0.27, 0.665, 0.57, 2.6),
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
const CARENADO: Est[] = [
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
const LUZ_Y: [number, number][] = [[0.880, 0.548], [0.860, 0.556], [0.800, 0.566], [0.700, 0.575], [0.600, 0.584], [0.500, 0.594]];
const LUZ_H: [number, number][] = [[0.880, 0.013], [0.800, 0.016], [0.650, 0.021], [0.580, 0.020], [0.500, 0.0]];
const X_LUZ = 0.50;
/**
 * Borde de abajo de la banda negra, visto de lado: encima de la tira de luz,
 * sube por el costado del capó hasta el pie del pilar delantero (x = −0,32) y
 * sigue por debajo de la ventanilla, subiendo hacia atrás (la cintura sube unos
 * 15 cm de delante a atrás de la puerta: medido en el render de la Launch
 * Edition y en la foto del Gamma).
 */
const BORDE_PUNTOS: [number, number][] = [[0.58, 0.604], [0.45, 0.62], [0.30, 0.645], [0.15, 0.678], [0.0, 0.718], [-0.15, 0.77], [-0.32, 0.838], [-0.65, 0.848], [-1.0, 0.893], [-1.3, 0.938], [-1.6, 0.982], [-1.9, 1.012], [-2.2, 1.05]];
const BORDE = (x: number) => x > 0.58 ? tabla(LUZ_Y, x) + tabla(LUZ_H, x) + 0.007 : tabla(BORDE_PUNTOS, x);
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
/** Luneta en el portón, entre el techo solar y la punta de la banda. */
const LUNETA: Vidrio = {
  x0: -2.52, x1: -3.12, franja: 0.04,
  rango: e => {
    const r = encoger(e, banda(e), 0.05); if (!r) return null;
    return cerrar(r, Math.max(esquina(e.x, -2.52, 0.12, false), esquina(e.x, -3.12, 0.22, true)));
  },
};
const VIDRIOS = [PARABRISAS, VENTANILLA, VENTANILLA_IZQ, LUNETA];

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

  // --- carrocería: plata, con los bajos oscuros y agujeros detrás del cristal claro
  const hueco = claroRapido(0.5);
  const fondo = (th: number) => Math.abs(th - 1.5 * Math.PI) < 0.38;
  // filas cada ~2 cm donde los cristales cortan la piel (así el borde escalonado del agujero cabe bajo la
  // franja negra), más separadas en el morro y la cola; la tapa de delante va en grafito como el morro
  const pasoPiel = (x: number) => x < -0.05 && x > -3.25 ? 0.016 : 0.035;
  const carroceria = piel(CUERPO, { N: 136, paso: pasoPiel, nClases: 3, grupoTapas: [2, 0], clase: (x, th) => hueco(x, th) ? -1 : fondo(th) && x > -2.15 ? 1 : 0 });
  // por dentro, la misma piel en oscuro (el tapizado que se ve por los cristales): un cuarto grupo que
  // repite todos los triángulos con un material de caras traseras. Al ser la misma malla, sus agujeros
  // coinciden con los de fuera y por el borde del cristal no se cuela luz; y en «Superponer», que pone un
  // solo material a la malla, la piel se pinta una vez y no dos
  carroceria.addGroup(0, carroceria.index!.count, 3);
  g.add(malla(carroceria, [M.pintura, M.bajos, M.grafito, M.forro], 'carroceria'));
  g.add(malla(piel(QUILLA, { N: 56, sub: 8 }), M.grafito, 'quilla'));
  g.add(cabina(M));

  // --- la banda negra: capó, pilares, marcos, techo y portón (con agujeros en el cristal claro)
  g.add(malla(parcheM(CUERPO, 0.879, X_FIN_BANDA, banda, { nx: 180, nth: 76, delta: 0.002, quitar: claroRapido(0.5) }), M.banda, 'banda-negra'));
  // capó solar, 4 cm dentro de la banda, con las esquinas de delante redondas
  const capo = (e: Est) => {
    const r = encoger(e, banda(e), 0.04); if (!r) return null;
    return cerrar(r, Math.max(esquina(e.x, 0.80, 0.16, false), esquina(e.x, X_PARABRISAS + 0.05, 0.03, true)));
  };
  g.add(malla(parcheM(CUERPO, 0.80, X_PARABRISAS + 0.05, capo, { nx: 50, nth: 44, delta: 0.0035 }), M.solar, 'capo-solar'));
  // techo solar: de detrás del parabrisas al arranque de la luneta
  const techo = (e: Est) => {
    const r = encoger(e, [TECHO, Math.PI - TECHO], 0.035); if (!r) return null;
    return cerrar(r, Math.max(esquina(e.x, X_TECHO - 0.05, 0.08, false), esquina(e.x, -2.44, 0.1, true)));
  };
  g.add(malla(parcheM(CUERPO, X_TECHO - 0.05, -2.44, techo, { nx: 64, nth: 32, delta: 0.0035 }), M.solar, 'techo-solar'));
  // cristales, con su franja negra
  for (const v of VIDRIOS) {
    g.add(malla(parcheM(CUERPO, v.x0, v.x1, v.rango, { nx: 48, nth: 40, delta: 0.005, bordes: true, color: colorVidrio(v.franja) }), M.cristal, 'cristal', false));
  }

  // --- morro: parte baja en grafito, hasta la tira de luz y una junta que baja desde su punta
  const COSTURA: [number, number][] = [[0.52, 0.586], [0.49, 0.50], [0.45, 0.40], [0.40, 0.30], [0.35, 0.22], [0.31, 0.16], [0.29, 0.13]];
  const alturaMorro = (x: number) => x > X_LUZ + 0.02 ? tabla(LUZ_Y, x) - tabla(LUZ_H, x) - 0.005 : x >= 0.29 ? (() => {
    for (let i = 0; i < COSTURA.length - 1; i++) if (x <= COSTURA[i][0] && x >= COSTURA[i + 1][0]) { const t = (COSTURA[i][0] - x) / (COSTURA[i][0] - COSTURA[i + 1][0]); return COSTURA[i][1] + (COSTURA[i + 1][1] - COSTURA[i][1]) * t; }
    return COSTURA[0][1];
  })() : -1;
  const morro = (e: Est): Rango | null => {
    const y = alturaMorro(e.x); if (y <= e.yb + 0.004) return null;
    const a = thetaY(e, Math.min(y, e.yt)); return [Math.PI - a, 2 * Math.PI + a];
  };
  g.add(malla(parcheM(CUERPO, 0.8799, 0.285, morro, { nx: 50, nth: 48, delta: 0.0025 }), M.grafitoCalco, 'morro'));
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

  // --- juntas de la puerta (se abre hacia arriba y adelante, con la bisagra en el pilar): baja
  // desde el pie del pilar hacia atrás, pasa por detrás del carenado, corre por abajo y sube
  // por detrás de la ventanilla, combándose un poco hacia atrás a media altura
  par(cintaPiel(CUERPO, [[-0.32, 0.838], [-0.40, 0.73], [-0.49, 0.60], [-0.60, 0.46], [-0.72, 0.35], [-0.86, 0.29], [-1.15, 0.27], [-1.42, 0.29], [-1.56, 0.37], [-1.62, 0.52], [-1.64, 0.70], [-1.63, 0.88], [-1.62, 0.99]], 0.0045, { pasos: 90, delta: 0.0015 }), M.junta, 'junta', false);

  // --- cámaras en lugar de retrovisores y el limpiaparabrisas
  for (const s of [1, -1] as const) {
    const e = estacion(CUERPO, -0.52), p = enPiel(e, thetaY(e, 0.885));
    p.z *= s; g.add(camaraLateral(M, p, s));
  }
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
  fuente: 'Wikipedia, ficha del Aptera (Launch Edition): largo 4 496 mm, ancho 2 225 mm, alto 1 422 mm, batalla 2 743 mm, Cd 0,13 declarado; FAQ de Aptera: bajos a 5″, llantas de 16″. Estimado casando fotos y renders de prensa con el modelo (no publicado): vía 1,95 m, carenados de 0,275 m, voladizos 0,88 m delante y 0,87 m detrás, carrocería de 1,57 m, cola en ala de 1,26 m, ventanillas, pilares y puertas',
  aero: { cd: 0.13, area: AREA_M2, masaVacio: 998, plazas: 2, vmax: 162.5, fuente: `Cd 0,13: lo declara Aptera (enero de 2023, Wikipedia), sin ensayo publicado. 998 kg (Launch Edition de 44 kWh, Wikipedia); 162,5 km/h (FAQ de Aptera). Área frontal ${AREA_M2.toLocaleString('es-ES')} m², medida sobre este modelo (cuerpo, quilla, carenados, brazos y lo que asoma de las ruedas), cuyas cotas no publicadas son estimadas` },
  envolvente: envolvente(),
  seccion: 2.5,
  construir,
};
