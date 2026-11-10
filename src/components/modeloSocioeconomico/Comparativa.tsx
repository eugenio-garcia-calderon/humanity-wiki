// Today's Spanish tax system next to the model: how many pieces, what it costs
// to comply, how the money reaches each administration, and where the money
// sits today and with the model.
import { cn } from '../../utils/cn';
import {
  ESCALA, HOY, IMPUESTOS_HOY, TOTAL_FIGURAS, type Modo, cuentasPais, millones, numero, numeroFiguras, porcentaje, PARTE_ESCALA, TIPO,
} from '../../data/modeloSocioeconomico';
import { Fuente, Muestra } from './piezas';

export function Piezas() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-lg font-bold text-slate-900">Hoy: {TOTAL_FIGURAS} figuras distintas, y cientos de tasas</h3>
        <p className="mt-1 text-sm text-slate-600">Cada cuadrado es un impuesto o una cotización con sus propias reglas, plazos y formularios.</p>
        <div className="mt-5 space-y-4">
          {IMPUESTOS_HOY.map(g => (
            <div key={g.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">{g.nombre}</span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{numeroFiguras(g)}</span>
              </div>
              <span className="block text-xs text-slate-500">Los cobra: {g.quien.charAt(0).toLowerCase() + g.quien.slice(1)}</span>
              <div aria-hidden className="mt-2 flex flex-wrap gap-[3px]">
                {Array.from({ length: numeroFiguras(g) }, (_, i) => <span key={i} className="h-3 w-3 rounded-[2px] bg-slate-400" />)}
              </div>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs font-medium text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Ver cuáles</summary>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
                  {g.figuras.join(', ')}.{g.nota ? ` ${g.nota}` : ''}{g.fuente && <Fuente id={g.fuente} />}
                </p>
              </details>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-between rounded-2xl bg-slate-900 p-6 text-white">
        <div>
          <h3 className="text-lg font-bold">Con el modelo: 1</h3>
          <p className="mt-1 text-sm text-slate-300">Un único {porcentaje(TIPO * 100, 0)} sobre cada pago, que el sistema de pago aparta y reparte solo: {porcentaje(PARTE_ESCALA * 100)} a cada escala.</p>
        </div>
        <span aria-hidden className="mt-6 grid h-24 w-24 place-items-center rounded-lg bg-white text-2xl font-[800] tracking-tight text-slate-900">{porcentaje(TIPO * 100, 0)}</span>
        <p className="mt-6 text-sm text-slate-300">Sin declaración de la renta, sin modelos trimestrales, sin recibos del IBI ni cuotas de comunidad.</p>
      </div>
    </div>
  );
}

export function Costes() {
  const costeAEAT = (HOY.aeat2025 * HOY.costeAEATpct) / 100;
  const datos = [
    { n: `${HOY.horasEmpresas} horas`, t: <>al año dedica la empresa mediana española a preparar y pagar impuestos, frente a {HOY.horasUE} en la UE y {HOY.horasOCDE} en la OCDE.<Fuente id="complejidad" /></> },
    { n: numero(HOY.indiceComplejidad, 1), t: <>es el índice de complejidad fiscal de España, cuando la media de la UE es 100.<Fuente id="complejidad" /></> },
    { n: millones(costeAEAT), t: <>cuesta al año la Agencia Tributaria: el {numero(HOY.costeAEATpct, 2)} % de lo que recauda. A eso se suman la Seguridad Social, las agencias de cada región y las de los ayuntamientos.<Fuente id="aeat-coste" /></> },
    { n: numero(HOY.comunidadesExpuestasSancion), t: <>comunidades de propietarios, de {numero(HOY.comunidades)}, se exponen a sanciones cada año por no presentar a tiempo sus obligaciones fiscales.<Fuente id="cafmadrid" /></> },
    { n: millones(HOY.cuotasComunidades), t: <>al año en cuotas de comunidad que los vecinos pagan aparte de sus impuestos.<Fuente id="comunidades-cuotas" /></> },
  ];
  return (
    <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {datos.map((d, i) => (
        <li key={i} className="border-t-2 border-slate-900 pt-3 text-[15px] leading-snug text-slate-700">
          <b className="block text-2xl font-[750] tabular-nums tracking-tight text-slate-900">{d.n}</b>{d.t}
        </li>
      ))}
    </ul>
  );
}

export function Tabla({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const filas: [string, React.ReactNode, React.ReactNode][] = [
    ['Cuántos impuestos', <>{TOTAL_FIGURAS} figuras y cientos de tasas</>, <>Uno: el {porcentaje(TIPO * 100, 0)}</>],
    ['Quién hace papeleo', 'Personas, autónomos, empresas y comunidades de vecinos: declaraciones, modelos trimestrales, liquidaciones y recibos', 'Nadie: lo aparta el sistema de pago en cada operación'],
    ['Cuándo se paga', 'Retenciones cada mes, declaraciones cada trimestre y cada año, recibos en fechas distintas', 'En el instante de cada pago'],
    ['Cómo llega el dinero a cada administración', 'Impuestos cedidos, participaciones en tributos del Estado y un sistema de financiación autonómica que se negocia políticamente y se liquida años después', `${porcentaje(PARTE_ESCALA * 100)} automático a cada escala, repartido por habitante, cada día`],
    ['La comunidad de vecinos', `Cuotas aparte: unos ${millones(HOY.cuotasComunidades)} al año`, 'Es una escala más y la financia el fondo común'],
    ['Quién paga más', 'Tramos del IRPF, deducciones y exenciones', 'Tipo único y un dividendo igual para todos: en neto paga más quien más mueve'],
    ['Transparencia', 'Presupuestos y liquidaciones anuales', 'Cuentas abiertas: cada euro, en tiempo real'],
    ['Cuánto se recauda', <>≈ 38 % del PIB en impuestos y cotizaciones (2025)<Fuente id="ijm-2026" /></>, <>≈ {porcentaje(pais.pctPIB, 0)} del PIB en esta lectura del modelo</>],
  ];
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-[15px]">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th scope="col" className="w-[22%] px-5 py-3 font-medium text-slate-500"><span className="sr-only">Aspecto</span></th>
            <th scope="col" className="px-5 py-3 font-semibold text-slate-900">Hoy en España</th>
            <th scope="col" className="px-5 py-3 font-semibold text-slate-900">Con el modelo</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(([a, h, m]) => (
            <tr key={a} className="border-b border-slate-100 align-top last:border-0">
              <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-900">{a}</th>
              <td className="px-5 py-3 text-slate-600">{h}</td>
              <td className="px-5 py-3 text-slate-900">{m}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Where the money sits today and with the model, by scale (millions of euros a year). */
export function DondeEstaElDinero({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const grupos = [
    { id: 'persona', nombre: 'Personas (dividendo)', escalas: ['persona'], hoy: 0, notaHoy: 'hoy no existe un dividendo para todos' },
    { id: 'vecindad', nombre: 'Comunidades vecinales', escalas: ['vecindad'], hoy: HOY.cuotasComunidades, notaHoy: 'cuotas que pagan los vecinos' },
    { id: 'local', nombre: 'Municipios y provincias', escalas: ['municipio', 'provincia'], hoy: HOY.gastoLocal2024 },
    { id: 'region', nombre: 'Regiones', escalas: ['region'], hoy: HOY.gastoRegional2024 },
    { id: 'nacion', nombre: 'Nación (Estado y Seguridad Social)', escalas: ['nacion'], hoy: HOY.gastoCentral2024 + HOY.gastoSeguridadSocial2024 },
    { id: 'europa', nombre: 'Europa', escalas: ['continente'], hoy: HOY.aportacionUE, notaHoy: 'aportación de España a la UE' },
    { id: 'planeta', nombre: 'Planeta', escalas: ['planeta'], hoy: HOY.aod2025, notaHoy: 'ayuda oficial al desarrollo' },
  ].map(g => ({ ...g, modelo: pais.porEscala * g.escalas.length }));
  const max = Math.max(...grupos.flatMap(g => [g.hoy, g.modelo]));
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <figcaption>
        <h3 className="text-lg font-bold text-slate-900">Dónde está el dinero, hoy y con el modelo</h3>
        <p className="mt-1 text-sm text-slate-600">Millones de euros al año. Hoy: gasto de cada nivel de la administración en 2024<Fuente id="igae-cofog" />, cuotas de comunidad<Fuente id="comunidades-cuotas" />, aportación a la UE<Fuente id="ue-espana" /> y ayuda al desarrollo de 2025<Fuente id="aod-2025" />.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-slate-400" />Hoy</span>
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-slate-900" />Con el modelo</span>
        </div>
      </figcaption>
      <div className="mt-5 space-y-4">
        {grupos.map(g => (
          <div key={g.id} className="grid gap-x-4 gap-y-1 sm:grid-cols-[210px_1fr]">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="flex gap-0.5">{g.escalas.map(e => <Muestra key={e} color={ESCALA[e as keyof typeof ESCALA].color} />)}</span>{g.nombre}
            </div>
            <div className="space-y-1">
              {[{ v: g.hoy, t: 'Hoy', c: 'bg-slate-400', nota: g.notaHoy }, { v: g.modelo, t: 'Con el modelo', c: 'bg-slate-900' }].map(b => (
                <div key={b.t} className="flex items-center gap-2" title={`${g.nombre}, ${b.t.toLowerCase()}: ${millones(b.v)} al año`}>
                  <span className={cn('h-4 rounded-r-[4px]', b.c)} style={{ width: `${Math.max(0.4, (b.v / max) * 78)}%` }} />
                  <span className="whitespace-nowrap text-xs tabular-nums text-slate-700">{millones(b.v)}{b.nota && <span className="text-slate-500"> ({b.nota})</span>}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-slate-600">
        El cambio de fondo no es solo cuánto se recauda, sino dónde: hoy el {porcentaje(((HOY.gastoCentral2024 + HOY.gastoSeguridadSocial2024) / HOY.gastoTotal2024) * 100, 0)} del gasto
        público lo hacen el Estado y la Seguridad Social; con el modelo cada escala recibe lo mismo, y el dinero se acerca a las personas y a lo que compartimos con el resto del mundo.
      </p>
    </figure>
  );
}
