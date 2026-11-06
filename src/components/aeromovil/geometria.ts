// ============================================================================
// AEROMÓVIL GOTA · geometría paramétrica (2026-11-05, Eugenio)
// ============================================================================
// Una sola fuente de verdad para el visor 3D, los planos de fabricación y la
// exportación a CAD. Es la MISMA geometría que genera el STEP con CadQuery
// (`public/aeromovil/aeromovil_cad.py`): si cambias una fórmula aquí, cámbiala
// allí también, o el plano y el STEP dejarán de coincidir.
//
// Ejes (metros): x hacia delante (eje de la rueda delantera en x = 0),
// y hacia arriba, z lateral. En el STEP: X delante, Y lateral, Z arriba, mm.
//
// ── AJUSTE AUTOMÁTICO DEL CARENADO (2026-11-05) ───────────────────────────
// Eugenio: «haz que el volumen interno sea un poco más pequeño… y que ese
// parámetro se pueda modificar con un slider; de esa manera el carenado es
// más grande o más pequeño». Con `auto` activo, el ancho y el alto no se
// eligen: se calculan para dejar exactamente `holgura` sobre las cabezas y
// junto a los hombros, y para que las laterales no rocen al inclinarse.

export type Pulgadas = '16' | '20' | '24' | '26' | '28';
export type Puerta = 'cabina' | 'gaviota' | 'aptera';

export interface Parametros {
  B: number;        // batalla: eje delantero a eje trasero (m)
  wF: Pulgadas;     // ruedas delantera y trasera
  wL: Pulgadas;     // ruedas laterales basculantes
  xLm: number;      // eje de las laterales: distancia desde el eje delantero (m)
  track: number;    // ancho del eje lateral: centro a centro de las laterales (m)
  xPil: number;     // asiento del piloto: distancia de la cadera al eje delantero (m)
  xPas: number;     // asientos traseros: distancia de la cadera al eje delantero (m)
  recPil: number;   // reclinado del respaldo del piloto (° desde la vertical)
  recPas: number;   // reclinado de los respaldos traseros (° desde la vertical)
  overF: number;    // hueco del morro: del borde de la rueda delantera a la punta del carenado (m)
  tail: number;     // hueco de la cola: del borde de la rueda trasera al final del carenado (m)
  horquilla: number;// inclinación del eje de dirección respecto a la vertical (°); + = arriba hacia atrás (bici)
  tailRound: number;// redondez de la punta de cola (0 = punta, 0,7 = muy roma)
  morro: number;    // forma del morro (0 = elíptico, 1 = muy romo, para pegarlo a la rueda)
  auto: boolean;    // ancho y alto ajustados a los ocupantes
  holgura: number;  // holgura interior con ajuste automático (m)
  W: number;        // ancho máximo (m), manual o calculado
  H: number;        // alto total (m), manual o calculado
  pmax: number;     // posición del espesor máximo (fracción)
  full: number;     // plenitud de cola
  tipH: number;     // altura de la punta de cola (fracción del alto del carenado)
  nU: number;       // forma de la sección superior
  nL: number;       // forma del fondo
  clear: number;    // altura libre del fondo (m)
  puerta: Puerta;   // forma de entrar
  spineD: number;   // tubo central Ø (mm)
  spineT: number;   // tubo central pared (mm)
  tiltMax: number;  // inclinación máxima de diseño (°)
  comp: number;     // compresión de suspensiones mostrada (0-1)
  mOcc: number;     // masa por ocupante (kg)
  pedal: number;    // potencia de pedaleo (W)
  speed: number;    // velocidad de cálculo (km/h)
  sol: number;      // horas de sol pico al día (kWh/m²·día)
  // ── Masas (2026-11-05, Eugenio: «estimar el peso… pudiendo modificar los
  // parámetros, como el peso de las ruedas, del motor, del chasis») ──────────
  matChasis: MaterialChasis;   // material de los tubos
  extraChasis: number;         // uniones, pletinas, soportes y tornillería (kg)
  mRueda: number;              // una rueda completa con neumático y disco (kg)
  mSuspension: number;         // horquilla + amortiguadores + rótulas (kg)
  mMotor: number;              // motor de buje (kg)
  mGenerador: number;          // generador de pedalier con bielas (kg)
  mBateria: number;            // una batería (kg); lleva cuatro
  mAsiento: number;            // una carcasa de asiento con su cojín (kg)
  matCarenado: MaterialCarenado;
  espCarenado: number;         // espesor del laminado (mm)
  espCristal: number;          // espesor del policarbonato (mm)
  mSolarM2: number;            // paneles flexibles laminados (kg/m²)
  mVarios: number;             // cableado, luces, frenos, controlador (kg)
}

export type MaterialChasis = 'al6061' | 'cromoly' | 'carbono';
export type MaterialCarenado = 'carbonoLino' | 'vidrio' | 'carbono';
/** Densidad (kg/m³) y límite elástico usable en la viga (MPa, ya soldada/pegada). */
export const MATERIALES_CHASIS: Record<MaterialChasis, { n: string; densidad: number; limite: number }> = {
  al6061: { n: 'Aluminio 6061-T6', densidad: 2700, limite: 240 },
  cromoly: { n: 'Acero cromoly 4130', densidad: 7850, limite: 460 },
  carbono: { n: 'Tubo de carbono', densidad: 1550, limite: 500 },
};
/** Masa del laminado por m² y por mm de espesor, con resina (kg/m²·mm). */
export const MATERIALES_CARENADO: Record<MaterialCarenado, { n: string; kgm2mm: number }> = {
  carbonoLino: { n: 'Carbono-lino', kgm2mm: 1.35 },
  vidrio: { n: 'Fibra de vidrio', kgm2mm: 1.85 },
  carbono: { n: 'Fibra de carbono', kgm2mm: 1.55 },
};
/** Mínimo y máximo de cada deslizador de masa: el rango «en el que nos manejamos». */
export const RANGOS_MASA = {
  extraChasis: [0.8, 5], mRueda: [1.2, 3.5], mSuspension: [2.5, 8], mMotor: [2.5, 6], mGenerador: [1.2, 4],
  mBateria: [2.2, 4], mAsiento: [0.8, 4], espCarenado: [0.6, 3], espCristal: [1.5, 5], mSolarM2: [1.2, 3.5], mVarios: [3, 15],
} as const;

