import * as THREE from 'three';

/**
 * Herramientas de forma para los coches del garaje dibujados por código
 * (Aptera, XL1…): un cuerpo se describe con estaciones a lo largo de X, cada
 * una con su sección superelíptica, y de ahí salen la malla, la silueta para
 * el túnel de viento y el área frontal. Las tres salen de las mismas
 * estaciones, así que no se pueden contradecir.
 *
 * Ejes del garaje: X hacia delante, Y arriba, Z lateral. Metros.
 */

/**
 * Una estación: sección en x entre el suelo `yb` y el techo `yt`. La media
 * anchura varía con la altura: `wb` abajo, `wm` en medio, `wt` arriba
 * (parábola por los tres). `n` es el exponente: 2 elipse, más alto, más cuadrada.
 */
export interface Est { x: number; yb: number; yt: number; wb: number; wm: number; wt: number; n?: number }
export const E = (x: number, yb: number, yt: number, wb: number, wm: number, wt: number, n = 2.6): Est => ({ x, yb, yt, wb, wm, wt, n });

/** Catmull-Rom uniforme de un número entre cuatro valores. */
function cr(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

const CLAVES: (keyof Est)[] = ['x', 'yb', 'yt', 'wb', 'wm', 'wt', 'n'];

/** Estaciones intermedias suaves (Catmull-Rom) entre las dadas, ordenadas como vienen. */
export function muestrear(es: Est[], sub = 8): Est[] {
  const out: Est[] = [];
  for (let i = 0; i < es.length - 1; i++) {
    const a = es[Math.max(0, i - 1)], b = es[i], c = es[i + 1], d = es[Math.min(es.length - 1, i + 2)];
    const ultimo = i === es.length - 2;
    for (let k = 0; k < (ultimo ? sub + 1 : sub); k++) {
      const t = k / sub, e: Record<string, number> = {};
      for (const key of CLAVES) e[key] = cr((a[key] ?? 2.6) as number, (b[key] ?? 2.6) as number, (c[key] ?? 2.6) as number, (d[key] ?? 2.6) as number, t);
      e.wb = Math.max(0, e.wb); e.wm = Math.max(0, e.wm); e.wt = Math.max(0, e.wt);
      out.push(e as unknown as Est);
    }
  }
  return out;
}

const anchoEn = (e: Est, t: number) => Math.max(0, e.wb * (1 - t) * (1 - 2 * t) + 4 * e.wm * t * (1 - t) + e.wt * t * (2 * t - 1));

/** Puntos (y, z) de la sección, N alrededor (θ = 0 a un lado, π/2 arriba). */
export function anillo(e: Est, N: number): [number, number][] {
  const n = e.n ?? 2.6, yc = (e.yb + e.yt) / 2, h = (e.yt - e.yb) / 2, out: [number, number][] = [];
  for (let j = 0; j < N; j++) {
    const th = (j / N) * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    const y = yc + h * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    const t = e.yt > e.yb ? (y - e.yb) / (e.yt - e.yb) : 0.5;
    out.push([y, anchoEn(e, t) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)]);
  }
  return out;
}

/** Media anchura de la sección a la altura y (0 fuera de ella). */
export function semiAncho(e: Est, y: number): number {
  if (y <= e.yb || y >= e.yt) return 0;
  const n = e.n ?? 2.6, yc = (e.yb + e.yt) / 2, h = (e.yt - e.yb) / 2;
  const s = Math.min(1, Math.pow(Math.abs(y - yc) / h, n / 2));
  return anchoEn(e, (y - e.yb) / (e.yt - e.yb)) * Math.pow(Math.max(0, 1 - s * s), 1 / n);
}

/**
 * Malla suave por las estaciones, con tapas. `clase(x, y, z)` reparte cada
 * cuadrilátero en un grupo de material (0, 1, 2…): así cristal, techo solar y
 * carrocería son la misma superficie, sin escalones entre ellos.
 */
