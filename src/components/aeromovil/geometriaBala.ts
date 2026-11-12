// ============================================================================
// CUADRICICLO BALA · el tercer vehículo del editor (2026-11-09, Eugenio)
// ============================================================================
// Eugenio, con el Bala ya en el garaje: «permíteme editarlo», y eligió que «el
// Bala pasa a ser un diseño más en "Diseños", con sus deslizadores, guardado
// en tu cuenta y con "Probar" en el túnel».
//
// Una sola forma: la del garaje (garaje/balaForma.ts), construida a partir de
// unas medidas. Aquí está lo que el editor añade encima: qué deslizadores hay
// y en qué rango, cómo pasan los parámetros guardados a esas medidas, y lo que
// se puede calcular con honradez (área frontal, volumen, piel, holguras). El
// Cd de la fórmula del editor NO vale para esta forma (es la de una gota de
// velomóvil); el del Bala lo estima el túnel de viento.
//
// Puro (sin three.js): el trabajador del túnel lo usa para «Probar».

import type { Comprobacion, Modelo, Parametros, PuntosOcupante, Pulgadas, Resultados, Rueda } from './geometria';
import { BALA_DEFECTO, DIAMETRO_RUEDA, PARAMETROS_BALA } from './geometria';
import { crearForma, punto, type DimBala, type FormaBala } from './garaje/balaForma';
import { ALETA, APLASTADO_BALA, ASIENTO, POD_SEMIANCHO, alturasPod, brazosDe, contornoCupula, escalaManillar, extremoManillar, podDe, semiAncho, techoEn, type Asientos } from './garaje/balaMedidas';

/** Los parámetros propios del Bala. Van en `Parametros` como opcionales: los diseños del Gota y del Aeromóvil 1 no los llevan. */
export interface CamposBala {
  bBatalla: number;    // batalla: eje delantero a eje trasero (m)
  bVia: number;        // vía de las ruedas laterales, centro a centro (m)
  bAncho: number;      // ancho de la carrocería, sin los carenados laterales (m)
  bSuelo: number;      // altura libre: lo más bajo de la panza al suelo (m)
  bMorro: number;      // morro: del eje delantero a la punta (m)
  bPuntaMorro: number; // lo afilado del cono del morro (exponente de la ojiva; más = más en punta)
  bCola: number;       // cola: del eje trasero a la punta (m)
  bPuntaCola: number;  // altura a la que se cierra la punta de la cola (m)
  bAleta: number;      // altura de la punta de la aleta sobre el suelo (m)
  bCupIni: number;     // dónde empieza a subir la cúpula, detrás del eje delantero (m)
  bCupFin: number;     // dónde acaba de bajar, detrás del eje delantero (m)
  bAlto: number;       // alto total: lo más alto de la cúpula (m)
  bPilX: number;       // cadera del piloto, detrás del eje delantero (m)
  bPilY: number;       // altura del sillín bajo el piloto, sobre el suelo (m)
  bPasX: number;       // cadera del pasajero, detrás del eje delantero (m)
  bPasY: number;       // altura del sillín bajo el pasajero, sobre el suelo (m)
  bRuedaDT: Pulgadas;  // ruedas delantera y trasera (dentro de la carrocería)
  bRuedaLat: Pulgadas; // ruedas laterales (en los carenados)
}
export type ClaveBala = keyof CamposBala;

/** Anchos de neumático (no se eligen): de ciclomotor, 80 mm delante y detrás y 70 mm a los lados. */
export const ANCHO_NEU = 0.08, ANCHO_NEU_LAT = 0.07;
/** Holgura mínima entre el carenado lateral y la carrocería, que la vía nunca baja de ahí (m). */
export const HUECO_CARENADO = 0.03;

// ------------------------------------------------------------------ deslizadores
/**
 * Los deslizadores del Bala: etiqueta, bloque y rango. Una sola tabla que leen
 * la página (Aeromovil.tsx) y las opciones del túnel (tunel/explicaciones.ts),
 * para que no se separen. Los rangos que dependen de otra medida (la cúpula de
 * la batalla, el pasajero del piloto) se calculan con `rangoBala`.
 */
