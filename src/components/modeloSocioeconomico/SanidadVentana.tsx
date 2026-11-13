// The «Sanidad» window (Eugenio, 2026-11-12): the average wait for some
// appointments, how collapsed the system is, the proposal, and the problem of a
// medical record that is not seen when you move to another region or between
// public and private care: «tiene que haber un único expediente sanitario para
// todos, con un perfil único donde se guarda toda la información sanitaria de
// esa persona». Simple first; the detail behind «Más». Data: src/data/sanidad.ts.
import { useState, type ReactNode } from 'react';
import { Eye, FileHeart, KeyRound, ShieldAlert, Smartphone, Stethoscope } from 'lucide-react';
import { ESCALAS, HOY, MATRIZ, euros, numero, porcentaje } from '../../data/modeloSocioeconomico';
import {
  COMUNIDADES, ESPECIALIDADES, ESPERAS, EVOLUCION_CIRUGIA, EXPEDIENTE_HOY, FS, FUENTES_SANIDAD, GARANTIZADAS, GASTO, PERSONAL, PLAZOS_PROPUESTOS, PRUEBAS, URGENCIAS,
} from '../../data/sanidad';
import { Apartado, Cifra, Mas } from './ventanas';
import { Fuente, Muestra, Segmentado } from './piezas';
import { cn } from '../../utils/cn';
import { Linea } from './graficos/Linea';
import { Pares } from './graficos/Pares';

/** A source link by id from FUENTES_SANIDAD. */
function F({ id, children }: { id: string; children?: ReactNode }) {
  const f = FS[id];
  return f ? <Fuente url={f.url} titulo={f.titulo}>{children}</Fuente> : null;
}
const mill = (m: number) => `${numero(m)} millones de euros`;
const dias = (d: number, dec = 0) => `${numero(d, dec)} días`;

