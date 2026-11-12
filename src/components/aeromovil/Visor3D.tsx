// ============================================================================
// AEROMÓVIL GOTA · visor 3D por capas (2026-11-05)
// ============================================================================
// Three.js a mano, sin R3F: la escena se reconstruye entera al cambiar un
// parámetro (unos 200 objetos, pocos milisegundos) y la parte móvil
// (suspensión, inclinación, ruedas, puertas) se rehace sola mientras se anima.
//
// La piel del carenado se construye sobre una rejilla (u, θ) cuyas líneas
// incluyen los bordes de cristales, paneles y puertas: así cada celda cae
// entera en una zona y las puertas se pueden abrir dejando su hueco.
//
// Los colores de los materiales viven aquí y no en `src/components/ui/`
// porque son colores de material 3D (aluminio, neumático, fibra), no de
// interfaz. Anotado en 02_TECH_DEBT.md.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
// Reflections of a real place (2026-11-09): «Rooitou Park» by Poly Haven (CC0, via pmndrs/drei-assets), a sunny
// sky with a tree line. Its sun is painted out (the viewer adds its own, aligned with the shadow) and the grass
// below the horizon is replaced by asphalt grey like the viewer's floor. Stored as an sRGB JPG of
// radiance / ENTORNO_ESCALA (1024×512, 35 kB instead of the 1.6 MB .hdr).
import entornoUrl from './entorno/parque.jpg';
import {
  ARM_UP, CELULA, TIRE_W, TRAVEL_F, TRAVEL_R, enZona, tramosTubo,
  type Modelo, type ModeloGota, type ModeloA1, type ModeloBala, type ModeloConPiel, type ModeloTriciclo, type Piel, type PuntosOcupante, type Superficie,
} from './geometria';
import { anguloFuera } from './geometriaTriciclo';
import { ANGULO_CUPULA, ANGULO_PORTON, PIVOTES_CUPULA, PIVOTE_PORTON, construirCon as construirBalaCon, crearMateriales as materialesBala } from './garaje/balaModelo';
import { brazosDe } from './garaje/balaMedidas';
import { GIRO_A1, suspensionA1 } from './geometriaA1';
import type { Referencia } from './referencias';
import { vehiculoGaraje } from './garaje';
import { colorSuperpuesto, hacerFantasma, liberarFantasma, mostrarSiluetas, siluetas } from './garaje/superponer';
import { cartel, crearTunel, type CuerpoTunel, type SeleccionTunel, type Tunel } from './tunelViento';
import type { OpcionesTunel } from './tunel/cliente';

/** Las capas. `solo` limita una capa a un vehículo: la dirección y la transmisión son del Aeromóvil 1. */
export const CAPAS = [
  { k: 'carenado', n: 'Carrocería', color: 'bg-zinc-300' },
  { k: 'cristales', n: 'Cristales', color: 'bg-sky-900' },
  { k: 'solar', n: 'Paneles solares', color: 'bg-indigo-900' },
  { k: 'chasis', n: 'Chasis', color: 'bg-zinc-400' },
  { k: 'suspension', n: 'Suspensión', color: 'bg-amber-500' },
  { k: 'direccion', n: 'Dirección', color: 'bg-stone-500', solo: 'a1' },
  { k: 'ruedas', n: 'Ruedas y frenos', color: 'bg-neutral-900' },
  { k: 'asientos', n: 'Asientos', color: 'bg-zinc-700' },
  { k: 'ocupantes', n: 'Ocupantes', color: 'bg-orange-300' },
  { k: 'motor', n: 'Motor', color: 'bg-red-700' },
  { k: 'transmision', n: 'Transmisión', color: 'bg-rose-900', solo: 'a1' },
  { k: 'baterias', n: 'Baterías', color: 'bg-blue-600' },
] as const;
export type CapaId = typeof CAPAS[number]['k'];
export type Vista = 'iso' | 'side' | 'top' | 'front' | 'back';

export interface VisorHandle {
  /** STL binario de las capas visibles, en milímetros y con Z arriba (como el STEP). */
  exportarSTL: (capas: CapaId[]) => Blob;
  /** Captura lo que se ve ahora mismo (misma cámara, mismas capas) como JPEG; es la base del render fotorrealista. */
  capturar: () => Promise<Blob>;
}

interface Props {
  modelo: Modelo;
  visibles: Record<CapaId, boolean>;
  rayosX: boolean;
  corte: boolean;
  curva: boolean;
  cotas: boolean;
  abierta: boolean;
  /** Tapas de los maleteros abiertas (Aeromóvil 1). */
  maleteros?: boolean;
  /** Sin el pasajero ni su asiento, y con las cotas del espacio trasero que queda (Aeromóvil 1). */
  sinPasajero?: boolean;
  /** Otros vehículos aparcados alrededor (el garaje): id del catálogo, posición del eje delantero en el suelo y giro. */
  garaje?: { id: string; x: number; z: number; giro?: number }[];
  /** Solo el garaje, sin nuestro coche (para mirar un modelo del garaje a solas). */
  soloGaraje?: boolean;
  /** Túnel de viento: flujo calculado (presión en la piel, líneas de corriente, puntos críticos, estela) alrededor de cada cuerpo de `cuerposTunel`. */
  tunel?: boolean;
  /** Los coches del garaje, en fantasma de color y con sus siluetas, encima del nuestro (las posiciones las da `garaje`). */
  superponer?: boolean;
  /** Carteles encima de cada coche ('aeromovil' o el id del garaje), líneas separadas por «\n». Con el túnel abierto van en el túnel. */
  carteles?: Record<string, string>;
  /** Los cuerpos que pasan por el túnel (nuestro diseño y los coches del garaje con silueta), con su posición. */
  cuerposTunel?: CuerpoTunel[];
  /** Resolución, líneas, qué se ve y a qué velocidad (la separación y la estela dependen de ella). */
  opcionesTunel?: OpcionesTunel;
  /** Al pinchar (o tocar) el cartel de un punto crítico del túnel: qué cuerpo y qué punto. */
  alElegirPuntoTunel?: (s: SeleccionTunel) => void;
  /** El punto del túnel cuya explicación está abierta (su cartel se ve más grande). */
  puntoTunel?: SeleccionTunel | null;
  vista: Vista;
  /** Al pinchar en una pieza: su componente (para ir a su página). */
  alPinchar?: (componente: string) => void;
  /** Al soltar un coche del garaje arrastrado en el 3D: su nueva posición (eje delantero en el suelo). Sin ella no se arrastra. */
  alMoverGaraje?: (id: string, x: number, z: number) => void;
  /** Otro velomóvil: oculto, comparado (fantasma junto al nuestro) o solo. */
  referencia?: Referencia | null;
  modoRef?: 'no' | 'comparar' | 'sola';
  alinear?: 'eje' | 'morro' | 'lado';
}

const VISTAS: Record<Vista, [number, number, number]> = {
  iso: [-3.6, 2.8, -6.6], side: [-1.5, 0.9, -7.6], top: [-1.5, 8.8, 0.01], front: [5.4, 1.1, 0], back: [-8.6, 1.2, 0.01],
};

type V3 = [number, number, number];
const rot = (p: [number, number], c: [number, number], a: number): [number, number] => {
  const cs = Math.cos(a), sn = Math.sin(a), dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * cs - dy * sn, c[1] + dx * sn + dy * cs];
};

/** Una célula monocristalina de 125 mm: azul muy oscuro, junta fina y poco más clara, esquinas achaflanadas, dos barras colectoras tenues. */
/**
 * How far back a camera must sit, looking at `centro` from the direction `haciaCamara`, for
 * every point to land inside the view. `margenH`/`margenV` keep clear of the toolbar and the
 * cards drawn over the viewer. Closed form per point: depth = D + r·fwd must satisfy
 * |r·right| ≤ tan(fovH/2)·depth and |r·up| ≤ tan(fovV/2)·depth.
 */
/** How far the visitor can zoom out by hand. Framing every car at once may go further (see `verTodos`). */
const MAX_ORBITA = 25;

function distanciaParaVer(puntos: THREE.Vector3[], centro: THREE.Vector3, haciaCamara: THREE.Vector3, cam: THREE.PerspectiveCamera, margenH = 0.9, margenV = 0.76) {
  const fwd = haciaCamara.clone().normalize().negate();
  const right = new THREE.Vector3().crossVectors(fwd, cam.up).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd);
  const tv = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2), th = tv * cam.aspect;
  const r = new THREE.Vector3();
  let D = 0;
  for (const p of puntos) {
    r.subVectors(p, centro);
    const f = r.dot(fwd);
    D = Math.max(D, Math.abs(r.dot(right)) / (th * margenH) - f, Math.abs(r.dot(up)) / (tv * margenV) - f);
  }
  return D;
}

function texturaSolar() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#2b3350'; g.fillRect(0, 0, 128, 128);                 // la junta (un poco más clara que la célula)
  g.fillStyle = '#0b1230';
  g.beginPath(); g.moveTo(8, 2); g.lineTo(120, 2); g.lineTo(126, 8); g.lineTo(126, 120); g.lineTo(120, 126); g.lineTo(8, 126); g.lineTo(2, 120); g.lineTo(2, 8); g.closePath(); g.fill();
  g.strokeStyle = '#1e2a4a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(6, 43); g.lineTo(122, 43); g.moveTo(6, 85); g.lineTo(122, 85); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Ruido fino repetible (canvas), para que la pintura y el suelo no sean lisos de ordenador. */
function texturaRuido(tam: number, base: number, amp: number, semilla = 7, repetir = 1) {
  const c = document.createElement('canvas'); c.width = c.height = tam;
  const g = c.getContext('2d')!, img = g.createImageData(tam, tam), d = img.data;
  let x = semilla;
  const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  for (let i = 0; i < tam * tam; i++) { const v = Math.max(0, Math.min(255, base + (rnd() - 0.5) * amp)); d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = v; d[4 * i + 3] = 255; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repetir, repetir); t.anisotropy = 4;
  return t;
}
/**
 * Neumático (2026-11-06, Eugenio: «mejora las texturas de las ruedas, máximo
 * realismo»). Tres mapas sobre el mismo lienzo, en coordenadas del torno:
 * u da la vuelta a la rueda, v recorre el perfil (flanco interior, banda de
 * rodadura entre v = 0,3125 y 0,6875, flanco exterior; ver `PERFIL_NEUM`).
 * Color: caucho casi negro, más claro en los tacos y oscuro en los surcos.
 * Relieve: cuatro surcos circunferenciales, laminillas en V y la banda de
 * rodadura más alta que el flanco; en el flanco, el aro de letras en relieve.
 * Rugosidad: los tacos pulidos por el uso, los surcos y el flanco mates.
 */
function texturasNeumatico() {
  const W = 2048, H = 512, v0 = 0.3125 * H, v1 = 0.6875 * H;
  const lienzo = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')!] as const; };
  const [cc, g] = lienzo(), [cb, gb] = lienzo(), [cr, gr] = lienzo();
  let x = 5; const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  // Flancos: caucho mate con un grano fino
  g.fillStyle = '#171717'; g.fillRect(0, 0, W, H);
  gb.fillStyle = '#707070'; gb.fillRect(0, 0, W, H);
  gr.fillStyle = '#e6e6e6'; gr.fillRect(0, 0, W, H);
  for (let i = 0; i < 60000; i++) { const px = rnd() * W, py = rnd() * H, v = 20 + rnd() * 10; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(px, py, 2, 2); }
  // Aro de letras en relieve en cada flanco (bloques, como un «AEROMOVIL 125/80 R13» sin letras legibles)
  for (const [ya, yb] of [[v0 * 0.42, v0 * 0.58], [H - v0 * 0.58, H - v0 * 0.42]]) {
    gb.fillStyle = '#7c7c7c'; gb.fillRect(0, ya - 6, W, yb - ya + 12);
    let px = 0; while (px < W) { const w = 10 + rnd() * 22; if (rnd() > 0.2) { gb.fillStyle = '#9a9a9a'; gb.fillRect(px, ya, w, yb - ya); g.fillStyle = '#1e1e1e'; g.fillRect(px, ya, w, yb - ya); } px += w + 6 + (rnd() > 0.85 ? 40 : 0); }
    gr.fillStyle = '#f2f2f2'; gr.fillRect(0, ya, W, yb - ya);
  }
  // Banda de rodadura: más alta (clara en el relieve), tacos pulidos
  g.fillStyle = '#242424'; g.fillRect(0, v0, W, v1 - v0);
  gb.fillStyle = '#c8c8c8'; gb.fillRect(0, v0, W, v1 - v0);
  gr.fillStyle = '#b4b4b4'; gr.fillRect(0, v0, W, v1 - v0);
  // Hombros redondeados: el relieve baja suavemente hacia el flanco
  for (let k = 0; k < 14; k++) { const t = k / 14, v = 112 + (200 - 112) * t; gb.fillStyle = `rgb(${v},${v},${v})`; gb.fillRect(0, v0 - 14 + k, W, 1); gb.fillRect(0, v1 + 13 - k, W, 1); }
  // Cuatro surcos circunferenciales (anchos de 8 a 11 px) y la laminilla central
  const surcos = [0.16, 0.38, 0.62, 0.84];
  for (const f of surcos) { const y = v0 + (v1 - v0) * f, a = f === 0.38 || f === 0.62 ? 11 : 8; g.fillStyle = '#0b0b0b'; g.fillRect(0, y - a / 2, W, a); gb.fillStyle = '#202020'; gb.fillRect(0, y - a / 2, W, a); gr.fillStyle = '#ffffff'; gr.fillRect(0, y - a / 2, W, a); }
  // Laminillas en V (dibujo direccional): cada 48 px, inclinadas y desplazadas por costilla
  g.strokeStyle = '#0e0e0e'; gb.strokeStyle = '#303030'; gr.strokeStyle = '#ffffff';
  g.lineWidth = 3; gb.lineWidth = 3; gr.lineWidth = 3;
  const costillas = [[0, 0.16], [0.16, 0.38], [0.38, 0.62], [0.62, 0.84], [0.84, 1]];
  for (let px = 0; px < W; px += 48) for (let i = 0; i < costillas.length; i++) {
    const [fa, fb] = costillas[i], ya = v0 + (v1 - v0) * fa + 5, yb = v0 + (v1 - v0) * fb - 5, lado = (v0 + v1) / 2 > (ya + yb) / 2 ? 1 : -1, off = (i * 17) % 48;
    for (const ctx of [g, gb, gr]) { ctx.beginPath(); ctx.moveTo(px + off, ya); ctx.lineTo(px + off + lado * 18, yb); ctx.stroke(); }
    // y una laminilla fina a mitad de camino
    for (const ctx of [g, gb, gr]) { ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + off + 24, ya); ctx.lineTo(px + off + 24 + lado * 18, yb); ctx.stroke(); ctx.lineWidth = 3; }
  }
  // Grano fino en los tacos (el caucho nunca es liso)
  for (let i = 0; i < 40000; i++) { const px = rnd() * W, py = v0 + rnd() * (v1 - v0), v = 180 + rnd() * 50; gb.fillStyle = `rgb(${v},${v},${v})`; gb.fillRect(px, py, 1, 1); }
  const mk = (c: HTMLCanvasElement, srgb = false) => { const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { color: mk(cc, true), relieve: mk(cb), rugosidad: mk(cr) };
}
/** Sombra de contacto bajo el neumático: una mancha oscura con borde difuso que ancla la rueda al suelo (la luz difusa no llega ahí). */
let _sombraTex: THREE.Texture | null = null;
function sombraContacto(r: number, w: number) {
  if (!_sombraTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128); _sombraTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, alphaMap: _sombraTex, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(r * 0.75, w * 0.9, 1); m.position.y = -r + 0.004; m.renderOrder = -1; return m;
}
/** Perfil del neumático para el torno, de la pestaña interior a la exterior: flanco abombado, hombro redondo, banda de rodadura ligeramente bombeada. 17 puntos: los índices 5–11 son la banda (v de 0,3125 a 0,6875 en la textura). */
const desplazarV = (t: THREE.Texture) => { const c = t.clone(); c.wrapT = THREE.RepeatWrapping; c.offset.y = 0.5; c.needsUpdate = true; return c; };
function perfilNeumatico(r: number, w: number, rLlanta: number): THREE.Vector2[] {
  const h = r - rLlanta, pts: THREE.Vector2[] = [];
  const flanco = (t: number) => rLlanta + h * (0.08 + 0.80 * t);            // radio a lo largo del flanco
  const abombo = (t: number) => w / 2 * (0.88 + 0.12 * Math.sin(Math.PI * Math.min(1, t * 1.15)));   // el flanco sobresale a media altura
  for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push(new THREE.Vector2(flanco(t), -abombo(t))); }
  // Hombro y banda: siete puntos de -w/2·0.86 a +w/2·0.86 con bombeo de 4 mm en el centro
  for (let i = 0; i <= 6; i++) { const t = i / 6, zz = (t - 0.5) * 2, hombro = i === 0 || i === 6 ? 0.012 : 0; pts.push(new THREE.Vector2(r - 0.004 * zz * zz - hombro, (t - 0.5) * w * 0.86)); }
  for (let i = 4; i >= 0; i--) { const t = i / 4; pts.push(new THREE.Vector2(flanco(t), abombo(t))); }
  return pts;
}
/**
 * Cara de la llanta aerodinámica (disco casi cerrado, como el Aptera): metal
 * cepillado con cinco ranuras de ventilación en forma de lágrima, el borde
 * pulido y el centro hundido. Color + relieve + rugosidad en coordenadas del
 * disco (u, v en [0, 1], centro en 0,5).
 */
function texturasLlanta() {
  const N = 1024, mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return [c, c.getContext('2d')!] as const; };
  const [cc, g] = mk(), [cb, gb] = mk(), [cr, gr] = mk(), C = N / 2;
  let x = 9; const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  // Metal cepillado en círculos: anillos finos con brillo variable
  g.fillStyle = '#c9ccd0'; g.fillRect(0, 0, N, N); gb.fillStyle = '#808080'; gb.fillRect(0, 0, N, N); gr.fillStyle = '#5a5a5a'; gr.fillRect(0, 0, N, N);
  for (let r = 0; r < C; r += 1.5) { const v = 185 + (rnd() - 0.5) * 50; g.strokeStyle = `rgb(${v},${v + 2},${v + 5})`; g.lineWidth = 1.5; g.beginPath(); g.arc(C, C, r, 0, 2 * Math.PI); g.stroke(); }
  // Centro hundido: más oscuro hacia el buje
  const grad = g.createRadialGradient(C, C, 0, C, C, C); grad.addColorStop(0, 'rgba(70,74,80,0.55)'); grad.addColorStop(0.28, 'rgba(70,74,80,0.0)'); grad.addColorStop(0.93, 'rgba(255,255,255,0)'); grad.addColorStop(1, 'rgba(255,255,255,0.35)');
  g.fillStyle = grad; g.fillRect(0, 0, N, N);
  const gradB = gb.createRadialGradient(C, C, 0, C, C, C); gradB.addColorStop(0, '#404040'); gradB.addColorStop(0.3, '#808080'); gradB.addColorStop(0.9, '#808080'); gradB.addColorStop(1, '#b0b0b0');
  gb.fillStyle = gradB; gb.fillRect(0, 0, N, N);
  // Cinco ranuras en lágrima, de r = 0,38 a 0,82, giradas 12° (sentido de giro)
  for (let k = 0; k < 5; k++) {
    const a = 2 * Math.PI * k / 5 - Math.PI / 2;
    for (const [ctx, col] of [[g, '#1c1e22'], [gb, '#2a2a2a'], [gr, '#f0f0f0']] as const) {
      ctx.save(); ctx.translate(C, C); ctx.rotate(a); ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(0.38 * C, -0.030 * C); ctx.quadraticCurveTo(0.60 * C, -0.075 * C, 0.82 * C, -0.040 * C); ctx.arc(0.82 * C, 0, 0.040 * C, -Math.PI / 2, Math.PI / 2);
      ctx.quadraticCurveTo(0.60 * C, 0.075 * C, 0.38 * C, 0.030 * C); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    // bisel claro en el borde de ataque de cada ranura
    g.save(); g.translate(C, C); g.rotate(a); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0.40 * C, -0.034 * C); g.quadraticCurveTo(0.60 * C, -0.079 * C, 0.80 * C, -0.046 * C); g.stroke(); g.restore();
  }
  const tex = (c: HTMLCanvasElement, srgb = false) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { color: tex(cc, true), relieve: tex(cb), rugosidad: tex(cr) };
}
/** Matrícula europea: banda azul con las estrellas y la «E», y el número en negro sobre blanco. */
function texturaMatricula(texto: string) {
  const c = document.createElement('canvas'); c.width = 1040; c.height = 220; const g = c.getContext('2d')!;
  g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 1040, 220);
  g.fillStyle = '#003399'; g.fillRect(0, 0, 100, 220);
  g.fillStyle = '#ffcc00'; for (let k = 0; k < 12; k++) { const a = 2 * Math.PI * k / 12; g.beginPath(); g.arc(50 + 28 * Math.cos(a), 78 + 28 * Math.sin(a), 4, 0, 2 * Math.PI); g.fill(); }
  g.fillStyle = '#ffffff'; g.font = '700 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('E', 50, 172);
  g.fillStyle = '#111'; g.font = '700 150px "DIN Alternate", "Arial Narrow", sans-serif'; g.fillText(texto, 570, 112);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/** Disco de freno: hierro gris con el anillo de rozamiento rayado y los taladros. */
