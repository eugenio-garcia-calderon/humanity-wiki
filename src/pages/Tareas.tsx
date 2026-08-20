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
  CheckCircle2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '../utils/cn';

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
              <section key={p.id} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
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
                        <li key={t.id} className="flex items-start gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors">
                          <Icono className={cn('w-4 h-4 mt-0.5 shrink-0', e.color)} />
                          <div className="min-w-0 flex-1">
                            <p className={cn('text-sm font-bold leading-snug',
                              t.estado === 'hecho' ? 'text-slate-400 line-through' : 'text-slate-800')}>
                              {t.titulo}
                            </p>
                            {t.resumen && (
                              <p className="text-[11px] text-slate-400 leading-snug line-clamp-1 mt-0.5">{t.resumen}</p>
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
