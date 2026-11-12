// The «Seguridad» window (Eugenio, 2026-11-12): «mete todo el tema del
// presupuesto, de la cantidad de fuerzas de seguridad que tenemos […] evitar
// duplicidades, simplificar, unificar salarios, responsabilidades, jerarquías,
// y que todas las fuerzas del orden estén unificadas […] guardianes y no
// agresores […] garantes del orden y el cumplimiento de la ley».
// Data and sources: src/data/seguridad.ts. Chain of command: SeguridadMando.tsx.
import { useState, type ReactNode } from 'react';
import { ESCALAS, ESPANA, numero, porcentaje } from '../../data/modeloSocioeconomico';
import {
  AUTONOMICAS_2023, COMPARA, CUERPOS, CUERPOS_CON_MANDO, DUPLICIDADES, FUENTES_SEG, FUENTE_SEG, GASTO, GUARDIA_CIVIL, GUARDIANES,
  AHORRO_SUPUESTO, ESCALONES, FUERZAS_ARMADAS, LOCALES, MOSSOS_PUESTOS_2026, POLICIAS_TOTAL, POLICIA_NACIONAL, POR_CIEN_MIL, RETOS, SEG_ESCALA, SUELDOS,
} from '../../data/seguridad';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Muestra, Regulador } from './piezas';
import { SeguridadMando } from './SeguridadMando';
import { cn } from '../../utils/cn';

const mill = (m: number) => `${numero(m)} M€`;
/** Source link by id from FUENTES_SEG. */
const F = ({ id }: { id: string }) => FUENTE_SEG[id] ? <Fuente url={FUENTE_SEG[id].url} titulo={FUENTE_SEG[id].titulo} /> : null;
const redondo = (n: number, a = 1000) => Math.round(n / a) * a;

