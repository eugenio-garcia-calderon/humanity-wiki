import React from 'react';
import { cn } from '../../utils/cn';

/**
 * A labelled range slider with its value and unit. First used by the
 * architecture editor (2026-11-05), where every measure of the world is a slider.
 */
export function Deslizador({ etiqueta, valor, min, max, paso, unidad, onChange, className, tono = 'oscuro' }: {
  etiqueta: string; valor: number; min: number; max: number; paso: number; unidad?: string;
  onChange: (v: number) => void; className?: string; tono?: 'claro' | 'oscuro';
}) {
  const dec = paso >= 1 ? 0 : paso >= 0.1 ? 1 : 2;
  return (
    <label className={cn('block', className)}>
      <span className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className={tono === 'oscuro' ? 'text-slate-300' : 'text-slate-600'}>{etiqueta}</span>
        <span className={cn('font-mono tabular-nums', tono === 'oscuro' ? 'text-emerald-300' : 'text-emerald-700')}>
          {valor.toFixed(dec).replace('.', ',')}{unidad ? ` ${unidad}` : ''}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={e => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-emerald-500 cursor-pointer"
      />
    </label>
  );
}
