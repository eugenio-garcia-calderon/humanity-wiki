import { useEffect, useState } from 'react';
import { Send, User as UserIcon } from 'lucide-react';
import { useAuth, ROLE } from '../../contexts/AuthContext';

// ============================================================================
// Comentarios polimórficos (Fase 11) — sirven para ventanas de conocimiento,
// grafos o cualquier entidad, vía /api/comments?entity_type&entity_id.
// ============================================================================

interface Comment {
  id: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export default function EntityComments({ entityType, entityId, onCountChange }: {
  entityType: string;
  entityId: string;
  onCountChange?: (n: number) => void;
}) {
  const { can } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/comments?entity_type=${entityType}&entity_id=${encodeURIComponent(entityId)}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setComments(Array.isArray(json) ? json : []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entity_type: entityType, entity_id: entityId, body }),
      });
      const json = await res.json();
      if (res.ok) {
        setComments(c => { onCountChange?.(c.length + 1); return [...c, json]; });
        setText('');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Comentarios {comments.length > 0 && `(${comments.length})`}
      </p>
      {loading && <p className="text-xs text-slate-400">Cargando…</p>}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-slate-400 italic">Sin comentarios todavía.</p>
      )}
      {comments.map(c => (
        <div key={c.id} className="flex gap-2 text-xs">
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
            <UserIcon className="w-3 h-3" />
          </span>
          <div className="flex-1 bg-slate-50 rounded-xl px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">{c.author_name || 'Alguien'}</span>
              <span className="text-slate-400 text-[10px]">{timeAgo(c.created_at)}</span>
            </div>
            <p className="text-slate-600 leading-relaxed">{c.body}</p>
          </div>
        </div>
      ))}
      {can(ROLE.USER) && (
        <div className="flex items-center gap-2 pt-1">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') send(); }}
            placeholder="Escribe un comentario…"
            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-none focus:border-emerald-300"
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
