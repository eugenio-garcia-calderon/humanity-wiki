// Small shared pieces of the «Modelo socioeconómico optimizado» page, built on
// the shared `Button` (src/components/ui/core.tsx) so the page has no bare
// <button>. `Button`'s variants are uppercase and emerald; the classes here
// override case and colour through `cn` (tailwind-merge).
import type { CSSProperties, ReactNode } from 'react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { FUENTE } from '../../data/modeloSocioeconomico';

type P = React.ButtonHTMLAttributes<HTMLButtonElement>;

/*
 * Design idea (2026-11-13, after the polarisation observatory): every control
 * is a measuring instrument. One ink (slate-900) on paper, a thin calibrated
 * track, a thumb ringed in the surface colour, and the reading always visible
 * in a chip. Hover answers with a change of ink, never with movement; motion is
 * short (150-200 ms) and switched off under prefers-reduced-motion.
 */
const FOCO = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900';

/** A plain action button. `tono`: 'tinta' (filled, dark) or 'linea' (outlined). */
export function Boton({ className, tono = 'linea', type = 'button', ...p }: P & { tono?: 'tinta' | 'linea' }) {
  return (
    <Button
      type={type}
      variant={tono === 'tinta' ? 'primary' : 'outline'}
      className={cn(
        'min-h-10 gap-2 rounded-full px-4 py-2 text-sm font-semibold normal-case tracking-normal transition-colors duration-150 motion-reduce:transition-none',
        FOCO,
        tono === 'tinta'
          ? 'bg-slate-900 text-white hover:bg-slate-700 active:bg-slate-800'
          : 'border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:text-slate-900 active:bg-slate-100',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...p}
    />
  );
}

/** One option of a segmented control. */
export function Opcion({ activo, className, type = 'button', ...p }: P & { activo: boolean }) {
  return (
    <Button
      type={type}
      variant="ghost"
      aria-pressed={activo}
      className={cn(
        'min-h-9 rounded-full px-3.5 py-1.5 text-[13px] font-medium normal-case tracking-normal transition-colors duration-150 motion-reduce:transition-none',
        FOCO,
        activo ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20 hover:bg-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        className,
      )}
      {...p}
    />
  );
}

/** A button whose look is entirely given by `className` (cells, rings, chips). */
export function Libre({ className, type = 'button', ...p }: P) {
  return <Button type={type} variant="ghost" className={cn('rounded-none p-0 font-normal normal-case tracking-normal hover:bg-transparent', FOCO, className)} {...p} />;
}

/** A segmented control: a row of options on a white rail. */
export function Segmentado<T extends string>({ valor, opciones, onChange, etiqueta, className }: {
  valor: T; opciones: { id: T; texto: ReactNode }[]; onChange: (v: T) => void; etiqueta: string; className?: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={cn('inline-flex max-w-full flex-wrap gap-0.5 rounded-[1.25rem] border border-slate-200 bg-white p-1 shadow-sm shadow-slate-900/5', className)}>
      {opciones.map(o => <Opcion key={o.id} activo={valor === o.id} onClick={() => onChange(o.id)}>{o.texto}</Opcion>)}
    </div>
  );
}

/** The heading of a section: a title and the one idea it holds. */
export function Encabezado({ id, titulo, children, className }: { id: string; titulo: string; children?: ReactNode; className?: string }) {
  return (
    <header className={cn('mb-8 max-w-3xl', className)}>
      <h2 id={`${id}-titulo`} className="text-[2rem] font-[750] leading-[1.1] tracking-[-0.02em] text-slate-900 sm:text-[2.6rem]">{titulo}</h2>
      {children && <div className="mt-3 text-[17px] leading-relaxed text-slate-600">{children}</div>}
    </header>
  );
}

/** A small link to a source, after a figure. */
export function Fuente({ id, url, titulo, children }: { id?: string; url?: string; titulo?: string; children?: ReactNode }) {
  const f = url ? { url, titulo: titulo ?? url } : id ? FUENTE[id] : undefined;
  if (!f) return null;
  return (
    <a href={f.url} target="_blank" rel="noreferrer" title={f.titulo}
      className="ml-1 whitespace-nowrap rounded-sm align-baseline text-[0.78em] font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 transition-colors duration-150 hover:text-slate-900 hover:decoration-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 motion-reduce:transition-none">
      {children ?? 'fuente'}
    </a>
  );
}

/**
 * A labelled slider that shows its value already formatted. The track fills in
 * ink up to the value (WebKit through a gradient at `--p`, Firefox through
 * `::-moz-range-progress`), so the reading is visible on the bar itself.
 */
export function Regulador({ etiqueta, valor, min, max, paso, mostrar, onChange, ayuda }: {
  etiqueta: string; valor: number; min: number; max: number; paso: number; mostrar: string;
  onChange: (v: number) => void; ayuda?: string;
}) {
  const p = max > min ? Math.min(100, Math.max(0, ((valor - min) / (max - min)) * 100)) : 0;
  return (
    <label className="group block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium leading-snug text-slate-700">{etiqueta}</span>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 font-semibold tabular-nums text-slate-900 ring-1 ring-inset ring-slate-200 transition-colors duration-150 group-hover:bg-slate-900 group-hover:text-white group-hover:ring-slate-900 motion-reduce:transition-none">{mostrar}</span>
      </span>
      <input
        type="range" min={min} max={max} step={paso} value={valor}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--p': `${p}%` } as CSSProperties}
        className={cn(
          'mt-2.5 h-7 w-full cursor-pointer appearance-none rounded-full bg-transparent',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
          '[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full',
          '[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--color-slate-900)_var(--p),var(--color-slate-200)_var(--p))]',
          '[&::-webkit-slider-thumb]:-mt-[9px] [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:box-border [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:border-[5px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-slate-900',
          '[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--color-slate-300),0_2px_6px_-1px_color-mix(in_oklab,var(--color-slate-900)_25%,transparent)]',
          '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150 hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-110 motion-reduce:[&::-webkit-slider-thumb]:transition-none',
          '[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-slate-200',
          '[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-slate-900',
          '[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[5px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-slate-900',
          '[&::-moz-range-thumb]:shadow-[0_0_0_1px_var(--color-slate-300),0_2px_6px_-1px_color-mix(in_oklab,var(--color-slate-900)_25%,transparent)]',
        )}
      />
      {ayuda && <span className="mt-1 block text-xs leading-relaxed text-slate-500">{ayuda}</span>}
    </label>
  );
}

/** A colour swatch of a scale. The colour is data (ESCALAS), not styling. */
export function Muestra({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-3 w-3 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />;
}
