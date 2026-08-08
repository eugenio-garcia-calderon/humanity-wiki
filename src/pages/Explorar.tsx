import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Compass, User as UserIcon, Eye, Sparkles, Network, LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import WindowContent from '../components/knowledge/WindowContent';
import { VentanaPopup } from '../components/knowledge/esferaKit';
import { cn } from '../utils/cn';

// ============================================================================
// EXPLORAR / MIS PUBLICACIONES (2026-08-08, petición del usuario)
// ============================================================================
// Los dos destinos principales del menú, sobre el mismo listado:
//   /explorar          todo lo que ha publicado todo el mundo
//   /mis-publicaciones lo tuyo
// Cada tarjeta enseña el contenido de verdad; al pulsarla se abre en grande
// sin salir de la página, y desde ahí se puede saltar al grafo donde vive.

const TIPOS = [
  { id: null, label: 'Todo' },
  { id: 'imagen', label: 'Imágenes' },
  { id: 'video', label: 'Vídeos' },
  { id: 'texto', label: 'Notas' },
  { id: 'grafica', label: 'Datos' },
  { id: 'enlace', label: 'Enlaces' },
  { id: 'publicacion', label: 'Del muro' },
];

export default function Explorar({ mias = false }: { mias?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<any>(null);
  const debounce = useRef<any>(null);

  useEffect(() => {
    if (mias && !user) { setCargando(false); return; }
    setCargando(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const p = new URLSearchParams();
      if (mias && user) p.set('autor', user.id);
      if (busqueda.trim()) p.set('q', busqueda.trim());
      fetch(`/api/publicaciones?${p}`, { credentials: 'include' })
        .then(r => r.json())
        .then(j => setItems(Array.isArray(j) ? j : []))
        .catch(() => setItems([]))
        .finally(() => setCargando(false));
    }, 280);
    return () => clearTimeout(debounce.current);
  }, [mias, user, busqueda]);

  const visibles = useMemo(
    () => (tipo ? items.filter(i => i.kind === tipo) : items),
    [items, tipo],
  );

  if (mias && !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <UserIcon className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-black text-slate-900">Mis publicaciones</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Aquí aparece todo lo que publicas: lo de tus grafos, lo de tu lienzo y lo del muro.
          </p>
          <Link to="/login" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 pt-9 pb-24">

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-2 inline-flex items-center gap-1.5">
              {mias ? <><UserIcon className="w-3 h-3" /> Tu perfil</> : <><Compass className="w-3 h-3" /> El común</>}
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {mias ? 'Mis publicaciones' : 'Explorar'}
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              {mias
                ? 'Todo lo que has publicado, en un solo sitio.'
                : 'Todo lo que ha publicado todo el mundo en humanity.wiki.'}
            </p>
          </div>
          <p className="text-xs font-bold text-slate-400">{visibles.length} publicaciones</p>
        </div>

        {/* Buscador y tipos */}
        <div className="mt-6 flex flex-wrap items-center gap-2 sticky top-0 bg-white/95 backdrop-blur z-20 py-3 -mx-2 px-2 rounded-2xl">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar entre las publicaciones…"
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
            />
          </div>
          {TIPOS.map(t => (
            <button
              key={t.label}
              onClick={() => setTipo(t.id)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                tipo === t.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {cargando ? (
          <p className="text-sm text-slate-400 text-center py-24">Buscando…</p>
        ) : !visibles.length ? (
          <div className="text-center py-24">
            <LayoutGrid className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {busqueda ? `Nada sobre «${busqueda}».` : mias ? 'Todavía no has publicado nada.' : 'Aún no hay publicaciones.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
            {visibles.map(it => (
              <button
                key={`${it.tipo}-${it.id}`}
                onClick={() => setAbierta(it)}
                className="text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-slate-300 hover:-translate-y-0.5 transition-all flex flex-col"
              >
                <div className="px-3.5 pt-3 flex items-center gap-1.5">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{it.kind}</span>
                  {it.ia && <Sparkles className="w-2.5 h-2.5 text-amber-500" />}
                  {it.personal && (
                    <span className="text-[8px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                      Tuyo
                    </span>
                  )}
                </div>
                <p className="px-3.5 pt-1 text-[13px] font-black text-slate-900 leading-snug line-clamp-2">{it.titulo}</p>
                <div className="px-3.5 py-2 flex-1 min-h-0 overflow-hidden">
                  <WindowContent kind={it.kind} config={it.config || {}} variant="node" />
                </div>
                <div className="px-3.5 py-2 border-t border-slate-50 flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1 truncate">
                    <UserIcon className="w-2.5 h-2.5 shrink-0" />{it.autor_nombre || 'Anónimo'}
                  </span>
                  {it.donde && (
                    <span className="inline-flex items-center gap-1 truncate ml-auto">
                      <Network className="w-2.5 h-2.5 shrink-0" />{it.donde}
                    </span>
                  )}
                  {it.vistas > 0 && (
                    <span className="inline-flex items-center gap-0.5 shrink-0"><Eye className="w-2.5 h-2.5" />{it.vistas}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {abierta && (
        <VentanaPopup
          win={{ title: abierta.titulo, kind: abierta.kind, config: abierta.config || {} }}
          contexto={abierta.donde}
          onOpenGraph={abierta.donde_slug ? () => navigate(`/grafos/${abierta.donde_slug}`) : undefined}
          onClose={() => setAbierta(null)}
        />
      )}
    </div>
  );
}
