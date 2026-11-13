// The «Justicia» window of the «Modelo socioeconómico optimizado» (Eugenio,
// 2026-11-12): waiting times and long trials today; one single complaint that
// the system routes to civil, criminal or both, instead of being told to start
// again; fast and remote trials; on-duty judges inside police stations; police
// and courts working as one service, without the judge depending on the police.
// Data and sources: src/data/justicia.ts.
import { useState } from 'react';
import { Monitor, Timer } from 'lucide-react';
import { F, Recorrido } from './JusticiaPiezas';
import { Ocupacion, Reincidencia } from './JusticiaReincidencia';
import { ESCALAS, ESPANA, MATRIZ, TERCIOS, modeloPorFuncion, numero, porcentaje } from '../../data/modeloSocioeconomico';
import {
  ACTIVIDAD_2025, CAMBIOS_2025, DURACION_APELACION, DURACION_DIAS, DURACION_SOCIAL_MESES, FUENTES_JUSTICIA,
  JUECES, JURISDICCIONES, JUSTICIA_ESCALAS, NO_CAMBIA_2025, PLAZOS_PROPUESTA, PRESUPUESTO_HAB_2022, RECORRIDO_HOY,
  RECORRIDO_PROPUESTA, REFORMA, RETOS_JUSTICIA, vaciarCola,
} from '../../data/justicia';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Muestra, Regulador } from './piezas';
import { cn } from '../../utils/cn';
import { Pares } from './graficos/Pares';

const millonesTxt = (n: number) => `${numero(n / 1e6, 2)} millones`;
const texto = 'max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700';

export function JusticiaVentana() {
  return (
    <>
      <Resumen />
      <Propuesta />
      <Reincidencia />
      <Ocupacion />
      <Hoy />
      <CivilPenal />
      <Cola />
      <Escalas />
      <Retos />
      <Apartado id="justicia-fuentes" titulo="Fuentes" fondo="blanco"
        entradilla="Consultadas en noviembre de 2026. Los plazos de la propuesta son una propuesta para debatir, no un dato.">
        <ul className="grid max-w-4xl gap-2 text-sm">
          {FUENTES_JUSTICIA.map(f => (
            <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
          ))}
        </ul>
      </Apartado>
    </>
  );
}

