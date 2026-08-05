import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User as UserIcon, MapPin, Globe, Heart, UserPlus, UserCheck, Award, Network, Eye, AppWindow, Plus, Sparkles, Star } from 'lucide-react';
import { useAuth, ROLE } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import EmbeddedCheckoutModal from '../components/stripe/EmbeddedCheckoutModal';
import CreateGraphModal from '../components/knowledge/CreateGraphModal';

// ============================================================================
// Perfil público — Fase 4 (interfaz)
// ============================================================================
// GET /api/users/:id/profile y GET /api/publications?author_id ya existían;
// esta página los junta con seguir (POST /api/follow) y apoyar económicamente
// (Checkout embebido de Stripe, ya construido en la Fase 6).

interface ProfileUser {
  id: string;
  display_name: string | null;
  name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  reputation: number;
  impact_score: number;
  role_level: number;
}

interface Publication {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string;
  reaction_count: number;
  comment_count: number;
}

const SUPPORT_AMOUNTS = [500, 1000, 2500]; // céntimos

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diffMs / 86400000);
  if (d < 1) return 'hoy';
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-ES');
}

export default function PersonaPublica() {
  const { id } = useParams();
  const { user: me, can } = useAuth();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, publications: 0 });
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [supportStep, setSupportStep] = useState<'amount' | 'checkout' | null>(null);
  const [supportAmount, setSupportAmount] = useState(SUPPORT_AMOUNTS[0]);
  const [graphs, setGraphs] = useState<any[]>([]);
  const [showCreateGraph, setShowCreateGraph] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/users/${id}/profile`).then(r => r.json()),
      fetch(`/api/publications?author_id=${id}`).then(r => r.json()),
      fetch(`/api/graphs?creator_id=${id}`, { credentials: 'include' }).then(r => r.json()),
    ]).then(([profileJson, pubsJson, graphsJson]) => {
      if (cancelled) return;
      setProfileUser(profileJson.user || null);
      setStats(profileJson.stats || { followers: 0, following: 0, publications: 0 });
      setPubs(Array.isArray(pubsJson) ? pubsJson : []);
      setGraphs(Array.isArray(graphsJson) ? graphsJson : []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const toggleFollow = async () => {
    if (!id) return;
    setFollowing(f => !f);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ entity_type: 'users', entity_id: id }),
      });
      const json = await res.json();
      if (res.ok) setFollowing(!!json.following);
    } catch { setFollowing(f => !f); }
  };

  if (loading) return <p className="text-sm text-slate-400 py-12 text-center">Cargando…</p>;
  if (!profileUser) return <p className="text-sm text-slate-400 py-12 text-center">Persona no encontrada.</p>;

  const isMe = me?.id === id;

  return (
    <div className="animate-in fade-in duration-500 pb-16 max-w-2xl mx-auto">
      <div className="relative h-32 sm:h-40 rounded-3xl bg-gradient-to-br from-emerald-100 via-teal-50 to-indigo-100 overflow-hidden">
        {profileUser.banner_url && (
          <img src={profileUser.banner_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-4 sm:px-6 -mt-10 relative flex items-end justify-between gap-3">
        {profileUser.avatar_url ? (
          <img src={profileUser.avatar_url} alt="" className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md" />
        ) : (
          <span className="w-20 h-20 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-slate-400 shadow-md">
            <UserIcon className="w-8 h-8" />
          </span>
        )}

        {!isMe && (
          <div className="flex items-center gap-2 pb-1">
            {can(ROLE.USER) && (
              <button
                onClick={toggleFollow}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-colors',
                  following
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                )}
              >
                {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                {following ? 'Siguiendo' : 'Seguir'}
              </button>
            )}
            <button
              onClick={() => { setSupportAmount(SUPPORT_AMOUNTS[0]); setSupportStep('amount'); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <Heart className="w-3.5 h-3.5" />
              Apoyar
            </button>
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 mt-3">
        <h1 className="text-2xl font-black text-slate-900">{profileUser.display_name || profileUser.name || 'Persona'}</h1>
        {profileUser.bio && <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{profileUser.bio}</p>}

        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
          {profileUser.location && (
            <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profileUser.location}</span>
          )}
          {profileUser.website && (
            <a href={profileUser.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-emerald-600 transition-colors">
              <Globe className="w-3.5 h-3.5" />{profileUser.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {profileUser.reputation > 0 && (
            <span className="inline-flex items-center gap-1"><Award className="w-3.5 h-3.5" />{profileUser.reputation} de reputación</span>
          )}
        </div>

        <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-100 text-sm">
          <span><b className="text-slate-900">{stats.publications}</b> <span className="text-slate-400">publicaciones</span></span>
          <span><b className="text-slate-900">{stats.followers}</b> <span className="text-slate-400">seguidores</span></span>
          <span><b className="text-slate-900">{stats.following}</b> <span className="text-slate-400">siguiendo</span></span>
        </div>
      </div>

      {/* Grafos de Conocimiento: la carta de presentación de la persona —
          en qué está trabajando, contado de forma conectada. */}
      <div className="px-4 sm:px-6 mt-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
            <Network className="w-4 h-4 text-emerald-600" /> Grafos de Conocimiento
          </h2>
          {isMe && (
            <button onClick={() => setShowCreateGraph(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold transition-colors">
              <Plus className="w-3 h-3" /> Crear grafo
            </button>
          )}
        </div>
        {graphs.length === 0 && (
          <p className="text-xs text-slate-400 italic mb-2">
            {isMe ? 'Todavía no has creado ningún grafo — tu primer grafo será tu carta de presentación.' : 'Todavía no ha publicado ningún grafo.'}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {graphs.map(g => (
            <Link key={g.id} to={`/grafos/${g.slug}`}
              className="group bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800 text-white rounded-2xl p-4 shadow hover:shadow-lg transition-all relative overflow-hidden">
              <Network className="absolute top-3 right-3 w-6 h-6 text-white/30" />
              <p className="text-[8px] font-bold uppercase tracking-[0.25em] text-emerald-200 mb-1">Grafo de Conocimiento</p>
              <h3 className="text-base font-black leading-tight line-clamp-2">{g.title}</h3>
              <div className="flex items-center gap-3 mt-2.5 text-[10px] text-white/70">
                {g.rating?.avg != null && <span className="inline-flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-300 text-amber-300" />{g.rating.avg.toFixed(1)}</span>}
                <span className="inline-flex items-center gap-0.5"><Eye className="w-3 h-3" />{g.views}</span>
                <span className="inline-flex items-center gap-0.5"><AppWindow className="w-3 h-3" />{g.window_count} ventanas</span>
                {g.status === 'borrador' && <span className="bg-white/20 px-1.5 py-0.5 rounded-full font-bold uppercase">Borrador</span>}
                {g.is_ai_generated && <span className="inline-flex items-center gap-0.5 bg-amber-400/30 px-1.5 py-0.5 rounded-full font-bold uppercase"><Sparkles className="w-2.5 h-2.5" />IA</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {showCreateGraph && (
        <CreateGraphModal onClose={() => setShowCreateGraph(false)} onCreated={slug => navigate(`/grafos/${slug}`)} />
      )}

      <div className="px-4 sm:px-6 mt-6 space-y-4">
        {pubs.length === 0 && (
          <p className="text-sm text-slate-400 italic text-center py-8">Todavía no ha publicado nada.</p>
        )}
        {pubs.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            {p.title && <h3 className="text-base font-black text-slate-900">{p.title}</h3>}
            {p.body && <p className="text-sm text-slate-600 leading-relaxed mt-1 whitespace-pre-wrap">{p.body}</p>}
            <div className="flex items-center gap-4 mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
              <span>{timeAgo(p.created_at)}</span>
              <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{p.reaction_count}</span>
              <span>{p.comment_count} comentarios</span>
            </div>
          </div>
        ))}
      </div>

      {supportStep === 'amount' && (
        <div className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSupportStep(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-slate-800 mb-3">Elige un importe para apoyar a {profileUser.display_name || 'esta persona'}</p>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORT_AMOUNTS.map(a => (
                <button
                  key={a}
                  onClick={() => setSupportAmount(a)}
                  className={cn(
                    'py-2 rounded-xl text-sm font-bold border transition-colors',
                    supportAmount === a ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                  )}
                >
                  {(a / 100).toFixed(0)} €
                </button>
              ))}
            </div>
            <button
              onClick={() => setSupportStep('checkout')}
              className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              Continuar
            </button>
            <button onClick={() => setSupportStep(null)} className="mt-2 w-full py-2 text-xs text-slate-400 hover:text-slate-600">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {supportStep === 'checkout' && (
        <EmbeddedCheckoutModal
          title={`Apoyar con ${(supportAmount / 100).toFixed(0)} €`}
          onClose={() => setSupportStep(null)}
          createSession={async () => {
            const res = await fetch('/api/stripe/checkout/support', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ beneficiary_user_id: id, amount_cents: supportAmount }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'No se pudo iniciar el apoyo.');
            return json;
          }}
        />
      )}
    </div>
  );
}
