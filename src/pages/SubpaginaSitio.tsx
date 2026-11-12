import { lazy, Suspense, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import VistaPagina, { Cargando, SinPagina, type DatosPagina } from '../components/sitio/VistaPagina';
import { useSitio, ProveedorSitio, sitioConAnfitrion, sitioEnCasa } from '../components/sitio/ContextoSitio';
import { paginaPrecargada } from '../utils/precargado';
import MuroMiembros, { useLecturaSitio } from '../components/sitio/MuroMiembros';
import BarraMiembro from '../components/sitio/BarraMiembro';
import { conMenuDeSitio } from '../components/sitio/sitioWeb';
import HerramientasPagina from '../components/acceso/HerramientasPagina';
import CabeceraSitio from '../components/sitio/CabeceraSitio';
import AplicacionIncrustada from '../components/sitio/AplicacionIncrustada';

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
const APLICACIONES: Record<string, (p: { inicio: string; conBarra: boolean }) => ReactNode> = {
  conciencia: ({ inicio, conBarra }) => <Conciencia enSitio={{ inicio, conBarra }} />,
  'modelo-socioeconomico': ({ inicio }) => <ModeloSocioeconomico enSitio={{ inicio }} />,
  'observatorio-polarizacion': () => <ObservatorioPolarizacion />,
};
// Apps that sit under the site's own top bar, like any other page of the site
// (2026-11-12, Eugenio on the consciousness map: «haz que aparezca el menú
// superior de luzhumanidad.com en esta página»). Opt-in, so the other apps
// keep their full screen until someone asks; an app that joins must leave room
// for the bar in its own heights (see `conBarra` in Conciencia.tsx).
// The observatorio too (2026-11-12, Eugenio: «pon el menú superior en el observatorio de polarización»).
const CON_BARRA = new Set(['conciencia', 'observatorio-polarizacion']);
// EMBEDDED IN THE PAGE (2026-11-12, Eugenio: «que el modelo socioeconómico esté
// embebido en la página de luzhumanidad.com, que aparezca el menú de Luz &
// Humanidad arriba, y que se pueda expandir a pantalla completa y salir»).
// The site's bar on top and the app as the rest of the page, scrolling with
// it; a full-screen button in the app's header hides the bar (`AplicacionIncrustada`).
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
  const nombreApp = String(pagina.config?.aplicacion || '');
  const App = APLICACIONES[nombreApp];
  if (App) {
    // The same rule as VistaPagina: only sites that ask for the bar (`sitio.barra`).
    const incrustada = INCRUSTADAS.has(nombreApp);
    const conBarra = (CON_BARRA.has(nombreApp) || incrustada) && !!pagina.sitio?.raizId && pagina.sitio?.config?.barra === true;
    if (incrustada) return <Suspense fallback={<Cargando />}>
      {/* The spacer is what the bar's negative top margin pulls into (see the CON_BARRA branch). */}
      {conBarra && <><div aria-hidden data-espacio-barra className="h-[18px] sm:h-5" /><CabeceraSitio raizId={pagina.sitio!.raizId} /></>}
      {/* The app is the rest of the page (its own <main> and <h1>); -mt-4 undoes the bar's mb-4. */}
      <div className={conBarra ? '-mt-4' : undefined}>
        <AplicacionIncrustada>
          <App inicio={sitio && propio ? '/' : 'https://luzhumanidad.com'} conBarra={false} />
        </AplicacionIncrustada>
      </div>
    </Suspense>;
    return <Suspense fallback={<Cargando />}>
      {conBarra && <>
        {/* The bar pulls itself up over the reading page's top margin (-mt-[18px] / sm:-mt-5);
            here there is no such margin, so this spacer gives it one. */}
        <div aria-hidden className="h-[18px] sm:h-5" />
        <CabeceraSitio raizId={pagina.sitio!.raizId} />
      </>}
      {/* …and its mb-4 would leave a white strip above a dark app. */}
      <div className={conBarra ? '-mt-4' : undefined}>
        <App inicio={sitio && propio ? '/' : 'https://luzhumanidad.com'} conBarra={conBarra} />
      </div>
    </Suspense>;
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
