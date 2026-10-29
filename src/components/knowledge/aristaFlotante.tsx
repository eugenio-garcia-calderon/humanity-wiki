import {
  BaseEdge, EdgeLabelRenderer, getStraightPath, useInternalNode,
  type EdgeProps, type InternalNode,
} from '@xyflow/react';

// ----------------------------------------------------------------------------
// Arista flotante: línea RECTA entre los bordes reales de los dos nodos.
// ----------------------------------------------------------------------------
// Nació en la pizarra de «Esquemas» (`pages/GrafoCanvas.tsx`); desde el 2026-10-29 la usa también la vista Sociedad
// del sitio (`sitio/VistaSociedadSitio.tsx`), por eso vive aquí y no dentro de la página.

export function getNodeIntersection(intersectionNode: InternalNode, targetNode: InternalNode) {
  const w = (intersectionNode.measured.width ?? 0) / 2;
  const h = (intersectionNode.measured.height ?? 0) / 2;
  const x2 = intersectionNode.internals.positionAbsolute.x + w;
  const y2 = intersectionNode.internals.positionAbsolute.y + h;
  const x1 = targetNode.internals.positionAbsolute.x + (targetNode.measured.width ?? 0) / 2;
  const y1 = targetNode.internals.positionAbsolute.y + (targetNode.measured.height ?? 0) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 };
}

export function FloatingEdge({ id, source, target, style, markerEnd, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const s = getNodeIntersection(sourceNode, targetNode);
  const t = getNodeIntersection(targetNode, sourceNode);
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: s.x, sourceY: s.y, targetX: t.x, targetY: t.y,
  });

  return (
    <>
      {/* Trazo invisible ancho debajo: hace la flecha fácil de clicar. */}
      <path d={edgePath} fill="none" strokeWidth={18} stroke="transparent" className="react-flow__edge-interaction" />
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {(data as any)?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: (style as any)?.stroke,
            }}
            className="nodrag nopan bg-white/90 border border-current rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
          >
            {(data as any).label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
