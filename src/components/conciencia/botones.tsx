// The two button looks of the consciousness page, built on the shared `Button`
// (src/components/ui/core.tsx) so the page has no bare <button>. The page is
// dark (night sky), and `Button`'s variants are for the light platform, so the
// classes here override colour and casing through `cn` (tailwind-merge).
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';

type P = React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Toolbar and panel button on a dark background. `activo` = pressed / chosen. */
export function BotonOscuro({ className, activo, type = 'button', ...p }: P & { activo?: boolean }) {
  return (
    <Button
      type={type}
      variant="ghost"
      className={cn('gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] normal-case tracking-normal text-slate-200 hover:bg-white/10 disabled:opacity-40',
        activo && 'bg-white/15 text-white ring-1 ring-white/25', className)}
      {...p}
    />
  );
}

/** A button that reads like an underlined link inside text. */
export function BotonTexto({ className, type = 'button', ...p }: P) {
  return (
    <Button
      type={type}
      variant="ghost"
      className={cn('inline p-0 text-left text-[length:inherit] font-normal normal-case tracking-normal text-inherit underline decoration-current/30 underline-offset-2 hover:bg-transparent hover:decoration-current',
        className)}
      {...p}
    />
  );
}

/** A square or round button whose look is fully given by `className` (colour swatches, icon grid, menu rows). */
export function BotonLibre({ className, type = 'button', ...p }: P) {
  return <Button type={type} variant="ghost" className={cn('p-0 normal-case tracking-normal', className)} {...p} />;
}