export function SanidadVentana() {
  const e = ESPERAS;
  return (
    <>
      {/* ── 1. Summary ── */}
      <Apartado id="sanidad" titulo="Meses de espera, y una historia médica que no viaja contigo"
        entradilla={<>
          En la sanidad pública se espera más de tres meses para ver a un especialista y cuatro para operarse.
          Y lo que sabe de ti un hospital no siempre lo ve el de otra comunidad, ni nunca la clínica privada.
          La propuesta: plazos máximos que se cumplan y un único expediente para cada persona, que ella controla desde el móvil.
        </>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra tono="mal" valor={dias(e.primaria.dias, 1)} texto={<>de media para ver al médico de familia, si no hay cita para hoy o mañana<F id="barometro-2026" /></>}
            nota={`Solo el ${e.primaria.mismoDiaOSiguiente} % consigue cita para el mismo día o el siguiente`} />
          <Cifra tono="mal" valor={dias(e.especialista.dias)} texto={<>de media para la primera visita al especialista<F id="sisle-nota" /></>}
            nota="Unos 4 millones de personas esperando, a finales de 2025" />
          <Cifra tono="mal" valor={dias(e.cirugia.dias)} texto={<>de media para una operación que no es urgente<F id="sisle-rectificacion" /></>}
            nota={`${numero(e.cirugia.pacientes)} personas en la lista`} />
          <Cifra tono="bien" valor="1 expediente" texto="por persona, para toda la vida: lo ven la pública y la privada, en cualquier comunidad, si tú das permiso"
            nota="Propuesta" />
        </div>
        <Termometro />
      </Apartado>

      <Esperas />
      <Comunidades />
      <Gasto />
      <ExpedienteHoy />
      <Propuesta />
      <Escalas />
      <Retos />

      <Apartado id="sanidad-fuentes" titulo="Fuentes" fondo="blanco"
        entradilla="Todas las cifras de esta ventana salen de aquí. Lo que es propuesta lo dice el texto.">
        <ul className="grid max-w-4xl gap-2 text-sm">
          {FUENTES_SANIDAD.map(f => (
            <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
          ))}
        </ul>
      </Apartado>
    </>
  );
}

/**
 * «How collapsed is it?» There is no official collapse index, so it is shown as
 * the share of people who wait longer than a limit at each door, using the
 * limits the official statistics themselves report.
 */
function Termometro() {
  const filas = [
    { t: 'Médico de familia', limite: 'más de 1 día', v: 100 - ESPERAS.primaria.mismoDiaOSiguiente, d: 'no consigue cita para hoy ni para mañana', f: 'barometro-2026', encuesta: true },
    { t: 'Especialista', limite: 'más de 60 días', v: ESPERAS.especialista.mas60dias, d: 'tiene la cita para dentro de más de dos meses', f: 'sisle-nota', encuesta: false },
    { t: 'Operación', limite: 'más de 180 días', v: ESPERAS.cirugia.mas6meses, d: 'lleva más de seis meses esperando', f: 'sisle-nota', f2: 'sisle-rectificacion', encuesta: false },
  ];
  const n = (v: number) => numero(v, v % 1 ? 1 : 0);
  return (
    <figure className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
      <figcaption>
        <span className="block text-lg font-bold text-slate-900">¿Cuánto colapso hay?</span>
        <span className="mt-1 block max-w-3xl text-sm leading-relaxed text-slate-600">
          No existe un índice oficial de colapso. Aquí se mide así: de cada 100 personas que esperan en cada puerta, cuántas pasan de un límite.
        </span>
      </figcaption>
      <ul className="mt-5 space-y-4" role="img" aria-label={filas.map(f => `${f.t}, ${f.limite}: ${n(f.v)} de cada 100`).join('; ')}>
        {filas.map(f => (
          <li key={f.t} className="grid gap-x-4 gap-y-1 sm:grid-cols-[190px_1fr]">
            <span>
              <span className="block font-semibold text-slate-900">{f.t}</span>
              <span className="block text-sm text-slate-500">Límite: {f.limite}{f.encuesta ? ' · dato de encuesta' : ''}</span>
            </span>
            <span>
              <span className="flex h-4 w-full overflow-hidden rounded-[4px] bg-slate-100">
                <span className="h-full bg-rose-700" style={{ width: `${f.v}%` }} />
              </span>
              <span className="mt-1 block text-sm text-slate-700"><strong className="tabular-nums">{n(f.v)} de cada 100</strong> {f.d}<F id={f.f} />{'f2' in f && f.f2 && <F id={f.f2}>la corrección no lo cambia</F>}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        La fila del médico de familia sale de una encuesta del CIS (julio de 2026): el registro oficial no mide esa espera. Las otras dos, del registro de listas de espera del Ministerio de Sanidad a 31 de diciembre de 2025.
      </p>
      <p className="mt-3 max-w-3xl border-t border-slate-100 pt-3 text-[15px] leading-relaxed text-slate-700">
        <strong className="text-slate-900">Una parte de la explicación:</strong> España tiene {numero(PERSONAL.medicos, 1)} médicos por cada 1.000 habitantes, algo más que la media de los países de la OCDE ({numero(PERSONAL.medicosOCDE, 1)}),
        pero {numero(PERSONAL.enfermeras, 1)} enfermeras, frente a {numero(PERSONAL.enfermerasOCDE, 1)}<F id="ocde-2025" />. Faltan sobre todo enfermeras.
      </p>
    </figure>
  );
}

function Esperas() {
  const e = ESPERAS;
  const puertas = [
    { t: 'Médico de familia', media: <><strong className="tabular-nums">{dias(e.primaria.dias, 1)}</strong>, contando solo a quien no tuvo cita para hoy o mañana<F id="barometro-2026" /></>,
      gente: 'No hay registro oficial de cuántos esperan', antes: <>{dias(e.primaria.dias2025, 2)} en 2025<F id="barometro-2025" /></> },
    { t: 'Primera visita al especialista', media: <><strong className="tabular-nums">{dias(e.especialista.dias)}</strong><F id="sisle-nota" /></>,
      gente: <>Unos 4 millones: {numero(e.especialista.porMil)} de cada 1.000 habitantes<F id="sisle-informe" /></>, antes: dias(e.especialista.diasAnoAntes) },
    { t: 'Operación no urgente', media: <><strong className="tabular-nums">{dias(e.cirugia.dias)}</strong>, unos cuatro meses<F id="sisle-rectificacion" /></>,
      gente: <>{numero(e.cirugia.pacientes)} personas<F id="sisle-rectificacion" /></>, antes: dias(e.cirugia.diasAnoAntes) },
    { t: 'Urgencias del hospital', media: 'No hay dato oficial de cuánto se espera',
      gente: <>{numero(URGENCIAS.visitas2023 / 1e6, 1)} millones de visitas en 2023, un {numero(URGENCIAS.subida10anos, 0)} % más que diez años antes<F id="scs-2022" /></>, antes: '—' },
  ];
  return (
    <Apartado id="sanidad-esperas" titulo="Cuánto se espera hoy" fondo="blanco"
      entradilla="Hay tres puertas con cita: el médico de familia, el especialista del hospital y el quirófano. Y una sin cita: urgencias. En las tres primeras se espera, y en un año apenas ha mejorado.">
      <ul className="space-y-3 sm:hidden">
        {puertas.map(p => (
          <li key={p.t} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p className="text-base font-semibold text-slate-900">{p.t}</p>
            <p className="mt-1"><span className="text-slate-500">Espera media: </span>{p.media}</p>
            <p className="mt-1"><span className="text-slate-500">Cuánta gente: </span>{p.gente}</p>
            {p.antes !== '—' && <p className="mt-1"><span className="text-slate-500">Hace un año: </span>{p.antes}</p>}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
        <table className="w-full min-w-[640px] text-[15px]">
          <caption className="sr-only">Espera media en cada puerta de la sanidad pública</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
              <th scope="col" className="px-5 py-2 font-medium">Puerta</th>
              <th scope="col" className="px-4 py-2 font-medium">Espera media</th>
              <th scope="col" className="px-4 py-2 font-medium">Cuánta gente</th>
              <th scope="col" className="px-4 py-2 font-medium">Hace un año</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {puertas.map(p => (
              <tr key={p.t} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-900">{p.t}</th>
                <td className="px-4 py-3 text-slate-700">{p.media}</td>
                <td className="px-4 py-3 text-slate-700">{p.gente}</td>
                <td className="px-4 py-3 tabular-nums text-slate-700">{p.antes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
        Especialista y operación: registro oficial del Ministerio de Sanidad a 31 de diciembre de 2025, con la corrección que publicó después. Médico de familia: encuesta del CIS. Urgencias: el Ministerio cuenta las visitas, pero no publica cuánto se espera.
      </p>

      <Evolucion />

      <Mas titulo="qué especialidades hacen esperar más">
        <div className="grid max-w-4xl gap-4 sm:grid-cols-2">
          <Lista titulo="Para operarse" mas={ESPECIALIDADES.cirugiaMas} menos={ESPECIALIDADES.cirugiaMenos} />
          <Lista titulo="Para la primera visita" mas={ESPECIALIDADES.consultaMas} menos={ESPECIALIDADES.consultaMenos} />
        </div>
        <p className="mt-3 text-xs text-slate-500">Medias de toda España a 31 de diciembre de 2025.<F id="sisle-nota" /><F id="sisle-rectificacion">corrección</F></p>

        <Mas titulo="las cinco operaciones que tienen un plazo máximo por ley">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            Desde 2011, una norma fija 180 días como máximo, pero solo para cinco operaciones<F id="rd-1039" />. Aun así, a algunas personas se les pasa el plazo:
          </p>
          <ul className="mt-3 max-w-xl divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-[15px]">
            {GARANTIZADAS.map(g => (
              <li key={g.t} className="flex flex-wrap justify-between gap-x-4 px-4 py-2">
                <span className="font-medium text-slate-900">{g.t}</span>
                <span className="tabular-nums text-slate-700">{dias(g.dias)} · <span className={cn(g.fuera > 10 && 'font-semibold text-rose-700')}>{porcentaje(g.fuera)} pasan de 180</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">A 31 de diciembre de 2025.<F id="sisle-nota" /></p>
        </Mas>

        <Mas titulo="y las pruebas (resonancia, escáner…)">
          <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
            El registro oficial no publica cuánto se espera para una prueba. La encuesta del CIS de 2025 preguntó cuántas personas la tuvieron en un mes o menos desde que su médico la pidió<F id="barometro-2025" />:
          </p>
          <ul className="mt-3 max-w-xl space-y-2">
            {PRUEBAS.map(p => (
              <li key={p.t} className="grid grid-cols-[110px_1fr] items-center gap-3 text-sm">
                <span className="text-slate-700">{p.t}</span>
                <span className="flex items-center gap-2">
                  <span className="h-3 shrink-0 rounded-r-[3px] bg-slate-700" style={{ width: `${p.enUnMes * 0.7}%` }} />
                  <span className="tabular-nums text-slate-700">{porcentaje(p.enUnMes)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm text-slate-600">Es decir: cerca de la mitad espera más de un mes; en la colonoscopia, más de seis de cada diez.</p>
        </Mas>
      </Mas>
    </Apartado>
  );
}

/** Average wait for an operation every 31 December, 2019-2025, next to the staff that explains part of it. */
function Evolucion() {
  const d = EVOLUCION_CIRUGIA;
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Linea titulo="Días de espera para operarse, cada 31 de diciembre"
        subtitulo="La pandemia la disparó en 2020. Desde entonces se mueve entre 120 y 128 días: no baja."
        serie="tinta" desde={100} hasta={170} formato={v => `${v} días`}
        puntos={d.map(p => ({ x: p.ano, y: p.dias, nota: p.ano === 2020 ? 'El año de la pandemia.' : p.ano === 2025 ? 'Ya con la corrección de Castilla-La Mancha.' : undefined }))}
        pie={<>El eje empieza en 100 días. Registro de listas de espera del Ministerio de Sanidad; fuentes por año:{d.map(p => <F key={p.ano} id={p.fuente}>{p.ano}</F>)}. El dato de 2025 ya incluye la corrección de Castilla-La Mancha.</>} />
      <Pares titulo="Médicos y enfermeras por cada 1.000 habitantes"
        subtitulo="Profesionales en ejercicio. Hay algo más de médicos que la media; faltan enfermeras"
        series={['España', 'Media de la OCDE']} formato={v => numero(v, 1)}
        pares={[
          { etiqueta: 'Médicos', a: PERSONAL.medicos, b: PERSONAL.medicosOCDE },
          { etiqueta: 'Enfermeras', a: PERSONAL.enfermeras, b: PERSONAL.enfermerasOCDE, nota: `Un ${porcentaje((1 - PERSONAL.enfermeras / PERSONAL.enfermerasOCDE) * 100, 0)} menos que la media.` },
        ]}
        pie={<>Datos de la OCDE<F id="ocde-2025" /></>} />
    </div>
  );
}

function Lista({ titulo, mas, menos }: { titulo: string; mas: { t: string; d: number }[]; menos: { t: string; d: number }[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="font-semibold text-slate-900">{titulo}</p>
      <p className="mt-2 text-sm font-medium text-rose-700">Las que más</p>
      <ul className="text-sm text-slate-700">{mas.map(x => <li key={x.t}>{x.t}: <span className="tabular-nums">{dias(x.d)}</span></li>)}</ul>
      <p className="mt-2 text-sm font-medium text-emerald-700">Las que menos</p>
      <ul className="text-sm text-slate-700">{menos.map(x => <li key={x.t}>{x.t}: <span className="tabular-nums">{dias(x.d)}</span></li>)}</ul>
    </div>
  );
}

function Comunidades() {
  const [que, setQue] = useState<'cirugia' | 'consulta'>('cirugia');
  const filas = [...COMUNIDADES].sort((a, b) => b[que] - a[que]);
  const max = Math.max(...COMUNIDADES.map(c => Math.max(c.cirugia, c.consulta)));
  const media = que === 'cirugia' ? ESPERAS.cirugia.dias : ESPERAS.especialista.dias;
  const and = COMUNIDADES.find(c => c.id === 'and')!, mad = COMUNIDADES.find(c => c.id === 'mad')!;
  const can = COMUNIDADES.find(c => c.id === 'can')!, rio = COMUNIDADES.find(c => c.id === 'rio')!;
  return (
    <Apartado id="sanidad-comunidades" titulo="Depende de dónde vivas"
      entradilla={<>
        Cada comunidad lleva su propia sanidad, y se nota. Para operarse, en {and.nombre} se espera más del triple que en {mad.nombre}: {and.cirugia} días frente a {mad.cirugia}.
        Para ver al especialista, en {can.nombre} se espera cinco veces más que en {rio.nombre}.
      </>}>
      <figure className="rounded-2xl border border-slate-200 bg-white p-5">
        <figcaption className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-lg font-bold text-slate-900">Días de espera media, por comunidad</span>
          <Segmentado<'cirugia' | 'consulta'> etiqueta="Qué espera mostrar" valor={que} onChange={setQue}
            opciones={[{ id: 'cirugia', texto: 'Operarse' }, { id: 'consulta', texto: 'Ver al especialista' }]} />
        </figcaption>
        <ul className="mt-5 space-y-1.5" role="img" aria-label={filas.map(c => `${c.nombre}: ${c[que]} días`).join('; ')}>
          {filas.map(c => (
            <li key={c.id} className="grid grid-cols-[minmax(0,140px)_1fr] items-center gap-2 sm:grid-cols-[180px_1fr] sm:gap-3">
              <span className="truncate text-[13px] text-slate-700 sm:text-sm" title={c.nombre}>{c.nombre}</span>
              <span className="relative flex items-center gap-2">
                <span className={cn('h-3.5 shrink-0 rounded-r-[3px]', c[que] > media ? 'bg-rose-700' : 'bg-slate-400')} style={{ width: `${(c[que] / max) * 72}%` }} />
                <span className="text-sm tabular-nums text-slate-800">{c[que]}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
          <span><span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-rose-700" />más que la media de España ({media} días)</span>
          <span><span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" />igual o menos</span>
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">A 31 de diciembre de 2025. Sin Ceuta y Melilla, cuya sanidad lleva el Estado. Castilla-La Mancha corrigió después sus datos y la media de España pasó de 121 a 122 días; la cifra de cada comunidad es la primera publicada.<F id="sisle-ccaa" /><F id="sisle-rectificacion">corrección</F></p>
      </figure>

      <Mas titulo="esperar poco no siempre es lo mismo que funcionar bien">
        <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
          <p>
            {mad.nombre} es la que menos espera para operarse ({mad.cirugia} días, y casi nadie pasa de seis meses), pero es también la que más gente tiene esperando al especialista:
            {' '}{numero(mad.enConsulta)} personas, más que {and.nombre}, que tiene más habitantes<F id="sisle-ccaa" />.
            Si se tarda en ver al especialista, se tarda en entrar en la lista de operaciones.
          </p>
          <p>
            Tampoco gastar más asegura esperar menos. El {GASTO.porHabitanteMax.t} gasta {euros(GASTO.porHabitanteMax.v)} por habitante y espera poco;
            {' '}{mad.nombre} gasta {euros(GASTO.porHabitanteMadrid)}, de lo menos, y también espera poco para operarse;
            {' '}{GASTO.porHabitanteMin.t}, la que menos gasta ({euros(GASTO.porHabitanteMin.v)}), es la que más espera<F id="egsp-2024" />.
          </p>
          <p className="text-sm text-slate-500">Cada comunidad cuenta sus listas a su manera dentro de unas reglas comunes, así que las comparaciones finas hay que tomarlas con cuidado.</p>
        </div>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <caption className="px-4 pt-4 text-left font-semibold text-slate-900">Todas las cifras, por comunidad</caption>
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th scope="col" className="px-4 py-2 font-medium">Comunidad</th>
                <th scope="col" className="px-3 py-2 font-medium">Operarse (días)</th>
                <th scope="col" className="px-3 py-2 font-medium">Más de 6 meses</th>
                <th scope="col" className="px-3 py-2 font-medium">Especialista (días)</th>
                <th scope="col" className="px-3 py-2 font-medium">Esperando especialista</th>
              </tr>
            </thead>
            <tbody>
              {COMUNIDADES.map(c => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <th scope="row" className="px-4 py-1.5 text-left font-medium text-slate-900">{c.nombre}</th>
                  <td className="px-3 py-1.5 tabular-nums text-slate-700">{c.cirugia}</td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-700">{porcentaje(c.mas6)}</td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-700">{c.consulta}</td>
                  <td className="px-3 py-1.5 tabular-nums text-slate-700">{numero(c.enConsulta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Mas>
    </Apartado>
  );
}

function Gasto() {
  const g = GASTO;
  const segurosYOtros = g.privado2022 - g.bolsillo2022;
  const partes = [
    { t: 'Sanidad pública', v: g.publico2022, c: 'bg-slate-700', d: 'La pagan los impuestos' },
    { t: 'Del bolsillo', v: g.bolsillo2022, c: 'bg-rose-700', d: 'Dentista, gafas, farmacia, consultas privadas' },
    { t: 'Seguros y otros', v: segurosYOtros, c: 'bg-rose-300', d: 'Seguros privados, mutuas y otros pagos privados' },
  ];
  return (
    <Apartado id="sanidad-gasto" titulo="Lo que cuesta, y quién lo paga" fondo="blanco"
      entradilla={<>Las administraciones gastan en sanidad unos {numero(Math.round(g.publicoEGSP2024 / 1000))} mil millones de euros al año. Y además, de cada cuatro euros que se gastan en salud en España, uno sale del bolsillo de las familias o de un seguro privado.</>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Cifra valor={`${numero(g.publicoEGSP2024)} millones`} texto={<>de euros de gasto público en sanidad en 2024<F id="egsp-2024" /></>} nota={`El ${porcentaje(g.pctPIB)} de lo que produce el país en un año`} />
        <Cifra valor={euros(g.porHabitante)} texto={<>por habitante y año, pagados con impuestos<F id="egsp-2024" /></>} />
        <Cifra valor={porcentaje(g.privadoPct2022)} texto={<>de todo lo que se gasta en salud es privado (2022, último año con los dos)<F id="scs-2022" /></>} />
      </div>

      <figure className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <figcaption className="text-lg font-bold text-slate-900">Todo lo que se gastó en salud en 2022: {mill(g.total2022)}</figcaption>
        <div className="mt-4 flex h-9 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img"
          aria-label={partes.map(p => `${p.t}: ${mill(p.v)}`).join('; ')}>
          {partes.map(p => <div key={p.t} className={cn('h-full', p.c)} style={{ width: `${(p.v / g.total2022) * 100}%` }} title={`${p.t}: ${mill(p.v)}`} />)}
        </div>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          {partes.map(p => (
            <div key={p.t} className="flex gap-2">
              <span aria-hidden className={cn('mt-1 h-3 w-3 shrink-0 rounded-sm', p.c)} />
              <div><dt className="font-semibold text-slate-900">{p.t}: {porcentaje((p.v / g.total2022) * 100)}</dt><dd className="text-slate-600">{mill(p.v)}. {p.d}</dd></div>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-500">Cuentas de salud del Ministerio de Sanidad, 2022.<F id="scs-2022" /> En 2026, el {porcentaje(EXPEDIENTE_HOY.seguroPrivado)} de las personas tenía un seguro privado propio o de su familia<F id="barometro-2026" />.</p>
      </figure>

      <Mas titulo="en qué se va el dinero público">
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li>El {porcentaje(g.comunidadesPct)} lo gastan las comunidades autónomas: son las que llevan los hospitales y los centros de salud<F id="egsp-2024" />.</li>
          <li>El {porcentaje(g.hospitalesPct)} va a hospitales y especialistas<F id="egsp-2024" />.</li>
          <li>El {porcentaje(g.sueldosPct)} son sueldos de médicos, enfermeras y el resto del personal<F id="egsp-2024" />.</li>
        </ul>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-500">
          La Intervención General del Estado, que lleva las cuentas de todas las administraciones y es la que usa el resto de este modelo, cuenta {mill(HOY.sanidad2024)} para 2024<F id="igae-cofog" />: un 1 % más, porque mide de forma algo distinta.
        </p>
      </Mas>
    </Apartado>
  );
}

/** The record today: what exists and what fails. */
function ExpedienteHoy() {
  const x = EXPEDIENTE_HOY;
  return (
    <Apartado id="sanidad-expediente" titulo="Tu historia médica, repartida en trozos"
      entradilla="Cada comunidad tiene su propio sistema informático y su propia historia clínica. Entre ellas se pasan un resumen, cuando funciona. Con la sanidad privada no hay conexión: la pública no ve lo que te hicieron en la privada, ni al revés.">
      <h3 className="text-xl font-bold text-slate-900">Lo que falla</h3>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {[
          { t: 'La privada se queda fuera', d: <>El propio Ministerio reconoce que los centros privados no están dentro de la historia clínica compartida, que solo funciona en la sanidad pública<F id="ley-salud-digital" />. Más de una de cada cinco personas tiene seguro privado<F id="barometro-2026" />: sus pruebas en la privada no las ve su médico de la pública.</> },
          { t: 'Fuera de tu comunidad, casi nunca se mira', d: <>Al {porcentaje(x.atendidosFuera)} de la gente la atendieron fuera de su comunidad en el último año. Solo en uno de cada cuatro casos ({porcentaje(x.medicoConsultoInformes)}) el médico consultó sus informes<F id="barometro-2026" />.</> },
          { t: 'Casi nadie entra en su propia historia', d: <>El {porcentaje(x.nuncaEntraron)} nunca ha consultado su historia clínica electrónica, y más de la mitad no sabe que un médico de otra comunidad puede ver sus informes<F id="barometro-2026" />.</> },
          { t: 'Diecisiete sistemas distintos', d: <>Cada comunidad compra y mantiene su propio programa. Lo que se comparte es un resumen, no la historia entera: el resto se pide por teléfono, se repite o lo lleva el paciente en papel.</> },
        ].map(c => (
          <li key={c.t} className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
            <p className="font-bold text-rose-900">{c.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{c.d}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <DiagramaViaje modo="hoy" />
        <DiagramaViaje modo="propuesta" />
      </div>
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-500">
        Esquema simplificado. «Un resumen, a veces»: la historia clínica digital común de la sanidad pública comparte los informes principales entre comunidades, si el médico la consulta.
      </p>

      <Mas titulo="lo que ya existe hoy para compartir tu historia">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { t: 'La historia clínica digital común', d: <>Une las 17 comunidades y Ceuta y Melilla: un médico puede ver tus informes principales de otra comunidad, y tú puedes verlos con DNI electrónico o certificado digital<F id="hcdsns" />.</> },
            { t: 'La receta electrónica', d: <>Puedes recoger tu medicina en una farmacia de otra comunidad enseñando la tarjeta sanitaria<F id="resns" />. Con algunos países europeos también funciona<F id="europa-2023" />.</> },
            { t: 'El espacio europeo de datos de salud', d: <>Una ley europea en vigor desde marzo de 2025: en 2029 tu resumen y tus recetas deberán poder verse en toda la Unión; en 2031, también pruebas de imagen, análisis e informes de alta<F id="ehds" />.</> },
          ].map(c => (
            <div key={c.t} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-bold text-slate-900">{c.t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{c.d}</p>
            </div>
          ))}
        </div>

      </Mas>
    </Apartado>
  );
}

/** How your information travels today, and how it would with one record. */
function DiagramaViaje({ modo }: { modo: 'hoy' | 'propuesta' }) {
  const W = 400, H = 350, w = 128, h = 54, cx = 200, cy = 175;
  const nodos = {
    arriba: { x: cx, y: 38, l: ['Centro de salud', 'de tu comunidad'] },
    izq: { x: 66, y: cy, l: ['Hospital de', 'otra comunidad'] },
    der: { x: 334, y: cy, l: ['Clínica o', 'seguro privado'] },
    abajo: { x: cx, y: 312, l: ['Farmacia de', 'cualquier sitio'] },
  };
  const hoy = modo === 'hoy';
  const Nodo = ({ x, y, l }: { x: number; y: number; l: string[] }) => (
    <g>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={10} className="fill-white stroke-slate-300" strokeWidth={1.5} />
      {l.map((t, i) => <text key={t} x={x} y={y - 4 + i * 18} textAnchor="middle" className="fill-slate-800 text-[15px] font-medium">{t}</text>)}
    </g>
  );
  const Etiqueta = ({ x, y, t, c }: { x: number; y: number; t: string; c: string }) => (
    <g>
      <rect x={x - t.length * 4 - 6} y={y - 12} width={t.length * 8 + 12} height={24} rx={12} className="fill-white" />
      <text x={x} y={y + 5} textAnchor="middle" className={cn('text-[14px] font-semibold', c)}>{t}</text>
    </g>
  );
  const { arriba, izq, der, abajo } = nodos;
  return (
    <figure className={cn('rounded-2xl border p-5', hoy ? 'border-slate-200 bg-white' : 'border-emerald-200 bg-emerald-50/50')}>
      <figcaption className={cn('text-lg font-bold', hoy ? 'text-slate-900' : 'text-emerald-900')}>
        {hoy ? 'Cómo viaja hoy tu información' : 'Cómo viajaría con un único expediente'}
      </figcaption>
      <p className="mt-1 text-sm text-slate-600">
        {hoy ? 'Y tú, en medio, llevando papeles de un sitio a otro.' : 'Todos leen y escriben en el mismo expediente, solo con tu permiso.'}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto mt-3 w-full max-w-[460px]" role="img"
        aria-label={hoy
          ? 'Hoy: el centro de salud y un hospital de otra comunidad comparten solo un resumen, a veces; el centro de salud y la clínica privada no se ven; la receta sí llega a la farmacia.'
          : 'Con la propuesta: el centro de salud, el hospital de otra comunidad, la clínica privada y la farmacia están unidos al mismo expediente, que controla la persona.'}>
        {hoy ? (
          <>
            <line x1={arriba.x - 40} y1={arriba.y + h / 2} x2={izq.x + 20} y2={izq.y - h / 2} className="stroke-amber-600" strokeWidth={2.5} strokeDasharray="6 5" />
            <line x1={arriba.x + 40} y1={arriba.y + h / 2} x2={der.x - 20} y2={der.y - h / 2} className="stroke-rose-600" strokeWidth={2.5} strokeDasharray="2 5" />
            <line x1={arriba.x} y1={arriba.y + h / 2} x2={abajo.x} y2={abajo.y - h / 2} className="stroke-slate-500" strokeWidth={2.5} />
            <line x1={izq.x + w / 2} y1={cy} x2={der.x - w / 2} y2={cy} className="stroke-rose-600" strokeWidth={2.5} strokeDasharray="2 5" />
            <Etiqueta x={112} y={104} t="un resumen, a veces" c="fill-amber-800" />
            <Etiqueta x={290} y={104} t="no se ven" c="fill-rose-700" />
            <Etiqueta x={cx} y={cy} t="no se ven" c="fill-rose-700" />
            <Etiqueta x={cx} y={250} t="la receta, sí" c="fill-slate-700" />
          </>
        ) : (
          <>
            {[arriba, izq, der, abajo].map((n, i) => (
              <line key={i} x1={n.x} y1={n.y} x2={cx} y2={cy} className="stroke-emerald-600" strokeWidth={3} />
            ))}
            <rect x={cx - 58} y={cy - 38} width={116} height={76} rx={14} className="fill-emerald-700" />
            <text x={cx} y={cy - 10} textAnchor="middle" className="fill-white text-[15px] font-bold">Tu expediente</text>
            <text x={cx} y={cy + 6} textAnchor="middle" className="fill-white text-[15px] font-bold">único</text>
            <text x={cx} y={cy + 24} textAnchor="middle" className="fill-emerald-50 text-[12px]">tú das permiso</text>
          </>
        )}
        {[arriba, izq, der, abajo].map((n, i) => <Nodo key={i} {...n} />)}
      </svg>
    </figure>
  );
}

function Propuesta() {
  return (
    <Apartado id="sanidad-propuesta" titulo="La propuesta: un expediente, plazos que se cumplen" fondo="blanco"
      entradilla="Un único expediente sanitario para cada persona, con un perfil único donde se guarda toda su información de salud. Lo ve la pública y la privada, en cualquier comunidad, y lo controla la persona.">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <ul className="space-y-4">
          {[
            { i: FileHeart, t: 'Todo en un solo sitio', d: 'Informes, pruebas, imágenes, análisis, vacunas, alergias y medicación. Lo que te hagan en un hospital público, en una clínica privada o en otra comunidad se guarda en el mismo expediente.' },
            { i: Smartphone, t: 'Lo ves desde el móvil', d: 'Todo tu expediente, siempre. Puedes descargarlo, añadir lo que quieras (por ejemplo, la tensión que te tomas en casa) y pedir que corrijan un error.' },
            { i: KeyRound, t: 'Tú das el permiso', d: 'Decides qué centro o qué médico lo ve, y durante cuánto tiempo. Puedes ocultar una parte, y retirar el permiso cuando quieras.' },
            { i: Eye, t: 'Ves quién ha entrado', d: 'Cada vez que alguien abre tu expediente, queda apuntado quién, cuándo y para qué. Mirar sin motivo se castiga.' },
            { i: ShieldAlert, t: 'En una urgencia', d: 'Si llegas inconsciente, urgencias puede ver lo esencial (alergias, medicación, enfermedades graves) sin tu permiso. Queda apuntado y se te avisa.' },
            { i: Stethoscope, t: 'Obligatorio para todos los centros', d: 'Todo centro, público o privado, que atienda en España escribe en el expediente con el mismo formato. Es condición para poder abrir.' },
          ].map(c => (
            <li key={c.t} className="flex gap-3">
              <c.i aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div>
                <p className="font-semibold text-slate-900">{c.t}</p>
                <p className="text-[15px] leading-relaxed text-slate-600">{c.d}</p>
              </div>
            </li>
          ))}
        </ul>
        <Movil />
      </div>

      <h3 className="mt-12 text-xl font-bold text-slate-900">Plazos máximos garantizados</h3>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        Hoy solo cinco operaciones tienen un plazo máximo por ley<F id="rd-1039" />. La propuesta es que cada puerta tenga el suyo y que se cumpla:
        si se pasa, la persona elige otro centro, público o privado, de su comunidad o de otra, y lo paga la sanidad pública.
      </p>
      <ul className="mt-4 space-y-3 sm:hidden">
        {PLAZOS_PROPUESTOS.map(p => (
          <li key={p.puerta} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{p.puerta}</p>
            <p className="mt-1 text-sm text-slate-600"><span className="font-medium text-slate-700">Hoy: </span>{p.hoy}</p>
            <p className="mt-1 text-sm font-medium text-emerald-900"><span className="text-emerald-800">Propuesta: </span>{p.propuesta}</p>
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 sm:block">
        <table className="w-full min-w-[620px] text-[15px]">
          <caption className="sr-only">Esperas de hoy y plazos máximos propuestos</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-sm text-slate-500">
              <th scope="col" className="w-[26%] px-5 py-2 font-medium">Puerta</th>
              <th scope="col" className="px-4 py-2 font-medium">Hoy</th>
              <th scope="col" className="px-4 py-2 font-medium text-emerald-800">Plazo máximo propuesto</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {PLAZOS_PROPUESTOS.map(p => (
              <tr key={p.puerta} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="px-5 py-3 text-left font-semibold text-slate-900">{p.puerta}</th>
                <td className="px-4 py-3 text-slate-600">{p.hoy}</td>
                <td className="px-4 py-3 font-medium text-emerald-900">{p.propuesta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500">Los plazos son una propuesta inicial de esta página, para debatir. Las cifras de hoy, de las fuentes de los apartados de arriba.</p>

      <Mas titulo="cómo se baja el colapso">
        <ol className="max-w-3xl list-decimal space-y-3 pl-5 text-[15px] leading-relaxed text-slate-700">
          <li><strong>Una sola lista de espera por región, no una por hospital.</strong> Te atiende el primer especialista o quirófano libre cerca de ti, y ves en el móvil tu puesto en la lista.</li>
          <li><strong>No repetir pruebas.</strong> Con el expediente único, el médico ve la resonancia que te hicieron en otra comunidad o en la privada. No hay dato oficial de cuántas pruebas se repiten hoy: medirlo sería lo primero.</li>
          <li><strong>Más tiempo para el médico de familia.</strong> Que las recetas de siempre se renueven solas y que los papeles (bajas, certificados) no ocupen consulta.</li>
          <li><strong>Que el médico de familia pregunte al especialista sin derivar.</strong> Una consulta entre médicos por el expediente resuelve muchos casos sin añadir a nadie a la lista.</li>
          <li><strong>Quirófanos y consultas también por la tarde</strong>, con personal propio, antes que pagar a otros cuando la lista ya es larga.</li>
          <li><strong>Listas públicas, centro a centro y cada mes.</strong> El registro del Ministerio sale dos veces al año, por comunidad; algunas comunidades publican más, cada una a su manera.</li>
          <li><strong>Prevención cerca de casa:</strong> el municipio y la comunidad vecinal cuidan a los mayores y a quien vive solo antes de que llegue a urgencias.</li>
        </ol>
        <p className="mt-3 max-w-3xl text-sm text-slate-500">Son propuestas. Ninguna está calculada todavía: cuánto cuestan y cuánta espera quitan es trabajo pendiente.</p>
      </Mas>
    </Apartado>
  );
}

/** A sketch of the record on a phone. Invented example, said so. */
function Movil() {
  const filas = [
    { t: 'Alergias', v: 'Penicilina' },
    { t: 'Medicación', v: '2 activas' },
    { t: 'Informes', v: '23 · pública y privada' },
    { t: 'Pruebas e imágenes', v: '12' },
    { t: 'Vacunas', v: 'Al día' },
  ];
  return (
    <figure className="mx-auto w-full max-w-[300px]">
      <div className="rounded-[2rem] border-4 border-slate-800 bg-white p-4 shadow-sm">
        <p className="text-xs text-slate-500">Mi expediente</p>
        <p className="text-lg font-bold text-slate-900">Ana, 54 años</p>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {filas.map(f => (
            <li key={f.t} className="flex justify-between gap-2 py-2"><span className="text-slate-600">{f.t}</span><span className="text-right font-medium text-slate-900">{f.v}</span></li>
          ))}
        </ul>
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs">
          <p className="font-semibold text-slate-900">Quién ha entrado</p>
          <p className="mt-1 text-slate-600">Hoy, 10:42 · Hospital de Valencia · urgencias</p>
          <p className="text-slate-600">Ayer · Tu centro de salud · Dra. López</p>
        </div>
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs">
          <p className="font-semibold text-emerald-900">Permisos</p>
          <p className="mt-1 text-emerald-900">Clínica privada: hasta el 30 de noviembre</p>
        </div>
      </div>
      <figcaption className="mt-2 text-center text-xs text-slate-500">Ejemplo inventado de cómo se vería</figcaption>
    </figure>
  );
}

/** What each of the eight scales does in health (MATRIZ, 'salud'), plus its part in the record and the waits. */
const PAPEL: Record<string, string> = {
  persona: 'Es la dueña de su expediente: lo ve, da y quita permisos y ve quién ha entrado.',
  vecindad: 'Puede ayudar a un vecino mayor a usar su expediente, solo si él le da permiso.',
  municipio: 'Un punto de ayuda en el consultorio para quien no tiene móvil o no sabe usarlo.',
  provincia: 'Responde del plazo del médico de familia y de las urgencias de la comarca.',
  region: 'Lleva la lista única de especialistas y operaciones, y responde de sus plazos.',
  nacion: 'Fija el formato común, guarda el expediente con todas las garantías y publica las listas.',
  continente: 'Hace que el expediente se lea en toda Europa, con el espacio europeo de datos de salud.',
  planeta: 'Normas comunes para que, con permiso de la persona, se pueda leer en cualquier país.',
};

function Escalas() {
  return (
    <Apartado id="sanidad-escalas" titulo="Qué hace cada escala"
      entradilla="De la persona al planeta. La persona es dueña de su expediente; el municipio ayuda a quien no tiene móvil; la región responde de los plazos de especialistas y operaciones; la nación guarda el expediente y publica las listas; Europa hace que se lea en toda la Unión.">
      <Mas titulo="lo que hace cada una de las ocho escalas, y cuánto dedica">
        <p className="mb-4 max-w-3xl text-sm text-slate-600">El porcentaje es la parte de su presupuesto que el modelo propone dedicar a la salud (ventana Escalas); no son cifras de hoy.</p>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ESCALAS.map(es => {
            const c = MATRIZ[es.id].salud;
            return (
              <li key={es.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="flex items-center gap-2 font-bold text-slate-900"><Muestra color={es.color} />{es.nombre}</p>
                <p className="mt-1 text-sm text-slate-500">{c.peso == null ? 'Con su propio dinero' : `${c.peso} % de su presupuesto`}</p>
                <p className="mt-3 text-[15px] font-medium text-slate-800">{c.responsabilidad}</p>
                <p className="mt-1 text-sm text-slate-600">{c.inversiones.join('. ')}.</p>
                <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-emerald-800">{PAPEL[es.id]}</p>
              </li>
            );
          })}
        </ol>
      </Mas>
    </Apartado>
  );
}

function Retos() {
  const p = PERSONAL;
  const visibles = [
    { t: 'Privacidad', d: 'La salud es lo más íntimo que hay. Un expediente que lo reúne todo es muy útil, y por eso mismo muy delicado: una enfermedad mental o un VIH no deberían verse en la consulta del dentista. Hace falta poder ocultar partes, y que el permiso sea por centro y por tiempo.' },
    { t: 'Seguridad', d: 'Juntar los datos de 49 millones de personas crea un objetivo enorme para los ataques informáticos. Se puede reducir (cifrar todo, separar los datos, guardar copias, avisar de cada acceso), pero no hacer desaparecer.' },
    { t: 'Los plazos necesitan personas', d: <>España tiene {numero(p.medicos, 1)} médicos por cada 1.000 habitantes, más que la media de los países ricos de la OCDE ({numero(p.medicosOCDE, 1)}); pero {numero(p.enfermeras, 1)} enfermeras, frente a {numero(p.enfermerasOCDE, 1)}<F id="ocde-2025" />. Un plazo máximo sin el personal y los quirófanos para cumplirlo es papel mojado, y esta página aún no ha calculado cuánto costaría.</> },
  ];
  const resto = [
    { t: 'Quién guarda los datos', d: 'Hay tres caminos: un solo archivo nacional; que cada comunidad guarde lo suyo con un índice común, como hoy pero completo; o que lo guarde cada persona. Esta página propone un custodio público, sin ánimo de lucro y vigilado por la ciudadanía, que nunca venda ni ceda los datos. Falta decidirlo.' },
    { t: 'Quien no tiene móvil', d: 'Muchas personas mayores no usan el móvil. Hacen falta otras puertas: una tarjeta, el consultorio del pueblo o una persona de confianza con permiso.' },
    { t: 'La investigación', d: 'Los datos de todos, sin nombre, ayudan a curar enfermedades. La ley europea permite usarlos así con garantías y deja que cada persona diga que no. Hay que decidir hasta dónde.' },
    { t: 'Diecisiete programas que unir', d: 'Cada comunidad tiene su sistema, y la privada el suyo. Unirlos es caro y lento. La ley europea obliga a dar los primeros pasos en 2029 y 2031: es una buena fecha para hacerlo de una vez.' },
  ];
  return (
    <Apartado id="sanidad-retos" titulo="Lo que falta por resolver" fondo="blanco"
      entradilla="La idea es sencilla; hacerla bien no. Los tres problemas más serios, dichos sin adornos:">
      <ul className="grid gap-4 md:grid-cols-3">
        {visibles.map(r => (
          <li key={r.t} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="font-bold text-slate-900">{r.t}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
          </li>
        ))}
      </ul>
      <Mas titulo="otros cuatro retos">
        <ul className="grid gap-4 md:grid-cols-2">
          {resto.map(r => (
            <li key={r.t} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-bold text-slate-900">{r.t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{r.d}</p>
            </li>
          ))}
        </ul>
      </Mas>
      <Mas titulo="qué está haciendo ya el Gobierno">
        <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
          En septiembre de 2025, el Ministerio de Sanidad abrió la consulta de una Ley de Salud Digital. Dice que quiere una historia clínica que funcione en toda España y en Europa, en la pública y en la privada, e integrar a los centros privados, que hoy están fuera<F id="ley-salud-digital" />.
          Va en la misma dirección que esta propuesta. La diferencia: aquí el expediente es uno solo, lo controla la persona desde el móvil y es obligatorio para todos los centros.
        </p>
      </Mas>
    </Apartado>
  );
}
