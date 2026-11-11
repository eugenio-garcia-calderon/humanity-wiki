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
export default function ObservatorioPolarizacion() {
  return (
    <iframe
      src="/observatorio-polarizacion/index.html"
      title="Observatorio de Polarización"
      className="block w-full border-0 bg-slate-950"
      style={{ height: 'calc(100dvh - 64px)', minHeight: 600 }}
    />
  );
}
