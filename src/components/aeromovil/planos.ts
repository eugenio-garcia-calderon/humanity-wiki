// ============================================================================
// AEROMÓVIL GOTA · planos de fabricación (2026-11-05)
// ============================================================================
// Genera, desde la misma geometría que el visor y el STEP:
//   · SVG de cada lámina (A3 apaisado con cajetín) para ver e imprimir.
//   · DXF a escala 1:1 en milímetros, para cortar con CNC, láser o a mano:
//     las cuadernas del carenado (para el molde macho) y el alzado del chasis
//     (para la plantilla de soldadura).
//   · CSV con la lista de corte de tubos.
// Las láminas son dibujo técnico: líneas negras sobre papel blanco, en los
// dos temas de color, porque se imprimen.
import { SEAT_GAP, contornoSeccion, largoTubo, type Modelo, type Tubo } from './geometria';

const A3 = { w: 420, h: 297 };
const mm = (v: number) => Math.round(v * 1000);
const f1 = (v: number) => (Math.round(v * 10) / 10).toString().replace('.', ',');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export interface Lamina { id: string; titulo: string; escala: string; svg: string }

// ── Dibujo SVG ────────────────────────────────────────────────────────────
class Hoja {
  partes: string[] = [];
  constructor(public titulo: string, public escala: string, public numero: string) {}
  linea(x1: number, y1: number, x2: number, y2: number, cls = 'l') { this.partes.push(`<line class="${cls}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`); }
  poli(pts: [number, number][], cerrada: boolean, cls = 'l') {
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('') + (cerrada ? 'Z' : '');
    this.partes.push(`<path class="${cls}" d="${d}"/>`);
  }
  circulo(x: number, y: number, r: number, cls = 'l') { this.partes.push(`<circle class="${cls}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r.toFixed(2)}"/>`); }
  texto(x: number, y: number, t: string, cls = 't', ancla = 'start') { this.partes.push(`<text class="${cls}" x="${x.toFixed(2)}" y="${y.toFixed(2)}" text-anchor="${ancla}">${esc(t)}</text>`); }
  /** Cota horizontal o vertical con flechas y su valor en mm. */
  cota(x1: number, y1: number, x2: number, y2: number, valor: string, desplaz: number) {
    const hor = Math.abs(y2 - y1) < Math.abs(x2 - x1);
    if (hor) {
      const y = Math.min(y1, y2) + desplaz;
      this.linea(x1, y1, x1, y, 'f'); this.linea(x2, y2, x2, y, 'f'); this.linea(x1, y, x2, y, 'c');
      this.partes.push(`<path class="a" d="M${x1} ${y}l2 -0.8v1.6zM${x2} ${y}l-2 -0.8v1.6z"/>`);
      this.texto((x1 + x2) / 2, y - 1.2, valor, 'tc', 'middle');
    } else {
      const x = Math.max(x1, x2) + desplaz;
      this.linea(x1, y1, x, y1, 'f'); this.linea(x2, y2, x, y2, 'f'); this.linea(x, y1, x, y2, 'c');
      this.partes.push(`<path class="a" d="M${x} ${y1}l-0.8 ${y2 > y1 ? 2 : -2}h1.6zM${x} ${y2}l-0.8 ${y2 > y1 ? -2 : 2}h1.6z"/>`);
      this.partes.push(`<text class="tc" transform="translate(${(x - 1.2).toFixed(2)} ${((y1 + y2) / 2).toFixed(2)}) rotate(-90)" text-anchor="middle">${esc(valor)}</text>`);
    }
  }
  svg(fecha: string) {
    const { w, h } = A3;
    const cj = [w - 140, h - 32];
    const caj = [
      `<rect class="m" x="10" y="10" width="${w - 20}" height="${h - 20}"/>`,
      `<rect class="l" x="${cj[0]}" y="${cj[1]}" width="130" height="22"/>`,
      `<line class="l" x1="${cj[0]}" y1="${cj[1] + 11}" x2="${w - 10}" y2="${cj[1] + 11}"/>`,
      `<line class="l" x1="${cj[0] + 85}" y1="${cj[1]}" x2="${cj[0] + 85}" y2="${h - 10}"/>`,
      `<text class="tb" x="${cj[0] + 3}" y="${cj[1] + 7.5}">${esc(this.titulo)}</text>`,
      `<text class="t" x="${cj[0] + 3}" y="${cj[1] + 18.5}">Aeromóvil Gota · tándem 1+2 · humanity.wiki/aeromovil</text>`,
      `<text class="t" x="${cj[0] + 88}" y="${cj[1] + 7.5}">Escala ${this.escala} · A3</text>`,
      `<text class="t" x="${cj[0] + 88}" y="${cj[1] + 18.5}">Lámina ${this.numero} · ${fecha}</text>`,
    ];
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}mm" height="${h}mm" font-family="Helvetica, Arial, sans-serif">`
      + `<style>.l{fill:none;stroke:black;stroke-width:.35}.m{fill:none;stroke:black;stroke-width:.6}.f{fill:none;stroke:gray;stroke-width:.15}`
      + `.c{fill:none;stroke:dimgray;stroke-width:.18}.e{fill:none;stroke:gray;stroke-width:.18;stroke-dasharray:4 1 1 1}.o{fill:none;stroke:gray;stroke-width:.25;stroke-dasharray:1.5 1}`
      + `.a{fill:dimgray}.t{font-size:3px;fill:black}.tc{font-size:2.6px;fill:dimgray}.tb{font-size:4.2px;font-weight:bold;fill:black}.th{font-size:3.4px;font-weight:bold;fill:black}</style>`
      + `<rect x="0" y="0" width="${w}" height="${h}" fill="white"/>` + caj.join('') + this.partes.join('') + `</svg>`;
  }
}

