// ============================================================================
// ARQUITECTURA · CAD AND PLAN EXPORT (2026-11-05)
// ============================================================================
// · DXF, AutoCAD R12 (AC1009): the most widely readable flavour — AutoCAD,
//   LibreCAD, QCAD, FreeCAD, Rhino, SketchUp and Blender all open it. Units are
//   METRES ($INSUNITS = 6), one layer per element type with a fixed colour.
//   R12 has no Unicode: texts are transliterated to ASCII (Ø → D, · → -).
// · Plan (top view) of any scope: city, one village, community, family or nest,
//   re-centred on that unit and rotated so its productive side points up (+Y).
// · Front elevation: every building of the scope projected on the local X axis.
// · SVG: the same plan in colour, 1 unit = 1 m, for quick viewing or printing.
// · CSV: the dimension and programme tables.

import { dentroDe, type Mundo, type Edificio, type Unidad } from './geometria';
import { CAPA_DXF, SUELO, SISTEMA, EDIFICIO, COPAS } from './paleta';

const CAPA_DE: Record<string, string> = {
  campo: '', cesped: 'CESPED', isleta: 'CESPED', suelo: 'SUELO_FAMILIAR', agricultura: 'AGRICULTURA', parque: 'PARQUE', produccion: 'PRODUCCION',
  huerto: 'HUERTO_NIDO', camino: 'CAMINO_GENERACIONAL', gota: 'GOTA', bosque: 'BOSQUE_COMESTIBLE',
  bancalA: 'BANCALES', bancalB: 'BANCALES', bancalC: 'BANCALES', bancalD: 'BANCALES', senda: 'SENDAS', plaza: 'PLAZA',
  agua: 'AGUA', calzada: 'VIA_VEHICULOS', bici: 'CARRIL_BICI', peatonal: 'PEATONAL', marca: 'EJES', via: 'FERROCARRIL', vertipuerto: 'VERTIPUERTO',
};
const CAPA_SIS: Record<string, string> = { SA: 'SALUD', ED: 'EDUCACION', EN: 'ENERGIA', MV: 'MOVILIDAD', AL: 'ALIMENTACION', IT: 'INFORMATICA', TA: 'TALLER', SG: 'SEGURIDAD' };
const capaDe = (c: string) => c.startsWith('enlace-') ? 'ENLACES' : CAPA_DE[c] ?? 'CONTORNO';
function capaEdificio(e: Edificio) {
  if (e.sistema) return CAPA_SIS[e.sistema];
  if (e.tipo === 'nido') return 'NIDOS';
  if (e.tipo.startsWith('centro')) return 'CENTRO_SOCIAL';
  if (e.tipo === 'escaparate') return 'ESCAPARATE';
  if (e.tipo === 'fabrica') return 'FABRICA';
  return 'CONTORNO';
}

const ascii = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/Ø/g, 'D').replace(/·/g, '-').replace(/×/g, 'x').replace(/[▲▼◄►●]/g, '').replace(/[^\x20-\x7e]/g, '').trim();

/** World plan → the unit's local plan (origin at its centre, its "up" pointing to +Y). */
function transformador(u: Unidad) {
  const a = -(u.up - Math.PI / 2), c = Math.cos(a), s = Math.sin(a);
  return {
    p: (x: number, y: number): [number, number] => { const dx = x - u.cx, dy = y - u.cy; return [dx * c - dy * s, dx * s + dy * c]; },
    ang: (t: number) => t + a,
  };
}

function esquinas(e: Edificio): [number, number][] {
  if (e.forma === 'caja') {
    const c = Math.cos(e.rot), s = Math.sin(e.rot), w = e.ancho / 2, d = e.fondo / 2;
    return [[-w, -d], [w, -d], [w, d], [-w, d]].map(([x, y]) => [e.x + x * c - y * s, e.y + x * s + y * c]);
  }
  if (e.forma === 'hex') return [...Array(6).keys()].map(k => [e.x + e.ancho * Math.cos(e.rot + (k * Math.PI) / 3), e.y + e.ancho * Math.sin(e.rot + (k * Math.PI) / 3)]);
  return [...Array(48).keys()].map(k => [e.x + (e.ancho / 2) * Math.cos((k * Math.PI) / 24), e.y + (e.ancho / 2) * Math.sin((k * Math.PI) / 24)]);
}

