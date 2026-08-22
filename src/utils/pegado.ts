// ============================================================================
// PEGAR (2026-08-19, petición de Eugenio: «si tengo algo en el portapapeles y
// quiero pegarlo, que haga ⌘V y se pegue en el formato que sea, ya sea una
// imagen, un vídeo y se hace embed, un archivo pdf, etc.»).
//
// UN SOLO SITIO decide en qué se convierte lo que traes. Lo usan el lienzo
// (grafos y Mi Conocimiento) y el editor de documentos: si cada uno tuviera su
// propia tabla de formatos, pegar el mismo PDF daría cosas distintas según
// dónde lo sueltes, que es exactamente lo que pasaba hasta hoy.
//
// El mismo camino sirve para PEGAR y para ARRASTRAR: los dos entregan un
// `DataTransfer`, y de ahí sale siempre la misma lista de piezas.
// ============================================================================

import { subirArchivo } from './subir';
/** Una pieza ya resuelta: se sabe qué es y dónde vive. */
export type Pegado =
  | { clase: 'imagen'; url: string; nombre: string }
  | { clase: 'video'; url: string; nombre: string }
  // Se guarda también la URL entera: el lienzo solo necesita el identificador
  // para incrustar, pero el Mapa 3D guarda el enlace tal cual.
  | { clase: 'youtube'; id: string; url: string }
  | { clase: 'vimeo'; id: string; url: string }
  | { clase: 'audio'; url: string; nombre: string }
  | { clase: 'pdf'; url: string; nombre: string; bytes: number }
  | { clase: 'archivo'; url: string; nombre: string; bytes: number }
  | { clase: 'enlace'; url: string; nombre: string }
  | { clase: 'texto'; cuerpo: string; titulo: string };

/** «1,4 MB», «318 KB» — para el pie de un archivo. */
export function tamanoLegible(bytes: number): string {
  const kb = Math.max(1, Math.round(bytes / 1024));
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

const sinExtension = (n: string) => n.replace(/\.[^.]+$/, '');

// ---------------------------------------------------------------------------
// URLs de vídeo
// ---------------------------------------------------------------------------
/** El identificador de YouTube en cualquiera de sus cinco formas de URL. */
export function idYoutube(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** El identificador de Vimeo (`vimeo.com/123456789`). */
export function idVimeo(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,12})/);
  return m ? m[1] : null;
}

const esUrl = (t: string) => /^https?:\/\/\S+$/i.test(t.trim());

/**
 * Una URL suelta, clasificada por su extensión. Pegar el enlace de una imagen
 * la pinta; pegar el de un MP4 lo reproduce. No se descarga nada: se enlaza al
 * original, que es lo correcto para algo que ya vive en otro sitio.
 */
