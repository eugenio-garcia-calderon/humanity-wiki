// Two sections of the «Justicia» window (Eugenio, 2026-11-12): repeat
// offending («una oportunidad, pero no dos», a robbery is a robbery, return ten
// times what was stolen) and squatting (fast public eviction, no private
// eviction companies, a housing alternative paid by the public side).
// Data: src/data/justiciaReincidencia.ts.
import { numero, porcentaje } from '../../data/modeloSocioeconomico';
import {
  CAMINO_HOY, CAMINO_PROPUESTA, CENTRO_REINSERCION, DIEZ_VECES, HURTO_ROBO, OCUPACION_HOY, OCUPACION_LEYES, OCUPACION_PROPUESTA,
  OCUPACION_TIPOS, REINCIDENCIA_HOY, REINSERCION_HOY, RETOS_OCUPACION, RETOS_REINCIDENCIA, estimacionReincidencia,
} from '../../data/justiciaReincidencia';
import { Apartado, Cifra, Mas } from './ventanas';
import { F, Recorrido } from './JusticiaPiezas';

const texto = 'max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700';

function Tarjetas({ items, tono = 'neutro' }: { items: { t: string; d: string; fuente?: string; plazo?: string }[]; tono?: 'neutro' | 'bien' }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map(i => (
        <li key={i.t} className={tono === 'bien' ? 'rounded-2xl border border-emerald-200 bg-white p-4' : 'rounded-2xl border border-slate-200 bg-white p-4'}>
          <p className="font-semibold text-slate-900">{i.t}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{i.d}{i.fuente && <F id={i.fuente} />}</p>
          {i.plazo && <p className="mt-1.5 text-sm font-semibold text-emerald-700">{i.plazo}</p>}
        </li>
      ))}
    </ul>
  );
}