export interface FichaBala { clave: Exclude<ClaveBala, 'bRuedaDT' | 'bRuedaLat'>; n: string; bloque: BloqueBala; min: number; max: number; paso: number }
export type BloqueBala = 'Medidas' | 'Morro y cola' | 'Cúpula' | 'Ocupantes';
export const BLOQUES_BALA: BloqueBala[] = ['Medidas', 'Morro y cola', 'Cúpula', 'Ocupantes'];
export const DESLIZADORES_BALA: FichaBala[] = [
  // symmetric about the garage's value: the page's slider recentres on it and would cut a longer side off
  { clave: 'bBatalla', n: 'Batalla: eje delantero a trasero', bloque: 'Medidas', min: 2.20, max: 2.70, paso: 0.01 },
  { clave: 'bVia', n: 'Vía de las ruedas laterales', bloque: 'Medidas', min: 0.95, max: 1.25, paso: 0.01 },
  { clave: 'bAncho', n: 'Ancho de la carrocería', bloque: 'Medidas', min: 0.77, max: 0.93, paso: 0.01 },
  { clave: 'bSuelo', n: 'Altura libre al suelo', bloque: 'Medidas', min: 0.09, max: 0.158, paso: 0.002 },
  { clave: 'bMorro', n: 'Morro: del eje delantero a la punta', bloque: 'Morro y cola', min: 0.45, max: 0.75, paso: 0.01 },
  { clave: 'bPuntaMorro', n: 'Morro: afilado de la punta', bloque: 'Morro y cola', min: 0.50, max: 1.00, paso: 0.01 },
  { clave: 'bCola', n: 'Cola: del eje trasero a la punta', bloque: 'Morro y cola', min: 0.45, max: 0.85, paso: 0.01 },
  { clave: 'bPuntaCola', n: 'Cola: altura de la punta', bloque: 'Morro y cola', min: 0.36, max: 0.58, paso: 0.005 },
  { clave: 'bAleta', n: 'Aleta: altura de la punta', bloque: 'Morro y cola', min: 0.85, max: 1.15, paso: 0.005 },
  { clave: 'bCupIni', n: 'Cúpula: dónde empieza a subir', bloque: 'Cúpula', min: 0.05, max: 0.25, paso: 0.01 },
  { clave: 'bCupFin', n: 'Cúpula: dónde acaba de bajar', bloque: 'Cúpula', min: 1.80, max: 2.20, paso: 0.01 },
  { clave: 'bAlto', n: 'Alto total (techo de la cúpula)', bloque: 'Cúpula', min: 1.32, max: 1.584, paso: 0.002 },
  { clave: 'bPilX', n: 'Piloto: cadera al eje delantero', bloque: 'Ocupantes', min: 0.94, max: 1.18, paso: 0.01 },
  { clave: 'bPilY', n: 'Piloto: altura del sillín', bloque: 'Ocupantes', min: 0.38, max: 0.50, paso: 0.005 },
  { clave: 'bPasX', n: 'Pasajero: cadera al eje delantero', bloque: 'Ocupantes', min: 1.36, max: 1.80, paso: 0.01 },
  { clave: 'bPasY', n: 'Pasajero: altura del sillín', bloque: 'Ocupantes', min: 0.42, max: 0.52, paso: 0.005 },
];
export const fichaBala = (k: ClaveBala) => DESLIZADORES_BALA.find(f => f.clave === k);
/** Ruedas que se pueden elegir: delante y detrás van dentro de la carrocería; a los lados, en carenados que crecen con la rueda. */
export const RUEDAS_DT_BALA: Pulgadas[] = ['20', '24', '26'];
export const RUEDAS_LAT_BALA: Pulgadas[] = ['16', '20', '24'];

/** Los parámetros del Bala de un diseño: lo guardado, y lo que falte, el del garaje. */
export function camposBala(P: Partial<Parametros>): CamposBala {
  const o = { ...BALA_DEFECTO };
  for (const k of Object.keys(BALA_DEFECTO) as ClaveBala[]) {
    const v = P[k], ref = BALA_DEFECTO[k];
    if (typeof ref === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof v === 'string' && v in DIAMETRO_RUEDA) (o as Record<string, unknown>)[k] = v;
  }
  return o;
}