function Resumen() {
  const cola = vaciarCola(1, ESPANA.poblacion);
  return (
    <Apartado id="justicia" titulo="Una sola puerta para la justicia, y sin listas de espera"
      entradilla={<>Hoy, quien denuncia tiene que acertar el camino: civil, penal, administrativo o laboral. Si se equivoca, empieza otra vez. Y cada camino tiene su cola. La propuesta: denunciar una sola vez, que el sistema lo reparta, jueces de guardia en las comisarías, juicios rápidos y a distancia, y plazos máximos.</>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra valor={`${DURACION_DIAS[0].espana} días`} tono="mal"
          texto={<>tardaría de media en resolverse un asunto civil, según la estimación oficial. En la mediana de la UE, {DURACION_DIAS[0].ue}<F id="cepej-2024" /></>} nota="Primera instancia, 2024. Si alguien recurre, se suma la apelación." />
        <Cifra valor={millonesTxt(ACTIVIDAD_2025.pendientes)} tono="mal"
          texto={<>de asuntos esperando en los juzgados a final de 2025, un {porcentaje(ACTIVIDAD_2025.pendientesVariacion, 1)} más que un año antes<F id="cgpj-2025" /></>} />
        <Cifra valor={`≈ ${numero(Math.round(cola.faltan / 100) * 100)}`} tono="neutro"
          texto={<>jueces más harían falta para llegar a la mediana de la UE: {numero(JUECES.ue100k, 1)} por cada 100.000 habitantes. Hoy hay {numero(JUECES.por100k, 1)}<F id="cepej-2024" /></>} nota="Estimación nuestra. Ver «Cómo se vacía la cola»." />
        <Cifra valor="1 denuncia" tono="bien"
          texto="y el sistema la lleva a lo civil, a lo penal o a los dos. Nadie vuelve a empezar." nota="Propuesta." />
      </div>
      <GraficaDuracion />
    </Apartado>
  );
}

/** Disposition time, Spain vs EU median: first instance and appeal, each pair on one shared scale. */
function GraficaDuracion() {
  const A = DURACION_APELACION;
  const dias = (v: number) => `${numero(v)} días`;
  const nota = (es: number, ue: number) => (es > ue ? `España tarda ${numero(es / ue, 1)} veces lo que la mediana.` : 'Aquí España es más rápida que la mediana.');
  return (
    <div className="mt-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <Pares titulo="Cuánto tardaría en resolverse un asunto, en días"
          subtitulo="Primera instancia, 2024. España frente a la mediana de la UE: la mitad de los países tarda menos y la otra mitad, más"
          series={['España', 'Mediana de la UE']} formato={dias}
          pares={DURACION_DIAS.map(d => ({ etiqueta: d.nombre, a: d.espana, b: d.ue, nota: nota(d.espana, d.ue) }))}
          pie={<>Consejo de Europa (CEPEJ) para el Cuadro de Indicadores de la Justicia de la UE<F id="cepej-2024" /></>} />
        <Pares titulo="Y si alguien recurre: la apelación, en días"
          subtitulo="Segunda instancia, 2024. Se suma a la primera"
          series={['España', 'Mediana de la UE']} formato={dias}
          pares={[
            { etiqueta: 'Civil y mercantil', a: A.civil, b: A.civilUE, nota: nota(A.civil, A.civilUE) },
            { etiqueta: 'Contencioso', a: A.contencioso, b: A.contenciosoUE, nota: nota(A.contencioso, A.contenciosoUE) },
            { etiqueta: 'Penal', a: A.penal, b: A.penalUE, nota: nota(A.penal, A.penalUE) },
          ]}
          pie={<>Misma fuente<F id="cepej-2024" /></>} />
      </div>
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-500">
        Es una estimación oficial, no un tiempo medido: los asuntos pendientes divididos por los que se resuelven cada día. En lo social (despidos, salarios) el Consejo General del Poder Judicial calcula {numero(DURACION_SOCIAL_MESES.total, 1)} meses de media, y {numero(DURACION_SOCIAL_MESES.despidos, 1)} en los despidos (2024)<F id="ccoo-social" />.
      </p>
    </div>
  );
}

function Hoy() {
  return (
    <Apartado id="justicia-hoy" titulo="Cómo funciona hoy: cuatro caminos y cuatro colas"
      entradilla={<>En 2025 llegaron a los juzgados {millonesTxt(ACTIVIDAD_2025.ingresados)} de asuntos y se resolvieron {millonesTxt(ACTIVIDAD_2025.resueltos)}. Como entran más de los que salen, la cola crece, sobre todo en lo penal y en lo laboral<F id="cgpj-2025" />.</>}>
      <div className="grid gap-4 md:grid-cols-2">
        {JURISDICCIONES.map(j => {
          const max = Math.max(j.ingresados, j.resueltos, j.pendientes);
          return (
          <div key={j.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-lg font-bold text-slate-900">{j.nombre}</p>
            <p className="mt-1 text-[15px] leading-snug text-slate-600">{j.que}</p>
            <dl className="mt-4 space-y-1.5 text-sm">
              {[{ t: 'Llegaron', v: j.ingresados, c: 'bg-slate-400' }, { t: 'Se resolvieron', v: j.resueltos, c: 'bg-slate-700' }, { t: 'Esperando', v: j.pendientes, c: 'bg-rose-700' }].map(b => (
                <div key={b.t} className="flex items-center gap-2">
                  <dt className="w-28 shrink-0 text-slate-600">{b.t}</dt>
                  <dd className="flex min-w-0 flex-1 items-center gap-2">
                    <span aria-hidden className={cn('h-3 shrink-0 rounded-r-[3px]', b.c)} style={{ width: `${Math.max(1, (b.v / max) * 55)}%` }} />
                    <span className="whitespace-nowrap tabular-nums text-slate-800">{numero(b.v)}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className={cn('mt-3 text-sm font-medium', j.pendientesVar > 0 ? 'text-rose-700' : 'text-emerald-700')}>
              {j.pendientesVar > 0 ? 'La cola crece' : 'La cola baja'} un {porcentaje(Math.abs(j.pendientesVar), 1)} en un año
            </p>
          </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">Datos de toda España, 2025<F id="cgpj-2025" />. Cada tarjeta tiene su propia escala: el contencioso recibe unas 17 veces menos asuntos que lo civil.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="flex items-center gap-2 font-bold text-slate-900"><Timer aria-hidden className="h-5 w-5 text-slate-500" />Los juicios rápidos ya existen</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
            Desde 2003, los delitos sencillos con el autor identificado (un hurto, unas lesiones, conducir bebido, violencia en la familia) pueden juzgarse en días: la policía cita a todos ante el juzgado de guardia, el juez investiga allí mismo y el juicio se celebra en 15 días como máximo<F id="lecrim" />. Si el acusado reconoce los hechos, la pena baja un tercio y puede haber sentencia ese mismo día.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="flex items-center gap-2 font-bold text-slate-900"><Monitor aria-hidden className="h-5 w-5 text-slate-500" />Y los juicios a distancia también</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
            Desde marzo de 2024, la ley dice que juicios y declaraciones se hagan preferentemente por videollamada<F id="rdl-6-2023" />. Las víctimas de violencia machista o sexual y los menores pueden declarar desde donde estén. En los delitos graves, el acusado tiene que estar en la sala<F id="sepin-telematico" />.
          </p>
        </div>
      </div>

      <Mas titulo="más datos: jueces, dinero y apelaciones">
        <div className={texto}>
          <p><strong>Jueces.</strong> En 2024 había {numero(JUECES.total)} jueces profesionales, {numero(JUECES.primeraInstancia)} de ellos en primera instancia: {numero(JUECES.por100k, 1)} por cada 100.000 habitantes, frente a {numero(JUECES.ue100k, 1)} en la mediana de la UE<F id="cepej-2024" />. La presidenta del Supremo y del CGPJ dijo en febrero de 2026 que hay 260 plazas de juez más que jueces para ocuparlas<F id="cgpj-jueces" />.</p>
          <p><strong>Dinero.</strong> España gastaba en 2022 unos {numero(PRESUPUESTO_HAB_2022, 1)} € por habitante en su sistema de justicia (juzgados, fiscalía y abogados de oficio), por encima de la mediana europea<F id="cepej-2022" />. No falta tanto dinero como jueces y organización. El Gobierno dice haber invertido {numero(REFORMA.inversion)} millones en esta legislatura, {numero(REFORMA.digital)} de ellos en digitalizar<F id="moncloa-instancia" />.</p>
          <p><strong>Apelaciones.</strong> Según la estimación oficial, un recurso civil tardaría de media {DURACION_APELACION.civil} días (mediana de la UE: {DURACION_APELACION.civilUE}); uno contencioso, {DURACION_APELACION.contencioso} (mediana de la UE: {DURACION_APELACION.contenciosoUE}). En lo penal, España es más rápida: {DURACION_APELACION.penal} días frente a {DURACION_APELACION.penalUE} de mediana en la UE<F id="cepej-2024" />.</p>
          <p><strong>Pleitos por habitante.</strong> En 2025 hubo {numero(ACTIVIDAD_2025.litigiosidad, 1)} asuntos por cada 1.000 habitantes<F id="cgpj-2025" />.</p>
          <p><strong>Cuántos juicios rápidos hay.</strong> No hemos encontrado una cifra nacional oficial y reciente de juicios rápidos; el CGPJ publica los datos por juzgado, no un total.</p>
          <p className="text-sm text-slate-500">Las duraciones son estimaciones del Consejo de Europa y del CGPJ a partir de lo que entra, sale y espera en cada juzgado: sirven para comparar, no para saber cuánto tardará un caso concreto<F id="cgpj-duraciones" />.</p>
        </div>
      </Mas>
      <Reforma />
    </Apartado>
  );
}

function CivilPenal() {
  return (
    <Apartado id="justicia-civil-penal" fondo="blanco" titulo="Lo penal va primero"
      entradilla={<><span className="mb-2 block text-sm font-medium text-slate-500">Lo que los juristas llaman «prejudicialidad penal»</span>Hoy hay que elegir entre lo civil y lo penal porque son dos preguntas distintas. Lo penal pregunta: ¿alguien cometió un delito y merece un castigo? Lo civil pregunta: ¿alguien te debe algo y cuánto? Un mismo hecho tiene a menudo las dos caras, y cada una va por su puerta.</>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-slate-900">Un ejemplo</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
            Pagas 8.000 € a un constructor para reformar tu cocina y desaparece. ¿Es una estafa (penal) o un contrato que no cumplió (civil)? Si denuncias por estafa y el juez cree que solo es un incumplimiento, archiva y te manda a lo civil: abogado, procurador, intento de acuerdo y demanda nueva. Y al revés: si empiezas en lo civil y aparece un posible delito, el juez civil para todo hasta que termine el penal.
          </p>
          <p className="mt-2 text-xs text-slate-500">Caso inventado para explicarlo.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-slate-900">Por qué lo penal va primero</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
            Si un juicio civil depende de saber si hubo delito, se suspende hasta que lo penal decida<F id="lec" />, y mientras haya un proceso penal abierto no puede seguir un pleito civil sobre el mismo hecho<F id="lecrim" />. Sirve para que dos jueces no digan cosas opuestas sobre lo mismo, pero alarga la espera.
          </p>
        </div>
      </div>
      <Mas titulo="lo que ya está unido hoy, y lo que no">
        <div className={texto}>
          <p>Ya hay una parte unida: quien sufre un delito no tiene que demandar aparte por los daños. El juez penal decide a la vez la indemnización, salvo que la víctima prefiera reservarla para lo civil<F id="lecrim" />.</p>
          <p>Lo que no está unido es lo demás. Si el juez penal archiva porque no ve delito, la indemnización no se decide y hay que empezar de cero en lo civil. Y la denuncia no se «reconvierte»: lo que contaste en la comisaría no sirve como demanda civil.</p>
          <p>Por eso la propuesta no es borrar la diferencia entre civil y penal, sino que la persona no tenga que conocerla: una sola entrada, un solo expediente, y que sea el sistema quien lo reparta.</p>
        </div>
      </Mas>
    </Apartado>
  );
}

function Reforma() {
  return (
    <Mas titulo="la reforma de 2025: qué cambia y qué no">
      <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
        La Ley Orgánica 1/2025, de eficiencia de la justicia, entró en vigor el 3 de abril de 2025<F id="lo-1-2025" />. Ordena mejor los juzgados y obliga a intentar un acuerdo antes de pleitear. Es un paso, no el camino entero.
      </p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Qué cambia</h3>
          <ul className="mt-3 space-y-3">
            {CAMBIOS_2025.map(c => (
              <li key={c.t} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{c.t}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{c.d}<F id={c.fuente} /></p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Qué no cambia</h3>
          <ul className="mt-3 space-y-3">
            {NO_CAMBIA_2025.map(t => (
              <li key={t} className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[15px] leading-relaxed text-rose-900">{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <Mas titulo="los primeros resultados, con cautela">
        <div className={texto}>
          <p>Hay dos cifras de bajada de pleitos civiles nuevos, y miden cosas distintas:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>{porcentaje(Math.abs(REFORMA.civilT1_2026), 1)} menos</strong> en toda España, en el primer trimestre de 2026 frente al de 2025, según el Consejo General del Poder Judicial<F id="cgpj-2026t1" />.</li>
            <li><strong>Más de un {Math.abs(REFORMA.litigiosidadCivil)} % menos</strong> en el primer año entero (julio de 2025 a junio de 2026), pero solo en las comunidades que gestiona el Ministerio, más Asturias y La Rioja, según el Gobierno<F id="moncloa-instancia" />.</li>
          </ul>
          <p>Según el Gobierno, en ese año los juicios señalados subieron un 7,3 % y los asuntos civiles pendientes empezaron a bajar por primera vez en unos diez años, sin contar la pandemia. Ha anunciado {REFORMA.plazasNuevas} plazas nuevas de juez.</p>
          <p>Cautela: que entren menos pleitos puede ser porque se resuelven con acuerdos o porque el paso previo disuade a quien no puede pagarlo. Aún no hay datos para saber qué pesa más. Y en lo penal la cola siguió creciendo en 2025: un 11,7 %<F id="cgpj-2025" />.</p>
        </div>
      </Mas>
    </Mas>
  );
}

function Propuesta() {
  return (
    <Apartado id="justicia-propuesta" titulo="La propuesta: denunciar una vez, y que la justicia vaya a ti" fondo="blanco"
      entradilla="Que la policía y los juzgados no vayan por separado, sino unidos, para que todo sea más ágil: sin listas de espera ni juicios que se alarguen más de la cuenta. Así cambia el recorrido de una denuncia.">
      <p className="max-w-3xl text-[15px] text-slate-600">El mismo caso, hoy y con la propuesta. Las flechas que vuelven atrás son las veces que hoy se empieza de nuevo.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Recorrido titulo="Hoy" pasos={RECORRIDO_HOY} tono="mal" />
        <Recorrido titulo="Con la propuesta" pasos={RECORRIDO_PROPUESTA} tono="bien" />
      </div>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Plazos máximos</h3>
      <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-600">Son una propuesta para empezar a debatir, no salen de ningún estudio. Al lado, lo que dice hoy la ley.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {PLAZOS_PROPUESTA.map(p => (
          <li key={p.t} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{p.t}</p>
            <p className="mt-2 text-lg font-bold leading-snug text-emerald-800">{p.plazo}</p>
            <p className="mt-2 border-t border-slate-100 pt-2 text-sm leading-relaxed text-slate-600"><span className="font-medium text-slate-700">Hoy: </span>{p.hoy}{p.fuente && <F id={p.fuente} />}</p>
          </li>
        ))}
      </ul>

      <Mas titulo="qué pasa si un plazo no se cumple">
        <div className={texto}>
          <p>Un plazo sin consecuencia no sirve. La propuesta: cada juzgado publica cada mes cuántos casos lleva fuera de plazo. Si pasa de un umbral, el tribunal le manda refuerzos o reparte sus casos entre otros jueces, que pueden llevarlos a distancia desde otra ciudad.</p>
          <p>La Constitución ya reconoce el derecho a un juicio «sin dilaciones indebidas»<F id="constitucion" />. Si se incumple el plazo por culpa del sistema, quien espera podría recibir una compensación. El caso nunca se cierra solo por pasarse el plazo.</p>
        </div>
      </Mas>

      <Mas titulo="cómo sería un juzgado de guardia en una comisaría">
        <div className={texto}>
          <p>Una sala dentro de la comisaría, pero con puerta, personal y ordenadores de la justicia, no de la policía. Allí están, por turnos, un juez de guardia, un letrado de la administración de justicia (que da fe de lo que pasa), un fiscal y un abogado de oficio.</p>
          <p>En las comisarías grandes, en persona y las 24 horas. En las pequeñas y en los pueblos, una sala de videollamada conectada con el juez de guardia del tribunal de la provincia.</p>
          <p>Qué se puede hacer allí: tomar declaración a la víctima y a los testigos en el momento, cuando lo recuerdan mejor; decidir sobre un detenido sin trasladarlo; dictar una orden de alejamiento; celebrar un juicio rápido si todos están de acuerdo.</p>
          <p>Qué no: el juez no recibe órdenes de la policía ni le rinde cuentas. Depende del Consejo General del Poder Judicial, como hoy.</p>
        </div>
      </Mas>
    </Apartado>
  );
}

/** How the backlog empties with more judges: an estimate, with a slider. */
function Cola() {
  const base = vaciarCola(1, ESPANA.poblacion);
  const tope = Math.round(base.faltan / 100) * 100;
  const [nuevos, setNuevos] = useState(tope);
  const c = vaciarCola(nuevos, ESPANA.poblacion);
  const mill = (m: number) => `${numero(Math.round(m))} M€`;
  return (
    <Apartado id="justicia-cola" titulo="Cómo se vacía la cola"
      entradilla={<>Sin más jueces, ningún plazo máximo se cumple. Para llegar a la mediana de la UE ({numero(JUECES.ue100k, 1)} jueces por cada 100.000 habitantes) harían falta unos {numero(tope)} jueces más que los {numero(JUECES.total)} de hoy<F id="cepej-2024" />. Esto es una estimación nuestra, con cuentas sencillas.</>}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <Regulador etiqueta="Jueces nuevos" valor={nuevos} min={500} max={tope} paso={100}
            mostrar={numero(nuevos)} onChange={setNuevos}
            ayuda={`El Gobierno ha anunciado ${REFORMA.plazasNuevas}. Para la mediana de la UE, unos ${numero(tope)}.`} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Cifra valor={`≈ ${numero(Math.round(c.diasCivil))} días`} tono="neutro"
            texto={<>tardaría un asunto civil nuevo, frente a los {DURACION_DIAS[0].espana} de hoy. Mediana de la UE: {DURACION_DIAS[0].ue}<F id="cepej-2024" /></>}
            nota="Estimación nuestra: si cada juez nuevo resuelve como la media de hoy, una vez formado." />
          <Cifra valor={mill(Math.round(c.costeMedio / 10) * 10)} tono="neutro"
            texto={<>al año, en el punto medio. Cada plaza, con su personal, cuesta entre 100.000 € y 600.000 €<F id="moncloa-instancia" /></>}
            nota={`Horquilla: de ${mill(c.costeMin)} a ${mill(c.costeMax)} al año.`} />
        </div>
      </div>
      <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        Una parte de lo pendiente es trabajo normal, no retraso: los {millonesTxt(ACTIVIDAD_2025.pendientes)} de asuntos que esperan equivalen a unos {numero(c.mesesPendientes, 1)} meses de lo que hoy resuelven los juzgados<F id="cgpj-2025" />. Lo que se puede eliminar es el exceso: la parte de la espera que va más allá de lo que tarda un caso en prepararse y juzgarse.
      </p>
      <Mas titulo="cómo está hecha la cuenta, y sus límites">
        <div className={texto}>
          <p><strong>Jueces que faltan:</strong> {numero(JUECES.ue100k, 1)} por cada 100.000 habitantes × {numero(ESPANA.poblacion / 1e6, 1)} millones de habitantes, menos los {numero(JUECES.total)} jueces de 2024<F id="cepej-2024" />.</p>
          <p><strong>Ritmo:</strong> en 2025 se resolvieron {millonesTxt(ACTIVIDAD_2025.resueltos)} de asuntos<F id="cgpj-2025" />. Divididos entre los jueces de 2024, salen unos {numero(Math.round(c.porJuez / 10) * 10)} por juez y año. Es una media gruesa: un asunto de tráfico y una herencia cuentan igual.</p>
          <p><strong>Coste:</strong> el Gobierno dice que una plaza de juez con sus funcionarios costaba unos 600.000 € al año con los juzgados antiguos y no más de 100.000 € en los tribunales de instancia, porque el personal se comparte<F id="moncloa-instancia" />. La cifra real estará entre las dos.</p>
          <p><strong>Días por asunto:</strong> los {DURACION_DIAS[0].espana} días de hoy multiplicados por los jueces de hoy y divididos entre los de hoy más los nuevos. Supone que todos los jueces resuelven al mismo ritmo y que lo nuevo se reparte igual entre jurisdicciones.</p>
          <p><strong>Límites:</strong> un juez tarda años en formarse, así que la espera no baja de golpe. Y la cola solo baja si, además, cada año se resuelve al menos lo que entra; hoy se resuelve el {porcentaje((ACTIVIDAD_2025.resueltos / ACTIVIDAD_2025.ingresados) * 100, 1)}.</p>
        </div>
      </Mas>
    </Apartado>
  );
}

function Escalas() {
  return (
    <Apartado id="justicia-escalas" fondo="blanco" titulo="Qué hace cada escala"
      entradilla="La justicia la dicta un juez independiente. Pero llegar a ella, los medios y las reglas se reparten entre las ocho escalas, de la persona al planeta.">
      <TarjetasEscalas escalas={ESCALAS.slice(0, 3)} />
      <Mas titulo={`las otras ${ESCALAS.length - 3} escalas, de la provincia al planeta`}>
        <TarjetasEscalas escalas={ESCALAS.slice(3)} />
      </Mas>
      <p className="mt-4 max-w-3xl text-sm text-slate-500">Propuesta. Hoy los jueces y las leyes son del Estado, y los edificios, el personal y los ordenadores de los juzgados los pagan muchas comunidades autónomas.</p>
      <EnElModelo />
    </Apartado>
  );
}

/** Cards of what each scale does for justice. */
function TarjetasEscalas({ escalas }: { escalas: typeof ESCALAS }) {
  return (
    <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {escalas.map(e => {
        const j = JUSTICIA_ESCALAS[e.id];
        if (!j) return null;
        return (
          <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 font-bold text-slate-900"><Muestra color={e.color} />{e.nombre}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{j.hace}</p>
            <p className="mt-1 text-sm text-slate-500">Por ejemplo: {j.ejemplo}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** Where justice sits in the model: the «seguridad» area of the matrix, and its money. */
function EnElModelo() {
  const f = modeloPorFuncion('literal').find(x => x.id === 'seguridad')!;
  const libre = TERCIOS.find(t => t.id === 'libre')!;
  return (
    <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700">
      <p className="font-bold text-slate-900">De dónde sale el dinero en el modelo</p>
      <p className="mt-1">
        La justicia va en el ámbito «Seguridad» de cada escala, dentro de su tercio de {libre.nombre.toLowerCase()}. La nación le dedica un {MATRIZ.nacion.seguridad.peso} % de lo que recibe (tribunales, policía y guardia civil) y la región un {MATRIZ.region.seguridad.peso} % (juzgados de proximidad y emergencias).
        Entre todas las escalas de España suman unos {numero(Math.round(f.modelo / 100) * 100)} M€ al año, frente a los {numero(f.hoy)} M€ que cuestan hoy seguridad y justicia juntas<Fuente id="igae-cofog" />.
        Es decir, el modelo da hoy menos dinero a este ámbito, y los jueces nuevos de «Cómo se vacía la cola» habría que pagarlos ahorrando en otra parte de la seguridad (por ejemplo, con el cuerpo único de la ventana Seguridad) o subiendo su peso. Queda por decidir.
      </p>
    </div>
  );
}

function Retos() {
  return (
    <Apartado id="justicia-retos" titulo="Lo que falta por resolver"
      entradilla="Una justicia más rápida no puede ser una justicia con menos garantías. Estos son los puntos difíciles, dichos con claridad.">
      <TarjetasRetos retos={RETOS_JUSTICIA.slice(0, 4)} />
      <Mas titulo={`otros ${RETOS_JUSTICIA.length - 4} retos`}>
        <TarjetasRetos retos={RETOS_JUSTICIA.slice(4)} />
      </Mas>
    </Apartado>
  );
}

function TarjetasRetos({ retos }: { retos: typeof RETOS_JUSTICIA }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {retos.map(r => (
        <li key={r.t} className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-slate-900">{r.t}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{r.d}{r.fuente && <F id={r.fuente} />}</p>
        </li>
      ))}
    </ul>
  );
}
