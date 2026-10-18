// ============================================================================
// OPINIONES EN OTRAS WEBS · THE SHARED HALF (2026-10-18, W4)
// ============================================================================
// Validation and wording of third-party ratings, shared by the server HTML
// and the screen so both say the same sentence. Why they are kept apart from
// the community score: `src/server/bd/opinionesTerceros.ts`.

export type OpinionTercero = {
  fuente: string;
  url: string;
  nota: number;
  escala: number;
  opiniones: number;
  fecha: string;
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** The valid entries of a cell, in their order; [] for anything else. */
export function opinionesDe(valor: unknown): OpinionTercero[] {
  let lista: unknown = valor;
  if (typeof valor === 'string') {
    try { lista = JSON.parse(valor); } catch { return []; }
  }
  if (!Array.isArray(lista)) return [];
  const out: OpinionTercero[] = [];
  for (const x of lista as any[]) {
    if (!x || typeof x !== 'object') continue;
    const fuente = typeof x.fuente === 'string' ? x.fuente.trim().slice(0, 80) : '';
    const url = typeof x.url === 'string' ? x.url.trim() : '';
    const escala = Number(x.escala ?? 5);
    const nota = Number(x.nota);
    const opiniones = Number(x.opiniones);
    const fecha = typeof x.fecha === 'string' ? x.fecha.trim() : '';
    if (!fuente || !/^https:\/\/\S+$/.test(url) || !FECHA.test(fecha)) continue;
    if (!Number.isFinite(escala) || escala <= 0 || escala > 100) continue;
    if (!Number.isFinite(nota) || nota < 0 || nota > escala) continue;
    if (!Number.isInteger(opiniones) || opiniones < 1) continue;
    out.push({ fuente, url: url.slice(0, 1000), nota, escala, opiniones, fecha });
  }
  return out.slice(0, 4);
}

const cifra = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });
const fechaEs = (f: string) => { const [a, m, d] = f.split('-'); return `${d}/${m}/${a}`; };

/** The one sentence, the same on screen and in the server HTML:
 *  «Según Trustpilot: 4 de 5, de 16.567 opiniones (consultado el 18/10/2026)». */
export function textoOpinion(o: OpinionTercero): string {
  // Grouped by hand: es-ES leaves four digits ungrouped («7423»), and the
  // list then reads 16.567 next to 7423.
  const n = String(o.opiniones).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Según ${o.fuente}: ${cifra(o.nota)} de ${cifra(o.escala)}, de ${n} ${o.opiniones === 1 ? 'opinión' : 'opiniones'} (consultado el ${fechaEs(o.fecha)})`;
}
