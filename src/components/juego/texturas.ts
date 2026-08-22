// ============================================================================
// JUEGO VITAL — texturas fotográficas del suelo (2026-08-19, fase 1 del
// realismo). Fotografías PBR reales (CC0, ambientCG, autoalojadas en
// public/modelos-juego/texturas) con su relieve (normal) y su rugosidad.
// ── LA MISMA FOTO SE SUBÍA A LA GPU HASTA OCHO VECES (2026-08-22) ──────────
// La caché de antes guardaba por `url|repetirX|repetirY`. Suena razonable, y
// es donde estaba el agujero: la repetición es una propiedad de la TEXTURA, no
// de la imagen, así que pedir la misma foto con otra repetición hacía un
// `load()` nuevo — otra `Texture` con su propia `source`, y otra copia entera
// de los píxeles en la tarjeta gráfica.
//
// Medido en la escena de verdad, con la aldea de Eugenio abierta:
//
//     texturas distintas en la GPU ......... 235
//     de ellas, a 1024×1024 ................  95   ...para 12 fotos
//     memoria de la tarjeta en texturas .... 690 MB
//
// `grava/color.jpg` estaba tres veces. `roca/color.jpg`, dos. Nadie lo veía
// porque **se ve exactamente igual**: son copias idénticas.
//
// Ahora la imagen se carga UNA vez por URL y cada repetición distinta es un
// `clone()`. Un clon de three comparte la `source` con su original, así que la
// tarjeta guarda **un solo juego de píxeles** por foto por muchas variantes
// que existan.
// ============================================================================
import * as THREE from 'three';
import { useEffect, useState } from 'react';

export type NombreTextura =
  | 'hierba' | 'tierra' | 'grava' | 'adoquin' | 'madera'
  | 'corteza' | 'follaje' | 'roca'
  | 'teja' | 'revoco' | 'ladrillo' | 'chapa';

const cargador = new THREE.TextureLoader();

/** Una imagen por URL. Es lo que ocupa sitio en la tarjeta gráfica. */
const imagenes = new Map<string, THREE.Texture>();
/** Y una textura por (URL + repetición). Todas comparten la imagen de arriba. */
const variantes = new Map<string, THREE.Texture>();
/** Los clones que esperan a que su imagen termine de llegar. */
const pendientes = new Map<string, THREE.Texture[]>();

function textura(url: string, repetirX: number, repetirY: number, esColor: boolean): THREE.Texture {
  const clave = `${url}|${repetirX}|${repetirY}|${esColor}`;
  const ya = variantes.get(clave);
  if (ya) return ya;

  let base = imagenes.get(url);
  if (!base) {
    // AL TERMINAR LA CARGA HAY QUE AVISAR A LOS CLONES. Comparten la `source`,
    // pero cada uno lleva su propio `needsUpdate`: sin esto, un clon creado
    // antes de que la foto llegara se quedaría en blanco para siempre.
    base = cargador.load(url, () => {
      for (const c of pendientes.get(url) || []) c.needsUpdate = true;
      pendientes.delete(url);
    });
    base.wrapS = base.wrapT = THREE.RepeatWrapping;
    base.anisotropy = 8;
    imagenes.set(url, base);
  }

  // La primera variante ES la imagen base: así el caso más común —una sola
  // repetición por foto— no clona nada.
  const primera = !variantes.has(`${url}|__usada__`);
  const t = primera ? base : base.clone();
  if (primera) variantes.set(`${url}|__usada__`, base);
  else {
    if (!base.image) (pendientes.get(url) || pendientes.set(url, []).get(url)!).push(t);
    else t.needsUpdate = true;
  }

  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repetirX, repetirY);
  t.anisotropy = 8;
  if (esColor) t.colorSpace = THREE.SRGBColorSpace;
  variantes.set(clave, t);
  return t;
}

/** Los tres mapas de un material de suelo, listos para meshStandardMaterial:
 *  `map` (la foto), `normalMap` (el relieve) y `roughnessMap` (el brillo). */
export function mapasPBR(nombre: NombreTextura, repetirX: number, repetirY = repetirX): {
  map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture;
} {
  const base = `/modelos-juego/texturas/${nombre}`;
  return {
    map: textura(`${base}/color.jpg`, repetirX, repetirY, true),
    normalMap: textura(`${base}/normal.jpg`, repetirX, repetirY, false),
    roughnessMap: textura(`${base}/rugosidad.jpg`, repetirX, repetirY, false),
  };
}

/** El mapa de olas del agua (MIT, del repositorio de three.js). Cada
 *  superficie pide su repetición y anima su propio desplazamiento; el
 *  navegador solo descarga la imagen una vez. */
export function normalesDeAgua(repetirX: number, repetirY: number): THREE.Texture {
  return textura('/modelos-juego/texturas/agua_normales.jpg', repetirX, repetirY, false);
}


