// ============================================================================
// PÁGINAS (2026-08-20, petición de Eugenio: «crea la sección en el menú de
// PÁGINAS, y ahí añade todas las páginas que ya hemos creado […] y crea ese
// lugar donde están todas las páginas ordenadas por PROYECTOS»).
// ============================================================================
// Aquí NO hay editor: el editor tipo Notion ya existe y vive en
// /documentos/:id — «+» por línea para meter un título, una imagen o una
// tabla, y el tirador ⋮⋮ para reordenar los bloques arrastrando. Esta página
// es la otra mitad que faltaba: el sitio desde el que las ves todas.
//
// Una página ES un `knowledge_windows` de tipo 'pagina'. Lo único que se ha
// añadido a la base de datos es a qué proyecto pertenece (una columna, no una
// tabla nueva: una página está en un proyecto o en ninguno).
//
// EL ARRASTRE DE AQUÍ es otro: no mueve bloques dentro de una página, mueve
// PÁGINAS de un proyecto a otro. Sueltas una ficha sobre la cabecera de otro
// proyecto y la página se va con él.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Plus, Search, Loader2, Lock, Globe, FolderKanban,
  ChevronDown, ChevronRight, X,
} from 'lucide-react';
import { Button } from '../components/ui/core';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface Pagina {
  id: string;
  titulo: string;
  publica: boolean;
  fecha: string | null;
  bloques: number;
  adelanto: string | null;
  imagen: string | null;
}

interface GrupoProyecto {
  id: string;
  sueltas: boolean;
  titulo: string;
  url: string | null;
  paginas: Pagina[];
}