/** Estaciones de las cuadernas: cada `paso` metros a lo largo del carenado. */
export function estaciones(m: Modelo, paso: number) {
  const out: { n: number; x: number; u: number }[] = [];
  let n = 1;
  for (let d = paso; d < m.Lf - paso * 0.3; d += paso) out.push({ n: n++, x: m.xn - d, u: d / m.Lf });
  return out;
}

function perfilLateral(m: Modelo, N = 160) {
  const top: [number, number][] = [], bot: [number, number][] = [], ala: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const u = (1 - Math.cos(Math.PI * i / N)) / 2, f = m.frame(u);
    top.push([f.x, f.top]); bot.push([f.x, f.bot]); ala.push([f.x, f.hw]);
  }
  return { top, bot, ala };
}

export function laminas(m: Modelo, paso: number, fecha: string): Lamina[] {
  const P = m.P, out: Lamina[] = [];
  const est = estaciones(m, paso);
  const { top, bot, ala } = perfilLateral(m);

  // ── 1 · Carenado: vistas generales 1:20 ───────────────────────────────────
  {
    const k = 1000 / 20, h = new Hoja('Carenado · vistas generales', '1:20', '1/4');
    const X = (x: number) => 30 + (x - m.xt) * k;
    const ySide = 130, Y = (y: number) => ySide - y * k;
    h.texto(30, 26, 'ALZADO LATERAL', 'th');
    h.poli(top.map(p => [X(p[0]), Y(p[1])] as [number, number]).concat(bot.slice().reverse().map(p => [X(p[0]), Y(p[1])] as [number, number])), true, 'm');
    h.linea(X(m.xt) - 6, Y(0), X(m.xn) + 6, Y(0), 'e');
    // Contorno de los cristales y de los paneles solares, en la vista lateral
    for (const z of m.zonasPiel) {
      if (z.t0 > Math.PI / 2) continue;
      const pts: [number, number][] = [];
      for (let i = 0; i <= 30; i++) { const f = m.frame(z.u0 + (z.u1 - z.u0) * i / 30); pts.push([X(f.x), Y(m.sec(f, z.t0)[1])]); }
      h.poli(pts, false, 'o');
    }
    for (const [x, r] of [[0, m.rF], [m.xR, m.rR], [m.xL, m.rL]] as [number, number][]) h.circulo(X(x), Y(r), r * k, 'o');
    for (const e of est) { const f = m.frame(e.u); h.linea(X(e.x), Y(f.bot) + 2, X(e.x), Y(f.top) - 2, 'f'); h.texto(X(e.x), Y(f.top) - 3, `C${e.n}`, 'tc', 'middle'); }
    h.cota(X(m.xt), Y(0), X(m.xn), Y(0), `${mm(m.Lf)}`, 14);
    h.cota(X(m.xn), Y(0), X(m.xn), Y(P.H), `${mm(P.H)}`, 10);
    h.cota(X(0), Y(0), X(m.xR), Y(0), `batalla ${mm(P.B)}`, 22);
    h.texto(X(m.xn) + 3, Y(P.clear) + 1, `libre ${mm(P.clear)}`, 'tc');
    // Planta
    const yPl = 215, Z = (z: number) => yPl + z * k;
    h.texto(30, 165, 'PLANTA', 'th');
    h.poli(ala.map(p => [X(p[0]), Z(p[1])] as [number, number]).concat(ala.slice().reverse().map(p => [X(p[0]), Z(-p[1])] as [number, number])), true, 'm');
    h.linea(X(m.xt) - 6, Z(0), X(m.xn) + 6, Z(0), 'e');
    for (const e of est) { const f = m.frame(e.u); h.linea(X(e.x), Z(-f.hw) - 1.5, X(e.x), Z(f.hw) + 1.5, 'f'); }
    for (const s of [-1, 1]) h.linea(X(m.xL) - m.rL * k, Z(s * P.track / 2), X(m.xL) + m.rL * k, Z(s * P.track / 2), 'o');
    h.linea(X(m.rF), Z(0), X(-m.rF), Z(0), 'o'); h.linea(X(m.xR + m.rR), Z(0), X(m.xR - m.rR), Z(0), 'o');
    h.cota(X(m.xn) - 40, Z(-P.W / 2), X(m.xn) - 40, Z(P.W / 2), `${mm(P.W)}`, 50);
    h.cota(X(m.xL), Z(-P.track / 2), X(m.xL), Z(P.track / 2), `vía ${mm(P.track)}`, -m.xL * k - 6);
    // Frontal: sección maestra y algunas cuadernas superpuestas
    const cx = 360, cy = 130, h20 = (p: [number, number]): [number, number] => [cx + p[0] * k, cy - p[1] * k];
    h.texto(320, 26, 'ALZADO FRONTAL', 'th');
    let umax = 0.3, amax = 0;
    for (let i = 5; i < 95; i++) { const f = m.frame(i / 100); if (f.hw * (f.top - f.bot) > amax) { amax = f.hw * (f.top - f.bot); umax = i / 100; } }
    h.poli(contornoSeccion(m, umax).map(h20), true, 'm');
    for (const e of est.filter((_, i) => i % 3 === 0)) h.poli(contornoSeccion(m, e.u, 72).map(h20), true, 'f');
    h.linea(cx - 45, cy, cx + 45, cy, 'e'); h.linea(cx, cy + 6, cx, cy - P.H * k - 6, 'e');
    h.texto(cx, cy + 10, `sección maestra a ${mm(m.xn - m.frame(umax).x)} mm del morro`, 'tc', 'middle');
    h.texto(30, 278, `Superficie exterior del carenado. Espesor de laminado hacia dentro (1 mm carbono-lino recomendado). Cotas en mm. Cuadernas C1…C${est.length} cada ${mm(paso)} mm desde el morro.`, 't');
    out.push({ id: 'carenado-vistas', titulo: 'Carenado · vistas', escala: '1:20', svg: h.svg(fecha) });
  }

  // ── 2 · Carenado: cuadernas 1:20 ─────────────────────────────────────────
  {
    const k = 1000 / 20, h = new Hoja('Carenado · cuadernas para el molde', '1:20', '2/4');
    const cols = 6, cw = 64, rh = 62, x0 = 22, y0 = 22;
    est.forEach((e, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const ox = x0 + c * cw + cw / 2, oy = y0 + r * rh + 44;
      const f = m.frame(e.u);
      const pts = contornoSeccion(m, e.u).map(p => [ox + p[0] * k, oy - (p[1] - P.clear) * k] as [number, number]);
      h.poli(pts, true, 'l');
      h.linea(ox - f.hw * k - 2, oy - (f.zc - P.clear) * k, ox + f.hw * k + 2, oy - (f.zc - P.clear) * k, 'e');
      h.linea(ox, oy + 2, ox, oy - (f.top - P.clear) * k - 2, 'e');
      h.texto(ox - cw / 2 + 2, y0 + r * rh + 3, `C${e.n} · a ${mm(m.xn - e.x)} mm del morro`, 'tb');
      h.texto(ox - cw / 2 + 2, y0 + r * rh + 7.5, `ancho ${mm(2 * f.hw)} · alto ${mm(f.top - f.bot)} · fondo a ${mm(f.bot)}`, 'tc');
    });
    h.texto(22, 278, 'Cada cuaderna en su plano, vista desde delante. Línea de trazos: eje y centro de la sección. El DXF 1:1 trae las mismas cuadernas a tamaño real para cortar en contrachapado o espuma.', 't');
    out.push({ id: 'carenado-cuadernas', titulo: 'Carenado · cuadernas', escala: '1:20', svg: h.svg(fecha) });
  }

  // ── 3 · Chasis: alzado y planta 1:20 ─────────────────────────────────────
  const tubos = m.tubosChasis();
  {
    const k = 1000 / 20, h = new Hoja('Chasis · alzado y planta', '1:20', '3/4');
    const X = (x: number) => 50 + (x - (m.xR - m.rR)) * k, Y = (y: number) => 140 - y * k, Z = (z: number) => 220 + z * k;
    h.texto(30, 26, 'ALZADO LATERAL', 'th');
    h.linea(X(m.xR - m.rR) - 10, Y(0), X(m.rF) + 10, Y(0), 'e');
    for (const t of tubos) {
      const dx = t.b[0] - t.a[0], dy = t.b[1] - t.a[1], L = Math.hypot(dx, dy);
      if (L < 0.005) { h.circulo(X(t.a[0]), Y(t.a[1]), t.d / 2 * k, 'l'); continue; }
      const nx = -dy / L * t.d / 2, ny = dx / L * t.d / 2;
      h.poli([[X(t.a[0] + nx), Y(t.a[1] + ny)], [X(t.b[0] + nx), Y(t.b[1] + ny)], [X(t.b[0] - nx), Y(t.b[1] - ny)], [X(t.a[0] - nx), Y(t.a[1] - ny)]], true, t.comprado ? 'o' : 'l');
    }
    for (const [x, r] of [[0, m.rF], [m.xR, m.rR], [m.xL, m.rL]] as [number, number][]) { h.circulo(X(x), Y(r), r * k, 'o'); h.circulo(X(x), Y(r), 0.6, 'l'); }
    // Horquilla (comprada): eje de dirección
    h.linea(X(0), Y(m.rF), X(m.crown[0] + (m.htt[0] - m.crown[0]) * 1.4), Y(m.crown[1] + (m.htt[1] - m.crown[1]) * 1.4), 'e');
    h.circulo(X(m.BB[0]), Y(m.BB[1]), 0.165 * k, 'o');
    h.cota(X(m.xR), Y(m.rR), X(0), Y(m.rF), `batalla ${mm(P.B)}`, 34);
    h.cota(X(m.xL), Y(m.rL), X(0), Y(m.rF), `${mm(-m.xL)}`, 26);
    h.cota(X(m.sf), Y(0), X(m.sf), Y(0.20), `${mm(0.20)}`, -18);
    h.texto(X(m.BB[0]), Y(m.BB[1]) - 0.165 * k - 2, 'pedalier-generador', 'tc', 'middle');
    h.texto(X(m.PIV[0]), Y(m.PIV[1]) + 5, 'pivote basculante', 'tc', 'middle');
    h.texto(X(0), Y(m.rF) - m.rF * k - 8, `horquilla 170 mm, ${90 - P.horquilla}°`, 'tc', 'middle');
    // Planta
    h.texto(30, 172, 'PLANTA', 'th');
    for (const t of tubos) {
      const dx = t.b[0] - t.a[0], dz = t.b[2] - t.a[2], L = Math.hypot(dx, dz);
      if (L < 0.005) { h.circulo(X(t.a[0]), Z(t.a[2]), t.d / 2 * k, 'l'); continue; }
      const nx = -dz / L * t.d / 2, nz = dx / L * t.d / 2;
      h.poli([[X(t.a[0] + nx), Z(t.a[2] + nz)], [X(t.b[0] + nx), Z(t.b[2] + nz)], [X(t.b[0] - nx), Z(t.b[2] - nz)], [X(t.a[0] - nx), Z(t.a[2] - nz)]], true, t.comprado ? 'o' : 'l');
    }
    for (const [x, z, r] of [[0, 0, m.rF], [m.xR, 0, m.rR], [m.xL, P.track / 2, m.rL], [m.xL, -P.track / 2, m.rL]] as [number, number, number][]) {
      h.poli([[X(x - r), Z(z - 0.028)], [X(x + r), Z(z - 0.028)], [X(x + r), Z(z + 0.028)], [X(x - r), Z(z + 0.028)]], true, 'o');
    }
    for (const z of [0, SEAT_GAP, -SEAT_GAP]) h.circulo(X(z ? m.xPas : m.xPil), Z(z), 0.8, 'l');
    h.cota(X(m.xL), Z(-P.track / 2), X(m.xL), Z(P.track / 2), `vía ${mm(P.track)}`, 30);
    h.texto(30, 278, `Tubos de aluminio 6061-T6 (tratamiento T6 tras soldar). Viga central Ø${f1(P.spineD)}×${f1(P.spineT)}. Trazo discontinuo: piezas compradas y ruedas. Coordenadas de nodos en la lámina 4.`, 't');
    out.push({ id: 'chasis-alzado', titulo: 'Chasis · alzado y planta', escala: '1:20', svg: h.svg(fecha) });
  }

  // ── 4 · Chasis: lista de corte y nodos ───────────────────────────────────
  {
    const h = new Hoja('Chasis · lista de corte y nodos', '—', '4/4');
    h.texto(22, 26, 'LISTA DE CORTE', 'th');
    const cab = ['Ref', 'Pieza', 'Material', 'Ø × e (mm)', 'Largo (mm)', 'Masa (g)'];
    const xs = [22, 34, 112, 152, 182, 206];
    cab.forEach((c, i) => h.texto(xs[i], 34, c, 'tb'));
    h.linea(22, 36, 226, 36, 'l');
    const filas = listaCorte(m);
    filas.forEach((r, i) => {
      const y = 41 + i * 5.2;
      [r.ref, r.pieza, r.material, r.seccion, String(r.largo), r.masa ? String(r.masa) : '—'].forEach((v, j) => h.texto(xs[j], y, v.length > 40 ? v.slice(0, 39) + '…' : v, 't'));
    });
    const tot = filas.reduce((a, r) => a + (r.masa || 0), 0);
    h.linea(22, 43 + filas.length * 5.2 - 3, 226, 43 + filas.length * 5.2 - 3, 'f');
    h.texto(182, 43 + filas.length * 5.2 + 2, `Total ${f1(tot / 1000)} kg`, 'tb');
    h.texto(240, 26, 'NODOS (mm, desde el eje delantero, suelo y eje central)', 'th');
    const nodos = nodosChasis(m);
    ['Nodo', 'X', 'Y (alto)', 'Z (lado)'].forEach((c, i) => h.texto(240 + [0, 60, 90, 120][i], 34, c, 'tb'));
    h.linea(240, 36, 400, 36, 'l');
    nodos.forEach((n, i) => {
      const y = 41 + i * 5.2;
      h.texto(240, y, n.nombre.length > 30 ? n.nombre.slice(0, 29) + '…' : n.nombre, 't');
      [n.x, n.y, n.z].forEach((v, j) => h.texto(240 + [60, 90, 120][j] + 18, y, String(v), 't', 'end'));
    });
    h.texto(22, 278, 'Comprados: horquilla 170 mm para rueda delantera, amortiguador trasero 230×65, amortiguador de inclinación, bujes, frenos de disco y motor de buje de 250 W.', 't');
    out.push({ id: 'chasis-corte', titulo: 'Chasis · lista de corte', escala: '—', svg: h.svg(fecha) });
  }
  return out;
}