// Los de un diseño nuevo: los que Eugenio fijó el 2026-11-05 a las 13:01
// («pon estos datos por defecto cuando se genere un nuevo diseño»). Lo que su
// pantalla de entonces enseñaba como palabra y no como número se recuperó
// ajustándolo a sus cifras (largo 4,00 m, volumen 3,27 m³, rueda delantera a
// 0,6 cm, suelo a 7,8 cm…): ruedas delantera y trasera de 24″, cola «roma» =
// 0,75, plenitud «afilada» = 1,2, fondo «plano» = 4,5. La forma del morro y el
// reclinado no existían aún: morro elíptico (0), respaldos a 28° y horquilla a
// 25°, como entonces. Con la horquilla más adelantada (menos grados) y ruedas
// de 24″ el tubo de dirección se sale del morro: las comprobaciones lo avisan.
export const PARAMETROS_POR_DEFECTO: Parametros = {
  B: 2.60, wF: '24', wL: '20', xLm: 1.22, track: 1.05, xPil: 1.12, xPas: 1.92, recPil: 28, recPas: 28, horquilla: 25,
  overF: 0.40, tail: 0.39, tailRound: 0.75, morro: 0, auto: false, holgura: 0.05, W: 1.29, H: 1.28,
  pmax: 0.60, full: 1.2, tipH: 0.70, nU: 2.6, nL: 4.5, clear: 0.21, puerta: 'cabina',
  spineD: 76.2, spineT: 3.0, tiltMax: 19, comp: 0, mOcc: 83, pedal: 200, speed: 25, sol: 4.5,
  matChasis: 'al6061', extraChasis: 2.2, mRueda: 1.9, mSuspension: 4.2, mMotor: 3.6, mGenerador: 2.1, mBateria: 2.9,
  mAsiento: 1.8, matCarenado: 'carbonoLino', espCarenado: 1.0, espCristal: 3.0, mSolarM2: 2.2, mVarios: 8,
};

export const DIAMETRO_RUEDA: Record<Pulgadas, number> = { '16': 0.405, '20': 0.508, '24': 0.61, '26': 0.66, '28': 0.70 };
export const TIRE_W = 0.055;
export const YS = 0.20;
export const SEAT_GAP = 0.235;
export const TRAVEL_F = 0.17;
export const TRAVEL_R = 0.15;
export const ARM_UP = 0.18;
export const HIP_Y = 0.36;
/**
 * La altura de los bajos a la que el interior está a las alturas de arriba
 * (YS, HIP_Y…). 2026-11-05, Eugenio: «permite también modificar la altura de
 * los bajos del vehículo». Subir los bajos sube el suelo entero —viga,
 * asientos, ocupantes, pedalier, motor—; las ruedas se quedan en el suelo y la
 * suspensión se estira hasta ellas. Antes el deslizador solo movía la piel, y
 * con 21 cm la viga central asomaba 5 cm por debajo del carenado.
 */
export const BAJOS_BASE = 0.13;
/** Desplazamiento de la horquilla (offset). El modelo lleva las barras sobre el eje de dirección (corona sin desplazamiento): así el avance sale positivo también con la horquilla poco inclinada. */
export const OFFSET_HORQUILLA = 0;
/** Una célula solar de 6 pulgadas: el tamaño del cuadriculado de los paneles. */
export const CELULA = 0.1565;
/** Rendimiento de los paneles (células de silicio monocristalino flexibles). */
export const RENDIMIENTO_SOLAR = 0.21;

const spow = (v: number, p: number) => Math.sign(v) * Math.pow(Math.abs(v), p);

export interface Seccion { s: number; x: number; zc: number; top: number; bot: number; hw: number }
export type P3 = [number, number, number];

export interface Tubo {
  nombre: string;
  grupo: 'Chasis' | 'Suspensión' | 'Dirección';
  a: P3; b: P3;
  d: number;        // diámetro exterior (m)
  pared: number;    // espesor (m); 0 = macizo o comprado
  material: string;
  comprado?: boolean;
  /** Tubo curvado: puntos de paso de `a` a `b` (incluidos). Sin él, recto. */
  curva?: P3[];
}

/** Zona de la piel en coordenadas (u, θ): u a lo largo, θ alrededor (π/2 = arriba). */
export interface Zona { u0: number; u1: number; t0: number; t1: number }
export type Piel = 'carroceria' | 'cristal' | 'solar';
export interface ZonaPiel extends Zona { piel: Piel; nombre: string }
export interface ZonaPuerta extends Zona { id: string; nombre: string }

