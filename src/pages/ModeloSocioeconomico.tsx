// ============================================================================
// MODELO SOCIOECONÓMICO OPTIMIZADO (2026-11-10, Eugenio)
// ============================================================================
// One tax of 20 % on every payment (a purchase or a wage), nothing else,
// collected by the payment system itself and split in equal parts (2,5 %)
// among eight scales: person, neighbourhood or family, municipality, province,
// region, nation, continent and planet. Each scale has a citizens' assembly that
// chooses priorities and a technical committee that carries them out.
//
// The page: the rings (hero), how it works, the 2D scheme of where the money
// goes, the matrix scale × area, a worked example (a person in a village of 400
// in Madrid), today's Spanish system next to the model, who decides, the
// country's accounts and what is still to be solved. Every number comes from
// `src/data/modeloSocioeconomico.ts`.
//
// TWO HOMES, ONE COMPONENT, like the consciousness map: humanity.wiki/modelo-
// socioeconomico (App.tsx) and a project page of luzhumanidad.com whose
// `config.aplicacion` is 'modelo-socioeconomico' (SubpaginaSitio.tsx, migration
// 0184). `enSitio` is set in the second case.
//
// PÁGINA PROPIA: outside the platform Layout, like /conciencia.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquarePlus, Pause, Play } from 'lucide-react';
import '@fontsource-variable/public-sans';
import {
  ESCALA, ESCALAS, TIPO, PARTE_ESCALA, TOTAL_FIGURAS, EJEMPLO_INICIAL, type EscalaId, type Modo, type Ejemplo,
  cuentasPais, principales, euros, millones, porcentaje, MATRIZ,
} from '../data/modeloSocioeconomico';
import { AnillosEscalas } from '../components/modeloSocioeconomico/AnillosEscalas';
import { EsquemaFlujos, EsquemaVertical } from '../components/modeloSocioeconomico/EsquemaFlujos';
import { MatrizAmbitos } from '../components/modeloSocioeconomico/MatrizAmbitos';
import { TuCaso } from '../components/modeloSocioeconomico/TuCaso';
import { Piezas, Costes, Tabla, DondeEstaElDinero, GanaYPierde } from '../components/modeloSocioeconomico/Comparativa';
import { PreguntasCobro } from '../components/modeloSocioeconomico/PreguntasCobro';
import { QuienDecide } from '../components/modeloSocioeconomico/QuienDecide';
import { LasCuentas, Retos, ListaFuentes } from '../components/modeloSocioeconomico/Cuentas';
import { BuzonProyecto } from '../components/modeloSocioeconomico/BuzonProyecto';
import { Boton, Encabezado, Muestra, Segmentado } from '../components/modeloSocioeconomico/piezas';

const SECCIONES = [
  { id: 'como-funciona', t: 'Cómo funciona' },
  { id: 'esquema', t: 'Esquema' },
  { id: 'matriz', t: 'Quién hace qué' },
  { id: 'ejemplo', t: 'Un caso' },
  { id: 'hoy', t: 'Frente a hoy' },
  { id: 'decide', t: 'Quién decide' },
  { id: 'cuentas', t: 'Cuentas' },
  { id: 'retos', t: 'Lo que falta' },
  { id: 'fuentes', t: 'Fuentes' },
];

const LECTURA_CORTA: Record<Modo, string> = { eslabon: 'Sin cascada entre empresas', literal: 'Al pie de la letra' };

