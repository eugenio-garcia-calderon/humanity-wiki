import { MATERIALES_CHASIS, largoTubo, tramosTubo, type P3, type Parametros, type Seccion, type Tubo } from './geometria';

/**
 * Chasis versión 2 del Aeromóvil 1: celosía tubular triangulada como la del
 * Caterham Seven (2026-11-06, Eugenio: «un chasis tubular con celosías… alta
 * resistencia y ligereza gracias a su diseño triangular; una versión 2
 * idéntica del coche con este chasis, y comparar resistencia, estructura,
 * peso y forma con la versión 1»).
 *
 * `ContextoChasis` son los puntos duros del coche: la versión 2 tiene que
 * anclar la suspensión, el salpicadero, los estribos, el arco de seguridad y
 * el suelo del maletero en los mismos sitios que la versión 1.
 *
 * ── El patrón (Seven / Locost) ──────────────────────────────────────────────
 * Como en el Seven, la estructura es un «tubo» de celosías planas que se
 * cierran unas contra otras:
 *   · Dos cordones inferiores (a ±32 cm bajo el morro y la cola, donde ancla
 *     la suspensión, y a ±46 cm en la cabina, por fuera de los módulos de
 *     batería) y dos cordones superiores, que son los estribos de la v1
 *     (±50 cm, a 22 cm sobre el suelo).
 *   · Costados en celosía Warren: diagonales en zigzag entre los cordones,
 *     sin montantes intermedios, de modo que cada nudo del estribo lo
 *     sujetan dos diagonales y el cordón.
 *   · Suelo en zigzag: un travesaño por estación y una diagonal por bahía,
 *     alternando el sentido.
 *   · Morro: los cordones siguen hasta el morro y un cordón alto sube de
 *     cada nudo del morro a su torreta (el riel alto del Seven); caja
 *     trasera (soportes del amortiguador y suelo del maletero) cerrada por
 *     cinco caras: la sexta es el suelo, que ocupa el motor.
 *   · Mamparos transversales: el del salpicadero, con dos X por encima de
 *     las piernas (esquina–torreta contraria, y estribo–esquina contraria
 *     10 cm sobre las espinillas), y el trasero, detrás del pasajero, en X
 *     desde los pivotes de los brazos tirados.
 *   · Arriba, el aro de la puerta: montante del parabrisas (acero, como la
 *     v1), larguero del techo hasta el arco (la bisagra de la puerta), el
 *     arco de seguridad (acero) y un tirante trasero del arco por dentro de
 *     la cúpula hasta el mamparo, como las patas traseras del arco del Seven.
 * Todas las cargas entran por nudos: torretas, pivotes traseros, soportes del
 * amortiguador, travesaño del asiento del piloto y de la cadera del pasajero,
 * cremallera (sobre el travesaño del eje delantero), batería (sobre el suelo).
 *
 * Lo que NO se pudo triangular, y por qué (medido con `diagnosticoCelosia`):
 *   · El arco de seguridad bascula en su plano (un pórtico sin diagonal): la
 *     diagonal cruzaría al pasajero, que entra por ese hueco. Lo aguanta la
 *     flexión del arco, que el cálculo de barras articuladas no cuenta.
 *   · El suelo bajo el motor (entre los pivotes y los amortiguadores).
 * Y lo que roza: la esquina delantera del módulo de batería del piloto (llega
 * a x = +6 cm con ±42 cm) choca con lo que sube del anclaje trasero del brazo
 * delantero (x = −14 cm): la torreta trasera (igual en la v1) y la diagonal
 * estribo–cordón. Un chaflán de 6 × 10 cm en esa esquina del módulo lo arregla.
 */
export interface ContextoChasis {
  P: Parametros;
  xF0: number; xR0: number; xR: number; ys: number; zR: number;
  xD: number; yDash: number; xH: number; xArco: number; uArco: number;
  ySill: number; zSill: number; yTow: number; zTF: number; yAmortR: number; yMaletero: number;
  rF: number; rR: number; yFloor: number; xPil: number; xPas: number; hip: number; hipPas: number;
  yLarg: (x: number) => number;
  frame: (u: number) => Seccion; uDeX: (x: number) => number; xDeU: (u: number) => number;
  secC: (f: Seccion, th: number, off?: number) => P3; frameC: (u: number) => Seccion; thBase: (u: number) => number; thPilar: (u: number) => number;
  uBase: number; uW1: number; gomaT: number; gomaU: number;
  baterias: { nombre: string; x0: number; x1: number; y0: number; y1: number; hz: number }[];
  motor: { c: P3; r: number; largo: number };
  reposapies: [number, number]; volanteCentro: P3; cremallera: P3;
  material: string; acero: string;
}

// Secciones (diámetro exterior, pared), en metros.
const CORDON: [number, number] = [0.032, 0.0015];     // cordones inferiores y estribos (cordones superiores)
const MONTANTE: [number, number] = [0.025, 0.0015];   // montantes, diagonales y barras de los mamparos
const DIAGONAL: [number, number] = [0.025, 0.0015];   // diagonales
const TRAVESANO: [number, number] = [0.022, 0.0015];  // travesaños del suelo (los «montantes» de la celosía Warren del suelo: poca carga)
const TORRETA: [number, number] = [0.032, 0.002];     // travesaño de torretas (cargas de la McPherson)
const ARCO: [number, number] = [0.038, 0.0025];       // arco de seguridad (acero, como la v1)
const PILAR: [number, number] = [0.030, 0.002];       // montantes del parabrisas (acero, como la v1)