export interface FilaCorte { ref: string; pieza: string; material: string; seccion: string; largo: number; masa: number; cantidad: number }

export function listaCorte(m: Modelo): FilaCorte[] {
  return m.tubosChasis().filter(t => !t.comprado).map((t, i) => {
    const L = largoTubo(t), area = t.pared ? Math.PI * ((t.d / 2) ** 2 - (t.d / 2 - t.pared) ** 2) : Math.PI * (t.d / 2) ** 2;
    return {
      ref: `T${String(i + 1).padStart(2, '0')}`, pieza: t.nombre, material: t.material,
      seccion: `${f1(t.d * 1000)} × ${t.pared ? f1(t.pared * 1000) : 'macizo'}`, largo: mm(L), masa: Math.round(area * L * 2700 * 1000), cantidad: 1,
    };
  });
}

function nodosChasis(m: Modelo) {
  const vistos = new Map<string, { nombre: string; x: number; y: number; z: number }>();
  for (const t of m.tubosChasis()) {
    for (const [p, cual] of [[t.a, 'inicio'], [t.b, 'fin']] as const) {
      const key = `${mm(p[0])},${mm(p[1])},${mm(p[2])}`;
      if (!vistos.has(key)) vistos.set(key, { nombre: `${t.nombre} (${cual})`, x: mm(p[0]), y: mm(p[1]), z: mm(p[2]) });
    }
  }
  return [...vistos.values()].slice(0, 44);
}

