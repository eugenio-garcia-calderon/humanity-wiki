import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Bookmark, Send, User as UserIcon } from 'lucide-react';
import { useAuth, ROLE } from '../contexts/AuthContext';
import { useHelpers } from '../contexts/DataContext';
import { resolveEntityLink } from '../utils/entityLinks';
import { cn } from '../utils/cn';

// ============================================================================
// Muro — Fase 4 (interfaz)
// ============================================================================
// Implementa 06_SOCIAL_NETWORK.md. La API ya existía completa (GET /api/feed,
// POST /api/publications, /api/react, /api/save, /comments) — esta es la
// interfaz que faltaba: composer, feed con relevancia, comentarios
// expandibles, reacción y guardado.

interface Publication {
  id: string;
  author_user_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  title: string | null;
  body: string | null;
  created_at: string;
  entity_links: { type: string; id: string }[];
  reaction_count: number;
  comment_count: number;
  reacted_by_me: boolean;
}

interface Comment {
  id: string;
  author_user_id: string | null;
  author_name: string | null;
  body: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-ES');
}

function EntityBadges({ links }: { links: Publication['entity_links'] }) {
  const helpers = useHelpers();
  if (!links?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2.5">
      {links.map((l, i) => {
        const resolved = resolveEntityLink(l.type, l.id, helpers);
        const badge = (
          <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
            {resolved.label}
          </span>
        );
        return resolved.to ? (
          <Link key={i} to={resolved.to} className="hover:opacity-80 transition-opacity">{badge}</Link>
        ) : (
          <span key={i}>{badge}</span>
        );
      })}
    </div>
  );
}

function CommentsSection({ publicationId }: { publicationId: string }) {
  const { user, can } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/publications/${publicationId}/comments`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setComments(Array.isArray(json) ? json : []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [publicationId]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/publications/${publicationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (res.ok) {
        setComments(c => [...c, json]);
        setText('');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
      {loading && <p className="text-xs text-slate-400">Cargando comentarios…</p>}
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

function PublicationCard({ pub, onReact, onSave }: {
  pub: Publication;
  onReact: (id: string) => void;
  onSave: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        {pub.author_avatar ? (
          <img src={pub.author_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <span className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <UserIcon className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {pub.author_user_id ? (
            <Link to={`/personas/${pub.author_user_id}`} className="text-sm font-bold text-slate-800 hover:text-emerald-700 transition-colors">
              {pub.author_name || 'Alguien'}
            </Link>
          ) : (
            <span className="text-sm font-bold text-slate-800">{pub.author_name || 'Alguien'}</span>
          )}
          <p className="text-[10px] text-slate-400">{timeAgo(pub.created_at)}</p>
        </div>
      </div>

      {pub.title && <h3 className="text-base font-black text-slate-900 mt-3">{pub.title}</h3>}
      {pub.body && <p className="text-sm text-slate-600 leading-relaxed mt-1.5 whitespace-pre-wrap">{pub.body}</p>}

      <EntityBadges links={pub.entity_links} />

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
        <button
          onClick={() => onReact(pub.id)}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold transition-colors',
            pub.reacted_by_me ? 'text-rose-600' : 'text-slate-400 hover:text-rose-600'
          )}
        >
          <Heart className={cn('w-4 h-4', pub.reacted_by_me && 'fill-rose-600')} />
          {pub.reaction_count}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {pub.comment_count}
        </button>
        <button
          onClick={() => { onSave(pub.id); setSaved(s => !s); }}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-bold transition-colors ml-auto',
            saved ? 'text-amber-600' : 'text-slate-400 hover:text-amber-600'
          )}
        >
          <Bookmark className={cn('w-4 h-4', saved && 'fill-amber-500')} />
        </button>
      </div>

      {showComments && <CommentsSection publicationId={pub.id} />}
    </div>
  );
}

export default function Muro() {
  const { user, can } = useAuth();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadFeed = () => {
    setLoading(true);
    fetch('/api/feed', { credentials: 'include' })
      .then(r => r.json())
      .then(json => setPublications(Array.isArray(json) ? json : []))
      .catch(() => setPublications([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadFeed(); }, []);

  const publish = async () => {
    const body = text.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/publications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setText('');
        loadFeed();
      }
    } finally {
      setPosting(false);
    }
  };

  const react = async (id: string) => {
    setPublications(pubs => pubs.map(p => p.id === id
      ? { ...p, reacted_by_me: !p.reacted_by_me, reaction_count: p.reaction_count + (p.reacted_by_me ? -1 : 1) }
      : p));
    try {
      await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entity_type: 'publications', entity_id: id }),
      });
    } catch { /* el estado optimista se corrige en el próximo loadFeed */ }
  };

  const save = async (id: string) => {
    try {
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entity_type: 'publications', entity_id: id }),
      });
    } catch { /* ignorado */ }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-16 space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-2">Muro</h2>
        <p className="text-base text-slate-500 leading-relaxed">
          Lo que la comunidad está compartiendo, priorizado por lo que sigues.
        </p>
      </div>

      {can(ROLE.USER) ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder={`¿Qué quieres compartir, ${user?.displayName || ''}?`}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-colors"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={publish}
              disabled={posting || !text.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Publicar
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700">
          <Link to="/login" className="font-bold underline">Inicia sesión</Link> para publicar, reaccionar y comentar.
        </div>
      )}

      {loading && <p className="text-sm text-slate-400 py-12 text-center">Cargando…</p>}

      {!loading && publications.length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl">
          <p className="text-sm text-slate-400 italic">Todavía no hay publicaciones. Sé el primero.</p>
        </div>
      )}

      <div className="space-y-4">
        {publications.map(p => (
          <PublicationCard key={p.id} pub={p} onReact={react} onSave={save} />
        ))}
      </div>
    </div>
  );
}
