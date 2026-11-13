// The «Legal» window (Eugenio, 2026-11-12): the legislative model. Today every
// region and town can write its own rule on the same basic matter (noise, air,
// waste, licences, land), so a business has to comply with a different law in
// each place. The proposal: unify and simplify — one common text per basic
// matter across the country and later across Europe, smaller scales only
// adjusting inside fixed margins. Includes how many norms there are, what can
// and cannot be measured about contradictions, the sectors where it hurts most,
// a diagram of who legislates what, and a quiz. Data: src/data/legal.ts.
import type { ReactNode } from 'react';
import { BookOpen, CalendarClock, FileCheck2, Layers, Map as MapIcon, MinusCircle, Search, SlidersHorizontal } from 'lucide-react';
import { ESCALAS, numero, porcentaje } from '../../data/modeloSocioeconomico';
import { FUENTES_LEGAL, IMPUGNACIONES, NORMAS, PAPEL_ESCALA, PROPUESTA, RECLAMACIONES_LGUM, SECTORES, SECTORES_SIN_CIFRA, TEXTOS_MAXIMOS } from '../../data/legal';
import { Apartado, Cifra, Mas } from './ventanas';
import { Anillo } from './graficos/Anillo';
import { Barras } from './graficos/Barras';
import { Muestra } from './piezas';
import { F, LegalDiagrama } from './LegalDiagrama';
import { LegalLicencias } from './LegalLicencias';
import { LegalPrueba } from './LegalPrueba';

const ICONO = { comun: BookOpen, margenes: SlidersHorizontal, niveles: FileCheck2, suelo: MapIcon, ventanilla: Layers, 'dos-salen': MinusCircle, caducidad: CalendarClock, consolidado: Search } as const;

const MEDIBLE: [string, string][] = [
  ['Cuántas normas se publican cada año', 'Cuántas siguen vigentes hoy: muchas se cambian o derogan a medias'],
  ['Los choques entre el Estado y las comunidades que llegan al tribunal', 'Las contradicciones que nadie recurre, que son la mayoría'],
  ['Las quejas por trabas que llegan a la CNMC y al Ministerio', 'Las empresas que no abren en otro sitio por no saber qué norma rige'],
  ['Las normas autonómicas y estatales', 'Cuántas ordenanzas municipales hay: no existe un recuento oficial'],
];

const COMPARA: { t: string; hoy: string; propuesta: string }[] = [
  { t: 'Quién escribe la regla del ruido, el aire o los residuos', hoy: 'El Estado, cada comunidad y cada ayuntamiento, cada uno la suya.', propuesta: 'Un solo texto común. Los demás ajustan dentro de márgenes y aplican.' },
  { t: 'Una empresa que trabaja en todo el país', hoy: 'Tiene que conocer la norma de cada sitio donde trabaja.', propuesta: 'Conoce una norma, y sabe qué puede cambiar cada municipio.' },
  { t: 'Abrir un negocio', hoy: 'Impresos, plazos y tasas distintos en cada ayuntamiento.', propuesta: 'El mismo nivel (aviso, declaración o licencia) y el mismo plazo en todas partes, en una ventanilla única.' },
  { t: 'Saber qué es legal', hoy: 'Buscar en el BOE, en el boletín de la comunidad y en el de la provincia.', propuesta: 'Un solo buscador con el texto vigente de todo.' },
  { t: 'Normas nuevas', hoy: 'Unas 32 al día (2022), y casi ninguna desaparece.', propuesta: 'Por cada norma que entra, salen dos de su materia.' },
  { t: 'Normas viejas', hoy: 'Siguen vigentes aunque nadie las revise.', propuesta: 'Cada una tiene fecha de revisión; si nadie la revisa, caduca.' },
];

