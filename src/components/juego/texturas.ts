// ============================================================================
// JUEGO VITAL — texturas fotográficas del suelo (2026-08-19, fase 1 del
// realismo). Fotografías PBR reales (CC0, ambientCG, autoalojadas en
// public/modelos-juego/texturas) con su relieve (normal) y su rugosidad.
// Un solo cargador con caché: la misma foto con la misma repetición se sube
// a la GPU una única vez aunque la usen veinte mallas.
// ============================================================================
import * as THREE from 'three';

export type NombreTextura =
  | 'hierba' | 'tierra' | 'grava' | 'adoquin' | 'madera'
  | 'corteza' | 'follaje' | 'roca'
  | 'teja' | 'revoco' | 'ladrillo' | 'chapa';

const cargador = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

function textura(url: string, repetirX: number, repetirY: number, esColor: boolean): THREE.Texture {
  const clave = `${url}|${repetirX}|${repetirY}`;
  const ya = cache.get(clave);
  if (ya) return ya;
  const t = cargador.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repetirX, repetirY);
  t.anisotropy = 8;
  if (esColor) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(clave, t);
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
 * adoquín, pero si no se vacía al salir del juego esos ~40 MB se quedan
 * ocupados en el móvil hasta que recargas la pestaña. Se llama al desmontar
 * la escena, cuando ya no hay nada pintando.
 */
export function liberarTexturas(): number {
  const n = cache.size;
  cache.forEach(t => t.dispose());
  cache.clear();
  return n;
}
