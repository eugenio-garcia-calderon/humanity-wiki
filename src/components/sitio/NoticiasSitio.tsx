import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, ArrowUpRight, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PortadaNoticia } from './TarjetaNoticia';

// ============================================================================
// EN LOS MEDIOS (2026-11-06, Eugenio en luzhumanidad.com)
// ============================================================================
// «Debajo de las personas, una compilación de todas las noticias, de forma muy
// visual y chula, como una base de datos con portada y titulares de cada
// proyecto.» Las noticias salen de las listas de enlaces de cada proyecto
// (`/api/sitio/noticias/:raiz`, `seoEscaparate.ts`): quien añade un enlace a un
// proyecto lo ve aquí sin tocar nada más. La más reciente va destacada; se
// filtra por tipo y por proyecto; nueve de entrada y «Ver más».

type Noticia = {
  titulo: string; url: string; medio: string; fecha: string | null; fechaTexto: string | null;
  imagen: string | null; logo?: string | null; video: boolean; proyectos: Array<{ titulo: string; url: string }>;
};

const POR_VEZ = 9;

// La portada de cada noticia, con el logo y el nombre del medio encima (`TarjetaNoticia.tsx`, 2026-11-06).
function Portada({ n, grande }: { n: Noticia; grande?: boolean }) {
  return <PortadaNoticia n={n} grande={grande} clase={grande ? 'aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[340px]' : 'aspect-[16/9]'} />;
}

function Proyectos({ n }: { n: Noticia }) {
  return (
    <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
      {n.proyectos.slice(0, 3).map(p => (
        <Link key={p.url} to={p.url} data-interno=""
          className="relative z-10 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-900 hover:text-white">
          {p.titulo}
        </Link>
      ))}
    </div>
  );
}

export default function NoticiasSitio({ raizId }: { raizId: string }) {
  const [noticias, setNoticias] = useState<Noticia[] | null>(null);
  const [tipo, setTipo] = useState<'todo' | 'texto' | 'video'>('todo');
  const [proyecto, setProyecto] = useState('');
  const [cuantas, setCuantas] = useState(POR_VEZ);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/sitio/noticias/${encodeURIComponent(raizId)}`)
      .then(r => (r.ok ? r.json() : null)).then(j => { if (vivo) setNoticias(j?.noticias || []); }).catch(() => { if (vivo) setNoticias([]); });
    return () => { vivo = false; };
  }, [raizId]);

  const proyectos = useMemo(() => {
    const n = new Map<string, { titulo: string; url: string; n: number }>();
    for (const x of noticias || []) for (const p of x.proyectos) n.set(p.url, { ...p, n: (n.get(p.url)?.n || 0) + 1 });
    return [...n.values()].sort((a, b) => b.n - a.n || a.titulo.localeCompare(b.titulo, 'es'));
  }, [noticias]);

  if (!noticias || noticias.length === 0) return null;
  const medios = new Set(noticias.map(n => n.medio)).size;
  const anos = noticias.map(n => n.fecha?.slice(0, 4)).filter(Boolean).sort() as string[];
  const filtradas = noticias.filter(n => (tipo === 'todo' || (tipo === 'video') === n.video) && (!proyecto || n.proyectos.some(p => p.url === proyecto)));
  // La primera con portada va destacada (si se ve todo).
  const destacada = filtradas.find(n => n.imagen) || null;
  const resto = filtradas.filter(n => n !== destacada);
  const chip = (activo: boolean) => cn('h-9 rounded-full border px-4 text-sm font-bold transition-colors', activo ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400');

  return (
    <section data-ancla="medios" aria-labelledby="titulo-medios" className="mt-20 scroll-mt-36 outline-none sm:scroll-mt-24">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-500"><Newspaper className="h-3.5 w-3.5" aria-hidden /> En los medios</p>
        <h2 id="titulo-medios" className="mx-auto mt-2 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Lo que se ha contado de nuestros proyectos</h2>
        <p className="mt-3 text-sm font-semibold text-slate-500">
          {noticias.length} noticias y vídeos · {medios} medios{anos.length ? ` · ${anos[0]}–${anos[anos.length - 1]}` : ''}
        </p>
      </div>

      {/* Los filtros: el tipo y el proyecto. */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => { setTipo('todo'); setCuantas(POR_VEZ); }} className={chip(tipo === 'todo')}>Todo</button>
        <button type="button" onClick={() => { setTipo('texto'); setCuantas(POR_VEZ); }} className={chip(tipo === 'texto')}>Artículos</button>
        <button type="button" onClick={() => { setTipo('video'); setCuantas(POR_VEZ); }} className={chip(tipo === 'video')}>Vídeos</button>
        <label className="relative">
          <span className="sr-only">Proyecto</span>
          <select value={proyecto} onChange={e => { setProyecto(e.target.value); setCuantas(POR_VEZ); }}
            className="h-9 appearance-none rounded-full border border-slate-200 bg-white pl-4 pr-9 text-sm font-bold text-slate-600 hover:border-slate-400 focus:outline-none">
            <option value="">Todos los proyectos</option>
            {proyectos.map(p => <option key={p.url} value={p.url}>{p.titulo} ({p.n})</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </label>
      </div>

      {filtradas.length === 0 && <p className="py-12 text-center text-sm text-slate-400">No hay noticias con ese filtro.</p>}

      {/* La destacada: la más reciente con portada, a lo ancho. */}
      {destacada && (
        <article className="group relative mt-8 grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg lg:grid-cols-[3fr_2fr]">
          <Portada n={destacada} grande />
          <div className="flex flex-col p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-amber-600">Lo último</p>
            <h3 className="mt-2 text-2xl font-black leading-tight tracking-tight text-slate-900 group-hover:underline sm:text-3xl">
              <a href={destacada.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">{destacada.titulo}</a>
            </h3>
            <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500">
              {destacada.medio}{destacada.fechaTexto ? ` · ${destacada.fechaTexto}` : ''} <ArrowUpRight className="h-4 w-4" />
            </p>
            <Proyectos n={destacada} />
          </div>
        </article>
      )}

      <ul className="mt-6 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {resto.slice(0, cuantas).map(n => (
          <li key={n.url}>
            <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <Portada n={n} />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-3 text-base font-black leading-snug text-slate-900 group-hover:underline">
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">{n.titulo}</a>
                </h3>
                <Proyectos n={n} />
              </div>
            </article>
          </li>
        ))}
      </ul>

      {resto.length > cuantas && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setCuantas(c => c + POR_VEZ)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-6 text-sm font-bold text-white hover:bg-slate-700">
            Ver más noticias <span className="text-white/60">({resto.length - cuantas})</span>
          </button>
        </div>
      )}
    </section>
  );
}
