// The country's accounts under the model (the two readings of «every
// transaction», the three tiers), a sandbox to classify purchases differently,
// and the open problems, said plainly: a proposal that hides what does not add
// up yet teaches people to stop reading it.
import { useState } from 'react';
import { cn } from '../../utils/cn';
import {
  ALQUILER_IMPUTADO, CLASIFICACION_INICIAL, EJEMPLO_INICIAL, EPF_TOTAL, EMPLEADORES, ESPANA, FUENTE, GRUPOS_GASTO, HOY, OCTAVO, TIPO_GENERAL, TRAMO, TRAMOS,
  type Clasificacion, type Empleador, type Modo, type Tramo,
  calcularEjemplo, cuentasPais, euros, irpfMadrid, millones, modeloPorFuncion, numero, porcentaje, sumaGasto, SUPUESTOS,
} from '../../data/modeloSocioeconomico';
import { Boton, Fuente, Libre, Segmentado } from './piezas';
import { TONO_TRAMO } from './Tramos';

const LECTURAS: { id: Modo; titulo: string; texto: string }[] = [
  {
    id: 'eslabon', titulo: 'Sin cascada entre empresas',
    texto: 'Los sueldos y todas las compras pagan su tramo, también las de las empresas. Cuando una empresa vende, recupera al instante lo que pagó por sus materiales: así cada producto lleva exactamente su tramo, nunca un impuesto encima de otro. Es la lectura que usa esta página por defecto.',
  },
  {
    id: 'literal', titulo: 'Al pie de la letra, también entre empresas',
    texto: `Las compras entre empresas dejan además el tipo general, un ${porcentaje(TIPO_GENERAL * 100, 0)}, sin devolución. Recauda más del doble, pero el impuesto se acumula en cada eslabón de la cadena: hasta el pan del tramo 1 llega con impuesto escondido.`,
  },
];

/** The bread chain: wheat → flour → bread, with the value each link adds (before tax). */
function cadena(tramo: Tramo) {
  const anade = [0.5, 0.3, 0.8]; // farmer, mill, bakery
  const tf = TRAMO[tramo].tipo;
  const neto = anade.reduce((s, x) => s + x, 0);
  // Without cascade: the final price carries exactly its tier.
  const precioEslabon = neto / (1 - tf);
  // Literally: each business sale keeps the general rate; the last sale, the product's tier.
  let coste = 0, impuesto = 0, precio = 0;
  anade.forEach((a, i) => {
    const t = i === anade.length - 1 ? tf : TIPO_GENERAL;
    precio = (coste + a) / (1 - t); impuesto += precio * t; coste = precio;
  });
  return { precioEslabon, impuestoEslabon: precioEslabon * tf, precioLiteral: precio, impuestoLiteral: impuesto };
}

function Chip({ t }: { t: Tramo }) {
  return <span className={cn('rounded px-1.5 py-0.5 text-xs font-bold tabular-nums', TONO_TRAMO[t])}>{t}: {porcentaje(TRAMO[t].tipo * 100, 0)}</span>;
}

