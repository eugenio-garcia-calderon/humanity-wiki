// ============================================================================
// ARCHIVOS (2026-08-20, petición de Eugenio: «todos los archivos de todos los
// tipos que sean del usuario, todos los documentos, notas, imágenes,
// ordenadito y compacto, y poder abrirlos y editarlos. Sincronizado con lo que
// se crea en el mundo 3D y en los grafos»).
// ============================================================================
// Tu cajón único. No guarda nada: LEE las tres fuentes donde ya vive lo tuyo
// (lienzos, muro y mundo 3D) y las enseña juntas, ordenadas por fecha. Por eso
// está sincronizado por construcción — no hay copia que se quede vieja.
//
// La lista es una TABLA compacta, no una rejilla de tarjetas: aquí no vienes a
// mirar, vienes a encontrar algo concreto entre muchas cosas, y en una fila
// caben el tipo, el nombre, dónde está y cuándo lo tocaste.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database, Search, Loader2, FileText, StickyNote, Image as ImageIcon, Video, Table2,
  CheckSquare, Globe2, Gamepad2, Music, MessageSquare, Lock, ExternalLink, Pencil, FolderKanban,
  Presentation, Users2, Link as LinkIcon,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

interface Archivo {
  id: string;
  origen: 'lienzo' | 'paginas' | 'muro' | 'mundo3d';
  tipo: string;
  titulo: string;
  resumen: string | null;
  imagen: string | null;
  url: string | null;
  fecha: string;
  privado: boolean;
  abrir: string;
  contexto: string | null;
}

/** Icono y etiqueta por tipo. Un tipo que no esté aquí sale con su nombre
 *  crudo: mejor enseñar algo desconocido que esconderlo. */
const TIPOS: Record<string, { icono: any; etiqueta: string; color: string }> = {
  documento: { icono: FileText, etiqueta: 'Documento', color: 'text-sky-600' },
  nota: { icono: StickyNote, etiqueta: 'Nota', color: 'text-amber-600' },
  texto: { icono: StickyNote, etiqueta: 'Nota', color: 'text-amber-600' },
  imagen: { icono: ImageIcon, etiqueta: 'Imagen', color: 'text-violet-600' },
  video: { icono: Video, etiqueta: 'Vídeo', color: 'text-rose-600' },
  musica: { icono: Music, etiqueta: 'Música', color: 'text-fuchsia-600' },
  tabla: { icono: Table2, etiqueta: 'Tabla', color: 'text-teal-600' },
  tarea: { icono: CheckSquare, etiqueta: 'Tarea', color: 'text-emerald-600' },
  proyecto: { icono: FolderKanban, etiqueta: 'Proyecto', color: 'text-indigo-600' },
  lienzo: { icono: Globe2, etiqueta: 'Esquema', color: 'text-emerald-600' },
  publicacion: { icono: MessageSquare, etiqueta: 'Publicación', color: 'text-slate-500' },
  mapa: { icono: Globe2, etiqueta: 'Mapa', color: 'text-blue-600' },
  // Los que faltaban y salían en crudo (2026-08-20): en la fila de filtros
  // convivían «Nota» y «Documento» con «pagina», «wikipedia», «presentacion»,
  // «soluciones» y «autores» — los identificadores internos, tal cual.
  pagina: { icono: FileText, etiqueta: 'Página', color: 'text-sky-600' },
  wikipedia: { icono: Globe2, etiqueta: 'Wikipedia', color: 'text-slate-600' },
  presentacion: { icono: Presentation, etiqueta: 'Presentación', color: 'text-orange-600' },
  soluciones: { icono: CheckSquare, etiqueta: 'Soluciones', color: 'text-emerald-600' },
  autores: { icono: Users2, etiqueta: 'Autores', color: 'text-indigo-600' },
  enlace: { icono: LinkIcon, etiqueta: 'Enlace', color: 'text-blue-500' },
  grafica: { icono: Table2, etiqueta: 'Gráfica', color: 'text-teal-600' },
  ficha: { icono: FileText, etiqueta: 'Ficha', color: 'text-slate-600' },
};
/** Un tipo desconocido sale al menos con su inicial en mayúscula, nunca con el
 *  identificador crudo: «Presentacion» se lee, «presentacion» canta. */
const infoTipo = (t: string) => TIPOS[t] || {
  icono: FileText,
  etiqueta: (t || '').replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase()),
  color: 'text-slate-400',
};

const ORIGENES: Record<Archivo['origen'], { etiqueta: string; icono: any }> = {
  lienzo: { etiqueta: 'Esquemas', icono: Globe2 },
  paginas: { etiqueta: 'Páginas', icono: FileText },
  muro: { etiqueta: 'Muro', icono: MessageSquare },
  mundo3d: { etiqueta: 'Mundo 3D', icono: Gamepad2 },
};

