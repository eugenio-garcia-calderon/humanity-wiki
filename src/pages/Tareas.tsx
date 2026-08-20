// ============================================================================
// TAREAS (2026-08-20, petición de Eugenio: «una página como las otras
// herramientas donde puedas ver todas las tareas ordenadas por PROYECTOS»).
// ============================================================================
// Una tarea ES una fila de `roadmap_items`: no hay tabla nueva ni copia. Lo
// que cambia es cómo se miran. En un proyecto las ves como tablero, columna a
// columna; aquí las ves TODAS a la vez, repartidas por proyecto, para saber en
// qué andas metido sin tener que abrir proyecto por proyecto.
//
// El reparto lo hace el servidor (`GET /api/tareas`): esta página solo pinta.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ListChecks, Search, Loader2, ExternalLink, Lock, Circle, CircleDot,
  CheckCircle2, ChevronDown, ChevronRight, Plus,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { TextoEditable } from '../components/tablero/TableroKanban';
import { abrirVentana } from '../components/ventanas/bus';

type Estado = 'por_hacer' | 'en_curso' | 'hecho';

interface Tarea {
  id: string;
  titulo: string;
  resumen: string | null;
  estado: Estado;
  prioridad: string | null;
  grupo: string | null;
  autor: string | null;
  fecha: string | null;
  responsable?: string | null;
  responsableFoto?: string | null;
}

interface GrupoProyecto {
  id: string;
  esHojaDeRuta: boolean;
  titulo: string;
  url: string;
  publico: boolean;
  mio: boolean;
  tareas: Tarea[];
}

const ESTADOS: Record<Estado, { etiqueta: string; icono: any; color: string; punto: string }> = {
  por_hacer: { etiqueta: 'Por hacer', icono: Circle,       color: 'text-slate-400',   punto: 'bg-slate-300' },
  en_curso:  { etiqueta: 'En curso',  icono: CircleDot,    color: 'text-amber-600',   punto: 'bg-amber-500' },
  hecho:     { etiqueta: 'Hecha',     icono: CheckCircle2, color: 'text-emerald-600', punto: 'bg-emerald-500' },
};

const PRIORIDAD: Record<string, string> = {
  alta: 'text-rose-600 bg-rose-50 border-rose-200',
  media: 'text-amber-700 bg-amber-50 border-amber-200',
  baja: 'text-slate-500 bg-slate-50 border-slate-200',
};

