import { useEffect, useMemo, useState } from 'react';
import { X, History, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { diferencias } from '../../utils/diferencias';

// ============================================================================
// EL HISTORIAL DE UNA PÁGINA (2026-10-06, carril «acceso», #8)
// ============================================================================
// Un panel a la derecha: las versiones por fecha y autor; al elegir una, qué
// ha cambiado DESDE entonces hasta ahora (en verde lo añadido después, en
// rojo tachado lo que había y ya no está), y «Restaurar esta versión», que
// crea una versión nueva con aquel contenido: nada se pierde.

const fecha = (iso: string) => {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(Date.now() - 86400000);
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoy.toDateString()) return `Hoy, ${hora}`;
  if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
  return `${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: d.getFullYear() === hoy.getFullYear() ? undefined : 'numeric' })}, ${hora}`;
};

export default function PanelVersiones({ paginaId, bloquesActuales, tituloActual, onCerrar }: {
  paginaId: string; bloquesActuales: any[]; tituloActual: string; onCerrar: () => void;
}) {
  const [lista, setLista] = useState<any | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [elegida, setElegida] = useState<any | null>(null);
  const [version, setVersion] = useState<any | null>(null);
  const [soloCambios, setSoloCambios] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const base = `/api/versiones/pagina/${encodeURIComponent(paginaId)}`;

  useEffect(() => {
    fetch(base, { credentials: 'include' }).then(async r => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setFallo(j.error || 'No se ha podido cargar.'); return; }
      setLista(j);
    }).catch(() => setFallo('No se ha podido cargar.'));
  }, [paginaId]);
  useEffect(() => {
    if (!elegida) { setVersion(null); return; }
    setVersion(null);
    fetch(`${base}/${elegida.id}`, { credentials: 'include' }).then(r => r.json()).then(setVersion).catch(() => {});
  }, [elegida]);

  const difs = useMemo(() => (version ? diferencias(version.bloques, bloquesActuales) : []), [version, bloquesActuales]);
  const cambios = difs.filter(d => d.tipo !== 'igual').length;

  const restaurar = async () => {
    if (!elegida || !confirm('¿Restaurar esta versión? Lo que hay ahora se guarda también en el historial, así que podrás volver.')) return;
    setOcupado(true);
    const r = await fetch(`${base}/${elegida.id}/restaurar`, { method: 'POST', credentials: 'include' });
    setOcupado(false);
    if (!r.ok) { setFallo((await r.json().catch(() => ({}))).error || 'No se ha podido restaurar.'); return; }
    // El editor tiene la página en memoria: se vuelve a abrir con lo restaurado.
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[9995] flex justify-end bg-slate-900/30" onClick={onCerrar}>
      <div className="flex h-full w-full max-w-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex w-56 shrink-0 flex-col border-r border-slate-100 sm:w-64">
          <div className="flex items-center justify-between px-3 py-3">
            <p className="flex items-center gap-1.5 text-sm font-black text-slate-800"><History className="h-4 w-4" /> Historial</p>
            <button onClick={onCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 sm:hidden"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            {fallo && <p className="rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{fallo}</p>}
            {!lista && !fallo && <p className="flex items-center gap-2 p-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…</p>}
            {lista && (
              <>
                <button onClick={() => setElegida(null)}
                  className={cn('w-full rounded-xl px-2.5 py-2 text-left', !elegida ? 'bg-slate-100' : 'hover:bg-slate-50')}>
                  <span className="block text-[13px] font-bold text-slate-800">Ahora</span>
                  <span className="block truncate text-[11px] text-slate-400">{lista.actual?.autor || '—'}{lista.actual?.fecha ? ` · ${fecha(lista.actual.fecha)}` : ''}</span>
                </button>
                {!lista.versiones.length && <p className="p-2 text-[11px] text-slate-400">Todavía no hay versiones anteriores. Se guarda una cada vez que alguien se pone a escribir.</p>}
                {lista.versiones.map((v: any) => (
                  <button key={v.id} onClick={() => setElegida(v)}
                    className={cn('w-full rounded-xl px-2.5 py-2 text-left', elegida?.id === v.id ? 'bg-emerald-50' : 'hover:bg-slate-50')}>
                    <span className="block text-[13px] font-bold text-slate-700">{v.fecha ? fecha(v.fecha) : `Versión ${v.version}`}</span>
                    <span className="block truncate text-[11px] text-slate-400">{v.autor || 'Alguien'}{v.operation === 'restore' ? ' · antes de restaurar' : ''}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-800">{elegida ? (version?.titulo || tituloActual) : tituloActual}</p>
              <p className="text-[11px] text-slate-400">
                {!elegida ? 'Así está ahora. Elige una versión para ver qué ha cambiado desde entonces.'
                  : version ? (cambios ? `${cambios} ${cambios === 1 ? 'cambio' : 'cambios'} desde esta versión hasta ahora` : 'Igual que ahora') : 'Cargando…'}
              </p>
            </div>
            <button onClick={onCerrar} aria-label="Cerrar" className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 sm:grid"><X className="h-4 w-4" /></button>
          </div>
          {elegida && version && (
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2">
              <label className="flex items-center gap-1.5 text-[12px] text-slate-600">
                <input type="checkbox" checked={soloCambios} onChange={() => setSoloCambios(v => !v)} className="h-4 w-4 accent-emerald-600" /> Solo los cambios
              </label>
              <span className="text-[11px] text-slate-400"><span className="rounded bg-emerald-100 px-1 text-emerald-800">añadido después</span> · <span className="rounded bg-rose-100 px-1 text-rose-700 line-through">quitado después</span></span>
              <button onClick={restaurar} disabled={ocupado || !cambios}
                className="ml-auto flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-40">
                {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restaurar esta versión
              </button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {!elegida
              ? bloquesActualesTexto(bloquesActuales)
              : !version ? null
              : difs.filter(d => !soloCambios || d.tipo !== 'igual').map((d, i) => (
                <div key={`${d.bloque.id}-${i}`} className={cn('mb-1.5 rounded-lg px-2.5 py-1.5 text-sm leading-relaxed',
                  d.tipo === 'nuevo' && 'bg-emerald-50 text-emerald-900',
                  d.tipo === 'quitado' && 'bg-rose-50 text-rose-700 line-through',
                  d.tipo === 'igual' && 'text-slate-500',
                  d.tipo === 'cambiado' && 'bg-amber-50/60 text-slate-800')}>
                  <span className="mr-2 text-[10px] font-black uppercase tracking-wide text-slate-400 no-underline">{d.bloque.tipo}</span>
                  {d.tipo === 'cambiado'
                    ? d.trozos.map((t, k) => <span key={k} className={cn(t.tipo === 'mas' && 'rounded bg-emerald-200/70', t.tipo === 'menos' && 'rounded bg-rose-200/70 line-through')}>{t.t}</span>)
                    : d.texto || <i className="text-slate-300">vacío</i>}
                </div>
              ))}
            {elegida && version && soloCambios && !cambios && <p className="text-sm text-slate-400">Esta versión es igual que la de ahora.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function bloquesActualesTexto(bloques: any[]) {
  return diferencias(bloques, bloques).map((d, i) => (
    <p key={`${d.bloque.id}-${i}`} className="mb-1.5 text-sm leading-relaxed text-slate-700">{d.texto}</p>
  ));
}