/**
 * El rango de un deslizador para estos parámetros. Dos dependen de otro:
 * la cúpula acaba al menos 25 cm por delante del eje trasero, y el pasajero
 * va entre 40 y 62 cm detrás del piloto (menos, sus rodillas no caben detrás
 * de la espalda del piloto; más, sale de debajo de la cúpula).
 */
export function rangoBala(k: FichaBala['clave'], B: CamposBala): [number, number] {
  const f = fichaBala(k)!;
  if (k === 'bCupFin') return [Math.min(f.min, B.bBatalla - 0.45), Math.min(f.max, B.bBatalla - 0.25)];
  if (k === 'bPasX') return [Math.max(f.min, B.bPilX + 0.40), Math.min(f.max, B.bPilX + 0.62)];
  return [f.min, f.max];
}

/**
 * Las medidas de la forma para estos parámetros, con los valores ya dentro de
 * su rango (un diseño guardado a mano o con otra versión no puede construir un
 * Bala imposible). La vía nunca deja el carenado a menos de 3 cm de la
 * carrocería: si el ancho lo pide, sube.
 */
export function medidasBala(B: CamposBala): { D: DimBala; asientos: Asientos; aleta: number; F: FormaBala; viaPedida: number } {
  const lim = (k: FichaBala['clave']) => { const [a, b] = rangoBala(k, B); return Math.min(b, Math.max(a, B[k])); };
  const rDel = DIAMETRO_RUEDA[B.bRuedaDT] / 2, rLat = DIAMETRO_RUEDA[B.bRuedaLat] / 2;
  const D: DimBala = {
    batalla: lim('bBatalla'), morro: lim('bMorro'), cola: lim('bCola'), ancho: lim('bAncho'), alto: lim('bAlto'), suelo: lim('bSuelo'),
    cupIni: lim('bCupIni'), cupFin: lim('bCupFin'), puntaMorro: lim('bPuntaMorro'), puntaCola: lim('bPuntaCola'),
    rDel, rLat, anchoNeu: ANCHO_NEU, anchoNeuLat: ANCHO_NEU_LAT, via: lim('bVia'),
  };
  let F = crearForma(D);
  const viaMin = 2 * (anchoCuerpoEnCarenado(F) + POD_SEMIANCHO + HUECO_CARENADO);
  if (D.via < viaMin) F = crearForma({ ...D, via: Math.ceil(viaMin * 100) / 100 });
  const asientos: Asientos = { xPiloto: -lim('bPilX'), yPiloto: lim('bPilY'), xPasajero: -lim('bPasX'), yPasajero: lim('bPasY') };
  return { D: F.D, asientos, aleta: lim('bAleta'), F, viaPedida: D.via };
}
/** Lo más ancho de la carrocería (media anchura) a la altura y a lo largo de los carenados laterales. */
function anchoCuerpoEnCarenado(F: FormaBala): number {
  const POD = podDe(F); let z = 0;
  for (let i = 0; i <= 12; i++) {
    const xr = POD[0].x + (POD[POD.length - 1].x - POD[0].x) * i / 12, h = alturasPod(POD, xr); if (!h) continue;
    for (let j = 0; j <= 8; j++) { const v = F.ladoZ(F.X_LAT + xr, h[0] + (h[1] - h[0]) * j / 8); if (Number.isFinite(v)) z = Math.max(z, v); }
  }
  return z;
}

// ------------------------------------------------------------------ el modelo
/**
 * Talla sentado (de la superficie del asiento a lo alto de la cabeza, sentado
 * erguido), hombres: encuesta antropométrica del ejército de EE. UU. de 2012
 * (ANSUR II, Gordon et al. 2014), percentiles 50 y 95: 91,8 y 97,7 cm.
 */
export const TALLA_SENTADO = { p50: 0.918, p95: 0.977 };
/** Cuánto se inclina hacia delante el tronco (°): el piloto, con las manos en el manillar; el pasajero, casi erguido. Supuestos, no medidos. */
export const INCLINACION = { piloto: 5, pasajero: 5 };
/**
 * El maniquí sentado: la cadera 10,8 cm sobre el asiento, la cabeza (centro) 70 cm
 * más allá por el tronco y 11 cm de media cabeza. Con la talla media suma 91,8 cm
 * erguido, la talla sentado del percentil 50; para otra talla se escala entero.
 */
