// «Ponte a prueba»: a short quiz so the reader can check what they understood
// (Eugenio: «genera un bot que te evalúe en cuanto al entendimiento de todo esto»).
import { useState } from 'react';
import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { PREGUNTAS } from '../../data/legal';
import { Boton, Libre } from './piezas';
import { cn } from '../../utils/cn';

export function LegalPrueba() {
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const hechas = Object.keys(respuestas).length;
  const aciertos = PREGUNTAS.filter(p => respuestas[p.id] === p.bien).length;

  return (
    <div>
      <ol className="grid gap-4 lg:grid-cols-2">
        {PREGUNTAS.map((p, i) => {
          const r = respuestas[p.id];
          const respondida = r !== undefined;
          return (
            <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-semibold leading-snug text-slate-900"><span className="text-slate-400">{i + 1}. </span>{p.p}</p>
              <div className="mt-3 grid gap-2" role="group" aria-label={`Respuestas a la pregunta ${i + 1}`}>
                {p.opciones.map((o, j) => {
                  const elegida = r === j;
                  const correcta = j === p.bien;
                  return (
                    <Libre key={o} disabled={respondida} onClick={() => setRespuestas(s => ({ ...s, [p.id]: j }))}
                      aria-pressed={elegida}
                      className={cn('h-auto w-full justify-start whitespace-normal rounded-xl border px-3 py-2 text-left text-[15px] leading-snug text-slate-800 disabled:opacity-100',
                        !respondida && 'border-slate-300 hover:border-slate-400 hover:bg-slate-50',
                        respondida && correcta && 'border-emerald-400 bg-emerald-50 text-emerald-900',
                        respondida && elegida && !correcta && 'border-rose-400 bg-rose-50 text-rose-900',
                        respondida && !elegida && !correcta && 'border-slate-200 text-slate-500')}>
                      {o}
                    </Libre>
                  );
                })}
              </div>
              {respondida && (
                <p className={cn('mt-3 flex gap-2 text-[15px] leading-relaxed', r === p.bien ? 'text-emerald-800' : 'text-rose-800')} aria-live="polite">
                  {r === p.bien ? <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span><strong>{r === p.bien ? 'Bien. ' : 'No exactamente. '}</strong><span className="text-slate-700">{p.porque}</span>
                    {r !== p.bien && <> <a href={`#${p.repasar.id}`} className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">Repasa «{p.repasar.t}»</a></>}</span>
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite">
        <p className="text-[17px] text-slate-800">
          {hechas === 0 ? 'Responde las preguntas y aquí verás tu resultado.'
            : hechas < PREGUNTAS.length ? <>Llevas <strong>{aciertos} de {hechas}</strong>. Te quedan {PREGUNTAS.length - hechas}.</>
              : <>Resultado: <strong>{aciertos} de {PREGUNTAS.length}</strong>. {veredicto(aciertos / PREGUNTAS.length)}</>}
        </p>
        {hechas > 0 && <Boton onClick={() => setRespuestas({})}><RotateCcw aria-hidden className="h-4 w-4" />Empezar de nuevo</Boton>}
      </div>
    </div>
  );
}

/** One sentence for the final score (share of right answers). */
function veredicto(r: number) {
  if (r === 1) return 'Lo has entendido todo: podrías explicárselo a otra persona.';
  if (r >= 0.8) return 'Muy bien: lo esencial está claro. Repasa los enlaces de las que fallaste.';
  if (r >= 0.5) return 'Vas bien, pero hay partes que conviene repasar: sigue los enlaces de cada fallo.';
  return 'Merece la pena volver a leer «Quién legisla», «La propuesta» y «Licencias», y probar otra vez.';
}
