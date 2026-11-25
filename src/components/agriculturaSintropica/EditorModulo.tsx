// ============================================================================
// AGRICULTURA SINTRÓPICA · THE MODULE, SEEN FROM ABOVE (2026-11-25)
// ============================================================================
// Eugenio's top-view sketch made interactive: the module in the centre at full
// colour and its eight neighbours faded around it, so the geometry that REPEATS
// is visible. Every position can be dragged; the adult crowns can be drawn to see
// at a glance what will touch what. Distances are measured to the key (1).

import { useRef, useState } from 'react';
import type { Hueco } from './disenos';
import { rol, geometriaSonrisa } from './disenos';
import { ESPECIE } from './especies';
import { COLOR, COLOR_ROL } from './paleta';

const RADIO = [0, 0.5, 0.36, 0.27, 0.21, 0.16];

export default function EditorModulo({ huecos, ancho, largo, asign, copas, seleccion, onSeleccion, onMover, mediaLuna }: {
  huecos: Hueco[]; ancho: number; largo: number; mediaLuna?: boolean; asign: Record<string, string[]>; copas: boolean;
  seleccion: number | null; onSeleccion: (i: number | null) => void; onMover: (i: number, u: number, v: number) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [arrastre, setArrastre] = useState<number | null>(null);
  const k = 1;                                   // 1 unit = 1 m
  const margen = Math.max(ancho, largo) * 0.55;
  const vb = `${-ancho / 2 - margen} ${-largo / 2 - margen} ${ancho + 2 * margen} ${largo + 2 * margen}`;
  // label scale: readable for 4 m and 12 m modules alike, smaller when the module is crowded
  const s = (Math.max(ancho, largo) / 7) * (huecos.length > 30 ? 0.55 : 1);
  const clave = huecos.find(h => rol(h.etiqueta) === 1);
  const sel = seleccion != null ? huecos[seleccion] : null;

  const punto = (e: React.PointerEvent) => {
    const el = svg.current!; const pt = el.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(el.getScreenCTM()!.inverse());
    return { x: q.x, y: -q.y };
  };

  const dibujar = (dx: number, dy: number, activo: boolean) => huecos.map((h, i) => {
    const x = (h.u + dx) * ancho, y = (h.v + dy) * largo, r = rol(h.etiqueta);
    const esp = ESPECIE[(asign[h.etiqueta] ?? [])[0]];
    return (
      <g key={`${dx}${dy}${i}`} transform={`translate(${x * k} ${-y * k})`} opacity={activo ? 1 : 0.28}
        style={{ cursor: activo ? 'grab' : 'default' }}
        onPointerDown={activo ? (e => { e.stopPropagation(); (e.target as Element).setPointerCapture?.(e.pointerId); setArrastre(i); onSeleccion(i); }) : undefined}>
        {copas && esp && r <= 3 && <circle r={esp.copa / 2} fill={esp.color} fillOpacity={0.12} stroke={esp.color} strokeWidth={0.04} strokeDasharray="0.2 0.15" />}
        <circle r={RADIO[r] * s} fill={COLOR_ROL[r]} stroke={activo && seleccion === i ? '#0f172a' : '#5b6b5b'} strokeWidth={activo && seleccion === i ? 0.09 * s : 0.03 * s} />
        <text y={RADIO[r] * s * 0.36} fontSize={RADIO[r] * s * 0.95} textAnchor="middle" fill="#1f2937" style={{ pointerEvents: 'none', userSelect: 'none' }}>{h.etiqueta}</text>
        {activo && <title>{h.etiqueta} · {(asign[h.etiqueta] ?? []).map(id => ESPECIE[id]?.nombre).join(', ')}</title>}
      </g>
    );
  });

  return (
    <svg ref={svg} viewBox={vb} className="h-full w-full touch-none select-none"
      onPointerMove={e => { if (arrastre == null) return; const q = punto(e); onMover(arrastre, Math.max(-0.5, Math.min(0.4999, q.x / ancho)), Math.max(-0.5, Math.min(0.4999, q.y / largo))); }}
      onPointerUp={() => setArrastre(null)} onPointerLeave={() => setArrastre(null)}
      onPointerDown={() => onSeleccion(null)}>
      {[-1, 0, 1].flatMap(j => [-1, 0, 1].map(i => (
        <rect key={`${i}${j}`} x={(i - 0.5) * ancho} y={(-j - 0.5) * largo} width={ancho} height={largo}
          fill={COLOR.modulo} fillOpacity={i === 0 && j === 0 ? 1 : 0.4} stroke={COLOR.moduloBorde} strokeWidth={0.04} />
      )))}
      {mediaLuna && (() => {
        const g = geometriaSonrisa(ancho, largo);
        const pt = (r: number, a: number) => `${g.cx + r * Math.cos(a)},${-(g.cy + r * Math.sin(a))}`;
        return [-1, 0, 1].flatMap(j => [-1, 0, 1].map(i => (
          <path key={`l${i}${j}`} transform={`translate(${i * ancho} ${-j * largo})`} opacity={i || j ? 0.35 : 1}
            d={`M${pt(g.r2, g.a0)} A${g.r2},${g.r2} 0 0 1 ${pt(g.r2, g.a1)} L${pt(g.r1, g.a1)} A${g.r1},${g.r1} 0 0 0 ${pt(g.r1, g.a0)} Z`}
            fill={COLOR.sonrisa} fillOpacity={0.5} stroke={COLOR.piedra} strokeWidth={0.12} />
        )));
      })()}
      {[-1, 0, 1].flatMap(j => [-1, 0, 1].filter(i => i || j).map(i => <g key={`v${i}${j}`}>{dibujar(i, j, false)}</g>))}
      {sel && clave && sel !== clave && (() => {
        const x1 = clave.u * ancho, y1 = -clave.v * largo, x2 = sel.u * ancho, y2 = -sel.v * largo;
        const d = Math.hypot(x2 - x1, y2 - y1);
        return <g style={{ pointerEvents: 'none' }}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#0f172a" strokeWidth={0.04 * s} strokeDasharray={`${0.15 * s} ${0.1 * s}`} />
          <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 0.15 * s} fontSize={0.32 * s} textAnchor="middle" fill="#0f172a" stroke="white" strokeWidth={0.06 * s} paintOrder="stroke">{d.toFixed(2).replace('.', ',')} m</text>
        </g>;
      })()}
      {dibujar(0, 0, true)}
      <text x={ancho / 2 + margen * 0.85} y={-largo / 2 - margen * 0.7} fontSize={0.45 * s} textAnchor="end" fill="#334155" fontWeight="bold">N ↑</text>
      <text x={0} y={largo / 2 + margen * 0.5} fontSize={0.34 * s} textAnchor="middle" fill="#475569">{ancho.toFixed(1).replace('.', ',')} × {largo.toFixed(1).replace('.', ',')} m · se repite en toda la parcela</text>
    </svg>
  );
}
