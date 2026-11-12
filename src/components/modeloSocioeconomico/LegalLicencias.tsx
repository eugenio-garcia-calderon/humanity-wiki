// «¿Qué necesito para…?»: the three licence levels of the proposal and a sample
// catalogue, against what happens today. Data: src/data/legal.ts.
import { useState } from 'react';
import { ACTIVIDADES, NIVELES_LICENCIA } from '../../data/legal';
import { Libre } from './piezas';
import { F } from './LegalDiagrama';
import { cn } from '../../utils/cn';

const TONO = { aviso: 'bg-emerald-50 border-emerald-300 text-emerald-900', declaracion: 'bg-sky-50 border-sky-300 text-sky-900', licencia: 'bg-amber-50 border-amber-300 text-amber-900' } as const;

export function LegalLicencias() {
  const [id, setId] = useState(ACTIVIDADES[1].id);
  const a = ACTIVIDADES.find(x => x.id === id)!;
  const nivel = NIVELES_LICENCIA.find(n => n.id === a.nivel)!;
  return (
    <div>
      <ol className="grid gap-3 md:grid-cols-3">
        {NIVELES_LICENCIA.map((n, i) => (
          <li key={n.id} className={cn('rounded-2xl border p-4', TONO[n.id])}>
            <p className="text-sm font-medium opacity-80">Nivel {i + 1}</p>
            <p className="text-lg font-bold">{n.t}</p>
            <p className="mt-1 text-[15px] leading-snug">{n.d}</p>
            <p className="mt-2 text-sm leading-snug opacity-80">{n.cuando}</p>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-500">El aviso (la ley lo llama «comunicación») y la declaración responsable ya existen en la ley<F id="ley-39-2015" />. Lo nuevo es que cada actividad esté en el mismo nivel en todo el país.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <p className="font-semibold text-slate-900">¿Qué necesito para…?</p>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1" role="group" aria-label="Elige una actividad">
            {ACTIVIDADES.map(x => (
              <Libre key={x.id} onClick={() => setId(x.id)} aria-pressed={x.id === id}
                className={cn('h-auto w-full justify-start whitespace-normal rounded-xl border px-3 py-2 text-left text-sm leading-snug sm:text-[15px]',
                  x.id === id ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-900' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50')}>
                {x.t}
              </Libre>
            ))}
          </div>
        </div>
        <div className="grid content-start gap-4" aria-live="polite">
          <div className="rounded-2xl border border-rose-200 bg-white p-5">
            <p className="text-sm font-semibold text-rose-800">Hoy</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{a.hoy}{a.fuentes?.map(f => <F key={f} id={f} />)}</p>
          </div>
          <div className={cn('rounded-2xl border p-5', TONO[a.nivel])}>
            <p className="text-sm font-semibold">Con la propuesta, en cualquier pueblo</p>
            <p className="mt-1 text-xl font-bold">{nivel.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{nivel.d}</p>
            {a.plazo && <p className="mt-2 text-[15px] leading-relaxed">{a.plazo}</p>}
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">El nivel de cada actividad y los plazos son una propuesta de ejemplo: el catálogo completo lo tendría que fijar la norma común, con quienes conocen cada sector.</p>
    </div>
  );
}
