// States and percentages of the pedal cycle's file (2026-11-24, Eugenio: «cómo está de avanzado o de retrasado en cuanto
// a porcentajes, del 0 al 100 % de completado en cada una de las cosas que tiene que hacer antes de poder vender la
// primera unidad»). Pure: the page and `scripts/expediente.ts` share it.
//
// The rules, in one place so the page can state them:
//  · a slot is worth 1 when done, 0,5 when in progress, 0 when pending; «no aplica» (with its reason) leaves the count;
//  · a slot tied to a test or a document takes that test's or document's state, it is never marked twice;
//  · an obligation is the mean of its slots, the group and the total weigh each obligation by its `peso` (3, 2 or 1);
//  · «lo imprescindible» is the same percentage over the obligations of weight 3 only.
import type { FichaHomologacion } from '../ficha';
import { GRUPOS_MATRIZ, OBLIGACIONES, type Hueco, type IdGrupoMatriz, type Obligacion } from './catalogo';
import { ENSAYOS } from './ensayos';
import { DOCUMENTOS, CARPETA_LEGAL, type ContextoDoc, type Documento } from './documentos';
import { CAMPOS_FABRICANTE, faltanFabricante, type DocGuardado, type EnsayoGuardado, type EstadoDoc, type EstadoEnsayo, type EstadoHueco, type Fabricante, type ObligacionGuardada, type Intento } from './tipos';

/** Everything stored, parsed. A missing key is `undefined`: nothing has been written there yet. */
export interface Estados {
  fab: Fabricante;
  obligaciones: Record<string, ObligacionGuardada | undefined>;
  ensayos: Record<string, EnsayoGuardado | undefined>;
  docs: Record<string, DocGuardado | undefined>;
}

export const valorEstado = (e: EstadoHueco | EstadoEnsayo | EstadoDoc): number => e === 'hecho' ? 1 : e === 'enCurso' || e === 'noConforme' ? 0.5 : 0;

/** The last attempt decides: signed and conforming is done, signed and not conforming is «no conforme», anything else is in progress. */
export function estadoEnsayo(g: EnsayoGuardado | undefined): EstadoEnsayo {
  const u = g?.intentos[g.intentos.length - 1];
  if (!u) return 'pendiente';
  if (u.firma && u.conclusion === 'conforme') return 'hecho';
  if (u.firma && u.conclusion === 'noConforme') return 'noConforme';
  return 'enCurso';
}
export function resumenEnsayo(g: EnsayoGuardado | undefined) {
  const u: Intento | undefined = g?.intentos[g.intentos.length - 1];
  return {
    estado: estadoEnsayo(g), intentos: g?.intentos.length ?? 0, fecha: u?.fecha,
    conclusion: u?.conclusion === 'conforme' ? 'conforme' : u?.conclusion === 'noConforme' ? 'no conforme' : undefined,
    valores: u?.valores ?? {},
  };
}

/** A document is done when every section is reviewed and the engineer approved it; reviewed some: in progress. */
export function estadoDoc(g: DocGuardado | undefined, d: Documento): EstadoDoc {
  if (!g) return 'pendiente';
  const rev = d.secciones.filter(s => g.secciones[s.id]?.revisada).length;
  if (rev === d.secciones.length && g.aprobado) return 'hecho';
  return rev > 0 || g.aprobado ? 'enCurso' : 'pendiente';
}

export function estadoFabricante(f: Fabricante): { hecho: number; total: number; pct: number } {
  const total = CAMPOS_FABRICANTE.filter(c => c.obligatorio).length, falta = faltanFabricante(f).length;
  return { hecho: total - falta, total, pct: Math.round(((total - falta) / total) * 100) };
}

export function estadoHueco(o: Obligacion, h: Hueco, st: Estados): EstadoHueco {
  const g = st.obligaciones[o.id];
  if (g?.noAplica?.trim()) return 'noAplica';
  const guardado = g?.huecos[h.id];
  if (guardado?.estado === 'noAplica' && guardado.motivo?.trim()) return 'noAplica';
  if (h.ensayo) { const e = estadoEnsayo(st.ensayos[h.ensayo]); return e === 'hecho' ? 'hecho' : e === 'pendiente' ? 'pendiente' : 'enCurso'; }
  if (h.doc) {
    const d = DOCUMENTOS.find(x => x.id === h.doc);
    return d ? estadoDoc(st.docs[h.doc], d) : 'pendiente';
  }
  if (h.fab) { const e = estadoFabricante(st.fab); return e.hecho === e.total ? 'hecho' : e.hecho > 0 ? 'enCurso' : 'pendiente'; }
  return guardado?.estado === 'hecho' || guardado?.estado === 'enCurso' ? guardado.estado : 'pendiente';
}

