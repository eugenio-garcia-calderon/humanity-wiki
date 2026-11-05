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
  overF: number;    // morro por delante de la rueda delantera (m)
  tail: number;     // cola por detrás de la rueda trasera (m)
  tailRound: number;// redondez de la punta de cola (0 = punta, 0,7 = muy roma)
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
}

export const PARAMETROS_POR_DEFECTO: Parametros = {
  B: 3.05, wF: '20', wL: '20', xLm: 1.50, track: 0.88, xPil: 1.30, xPas: 2.15,
  overF: 0.40, tail: 0.45, tailRound: 0.45, auto: true, holgura: 0.05, W: 1.46, H: 1.25,
  pmax: 0.48, full: 0.8, tipH: 0.48, nU: 2.6, nL: 2.6, clear: 0.14, puerta: 'cabina',
  spineD: 76.2, spineT: 3.0, tiltMax: 20, comp: 0, mOcc: 80, pedal: 100, speed: 25, sol: 4.5,
};

export const DIAMETRO_RUEDA: Record<Pulgadas, number> = { '16': 0.405, '20': 0.508, '24': 0.61, '26': 0.66, '28': 0.70 };
export const TIRE_W = 0.055;
export const YS = 0.20;
export const REC = 28 * Math.PI / 180;
export const SEAT_GAP = 0.235;
export const HEAD = 25 * Math.PI / 180;
export const TRAVEL_F = 0.17;
export const TRAVEL_R = 0.15;
export const ARM_UP = 0.18;
export const HIP_Y = 0.36;
export const AX: [number, number] = [-Math.sin(HEAD), Math.cos(HEAD)];
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
  const BB: [number, number] = [Math.min(-0.40, xPil + 0.90), 0.48];
  const PIV: [number, number] = [xR + 0.68, YS + 0.03];
  const A2C = rF + 0.06 + TRAVEL_F + 0.07;
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
    if (u < p) { const a = (p - u) / p; return Math.sqrt(Math.max(0, 1 - a * a)); }
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
  const sf = BB[0] - 0.02, sr = PIV[0] - 0.06;
  const st: [number, number] = [htt[0] + AX[0] * 0.05, htt[1] + AX[1] * 0.05];
  const xCruceta = xPas - 0.08;   // travesaño de los asientos traseros y anclaje del amortiguador

  /** El chasis fabricable, tubo a tubo (lo que dibujan el visor y el plano). */
  const tubosChasis = (): Tubo[] => {
    const AL = 'Al 6061-T6';
    const t: Tubo[] = [
      { nombre: 'Viga central', grupo: 'Chasis', a: [sf, YS, 0], b: [sr, YS, 0], d: P.spineD / 1000, pared: P.spineT / 1000, material: AL },
      { nombre: 'Tubo de dirección', grupo: 'Chasis', a: [htb[0], htb[1], 0], b: [htt[0], htt[1], 0], d: 0.05, pared: 0.003, material: AL },
      { nombre: 'Tubo diagonal', grupo: 'Chasis', a: [htb[0], htb[1], 0], b: [sf + 0.03, YS, 0], d: 0.045, pared: 0.002, material: AL },
      { nombre: 'Soporte del pedalier', grupo: 'Chasis', a: [sf, YS, 0], b: [BB[0], BB[1], 0], d: 0.04, pared: 0.002, material: AL },
      { nombre: 'Tirante pedalier-dirección', grupo: 'Chasis', a: [BB[0], BB[1], 0], b: [htt[0], htt[1], 0], d: 0.035, pared: 0.002, material: AL },
      { nombre: 'Travesaño asientos traseros', grupo: 'Chasis', a: [xCruceta, YS, -0.33], b: [xCruceta, YS, 0.33], d: 0.035, pared: 0.002, material: AL },
      { nombre: 'Soporte asiento piloto', grupo: 'Chasis', a: [xPil + 0.10, YS, 0], b: [xPil + 0.10, HIP_Y - 0.11, 0], d: 0.03, pared: 0.002, material: AL },
      { nombre: 'Soporte asiento trasero izq.', grupo: 'Chasis', a: [xCruceta, YS, SEAT_GAP], b: [xCruceta, HIP_Y - 0.09, SEAT_GAP], d: 0.025, pared: 0.002, material: AL },
      { nombre: 'Soporte asiento trasero der.', grupo: 'Chasis', a: [xCruceta, YS, -SEAT_GAP], b: [xCruceta, HIP_Y - 0.09, -SEAT_GAP], d: 0.025, pared: 0.002, material: AL },
      { nombre: 'Poste del basculante', grupo: 'Chasis', a: [xL, YS, 0], b: [xL, YS + ARM_UP + 0.04, 0], d: 0.04, pared: 0.003, material: AL },
      { nombre: 'Potencia de dirección', grupo: 'Dirección', a: [htt[0], htt[1], 0], b: [st[0], st[1], 0], d: 0.028, pared: 0, material: 'Comprado (potencia MTB)', comprado: true },
      { nombre: 'Barra de mando', grupo: 'Dirección', a: [st[0], st[1], 0], b: [xPil + 0.48, 0.66, 0], d: 0.022, pared: 0.002, material: AL },
      { nombre: 'Manillar', grupo: 'Dirección', a: [xPil + 0.48, 0.64, -0.25], b: [xPil + 0.48, 0.64, 0.25], d: 0.022, pared: 0.002, material: AL },
    ];
    for (const s of [-1, 1]) {
      t.push({ nombre: `Basculante trasero, brazo ${s > 0 ? 'izq.' : 'der.'}`, grupo: 'Suspensión', a: [PIV[0], PIV[1], s * 0.075], b: [xR, rR, s * 0.075], d: 0.032, pared: 0.002, material: AL });
    }
    t.push({ nombre: 'Eje del pivote trasero', grupo: 'Suspensión', a: [PIV[0], PIV[1], -0.08], b: [PIV[0], PIV[1], 0.08], d: 0.03, pared: 0.004, material: AL });
    t.push({ nombre: 'Balancín del amortiguador', grupo: 'Suspensión', a: [PIV[0], PIV[1], 0], b: [PIV[0], PIV[1] + 0.13, 0], d: 0.03, pared: 0.003, material: AL });
    for (const yy of [YS, YS + ARM_UP]) for (const dx of [-0.03, 0.03]) {
      t.push({ nombre: `Brazo del paralelogramo ${yy === YS ? 'inferior' : 'superior'} ${dx < 0 ? 'trasero' : 'delantero'}`, grupo: 'Suspensión', a: [xL + dx, yy, -ARM_A], b: [xL + dx, yy, ARM_A], d: 0.025, pared: 0.002, material: AL });
    }
    for (const s of [-1, 1]) {
      t.push({ nombre: `Mangueta lateral ${s > 0 ? 'izq.' : 'der.'}`, grupo: 'Suspensión', a: [xL, YS - 0.02, s * ARM_A], b: [xL, YS + ARM_UP + 0.02, s * ARM_A], d: 0.035, pared: 0.003, material: AL });
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
    const d: [number, number] = [-Math.sin(REC), Math.cos(REC)];
    const H: [number, number] = [hx, HIP_Y];
    const S: [number, number] = [hx + d[0] * 0.5, HIP_Y + d[1] * 0.5];
    const C: [number, number] = [hx + d[0] * 0.7, HIP_Y + d[1] * 0.7];
    // Los pies de atrás se quedan detrás del paralelogramo de las laterales.
    const F: [number, number] = piloto ? [BB[0], BB[1]] : [Math.min(hx + 0.56, xL - 0.145), 0.17];
    return { H, S, C, K: ikKnee(H, F, 0.45, 0.47), F, d, hx };
  };
  /** Contorno lateral de la carcasa de un asiento (superficie y cara inferior). */
  const perfilAsiento = (piloto: boolean) => {
    const hx = piloto ? xPil : xPas;
    const d = [-Math.sin(REC), Math.cos(REC)], pb = [-Math.cos(REC), -Math.sin(REC)];
    const top: [number, number][] = [[hx + 0.40, HIP_Y - 0.04], [hx + 0.22, HIP_Y - 0.085], [hx + 0.02, HIP_Y - 0.10]];
    for (const t of [0.12, 0.32, 0.52, 0.66]) top.push([hx + d[0] * t + pb[0] * 0.11, HIP_Y + d[1] * t + pb[1] * 0.11]);
    const u = top[top.length - 1];
    top.push([u[0] + 0.06, u[1] + 0.05]);
    const th = 0.012;
    const nrm = (i: number) => {
      const a = top[Math.max(i - 1, 0)], b = top[Math.min(i + 1, top.length - 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty);
      return [ty / L, -tx / L];
    };
    const bot = top.map((q, i) => [q[0] + nrm(i)[0] * th, q[1] + nrm(i)[1] * th] as [number, number]);
    return top.concat(bot.reverse());
  };

  // ── La piel: cristal delante y a los lados, paneles solares arriba ───────
  // Eugenio: «la parte de arriba tiene que estar llena de paneles solares…
  // no todo transparente, que si no haría efecto invernadero. Inspírate en el
  // Aptera». Parabrisas desde el pedalier hasta encima de la frente del
  // piloto; ventanillas a los lados de las dos filas; el resto del techo y la
  // cubierta trasera, paneles.
  const cabezaPil = occPts(true).C[0], cabezaPas = occPts(false).C[0];
  const uParabrisas0 = uDeX(BB[0] + 0.10);
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
    P, rF, rR, rL, xn, xt, xR, xL, xPil, xPas, BB, Lf, Hb, PIV, A2C, ARM_A, crown, htt, sf, sr, xCruceta,
    frame, sec, gap, uDeX, occPts, perfilAsiento, tubosChasis, zonasPiel, puertas,
  };
}
export type Modelo = ReturnType<typeof crearModelo>;

