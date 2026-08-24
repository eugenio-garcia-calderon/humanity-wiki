import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { OBJETIVOS, hablaDe } from '../../utils/objetivos';
import { cn } from '../../utils/cn';

/*
 * LA PORTADA DE UNA TARJETA (2026-08-24, agente de APP/UX)
 * ============================================================================
 * Eugenio: «muestra arriba solo las que tengan alguna imagen o vídeo de
 * portada, las que tengan vídeo dales prioridad, y permite que si hago hover
 * con el ratón se reproduzca el vídeo en un tamaño algo más grande que la
 * tarjeta».
 *
 * DE DÓNDE SALE UNA PORTADA, hoy, medido contra la base real:
 *   · `kind: 'video'`  → `config.youtube_id`  (un vídeo de YouTube)
 *   · `kind: 'imagen'` → `config.image_url`
 *   · el muro          → `config.media[]`, con `tipo` imagen o vídeo
 *
 * Y NO SE INVENTA NINGUNA. Una tarjeta sin portada no recibe una imagen de
 * relleno ni un degradado con sus iniciales: se queda abajo, en la parte de la
 * lista donde manda el texto. Rellenar el hueco haría que «tiene foto» dejara
 * de significar nada, que es justo el criterio con el que se ordena la página.
 */

export interface Portada {
  clase: 'video' | 'imagen';
  /** La imagen que se ve quieta. */
  imagen: string;
  /** El vídeo que se reproduce al pasar el ratón, si lo hay. */
  youtube?: string;
  fichero?: string;
}

export function portadaDe(item: any): Portada | null {
  const c = item?.config || {};
  if (c.youtube_id) {
    return {
      clase: 'video',
      // La miniatura de YouTube: se ve al instante y no carga un reproductor
      // hasta que alguien se para encima. Trece reproductores en una rejilla
      // serían trece iframes de terceros en la primera pantalla.
      imagen: `https://i.ytimg.com/vi/${c.youtube_id}/hqdefault.jpg`,
      youtube: c.youtube_id,
    };
  }
  const media: any[] = Array.isArray(c.media) ? c.media : [];
  const video = media.find(m => m?.tipo === 'video' && m?.url);
  if (video) return { clase: 'video', imagen: video.poster || '', fichero: video.url };
  const imagen = media.find(m => m?.tipo === 'imagen' && m?.url);
  if (imagen) return { clase: 'imagen', imagen: imagen.url };
  if (c.image_url) return { clase: 'imagen', imagen: c.image_url };
  return null;
}

/** De qué temas habla, para la etiqueta. Mismo criterio que el filtro. */
export function temasDe(item: any): typeof OBJETIVOS {
  const texto = `${item?.titulo || ''} ${item?.config?.body || ''} ${(item as any)?.resumen || ''}`;
  return OBJETIVOS.filter(o => hablaDe(texto, o));
}

/**
 * La imagen de una tarjeta. Al pasar el ratón, si hay vídeo, se reproduce **y
 * crece un poco saliéndose del marco**, que es lo que pidió Eugenio.
 *
 * Crece con `scale` y no cambiando el tamaño de la caja: así no empuja a las
 * tarjetas vecinas. Una rejilla que se reordena cuando pasas el ratón por
 * encima es una rejilla que no se puede leer.
 */
