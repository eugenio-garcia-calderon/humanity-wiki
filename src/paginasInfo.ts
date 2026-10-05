import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Globe, type LucideIcon, UserX, Lock, Gavel, SlidersHorizontal } from 'lucide-react';

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
  /**
   * `false` = se monta la ruta pero NO sale en el menú (i). Para direcciones
   * que tienen que seguir vivas porque alguien de fuera las cita — las tiendas
   * de aplicaciones citan `/privacidad` — pero que ahora se llega a ellas desde
   * otra entrada del menú (Avisos legales, 2026-08-23). Por defecto, sale.
   */
  enMenu?: boolean;
}

// 2026-10-05 — Eugenio: «todas las páginas del desplegable de Humanity Wiki
// elimínalas, ya no son útiles; salvo los avisos legales y Sobre Humanity
// Wiki, que van en el footer». Veracidad, tokenomics, puntuación de
// territorios, herramientas, servidores, seguridad y usabilidad dejan de
// montarse (sus componentes siguen en el repositorio; tokenomics se guardó como
// página privada de Eugenio, «Proyectos pendientes»). Las rutas que citan las
// tiendas de aplicaciones (`/privacidad`, `/borrar-cuenta`) siguen vivas.
export const PAGINAS_INFO: PaginaInfo[] = [
  { ruta: 'sobre-red-humana', titulo: 'Sobre Humanity.wiki', icono: Globe },

  // Cómo borrar tu cuenta. LA EXIGE GOOGLE PLAY: una dirección pública,
  // alcanzable sin la aplicación y sin sesión, que explique el borrado. Sin
  // ella la ficha de Play no se aprueba.
  //
  // ESTA RUTA NO SE CAMBIA. Se pega en la ficha de la tienda, y moverla obliga
  // a volver a pasar revisión. Si algún día hay que moverla, se deja una
  // redirección, nunca un 404.
  // FUERA DEL DESPLEGABLE, PERO NO DE LA APLICACIÓN (2026-08-25). Eugenio: «lo
  // de borrar tu cuenta del menú desplegable ponlo mejor en el apartado de
  // Configuración de cuenta, debajo del icono de usuario». Tiene sentido: es lo
  // único de esta lista que no explica la plataforma, sino que hace algo con TU
  // cuenta — y además algo irreversible.
  //
  // `enMenu: false` la quita del desplegable; **la ruta sigue exactamente donde
  // estaba**, que es lo que no se puede tocar: se pega en la ficha de Google
  // Play y moverla obligaría a pasar revisión otra vez. Ahora se llega desde el
  // menú de tu foto, en `AvatarRail`.
  { ruta: 'borrar-cuenta', titulo: 'Borrar tu cuenta', icono: UserX, enMenu: false,
    componente: lazy(() => import('./pages/BorrarCuentaPublica')) },

  // Qué hacemos con tus datos. LA EXIGEN LAS DOS TIENDAS: App Store Connect no
  // deja enviar la aplicación sin una dirección de política de privacidad que
  // responda, y la ficha de Play tampoco. No existía ninguna: ni ruta, ni
  // fichero, ni texto en el repositorio.
  //
  // ESTA RUTA TAMPOCO SE CAMBIA, por lo mismo que `borrar-cuenta`: se pega en
  // las dos fichas y moverla obliga a volver a pasar revisión.
  // AVISOS LEGALES (2026-08-23, Eugenio: «un apartado que sea avisos legales,
  // y le pones ahí la política de privacidad también»): términos y condiciones
  // (nuevos, escritos por el equipo y marcados como pendientes de revisión
  // legal) + la política de privacidad (la misma página de siempre, embebida).
  // Una sola entrada en el menú; `/privacidad` sigue montada pero oculta del
  // menú, porque las tiendas la citan por esa dirección.
  // Solo para administradores: las cifras del dinero (2026-08-24). Fuera del
  // menú de todos — la pantalla comprueba el nivel y lo dice si no lo tienes.
  { ruta: 'administracion', titulo: 'Administración', icono: SlidersHorizontal, enMenu: false,
    componente: lazy(() => import('./pages/Administracion')) },
  { ruta: 'avisos-legales', titulo: 'Avisos legales', icono: Gavel,
    componente: lazy(() => import('./pages/about/AvisosLegales')) },
  { ruta: 'privacidad', titulo: 'Privacidad', icono: Lock, enMenu: false,
    componente: lazy(() => import('./pages/Privacidad')) },
];
