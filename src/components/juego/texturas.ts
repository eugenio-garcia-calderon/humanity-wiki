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
  const n = imagenes.size;
  imagenes.forEach(t => t.dispose());
  imagenes.clear();
  variantes.clear();
  pendientes.clear();
  return n;
}
