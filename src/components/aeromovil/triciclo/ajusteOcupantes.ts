// Do the riders fit, at their own size? (2026-11-17, «muñecos», Eugenio: «cambiar el tamaño de los muñecos para que
// sean más altos o más gordos para ver cómo entran en el vehículo»). Pure (no three.js).
//
// One list per rider (`ajustePlaza`), measured on the figure the viewer draws (its points are already at the rider's
// stature, `talla.ts`; the widths and the belly here follow the build). `calcularTriciclo` lists the ones marked
// `emitir`; the viewer paints red (touching) or amber (closer than the minimum) the parts that fail
// (`choquesPlaza`). The ones not emitted are checks `calcularTriciclo` already lists with the same formula on the same
// points (knees to the wheel and the dashboard, the Aptera buckets' and the rows' feet): here only to colour them.
import { TALLA_SENTADO } from '../geometriaBala';
import type { PuntosOcupante } from '../geometria';
import type { DepTriciclo } from './campos';
import { dentroDe, limitarTriciclo } from './medidas';
import type { Plaza } from './ocupantes';
import type { ModeloTriciclo } from './modelo';
import { aroVolante } from './modelo';
import { cabezaPlaza, cabezaTriciclo } from './comprobaciones';
import { MEDIA_CADERA, MEDIO_HOMBROS, PIE, RADIO_RODILLA, VIENTRE, textoCuerpo, type Cuerpo } from './talla';

export type ParteCuerpo = 'cabeza' | 'hombros' | 'caderas' | 'vientre' | 'rodillas' | 'pies';
export interface Ajuste { parte: ParteCuerpo; nombre: string; holgura: number; minimo: number; dep: DepTriciclo | `${DepTriciclo},${DepTriciclo}`; emitir: boolean }
/** The figure's points as the model hands them to the viewer: with the rider's size and, once the model exists, what collides. */
export type PuntosConCuerpo = PuntosOcupante & { cuerpo?: Cuerpo; choques?: () => Map<ParteCuerpo, 'roza' | 'justo'> };

const lado = (m: ModeloTriciclo, x: number, y: number) => { const z = m.F.ladoZ(x, y); return Number.isFinite(z) ? z : -0.05; };

/** Who, in a check's name: «del piloto», «del pasajero», «de la fila 2 der.». */
export function quien(m: ModeloTriciclo, q: Plaza) {
  return q.piloto ? 'del piloto' : !m.filas ? 'del pasajero' : `de la ${q.nombre.toLowerCase()}`;
}

