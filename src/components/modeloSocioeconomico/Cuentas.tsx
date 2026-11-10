// The country's accounts under the model (the two readings of «every
// transaction»), and the open problems, said plainly: a proposal that hides
// what does not add up yet teaches people to stop reading it.
import { cn } from '../../utils/cn';
import {
  BASE, ESPANA, FUENTE, HOY, type Modo, cuentasPais, calcularEjemplo, irpfMadrid, euros, millones, numero, porcentaje, PARTE_ESCALA, TIPO, SUPUESTOS,
} from '../../data/modeloSocioeconomico';
import { Fuente, Libre } from './piezas';

const LECTURAS: { id: Modo; titulo: string; texto: string }[] = [
  {
    id: 'eslabon', titulo: 'Una vez en cada producto',
    texto: 'Todas las transacciones pagan el 20 %. Cuando una empresa vende, recupera al instante el 20 % que pagó por sus materiales: así cada producto lleva un 20 % exacto, nunca un 20 % sobre otro 20 %. Es la lectura que usa esta página por defecto.',
  },
  {
    id: 'literal', titulo: 'Todas las transacciones, al pie de la letra',
    texto: 'También las compras entre empresas dejan su 20 % en el fondo. Recauda casi el doble, pero el impuesto se acumula en cada eslabón de la cadena y los productos con más intermediarios pagan más.',
  },
];

/** The bread example: wheat → flour → bread, with the value each link adds (before tax). */
function cadenaPan() {
  const anade = [0.5, 0.3, 0.8]; // farmer, mill, bakery
  // Once per product: the final price carries exactly 20 %.
  const neto = anade.reduce((s, x) => s + x, 0);
  const precioEslabon = neto / (1 - TIPO);
  // Literally: each sale keeps 20 % of its price, and the next link pays that price.
  let coste = 0, impuesto = 0, precio = 0;
  for (const a of anade) { precio = (coste + a) / (1 - TIPO); impuesto += precio * TIPO; coste = precio; }
  return { precioEslabon, impuestoEslabon: precioEslabon * TIPO, precioLiteral: precio, impuestoLiteral: impuesto };
}