export default function Paginas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [grupos, setGrupos] = useState<GrupoProyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [plegados, setPlegados] = useState<Record<string, boolean>>({});
  const [creando, setCreando] = useState<null | { proyectoId: string | null }>(null);
  const [tituloNuevo, setTituloNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  /** Qué página se está arrastrando y sobre qué proyecto está encima. */
  const arrastrando = useRef<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);

  const cargar = () => {
    fetch('/api/paginas', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setError(d.error); setGrupos([]); return; }
        setError(null);
        const lista: GrupoProyecto[] = Array.isArray(d?.proyectos) ? d.proyectos : [];
        setGrupos(lista);
        // Los proyectos VACÍOS nacen plegados. Se enseñan todos para poder
        // soltarles una página, pero abiertos ocupaban media pantalla de
        // huecos y empujaban tus páginas fuera de la vista. Plegados son una
        // línea cada uno, y siguen valiendo como sitio donde soltar.
        setPlegados(prev => {
          const siguiente = { ...prev };
          for (const g of lista) {
            if (!(g.id in siguiente)) siguiente[g.id] = g.paginas.length === 0;
          }
          return siguiente;
        });
      })
      .catch(() => setError('No se han podido cargar las páginas.'))
      .finally(() => setCargando(false));
  };
  useEffect(cargar, [user]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    // Sin buscar se enseñan TODOS los proyectos, vacíos incluidos: es donde se
    // sueltan las páginas. Buscando se esconden los que no tienen nada que ver.
    if (!q) return grupos;
    return grupos
      .map(g => ({
        ...g,
        paginas: g.paginas.filter(p =>
          p.titulo.toLowerCase().includes(q) || (p.adelanto || '').toLowerCase().includes(q)),
      }))
      .filter(g => g.paginas.length > 0);
  }, [grupos, busqueda]);

  const total = useMemo(() => visibles.reduce((n, g) => n + g.paginas.length, 0), [visibles]);

  const crear = async () => {
    const titulo = tituloNuevo.trim();
    if (!titulo || guardando || !creando) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/documentos', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo, proyecto_id: creando.proyectoId }),
      });
      const d = await r.json();
      if (!r.ok || !d?.id) { setError(d?.error || 'No se ha podido crear la página.'); return; }
      // Recién creada se entra directo: crear una página es querer escribirla.
      navigate(`/documentos/${d.id}`);
    } catch {
      setError('No se ha podido crear la página.');
    } finally { setGuardando(false); }
  };

  /** Soltar una página sobre un proyecto: se mueve allí. Se pinta antes de que
   *  conteste el servidor (colocar cosas tiene que ir a la velocidad de la
   *  mano) y, si falla, se vuelve a pedir la lista real. */
  const soltarEn = async (destino: GrupoProyecto) => {
    const id = arrastrando.current;
    arrastrando.current = null;
    setEncima(null);
    if (!id) return;
    const origen = grupos.find(g => g.paginas.some(p => p.id === id));
    if (!origen || origen.id === destino.id) return;
    const pagina = origen.paginas.find(p => p.id === id)!;
    setGrupos(gs => gs
      .map(g => {
        if (g.id === origen.id) return { ...g, paginas: g.paginas.filter(p => p.id !== id) };
        if (g.id === destino.id) return { ...g, paginas: [pagina, ...g.paginas] };
        return g;
      }));
    const r = await fetch(`/api/paginas/${id}/proyecto`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto_id: destino.sueltas ? null : destino.id }),
    }).catch(() => null);
    if (!r?.ok) { setError('No se ha podido mover la página.'); cargar(); }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto w-full py-20 text-center">
        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">Inicia sesión para ver tus páginas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <FileText className="w-5 h-5 text-emerald-600" /> Páginas
        </h1>
        {!cargando && (
          <span className="text-xs font-bold text-slate-400">
            {total} {total === 1 ? 'página' : 'páginas'}
          </span>
        )}

        <div className="flex-1 min-w-[8rem]" />

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 focus-within:border-emerald-300">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar una página…"
            className="w-40 sm:w-56 text-xs text-slate-700 bg-transparent focus:outline-none"
          />
        </div>

        <Button
          onClick={() => { setTituloNuevo(''); setCreando({ proyectoId: null }); }}
          className="inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" /> Nueva página
        </Button>
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
          <FileText className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-500">
            {busqueda ? 'Ninguna página con ese nombre.' : 'Todavía no has creado ninguna página.'}
          </p>
          {!busqueda && (
            <button onClick={() => { setTituloNuevo(''); setCreando({ proyectoId: null }); }}
              className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800">
              Crear la primera →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibles.map(g => {
            const plegado = !!plegados[g.id];
            return (
              <section
                key={g.id}
                onDragOver={e => { if (arrastrando.current) { e.preventDefault(); setEncima(g.id); } }}
                onDragLeave={() => setEncima(c => (c === g.id ? null : c))}
                onDrop={e => { e.preventDefault(); soltarEn(g); }}
                className={cn('rounded-2xl border bg-white overflow-hidden transition-colors',
                  encima === g.id ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-200')}
              >
                {/* Cabecera del proyecto */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
                  <button
                    onClick={() => setPlegados(v => ({ ...v, [g.id]: !plegado }))}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left group"
                  >
                    {plegado
                      ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    {g.sueltas
                      ? <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      : <FolderKanban className="w-4 h-4 text-amber-600 shrink-0" />}
                    <span className="text-sm font-black text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                      {g.titulo}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">
                      {g.paginas.length}
                    </span>
                  </button>

                  <button
                    onClick={() => { setTituloNuevo(''); setCreando({ proyectoId: g.sueltas ? null : g.id }); }}
                    title={g.sueltas ? 'Nueva página suelta' : `Nueva página en ${g.titulo}`}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {!plegado && g.paginas.length === 0 && (
                  <p className="px-4 py-5 text-center text-[11px] text-slate-400">
                    Sin páginas. Arrastra una aquí, o pulsa el + para crear la primera.
                  </p>
                )}

                {!plegado && g.paginas.length > 0 && (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {g.paginas.map(p => (
                      <button
                        key={p.id}
                        draggable
                        onDragStart={e => { arrastrando.current = p.id; e.dataTransfer.effectAllowed = 'move'; }}
                        onDragEnd={() => { arrastrando.current = null; setEncima(null); }}
                        onClick={() => navigate(`/documentos/${p.id}`)}
                        className="group text-left rounded-xl border border-slate-200 bg-white overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
                      >
                        {p.imagen && (
                          <div className="aspect-[16/7] overflow-hidden bg-slate-50">
                            <img src={p.imagen} alt="" loading="lazy" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-start gap-1.5">
                            <p className="text-sm font-black text-slate-900 leading-snug line-clamp-2 flex-1 group-hover:text-emerald-700 transition-colors">
                              {p.titulo}
                            </p>
                            {p.publica
                              ? <Globe className="w-3 h-3 text-emerald-500 shrink-0 mt-1" />
                              : <Lock className="w-3 h-3 text-slate-300 shrink-0 mt-1" />}
                          </div>
                          {p.adelanto && (
                            <p className="text-[11px] text-slate-400 leading-snug line-clamp-2 mt-1">{p.adelanto}</p>
                          )}
                          <p className="text-[10px] font-bold text-slate-400 mt-2">
                            {p.bloques} {p.bloques === 1 ? 'bloque' : 'bloques'}
                            {p.fecha && ` · ${new Date(p.fecha).toLocaleDateString('es-ES')}`}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-400">
        Arrastra una página sobre otro proyecto para moverla. Dentro de cada página, el «+»
        de cada línea añade títulos, imágenes y tablas, y el tirador ⋮⋮ reordena los bloques.
      </p>

      {/* Crear: solo pide el nombre. Todo lo demás se decide dentro. */}
      {creando && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !guardando && setCreando(null)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-black text-slate-900">Nueva página</h2>
              <button onClick={() => setCreando(null)} disabled={guardando}
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
                placeholder="p. ej. «Notas de la reunión»"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
              />
              <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                {creando.proyectoId
                  ? `Nace dentro de «${grupos.find(g => g.id === creando.proyectoId)?.titulo}» y solo la ves tú hasta que la publiques.`
                  : 'Nace suelta y solo la ves tú hasta que la publiques. Luego puedes arrastrarla a un proyecto.'}
              </p>
              <Button type="submit" disabled={!tituloNuevo.trim() || guardando}
                className="w-full mt-4 inline-flex items-center justify-center gap-1.5">
                {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear y escribir
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
