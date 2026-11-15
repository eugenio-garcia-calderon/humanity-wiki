// «Otras propuestas»: the first section of every policy window. A slider from
// left to right shows what each political camp proposes on the window's
// subject, with this model at the middle stop. Every camp gets the same card:
// who defends it, the idea, concrete proposals, its own argument, the main
// criticism, and sources. Data: src/data/espectro/<id>.ts.
//
// Look (2026-11-13), after the polarisation observatory: one axis of light
// running left to right, darker at both ends and lighter at the centre, so the
// stops read by position even without colour — and no party colours at all.
// Only this model's stop carries a colour (emerald, as everywhere on the page).
// The card below is the observatory's «dossier»: the idea set as a quotation,
// then the proposals, then argument and criticism side by side.
import { useId, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { POSTURA_IDS, POSTURA_NOMBRE, type Espectro, type PosturaId } from '../../data/espectro/tipos';
import { Apartado } from './ventanas';
import { Boton, Libre } from './piezas';
import { cn } from '../../utils/cn';

type Parada = PosturaId | 'modelo';
const PARADAS: Parada[] = [POSTURA_IDS[0], POSTURA_IDS[1], 'modelo', POSTURA_IDS[2], POSTURA_IDS[3]];
const NOMBRE: Record<Parada, string> = { ...POSTURA_NOMBRE, modelo: 'Este modelo' };
const ULTIMA = PARADAS.length - 1;
/** Centre of stop k, in the 5-column grid of labels: 10 %, 30 %… 90 %. */
const centro = (k: number) => `${10 + (80 * k) / ULTIMA}%`;

export function EspectroPropuestas({ ventana, datos }: { ventana: string; datos: Espectro }) {
  const [i, setI] = useState(2);
  const id = useId();
  const parada = PARADAS[i];
  const postura = parada === 'modelo' ? null : datos.posturas.find(p => p.id === parada) ?? null;

  return (
    <Apartado id={`${ventana}-propuestas`} titulo={`Qué proponen otros sobre ${datos.tema}`} fondo="blanco"
      entradilla="Mueve el deslizador de la izquierda a la derecha para ver otras propuestas. En medio está la de este modelo: va ahí para poder compararla, no porque sea de centro.">
      <div className="max-w-3xl">
        {/* The axis. The painted track and its stop marks sit under a transparent range input
            whose thumb centres land exactly on the label columns (width 80 % + thumb, shifted half a thumb). */}
        <div className="relative h-8">
          <div aria-hidden className="absolute inset-x-[10%] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--color-slate-600),var(--color-slate-200)_50%,var(--color-slate-600))]" />
          {PARADAS.map((p, k) => (
            <span key={p} aria-hidden style={{ left: centro(k) }}
              className={cn('absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-transform duration-150 motion-reduce:transition-none',
                p === 'modelo' ? 'bg-emerald-600' : 'bg-slate-400', k === i && 'scale-0')} />
          ))}
          <label htmlFor={id} className="sr-only">Elige una propuesta, de izquierda a derecha</label>
          <input id={id} type="range" min={0} max={ULTIMA} step={1} value={i}
            onChange={e => setI(Number(e.target.value))}
            aria-valuetext={NOMBRE[parada]}
            className="relative ml-[calc(10%-14px)] h-8 w-[calc(80%+28px)] cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0 shadow-none
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900
              [&::-webkit-slider-runnable-track]:h-8 [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-webkit-slider-thumb]:mt-0.5 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:border-[6px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-900
              [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--color-slate-300),0_3px_10px_-2px_color-mix(in_oklab,var(--color-slate-900)_35%,transparent)]
              [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 hover:[&::-webkit-slider-thumb]:scale-110 motion-reduce:[&::-webkit-slider-thumb]:transition-none
              [&::-moz-range-track]:bg-transparent
              [&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[6px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900
              [&::-moz-range-thumb]:shadow-[0_0_0_1px_var(--color-slate-300)]" />
        </div>
        <div className="mt-1 grid grid-cols-5 text-center">
          {PARADAS.map((p, k) => (
            <Libre key={p} onClick={() => setI(k)} aria-pressed={k === i}
              className={cn('mx-0.5 rounded-lg px-0.5 py-1.5 text-[12px] leading-tight transition-colors duration-150 motion-reduce:transition-none sm:text-[13px]',
                k === i
                  ? cn('font-bold', p === 'modelo' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-900')
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}>
              {NOMBRE[p]}
            </Libre>
          ))}
        </div>

        {/* The card. Keyed by stop, so it enters afresh (opacity and a 4 px rise, 200 ms) each time it changes. */}
        <article key={parada} aria-live="polite"
          className={cn('mt-5 overflow-hidden rounded-[1.25rem] border bg-white shadow-sm shadow-slate-900/5 transition duration-200 ease-out starting:translate-y-1 starting:opacity-0 motion-reduce:transition-none',
            postura ? 'border-slate-200' : 'border-emerald-200')}>
          <div className={cn('p-5 sm:p-7', postura
            ? 'bg-[radial-gradient(120%_90%_at_0%_0%,var(--color-slate-100),transparent_60%)]'
            : 'bg-[radial-gradient(120%_90%_at_0%_0%,var(--color-emerald-50),transparent_60%)]')}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className={cn('flex items-center gap-2 text-sm font-bold', postura ? 'text-slate-900' : 'text-emerald-800')}>
                <span aria-hidden className={cn('h-2.5 w-2.5 rounded-full', postura ? 'bg-slate-400' : 'bg-emerald-600')} />
                {NOMBRE[parada]}
              </p>
              <p className="text-xs tabular-nums text-slate-500">{i + 1} de {PARADAS.length}</p>
            </div>

            {postura ? (
              <>
                <p className="mt-1 text-sm text-slate-600">{postura.quien}</p>
                <p className="text-xs text-slate-500">{postura.cuando}</p>
                {/* The idea, set as a quotation: the observatory's serif voice for what each side says. */}
                <blockquote className="relative mt-5 pl-7 font-serif text-[1.3rem] leading-snug text-slate-900 sm:text-[1.5rem]">
                  <span aria-hidden className="absolute -top-1.5 left-0 text-[2.2em] leading-none text-slate-300">«</span>
                  {postura.idea}
                </blockquote>
                <ul className="mt-5 space-y-2 text-[15px] leading-relaxed text-slate-700">
                  {postura.propone.map(t => (
                    <li key={t} className="flex gap-3"><span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-slate-400" />{t}</li>
                  ))}
                </ul>
                {postura.nota && <p className="mt-3 text-sm italic text-slate-500">{postura.nota}</p>}
              </>
            ) : (
              <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-slate-800">
                {datos.modelo.map(t => (
                  <li key={t} className="flex gap-3"><span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-emerald-600" />{t}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Argument and criticism side by side, split by a hairline (a 1 px gap over the rule colour). */}
          <div className={cn('grid gap-px border-t border-slate-200 bg-slate-200', postura && 'sm:grid-cols-2')}>
            {postura ? (
              <>
                <div className="bg-white p-5 sm:p-6">
                  <p className="text-sm font-semibold text-slate-900">Lo que defienden</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{postura.argumento}</p>
                </div>
                <div className="bg-slate-50 p-5 sm:p-6">
                  <p className="text-sm font-semibold text-slate-900">Lo que les critican</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{postura.critica}</p>
                </div>
              </>
            ) : (
              <div className="bg-slate-50 p-5 sm:p-6">
                <p className="text-sm font-semibold text-slate-900">Lo que se le puede criticar</p>
                <ul className="mt-1.5 space-y-1.5 text-[15px] leading-relaxed text-slate-700">
                  {datos.limites.map(t => (
                    <li key={t} className="flex gap-3"><span aria-hidden className="mt-[0.7em] h-px w-3 shrink-0 bg-slate-400" />{t}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-slate-600">Más abajo está explicado con detalle. Mueve el deslizador para compararlo con lo que proponen otros.</p>
              </div>
            )}
          </div>

          {postura && postura.fuentes.length > 0 && (
            <ul className="space-y-1 border-t border-slate-200 px-5 py-4 text-sm sm:px-7">
              {postura.fuentes.map(f => (
                <li key={f.url}>
                  <a href={f.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-start gap-1.5 rounded-sm text-slate-600 underline decoration-slate-300 underline-offset-2 transition-colors duration-150 hover:text-slate-900 hover:decoration-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 motion-reduce:transition-none">
                    <ExternalLink aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />{f.titulo}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* Step through the stops without the slider (handy on a phone). */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Boton onClick={() => setI(k => Math.max(0, k - 1))} disabled={i === 0} className="min-h-9 px-3 py-1.5 text-[13px]">
            <ChevronLeft aria-hidden className="h-4 w-4" />{i > 0 ? NOMBRE[PARADAS[i - 1]] : 'Izquierda'}
          </Boton>
          <Boton onClick={() => setI(k => Math.min(ULTIMA, k + 1))} disabled={i === ULTIMA} className="min-h-9 px-3 py-1.5 text-[13px]">
            {i < ULTIMA ? NOMBRE[PARADAS[i + 1]] : 'Derecha'}<ChevronRight aria-hidden className="h-4 w-4" />
          </Boton>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Un resumen de lo último publicado por los partidos y organizaciones de cada lado (la fecha va en cada ficha), revisado el {new Date(datos.revisado).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}. Cada partido tiene matices: las fuentes llevan a sus textos.
        </p>
      </div>
    </Apartado>
  );
}
