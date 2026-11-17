import type { Modelo, Parametros, Resultados } from '../geometria';
import { DESLIZADORES_BALA, camposBala, rangoBala } from '../geometriaBala';
import { camposTriciclo, cuerpoDe, deslizadoresTriciclo, esCuatro, esRombo, vistaTriciclo, type ModeloTriciclo } from '../geometriaTriciclo';
import { ANGULO_MAX, CAVIDAD, SUCCION_CULOTE, estimacionKamm } from '../garaje/kamm';
import { camposBasculante, deslizadoresBasculante } from '../geometriaBasculante';
import { A1 as FICHAS_A1, GOTA as FICHAS_GOTA } from '../tunel/explicaciones';
import { CONSTANTES, EXPOSICION } from '../tunel/arrastre';
import type { PorVelocidad, ResultadoTunel } from '../tunel/calculo';

/**
 * «Hacer estudio aerodinámico» (2026-11-17, Eugenio: «mete la parte de aerodinámica dentro de carrocería añadiendo los
 * puntos débiles de esa configuración concreta y de todas las demás para intentar recibir consejos que mejoren, quizás
 * con un botón que diga "hacer estudio aerodinámico" y te saque pegas al diseño actual y te haga recomendaciones»).
 *
 * A catalogue of RULES, one per known weak point. Each rule looks at the current design (its parameters, the model, the
 * checks and what the tunnel already computed for it) and, if the weak point is there, returns a finding («pega»):
 * how serious, why it hurts, what to change and by how much.
 *
 * Honesty: a finding carries either
 *  · `pruebas`: concrete slider changes the TUNNEL can see (the body's silhouette, its section, its wheels). The study
 *    (estudio.ts) reruns the tunnel on a copy of the design with each change and keeps the best: the gain shown is
 *    COMPUTED. If no change gains at least `RUIDO`, the finding is set aside as «probado y descartado»: the study never
 *    recommends moving a slider that is already at its best value for this tunnel;
 *  · or `estimacion`: a part the tunnel does not see (mirrors, the pods themselves, a spat), with an order of magnitude
 *    taken from the literature or from the tunnel's own wheel formula, and labelled «estimado».
 * Pure (no React, no three.js): `scripts/estudio-aerodinamico.ts` runs the same catalogue in Node.
 *
 * Sources for the general knowledge (memory/03_DECISIONS.md, 2026-11-17): W.-H. Hucho, «Aerodynamics of Road Vehicles»
 * (4th ed., 1998); S. F. Hoerner, «Fluid-Dynamic Drag» (1965); Ahmed, Ramm & Faltin, SAE 840300 (1984); Kamm and
 * Koenig-Fachsenfeld via https://en.wikipedia.org/wiki/Kammback (cut where the section is 50 % of the largest);
 * SAE 2020-01-0673 «Streamlined Tails – The Effects of Truncation on Aerodynamic Drag» (on car-like shapes the drag
 * saved by a longer tail is roughly linear with the section it closes); mirrors 2–7 % of a car's drag and the Honda e's
 * cameras −3.8 % (https://en.wikipedia.org/wiki/Automotive_aerodynamics); wheels ≈ 25 % of a car's drag (Wickern,
 * Zwicker & Pfadenhauer, SAE 970133, 1997).
 *
 * TO ADD A RULE: see src/components/aeromovil/CLAUDE.md, «A new rule of the aerodynamic study».
 */

export type TipoVehiculo = 'gota' | 'a1' | 'bala' | 'triciclo' | 'basculante';
export const tipoDe = (P: Pick<Parametros, 'disposicion'>): TipoVehiculo =>
  P.disposicion === 'cuatro' ? 'a1' : P.disposicion === 'bala' ? 'bala' : P.disposicion === 'triciclo' ? 'triciclo' : P.disposicion === 'basculante' ? 'basculante' : 'gota';

export type Gravedad = 'alta' | 'media' | 'baja';
export type Zona = 'cola' | 'morro' | 'cupula' | 'tamano' | 'bajos' | 'ruedas' | 'detalles';
export const NOMBRE_ZONA: Record<Zona, string> = { cola: 'Cola', morro: 'Morro', cupula: 'Cúpula y techo', tamano: 'Tamaño', bajos: 'Bajos y altura al suelo', ruedas: 'Ruedas y carenados', detalles: 'Detalles' };

/** A change to try on a copy of the design. `tunel: false` = the tunnel cannot see it (only the checks are rerun). */
export interface Prueba { cambios: Partial<Parametros>; texto: string; tunel?: boolean }
/** A gain the tunnel cannot compute: ΔCdA in m² (negative = saved) and where the figure comes from. */
export interface Estimacion { dCdA: number; fuente: string }
export interface Hallazgo {
  id: string; zona: Zona; claves: (keyof Parametros)[];
  titulo: string;
  /** The severity before computing (the study replaces it with the computed gain when there is one). */
  gravedad: Gravedad;
  porQue: string;
  recomendacion: string;
  pruebas?: Prueba[];
  estimacion?: Estimacion;
  /** A big change of layout (wheels, body type): computed, but it changes much more than the air. */
  deFondo?: boolean;
}

/** What the tunnel gave for the design as it is now: Cd at the study's speed, its reference area, CdA, the breakdown. */
export interface Base { cd: number; A: number; cdA: number; R: ResultadoTunel; q: PorVelocidad }

export interface Contexto {
  P: Parametros; tipo: TipoVehiculo; modelo: Modelo; res: Resultados; base: Base; kmh: number;
  /** A slider of this vehicle, as the page shows it. */
  ficha: (k: keyof Parametros) => Ficha | undefined;
}

/** A slider: its label on screen, where it is, its range in stored values; `ver` is what the screen adds to the stored value. */
export interface Ficha { n: string; donde: string; min: number; max: number; ver?: number; unidad?: string }

/** Under this gain (fraction of CdA) the tunnel cannot tell a change from its own noise (baja vs media resolution moved some by ±1 %). */
export const RUIDO = 0.01;