export default function Tareas() {
  const [proyectos, setProyectos] = useState<GrupoProyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todas' | Estado>('todas');
  // La hoja de ruta de la plataforma trae 112 tareas: si naciera abierta,
  // taparía los proyectos de la persona, que es a lo que se viene.
  const [plegados, setPlegados] = useState<Record<string, boolean>>({ __hoja_de_ruta__: true });

  useEffect(() => {
    let vivo = true;
    fetch('/api/tareas', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!vivo) return;
        if (d?.error) { setError(d.error); return; }
        setProyectos(Array.isArray(d?.proyectos) ? d.proyectos : []);
      })
      .catch(() => { if (vivo) setError('No se han podido cargar las tareas.'); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, []);

  /** Filtra dentro de cada proyecto y deja fuera los que se quedan sin nada:
   *  buscar «aptera» y ver ocho proyectos vacíos no ayuda a nadie. */
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return proyectos
      .map(p => ({
        ...p,
        tareas: p.tareas.filter(t =>
          (filtro === 'todas' || t.estado === filtro) &&
          (!q || t.titulo.toLowerCase().includes(q) || (t.resumen || '').toLowerCase().includes(q))),
      }))
      .filter(p => p.tareas.length > 0);
  }, [proyectos, busqueda, filtro]);

  const total = useMemo(() => visibles.reduce((n, p) => n + p.tareas.length, 0), [visibles]);

  // SOLTAR UN ELEMENTO DEL MENÚ AQUÍ CREA UNA TAREA (2026-08-20, petición de
  // Eugenio: «si arrastro un elemento del menú hacia la página de tareas
  // automáticamente se cree una tarea ligada a ese elemento; por ejemplo si
  // arrastro un producto a la sección de tareas de un proyecto, se crea una
  // tarea dentro de ese proyecto ligada a ese producto»).
  //
  // Lo que llega es lo que el menú metió en el arrastre: tipo, id, nombre y a
  // dónde lleva. La tarea nace con SU nombre y con un enlace de vuelta, para
  // que desde la tarea puedas ir al producto —o a la página, o a la persona—
  // del que salió.
  const [encima, setEncima] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  /** Cambia el título de una tarea desde el listado (Eugenio: «permitir editar
   *  y crear las tareas desde la página de tareas»). Se pinta al momento y se
   *  guarda detrás: corregir una palabra no debe hacerte esperar. */
  const renombrar = async (id: string, titulo: string) => {
    setProyectos(ps => ps.map(p => ({ ...p, tareas: p.tareas.map(t => (t.id === id ? { ...t, titulo } : t)) })));
    try {
      const r = await fetch(`/api/roadmap/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ titulo }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || 'No se ha podido guardar.');
    } catch (e: any) {
      setAviso(e.message);
      setTimeout(() => setAviso(null), 5000);
    }
  };

  /** Pasar una tarea al siguiente estado con un clic en su círculo:
   *  por hacer → en curso → hecha → por hacer. */
  const siguienteEstado = async (id: string, actual: Estado) => {
    const orden: Estado[] = ['por_hacer', 'en_curso', 'hecho'];
    const estado = orden[(orden.indexOf(actual) + 1) % orden.length];
    setProyectos(ps => ps.map(p => ({ ...p, tareas: p.tareas.map(t => (t.id === id ? { ...t, estado } : t)) })));
    try {
      const r = await fetch(`/api/roadmap/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ estado }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || 'No se ha podido guardar.');
    } catch (e: any) {
      setAviso(e.message);
      setTimeout(() => setAviso(null), 5000);
    }
  };

  /** Crear una tarea desde el listado, en el proyecto donde pulses. */
  const crearEn = async (proyectoId: string | null, titulo: string) => {
    if (!titulo.trim()) return;
    try {
      const r = await fetch('/api/roadmap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ proyecto_id: proyectoId, titulo: titulo.trim(), grupo: 'producto' }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || 'No se ha podido crear.');
      const d = await (await fetch('/api/tareas', { credentials: 'include' })).json();
      setProyectos(Array.isArray(d?.proyectos) ? d.proyectos : []);
    } catch (e: any) {
      setAviso(e.message);
      setTimeout(() => setAviso(null), 5000);
    }
  };

  const leerElemento = (e: React.DragEvent) => {
    const crudo = e.dataTransfer.getData('application/x-humanity-elemento');
    if (!crudo) return null;
    try { return JSON.parse(crudo); } catch { return null; }
  };

  const soltarEn = async (proyectoId: string | null, e: React.DragEvent) => {
    e.preventDefault();
    setEncima(null);
    const el = leerElemento(e);
    if (!el?.label) return;
    try {
      const r = await fetch('/api/roadmap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({
          proyecto_id: proyectoId,
          titulo: el.label,
          grupo: 'producto',
          // Una persona arrastrada no es «una tarea llamada Anita»: es una
          // tarea DE Anita. El resto de elementos solo dejan su enlace.
          responsable_agente_id: el.tipo === 'persona' ? el.id : undefined,
          bloques: el.destino ? [{ tipo: 'enlace', url: el.destino, titulo: el.label }] : [],
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se ha podido crear la tarea.');
      setAviso(`Tarea creada: «${el.label}»`);
      // Recargar para que salga donde toca, con su proyecto y su responsable.
      const d = await (await fetch('/api/tareas', { credentials: 'include' })).json();
      setProyectos(Array.isArray(d?.proyectos) ? d.proyectos : []);
      setTimeout(() => setAviso(null), 4000);
    } catch (err: any) {
      setAviso(err.message);
      setTimeout(() => setAviso(null), 5000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <ListChecks className="w-5 h-5 text-emerald-600" /> Tareas
        </h1>
        {!cargando && (
          <span className="text-xs font-bold text-slate-400">
            {total} {total === 1 ? 'tarea' : 'tareas'} en {visibles.length} {visibles.length === 1 ? 'proyecto' : 'proyectos'}
          </span>
        )}

        <div className="flex-1 min-w-[8rem]" />

        <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
          {([['todas', 'Todas'], ['por_hacer', 'Por hacer'], ['en_curso', 'En curso'], ['hecho', 'Hechas']] as const).map(([k, etiqueta]) => (
            <button
              key={k}
              onClick={() => setFiltro(k)}
              className={cn('px-3 py-1 rounded-full text-xs font-bold transition-colors',
                filtro === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 focus-within:border-emerald-300">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar una tarea…"
            className="w-40 sm:w-56 text-xs text-slate-700 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">{error}</p>
      )}
      {aviso && (
        <p className="mb-4 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">{aviso}</p>
      )}
      {!cargando && !error && (
        <p className="mb-3 text-[11px] text-slate-400">
          Arrastra aquí un proyecto, un producto, una página o una persona del menú y se crea una tarea ligada a él.
        </p>
      )}

      {cargando ? (
        <div className="py-24 grid place-items-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      ) : visibles.length === 0 ? (
        <div className="py-20 text-center">
          <ListChecks className="w-8 h-8 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-500">
            {busqueda || filtro !== 'todas'
              ? 'Ninguna tarea con esos criterios.'
              : 'Todavía no hay tareas. Crea un proyecto y empieza a llenarlo.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibles.map(p => {
            const plegado = !!plegados[p.id];
            const hechas = p.tareas.filter(t => t.estado === 'hecho').length;
            const pct = p.tareas.length ? Math.round((hechas / p.tareas.length) * 100) : 0;
            return (
              <section
                key={p.id}
                onDragOver={e => { if (e.dataTransfer.types.includes('application/x-humanity-elemento')) { e.preventDefault(); setEncima(p.id); } }}
                onDragLeave={() => setEncima(c => (c === p.id ? null : c))}
                onDrop={e => soltarEn(p.esHojaDeRuta ? null : p.id, e)}
                className={cn('rounded-2xl border bg-white overflow-hidden transition-colors',
                  encima === p.id ? 'border-emerald-400 ring-2 ring-emerald-200' : 'border-slate-200')}
              >
                {/* Cabecera del proyecto: pliega, cuenta y lleva al tablero */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
                  <button
                    onClick={() => setPlegados(v => ({ ...v, [p.id]: !plegado }))}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left group"
                  >
                    {plegado
                      ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    <span className="text-sm font-black text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                      {p.titulo}
                    </span>
                    {!p.publico && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-200 text-[9px] font-black uppercase tracking-wider text-slate-600 shrink-0">
                        <Lock className="w-2.5 h-2.5" /> Privado
                      </span>
                    )}
                  </button>

                  {/* Cuánto llevas: la barra dice más de un vistazo que «3 de 10» */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <div className="w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                      {hechas}/{p.tareas.length}
                    </span>
                  </div>

                  <Link
                    to={p.url}
                    title={p.esHojaDeRuta ? 'Ver la hoja de ruta' : 'Abrir el tablero del proyecto'}
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>

                {!plegado && (
                  <ul>
                    {p.tareas.map(t => {
                      const e = ESTADOS[t.estado] || ESTADOS.por_hacer;
                      const Icono = e.icono;
                      return (
                        <li
                          key={t.id}
                          // PINCHAR UNA TAREA LA ABRE (2026-08-20, Eugenio: «no
                          // puedo hacer click en una de ellas y que se abra la
                          // ventana»). Se abre el tablero de su proyecto con
                          // esa tarjeta ya desplegada: es donde está todo lo
                          // suyo —notas, responsable, fotos—, y así no hay una
                          // segunda ficha que mantener.
                          onClick={() => abrirVentana({
                            titulo: p.titulo,
                            clase: 'app',
                            destino: `${p.url}${p.url.includes('?') ? '&' : '?'}tarea=${t.id}`,
                          })}
                          title="Abrir esta tarea"
                          className="flex items-start gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors cursor-pointer">
                          <button
                            onClick={e => { e.stopPropagation(); if (p.mio) siguienteEstado(t.id, t.estado); }}
                            disabled={!p.mio}
                            title={p.mio ? 'Cambiar de estado' : undefined}
                            className={cn('mt-0.5 shrink-0 rounded-full', p.mio && 'hover:scale-110 transition-transform')}
                          >
                            <Icono className={cn('w-4 h-4', e.color)} />
                          </button>
                          <div className="min-w-0 flex-1" onClick={e => e.stopPropagation()}>
                            <TextoEditable
                              valor={t.titulo}
                              editable={!!p.mio}
                              onGuardar={n => n && renombrar(t.id, n)}
                              className={cn('text-sm font-bold leading-snug',
                                t.estado === 'hecho' ? 'text-slate-400 line-through' : 'text-slate-800')}
                            />
                            {t.resumen && (
                              <p className="text-[11px] text-slate-400 leading-snug line-clamp-1 mt-0.5">{t.resumen}</p>
                            )}
                            {t.responsable && (
                              <p className="text-[10px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                                {t.responsableFoto
                                  ? <img src={t.responsableFoto} alt="" className="w-3 h-3 rounded-full object-cover" />
                                  : null}
                                {t.responsable}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {t.grupo && (
                              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider text-slate-400">
                                {t.grupo}
                              </span>
                            )}
                            {t.prioridad && t.prioridad !== 'media' && (
                              <span className={cn('px-1.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider',
                                PRIORIDAD[t.prioridad] || PRIORIDAD.baja)}>
                                {t.prioridad}
                              </span>
                            )}
                            <span className={cn('hidden sm:inline-flex items-center gap-1 text-[10px] font-bold', e.color)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', e.punto)} />
                              {e.etiqueta}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                    {/* AÑADIR AQUÍ MISMO (2026-08-20: «permitir editar y crear
                        las tareas desde la página de tareas»). Sin abrir el
                        tablero ni cambiar de sitio. */}
                    {p.mio && (
                      <li className="px-4 py-2 border-t border-slate-50">
                        <NuevaTareaEnLinea onCrear={t => crearEn(p.esHojaDeRuta ? null : p.id, t)} />
                      </li>
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Una línea para añadir una tarea sin salir del listado. Se queda abierta
 *  tras crear: cuando apuntas una cosa, casi siempre apuntas dos. */
function NuevaTareaEnLinea({ onCrear }: { onCrear: (titulo: string) => void }) {
  const [texto, setTexto] = useState('');
  return (
    <form
      onSubmit={e => { e.preventDefault(); if (texto.trim()) { onCrear(texto); setTexto(''); } }}
      className="flex items-center gap-2"
    >
      <Plus className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      <input
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder="Añadir una tarea…"
        className="flex-1 min-w-0 text-sm text-slate-700 bg-transparent placeholder:text-slate-300 focus:outline-none py-0.5"
      />
      {texto.trim() && (
        <button type="submit" className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold">
          Añadir
        </button>
      )}
    </form>
  );
}