export const CADERA_SOBRE_ASIENTO = 0.108, CABEZA_EN_TRONCO = 0.70, MEDIA_CABEZA = 0.11;
/** Rodilla por cinemática inversa: muslo l1 y pierna l2 de la cadera h al pie f, la rodilla hacia delante y arriba. */
export function rodilla(h: [number, number], f: [number, number], l1: number, l2: number): [number, number] {
  const dx = f[0] - h[0], dy = f[1] - h[1], d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3);
  const a = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)), b = Math.atan2(dy, dx);
  return [h[0] + l1 * Math.cos(b + a), h[1] + l1 * Math.sin(b + a)];
}
/**
 * Los puntos del maniquí de cada uno (los dibuja el visor en «Ocupantes»): a horcajadas,
 * el piloto con los pies en las plataformas y las manos en los puños; el pasajero con los
 * pies en las estriberas y las manos en el asidero. `escala` 1 es la talla media.
 */
function puntosOcupante(F: FormaBala, S: Asientos, piloto: boolean, escala = 1): PuntosOcupante {
  const a = (piloto ? INCLINACION.piloto : INCLINACION.pasajero) * Math.PI / 180;
  const d: [number, number] = [Math.sin(a), Math.cos(a)];
  const xH = piloto ? S.xPiloto : S.xPasajero, yS = piloto ? S.yPiloto : S.yPasajero;
  const H: [number, number] = [xH, yS + CADERA_SOBRE_ASIENTO * escala];
  const en = (t: number): [number, number] => [H[0] + d[0] * t * escala, H[1] + d[1] * t * escala];
  const dxPil = S.xPiloto - ASIENTO.xPiloto, dxPas = S.xPasajero - ASIENTO.xPasajero, kz = Math.min(1, F.kW);
  // feet where balaPiezas.ts puts the footboards (pilot) and the footpegs (passenger)
  const Fp: [number, number] = piloto ? [-0.52 + dxPil, 0.235 + F.dSuelo] : [-1.30 + dxPas, 0.29 + F.dSuelo];
  const K = rodilla(H, Fp, 0.45 * escala, 0.47 * escala);
  const mano: [number, number] = piloto ? [-0.592, 0.870 + F.dSuelo] : [-1.45 + dxPas, 0.505 + (S.yPasajero - ASIENTO.yPasajero)];
  const kb = escalaManillar(F);
  return { H, S: en(0.5), C: en(CABEZA_EN_TRONCO), K, F: Fp, d, hx: xH, mano, anchoMano: piloto ? 0.265 * kb : 0.19 * kz, anchoPiernas: piloto ? [0.13, 0.15 * kz] : [0.17, 0.20 * kz] };
}

export function crearModeloBala(P: Parametros) {
  const B = camposBala(P);
  const { D, asientos, aleta, F, viaPedida } = medidasBala(B);
  const cup = contornoCupula(F);
  const rF = F.R_DEL, rR = F.R_DEL, rL = F.R_LAT, xR = -F.BATALLA, xL = F.X_LAT;
  const anchoTotal = Math.round((F.VIA_LAT + 2 * POD_SEMIANCHO) * 1000) / 1000;
  const ruedas: Rueda[] = [
    { nombre: 'Rueda delantera', x: 0, z: 0, r: rF, w: F.ANCHO_NEU }, { nombre: 'Rueda trasera', x: xR, z: 0, r: rR, w: F.ANCHO_NEU },
    { nombre: 'Rueda lateral izq.', x: xL, z: F.VIA_LAT / 2, r: rL, w: F.ANCHO_NEU_LAT }, { nombre: 'Rueda lateral der.', x: xL, z: -F.VIA_LAT / 2, r: rL, w: F.ANCHO_NEU_LAT },
  ];
  // Lo que leen el visor, las cotas y el garaje en `P`: las medidas de verdad del Bala, no las del Gota que trae de base.
  const Pm: Parametros = { ...P, ...B, L: F.LARGO, B: F.BATALLA, W: anchoTotal, H: D.alto, clear: D.suelo, track: F.VIA_LAT };
  return {
    tipo: "bala" as const, P: Pm, campos: B, F, D, sillines: asientos, aleta, cup, viaPedida,
    xn: F.X_MORRO, xt: F.X_COLA, Lf: F.LARGO, rF, rR, rL, xR, xL, anchoTotal, anchoCuerpo: D.ancho, alto: D.alto,
    ruedas, via: { del: 0, tras: 0 },
    /** Los maniquíes de talla media (el visor los dibuja con la función de los otros dos vehículos). */
    occPts: (piloto: boolean) => puntosOcupante(F, asientos, piloto),
  };
}
export type ModeloBala = ReturnType<typeof crearModeloBala>;

