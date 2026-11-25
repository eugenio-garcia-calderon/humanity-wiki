// ============================================================================
// AGRICULTURA SINTRÓPICA · PLANS FOR PLANTING (2026-11-25)
// ============================================================================
// Eugenio: «exportarlo para que luego se pueda implementar con un plano, se pueda
// ver a qué distancia se tiene que plantar un árbol con respecto a otro».
//  · SVG plan of the plot (printable): modules, paths, swales, every plant with its number.
//  · SVG sheet of the module with dimension lines: distance of every position to the key
//    and to the module edges, the table to stake it out in the field.
//  · DXF (AutoCAD R12, metres): one layer per number (CLAVE_1, AUX_2…), crowns as circles.
//  · CSV: the planting list (number, species, x, y, distance to the nearest key).

import type { Parametros, Parcela, Planta } from './modelo';
import { huecosDe } from './modelo';
import { rol, diseno, etiquetasDe, NOMBRE_ROL } from './disenos';
import { ESPECIE } from './especies';
import { COLOR, COLOR_ROL } from './paleta';

const f1 = (n: number) => n.toFixed(1).replace('.', ',');
const f2 = (n: number) => n.toFixed(2).replace('.', ',');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const radioRol = (r: number) => [0, 0.55, 0.42, 0.32, 0.25, 0.18][r] ?? 0.2;

export function svgPlano(p: Parametros, parcela: Parcela, opciones: { numeros: boolean; copas: boolean }): string {
  const m = 6, W = parcela.ancho, H = parcela.largo, pie = 26;
  const Y = (y: number) => H - y + m;
  const partes: string[] = [];
  partes.push(`<rect x="${m}" y="${m}" width="${W}" height="${H}" fill="${COLOR.acolchado}" fill-opacity="0.35" stroke="#555" stroke-width="0.15"/>`);
  for (const r of parcela.rects) {
    const fill = r.tipo === 'modulo' ? COLOR.modulo : r.tipo === 'zanja' ? COLOR.agua : r.tipo === 'pavimento' ? COLOR.pavimento : COLOR.pasillo;
    partes.push(`<rect x="${r.x0 + m}" y="${Y(r.y1)}" width="${r.x1 - r.x0}" height="${r.y1 - r.y0}" fill="${fill}" ${r.tipo === 'modulo' ? `stroke="${COLOR.moduloBorde}" stroke-width="0.06"` : ''}/>`);
  }
  for (const l of parcela.lunas) {
    const arco = (r: number) => { const x0 = l.cx + r * Math.cos(l.a0), y0 = l.cy + r * Math.sin(l.a0), x1 = l.cx + r * Math.cos(l.a1), y1 = l.cy + r * Math.sin(l.a1); return { x0: x0 + m, y0: Y(y0), x1: x1 + m, y1: Y(y1) }; };
    const a = arco(l.r2 + 0.12), b = arco(l.r1);
    partes.push(`<path d="M${a.x0},${a.y0} A${l.r2},${l.r2} 0 0 1 ${a.x1},${a.y1} L${b.x1},${b.y1} A${l.r1},${l.r1} 0 0 0 ${b.x0},${b.y0} Z" fill="${COLOR.sonrisa}" fill-opacity="0.45" stroke="${COLOR.piedra}" stroke-width="0.2"/>`);
  }
  const orden = [...parcela.plantas].sort((a, b) => rol(b.etiqueta) - rol(a.etiqueta));
  for (const pl of orden) {
    const r = rol(pl.etiqueta), cx = pl.x + m, cy = Y(pl.y);
    if (opciones.copas && r <= 3) partes.push(`<circle cx="${cx}" cy="${cy}" r="${pl.esp.copa / 2}" fill="none" stroke="${pl.esp.color}" stroke-width="0.06" stroke-dasharray="0.25 0.2"/>`);
    partes.push(`<circle cx="${cx}" cy="${cy}" r="${radioRol(r)}" fill="${pl.macho ? COLOR.macho : COLOR_ROL[r]}" stroke="#333" stroke-width="0.03"><title>${esc(pl.etiqueta + ' · ' + pl.esp.nombre)}</title></circle>`);
    if (opciones.numeros) partes.push(`<text x="${cx}" y="${cy + radioRol(r) * 0.38}" font-size="${radioRol(r) * 1.05}" text-anchor="middle" font-family="sans-serif" fill="#222">${esc(pl.etiqueta)}</text>`);
  }
  // overall dimensions
  partes.push(`<g font-family="sans-serif" font-size="2.2" fill="#333"><text x="${m + W / 2}" y="${m + H + 4}" text-anchor="middle">${f1(W)} m</text><text x="${m + W + 2}" y="${m + H / 2}" transform="rotate(90 ${m + W + 2} ${m + H / 2})" text-anchor="middle">${f1(H)} m</text>`);
  partes.push(`<text x="${m + W - 2}" y="${m + 3}" font-weight="bold" text-anchor="end">N ↑</text></g>`);
  // legend
  const leyenda = leyendaDe(p).map((x, i) => `<g transform="translate(${m + (i % 3) * (W / 3)}, ${m + H + 8 + Math.floor(i / 3) * 3.2})"><circle cx="1" cy="-0.6" r="0.9" fill="${COLOR_ROL[rol(x.etiqueta)]}" stroke="#333" stroke-width="0.05"/><text x="2.6" y="0" font-size="1.7" font-family="sans-serif">${esc(x.etiqueta)} · ${esc(x.nombres)}</text></g>`).join('');
  const filas = Math.ceil(leyendaDe(p).length / 3);
  const alto = H + m * 2 + pie + filas * 3.2 - 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W + m * 2 + 4} ${alto}" width="${(W + m * 2 + 4) * 8}" height="${alto * 8}"><rect width="100%" height="100%" fill="white"/>${partes.join('')}${leyenda}</svg>`;
}

