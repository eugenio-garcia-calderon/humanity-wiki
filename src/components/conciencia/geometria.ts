// Geometry for the consciousness map: how big each concept is, where its text
// wraps, where an arrow touches it and what path the arrow draws.
//
// Pure functions, no React: the same numbers are used to draw on screen, to
// hit-test, and to export the picture as SVG/PNG, so they cannot drift apart.
import type { Nodo, Flecha } from '../../data/concienciaMapa';

export interface Punto { x: number; y: number }

export interface Medida {
  /** How an arrow meets the node. */
  borde: 'rect' | 'circulo' | 'elipse';
  w: number;
  h: number;
  r: number;          // circulo
  rx: number; ry: number; // elipse
  titulo: string[];
  sub: string[];
  texto: string[];
  filas: string[][];  // chips, already wrapped into rows
  fT: number;         // title font size
  fS: number;         // subtitle font size
  fX: number;         // body text font size
}

/** Average glyph width in em for Josefin Sans; a little generous so text never overflows. */
const EM = 0.53;
/** Same for Cinzel, the title face: wide capitals. */
const EM_TITULO = 0.68;
export const FUENTE = '"Josefin Sans", ui-sans-serif, system-ui, sans-serif';
export const FUENTE_TITULO = '"Cinzel", Georgia, serif';

export function partir(texto: string | undefined, fuente: number, ancho: number, maxLineas = 6, em = EM): string[] {
  if (!texto) return [];
  const cabe = Math.max(4, Math.floor(ancho / (fuente * em)));
  const lineas: string[] = [];
  for (const parrafo of texto.split('\n')) {
    let linea = '';
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = linea ? `${linea} ${palabra}` : palabra;
      if (prueba.length <= cabe) { linea = prueba; continue; }
      if (linea) lineas.push(linea);
      linea = palabra.length > cabe ? palabra.slice(0, cabe - 1) + '…' : palabra;
    }
    if (linea) lineas.push(linea);
  }
  if (lineas.length > maxLineas) {
    const corto = lineas.slice(0, maxLineas);
    corto[maxLineas - 1] = corto[maxLineas - 1].replace(/\s*\S*$/, '') + '…';
    return corto;
  }
  return lineas;
}

function filasDeEtiquetas(crudas: string[] | undefined, fuente: number, ancho: number): string[][] {
  const etiquetas = (crudas ?? []).map(e => e.trim()).filter(Boolean);
  if (!etiquetas.length) return [];
  const filas: string[][] = [];
  let fila: string[] = [];
  let usado = 0;
  for (const e of etiquetas) {
    const w = anchoEtiqueta(e, fuente);
    if (fila.length && usado + w > ancho) { filas.push(fila); fila = []; usado = 0; }
    fila.push(e);
    usado += w + 6;
  }
  if (fila.length) filas.push(fila);
  return filas;
}

export const anchoEtiqueta = (e: string, fuente: number) => e.length * fuente * 0.5 + 18;
export const ALTO_ETIQUETA = 24;

const vacia = (): Medida => ({ borde: 'rect', w: 0, h: 0, r: 0, rx: 0, ry: 0, titulo: [], sub: [], texto: [], filas: [], fT: 16, fS: 12, fX: 13 });

