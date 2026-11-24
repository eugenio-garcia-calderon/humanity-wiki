// Runs the catalogue (normas.ts) on a design's numbers (ficha.ts): one result per requirement, the margins, and the
// category the design falls in by itself (2026-11-17). Pure: the panel and `scripts/homologacion.ts` share it.
import { CATEGORIAS, REQUISITOS, UNIDAD, categoria, type Estado, type IdCategoria, type Requisito } from './normas';
import { valorDe, type FichaHomologacion } from './ficha';

export interface Resultado {
  req: Requisito;
  estado: Estado;
  /** What the design has against the rule, in one line. */
  texto: string;
  /** Measured requirements: value, limit, margin (positive = room left), unit. */
  valor?: number; limite?: number; margen?: number; unidad?: string;
}

export interface Evaluacion {
  cat: IdCategoria;
  resultados: Resultado[];
  cuenta: Record<Estado, number>;
  /** Failures that decide the category (wheels, mass, seats, size, seat type) or a speed limit below the design's. */
  bloqueantes: Resultado[];
}

const num = (v: number, d: number) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

function evaluarRequisito(req: Requisito, f: FichaHomologacion, cat: IdCategoria): Resultado | null {
  if (req.aplica && !req.aplica(f)) return null;
  const md = req.medida;
  if (md) {
    const lim = md.limite[cat], u = UNIDAD[md.magnitud], v = valorDe(f, md.magnitud);
    if (lim == null) return { req, estado: 'cumple', texto: v == null ? `Sin límite en ${cat}.` : `Sin límite en ${cat} (tiene ${num(v, u.d)} ${u.u}).`, ...(v != null ? { valor: v, unidad: u.u } : {}) };
    if (v == null) return { req, estado: 'comprobar', texto: req.queHaceFalta ?? `El modelo no sabe su ${u.nombre}.`, limite: lim, unidad: u.u };
    const margen = md.sentido === 'max' ? lim - v : md.sentido === 'min' ? v - lim : -Math.abs(v - lim);
    const ok = md.sentido === 'igual' ? Math.abs(v - lim) < 1e-9 : margen >= -1e-9;
    const signo = md.sentido === 'max' ? 'como mucho' : md.sentido === 'min' ? 'al menos' : 'exactamente';
    let texto = `${num(v, u.d)} ${u.u}; ${cat} pide ${signo} ${num(lim, u.d)}`;
    if (md.sentido !== 'igual') texto += ok ? ` → te quedan ${num(margen, u.d)} ${u.u}` : ` → se pasa en ${num(-margen, u.d)} ${u.u}`;
    const estado: Estado = ok ? 'cumple' : md.limitable ? 'condicion' : 'no';
    if (!ok && md.limitable) texto += `; se arregla con ${md.limitable}`;
    return { req, estado, texto: texto + '.', valor: v, limite: lim, margen, unidad: u.u };
  }
  if (req.comprobar) {
    const r = req.comprobar(f, cat);
    if (r) return { req, ...r };
  }
  return { req, estado: 'comprobar', texto: req.queHaceFalta ?? 'El modelo no lo puede comprobar.' };
}

export function evaluarCategoria(f: FichaHomologacion, cat: IdCategoria): Evaluacion {
  const resultados = REQUISITOS.filter(r => r.categorias.includes(cat)).map(r => evaluarRequisito(r, f, cat)).filter((r): r is Resultado => !!r);
  const cuenta: Record<Estado, number> = { cumple: 0, no: 0, condicion: 0, comprobar: 0 };
  for (const r of resultados) cuenta[r.estado]++;
  const bloqueantes = resultados.filter(r => r.estado === 'no' && (r.req.medida?.decide || r.req.id === 'horcajadas' || r.req.id === 'cerrado' || r.req.id === 'velocidadDiseno' || r.req.id === 'epacPedales' || r.req.id === 'l1eaRuedas'));
  return { cat, resultados, cuenta, bloqueantes };
}

/** The categories a design with these wheels could be in, cheapest first (art. 4.4 of 168/2013 climbs them in this order). */
export function candidatas(f: FichaHomologacion): IdCategoria[] {
  return CATEGORIAS.filter(c => c.id === 'EPAC' ? f.pedaleo : c.id === 'L1e-A' ? f.pedaleo && f.ruedasLegales >= 2 && f.ruedasLegales <= 4 : c.id === 'M1' ? f.ruedasLegales >= 4 : c.ruedas === f.ruedasLegales).map(c => c.id);
}

