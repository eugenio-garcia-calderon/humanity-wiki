// ============================================================================
// UNA PORTADA QUE ES UN VÍDEO (2026-10-18, petición de Eugenio)
// ============================================================================
// La portada de una página puede ser una imagen, un vídeo subido (mp4, webm,
// mov…) o un enlace de YouTube o Vimeo. Se guarda en el mismo campo
// (`config.portada`): lo que es se sabe mirando la dirección, igual que con los
// iconos. Sin React ni navegador: lo leen la pantalla y el servidor.

/** ¿Un archivo de vídeo, por su extensión? (las subidas guardan la suya). */
export const esArchivoVideo = (url?: string | null): boolean =>
  !!url && /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(url);

const idYoutube = (url: string) => url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/)?.[1] ?? null;
const idVimeo = (url: string) => url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/)?.[1] ?? null;

/** Dirección del reproductor para un enlace de YouTube o Vimeo: en silencio, en bucle y sin
 *  controles, como fondo de una cabecera. `null` si no es de ninguno de los dos. */
export function reproductorPortada(url?: string | null): string | null {
  if (!url || !/^https:\/\//i.test(url)) return null;
  const yt = idYoutube(url);
  if (yt && /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(url.replace(/^https:\/\/(www\.)?/i, ''))) {
    return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&loop=1&playlist=${yt}&controls=0&rel=0&playsinline=1&modestbranding=1`;
  }
  const vm = idVimeo(url);
  if (vm && /^https:\/\/(www\.|player\.)?vimeo\.com\//i.test(url)) {
    return `https://player.vimeo.com/video/${vm}?autoplay=1&muted=1&loop=1&background=1`;
  }
  return null;
}

/** ¿La portada es un vídeo (subido o enlazado)? */
export const esVideoPortada = (url?: string | null): boolean => esArchivoVideo(url) || !!reproductorPortada(url);