/** Todo lo que sale de los parámetros: medidas derivadas y funciones de forma. */
export function crearModelo(P: Parametros) {
  const rF = DIAMETRO_RUEDA[P.wF] / 2, rL = DIAMETRO_RUEDA[P.wL] / 2, rR = rF;
  const xn = rF + P.overF, xR = -P.B, xt = xR - rR - P.tail, Lf = xn - xt;
  const xL = -P.xLm, Hb = P.H - P.clear;
  const xPil = -P.xPil, xPas = -P.xPas;
  // El suelo del vehículo: todo lo que va colgado del chasis sube y baja con
  // la altura de los bajos (`clear`). `ys` es la altura del eje de la viga y
  // `hip` la de la cadera; YS y HIP_Y son sus valores con los bajos a BAJOS_BASE.
  const dY = P.clear - BAJOS_BASE, ys = YS + dY, hip = HIP_Y + dY;
  // El pedalier no sube con el suelo: su sitio lo marca la horquilla (subirlo
  // mete los pedales en la corona). Solo se levanta si la viga lo alcanza.
  const BB: [number, number] = [Math.min(-0.43, xPil + 0.90), Math.max(0.48, ys + 0.10)];
  const PIV: [number, number] = [xR + 0.68, ys + 0.03];
  const A2C = rF + 0.06 + TRAVEL_F + 0.07;
  // Eje de dirección, hacia arriba. 2026-11-05, Eugenio: «que se pueda
  // modificar la inclinación de la horquilla… más inclinada hacia delante para
  // dejar más hueco al pedal». Menos grados = la parte de arriba se va hacia
  // delante y se aleja de los pies.
  const HEAD = P.horquilla * Math.PI / 180;
  const AX: [number, number] = [-Math.sin(HEAD), Math.cos(HEAD)];
  /** Avance (trail): lo que estabiliza la dirección. Bici de paseo ≈ 6 cm. */
  const avance = (rF * Math.sin(HEAD) - OFFSET_HORQUILLA) / Math.cos(HEAD);
  const ARM_A = P.track / 2 - 0.08;

  // ── El perfil: morro elíptico, cola en coseno y punta redondeada ─────────
  // La punta: la cola se corta antes de llegar a cero y se cierra con un
  // cuarto de elipse. `tailRound` dice cuánto antes (0 = la punta de siempre).
  const p = P.pmax;
  const base = (t: number) => Math.pow((1 + Math.cos(Math.PI * t)) / 2, P.full);
  const tCorte = 1 - P.tailRound * 0.55;
  const sCorte = base(tCorte);
  // Largo de la tapa, en fracción de la cola: lo justo para que sea redonda.
  const largoCola = (1 - p) * Lf;
  const tapa = Math.min(0.45, Math.max(0.02, (sCorte * Math.min(P.W / 2, Hb / 2) * 0.95) / Math.max(0.05, largoCola)));
  const prof = (u: number) => {
    if (u <= 0 || u >= 1) return 0;
    // Morro: elipse (exponente 0,5) que se vuelve más roma al subir `morro`,
    // para poder acercar la punta del carenado a la rueda delantera.
    if (u < p) { const a = (p - u) / p; return Math.pow(Math.max(0, 1 - a * a), 0.5 - 0.32 * P.morro); }
    const t = (u - p) / (1 - p);
    if (P.tailRound <= 0.001) return base(t);
    if (t <= 1 - tapa) return base(t * tCorte / (1 - tapa));
    const q = (t - (1 - tapa)) / tapa;
    return sCorte * Math.sqrt(Math.max(0, 1 - q * q));
  };
  const zcAt = (u: number) => P.clear + Hb * (0.32 + (P.tipH - 0.32) * u);
  const aT = P.H - zcAt(p);
  const frame = (u: number): Seccion => {
    const s = prof(u), zc = zcAt(u);
    const g = Math.min(1, u < p ? 1.15 * Math.pow(s, 0.7) : 1.6 * Math.pow(s, 0.5));
    return { s, x: xn - u * Lf, zc, top: zc + aT * s, bot: zc - (zc - P.clear) * g, hw: P.W / 2 * Math.pow(s, 0.9) };
  };
  const sec = (f: Seccion, th: number, off = 0): P3 => {
    const c = Math.cos(th), sn = Math.sin(th), up = sn >= 0, n = up ? P.nU : P.nL;
    const ez = spow(c, 2 / n), ey = spow(sn, 2 / n), k = Math.min(1, f.s * 6), o = off * k;
    const y = f.zc + (up ? (f.top - f.zc + o) : (f.zc - f.bot + o)) * ey;
    return [f.x, y, (f.hw + o) * ez];
  };
  const uDeX = (x: number) => Math.min(0.999, Math.max(0.001, (xn - x) / Lf));
  /** Holgura radial (m) de un punto al carenado; negativa = se sale. */
  const gap = (x: number, y: number, z: number) => {
    const u = (xn - x) / Lf;
    if (u <= 0.001 || u >= 0.999) return -1;
    const f = frame(u), above = y >= f.zc, n = above ? P.nU : P.nL;
    const ay = above ? f.top - f.zc : f.zc - f.bot;
    if (f.hw < 1e-4 || ay < 1e-4) return -1;
    const v = Math.pow(Math.abs(z) / f.hw, n) + Math.pow(Math.abs(y - f.zc) / ay, n);
    const sc = Math.pow(v, 1 / n);
    return Math.hypot(z, y - f.zc) * (1 / sc - 1);
  };

  const crown: [number, number] = [AX[0] * A2C, rF + AX[1] * A2C];
  const htb: [number, number] = [crown[0] + AX[0] * 0.02, crown[1] + AX[1] * 0.02];
  const htt: [number, number] = [crown[0] + AX[0] * 0.16, crown[1] + AX[1] * 0.16];
  // ── El cuadro, al estilo de las reclinadas de batalla larga (2026-11-05,
  // Eugenio, con fotos de una Tour Easy: «el pedal está en la unión de dos
  // barras… una barra que conecta la barra superior y la inferior… la barra
  // superior curva, para que no le dé en los huevos al piloto en caso de
  // frenada… y que no tengas que levantar la pierna para montarte»).
  //   · Tubo bajo: de la dirección al pedalier, en cuello de cisne para que la
  //     rueda delantera no lo toque con la horquilla hundida.
  //   · Viga inferior: del pedalier baja hasta la viga central, justo delante
  //     del asiento del piloto (punto M).
  //   · Barra superior curva: sale de lo alto de la dirección, baja entre las
  //     piernas por debajo de la entrepierna y se junta con la viga en M: el
  //     triángulo de delante se cierra donde el piloto se sienta.
  //   · Barra de unión: entre la barra superior y la inferior.
  // El asiento del piloto apoya directamente en la viga: no sube nada.
  const M: [number, number] = [xPil + 0.32, ys];
  /** Espesor de la base del asiento: lo que cabe entre la viga y el apoyo de la cadera. */
  const grosorBase = () => Math.max(0.012, Math.min(0.04, (hip - 0.10) - (ys + P.spineD / 2000) - 0.003));
  /** Un punto del respaldo: `t` a lo largo del tronco, `o` hacia atrás. */
  const respaldoEn = (piloto: boolean, t: number, o: number): [number, number] => {
    const R = (piloto ? P.recPil : P.recPas) * Math.PI / 180, hx = piloto ? xPil : xPas;
    return [hx - Math.sin(R) * t - Math.cos(R) * o, hip + Math.cos(R) * t - Math.sin(R) * o];
  };
  const sf = M[0], sr = PIV[0] - 0.06;
  const bez = (p: [number, number][], t: number): [number, number] => {
    const u = 1 - t, w = p.length === 3 ? [u * u, 2 * u * t, t * t] : [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    return [w.reduce((a, k, i) => a + k * p[i][0], 0), w.reduce((a, k, i) => a + k * p[i][1], 0)];
  };
  const ctrlBajo: [number, number][] = [htb, [BB[0] - 0.11, htb[1] - 0.14], [BB[0], BB[1]]];
  const ctrlSup: [number, number][] = [htt, [htt[0] - 0.20, htt[1] - 0.20], [M[0] + 0.30, M[1] + 0.16], M];
  const curvaBajo = [0, 0.25, 0.5, 0.75, 1].map(t => bez(ctrlBajo, t));
  const curvaSup = [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => bez(ctrlSup, t));
  const uSup = bez(ctrlSup, 0.6), uInf: [number, number] = [BB[0] + (M[0] - BB[0]) * 0.4, BB[1] + (M[1] - BB[1]) * 0.4];
  // Reclinado de cada fila (2026-11-05, Eugenio: «permite ajustar el
  // reclinamiento del asiento tanto del piloto como de los pasajeros»).
  const recDe = (piloto: boolean) => (piloto ? P.recPil : P.recPas) * Math.PI / 180;
  const hombroPil: [number, number] = [xPil - Math.sin(recDe(true)) * 0.5, hip + Math.cos(recDe(true)) * 0.5];
  // Las manos: 40 cm por delante del hombro y a la altura del esternón.
  const puno: [number, number] = [hombroPil[0] + 0.40, hombroPil[1] - 0.09];
  // ── Manillar chopper, directo a la horquilla (2026-11-05, Eugenio: «una
  // barra que sale de la horquilla, donde el manillar está en modo chopper;
  // ahí es donde también tienes el sistema de frenos»). La potencia sale del
  // tubo de la horquilla hacia atrás y el manillar vuelve hasta las manos por
  // fuera de las rodillas. Gira con la rueda: ya no hay mástil ni bieleta.
  const anchoPunos = 0.22;
  const potencia: [number, number] = [htt[0] + AX[0] * 0.035, htt[1] + AX[1] * 0.035];
  const abrazadera: [number, number] = [potencia[0] - 0.07, potencia[1] - 0.03];
  const manillar = (s: number): P3[] => [
    [abrazadera[0], abrazadera[1], 0],
    [abrazadera[0] - 0.06, abrazadera[1] - 0.01, s * 0.12],
    [abrazadera[0] + (puno[0] - abrazadera[0]) * 0.55, abrazadera[1] + (puno[1] - abrazadera[1]) * 0.4, s * (anchoPunos + 0.08)],
    [puno[0] + 0.10, puno[1] + 0.015, s * anchoPunos],
    [puno[0] - 0.06, puno[1] - 0.01, s * anchoPunos],
  ];
  const xCruceta = xPas - 0.08;   // travesaño de los asientos traseros y anclaje del amortiguador
  /** Gira un punto `a` radianes alrededor del eje de dirección (pasa por la corona). */
  const girarDireccion = (q: P3, a: number): P3 => {
    const v = [q[0] - crown[0], q[1] - crown[1], q[2]], k = [AX[0], AX[1], 0];
    const kv = k[0] * v[0] + k[1] * v[1], c = Math.cos(a), sn = Math.sin(a);
    const cr = [k[1] * v[2], -k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
    return [crown[0] + v[0] * c + cr[0] * sn + k[0] * kv * (1 - c), crown[1] + v[1] * c + cr[1] * sn + k[1] * kv * (1 - c), v[2] * c + cr[2] * sn];
  };
  const de2 = (q: [number, number], z = 0): P3 => [q[0], q[1], z];

  /** El chasis fabricable, tubo a tubo (lo que dibujan el visor y el plano). */
  const tubosChasis = (): Tubo[] => {
    const AL = 'Al 6061-T6';
    const t: Tubo[] = [
      { nombre: 'Viga central', grupo: 'Chasis', a: [sf, ys, 0], b: [sr, ys, 0], d: P.spineD / 1000, pared: P.spineT / 1000, material: AL },
      { nombre: 'Tubo de dirección', grupo: 'Chasis', a: de2(htb), b: de2(htt), d: 0.05, pared: 0.003, material: AL },
      { nombre: 'Tubo bajo (cuello de cisne)', grupo: 'Chasis', a: de2(htb), b: de2(BB), d: 0.045, pared: 0.002, material: AL, curva: curvaBajo.map(q => de2(q)) },
      { nombre: 'Viga inferior (pedalier a viga)', grupo: 'Chasis', a: de2(BB), b: de2(M), d: 0.045, pared: 0.002, material: AL },
      { nombre: 'Barra superior curva', grupo: 'Chasis', a: de2(htt), b: de2(M), d: 0.04, pared: 0.002, material: AL, curva: curvaSup.map(q => de2(q)) },
      { nombre: 'Barra de unión', grupo: 'Chasis', a: de2(uSup), b: de2(uInf), d: 0.03, pared: 0.002, material: AL },
      { nombre: 'Caja del pedalier', grupo: 'Chasis', a: [BB[0], BB[1], -0.034], b: [BB[0], BB[1], 0.034], d: 0.045, pared: 0.004, material: AL },
      { nombre: 'Travesaño asientos traseros', grupo: 'Chasis', a: [xCruceta, ys, -0.33], b: [xCruceta, ys, 0.33], d: 0.035, pared: 0.002, material: AL },
      { nombre: 'Tirante del respaldo del piloto', grupo: 'Chasis', a: [xPil - 0.10, ys, 0], b: de2(respaldoEn(true, 0.36, 0.145)), d: 0.025, pared: 0.002, material: AL },
      { nombre: 'Soporte asiento trasero izq.', grupo: 'Chasis', a: [xCruceta, ys, SEAT_GAP], b: [xCruceta, hip - 0.10 - grosorBase(), SEAT_GAP], d: 0.025, pared: 0.002, material: AL },
      { nombre: 'Soporte asiento trasero der.', grupo: 'Chasis', a: [xCruceta, ys, -SEAT_GAP], b: [xCruceta, hip - 0.10 - grosorBase(), -SEAT_GAP], d: 0.025, pared: 0.002, material: AL },
      { nombre: 'Poste del basculante', grupo: 'Chasis', a: [xL, ys, 0], b: [xL, ys + ARM_UP + 0.04, 0], d: 0.04, pared: 0.003, material: AL },
      { nombre: 'Potencia del manillar', grupo: 'Dirección', a: de2(potencia), b: de2(abrazadera), d: 0.032, pared: 0, material: 'Comprado (potencia MTB 70 mm)', comprado: true },
    ];
    for (const s of [1, -1]) {
      const lado = s > 0 ? 'izq.' : 'der.', c = manillar(s);
      t.push({ nombre: `Manillar chopper, mitad ${lado}`, grupo: 'Dirección', a: c[0], b: c[c.length - 1], d: 0.0222, pared: 0.0018, material: AL + ' curvado', curva: c });
      // Maneta y bomba de freno hidráulico junto al puño; la izquierda frena delante.
      t.push({ nombre: `Bomba de freno ${lado}`, grupo: 'Dirección', a: [puno[0] + 0.07, puno[1] + 0.01, s * (anchoPunos - 0.03)], b: [puno[0] + 0.07, puno[1] - 0.03, s * (anchoPunos + 0.02)], d: 0.024, pared: 0, material: 'Comprado (freno de disco hidráulico)', comprado: true });
      t.push({ nombre: `Maneta de freno ${lado}`, grupo: 'Dirección', a: [puno[0] + 0.07, puno[1] - 0.03, s * (anchoPunos + 0.03)], b: [puno[0] - 0.06, puno[1] - 0.045, s * (anchoPunos + 0.035)], d: 0.012, pared: 0, material: 'Comprado (freno de disco hidráulico)', comprado: true });
      t.push({ nombre: `Latiguillo de freno ${lado}`, grupo: 'Dirección', a: [puno[0] + 0.07, puno[1] - 0.01, s * anchoPunos], b: s > 0 ? [crown[0], crown[1], 0.09] : [xR + 0.2, rR + 0.05, -0.08], d: 0.005, pared: 0, material: 'Comprado (latiguillo)', comprado: true,
        curva: s > 0
          ? [[puno[0] + 0.07, puno[1] - 0.01, s * anchoPunos], c[2], [abrazadera[0], abrazadera[1] - 0.02, 0.04], [htb[0] + 0.02, htb[1], 0.06], [crown[0], crown[1], 0.09]]
          : [[puno[0] + 0.07, puno[1] - 0.01, s * anchoPunos], c[2], [abrazadera[0] - 0.02, abrazadera[1] - 0.04, -0.03], [uSup[0], uSup[1], -0.025], [M[0], M[1] + 0.03, -0.03], [xL + 0.1, ys + 0.03, -0.03], [xR + 0.2, rR + 0.05, -0.08]] });
    }
    for (const s of [-1, 1]) {
      t.push({ nombre: `Basculante trasero, brazo ${s > 0 ? 'izq.' : 'der.'}`, grupo: 'Suspensión', a: [PIV[0], PIV[1], s * 0.075], b: [xR, rR, s * 0.075], d: 0.032, pared: 0.002, material: AL });
    }
    t.push({ nombre: 'Eje del pivote trasero', grupo: 'Suspensión', a: [PIV[0], PIV[1], -0.08], b: [PIV[0], PIV[1], 0.08], d: 0.03, pared: 0.004, material: AL });
    t.push({ nombre: 'Balancín del amortiguador', grupo: 'Suspensión', a: [PIV[0], PIV[1], 0], b: [PIV[0], PIV[1] + 0.13, 0], d: 0.03, pared: 0.003, material: AL });
    for (const yy of [ys, ys + ARM_UP]) for (const dx of [-0.03, 0.03]) {
      t.push({ nombre: `Brazo del paralelogramo ${yy === ys ? 'inferior' : 'superior'} ${dx < 0 ? 'trasero' : 'delantero'}`, grupo: 'Suspensión', a: [xL + dx, yy, -ARM_A], b: [xL + dx, yy, ARM_A], d: 0.025, pared: 0.002, material: AL });
    }
    for (const s of [-1, 1]) {
      t.push({ nombre: `Mangueta lateral ${s > 0 ? 'izq.' : 'der.'}`, grupo: 'Suspensión', a: [xL, Math.min(ys, rL) - 0.02, s * ARM_A], b: [xL, ys + ARM_UP + 0.02, s * ARM_A], d: 0.035, pared: 0.003, material: AL });
    }
    return t;
  };

  const ikKnee = (h: [number, number], f: [number, number], l1: number, l2: number): [number, number] => {
    const dx = f[0] - h[0], dy = f[1] - h[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3);
    const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), b = Math.atan2(dy, dx);
    return [h[0] + l1 * Math.cos(b + a), h[1] + l1 * Math.sin(b + a)];
  };
  /** Puntos del maniquí: cadera, hombro, cabeza, rodilla y pie. */
  const occPts = (piloto: boolean) => {
    const hx = piloto ? xPil : xPas;
    const REC = recDe(piloto);
    const d: [number, number] = [-Math.sin(REC), Math.cos(REC)];
    const H: [number, number] = [hx, hip];
    const S: [number, number] = [hx + d[0] * 0.5, hip + d[1] * 0.5];
    const C: [number, number] = [hx + d[0] * 0.7, hip + d[1] * 0.7];
    // Los pies de atrás se quedan detrás del paralelogramo de las laterales.
    const F: [number, number] = piloto ? [BB[0], BB[1]] : [Math.min(hx + 0.56, xL - 0.145), 0.17 + dY];
    // Manos: el piloto en los puños del manillar; los pasajeros sobre los muslos.
    const K = ikKnee(H, F, 0.45, 0.47);
    const mano: [number, number] = piloto ? [puno[0], puno[1]] : [H[0] + (K[0] - H[0]) * 0.62, H[1] + (K[1] - H[1]) * 0.62 + 0.07];
    const anchoMano = piloto ? anchoPunos : 0.13;
    return { H, S, C, K, F, d, hx, mano, anchoMano };
  };
  // ── Asiento ligero de base y respaldo, con reposacabezas (2026-11-05,
  // Eugenio: «este asiento me gusta porque es más ligero, pero le falta un
  // reposacabezas»). Base acolchada sobre una bandeja, respaldo alto sobre un
  // marco de tubo y cabecero detrás de la cabeza. Las tres plazas iguales.
  // La base del piloto apoya en la viga central: su espesor es el hueco que
  // queda entre la viga y la cadera, para no subir al piloto ni un milímetro.
  const asientoPiezas = (piloto: boolean) => {
    const hx = piloto ? xPil : xPas, REC = recDe(piloto), g = grosorBase();
    const d: [number, number] = [-Math.sin(REC), Math.cos(REC)], pb: [number, number] = [-Math.cos(REC), -Math.sin(REC)];
    const en = (t: number, o: number): [number, number] => [hx + d[0] * t + pb[0] * o, hip + d[1] * t + pb[1] * o];
    const arriba: [number, number][] = [[hx + 0.34, hip - 0.055], [hx + 0.22, hip - 0.085], [hx + 0.06, hip - 0.10], [hx - 0.05, hip - 0.10]];
    const base = arriba.concat(arriba.map(q => [q[0], q[1] - g] as [number, number]).reverse());
    const panel = (t0: number, t1: number, o0: number, o1: number) => [en(t0, o0), en(t1, o0), en(t1, o1), en(t0, o1)];
    const respaldo = panel(0.06, 0.58, 0.105, 0.135);
    const cabecero = panel(0.63, 0.77, 0.105, 0.145);
    // Marco: dos tubos por detrás del respaldo, de la bandeja al cabecero.
    const marco: [number, number][] = [[hx - 0.04, hip - 0.10 - g], en(0.10, 0.142), en(0.58, 0.142), en(0.70, 0.15)];
    return { base, respaldo, cabecero, marco, anchoCabecero: piloto ? 0.24 : 0.22 };
  };
  // ── La piel: cristal delante y a los lados, paneles solares arriba ───────
  // Eugenio: «la parte de arriba tiene que estar llena de paneles solares…
  // no todo transparente, que si no haría efecto invernadero. Inspírate en el
  // Aptera». Parabrisas desde el pedalier hasta encima de la frente del
  // piloto; ventanillas a los lados de las dos filas; el resto del techo y la
  // cubierta trasera, paneles.
  const cabezaPil = occPts(true).C[0], cabezaPas = occPts(false).C[0];
  const uParabrisas0 = uDeX(BB[0] + 0.13);
  const uParabrisas1 = uDeX(cabezaPil + 0.22);
  const uVentanas1 = uDeX(cabezaPas - 0.05);
  const uSolar1 = Math.min(0.95, uDeX(xR - rR * 0.3));
  const zonasPiel: ZonaPiel[] = [
    { nombre: 'Parabrisas', piel: 'cristal', u0: uParabrisas0, u1: uParabrisas1, t0: 0.13 * Math.PI, t1: 0.87 * Math.PI },
    { nombre: 'Ventanilla izquierda', piel: 'cristal', u0: uParabrisas1, u1: uVentanas1, t0: 0.13 * Math.PI, t1: 0.30 * Math.PI },
    { nombre: 'Ventanilla derecha', piel: 'cristal', u0: uParabrisas1, u1: uVentanas1, t0: 0.70 * Math.PI, t1: 0.87 * Math.PI },
    { nombre: 'Paneles solares del techo', piel: 'solar', u0: uParabrisas1, u1: uSolar1, t0: 0.30 * Math.PI, t1: 0.70 * Math.PI },
  ];

  // ── Las puertas: qué trozo de piel se abre y alrededor de qué eje ────────
  const uPuerta0 = uDeX(xPil + 0.45), uPuerta1 = uDeX(cabezaPas - 0.12);
  const puertas: (ZonaPuerta & { bisagra: [P3, P3]; angulo: number })[] = [];
  if (P.puerta === 'cabina') {
    // Cúpula de ultraligero: parabrisas, ventanillas y techo de una pieza,
    // con bisagra delante; bascula hacia arriba y hacia delante.
    const f0 = frame(uParabrisas0);
    const yB = sec(f0, 0.13 * Math.PI)[1];
    puertas.push({ id: 'cupula', nombre: 'Cúpula basculante', u0: uParabrisas0, u1: uPuerta1, t0: 0.13 * Math.PI, t1: 0.87 * Math.PI,
      bisagra: [[f0.x, yB, -1], [f0.x, yB, 1]], angulo: -58 });
  } else if (P.puerta === 'gaviota') {
    // Alas de gaviota: una puerta por lado, bisagra en el centro del techo.
    const fA = frame(uPuerta0), fB = frame(uPuerta1);
    const yA = sec(fA, Math.PI / 2)[1], yC = sec(fB, Math.PI / 2)[1];
    puertas.push({ id: 'izq', nombre: 'Puerta izquierda', u0: uPuerta0, u1: uPuerta1, t0: 0.02 * Math.PI, t1: 0.5 * Math.PI,
      bisagra: [[fB.x, yC, 0], [fA.x, yA, 0]], angulo: -75 });
    puertas.push({ id: 'der', nombre: 'Puerta derecha', u0: uPuerta0, u1: uPuerta1, t0: 0.5 * Math.PI, t1: 0.98 * Math.PI,
      bisagra: [[fA.x, yA, 0], [fB.x, yC, 0]], angulo: -75 });
  } else {
    // Tipo Aptera: puertas laterales con bisagra delante, que suben y se
    // abren hacia fuera (diedro), una por lado y de las dos filas.
    const fA = frame(uPuerta0);
    for (const s of [1, -1]) {
      const pA = sec(fA, s > 0 ? 0.10 * Math.PI : 0.90 * Math.PI), pB = sec(fA, s > 0 ? 0.40 * Math.PI : 0.60 * Math.PI);
      puertas.push({ id: s > 0 ? 'izq' : 'der', nombre: `Puerta ${s > 0 ? 'izquierda' : 'derecha'}`, u0: uPuerta0, u1: uPuerta1,
        t0: s > 0 ? -0.06 * Math.PI : 0.62 * Math.PI, t1: s > 0 ? 0.38 * Math.PI : 1.06 * Math.PI,
        bisagra: s > 0 ? [pA, pB] : [pB, pA], angulo: 62 });
    }
  }

  return {
    P, dY, ys, hip, AX, avance, recDe, puno, anchoPunos, manillar, potencia, abrazadera, M, rF, rR, rL, xn, xt, xR, xL, xPil, xPas, BB, Lf, Hb, PIV, A2C, ARM_A, crown, htt, sf, sr, xCruceta,
    frame, sec, gap, uDeX, occPts, asientoPiezas, grosorBase, tubosChasis, zonasPiel, puertas, rodilla: (h: [number, number], f: [number, number]) => ikKnee(h, f, 0.45, 0.47), girarDireccion,
  };
}
export type Modelo = ReturnType<typeof crearModelo>;

/** Los tramos rectos de un tubo: uno si es recto; la curva muestreada si está curvado. */
export function tramosTubo(t: Tubo, n = 24): [P3, P3][] {
  if (!t.curva) return [[t.a, t.b]];
  const q = muestrearCurva(t.curva, n), o: [P3, P3][] = [];
  for (let i = 0; i < q.length - 1; i++) o.push([q[i], q[i + 1]]);
  return o;
}
/** Catmull-Rom centrípeta por los puntos de paso (la misma curva que dibuja el visor). */
export function muestrearCurva(pts: P3[], n = 24): P3[] {
  if (pts.length < 3) return pts;
  const o: P3[] = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const k = Math.max(2, Math.round(n / (pts.length - 1)));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      o.push([0, 1, 2].map(c => 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)) as P3);
    }
  }
  o.push(pts[pts.length - 1]);
  return o;
}
export const largoTubo = (t: Tubo) => tramosTubo(t).reduce((L, [a, b]) => L + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), 0);