function texturasDisco() {
  const N = 512, mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return [c, c.getContext('2d')!] as const; };
  const [cc, g] = mk(), [cb, gb] = mk(), C = N / 2;
  g.fillStyle = '#6a6c6e'; g.fillRect(0, 0, N, N); gb.fillStyle = '#808080'; gb.fillRect(0, 0, N, N);
  for (let r = 0.52 * C; r < C; r += 2) { const v = 95 + (r % 7) * 6; g.strokeStyle = `rgb(${v},${v},${v + 2})`; g.lineWidth = 1.5; g.beginPath(); g.arc(C, C, r, 0, 2 * Math.PI); g.stroke(); }
  g.fillStyle = '#4a4c4e'; g.beginPath(); g.arc(C, C, 0.5 * C, 0, 2 * Math.PI); g.fill();
  for (let k = 0; k < 24; k++) { const a = 2 * Math.PI * k / 24, rr = (0.64 + 0.14 * (k % 2)) * C; for (const [ctx, col] of [[g, '#2a2a2a'], [gb, '#101010']] as const) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(C + rr * Math.cos(a), C + rr * Math.sin(a), 0.018 * C, 0, 2 * Math.PI); ctx.fill(); } }
  const tex = (c: HTMLCanvasElement, srgb = false) => { const t = new THREE.CanvasTexture(c); t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { color: tex(cc, true), relieve: tex(cb) };
}
/** Asfalto: ruido grueso y oscuro con un velo claro, y una rejilla muy tenue de 50 cm. */
function texturaAsfalto() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d')!, img = g.createImageData(512, 512), d = img.data;
  let x = 11; const rnd = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  for (let i = 0; i < 512 * 512; i++) { const v = 150 + (rnd() - 0.5) * 70 + (rnd() > 0.985 ? 60 : 0); d[4 * i] = v; d[4 * i + 1] = v + 2; d[4 * i + 2] = v + 5; d[4 * i + 3] = 255; }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 1;
  for (const k of [0, 256]) { g.beginPath(); g.moveTo(k + 0.5, 0); g.lineTo(k + 0.5, 512); g.moveTo(0, k + 0.5); g.lineTo(512, k + 0.5); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/**
 * Calidad del visor (2026-11-07, Eugenio: «mejora la calidad del render de
 * todos los componentes para que sea más fotorrealista»): en ordenador, con
 * ratón, se activan la oclusión ambiental (GTAO: las sombras suaves en los
 * rincones, bajo el coche, entre piezas), el cristal con transmisión y el
 * antialias por multimuestreo; en móvil se queda lo de antes, que ya va justo.
 */
/** The environment JPG stores radiance divided by this (with the sun painted out, the brightest sky is ~1.15). */
const ENTORNO_ESCALA = 1.2;
const CALIDAD_ALTA = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches && !/Mobi|Android/i.test(navigator.userAgent);

function materiales() {
  const grano = texturaRuido(256, 128, 70, 3, 40), neum = texturasNeumatico(), llantaTx = texturasLlanta(), discoTx = texturasDisco(), relieveSolar = texturaSolar();
  return {
    // Pintura perlada: base blanca con grano metálico fino bajo un barniz brillante.
    body: new THREE.MeshPhysicalMaterial({ color: 0xf4f5f6, metalness: 0.12, roughness: 0.38, roughnessMap: grano, bumpMap: grano, bumpScale: 0.0004, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1, sheen: 0.15, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
    // Cristal: en calidad alta, transmisión de verdad (se ve el interior a través, con tinte y refracción); en media, el vidrio tintado de siempre.
    glass: CALIDAD_ALTA
      ? new THREE.MeshPhysicalMaterial({ color: 0x9fb3c4, metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5, transmission: 0.95, thickness: 0.006, ior: 1.52, attenuationColor: new THREE.Color(0x4f6b80), attenuationDistance: 0.25, side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color: 0x0c161f, metalness: 0.2, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
    solar: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: relieveSolar, bumpMap: relieveSolar, bumpScale: 0.0012, metalness: 0.3, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3, side: THREE.DoubleSide }),
    // Goma negra mate alrededor de los cristales, y la pieza azul marino del morro (Aptera).
    goma: new THREE.MeshStandardMaterial({ color: 0x141516, metalness: 0.05, roughness: 0.85, side: THREE.DoubleSide }),
    morro: new THREE.MeshPhysicalMaterial({ color: 0x182544, metalness: 0.2, roughness: 0.32, roughnessMap: grano, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1, side: THREE.DoubleSide }),
    bajos: new THREE.MeshPhysicalMaterial({ color: 0x1a1c1f, metalness: 0.2, roughness: 0.6, roughnessMap: grano, clearcoat: 0.35, side: THREE.DoubleSide }),
    techoInterior: new THREE.MeshStandardMaterial({ color: 0xcfd3d8, roughness: 0.9, metalness: 0, side: THREE.FrontSide }),
    cableHV: new THREE.MeshStandardMaterial({ color: 0xe8701a, metalness: 0.1, roughness: 0.6 }),
    muelle: new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: 0.5, roughness: 0.4 }),
    llanta: new THREE.MeshPhysicalMaterial({ color: 0xd9dcdf, metalness: 0.6, roughness: 0.25, clearcoat: 0.8 }),
    pinza: new THREE.MeshStandardMaterial({ color: 0xb8352a, metalness: 0.5, roughness: 0.45 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xa9b1b9, metalness: 0.85, roughness: 0.32 }),
    susp: new THREE.MeshStandardMaterial({ color: 0xde9223, metalness: 0.6, roughness: 0.3 }),
    stanch: new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 0.95, roughness: 0.15 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.3, roughness: 0.5 }),
    // Caucho: el color, el relieve del dibujo y la rugosidad salen del mismo lienzo (ver `texturasNeumatico`); un poco de sheen para el velo mate del flanco.
    tire: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: neum.color, bumpMap: neum.relieve, bumpScale: 0.0035, roughnessMap: neum.rugosidad, roughness: 1, metalness: 0, sheen: 0.35, sheenRoughness: 0.9, sheenColor: new THREE.Color(0x3a3a3a), envMapIntensity: 0.6 }),
    // El mismo caucho para las ruedas de bici del Gota (toro): su v da la vuelta al tubo desde fuera, así que la banda va centrada en v = 0.
    tireBici: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: desplazarV(neum.color), bumpMap: desplazarV(neum.relieve), bumpScale: 0.003, roughnessMap: desplazarV(neum.rugosidad), roughness: 1, metalness: 0, sheen: 0.35, sheenRoughness: 0.9, sheenColor: new THREE.Color(0x3a3a3a), envMapIntensity: 0.6 }),
    // Cara de la llanta aerodinámica: metal cepillado con ranuras, barniz encima.
    caraLlanta: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: llantaTx.color, bumpMap: llantaTx.relieve, bumpScale: 0.004, roughnessMap: llantaTx.rugosidad, roughness: 1, metalness: 0.85, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2, side: THREE.DoubleSide }),
    discoFreno: new THREE.MeshStandardMaterial({ color: 0xffffff, map: discoTx.color, bumpMap: discoTx.relieve, bumpScale: 0.002, metalness: 0.75, roughness: 0.45 }),
    tuerca: new THREE.MeshPhysicalMaterial({ color: 0x9ea4aa, metalness: 0.95, roughness: 0.3, clearcoat: 0.5 }),
    rim: new THREE.MeshPhysicalMaterial({ color: 0xcfd3d7, metalness: 0.95, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 }),
    seat: new THREE.MeshPhysicalMaterial({ color: 0x2a2d31, metalness: 0.2, roughness: 0.45, clearcoat: 0.6 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc9a27c, metalness: 0, roughness: 0.75 }),
    ropaPiloto: new THREE.MeshStandardMaterial({ color: 0x2f4f5f, metalness: 0, roughness: 0.85 }),
    ropaPasajero: new THREE.MeshStandardMaterial({ color: 0x6b5d52, metalness: 0, roughness: 0.85 }),
    pantalon: new THREE.MeshStandardMaterial({ color: 0x2b2f38, metalness: 0, roughness: 0.9 }),
    zapato: new THREE.MeshStandardMaterial({ color: 0x1d1d1f, metalness: 0.1, roughness: 0.6 }),
    pelo: new THREE.MeshStandardMaterial({ color: 0x3a2a20, metalness: 0, roughness: 0.9 }),
    soldadura: new THREE.MeshStandardMaterial({ color: 0x9aa2aa, metalness: 0.8, roughness: 0.4 }),
    carcasa: new THREE.MeshStandardMaterial({ color: 0x18191b, metalness: 0.4, roughness: 0.35 }),
    motor: new THREE.MeshStandardMaterial({ color: 0xb5533a, metalness: 0.55, roughness: 0.35 }),
    batt: new THREE.MeshStandardMaterial({ color: 0x2f7fd0, metalness: 0.3, roughness: 0.45 }),
    spoke: new THREE.LineBasicMaterial({ color: 0x9aa1a8 }),
    logo: new THREE.MeshStandardMaterial({ map: (() => { const t = new THREE.TextureLoader().load('/logo-v2.png'); t.colorSpace = THREE.SRGBColorSpace; return t; })(), roughness: 0.4, metalness: 0.1 }),
    matricula: new THREE.MeshStandardMaterial({ map: texturaMatricula('2727 ES'), roughness: 0.5, metalness: 0.05 }),
    faro: new THREE.MeshStandardMaterial({ color: 0xf4f7fb, emissive: 0xf4f7fb, emissiveIntensity: 1.3 }),
    piloto: new THREE.MeshStandardMaterial({ color: 0xd33a2c, emissive: 0xd33a2c, emissiveIntensity: 1.3 }),
    intermitenteI: new THREE.MeshStandardMaterial({ color: 0xf29a1f, emissive: 0xf29a1f, emissiveIntensity: 0.15 }),
    intermitenteD: new THREE.MeshStandardMaterial({ color: 0xf29a1f, emissive: 0xf29a1f, emissiveIntensity: 0.15 }),
    cota: new THREE.LineBasicMaterial({ color: 0x0e5e6b, depthTest: false, transparent: true }),
    cotaFlecha: new THREE.MeshBasicMaterial({ color: 0x0e5e6b, depthTest: false, transparent: true }),
  };
}
type Mats = ReturnType<typeof materiales>;

const _up = new THREE.Vector3(0, 1, 0);
function tube(g: THREE.Object3D, a: V3, b: V3, d: number, mat: THREE.Material) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), v = B.clone().sub(A), L = v.length();
  if (L < 1e-5) return;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, L, 20, 1), mat);
  m.position.copy(A).addScaledVector(v, 0.5);
  m.quaternion.setFromUnitVectors(_up, v.normalize());
  m.castShadow = true; g.add(m);
}
function sphere(g: THREE.Object3D, c: V3, r: number, mat: THREE.Material, escala?: V3) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat); m.position.set(...c); if (escala) m.scale.set(...escala); m.castShadow = true; g.add(m); return m;
}
function box(g: THREE.Object3D, c: V3, s: V3, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...s), mat); m.position.set(...c); m.castShadow = true; g.add(m);
}
function disk(g: THREE.Object3D, c: V3, r: number, w: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 40), mat); m.rotation.x = Math.PI / 2; m.position.set(...c); m.castShadow = true; g.add(m);
}
function vaciar(g: THREE.Object3D) {
  while (g.children.length) { const o = g.children.pop()!; o.traverse((c: any) => { c.geometry?.dispose?.(); if (c.isSprite) { c.material.map?.dispose(); c.material.dispose(); } }); }
}
const unicos = (v: number[]) => { v.sort((a, b) => a - b); const o: number[] = []; for (const x of v) if (!o.length || x - o[o.length - 1] > 1e-4) o.push(x); return o; };

/** Una superficie de piel: una rejilla (u, θ) que respeta los bordes de cristales, paneles, puertas y huecos. */
function construirSuperficie(S: Superficie) {
  const T = S.tMax, cerrada = T > Math.PI * 1.5;
  const us: number[] = [], ts: number[] = [];
  const nU = 160, nT = cerrada ? 112 : 56;
  for (let i = 0; i <= nU; i++) us.push(S.u0 + (S.u1 - S.u0) * (1 - Math.cos(Math.PI * i / nU)) / 2);
  for (let j = 0; j <= nT; j++) ts.push(T * j / nT);
  const enRango = (u: number) => u >= S.u0 - 1e-9 && u <= S.u1 + 1e-9;
  for (const z of [...S.zonas, ...S.puertas]) {
    if (enRango(z.u0)) us.push(z.u0); if (enRango(z.u1)) us.push(z.u1);
    for (const t of [z.t0, z.t1]) { const tt = cerrada ? ((t % T) + T) % T : Math.min(T, Math.max(0, t)); ts.push(tt); }
    // Un arco elíptico se recorta celda a celda: más celdas dentro de su
    // rectángulo para que apenas se vean los dientes.
    if (z.elipse) {
      for (let k = 1; k < 28; k++) { const u = z.u0 + (z.u1 - z.u0) * k / 28; if (enRango(u)) us.push(u); }
      for (let k = 1; k < 20; k++) { const t = z.t0 + (z.t1 - z.t0) * k / 20; ts.push(cerrada ? ((t % T) + T) % T : Math.min(T, Math.max(0, t))); }
    }
    // El montante inclinado del parabrisas: filas y columnas finas en su rectángulo, y el marco tapa el resto.
    if (z.tDe && 'piel' in z && (z.piel === 'cristal' || z.piel === 'marco' || z.piel === 'hueco')) {
      for (let k = 1; k < 36; k++) { const u = z.u0 + (z.u1 - z.u0) * k / 36; if (enRango(u)) us.push(u); }
      for (let k = 1; k < 12; k++) ts.push(z.t0 + (z.t1 - z.t0) * k / 12);
    }
  }
  // Un borde que varía a lo largo (la banda negra en V) no se recorta: la
  // rejilla se deforma fila a fila para que ese borde caiga justo en dos
  // columnas de la malla, y así queda una línea limpia y no una escalera.
  const banda = S.zonas.find(z => z.tDe && z.piel === 'bajos');
  let medL = 0, medR = 0;
  if (banda) {
    for (let k = 0; k <= 20; k++) { const [a, b] = banda.tDe!(banda.u0 + (banda.u1 - banda.u0) * k / 20); medL += a / 21; medR += b / 21; }
    ts.push(medL, medR);
    for (let k = 1; k < 90; k++) { const u = banda.u0 + (banda.u1 - banda.u0) * k / 90; if (enRango(u)) us.push(u); }
  }
  const U = unicos(us), TH = unicos(ts.map(t => (t >= T - 1e-6 ? T : t)));
  if (TH[TH.length - 1] < T) TH.push(T);
  const nu = U.length, nv = TH.length;
  const cerca = (t: number) => { let j = 0; for (let k = 1; k < nv; k++) if (Math.abs(TH[k] - t) < Math.abs(TH[j] - t)) j = k; return j; };
  const jL = banda ? cerca(medL) : -1, jR = banda ? cerca(medR) : -1;
  const real = (i: number, t: number) => {
    if (!banda || jL < 1 || jR <= jL || jR >= nv - 1) return t;
    const u = U[i]; if (u < banda.u0 || u > banda.u1) return t;
    // Solo se deforma la mitad de abajo (de π a 2π): la de arriba, con las puertas y los paneles, se queda como está.
    const [a, b] = banda.tDe!(u), pts: [number, number][] = [[0, 0], [Math.PI, Math.PI], [TH[jL], a], [TH[jR], b], [T, T]];
    for (let k = 0; k < 4; k++) if (t <= pts[k + 1][0]) { const [x0, y0] = pts[k], [x1, y1] = pts[k + 1]; return x1 > x0 ? y0 + (y1 - y0) * (t - x0) / (x1 - x0) : y1; }
    return t;
  };
  const pos: V3[][] = U.map((u, i) => { const f = S.frame(u); return TH.map(t => S.sec(f, real(i, t))); });
  // Normales por diferencias finitas sobre la rejilla completa: así no hay
  // costuras de sombreado entre zonas vecinas.
  const nor: V3[][] = pos.map((fila, i) => fila.map((_, j) => {
    const ip = Math.min(nu - 1, i + 1), im = Math.max(0, i - 1);
    const a = pos[ip][j], b = pos[im][j];
    const jp = j === nv - 1 ? (cerrada ? 1 : nv - 1) : j + 1, jm = j === 0 ? (cerrada ? nv - 2 : 0) : j - 1;
    const c = pos[i][jp], d = pos[i][jm];
    const du = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dt = [c[0] - d[0], c[1] - d[1], c[2] - d[2]];
    const n: V3 = [dt[1] * du[2] - dt[2] * du[1], dt[2] * du[0] - dt[0] * du[2], dt[0] * du[1] - dt[1] * du[0]];
    const L = Math.hypot(...n) || 1; return [n[0] / L, n[1] / L, n[2] / L];
  }));
  // Coordenadas de textura: proyección en planta (x, z), así las células
  // solares se ven rectangulares desde arriba; los costados casi verticales
  // no llevan células (son flanco negro o ventanilla).
  type Cubo = { p: number[]; n: number[]; uv: number[]; i: number[]; mapa: Map<number, number> };
  const cubos = new Map<string, Cubo>();
  const meter = (c: Cubo, i: number, j: number) => {
    const k = i * nv + j; let v = c.mapa.get(k);
    if (v === undefined) {
      v = c.p.length / 3; c.mapa.set(k, v);
      const q = pos[i][j]; c.p.push(...q); c.n.push(...nor[i][j]); c.uv.push(q[0] / CELULA, q[2] / CELULA);
    }
    return v;
  };
  for (let i = 0; i < nu - 1; i++) for (let j = 0; j < nv - 1; j++) {
    const uc = (U[i] + U[i + 1]) / 2, tc = (real(i, TH[j]) + real(i, TH[j + 1]) + real(i + 1, TH[j]) + real(i + 1, TH[j + 1])) / 4;
    const zona = S.zonas.find(z => enZona(z, uc, tc));
    const piel: Piel = zona ? zona.piel : S.pielBase;
    if (piel === 'hueco') continue;
    const puerta = S.puertas.find(z => enZona(z, uc, tc));
    const clave = `${puerta?.id ?? 'fijo'}|${piel}`;
    let c = cubos.get(clave);
    if (!c) { c = { p: [], n: [], uv: [], i: [], mapa: new Map() }; cubos.set(clave, c); }
    const a = meter(c, i, j), a1 = meter(c, i, j + 1), b = meter(c, i + 1, j), b1 = meter(c, i + 1, j + 1);
    c.i.push(a, a1, b, a1, b1, b);
  }
  const out: { puerta: string; piel: Piel; geo: THREE.BufferGeometry }[] = [];
  for (const [clave, c] of cubos) {
    const [puerta, piel] = clave.split('|') as [string, Piel];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(c.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(c.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(c.uv, 2));
    g.setIndex(c.i);
    out.push({ puerta, piel, geo: g });
  }
  return out;
}

function rueda(g: THREE.Object3D, M: Mats, x: number, y: number, z: number, r: number) {
  const w = new THREE.Group(); w.position.set(x, y, z); g.add(w);
  const t = new THREE.Mesh(new THREE.TorusGeometry(r - TIRE_W / 2, TIRE_W / 2, 18, 96), M.tireBici); t.castShadow = true; w.add(t);
  w.add(new THREE.Mesh(new THREE.TorusGeometry(r - 0.06, 0.011, 8, 64), M.rim));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.10, 20), M.rim); hub.rotation.x = Math.PI / 2; w.add(hub);
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.003, 40), M.black); rotor.rotation.x = Math.PI / 2; rotor.position.z = 0.035; w.add(rotor);
  const pts: number[] = [];
  for (let k = 0; k < 28; k++) {
    const a = 2 * Math.PI * k / 28, s = k % 2 ? 1 : -1, b = a + 0.35 * s;
    pts.push(0.028 * Math.cos(a), 0.028 * Math.sin(a), s * 0.035, (r - 0.065) * Math.cos(b), (r - 0.065) * Math.sin(b), 0);
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  w.add(new THREE.LineSegments(lg, M.spoke));
}