// ─────────────────────────────────────────────────────────────── sliders per vehicle
const DEP_TRI: Record<string, string> = { carroceria: 'Carrocería', interior: 'Interior', chasis: 'Chasis', rodaje: 'Rodaje', propulsion: 'Motor', energia: 'Energía' };
export function fichasDe(P: Parametros): Partial<Record<keyof Parametros, Ficha>> {
  const tipo = tipoDe(P), o: Partial<Record<keyof Parametros, Ficha>> = {};
  if (tipo === 'triciclo') {
    const T = camposTriciclo(P);
    for (const f of deslizadoresTriciclo()) { const v = vistaTriciclo(f, T), d = v.valor - T[f.clave]; o[f.clave] = { n: f.n, donde: `${DEP_TRI[f.dep]} › ${f.bloque}`, min: v.min - d, max: v.max - d, ver: d, unidad: f.unidad }; }
  } else if (tipo === 'bala') {
    const B = camposBala(P);
    for (const f of DESLIZADORES_BALA) { const [min, max] = rangoBala(f.clave, B); o[f.clave] = { n: f.n, donde: f.bloque, min, max, unidad: 'm' }; }
  } else if (tipo === 'basculante') {
    for (const f of deslizadoresBasculante()) o[f.clave as keyof Parametros] = { n: f.n, donde: `${DEP_TRI[f.dep]} › ${f.bloque}`, min: f.min, max: f.max, unidad: f.unidad };
  } else {
    const t = tipo === 'a1' ? FICHAS_A1 : FICHAS_GOTA;
    for (const [k, f] of Object.entries(t)) if (f) o[k as keyof Parametros] = { ...f, unidad: k === 'clear' ? 'cm' : undefined };
    if (tipo === 'a1') { o.H = { n: 'Alto total (techo de la cúpula)', donde: 'Carrocería › Carrocería y cúpula', min: 1.0, max: 1.7, unidad: 'm' }; }
  }
  return o;
}

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
/** A slider value as the page writes it (lengths stored in metres and shown in cm, for instance). */
export function fmtValor(v: number, unidad?: string): string {
  switch (unidad) {
    case 'm': return `${fmt(v)} m`;
    case 'cm': return `${fmt(v * 100, 1)} cm`;
    case 'mm': return `${fmt(v, 1)} mm`;
    case '°': return `${Math.round(v)}°`;
    default: return fmt(v, Math.abs(v) < 10 ? 2 : 0);
  }
}

/** A slider moved by `delta` (stored units), inside its range; null when it is already at that end. */
export function mover(cx: Contexto, k: keyof Parametros, delta: number, texto?: string): Prueba | null {
  const f = cx.ficha(k); if (!f) return null;
  const actual = Number(cx.P[k]); if (!Number.isFinite(actual)) return null;
  const nuevo = Math.round(Math.min(f.max, Math.max(f.min, actual + delta)) * 10000) / 10000;
  if (Math.abs(nuevo - actual) < 1e-6) return null;
  const ver = f.ver ?? 0;
  return { cambios: { [k]: nuevo } as Partial<Parametros>, texto: texto ?? `«${f.n}» de ${fmtValor(actual + ver, f.unidad)} a ${fmtValor(nuevo + ver, f.unidad)}` };
}
/** A slider set to a value (stored units), inside its range. */
export const poner = (cx: Contexto, k: keyof Parametros, valor: number, texto?: string) => mover(cx, k, valor - Number(cx.P[k]), texto);
/** Both ways: the study keeps whichever the tunnel finds better (or neither). */
export const ambos = (cx: Contexto, k: keyof Parametros, paso: number) => [mover(cx, k, paso), mover(cx, k, -paso)].filter((p): p is Prueba => !!p);
const lista = (...p: (Prueba | null)[]) => p.filter((x): x is Prueba => !!x);
const valor = (cx: Contexto, k: keyof Parametros) => Number(cx.P[k]);
const etiqueta = (cx: Contexto, k: keyof Parametros) => cx.ficha(k)?.n ?? String(k);
const donde = (cx: Contexto, k: keyof Parametros) => { const f = cx.ficha(k); return f ? `«${f.n}» (${f.donde})` : String(k); };

/** The body's slenderness: length over the diameter of a circle with the largest section's area. */
export const esbeltez = (b: Base) => b.R.geometria.largo / Math.sqrt(4 * b.R.geometria.areaMax / Math.PI);
/** Where the flow leaves the body on the roof, the side and the bottom, as a fraction of the length from the nose (1 = the tail's end). */
export function despegue(b: Base) {
  const G = b.R.geometria, f = (x: number) => Math.min(1, Math.max(0, (G.xMorro - x) / G.largo));
  return { techo: f(b.q.sepTecho), lado: f(b.q.sepLado), bajos: f(b.q.sepBajos) };
}
const pct = (v: number) => `${fmt(v * 100, 0)} %`;

export interface Regla {
  id: string; zona: Zona; vehiculos: TipoVehiculo[];
  /** The sliders or options it may change. Two rules never share one (the study script checks it): no two pieces of advice can pull a slider in opposite directions. */
  claves: (keyof Parametros)[];
  evaluar: (cx: Contexto) => Omit<Hallazgo, 'id' | 'zona' | 'claves'> | null;
}

// ─────────────────────────────────────────────────────────────── the catalogue
const COLA: Partial<Record<TipoVehiculo, keyof Parametros>> = { triciclo: 'tCola', bala: 'bCola', basculante: 'qCola', gota: 'tail' };
const PUNTA_COLA: Partial<Record<TipoVehiculo, keyof Parametros>> = { triciclo: 'tPuntaCola', bala: 'bPuntaCola', basculante: 'qColaAlto', gota: 'tipH' };
const ALTO: Partial<Record<TipoVehiculo, keyof Parametros>> = { triciclo: 'tAlto', bala: 'bAlto', basculante: 'qAlto', a1: 'H' };
const ANCHO: Partial<Record<TipoVehiculo, keyof Parametros>> = { triciclo: 'tAncho', bala: 'bAncho', basculante: 'qAncho' };
const SUELO: Record<TipoVehiculo, keyof Parametros> = { triciclo: 'tSuelo', bala: 'bSuelo', basculante: 'qSuelo', a1: 'clear', gota: 'clear' };
const MORRO: Partial<Record<TipoVehiculo, keyof Parametros>> = { triciclo: 'tMorro', bala: 'bMorro', basculante: 'qMorro', gota: 'overF', a1: 'fMorro' };
const T_DE = (cx: Contexto) => camposTriciclo(cx.P);
const de = <K extends keyof Parametros>(m: Partial<Record<TipoVehiculo, K>>, cx: Contexto) => m[cx.tipo];

