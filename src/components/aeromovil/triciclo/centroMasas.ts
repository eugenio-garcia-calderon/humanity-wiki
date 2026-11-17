// The Triciclo family's masses as the «Masas» tab and its checks see them (2026-11-17, masas). Pure.
// It weighs nothing itself: the parts are `piezasTriciclo` (./masas), the occupants and the luggage are where
// `calcularTriciclo` and `cargasRueda` put them; the adding up is `../masasVehiculo.ts`. See ../CLAUDE.md.
import { analizarMasas, centroDe, bordeLongitudinal, rangoReparto, traccionCuesta, CUESTA, AGARRE_MOJADO, FRENADA, type Masa, type RuedaApoyo, type AnalisisMasas, type Centro } from '../masasVehiculo';
import type { ModeloTriciclo } from './modelo';
import type { PiezaMasa } from './masas';
import { cgOcupante } from './ocupantes';

/** Where each wheel touches the ground (x forward, z + to the right), which axle it is on, and which drive. */
export function ruedasTriciclo(m: ModeloTriciclo): RuedaApoyo[] {
  const t = m.F.VIA_LAT;
  if (m.rombo) return [
    { nombre: 'Rueda del morro', eje: 'Morro', x: 0, z: 0, motriz: false },
    { nombre: 'Lateral izquierda', eje: 'Laterales', x: m.xF, z: -t / 2, motriz: false },
    { nombre: 'Lateral derecha', eje: 'Laterales', x: m.xF, z: t / 2, motriz: false },
    { nombre: 'Rueda de la cola', eje: 'Cola', x: m.xR, z: 0, motriz: true },
  ];
  const del: RuedaApoyo[] = [
    { nombre: 'Delantera izquierda', eje: 'Eje delantero', x: m.xF, z: -t / 2, motriz: false },
    { nombre: 'Delantera derecha', eje: 'Eje delantero', x: m.xF, z: t / 2, motriz: false },
  ];
  if (m.traseras) {
    const tt = m.traseras.VIA_LAT;
    return [...del, { nombre: 'Trasera izquierda', eje: 'Eje trasero', x: m.xR, z: -tt / 2, motriz: true }, { nombre: 'Trasera derecha', eje: 'Eje trasero', x: m.xR, z: tt / 2, motriz: true }];
  }
  return [...del, { nombre: 'Rueda trasera', eje: 'Eje trasero', x: m.xR, z: 0, motriz: true }];
}

/** Everyone on board, each at their own centre (the same places as the checks' centre of gravity and the wheel loads). */
export function ocupantesTriciclo(m: ModeloTriciclo): Masa[] {
  // (2026-11-17: each rider's own mass, from its size: talla.ts)
  return m.plazas.map(q => { const [x, y] = cgOcupante(q.pts); return { nombre: q.nombre, kg: q.kg, x, y, z: q.z, grupo: 'ocupantes' }; });
}

/** The parts, the occupants and the luggage, as `analizarMasas` wants them. */
export function masasTriciclo(m: ModeloTriciclo, piezas: PiezaMasa[], equipaje: { kg: number; x: number; y: number }, grupo: (nombre: string) => string): AnalisisMasas {
  return analizarMasas({
    piezas: piezas.map(p => ({ nombre: p.nombre, kg: p.kg, x: p.x, y: p.y, z: p.z ?? 0, grupo: grupo(p.nombre), ...(p.nota ? { nota: p.nota } : {}) })),
    ocupantes: ocupantesTriciclo(m),
    equipaje: { nombre: 'Equipaje', kg: equipaje.kg, x: equipaje.x, y: equipaje.y, z: 0, grupo: 'ocupantes' },
    ruedas: ruedasTriciclo(m),
  });
}

/**
 * The checks that follow from where the mass is (the «Masas» tab lists them; the department they name, too):
 * braking without the rear lifting, climbing a wet hill with the driven wheel, the balance front to back, and the
 * centre of gravity off the centre line. The rollover threshold itself is the existing «Vuelco» check (comprobaciones.ts).
 */
