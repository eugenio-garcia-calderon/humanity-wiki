// ============================================================================
// AEROMÓVIL · comparison table and our own spec sheet. The «Otros velomóviles» section (catalogue, photos to a
// model) was removed on 2026-11-13 at Eugenio's request; these two pieces are still used by the editor.
// ============================================================================
import { cn } from '../../utils/cn';
import { fichaComparable } from './referencias';
import { type Modelo, type Resultados } from './geometria';

const fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Nuestra ficha, en los mismos términos que la de un velomóvil de referencia. */
export function fichaPropia(m: Modelo, r: Resultados) {
  const ejes = new Set(m.ruedas.map(w => Math.round(w.x * 100))).size;
  // The Bala has no mass estimate and the editor's Cd formula does not apply to it: '—' rather than a number that means nothing.
  // The Triciclo has a mass; its Cd is the tunnel's, computed apart (NaN here, so '—' too). Both carry two riders.
  const dosRuedas = m.tipo === 'bala' || m.tipo === 'triciclo';
  const via = dosRuedas ? m.P.track : Math.max(m.via.del, m.via.tras);
  return { L: m.Lf, W: m.P.W, H: m.P.H, batalla: m.P.B, ruedas: m.ruedas.length, ejes, via, plazas: dosRuedas ? 2 : m.asientos.length,
    masa: Number.isFinite(r.mVeh) ? r.mVeh : null, cd: Number.isFinite(r.Cd) ? r.Cd as number | null : null, huella: m.Lf * m.P.W };
}
export const nombreDe = (m: Modelo) => (m.tipo === 'a1' ? 'Aeromóvil 1' : m.tipo === 'bala' ? 'Cuadriciclo Bala en rombo' : m.tipo === 'triciclo' ? (m.traseras ? 'Cuadriciclo Bala clásico' : 'Triciclo Bala') : 'Aeromóvil Gota');

export function TablaComparacion({ propia, otra, nombre, nuestro = 'Aeromóvil 1' }: { propia: ReturnType<typeof fichaPropia>; otra: ReturnType<typeof fichaComparable>; nombre: string; nuestro?: string }) {
  const filas: [string, number | null, number | null, (v: number) => string][] = [
    ['Largo', propia.L, otra.L, v => `${fmt(v)} m`], ['Ancho', propia.W, otra.W, v => `${fmt(v)} m`], ['Alto', propia.H, otra.H, v => `${fmt(v)} m`],
    ['Batalla', propia.batalla, otra.batalla, v => `${fmt(v)} m`], ['Vía más ancha', propia.via, otra.via, v => `${fmt(v)} m`],
    ['Ruedas', propia.ruedas, otra.ruedas, v => String(v)], ['Plazas', propia.plazas, otra.plazas, v => String(v)],
    ['Masa', propia.masa, otra.masa, v => `${Math.round(v)} kg`], ['Cd (el nuestro, estimado)', propia.cd, otra.cd, v => v.toFixed(3).replace('.', ',')], ['Huella (largo × ancho)', propia.huella, otra.huella, v => `${fmt(v)} m²`],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="py-1.5 font-semibold">Medida</th><th className="py-1.5 text-right font-semibold">{nuestro}</th><th className="py-1.5 text-right font-semibold">{nombre}</th><th className="py-1.5 text-right font-semibold">Diferencia</th></tr></thead>
        <tbody>
          {filas.map(([n, a, b, f]) => (
            <tr key={n} className="border-t border-slate-100">
              <td className="py-1.5 text-slate-700">{n}</td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums">{a == null ? '—' : f(a)}</td>
              <td className="py-1.5 text-right font-mono text-xs tabular-nums">{b == null ? 'no publicado' : f(b)}</td>
              <td className={cn('py-1.5 text-right font-mono text-xs tabular-nums', a != null && b != null && a > b ? 'text-amber-700' : 'text-emerald-700')}>
                {a == null || b == null || !b ? '—' : `${a >= b ? '+' : ''}${Math.round((a / b - 1) * 100)} %`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