export function csvCorte(m: Modelo) {
  const filas = listaCorte(m);
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return 'Ref;Pieza;Material;Seccion (mm);Largo (mm);Cantidad;Masa (g)\n'
    + filas.map(r => [r.ref, q(r.pieza), q(r.material), q(r.seccion), r.largo, r.cantidad, r.masa].join(';')).join('\n') + '\n';
}

// ── DXF (R12 ASCII, mm, 1:1) ──────────────────────────────────────────────
class Dxf {
  e: string[] = [];
  capa(c: string) { return c.replace(/[^A-Za-z0-9_-]/g, '_'); }
  linea(c: string, x1: number, y1: number, x2: number, y2: number) {
    this.e.push(`0\nLINE\n8\n${this.capa(c)}\n10\n${x1.toFixed(2)}\n20\n${y1.toFixed(2)}\n30\n0\n11\n${x2.toFixed(2)}\n21\n${y2.toFixed(2)}\n31\n0`);
  }
  poli(c: string, pts: [number, number][], cerrada: boolean) {
    this.e.push(`0\nPOLYLINE\n8\n${this.capa(c)}\n66\n1\n70\n${cerrada ? 1 : 0}`);
    for (const p of pts) this.e.push(`0\nVERTEX\n8\n${this.capa(c)}\n10\n${p[0].toFixed(2)}\n20\n${p[1].toFixed(2)}\n30\n0`);
    this.e.push(`0\nSEQEND\n8\n${this.capa(c)}`);
  }
  circulo(c: string, x: number, y: number, r: number) { this.e.push(`0\nCIRCLE\n8\n${this.capa(c)}\n10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0\n40\n${r.toFixed(2)}`); }
  texto(c: string, x: number, y: number, alto: number, t: string) {
    this.e.push(`0\nTEXT\n8\n${this.capa(c)}\n10\n${x.toFixed(2)}\n20\n${y.toFixed(2)}\n30\n0\n40\n${alto}\n1\n${t.normalize('NFD').replace(/[̀-ͯ]/g, '')}`);
  }
  toString() { return `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${this.e.join('\n')}\n0\nENDSEC\n0\nEOF\n`; }
}

