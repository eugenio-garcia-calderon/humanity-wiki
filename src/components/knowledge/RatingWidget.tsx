import { useState } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// ============================================================================
// Valoración 0-10 (Fase 11) — media visible para todos, voto para registrados.
// ============================================================================

interface Props {
  entityType: string;
  entityId: string;
  avg: number | null;
  count: number;
  myScore: number | null;
  /** Notifica la nueva media agregada tras votar. */
  onRated?: (rating: { avg: number; count: number }, myScore: number) => void;
  compact?: boolean;
}

export default function RatingWidget({ entityType, entityId, avg, count, myScore, onRated, compact }: Props) {
  const { user } = useAuth();
  const [pending, setPending] = useState<number>(myScore ?? 7);
  const [saving, setSaving] = useState(false);

  const vote = async (score: number) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, score }),
      });
      const json = await res.json();
      if (res.ok) onRated?.(json.rating, json.my_score);
    } finally {
      setSaving(false);
    }
  };

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        {avg != null ? avg.toFixed(1) : '—'}
        {count > 0 && <span className="text-slate-400 font-medium">({count})</span>}
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        <span className="text-lg font-black text-slate-900">{avg != null ? avg.toFixed(1) : 'Sin votos'}</span>
        <span className="text-xs text-slate-400">{count === 1 ? '1 voto' : `${count} votos`} · escala 0-10</span>
      </div>
      {user ? (
        <div className="flex items-center gap-2">
          <input
            type="range" min={0} max={10} step={1}
            value={pending}
            onChange={e => setPending(Number(e.target.value))}
            onMouseUp={() => vote(pending)}
            onTouchEnd={() => vote(pending)}
            className="flex-1 accent-amber-500"
          />
          <span className="w-8 text-center text-sm font-black text-amber-600">{pending}</span>
          {myScore != null && <span className="text-[10px] text-slate-400">tu voto: {myScore}</span>}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400">Inicia sesión para valorar esta ventana.</p>
      )}
    </div>
  );
}
