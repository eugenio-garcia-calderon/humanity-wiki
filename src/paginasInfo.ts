import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Globe, BadgeCheck, Wrench, ShieldAlert, Server, Scale, type LucideIcon , Hand} from 'lucide-react';

// =====================================================================// LAS PÁGINAS DE LA «i» (2026-08-22)
// =====================================================================// The pages that EXPLAIN the platform, as opposed to being the platform. One
// list, read from two places: `App.tsx` mounts the routes and `Layout.tsx`
// paints the (i) menu in the top bar.
//
// WHY A LIST AND NOT TWO EDITS. On the afternoon of 2026-08-22, five
// programmers needed an entry in this same menu and a route in this same place
// — five pull requests over the same twenty lines of `Layout.tsx`, with a
// conflict in every one of them. A list that only ever grows at the end almost
// never conflicts, and adding a page is now one line here instead of two edits
// in two files everybody is editing.
//
// This file changes NOTHING on screen: the two entries below are the two that
// already existed, in the same order, with the same words and the same icons.

export interface PaginaInfo {
  /** Path relative to the app root, with no leading slash — as `App.tsx` wants it. */
  ruta: string;
  titulo: string;
  icono: LucideIcon;
  /**
   * The page itself, loaded lazily:
   * `componente: lazy(() => import('./pages/Loquesea'))`.
   *
   * Optional, and that is the point: a page whose route is already mounted
   * somewhere else in `App.tsx` (these two, today) appears in the menu without
   * one, and nothing gets mounted twice. A NEW page carries it and needs no
   * other file touched.
   *
   * Lazy on purpose: none of these pages is on anybody's critical path, and
   * loading them at startup would slow the app down for the sake of a page
   * most people read once.
   */
  componente?: LazyExoticComponent<ComponentType<any>>;
}

export const PAGINAS_INFO: PaginaInfo[] = [
  { ruta: 'veracidad', titulo: 'Veracidad', icono: Scale,
    componente: lazy(() => import('./pages/Veracidad')) },
  { ruta: 'sobre-red-humana', titulo: 'Sobre Humanity.wiki', icono: Globe },
  { ruta: 'sobre-red-humana/puntuacion-territorios', titulo: 'Puntuación de territorios', icono: BadgeCheck },
  // Qué hace cada herramienta y QUÉ LE FALTA, con las cifras leídas de la base
  // de datos al abrirla. Va aquí porque explica la plataforma, no porque sea
  // una herramienta más (Eugenio, 2026-08-22: «que esa página sea el dashboard
  // de información y seguimiento de cómo avanzan las herramientas»).
  { ruta: 'herramientas', titulo: 'Cómo van las herramientas', icono: Wrench,
    componente: lazy(() => import('./pages/EstadoHerramientas')) },

  // Servidores: dónde vive esto, qué cuesta de verdad y qué queda por hacer.
  // El coste sale de `/api/gasto`, que ya era público — la página no abre nada
  // nuevo, lo enseña (2026-08-22, Eugenio: «de forma transparente a nivel de
  // coste»).
  { ruta: 'sobre-red-humana/servidores', titulo: 'Servidores', icono: Server,
    componente: lazy(() => import('./pages/about/Servidores')) },

  // Seguridad: EL TABLERO NO SE VE SIN PERMISO, y el candado está en el
  // servidor, no aquí. Aparecer en este menú solo pone el enlace a la vista;
  // quien no sea del equipo abre la página y encuentra un aviso, no la lista.
  // Está en el menú a propósito: que exista un sitio donde se trabaja esto es
  // parte de lo que se cuenta, aunque el contenido no lo sea.
  { ruta: 'seguridad', titulo: 'Seguridad', icono: ShieldAlert,
    componente: lazy(() => import('./pages/Seguridad')) },

  // Usabilidad: los principios que sigue la interfaz y el plan para mejorarla,
  // cada uno con el fallo real que lo puso ahí (2026-08-22, Eugenio: «mete
  // todos los principios y planes para mejorar la usabilidad de la
  // plataforma»). Va en este menú porque explica cómo se decide lo que ves, que
  // es tan parte de la plataforma como lo que hace.
  { ruta: 'usabilidad', titulo: 'Usabilidad', icono: Hand,
    componente: lazy(() => import('./pages/Usabilidad')) },
];
