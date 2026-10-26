import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import BloquesLectura from '../knowledge/BloquesLectura';
import { LecturaBloqueDatos } from '../bloquesDatos/registro';
import EnlazanAqui from '../knowledge/EnlazanAqui';
import { contarPagina, textoLectura } from '../../utils/ajustesPagina';
import { GaleriaHijasLectura } from '../knowledge/PaginasHijas';
import RedRelaciones, { AccionesPagina } from './RedRelaciones';
import type { ContextoRuta } from '../../utils/precargado';
import SugerirCorreccion from '../bloquesDatos/ficha/SugerirCorreccion';
import { useSitio } from './ContextoSitio';
import { useEsMovil } from '../../hooks/useEsMovil';
import { MarcoLectura, CabeceraLectura } from './CabeceraLectura';
import { cn } from '../../utils/cn';
import { miniatura } from '../../utils/miniatura';
import CabeceraSitio from './CabeceraSitio';

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

export default function VistaPagina({ pagina, propio, pie, contexto }: {
  pagina: DatosPagina;
  /** Entrando por `madre/pestaña/entrada`: esas dos van en las migas (2026-10-21). */
  contexto?: ContextoRuta['contexto'];
  /** Dominio propio o subdominio: el título de la pestaña no lleva la marca
   *  de la plataforma y el icono de la página hace de favicon. */
  propio: boolean;
  /** Lo que va debajo (una cesta, un pie). */
  pie?: ReactNode;
}) {
  const sitio = useSitio();
  const cfg = pagina.config || {};
  const todos = cfg.bloques || cfg.blocks || [];
  // EL TERMÓMETRO COMO CABECERA (2026-10-25): si la página empieza por él, él
  // lleva el título, la portada y la descripción; debajo, la red y lo demás.
  const termo = !pagina.virtual && todos[0]?.tipo === 'termometro' ? todos[0] : null;
  const bloques = termo ? todos.slice(1) : todos;
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

  // LA MIGA DE PAN (2026-10-18): Inicio › Energía portátil › Powerbanks ›
  // esta página, sin salir del sitio. Si el servidor no trae el camino
  // entero, sólo la madre, como antes.
  const padre = pagina.padre;
  const enlaceDe = (m: NonNullable<DatosPagina['padre']>) => sitio
    ? (sitio.raizId === m.id || pagina.sitio?.raizId === m.id ? '/' : m.slug ? sitio.enlaceSlug(m.slug, m.handle) : sitio.enlacePagina(m.id))
    : null;
  const migas = sitio ? (pagina.migas?.length ? pagina.migas : padre ? [padre] : []) : [];
  // En su contexto: Inicio › Movilidad › Líneas de desarrollo › esta entrada.
  const migasContexto = sitio && contexto ? [
    ...(pagina.sitio?.raizId ? [{ clave: 'inicio', titulo: 'Inicio', href: '/' }] : []),
    { clave: 'madre', titulo: contexto.madre.titulo, href: contexto.madre.camino },
    { clave: 'grupo', titulo: contexto.grupo.nombre, href: contexto.grupo.camino },
  ] : null;
  const esRaiz = !!pagina.sitio?.raizId && pagina.sitio.raizId === pagina.id;

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
  const rutas = sitio && pagina.sitio ? { enlacePagina: sitio.enlacePagina, enlaceBd: sitio.enlaceBd, enlaceBuscar: sitio.enlaceBuscar, raizId: pagina.sitio.raizId } : undefined;

  // El final de la ruta, con el termómetro de cabecera: la portada tal cual (sin fondo) y el título.
  const portadaRuta: string | null = cfg.portada || (icono && esUrl(icono) ? icono : null);
  const tituloEnRuta = (
    <li aria-current="page" className="flex min-w-0 items-center gap-2">
      {portadaRuta ? <img src={miniatura(portadaRuta, 120)} alt="" className="h-10 w-10 shrink-0 object-contain" /> : icono ? <span className="text-3xl leading-none">{icono}</span> : null}
      <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{pagina.titulo || 'Sin título'}</h1>
    </li>
  );
  return (
    <div onClickCapture={alPinchar}>
    <MarcoLectura pagina={pagina} rutas={rutas}>
      {/* LA CABECERA DEL SITIO Y LA RUTA CENTRADA (2026-10-26, Eugenio: «que aparezca Luz &
          Humanidad como logo con el menú completo; y arriba centrado Movilidad en una ruta web,
          con su imagen de portada sin ningún color»). Solo con el termómetro de cabecera. */}
      {termo && pagina.sitio?.raizId && !esRaiz && <CabeceraSitio raizId={pagina.sitio.raizId} />}
      {/* Saltar al contenido, para quien va con el teclado (bot de UX, ronda 3). */}
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:shadow-lg">Saltar al contenido</a>
      <div className={termo ? 'mb-4' : undefined}>
      {migasContexto ? (
        <nav aria-label="Estás en" className={termo ? undefined : 'mb-4'}>
          <ol className={cn('flex flex-wrap items-center gap-x-1 gap-y-1 text-base text-slate-600', termo && 'justify-center')}>
            {migasContexto.map((m, i) => (
              <li key={m.clave} className={cn('items-center gap-1', i === migasContexto.length - 1 ? 'flex' : 'hidden sm:flex')}>
                {i === migasContexto.length - 1 ? <ChevronLeft className="w-4 h-4 text-slate-500 sm:hidden" aria-hidden /> : null}
                <Link to={m.href} className="font-bold hover:text-slate-900 hover:underline py-3">{m.titulo}</Link>
                <ChevronRight className={cn('w-4 h-4 text-slate-500', i === migasContexto.length - 1 && 'hidden sm:block')} aria-hidden />
              </li>
            ))}
            {termo ? tituloEnRuta : <li aria-current="page" className="hidden sm:block text-slate-700 truncate max-w-full">{pagina.titulo || 'Sin título'}</li>}
          </ol>
        </nav>
      ) : migas.length > 0 && (
        <nav aria-label="Estás en" className={termo ? undefined : 'mb-4'}>
          <ol className={cn('flex flex-wrap items-center gap-x-1 gap-y-1 text-base text-slate-600', termo && 'justify-center')}>
            {/* On a phone, one line: only the level just above, the way back.
                The full trail took three lines before the title (evaluator
                round 2, 2026-10-18); from `sm` up it is all there. */}
            {migas.map((m, i) => (
              <li key={m.id} className={cn('items-center gap-1', i === migas.length - 1 ? 'flex' : 'hidden sm:flex')}>
                {i === migas.length - 1 ? <ChevronLeft className="w-4 h-4 text-slate-500 sm:hidden" aria-hidden /> : null}
                <Link to={enlaceDe(m) || '/'} className="font-bold hover:text-slate-900 hover:underline py-3">
                  {i === 0 && (sitio?.raizId === m.id || pagina.sitio?.raizId === m.id) ? 'Inicio' : (m.titulo || 'Volver')}
                </Link>
                <ChevronRight className={cn('w-4 h-4 text-slate-500', i === migas.length - 1 && 'hidden sm:block')} aria-hidden />
              </li>
            ))}
            {termo ? tituloEnRuta : <li aria-current="page" className="hidden sm:block text-slate-700 truncate max-w-full">{pagina.titulo || 'Sin título'}</li>}
          </ol>
        </nav>
      )}
      {termo && !migasContexto && !migas.length && <div className="flex justify-center">{tituloEnRuta}</div>}
      </div>
      {/* La región principal, para los lectores de pantalla (bot de UX, ronda 1). */}
      <main id="contenido" tabIndex={-1} className="outline-none">
      <article>
        {termo
          ? <LecturaBloqueDatos bloque={{ ...termo, datos: { ...(termo.datos || {}), comoCabecera: true } }} paginaId={pagina.id} />
          : <CabeceraLectura pagina={pagina} esMovil={esMovil} />}
        {/* Si es la página de una fila: con qué está conectada (solo lo que tiene algo). */}
        {cfg.tiempoLectura === true && (() => {
          const c = contarPagina(bloques);
          return c.palabras > 0 ? <p className="-mt-4 mb-6 text-xs font-bold text-slate-400" data-tiempo-lectura>{textoLectura(c.palabras, c.minutos)}</p> : null;
        })()}
        {/* La página de una base de datos no es una página de verdad: no tiene
            relaciones, ni comentarios, ni quien la enlace. */}
        {/* A product sheet (W1) already shows its brand, claims, recalls and
            offers in its own blocks: the generic list would say it twice. */}
        {/* SEGUIR Y LA RED DE LA PÁGINA (2026-10-21): bajo la cabecera, las acciones y
            las pestañas de lo relacionado, con su galería (`RedRelaciones.tsx`). */}
        {/* Con el termómetro de cabecera, las pestañas de la red van justo debajo,
            en la primera pantalla (2026-10-25: «que se vea que hay muchas opciones
            donde pinchar sin bajar»); seguir y compartir, después. */}
        {!pagina.virtual && !esRaiz && !termo && <AccionesPagina paginaId={pagina.id} />}
        {/* Las páginas hijas en galería (2026-10-23, `PaginasHijas.tsx`). */}
        {!pagina.virtual && !termo && <GaleriaHijasLectura config={(pagina as any).config} />}
        {/* También en las fichas: la red es la forma de llegar a lo relacionado. */}
        {!pagina.virtual && <RedRelaciones paginaId={pagina.id} titulo={pagina.titulo || ''} autorHandle={pagina.autor?.handle} esRaiz={esRaiz} />}
        {termo && <GaleriaHijasLectura config={(pagina as any).config} titulo={`Páginas dentro de ${pagina.titulo || 'esta página'}`} />}
        {termo && !esRaiz && <AccionesPagina paginaId={pagina.id} />}
        <BloquesLectura bloques={bloques} comentable={pagina.virtual ? undefined : pagina.id} paginaId={pagina.virtual ? undefined : pagina.id} />
        {!pagina.virtual && (pagina as any).ficha && <SugerirCorreccion paginaId={pagina.id} />}
        {!pagina.virtual && <EnlazanAqui paginaId={pagina.id} />}
      </article>
      </main>
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
        <p className="mt-1 text-base text-slate-500">{texto}</p>
        {volver && (
          <Link to={volver} className="inline-block mt-5 h-11 leading-[2.75rem] px-4 rounded-xl bg-slate-900 text-white text-base font-bold">
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
