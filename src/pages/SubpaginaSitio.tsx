import { lazy, Suspense, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import VistaPagina, { Cargando, SinPagina, type DatosPagina } from '../components/sitio/VistaPagina';
import { useSitio, ProveedorSitio, sitioConAnfitrion, sitioEnCasa } from '../components/sitio/ContextoSitio';
import { paginaPrecargada } from '../utils/precargado';
import MuroMiembros, { useLecturaSitio } from '../components/sitio/MuroMiembros';
import BarraMiembro from '../components/sitio/BarraMiembro';
import { conMenuDeSitio } from '../components/sitio/sitioWeb';
import HerramientasPagina from '../components/acceso/HerramientasPagina';
import AplicacionIncrustada from '../components/sitio/AplicacionIncrustada';
import { MarcoLectura } from '../components/sitio/CabeceraLectura';
import CabeceraSitio from '../components/sitio/CabeceraSitio';
import { completarSitio } from '../components/sitio/sitioWeb';

// ============================================================================
// UNA SUBPÁGINA DE UN SITIO PUBLICADO — `/p/:id` (2026-09-30)
// ============================================================================
// Lo que se abre al pinchar una tarjeta de la galería de una página publicada.
// Eugenio: «cuando se pincha en un elemento de la base de datos vuelve a
// aparecer el menú general de Humanity.Wiki, y eso es un error. Tiene que
// permanecer en ese dominio como si fuese una página».
//
// Quién puede verla lo decide el servidor (`sitios.ts`): la página si está
// publicada, o si lo está la página que contiene su base de datos.

import type { ContextoRuta } from '../utils/precargado';

// PÁGINAS QUE SON UNA APLICACIÓN (2026-11-10, Eugenio: el mapa de la teoría
// sintérgica como proyecto de luzhumanidad.com). A page whose
// `config.aplicacion` names one of these shows that screen instead of its
// blocks. The blocks still matter: they are what the project card, the
// server-rendered HTML and search engines read. Lazy, so nobody else on a
// site pays for the map. Add an entry here, never a route in
// AplicacionDeDominio (that would appear on every customer's domain).
const Conciencia = lazy(() => import('./Conciencia'));
const ModeloSocioeconomico = lazy(() => import('./ModeloSocioeconomico'));
const ObservatorioPolarizacion = lazy(() => import('./ObservatorioPolarizacion'));
const APLICACIONES: Record<string, (p: { inicio: string }) => ReactNode> = {
  conciencia: ({ inicio }) => <Conciencia enSitio={{ inicio }} />,
  'modelo-socioeconomico': ({ inicio }) => <ModeloSocioeconomico enSitio={{ inicio }} />,
  'observatorio-polarizacion': () => <ObservatorioPolarizacion />,
};
// EMBEDDED, NOT FULL PAGE (2026-11-12, Eugenio: «que esté embebido en la página
// de luzhumanidad.com, que aparezca el menú de Luz & Humanidad arriba, y que se
// pueda expandir a pantalla completa»). These keep the site's header and menu
// and show the app in a box with a full-screen button (`AplicacionIncrustada`).
// The others still take the whole page.
const INCRUSTADAS = new Set(['modelo-socioeconomico']);

export default function SubpaginaSitio({ propio, idFijo, contexto }: { propio: boolean; idFijo?: string; contexto?: ContextoRuta['contexto'] }) {
  const { id: idDeRuta } = useParams();
  // Por `/p/:id` el id viene en la dirección; por la dirección legible de una
  // ficha (`/powerbanks/anker-737`) lo trae `RutaSitio`.
  const id = idFijo || idDeRuta;
  const sitio = useSitio();
  // Al entrar directamente por `/p/:id`, la página ya viene en el HTML. Si es
  // de un sitio con miembros, se vuelve a pedir con la sesión (ver
  // `useLecturaSitio`), y si es «solo miembros» llega el muro.
  const { pagina, muro, estado, recargar } = useLecturaSitio(id, paginaPrecargada(id) as DatosPagina | null);

  if (estado === 'cargando') return <Cargando />;
  if (muro) return <MuroMiembros muro={muro} paginaId={id} onDentro={recargar} />;
  if (estado !== 'ok' || !pagina) {
    return (
      <SinPagina
        titulo={estado === 'no' ? 'Esta página no está aquí' : 'No se ha podido cargar'}
        texto={estado === 'no' ? 'O nunca existió, o ha dejado de estar publicada.' : 'Inténtalo dentro de un momento.'}
        volver={sitio && propio ? '/' : null}
      />
    );
  }
  const App = APLICACIONES[String(pagina.config?.aplicacion || '')];
  if (App) {
    // No HerramientasPagina here: its comment column would sit on top of the
    // app, which brings its own mailbox.
    const app = <Suspense fallback={<Cargando />}><App inicio={sitio && propio ? '/' : 'https://luzhumanidad.com'} /></Suspense>;
    if (!INCRUSTADAS.has(String(pagina.config?.aplicacion))) return app;
    // The same top as any other page of the site (`VistaPagina`): its frame
    // with the menu (`MarcoLectura`) and, on sites that ask for it, its bar.
    const rutas = sitio && pagina.sitio ? { enlacePagina: sitio.enlacePagina, enlaceBd: sitio.enlaceBd, enlaceBuscar: sitio.enlaceBuscar, raizId: pagina.sitio.raizId } : undefined;
    const menuPropio = !!(pagina.sitio?.config && completarSitio(pagina.sitio.config).menu.activo);
    const conBarra = !!pagina.sitio?.raizId && !menuPropio && pagina.sitio?.config?.barra === true;
    return (
      <MarcoLectura pagina={pagina} rutas={rutas}>
        {conBarra && <CabeceraSitio raizId={pagina.sitio!.raizId} simple={pagina.config?.barraSimple === true} />}
        <main id="contenido">
          <h1 className="sr-only">{pagina.titulo || 'Sin título'}</h1>
          <AplicacionIncrustada titulo={pagina.titulo || ''}>{app}</AplicacionIncrustada>
        </main>
      </MarcoLectura>
    );
  }
  return <>
    <VistaPagina pagina={pagina} propio={propio} contexto={contexto} />
    {pagina.miembros?.raiz && <BarraMiembro raiz={pagina.miembros.raiz} paginaId={pagina.id} onCambio={recargar} conMenu={conMenuDeSitio(pagina)} />}
      <HerramientasPagina key={pagina.id} paginaId={pagina.id} raiz="article" contarVisita />
  </>;
}

/** Por subdominio: `quien.humanity.wiki/p/:id`. */
export function SubpaginaEnEspacio() {
  return (
    <ProveedorSitio sitio={sitioConAnfitrion(null)}>
      <SubpaginaSitio propio />
    </ProveedorSitio>
  );
}

/**
 * LA HUMANIDAD — `humanity.wiki/humanidad` (2026-11-05, la reestructuración).
 * La página «La Humanidad» (copiada de la portada de luzhumanidad.com, con sus
 * vistas de círculo, pirámide, sociedad y flujo) es parte fija de la
 * plataforma: una dirección corta propia, sin arroba. Es una página publicada
 * normal —sus datos siguen en las tablas de siempre— servida con el contexto
 * del espacio de Eugenio (`@luz`), que es donde viven sus subpáginas.
 */
export const HUMANIDAD_PORTADA_ID = 'KWMHUMANIDAD';
export function LaHumanidad() {
  return (
    <ProveedorSitio sitio={sitioEnCasa('luz')}>
      <SubpaginaSitio propio={false} idFijo={HUMANIDAD_PORTADA_ID} />
    </ProveedorSitio>
  );
}

/** En casa: `humanity.wiki/@quien/p/:id`. */
export function SubpaginaEnCasa() {
  const { arroba } = useParams();
  if (!arroba?.startsWith('@')) return <SinPagina titulo="Esta página no está aquí" texto="La dirección no es correcta." volver="/" />;
  return (
    <ProveedorSitio sitio={sitioEnCasa(arroba.slice(1))}>
      <SubpaginaSitio propio={false} />
    </ProveedorSitio>
  );
}
