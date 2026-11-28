import { useSyncExternalStore } from 'react';

// LA BARRA SE ESCONDE AL BAJAR, EN EL MÓVIL (2026-11-28, Eugenio: «cuando se haga scroll down, que desaparezca el
// menú, tanto el selector de temas como el logo, para que se pueda ver bien la página. Y cuando se vuelva a hacer
// scroll up, que sí aparezca de nuevo el menú con los temas»).
//
// One shared answer to «is the bar hidden?», so the site bar (CabeceraSitio) and the areas menu under it
// (disenoUno/PortadaDisenoUno → MenuAreas) move together. Only on phones (narrower than Tailwind's `sm`, 640 px):
// on a computer nothing changes. Never hidden near the top of the page, nor while something in the bar is open
// or being typed in (the ☰ menu, the search field): hiding a menu you are using would be a trap.
// A little hysteresis (24 px in the same direction) so a finger resting on the screen does not make it flicker.

const MOVIL = '(max-width: 639.98px)';
const UMBRAL = 24;
const ARRIBA = 80;

let oculta = false;
let instalada = false;
const oyentes = new Set<() => void>();

function poner(v: boolean) {
  if (v === oculta) return;
  oculta = v;
  oyentes.forEach(f => f());
}

function enUso(): boolean {
  const cab = document.querySelector('[data-cabecera-sitio]');
  if (!cab) return false;
  if (cab.querySelector('[aria-expanded="true"]')) return true;
  const a = document.activeElement;
  return !!(a && cab.contains(a) && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'));
}

function instalar() {
  if (instalada || typeof window === 'undefined') return;
  instalada = true;
  const movil = window.matchMedia(MOVIL);
  let ultimo = window.scrollY, recorrido = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY, d = y - ultimo;
    ultimo = y;
    if (!movil.matches || y < ARRIBA) { recorrido = 0; poner(false); return; }
    if (d === 0) return;
    if (Math.sign(d) !== Math.sign(recorrido)) recorrido = 0;
    recorrido += d;
    if (recorrido > UMBRAL && !enUso()) poner(true);
    else if (recorrido < -UMBRAL) poner(false);
  }, { passive: true });
  movil.addEventListener?.('change', () => poner(false));
}

function suscribir(f: () => void) {
  instalar();
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

/** True while the site bar should be out of sight (phone, scrolling down). */
export function useBarraOculta(): boolean {
  return useSyncExternalStore(suscribir, () => oculta, () => false);
}
