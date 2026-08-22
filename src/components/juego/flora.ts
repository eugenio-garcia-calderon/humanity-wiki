// ============================================================================
// JUEGO VITAL — LA FLOR Y LA TELA DE LAS COPAS (2026-08-19, petición de
// Eugenio: «mejora la textura de los árboles y flores»).
//
// Dos cosas que estaban peor de lo que parecía:
//
//   1. TODAS LAS FLORES eran ESFERAS de color plano. Sin textura, sin pétalos:
//      de cerca eran bolitas de plastilina. Aquí se construye una flor de
//      verdad —cinco pétalos y un botón— en UNA geometría de 15 triángulos,
//      para que siga cabiendo en una malla instanciada.
//   2. TODAS LAS COPAS compartían el MISMO material, con la misma repetición
//      de textura. Daba igual que un pino tenga acículas de dos centímetros y
//      una higuera hojas de un palmo: la tela era idéntica. Ahora cada tipo de
//      hoja tiene la suya, con su grano y su brillo.
// ============================================================================
import * as THREE from 'three';
import { mapasPBR } from './texturas';
import type { HojaTipo } from './comestibles';

// ---------------------------------------------------------------------------
// LA FLOR
// ---------------------------------------------------------------------------
/**
 * Una flor de cinco pétalos abierta hacia arriba, de radio 1. Los pétalos van
 * en blanco para que el color de cada instancia mande, y el botón del centro
 * lleva un tinte cálido cocido en los vértices: así una flor rosa tiene el
 * corazón anaranjado, como las de verdad, sin gastar ni un material más.
 *
 * Se construye UNA vez y la comparten las miles de flores del valle.
 */
let cacheFlor: THREE.BufferGeometry | null = null;
export function geoFlor(): THREE.BufferGeometry {
  if (cacheFlor) return cacheFlor;

  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];

  const PETALOS = 5;
  const CORAZON: [number, number, number] = [1, 0.82, 0.3];
  const BLANCO: [number, number, number] = [1, 1, 1];

  const tri = (
    a: [number, number, number], b: [number, number, number], c: [number, number, number],
    ca: [number, number, number], cb: [number, number, number], cc: [number, number, number],
  ) => {
    pos.push(...a, ...b, ...c);
    col.push(...ca, ...cb, ...cc);
    // Normal hacia arriba con una pizca de apertura: la flor recibe la luz
    // del cielo, que es de donde viene.
    for (let i = 0; i < 3; i++) nor.push(0, 1, 0);
  };

  for (let i = 0; i < PETALOS; i++) {
    const a = (i / PETALOS) * Math.PI * 2;
    const s = (i + 0.5) / PETALOS * Math.PI * 2;
    const centro: [number, number, number] = [0, 0.16, 0];
    // La punta del pétalo cae un poco: una flor abierta no es un plato.
    const punta: [number, number, number] = [Math.cos(a), 0.02, Math.sin(a)];
    const ladoA: [number, number, number] = [Math.cos(s) * 0.52, 0.12, Math.sin(s) * 0.52];
    const sPrev = (i - 0.5) / PETALOS * Math.PI * 2;
    const ladoB: [number, number, number] = [Math.cos(sPrev) * 0.52, 0.12, Math.sin(sPrev) * 0.52];
    tri(centro, ladoB, punta, CORAZON, BLANCO, BLANCO);
    tri(centro, punta, ladoA, CORAZON, BLANCO, BLANCO);
  }

  // El botón del centro: un pentágono pequeño y cálido.
  for (let i = 0; i < PETALOS; i++) {
    const a1 = (i / PETALOS) * Math.PI * 2;
    const a2 = ((i + 1) / PETALOS) * Math.PI * 2;
    tri(
      [0, 0.24, 0],
      [Math.cos(a1) * 0.2, 0.18, Math.sin(a1) * 0.2],
      [Math.cos(a2) * 0.2, 0.18, Math.sin(a2) * 0.2],
      CORAZON, CORAZON, CORAZON,
    );
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  cacheFlor = g;
  return g;
}

/** El material de los pétalos: mate, con las dos caras (una flor se ve por
 *  debajo cuando pasas al lado) y con el tinte de los vértices activo. */
export function materialFlor(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    roughness: 0.78,
    metalness: 0,
    vertexColors: true,
    side: THREE.DoubleSide,
  });
}

// ---------------------------------------------------------------------------
// LA TELA DE CADA COPA
// ---------------------------------------------------------------------------
/**
 * Cuánto se repite la textura de follaje y cómo brilla, según el tipo de hoja.
 * Una repetición ALTA = grano fino (acículas, aromáticas); una baja = hoja
 * grande y suelta (higuera, castaño). El brillo separa la hoja dura y cerosa
 * del naranjo de la mate del olivo.
 */
const TELA: Record<HojaTipo, { rep: [number, number]; rugosidad: number }> = {
  aciculada: { rep: [7, 5], rugosidad: 0.94 },     // aguja: grano muy fino y mate
  aguja: { rep: [8, 6], rugosidad: 0.95 },         // aromáticas, aún más fino
  coriacea: { rep: [3.4, 2.4], rugosidad: 0.52 },  // hoja dura y cerosa: brilla
  lanceolada: { rep: [4.2, 3], rugosidad: 0.72 },  // olivo: mate y plateada
  ovalada: { rep: [2.6, 1.9], rugosidad: 0.66 },   // el frutal de siempre
  dentada: { rep: [2.1, 1.5], rugosidad: 0.7 },    // castaño: hoja grande
  compuesta: { rep: [3.2, 2.2], rugosidad: 0.74 }, // nogal: muchos foliolos
  palmeada: { rep: [1.5, 1.1], rugosidad: 0.62 },  // higuera: hoja de un palmo
  abanico: { rep: [2.2, 4.4], rugosidad: 0.6 },    // palma: fibras a lo largo
  carnosa: { rep: [1.8, 1.8], rugosidad: 0.45 },   // chumbera: piel lisa
};

const cacheTela = new Map<HojaTipo, THREE.MeshStandardMaterial>();

/** El material de follaje de un tipo de hoja. Uno por tipo, compartido por
 *  todas las plantas que lo usan: diez materiales en vez de uno solo (antes)
 *  y en vez de seiscientos (que sería un material por planta). */
export function materialFollaje(hoja: HojaTipo): THREE.MeshStandardMaterial {
  const ya = cacheTela.get(hoja);
  if (ya) return ya;
  const t = TELA[hoja] ?? TELA.ovalada;
  const m = new THREE.MeshStandardMaterial({
    ...mapasPBR('follaje', t.rep[0], t.rep[1]),
    roughness: t.rugosidad,
    // El relieve se nota más en la hoja grande y menos en la aguja, donde
    // a esa escala solo sería ruido.
    normalScale: new THREE.Vector2(t.rep[0] < 3 ? 1.3 : 0.6, t.rep[0] < 3 ? 1.3 : 0.6),
  });
  cacheTela.set(hoja, m);
  return m;
}

/** Suelta los materiales de follaje al salir del juego (van con las texturas). */
export function liberarFlora() {
  cacheTela.forEach(m => m.dispose());
  cacheTela.clear();
  cacheFlor?.dispose();
  cacheFlor = null;
}