export const largoTubo = (t: Tubo) => Math.hypot(t.b[0] - t.a[0], t.b[1] - t.a[1], t.b[2] - t.a[2]);

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

  const D = P.spineD / 1000, t = P.spineT / 1000;
  const spineKg = Math.PI * ((D / 2) ** 2 - (D / 2 - t) ** 2) * Math.abs(m.sf - m.sr) * 2700;
  const masas: Record<string, number> = {
    Chasis: spineKg + 2.2, 'Suspensión': 4.2, Ruedas: 4 * 1.9, Asientos: 3 * 1.8, Motor: 3.6 + 2.1 + 0.6,
    'Baterías': 4 * 2.9, Carenado: ar.carroceria * 1.5, Cristales: ar.cristal * 3.6, 'Paneles solares': ar.solar * 2.2, Varios: 8,
  };
  const mVeh = Object.values(masas).reduce((a, b) => a + b, 0), mTot = mVeh + 3 * P.mOcc;

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
  const tension = 2.5 * Mmax * 1000 / Wmod, seguridad = 240 / tension;
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
  ch.push({ nombre: 'Rueda delantera con la horquilla comprimida', holgura: wg(AX[0] * TRAVEL_F, 0, m.rF, m.rF + AX[1] * TRAVEL_F), minimo: 0.02 });
  ch.push({ nombre: 'Rueda trasera comprimida', holgura: wg(m.xR, 0, m.rR, m.rR + TRAVEL_R), minimo: 0.02 });
  ch.push({ nombre: `Rueda lateral interior a ${P.tiltMax}°`, holgura: h.lateral, minimo: 0.01 });
  const ph = P.tiltMax * Math.PI / 180;
  let bajo = 9;
  for (let i = 1; i < 100; i++) {
    const f = m.frame(i / 100);
    for (let j = 0; j < 36; j++) { const q = m.sec(f, Math.PI + Math.PI * j / 36); bajo = Math.min(bajo, q[1] * Math.cos(ph) - Math.abs(q[2]) * Math.sin(ph)); }
  }
  ch.push({ nombre: `Carenado al suelo inclinado ${P.tiltMax}°`, holgura: bajo, minimo: 0.02 });
  ch.push({ nombre: 'Pedales dentro del carenado', holgura: wg(m.BB[0], 0.16, 0.215, m.BB[1]), minimo: 0.02 });
  const of = m.occPts(false);
  ch.push({ nombre: 'Pies traseros al paralelogramo', holgura: (m.xL - 0.045) - (of.F[0] + 0.08), minimo: 0.01 });
  ch.push({ nombre: 'Respaldo trasero a la rueda trasera', holgura: Math.hypot(of.H[0] - 0.10 - m.xR, of.H[1] - m.rR) - m.rR - TRAVEL_R * 0.5, minimo: 0.02 });
  // Rodillas de atrás contra el respaldo del piloto, a la altura de la rodilla.
  const tR = Math.max(0, (of.K[1] - (HIP_Y - 0.052)) / Math.cos(REC));
  const xRespaldo = m.xPil - 0.11 * Math.cos(REC) - Math.sin(REC) * tR;
  ch.push({ nombre: 'Rodillas traseras al respaldo del piloto', holgura: (xRespaldo - 0.02) - (of.K[0] + 0.07), minimo: 0.03 });

  return {
    A, FR, Cd, CdA, vol, Paero, Proll, Pw, WhKm, pedWhKm, autonomia, vmax: vmax * 3.6, masas, mVeh, mTot,
    Mmax, tension, seguridad, cargaRueda, solarPico, solarDia, kmSol, areas: ar, comprobaciones: ch,
  };
}
export type Resultados = ReturnType<typeof calcular>;

/** Lo que entiende `aeromovil_cad.py` (sus nombres de parámetro). W y H ya resueltos. */
export function parametrosCAD(P: Parametros) {
  return {
    B: P.B, wF: P.wF, wL: P.wL, fL: +(P.xLm / P.B).toFixed(4), track: P.track, xPil: P.xPil, xPas: P.xPas,
    overF: P.overF, tail: P.tail, tailRound: P.tailRound, W: P.W, H: P.H, pmax: P.pmax, full: P.full, tipH: P.tipH,
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
