import { useEffect, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { VisualDemocracia, VisualEconomia, VisualGeometria, VisualObservatorio, VisualOrganica, VisualPerfiles } from '../components/politica/VisualesHerramientas';

// ============================================================================
// POLÍTICA: LAS HERRAMIENTAS, EN TARJETAS (2026-11-24, Eugenio)
// ============================================================================
// «En la URL de política tienen que aparecer todas las herramientas que estamos
// desarrollando de política, pero solo como tarjetas que si pinchas te lleva a
// esa URL… quitar los menús de arriba… Tenemos 5 herramientas en total. Haz una
// tarjeta por cada una de ellas, una URL por cada una de ellas.»
// And then: «añadiendo una visualización mucho más sofisticada en cada tarjeta de
// lo que hay dentro» — each card draws its tool's own content
// (src/components/politica/VisualesHerramientas.tsx).
//
// `/politica` (page `KWMOBSPOLARIZ01`, `config.aplicacion` = 'politica-herramientas')
// used to frame the whole observatory document. Now it is only this list:
//
//   observatorio-de-polarizacion  the document, view «observatorio» (migration 0235)
//   perfiles-politicos            the document, view «perfiles» (0235)
//   geometria-politica            the document, view «geometria» (0229)
//   democracia-directa            the document, view «decidir» (0235)
//   economia-publica-optimizada   the socioeconomic model renamed (0237). Eugenio wants this card to
//                                 open humanity.wiki/economia-publica-optimizada, so it always goes there.
//   democracia-organica           the sixth (2026-11-28, «en /politica este sexto bloque»): the study framed
//                                 (DemocraciaOrganica.tsx, migration 0251).
//
// The page's blocks link the five pages as subpages: that is what makes them hang
// from /politica for the server, the sitemap and the HTML that search engines read.
// These cards are what a person sees. The two lists must match: a sixth tool needs
// a block in the page and an entry here.
//
// `inicio` is '/' on luzhumanidad.com and 'https://luzhumanidad.com' anywhere else
// (humanity.wiki/politica): the tools are pages of that site, so links go there.

type Herramienta = {
  /** The address on luzhumanidad.com, or a full URL when the card must open somewhere else. */
  destino: string;
  titulo: string;
  texto: string;
  Visual: ComponentType;
  /** Tailwind classes for the picture's background and the card's hover border. */
  acento: { fondo: string; borde: string };
  /** Width on large screens: three cards per row (two rows since the sixth tool, 2026-11-28). */
  ancho: string;
};

const MODELO = 'https://humanity.wiki/economia-publica-optimizada';

export const HERRAMIENTAS_POLITICA: Herramienta[] = [
  {
    destino: 'observatorio-de-polarizacion', titulo: 'Observatorio de polarización', Visual: VisualObservatorio,
    texto: 'Cómo está dividida España: el barómetro del CIS, cien años de historia, cómo mira cada bando y cómo se pasa del desacuerdo al enemigo.',
    acento: { fondo: 'bg-gradient-to-br from-rose-50 via-white to-indigo-50', borde: 'hover:border-rose-300' }, ancho: 'lg:col-span-2',
  },
  {
    destino: 'perfiles-politicos', titulo: 'Perfiles políticos', Visual: VisualPerfiles,
    texto: 'Doce perfiles, de la extrema izquierda a la extrema derecha: su psicología, su relato, sus contradicciones, cómo se miran y cómo se llaman unos a otros.',
    acento: { fondo: 'bg-gradient-to-br from-amber-50 via-white to-violet-50', borde: 'hover:border-violet-300' }, ancho: 'lg:col-span-2',
  },
  {
    destino: 'geometria-politica', titulo: 'Geometría política', Visual: VisualGeometria,
    texto: 'Cada partido como una figura en diez temas: qué cuida y qué deja fuera frente a un círculo ideal. Compara partidos, haz el test y dibuja la tuya.',
    acento: { fondo: 'bg-gradient-to-br from-sky-50 via-white to-amber-50', borde: 'hover:border-amber-300' }, ancho: 'lg:col-span-2',
  },
  {
    destino: 'democracia-directa', titulo: 'Democracia directa', Visual: VisualDemocracia,
    texto: 'Votar cosas concretas, no colores: ver el estado de cada tema con sus datos y decidir cuánto subir, bajar, abrir o cerrar.',
    acento: { fondo: 'bg-gradient-to-br from-emerald-50 via-white to-sky-50', borde: 'hover:border-emerald-300' }, ancho: 'lg:col-span-2',
  },
  {
    destino: MODELO, titulo: 'Economía pública optimizada', Visual: VisualEconomia,
    texto: 'Un solo impuesto repartido entre ocho escalas, de la persona al planeta: recaudación, pensiones, presupuestos, deuda y servicios, comparados con la España de hoy.',
    acento: { fondo: 'bg-gradient-to-br from-yellow-50 via-white to-teal-50', borde: 'hover:border-teal-300' }, ancho: 'lg:col-span-2',
  },
  {
    destino: 'democracia-organica', titulo: 'Democracia orgánica moderna', Visual: VisualOrganica,
    texto: 'Todos votan lo común; cada oficio regula lo suyo con sus tecnócratas, consulta pública y el voto de sus profesionales. Justicia, seguridad y medios, sin mando de partido.',
    acento: { fondo: 'bg-gradient-to-br from-violet-50 via-white to-amber-50', borde: 'hover:border-violet-300' }, ancho: 'lg:col-span-2',
  },
];

export default function PoliticaHerramientas({ inicio }: { inicio: string }) {
  const enSitio = inicio === '/';
  const raiz = enSitio ? '' : inicio.replace(/\/$/, '');

  useEffect(() => {
    const titulo = document.title;
    document.title = 'Política · Luz & Humanidad';
    return () => { document.title = titulo; };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Política</h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-600">
          Herramientas para entender la política en España y decidir mejor. Cada una tiene su propia página.
        </p>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {HERRAMIENTAS_POLITICA.map(h => {
            const externo = /^https?:/.test(h.destino);
            const destino = externo ? h.destino : `${raiz}/${h.destino}`;
            const cuerpo = (
              <>
                <span className={cn('block h-48 overflow-hidden border-b border-slate-100', h.acento.fondo)}>
                  <h.Visual />
                </span>
                <span className="flex flex-1 flex-col p-6">
                  <span className="block text-xl font-bold text-slate-900">{h.titulo}</span>
                  <span className="mt-2 block flex-1 text-[15px] leading-relaxed text-slate-600">{h.texto}</span>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    Abrir <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </>
            );
            const clases = cn('group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition',
              'hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
              h.acento.borde);
            return (
              <li key={h.destino} className={cn('sm:col-span-1', h.ancho)}>
                {enSitio && !externo
                  ? <Link to={destino} className={clases}>{cuerpo}</Link>
                  : <a href={destino} className={clases}>{cuerpo}</a>}
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        Herramienta educativa sin afiliación política. Un proyecto de{' '}
        {enSitio
          ? <Link to="/" className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</Link>
          : <a href={inicio} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</a>}.
      </footer>
    </div>
  );
}