/** Los tubos de la estructura en celosía (sin suspensión, dirección ni transmisión: esos van aparte). */
export function tubosCelosia(c: ContextoChasis): Tubo[] {
  const t: Tubo[] = [];
  const tubo = (nombre: string, a: P3, b: P3, [d, pared]: [number, number], material = c.material, curva?: P3[]) =>
    t.push({ nombre, grupo: 'Chasis', a, b, d, pared, material, comprado: false, curva });
  const yL = c.yLarg;                       // eje de los cordones inferiores: 3,5 cm sobre el fondo de la carrocería
  const zC = 0.46;                          // cordones inferiores en la cabina, por fuera de la batería (±42 cm)
  // Pivote de los brazos tirados: `tubosMecanica` los ancla 2,2 cm por encima del cordón (la orejeta del pivote); el nudo va en el cordón.
  const xPivot = c.xR + 0.38;
  const xB = 0.14, xC = -0.14;              // anclajes de los brazos inferiores delanteros
  const zMotor0 = c.motor.c[2] - c.motor.largo / 2;   // cara del motor hacia la derecha: el nudo K del mamparo va ahí, fuera del motor
  const thC = c.thPilar(c.uW1);             // canto del techo (θ de la bisagra de la puerta)

  // ── Nudos, por lado (s = +1 izquierda, −1 derecha) ────────────────────────
  // El cordón inferior va recto de B (±32 cm) a L1 (±46 cm): así rodea la esquina de la batería; el anclaje C queda sobre el travesaño.
  const zCordon = (x: number) => c.zR + (zC - c.zR) * (xB - x) / (xB - c.xPil);
  const N = (s: number) => ({
    A: [c.xF0, yL(c.xF0), s * c.zR] as P3,                 // morro
    B: [xB, yL(xB), s * c.zR] as P3,                        // brazo inferior delantero, delante
    CE: [xC, yL(xC), s * zCordon(xC)] as P3,                // nudo del cordón en la estación del anclaje trasero del brazo (el anclaje, a ±32 cm, es una orejeta sobre el travesaño)
    T: [0.03, c.yTow, s * c.zTF] as P3,                     // torreta McPherson
    D: [c.xD, c.yDash, s * 0.36] as P3,                     // esquina del salpicadero
    U0: [c.xD, c.ySill, s * c.zSill] as P3,                 // estribo, delante (base del montante del parabrisas)
    L1: [c.xPil, yL(c.xPil), s * zC] as P3,                 // cordón inferior bajo la cadera del piloto
    LA: [c.xArco, yL(c.xArco), s * zC] as P3,               // cordón inferior bajo el arco
    UA: [c.xArco, c.ySill, s * c.zSill] as P3,              // estribo, pie del arco
    PV: [xPivot, yL(xPivot), s * c.zR] as P3,               // pivote del brazo tirado trasero
    H: [c.xH, c.ySill, s * 0.30] as P3,                     // mamparo trasero: fin del estribo, cordón alto del maletero y tirante del arco
    M: [c.xR - 0.30, c.yAmortR, s * 0.30] as P3,            // soporte del amortiguador trasero
    L5: [c.xR - 0.30, yL(c.xR - 0.30), s * c.zR] as P3,     // cordón inferior bajo el amortiguador
  });
  const I = N(1), R = N(-1);
  void zMotor0;

  // ── Montante del parabrisas: la misma traza que la v1 ─────────────────────
  const pilar = (s: number): P3[] => {
    const pts: P3[] = [];
    for (let k = 0; k <= 8; k++) {
      const u = c.uBase + (c.uW1 + c.gomaU - c.uBase) * k / 8, th = Math.max(c.thPilar(u) - c.gomaT, c.thBase(u) + 0.01);
      pts.push(c.secC(c.frameC(u), s > 0 ? th : Math.PI - th, -0.024));
    }
    return pts;
  };
  // ── Arco de seguridad: del estribo sube a un codo en la unión cúpula-carrocería
  // (la v1 cortaba esa esquina y rozaba la piel) y sigue la cúpula 4 cm por dentro.
  const OFF_ARCO = -0.040;
  const fA = c.frameC(c.uArco), t0 = c.thBase(c.uArco) + 0.05;
  const thetas = Array.from({ length: 21 }, (_, k) => t0 + (Math.PI - 2 * t0) * k / 20).filter(th => Math.abs(th - thC) > 0.06 && Math.abs(th - (Math.PI - thC)) > 0.06);
  thetas.push(thC, Math.PI - thC); thetas.sort((a, b) => a - b);   // los anclajes de los largueros del techo son puntos de paso: nudos
  const codo = (s: number): P3 => [c.xArco, fA.zc, s * 0.34];
  const arco: P3[] = [I.UA, codo(1), ...thetas.map(th => c.secC(fA, th, OFF_ARCO)), codo(-1), R.UA];
  const C1 = (s: number) => c.secC(fA, s > 0 ? thC : Math.PI - thC, OFF_ARCO);
  // ── Tirante trasero del arco: del canto del techo baja por dentro de la cúpula
  // (3 cm, junto al cristal, por fuera del hombro del pasajero) hasta el mamparo.
  const tirante = (s: number): P3[] => {
    const a = C1(s), b = (s > 0 ? I : R).H, pts: P3[] = [a];
    for (let k = 1; k < 6; k++) {
      const u = c.uArco + (c.uDeX(c.xH) - c.uArco) * k / 6, y = a[1] + (b[1] - a[1]) * k / 6, f = c.frameC(u);
      if (y <= f.zc + 0.02) { pts.push([f.x, y, s * (0.34 - 0.04 * k / 6)]); continue; }   // ya por debajo de la cúpula: baja recto por dentro de la carrocería
      let lo = 0, hi = Math.PI / 2;   // θ de la cúpula a esa altura (bisección: la altura crece con θ)
      for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (c.secC(f, mid, -0.03)[1] < y) lo = mid; else hi = mid; }
      const q = c.secC(f, hi, -0.03); pts.push([q[0], q[1], s * Math.abs(q[2])]);
    }
    pts.push(b); return pts;
  };

  for (const s of [1, -1]) {
    const n = s > 0 ? I : R, lado = s > 0 ? 'izq.' : 'der.';
    // Cordones inferiores
    tubo(`Cordón inferior ${lado}, morro`, n.A, n.B, CORDON);
    tubo(`Cordón inferior ${lado}, piloto`, n.B, n.L1, CORDON);
    tubo(`Cordón inferior ${lado}, pasajero`, n.L1, n.LA, CORDON);
    tubo(`Cordón inferior ${lado}, hasta el pivote trasero`, n.LA, n.PV, CORDON);
    tubo(`Cordón inferior ${lado}, eje trasero`, n.PV, n.L5, CORDON);
    // Morro: cordón alto del morro a la torreta, en el plano del costado (como el riel alto del Seven)
    tubo(`Cordón alto del morro ${lado}`, n.A, n.T, MONTANTE);
    // Torretas y mamparo del salpicadero
    tubo(`Torreta delantera ${lado}, delante`, n.B, n.T, MONTANTE);
    tubo(`Torreta delantera ${lado}, detrás`, n.CE, n.T, MONTANTE);
    tubo(`Montante del salpicadero ${lado}`, n.B, n.D, MONTANTE);
    tubo(`Diagonal salpicadero–torreta ${lado}`, n.D, n.T, DIAGONAL);
    tubo(`Pie del estribo delantero ${lado}`, n.U0, n.B, MONTANTE);
    tubo(`Diagonal del panel lateral ${lado}, bahía del eje delantero`, n.U0, n.CE, DIAGONAL);
    tubo(`Base del montante del parabrisas ${lado}`, n.U0, n.D, MONTANTE);
    // Costado de la cabina (Warren)
    tubo(`Estribo ${lado}, del salpicadero al arco`, n.U0, n.UA, CORDON);
    tubo(`Estribo ${lado}, del arco al mamparo trasero`, n.UA, n.H, CORDON);
    tubo(`Diagonal del panel lateral ${lado}, bahía del piloto`, n.U0, n.L1, DIAGONAL);
    tubo(`Diagonal del panel lateral ${lado}, bahía del pasajero`, n.L1, n.UA, DIAGONAL);
    tubo(`Pie del arco de seguridad ${lado}`, n.LA, n.UA, MONTANTE);
    tubo(`Diagonal del panel lateral ${lado}, bahía trasera`, n.UA, n.PV, DIAGONAL);
    tubo(`Montante del mamparo trasero ${lado}`, n.PV, n.H, MONTANTE);
    // Caja trasera: motor, amortiguadores y suelo del maletero
    tubo(`Cordón alto del maletero ${lado}`, n.H, n.M, MONTANTE);
    tubo(`Soporte del amortiguador trasero ${lado}`, n.L5, n.M, [0.028, 0.002]);
    tubo(`Diagonal del panel lateral ${lado}, bahía del motor`, n.H, n.L5, DIAGONAL);
    // Aro de la puerta: montante del parabrisas (acero), larguero del techo hasta el arco y tirante trasero del arco
    { const pts = pilar(s); tubo(`Montante del parabrisas ${lado}`, n.U0, pts[pts.length - 1], PILAR, c.acero, [n.U0, ...pts]); }
    { const pts = pilar(s); tubo(`Larguero del techo ${lado} (bisagra de la puerta)`, pts[pts.length - 1], C1(s), MONTANTE); }
    { const pts = tirante(s); tubo(`Tirante trasero del arco ${lado}`, pts[0], pts[pts.length - 1], DIAGONAL, c.material, pts); }
  }
  tubo('Arco de seguridad', arco[0], arco[arco.length - 1], ARCO, c.acero, arco);

  // ── Travesaños ─────────────────────────────────────────────────────────────
  tubo('Travesaño del morro', R.A, I.A, TRAVESANO);
  tubo('Travesaño del eje delantero (cremallera)', R.B, I.B, MONTANTE);
  tubo('Travesaño del suelo, detrás del eje delantero (anclajes traseros de los brazos)', R.CE, I.CE, MONTANTE);
  tubo('Travesaño de torretas delanteras', R.T, I.T, TORRETA);
  tubo('Travesaño del salpicadero', R.D, I.D, MONTANTE);
  tubo('Travesaño del asiento del piloto', R.L1, I.L1, TRAVESANO);
  tubo('Travesaño de la cadera del pasajero', R.LA, I.LA, TRAVESANO);
  tubo('Travesaño de los pivotes traseros', R.PV, I.PV, MONTANTE);
  tubo('Travesaño del suelo del maletero (mamparo trasero)', R.H, I.H, MONTANTE);
  tubo('Travesaño de amortiguadores traseros', R.M, I.M, MONTANTE);
  tubo('Travesaño del eje trasero, abajo', R.L5, I.L5, TRAVESANO);

  // ── Diagonales de los paneles transversales y del suelo (una por cuadro) ───
  tubo('Diagonal del mamparo del salpicadero (sobre las piernas)', I.D, R.T, DIAGONAL);
  tubo('Diagonal del salpicadero, estribo izq. a esquina der. (sobre las espinillas)', I.U0, R.D, DIAGONAL);
  tubo('Diagonal del salpicadero, estribo der. a esquina izq. (sobre las espinillas)', R.U0, I.D, DIAGONAL);
  tubo('Diagonal del suelo, bahía del morro', I.A, R.B, DIAGONAL);
  tubo('Diagonal del suelo, bahía del eje delantero', R.B, I.CE, DIAGONAL);
  tubo('Diagonal del suelo, bahía del piloto', I.CE, R.L1, DIAGONAL);
  tubo('Diagonal del suelo, bahía del pasajero', R.L1, I.LA, DIAGONAL);
  tubo('Diagonal del suelo, bahía de los pivotes', I.LA, R.PV, DIAGONAL);
  tubo('Diagonal del mamparo trasero, izq. abajo a der. arriba', I.PV, R.H, DIAGONAL);
  tubo('Diagonal del mamparo trasero, der. abajo a izq. arriba', R.PV, I.H, DIAGONAL);
  tubo('Diagonal de la cara trasera (amortiguadores)', I.L5, R.M, DIAGONAL);
  tubo('Diagonal del techo del maletero (por detrás del motor)', I.M, R.H, DIAGONAL);
  return t;
}