/** Contorno de una sección (cuaderna) en su plano: [z, y] en metros. */
export function contornoSeccion(m: Modelo, u: number, n = 96): [number, number][] {
  const f = m.frame(u);
  const out: [number, number][] = [];
  for (let j = 0; j < n; j++) { const q = m.sec(f, 2 * Math.PI * j / n); out.push([q[2], q[1]]); }
  return out;
}

/** Holgura mínima sobre las cabezas y junto a los hombros (lo que ajusta `auto`). */
function holguras(m: Modelo) {
  let techo = 9;
  for (const pil of [true, false]) { const o = m.occPts(pil); techo = Math.min(techo, m.frame(m.uDeX(o.C[0])).top - (o.C[1] + 0.11)); }
  const o = m.occPts(false);
  const hombro = Math.min(m.gap(o.S[0], o.S[1], SEAT_GAP + 0.19), m.gap(o.C[0], o.C[1] + 0.05, SEAT_GAP + 0.11));
  const ph = m.P.tiltMax * Math.PI / 180;
  let lateral = 9;
  const cy = m.rL + m.ARM_A * Math.sin(ph), z = m.ARM_A * Math.cos(ph) + 0.08 + TIRE_W / 2;
  for (let k = 0; k < 72; k++) { const a = 2 * Math.PI * k / 72, y = cy + m.rL * Math.sin(a); if (y > m.P.clear + 0.06) lateral = Math.min(lateral, m.gap(m.xL + m.rL * Math.cos(a), y, z)); }
  return { techo, hombro, lateral };
}

