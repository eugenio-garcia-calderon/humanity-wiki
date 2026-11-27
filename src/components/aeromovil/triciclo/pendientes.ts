// What is still to do on a Triciclo-family design, for the «Proyecto» tab (2026-11-17, masas). Pure: it reads the
// design's fields and its checks, and says what is open and in which tab it is done. Nothing here is a to-do list
// typed by hand: each item appears because of something in the design, and goes when that is done.
import { controladorDe, motorDe, termicoDe } from '../catalogoTren';
import type { Comprobacion } from '../geometria';
import type { CamposTriciclo } from './campos';

export interface Pendiente { titulo: string; porQue: string; dep: string }

export function pendientesTriciclo(T: CamposTriciclo, checks: Comprobacion[], nPiezas: number): Pendiente[] {
  const o: Pendiente[] = [];
  const rojas = checks.filter(c => c.holgura < 0);
  if (rojas.length) {
    const deps = rojas.map(c => (c.dep ?? 'carroceria').split(',')[0]), dep = deps.sort((a, b) => deps.filter(d => d === b).length - deps.filter(d => d === a).length)[0];
    o.push({ titulo: `Arreglar ${rojas.length === 1 ? 'el punto crítico en rojo' : `los ${rojas.length} puntos críticos en rojo`}`, porQue: 'Piezas que no caben o cifras que no cumplen: están abajo, en «Revisión de puntos críticos», agrupadas por el departamento donde se arreglan.', dep });
  }
  if (!motorDe(T.tCatMotor)) o.push({ titulo: 'Elegir un motor eléctrico real del catálogo', porQue: 'Hoy su potencia y su masa son las de los deslizadores: estimadas. Con uno de catálogo salen las cifras de su fabricante.', dep: 'propulsion' });
  if (!controladorDe(T.tCatCtrl)) o.push({ titulo: 'Elegir el controlador del catálogo', porQue: 'Su corriente y su tensión deciden si el motor da la potencia que se le pide.', dep: 'propulsion' });
  if (T.tPropulsion === 'phev' && !termicoDe(T.tCatTermico)) o.push({ titulo: 'Elegir el motor de gasolina del catálogo', porQue: 'Su tamaño y su masa salen hoy de una regla por kW. Uno real fija su sitio, su peso y su consumo.', dep: 'propulsion' });
  o.push({ titulo: 'Pesar las piezas de verdad', porQue: `Las ${nPiezas} masas del vehículo son estimaciones de piezas de su clase: el centro de gravedad y el reparto por ejes («Masas») valen lo que valgan ellas.`, dep: 'masas' });
  o.push({ titulo: 'Hacer el estudio aerodinámico', porQue: 'Prueba cambios de forma en el túnel y dice cuáles bajan el consumo (Chasis y carrocería › Aerodinámica).', dep: 'carroceria' });
  o.push({ titulo: 'Que un ingeniero revise el bastidor', porQue: 'Los largueros se calculan como una viga sobre dos apoyos, con un factor 2,5 por los baches: un primer número, no un cálculo de estructura.', dep: 'chasis' });
  if (T.tBascula === 'si') o.push({ titulo: 'Que un ingeniero revise la basculación', porQue: 'Sus pares y potencias son de un primer diseño; el vuelco y el consumo aún no cuentan la inclinación.', dep: 'rodaje' });
  return o;
}
