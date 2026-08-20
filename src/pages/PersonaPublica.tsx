import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon, MapPin, Globe, Heart, UserPlus, UserCheck, Award, Network,
  Eye, EyeOff, Plus, Pencil, Check, GripVertical, MessageSquare, Camera, Loader2,
  FolderKanban, Map as MapIcon, Gamepad2, Lock, LayoutGrid,
} from 'lucide-react';
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

// ============================================================================
// EL ESCAPARATE (2026-08-20, petición de Eugenio: «Mi Perfil tiene que ser un
// escaparate donde puedas arrastrar y soltar tus grafos, proyectos, archivos,
// mapas y mundos, con tu muro público, un botón de editar y poder enseñar u
// ocultar cada tarjeta»).
// ============================================================================
// Las fichas las sirve `GET /api/users/:id/escaparate`, que lee las cuatro
// tablas donde vive lo de una persona. Aquí solo se COLOCAN: el orden y lo
// oculto se guardan en tus ajustes de usuario (jsonb), sin migración.
//
// Ojo con lo que significa «ocultar»: es una decisión de ESCAPARATE, no de
// privacidad. Lo privado ya lo filtra el servidor antes de llegar aquí, así
// que enseñar una ficha nunca publica nada que no lo estuviera.

interface ItemEscaparate {
  clave: string;
  tipo: 'grafo' | 'proyecto' | 'mapa' | 'mundo';
  id: string;
  titulo: string;
  resumen: string | null;
  url: string;
  fecha: string | null;
  privado: boolean;
  dato: string | null;
  /** La portada: la primera imagen de dentro (o la miniatura de su vídeo).
   *  Si no hay ninguna, la ficha se queda con el color de su tipo. */
  imagen: string | null;
}

interface Escaparate { orden: string[]; ocultos: string[] }

const PINTA: Record<ItemEscaparate['tipo'], { etiqueta: string; icono: any; fondo: string; texto: string }> = {
  grafo:    { etiqueta: 'Grafo',    icono: Network,     fondo: 'from-emerald-600 via-teal-700 to-indigo-800', texto: 'text-emerald-200' },
  proyecto: { etiqueta: 'Proyecto', icono: FolderKanban, fondo: 'from-amber-500 via-orange-600 to-rose-700',  texto: 'text-amber-100' },
  mapa:     { etiqueta: 'Mapa',     icono: MapIcon,     fondo: 'from-sky-600 via-blue-700 to-indigo-800',     texto: 'text-sky-200' },
  mundo:    { etiqueta: 'Mundo 3D', icono: Gamepad2,    fondo: 'from-violet-600 via-purple-700 to-fuchsia-800', texto: 'text-violet-200' },
};

/** Coloca las fichas según el orden guardado. Lo que no esté en la lista va
 *  detrás, en el orden natural (lo último que tocaste primero): así, una cosa
 *  nueva aparece sola sin tener que volver a ordenar nada. */