export function medir(n: Nodo): Medida {
  const k = Math.min(2.2, Math.max(0.5, n.tam ?? 1));
  const m = vacia();
  switch (n.forma) {
    case 'matriz': {
      m.borde = 'elipse';
      m.rx = (n.ancho ?? 560) * k; m.ry = (n.alto ?? 118) * k; m.w = m.rx * 2; m.h = m.ry * 2;
      // Name inside (default) or under/over the shape (`etiquetaPos`), where it
      // has the room of the whole canvas rather than the width of the ellipse.
      const fuera = n.etiquetaPos === 'abajo' || n.etiquetaPos === 'arriba';
      m.fT = (fuera ? 26 : 30) * k; m.fS = (fuera ? 15 : 16) * k;
      const ancho = fuera ? Math.max(m.rx * 2.4, 520 * k) : m.rx * 1.3;
      m.titulo = partir(n.titulo, m.fT, ancho, 2, EM_TITULO);
      m.sub = partir(n.subtitulo, m.fS, ancho, 2);
      return m;
    }
    case 'franja': {
      m.w = (n.ancho ?? 1000) * k; m.h = (n.alto ?? 220) * k;
      m.fT = 17 * k; m.fS = 12.5 * k;
      m.titulo = partir((n.titulo || '').toUpperCase(), m.fT, 360 * k, 1, 0.85);
      m.sub = partir(n.subtitulo, m.fS, 360 * k, 2);
      return m;
    }
    case 'campo': {
      m.borde = 'circulo'; m.r = 80 * k; m.w = m.h = m.r * 2;
      m.fT = 22 * k; m.fS = 13 * k;
      const ancho = (n.etiquetaPos === 'izquierda' || n.etiquetaPos === 'derecha') ? 250 * k : 230 * k;
      // The being is not titled on the map: its figure already says it is a
      // person (Eugenio, 2026-11-11). The name still heads its panel.
      m.titulo = [];
      m.sub = partir(n.subtitulo, m.fS, ancho, 3);
      return m;
    }
    case 'estado': {
      m.w = 320 * k; m.fT = 21 * k; m.fS = 13.5 * k;
      const ancho = m.w - 116 * k;
      m.titulo = partir(n.titulo, m.fT, ancho, 2, EM_TITULO);
      m.sub = partir(n.subtitulo, m.fS, ancho, 3);
      m.h = Math.max(98 * k, 30 * k + m.titulo.length * m.fT * 1.12 + m.sub.length * m.fS * 1.3);
      return m;
    }
    case 'nivel': {
      m.w = 280 * k; m.fT = 16 * k; m.fS = 12 * k;
      m.titulo = partir(n.titulo, m.fT, m.w - 40 * k, 2);
      m.sub = partir(n.subtitulo, m.fS, m.w - 40 * k, 2);
      m.h = Math.max(50 * k, 22 * k + m.titulo.length * m.fT * 1.2 + m.sub.length * m.fS * 1.3);
      return m;
    }
    case 'capacidad': {
      m.w = 236 * k; m.fT = 17 * k; m.fS = 12 * k;
      const ancho = m.w - (n.icono && n.icono !== 'ninguno' ? 66 : 28) * k;
      m.titulo = partir(n.titulo, m.fT, ancho, 2);
      m.sub = partir(n.subtitulo, m.fS, ancho, 3);
      m.h = Math.max(60 * k, 26 * k + m.titulo.length * m.fT * 1.2 + m.sub.length * m.fS * 1.3);
      return m;
    }
    case 'canal': {
      m.w = 350 * k; m.fT = 19 * k; m.fS = 13 * k; m.fX = 12 * k;
      const ancho = m.w - 36 * k;
      m.titulo = partir(n.titulo, m.fT, ancho, 2, EM_TITULO);
      m.sub = partir(n.subtitulo, m.fS, ancho, 2);
      m.filas = filasDeEtiquetas(n.etiquetas, m.fX, ancho);
      m.h = 28 * k + m.titulo.length * m.fT * 1.2 + m.sub.length * m.fS * 1.35
        + (m.filas.length ? 10 * k + m.filas.length * (ALTO_ETIQUETA + 6) * k : 0);
      return m;
    }
    case 'nota': {
      m.w = 320 * k; m.fT = 16 * k; m.fX = 13 * k;
      const ancho = m.w - 32 * k;
      m.titulo = partir(n.titulo, m.fT, ancho, 2);
      m.texto = partir(n.explicacion, m.fX, ancho, 9);
      m.h = 30 * k + m.titulo.length * m.fT * 1.25 + m.texto.length * m.fX * 1.4;
      return m;
    }
    case 'estudio': {
      m.w = 250 * k; m.fT = 14 * k; m.fS = 11 * k;
      m.titulo = partir(n.titulo, m.fT, m.w - 62 * k, 2);
      m.sub = [n.estudio ? 'Ver el estudio ↓' : 'Estudio'];
      m.h = Math.max(56 * k, 24 * k + m.titulo.length * m.fT * 1.25 + m.fS * 1.4);
      return m;
    }
    case 'consejos': {
      // A folded chip: one line, the icon, a «+». It opens in a window.
      m.fT = 14.5 * k;
      m.titulo = partir(n.titulo, m.fT, 300 * k, 1);
      m.w = Math.max(200 * k, (m.titulo[0]?.length ?? 10) * m.fT * EM + 92 * k);
      m.h = 38 * k;
      return m;
    }
    case 'titulo':
    default: {
      m.fT = 17 * k;
      m.titulo = [n.titulo];
      m.w = Math.max(80, n.titulo.length * m.fT * 0.82 + 20);
      m.h = m.fT * 2;
      return m;
    }
  }
}

// ── Where an arrow meets a node ─────────────────────────────────────────────