function porExtension(url: string): Pegado {
  const limpia = url.split(/[?#]/)[0];
  const nombre = decodeURIComponent(limpia.split('/').pop() || '') || limpia.replace(/^https?:\/\//, '');
  const yt = idYoutube(url);
  if (yt) return { clase: 'youtube', id: yt, url };
  const vm = idVimeo(url);
  if (vm) return { clase: 'vimeo', id: vm, url };
  if (/\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(limpia)) return { clase: 'imagen', url, nombre: sinExtension(nombre) };
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(limpia)) return { clase: 'video', url, nombre: sinExtension(nombre) };
  if (/\.(mp3|m4a|ogg|wav|aac|flac)$/i.test(limpia)) return { clase: 'audio', url, nombre: sinExtension(nombre) };
  if (/\.pdf$/i.test(limpia)) return { clase: 'pdf', url, nombre: sinExtension(nombre), bytes: 0 };
  return { clase: 'enlace', url, nombre: url.replace(/^https?:\/\//, '').slice(0, 60) };
}

// ---------------------------------------------------------------------------
// Archivos
// ---------------------------------------------------------------------------
/** Sube un archivo y devuelve la pieza que le corresponde. */
async function subir(f: File): Promise<Pegado> {
  const j = await subirArchivo(f);
  if (j.error) throw new Error(j.error);

  const nombre = sinExtension(f.name).slice(0, 60) || 'Archivo';
  // El SERVIDOR dice de qué clase es: él decide la extensión y él sabe qué se
  // sirve en línea. Repetir la tabla de MIME aquí sería tenerla en dos sitios.
  switch (j.clase as string) {
    // Un SVG se sirve como descarga a propósito (podría ejecutar cosas en
    // nuestro dominio), así que no se pinta como imagen aunque lo sea.
    case 'imagen':
      return f.type === 'image/svg+xml'
        ? { clase: 'archivo', url: j.url, nombre, bytes: j.bytes }
        : { clase: 'imagen', url: j.url, nombre };
    case 'video': return { clase: 'video', url: j.url, nombre };
    case 'audio': return { clase: 'audio', url: j.url, nombre };
    case 'pdf': return { clase: 'pdf', url: j.url, nombre, bytes: j.bytes };
    default: return { clase: 'archivo', url: j.url, nombre, bytes: j.bytes };
  }
}

/**
 * Cuando copias una imagen DESDE UNA PÁGINA WEB, el navegador no pone el
 * archivo en el portapapeles: pone el HTML del trozo copiado. Sin esto, pegar
 * una foto de una web daba una nota vacía o el texto alternativo.
 */
function imagenDelHtml(html: string): string | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const imgs = Array.from(doc.querySelectorAll('img'));
  if (imgs.length !== 1) return null;               // un trozo con texto y fotos es texto
  if (doc.body.textContent?.trim()) return null;
  const src = imgs[0].getAttribute('src') || '';
  return /^https?:\/\//i.test(src) ? src : null;
}

// ---------------------------------------------------------------------------
// La entrada
// ---------------------------------------------------------------------------
/**
 * Todo lo que trae el portapapeles (o el arrastre), ya resuelto y subido.
 * Devuelve una lista porque se pueden pegar varios archivos de una vez.
 *
 * `alSubir` se llama antes de cada subida para poder decir «Subiendo 2 de 5…»:
 * un vídeo de 40 MB tarda, y sin aviso parece que la aplicación se ha colgado.
 */
export async function leerPegado(
  dt: DataTransfer,
  alSubir?: (hecho: number, total: number, nombre: string) => void,
): Promise<Pegado[]> {
  const archivos = Array.from(dt.files || []);
  if (archivos.length) {
    const out: Pegado[] = [];
    for (let i = 0; i < archivos.length; i++) {
      alSubir?.(i, archivos.length, archivos[i].name);
      out.push(await subir(archivos[i]));
    }
    return out;
  }

  const texto = (dt.getData('text/plain') || '').trim();

  const html = dt.getData('text/html');
  if (html) {
    const src = imagenDelHtml(html);
    // Una imagen copiada de una web: se enlaza a la original. Si además venía
    // una URL en el texto plano, esa manda (es lo que el usuario ve copiado).
    if (src && (!texto || !esUrl(texto))) {
      const nombre = decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || '') || 'Imagen';
      return [{ clase: 'imagen', url: src, nombre: sinExtension(nombre).slice(0, 60) }];
    }
  }

  if (!texto) return [];
  if (esUrl(texto)) return [porExtension(texto)];
  return [{ clase: 'texto', cuerpo: texto, titulo: texto.split('\n')[0].slice(0, 60) || 'Nota' }];
}

/**
 * ¿Este pegado es para nosotros? Nunca se le roba el ⌘V a un campo de texto:
 * el chat, un formulario o el propio editor de documentos ya saben qué hacer
 * con lo que se pega dentro de ellos.
 */
export function enCampoDeTexto(destino: EventTarget | null): boolean {
  const t = destino as HTMLElement | null;
  if (!t || !t.tagName) return false;
  return t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || !!t.isContentEditable;
}