/** Cuadernas a tamaño real, en filas, con número, ejes y la línea de suelo. */
export function dxfCuadernas(m: Modelo, paso: number) {
  const d = new Dxf(), est = estaciones(m, paso), P = m.P;
  const ancho = P.W * 1000 + 150, alto = P.H * 1000 + 250, cols = 4;
  est.forEach((e, i) => {
    const ox = (i % cols) * ancho + ancho / 2, oy = -Math.floor(i / cols) * alto;
    const f = m.frame(e.u);
    d.poli(`CUADERNA_C${e.n}`, contornoSeccion(m, e.u, 180).map(p => [ox + p[0] * 1000, oy + (p[1] - P.clear) * 1000]), true);
    d.linea('EJES', ox, oy - 40, ox, oy + (f.top - P.clear) * 1000 + 40);
    d.linea('EJES', ox - f.hw * 1000 - 40, oy + (f.zc - P.clear) * 1000, ox + f.hw * 1000 + 40, oy + (f.zc - P.clear) * 1000);
    d.linea('BASE', ox - ancho / 2 + 40, oy - 40, ox + ancho / 2 - 40, oy - 40);
    d.texto('TEXTOS', ox - ancho / 2 + 40, oy - 90, 30, `C${e.n}  a ${mm(m.xn - e.x)} mm del morro  ancho ${mm(2 * f.hw)}  alto ${mm(f.top - f.bot)}`);
  });
  return d.toString();
}