/** Asiento ligero: base acolchada, respaldo alto, cabecero y el marco de tubo detrás. */
function asiento(g: THREE.Object3D, M: Mats, m: ModeloConPiel, piloto: boolean, lat: number, w: number) {
  const a = m.asientoPiezas(piloto);
  const pieza = (pts: [number, number][], ancho: number, mat: THREE.Material) => {
    const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => sh.lineTo(p[0], p[1])); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: ancho, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 3, curveSegments: 4 });
    geo.translate(0, 0, -ancho / 2 + lat);
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; g.add(mesh);
  };
  pieza(a.base, w - 0.10, M.seat);
  pieza(a.respaldo, w - 0.10, M.seat);
  pieza(a.cabecero, a.anchoCabecero - 0.02, M.seat);
  for (const s of [-1, 1]) {
    const z = lat + s * (w / 2 - 0.09);
    for (let i = 0; i < a.marco.length - 1; i++) tube(g, [a.marco[i][0], a.marco[i][1], z], [a.marco[i + 1][0], a.marco[i + 1][1], z], 0.018, M.alu);
  }
}

/** Un tubo curvado por sus puntos de paso (la misma curva que mide `largoTubo`). */
function tuboCurvo(g: THREE.Object3D, pts: V3[], d: number, mat: THREE.Material) {
  const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'catmullrom', 0.5);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(c, 48, d / 2, 12, false), mat); mesh.castShadow = true; g.add(mesh);
  for (const p of [pts[0], pts[pts.length - 1]]) sphere(g, p, d / 2, mat);
}

/** Cápsula de `a` a `b` con radio `r`, ensanchada de lado (`ancho`) y aplanada de fondo (`fondo`). */
function capsula(g: THREE.Object3D, a: V3, b: V3, r: number, mat: THREE.Material, ancho = 1, fondo = 1) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), y = B.clone().sub(A), L = y.length();
  if (L < 1e-4) return;
  y.normalize();
  let z = new THREE.Vector3(0, 0, 1); z.addScaledVector(y, -z.dot(y));
  if (z.lengthSq() < 1e-6) z = new THREE.Vector3(1, 0, 0); z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, L), 6, 16), mat);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  mesh.position.copy(A).addScaledVector(y, L / 2);
  mesh.scale.set(fondo, 1, ancho);
  mesh.castShadow = true; g.add(mesh);
}

/** Codo o rodilla en 3D: dos huesos de `a` a `b`, doblados hacia `polo`. */
function articulacion(a: V3, b: V3, l1: number, l2: number, polo: V3): V3 {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), ab = B.clone().sub(A);
  const d = Math.min(ab.length(), l1 + l2 - 1e-3), u = ab.clone().normalize();
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = new THREE.Vector3(...polo); p.addScaledVector(u, -p.dot(u)).normalize();
  const c = A.clone().addScaledVector(u, x).addScaledVector(p, h);
  return [c.x, c.y, c.z];
}

/** Maniquí articulado: cabeza, cuello, tronco, pelvis, brazos con codos y piernas con pies. */
function ocupante(g: THREE.Object3D, M: Mats, m: { occPts: (piloto: boolean) => PuntosOcupante }, lat: number, piloto: boolean) {
  const o = m.occPts(piloto), d = o.d;
  const ropa = piloto ? M.ropaPiloto : M.ropaPasajero;
  const en = (q: [number, number], l: number): V3 => [q[0], q[1], l];
  const lo = (t: number): [number, number] => [o.H[0] + d[0] * t, o.H[1] + d[1] * t];
  const atras = [-d[1], d[0]] as [number, number];   // perpendicular al tronco, hacia el respaldo
  // Tronco: pelvis, abdomen y pecho, más anchos que hondos
  capsula(g, en(lo(-0.02), lat), en(lo(0.10), lat), 0.12, M.pantalon, 1.35, 0.85);
  capsula(g, en(lo(0.12), lat), en(lo(0.30), lat), 0.12, ropa, 1.25, 0.8);
  capsula(g, en(lo(0.30), lat), en(lo(0.47), lat), 0.135, ropa, 1.35, 0.8);
  // Cuello y cabeza (un poco más alta que ancha), con pelo; la cabeza va más recta que el tronco si el modelo lo dice (`dh`)
  const dh = o.dh ?? d;
  capsula(g, en(lo(0.50), lat), [o.C[0] - dh[0] * 0.08, o.C[1] - dh[1] * 0.08, lat], 0.045, M.skin);
  const cab = new THREE.Mesh(new THREE.SphereGeometry(0.098, 28, 20), M.skin);
  cab.position.set(o.C[0], o.C[1], lat); cab.scale.set(1.05, 1.12, 0.88); cab.rotation.z = -Math.atan2(dh[0], dh[1]); cab.castShadow = true; g.add(cab);
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.102, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), M.pelo);
  pelo.position.copy(cab.position); pelo.scale.copy(cab.scale); pelo.rotation.z = cab.rotation.z;
  pelo.position.x += atras[0] * 0.008; pelo.position.y += atras[1] * 0.008; g.add(pelo);
  for (const s of [-1, 1]) {
    // Pierna: muslo y pantorrilla, rodilla ya calculada en el plano; pie según dónde apoya
    const zc = lat + s * (o.anchoPiernas?.[0] ?? 0.09), zp = lat + s * (o.anchoPiernas?.[1] ?? (piloto ? 0.11 : 0.10));
    const cad = en(o.H, zc), rod = en(o.K, (zc + zp) / 2), tob = en(o.F, zp);
    capsula(g, cad, rod, 0.068, M.pantalon);
    capsula(g, rod, tob, 0.052, M.pantalon);
    const sx = o.F[0] - o.K[0], sy = o.F[1] - o.K[1], sl = Math.hypot(sx, sy) || 1;
    const pie: V3 = piloto ? [tob[0] - sy / sl * 0.17, tob[1] + sx / sl * 0.17, zp] : [tob[0] + 0.18, tob[1] - 0.02, zp];
    capsula(g, tob, pie, 0.042, M.zapato, 1.1, 0.8);
    // Brazo: hombro, codo hacia fuera y abajo, mano en el puño o sobre el muslo
    const hom = en(lo(0.46), lat + s * 0.19);
    sphere(g, hom, 0.06, ropa);
    const manoP: V3 = [o.mano[0], o.mano[1], lat + s * o.anchoMano];
    const codo = articulacion(hom, manoP, 0.30, 0.28, [0, -1, s * 0.7]);
    capsula(g, hom, codo, 0.046, ropa);
    capsula(g, codo, manoP, 0.038, M.skin);
    sphere(g, manoP, 0.045, M.skin, [1.25, 0.8, 0.95]);
  }
}

/** Faros, pilotos, intermitentes, retrovisores y limpiaparabrisas del Aeromóvil Gota. */
function accesorios(g: THREE.Object3D, M: Mats, m: ModeloGota) {
  const sobre = (u: number, th: number, off = 0.004) => m.sec(m.frame(u), th, off);
  const anillo = (u: number, mat: THREE.Material, r: number) => {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 64; j++) pts.push(new THREE.Vector3(...sobre(u, j / 64 * 2 * Math.PI)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, r, 6, true), mat));
  };
  anillo(0.010, M.faro, 0.009);                 // luz diurna alrededor del morro
  for (const th of [0.10 * Math.PI, 0.90 * Math.PI]) {   // faros
    const q = sobre(0.028, th, 0.0);
    const s = sphere(g, q, 0.05, M.faro, [0.45, 0.42, 1.25]); s.lookAt(q[0] + 1, q[1], q[2]);
  }
  // Pilotos traseros: dos faros con carcasa y luz de posición y freno,
  // y la tercera luz de freno en lo alto de la cola.
  for (const th of [0.12 * Math.PI, 0.88 * Math.PI]) {
    const q = sobre(0.955, th, 0.0), f = m.frame(0.955), n = new THREE.Vector3(-0.6, q[1] - f.zc, q[2]).normalize();
    const caja = sphere(g, q, 0.09, M.carcasa, [0.55, 0.62, 0.3]); caja.lookAt(q[0] + n.x, q[1] + n.y, q[2] + n.z);
    const lente = sphere(g, [q[0] + n.x * 0.02, q[1] + n.y * 0.02, q[2] + n.z * 0.02], 0.078, M.piloto, [0.62, 0.66, 0.28]);
    lente.lookAt(q[0] + n.x * 2, q[1] + n.y * 2, q[2] + n.z * 2);
  }
  const fr = sobre(0.93, Math.PI / 2, 0.006); box(g, fr, [0.02, 0.018, 0.22], M.piloto);
  // Intermitentes: delante a los lados y detrás, ámbar
  for (const [th, mat] of [[0.02 * Math.PI, M.intermitenteI], [0.98 * Math.PI, M.intermitenteD]] as const) {
    sphere(g, sobre(0.06, th, 0.004), 0.022, mat, [1.6, 0.7, 0.6]);
    sphere(g, sobre(0.94, th, 0.004), 0.018, mat, [1.4, 0.7, 0.6]);
  }
  // Retrovisores en la base del parabrisas
  const uR = m.zonasPiel[0].u0 + 0.025;
  for (const s of [1, -1]) {
    const base = sobre(uR, s > 0 ? 0.13 * Math.PI : 0.87 * Math.PI, 0);
    const punta: V3 = [base[0] - 0.02, base[1] + 0.04, base[2] + s * 0.13];
    tube(g, base, punta, 0.016, M.black);
    sphere(g, [punta[0] - 0.02, punta[1] + 0.01, punta[2] + s * 0.03], 0.05, M.body, [1.0, 0.65, 1.15]);
  }
  // Limpiaparabrisas: brazo y escobilla sobre el cristal
  const uL = m.zonasPiel[0].u0 + 0.02;
  const piv = sobre(uL, 0.32 * Math.PI, 0.012);
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 12; k++) pts.push(new THREE.Vector3(...sobre(uL + 0.035 * k / 12, (0.34 + 0.28 * k / 12) * Math.PI, 0.012)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.005, 6), M.black));
  sphere(g, piv, 0.012, M.black);
}

/** Faros en rendija, pilotos, intermitentes, retrovisores, limpiaparabrisas y toma de carga del Aeromóvil 1. */
function accesoriosA1(g: THREE.Object3D, M: Mats, m: ModeloA1) {
  const sobre = (u: number, th: number, off = 0.004) => m.sec(m.frame(u), th, off);
  const sobreC = (u: number, th: number, off = 0.004) => m.secC(m.frameC(u), th, off);
  const tira = (pts: V3[], r: number, mat: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, r, 8, false), mat); g.add(mesh); return mesh;
  };
  // Faros: dos rendijas largas y finas en la arista del hombro del morro, a
  // la altura de la punta (0,42–0,46 del alto), embutidas en la piel, como en
  // el SZEmission.
  const thAltura = (u: number, y: number, lado: 1 | -1) => {
    const f = m.frame(u), ay = Math.max(0.01, f.top - f.zc), k = Math.min(0.98, Math.max(0.02, (y - f.zc) / ay));
    const th = Math.asin(Math.pow(k, m.P.nU / 2));
    return lado > 0 ? th : Math.PI - th;
  };
  // Luces como las del Aptera (2026-11-06, Eugenio): delante, una ceja de LED
  // fina que arranca en la pieza azul del morro y sigue el hombro hacia atrás,
  // y una barra blanca de luz diurna cruzando la punta; detrás, una barra roja
  // justo en el borde de fuga de la cola, de lado a lado, con dos cantos.
  for (const s of [1, -1] as (1 | -1)[]) {
    const ceja = [0, 0.2, 0.4, 0.6, 0.8, 1].map(k => { const u = 0.025 + 0.15 * k; return sobre(u, thAltura(u, (0.44 + 0.06 * k) * m.P.H, s), 0); });
    tira(ceja, 0.012, M.black);                           // el alojamiento, a ras de piel
    tira(ceja.map(q => [q[0] + 0.005, q[1] + 0.003, q[2] + s * 0.004] as V3), 0.0065, M.faro);
    tira([0, 1].map(k => { const u = 0.02 + 0.03 * k; return sobre(u, thAltura(u, 0.40 * m.P.H, s), 0.003); }), 0.005, s > 0 ? M.intermitenteI : M.intermitenteD);
    // Canto trasero: una pestaña roja vertical en cada esquina del labio de cola.
    tira([0, 0.5, 1].map(k => sobre(0.985, (s > 0 ? 0.14 + 0.08 * k : 0.86 - 0.08 * k) * Math.PI, 0.003)), 0.006, M.piloto);
  }
  // Barra de luz trasera en la punta misma de la cola, como el Aptera.
  { const barra: V3[] = []; for (let k = 0; k <= 24; k++) barra.push(sobre(0.993, (0.14 + 0.72 * k / 24) * Math.PI, 0.003)); tira(barra, 0.007, M.piloto); }
  // Matrícula (2026-11-06, Eugenio: «2727 ES, con la etiqueta de Europa»): en la cola.
  const placa = (c: V3, normal: THREE.Vector3) => {
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.11), M.matricula); pl.position.set(...c); pl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize()); g.add(pl);
    const marco = new THREE.Mesh(new THREE.PlaneGeometry(0.54, 0.13), M.black); marco.position.copy(pl.position).addScaledVector(normal.clone().normalize(), -0.002); marco.quaternion.copy(pl.quaternion); g.add(marco);
  };
  // Solo la trasera (2026-11-07, Eugenio: «quita la matrícula frontal y deja solo la trasera»); el morro queda limpio con el logo arriba.
  { const f1 = m.frame(0.996); placa([f1.x - 0.006, (f1.top + f1.bot) / 2 - 0.02, 0], new THREE.Vector3(-1, 0, 0)); }
  // Logo de Luz & Humanidad, circular y amarillo, en lo alto del morro (donde
  // el XL1 lleva el suyo), sobre la pieza azul, tumbado sobre la chapa.
  { const u = 0.055, p = sobre(u, Math.PI / 2, 0.003), a = sobre(u - 0.008, Math.PI / 2, 0), b = sobre(u + 0.008, Math.PI / 2, 0);
    const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], 0).normalize(), n = new THREE.Vector3(-t.y, t.x, 0); if (n.y < 0) n.negate();
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.055, 48), M.logo); logo.position.set(...p); logo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); g.add(logo);
    const aro = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.004, 8, 48), M.black); aro.position.copy(logo.position); aro.quaternion.copy(logo.quaternion); g.add(aro); }
  // Retrovisores como los del Aptera: una gota pequeña en un tallo corto, en la
  // base del montante, con el cristal mirando atrás.
  for (const s of [1, -1] as (1 | -1)[]) {
    const th = (t: number) => (s > 0 ? t : Math.PI - t), uR = m.uBase + 0.03;
    const base = sobreC(uR, th(Math.max(m.thAlfeizar(uR) - 0.01, 0.02)), 0), punta: V3 = [base[0] - 0.03, base[1] + 0.02, base[2] + s * 0.10];
    tube(g, base, punta, 0.016, M.black);
    const pod = sphere(g, punta, 0.05, M.body, [1.05, 0.55, 0.42]);
    pod.rotation.y = s * 0.15;
    const cristal = new THREE.Mesh(new THREE.CircleGeometry(0.023, 24), M.glass); cristal.position.set(punta[0] - 0.052, punta[1], punta[2]); cristal.rotation.y = -Math.PI / 2; g.add(cristal);
  }
  // Marcos de la cabina, a ras del cristal (tubos hundidos casi del todo):
  // el arco de arriba del parabrisas, los dos montantes inclinados (XL1,
  // Aptera), el contorno de cada ventanilla con el borde trasero inclinado
  // como un pilar B, y la línea de corte de cada puerta de gaviota.
  {
    // Los marcos van por el borde EXTERIOR de la goma: así tapan el diente
    // que deja la malla en todo borde inclinado, y la goma queda entre el
    // marco y el cristal, como en un coche de verdad.
    const R = 0.012, hund = -0.008, r2 = 0.009, hund2 = -0.006, gT = m.gomaT, gU = m.gomaU, arriba: V3[] = [];
    for (let k = 0; k <= 16; k++) arriba.push(sobreC(m.uW1 + gU, (m.thVentana / Math.PI + (1 - 2 * m.thVentana / Math.PI) * k / 16) * Math.PI, hund));
    tira(arriba, R, M.black);
    for (const s of [1, -1]) {
      const th = (t: number) => (s > 0 ? t : Math.PI - t);
      const pilar: V3[] = []; for (let k = 0; k <= 12; k++) { const u = m.uBase + (m.uW1 + gU - m.uBase) * k / 12; pilar.push(sobreC(u, th(Math.max(m.thPilar(u) - gT, m.thAlfeizar(u) - gT, m.thBase(u) + 0.005)), hund)); }
      tira(pilar, R, M.black);
      const techo: V3[] = []; for (let k = 0; k <= 14; k++) techo.push(sobreC(m.uW1 + (m.uVentA - m.uW1) * k / 14, th(m.thVentana), hund2));
      tira(techo, r2, M.black);
      const trasera: V3[] = []; for (let k = 0; k <= 10; k++) { const u = m.uVentA + (m.uVent1 - m.uVentA) * k / 10; trasera.push(sobreC(u, th(Math.min(m.thVentana, Math.max(m.thTrasera(u) + gT, m.thBase(u) + 0.02))), hund2)); }
      tira(trasera, r2, M.black);
      // La barra de abajo va por donde la cúpula sale de la carrocería: recta sobre el hombro.
      const abajo: V3[] = []; for (let k = 0; k <= 24; k++) { const u = m.uBase - gU + (m.uVent1 + 2 * gU - m.uBase) * k / 24; abajo.push(sobreC(u, th(Math.max(m.thAlfeizar(u) - gT, m.thBase(u) + 0.005)), hund2)); }
      tira(abajo, r2, M.black);
      // Líneas de corte de la puerta (2026-11-06, Eugenio: «visibles pero
      // elegantes, como en el XL1 y el Aptera»): una ranura fina y oscura.
      // En la cúpula, delante y detrás, del alféizar al canto del techo (el
      // techo es fijo, así que la línea no sube al centro); en la carrocería,
      // delante, detrás y por abajo, cerrando el panel lateral.
      for (const p of m.puertas.filter(q => q.tipo === 'puerta' && q.superficie === 'cupula' && (s > 0 ? q.id === 'izq' : q.id === 'der'))) {
        // Contorno de la puerta en la cúpula: montante (delante), canto redondeado de arriba y arco de seguridad (detrás)
        const corte: V3[] = [];
        for (let k = 0; k <= 40; k++) { const u = p.u0 + (p.u1 - p.u0) * k / 40; corte.push(sobreC(u, th(m.thPuertaArriba(u)), -0.0025)); }
        tira(corte, 0.0035, M.goma);
        for (const u of [p.u0 + 0.002, p.u1 - 0.002]) { const v: V3[] = []; for (let k = 0; k <= 8; k++) v.push(sobreC(u, th(m.thPuertaAbajo(u) + (m.thPuertaArriba(u) - m.thPuertaAbajo(u)) * k / 8), -0.0025)); tira(v, 0.0035, M.goma); }
        // Bisagras: un herraje en cada barra (montante del parabrisas y arco de seguridad), con su bulón en la línea del canto del techo
        for (const u of [m.uW1 + m.gomaU + 0.012, m.uArco - 0.012]) {
          const c = sobreC(u, th(m.thVentana), -0.012), a = sobreC(u - 0.012, th(m.thVentana), -0.012), b = sobreC(u + 0.012, th(m.thVentana), -0.012);
          const eje = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
          const bulon = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.075, 12), M.tuerca); bulon.position.set(...c); bulon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eje); g.add(bulon);
          const herraje = cajaRedonda(g, [c[0], c[1] - 0.014, c[2] - s * 0.006], [0.06, 0.028, 0.024], M.black, 0.006); herraje.quaternion.copy(bulon.quaternion); herraje.rotateX(Math.PI / 2);
        }
      }
      for (const p of m.puertas.filter(q => q.tipo === 'puerta' && q.superficie === 'cuerpo' && (s > 0 ? q.id === 'izq' : q.id === 'der'))) {
        const [ta, tb] = s > 0 ? [p.t0, p.t1] : [p.t1, p.t0];   // ta = arriba (junto a la cúpula), tb = abajo
        for (const u of [p.u0, p.u1]) { const corte: V3[] = []; for (let k = 0; k <= 10; k++) corte.push(sobre(u, ta + (tb - ta) * k / 10, -0.0025)); tira(corte, 0.0035, M.goma); }
        const abajo: V3[] = []; for (let k = 0; k <= 16; k++) abajo.push(sobre(p.u0 + (p.u1 - p.u0) * k / 16, tb, -0.0025)); tira(abajo, 0.0035, M.goma);
      }
    }
  }
  // Aleta de la cámara trasera sobre el techo, a dos tercios de la cola (no un cubo en lo alto).
  { const base = sobreC(m.uC0 + 0.56, Math.PI / 2, 0.002), punta = sobreC(m.uC0 + 0.60, Math.PI / 2, 0.045); tube(g, base, punta, 0.012, M.black); sphere(g, punta, 0.016, M.black); }
  // Tercera luz de freno en el borde de fuga del techo
  { const luz: V3[] = []; for (let k = 0; k <= 10; k++) luz.push(sobreC(m.uC1 - 0.03, (0.40 + 0.20 * k / 10) * Math.PI, 0.004)); tira(luz, 0.007, M.piloto); }
  // Limpiaparabrisas tumbado en la base del parabrisas
  const uL = m.uC0 + 0.012, piv = sobreC(uL, 0.36 * Math.PI, 0.010);
  const pts: V3[] = [];
  for (let k = 0; k <= 10; k++) pts.push(sobreC(uL + 0.004 * k, (0.37 + 0.28 * k / 10) * Math.PI, 0.010));
  tira(pts, 0.005, M.black); sphere(g, piv, 0.012, M.black);
  // Toma de carga: tapa cuadrada en el lado izquierdo del morro, junto al cargador
  box(g, sobre(0.12, 0.12 * Math.PI, 0.003), [0.10, 0.08, 0.004], M.black);
  // Suelo plano del maletero: una tapa ligera sobre motor, inversor y amortiguadores, con alfombra oscura
  { const f = m.sueloMaletero; const tapa = cajaRedonda(g, [(f.x0 + f.x1) / 2, f.y - 0.006, 0], [f.x0 - f.x1, 0.012, 2 * f.hz], M.seat, 0.006); tapa.userData.componente = 'maleteros'; tapa.receiveShadow = true; }
}