export function leyendaDe(p: Parametros) {
  const etiquetas = etiquetasDe(huecosDe(p));
  return etiquetas.map(e => ({ etiqueta: e, nombres: (p.asign[e] ?? []).map(id => ESPECIE[id]?.nombre).filter(Boolean).join(', ') || '—' }));
}

/** One module at a readable scale, with the distance of every position to the key. */
export function svgModulo(p: Parametros): { svg: string; tabla: { etiqueta: string; especie: string; x: number; y: number; aClave: number }[] } {
  const W = p.modAncho, H = p.modLargo, k = 60, m = 50;
  const huecos = huecosDe(p);
  const clave = huecos.find(h => rol(h.etiqueta) === 1) ?? { u: 0, v: 0, etiqueta: '1' };
  const X = (u: number) => m + (u + 0.5) * W * k, Yv = (v: number) => m + (0.5 - v) * H * k;
  const partes: string[] = [`<rect x="${m}" y="${m}" width="${W * k}" height="${H * k}" fill="${COLOR.modulo}" stroke="${COLOR.moduloBorde}" stroke-width="2"/>`];
  const tabla = huecos.map(h => {
    const x = (h.u + 0.5) * W, y = (h.v + 0.5) * H;
    const aClave = Math.hypot((h.u - clave.u) * W, (h.v - clave.v) * H);
    return { etiqueta: h.etiqueta, especie: (p.asign[h.etiqueta] ?? []).map(id => ESPECIE[id]?.nombre).join(' / '), x, y, aClave };
  });
  for (const h of huecos) if (rol(h.etiqueta) !== 1) partes.push(`<line x1="${X(clave.u)}" y1="${Yv(clave.v)}" x2="${X(h.u)}" y2="${Yv(h.v)}" stroke="#7a8a7a" stroke-width="0.8" stroke-dasharray="3 3"/>`);
  for (const h of huecos) {
    const r = rol(h.etiqueta), R = radioRol(r) * k * 0.8;
    const d = Math.hypot((h.u - clave.u) * W, (h.v - clave.v) * H);
    partes.push(`<circle cx="${X(h.u)}" cy="${Yv(h.v)}" r="${R}" fill="${COLOR_ROL[r]}" stroke="#333" stroke-width="1"/>`);
    partes.push(`<text x="${X(h.u)}" y="${Yv(h.v) + R * 0.35}" font-size="${R}" text-anchor="middle" font-family="sans-serif">${esc(h.etiqueta)}</text>`);
    if (r !== 1) partes.push(`<text x="${X(h.u)}" y="${Yv(h.v) + R + 11}" font-size="10" text-anchor="middle" font-family="sans-serif" fill="#334">${f2(d)} m</text>`);
  }
  // dimension lines of the module
  partes.push(`<g stroke="#333" stroke-width="1" font-family="sans-serif" font-size="13" fill="#333"><line x1="${m}" y1="${m - 18}" x2="${m + W * k}" y2="${m - 18}"/><line x1="${m}" y1="${m - 24}" x2="${m}" y2="${m - 12}"/><line x1="${m + W * k}" y1="${m - 24}" x2="${m + W * k}" y2="${m - 12}"/><text x="${m + W * k / 2}" y="${m - 24}" text-anchor="middle" stroke="none">${f2(W)} m</text>`);
  partes.push(`<line x1="${m - 18}" y1="${m}" x2="${m - 18}" y2="${m + H * k}"/><text x="${m - 24}" y="${m + H * k / 2}" text-anchor="middle" stroke="none" transform="rotate(-90 ${m - 24} ${m + H * k / 2})">${f2(H)} m</text></g>`);
  partes.push(`<text x="${m + W * k}" y="${m + H * k + 22}" text-anchor="end" font-family="sans-serif" font-size="12" fill="#555">Distancias desde la especie clave (1). Norte arriba.</text>`);
  const ancho = W * k + m * 2, alto = H * k + m * 2 + 10;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}"><rect width="100%" height="100%" fill="white"/>${partes.join('')}</svg>`, tabla };
}

