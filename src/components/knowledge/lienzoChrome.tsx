import { useCallback, useRef } from 'react';
import { Handle, Position, NodeResizer, ViewportPortal } from '@xyflow/react';
import { RotateCw } from 'lucide-react';
import type { Guia } from '../../utils/alineacion';

// ============================================================================
// CROMADO DE SELECCIÓN — el marco estilo Miro (2026-08-08, petición del usuario)
// ============================================================================
// Cuando seleccionas un elemento del lienzo aparecen tres cosas:
//   · 4 TIRADORES en las esquinas para redimensionar (los del NodeResizer),
//   · 4 PUNTOS en los lados que sirven para CONECTAR con otro elemento,
//   · 1 TIRADOR de rotación, abajo a la izquierda y fuera del marco.
//
// Los puntos de conexión son `Handle` de React Flow en modo suelto
// (ConnectionMode.Loose): cada uno vale como origen Y como destino, así que
// clicas uno y luego clicas el otro elemento — o arrastras, si prefieres.
// El lienzo lleva `connectOnClick`, que es lo que hace que el clic simple
// baste, como en Miro.

const LADOS = [
  { id: 'top', pos: Position.Top, css: { top: -7, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'right', pos: Position.Right, css: { right: -7, top: '50%', transform: 'translateY(-50%)' } },
  { id: 'bottom', pos: Position.Bottom, css: { bottom: -7, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'left', pos: Position.Left, css: { left: -7, top: '50%', transform: 'translateY(-50%)' } },
] as const;

/** Los 4 puntos de conexión de los lados. */
export function PuntosConexion({ visible }: { visible: boolean }) {
  return (
    <>
      {LADOS.map(l => (
        <Handle
          key={l.id}
          id={l.id}
          type="source"
          position={l.pos}
          title="Clic aquí y luego en otro elemento para conectarlos"
          className="!rounded-full !border-2 !border-white !bg-blue-500 hover:!bg-blue-600 hover:!scale-125 !transition-all"
          style={{
            ...l.css,
            width: 13, height: 13, zIndex: 6,
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
            boxShadow: '0 1px 4px rgb(0 0 0 / 0.3)',
          }}
        />
      ))}
    </>
  );
}

/**
 * Tirador de rotación. Calcula el ángulo entre el centro del elemento y el
 * ratón, así que gira siguiendo la mano en vez de por pasos.
 */
export function TiradorRotar({ visible, rot, onCambio, onFin }: {
  visible: boolean;
  rot: number;
  onCambio: (grados: number) => void;
  onFin: (grados: number) => void;
}) {
  const centro = useRef<{ x: number; y: number; base: number } | null>(null);
  const ultimo = useRef(rot);

  const alPulsar = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // El nodo entero es el ancestro que React Flow posiciona.
    const nodo = (e.currentTarget as HTMLElement).closest('.react-flow__node') as HTMLElement | null;
    if (!nodo) return;
    const r = nodo.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const inicial = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    centro.current = { x: cx, y: cy, base: inicial - rot };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [rot]);

  const alMover = useCallback((e: React.PointerEvent) => {
    const c = centro.current;
    if (!c) return;
    e.stopPropagation();
    let g = Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI - c.base;
    // Con Shift, de 15 en 15 grados: para dejarlo recto sin pelearse.
    if (e.shiftKey) g = Math.round(g / 15) * 15;
    g = Math.round(g);
    ultimo.current = g;
    onCambio(g);
  }, [onCambio]);

  const alSoltar = useCallback((e: React.PointerEvent) => {
    if (!centro.current) return;
    e.stopPropagation();
    centro.current = null;
    onFin(ultimo.current);
  }, [onFin]);

  return (
    <button
      onPointerDown={alPulsar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onClick={e => e.stopPropagation()}
      title="Girar (con Shift, de 15 en 15 grados)"
      className="nodrag nopan absolute -bottom-9 -left-9 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
      style={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none', zIndex: 6, cursor: 'grab' }}
    >
      <RotateCw className="w-3.5 h-3.5" />
    </button>
  );
}

/** Solo las 4 esquinas: los lados se reservan para los puntos de conexión. */
export function TiradoresTamano({ visible, minW = 140, minH = 90, keepAspectRatio = false, onFin }: {
  visible: boolean;
  minW?: number;
  minH?: number;
  /** Para los círculos (relación): que no se puedan ovalar. */
  keepAspectRatio?: boolean;
  onFin: (w: number, h: number) => void;
}) {
  return (
    <NodeResizer
      isVisible={visible}
      minWidth={minW}
      minHeight={minH}
      keepAspectRatio={keepAspectRatio}
      lineClassName="!border-transparent"
      handleClassName="!w-2.5 !h-2.5 !rounded-full !bg-white !border-2 !border-blue-500"
      onResizeEnd={(_, p) => onFin(Math.round(p.width), Math.round(p.height))}
    />
  );
}

/** El marco azul que rodea al elemento seleccionado. */
export function MarcoSeleccion({ visible, radio = 16 }: { visible: boolean; radio?: number }) {
  return (
    <div
      className="absolute pointer-events-none transition-opacity duration-150"
      style={{
        inset: -3,
        border: '2px solid #3b82f6',
        borderRadius: radio,
        opacity: visible ? 1 : 0,
        zIndex: 4,
      }}
    />
  );
}

/**
 * GUÍAS DE ALINEACIÓN (2026-08-22) — las líneas rosas que salen al arrastrar
 * cuando la pieza que llevas se pone a la altura de otra. Es lo que convierte
 * «colocar a ojo» en «colocar bien» sin tener que abrir ninguna barra.
 *
 * Van dentro de `ViewportPortal`, así que se dibujan en coordenadas DEL
 * LIENZO y se mueven y escalan con él. El grosor llega ya dividido por el
 * zoom: una línea de 1,5 px de pantalla, esté donde esté el zoom.
 */
export function GuiasAlineado({ guias, grosor = 1.5 }: { guias: Guia[]; grosor?: number }) {
  if (!guias.length) return null;
  return (
    <ViewportPortal>
      {guias.map((g, i) => (
        <div
          key={`${g.eje}-${g.v}-${i}`}
          className="pointer-events-none"
          style={g.eje === 'x'
            ? {
                position: 'absolute', zIndex: 30, background: '#ec4899',
                left: g.v, top: g.desde, width: grosor, height: g.hasta - g.desde,
                transform: `translateX(${-grosor / 2}px)`,
              }
            : {
                position: 'absolute', zIndex: 30, background: '#ec4899',
                top: g.v, left: g.desde, height: grosor, width: g.hasta - g.desde,
                transform: `translateY(${-grosor / 2}px)`,
              }}
        />
      ))}
    </ViewportPortal>
  );
}
