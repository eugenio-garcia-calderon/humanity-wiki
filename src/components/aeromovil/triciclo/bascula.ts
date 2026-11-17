// Triciclo tilt: lean axes, pose, how far the body and pods can lean before touching the road.
// Moved out of geometriaTriciclo.ts unchanged (2026-11-16, refactor «ordenar»); that file re-exports everything. See ../CLAUDE.md.
import { dimensionarTilt, type Tilt } from '../basculacion';
import type { FormaBala } from '../garaje/balaForma';
import { alturasPod, brazosDe, podDe, semiAncho } from '../garaje/balaMedidas';
import type { ClaveNumTriciclo } from './campos';
import { limitarTriciclo } from './medidas';
import { cgOcupante } from './ocupantes';
import type { ModeloTriciclo } from './modelo';
import type { PiezaMasa } from './masas';

// ------------------------------------------------------------------ leaning (2026-11-15)
/*
 * The «Cuadriciclo Bala clásico» leaning in bends (Eugenio, 2026-11-15: «haz que pueda bascular», on his «Smeraptera»).
 * Each pod hangs from the body on its two faired arms as on a parallelogram: the pod, its wheel and its upright stay
 * parallel to the body, so they lean with it, and the arms turn against the body by β so that both tyres keep the
 * road. The whole car turns φ about the ground under its centre line (+ to the right, the +z side down), as the
 * Cuadriciclo Basculante does (geometriaBasculante.ts `esquinaEn`, here with the arms' inner ends at the body's side).
 */
export interface EjeBascula {
  eje: 'del' | 'tras' | 'lat';
  /** the shape as this axle's pods see it (the front's own, or `formaTrasera`) */
  F: FormaBala;
  /** the upper arm's length, inner end to the pod (m): the parallelogram's */
  Lk: number;
  /** each arm: its x, its height at the body, where it meets the body (z) and its length */
  brazos: { x: number; yCuerpo: number; zp: number; Lk: number }[];
}
export function ejeBascula(eje: 'del' | 'tras' | 'lat', F: FormaBala): EjeBascula {
  // (as balaPiezas.ts `carenados` draws them: from 8 mm inside the skin to 2 cm inside the pod's centre)
  const z1 = F.VIA_LAT / 2 - 0.02;
  const brazos = brazosDe(F).flatMap(b => {
    const zp = F.ladoZ(F.X_LAT + b.x, b.yCuerpo) - 0.008;
    return Number.isFinite(zp) ? [{ x: F.X_LAT + b.x, yCuerpo: b.yCuerpo, zp, Lk: Math.max(0.05, z1 - zp) }] : [];
  });
  return { eje, F, Lk: brazos[0]?.Lk ?? 0.3, brazos };
}
/**
 * An axle at a lean φ (rad): the arms' turn β against the body, how far the right (+z) pod rises against the body
 * (the left one goes down as much) and how far both pods come in towards it (m).
 */