/** Perfiles lateral y en planta 1:1 (plantillas del molde) más estaciones. */
export function dxfPerfiles(m: Modelo, paso: number) {
  const d = new Dxf(), { top, bot, ala } = perfilLateral(m, 240);
  const X = (x: number) => (x - m.xt) * 1000;
  d.poli('PERFIL_LATERAL', top.map(p => [X(p[0]), p[1] * 1000] as [number, number]).concat(bot.slice().reverse().map(p => [X(p[0]), p[1] * 1000] as [number, number])), true);
  const oy = -m.P.H * 1000 - 1200;
  d.poli('PERFIL_PLANTA', ala.map(p => [X(p[0]), oy + p[1] * 1000] as [number, number]).concat(ala.slice().reverse().map(p => [X(p[0]), oy - p[1] * 1000] as [number, number])), true);
  d.linea('SUELO', -100, 0, m.Lf * 1000 + 100, 0);
  for (const e of estaciones(m, paso)) {
    const f = m.frame(e.u);
    d.linea('ESTACIONES', X(e.x), f.bot * 1000, X(e.x), f.top * 1000); d.texto('TEXTOS', X(e.x) - 30, f.top * 1000 + 40, 40, `C${e.n}`);
    d.linea('ESTACIONES', X(e.x), oy - f.hw * 1000, X(e.x), oy + f.hw * 1000);
  }
  return d.toString();
}