function colocar(items: ItemEscaparate[], orden: string[]): ItemEscaparate[] {
  const puesto = new Map(orden.map((c, i) => [c, i]));
  return [...items].sort((a, b) => {
    const ia = puesto.has(a.clave) ? puesto.get(a.clave)! : Number.MAX_SAFE_INTEGER;
    const ib = puesto.has(b.clave) ? puesto.get(b.clave)! : Number.MAX_SAFE_INTEGER;
    return ia - ib;
  });
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
  const { user: me, can, updateUiSettings, updateProfile } = useAuth();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, publications: 0 });
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [supportStep, setSupportStep] = useState<'amount' | 'checkout' | null>(null);
  const [supportAmount, setSupportAmount] = useState(SUPPORT_AMOUNTS[0]);
  const [showCreateGraph, setShowCreateGraph] = useState(false);
  const [items, setItems] = useState<ItemEscaparate[]>([]);
  const [escaparate, setEscaparate] = useState<Escaparate>({ orden: [], ocultos: [] });
  const [editando, setEditando] = useState(false);
  const arrastrando = useRef<string | null>(null);
  const navigate = useNavigate();
  // EDITAR TU PROPIO PERFIL (2026-08-20, Eugenio: «que pueda agregar una foto
  // de perfil y una descripción»). Se edita EN EL SITIO, no en otra página:
  // ves cómo va quedando mientras escribes.
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [borrador, setBorrador] = useState({ nombre: '', bio: '', avatar: '' });
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);

  const empezarAEditar = () => {
    setBorrador({
      nombre: profileUser?.display_name || profileUser?.name || '',
      bio: profileUser?.bio || '',
      avatar: profileUser?.avatar_url || '',
    });
    setEditandoPerfil(true);
  };

  const subirFoto = async (f?: File) => {
    if (!f) return;
    setSubiendoFoto(true);
    try {
      const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' }, body: f,
      });
      const j = await r.json();
      if (r.ok && j.url) setBorrador(b => ({ ...b, avatar: j.url }));
    } finally { setSubiendoFoto(false); }
  };

  const guardarPerfil = async () => {
    setGuardandoPerfil(true);
    try {
      const res = await updateProfile({
        display_name: borrador.nombre.trim() || null,
        bio: borrador.bio.trim() || null,
        avatar_url: borrador.avatar || null,
      });
      if (!res.ok) return;
      // Se pinta ya con lo nuevo: recargar el perfil entero para ver tu propia
      // foto sería un viaje de más.
      setProfileUser(p => (p ? {
        ...p,
        display_name: borrador.nombre.trim() || null,
        bio: borrador.bio.trim() || null,
        avatar_url: borrador.avatar || null,
      } : p));
      setEditandoPerfil(false);
    } finally { setGuardandoPerfil(false); }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetch(`/api/users/${id}/profile`).then(r => r.json()),
      fetch(`/api/publications?author_id=${id}`).then(r => r.json()),
      fetch(`/api/users/${id}/escaparate`, { credentials: 'include' }).then(r => r.json()),
    ]).then(([profileJson, pubsJson, escJson]) => {
      if (cancelled) return;
      setProfileUser(profileJson.user || null);
      setStats(profileJson.stats || { followers: 0, following: 0, publications: 0 });
      setPubs(Array.isArray(pubsJson) ? pubsJson : []);
      setItems(Array.isArray(escJson?.items) ? escJson.items : []);
      const e = profileJson.user?.escaparate;
      setEscaparate({
        orden: Array.isArray(e?.orden) ? e.orden : [],
        ocultos: Array.isArray(e?.ocultos) ? e.ocultos : [],
      });
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

  // Lo colocado, ya en orden. Quien no es el dueño no ve lo que él ha ocultado;
  // el dueño sí, apagado, porque si no no habría forma de volver a enseñarlo.
  const colocados = colocar(items, escaparate.orden);
  const visibles = isMe ? colocados : colocados.filter(x => !escaparate.ocultos.includes(x.clave));

  /** Guarda el escaparate en tus ajustes. Optimista: se pinta ya y se manda
   *  después — colocar fichas tiene que ir a la velocidad de la mano. */
  const guardar = (e: Escaparate) => {
    setEscaparate(e);
    updateUiSettings({ escaparate: e });
  };

  const soltar = (destino: number) => {
    const clave = arrastrando.current;
    arrastrando.current = null;
    if (!clave) return;
    const claves = colocados.map(x => x.clave);
    const desde = claves.indexOf(clave);
    if (desde < 0 || desde === destino) return;
    claves.splice(destino, 0, claves.splice(desde, 1)[0]);
    guardar({ ...escaparate, orden: claves });
  };

  const alternarOculto = (clave: string) => {
    const ocultos = escaparate.ocultos.includes(clave)
      ? escaparate.ocultos.filter(c => c !== clave)
      : [...escaparate.ocultos, clave];
    // Al ocultar por primera vez se congela el orden actual: si no, la ficha
    // que apagas cambiaría de sitio sola la próxima vez que entres.
    const orden = escaparate.orden.length ? escaparate.orden : colocados.map(x => x.clave);
    guardar({ orden, ocultos });
  };

  return (
    // Más ancho que antes (era `max-w-2xl`): desde que el perfil es un
    // escaparate, la columna estrecha dejaba las fichas del tamaño de un sello.
    <div className="animate-in fade-in duration-500 pb-16 max-w-4xl mx-auto">
      <div className="relative h-32 sm:h-40 rounded-3xl bg-gradient-to-br from-emerald-100 via-teal-50 to-indigo-100 overflow-hidden">
        {profileUser.banner_url && (
          <img src={profileUser.banner_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="px-4 sm:px-6 -mt-10 relative flex items-end justify-between gap-3">
        <div className="relative shrink-0">
          {(editandoPerfil ? borrador.avatar : profileUser.avatar_url) ? (
            <img src={editandoPerfil ? borrador.avatar : profileUser.avatar_url!} alt=""
              className="w-20 h-20 rounded-full border-4 border-white object-cover shadow-md" />
          ) : (
            <span className="w-20 h-20 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-slate-400 shadow-md">
              <UserIcon className="w-8 h-8" />
            </span>
          )}
          {editandoPerfil && (
            <>
              <input ref={fotoRef} type="file" accept="image/*" className="hidden"
                onChange={e => { subirFoto(e.target.files?.[0]); e.target.value = ''; }} />
              <button
                onClick={() => fotoRef.current?.click()}
                disabled={subiendoFoto}
                title="Cambiar la foto"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 text-white grid place-items-center shadow-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {subiendoFoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>

        {/* Editar el tuyo: el botón vive junto a la foto, que es donde se
            busca. */}
        {isMe && (
          <div className="flex items-center gap-2 pb-1">
            {editandoPerfil ? (
              <>
                <button onClick={() => setEditandoPerfil(false)} disabled={guardandoPerfil}
                  className="px-3.5 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-40 transition-colors">
                  Cancelar
                </button>
                <button onClick={guardarPerfil} disabled={guardandoPerfil}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-colors">
                  {guardandoPerfil ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Guardar
                </button>
              </>
            ) : (
              <button onClick={empezarAEditar}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Editar perfil
              </button>
            )}
          </div>
        )}

        {!isMe && (
          <div className="flex items-center gap-2 pb-1">
            {/* ESCRIBIRLE (2026-08-20). Solo con sesión: un mensaje tiene que
                venir de alguien. */}
            {can(ROLE.USER) && (
              <Link
                to={`/mensajes?con=${id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Escribir
              </Link>
            )}
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
        {editandoPerfil ? (
          <>
            <input
              value={borrador.nombre}
              onChange={e => setBorrador(b => ({ ...b, nombre: e.target.value }))}
              placeholder="Tu nombre"
              className="w-full text-2xl font-black text-slate-900 bg-transparent border-b border-slate-200 focus:border-emerald-400 focus:outline-none pb-1"
            />
            <textarea
              value={borrador.bio}
              onChange={e => setBorrador(b => ({ ...b, bio: e.target.value }))}
              rows={3}
              placeholder="Cuéntale al mundo quién eres y en qué andas."
              className="w-full mt-2 text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-emerald-300 focus:bg-white"
            />
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-slate-900">{profileUser.display_name || profileUser.name || 'Persona'}</h1>
            {profileUser.bio
              ? <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{profileUser.bio}</p>
              : isMe && (
                <button onClick={empezarAEditar} className="text-sm text-slate-400 italic mt-1.5 hover:text-emerald-700 transition-colors">
                  Añade una descripción y una foto →
                </button>
              )}
          </>
        )}

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

      {/* EL ESCAPARATE. Todo lo que esta persona ha hecho —grafos, proyectos,
          mapas y su Mundo 3D— en fichas que su dueño coloca a mano. */}
      <div className="px-4 sm:px-6 mt-6">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
            <LayoutGrid className="w-4 h-4 text-emerald-600" /> Escaparate
          </h2>
          {isMe && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowCreateGraph(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 text-slate-600 rounded-full text-xs font-bold transition-colors">
                <Plus className="w-3 h-3" /> Nuevo grafo
              </button>
              <button
                onClick={() => setEditando(v => !v)}
                className={cn('inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
                  editando ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-white border border-slate-200 hover:border-emerald-300 text-slate-600')}
              >
                {editando ? <><Check className="w-3 h-3" /> Listo</> : <><Pencil className="w-3 h-3" /> Editar</>}
              </button>
            </div>
          )}
        </div>

        {editando && (
          <p className="mb-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 leading-relaxed">
            Arrastra las fichas para colocarlas y usa el ojo para enseñarlas u ocultarlas.
            Se guarda solo. Ocultar es una decisión de escaparate: lo privado sigue siendo
            privado lo pongas donde lo pongas.
          </p>
        )}

        {visibles.length === 0 ? (
          <p className="text-xs text-slate-400 italic mb-2">
            {isMe
              ? 'Tu escaparate está vacío — crea un grafo, un proyecto o un mapa y aparecerá aquí.'
              : 'Todavía no ha puesto nada en su escaparate.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibles.map((it, i) => {
              const pinta = PINTA[it.tipo];
              const Icono = pinta.icono;
              const oculto = escaparate.ocultos.includes(it.clave);
              // LA PORTADA (Eugenio, 2026-08-20: «que cada ficha tenga una
              // imagen de preview de lo que hay dentro»). Va a sangre, con un
              // degradado oscuro de abajo arriba para que el texto se lea
              // encima de cualquier foto. Sin imagen, manda el color del tipo:
              // así todas las fichas tienen la misma silueta, con foto o sin
              // ella, y la rejilla no se rompe.
              const cuerpo = (
                <>
                  {it.imagen && (
                    <img src={it.imagen} alt="" loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className={cn('absolute inset-0',
                    it.imagen
                      ? 'bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/10'
                      : cn('bg-gradient-to-br', pinta.fondo))} />
                  <div className="relative h-full flex flex-col justify-end">
                    <Icono className="absolute top-0 right-0 w-6 h-6 text-white/40" />
                    <p className={cn('text-[8px] font-bold uppercase tracking-[0.25em] mb-1',
                      it.imagen ? 'text-white/70' : pinta.texto)}>
                      {pinta.etiqueta}
                    </p>
                    <h3 className="text-base font-black leading-tight line-clamp-2 pr-7">{it.titulo}</h3>
                    {it.resumen && !it.imagen && (
                      <p className="text-[11px] text-white/70 leading-snug line-clamp-2 mt-1">{it.resumen}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2.5 text-[10px] text-white/70">
                      {it.dato && <span>{it.dato}</span>}
                      {it.privado && (
                        <span className="inline-flex items-center gap-0.5 bg-white/20 px-1.5 py-0.5 rounded-full font-bold uppercase">
                          <Lock className="w-2.5 h-2.5" /> Privado
                        </span>
                      )}
                    </div>
                  </div>
                </>
              );
              const clases = cn(
                'group relative block text-left aspect-[16/10] text-white rounded-2xl p-4 shadow transition-all overflow-hidden bg-slate-800',
                editando ? 'cursor-grab active:cursor-grabbing' : 'hover:shadow-lg',
                oculto && 'opacity-40',
              );
              // Editando, la ficha NO navega: el clic es para arrastrar y para
              // el ojo. Fuera de edición es un enlace normal.
              return editando ? (
                <div
                  key={it.clave}
                  draggable
                  onDragStart={e => { arrastrando.current = it.clave; e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={e => { e.preventDefault(); soltar(i); }}
                  onDragEnd={() => { arrastrando.current = null; }}
                  className={clases}
                >
                  <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                    <GripVertical className="w-4 h-4 text-white/50" />
                    <button
                      onClick={() => alternarOculto(it.clave)}
                      title={oculto ? 'Enseñar en el escaparate' : 'Ocultar del escaparate'}
                      className="w-6 h-6 grid place-items-center rounded bg-white/15 hover:bg-white/30 transition-colors"
                    >
                      {oculto ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {cuerpo}
                </div>
              ) : (
                <Link key={it.clave} to={it.url} className={clases}>{cuerpo}</Link>
              );
            })}
          </div>
        )}
      </div>

      {showCreateGraph && (
        <CreateGraphModal onClose={() => setShowCreateGraph(false)} onCreated={slug => navigate(`/esquemas/${slug}`)} />
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
