// What the passenger runs into behind (2026-11-17, bot «ahorcajadas»). Pure, no three.js.
//
// Eugenio: «Permite la configuración de asientos ahorcajadas uno delante de otro, que el asiento del copiloto, el que va
// detrás, se pueda separar más del asiento frontal. Ahora mismo hay un límite.» The passenger's slider (`tPasX`) used to
// stop 62 cm behind the pilot; now it runs to `SEPARACION_PASAJERO_MAX` (./medidas.ts), and these checks say what the
// passenger's seat would hit on the way: the frame's end (the rails stop at the swing arm's pivot, where the shock tower
// stands), the rear wheel with its suspension compressed, and the body's skin round the backrest. The canopy over the
// head was already checked («Cabeza del pasajero a la cúpula»), and so was the swing arm's pivot behind the footpegs.
// Only for the two-seat layouts (astride and the Aptera buckets); three rows have their own ranges.
import { BUTACA, ASIENTO } from '../garaje/balaMedidas';
import type { DepTriciclo } from './campos';
import { dentroDe, limitarTriciclo } from './medidas';
import type { ModeloTriciclo } from './modelo';

type C = (dep: DepTriciclo | `${DepTriciclo},${DepTriciclo}`, nombre: string, holgura: number, minimo: number, mostrar?: string) => void;

/** The passenger's seat seen from the side (m, shape coordinates): where its supports meet the rails, its rearmost point low down, and the backrest's top. */
export function asientoPasajero(m: ModeloTriciclo) {
  const S = m.sillines, dxPas = S.xPasajero - ASIENTO.xPasajero, dyPas = S.yPasajero - ASIENTO.yPasajero;
  const rec = Math.max(0, m.rec.pasajero) * Math.PI / 180;
  if (m.butacas) {
    // the bucket: one post each side under the hips; its shell's back at the cushion; the backrest up along its recline
    const alto = BUTACA.respaldo + BUTACA.cabezal;
    return { soporte: S.xPasajero + 0.02, trasera: S.xPasajero - BUTACA.detras, yTrasera: S.yPasajero - BUTACA.pan, arriba: [S.xPasajero - BUTACA.bisagra - BUTACA.grueso - alto * Math.sin(rec), S.yPasajero + alto * Math.cos(rec)] as [number, number] };
  }
  // the saddle (garaje/balaPiezas.ts `cabina`): its post foot at −1.50, its tail at −1.745 (both moved with the hips);
  // the backrest pad 30 cm up the trunk and 15.5 cm behind it, about 30 cm tall
  const d = [-Math.sin(rec), Math.cos(rec)], atras = [-Math.cos(rec), -Math.sin(rec)], H = [S.xPasajero, S.yPasajero + 0.108];
  const arriba: [number, number] = [H[0] + d[0] * 0.45 + atras[0] * 0.19, H[1] + d[1] * 0.45 + atras[1] * 0.19];
  return { soporte: -1.50 + dxPas, trasera: Math.min(-1.745 + dxPas, S.xPasajero - 0.19), yTrasera: 0.42 + dyPas, arriba };
}

export function chequeosPasajeroAtras(m: ModeloTriciclo, c: C) {
  if (m.filas) return;
  const a = asientoPasajero(m), rT = limitarTriciclo('tChD', m.campos) / 2000;
  const cm = (v: number) => `${(v * 100).toLocaleString('es-ES', { maximumFractionDigits: 1 })} cm`;
  const sep = m.sillines.xPiloto - m.sillines.xPasajero;
  // 1. the seat stands on the rails, and the rails end at the swing arm's pivot, where the shock tower rises
  const torre = m.basculante.pivote[0] + 0.04 + rT;
  const hT = a.soporte - torre;
  c('interior,chasis', 'Asiento del pasajero sobre los largueros (delante de la torreta del amortiguador)', hT, 0.02, hT < 0 ? `se pasa ${cm(-hT)} · ${cm(sep)} detrás del piloto` : undefined);
  // 2. the rear wheel, with the suspension compressed, ahead of the seat's back (one rear wheel only: two go at the sides)
  if (!m.traseras) {
    const hR = a.trasera - (m.xR + m.rR + 0.04);
    c('interior,rodaje', 'Asiento del pasajero delante de la rueda trasera', hR, 0.02, hR < 0 ? `la pisa ${cm(-hR)}` : undefined);
  }
  // 3. astride only: the backrest pad's top inside the skin, at its two corners. (The Aptera buckets' headrest already
  // grazes the skin at today's 62 cm in the default body, -0.9 cm: checking it would turn designs red that nobody moved;
  // their head is checked against the canopy instead. Tech debt, 2026-11-17.)
  if (m.butacas) return;
  const kz = Math.min(1, m.F.kW), z = 0.15 * kz;
  const hP = dentroDe(m.F, a.arriba[0], a.arriba[1], z);
  c('interior,carroceria', 'Respaldo del pasajero dentro de la carrocería', hP, 0.01, hP < 0 ? `asoma ${cm(-hP)}` : undefined);
}