/** Con `auto`, calcula el ancho y el alto que dejan exactamente la holgura pedida. */
export function ajustarCarenado(P: Parametros): Parametros {
  if (!P.auto) return P;
  const biseccion = (f: (v: number) => number, lo: number, hi: number) => {
    for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (f(mid) < 0) lo = mid; else hi = mid; }
    return hi;
  };
  let Q = { ...P };
  for (let ronda = 0; ronda < 3; ronda++) {
    const H = biseccion(h => holguras(crearModelo({ ...Q, H: h })).techo - P.holgura, 0.9, 2.2);
    Q = { ...Q, H: Math.round(H * 1000) / 1000 };
    const W = biseccion(w => { const g = holguras(crearModelo({ ...Q, W: w })); return Math.min(g.hombro - P.holgura, g.lateral - 0.01); }, 0.9, 2.4);
    Q = { ...Q, W: Math.round(W * 1000) / 1000 };
  }
  return Q;
}

export interface Comprobacion { nombre: string; holgura: number; minimo: number }

/** Áreas, resistencia, energía, estructura y holguras. Todo estimación. */
export function calcular(m: Modelo, ar: ReturnType<typeof areas>) {
  const P = m.P;
  let A = 0, vol = 0;
  const N = 100;
  for (let i = 1; i < N; i++) {
    const c = contornoSeccion(m, i / N, 72);
    let a = 0;
    for (let j = 0; j < c.length; j++) { const p = c[j], q = c[(j + 1) % c.length]; a += p[0] * q[1] - q[0] * p[1]; }
    a = Math.abs(a) / 2; A = Math.max(A, a); vol += a * m.Lf / N;
  }
  A += 4 * TIRE_W * P.clear * 0.8;
  const Deq = Math.sqrt(4 * A / Math.PI), FR = m.Lf / Deq;
  let Cd = 0.10 + 0.012 * (FR - 4.5) ** 2 + 0.15 * (P.pmax - 0.38) ** 2 + 0.06 * Math.abs(P.tipH - 0.45) + 0.025
    + Math.max(0, P.nL - 3) * 0.004 + 0.03 * P.tailRound ** 2 + 0.006 /* retrovisores */;
  Cd = Math.min(0.5, Math.max(0.12, Cd));
  const CdA = Cd * A;

  const masas = estimarMasas(m, ar, P);
  const mVeh = Object.values(masas).reduce((a, b) => a + b, 0), mTot = mVeh + 3 * P.mOcc;
  // El rango posible: todo al mínimo (y los materiales más ligeros) y todo al máximo.
  const extremo = (lado: 0 | 1) => {
    const Q: Parametros = { ...P, matChasis: lado ? 'cromoly' : 'carbono', matCarenado: lado ? 'vidrio' : 'carbonoLino' };
    for (const [k, r] of Object.entries(RANGOS_MASA)) (Q as any)[k] = r[lado];
    return Object.values(estimarMasas(m, ar, Q)).reduce((a, b) => a + b, 0);
  };
  const rangoMasa: [number, number] = [extremo(0), extremo(1)];

  const v = P.speed / 3.6, Crr = 0.0065, eta = 0.85;
  const Paero = 0.5 * 1.2 * CdA * v ** 3, Proll = Crr * mTot * 9.81 * v, Pw = (Paero + Proll) / eta;
  const WhKm = Pw / v / 3.6, pedWhKm = P.pedal * 0.70 / v / 3.6;
  const autonomia = 2000 * 0.9 / Math.max(0.1, WhKm - pedWhKm);
  let vmax = 1;
  for (let i = 0; i < 60; i++) { const P2 = (0.5 * 1.2 * CdA * vmax ** 3 + Crr * mTot * 9.81 * vmax) / eta; vmax *= Math.pow(250 / P2, 0.33); }
  // Sol: la superficie que mira al cielo produce, de media, ~70 % de la plana.
  const solarPico = ar.solar * RENDIMIENTO_SOLAR * 1000;
  const solarDia = ar.solar * 0.7 * RENDIMIENTO_SOLAR * P.sol * 1000 * 0.85;
  const kmSol = solarDia / Math.max(0.1, WhKm);

  // Viga: dos vanos apoyados (delantera-laterales y laterales-trasera)
  const cargas: [number, number][] = [[m.xPil, (P.mOcc + 1.8 + 5.8) * 9.81], [m.xPas, (2 * P.mOcc + 3.6 + 5.8) * 9.81]];
  const apoyos = [0, m.xL, m.xR], R = [0, 0, 0];
  let Mmax = 0;
  for (const [x, F] of cargas) {
    const k = x >= m.xL ? 0 : 1, x0 = apoyos[k], x1 = apoyos[k + 1], L = Math.abs(x1 - x0), a = Math.abs(x - x0), b = L - a;
    if (b < 0) continue;
    Mmax = Math.max(Mmax, F * a * b / L); R[k] += F * b / L; R[k + 1] += F * a / L;
  }
  const Dm = P.spineD, Wmod = Math.PI * (Dm ** 4 - (Dm - 2 * P.spineT) ** 4) / (32 * Dm);
  const tension = 2.5 * Mmax * 1000 / Wmod, seguridad = MATERIALES_CHASIS[P.matChasis].limite / tension;
  const cargaRueda = Math.max(R[0] / 9.81 + mVeh / 4, R[1] / 2 / 9.81 + mVeh / 4, R[2] / 9.81 + mVeh / 4);

  // Holguras
  const ch: Comprobacion[] = [];
  for (const [nombre, pil] of [['Techo sobre el piloto', true], ['Techo sobre los pasajeros', false]] as const) {
    const o = m.occPts(pil);
    ch.push({ nombre, holgura: m.frame(m.uDeX(o.C[0])).top - (o.C[1] + 0.11), minimo: 0.03 });
  }
  const h = holguras(m);
  ch.push({ nombre: 'Hombros traseros al carenado', holgura: h.hombro, minimo: 0.03 });
  const op = m.occPts(true);
  ch.push({ nombre: 'Rodillas del piloto al carenado', holgura: Math.min(m.gap(op.K[0], op.K[1] + 0.06, 0.12 + 0.07), m.gap(op.K[0], op.K[1] + 0.07, 0)), minimo: 0.02 });
  const wg = (x: number, z: number, r: number, cy: number) => {
    let mn = 9;
    for (let k = 0; k < 72; k++) { const a = 2 * Math.PI * k / 72, y = cy + r * Math.sin(a); if (y > P.clear + 0.06) mn = Math.min(mn, m.gap(x + r * Math.cos(a), y, z)); }
    return mn;
  };
  ch.push({ nombre: 'Rueda delantera con la horquilla comprimida', holgura: wg(m.AX[0] * TRAVEL_F, 0, m.rF, m.rF + m.AX[1] * TRAVEL_F), minimo: 0.02 });
  // Pies y bielas contra la horquilla, en vista lateral: la distancia del
  // círculo del pedal (biela 165 mm + pie) a las barras y al tubo de dirección.
  const dSeg = (p: [number, number], a: [number, number], b: [number, number]) => {
    const vx = b[0] - a[0], vy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(p[0] - a[0] - t * vx, p[1] - a[1] - t * vy);
  };
  const ejeF: [number, number] = [0, m.rF];
  ch.push({ nombre: 'Pedales a la horquilla', holgura: Math.min(dSeg(m.BB, ejeF, m.crown) - 0.025, dSeg(m.BB, m.crown, m.htt) - 0.03) - 0.165 - 0.07, minimo: 0.03 });
  ch.push({ nombre: 'Avance de la dirección (estabilidad)', holgura: m.avance, minimo: 0.04 });
  ch.push({ nombre: 'Tubo de dirección dentro del carenado', holgura: m.gap(m.htt[0], m.htt[1] + 0.06, 0.04), minimo: 0.02 });
  ch.push({ nombre: 'Rueda trasera comprimida', holgura: wg(m.xR, 0, m.rR, m.rR + TRAVEL_R), minimo: 0.02 });
  ch.push({ nombre: `Rueda lateral interior a ${P.tiltMax}°`, holgura: h.lateral, minimo: 0.01 });
  const ph = P.tiltMax * Math.PI / 180;
  let bajo = 9;
  for (let i = 1; i < 100; i++) {
    const f = m.frame(i / 100);
    for (let j = 0; j < 36; j++) { const q = m.sec(f, Math.PI + Math.PI * j / 36); bajo = Math.min(bajo, q[1] * Math.cos(ph) - Math.abs(q[2]) * Math.sin(ph)); }
  }
  ch.push({ nombre: `Carenado al suelo inclinado ${P.tiltMax}°`, holgura: bajo, minimo: 0.02 });
  ch.push({ nombre: 'Viga central sobre el fondo del carenado', holgura: (m.ys - P.spineD / 2000) - (P.clear + 0.01), minimo: 0.01 });
  ch.push({ nombre: 'Pedales dentro del carenado', holgura: wg(m.BB[0], 0.16, 0.215, m.BB[1]), minimo: 0.02 });
  const of = m.occPts(false);
  ch.push({ nombre: 'Pies traseros al paralelogramo', holgura: (m.xL - 0.045) - (of.F[0] + 0.08), minimo: 0.01 });
  ch.push({ nombre: 'Respaldo trasero a la rueda trasera', holgura: Math.hypot(of.H[0] - 0.10 - m.xR, of.H[1] - m.rR) - m.rR - TRAVEL_R * 0.5, minimo: 0.02 });
  // Rodillas de atrás contra el respaldo del piloto, a la altura de la rodilla.
  const REC = P.recPil * Math.PI / 180;
  // La cara de atrás del respaldo es su marco de tubo, a 15 cm del eje del tronco.
  const tR = Math.max(0, (of.K[1] - (m.hip - 0.151 * Math.sin(REC))) / Math.cos(REC));
  const xRespaldo = m.xPil - 0.151 * Math.cos(REC) - Math.sin(REC) * tR;
  ch.push({ nombre: 'Rodillas traseras al respaldo del piloto', holgura: (xRespaldo - 0.02) - (of.K[0] + 0.07), minimo: 0.03 });


  // ── El cuadro nuevo y el manillar chopper ─────────────────────────────────
  // Rueda delantera hundida contra el tubo bajo (en cuello de cisne).
  const ejeHundido: [number, number] = [m.AX[0] * TRAVEL_F, m.rF + m.AX[1] * TRAVEL_F];
  const bajo3 = m.tubosChasis().find(t => t.nombre.startsWith('Tubo bajo'))!;
  const dMinTubo = (t: Tubo, q: [number, number]) => Math.min(...tramosTubo(t).map(([a, b]) => dSeg(q, [a[0], a[1]], [b[0], b[1]])));
  ch.push({ nombre: 'Rueda delantera hundida al tubo bajo', holgura: dMinTubo(bajo3, ejeHundido) - m.rF - bajo3.d / 2, minimo: 0.015 });
  // Rodillas del piloto contra el manillar, en toda la vuelta del pedal.
  const barra = [1, -1].flatMap(s => muestrearCurva(m.manillar(s), 40));
  let rodBarra = 9;
  for (let k = 0; k < 24; k++) {
    const a = 2 * Math.PI * k / 24, pie: [number, number] = [m.BB[0] + 0.165 * Math.cos(a), m.BB[1] + 0.165 * Math.sin(a)];
    const K = m.rodilla(m.occPts(true).H, pie);
    for (const s of [1, -1]) for (const q of barra) rodBarra = Math.min(rodBarra, Math.hypot(q[0] - K[0], q[1] - K[1], q[2] - s * 0.10) - 0.075 - 0.011);
  }
  ch.push({ nombre: 'Rodillas al manillar (vuelta entera del pedal)', holgura: rodBarra, minimo: 0.02 });
  // Manillar dentro del carenado, recto y girado 15° a cada lado.
  let barraCar = 9;
  for (const g of [-15, 0, 15]) for (const q of barra) {
    const r = m.girarDireccion(q, g * Math.PI / 180);
    barraCar = Math.min(barraCar, m.gap(r[0], r[1], r[2]) - 0.011);
  }
  ch.push({ nombre: 'Manillar dentro del carenado (girado 15°)', holgura: barraCar, minimo: 0.02 });
  return {
    A, FR, Cd, CdA, vol, Paero, Proll, Pw, WhKm, pedWhKm, autonomia, vmax: vmax * 3.6, masas, mVeh, mTot, rangoMasa,
    Mmax, tension, seguridad, cargaRueda, solarPico, solarDia, kmSol, areas: ar, comprobaciones: ch,
  };
}
export type Resultados = ReturnType<typeof calcular>;

