import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Folder, FolderPlus, Plus, X, Lock, Globe, ArrowLeft, FileText, Loader2,
  MoreHorizontal, Share2, Trash2, FolderMinus, FilePlus2, Sparkles, Pencil,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { Button } from '../components/ui/core';
import IconoElemento from '../components/ui/Icono';
import SelectorDeIcono from '../components/ui/SelectorDeIcono';
import { iconoDeProyecto } from '../utils/iconoDeNombre';
import CajaCompartir from '../components/compartir/CajaCompartir';

// ============================================================================
// CARPETAS — lo que antes eran los proyectos (2026-09-30)
// ============================================================================
// Eugenio: «a lo que antes llamábamos proyectos, ahora se va a llamar
// CARPETAS, y en las carpetas puedes meter PÁGINAS y nada más que páginas».
//
// Underneath it is still the `proyectos` table and the `/api/proyectos`
// routes: same id, slug, owner, icon and public flag, so every shared link and
// custom domain keeps working. What changed is what a folder IS: a place for
// pages. The board, gallery, branches, wall and files the old project page
// showed were copied into ordinary pages by migration 0132 — nothing was
// deleted, it now lives as blocks you can edit, move or publish.

type Carpeta = {
  id: string; slug: string; titulo: string; icono: string | null;
  publico: boolean; creador_user_id?: string; creador_nombre?: string | null;
  portada_url?: string | null; paginas?: number; paginas_titulos?: string[];
};

type PaginaDeCarpeta = {
  id: string; titulo: string; publica: boolean; icono: string | null;
  fecha: string; bloques: number; rescatada: boolean;
  adelanto: string | null; imagen: string | null;
};

const avisarMenu = () => window.dispatchEvent(new Event('humanity:menu-cambiado'));

// ----------------------------------------------------------------------------
// Todas las carpetas
// ----------------------------------------------------------------------------
export function Carpetas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [carpetas, setCarpetas] = useState<Carpeta[] | null>(null);
  // `?nuevo=1` opens the dialog: the «+» in the side menu links here with it.
  const [creando, setCreando] = useState(() => new URLSearchParams(window.location.search).get('nuevo') === '1');
  const [editando, setEditando] = useState<Carpeta | null>(null);

  const cargar = () => fetch('/api/proyectos', { credentials: 'include' })
    .then(r => r.json())
    .then(j => setCarpetas(Array.isArray(j) ? j : []))
    .catch(() => setCarpetas([]));
  useEffect(() => { cargar(); }, []);

  const puedeEditar = (c: Carpeta) => !!user && (c.creador_user_id === user.id || !!user.isAdmin);
  // Mine first: this is where you keep your own pages; public folders of other
  // people come after, under their own heading.
  const mias = (carpetas || []).filter(c => user && c.creador_user_id === user.id);
  const otras = (carpetas || []).filter(c => !(user && c.creador_user_id === user.id));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-8 pb-24">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 inline-flex items-center gap-2">
            <Folder className="w-6 h-6 text-slate-400" /> Carpetas
          </h1>
          {user && (
            <Button onClick={() => setCreando(true)} className="gap-1.5 rounded-xl normal-case tracking-normal">
              <FolderPlus className="w-3.5 h-3.5" /> Nueva carpeta
            </Button>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">Guarda tus páginas en carpetas.</p>

        {carpetas === null ? (
          <div className="flex justify-center py-24 text-slate-300"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : carpetas.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl mt-8">
            <Folder className="w-9 h-9 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Todavía no hay carpetas.</p>
            {user
              ? <button onClick={() => setCreando(true)} className="mt-3 text-sm font-black text-emerald-700 hover:text-emerald-900">Crea la primera</button>
              : <Link to="/login" className="mt-3 inline-block text-sm font-black text-emerald-700">Entra para crear la tuya</Link>}
          </div>
        ) : (
          <>
            {mias.length > 0 && (
              <RejillaCarpetas carpetas={mias} puedeEditar={puedeEditar} onEditar={setEditando} />
            )}
            {otras.length > 0 && (
              <>
                <h2 className="mt-10 mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  {mias.length ? 'Carpetas públicas de otras personas' : 'Carpetas públicas'}
                </h2>
                <RejillaCarpetas carpetas={otras} puedeEditar={puedeEditar} onEditar={setEditando} />
              </>
            )}
          </>
        )}
      </div>

      {creando && (
        <DialogoCarpeta
          onCerrar={() => setCreando(false)}
          onHecho={c => { avisarMenu(); navigate(`/carpetas/${c.slug}`); }}
        />
      )}
      {editando && (
        <DialogoCarpeta
          carpeta={editando}
          onCerrar={() => setEditando(null)}
          onHecho={c => { setEditando(null); avisarMenu(); setCarpetas(l => (l || []).map(x => (x.id === c.id ? { ...x, ...c } : x))); }}
        />
      )}
    </div>
  );
}

