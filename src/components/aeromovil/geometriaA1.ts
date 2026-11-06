// ============================================================================
// AEROMÓVIL 1 · geometría paramétrica (2026-11-06, Eugenio)
// ============================================================================
// Eugenio: «afina mucho más el modelo del Aeromóvil 1… haz que sea el diseño
// por defecto… que también tenga el corte, los ocupantes, el chasis y todas
// las capas de ruedas, suspensión… incluye las puertas de entrada y los
// paneles solares en la carrocería… el vehículo va sin pedales… la puerta
// del maletero frontal y trasero… las baterías, el motor y la transmisión…
// un 30 % más grande que el original… utiliza el Twizy como referencia para
// el tamaño de ruedas, frenos, suspensión… 140 km/h, 15 kW nominales y 32 kW
// de pico, batería de 27 kWh, 4 kWh a los 100 km a 100 km/h».
//
// La forma sale del SZEmission (SZEnergy Team, Universidad Széchenyi): las
// curvas de abajo se leyeron en sus fotos de perfil, de frente y de 3/4, y
// aquí se escalan a las medidas del diseño. Carrocería baja y ancha de
// secciones superelípticas, y encima una cúpula de cristal aparte que se
// alarga hasta la cola. El Twizy (Renault, 2012) da la clase de las ruedas,
// los frenos y la suspensión: neumáticos 125/80 R13 y 145/80 R13, discos
// ventilados de 214/204 mm, McPherson delante y detrás con barra
// estabilizadora, chasis tubular. Sus medidas: 2338 × 1237 × 1454 mm, batalla
// 1686 mm, vías 1094/1080 mm, 474 kg (batería de 6,1 kWh, 98 kg).
//
// Mismos ejes que el Aeromóvil Gota: x hacia delante con el eje delantero en
// x = 0, y hacia arriba, z lateral (+ izquierda). Metros.
import {
  MATERIALES_CARENADO, MATERIALES_CHASIS, MASAS_FIJAS_A1, NEUMATICOS, RENDIMIENTO_SOLAR, BAJOS_BASE, contornoSeccion, largoTubo, masaFija,
  type Asiento, type Comprobacion, type Parametros, type P3, type PiezasAsiento, type PuertaDef, type PuntosOcupante, type Resultados, type Rueda,
  type Seccion, type Superficie, type Tubo, type ZonaPiel,
} from './geometria';

const spow = (v: number, p: number) => Math.sign(v) * Math.pow(Math.abs(v), p);

/** Interpola suave (Hermite) una lista de puntos [u, valor] con u creciente. */
function suave(pts: [number, number][]) {
  return (u: number) => {
    if (u <= pts[0][0]) return pts[0][1];
    if (u >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
    let i = 0; while (pts[i + 1][0] < u) i++;
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1], h = u1 - u0, t = (u - u0) / h;
    const m = (k: number) => { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)]; return (b[1] - a[1]) / (b[0] - a[0] || 1); };
    const m0 = m(i) * h, m1 = m(i + 1) * h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * m1;
  };
}

// ── La forma del SZEmission, leída en las fotos ──────────────────────────
// u = 0 en el morro y 1 en la cola. Alturas en fracción del alto total del
// original (1,03 m); media anchura en fracción de su semiancho (0,625 m).
// Ronda 1 del bot evaluador (2026-11-06): el morro sube recto a ~35° desde
// la punta (0,44 H) hasta la base del parabrisas (0,63 H en u = 0,10); la
// cubierta queda a 0,63 H y empieza a bajar en u ≈ 0,55; la cola es más fina
// (0,16 H de grosor en u = 0,9); el ancho máximo está en u ≈ 0,36 y la
// planta es más ancha en el morro; la cúpula arranca en u = 0,10, es ancha
// detrás del piloto (2/3 del ancho) y se funde con la cola sin escalón.
const SZ = {
  H: 1.03, W: 1.25, deck: 0.63, fondo: 0.131,
  // Ronda 2 (2026-11-06): el capó sube a ~26° hasta la base del parabrisas en
  // u = 0,19 (0,66 H); el techo de la cúpula baja casi recto desde el pico
  // (u = 0,42) hasta fundirse con el lomo en u ≈ 0,9; la cola acaba en un
  // labio horizontal (ancho en planta, sin altura); el ancho máximo de la
  // sección está a un 40 % de la altura de la carrocería, no a la mitad.
  top: suave([[0, 0.43], [0.05, 0.49], [0.10, 0.55], [0.15, 0.615], [0.19, 0.66], [0.25, 0.65], [0.30, 0.64], [0.46, 0.63], [0.55, 0.63], [0.64, 0.61], [0.72, 0.585], [0.80, 0.54], [0.90, 0.47], [0.96, 0.44], [1, 0.42]]),
  bot: suave([[0, 0.43], [0.02, 0.34], [0.05, 0.248], [0.10, 0.172], [0.18, 0.136], [0.30, 0.131], [0.62, 0.131], [0.70, 0.150], [0.80, 0.215], [0.90, 0.30], [0.96, 0.37], [1, 0.42]]),
  hw: suave([[0, 0.12], [0.03, 0.48], [0.06, 0.64], [0.10, 0.78], [0.15, 0.90], [0.20, 0.96], [0.27, 0.99], [0.36, 1.0], [0.45, 0.98], [0.60, 0.91], [0.68, 0.86], [0.75, 0.80], [0.85, 0.64], [0.90, 0.52], [0.95, 0.42], [1, 0.33]]),
  // La cúpula, entre u = 0,19 y 0,99 del original: una lágrima alta y estrecha con el pico sobre el piloto.
  // Ronda 3: parabrisas más vertical (≈47°) y envolvente, corona alta hasta
  // pasada la mitad del coche (el codo de la bajada en u ≈ 0,58), cola en
  // labio ancho (0,33 del semiancho) y no en punta.
  // Techo plano sobre la cabina y bajada constante hasta la cola, como el Aptera.
  cupTop: suave([[0.19, 0.66], [0.22, 0.78], [0.26, 0.86], [0.30, 0.92], [0.36, 0.985], [0.42, 1.0], [0.60, 1.0], [0.65, 0.99], [0.70, 0.962], [0.75, 0.914], [0.80, 0.85], [0.85, 0.77], [0.90, 0.67], [0.95, 0.56], [1, 0.43]]),
  // La cola de la cúpula se queda ancha hasta el final (corte Kamm, como el Aptera), no en aleta.
  cupHw: suave([[0.19, 0.40], [0.25, 0.44], [0.30, 0.46], [0.45, 0.48], [0.60, 0.46], [0.75, 0.42], [0.90, 0.36], [0.97, 0.32], [1, 0.30]]),
  cupX0: 0.19, cupX1: 0.99, cupW: 0.48,
  // Dónde está el ancho máximo de la sección, en fracción de la altura de la carrocería (0,5 = a media altura).
  ecuador: 0.40,
  // El borde superior de la banda negra de los bajos (fracción del alto total): en V, alto en las puntas y bajo entre ejes.
  banda: suave([[0, 0.40], [0.05, 0.34], [0.12, 0.28], [0.20, 0.25], [0.30, 0.19], [0.70, 0.19], [0.80, 0.24], [0.90, 0.31], [1, 0.38]]),
};

export const TRAVEL_A1 = 0.09;     // recorrido de suspensión que se comprueba (m)
export const GIRO_A1 = 22;         // giro máximo de las ruedas delanteras (°): radio de giro ≈ 4,3 m
export const DISCO_F = 0.214, DISCO_R = 0.204;   // discos de freno (Twizy)

/** Mínimo y máximo de cada deslizador de masa del Aeromóvil 1. */
export const RANGOS_MASA_A1 = {
  extraChasis: [3, 12], mRueda: [5, 12], mSuspension: [16, 40], mMotor: [9, 30], mInversor: [3, 10], mReductora: [6, 18], mFrenos: [1.8, 5],
  mAsiento: [4, 14], mDireccion: [4, 12], espCarenado: [1.0, 3.0], espCristal: [3, 6], mSolarM2: [1.2, 3.5], mVarios: [12, 45],
} as const;

const rotarPunto = (p: P3, a: P3, b: P3, ang: number): P3 => {
  const k = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...k) || 1; k[0] /= L; k[1] /= L; k[2] /= L;
  const v = [p[0] - a[0], p[1] - a[1], p[2] - a[2]], kv = k[0] * v[0] + k[1] * v[1] + k[2] * v[2], c = Math.cos(ang), s = Math.sin(ang);
  const cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return [a[0] + v[0] * c + cr[0] * s + k[0] * kv * (1 - c), a[1] + v[1] * c + cr[1] * s + k[1] * kv * (1 - c), a[2] + v[2] * c + cr[2] * s + k[2] * kv * (1 - c)];
};
/** El signo del ángulo que hace que `prueba` suba al abrirse. */
// (se decide con un giro pequeño: con más de 90° las dos direcciones acaban más arriba y el signo salía mal)
const abrirHaciaArriba = (bisagra: [P3, P3], prueba: P3, grados: number) =>
  rotarPunto(prueba, bisagra[0], bisagra[1], 20 * Math.PI / 180)[1] >= prueba[1] ? grados : -grados;

