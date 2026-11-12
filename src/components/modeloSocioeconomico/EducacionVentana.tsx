// The «Educación» window (Eugenio, 2026-11-12): a budget for every person from
// birth to 25 to learn — an educational backpack that follows the pupil to the
// school they choose, ending the public / state-subsidised / private debate;
// older pupils teaching younger ones as part of their own curriculum; groups by
// pace inside each class; projects; trades in the ordinary curriculum; and an
// evaluator bot that keeps simplifying the system. Data: src/data/educacion.ts.
import { useState } from 'react';
import { ESCALAS, MATRIZ, euros, numero, porcentaje } from '../../data/modeloSocioeconomico';
import {
  BOT, COSTE_ALUMNO, COSTE_PAIS_MAXIMO, DINERO, ESCALA_MOCHILA, ETAPA_NOMBRE, EVIDENCIA, FE, FUENTES_EDU,
  MOCHILA_BASE, NACIMIENTOS_2024, POBLACION_EDAD, ACOMPANAN, COSTE_PAIS_REAL, CREDITO, FICHA_EJEMPLO, PIEZAS_MOCHILA, ALUMNADO, PAISES, PROYECTOS_EVIDENCIA, REDES, RED_TOTAL, REGLAS, RESULTADOS, RETOS, SEMANA,
  mochila, type Ano, type Red, type Tras16, type Tras18,
} from '../../data/educacion';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Muestra, Regulador, Segmentado } from './piezas';
import { cn } from '../../utils/cn';

/** A source link by id of FUENTES_EDU. */
function F({ id }: { id: string }) {
  const f = FE[id];
  return f ? <Fuente url={f.url} titulo={f.titulo} /> : null;
}

const mill = (m: number) => `${numero(m)} M€`;
const redondo = (n: number, a = 100) => Math.round(n / a) * a;

export function EducacionVentana() {
  return (
    <>
      <Resumen />
      <Hoy />
      <Mochila />
      <Riesgos />
      <Aula />
      <Bot />
      <Escalas />
      <Retos />
      <Fuentes />
    </>
  );
}

