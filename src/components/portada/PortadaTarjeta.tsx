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
/*
 * AQUÍ VIVÍA `puedeSonar()`, que preguntaba si la persona ya había pulsado algo
 * antes de intentar quitar el silencio. Retirado el 2026-08-24.
 *
 * La razón por la que se escribió era buena y sigue siendo cierta: en un
 * `<video>` del navegador, quitar el silencio sin ese permiso hace que Chrome
 * **pause** el vídeo, y eso cambia «se ve y no se oye» por «no se ve».
 *
 * Lo que fallaba es que se usaba como si eso valiera para los dos casos, y no:
 *
 *   · el `<video>` subido → el riesgo ya lo cubre su `catch`, que lo vuelve a
 *     poner callado y lo arranca otra vez. Preguntar antes sólo garantizaba que
 *     no sonara nunca.
 *   · YouTube → ni siquiera es un `<video>`: es un reproductor de otro dominio
 *     al que se le manda un mensaje. Comprobado en producción con
 *     `hasBeenActive === false`: contesta `muted: false`.
 *
 * O sea que el candado no protegía de nada y silenciaba a todo el que pasara el
 * ratón por un vídeo antes de haber hecho clic en algo — que es exactamente lo
 * que hace cualquiera al llegar a una lista de publicaciones.
 */