export function poseBascula(q: EjeBascula, phi: number) {
  const L = q.Lk, eEf = q.F.VIA_LAT / 2 - L;
  const beta = phi + Math.asin(Math.max(-1, Math.min(1, eEf * Math.sin(phi) / L)));
  return { beta, dy: L * Math.sin(beta), dIn: L * (1 - Math.cos(beta)) };
}
/** The gap (m) between a pod's inner face and the body, the pod moved in the body's frame `dy` up and `dIn` in (as `carenadoCuerpo`). */
export function carenadoCuerpoMovido(F: FormaBala, dy: number, dIn: number): number {
  const POD = podDe(F), ancho = semiAncho(POD); let h = 9;
  for (let i = 0; i <= 24; i++) {
    const xr = POD[0].x + (POD[POD.length - 1].x - POD[0].x) * i / 24, alt = alturasPod(POD, xr); if (!alt) continue;
    for (let j = 1; j < 10; j++) {
      const y = alt[0] + (alt[1] - alt[0]) * j / 10, w = ancho(xr, y); if (w <= 0) continue;
      const zb = F.ladoZ(F.X_LAT + xr, y + dy); if (!Number.isFinite(zb)) continue;
      h = Math.min(h, F.VIA_LAT / 2 - dIn - w - zb);
    }
  }
  return h;
}
/** How high a pod's lowest edge is over the road when it leans φ (rad) with its wheel, about the tyre's contact (m). */
export function carenadoAlSuelo(F: FormaBala, phi: number): number {
  const POD = podDe(F), ancho = semiAncho(POD); let h = 9;
  for (let i = 0; i <= 24; i++) {
    const xr = POD[0].x + (POD[POD.length - 1].x - POD[0].x) * i / 24, alt = alturasPod(POD, xr); if (!alt) continue;
    for (let j = 0; j <= 10; j++) { const y = alt[0] + (alt[1] - alt[0]) * j / 10, w = Math.max(0, ancho(xr, y)); h = Math.min(h, y * Math.cos(phi) - w * Math.sin(Math.abs(phi))); }
  }
  return h;
}
/** How high the body's lowest point is over the road at a lean φ (rad), turned about the ground under its centre line (m). */
export function cuerpoAlSuelo(F: FormaBala, phi: number): number {
  let h = 9;
  for (let x = F.X_MORRO - 0.01; x > F.X_COLA; x -= 0.04) for (let y = 0; y < 1.4; y += 0.01) {
    const z = F.ladoZ(x, y); if (Number.isFinite(z)) h = Math.min(h, y * Math.cos(phi) - z * Math.sin(Math.abs(phi)));
  }
  return h;
}

/**
 * The tilt system for this car (2026-11-16): each axle on arms with its share of the weight (the front axle of a
 * three- or four-wheeler carries the front's share, the rear one the rest; a diamond's laterals nearly all of it), the
 * mass and the centre of gravity's height with the riders on board, but without the tilt system itself.
 */
export function tiltTriciclo(m: ModeloTriciclo, piezas: PiezaMasa[]): Tilt | null {
  const b = m.bascula; if (!b) return null;
  const T = m.campos, L = (k: ClaveNumTriciclo) => limitarTriciclo(k, T);
  const todo = [...piezas.map(p => ({ kg: p.kg, x: p.x, y: p.y })), ...m.plazas.map(q => { const [x, y] = cgOcupante(q.pts); return { kg: q.kg, x, y }; })];
  const M = todo.reduce((a, p) => a + p.kg, 0), cx = todo.reduce((a, p) => a + p.kg * p.x, 0) / M, cy = todo.reduce((a, p) => a + p.kg * p.y, 0) / M;
  // the share on the front (or lateral) axle: by the lever between it and the rear wheel(s)
  const del = Math.min(1, Math.max(0, (cx - m.xR) / (m.xF - m.xR)));
  return dimensionarTilt({
    tec: b.tec, masa: M, cgY: cy, phiMax: b.phiMax, velocidad: L('tBascVel'), margen: L('tBascMargen'), brazo: b.brazo, bloqueo: L('tBascBloqueo'),
    ejes: b.ejes.map(q => {
      const a = q.brazos[0];
      return { nombre: q.eje === 'del' ? 'delantero' : q.eje === 'lat' ? 'lateral' : 'trasero', x: a?.x ?? q.F.X_LAT, yPivote: a?.yCuerpo ?? 0.4, zp: a?.zp ?? 0.3, Lk: q.Lk, via: q.F.VIA_LAT,
        // (one axle on arms, a three-wheeler's or a diamond's: the wheels on the centre line lean with the body and hold no
        // roll at all, so that axle holds the whole car)
        parte: b.ejes.length > 1 ? (q.eje === 'del' ? del : 1 - del) : 1, beta: (ph: number) => poseBascula(q, ph).beta };
    }),
  });
}