// ============================================================================
// Evaluación: masa, estructura y rigidez
// ============================================================================

/** Lo que se compara entre las dos versiones. `rigidezTorsion` en N·m por grado, o null si no se ha podido estimar. */
export interface EvaluacionChasis {
  version: 'largueros' | 'celosia'; nombre: string;
  masaKg: number; nTubos: number; largoM: number; nNudos: number; triangulos: number;
  /** Modelo de barras articuladas (celosía pura): null si la estructura tiene mecanismos. */
  rigidezTorsion: number | null; rigidezFlexion: number | null;
  /** Mecanismos (grados de libertad sin triangular) que tiene la celosía como barras articuladas: 0 = toda triangulada. */
  mecanismos: number;
  /** Lo mismo con las uniones soldadas rígidas (modelo de viga): siempre sale un número; sirve para comparar aunque la celosía tenga mecanismos. */
  rigidezTorsionSoldada: number | null; rigidezFlexionSoldada: number | null;
  /** Masa (kg) de los tubos de acero (arco, montantes, pies) y de los de aluminio. */
  masaAceroKg: number; masaAluminioKg: number;
  /** Nudos de la celosía que pueden moverse sin estirar ninguna barra (los de cada mecanismo), para señalarlos en el visor. */
  nudosLibres: P3[];
  notas: string[];
}