export function LasCuentas({ modo, onModo }: { modo: Modo; onModo: (m: Modo) => void }) {
  const pais = cuentasPais(modo);
  const otros = cuentasPais(modo === 'eslabon' ? 'literal' : 'eslabon');
  const pan = cadena(1);
  return (
    <div className="space-y-8">
      <div role="radiogroup" aria-label="Cómo se entiende «todas las transacciones»" className="grid gap-4 md:grid-cols-2">
        {LECTURAS.map(l => {
          const c = l.id === modo ? pais : otros;
          const sel = l.id === modo;
          return (
            <Libre key={l.id} role="radio" aria-checked={sel} onClick={() => onModo(l.id)}
              className={cn('block h-full w-full rounded-2xl border-2 p-5 text-left transition-colors',
                sel ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white/60 hover:border-slate-400')}>
              <span className="flex items-center gap-2 text-base font-bold text-slate-900">
                <span aria-hidden className={cn('grid h-4 w-4 place-items-center rounded-full border-2', sel ? 'border-slate-900' : 'border-slate-400')}>
                  {sel && <span className="h-2 w-2 rounded-full bg-slate-900" />}
                </span>
                {l.titulo}
              </span>
              <span className="mt-2 block text-sm font-normal leading-relaxed text-slate-600">{l.texto}</span>
              <span className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
                <span><b className="text-lg tabular-nums text-slate-900">{porcentaje(c.pctPIB, 0)}</b> del PIB</span>
                <span><b className="text-lg tabular-nums text-slate-900">{millones(c.porEscala)}</b> por escala</span>
                <span><b className="text-lg tabular-nums text-slate-900">{euros(c.porPersonaEscala)}</b> por persona y escala</span>
              </span>
            </Libre>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[600px] text-sm">
            <caption className="px-5 pt-5 text-left text-lg font-bold text-slate-900">Sobre qué se cobra y cuánto, en un año (España, 2025)</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th scope="col" className="px-5 py-2 font-medium">Pagos</th>
                <th scope="col" className="whitespace-nowrap px-3 py-2 text-right font-medium">Millones de €</th>
                <th scope="col" className="px-3 py-2 font-medium">Tramo</th>
                <th scope="col" className="whitespace-nowrap px-5 py-2 text-right font-medium">Al fondo</th>
              </tr>
            </thead>
            {pais.componentes.map(b => (
              <tbody key={b.id} className="border-b border-slate-200">
                <tr className="align-top">
                  <th scope="rowgroup" colSpan={4} className="px-5 pb-1 pt-3 text-left font-normal">
                    <span className="font-semibold text-slate-900">{b.nombre}</span>
                    <span className="block text-xs leading-snug text-slate-500">
                      {b.explicacion} {b.estimacion && <span className="italic">{b.estimacion}</span>}
                      {b.fuente && <Fuente id={b.fuente} />}
                    </span>
                  </th>
                </tr>
                {b.partes.map(p => (
                  <tr key={p.nombre} className="tabular-nums">
                    <th scope="row" className="py-1 pl-8 pr-3 text-left font-normal text-slate-700">{p.nombre}</th>
                    <td className="px-3 py-1 text-right text-slate-700">{numero(p.millones)}</td>
                    <td className="px-3 py-1">{p.tramo ? <Chip t={p.tramo} /> : <span className="text-xs text-slate-500">0 %</span>}</td>
                    <td className="px-5 py-1 text-right text-slate-900">{numero(p.millones * p.tipo)}</td>
                  </tr>
                ))}
                <tr><td colSpan={4} className="pb-2" /></tr>
              </tbody>
            ))}
            <tfoot className="tabular-nums">
              <tr className="border-b border-slate-100">
                <th scope="row" className="px-5 py-2 text-left font-semibold text-slate-900">Total</th>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">{numero(pais.base)}</td>
                <td className="px-3 py-2 text-xs text-slate-500">de media, {porcentaje(pais.tipoMedio * 100)}</td>
                <td className="px-5 py-2 text-right font-semibold text-slate-900">{numero(pais.recaudacion)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={3} className="px-5 py-2 pb-4 text-left text-slate-700">÷ 8 = lo que recibe cada escala</th>
                <td className="px-5 py-2 pb-4 text-right font-semibold text-slate-900">{numero(pais.recaudacion * OCTAVO)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold text-slate-900">Comparado con hoy</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-600">Impuestos y cotizaciones de hoy (2025)<Fuente id="ijm-2026" /></dt><dd className="tabular-nums font-semibold text-slate-900">≈ {millones(HOY.impuestosYCotizaciones2025)} (38&nbsp;%)</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-600">Todos los ingresos públicos de hoy<Fuente id="bde-ingresos" /></dt><dd className="tabular-nums font-semibold text-slate-900">{porcentaje(HOY.ingresosPublicosPct2025)} del PIB</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-600">El modelo, en esta lectura</dt><dd className="tabular-nums font-semibold text-slate-900">{millones(pais.recaudacion)} ({porcentaje(pais.pctPIB, 0)})</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              PIB de 2025: {millones(ESPANA.pib)}<Fuente id="ine-pib" />. Población: {numero(ESPANA.poblacion)} personas<Fuente id="ine-poblacion" />.
              Los tramos se aplican a cada pago, no a la economía: el mismo euro cambia de manos varias veces al año.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold text-slate-900">Un pan del tramo 1</h3>
            <p className="mt-1 text-sm text-slate-600">El agricultor aporta 0,50 € de valor, el molino 0,30 € y la panadería 0,80 €.</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div><dt className="font-semibold text-slate-900">Sin cascada entre empresas</dt><dd className="tabular-nums text-slate-700">Cuesta {euros(pan.precioEslabon, 2)} y no lleva impuesto: {euros(pan.impuestoEslabon, 2)}.</dd></div>
              <div><dt className="font-semibold text-slate-900">Al pie de la letra</dt><dd className="tabular-nums text-slate-700">Cuesta {euros(pan.precioLiteral, 2)}, de los que {euros(pan.impuestoLiteral, 2)} se quedaron en el fondo por el camino: el {porcentaje((pan.impuestoLiteral / pan.precioLiteral) * 100, 0)}.</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Al pie de la letra, el tramo 1 deja de ser cero: lo pagan el molino y la panadería al comprar, y llega dentro del precio. Por eso empuja a las empresas a fusionarse para saltarse intermediarios. España tuvo un impuesto así, el IGTE, hasta que en 1986 llegó el IVA.</p>
          </div>
        </div>
      </div>

      <Clasifica modo={modo} />
    </div>
  );
}

/** Classify household purchases differently and see what changes. */
function Clasifica({ modo }: { modo: Modo }) {
  const [clasif, setClasif] = useState<Clasificacion>(CLASIFICACION_INICIAL);
  const base = cuentasPais(modo);
  const prueba = cuentasPais(modo, clasif);
  const cambiado = GRUPOS_GASTO.some(g => clasif[g.id] !== g.tramo);
  const compras = (c: ReturnType<typeof cuentasPais>) => c.componentes.find(x => x.id === 'compras')!.recaudacion;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="text-lg font-bold text-slate-900">Clasifica tú las compras</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Qué es primera necesidad, qué es segunda y qué es lujo lo decide la gente. Mueve cada tipo de gasto de las familias a otro tramo y mira cuánto cambia lo que se recauda.
            Su peso sale de la Encuesta de Presupuestos Familiares de 2024<Fuente id="ine-epf" />.
          </p>
        </div>
        {cambiado && <Boton onClick={() => setClasif(CLASIFICACION_INICIAL)}>Volver a la propuesta</Boton>}
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
        <ul className="divide-y divide-slate-100">
          {GRUPOS_GASTO.map(g => (
            <li key={g.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2 text-sm">
              <span className="min-w-0">
                <span className="text-slate-900">{g.nombre}</span>
                <span className="ml-2 tabular-nums text-slate-500">{porcentaje((g.pct / (EPF_TOTAL - ALQUILER_IMPUTADO)) * 100, 1)} de lo que pagan</span>
              </span>
              <Segmentado<string> etiqueta={`Tramo de ${g.nombre.toLowerCase()}`} valor={String(clasif[g.id])} onChange={v => setClasif({ ...clasif, [g.id]: Number(v) as Tramo })}
                opciones={TRAMOS.map(t => ({ id: String(t.id), texto: porcentaje(t.tipo * 100, 0) }))} />
            </li>
          ))}
        </ul>
        <dl className="h-fit space-y-4 rounded-xl bg-slate-50 p-4 text-sm tabular-nums">
          <div><dt className="text-slate-600">Lo que dejan las compras de las familias</dt><dd className="text-xl font-bold text-slate-900">{millones(compras(prueba))}</dd><dd className="text-xs text-slate-500">con la propuesta, {millones(compras(base))}</dd></div>
          <div><dt className="text-slate-600">Todo lo recaudado</dt><dd className="text-xl font-bold text-slate-900">{millones(prueba.recaudacion)} ({porcentaje(prueba.pctPIB, 1)} del PIB)</dd><dd className="text-xs text-slate-500">con la propuesta, {millones(base.recaudacion)}</dd></div>
          <div><dt className="text-slate-600">Por persona y escala</dt><dd className="text-xl font-bold text-slate-900">{euros(prueba.porPersonaEscala)} al año</dd><dd className="text-xs text-slate-500">con la propuesta, {euros(base.porPersonaEscala)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

// ── WHAT IS STILL TO BE SOLVED ──────────────────────────────────────────────
export function Retos({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const lit = cuentasPais('literal');
  const esl = cuentasPais('eslabon');
  const porFuncion = modeloPorFuncion(modo);
  const [proteccion, salud, educacion] = (['proteccion', 'salud', 'educacion'] as const).map(id => porFuncion.find(f => f.id === id)!);
  const turistas = pais.componentes.find(c => c.id === 'turistas')!.recaudacion;
  const nominaAnual = HOY.nominaPensionesMes * 14;
  // Who pays more, net: three wages × three company sizes, same household as the worked example,
  // spending three quarters of today's net pay, split like the example's basket.
  const cuotas = { 1: EJEMPLO_INICIAL.gasto[1] / sumaGasto(EJEMPLO_INICIAL.gasto), 2: EJEMPLO_INICIAL.gasto[2] / sumaGasto(EJEMPLO_INICIAL.gasto), 3: EJEMPLO_INICIAL.gasto[3] / sumaGasto(EJEMPLO_INICIAL.gasto) };
  const tamanos: Empleador[] = ['pequena', 'mediana', 'grande'];
  const casos = [16_000, 26_000, 50_000].map(bruto => {
    const netoHoy = bruto - Math.min(bruto, SUPUESTOS.baseMaximaAnual) * SUPUESTOS.cotTrabajador - irpfMadrid(bruto);
    const mes = (netoHoy * 0.75) / 12;
    const gasto = { 1: mes * cuotas[1], 2: mes * cuotas[2], 3: mes * cuotas[3] };
    const r = (empleador: Empleador) => calcularEjemplo({ ...EJEMPLO_INICIAL, bruto, empleador, gasto }, modo);
    return { bruto, hoy: r('pequena').pctHoy, modelo: tamanos.map(t => r(t).pctModelo) };
  });
  const retos: { t: string; d: React.ReactNode }[] = [
    {
      t: 'De las pensiones al apoyo mutuo: la transición',
      d: <>Hoy se pagan {numero(HOY.pensionesContributivas / 1e6, 1)} millones de pensiones contributivas a unos {numero(HOY.pensionistas / 1e6, 1)} millones de personas: {millones(HOY.nominaPensionesMes)} al mes, unos {millones(nominaAnual)} al año con las pagas extra<Fuente id="pensiones-2026" /> (en 2024, contando las de las administraciones, {millones(HOY.pensiones2024)}<Fuente id="igae-cofog" />).
        El modelo no tiene pensiones constantes salvo por discapacidad, pero quien ya cobra una, o lleva décadas cotizando, no puede quedarse sin nada de un día para otro.
        Con el reparto inicial, todas las escalas de España juntas dedican a «apoyo mutuo y empleo» {millones(proteccion.modelo)}: la transición no cabe ahí.
        Caminos posibles: un fondo de transición con un tramo temporal que se extinga con las pensiones ya reconocidas; convertir lo cotizado en participaciones; o que la escala nacional dedique más a ello durante una generación.
        Esta página entiende que la dependencia por la edad cuenta como discapacidad.</>,
    },
    {
      t: 'Recauda mucho menos que hoy',
      d: <>Sin cascada entre empresas, el modelo recauda ≈ {porcentaje(esl.pctPIB, 0)} del PIB, frente al ≈ 38 % de hoy en impuestos y cotizaciones; al pie de la letra, ≈ {porcentaje(lit.pctPIB, 0)}, a costa de la cascada.
        Con el reparto inicial, la salud pasaría de {millones(salud.hoy)} a {millones(salud.modelo)} y la educación de {millones(educacion.hoy)} a {millones(educacion.modelo)}:
        para dar lo mismo, los servicios tendrían que costar unas {numero(salud.hoy / salud.modelo, 0)} veces menos. Caminos: tramos más altos, más gasto en el tramo 2 o 3, que las asambleas den más peso a esos ámbitos, o que una parte deje de ser pública.</>,
    },
    {
      t: '¿Quién paga más?',
      d: (
        <>
          La progresividad ya no sale del sueldo, sino de lo que se compra y de quién paga: con el mismo trabajo, quien está en una empresa grande aporta el 40 % de lo que vale y quien está en una pequeña, nada.
          El dividendo, igual para todas las personas, devuelve una parte. Aportación neta sobre lo que la empresa paga por cada trabajo, para el mismo hogar del caso de arriba, gastando tres cuartas partes del sueldo neto de hoy:
          <span className="mt-2 block overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm tabular-nums">
              <thead>
                <tr className="text-left text-slate-500">
                  <th scope="col" className="py-1 pr-3 font-medium">Sueldo bruto</th>
                  <th scope="col" className="py-1 pr-3 text-right font-medium">Hoy</th>
                  {tamanos.map(t => <th key={t} scope="col" className="py-1 pr-3 text-right font-medium">Empresa {EMPLEADORES.find(x => x.id === t)!.corto.toLowerCase()}</th>)}
                </tr>
              </thead>
              <tbody>{casos.map(c => (
                <tr key={c.bruto} className="border-t border-slate-100">
                  <td className="py-1 pr-3">{euros(c.bruto)}</td>
                  <td className="py-1 pr-3 text-right">{porcentaje(c.hoy * 100, 0)}</td>
                  {c.modelo.map((m, k) => <td key={k} className="py-1 pr-3 text-right">{porcentaje(m * 100, 0)}</td>)}
                </tr>
              ))}</tbody>
            </table>
          </span>
        </>
      ),
    },
    {
      t: 'Crecer de 49 a 50 personas',
      d: <>Con tramos por tamaño, la empresa número 50 paga de golpe el 20 % de todos sus sueldos, y la 250, el 40 %. Eso empuja a no crecer o a partirse. Contar el grupo de empresas lo frena, pero no del todo.
        Una salida: que funcione como los tramos del IRPF, por persona contratada (las 49 primeras al 0 %, de la 50 a la 249 al 20 %, el resto al 40 %), para que crecer nunca cueste más de lo que añade.</>,
    },
    {
      t: 'Dónde está la línea entre necesidad y lujo',
      d: <>Hoy el IVA ya discute si unas gafas, unas compresas o el veterinario son de primera necesidad. Con un 40 % en juego, cada frontera valdrá más. Y dentro del tramo 1 cabe el lujo: un coche de 90.000 € como primer vehículo, o una casa enorme como vivienda habitual.
        Una salida: que por encima de un precio, que decide la asamblea, lo básico pase al tramo 3. No está en las cuentas de esta página. El simulador de arriba deja probar otras clasificaciones.</>,
    },
    {
      t: 'Turismo y hostelería al 40 %',
      d: <>Restaurantes, bares y hoteles pasan del 10 % de IVA de hoy, que se suma al precio sin impuesto, al 40 % del precio final: con los mismos costes, sus precios subirían alrededor de un 50 %. Los turistas dejarían {millones(turistas)} al año en el fondo<Fuente id="egatur-2025" />,
        pero España compite con otros destinos. Las asambleas podrían llevar la hostelería del día a día al tramo 2.</>,
    },
    {
      t: 'Comprar o alquilar una casa',
      d: <>La vivienda en la que se vive, comprada o alquilada, va en el tramo 1 y no paga. Una segunda vivienda o una de inversión paga el {porcentaje(TRAMO[2].tipo * 100, 0)} en cada venta: {euros(200_000 * TRAMO[2].tipo)} por un piso de {euros(200_000)}, frente a los {euros(200_000 * 0.06)}–{euros(200_000 * 0.10)} del impuesto de transmisiones de hoy.
        Una salida es tratar la casa usada como el resto de la cadena: que solo pague la diferencia entre lo que costó y lo que se vende.</>,
    },
    {
      t: 'La deuda que ya existe',
      d: <>En 2025 las administraciones pagaron {millones(HOY.intereses2025)} en intereses de la deuda pública<Fuente id="intereses" />, más de lo que se gasta en defensa, cultura y vivienda juntas. El modelo no reserva nada para eso. Caminos posibles: que la escala nacional la pague durante una transición, o un tramo temporal hasta reducirla. Mientras no se decida, las cifras de esta página son un punto de llegada, no el primer año.</>,
    },
    {
      t: 'Los precios y los sueldos se moverían',
      d: <>Todas las cifras usan los precios y los sueldos de hoy. Al desaparecer las cotizaciones y cambiar los tramos, los sueldos y los precios cambiarían, y la gente compraría y trabajaría de otra manera: menos en el tramo 3, más en el 1. Esta página es una foto fija para comparar, no una previsión de lo que pasaría.</>,
    },
    {
      t: 'Europa, el planeta y los gobiernos de hoy',
      d: <>Mientras los demás países no adopten el modelo, las escalas europea y planetaria no tienen quien las gestione: España podría guardar sus {millones(pais.porEscala * 2)} en un fondo para proyectos europeos y mundiales, o empezar con menos.
        Tampoco está decidido si las asambleas sustituyen a los plenos municipales, los parlamentos y los gobiernos elegidos de hoy o trabajan con ellos.</>,
    },
    {
      t: 'El efectivo y la economía sumergida',
      d: <>El cobro automático solo funciona si los pagos pasan por el sistema de pago. El efectivo tendría que limitarse a cantidades pequeñas o pasar al euro digital. A cambio, sin declaraciones ni deducciones hay mucho menos que esconder. El economista Edgar Feige propuso algo parecido en Estados Unidos: un impuesto automático y diminuto sobre todos los pagos, también los financieros, para sustituir a todos los demás<Fuente id="apt" />.</>,
    },
    {
      t: 'El comercio con otros países',
      d: <>Lo que se importa pagaría su tramo al entrar, como hoy el IVA; lo que se exporta, en el país de quien lo compra. Dentro de la Unión Europea, la parte de las compras podría ser el propio IVA, que la UE obliga a mantener; el resto exige acordarlo con los demás países.</>,
    },
    {
      t: 'Las comunidades vecinales como administración',
      d: <>Hace falta un registro público, cuentas auditadas y que voten todas las personas que viven allí, no solo las propietarias. Hoy hay ≈ {numero(HOY.comunidades)} comunidades de propietarios<Fuente id="cafmadrid" />; quien vive en una casa independiente recibe esa parte en su hogar.</>,
    },
  ];
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-8 md:grid-cols-2">
      {retos.map(r => (
        <li key={r.t} className="border-l-2 border-slate-300 pl-5">
          <div>
            <h3 className="text-lg font-bold leading-snug text-slate-900">{r.t}</h3>
            <div className="mt-1 text-[15px] leading-relaxed text-slate-700">{r.d}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ListaFuentes() {
  return (
    <ul className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
      {Object.values(FUENTE).map(f => (
        <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
      ))}
    </ul>
  );
}
