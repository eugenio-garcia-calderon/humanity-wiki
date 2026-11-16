// Viewer materials and procedural textures (tyres, rims, discs, asphalt, solar cells, paint).
// Moved out of Visor3D.tsx unchanged (2026-11-16, refactor «ordenar»). See ../CLAUDE.md for the layout.
import * as THREE from 'three';
import { crearMateriales as materialesBala } from '../garaje/balaModelo';

// Round 4 (2026-11-13, «más discretos como los del aptera, y con ese toque cristalizado»): the joint and the busbars
// dark slate and the busbars faint (before, the joint was a light navy that drew a grid), as the Triciclo's (balaPiezas.ts)
export function texturaSolar() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#353c49'; g.fillRect(0, 0, 128, 128);                 // la junta (gris pizarra, cerca de la del Aptera del garaje)
  g.fillStyle = '#0e1b3d';
  g.beginPath(); g.moveTo(8, 2); g.lineTo(120, 2); g.lineTo(126, 8); g.lineTo(126, 120); g.lineTo(120, 126); g.lineTo(8, 126); g.lineTo(2, 120); g.lineTo(2, 8); g.closePath(); g.fill();
  g.strokeStyle = '#18213a'; g.lineWidth = 1; g.beginPath(); g.moveTo(6, 43); g.lineTo(122, 43); g.moveTo(6, 85); g.lineTo(122, 85); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

/** Ruido fino repetible (canvas), para que la pintura y el suelo no sean lisos de ordenador. */
export function texturaRuido(tam: number, base: number, amp: number, semilla = 7, repetir = 1) {
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
export function texturasNeumatico() {
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
export let _sombraTex: THREE.Texture | null = null;
export function sombraContacto(r: number, w: number) {
  if (!_sombraTex) {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64); grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128); _sombraTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, alphaMap: _sombraTex, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.scale.set(r * 0.75, w * 0.9, 1); m.position.y = -r + 0.004; m.renderOrder = -1; return m;
}
/** Perfil del neumático para el torno, de la pestaña interior a la exterior: flanco abombado, hombro redondo, banda de rodadura ligeramente bombeada. 17 puntos: los índices 5–11 son la banda (v de 0,3125 a 0,6875 en la textura). */
export const desplazarV = (t: THREE.Texture) => { const c = t.clone(); c.wrapT = THREE.RepeatWrapping; c.offset.y = 0.5; c.needsUpdate = true; return c; };
export function perfilNeumatico(r: number, w: number, rLlanta: number): THREE.Vector2[] {
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
export function texturasLlanta() {
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
export function texturaMatricula(texto: string) {
  const c = document.createElement('canvas'); c.width = 1040; c.height = 220; const g = c.getContext('2d')!;
  g.fillStyle = '#f4f4f2'; g.fillRect(0, 0, 1040, 220);
  g.fillStyle = '#003399'; g.fillRect(0, 0, 100, 220);
  g.fillStyle = '#ffcc00'; for (let k = 0; k < 12; k++) { const a = 2 * Math.PI * k / 12; g.beginPath(); g.arc(50 + 28 * Math.cos(a), 78 + 28 * Math.sin(a), 4, 0, 2 * Math.PI); g.fill(); }
  g.fillStyle = '#ffffff'; g.font = '700 54px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('E', 50, 172);
  g.fillStyle = '#111'; g.font = '700 150px "DIN Alternate", "Arial Narrow", sans-serif'; g.fillText(texto, 570, 112);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
/** Disco de freno: hierro gris con el anillo de rozamiento rayado y los taladros. */
export function texturasDisco() {
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
export function texturaAsfalto() {
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
export const ENTORNO_ESCALA = 1.2;
export const CALIDAD_ALTA = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches && !/Mobi|Android/i.test(navigator.userAgent);

export function materiales() {
  const grano = texturaRuido(256, 128, 70, 3, 40), neum = texturasNeumatico(), llantaTx = texturasLlanta(), discoTx = texturasDisco(), relieveSolar = texturaSolar();
  return {
    // Pintura perlada: base blanca con grano metálico fino bajo un barniz brillante.
    body: new THREE.MeshPhysicalMaterial({ color: 0xf4f5f6, metalness: 0.12, roughness: 0.38, roughnessMap: grano, bumpMap: grano, bumpScale: 0.0004, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1, sheen: 0.15, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
    // Cristal: en calidad alta, transmisión de verdad (se ve el interior a través, con tinte y refracción); en media, el vidrio tintado de siempre.
    glass: CALIDAD_ALTA
      ? new THREE.MeshPhysicalMaterial({ color: 0x9fb3c4, metalness: 0, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.5, transmission: 0.95, thickness: 0.006, ior: 1.52, attenuationColor: new THREE.Color(0x4f6b80), attenuationDistance: 0.25, side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color: 0x0c161f, metalness: 0.2, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
    // (round 4: under glass, as the Aptera's: smoother, with a mirror-like clear coat, and less relief)
    solar: new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: relieveSolar, bumpMap: relieveSolar, bumpScale: 0.0005, metalness: 0.15, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4, side: THREE.DoubleSide }),
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
export type Mats = ReturnType<typeof materiales>;

/**
 * One of the editor's saved designs as a garage car (2026-11-12, Eugenio: «poder comparar el cuadriciclo con el
 * triciclo en el garaje»): the same builders the viewer uses for our own car (construirFijo/construirMovil for the
 * Gota and the Aeromóvil 1, construirBala, construirTriciclo), into a group of its own, in full quality and closed,
 * with materials of its own (shared by every design in the garage, so «Rayos X» and «Corte» never touch them).
 * Its doors and boot lids come back as garage pivots (named `piv-0`, `piv-1`…), so the viewer opens them like the
 * Aptera's. Takes about as long as building that design as our own car (a Triciclo, ~1 s): call it once per design.
 */
/**
 * 2026-11-13 («permite también cambiar el color de la carrocería»): the body's paint and its accent. Paint: the
 * Gota's and the Aeromóvil 1's `body`, the Bala family's `chapa` (and its decal and double-sided copies); accent: the
 * navy `morro` and `marino`. Only the colour changes: the grain, the clear coat and the sheen stay.
 */
export function pinturas(M: Mats, Mb: ReturnType<typeof materialesBala>) {
  return { carroceria: [M.body, Mb.chapa, Mb.chapaCalco, Mb.chapaDoble], acento: [M.morro, Mb.marino, Mb.marinoCalco, Mb.marinoDoble] };
}
export function pintar(M: Mats, Mb: ReturnType<typeof materialesBala>, c: { carroceria: string; acento: string }) {
  const p = pinturas(M, Mb);
  for (const mt of p.carroceria) mt.color.set(c.carroceria);
  for (const mt of p.acento) mt.color.set(c.acento);
}
