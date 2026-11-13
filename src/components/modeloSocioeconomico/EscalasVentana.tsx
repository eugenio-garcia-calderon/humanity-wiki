// The «Escalas» window: the door into the «Modelo socioeconómico optimizado»
// (Eugenio, 2026-11-12): «Añade una pestaña donde se expliquen las escalas
// sociales, desde la persona, vecindad hasta el planeta, para que se entienda
// nuestro modelo, donde queremos repartir y empoderar a cada una de esas
// escalas, y donde se hable de la responsabilidad de cada una de ellas, y que
// luego ahí se pueda transicionar al cómo se reparte la recaudación.»
// Data: src/data/escalas.ts (this window) and src/data/modeloSocioeconomico.ts (the scales).
import { ArrowRight } from 'lucide-react';
import { ESCALAS, ESPANA, FUENTE, HOY, OCTAVO, TRAMOS, cuentasPais, euros, millones, numero, porcentaje } from '../../data/modeloSocioeconomico';
import { APORTACION_UE_2023, F, HOY_REGIONAL_EDUCACION, HOY_REGIONAL_SANIDAD, HOY_SUBSECTORES, HOY_TOTAL, RESPONSABILIDAD, RETOS } from '../../data/escalas';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Muestra } from './piezas';
import { FichasEscalas, QuienSeOcupa, RepartoHoyPropuesta, SubeBaja } from './EscalasPiezas';
import { QuienDecide } from './QuienDecide';
import { AyudaEntreEscalas, Tercios } from './TerciosApoyo';
import { MatrizAmbitos } from './MatrizAmbitos';

const pais = cuentasPais('literal');
const pct = (m: number) => (m / HOY_TOTAL) * 100;
const local = HOY_SUBSECTORES.find(s => s.id === 'local')!.millones;
const lejos = HOY.gastoCentral2024 + HOY.gastoSeguridadSocial2024;
// Today's spending without pensions, against what the model collects (both in M€).
const sinPensiones = HOY_TOTAL - HOY.pensiones2024;
const diferencia = pais.recaudacion - sinPensiones;
/** First sentence of a text, and the rest. */
const partir = (t: string) => { const k = t.search(/\. (?=[A-ZÁÉÍÓÚ¿])/); return k < 0 ? [t, ''] : [t.slice(0, k + 1), t.slice(k + 2)]; };
const tipos = TRAMOS.map(t => numero(t.tipo * 100)).join(', ').replace(/, (\d+)$/, ' o $1');

const enlace = 'font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900';
const llamada = 'inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2';