export function crearModeloA1(P: Parametros) {
  const L = P.L, xn = P.fMorro * L, xt = xn - L, Lf = L;
  const nF = NEUMATICOS[P.neumF], nR = NEUMATICOS[P.neumR];
  const rF = nF.d / 2, rR = nR.d / 2, xR = -P.B;
  const deckY = P.deck * P.H, Hb = deckY - P.clear;
  const dY = P.clear - BAJOS_BASE;
  const yFloor = P.clear + 0.045;            // fondo de la carrocería + suelo del chasis
  const ys = yFloor;                          // altura de los largueros (lo que el Gota llama viga)
  const xPil = -P.xPil, xPas = -P.xPas;
  const uDeX = (x: number) => Math.min(0.999, Math.max(0.001, (xn - x) / L));
  const xDeU = (u: number) => xn - u * L;

  // ── La carrocería: las curvas del SZEmission escaladas a L, W, H y bajos ──
  const yCuerpo = (yn: number) => P.clear + (yn - SZ.fondo) / (SZ.deck - SZ.fondo) * Hb;
  const yCupula = (yn: number) => deckY + (yn - SZ.deck) / (1 - SZ.deck) * (P.H - deckY);
  // Morro y cola: 0,5 es la forma de las fotos; menos afila, más redondea.
  const kMorro = 1.45 - 0.9 * P.morroA1, kCola = 1.45 - 0.9 * P.colaA1;
  const hwN = (u: number) => {
    let h = SZ.hw(u);
    if (u < 0.36) h = Math.pow(h, 1 + (kMorro - 1) * (1 - u / 0.36));
    else if (u > 0.45) h = Math.pow(h, 1 + (kCola - 1) * (u - 0.45) / 0.55);
    return h;
  };
  const frame = (u: number): Seccion => {
    const top = yCuerpo(SZ.top(u)), bot = yCuerpo(SZ.bot(u)), hw = Math.max(0.004, P.W / 2 * hwN(u));
    return { s: hw / (P.W / 2), x: xDeU(u), zc: bot + (top - bot) * SZ.ecuador, top, bot, hw };
  };
  const sec = (f: Seccion, th: number, off = 0): P3 => {
    const c = Math.cos(th), sn = Math.sin(th), up = sn >= 0, n = up ? P.nU : P.nL;
    const ez = spow(c, 2 / n), ey = spow(sn, 2 / n), k = Math.min(1, f.s * 6), o = off * k;
    const y = f.zc + (up ? (f.top - f.zc + o) : (f.zc - f.bot + o)) * ey;
    return [f.x, y, (f.hw + o) * ez];
  };
  // ── La cúpula: media sección superelíptica apoyada en la cubierta ────────
  const uC0 = P.cupX0, uC1 = P.cupX1;
  const uMedido = (u: number) => SZ.cupX0 + (u - uC0) / (uC1 - uC0) * (SZ.cupX1 - SZ.cupX0);
  const hundido = 0.06 * Hb / 0.56;           // cuánto se hunde la base en la carrocería
  // Cabina (2026-11-06, Eugenio, con fotos del VW XL1 y del Aptera): «que sea
  // plano el parabrisas como el XL1 pero más estrecho, ya que solo tiene que
  // albergar al piloto… inspírate en el parabrisas del Aptera en cuanto a la
  // curva que tiene… la unión entre la ventanilla lateral y el parabrisas,
  // como el Aptera o el XL1, que tiene una barra… que el techo sea solar, no
  // transparente, con ventanilla izquierda y derecha y el resto paneles
  // solares… un techito que va bajando poco a poco hasta la cola, plano y
  // lleno de paneles».
  //
  // La cúpula es una sola superficie (u a lo largo, θ alrededor: 0 costado
  // izquierdo, π/2 techo, π costado derecho) con sección en trapecio de
  // esquinas redondeadas: techo plano y costados que caen un poco hacia
  // dentro. De uC0 a uW1 es el parabrisas: sube casi recto con la panza
  // suave del Aptera, un 20 % más estrecho que la cabina. Los montantes van
  // inclinados, de la esquina de abajo del parabrisas (uBase) a su borde de
  // arriba (uW1): a la altura u, el parabrisas ocupa θ > thPilar(u) y la
  // ventanilla θ < thPilar(u). Detrás del montante, hasta el arco principal,
  // las ventanillas (cristal, en las puertas); todo lo demás es panel solar.
  // Ronda 1 del bot de cabina (vs XL1/Aptera): parabrisas más tumbado (cuerda ≈33°,
  // montante ≈35°), cabina más ancha, techo que baja en curva, no en recta.
  const uW1 = Math.min(uC1 - 0.1, uC0 + P.parabrisas);         // borde de arriba del parabrisas (deslizador «Inclinación del parabrisas»)
  const uBase = uC0 + 0.01;                                    // esquina de abajo del montante
  const thVentana = 0.24 * Math.PI;                            // donde el costado se vuelve techo
  const thPilar = (u: number) => Math.min(thVentana, Math.max(0, thVentana * (u - uBase) / (uW1 - uBase)));
  const uPico = Math.max(uW1 + 0.02, 0.42);                     // el punto más alto del techo
  const pesoPlano = (u: number) => {
    if (u <= uW1) return 1;
    const t = Math.min(1, (u - uW1) / 0.10); return 1 - t * t * (3 - 2 * t);
  };
  const frameC = (u: number): Seccion => {
    const um = uMedido(u), deck = yCuerpo(SZ.top(u)), base = deck - hundido;
    // En los últimos 5 cm el techo baja hasta la cubierta: el borde de fuga queda a ras del labio de cola.
    const cierre = Math.min(1, Math.max(0, (uC1 - u) / 0.014));
    let top = Math.max(deck + 0.004, base + (yCupula(SZ.cupTop(um)) - base) * cierre);
    let hw = Math.max(0.004, SZ.cupHw(um) * (SZ.W / 2) * (P.W / SZ.W) * (P.cupW / SZ.cupW));
    const w = pesoPlano(u);
    if (u <= uW1) {
      // De perfil: casi recto de la base al borde de arriba, con la panza suave del Aptera.
      // El parabrisas sale del capó sin cambio de inclinación (2026-11-06,
      // Eugenio: «en la misma línea que el morro, como el Aptera, una curva
      // constante»): cúbica de Hermite que arranca con la pendiente del capó
      // en su base y llega casi horizontal al borde de arriba.
      const deck0 = yCuerpo(SZ.top(uC0)), topW = yCupula(SZ.cupTop(uMedido(uW1))), t = Math.max(0, (u - uC0) / (uW1 - uC0));
      const Lw = uW1 - uC0, m0 = (yCuerpo(SZ.top(uC0)) - yCuerpo(SZ.top(uC0 - 0.02))) / 0.02 * Lw, m1 = 0.15 * (topW - deck0);
      const t2 = t * t, t3 = t2 * t;
      top = Math.max(deck + 0.004, deck0 * (2 * t3 - 3 * t2 + 1) + m0 * (t3 - 2 * t2 + t) + topW * (-2 * t3 + 3 * t2) + m1 * (t3 - t2));
    } else if (u > uPico) {
      // El techo baja desde el pico hasta la cola en una sola curva, sin tramo
      // plano: altura = pico − (pico − cola)·s^techo, con s de 0 a 1. `techo`
      // es el deslizador «Caída del techo»: 1 = recta desde el pico, más = se
      // mantiene alto más tiempo y cae más al final (2026-11-06, Eugenio).
      const sTail = (u - uPico) / (uC1 - uPico), yPico = yCupula(1), yCola = yCupula(SZ.cupTop(SZ.cupX1));
      top = Math.max(deck + 0.004, base + (yPico - Math.pow(sTail, P.techo) * (yPico - yCola) - base) * cierre);
    }
    hw *= 1 - 0.05 * w;
    return { s: 1, x: xDeU(u), zc: base, top, bot: base, hw };
  };
  // Exponente de la sección (techo plano) y cuánto caen hacia dentro los costados (0 = verticales).
  const ncDe = (u: number) => 4.4 + 3.6 * pesoPlano(u);
  const caidaDe = (u: number) => 0.12 + 0.16 * pesoPlano(u);
  const uDeXC = (x: number) => (xn - x) / L;
  const secC = (f: Seccion, th: number, off = 0): P3 => {
    const u = uDeXC(f.x), NC = ncDe(u), k = caidaDe(u);
    const c = Math.cos(th), sn = Math.max(0, Math.sin(th)), yn = Math.pow(sn, 2 / NC);
    return [f.x, f.zc + (f.top - f.zc + off) * yn, (f.hw + off) * (1 - k * yn) * spow(c, 2 / NC)];
  };
  /** Holgura radial (m) de un punto a la piel: la carrocería o, por encima de la cubierta, la cúpula. */
  const gapCuerpo = (x: number, y: number, z: number) => {
    const u = (xn - x) / L;
    if (u <= 0.001 || u >= 0.999) return -1;
    const f = frame(u), above = y >= f.zc, n = above ? P.nU : P.nL, ay = above ? f.top - f.zc : f.zc - f.bot;
    if (f.hw < 1e-4 || ay < 1e-4) return -1;
    const v = Math.pow(Math.abs(z) / f.hw, n) + Math.pow(Math.abs(y - f.zc) / ay, n);
    return Math.hypot(z, y - f.zc) * (1 / Math.pow(v, 1 / n) - 1);
  };
  const gapCupula = (x: number, y: number, z: number) => {
    const u = (xn - x) / L;
    if (u <= uC0 + 0.002 || u >= uC1 - 0.002) return -1;
    const f = frameC(u), ay = f.top - f.zc;
    if (y < f.zc || ay < 0.01) return -1;
    const NC = ncDe(u), yn = Math.min(1, (y - f.zc) / ay), hwY = f.hw * (1 - caidaDe(u) * yn);
    const v = Math.pow(Math.abs(z) / hwY, NC) + Math.pow(yn, NC);
    return Math.hypot(z, y - f.zc) * (1 / Math.pow(v, 1 / NC) - 1);
  };
  const gap = (x: number, y: number, z: number) => Math.max(gapCuerpo(x, y, z), gapCupula(x, y, z));

  // ── Batería: módulos finos y anchos pegados al suelo del chasis (2026-11-06,
  // Eugenio: «la batería demasiado gorda: más finita y pegada al chasis»):
  // uno bajo el piloto, otro bajo el pasajero (o detrás del piloto si va
  // solo) y, si aún falta, un tercero en la cola. Cada uno de 9 cm como mucho.
  const volBat = P.kWh * 1000 / P.whL / 1000;             // m³
  const T_MOD = 0.09;
  const modulos: { nombre: string; x0: number; x1: number; hz: number; t: number }[] = [
    { nombre: 'Módulo bajo el piloto', x0: xPil - 0.46, x1: xPil + 0.56, hz: 0.42, t: 0 },
    P.plazas === 2 ? { nombre: 'Módulo bajo el pasajero', x0: xPas - 0.42, x1: xPas + 0.52, hz: 0.40, t: 0 } : { nombre: 'Módulo trasero', x0: xPil - 1.10, x1: xPil - 0.50, hz: 0.36, t: 0 },
    { nombre: 'Módulo de la cola', x0: (P.plazas === 2 ? xPas : xPil) - 1.05, x1: (P.plazas === 2 ? xPas : xPil) - 0.46, hz: 0.30, t: 0 },
  ];
  let queda = volBat;
  for (const b of modulos) { const cap = (b.x1 - b.x0) * 2 * b.hz; b.t = Math.min(T_MOD, queda / cap); queda = Math.max(0, queda - cap * b.t); }
  if (queda > 1e-6) modulos[modulos.length - 1].t += queda / ((modulos[2].x1 - modulos[2].x0) * 2 * modulos[2].hz);   // lo que no cabe, en la cola, más gordo
  const bat1 = modulos[0], bat2 = modulos[1];
  const baterias = modulos.filter(b => b.t > 0.005).map(b => ({ nombre: b.nombre, x0: b.x0, x1: b.x1, y0: yFloor + 0.005, y1: yFloor + 0.005 + b.t, hz: b.hz }));
  // Altura de las caderas: suelo + módulo + asiento (deslizadores «Altura del asiento»).
  const hip = yFloor + bat1.t + P.altPil;
  const hipPas = yFloor + (P.plazas === 2 ? bat2.t : 0) + P.altPas;
  const grosorBase = () => 0.03;

  // ── Piloto (y pasajero): reclinados, pies en el reposapiés, manos en el volante ──
  const recDe = (piloto: boolean) => (piloto ? P.recPil : P.recPas) * Math.PI / 180;
  const ikKnee = (h: [number, number], f: [number, number], l1: number, l2: number): [number, number] => {
    const dx = f[0] - h[0], dy = f[1] - h[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3);
    const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), b = Math.atan2(dy, dx);
    return [h[0] + l1 * Math.cos(b + a), h[1] + l1 * Math.sin(b + a)];
  };
  const volante = { c: [xPil + 0.44, hip + 0.34] as [number, number], r: 0.15, inclinacion: 35 * Math.PI / 180 };
  const reposapies: [number, number] = [xPil + 0.86, yFloor + 0.16];
  // Ocupantes: tronco reclinado pero cabeza recta (el cuello endereza el
  // reclinado hasta dejar la cabeza a un tercio del ángulo), como en un
  // velomóvil. El pasajero va tumbado tipo Fórmula 1, con las piernas
  // estiradas a los lados del asiento del piloto (2026-11-06, Eugenio).
  const occPts = (piloto: boolean): PuntosOcupante => {
    const hx = piloto ? xPil : xPas, hy = piloto ? hip : hipPas, REC = recDe(piloto);
    const d: [number, number] = [-Math.sin(REC), Math.cos(REC)];
    const RECH = REC * 0.35, dh: [number, number] = [-Math.sin(RECH), Math.cos(RECH)];
    const H: [number, number] = [hx, hy], S: [number, number] = [hx + d[0] * 0.5, hy + d[1] * 0.5];
    const C: [number, number] = [S[0] + dh[0] * 0.2, S[1] + dh[1] * 0.2];
    const F: [number, number] = piloto ? reposapies : [hx + 0.96, yFloor + 0.13];
    const K = ikKnee(H, F, 0.45, 0.47);
    const mano: [number, number] = piloto ? [volante.c[0] - Math.sin(volante.inclinacion) * 0.10, volante.c[1] + Math.cos(volante.inclinacion) * 0.10] : [H[0] + 0.30, H[1] + 0.02];
    return { H, S, C, K, F, d, dh, hx, mano, anchoMano: piloto ? 0.13 : 0.16, anchoPiernas: piloto ? [0.095, 0.10] : [0.20, 0.27] };
  };
  // Asiento de velomóvil: base acolchada, respaldo curvo (que se ahueca en
  // los riñones y abraza los hombros) y reposacabezas casi vertical, para
  // que la cabeza vaya recta aunque el tronco vaya tumbado.
  const asientoPiezas = (piloto: boolean): PiezasAsiento => {
    const hx = piloto ? xPil : xPas, hy = piloto ? hip : hipPas, REC = recDe(piloto), g = grosorBase();
    const d: [number, number] = [-Math.sin(REC), Math.cos(REC)], pb: [number, number] = [-Math.cos(REC), -Math.sin(REC)];
    const en = (t: number, o: number): [number, number] => [hx + d[0] * t + pb[0] * o, hy + d[1] * t + pb[1] * o];
    const arriba: [number, number][] = [[hx + 0.36, hy - 0.05], [hx + 0.22, hy - 0.085], [hx + 0.06, hy - 0.10], [hx - 0.06, hy - 0.10]];
    const base = arriba.concat(arriba.map(q => [q[0], q[1] - g] as [number, number]).reverse());
    // Respaldo: la cara delantera sigue una curva (lumbar hacia delante, hombros hacia atrás), 3,5 cm de espesor.
    const curva = (t: number) => 0.105 - 0.03 * Math.sin(Math.PI * (t - 0.06) / 0.52) + 0.02 * Math.max(0, (t - 0.40) / 0.18);
    const frente: [number, number][] = [], dorso: [number, number][] = [];
    for (let k = 0; k <= 8; k++) { const t = 0.06 + 0.52 * k / 8; frente.push(en(t, curva(t))); dorso.push(en(t, curva(t) + 0.035)); }
    const respaldo = frente.concat(dorso.reverse());
    // Reposacabezas: su propio plano, a un tercio del reclinado (la cabeza recta), apoyado en el marco.
    const RH = REC * 0.35, dH: [number, number] = [-Math.sin(RH), Math.cos(RH)], pH: [number, number] = [-Math.cos(RH), -Math.sin(RH)];
    const topR = en(0.60, 0.12), enH = (t: number, o: number): [number, number] => [topR[0] + dH[0] * t + pH[0] * o, topR[1] + dH[1] * t + pH[1] * o];
    const cabecero: [number, number][] = [enH(0.02, -0.02), enH(0.18, -0.02), enH(0.18, 0.025), enH(0.02, 0.025)];
    return { base, respaldo, cabecero, marco: [[hx - 0.05, hy - 0.10 - g], en(0.10, 0.145), en(0.58, 0.150), enH(0.17, 0.03)], anchoCabecero: 0.26 };
  };
  const asientos: Asiento[] = P.plazas === 2 ? [{ piloto: true, lat: 0, ancho: 0.50 }, { piloto: false, lat: 0, ancho: 0.50 }] : [{ piloto: true, lat: 0, ancho: 0.50 }];
  const ultimaCabeza = occPts(P.plazas === 2 ? false : true).C[0];

  // ── El chasis: estructura tubular tipo Twizy ─────────────────────────────
  const zR = 0.32, xF0 = 0.55, xR0 = xR - 0.45;
  const yTow = Math.max(rF, rR) + 0.42;                          // torretas de los McPherson
  const zTF = P.viaF / 2 - 0.22, zTR = P.viaR / 2 - 0.22;
  const xD = xPil + 0.70, yDash = Math.min(hip + 0.42, deckY - 0.05);   // arco del salpicadero, bajo la cubierta
  const xH = (P.plazas === 2 ? xPas : xPil) - 0.50, yHoop = deckY - 0.03;   // arco principal, detrás del último asiento
  const ySill = yFloor + 0.22, zSill = 0.50;
  const volanteCentro: P3 = [volante.c[0], volante.c[1], 0];
  const cremallera: P3 = [0.10, yFloor + 0.16, 0];
  // Los largueros van planos entre ejes y suben con el fondo de la carrocería
  // hacia el morro y la cola, para no asomar por debajo (ronda 2 del bot).
  const yLarg = (x: number) => Math.max(ys, frame(uDeX(x)).bot + 0.035);
  const tubosChasis = (): Tubo[] => {
    const AL = MATERIALES_CHASIS[P.matChasis].n;
    const t: Tubo[] = [];
    const tubo = (nombre: string, a: P3, b: P3, d: number, pared: number, grupo: Tubo['grupo'] = 'Chasis', comprado = false, material = AL, curva?: P3[]) =>
      t.push({ nombre, grupo, a, b, d, pared, material, comprado, curva });
    for (const s of [1, -1]) {
      const lado = s > 0 ? 'izq.' : 'der.';
      const paso: P3[] = []; for (let x = xF0; x > xR0 - 1e-6; x -= (xF0 - xR0) / 16) paso.push([x, yLarg(x), s * zR]);
      tubo(`Larguero ${lado}`, [xF0, yLarg(xF0), s * zR], [xR0, yLarg(xR0), s * zR], P.spineD / 1000, P.spineT / 1000, 'Chasis', false, AL, paso);
      tubo(`Torreta delantera ${lado}, delante`, [0.35, yLarg(0.35), s * zR], [0.03, yTow, s * zTF], 0.032, 0.002);
      tubo(`Torreta delantera ${lado}, detrás`, [-0.32, yLarg(-0.32), s * zR], [0.03, yTow, s * zTF], 0.032, 0.002);
      tubo(`Torreta trasera ${lado}, delante`, [xR + 0.32, yLarg(xR + 0.32), s * zR], [xR + 0.03, yTow, s * zTR], 0.032, 0.002);
      tubo(`Torreta trasera ${lado}, detrás`, [xR - 0.32, yLarg(xR - 0.32), s * zR], [xR + 0.03, yTow, s * zTR], 0.032, 0.002);
      tubo(`Montante del salpicadero ${lado}`, [xD, yLarg(xD), s * zR], [xD, yDash, s * 0.36], 0.032, 0.002);
      tubo(`Arco principal ${lado}`, [xH, yLarg(xH), s * zR], [xH, yHoop, s * 0.30], 0.038, 0.0025);
      tubo(`Estribo ${lado}`, [xD, ySill, s * zSill], [xH, ySill, s * zSill], 0.032, 0.002);
      tubo(`Pie del estribo delantero ${lado}`, [xD, yLarg(xD), s * zR], [xD, ySill, s * zSill], 0.025, 0.0015);
      tubo(`Pie del estribo trasero ${lado}`, [xH, yLarg(xH), s * zR], [xH, ySill, s * zSill], 0.025, 0.0015);
      tubo(`Diagonal salpicadero–torreta ${lado}`, [xD, yDash, s * 0.36], [0.03, yTow, s * zTF], 0.025, 0.0015);
      tubo(`Diagonal arco–torreta trasera ${lado}`, [xH, yHoop, s * 0.30], [xR + 0.03, yTow, s * zTR], 0.025, 0.0015);
    }
    for (const [n, x] of [['Travesaño delantero', xF0], ['Travesaño del eje delantero', 0.35], ['Travesaño del suelo', -0.32], ['Travesaño del asiento', xPil - 0.40], ['Travesaño del eje trasero', xR + 0.32], ['Travesaño del motor', xR - 0.32], ['Travesaño trasero', xR0]] as [string, number][]) {
      tubo(n, [x, yLarg(x), -zR], [x, yLarg(x), zR], 0.032, 0.002);
    }
    tubo('Travesaño de torretas delanteras', [0.03, yTow, -zTF], [0.03, yTow, zTF], 0.032, 0.002);
    tubo('Travesaño de torretas traseras', [xR + 0.03, yTow, -zTR], [xR + 0.03, yTow, zTR], 0.032, 0.002);
    tubo('Travesaño del salpicadero', [xD, yDash, -0.36], [xD, yDash, 0.36], 0.032, 0.002);
    tubo('Travesaño del arco principal', [xH, yHoop, -0.30], [xH, yHoop, 0.30], 0.038, 0.0025);
    // Suspensión McPherson: brazos inferiores (fabricados), amortiguadores y barras (compradas)
    for (const [nombre, xA, r, zA, zT] of [['delantera', 0, rF, P.viaF / 2, zTF], ['trasera', xR, rR, P.viaR / 2, zTR]] as [string, number, number, number, number][]) {
      for (const s of [1, -1]) {
        const lado = s > 0 ? 'izq.' : 'der.', rotula: P3 = [xA, r - 0.10, s * (zA - 0.06)];
        // Los anclajes al chasis, dentro de la huella de la rueda y por encima del fondo de la carrocería.
        const yAnc = (x: number) => Math.max(r - 0.06, frame(uDeX(x)).bot + 0.045);
        tubo(`Brazo inferior ${nombre} ${lado}, delante`, [xA + 0.14, yAnc(xA + 0.14), s * zR], rotula, 0.025, 0.0025, 'Suspensión');
        tubo(`Brazo inferior ${nombre} ${lado}, detrás`, [xA - 0.14, yAnc(xA - 0.14), s * zR], rotula, 0.025, 0.0025, 'Suspensión');
        tubo(`Amortiguador McPherson ${nombre} ${lado}`, [xA, r + 0.14, s * (zA - 0.08)], [xA + 0.03, yTow, s * zT], 0.045, 0, 'Suspensión', true, 'Comprado (columna McPherson con muelle, clase Twizy)');
      }
      // Hacia el centro del coche, donde el fondo es más bajo y la tapa.
      const xBarra = xA + (xA === 0 ? -0.25 : 0.25), yBarra = Math.max(r - 0.02, frame(uDeX(xBarra)).bot + 0.05);
      tubo(`Barra estabilizadora ${nombre}`, [xBarra, yBarra, -0.36], [xBarra, yBarra, 0.36], 0.018, 0, 'Suspensión', true, 'Comprado (barra estabilizadora)');
    }
    // Dirección: cremallera, bieletas y columna hasta el volante
    tubo('Cremallera de dirección', [cremallera[0], cremallera[1], -0.33], [cremallera[0], cremallera[1], 0.33], 0.04, 0, 'Dirección', true, 'Comprado (cremallera)');
    for (const s of [1, -1]) tubo(`Bieleta de dirección ${s > 0 ? 'izq.' : 'der.'}`, [cremallera[0], cremallera[1], s * 0.33], [0.10, rF - 0.04, s * (P.viaF / 2 - 0.09)], 0.016, 0, 'Dirección', true, 'Comprado (bieleta con rótulas)');
    tubo('Columna de dirección', cremallera, volanteCentro, 0.025, 0, 'Dirección', true, 'Comprado (columna de dirección)');
    // Transmisión: motor transversal detrás del eje, reductora con diferencial y palieres
    for (const s of [1, -1]) tubo(`Palier ${s > 0 ? 'izq.' : 'der.'}`, [xR, rR, s * 0.16], [xR, rR, s * (P.viaR / 2 - 0.10)], 0.03, 0, 'Transmisión', true, 'Comprado (palier homocinético)');
    return t;
  };

  // ── La piel: bajos negros, paneles solares, huecos de rueda ─────────────
  const uCabina1 = Math.min(uC1 - 0.12, uDeX(ultimaCabeza - 0.34));    // donde acaba la cabina y empieza el maletero trasero
  // Pasos de rueda: un hueco en la piel desde el fondo hasta un arco sobre
  // la rueda, como en el SZEmission (la rueda se ve por el lado, en el arco
  // de la banda negra). El parámetro θ de la superelipse no es el ángulo
  // geométrico: en el fondo (exponente nL) z = hw·cos(θ)^(2/nL) y
  // y = zc − ay·sin(θ)^(2/nL), así que θ(z) = acos((z/hw)^(nL/2)) y
  // θ(y) = asin(((zc − y)/ay)^(nL/2)).
  // 2026-11-06 (Eugenio): «que el chasis cubra por completo las ruedas sin
  // dejar hueco, siguiendo la línea natural». Ya no hay arco en el costado:
  // la piel pasa entera por encima de la rueda y solo queda abierto el fondo
  // (de la línea de la rodadura hacia fuera y hasta la esquina baja), que no
  // se ve desde el lado. `arcoY` es la altura de esa esquina, para que la
  // comprobación de la rueda girada sepa desde dónde tiene que caber.
  const huecos: ZonaPiel[] = [];
  const arcoY = { del: 0, tras: 0 };
  for (const [xA, r, zA, w, cual] of [[0, rF, P.viaF / 2, nF.w, 'del'], [xR, rR, P.viaR / 2, nR.w, 'tras']] as [number, number, number, number, 'del' | 'tras'][]) {
    const f = frame(uDeX(xA)), ay = f.zc - f.bot;
    const thZ = (z: number) => Math.acos(Math.pow(Math.min(1, Math.max(0, z / f.hw)), P.nL / 2));
    const thY = (y: number) => Math.asin(Math.pow(Math.min(1, Math.max(0, (f.zc - y) / ay)), P.nL / 2));
    const thFondo = thZ(zA - w / 2 - 0.035);          // borde interior del hueco, en el fondo
    arcoY[cual] = f.bot + 0.115;
    const thEsq = thY(arcoY[cual]);                      // la esquina baja entre fondo y costado
    const u0 = uDeX(xA + r + 0.045), u1 = uDeX(xA - r - 0.045);
    for (const s of [1, -1]) {
      const lado = s > 0 ? 'izq.' : 'der.';
      const t = (th: number) => (s > 0 ? 2 * Math.PI - th : Math.PI + th);
      const [a, b] = s > 0 ? [t(thFondo), t(thEsq)] : [t(thEsq), t(thFondo)];
      huecos.push({ nombre: `Paso de rueda ${lado}, fondo`, piel: 'hueco', u0, u1, t0: a, t1: b });
    }
  }
  // La banda negra: todo lo que queda por debajo de una línea que es alta en
  // las puntas y baja entre ejes (SZ.banda, en fracción del alto total).
  const bandaDe = (u: number): [number, number] => {
    const f = frame(u), y = SZ.banda(u) * P.H, ay = f.zc - f.bot;
    if (y >= f.zc || ay < 1e-4) return [Math.PI, 2 * Math.PI];
    const th = Math.asin(Math.pow(Math.min(1, (f.zc - y) / ay), P.nL / 2));
    return [Math.PI + th, 2 * Math.PI - th];
  };
  // Paneles solares en la carrocería (2026-11-06, Eugenio: «que los paneles
  // del carenado continúen por el lateral del vehículo y en la parte
  // frontal»): el capó, y las dos franjas del lomo que corren a los lados de
  // la cúpula desde la base del parabrisas hasta la cola, por encima de la
  // línea del hombro (lo que mira al cielo; de ahí para abajo es flanco).
  const zonasCuerpo: ZonaPiel[] = [
    ...huecos,
    { nombre: 'Bajos', piel: 'bajos', u0: 0.004, u1: 0.996, t0: Math.PI, t1: 2 * Math.PI, tDe: bandaDe },
    { nombre: 'Paneles solares del capó', piel: 'solar', u0: 0.045, u1: uC0 - 0.02, t0: 0.28 * Math.PI, t1: 0.72 * Math.PI },
    { nombre: 'Paneles solares del lomo izq.', piel: 'solar', u0: uC0 + 0.01, u1: 0.93, t0: 0.19 * Math.PI, t1: 0.42 * Math.PI },
    { nombre: 'Paneles solares del lomo der.', piel: 'solar', u0: uC0 + 0.01, u1: 0.93, t0: 0.58 * Math.PI, t1: 0.81 * Math.PI },
  ];
  // La cúpula es carrocería (blanca, como el resto) con el panel solar en la
  // parte plana del techo y cristal en el parabrisas y las dos ventanillas.
  // El borde trasero de la ventanilla va inclinado como un pilar B (u = uVentA
  // arriba, uVent1 abajo); lo de atrás de la puerta es fijo (custodia). El
  // borde de abajo de la ventanilla es la línea donde la cúpula sale de la
  // carrocería (`thBase`): así la barra de abajo va recta sobre el hombro y no
  // sigue el serpenteo de la base hundida (2026-11-06, Eugenio).
  const uVentA = Math.min(uC1 - 0.30, Math.min(uDeX(xH - 0.02), Math.max(uDeX(xD + 0.02), uC0 + 0.08) + 0.385) + 0.005), uVent1 = uVentA + 0.06;   // = borde trasero de la puerta (uD1, que se define más abajo)
  const thTrasera = (u: number) => Math.min(thVentana, Math.max(0, thVentana * (uVent1 - u) / (uVent1 - uVentA)));
  const thVent = (u: number) => Math.min(u < uW1 ? thPilar(u) : thVentana, u > uVentA ? thTrasera(u) : thVentana);
  /** θ (lado izquierdo) donde la cúpula cruza la piel de la carrocería en la estación u; 0 si no la cruza. */
  const cacheBase = new Map<number, number>();
  const thBase = (u: number) => {
    const k = Math.round(u * 4000); const c = cacheBase.get(k); if (c !== undefined) return c;
    const v = thBaseCalc(u); cacheBase.set(k, v); return v;
  };
  const thBaseCalc = (u: number) => {
    const f = frameC(u); let a = 0, b = 0.5 * Math.PI;
    const fuera = (th: number) => { const q = secC(f, th); return gapCuerpo(q[0], q[1], q[2]) < 0; };
    if (fuera(0)) return 0;
    for (let k = 0; k < 18; k++) { const m = (a + b) / 2; if (fuera(m)) b = m; else a = m; }
    return b;
  };
  // El borde de abajo de la ventanilla es una recta (2026-11-06, Eugenio:
  // «esa curva quítala, que sea plana») entre la unión cúpula-carrocería en
  // la base del montante y en la esquina trasera; `thAltura` da el θ de la
  // cúpula a esa altura en cada estación.
  const thAltura = (u: number, y: number) => {
    const f = frameC(u), ay = f.top - f.zc; if (ay < 0.01) return 0;
    const yn = Math.min(0.98, Math.max(0.02, (y - f.zc) / ay));
    return Math.asin(Math.pow(yn, ncDe(u) / 2));
  };
  const yEn = (u: number) => secC(frameC(u), thBase(u) + 0.02)[1];
  const yA = yEn(uBase), yB = yEn(uVent1);
  const thAlfeizar = (u: number) => thAltura(u, yA + (yB - yA) * (u - uBase) / (uVent1 - uBase));
  const zonasCupula: ZonaPiel[] = [
    { nombre: 'Parabrisas', piel: 'cristal', u0: uC0, u1: uW1, t0: 0, t1: Math.PI, tDe: u => [Math.max(thPilar(u), thBase(u) + 0.02), Math.PI - Math.max(thPilar(u), thBase(u) + 0.02)] },
    { nombre: 'Ventanilla izquierda', piel: 'cristal', u0: uBase, u1: uVent1, t0: 0, t1: thVentana, tDe: u => [Math.max(thAlfeizar(u), thBase(u) + 0.005), thVent(u)] },
    { nombre: 'Ventanilla derecha', piel: 'cristal', u0: uBase, u1: uVent1, t0: Math.PI - thVentana, t1: Math.PI, tDe: u => [Math.PI - thVent(u), Math.PI - Math.max(thAlfeizar(u), thBase(u) + 0.005)] },
    // Paneles solares: la parte plana del techo, del borde de arriba del parabrisas hasta la cola.
    { nombre: 'Paneles solares del techo', piel: 'solar', u0: uW1 + 0.012, u1: uC1 - 0.025, t0: 0.27 * Math.PI, t1: 0.73 * Math.PI },
  ];

  // ── Puertas y maleteros ──────────────────────────────────────────────────
  const puertas: PuertaDef[] = [];
  // La puerta empieza detrás del parabrisas (que es fijo, ~30 cm de cúpula) y acaba en el arco principal.
  // La puerta llega hasta el arco principal, pero no más de 1,4 m: con pasajero el arco queda muy atrás.
  const uD0 = Math.max(uDeX(xD + 0.02), uC0 + 0.08), uD1 = Math.min(uDeX(xH - 0.02), uD0 + 0.385);
  const uDC0 = Math.max(uC0 + 0.015, uD0), uDC1 = Math.min(uCabina1 - 0.01, uD1);
  const lineaCentro = (ua: number, ub: number): [P3, P3] => [secC(frameC(ua), Math.PI / 2), secC(frameC(ub), Math.PI / 2)];
  if (P.puerta === 'gaviota') {
    // Alas de gaviota como las del Aptera (2026-11-06, Eugenio: «conserva el
    // techo, que se abran solo la parte lateral, el techo no es parte de la
    // puerta»): la puerta es la ventanilla con su costado de cúpula y el panel
    // lateral de la carrocería; la bisagra va en el canto del techo (la línea
    // donde el costado se vuelve techo), inclinada como ese canto.
    for (const s of [1, -1]) {
      const id = s > 0 ? 'izq' : 'der', nombre = `Puerta ${s > 0 ? 'izquierda' : 'derecha'}`;
      const th = (t: number) => (s > 0 ? t : Math.PI - t);
      const bis: [P3, P3] = [secC(frameC(uDC0), th(thVentana)), secC(frameC(uDC1), th(thVentana))];
      const fB = frame((uD0 + uD1) / 2), prueba = sec(fB, s > 0 ? 0.08 * Math.PI : 0.92 * Math.PI);
      const ang = abrirHaciaArriba(bis, prueba, 105);
      puertas.push({ id, nombre, tipo: 'puerta', superficie: 'cupula', u0: uDC0, u1: uDC1, t0: s > 0 ? 0 : Math.PI - thVentana, t1: s > 0 ? thVentana : Math.PI, bisagra: bis, angulo: ang });
      puertas.push({ id, nombre, tipo: 'puerta', superficie: 'cuerpo', u0: uD0, u1: uD1, t0: s > 0 ? 0.04 * Math.PI : 0.66 * Math.PI, t1: s > 0 ? 0.34 * Math.PI : 0.96 * Math.PI, bisagra: bis, angulo: ang });
    }
  } else if (P.puerta === 'cabina') {
    // Cúpula entera basculante hacia delante; se entra por encima del estribo.
    const fa = frameC(uDC0), bis: [P3, P3] = [[fa.x, fa.zc + hundido, -1], [fa.x, fa.zc + hundido, 1]];
    const fb = frameC(uDC1), prueba = secC(fb, Math.PI / 2);
    puertas.push({ id: 'cupula', nombre: 'Cúpula basculante', tipo: 'puerta', superficie: 'cupula', u0: uDC0, u1: uDC1, t0: 0, t1: Math.PI, bisagra: bis, angulo: abrirHaciaArriba(bis, prueba, 58) });
  } else {
    // Tipo Aptera: panel lateral + media cúpula con bisagra delante, inclinada: la puerta sube al abrirse.
    for (const s of [1, -1]) {
      const id = s > 0 ? 'izq' : 'der', nombre = `Puerta ${s > 0 ? 'izquierda' : 'derecha'}`;
      const arriba = secC(frameC(uDC0), Math.PI / 2);
      const bis: [P3, P3] = [[xDeU(uD0), ySill, s * zSill], arriba];
      const fB = frame(uD1), prueba = sec(fB, s > 0 ? 0.10 * Math.PI : 0.90 * Math.PI);
      const ang = abrirHaciaArriba(bis, prueba, 62);
      puertas.push({ id, nombre, tipo: 'puerta', superficie: 'cupula', u0: uDC0, u1: uDC1, t0: s > 0 ? 0 : 0.5 * Math.PI, t1: s > 0 ? 0.5 * Math.PI : Math.PI, bisagra: bis, angulo: ang });
      puertas.push({ id, nombre, tipo: 'puerta', superficie: 'cuerpo', u0: uD0, u1: uD1, t0: s > 0 ? 0.04 * Math.PI : 0.66 * Math.PI, t1: s > 0 ? 0.34 * Math.PI : 0.96 * Math.PI, bisagra: bis, angulo: ang });
    }
  }
  // Maletero delantero: tapa del capó con bisagra en su borde trasero.
  {
    const u0 = 0.03, u1 = uC0 - 0.015, fb = frame(u1), b = sec(fb, Math.PI / 2);
    const bis: [P3, P3] = [[b[0], b[1], -1], [b[0], b[1], 1]], prueba = sec(frame(u0 + 0.01), Math.PI / 2);
    puertas.push({ id: 'maleteroF', nombre: 'Tapa del maletero delantero', tipo: 'maletero', superficie: 'cuerpo', u0, u1, t0: 0.22 * Math.PI, t1: 0.78 * Math.PI, bisagra: bis, angulo: abrirHaciaArriba(bis, prueba, 55) });
  }
  // Maletero trasero: la cola de la cúpula, con bisagra en su borde delantero.
  {
    const u0 = uCabina1, u1 = uC1 - 0.012, fa = frameC(u0);
    const bis: [P3, P3] = [[fa.x, fa.zc + hundido + 0.02, -1], [fa.x, fa.zc + hundido + 0.02, 1]], prueba = secC(frameC(u1 - 0.01), Math.PI / 2);
    puertas.push({ id: 'maleteroT', nombre: 'Tapa del maletero trasero', tipo: 'maletero', superficie: 'cupula', u0, u1, t0: 0, t1: Math.PI, bisagra: bis, angulo: abrirHaciaArriba(bis, prueba, 50) });
  }
  const superficies: Superficie[] = [
    { id: 'cuerpo', frame, sec, tMax: 2 * Math.PI, u0: 0, u1: 1, zonas: zonasCuerpo, puertas: puertas.filter(p => p.superficie === 'cuerpo'), pielBase: 'carroceria' },
    { id: 'cupula', frame: frameC, sec: secC, tMax: Math.PI, u0: uC0, u1: uC1, zonas: zonasCupula, puertas: puertas.filter(p => p.superficie === 'cupula'), pielBase: 'carroceria' },
  ];
  const zonasPiel = [...zonasCuerpo, ...zonasCupula];

  // ── Motor, reductora, inversor y cargador: detrás del eje trasero ────────
  const motor = { c: [xR - 0.30, rR + 0.19, 0.08] as P3, r: 0.105, largo: 0.26 };
  const reductora = { c: [xR - 0.09, rR + 0.065, -0.02] as P3, s: [0.20, 0.18, 0.22] as P3 };
  const inversor = { c: [xR - 0.32, rR + 0.34, 0] as P3, s: [0.24, 0.09, 0.30] as P3 };
  const cargador = { c: [xR + 0.45, yFloor + 0.08, -0.22] as P3, s: [0.22, 0.10, 0.16] as P3 };
  const ruedas: Rueda[] = [
    { nombre: 'Rueda delantera izq.', x: 0, z: P.viaF / 2, r: rF, w: nF.w }, { nombre: 'Rueda delantera der.', x: 0, z: -P.viaF / 2, r: rF, w: nF.w },
    { nombre: 'Rueda trasera izq.', x: xR, z: P.viaR / 2, r: rR, w: nR.w }, { nombre: 'Rueda trasera der.', x: xR, z: -P.viaR / 2, r: rR, w: nR.w },
  ];
  const torretas = { yTow, zTF, zTR };
  // Pasos de rueda: media caña oscura sobre cada rueda, que tapa el interior visto por el arco.
  // Media caña de ±55° alrededor de la vertical, y poco más ancha que el
  // neumático: así no asoma por fuera de la piel donde la cola se estrecha.
  const pasosRueda = ruedas.map(r => ({ x: r.x, y: r.r, z: r.z, R: r.r + TRAVEL_A1 + 0.03, largo: r.w + 0.06, arco: 110 }));

  return {
    tipo: 'a1' as const,
    P, dY, ys, hip, hipPas, xn, xt, xR, Lf, Hb, rF, rR, xPil, xPas, deckY, yFloor, uC0, uC1, uCabina1, hundido,
    frame, sec, frameC, secC, gap, gapCuerpo, gapCupula, uDeX, xDeU, uW1, uBase, uVentA, uVent1, thVentana, thPilar, thTrasera, thBase, thAlfeizar,
    occPts, asientoPiezas, grosorBase, recDe, asientos, ruedas, via: { del: P.viaF, tras: P.viaR },
    tubosChasis, zonasPiel, puertas, superficies,
    baterias, motor, reductora, inversor, cargador, volante, reposapies, cremallera, torretas, arcoY, pasosRueda,
    xD, yDash, xH, yHoop, ySill, zSill, zR, xF0, xR0,
    nF, nR,
  };
}
export type ModeloA1 = ReturnType<typeof crearModeloA1>;

