// ============================================================================
// ESQUEMAS (2026-08-20, Eugenio: «llámalo Esquemas, y unifica todo para ese
// mismo nombre»).
// ============================================================================
// «Lienzo», «grafo» y «red de datos» eran tres nombres para LA MISMA FILA de
// `knowledge_graphs`, dibujada de tres maneras. Tres nombres para una cosa es
// como se pierde a la gente, así que ahora se llama ESQUEMA y punto.
//
// Esta página es el cajón de trabajo: fichas en una rejilla, con su portada,
// ordenadas por lo último que tocaste. La vista de cosmos conectado sigue
// existiendo en /red, pero ya no es otra cosa: es otra forma de mirar esto.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Plus, Search, Loader2, Image as ImageIcon, User, Eye, X } from 'lucide-react';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface Esquema {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  views: number | null;
  created_at: string;
  creator_name: string | null;
  window_count: number;
  cover_image: string | null;
  cover_video_id: string | null;
  is_reto: boolean;
}

/** La portada de un lienzo: su primera imagen, la miniatura de su primer
 *  vídeo, o —si no tiene ninguna— sus iniciales sobre un color estable
 *  sacado del propio título, para que cada ficha se reconozca de un vistazo. */
function Portada({ l }: { l: Esquema }) {
  const src = l.cover_image
    || (l.cover_video_id ? `https://i.ytimg.com/vi/${l.cover_video_id}/mqdefault.jpg` : null);
  if (src) {
    return <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />;
  }
  // Tono estable por título: el mismo lienzo tiene siempre el mismo color.
  const tonos = ['bg-emerald-50', 'bg-sky-50', 'bg-violet-50', 'bg-amber-50', 'bg-rose-50', 'bg-teal-50'];
  const textos = ['text-emerald-700', 'text-sky-700', 'text-violet-700', 'text-amber-700', 'text-rose-700', 'text-teal-700'];
  let suma = 0;
  for (const c of l.title) suma = (suma + c.charCodeAt(0)) % 997;
  const i = suma % tonos.length;
  const iniciales = l.title.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
  return (
    <div className={cn('w-full h-full grid place-items-center', tonos[i])}>
      <span className={cn('text-3xl font-black tracking-tight', textos[i])}>{iniciales || '·'}</span>
    </div>
  );
}