export function loft(es: Est[], opciones: { N?: number; sub?: number; tapas?: boolean; clase?: (x: number, y: number, z: number) => number; nClases?: number } = {}): THREE.BufferGeometry {
  const { N = 96, sub = 10, tapas = true, clase, nClases = 1 } = opciones;
  const m = muestrear(es, sub), M = m.length;
  const pos: number[] = [];
  for (const e of m) for (const [y, z] of anillo(e, N)) pos.push(e.x, y, z);
  const grupos: number[][] = Array.from({ length: Math.max(1, nClases) }, () => []);
  const cl = (a: number, b: number, c: number, d: number) => {
    if (!clase) return 0;
    let x = 0, y = 0, z = 0;
    for (const k of [a, b, c, d]) { x += pos[k * 3]; y += pos[k * 3 + 1]; z += pos[k * 3 + 2]; }
    return Math.min(nClases - 1, Math.max(0, clase(x / 4, y / 4, z / 4)));
  };
  for (let i = 0; i < M - 1; i++) for (let j = 0; j < N; j++) {
    const a = i * N + j, b = i * N + (j + 1) % N, c = (i + 1) * N + j, d = (i + 1) * N + (j + 1) % N;
    // las estaciones van de delante a atrás (x decreciente): este orden deja las normales hacia fuera
    grupos[cl(a, b, c, d)].push(a, b, c, b, d, c);
  }
  if (tapas) {
    for (const [ring, fin] of [[0, false], [M - 1, true]] as [number, boolean][]) {
      const e = m[ring], s = pos.length / 3;
      pos.push(e.x, (e.yb + e.yt) / 2, 0);
      for (let j = 0; j < N; j++) {
        const a = ring * N + j, b = ring * N + (j + 1) % N;
        if (fin) grupos[0].push(s, a, b); else grupos[0].push(s, b, a);
      }
    }
  }
  const idx: number[] = [], g = new THREE.BufferGeometry();
  let inicio = 0;
  // (sin `push(...lista)`: con cien mil índices desborda la pila)
  grupos.forEach((lista, k) => { for (const v of lista) idx.push(v); g.addGroup(inicio, lista.length, k); inicio += lista.length; });
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** Silueta para el túnel de viento: [x, suelo, techo, media anchura máxima] cada `paso` metros. */
export function envolventeDe(es: Est[], paso = 0.05): [number, number, number, number][] {
  const m = muestrear(es, 24), out: [number, number, number, number][] = [];
  const xs = m.map(e => e.x), x0 = Math.max(...xs), x1 = Math.min(...xs);
  for (let x = x0; x >= x1 - 1e-9; x -= paso) {
    let k = 0; while (k < m.length - 2 && !((m[k].x - x) * (m[k + 1].x - x) <= 0)) k++;
    const a = m[k], b = m[k + 1], t = b.x !== a.x ? (x - a.x) / (b.x - a.x) : 0;
    const L = (p: number, q: number) => p + (q - p) * t;
    const e: Est = { x, yb: L(a.yb, b.yb), yt: L(a.yt, b.yt), wb: L(a.wb, b.wb), wm: L(a.wm, b.wm), wt: L(a.wt, b.wt), n: L(a.n ?? 2.6, b.n ?? 2.6) };
    let hw = 0; for (let j = 0; j <= 20; j++) hw = Math.max(hw, semiAncho(e, e.yb + (e.yt - e.yb) * (j / 20)));
    out.push([Math.round(x * 1000) / 1000, Math.round(e.yb * 1000) / 1000, Math.round(e.yt * 1000) / 1000, Math.round(hw * 1000) / 1000]);
  }
  return out;
}

/** Un trozo de la vista de frente: un cuerpo de estaciones desplazado a z0, o un rectángulo. */
export type PiezaFrontal = { es: Est[]; z0: number } | { rect: [number, number, number, number] /* z0, z1, y0, y1 */ };

/**
 * Área frontal (m²) de la unión de varias piezas vistas de frente, por filas
 * de 5 mm: en cada fila se juntan los tramos de todas las piezas y se suman.
 */
export function areaFrontal(piezas: PiezaFrontal[]): number {
  const secs = piezas.map(p => ('es' in p ? { m: muestrear(p.es, 12), z0: p.z0 } : null));
  let alto = 0;
  piezas.forEach((p, i) => { if ('rect' in p) alto = Math.max(alto, p.rect[3]); else alto = Math.max(alto, ...secs[i]!.m.map(e => e.yt)); });
  const dy = 0.005; let A = 0;
  for (let y = dy / 2; y < alto; y += dy) {
    const tramos: [number, number][] = [];
    piezas.forEach((p, i) => {
      if ('rect' in p) { const [z0, z1, y0, y1] = p.rect; if (y >= y0 && y <= y1) tramos.push([Math.min(z0, z1), Math.max(z0, z1)]); return; }
      let w = 0; for (const e of secs[i]!.m) w = Math.max(w, semiAncho(e, y));
      if (w > 0) tramos.push([secs[i]!.z0 - w, secs[i]!.z0 + w]);
    });
    tramos.sort((a, b) => a[0] - b[0]);
    let fin = -Infinity, suma = 0;
    for (const [a, b] of tramos) { if (b <= fin) continue; suma += b - Math.max(a, fin); fin = b; }
    A += suma * dy;
  }
  return A;
}

/** Punto (y, z) de la sección para un ángulo de parámetro θ (0 a un lado, π/2 arriba, π al otro). */
export function puntoSeccion(e: Est, th: number): [number, number] {
  const n = e.n ?? 2.6, yc = (e.yb + e.yt) / 2, h = (e.yt - e.yb) / 2, c = Math.cos(th), s = Math.sin(th);
  const y = yc + h * Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
  const t = e.yt > e.yb ? (y - e.yb) / (e.yt - e.yb) : 0.5;
  return [y, anchoEn(e, t) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n)];
}

/** Ángulo θ (entre −π/2 y π/2, del lado z > 0) en el que la sección llega a la altura y. */
export function thetaEnAltura(e: Est, y: number): number {
  const n = e.n ?? 2.6, yc = (e.yb + e.yt) / 2, h = Math.max(1e-6, (e.yt - e.yb) / 2);
  const u = Math.max(-1, Math.min(1, (y - yc) / h));
  return Math.sign(u) * Math.asin(Math.pow(Math.abs(u), n / 2));
}

