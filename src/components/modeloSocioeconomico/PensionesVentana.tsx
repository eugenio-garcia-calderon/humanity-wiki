// The «Pensiones» window (2026-11-12, Eugenio): today's pensions next to the
// proposal — one pension equal to the minimum wage, no maximum and no minimum,
// extra help through social services, and a gradual move from pay-as-you-go to
// an invested fund whose return pays the pensions of the future. Simple first;
// the detail behind «Más». Data: src/data/pensionesPropuesta.ts.
import { useLayoutEffect, useRef, useState } from 'react';
import {
  SMI_MES, SMI_ANO, PAGAS, COSTE_HOY, COSTE_PROPUESTA, AHORRO_BRUTO, CAMBIOS, GANAN, PIERDEN, PERSONAS_PROPUESTA,
  PENSIONISTAS, PNC, SUPUESTOS, COMPLEMENTO_ALQUILER, cuentasPropuesta, COTIZA_EMPRESA, COTIZA_TRABAJADOR, IRPF_EJEMPLO,
  BRUTO_EJEMPLO, NETO_EJEMPLO, COSTE_EMPRESA_EJEMPLO, PENSIONES_EN_COTIZACION, FONDO_RESERVA, FONDO_NORUEGA, simularFondo,
  PERSONAS_CON_DOS, AHORRO_IGUALAR, AHORRO_UNA_POR_PERSONA, SUBIDA_PNC, SMI_NETO_TRABAJADOR, ahorroPrivado,
} from '../../data/pensionesPropuesta';
import { TRAMOS_PENSION, NOMINA_PENSIONES_MES, PENSION_MAXIMA, PENSION_MINIMA_JUBILACION, TOTAL_PENSIONES_CONTRIBUTIVAS } from '../../data/presupuestos';
import { euros, numero, porcentaje, FUENTE } from '../../data/modeloSocioeconomico';
import { Pensiones } from './Pensiones';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Regulador } from './piezas';

const mill = (e: number) => `${numero(e / 1e6)} M€`;
const millon = (n: number) => `${numero(n / 1e6, 1)} millones`;

