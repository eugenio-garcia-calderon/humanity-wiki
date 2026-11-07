import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { ModeloBase } from './geometria';

/**
 * Túnel de viento de mentira, para ver dos coches a la vez (2026-11-07,
 * Eugenio: «un efecto túnel de viento para comparar ambos vehículos»).
 *
 * NO es una simulación de fluidos. Es una ilustración que respeta tres cosas
 * que sí son ciertas y se ven:
 *  1. El aire tiene que apartarse lo que ocupa el coche: cada línea de humo se
 *     separa del eje lo justo para que el área entre ella y el coche se
 *     conserve (r² = r0² + R(x)²), con el coche «reflejado» bajo el suelo para
 *     que el aire de abajo se estreche entre el suelo y los bajos.
 *  2. Un morro romo para el aire de golpe (rojo, presión alta) y uno afilado
 *     lo aparta poco a poco; por los lados el aire acelera (azul).
 *  3. Una cola cortada deja detrás un hueco que el aire tarda en cerrar: la
 *     estela. Su tamaño sale del área de la última sección del coche, así que
 *     el Twizy (trasera plana) arrastra una estela grande y la gota casi nada.
 * Las cifras que importan (Cd, área, fuerza, potencia) no salen de aquí: las
 * pone la tarjeta de la página, cada una con su fuente.
 *
 * Ejes del visor: X hacia delante (el coche avanza hacia +X, así que el aire
 * corre hacia −X), Y arriba, Z lateral. Metros.
 */

/** [x, y del suelo de la carrocería, y del techo, media anchura]. */
export type Envolvente = [number, number, number, number][];

export interface CuerpoTunel {
  id: string;
  /** Dónde está el coche en la escena (eje delantero) y su giro. */
  x: number; z: number; giro: number;
  envolvente: Envolvente;
  /** Exponente de la sección (2 = elipse, 3 = más cuadrada, como el Twizy). */
  n: number;
  /** Cartel flotante encima del coche (nombre y CdA). */
  etiqueta?: string;
}

/** La silueta del Aeromóvil a partir de sus superficies (cuerpo y cúpula), cada 3 cm. */
export function envolventeModelo(m: ModeloBase): Envolvente {
  const paso = 0.03, mapa = new Map<number, [number, number, number]>();
  for (const s of m.superficies) {
    for (let k = 0; k <= 400; k++) {
      const f = s.frame(s.u0 + (s.u1 - s.u0) * (k / 400));
      if (!(f.hw > 0.002) || !(f.top > f.bot)) continue;
      const i = Math.round(f.x / paso), e = mapa.get(i);
      if (!e) mapa.set(i, [f.bot, f.top, f.hw]);
      else mapa.set(i, [Math.min(e[0], f.bot), Math.max(e[1], f.top), Math.max(e[2], f.hw)]);
    }
  }
  return [...mapa.entries()].sort((a, b) => b[0] - a[0]).map(([i, e]) => [i * paso, e[0], e[1], e[2]]);
}

// ---------------------------------------------------------------- utilidades
const DX = 0.03;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Colores del humo según la presión estimada: azul (aire rápido) · gris (libre) · rojo (aire frenado). */
const C_BAJA = new THREE.Color(0x1d4ed8), C_MEDIA_B = new THREE.Color(0x60a5fa), C_LIBRE = new THREE.Color(0x94a3b8);
const C_MEDIA_A = new THREE.Color(0xf59e0b), C_ALTA = new THREE.Color(0xdc2626), C_ESTELA = new THREE.Color(0x7c3aed);
function colorCp(cp: number, estela: number, out: THREE.Color) {
  if (cp < 0) { const t = clamp(-cp, 0, 1); if (t < 0.5) out.copy(C_LIBRE).lerp(C_MEDIA_B, t / 0.5); else out.copy(C_MEDIA_B).lerp(C_BAJA, (t - 0.5) / 0.5); }
  else { const t = clamp(cp, 0, 1); if (t < 0.5) out.copy(C_LIBRE).lerp(C_MEDIA_A, t / 0.5); else out.copy(C_MEDIA_A).lerp(C_ALTA, (t - 0.5) / 0.5); }
  if (estela > 0.02) out.lerp(C_ESTELA, clamp(estela * 1.6, 0, 0.75));
  return out;
}

