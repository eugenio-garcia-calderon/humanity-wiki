import { useEffect, useState } from 'react';
import { X, Loader2, BarChart3 } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// LAS ESTADÍSTICAS DE UNA PÁGINA (2026-10-06, carril «acceso»)
// ============================================================================
// Visitas por día, visitantes únicos y de dónde vienen, para quien administra
// la página. Sin datos personales: ver la migración 0139. Lo que la pantalla
// dice con todas las letras, porque cambia cómo se leen los números: el
// visitante único lo es POR DÍA.

const NOMBRE_ORIGEN: Record<string, string> = { directo: 'Directo o enlace pegado', buscador: 'Buscadores', red: 'Redes sociales' };
const corta = (d: string) => new Date(d + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export default function PanelEstadisticas({ paginaId, onCerrar }: { paginaId: string; onCerrar: () => void }) {
  const [dias, setDias] = useState(30);
  const [d, setD] = useState<any | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [vista, setVista] = useState<'visitas' | 'unicos'>('visitas');
  useEffect(() => {
    setD(null);
    fetch(`/api/estadisticas/pagina/${encodeURIComponent(paginaId)}?dias=${dias}`, { credentials: 'include' })
      .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) setFallo(j.error || 'No se ha podido cargar.'); else setD(j); })
      .catch(() => setFallo('No se ha podido cargar.'));
  }, [paginaId, dias]);

  const max = Math.max(1, ...(d?.por_dia || []).map((x: any) => x[vista]));
  const maxOrigen = Math.max(1, ...(d?.origenes || []).map((x: any) => x.unicos));
  return (
    <div className="fixed inset-0 z-[9995] grid place-items-center bg-slate-900/40 p-4" onClick={onCerrar}>
      <div role="dialog" aria-label="Estadísticas" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-black text-slate-800"><BarChart3 className="h-4 w-4" /> Estadísticas de la página</p>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 flex gap-1">
          {[7, 30, 90, 365].map(n => (
            <button key={n} onClick={() => setDias(n)} className={cn('h-8 rounded-full px-3 text-xs font-bold', dias === n ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
              {n === 365 ? '1 año' : `${n} días`}
            </button>
          ))}
        </div>
        {fallo && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{fallo}</p>}
        {!d && !fallo && <p className="mt-6 flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…</p>}
        {d && (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[['Visitas', d.total_visitas], ['Visitantes únicos', d.unicos_por_dia], ['Seguidores', d.seguidores], ['Hilos de comentarios', d.hilos]].map(([t, n]) => (
                <div key={t as string} className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black text-slate-900">{n}</p><p className="text-[11px] text-slate-500">{t}</p></div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs font-black text-slate-700">Por día</p>
              <div className="flex gap-1">
                {(['visitas', 'unicos'] as const).map(k => (
                  <button key={k} onClick={() => setVista(k)} className={cn('h-7 rounded-full px-2.5 text-[11px] font-bold', vista === k ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500')}>{k === 'visitas' ? 'Visitas' : 'Únicos'}</button>
                ))}
              </div>
            </div>
            <div className="mt-2 flex h-32 items-end gap-px" role="img" aria-label={`Gráfico de ${vista} por día`}>
              {d.por_dia.map((x: any) => (
                <div key={x.dia} title={`${corta(x.dia)}: ${x.visitas} visitas, ${x.unicos} únicos`} className="group relative flex h-full flex-1 items-end">
                  <div className="w-full rounded-t bg-emerald-500/80 group-hover:bg-emerald-600" style={{ height: `${(x[vista] / max) * 100}%`, minHeight: x[vista] ? 2 : 0 }} />
                </div>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>{corta(d.por_dia[0].dia)}</span><span>{corta(d.por_dia[d.por_dia.length - 1].dia)}</span></div>

            <p className="mt-4 text-xs font-black text-slate-700">De dónde vienen</p>
            {!d.origenes.length ? <p className="mt-1 text-xs text-slate-400">Todavía no hay visitas en este periodo.</p> : (
              <div className="mt-1 space-y-1">
                {d.origenes.map((o: any) => (
                  <div key={o.origen} className="flex items-center gap-2 text-xs">
                    <span className="w-44 shrink-0 truncate text-slate-600">{NOMBRE_ORIGEN[o.origen] || o.origen}</span>
                    <div className="h-2 flex-1 rounded bg-slate-100"><div className="h-2 rounded bg-sky-400" style={{ width: `${(o.unicos / maxOrigen) * 100}%` }} /></div>
                    <span className="w-8 text-right font-bold text-slate-600">{o.unicos}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
              Sin datos personales: no se guarda ninguna IP ni se usan cookies. Un visitante único lo es <b>por día</b> (quien vuelve otro día cuenta otra vez), y de dónde viene se agrupa por el nombre del sitio, nunca por la dirección completa. No cuentan los robots ni tus propias visitas.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
