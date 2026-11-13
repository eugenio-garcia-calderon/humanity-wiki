// The «Moneda» part of the «Economía» window (Eugenio, 2026-11-13, «inspírate
// también en esto»: his text on debt debasement through inflation). What money is
// and who creates the euro; inflation in Spain and who wins and loses; how inflation
// shrinks a debt, the Fisher effect and the sustainability equation; fiscal
// dominance; the proposals with the text's two warnings; what each scale can do;
// the open question of whether new money should be born as bank debt.
// How banks create money lives in «Banca» (#banca-dinero); the public debt and the
// contingency box in «Deuda» (#deuda, #deuda-caja). Data: src/data/moneda.ts.
import { ESCALAS, FUENTE, porcentaje, numero } from '../../data/modeloSocioeconomico';
import { BCE, EFECTO_DENOMINADOR, FUENTES_MONEDA, GANAN_PIERDEN, IPC_ANUAL, IPC_PICO, IPC_ULTIMO, PRECIO_2025_DE_100_2021, TIPOS_DEUDA } from '../../data/moneda';
import { Apartado, Cifra, Mas } from './ventanas';
import { Muestra } from './piezas';
import { Ahorros, F, GraficaIPC, Ir, SimuladorLicuacion, SimuladorSostenibilidad } from './MonedaPiezas';
import { cn } from '../../utils/cn';

const texto = 'max-w-3xl text-[15px] leading-relaxed text-slate-700';
const tarjeta = 'rounded-2xl border border-slate-200 bg-white p-5';

export function MonedaVentana() {
  return (
    <>
      <Resumen />
      <QuienCrea />
      <Inflacion />
      <Licuacion />
      <Sostenible />
      <Dominancia />
      <Propuesta />
      <Escalas />
      <Retos />
      <Lecturas />
      <Fuentes />
    </>
  );
}