/** Cotas exteriores en el suelo y en vertical, con su número en mm. */
/** Las piezas de una cota (línea, flechas y etiqueta), para el Aeromóvil y para los coches del garaje. */
function herramientasCota(g: THREE.Object3D, M: Mats) {
  const etiqueta = (texto: string, p: V3) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = 'rgba(255,255,255,0.92)'; x.strokeStyle = '#0e5e6b'; x.lineWidth = 4;
    x.beginPath(); x.roundRect(4, 14, 504, 100, 20); x.fill(); x.stroke();
    x.fillStyle = '#0b3d45'; x.font = `600 ${texto.length > 15 ? 40 : 58}px "IBM Plex Mono", ui-monospace, monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(texto, 256, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.position.set(...p); s.scale.set(0.62, 0.155, 1); s.renderOrder = 10; g.add(s);
  };
  const flecha = (p: V3, dir: THREE.Vector3) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 12), M.cotaFlecha);
    c.position.set(...p).addScaledVector(dir, -0.035); c.quaternion.setFromUnitVectors(_up, dir.clone().normalize()); c.renderOrder = 10; g.add(c);
  };
  const linea = (pts: V3[]) => {
    const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
    const l = new THREE.LineSegments(geo, M.cota); l.renderOrder = 10; g.add(l);
  };
  const cota = (a: V3, b: V3, ext: [V3, V3][], texto: string, offEtq: V3 = [0, 0.11, 0]) => {
    linea([a, b, ...ext.flat()]);
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    flecha(b, d.clone()); flecha(a, d.clone().negate());
    etiqueta(texto, [(a[0] + b[0]) / 2 + offEtq[0], (a[1] + b[1]) / 2 + offEtq[1], (a[2] + b[2]) / 2 + offEtq[2]]);
  };
  const mm = (v: number) => `${Math.round(v * 1000).toLocaleString('es-ES')} mm`;
  return { cota, mm, etiqueta };
}

/**
 * Cotas de un coche del garaje, en sus propios ejes (van dentro de su grupo):
 * vías delantera y trasera y alto total (2026-11-07, Eugenio: «que aparezcan
 * también en los modelos del garaje»).
 */
function cotasGaraje(M: Mats, def: { batalla: number; alto: number; ancho: number; viaDel?: number; viaTras?: number; envolvente?: [number, number, number, number][] }): THREE.Group {
  const g = new THREE.Group(); g.name = 'cotas-garaje';
  const { cota, mm } = herramientasCota(g, M), y = 0.004;
  if (def.viaDel) cota([0, y, -def.viaDel / 2], [0, y, def.viaDel / 2], [], `vía del. ${mm(def.viaDel)}`, [0.30, 0.11, 0]);
  if (def.viaTras) cota([-def.batalla, y, -def.viaTras / 2], [-def.batalla, y, def.viaTras / 2], [], `vía tras. ${mm(def.viaTras)}`, [-0.30, 0.11, 0]);
  // El alto, de pie junto a la cola, con una línea hasta el punto más alto del techo.
  const env = def.envolvente;
  const xTope = env?.length ? env.reduce((a, e) => (e[2] > a[2] ? e : a))[0] : -def.batalla / 2;
  const xCola = env?.length ? Math.min(...env.map(e => e[0])) : -def.batalla - 0.4;
  const xH = xCola - 0.30, zL = -(def.ancho / 2 + 0.38);
  cota([xH, 0, zL], [xH, def.alto, zL], [[[xH - 0.05, def.alto, zL], [xTope, def.alto, zL]]], `alto ${mm(def.alto)}`, [-0.36, 0, 0]);
  return g;
}

function cotas(g: THREE.Object3D, M: Mats, m: Modelo, espacio = false) {
  if (m.tipo === 'bala') { cotasBala(g, M, m); return; }
  if (m.tipo === 'triciclo') { cotasTriciclo(g, M, m); return; }
  const { cota, mm, etiqueta } = herramientasCota(g, M);
  const P = m.P, y = 0.004, zL = -(P.W / 2 + 0.38), zB = -(P.W / 2 + 0.16);
  cota([m.xt, y, zL], [m.xn, y, zL], [[[m.xt, y, 0], [m.xt, y, zL - 0.05]], [[m.xn, y, 0], [m.xn, y, zL - 0.05]]], `largo ${mm(m.Lf)}`, [0.55, 0.11, -0.08]);
  cota([m.xR, y, zB], [0, y, zB], [[[m.xR, y, 0], [m.xR, y, zB - 0.04]], [[0, y, 0], [0, y, zB - 0.04]]], `batalla ${mm(P.B)}`, [-0.35, 0.11, 0.04]);
  const xA = m.xn + 0.40;
  cota([xA, y, -P.W / 2], [xA, y, P.W / 2], [[[m.xn - 0.2, y, -P.W / 2], [xA + 0.05, y, -P.W / 2]], [[m.xn - 0.2, y, P.W / 2], [xA + 0.05, y, P.W / 2]]], `ancho ${mm(P.W)}`, [0.12, 0.1, 0]);
  const xH = m.xt - 0.30, xMax = m.tipo === 'a1' ? m.xn - 0.45 * m.Lf : m.frame(P.pmax).x;
  cota([xH, 0, zL], [xH, P.H, zL], [[[xH - 0.05, P.H, zL], [xMax, P.H, zL]]], `alto ${mm(P.H)}`, [-0.36, 0, 0]);
  if (m.tipo === 'a1') {
    cota([0, y, -P.viaF / 2], [0, y, P.viaF / 2], [], `vía del. ${mm(P.viaF)}`, [0.30, 0.11, 0]);
    cota([m.xR, y, -P.viaR / 2], [m.xR, y, P.viaR / 2], [], `vía tras. ${mm(P.viaR)}`, [-0.30, 0.11, 0]);
    if (espacio) {
      // El espacio trasero sin pasajero (maletero o cama): largo sobre el suelo, ancho y alto en el centro, y el volumen.
      const e = m.espacioTrasero, ys = e.y0 + 0.01, xm = (e.x0 + e.x1) / 2;
      cota([e.x0, ys, -e.hz], [e.x1, ys, -e.hz], [[[e.x0, ys, -e.hz], [e.x0, ys, e.hz]], [[e.x1, ys, -e.hz], [e.x1, ys, e.hz]]], `fondo ${mm(e.largo)}`, [0, 0.12, -0.05]);
      cota([xm, ys, -e.hz], [xm, ys, e.hz], [], `ancho ${mm(e.ancho)}`, [0, 0.12, 0]);
      cota([e.x1 + 0.25, e.y0, 0], [e.x1 + 0.25, e.y1, 0], [], `alto ${mm(e.alto)}`, [0, 0, 0.3]);
      etiqueta(`≈ ${e.litros.toLocaleString('es-ES')} L · ${(e.largo).toFixed(2).replace('.', ',')} × ${(e.ancho).toFixed(2).replace('.', ',')} m`, [xm, e.y1 + 0.18, 0]);
    }
  } else {
    cota([m.xL, y, -P.track / 2], [m.xL, y, P.track / 2], [], `vía ${mm(P.track)}`, [0, 0.11, 0]);
  }
}

/** Cotas del Cuadriciclo Bala en rombo: largo, batalla, ancho con los carenados y de la carrocería, alto y vía de las laterales. */
function cotasBala(g: THREE.Object3D, M: Mats, m: ModeloBala) {
  const { cota, mm } = herramientasCota(g, M);
  const P = m.P, y = 0.004, W = m.anchoTotal, zL = -(W / 2 + 0.38), zB = -(W / 2 + 0.16);
  cota([m.xt, y, zL], [m.xn, y, zL], [[[m.xt, y, 0], [m.xt, y, zL - 0.05]], [[m.xn, y, 0], [m.xn, y, zL - 0.05]]], `largo ${mm(m.Lf)}`, [0.55, 0.11, -0.08]);
  cota([m.xR, y, zB], [0, y, zB], [[[m.xR, y, 0], [m.xR, y, zB - 0.04]], [[0, y, 0], [0, y, zB - 0.04]]], `batalla ${mm(P.B)}`, [-0.35, 0.11, 0.04]);
  const xA = m.xn + 0.40;
  cota([xA, y, -W / 2], [xA, y, W / 2], [[[m.xL, y, -W / 2], [xA + 0.05, y, -W / 2]], [[m.xL, y, W / 2], [xA + 0.05, y, W / 2]]], `ancho ${mm(W)}`, [0.12, 0.1, 0]);
  const xC = m.xn + 0.15, hw = m.anchoCuerpo / 2;
  cota([xC, 0.62, -hw], [xC, 0.62, hw], [], `carrocería ${mm(m.anchoCuerpo)}`, [0.10, 0.12, 0]);
  // the height stands by the tail, with a line to the canopy's crest (over the riders)
  const xH = m.xt - 0.30, xTope = (m.sillines.xPiloto + m.sillines.xPasajero) / 2;
  cota([xH, 0, zL], [xH, m.alto, zL], [[[xH - 0.05, m.alto, zL], [xTope, m.alto, zL]]], `alto ${mm(m.alto)}`, [-0.36, 0, 0]);
  cota([m.xL, y, -P.track / 2], [m.xL, y, P.track / 2], [], `vía ${mm(P.track)}`, [0, 0.11, 0]);
}

/** Cotas del Triciclo Bala: largo, batalla (de su eje delantero al trasero), ancho con los carenados y de la carrocería, alto y vía delantera. */
function cotasTriciclo(g: THREE.Object3D, M: Mats, m: ModeloTriciclo) {
  const { cota, mm } = herramientasCota(g, M);
  const y = 0.004, W = m.anchoTotal, zL = -(W / 2 + 0.38), zB = -(W / 2 + 0.16);
  cota([m.xt, y, zL], [m.xn, y, zL], [[[m.xt, y, 0], [m.xt, y, zL - 0.05]], [[m.xn, y, 0], [m.xn, y, zL - 0.05]]], `largo ${mm(m.Lf)}`, [0.55, 0.11, -0.08]);
  cota([m.xR, y, zB], [m.xF, y, zB], [[[m.xR, y, 0], [m.xR, y, zB - 0.04]], [[m.xF, y, -W / 2 + 0.1], [m.xF, y, zB - 0.04]]], `batalla ${mm(m.batalla)}`, [-0.35, 0.11, 0.04]);
  const xA = m.xn + 0.40;
  cota([xA, y, -W / 2], [xA, y, W / 2], [[[m.xF, y, -W / 2], [xA + 0.05, y, -W / 2]], [[m.xF, y, W / 2], [xA + 0.05, y, W / 2]]], `ancho ${mm(W)}`, [0.12, 0.1, 0]);
  const xC = m.xn + 0.15, hw = m.anchoCuerpo / 2;
  cota([xC, 0.62, -hw], [xC, 0.62, hw], [], `carrocería ${mm(m.anchoCuerpo)}`, [0.10, 0.12, 0]);
  const xH = m.xt - 0.30, xTope = (m.sillines.xPiloto + m.sillines.xPasajero) / 2;
  cota([xH, 0, zL], [xH, m.alto, zL], [[[xH - 0.05, m.alto, zL], [xTope, m.alto, zL]]], `alto ${mm(m.alto)}`, [-0.36, 0, 0]);
  cota([m.xF, y, -m.via.del / 2], [m.xF, y, m.via.del / 2], [], `vía ${mm(m.via.del)}`, [0, 0.11, 0]);
  // four wheels (2026-11-11): the rear track too
  if (m.traseras) cota([m.xR, y, -m.via.tras / 2], [m.xR, y, m.via.tras / 2], [], `vía trasera ${mm(m.via.tras)}`, [0, 0.11, 0]);
}

/** Una caja con cantos redondeados (batería, reductora, inversor…). */
function cajaRedonda(g: THREE.Object3D, c: V3, s: V3, mat: THREE.Material, r = 0.012) {
  const sh = new THREE.Shape();
  const w = s[0], h = s[1];
  sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2);
  sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: s[2], bevelEnabled: true, bevelThickness: r * 0.6, bevelSize: r * 0.6, bevelSegments: 2, curveSegments: 4 });
  geo.translate(0, 0, -s[2] / 2);
  const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...c); mesh.castShadow = true; g.add(mesh); return mesh;
}

/**
 * Una rueda de coche (2026-11-06, Eugenio: «las ruedas, a otro nivel, máximo
 * realismo»): neumático torneado con flanco abombado, hombro redondo y el
 * dibujo de la banda en relieve; llanta aerodinámica de disco casi cerrado
 * con cinco ranuras, pestaña pulida, embellecedor central con el logo, cuatro
 * tuercas y la válvula; disco de freno taladrado y pinza con latiguillo.
 * Gira `giro` radianes alrededor de la vertical.
 */
function ruedaCoche(g: THREE.Object3D, M: Mats, x: number, y: number, z: number, r: number, w: number, disco: number, giro: number) {
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = giro; g.add(grp);
  const s = Math.sign(z) || 1, rLlanta = 0.33 / 2;
  const neum = new THREE.Mesh(new THREE.LatheGeometry(perfilNeumatico(r, w, rLlanta), 96), M.tire); neum.rotation.x = Math.PI / 2; neum.castShadow = true; neum.receiveShadow = true; grp.add(neum);
  grp.add(sombraContacto(r, w));
  // Llanta: pestaña pulida (el aro que asoma junto al caucho), cara de disco hundida 12 mm, y el cilindro interior
  const pest = new THREE.Mesh(new THREE.TorusGeometry(rLlanta + 0.004, 0.007, 10, 72), M.rim); pest.position.z = s * (w / 2 - 0.006); grp.add(pest);
  const perfilCara: THREE.Vector2[] = [new THREE.Vector2(rLlanta + 0.004, 0), new THREE.Vector2(rLlanta - 0.004, -0.004), new THREE.Vector2(rLlanta * 0.92, -0.012), new THREE.Vector2(rLlanta * 0.30, -0.016), new THREE.Vector2(rLlanta * 0.22, -0.026), new THREE.Vector2(0.001, -0.026)];
  const cara = new THREE.Mesh(new THREE.LatheGeometry(perfilCara, 72), M.caraLlanta); cara.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2;
  // La textura de la cara es un disco plano (u, v con el centro en 0,5): se proyecta por (x, y) sobre el torno
  { const geo = cara.geometry, p = geo.getAttribute('position') as THREE.BufferAttribute, uv = geo.getAttribute('uv') as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / (2 * (rLlanta + 0.004)), 0.5 + p.getZ(i) / (2 * (rLlanta + 0.004))); uv.needsUpdate = true; }
  cara.position.z = s * (w / 2 - 0.006); grp.add(cara);
  const barril = new THREE.Mesh(new THREE.CylinderGeometry(rLlanta, rLlanta - 0.008, w * 0.86, 72, 1, true), M.rim); barril.rotation.x = Math.PI / 2; grp.add(barril);
  // Embellecedor central con el logo, y cuatro tuercas hexagonales a 50 mm del centro
  const capZ = s * (w / 2 - 0.006 - 0.026);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.008, 32), M.black); cap.rotation.x = Math.PI / 2; cap.position.z = capZ + s * 0.002; grp.add(cap);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.026, 32), M.logo); logo.position.z = capZ + s * 0.0065; logo.rotation.y = s > 0 ? 0 : Math.PI; grp.add(logo);
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, t = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.012, 6), M.tuerca); t.rotation.x = Math.PI / 2; t.position.set(0.052 * Math.cos(a), 0.052 * Math.sin(a), capZ + s * 0.004); grp.add(t); }
  // Válvula en el borde de la llanta
  { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.028, 8), M.black); v.position.set(0, rLlanta * 0.93, s * (w / 2 - 0.006 - 0.004)); v.rotation.x = s * 0.5; v.rotation.z = 0.2; grp.add(v); }
  // Disco de freno taladrado y pinza con latiguillo, por dentro de la llanta
  const d = new THREE.Mesh(new THREE.CylinderGeometry(disco / 2, disco / 2, 0.022, 64), [M.discoFreno, M.discoFreno, M.discoFreno]); d.rotation.x = Math.PI / 2; d.position.z = -s * (w / 2 - 0.045); d.userData.componente = 'frenos'; grp.add(d);
  { const geo = d.geometry, p = geo.getAttribute('position') as THREE.BufferAttribute, uv = geo.getAttribute('uv') as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i)) > 0.01) uv.setXY(i, 0.5 + p.getX(i) / disco, 0.5 + p.getZ(i) / disco); uv.needsUpdate = true; }
  const pinza = cajaRedonda(grp, [-0.02, disco / 2 - 0.03, -s * (w / 2 - 0.045)], [0.075, 0.115, 0.052], M.pinza, 0.012); pinza.userData.componente = 'frenos';
  tube(grp, [-0.02, disco / 2 + 0.02, -s * (w / 2 - 0.045)], [-0.08, disco / 2 + 0.08, -s * (w / 2 - 0.02)], 0.008, M.black);
  return grp;
}

/** Muelle helicoidal alrededor de un eje. */
function muelle(g: THREE.Object3D, a: V3, b: V3, r: number, vueltas: number, mat: THREE.Material) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), eje = B.clone().sub(A), L = eje.length(); eje.normalize();
  let u = new THREE.Vector3(0, 0, 1); u.addScaledVector(eje, -u.dot(eje)); if (u.lengthSq() < 1e-6) u = new THREE.Vector3(1, 0, 0); u.normalize();
  const v = new THREE.Vector3().crossVectors(eje, u);
  const pts: THREE.Vector3[] = [];
  const n = Math.round(vueltas * 16);
  for (let i = 0; i <= n; i++) { const t = i / n, ang = t * vueltas * 2 * Math.PI; pts.push(A.clone().addScaledVector(eje, t * L).addScaledVector(u, r * Math.cos(ang)).addScaledVector(v, r * Math.sin(ang))); }
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 2, 0.009, 8, false), mat); mesh.castShadow = true; g.add(mesh);
}

/** La misma malla desplazada `d` metros a lo largo de sus normales, con las caras vueltas (para un forro interior). */
function desplazar(geo: THREE.BufferGeometry, d: number) {
  const g = geo.clone(), p = g.getAttribute('position') as THREE.BufferAttribute, n = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  const idx = g.getIndex(); if (idx) { const a = idx.array as Uint32Array | Uint16Array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } idx.needsUpdate = true; }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  p.needsUpdate = true; n.needsUpdate = true;
  return g;
}

/** Marca todas las mallas de un grupo con el componente al que pertenecen (para el clic). */
function etiquetar(g: THREE.Object3D, componente: string) {
  g.traverse((o: any) => { if (o.isMesh && !o.userData.componente) o.userData.componente = componente; });
}

/** La parte fija: piel, accesorios, chasis, asientos, ocupantes, baterías. */
function construirFijo(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: Mats, m: ModeloConPiel, sinPasajero = false) {
  for (const k of ['carenado', 'cristales', 'solar', 'chasis', 'direccion', 'asientos', 'ocupantes', 'motor', 'transmision', 'baterias'] as CapaId[]) vaciar(G[k]);
  puertasG.clear();
  const capaDe: Record<Piel, CapaId> = { carroceria: 'carenado', bajos: 'carenado', cristal: 'cristales', solar: 'solar', hueco: 'carenado', marco: 'carenado', morro: 'carenado' };
  const matDe: Record<Piel, THREE.Material> = { carroceria: M.body, bajos: M.bajos, cristal: M.glass, solar: M.solar, hueco: M.body, marco: M.goma, morro: M.morro };
  const compDe: Record<Piel, string> = { carroceria: 'carroceria', bajos: 'carroceria', cristal: 'cupula', solar: 'solar', hueco: 'carroceria', marco: 'cupula', morro: 'carroceria' };
  for (const S of m.superficies) for (const pieza of construirSuperficie(S)) {
    const mesh = new THREE.Mesh(pieza.geo, matDe[pieza.piel]);
    mesh.castShadow = pieza.piel !== 'cristal'; mesh.receiveShadow = true;
    mesh.userData.componente = pieza.puerta === 'fijo' ? compDe[pieza.piel] : (pieza.puerta.startsWith('maletero') ? 'maleteros' : 'puertas');
    const capa = G[capaDe[pieza.piel]];
    // Techo interior: bajo el panel solar de la cúpula, una piel lisa y clara 4 mm por dentro, para no ver células desde el habitáculo.
    const forro = S.id === 'cupula' && pieza.piel === 'solar' ? new THREE.Mesh(desplazar(pieza.geo, -0.004), M.techoInterior) : null;
    if (forro) { forro.userData.componente = mesh.userData.componente; forro.receiveShadow = true; }
    if (pieza.puerta === 'fijo') { capa.add(mesh); if (forro) capa.add(forro); continue; }
    // Cada trozo de puerta o tapa cuelga de un pivote en su bisagra
    const def = S.puertas.find(p => p.id === pieza.puerta)!;
    const piv = new THREE.Group(); piv.position.set(...def.bisagra[0]);
    piv.userData = { eje: new THREE.Vector3(...def.bisagra[1]).sub(new THREE.Vector3(...def.bisagra[0])).normalize(), angulo: def.angulo * Math.PI / 180, tipo: def.tipo };
    mesh.position.set(-def.bisagra[0][0], -def.bisagra[0][1], -def.bisagra[0][2]);
    piv.add(mesh); if (forro) { forro.position.copy(mesh.position); piv.add(forro); } capa.add(piv);
    if (!puertasG.has(pieza.puerta)) puertasG.set(pieza.puerta, []);
    puertasG.get(pieza.puerta)!.push(piv);
  }
  if (m.tipo === 'a1') accesoriosA1(G.carenado, M, m); else accesorios(G.carenado, M, m);
  etiquetar(G.carenado, 'luces');

  const tubos = m.tubosChasis();
  for (const t of tubos) if (t.grupo !== 'Suspensión') {
    const destino = t.grupo === 'Dirección' && m.tipo === 'a1' ? G.direccion : t.grupo === 'Transmisión' ? G.transmision : G.chasis;
    const mat = t.grupo === 'Dirección' ? (t.comprado ? M.black : M.alu) : t.grupo === 'Transmisión' ? M.black : M.alu;
    const antes = destino.children.length;
    if (t.curva) tuboCurvo(destino, t.curva, t.d, t.d < 0.01 ? M.black : mat); else tube(destino, t.a, t.b, t.d, mat);
    for (let i = antes; i < destino.children.length; i++) destino.children[i].userData.componente = t.grupo === 'Dirección' ? 'direccion' : t.grupo === 'Transmisión' ? 'transmision' : 'chasis';
  }
  // Uniones soldadas: donde el extremo de un tubo toca a otro, un cordón
  // (esfera algo mayor que el tubo) en vez de dos cilindros que se cruzan.
  const soldables = tubos.filter(t => t.grupo === 'Chasis');
  const dSeg = (p: V3, a: V3, b: V3) => {
    const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const tt = Math.max(0, Math.min(1, (w[0] * v[0] + w[1] * v[1] + w[2] * v[2]) / (v[0] ** 2 + v[1] ** 2 + v[2] ** 2 || 1)));
    return Math.hypot(w[0] - tt * v[0], w[1] - tt * v[1], w[2] - tt * v[2]);
  };
  for (const t of soldables) for (const p of [t.a, t.b]) {
    const toca = soldables.some(o => o !== t && tramosTubo(o).some(([a, b]) => dSeg(p, a, b) < o.d / 2 + t.d / 2 + 0.004));
    if (toca) sphere(G.chasis, p, t.d / 2 * 1.18, M.soldadura).userData.componente = 'chasis';
  }
  for (const a of m.asientos) { if (sinPasajero && !a.piloto) continue; asiento(G.asientos, M, m, a.piloto, a.lat, a.ancho); ocupante(G.ocupantes, M, m, a.lat, a.piloto); }
  etiquetar(G.asientos, 'asientos');
  if (m.tipo === 'a1') {
    construirFijoA1(G, M, m);
  } else {
    const by = m.P.clear + 0.055;
    for (const [x0, z0] of [[m.xPil - 0.05, 0.045], [m.xPil - 0.05, -0.145], [m.xPas, 0.17], [m.xPas, -0.27]]) {
      box(G.baterias, [x0 + 0.185, by, z0 + 0.05], [0.37, 0.08, 0.10], M.batt);
    }
    etiquetar(G.baterias, 'bateria');
  }
}

/** Lo fijo del Aeromóvil 1: volante, reposapiés, motor, reductora, inversor, cargador, baterías y cables. */
function construirFijoA1(G: Record<CapaId, THREE.Group>, M: Mats, m: ModeloA1) {
  // Sin pasos de rueda (2026-11-06, Eugenio: «quita los guardabarros de las
  // ruedas»): la carrocería cubre la rueda y por el hueco del fondo solo se
  // ve el chasis.
  // Salpicadero: una tabla oscura sobre el arco del salpicadero, bajo la base del parabrisas, con la pantalla.
  { const tabla = cajaRedonda(G.direccion, [m.xD + 0.02, m.yDash - 0.02, 0], [0.30, 0.04, 0.72], M.black, 0.012); tabla.userData.componente = 'varios';
    const pantalla = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.16), M.glass); pantalla.position.set(m.xD - 0.10, m.yDash + 0.045, 0); pantalla.rotation.z = -0.3; pantalla.userData.componente = 'varios'; G.direccion.add(pantalla); }
  // Volante: aro inclinado, tres radios y el centro; la columna ya está en los tubos de Dirección.
  const v = m.volante, c: V3 = [v.c[0], v.c[1], 0];
  const aro = new THREE.Mesh(new THREE.TorusGeometry(v.r, 0.016, 12, 48), M.black); aro.position.set(...c); aro.rotation.y = Math.PI / 2; aro.rotation.x = -v.inclinacion; aro.castShadow = true; G.direccion.add(aro);
  const centro = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 20), M.black); centro.position.set(...c); centro.rotation.z = Math.PI / 2; centro.rotation.y = 0; centro.quaternion.copy(aro.quaternion); centro.rotateX(Math.PI / 2); G.direccion.add(centro);
  for (const ang of [Math.PI / 2, Math.PI / 2 + 2.2, Math.PI / 2 - 2.2]) {
    const p = new THREE.Vector3(0, v.r * Math.sin(ang), v.r * Math.cos(ang)).applyQuaternion(aro.quaternion);
    tube(G.direccion, c, [c[0] + p.x, c[1] + p.y, c[2] + p.z], 0.014, M.black);
  }
  // Cremallera: caja sobre el travesaño delantero
  cajaRedonda(G.direccion, m.cremallera, [0.07, 0.07, 0.16], M.black, 0.01);
  etiquetar(G.direccion, 'direccion');
  // Reposapiés: una chapa inclinada con dos nervios
  const rp = m.reposapies;
  const chapa = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.36), M.alu); chapa.position.set(rp[0] + 0.05, rp[1] + 0.06, 0); chapa.rotation.z = -0.5; chapa.castShadow = true; chapa.userData.componente = 'chasis'; G.chasis.add(chapa);
  // Motor transversal, reductora con diferencial, inversor encima y cargador delante
  const mo = new THREE.Mesh(new THREE.CylinderGeometry(m.motor.r, m.motor.r, m.motor.largo, 32), M.motor); mo.position.set(...m.motor.c); mo.rotation.x = Math.PI / 2; mo.castShadow = true; mo.userData.componente = 'motor'; G.motor.add(mo);
  for (const k of [-1, 1]) { const tapa = new THREE.Mesh(new THREE.CylinderGeometry(m.motor.r * 0.7, m.motor.r * 0.7, 0.02, 32), M.black); tapa.position.set(m.motor.c[0], m.motor.c[1], m.motor.c[2] + k * (m.motor.largo / 2 + 0.01)); tapa.rotation.x = Math.PI / 2; tapa.userData.componente = 'motor'; G.motor.add(tapa); }
  cajaRedonda(G.transmision, m.reductora.c, m.reductora.s, M.carcasa, 0.02).userData.componente = 'transmision';
  cajaRedonda(G.motor, m.inversor.c, m.inversor.s, M.carcasa, 0.015).userData.componente = 'inversor';
  cajaRedonda(G.motor, m.cargador.c, m.cargador.s, M.carcasa, 0.015).userData.componente = 'cargador';
  // Baterías: cada módulo, con su tapa; cable naranja de alta tensión hasta el inversor
  for (const b of m.baterias) {
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    cajaRedonda(G.baterias, [cx, cy, 0], [b.x1 - b.x0, b.y1 - b.y0, 2 * b.hz], M.batt, 0.015).userData.componente = 'bateria';
    cajaRedonda(G.baterias, [cx, b.y1 + 0.012, 0], [(b.x1 - b.x0) * 0.6, 0.02, b.hz], M.black, 0.006).userData.componente = 'bateria';
  }
  const b0 = m.baterias[0];
  const cable = new THREE.CatmullRomCurve3(([
    [b0.x0, b0.y1 + 0.03, 0.25], [b0.x0 - 0.3, m.ys + 0.08, 0.28], [m.xR + 0.4, m.ys + 0.10, 0.25], [m.inversor.c[0], m.inversor.c[1] - 0.02, m.inversor.c[2] + 0.12],
  ] as V3[]).map(p => new THREE.Vector3(...p)));
  const cab = new THREE.Mesh(new THREE.TubeGeometry(cable, 60, 0.008, 8, false), M.cableHV); cab.userData.componente = 'bateria'; G.baterias.add(cab);
  const cab2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(([[m.inversor.c[0], m.inversor.c[1] - 0.04, 0.1], [m.motor.c[0], m.motor.c[1] + m.motor.r, 0.05]] as V3[]).map(p => new THREE.Vector3(...p))), 12, 0.007, 8, false), M.cableHV); cab2.userData.componente = 'motor'; G.motor.add(cab2);
}

/** La parte que se mueve: según el vehículo, el rombo basculante o los McPherson con las ruedas giradas. */
function construirMovil(G: Record<CapaId, THREE.Group>, M: Mats, m: Modelo, coche: THREE.Group, angulo: number) {
  // the Bala does not lean and has no moving suspension drawn: its wheels are built with the rest (construirBala)
  if (m.tipo === 'bala') { coche.rotation.x = 0; return; }
  // the Triciclo does not lean either; «Girar ruedas» turns its two front wheels and their pods (Ackermann: the inner one more)
  if (m.tipo === 'triciclo') { coche.rotation.x = 0; girarTriciclo(G, m, angulo); return; }
  if (m.tipo === 'a1') construirMovilA1(G, M, m, coche, angulo); else construirMovilGota(G, M, m, coche, angulo);
}

/** The Triciclo's front wheels and pods turned `angulo` degrees (+ to the left: the left wheel is then the inner one). */
function girarTriciclo(G: Record<CapaId, THREE.Group>, m: ModeloTriciclo, angulo: number) {
  const di = Math.abs(angulo) * Math.PI / 180, dout = di > 1e-6 ? anguloFuera(di, m.batalla, m.via.del) : 0, s = Math.sign(angulo);
  for (const capa of [G.carenado, G.ruedas]) capa.traverse(o => {
    if ((o.name !== 'carenado' && o.name !== 'rueda-direccion') || !o.userData.lado) return;
    // +y turns the nose to −z, the vehicle's left
    o.rotation.y = s * (o.userData.lado * s < 0 ? di : dout);
  });
}

/** The layer each part of the Bala goes to (the 3D model's own names, balaModelo.ts / balaPiezas.ts). */
const CAPA_BALA: Record<string, CapaId> = { ruedas: 'ruedas', cabina: 'asientos', [PIVOTES_CUPULA[1]]: 'cristales', cupula: 'cristales' };
/**
 * The Cuadriciclo Bala en rombo: the garage model's builder with this design's shape
 * (garaje/balaModelo.ts), its own materials (`Mb`, so «Rayos X» and «Corte»
 * never touch the garage's Bala), split into the viewer's layers: body, pods,
 * lamps and fin in «Carrocería»; the canopy glass in «Cristales»; the pod arms
 * in «Suspensión»; the wheels; the cockpit in «Asientos» (its frame beam in
 * «Chasis»); the riders in «Ocupantes». The canopy's frame and glass hang from
 * two pivots on its front hinge, registered as one door ('cupula').
 * 'rapida' while a slider is being dragged (see the effect that calls it).
 */
function construirBala(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: Mats, Mb: ReturnType<typeof materialesBala>, m: ModeloBala, calidad: 'completa' | 'rapida', sinPasajero: boolean) {
  for (const c of CAPAS) vaciar(G[c.k]);
  puertasG.clear();
  const b = construirBalaCon(m.F, { M: Mb, calidad, cupulaAparte: true, asientos: m.sillines, aleta: m.aleta });
  repartirBala(G, puertasG, b);
  if (calidad === 'completa') for (const piloto of [true, false]) { if (sinPasajero && !piloto) continue; ocupante(G.ocupantes, M, m, 0, piloto); }
  // as the garage does with its cars (glass and lenses keep their no-shadow depth material)
  for (const c of CAPAS) G[c.k].traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}
/** The Bala builder's parts into the viewer's layers (the Cuadriciclo en rombo's and the Triciclo's). */
function repartirBala(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, b: THREE.Group) {
  for (const o of [...b.children]) {
    let capa: CapaId = CAPA_BALA[o.name] ?? 'carenado';
    if (o.name === 'carenados' || o.name === 'carenados-traseros') {
      // the arms are suspension, the pods body
      for (const brazo of o.children.filter(c => c.name === 'brazo')) G.suspension.add(brazo);
      capa = 'carenado';
    }
    if (o.name === 'cabina') { const viga = o.getObjectByName('chasis'); if (viga) G.chasis.add(viga); }
    if ((PIVOTES_CUPULA as readonly string[]).includes(o.name)) {
      o.userData = { eje: new THREE.Vector3(0, 0, 1), angulo: ANGULO_CUPULA * Math.PI / 180, tipo: 'puerta' };
      if (!puertasG.has('cupula')) puertasG.set('cupula', []);
      puertasG.get('cupula')!.push(o as THREE.Group);
    }
    // the Triciclo's boot lid (round three): a boot, so «Abrir maletero» opens it (as the Aeromóvil 1's boots)
    if (o.name === PIVOTE_PORTON) {
      o.userData = { eje: new THREE.Vector3(0, 0, 1), angulo: ANGULO_PORTON * Math.PI / 180, tipo: 'maletero' };
      if (!puertasG.has('maletero')) puertasG.set('maletero', []);
      puertasG.get('maletero')!.push(o as THREE.Group);
    }
    G[capa].add(o);
  }
}

/**
 * The Triciclo Bala (2026-11-10): the Cuadriciclo en rombo's builder with three wheels and the reclining
 * cockpit, split into layers as the Bala; and what only the Triciclo has, from its model: the tube
 * frame («Chasis»), the battery modules, the hub motor and its controller, the swing arm and the
 * front uprights («Suspensión»), the rack, column and tie rods («Dirección»).
 */
function construirTriciclo(G: Record<CapaId, THREE.Group>, puertasG: Map<string, THREE.Group[]>, M: Mats, Mb: ReturnType<typeof materialesBala>, m: ModeloTriciclo, calidad: 'completa' | 'rapida', sinPasajero: boolean) {
  for (const c of CAPAS) vaciar(G[c.k]);
  puertasG.clear();
  const b = construirBalaCon(m.F, { M: Mb, calidad, cupulaAparte: true, asientos: m.sillines, aleta: m.aleta, triciclo: { recPil: m.rec.piloto, recPas: m.rec.pasajero, man: m.man, pies: m.pies, faldon: m.faldon, ventanas: m.opcVentanas, maletero: true, ...(m.filas ? { filas: m.asientosFilas } : {}), traseras: m.traseras } });
  repartirBala(G, puertasG, b);
  for (const t of m.tubos) { if (t.curva) tuboCurvo(G.chasis, t.curva, t.d, M.alu); else tube(G.chasis, t.a, t.b, t.d, M.alu); }
  for (const c of m.baterias) cajaRedonda(G.baterias, [(c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, 0], [c.x1 - c.x0, c.y1 - c.y0, 2 * c.hz], M.batt, 0.015);
  const iv = m.inversor; cajaRedonda(G.motor, [(iv.x0 + iv.x1) / 2, (iv.y0 + iv.y1) / 2, 0], [iv.x1 - iv.x0, iv.y1 - iv.y0, 2 * iv.hz], M.black, 0.01);
  const Ft = m.traseras;
  if (Ft) {
    // four wheels (2026-11-11): a hub motor in each rear wheel, and in each rear pod an upright on the wheel's inner
    // side, held by the pod's two faired arms (drawn with the pods): a simple arm, as in front, that does not steer
    const zInT = Ft.VIA_LAT / 2 - Ft.ANCHO_NEU_LAT / 2 - 0.025, [arT, abT] = brazosDe(Ft);
    for (const s of [1, -1]) {
      disk(G.motor, [m.motor.c[0], m.motor.c[1], s * Ft.VIA_LAT / 2], m.motor.r, m.motor.ancho, M.motor);
      tube(G.suspension, [m.xR, abT.y - 0.02, s * zInT], [m.xR, arT.y + 0.03, s * zInT], 0.03, M.alu);
    }
  } else {
  disk(G.motor, [m.motor.c[0], m.motor.c[1], 0], m.motor.r, m.motor.ancho, M.motor);
  // rear: the swing arm's two legs round the tyre, its pivot tube and the mono-shock
  const [px, py] = m.basculante.pivote, [ex, ey] = m.basculante.eje, zb = m.basculante.z;
  for (const s of [1, -1]) tube(G.suspension, [px, py, s * zb], [ex, ey, s * zb], 0.032, M.susp);
  tube(G.suspension, [px, py, -zb - 0.02], [px, py, zb + 0.02], 0.036, M.black);
  const [ax, ay] = m.amortiguador.abajo, [bx, by] = m.amortiguador.arriba;
  tube(G.suspension, [ax, ay, 0], [bx, by, 0], 0.03, M.stanch);
  muelle(G.suspension, [ax + (bx - ax) * 0.2, ay + (by - ay) * 0.2, 0], [ax + (bx - ax) * 0.85, ay + (by - ay) * 0.85, 0], 0.035, 6, M.muelle);
  tube(G.suspension, [ax, ay, -zb], [ax, ay, zb], 0.02, M.susp);
  }
  // front: in each pod, the upright on the wheel's inner side; the coil-over lies along the upper arm, inside its
  // fairing (pushed by the upright, held at the body), so nothing but the faired arms stands in the air
  const zIn = m.via.del / 2 - m.F.ANCHO_NEU_LAT / 2 - 0.025, [arriba, abajo] = m.brazos;
  for (const s of [1, -1]) {
    tube(G.suspension, [m.xF, abajo.y - 0.02, s * zIn], [m.xF, arriba.y + 0.03, s * zIn], 0.03, M.alu);
    // (a lifted Triciclo's arm runs down from the body, at `yCuerpo`, to the pod: the coil-over follows it)
    const z0 = m.F.ladoZ(m.xF + arriba.x, arriba.yCuerpo);
    if (Number.isFinite(z0)) {
      const yEn = (z: number) => arriba.y + (arriba.yCuerpo - arriba.y) * (zIn - z) / Math.max(1e-6, zIn - z0) - 0.002;
      const a: V3 = [m.xF + arriba.x - 0.02, yEn(zIn - 0.04), s * (zIn - 0.04)], c: V3 = [m.xF + arriba.x - 0.02, yEn(z0 + 0.03), s * (z0 + 0.03)];
      tube(G.suspension, a, c, 0.012, M.stanch); muelle(G.suspension, [a[0], yEn(zIn - 0.06), s * (zIn - 0.06)], [c[0], yEn(z0 + 0.12), s * (z0 + 0.12)], 0.013, 9, M.muelle);
    }
  }
  // steering: the rack across, the column up to the steering head, the tie rods out to the uprights' arms
  const k = m.cremallera;
  tube(G.direccion, [k.x, k.y, -k.z], [k.x, k.y, k.z], 0.035, M.black);
  tube(G.direccion, [k.x, k.y, 0], m.cabezaDireccion, 0.026, M.alu);
  for (const s of [1, -1]) tube(G.direccion, [k.x, k.y, s * k.z], [m.xF - 0.07, arriba.y + 0.02, s * zIn], 0.016, M.alu);
  // everyone on board (round three: up to four, each at their own z; a folded row carries nobody)
  if (calidad === 'completa') for (const q of m.plazas) { if (sinPasajero && !q.piloto) continue; ocupante(G.ocupantes, M, { occPts: () => q.pts }, q.z, q.piloto); }
  for (const c of CAPAS) G[c.k].traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}

/** Aeromóvil 1: cuatro McPherson con sus brazos, muelles y barras, y las ruedas (las delanteras giradas `giro` grados). */
function construirMovilA1(G: Record<CapaId, THREE.Group>, M: Mats, m: ModeloA1, coche: THREE.Group, giro: number) {
  coche.rotation.x = 0;
  vaciar(G.suspension); vaciar(G.ruedas);
  const s = G.suspension, c = m.P.comp;
  for (let i = 0; i < 4; i++) {
    const r = m.ruedas[i], q = suspensionA1(m, i, c), sg = q.s;
    // Mangueta: del eje al vástago, y el pie hasta la rótula
    tube(s, q.rotula, q.arriba, 0.034, M.alu);
    tube(s, [r.x, r.r + c * 0.09, sg * (Math.abs(r.z) - 0.07)], [r.x, r.r + c * 0.09, sg * (Math.abs(r.z) - 0.02)], 0.03, M.black);
    sphere(s, q.rotula, 0.024, M.black);
    // Columna McPherson: cuerpo del amortiguador, vástago y muelle
    const A = new THREE.Vector3(...q.arriba), B = new THREE.Vector3(...q.torreta), d = B.clone().sub(A), L = d.length(); d.normalize();
    const mid: V3 = [A.x + d.x * L * 0.45, A.y + d.y * L * 0.45, A.z + d.z * L * 0.45];
    tube(s, q.arriba, mid, 0.046, M.susp);
    tube(s, mid, q.torreta, 0.022, M.stanch);
    const m0: V3 = [A.x + d.x * L * 0.30, A.y + d.y * L * 0.30, A.z + d.z * L * 0.30], m1: V3 = [A.x + d.x * L * 0.92, A.y + d.y * L * 0.92, A.z + d.z * L * 0.92];
    muelle(s, m0, m1, 0.062, 6, M.muelle);
    const platoA = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.008, 24), M.black); platoA.position.set(...m0); platoA.quaternion.setFromUnitVectors(_up, d); s.add(platoA);
    const platoB = platoA.clone(); platoB.position.set(...m1); s.add(platoB);
    // Brazos inferiores en A y rótulas en el chasis
    for (const [a, b] of q.brazos) { tube(s, a, b, 0.025, M.susp); sphere(s, a, 0.018, M.black); }
    // Barra estabilizadora con su bieleta
    if (sg > 0) tube(s, [r.x + 0.25, r.r - 0.02, -0.36], [r.x + 0.25, r.r - 0.02, 0.36], 0.018, M.black);
    tube(s, [r.x + 0.25, r.r - 0.02, sg * 0.36], [r.x + 0.12, r.r - 0.07, sg * (Math.abs(r.z) - 0.18)], 0.012, M.black);
    // La rueda, girada si es delantera
    ruedaCoche(G.ruedas, M, r.x, r.r + c * 0.09, r.z, r.r, r.w, q.disco, q.del ? giro * Math.PI / 180 : 0);
  }
  etiquetar(G.suspension, 'suspension'); etiquetar(G.ruedas, 'ruedas');
}

/** Aeromóvil Gota: suspensiones comprimidas, paralelogramo inclinado, ruedas y motor. */
function construirMovilGota(G: Record<CapaId, THREE.Group>, M: Mats, m: ModeloGota, coche: THREE.Group, inclinacion: number) {
  const ph = inclinacion * Math.PI / 180, c = m.P.comp, AX = m.AX;
  coche.rotation.x = ph;
  vaciar(G.suspension); vaciar(G.ruedas); vaciar(G.motor);
  const s = G.suspension;
  const fwc: [number, number] = [AX[0] * c * TRAVEL_F, m.rF + AX[1] * c * TRAVEL_F];
  for (const zs of [-1, 1]) {
    const z = zs * 0.07;
    const lo: [number, number] = [fwc[0] + AX[0] * 0.40, fwc[1] + AX[1] * 0.40];
    const stb: [number, number] = [m.crown[0] - AX[0] * (m.A2C - 0.28), m.crown[1] - AX[1] * (m.A2C - 0.28)];
    tube(s, [fwc[0], fwc[1], z], [lo[0], lo[1], z], 0.05, M.susp);
    tube(s, [stb[0], stb[1], z], [m.crown[0], m.crown[1], z], 0.036, M.stanch);
  }
  const arco: [number, number] = [fwc[0] + AX[0] * 0.36, fwc[1] + AX[1] * 0.36];
  tube(s, [arco[0], arco[1], -0.07], [arco[0], arco[1], 0.07], 0.03, M.susp);
  tube(s, [m.crown[0], m.crown[1], -0.09], [m.crown[0], m.crown[1], 0.09], 0.04, M.black);
  tube(s, [fwc[0], fwc[1], -0.085], [fwc[0], fwc[1], 0.085], 0.015, M.black);
  const PIV = m.PIV, ax0: [number, number] = [m.xR, m.rR];
  let th = 0;
  for (let i = 0; i < 6; i++) {
    const p = rot(ax0, PIV, th), err = (m.rR + c * TRAVEL_R) - p[1], dd = (rot(ax0, PIV, th + 1e-4)[1] - p[1]) / 1e-4;
    th += err / dd;
  }
  const rax = rot(ax0, PIV, th), rock = rot([PIV[0], PIV[1] + 0.13], PIV, th);
  for (const zs of [-1, 1]) tube(s, [PIV[0], PIV[1], zs * 0.075], [rax[0], rax[1], zs * 0.075], 0.032, M.susp);
  tube(s, [PIV[0], PIV[1], -0.08], [PIV[0], PIV[1], 0.08], 0.03, M.black);
  tube(s, [PIV[0], PIV[1], 0], [rock[0], rock[1], 0], 0.03, M.susp);
  const fm: [number, number] = [m.xCruceta, m.ys + 0.02], mid: [number, number] = [fm[0] + (rock[0] - fm[0]) * 0.55, fm[1] + (rock[1] - fm[1]) * 0.55];
  tube(s, [fm[0], fm[1], 0], [mid[0], mid[1], 0], 0.055, M.black);
  tube(s, [mid[0], mid[1], 0], [rock[0], rock[1], 0], 0.02, M.stanch);
  const A = m.ARM_A, ca = Math.cos(ph), sa = Math.sin(ph);
  for (const yy of [m.ys, m.ys + ARM_UP]) for (const dx of [-0.03, 0.03]) tube(s, [m.xL + dx, yy - A * sa, -A * ca], [m.xL + dx, yy + A * sa, A * ca], 0.025, M.susp);
  const lw: Record<number, [number, number]> = {};
  for (const zs of [-1, 1]) {
    const z = zs * A * ca, dy = zs * A * sa;
    tube(s, [m.xL, Math.min(m.ys, m.rL) + dy - 0.02, z], [m.xL, m.ys + ARM_UP + dy + 0.02, z], 0.035, M.alu);
    tube(s, [m.xL, m.rL + dy, z], [m.xL, m.rL + dy, z + zs * 0.08], 0.02, M.black);
    lw[zs] = [z + zs * 0.08, dy];
  }
  tube(s, [m.xL, m.ys + ARM_UP + 0.04, 0], [m.xL, m.ys + 0.25 * sa, 0.25 * ca], 0.03, M.black);

  rueda(G.ruedas, M, fwc[0], fwc[1], 0, m.rF);
  rueda(G.ruedas, M, rax[0], rax[1], 0, m.rR);
  for (const zs of [-1, 1]) rueda(G.ruedas, M, m.xL, m.rL + lw[zs][1], lw[zs][0], m.rL);

  const mo = G.motor, BB = m.BB;
  disk(mo, [rax[0], rax[1], 0], 0.095, 0.06, M.motor);
  disk(mo, [BB[0], BB[1], 0], 0.06, 0.08, M.motor);
  for (const zs of [-1, 1]) {
    const a = 0.6 + (zs > 0 ? 0 : Math.PI), pe: [number, number] = [BB[0] + 0.165 * Math.cos(a), BB[1] + 0.165 * Math.sin(a)];
    tube(mo, [BB[0], BB[1], zs * 0.05], [pe[0], pe[1], zs * 0.07], 0.02, M.black);
    tube(mo, [pe[0], pe[1], zs * 0.07], [pe[0], pe[1], zs * 0.16], 0.02, M.black);
  }
  box(mo, [m.xPas + 0.55, m.ys + m.P.spineD / 2000 + 0.025, 0], [0.20, 0.05, 0.07], M.black);
  const cable = new THREE.CatmullRomCurve3(([
    [BB[0], BB[1] - 0.05, 0.05], [BB[0] - 0.25, m.ys + 0.06, 0.05], [m.xPas + 0.55, m.ys + 0.07, 0.04],
    [PIV[0], PIV[1] + 0.05, 0.05], [rax[0] + 0.05, rax[1] + 0.04, 0.05],
  ] as V3[]).map(p => new THREE.Vector3(...p)));
  mo.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 80, 0.006, 6, false), M.motor));
  etiquetar(G.suspension, 'suspension'); etiquetar(G.ruedas, 'ruedas'); etiquetar(G.motor, 'motor');
}

/** Un velomóvil de referencia: piel de secciones superelípticas, cabina y ruedas. */
function construirReferencia(g: THREE.Group, M: Mats, r: Referencia, fantasma: boolean) {
  vaciar(g);
  const p = r.perfil, nv = 64, n = p.x.length;
  const pos: number[] = [], idx: number[] = [], col: number[] = [];
  const cabina = r.cabinaX ? [Math.min(...r.cabinaX), Math.max(...r.cabinaX)] : null;
  const colCuerpo = new THREE.Color(fantasma ? 0x14a3b5 : (r.color ?? 0xe4e0d6)), colCab = new THREE.Color(r.cabina === 'cupula' ? 0x22323d : 0x0f1215);
  const lb = !fantasma ? r.librea : undefined;
  const cDel = lb && new THREE.Color(lb.delante), cDet = lb && new THREE.Color(lb.detras), cAb = lb && new THREE.Color(lb.abajo), cRay = lb && new THREE.Color(lb.colorRayas ?? lb.abajo);
  const nA = r.seccion?.arriba ?? r.formaArriba ?? 2.5, nB = r.seccion?.abajo ?? 3.2;
  for (let i = 0; i < n; i++) {
    const zc = (p.top[i] + p.bot[i]) / 2, aT = (p.top[i] - p.bot[i]) / 2;
    for (let j = 0; j <= nv; j++) {
      const th = 2 * Math.PI * j / nv, c = Math.cos(th), sn = Math.sin(th), nn = sn >= 0 ? nA : nB;
      const ez = Math.sign(c) * Math.pow(Math.abs(c), 2 / nn), ey = Math.sign(sn) * Math.pow(Math.abs(sn), 2 / nn);
      const y = zc + aT * ey;
      pos.push(p.x[i], y, p.hw[i] * ez);
      const enCab = !!cabina && p.x[i] <= cabina[1] && p.x[i] >= cabina[0] && sn > Math.sin(0.22 * Math.PI);
      const enClaro = !!r.transparenteX && p.x[i] <= Math.max(...r.transparenteX) && p.x[i] >= Math.min(...r.transparenteX);
      let cc = enCab || enClaro ? colCab : colCuerpo;
      if (lb) {
        const abajo = y < p.bot[i] + (p.top[i] - p.bot[i]) * lb.alturaAbajo;
        const raya = !abajo && !!lb.rayas?.some(([a, b]) => p.x[i] <= Math.max(a, b) && p.x[i] >= Math.min(a, b));
        cc = abajo ? cAb! : raya ? cRay! : p.x[i] > lb.corteX ? cDel! : cDet!;
      }
      col.push(cc.r, cc.g, cc.b);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mat = fantasma
    // The ghost is drawn over our car (no depth test): when both overlap in the
    // side view, an opaque body would otherwise hide the very thing compared.
    ? new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, depthTest: false, side: THREE.FrontSide, roughness: 0.4 })
    : new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 0.2, roughness: 0.35, clearcoat: 1, side: THREE.DoubleSide });
  const piel = new THREE.Mesh(geo, mat); piel.castShadow = !fantasma; if (fantasma) piel.renderOrder = 5; g.add(piel);
  if (fantasma) {
    const encima = (color: number, opacity = 1) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });
    const bordes = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), encima(0x0e7383, 0.45));
    bordes.renderOrder = 6; g.add(bordes);
    // Contorno lateral y de planta, nítidos, para leer la diferencia de tamaño
    const lado = p.x.map((x, i) => new THREE.Vector3(x, p.top[i], 0)).concat(p.x.map((x, i) => new THREE.Vector3(x, p.bot[i], 0)).reverse());
    const l1 = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(lado), encima(0x0b6270)); l1.renderOrder = 7; g.add(l1);
    const planta = p.x.map((x, i) => new THREE.Vector3(x, 0.006, p.hw[i])).concat(p.x.map((x, i) => new THREE.Vector3(x, 0.006, -p.hw[i])).reverse());
    const l2 = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(planta), encima(0x0b6270)); l2.renderOrder = 7; g.add(l2);
  }
  // Cúpula de cristal aparte, encima del cuerpo (solo la mitad de arriba de la sección).
  if (r.cupula) {
    const cu = r.cupula, nc = 40, cp: number[] = [], ci: number[] = [];
    for (let i = 0; i < cu.x.length; i++) for (let j = 0; j <= nc; j++) {
      const th = Math.PI * j / nc, c = Math.cos(th), sn = Math.sin(th);
      const ez = Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.2), ey = Math.pow(sn, 2 / 2.2);
      cp.push(cu.x[i], cu.base[i] + (cu.top[i] - cu.base[i]) * ey, cu.hw[i] * ez);
    }
    for (let i = 0; i < cu.x.length - 1; i++) for (let j = 0; j < nc; j++) { const a = i * (nc + 1) + j, b = a + nc + 1; ci.push(a, b, a + 1, a + 1, b, b + 1); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setIndex(ci); cg.computeVertexNormals();
    const cm = fantasma
      ? new THREE.MeshStandardMaterial({ color: 0x14a3b5, transparent: true, opacity: 0.22, depthWrite: false, depthTest: false, side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color: 0x0e151c, metalness: 0.2, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const cupula = new THREE.Mesh(cg, cm); if (fantasma) cupula.renderOrder = 5; g.add(cupula);
    if (fantasma) {
      const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(cu.x.map((x, i) => new THREE.Vector3(x, cu.top[i], 0)).concat(cu.x.map((x, i) => new THREE.Vector3(x, cu.base[i] + 0.06, 0)).reverse())),
        new THREE.LineBasicMaterial({ color: 0x0b6270, transparent: true, depthTest: false, depthWrite: false }));
      l.renderOrder = 7; g.add(l);
    }
  }
  if (!fantasma) for (const f of r.faros ?? []) {
    const faro = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, f.largo, 4, 8), new THREE.MeshStandardMaterial({ color: 0xdfe9ff, emissive: 0x9fc4ff, emissiveIntensity: 0.6, roughness: 0.2 }));
    faro.position.set(f.x, f.y, f.z); faro.rotation.set(0, Math.sign(f.z) * 0.9, Math.PI / 2 + 0.25); faro.scale.set(1, 1, 0.5); g.add(faro);
  }
  for (const w of r.ruedas) rueda(g, M, w.x, w.d / 2, w.z, w.d / 2);
  g.traverse((o: any) => { if (o.isMesh && o.material?.isMaterial) (o as any).userData.ref = true; });
}

export const Visor3D = forwardRef<VisorHandle, Props>(function Visor3D({ modelo, visibles, rayosX, corte, curva, cotas: verCotas, abierta, maleteros = false, sinPasajero = false, garaje = [], soloGaraje = false, tunel = false, carteles, cuerposTunel, opcionesTunel, alElegirPuntoTunel, puntoTunel = null, superponer = false, vista, referencia = null, modoRef = 'no', alinear = 'eje', alPinchar, alMoverGaraje }, ref) {
  const pinchar = useRef(alPinchar); pinchar.current = alPinchar;
  const elegirPunto = useRef(alElegirPuntoTunel); elegirPunto.current = alElegirPuntoTunel;
  const moverGaraje = useRef(alMoverGaraje); moverGaraje.current = alMoverGaraje;
  const lienzo = useRef<HTMLCanvasElement>(null);
  const estado = useRef<any>(null);

  useEffect(() => {
    const cv = lienzo.current!;
    const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    // Mapeo tonal neutro (Khronos PBR Neutral, 2026-11-09): el ACES de antes agrisaba los blancos y apagaba el azul
    // marino y el verde inglés; este deja cada pintura de su color, como en una foto de producto.
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 100);
    const controls = new OrbitControls(camera, cv);
    controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 1.5; controls.maxDistance = MAX_ORBITA;
    const target = new THREE.Vector3(-1.5, 0.55, 0);
    camera.position.set(...VISTAS.iso); controls.target.copy(target);

    // Cielo de exterior a media tarde (2026-11-06, Eugenio: «que el modelo 3D
    // tenga por defecto el aspecto realista del render»): la misma bóveda sirve
    // de fondo y de mapa de reflejos, así la pintura y el cristal reflejan un
    // cielo con sol y un suelo oscuro, no un estudio gris.
    const cielo = (conSol: boolean) => {
      const sg = new THREE.SphereGeometry(60, 48, 24), col: number[] = [], pa = sg.attributes.position;
      const cen = new THREE.Color(0x4f86c8), hor = new THREE.Color(0xf3dcc3), bajo = new THREE.Color(0x5e6166), c = new THREE.Color();
      for (let i = 0; i < pa.count; i++) {
        const y = pa.getY(i) / 60;
        if (y >= 0) c.copy(hor).lerp(cen, Math.pow(y, 0.55)); else c.copy(hor).lerp(bajo, Math.min(1, -y * 6));
        col.push(c.r, c.g, c.b);
      }
      sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      const g = new THREE.Group();
      g.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false })));
      if (conSol) {
        // El sol, en la misma dirección que la luz direccional, y un halo: es lo que dibuja el brillo alargado en la pintura.
        const dir = new THREE.Vector3(3.5, 7, 4.5).normalize();
        const sol = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(18, 16, 13), fog: false }));
        sol.position.copy(dir).multiplyScalar(50); g.add(sol);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3), transparent: true, opacity: 0.5, fog: false }));
        halo.position.copy(dir).multiplyScalar(52); g.add(halo);
      }
      return g;
    };
    const pm = new THREE.PMREMGenerator(renderer), es = new THREE.Scene(); es.add(cielo(true));
    let entornoRT = pm.fromScene(es, 0.02), vivo = true;
    scene.environment = entornoRT.texture;
    // Capa de reflejos (2026-11-09, Eugenio: «agrega capas a todos los vehículos para que sean un render más
    // fotorrealista»): la pintura, el cristal y el cromo de todos los coches reflejan un sitio real, un cielo azul
    // con una fila de árboles en el horizonte, en lugar de un degradado. El sol se añade encima para que siga
    // dibujando el brillo alargado. Mientras llega la imagen (35 kB), se queda el cielo dibujado.
    // Probado contra una plaza con edificios y cielo cubierto: agrisaba las pinturas y teñía de rojo las llantas.
    const cargarEntorno = (url: string, escala: number, intensidad: number) => new THREE.TextureLoader().load(url, tex => {
      if (!vivo) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      const ee = new THREE.Scene();
      ee.add(new THREE.Mesh(new THREE.SphereGeometry(60, 64, 32), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, color: new THREE.Color(escala, escala, escala), fog: false })));
      // Del cielo dibujado solo se quedan el sol y su halo (la bóveda la pone la foto).
      const [boveda, ...soles] = cielo(true).children as THREE.Mesh[];
      boveda.geometry.dispose(); (boveda.material as THREE.Material).dispose(); ee.add(...soles);
      const nuevo = pm.fromScene(ee, 0.02);
      entornoRT.dispose(); entornoRT = nuevo; scene.environment = nuevo.texture; scene.environmentIntensity = intensidad;
      ee.traverse((o: any) => { o.geometry?.dispose(); o.material?.dispose(); }); tex.dispose();
    });
    // A 1,5: sin su sol, el cielo de la foto es más oscuro que el dibujado; a 1 las pinturas quedaban apagadas.
    cargarEntorno(entornoUrl, ENTORNO_ESCALA, 1.5);
    const fondo = cielo(false); fondo.position.set(-1.5, 0, 0); scene.add(fondo);
    const niebla = new THREE.Fog(0xf3dcc3, 16, 60); scene.fog = niebla;

    // Luz de exterior: cielo + sol cálido con sombra suave, y un contraluz frío que dibuja el canto de la cúpula.
    scene.add(new THREE.HemisphereLight(0xcfe0f5, 0x5a5751, 0.8));
    const sol = new THREE.DirectionalLight(0xffe9cf, 4.6); sol.position.set(3.5, 7, 4.5); sol.castShadow = true;
    // Capa de sombras: la sombra del sol cubre todo lo que hay en escena, no solo los 10 m del centro (los coches
    // del garaje a 9 y 12 m flotaban sin sombra). La caja se ajusta en `ajustarSombra`, más abajo.
    // 2048 como antes: ajustada a lo que se ve, la sombra del Aeromóvil solo sale más fina (5 m en 2048 en vez de 10)
    // y con el garaje entero (unos 26 m) queda en ~13 mm por punto, que con el borde suave no se nota.
    sol.shadow.mapSize.set(2048, 2048);
    Object.assign(sol.shadow.camera, { left: -5, right: 5, top: 4, bottom: -4, near: 1, far: 20 });
    sol.shadow.bias = -0.0003; sol.shadow.normalBias = 0.01; scene.add(sol); scene.add(sol.target);
    const contraluz = new THREE.DirectionalLight(0xc9dcff, 1.2); contraluz.position.set(-6, 3, -5); scene.add(contraluz);
    // Suelo: asfalto claro con grano, que se funde con el fondo a lo lejos, y la sombra encima.
    // (el suelo recibe la sombra del coche; se desvanece hacia el borde con un alfa radial)
    const suelo = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: 0x6f7073, map: texturaAsfalto(), roughness: 0.9, metalness: 0.05, envMapIntensity: 0.35 }));
    suelo.rotation.x = -Math.PI / 2; suelo.position.set(-1.5, 0, 0); suelo.receiveShadow = true; scene.add(suelo);

    const M = materiales();
    /** The editor's Bala has its own materials: «Rayos X» and «Corte» change them without touching the garage's Bala. */
    const Mb = materialesBala();
    const coche = new THREE.Group(); scene.add(coche);
    const G = {} as Record<CapaId, THREE.Group>;
    for (const c of CAPAS) { G[c.k] = new THREE.Group(); G[c.k].name = c.n; coche.add(G[c.k]); }
    const grupoCotas = new THREE.Group(); grupoCotas.visible = false; scene.add(grupoCotas);
    const grupoRef = new THREE.Group(); grupoRef.visible = false; scene.add(grupoRef);
    const grupoGaraje = new THREE.Group(); scene.add(grupoGaraje);
    const puertasG = new Map<string, THREE.Group[]>();
    // La caja de la sombra, ajustada a lo que se ve: el Aeromóvil, el otro velomóvil y los coches del garaje.
    const DIR_SOL = new THREE.Vector3(3.5, 7, 4.5).normalize(), caja = new THREE.Box3(), cajaUna = new THREE.Box3();
    const camLuz = new THREE.OrthographicCamera(), esquina = new THREE.Vector3(), centro = new THREE.Vector3(), medida = new THREE.Vector3();
    const ajustarSombra = () => {
      caja.makeEmpty();
      for (const o of [coche, grupoRef, grupoGaraje]) if (o.visible) { cajaUna.setFromObject(o); if (!cajaUna.isEmpty()) caja.union(cajaUna); }
      if (caja.isEmpty()) return;
      caja.min.y = 0;
      caja.getCenter(centro); const radio = caja.getSize(medida).length() / 2;
      sol.target.position.copy(centro); sol.position.copy(centro).addScaledVector(DIR_SOL, radio + 10);
      sol.target.updateMatrixWorld(); sol.updateMatrixWorld();
      camLuz.position.copy(sol.position); camLuz.lookAt(centro); camLuz.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        esquina.set(i & 1 ? caja.max.x : caja.min.x, i & 2 ? caja.max.y : caja.min.y, i & 4 ? caja.max.z : caja.min.z).applyMatrix4(camLuz.matrixWorldInverse);
        x0 = Math.min(x0, esquina.x); x1 = Math.max(x1, esquina.x); y0 = Math.min(y0, esquina.y); y1 = Math.max(y1, esquina.y); z0 = Math.min(z0, esquina.z); z1 = Math.max(z1, esquina.z);
      }
      const c = sol.shadow.camera;
      c.left = x0 - 0.4; c.right = x1 + 0.4; c.bottom = y0 - 0.4; c.top = y1 + 0.4; c.near = Math.max(0.1, -z1 - 1); c.far = -z0 + 1;
      c.updateProjectionMatrix();
    };
    let ultimaSombra = -1e9;

    // Posproceso: color lineal en coma flotante con 4 muestras de antialias,
    // oclusión ambiental y, al final, el mapeo tonal y el paso a sRGB.
    const objetivo = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: CALIDAD_ALTA ? 4 : 0 });
    const composer = new EffectComposer(renderer, objetivo);
    composer.addPass(new RenderPass(scene, camera));
    let aoPass: GTAOPass | null = null;
    if (CALIDAD_ALTA) {
      aoPass = new GTAOPass(scene, camera, 1, 1);
      aoPass.output = GTAOPass.OUTPUT.Default;
      aoPass.updateGtaoMaterial({ radius: 0.22, distanceExponent: 1, thickness: 1, scale: 1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false });
      aoPass.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 16 });
      aoPass.blendIntensity = 0.9;
      composer.addPass(aoPass);
    }
    // Sin halo (bloom): probado el 2026-11-09, el reflejo del sol en la cúpula se abría en una mancha que velaba el
    // coche, y con el umbral alto no aportaba nada que se viera.
    composer.addPass(new OutputPass());
    const dibujar = () => composer.render();
    const resize = () => {
      const r = cv.getBoundingClientRect();
      renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
      const pr = renderer.getPixelRatio(); composer.setSize(r.width, r.height); composer.setPixelRatio(pr); aoPass?.setSize(r.width * pr, r.height * pr);
    };
    const ro = new ResizeObserver(resize); ro.observe(cv); resize();

    const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ultimo = performance.now(), tc = 0, acc = 0, raf = 0;
    const st = {
      renderer, scene, camera, controls, target, M, Mb, G, coche, grupoCotas, grupoRef, grupoGaraje, puertasG, dibujar, tween: null as any,
      /** The Bala's rebuilds: the last one's time, the pending quick one (next frame) and the full one after a pause. */
      bala: { ultima: 0, cuadro: 0, pausa: 0 as ReturnType<typeof setTimeout> | 0 },
      /** The Bala is already on screen (so a change is an edit, rebuilt quick first), not being opened. */
      balaVisto: false as false | 'bala' | 'triciclo',
      curva: false, inclinacion: 0, modelo: null as Modelo | null, plano: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
      apertura: 0, aperturaObjetivo: 0, aperturaMal: 0, aperturaMalObjetivo: 0, colocarPuertas: (() => {}) as () => void,
      tunel: null as Tunel | null, superponer: false, ultimoFantasma: 0,
      sombraSucia: true,
      /** Orbit limit to restore when the camera gets home from the all-cars view (0: nothing pending). */
      maxOrbitaAlVolver: 0,
      /** How far beyond MAX_ORBITA the camera is (the all-cars view); fog and ground follow it. */
      lejos: 0,
    };
    const tamano = new THREE.Vector2();
    estado.current = st;
    const colocarPuertas = () => {
      for (const lista of puertasG.values()) for (const piv of lista) {
        piv.quaternion.setFromAxisAngle(piv.userData.eje, piv.userData.angulo * (piv.userData.tipo === 'maletero' ? st.aperturaMal : st.apertura));
      }
    };
    st.colocarPuertas = colocarPuertas;
    // Clic en una pieza: si apenas se ha movido el ratón, es un clic y no un giro de cámara.
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    let bajada: [number, number] | null = null;
    const alBajar = (e: PointerEvent) => { bajada = [e.clientX, e.clientY]; };
    const alSoltar = (e: PointerEvent) => {
      if (!bajada || Math.hypot(e.clientX - bajada[0], e.clientY - bajada[1]) > 6 || !(pinchar.current || (st.tunel && elegirPunto.current))) { bajada = null; return; }
      bajada = null;
      const r = cv.getBoundingClientRect();
      ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      // Túnel (2026-11-09): el cartel de un punto crítico abre su explicación, y gana a la pieza que tenga detrás.
      const punto = st.tunel && elegirPunto.current ? st.tunel.elegir(ray) : null;
      if (punto) { elegirPunto.current!(punto); return; }
      if (!pinchar.current) return;
      const vis: THREE.Object3D[] = [];
      coche.traverse((o: any) => { if (o.isMesh && o.visible && o.userData.componente) { let p = o.parent, ok = true; while (p && p !== coche) { if (!p.visible) { ok = false; break; } p = p.parent; } if (ok) vis.push(o); } });
      const hit = ray.intersectObjects(vis, false).find(h => !(h.object as any).material?.transparent || ((h.object as any).material.opacity ?? 1) > 0.3) ?? ray.intersectObjects(vis, false)[0];
      if (hit) pinchar.current((hit.object as any).userData.componente);
    };
    cv.addEventListener('pointerdown', alBajar); cv.addEventListener('pointerup', alSoltar);
    // Arrastrar un coche del garaje (2026-11-07, Eugenio: «mover los vehículos pulsando sobre ellos y
    // arrastrándolos»). Se escucha en captura para quitarle el gesto a la cámara antes de que empiece a girar.
    const suelo0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pSuelo = new THREE.Vector3(), cajaTmp = new THREE.Box3();
    let arrastre: { obj: THREE.Object3D; dx: number; dz: number; id: number } | null = null;
    const rayoDesde = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); };
    const empezarArrastre = (e: PointerEvent) => {
      if (!moverGaraje.current || e.button !== 0 || !grupoGaraje.children.length) return;
      rayoDesde(e);
      if (st.tunel?.elegir(ray)) return; // a tunnel label in front of the car: it is a click on the label, not a drag
      // Primero la caja de cada coche (barato) y solo después sus triángulos.
      const candidatos = grupoGaraje.children.filter(c => ray.ray.intersectsBox(cajaTmp.setFromObject(c)));
      const hit = candidatos.length ? ray.intersectObjects(candidatos, true).find(h => (h.object as any).isMesh && h.object.visible) : undefined;
      if (!hit) return;
      let obj: THREE.Object3D = hit.object; while (obj.parent && obj.parent !== grupoGaraje) obj = obj.parent;
      if (obj.parent !== grupoGaraje || !ray.ray.intersectPlane(suelo0, pSuelo)) return;
      e.stopImmediatePropagation(); e.preventDefault();
      arrastre = { obj, dx: obj.position.x - pSuelo.x, dz: obj.position.z - pSuelo.z, id: e.pointerId };
      controls.enabled = false; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing';
    };
    const moverArrastre = (e: PointerEvent) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      rayoDesde(e);
      if (ray.ray.intersectPlane(suelo0, pSuelo)) arrastre.obj.position.set(pSuelo.x + arrastre.dx, 0, pSuelo.z + arrastre.dz);
    };
    const soltarArrastre = (e: PointerEvent) => {
      if (!arrastre || e.pointerId !== arrastre.id) return;
      const { obj } = arrastre; arrastre = null;
      controls.enabled = true; cv.style.cursor = ''; try { cv.releasePointerCapture(e.pointerId); } catch { /* ya suelto */ }
      const r5 = (v: number) => Math.round(v * 20) / 20; // a 5 cm
      moverGaraje.current?.(obj.name, r5(obj.position.x), r5(obj.position.z));
    };
    cv.addEventListener('pointerdown', empezarArrastre, { capture: true });
    cv.addEventListener('pointermove', moverArrastre); cv.addEventListener('pointerup', soltarArrastre); cv.addEventListener('pointercancel', soltarArrastre);
    // Túnel: la mano sobre un cartel que se puede pinchar.
    const sobreCartel = (e: PointerEvent) => {
      if (arrastre || e.buttons || e.pointerType !== 'mouse' || !st.tunel) return;
      rayoDesde(e); const encima = !!st.tunel.elegir(ray);
      if (encima) cv.style.cursor = 'pointer'; else if (cv.style.cursor === 'pointer') cv.style.cursor = '';
    };
    cv.addEventListener('pointermove', sobreCartel);
    const bucle = (ahora: number) => {
      const dt = Math.min(0.05, (ahora - ultimo) / 1000); ultimo = ahora;
      if (st.tween) {
        st.tween.t = Math.min(1, st.tween.t + dt / (reducir ? 0.01 : 0.7));
        const e = 1 - Math.pow(1 - st.tween.t, 3);
        camera.position.lerpVectors(st.tween.from, st.tween.to, e); controls.target.lerpVectors(st.tween.tf, target, e);
        if (st.tween.t >= 1) {
          st.tween = null;
          // back from the all-cars view: the orbit limit returns once the camera is home, not before (it would jump)
          if (st.maxOrbitaAlVolver) { controls.maxDistance = st.maxOrbitaAlVolver; st.maxOrbitaAlVolver = 0; }
        }
      }
      // Beyond the hand-zoom limit (only the all-cars view goes there) the fog and the ground move
      // out with the camera; otherwise the far cars sink into the haze and the ground's edge shows.
      const lejos = Math.round(Math.max(0, camera.position.distanceTo(controls.target) - MAX_ORBITA) * 10) / 10;
      if (lejos !== st.lejos) { st.lejos = lejos; niebla.near = 16 + lejos; niebla.far = 60 + 1.5 * lejos; suelo.scale.setScalar(1 + lejos / 30); }
      if (st.apertura !== st.aperturaObjetivo || st.aperturaMal !== st.aperturaMalObjetivo) {
        const paso = reducir ? 1 : dt / 1.1;
        const avanzar = (v: number, o: number) => (o > v ? Math.min(o, v + paso) : Math.max(o, v - paso));
        st.apertura = avanzar(st.apertura, st.aperturaObjetivo); st.aperturaMal = avanzar(st.aperturaMal, st.aperturaMalObjetivo);
        colocarPuertas();
      }
      if (st.curva && st.modelo) {
        tc += dt; acc += dt;
        // El Gota se inclina; el Aeromóvil 1 gira las ruedas delanteras.
        const maximo = st.modelo.tipo === 'a1' ? GIRO_A1 : st.modelo.tipo === 'triciclo' ? st.modelo.giro * 180 / Math.PI : st.modelo.P.tiltMax;
        if (acc > 0.045) { acc = 0; st.inclinacion = maximo * Math.sin(tc * 1.1); construirMovil(G, M, st.modelo, coche, st.inclinacion); }
        // Intermitente del lado hacia el que se inclina o gira, a 1,5 parpadeos por segundo
        const enc = Math.floor(ahora / 333) % 2 === 0;
        M.intermitenteI.emissiveIntensity = st.inclinacion > 2 && enc ? 2.2 : 0.15;
        M.intermitenteD.emissiveIntensity = st.inclinacion < -2 && enc ? 2.2 : 0.15;
      }
      if (st.tunel) { renderer.getSize(tamano); st.tunel.actualizar(reducir ? 0 : ahora / 1000, tamano.x, tamano.y, camera); }
      // Lo que llega tarde a un coche superpuesto (la carrocería del Twizy se descarga) también pasa a fantasma.
      if (st.superponer && ahora - st.ultimoFantasma > 400) { st.ultimoFantasma = ahora; for (const o of grupoGaraje.children) hacerFantasma(o, colorSuperpuesto(o.name)); }
      if (st.sombraSucia || ahora - ultimaSombra > 1000) { st.sombraSucia = false; ultimaSombra = ahora; ajustarSombra(); }
      controls.update(); dibujar(); raf = requestAnimationFrame(bucle);
    };
    raf = requestAnimationFrame(bucle);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); st.tunel?.liberar();
      cv.removeEventListener('pointerdown', alBajar); cv.removeEventListener('pointerup', alSoltar);
      cv.removeEventListener('pointerdown', empezarArrastre, { capture: true });
      cv.removeEventListener('pointermove', moverArrastre); cv.removeEventListener('pointerup', soltarArrastre); cv.removeEventListener('pointercancel', soltarArrastre);
      cv.removeEventListener('pointermove', sobreCartel);
      scene.traverse((o: any) => { o.geometry?.dispose?.(); });
      M.solar.map?.dispose();
      vivo = false; entornoRT.dispose();
      Object.values(M).forEach(m => m.dispose()); Object.values(Mb).forEach(m => m.dispose());
      cancelAnimationFrame(st.bala.cuadro); if (st.bala.pausa) clearTimeout(st.bala.pausa);
      pm.dispose(); composer.dispose(); renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.modelo = modelo;
    const cotasYPuertas = () => { vaciar(st.grupoCotas); cotas(st.grupoCotas, st.M, st.modelo, sinPasajero); st.colocarPuertas(); st.sombraSucia = true; };
    cancelAnimationFrame(st.bala.cuadro); if (st.bala.pausa) { clearTimeout(st.bala.pausa); st.bala.pausa = 0; }
    if (modelo.tipo !== 'bala' && modelo.tipo !== 'triciclo') {
      st.balaVisto = false;
      construirFijo(st.G, st.puertasG, st.M, modelo, sinPasajero);
      construirMovil(st.G, st.M, modelo, st.coche, st.curva ? st.inclinacion : 0);
      cotasYPuertas();
      return;
    }
    // The Bala takes 150–450 ms to build in full. When it changes (a slider, a select), it is
    // rebuilt quick (half the rows, no small details: ~50 ms) on the next frame, at most once per
    // frame however fast the slider moves, and in full 0.3 s after the last change. Only the first
    // build (on opening, or on switching from another vehicle) is full at once.
    // The Triciclo (2026-11-10) comes from the same builder and is rebuilt the same way; switching between the two builds in full.
    const yaEraBala = st.balaVisto === modelo.tipo;
    st.balaVisto = modelo.tipo;
    const construir = (calidad: 'completa' | 'rapida') => {
      const m = st.modelo as ModeloBala | ModeloTriciclo, t0 = performance.now();
      if (m.tipo === 'triciclo') construirTriciclo(st.G, st.puertasG, st.M, st.Mb, m, calidad, sinPasajero);
      else construirBala(st.G, st.puertasG, st.M, st.Mb, m, calidad, sinPasajero);
      construirMovil(st.G, st.M, m, st.coche, st.curva && m.tipo === 'triciclo' ? st.inclinacion : 0);
      cotasYPuertas();
      const t1 = performance.now();
      // measured where the visitor's browser can be asked (performance.getEntriesByName)
      try { performance.measure(`${m.tipo}:${calidad}`, { start: t0, end: t1 }); } catch { /* old browsers */ }
      st.bala.ultima = t1;
    };
    if (!yaEraBala) { construir('completa'); return; }
    st.bala.cuadro = requestAnimationFrame(() => construir('rapida'));
    // the full build cancels a quick one still waiting for its frame: on a slow screen (2 frames a second, measured
    // 2026-11-11 under software WebGL) the frame came after the 0.3 s and the quick build wiped the riders and details
    st.bala.pausa = setTimeout(() => { st.bala.pausa = 0; cancelAnimationFrame(st.bala.cuadro); construir('completa'); }, 300);
  }, [modelo, sinPasajero]);

  useEffect(() => { const st = estado.current; if (!st) return; for (const c of CAPAS) st.G[c.k].visible = visibles[c.k]; }, [visibles]);
  useEffect(() => { const st = estado.current; if (st) st.grupoCotas.visible = verCotas && modoRef !== 'sola'; }, [verCotas, modoRef]);

  // El otro velomóvil: se dibuja aparte (no se inclina con el nuestro) y se
  // coloca por el eje delantero, por el morro o al lado.
  useEffect(() => {
    const st = estado.current; if (!st) return;
    const g: THREE.Group = st.grupoRef;
    if (!referencia || modoRef === 'no') { g.visible = false; st.coche.visible = true; return; }
    construirReferencia(g, st.M, referencia, modoRef === 'comparar');
    const morroRef = referencia.perfil.x[0];
    g.position.set(0, 0, 0);
    if (modoRef === 'comparar' && alinear === 'morro') g.position.x = modelo.xn - morroRef;
    if (modoRef === 'comparar' && alinear === 'lado') g.position.z = -(modelo.P.W / 2 + referencia.W / 2 + 0.35);
    g.visible = true;
    st.coche.visible = modoRef !== 'sola'; st.sombraSucia = true;
  }, [referencia, modoRef, alinear, modelo]);
  // El garaje: cada vehículo se construye una vez por cambio de lista (los
  // modelos son pesados) y se coloca con su eje delantero en (x, z).
  const claveGaraje = garaje.map(v => v.id).join('|');
  useEffect(() => {
    const st = estado.current; if (!st) return;
    const g: THREE.Group = st.grupoGaraje;
    for (const o of g.children) liberarFantasma(o);
    vaciar(g);
    st.superponer = superponer;
    for (const v of garaje) {
      const def = vehiculoGaraje(v.id); if (!def) continue;
      // Un modelo del garaje que falla no puede tumbar el visor entero: se queda fuera y lo dice la consola.
      let obj: THREE.Group;
      try { obj = def.construir(); } catch (e) { console.error(`[garaje] no se pudo construir «${def.nombre}»:`, e); continue; }
      obj.name = v.id; obj.traverse((o: any) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const cg = cotasGaraje(st.M, def); cg.visible = verCotas && !superponer; obj.add(cg);
      if (superponer) { hacerFantasma(obj, colorSuperpuesto(v.id)); obj.add(siluetas(def, colorSuperpuesto(v.id))); }
      g.add(obj);
    }
    // Las posiciones se ponen ya (el efecto de abajo solo corre si cambian).
    for (const v of garaje) { const obj = g.getObjectByName(v.id); if (obj) { obj.position.set(v.x, 0, v.z); obj.rotation.y = v.giro ?? 0; } }
    st.sombraSucia = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveGaraje, superponer]);
  // Las cotas de los coches del garaje se ven con las del nuestro (no cuando están superpuestos: se pisarían).
  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.grupoGaraje.traverse((o: THREE.Object3D) => { if (o.name === 'cotas-garaje') o.visible = verCotas && !superponer; });
  }, [verCotas, superponer, claveGaraje]);
  // Con los coches superpuestos, cada vista enseña solo la silueta que se lee en ella.
  useEffect(() => { const st = estado.current; if (st && superponer) mostrarSiluetas(st.grupoGaraje, vista); }, [vista, superponer, claveGaraje]);
  useEffect(() => {
    const st = estado.current; if (!st) return;
    for (const v of garaje) { const obj = st.grupoGaraje.getObjectByName(v.id); if (obj) { obj.position.set(v.x, 0, v.z); obj.rotation.y = v.giro ?? 0; } }
    st.sombraSucia = true;
  }, [garaje]);
  // Túnel de viento (2026-11-09: flujo calculado, ver tunelViento.ts): se rehace cuando cambia un cuerpo, su sitio,
  // los carteles, la resolución o el número de líneas. Lo que solo se enciende o se apaga, y la velocidad, no lo rehacen.
  const claveTunel = tunel && cuerposTunel && opcionesTunel
    ? cuerposTunel.map(c => `${c.id}@${c.x},${c.z},${c.giro}:${c.envolvente.length}:${c.envolvente.reduce((s, e) => s + e[0] * 3.1 + e[1] * 5.7 + e[2] * 7.3 + e[3] * 11.9, 0).toFixed(4)}:${c.area.toFixed(4)}`).join('|')
      + JSON.stringify(carteles ?? {}) + `|${opcionesTunel.resolucion}|${opcionesTunel.lineas}` : '';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    if (st.tunel) { st.scene.remove(st.tunel.grupo); st.tunel.liberar(); st.tunel = null; }
    if (!tunel || !cuerposTunel || !opcionesTunel) return;
    st.tunel = crearTunel(cuerposTunel.map(c => ({ ...c, etiqueta: carteles?.[c.id] })), opcionesTunel); st.scene.add(st.tunel.grupo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tunel, claveTunel]);
  useEffect(() => { if (opcionesTunel) estado.current?.tunel?.ajustar(opcionesTunel); }, [opcionesTunel, claveTunel]);
  useEffect(() => { estado.current?.tunel?.resaltar(puntoTunel); }, [puntoTunel?.cuerpo, puntoTunel?.punto, claveTunel]);
  // «Cd y consumo»: un cartel encima de cada coche (con el túnel abierto los pone el túnel).
  const claveCarteles = !tunel && carteles ? JSON.stringify(carteles) + garaje.map(v => `${v.id}@${v.x},${v.z},${v.giro ?? 0}`).join('|') + (soloGaraje ? '|solo' : '') : '';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    let g = st.scene.getObjectByName('carteles') as THREE.Group | undefined;
    if (g) { g.traverse((o: any) => { if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } }); st.scene.remove(g); }
    if (!claveCarteles || !carteles) return;
    g = new THREE.Group(); g.name = 'carteles'; st.scene.add(g);
    const poner = (texto: string | undefined, x: number, y: number, z: number) => { if (!texto) return; const c = cartel(texto); c.position.set(x, y, z); g!.add(c); };
    if (!soloGaraje) poner(carteles.aeromovil, (modelo.xn + modelo.xt) / 2, modelo.P.H + 0.55, 0);
    for (const v of garaje) {
      const def = vehiculoGaraje(v.id); if (!def) continue;
      const xs = def.envolvente?.map(e => e[0]), xm = xs?.length ? (Math.max(...xs) + Math.min(...xs)) / 2 : -def.batalla / 2, gi = v.giro ?? 0;
      poner(carteles[v.id], v.x + xm * Math.cos(gi), def.alto + 0.55, v.z - xm * Math.sin(gi));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveCarteles, modelo]);
  // Al abrir el túnel con más de un coche, la cámara se aleja y se eleva para verlos a la vez
  // (con las estelas delante); al cerrarlo vuelve a la vista que estaba elegida.
  // Túnel o carteles de consumo: hay que ver todos los coches a la vez.
  const verTodos = tunel || !!carteles;
  const claveEncuadre = verTodos ? garaje.map(v => `${v.x},${v.z}`).join('|') : '';
  useEffect(() => {
    const st = estado.current; if (!st) return;
    const enGaraje = garaje.filter(v => vehiculoGaraje(v.id)?.envolvente);
    const zs = [...(soloGaraje ? [] : [0]), ...enGaraje.map(v => v.z)];
    const xs = [...(soloGaraje ? [] : [0]), ...enGaraje.map(v => v.x)];
    if (verTodos && zs.length > 1) {
      const zc = (Math.min(...zs) + Math.max(...zs)) / 2, xc = (Math.min(...xs) + Math.max(...xs)) / 2, ancho = Math.max(...zs) - Math.min(...zs);
      // La tarjeta va debajo del visor: los coches, centrados, con las estelas detrás.
      const d = 1 + ancho / 6;
      st.target.set(xc - 2.4, 0.5, zc + 0.6);
      let destino = new THREE.Vector3(xc - 2.4 - 6.4 * d, 5.0 * d, zc + 0.6 - 6.6 * d);
      // That distance never reached the camera: OrbitControls clamps it to MAX_ORBITA (25 m), so
      // with the garage full (2026-11-09: cars from z = −12 to +12) the nearest cars fell out of
      // the frame, the Cuadriciclo Bala en rombo at −12 among them. Now every car, its label and (with the
      // tunnel on) the start of its wake are checked against the actual field of view. The camera
      // keeps the distance it really had until now, and backs off along the same line only when
      // something would not fit; the orbit limit is lifted to match while this view lasts.
      const puntos: THREE.Vector3[] = [];
      const caja = (x0: number, x1: number, z: number, medioAncho: number, alto: number, giro = 0) => {
        for (const x of [x0, x1]) for (const dz of [-medioAncho, medioAncho]) for (const y of [0, alto])
          puntos.push(new THREE.Vector3(x * Math.cos(giro) + dz * Math.sin(giro), y, z - x * Math.sin(giro) + dz * Math.cos(giro)));
      };
      const estela = tunel ? 2 : 0;
      if (!soloGaraje) caja(Math.max(modelo.xn, modelo.xt), Math.min(modelo.xn, modelo.xt) - estela, 0, modelo.P.W / 2, modelo.P.H + 0.9);
      for (const v of enGaraje) {
        const def = vehiculoGaraje(v.id)!, ex = def.envolvente!.map(e => e[0]), gi = v.giro ?? 0;
        caja(Math.max(...ex), Math.min(...ex) - estela, 0, def.ancho / 2, def.alto + 0.9, gi);
        for (const p of puntos.slice(-8)) { p.x += v.x; p.z += v.z; }
      }
      const haciaCamara = destino.clone().sub(st.target);
      const hastaAhora = Math.min(haciaCamara.length(), MAX_ORBITA);
      const distancia = Math.max(hastaAhora, Math.min(75, distanciaParaVer(puntos, st.target, haciaCamara, st.camera)));
      destino = st.target.clone().addScaledVector(haciaCamara.normalize(), distancia);
      st.controls.maxDistance = Math.max(MAX_ORBITA, distancia + 1); st.maxOrbitaAlVolver = 0;
      st.tween = { from: st.camera.position.clone(), to: destino, tf: st.controls.target.clone(), t: 0 };
    } else if (!verTodos && (st.target.x !== -1.5 || st.target.z !== 0)) {
      st.target.set(-1.5, 0.55, 0); st.maxOrbitaAlVolver = MAX_ORBITA;
      st.tween = { from: st.camera.position.clone(), to: new THREE.Vector3(...VISTAS[vista]), tf: st.controls.target.clone(), t: 0 };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verTodos, claveEncuadre, soloGaraje, tunel]);
  useEffect(() => { const st = estado.current; if (!st) return; st.coche.visible = !soloGaraje && !(referencia && modoRef === 'sola'); st.grupoCotas.visible = !soloGaraje && verCotas && modoRef !== 'sola'; }, [soloGaraje, referencia, modoRef, verCotas]);
  useEffect(() => { const st = estado.current; if (st) st.aperturaObjetivo = abierta ? 1 : 0; }, [abierta]);
  useEffect(() => { const st = estado.current; if (st) st.aperturaMalObjetivo = maleteros ? 1 : 0; }, [maleteros]);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    const { body, glass, solar, bajos } = st.M as Mats;
    for (const mt of [body, bajos]) { mt.transparent = rayosX; mt.opacity = rayosX ? 0.16 : 1; mt.depthWrite = !rayosX; }
    solar.transparent = rayosX; solar.opacity = rayosX ? 0.25 : 1; solar.depthWrite = !rayosX;
    if (CALIDAD_ALTA) { glass.transmission = rayosX ? 1 : 0.95; glass.attenuationDistance = rayosX ? 2 : 0.25; } else glass.opacity = rayosX ? 0.18 : 0.55;
    const cp = corte ? [st.plano] : [];
    for (const mt of [body, glass, solar, bajos]) { mt.clippingPlanes = cp; mt.needsUpdate = true; }
    // The editor's Bala: its paint (and everything painted on it) goes see-through, the inner skin disappears;
    // «Corte» cuts every one of its materials at the centre plane, so the cockpit shows.
    const Mb = st.Mb as ReturnType<typeof materialesBala>;
    for (const mt of [Mb.chapa, Mb.marino, Mb.chapaDoble, Mb.marinoDoble, Mb.chapaCalco, Mb.marinoCalco, Mb.rojo, Mb.rojoDoble, Mb.rojoPieza, Mb.junta, Mb.negroBrillo, Mb.negroMate, Mb.grisOscuro, Mb.solar]) {
      mt.transparent = rayosX; mt.opacity = rayosX ? 0.16 : 1; mt.depthWrite = !rayosX;
    }
    Mb.forro.visible = !rayosX;
    for (const mt of Object.values(Mb)) { mt.clippingPlanes = cp; mt.needsUpdate = true; }
  }, [rayosX, corte]);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.curva = curva;
    if (!curva && st.modelo) {
      st.inclinacion = 0; construirMovil(st.G, st.M, st.modelo, st.coche, 0);
      st.M.intermitenteI.emissiveIntensity = 0.15; st.M.intermitenteD.emissiveIntensity = 0.15;
    }
  }, [curva]);

  useEffect(() => {
    const st = estado.current; if (!st) return;
    st.target.set(-1.5, 0.55, 0);
    st.tween = { from: st.camera.position.clone(), to: new THREE.Vector3(...VISTAS[vista]), tf: st.controls.target.clone(), t: 0 };
  }, [vista]);

  useImperativeHandle(ref, () => ({
    exportarSTL: (capas: CapaId[]) => {
      const st = estado.current;
      const grupo = new THREE.Group();
      // Del visor (m, Y arriba) al CAD (mm, Z arriba): girar +90° en X y escalar ×1000
      grupo.rotation.x = Math.PI / 2; grupo.scale.setScalar(1000);
      st.coche.updateMatrixWorld(true);
      const inv = new THREE.Matrix4().copy(st.coche.matrixWorld).invert();
      for (const k of capas) {
        st.G[k].traverse((o: any) => {
          if (o.isMesh) {
            const c = new THREE.Mesh(o.geometry, o.material);
            // Sin la inclinación de la carrocería: se exporta en reposo
            c.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
            grupo.add(c);
          }
        });
      }
      grupo.updateMatrixWorld(true);
      const datos = new STLExporter().parse(grupo, { binary: true }) as DataView;
      return new Blob([datos.buffer as ArrayBuffer], { type: 'model/stl' });
    },
    capturar: () => new Promise<Blob>((resolver, fallar) => {
      const st = estado.current; if (!st) return fallar(new Error('El visor no está listo.'));
      // Un fotograma recién pintado, por si el bucle aún no ha dibujado este estado
      // Sin cotas: en una fotografía no hay líneas de acotación, y la IA tiende a dibujarlas si las ve
      const cotas = st.grupoCotas.visible; st.grupoCotas.visible = false;
      st.dibujar();
      st.grupoCotas.visible = cotas;
      const cv = st.renderer.domElement as HTMLCanvasElement;
      // El lienzo es transparente; el JPEG no admite transparencia y lo pondría negro: se compone sobre el fondo claro de la página
      const copia = document.createElement('canvas'); copia.width = cv.width; copia.height = cv.height;
      const ctx = copia.getContext('2d'); if (!ctx) return fallar(new Error('No se ha podido capturar el visor.'));
      ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, copia.width, copia.height); ctx.drawImage(cv, 0, 0);
      copia.toBlob(b => b ? resolver(b) : fallar(new Error('No se ha podido capturar el visor.')), 'image/jpeg', 0.92);
    }),
  }), []);

  return <canvas ref={lienzo} className="absolute inset-0 h-full w-full touch-none" aria-label={modelo.tipo === 'a1' ? 'Modelo 3D del Aeromóvil 1' : modelo.tipo === 'bala' ? 'Modelo 3D del Cuadriciclo Bala en rombo' : modelo.tipo === 'triciclo' ? (modelo.traseras ? 'Modelo 3D del Cuadriciclo Bala clásico' : 'Modelo 3D del Triciclo Bala') : 'Modelo 3D del Aeromóvil Gota'} />;
});
