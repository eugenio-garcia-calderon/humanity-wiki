// Today's Spanish tax system next to the model: how many pieces, what it costs
// to comply, how the money reaches each administration, and where the money
// sits today and with the model.
import { cn } from '../../utils/cn';
import {
  AMBITO, ESCALA, ESCALAS, ESPANA, HOY, modeloPorFuncion, euros, IMPUESTOS_HOY, TOTAL_FIGURAS, type Modo, cuentasPais, millones, numero, numeroFiguras, porcentaje,
} from '../../data/modeloSocioeconomico';
import { Fuente, Muestra } from './piezas';

export function Piezas() {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h3 className="text-lg font-bold text-slate-900">Hoy: {TOTAL_FIGURAS} impuestos y cotizaciones distintos, y cientos de tasas</h3>
        <p className="mt-1 text-sm text-slate-600">
          Cada cuadrado es un impuesto o una cotización con sus propias reglas, plazos y formularios. Son los de toda España: a cada persona le tocan los del Estado,
          las cotizaciones, los de su región y los de su municipio.
        </p>
        <div className="mt-5 space-y-4">
          {IMPUESTOS_HOY.map(g => (
            <div key={g.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-slate-900">{g.nombre}</span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{numeroFiguras(g)}</span>
              </div>
              <span className="block text-xs text-slate-500">Los cobra {g.quien}</span>
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
      <div className="flex flex-col self-start rounded-2xl bg-slate-900 p-6 text-white">
        <h3 className="text-lg font-bold">Con el modelo: 1</h3>
        <p className="mt-1 text-sm text-slate-300">Un solo impuesto sobre cada pago, con cuatro tramos. Lo aparta el sistema de pago y llega ya repartido:</p>
        <div className="mt-5 flex items-stretch gap-3">
          <span aria-hidden className="grid h-24 w-24 shrink-0 place-items-center rounded-lg bg-white text-center text-lg font-[800] leading-tight tracking-tight text-slate-900">10 · 20 ·<br />40 · 60 %</span>
          <ul className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-200">
            {ESCALAS.map(e => <li key={e.id} className="flex items-center gap-1.5"><Muestra color={e.color} />{e.corto}</li>)}
          </ul>
        </div>
        <ul className="mt-5 list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>Sin declaración de la renta ni modelos trimestrales.</li>
          <li>Sin recibos del IBI, de basuras ni del vehículo.</li>
          <li>Sin cuotas de comunidad.</li>
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-slate-400">
          Hoy el IVA ya tiene tres tipos (4, 10 y 21 %). Dentro de la Unión Europea, la parte de las compras sería legalmente el IVA, que la UE obliga a mantener con un tipo mínimo del 15 % y reducidos para lo básico.
        </p>
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
    ['Cuántos impuestos', <>{TOTAL_FIGURAS} impuestos y cotizaciones distintos, y cientos de tasas</>, 'Uno, con cuatro tramos: 10, 20, 40 y 60 %'],
    ['Quién hace papeleo', 'Personas, autónomos, empresas y comunidades de vecinos: declaraciones, modelos trimestrales, liquidaciones y recibos', 'Nadie: lo aparta el sistema de pago en cada operación'],
    ['Cuándo se paga', 'Retenciones cada mes, declaraciones cada trimestre y cada año, recibos en fechas distintas', 'En el instante de cada pago'],
    ['Cómo llega el dinero a cada administración', 'El Estado recauda y luego reparte a comunidades y ayuntamientos con fórmulas que se negocian políticamente y se ajustan años después', 'Un octavo automático a cada escala, repartido por habitante, cada día; y en cada escala, tercios para producir, cuidar y libre'],
    ['La comunidad de vecinos', <>Cuotas aparte: unos {millones(HOY.cuotasComunidades)} al año (estimación)<Fuente id="comunidades-cuotas" /></>, 'Es una escala más y la financia el fondo común'],
    ['Quién paga más', 'Tramos del IRPF, deducciones y exenciones', 'Quien gasta en ocio y, sobre todo, en lujo, y quien trabaja para una empresa grande; todos reciben el mismo ingreso por persona'],
    ['Pensiones', 'Según lo cotizado: de menos de 1.000 € a 3.359,60 € al mes', 'Una sola pensión igual al salario mínimo, ayudas aparte (ver la ventana Pensiones)'],
    ['Transparencia', 'Presupuestos y liquidaciones anuales', 'Cuentas abiertas: cada euro, en tiempo real'],
    ['Cuánto se recauda', <>≈ 38 % del PIB en impuestos y cotizaciones (2025)<Fuente id="ijm-2026" /></>, <>≈ {porcentaje(pais.pctPIB, 0)} del PIB, según los cálculos de este modelo</>],
  ];
  return (
    <>
      {/* Phones: one card per row, «Hoy» above «Propuesta», nothing cut off. */}
      <ul className="space-y-3 sm:hidden">
        {filas.map(([a, h, m]) => (
          <li key={a} className="rounded-2xl border border-slate-200 bg-white p-4 text-[15px]">
            <p className="font-semibold text-slate-900">{a}</p>
            <p className="mt-2 text-slate-600"><span className="mr-1 text-xs font-bold uppercase text-slate-400">Hoy</span>{h}</p>
            <p className="mt-1.5 text-slate-900"><span className="mr-1 text-xs font-bold uppercase text-amber-600">Propuesta</span>{m}</p>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white sm:block">
        <table className="w-full min-w-[640px] text-[15px]">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th scope="col" className="w-[22%] px-5 py-3 font-medium text-slate-500"><span className="sr-only">Aspecto</span></th>
              <th scope="col" className="px-5 py-3 font-semibold text-slate-900">Hoy en España</th>
              <th scope="col" className="px-5 py-3 font-semibold text-slate-900">Propuesta</th>
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
    </>
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
                  <span className={cn('h-4 shrink-0 rounded-r-[4px]', b.c)} style={{ width: `${Math.max(0.4, (b.v / max) * 78)}%` }} />
                  <span className="min-w-0 text-xs tabular-nums text-slate-700"><span className="whitespace-nowrap">{millones(b.v)}</span>{b.nota && <span className="text-slate-500"> ({b.nota})</span>}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-slate-600">
        Las escalas que prestan servicios dentro de España, de la comunidad vecinal a la nación, tendrían {millones(pais.porEscala * 5)} al año, frente a los {millones(HOY.gastoTotal2024)} que gastaron todas las administraciones en 2024.
        España aportaría a Europa y al planeta {millones(pais.porEscala * 2)}, frente a unos {millones(HOY.aportacionUE + HOY.aod2025)} hoy. Y cada persona recibiría su dividendo.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        El cambio de fondo no es solo cuánto se recauda, sino dónde: hoy el {porcentaje(((HOY.gastoCentral2024 + HOY.gastoSeguridadSocial2024) / HOY.gastoTotal2024) * 100, 0)} del gasto
        público lo hacen el Estado y la Seguridad Social. Con el modelo cada escala recibe lo mismo: el Estado y las regiones pasan a tener mucho menos,
        los municipios, las provincias y las comunidades vecinales algo más, y Europa y el planeta bastante más.
      </p>
    </figure>
  );
}

/** What each area has today and with the model: the gains and losses, area by area. */
export function GanaYPierde({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const filas = modeloPorFuncion(modo);
  const max = Math.max(...filas.flatMap(f => [f.hoy, f.modelo]));
  const totalHoy = filas.reduce((s, f) => s + f.hoy, 0);
  const totalModelo = filas.reduce((s, f) => s + f.modelo, 0);
  const pension = filas.find(f => f.id === 'proteccion')!;
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <figcaption>
        <h3 className="text-lg font-bold text-slate-900">Lo que se gana y lo que se pierde, ámbito por ámbito</h3>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Millones de euros al año. Hoy: gasto de todas las administraciones en 2024 por funciones<Fuente id="igae-cofog" />.
          Con el modelo: lo que dedican a cada ámbito las cinco escalas que sirven dentro de España (de la comunidad vecinal a la nación), con el reparto inicial de la matriz.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-slate-400" />Hoy</span>
          <span className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm bg-slate-900" />Con el modelo</span>
        </div>
      </figcaption>
      <div className="mt-5 space-y-3.5">
        {filas.map(f => (
          <div key={f.id} className="grid gap-x-4 gap-y-1 sm:grid-cols-[230px_1fr]">
            <div className="text-sm font-semibold leading-snug text-slate-900">{f.nombre}</div>
            <div className="space-y-1">
              {[{ v: f.hoy, t: 'Hoy', c: 'bg-slate-400', nota: f.nota }, { v: f.modelo, t: 'Con el modelo', c: 'bg-slate-900', nota: undefined }].map(b => (
                <div key={b.t} className="flex items-center gap-2" title={`${f.nombre}, ${b.t.toLowerCase()}: ${millones(b.v)} al año`}>
                  <span className={cn('h-3.5 shrink-0 rounded-r-[4px]', b.c)} style={{ width: `${Math.max(0.4, (b.v / max) * 74)}%` }} />
                  <span className="min-w-0 text-xs tabular-nums text-slate-700"><span className="whitespace-nowrap">{millones(b.v)}</span>{b.nota && <span className="text-slate-500"> ({b.nota})</span>}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        Cómo se agrupan los quince ámbitos de la matriz:{' '}
        {filas.map(f => `${f.nombre}: ${f.ambitos.map(a => AMBITO[a].corto).join(', ')}`).join('. ')}.
        La parte de la comunidad vecinal se cuenta aquí como gasto en sus ámbitos; quien vive en una casa sin comunidad la recibe en dinero, como en el caso de la persona del pueblo.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        Por habitante: hoy, unos {euros((totalHoy * 1e6) / ESPANA.poblacion)} al año entre gasto público y cuotas de comunidad;
        con el modelo, {euros((totalModelo * 1e6) / ESPANA.poblacion)} en lo que hacen las escalas (servicios e inversión) más {euros(pais.porPersonaEscala)} de dividendo.
        En total, {millones(totalModelo)} frente a {millones(totalHoy)} (los {millones(HOY.gastoTotal2024)} de gasto público más las cuotas de comunidad). La mayor diferencia está en la protección social:
        {' '}{millones(pension.modelo)} frente a {millones(pension.hoy)}, porque estas cuentas aún no incluyen la pensión igual al salario mínimo de la ventana Pensiones (unos 170.330 M€ al año), que no cabe en este reparto. Hay que sumar el dividendo, {millones(pais.porEscala)} al año que reciben directamente todas las personas,
        y saber que hoy «administración» incluye {millones(HOY.intereses2025)} de intereses de la deuda en 2025<Fuente id="intereses" />, que el modelo todavía no resuelve.
      </p>
    </figure>
  );
}