export function ImagenDePortada({ portada, titulo }: { portada: Portada; titulo: string }) {
  const [encima, setEncima] = useState(false);
  const [rota, setRota] = useState(false);
  /*
   * ── EL RÓTULO DE YOUTUBE NO SE TAPA: SE HACE QUE NO LLEGUE A VERSE ────────
   * Eugenio: «la información que pone YouTube cuando se empieza a reproducir el
   * vídeo en el hover, que te pone el nombre del canal y te da la dirección de
   * pausa, esos botones molestan, intenta ocultarlos y que simplemente se
   * reproduzca el vídeo».
   *
   * Aquí ya había un arreglo —`pointer-events: none` en el marco— y **funciona
   * para lo que arregla**: impide que YouTube saque su barra al mover el ratón
   * por encima. Lo que Eugenio está viendo es otro caso distinto, y por eso el
   * arreglo anterior no lo tocaba: el rótulo que YouTube pinta **mientras
   * carga**, antes de reproducir, con el título, el canal, el aviso del canal y
   * «Más vídeos». Eso sale solo, sin que nadie mueva nada. Reproducido en el
   * navegador antes de tocar nada, porque desde el código las dos cosas se
   * describen igual.
   *
   * Contra eso no hay CSS: es contenido dentro de un marco de otro dominio.
   * `controls=0`, `modestbranding` y `rel=0` no lo quitan —`modestbranding`
   * además ya no hace nada desde que YouTube lo retiró—.
   *
   * LO QUE SÍ FUNCIONA: no enseñar el marco hasta que el reproductor confirme
   * que está reproduciendo. Mientras tanto se ve la miniatura, que es lo que ya
   * había ahí. El rótulo no se oculta — es que ocurre debajo de la foto.
   */
  const [reproduciendo, setReproduciendo] = useState(false);
  const reproductor = useRef<HTMLVideoElement>(null);
  const marco = useRef<HTMLIFrameElement>(null);

  // ── SE REPRODUCE CON SONIDO, Y ESO TIENE UNA PELEA DETRÁS ─────────────────
  // Eugenio: «se empieza a reproducir, pero no se escucha… ponle el sonido
  // activado por defecto».
  //
  // Ningún navegador deja empezar un vídeo con sonido por su cuenta: es la
  // norma que impide que una página que abres te grite. Así que la única forma
  // de que suene es **empezar callado y quitar el silencio en cuanto arranca**,
  // que sí está permitido si la persona ya ha tocado algo de la página.
  //
  // Si el navegador se niega, se queda callado y no pasa nada más: no hay
  // mensaje de error ni vídeo parado. Merece la pena intentarlo porque en la
  // práctica, para cuando alguien pasa el ratón por una tarjeta, ya ha hecho
  // clic en algo — y entonces suena.
  //
  // ── Y POR ESO SE PREGUNTA ANTES DE INTENTARLO ────────────────────────────
  // Si NADIE ha tocado nada de la página todavía, quitar el silencio no es que
  // no funcione: **Chrome pausa el vídeo**. O sea que el intento a ciegas
  // cambia «se ve pero no se oye» por «no se ve», que es peor.
  //
  // `navigator.userActivation` dice si ya ha habido un clic. Donde no exista
  // esa propiedad se intenta igual, que es como estaba.
  useEffect(() => {
    const v = reproductor.current;
    if (!v) return;
    if (encima) {
      // SE INTENTA CON SONIDO SIEMPRE. Antes esto era `v.muted = !puedeSonar()`,
      // o sea: si la persona no había pulsado nada todavía, se empezaba callado
      // **sin ni siquiera intentarlo**. En un `<video>` de verdad el riesgo es
      // real —Chrome pausa el vídeo si le quitas el silencio sin permiso—, pero
      // ese riesgo ya lo cubre el `catch` de aquí abajo, que vuelve a ponerlo
      // callado y lo arranca otra vez. Entre «nunca suena» y «suena, y si el
      // navegador se queja se queda callado», la segunda.
      v.muted = false;
      v.play().catch(() => {
        // El navegador lo ha bloqueado. Se reproduce callado, que es mejor que
        // no reproducir: la portada en movimiento sigue diciendo que hay vídeo.
        v.muted = true;
        v.play().catch(() => {});
      });
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [encima]);

  /*
   * ══ YOUTUBE: EL SONIDO Y EL «YA ESTOY REPRODUCIENDO», EN UNA SOLA CONVERSACIÓN
   * ══════════════════════════════════════════════════════════════════════════
   * Aquí había dos efectos que le hablaban al reproductor **a ciegas**: uno le
   * mandaba `unMute` a los 600, 1400 y 2600 ms, y otro le pedía los estados a
   * los 0, 200, 700 y 1500 ms. Los dos disparaban contra el reloj esperando
   * acertar cuando el marco ya estuviera listo.
   *
   * Eugenio: «el vídeo se reproduce, pero no se escucha el audio». Medido
   * contra producción en Chrome: el reproductor **no contestaba absolutamente
   * nada** —cero mensajes— y seguía en `muted: true`.
   *
   * ── LO QUE FALLABA, Y ERAN DOS COSAS A LA VEZ ─────────────────────────────
   *
   * 1. NADIE ESCUCHABA EN EL MOMENTO BUENO. El reproductor sólo manda estados
   *    a quien se suscribe **cuando él está listo**; al que llega tarde le
   *    contesta «ya estaba iniciado» y no le manda nada más. Un temporizador no
   *    puede acertar ese instante: lo sabe el propio marco cuando carga.
   *
   * 2. EL SONIDO NI SE INTENTABA. Había un candado, `puedeSonar()`, que sólo
   *    dejaba pedir sonido si la persona ya había pulsado algo en la página.
   *    Venía de una razón buena —en un `<video>` de verdad, quitar el silencio
   *    sin ese permiso hace que Chrome **pause** el vídeo— pero **aquí no
   *    aplica**: esto no es un `<video>`, es un reproductor de otro dominio al
   *    que se le manda un mensaje, y quien decide qué hacer con él es YouTube.
   *
   *    Comprobado a propósito antes de quitarlo, en producción y con
   *    `navigator.userActivation.hasBeenActive === false`: se manda `unMute` al
   *    recibir `onReady` y el reproductor contesta `muted: false`. O sea que el
   *    candado no protegía de nada — sólo garantizaba el silencio para
   *    cualquiera que pasara el ratón por un vídeo antes de haber hecho clic en
   *    algo, que es justo lo que hace todo el mundo al llegar a una lista.
   *
   * ── ASÍ QUE SE ESPERA A QUE ÉL HABLE ──────────────────────────────────────
   * El marco avisa al cargar (`onLoad`), ahí se le dice «te escucho», y él
   * contesta `onReady`. En ESE momento —y no antes— se le pide sonido. Después
   * cuenta lo que va pasando, y de ahí sale también el «ya está reproduciendo»
   * que destapa el vídeo.
   */
  const alCargarElMarco = () => {
    try {
      marco.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
    } catch { /* el marco se ha ido entre medias */ }
  };

  useEffect(() => {
    if (!encima || !portada.youtube) { setReproduciendo(false); return; }

    const mandar = (func: string, args: any[] = []) => {
      try {
        marco.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args, id: 1, channel: 'widget' }), '*');
      } catch { /* ídem */ }
    };

    const oir = (e: MessageEvent) => {
      if (e.source !== marco.current?.contentWindow) return;
      let d: any = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }

      // LISTO: es el único instante en que se sabe que escucha de verdad.
      if (d?.event === 'onReady') {
        mandar('unMute');
        mandar('setVolume', [100]);
        mandar('playVideo');
      }
      const estado = d?.event === 'onStateChange' ? d.info : d?.info?.playerState;
      if (estado === 1) setReproduciendo(true);
    };

    window.addEventListener('message', oir);
    // Y una suscripción de repuesto: si el marco ya estaba cargado cuando este
    // efecto arranca, su `onLoad` ya pasó y nadie habría dicho «te escucho».
    alCargarElMarco();

    /*
     * ── LA RED DE SEGURIDAD ENSEÑA, NO ESCONDE ──────────────────────────────
     * Si a los 3 s no ha contestado nadie, se enseña igual. Es la decisión
     * importante: el fallo tiene que ser «se ve el rótulo un momento», nunca
     * «no se ve nada» — lo segundo es peor y además es indistinguible de una
     * tarjeta rota, así que nadie lo reportaría.
     *
     * Y hace falta de verdad: en una pestaña que el navegador no está pintando
     * el reproductor puede no llegar nunca a «reproduciendo».
     */
    const red = setTimeout(() => setReproduciendo(true), 3000);
    return () => { window.removeEventListener('message', oir); clearTimeout(red); };
  }, [encima, portada.youtube]);

  return (
    <div
      onMouseEnter={() => setEncima(true)}
      onMouseLeave={() => setEncima(false)}
      className="relative aspect-video w-full overflow-visible rounded-xl bg-slate-100"
    >
      {/* AQUÍ CRECÍA EL VÍDEO AL PASAR EL RATÓN (`scale-[1.25]`), y se retira
          el 2026-08-24 a petición de Eugenio: «esto no queda bien».
          Se probó primero a 1,12 y luego a 1,25 buscando que se notara cuál
          está viva. El problema no era cuánto crecía: la tarjeta de Explorar ya
          no lleva `overflow-hidden` —se le quitó justo para que el vídeo pudiera
          salirse—, así que crecer significaba **taparle la portada a la vecina**
          cada vez que el ratón pasaba de largo. Que se oiga ya dice cuál está
          viva, y eso no le quita sitio a nadie.
          Lo que sí se queda: el sonido. Eugenio: «eso sí que ha sido una
          mejora». */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
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
            ref={marco}
            // `youtube-nocookie`, como en el resto de la aplicación: el mismo
            // reproductor sin la cookie de seguimiento.
            //
            // `enablejsapi=1` es lo que permite hablarle para quitarle el
            // silencio. `mute=1` de salida no es una preferencia: sin él el
            // navegador no deja arrancar el vídeo solo, y entonces no hay nada
            // que desmutear.
            src={`https://www.youtube-nocookie.com/embed/${portada.youtube}?autoplay=1&mute=1&controls=0&loop=1&playlist=${portada.youtube}&enablejsapi=1&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`}
            onLoad={alCargarElMarco}
            title={titulo}
            // `origin` lo pide la documentación de YouTube para el canal de
            // mensajes, y con él el marco contesta `readyToListen` antes de nada.
            allow="autoplay; encrypted-media"
            // ── LA LÍNEA QUE QUITA LOS BOTONES Y EL TÍTULO ──────────────────
            // Eugenio: «aparecen los botones de pausa, adelante y atrás y el
            // título que tapan la imagen». `controls=0` ya estaba puesto y no
            // bastaba: **YouTube enseña su barra en cuanto el ratón se mueve
            // por encima del reproductor**, controles o no.
            //
            // Con `pointer-events: none` el ratón le atraviesa y el reproductor
            // no se entera de que hay nadie: no saca la barra, ni el título, ni
            // el logo. El hover de la tarjeta sigue funcionando porque vive en
            // el div de fuera, no aquí.
            //
            // Y de regalo arregla otra cosa: un clic ya no se lo come YouTube
            // —que abriría su página—, sino que llega a la tarjeta.
            //
            // Y NO SE VE HASTA QUE REPRODUCE. Ver la nota de `reproduciendo`:
            // debajo está la miniatura, así que mientras carga se sigue viendo
            // la tarjeta de siempre y no el rótulo de YouTube. Se desvanece en
            // vez de aparecer de golpe porque el corte entre foto y vídeo, si
            // es seco, parece un parpadeo de la página.
            className={cn(
              'pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-200',
              reproduciendo ? 'opacity-100' : 'opacity-0',
            )}
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
            // Sin `muted` fijo: lo decide el efecto de arriba, que intenta
            // sonar y se calla solo si el navegador se niega.
            loop playsInline
            // Igual que el marco de YouTube: el ratón lo atraviesa, así que
            // ningún control del navegador aparece encima de la portada.
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
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
