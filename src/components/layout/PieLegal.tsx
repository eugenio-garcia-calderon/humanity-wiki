import { Link } from 'react-router-dom';

// ============================================================================
// EL PIE: UNA FRANJA MUY FINA EN TODAS LAS PÁGINAS (2026-10-05)
// ============================================================================
// Eugenio: «los avisos legales en el footer, que sea un footer que esté en
// todas las páginas, una barrita muy pequeñita; y también la de Sobre
// Humanity Wiki». It replaces the brand dropdown that held these pages.
//
// Fixed, 24 px, between the two side menus (it reads the same widths the
// floating buttons use), so it is on every page including the full-bleed
// ones — a footer at the end of the content would never show on the map.

export const ALTO_PIE = 24;

export default function PieLegal() {
  const enlace = 'hover:text-slate-700 hover:underline';
  return (
    <footer
      style={{ left: 'var(--hueco-paginas, 0px)', right: 'var(--hueco-temas, 0px)', height: ALTO_PIE, paddingBottom: 'env(safe-area-inset-bottom)' }}
      className="fixed bottom-0 z-[9980] flex items-center justify-center gap-2 border-t border-slate-100 bg-white/90 text-[10.5px] text-slate-500 backdrop-blur-sm"
    >
      <Link to="/sobre-red-humana" className={enlace}>Sobre Humanity.Wiki</Link>
      <span aria-hidden>·</span>
      <Link to="/avisos-legales" className={enlace}>Avisos legales</Link>
      <span aria-hidden>·</span>
      <Link to="/privacidad" className={enlace}>Privacidad</Link>
    </footer>
  );
}