function RejillaCarpetas({ carpetas, puedeEditar, onEditar }: {
  carpetas: Carpeta[]; puedeEditar: (c: Carpeta) => boolean; onEditar: (c: Carpeta) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-6">
      {carpetas.map(c => {
        const titulos = Array.isArray(c.paginas_titulos) ? c.paginas_titulos : [];
        const n = c.paginas ?? 0;
        return (
          <Link key={c.id} to={`/carpetas/${c.slug}`}
            className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
            {puedeEditar(c) && (
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onEditar(c); }}
                aria-label={`Editar la carpeta ${c.titulo}`}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-slate-400 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-800 focus:opacity-100 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50">
                <IconoElemento valor={iconoDeProyecto(c.icono, c.titulo)} tamano={22} />
              </span>
              <span className="min-w-0 flex-1 pr-6">
                <span className="block truncate text-[15px] font-black text-slate-900">{c.titulo}</span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  {c.publico ? <Globe className="h-3 w-3 text-emerald-600" /> : <Lock className="h-3 w-3 text-amber-600" />}
                  {n === 1 ? '1 página' : `${n} páginas`}
                  {c.creador_nombre && !puedeEditar(c) && <> · {c.creador_nombre}</>}
                </span>
              </span>
            </div>
            {titulos.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                {titulos.map((t, i) => (
                  <li key={i} className="flex items-center gap-1.5 truncate text-[12px] text-slate-500">
                    <FileText className="h-3 w-3 shrink-0 text-slate-300" /> <span className="truncate">{t || 'Sin título'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Link>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Crear o editar una carpeta: nombre, icono y si se ve desde fuera.
// ----------------------------------------------------------------------------
function DialogoCarpeta({ carpeta, onCerrar, onHecho }: {
  carpeta?: Carpeta; onCerrar: () => void; onHecho: (c: Carpeta) => void;
}) {
  const [titulo, setTitulo] = useState(carpeta?.titulo || '');
  const [icono, setIcono] = useState<string | null>(carpeta ? iconoDeProyecto(carpeta.icono, carpeta.titulo) : null);
  const [publico, setPublico] = useState(carpeta ? !!carpeta.publico : false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    if (!titulo.trim()) { setError('La carpeta necesita un nombre.'); return; }
    setGuardando(true); setError(null);
    try {
      const r = await fetch(carpeta ? `/api/proyectos/${carpeta.id}` : '/api/proyectos', {
        method: carpeta ? 'PUT' : 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        // A new folder is born private: what you put in it is yours until you
        // decide otherwise. (A new project used to be born public.)
        body: JSON.stringify({ titulo: titulo.trim(), publico, ...(icono ? { icono } : {}) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'No se ha podido guardar.');
      onHecho(j);
    } catch (e: any) { setError(e.message); setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-dialogo-carpeta"
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 id="titulo-dialogo-carpeta" className="inline-flex items-center gap-1.5 text-sm font-black text-slate-900">
            <Folder className="h-4 w-4 text-amber-500" /> {carpeta ? 'Editar carpeta' : 'Nueva carpeta'}
          </h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Nombre</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') guardar(); }}
              placeholder="p. ej. Reforestar mi comarca"
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-base sm:text-sm focus:border-emerald-300 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500">Icono</label>
            <SelectorDeIcono valor={icono} onElegir={setIcono} alto="max-h-32" />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={publico} onChange={e => setPublico(e.target.checked)} className="accent-emerald-600" />
            Pública: cualquiera puede ver la carpeta y sus páginas públicas
          </label>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          <Button variant="outline" onClick={onCerrar} className="rounded-xl normal-case tracking-normal">Cancelar</Button>
          <Button onClick={guardar} disabled={guardando} className="rounded-xl normal-case tracking-normal disabled:opacity-40">
            {guardando ? 'Guardando…' : carpeta ? 'Guardar' : 'Crear carpeta'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Una carpeta por dentro: sus páginas, y nada más.
// ----------------------------------------------------------------------------
export function Carpeta() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [carpeta, setCarpeta] = useState<Carpeta | null>(null);
  const [paginas, setPaginas] = useState<PaginaDeCarpeta[] | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [anadiendo, setAnadiendo] = useState(false);

  const cargar = async () => {
    try {
      const [rc, rp] = await Promise.all([
        fetch(`/api/proyectos/${encodeURIComponent(slug || '')}`, { credentials: 'include' }),
        fetch(`/api/proyectos/${encodeURIComponent(slug || '')}/paginas`, { credentials: 'include' }),
      ]);
      const jc = await rc.json().catch(() => ({}));
      if (!rc.ok) throw new Error(rc.status === 404 ? 'Esta carpeta no existe.' : rc.status === 403 ? 'Esta carpeta es privada.' : (jc.error || 'No se ha podido abrir.'));
      const jp = await rp.json().catch(() => ({}));
      setCarpeta(jc);
      setPaginas(Array.isArray(jp.paginas) ? jp.paginas : []);
      setPuedeEditar(!!jp.puedeEditar);
    } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { setCarpeta(null); setPaginas(null); setError(null); cargar(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const nuevaPagina = async () => {
    if (!carpeta) return;
    setOcupado(true);
    try {
      const r = await fetch('/api/documentos', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: 'Página sin título', proyecto_id: carpeta.id }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se ha podido crear la página.');
      avisarMenu();
      navigate(`/paginas/${j.id}`);
    } catch (e: any) { setError(e.message); setOcupado(false); }
  };

  const sacar = async (p: PaginaDeCarpeta) => {
    // Taking a page out of the folder does not delete it: it goes to
    // «Sin carpeta» in Páginas, exactly as it was.
    await fetch(`/api/paginas/${p.id}/proyecto`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto_id: null }),
    });
    setPaginas(l => (l || []).filter(x => x.id !== p.id));
    avisarMenu();
  };

  const borrarCarpeta = async () => {
    if (!carpeta) return;
    if (!window.confirm(`¿Quitar la carpeta «${carpeta.titulo}»?\n\nSus páginas NO se borran: pasan a «Sin carpeta» en Páginas.`)) return;
    const r = await fetch(`/api/proyectos/${carpeta.id}`, { method: 'DELETE', credentials: 'include' });
    if (r.ok) { avisarMenu(); navigate('/carpetas'); }
  };

  if (error && !carpeta) {
    return (
      <div className="h-full grid place-items-center p-6 text-center">
        <div>
          <Folder className="mx-auto mb-3 h-9 w-9 text-slate-300" />
          <p className="text-sm font-bold text-slate-600">{error}</p>
          <Link to="/carpetas" className="mt-3 inline-block text-sm font-black text-emerald-700">Ver todas las carpetas</Link>
        </div>
      </div>
    );
  }
  if (!carpeta || !paginas) {
    return <div className="flex justify-center py-24 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const hayRescatadas = puedeEditar && paginas.some(p => p.rescatada);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 pb-24 pt-6 sm:px-8">
        <Link to="/carpetas" className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" /> Carpetas
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-50">
            <IconoElemento valor={iconoDeProyecto(carpeta.icono, carpeta.titulo)} tamano={28} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{carpeta.titulo}</h1>
            <p className="flex items-center gap-1 text-xs text-slate-400">
              {carpeta.publico ? <><Globe className="h-3 w-3 text-emerald-600" /> Pública</> : <><Lock className="h-3 w-3 text-amber-600" /> Privada</>}
              <span>· {paginas.length === 1 ? '1 página' : `${paginas.length} páginas`}</span>
            </p>
          </div>
          {puedeEditar && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button onClick={nuevaPagina} disabled={ocupado} className="gap-1.5 rounded-xl normal-case tracking-normal">
                {ocupado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Nueva página
              </Button>
              <Button variant="outline" onClick={() => setAnadiendo(true)} className="gap-1.5 rounded-xl normal-case tracking-normal">
                <FilePlus2 className="h-3.5 w-3.5" /> Añadir existente
              </Button>
              <button onClick={() => setCompartiendo(true)} aria-label="Compartir la carpeta"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <Share2 className="h-4 w-4" />
              </button>
              <button onClick={() => setEditando(true)} aria-label="Editar la carpeta"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={borrarCarpeta} aria-label="Quitar la carpeta"
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {hayRescatadas && (
          <p className="mt-5 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Esta carpeta antes era un proyecto. Hemos pasado su contenido (descripción, tareas, publicaciones,
            archivos…) a páginas normales, que puedes editar, mover o borrar. Todas son privadas hasta que las publiques.
          </p>
        )}

        {error && <p className="mt-4 text-xs font-bold text-rose-600">{error}</p>}

        {paginas.length === 0 ? (
          <div className="mt-8 rounded-3xl border-2 border-dashed border-slate-200 py-16 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">{puedeEditar ? 'Esta carpeta está vacía.' : 'Esta carpeta no tiene páginas públicas.'}</p>
            {puedeEditar && (
              <button onClick={nuevaPagina} className="mt-3 text-sm font-black text-emerald-700 hover:text-emerald-900">Escribe la primera página</button>
            )}
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {paginas.map(p => (
              <li key={p.id} className="group flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 sm:px-4">
                <Link to={`/paginas/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                    {p.imagen
                      ? <img src={p.imagen} alt="" loading="lazy" className="h-full w-full object-cover" />
                      : p.icono ? <IconoElemento valor={p.icono} tamano={18} /> : <FileText className="h-4 w-4 text-slate-400" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[14px] font-bold text-slate-800">{p.titulo || 'Sin título'}</span>
                      {puedeEditar && (p.publica
                        ? <Globe className="h-3 w-3 shrink-0 text-emerald-600" aria-label="Pública" />
                        : <Lock className="h-3 w-3 shrink-0 text-slate-300" aria-label="Privada" />)}
                    </span>
                    {p.adelanto && <span className="block truncate text-[12px] text-slate-400">{p.adelanto}</span>}
                  </span>
                  <span className="hidden shrink-0 text-[11px] text-slate-300 sm:inline">
                    {new Date(p.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </Link>
                {puedeEditar && (
                  <button onClick={() => sacar(p)} title="Sacar de la carpeta" aria-label={`Sacar ${p.titulo} de la carpeta`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-300 opacity-100 transition-opacity hover:bg-slate-100 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100">
                    <FolderMinus className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <DialogoCarpeta carpeta={carpeta} onCerrar={() => setEditando(false)}
          onHecho={c => { setEditando(false); avisarMenu(); setCarpeta(x => (x ? { ...x, ...c } : x)); }} />
      )}
      {compartiendo && (
        <CajaCompartir tipo="proyecto" id={carpeta.id} onCerrar={() => setCompartiendo(false)} onCambiado={cargar} />
      )}
      {anadiendo && (
        <AnadirPaginas carpetaId={carpeta.id} onCerrar={() => setAnadiendo(false)} onHecho={() => { setAnadiendo(false); avisarMenu(); cargar(); }} />
      )}
    </div>
  );
}

/** Meter en esta carpeta páginas que ya existen (las que están sin carpeta o
 *  en otra carpeta tuya). Moverla no la copia: una página vive en una carpeta. */
function AnadirPaginas({ carpetaId, onCerrar, onHecho }: {
  carpetaId: string; onCerrar: () => void; onHecho: () => void;
}) {
  const [grupos, setGrupos] = useState<any[] | null>(null);
  const [elegidas, setElegidas] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch('/api/paginas', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setGrupos((j.proyectos || []).filter((g: any) => g.id !== carpetaId && g.paginas.length)))
      .catch(() => setGrupos([]));
  }, [carpetaId]);

  const cambiar = (id: string) => setElegidas(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const mover = async () => {
    setGuardando(true);
    await Promise.all([...elegidas].map(id => fetch(`/api/paginas/${id}/proyecto`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto_id: carpetaId }),
    })));
    onHecho();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-anadir-paginas"
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 id="titulo-anadir-paginas" className="text-sm font-black text-slate-900">Añadir páginas a la carpeta</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {grupos === null ? (
            <div className="flex justify-center py-10 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : grupos.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">No tienes otras páginas.</p>
          ) : grupos.map(g => (
            <div key={g.id} className="mb-3">
              <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{g.titulo}</p>
              {g.paginas.map((p: any) => (
                <label key={p.id} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl px-2 hover:bg-slate-50">
                  <input type="checkbox" checked={elegidas.has(p.id)} onChange={() => cambiar(p.id)} className="h-4 w-4 accent-emerald-600" />
                  <FileText className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                  <span className="truncate text-sm text-slate-700">{p.titulo || 'Sin título'}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5">
          <Button variant="outline" onClick={onCerrar} className="rounded-xl normal-case tracking-normal">Cancelar</Button>
          <Button onClick={mover} disabled={!elegidas.size || guardando} className={cn('rounded-xl normal-case tracking-normal', 'disabled:opacity-40')}>
            {guardando ? 'Moviendo…' : elegidas.size ? `Añadir ${elegidas.size}` : 'Añadir'}
          </Button>
        </div>
      </div>
    </div>
  );
}