/** «hace 3 h», «ayer», «12 mar» — más corto de leer que una fecha completa. */
function cuando(iso: string): string {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Archivos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [origen, setOrigen] = useState<'todos' | Archivo['origen']>('todos');
  const [tipo, setTipo] = useState<string>('todos');

  useEffect(() => {
    if (!user) { setCargando(false); return; }
    let vivo = true;
    setCargando(true);
    fetch('/api/archivos', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!vivo) return;
        if (d?.error) { setError(d.error); return; }
        setArchivos(Array.isArray(d) ? d : []);
      })
      .catch(() => { if (vivo) setError('No se han podido cargar tus archivos.'); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [user]);

  /** Los tipos que existen DE VERDAD en lo tuyo: un filtro con tipos vacíos
   *  es ruido. */
  const tiposPresentes = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const a of archivos) {
      if (origen !== 'todos' && a.origen !== origen) continue;
      cuenta.set(a.tipo, (cuenta.get(a.tipo) || 0) + 1);
    }
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]);
  }, [archivos, origen]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return archivos.filter(a =>
      (origen === 'todos' || a.origen === origen)
      && (tipo === 'todos' || a.tipo === tipo)
      && (!q || a.titulo.toLowerCase().includes(q) || (a.resumen || '').toLowerCase().includes(q)));
  }, [archivos, busqueda, origen, tipo]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto w-full py-20 text-center">
        <Database className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">Inicia sesión para ver tus archivos.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <Database className="w-5 h-5 text-emerald-600" /> Archivos
        </h1>
        <span className="text-xs font-bold text-slate-400">
          {cargando ? '' : `${visibles.length} de ${archivos.length}`}
        </span>
        <div className="flex-1 min-w-[8rem]" />
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 focus-within:border-emerald-300">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar en todo lo tuyo…"
            className="w-44 sm:w-64 text-xs text-slate-700 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Filtros: de dónde viene y de qué tipo es */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        {(['todos', 'lienzo', 'muro', 'mundo3d'] as const).map(o => {
          const activo = origen === o;
          const Icono = o === 'todos' ? Database : ORIGENES[o].icono;
          return (
            <button
              key={o}
              onClick={() => { setOrigen(o); setTipo('todos'); }}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors',
                activo ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              <Icono className="w-3.5 h-3.5" />
              {o === 'todos' ? 'Todo' : ORIGENES[o].etiqueta}
            </button>
          );
        })}
        {tiposPresentes.length > 1 && (
          <>
            <span className="w-px h-5 bg-slate-200 mx-1" />
            <button
              onClick={() => setTipo('todos')}
              className={cn('px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors',
                tipo === 'todos' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}
            >
              Todos los tipos
            </button>
            {tiposPresentes.map(([t, n]) => {
              const { icono: Icono, etiqueta, color } = infoTipo(t);
              return (
                <button
                  key={t}
                  onClick={() => setTipo(tipo === t ? 'todos' : t)}
                  className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors',
                    tipo === t ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}
                >
                  <Icono className={cn('w-3 h-3', tipo === t ? 'text-emerald-600' : color)} />
                  {etiqueta} <span className="text-slate-400">{n}</span>
                </button>
              );
            })}
          </>
        )}
      </div>

      {error && (
        <p className="mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">{error}</p>
      )}

      {cargando ? (
        <div className="py-24 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
      ) : visibles.length === 0 ? (
        <div className="py-20 text-center">
          <Database className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-500">
            {archivos.length === 0
              ? 'Todavía no has creado nada.'
              : 'Nada con esos filtros.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Lo que crees en los lienzos, en el muro o en el Mundo 3D aparecerá aquí solo.
          </p>
        </div>
      ) : (
        /* Filas compactas: tipo · nombre · dónde · cuándo · acciones */
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
          {visibles.map(a => {
            const { icono: Icono, etiqueta, color } = infoTipo(a.tipo);
            return (
              <div key={`${a.origen}-${a.id}`} className="group flex items-center gap-3 px-3 py-2 hover:bg-slate-50/70 transition-colors">
                {/* Miniatura si la hay; si no, el icono del tipo */}
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden grid place-items-center shrink-0">
                  {a.imagen
                    ? <img src={a.imagen} alt="" loading="lazy" className="w-full h-full object-cover" />
                    : <Icono className={cn('w-4 h-4', color)} />}
                </div>

                <button
                  onClick={() => navigate(a.abrir)}
                  className="flex-1 min-w-0 text-left"
                  title={a.resumen || a.titulo}
                >
                  <p className="text-[13px] font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                    {a.titulo}
                    {a.privado && <Lock className="inline w-3 h-3 ml-1.5 -mt-0.5 text-slate-300" />}
                  </p>
                  {a.resumen && (
                    <p className="text-[11px] text-slate-400 truncate">{a.resumen}</p>
                  )}
                </button>

                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-500 shrink-0 max-w-[11rem]">
                  <span className="truncate">{a.contexto || ORIGENES[a.origen].etiqueta}</span>
                </span>
                <span className="hidden md:block text-[10px] font-bold text-slate-400 w-24 text-right shrink-0">
                  {cuando(a.fecha)}
                </span>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => navigate(a.abrir)}
                    title="Abrir y editar donde vive"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {a.url && (
                    <a
                      href={a.url} target="_blank" rel="noreferrer"
                      title="Abrir el archivo original"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