function hastaRect(c: Punto, w: number, h: number, hacia: Punto): Punto {
  const dx = hacia.x - c.x, dy = hacia.y - c.y;
  if (!dx && !dy) return c;
  const sx = dx ? (w / 2) / Math.abs(dx) : Infinity;
  const sy = dy ? (h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/**
 * The point on the node's edge an arrow should touch when it comes from (or
 * goes to) `hacia`. The matrix is special: it is a wide band, so arrows meet
 * it straight above or below the other concept instead of all converging on
 * its centre — that is what keeps the drawing readable.
 */
export function ancla(n: Nodo, m: Medida, hacia: Punto, margen = 6): Punto {
  const c = { x: n.x, y: n.y };
  if (m.borde === 'circulo') {
    const dx = hacia.x - c.x, dy = hacia.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const r = m.r * 1.12 + margen;
    return { x: c.x + dx / d * r, y: c.y + dy / d * r };
  }
  if (m.borde === 'elipse') {
    const rx = m.rx + margen, ry = m.ry + margen;
    if (m.ry > m.rx) {
      // A tall ellipse (a column): arrows meet it straight to the left or right.
      if (Math.abs(hacia.x - c.x) > m.rx * 0.9) {
        const y = Math.min(c.y + m.ry * 0.84, Math.max(c.y - m.ry * 0.84, hacia.y));
        const t = (y - c.y) / ry;
        const off = rx * Math.sqrt(Math.max(0, 1 - t * t));
        return { x: c.x + (hacia.x < c.x ? -off : off), y };
      }
    } else if (Math.abs(hacia.y - c.y) > m.ry * 0.9) {
      const x = Math.min(c.x + m.rx * 0.84, Math.max(c.x - m.rx * 0.84, hacia.x));
      const t = (x - c.x) / rx;
      const off = ry * Math.sqrt(Math.max(0, 1 - t * t));
      return { x, y: c.y + (hacia.y < c.y ? -off : off) };
    }
    const ang = Math.atan2((hacia.y - c.y) / ry, (hacia.x - c.x) / rx);
    return { x: c.x + Math.cos(ang) * rx, y: c.y + Math.sin(ang) * ry };
  }
  return hastaRect(c, m.w + margen * 2, m.h + margen * 2, hacia);
}

// ── The path an arrow draws ─────────────────────────────────────────────────

const bez = (p0: Punto, c: Punto, p1: Punto, t: number): Punto => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * c.x + t * t * p1.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * c.y + t * t * p1.y,
});
const tangente = (p0: Punto, c: Punto, p1: Punto, t: number): Punto => {
  const x = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p1.x - c.x);
  const y = 2 * (1 - t) * (c.y - p0.y) + 2 * t * (p1.y - c.y);
  const d = Math.hypot(x, y) || 1;
  return { x: x / d, y: y / d };
};

export interface Trazado {
  d: string;          // the line itself, trimmed so it does not poke through the heads
  dBase: string;      // the untrimmed smooth curve (for the hit area and the glow)
  medio: Punto;
  puntas: { punta: Punto; dir: Punto }[];
  largo: number;
}