/** Masa de cada parte (kg), a partir de los tubos del modelo y los deslizadores de masa. */
export function estimarMasas(m: Modelo, ar: { carroceria: number; cristal: number; solar: number }, P: Parametros) {
  const mat = MATERIALES_CHASIS[P.matChasis];
  let tubos = 0, tubosSusp = 0;
  for (const t of m.tubosChasis()) {
    if (t.comprado) continue;
    const area = t.pared ? Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2) : Math.PI * (t.d / 2) ** 2 * 0.35;
    const kg = area * largoTubo(t) * mat.densidad;
    if (t.grupo === 'Suspensión') tubosSusp += kg; else tubos += kg;
  }
  return {
    Chasis: tubos + P.extraChasis,
    'Suspensión': tubosSusp + P.mSuspension,
    Ruedas: 4 * P.mRueda,
    Asientos: 3 * P.mAsiento,
    'Motor y generador': P.mMotor + P.mGenerador,
    'Baterías': 4 * P.mBateria,
    Carenado: ar.carroceria * P.espCarenado * MATERIALES_CARENADO[P.matCarenado].kgm2mm,
    Cristales: ar.cristal * P.espCristal * 1.2,
    'Paneles solares': ar.solar * P.mSolarM2,
    Varios: P.mVarios,
  } as Record<string, number>;
}

