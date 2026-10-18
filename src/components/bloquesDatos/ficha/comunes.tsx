import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { useSitio } from '../../sitio/ContextoSitio';
import { cn } from '../../../utils/cn';
import { etiquetaProcedencia, fechaCorta, type Procedencia } from './modelo';

// The small pieces every block of a product sheet uses, so that a section
// title, a source mark or a link to another product look the same in all of
// them. The server writes the same shapes in `html.ts`.

/** Same classes as a `titulo2` in `BloquesLectura.tsx`: a sheet's sections
 *  are the page's h2s, in order (SEO R14: one h1, headings in order). */
export const CLASE_H2 = 'text-xl font-black text-slate-900 mt-3 mb-3';

export function Seccion({ titulo, children, className }: { titulo?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('my-2', className)}>
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
      {p.fuente ? <a href={p.fuente} target="_blank" rel="noopener nofollow" className="hover:underline">{texto}</a> : texto}
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
