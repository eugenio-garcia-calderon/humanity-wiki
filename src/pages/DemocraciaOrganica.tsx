import { useEffect, useRef, useState } from 'react';

// ============================================================================
// DEMOCRACIA ORGÁNICA MODERNA (2026-11-28, Eugenio)
// ============================================================================
// «Quiero que hagas un ejercicio de crear un modelo de democracia orgánica moderna… con separación de
// poderes, sufragio universal, pero también representación de organismos comunitarios, de gremios… y
// una comparación con el sistema actual de España… como un proyecto dentro de Luz & Humanidad, en el
// área de política, y en /politica este sexto bloque.»
//
// Like the observatory, the study was written and reviewed as one self-contained HTML document with
// hand-drawn SVG diagrams (`public/democracia-organica-moderna/index.html`), so it ships as a static file
// and this page frames it. The page of luzhumanidad.com whose `config.aplicacion` is
// 'democracia-organica' (SubpaginaSitio.tsx, migration 0251) shows it at `/democracia-organica`.
// The frame gets the parent's hash (`#espana`, `#modelo`…) so a shared link opens the same section.
// Same origin: the frame scrolls on its own and reaches exactly the bottom of the screen.
// The version in the query is the cache key: a browser or proxy that kept the old study (v1, with
// sortition) would otherwise keep serving it. Bump it whenever the study changes in substance.
const DOC = '/democracia-organica-moderna/index.html?v=2';

export default function DemocraciaOrganica() {
  const marco = useRef<HTMLIFrameElement>(null);
  const [arriba, setArriba] = useState(0);
  const [src] = useState(() => (typeof window === 'undefined' ? DOC : DOC + window.location.hash));
  useEffect(() => {
    const medir = () => { const r = marco.current?.getBoundingClientRect(); if (r) setArriba(Math.max(0, Math.round(r.top + window.scrollY))); };
    medir();
    const o = new ResizeObserver(medir); o.observe(document.body);
    window.addEventListener('resize', medir);
    return () => { o.disconnect(); window.removeEventListener('resize', medir); };
  }, []);
  return (
    <iframe
      ref={marco}
      data-app-democracia-organica
      src={src}
      title="Democracia orgánica moderna"
      className="block w-full border-0 bg-white"
      style={{ height: `calc(100dvh - ${arriba}px)`, minHeight: 500 }}
    />
  );
}