export default function Esquemas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [esquemas, setEsquemas] = useState<Esquema[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  // Sin sesión no hay «míos» que enseñar: se empieza por el común.
  const [ambito, setAmbito] = useState<'mios' | 'comun'>(user ? 'mios' : 'comun');
  const [creando, setCreando] = useState(false);
  const [tituloNuevo, setTituloNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);

  // La sesión llega DESPUÉS del primer pintado: sin esto, el estado inicial se
  // calculaba con `user` todavía a nulo y la página abría siempre en «De la
  // humanidad», aunque hubieras entrado con tu cuenta. Solo se corrige mientras
  // no hayas tocado tú el interruptor.
  const [tocado, setTocado] = useState(false);
  useEffect(() => {
    if (tocado) return;
    setAmbito(user ? 'mios' : 'comun');
  }, [user, tocado]);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    setError(null);
    // `personales=1` solo tiene efecto sobre los tuyos (lo comprueba el
    // servidor): tu lienzo personal es un lienzo más en TU cajón.
    const url = ambito === 'mios' && user
      ? `/api/graphs?creator_id=${encodeURIComponent(user.id)}&personales=1`
      : '/api/graphs';
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!vivo) return;
        if (d?.error) { setError(d.error); setEsquemas([]); return; }
        setEsquemas(Array.isArray(d) ? d : []);
      })
      .catch(() => { if (vivo) setError('No se han podido cargar los esquemas.'); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [ambito, user]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return esquemas;
    return esquemas.filter(l =>
      l.title.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
  }, [esquemas, busqueda]);

  const crear = async () => {
    const titulo = tituloNuevo.trim();
    if (!titulo || guardando) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/graphs', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo, status: 'borrador' }),
      });
      const d = await r.json();
      if (!r.ok || d?.error) { setError(d?.error || 'No se ha podido crear el esquema.'); return; }
      // Recién creado se entra directo: crear un lienzo es querer usarlo.
      navigate(`/esquemas/${d.slug}`);
    } catch {
      setError('No se ha podido crear el esquema.');
    } finally { setGuardando(false); }
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* «Grafos» y no «Lienzos»: es el mismo cajón, y el menú dice Grafos
            (Eugenio, 2026-08-20: «cuando haces click en grafos, que te
            aparezcan todos los grafos del usuario, no uno en concreto»). Tu
            lienzo personal —lo que era «Mi Conocimiento»— es una ficha más de
            «Míos», porque un lienzo ES un grafo. */}
        <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <LayoutGrid className="w-5 h-5 text-emerald-600" /> Esquemas
        </h1>

        {user && (
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
            {([['mios', 'Míos'], ['comun', 'De la humanidad']] as const).map(([k, etiqueta]) => (
              <button
                key={k}
                onClick={() => { setTocado(true); setAmbito(k); }}
                className={cn('px-3.5 py-1 rounded-full text-xs font-bold transition-colors',
                  ambito === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-w-[10rem]" />

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 focus-within:border-emerald-300">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar un esquema…"
            className="w-40 sm:w-56 text-xs text-slate-700 bg-transparent focus:outline-none"
          />
        </div>

        {user && (
          <Button onClick={() => { setTituloNuevo(''); setCreando(true); }} className="inline-flex items-center gap-1.5 shrink-0">
            <Plus className="w-4 h-4" /> Nuevo esquema
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">{error}</p>
      )}

      {cargando ? (
        <div className="py-24 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="py-20 text-center">
          <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-500">
            {busqueda ? 'Ningún esquema con ese nombre.'
              : ambito === 'mios' ? 'Todavía no has creado ningún esquema.'
                : 'Aún no hay esquemas publicados.'}
          </p>
          {user && !busqueda && (
            <button onClick={() => { setTituloNuevo(''); setCreando(true); }}
              className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800">
              Crear el primero →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* La ficha de crear va la PRIMERA, como en Miro: lo que más se
              repite es empezar uno nuevo, y buscarlo al final de la lista
              obliga a recorrer todo lo demás. */}
          {user && !busqueda && (
            <button
              onClick={() => { setTituloNuevo(''); setCreando(true); }}
              className="group flex flex-col items-center justify-center gap-2 aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
            >
              <span className="w-10 h-10 rounded-full bg-emerald-600 group-hover:bg-emerald-700 text-white grid place-items-center transition-colors">
                <Plus className="w-5 h-5" />
              </span>
              <span className="text-xs font-black text-slate-600 group-hover:text-emerald-700">Nuevo esquema</span>
            </button>
          )}

          {visibles.map(l => (
            <button
              key={l.id}
              onClick={() => navigate(`/esquemas/${l.slug}`)}
              className="group text-left rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-emerald-300 hover:shadow-lg transition-all"
            >
              <div className="aspect-[4/3] overflow-hidden bg-slate-50 relative">
                <Portada l={l} />
                {l.status === 'borrador' && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/95 border border-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-500">
                    Borrador
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-black text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                  {l.title}
                </p>
                <div className="mt-1 flex items-center gap-2.5 text-[10px] font-bold text-slate-400">
                  <span>{l.window_count} {l.window_count === 1 ? 'pieza' : 'piezas'}</span>
                  {ambito === 'comun' && l.creator_name && (
                    <span className="inline-flex items-center gap-1 truncate">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate">{l.creator_name}</span>
                    </span>
                  )}
                  {!!l.views && (
                    <span className="inline-flex items-center gap-1 ml-auto shrink-0">
                      <Eye className="w-3 h-3" />{l.views}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Crear: solo pide el nombre. Todo lo demás se decide dentro. */}
      {creando && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !guardando && setCreando(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-black text-slate-900">Nuevo esquema</h2>
              <button onClick={() => setCreando(false)} disabled={guardando}
                className="ml-auto p-1 text-slate-400 hover:text-slate-600 disabled:opacity-40">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); crear(); }}>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                ¿Cómo se llama?
              </label>
              <input
                autoFocus
                value={tituloNuevo}
                onChange={e => setTituloNuevo(e.target.value)}
                placeholder="p. ej. «Agua en Granada»"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
              />
              <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                Nace como borrador: solo tú lo ves hasta que decidas publicarlo.
              </p>
              <Button type="submit" disabled={!tituloNuevo.trim() || guardando}
                className="w-full mt-4 inline-flex items-center justify-center gap-1.5">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear y abrir
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