// ------------------------------------------------------------------ cálculo
export interface ResultadosBala {
  /** Área frontal (m²): el total y sus partes (lo que cada parte añade a la sombra de las demás). */
  area: { total: number; cuerpo: number; carenados: number; ruedas: number; aleta: number };
  /** Volumen del cuerpo (m³) y superficie de su piel (m²): carrocería y cristal de la cúpula. */
  vol: number; piel: number; cristal: number;
  /** Dónde empieza y acaba el cristal de la cúpula, detrás del eje delantero (m). */
  cupula: [number, number];
  /** La vía se subió para dejar el carenado a 3 cm de la carrocería (m), o null. */
  viaSubida: number | null;
  /** Lo que queda sobre la cabeza de cada uno (m), sin casco: talla media y alta. */
  cabezas: { quien: 'piloto' | 'pasajero'; p50: number; p95: number; x: number }[];
}

/** La superficie de la piel (m²) en total y en la zona del cristal, integrando la malla de secciones. */
export function pielBala(F: FormaBala, cup: ReturnType<typeof contornoCupula>) {
  // the x and y moments (m³) of the body and of the glass go along too, for the Triciclo's centre of gravity
  const NX = 150, NT = 40, out = { piel: 0, cristal: 0, xPiel: 0, yPiel: 0, xCristal: 0, yCristal: 0 };
  const filas: [number, number][][] = [];
  for (let i = 0; i <= NX; i++) {
    const x = F.X_MORRO - 1e-4 - (F.LARGO - 2e-4) * i / NX, s = F.sec(x), fila: [number, number][] = [];
    for (let j = 0; j <= NT; j++) fila.push(punto(s, j / NT));
    filas.push(fila);
  }
  const xs = (i: number) => F.X_MORRO - 1e-4 - (F.LARGO - 2e-4) * i / NX;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NT; j++) {
    const a = filas[i][j], b = filas[i][j + 1], c = filas[i + 1][j], d = filas[i + 1][j + 1], x0 = xs(i), x1 = xs(i + 1);
    const tri = (p: number[], q: number[], r: number[]) => {
      const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
      return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
    };
    const A = [x0, a[1], a[0]], Bv = [x0, b[1], b[0]], C = [x1, c[1], c[0]], Dv = [x1, d[1], d[0]];
    const s = 2 * (tri(A, Bv, C) + tri(Bv, Dv, C)); // the two halves
    out.piel += s;
    const xm = (x0 + x1) / 2, ym = (a[1] + b[1] + c[1] + d[1]) / 4;
    out.xPiel += s * xm; out.yPiel += s * ym;
    if (xm <= cup.XC0 && xm >= cup.XC1 && ym > cup.Y_VIDRIO(xm)) { out.cristal += s; out.xCristal += s * xm; out.yCristal += s * ym; }
  }
  return out;
}

/**
 * El área frontal: la sombra del vehículo visto de frente. Por cada franja de 5 mm
 * de altura se juntan los tramos que tapa cada parte (cuerpo, carenados y brazos,
 * ruedas que asoman, aleta) y se mide su unión: lo que una parte tapa detrás de
 * otra no cuenta dos veces. Cada parte suma lo que añade a las anteriores.
 */