// ---------------------------------------------------------------- DXF writer
class Dxf {
  e: string[] = [];
  minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
  ext(x: number, y: number) { if (x < this.minX) this.minX = x; if (y < this.minY) this.minY = y; if (x > this.maxX) this.maxX = x; if (y > this.maxY) this.maxY = y; }
  n(v: number) { return (Math.round(v * 1000) / 1000).toString(); }
  linea(l: string, x1: number, y1: number, x2: number, y2: number) {
    this.ext(x1, y1); this.ext(x2, y2);
    this.e.push('0', 'LINE', '8', l, '10', this.n(x1), '20', this.n(y1), '30', '0', '11', this.n(x2), '21', this.n(y2), '31', '0');
  }
  circulo(l: string, x: number, y: number, r: number) {
    this.ext(x - r, y - r); this.ext(x + r, y + r);
    this.e.push('0', 'CIRCLE', '8', l, '10', this.n(x), '20', this.n(y), '30', '0', '40', this.n(r));
  }
  arco(l: string, x: number, y: number, r: number, a0: number, a1: number) {
    this.ext(x - r, y - r); this.ext(x + r, y + r);
    const d0 = ((a0 * 180) / Math.PI % 360 + 360) % 360, d1 = ((a1 * 180) / Math.PI % 360 + 360) % 360;
    this.e.push('0', 'ARC', '8', l, '10', this.n(x), '20', this.n(y), '30', '0', '40', this.n(r), '50', this.n(d0), '51', this.n(d1));
  }
  poli(l: string, pts: [number, number][], cerrada = true) {
    this.e.push('0', 'POLYLINE', '8', l, '66', '1', '70', cerrada ? '1' : '0', '10', '0', '20', '0', '30', '0');
    for (const [x, y] of pts) { this.ext(x, y); this.e.push('0', 'VERTEX', '8', l, '10', this.n(x), '20', this.n(y), '30', '0'); }
    this.e.push('0', 'SEQEND', '8', l);
  }
  texto(l: string, x: number, y: number, h: number, t: string, rotDeg = 0) {
    const s = ascii(t); if (!s) return;
    this.ext(x, y);
    this.e.push('0', 'TEXT', '8', l, '10', this.n(x), '20', this.n(y), '30', '0', '40', this.n(h), '1', s, '50', this.n(rotDeg), '72', '1', '11', this.n(x), '21', this.n(y), '31', '0');
  }
  toString() {
    const capas = Object.entries(CAPA_DXF);
    const h = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '6',
      '9', '$EXTMIN', '10', this.n(this.minX), '20', this.n(this.minY), '30', '0', '9', '$EXTMAX', '10', this.n(this.maxX), '20', this.n(this.maxY), '30', '0', '0', 'ENDSEC',
      '0', 'SECTION', '2', 'TABLES',
      '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0', '0', 'ENDTAB',
      '0', 'TABLE', '2', 'LAYER', '70', String(capas.length)];
    for (const [nombre, color] of capas) h.push('0', 'LAYER', '2', nombre, '70', '0', '62', String(color), '6', 'CONTINUOUS');
    h.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
    return [...h, ...this.e, '0', 'ENDSEC', '0', 'EOF'].join('\r\n') + '\r\n';
  }
}

export interface OpcionesPlano { arboles: boolean; textos: boolean }

