// ============================================================================
// UNA PORTADA QUE ES UN VÍDEO, CAMBIADA POR UNA FOTO DE LA PÁGINA (2026-11-07)
// ============================================================================
// En Luz del Amazonas la portada es un enlace de YouTube. La cabecera de un proyecto del
// escaparate (`CabeceraProyectoEscaparate.tsx`) pintaba `<img src="https://www.youtube.com/watch?v=…">`,
// una imagen rota, y la cabecera que el servidor escribe en el HTML (`cabeceraSitio.tsx`) metía
// el reproductor con `autoplay`: YouTube y Google cargaban al abrir la página, antes de que
// nadie pidiera ver nada. En los dos sitios va ahora la primera foto propia de la página, como
// en su tarjeta de la portada y en su imagen al compartir (`imagenPropia` en `seoEscaparate.ts`).
// Sin React: lo usan el navegador y el servidor.
import { esVideoPortada } from './videoPortada';

export type FotoPortada = { url: string; alt: string | null };

const esFotoPropia = (u: unknown): u is string => typeof u === 'string' && /^\/uploads\/(?!privado\/)/.test(u);

/** ¿Una portada que no es una foto? Un vídeo subido, un reproductor de YouTube o Vimeo, o un enlace
 *  suyo que el reproductor no reconoce (con `http://`, sin id…): tampoco es una imagen. */
export const portadaEsVideo = (url: unknown): boolean =>
  typeof url === 'string' && (esVideoPortada(url) || /youtu\.?be|youtube-nocookie\.com|vimeo\.com/i.test(url));

/** La primera foto subida de unos bloques (también dentro de otros y de columnas), con su alt. */
function primeraFoto(bloques: unknown, n = 0): FotoPortada | null {
  if (!Array.isArray(bloques) || n > 4) return null;
  for (const b of bloques) {
    if (b?.tipo === 'imagen' && esFotoPropia(b.url)) return { url: b.url, alt: typeof b.alt === 'string' && b.alt.trim() ? b.alt.trim() : null };
    const dentro = primeraFoto(b?.bloques, n + 1)
      || (Array.isArray(b?.columnas) ? b.columnas.map((c: any) => primeraFoto(Array.isArray(c) ? c : c?.bloques, n + 1)).find(Boolean) || null : null);
    if (dentro) return dentro;
  }
  return null;
}

/** La foto de la cabecera: la portada, o si la portada es un vídeo, la primera foto propia de la
 *  página (`null` si no tiene ninguna). Sin portada, ninguna: como siempre. */
export function fotoDePortada(cfg: any): FotoPortada | null {
  const portada = typeof cfg?.portada === 'string' ? cfg.portada.trim() : '';
  if (!portada) return null;
  if (!portadaEsVideo(portada)) return { url: portada, alt: null };
  return primeraFoto(cfg?.bloques);
}