/** Desenfoque gaussiano de un perfil (la influencia del coche empieza antes del morro). */
function suavizar(v: Float64Array, sigma: number): Float64Array {
  const r = Math.ceil((3 * sigma) / DX), w: number[] = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-0.5 * ((k * DX) / sigma) ** 2));
  const o = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) {
    let s = 0, ws = 0;
    for (let k = -r; k <= r; k++) { const j = i + k; if (j < 0 || j >= v.length) continue; s += v[j] * w[k + r]; ws += w[k + r]; }
    o[i] = s / ws;
  }
  return o;
}

interface Linea { px: Float32Array; py: Float32Array; pz: Float32Array; t: Float32Array; estela: Float32Array; col: Float32Array; T: number }

/** Las líneas de un coche, en coordenadas del propio coche. */
export function lineasDe(c: CuerpoTunel) {
  const env = [...c.envolvente].sort((a, b) => a[0] - b[0]);
  const xMin = env[0][0], xMax = env[env.length - 1][0];
  const x0 = xMax + 1.6, x1 = xMin - 3.2, N = Math.ceil((x0 - x1) / DX) + 1;
  const xs = new Float64Array(N);
  const aR = new Float64Array(N), bR = new Float64Array(N), cR = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const x = x0 - i * DX; xs[i] = x;
    if (x > xMax || x < xMin) continue;
    // tramo [j, j+1] de la envolvente (ordenada de atrás a delante) que contiene x
    let lo = 0, hi = env.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (env[m][0] <= x) lo = m; else hi = m; }
    const e0 = env[lo], e1 = env[hi], t = e1[0] > e0[0] ? clamp((x - e0[0]) / (e1[0] - e0[0]), 0, 1) : 0;
    const yb = e0[1] + (e1[1] - e0[1]) * t, yt = e0[2] + (e1[2] - e0[2]) * t, hw = e0[3] + (e1[3] - e0[3]) * t;
    aR[i] = Math.max(0, (yt - yb) / 2); bR[i] = Math.max(0, hw); cR[i] = (yb + yt) / 2;
  }
  // Sección máxima: da la escala de todo.
  let iMax = 0; for (let i = 0; i < N; i++) if (aR[i] * bR[i] > aR[iMax] * bR[iMax]) iMax = i;
  const aM = Math.max(0.05, aR[iMax]), bM = Math.max(0.05, bR[iMax]), cM = cR[iMax];
  // La estela: tras la cola, una «sección fantasma» del tamaño de la última que se va cerrando.
  let iCola = 0; for (let i = 0; i < N; i++) if (aR[i] > 0) iCola = i;
  const kCola = (aR[iCola] * bR[iCola]) / (aM * bM), Lw = 0.5 + 2.4 * kCola;
  const a = new Float64Array(N), b = new Float64Array(N), cc = new Float64Array(N), est = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    if (aR[i] > 0) { a[i] = aR[i]; b[i] = bR[i]; cc[i] = cR[i]; continue; }
    if (i > iCola) {
      const d = (i - iCola) * DX, f = Math.exp(-d / Lw);
      a[i] = aR[iCola] * f; b[i] = bR[iCola] * f; cc[i] = cR[iCola]; est[i] = kCola * Math.exp(-d / (Lw * 1.3));
    } else cc[i] = cM;
  }
  const aS = suavizar(a, 0.2), bS = suavizar(b, 0.2), cS = suavizar(cc, 0.2), eS = suavizar(est, 0.15);
  const n = c.n;

  // Desplazamiento de un punto que llega de lejos a (y0, z0), en la estación i.
  const desplazar = (y0: number, z0: number, i: number, centro: number, salida: number[]) => {
    const al = aS[i] / aM, be = bS[i] / bM;
    const u = (y0 - centro) / aM, v = z0 / bM, r0 = Math.hypot(u, v), th = Math.atan2(u, v);
    const rb = al > 1e-4 && be > 1e-4 ? Math.pow(Math.pow(Math.abs(Math.cos(th)) / be, n) + Math.pow(Math.abs(Math.sin(th)) / al, n), -1 / n) : 0;
    const r = Math.sqrt(r0 * r0 + rb * rb);
    salida[0] = centro + aM * r * Math.sin(th) - y0; salida[1] = bM * r * Math.cos(th) - z0; salida[2] = rb; salida[3] = r;
  };

  const lineas: Linea[] = [];
  const hacer = (y0: number, z0: number) => {
    const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N), col = new Float32Array(N * 3), es = new Float32Array(N), tt = new Float32Array(N);
    const d1 = [0, 0, 0, 0], d2 = [0, 0, 0, 0], color = new THREE.Color();
    let rPrev = -1, T = 0;
    const fase = y0 * 13.7 + z0 * 7.3;
    for (let i = 0; i < N; i++) {
      // El eje es fijo (el centro de la sección mayor): así cada línea decide una
      // vez por dónde pasa (por encima, por debajo o por un lado) y no salta de
      // un lado a otro cuando el morro está más bajo que el techo.
      desplazar(y0, z0, i, cM, d1);
      desplazar(y0, z0, i, -cM, d2); // el coche reflejado bajo el suelo
      let y = Math.max(0.015, y0 + d1[0] + d2[0]), z = z0 + d1[1] + d2[1];
      // Nunca dentro de la carrocería real (sin suavizar): se lleva al borde,
      // siguiendo el rayo que sale del eje, que es el lado que ya había elegido.
      if (aR[i] > 0 && bR[i] > 0) {
        const fuera = (yy: number, zz: number) => Math.pow(Math.pow(Math.abs(zz) / bR[i], n) + Math.pow(Math.abs(yy - cR[i]) / aR[i], n), 1 / n) >= 1.05;
        if (!fuera(y, z)) {
          let dy = y - cM, dz = z;
          if (Math.hypot(dy, dz) < 1e-4) { dy = z0 === 0 ? (y0 >= cM ? 1e-3 : -1e-3) : 0; dz = z0 === 0 ? 0 : Math.sign(z0) * 1e-3; }
          let lo = 1, hi = 2;
          while (!fuera(cM + dy * hi, dz * hi) && hi < 4096) { lo = hi; hi *= 2; }
          for (let it = 0; it < 22; it++) { const m = (lo + hi) / 2; if (fuera(cM + dy * m, dz * m)) hi = m; else lo = m; }
          y = cM + dy * hi; z = dz * hi;
          if (y < 0.015) y = 0.015;
        }
      }
      // Presión estimada: se aparta deprisa (frena, rojo) o va pegada sin apartarse (acelera, azul).
      const r = d1[3], g = rPrev < 0 ? 0 : (r - rPrev) / DX; rPrev = r;
      const cerca = r > 0 ? clamp((d1[2] * d1[2]) / (r * r), 0, 1) : 0;
      const aparta = clamp(g * 2.2, 0, 1), cierra = clamp(-g * 2.2, 0, 1);
      const cp = clamp(cerca * aparta * 1.1 - cerca * 0.85 * (1 - Math.max(aparta, cierra)) + cerca * cierra * 0.2, -1, 1);
      // Estela: fuerte en las líneas que pasan rozando la cola, nada en las lejanas.
      es[i] = clamp(eS[i] * 3 * Math.sqrt(cerca), 0, 1);
      // ... y revuelta: el humo de la estela no va recto (remolinos congelados en la línea).
      if (es[i] > 0.02) {
        const amp = es[i] * 0.12 * aM, f = fase + xs[i];
        y = Math.max(0.015, y + amp * (Math.sin(f * 9.1) + 0.5 * Math.sin(f * 17.3 + 1.1)));
        z += amp * (Math.cos(f * 7.7 + 0.4) + 0.5 * Math.sin(f * 13.9));
      }
      px[i] = xs[i]; py[i] = y; pz[i] = z;
      colorCp(cp - es[i] * 0.3, es[i], color); color.toArray(col, i * 3);
      // Velocidad aparente para las partículas (Bernoulli, frenada en la estela).
      const vel = Math.sqrt(clamp(1 - cp, 0.06, 2)) * (1 - 0.65 * es[i]);
      if (i > 0) T += DX / Math.max(0.08, vel);
      tt[i] = T;
    }
    lineas.push({ px, py, pz, t: tt, estela: es, col, T });
  };
  const techo = cM + aM;
  // Peine vertical en el eje del coche, horizontal a media altura y otro bajo (ruedas y bajos).
  for (let k = 0; k < 13; k++) hacer(0.06 + (techo + 0.55 - 0.06) * (k / 12), 0);
  for (let k = 0; k < 12; k++) { const z = -(bM + 0.75) + (2 * (bM + 0.75)) * (k / 11); if (Math.abs(z) > 0.04) hacer(cM, z); }
  for (let k = 0; k < 8; k++) { const z = -(bM + 0.45) + (2 * (bM + 0.45)) * (k / 7); hacer(0.22, z); }
  return { lineas, x0, techo, bM, cM, aM, xMedio: (xMin + xMax) / 2 };
}

