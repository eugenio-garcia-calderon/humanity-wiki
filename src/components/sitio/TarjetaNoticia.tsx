import { useState } from 'react';
import { Play, ArrowUpRight } from 'lucide-react';
import { miniatura } from '../../utils/miniatura';
import { cn } from '../../utils/cn';
import { noticiaDeBloque, type NoticiaDeBloque } from '../../utils/noticias';

// ============================================================================
// UNA NOTICIA COMO TARJETA (2026-11-06, Eugenio en luzhumanidad.com)
// ============================================================================
// «Que las notas de prensa y las referencias a enlaces externos no aparezcan como
// un listado, sino como una galería con una preview de la imagen de esa noticia, y
// con letras sobre la imagen el medio en el que se publica —El País, The Objective—,
// destacando esa parte con los logos de esos periódicos.»
//
// La portada es la de la noticia (`imagen` del bloque, subida a /uploads, o la
// miniatura del vídeo); el logo, el del medio (`logo`, /uploads/2026/11/logos/). Sin
// portada, un degradado con el color del medio; sin logo, su inicial. La usan las
// páginas de los proyectos (`GaleriaNoticias`) y la recopilación de la portada del
// sitio (`NoticiasSitio`).

const TONOS = [
  'from-amber-400 to-orange-500', 'from-sky-500 to-indigo-600', 'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600', 'from-violet-500 to-purple-600', 'from-slate-600 to-slate-800',
];
const tono = (t: string) => TONOS[[...t].reduce((n, c) => n + c.charCodeAt(0), 0) % TONOS.length];
/** «YouTube · Eugenio García-Calderon» → «YouTube»: sobre la imagen va el medio, corto. */
const medioCorto = (m: string) => m.split(' · ')[0].trim();

type ConLogo = Pick<NoticiaDeBloque, 'titulo' | 'medio' | 'imagen' | 'video' | 'fechaTexto'> & { logo?: string | null };

export function LogoMedio({ n, grande }: { n: ConLogo; grande?: boolean }) {
  const caja = cn('grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5', grande ? 'h-12 w-12' : 'h-10 w-10');
  return n.logo
    ? <span className={cn(caja, 'p-1')}><img src={n.logo} alt={`Logo de ${medioCorto(n.medio)}`} loading="lazy" decoding="async" className="h-full w-full object-contain" /></span>
    : <span aria-hidden className={cn(caja, 'text-base font-black text-slate-800')}>{medioCorto(n.medio).charAt(0).toUpperCase()}</span>;
}

/** La portada de una noticia con el medio encima: logo y nombre, abajo a la izquierda. */
export function PortadaNoticia({ n, grande, clase }: { n: ConLogo; grande?: boolean; clase?: string }) {
  const src = n.imagen ? (n.imagen.startsWith('/uploads/') ? miniatura(n.imagen, grande ? 800 : 400) : n.imagen) : null;
  return (
    <div className={cn('relative w-full overflow-hidden bg-slate-100', clase || 'aspect-[16/10]')}>
      {src
        ? <img src={src} alt={`${medioCorto(n.medio)}: ${n.titulo}`} loading="lazy" decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
        : <div aria-hidden className={cn('absolute inset-0 bg-gradient-to-br', tono(n.medio))} />}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      {n.video && (
        <span aria-hidden className="absolute inset-0 grid place-items-center pb-8">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg transition-transform group-hover:scale-110">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
      )}
      {n.fechaTexto && (
        <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">{n.fechaTexto}</span>
      )}
      {/* El medio, destacado: su logo y su nombre en grande sobre la imagen. */}
      <div data-fondo-oscuro="" className="absolute inset-x-3 bottom-3 flex items-center gap-2.5">
        <LogoMedio n={n} grande={grande} />
        <span className={cn('min-w-0 truncate font-black leading-tight tracking-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.65)]', grande ? 'text-2xl' : 'text-lg')}>
          {medioCorto(n.medio)}
        </span>
      </div>
    </div>
  );
}

/** Una tarjeta entera: portada con el medio, titular y enlace a la noticia (toda la tarjeta es el enlace). */
export function TarjetaNoticia({ n, Titulo = 'h4' }: { n: NoticiaDeBloque; Titulo?: 'h3' | 'h4' }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <PortadaNoticia n={n} />
      <div className="flex flex-1 flex-col p-4">
        <Titulo className="line-clamp-3 text-[15px] font-bold leading-snug text-slate-900 group-hover:underline">
          <a href={n.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">{n.titulo}</a>
        </Titulo>
        <p className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-bold text-slate-400">
          {n.video ? 'Ver el vídeo' : 'Leer en ' + medioCorto(n.medio)} <ArrowUpRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </article>
  );
}

const POR_VEZ = 9;

/** Las viñetas de «En los medios» de una página, como galería de tarjetas. Todas van en el HTML
 *  (las que pasan de nueve, escondidas hasta «Ver todas»), para que se sigan leyendo y enlazando. */
export default function GaleriaNoticias({ bloques }: { bloques: any[] }) {
  const [todas, setTodas] = useState(false);
  const items = bloques.map(b => ({ b, n: noticiaDeBloque(b) })).filter((x): x is { b: any; n: NoticiaDeBloque } => !!x.n);
  if (!items.length) return null;
  return (
    <div className="clear-both pt-1">
      <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ b, n }, i) => (
          <li key={b.id || n.url} id={b.id ? `b-${b.id}` : undefined} className={cn(!todas && i >= POR_VEZ && 'hidden')}>
            <TarjetaNoticia n={n} />
          </li>
        ))}
      </ul>
      {items.length > POR_VEZ && !todas && (
        <div className="mt-5 text-center">
          <button type="button" onClick={() => setTodas(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-sm font-bold text-slate-700 hover:border-slate-500">
            Ver las {items.length} publicaciones
          </button>
        </div>
      )}
    </div>
  );
}
