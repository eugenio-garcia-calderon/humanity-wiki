import { CROMADO } from '../../utils/graficas/colores';
import { rotuloEje, rotuloTiempo, type Unidad } from '../../utils/graficas/formato';
import type { Marco } from './lienzo';

// ============================================================================
// LOS EJES (2026-08-23)
// ============================================================================
// Discretos por norma: la rejilla es una línea de un píxel del color más
// apagado que hay, y va DEBAJO de los datos. Un eje que compite con los datos
// es un eje mal dibujado.
//
// No se dibuja el marco completo de la caja, solo la línea de base: las cuatro
// paredes encierran la gráfica y no aportan ninguna información.

export function EjeY({ marco, marcas, escala, unidad }: {
  marco: Marco;
  marcas: number[];
  escala: (v: number) => number;
  unidad?: Unidad;
}) {
  return (
    <g>
      {marcas.map(v => {
        const y = escala(v);
        if (!Number.isFinite(y) || y < marco.y0 - 1 || y > marco.y1 + 1) return null;
        return (
          <g key={v}>
            <line x1={marco.x0} x2={marco.x1} y1={y} y2={y} stroke={CROMADO.rejilla} strokeWidth={1} />
            <text
              x={marco.x0 - 8} y={y} dy="0.32em" textAnchor="end"
              fill={CROMADO.tintaApagada} fontSize={11}
            >
              {rotuloEje(v, unidad)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function EjeX({ marco, marcas, escala, porDias }: {
  marco: Marco;
  marcas: number[];
  escala: (v: number) => number;
  porDias?: boolean;
}) {
  return (
    <g>
      <line
        x1={marco.x0} x2={marco.x1} y1={marco.y1} y2={marco.y1}
        stroke={CROMADO.ejeBase} strokeWidth={1}
      />
      {marcas.map(v => {
        const x = escala(v);
        if (!Number.isFinite(x) || x < marco.x0 - 1 || x > marco.x1 + 1) return null;
        return (
          <text
            key={v} x={x} y={marco.y1 + 16} textAnchor="middle"
            fill={CROMADO.tintaApagada} fontSize={11}
          >
            {rotuloTiempo(v, !!porDias)}
          </text>
        );
      })}
    </g>
  );
}
