// A small line chart of one indicator over the 30 simulated years: syntropic vs today's model,
// with a cursor on the year being shown. Plain SVG; two series at most.

export default function Grafica({ titulo, unidad, a, b, t, decimales = 0, nota }: {
  titulo: string; unidad: string; a: { t: number; v: number }[]; b?: { t: number; v: number }[]; t: number; decimales?: number; nota?: string;
}) {
  const W = 300, H = 92, m = { l: 34, r: 6, t: 8, b: 16 };
  const max = Math.max(1e-6, ...a.map(x => x.v), ...(b ?? []).map(x => x.v)) * 1.08;
  const T = a[a.length - 1]?.t || 30;
  const X = (tt: number) => m.l + (tt / T) * (W - m.l - m.r), Y = (v: number) => H - m.b - (v / max) * (H - m.t - m.b);
  const linea = (s: { t: number; v: number }[]) => s.map((x, i) => `${i ? 'L' : 'M'}${X(x.t).toFixed(1)},${Y(x.v).toFixed(1)}`).join('');
  const valor = (s: { t: number; v: number }[]) => (s.reduce((bst, x) => Math.abs(x.t - t) < Math.abs(bst.t - t) ? x : bst, s[0])?.v ?? 0);
  const fmt = (v: number) => v.toLocaleString('es-ES', { maximumFractionDigits: decimales, minimumFractionDigits: decimales });
  return (
    <div className="rounded-xl border border-slate-800 p-2">
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-bold text-slate-200">{titulo}</span>
        <span className="font-mono"><span className="text-emerald-300">{fmt(valor(a))}</span>{b && <span className="text-amber-300"> / {fmt(valor(b))}</span>} <span className="text-slate-500">{unidad}</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {[0, 0.5, 1].map(f => <g key={f}><line x1={m.l} x2={W - m.r} y1={Y(max * f / 1.08)} y2={Y(max * f / 1.08)} stroke="#1e293b" /><text x={m.l - 3} y={Y(max * f / 1.08) + 3} fontSize={8} textAnchor="end" fill="#64748b">{fmt(max * f / 1.08)}</text></g>)}
        {[0, 10, 20, 30].map(x => <text key={x} x={X(x)} y={H - 4} fontSize={8} textAnchor="middle" fill="#64748b">{x}</text>)}
        {b && <path d={linea(b)} fill="none" stroke="#f59e0b" strokeWidth={1.6} strokeDasharray="4 3" />}
        <path d={linea(a)} fill="none" stroke="#34d399" strokeWidth={2} />
        <line x1={X(t)} x2={X(t)} y1={m.t} y2={H - m.b} stroke="#e2e8f0" strokeWidth={0.8} />
      </svg>
      {nota && <p className="text-[10px] leading-snug text-slate-500">{nota}</p>}
    </div>
  );
}