// ---------------------------------------------------------------- DXF R12 (metres)
const ascii = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7e]/g, '').trim();
const CAPAS: Record<string, number> = { CONTORNO: 7, MODULOS: 3, PASILLOS: 8, ZANJAS: 5, PAVIMENTO: 9, MEDIA_LUNA: 32, CLAVE_1: 2, AUX_2: 5, AUX_3: 6, AUX_4: 30, AUX_5: 3, COPAS: 252, TEXTOS: 7 };
const capaRol = (r: number) => (['', 'CLAVE_1', 'AUX_2', 'AUX_3', 'AUX_4', 'AUX_5'])[r];

export function dxfPlano(p: Parametros, parcela: Parcela, conTextos = true): string {
  const o: string[] = [];
  const g = (c: number, v: string | number) => o.push(String(c), String(v));
  const linea = (capa: string, x1: number, y1: number, x2: number, y2: number) => { g(0, 'LINE'); g(8, capa); g(10, x1); g(20, y1); g(11, x2); g(21, y2); };
  const caja = (capa: string, x0: number, y0: number, x1: number, y1: number) => { linea(capa, x0, y0, x1, y0); linea(capa, x1, y0, x1, y1); linea(capa, x1, y1, x0, y1); linea(capa, x0, y1, x0, y0); };
  const texto = (capa: string, x: number, y: number, h: number, t: string) => { g(0, 'TEXT'); g(8, capa); g(10, x); g(20, y); g(40, h); g(1, ascii(t)); };
  g(0, 'SECTION'); g(2, 'HEADER'); g(9, '$ACADVER'); g(1, 'AC1009'); g(9, '$INSUNITS'); g(70, 6); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'TABLES'); g(0, 'TABLE'); g(2, 'LAYER'); g(70, Object.keys(CAPAS).length);
  for (const [n, c] of Object.entries(CAPAS)) { g(0, 'LAYER'); g(2, n); g(70, 0); g(62, c); g(6, 'CONTINUOUS'); }
  g(0, 'ENDTAB'); g(0, 'ENDSEC');
  g(0, 'SECTION'); g(2, 'ENTITIES');
  caja('CONTORNO', 0, 0, parcela.ancho, parcela.largo);
  for (const r of parcela.rects) caja(r.tipo === 'modulo' ? 'MODULOS' : r.tipo === 'zanja' ? 'ZANJAS' : r.tipo === 'pavimento' ? 'PAVIMENTO' : 'PASILLOS', r.x0, r.y0, r.x1, r.y1);
  for (const l of parcela.lunas) for (const r of [l.r1, l.r2]) { g(0, 'ARC'); g(8, 'MEDIA_LUNA'); g(10, l.cx); g(20, l.cy); g(40, r); g(50, (l.a0 * 180) / Math.PI); g(51, (l.a1 * 180) / Math.PI); }
  for (const pl of parcela.plantas) {
    const r = rol(pl.etiqueta), capa = capaRol(r);
    g(0, 'POINT'); g(8, capa); g(10, pl.x); g(20, pl.y);
    g(0, 'CIRCLE'); g(8, capa); g(10, pl.x); g(20, pl.y); g(40, radioRol(r) * 0.6);
    if (r <= 3) { g(0, 'CIRCLE'); g(8, 'COPAS'); g(10, pl.x); g(20, pl.y); g(40, pl.esp.copa / 2); }
    if (conTextos) texto('TEXTOS', pl.x + 0.2, pl.y + 0.2, 0.25, `${pl.etiqueta}${pl.macho ? ' M' : ''} ${pl.esp.nombre}`);
  }
  g(0, 'ENDSEC'); g(0, 'EOF');
  return o.join('\n');
}

export function csvPlantas(parcela: Parcela): string {
  const claves = parcela.plantas.filter(x => rol(x.etiqueta) === 1);
  const cerca = (pl: Planta) => claves.reduce((b, k) => Math.min(b, Math.hypot(k.x - pl.x, k.y - pl.y)), Infinity);
  const filas = [['n', 'modulo', 'numero', 'especie', 'cientifico', 'estrato', 'x_m', 'y_m', 'distancia_clave_m', 'macho']];
  parcela.plantas.forEach((pl, i) => filas.push([String(i + 1), String(pl.mod + 1), pl.etiqueta, pl.esp.nombre, pl.esp.cientifico, pl.esp.estrato, pl.x.toFixed(2), pl.y.toFixed(2), rol(pl.etiqueta) === 1 ? '0' : cerca(pl).toFixed(2), pl.macho ? 'si' : '']));
  return '﻿' + filas.map(f => f.map(c => /[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c).join(';')).join('\n');
}

/** Totals by species: what has to be bought from the nursery. */
export function listaCompra(parcela: Parcela) {
  const m = new Map<string, number>();
  for (const pl of parcela.plantas) m.set(pl.esp.id, (m.get(pl.esp.id) ?? 0) + 1);
  return [...m.entries()].map(([id, n]) => ({ esp: ESPECIE[id], n })).sort((a, b) => b.n - a.n);
}

export function descargar(nombre: string, contenido: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const nombreArchivo = (p: Parametros) => `bosque-sintropico-${p.clave}-${diseno(p.diseno).id}`;
export { NOMBRE_ROL };