export function Reincidencia() {
  const r = REINCIDENCIA_HOY;
  return (
    <Apartado id="justicia-reincidencia" titulo="Una oportunidad, pero no dos"
      entradilla="Para un delito menor sin violencia, la primera vez: un centro de reinserción y devolver diez veces lo robado. Si se repite, cárcel directamente. Con violencia o amenazas, cárcel desde la primera vez. Y un robo es un robo: un solo nombre, sin distinguir entre hurto y robo; lo que agrava es la violencia.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Cifra valor={porcentaje(r.tasa, 0)} tono="mal"
          texto={<>de quienes salieron de prisión en 2009 volvieron a entrar en los diez años siguientes<F id="reincidencia-2022" /></>}
          nota={`Dato de quienes salieron en 2009, el último estudio completo: ${numero(r.cohorte)} personas.`} />
        <Cifra valor={porcentaje(r.hurtosPct2025, 1)} tono="neutro"
          texto={<>de los delitos de los adultos condenados en 2025 fueron hurtos<F id="ine-condenados-2025" /></>} />
        <Cifra valor="1 oportunidad" tono="bien" texto="La segunda vez, cárcel. Y siempre, devolver diez veces lo robado." nota="Propuesta." />
      </div>

      <h3 className="mt-10 text-xl font-bold text-slate-900">El camino de quien comete un delito menor</h3>
      <p className="mt-1 max-w-3xl text-[15px] text-slate-600">Una persona que roba algo pequeño, una y otra vez.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Recorrido titulo="Hoy" pasos={CAMINO_HOY} tono="mal" />
        <Recorrido titulo="Con la propuesta" pasos={CAMINO_PROPUESTA} tono="bien" />
      </div>

      <Estimacion />

      <Mas titulo="hoy: hurto, robo y reinserción">
        <h3 className="text-lg font-bold text-slate-900">Hurto y robo</h3>
        <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-700">Hoy la ley separa cuatro casos según el valor y según cómo se coge<F id="cp" />. La propuesta los llama a todos robo; la pena sube con lo robado y, sobre todo, si hay violencia o amenazas.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {HURTO_ROBO.map(h => (
            <div key={h.t} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{h.t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{h.d}</p>
              <p className="mt-1.5 text-sm text-slate-600">{h.pena}</p>
            </div>
          ))}
        </div>
        <div className={`${texto} mt-5`}>
          <p><strong>Reincidencia.</strong> Si alguien ya fue condenado por un delito del mismo tipo y el antecedente no se ha borrado, el juez sube la pena: es la agravante de reincidencia<F id="cp" />.</p>
          <p><strong>La reforma de 2026.</strong> La Ley Orgánica 1/2026, de abril, endurece la multirreincidencia: con tres condenas previas por delitos parecidos, una al menos leve, un hurto de menos de 400 € se castiga con cárcel de 6 a 18 meses. Robar un móvil pasa a castigarse con 1 a 3 años, valga lo que valga, por los datos personales que guarda<F id="lo-1-2026" /><F id="cms-2026" />.</p>
        </div>
      <div className="mt-6" />
        <h3 className="text-lg font-bold text-slate-900">Lo que hay para reinsertar</h3>
        <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-700">La Constitución dice que las penas de prisión se orientan a la reeducación y la reinserción<F id="constitucion" />. Hoy existen estas herramientas<F id="cp" />:</p>
        <div className="mt-4"><Tarjetas items={REINSERCION_HOY} /></div>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-slate-700">
          Quien sale en libertad condicional vuelve a prisión menos ({porcentaje(r.tasaCondicional, 1)}) que quien cumple la pena entera ({porcentaje(r.tasaSinCondicional, 1)})<F id="reincidencia-2022" />. Un estudio más reciente, de quienes salieron en 2020, dice que casi 9 de cada 10 no volvieron a prisión en el tiempo estudiado, que es más corto<F id="reincidencia-2020" />.
        </p>
      </Mas>

      <Mas titulo="cómo funcionaría: el centro y el cobro">
        <h3 className="text-lg font-bold text-slate-900">El centro de reinserción</h3>
        <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-700">No es una cárcel: es un programa de varios meses, con o sin internamiento según el caso, solo para quien comete por primera vez un delito menor sin violencia ni amenazas.</p>
        <div className="mt-4"><Tarjetas items={CENTRO_REINSERCION} tono="bien" /></div>
      <div className="mt-6" />
        <h3 className="text-lg font-bold text-slate-900">Devolver diez veces lo robado</h3>
        <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-700">Hoy quien roba tiene que devolver lo robado o su valor y pagar los daños, y aparte una multa<F id="cp" />. La propuesta: diez veces lo robado. Quien roba 200 €, devuelve 2.000 €.</p>
        <div className="mt-4"><Tarjetas items={DIEZ_VECES} /></div>
      </Mas>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Lo que hay que resolver</h3>
      <div className="mt-3"><Tarjetas items={RETOS_REINCIDENCIA.slice(0, 2)} /></div>
      <Mas titulo={`otros ${RETOS_REINCIDENCIA.length - 2} retos: coste de la cárcel y lo que dicen los estudios`}>
        <Tarjetas items={RETOS_REINCIDENCIA.slice(2)} />
        <p className="mt-3 max-w-3xl text-sm text-slate-500">Un preso cuesta {numero(r.costeDia, 2)} € al día en la Administración del Estado (2024)<F id="space-2025" />; en España se pasan de media unos {r.estanciaMeses} meses en prisión, frente a {numero(r.estanciaEuropaMeses, 1)} de media en Europa<F id="space-2025-prensa" />.</p>
      </Mas>
    </Apartado>
  );
}

/** Estimate card: how many people a year, how many places, what it costs. */
function Estimacion() {
  const e = estimacionReincidencia();
  const r = REINCIDENCIA_HOY;
  const red = (n: number) => numero(Math.round(n / 100) * 100);
  const mill = (m: number) => `${numero(Math.round(m / 10) * 10)} M€`;
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-lg font-bold text-slate-900">Cuántas personas, y cuánto costaría</p>
      <p className="mt-1 text-sm text-slate-500">Estimación nuestra, solo con los hurtos. Ver los supuestos abajo.</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-600">Al centro de reinserción, cada año</dt>
          <dd className="text-2xl font-bold tabular-nums text-slate-900">≈ {red(e.primera)} personas</dd>
          <dd className="text-sm text-slate-600">≈ {red(e.plazasCentro)} plazas a la vez. Coste sin dato; como techo, si costara como una cárcel, {mill(e.techoCentro)} al año.</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-600">A la cárcel a la segunda, cada año</dt>
          <dd className="text-2xl font-bold tabular-nums text-slate-900">≈ {red(e.segunda)} personas</dd>
          <dd className="text-sm text-slate-600">≈ {red(e.plazasCarcel)} plazas de prisión a la vez, unos {mill(e.costeCarcel)} al año<F id="space-2025" /></dd>
        </div>
      </dl>
      <Mas titulo="los supuestos de la cuenta">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li>En 2025 se condenaron {numero(r.delitos2025)} delitos de adultos; el {porcentaje(r.hurtosPct2025, 1)} fueron hurtos: unos {red(e.hurtos)}<F id="ine-condenados-2025" />. No contamos los robos con fuerza, porque el INE no da su cifra: la cuenta se queda corta.</li>
          <li>Suponemos que repite un {porcentaje(r.tasa, 0)}, la tasa del estudio de prisiones<F id="reincidencia-2022" />. Es otra población (gente que salió de la cárcel), así que es solo una aproximación.</li>
          <li>La segunda vez, {e.mesesCarcel} meses de cárcel, el punto medio de los 6 a 18 meses de hoy por hurto. Cada preso cuesta {numero(r.costeDia, 2)} € al día<F id="space-2025" />.</li>
          <li>El programa del centro dura {e.mesesCentro} meses. No hay un coste oficial de algo así; muchos irían sin internamiento, así que costaría bastante menos que el techo.</li>
          <li>Una misma persona puede tener varios hurtos en un año: las personas reales serían algo menos.</li>
        </ul>
      </Mas>
    </div>
  );
}

