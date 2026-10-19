import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { useSitio } from '../../sitio/ContextoSitio';
import { cn } from '../../../utils/cn';
import { etiquetaProcedencia, fechaCorta, type Procedencia } from './modelo';

// The small pieces every block of a product sheet uses, so that a section
// title, a source mark or a link to another product look the same in all of
// them. The server writes the same shapes in `html.ts`.

/** Same classes as a `titulo2` in `BloquesLectura.tsx`: a sheet's sections
 *  are the page's h2s, in order (SEO R14: one h1, headings in order). */
export const CLASE_H2 = 'text-xl font-black text-slate-900 mt-3 mb-3';

/** Below Tailwind's `sm`: a phone. */
const MOVIL = '(max-width: 639px)';
export function useEsMovil(): boolean {
  const [movil, setMovil] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(MOVIL).matches);
  useEffect(() => {
    const q = window.matchMedia?.(MOVIL);
    if (!q) return;
    const cambio = () => setMovil(q.matches);
    cambio();
    q.addEventListener('change', cambio);
    return () => q.removeEventListener('change', cambio);
  }, []);
  return movil;
}

/**
 * A section of the sheet. `plegable`: on a phone it starts folded, its title
 * a 48 px row with `resumen` beside it («18 datos»). Evaluator round 4: the
 * mobile sheet was ~12,600 px tall, most of it technical tables a shopper
 * scrolls past to reach the shops. On a wider screen it is always open.
 * Folded content stays in the page (find-in-page and crawlers reach it), and
 * `irA` in `propiedad/Lectura.tsx` opens a section it scrolls to.
 */
export function Seccion({ titulo, children, className, id, plegable, resumen }: { titulo?: string; children: ReactNode; className?: string; id?: string; plegable?: boolean; resumen?: string }) {
  const movil = useEsMovil();
  if (plegable && movil && titulo) {
    return (
      <section id={id} className={cn('my-1 border-b border-slate-100', id && 'scroll-mt-36', className)}>
        {/* Arriving at «#comparar» (the gallery's «Comparar», W4) opens it. */}
        <details className="group" open={(!!id && typeof location !== 'undefined' && location.hash === `#${id}`) || undefined}>
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <h2 className={cn(CLASE_H2, 'my-0')}>{titulo}</h2>
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-700">
              {resumen ? <span>{resumen}</span> : null}
              <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" aria-hidden />
            </span>
          </summary>
          <div className="pb-3">{children}</div>
        </details>
      </section>
    );
  }
  return (
    <section id={id} className={cn('my-2', id && 'scroll-mt-36', className)}>
      {titulo ? <h2 className={CLASE_H2}>{titulo}</h2> : null}
      {children}
    </section>
  );
}

/** Where a value came from, next to the value. A declared value always says
 *  so («Según la marca»): the house tone (plan §2.6). */
export function MarcaProcedencia({ p }: { p: Procedencia | null }) {
  if (!p?.naturaleza) return null;
  const tono = p.naturaleza === 'medido' ? 'text-emerald-700' : p.naturaleza === 'no_publicado' ? 'text-amber-700' : 'text-slate-500';
  const texto = <>{p.etiqueta || etiquetaProcedencia(p)}</>;
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-semibold', tono)} title={[p.nota, p.fecha && `Consultado el ${fechaCorta(p.fecha)}`].filter(Boolean).join(' · ') || undefined}>
      {/* `py-3` on an inline link grows what a finger can hit to 44 px
          without moving a line (evaluator round 3: tap targets). */}
      {p.fuente ? <a href={p.fuente} target="_blank" rel="noopener nofollow" className="py-3 hover:underline">{texto}</a> : texto}
      {p.nota ? <Info className="w-3 h-3 opacity-60" aria-hidden /> : null}
    </span>
  );
}

/** The address of another row's page, inside the site when there is one. */
export function useEnlaceFila(): (paginaId: string | null | undefined) => string | null {
  const sitio = useSitio();
  return id => (id ? (sitio ? sitio.enlacePagina(id) : `/paginas/${id}`) : null);
}

/** What the editor shows when a block that reads «the current row» sits on a
 *  page that is not one. A published page shows nothing instead. */
export function SinFila({ que }: { que: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">
      {que} Ponlo en la plantilla de ficha de una base de datos o en la página de una de sus filas.
    </p>
  );
}

export function Cargando() {
  return <div className="h-16 animate-pulse rounded-xl bg-slate-50" aria-hidden />;
}

/** «En vista previa con los datos de X»: on the template page. */
export function AvisoVistaPrevia({ nombre }: { nombre: string }) {
  return <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-sky-600">Vista previa con «{nombre}»</p>;
}
