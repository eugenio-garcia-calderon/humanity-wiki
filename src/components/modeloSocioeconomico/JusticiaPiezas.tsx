// Small pieces shared by the «Justicia» window and its extra sections.
import { ArrowDown, CornerUpLeft } from 'lucide-react';
import { FUENTE_JUSTICIA, type Paso } from '../../data/justicia';
import { Fuente } from './piezas';
import { cn } from '../../utils/cn';

/** A source link by id, from this window's own list. */
export function F({ id }: { id: string }) {
  const f = FUENTE_JUSTICIA[id];
  return f ? <Fuente url={f.url} titulo={f.titulo} /> : null;
}

/** A journey drawn as numbered steps; dashed steps with a back arrow are where things start over. */
export function Recorrido({ titulo, pasos, tono }: { titulo: string; pasos: Paso[]; tono: 'mal' | 'bien' }) {
  return (
    <div className={cn('rounded-2xl border p-5', tono === 'mal' ? 'border-rose-200 bg-rose-50/50' : 'border-emerald-200 bg-emerald-50/50')}>
      <p className={cn('text-lg font-bold', tono === 'mal' ? 'text-rose-800' : 'text-emerald-800')}>{titulo}</p>
      <ol className="mt-4">
        {pasos.map((p, i) => (
          <li key={p.t}>
            {i > 0 && (
              <span aria-hidden className="flex justify-center py-1 text-slate-400">
                {p.vuelta ? <CornerUpLeft className="h-4 w-4 text-rose-600" /> : <ArrowDown className="h-4 w-4" />}
              </span>
            )}
            <div className={cn('rounded-xl border bg-white p-3', p.vuelta ? 'border-dashed border-rose-300' : 'border-slate-200')}>
              <p className="font-semibold text-slate-900"><span className="mr-1.5 tabular-nums text-slate-400">{i + 1}.</span>{p.t}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-700">{p.d}{p.fuente && !p.tiempo && <F id={p.fuente} />}</p>
              {p.tiempo && (
                <p className={cn('mt-1.5 text-sm font-semibold', tono === 'mal' ? 'text-rose-700' : 'text-emerald-700')}>
                  {p.tiempo}{p.fuente && <F id={p.fuente} />}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

