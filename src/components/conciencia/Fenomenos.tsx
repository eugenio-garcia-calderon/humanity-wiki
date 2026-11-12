// The «Fenómenos» tab: the experiences that suggest perception beyond the
// traditional senses, each with what research has found so far. Content in
// src/data/concienciaFenomenos.ts.
import { useState } from 'react';
import { Activity, CloudMoon, EyeOff, Flower2, Headphones, Moon, Radar, ScanEye, Sun, type LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { FENOMENOS, INTRO_FENOMENOS, type IconoFenomeno } from '../../data/concienciaFenomenos';
import type { Canal } from '../../data/concienciaMapa';
import { BotonOscuro } from './botones';

const ICONOS: Record<IconoFenomeno, LucideIcon> = {
  mirada: ScanEye, extraocular: EyeOff, remota: Radar, suenos: CloudMoon, ganzfeld: Headphones, cerebros: Activity,
};

/** The three ways of feeling, with the colours and symbols of the picture. */
const FORMAS: Record<Canal, { nombre: string; Icono: LucideIcon; texto: string; anillo: string; brillo: string; insignia: string }> = {
  vigilia: { nombre: 'Despiertos', Icono: Sun, texto: 'text-amber-200', anillo: 'border-amber-300/40', brillo: 'from-amber-400/25', insignia: 'bg-amber-300/10 text-amber-100 ring-amber-300/30' },
  meditacion: { nombre: 'Meditando', Icono: Flower2, texto: 'text-violet-200', anillo: 'border-violet-300/40', brillo: 'from-violet-400/25', insignia: 'bg-violet-300/10 text-violet-100 ring-violet-300/30' },
  onirico: { nombre: 'Dormidos', Icono: Moon, texto: 'text-indigo-200', anillo: 'border-indigo-300/40', brillo: 'from-indigo-400/25', insignia: 'bg-indigo-300/10 text-indigo-100 ring-indigo-300/30' },
};
const ORDEN: Canal[] = ['vigilia', 'meditacion', 'onirico'];

export function Fenomenos() {
  const [filtro, setFiltro] = useState<Canal | null>(null);
  const lista = FENOMENOS.filter(f => !filtro || f.forma === filtro);
  return (
    <section aria-labelledby="fenomenos-titulo" className="mx-auto max-w-[1400px] px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="fenomenos-titulo" className="text-2xl text-white sm:text-3xl" style={{ fontFamily: '"Cinzel", Georgia, serif' }}>
          {INTRO_FENOMENOS.titulo}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-200">{INTRO_FENOMENOS.postura}</p>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">{INTRO_FENOMENOS.honestidad}</p>
      </div>

      {/* Filter by the way of feeling it shows up in */}
      <div role="group" aria-label="Filtrar por forma de sentir" className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <BotonOscuro activo={!filtro} onClick={() => setFiltro(null)} className="rounded-full px-3.5 py-2 text-xs">Todos</BotonOscuro>
        {ORDEN.map(c => {
          const F = FORMAS[c];
          return (
            <BotonOscuro key={c} activo={filtro === c} onClick={() => setFiltro(filtro === c ? null : c)} className="rounded-full px-3.5 py-2 text-xs" aria-pressed={filtro === c}>
              <F.Icono className={cn('h-4 w-4', F.texto)} aria-hidden /> {F.nombre}
            </BotonOscuro>
          );
        })}
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {lista.map(f => {
          const F = FORMAS[f.forma];
          const I = ICONOS[f.icono];
          return (
            <article key={f.id} id={`fenomeno-${f.id}`} className={cn('relative flex flex-col overflow-hidden rounded-3xl border bg-slate-900/70 p-5 sm:p-6', F.anillo)}>
              {/* A soft glow in the colour of its way of feeling */}
              <div aria-hidden className={cn('pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br to-transparent blur-2xl', F.brillo)} />
              <div className="relative flex items-start gap-4">
                <span className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-full border bg-slate-950/60 shadow-[0_0_30px_-6px] shadow-current', F.anillo, F.texto)}>
                  <I className="h-7 w-7" aria-hidden />
                </span>
                <div className="min-w-0">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ring-1', F.insignia)}>
                    <F.Icono className="h-3 w-3" aria-hidden /> {F.nombre}
                  </span>
                  <h3 className="mt-1.5 text-lg font-semibold leading-snug text-white">{f.titulo}</h3>
                  <p className={cn('text-sm italic', F.texto)}>{f.lema}</p>
                </div>
              </div>
              <div className="relative mt-4 space-y-3 text-[14.5px] leading-relaxed text-slate-200">
                {f.texto.map((t, i) => <p key={i}>{t}</p>)}
              </div>
              <div className="relative mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Qué dice la ciencia hoy</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{f.ciencia}</p>
              </div>
              <details className="relative mt-auto pt-4 text-sm text-slate-400">
                <summary className="cursor-pointer select-none text-slate-300 hover:text-white">Fuentes ({f.fuentes.length})</summary>
                <ul className="mt-2 space-y-1.5">
                  {f.fuentes.map((s, i) => (
                    <li key={i} className="leading-snug">
                      {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline decoration-white/30 underline-offset-2 hover:text-white hover:decoration-white">{s.texto}</a> : s.texto}
                    </li>
                  ))}
                </ul>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
