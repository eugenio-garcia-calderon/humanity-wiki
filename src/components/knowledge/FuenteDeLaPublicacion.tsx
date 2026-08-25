import { useEffect, useState } from 'react';
import { Network, ArrowUpRight, Play, Image as ImagenIcono, FileText } from 'lucide-react';
import { cn } from '../../utils/cn';

/*
 * DE DÓNDE VIENE ESTO, CON SUS PIEZAS (2026-08-25)
 * ============================================================================
 * Eugenio: «cuando se hace clic en una publicación y se expande la pantalla
 * pop-up en grande, en versión móvil y también escritorio, dale más relevancia
 * al grafo o proyecto al que pertenezca esta publicación… ya que tenemos más
 * superficie de pantalla al estar ensanchada, podemos meter una preview de esa
 * fuente de publicación y dará a entender que hay más piezas en esa fuente de
 * contenido».
 *
 * ── LO QUE UN NÚMERO NO PUEDE HACER ────────────────────────────────────────
 * En la tarjeta pequeña la procedencia cabe en un renglón: «PARTE DE X · 11
 * piezas». Ahí el número es lo único que cabe, y ya hace su trabajo: convierte
 * un rótulo en algo comprobable.
 *
 * Pero un «11» se lee y se olvida. Con la ficha abierta hay sitio para lo
 * siguiente: **enseñar tres o cuatro de esas once**. Eso cambia «hay más» por
 * «hay esto, esto y esto», que es la diferencia entre saber que existe una red
 * detrás y verla.
 *
 * ── NO SE PIDE HASTA QUE SE ABRE LA FICHA ──────────────────────────────────
 * Y no se enseña nada mientras no haya llegado: un bloque que aparece vacío y
 * se rellena medio segundo después mueve todo lo de abajo mientras alguien está
 * leyendo. Mejor que aparezca entero o que no aparezca.
 */

type Pieza = { id: string; titulo: string; kind: string; imagen: string | null; youtube: string | null; video: string | null };
type Fuente = { slug: string; titulo: string; piezas: number; muestra: Pieza[] };

export default function FuenteDeLaPublicacion({ slug, excepto, onIr }: {
  slug: string;
  /** La publicación que se está mirando: no se enseña a sí misma. */
  excepto?: string;
  onIr?: () => void;
}) {
  const [f, setF] = useState<Fuente | null>(null);

  useEffect(() => {
    let vivo = true;
    const q = excepto ? `?excepto=${encodeURIComponent(excepto)}` : '';
    fetch(`/api/fuente/${encodeURIComponent(slug)}${q}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo && j && !j.error) setF(j); })
      .catch(() => { /* sin fuente, la ficha se lee igual */ });
    return () => { vivo = false; };
  }, [slug, excepto]);

  // Ni mientras carga ni si no hay nada que enseñar. Un lienzo de una sola
  // pieza no tiene «más piezas», y anunciarlo sería prometer lo que no hay.
  if (!f || f.piezas < 2) return null;

  const restantes = f.piezas - 1 - f.muestra.length;

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 overflow-hidden">
      <button
        onClick={onIr}
        disabled={!onIr}
        className={cn(
          'group flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors',
          onIr && 'hover:bg-slate-50',
        )}
      >
        <Network className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-emerald-600 transition-colors" />
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
            Esto es una pieza de
          </span>
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
              {f.titulo}
            </span>
            <span className="shrink-0 text-[11px] font-bold text-slate-400">{f.piezas} piezas</span>
          </span>
        </span>
        {onIr && <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />}
      </button>

      {f.muestra.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3">
          {/* ── LA FILA SE DESPLAZA, NO SE PARTE ──────────────────────────
              Ocho piezas repartidas en tres renglones convierten un vistazo en
              una lista. En una fila que se arrastra, lo que se ve es «hay más
              hacia allá», que es justo lo que hay que entender. */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {f.muestra.map(p => (
              <Miniatura key={p.id} p={p} />
            ))}
            {restantes > 0 && (
              <span className="grid h-[68px] w-24 shrink-0 place-items-center rounded-lg bg-slate-50 text-[11px] font-bold text-slate-400">
                +{restantes} más
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Miniatura({ p }: { p: Pieza }) {
  const foto = p.imagen || (p.youtube ? `https://img.youtube.com/vi/${p.youtube}/mqdefault.jpg` : null);
  const Icono = p.kind === 'video' ? Play : p.kind === 'imagen' ? ImagenIcono : FileText;
  return (
    <span className="w-24 shrink-0" title={p.titulo}>
      <span className="relative block h-[68px] w-24 overflow-hidden rounded-lg bg-slate-100">
        {foto ? (
          <img src={foto} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-slate-300">
            <Icono className="h-5 w-5" />
          </span>
        )}
        {/* El triángulo sobre una portada de vídeo: sin él, un fotograma y una
            foto se ven igual. */}
        {(p.youtube || p.video) && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white">
              <Play className="h-3 w-3 translate-x-px" fill="currentColor" />
            </span>
          </span>
        )}
      </span>
      <span className="mt-1 block truncate text-[10px] leading-tight text-slate-500">{p.titulo}</span>
    </span>
  );
}