export const REGLAS: Regla[] = [
  // ── COLA ────────────────────────────────────────────────────────────────
  {
    id: 'cola-corta', zona: 'cola', vehiculos: ['triciclo', 'bala', 'basculante', 'gota'], claves: ['tCola', 'bCola', 'qCola', 'tail'],
    evaluar: cx => {
      const k = de(COLA, cx)!, e = esbeltez(cx.base), estela = cx.base.q.cd.estela / cx.base.q.cd.total;
      if (e >= 4.2 && estela < 0.12) return null;
      const pruebas = lista(mover(cx, k, 0.15), mover(cx, k, 0.35));
      if (!pruebas.length) return null;
      return {
        titulo: 'La cola es corta para lo ancho y alto que es el coche', gravedad: estela > 0.15 ? 'alta' : 'media',
        porQue: `Mide ${fmt(e, 1)} veces su «diámetro» (el de un círculo con su sección mayor) y la estela es el ${pct(estela)} del Cd: cuanto más deprisa se cierra la cola, antes se despega el aire y más grande es el hueco que arrastra detrás (Hoerner: la menor resistencia por área frontal está con el largo entre 3 y 4,5 veces el diámetro).`,
        recomendacion: `Alarga ${donde(cx, k)}. Cada centímetro más de cola también suma rozamiento: el túnel dice si compensa en este diseño.`,
        pruebas,
      };
    },
  },
  {
    id: 'cola-despegue', zona: 'cola', vehiculos: ['triciclo', 'bala', 'basculante', 'gota'], claves: ['tPuntaCola', 'bPuntaCola', 'qColaAlto', 'tipH'],
    evaluar: cx => {
      const k = de(PUNTA_COLA, cx)!, d = despegue(cx.base), dif = d.techo - d.bajos;
      if (Math.abs(dif) < 0.015 && Math.min(d.techo, d.bajos) > 0.95) return null;
      // the roof lets go first: the tail tip is too low for the roof (a steep slope); the bottom first: too high
      const arriba = dif < 0, paso = cx.tipo === 'gota' ? 0.05 : 0.04;
      const pruebas = lista(mover(cx, k, arriba ? paso : -paso), mover(cx, k, arriba ? 2 * paso : -2 * paso));
      if (!pruebas.length) return null;
      return {
        titulo: arriba ? 'El aire se despega del techo antes de llegar a la punta de la cola' : 'El aire se despega de los bajos antes de llegar a la punta de la cola',
        gravedad: Math.min(d.techo, d.bajos) < 0.9 ? 'alta' : 'media',
        porQue: `Por arriba se despega al ${pct(d.techo)} del largo y por abajo al ${pct(d.bajos)}. ${arriba ? 'La bajada del techo hacia la punta es demasiado empinada' : 'Los bajos suben demasiado deprisa hacia la punta'}: por encima de unos 12–15° de inclinación el aire ya no la sigue (Hucho; en el cuerpo de Ahmed la peor es a 30°) y el despegue agranda la estela.`,
        recomendacion: `${arriba ? 'Sube' : 'Baja'} ${donde(cx, k)} para repartir la bajada entre el techo y los bajos.`,
        pruebas,
      };
    },
  },
  {
    id: 'cola-plana-ancha', zona: 'cola', vehiculos: ['triciclo'], claves: ['tColaPlana'],
    evaluar: cx => {
      const T = T_DE(cx); if (T.tCubierta === 'lisa' || T.tColaPlana < 0.3) return null;
      const pruebas = lista(mover(cx, 'tColaPlana', -0.5), poner(cx, 'tColaPlana', 0));
      return {
        titulo: 'Cola plana y ancha sobre una carrocería redonda', gravedad: 'media',
        porQue: 'Una cola plana y ancha (como el Aptera) solo funciona si se va estrechando también vista desde arriba y acaba en un borde vivo; sobre un cuerpo redondo deja un borde de salida ancho, y la estela es tan ancha como ese borde.',
        recomendacion: `Acerca ${donde(cx, 'tColaPlana')} a «en punta», o pasa a «Cubierta lisa» si quieres la cola del Aptera con su borde.`,
        pruebas,
      };
    },
  },
  {
    id: 'cola-mas-ancha-que-cabina', zona: 'cola', vehiculos: ['triciclo'], claves: ['tColaPlanaAncho'],
    evaluar: cx => {
      const T = T_DE(cx); if (T.tCubierta === 'lisa' || T.tColaPlana <= 0 || T.tColaPlanaAncho <= 1.02) return null;
      return {
        titulo: 'La cola es más ancha que la cabina', gravedad: 'alta',
        porQue: 'Vista desde arriba, la cola se abre en vez de cerrarse: el aire de los costados tiene que ir hacia fuera y luego volver, justo donde ya va frenándose. Es la forma que más favorece que se despegue, y además suma área frontal.',
        recomendacion: `Baja ${donde(cx, 'tColaPlanaAncho')} a 1 (todo el ancho de la cabina) o menos.`,
        pruebas: lista(poner(cx, 'tColaPlanaAncho', 1), poner(cx, 'tColaPlanaAncho', 0.7)),
      };
    },
  },
  {
    id: 'cola-borde-grueso', zona: 'cola', vehiculos: ['triciclo', 'basculante'], claves: ['tColaGrosor', 'qColaGrosor'],
    evaluar: cx => {
      const k: keyof Parametros = cx.tipo === 'triciclo' ? 'tColaGrosor' : 'qColaGrosor';
      if (cx.tipo === 'triciclo' && T_DE(cx).tCubierta !== 'lisa') return null;
      const v = valor(cx, k); if (v <= 0.06) return null;
      return {
        titulo: 'El borde de atrás de la cola es grueso', gravedad: v > 0.12 ? 'alta' : 'media',
        porQue: `Tiene ${fmt(v * 100, 0)} cm de grueso: esa cara de atrás es «base», una superficie donde el aire ya no empuja y que tira del coche hacia atrás. Una cola cortada (Kamm) solo sale a cuenta si se corta donde la sección ya es la mitad de la mayor y con el borde vivo.`,
        recomendacion: `Afina ${donde(cx, k)}.`,
        pruebas: lista(poner(cx, k, 0.04), poner(cx, k, 0.06)),
      };
    },
  },
  {
    id: 'cola-borde-ancho', zona: 'cola', vehiculos: ['basculante'], claves: ['qColaAncho'],
    evaluar: cx => {
      const v = valor(cx, 'qColaAncho'); if (v <= 0.65) return null;
      return {
        titulo: 'La cola apenas se estrecha vista desde arriba', gravedad: 'media',
        porQue: `El borde de la cola mide el ${pct(v)} del ancho del coche: la cola se cierra solo por arriba y por abajo, y los costados dejan una estela ancha.`,
        recomendacion: `Estrecha ${donde(cx, 'qColaAncho')}.`,
        pruebas: lista(mover(cx, 'qColaAncho', -0.15), mover(cx, 'qColaAncho', -0.3)),
      };
    },
  },
  {
    id: 'transicion-corta', zona: 'cola', vehiculos: ['triciclo'], claves: ['tColaTrans'],
    evaluar: cx => {
      const v = valor(cx, 'tColaTrans'); if (v >= 0.3) return null;
      return {
        titulo: 'El paso de la cabina a la cola es brusco', gravedad: 'media',
        porQue: `La transición mide ${fmt(v * 100, 0)} cm: un cambio de curva tan corto acelera el aire en el «hombro» de la cabina y lo frena de golpe justo detrás, que es donde nace un despegue.`,
        recomendacion: `Alarga ${donde(cx, 'tColaTrans')}.`,
        pruebas: lista(mover(cx, 'tColaTrans', 0.2), mover(cx, 'tColaTrans', 0.4)),
      };
    },
  },
  {
    id: 'bajos-cola', zona: 'bajos', vehiculos: ['triciclo', 'basculante'], claves: ['tBajosCurva', 'qBajosCola'],
    evaluar: cx => {
      if (cx.tipo === 'triciclo') {
        const T = T_DE(cx); if (T.tCubierta !== 'lisa' || T.tBajosCurva >= 0.3) return null;
        return {
          titulo: 'Los bajos suben tarde y de golpe hacia la cola', gravedad: 'media',
          porQue: 'Una subida suave de los bajos al final (un difusor de 5–10°) recupera presión bajo la cola; una subida corta y brusca la despega (Hucho).',
          recomendacion: `Sube ${donde(cx, 'tBajosCurva')} hacia «una curva larga».`,
          pruebas: lista(mover(cx, 'tBajosCurva', 0.4), mover(cx, 'tBajosCurva', 0.7)),
        };
      }
      const v = valor(cx, 'qBajosCola'); if (v >= 0.05) return null;
      return {
        titulo: 'Los bajos empiezan a subir detrás del eje trasero', gravedad: 'baja',
        porQue: 'Con tan poco recorrido la subida de los bajos es corta y empinada: el aire de debajo no la sigue (Hucho: el difusor funciona con 5–10° y un recorrido largo).',
        recomendacion: `Adelanta ${donde(cx, 'qBajosCola')}.`,
        pruebas: lista(mover(cx, 'qBajosCola', 0.2), mover(cx, 'qBajosCola', 0.4)),
      };
    },
  },
  // ── Kamm / «cola cortada» (bot colacorte, 2026-11-17; garaje/balaForma.ts `corte`, garaje/kamm.ts). Two rules, so that
  // no slider is in two: where and whether to cut (`tColaCorte`, `tKammSeccion`, computed by the tunnel, which sees the cut
  // through the silhouette), and the base's cavity (`tKammCavidad`, which the tunnel cannot see: «estimado», Evrard et al.).
  // The long-tail ↔ cut comparison lives here and not in «cola-corta»: it moves `tColaCorte`, which is this rule's.
  // The cut edge is always drawn sharp (no slider rounds it), so «a rounded edge loses the effect» is said in the advice,
  // for whoever builds it, not tested.
  {
    id: 'cola-kamm', zona: 'cola', vehiculos: ['triciclo'], claves: ['tColaCorte', 'tKammSeccion'],
    evaluar: cx => {
      const T = T_DE(cx), F = (cx.modelo as ModeloTriciclo).F, k = F.kamm;
      const borde = 'Al construirlo, el borde del corte tiene que quedar vivo: un borde redondeado deja que el aire gire hacia dentro y la succión del culote vuelve (Hucho).';
      if (T.tColaCorte !== 'kamm' || !k) {
        // a long tail: what cutting it would save in length, and what the tunnel says it costs
        if (T.tCola < 1.0) return null;
        let ahorro = 0; try { ahorro = cuerpoDe({ ...T, tColaCorte: 'kamm', tKammSeccion: 0.3 }).kamm?.ahorro ?? 0; } catch { ahorro = 0; }
        if (ahorro < 0.15) return null;
        return {
          titulo: 'La cola larga podría ser una cola cortada (Kamm), más corta', gravedad: 'baja',
          porQue: `Con ${fmt(T.tCola, 2)} m de cola, cortarla en recto donde le queda el 30 % de la sección mayor la acorta ${fmt(ahorro * 100, 0)} cm. No es gratis: lo que una cola larga ahorra es casi proporcional a la sección que cierra (SAE 2020-01-0673), y el culote frena con una succión de ${fmt(SUCCION_CULOTE[0], 2)}–${fmt(SUCCION_CULOTE[1], 2)} sobre su área. El túnel dice cuánto cuesta en este diseño.`,
          recomendacion: `Si el largo importa más que el último poco de Cd, elige «Cortada en recto (cola Kamm)» en «Formato de la cola» (Carrocería › Cola). ${borde}`,
          pruebas: [0.3, 0.4].map(f => ({ cambios: { tColaCorte: 'kamm', tKammSeccion: f } as Partial<Parametros>, texto: `Cola cortada al ${Math.round(f * 100)} % de la sección mayor` })),
        };
      }
      const ang = Math.max(k.angTecho, k.angLado, k.angBajos), pronto = k.fraccion > 0.55;
      if (ang <= ANGULO_MAX && !pronto) return null;
      const largo: Prueba = { cambios: { tColaCorte: 'no' } as Partial<Parametros>, texto: `Volver a la cola larga (${fmt(k.ahorro * 100, 0)} cm más de coche)` };
      const pruebas = [...lista(mover(cx, 'tKammSeccion', -0.1), mover(cx, 'tKammSeccion', -0.2)), largo];
      return ang > ANGULO_MAX ? {
        titulo: 'La cola cortada se cierra demasiado antes del corte: el aire se suelta antes', gravedad: 'alta',
        porQue: `Justo antes del corte la cola se cierra ${Math.round(ang)}° (por arriba ${Math.round(k.angTecho)}°, por los lados ${Math.round(k.angLado)}°, por abajo ${Math.round(k.angBajos)}°): por encima de unos ${ANGULO_MAX}° el aire ya no sigue la piel (Hucho; en el cuerpo de Ahmed la peor es a 30°), se despega antes de llegar al borde y el culote efectivo es más grande que el corte. La regla del 50 % de Kamm supone una cola que se va cerrando suave hasta ahí.`,
        recomendacion: `Corta más atrás con ${donde(cx, 'tKammSeccion')}, donde la cola ya se cierra menos, o alarga la cola imaginaria («Cola: largo») o retrasa la caída del techo. ${borde}`,
        pruebas,
      } : {
        titulo: 'La cola se corta demasiado pronto: culote grande', gravedad: 'media',
        porQue: `El corte deja el ${Math.round(k.fraccion * 100)} % de la sección mayor (${fmt(k.area, 2)} m² de culote). Kamm cortaba al 50 %; cada m² de culote frena con una succión de ${fmt(SUCCION_CULOTE[0], 2)}–${fmt(SUCCION_CULOTE[1], 2)} (Evrard y otros; Hucho), y en coches reales lo que se ahorra alargando la cola es casi proporcional a la sección que se cierra (SAE 2020-01-0673).`,
        recomendacion: `Corta más atrás con ${donde(cx, 'tKammSeccion')}. ${borde}`,
        pruebas,
      };
    },
  },
  {
    id: 'kamm-culote', zona: 'cola', vehiculos: ['triciclo'], claves: ['tKammCavidad'],
    evaluar: cx => {
      const T = T_DE(cx), k = (cx.modelo as ModeloTriciclo).F.kamm;
      if (T.tColaCorte !== 'kamm' || !k) return null;
      const hondo = Math.round(CAVIDAD.profundidad * k.alto * 200) / 200;
      if (k.cavidad >= 0.9 * hondo) return null;
      const ahora = estimacionKamm(k, cx.base.A), con = estimacionKamm({ ...k, cavidad: Math.min(0.15, hondo) }, cx.base.A);
      const dCd = ((con.min + con.max) - (ahora.min + ahora.max)) / 2, p = poner(cx, 'tKammCavidad', Math.min(0.15, hondo));
      if (!p || !(dCd < 0)) return null;
      return {
        titulo: 'El culote de la cola cortada es plano: un hueco poco hondo frenaría menos', gravedad: 'baja',
        porQue: `En un cuerpo de ensayo, un hueco en la base del ${Math.round(CAVIDAD.profundidad * 100)} % de su alto bajó la succión de la base un ${Math.round(CAVIDAD.reduccion * 100)} % (Evrard, Cadot y otros); aquí el culote mide ${fmt(k.alto * 100, 0)} cm de alto. El túnel no ve el hueco (solo la silueta): la cifra es de la literatura.`,
        recomendacion: `Sube ${donde(cx, 'tKammCavidad')} a unos ${fmt(Math.min(0.15, hondo) * 100, 1)} cm, con el borde vivo.`,
        pruebas: [{ ...p, tunel: false }],
        estimacion: { dCdA: dCd * cx.base.A, fuente: 'estimado: Evrard, Cadot y otros, cuerpo con cavidad en la base (−18 % de succión de base); succión de culote 0,15–0,20 (Evrard; Hucho)' },
      };
    },
  },
  // ── CÚPULA Y TECHO ──────────────────────────────────────────────────────
  {
    id: 'techo-cae-pronto', zona: 'cupula', vehiculos: ['triciclo', 'basculante', 'a1'], claves: ['tCaida', 'qCaida', 'techo'],
    evaluar: cx => {
      const k: keyof Parametros = cx.tipo === 'triciclo' ? 'tCaida' : cx.tipo === 'basculante' ? 'qCaida' : 'techo';
      const v = valor(cx, k), umbral = cx.tipo === 'triciclo' ? -0.2 : cx.tipo === 'basculante' ? 1.4 : 1.3;
      if (v >= umbral) return null;
      const paso = cx.tipo === 'triciclo' ? 0.3 : cx.tipo === 'basculante' ? 0.2 : 0.3;
      return {
        titulo: 'El techo empieza a caer muy pronto', gravedad: 'media',
        porQue: 'Si el techo empieza a bajar enseguida, la bajada hasta la cola es más larga pero también arranca antes y con más curva; dejarlo alto un poco más y bajar al final (como el Aptera) suele despegar menos, a cambio de una bajada final más empinada. El túnel lo pesa en este diseño.',
        recomendacion: `Retrasa ${donde(cx, k)}.`,
        pruebas: lista(mover(cx, k, paso), mover(cx, k, 2 * paso)),
      };
    },
  },
  {
    id: 'parabrisas-derecho', zona: 'cupula', vehiculos: ['triciclo', 'basculante', 'a1'], claves: ['tSubida', 'qParabrisas', 'parabrisas'],
    evaluar: cx => {
      const k: keyof Parametros = cx.tipo === 'triciclo' ? 'tSubida' : cx.tipo === 'basculante' ? 'qParabrisas' : 'parabrisas';
      const v = valor(cx, k);
      const derecho = cx.tipo === 'triciclo' ? v > 0.3 : cx.tipo === 'basculante' ? v < 0.6 : v < 0.18;
      if (!derecho) return null;
      const tumbar = cx.tipo === 'triciclo' ? -0.3 : cx.tipo === 'basculante' ? 0.15 : 0.04;
      return {
        titulo: 'Parabrisas muy derecho', gravedad: 'baja',
        porQue: 'Un parabrisas empinado hace un segundo frente donde el aire choca y se acelera al pasar al techo; tumbarlo reparte ese giro (Hucho: de unos 50° a 60° desde la vertical el Cd baja algo). A cambio, más cristal, más sol dentro y más reflejos.',
        recomendacion: `Tumba el parabrisas con ${donde(cx, k)}.`,
        pruebas: lista(mover(cx, k, tumbar), mover(cx, k, 2 * tumbar)),
      };
    },
  },
  {
    id: 'seccion-cajon', zona: 'cupula', vehiculos: ['basculante', 'a1'], claves: ['qSeccion', 'nU'],
    evaluar: cx => {
      const k: keyof Parametros = cx.tipo === 'basculante' ? 'qSeccion' : 'nU';
      const v = valor(cx, k); if (v <= 3.0) return null;
      return {
        titulo: 'La sección de arriba es casi un cajón', gravedad: 'baja',
        porQue: 'Una sección cuadrada con esquinas poco redondeadas deja más superficie (más rozamiento) y esquinas donde el aire se acelera y se despega en la cola; a cambio, cabe más dentro con el mismo ancho.',
        recomendacion: `Redondea ${donde(cx, k)}.`,
        pruebas: lista(mover(cx, k, -0.3), mover(cx, k, -0.6)),
      };
    },
  },
  // ── TAMAÑO ──────────────────────────────────────────────────────────────
  {
    id: 'alto', zona: 'tamano', vehiculos: ['triciclo', 'bala', 'basculante', 'a1'], claves: ['tAlto', 'bAlto', 'qAlto', 'H'],
    evaluar: cx => {
      const k = de(ALTO, cx)!, v = valor(cx, k), umbral = cx.tipo === 'a1' ? 1.2 : cx.tipo === 'bala' ? 1.40 : 1.30;
      if (v <= umbral) return null;
      return {
        titulo: 'Es alto: mucha área frontal', gravedad: 'media',
        porQue: `Lo que gasta el aire es Cd × área frontal (CdA). Con ${fmtValor(v, 'm')} de alto el área frontal es ${fmt(cx.base.A)} m² (referencia del túnel): cada centímetro de menos baja el CdA aunque el Cd no cambie. Los velomóviles y el Aptera van muy por debajo de 1,3 m.`,
        recomendacion: `Baja ${donde(cx, k)} lo que dejen las cabezas: el estudio dice abajo qué comprobación deja de cumplir.`,
        pruebas: lista(mover(cx, k, -0.04), mover(cx, k, -0.08)),
      };
    },
  },
  {
    id: 'ancho', zona: 'tamano', vehiculos: ['triciclo', 'bala', 'basculante'], claves: ['tAncho', 'bAncho', 'qAncho'],
    evaluar: cx => {
      const k = de(ANCHO, cx)!, v = valor(cx, k), umbral = cx.tipo === 'bala' ? 0.88 : 0.92;
      if (v <= umbral) return null;
      return {
        titulo: 'Es ancho para un tándem', gravedad: 'baja',
        porQue: `Con ${fmtValor(v, 'm')} de ancho, el área frontal crece con cada centímetro; los ocupantes en tándem caben en unos 0,8–0,9 m.`,
        recomendacion: `Estrecha ${donde(cx, k)} lo que dejen los hombros y el bastidor.`,
        pruebas: lista(mover(cx, k, -0.04), mover(cx, k, -0.08)),
      };
    },
  },
  // ── BAJOS ───────────────────────────────────────────────────────────────
  {
    id: 'suelo', zona: 'bajos', vehiculos: ['triciclo', 'bala', 'basculante', 'a1', 'gota'], claves: ['tSuelo', 'bSuelo', 'qSuelo', 'clear'],
    evaluar: cx => {
      const k = SUELO[cx.tipo], v = valor(cx, k);
      const alto = cx.tipo === 'bala' ? 0.15 : 0.2, bajo = cx.tipo === 'bala' ? 0.10 : 0.09;
      if (v > alto) return {
        titulo: 'La carrocería va muy separada del suelo', gravedad: 'baja',
        porQue: `${fmtValor(v, 'cm')} libres: más carrocería y ruedas al aire por debajo y un hueco por donde el aire pasa revuelto. Un cuerpo de gota pierde poco cerca del suelo hasta que el hueco baja de un 10 % de su alto; por encima de eso, más altura no ayuda (Hucho).`,
        recomendacion: `Baja ${donde(cx, k)} lo que permitan el recorrido de la suspensión y los badenes.`,
        pruebas: lista(mover(cx, k, -0.03), mover(cx, k, -0.06)),
      };
      if (v < bajo) return {
        titulo: 'La carrocería va muy pegada al suelo', gravedad: 'baja',
        porQue: `${fmtValor(v, 'cm')} libres: el aire de debajo se acelera entre el suelo y los bajos y el rozamiento sube; muy cerca del suelo la resistencia de un cuerpo de gota crece deprisa (Hucho). Además roza en badenes y rampas.`,
        recomendacion: `Sube ${donde(cx, k)}.`,
        pruebas: lista(mover(cx, k, 0.02), mover(cx, k, 0.04)),
      };
      return null;
    },
  },
  // ── MORRO ───────────────────────────────────────────────────────────────
  {
    id: 'morro-aguja', zona: 'morro', vehiculos: ['triciclo', 'bala'], claves: ['tPuntaMorro', 'bPuntaMorro'],
    evaluar: cx => {
      const k: keyof Parametros = cx.tipo === 'triciclo' ? 'tPuntaMorro' : 'bPuntaMorro', v = valor(cx, k);
      if (v <= 0.95) return null;
      return {
        titulo: 'Morro en aguja', gravedad: 'baja',
        porQue: 'Por debajo de unos 150 km/h la punta del morro no gana nada por ser afilada: un morro en ojiva redondeada aparta el aire igual de bien y tiene menos superficie que rozar (Hucho, Hoerner). La aguja además es frágil y difícil de laminar.',
        recomendacion: `Redondea ${donde(cx, k)} hacia «ojiva».`,
        pruebas: lista(poner(cx, k, 0.8), poner(cx, k, 0.65)),
      };
    },
  },
  {
    id: 'morro-corto', zona: 'morro', vehiculos: ['triciclo', 'bala', 'basculante'], claves: ['tMorro', 'bMorro', 'qMorro'],
    evaluar: cx => {
      const k = de(MORRO, cx)!, v = valor(cx, k), umbral = cx.tipo === 'bala' ? 0.5 : 0.4;
      if (v >= umbral) return null;
      return {
        titulo: 'Morro corto y romo', gravedad: 'media',
        porQue: `${fmtValor(v, 'm')} de morro: el aire tiene que girar mucho en poca distancia, se acelera de más en los hombros del morro y luego se frena de golpe, que es donde nacen las burbujas de despegue delanteras.`,
        recomendacion: `Alarga ${donde(cx, k)}.`,
        pruebas: lista(mover(cx, k, 0.1), mover(cx, k, 0.2)),
      };
    },
  },
  {
    id: 'morro-plano-ancho', zona: 'morro', vehiculos: ['triciclo'], claves: ['tMorroLinea', 'tMorroAncho'],
    evaluar: cx => {
      const T = T_DE(cx), lisa = T.tCubierta === 'lisa', v = lisa ? T.tMorroAncho : T.tMorroLinea, k: keyof Parametros = lisa ? 'tMorroAncho' : 'tMorroLinea';
      if (v <= 0.5) return null;
      return {
        titulo: 'El frente del morro es una línea ancha', gravedad: 'baja',
        porQue: 'Un borde de ataque ancho (el del Aptera) reparte el aire a los lados con radios pequeños en las esquinas; funciona si esas esquinas son muy redondeadas. Un morro en ojiva lo hace con menos superficie.',
        recomendacion: `Acerca ${donde(cx, k)} a «en punta».`,
        pruebas: lista(mover(cx, k, -0.3), mover(cx, k, -0.6)),
      };
    },
  },
  {
    id: 'morro-romo-a1', zona: 'morro', vehiculos: ['a1', 'gota'], claves: ['morroA1', 'morro'],
    evaluar: cx => {
      const k: keyof Parametros = cx.tipo === 'a1' ? 'morroA1' : 'morro';
      const p = ambos(cx, k, 0.2); if (!p.length) return null;
      return {
        titulo: 'Forma del morro', gravedad: 'baja',
        porQue: 'Un morro demasiado romo hace un frente de alta presión grande; uno en cuña acelera el aire en sus aristas. El túnel prueba los dos sentidos en este diseño.',
        recomendacion: `Mueve ${donde(cx, k)} en el sentido que diga el túnel.`,
        pruebas: p,
      };
    },
  },
  // ── la cola de los otros dos (sin el largo de cola como deslizador propio)
  {
    id: 'cola-forma-a1-gota', zona: 'cola', vehiculos: ['a1', 'gota'], claves: ['colaA1', 'full', 'tailRound'],
    evaluar: cx => {
      if (cx.tipo === 'a1') {
        const p = ambos(cx, 'colaA1', 0.2); if (!p.length) return null;
        return {
          titulo: 'Forma de la cola', gravedad: 'media',
          porQue: 'Una cola llena guarda volumen detrás pero se cierra de golpe al final; una afilada se cierra antes y deja más estela por arriba si el techo cae deprisa. El túnel prueba los dos sentidos.',
          recomendacion: `Mueve ${donde(cx, 'colaA1')} en el sentido que diga el túnel.`, pruebas: p,
        };
      }
      const p = [...ambos(cx, 'full', 0.15), ...lista(mover(cx, 'tailRound', -0.25))]; if (!p.length) return null;
      return {
        titulo: 'Forma de la cola', gravedad: 'media',
        porQue: 'La plenitud de la cola decide lo deprisa que se cierra, y una punta redondeada deja un pequeño «culo» donde el aire no empuja. El túnel prueba las tres variantes.',
        recomendacion: `Ajusta ${donde(cx, 'full')} y ${donde(cx, 'tailRound')} como diga el túnel.`, pruebas: p,
      };
    },
  },
  // ── RUEDAS Y CARENADOS ──────────────────────────────────────────────────
  {
    id: 'cuatro-carenados', zona: 'ruedas', vehiculos: ['triciclo'], claves: ['tTraseras', 'tRuedas'],
    evaluar: cx => {
      const T = T_DE(cx); if (!esCuatro(T)) return null;
      const r = cx.base.q.cd.ruedas / cx.base.q.cd.total;
      return {
        titulo: 'Cuatro ruedas en carenados exteriores', gravedad: r > 0.3 ? 'alta' : 'media', deFondo: true,
        porQue: `En esta configuración las cuatro ruedas van fuera de la carrocería, cada una en su carenado y con su brazo: según el túnel las ruedas son el ${pct(r)} del Cd (en un coche normal, un 25 %: Wickern y otros, SAE 970133). Una rueda dentro de la cola deja solo su parte de abajo al aire.`,
        recomendacion: '«Ruedas traseras: una en la cola» o la disposición «en rombo» llevan una o dos ruedas dentro de la carrocería. Es un cambio de fondo: el vuelco, la dirección y la homologación cambian con él, y el estudio dice abajo qué comprobaciones dejan de cumplir.',
        pruebas: [
          { cambios: { tTraseras: 'una' } as Partial<Parametros>, texto: '«Ruedas traseras» (Rodaje › Ejes y ruedas): de «Dos en carenados» a «Una en la cola (triciclo)»' },
          { cambios: { tRuedas: 'rombo' } as Partial<Parametros>, texto: '«Disposición de las ruedas» (Rodaje › Ejes y ruedas): «En rombo: una en el morro, dos laterales en carenados, una en la cola»' },
        ],
      };
    },
  },
  {
    id: 'carenados-basculante', zona: 'ruedas', vehiculos: ['basculante'], claves: ['qRuedasDel', 'qCarroceria'],
    evaluar: cx => {
      const Q = camposBasculante(cx.P), r = cx.base.q.cd.ruedas / cx.base.q.cd.total;
      if (Q.qCarroceria === 'smera') return {
        titulo: 'Ruedas al aire (la carrocería del Smera)', gravedad: 'alta', deFondo: true,
        porQue: `La réplica del Lumeneo Smera lleva las cuatro ruedas fuera, bajo guardabarros: según el túnel las ruedas son el ${pct(r)} del Cd. Una rueda al aire arrastra como una placa de su tamaño (Fackrell y Harvey, 1975).`,
        recomendacion: '«Carrocería: Aerodinámica (gota, cola del Aptera)» tapa las traseras y lleva las delanteras dentro del morro o en carenados.',
        pruebas: [{ cambios: { qCarroceria: 'aero' } as Partial<Parametros>, texto: '«Carrocería» (Carrocería › Forma): de «Como el Lumeneo Smera» a «Aerodinámica»' }],
      };
      if (Q.qRuedasDel !== 'carenados') return null;
      return {
        titulo: 'Ruedas delanteras en carenados fuera del morro', gravedad: r > 0.25 ? 'media' : 'baja', deFondo: true,
        porQue: `Cada carenado es otro cuerpo con su propia estela, y el túnel ve sus ruedas mucho más expuestas que dentro del morro (las ruedas son el ${pct(r)} del Cd). A cambio, el morro puede ser más estrecho y las ruedas giran sin pasos de rueda.`,
        recomendacion: 'Prueba «Las ruedas delanteras van: Dentro del morro (una sola pieza)».',
        pruebas: [{ cambios: { qRuedasDel: 'morro' } as Partial<Parametros>, texto: '«Las ruedas delanteras van» (Carrocería › Ruedas delanteras): «Dentro del morro»' }],
      };
    },
  },
  {
    id: 'faldon-trasero', zona: 'ruedas', vehiculos: ['triciclo'], claves: ['tFaldon'],
    evaluar: cx => {
      const T = T_DE(cx); if (esCuatro(T) || esRombo(T) || T.tFaldon <= 0.1) return null;
      // the tunnel always sees the rear wheel as inside the tail ('dentro'); a spat that leaves more of it out moves it towards an open arch ('paso')
      const m = cx.modelo as { rR?: number; F?: { ANCHO_NEU?: number } }, d = 2 * (m.rR ?? 0.305), w = m.F?.ANCHO_NEU ?? 0.08;
      const dCdA = -CONSTANTES.K_RUEDA * d * w * (EXPOSICION.paso - EXPOSICION.dentro) * T.tFaldon;
      return {
        titulo: 'La rueda trasera asoma bajo la cola', gravedad: 'baja',
        porQue: 'Una rueda que gira al aire remueve mucho aire para lo pequeña que es. El túnel siempre la cuenta como si estuviera dentro de la cola, así que esta parte no sale en su Cd.',
        recomendacion: `Baja ${donde(cx, 'tFaldon')} a 0 (la rueda tapada por el faldón).`,
        pruebas: lista(poner(cx, 'tFaldon', 0)).map(p => ({ ...p, tunel: false })),
        estimacion: { dCdA, fuente: `con la fórmula de ruedas del propio túnel: ${fmt(CONSTANTES.K_RUEDA)} × diámetro × ancho × la parte que pasa al aire (de «dentro» a «paso de rueda», por lo que asoma)` },
      };
    },
  },
  {
    id: 'carenados-grandes', zona: 'ruedas', vehiculos: ['triciclo'], claves: ['tPodEsc', 'tPodAncho'],
    evaluar: cx => {
      const T = T_DE(cx); if (T.tPodEsc <= 1.02 && T.tPodAncho <= 1.04) return null;
      const n = esCuatro(T) ? 4 : 2, m = cx.modelo as { rF?: number; F?: { ANCHO_NEU_LAT?: number } }, d = 2 * (m.rF ?? 0.254), w = m.F?.ANCHO_NEU_LAT ?? 0.07;
      // a pod's frontal area ≈ (tyre + 8 cm) high × (tyre + 10 cm) wide; streamlined pod Cd ≈ 0.15 on it (Hoerner, short body of revolution)
      const a = (e: number, an: number) => (d + 0.08) * e * (w + 0.10) * an;
      const dCdA = -n * 0.15 * (a(T.tPodEsc, T.tPodAncho) - a(1, 1));
      return {
        titulo: 'Carenados de rueda más grandes que la rueda', gravedad: 'baja',
        porQue: `Tamaño ×${fmt(T.tPodEsc)} y anchura ×${fmt(T.tPodAncho)}: el área frontal de los ${n} carenados crece con el cuadrado. El túnel no ve los carenados como formas (solo sus ruedas), así que esta parte es una estimación.`,
        recomendacion: `Vuelve ${donde(cx, 'tPodEsc')} y ${donde(cx, 'tPodAncho')} a 1, si la rueda sigue cabiendo girada (lo dicen las comprobaciones de abajo).`,
        pruebas: [{ cambios: { tPodEsc: 1, tPodAncho: 1 } as Partial<Parametros>, texto: '«Carenado delantero: tamaño» y «anchura» a ×1,00', tunel: false }],
        estimacion: { dCdA, fuente: 'orden de magnitud, no calculado: área frontal de cada carenado (rueda + holgura) × Cd ≈ 0,15 de un carenado ahusado (Hoerner)' },
      };
    },
  },
  {
    id: 'carenado-cola-corta', zona: 'ruedas', vehiculos: ['triciclo', 'basculante'], claves: ['tPodCola', 'qPodCola'],
    evaluar: cx => {
      const tri = cx.tipo === 'triciclo', k: keyof Parametros = tri ? 'tPodCola' : 'qPodCola', v = valor(cx, k);
      if (!tri && camposBasculante(cx.P).qRuedasDel !== 'carenados') return null;
      if (tri ? v >= 0.95 : v >= 1.5) return null;
      const T = tri ? T_DE(cx) : null, n = T && esCuatro(T) ? 4 : 2, m = cx.modelo as { rF?: number; F?: { ANCHO_NEU_LAT?: number } }, d = 2 * (m.rF ?? 0.254), w = m.F?.ANCHO_NEU_LAT ?? 0.07;
      // a pod's Cd on its own frontal area: ≈ 0.10 with a tail of 2–3 diameters, ≈ 0.20 short and blunt (Hoerner, bodies of
      // revolution); taken as 0.1 per unit of tail missing (×0.75 → +0.025), on the pod's frontal area (tyre + clearance)
      const corto = tri ? 1 - v : (1.8 - v) / 1.8;
      const dCdA = -n * 0.1 * corto * (d + 0.08) * (w + 0.10);
      return {
        titulo: 'Los carenados de rueda acaban de golpe', gravedad: 'baja',
        porQue: 'Cada carenado es un pequeño cuerpo en el aire con su propia estela: con la cola corta se despega como una cola corta de coche. El túnel no ve los carenados como formas: es una estimación.',
        recomendacion: `Alarga ${donde(cx, k)}.`,
        pruebas: lista(mover(cx, k, tri ? 0.15 : 0.3)).map(p => ({ ...p, tunel: false })),
        estimacion: { dCdA, fuente: `orden de magnitud, no calculado: ${n} carenados × su área frontal × el Cd que pierde un carenado ahusado por cada parte de cola que le falta (≈ 0,1; Hoerner)` },
      };
    },
  },
  {
    id: 'carenados-no-vistos', zona: 'ruedas', vehiculos: ['bala'], claves: [],
    evaluar: cx => ({
      titulo: 'Los carenados laterales y sus brazos solo entran a medias en el Cd', gravedad: 'media',
      porQue: `En el rombo las dos ruedas laterales van en carenados sobre brazos, fuera del cuerpo. El túnel calcula la forma del cuerpo (Cd ${fmt(cx.base.cd, 3)}) y cuenta esas dos ruedas con una parte fija por rueda carenada, pero no la forma ni el tamaño de los carenados ni sus brazos: el Cd real puede ser algo más alto. Es lo mismo que le pasa al Aptera.`,
      recomendacion: 'Brazos con perfil de ala (no tubo redondo), carenados lo más ceñidos a la rueda y con la cola larga, y el hueco entre carenado y carrocería lo más grande posible para que sus estelas no se junten.',
      estimacion: { dCdA: 0.01, fuente: 'orden de magnitud, no calculado: lo que puede faltar en el Cd del túnel por la forma de los dos carenados y los brazos al aire (se suma, no se ahorra)' },
    }),
  },
  // ── DETALLES ────────────────────────────────────────────────────────────
  {
    id: 'retrovisores', zona: 'detalles', vehiculos: ['triciclo'], claves: ['tRetrovisores'],
    evaluar: cx => {
      if (T_DE(cx).tRetrovisores !== 'espejos') return null;
      return {
        titulo: 'Retrovisores de espejo', gravedad: 'media',
        porQue: 'Dos espejos son entre el 2 y el 7 % de la resistencia de un coche, y en uno tan fino como este pesan más. El túnel no los ve (van en la parte fija de «detalles»).',
        recomendacion: '«Retrovisores: Cámaras en cápsulas». El Honda e bajó un 3,8 % el Cd del coche entero al cambiar espejos por cámaras. Para matricular, las cámaras tienen que cumplir el reglamento UN R46.',
        pruebas: [{ cambios: { tRetrovisores: 'camaras' } as Partial<Parametros>, texto: '«Retrovisores» (Carrocería › Puertas y maletero): «Cámaras en cápsulas»', tunel: false }],
        estimacion: { dCdA: -0.03 * cx.base.cdA, fuente: 'estimado: un 3 % del CdA (los espejos son el 2–7 % de un coche; Honda e −3,8 %)' },
      };
    },
  },
];

/** Every finding for this design, in catalogue order. */
export function hallazgos(cx: Contexto): Hallazgo[] {
  const out: Hallazgo[] = [];
  for (const r of REGLAS) {
    if (!r.vehiculos.includes(cx.tipo)) continue;
    const h = r.evaluar(cx); if (!h) continue;
    out.push({ ...h, id: r.id, zona: r.zona, claves: r.claves });
  }
  return out;
}

export { etiqueta as etiquetaDeslizador };
