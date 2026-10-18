import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useSitio } from './ContextoSitio';

// ============================================================================
// LAS SECCIONES DE UN SITIO, EN TARJETAS (2026-10-18, Wikiproducts W2)
// ============================================================================
// Ronda 1 del evaluador: una búsqueda sin resultados y una dirección que no
// existe dejaban a la persona en una página vacía. Las secciones son las
// páginas del sitio que enseñan un catálogo de fichas (`seccionesDe` en
// `src/server/buscadorSitio.ts`): «Powerbanks · 23 productos». Se enseñan en
// la búsqueda vacía, en la página de error y en la portada (bloque
// `secciones`).

export type Seccion = { id: string; titulo: string; descripcion: string; fichas: number; portada: string | null; slug?: string | null };

export default function SeccionesSitio({ secciones, enlace, className = '' }: {
  secciones: Seccion[]; enlace: (id: string) => string; className?: string;
}) {
  // Por su nombre corto (`/powerbanks`) si lo tiene: es su dirección canónica.
  const sitio = useSitio();
  const a = (s: Seccion) => s.slug && sitio ? sitio.enlaceSlug(s.slug, '') : enlace(s.id);
  return (
    <ul className={`grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {secciones.map(s => (
        <li key={s.id}>
          <Link to={a(s)}
            className="flex gap-3 items-center rounded-xl border border-slate-200 p-3 min-h-[72px] hover:border-slate-400 hover:bg-slate-50 transition-colors">
            {s.portada
              ? <img src={s.portada} alt="" width={64} height={64} loading="lazy" className="w-16 h-16 rounded-lg object-contain bg-slate-50 shrink-0" />
              : <span className="w-16 h-16 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0" aria-hidden><Package className="w-7 h-7" /></span>}
            <span className="min-w-0">
              <span className="block text-base font-bold text-slate-900">{s.titulo}</span>
              <span className="block text-sm text-slate-600">{s.fichas === 1 ? '1 producto' : `${s.fichas} productos`}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Las secciones del sitio `raizId`, pedidas al servidor. `null` mientras llegan. */
export function useSecciones(raizId: string | null | undefined): Seccion[] | null {
  const [secciones, setSecciones] = useState<Seccion[] | null>(null);
  useEffect(() => {
    if (!raizId) return;
    let vivo = true;
    fetch(`/api/sitio/secciones?sitio=${encodeURIComponent(raizId)}`)
      .then(r => r.ok ? r.json() : { secciones: [] })
      .then(j => { if (vivo) setSecciones(j.secciones || []); })
      .catch(() => vivo && setSecciones([]));
    return () => { vivo = false; };
  }, [raizId]);
  return secciones;
}
