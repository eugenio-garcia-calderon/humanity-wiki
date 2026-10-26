import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';

const BotonesLectura = lazy(() => import('./BotonesLectura'));

// ============================================================================
// LA CABECERA DEL SITIO EN SUS PÁGINAS (2026-10-26, Eugenio)
// ============================================================================
// «Que aparezca Luz & Humanidad como logo con el menú completo y, debajo, la
// página.» El logo, el nombre, la descripción y los botones del menú son los de
// la página raíz del sitio (`/api/sitio/pagina/:raiz`): uno para toda la web.

type Raiz = { titulo: string; config: any };
const cache = new Map<string, Promise<Raiz | null>>();
function raizDe(id: string) {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`/api/sitio/pagina/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(j => (j ? { titulo: String(j.titulo || ''), config: j.config || {} } : null)).catch(() => null);
    cache.set(id, p);
  }
  return p;
}

export default function CabeceraSitio({ raizId }: { raizId: string }) {
  const [raiz, setRaiz] = useState<Raiz | null>(null);
  useEffect(() => { let vivo = true; raizDe(raizId).then(r => { if (vivo) setRaiz(r); }); return () => { vivo = false; }; }, [raizId]);
  if (!raiz) return <div className="mb-4 h-16" aria-hidden />;
  const c = raiz.config, icono: string | null = c.icono || null;
  return (
    <header data-cabecera-sitio className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <Link to="/" className="flex min-w-0 items-center gap-3" aria-label={`${raiz.titulo} · inicio`}>
        {icono && (/^(https?:|\/)/.test(icono)
          ? <img src={miniatura(icono, 120)} alt="" className="h-12 w-12 shrink-0 rounded-xl object-contain sm:h-14 sm:w-14" />
          : <span className="text-4xl leading-none">{icono}</span>)}
        <span className="min-w-0">
          <span className="block truncate text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl">{raiz.titulo}</span>
          {c.subtitulo && <span className="block truncate text-sm text-slate-500 sm:text-base">{c.subtitulo}</span>}
        </span>
      </Link>
      <Suspense fallback={null}><BotonesLectura config={c} centrado={false} derecha talla="sm" /></Suspense>
    </header>
  );
}
