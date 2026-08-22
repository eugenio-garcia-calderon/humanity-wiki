import { NodeToolbar, Position } from '@xyflow/react';
import {
  AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  Scaling, Copy, Lock, Unlock, Trash2,
} from 'lucide-react';
import type { Alineacion, Reparto, Igualado } from '../../utils/alineacion';

// ============================================================================
// BARRA DE LA SELECCIÓN MÚLTIPLE — estilo Miro (2026-08-22)
// ============================================================================
// Aparece cuando hay DOS o más elementos marcados y reúne lo que solo tiene
// sentido con varios: alinearlos, repartirlos, igualarles el tamaño,
// bloquearlos, duplicarlos y quitarlos, todo de una vez.
//
// Hasta hoy marcar varios elementos no servía para nada: la barra de un solo
// elemento (`BarraElemento`) seguía saliendo por cada uno y no había ninguna
// acción de conjunto. Esa es la diferencia práctica entre un lienzo de
// consulta y uno de trabajo.
//
// Se coloca con `NodeToolbar` sobre el rectángulo que envuelve a los marcados
// (acepta una lista de ids), así que sigue a la selección y no se deforma con
// el zoom.

export interface AccionesSeleccion {
  alinear: (modo: Alineacion) => void;
  repartir: (eje: Reparto) => void;
  igualar: (que: Igualado) => void;
  bloquear: (v: boolean) => void;
  duplicar: () => void;
  quitar: () => void;
}

const ALINEACIONES: Array<{ modo: Alineacion; icon: any; label: string }> = [
  { modo: 'izquierda', icon: AlignHorizontalJustifyStart,  label: 'Alinear a la izquierda' },
  { modo: 'centroH',   icon: AlignHorizontalJustifyCenter, label: 'Centrar en horizontal' },
  { modo: 'derecha',   icon: AlignHorizontalJustifyEnd,    label: 'Alinear a la derecha' },
  { modo: 'arriba',    icon: AlignVerticalJustifyStart,    label: 'Alinear arriba' },
  { modo: 'centroV',   icon: AlignVerticalJustifyCenter,   label: 'Centrar en vertical' },
  { modo: 'abajo',     icon: AlignVerticalJustifyEnd,      label: 'Alinear abajo' },
];

export default function BarraSeleccion({ ids, bloqueados, acciones }: {
  ids: string[];
  /** Cuántos de los marcados están bloqueados: decide si el botón bloquea o suelta. */
  bloqueados: number;
  acciones: AccionesSeleccion;
}) {
  const todosBloqueados = bloqueados === ids.length;
  const btn = 'w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0';
  const sep = <span className="w-px h-5 bg-slate-200 shrink-0" />;

  return (
    <NodeToolbar isVisible nodeId={ids} position={Position.Top} offset={20}>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl px-1.5 py-1.5 flex items-center gap-0.5 nodrag nopan">
        <span className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
          {ids.length} elementos
        </span>
        {sep}

        {ALINEACIONES.map(a => (
          <button key={a.modo} onClick={() => acciones.alinear(a.modo)} title={a.label} className={btn}>
            <a.icon className="w-4 h-4" />
          </button>
        ))}
        {sep}

        {/* Repartir necesita TRES: con dos no hay nada en medio que repartir. */}
        <button
          onClick={() => acciones.repartir('horizontal')}
          disabled={ids.length < 3}
          title={ids.length < 3 ? 'Repartir en horizontal (hacen falta 3)' : 'Repartir en horizontal — huecos iguales'}
          className={`${btn} disabled:opacity-30 disabled:hover:bg-transparent`}
        >
          <AlignHorizontalDistributeCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => acciones.repartir('vertical')}
          disabled={ids.length < 3}
          title={ids.length < 3 ? 'Repartir en vertical (hacen falta 3)' : 'Repartir en vertical — huecos iguales'}
          className={`${btn} disabled:opacity-30 disabled:hover:bg-transparent`}
        >
          <AlignVerticalDistributeCenter className="w-4 h-4" />
        </button>
        <button onClick={() => acciones.igualar('ambos')} title="Igualar el tamaño (manda la pieza más grande)" className={btn}>
          <Scaling className="w-4 h-4" />
        </button>
        {sep}

        <button onClick={() => acciones.duplicar()} title="Duplicar los marcados (⌘D)" className={btn}>
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={() => acciones.bloquear(!todosBloqueados)}
          title={todosBloqueados ? 'Desbloquear los marcados' : 'Bloquear los marcados'}
          className={btn}
        >
          {todosBloqueados ? <Lock className="w-4 h-4 text-amber-600" /> : <Unlock className="w-4 h-4" />}
        </button>
        <button
          onClick={() => acciones.quitar()}
          title="Quitarlos del lienzo (Supr) — siguen en la base de datos"
          className={`${btn} hover:!text-red-600 hover:!bg-red-50`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </NodeToolbar>
  );
}