/** Contorno de la cúpula en una estación (cuaderna), [z, y] en metros; vacío fuera de la cúpula. */
export function contornoCupula(m: ModeloA1, u: number, n = 48): [number, number][] {
  if (u <= m.uC0 + 0.002 || u >= m.uC1 - 0.002) return [];
  const f = m.frameC(u), out: [number, number][] = [];
  for (let j = 0; j <= n; j++) { const q = m.secC(f, Math.PI * j / n); out.push([q[2], q[1]]); }
  return out;
}

/** Masa de cada parte (kg) del Aeromóvil 1. */
export function estimarMasasA1(m: ModeloA1, ar: { carroceria: number; cristal: number; solar: number }, P: Parametros) {
  const mat = MATERIALES_CHASIS[P.matChasis];
  let tubos = 0, brazos = 0;
  for (const t of m.tubosChasis()) {
    if (t.comprado) continue;
    const area = Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2);
    const kg = area * largoTubo(t) * mat.densidad;
    if (t.grupo === 'Suspensión') brazos += kg; else tubos += kg;
  }
  return {
    Chasis: tubos + P.extraChasis,
    'Suspensión': brazos + P.mSuspension,
    Ruedas: 4 * P.mRueda,
    Frenos: 4 * P.mFrenos,
    'Motor, inversor y reductora': P.mMotor + P.mInversor + P.mReductora + 4,
    'Batería': P.kWh * 1000 / P.whKg,
    'Dirección': P.mDireccion,
    Asientos: P.plazas * P.mAsiento,
    'Carrocería': ar.carroceria * P.espCarenado * MATERIALES_CARENADO[P.matCarenado].kgm2mm,
    'Cúpula': ar.cristal * P.espCristal * 1.2,
    'Paneles solares': ar.solar * P.mSolarM2,
    // «Varios» lleva el cargador, el cableado, las puertas, los maleteros y las luces; si alguno tiene su peso escrito en la ficha, se ajusta.
    Varios: P.mVarios + Object.keys(MASAS_FIJAS_A1).reduce((s, id) => s + masaFija(P, id) - MASAS_FIJAS_A1[id], 0),
  } as Record<string, number>;
}

