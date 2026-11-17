/**
 * The mass of what is chosen in the two engine blocks of the Triciclo's Motor tab (2026-11-17, Eugenio: «que en los
 * desplegables también de motor eléctrico y motor gasolina que aparezcan con esos nombres, y que según la selección
 * que tengas, pues que aparezca también el peso de ese desplegable»).
 *
 * No formula of its own: it adds up the parts of `res.triciclo.piezas` (triciclo/masas.ts `piezasTriciclo`), the
 * same list as «Proyecto › Peso: todos los componentes» and the top bar's per-department figure
 * (PesosDepartamento.ts). So the number in the block's header is the number everywhere else.
 */
import type { PiezaMasa } from './geometriaTriciclo';

/** The parts that belong to each block, by their name in the parts list. */
const ELECTRICO = /^(Motor de buje|Motores de buje|Controlador|Motor: reductora)/;
const GASOLINA = /^(Motor de gasolina|Motor: (engranaje planetario|generador|embrague|motor-generador)|Depósito de gasolina)/;

export type BloqueMotor = 'electrico' | 'gasolina';

/** The parts of one block, with their masses (kg), in the list's order. */
export function piezasBloqueMotor(piezas: Pick<PiezaMasa, 'nombre' | 'kg'>[], b: BloqueMotor) {
  const re = b === 'electrico' ? ELECTRICO : GASOLINA;
  return piezas.filter(p => re.test(p.nombre));
}

/** The block's total (kg), or null when nothing of it is in the car (the petrol block on an all-electric car). */
export function kgBloqueMotor(piezas: Pick<PiezaMasa, 'nombre' | 'kg'>[], b: BloqueMotor): number | null {
  const ps = piezasBloqueMotor(piezas, b);
  return ps.length ? ps.reduce((a, p) => a + p.kg, 0) : null;
}
