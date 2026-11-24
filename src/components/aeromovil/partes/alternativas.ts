// What the project would carry with each option of a part (2026-11-24, Eugenio: «haz lo mismo … para el resto de elemento del
// vehículo»). A catalogue motor that publishes no mass leaves the model's estimate in place; one that publishes no price is priced
// by power; a different place for the battery moves the centre of gravity: the figures of an option are not in a table, they are
// what the design says when it is chosen. So each option is tried on a COPY of the design — its field set, the whole chain the page
// runs (`ajustarCarenado` → `crearModelo` → `calcular` → `costeProyecto`) — and the part's own lines of the mass list and the price
// list are read from the result: the same numbers the project shows once the star is pressed, never a second source.
//
// One try takes ≈ 60–80 ms, so a part with sixteen options is ≈ 1 s: it is done in the background, a try at a time, after the design
// has stopped changing (`useEvaluaciones`), and an option whose figures are not in yet says «calculando».
import { useEffect, useMemo, useRef, useState } from 'react';
import { ajustarCarenado, areas, calcular, crearModelo, type Parametros, type Resultados } from '../geometria';
import { costeProyecto } from '../precios/coste';
import type { PrecioParte } from '../precios/precios';
import { camposDeFavorita } from './opciones';
import { numerosActuales } from './numeros';
import { subsistema } from './subsistemas';
import type { IdSub, OpcionRodaje } from './tipos';

export interface Evaluacion {
  /** the part's own lines of the mass list and the price list with this option, and their sum */
  partes: PrecioParte[];
  kg: number;
  eur: number;
  /** the whole empty vehicle (kg) and the project's materials and parts (€) with it */
  vehiculoKg: number;
  proyectoEur: number | null;
  /** the model's checks that speak of this part, with this option */
  comprobaciones: { nombre: string; bien: boolean; mostrar?: string }[];
  /** what else changes, as [label, value] rows */
  extra: [string, string][];
}

const f = (v: number, d = 1) => v.toLocaleString('es-ES', { maximumFractionDigits: d });

/** What else the design says with this option, from the results the page already computes (no wind-tunnel Cd needed). */
function extrasDe(sub: IdSub, res: Resultados): [string, string][] {
  const rt = res.triciclo;
  if (!rt) return [];
  const comun: [string, string][] = [['Vehículo vacío', `${f(res.mVeh, 1)} kg`]];
  if (sub === 'bateria') return [...comun, ['Paquete', `${f(rt.bateria.kg, 1)} kg · ${f(rt.bateria.litros, 0)} L (caben ${f(rt.bateria.cabe, 0)} L)`], ['Altura del centro de gravedad', `${f(rt.cg.y * 100, 0)} cm`], ['Aceleración lateral que lo vuelca', `${f(rt.vuelco.ssf, 2)} g (objetivo ${f(rt.vuelco.objetivo, 2)} g)`], ['Peso en el eje delantero', `${f(rt.vuelco.repartoDel * 100, 0)} %`]];
  if (sub === 'bastidor') return [...comun, ['Tubo', `${f(rt.bastidor.metros, 1)} m`], ['Coeficiente de seguridad de los largueros', f(rt.bastidor.seguridad, 2)], ['Tensión en los largueros', `${f(rt.bastidor.tension, 0)} MPa`], ['Altura del centro de gravedad', `${f(rt.cg.y * 100, 0)} cm`]];
  return [...comun, ['Altura del centro de gravedad', `${f(rt.cg.y * 100, 0)} cm`], ['Peso en el eje delantero', `${f(rt.vuelco.repartoDel * 100, 0)} %`]];
}

/** Tries `cambios` (design field, value) on a copy of the design and reads the part's numbers from what the page would compute. */
export function evaluar(sub: IdSub, P: Parametros, cambios: [string, string][]): Evaluacion | null {
  const Q = { ...P, ...Object.fromEntries(cambios) } as Parametros;
  const m = crearModelo(ajustarCarenado(Q)), res = calcular(m, areas(m)), coste = costeProyecto(Q, m, res);
  if (!coste) return null;
  const n = numerosActuales(sub, coste.precios), S = subsistema(sub);
  return {
    partes: n.partes, kg: n.kg, eur: n.eur, vehiculoKg: res.mVeh, proyectoEur: coste.materiales,
    comprobaciones: res.comprobaciones.filter(c => S.comprobaciones.test(c.nombre)).map(c => ({ nombre: c.nombre, bien: c.holgura >= c.minimo, ...(c.mostrar ? { mostrar: c.mostrar } : {}) })),
    extra: extrasDe(sub, res),
  };
}

/** The fields of the design this part's options write, which a try overrides anyway: leaving them out of the key means choosing a star does not redo every try. */
const camposDeLaParte = (sub: IdSub): string[] => {
  const S = subsistema(sub);
  return S.origen === 'modelo' ? (S.selectores ?? []) : typeof S.campo === 'string' ? [S.campo] : S.campo ? [S.campo.del, S.campo.tras] : [];
};

/**
 * The tries of a part's options, in the background: after the design has been still for 600 ms, a try at a time (the page stays
 * usable between them), each stored under the design it was made for. `activo` false (the panel is closed) does nothing.
 * Returns the finished tries by option id; an option not in it is still being worked out.
 */
export function useEvaluaciones(sub: IdSub, P: Parametros, ids: string[], activo: boolean): Record<string, Evaluacion | null> {
  const propios = useMemo(() => new Set(camposDeLaParte(sub)), [sub]);
  // the design as the tries see it: every field but the part's own and the notes (a note typed does not change a number)
  const clave = useMemo(() => JSON.stringify(Object.fromEntries(Object.entries(P).filter(([k]) => k !== 'decisionesRodaje' && !propios.has(k)))), [P, propios]);
  const [hechas, setHechas] = useState<{ clave: string; sub: IdSub; por: Record<string, Evaluacion | null> }>({ clave: '', sub, por: {} });
  const ultima = useRef(P); ultima.current = P;
  const lista = ids.join('|');
  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    const t = setTimeout(async () => {
      const por: Record<string, Evaluacion | null> = {};
      for (const id of lista.split('|').filter(Boolean)) {
        if (!vivo) return;
        try { por[id] = evaluar(sub, ultima.current, camposDeFavorita(sub, id)); } catch { por[id] = null; }
        setHechas({ clave, sub, por: { ...por } });
        await new Promise(r => setTimeout(r, 0));
      }
    }, 600);
    return () => { vivo = false; clearTimeout(t); };
  }, [activo, sub, clave, lista]);
  return hechas.clave === clave && hechas.sub === sub ? hechas.por : {};
}

/** The options with the figures of their tries in place of the placeholders (an option still being worked out keeps `calculando`). */
export function conEvaluaciones(lista: OpcionRodaje[], ev: Record<string, Evaluacion | null>): OpcionRodaje[] {
  return lista.map(o => {
    if (!(o.id in ev)) return o;
    const e = ev[o.id];
    if (!e) return { ...o, calculando: false, masa: `${o.masa} (no se pudo calcular en este diseño)` };
    return {
      ...o, calculando: false, kg: e.kg, precio: { ...o.precio, eur: Math.round(e.eur) }, datos: [...(o.datos ?? []), ...e.extra],
      proyecto: { partes: e.partes.map(p => ({ nombre: p.nombre, kg: p.kg, eur: p.eur, como: p.como })), vehiculoKg: e.vehiculoKg, proyectoEur: e.proyectoEur, comprobaciones: e.comprobaciones },
    };
  });
}
