import CabeceraSitio from '../components/sitio/CabeceraSitio';

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
// inicio; y corrige la franja blanca inferior»). The frame used to measure
// `100dvh - 64px` for a header that was not there, which left a 64 px white
// strip. Now the page is one screen high: the site header (whatever height it
// takes, two rows on a phone) and the frame filling the rest.
export default function ObservatorioPolarizacion({ raizId }: { raizId?: string } = {}) {
  return (
    <div data-app-observatorio className="flex flex-col bg-slate-950" style={{ height: '100dvh', minHeight: 600 }}>
      {raizId && (
        <div className="shrink-0 bg-white [&_[data-cabecera-sitio]]:!my-0">
          <CabeceraSitio raizId={raizId} />
        </div>
      )}
      <iframe
        src="/observatorio-polarizacion/index.html"
        title="Observatorio de Polarización"
        className="block min-h-0 w-full flex-1 border-0 bg-slate-950"
      />
    </div>
  );
}
