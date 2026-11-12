import { useEffect } from 'react';
import { ArrowDown, Building2, GraduationCap, HandCoins, Heart, Landmark, Lightbulb, Store } from 'lucide-react';
import SubproyectosSitio, { type GrupoSubproyectos } from '../components/sitio/SubproyectosSitio';
import FormularioColabora from '../components/sitio/FormularioColabora';
import Donacion from '../components/bloquesDatos/donacion/Lectura';
import { BarraSolSolidario, FILA_SOL_SOLIDARIO, LogoSolSolidario } from '../components/sitio/solSolidario/marca';
import { miniatura } from '../utils/miniatura';

// ============================================================================
// SOL SOLIDARIO (2026-11-12, Eugenio en luzhumanidad.com)
// ============================================================================
// «Crea el proyecto de Sol Solidario con su página web… añade todos los
// proyectos que tengan que ver con llevar energía solar a los colectivos más
// vulnerables que sufren la pobreza energética… saca pecho de las cifras…
// habla del problema de la pobreza energética en España y en el mundo… de las
// herramientas, las donaciones y los préstamos solidarios, y permite que la
// gente haga una donación o un préstamo solidario.»
//
// The page of the «Sol Solidario» row (`config.aplicacion = 'sol-solidario'`,
// migration 0202), under the site bar (SubpaginaSitio, CON_BARRA) and its own
// sub-menu (`BarraSolSolidario`). Its projects are the row's «subelementos»,
// with the same cards as the home page (`SubproyectosSitio`).
//
// EVERY FIGURE HAS A SOURCE: the projects' own pages (Light Humanity, Solar
// Crowd and the press they cite) and, for energy poverty, the INE and the
// Tracking SDG7 report. A figure that cannot be sourced does not go here.
//
// The bank accounts are `config.solSolidario.ibanDonaciones` and
// `ibanPrestamos` of the page: until they are filled in, the transfer boxes
// do not show and the loan form asks people to write instead.

type Config = { solSolidario?: { ibanDonaciones?: string; ibanPrestamos?: string; titular?: string } };

const PORTADA = '/uploads/2026/11/notas/19-luz-del-amazonas/8fb6ef153f07.jpg';

/** The projects, by where they are. Row ids of «Proyectos». */
const GRUPOS: GrupoSubproyectos[] = [
  { titulo: 'España: centros de acogida y barrios sin luz',
    texto: 'Placas solares para centros que acogen a personas sin hogar y migrantes, y para las familias de la Cañada Real que se quedaron sin electricidad.',
    ids: ['BDFNTQXJ0188QSIS', 'BDFNTQY7O0GRDO60', 'BDFMVE3WNNR65YX', 'BDFNTDOF56F159B6', 'BDFMVDU8V45HILF'] },
  { titulo: 'Latinoamérica: comunidades rurales sin electricidad',
    texto: 'Lámparas y sistemas solares para familias que se alumbraban con queroseno y velas en el Amazonas, La Guajira y Honduras.',
    ids: ['BDFNTVJGQ1NQ04D9', 'BDFNT9W2HZNFZW27', 'BDFNTXJQF1VH0BFF'] },
  { titulo: 'África: energía para hogares y cultivos',
    texto: 'Sistemas solares para hogares rurales de Kenia y riego solar para familias agricultoras de Mozambique.',
    ids: ['BDFNTUT0U667BPC1', 'BDFNTHIX1L0M795D'] },
  { titulo: 'Las herramientas',
    texto: 'La plataforma de préstamos colectivos y la tienda que regalaba una lámpara por cada una vendida.',
    ids: ['BDFNTSTY4XY5SH4B', 'BDFMVDU4N2KAWOC'] },
];

