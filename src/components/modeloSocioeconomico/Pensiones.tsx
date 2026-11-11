// Spain's contributory pensions in five tiers (Eugenio, 2026-11-11): how many
// there are, the figure that defines each tier (the cap, an average, the legal
// minimum) and what share of the monthly payroll each one takes. Data and the
// way the tiers are estimated: src/data/presupuestos.ts.
import {
  TRAMOS_PENSION, NOMINA_PENSIONES_MES, TOTAL_PENSIONES_CONTRIBUTIVAS, PERSONAS_PENSIONISTAS,
  CON_COMPLEMENTO_MINIMOS, PENSION_NO_CONTRIBUTIVA, costeMes, importe,
} from '../../data/presupuestos';
import { ESCALA, euros, numero, porcentaje } from '../../data/modeloSocioeconomico';
import { Fuente } from './piezas';

// One hue, dark → light: the tiers are an order of magnitude, not identities.
const TONO: Record<string, string> = {
  maxima: 'bg-sky-900', superior: 'bg-sky-700', media: 'bg-sky-500', inferior: 'bg-sky-300', minima: 'bg-sky-200',
};

export function Pensiones() {
  const habitantes = ESCALA.nacion.habitantesEjemplo ?? 49_128_297;
  return (
    <div className="space-y-8">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <dt className="text-sm text-slate-500">Pensiones contributivas, julio de 2026</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{numero(TOTAL_PENSIONES_CONTRIBUTIVAS)}</dd>
          <dd className="mt-1 text-sm text-slate-600">las cobran cerca de {numero(PERSONAS_PENSIONISTAS / 1e6, 1)} millones de personas<Fuente id="pensiones-mayo" /></dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <dt className="text-sm text-slate-500">Pensionistas sobre la población</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{porcentaje(PERSONAS_PENSIONISTAS / habitantes * 100, 0)}</dd>
          <dd className="mt-1 text-sm text-slate-600">casi 1 de cada 5 habitantes de España</dd>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <dt className="text-sm text-slate-500">Nómina de un mes</dt>
          <dd className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{importe(NOMINA_PENSIONES_MES)}</dd>
          <dd className="mt-1 text-sm text-slate-600">se paga 14 veces al año: ≈ {importe(NOMINA_PENSIONES_MES * 14)}<Fuente id="pensiones-2026" /></dd>
        </div>
      </dl>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)] divide-y divide-slate-100">
          {TRAMOS_PENSION.map(t => {
            const pctPensiones = t.pensiones / TOTAL_PENSIONES_CONTRIBUTIVAS * 100;
            const pctDinero = costeMes(t) / NOMINA_PENSIONES_MES * 100;
            return (
              <section key={t.id} aria-labelledby={`pension-${t.id}`} className="grid gap-4 p-5 md:grid-cols-[14rem_10rem_minmax(0,1fr)] md:items-center md:gap-6">
                <div>
                  <h3 id={`pension-${t.id}`} className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <span aria-hidden className={`h-3 w-3 shrink-0 rounded-full ${TONO[t.id]}`} />{t.nombre}
                  </h3>
                  <p className="text-sm text-slate-500">{t.rango}</p>
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">{euros(t.cifra, t.id === 'maxima' || t.id === 'minima' ? 2 : 0)}</p>
                  <p className="text-xs text-slate-500">{t.cifraEtiqueta} al mes<Fuente id={t.fuente} /></p>
                </div>
                <div className="space-y-2 text-sm">
                  <Barra etiqueta="De las pensiones" pct={pctPensiones} tono={TONO[t.id]}
                    texto={`${numero(t.pensiones)} pensiones${t.estimado ? ' (estimación)' : ''}`} />
                  <Barra etiqueta="Del dinero" pct={pctDinero} tono={TONO[t.id]}
                    texto={`${importe(costeMes(t))} al mes, ${importe(costeMes(t) * 14)} al año`} />
                  <p className="text-xs leading-relaxed text-slate-500">{t.nota}</p>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <p className="rounded-2xl bg-slate-100 p-5 text-[15px] leading-relaxed text-slate-700">
          <strong className="text-slate-900">Cuentan pensiones, no personas.</strong> Una de cada diez personas cobra dos, casi siempre jubilación y viudedad.
          {' '}{numero(CON_COMPLEMENTO_MINIMOS)} pensionistas reciben además un <em>complemento a mínimos</em>: la Seguridad Social les sube la pensión hasta el mínimo legal porque con lo cotizado no llegaban<Fuente id="pensiones-minimos" />.
        </p>
        <p className="rounded-2xl bg-slate-100 p-5 text-[15px] leading-relaxed text-slate-700">
          <strong className="text-slate-900">Qué queda fuera.</strong> Las pensiones de los funcionarios del Estado (Clases Pasivas) y las no contributivas, para quien no cotizó lo suficiente: {euros(PENSION_NO_CONTRIBUTIVA, 2)} al mes en 2026<Fuente id="pensiones-limites" />.
          {' '}Los tramos del medio son una estimación: el reparto de 2025 aplicado a las pensiones de 2026, cuadrado con la nómina real. Las de arriba, contadas con datos de julio de 2026<Fuente id="pensiones-cuantias" />.
        </p>
      </div>
    </div>
  );
}

function Barra({ etiqueta, pct, tono, texto }: { etiqueta: string; pct: number; tono: string; texto: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3">
      <span className="text-slate-500">{etiqueta}</span>
      <div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 flex-1 rounded-full bg-slate-100" aria-hidden>
            <div className={`h-2.5 rounded-full ${tono}`} style={{ width: `${Math.max(pct, 0.5)}%` }} />
          </div>
          <span className="w-14 text-right font-semibold tabular-nums text-slate-900">{porcentaje(pct)}</span>
        </div>
        <span className="text-xs tabular-nums text-slate-600">{texto}</span>
      </div>
    </div>
  );
}
