// The «Deuda» window (Eugenio, 2026-11-12): the debt of Spain and of the
// regions, split into what is paid as capital and as interest; a little history
// and how the debt has been abused; today's model against the proposal, where
// no administration can borrow, projects with a return are financed outside the
// public system, and every scale runs a surplus into a contingency box that
// never goes below zero. Data: src/data/deuda.ts.
import { useState } from 'react';
import { ESCALAS, ESPANA, FUENTE, RESERVA_MIN_LIBRE, TERCIOS, euros, numero, porcentaje } from '../../data/modeloSocioeconomico';
import { ABUSOS, COMPARA, DEUDA, DEUDORES, DEUDA_PCT, HISTORIA_PCT, PAGOS, PANDEMIA, TIPO_MEDIO, amortizar, caja } from '../../data/deuda';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Regulador } from './piezas';
import { cn } from '../../utils/cn';

const mill = (m: number) => `${numero(m)} M€`;
const billones = (m: number) => `${numero(m / 1e6, 2)} billones`;

export function DeudaVentana() {
  const anual = PAGOS.intereses + PAGOS.vencimientosEstado;
  const minima = caja();
  return (
    <>
      <Apartado id="deuda" titulo="Una deuda que no se devuelve nunca"
        entradilla={<>Las administraciones de España deben {billones(DEUDA.total)} de euros, más de lo que produce el país en un año. Cada año se pagan los intereses y lo que vence se devuelve pidiendo prestado otra vez. La propuesta: que ninguna administración pueda deber, y que cada una ahorre para las emergencias.</>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra valor={porcentaje(DEUDA_PCT.total, 1)} texto={<>del PIB debían las administraciones a finales de 2025: {billones(DEUDA.total)}<Fuente id="deuda-2025" /></>} tono="mal" />
          <Cifra valor={mill(PAGOS.intereses)} texto={<>de intereses en 2025, casi tres veces lo que se gasta en defensa<Fuente id="intereses-2025" /></>} tono="mal" />
          <Cifra valor={mill(PAGOS.vencimientosEstado)} texto={<>de capital vence en 2026 solo en el Estado, y se paga pidiendo {mill(PAGOS.emisionBrutaEstado)}<Fuente id="tesoro-2026" /></>} tono="mal" />
          <Cifra valor={`${mill(Math.round(minima.total / 100) * 100)}`} texto={<>al año ahorraría como mínimo la propuesta en cajas para emergencias, con cero deuda</>} tono="bien" />
        </div>

        <figure className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <figcaption className="text-lg font-bold text-slate-900">Lo que se paga de deuda en un año</figcaption>
          <p className="mt-1 text-sm text-slate-600">Intereses de todas las administraciones (2025) y capital que vence del Estado (2026).</p>
          <div className="mt-4 flex h-9 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img"
            aria-label={`Intereses ${mill(PAGOS.intereses)}; capital ${mill(PAGOS.vencimientosEstado)}, pagado con deuda nueva`}>
            <div className="h-full bg-rose-700" style={{ width: `${(PAGOS.intereses / anual) * 100}%` }} title={`Intereses: ${mill(PAGOS.intereses)}`} />
            <div className="h-full bg-slate-300" style={{ width: `${(PAGOS.vencimientosEstado / anual) * 100}%` }} title={`Capital: ${mill(PAGOS.vencimientosEstado)}`} />
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex gap-2"><span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-rose-700" />
              <div><dt className="font-semibold text-slate-900">Intereses: {mill(PAGOS.intereses)}</dt><dd className="text-slate-600">Se pagan de verdad, con impuestos. Es dinero que no vuelve.</dd></div></div>
            <div className="flex gap-2"><span aria-hidden className="mt-1 h-3 w-3 shrink-0 rounded-sm bg-slate-300" />
              <div><dt className="font-semibold text-slate-900">Capital: {mill(PAGOS.vencimientosEstado)}</dt><dd className="text-slate-600">Se devuelve con deuda nueva, así que la deuda no baja: en 2026 el Estado deberá {mill(PAGOS.emisionNetaEstado)} más.</dd></div></div>
          </dl>
        </figure>
      </Apartado>

      <Apartado id="deuda-quien" titulo="Quién debe, y cuánto se paga" fondo="blanco"
        entradilla={<>Casi cuatro quintas partes las debe el Estado; una quinta parte, las comunidades autónomas. Por persona, {euros((DEUDA.total * 1e6) / ESPANA.poblacion)} de deuda y {euros((PAGOS.intereses * 1e6) / ESPANA.poblacion)} de intereses al año.</>}>
        <div className="space-y-4">
          {DEUDORES.map(d => (
            <div key={d.id} className="grid gap-x-5 gap-y-1 sm:grid-cols-[240px_1fr]">
              <div>
                <p className="font-semibold text-slate-900">{d.nombre}</p>
                <p className="text-sm text-slate-500">{d.quien}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-4 shrink-0 rounded-r-[4px] bg-rose-700" style={{ width: `${Math.max(0.6, (d.pct / DEUDA_PCT.total) * 55)}%` }} title={`${d.nombre}: ${mill(d.deuda)}`} />
                <span className="min-w-0 text-sm tabular-nums text-slate-700">{d.id === 'ccaa' ? '' : '≈ '}{mill(Math.round(d.deuda / 100) * 100)} · {porcentaje(d.pct, 1)} del PIB<Fuente id={d.fuente} /></span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Datos del Banco de España a finales de 2025. Las partes no suman exactamente el total porque las administraciones también se deben entre ellas. Las cantidades con ≈ salen del porcentaje del PIB.</p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[640px] text-[15px]">
            <caption className="px-5 pt-5 text-left text-lg font-bold text-slate-900">Capital e intereses</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th scope="col" className="px-5 py-2 font-medium" />
                <th scope="col" className="px-4 py-2 font-medium">Intereses</th>
                <th scope="col" className="px-4 py-2 font-medium">Capital</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-slate-100">
                <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-900">Todas las administraciones</th>
                <td className="px-4 py-3 text-slate-700"><strong className="tabular-nums">{mill(PAGOS.intereses)}</strong> en 2025, un {porcentaje(TIPO_MEDIO * 100, 1)} de media sobre lo que se debe<Fuente id="intereses-2025" /></td>
                <td className="px-4 py-3 text-slate-700">La deuda total no baja: lo que se devuelve se vuelve a pedir.</td>
              </tr>
              <tr className="border-b border-slate-100">
                <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-900">Estado</th>
                <td className="px-4 py-3 text-slate-700">La mayor parte de los intereses.</td>
                <td className="px-4 py-3 text-slate-700">En 2026 vencen <strong className="tabular-nums">{mill(PAGOS.vencimientosEstado)}</strong>. Para pagarlos y cubrir el déficit pide <strong className="tabular-nums">{mill(PAGOS.emisionBrutaEstado)}</strong>: debe {mill(PAGOS.emisionNetaEstado)} más que antes<Fuente id="tesoro-2026" /></td>
              </tr>
              <tr>
                <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-900">Comunidades autónomas</th>
                <td className="px-4 py-3 text-slate-700"><strong className="tabular-nums">{mill(PAGOS.interesesCCAA2022)}</strong> en 2022, camino de <strong className="tabular-nums">{mill(PAGOS.interesesCCAA2028)}</strong> en 2028 si renuevan todo lo que vence<Fuente id="intereses-ccaa" /></td>
                <td className="px-4 py-3 text-slate-700">Muchas devuelven al Estado con nuevos préstamos del propio Estado: en 2023 le debían <strong className="tabular-nums">{mill(PAGOS.debenAlEstado2023)}</strong><Fuente id="fla-deuda" />. Ahora el Estado asume {mill(PAGOS.condonacion)} de esa deuda<Fuente id="condonacion" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Apartado>

      <Apartado id="deuda-historia" titulo="Cómo se llegó hasta aquí"
        entradilla="En 2007 las cuentas tenían superávit y la deuda era un tercio del PIB. Dos crisis después, es más que todo el PIB, y no ha vuelto a bajar de ahí.">
        <HistoriaGrafica />
        <h3 className="mt-10 text-xl font-bold text-slate-900">Seis formas en que se ha abusado de la deuda</h3>
        <ol className="mt-4 grid gap-4 md:grid-cols-2">
          {ABUSOS.map(a => (
            <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-bold text-slate-900">{a.t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{a.d}{a.fuentes.map(f => <Fuente key={f} id={f} />)}</p>
              <p className="mt-3 border-t border-slate-100 pt-3 text-[15px] leading-relaxed text-emerald-800"><span className="font-semibold">Con la propuesta: </span>{a.remedio}</p>
            </li>
          ))}
        </ol>
      </Apartado>

      <Apartado id="deuda-propuesta" titulo="Hoy y con la propuesta" fondo="blanco"
        entradilla="El sistema público no puede endeudarse. Lo que da un servicio o genera un ahorro puede pedir dinero, pero fuera de lo público y a riesgo de quien lo presta.">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full min-w-[680px] text-[15px]">
            <caption className="sr-only">La deuda hoy y con la propuesta</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th scope="col" className="w-[30%] px-5 py-2 font-medium" />
                <th scope="col" className="px-4 py-2 font-medium">Hoy</th>
                <th scope="col" className="px-4 py-2 font-medium text-emerald-800">Con la propuesta</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {COMPARA.map(c => (
                <tr key={c.t} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-900">{c.t}</th>
                  <td className="px-4 py-3 text-slate-600">{c.hoy}</td>
                  <td className="px-4 py-3 text-slate-900">{c.propuesta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Mas titulo="cómo se financia un proyecto sin deuda pública">
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
            <p>Un municipio quiere poner placas solares en sus colegios. Hoy pediría un préstamo, y si la obra sale cara o mal, la deuda se queda.</p>
            <p>Con la propuesta, lo hace una cooperativa de energía, una empresa o un grupo de vecinos que invierten: ponen el dinero, montan las placas y cobran al municipio por la luz, más barata que la que pagaba. Lo que el municipio deja de gastar devuelve la inversión. Si el proyecto falla, pierde quien invirtió, no el municipio.</p>
            <p>Las reglas: el proyecto tiene que dar un servicio concreto o generar un ahorro que se pueda medir; el contrato dice cuánto paga lo público y por qué servicio; y lo público nunca avala ni se queda con la deuda.</p>
            <p>Para lo que no da ningún retorno (una carretera, un hospital), se ahorra antes con el tercio de producción de cada escala, y se construye cuando el dinero está.</p>
          </div>
        </Mas>
      </Apartado>

      <CajaContingencias />
      <DeudaHeredada />

      <Apartado id="deuda-fuentes" titulo="Fuentes" fondo="blanco">
        <ul className="grid max-w-4xl gap-2 text-sm">
          {['deuda-2025', 'deuda-ccaa-2025', 'intereses-2025', 'tesoro-2026', 'intereses-ccaa', 'fla-2012', 'fla-deuda', 'condonacion', 'deuda-1980', 'deuda-2007', 'superavit-2007', 'deuda-2020', 'sareb-2020', 'deuda-2021', 'deficit-2020', 'ccaa-bbva', 'art-135', 'bde-ingresos']
            .map(id => FUENTE[id]).filter(Boolean).map(f => (
              <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
            ))}
        </ul>
      </Apartado>
    </>
  );
}

/** Debt as % of GDP, at the dated points we have sources for. */
function HistoriaGrafica() {
  const W = 640, H = 260, m = { l: 40, r: 16, t: 24, b: 28 };
  const x = (a: number) => m.l + ((a - 1978) / (2027 - 1978)) * (W - m.l - m.r);
  const y = (p: number) => H - m.b - (p / 130) * (H - m.t - m.b);
  const puntos = HISTORIA_PCT.map(h => `${x(h.ano)},${y(h.pct)}`).join(' ');
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="text-lg font-bold text-slate-900">Deuda de las administraciones, en % del PIB</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label={HISTORIA_PCT.map(h => `${h.ano}: ${numero(h.pct, 1)} %`).join('; ')}>
        {[0, 40, 80, 120].map(v => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} className="stroke-slate-100" />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{v} %</text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={y(60)} y2={y(60)} className="stroke-slate-300" strokeDasharray="4 4" />
        <text x={W - m.r} y={y(60) - 5} textAnchor="end" className="fill-slate-500 text-[11px]">límite europeo, 60 %</text>
        <polyline points={puntos} fill="none" className="stroke-slate-900" strokeWidth={2} strokeLinejoin="round" />
        {HISTORIA_PCT.map(h => (
          <g key={h.ano}>
            <circle cx={x(h.ano)} cy={y(h.pct)} r={4.5} className="fill-slate-900 stroke-white" strokeWidth={2}>
              <title>{`${h.ano}: ${numero(h.pct, 1)} % del PIB (${h.nota})`}</title>
            </circle>
            <text x={h.ano === 2020 ? x(h.ano) - 9 : x(h.ano)} y={h.ano === 2020 ? y(h.pct) + 4 : y(h.pct) - 10} textAnchor={h.ano === 2020 ? 'end' : 'middle'} className="fill-slate-700 text-[11px] font-semibold">{numero(h.pct, 0)}</text>
            <text x={x(h.ano)} y={H - 8} textAnchor="middle" className="fill-slate-500 text-[11px]">{h.ano === 2021 ? '' : h.ano}</text>
          </g>
        ))}
      </svg>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Solo los años con dato; entre ellos, una línea recta. {HISTORIA_PCT.map(h => `${h.ano}: ${h.nota}`).join('. ')}.
        {[...new Set(HISTORIA_PCT.map(h => h.fuente))].map(f => <Fuente key={f} id={f} />)}
      </p>
    </figure>
  );
}

/** The contingency box: how much it fills each year and how long it takes to cover a pandemic. */
function CajaContingencias() {
  const [parte, setParte] = useState(RESERVA_MIN_LIBRE);
  const [anos, setAnos] = useState(5);
  const c = caja('literal', parte);
  const acumulado = c.total * anos;
  const anosPandemia = PANDEMIA / c.total;
  const libre = TERCIOS.find(t => t.id === 'libre')!;
  const maxBarra = Math.max(acumulado, PANDEMIA) * 1.05;
  return (
    <Apartado id="deuda-caja" titulo="La caja de contingencias"
      entradilla={<>Cada escala reparte lo que recibe en tres tercios. Del tercio de {libre.nombre.toLowerCase()}, al menos una quinta parte va a una caja para desastres naturales y crisis sociales. La caja nunca puede bajar de cero: si se vacía, no se pide prestado.</>}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <Regulador etiqueta="Parte del tercio libre que va a la caja" valor={parte} min={0.2} max={0.5} paso={0.05}
            mostrar={porcentaje(parte * 100, 0)} onChange={setParte} ayuda="Como mínimo un 20 %; cada escala puede decidir más." />
          <Regulador etiqueta="Años ahorrando" valor={anos} min={1} max={20} paso={1}
            mostrar={`${anos} ${anos === 1 ? 'año' : 'años'}`} onChange={setAnos} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Cifra valor={mill(Math.round(c.total))} texto={`al año entre las ${ESCALAS.length} escalas de España`} tono="bien"
            nota={`${mill(Math.round(c.porEscala))} cada escala, ${euros(c.porPersona)} por habitante`} />
          <Cifra valor={mill(Math.round(acumulado))} texto={`en la caja después de ${anos} ${anos === 1 ? 'año' : 'años'}, sin contar lo que rinda`} tono="bien" />
        </div>
      </div>

      <figure className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <figcaption className="font-semibold text-slate-900">¿Alcanzaría para una pandemia?</figcaption>
        <div className="mt-4 space-y-2">
          {[{ t: `La caja a los ${anos} años`, v: acumulado, c: 'bg-emerald-700' }, { t: 'Lo que costó la pandemia en un año', v: PANDEMIA, c: 'bg-slate-400' }].map(b => (
            <div key={b.t} className="grid items-center gap-x-3 gap-y-1 sm:grid-cols-[230px_1fr]">
              <span className="text-sm text-slate-700">{b.t}</span>
              <span className="flex items-center gap-2">
                <span className={cn('h-4 shrink-0 rounded-r-[4px]', b.c)} style={{ width: `${(b.v / maxBarra) * 60}%` }} />
                <span className="whitespace-nowrap text-sm tabular-nums text-slate-700">{mill(Math.round(b.v / 100) * 100)}</span>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-700">
          En 2020 el déficit pasó del 2,9 % al 11 % del PIB<Fuente id="deficit-2020" />: unos {mill(Math.round(PANDEMIA / 1000) * 1000)} con el PIB de hoy.
          Con esta caja, ahorrar para un golpe así lleva unos <strong>{numero(anosPandemia, 1)} años</strong>. Hoy, en cambio, los intereses se llevan cada año {mill(PAGOS.intereses)}, casi lo mismo que ahorraría la caja con el mínimo del 20 %.
        </p>
      </figure>

      <Mas titulo="las reglas de la caja">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li>Cada escala tiene la suya: la comunidad vecinal, el municipio, la región, la nación… También la persona, con su propio ahorro.</li>
          <li>Solo se usa para contingencias extraordinarias: un desastre natural, una pandemia, una crisis social. Lo decide su asamblea.</li>
          <li>Nunca baja de cero. Si a una escala no le alcanza, la ayuda una escala mayor o una igual con lo que tiene ahorrado, en un préstamo al IPC o una donación. Entre todas pueden moverse ahorros; nadie puede pedir prestado fuera.</li>
          <li>Mientras no se usa, puede invertirse con prudencia, como el fondo de las pensiones, para que no pierda valor.</li>
          <li>Si la caja de una escala crece mucho más de lo que podría necesitar, su asamblea puede bajar su parte hasta el mínimo del 20 %.</li>
        </ul>
      </Mas>
    </Apartado>
  );
}

/** The debt inherited from today: how long it takes to pay it off at a fixed amount a year. */
function DeudaHeredada() {
  const [pago, setPago] = useState(80_000);
  const r = amortizar(pago);
  const interesHoy = DEUDA.total * TIPO_MEDIO;
  return (
    <Apartado id="deuda-heredada" titulo="Qué pasa con la deuda de hoy" fondo="blanco"
      entradilla={<>Prohibir la deuda nueva no borra la vieja: {billones(DEUDA.total)} que hay que devolver. La propuesta es dejar de renovarla y pagarla poco a poco, sin pedir más.</>}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Regulador etiqueta="Lo que se dedica cada año a la deuda (intereses y capital)" valor={pago} min={30_000} max={160_000} paso={5_000}
            mostrar={mill(pago)} onChange={setPago}
            ayuda={`Con el interés medio de hoy, ${porcentaje(TIPO_MEDIO * 100, 1)}. Solo los intereses son ${mill(Math.round(interesHoy / 100) * 100)} al año.`} />
        </div>
        {r ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Cifra valor={`${r.anos} años`} texto="para no deber nada" tono="bien" />
            <Cifra valor={billones(r.intereses)} texto="de intereses pagados por el camino" tono="mal" />
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-[15px] leading-relaxed text-rose-900">
            Con {mill(pago)} al año no se cubren ni los intereses: la deuda crecería. Es lo que pasa hoy.
          </div>
        )}
      </div>
      <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        Hoy, en esos mismos años se pagarían intereses todos los años y al final se seguiría debiendo lo mismo o más. Cada escala heredaría la deuda de la administración que sustituye: la nación, la del Estado y la Seguridad Social; la región, la de su comunidad; el municipio y la provincia, la de sus ayuntamientos y diputaciones.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
        Falta por decidir de dónde sale ese pago durante la transición, igual que la pensión: las cuentas del impuesto único aún no lo incluyen. La caja de contingencias no se usa para esto. Las cifras suponen que el interés medio no cambia; en la realidad, la deuda que vence se pagaría y la que sigue viva mantendría su tipo.
      </p>
    </Apartado>
  );
}
