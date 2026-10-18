import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Loader2, X, Film, Image as ImageIcon, FileText } from 'lucide-react';
import { useCargas, quitarCarga } from '../../utils/cargas';
import { cn } from '../../utils/cn';

// EL PANEL DEL GESTOR DE CARGAS (2026-10-18): abajo, mientras haya algo
// subiendo o recién subido. Se puede plegar y seguir navegando; cada carga
// lleva a su página. Ver `utils/cargas.ts`.

const peso = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function GestorCargas() {
  const cargas = useCargas();
  const [plegado, setPlegado] = useState(false);
  if (!cargas.length) return null;
  const enMarcha = cargas.filter(c => c.estado === 'subiendo');
  const media = enMarcha.length ? Math.round((enMarcha.reduce((s, c) => s + c.fraccion, 0) / enMarcha.length) * 100) : 100;
  const titulo = enMarcha.length
    ? `Subiendo ${enMarcha.length === 1 ? '1 archivo' : `${enMarcha.length} archivos`} · ${media} %`
    : cargas.some(c => c.estado === 'fallo') ? 'Alguna subida no ha salido' : 'Subidas terminadas';

  return (
    <div role="region" aria-label="Gestor de cargas"
      className="fixed bottom-4 left-1/2 z-[9990] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <button type="button" onClick={() => setPlegado(p => !p)} aria-expanded={!plegado}
        className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50">
        {enMarcha.length ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-600" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
        <span className="flex-1 truncate text-sm font-black text-slate-800">{titulo}</span>
        {plegado ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {plegado && enMarcha.length > 0 && (
        <div className="h-1 bg-slate-100"><div className="h-full bg-emerald-500 transition-[width]" style={{ width: `${media}%` }} /></div>
      )}
      {!plegado && (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto border-t border-slate-100">
          {cargas.map(c => {
            const Icono = c.vista ? null : /\.(mp4|mov|webm|m4v)$/i.test(c.nombre) ? Film : /\.(png|jpe?g|webp|gif|heic)$/i.test(c.nombre) ? ImageIcon : FileText;
            const pct = Math.round(c.fraccion * 100);
            return (
              <li key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                {c.vista
                  ? <img src={c.vista} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">{Icono && <Icono className="h-5 w-5" />}</span>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <Link to={`/paginas/${c.paginaId}`} className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700 hover:underline" title={c.nombre}>{c.nombre}</Link>
                    <span className={cn('shrink-0 text-[11px] font-bold tabular-nums', c.estado === 'fallo' ? 'text-rose-600' : c.estado === 'hecha' ? 'text-emerald-600' : 'text-slate-500')}>
                      {c.estado === 'subiendo' ? `${pct} %` : c.estado === 'hecha' ? 'Listo' : 'Error'}
                    </span>
                  </div>
                  {c.estado === 'fallo' ? (
                    <p className="mt-0.5 flex items-start gap-1 text-[11px] leading-snug text-rose-600"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{c.error}</p>
                  ) : (
                    <>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full transition-[width]', c.estado === 'hecha' ? 'bg-emerald-500' : 'bg-sky-500')} style={{ width: `${c.estado === 'hecha' ? 100 : pct}%` }} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-400">{peso(c.bytes)} · {c.destino.tipo === 'portada' ? 'portada' : 'en la página'}</p>
                    </>
                  )}
                </div>
                {c.estado !== 'subiendo' && (
                  <button type="button" onClick={() => quitarCarga(c.id)} aria-label="Quitar de la lista"
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
