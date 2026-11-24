// ¿LLEVA ESTA PÁGINA LA BARRA DEL SITIO? (2026-11-25, Eugenio: «quita la cabecera de luz&humanidad en aeromovil.org»)
// ============================================================================
// La barra de Luz & Humanidad (logo, buscador, menú, «Participa») la piden los sitios con `sitio.barra` y la llevan todas
// sus páginas. Pero un proyecto del sitio puede tener su PROPIA web (un dominio comprado para él, como aeromovil.org):
// allí la barra de otro sitio sobra, y sus enlaces —relativos al anfitrión— llevaban a páginas que no existen en esa web
// («Participa» daba un 404). La web propia de un proyecto no lleva la barra de la web madre.
//
// «Web propia» = el anfitrión abre una página distinta de la raíz del sitio al que pertenece la página, y no es un subdominio
// de la plataforma (`*.humanity.wiki`: esos son sitios de la casa y conservan su barra, como Wikiproducts).
import type { Sitio } from './ContextoSitio';

const PLATAFORMA = /(^|\.)humanity\.wiki$/i;

export function esWebPropiaDeProyecto(raizDelSitio: string | null | undefined, anfitrion: Pick<Sitio, 'raizId'> | null, host: string): boolean {
  const raizAnfitrion = anfitrion?.raizId;
  return !!raizDelSitio && !!raizAnfitrion && raizAnfitrion !== raizDelSitio && !!host && !PLATAFORMA.test(host);
}

/** El nombre del anfitrión de esta pestaña (vacío en el servidor). */
export const anfitrionActual = () => (typeof window === 'undefined' ? '' : window.location.hostname);
