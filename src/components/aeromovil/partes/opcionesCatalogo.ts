// The motor makers' parts as options (2026-11-24, Eugenio: «haz lo mismo que has hecho … para el resto de elemento del vehículo»):
// the electric motors, the controllers, the reduction gears and the petrol engines of `catalogoTren.ts`, in the one shape the
// running gear's parts already have. Nothing is made up here: every figure is the catalogue's own, and where the maker or the shop
// publishes none it says so (`null` stays «no lo publica»).
//
// What the PROJECT carries with each option (its kg and its €) is not in this file: a catalogue part that publishes no mass leaves the
// model's own estimate in place, and one that publishes no price is priced by power, so only recomputing the design says
// what choosing it does. `alternativas.ts` does that; here the options start as `calculando` with the catalogue's facts in `datos`.
import {
  CONTROLADORES, MOTORES, REDUCTORAS, TERMICOS, bsfc, cv, precioEuros, rendimientoTermico,
  type ControladorCatalogo, type MotorCatalogo, type Precio, type ReductoraCatalogo, type TermicoCatalogo,
} from '../catalogoTren';
import type { FuenteOpcion, OpcionRodaje, ParteOpcion } from './tipos';

const f = (v: number, d = 1) => v.toLocaleString('es-ES', { maximumFractionDigits: d });
const o = <T,>(v: T | null | undefined, ver: (x: T) => string) => (v == null ? 'no lo publica' : ver(v));
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

/** The option's price as shown: the shop's figure in its own currency and in euros, or the reason there is none. */
function precioDe(p: Precio | null | undefined, sinPrecio: string) {
  const eur = precioEuros(p);
  if (!p || eur == null) return { eur: 0, tipo: 'estimado' as const, nota: sinPrecio };
  const moneda = p.moneda === 'EUR' ? `${f(p.valor, 0)} €` : `${f(p.valor, 0)} $ (≈ ${f(eur, 0)} €)`;
  return { eur: Math.round(eur), tipo: 'publicado' as const, fuente: p.fuente, nota: `precio de ${host(p.fuente)} el ${p.leido}: ${moneda}, IVA ${p.iva}${p.nota ? `; ${p.nota}` : ''}` };
}
const fuentesDe = (c: { marca: string; modelo: string; fuente: string; leido: string; precio?: Precio | null }): FuenteOpcion[] => {
  const l: FuenteOpcion[] = [{ t: `${c.marca} ${c.modelo}: ficha`, url: c.fuente, leido: c.leido }];
  if (c.precio && c.precio.fuente !== c.fuente) l.push({ t: `${c.marca} ${c.modelo}: precio`, url: c.precio.fuente, leido: c.precio.leido });
  return l;
};
const quien = (t: 'fabricante' | 'distribuidor') => (t === 'fabricante' ? 'la ficha del fabricante' : 'la tienda que lo vende');
const clase = (c: { clase?: 'bici' }) => (c.clase === 'bici' ? 'de bicicleta' : 'de vehículo pesado');

// ---------------------------------------------------------------- electric motors
function deMotor(m: MotorCatalogo): OpcionRodaje {
  const precio = precioDe(m.precio, 'ningún precio público (se vende bajo petición): el proyecto lo estima por su potencia');
  const parte: ParteOpcion = { n: `${m.marca} ${m.modelo}`, cantidad: 1, ...(m.kg != null ? { kg: m.kg } : {}), ...(precio.tipo === 'publicado' ? { eur: precio.eur } : {}), nota: `${m.montaje === 'buje' ? 'Motor de buje: va dentro de la rueda, cada rueda motriz lleva uno' : 'Motor central: necesita una reductora hasta la rueda'}.`, origen: 'comprar', dato: 'publicado' };
  return {
    id: m.id, n: `${m.marca} ${m.modelo}`, por: 'en este proyecto', kg: 0, calculando: true, precio,
    resumen: `${m.montaje === 'buje' ? 'Motor de buje' : 'Motor central'} ${clase(m)}: ${m.tecnologia}.`,
    masa: m.kg != null ? `${f(m.kg, 2)} kg, publicados por ${quien(m.tipoFuente)}; el proyecto cuenta los de cada motor que lleve` : `${quien(m.tipoFuente)} no publica la masa: el proyecto sigue con su estimación (el deslizador «Motor»)`,
    datoKg: m.kg != null ? 'publicado' : 'estimado',
    partes: [parte], pros: [], contras: [], fuentes: fuentesDe(m), notas: m.notas,
    datos: [
      ['Montaje', m.montaje === 'buje' ? 'en el buje de la rueda' : 'central, con reductora'], ['Clase', clase(m)], ['Tecnología', m.tecnologia],
      ['Tensión nominal', o(m.vNom, v => `${v} V${m.vMin != null || m.vMax != null ? ` (admite ${m.vMin ?? '?'}–${m.vMax ?? '?'} V)` : ''}`)],
      ['Potencia continua', o(m.kWCont, v => `${f(v)} kW`)], ['Potencia de pico', o(m.kWPico, v => `${f(v)} kW`)],
      ['Par continuo / de pico', `${o(m.nmCont, v => `${f(v, 0)} N·m`)} / ${o(m.nmPico, v => `${f(v, 0)} N·m`)}`],
      ['Vueltas máximas', o(m.rpmMax, v => `${f(v, 0)} rpm`)], ['Masa publicada', o(m.kg, v => `${f(v, 2)} kg`)],
      ['Refrigeración', o(m.refrigeracion, v => v)], ['Rendimiento publicado', o(m.rendimiento, v => `${f(v, 0)} %`)],
      ...(m.reduccion ? [['Reducción incorporada', `${f(m.reduccion, 2)} : 1`] as [string, string]] : []),
      ...(m.controladorIntegrado ? [['Inversor', 'incorporado: no hace falta controlador'] as [string, string]] : []),
    ],
  };
}