export function Ocupacion() {
  const o = OCUPACION_HOY;
  const baja = ((o.casos2024 - o.casos2025) / o.casos2024) * 100;
  return (
    <Apartado id="justicia-ocupacion" titulo="Terminar con la ocupación, sin dejar a nadie en la calle" fondo="blanco"
      entradilla="Que desalojar una casa ocupada sea rápido y lo haga la justicia pública, no empresas privadas. Y que la persona desalojada tenga siempre una alternativa, pagada por lo público y nunca a costa del propietario.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Cifra valor={numero(o.casos2025)} tono="mal"
          texto={<>casos de allanamiento y usurpación registrados en 2025, un {porcentaje(baja, 1)} menos que en 2024<F id="ocupacion-2025" /></>}
          nota="Datos del Ministerio del Interior, recogidos por la prensa." />
        <Cifra valor="Sin dato" tono="neutro"
          texto="oficial de cuánto tarda hoy un desalojo. Ni el Consejo General del Poder Judicial ni Interior lo publican." />
        <Cifra valor="72 horas" tono="bien" texto="para desalojar una vivienda vacía, con orden del juez de guardia. El mismo día si es una casa habitada." nota="Propuesta." />
      </div>

      <h3 className="mt-10 text-xl font-bold text-slate-900">La propuesta</h3>
      <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-600">Los «guardianes públicos» son el cuerpo único que, en este modelo, une policías, guardia civil y ejército; lo explica la ventana <a href="#seguridad" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">Seguridad</a>.</p>
      <div className="mt-3"><Tarjetas items={OCUPACION_PROPUESTA} tono="bien" /></div>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        La alternativa sale del parque público de vivienda de cada escala: el municipio busca el sitio y la región o la nación aportan las viviendas. Lo explica la ventana <a href="#vivienda" className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">Vivienda</a>.
      </p>

      <Mas titulo="cómo funciona hoy">
        <div className="grid gap-3 sm:grid-cols-2">
          {OCUPACION_TIPOS.map(t => (
            <div key={t.t} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-semibold text-slate-900">{t.t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{t.d}<F id="cp" /></p>
              <p className="mt-1.5 text-sm text-slate-600">{t.pena}</p>
            </div>
          ))}
        </div>
        <div className="mt-4"><Tarjetas items={OCUPACION_LEYES} /></div>
        <div className={`${texto} mt-4`}>
          <p><strong>Las empresas de desocupación.</strong> Son empresas privadas que cobran al propietario por conseguir que los ocupantes se vayan, presionándolos sin pasar por un juez. No hay una ley propia que las regule. Lo que no pueden hacer es usar la fuerza, amenazar o tomarse la justicia por su mano: eso es delito para ellas y para quien las contrata<F id="cp" />. En 2025 se propuso en el Congreso prohibirlas<F id="sumar-desokupa" />.</p>
          <p><strong>Cuánto tarda.</strong> No hay una estadística oficial del tiempo de un desalojo; las cifras que circulan son de despachos de abogados y portales inmobiliarios.</p>
        </div>
      </Mas>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Lo que hay que resolver</h3>
      <div className="mt-3"><Tarjetas items={RETOS_OCUPACION.slice(0, 2)} /></div>
      <Mas titulo={`otros ${RETOS_OCUPACION.length - 2} retos`}>
        <Tarjetas items={RETOS_OCUPACION.slice(2)} />
      </Mas>
    </Apartado>
  );
}
