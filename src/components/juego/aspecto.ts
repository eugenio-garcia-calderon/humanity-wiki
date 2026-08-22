import * as THREE from 'three';

// ============================================================================
// JUEGO VITAL — el aspecto de cada persona (2026-08-18, petición de Eugenio:
// cambiar pelo, piel, ojos y fenotipo).
// ============================================================================
// Los modelos de Kenney comparten UNA textura (`colormap.png`): una paleta
// donde cada parte del cuerpo apunta a un cuadradito de color. No hay un
// material por pelo o por piel, así que no se puede teñir "la cabeza" y ya.
//
// Lo que se hace aquí: para CADA modelo se miran sus coordenadas de textura y
// la altura de cada vértice, y con eso se clasifica qué colores de la paleta
// son pelo, piel, ojos, camiseta, pantalón y zapatos. Después se pinta una
// copia de la paleta cambiando solo esos colores.
//
// Detalle que importa: no se sustituye por un color plano. Cada zona tiene
// varios tonos para dar sombreado (7 marrones para la piel, 6 grises para el
// pelo…). Se conserva la LUMINOSIDAD de cada tono y se le cambia el tinte, así
// que el sombreado del modelo sobrevive al cambio de color.

export interface Aspecto {
  cuerpo?: string;
  piel?: string;
  pelo?: string;
  ropa?: string;
  pantalon?: string;
}

/** Paletas sugeridas: fenotipos reales, no "colorines". */
export const TONOS_PIEL = ['#f5d0b0', '#e8b98f', '#d69f6e', '#b57c4d', '#8d5a34', '#5c3a21'];
export const TONOS_PELO = ['#2b2320', '#4a3527', '#6b4f2a', '#a9773f', '#c9a227', '#8a8a8a', '#e8e4dc', '#7d3b2e'];
export const TONOS_ROPA = ['#3e8f6f', '#4a6fa5', '#a5644a', '#7a4aa5', '#a5984a', '#a54a72', '#3a3a3a', '#f4efe2'];

type Zona = 'piel' | 'pelo' | 'ropa' | 'pantalon' | 'zapatos';

const rgb = (s: string) => s.split(',').map(Number) as [number, number, number];

function aHsl([r, g, b]: [number, number, number]) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === R) h = ((G - B) / d + (G < B ? 6 : 0)) / 6;
    else if (max === G) h = ((B - R) / d + 2) / 6;
    else h = ((R - G) / d + 4) / 6;
  }
  return { h, s, l };
}

/**
 * De HSL a RGB, en sRGB (0-255).
 *
 * OJO: aquí NO se puede usar `THREE.Color`. Three trabaja en espacio LINEAL:
 * `new THREE.Color('#2f4858').getHSL()` devuelve la luz en lineal, y al volver
 * a bytes daba (5,10,16) — casi negro. Como estos valores se escriben en un
 * lienzo 2D, que es sRGB, la cuenta hay que hacerla en sRGB.
 */
function deHsl(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const canal = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(canal(h + 1 / 3) * 255),
    Math.round(canal(h) * 255),
    Math.round(canal(h - 1 / 3) * 255),
  ];
}

/** '#rrggbb' → [r, g, b] en 0-255, sin pasar por el espacio lineal de three. */
function deHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * ¿Es un tono de piel de la paleta?
 *
 * Medido sobre la paleta real (2026-08-18): los tonos de piel van de
 * (179,99,67) a (239,186,148) — rojo > verde > azul y nunca llegan a 255.
 * Los naranjas puros (255,149,47 … 255,208,97) son pelo y ropa, no piel: el
 * `r === 255` es lo que los separa, y es un corte medido, no estimado.
 */
function esPiel([r, g, b]: [number, number, number]) {
  if (!(r > g && g > b)) return false;
  if (r < 150 || r >= 250) return false;
  return aHsl([r, g, b]).s > 0.2;
}

/** Los colores de la paleta que usa esta malla, ya clasificados por zona. */
export type MapaZonas = Map<string, Zona>;

/**
 * Clasifica los colores de UNA malla (cabeza o cuerpo), no del modelo entero.
 *
 * Esto es lo que hace que funcione: los modelos de Kenney usan LOS MISMOS
 * grises para el pelo (en la cabeza) y para el pantalón (en el cuerpo). Con
 * una sola tabla para todo el muñeco, el primero en aparecer ganaba y el otro
 * se quedaba sin teñir. Al mirar cada malla por separado —y medir la altura
 * dentro de esa malla— el mismo gris puede ser pelo arriba y pantalón abajo.
 */