/** The big figures. `nota` says where each comes from. */
const CIFRAS = [
  { valor: '+30.000', texto: 'personas con luz solar', nota: 'Más de 20.000 apoyadas con préstamos en Kenia, Colombia, España y Honduras hasta junio de 2023 (Solar Crowd, en Energías Renovables) y más de 10.000 en el Amazonas brasileño (2021).' },
  { valor: '6', texto: 'países', nota: 'España, Brasil, Colombia, Honduras, Kenia y Mozambique.' },
  { valor: '2018', texto: 'el primer viaje', nota: 'Otoño de 2018: 40 lámparas solares para 40 familias de Breves, en el Amazonas.' },
  { valor: '+3.000', texto: 'familias del Amazonas', nota: 'Luz del Amazonas, enero de 2021.' },
  { valor: '100 %', texto: 'de los préstamos devueltos', nota: 'Según Solar Crowd, la plataforma de préstamos de Light Humanity.' },
  { valor: '3', texto: 'centros de acogida en España', nota: 'Hogar Lázaro (Madrid), Casa Zaqueo (Toledo) y La Casa Nueva (Sagunto).' },
];

/** Energy poverty, with its source. */
const POBREZA = {
  espana: [
    { valor: '15,9 %', texto: 'de la población no podía mantener su vivienda a una temperatura adecuada en 2025', fuente: 'INE, Encuesta de Condiciones de Vida 2025', url: 'https://ine.es/dyngs/Prensa/m1ECV2025.htm' },
    { valor: '×2', texto: 'desde 2019, cuando era el 7,6 %', fuente: 'EAPN España, El estado de la pobreza 2026', url: 'https://www.eapn.es/ARCHIVO/documentos/noticias/1770362299_el-estado-de-la-pobreza--avance-2026.pdf' },
    { valor: '800-1.200 €', texto: 'al mes pagaba de luz un centro de acogida de Toledo en 2022', fuente: 'Light Humanity, Centro Zaqueo Solar', url: null },
  ],
  mundo: [
    { valor: '666 millones', texto: 'de personas vivían sin electricidad en 2023', fuente: 'Tracking SDG7 2025 (Banco Mundial, AIE, IRENA, ONU, OMS)', url: 'https://www.worldbank.org/en/topic/energy/publication/tracking-sdg-7-the-energy-progress-report-2025' },
    { valor: '85 %', texto: 'de ellas, en el África subsahariana', fuente: 'Tracking SDG7 2025', url: 'https://www.worldbank.org/en/news/press-release/2025/06/25/energy-access-has-improved-yet-international-financial-support-still-needed-to-boost-progress-and-address-disparities' },
    { valor: '9 de cada 10', texto: 'familias ribereñas del Amazonas se alumbraban con queroseno', fuente: 'Light Humanity, Luz del Amazonas', url: null },
  ],
};

const HERRAMIENTAS = [
  { Icono: Heart, titulo: 'Donaciones', texto: 'Pagan lo que no se puede devolver: el primer viaje, los equipos para quien no tiene nada y la formación.' },
  { Icono: HandCoins, titulo: 'Préstamos solidarios', texto: 'Personas que prestan su dinero para que una familia, un centro o una empresa social instale energía solar, y lo recuperan con lo que ahorran en combustible y en facturas.' },
  { Icono: Store, titulo: 'Tienda solidaria', texto: 'Por cada lámpara solar vendida, otra para una familia sin electricidad: «1 para ti = 1 para una familia».' },
  { Icono: GraduationCap, titulo: 'Formación', texto: 'Vecinos formados como instaladores solares: la energía llega y además crea empleo en el barrio.' },
  { Icono: Building2, titulo: 'Socios locales', texto: 'Trabajamos con organizaciones que ya están en el terreno, como Soluz en Honduras, Rafode en Kenia o Tierra Grata en Colombia.' },
  { Icono: Lightbulb, titulo: 'Equipos que se pagan solos', texto: 'Lámparas y sistemas a plazos de pocos euros: la familia ahorra desde el primer mes lo que gastaba en queroseno.' },
];

function Cuenta({ titulo, iban, titular }: { titulo: string; iban: string; titular?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Landmark className="h-4 w-4" /> {titulo}</p>
      <p className="mt-2 select-all font-mono text-base font-bold tracking-wide text-slate-900 sm:text-lg">{iban}</p>
      {titular && <p className="mt-1 text-[13px] text-slate-500">Titular: {titular}</p>}
    </div>
  );
}

