import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, User as UserIcon, Eye, Sparkles, Network, LayoutGrid,
  MoreVertical, Pencil, Globe, Lock, Trash2, Trash, RotateCcw, CircleDot,
  Folder, FolderPlus, FolderOpen, Download, Bookmark, X, Check, Loader2,
  ArrowLeft, Users2, Globe2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import WindowContent from '../components/knowledge/WindowContent';
import FichaPublicacion, { type Publicacion } from '../components/knowledge/FichaPublicacion';
import { cn } from '../utils/cn';

// ============================================================================
// PUBLICACIONES — Explorar + Mis publicaciones fusionadas (2026-08-08)
// ============================================================================
// «Fusión de la página de Mis Publicaciones y Explorar, con un filtro muy
// visual grande y centrado arriba que permita elegir entre publicaciones de
// la Humanidad o publicaciones propias.»
//
// Una sola página, un solo componente. El interruptor grande de arriba decide
// de quién son las publicaciones que se ven; el menú lateral de carpetas
// (solo con sesión) decide cómo las tiene ordenadas quien mira, sea de quien
// sea cada cosa — las carpetas son marcadores personales, no propiedad.
//
// /explorar y /mis-publicaciones siguen existiendo como atajos: cada una
// simplemente abre esta página con el interruptor en una posición distinta.

const TIPOS: { label: string; kinds: string[] | null }[] = [
  { label: 'Todo', kinds: null },
  // Los cuatro grandes primero: son lo que la gente construye.
  { label: 'Mapas', kinds: ['mapa'] },
  { label: 'Lienzos', kinds: ['grafo'] },
  { label: 'Proyectos', kinds: ['proyecto'] },
  { label: 'Bases de datos', kinds: ['tabla', 'ficha'] },
  { label: 'Imágenes', kinds: ['imagen'] },
  { label: 'Vídeos', kinds: ['video'] },
  { label: 'Notas', kinds: ['texto'] },
  { label: 'Documentos', kinds: ['documento', 'pagina'] },
  { label: 'Datos', kinds: ['grafica'] },
  { label: 'Enlaces', kinds: ['enlace', 'wikipedia'] },
  { label: 'Del muro', kinds: ['publicacion'] },
];

const COLORES_CARPETA = ['#0d9488', '#7c3aed', '#d97706', '#db2777', '#0284c7', '#16a34a', '#b91c1c', '#475569'];
const colorDe = (id: string) => COLORES_CARPETA[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES_CARPETA.length];

interface Carpeta { id: string; nombre: string; color: string | null; piezas: number; }

// -- Descargar: cada tipo ofrece los formatos que de verdad tienen sentido --
function descargarBlob(nombre: string, contenido: string, mime: string) {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
const slugArchivo = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 60) || 'publicacion';

const textoLargo = (pub: Publicacion): string => {
  const c: any = pub.config || {};
  return c.body || c.description || c.goal || c.caption || '';
};

function formatosDescarga(pub: Publicacion): { id: string; label: string; accion: () => void }[] {
  const base = slugArchivo(pub.titulo);
  const salida: { id: string; label: string; accion: () => void }[] = [];
  const c: any = pub.config || {};

  if (pub.kind === 'tabla') {
    salida.push({
      id: 'csv', label: 'Tabla (.csv)', accion: () => {
        const cols: any[] = c.cols || [];
        const rows: any[] = c.rows || [];
        const linea = (vals: string[]) => vals.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
        const csv = [linea(cols.map(x => x.name)), ...rows.map(r => linea(cols.map(x => r[x.id])))].join('\n');
        descargarBlob(`${base}.csv`, csv, 'text/csv;charset=utf-8');
      },
    });
  }
  const archivo = c.image_url || (pub.kind === 'enlace' || pub.kind === 'documento' ? c.url : null);
  if (archivo) {
    salida.push({
      id: 'archivo', label: 'Archivo original', accion: () => {
        const a = document.createElement('a');
        a.href = archivo; a.download = ''; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      },
    });
  }
  salida.push({
    id: 'md', label: 'Texto (.md)', accion: () => {
      const texto = textoLargo(pub);
      const md = `# ${pub.titulo}\n\n${pub.autor_nombre ? `*de ${pub.autor_nombre}*\n\n` : ''}${texto || '_(sin contenido de texto)_'}\n`;
      descargarBlob(`${base}.md`, md, 'text/markdown;charset=utf-8');
    },
  });
  salida.push({
    id: 'json', label: 'Datos (.json)', accion: () => {
      descargarBlob(`${base}.json`, JSON.stringify({
        titulo: pub.titulo, tipo: pub.tipo, kind: pub.kind, autor: pub.autor_nombre, fecha: pub.fecha, config: pub.config,
      }, null, 2), 'application/json');
    },
  });
  return salida;
}