const areaPoligono = (c: [number, number][]) => {
  let a = 0;
  for (let j = 0; j < c.length; j++) { const p = c[j], q = c[(j + 1) % c.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return Math.abs(a) / 2;
};

/** Áreas, aerodinámica, energía, estructura y holguras del Aeromóvil 1. Todo estimación. */
export function calcularA1(m: ModeloA1, ar: { carroceria: number; cristal: number; solar: number }): Resultados {
  const P = m.P, g = 9.81;
  // Área frontal y volumen: carrocería más cúpula, estación a estación.
  let A = 0, vol = 0, volCup = 0;
  const N = 120, areasX: number[] = [];
  for (let i = 1; i < N; i++) {
    const u = i / N, a = areaPoligono(contornoSeccion(m, u, 72)), c = contornoCupula(m, u, 40), ac = c.length ? areaPoligono(c) : 0;
    A = Math.max(A, a + ac); vol += a * m.Lf / N; volCup += ac * m.Lf / N; areasX.push(a);
  }
  const ruedasExp = (m.nF.w + m.nR.w) * 2 * P.clear;     // lo que asoma de rueda por debajo
  A += ruedasExp * 0.9;
  const Deq = Math.sqrt(4 * A / Math.PI), FR = m.Lf / Deq;
  // Cd: el SZEmission publica 0,1365 con las ruedas carenadas por completo.
  // Aquí asoma media rueda y hay huecos de rueda, retrovisores y juntas.
  let Cd = 0.112 + 0.010 * (FR - 3.4) ** 2 + 0.30 * (ruedasExp / A) + 0.010 + 0.012 * Math.abs(P.morroA1 - 0.5) + 0.015 * Math.max(0, P.colaA1 - 0.5);
  Cd = Math.min(0.45, Math.max(0.11, Cd));
  const CdA = Cd * A;

  const masas = estimarMasasA1(m, ar, P);
  const mVeh = Object.values(masas).reduce((a, b) => a + b, 0), mTot = mVeh + P.plazas * P.mOcc;
  const extremo = (lado: 0 | 1) => {
    const Q: Parametros = { ...P, matChasis: lado ? 'cromoly' : 'carbono', matCarenado: lado ? 'vidrio' : 'carbono', whKg: lado ? 120 : 200 };
    for (const [k, r] of Object.entries(RANGOS_MASA_A1)) (Q as any)[k] = r[lado];
    return Object.values(estimarMasasA1(m, ar, Q)).reduce((a, b) => a + b, 0);
  };
  const rangoMasa: [number, number] = [extremo(0), extremo(1)];

  // Energía: rodadura de neumático de coche, motor + inversor + reductora al 88 %, 250 W de equipos.
  const Crr = 0.009, eta = 0.88, Paux = 250;
  const potencia = (v: number) => (0.5 * 1.2 * CdA * v ** 3 + Crr * mTot * g * v) / eta + Paux;
  const consumo = (kmh: number) => { const v = kmh / 3.6; return potencia(v) / v / 3.6; };   // Wh/km
  const v = P.speed / 3.6, Paero = 0.5 * 1.2 * CdA * v ** 3, Proll = Crr * mTot * g * v, Pw = potencia(v);
  const WhKm = consumo(P.speed), WhKm100 = consumo(100);
  const util = P.kWh * 1000 * 0.92;
  const autonomia = util / WhKm, autonomia100 = util / WhKm100;
  const vmaxCon = (kW: number) => { let vv = 10; for (let i = 0; i < 80; i++) vv *= Math.pow(kW * 1000 / potencia(vv), 0.34); return vv * 3.6; };
  const vmaxNominal = vmaxCon(P.kWNom), vmaxPico = vmaxCon(P.kWPico);
  // Aceleración: potencia de pico limitada por la adherencia del eje trasero (≈ 50 % del peso, μ = 0,85).
  const acelHasta = (kmh: number) => {
    let vv = 0.5, t = 0; const dt = 0.02, Fmax = 0.85 * 0.5 * mTot * g, meff = mTot * 1.04;
    while (vv < kmh / 3.6 && t < 60) { const F = Math.min(Fmax, P.kWPico * 1000 * eta / vv) - 0.5 * 1.2 * CdA * vv * vv - Crr * mTot * g; if (F <= 0) return 99; vv += F / meff * dt; t += dt; }
    return t;
  };
  const acel50 = acelHasta(50), acel100 = acelHasta(100);
  const pendiente100 = Math.asin(Math.max(-1, Math.min(1, (P.kWNom * 1000 * eta - Paux * eta - (0.5 * 1.2 * CdA * (100 / 3.6) ** 3 + Crr * mTot * g * (100 / 3.6))) / (100 / 3.6) / (mTot * g)))) * 100;
  const cargaHoras = [3.7, 7.4, 11, 22].map(kW => ({ kW, h: P.kWh / (kW * 0.92) }));
  // Sol: la superficie que mira al cielo produce, de media, ~70 % de la plana.
  const solarPico = ar.solar * RENDIMIENTO_SOLAR * 1000;
  const solarDia = ar.solar * 0.7 * RENDIMIENTO_SOLAR * P.sol * 1000 * 0.85;
  const kmSol = solarDia / WhKm100;
  // Maleteros: el volumen de la carrocería delante de los pies y detrás del arco principal, descontando lo que ya hay.
  const volEntre = (x0: number, x1: number) => { let s = 0; for (let i = 1; i < N; i++) { const x = m.xDeU(i / N); if (x <= x1 && x >= x0) s += areasX[i - 1] * m.Lf / N; } return s; };
  const pies = m.occPts(true).F[0];
  const maleteroF = Math.max(0, volEntre(pies + 0.10, m.xn - 0.02)) * 0.55 * 1000;
  const cupTras = (() => { let s = 0; for (let i = 1; i < N; i++) { const u = i / N; if (u > m.uCabina1 && m.xDeU(u) < m.xH - 0.05) { const c = contornoCupula(m, u, 40); if (c.length) s += areaPoligono(c) * m.Lf / N; } } return s; })();
  const volMotor = Math.PI * m.motor.r ** 2 * m.motor.largo + m.reductora.s[0] * m.reductora.s[1] * m.reductora.s[2] + m.inversor.s[0] * m.inversor.s[1] * m.inversor.s[2];
  const volBat2 = m.baterias.length > 1 && P.plazas === 1 ? (m.baterias[1].x1 - m.baterias[1].x0) * 2 * m.baterias[1].hz * (m.baterias[1].y1 - m.baterias[1].y0) : 0;
  const maleteroT = Math.max(0, (volEntre(m.xt + 0.02, m.xH - 0.05) + cupTras) * 0.5 - volMotor - volBat2) * 1000;

  // Viga: los dos largueros entre ejes, con el piloto y la batería en el centro.
  const cargas: [number, number][] = [[m.xPil, (P.mOcc + P.mAsiento) * g], [(m.baterias[0].x0 + m.baterias[0].x1) / 2, masas['Batería'] * g]];
  if (P.plazas === 2) cargas.push([m.xPas, (P.mOcc + P.mAsiento) * g]);
  let Mmax = 0; const R = [0, 0];
  for (const [x, F] of cargas) {
    const Lb = P.B, a = Math.min(Lb, Math.max(0, -x)), b = Lb - a;
    Mmax = Math.max(Mmax, F * a * b / Lb); R[0] += F * b / Lb; R[1] += F * a / Lb;
  }
  const Dm = P.spineD, Wmod = 2 * Math.PI * (Dm ** 4 - (Dm - 2 * P.spineT) ** 4) / (32 * Dm);   // dos largueros
  const tension = 2.5 * Mmax * 1000 / Wmod, seguridad = MATERIALES_CHASIS[P.matChasis].limite / tension;
  const cargaRueda = Math.max(R[0] / 2 / g + mVeh * 0.45 / 2, R[1] / 2 / g + mVeh * 0.55 / 2);

  // ── Holguras ──────────────────────────────────────────────────────────────
  const ch: Comprobacion[] = [];
  for (const a of m.asientos) {
    const o = m.occPts(a.piloto), quien = a.piloto ? 'piloto' : 'pasajero';
    ch.push({ nombre: `Cúpula sobre la cabeza del ${quien}`, holgura: m.gap(o.C[0], o.C[1] + 0.11, 0), minimo: 0.03 });
    ch.push({ nombre: `Hombros del ${quien} a la cúpula`, holgura: Math.min(m.gap(o.S[0], o.S[1], 0.23), m.gap(o.S[0], o.S[1] + 0.06, 0.21)), minimo: 0.03 });
    ch.push({ nombre: `Rodillas del ${quien} al salpicadero y la carrocería`, holgura: Math.min(m.gap(o.K[0], o.K[1] + 0.07, 0.10), a.piloto ? (m.yDash - 0.016) - (o.K[1] + 0.08) : 9), minimo: 0.02 });
    ch.push({ nombre: `Pies del ${quien} dentro del morro`, holgura: Math.min(m.gap(o.F[0] + 0.12, o.F[1] + 0.06, 0.12), m.gap(o.F[0] + 0.18, o.F[1], 0)), minimo: 0.02 });
  }
  // Volante a la cúpula y al salpicadero.
  const vt: [number, number] = [m.volante.c[0] - Math.sin(m.volante.inclinacion) * m.volante.r, m.volante.c[1] + Math.cos(m.volante.inclinacion) * m.volante.r];
  ch.push({ nombre: 'Volante a la cúpula', holgura: m.gap(vt[0], vt[1], 0), minimo: 0.04 });
  // Ruedas: con la suspensión hundida, y las delanteras giradas a tope. Lo
  // que queda por debajo del arco asoma por el paso de rueda a propósito;
  // se comprueba lo que va por dentro de la piel.
  const ruedaCar = (r: Rueda, giro: number, hundida: number) => {
    let mn = 9; const c = Math.cos(giro), s = Math.sin(giro), arco = r.x === 0 ? m.arcoY.del : m.arcoY.tras;
    for (let k = 0; k < 36; k++) {
      const a = 2 * Math.PI * k / 36, lx = r.r * Math.cos(a), ly = r.r + hundida + r.r * Math.sin(a);
      if (ly < arco + 0.04) continue;
      for (const lz of [-r.w / 2, r.w / 2]) {
        const x = r.x + lx * c - lz * s, z = r.z + lx * s + lz * c;
        mn = Math.min(mn, m.gapCuerpo(x, ly, z), m.gapCuerpo(x, ly, Math.sign(z) * (Math.abs(z) + 0.0001)));
      }
    }
    return mn;
  };
  ch.push({ nombre: `Rueda delantera girada ${GIRO_A1}° y hundida`, holgura: Math.min(ruedaCar(m.ruedas[0], GIRO_A1 * Math.PI / 180, TRAVEL_A1), ruedaCar(m.ruedas[0], -GIRO_A1 * Math.PI / 180, TRAVEL_A1)), minimo: 0.02 });
  ch.push({ nombre: 'Rueda trasera hundida', holgura: ruedaCar(m.ruedas[2], 0, TRAVEL_A1), minimo: 0.02 });
  ch.push({ nombre: 'Torretas de suspensión dentro de la carrocería', holgura: Math.min(m.gap(0.03, m.torretas.yTow + 0.03, m.torretas.zTF), m.gap(m.xR + 0.03, m.torretas.yTow + 0.03, m.torretas.zTR)), minimo: 0.02 });
  ch.push({ nombre: 'Arco principal bajo la cubierta', holgura: Math.min(m.gap(m.xH, m.yHoop + 0.019, 0.30), m.gap(m.xH, m.yHoop + 0.019, 0)), minimo: 0.01 });
  for (const b of m.baterias) {
    let mn = 9;
    for (const x of [b.x0, b.x1]) for (const z of [-b.hz, b.hz]) for (const y of [b.y0, b.y1]) mn = Math.min(mn, m.gap(x, y, z));
    ch.push({ nombre: `${b.nombre} de la batería dentro de la carrocería`, holgura: mn, minimo: 0.02 });
  }
  ch.push({ nombre: 'Batería: cabe en los módulos', holgura: 0.30 - (m.baterias[1] ? m.baterias[1].y1 - m.baterias[1].y0 : 0), minimo: 0.0 });
  {
    let mn = 9;
    for (const [c, s] of [[m.motor.c, [m.motor.largo, m.motor.r * 2, m.motor.r * 2]], [m.reductora.c, m.reductora.s], [m.inversor.c, m.inversor.s]] as [P3, P3][])
      for (const dx of [-1, 1]) for (const dy of [-1, 1]) for (const dz of [-1, 1]) mn = Math.min(mn, m.gap(c[0] + dx * s[0] / 2, c[1] + dy * s[1] / 2, c[2] + dz * s[2] / 2));
    ch.push({ nombre: 'Motor, reductora e inversor dentro de la cola', holgura: mn, minimo: 0.02 });
  }
  // Hueco de la puerta: lo que pide la Shell Eco-marathon es 500 × 800 mm.
  const ancho = m.xDeU(uDoorMid(m, 0)) - m.xDeU(uDoorMid(m, 1));
  const alto = m.secC(m.frameC(Math.min(m.uCabina1 - 0.02, Math.max(m.uC0 + 0.02, m.uDeX(m.xPil)))), Math.PI / 2)[1] - m.ySill;
  ch.push({ nombre: 'Hueco de la puerta: ancho (mín. 0,50 m)', holgura: ancho - 0.50, minimo: 0 });
  ch.push({ nombre: 'Hueco de la puerta: alto (mín. 0,80 m)', holgura: alto - 0.80, minimo: 0 });
  ch.push({ nombre: `Velocidad máxima sostenida (objetivo 140 km/h)`, holgura: (vmaxNominal - 140) / 100, minimo: 0 });
  ch.push({ nombre: 'Carga por neumático (índice 65: 290 kg)', holgura: (290 - cargaRueda) / 100, minimo: 0 });

  return {
    A, FR, Cd, CdA, vol: vol + volCup, Paero, Proll, Pw, WhKm, pedWhKm: 0, autonomia, vmax: vmaxNominal, masas, mVeh, mTot, rangoMasa,
    Mmax, tension, seguridad, cargaRueda, solarPico, solarDia, kmSol, areas: ar, comprobaciones: ch,
    a1: { WhKm100, autonomia100, vmaxNominal, vmaxPico, acel50, acel100, pendiente100, cargaHoras, maleteroF, maleteroT, kmSolDia: kmSol, bateriaL: P.kWh * 1000 / P.whL, bateriaKg: masas['Batería'] },
  };
}

/** u del borde delantero (0) o trasero (1) de la puerta en la carrocería. */
function uDoorMid(m: ModeloA1, cual: 0 | 1) {
  const p = m.puertas.find(q => q.tipo === 'puerta' && q.superficie === 'cuerpo') ?? m.puertas.find(q => q.tipo === 'puerta')!;
  return cual ? p.u1 : p.u0;
}

/** Para el visor: cuánto se hunde una rueda y la geometría de su McPherson en reposo. */
export function suspensionA1(m: ModeloA1, i: number, comp: number) {
  const r = m.ruedas[i], s = Math.sign(r.z), del = i < 2;
  const zT = del ? m.torretas.zTF : m.torretas.zTR, xA = r.x;
  const hund = comp * TRAVEL_A1;
  const buje: P3 = [xA, r.r + hund, r.z];
  const rotula: P3 = [xA, r.r - 0.08 + hund, s * (Math.abs(r.z) - 0.06)];
  const arriba: P3 = [xA, r.r + 0.14 + hund, s * (Math.abs(r.z) - 0.08)];
  const torreta: P3 = [xA + 0.03, m.torretas.yTow, s * zT];
  const yAnc = (x: number) => Math.max(r.r - 0.06, m.frame(m.uDeX(x)).bot + 0.045);   // como en tubosChasis
  const brazos: [P3, P3][] = [[[xA + 0.14, yAnc(xA + 0.14), s * m.zR], rotula], [[xA - 0.14, yAnc(xA - 0.14), s * m.zR], rotula]];
  const disco = del ? DISCO_F : DISCO_R;
  return { buje, rotula, arriba, torreta, brazos, disco, s, del };
}