// ── 1. SUMMARY ──────────────────────────────────────────────────────────────
function Resumen() {
  const ipc2022 = IPC_ANUAL.find(a => a.ano === 2022)!;
  return (
    <Apartado id="moneda" titulo="Un euro que no pierda valor, y un Estado que no gane cuando lo pierde"
      entradilla={<>El euro lo maneja el Banco Central Europeo, no España. Cuando los precios suben (eso es la inflación), cada euro compra menos: pierde quien ahorra y gana quien debe, y el que más debe es el Estado. La propuesta: dinero estable, crecer produciendo más y no pidiendo más prestado, y un sistema público sin deuda que no tenga ningún interés en que suban los precios.</>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra valor={porcentaje(IPC_ULTIMO.v, 1)} texto={<>subieron los precios en España en un año, hasta {IPC_ULTIMO.mes}, sobre todo por la energía<F id={IPC_ULTIMO.fuente} /></>} tono="mal" />
        <Cifra valor={porcentaje(ipc2022.v, 1)} texto={<>de subida media en 2022, la mayor en décadas; en {IPC_PICO.mes} llegó al {porcentaje(IPC_PICO.v, 1)}<F id="ipc-medias" /><F id={IPC_PICO.fuente} /></>} tono="mal" />
        <Cifra valor={`${numero(PRECIO_2025_DE_100_2021)} €`} texto={<>costaba de media en 2025 lo que de media en 2021 costaba 100 €<F id="ipc-medias" /></>} tono="mal" nota="Cálculo propio con las subidas medias de 2022 a 2025, según el INE." />
        <Cifra valor={porcentaje(BCE.objetivo, 0)} texto={<>al año: la subida de precios que busca el BCE y que la propuesta defiende, para que ahorrar no sea perder<F id="bce-2" /></>} tono="bien" />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { t: 'Dinero', d: 'Billetes, monedas y, sobre todo, los números de tu cuenta. Casi todo lo crean los bancos al prestar.' },
          { t: 'Inflación', d: 'Que los precios suban. Con la misma cantidad de euros se compran menos cosas.' },
          { t: 'Licuar una deuda', d: 'Que una deuda pese menos porque los precios y los sueldos suben, sin devolver nada. Pierde quien prestó.' },
        ].map(p => (
          <div key={p.t} className={tarjeta}>
            <p className="font-bold text-slate-900">{p.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <p className="font-bold text-amber-950">Dos advertencias que conviene no olvidar</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-amber-950">
          <li><strong>Ninguna deuda se borra gratis.</strong> Si se perdona, pierde quien prestó. Si se paga, alguien pone el dinero. Si se licúa con inflación, pierden quienes prestaron y quienes guardan dinero.</li>
          <li><strong>Crear dinero no es crear inflación automáticamente.</strong> Los bancos crean dinero al prestar y lo destruyen cuando se les devuelve<F id="bde-crea" />. Que suban los precios depende también de para qué se presta, de cuánto se produce y de lo que la gente espera.</li>
        </ol>
      </div>
    </Apartado>
  );
}

// ── 2. WHO CREATES THE EURO ─────────────────────────────────────────────────
function QuienCrea() {
  const tipos = [
    { t: 'Billetes y monedas', quien: 'Los bancos centrales del euro, con el BCE al frente. Las monedas las acuñan los países con permiso del BCE.', parte: 'Una parte pequeña del dinero.' },
    { t: 'Reservas de los bancos', quien: 'El BCE, cuando presta a los bancos o les compra títulos. Es el dinero con el que los bancos se pagan entre ellos.', parte: 'Tú no lo ves ni lo usas.' },
    { t: 'El dinero de tu cuenta', quien: 'Los bancos, al dar préstamos. Cuando se les devuelve, desaparece.', parte: 'La mayor parte del dinero que usamos.' },
  ];
  return (
    <Apartado id="moneda-euro" titulo="Quién crea el euro, y por qué España no lo controla" fondo="blanco"
      entradilla={<>Hay tres clases de euros. Casi todo el dinero que usamos lo crean los bancos cuando prestan<F id="bce-dinero" /><F id="bde-crea" />; cómo lo hacen está en <Ir href="#banca-dinero">Banca</Ir>. El precio del dinero (el tipo de interés) lo decide el Banco Central Europeo para los veintiún países del euro a la vez.</>}>
      <div className="grid gap-4 md:grid-cols-3">
        {tipos.map(t => (
          <div key={t.t} className={tarjeta}>
            <p className="font-bold text-slate-900">{t.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{t.quien}</p>
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm font-semibold text-slate-800">{t.parte}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Las tres reglas del euro</h3>
      <ul className="mt-4 grid gap-4 md:grid-cols-3">
        <li className={tarjeta}>
          <p className="font-bold text-slate-900">Su tarea: precios estables</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600">El Tratado de la Unión le encarga al BCE, ante todo, mantener estables los precios<F id="pe-bce" />. Lo concreta en una subida del {BCE.objetivo} % al año a medio plazo<F id="bce-2" />.</p>
        </li>
        <li className={tarjeta}>
          <p className="font-bold text-slate-900">No obedece a los gobiernos</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600">Es independiente por ley (artículo 130 del Tratado)<F id="pe-bce" />. El gobernador del Banco de España vota en su Consejo, pero no decide solo.</p>
        </li>
        <li className={tarjeta}>
          <p className="font-bold text-slate-900">No presta a los Estados</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-600">El artículo 123 prohíbe que el BCE y los bancos centrales del euro presten a las administraciones o les compren deuda directamente<F id="tfue-123" /><F id="pe-bce" />.</p>
        </li>
      </ul>

      <p className={cn(texto, 'mt-6')}>
        Por eso España no puede imprimir euros para pagar sus deudas, ni bajar el valor de su moneda para vender más fuera, como hacía con la peseta. Lo que sí controla son sus impuestos, su gasto y su deuda.
        En octubre de 2026 el BCE pagaba a los bancos un {porcentaje(BCE.tipoDeposito, 2)} por el dinero que le dejan, y anunciaba posibles subidas por la energía<F id="bce-tipos" />.
      </p>

      <Mas titulo="por qué se prohibió que el banco central preste al Estado">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p>Si un gobierno puede pedir dinero nuevo a su banco central cada vez que le falta, tiene la tentación de gastar sin límite y pagar con billetes nuevos. Cuando eso pasa, el dinero acaba valiendo menos para todos.</p>
          <p>La regla protege a quien ahorra en euros en cualquiera de los países del euro: ningún gobierno puede pagar sus cuentas a costa del dinero de los demás. El precio es que, en una crisis, cada país depende de que le presten los inversores. Es lo que se llama dominancia fiscal cuando falla, y está explicado <Ir href="#moneda-dominancia">más abajo</Ir>.</p>
        </div>
      </Mas>
    </Apartado>
  );
}

// ── 3. INFLATION ────────────────────────────────────────────────────────────
function Inflacion() {
  return (
    <Apartado id="moneda-inflacion" titulo="La inflación: cada euro compra un poco menos"
      entradilla={<>Inflación es que los precios suban. Si una barra de pan pasa de 1 € a 1,03 €, la inflación del pan es del 3 %. El INE la mide cada mes con el IPC, el índice de precios de consumo: el precio de una cesta de cosas que compran los hogares.</>}>
      <GraficaIPC />
      <p className={cn(texto, 'mt-6')}>
        En 2022 la energía y los alimentos se dispararon tras la invasión de Ucrania. En 2026 los precios vuelven a subir, otra vez por la energía, tras la guerra en Oriente Medio<F id="guerra-2026" />: el gas, la luz y los viajes empujan, mientras la inflación de fondo (la que no cuenta energía ni alimentos frescos) está en el {porcentaje(IPC_ULTIMO.subyacente, 1)}<F id={IPC_ULTIMO.fuente} />.
      </p>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Tus ahorros, con la inflación</h3>
      <div className="mt-4"><Ahorros /></div>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Quién gana y quién pierde</h3>
      <p className={cn(texto, 'mt-2')}>La inflación no es igual para todos: reparte. Pasa dinero, sin que nadie lo decida, de quien ahorra a quien debe<F id="bde-quien" />.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {GANAN_PIERDEN.map(g => (
          <li key={g.quien} className={cn(tarjeta, 'flex gap-3')}>
            <span className={cn('mt-0.5 h-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
              g.efecto === 'pierde' ? 'bg-rose-100 text-rose-800' : g.efecto === 'gana' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')}>
              {g.efecto === 'pierde' ? 'Pierde' : g.efecto === 'gana' ? 'Gana' : 'Depende'}
            </span>
            <div>
              <p className="font-semibold text-slate-900">{g.quien}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{g.por}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">Estudio del Banco de España con datos de clientes de BBVA en 2021<F id="bde-quien" />; el caso del Estado, del FMI<F id="fmi-2023" />. En ese estudio la edad pesó más que los ingresos: perdieron más los mayores, que ahorran; ganaron muchos jóvenes, que deben.</p>

      <Mas titulo="por qué suben los precios">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li><strong>Algo se encarece fuera:</strong> petróleo, gas, cereales. Es lo que pasó en 2022 y en 2026.</li>
          <li><strong>Se quiere comprar más de lo que se produce:</strong> por ejemplo, cuando mucho crédito nuevo va a consumir o a comprar casas que ya existen (lo explica <Ir href="#banca-werner">Banca</Ir>).</li>
          <li><strong>Todos esperan que suban:</strong> si empresas y trabajadores lo esperan, suben precios y sueldos por adelantado, y la espera se cumple. Por eso el BCE cuida tanto que se crea su objetivo del 2 %.</li>
        </ul>
      </Mas>
    </Apartado>
  );
}

// ── 4. DEBASEMENT ───────────────────────────────────────────────────────────
function Licuacion() {
  return (
    <Apartado id="moneda-licuacion" titulo="Cómo la inflación encoge una deuda" fondo="blanco"
      entradilla="Un país debe un billón de euros y produce un billón al año. Lo que produce un país en un año se llama PIB (producto interior bruto). Este país debe el 100 % de su PIB. Si los precios suben un 10 % sin que nadie lo esperara, el país produce 1,1 billones en euros, pero sigue debiendo uno. Ahora debe el 90,9 %. No ha devuelto nada.">
      <SimuladorLicuacion />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { t: 'Lo que se produce vale más euros', d: 'La deuda se mide contra lo que produce el país. Si eso sube de precio, la deuda pesa menos.' },
          { t: 'Lo que se debe vale menos', d: 'Los euros que se devolverán compran menos que los que se pidieron.' },
          { t: 'Al principio entra más dinero', d: 'Con precios más altos se recauda más, y algunos gastos tardan en subir.' },
        ].map(p => (
          <div key={p.t} className={tarjeta}>
            <p className="font-bold text-slate-900">{p.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
          </div>
        ))}
      </div>

      <p className={cn(texto, 'mt-6')}>
        En España ha pasado: según el Banco de España, el crecimiento de lo que produce el país en euros (con los precios incluidos) bajó la deuda {numero(EFECTO_DENOMINADOR[2022], 1)} puntos en 2022 y {numero(EFECTO_DENOMINADOR[2023], 1)} en 2023<F id="bde-deuda-2023" />. Parte de ese crecimiento fue inflación.
      </p>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Por qué no se puede hacer siempre</h3>
      <p className={cn(texto, 'mt-2')}>
        Funciona una vez, por sorpresa. Si quienes prestan creen que volverá a pasar, piden más interés para no perder, prestan a menos años, se van a otras monedas o a cosas que no pierden valor. El FMI lo comprobó: solo la inflación inesperada baja la deuda; la que ya se espera, no<F id="fmi-2023" />.
        Esto se llama efecto Fisher, por el economista Irving Fisher: el interés que se pide incluye la inflación que se espera<F id="bde-fisher" />.
      </p>

      <Mas titulo="el efecto Fisher, con la fórmula">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-center font-mono text-base text-slate-900">i ≈ r + πᵉ</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>i</strong>: el interés que se cobra (nominal, en euros).</li>
            <li><strong>r</strong>: lo que quien presta quiere ganar de verdad (interés real).</li>
            <li><strong>πᵉ</strong>: la inflación que se espera.</li>
          </ul>
          <p>Si alguien quiere ganar un 2 % de verdad y espera que los precios suban un 3 %, pedirá un 5 %. Si la inflación luego es del 8 %, pierde. Si ya esperaba el 8 %, habría pedido un 10 % y no pierde nada.</p>
        </div>
      </Mas>
      <Mas titulo="cómo trata la inflación a cada tipo de deuda">
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[460px] text-[15px]">
            <caption className="sr-only">Efecto de la inflación según el tipo de deuda</caption>
            <thead><tr className="border-b border-slate-200 text-left text-sm text-slate-500"><th scope="col" className="px-4 py-2 font-medium">Tipo de deuda</th><th scope="col" className="px-4 py-2 font-medium">Con inflación</th></tr></thead>
            <tbody>
              {TIPOS_DEUDA.map(t => (
                <tr key={t.tipo} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-4 py-3 text-left font-semibold text-slate-900">{t.tipo}</th>
                  <td className="px-4 py-3 text-slate-700">{t.efecto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">El FMI señala que la deuda a largo plazo y a tipo fijo hace que el alivio dure más, y que la deuda o los gastos ligados a la inflación lo reducen<F id="fmi-2023" />.</p>
      </Mas>
    </Apartado>
  );
}

// ── 5. SUSTAINABILITY ───────────────────────────────────────────────────────
function Sostenible() {
  return (
    <Apartado id="moneda-sostenible" titulo="Cuándo una deuda se sostiene y cuándo crece sola"
      entradilla="Cuatro cosas deciden si una deuda baja o sube: cuánto se debe ya, lo que cuesta (el interés), lo que crece la economía y lo que sobra o falta cada año antes de pagar intereses. Si el interés gana al crecimiento, la deuda crece aunque no se pida nada nuevo.">
      <SimuladorSostenibilidad />
      <p className={cn(texto, 'mt-6')}>
        El FMI advierte de que intereses más altos, menos crecimiento y más deuda a la vez ponen en riesgo las cuentas públicas y la estabilidad financiera<F id="fmi-2024" />. Y el Tesoro francés recuerda que un crecimiento mayor que el interés no basta si cada año falta dinero<F id="tresor-2023" />.
      </p>
      <Mas titulo="la ecuación">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-center font-mono text-base text-slate-900">Δd ≈ (i − g) · d − s</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Δd</strong>: cuánto cambia la deuda en un año, en puntos del PIB (lo que produce el país en un año).</li>
            <li><strong>d</strong>: la deuda, en % del PIB.</li>
            <li><strong>i</strong>: el interés real de la deuda (descontada la inflación).</li>
            <li><strong>g</strong>: el crecimiento real de la economía.</li>
            <li><strong>s</strong>: el superávit primario: ingresos menos gastos, sin contar intereses, en % del PIB.</li>
          </ul>
          <p>Ejemplo: deuda del 100 %, interés real del 3 %, crecimiento del 1 % y sin superávit. La deuda sube 2 puntos al año sin pedir nada nuevo. Para frenarla haría falta que sobrara un 2 % del PIB cada año. El simulador usa la forma exacta de la cuenta: d × (1 + i) ÷ (1 + g) − s.</p>
        </div>
      </Mas>
    </Apartado>
  );
}

// ── 6. FISCAL DOMINANCE ─────────────────────────────────────────────────────
function Dominancia() {
  return (
    <Apartado id="moneda-dominancia" titulo="Dominancia fiscal: cuando la deuda manda sobre el dinero" fondo="blanco"
      entradilla={<>Es cuando un Estado debe tanto que el banco central ya no puede subir los tipos para frenar los precios, porque eso hundiría las cuentas públicas. Entonces tolera más inflación, o compra deuda, y el dinero de todos pierde valor para aliviar al que más debe. La consejera del BCE Isabel Schnabel lo describe como un banco central atado para defender los precios<F id="schnabel-2020" />.</>}>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { t: 'Por qué importa', d: 'Es la forma de pagar una deuda que nadie vota: un impuesto escondido sobre quien ahorra y quien cobra un sueldo fijo.' },
          { t: 'Cómo se evita hoy', d: 'Con un banco central independiente y la prohibición de prestar a los Estados (artículos 130 y 123 del Tratado).' },
          { t: 'Cómo la evita la propuesta', d: 'Si ninguna administración debe, ninguna gana con la inflación ni presiona al banco central.' },
        ].map(p => (
          <div key={p.t} className={tarjeta}>
            <p className="font-bold text-slate-900">{p.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
          </div>
        ))}
      </div>
      <p className={cn(texto, 'mt-6')}>La regla de no deber de ninguna escala, y la caja para emergencias que la acompaña, están en <Ir href="#deuda-propuesta">Deuda</Ir>.</p>
    </Apartado>
  );
}

// ── 7. PROPOSAL ─────────────────────────────────────────────────────────────
const PROPUESTAS: { t: string; d: string; medidas: string[]; enlace?: { href: string; texto: string } }[] = [
  { t: 'Crecer produciendo más, no pidiendo más prestado',
    d: 'Que la economía crezca porque se produce más y mejor con lo mismo, no porque suben los precios o crece el crédito.',
    medidas: ['Invertir en automatización, innovación, investigación y formación técnica.', 'Energía e infraestructuras tecnológicas.', 'Menos trabas para crear empresas y competencia real en los sectores con pocos dueños.', 'Que cada inversión pública demuestre que devuelve lo que cuesta, en dinero o en bienestar: no toda se paga sola.'] },
  { t: 'Impuestos que recauden sin asfixiar',
    d: 'Ingresos estables sin quitar las ganas de trabajar, invertir y producir.',
    medidas: ['Menos exenciones y subvenciones que no sirven.', 'Perseguir el fraude.', 'Un sistema simple: en este modelo, un impuesto único que se suma al precio.', 'Revisar el gasto que rinde poco.'],
    enlace: { href: '#impuestos', texto: 'Ver Recaudación' } },
  { t: 'Sin deuda pública nueva, y la vieja gestionada con prudencia',
    d: 'Ninguna escala pide prestado. La deuda heredada se paga a su vencimiento sin renovarla, y mientras tanto se gestiona con cuidado.',
    medidas: ['Plazos largos y tipo fijo cuando se pueda, para no tener que renovarla cara en una crisis.', 'Evitar que venza mucha deuda el mismo año.', 'Cero deuda en otras monedas.', 'Una caja de contingencias para las emergencias, que nunca baja de cero.'],
    enlace: { href: '#deuda-propuesta', texto: 'Ver Deuda' } },
  { t: 'Reestructurar solo si es impagable, diciendo quién pierde',
    d: 'Si una deuda no se puede pagar sin hundir la economía, se negocia con los acreedores: devolver menos, más tarde o con menos interés.',
    medidas: ['Ejemplo: se deben 100.000 millones y se acuerda devolver 80.000. Los acreedores (bancos, fondos de pensiones, ahorradores) pierden 20.000.', 'Puede ser mejor que diez años de recortes o de inflación alta, pero tiene un coste real y hay que decirlo.', 'Nunca como forma habitual de pagar.'] },
  { t: 'Más inversores y menos préstamos',
    d: 'Que las empresas se financien más con socios que comparten ganancias y riesgos, y menos con deudas que hay que pagar pase lo que pase.',
    medidas: ['Menos pagos fijos y mejor aguante en las malas épocas.', 'Ojo: comprar acciones que ya existen no crea dinero nuevo, solo lo cambia de manos. Cambia cómo se financia la economía, no cuánto dinero hay.'] },
  { t: 'Crédito nuevo para producir y para la vivienda propia',
    d: 'Limitar el crédito que solo sube el precio de lo que ya existe, como casas para especular, sin prohibir el crédito.',
    medidas: ['Límites a lo que se presta según el valor de la casa y según lo que se gana.', 'Colchones de capital de los bancos que crezcan en los años buenos.', 'Vigilar los préstamos concentrados en un solo sector.'],
    enlace: { href: '#banca-propuesta', texto: 'Ver Banca' } },
  { t: 'Un banco central creíble e independiente',
    d: 'Que el dinero conserve su valor y que las necesidades del Estado no decidan los tipos de interés.',
    medidas: ['Un objetivo de inflación claro: hoy, el 2 % del BCE.', 'Independencia para decidir, con transparencia sobre lo que hace.', 'Vigilar cuánto crece el crédito.', 'No usar el dinero nuevo como forma permanente de tapar agujeros de las cuentas públicas.'] },
];

function Propuesta() {
  return (
    <Apartado id="moneda-propuesta" titulo="La propuesta: menos deuda en todo el sistema"
      entradilla="No se trata de encontrar una forma de crear dinero sin límite, sino de que la economía dependa menos del crédito: producir más, deber menos y tener reglas claras para cuando una deuda no se puede pagar.">
      <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="font-bold text-emerald-950">Cuatro principios</p>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            { t: 'Dinero para producir', d: 'El crédito nuevo financia máquinas, tecnología e innovación, no la compra especulativa de lo que ya existe.' },
            { t: 'Deuda sostenible', d: 'Reglas claras y públicas, y ningún gasto fijo pagado con deuda. En este modelo, ninguna escala pide prestado.' },
            { t: 'Banco central independiente', d: 'Que no tenga que mantener el dinero barato para que el Estado pueda seguir debiendo.' },
            { t: 'Más socios, menos préstamos', d: 'Más financiación con inversores que comparten riesgos y beneficios, y con beneficios reinvertidos.' },
          ].map((p, k) => (
            <li key={p.t} className="flex gap-3">
              <span aria-hidden className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">{k + 1}</span>
              <div><p className="font-semibold text-emerald-950">{p.t}</p><p className="text-[15px] leading-relaxed text-emerald-900">{p.d}</p></div>
            </li>
          ))}
        </ol>
      </div>
      <h3 className="mb-4 text-xl font-bold text-slate-900">Siete propuestas</h3>
      <ol className="grid gap-4 md:grid-cols-2">
        {PROPUESTAS.map(p => (
          <li key={p.t} className={tarjeta}>
            <p className="font-bold text-slate-900">{p.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
            <Mas titulo="cómo" className="mt-3">
              <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
                {p.medidas.map(m => <li key={m}>{m}</li>)}
              </ul>
            </Mas>
            {p.enlace && <p className="mt-3 text-sm"><Ir href={p.enlace.href}>{p.enlace.texto}</Ir></p>}
          </li>
        ))}
      </ol>

      <section aria-labelledby="moneda-compara" className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h3 id="moneda-compara" className="text-lg font-bold text-slate-900">Hoy y con la propuesta</h3>
        <dl className="mt-3 divide-y divide-slate-100">
          {[
            ['¿Gana el Estado si suben los precios?', 'Sí, si la subida es por sorpresa: su deuda pesa menos.', 'No: sin deuda no hay nada que licuar.'],
            ['Cómo crece la economía', 'En buena parte con más crédito, sobre todo para casas.', 'Produciendo más; el crédito nuevo, para producir y para la vivienda propia.'],
            ['Una crisis', 'Más deuda pública.', 'La caja de contingencias, ahorrada antes.'],
            ['El euro', 'Lo decide el BCE.', 'Lo sigue decidiendo el BCE: España defiende en Europa un 2 % creíble y reglas fiscales claras.'],
          ].map(([t, h, p]) => (
            <div key={t} className="grid gap-2 py-3 md:grid-cols-[30%_1fr_1fr] md:gap-4">
              <dt className="font-semibold text-slate-900">{t}</dt>
              <dd className="text-[15px] text-slate-600"><span className="text-sm font-medium text-slate-500 md:hidden">Hoy: </span>{h}</dd>
              <dd className="text-[15px] text-slate-900"><span className="text-sm font-medium text-emerald-800 md:hidden">Con la propuesta: </span>{p}</dd>
            </div>
          ))}
        </dl>
      </section>
    </Apartado>
  );
}

// ── 8. SCALES ───────────────────────────────────────────────────────────────
const POR_ESCALA: Record<string, string> = {
  persona: 'Guardar en la cuenta solo lo que necesita a mano y el resto en ahorro que siga a los precios. Preferir deudas a tipo fijo. Puede pedir consejo financiero gratuito al municipio.',
  vecindad: 'Su caja para emergencias no se deja quieta en una cuenta sin intereses: se guarda de forma que no pierda valor.',
  municipio: 'Da el consejo financiero gratuito. En sus contratos de servicios, precios que se actualizan con el IPC (la subida de los precios), para que nadie gane ni pierda con una sorpresa.',
  provincia: 'No tiene un papel propio en la moneda: aplica las mismas reglas que el municipio.',
  region: 'Sin deuda. Su caja de contingencias se invierte con prudencia, como el fondo de las pensiones, para que no pierda valor.',
  nacion: 'Impuestos que recauden sin asfixiar, inversión en productividad y la deuda heredada gestionada con prudencia. El Banco de España pone límites a las hipotecas y colchones a los bancos, y su gobernador vota en el BCE.',
  continente: 'El BCE decide los tipos de interés y defiende el 2 %. La Unión fija las reglas fiscales europeas y decide si existe el euro digital.',
  planeta: 'El FMI vigila la deuda de los países y media cuando un país no puede pagar. Las reglas de capital de los bancos se acuerdan entre países.',
};

function Escalas() {
  return (
    <Apartado id="moneda-escalas" titulo="Qué puede hacer cada escala" fondo="blanco"
      entradilla="La moneda se decide arriba, en Europa. Pero cada escala, desde la persona, puede protegerse de la inflación y no alimentarla.">
      <ol className="grid gap-3 md:grid-cols-2">
        {ESCALAS.map(e => (
          <li key={e.id} className={cn(tarjeta, 'flex gap-3')}>
            <Muestra color={e.color} className="mt-1.5" />
            <div>
              <p className="font-semibold text-slate-900">{e.nombre}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{POR_ESCALA[e.id] ?? 'Sin papel propio en la moneda.'}</p>
            </div>
          </li>
        ))}
      </ol>
    </Apartado>
  );
}

// ── 9. CHALLENGES AND THE BIG QUESTION ──────────────────────────────────────
const ALTERNATIVAS: { t: string; que: string; favor: string; contra: string; estado: string; fuentes: string[] }[] = [
  { t: 'Dinero soberano («Vollgeld»)',
    que: 'Solo el banco central crea dinero. Los bancos solo prestan dinero que ya existe: el de sus ahorradores o el suyo.',
    favor: 'Sus defensores dicen que el sistema sería más seguro: sin pánicos bancarios y con menos burbujas de crédito.',
    contra: 'El banco central suizo lo llamó un experimento peligroso; sus críticos dicen que encarecería el crédito y espantaría a las empresas.',
    estado: 'Suiza lo votó en 2018: solo un 24,3 % a favor.',
    fuentes: ['vollgeld-2018', 'vollgeld-snb'] },
  { t: 'Plan de Chicago (1933), o reserva del 100 %',
    que: 'Economistas de Chicago, con Irving Fisher, propusieron que cada euro de las cuentas esté respaldado por dinero del banco central. El crédito, aparte.',
    favor: 'Un estudio del FMI de 2012 lo simuló y encontró menos crisis, ni pánicos bancarios ni tanta deuda pública y privada.',
    contra: 'Es un modelo, no una experiencia real. Cambiar todo el sistema de golpe es arriesgado, y el crédito podría irse a entidades sin vigilancia.',
    estado: 'Nunca se ha aplicado. Es una idea de debate.',
    fuentes: ['chicago-2012'] },
  { t: 'Euro digital',
    que: 'Billetes en el móvil: dinero del propio BCE, gratis para pagar, sin intereses, que complementa al efectivo y no lo sustituye.',
    favor: 'Dinero público al alcance de todos en la era digital, y menos dependencia de las tarjetas extranjeras.',
    contra: 'Si la gente saca sus ahorros de los bancos, estos podrían prestar menos: por eso se pondría un tope (el BCE estudió hasta 3.000 € por persona). Otros temen por la privacidad.',
    estado: 'En negociación en la Unión desde julio de 2026; el BCE podría emitirlo en 2029.',
    fuentes: ['euro-digital-faq', 'euro-digital-2026'] },
];

function Retos() {
  return (
    <Apartado id="moneda-retos" titulo="Lo que falta por resolver, y la gran pregunta"
      entradilla="Esta parte del modelo depende más que ninguna de decisiones que no se toman en España. Hay que decirlo claro.">
      <ul className="grid gap-4 md:grid-cols-2">
        {[
          { t: 'España no controla el euro', d: 'Casi todo lo que aquí se propone sobre la moneda depende del BCE y de las reglas europeas. España puede votar y proponer, no decidir sola.' },
          { t: 'Sin deuda no hay plan B', d: 'En una crisis grande todo depende de que la caja de contingencias esté llena. Llenarla lleva años.', },
          { t: '¿Qué es «producir»?', d: 'Limitar el crédito al que produce puede frenar la economía si se define mal. Hacen falta criterios claros y revisables.' },
          { t: 'Una reestructuración tiene víctimas', d: 'Si algún día hay que reestructurar la deuda heredada, pierden bancos, fondos de pensiones y ahorradores. Hay que decidir antes cómo proteger a los pequeños.' },
        ].map(r => (
          <li key={r.t} className={tarjeta}>
            <p className="font-bold text-slate-900">{r.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-2xl border border-slate-900 bg-white p-5 sm:p-6">
        <p className="text-sm font-semibold text-slate-500">La gran pregunta, abierta</p>
        <p className="mt-2 text-xl font-bold leading-snug text-slate-900">¿Debe nacer casi todo el dinero nuevo como una deuda con un banco, que paga intereses? ¿O hay otras formas de financiar la economía?</p>
        <p className={cn(texto, 'mt-3')}>Hoy casi todo el dinero nace así (lo explica <Ir href="#banca-dinero">Banca</Ir>). Hay tres alternativas conocidas. Aquí no se elige ninguna: se presentan para el debate.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {ALTERNATIVAS.map(a => (
            <div key={a.t} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">{a.t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{a.que}</p>
              <dl className="mt-3 space-y-2 text-sm leading-relaxed">
                <div><dt className="font-semibold text-emerald-800">A favor</dt><dd className="text-slate-700">{a.favor}</dd></div>
                <div><dt className="font-semibold text-rose-800">En contra</dt><dd className="text-slate-700">{a.contra}</dd></div>
                <div><dt className="font-semibold text-slate-900">Dónde está</dt><dd className="text-slate-700">{a.estado}{a.fuentes.map(f => <F key={f} id={f} />)}</dd></div>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </Apartado>
  );
}

// ── 10. READINGS ────────────────────────────────────────────────────────────
const LECTURAS: { id: string; quien: string; t: string; aporta: string }[] = [
  { id: 'werner-2014', quien: 'Richard Werner (2014)', t: 'Can Banks Individually Create Money Out of Nothing?', aporta: 'Comprueba en un banco real que, al prestar, el banco crea el dinero.' },
  { id: 'fisher-1933', quien: 'Irving Fisher (1933)', t: 'The Debt-Deflation Theory of Great Depressions', aporta: 'Cómo mucha deuda y precios que bajan pueden hundir una economía.' },
  { id: 'minsky-1986', quien: 'Hyman Minsky (1986)', t: 'Stabilizing an Unstable Economy', aporta: 'Por qué los años buenos de crédito preparan las crisis.' },
  { id: 'fmi-2023', quien: 'FMI (2023)', t: 'The Effects of Inflation on Public Finances', aporta: 'Cuánto baja de verdad la deuda con la inflación, y cuándo no.' },
  { id: 'fmi-2024', quien: 'FMI (2024)', t: 'The Fiscal and Financial Risks of a High-Debt, Slow-Growth World', aporta: 'Los riesgos de mucha deuda con poco crecimiento.' },
];

function Lecturas() {
  return (
    <Apartado id="moneda-lecturas" titulo="Para leer más" fondo="blanco"
      entradilla="Cinco lecturas para profundizar. Están en inglés.">
      <ul className="grid gap-3 md:grid-cols-2">
        {LECTURAS.map(l => (
          <li key={l.id} className={tarjeta}>
            <p className="text-sm font-semibold text-slate-500">{l.quien}</p>
            <a href={FUENTES_MONEDA[l.id].url} target="_blank" rel="noreferrer" className="mt-1 block font-bold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">{l.t}</a>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{l.aporta}</p>
          </li>
        ))}
      </ul>
    </Apartado>
  );
}

// ── 11. SOURCES ─────────────────────────────────────────────────────────────
function Fuentes() {
  return (
    <Apartado id="moneda-fuentes" titulo="Fuentes"
      entradilla="Consultadas en noviembre de 2026. La deuda de España a finales de 2025 sale del Banco de España, como en la parte Deuda.">
      <ul className="grid max-w-4xl gap-2 text-sm">
        {Object.entries(FUENTES_MONEDA).map(([id, f]) => (
          <li key={id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
        ))}
        <li><a href={FUENTE['deuda-2025']?.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{FUENTE['deuda-2025']?.titulo}</a></li>
      </ul>
    </Apartado>
  );
}