export default function SolSolidario({ raizId, paginaId, config }: { raizId: string | null; paginaId: string; config: Config }) {
  const cuentas = config.solSolidario || {};
  const titular = cuentas.titular || 'Asociación Light for Humanity';
  // The sub-menu links are `#sección`: on arrival with a hash (from a project page), go there once the page is drawn.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (!h) return;
    const t = window.setTimeout(() => document.getElementById(h)?.scrollIntoView({ block: 'start' }), 600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div data-sol-solidario className="pb-16">
      <BarraSolSolidario enPortada />

      {/* PORTADA: the child lit by a kerosene lamp, the problem at a glance. */}
      <header id="inicio" data-fondo-oscuro className="relative isolate overflow-hidden bg-slate-950" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
        <img src={miniatura(PORTADA, 1600)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] opacity-80" fetchPriority="high" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        <div className="mx-auto max-w-[1840px] px-5 py-20 sm:px-10 sm:py-28 lg:py-36">
          <div className="max-w-2xl text-white">
            <div className="flex items-center gap-3">
              <LogoSolSolidario className="h-14 w-14 sm:h-16 sm:w-16" corazon="#0f172a" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Light for Humanity</p>
            </div>
            <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-7xl">Sol Solidario</h1>
            <p className="mt-4 text-2xl font-bold leading-snug text-white sm:text-3xl">Energía solar para quien más la necesita.</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
              Desde 2018 llevamos luz a familias, centros de acogida y comunidades que sufren la pobreza energética, en España, en Latinoamérica y en África.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#dona" className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-400 px-6 text-base font-black text-slate-950 hover:bg-amber-300">
                <Heart className="h-5 w-5" fill="currentColor" /> Dona
              </a>
              <a href="#presta" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/60 px-6 text-base font-black text-white hover:bg-white/10">
                <HandCoins className="h-5 w-5" /> Haz un préstamo solidario
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1840px] px-4 sm:px-8">
        {/* IMPACTO */}
        <section id="impacto" className="scroll-mt-40 pt-16 sm:pt-24">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Impacto</p>
          <h2 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">Decenas de miles de personas que ya no viven a oscuras.</h2>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-3">
            {CIFRAS.map(c => (
              <div key={c.texto} className="border-t-4 border-amber-400 pt-4">
                <dd className="text-5xl font-black tabular-nums tracking-tight text-slate-900 sm:text-6xl">{c.valor}</dd>
                <dt className="mt-1 text-lg font-bold text-slate-800">{c.texto}</dt>
                <dd className="mt-2 text-[13px] leading-snug text-slate-500">{c.nota}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* PROYECTOS: the same cards as the home page, by region. */}
        <div id="proyectos" className="scroll-mt-40 pt-16 sm:pt-24">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Proyectos</p>
          {raizId
            ? <SubproyectosSitio filaId={FILA_SOL_SOLIDARIO} tablaId="BDTMUOOFFNGJIEG" sistemasId="BDTMUO8UV0QOPLO" titulo="Dónde hemos llevado el sol" grupos={GRUPOS} />
            : null}
        </div>

        {/* POBREZA ENERGÉTICA */}
        <section id="pobreza" className="scroll-mt-40 pt-16 sm:pt-24">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">El problema</p>
          <h2 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">La pobreza energética: cuando la luz es un lujo.</h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">
            Es no poder pagar la luz ni la calefacción, o no tener electricidad en absoluto. En España se nota en las facturas de las familias y de los centros que acogen a quien no tiene casa. En el mundo, en cientos de millones de hogares que se alumbran con queroseno y velas, con humo que enferma y un gasto que no se acaba.
          </p>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {([['En España', POBREZA.espana], ['En el mundo', POBREZA.mundo]] as const).map(([titulo, datos]) => (
              <div key={titulo} className="rounded-3xl bg-slate-50 p-6 sm:p-8">
                <h3 className="text-2xl font-black text-slate-900">{titulo}</h3>
                <ul className="mt-6 space-y-6">
                  {datos.map(d => (
                    <li key={d.valor}>
                      <p className="text-4xl font-black tabular-nums tracking-tight text-slate-900">{d.valor}</p>
                      <p className="mt-1 text-base font-semibold text-slate-700">{d.texto}</p>
                      <p className="mt-1 text-[12px] text-slate-500">Fuente: {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-800">{d.fuente}</a> : d.fuente}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* HERRAMIENTAS */}
        <section id="herramientas" className="scroll-mt-40 pt-16 sm:pt-24">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Cómo lo hacemos</p>
          <h2 className="mt-2 max-w-4xl text-3xl font-black tracking-tight text-slate-900 sm:text-5xl">Donar está bien. Que el dinero vuelva y vuelva a dar luz, mejor.</h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {HERRAMIENTAS.map(({ Icono, titulo, texto }) => (
              <li key={titulo} className="rounded-3xl border border-slate-200 bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400 text-slate-950"><Icono className="h-5 w-5" /></span>
                <h3 className="mt-4 text-xl font-black text-slate-900">{titulo}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* DONA Y PRESTA */}
        <div className="grid gap-8 pt-16 sm:pt-24 lg:grid-cols-2">
          <section id="dona" className="min-w-0 scroll-mt-40 rounded-3xl bg-slate-50 p-4 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Dona</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Enciende una luz.</h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">Una vez o cada mes, con tarjeta. Tu donación paga equipos solares para quien no puede pagarlos.</p>
            <Donacion bloque={{ id: 'sol-dona', tipo: 'donacion' } as any} paginaId={paginaId}
              datos={{ frecuencia: 'mes', importes: [20, 50, 100, 250, 500], importesMes: [10, 20, 30, 50, 100], importeMes: 20, importeUnaVez: 50 }} />
            {cuentas.ibanDonaciones && <Cuenta titulo="O por transferencia" iban={cuentas.ibanDonaciones} titular={titular} />}
          </section>

          <section id="presta" className="min-w-0 scroll-mt-40 rounded-3xl bg-slate-950 p-5 text-white sm:p-8" data-fondo-oscuro>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Préstamo solidario</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Presta tu dinero. Te lo devolvemos y deja luz.</h2>
            <p className="mt-3 text-base leading-relaxed text-white/80">Tu préstamo financia instalaciones solares para familias y centros en pobreza energética. Cada año recuperas una parte, sin intereses, y el dinero vuelve a trabajar en otro proyecto.</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[['7 años', 'de plazo'], ['Anual', 'la devolución'], ['0 %', 'de interés'], ['1.000 €', 'como mínimo']].map(([v, t]) => (
                <div key={t} className="rounded-2xl bg-white/10 p-3">
                  <dd className="text-2xl font-black tabular-nums text-amber-300">{v}</dd>
                  <dt className="text-[13px] font-semibold text-white/80">{t}</dt>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-white/70">Por ejemplo: prestas 1.000 € y recibes unos 142,86 € al año durante 7 años.</p>
            {cuentas.ibanPrestamos && <div className="mt-5 text-slate-900"><Cuenta titulo="Cuenta para los préstamos" iban={cuentas.ibanPrestamos} titular={titular} /></div>}
            <a href="#formulario-prestamo" className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-amber-400 px-6 text-base font-black text-slate-950 hover:bg-amber-300">
              Quiero prestar <ArrowDown className="h-5 w-5" />
            </a>
          </section>
        </div>

        {raizId && (
          <div id="formulario-prestamo" className="mx-auto max-w-3xl scroll-mt-40 pt-16">
            <FormularioColabora raizId={raizId} motivo="prestamo" proyecto="sol-solidario"
              titulo="Quiero hacer un préstamo solidario"
              entradilla={<p>Dinos tu nombre, tu correo y cuánto quieres prestar (desde 1.000 €). Te enviamos el contrato del préstamo{cuentas.ibanPrestamos ? '' : ' y el número de cuenta'} para que puedas hacer la transferencia.</p>} />
          </div>
        )}
      </div>
    </div>
  );
}