export function comprobacionesMasas(m: ModeloTriciclo, cg: Centro, vuelcoMin: number) {
  const ruedas = ruedasTriciclo(m), fmt = (v: number, d = 2) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  const out: { dep: 'rodaje'; nombre: string; holgura: number; minimo: number; mostrar: string }[] = [];
  const delante = bordeLongitudinal(ruedas, cg.z, true), frena = (delante - cg.x) / cg.y;
  out.push({ dep: 'rodaje', nombre: `Frenada a fondo (${fmt(FRENADA, 1)} g): las ruedas de atrás no se levantan`, holgura: frena - FRENADA, minimo: 0.2, mostrar: `se levantan a ${fmt(frena)} g` });
  const tr = traccionCuesta(ruedas, cg);
  out.push({ dep: 'rodaje', nombre: `Tracción: subir una cuesta del ${Math.round(CUESTA * 100)} % en mojado con ${m.traseras ? 'las ruedas motrices' : 'la rueda motriz'}`, holgura: tr - 1, minimo: 0.2, mostrar: `agarra ${fmt(tr, 1)} veces lo que pide` });
  const xa = Math.min(...ruedas.map(r => r.x)), xd = Math.max(...ruedas.map(r => r.x)), parte = (cg.x - xa) / (xd - xa);
  const rango = rangoReparto(ruedas, cg, vuelcoMin);
  const pc = (v: number) => `${Math.round(v * 100)} %`;
  out.push({
    dep: 'rodaje', nombre: `Reparto: peso por delante de ${m.traseras ? 'las ruedas traseras' : m.rombo ? 'la rueda de la cola' : 'la rueda trasera'}, dentro del margen bueno a esta altura`,
    holgura: rango ? Math.min(parte - rango.min, rango.max - parte) : -1, minimo: 0.03,
    mostrar: rango ? `${pc(parte)} (bueno: ${pc(rango.min)} a ${pc(rango.max)})` : `${pc(parte)} · a esta altura ninguno cumple`,
  });
  out.push({ dep: 'rodaje', nombre: 'Centro de gravedad centrado de lado (menos de 2 cm)', holgura: 0.02 - Math.abs(cg.z), minimo: 0.005, mostrar: Math.abs(cg.z) < 0.0005 ? 'en el centro' : `${fmt(Math.abs(cg.z) * 100, 1)} cm a la ${cg.z > 0 ? 'derecha' : 'izquierda'}` });
  return out;
}
/** For the explanations: the wet grip the hill check assumes. */
export const AGARRE_CUESTA = AGARRE_MOJADO;

/**
 * The checks this file adds to `calcularTriciclo`'s (geometria.ts `calcular` appends them): the ones that follow from
 * where the mass is, and the hybrid's engine and tank against what is around them (hibrido.ts `choques`; the tower is
 * already `calcularTriciclo`'s own «a la torreta» check).
 */
export function comprobacionesExtraTriciclo(m: ModeloTriciclo, piezas: PiezaMasa[], vuelcoMin: number) {
  const cg = centroDe([...piezas.map(p => ({ ...p, z: p.z ?? 0 })), ...ocupantesTriciclo(m)]);
  const fmt = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const out: { dep: string; nombre: string; holgura: number; minimo: number; mostrar?: string }[] = [...comprobacionesMasas(m, cg, vuelcoMin)];
  for (const k of m.phev?.disp.holguras.choques ?? []) {
    if (k.pieza === 'motor' && /amortiguador|torreta/.test(k.con)) continue;
    out.push({ dep: k.pieza === 'motor' ? 'propulsion,rodaje' : 'propulsion', nombre: `Híbrido: ${k.pieza === 'motor' ? 'motor de gasolina' : 'depósito'} a ${k.con}`, holgura: k.holgura, minimo: k.minimo, ...(k.holgura < 0 ? { mostrar: `choca ${fmt(-k.holgura * 100)} cm` } : {}) });
  }
  return out;
}