export function ImagenDePortada({ portada, titulo }: { portada: Portada; titulo: string }) {
  const [encima, setEncima] = useState(false);
  const [rota, setRota] = useState(false);
  const reproductor = useRef<HTMLVideoElement>(null);

  // Se reproduce al pasar el ratón y se rebobina al salir, para que la
  // siguiente vez vuelva a empezar por el principio y no por donde se quedó.
  useEffect(() => {
    const v = reproductor.current;
    if (!v) return;
    if (encima) { v.play().catch(() => {}); }
    else { v.pause(); v.currentTime = 0; }
  }, [encima]);

  return (
    <div
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      className="relative aspect-video w-full overflow-visible rounded-xl bg-slate-100"
    >
      <div className={cn(
        'absolute inset-0 overflow-hidden rounded-xl transition-transform duration-300 ease-out',
        encima && portada.clase === 'video' ? 'z-20 scale-[1.12] shadow-2xl' : '',
      )}>
        {/* Quieta: la miniatura. Siempre, aunque haya vídeo — así la rejilla se
            pinta entera sin esperar a ningún reproductor. */}
        {portada.imagen && !rota && (
          <img
            src={portada.imagen}
            alt=""
            loading="lazy"
            // UNA FOTO QUE YA NO EXISTE deja el icono roto del navegador dentro
            // de la tarjeta. Si no carga se retira y queda el fondo liso: la
            // tarjeta pierde la foto, no la dignidad.
            onError={() => setRota(true)}
            // LA MINIATURA NO SE APAGA AL PASAR EL RATÓN: el reproductor de
            // YouTube tarda en pintar y, si la foto desaparecía antes, la
            // tarjeta se quedaba en blanco justo mientras la estabas mirando.
            // El reproductor va encima; cuando aparece, tapa la foto.
            className="h-full w-full object-cover" 
          />
        )}

        {encima && portada.youtube && (
          <iframe
            // `youtube-nocookie`, como en el resto de la aplicación: el mismo
            // reproductor sin la cookie de seguimiento.
            src={`https://www.youtube-nocookie.com/embed/${portada.youtube}?autoplay=1&mute=1&controls=0&loop=1&playlist=${portada.youtube}`}
            title={titulo}
            allow="autoplay; encrypted-media"
            className="absolute inset-0 h-full w-full"
          />
        )}
        {portada.fichero && (
          // UN VÍDEO SUBIDO AQUÍ NO TIENE MINIATURA GUARDADA, así que la
          // miniatura *es* el vídeo: `preload="metadata"` con `#t=0.1` pinta
          // el primer fotograma sin descargar la película entera. Antes de
          // esto la rejilla enseñaba un rectángulo gris donde debía verse el
          // vídeo. Silenciado y en bucle: un vídeo que suena solo al rozar una
          // tarjeta es lo primero que hace cerrar una pestaña.
          <video
            ref={reproductor}
            src={`${portada.fichero}#t=0.1`}
            preload="metadata"
            muted loop playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* El triángulo dice que hay vídeo antes de acercar el ratón. Sin él,
            una tarjeta con vídeo y otra con foto se ven igual hasta que las
            tocas. */}
        {portada.clase === 'video' && !encima && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              <Play className="h-5 w-5 translate-x-0.5" fill="currentColor" />
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

/** Las etiquetas de tema, con el color del mapa. Dos como mucho. */
export function EtiquetasDeTema({ item }: { item: any }) {
  const temas = temasDe(item);
  if (!temas.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* DOS COMO MUCHO. `hablaDe` busca palabras, así que un texto largo puede
          tocar seis temas y seis etiquetas dejan de ser una pista para
          convertirse en ruido. Las dos primeras bastan para decir de qué va. */}
      {temas.slice(0, 2).map(t => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-600"
        >
          <t.icono className={cn('h-3 w-3', t.color)} />
          {t.titulo}
        </span>
      ))}
      {temas.length > 2 && (
        <span className="text-[10px] font-bold text-slate-400">+{temas.length - 2}</span>
      )}
    </div>
  );
}

/**
 * LA FOTO DE QUIEN PUBLICA (2026-08-24). Eugenio: «haz que el nombre de usuario
 * y su foto de perfil estén arriba y se vea mejor, como en Twitter».
 *
 * Tiene su propio componente por una sola razón: **una foto de perfil que ya no
 * existe**. Sin esto, el navegador pinta su icono de imagen rota dentro del
 * círculo, que es peor que no tener foto. Con el fallo controlado, se cae a la
 * inicial del nombre, que siempre existe.
 */
export function AvatarAutor({ url, nombre }: { url?: string | null; nombre?: string | null }) {
  const [rota, setRota] = useState(false);
  const inicial = (nombre || '?').trim().charAt(0).toUpperCase() || '?';
  if (!url || rota) {
    return (
      <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-black text-slate-500">
        {inicial}
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      onError={() => setRota(true)}
      className="h-[26px] w-[26px] shrink-0 rounded-full object-cover"
    />
  );
}

/**
 * EL TEXTO QUE DESCRIBE UNA PUBLICACIÓN (2026-08-24). Eugenio: «haz que el
 * texto descriptivo también se lea debajo del título».
 *
 * NO ESTÁ SIEMPRE EN EL MISMO CAMPO, y ésa es toda la razón de que esto exista.
 * Medido contra lo que devuelve `/api/publicaciones`:
 *   · una publicación → `config.body`   (en Markdown)
 *   · un grafo        → `config.description`
 *   · un mapa         → `config.description`, y a veces `config.nota`
 *   · un proyecto     → `config.goal`   (para qué es el proyecto)
 *
 * La primera versión leía sólo `body` y el resultado fue que **ninguna tarjeta
 * enseñaba texto salvo las publicaciones sueltas**: proyectos, grafos y mapas
 * salían con el título a secas teniendo una descripción escrita.
 *
 * Se le quitan las marcas de Markdown y los espacios de más porque el cuerpo se
 * guarda en Markdown y aquí se lee como texto corrido: sin esto salían
 * almohadillas, asteriscos y emojis de encabezado sueltos a media frase.
 */
export function textoDe(item: any): string {
  const c = item?.config || {};
  const bruto = c.body || c.description || c.descripcion || item?.resumen || c.goal || c.nota || '';
  return String(bruto)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')   // enlaces e imágenes: se queda el texto
    .replace(/[#*`>_~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