// ── Y LAS FOTOS DE LA GENTE, QUE ERAN EL MISMO FALLO SIN LA CACHÉ ──────────
// Lo de arriba arregló las texturas del SUELO. Las fotos que pone la gente
// —una imagen clavada en el suelo, la miniatura de un vídeo, la foto de un
// producto, un cuadro dentro de una casa— seguían cargándose con un
// `new THREE.TextureLoader()` propio en cada sitio: cuatro copias del mismo
// código, y ninguna caché. La misma foto puesta en dos sitios se subía dos
// veces a la tarjeta, y nadie lo veía porque **se ve exactamente igual**.
//
// Un producto puesto en el mundo Y abierto en su vitrina son dos subidas de
// la misma imagen. Con el techo de 40 fotos por mundo, eso es la diferencia
// entre 40 subidas y bastantes más.

/** Una textura por URL, compartida por todos los sitios donde salga esa foto. */
const fotos = new Map<string, THREE.Texture>();
/** URLs que ya se sabe que no están: no se vuelven a pedir en cada montaje. */
const fallidas = new Set<string>();
/** Quién espera a que llegue cada foto. */
const esperando = new Map<string, Set<() => void>>();

/**
 * PIDE una foto. Si ya está —o ya viene de camino— no vuelve a pedirla.
 *
 * Va aparte del hook a propósito. Lo que hay que poder probar es LA CACHÉ
 * («¿se sube esta foto una vez o tres?»), y eso no debería exigir montar React
 * para averiguarlo. Es la misma separación que faltaba en el fallo de los
 * 690 MB: una cosa es la identidad de la imagen y otra cómo se presenta.
 *
 * `avisar` se llama cuando la foto llega o cuando se sabe que no está.
 * Devuelve la función de darse de baja.
 */
export function pedirFoto(url: string, avisar: () => void): () => void {
  if (fotos.has(url) || fallidas.has(url)) { avisar(); return () => {}; }

  const cola = esperando.get(url);
  if (cola) { cola.add(avisar); return () => cola.delete(avisar); }

  const nueva = new Set<() => void>([avisar]);
  esperando.set(url, nueva);
  const terminar = () => { esperando.delete(url); for (const f of [...nueva]) f(); };
  new THREE.TextureLoader().load(
    url,
    t => { t.colorSpace = THREE.SRGBColorSpace; fotos.set(url, t); terminar(); },
    undefined,
    () => { fallidas.add(url); terminar(); },
  );
  return () => nueva.delete(avisar);
}

/**
 * La foto de una URL, cargada UNA vez pase lo que pase.
 *
 * Devuelve `null` mientras no ha llegado y `null` también si no está — el que
 * llama enseña su marco vacío en los dos casos, que es lo que hacían ya las
 * cuatro copias de código que esto sustituye. No los distingue porque ninguna
 * de las cuatro los distinguía; si algún día hace falta separarlos, hay que
 * añadir un estado, no adivinarlo desde `null`.
 *
 * No se libera al desmontar: la textura es compartida, y soltarla porque un
 * sitio deje de verla dejaría en blanco a los demás. Se sueltan todas juntas
 * en `liberarTexturas()`, al salir del juego.
 */
export function useFoto(url: string | null | undefined): THREE.Texture | null {
  const [, repintar] = useState(0);
  useEffect(() => {
    if (!url) return;
    let vivo = true;
    return pedirFoto(url, () => { if (vivo) repintar(n => n + 1); });
  }, [url]);
  return url ? fotos.get(url) ?? null : null;
}

/** Cuántas fotos de gente hay ahora en la tarjeta. Para medir, no para decidir. */
export function fotosEnMemoria(): number { return fotos.size; }

/**
 * Suelta de la tarjeta gráfica todas las texturas del juego (2026-08-19,
 * fase 11). El caché de arriba es lo que evita descargar cien veces el mismo
 * adoquín, pero si no se vacía al salir del juego esos megas se quedan
 * ocupados en el móvil hasta que recargas la pestaña. Se llama al desmontar
 * la escena, cuando ya no hay nada pintando.
 */
export function liberarTexturas(): number {
  // Se sueltan las IMÁGENES: son las que ocupan la tarjeta. Soltar un clon no
  // libera nada —comparte la `source` con su original— así que lo que hay que
  // vaciar sin falta es `imagenes`; los clones se van con ellas.
  const n = imagenes.size + fotos.size;
  imagenes.forEach(t => t.dispose());
  imagenes.clear();
  variantes.clear();
  pendientes.clear();
  // Y las fotos de la gente, que antes no las soltaba nadie: cada componente
  // se llevaba su textura al desmontarse sin liberarla, así que se quedaban
  // en la tarjeta hasta recargar la pestaña.
  fotos.forEach(t => t.dispose());
  fotos.clear();
  fallidas.clear();
  esperando.clear();
  return n;
}