type Barra = { i: number; j: number; EA: number; EI: number; GJ: number; tubo: number };
const TOL = 0.01;   // dos extremos a menos de 1 cm son el mismo nudo

const E_DE = (material: string) => (/acero|cromoly/i.test(material) ? 205e9 : /carbono/i.test(material) ? 110e9 : 69e9);
const densidadDe = (material: string) => {
  const m = Object.values(MATERIALES_CHASIS).find(k => k.n === material);
  return m ? m.densidad : /acero|cromoly/i.test(material) ? 7850 : /carbono/i.test(material) ? 1550 : 2700;
};
const seccion = (t: Tubo) => {
  const r = t.d / 2, ri = t.pared > 0 ? Math.max(0, r - t.pared) : 0;
  return { A: Math.PI * (r * r - ri * ri), I: Math.PI / 4 * (r ** 4 - ri ** 4) };
};
const d3 = (a: P3, b: P3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Nudos y barras de una lista de tubos: los curvos como polilínea; un tubo que acaba sobre otro parte al otro en ese punto. */
function grafo(tubos: Tubo[]) {
  const nodos: P3[] = [];
  const idx = (p: P3) => {
    for (let k = 0; k < nodos.length; k++) if (d3(nodos[k], p) < TOL) return k;
    nodos.push([p[0], p[1], p[2]]); return nodos.length - 1;
  };
  const barras: Barra[] = [];
  const extremos = new Set<number>();   // nudos que son extremo de algún tubo (los únicos que pueden partir otro tubo en T)
  tubos.forEach((t, ti) => {
    if (t.comprado) return;
    const { A, I } = seccion(t), E = E_DE(t.material), G = E / 2.6;
    extremos.add(idx(t.a)); extremos.add(idx(t.b));
    for (const [a, b] of tramosTubo(t, 8)) {
      const i = idx(a), j = idx(b);
      if (i !== j) barras.push({ i, j, EA: E * A, EI: E * I, GJ: G * 2 * I, tubo: ti });
    }
  });
  // Uniones en T: el extremo de un tubo que cae sobre otro tubo lo parte en dos ahí.
  for (let k = 0; k < barras.length; k++) {
    const b = barras[k], a = nodos[b.i], c = nodos[b.j], L = d3(a, c);
    if (L < 1e-6) continue;
    const dentro: [number, number][] = [];
    for (const n of extremos) {
      if (n === b.i || n === b.j) continue;
      const p = nodos[n], tt = ((p[0] - a[0]) * (c[0] - a[0]) + (p[1] - a[1]) * (c[1] - a[1]) + (p[2] - a[2]) * (c[2] - a[2])) / (L * L);
      if (tt * L < TOL || (1 - tt) * L < TOL) continue;
      const q: P3 = [a[0] + tt * (c[0] - a[0]), a[1] + tt * (c[1] - a[1]), a[2] + tt * (c[2] - a[2])];
      if (d3(q, p) < TOL) dentro.push([tt, n]);
    }
    if (!dentro.length) continue;
    dentro.sort((p, q) => p[0] - q[0]);
    const cadena = [b.i, ...dentro.map(d => d[1]), b.j];
    barras[k] = { ...b, i: cadena[0], j: cadena[1] };
    for (let m = 1; m < cadena.length - 1; m++) barras.push({ ...b, i: cadena[m], j: cadena[m + 1] });
  }
  // Un tubo casi recto muestreado en muchos tramos (los largueros de la v1) es
  // una sola viga: los nudos de paso con sus dos tramos a menos de 4° se funden.
  for (let ronda = 0; ronda < 2000; ronda++) {
    const en = new Map<number, Barra[]>();
    for (const b of barras) { (en.get(b.i) ?? en.set(b.i, []).get(b.i)!).push(b); (en.get(b.j) ?? en.set(b.j, []).get(b.j)!).push(b); }
    let hecho = false;
    for (const [nd, lista] of en) {
      if (lista.length !== 2 || extremos.has(nd) || lista[0].tubo !== lista[1].tubo) continue;
      const [b1, b2] = lista, o1 = b1.i === nd ? b1.j : b1.i, o2 = b2.i === nd ? b2.j : b2.i;
      const p = nodos[nd], a = nodos[o1], c = nodos[o2], L1 = d3(a, p), L2 = d3(p, c);
      if (L1 < 1e-6 || L2 < 1e-6) continue;
      const cos = ((p[0] - a[0]) * (c[0] - p[0]) + (p[1] - a[1]) * (c[1] - p[1]) + (p[2] - a[2]) * (c[2] - p[2])) / (L1 * L2);
      if (cos < Math.cos(4 * Math.PI / 180)) continue;
      barras.splice(barras.indexOf(b1), 1); barras.splice(barras.indexOf(b2), 1);
      barras.push({ ...b1, i: o1, j: o2 });
      hecho = true; break;
    }
    if (!hecho) break;
  }
  return { nodos, barras };
}

/**
 * Factorización LDLᵀ en sitio y resolución. Devuelve los pivotes nulos
 * (mecanismos) encontrados y, para cada uno, el vector del movimiento libre
 * (Lᵀ·v = eⱼ), con el que se sabe qué nudos se mueven.
 */
function resolver(Kf: Float64Array, n: number, f: Float64Array, libres: number[]): { u: Float64Array; nulos: number[]; modos: Float64Array[] } {
  const m = libres.length, A = new Float64Array(m * m), bvec = new Float64Array(m);
  let maxDiag = 0;
  for (let r = 0; r < m; r++) { bvec[r] = f[libres[r]]; for (let s = 0; s < m; s++) A[r * m + s] = Kf[libres[r] * n + libres[s]]; maxDiag = Math.max(maxDiag, A[r * m + r]); }
  const nulos: number[] = [], d = new Float64Array(m);
  for (let j = 0; j < m; j++) {
    let s = A[j * m + j];
    for (let k = 0; k < j; k++) s -= A[j * m + k] * A[j * m + k] * d[k];
    if (s <= 1e-9 * maxDiag) { nulos.push(libres[j]); d[j] = 0; for (let i = j + 1; i < m; i++) A[i * m + j] = 0; continue; }
    d[j] = s;
    for (let i = j + 1; i < m; i++) {
      let v = A[i * m + j];
      for (let k = 0; k < j; k++) v -= A[i * m + k] * A[j * m + k] * d[k];
      A[i * m + j] = v / s;
    }
  }
  // Sustitución: L·y = b, D·z = y, Lᵀ·x = z (los pivotes nulos se dejan a cero)
  const y = new Float64Array(m);
  for (let i = 0; i < m; i++) { let v = bvec[i]; for (let k = 0; k < i; k++) v -= A[i * m + k] * y[k]; y[i] = v; }
  for (let i = 0; i < m; i++) y[i] = d[i] > 0 ? y[i] / d[i] : 0;
  for (let i = m - 1; i >= 0; i--) { let v = y[i]; for (let k = i + 1; k < m; k++) v -= A[k * m + i] * y[k]; y[i] = v; }
  const u = new Float64Array(n);
  for (let r = 0; r < m; r++) u[libres[r]] = y[r];
  const modos: Float64Array[] = [];
  for (const g of nulos.slice(0, 16)) {
    const j = libres.indexOf(g), v = new Float64Array(m); v[j] = 1;
    for (let i = j - 1; i >= 0; i--) { let s = 0; for (let k = i + 1; k <= j; k++) s += A[k * m + i] * v[k]; v[i] = -s; }
    const w = new Float64Array(n); for (let r = 0; r < m; r++) w[libres[r]] = v[r];
    modos.push(w);
  }
  return { u, nulos, modos };
}

/** Matriz de rigidez de una celosía de barras articuladas (3 gdl por nudo). */
function rigidezArticulada(nodos: P3[], barras: Barra[]) {
  const n = nodos.length * 3, Kf = new Float64Array(n * n);
  for (const b of barras) {
    const a = nodos[b.i], c = nodos[b.j], L = d3(a, c); if (L < 1e-6) continue;
    const e = [(c[0] - a[0]) / L, (c[1] - a[1]) / L, (c[2] - a[2]) / L], k = b.EA / L;
    for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) {
      const v = k * e[p] * e[q];
      Kf[(3 * b.i + p) * n + 3 * b.i + q] += v; Kf[(3 * b.j + p) * n + 3 * b.j + q] += v;
      Kf[(3 * b.i + p) * n + 3 * b.j + q] -= v; Kf[(3 * b.j + p) * n + 3 * b.i + q] -= v;
    }
  }
  return Kf;
}