export function areaFrontalBala(m: Pick<ModeloBala, 'F' | 'alto' | 'ruedas' | 'aleta'>, extras: { y0: number; y1: number; z: number }[] = [], formasPod: FormaBala[] = [m.F]) {
  const F = m.F, DY = 0.005, NY = Math.ceil((m.alto + 0.4) / DY);
  // Media anchura del cuerpo por franja: el máximo de todas las secciones a esa altura.
  const zc = new Float64Array(NY), tramos: [number, number][][] = Array.from({ length: NY }, () => []);
  for (let x = F.X_MORRO - 0.005; x > F.X_COLA + 0.005; x -= 0.025) {
    const s = F.sec(x), p = new Float64Array(2 * 49);
    for (let k = 0; k <= 48; k++) { const q = punto(s, k / 48); p[2 * k] = q[0]; p[2 * k + 1] = q[1]; }
    for (let k = 0; k + 1 < p.length / 2; k++) {
      const z0 = p[2 * k], y0 = p[2 * k + 1], z1 = p[2 * k + 2], y1 = p[2 * k + 3];
      const i0 = Math.max(0, Math.floor(Math.min(y0, y1) / DY)), i1 = Math.min(NY - 1, Math.floor(Math.max(y0, y1) / DY));
      for (let i = i0; i <= i1; i++) { const yc = (i + 0.5) * DY; const t = y1 !== y0 ? Math.min(1, Math.max(0, (yc - y0) / (y1 - y0))) : 0.5; const z = z0 + (z1 - z0) * t; if (z > zc[i]) zc[i] = z; }
    }
  }
  // right half only (z >= 0): the left is its mirror, and the total is doubled at the end
  const poner = (i: number, a: number, b: number) => { a = Math.max(0, a); if (i >= 0 && i < NY && b > a) tramos[i].push([a, b]); };
  const largoUnion = (l: [number, number][]) => {
    const s = [...l].sort((a, b) => a[0] - b[0]); let L = 0, a = -Infinity, b = -Infinity;
    for (const [p, q] of s) { if (p > b) { if (b > a) L += b - a; a = p; b = q; } else b = Math.max(b, q); }
    if (b > a) L += b - a; return L;
  };
  const medir = () => { let A = 0; for (let i = 0; i < NY; i++) A += largoUnion(tramos[i]) * DY; return 2 * A; }; // right half, doubled
  for (let i = 0; i < NY; i++) if (zc[i] > 0) poner(i, 0, zc[i]);
  const cuerpo = medir();
  // pods: each station's superellipse around z = via/2, and the arms from the skin to the pod
  // (`formasPod`: since 2026-11-11 the «Cuadriciclo Bala clásico» also passes its rear pods' view of the shape)
  for (const Fp of formasPod) {
  const POD = podDe(Fp), ancho = semiAncho(POD), zp = Fp.VIA_LAT / 2;
  for (let i = 0; i < NY; i++) {
    const y = (i + 0.5) * DY; let w = 0;
    for (let xr = POD[POD.length - 1].x; xr <= POD[0].x; xr += 0.01) w = Math.max(w, ancho(xr, y));
    if (w > 0) poner(i, zp - w, zp + w);
  }
  for (const b of brazosDe(Fp)) {
    const z0 = F.ladoZ(Fp.X_LAT + b.x, b.yCuerpo); if (!Number.isFinite(z0)) continue;
    if (b.yCuerpo === b.y) { for (let i = Math.floor((b.y - b.grueso / 2) / DY); i <= Math.floor((b.y + b.grueso / 2) / DY); i++) poner(i, z0, zp); continue; }
    // the Triciclo lifted (round three): the arm runs down from the body to its pod; each band takes the stretch of it that crosses its height
    const ya = Math.min(b.y, b.yCuerpo) - b.grueso / 2, yb = Math.max(b.y, b.yCuerpo) + b.grueso / 2;
    for (let i = Math.floor(ya / DY); i <= Math.floor(yb / DY); i++) {
      const yc = (i + 0.5) * DY, zAt = (u: number) => z0 + (zp - z0) * u, yAt = (u: number) => b.yCuerpo + (b.y - b.yCuerpo) * u;
      let a = Infinity, c = -Infinity;
      for (let k = 0; k <= 40; k++) { const u = k / 40; if (Math.abs(yAt(u) - yc) <= b.grueso / 2 + DY / 2) { a = Math.min(a, zAt(u)); c = Math.max(c, zAt(u)); } }
      if (c > a) poner(i, a, c);
    }
  }
  }
  const conCarenados = medir();
  // wheels: front and rear on the centre line, laterals in the pods (only what shows below the body and the pods counts)
  for (const r of m.ruedas) {
    const cy = r.r - APLASTADO_BALA;
    for (let i = 0; i < NY; i++) { const y = (i + 0.5) * DY; if (y < cy + r.r) poner(i, Math.abs(r.z) - r.w / 2, Math.abs(r.z) + r.w / 2); }
  }
  // the Triciclo's rear wheel spat (2026-11-10): half-width z from y0 to y1, counted with the wheels
  for (const e of extras) for (let i = Math.floor(e.y0 / DY); i <= Math.floor(e.y1 / DY); i++) poner(i, 0, e.z);
  const conRuedas = medir();
  // the fin: its root thickness from the tail's top to the tip
  const yRaiz = techoEn(F, F.X(ALETA.punta[0][0]));
  for (let i = Math.floor(yRaiz / DY); i <= Math.floor(m.aleta / DY); i++) poner(i, 0, ALETA.grueso[0]);
  const total = medir();
  return { total, cuerpo, carenados: conCarenados - cuerpo, ruedas: conRuedas - conCarenados, aleta: total - conRuedas };
}