export function dxfPlanta(m: Mundo, ambito: string, op: OpcionesPlano): string {
  const u = m.unidades.get(ambito)!;
  const T = transformador(u);
  const d = new Dxf();
  for (const s of m.superficies) {
    if (!dentroDe(s.ambito, ambito) || !capaDe(s.capa)) continue;
    const pts: [number, number][] = [];
    for (let i = 0; i < s.pts.length; i += 2) pts.push(T.p(s.pts[i], s.pts[i + 1]));
    d.poli(capaDe(s.capa), pts);
  }
  for (const r of m.anillos) {
    if (!dentroDe(r.ambito, ambito)) continue;
    const l = capaDe(r.capa);
    const [cx, cy] = T.p(r.cx, r.cy);
    const lleno = r.a1 - r.a0 >= 2 * Math.PI - 1e-6;
    for (const rad of [r.r0, r.r1]) {
      if (rad <= 0) continue;
      if (lleno) d.circulo(l, cx, cy, rad); else d.arco(l, cx, cy, rad, T.ang(r.a0), T.ang(r.a1));
    }
    if (!lleno) for (const a of [r.a0, r.a1]) {
      const p0 = T.p(r.cx + r.r0 * Math.cos(a), r.cy + r.r0 * Math.sin(a)), p1 = T.p(r.cx + r.r1 * Math.cos(a), r.cy + r.r1 * Math.sin(a));
      d.linea(l, p0[0], p0[1], p1[0], p1[1]);
    }
    if (r.capa === 'calzada') {
      const rm = (r.r0 + r.r1) / 2;
      if (lleno) d.circulo('EJES', cx, cy, rm); else d.arco('EJES', cx, cy, rm, T.ang(r.a0), T.ang(r.a1));
    }
  }
  for (const c of m.discos) {
    if (!dentroDe(c.ambito, ambito) || !capaDe(c.capa)) continue;
    const [x, y] = T.p(c.cx, c.cy);
    d.circulo(capaDe(c.capa), x, y, c.r);
  }
  for (const e of m.edificios) {
    if (!dentroDe(e.ambito, ambito)) continue;
    const l = capaEdificio(e);
    if (e.forma === 'cilindro') {
      const [x, y] = T.p(e.x, e.y);
      d.circulo(l, x, y, e.ancho / 2);
      if (e.techo === 'cono') d.circulo('CENTRO_SOCIAL', x, y, e.ancho * 0.17);
    } else d.poli(l, esquinas(e).map(([x, y]) => T.p(x, y)));
    if (op.textos) { const [x, y] = T.p(e.x, e.y); d.texto('TEXTOS', x, y, Math.max(0.6, Math.min(e.ancho, e.fondo) * 0.18), e.codigo); }
  }
  for (const p of m.paneles) {
    if (!dentroDe(p.ambito, ambito)) continue;
    const c = Math.cos(p.rot), s = Math.sin(p.rot), w = p.ancho / 2, h = p.fondo / 2;
    d.poli('PANELES_SOLARES', [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => T.p(p.x + x * c - y * s, p.y + x * s + y * c)));
  }
  const tam: Record<string, [number, number]> = { coche: [4.4, 1.9], bus: [9, 2.5], bici: [1.7, 0.4], tren: [80, 3.2], aeronave: [9, 12] };
  for (const v of m.vehiculos) {
    if (!dentroDe(v.ambito, ambito)) continue;
    const [L, W] = tam[v.tipo]; const c = Math.cos(v.rot), s = Math.sin(v.rot);
    d.poli('VEHICULOS', [[-L / 2, -W / 2], [L / 2, -W / 2], [L / 2, W / 2], [-L / 2, W / 2]].map(([x, y]) => T.p(v.x + x * c - y * s, v.y + x * s + y * c)));
  }
  if (op.arboles) {
    const a = m.arboles;
    for (let i = 0, k = 0; i < a.length; i += 5, k++) {
      if (!dentroDe(m.arbolesAmbito[k], ambito)) continue;
      const [x, y] = T.p(a[i], a[i + 1]);
      d.circulo('ARBOLES', x, y, a[i + 2]);
    }
  }
  if (op.textos) for (const t of m.etiquetas) {
    if (!dentroDe(t.ambito, ambito)) continue;
    const [x, y] = T.p(t.x, t.y);
    d.texto('TEXTOS', x, y, t.tam * 0.6, t.texto);
  }
  for (const c of m.cotas) {
    if (!dentroDe(c.ambito, ambito)) continue;
    const a = T.p(c.x1, c.y1), b = T.p(c.x2, c.y2);
    d.linea('COTAS', a[0], a[1], b[0], b[1]);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = L * 0.02, nx = -(b[1] - a[1]) / L * t, ny = (b[0] - a[0]) / L * t;
    for (const q of [a, b]) d.linea('COTAS', q[0] - nx, q[1] - ny, q[0] + nx, q[1] + ny);
    d.texto('COTAS', (a[0] + b[0]) / 2 + nx * 1.5, (a[1] + b[1]) / 2 + ny * 1.5, L * 0.022, c.texto, (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
  }
  cajetin(d, `PLANTA - ${u.nombre}`);
  return d.toString();
}

/** Front elevation: looking at the unit from its "down" side towards "up". */
export function dxfAlzado(m: Mundo, ambito: string, op: OpcionesPlano): string {
  const u = m.unidades.get(ambito)!;
  const T = transformador(u);
  const d = new Dxf();
  let xmin = Infinity, xmax = -Infinity;
  for (const e of m.edificios) {
    if (!dentroDe(e.ambito, ambito)) continue;
    const xs = esquinas(e).map(([x, y]) => T.p(x, y)[0]);
    const a = Math.min(...xs), b = Math.max(...xs);
    xmin = Math.min(xmin, a); xmax = Math.max(xmax, b);
    const l = capaEdificio(e);
    if (e.forma === 'hex') {
      const hp = e.alto / e.plantas;
      for (let k = 0; k < e.plantas; k++) d.poli(l, [[a, k * hp], [b, k * hp], [b, (k + 1) * hp], [a, (k + 1) * hp]]);
      d.poli('NIDOS', [[a - 0.3, e.alto], [b + 0.3, e.alto], [b + 0.3, e.alto + 0.45], [a - 0.3, e.alto + 0.45]]);
    } else {
      d.poli(l, [[a, 0], [b, 0], [b, e.alto], [a, e.alto]]);
      if (e.forma === 'cilindro' && e.techo === 'cono') {
        const c = (a + b) / 2, w = b - a, h = w * 0.22;
        d.poli('CENTRO_SOCIAL', [[c - w * 0.56, e.alto], [c + w * 0.56, e.alto], [c + w * 0.17, e.alto + h], [c - w * 0.17, e.alto + h]]);
      }
    }
    if (op.textos) d.texto('TEXTOS', (a + b) / 2, e.alto + Math.max(1, (b - a) * 0.25) + 1, Math.max(0.5, (b - a) * 0.12), e.codigo);
  }
  if (op.arboles) {
    const a = m.arboles;
    for (let i = 0, k = 0; i < a.length; i += 5, k++) {
      if (!dentroDe(m.arbolesAmbito[k], ambito)) continue;
      const [x] = T.p(a[i], a[i + 1]);
      const r = a[i + 2], h = a[i + 3];
      d.circulo('ARBOLES', x, h * 0.55, Math.max(r, h * 0.42) * 0.9);
      d.linea('ARBOLES', x, 0, x, h * 0.55 - r * 0.8);
      xmin = Math.min(xmin, x - r); xmax = Math.max(xmax, x + r);
    }
  }
  if (!isFinite(xmin)) { xmin = -u.radio; xmax = u.radio; }
  d.linea('CONTORNO', xmin - 10, 0, xmax + 10, 0);
  cajetin(d, `ALZADO FRONTAL - ${u.nombre}`);
  return d.toString();
}

function cajetin(d: Dxf, titulo: string) {
  const w = Math.max(10, d.maxX - d.minX), x0 = d.minX;
  const h = Math.min(w * 0.012, Math.max(1.2, (d.maxY - d.minY) * 0.12));
  const y0 = d.minY - h * 4;
  d.texto('TEXTOS', x0 + w / 2, y0, h * 1.6, 'COMUNIDAD CIRCULAR HUMANA');
  d.texto('TEXTOS', x0 + w / 2, y0 - h * 2.4, h, `${titulo} - unidades: metros - humanity.wiki/arquitectura - ${new Date().toISOString().slice(0, 10)}`);
}

// ---------------------------------------------------------------- SVG (colour plan)
export function svgPlanta(m: Mundo, ambito: string, op: OpcionesPlano): string {
  const u = m.unidades.get(ambito)!;
  const T = transformador(u);
  const R = u.tipo === 'familia' ? u.radio * 1.4 : u.tipo === 'nido' ? u.radio * 1.6 : u.radio * 1.12;
  const o: string[] = [];
  const f = (v: number) => (Math.round(v * 100) / 100).toString();
  const P = (x: number, y: number) => { const [a, b] = T.p(x, y); return `${f(a)},${f(-b)}`; };
  const fill = (capa: string) => capa.startsWith('enlace-') ? SISTEMA[capa.slice(7)]?.color : SUELO[capa];
  const orden = ['campo', 'cesped', 'agricultura', 'parque', 'produccion', 'suelo', 'camino', 'huerto', 'gota', 'bosque', 'bancalA', 'bancalB', 'bancalC', 'bancalD', 'senda', 'plaza', 'agua', 'vertipuerto', 'calzada', 'bici', 'peatonal', 'isleta', 'via', 'marca'];
  const rank = (c: string) => c.startsWith('enlace-') ? 999 : orden.indexOf(c);
  type It = { r: number; svg: string };
  const items: It[] = [];
  for (const s of m.superficies) if (dentroDe(s.ambito, ambito)) {
    const pts: string[] = []; for (let i = 0; i < s.pts.length; i += 2) pts.push(P(s.pts[i], s.pts[i + 1]));
    items.push({ r: rank(s.capa), svg: `<polygon points="${pts.join(' ')}" fill="${fill(s.capa)}"/>` });
  }
  for (const c of m.discos) if (dentroDe(c.ambito, ambito) && c.capa !== 'campo') {
    const [x, y] = T.p(c.cx, c.cy);
    items.push({ r: rank(c.capa), svg: `<circle cx="${f(x)}" cy="${f(-y)}" r="${f(c.r)}" fill="${fill(c.capa)}"/>` });
  }
  for (const a of m.anillos) if (dentroDe(a.ambito, ambito)) {
    const n = Math.max(8, Math.min(720, Math.ceil((a.a1 - a.a0) * a.r1 / 3)));
    const ext: string[] = [], int: string[] = [];
    for (let i = 0; i <= n; i++) {
      const t = a.a0 + (a.a1 - a.a0) * i / n;
      ext.push(P(a.cx + a.r1 * Math.cos(t), a.cy + a.r1 * Math.sin(t)));
      int.push(P(a.cx + a.r0 * Math.cos(t), a.cy + a.r0 * Math.sin(t)));
    }
    items.push({ r: rank(a.capa), svg: `<polygon points="${[...ext, ...int.reverse()].join(' ')}" fill="${fill(a.capa)}"/>` });
  }
  items.sort((x, y) => x.r - y.r).forEach(i => o.push(i.svg));
  if (op.arboles) {
    const a = m.arboles;
    const col = COPAS;
    for (let i = 0, k = 0; i < a.length; i += 5, k++) if (dentroDe(m.arbolesAmbito[k], ambito)) {
      const [x, y] = T.p(a[i], a[i + 1]);
      o.push(`<circle cx="${f(x)}" cy="${f(-y)}" r="${f(a[i + 2])}" fill="${col[(a[i + 4] | 0) % col.length]}"/>`);
    }
  }
  for (const p of m.paneles) if (dentroDe(p.ambito, ambito)) {
    const c = Math.cos(p.rot), s = Math.sin(p.rot), w = p.ancho / 2, h = p.fondo / 2;
    o.push(`<polygon points="${[[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => P(p.x + x * c - y * s, p.y + x * s + y * c)).join(' ')}" fill="${EDIFICIO.panel}"/>`);
  }
  for (const e of m.edificios) if (dentroDe(e.ambito, ambito)) {
    const col = e.color in SISTEMA ? SISTEMA[e.color].color : e.tipo === 'nido' || e.tipo.startsWith('centro') ? EDIFICIO.teja : EDIFICIO[e.color] ?? '#ccc';
    o.push(`<polygon points="${esquinas(e).map(([x, y]) => P(x, y)).join(' ')}" fill="${col}" stroke="#333" stroke-width="${f(Math.max(0.1, e.ancho * 0.02))}"/>`);
    if (e.techo === 'cono') { const [x, y] = T.p(e.x, e.y); o.push(`<circle cx="${f(x)}" cy="${f(-y)}" r="${f(e.ancho * 0.17)}" fill="${EDIFICIO.tragaluz}"/>`); }
  }
  if (op.textos) for (const t of m.etiquetas) if (dentroDe(t.ambito, ambito)) {
    const [x, y] = T.p(t.x, t.y);
    o.push(`<text x="${f(x)}" y="${f(-y)}" font-size="${f(t.tam * 0.7)}" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="${t.color ?? '#1f2937'}">${esc(t.texto)}</text>`);
  }
  for (const c of m.cotas) if (dentroDe(c.ambito, ambito)) {
    const a = T.p(c.x1, c.y1), b = T.p(c.x2, c.y2), L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    o.push(`<line x1="${f(a[0])}" y1="${f(-a[1])}" x2="${f(b[0])}" y2="${f(-b[1])}" stroke="#d4380d" stroke-width="${f(L * 0.002)}"/>`);
    o.push(`<text x="${f((a[0] + b[0]) / 2)}" y="${f(-(a[1] + b[1]) / 2 - L * 0.01)}" font-size="${f(L * 0.025)}" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#d4380d">${esc(c.texto)}</text>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(-R)} ${f(-R)} ${f(2 * R)} ${f(2 * R)}" width="2400" height="2400">\n<title>Comunidad Circular Humana · ${esc(u.nombre)} · 1 unidad = 1 m</title>\n<rect x="${f(-R)}" y="${f(-R)}" width="${f(2 * R)}" height="${f(2 * R)}" fill="#f4f1ea"/>\n${o.join('\n')}\n</svg>\n`;
}
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------------------------------------------------------------- CSV
export function csvDimensiones(m: Mundo): string {
  const md = m.medidas;
  const fl = (v: number, d = 1) => v.toFixed(d).replace('.', ',');
  const filas: (string | number)[][] = [
    ['Escala', 'Magnitud', 'Valor', 'Unidad'],
    ['Ciudad', 'Diámetro', fl(2 * md.ciudad.radio, 0), 'm'], ['Ciudad', 'Superficie', fl(md.ciudad.area / 1e6, 2), 'km²'], ['Ciudad', 'Población', fl(md.ciudad.poblacion, 0), 'personas'], ['Ciudad', 'Nidos', md.ciudad.nidos, 'ud'], ['Ciudad', 'Densidad', fl(md.ciudad.densidad, 1), 'hab/km²'],
    ['Pueblo', 'Diámetro', fl(2 * md.pueblo.radio, 0), 'm'], ['Pueblo', 'Superficie', fl(md.pueblo.area / 1e4, 1), 'ha'], ['Pueblo', 'Población', fl(md.pueblo.poblacion, 0), 'personas'],
    ['Comunidad', 'Diámetro', fl(2 * md.comunidad.radio, 0), 'm'], ['Comunidad', 'Superficie', fl(md.comunidad.area / 1e4, 2), 'ha'], ['Comunidad', 'Población', fl(md.comunidad.poblacion, 0), 'personas'], ['Comunidad', 'Superficie por persona', fl(md.comunidad.areaPorPersona, 0), 'm²'],
    ['Familia', 'Largo del pétalo', fl(md.familia.largo, 1), 'm'], ['Familia', 'Ancho máximo', fl(md.familia.anchoMax, 1), 'm'], ['Familia', 'Superficie del pétalo', fl(md.familia.area, 0), 'm²'],
    ['Nido', 'Lado del hexágono', fl(md.nido.lado, 2), 'm'], ['Nido', 'Superficie por planta', fl(md.nido.areaPlanta, 1), 'm²'], ['Nido', 'Plantas', md.nido.plantas, 'ud'], ['Nido', 'Superficie construida', fl(md.nido.construida, 1), 'm²'],
    ['Viario', 'Calzada', fl(md.viario.calzada, 1), 'km'], ['Viario', 'Carril bici', fl(md.viario.bici, 1), 'km'], ['Viario', 'Peatonal', fl(md.viario.peatonal, 1), 'km'],
    ['Total', 'Árboles', md.arboles, 'ud'], ['Total', 'Paneles solares', md.panelesSolares, 'ud'], ['Total', 'Superficie construida', fl(md.superficieConstruida, 0), 'm²'],
    [],
    ['Escala', 'Código', 'Equipamiento', 'Dimensiones', 'Superficie (m²)', 'Cantidad en la ciudad', 'Función'],
    ...md.equipamientos.map(e => [e.escala, e.codigo, e.nombre, e.dimensiones, e.superficie, e.cantidad, e.funcion]),
  ];
  return '﻿' + filas.map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
}

export function descargar(nombre: string, contenido: string | Blob, tipo = 'application/octet-stream') {
  const b = typeof contenido === 'string' ? new Blob([contenido], { type: tipo }) : contenido;
  const url = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
