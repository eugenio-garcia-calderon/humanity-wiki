import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FolderKanban, Plus, X, User as UserIcon, Lock, Globe, ArrowLeft, Pencil, Check,
  Users, Trash2, Loader2, FileText, Globe2, Map as MapIcon, ListChecks,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TableroKanban, { type ItemTablero, type Grupo, idDeEtiqueta } from '../components/tablero/TableroKanban';
import { cn } from '../utils/cn';
import IconoElemento from '../components/ui/Icono';
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
      <div className="max-w-5xl mx-auto px-5 sm:px-8 pt-10 pb-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400 mb-2 inline-flex items-center gap-1.5">
              <FolderKanban className="w-3 h-3" /> Proyectos
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Tus tableros</h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xl">
              El mismo tablero que lleva la hoja de ruta de humanity.wiki, para lo que quieras
              organizar: tus grupos, tus tarjetas, y el detalle de cada una con imágenes y notas.
            </p>
          </div>
          {user && (
            <button onClick={() => setCreando(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black shadow transition-colors">
              <Plus className="w-4 h-4" /> Nuevo proyecto
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
        <div className="p-5 space-y-3">
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
        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end gap-2">
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
      if (d.abrir) navegar(d.abrir);
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
        <div className="flex items-center gap-2">
          <Link to="/proyectos" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Proyectos
          </Link>
          <div className="flex-1" />

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
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 text-[11px] font-bold disabled:opacity-40 transition-colors"
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
                salía nada — ni un hueco donde pinchar para ponerlo. Ahora sale
                su inicial, igual que en el menú, y pulsarla abre el mismo
                popup de nombre e icono. */}
            {proyecto.icono ? (
              <IconoElemento valor={proyecto.icono} tamano={36} className="rounded-lg" />
            ) : (
              <button
                onClick={() => puedoEditar && setRenombrando(true)}
                disabled={!puedoEditar}
                title={puedoEditar ? 'Poner un icono' : undefined}
                className={cn('w-9 h-9 shrink-0 rounded-lg bg-slate-900 text-white grid place-items-center text-sm font-black tracking-tight',
                  puedoEditar && 'hover:bg-emerald-600 transition-colors')}
              >
                {proyecto.titulo.replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '·'}
              </button>
            )}
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
      onCreada();
    } catch (e: any) { setError(e.message); setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-emerald-600" /> Nueva tarjeta
          </h2>
          <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="relative">
            <input value={titulo} onChange={e => setTitulo(e.target.value)} autoFocus className={input}
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
          <input value={resumen} onChange={e => setResumen(e.target.value)} className={input} placeholder="Una línea de contexto (opcional)" />
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
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-40">
            {guardando ? 'Creando…' : 'Añadir'}
          </button>
        </div>
      </div>
    </div>
  );
}