export function PensionesVentana() {
  const [ayudasPct, setAyudasPct] = useState(SUPUESTOS.ayudasPct);
  const [otrasCuota, setOtrasCuota] = useState(SUPUESTOS.otrasAyudasCuota);
  const [otrasMes, setOtrasMes] = useState(SUPUESTOS.otrasAyudasMes);
  const cuentas = cuentasPropuesta(ayudasPct, otrasCuota, otrasMes);
  const [aportacion, setAportacion] = useState<number | null>(null);
  const [rendimiento, setRendimiento] = useState(0.035);
  const aporte = aportacion ?? Math.max(0, Math.round(cuentas.neto / 1e9) * 1e9);
  const fondo = simularFondo(aporte, rendimiento, COSTE_PROPUESTA + cuentas.ayudas);

  return (
    <>
      {/* ── 1. Summary ── */}
      <Apartado id="pensiones" titulo="Una sola pensión, igual al salario mínimo"
        entradilla={<>Hoy las pensiones van de menos de 1.000 € a la máxima de {euros(PENSION_MAXIMA, 2)} al mes.
          La propuesta: una única pensión de {euros(SMI_MES)} al mes, lo mismo que el salario mínimo, para todas las personas jubiladas.
          Quien necesite más lo pide a los servicios sociales.</>}>
        <FormaPensiones />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Cifra valor={euros(SMI_MES)} texto={`al mes, en ${PAGAS} pagas, para todas las personas jubiladas`} nota={<>El salario mínimo de 2026<Fuente id="smi-2026" /></>} />
          <Cifra tono="bien" valor={`${numero(AHORRO_BRUTO / 1e6)} millones €`} texto="menos al año en pensiones" nota={`De ${mill(COSTE_HOY)} a ${mill(COSTE_PROPUESTA)}, antes de las ayudas aparte (M€: millones de euros)`} />
          <Cifra valor={`${numero((GANAN + PNC) / 1e6, 1)} / ${numero(PIERDEN / 1e6, 1)}`} texto="millones de pensiones que suben / que bajan (con las no contributivas)" nota={`Además, ${numero(PERSONAS_CON_DOS / 1e6, 1)} millones de personas que cobran dos pensiones pasan a cobrar una`} />
        </div>
      </Apartado>

      {/* ── 2. Today ── */}
      <Apartado id="pensiones-hoy" fondo="blanco" titulo="Las pensiones de hoy, en cinco tramos"
        entradilla="Cuántas pensiones hay en cada tramo y qué parte del dinero se lleva cada uno. Las más altas son 1 de cada 20 y se llevan más de 1 de cada 10 euros.">
        <Pensiones />
      </Apartado>

      {/* ── 3. The proposal ── */}
      <Apartado id="pensiones-propuesta" titulo="La propuesta, en cuatro reglas"
        entradilla="Menos complejidad y menos desigualdad: entre pensionistas, y entre pensionistas y quienes trabajan.">
        <ol className="grid gap-4 md:grid-cols-2">
          {[
            { t: 'Un único número', d: <>La pensión es el salario mínimo: {euros(SMI_MES)} al mes en 14 pagas, {euros(SMI_ANO)} al año. Si sube el salario mínimo, sube la pensión.</> },
            { t: 'Ni máxima ni mínima', d: 'Una pensión por persona. Desaparecen el tope, los complementos (lo que hoy se añade para llegar a la mínima) y las pensiones que se suman, como jubilación más viudedad.' },
            { t: 'Más, si hace falta, aparte', d: 'Quien tenga carga familiar, riesgo de exclusión o de desahucio pide ayuda a los servicios sociales, que estudian cada caso. Es una partida propia, separada de las pensiones.' },
            { t: 'Lo demás, con ahorro', d: <>Quien quiera cobrar más al jubilarse ahorra durante su vida: 100 € al mes durante 40 años dan unos {euros(Math.round(ahorroPrivado().alMes / 10) * 10)} más al mes, en 12 pagas, durante 20 años (estimación al 3,5 % real).</> },
          ].map((r, i) => (
            <li key={r.t} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="flex items-baseline gap-3">
                <span className="text-3xl font-[800] tabular-nums text-teal-600">{i + 1}</span>
                <span className="text-lg font-bold text-slate-900">{r.t}</span>
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-600">
          Las personas con discapacidad siguen con su apoyo propio, constante y preferiblemente en especie, como en el resto del modelo.
          Ningún pensionista cobra más que el salario mínimo: la pensión está pensada para vivir con dignidad, no para que unos se enriquezcan con lo que pagan otros.
        </p>
        <Mas titulo="por qué el salario mínimo">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Es la cifra que el país ya ha decidido que basta para vivir de un trabajo a jornada completa. Usarla para las pensiones hace que nadie que se jubile cobre menos que el salario mínimo, ni más.
            Como el salario mínimo, la pensión no paga IRPF (el impuesto sobre la renta). Un detalle: el trabajador paga además un 6,5 % de cotización y se queda con unos {euros(Math.round(SMI_NETO_TRABAJADOR))}; la pensión no cotiza, así que en limpio queda algo por encima.
            Si se quiere que coincidan también en limpio, la pensión sería de {euros(Math.round(SMI_NETO_TRABAJADOR))}.
          </p>
          <Mas titulo="qué pasa con la viudedad y la orfandad">
            <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
              La pensión es de cada persona cuando se jubila, no se hereda. Quien enviuda antes de jubilarse y se queda sin ingresos, o tiene hijos a su cargo, entra por la puerta de las ayudas de los servicios sociales.
              Las niñas y los niños huérfanos dejan de recibir una pensión y pasan a recibir la ayuda de cuidados de su escala.
            </p>
          </Mas>
        </Mas>
        <Mas titulo="cuánto da ahorrar por tu cuenta">
          {(() => { const a = ahorroPrivado(); return (
            <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
              Quien aparte 100 € al mes durante 40 años, con un rendimiento real del 3,5 %, llega a la jubilación con unos {euros(Math.round(a.capital / 1000) * 1000)}.
              Repartidos en 20 años, son unos {euros(Math.round(a.alMes / 10) * 10)} al mes más sobre la pensión. Es una estimación: el rendimiento no está garantizado.
            </p>
          ); })()}
        </Mas>
        <Mas titulo="lo que habría que resolver">
          <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li>Quien cotizó mucho durante 40 años esperaba una pensión mayor. Cambiarlo de golpe choca con lo prometido: haría falta un paso gradual o respetar las pensiones ya concedidas.</li>
            <li>Hoy la pensión depende de lo cotizado, y eso anima a cotizar. Con una pensión igual para todos, ese estímulo pasa al ahorro propio.</li>
            <li>Las ayudas por caso necesitan unos servicios sociales con medios suficientes para no convertirse en colas y papeles.</li>
          </ul>
        </Mas>
      </Apartado>

      {/* ── 4. Who gains, who loses ── */}
      <Apartado id="pensiones-quien" fondo="blanco" titulo="Quién gana y quién pierde"
        entradilla={<>Sube todo el que hoy cobra menos de {euros(SMI_MES)}; baja todo el que cobra más. Lo que cambia, al mes, de media en cada tramo:</>}>
        <Ganadores />
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          <li className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[15px] text-slate-800">
            <strong className="text-emerald-800">+{euros(Math.round(SUBIDA_PNC))} al mes</strong> para las {numero(PNC)} personas con pensión no contributiva (la de quien no cotizó lo suficiente): pasan de {euros(628.8, 2)} al salario mínimo<Fuente id="pnc-2026" />.
          </li>
          <li className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[15px] text-slate-800">
            <strong className="text-rose-800">{numero(PERSONAS_CON_DOS / 1e6, 1)} millones de personas</strong> cobran hoy dos pensiones, casi siempre jubilación y viudedad, y pasan a una. Por ejemplo, quien cobra 900 € de jubilación y 700 € de viudedad (1.600 €) pasa a {euros(SMI_MES)}: <strong className="text-rose-800">{euros(1600 - SMI_MES)} menos al mes</strong>.
          </li>
        </ul>
        <Mas titulo="por qué son pensiones y no personas">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Los datos públicos cuentan pensiones: {numero(TOTAL_PENSIONES_CONTRIBUTIVAS)} en julio de 2026, que cobran cerca de {millon(PENSIONISTAS)} de personas<Fuente id="pensiones-junio" />.
            Una de cada diez personas cobra dos, casi siempre jubilación y viudedad: con la propuesta cobraría una sola de {euros(SMI_MES)}.
            Por eso el número de personas que suben es algo menor que el de pensiones. El tramo de 1.000 a 1.500 € se reparte suponiendo que sus pensiones están repartidas por igual dentro del tramo.
          </p>
        </Mas>
      </Apartado>

      {/* ── 5. What it saves ── */}
      <Apartado id="pensiones-cuentas" titulo="Lo que se ahorra"
        entradilla="Las cuentas de un año, paso a paso, en millones de euros (M€). Las dos últimas líneas dependen de decisiones y supuestos: muévelos.">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <dl className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-[15px]">
            <Linea texto={<>Pensiones de hoy: contributivas ({numero(NOMINA_PENSIONES_MES / 1e6, 1)} M€ al mes × 14) y no contributivas ({numero(PNC)})<Fuente id="pensiones-2026" /><Fuente id="pnc-2026" /></>} valor={mill(COSTE_HOY)} />
            <Linea texto={<>Cada pensión pasa a ser el salario mínimo ({euros(SMI_ANO)} al año)</>} valor={`− ${mill(AHORRO_IGUALAR)}`} />
            <Linea texto={<>Una pensión por persona: {numero(PERSONAS_CON_DOS / 1e6, 1)} millones de personas dejan de cobrar dos</>} valor={`− ${mill(AHORRO_UNA_POR_PERSONA)}`} />
            <Linea texto={<>Ahorro antes de ayudas (la propuesta cuesta {mill(COSTE_PROPUESTA)}: {millon(PERSONAS_PROPUESTA)} de personas × {euros(SMI_ANO)})</>} valor={mill(AHORRO_BRUTO)} fuerte />
            <Linea texto={<>Partida aparte de ayudas de los servicios sociales ({porcentaje(ayudasPct * 100, 0)} de la nueva nómina)</>} valor={`− ${mill(cuentas.ayudas)}`} />
            <Linea texto="Otras ayudas a pensionistas pobres que dejarían de hacer falta (supuesto)" valor={`+ ${mill(cuentas.otras)}`} />
            <Linea texto="Ahorro neto al año" valor={mill(cuentas.neto)} fuerte tono={cuentas.neto >= 0 ? 'bien' : 'mal'} />
          </dl>
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <Regulador etiqueta="Ayudas de los servicios sociales" valor={ayudasPct} min={0} max={0.2} paso={0.01}
              mostrar={`${porcentaje(ayudasPct * 100, 0)} · ${mill(cuentas.ayudas)}`} onChange={setAyudasPct}
              ayuda="Para carga familiar, riesgo de exclusión o de desahucio. Es una decisión, no un dato." />
            <Regulador etiqueta="Pensionistas que suben y hoy cobran otras ayudas" valor={otrasCuota} min={0} max={0.5} paso={0.05}
              mostrar={porcentaje(otrasCuota * 100, 0)} onChange={setOtrasCuota} ayuda="No hay un dato oficial: es un supuesto." />
            <Regulador etiqueta="Cuánto reciben en esas ayudas, al mes" valor={otrasMes} min={0} max={300} paso={10}
              mostrar={euros(otrasMes)} onChange={setOtrasMes} ayuda="Supuesto. Por ejemplo, ayudas autonómicas o de alquiler." />
          </div>
        </div>
        <Mas titulo="cómo está hecha la cuenta">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Hoy: la nómina mensual de pensiones contributivas de julio de 2026 por catorce pagas, más las {numero(PNC)} pensiones no contributivas a {euros(8803.2, 2)} al año.
            Propuesta: una pensión de {euros(SMI_ANO)} al año para cada persona que hoy cobra alguna ({millon(PENSIONISTAS)} con pensión contributiva y {numero(PNC)} con no contributiva).
            Quedan fuera las pensiones de los funcionarios del Estado (Clases Pasivas), que se pagan aparte.
            La única ayuda extra con dato público es el complemento de alquiler de las no contributivas, {mill(COMPLEMENTO_ALQUILER)} al año<Fuente id="pnc-alquiler" />; ya está sumada.
          </p>
        </Mas>
      </Apartado>

      {/* ── 6. Work and pension ── */}
      <Apartado id="pensiones-trabajo" fondo="blanco" titulo="Lo que cuesta un sueldo hoy"
        entradilla={<>Para que su trabajador cobre {euros(Math.round(NETO_EJEMPLO))} limpios, una empresa paga en realidad {euros(Math.round(COSTE_EMPRESA_EJEMPLO))} por cada paga.
          La diferencia se va en cotizaciones (lo que se paga a la Seguridad Social) y en el IRPF (el impuesto sobre la renta), y la mayor parte de las cotizaciones paga las pensiones de hoy.</>}>
        <CosteSueldo />
        <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-600">
          Así, quien trabaja por {euros(Math.round(NETO_EJEMPLO))} limpios financia pensiones de hasta {euros(PENSION_MAXIMA, 2)}. Con la propuesta, ninguna pensión supera el salario mínimo.
        </p>
        <Mas titulo="el desglose del ejemplo">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Sueldo bruto de {euros(BRUTO_EJEMPLO)} en 14 pagas, contrato indefinido en una oficina, 2026<Fuente id="cotizaciones-2026" />.
            La empresa paga además el {porcentaje(COTIZA_EMPRESA * 100, 2)}: contingencias comunes 23,60 %, desempleo 5,50 %, formación 0,60 %, FOGASA 0,20 %, equidad intergeneracional 0,75 % y accidentes de trabajo, en torno al 1,50 %.
            Al trabajador se le descuenta el {porcentaje(COTIZA_TRABAJADOR * 100, 2)} de cotizaciones y, como estimación para una persona sin hijos, un {porcentaje(IRPF_EJEMPLO * 100, 0)} de IRPF.
            Solo las contingencias comunes, que pagan sobre todo las pensiones, son {euros(PENSIONES_EN_COTIZACION)} de cada paga.
          </p>
        </Mas>
      </Apartado>

      {/* ── 7. Towards a fund ── */}
      <Apartado id="pensiones-fondo" titulo="De pagar con los que trabajan a pagar con un fondo"
        entradilla={<>Hoy las pensiones se pagan con lo que cotizan quienes trabajan ese mes: hacen falta siempre trabajadores nuevos para pagar a los jubilados.
          La propuesta es ir pasando, poco a poco, a un fondo que invierte; cuando sea lo bastante grande, su rendimiento paga las pensiones sin depender de cuántas personas trabajen.</>}>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <Regulador etiqueta="Lo que entra al fondo cada año" valor={aporte} min={0} max={80e9} paso={1e9}
              mostrar={mill(aporte)} onChange={v => setAportacion(v)}
              ayuda={aportacion === null ? 'Empieza con el ahorro neto de la propuesta.' : 'Lo has movido tú.'} />
            <Regulador etiqueta="Rendimiento real al año (lo que gana el fondo por encima de la inflación)" valor={rendimiento} min={0.01} max={0.06} paso={0.005}
              mostrar={porcentaje(rendimiento * 100, 1)} onChange={setRendimiento}
              ayuda="Un fondo mixto de acciones y bonos ha dado históricamente entre un 3 y un 4 % real." />
            <p className="rounded-xl bg-teal-50 p-4 text-[15px] leading-relaxed text-teal-950" aria-live="polite">
              {fondo.llega !== null
                ? <>En <strong>{fondo.llega} años</strong> el fondo podría pagar todas las pensiones y las ayudas aparte con su rendimiento. Necesita {numero(fondo.necesario / 1e12, 2)} billones de euros (millones de millones): {numero(fondo.necesario / FONDO_NORUEGA, 1)} veces el fondo de Noruega.</>
                : <>En 80 años el fondo no llega a pagar todas las pensiones: cubriría el {porcentaje(fondo.puntos[fondo.puntos.length - 1].cubre * 100, 0)}.</>}
            </p>
          </div>
          <CurvaFondo puntos={fondo.puntos} llega={fondo.llega} />
        </div>
        <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-600">
          Mientras el fondo crece, su rendimiento se reinvierte y las pensiones se siguen pagando como hoy, con las cotizaciones; lo que entra al fondo es el ahorro de la propuesta, no un esfuerzo nuevo.
          Cuando el fondo lo paga todo, las cotizaciones para pensiones pueden desaparecer.
          <strong className="font-semibold text-slate-800"> Supone que ese ahorro entra cada año durante todo el camino y que hay tantas personas jubiladas como hoy; si hay más, tarda más.</strong>
        </p>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-600">
          Para comparar: la hucha de las pensiones de hoy tiene {mill(FONDO_RESERVA)}<Fuente id="fondo-reserva-2026" />, y el fondo de Noruega, el mayor del mundo, {numero(FONDO_NORUEGA / 1e12, 2)} billones de euros<Fuente id="fondo-noruega" />.
        </p>
        <Mas titulo="¿y cómo encaja con el impuesto único?">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Todavía no encaja, y es la primera pregunta abierta. La propuesta cuesta {mill(COSTE_PROPUESTA)} al año; con el impuesto único repartido en octavos, la escala nacional recibe bastante menos.
            Hay que decidir si las pensiones tienen su propio tramo del impuesto, si las pagan entre varias escalas o si el fondo se crea antes de dar el paso. Mientras tanto, esta ventana compara con el sistema de hoy, que se paga con cotizaciones.
          </p>
        </Mas>
        <Mas titulo="cómo se hace el paso sin dejar a nadie sin cobrar">
          <ol className="max-w-3xl list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li>Las pensiones de hoy se siguen pagando cada mes; nadie se queda sin cobrar.</li>
            <li>Lo que se ahorra al igualar las pensiones no se gasta: entra al fondo cada año.</li>
            <li>A medida que el fondo crece, su rendimiento paga una parte de las pensiones y las cotizaciones pueden bajar en esa misma parte.</li>
            <li>Cuando el rendimiento lo paga todo, las pensiones ya no dependen de cuántas personas trabajen: el sistema pasa de repartir escasez a repartir lo que produce lo ahorrado.</li>
          </ol>
          <Mas titulo="los riesgos y lo que no cuenta el simulador">
            <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
              <li>El rendimiento no está garantizado: hay años de pérdidas. El simulador usa una media constante.</li>
              <li>Supone que el coste de las pensiones se mantiene como hoy y que el ahorro entra cada año; con más personas jubiladas, haría falta un fondo mayor o más años.</li>
              <li>Un fondo tan grande tiene que invertirse lejos de la política del día a día y con reglas públicas, como el de Noruega.</li>
            </ul>
          </Mas>
        </Mas>
      </Apartado>

      {/* ── 8. Sources ── */}
      <Apartado id="pensiones-fuentes" fondo="blanco" titulo="Fuentes">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {['pensiones-2026', 'pensiones-cuantias', 'pensiones-reparto', 'pensiones-limites', 'pensiones-junio', 'smi-2026', 'pnc-2026', 'pnc-alquiler', 'cotizaciones-2026', 'fondo-reserva-2026', 'fondo-noruega'].map(id => FUENTE[id] && (
            <li key={id}><a href={FUENTE[id].url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{FUENTE[id].titulo}</a></li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-sm text-slate-500">
          Los tramos del medio de las pensiones de hoy son una estimación; los ahorros por otras ayudas y el rendimiento del fondo son supuestos que puedes mover.
        </p>
      </Apartado>
    </>
  );
}

/** The drawing's own width in CSS pixels, so its text stays readable on a phone. */
function useAncho(minimo: number, maximo: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(maximo);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const medir = () => setAncho(Math.max(minimo, Math.min(maximo, Math.round(el.getBoundingClientRect().width))));
    medir();
    const o = new ResizeObserver(medir); o.observe(el);
    return () => o.disconnect();
  }, [minimo, maximo]);
  return { ref, ancho };
}

/** One line of the year's accounts. */
function Linea({ texto, valor, fuerte, tono }: { texto: React.ReactNode; valor: string; fuerte?: boolean; tono?: 'bien' | 'mal' }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 border-b border-slate-100 px-5 py-3 last:border-0 ${fuerte ? 'bg-slate-50' : ''}`}>
      <dt className={fuerte ? 'font-semibold text-slate-900' : 'text-slate-700'}>{texto}</dt>
      <dd className={`shrink-0 tabular-nums ${fuerte ? 'text-lg font-bold' : 'font-medium'} ${tono === 'bien' ? 'text-emerald-700' : tono === 'mal' ? 'text-rose-700' : 'text-slate-900'}`}>{valor}</dd>
    </div>
  );
}

/**
 * The shape of today's pensions against the proposal. X: all pensions from the
 * lowest to the highest (width of each step = how many there are). Y: euros a
 * month. The flat line is the proposal; green is what rises, red what falls.
 */
function FormaPensiones() {
  const { ref, ancho } = useAncho(300, 720);
  const W = ancho, H = Math.round(Math.max(240, ancho * 0.42)), I = 52, D = 10, A = 16, B = 40;
  const total = TRAMOS_PENSION.reduce((s, t) => s + t.pensiones, 0);
  const tramos = [...TRAMOS_PENSION].reverse(); // lowest first
  const yMax = 3600;
  const x = (f: number) => I + f * (W - I - D);
  const y = (e: number) => A + (1 - e / yMax) * (H - A - B);
  let acum = 0;
  const pasos = tramos.map(t => { const x0 = acum / total; acum += t.pensiones; return { t, x0, x1: acum / total }; });
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <figcaption className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">Todas las pensiones, de la más baja a la más alta</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-sm bg-emerald-500/70" />suben</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-sm bg-rose-500/60" />bajan</span>
        <span className="flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-teal-700" />propuesta: {euros(SMI_MES)}</span>
      </figcaption>
      <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label={`Hoy: ${tramos.map(t => `${t.nombre.toLowerCase()}, ${porcentaje(t.pensiones / total * 100, 0)} de las pensiones, ${euros(t.media)} de media`).join('; ')}. Propuesta: todas a ${euros(SMI_MES)}.`}>
        {[0, 1000, 2000, 3000].map(v => (
          <g key={v}>
            <line x1={I} x2={W - D} y1={y(v)} y2={y(v)} className="stroke-slate-200" strokeWidth={1} />
            <text x={I - 8} y={y(v) + 4} textAnchor="end" className="fill-slate-600 text-[12px]">{v === 0 ? '0 €' : `${numero(v)} €`}</text>
          </g>
        ))}
        {pasos.flatMap(({ t, x0, x1 }) => {
          // The 1.000-1.500 € tier straddles the line: its lower part rises, its upper part falls.
          if (t.id !== 'inferior') return [{ t, x0, x1, media: t.media, clave: t.id }];
          const corte = x0 + (x1 - x0) * (SMI_MES - 1_000) / 500;
          return [{ t, x0, x1: corte, media: (1_000 + SMI_MES) / 2, clave: 'inf-a' }, { t, x0: corte, x1, media: (SMI_MES + 1_500) / 2, clave: 'inf-b' }];
        }).map(({ t, x0, x1, media, clave }) => {
          const arriba = media > SMI_MES;
          return (
            <g key={clave}>
              <rect x={x(x0) + 1} width={Math.max(1, x(x1) - x(x0) - 2)} y={y(Math.min(media, SMI_MES))} height={y(0) - y(Math.min(media, SMI_MES))} className="fill-slate-300" />
              <rect x={x(x0) + 1} width={Math.max(1, x(x1) - x(x0) - 2)}
                y={arriba ? y(media) : y(SMI_MES)} height={Math.abs(y(media) - y(SMI_MES))}
                className={arriba ? 'fill-rose-500/60' : 'fill-emerald-500/70'} />
              {clave !== 'inf-a' && (clave === 'inf-b' || x(x1) - x(x0) > 30) && (
                <text x={clave === 'inf-b' ? (x(pasos.find(p => p.t.id === 'inferior')!.x0) + x(x1)) / 2 : (x(x0) + x(x1)) / 2} y={H - B + 16} textAnchor="middle" className="fill-slate-700 text-[12px]">{porcentaje(t.pensiones / total * 100, 0)}</text>
              )}
            </g>
          );
        })}
        <line x1={I} x2={W - D} y1={y(SMI_MES)} y2={y(SMI_MES)} className="stroke-teal-700" strokeWidth={3} />
        <text x={I + 8} y={y(SMI_MES) - 10} className="fill-teal-900 text-[14px] font-bold">{euros(SMI_MES)} para todos</text>
        <text x={x(1) - 4} y={y(PENSION_MAXIMA) - 6} textAnchor="end" className="fill-slate-600 text-[11px]">máxima {euros(PENSION_MAXIMA)}</text>
        <text x={I + 4} y={H - 6} className="fill-slate-500 text-[11px]">% de las pensiones en cada tramo</text>
      </svg>
      </div>
      <p className="mt-1 text-[13px] text-slate-600">Altura: lo que cobra de media cada tramo al mes. Anchura: cuántas pensiones hay en él. La mínima de jubilación es {euros(PENSION_MINIMA_JUBILACION, 2)}; muchas pensiones de viudedad y orfandad están por debajo.</p>
    </figure>
  );
}

/** Change per month in each tier, as diverging bars, with how many pensions. */
function Ganadores() {
  const max = Math.max(...CAMBIOS.map(c => Math.abs(c.cambioMes)));
  return (
    <div className="space-y-3">
      {CAMBIOS.map(c => {
        const sube = c.cambioMes >= 0;
        const ancho = Math.abs(c.cambioMes) / max * 50;
        return (
          <div key={c.tramo.id} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[13rem_minmax(0,1fr)_11rem]">
            <div>
              <p className="font-semibold text-slate-900">{c.tramo.nombre}</p>
              <p className="text-xs text-slate-500">{c.tramo.rango}</p>
            </div>
            <div className="relative h-8 rounded bg-slate-50" aria-hidden>
              <span className="absolute inset-y-0 left-1/2 w-px bg-slate-300" />
              <span className={`absolute inset-y-1 rounded ${sube ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={sube ? { left: '50%', width: `${ancho}%` } : { right: '50%', width: `${ancho}%` }} />
            </div>
            <p className="col-span-2 text-sm tabular-nums sm:col-span-1">
              <span className={`font-bold ${sube ? 'text-emerald-700' : 'text-rose-700'}`}>{sube ? '+' : '−'}{euros(Math.abs(c.cambioMes))}</span>
              <span className="text-slate-600"> al mes de media · </span>
              <span className="text-slate-600">{c.ganan > 0 && c.pierden > 0 ? `${numero(c.ganan / 1e6, 1)} M suben, ${numero(c.pierden / 1e6, 1)} M bajan` : `${numero((c.ganan + c.pierden) / 1e6, 1)} M ${c.ganan > 0 ? 'suben' : 'bajan'}`}</span>
            </p>
          </div>
        );
      })}
      <p className="pt-2 text-[13px] text-slate-600">Las medias de los tramos del medio son estimaciones (están explicadas en «Las de hoy»).</p>
    </div>
  );
}

/** Where each euro of a wage goes, as one stacked bar. */
function CosteSueldo() {
  const irpf = BRUTO_EJEMPLO * IRPF_EJEMPLO;
  const trab = BRUTO_EJEMPLO * COTIZA_TRABAJADOR;
  const emp = BRUTO_EJEMPLO * COTIZA_EMPRESA;
  const partes = [
    { t: 'Lo que cobra el trabajador', v: NETO_EJEMPLO, c: 'bg-teal-600', texto: 'text-white' },
    { t: 'IRPF', v: irpf, c: 'bg-slate-400', texto: 'text-white' },
    { t: 'Cotización del trabajador', v: trab, c: 'bg-amber-300', texto: 'text-slate-900' },
    { t: 'Cotización de la empresa', v: emp, c: 'bg-amber-500', texto: 'text-slate-900' },
  ];
  return (
    <div>
      <div className="flex h-14 w-full overflow-hidden rounded-xl" role="img"
        aria-label={partes.map(p => `${p.t}: ${euros(p.v)}`).join(', ')}>
        {partes.map(p => (
          <div key={p.t} className={`${p.c} ${p.texto} flex items-center justify-center border-r-2 border-white px-1 text-xs font-semibold tabular-nums last:border-r-0 sm:text-sm`}
            style={{ width: `${p.v / COSTE_EMPRESA_EJEMPLO * 100}%` }}>
            {p.v / COSTE_EMPRESA_EJEMPLO > 0.14 && euros(Math.round(p.v))}
          </div>
        ))}
      </div>
      <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
        {partes.map(p => (
          <li key={p.t} className="flex items-center gap-2">
            <span aria-hidden className={`h-3 w-3 shrink-0 rounded-sm ${p.c}`} />
            {p.t}: <strong className="tabular-nums">{euros(Math.round(p.v))}</strong>
            <span className="text-slate-500">({porcentaje(p.v / COSTE_EMPRESA_EJEMPLO * 100, 0)})</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-slate-500">Total para la empresa: {euros(Math.round(COSTE_EMPRESA_EJEMPLO))} por paga, 14 pagas al año.</p>
    </div>
  );
}

/** The share of pensions the fund's return pays, year by year. */
function CurvaFondo({ puntos, llega }: { puntos: { ano: number; cubre: number }[]; llega: number | null }) {
  const { ref, ancho } = useAncho(300, 640);
  const W = ancho, H = Math.round(Math.max(220, ancho * 0.44)), I = 44, D = 14, A = 14, B = 34;
  const n = puntos.length - 1;
  const x = (a: number) => I + (a / n) * (W - I - D);
  const y = (c: number) => A + (1 - c) * (H - A - B);
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(p.ano).toFixed(1)},${y(p.cubre).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(n)},${y(0)} L${x(0)},${y(0)} Z`;
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <figcaption className="mb-2 text-sm font-semibold text-slate-900">Parte de las pensiones que el rendimiento del fondo ya podría pagar</figcaption>
      <div ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label={llega !== null ? `La curva llega al 100 % en el año ${llega}.` : 'La curva no llega al 100 % en 80 años.'}>
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <g key={v}>
            <line x1={I} x2={W - D} y1={y(v)} y2={y(v)} className="stroke-slate-200" />
            <text x={I - 6} y={y(v) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{v * 100} %</text>
          </g>
        ))}
        {(W < 420 ? [0, 40, 80] : [0, 20, 40, 60, 80]).filter(a => a <= n).map(a => (
          <text key={a} x={x(a)} y={H - 12} textAnchor={a === 0 ? 'start' : a === n ? 'end' : 'middle'} className="fill-slate-500 text-[11px]">{a === 0 ? 'hoy' : `${a} años`}</text>
        ))}
        <path d={area} className="fill-teal-500/15" />
        <path d={linea} className="fill-none stroke-teal-700" strokeWidth={2.5} />
        {llega !== null && (
          <g>
            <line x1={x(llega)} x2={x(llega)} y1={y(0)} y2={y(1)} className="stroke-teal-700" strokeDasharray="4 4" />
            <circle cx={x(llega)} cy={y(1)} r={5} className="fill-teal-700 stroke-white" strokeWidth={2} />
            <text x={x(llega) - 10} y={y(1) + 18} textAnchor="end" className="fill-teal-900 stroke-white text-[12px] font-semibold" strokeWidth={4} paintOrder="stroke">{W < 420 ? `año ${llega}` : `año ${llega}: podría pagarlo todo`}</text>
          </g>
        )}
      </svg>
      </div>
    </figure>
  );
}