/** Matriz de rigidez de un pórtico espacial de vigas (6 gdl por nudo, uniones rígidas). */
function rigidezSoldada(nodos: P3[], barras: Barra[]) {
  const n = nodos.length * 6, Kf = new Float64Array(n * n);
  const k = new Float64Array(144), T = new Float64Array(144);
  for (const b of barras) {
    const a = nodos[b.i], c = nodos[b.j], L = d3(a, c); if (L < 1e-6) continue;
    const ex = [(c[0] - a[0]) / L, (c[1] - a[1]) / L, (c[2] - a[2]) / L];
    const v = Math.abs(ex[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let ez = [ex[1] * v[2] - ex[2] * v[1], ex[2] * v[0] - ex[0] * v[2], ex[0] * v[1] - ex[1] * v[0]];
    const nz = Math.hypot(ez[0], ez[1], ez[2]); ez = ez.map(q => q / nz);
    const ey = [ez[1] * ex[2] - ez[2] * ex[1], ez[2] * ex[0] - ez[0] * ex[2], ez[0] * ex[1] - ez[1] * ex[0]];
    k.fill(0);
    const S = (r: number, s: number, val: number) => { k[r * 12 + s] += val; };
    const EA = b.EA / L, EI = b.EI, GJ = b.GJ / L, L2 = L * L, L3 = L2 * L;
    S(0, 0, EA); S(6, 6, EA); S(0, 6, -EA); S(6, 0, -EA);
    S(3, 3, GJ); S(9, 9, GJ); S(3, 9, -GJ); S(9, 3, -GJ);
    // flexión en el plano x-y (giro alrededor de z): gdl 1, 5, 7, 11
    const fy = [[12 / L3, 6 / L2, -12 / L3, 6 / L2], [6 / L2, 4 / L, -6 / L2, 2 / L], [-12 / L3, -6 / L2, 12 / L3, -6 / L2], [6 / L2, 2 / L, -6 / L2, 4 / L]];
    const iy = [1, 5, 7, 11];
    for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) S(iy[p], iy[q], EI * fy[p][q]);
    // flexión en el plano x-z (giro alrededor de y): gdl 2, 4, 8, 10
    const fz = [[12 / L3, -6 / L2, -12 / L3, -6 / L2], [-6 / L2, 4 / L, 6 / L2, 2 / L], [-12 / L3, 6 / L2, 12 / L3, 6 / L2], [-6 / L2, 2 / L, 6 / L2, 4 / L]];
    const iz = [2, 4, 8, 10];
    for (let p = 0; p < 4; p++) for (let q = 0; q < 4; q++) S(iz[p], iz[q], EI * fz[p][q]);
    // Transformación T (filas = ejes locales) en bloques de 3
    T.fill(0);
    const R = [ex, ey, ez];
    for (let blk = 0; blk < 4; blk++) for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) T[(3 * blk + p) * 12 + 3 * blk + q] = R[p][q];
    // Kg = Tᵀ k T
    const kT = new Float64Array(144);
    for (let p = 0; p < 12; p++) for (let q = 0; q < 12; q++) { let s = 0; for (let r = 0; r < 12; r++) s += k[p * 12 + r] * T[r * 12 + q]; kT[p * 12 + q] = s; }
    const g = [6 * b.i, 6 * b.i + 1, 6 * b.i + 2, 6 * b.i + 3, 6 * b.i + 4, 6 * b.i + 5, 6 * b.j, 6 * b.j + 1, 6 * b.j + 2, 6 * b.j + 3, 6 * b.j + 4, 6 * b.j + 5];
    for (let p = 0; p < 12; p++) for (let q = 0; q < 12; q++) { let s = 0; for (let r = 0; r < 12; r++) s += T[r * 12 + p] * kT[r * 12 + q]; Kf[g[p] * n + g[q]] += s; }
  }
  return Kf;
}