// ── 1. Summary ──────────────────────────────────────────────────────────────
function Resumen() {
  return (
    <Apartado id="educacion" titulo="Una mochila para aprender, de 0 a 25 años"
      entradilla={<>Cada bebé que nace recibe una «mochila educativa»: el dinero de su formación hasta los 25 años. La familia (y después el propio alumno) elige la escuela, y el dinero va con él. Así se acaba el debate entre pública, concertada y privada: todas las escuelas que acepten la mochila son gratis, no eligen a sus alumnos y cumplen las mismas reglas.</>}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra tono="mal" valor={porcentaje(RESULTADOS.abandono2025, 1)}
          texto={<>de los jóvenes de 18 a 24 años dejó de estudiar sin el título de bachillerato o FP en 2025<F id="abandono-2025" /></>}
          nota={<>En la Unión Europea, el {porcentaje(RESULTADOS.abandonoUE2025, 1)}<F id="abandono-ue" /></>} />
        <Cifra tono="mal" valor={`${euros(DINERO.porAlumnoPublica)} / ${euros(DINERO.porAlumnoConcertada)}`}
          texto={<>de dinero público por alumno en la escuela pública y en la concertada (2023)<F id="concertada-2023" /></>}
          nota="Un alumno no vale lo mismo según la puerta por la que entra" />
        <Cifra tono="mal" valor={porcentaje(RESULTADOS.repetidores, 0)}
          texto={<>de los alumnos de 15 años ha repetido algún curso<F id="esade-pisa" /></>}
          nota="Con la misma nota, un alumno de familia pobre tiene casi cuatro veces más probabilidades de repetir" />
        <Cifra tono="bien" valor={`≈ ${euros(redondo(MOCHILA_BASE, 500))}`}
          texto="en la mochila de cada persona, de 0 a 25 años"
          nota="Cálculo de esta página con lo que cuesta hoy un alumno en un centro público, etapa a etapa" />
      </div>

      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          { t: 'Una mochila por persona', d: 'Lo que cuesta su educación, desde que nace hasta los 25. Quien más lo necesita lleva más. Ninguna escuela que la acepte puede cobrar de más ni elegir alumnos.' },
          { t: 'Alumnos que enseñan a alumnos', d: 'Los mayores ayudan a los pequeños como parte de su propio currículo. Aprenden los dos, y el profesor puede atender por grupos de avance.' },
          { t: 'Proyectos y oficios para todos', d: 'Proyectos en grupo con objetivos reales, y proyectos propios de construcción, electricidad o carpintería dentro del currículo normal, no solo en la FP.' },
        ].map(x => (
          <li key={x.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-lg font-bold text-slate-900">{x.t}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{x.d}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Cuidado y encauzado por la sociedad, desde que nace</h3>
      <p className="mt-1 max-w-3xl text-[15px] text-slate-600">Nadie hace el camino solo. Un orientador público sigue a cada persona de 0 a 25 años, y en cada etapa la acompañan:</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACOMPANAN.map(a => (
          <li key={a.edad} className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <p className="font-bold text-sky-900">{a.edad}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{a.quien}</p>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-500">Propuesta de esta página.</p>
    </Apartado>
  );
}

// ── 2. Today ────────────────────────────────────────────────────────────────
const COLOR_RED: Record<keyof Red, string> = { publica: 'bg-slate-800', concertada: 'bg-sky-600', privada: 'bg-amber-400' };
const NOMBRE_RED: Record<keyof Red, string> = { publica: 'Pública', concertada: 'Concertada', privada: 'Privada' };

function Hoy() {
  const fila = (etapa: string, r: Red, k: string, fuerte = false) => (
    <div key={k} className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[190px_1fr]">
      <span className={cn('text-sm text-slate-700', fuerte && 'font-semibold text-slate-900')}>{etapa}</span>
      <div className="flex h-6 w-full overflow-hidden rounded-[4px]" role="img"
        aria-label={`${etapa}: pública ${porcentaje(r.publica)}, concertada ${porcentaje(r.concertada)}, privada ${porcentaje(r.privada)}`}>
        {(Object.keys(COLOR_RED) as (keyof Red)[]).map(k2 => (
          <div key={k2} className={cn('flex h-full items-center justify-center text-[11px] font-semibold tabular-nums', COLOR_RED[k2], k2 === 'privada' ? 'text-slate-900' : 'text-white')}
            style={{ width: `${r[k2]}%` }} title={`${NOMBRE_RED[k2]}: ${porcentaje(r[k2])}`}>
            {r[k2] >= 9 ? numero(r[k2], 0) : ''}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Apartado id="educacion-hoy" fondo="blanco" titulo="Cómo es hoy: tres redes, tres precios"
      entradilla={<>Dos de cada tres alumnos van a la escuela pública, uno de cada cuatro a la concertada (privada pagada en parte con dinero público) y menos de uno de cada diez a la privada. Cada red recibe un dinero distinto por alumno, y en la concertada muchas familias pagan además una cuota.</>}>
      <figure className="rounded-2xl border border-slate-200 bg-white p-5">
        <figcaption className="text-lg font-bold text-slate-900">Dónde estudian los alumnos, en % (curso 2023-2024)<F id="datos-cifras" /></figcaption>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          {(Object.keys(COLOR_RED) as (keyof Red)[]).map(k => (
            <span key={k} className="inline-flex items-center gap-1.5"><span aria-hidden className={cn('h-3 w-3 rounded-sm', COLOR_RED[k])} />{NOMBRE_RED[k]}</span>
          ))}
        </div>
        <div className="mt-4 space-y-2.5">
          {REDES.map(r => fila(r.etapa, r.r, r.id))}
          <div className="border-t border-slate-100 pt-2.5">{fila('Total sin universidad', RED_TOTAL, 'total', true)}</div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">De 0 a 3 años y en la FP superior la privada pesa mucho más: casi uno de cada cuatro bebés escolarizados va a una escuela infantil privada.</p>
      </figure>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="flex items-center gap-2 font-bold text-slate-900"><span aria-hidden className="h-3 w-3 rounded-sm bg-slate-800" />Pública</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Gratis. Recibe <strong className="tabular-nums text-slate-900">{euros(DINERO.porAlumnoPublica)}</strong> de dinero público por alumno al año (2023, sin contar la universidad)<F id="concertada-2023" />. La gestiona la comunidad autónoma.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="flex items-center gap-2 font-bold text-slate-900"><span aria-hidden className="h-3 w-3 rounded-sm bg-sky-600" />Concertada</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Privada, pero la comunidad paga a sus profesores con un «concierto». Recibe <strong className="tabular-nums text-slate-900">{euros(DINERO.porAlumnoConcertada)}</strong> públicos por alumno (en Madrid, {euros(DINERO.porAlumnoMadridConcertada)})<F id="concertada-2023" />. Muchas cobran una cuota «voluntaria»: entre {euros(DINERO.cuotaMin)} y {euros(DINERO.cuotaMax)} al año de media<F id="cuotas-esade" />.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="flex items-center gap-2 font-bold text-slate-900"><span aria-hidden className="h-3 w-3 rounded-sm bg-amber-400" />Privada</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">La paga entera la familia. No recibe dinero público por alumno.</p>
        </div>
      </div>

      <Mas titulo="lo que cuesta un alumno en cada etapa, y cómo le va al sistema">
      <h3 className="text-xl font-bold text-slate-900">Lo que cuesta un alumno cada año, etapa a etapa</h3>
      <p className="mt-1 max-w-3xl text-[15px] text-slate-600">En un centro público, en 2022. Es la base para calcular la mochila<F id="datos-cifras" />.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-[15px]">
          <caption className="sr-only">Coste por alumno y año en centros públicos, por etapa, 2022</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
              <th scope="col" className="px-4 py-2 font-medium sm:px-5">Etapa</th>
              <th scope="col" className="px-4 py-2 font-medium">Edades</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Por alumno y año</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Infantil', '0 a 6', COSTE_ALUMNO.infantil],
              ['Primaria', '6 a 12', COSTE_ALUMNO.primaria],
              ['ESO', '12 a 16', COSTE_ALUMNO.eso],
              ['Bachillerato', '16 a 18', COSTE_ALUMNO.bachillerato],
              ['FP de grado medio', '16 a 18', COSTE_ALUMNO.fpMedia],
              ['FP de grado superior', '18 a 20', COSTE_ALUMNO.fpSuperior],
              ['Universidad', 'desde 18', COSTE_ALUMNO.universidad],
            ].map(([t, e, v]) => (
              <tr key={t as string} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="px-5 py-2.5 text-left font-semibold text-slate-900">{t}</th>
                <td className="px-4 py-2.5 text-slate-600">{e}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-900">{euros(v as number)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">No hay una cifra oficial propia para 0 a 3 años: la de infantil cubre de 0 a 6. Es todo lo que se gasta en el centro (casi todo, dinero público). Por eso no coincide exactamente con las cifras de 2023 de arriba, que solo cuentan dinero público.</p>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Cómo le va</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra valor={mill(Math.round(DINERO.publico2024))} texto={<>de gasto público en educación en 2024<F id="gasto-2024" /></>} nota="Todas las administraciones y universidades públicas" />
        <Cifra valor={numero(RESULTADOS.ratio, 1)} texto={<>alumnos por profesor en primaria y secundaria (curso 2022-2023)<F id="datos-cifras" /></>} nota="Contando a todo el profesorado; en el aula, los grupos son más grandes" />
        <Cifra valor={`${RESULTADOS.pisaMat} / ${RESULTADOS.ocdeMat}`} texto={<>puntos en matemáticas en PISA 2022 (el examen internacional a los 15 años): España y la media de la OCDE, el club de 38 países ricos<F id="pisa-2022" /></>} nota={`En lectura, ${RESULTADOS.pisaLec} frente a ${RESULTADOS.ocdeLec}; en ciencias, ${RESULTADOS.pisaCie} frente a ${RESULTADOS.ocdeCie}`} />
        <Cifra tono="mal" valor={porcentaje(RESULTADOS.abandonoExtranjeros, 1)} texto={<>de abandono entre jóvenes extranjeros, frente al {porcentaje(RESULTADOS.abandonoEspanoles, 1)} de los españoles<F id="abandono-2025" /></>} nota={`Chicos: ${porcentaje(RESULTADOS.abandonoHombres, 1)}; chicas: ${porcentaje(RESULTADOS.abandonoMujeres, 1)}`} />
      </div>

      <Mas titulo="más datos de hoy">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p><strong>En qué se gasta.</strong> De los {mill(Math.round(DINERO.publico2024))} de 2024, un {porcentaje(DINERO.infantilPrimariaPct)} va a infantil y primaria, un {porcentaje(DINERO.secundariaFpPct)} a secundaria y FP, y un {porcentaje(DINERO.universidadPct)} a la universidad. Los sueldos son {mill(DINERO.personal2024)}, y las becas, {mill(Math.round(DINERO.becas2024))}<F id="gasto-2024" />. Los conciertos con la concertada son el {porcentaje(DINERO.conciertosPct2023)} del gasto (2023)<F id="datos-cifras" />.</p>
          <p><strong>De 0 a 3 años.</strong> Van a la escuela infantil el {porcentaje(RESULTADOS.escolarizados0)} de los bebés de menos de un año, el {porcentaje(RESULTADOS.escolarizados1)} de los de un año y el {porcentaje(RESULTADOS.escolarizados2)} de los de dos (curso 2024-2025)<F id="datos-cifras" />. Cada año nacen unos {numero(redondo(NACIMIENTOS_2024, 1000))} bebés<F id="ine-nacimientos" />.</p>
          <p><strong>Frente a otros países.</strong> Contando de primaria a la universidad, España gasta por alumno un {porcentaje(RESULTADOS.bajoPorDebajoOcde, 0)} menos que la media de la OCDE (2023)<F id="eag-2026" />.</p>
          <p><strong>Separación entre alumnos.</strong> Según PISA 2022, la separación de alumnos por nivel económico entre escuelas está por debajo de la media de la OCDE, pero es alta en Madrid y Cataluña, y la separación por origen inmigrante ha crecido desde 2018. Con la misma nota en matemáticas, un alumno de familia pobre tiene casi cuatro veces más probabilidades de repetir que uno de familia rica<F id="esade-pisa" />.</p>
          <p><strong>Cuánto pagan las familias en la concertada.</strong> Entre dos tercios y tres cuartas partes de los colegios concertados cobran cuota, y entre el 81 % y el 95 % de sus alumnos la pagan: entre {mill(DINERO.cuotasTotalMin)} y {mill(DINERO.cuotasTotalMax)} al año en total<F id="cuotas-esade" />.</p>
        </div>
      </Mas>
      </Mas>
    </Apartado>
  );
}

// ── 3. The backpack ─────────────────────────────────────────────────────────
function Mochila() {
  const [tras16, setTras16] = useState<Tras16>('bachillerato');
  const [tras18, setTras18] = useState<Tras18>('universidad');
  const [anos, setAnos] = useState(7);
  const [extra, setExtra] = useState(0);
  const m = mochila(tras16, tras18, anos, extra);
  const usado = m.filter(a => a.etapa !== 'sinUsar').reduce((s, a) => s + a.euros, 0);
  const sinUsar = m.filter(a => a.etapa === 'sinUsar').reduce((s, a) => s + a.euros, 0);
    return (
    <Apartado id="educacion-mochila" titulo="La mochila educativa"
      entradilla="El presupuesto de la educación ya no se reparte entre redes de escuelas, sino entre personas. Cada una tiene su mochila, y las escuelas viven de las mochilas de quienes las eligen. Seis reglas para que nadie pague de más y ninguna escuela elija a quién acepta:">
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REGLAS.map((r, i) => (
          <li key={r.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="flex items-baseline gap-3">
              <span className="text-2xl font-[800] tabular-nums text-sky-700">{i + 1}</span>
              <span className="text-lg font-bold leading-snug text-slate-900">{r.t}</span>
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
          </li>
        ))}
      </ol>

      <Mas titulo="dos piezas más: un portafolio y formación para toda la vida">
      <div className="grid gap-4 md:grid-cols-2">
        {PIEZAS_MOCHILA.map(x => (
          <div key={x.t} className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
            <p className="text-lg font-bold text-sky-950">{x.t}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{x.d}</p>
          </div>
        ))}
      </div>
      </Mas>

      <h3 className="mt-10 text-xl font-bold text-slate-900">Calcula una mochila</h3>
      <p className="mt-1 max-w-3xl text-[15px] text-slate-600">Cada año de vida vale lo que cuesta hoy un alumno de esa edad en un centro público. Empieza con el caso del resumen (bachillerato y siete años de estudios después de los 18: {euros(redondo(MOCHILA_BASE, 500))}). Cambia el camino.</p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-sm font-medium text-slate-700">De 16 a 18 años</p>
            <Segmentado<Tras16> className="mt-2" etiqueta="De 16 a 18 años" valor={tras16} onChange={setTras16}
              opciones={[{ id: 'bachillerato', texto: 'Bachillerato' }, { id: 'fp', texto: 'FP de grado medio' }]} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">De 18 a 25 años</p>
            <Segmentado<Tras18> className="mt-2" etiqueta="De 18 a 25 años" valor={tras18} onChange={setTras18}
              opciones={[{ id: 'universidad', texto: 'Universidad' }, { id: 'fp', texto: 'FP superior' }, { id: 'trabajo', texto: 'Se pone a trabajar' }]} />
          </div>
          {tras18 !== 'trabajo' && (
            <Regulador etiqueta="Años estudiando después de los 18" valor={anos} min={1} max={7} paso={1}
              mostrar={`${anos} ${anos === 1 ? 'año' : 'años'}`} onChange={setAnos}
              ayuda={tras18 === 'fp' ? 'Dos años de FP superior; si sigue, otros cursos o una segunda titulación.' : 'Un grado son 4 años; con máster, 5 o 6.'} />
          )}
          <Regulador etiqueta="Parte extra por necesitar más apoyo" valor={extra} min={0} max={0.5} paso={0.05}
            mostrar={extra === 0 ? 'Ninguna' : `+${porcentaje(extra * 100, 0)}`} onChange={setExtra}
            ayuda="Discapacidad, pocos ingresos, idioma… Cuánto exactamente es una decisión pendiente." />
        </div>
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Cifra tono="bien" valor={euros(redondo(usado))} texto="usados en su formación, de 0 a 25 años" />
            <Cifra valor={euros(redondo(sinUsar))} texto="quedan sin usar en la mochila" nota={sinUsar > 0 ? `Propuesta: crédito para formarse hasta los ${CREDITO.hasta}, unos ${numero(sinUsar / CREDITO.tarifa, 1)} cursos de FP superior` : 'Lo que sobre a los 25 se guarda para formarse toda la vida'} />
          </div>
          <GraficaMochila anos={m} />
        </div>
      </div>

      <div className="mt-8 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-5 text-[15px] leading-relaxed text-amber-950">
        <p className="font-bold">¿Cuánto costaría al país?</p>
        <p className="mt-1">Con quienes estudian hoy, unos <strong className="tabular-nums">{mill(redondo(COSTE_PAIS_REAL, 1000))}</strong> al año; el máximo, si todos usaran la mochila entera, unos <strong className="tabular-nums">{mill(redondo(COSTE_PAIS_MAXIMO, 1000))}</strong>; hoy se gastan {mill(Math.round(DINERO.publico2024))}<F id="gasto-2024" />. Son cálculos de esta página.</p>
        <Mas titulo="cómo se calcula cada escenario" className="mt-3">
          <div className="space-y-2 text-[15px] leading-relaxed">
            <p><strong>Con quienes estudian hoy:</strong> cada alumno actual, de la escuela infantil a la universidad y en cualquier red, recibe lo que le da la mochila por su etapa<F id="avance-2526" /><F id="universidad-2324" />. Sale más que hoy porque la mochila paga también a quienes ahora van a la privada o pagan cuotas y matrícula. Cuenta a los {numero(ALUMNADO.universidad)} universitarios de todas las edades, también los mayores de 25, así que se queda algo alto.</p>
            <p><strong>Máximo posible:</strong> las {numero(redondo(POBLACION_EDAD.reduce((s, p) => s + p, 0), 10_000))} personas de 0 a 24 años usan cada año su mochila completa (bachillerato y siete años más de estudios)<F id="ine-edad" />. Hoy no ocurre: solo va a la escuela infantil el {porcentaje(RESULTADOS.escolarizados1, 0)} de los niños de un año y el {porcentaje(RESULTADOS.escolarizados2, 0)} de los de dos<F id="datos-cifras" />, y no todos estudian después de los 18.</p>
            <p className="text-sm text-amber-900">Ojo al comparar: los {mill(Math.round(DINERO.publico2024))} de hoy no son solo para personas de 0 a 24 años. Incluyen también universitarios mayores, educación de adultos, formación para trabajadores y becas<F id="gasto-2024" />.</p>
          </div>
        </Mas>
      </div>

      <Mas titulo="cómo se ha calculado la mochila">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p>Es un cálculo de esta página, no una cifra oficial. Suma, año a año, lo que costó un alumno en un centro público en 2022 según el Ministerio de Educación<F id="datos-cifras" />: infantil {euros(COSTE_ALUMNO.infantil)} durante 6 años, primaria {euros(COSTE_ALUMNO.primaria)} durante 6, ESO {euros(COSTE_ALUMNO.eso)} durante 4, bachillerato {euros(COSTE_ALUMNO.bachillerato)} durante 2 y universidad {euros(COSTE_ALUMNO.universidad)} durante 7. Total: {euros(MOCHILA_BASE)}.</p>
          <p>De 0 a 3 años se usa la cifra de infantil, porque no hay una propia. Una escuela infantil de bebés suele necesitar más educadoras por niño, así que esa parte puede quedarse corta.</p>
          <p>Para el país: personas de cada edad a 1 de enero de 2025 según el INE<F id="ine-edad" />, por el valor de la mochila a esa edad.</p>
          <Mas titulo="y la universidad, ¿también gratis?">
            <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">Con la mochila, sí: la universidad o la FP superior que la acepte no cobra matrícula, igual que la escuela. Hoy, en la universidad, el dinero público es el 61 % de lo que se gasta, frente al 68 % de media en la OCDE<F id="eag-2026" />; el resto lo pagan sobre todo las familias.</p>
          </Mas>
        </div>
      </Mas>
    </Apartado>
  );
}

/** The backpack year by year: one bar per year of age, one scale; labels in HTML so they stay legible on a phone. */
function GraficaMochila({ anos }: { anos: Ano[] }) {
  const max = 18_000;
  const n = anos.length;
  const tramos = [
    { t: 'Infantil', a: 0, b: 6 }, { t: 'Primaria', a: 6, b: 12 }, { t: 'ESO', a: 12, b: 16 },
    { t: '16', a: 16, b: 18 }, { t: '18 a 25', a: 18, b: 25 },
  ];
  return (
    <figure className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
      <figcaption className="font-semibold text-slate-900">Lo que lleva la mochila cada año de vida, en euros</figcaption>
      <div className="mt-3 grid grid-cols-[3.25rem_1fr] gap-x-2">
        <div className="relative h-48 text-right text-sm tabular-nums text-slate-500" aria-hidden>
          {[0, 5_000, 10_000, 15_000].map(v => (
            <span key={v} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (v / max) * 100}%` }}>{v === 0 ? '0' : `${v / 1000}.000`}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${n * 10} 100`} preserveAspectRatio="none" className="h-48 w-full" role="img"
          aria-label={anos.map(a => `${a.edad} años: ${euros(a.euros)}${a.etapa === 'sinUsar' ? ' sin usar' : ''}`).join('; ')}>
          {[0, 5_000, 10_000, 15_000].map(v => (
            <line key={v} x1={0} x2={n * 10} y1={100 - (v / max) * 100} y2={100 - (v / max) * 100} className="stroke-slate-200" vectorEffect="non-scaling-stroke" />
          ))}
          {anos.map((a, i) => (
            <rect key={a.edad} x={i * 10 + 1} y={100 - (a.euros / max) * 100} width={8} height={(a.euros / max) * 100}
              className={a.etapa === 'sinUsar' ? 'fill-slate-200 stroke-slate-400' : 'fill-sky-700'} vectorEffect="non-scaling-stroke"
              strokeDasharray={a.etapa === 'sinUsar' ? '3 2' : undefined}>
              <title>{`${a.edad} años · ${ETAPA_NOMBRE[a.etapa]}: ${euros(a.euros)}`}</title>
            </rect>
          ))}
        </svg>
        <div />
        <div className="mt-1 grid text-sm" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
          {tramos.map(t => (
            <span key={t.t} className="border-t-2 border-slate-300 pt-1 text-center font-semibold leading-tight text-slate-700" style={{ gridColumn: `${t.a + 1} / ${t.b + 1}` }}>{t.t}</span>
          ))}
        </div>
      </div>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-sm bg-sky-700" />Usado</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 rounded-sm border border-dashed border-slate-400 bg-slate-200" />Sin usar</span>
        <span>Abajo, la edad: de 0 a 25 años</span>
      </p>
    </figure>
  );
}

// ── 4. What other countries learned ─────────────────────────────────────────
function Riesgos() {
  return (
    <Apartado id="educacion-riesgos" fondo="blanco" titulo="Lo que enseñan otros países"
      entradilla="Dar a cada alumno su dinero y dejar que elija escuela no es nuevo: se llama «cheque escolar». Donde se hizo sin reglas, separó a ricos y pobres. Por eso la mochila lleva las seis reglas de arriba.">
      <div className="grid gap-4 lg:grid-cols-3">
        {PAISES.map(p => (
          <article key={p.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold text-slate-900">{p.pais}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">Qué hicieron. </span>{p.que}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600"><span className="font-semibold text-slate-800">Qué pasó. </span>{p.paso}{p.fuentes.map(f => <F key={f} id={f} />)}</p>
            <p className="mt-auto border-t border-slate-100 pt-3 text-[15px] leading-relaxed text-sky-900"><span className="font-semibold">Lección: </span>{p.leccion}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 max-w-3xl space-y-2 text-[15px] leading-relaxed text-slate-700">
        <p className="font-semibold text-slate-900">Cómo lo evita la propuesta</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Contra lo de Chile: prohibido cobrar de más y prohibido elegir alumnos desde el primer día, no treinta años después.</li>
          <li>Contra lo de Suecia: sorteo de plazas, un orientador público para cada familia y una plaza asignada por defecto si no elige.</li>
          <li>Como en los Países Bajos: el mismo dinero para todas las escuelas, sin matrícula, y libertad para tener su propio proyecto.</li>
          <li>Y además: más dinero en la mochila de quien más lo necesita, y un bot que vigila si alguna escuela empieza a quedarse solo con unos alumnos.</li>
        </ul>
      </div>
    </Apartado>
  );
}

// ── 5. Inside the school ────────────────────────────────────────────────────
function Aula() {
  const p = PROYECTOS_EVIDENCIA;
  return (
    <Apartado id="educacion-aula" titulo="La escuela por dentro"
      entradilla="Los alumnos mayores enseñan a los pequeños como parte de su propio currículo. Cada clase se organiza en grupos de avance, con tutores de otros cursos. Y se aprende con proyectos y con oficios. Esto es lo que dicen las pruebas:">
      <div className="grid gap-4 md:grid-cols-3">
        {EVIDENCIA.map(e => (
          <div key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className={cn('text-[1.8rem] font-[800] leading-none tabular-nums', e.tono === 'bien' ? 'text-emerald-700' : e.tono === 'mal' ? 'text-rose-700' : 'text-slate-900')}>{e.meses}</p>
            <p className="mt-2 font-bold text-slate-900">{e.t}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{e.d}<F id={e.fuente} /></p>
          </div>
        ))}
      </div>
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-500">«Meses» quiere decir cuánto más avanzan los alumnos en un curso, comparados con los que no lo hacen. Son medias de muchos estudios reunidos por la Education Endowment Foundation, una fundación británica que evalúa qué funciona en las aulas.</p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-bold text-slate-900">Proyectos: bien hechos, sí; improvisados, no</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">En un ensayo en {p.reinoUnido.escuelas} institutos británicos, los alumnos con proyectos avanzaron {Math.abs(p.reinoUnido.meses)} meses menos en lectura y escritura, y los más desfavorecidos, {Math.abs(p.reinoUnido.mesesDesfavorecidos)} meses menos<F id="eef-proyectos" />.</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">En otro, en {p.eeuu.escuelas} institutos de Estados Unidos y con profesores formados durante meses, aprobó el examen el {porcentaje(p.eeuu.conProyectos, 0)} con proyectos frente al {porcentaje(p.eeuu.sinProyectos, 0)} sin ellos: {p.eeuu.puntos} puntos más<F id="proyectos-ap" />.</p>
          <p className="mt-2 text-[15px] font-medium leading-relaxed text-slate-800">La diferencia está en la preparación: proyectos con objetivos claros, profesores formados y las materias básicas bien aprendidas dentro del proyecto.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-bold text-slate-900">Oficios en el currículo de todos</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">En Finlandia, los trabajos manuales (madera, metal y textil) son obligatorios para todos los alumnos de 1º a 7º, unas dos horas a la semana<F id="finlandia" />.</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">La propuesta va más allá: construcción, electricidad, carpintería, fontanería, cocina o reparación forman parte del currículo normal, no solo de la FP. Cada alumno hace también proyectos individuales ligados a la vida real, con artesanos y profesionales del municipio.</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">Así, elegir FP o universidad a los 16 se decide sabiendo lo que es cada cosa, y quien va a la universidad sabe también arreglar un enchufe.</p>
        </div>
      </div>

      <div className="mt-8 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        <h3 className="text-lg font-bold text-slate-900">Menos presión para el profesorado</h3>
        <p className="mt-2">Hoy hay {numero(RESULTADOS.ratio, 1)} alumnos por profesor<F id="datos-cifras" />, pero en el aula un profesor tiene a toda la clase a la vez y a cada alumno a un nivel distinto. Con grupos de avance y tutores de cursos superiores, el profesor dirige y atiende a quien más lo necesita, mientras los demás trabajan a su ritmo con ayuda. Los tutores no sustituyen a nadie: aprenden enseñando, y cuenta en su nota.</p>
      </div>

      <Mas titulo="cómo podría ser una semana en 3º de ESO">
        <ul className="max-w-3xl space-y-3">
          {SEMANA.map(s => (
            <li key={s.t} className="grid gap-x-4 gap-y-0.5 sm:grid-cols-[70px_1fr]">
              <span className="text-sm font-semibold tabular-nums text-sky-800">{s.horas}</span>
              <span className="text-[15px] leading-relaxed text-slate-700"><strong className="text-slate-900">{s.t}.</strong> {s.d}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-3xl text-xs text-slate-500">Un ejemplo de unas 28 horas para entender la idea, no un horario cerrado: cada escuela lo adaptaría.</p>
        <Mas titulo="cómo se organiza la tutoría entre alumnos">
          <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li>Parejas de alumnos con dos o tres cursos de diferencia, no más.</li>
            <li>Sesiones cortas y frecuentes (4 o 5 a la semana), en bloques de unas diez semanas<F id="eef-tutoria" />.</li>
            <li>Sirven sobre todo para repasar y practicar; lo nuevo lo explica el profesor.</li>
            <li>El tutor recibe formación (cómo preguntar, cómo corregir sin dar la respuesta) y el profesor supervisa.</li>
            <li>Es aprendizaje-servicio: el alumno mayor aprende haciendo un servicio útil a otros, y eso se evalúa como parte de su currículo.</li>
          </ul>
        </Mas>
      </Mas>
    </Apartado>
  );
}

// ── 6. The evaluator bot ────────────────────────────────────────────────────
function Bot() {
  return (
    <Apartado id="educacion-bot" fondo="blanco" titulo="Un bot que evalúa y simplifica"
      entradilla="Un programa de inteligencia artificial, abierto y público, que revisa el sistema educativo de forma continua y propone cómo hacerlo más sencillo y mejor. Propone; deciden las personas.">
      <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {BOT.map((b, i) => (
          <li key={b.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="flex items-baseline gap-3">
              <span className="text-2xl font-[800] tabular-nums text-sky-700">{i + 1}</span>
              <span className="text-lg font-bold leading-snug text-slate-900">{b.t}</span>
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{b.d}</p>
          </li>
        ))}
      </ol>
      <FichaEscuela />
      <Mas titulo="lo que el bot miraría primero">
        <ul className="max-w-3xl list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li>Si el abandono baja del {porcentaje(RESULTADOS.abandono2025, 1)} de hoy hacia el {porcentaje(RESULTADOS.abandonoUE2025, 1)} de la media europea, y en qué escuelas no.</li>
          <li>Si la repetición de curso (hoy, el {porcentaje(RESULTADOS.repetidores, 0)} de los alumnos de 15 años) sigue afectando más a los alumnos de familias pobres con la misma nota.</li>
          <li>Si cada escuela acoge su parte de alumnos con más necesidades, comparada con su barrio.</li>
          <li>Cuántas horas de tutoría entre alumnos se hacen y si los pequeños avanzan más.</li>
          <li>Qué normas y trámites se pueden quitar: cada año, una lista pública de lo que sobra.</li>
        </ul>
      </Mas>
    </Apartado>
  );
}

/** The bot's report on a made-up school (simulated). */
function FichaEscuela() {
  const f = FICHA_EJEMPLO;
  return (
    <article className="mt-8 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5">
      <p className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Ejemplo simulado: escuela y datos inventados</p>
      <h3 className="mt-2 text-xl font-bold text-slate-900">Ficha del bot: {f.nombre}</h3>
      <p className="text-sm text-slate-500">{f.alumnos} alumnos · evaluación anual</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {f.indicadores.map((x, i) => (
          <div key={x.t} className={cn('rounded-xl border p-4', i === 0 ? 'border-emerald-300 bg-emerald-50 sm:col-span-2 lg:col-span-1' : 'border-slate-200')}>
            <dt className="text-sm font-semibold text-slate-700">{x.t}{i === 0 && <span className="ml-1 font-normal text-emerald-800">· el principal</span>}</dt>
            <dd className={cn('mt-1 text-2xl font-[800] tabular-nums', x.tono === 'bien' ? 'text-emerald-700' : x.tono === 'mal' ? 'text-rose-700' : 'text-slate-900')}>{x.v}</dd>
            <dd className="mt-1 text-sm leading-snug text-slate-600">{x.d}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[15px] leading-relaxed text-rose-950"><span className="font-bold">Alarma: </span>{f.alarma}</p>
        <p className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-[15px] leading-relaxed text-sky-950"><span className="font-bold">Qué simplificar: </span>{f.simplificar}</p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">Por qué el progreso y no la nota: una escuela con alumnos que ya llegan sabiendo mucho saca buenas notas sin esforzarse. Medir cuánto avanza cada alumno desde donde empezó hace que a ninguna escuela le convenga buscar alumnos «fáciles».</p>
    </article>
  );
}

// ── 7. Each scale ───────────────────────────────────────────────────────────
function Escalas() {
  return (
    <Apartado id="educacion-escalas" titulo="Lo que hace cada escala"
      entradilla="De la persona al planeta. El porcentaje es la parte del presupuesto de esa escala que va a educación, según la matriz del modelo.">
      <ol className="grid gap-3 md:grid-cols-2">
        {ESCALAS.map(e => {
          const c = MATRIZ[e.id].educacion;
          return (
            <li key={e.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Muestra color={e.color} />
                <span className="font-bold text-slate-900">{e.nombre}</span>
                <span className="text-sm text-slate-500">· {c.peso == null ? 'con su dividendo' : `${c.peso} % de su presupuesto`}</span>
              </p>
              <p className="mt-1.5 text-[15px] font-medium text-slate-800">{c.responsabilidad}: <span className="font-normal text-slate-600">{c.inversiones.map((x, i) => x.charAt(0).toLowerCase() + x.slice(1)).join(', ').replace(/erasmus/, 'Erasmus')}.</span></p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600"><span className="font-semibold text-sky-900">Con la mochila: </span>{ESCALA_MOCHILA[e.id]}</p>
            </li>
          );
        })}
      </ol>
    </Apartado>
  );
}

// ── 8. Open questions ───────────────────────────────────────────────────────
function Retos() {
  return (
    <Apartado id="educacion-retos" fondo="blanco" titulo="Lo que falta por resolver"
      entradilla="La idea es sencilla; hacerla bien, no tanto. Estos son los problemas que hay que resolver antes de ponerla en marcha.">
      <ul className="grid gap-4 md:grid-cols-2">
        {RETOS.map(r => (
          <li key={r.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-bold text-slate-900">{r.t}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-500">
        Sobre el coste (cálculos de esta página, ver «La mochila»): con quienes estudian hoy, unos {mill(redondo(COSTE_PAIS_REAL, 1000))} al año; con la mochila completa para todos, hasta {mill(redondo(COSTE_PAIS_MAXIMO, 1000))}. Hoy el gasto público es de {mill(Math.round(DINERO.publico2024))}.
      </p>
    </Apartado>
  );
}

// ── 9. Sources ──────────────────────────────────────────────────────────────
function Fuentes() {
  return (
    <Apartado id="educacion-fuentes" titulo="Fuentes">
      <ul className="grid max-w-4xl gap-2 text-sm">
        {FUENTES_EDU.map(f => (
          <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
        ))}
      </ul>
      <p className="mt-4 max-w-3xl text-sm text-slate-500">La mochila, sus dos escenarios de coste para el país, el ejemplo de semana y la ficha de escuela del bot (inventada) son cálculos o propuestas de esta página, hechos con los datos de estas fuentes.</p>
    </Apartado>
  );
}
