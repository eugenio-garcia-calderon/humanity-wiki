import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';
import BuscarBarra from './BuscarBarra';
import BotonCalificaciones from './BotonCalificaciones';
import { VistasMenu, vistasDe, type Vista } from './VistaMapaSitio';

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
  // EL ESCAPARATE (`sitio.escaparate`, 2026-11-06, Eugenio en luzhumanidad.com: «quita el menú
  // entero y la opción de iniciar sesión»): sin el ☰ y sin el hueco de la cuenta.
  const escaparate = c.sitio?.escaparate === true;
  // EL ESCAPARATE, CENTRADO (2026-11-06, Eugenio: «el logotipo con el nombre y el subtítulo en el
  // centro, y la barra de buscar más hacia la derecha»): tres columnas, la marca en medio y el
  // buscador pegado a la derecha. En el móvil, la marca arriba y el buscador debajo, a la derecha.
  if (escaparate) return (
    <header data-cabecera-sitio className="sticky top-0 z-40 -mt-[18px] mb-4 grid grid-cols-1 items-center gap-2 border-b border-slate-100 bg-white/95 px-4 py-2 backdrop-blur sm:-mt-5 sm:grid-cols-[1fr_auto_1fr] sm:px-6"
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      <style>{'html { overflow-x: clip; }'}</style>
      <span aria-hidden className="hidden sm:block" />
      <Link to="/" className="flex min-w-0 items-center justify-center gap-2.5" aria-label={raiz ? `${raiz.titulo} · inicio` : 'Inicio'}>
        {icono && (/^(https?:|\/)/.test(icono)
          ? <img src={miniatura(icono, 112)} alt="" className="h-[38px] w-[38px] shrink-0 rounded-lg object-contain" />
          : <span className="text-[1.6rem] leading-none">{icono}</span>)}
        {raiz && (
          <span className="flex min-w-0 flex-col leading-none">
            <span className="whitespace-nowrap text-[1.4rem] font-black tracking-tight text-slate-900">{raiz.titulo}</span>
            {c.subtitulo && <span className="mt-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{c.subtitulo}</span>}
          </span>
        )}
      </Link>
      <div className="flex min-w-0 justify-end"><BuscarBarra raizId={raizId} enLinea /></div>
    </header>
  );
  return (
    // FIJA AL BAJAR (2026-10-26, Eugenio: «en la entrada de una base de datos el menú no se mantiene fijo al hacer
    // scroll»): pegada arriba y con fondo para que no se mezcle.
    // LA RUTA EN EL CENTRO (2026-10-28, Eugenio): tres columnas. A la izquierda del todo el menú ☰ (con las vistas
    // dentro: «mételo en el menú colapsable»); luego el logo con el nombre de la plataforma y el ojo de las
    // calificaciones. En el centro, la pastilla de la ruta (el territorio y el sistema o la temática, o en la vista
    // Círculo lo que se va pinchando). Pegado a su derecha, el buscador; y a la derecha del todo, Donar y la cuenta
    // («Donar y perfil a la derecha»). En el móvil, la ruta baja a su propia línea.
    <header data-cabecera-sitio className="sticky top-0 z-40 -mt-[18px] mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 bg-white/95 px-4 py-1.5 backdrop-blur sm:-mt-5 sm:px-6 md:grid md:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)]"
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      {/* A todo lo ancho de la ventana, sin barra de desplazamiento de lado. Pegada arriba del todo, sin el hueco del margen
          de la página (2026-10-29, Eugenio: «reduce el espacio superior del menú»). */}
      <style>{'html { overflow-x: clip; }'}</style>
      {/* En el móvil los grupos se deshacen (`contents`) para repartir sus piezas en líneas: arriba el menú, el logo,
          Donar y la cuenta; debajo las calificaciones y el buscador; y al final la ruta. */}
      <div className="contents md:col-start-1 md:flex md:min-w-0 md:items-center md:gap-2">
        {raiz && !escaparate && <span className="flex shrink-0 items-center"><Suspense fallback={null}><BotonesLectura config={c} centrado={false} parte="menu"
          cabezaMenu={simple ? undefined : cerrar => <VistasMenu porDefecto={vistaInicial} vistas={vistasDe(c.sitio)} cerrar={cerrar} />} /></Suspense></span>}
        <Link to="/" className="ml-1 flex min-w-0 shrink-0 items-center gap-2.5" aria-label={raiz ? `${raiz.titulo} · inicio` : 'Inicio'}>
          {icono && (/^(https?:|\/)/.test(icono)
            ? <img src={miniatura(icono, 112)} alt="" className="h-[34px] w-[34px] shrink-0 rounded-lg object-contain" />
            : <span className="text-[1.6rem] leading-none">{icono}</span>)}
          {/* El nombre de la plataforma (de vuelta el mismo día: «recupera el nombre»); el eslogan, si sobra sitio. */}
          {raiz && (
            <span className="hidden min-w-0 flex-col leading-none lg:flex">
              <span className="whitespace-nowrap text-[1.4rem] font-black tracking-tight text-slate-900">{raiz.titulo}</span>
              {/* El eslogan, debajo del nombre (2026-11-05, Eugenio: «que esté debajo de Luz y
                  Humanidad, del logo de arriba a la izquierda»). Antes solo salía en pantallas 2xl. */}
              {c.subtitulo && <span className="mt-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{c.subtitulo}</span>}
            </span>
          )}
        </Link>
        {!simple && <span aria-hidden className="basis-full max-md:order-1 md:hidden" />}
        {/* El ojo de las calificaciones, salvo que el sitio lo apague (`sitio.calificaciones: false`;
            2026-11-05, Eugenio: «quítalo de ocultar y mostrar las calificaciones» en el laboratorio). */}
        {!simple && c.sitio?.calificaciones !== false && <span className="flex shrink-0 items-center max-md:order-1"><BotonCalificaciones /></span>}
      </div>
      {/* LA RUTA: el territorio y el sistema (o la temática), cada uno con su desplegable. La ponen quienes saben (el
          termómetro, el filtro de la portada o la vista Círculo) en sus ranuras; sin nada dentro, no se ve. */}
      {!simple && <div data-ruta-barra className="hidden min-w-0 justify-center has-[[data-eslabon]]:flex max-md:order-last max-md:basis-full md:col-start-2">
        <div className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1.5 shadow-sm">
          <div data-ranura-territorio className="contents" />
          <nav data-ranura-ruta aria-label="Estás en" className="flex min-w-0 items-center gap-1">{ruta}</nav>
        </div>
      </div>}
      <div className="contents md:col-start-3 md:flex md:min-w-0 md:items-center md:gap-2">
        {!simple && <div className="flex min-w-0 max-md:order-1 max-md:ml-auto"><BuscarBarra raizId={raizId} enLinea /></div>}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {raiz && !simple && <Suspense fallback={null}><BotonesLectura config={c} centrado={false} parte="donar" /></Suspense>}
          {!escaparate && <span data-hueco-cuenta="cabecera" className="contents" />}
        </span>
      </div>
    </header>
  );
}