/** Lo que entiende `aeromovil_cad.py` (sus nombres de parámetro). W y H ya resueltos. */
export function parametrosCAD(P: Parametros) {
  return {
    B: P.B, wF: P.wF, wL: P.wL, fL: +(P.xLm / P.B).toFixed(4), track: P.track, xPil: P.xPil, xPas: P.xPas,
    recPil: P.recPil, recPas: P.recPas, horquilla: P.horquilla, overF: P.overF, tail: P.tail, tailRound: P.tailRound, morro: P.morro, W: P.W, H: P.H, pmax: P.pmax, full: P.full, tipH: P.tipH,
    nU: P.nU, nL: P.nL, clear: P.clear, puerta: P.puerta, spineD: P.spineD, spineT: P.spineT,
  };
}

/** ¿Está la celda (u, θ) dentro de la zona? θ admite zonas que cruzan 0. */
export function enZona(z: Zona, u: number, th: number) {
  if (u < z.u0 || u > z.u1) return false;
  const T = 2 * Math.PI;
  const a = ((th - z.t0) % T + T) % T, w = z.t1 - z.t0;
  return a <= w;
}

/** Área de piel (m²) de carrocería, cristal y paneles, integrando la malla. */
export function areas(m: Modelo) {
  const nu = 120, nv = 96, out = { carroceria: 0, cristal: 0, solar: 0 };
  const pt = (u: number, th: number) => m.sec(m.frame(u), th);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u0 = 0.001 + 0.998 * i / nu, u1 = 0.001 + 0.998 * (i + 1) / nu, t0 = 2 * Math.PI * j / nv, t1 = 2 * Math.PI * (j + 1) / nv;
    const a = pt(u0, t0), b = pt(u1, t0), c = pt(u0, t1), d = pt(u1, t1);
    const tri = (p: P3, q: P3, r: P3) => {
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
      return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    };
    const s = tri(a, b, c) + tri(b, d, c);
    const zona = m.zonasPiel.find(z => enZona(z, (u0 + u1) / 2, (t0 + t1) / 2));
    out[zona ? zona.piel === 'cristal' ? 'cristal' : 'solar' : 'carroceria'] += s;
  }
  return out;
}
