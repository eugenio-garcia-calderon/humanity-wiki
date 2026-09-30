import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BloquesLectura from '../knowledge/BloquesLectura';
import { useSitio } from './ContextoSitio';
import { cn } from '../../utils/cn';

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

export type DatosPagina = {
  id: string;
  titulo: string;
  config: any;
  indexable?: boolean | null;
  created_at?: string;
  updated_at?: string;
  autor?: { handle?: string; nombre?: string; avatar?: string | null };
  padre?: { id: string; titulo: string; slug: string | null; handle: string } | null;
};

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
  const mostrarAutor = cfg.mostrarAutor === true;
  const mostrarFecha = cfg.mostrarFecha === true;
  const icono: string | null = cfg.icono || null;

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

  return (
    <div className="min-h-screen bg-white">
      {cfg.portada && (
        <div className="h-40 sm:h-64 w-full overflow-hidden bg-slate-100">
          <img src={cfg.portada} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className={cn('mx-auto px-5 sm:px-8 pb-16', cfg.anchoCompleto ? 'max-w-6xl' : 'max-w-3xl',
        cfg.portada ? 'pt-6' : 'pt-8 sm:pt-14')}>
        {aPadre && (
          <Link to={aPadre} className="inline-flex items-center gap-1 mb-4 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> {padre!.titulo || 'Volver'}
          </Link>
        )}
        <article>
          <header className="mb-6">
            {icono && (
              <div className={cn('mb-2', cfg.portada && '-mt-14 sm:-mt-16')}>
                {esUrl(icono)
                  ? <img src={icono} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover bg-white shadow-sm" />
                  : <span className="text-5xl sm:text-6xl leading-none">{icono}</span>}
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 break-words">
              {pagina.titulo || 'Sin título'}
            </h1>
            {(mostrarAutor || mostrarFecha) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                {mostrarAutor && pagina.autor?.avatar && (
                  <img src={pagina.autor.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                )}
                {mostrarAutor && pagina.autor?.nombre && <span>de <b className="text-slate-600">{pagina.autor.nombre}</b></span>}
                {mostrarAutor && mostrarFecha && <span>·</span>}
                {mostrarFecha && <span>{new Date(pagina.updated_at || pagina.created_at || Date.now()).toLocaleDateString('es-ES')}</span>}
              </div>
            )}
          </header>
          <BloquesLectura bloques={bloques} comentable={pagina.id} />
        </article>
        {pie}
      </div>
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
