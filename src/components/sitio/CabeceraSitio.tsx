import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';
import BuscarBarra from './BuscarBarra';
import { BotonVista } from './VistaMapaSitio';

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
export function raizDe(id: string) {
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
    // scroll»): pegada arriba y con fondo para que no se mezcle.
    // DE BORDE A BORDE Y EN TRES PARTES (2026-10-26, Eugenio: «Luz & Humanidad mucho más a la izquierda; en el
    // centro, bien grande, una sola pastilla con la vista, el territorio y el sistema; el resto, secundario y más
    // pequeño en los laterales; el menú, solo las tres rayas a la derecha del todo y la foto a su izquierda»).
    <header data-cabecera-sitio className="sticky top-0 z-40 mb-4 grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 border-b border-slate-100 bg-white/95 px-4 py-2 backdrop-blur sm:grid-cols-[1fr_auto_1fr] sm:px-6"
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      {/* A todo lo ancho de la ventana, sin barra de desplazamiento de lado. */}
      <style>{'html { overflow-x: clip; }'}</style>
      {/* El logo, de tamaño fijo, con su eslogan debajo (un 10 % más pequeño, para que encaje bajo el nombre). */}
      <Link to="/" className="flex min-w-0 items-center gap-2.5 justify-self-start" aria-label={raiz ? `${raiz.titulo} · inicio` : 'Inicio'}>
        {icono && (/^(https?:|\/)/.test(icono)
          ? <img src={miniatura(icono, 96)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-contain" />
          : <span className="text-3xl leading-none">{icono}</span>)}
        {raiz && (
          <span className="hidden min-w-0 flex-col leading-none lg:flex">
            <span className="whitespace-nowrap text-[1.35rem] font-black tracking-tight text-slate-900">{raiz.titulo}</span>
            {c.subtitulo && <span className="mt-1 whitespace-nowrap text-[10.8px] text-slate-500">{c.subtitulo}</span>}
          </span>
        )}
      </Link>
      {/* LA PASTILLA DEL CENTRO: la vista (contenido o mapa), el territorio y el sistema con su nota. El
          territorio y el sistema los pone quien sabe (el termómetro o el filtro de la portada). En el móvil, en
          una segunda línea a todo lo ancho. */}
      <div data-centro-barra className="col-span-2 flex min-w-0 items-center justify-center max-sm:order-last sm:col-span-1">
        <div className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <BotonVista />
          <div data-ranura-territorio className="contents" />
          <nav data-ranura-ruta aria-label="Estás en" className="flex min-w-0 items-center gap-1">{ruta}</nav>
        </div>
      </div>
      <div className="relative flex min-w-0 items-center justify-end gap-1.5 justify-self-end">
        <BuscarBarra raizId={raizId} />
        {raiz && <Suspense fallback={null}><BotonesLectura config={c} centrado={false} parte="donar" /></Suspense>}
        <span data-hueco-cuenta="cabecera" className="contents" />
        {raiz && <Suspense fallback={null}><BotonesLectura config={c} centrado={false} parte="menu" /></Suspense>}
      </div>
    </header>
  );
}
