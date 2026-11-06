import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Play, ArrowUpRight, ChevronDown } from 'lucide-react';
import { miniatura } from '../../utils/miniatura';
import { cn } from '../../utils/cn';

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
  imagen: string | null; video: boolean; proyectos: Array<{ titulo: string; url: string }>;
};

const TONOS = [
  'from-amber-400 to-orange-500', 'from-sky-500 to-indigo-600', 'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600', 'from-violet-500 to-purple-600', 'from-slate-600 to-slate-800',
];
const tono = (t: string) => TONOS[[...t].reduce((n, c) => n + c.charCodeAt(0), 0) % TONOS.length];
const POR_VEZ = 9;

function Portada({ n, grande }: { n: Noticia; grande?: boolean }) {
  const src = n.imagen ? (n.imagen.startsWith('/uploads/') ? miniatura(n.imagen, grande ? 800 : 400) : n.imagen) : null;
  return (
    <div className={cn('relative w-full overflow-hidden bg-slate-100', grande ? 'aspect-[16/9] lg:aspect-auto lg:h-full lg:min-h-[340px]' : 'aspect-[16/9]')}>
      {src ? (
        <img src={src} alt={n.titulo} loading="lazy" decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      ) : (
        <div className={cn('absolute inset-0 grid place-items-center bg-gradient-to-br p-6 text-center', tono(n.medio))}>
          <span className="text-xl font-black leading-tight text-white/95 drop-shadow-sm">{n.medio}</span>
        </div>
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      <span className="absolute left-3 top-3 max-w-[75%] truncate rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-slate-800 shadow-sm">{n.medio}</span>
      {n.video && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg transition-transform group-hover:scale-110">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
      )}
      {n.fechaTexto && <span className="absolute bottom-3 left-3 text-xs font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">{n.fechaTexto}</span>}
    </div>
  );
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
    <section data-ancla="medios" aria-labelledby="titulo-medios" className="mt-20 scroll-mt-24">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-400"><Newspaper className="h-3.5 w-3.5" /> En los medios</p>
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