/** Estación interpolada (lineal entre las muestras finas) en x. */
function estacionEn(m: Est[], x: number): Est {
  let k = 0; while (k < m.length - 2 && !((m[k].x - x) * (m[k + 1].x - x) <= 0)) k++;
  const a = m[k], b = m[k + 1], t = b.x !== a.x ? Math.max(0, Math.min(1, (x - a.x) / (b.x - a.x))) : 0;
  const L = (p: number, q: number) => p + (q - p) * t;
  return { x, yb: L(a.yb, b.yb), yt: L(a.yt, b.yt), wb: L(a.wb, b.wb), wm: L(a.wm, b.wm), wt: L(a.wt, b.wt), n: L(a.n ?? 2.6, b.n ?? 2.6) };
}

/** Media anchura de la piel en (x, y): dónde está la superficie del lado z > 0 a esa altura (0 fuera del cuerpo). */
export function semiAnchoEn(es: Est[], x: number, y: number): number {
  return semiAncho(estacionEn(muestrear(es, 24), x), y);
}

/**
 * Una cinta pegada a la piel del lado z > 0 que sigue una curva vista de lado
 * (puntos [x, y]): juntas de puertas, tiras de luz que bajan por un borde.
 * Cada punto se lleva a la piel a su altura y la cinta tiene `ancho` medido en
 * la vista lateral, perpendicular a la curva. Para el otro lado, escalar z por −1.
 */
export function cinta(es: Est[], curva: [number, number][], ancho: number, opciones: { delta?: number; pasos?: number } = {}): THREE.BufferGeometry {
  const { delta = 0.003, pasos = 48 } = opciones;
  const m = muestrear(es, 24), pos: number[] = [], idx: number[] = [];
  // la curva, suavizada (Catmull-Rom) y muestreada en `pasos` tramos
  const P = (i: number) => curva[Math.max(0, Math.min(curva.length - 1, i))];
  const pts: [number, number][] = [];
  for (let k = 0; k <= pasos; k++) {
    const u = (k / pasos) * (curva.length - 1), i = Math.min(curva.length - 2, Math.floor(u)), t = u - i;
    const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2);
    pts.push([cr(a[0], b[0], c[0], d[0], t), cr(a[1], b[1], c[1], d[1], t)]);
  }
  const enPiel = (x: number, y: number) => {
    const e = estacionEn(m, x), th = thetaEnAltura(e, y);
    const [py, pz] = puntoSeccion(e, th), [y1, z1] = puntoSeccion(e, th - 0.01), [y2, z2] = puntoSeccion(e, th + 0.01);
    let ny = -(z2 - z1), nz = y2 - y1; const l = Math.hypot(ny, nz) || 1; ny /= l; nz /= l;
    pos.push(x, py + ny * delta, pz + nz * delta);
  };
  pts.forEach(([x, y], k) => {
    const [xa, ya] = pts[Math.max(0, k - 1)], [xb, yb] = pts[Math.min(pts.length - 1, k + 1)];
    let tx = xb - xa, ty = yb - ya; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    enPiel(x - ty * ancho / 2, y + tx * ancho / 2);
    enPiel(x + ty * ancho / 2, y - tx * ancho / 2);
  });
  for (let k = 0; k < pts.length - 1; k++) { const a = 2 * k; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/**
 * Un parche pegado a la piel (cristal, panel solar, tira de luz), separado
 * `delta` hacia fuera. Entre x0 y x1, en cada estación cubre el tramo de
 * ángulo [θa, θb] que devuelve `rango` (o nada, si devuelve null). Como los
 * bordes salen de curvas y no de la rejilla de la carrocería, son limpios,
 * sin escalones.
 */
export function parche(es: Est[], x0: number, x1: number, rango: (e: Est) => [number, number] | null, opciones: { delta?: number; nx?: number; nth?: number } = {}): THREE.BufferGeometry {
  const { delta = 0.003, nx = 60, nth = 40 } = opciones;
  const m = muestrear(es, 24), pos: number[] = [], idx: number[] = [], uv: number[] = [];
  for (let i = 0; i <= nx; i++) {
    const x = x0 + (x1 - x0) * (i / nx), e = estacionEn(m, x), r = rango(e);
    const [a, b] = r ?? [Math.PI / 2, Math.PI / 2];
    for (let j = 0; j <= nth; j++) {
      const th = a + (b - a) * (j / nth);
      const [y, z] = puntoSeccion(e, th), [y1, z1] = puntoSeccion(e, th - 0.01), [y2, z2] = puntoSeccion(e, th + 0.01);
      let ny = -(z2 - z1), nz = y2 - y1; const l = Math.hypot(ny, nz) || 1; ny /= l; nz /= l;
      pos.push(x, y + ny * delta, z + nz * delta);
      // u a lo largo de x, v a lo ancho del parche: para texturas (las celdas solares)
      uv.push(i / nx, j / nth);
    }
  }
  for (let i = 0; i < nx; i++) for (let j = 0; j < nth; j++) {
    const a = i * (nth + 1) + j, b = a + 1, c = a + nth + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
