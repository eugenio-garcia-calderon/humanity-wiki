// Small shared pieces of the «Modelo socioeconómico optimizado» page, built on
// the shared `Button` (src/components/ui/core.tsx) so the page has no bare
// <button>. `Button`'s variants are uppercase and emerald; the classes here
// override case and colour through `cn` (tailwind-merge).
import type { ReactNode } from 'react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import { FUENTE } from '../../data/modeloSocioeconomico';

type P = React.ButtonHTMLAttributes<HTMLButtonElement>;

/** A plain action button. `tono`: 'tinta' (filled, dark) or 'linea' (outlined). */
export function Boton({ className, tono = 'linea', type = 'button', ...p }: P & { tono?: 'tinta' | 'linea' }) {
  return (
    <Button
      type={type}
      variant={tono === 'tinta' ? 'primary' : 'outline'}
      className={cn(
        'gap-2 rounded-full px-4 py-2 text-sm font-semibold normal-case tracking-normal focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2',
        tono === 'tinta' ? 'bg-slate-900 text-white hover:bg-slate-700' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
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
        'rounded-full px-3 py-1.5 text-[13px] font-medium normal-case tracking-normal focus-visible:ring-2 focus-visible:ring-slate-900',
        activo ? 'bg-slate-900 text-white hover:bg-slate-900' : 'text-slate-700 hover:bg-slate-200/70',
        className,
      )}
      {...p}
    />
  );
}

/** A button whose look is entirely given by `className` (cells, rings, chips). */
export function Libre({ className, type = 'button', ...p }: P) {
  return <Button type={type} variant="ghost" className={cn('rounded-none p-0 font-normal normal-case tracking-normal hover:bg-transparent focus-visible:ring-2 focus-visible:ring-slate-900', className)} {...p} />;
}

/** A segmented control: a row of options in a pill. */
export function Segmentado<T extends string>({ valor, opciones, onChange, etiqueta, className }: {
  valor: T; opciones: { id: T; texto: ReactNode }[]; onChange: (v: T) => void; etiqueta: string; className?: string;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={cn('inline-flex flex-wrap gap-0.5 rounded-full bg-slate-200/70 p-0.5', className)}>
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
export function Fuente({ id, children }: { id: string; children?: ReactNode }) {
  const f = FUENTE[id];
  if (!f) return null;
  return (
    <a href={f.url} target="_blank" rel="noreferrer" title={f.titulo}
      className="ml-1 whitespace-nowrap align-baseline text-[0.78em] font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">
      {children ?? 'fuente'}
    </a>
  );
}

/** A labelled slider that shows its value already formatted. */
export function Regulador({ etiqueta, valor, min, max, paso, mostrar, onChange, ayuda }: {
  etiqueta: string; valor: number; min: number; max: number; paso: number; mostrar: string;
  onChange: (v: number) => void; ayuda?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700">{etiqueta}</span>
        <span className="tabular-nums font-semibold text-slate-900">{mostrar}</span>
      </span>
      <input
        type="range" min={min} max={max} step={paso} value={valor}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-2 w-full cursor-pointer accent-slate-900"
      />
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  );
}

/** A colour swatch of a scale. The colour is data (ESCALAS), not styling. */
export function Muestra({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn('inline-block h-3 w-3 shrink-0 rounded-full', className)} style={{ backgroundColor: color }} />;
}
