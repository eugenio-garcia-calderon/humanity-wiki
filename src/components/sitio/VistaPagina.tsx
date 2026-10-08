import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BloquesLectura from '../knowledge/BloquesLectura';
import EnlazanAqui from '../knowledge/EnlazanAqui';
import { contarPagina, textoLectura } from '../../utils/ajustesPagina';
import RelacionesPublicas from '../tablas/RelacionesPublicas';
import { useSitio } from './ContextoSitio';
import { useEsMovil } from '../../hooks/useEsMovil';
import { MarcoLectura, CabeceraLectura } from './CabeceraLectura';

// ============================================================================
// UNA PÁGINA PUBLICADA, COMO SE LEE (2026-09-30)
// ============================================================================
// La misma para las tres puertas (dominio propio, subdominio, `/@quien/…`) y
// para las subpáginas. Antes había dos copias —`PaginaPublica` y
// `PaginaDeDominio`— y se habían separado: una enseñaba el autor y la otra
// no, ninguna enseñaba la portada ni el icono que el autor había puesto.
//
// Lo que se enseña lo decide quien escribe, en «Ajustes de la página»:
//   · el autor, APAGADO por defecto (Eugenio: «quita por defecto el autor»),
//   · la fecha, apagada por defecto,
//   · el ancho completo.
// Una página publicada es una web: la firma es una decisión, no un sello.

export type { DatosPagina } from './CabeceraLectura';
import type { DatosPagina } from './CabeceraLectura';

const esUrl = (s: string) => /^(https?:|\/)/.test(s);

export default function VistaPagina({ pagina, propio, pie }: {
  pagina: DatosPagina;
  /** Dominio propio o subdominio: el título de la pestaña no lleva la marca
   *  de la plataforma y el icono de la página hace de favicon. */
  propio: boolean;
  /** Lo que va debajo (una cesta, un pie). */
  pie?: ReactNode;
}) {
  const sitio = useSitio();
  const cfg = pagina.config || {};
  const bloques = cfg.bloques || cfg.blocks || [];
  const icono: string | null = cfg.icono || null;
  const esMovil = useEsMovil();

  // El título de la pestaña, la orden a los buscadores y el icono. El servidor
  // ya los escribe en el HTML para quien no ejecuta JavaScript; esto los
  // mantiene al navegar de página en página sin recargar.
  useEffect(() => {
    const antes = document.title;
    document.title = propio ? (pagina.titulo || 'Sin título') : `${pagina.titulo || 'Sin título'} · humanity.wiki`;
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const creada = !robots;
    if (!robots) { robots = document.createElement('meta'); robots.name = 'robots'; document.head.appendChild(robots); }
    robots.content = pagina.indexable === false ? 'noindex,nofollow' : 'index,follow';

    const quitados: HTMLLinkElement[] = [];
    let mio: HTMLLinkElement | null = null;
    if (propio && icono) {
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]').forEach(l => { quitados.push(l); l.remove(); });
      mio = document.createElement('link');
      mio.rel = 'icon';
      mio.href = esUrl(icono) ? icono
        : `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icono}</text></svg>`)}`;
      document.head.appendChild(mio);
    }
    return () => {
      document.title = antes;
      if (creada && robots) robots.remove();
      if (mio) { mio.remove(); quitados.forEach(l => document.head.appendChild(l)); }
    };
  }, [pagina.id, pagina.titulo, pagina.indexable, propio, icono]);

  // Volver a la página madre SIN salir del sitio.
  const padre = pagina.padre;
  const aPadre = padre && sitio
    ? (padre.slug ? (sitio.raizId === padre.id ? '/' : sitio.enlaceSlug(padre.slug, padre.handle)) : sitio.enlacePagina(padre.id))
    : null;

  // EL MENÚ NAVEGA SIN RECARGAR (2026-10-02). Sus enlaces son `<a>` normales
  // —el servidor también los pinta—, así que aquí se cogen los que van a
  // otra página del mismo sitio y se abren con el enrutador. Y se cierran las
  // tres rayas, que si no seguirían abiertas en la página nueva.
  const navegar = useNavigate();
  const alPinchar = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest?.('a[data-interno]') as HTMLAnchorElement | null;
    a?.closest('details')?.removeAttribute('open');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const href = a.getAttribute('href') || '';
    if (!href.startsWith('/')) return;
    e.preventDefault();
    navegar(href);
    window.scrollTo(0, 0);
  };
  const rutas = sitio && pagina.sitio ? { enlacePagina: sitio.enlacePagina, enlaceBd: sitio.enlaceBd, raizId: pagina.sitio.raizId } : undefined;

  return (
    <div onClickCapture={alPinchar}>
    <MarcoLectura pagina={pagina} rutas={rutas}>
      {aPadre && (
        <Link to={aPadre} className="inline-flex items-center gap-1 mb-4 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> {padre!.titulo || 'Volver'}
        </Link>
      )}
      <article>
        <CabeceraLectura pagina={pagina} esMovil={esMovil} />
        {/* Si es la página de una fila: con qué está conectada (solo lo que tiene algo). */}
        {cfg.tiempoLectura === true && (() => {
          const c = contarPagina(bloques);
          return c.palabras > 0 ? <p className="-mt-4 mb-6 text-xs font-bold text-slate-400" data-tiempo-lectura>{textoLectura(c.palabras, c.minutos)}</p> : null;
        })()}
        {/* La página de una base de datos no es una página de verdad: no tiene
            relaciones, ni comentarios, ni quien la enlace. */}
        {!pagina.virtual && <RelacionesPublicas paginaId={pagina.id} />}
        <BloquesLectura bloques={bloques} comentable={pagina.virtual ? undefined : pagina.id} paginaId={pagina.virtual ? undefined : pagina.id} />
        {!pagina.virtual && <EnlazanAqui paginaId={pagina.id} />}
      </article>
      {pie}
    </MarcoLectura>
    </div>
  );
}

/** La pantalla de «no está» de un sitio: sin marca y sin mandar a nadie
 *  fuera. En el sitio de otra persona, «Ir a humanity.wiki» no es una salida,
 *  es un anuncio. */
export function SinPagina({ titulo, texto, volver }: { titulo: string; texto: string; volver?: string | null }) {
  return (
    <div className="min-h-screen bg-white grid place-items-center px-5">
      <div className="text-center max-w-sm">
        <p className="text-5xl font-black text-slate-200">404</p>
        <h1 className="mt-3 text-lg font-black text-slate-800">{titulo}</h1>
        <p className="mt-1 text-sm text-slate-500">{texto}</p>
        {volver && (
          <Link to={volver} className="inline-block mt-5 h-11 leading-[2.75rem] px-4 rounded-xl bg-slate-900 text-white text-sm font-bold">
            Ir al inicio
          </Link>
        )}
      </div>
    </div>
  );
}

/** Mientras baja: sobrio y sin logo. */
export function Cargando() {
  return (
    <div className="min-h-screen bg-white grid place-items-center">
      <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
    </div>
  );
}
