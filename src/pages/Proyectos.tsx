import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FolderKanban, Plus, X, User as UserIcon, Lock, Globe, ArrowLeft, Pencil, Check,
  Users, Trash2, Loader2, FileText, Globe2, Map as MapIcon, ListChecks,
  Package, Table2, CalendarDays, Bookmark, ExternalLink,
  Megaphone, ImageIcon, Video, Paperclip, Link2, Send,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TableroKanban, { type ItemTablero, type Grupo, idDeEtiqueta } from '../components/tablero/TableroKanban';
import { cn } from '../utils/cn';
import { useEsMovil } from '../hooks/useEsMovil';
import IconoElemento from '../components/ui/Icono';
import { iconoDeProyecto } from '../utils/iconoDeNombre';
import Adjuntos from '../components/archivo/Adjuntos';
import PopupRenombrar from '../components/layout/menu/PopupRenombrar';

// ============================================================================
// PROYECTOS DE CADA PERSONA (2026-08-08, petición del usuario)
// ============================================================================
// El mismo tablero que lleva la hoja de ruta de humanity.wiki, para lo que
// cada cual quiera organizar: su visión arriba, sus grupos, y el kanban de
// hecho / en curso / por hacer con la ficha de detalle al pulsar una tarjeta.

// ----------------------------------------------------------------------------
// El listado
// ----------------------------------------------------------------------------
export function Proyectos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  // Con `?nuevo=1` el diálogo nace abierto: es lo que manda el «+» de la
  // sección PROYECTOS del menú (2026-08-20), que antes solo traía al índice.
  const [creando, setCreando] = useState(() => new URLSearchParams(window.location.search).get('nuevo') === '1');

  const cargar = () => fetch('/api/proyectos', { credentials: 'include' })
    .then(r => r.json())
    .then(j => setProyectos(Array.isArray(j) ? j : []))
    .catch(() => setProyectos([]))
    .finally(() => setCargando(false));

  useEffect(() => { cargar(); }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-8 pb-24">
        {/* EL TÍTULO, UNA VEZ (2026-08-22, Eugenio: «no le llames Tus
            Tableros, simplemente deja el título de Proyectos, una vez arriba
            simple, y quita la descripción, y junto al nombre deja el botón de
            +Crear Nuevo»).

            Antes había DOS títulos: «Proyectos» arriba en pequeño y «Tus
            tableros» debajo en grande, más un párrafo explicando qué es un
            tablero. Tres líneas para decir dónde estás, en la página donde uno
            entra veinte veces al día ya sabiéndolo. El botón se sube al lado
            del nombre porque es lo único que se hace desde aquí aparte de
            entrar en uno. */}
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 inline-flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-slate-400" /> Proyectos
          </h1>
          {user && (
            <button onClick={() => setCreando(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow transition-colors">
              <Plus className="w-3.5 h-3.5" /> Crear nuevo
            </button>
          )}
        </div>

        {cargando ? (
          <p className="text-sm text-slate-400 text-center py-24">Cargando…</p>
        ) : !proyectos.length ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl mt-8">
            <FolderKanban className="w-9 h-9 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Todavía no hay proyectos.</p>
            {user
              ? <button onClick={() => setCreando(true)} className="mt-3 text-sm font-black text-emerald-700 hover:text-emerald-900">Crea el primero</button>
              : <Link to="/login" className="mt-3 inline-block text-sm font-black text-emerald-700">Entra para crear el tuyo</Link>}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-8">
            {proyectos.map(p => {
              const avance = p.tarjetas ? Math.round((p.hechas / p.tarjetas) * 100) : 0;
              return (
                <Link key={p.id} to={`/proyectos/${p.slug}`}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:border-slate-300 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {p.publico ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {p.publico ? 'Público' : 'Privado'}
                    </span>
                  </div>
                  <p className="text-lg font-black text-slate-900 leading-tight flex items-center gap-1.5">
                    <IconoElemento valor={p.icono} tamano={20} />
                    <span>{p.titulo}</span>
                  </p>
                  {p.descripcion && <p className="text-xs text-slate-500 leading-relaxed mt-1 line-clamp-2">{p.descripcion}</p>}
                  <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avance}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="w-2.5 h-2.5" />{p.creador_nombre || 'Anónimo'}
                    </span>
                    <span>{p.hechas} de {p.tarjetas} · {avance}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {creando && (
        <ModalNuevoProyecto
          onCerrar={() => setCreando(false)}
          onCreado={p => navigate(`/proyectos/${p.slug}`)}
        />
      )}
    </div>
  );
}

function ModalNuevoProyecto({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (p: any) => void }) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [vision, setVision] = useState('');
  const [publico, setPublico] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300';

  const crear = async () => {
    if (!titulo.trim()) { setError('El proyecto necesita un nombre.'); return; }
    setGuardando(true); setError(null);
    try {
      const r = await fetch('/api/proyectos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim() || null, vision: vision.trim() || null, publico }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo crear.');
      // Que el menú lateral se entere (2026-08-20): antes seguía diciendo
      // «PROYECTOS 4» y el nuevo no salía hasta recargar la página entera.
      window.dispatchEvent(new Event('humanity:menu-cambiado'));
      onCreado(j);
    } catch (e: any) { setError(e.message); setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onCerrar}>
      {/* Un diálogo tiene que DECIR que lo es (2026-08-20): sin `role` ni
          `aria-modal` un lector de pantalla lo lee como un trozo más de la
          página y la persona no sabe que se ha abierto nada. */}
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-nuevo-proyecto"
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 id="titulo-nuevo-proyecto" className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-emerald-600" /> Nuevo proyecto
          </h2>
          <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 flex-1 overflow-y-auto">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus className={input} placeholder="p. ej. Reforestar mi comarca" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">De qué va (una línea)</label>
            <input value={descripcion} onChange={e => setDescripcion(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">La visión (opcional)</label>
            <textarea value={vision} onChange={e => setVision(e.target.value)} rows={3} className={cn(input, 'resize-none')}
              placeholder="Para qué existe este proyecto y qué quiere conseguir." />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={publico} onChange={e => setPublico(e.target.checked)} className="accent-emerald-600" />
            Público — cualquiera puede verlo (solo tú puedes editarlo)
          </label>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{error}</p>}
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2 shrink-0">
          <button onClick={onCerrar} className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={crear} disabled={guardando}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-40">
            {guardando ? 'Creando…' : 'Crear proyecto'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// El tablero de un proyecto
// ----------------------------------------------------------------------------
/** Lo que se puede crear DESDE un proyecto. Es la lista de herramientas de la
 *  plataforma que producen algo que puede vivir dentro de un proyecto — el
 *  Navegador o Explorar no crean nada tuyo, así que no están. */
const HERRAMIENTAS_PROYECTO: Array<{ tipo: string; label: string; icono: any }> = [
  { tipo: 'tarea',   label: 'Tarea',   icono: ListChecks },
  { tipo: 'pagina',  label: 'Página',  icono: FileText },
  { tipo: 'esquema', label: 'Esquema', icono: Globe2 },
  { tipo: 'mapa',    label: 'Mapa',    icono: MapIcon },
  // PUBLICAR DENTRO DEL PROYECTO (Eugenio, 2026-08-23). Es la única de las
  // cinco que no te saca de la página: se escribe aquí mismo.
  { tipo: 'publicacion', label: 'Publicación', icono: Megaphone },
];

export function Proyecto() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navegar = useNavigate();
  const [proyecto, setProyecto] = useState<any>(null);
  const [items, setItems] = useState<ItemTablero[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Qué tarjeta nueva se está creando: en qué grupo y en qué columna cae.
  const [nueva, setNueva] = useState<{ grupo: string; estado: string } | null>(null);
  const [creando, setCreando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [quitando, setQuitando] = useState(false);
  const [renombrando, setRenombrando] = useState(false);
  // La publicación recién creada, abierta para escribirla sin salir de aquí.
  const [publicando, setPublicando] = useState<string | null>(null);

  /** Solo el dueño (o un administrador) toca el proyecto. */
  const puedoEditar = !!user && !!proyecto
    && (proyecto.creador_user_id === user.id || (user.roleLevel ?? 0) >= 4);

  const crearHerramienta = async (tipo: string) => {
    if (!proyecto || creando) return;
    // UNA TAREA SE PREGUNTA ANTES DE CREARLA (2026-08-20). Este botón metía al
    // instante una «Tarea sin título» en el tablero, sin diálogo, sin decir
    // nada y sin poder deshacerlo — mientras el botón verde de al lado, que se
    // llama casi igual, sí abría el formulario. Dos botones homónimos con dos
    // comportamientos distintos. Ahora los dos abren el MISMO formulario.
    if (tipo === 'tarea') {
      setNueva({ grupo: grupos[0]?.id, estado: 'por_hacer' });
      return;
    }
    setCreando(tipo);
    try {
      const r = await fetch(`/api/proyectos/${proyecto.id}/herramienta`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d?.error || 'No se ha podido crear.'); return; }
      // El menú lateral enseña lo que cuelga de cada proyecto: que se entere.
      window.dispatchEvent(new Event('humanity:menu-cambiado'));
      // Crear algo es querer usarlo, así que se entra. Una tarea no tiene
      // página propia: se queda en este tablero y basta con recargarlo.
      // Una publicación no tiene página propia y tampoco es una tarjeta del
      // tablero: se escribe aquí mismo, debajo, con el foco puesto.
      if (d.publicacion) setPublicando(d.id);
      else if (d.abrir) navegar(d.abrir);
      else cargarItems(proyecto.id);
    } catch {
      setError('No se ha podido crear.');
    } finally { setCreando(null); }
  };

  const quitarProyecto = async () => {
    if (!proyecto || quitando) return;
    setQuitando(true);
    try {
      const r = await fetch(`/api/proyectos/${proyecto.id}`, { method: 'DELETE', credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error || 'No se ha podido quitar.'); return; }
      window.dispatchEvent(new Event('humanity:menu-cambiado'));
      navegar('/proyectos');
    } finally { setQuitando(false); }
  };

  const cargarItems = (id: string) =>
    fetch(`/api/roadmap?proyecto=${id}`, { credentials: 'include' })
      .then(r => r.json()).then(j => setItems(Array.isArray(j) ? j : [])).catch(() => setItems([]));

  useEffect(() => {
    fetch(`/api/proyectos/${slug}`, { credentials: 'include' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; })
      .then(p => { setProyecto(p); cargarItems(p.id); })
      .catch(e => setError(e.message));
  }, [slug]);

  if (error) return <p className="text-sm text-red-600 text-center py-20">{error}</p>;
  if (!proyecto) return <p className="text-sm text-slate-400 text-center py-20">Cargando el proyecto…</p>;

  const grupos: Grupo[] = Array.isArray(proyecto.grupos) ? proyecto.grupos : [];

  /** Crea una etiqueta del proyecto desde el formulario de tarjeta nueva y
   *  devuelve su id. Si ya existe una con ese nombre, se reutiliza. */
  const crearEtiquetaProyecto = (nombre: string): string => {
    const id = idDeEtiqueta(nombre);
    const yaEsta = grupos.find(g => g.id === id || g.label.toLowerCase() === nombre.trim().toLowerCase());
    if (yaEsta) return yaEsta.id;
    const paleta = ['#7c3aed', '#db2777', '#0284c7', '#16a34a', '#d97706', '#475569', '#dc2626', '#0891b2'];
    guardarGrupos([...grupos, { id, label: nombre.trim().slice(0, 40), color: paleta[grupos.length % paleta.length] }]);
    return id;
  };

  /** Guarda las etiquetas del proyecto (los «grupos» del tablero). Se pinta
   *  antes de que conteste el servidor por lo mismo que las columnas: crear
   *  una etiqueta y verla aparecer medio segundo después se siente roto. */
  const guardarGrupos = (nuevos: any[]) => {
    setProyecto((p: any) => (p ? { ...p, grupos: nuevos } : p));
    fetch(`/api/proyectos/${proyecto.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ grupos: nuevos }),
    }).catch(() => {});
  };

  /** Guarda el nombre de una columna. Se pinta ANTES de que conteste el
   *  servidor: renombrar un rótulo y verlo tardar medio segundo se siente como
   *  si no hubiera funcionado. */
  const guardarColumnas = (nombres: any) => {
    setProyecto((p: any) => (p ? { ...p, columnas: nombres } : p));
    fetch(`/api/proyectos/${proyecto.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ columnas: nombres }),
    }).catch(() => {});
  };
  const puedeEditar = !!user && (user.id === proyecto.creador_user_id || !!user.isAdmin);
  const total = items.length;
  const hechas = items.filter(i => i.estado === 'hecho').length;
  const avance = total ? Math.round((hechas / total) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto">
      {/* QUITAR EL PROYECTO. Se pregunta antes, y se dice EXACTAMENTE qué pasa
          con lo de dentro: la sorpresa que nadie quiere es descubrir que
          archivar la carpeta se llevó por delante meses de trabajo. */}
      {renombrando && proyecto && (
        <PopupRenombrar
          tipo="proyecto" id={proyecto.id}
          nombre={proyecto.titulo} icono={proyecto.icono}
          onHecho={(n, i) => {
            setProyecto((x: any) => ({ ...x, titulo: n, icono: i }));
            window.dispatchEvent(new Event('humanity:menu-cambiado'));
          }}
          onCerrar={() => setRenombrando(false)}
        />
      )}

      {borrando && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => !quitando && setBorrando(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-black text-slate-900 mb-2">¿Quitar «{proyecto.titulo}»?</h2>
            <p className="text-[12px] text-slate-600 leading-relaxed">
              El proyecto se archiva y desaparece de tu menú. <b>Nada de lo que hay dentro se borra</b>:
              sus tareas, páginas, esquemas y mapas siguen existiendo y se quedan sueltos, sin proyecto.
            </p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setBorrando(false)} disabled={quitando}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Cancelar
              </button>
              <button onClick={quitarProyecto} disabled={quitando}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-40 transition-colors">
                {quitando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 pt-8 pb-24">
        {/* EN UN MÓVIL ESTA FILA NO CABÍA, Y NO SE PODÍA DESLIZAR (2026-08-23).
            Medido a 375 px: la fila pide 474 px y se le dan 319, con
            `overflow-x: visible` — o sea que «Mapa» y la papelera se salían de
            la pantalla y **no había forma de llegar a ellos**. Justamente los
            botones para añadirle un mapa a un proyecto, en el aparato donde
            más se usa.
            No se apilan en dos líneas a propósito: son cinco acciones cortas y
            una tira que se desliza es lo que la gente ya espera de una barra de
            herramientas en el móvil. `min-w-0` en el padre es lo que permite
            que el hijo encoja; sin él el `flex` se niega a bajar del contenido
            y el desbordamiento vuelve. */}
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto sm:overflow-x-visible -mx-1 px-1 pb-1
                        [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link to="/proyectos" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" /> Proyectos
          </Link>
          <div className="flex-1 min-w-2" />

          {/* LAS HERRAMIENTAS DE LA PLATAFORMA, AQUÍ DENTRO (Eugenio,
              2026-08-20: «permite añadir todas las herramientas de la
              plataforma en esa página de proyecto»). Lo que crees desde aquí
              nace YA dentro de este proyecto, que es la diferencia con
              crearlo desde su herramienta y moverlo después. */}
          {puedoEditar && HERRAMIENTAS_PROYECTO.map(h => (
            <button
              key={h.tipo}
              onClick={() => crearHerramienta(h.tipo)}
              disabled={creando !== null}
              title={`Añadir ${h.label.toLowerCase()} a este proyecto`}
              className="inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 text-[11px] font-bold disabled:opacity-40 transition-colors"
            >
              {creando === h.tipo
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <h.icono className="w-3.5 h-3.5" />}
              {h.label}
            </button>
          ))}

          {puedoEditar && (
            <button
              onClick={() => setBorrando(true)}
              title="Quitar este proyecto"
              className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="max-w-3xl mt-4">
          <div className="flex items-center gap-1.5 mb-1.5">
            {proyecto.publico ? <Globe className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3 text-amber-600" />}
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              {proyecto.publico ? 'Proyecto público' : 'Proyecto privado'} · de {proyecto.creador_nombre || 'Anónimo'}
            </span>
          </div>
          {/* EL ICONO, JUNTO AL TÍTULO (Eugenio, 2026-08-20: «haz que la
              imagen/icono de cada elemento aparezca también en la página
              cuando se abre, junto al título en la parte superior»). Se
              reconoce la cosa igual desde el menú que desde dentro. */}
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2.5 group/tit">
            {/* SIN ICONO TAMBIÉN SE VE ALGO (Eugenio, 2026-08-20: «sigue sin
                aparecer la foto/icono al lado del título»). No fallaba el
                pintado: el proyecto simplemente NO TENÍA icono, y entonces no
                salía nada — ni un hueco donde pinchar para ponerlo.

                LO QUE SALÍA ERA SU INICIAL, Y ESO SE SUSTITUYE (D90,
                2026-08-21, Eugenio: «que no sean letras»). Ahora sale el icono
                de trazo que le toca a su nombre, el mismo que en el menú, y
                pulsarlo sigue abriendo el popup de nombre e icono. */}
            <button
              onClick={() => puedoEditar && setRenombrando(true)}
              disabled={!puedoEditar}
              title={puedoEditar ? 'Cambiar el icono' : undefined}
              className={cn('shrink-0 grid place-items-center rounded-lg text-slate-700',
                puedoEditar && 'hover:text-emerald-600 transition-colors')}
            >
              <IconoElemento
                valor={iconoDeProyecto(proyecto.icono, proyecto.titulo)}
                tamano={36}
                className="rounded-lg"
              />
            </button>
            <span>{proyecto.titulo}</span>
            {/* CAMBIAR NOMBRE E ICONO DESDE LA PROPIA PÁGINA (Eugenio,
                2026-08-20: «que tanto el título como el icono se puedan
                modificar no solo desde el menú sino también desde la página»).
                Es el MISMO popup del menú: renombrar algo es lo mismo se haga
                desde donde se haga. */}
            {puedoEditar && (
              <button onClick={() => setRenombrando(true)}
                title="Cambiar el nombre o el icono"
                className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-700 hover:bg-slate-100 opacity-0 group-hover/tit:opacity-100 focus:opacity-100 transition-all">
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </h1>
          {proyecto.descripcion && <p className="text-sm text-slate-500 mt-1.5">{proyecto.descripcion}</p>}
          {proyecto.vision && (
            <p className="text-sm text-slate-600 leading-relaxed mt-4 border-l-2 border-emerald-300 pl-4">{proyecto.vision}</p>
          )}
          {total > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-sm">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                  style={{ width: `${avance}%` }} />
              </div>
              <p className="text-xs font-bold text-slate-500"><span className="text-slate-900">{hechas}</span> de {total} · {avance}%</p>
            </div>
          )}
        </div>

        <SeccionPersonas proyectoId={proyecto.id} puedeEditar={puedeEditar} />

        {publicando && (
          <ComposerPublicacion
            proyectoId={proyecto.id}
            publicacionId={publicando}
            onCerrar={(cambio) => {
              setPublicando(null);
              // El árbol del proyecto y el menú lateral leen lo mismo: que se
              // enteren los dos, o la publicación recién escrita no aparece
              // hasta recargar.
              if (cambio) window.dispatchEvent(new Event('humanity:menu-cambiado'));
            }}
          />
        )}

        {/* LA LISTA DE LO QUE CUELGA SE HA IDO AL PANEL LATERAL (2026-08-23).
            Decisión de Eugenio al diseñar el raíl estilo Kpler: «el panel
            navega, la página muestra». Ayer esta sección listaba las páginas,
            esquemas, mapas, tablas y fechas del proyecto; hoy eso mismo está en
            el panel de Proyectos, en cascada y alcanzable desde cualquier
            pantalla. Enseñarlo en los dos sitios no es el doble de ayuda: son
            dos sitios donde buscar y dos listas que se separan en cuanto una
            cambie.
            `SeccionContenido` NO se borra: volver es descomentar esta línea, y
            el panel todavía cubre solo dos herramientas. */}
        {/* <SeccionContenido proyectoId={proyecto.id} recargar={publicando === null} /> */}

        {/* LOS ARCHIVOS DEL PROYECTO (2026-08-21). Es el sitio donde más
            falta hacía: un informe, una tabla de ensayos o un modelo 3D
            colgados aquí los encuentra mañana cualquiera del proyecto, que
            es exactamente lo que no se podía hacer. */}
        <div className="mt-6">
          <Adjuntos contenedor="proyecto_id" id={proyecto.id} puedeEditar={puedeEditar} />
        </div>

        <div className="mt-8">
          <TableroKanban
            items={items} grupos={grupos} puedeEditar={puedeEditar}
            onRecargar={() => cargarItems(proyecto.id)}
            onCrear={(g, estado) => setNueva({ grupo: g || grupos[0]?.id, estado })}
            abrirTarea={new URLSearchParams(location.search).get('tarea') || undefined}
            columnas={proyecto.columnas || null}
            onColumnas={puedeEditar ? guardarColumnas : undefined}
            onGrupos={puedeEditar ? guardarGrupos : undefined}
          />
        </div>
      </div>

      {nueva && (
        <ModalNuevaTarjeta
          proyectoId={proyecto.id} grupos={grupos}
          grupoInicial={nueva.grupo} estadoInicial={nueva.estado}
          onCrearEtiqueta={puedeEditar ? crearEtiquetaProyecto : undefined}
          onCerrar={() => setNueva(null)}
          onCreada={() => { setNueva(null); cargarItems(proyecto.id); }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// LO QUE HAY EN EL PROYECTO (2026-08-23, Eugenio: «no aparecen por ejemplo las
// páginas ligadas a ese proyecto, y seguro que tampoco otros elementos como
// mapas»). Tenía razón, y por más de lo que dijo: **doce tablas tienen
// `proyecto_id`** y esta página enseñaba una, el tablero de tareas. Páginas,
// esquemas, mapas, productos, tablas de datos, fechas y lo guardado del
// navegador existían en la base de datos, colgaban de este proyecto, y no
// aparecían en ninguna pantalla salvo desplegando el proyecto en el menú
// lateral.
//
// SE PIDE AL MISMO SITIO QUE EL MENÚ: `/api/proyectos/:id/arbol`. Escribir aquí
// una segunda consulta habría sido más rápido y habría creado el problema de
// siempre — dos listas de «lo que hay en un proyecto» que se separan en cuanto
// alguien añade una tabla a una y no a la otra. Con una sola fuente, arreglar
// el árbol arregla las dos pantallas a la vez, que es justo lo que ha pasado al
// añadirle Archivos, Tablas y Fechas.
//
// DOS RAMAS SE OMITEN AQUÍ Y ES A PROPÓSITO: `tareas`, porque el tablero está
// justo debajo y repetirlas sería enseñar lo mismo dos veces con dos aspectos
// distintos; y `archivos`, porque «Adjuntos» ya los pinta con su previsualización
// unos centímetros más abajo. En el menú sí salen las dos, porque allí no hay
// tablero ni adjuntos.
// ----------------------------------------------------------------------------
const ICONO_RAMA: Record<string, any> = {
  paginas: FileText, esquemas: Globe2, mapas: MapIcon, productos: Package,
  tablas: Table2, eventos: CalendarDays, guardados: Bookmark, tareas: ListChecks,
  publicaciones: Megaphone,
};

/** Las que ya tienen su propio sitio en esta página. */
const RAMAS_YA_PINTADAS = new Set(['tareas', 'archivos', 'personas']);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SeccionContenido({ proyectoId, recargar }: { proyectoId: string; recargar?: boolean }) {
  const [ramas, setRamas] = useState<any[] | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/proyectos/${proyectoId}/arbol`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { ramas: [] })
      .then(d => { if (vivo) setRamas(Array.isArray(d?.ramas) ? d.ramas : []); })
      .catch(() => { if (vivo) setRamas([]); });
    return () => { vivo = false; };
    // `recargar` cambia al cerrar el compositor: es lo que hace que la
    // publicación recién escrita aparezca sin recargar la página entera.
  }, [proyectoId, recargar]);

  // MIENTRAS CARGA NO SE PINTA UN HUECO. Esta sección está entre dos que ya
  // tienen contenido; un esqueleto gris que aparece y desaparece mueve la
  // página bajo el dedo de quien ya estaba leyendo.
  if (!ramas) return null;
  const visibles = ramas.filter(r => !RAMAS_YA_PINTADAS.has(r.clave) && r.hijos?.length);
  // Un proyecto recién creado no tiene nada de esto, y un título encima de la
  // nada solo dice que falta algo. Los botones de crear ya están arriba.
  if (!visibles.length) return null;

  return (
    <div className="mt-8 max-w-3xl space-y-5">
      {visibles.map(rama => {
        const Icono = ICONO_RAMA[rama.clave] || FolderKanban;
        return (
          <div key={rama.clave}>
            <div className="flex items-center gap-2 mb-2.5">
              <Icono className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {rama.label}
              </p>
              <span className="text-[10px] font-bold text-slate-300">{rama.hijos.length}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {rama.hijos.map((h: any) => (
                <EnlaceHijo key={h.id} hijo={h} Icono={Icono} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Una cosa del proyecto. `destino` puede ser una ruta de la aplicación
 * (`/mapas/algo`) o un fichero servido tal cual (`/uploads/…`): lo primero se
 * navega sin recargar, lo segundo NO — un `<Link>` a un fichero deja la
 * aplicación intentando pintar un PDF como si fuera una pantalla.
 */
function EnlaceHijo({ hijo, Icono }: { hijo: any; Icono: any }) {
  const esFichero = typeof hijo.destino === 'string' && hijo.destino.startsWith('/uploads/');
  const dentro = (
    <>
      {hijo.icono
        ? <IconoElemento valor={hijo.icono} tamano={14} />
        : <Icono className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
      <span className="text-xs font-bold text-slate-700 truncate max-w-[16rem]">{hijo.label || 'Sin título'}</span>
      {/* La fecha es lo que hace que una fila de «Fechas» diga algo: todas
          llevan al mismo calendario, así que sin ella el enlace no distingue
          una reunión de mañana de una del año pasado. */}
      {hijo.inicio && (
        <span className="text-[10px] text-slate-400 shrink-0">
          {new Date(hijo.inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
        </span>
      )}
      {hijo.rol && <span className="text-[10px] text-slate-400 shrink-0">{hijo.rol}</span>}
      {/* QUÉ LLEVA DENTRO SIN ABRIRLA (Eugenio, 2026-08-23: «que me diga si la
          publicación tiene imagen o vídeo»). Los números los cuenta el
          servidor; aquí solo se pintan. Una publicación sin nada no enseña
          ninguna insignia, para que la que sí lleva algo se distinga. */}
      {hijo.adjuntos && <Insignias adjuntos={hijo.adjuntos} />}
      {esFichero && <ExternalLink className="w-3 h-3 text-slate-300 shrink-0" />}
    </>
  );
  const clase = 'inline-flex items-center gap-2 pl-2 pr-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm hover:border-emerald-300 hover:shadow transition-all';

  if (esFichero) {
    return <a href={hijo.destino} target="_blank" rel="noreferrer" className={clase}>{dentro}</a>;
  }
  return <Link to={hijo.destino} className={clase}>{dentro}</Link>;
}

// ----------------------------------------------------------------------------
// Las PERSONAS del proyecto (2026-08-18, petición de Eugenio): una sección
// propia, fuera del kanban — una persona no es una tarea pendiente. Son las
// personas de tu mundo del Juego Vital: unirlas aquí las pone de pie en la
// sala «Personas» del edificio 3D del proyecto.
// ----------------------------------------------------------------------------
function SeccionPersonas({ proyectoId, puedeEditar }: { proyectoId: string; puedeEditar: boolean }) {
  const [personas, setPersonas] = useState<any[]>([]);
  const [todas, setTodas] = useState<any[]>([]);
  const [anadiendo, setAnadiendo] = useState(false);

  const cargar = () =>
    fetch(`/api/juego/proyectos/${proyectoId}/personas`, { credentials: 'include' })
      .then(r => r.json()).then(j => setPersonas(Array.isArray(j) ? j : [])).catch(() => setPersonas([]));

  useEffect(() => { cargar(); }, [proyectoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirAnadir = async () => {
    setAnadiendo(true);
    const j = await fetch('/api/juego/agentes', { credentials: 'include' }).then(r => r.json()).catch(() => []);
    setTodas(Array.isArray(j) ? j.filter((a: any) => a.tipo === 'persona') : []);
  };

  const poner = async (agenteId: string, quitar = false) => {
    await fetch(`/api/juego/agentes/${agenteId}/proyectos`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proyecto_id: proyectoId, quitar }),
    }).catch(() => {});
    setAnadiendo(false);
    cargar();
  };

  // Sin personas y sin permiso de edición no hay nada que enseñar.
  if (!personas.length && !puedeEditar) return null;

  const candidatas = todas.filter(t => !personas.some(m => m.id === t.id));

  return (
    <div className="mt-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-2.5">
        <Users className="w-3.5 h-3.5 text-emerald-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Personas del proyecto</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {personas.map(m => (
          <span key={m.id} className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
            {m.foto_url
              ? <img src={m.foto_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              : <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black flex items-center justify-center">{(m.nombre || '?')[0]}</span>}
            <span className="text-xs font-bold text-slate-700">{m.nombre}</span>
            {m.rol && <span className="text-[10px] text-slate-400">{m.rol}</span>}
            {puedeEditar && (
              <button onClick={() => poner(m.id, true)} title="Quitar del proyecto" className="text-slate-300 hover:text-red-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {personas.length === 0 && (
          <p className="text-xs text-slate-400">Nadie todavía. Las personas de tu mundo pueden formar parte de este proyecto.</p>
        )}
        {puedeEditar && !anadiendo && (
          <button onClick={abrirAnadir}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-dashed border-slate-300 rounded-full text-xs font-bold text-slate-400 hover:text-emerald-700 hover:border-emerald-300 transition-colors">
            <Plus className="w-3 h-3" /> Añadir
          </button>
        )}
      </div>
      {anadiendo && (
        <div className="mt-2.5 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tu gente</p>
            <button onClick={() => setAnadiendo(false)} className="text-slate-300 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {candidatas.map(t => (
              <button key={t.id} onClick={() => poner(t.id)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                + {t.nombre}
              </button>
            ))}
            {candidatas.length === 0 && (
              <p className="text-xs text-slate-400">Todas las personas de tu mundo están ya en el proyecto (o aún no has creado ninguna en el Juego Vital).</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalNuevaTarjeta({ proyectoId, grupos, grupoInicial, estadoInicial, onCrearEtiqueta, onCerrar, onCreada }: {
  proyectoId: string; grupos: Grupo[]; grupoInicial: string;
  /** En qué columna nace. Por defecto «Por hacer», que es donde va casi todo. */
  estadoInicial?: string;
  /** Crea una etiqueta en el proyecto y devuelve su id (para el «@»). */
  onCrearEtiqueta?: (nombre: string) => string;
  onCerrar: () => void; onCreada: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [resumen, setResumen] = useState('');
  const [grupo, setGrupo] = useState(grupoInicial);
  const [prioridad, setPrioridad] = useState('media');
  const [guardando, setGuardando] = useState(false);
  /** «hecho» durante el instante de la confirmación, antes de cerrar. */
  const [hecho, setHecho] = useState(false);
  const esMovil = useEsMovil();

  // EL «@» PARA ETIQUETAR MIENTRAS ESCRIBES (2026-08-20, petición de Eugenio:
  // «hacer @algo para mencionar a una categoría, abriéndose un desplegable de
  // las que ya hay, y si no hay una con ese nombre, se crea»).
  //
  // Se mira lo que hay escrito DESPUÉS del último «@» hasta el final. Cuando
  // eliges, ese trozo desaparece del título: la etiqueta ya está puesta, y
  // dejar «@diseño» dentro del texto sería ruido.
  const mencion = (() => {
    const m = titulo.match(/@([\p{L}0-9 -]*)$/u);
    return m ? m[1] : null;
  })();
  const sugerencias = mencion === null ? [] : grupos.filter(g =>
    !mencion.trim() || g.label.toLowerCase().includes(mencion.trim().toLowerCase()));
  const hayExacta = !!mencion?.trim() && grupos.some(g => g.label.toLowerCase() === mencion.trim().toLowerCase());

  const aplicarMencion = (id: string) => {
    setGrupo(id);
    setTitulo(t => t.replace(/@([\p{L}0-9 -]*)$/u, '').trimEnd());
  };
  const [error, setError] = useState<string | null>(null);
  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300';

  // ESCAPE CIERRA. Con el fondo pulsable fuera, hacía falta un atajo: es el
  // gesto que todo el mundo prueba para salir de un panel.
  useEffect(() => {
    const alTecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !guardando && !hecho) onCerrar(); };
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [guardando, hecho, onCerrar]);

  const crear = async () => {
    if (!titulo.trim()) { setError('La tarjeta necesita un título.'); return; }
    setGuardando(true); setError(null);
    try {
      const r = await fetch('/api/roadmap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ proyecto_id: proyectoId, titulo: titulo.trim(), resumen: resumen.trim() || null, grupo, prioridad, estado: estadoInicial || 'por_hacer' }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo crear.');
      // SE CONFIRMA ANTES DE CERRAR (2026-08-22, Eugenio: «haz una animación
      // chula y elegante de refuerzo positivo cuando se dé a guardar que
      // confirme que se ha guardado correctamente»). Cerrar en seco deja la
      // duda de si se guardó: 900 ms de tic verde la quitan, y además dan
      // tiempo a ver dónde ha caído la tarjeta al aparecer detrás.
      setHecho(true);
      setTimeout(() => onCreada(), 900);
    } catch (e: any) { setError(e.message); setGuardando(false); }
  };

  return (
    // ══ YA NO ES UN CUADRO EN MEDIO ═══════════════════════════════════════════
    // (2026-08-22, Eugenio: «cuando escribo en la tarjeta es muy fácil que se
    // cierre cuando muevo el ratón pinchando, y el texto que estaba
    // escribiendo se pierde […] haz que en ordenador se abra una ventana
    // lateral derecha para crear la tarjeta, y que en móvil sea a pantalla
    // completa»).
    //
    // POR QUÉ SE CERRABA: el fondo oscuro tenía un `onClick` que cerraba, y un
    // clic se cuenta donde SE SUELTA el ratón. Al seleccionar texto dentro del
    // campo y arrastrar un poco de más, sueltas fuera → clic en el fondo →
    // adiós a lo escrito. No era un fallo raro: seleccionar una palabra en un
    // cuadro estrecho lo provoca casi siempre.
    //
    // El panel lateral lo arregla de raíz porque NO HAY FONDO QUE PULSAR. Se
    // cierra con la cruz, con Escape o con «Cancelar»: los tres son gestos
    // deliberados, y ninguno se hace sin querer al soltar el ratón.
    <div className={cn('fixed z-[9999] bg-white flex flex-col animate-in duration-200',
      esMovil
        ? 'inset-0 slide-in-from-bottom'
        : 'top-0 right-0 bottom-0 w-[26rem] border-l border-slate-200 shadow-2xl slide-in-from-right')}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" /> Nueva tarjeta
          </h2>
          <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="relative">
            {/* TRES LÍNEAS, NO UNA (Eugenio). En una sola línea un título de
                diez palabras se lee por una ventanilla, y para releerlo hay
                que moverse con las flechas. Enter sigue guardando; para un
                salto de línea, Mayúsculas+Enter. */}
            <textarea value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); crear(); } }}
              className={cn(input, 'resize-none leading-snug')}
              placeholder="Qué hay que hacer — escribe @ para etiquetar" />
            {mencion !== null && (sugerencias.length > 0 || (!!mencion.trim() && !hayExacta)) && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1">
                {sugerencias.map(g => (
                  <button key={g.id} onClick={() => aplicarMencion(g.id)}
                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="truncate">{g.label}</span>
                  </button>
                ))}
                {/* La que no existe todavía: se crea al vuelo. */}
                {!!mencion.trim() && !hayExacta && onCrearEtiqueta && (
                  <button
                    onClick={() => aplicarMencion(onCrearEtiqueta(mencion.trim()))}
                    className="w-full text-left px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-t border-slate-100 mt-1 pt-2"
                  >
                    + Crear etiqueta «{mencion.trim()}»
                  </button>
                )}
              </div>
            )}
          </div>
          <textarea value={resumen} onChange={e => setResumen(e.target.value)} rows={3}
            className={cn(input, 'resize-none leading-snug')} placeholder="El contexto que haga falta (opcional)" />
          <div className="flex flex-wrap gap-1.5">
            {grupos.map(g => (
              <button key={g.id} onClick={() => setGrupo(g.id)}
                className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                  grupo === g.id ? 'text-white' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')}
                style={grupo === g.id ? { backgroundColor: g.color, borderColor: g.color } : undefined}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: grupo === g.id ? '#fff' : g.color }} />
                {g.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {['alta', 'media', 'baja'].map(p => (
              <button key={p} onClick={() => setPrioridad(p)}
                className={cn('px-3 py-1.5 rounded-full text-xs font-bold border capitalize transition-colors',
                  prioridad === p ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600')}>
                {p}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{error}</p>}
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onCerrar} className="px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={crear} disabled={guardando}
            className={cn('px-3.5 py-2 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-100',
              hecho ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40')}>
            {hecho ? 'Guardada' : guardando ? 'Creando…' : 'Añadir'}
          </button>
        </div>

        {/* ══ EL REFUERZO: UN TIC QUE SE DIBUJA ════════════════════════════
            No es un cartel que aparece: el círculo crece y el tic se DIBUJA de
            un trazo, que es lo que hace que se lea como «hecho» y no como
            «aviso». Dura lo que dura la sensación —900 ms— y se va solo.

            `pointer-events-none` a propósito: es una confirmación, no un paso
            más. Nada que haya que cerrar. */}
        {hecho && (
          <div className="absolute inset-0 grid place-items-center bg-white/80 backdrop-blur-[2px] pointer-events-none animate-in fade-in duration-200">
            <div className="flex flex-col items-center gap-3">
              <svg viewBox="0 0 52 52" className="w-20 h-20">
                <circle cx="26" cy="26" r="24" fill="none" stroke="#10b981" strokeWidth="2.5"
                  strokeDasharray="151" strokeDashoffset="151" strokeLinecap="round"
                  style={{ animation: 'tic-circulo .45s cubic-bezier(.65,0,.45,1) forwards', transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }} />
                <path d="M15 27 l8 8 l15 -16" fill="none" stroke="#10b981" strokeWidth="3.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="40" strokeDashoffset="40"
                  style={{ animation: 'tic-trazo .3s cubic-bezier(.65,0,.45,1) .4s forwards' }} />
              </svg>
              <p className="text-sm font-black text-emerald-700 animate-in fade-in slide-in-from-bottom-1 duration-300 delay-300 fill-mode-both">
                Tarjeta guardada
              </p>
            </div>
          </div>
        )}
      </div>
  );
}

// ----------------------------------------------------------------------------
// PUBLICAR DENTRO DE UN PROYECTO (Eugenio, 2026-08-23)
//
// «Que la página de proyectos me permita crear publicaciones dentro del
// proyecto de manera sencilla, y que me diga si la publicación tiene imagen o
// vídeo y me deje adjuntar archivos, referencias.»
//
// Dos decisiones que explican por qué esto no es un diálogo:
//
// 1. NO TE SACA DE LA PÁGINA. Una página, un mapa o un esquema se crean y se
//    abren en su pantalla, porque su contenido vive allí. Una publicación son
//    dos líneas y un archivo: sacarte del proyecto para escribirlas es lo que
//    hacía que nadie publicara dentro de su proyecto.
// 2. LA FILA YA EXISTE ANTES DE ESCRIBIR. El botón la crea vacía en el
//    servidor y esto la rellena. Así, si te vas a media frase, lo que tienes
//    escrito está guardado con el botón de guardar, y lo que no, se ve vacío en
//    la lista en vez de haberse perdido en un formulario que nadie envió.
// ----------------------------------------------------------------------------

/** Cuántas imágenes, vídeos, documentos y referencias lleva. Sin nada, nada. */
function Insignias({ adjuntos }: { adjuntos: any }) {
  const a = adjuntos || {};
  const partes: Array<[any, number, string]> = [
    [ImageIcon, Number(a.imagenes) || 0, 'imagen'],
    [Video, Number(a.videos) || 0, 'vídeo'],
    [Paperclip, Number(a.documentos) || 0, 'archivo'],
    [Link2, Number(a.referencias) || 0, 'referencia'],
  ];
  const vivas = partes.filter(([, n]) => n > 0);
  if (!vivas.length) return null;
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      {vivas.map(([Icono, n, nombre]) => (
        <span key={nombre} title={`${n} ${nombre}${n > 1 ? 's' : ''}`}
              className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
          <Icono className="w-3 h-3" />{n > 1 ? n : ''}
        </span>
      ))}
    </span>
  );
}

function ComposerPublicacion({ proyectoId, publicacionId, onCerrar }: {
  proyectoId: string; publicacionId: string; onCerrar: (huboCambio: boolean) => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [media, setMedia] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [referencia, setReferencia] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // EL TIPO LO DECIDE EL `mime` DEL ARCHIVO, no su extensión ni el nombre que
  // le pusiera nadie: es lo que luego cuenta el servidor para decir «tiene
  // imagen» o «tiene vídeo», y las dos mitades tienen que decir lo mismo.
  const tipoDe = (mime: string) =>
    mime.startsWith('image/') ? 'imagen' : mime.startsWith('video/') ? 'video' : 'documento';

  const adjuntar = async (files: FileList | null) => {
    if (!files?.length || subiendo) return;
    setSubiendo(true); setError(null);
    try {
      for (const f of Array.from(files)) {
        const r = await fetch(`/api/uploads?type=${encodeURIComponent(f.type || 'application/octet-stream')}`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: f,
        });
        const d = await r.json();
        // SI UNO FALLA, SE DICE Y SE PARA. Seguir con los demás dejaría una
        // publicación a la que le falta un archivo sin que nadie lo sepa.
        if (!r.ok) { setError(d?.error || `No se ha podido subir ${f.name}.`); break; }
        setMedia(m => [...m, { tipo: tipoDe(f.type || ''), url: d.url, nombre: f.name }]);
      }
    } catch {
      setError('No se ha podido subir el archivo.');
    } finally { setSubiendo(false); }
  };

  const anadirReferencia = () => {
    const url = referencia.trim();
    if (!url) return;
    // Una referencia sin `http` no es un enlace: sería un texto que parece uno.
    const limpia = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    setLinks(l => [...l, { url: limpia }]);
    setReferencia('');
  };

  const guardar = async () => {
    if (guardando) return;
    setGuardando(true); setError(null);
    try {
      const r = await fetch(`/api/proyectos/${proyectoId}/publicaciones/${publicacionId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo, body: texto, media, links }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error || 'No se ha podido guardar.'); return; }
      onCerrar(true);
    } catch {
      setError('No se ha podido guardar.');
    } finally { setGuardando(false); }
  };

  return (
    <div className="mt-8 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="w-3.5 h-3.5 text-emerald-600" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Publicación en este proyecto
        </p>
        <div className="flex-1" />
        <button onClick={() => onCerrar(false)} title="Cerrar sin guardar"
                className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
      </div>

      <input
        value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus
        placeholder="Título (opcional)"
        className="w-full mb-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-300"
      />
      <textarea
        value={texto} onChange={e => setTexto(e.target.value)} rows={4}
        placeholder="Cuenta lo que ha pasado en el proyecto…"
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-emerald-300 resize-y"
      />

      {(media.length > 0 || links.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {media.map((m, i) => (
            <span key={`m${i}`} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-600">
              {m.tipo === 'imagen' ? <ImageIcon className="w-3 h-3 text-emerald-600" />
                : m.tipo === 'video' ? <Video className="w-3 h-3 text-emerald-600" />
                : <Paperclip className="w-3 h-3 text-emerald-600" />}
              <span className="truncate max-w-[10rem]">{m.nombre || m.url}</span>
              <button onClick={() => setMedia(x => x.filter((_, j) => j !== i))}
                      className="p-0.5 text-slate-300 hover:text-slate-600"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {links.map((l, i) => (
            <span key={`l${i}`} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-600">
              <Link2 className="w-3 h-3 text-emerald-600" />
              <span className="truncate max-w-[12rem]">{l.url}</span>
              <button onClick={() => setLinks(x => x.filter((_, j) => j !== i))}
                      className="p-0.5 text-slate-300 hover:text-slate-600"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 text-[11px] font-bold cursor-pointer transition-colors">
          {subiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
          Adjuntar
          <input type="file" multiple className="hidden" disabled={subiendo}
                 onChange={e => { adjuntar(e.target.files); e.target.value = ''; }} />
        </label>

        <div className="inline-flex items-center gap-1 px-1 py-0.5 rounded-full bg-white border border-slate-200">
          <Link2 className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
          <input
            value={referencia} onChange={e => setReferencia(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); anadirReferencia(); } }}
            placeholder="Pega una referencia y pulsa Enter"
            className="w-56 px-1.5 py-1 text-[11px] text-slate-700 placeholder:text-slate-300 focus:outline-none"
          />
          <button onClick={anadirReferencia} disabled={!referencia.trim()}
                  className="px-2 py-1 text-[11px] font-bold text-emerald-700 disabled:text-slate-300">Añadir</button>
        </div>

        <div className="flex-1" />

        <button onClick={guardar} disabled={guardando || subiendo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-40 transition-colors">
          {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Publicar
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] font-bold text-rose-600">{error}</p>}
    </div>
  );
}