/** Lo que queda sobre la cabeza (m): de lo alto de la cabeza del maniquí, escalado a esa talla, a la cara de dentro del cristal, sobre el eje. */
function cabeza(m: ModeloBala, piloto: boolean, talla: number, espCristal: number) {
  const o = puntosOcupante(m.F, m.sillines, piloto, talla / TALLA_SENTADO.p50);
  const x = o.C[0], y = o.C[1] + MEDIA_CABEZA * talla / TALLA_SENTADO.p50;
  return { holgura: techoEn(m.F, x) - espCristal - y, x };
}

/** Holgura (m) de una rueda a la piel, para la parte que va por encima de la panza: de lado, por arriba y por delante o por detrás. */
export function ruedaDentro(F: FormaBala, x0: number, r: number, w: number, sube = 0): number {
  // `sube`: the wheel lifted that much into the body (the Triciclo's rear suspension compressed)
  const cy = r - APLASTADO_BALA + sube; let h = 9;
  for (let k = 0; k < 72; k++) {
    const a = 2 * Math.PI * k / 72, x = x0 + r * Math.cos(a), y = cy + r * Math.sin(a);
    const s = F.seccionRapida(x); let yb = Infinity; for (let j = 0; j < s.length; j += 2) yb = Math.min(yb, s[j + 1]);
    if (!(y > yb + 0.02)) continue;   // below the belly: that part of the tyre is meant to show
    if (!F.dentroPiel(x, y, w / 2)) return -0.01;
    const lado = F.ladoZ(x, y) - w / 2, arriba = F.arribaY(x, w / 2) - y;
    // along x, from the tyre outwards (ahead of the wheel's centre forwards, behind it backwards)
    const largo = x > x0 ? F.bordeX(w / 2, y, x, F.X_MORRO) - x : x - F.bordeX(w / 2, y, x, F.X_COLA);
    h = Math.min(h, lado, arriba, Number.isFinite(largo) ? largo : 9);
  }
  return h;
}

/** Holgura (m) del neumático lateral a la cara de dentro del carenado (de lado y por arriba). */
export function neumaticoCarenado(F: FormaBala): number {
  const POD = podDe(F), ancho = semiAncho(POD), r = F.R_LAT, w = F.ANCHO_NEU_LAT, cy = r - APLASTADO_BALA, ESP = 0.003;
  let h = 9;
  for (let k = 0; k < 96; k++) {
    const a = 2 * Math.PI * k / 96, x = r * Math.cos(a), y = cy + r * Math.sin(a), alt = alturasPod(POD, x);
    // the lower third is where the tyre leaves the pod through its open bottom (it shows below on purpose): sides and top only
    if (!alt || y < alt[0] + 0.3 * (alt[1] - alt[0])) continue;
    h = Math.min(h, ancho(x, y) - ESP - w / 2, alt[1] - ESP - y);
  }
  return h;
}

/** El hueco (m) entre la cara de dentro de cada carenado lateral (y sus brazos no cuentan) y la carrocería. */
export function carenadoCuerpo(F: FormaBala): number {
  const POD = podDe(F), ancho = semiAncho(POD); let h = 9;
  for (let i = 0; i <= 24; i++) {
    const xr = POD[0].x + (POD[POD.length - 1].x - POD[0].x) * i / 24, alt = alturasPod(POD, xr); if (!alt) continue;
    for (let j = 1; j < 10; j++) {
      const y = alt[0] + (alt[1] - alt[0]) * j / 10, w = ancho(xr, y); if (w <= 0) continue;
      const zb = F.ladoZ(F.X_LAT + xr, y); if (!Number.isFinite(zb)) continue;
      h = Math.min(h, F.VIA_LAT / 2 - w - zb);
    }
  }
  return h;
}