/** Textura redonda para las partículas de humo. */
function puntoRedondo(): THREE.Texture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d')!;
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** Cartel de texto que siempre mira a la cámara (dos líneas separadas por «\n»). */
function cartel(texto: string): THREE.Sprite {
  const [l1, l2 = ''] = texto.split('\n');
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 168;
  const g = cv.getContext('2d')!;
  g.fillStyle = 'rgba(255,255,255,0.93)'; g.strokeStyle = 'rgba(15,23,42,0.18)'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(4, 4, 632, 160, 28); g.fill(); g.stroke();
  g.fillStyle = '#0f172a'; g.font = '700 56px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(l1, 320, l2 ? 58 : 84);
  if (l2) { g.fillStyle = '#0369a1'; g.font = '700 46px Inter, system-ui, sans-serif'; g.fillText(l2, 320, 120); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, toneMapped: false }));
  sp.scale.set(1.9, 0.5, 1); sp.renderOrder = 6; return sp;
}

export interface Tunel { grupo: THREE.Group; actualizar: (t: number, ancho: number, alto: number) => void; liberar: () => void }

/** Construye el túnel para todos los coches: líneas de humo fijas y partículas que corren por ellas. */
export function crearTunel(cuerpos: CuerpoTunel[]): Tunel {
  const grupo = new THREE.Group(); grupo.name = 'tunel-de-viento';
  const matLinea = new LineMaterial({ linewidth: 2.2, vertexColors: true, transparent: true, opacity: 0.9, worldUnits: false, depthWrite: false });
  const textura = puntoRedondo();
  const matPunto = new THREE.PointsMaterial({ size: 0.24, sizeAttenuation: true, map: textura, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.95 });
  const matPeine = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.7 });
  const PUNTOS = 9;
  const todas: { L: Linea; geo: THREE.BufferGeometry; base: number }[] = [];
  const carteles: THREE.Sprite[] = [];
  const geos: THREE.BufferGeometry[] = [];

  for (const c of cuerpos) {
    if (c.envolvente.length < 3) continue;
    const g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.rotation.y = c.giro; grupo.add(g);
    const { lineas, x0, techo, bM, cM, xMedio } = lineasDe(c);
    if (c.etiqueta) { const e = cartel(c.etiqueta); e.position.set(xMedio, techo + 0.55, 0); g.add(e); carteles.push(e); }
    for (const L of lineas) {
      const pos: number[] = [];
      for (let i = 0; i < L.px.length; i++) pos.push(L.px[i], L.py[i], L.pz[i]);
      const lg = new LineGeometry(); lg.setPositions(pos); lg.setColors(Array.from(L.col));
      const ln = new Line2(lg, matLinea); ln.computeLineDistances(); ln.renderOrder = 2; g.add(ln); geos.push(lg);
    }
    // Partículas: PUNTOS por línea, con el color de la línea un poco aclarado.
    const nP = lineas.length * PUNTOS, pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nP * 3), 3));
    const colP = new Float32Array(nP * 3); pg.setAttribute('color', new THREE.BufferAttribute(colP, 3));
    const pts = new THREE.Points(pg, matPunto); pts.frustumCulled = false; pts.renderOrder = 3; g.add(pts); geos.push(pg);
    lineas.forEach((L, k) => todas.push({ L, geo: pg, base: k * PUNTOS }));
    // Los peines de humo, delante del coche: uno vertical y dos horizontales.
    const barra = (a: THREE.Vector3, b: THREE.Vector3) => {
      const d = b.clone().sub(a), cg = new THREE.CylinderGeometry(0.012, 0.012, d.length(), 10);
      const o = new THREE.Mesh(cg, matPeine); o.position.copy(a).add(b).multiplyScalar(0.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(o); geos.push(cg);
    };
    const xp = x0 + 0.02;
    barra(new THREE.Vector3(xp, 0, 0), new THREE.Vector3(xp, techo + 0.6, 0));
    barra(new THREE.Vector3(xp, cM, -(bM + 0.8)), new THREE.Vector3(xp, cM, bM + 0.8));
    barra(new THREE.Vector3(xp, 0.22, -(bM + 0.5)), new THREE.Vector3(xp, 0.22, bM + 0.5));
  }

  const VEL = 1.6; // m/s de «cámara lenta»: lo justo para seguir una partícula con la vista
  const actualizar = (t: number, ancho: number, alto: number) => {
    matLinea.resolution.set(ancho, alto);
    const tocadas = new Set<THREE.BufferGeometry>();
    for (const { L, geo, base } of todas) {
      const P = geo.attributes.position as THREE.BufferAttribute, C = geo.attributes.color as THREE.BufferAttribute;
      const n = L.px.length;
      for (let k = 0; k < PUNTOS; k++) {
        const tau = ((t * VEL / 1.0) + (k / PUNTOS) * L.T + base * 0.137) % L.T;
        // búsqueda binaria del tramo
        let lo = 0, hi = n - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L.t[m] < tau) lo = m; else hi = m; }
        const f = L.t[hi] > L.t[lo] ? (tau - L.t[lo]) / (L.t[hi] - L.t[lo]) : 0;
        let x = L.px[lo] + (L.px[hi] - L.px[lo]) * f, y = L.py[lo] + (L.py[hi] - L.py[lo]) * f, z = L.pz[lo] + (L.pz[hi] - L.pz[lo]) * f;
        // En la estela el humo se revuelve.
        const e = L.estela[lo];
        if (e > 0.01) {
          const ph = base * 1.37 + k * 2.1;
          y += e * 0.16 * Math.sin(t * 6.3 + ph + x * 3.1); z += e * 0.16 * Math.cos(t * 5.1 + ph * 1.3 + x * 2.3); x += e * 0.06 * Math.sin(t * 4.2 + ph);
          y = Math.max(0.02, y);
        }
        const q = base + k;
        P.setXYZ(q, x, y, z);
        C.setXYZ(q, L.col[lo * 3] * 0.3 + 0.7, L.col[lo * 3 + 1] * 0.3 + 0.7, L.col[lo * 3 + 2] * 0.3 + 0.7);
      }
      tocadas.add(geo);
    }
    for (const g of tocadas) { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; }
  };
  const liberar = () => {
    for (const g of geos) g.dispose(); matLinea.dispose(); matPunto.dispose(); matPeine.dispose(); textura.dispose();
    for (const e of carteles) { e.material.map?.dispose(); e.material.dispose(); }
  };
  return { grupo, actualizar, liberar };
}
