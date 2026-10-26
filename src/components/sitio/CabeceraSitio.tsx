import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';

const BotonesLectura = lazy(() => import('./BotonesLectura'));

// ============================================================================
// LA BARRA DEL SITIO EN SUS PÁGINAS (2026-10-26, Eugenio)
// ============================================================================
// «Luz & Humanidad más pequeño arriba a la izquierda; a continuación el territorio
// (sin la palabra Cambiar); luego la ruta de dónde estás, sin “Inicio”; a la
// derecha, Donar y el menú siempre plegado con todas las páginas; y la cuenta sin
// la palabra Entrar.» Una sola línea. El logo, el nombre y el menú son los de la
// página raíz del sitio (`/api/sitio/pagina/:raiz`).
//
// Dos huecos que llena quien sabe qué poner: el territorio (`data-ranura-territorio`,
// el termómetro) y la ruta (`data-ranura-ruta`, el termómetro o `ruta`). La cuenta
// (`BarraMiembro`) se pinta en `data-hueco-cuenta="cabecera"`.

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

export default function CabeceraSitio({ raizId, ruta }: { raizId: string; ruta?: ReactNode }) {
  const [raiz, setRaiz] = useState<Raiz | null>(null);
  useEffect(() => { let vivo = true; raizDe(raizId).then(r => { if (vivo) setRaiz(r); }); return () => { vivo = false; }; }, [raizId]);
  const c = raiz?.config || {}, icono: string | null = c.icono || null;
  return (
    // FIJA AL BAJAR (2026-10-26, Eugenio: «en la entrada de una base de datos el menú no se mantiene fijo al hacer
    // scroll»): pegada arriba, de borde a borde (anula el margen de la página) y con fondo para que no se mezcle.
    <header data-cabecera-sitio className="sticky top-0 z-40 -mx-5 mb-4 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 bg-white/95 px-5 py-2 backdrop-blur sm:-mx-8 sm:flex-nowrap sm:px-8">
      <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2" aria-label={raiz ? `${raiz.titulo} · inicio` : 'Inicio'}>
        {icono && (/^(https?:|\/)/.test(icono)
          ? <img src={miniatura(icono, 80)} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          : <span className="text-2xl leading-none">{icono}</span>)}
        {raiz && <span className="hidden whitespace-nowrap text-lg font-black leading-none tracking-tight text-slate-900 md:inline">{raiz.titulo}</span>}
      </Link>
      {/* El territorio y la ruta, centrados y separados del logo (2026-10-26, Eugenio: «más espacio entre
          Luz & Humanidad y España; España y Movilidad más centrados»). En el móvil, en una segunda línea. */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-4 max-sm:order-last max-sm:w-full max-sm:flex-none sm:mx-8">
        <div data-ranura-territorio className="contents" />
        <nav data-ranura-ruta aria-label="Estás en" className="flex min-w-0 items-center gap-1">{ruta}</nav>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {raiz && <Suspense fallback={null}><BotonesLectura config={c} centrado={false} plegado talla="sm" /></Suspense>}
        <span data-hueco-cuenta="cabecera" className="contents" />
      </div>
    </header>
  );
}