/** Every fit measure of one rider, at its own size. */
export function ajustePlaza(m: ModeloTriciclo, q: Plaza): Ajuste[] {
  const o = q.pts, c = q.cuerpo, k = c.k, A = c.ancho * k, esp = limitarTriciclo('tEspCristal', m.campos) / 1000;
  const zq = Math.abs(q.z), d = o.d, fw: [number, number] = [d[1], -d[0]];   // along the trunk, and ahead of it
  const en = (t: number): [number, number] => [o.H[0] + d[0] * t * k, o.H[1] + d[1] * t * k];
  const out: Ajuste[] = [], w = quien(m, q);
  const add = (parte: ParteCuerpo, nombre: string, holgura: number, minimo: number, emitir = true, dep: Ajuste['dep'] = 'interior') => out.push({ parte, nombre, holgura, minimo, dep, emitir });

  // the head: as «Cabeza … a la cúpula (talla media / alta)», at this rider's sitting height
  const talla = k * TALLA_SENTADO.p50;
  const cab = m.filas && !q.piloto ? cabezaPlaza(m, q, talla, esp) : cabezaTriciclo(m, q.piloto, talla, esp);
  add('cabeza', `Cabeza ${w} a la cúpula (con su talla, sin casco)`, cab.holgura, 0.03, true, 'interior,carroceria');

  // the shoulders: the outside of each arm's ball (19 cm out, 6 cm round at the average man's size), and its top-outer edge
  {
    const S = en(0.46), r = 0.06 * A, zc = zq + 0.19 * A;
    const h = Math.min(lado(m, S[0], S[1]) - esp - (zc + r), lado(m, S[0], S[1] + r * 0.7) - esp - (zc + r * 0.7));
    add('hombros', `Hombros ${w} a los lados`, h, 0.02, true, 'interior,carroceria');
  }
  // the hips: the pelvis's width, from the cushion up to 10 cm
  {
    let h = 9;
    for (const t of [-0.02, 0.05, 0.10]) { const p = en(t); h = Math.min(h, lado(m, p[0], p[1]) - esp - (zq + MEDIA_CADERA * A)); }
    add('caderas', `Caderas ${w} a los lados`, h, 0.01);
  }
  // the knees and thighs inside the body: astride, the legs open round the saddle and the battery
  {
    const ap = o.anchoPiernas as number[] | undefined, zc = ap?.[0] ?? 0.09, zp = ap?.[1] ?? 0.10, zr = ap && ap.length > 2 ? ap[2] : (zc + zp) / 2;
    let h = 9;
    for (const u of [0.5, 0.75, 1]) {
      const x = o.H[0] + (o.K[0] - o.H[0]) * u, y = o.H[1] + (o.K[1] - o.H[1]) * u, z = zq + zc + (zr - zc) * u + RADIO_RODILLA * c.ancho * k;
      h = Math.min(h, dentroDe(m.F, x, y, z), dentroDe(m.F, x, y + RADIO_RODILLA * k, z - RADIO_RODILLA * k * 0.3));
    }
    add('rodillas', `Rodillas ${w} dentro de la carrocería`, h, 0.01);
  }
  // the belly: the pilot's to the steering wheel's rim; the passenger's (astride or bucket) to the pilot's backrest
  if (q.piloto && m.volante) {
    let h = 0.5;
    for (const p of aroVolante(m.volante, 48)) {
      const v: [number, number] = [p[0] - o.H[0], p[1] - o.H[1]], a = v[0] * d[0] + v[1] * d[1], f = v[0] * fw[0] + v[1] * fw[1];
      // only the part of the rim in front of the belly (between the hips and the chest, within the belly's width)
      if (a > 0 && a < 0.35 * k && Math.abs(p[2]) < MEDIA_CADERA * A + 0.02 && f > 0) h = Math.min(h, f - VIENTRE * c.fondo * k - 0.015);
    }
    add('vientre', 'Vientre del piloto al volante', h, 0.03);
  }
  if (!q.piloto && !m.filas) {
    // as «Respaldo del piloto al vientre del pasajero» (its back face 17 cm behind the pilot's trunk axis, 30 cm up it),
    // with the belly 12 cm ahead of the hips at the average man's size, × this build
    const op = m.plazas[0].pts, t0 = 0.30;
    const xRespaldo = op.H[0] + op.d[0] * t0 - op.d[1] * 0.17, yR = op.H[1] + op.d[1] * t0;
    const xVientre = o.H[0] + o.d[0] * Math.max(0, (yR - o.H[1]) / o.d[1]) + 0.12 * c.fondo * k;
    add('vientre', 'Respaldo del piloto al vientre del pasajero', xRespaldo - xVientre, 0.03, false);
  }
  // the knees (6 cm round): to the steering wheel and the dashboard (as `calcularTriciclo`, only to colour them)
  if (q.piloto && m.volante) {
    const ap = o.anchoPiernas as number[] | undefined, zK = ap?.[2] ?? ap?.[0] ?? 0.13; let h = 9;
    for (const p of aroVolante(m.volante, 48)) for (const s of [1, -1]) h = Math.min(h, Math.hypot(p[0] - o.K[0], p[1] - o.K[1], p[2] - s * zK) - 0.06 - 0.015);
    add('rodillas', 'Rodillas del piloto al volante', h, 0.02, false);
  }
  if (q.piloto && m.salpicadero) {
    const s = m.salpicadero;
    add('rodillas', 'Rodillas del piloto al salpicadero', o.K[1] + 0.06 > s.yBajo ? s.x1 - (o.K[0] + 0.06) : 0.5, 0.02, false);
  }
  // the feet, ankle to toes (17 cm at the average man's size), inside the body; and a diamond's pilot behind its nose wheel
  {
    const ap = o.anchoPiernas as number[] | undefined, zp = zq + (ap?.[1] ?? 0.10) + 0.045;
    const sx = o.F[0] - o.K[0], sy = o.F[1] - o.K[1], sl = Math.hypot(sx, sy) || 1;
    const dir: [number, number] = q.piloto ? [-sy / sl, sx / sl] : [1, -0.11];
    const largo = PIE * k * (q.piloto ? 1 : 0.18 / 0.17);
    let h = 9;
    for (const u of [0, 0.5, 1]) for (const dy of [-0.06, 0.04]) h = Math.min(h, dentroDe(m.F, o.F[0] + dir[0] * largo * u, o.F[1] + dir[1] * largo * u + dy, zp));
    // (the Aptera buckets and the rows list their own feet checks: `chequeosButacas`, `calcularTriciclo`)
    add('pies', `Pies ${w} dentro de la carrocería`, h, 0.01, !m.butacas && !m.filas);
    if (q.piloto && m.rombo && o.F[1] < 2 * m.rR) add('pies', 'Puntas de los pies del piloto a la rueda delantera', -m.rR - (o.F[0] + dir[0] * largo), 0.03, true, 'interior,rodaje');
  }
  return out;
}

/** The riders whose fit is listed: the pilot, the passenger, and each rear row's outermost place on the right (its mirror is the same). */
export function plazasMedidas(m: ModeloTriciclo): Plaza[] {
  if (!m.filas) return m.plazas;
  const o: Plaza[] = [m.plazas[0]];
  for (const f of [2, 3]) { const q = m.plazas.filter(p => p.fila === f && p.z >= -1e-9).sort((a, b) => b.z - a.z)[0]; if (q) o.push(q); }
  return o;
}

/** The checks for `calcularTriciclo`: each rider's fit at its own size. `c` is its own `c`. */
export function chequeosTalla(m: ModeloTriciclo, c: (dep: Ajuste['dep'], nombre: string, holgura: number, minimo: number, mostrar?: string) => void) {
  for (const q of plazasMedidas(m)) for (const a of ajustePlaza(m, q)) if (a.emitir) c(a.dep, a.nombre, a.holgura, a.minimo);
}

/** Which parts of a rider to paint: red where it touches (holgura < 0), amber where it is closer than the check asks. */
export function choquesPlaza(m: ModeloTriciclo, q: Plaza): Map<ParteCuerpo, 'roza' | 'justo'> {
  // (a row's other places are their row's mirror: measure the place on the right)
  const medida = m.filas && !q.piloto ? m.plazas.find(p => p.fila === q.fila && Math.abs(Math.abs(p.z) - Math.abs(q.z)) < 1e-9 && p.z >= -1e-9) ?? q : q;
  const r = new Map<ParteCuerpo, 'roza' | 'justo'>();
  for (const a of ajustePlaza(m, medida)) {
    if (a.holgura < 0) r.set(a.parte, 'roza');
    else if (a.holgura < a.minimo && r.get(a.parte) !== 'roza') r.set(a.parte, 'justo');
  }
  return r;
}

/** «Piloto: 1,92 m, corpulento, 95 kg». */
export const resumenPlaza = (q: Plaza) => `${q.nombre}: ${textoCuerpo(q.cuerpo)}`;