export default function ModeloSocioeconomico({ enSitio }: { enSitio?: { inicio: string } } = {}) {
  const [modo, setModo] = useState<Modo>('eslabon');
  const [anillo, setAnillo] = useState<EscalaId | null>(null);
  const [nivel, setNivel] = useState<EscalaId | null>(null);
  const [mover, setMover] = useState(true);
  const [ejemplo, setEjemplo] = useState<Ejemplo>(EJEMPLO_INICIAL);
  const [verBuzon, setVerBuzon] = useState(false);
  const pais = cuentasPais(modo);

  useEffect(() => {
    const titulo = document.title;
    document.title = 'Modelo socioeconómico optimizado · Un solo impuesto del 20 % en ocho escalas · Luz & Humanidad';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const anterior = meta?.content;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Un único impuesto del 20 % sobre cada pago, que el sistema de pago reparte al instante entre ocho escalas (persona, comunidad vecinal, municipio, provincia, región, nación, continente y planeta), comparado con el sistema fiscal español actual.';
    return () => { document.title = titulo; if (meta) meta.content = anterior ?? ''; };
  }, []);

  const inicioLuz = enSitio ? enSitio.inicio : 'https://luzhumanidad.com';
  const marca = enSitio
    ? <Link to={inicioLuz} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</Link>
    : <a href={inicioLuz} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</a>;

  const sel = anillo ? ESCALA[anillo] : null;
  const selNivel = nivel ? ESCALA[nivel] : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 antialiased" style={{ fontFamily: '"Public Sans Variable", ui-sans-serif, system-ui, sans-serif' }}>
      {/* ── Top band: what this is, who makes it, where to go, the mailbox ── */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
          <a href="#inicio" className="min-w-0 leading-tight">
            <span className="block text-[15px] font-bold tracking-tight">Modelo socioeconómico optimizado</span>
            <span className="block text-xs text-slate-500">Un proyecto de {marca}</span>
          </a>
          <nav aria-label="Secciones" className="ml-auto hidden min-w-0 gap-0.5 text-[13px] min-[1400px]:flex">
            {SECCIONES.map(s => (
              <a key={s.id} href={`#${s.id}`} className="whitespace-nowrap rounded-full px-2 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">{s.t}</a>
            ))}
          </nav>
          <Boton onClick={() => setVerBuzon(true)} className="ml-auto shrink-0 min-[1400px]:ml-0">
            <MessageSquarePlus className="h-4 w-4" /><span className="sm:hidden">Proponer</span><span className="hidden sm:inline">Proponer una mejora</span>
          </Boton>
        </div>
        {/* Phones: the list scrolls sideways; the fade on the right says there is more. */}
        <div className="relative border-t border-slate-100 min-[1400px]:hidden">
          <nav aria-label="Secciones" className="flex gap-1 overflow-x-auto px-3 py-1.5 pr-10 text-[13px] [scrollbar-width:none]">
            {SECCIONES.map(s => (
              <a key={s.id} href={`#${s.id}`} className="whitespace-nowrap rounded-full px-2.5 py-1 text-slate-600 hover:bg-slate-100">{s.t}</a>
            ))}
          </nav>
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent" />
        </div>
      </header>

      <main>
        {/* ── Hero: the rings ── */}
        <section id="inicio" className="mx-auto grid max-w-7xl scroll-mt-28 items-center gap-10 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:pt-14">
          <div>
            <h1 className="text-[2.35rem] font-[800] leading-[1.02] tracking-[-0.035em] sm:text-[3.4rem]">Modelo socioeconómico optimizado</h1>
            <p className="mt-6 max-w-[34ch] text-[1.45rem] font-medium leading-snug tracking-[-0.01em] text-slate-800 sm:text-[1.65rem]">
              Un único impuesto del {porcentaje(TIPO * 100, 0)} sobre cada pago, repartido al instante entre las ocho escalas en las que vivimos:
              {' '}{porcentaje(PARTE_ESCALA * 100)} para cada una, de la persona al planeta.
            </p>
            <p className="mt-5 max-w-[62ch] text-[17px] leading-relaxed text-slate-600">
              Hoy en España conviven {TOTAL_FIGURAS} impuestos y cotizaciones distintos, cientos de tasas y las cuotas de comunidad.
              Con este modelo nadie declara nada: el sistema de pago aparta el {porcentaje(TIPO * 100, 0)} de cada compra y de cada sueldo,
              el dinero llega solo a cada escala, y en cada escala una asamblea ciudadana decide en qué se invierte.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#esquema" className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Ver adónde va el dinero</a>
              <a href="#ejemplo" className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">Calcular un caso</a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[600px]">
            <AnillosEscalas activa={anillo} onActiva={setAnillo} className="w-full" />
            <div aria-live="polite" className="mx-auto mt-5 min-h-[132px] max-w-[460px] text-center text-[15px] leading-relaxed">
              {sel ? (
                <>
                  <p className="flex items-center justify-center gap-2 font-bold text-slate-900"><Muestra color={sel.color} className="h-3.5 w-3.5" />{sel.nombre}</p>
                  <p className="mt-1 text-slate-700">{sel.recibe}.</p>
                  <p className="mt-2 text-slate-700">{sel.devuelve}.</p>
                  <p className="mt-3 text-sm text-slate-500">
                    {porcentaje(PARTE_ESCALA * 100)} de cada pago: {euros(pais.porPersonaEscala)} por habitante y año
                    {sel.id !== 'persona' && <>; en España, {millones(pais.porEscala)}</>}.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-900">Ocho escalas, una dentro de otra</p>
                  <p className="mt-1 text-slate-700">Toca un anillo para ver quién recibe su parte y qué devuelve.</p>
                  <p className="mt-3 text-sm text-slate-500">
                    Los anillos muestran qué escala está dentro de cuál, no cuánto recibe: cada una recibe {euros(pais.porPersonaEscala)} por habitante y año.
                    En Europa y el planeta, es lo que aporta España por cada habitante.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── How it works: a real sequence ── */}
        <section id="como-funciona" aria-labelledby="como-funciona-titulo" className="scroll-mt-28 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <Encabezado id="como-funciona" titulo="Cómo funciona, con un pan de 2 €">
              Lo mismo vale para un sueldo, un alquiler o una casa: de cada pago, el {porcentaje(TIPO * 100, 0)} va al fondo común y se reparte entre las ocho escalas.
            </Encabezado>
            <ol className="grid gap-8 md:grid-cols-4">
              {[
                { t: 'Pagas', d: 'Compras un pan de 2,00\u00A0€ con tarjeta, Bizum o el móvil. El precio ya lleva el impuesto dentro, como hoy el IVA.' },
                { t: 'Se aparta el 20\u00A0%', d: `En el mismo instante, el sistema de pago separa 0,40\u00A0€. La panadería recibe 1,60\u00A0€.` },
                { t: 'Se reparte', d: `Los 0,40\u00A0€ se dividen en ocho partes de 0,05\u00A0€, una por escala. Se juntan con las de todos los pagos y cada escala recibe lo mismo por habitante: tu parte personal es un dividendo igual para todo el mundo.` },
                { t: 'Cada escala decide', d: 'Su asamblea ciudadana elige las prioridades y su comité técnico las cumple al menor coste, de la forma más eficaz y ecológica.' },
              ].map((p, i) => (
                <li key={p.t}>
                  <span className="text-5xl font-[800] tabular-nums tracking-tight text-slate-200">{i + 1}</span>
                  <h3 className="mt-1 text-lg font-bold">{p.t}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-slate-600">{p.d}</p>
                </li>
              ))}
            </ol>
            {/* The 0,05 € coins: the split, drawn */}
            <p className="mt-10 text-sm font-semibold text-slate-700">Los 0,40 € del pan, en ocho monedas de 5 céntimos:</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ESCALAS.map(e => (
                <span key={e.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 text-sm">
                  <span className="grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold tabular-nums" style={{ backgroundColor: e.color, color: e.tinta }}>5 c</span>
                  {e.corto}
                </span>
              ))}
            </div>

            <PreguntasCobro modo={modo} />

            {/* The one decision that changes every figure below. */}
            <div className="mt-12 rounded-2xl border border-slate-300 bg-slate-50 p-5 sm:p-6">
              <h3 className="text-lg font-bold">Una decisión antes de seguir: ¿pagan también las compras entre empresas?</h3>
              <p className="mt-1 max-w-3xl text-[15px] leading-relaxed text-slate-600">
                La panadería compra harina al molino. Si esa compra también deja su {porcentaje(TIPO * 100, 0)}, el impuesto se suma en cada eslabón de la cadena.
                «Todas las transacciones» admite dos lecturas, y todas las cifras de la página cambian con la que elijas.
              </p>
              <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-900">{LECTURA_CORTA.eslabon}</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-600">
                    La empresa paga el {porcentaje(TIPO * 100, 0)} al comprar y lo recupera al vender, como hoy el IVA. Cada producto lleva un {porcentaje(TIPO * 100, 0)} exacto.
                    Recauda ≈ {porcentaje(cuentasPais('eslabon').pctPIB, 0)} del PIB. Es la lectura por defecto.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">{LECTURA_CORTA.literal}</dt>
                  <dd className="mt-0.5 leading-relaxed text-slate-600">
                    Cada pago entre empresas deja también su {porcentaje(TIPO * 100, 0)}, sin devolución. Recauda ≈ {porcentaje(cuentasPais('literal').pctPIB, 0)} del PIB,
                    pero los productos con más intermediarios salen más caros.
                  </dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <Segmentado<Modo> etiqueta="Lectura del modelo" valor={modo} onChange={setModo}
                  opciones={[{ id: 'eslabon', texto: LECTURA_CORTA.eslabon }, { id: 'literal', texto: LECTURA_CORTA.literal }]} />
                <a href="#cuentas" className="text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Ver las cuentas de las dos</a>
              </div>
            </div>
          </div>
        </section>

        {/* ── The 2D scheme ── */}
        <section id="esquema" aria-labelledby="esquema-titulo" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-6">
          <Encabezado id="esquema" titulo="El esquema completo: adónde va el dinero">
            El camino de cada euro, desde el pago hasta lo que vuelve a las personas, y cómo ellas deciden. Pasa o toca una escala para seguir su parte.
          </Encabezado>
          <div className="mb-3 hidden justify-end md:flex">
            <Boton onClick={() => setMover(v => !v)} aria-pressed={!mover}>
              {mover ? <><Pause className="h-4 w-4" /> Detener el movimiento</> : <><Play className="h-4 w-4" /> Ver el dinero moverse</>}
            </Boton>
          </div>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 sm:p-5 md:block">
            <EsquemaFlujos modo={modo} activa={nivel} onActiva={setNivel} mover={mover} />
          </div>
          <div className="md:hidden"><EsquemaVertical modo={modo} activa={nivel} onActiva={setNivel} /></div>
          <div aria-live="polite" className="mt-4 min-h-[88px] rounded-2xl border border-slate-200 bg-white p-5 text-[15px]">
            {selNivel ? (
              <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
                <div>
                  <p className="flex items-center gap-2 font-bold"><Muestra color={selNivel.color} />{selNivel.nombre}</p>
                  <p className="mt-1 text-slate-700">{selNivel.recibe}.</p>
                </div>
                <div className="text-slate-700">
                  {selNivel.id === 'persona'
                    ? <>Recibe {euros(pais.porPersonaEscala)} al año, unos {euros(pais.porPersonaEscala / 12)} al mes, y decide libremente en qué gastarlo.</>
                    : <>Sus mayores partidas: {principales(selNivel.id).map(a => `${a.nombre.toLowerCase()} (${MATRIZ[selNivel.id][a.id].peso}\u00A0%)`).join(', ')}.</>}
                </div>
              </div>
            ) : (
              <p className="text-slate-600">
                En España, los pagos que llevan el impuesto (la base: sueldos, compras de las familias y vivienda{modo === 'literal' ? ', compras entre empresas e inversión' : ''}) suman al año {millones(pais.base)};
                su {porcentaje(TIPO * 100, 0)} son {millones(pais.recaudacion)}, y cada escala recibe {millones(pais.porEscala)}.
                Lectura usada: «{LECTURA_CORTA[modo].toLowerCase()}».
              </p>
            )}
          </div>
        </section>

        {/* ── The matrix ── */}
        <section id="matriz" aria-labelledby="matriz-titulo" className="scroll-mt-28 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <Encabezado id="matriz" titulo="Quién se ocupa de qué, y en qué se invierte">
              Ocho escalas por quince ámbitos. Cada escala hace solo lo que no puede hacerse mejor más cerca: el desfibrilador del portal, el agua del pueblo,
              los bomberos de la comarca, el hospital de la región, las pensiones del país, el tren entre países y el clima del planeta.
            </Encabezado>
            <MatrizAmbitos modo={modo} />
          </div>
        </section>

        {/* ── The worked example ── */}
        <section id="ejemplo" aria-labelledby="ejemplo-titulo" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-6">
          <Encabezado id="ejemplo" titulo="Una persona de un pueblo de 400 habitantes">
            Vive con su pareja en un pueblo de la Sierra Norte de Madrid, en la Comunidad de Madrid, en España, en Europa, en la Tierra.
            Cuánto dinero maneja al día, al mes y al año, cuánto aporta a cada escala y qué cambia respecto a hoy. Mueve los mandos para ver otro caso.
          </Encabezado>
          <TuCaso modo={modo} ejemplo={ejemplo} onEjemplo={setEjemplo} />
        </section>

        {/* ── Today vs the model ── */}
        <section id="hoy" aria-labelledby="hoy-titulo" className="scroll-mt-28 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl space-y-12 px-4 py-16 sm:px-6">
            <Encabezado id="hoy" titulo="El sistema de hoy y el modelo, frente a frente">
              Hoy cada administración cobra sus propios impuestos y tasas, con sus reglas y sus plazos, y después el dinero se redistribuye entre ellas.
              El modelo lo sustituye por un único cobro automático que ya llega repartido.
            </Encabezado>
            <Piezas />
            <div>
              <h3 className="mb-5 text-xl font-bold">Lo que cuesta cumplir hoy</h3>
              <Costes />
            </div>
            <Tabla modo={modo} />
            <DondeEstaElDinero modo={modo} />
            <GanaYPierde modo={modo} />
          </div>
        </section>

        {/* ── Who decides ── */}
        <section id="decide" aria-labelledby="decide-titulo" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-6">
          <Encabezado id="decide" titulo="Quién decide en cada escala">
            En cada escala, una asamblea ciudadana elige las prioridades políticas y un comité técnico decide cómo cumplirlas al menor coste,
            de la forma más eficaz y más ecológica. Las cuentas abiertas cierran el círculo.
          </Encabezado>
          <QuienDecide />
        </section>

        {/* ── The accounts ── */}
        <section id="cuentas" aria-labelledby="cuentas-titulo" className="scroll-mt-28 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <Encabezado id="cuentas" titulo="Las cuentas del país">
              Cuánto daría el modelo en España con los datos de 2025, según cómo se entienda «todas las transacciones». Elige la lectura: todas las cifras de la página cambian con ella.
            </Encabezado>
            <LasCuentas modo={modo} onModo={setModo} />
          </div>
        </section>

        {/* ── Open problems ── */}
        <section id="retos" aria-labelledby="retos-titulo" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16 sm:px-6">
          <Encabezado id="retos" titulo="Lo que falta por resolver">
            Un modelo que esconde lo que aún no cuadra no ayuda a mejorarlo. Estas son las preguntas abiertas, con las cifras de la lectura elegida.
          </Encabezado>
          <Retos modo={modo} />
          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <div>
              <h3 className="text-xl font-bold">¿Cómo lo mejorarías?</h3>
              <p className="mt-1 max-w-2xl text-slate-300">Cada propuesta se revisa y, si mejora el modelo, se aplica a esta página.</p>
            </div>
            <Boton onClick={() => setVerBuzon(true)} className="border-white bg-white text-slate-900 hover:bg-slate-100">
              <MessageSquarePlus className="h-4 w-4" /> Proponer una mejora
            </Boton>
          </div>
        </section>

        <section id="fuentes" aria-labelledby="fuentes-titulo" className="scroll-mt-28 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
            <h2 id="fuentes-titulo" className="text-xl font-bold">Fuentes y método</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Las cifras de España salen de las fuentes oficiales enlazadas. Donde no hay un dato oficial exacto, la página dice que es una estimación y cómo se ha hecho.
              Los cálculos del sistema actual son orientativos y no incluyen deducciones personales.
              Los años no son todos el mismo: el gasto por administraciones y por funciones es de 2024 (el último cerrado), la recaudación y la base de 2025, y las reglas del IRPF y las cotizaciones del caso, de 2026.
            </p>
            <div className="mt-5"><ListaFuentes /></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        Modelo socioeconómico optimizado. Un proyecto de {marca}.
      </footer>

      {verBuzon && (
        <BuzonProyecto
          proyecto="modelo-socioeconomico"
          titulo="Proponer una mejora al modelo"
          invitacion="¿Falta algo, sobra algo o se puede explicar mejor? Escríbelo: cada propuesta se revisa y se aplica a la página."
          ejemplo="Por ejemplo: «La escala provincial debería encargarse también de…»"
          onCerrar={() => setVerBuzon(false)}
        />
      )}
    </div>
  );
}
