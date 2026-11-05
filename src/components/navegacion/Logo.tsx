import { cn } from '../../utils/cn';

// ============================================================================
// EL LOGO: «Humanity.Wiki», Y SÓLO LLEVA AL INICIO (2026-10-05)
// ============================================================================
// Eugenio: «el logotipo como hace YouTube: a la izquierda, y cuando se
// despliega el menú izquierdo se mantiene más o menos en su sitio. El logo
// sólo sirve como botón de inicio, sin desplegable. Humanity con H mayúscula
// y Wiki con W mayúscula».
//
// One component, drawn in two places that occupy the SAME spot on screen: the
// top bar's left edge when the left menu is folded (or there is none), and the
// left menu's top row when it is open. Same padding in both, so opening the
// menu does not make the logo jump.

export default function Logo({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      title="Humanity.Wiki — ir al inicio"
      aria-label="Humanity.Wiki — ir al inicio"
      className={cn('flex h-8 shrink-0 items-center rounded-lg px-2 text-slate-900 transition-colors hover:bg-slate-100', className)}
    >
      <span className="whitespace-nowrap text-[16px] font-black tracking-tight">
        Humanity<span className="text-emerald-600">.Wiki</span>
      </span>
    </button>
  );
}
