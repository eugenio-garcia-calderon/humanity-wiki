// ============================================================================
// DISEÑO 1 · ILUSTRACIÓN DE SEGURIDAD: «Desmantelamiento militar progresivo»
// (2026-11-28, en construcción)
// ============================================================================
// Eugenio: «buscamos un mundo donde la seguridad está descentralizada desde el individuo que protege a su familia,
// la comunidad que protege a sus familias, el pueblo que protege a sus comunidades, las regiones que protegen a sus
// pueblos». So the picture is those rings, each one protecting the one inside, with an olive branch over them, and
// a small «en construcción» mark: the project is not published yet, only its vision.
// Same language as the other cards: 320×128, thin strokes, one caption, one bold line.

export const FONDOS: Record<string, string> = {
  VisualDesmantelamiento: 'bg-gradient-to-br from-blue-50 via-white to-emerald-50',
};

const ANILLOS = [
  { r: 13, n: 'Persona', c: 'stroke-blue-600', f: 'fill-blue-100' },
  { r: 24, n: 'Familia', c: 'stroke-blue-500', f: 'fill-blue-50' },
  { r: 37, n: 'Comunidad', c: 'stroke-blue-400', f: 'fill-white' },
  { r: 50, n: 'Pueblo', c: 'stroke-blue-300', f: 'fill-white' },
  { r: 63, n: 'Región', c: 'stroke-blue-200', f: 'fill-white' },
];
const CX = 224, CY = 68;
const r1 = (n: number) => Math.round(n * 10) / 10;

export function VisualDesmantelamiento() {
  return (
    <svg viewBox="0 0 320 128" className="h-full w-full" role="img"
      aria-label="Anillos que se protegen unos a otros: la persona, la familia, la comunidad, el pueblo y la región, con una rama de olivo encima; el proyecto está en construcción">
      {/* The rings, from the region inwards */}
      {[...ANILLOS].reverse().map(a => (
        <ellipse key={a.n} cx={CX} cy={CY} rx={a.r * 1.15} ry={a.r * 0.82} className={`${a.f} ${a.c}`} strokeWidth={1.4} />
      ))}
      {/* Labels at the bottom of each ring, from the centre outwards */}
      {ANILLOS.map((a, i) => (
        <text key={a.n} x={CX} y={r1(CY + a.r * 0.82 + 3)} textAnchor="middle"
          className={`${i === 0 ? 'fill-blue-700 font-bold' : 'fill-slate-500 font-semibold'} text-[7.5px] [paint-order:stroke] [stroke:white] [stroke-width:3px]`}>{a.n}</text>
      ))}
      {/* The person at the centre */}
      <circle cx={CX} cy={CY - 5} r={3} className="fill-blue-700" />
      <path d={`M${CX - 4.5},${CY + 6} C${CX - 4.5},${CY} ${CX + 4.5},${CY} ${CX + 4.5},${CY + 6}`} className="fill-blue-700" />
      {/* Olive branch over the rings */}
      <g transform={`translate(${CX - 30} 14)`}>
        <path d="M0,10 C18,2 38,0 60,4" fill="none" className="stroke-emerald-600" strokeWidth={1.4} strokeLinecap="round" />
        {[[8, 7, -30], [16, 4.6, 20], [24, 3.2, -25], [32, 2.4, 25], [40, 2, -20], [48, 2.4, 25], [55, 3.2, -15]].map(([x, y, a], i) => (
          <ellipse key={i} cx={x} cy={y + (i % 2 ? 3 : -3)} rx={4.2} ry={1.7} className="fill-emerald-400" transform={`rotate(${a} ${x} ${y + (i % 2 ? 3 : -3)})`} />
        ))}
        <circle cx={60} cy={4} r={2} className="fill-emerald-700" />
      </g>

      {/* The words */}
      <g transform="translate(14 0)">
        <rect x={0} y={16} width={86} height={14} rx={7} className="fill-amber-100" />
        <text x={43} y={26} textAnchor="middle" className="fill-amber-800 text-[7.5px] font-bold uppercase tracking-[0.12em]">En construcción</text>
        <text y={52} className="fill-slate-900 text-[14px] font-bold tracking-tight">Seguridad cercana,</text>
        <text y={66} className="fill-slate-500 text-[9.5px]">de la persona a la región</text>
        <text y={78} className="fill-slate-500 text-[9.5px]">y en paz</text>
      </g>
    </svg>
  );
}
