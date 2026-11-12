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
export default function ObservatorioPolarizacion() {
  const marco = useRef<HTMLIFrameElement>(null);
  const [arriba, setArriba] = useState(0);
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
      src="/observatorio-polarizacion/index.html"
      title="Observatorio de Polarización"
      className="block w-full border-0 bg-slate-950"
      style={{ height: `calc(100dvh - ${arriba}px)`, minHeight: 500 }}
    />
  );
}
