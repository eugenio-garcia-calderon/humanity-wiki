import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { X } from 'lucide-react';

interface Cause {
  id: string;
  title: string;
  type: string | null;
  description: string | null;
  percentage: number | null;
}

// Pastel palette, one per segment, in the same clockwise order the reference
// design used (warm colors for the biggest human-driven causes, cooler colors
// for the smaller natural/structural ones).
const COLORS = ['#ef9c86', '#f3b673', '#ecd17e', '#a9c6a0', '#93b7d6', '#c6a9d3'];

interface CauseDonutChartProps {
  challengeId: string;
  challengeTitle: string;
  territoryName: string;
  onClose: () => void;
}

export default function CauseDonutChart({ challengeId, challengeTitle, territoryName, onClose }: CauseDonutChartProps) {
  const [causes, setCauses] = useState<Cause[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSelectedId(null);
    fetch(`/api/challenges/${challengeId}/causes`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setCauses(json); })
      .catch(() => { if (!cancelled) setCauses([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [challengeId]);

  const selectedCause = causes?.find(c => c.id === selectedId) || null;

  const renderLabel = (props: any) => {
    if (!causes) return null;
    const { cx, cy, midAngle, outerRadius, index } = props;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const cause = causes[index];
    return (
      <g>
        <text x={x} y={y - 6} textAnchor="middle" className="fill-slate-800 font-black text-base">
          {Math.round(cause.percentage || 0)}%
        </text>
        <text x={x} y={y + 12} textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold">
          {cause.title}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Causas del reto</h3>
        <button onClick={onClose} className="p-1 text-slate-300 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors" title="Cerrar gráfico">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading && <div className="text-sm text-slate-400 py-8 text-center">Cargando...</div>}

      {!loading && causes && causes.length === 0 && (
        <p className="text-sm text-slate-400 italic py-4">Este reto todavía no tiene causas registradas.</p>
      )}

      {!loading && causes && causes.length > 0 && (
        <>
          <div className="relative" style={{ height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={causes}
                  dataKey="percentage"
                  nameKey="title"
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="76%"
                  paddingAngle={2}
                  stroke="#fff"
                  strokeWidth={3}
                  label={renderLabel}
                  labelLine={false}
                  isAnimationActive={false}
                  onClick={(_: any, index: number) => {
                    const clicked = causes[index];
                    setSelectedId(prev => (clicked.id === prev ? null : clicked.id));
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {causes.map((c, i) => (
                    <Cell key={c.id} fill={COLORS[i % COLORS.length]} opacity={selectedId && selectedId !== c.id ? 0.4 : 1} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center label overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-10 text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Reto de</p>
              <p className="text-lg font-black text-slate-900 uppercase leading-tight">{challengeTitle}</p>
              <div className="w-8 h-px bg-slate-200 my-1.5" />
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{territoryName}</p>
            </div>
          </div>

          {selectedCause ? (
            <div className="mt-1 p-3 rounded-xl bg-slate-50 border border-slate-100 animate-in fade-in duration-200">
              <p className="text-xs font-bold text-slate-800 mb-1">{selectedCause.title} · {Math.round(selectedCause.percentage || 0)}%</p>
              <p className="text-xs text-slate-500 leading-relaxed">{selectedCause.description || 'Sin descripción adicional.'}</p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-300 italic text-center mt-1">Pincha en una causa para ver más detalle.</p>
          )}
        </>
      )}
    </div>
  );
}