/** Alzado lateral del chasis 1:1: base para la plantilla de soldadura. */
export function dxfChasis(m: Modelo) {
  const d = new Dxf();
  const tubos: Tubo[] = m.tubosChasis();
  for (const t of tubos) {
    const dx = t.b[0] - t.a[0], dy = t.b[1] - t.a[1], L = Math.hypot(dx, dy);
    const capa = t.comprado ? 'COMPRADO' : `TUBO_${Math.round(t.d * 1000)}`;
    if (L < 0.005) { d.circulo(capa, t.a[0] * 1000, t.a[1] * 1000, t.d * 500); continue; }
    const nx = -dy / L * t.d / 2, ny = dx / L * t.d / 2;
    d.poli(capa, [[t.a[0] + nx, t.a[1] + ny], [t.b[0] + nx, t.b[1] + ny], [t.b[0] - nx, t.b[1] - ny], [t.a[0] - nx, t.a[1] - ny]].map(p => [p[0] * 1000, p[1] * 1000] as [number, number]), true);
    d.linea('EJES_TUBOS', t.a[0] * 1000, t.a[1] * 1000, t.b[0] * 1000, t.b[1] * 1000);
  }
  for (const [x, r] of [[0, m.rF], [m.xR, m.rR], [m.xL, m.rL]] as [number, number][]) { d.circulo('RUEDAS', x * 1000, r * 1000, r * 1000); d.circulo('EJES_RUEDAS', x * 1000, r * 1000, 6); }
  d.circulo('PEDALIER', m.BB[0] * 1000, m.BB[1] * 1000, 165);
  d.linea('SUELO', (m.xR - m.rR) * 1000 - 100, 0, (m.rF + 0.1) * 1000, 0);
  d.texto('TEXTOS', (m.xR) * 1000, -120, 40, `Aeromovil Gota - chasis 1:1 - batalla ${mm(m.P.B)} mm - origen en el eje delantero a nivel de suelo`);
  return d.toString();
}
