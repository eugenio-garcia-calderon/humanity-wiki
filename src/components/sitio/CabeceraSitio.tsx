import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';
import BuscarBarra from './BuscarBarra';
import BotonCalificaciones from './BotonCalificaciones';
import { BotonVista, useVista, VISTAS_CON_TERRITORIO, type Vista } from './VistaMapaSitio';

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

export default function CabeceraSitio({ raizId, ruta, simple = false, vistaInicial = 'tabla' }: { raizId: string; ruta?: ReactNode;
  /** La vista sin `?vista=` en esta página (la portada puede abrir en otra que la tabla). */
  vistaInicial?: Vista;
  /** Solo el logo, la cuenta y el menú (2026-10-26, Eugenio: «en la página de donar, quita el territorio y buscar»). */
  simple?: boolean;
}) {
  const [raiz, setRaiz] = useState<Raiz | null>(null);
  useEffect(() => { let vivo = true; raizDe(raizId).then(r => { if (vivo) setRaiz(r); }); return () => { vivo = false; }; }, [raizId]);
  const c = raiz?.config || {}, icono: string | null = c.icono || null;
  // En las vistas que eligen el territorio en su título, sin la segunda fila (territorio y nota global).
  const [vista] = useVista(vistaInicial);
  const sinRuta = VISTAS_CON_TERRITORIO.includes(vista);
  return (
    // FIJA AL BAJAR (2026-10-26, Eugenio: «en la entrada de una base de datos el menú no se mantiene fijo al hacer
    // scroll»): pegada arriba y con fondo para que no se mezcle.
    // DE BORDE A BORDE Y EN TRES PARTES (2026-10-26, Eugenio: «Luz & Humanidad mucho más a la izquierda; en el
    // centro, bien grande, una sola pastilla con la vista, el territorio y el sistema; el resto, secundario y más
    // pequeño en los laterales; el menú, solo las tres rayas a la derecha del todo y la foto a su izquierda»).
    // EN FILA Y SIN PISARSE (2026-10-28): con el buscador y el territorio a la izquierda, la izquierda puede ser más ancha
    // que la derecha; el selector de vista se centra en el hueco que queda en vez de en la ventana.
    <header data-cabecera-sitio className="sticky top-0 z-40 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 bg-white/95 px-4 py-2 backdrop-blur sm:flex-nowrap sm:px-6"
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      {/* A todo lo ancho de la ventana, sin barra de desplazamiento de lado. */}
      <style>{'html { overflow-x: clip; }'}</style>
      {/* El logo, de tamaño fijo, con su eslogan debajo (un 10 % más pequeño, para que encaje bajo el nombre); y a su
          derecha, el buscador (2026-10-28, Eugenio: «la barra de buscar al lado del logo, a la izquierda»). */}
      <div className="flex min-w-0 shrink items-center gap-3">
      <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label={raiz ? `${raiz.titulo} · inicio` : 'Inicio'}>
        {icono && (/^(https?:|\/)/.test(icono)
          // Un 15 % mayor (2026-10-26, Eugenio): el icono y el nombre; el eslogan, igual.
          ? <img src={miniatura(icono, 112)} alt="" className="h-[51px] w-[51px] shrink-0 rounded-lg object-contain" />
          : <span className="text-[2.15rem] leading-none">{icono}</span>)}
        {raiz && (
          <span className="hidden min-w-0 flex-col leading-none lg:flex">
            <span className="whitespace-nowrap text-[1.55rem] font-black tracking-tight text-slate-900">{raiz.titulo}</span>
            {c.subtitulo && <span className="mt-1 whitespace-nowrap text-[10.8px] text-slate-500">{c.subtitulo}</span>}
          </span>
        )}
      </Link>
      {!simple && <BuscarBarra raizId={raizId} enLinea />}
      {/* El territorio de la vista Círculo, al lado del buscador (2026-10-28, Eugenio: «el selector de territorio,
          arriba, al lado de la barra de buscar, y quítalo de las tarjetas»). Lo pone ahí `VistaCirculo2Sitio`. */}
      {!simple && <div data-ranura-territorio-barra className="contents" />}
      </div>
      {/* EL CENTRO (2026-10-28, Eugenio: «las vistas solo con los iconos, fuera del marco del buscador; y lo de las
          calificaciones, también separado»): el selector de vista, solo iconos, y al lado, aparte, «Calificaciones».
          En el móvil, en una segunda línea a todo lo ancho. */}
      {simple ? <span className="hidden flex-1 sm:block" /> : <div data-centro-barra className="flex min-w-0 items-center justify-center gap-2 max-sm:order-last max-sm:basis-full sm:flex-1">
        <BotonVista porDefecto={vistaInicial} />
        <BotonCalificaciones />
      </div>}
      <div className="relative ml-auto flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:ml-0">
        {raiz && !simple && <Suspense fallback={null}><BotonesLectura config={c} centrado={false} parte="donar" /></Suspense>}
        <span data-hueco-cuenta="cabecera" className="contents" />
        {raiz && <Suspense fallback={null}><BotonesLectura config={c} centrado={false} parte="menu" /></Suspense>}
      </div>
      {/* LA RUTA, DEBAJO: el territorio y el sistema (o el objetivo), cada uno con su nota en su círculo. Los pone quien
          sabe (el termómetro o el filtro de la portada) en sus ranuras; sin nada dentro, la fila no se ve. */}
      {!simple && <div data-ruta-barra className={`hidden basis-full justify-center max-sm:order-last ${sinRuta ? '' : 'has-[[data-eslabon]]:flex'}`}>
        <div className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1.5 shadow-sm">
          <div data-ranura-territorio className="contents" />
          <nav data-ranura-ruta aria-label="Estás en" className="flex min-w-0 items-center gap-1">{ruta}</nav>
        </div>
      </div>}
    </header>
  );
}