/** An obligation's progress, 0 to 1; null when it does not apply (so it leaves every count). */
export function progresoObligacion(o: Obligacion, st: Estados): number | null {
  const e = o.huecos.map(h => estadoHueco(o, h, st)).filter(x => x !== 'noAplica');
  if (!e.length) return null;
  return e.reduce((s, x) => s + valorEstado(x), 0) / e.length;
}

const pesada = (os: Obligacion[], st: Estados) => {
  let num = 0, den = 0;
  for (const o of os) { const p = progresoObligacion(o, st); if (p == null) continue; num += p * o.peso; den += o.peso; }
  return den ? num / den : 0;
};
export const pct = (x: number) => Math.round(x * 100);

export function progresoGrupo(g: IdGrupoMatriz, st: Estados) { return pct(pesada(OBLIGACIONES.filter(o => o.grupo === g), st)); }
export const progresoTotal = (st: Estados) => pct(pesada(OBLIGACIONES, st));
/** The same percentage over the obligations that cannot be skipped (weight 3). */
export const progresoImprescindible = (st: Estados) => pct(pesada(OBLIGACIONES.filter(o => o.peso === 3), st));

export function progresoEnsayos(st: Estados) {
  let num = 0, den = 0, hechos = 0;
  for (const e of ENSAYOS) { const s = estadoEnsayo(st.ensayos[e.id]); num += valorEstado(s) * e.peso; den += e.peso; if (s === 'hecho') hechos++; }
  return { pct: pct(den ? num / den : 0), hechos, total: ENSAYOS.length };
}
export function progresoDocumentos(st: Estados) {
  let num = 0, den = 0, hechos = 0;
  for (const d of DOCUMENTOS) {
    const g = st.docs[d.id], s = estadoDoc(g, d);
    // within a document: the share of its sections reviewed, plus the approval as the last step
    const rev = g ? d.secciones.filter(x => g.secciones[x.id]?.revisada).length : 0;
    const v = s === 'hecho' ? 1 : (rev / d.secciones.length) * 0.9;
    num += v * d.peso; den += d.peso; if (s === 'hecho') hechos++;
  }
  return { pct: pct(den ? num / den : 0), hechos, total: DOCUMENTOS.length };
}
/** The eight documents of the «Carpeta legal»: one is ready when every document behind it is. */
export function carpetaLegal(st: Estados) {
  const filas = CARPETA_LEGAL.map(i => ({ ...i, listo: i.docs.every(id => { const d = DOCUMENTOS.find(x => x.id === id)!; return estadoDoc(st.docs[id], d) === 'hecho'; }) }));
  return { filas, listos: filas.filter(f => f.listo).length, total: filas.length };
}

export interface Falta { o: Obligacion; h: Hueco; estado: EstadoHueco }
/** What is still missing, the most important first (weight, then the catalogue's order). */
export function queFalta(st: Estados): Falta[] {
  return OBLIGACIONES.flatMap(o => o.huecos.map(h => ({ o, h, estado: estadoHueco(o, h, st) })))
    .filter(f => f.estado === 'pendiente' || f.estado === 'enCurso')
    .sort((a, b) => b.o.peso - a.o.peso || OBLIGACIONES.indexOf(a.o) - OBLIGACIONES.indexOf(b.o));
}

/** Slots with no file or link attached that were marked done by hand: «hecho» with nothing to show for it. */
export function hechosSinArchivo(st: Estados): Falta[] {
  return OBLIGACIONES.flatMap(o => o.huecos.filter(h => !h.ensayo && !h.doc && !h.fab).map(h => ({ o, h, estado: estadoHueco(o, h, st) })))
    .filter(f => f.estado === 'hecho' && !st.obligaciones[f.o.id]?.huecos[f.h.id]?.adjuntos?.length);
}

export const NOMBRE_GRUPO = (g: IdGrupoMatriz) => GRUPOS_MATRIZ.find(x => x.id === g)!.nombre;

/** What a document's generators may read: the design, the maker's details and the state of the matrix, the tests and the other documents. */
export function contextoDoc(st: Estados, f: FichaHomologacion, hoy: string): ContextoDoc {
  return {
    f, fab: st.fab, hoy,
    hueco: (oid, hid) => { const o = OBLIGACIONES.find(x => x.id === oid), h = o?.huecos.find(x => x.id === hid); return o && h ? estadoHueco(o, h, st) : 'pendiente'; },
    ensayo: id => resumenEnsayo(st.ensayos[id]),
    doc: id => { const d = DOCUMENTOS.find(x => x.id === id); return d ? estadoDoc(st.docs[id], d) : 'pendiente'; },
  };
}