// ---------------------------------------------------------------- controllers
function deControlador(c: ControladorCatalogo): OpcionRodaje {
  const precio = precioDe(c.precio, 'ningún precio público: el proyecto lo estima por la potencia del motor');
  const parte: ParteOpcion = { n: `${c.marca} ${c.modelo}`, cantidad: 1, ...(c.kg != null ? { kg: c.kg } : {}), ...(precio.tipo === 'publicado' ? { eur: precio.eur } : {}), nota: 'La electrónica entera, sin cables ni caja.', origen: 'comprar', dato: 'publicado' };
  return {
    id: c.id, n: `${c.marca} ${c.modelo}`, por: 'en este proyecto', kg: 0, calculando: true, precio,
    resumen: `Controlador ${clase(c)}${c.vNom != null ? ` de ${c.vNom} V` : ''}${c.aPico != null ? `, ${f(c.aPico, 0)} A de pico` : ''}.`,
    masa: c.kg != null ? `${f(c.kg, 2)} kg, publicados por ${quien(c.tipoFuente)}` : `${quien(c.tipoFuente)} no publica la masa: el proyecto sigue con su estimación (el deslizador «Inversor»)`,
    datoKg: c.kg != null ? 'publicado' : 'estimado',
    partes: [parte], pros: [], contras: [], fuentes: fuentesDe(c), notas: c.notas,
    datos: [
      ['Clase', clase(c)], ['Tensión nominal', o(c.vNom, v => `${v} V${c.vMin != null || c.vMax != null ? ` (${c.vMin ?? '?'}–${c.vMax ?? '?'} V)` : ''}`)],
      ['Corriente de pico', o(c.aPico, v => `${f(v, 0)} A${c.aPicoTiempo ? ` durante ${c.aPicoTiempo}` : ''}`)], ['Corriente continua', o(c.aCont, v => `${f(v, 0)} A`)],
      ['Qué es esa corriente', c.corriente === 'fase' ? 'la del motor (de fase)' : c.corriente === 'bateria' ? 'la de la batería' : 'la ficha no lo aclara'],
      ...(c.aBat != null ? [['Corriente de la batería', `${f(c.aBat, 0)} A`] as [string, string]] : []), ['Masa publicada', o(c.kg, v => `${f(v, 2)} kg`)],
    ],
  };
}