export function SeguridadVentana() {
  return (
    <>
      {/* ── 1. Summary ── */}
      <Apartado id="seguridad" titulo="Unos 1.700 cuerpos de policía para una sola tarea: cuidarnos"
        entradilla={<>Hoy hay militares, policías nacionales, guardias civiles, cuatro policías autonómicas y una policía local en cada ayuntamiento que la tiene. Cada cuerpo con su jefe, su sueldo y su academia. La propuesta: un solo cuerpo de <strong className="text-slate-800">guardianes</strong>, con un sueldo igual por el mismo puesto, y el ejército aparte pero coordinado.</>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra tono="mal" valor={`≈ ${numero(redondo(CUERPOS_CON_MANDO, 100))}`} texto="cuerpos de policía, cada uno con su propio jefe"
            nota={<>Cuenta propia: 2 del Estado, 4 autonómicos y unos 1.700 locales<F id="locales" /></>} />
          <Cifra tono="mal" valor={numero(POR_CIEN_MIL.espanaEurostat)} texto={<>policías por cada 100.000 habitantes según Eurostat<F id="statista" /></>}
            nota={`${numero(POR_CIEN_MIL.espanaTodos)} si se cuentan también las policías locales (estimación nuestra con datos de 2023 a 2026)`} />
          <Cifra tono="mal" valor={`${numero(SUELDOS.brechaMossosPN)} €`} texto={<>al mes más cobra un mosso que un policía nacional, por un trabajo parecido<F id="mossos-subida" /></>}
            nota="Es la cifra de un sindicato policial (Jupol), tras la subida de 2026: no hay una comparación oficial" />
          <Cifra tono="bien" valor="1" texto="solo cuerpo de guardianes: un sueldo por puesto, un mando, una academia y vigilado desde fuera" nota="La propuesta" />
        </div>
        <p className="mt-5 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4 text-[15px] leading-relaxed text-slate-700">
          <strong className="text-emerald-900">Guardianes, no agresores:</strong> formados para calmar antes que usar la fuerza, con cámara en el uniforme y un control independiente.
        </p>

      </Apartado>

      {/* ── 2. Who is there today ── */}
      <Apartado id="seguridad-hoy" fondo="blanco" titulo="Quién hay hoy"
        entradilla={<>Más de {numero(redondo(FUERZAS_ARMADAS + POLICIAS_TOTAL, 10_000))} personas: {numero(FUERZAS_ARMADAS)} en las Fuerzas Armadas y unos {numero(redondo(POLICIAS_TOTAL, 1000))} policías y guardias repartidos en cuerpos que dependen de gobiernos distintos.</>}>
        <Cuerpos />
        <p className="mt-3 text-xs leading-relaxed text-slate-500">Policía Nacional y Guardia Civil: su programa de seguridad ciudadana en los Presupuestos del Estado de 2023, sin las pensiones de quienes ya se jubilaron. Defensa: lo gastado en 2024 según la contabilidad pública. <DefensaTresCifras /></p>
        <Mas titulo="policías por habitante: España y Europa">
          <PorHabitante />
        </Mas>
        <Mas titulo="de dónde sale cada cifra y por qué no cuadran del todo">
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
            <p>Militares, Policía Nacional y Guardia Civil salen del registro oficial de personal público de enero de 2026<F id="epsap" />. Es la cifra más reciente y la más fiable.</p>
            <p>De las policías autonómicas, el dato oficial más reciente es el total de las cuatro juntas: {numero(AUTONOMICAS_2023)} personas en 2023<F id="ign" />. Por cuerpos solo hay cifras sueltas de años distintos. Los Mossos crecen deprisa: el presupuesto de Cataluña de 2026 ya paga {numero(MOSSOS_PUESTOS_2026)} puestos<F id="mossos-presupuesto" />.</p>
            <p>De las policías locales no hay un registro nacional. La Dirección General de Tráfico habla de unos {numero(LOCALES)} agentes en unos 1.700 municipios<F id="locales" />. Es una cifra redonda.</p>
            <p>Por eso el total de policías ({numero(redondo(POLICIAS_TOTAL, 1000))}) es una estimación: suma datos de 2023 a 2026. Que no exista una cifra oficial única ya dice mucho del lío.</p>
          </div>
        </Mas>
      </Apartado>

      {/* ── 3. Chain of command ── */}
      <Apartado id="seguridad-quien" titulo="Quién manda en quién"
        entradilla="Tres niveles de gobierno, dos ministerios, cuatro comunidades y unos 1.700 ayuntamientos. Pulsa «Con la propuesta» para ver el cambio.">
        <SeguridadMando />
        <Mas titulo="cómo reparte la ley el trabajo hoy">
          <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li><strong>Por territorio.</strong> La Policía Nacional, en las capitales de provincia y las ciudades que decida el Gobierno; la Guardia Civil, en el resto y en el mar<F id="lo-2-1986" />.</li>
            <li><strong>Por materia.</strong> A la Nacional le tocan el DNI, los pasaportes, la extranjería y las drogas; a la Guardia Civil, las armas, el contrabando, el tráfico en carretera, las costas y la naturaleza<F id="lo-2-1986" />.</li>
            <li><strong>Autonómicas.</strong> Las comunidades cuyo estatuto lo permite pueden crear su policía. Unas tareas son solo suyas, otras las comparten con la policía del Estado<F id="lo-2-1986" />.</li>
            <li><strong>Locales.</strong> Las comunidades autónomas fijan reglas comunes para las policías locales (uniformes, formación, ingreso), pero cada una depende de su ayuntamiento<F id="lo-2-1986" />.</li>
            <li><strong>Coordinación.</strong> Un consejo de política de seguridad y juntas de seguridad entre el Estado y cada comunidad con policía propia<F id="lo-2-1986" />.</li>
          </ul>
        </Mas>
      </Apartado>

      {/* ── 4. Money and pay ── */}
      <Dinero />

      {/* ── 5. Duplications ── */}
      <Apartado id="seguridad-duplicidades" titulo="Duplicidades: lo que se hace dos o tres veces"
        entradilla="No es que sobren agentes en la calle. Es que muchas cosas se hacen por duplicado: jefes, sedes, compras, unidades especiales y teléfonos.">
        <Tarjetas lista={DUPLICIDADES} mas="otras duplicidades" columnas="md:grid-cols-3" />
        <Ahorro />
      </Apartado>

      {/* ── 6. The proposal ── */}
      <Apartado id="seguridad-propuesta" fondo="blanco" titulo="Un solo cuerpo de guardianes"
        entradilla={<>Las fuerzas del orden, unificadas: un cuerpo con una escala salarial, una jerarquía y una formación únicas. Son las garantes del orden y del cumplimiento de la ley, y se organizan por escalas, del municipio al continente. El ejército queda aparte, pero coordinado.</>}>
        <div className="sm:hidden">
          <ul className="space-y-2">{COMPARA.slice(0, 3).map(c => <FilaCompara key={c.t} c={c} />)}</ul>
          <Mas titulo="teléfono, formación, quién vigila y ejército" className="mt-3">
            <ul className="space-y-2">{COMPARA.slice(3).map(c => <FilaCompara key={c.t} c={c} />)}</ul>
          </Mas>
        </div>
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
          <table className="w-full text-[15px]">
            <caption className="sr-only">La seguridad hoy y con la propuesta</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
                <th scope="col" className="w-[18%] px-5 py-2 font-medium" />
                <th scope="col" className="px-4 py-2 font-medium">Hoy</th>
                <th scope="col" className="px-4 py-2 font-medium text-emerald-800">Con la propuesta</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {COMPARA.map(c => (
                <tr key={c.t} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-900">{c.t}</th>
                  <td className="px-4 py-3 text-slate-600">{c.hoy}</td>
                  <td className="px-4 py-3 text-slate-900">{c.propuesta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Mas titulo="dónde iría cada cuerpo de hoy">
          <ul className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
            <li><strong>Policías locales</strong> → la sección municipal. Siguen en su pueblo o ciudad y la asamblea municipal fija sus prioridades, pero cobran según la tabla común y se forman en la academia común.</li>
            <li><strong>Policía Nacional y Guardia Civil</strong> → las secciones provincial, regional y nacional, según su trabajo: tráfico y rescate a la provincia; unidades especiales a la región; fronteras, crimen organizado y terrorismo a la nación. Se acaba el reparto entre ciudad y campo.</li>
            <li><strong>Mossos, Ertzaintza, Policía Foral y Policía Canaria</strong> → la sección regional de su comunidad, con su nombre si así lo deciden, dentro de la misma tabla de sueldos, la misma jerarquía y la misma inspección.</li>
            <li><strong>Fuerzas Armadas</strong> → no se integran. Siguen con Defensa y para la defensa. La Unidad Militar de Emergencias trabaja con los guardianes en catástrofes con un protocolo único.</li>
          </ul>
        </Mas>
        <EscalaSalarial />
        <Garantes />
      </Apartado>

      {/* ── 7. Guardians, not aggressors ── */}
      <Apartado id="seguridad-guardianes" titulo="Guardianes, no agresores"
        entradilla="Un guardián cuida: protege a las personas, también a la que detiene. La fuerza es el último recurso, y quien la usa responde de ella.">
        <Tarjetas lista={GUARDIANES} mas="las otras cuatro reglas del guardián" columnas="md:grid-cols-3" />
        <Mas titulo="por qué hace falta: lo que pasa hoy">
          <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li>En 2025, el comité del Consejo de Europa que vigila la tortura recogió relatos de golpes, esposas demasiado apretadas e insultos racistas durante detenciones en Cataluña, algunos confirmados por médicos<F id="cpt" />.</li>
            <li>No hay en España un organismo independiente que investigue a la policía. Amnistía Internacional lo pidió de nuevo en 2025<F id="amnistia" />.</li>
            <li>Las cámaras en el uniforme llegan tarde y por partes: la Policía Nacional adjudicó un contrato de 10,3 millones en 2024, y muchos agentes se las habían comprado ellos mismos<F id="camaras" />.</li>
            <li>Lo que funciona bien: el comité europeo vio que, en general, se respetan los plazos para ver a un juez, el acceso a un abogado y al médico<F id="cpt" />.</li>
          </ul>
        </Mas>
      </Apartado>

      {/* ── 8. Each scale ── */}
      <Apartado id="seguridad-escalas" fondo="blanco" titulo="Qué hace cada escala"
        entradilla="La seguridad empieza en cada persona y en su barrio, y termina en las misiones de paz. Cada escala hace lo que la de abajo no puede hacer sola.">
        <ol className="grid gap-x-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white px-4 md:grid-cols-2 md:divide-y-0 md:py-2">
          {ESCALAS.map(e => {
            const s = SEG_ESCALA[e.id];
            if (!s) return null;
            return (
              <li key={e.id} className="flex gap-3 py-3">
                <Muestra color={e.color} className="mt-1.5" />
                <div>
                  <p className="font-bold text-slate-900">{e.nombre} {s.quien && <span className="font-normal text-slate-500">· {s.quien}</span>}</p>
                  <p className="mt-0.5 text-sm leading-snug text-slate-600">{s.hace}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </Apartado>

      {/* ── 9. Challenges ── */}
      <Apartado id="seguridad-retos" titulo="Lo que falta por resolver"
        entradilla="Es un cambio grande y no se hace por decreto. Estos son los obstáculos, dichos con claridad.">
        <Tarjetas lista={RETOS} mas="los otros retos" columnas="md:grid-cols-3" />
        <Mas titulo="un calendario posible, por fases">
          <ol className="max-w-3xl list-decimal space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li><strong>Primero, lo que no necesita cambiar la Constitución:</strong> el 112 como único número, cámaras para todos, la inspección independiente y datos públicos.</li>
            <li><strong>Después, igualar:</strong> una tabla de sueldos común y una academia común, para todos los cuerpos a la vez.</li>
            <li><strong>Luego, unir el Estado:</strong> Policía Nacional y Guardia Civil en un solo cuerpo civil, con secciones por escala.</li>
            <li><strong>Por último, sumar a quien quiera:</strong> policías locales y autonómicas entran como secciones, por acuerdo con su ayuntamiento o su comunidad.</li>
          </ol>
        </Mas>
      </Apartado>

      {/* ── 10. Sources ── */}
      <Apartado id="seguridad-fuentes" fondo="blanco" titulo="Fuentes">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {FUENTES_SEG.map(f => (
            <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-sm text-slate-500">
          Son estimaciones nuestras: el total de policías y la cifra por habitante (suman datos de 2023 a 2026), el número de cuerpos con su propio jefe, el coste de igualar sueldos, el ahorro de unificar y la escala salarial de la propuesta. Lo demás sale tal cual de la fuente. La propuesta y su calendario son eso, una propuesta.
        </p>
      </Apartado>
    </>
  );
}

/** Headcount by force, as bars on one scale. */
function Cuerpos() {
  const max = Math.max(...CUERPOS.map(c => c.agentes));
  const color = { ejercito: 'bg-slate-400', estado: 'bg-rose-700', autonomica: 'bg-rose-500', local: 'bg-rose-300' } as const;
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption className="text-lg font-bold text-slate-900">Personas en cada cuerpo</figcaption>
      <ul className="mt-4 space-y-3" role="img" aria-label={CUERPOS.map(c => `${c.nombre}: ${c.agentes ? numero(c.agentes) : 'sin cifra oficial'}`).join('; ')}>
        {CUERPOS.map(c => (
          <li key={c.id} className="grid gap-x-5 gap-y-0.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0 md:grid-cols-[260px_1fr]">
            <div>
              <p className="font-semibold text-slate-900">{c.nombre}</p>
              <p className="text-sm text-slate-500">{c.depende}</p>
            </div>
            <div>
              <div className="flex items-center gap-3">
                {c.agentes > 0 && <span className={cn('h-4 shrink-0 rounded-r-[4px]', color[c.grupo])} style={{ width: `${Math.max(1, (c.agentes / max) * 62)}%` }} />}
                <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{c.agentes > 0 ? `${c.aprox ? '≈ ' : ''}${numero(c.agentes)}` : 'sin cifra oficial'}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">personas, {c.fecha}<F id={c.fuente} /></p>
              <p className="mt-1 hidden text-sm leading-snug text-slate-600 sm:block">{c.hace}{c.nota ? ` ${c.nota}` : ''}</p>
              <p className="mt-1 text-sm text-slate-700">
                {c.presupuesto
                  ? <>Presupuesto: <strong className="tabular-nums">{mill(c.presupuesto.m)}</strong> en {c.presupuesto.ano}{c.presupuesto.que ? ` (${c.presupuesto.que})` : ''}<F id={c.presupuesto.fuente} /></>
                  : <span className="text-slate-500">Presupuesto: no hemos encontrado una cifra publicada solo para este cuerpo.</span>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** Police per 100.000 inhabitants: the EU average, Spain in Eurostat's series, and our own count with every force. */
function PorHabitante() {
  const filas = [
    { t: 'Media de la Unión Europea (2022)', v: POR_CIEN_MIL.ue, f: 'euronews', c: 'bg-slate-400' },
    { t: 'España en la serie de Eurostat (2018-2020)', v: POR_CIEN_MIL.espanaEurostat, f: 'statista', c: 'bg-rose-400' },
    { t: 'España contando todos los cuerpos, también los locales (cuenta propia)', v: POR_CIEN_MIL.espanaTodos, f: '', c: 'bg-rose-700' },
  ];
  const max = 600;
  return (
    <figure className="max-w-3xl">
      <figcaption className="text-lg font-bold text-slate-900">Policías por cada 100.000 habitantes</figcaption>
      <ul className="mt-4 space-y-3" role="img" aria-label={filas.map(r => `${r.t}: ${r.v}`).join('; ')}>
        {filas.map(r => (
          <li key={r.t}>
            <p className="text-sm text-slate-700">{r.t}{r.f && <F id={r.f} />}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn('h-4 rounded-r-[4px]', r.c)} style={{ width: `${(r.v / max) * 80}%` }} />
              <span className="text-sm font-semibold tabular-nums text-slate-900">{numero(r.v)}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Ojo al comparar: la media europea y la cifra de España de Eurostat son de años distintos, y Eurostat no aclara qué cuerpos cuenta cada país. Por eso damos también nuestra cuenta con todos los cuerpos, que no es comparable con la media europea. La nuestra divide unos {numero(redondo(POLICIAS_TOTAL, 1000))} policías y guardias entre {numero(ESPANA.poblacion)} habitantes. Sin el ejército.
      </p>
    </figure>
  );
}

/** Budget by administration, and pay: today's gaps and what equalising them would cost. */
function Dinero() {
  const [extra, setExtra] = useState(SUELDOS.brechaMossosPN);
  const estatales = POLICIA_NACIONAL + GUARDIA_CIVIL;
  const coste = (estatales * extra * 12) / 1e6;
  const partes = [
    { t: 'Estado', v: GASTO.ordenCentral2024, c: 'bg-rose-800' },
    { t: 'Comunidades', v: GASTO.ordenRegional2024, c: 'bg-rose-500' },
    { t: 'Ayuntamientos', v: GASTO.ordenLocal2024, c: 'bg-rose-300' },
  ];
  return (
    <Apartado id="seguridad-dinero" fondo="blanco" titulo="Cuánto cuesta, y cuánto cobra cada uno"
      entradilla={<>Las administraciones gastaron {mill(GASTO.policia2024)} en policía en 2024. Lo pagan tres niveles de gobierno a la vez, y cada uno paga sueldos distintos por el mismo trabajo.</>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Cifra tono="mal" valor={mill(GASTO.policia2024)} texto={<>en policía en 2024, sumando todas las administraciones<F id="igae" /></>} />
        <Cifra valor={mill(GASTO.defensa2024)} texto={<>en defensa en 2024 según la contabilidad pública<F id="igae" /></>} nota={<DefensaTresCifras />} />
      </div>

      <figure className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <figcaption className="text-lg font-bold text-slate-900">Quién paga la seguridad (2024)</figcaption>
        <p className="mt-1 text-sm text-slate-600">{mill(GASTO.ordenPublico2024)} en total. Incluye policía, bomberos, juzgados y cárceles<F id="igae" />.</p>
        <div className="mt-4 flex h-9 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img"
          aria-label={partes.map(p => `${p.t}: ${mill(p.v)}`).join('; ')}>
          {partes.map(p => <div key={p.t} className={cn('h-full', p.c)} style={{ width: `${(p.v / GASTO.ordenPublico2024) * 100}%` }} title={`${p.t}: ${mill(p.v)}`} />)}
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          {partes.map(p => (
            <div key={p.t} className="flex gap-2"><span aria-hidden className={cn('mt-1 h-3 w-3 shrink-0 rounded-sm', p.c)} />
              <div><dt className="font-semibold text-slate-900">{p.t}</dt><dd className="tabular-nums text-slate-600">{mill(p.v)} · {porcentaje((p.v / GASTO.ordenPublico2024) * 100, 0)}</dd></div></div>
          ))}
        </dl>
      </figure>

      <Mas titulo="lo que gastan las comunidades con policía propia">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li><strong>Cataluña:</strong> {mill(GASTO.mossos2026)} en seguridad ciudadana en 2026, de los que {mill(GASTO.mossosPersonal2026)} son sueldos de los Mossos<F id="mossos-presupuesto" />.</li>
          <li><strong>País Vasco:</strong> {mill(GASTO.seguridadVasca2026)} para todo el Departamento de Seguridad en 2026, que incluye la Ertzaintza y las emergencias<F id="seguridad-vasca" />.</li>
          <li><strong>Navarra y Canarias:</strong> no hemos encontrado una cifra publicada solo para su policía.</li>
        </ul>
      </Mas>

      <h3 className="mt-12 text-xl font-bold text-slate-900">Mismo trabajo, distinto sueldo</h3>
      <div className="mt-3 max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
        <p>Un agente de policía en España cobraba unos {numero(SUELDOS.agenteEspanaMes)} € brutos al mes en 2023, el sueldo más bajo de las cuatro grandes economías de la UE<F id="euronews" />.</p>
        <p>En 2018, el Gobierno pactó subir el sueldo a policías nacionales y guardias civiles durante tres años, con {mill(SUELDOS.equiparacion2018)}, para igualarlos con los Mossos, los mejor pagados<F id="equiparacion" />. En 2026 los Mossos lograron otra subida de {numero(SUELDOS.subidaMossos2026)} € al año, y la diferencia volvió: casi {numero(SUELDOS.brechaMossosPN)} € al mes, según el sindicato policial Jupol<F id="mossos-subida" />. Es la cifra de un sindicato: no hay una comparación oficial. Cada cuerpo negocia por su lado, y cuando uno sube, los demás piden lo mismo.</p>
      </div>

      <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
        <p className="font-bold text-slate-900">¿Cuánto costaría igualar a policías nacionales y guardias civiles?</p>
        <div className="mt-4">
          <Regulador etiqueta="Subida al mes por agente" valor={extra} min={0} max={1200} paso={50} mostrar={`${numero(extra)} €`} onChange={setExtra}
            ayuda={`Empieza en ${numero(SUELDOS.brechaMossosPN)} €, la diferencia con un mosso según el sindicato Jupol.`} />
        </div>
        <p className="mt-4 text-[15px] text-slate-700">
          {numero(estatales)} agentes × {numero(extra)} € × 12 meses = <strong className="tabular-nums text-slate-900">{mill(Math.round(coste))} al año</strong>, un {porcentaje((coste / GASTO.policia2024) * 100, 0)} más de lo que se gasta hoy en policía.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">Cálculo orientativo nuestro: no cuenta pagas extra, cotizaciones ni policías locales y autonómicas, y supone que la diferencia es igual para todos los grados. Más abajo, en «Duplicidades», hay un orden de magnitud de lo que se podría ahorrar al unificar.</p>
      </div>
    </Apartado>
  );
}

/** The first three cards in view; the rest one click away. */
function Tarjetas({ lista, mas, columnas }: { lista: { t: string; d: string; fuente?: string }[]; mas: string; columnas: string }) {
  const tarjeta = (x: { t: string; d: string; fuente?: string }) => (
    <li key={x.t} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <p className="font-bold text-slate-900">{x.t}</p>
      <p className="mt-1 text-[15px] leading-snug text-slate-600 sm:leading-relaxed">{x.d}{x.fuente && <F id={x.fuente} />}</p>
    </li>
  );
  return (
    <>
      <ul className={cn('grid gap-3 sm:gap-4', columnas)}>{lista.slice(0, 3).map(tarjeta)}</ul>
      {lista.length > 3 && <Mas titulo={mas}><ul className="grid gap-4 md:grid-cols-2">{lista.slice(3).map(tarjeta)}</ul></Mas>}
    </>
  );
}

/** Savings from unifying: there is no study, so an order of magnitude with its reasoning. */
function Ahorro() {
  const min = GASTO.policia2024 * AHORRO_SUPUESTO.min, max = GASTO.policia2024 * AHORRO_SUPUESTO.max;
  return (
    <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
      <p className="font-bold text-slate-900">¿Cuánto se ahorraría al unificar?</p>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
        No hay ningún estudio oficial que lo calcule. Para dar un tamaño: si juntar jefaturas, sedes, academias, compras y salas de llamadas ahorrara entre un {porcentaje(AHORRO_SUPUESTO.min * 100, 0)} y un {porcentaje(AHORRO_SUPUESTO.max * 100, 0)} de los {mill(GASTO.policia2024)} que se gastan en policía<F id="igae" />, serían <strong className="tabular-nums">entre {mill(redondo(min, 10))} y {mill(redondo(max, 10))} al año</strong>.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">Ese porcentaje es un supuesto nuestro, no un dato. La mayor parte del gasto son sueldos de agentes en la calle, y esos no se ahorran: la propuesta no quita guardianes, quita duplicados. Para comparar, España gasta en policía el {porcentaje(GASTO.policiaPibEs)} de su PIB (lo que produce en un año) y la media de la UE el {porcentaje(GASTO.policiaPibUe)}<F id="bde" />.</p>
    </div>
  );
}

/** The single pay scale, visible: five steps as multiples of the first. Proposal and estimate. */
function EscalaSalarial() {
  const base = SUELDOS.agenteEspanaMes;
  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-slate-900">Una sola escala de sueldos y de mando</h3>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-600">
        Cinco escalones, los mismos en todo el país. El primero parte de lo que cobra hoy un agente en España, unos {numero(base)} € brutos al mes<F id="euronews" />; cada escalón es un múltiplo del primero. Las cifras son orientativas, una propuesta nuestra para discutir.
      </p>
      <ol className="mt-4 grid gap-2">
        {ESCALONES.map((e, i) => (
          <li key={e.t} className="grid gap-x-4 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:grid-cols-[200px_110px_1fr] sm:items-baseline">
            <p className="font-semibold text-slate-900"><span className="mr-1.5 text-slate-400">{i + 1}.</span>{e.t}</p>
            <p className="text-sm font-bold tabular-nums text-emerald-800">≈ {numero(redondo(base * e.x, 50))} €</p>
            <p className="text-sm leading-snug text-slate-600"><span className="font-medium text-slate-700">Responde: </span>{e.responde}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-500">
        Encima, pluses iguales y a la vista: noche, riesgo, especialidad y coste de la vida del lugar. Quien hoy cobra más (por ejemplo, un mosso) no pierde: conserva la diferencia como complemento personal hasta que la escala le alcance. Se sube de escalón por mérito: años, formación y evaluaciones.
      </p>
    </div>
  );
}

/** «Garantes del orden y del cumplimiento de la ley»: to whom the guardianes answer. */
function Garantes() {
  const filas: [string, ReactNode][] = [
    ['La ley y los jueces', 'Cuando investigan un delito, obedecen al juez, no al político de turno.'],
    ['La inspección independiente', 'Revisa cómo actúan: quejas, grabaciones, usos de la fuerza.'],
    ['La asamblea de cada escala', 'Fija las prioridades de su sección y recibe cada año sus cuentas y sus datos.'],
    ['El parlamento', 'Aprueba la ley del cuerpo, su presupuesto y nombra al alto mando con mayoría amplia.'],
  ];
  return (
    <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
      <h3 className="text-lg font-bold text-emerald-900">Garantes de la ley, no dueños de ella: ante quién responden</h3>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {filas.map(([t, d]) => (
          <div key={t}><dt className="font-semibold text-slate-900">{t}</dt><dd className="text-[15px] leading-snug text-slate-700">{d}</dd></div>
        ))}
      </dl>
    </div>
  );
}

/** One row of today-vs-proposal as a stacked card, for phones. */
function FilaCompara({ c }: { c: { t: string; hoy: string; propuesta: string } }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm leading-snug">
      <p className="font-bold text-slate-900">{c.t}</p>
      <p className="mt-1 text-slate-600"><span className="font-semibold text-rose-800">Hoy: </span>{c.hoy}</p>
      <p className="mt-1 text-slate-900"><span className="font-semibold text-emerald-800">Propuesta: </span>{c.propuesta}</p>
    </li>
  );
}

/** The three defence figures, reconciled in one sentence. */
function DefensaTresCifras() {
  return (
    <>Tres cifras de defensa que no se contradicen: {mill(12_825)} es lo presupuestado para el Ministerio de Defensa en 2023<F id="pge-defensa" />; {mill(GASTO.defensa2024)} es lo que se gastó en defensa en 2024 según la contabilidad pública<F id="igae" />; y {mill(GASTO.seguridadDefensa2025)} es lo que el Gobierno cuenta para 2025 sumando otras partidas de seguridad para llegar al 2 % del PIB que pide la OTAN<F id="defensa-2025" />.</>
  );
}