export function LegalVentana() {
  return (
    <>
      <Apartado id="legal" titulo="Las mismas reglas en todo el país"
        entradilla={<>Hoy el Estado, cada comunidad y cada ayuntamiento pueden escribir su propia norma sobre lo mismo: el ruido, la basura, las licencias, el suelo. Quien trabaja en varios sitios tiene que cumplir una ley distinta en cada uno. La propuesta: unificar y simplificar. Una sola norma por materia básica, la misma en toda España y, a futuro, en toda Europa. Una <strong>materia básica</strong> es lo esencial que debería ser igual para todos: el ruido, el aire, los residuos, las licencias, el suelo.</>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Cifra valor={numero(NORMAS.desde1979)} texto={<>normas aprobaron las administraciones españolas entre 1979 y 2021<F id="bde-blog" /></>} tono="mal" />
          <Cifra valor={`${Math.round(NORMAS.en2022 / 365)} al día`} texto={<>normas nuevas en 2022: {numero(NORMAS.en2022)} en un año<F id="bde-blog" /></>} tono="mal" />
          <Cifra valor={`hasta ${numero(TEXTOS_MAXIMOS)}`} texto={<>textos distintos pueden regular el ruido en España: Unión Europea, Estado, 17 comunidades y {numero(NORMAS.municipios)} ayuntamientos<F id="ley-ruido" /></>} tono="mal"
            nota="Es el máximo posible: no hay recuento oficial de ordenanzas." />
          <Cifra valor="1" texto="texto por materia básica con la propuesta, igual en todo el país; las escalas pequeñas solo ajustan dentro de márgenes" tono="bien" />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { t: 'El problema', d: 'Demasiadas normas, y distintas en cada sitio. Lo que es legal en un pueblo puede no serlo en el de al lado.' },
            { t: 'La propuesta', d: 'Una norma común por materia. Las comunidades y los ayuntamientos ajustan solo lo que esa norma les deja.' },
            { t: 'Lo difícil', d: 'La Constitución reparte esas materias entre el Estado, las comunidades y los ayuntamientos. Cambiarlo pide grandes acuerdos.' },
          ].map(b => (
            <div key={b.t} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="font-bold text-slate-900">{b.t}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{b.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-slate-600">
          Usa el menú de arriba para ir de una parte a otra: quién legisla hoy, cuántas normas hay, los sectores donde más se nota, la propuesta, qué hace cada escala, los retos y una prueba para ver si se ha entendido.
        </p>
      </Apartado>

      <Apartado id="legal-quien" titulo="Quién legisla qué" fondo="blanco"
        entradilla="Elige una materia y compara: hoy hasta cuatro capas escriben su propia norma sobre lo mismo; con la propuesta, una sola escribe y las demás ajustan y aplican.">
        <LegalDiagrama />
        <Mas titulo="por qué está repartido así">
          <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
            <p>La Constitución de 1978 reparte las materias. Al Estado le toca, entre otras cosas, fijar las condiciones básicas para que todos los españoles sean iguales y la legislación básica de medio ambiente. Las comunidades pueden añadir normas más protectoras y tienen como propias el urbanismo, el turismo o la caza<F id="constitucion" />.</p>
            <p>Los municipios tienen autonomía garantizada por la Constitución y por la Carta Europea de Autonomía Local<F id="carta-local" />. Por eso cada uno aprueba sus ordenanzas.</p>
            <p>El resultado es que una misma materia la tocan varias capas a la vez. Cada una tiene su razón; juntas, hacen que la misma actividad tenga reglas distintas según el lugar.</p>
          </div>
        </Mas>
      </Apartado>

      <Apartado id="legal-cifras" titulo="Cuántas normas hay, y cuántas chocan"
        entradilla={<>Contar normas se puede. Contar cuántas se contradicen, no: nadie lo mide. Lo que sí se cuenta son los choques que llegan al Tribunal Constitucional, como los <strong>conflictos de competencia</strong>: dos administraciones discuten a cuál de las dos le toca regular algo.</>}>
        <div className="grid gap-4 md:grid-cols-3">
          <Cifra valor={numero(NORMAS.desde1979)} texto={<>normas aprobaron todas las administraciones entre 1979 y 2021<F id="bde-blog" /></>} tono="mal" />
          <Cifra valor={numero(IMPUGNACIONES.total)} texto={<>choques entre el Estado y las comunidades llevados al Constitucional, de 1980 a 2024<F id="mpt-conflictividad" /></>} tono="mal" />
          <Cifra valor={`más de ${numero(RECLAMACIONES_LGUM)}`} texto={<>quejas de empresas y profesionales por trabas de una administración, de 2014 a 2024<F id="bde-lgum" /></>} tono="mal"
            nota="Los ayuntamientos son los que más acumulan." />
        </div>
        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-slate-700">
          Además, otros {numero(IMPUGNACIONES.evitadas)} choques se arreglaron negociando desde el año 2000, sin llegar al tribunal<F id="mpt-lexter" />. Pero la mayoría de las contradicciones nunca se recurren, y esas no las cuenta nadie.
        </p>

        <Mas titulo="todas las cifras, el gráfico y qué se puede medir">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">Cuántas normas</h3>
              <dl className="mt-4 space-y-4">
                <Dato v={numero(NORMAS.en2022)} t={<>normas publicadas solo en 2022: una cada 45 minutos<F id="bde-blog" /></>} />
                <Dato v={numero(NORMAS.sectorialesCCAA)} t={<>normas sobre sectores económicos aprobaron las comunidades autónomas entre 1995 y 2020<F id="bde-dt2202" /></>} />
                <Dato v={`≈ ${numero(NORMAS.ceoe2024.paginas)}`} t={<>páginas publicaron en 2024 el BOE y los boletines de las comunidades<F id="ceoe-2024" /></>} />
                <Dato v={porcentaje(NORMAS.ceoe2024.origenUE, 0)} t={<>de las leyes aprobadas en España en 2024 venían de la Unión Europea<F id="ceoe-2024" /></>} />
              </dl>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">Cuántas chocan: lo que se puede medir</h3>
              <dl className="mt-4 space-y-4">
                <Dato v={numero(IMPUGNACIONES.porCCAA)} t={<>de los choques llevados al Constitucional (recursos y conflictos de competencia) los presentaron las comunidades contra el Estado, de 1980 a 2024<F id="mpt-conflictividad" /></>} />
                <Dato v={numero(IMPUGNACIONES.porEstado)} t={<>los presentó el Estado contra las comunidades<F id="mpt-conflictividad" /></>} />
                <Dato v={numero(IMPUGNACIONES.recursosTC2024)} t={<>leyes llevadas al Constitucional solo en 2024, por cualquier motivo<F id="tc-2024" /></>} />
              </dl>
            </div>
          </div>

          <ConflictosGrafica />

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold text-slate-900">Qué se puede medir y qué no</h3>
            <ul className="mt-4 divide-y divide-slate-100">
              {MEDIBLE.map(([si, no]) => (
                <li key={si} className="grid gap-x-6 gap-y-1 py-3 text-[15px] leading-snug sm:grid-cols-2">
                  <p className="text-slate-800"><span className="font-semibold text-emerald-800">Se mide: </span>{si}</p>
                  <p className="text-slate-600"><span className="font-semibold text-rose-800">No se mide: </span>{no}</p>
                </li>
              ))}
            </ul>
          </div>

          <Mas titulo="por qué las cifras no cuadran entre sí">
            <div className="max-w-3xl space-y-3 text-[15px] leading-relaxed text-slate-700">
              <p>Cada estudio cuenta cosas distintas. El Banco de España cuenta todas las normas publicadas. CEOE, en su informe anual, contó para 2024 {numero(NORMAS.ceoe2024.estatales)} normas estatales y {numero(NORMAS.ceoe2024.autonomicas)} autonómicas, con otro criterio<F id="ceoe-2024" />. Por eso no se pueden sumar.</p>
              <p>En 2024 la Unión Europea aprobó además {numero(NORMAS.ceoe2024.actosUE)} actos legales<F id="ceoe-2024" />. Muchos se aplican directamente; otros hay que trasladarlos a una ley española.</p>
              <p>Sobre los choques: la base de datos pública del Ministerio (LEXTER) reúne {numero(IMPUGNACIONES.lexter)} recursos y conflictos en 45 años, una cifra más amplia que la del boletín porque cuenta más tipos de choque<F id="mpt-lexter" />.</p>
            </div>
            <Mas titulo="cómo se podría medir de verdad">
              <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
                Con un texto consolidado único (ver «La propuesta»), cada artículo vigente estaría en un solo sitio, con la materia que regula. Entonces un programa podría comparar, por ejemplo, todos los límites de ruido nocturno del país y señalar los que no coinciden. Hoy eso no se puede hacer porque las ordenanzas están repartidas en decenas de boletines y webs, en formatos distintos.
              </p>
            </Mas>
          </Mas>
        </Mas>
      </Apartado>

      <Apartado id="legal-sectores" titulo="Dónde más duele" fondo="blanco"
        entradilla="Diez sectores donde una misma actividad tiene reglas distintas según la comunidad o el pueblo, con un ejemplo de cada uno. Primero, los que más quejas y estudios acumulan; el orden es nuestro, no una clasificación oficial.">
        <ol className="grid gap-4 md:grid-cols-2">
          {SECTORES.map(s => (
            <li key={s.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-lg font-bold text-slate-900">{s.nombre}</p>
              <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{s.hoy}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600"><span className="font-semibold text-rose-800">Ejemplo: </span>{s.ejemplo}{s.fuentes.map(f => <F key={f} id={f} />)}</p>
              <p className="mt-3 border-t border-slate-100 pt-3 text-[15px] leading-relaxed text-emerald-800"><span className="font-semibold">Con la propuesta: </span>{s.propuesta}</p>
            </li>
          ))}
        </ol>
        <Mas titulo="otros sectores que también se citan">
          <ul className="max-w-3xl space-y-2 text-[15px] leading-relaxed text-slate-700">
            {SECTORES_SIN_CIFRA.map(s => <li key={s.nombre}><strong className="text-slate-900">{s.nombre}.</strong> {s.t}</li>)}
          </ul>
          <p className="mt-3 max-w-3xl text-sm text-slate-500">De estos no hemos encontrado una cifra oficial que podamos citar, así que solo los nombramos.</p>
        </Mas>
      </Apartado>

      <Apartado id="legal-propuesta" titulo="La propuesta: unificar y simplificar"
        entradilla="Ocho piezas. Juntas hacen que un profesional sepa qué es legal y qué no, esté en el pueblo o en la región que esté.">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROPUESTA.map(p => {
            const I = ICONO[p.id as keyof typeof ICONO];
            return (
              <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <I aria-hidden className="h-5 w-5 text-emerald-700" />
                <p className="mt-2 font-bold leading-snug text-slate-900">{p.t}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
              </li>
            );
          })}
        </ul>
        <Mas titulo="cada pieza, en detalle">
          <dl className="max-w-3xl space-y-4">
            {PROPUESTA.map(p => (
              <div key={p.id}>
                <dt className="font-semibold text-slate-900">{p.t}</dt>
                <dd className="mt-1 text-[15px] leading-relaxed text-slate-700">{p.mas}{p.fuentes?.map(f => <F key={f} id={f} />)}</dd>
              </div>
            ))}
          </dl>
        </Mas>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-bold text-slate-900">Hoy y con la propuesta</h3>
          <div aria-hidden className="mt-3 hidden gap-x-6 border-b border-slate-200 pb-2 text-sm text-slate-500 md:grid md:grid-cols-[28%_1fr_1fr]">
            <span /><span>Hoy</span><span className="text-emerald-800">Con la propuesta</span>
          </div>
          <ul className="mt-1 divide-y divide-slate-100">
            {COMPARA.map(c => (
              <li key={c.t} className="grid gap-x-6 gap-y-1 py-3 text-[15px] leading-snug md:grid-cols-[28%_1fr_1fr]">
                <p className="font-semibold text-slate-900">{c.t}</p>
                <p className="text-slate-600"><span className="font-semibold text-rose-800 md:sr-only">Hoy: </span>{c.hoy}</p>
                <p className="text-slate-900"><span className="font-semibold text-emerald-800 md:sr-only">Con la propuesta: </span>{c.propuesta}</p>
              </li>
            ))}
          </ul>
        </div>
      </Apartado>

      <Apartado id="legal-licencias" titulo="Licencias: tres niveles, iguales en todas partes" fondo="blanco"
        entradilla="Toda actividad cae en uno de tres niveles según su riesgo. El nivel es el mismo en cualquier pueblo de España. Elige una actividad y compara.">
        <LegalLicencias />
      </Apartado>

      <Apartado id="legal-escalas" titulo="Qué hace cada escala"
        entradilla="La nación escribe la norma común, y a futuro Europa. El resto de escalas no escriben otra norma sobre lo mismo: ajustan dentro de márgenes, aplican y ayudan.">
        <ol className="grid gap-3">
          {ESCALAS.map(e => (
            <li key={e.id} className="grid gap-x-5 gap-y-1 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[180px_1fr_1fr]">
              <p className="flex items-center gap-2 font-bold text-slate-900"><Muestra color={e.color} />{e.nombre}</p>
              <p className="text-[15px] leading-relaxed text-slate-700">{PAPEL_ESCALA[e.id].hace}</p>
              <p className="text-[15px] leading-relaxed text-slate-500"><span className="font-semibold text-slate-700">Ejemplo: </span>{PAPEL_ESCALA[e.id].ejemplo}{e.id === 'continente' && <><F id="aire-ue" /><F id="eu-inc" /></>}</p>
            </li>
          ))}
        </ol>
      </Apartado>

      <Apartado id="legal-retos" titulo="Lo difícil, dicho claro" fondo="blanco"
        entradilla="Unificar choca con cómo está construido el país. Ya se ha intentado por partes, y los tribunales lo han frenado cuando el Estado se metía en lo que la Constitución da a otros.">
        <div className="grid gap-4 md:grid-cols-2">
          <Reto t="Los tribunales ya han frenado intentos parecidos">
            <p>En 2013 una ley quiso que un permiso dado en una comunidad valiera en toda España<F id="ley-lgum" />. En 2017 el Tribunal Constitucional lo anuló: una comunidad no tiene por qué aceptar las reglas de otra si no hay una norma común debajo<F id="stc-79-2017" />.</p>
            <p className="mt-2">En mayo de 2026 el Tribunal Supremo anuló el registro estatal único de pisos turísticos, porque esa materia es de las comunidades<F id="ts-registro" />.</p>
          </Reto>
          <Reto t="La lección: primero la norma común">
            <p>El Constitucional no dijo que unificar esté prohibido. Dijo que hace falta un estándar común. Por eso la propuesta empieza por ahí: con un mismo texto en todas partes, un permiso sí puede valer en todo el país.</p>
          </Reto>
          <Reto t="La autonomía de comunidades y municipios">
            <p>La Constitución reconoce a municipios, provincias y comunidades autonomía para gestionar lo suyo, y España ha firmado la Carta Europea de Autonomía Local<F id="carta-local" />. La propuesta no les quita la gestión: les quita escribir otra norma sobre lo mismo, y les deja ajustar dentro de márgenes.</p>
          </Reto>
          <Reto t="Perder lo que sí debe ser distinto">
            <p>No es igual el clima de Canarias que el del Pirineo, ni una calle de bares que una calle de casas. Por eso hay márgenes: el texto común dice qué se puede adaptar y hasta dónde. Si los márgenes son demasiado estrechos, la norma común no sirve; si son anchos, se vuelve a la situación de hoy.</p>
          </Reto>
        </div>

        <h3 className="mt-10 text-xl font-bold text-slate-900">Tres caminos, de menos a más</h3>
        <ol className="mt-4 grid gap-4 lg:grid-cols-3">
          <li className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Sin cambiar la Constitución</p>
            <p className="mt-1 font-bold text-slate-900">Leyes básicas más completas y acuerdos voluntarios</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">Donde el Estado ya puede fijar lo básico (igualdad, economía, medio ambiente), hacerlo con más detalle. Donde no, convenios entre comunidades. Pasa con la caza: 10 de las 17 comparten ya una licencia<F id="caza" />.</p>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Una ley de armonización</p>
            <p className="mt-1 font-bold text-slate-900">Principios comunes incluso en lo que es de las comunidades</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">La Constitución lo permite si el interés general lo pide y lo aprueba la mayoría absoluta de cada Cámara<F id="constitucion" />. La única que se aprobó, la LOAPA de 1982 (una ley orgánica que quería ordenar lo que podían hacer las comunidades), perdió ese carácter en el Constitucional, y no se ha vuelto a aprobar ninguna<F id="loapa" />.</p>
          </li>
          <li className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">Cambiar la Constitución</p>
            <p className="mt-1 font-bold text-slate-900">Mover ciertas materias a una norma común</p>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700">Por la vía ordinaria de reforma, cambiar el reparto de materias pide tres quintos del Congreso y del Senado, y un referéndum si lo pide una décima parte de una de las Cámaras<F id="constitucion" />. Habría que tocar también los estatutos de autonomía.</p>
          </li>
        </ol>

        <Mas titulo="lo que aún falta por decidir">
          <ul className="max-w-3xl list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-slate-700">
            <li>Qué es una «materia básica» y qué no. Ruido, aire, residuos, licencias y suelo, sí; ¿y la vivienda, la educación o el comercio?</li>
            <li>Cuánto margen tiene cada escala en cada materia, y quién lo revisa.</li>
            <li>Quién escribe la norma común. En el modelo, la nación lo haría con su asamblea ciudadana por sorteo junto al parlamento, y con voz de todas las escalas.</li>
            <li>La transición: durante unos años convivirían la norma nueva y las viejas. Hace falta un calendario y una tabla que diga qué norma vieja sustituye cada artículo nuevo.</li>
            <li>«Una entra, dos salen» no puede servir para quitar protecciones solo por cuadrar la cuenta. La Comisión Europea pone el mismo límite a su regla<F id="oioo-ue" />.</li>
          </ul>
          <Mas titulo="y en Europa">
            <p className="max-w-3xl text-[15px] leading-relaxed text-slate-700">
              Europa ya unifica algunas cosas, como los límites de calidad del aire, que los países deben aplicar antes de diciembre de 2026<F id="aire-ue" />. Y en marzo de 2026 la Comisión propuso «EU Inc»: una misma forma de empresa para los 27 países, que se crea en 48 horas por menos de 100 euros, frente a más de 60 formas distintas hoy<F id="eu-inc" />. Es voluntaria: convive con las nacionales. Puede ser un buen modelo para empezar: una norma común que se elige, antes de que sea obligatoria.
            </p>
          </Mas>
        </Mas>
      </Apartado>

      <Apartado id="legal-prueba" titulo="Ponte a prueba"
        entradilla="Diez preguntas, tres de ellas casos prácticos, para comprobar si se entiende lo esencial. Al responder verás por qué, y si fallas, qué parte repasar.">
        <LegalPrueba />
      </Apartado>

      <Apartado id="legal-fuentes" titulo="Fuentes" fondo="blanco">
        <ul className="grid max-w-4xl gap-2 text-sm">
          {FUENTES_LEGAL.map(f => (
            <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">{f.titulo}</a></li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-500">Consultadas en noviembre de 2026. Los niveles de licencia, los plazos, la caducidad de diez y cinco años y «una entra, dos salen» son propuestas, no leyes de hoy.</p>
      </Apartado>
    </>
  );
}

function Dato({ v, t }: { v: string; t: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-baseline gap-3">
      <dt className="text-right text-xl font-[800] tabular-nums tracking-tight text-rose-700">{v}</dt>
      <dd className="text-[15px] leading-snug text-slate-700">{t}</dd>
    </div>
  );
}

function Reto({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="font-bold text-slate-900">{t}</p>
      <div className="mt-2 text-[15px] leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

/** Challenges before the Constitutional Court between the State and the regions: a yearly average per period, and who brings them. */
function ConflictosGrafica() {
  const filas = IMPUGNACIONES.periodos.map(p => ({ ...p, media: p.total / p.anos }));
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Barras titulo="Choques entre el Estado y las comunidades llevados al Constitucional, al año"
        subtitulo="Media de cada periodo. Fueron muchos mientras se construían las comunidades, y desde entonces rondan los 30 al año"
        barras={filas.map((f, i) => ({
          etiqueta: f.t, valor: f.media, texto: `${numero(f.media, 0)} al año`, serie: i === 0 ? 'tinta' as const : 'gris' as const,
          nota: <>{numero(f.total)} en total en {f.anos} años{'derivado' in f && f.derivado ? ', calculado restando del total los periodos anteriores' : ''}.</>,
        }))}
        pie={<>Cuenta los recursos y conflictos de competencia que el Estado y las comunidades se presentan entre sí. El dato de 2010 a 2024 lo hemos calculado restando del total ({numero(IMPUGNACIONES.total)}) los periodos anteriores.<F id="mpt-conflictividad" /></>} />
      <Anillo titulo="Quién lleva al otro al Constitucional"
        subtitulo={`Los ${numero(IMPUGNACIONES.total)} choques de 1980 a 2024`}
        centro={numero(IMPUGNACIONES.total)} centroTexto="choques"
        partes={[
          { etiqueta: 'Las comunidades, contra el Estado', valor: IMPUGNACIONES.porCCAA, texto: numero(IMPUGNACIONES.porCCAA), serie: 'tinta' },
          { etiqueta: 'El Estado, contra las comunidades', valor: IMPUGNACIONES.porEstado, texto: numero(IMPUGNACIONES.porEstado), serie: 'gris' },
        ]}
        pie={<>Ministerio de Política Territorial<F id="mpt-conflictividad" /></>} />
    </div>
  );
}
