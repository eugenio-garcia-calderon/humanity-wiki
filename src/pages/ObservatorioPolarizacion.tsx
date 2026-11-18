import { useEffect, useRef, useState } from 'react';
// ============================================================================
// OBSERVATORIO DE POLARIZACIÓN (2026-11-11, Eugenio)
// ============================================================================
// «Publícalo en Luzhumanidad como Observatorio de Polarización». An interactive
// study of political polarization in Spain: a simulator (ideology × group
// dependence, with the CIS 3577 distribution), a hundred years of Spain as bell
// curves, five ideal types plus two cross-cutting currents, leaders, labels,
// perceptions, framing, identities, escalation, consequences, a self-test and
// method with references.
//
// It was built and reviewed (three rounds of a blind evaluator) as one
// self-contained HTML document, so it ships as a static file in
// `public/observatorio-polarizacion/index.html` and this page frames it. The
// project page of luzhumanidad.com whose `config.aplicacion` is
// 'observatorio-polarizacion' (SubpaginaSitio.tsx, migration 0194) shows it.
// The frame scrolls on its own so the document's sticky chapter bar keeps
// working; same origin, so no frame headers get in the way.
//
// THE SITE MENU ON TOP (2026-11-12, Eugenio: «pon el menú superior en el
// observatorio, para que aparezca el logo de Luz Humanidad y se pueda ir al
// inicio; y corrige la franja blanca inferior»). SubpaginaSitio puts the site
// bar above it (`CON_BARRA`). The frame used to be `100dvh - 64px` for a header
// that was not there, which left a 64 px white strip at the bottom. Now it
// measures where it starts (the bar is one row on a computer, two on a phone)
// and reaches exactly the bottom of the screen.
//
// RENAMED «POLÍTICA» (2026-11-15, Eugenio: «Así se debe llamar ahora en vez de
// observatorio de polarización política»), with two new chapters: 6 · Geometrías
// and 7 · Decidir por temas. Migration 0220 renames the project page; the address
// `/observatorio-de-polarizacion/espana` and this file's name stay, so no link breaks.
//
// GEOMETRÍAS AS THE LANDING (2026-11-18, Eugenio: «coloca la geometría política en
// una landing page que sea el inicio y dame la URL para poder compartirla»). The
// page moved to `/politica` (migration 0227), and on 2026-11-18 to
// `/geometria-politica` (migration 0228), where `/politica` answers with a 301.
// The site bar is no longer drawn over it (see CON_BARRA in SubpaginaSitio.tsx).
// The frame receives the parent's query and hash (`?tema=vivienda&foco=pp`,
// `#decidir`) so a shared link opens the same topic, and the document writes its
// state back into the parent's address bar (same origin), which is what people copy.
// DOS WEBS, UN DOCUMENTO (2026-11-18, Eugenio: «haz una web dedicada para la geometría…
// y poniendo el resto en Política como URL»). `vista` says which one this page is:
// «geometria» (`/geometria-politica`, only the geometries) or «politica» (`/politica`,
// the rest). The document reads `?vista=` itself; the page's config carries it.
export type VistaPolitica = 'politica' | 'geometria';
export default function ObservatorioPolarizacion({ vista = 'politica' }: { vista?: VistaPolitica }) {
  const marco = useRef<HTMLIFrameElement>(null);
  const [arriba, setArriba] = useState(0);
  // Read once: the frame's own replaceState keeps the parent's address in step afterwards
  const [src] = useState(() => {
    if (typeof window === 'undefined') return '/observatorio-polarizacion/index.html';
    const q = new URLSearchParams(window.location.search);
    if (vista === 'geometria') q.set('vista', 'geometria');
    const busqueda = q.toString();
    return '/observatorio-polarizacion/index.html' + (busqueda ? `?${busqueda}` : '') + window.location.hash;
  });
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
      data-app-observatorio
      src={src}
      title={vista === 'geometria' ? 'Geometría política' : 'Política'}
      className="block w-full border-0 bg-slate-950"
      style={{ height: `calc(100dvh - ${arriba}px)`, minHeight: 500 }}
    />
  );
}