export default function Explorar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // -- El interruptor grande: de quién son las publicaciones que se ven --
  // Vive en la query string de esta MISMA ruta (`/mis-publicaciones` ahora
  // solo redirige aquí con `?mias=1`) para que cambiar de modo no desmonte
  // el componente ni pierda la carpeta que se estaba explorando (2026-08-08).
  const modo: 'humanidad' | 'mias' = searchParams.get('mias') === '1' ? 'mias' : 'humanidad';
  const cambiarModo = (m: 'humanidad' | 'mias') => {
    setSearchParams(m === 'mias' ? { mias: '1' } : {}, { replace: true });
  };

  const [items, setItems] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState<string>('Todo');
  const [abierta, setAbierta] = useState<{ pub: Publicacion; editar: boolean } | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [verPapelera, setVerPapelera] = useState(false);
  const [papelera, setPapelera] = useState<any[]>([]);
  const debounce = useRef<any>(null);

  // -- Carpetas --
  const [carpetas, setCarpetas] = useState<Carpeta[]>([]);
  const [carpetaActiva, setCarpetaActiva] = useState<Carpeta | null>(null);
  const [nuevaCarpeta, setNuevaCarpeta] = useState('');
  const [creandoCarpeta, setCreandoCarpeta] = useState(false);
  const [organizando, setOrganizando] = useState(false);
  const [avisoIA, setAvisoIA] = useState<string | null>(null);
  const [sobreCarpeta, setSobreCarpeta] = useState<string | null>(null);
  const [guardarEnAbierto, setGuardarEnAbierto] = useState<string | null>(null);
  const [carpetasDeItem, setCarpetasDeItem] = useState<Record<string, string[]>>({});
  const [descargarAbierto, setDescargarAbierto] = useState<string | null>(null);

  const cargarCarpetas = () =>
    fetch('/api/carpetas', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setCarpetas(Array.isArray(j) ? j : []))
      .catch(() => setCarpetas([]));

  useEffect(() => { if (user) cargarCarpetas(); }, [user]);

  const cargar = () => {
    if (carpetaActiva) {
      return fetch(`/api/carpetas/${carpetaActiva.id}/publicaciones`, { credentials: 'include' })
        .then(r => r.json())
        .then(j => setItems(Array.isArray(j) ? j : []))
        .catch(() => setItems([]))
        .finally(() => setCargando(false));
    }
    const p = new URLSearchParams();
    if (modo === 'mias' && user) p.set('autor', user.id);
    if (busqueda.trim()) p.set('q', busqueda.trim());
    return fetch(`/api/publicaciones?${p}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => setItems(Array.isArray(j) ? j : []))
      .catch(() => setItems([]))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    if (modo === 'mias' && !user) { setCargando(false); return; }
    setCargando(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(cargar, carpetaActiva ? 0 : 280);
    return () => clearTimeout(debounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modo, user, busqueda, carpetaActiva]);

  const cargarPapelera = () =>
    fetch('/api/papelera', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setPapelera(Array.isArray(j) ? j : []))
      .catch(() => setPapelera([]));

  useEffect(() => { if (modo === 'mias' && user) cargarPapelera(); }, [modo, user]);

  // Cerrar cualquier menú/popover flotante al pulsar fuera.
  useEffect(() => {
    if (!menuAbierto && !guardarEnAbierto && !descargarAbierto) return;
    const fuera = () => { setMenuAbierto(null); setGuardarEnAbierto(null); setDescargarAbierto(null); };
    window.addEventListener('click', fuera);
    return () => window.removeEventListener('click', fuera);
  }, [menuAbierto, guardarEnAbierto, descargarAbierto]);

  const visibles = useMemo(() => {
    const kinds = TIPOS.find(t => t.label === tipo)?.kinds;
    let lista = kinds ? items.filter(i => kinds.includes(i.kind)) : items;
    // Dentro de una carpeta el buscador no ha ido al servidor (esa llamada
    // trae el contenido de la carpeta entera): se filtra aquí por título.
    if (carpetaActiva && busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      lista = lista.filter(i => i.titulo.toLowerCase().includes(q));
    }
    return lista;
  }, [items, tipo, carpetaActiva, busqueda]);

  const accion = async (url: string, opciones: RequestInit) => {
    const r = await fetch(url, { credentials: 'include', ...opciones });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || 'No se ha podido hacer.');
      return false;
    }
    await cargar();
    if (modo === 'mias') cargarPapelera();
    return true;
  };

  const cambiarVisibilidad = (pub: Publicacion) =>
    accion(`/api/publicaciones/${pub.tipo}/${pub.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publico: !pub.publico }),
    });

  const eliminar = (pub: Publicacion) => {
    if (!confirm(`«${pub.titulo}» irá a la papelera y se borrará del todo en 15 días. ¿Seguir?`)) return;
    return accion(`/api/publicaciones/${pub.tipo}/${pub.id}`, { method: 'DELETE' });
  };

  const restaurar = async (fila: any) => {
    await fetch(`/api/publicaciones/${fila.tipo}/${fila.id}/restaurar`, { method: 'POST', credentials: 'include' });
    await cargarPapelera();
    cargar();
  };

  // -- Carpetas: crear, arrastrar, guardar en, quitar --
  const crearCarpeta = async () => {
    const nombre = nuevaCarpeta.trim();
    if (!nombre) return;
    const r = await fetch('/api/carpetas', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    });
    const j = await r.json();
    if (!r.ok) { alert(j.error || 'No se ha podido crear la carpeta.'); return; }
    setNuevaCarpeta(''); setCreandoCarpeta(false);
    cargarCarpetas();
  };

  const borrarCarpeta = async (c: Carpeta) => {
    if (!confirm(`¿Borrar la carpeta «${c.nombre}»? Lo que hay dentro no se borra, solo deja de estar ahí.`)) return;
    await fetch(`/api/carpetas/${c.id}`, { method: 'DELETE', credentials: 'include' });
    if (carpetaActiva?.id === c.id) setCarpetaActiva(null);
    cargarCarpetas();
  };

  const carpetasDe = async (pub: Publicacion) => {
    const clave = `${pub.tipo}-${pub.id}`;
    if (carpetasDeItem[clave]) return carpetasDeItem[clave];
    const r = await fetch(`/api/publicaciones/${pub.tipo}/${pub.id}/carpetas`, { credentials: 'include' });
    const j = await r.json().catch(() => []);
    const ids = (Array.isArray(j) ? j : []).map((c: any) => c.id);
    setCarpetasDeItem(prev => ({ ...prev, [clave]: ids }));
    return ids;
  };

  const guardarEnCarpetas = async (pub: Publicacion, ids: string[]) => {
    const clave = `${pub.tipo}-${pub.id}`;
    setCarpetasDeItem(prev => ({ ...prev, [clave]: ids }));
    await fetch(`/api/publicaciones/${pub.tipo}/${pub.id}/carpetas`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carpeta_ids: ids }),
    });
    cargarCarpetas();
    if (carpetaActiva) cargar();
  };

  const alternarCarpeta = async (pub: Publicacion, carpetaId: string) => {
    const actuales = await carpetasDe(pub);
    const nuevas = actuales.includes(carpetaId) ? actuales.filter(x => x !== carpetaId) : [...actuales, carpetaId];
    await guardarEnCarpetas(pub, nuevas);
  };

  const soltarEnCarpeta = async (carpetaId: string, e: React.DragEvent) => {
    e.preventDefault();
    setSobreCarpeta(null);
    let ref: { tipo: string; id: string } | null = null;
    try { ref = JSON.parse(e.dataTransfer.getData('application/json')); } catch { /* no era una tarjeta */ }
    if (!ref) return;
    const pub = items.find(i => i.tipo === ref!.tipo && i.id === ref!.id);
    if (!pub) return;
    const actuales = await carpetasDe(pub);
    if (actuales.includes(carpetaId)) return;
    await guardarEnCarpetas(pub, [...actuales, carpetaId]);
  };

  const ordenarConIA = async () => {
    setOrganizando(true);
    setAvisoIA(null);
    const r = await fetch('/api/carpetas/auto-organizar', { method: 'POST', credentials: 'include' });
    const j = await r.json();
    setOrganizando(false);
    if (!r.ok) { setAvisoIA(j.error || 'No se ha podido organizar.'); return; }
    const resumen = (j.carpetas || []).map((c: any) => `${c.nombre} (${c.piezas})`).join(', ');
    setAvisoIA(resumen ? `Hecho: ${resumen}.` : 'No ha encontrado ningún tema claro todavía.');
    cargarCarpetas();
    if (carpetaActiva) cargar();
    setTimeout(() => setAvisoIA(null), 8000);
  };

  if (modo === 'mias' && !user) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <UserIcon className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-black text-slate-900">Mis publicaciones</h1>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            Entra y aquí tendrás todo lo que publicas —tus mapas, tus lienzos, tus proyectos,
            tus documentos— para editarlo, decidir quién lo ve y ordenarlo en tus carpetas.
          </p>
          <Link to="/login" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex overflow-hidden">

      {/* ------------------------------------------------------------------ */}
      {/* Carpetas: menú lateral izquierdo, solo con sesión.                  */}
      {/* ------------------------------------------------------------------ */}
      {user && (
        <aside className="w-56 shrink-0 border-r border-slate-100 bg-slate-50/60 flex flex-col overflow-hidden">
          <div className="px-4 pt-5 pb-3 flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Carpetas</p>
            <button onClick={() => setCreandoCarpeta(v => !v)} title="Nueva carpeta"
              className="p-1 text-slate-400 hover:text-emerald-600 rounded-md hover:bg-white transition-colors">
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {creandoCarpeta && (
            <form onSubmit={e => { e.preventDefault(); crearCarpeta(); }} className="px-3 mb-2 flex gap-1">
              <input
                autoFocus value={nuevaCarpeta} onChange={e => setNuevaCarpeta(e.target.value)}
                placeholder="p. ej. Salud" onBlur={() => !nuevaCarpeta && setCreandoCarpeta(false)}
                className="flex-1 min-w-0 px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300 bg-white"
              />
              <button type="submit" className="px-2 bg-slate-900 text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
            </form>
          )}

          <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
            <button
              onClick={() => setCarpetaActiva(null)}
              className={cn('w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors text-left',
                !carpetaActiva ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white')}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" /> Todas
            </button>

            {carpetas.map(c => (
              <div
                key={c.id}
                onClick={() => setCarpetaActiva(c)}
                onDragOver={e => { e.preventDefault(); setSobreCarpeta(c.id); }}
                onDragLeave={() => setSobreCarpeta(s => (s === c.id ? null : s))}
                onDrop={e => soltarEnCarpeta(c.id, e)}
                className={cn('group w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer',
                  carpetaActiva?.id === c.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white',
                  sobreCarpeta === c.id && 'ring-2 ring-emerald-400 bg-emerald-50 text-emerald-700')}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color || colorDe(c.id) }} />
                <span className="flex-1 truncate">{c.nombre}</span>
                <span className={cn('text-[10px] font-black shrink-0', carpetaActiva?.id === c.id ? 'text-white/60' : 'text-slate-400')}>{c.piezas}</span>
                <button
                  onClick={e => { e.stopPropagation(); borrarCarpeta(c); }}
                  className={cn('shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                    carpetaActiva?.id === c.id ? 'text-white/60 hover:text-white' : 'text-slate-300 hover:text-rose-500')}
                  title="Borrar carpeta"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {!carpetas.length && !creandoCarpeta && (
              <p className="px-2.5 py-3 text-[11px] text-slate-400 leading-relaxed">
                Todavía no tienes carpetas. Crea una o pide que la IA las organice por ti.
              </p>
            )}
          </div>

          <div className="p-2.5 border-t border-slate-100">
            <button
              onClick={ordenarConIA} disabled={organizando}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 text-indigo-700 rounded-xl text-[11px] font-black transition-colors"
            >
              {organizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Ordenar con IA
            </button>
            {avisoIA && <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">{avisoIA}</p>}
          </div>
        </aside>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Contenido principal                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 pt-5 pb-24">

          {/* Barra compacta: modo, carpeta, papelera y contador en una sola línea
              (2026-08-08 — antes eran tres bloques apilados que empujaban las
              publicaciones muy abajo en la pantalla). */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg shrink-0">
              <button
                onClick={() => cambiarModo('humanidad')}
                className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all',
                  modo === 'humanidad' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
              >
                <Globe2 className="w-3.5 h-3.5" /> Humanidad
              </button>
              <button
                onClick={() => cambiarModo('mias')}
                className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-black transition-all',
                  modo === 'mias' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
              >
                <Users2 className="w-3.5 h-3.5" /> Mías
              </button>
            </div>

            {carpetaActiva && (
              <button onClick={() => setCarpetaActiva(null)}
                className="inline-flex items-center gap-1.5 shrink-0 pl-1.5 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: carpetaActiva.color || colorDe(carpetaActiva.id) }} />
                {carpetaActiva.nombre}
              </button>
            )}

            {user && !carpetaActiva && (
              <button
                onClick={() => setVerPapelera(v => !v)}
                className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors shrink-0',
                  verPapelera ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400')}
              >
                <Trash className="w-3.5 h-3.5" />
                {papelera.length ? `Papelera · ${papelera.length}` : 'Papelera'}
              </button>
            )}

            <p className="text-[11px] font-bold text-slate-400 shrink-0 ml-auto">
              {verPapelera && !carpetaActiva ? `${papelera.length} en la papelera`
                : carpetaActiva ? `${visibles.length} dentro`
                : `${visibles.length} publicaciones`}
            </p>
          </div>

          {verPapelera && !carpetaActiva ? (
            <div className="mt-5">
              <p className="text-xs text-slate-500 mb-4">
                Lo que has eliminado se guarda 15 días. Después se borra de verdad y no hay vuelta atrás.
              </p>
              {!papelera.length ? (
                <div className="text-center py-24">
                  <Trash className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">La papelera está vacía.</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {papelera.map(f => (
                    <div key={`${f.tipo}-${f.id}`} className="bg-white border border-slate-200 rounded-2xl p-4">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{f.kind}</p>
                          <p className="text-[13px] font-black text-slate-900 leading-snug line-clamp-2 mt-0.5">{f.titulo}</p>
                        </div>
                        <button onClick={() => restaurar(f)} title="Restaurar"
                          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-colors shrink-0">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                      <p className={cn('text-[11px] font-bold mt-2 inline-flex items-center gap-1',
                        f.dias_restantes <= 3 ? 'text-rose-600' : 'text-slate-400')}>
                        <CircleDot className="w-3 h-3" />
                        {f.dias_restantes > 0 ? `Quedan ${f.dias_restantes} ${f.dias_restantes === 1 ? 'día' : 'días'}` : 'Se borra hoy'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Buscador y tipos: se quedan también dentro de una carpeta —
                  el tipo filtra su contenido igual que el de fuera, y el
                  buscador filtra por título lo que ya se ha cargado. Una sola
                  fila compacta y pegajosa; los tipos se desplazan en horizontal
                  en vez de envolver en varias líneas (2026-08-08). */}
              <div className="sticky top-0 bg-white/95 backdrop-blur z-20 -mx-2 px-2 py-2 rounded-2xl flex items-center gap-2">
                <div className="relative flex-1 min-w-[140px] max-w-xs shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar…"
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:thin] pb-0.5">
                  {TIPOS.map(t => (
                    <button
                      key={t.label}
                      onClick={() => setTipo(t.label)}
                      className={cn('shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors',
                        tipo === t.label ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400')}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {cargando ? (
                <p className="text-sm text-slate-400 text-center py-24">Buscando…</p>
              ) : !visibles.length ? (
                <div className="text-center py-24">
                  <LayoutGrid className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">
                    {carpetaActiva ? 'Esta carpeta está vacía. Arrastra una tarjeta hasta ella, o usa «Guardar en».'
                      : busqueda ? `Nada sobre «${busqueda}».`
                        : modo === 'mias' ? 'Todavía no has publicado nada.' : 'Aún no hay publicaciones.'}
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
                  {visibles.map(it => {
                    const clave = `${it.tipo}-${it.id}`;
                    return (
                      <div
                        key={clave}
                        draggable={!!user}
                        onDragStart={e => e.dataTransfer.setData('application/json', JSON.stringify({ tipo: it.tipo, id: it.id }))}
                        onClick={() => it.kind === 'pagina' ? navigate(`/documentos/${it.id}`) : setAbierta({ pub: it, editar: false })}
                        className="relative text-left bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-slate-300 hover:-translate-y-0.5 transition-all flex flex-col cursor-pointer"
                      >
                        <div className="px-3.5 pt-3 flex items-center gap-1.5">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{it.kind}</span>
                          {it.ia && <Sparkles className="w-2.5 h-2.5 text-amber-500" />}
                          {!it.publico && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                              <Lock className="w-2 h-2" />Privada
                            </span>
                          )}
                          {it.estado === 'terminado' && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">Terminada</span>
                          )}
                          {it.personal && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">Tuyo</span>
                          )}

                          <div className="ml-auto relative">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setMenuAbierto(menuAbierto === clave ? null : clave);
                                setGuardarEnAbierto(null); setDescargarAbierto(null);
                                if (user) carpetasDe(it);
                              }}
                              className="p-1 -mr-1 text-slate-300 hover:text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
                              title="Opciones"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {menuAbierto === clave && (
                              <div onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-6 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1">
                                {it.puedo_editar && (
                                  <button onClick={() => { setMenuAbierto(null); setAbierta({ pub: it, editar: true }); }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar
                                  </button>
                                )}
                                {user && (
                                  <button onClick={() => { setGuardarEnAbierto(clave); setMenuAbierto(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                                    <Bookmark className="w-3.5 h-3.5 text-slate-400" /> Guardar en…
                                  </button>
                                )}
                                {carpetaActiva && (
                                  <button
                                    onClick={async () => {
                                      setMenuAbierto(null);
                                      const actuales = await carpetasDe(it);
                                      await guardarEnCarpetas(it, actuales.filter(x => x !== carpetaActiva.id));
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" /> Quitar de esta carpeta
                                  </button>
                                )}
                                <button onClick={() => { setDescargarAbierto(clave); setMenuAbierto(null); }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                                  <Download className="w-3.5 h-3.5 text-slate-400" /> Descargar
                                </button>
                                {it.soy_autor && (
                                  <>
                                    <div className="h-px bg-slate-100 my-1" />
                                    <button onClick={() => { setMenuAbierto(null); cambiarVisibilidad(it); }}
                                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                                      {it.publico ? <><Lock className="w-3.5 h-3.5 text-slate-400" /> Hacer privada</> : <><Globe className="w-3.5 h-3.5 text-slate-400" /> Hacer pública</>}
                                    </button>
                                    <button onClick={() => { setMenuAbierto(null); eliminar(it); }}
                                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2">
                                      <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            {guardarEnAbierto === clave && (
                              <div onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-6 z-30 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-2">
                                <p className="px-3 pb-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Guardar en</p>
                                {carpetas.length ? carpetas.map(c => {
                                  const marcada = (carpetasDeItem[clave] || []).includes(c.id);
                                  return (
                                    <button key={c.id} onClick={() => alternarCarpeta(it, c.id)}
                                      className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                                      <span className={cn('w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center',
                                        marcada ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300')}>
                                        {marcada && <Check className="w-2.5 h-2.5 text-white" />}
                                      </span>
                                      <span className="truncate flex-1">{c.nombre}</span>
                                    </button>
                                  );
                                }) : (
                                  <p className="px-3 py-1.5 text-[11px] text-slate-400">Crea una carpeta primero, en el menú de la izquierda.</p>
                                )}
                              </div>
                            )}

                            {descargarAbierto === clave && (
                              <div onClick={e => e.stopPropagation()}
                                className="absolute right-0 top-6 z-30 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1">
                                {formatosDescarga(it).map(f => (
                                  <button key={f.id} onClick={() => { f.accion(); setDescargarAbierto(null); }}
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                                    <Download className="w-3.5 h-3.5 text-slate-400" /> {f.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
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
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {abierta && (
        <FichaPublicacion
          pub={abierta.pub}
          editarAlAbrir={abierta.editar}
          onIr={ruta => navigate(ruta)}
          onCambiada={() => { cargar(); if (modo === 'mias') cargarPapelera(); }}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </div>
  );
}