export function LasCuentas({ modo, onModo }: { modo: Modo; onModo: (m: Modo) => void }) {
  const pais = cuentasPais(modo);
  const otros = cuentasPais(modo === 'eslabon' ? 'literal' : 'eslabon');
  const pan = cadenaPan();
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
          <table className="w-full min-w-[560px] text-sm">
            <caption className="px-5 pt-5 text-left text-lg font-bold text-slate-900">Sobre qué se cobra el {porcentaje(TIPO * 100, 0)} en un año (España, 2025)</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th scope="col" className="px-5 py-2 font-medium">Pagos</th>
                <th scope="col" className="whitespace-nowrap px-5 py-2 text-right font-medium">Millones de €</th>
              </tr>
            </thead>
            <tbody>
              {BASE.map(b => {
                const cuenta = b.modos.includes(modo);
                return (
                  <tr key={b.id} className={cn('border-b border-slate-100 align-top', !cuenta && 'text-slate-400')}>
                    <th scope="row" className="px-5 py-2.5 text-left font-normal">
                      <span className={cn('font-semibold', cuenta ? 'text-slate-900' : 'text-slate-400 line-through decoration-slate-300')}>{b.nombre}</span>
                      {!cuenta && <span className="ml-2 text-xs">no cuenta en esta lectura</span>}
                      <span className="block text-xs leading-snug text-slate-500">
                        {b.explicacion} {b.estimacion && <span className="italic">{b.estimacion}</span>}
                        {b.fuente && <Fuente id={b.fuente} />}
                      </span>
                    </th>
                    <td className="px-5 py-2.5 text-right tabular-nums">{numero(b.millones)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="tabular-nums">
              <tr className="border-b border-slate-100"><th scope="row" className="px-5 py-2 text-left font-semibold text-slate-900">Total de pagos (la base)</th><td className="px-5 py-2 text-right font-semibold text-slate-900">{numero(pais.base)}</td></tr>
              <tr className="border-b border-slate-100"><th scope="row" className="px-5 py-2 text-left text-slate-700">× {porcentaje(TIPO * 100, 0)} = lo que se recauda</th><td className="px-5 py-2 text-right font-semibold text-slate-900">{numero(pais.recaudacion)}</td></tr>
              <tr><th scope="row" className="px-5 py-2 pb-4 text-left text-slate-700">÷ 8 = lo que recibe cada escala ({porcentaje(PARTE_ESCALA * 100)})</th><td className="px-5 py-2 pb-4 text-right font-semibold text-slate-900">{numero(pais.porEscala)}</td></tr>
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
              «20 % de cada pago» no es «20 % de la economía»: el mismo euro cambia de manos varias veces al año.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold text-slate-900">Un pan de {euros(pan.precioEslabon, 2)}</h3>
            <p className="mt-1 text-sm text-slate-600">El agricultor aporta 0,50 € de valor, el molino 0,30 € y la panadería 0,80 €.</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div><dt className="font-semibold text-slate-900">Una vez en cada producto</dt><dd className="tabular-nums text-slate-700">Cuesta {euros(pan.precioEslabon, 2)}, de los que {euros(pan.impuestoEslabon, 2)} van al fondo: el {porcentaje((pan.impuestoEslabon / pan.precioEslabon) * 100, 0)}.</dd></div>
              <div><dt className="font-semibold text-slate-900">Al pie de la letra</dt><dd className="tabular-nums text-slate-700">Cuesta {euros(pan.precioLiteral, 2)}, de los que {euros(pan.impuestoLiteral, 2)} van al fondo: el {porcentaje((pan.impuestoLiteral / pan.precioLiteral) * 100, 0)}.</dd></div>
            </dl>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Con tres eslabones, la lectura literal ya cobra más de un tercio del precio. Por eso empuja a las empresas a fusionarse para saltarse intermediarios. España tuvo un impuesto así, el IGTE, hasta que en 1986 llegó el IVA.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── WHAT IS STILL TO BE SOLVED ──────────────────────────────────────────────
export function Retos({ modo }: { modo: Modo }) {
  const pais = cuentasPais(modo);
  const lit = cuentasPais('literal');
  const esl = cuentasPais('eslabon');
  // Who pays more, net: three wages, spending three quarters of today's net pay.
  const casos = [16_000, 26_000, 50_000].map(bruto => {
    const netoHoy = bruto - Math.min(bruto, SUPUESTOS.baseMaximaAnual) * SUPUESTOS.cotTrabajador - irpfMadrid(bruto);
    const r = calcularEjemplo({ bruto, gastoMes: (netoHoy * 0.75) / 12, pareja: false, enComunidad: true }, modo);
    return { bruto, hoy: r.totalHoy / r.costeTrabajo, modelo: r.aportaNeto / r.costeTrabajo };
  });
  const difHoy = Math.round((casos[2].hoy - casos[0].hoy) * 100);
  const difModelo = Math.round((casos[2].modelo - casos[0].modelo) * 100);
  const retos: { t: string; d: React.ReactNode }[] = [
    {
      t: 'Las pensiones no caben en una sola escala',
      d: <>Hoy las pensiones cuestan {millones(HOY.pensiones2024)} al año<Fuente id="igae-cofog" />; la escala nacional recibiría {millones(pais.porEscala)}. Caminos posibles: una transición en la que las pensiones ya reconocidas se siguen pagando con un fondo propio mientras se reduce; el dividendo individual como pensión básica para todas las personas; o que las asambleas cambien los pesos para dar más a la escala nacional. Es la primera decisión que el modelo tiene que tomar.</>,
    },
    {
      t: 'Recauda distinto que hoy',
      d: <>Una vez en cada producto, el modelo recauda ≈ {porcentaje(esl.pctPIB, 0)} del PIB, frente al ≈ 38 % de hoy en impuestos y cotizaciones: habría menos servicios públicos o tendrían que ser mucho más eficientes. Al pie de la letra recauda ≈ {porcentaje(lit.pctPIB, 0)}, más que hoy, a costa de la cascada. Entre las dos hay lecturas intermedias, como cobrar también la inversión de las empresas.</>,
    },
    {
      t: '¿Es justo un tipo igual para todos?',
      d: (
        <>
          La Constitución pide un sistema inspirado en la igualdad y la progresividad (artículo 31). En el modelo todos aportan el mismo porcentaje y todos reciben el mismo dividendo, que es lo que lo hace progresivo.
          Con un dividendo de {euros(pais.porPersonaEscala)} al año, el efecto es {difModelo < 3 ? 'pequeño: el modelo queda casi proporcional' : 'claro'}. Entre un sueldo de {euros(casos[0].bruto)} y uno de {euros(casos[2].bruto)},
          hoy la diferencia es de {numero(difHoy)} puntos y con el modelo, de {numero(difModelo)}. Quien no tiene ingresos recibe el dividendo entero.
          Para acercarse a la progresividad de hoy, el dividendo tendría que crecer, y eso lo deciden las asambleas.
          Aportación neta sobre lo que la empresa paga por cada trabajo (persona sola que gasta tres cuartas partes de su sueldo neto):
          <span className="mt-2 block overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm tabular-nums">
              <thead><tr className="text-left text-slate-500"><th scope="col" className="py-1 pr-3 font-medium">Sueldo bruto</th><th scope="col" className="py-1 pr-3 text-right font-medium">Hoy</th><th scope="col" className="py-1 text-right font-medium">Con el modelo</th></tr></thead>
              <tbody>{casos.map(c => (
                <tr key={c.bruto} className="border-t border-slate-100"><td className="py-1 pr-3">{euros(c.bruto)}</td><td className="py-1 pr-3 text-right">{porcentaje(c.hoy * 100, 0)}</td><td className="py-1 text-right">{porcentaje(c.modelo * 100, 0)}</td></tr>
              ))}</tbody>
            </table>
          </span>
        </>
      ),
    },
    {
      t: 'El efectivo y la economía sumergida',
      d: <>El cobro automático solo funciona si los pagos pasan por el sistema de pago. El efectivo tendría que limitarse a cantidades pequeñas o pasar al euro digital. A cambio, sin declaraciones ni deducciones hay mucho menos que esconder. El economista Edgar Feige propuso algo parecido en Estados Unidos: un impuesto automático y diminuto sobre todos los pagos, también los financieros, para sustituir a todos los demás<Fuente id="apt" />.</>,
    },
    {
      t: 'El comercio con otros países',
      d: <>Lo que se importa pagaría el {porcentaje(TIPO * 100, 0)} al entrar, como hoy el IVA; lo que se exporta, en el país de quien lo compra. Dentro de la Unión Europea, la parte de las compras podría ser el propio IVA, que la UE obliga a mantener; el resto exige acordarlo con los demás países.</>,
    },
    {
      t: 'Las comunidades vecinales como administración',
      d: <>Hace falta un registro público, cuentas auditadas y que voten todas las personas que viven allí, no solo las propietarias. Hoy hay ≈ {numero(HOY.comunidades)} comunidades de propietarios<Fuente id="cafmadrid" />; quien vive en una casa independiente recibe esa parte en su hogar.</>,
    },
  ];
  return (
    <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2">
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
