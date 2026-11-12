import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

// ============================================================================
// AN APPLICATION AS PART OF A SITE PAGE (2026-11-12, Eugenio)
// ============================================================================
// First version (morning): the app in a screen-tall box with its own scroll.
// Eugenio, two hours later: «está muy mal embebido: cuando haces scroll fuera
// del recuadro te enseña pantalla en blanco casi infinita. Siempre tiene que
// hacerse scroll en la página embebida. Si pinchas en pantalla completa
// desaparece el menú superior de Luz & Humanidad, y luego puedes volver. Que en
// ningún lado sea un embed cutre: tiene que estar bien integrada.»
//
// So there is no box any more. The app is the page: it flows under the site's
// bar and scrolls with the window, so every scroll moves the app and there is
// nothing below it to scroll into. (The blank came from the box: `overflow:
// hidden` does not clip absolutely positioned descendants whose containing
// block is outside it, so they stretched the document below the box.)
//
// What the app needs to know, given through context:
//   · `altoBarra`: the height of the site bar, so its own sticky header sits
//     right under it instead of behind it (also the CSS variable
//     `--alto-barra-sitio`: the app adds its own header to it for
//     `scroll-margin-top`, since only it knows how tall that is);
//   · `completa` / `alternar`: full screen. It hides the site bar and, where the
//     browser allows, puts the whole document in full screen. The button lives
//     in the app's own header, next to its other actions.
// Esc, or the same button, brings the bar back.

type Integracion = { altoBarra: number; completa: boolean; alternar: () => void };
const Ctx = createContext<Integracion | null>(null);
/** Null outside a site page: the app is then on its own and needs none of this. */
export const useIntegracion = () => useContext(Ctx);

const CLASE = 'app-pantalla-completa';

export default function AplicacionIncrustada({ children }: { children: ReactNode }) {
  const [altoBarra, setAltoBarra] = useState(0);
  const [completa, setCompleta] = useState(false);

  // The bar's height: one row on a computer, two on a phone, none in full screen.
  useLayoutEffect(() => {
    const barra = document.querySelector<HTMLElement>('[data-cabecera-sitio]');
    if (!barra) return;
    const medir = () => setAltoBarra(completa ? 0 : Math.round(barra.getBoundingClientRect().height));
    medir();
    const o = new ResizeObserver(medir); o.observe(barra);
    return () => o.disconnect();
  }, [completa]);

  // Full screen: a class on <html> hides the bar and the spacer above it.
  // Leaving the browser's full screen (Esc) also brings the bar back.
  useEffect(() => {
    document.documentElement.classList.toggle(CLASE, completa);
    const alSalir = () => { if (!document.fullscreenElement) setCompleta(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.fullscreenElement) setCompleta(false); };
    document.addEventListener('fullscreenchange', alSalir);
    if (completa) window.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('fullscreenchange', alSalir); window.removeEventListener('keydown', tecla); };
  }, [completa]);
  useEffect(() => () => document.documentElement.classList.remove(CLASE), []);

  const alternar = async () => {
    if (!completa) {
      setCompleta(true);
      // Where the browser allows it (not the iPhone), its own bars go too.
      if (document.fullscreenEnabled && !document.fullscreenElement) {
        try { await document.documentElement.requestFullscreen(); } catch { /* the site bar is hidden anyway */ }
      }
    } else {
      setCompleta(false);
      if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* already out */ } }
    }
  };

  return (
    <Ctx.Provider value={{ altoBarra, completa, alternar }}>
      <style>{`
        html.${CLASE} [data-cabecera-sitio], html.${CLASE} [data-espacio-barra] { display: none !important; }
      `}</style>
      <div data-aplicacion-incrustada style={{ ['--alto-barra-sitio' as string]: `${altoBarra}px` }}>
        {children}
      </div>
    </Ctx.Provider>
  );
}