/**
 * La celosía como barras articuladas: se quitan los extremos sueltos y los
 * nudos de paso (donde solo se juntan dos barras: los tramos de un tubo
 * curvo, o dos tubos soldados en ángulo) se funden en una barra recta entre
 * sus vecinos, con la rigidez en serie de las dos. Los puntos duros
 * (`fijos`) no se tocan.
 */
function simplificarCelosia(nodos: P3[], barras: Barra[], fijos: Set<number>) {
  let bs = barras.filter(b => b.i !== b.j);
  for (let ronda = 0; ronda < 200; ronda++) {
    const grado = new Map<number, Barra[]>();
    for (const b of bs) { (grado.get(b.i) ?? grado.set(b.i, []).get(b.i)!).push(b); (grado.get(b.j) ?? grado.set(b.j, []).get(b.j)!).push(b); }
    let cambio = false;
    for (const [nd, lista] of grado) {
      if (fijos.has(nd)) continue;
      if (lista.length === 1) { bs = bs.filter(b => b !== lista[0]); cambio = true; break; }
      if (lista.length === 2) {
        const [b1, b2] = lista, o1 = b1.i === nd ? b1.j : b1.i, o2 = b2.i === nd ? b2.j : b2.i;
        bs = bs.filter(b => b !== b1 && b !== b2);
        if (o1 !== o2) {
          const L1 = d3(nodos[nd], nodos[o1]), L2 = d3(nodos[nd], nodos[o2]), L = d3(nodos[o1], nodos[o2]);
          if (L > 1e-6) { const k = 1 / (L1 / b1.EA + L2 / b2.EA); bs.push({ i: o1, j: o2, EA: k * L, EI: Math.min(b1.EI, b2.EI), GJ: Math.min(b1.GJ, b2.GJ), tubo: b1.tubo }); }
        }
        cambio = true; break;
      }
    }
    if (!cambio) break;
  }
  return bs;
}

/** Para depurar una celosía: sus nudos y barras simplificados y, por cada mecanismo, los nudos que se mueven con su vector. */
export function diagnosticoCelosia(tubos: Tubo[], c: ContextoChasis) {
  const { nodos, barras } = grafo(tubos);
  const torretas = [1, -1].map(s => masCercano(nodos, [0.03, c.yTow, s * c.zTF]).k);
  const amort = [1, -1].map(s => masCercano(nodos, [c.xR - 0.30, c.yAmortR, s * 0.30]).k);
  const dash = [1, -1].map(s => masCercano(nodos, [c.xD, c.yDash, s * 0.36]).k);
  const fijos = new Set([...torretas, ...amort, ...dash]);
  const celosia = simplificarCelosia(nodos, barras, fijos);
  const activos = new Set<number>(); for (const b of celosia) { activos.add(b.i); activos.add(b.j); }
  const grado = new Map<number, number>(); for (const b of celosia) { grado.set(b.i, (grado.get(b.i) ?? 0) + 1); grado.set(b.j, (grado.get(b.j) ?? 0) + 1); }
  const n = nodos.length * 3, Kf = rigidezArticulada(nodos, celosia), fijo = new Set<number>();
  for (const t of torretas) for (let p = 0; p < 3; p++) fijo.add(3 * t + p);
  for (const d of dash) fijo.add(3 * d);
  const libres: number[] = []; for (const k of activos) for (let p = 0; p < 3; p++) if (!fijo.has(3 * k + p)) libres.push(3 * k + p);
  const { nulos, modos } = resolver(Kf, n, new Float64Array(n), libres);
  return {
    nodos: [...activos].map(k => ({ k, p: nodos[k], grado: grado.get(k) ?? 0 })),
    barras: celosia.map(b => [b.i, b.j] as [number, number]),
    mecanismos: modos.map((w, m) => ({ gdl: nulos[m], nudos: [...activos].map(k => ({ k, p: nodos[k], v: [w[3 * k], w[3 * k + 1], w[3 * k + 2]] as P3 })).filter(q => Math.hypot(...q.v) > 1e-6).sort((a, b) => Math.hypot(...b.v) - Math.hypot(...a.v)) })),
  };
}

const masCercano = (nodos: P3[], p: P3, enUso?: Set<number>) => {
  let mejor = -1, dm = 9;
  nodos.forEach((q, k) => { if (enUso && !enUso.has(k)) return; const d = d3(q, p); if (d < dm) { dm = d; mejor = k; } });
  return { k: mejor, d: dm };
};

const fmt1 = (v: number) => (v >= 100 ? Math.round(v).toLocaleString('es-ES') : (Math.round(v * 10) / 10).toLocaleString('es-ES'));