export function calcularBala(m: ModeloBala, ar: { carroceria: number; cristal: number; solar: number }): Resultados {
  const P = m.P, F = m.F, esp = (P.espCristal ?? 3) / 1000;
  const area = areaFrontalBala(m);
  let vol = 0; for (let x = F.X_MORRO - 0.025; x > F.X_COLA; x -= 0.05) vol += F.areaSeccion(x, 80).area * 0.05;
  const cabezas = ([true, false] as const).map(piloto => {
    const a = cabeza(m, piloto, TALLA_SENTADO.p50, esp), b = cabeza(m, piloto, TALLA_SENTADO.p95, esp);
    return { quien: piloto ? 'piloto' as const : 'pasajero' as const, p50: a.holgura, p95: b.holgura, x: a.x };
  });
  const ch: Comprobacion[] = [];
  for (const c of cabezas) {
    const quien = c.quien === 'piloto' ? 'del piloto' : 'del pasajero';
    ch.push({ nombre: `Cabeza ${quien} a la cúpula (talla media, sin casco)`, holgura: c.p50, minimo: 0.03 });
    ch.push({ nombre: `Cabeza ${quien} a la cúpula (talla alta, sin casco)`, holgura: c.p95, minimo: 0.03 });
  }
  ch.push({ nombre: 'Rueda delantera dentro de la carrocería', holgura: ruedaDentro(F, 0, m.rF, F.ANCHO_NEU), minimo: 0.02 });
  ch.push({ nombre: 'Rueda trasera dentro de la carrocería', holgura: ruedaDentro(F, m.xR, m.rR, F.ANCHO_NEU), minimo: 0.02 });
  ch.push({ nombre: 'Neumático lateral dentro de su carenado', holgura: neumaticoCarenado(F), minimo: 0.015 });
  ch.push({ nombre: 'Carenado lateral a la carrocería', holgura: carenadoCuerpo(F), minimo: HUECO_CARENADO - 0.002 });
  const [xb, yb, zb] = extremoManillar(F);
  ch.push({ nombre: 'Manillar dentro de la carrocería', holgura: F.ladoZ(xb, yb) - zb, minimo: 0.01 });
  const nada = NaN;
  const bala: ResultadosBala = {
    area, vol, piel: ar.carroceria + ar.cristal, cristal: ar.cristal, cupula: [-m.cup.XC0, -m.cup.XC1],
    viaSubida: F.VIA_LAT > m.viaPedida + 1e-9 ? F.VIA_LAT : null, cabezas,
  };
  // Lo que no se puede calcular con honradez va como NaN, y la página no lo enseña para el Bala (ver `ResultadosBala`).
  return {
    A: area.total, FR: nada, Cd: nada, CdA: nada, Crr: nada, vol, Paero: nada, Proll: nada, Pw: nada, WhKm: nada, pedWhKm: 0, autonomia: nada, vmax: nada,
    masas: {}, mVeh: nada, mTot: nada, rangoMasa: [nada, nada], Mmax: nada, tension: nada, seguridad: nada, cargaRueda: nada,
    solarPico: 0, solarDia: 0, kmSol: 0, areas: ar, comprobaciones: ch, bala,
  };
}

/** Superficies de piel (m²): la carrocería y el cristal de la cúpula; el Bala no lleva paneles solares. */
export function areasBala(m: Pick<ModeloBala, 'F' | 'cup'>) {
  const s = pielBala(m.F, m.cup);
  return { carroceria: s.piel - s.cristal, cristal: s.cristal, solar: 0 };
}

/** ¿Es este modelo un Bala? (para las ramas de cada pantalla). */
export const esBala = (m: Modelo): m is ModeloBala => m.tipo === 'bala';
/** Los parámetros del Bala por defecto (los del garaje). */
export const parametrosBalaPorDefecto = () => PARAMETROS_BALA;
