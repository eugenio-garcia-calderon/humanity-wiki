// The two summary tabs of the vehicles with departments (Triciclo family and Basculante), 2026-11-17 (masas):
// «Masas» (PanelMasas.tsx) and «Proyecto» (PanelProyecto.tsx). The page shows this instead of the vehicle's own side
// panel when one of these two tabs is open.
import { useMemo } from 'react';
import type { Comprobacion, Resultados } from './geometria';
import type { ModeloTriciclo } from './geometriaTriciclo';
import type { ModeloBasculante } from './geometriaBasculante';
import { grupoPieza } from './geometriaTriciclo';
import { EQUIPAJE, equipajeEn } from './triciclo/masas';
import { masasTriciclo } from './triciclo/centroMasas';
import { pendientesTriciclo, type Pendiente } from './triciclo/pendientes';
import { VUELCO_OBJETIVO, AGARRE } from './triciclo/comprobaciones';
import { analizarMasas, entradaBasculante, type AnalisisMasas } from './masasVehiculo';
import { PanelMasas } from './PanelMasas';
import { PanelProyecto } from './PanelProyecto';

/** The checks the «Masas» tab lists: everything that depends on where the mass is. */
const DE_MASAS = /^(Vuelco|Frenada|Tracción|Reparto|Centro de gravedad|Híbrido: (motor de gasolina|depósito) a )/;
export const esDeMasas = (c: Comprobacion) => DE_MASAS.test(c.nombre);

/** The centre of gravity with everyone on board, for the 3D's mark (x, y, z), or null. */
export function centroParaVisor(a: AnalisisMasas | null): [number, number, number] | null {
  const e = a?.estados.find(s => s.id === 'ocupado'); return e ? [e.cg.x, e.cg.y, e.cg.z] : null;
}

/** The masses of the vehicle being edited, or null for one without departments. */
export function useMasas(modelo: { tipo: string }, res: Resultados): AnalisisMasas | null {
  return useMemo(() => {
    if (modelo.tipo === 'triciclo' && res.triciclo) {
      const m = modelo as ModeloTriciclo, eq = equipajeEn(m);
      return masasTriciclo(m, res.triciclo.piezas, { kg: EQUIPAJE, x: eq.x, y: eq.y }, grupoPieza);
    }
    if (modelo.tipo === 'basculante' && res.basculante) return analizarMasas(entradaBasculante(res.basculante, modelo as ModeloBasculante));
    return null;
  }, [modelo, res]);
}

export function LadoResumen({ dep, modelo, res, masas, alIr }: {
  dep: 'masas' | 'proyecto'; modelo: ModeloTriciclo | ModeloBasculante; res: Resultados; masas: AnalisisMasas | null; alIr: (dep: string) => void;
}) {
  if (dep === 'masas') {
    if (!masas) return null;
    const tri = modelo.tipo === 'triciclo' ? modelo : null, rt = res.triciclo;
    return <PanelMasas a={masas} checks={res.comprobaciones.filter(esDeMasas)}
      vuelco={rt ? { ssf: rt.vuelco.ssf, ssfSolo: rt.vuelco.ssfSolo, objetivo: VUELCO_OBJETIVO, agarre: AGARRE } : null}
      alturaVehiculo={modelo.alto}
      hibrido={tri?.phev ? { kgMotor: tri.phev.kgMotor, kgDeposito: tri.phev.kgDeposito } : null}
      notaEstimacion={tri
        ? `Las suspensiones, los frenos y los neumáticos se dimensionan para la masa de diseño: todos a bordo y ${EQUIPAJE} kg de equipaje. Cada deslizador de masa es lo menos que pesa esa pieza; si la carga pide más, cuenta lo que pide la carga y aquí se dice. El bastidor pesa lo que sus tubos (largo × sección × densidad) más sus uniones. Son estimaciones de piezas de su clase, no pesadas.`
        : 'Estimaciones de piezas de su clase, no pesadas. Los dos ocupantes cuentan como una sola masa donde el cálculo del vehículo los pone.'} />;
  }
  const pendientes: Pendiente[] = modelo.tipo === 'triciclo'
    ? pendientesTriciclo(modelo.campos, res.comprobaciones, res.triciclo?.piezas.length ?? 0)
    : [
      ...(res.comprobaciones.some(c => c.holgura < 0) ? [{ titulo: 'Arreglar los puntos críticos en rojo', porQue: 'Están abajo, agrupados por el departamento donde se arreglan.', dep: 'rodaje' }] : []),
      { titulo: 'Pesar las piezas de verdad', porQue: 'Las masas son estimaciones de piezas de su clase: el centro de gravedad y el reparto («Masas») valen lo que valgan ellas.', dep: 'masas' },
      { titulo: 'Hacer el estudio aerodinámico', porQue: 'Prueba cambios de forma en el túnel y dice cuáles bajan el consumo (Carrocería › Aerodinámica).', dep: 'carroceria' },
    ];
  return <PanelProyecto checks={res.comprobaciones} pendientes={pendientes} alIr={alIr} />;
}