export function clasificarMalla(malla: THREE.Mesh, pixeles: ImageData): MapaZonas {
  const mapa: MapaZonas = new Map();
  const uv = malla.geometry?.attributes?.uv;
  const pos = malla.geometry?.attributes?.position;
  if (!uv || !pos) return mapa;

  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const alto = Math.max(0.001, maxY - minY);
  const esCabeza = /head/i.test(malla.name);

  // Un mismo color se usa a varias alturas (es una rampa de sombreado): se
  // decide por la altura MEDIA de los vértices que lo llevan.
  const acumulado = new Map<string, { color: [number, number, number]; suma: number; n: number }>();
  for (let i = 0; i < uv.count; i++) {
    const x = Math.min(pixeles.width - 1, Math.max(0, Math.floor(uv.getX(i) * pixeles.width)));
    const y = Math.min(pixeles.height - 1, Math.max(0, Math.floor(uv.getY(i) * pixeles.height)));
    const off = (y * pixeles.width + x) * 4;
    const color: [number, number, number] = [pixeles.data[off], pixeles.data[off + 1], pixeles.data[off + 2]];
    const clave = color.join(',');
    const a = acumulado.get(clave) || { color, suma: 0, n: 0 };
    a.suma += (pos.getY(i) - minY) / alto;
    a.n++;
    acumulado.set(clave, a);
  }

  for (const [clave, a] of acumulado) {
    if (esPiel(a.color)) { mapa.set(clave, 'piel'); continue; }
    // En la cabeza, todo lo que no es piel es pelo: en estos modelos los ojos
    // no tienen color propio en la paleta (van dibujados con el tono de la
    // cara), así que no hay nada que teñir por separado.
    if (esCabeza) { mapa.set(clave, 'pelo'); continue; }
    const h = a.suma / a.n;
    mapa.set(clave, h < 0.12 ? 'zapatos' : h < 0.55 ? 'pantalon' : 'ropa');
  }
  return mapa;
}

/**
 * Pinta una copia de la paleta con los colores elegidos, conservando el
 * sombreado original de cada zona.
 */
export function pintarTextura(base: ImageData, mapa: MapaZonas, aspecto: Aspecto): HTMLCanvasElement {
  const destino: Partial<Record<Zona, string>> = {
    piel: aspecto.piel, pelo: aspecto.pelo,
    ropa: aspecto.ropa, pantalon: aspecto.pantalon,
  };
  // Luminosidad media de cada zona en el original, para desplazar los tonos
  // alrededor del color elegido en vez de aplastarlos todos.
  const refs = new Map<Zona, { suma: number; n: number }>();
  for (const [clave, zona] of mapa) {
    const { l } = aHsl(rgb(clave));
    const r = refs.get(zona) || { suma: 0, n: 0 };
    r.suma += l; r.n++;
    refs.set(zona, r);
  }

  const lienzo = document.createElement('canvas');
  lienzo.width = base.width; lienzo.height = base.height;
  const ctx = lienzo.getContext('2d')!;
  const salida = ctx.createImageData(base.width, base.height);
  salida.data.set(base.data);

  const cache = new Map<string, [number, number, number]>();
  for (let i = 0; i < salida.data.length; i += 4) {
    const clave = `${salida.data[i]},${salida.data[i + 1]},${salida.data[i + 2]}`;
    const zona = mapa.get(clave);
    if (!zona) continue;
    const elegido = destino[zona];
    if (!elegido) continue;

    let nuevo = cache.get(clave + elegido);
    if (!nuevo) {
      const orig = aHsl(rgb(clave));
      const ref = refs.get(zona)!;
      const medio = ref.suma / ref.n;
      const hsl = aHsl(deHex(elegido));
      // Se conserva la diferencia de luz respecto a la media de la zona: así
      // las sombras siguen siendo sombras y los brillos, brillos.
      const l = Math.min(0.97, Math.max(0.04, hsl.l + (orig.l - medio)));
      nuevo = deHsl(hsl.h, hsl.s, l);
      cache.set(clave + elegido, nuevo);
    }
    salida.data[i] = nuevo[0];
    salida.data[i + 1] = nuevo[1];
    salida.data[i + 2] = nuevo[2];
  }
  ctx.putImageData(salida, 0, 0);
  return lienzo;
}

/** La paleta original, leída una sola vez y compartida por todos. */
let paletaBase: Promise<ImageData> | null = null;
export function cargarPaleta(url: string): Promise<ImageData> {
  if (!paletaBase) {
    paletaBase = new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d', { willReadFrequently: true })!;
        g.drawImage(img, 0, 0);
        resolve(g.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  return paletaBase;
}