// ---------------------------------------------------------------- reduction gears
function deReductora(r: ReductoraCatalogo): OpcionRodaje {
  const parte: ParteOpcion = { n: `${r.marca} ${r.modelo}`, cantidad: 1, ...(r.kg != null ? { kg: r.kg } : {}), nota: r.diferencial ? 'Reductora con diferencial: reparte el giro entre las dos ruedas.' : 'Reductora planetaria.', origen: 'comprar', dato: 'publicado' };
  return {
    id: r.id, n: `${r.marca} ${r.modelo}`, por: 'en este proyecto', kg: 0, calculando: true,
    precio: { eur: 0, tipo: 'estimado', nota: r.kg != null ? 'las del catálogo no publican precio: el proyecto cuenta 380 € por una reductora de su tamaño' : 'sin masa publicada el proyecto no añade la pieza: no cuenta ni su peso ni su precio' },
    resumen: `${r.tipo === 'planetaria' ? 'Reductora planetaria' : 'Diferencial con reducción'} de ${f(r.relacion, 2)} : 1${r.diferencial ? ', con diferencial' : ''}.`,
    masa: r.kg != null ? `${f(r.kg, 2)} kg, publicados por ${quien(r.tipoFuente)}` : `${quien(r.tipoFuente)} no publica la masa: el proyecto no añade la pieza, así que no suma ni peso ni precio`,
    datoKg: r.kg != null ? 'publicado' : 'estimado',
    partes: [parte], pros: [], contras: [], fuentes: fuentesDe(r), notas: r.notas,
    datos: [
      ['Tipo', r.tipo], ['Relación', `${f(r.relacion, 2)} : 1`], ['Par de salida nominal / máximo', `${o(r.nmSalida, v => `${f(v, 0)} N·m`)} / ${o(r.nmSalidaMax, v => `${f(v, 0)} N·m`)}`],
      ...(r.nmEntradaMax != null ? [['Par de entrada máximo', `${f(r.nmEntradaMax, 0)} N·m`] as [string, string]] : []),
      ['Vueltas de entrada máximas', o(r.rpmEntradaMax, v => `${f(v, 0)} rpm`)], ['Rendimiento', o(r.rendimiento, v => `${f(v, 1)} %`)], ['Diferencial', r.diferencial ? 'sí' : 'no'], ['Masa publicada', o(r.kg, v => `${f(v, 2)} kg`)],
    ],
  };
}

// ---------------------------------------------------------------- petrol engines
function deTermico(t: TermicoCatalogo): OpcionRodaje {
  const precio = precioDe(t.precio, 'ningún precio público (se vende bajo petición): el proyecto lo estima por su potencia');
  const rend = rendimientoTermico(t), g = bsfc(t);
  const parte: ParteOpcion = { n: `${t.marca} ${t.modelo}`, cantidad: 1, ...(t.kg != null ? { kg: t.kg } : {}), ...(precio.tipo === 'publicado' ? { eur: precio.eur } : {}), nota: 'El motor solo: el depósito y el escape se cuentan aparte.', origen: 'comprar', dato: 'publicado' };
  return {
    id: t.id, n: `${t.marca} ${t.modelo}`, por: 'en este proyecto', kg: 0, calculando: true, precio,
    resumen: `Motor de gasolina ${clase(t)} de ${f(t.kW)} kW (${f(cv(t.kW), 0)} CV), ${t.cilindros} cilindro${t.cilindros > 1 ? 's' : ''}${t.cc ? ` y ${f(t.cc, 0)} cm³` : ''}.`,
    masa: t.kg != null ? `${f(t.kg, 1)} kg, publicados por ${quien(t.tipoFuente)}: el modelo los usa para el motor entero (bloque, escape, admisión y bombas)` : `${quien(t.tipoFuente)} no publica la masa: el proyecto estima el motor por su potencia (15 kg + 1,4 kg por kW)`,
    datoKg: t.kg != null ? 'publicado' : 'estimado',
    partes: [parte], pros: [], contras: [], fuentes: fuentesDe(t), notas: t.notas,
    datos: [
      ['Cilindrada', o(t.cc, v => `${f(v, 0)} cm³, ${t.cilindros} cil.`)], ['Ciclo y refrigeración', `${t.ciclo}, ${t.refrigeracion}`],
      ['Potencia máxima', `${f(t.kW)} kW (${t.potencia}) a ${o(t.rpm, v => `${f(v, 0)} rpm`)}`], ['Potencia continua', o(t.kWCont, v => `${f(v)} kW`)], ['Par máximo', o(t.nm, v => `${f(v, 0)} N·m`)],
      ['Consumo publicado', o(t.consumoLh, v => `${f(v, 2)} L/h a ${o(t.consumoKW, k => `${f(k)} kW`)}`)], ['Consumo específico', o(g, v => `${f(v, 0)} g/kWh`)], ['Rendimiento que sale', o(rend, v => `${f(v, 0)} %`)],
      ['Masa publicada', o(t.kg, v => `${f(v, 1)} kg`)],
    ],
  };
}

export const OPCIONES_MOTOR: OpcionRodaje[] = MOTORES.map(deMotor);
export const OPCIONES_CONTROLADOR: OpcionRodaje[] = CONTROLADORES.map(deControlador);
export const OPCIONES_REDUCTORA: OpcionRodaje[] = REDUCTORAS.map(deReductora);
export const OPCIONES_TERMICO: OpcionRodaje[] = TERMICOS.map(deTermico);