export function evaluarChasis(version: 'largueros' | 'celosia', tubos: Tubo[], c: ContextoChasis): EvaluacionChasis {
  const nombre = version === 'celosia' ? 'Versión 2 · celosía' : 'Versión 1 · largueros';
  const notas: string[] = [];
  // ── Masa y metros ──────────────────────────────────────────────────────────
  let masaKg = 0, masaAceroKg = 0, largoM = 0;
  for (const t of tubos) {
    if (t.comprado) continue;
    const kg = seccion(t).A * largoTubo(t) * densidadDe(t.material);
    masaKg += kg; largoM += largoTubo(t);
    if (/acero|cromoly/i.test(t.material)) masaAceroKg += kg;
  }
  const masaAluminioKg = masaKg - masaAceroKg;

  // ── Grafo: nudos, uniones en T, triángulos ─────────────────────────────────
  const { nodos, barras } = grafo(tubos);
  const tubosEnNudo = new Map<number, Set<number>>();
  for (const b of barras) for (const k of [b.i, b.j]) (tubosEnNudo.get(k) ?? tubosEnNudo.set(k, new Set()).get(k)!).add(b.tubo);
  const nNudos = [...tubosEnNudo.values()].filter(s => s.size >= 2).length;

  // Puntos duros: torretas (apoyo), soportes del amortiguador trasero (par), esquinas del salpicadero (sujeción en x), carga de flexión.
  const torretas = [1, -1].map(s => masCercano(nodos, [0.03, c.yTow, s * c.zTF]));
  const amort = [1, -1].map(s => masCercano(nodos, [c.xR - 0.30, c.yAmortR, s * 0.30]));
  const dash = [1, -1].map(s => masCercano(nodos, [c.xD, c.yDash, s * 0.36]));
  const xMedio = c.xR / 2;
  const sueloIdx = new Set(nodos.map((p, k) => (p[1] < c.yFloor + 0.08 && Math.abs(p[2]) > 0.1 ? k : -1)).filter(k => k >= 0));
  const carga = [1, -1].map(s => {
    let mejor = -1, dm = 9;
    for (const k of sueloIdx) { const p = nodos[k]; if (Math.sign(p[2]) !== s) continue; const d = Math.abs(p[0] - xMedio); if (d < dm) { dm = d; mejor = k; } }
    return { k: mejor, d: dm };
  });
  const duros = [...torretas, ...amort, ...dash, ...carga];
  const hayDuros = duros.every(p => p.k >= 0) && torretas.every(p => p.d < 0.02) && amort.every(p => p.d < 0.02);
  const fijos = new Set(duros.map(p => p.k));
  const celosia = simplificarCelosia(nodos, barras, fijos);
  // Triángulos cerrados del grafo (sobre la celosía simplificada)
  const ady = new Map<number, Set<number>>();
  for (const b of celosia) { (ady.get(b.i) ?? ady.set(b.i, new Set()).get(b.i)!).add(b.j); (ady.get(b.j) ?? ady.set(b.j, new Set()).get(b.j)!).add(b.i); }
  let triangulos = 0;
  for (const [i, vi] of ady) for (const j of vi) if (j > i) for (const k of vi) if (k > j && ady.get(j)!.has(k)) triangulos++;

  let rigidezTorsion: number | null = null, rigidezFlexion: number | null = null, mecanismos = 0;
  let rigidezTorsionSoldada: number | null = null, rigidezFlexionSoldada: number | null = null;
  let nudosLibres: P3[] = [];
  const F = 1000;   // N por lado (par) y en total (flexión); el cálculo es lineal, la cifra no importa
  const dz = nodos[amort[0].k][2] - nodos[amort[1].k][2];

  if (hayDuros) {
    // Casos de carga sobre cualquiera de los dos modelos; solo entran los nudos que usa el modelo (`activos`)
    const gdlLibres = (g: number, activos: Set<number>, fijo: Set<number>) => {
      const libres: number[] = [];
      for (const k of activos) for (let p = 0; p < g; p++) if (!fijo.has(g * k + p)) libres.push(g * k + p);
      return libres;
    };
    const torsion = (Kf: Float64Array, g: number, activos: Set<number>) => {
      const n = nodos.length * g, f = new Float64Array(n), fijo = new Set<number>();
      for (const t of torretas) for (let p = 0; p < 3; p++) fijo.add(g * t.k + p);
      for (const d of dash) fijo.add(g * d.k);                 // sujeción en x: impide el giro de sólido rígido alrededor del eje de las torretas
      f[g * amort[0].k + 1] = F; f[g * amort[1].k + 1] = -F;
      const { u, nulos, modos } = resolver(Kf, n, f, gdlLibres(g, activos, fijo));
      const giro = (u[g * amort[0].k + 1] - u[g * amort[1].k + 1]) / dz;    // rad
      return { k: giro > 0 ? F * dz / giro * Math.PI / 180 : null, nulos, modos };  // N·m por grado
    };
    const flexion = (Kf: Float64Array, g: number, activos: Set<number>) => {
      const n = nodos.length * g, f = new Float64Array(n), fijo = new Set<number>();
      for (const t of torretas) for (let p = 0; p < 3; p++) fijo.add(g * t.k + p);
      for (const a of amort) fijo.add(g * a.k + 1);
      f[g * carga[0].k + 1] = -F / 2; f[g * carga[1].k + 1] = -F / 2;
      const { u, nulos } = resolver(Kf, n, f, gdlLibres(g, activos, fijo));
      const flecha = -(u[g * carga[0].k + 1] + u[g * carga[1].k + 1]) / 2;   // m
      return { k: flecha > 0 ? F / flecha / 1000 : null, nulos };            // N por mm
    };
    const activosA = new Set<number>(); for (const b of celosia) { activosA.add(b.i); activosA.add(b.j); }
    if ([...fijos].every(k => activosA.has(k))) {
      const Ka = rigidezArticulada(nodos, celosia);
      const tA = torsion(Ka, 3, activosA), fA = flexion(Ka, 3, activosA);
      mecanismos = tA.nulos.length;
      // Los nudos que más se mueven en cada mecanismo (los tres mayores de cada modo)
      const libres = new Set<number>();
      for (const w of tA.modos) {
        const amp = new Map<number, number>();
        for (const k of activosA) amp.set(k, Math.hypot(w[3 * k], w[3 * k + 1], w[3 * k + 2]));
        [...amp.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([k, a]) => { if (a > 1e-6) libres.add(k); });
      }
      nudosLibres = [...libres].map(k => nodos[k]);
      if (!tA.nulos.length) rigidezTorsion = tA.k;
      if (!fA.nulos.length) rigidezFlexion = fA.k;
    } else mecanismos = fijos.size;
    const activosS = new Set<number>(); for (const b of barras) { activosS.add(b.i); activosS.add(b.j); }
    const Ks = rigidezSoldada(nodos, barras);
    const tS = torsion(Ks, 6, activosS), fS = flexion(Ks, 6, activosS);
    if (!tS.nulos.length) rigidezTorsionSoldada = tS.k;
    if (!fS.nulos.length) rigidezFlexionSoldada = fS.k;
  } else {
    notas.push('No encuentro las torretas delanteras o los soportes del amortiguador trasero entre los nudos: sin ellos no hay dónde apoyar ni dónde cargar, así que no estimo la rigidez.');
  }

  // ── Notas ──────────────────────────────────────────────────────────────────
  const pct = (a: number, b: number) => Math.round(100 * a / Math.max(1e-9, b));
  const soldada = rigidezTorsionSoldada !== null ? `${fmt1(rigidezTorsionSoldada)} N·m por grado de torsión${rigidezFlexionSoldada !== null ? ` y ${fmt1(rigidezFlexionSoldada)} N/mm a flexión` : ''}` : 'no se ha podido calcular';
  if (version === 'largueros') {
    if (rigidezTorsion === null) notas.push(`La versión 1 tiene cuadros sin diagonal (${mecanismos} formas de moverse sin que ninguna barra se estire): como barras articuladas se deformaría sin resistencia; su rigidez real viene de las soldaduras, que este cálculo no cuenta.`);
    notas.push(`Contando las soldaduras como uniones rígidas (los tubos trabajan a flexión): ${soldada}.`);
    notas.push(`Dos largueros Ø40 y ${tubos.filter(t => /Travesaño/.test(t.nombre)).length} travesaños forman una escalera: cada rectángulo se deforma en rombo salvo por la flexión de los tubos y de sus soldaduras, que es poca; este chasis se retuerce al pasar un bache con una sola rueda, y la cúpula, las puertas y los cristales lo notan.`);
    notas.push(`La jaula de acero (arco de seguridad, montantes del parabrisas y pies del arco) pesa ${fmt1(masaAceroKg)} kg, el ${pct(masaAceroKg, masaKg)} % del chasis; los ${fmt1(masaAluminioKg)} kg de aluminio van sobre todo en los largueros.`);
    notas.push('Los montantes del parabrisas acaban sueltos arriba: solo sujetan la bisagra de la puerta, no colaboran en la estructura.');
  } else {
    if (rigidezTorsion !== null) notas.push(`Toda la celosía está triangulada: como barras articuladas (sin contar las soldaduras) ya aguanta ${fmt1(rigidezTorsion)} N·m por grado a torsión${rigidezFlexion !== null ? ` y ${fmt1(rigidezFlexion)} N/mm a flexión` : ''}. Eso lo da la forma, no las uniones.`);
    else notas.push(`Como barras articuladas queda${mecanismos === 1 ? '' : 'n'} ${mecanismos} forma${mecanismos === 1 ? '' : 's'} de moverse sin estirar ninguna barra: el arco de seguridad bascula en su plano, porque la diagonal que lo cerraría cruzaría al pasajero. Lo aguanta la flexión del propio arco, que el cálculo articulado no cuenta; por eso la cifra comparable es la soldada.`);
    notas.push(`Con las soldaduras como uniones rígidas: ${soldada}.`);
    notas.push(`Patrón Seven: cordones inferiores a ±32 cm (morro y eje trasero, donde ancla la suspensión) y ±46 cm (cabina, por fuera de la batería), estribos a ±50 cm, costados en Warren, suelo en zigzag, cordón alto del morro a cada torreta, dos X en el salpicadero por encima de las piernas, mamparo trasero en X desde los pivotes, caja trasera cerrada por cinco caras y aro de la puerta cerrado con el larguero del techo y un tirante trasero del arco; ${tubos.length} tubos, ${fmt1(largoM)} m, ${triangulos} triángulos.`);
    notas.push(`Sin triangular, a conciencia: el suelo bajo el motor (la caja trasera se cierra por sus otras caras) y el plano del arco (el pasajero entra por ahí). Roza: la esquina delantera del módulo de batería del piloto, con la torreta trasera (igual que en la v1) y con la diagonal estribo–cordón; un chaflán de 6 × 10 cm en el módulo lo resuelve.`);
    notas.push(`Acero: ${fmt1(masaAceroKg)} kg (${pct(masaAceroKg, masaKg)} %): el mismo arco y los mismos montantes que la v1; aluminio: ${fmt1(masaAluminioKg)} kg en tubos Ø22–32 × 1,5 mm. Las diagonales largas del suelo (hasta 0,9 m, Ø25) son las primeras en pandear a compresión: si hace falta, a Ø28. Para bajar de la v1 en peso: montantes del parabrisas Ø30 × 1,5 en vez de × 2 (−0,8 kg; ya no trabajan en voladizo) o arco Ø38 × 2 (−1,1 kg).`);
  }
  return { version, nombre, masaKg, nTubos: tubos.length, largoM, nNudos, triangulos, rigidezTorsion, rigidezFlexion, mecanismos, rigidezTorsionSoldada, rigidezFlexionSoldada, masaAceroKg, masaAluminioKg, nudosLibres, notas };
}

/** Solo para pruebas (scripts): las piezas del cálculo. */
export const _interno = { grafo, rigidezSoldada, rigidezArticulada, resolver };