export function EscalasVentana() {
  return (
    <>
      {/* ── 1. Summary ── */}
      <Apartado id="escalas" titulo="Repartir el poder y el dinero hacia abajo, de la persona al planeta"
        entradilla={<>Vivimos en ocho escalas, una dentro de otra: tú, tu comunidad vecinal, tu pueblo, tu provincia, tu región, tu país, tu continente y el planeta.
          El modelo quiere que cada una tenga <b className="text-slate-800">dinero propio y poder para decidir</b>, y que responda de lo que le toca. La regla es sencilla: <b className="text-slate-800">lo hace la escala más cercana que pueda hacerlo bien</b>.</>}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Cifra tono="mal" valor={porcentaje(pct(local))} texto={<>del gasto público lo deciden hoy los ayuntamientos y las diputaciones, la administración más cercana<Fuente id="igae-cofog" /></>} nota="España, 2024" />
          <Cifra valor={porcentaje(pct(lejos))} texto={<>lo deciden el Estado y la Seguridad Social, sobre todo pensiones<Fuente id="igae-cofog" /></>} nota="España, 2024" />
          <Cifra tono="bien" valor={porcentaje(OCTAVO * 4 * 100, 0)} texto="de lo recaudado lo decidirían las cuatro escalas más cercanas: persona, comunidad vecinal, municipio y provincia" nota="Propuesta: un octavo para cada escala" />
          <Cifra tono="bien" valor={euros(pais.porPersonaEscala)} texto="al año por habitante para cada escala: la misma cantidad en un pueblo que en una ciudad" nota="Estimación con datos de 2025" />
        </div>

        <ol className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          {ESCALAS.map((e, i) => (
            <li key={e.id} className="bg-white px-4 py-3 sm:p-4">
              <p className="flex items-center gap-2 font-bold text-slate-900"><span className="w-4 text-sm tabular-nums text-slate-400">{i + 1}</span><Muestra color={e.color} />{e.nombre}</p>
              <p className="mt-1 pl-6 text-sm leading-snug text-slate-600"><span className="font-medium text-slate-800">Responde de:</span> {RESPONSABILIDAD[e.id].respondeDe}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-[15px] text-slate-700">
          Abajo, cada escala con su responsabilidad, quién decide y cómo se ayudan. Al final, <a href="#escalas-dinero" className={enlace}>cómo les llega el dinero</a>.
        </p>
      </Apartado>

      {/* ── 2. The idea ── */}
      <Apartado id="escalas-idea" fondo="blanco" titulo="Lo hace la escala más cercana que pueda hacerlo bien"
        entradilla="Quien está cerca conoce mejor el problema, lo resuelve antes y ve en qué se gasta su dinero.">
        <ol className="grid gap-3 md:grid-cols-3 md:gap-4">
          {[
            { t: 'Primero, lo más cercano', d: 'Si una comunidad vecinal puede arreglar su tejado, lo arregla ella. No hace falta pedir permiso a nadie de lejos.' },
            { t: 'Si no puede sola, la ayudan', d: 'La escala de arriba le presta dinero, le da una donación puntual o le manda técnicos. La ayuda, pero no le quita la tarea.' },
            { t: 'Lo que es de muchos, sube', d: 'Lo que afecta a muchas escalas a la vez (un tren entre países, el clima) lo hace la escala que las abarca a todas.' },
          ].map((p, i) => (
            <li key={p.t} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <h3 className="flex items-baseline gap-2 text-lg font-bold text-slate-900"><span className="tabular-nums text-slate-400">{i + 1}</span>{p.t}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-[15px] leading-relaxed text-slate-700">
          <b className="text-slate-900">Poder y dinero van juntos.</b> Una responsabilidad sin dinero para cumplirla es solo una carga. Por eso cada escala recibe su propia parte de lo recaudado, sin tener que pedírsela a la de arriba,
          y a cambio rinde cuentas de cada euro ante las personas que viven en ella.
        </div>
        <div className="mt-6"><QuienSeOcupa /></div>
        <Mas titulo="por qué se llama subsidiariedad, y dónde está ya escrita">
          <ul className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
            <li><b>La palabra.</b> Viene del latín <i>subsidium</i>, «ayuda» o «refuerzo»: la escala de arriba está para ayudar a la de abajo, no para sustituirla. Es el nombre técnico de la regla de esta página: lo hace la escala más cercana que pueda hacerlo bien.</li>
            <li><b>Carta Europea de Autonomía Local.</b> Dice que las tareas públicas deben corresponder, en general, a las autoridades más cercanas a la gente,
              y que los municipios tienen derecho a recursos propios suficientes y en proporción a lo que les toca hacer.<Fuente url={F.carta.url} titulo={F.carta.titulo} /></li>
            <li><b>Tratado de la Unión Europea.</b> Europa solo debe actuar cuando los países, sus regiones o sus municipios no pueden conseguir algo por sí solos.<Fuente url={F.tue.url} titulo={F.tue.titulo} /></li>
            <li><b>La diferencia con el modelo.</b> Hoy estas normas son una intención: el dinero sigue llegando sobre todo desde arriba, como se ve en el apartado siguiente.
              El modelo lo convierte en regla de reparto: cada escala tiene asegurada la misma parte, y añade dos escalas que hoy no tienen nada, la persona y la comunidad vecinal.</li>
          </ul>
        </Mas>
      </Apartado>

      {/* ── 3. Today ── */}
      <Apartado id="escalas-hoy" titulo="Hoy, casi todo se decide lejos"
        entradilla={<>En 2024 las administraciones de España gastaron {millones(HOY_TOTAL)}. Solo {porcentaje(pct(local))} lo decidieron los ayuntamientos y las diputaciones; más de la mitad, el Estado y la Seguridad Social.</>}>
        <RepartoHoyPropuesta />
        <ul className="mt-6 grid gap-3 md:grid-cols-2 md:gap-4">
          <li className="rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700">
            <b className="text-slate-900">Sanidad y educación, en las comunidades autónomas.</b> Gastan el {porcentaje(HOY_REGIONAL_SANIDAD, 0)} de la sanidad pública y el {porcentaje(HOY_REGIONAL_EDUCACION, 0)} de la educación<Fuente id="igae-cofog" />.
            El consultorio del pueblo y la escuela se deciden en la capital de la región.
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700">
            <b className="text-slate-900">La Seguridad Social, un tercio de todo.</b> Son sobre todo pensiones: el dinero llega a las personas, pero cuánto y a quién lo deciden las leyes del Estado, no ellas.
          </li>
        </ul>
        <Mas titulo="las comunidades de vecinos, Europa y el planeta">
          <ul className="grid gap-4 md:grid-cols-2">
          <li className="rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700">
            <b className="text-slate-900">Las comunidades de vecinos, fuera de lo público.</b> Se pagan con cuotas, unos {millones(HOY.cuotasComunidades)} al año<Fuente id="comunidades-cuotas" />, y en sus juntas solo votan los propietarios, no quienes viven de alquiler<Fuente url={F.lph.url} titulo={F.lph.titulo} />.
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700">
            <b className="text-slate-900">Europa y el planeta, con lo que aporta el Estado.</b> La Unión Europea tiene para 2026 un presupuesto de {millones(HOY.presupuestoUE2026)} para 27 países<Fuente id="ue-presupuesto" />; España aportó {millones(APORTACION_UE_2023)} en 2023<Fuente url={F.ueHacienda.url} titulo={F.ueHacienda.titulo} />.
            A la ayuda al desarrollo fueron {millones(HOY.aod2025)} en 2025<Fuente id="aod-2025" />.
          </li>
          </ul>
        </Mas>
        <Mas titulo="las cifras de 2024, en millones de euros">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[520px] text-[15px]">
              <caption className="px-5 pt-5 text-left text-lg font-bold text-slate-900">Gasto público de España en 2024, según quién lo gasta</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                  <th scope="col" className="px-5 py-2 font-medium">Quién lo gasta</th>
                  <th scope="col" className="px-4 py-2 font-medium">Escala del modelo</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Millones de €</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">De cada 100 €</th>
                </tr>
              </thead>
              <tbody>
                {HOY_SUBSECTORES.map(s => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <th scope="row" className="px-5 py-2.5 text-left font-semibold text-slate-900">{s.nombre}</th>
                    <td className="px-4 py-2.5 text-slate-700">{s.escalas}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{numero(s.millones)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{porcentaje(pct(s.millones))}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="px-5 py-2.5 text-left font-bold text-slate-900">Total</th>
                  <td />
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">{numero(HOY_TOTAL)}</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">100 %</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            Datos de la Intervención General del Estado (IGAE)<Fuente id="igae-cofog" />. Cuando una administración le pasa dinero a otra, aquí cuenta para la que lo gasta al final, así cada euro aparece una sola vez.
            La Constitución organiza hoy el territorio en municipios, provincias y comunidades autónomas<Fuente url={F.constitucion.url} titulo={F.constitucion.titulo} />; la ley de régimen local dice qué hace cada ayuntamiento y cada diputación<Fuente url={F.lbrl.url} titulo={F.lbrl.titulo} />.
          </p>
        </Mas>
      </Apartado>

      {/* ── 4. Each scale ── */}
      <Apartado id="escalas-cada" fondo="blanco" titulo="Cada escala y su responsabilidad"
        entradilla="Elige una escala: de qué responde, quién decide en ella, qué pasa a la escala de arriba y a quién ayuda.">
        <FichasEscalas />
        <Mas titulo="las ocho a la vez">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">La responsabilidad de cada escala</caption>
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th scope="col" className="px-5 py-2 font-medium">Escala</th>
                  <th scope="col" className="px-4 py-2 font-medium">Responde de</th>
                  <th scope="col" className="px-4 py-2 font-medium">Pasa arriba</th>
                  <th scope="col" className="px-4 py-2 font-medium">Hoy lo hace</th>
                </tr>
              </thead>
              <tbody>
                {ESCALAS.map(e => (
                  <tr key={e.id} className="border-b border-slate-100 align-top last:border-0">
                    <th scope="row" className="whitespace-nowrap px-5 py-2.5 text-left font-semibold text-slate-900"><span className="flex items-center gap-2"><Muestra color={e.color} />{e.corto}</span></th>
                    <td className="px-4 py-2.5 leading-snug text-slate-700">{RESPONSABILIDAD[e.id].responde}</td>
                    <td className="px-4 py-2.5 leading-snug text-slate-700">{RESPONSABILIDAD[e.id].sube}</td>
                    <td className="px-4 py-2.5 leading-snug text-slate-700">{RESPONSABILIDAD[e.id].hoy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-slate-600">Las responsabilidades son una propuesta de partida, hecha a partir del reparto de tareas del modelo. Cada escala podrá ajustarlas.</p>
          <Mas titulo="quién se ocupa de qué: ocho escalas por quince ámbitos">
            <MatrizAmbitos modo="literal" />
          </Mas>
        </Mas>
      </Apartado>

      {/* ── 5. Who decides ── */}
      <Apartado id="escalas-decide" titulo="Quién decide, y cómo"
        entradilla="En cada escala, las personas que viven en ella eligen qué es prioritario. Un comité técnico decide cómo hacerlo al menor coste, de la forma más eficaz y más ecológica. Y todas las cuentas, a la vista.">
        <QuienDecide />
        <p className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700">
          <b className="text-slate-900">Responder de verdad.</b> Cada escala publica en qué gasta cada euro y qué consigue. Si el comité técnico no cumple lo que se le pidió, la asamblea lo cambia.
          Así la responsabilidad no es una palabra: tiene nombre, cuentas y un plazo.
        </p>
      </Apartado>

      {/* ── 6. Help between scales ── */}
      <Apartado id="escalas-ayuda" fondo="blanco" titulo="Cómo se ayudan entre ellas"
        entradilla="Las tareas suben solo cuando la escala cercana no puede; la ayuda baja. En lugar de subvenciones que se repiten cada año, préstamos que se devuelven al mismo valor y donaciones puntuales.">
        <SubeBaja />
        <Mas titulo="los cuatro tipos de ayuda, con las cifras de hoy">
          <AyudaEntreEscalas modo="literal" />
        </Mas>
      </Apartado>

      {/* ── 7. Open questions and sources ── */}
      <Apartado id="escalas-retos" titulo="Lo que falta por resolver"
        entradilla="Repartir el poder hacia abajo tiene preguntas abiertas. Estas son las más importantes.">
        <ul className="grid gap-x-6 md:grid-cols-2">
          {RETOS.map(r => (
            <li key={r.t} className="border-t border-slate-200 py-4">
              <h3 className="font-bold text-slate-900">{r.t}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{partir(r.d)[0]}{r.fuente && <Fuente id={r.fuente} />}</p>
              {partir(r.d)[1] && (
                <Mas titulo="seguir leyendo" className="mt-2">
                  <p className="max-w-xl text-[15px] leading-relaxed text-slate-600">{partir(r.d)[1]}</p>
                </Mas>
              )}
            </li>
          ))}
        </ul>
        <Mas titulo="fuentes de esta ventana" className="mt-8">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {Object.values(F).map(f => (
              <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
            ))}
            {['igae-cofog', 'comunidades-cuotas', 'ue-presupuesto', 'aod-2025', 'ine-poblacion'].map(id => FUENTE[id] && (
              <li key={id}><a href={FUENTE[id].url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{FUENTE[id].titulo}</a></li>
            ))}
          </ul>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-500">
            El gasto de hoy es de 2024 (IGAE). Lo que recibiría cada escala es una estimación con los datos de 2025 de la ventana Recaudación, para {numero(ESPANA.poblacion / 1e6, 1)} millones de habitantes.
            Las responsabilidades de cada escala y los ejemplos de tareas son una propuesta de esta página, no una norma.
          </p>
        </Mas>
      </Apartado>

      {/* ── 8. Money: the way into «Recaudación», last so the page ends on the button ── */}
      <Apartado id="escalas-dinero" fondo="blanco" titulo="Y el dinero: cómo llega a cada escala"
        entradilla="Para que cada escala pueda cumplir con su responsabilidad, necesita su propio dinero. Llega así, en tres pasos:">
        <ol className="grid gap-3 md:grid-cols-3 md:gap-4">
          <li className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <span className="text-2xl font-[750] tabular-nums text-slate-300">1</span>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Se cobra al pagar</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">Un solo impuesto, que se suma al precio: un {tipos} % según sea lo básico, lo secundario, el ocio o el lujo.</p>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <span className="text-2xl font-[750] tabular-nums text-slate-300">2</span>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Se reparte en ocho partes iguales</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">Una para cada escala, la misma cantidad por habitante: unos {euros(pais.porPersonaEscala)} al año por persona en cada una.</p>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <span className="text-2xl font-[750] tabular-nums text-slate-300">3</span>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Cada escala lo divide en tres</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">Un tercio para producir, uno para cuidar y uno libre, del que al menos una quinta parte se ahorra para emergencias.</p>
          </li>
        </ol>
        <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-700">
          Con los datos de 2025, en España se recaudarían unos {millones(pais.recaudacion)} al año, y cada escala recibiría {millones(pais.porEscala)}. Es una estimación: el cálculo completo está en Recaudación.
          Hoy las administraciones gastan {millones(HOY_TOTAL)}; de ellos, {millones(HOY.pensiones2024)} son pensiones<Fuente id="igae-cofog" />, que en el modelo se pagan aparte (ventana <a href="#pensiones" className={enlace}>Pensiones</a>).
          Sin ellas quedan {millones(sinPensiones)}: las ocho escalas recibirían unos {millones(Math.abs(diferencia))} {diferencia >= 0 ? 'más' : 'menos'}. Los intereses de la deuda, en la ventana Economía, parte <a href="#deuda" className={enlace}>Deuda</a>.
        </p>
        <Mas titulo="los tres tercios en cada escala">
          <Tercios modo="literal" />
        </Mas>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href="#esquema" className={`${llamada} justify-center bg-slate-900 text-white hover:bg-slate-700`}>Cómo se reparte la recaudación <ArrowRight aria-hidden className="h-4 w-4" /></a>
          <a href="#impuestos" className={`${llamada} justify-center border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>Cómo se cobra el impuesto</a>
          <a href="#presupuestos" className={`${llamada} justify-center border border-slate-300 bg-white text-slate-800 hover:bg-slate-50`}>En qué gasta cada escala</a>
        </div>
      </Apartado>

    </>
  );
}
