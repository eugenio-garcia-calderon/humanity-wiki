// «Otras propuestas»: the first section of every policy window. A slider from
// left to right shows what each political camp proposes on the window's
// subject, with this model at the middle stop. Every camp gets the same card:
// who defends it, the idea, concrete proposals, its own argument, the main
// criticism, and sources. Data: src/data/espectro/<id>.ts.
import { useId, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { POSTURA_IDS, POSTURA_NOMBRE, type Espectro, type PosturaId } from '../../data/espectro/tipos';
import { Apartado } from './ventanas';
import { Libre } from './piezas';
import { cn } from '../../utils/cn';

type Parada = PosturaId | 'modelo';
const PARADAS: Parada[] = [POSTURA_IDS[0], POSTURA_IDS[1], 'modelo', POSTURA_IDS[2], POSTURA_IDS[3]];
const NOMBRE: Record<Parada, string> = { ...POSTURA_NOMBRE, modelo: 'Este modelo' };
/** Neutral greys for the camps (no party colours); the model stands out in emerald. */
const MARCA: Record<Parada, string> = {
  izquierda: 'bg-slate-500', 'centro-izquierda': 'bg-slate-400', modelo: 'bg-emerald-600', 'centro-derecha': 'bg-slate-400', derecha: 'bg-slate-500',
};

export function EspectroPropuestas({ ventana, datos }: { ventana: string; datos: Espectro }) {
  const [i, setI] = useState(2);
  const id = useId();
  const parada = PARADAS[i];
  const postura = parada === 'modelo' ? null : datos.posturas.find(p => p.id === parada) ?? null;

  return (
    <Apartado id={`${ventana}-propuestas`} titulo={`Qué proponen otros sobre ${datos.tema}`} fondo="blanco"
      entradilla="Mueve el deslizador de la izquierda a la derecha para ver otras propuestas. En medio está la de este modelo: va ahí para poder compararla, no porque sea de centro.">
      <div className="max-w-3xl">
        <label htmlFor={id} className="sr-only">Elige una propuesta, de izquierda a derecha</label>
        <input id={id} type="range" min={0} max={PARADAS.length - 1} step={1} value={i}
          onChange={e => setI(Number(e.target.value))}
          aria-valuetext={NOMBRE[parada]}
          className="h-6 w-full cursor-pointer appearance-none rounded-none border-0 bg-transparent p-0 shadow-none outline-none
            [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-slate-200
            [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:shadow
            [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-slate-200
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900
            focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-slate-900 focus-visible:[&::-webkit-slider-thumb]:ring-offset-2" />
        <div className="mt-1 grid grid-cols-5 text-center">
          {PARADAS.map((p, k) => (
            <Libre key={p} onClick={() => setI(k)} aria-pressed={k === i}
              className={cn('flex flex-col items-center gap-1 rounded-md px-0.5 py-1 text-[12px] leading-tight sm:text-[13px]',
                k === i ? 'font-bold text-slate-900' : 'text-slate-500 hover:text-slate-800')}>
              <span aria-hidden className={cn('h-2 w-2 rounded-full', MARCA[p], k === i ? 'opacity-100' : 'opacity-40')} />
              {NOMBRE[p]}
            </Libre>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-live="polite">
          {postura ? (
            <>
              <p className="text-sm font-semibold text-slate-500">{NOMBRE[postura.id]} · {postura.quien}</p>
              <p className="text-xs text-slate-500">{postura.cuando}</p>
              <p className="mt-1 text-lg font-bold leading-snug text-slate-900">{postura.idea}</p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
                {postura.propone.map(t => <li key={t}>{t}</li>)}
              </ul>
              {postura.nota && <p className="mt-2 text-sm italic text-slate-500">{postura.nota}</p>}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-sm font-semibold text-slate-900">Lo que defienden</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{postura.argumento}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3.5">
                  <p className="text-sm font-semibold text-slate-900">Lo que les critican</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{postura.critica}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-1 text-sm">
                {postura.fuentes.map(f => (
                  <li key={f.url}>
                    <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
                      <ExternalLink aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{f.titulo}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-emerald-700">Este modelo</p>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-800">
                {datos.modelo.map(t => <li key={t}>{t}</li>)}
              </ul>
              <div className="mt-4 rounded-xl bg-slate-50 p-3.5">
                <p className="text-sm font-semibold text-slate-900">Lo que se le puede criticar</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-slate-700">
                  {datos.limites.map(t => <li key={t}>{t}</li>)}
                </ul>
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Más abajo está explicado con detalle. Mueve el deslizador para compararlo con lo que proponen otros.
              </p>
            </>
          )}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          Un resumen de lo último publicado por los partidos y organizaciones de cada lado (la fecha va en cada ficha), revisado el {new Date(datos.revisado).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}. Cada partido tiene matices: las fuentes llevan a sus textos.
        </p>
      </div>
    </Apartado>
  );
}
