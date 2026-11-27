// ============================================================================
// DISEÑO 1 · ILUSTRACIÓN DE SALUD: la plataforma de agregación del conocimiento
// de la medicina (2026-11-27)
// ============================================================================
// Same language as the other cards (`energia.tsx`, `otras.tsx`): 320×128, thin strokes,
// Tailwind colour classes, one small spaced caption, one bold line.
//
// The picture is the platform's promise: one network in which every branch of medicine
// hangs from the same centre, with its own sub-branches. On the left, the three ways the lab
// already draws knowledge (map, diagram, branches), which is what the platform will reuse.
// The branch names are examples of fields, not a list of the platform's contents.

const r1 = (n: number) => Math.round(n * 10) / 10;

export const FONDOS: Record<string, string> = {
  VisualConocimientoMedicina: 'bg-gradient-to-br from-red-50 via-white to-sky-50',
};

const CX = 230, CY = 64;
/** The six main branches: angle in degrees (0 = right, clockwise), colour, name, label side. */
const RAMAS: Array<{ a: number; trazo: string; nodo: string; n: string }> = [
  { a: -150, trazo: 'stroke-sky-400', nodo: 'fill-sky-500', n: 'Neurología' },
  { a: -90, trazo: 'stroke-red-400', nodo: 'fill-red-500', n: 'Cardiología' },
  { a: -30, trazo: 'stroke-emerald-400', nodo: 'fill-emerald-500', n: 'Nutrición' },
  { a: 30, trazo: 'stroke-violet-400', nodo: 'fill-violet-500', n: 'Psiquiatría' },
  { a: 90, trazo: 'stroke-amber-400', nodo: 'fill-amber-500', n: 'Pediatría' },
  { a: 150, trazo: 'stroke-teal-400', nodo: 'fill-teal-500', n: 'Inmunología' },
];
const RX1 = 44, RY1 = 33, RX2 = 66, RY2 = 50;
const punto = (a: number, rx: number, ry: number): [number, number] => [r1(CX + rx * Math.cos(a * Math.PI / 180)), r1(CY + ry * Math.sin(a * Math.PI / 180))];

export function VisualConocimientoMedicina() {
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Una red con la medicina en el centro y sus ramas alrededor, cada una con sus subramas: el conocimiento de la medicina reunido en un solo mapa">
      {/* Rings: where the branches and the sub-branches sit */}
      <ellipse cx={CX} cy={CY} rx={RX1} ry={RY1} fill="none" className="stroke-slate-200" strokeWidth={0.7} strokeDasharray="2 3" />
      <ellipse cx={CX} cy={CY} rx={RX2} ry={RY2} fill="none" className="stroke-slate-100" strokeWidth={0.7} strokeDasharray="2 3" />

      {/* Sub-branches first, behind */}
      {RAMAS.map(r => [-14, 0, 14].map(d => {
        const [x1, y1] = punto(r.a, RX1, RY1), [x2, y2] = punto(r.a + d, RX2, RY2);
        const [mx, my] = punto(r.a + d / 2, (RX1 + RX2) / 2, (RY1 + RY2) / 2);
        return (
          <g key={`${r.n}${d}`}>
            <path d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} fill="none" className={r.trazo} strokeWidth={0.8} opacity={0.55} />
            <circle cx={x2} cy={y2} r={1.9} className={r.nodo} opacity={0.45} />
          </g>
        );
      }))}
      {/* Main branches */}
      {RAMAS.map(r => {
        const [x, y] = punto(r.a, RX1, RY1), [mx, my] = punto(r.a - 12, RX1 * 0.55, RY1 * 0.55);
        return <path key={r.n} d={`M${CX},${CY} Q${mx},${my} ${x},${y}`} fill="none" className={r.trazo} strokeWidth={1.6} strokeLinecap="round" />;
      })}
      {RAMAS.map(r => {
        const [x, y] = punto(r.a, RX1, RY1);
        const derecha = Math.cos(r.a * Math.PI / 180) > 0.1, izquierda = Math.cos(r.a * Math.PI / 180) < -0.1;
        const tx = derecha ? x + 6 : izquierda ? x - 6 : x;
        const ty = Math.abs(r.a) === 90 ? (r.a < 0 ? y - 6 : y + 11) : y + 3;
        return (
          <g key={r.n}>
            <circle cx={x} cy={y} r={4.2} className={`${r.nodo} stroke-white`} strokeWidth={1.4} />
            <text x={r1(tx)} y={r1(ty)} textAnchor={derecha ? 'start' : izquierda ? 'end' : 'middle'}
              className="fill-slate-600 text-[7.5px] font-semibold [paint-order:stroke] [stroke:white] [stroke-width:2.5px]">{r.n}</text>
          </g>
        );
      })}
      {/* The centre: medicine, as one */}
      <circle cx={CX} cy={CY} r={16} className="fill-red-100" />
      <circle cx={CX} cy={CY} r={11.5} className="fill-red-500" />
      <path d={`M${CX - 6},${CY + 0.5}h2.8l1.4-3.2 2.2,6 1.7-4.4 1,1.6h3`} fill="none" className="stroke-white" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />

      {/* The words */}
      <text x={14} y={26} className="fill-slate-500 text-[9px] uppercase tracking-[0.14em]">Conocimiento médico</text>
      <text x={14} y={50} className="fill-slate-900 text-[14px] font-bold tracking-tight">Toda la medicina,</text>
      <text x={14} y={64} className="fill-slate-500 text-[9.5px]">unida en un solo mapa</text>

      {/* The three ways of drawing it the lab already uses */}
      <g transform="translate(14 86)">
        {/* map */}
        <rect x={0} y={0} width={22} height={16} rx={3} className="fill-white stroke-slate-300" strokeWidth={0.8} />
        <path d="M3,12 L8,5 L12,9 L16,4 L19,11" fill="none" className="stroke-sky-400" strokeWidth={1} strokeLinejoin="round" />
        <circle cx={16} cy={4} r={1.3} className="fill-red-500" />
        <text x={11} y={26} textAnchor="middle" className="fill-slate-500 text-[7.5px]">mapa</text>
        {/* diagram */}
        <g transform="translate(30 0)">
          <rect x={0} y={0} width={22} height={16} rx={3} className="fill-white stroke-slate-300" strokeWidth={0.8} />
          <rect x={3} y={3} width={6} height={4} rx={1} className="fill-emerald-300" />
          <rect x={3} y={9} width={6} height={4} rx={1} className="fill-emerald-300" />
          <rect x={13} y={6} width={6} height={4} rx={1} className="fill-emerald-500" />
          <path d="M9,5h2v3h2M9,11h2V8" fill="none" className="stroke-slate-400" strokeWidth={0.7} />
          <text x={11} y={26} textAnchor="middle" className="fill-slate-500 text-[7.5px]">esquema</text>
        </g>
        {/* branches */}
        <g transform="translate(60 0)">
          <rect x={0} y={0} width={22} height={16} rx={3} className="fill-white stroke-slate-300" strokeWidth={0.8} />
          <path d="M5,8 Q9,8 11,4 M5,8 Q9,8 11,12 M11,4h5M11,4l5,3M11,12h5M11,12l5,-3" fill="none" className="stroke-violet-400" strokeWidth={0.9} strokeLinecap="round" />
          <circle cx={5} cy={8} r={1.6} className="fill-violet-500" />
          <text x={11} y={26} textAnchor="middle" className="fill-slate-500 text-[7.5px]">ramas</text>
        </g>
      </g>
    </svg>
  );
}