export function trazar(f: Flecha, a: Nodo, ma: Medida, b: Nodo, mb: Medida): Trazado | null {
  if (a.id === b.id) return null;
  const curva = Math.max(-0.7, Math.min(0.7, f.curva ?? 0));
  // Ellipses first: they decide WHERE on the band the arrow lands.
  let objA: Punto = { x: a.x, y: a.y }, objB: Punto = { x: b.x, y: b.y };
  if (mb.borde === 'elipse') objB = ancla(b, mb, objA, 4);
  if (ma.borde === 'elipse') objA = ancla(a, ma, objB, 4);
  const perp = (p: Punto, q: Punto) => {
    const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
    return { x: -dy / d, y: dx / d, d };
  };
  let n = perp(objA, objB);
  let ctrl = { x: (objA.x + objB.x) / 2 + n.x * curva * n.d, y: (objA.y + objB.y) / 2 + n.y * curva * n.d };
  const p0 = ma.borde === 'elipse' ? objA : ancla(a, ma, curva ? ctrl : objB);
  const p1 = mb.borde === 'elipse' ? objB : ancla(b, mb, curva ? ctrl : objA);
  n = perp(p0, p1);
  ctrl = { x: (p0.x + p1.x) / 2 + n.x * curva * n.d, y: (p0.y + p1.y) / 2 + n.y * curva * n.d };

  const largo = n.d * (1 + Math.abs(curva) * 0.6);
  const g = f.grosor ?? 2;
  const L = 11 + g * 2.2;
  const haciaB = f.direccion === 'ida' || f.direccion === 'doble';
  const haciaA = f.direccion === 'vuelta' || f.direccion === 'doble';
  const t0 = haciaA ? Math.min(0.45, L * 0.8 / largo) : 0;
  const t1 = haciaB ? Math.max(0.55, 1 - L * 0.8 / largo) : 1;

  const pasos = Math.max(16, Math.min(160, Math.round(largo / 6)));
  const pts: Punto[] = [];
  const onda = f.estilo === 'onda';
  const amp = 5 + g * 1.5, lambda = 28;
  for (let i = 0; i <= pasos; i++) {
    const t = t0 + (t1 - t0) * (i / pasos);
    const p = bez(p0, ctrl, p1, t);
    if (onda) {
      const tg = tangente(p0, ctrl, p1, t);
      const s = t * largo;
      const envolvente = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1))));
      const o = Math.sin((s / lambda) * Math.PI * 2) * amp * Math.min(1, envolvente * 2.5);
      pts.push({ x: p.x - tg.y * o, y: p.y + tg.x * o });
    } else pts.push(p);
  }
  const d = 'M' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
  const dBase = `M${p0.x.toFixed(1)},${p0.y.toFixed(1)} Q${ctrl.x.toFixed(1)},${ctrl.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  const puntas: Trazado['puntas'] = [];
  if (haciaB) puntas.push({ punta: p1, dir: tangente(p0, ctrl, p1, 1) });
  if (haciaA) { const t = tangente(p0, ctrl, p1, 0); puntas.push({ punta: p0, dir: { x: -t.x, y: -t.y } }); }
  return { d, dBase, medio: bez(p0, ctrl, p1, 0.5), puntas, largo };
}

export function puntaDeFlecha(punta: Punto, dir: Punto, grosor: number): string {
  const L = 11 + grosor * 2.2, w = L * 0.5;
  const base = { x: punta.x - dir.x * L, y: punta.y - dir.y * L };
  const muesca = { x: punta.x - dir.x * L * 0.72, y: punta.y - dir.y * L * 0.72 };
  const px = -dir.y, py = dir.x;
  return [
    `${punta.x.toFixed(1)},${punta.y.toFixed(1)}`,
    `${(base.x + px * w).toFixed(1)},${(base.y + py * w).toFixed(1)}`,
    `${muesca.x.toFixed(1)},${muesca.y.toFixed(1)}`,
    `${(base.x - px * w).toFixed(1)},${(base.y - py * w).toFixed(1)}`,
  ].join(' ');
}

/** The rectangle that holds every concept, glow and name included: what «Ajustar» and the exports frame. */
export function limites(nodos: Nodo[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const n of nodos) {
    const m = medir(n);
    let w2: number, h2: number;
    if (m.borde === 'circulo') { w2 = h2 = m.r * 1.5; }
    else if (m.borde === 'elipse') { w2 = m.rx * 1.12; h2 = m.ry * (m.ry > m.rx ? 1.05 : 1.5); }
    else { w2 = m.w / 2 + 10; h2 = m.h / 2 + 10; }
    let izq = n.x - w2, der = n.x + w2, arr = n.y - h2, aba = n.y + h2;
    if (n.forma === 'matriz' && (n.etiquetaPos === 'abajo' || n.etiquetaPos === 'arriba')) {
      const texto = 34 + m.titulo.length * m.fT * 1.15 + m.sub.length * m.fS * 1.3;
      if (n.etiquetaPos === 'abajo') aba = n.y + m.ry + texto; else arr = n.y - m.ry - texto;
      const mitad = Math.max(...m.titulo.map(l => l.length * m.fT * 0.7), 0) / 2;
      izq = Math.min(izq, n.x - mitad); der = Math.max(der, n.x + mitad);
    }
    if (n.forma === 'campo') {
      const pos = n.etiquetaPos ?? 'abajo';
      const texto = m.titulo.length * m.fT * 1.2 + m.sub.length * m.fS * 1.3;
      if (pos === 'derecha') der = n.x + m.r * 1.42 + 260 * (n.tam ?? 1);
      if (pos === 'izquierda') izq = n.x - m.r * 1.42 - 260 * (n.tam ?? 1);
      if (pos === 'abajo') aba = n.y + m.r * 1.38 + texto + 10;
      if (pos === 'arriba') arr = n.y - m.r * 1.38 - texto - 10;
    }
    x0 = Math.min(x0, izq); x1 = Math.max(x1, der); y0 = Math.min(y0, arr); y1 = Math.max(y1, aba);
  }
  if (!Number.isFinite(x0)) return { x0: 0, y0: 0, x1: 1600, y1: 1560 };
  return { x0, y0, x1, y1 };
}

/** Only colours written as #rrggbb reach an SVG attribute; anything else falls back. */
export const colorSeguro = (c: string | undefined, porDefecto = '#c9d4e8') =>
  typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : porDefecto;

/** Deterministic pseudo-random numbers, so the starfield is the same on every visit and in exports. */
export function aleatorio(semilla: number) {
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