/**
 * The category the design falls in by itself: the first candidate with nothing that decides the category failing
 * (wheels, mass, seats, size, seat type, closed cabin) and whose speed cap is not below the design's own speed. Power
 * and top speed over a limit do not rule a category out: a limiter fixes them (they show as «se arregla limitando»).
 * If none is clean, the one with fewest such failures (the cheapest on a tie).
 */
export function elegirCategoria(f: FichaHomologacion): { cat: IdCategoria; descartadas: Evaluacion[] } {
  const evs = candidatas(f).map(c => evaluarCategoria(f, c));
  if (!evs.length) return { cat: 'M1', descartadas: [] };
  const limpia = evs.find(e => e.bloqueantes.length === 0);
  const elegida = limpia ?? [...evs].sort((a, b) => a.bloqueantes.length - b.bloqueantes.length)[0];
  return { cat: elegida.cat, descartadas: evs.slice(0, evs.indexOf(elegida)) };
}

/** The headline margins of a category: mass, power and speed left before its limits (null: no limit or unknown). */
export function margenes(e: Evaluacion) {
  const de = (...ids: string[]) => e.resultados.find(r => ids.includes(r.req.id) && r.limite != null && r.margen != null) ?? null;
  return { masa: de('masa'), potencia: de('potencia', 'l1eaPotencia', 'epacPotencia'), vmax: de('vmax', 'l1eaVelocidad', 'epacVelocidad'), largo: de('largo'), ancho: de('ancho') };
}

/** One sentence: «te quedan 38 kg y 4 kW antes del límite de L5e-A». */
export function fraseMargen(e: Evaluacion): string {
  const m = margenes(e), partes: string[] = [], pasa: string[] = [];
  const pon = (r: Resultado | null, d: number) => { if (!r || r.margen == null) return; (r.margen >= 0 ? partes : pasa).push(`${num(Math.abs(r.margen), d)} ${r.unidad}`); };
  pon(m.masa, 0); pon(m.potencia, 1); pon(m.vmax, 0);
  const nombre = categoria(e.cat).id;
  const sinPot = !m.potencia && e.resultados.some(r => r.req.id === 'potencia') ? ' (sin límite de potencia)' : '';
  const a = partes.length ? `Te quedan ${partes.join(', ')} antes de los límites de ${nombre}${sinPot}.` : '';
  const b = pasa.length ? ` Te pasas en ${pasa.join(', ')}.` : '';
  return (a + b).trim() || `${nombre} no limita masa, potencia ni velocidad.`;
}

/** For a review of critical points: what this design fails in the category it falls in (fails, and fixable by limiting). */
export function fallosHomologacion(ficha: FichaHomologacion): { cat: IdCategoria; fallos: Resultado[] } {
  const { cat } = elegirCategoria(ficha), ev = evaluarCategoria(ficha, cat);
  return { cat, fallos: ev.resultados.filter(r => r.estado === 'no' || r.estado === 'condicion') };
}

/**
 * The same fails as checks for «Proyecto › Revisión de puntos críticos» (bot «masas», PanelProyecto.tsx): red for
 * «No cumple», amber for «se arregla limitando»; `dep: 'homologacion'` groups them under the «Homologación» tab.
 */
export function comprobacionesHomologacion(ficha: FichaHomologacion): { nombre: string; holgura: number; minimo: number; mostrar: string; dep: string }[] {
  const { cat, fallos } = fallosHomologacion(ficha);
  const n = (v: number, d: number) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  return fallos.map(r => ({
    nombre: `${cat}: ${r.req.titulo}`, holgura: r.estado === 'no' ? -1 : 0, minimo: 1, dep: 'homologacion',
    mostrar: r.margen != null && r.margen < 0 ? `se pasa ${n(-r.margen, r.unidad === 'kg' || r.unidad === 'km/h' ? 0 : r.unidad === 'kW' ? 1 : 2)} ${r.unidad}` : r.estado === 'condicion' ? 'limitar' : 'no cumple',
  }));
}
