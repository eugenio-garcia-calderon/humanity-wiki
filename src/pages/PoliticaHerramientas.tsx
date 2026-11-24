import { useEffect, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Hexagon, PieChart, Users, Vote } from 'lucide-react';
import { cn } from '../utils/cn';

// ============================================================================
// POLÍTICA: LAS HERRAMIENTAS, EN TARJETAS (2026-11-24, Eugenio)
// ============================================================================
// «En la URL de política tienen que aparecer todas las herramientas que estamos
// desarrollando de política, pero solo como tarjetas que si pinchas te lleva a
// esa URL… quitar los menús de arriba… Tenemos 5 herramientas en total. Haz una
// tarjeta por cada una de ellas, una URL por cada una de ellas.»
//
// `/politica` (page `KWMOBSPOLARIZ01`, `config.aplicacion` = 'politica-herramientas')
// used to frame the whole observatory document. Now it is only this list. Each tool
// is its own page of luzhumanidad.com, created by migration 0235:
//
//   observatorio-de-polarizacion  the document, view «observatorio» (chapters 1–5, sources)
//   perfiles-politicos            the document, view «perfiles» (chapter 4)
//   geometria-politica            the document, view «geometria» (already its own page)
//   democracia-directa            the document, view «decidir» («Votar por temas»)
//   economia-publica              EconomiaPublica.tsx (the budgets of the socioeconomic model)
//
// The page's blocks link the five pages as subpages: that is what makes them hang
// from /politica (and so from the site) for the server, the sitemap and the HTML that
// search engines read. These cards are what a person sees. The two lists must match:
// a sixth tool needs a block in the page and an entry here.
//
// `inicio` is '/' on luzhumanidad.com and 'https://luzhumanidad.com' anywhere else
// (humanity.wiki/politica): the tools are pages of that site, so links go there.

type Herramienta = {
  slug: string;
  titulo: string;
  texto: string;
  Icono: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Tailwind classes for the icon's disc and the card's hover border. */
  acento: { disco: string; borde: string };
};

export const HERRAMIENTAS_POLITICA: Herramienta[] = [
  {
    slug: 'observatorio-de-polarizacion', titulo: 'Observatorio de polarización', Icono: Activity,
    texto: 'Cómo está dividida España: el barómetro del CIS, cien años de historia, cómo mira cada bando y cómo se pasa del desacuerdo al enemigo.',
    acento: { disco: 'bg-rose-100 text-rose-700', borde: 'hover:border-rose-300' },
  },
  {
    slug: 'perfiles-politicos', titulo: 'Perfiles políticos', Icono: Users,
    texto: 'Doce perfiles, de la extrema izquierda a la extrema derecha: su psicología, su relato, su lenguaje, sus contradicciones y sus líderes.',
    acento: { disco: 'bg-indigo-100 text-indigo-700', borde: 'hover:border-indigo-300' },
  },
  {
    slug: 'geometria-politica', titulo: 'Geometría política', Icono: Hexagon,
    texto: 'Cada partido como una figura en diez temas: qué cuida y qué deja fuera frente a un círculo ideal. Haz el test y dibuja la tuya.',
    acento: { disco: 'bg-amber-100 text-amber-700', borde: 'hover:border-amber-300' },
  },
  {
    slug: 'democracia-directa', titulo: 'Democracia directa', Icono: Vote,
    texto: 'Votar cosas concretas, no colores: ver el estado de cada tema con sus datos y decidir cuánto subir, bajar, abrir o cerrar.',
    acento: { disco: 'bg-emerald-100 text-emerald-700', borde: 'hover:border-emerald-300' },
  },
  {
    slug: 'economia-publica', titulo: 'Economía pública', Icono: PieChart,
    texto: 'En qué se gasta el dinero público en cada escala, de la Unión Europea a una familia, y una propuesta para ordenarlo.',
    acento: { disco: 'bg-sky-100 text-sky-700', borde: 'hover:border-sky-300' },
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

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HERRAMIENTAS_POLITICA.map(h => {
            const destino = `${raiz}/${h.slug}`;
            const cuerpo = (
              <>
                <span className={cn('flex h-12 w-12 items-center justify-center rounded-full', h.acento.disco)}>
                  <h.Icono aria-hidden className="h-6 w-6" />
                </span>
                <span className="mt-4 block text-xl font-bold text-slate-900">{h.titulo}</span>
                <span className="mt-2 block flex-1 text-[15px] leading-relaxed text-slate-600">{h.texto}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  Abrir <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </>
            );
            const clases = cn('group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition',
              'hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900', h.acento.borde);
            return (
              <li key={h.slug}>
                {enSitio
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
