// ============================================================================
// CALENDARIO (2026-08-20, petición de Eugenio: «que sea un calendario TOP, con
// todas las funcionalidades»).
// ============================================================================
// FASES 1 y 2: mes, semana y día; crear, editar y borrar; arrastrar para
// mover de día; tus tareas con fecha aparecen solas.
//
// LO QUE HACE QUE ESTO NO SEA «OTRA LISTA MÁS»: el calendario no guarda nada
// suyo salvo los eventos. Tus tareas con fecha salen aquí porque se LEEN de
// donde viven, no porque se copien. Mover una tarea de día en el calendario
// cambia la tarea, no una copia — y por eso el tablero se entera solo.
//
// Sin librería de calendario: un mes son 42 celdas y una semana son 7. Meter
// una dependencia de 200 KB para eso, con su forma de entender las fechas y su
// tema que hay que domar, cuesta más de lo que ahorra.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2, X, Trash2, Check,
  MapPin, FolderKanban, ListChecks, Clock,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

type Vista = 'mes' | 'semana' | 'dia';

interface Cosa {
  clase: 'evento' | 'tarea';
  id: string;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string | null;
  todoElDia: boolean;
  lugar: string | null;
  color: string | null;
  icono: string | null;
  proyectoId: string | null;
  proyecto: string | null;
  proyectoSlug: string | null;
  estado?: string;
  prioridad?: string;
  url: string | null;
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** `YYYY-MM-DD` en hora LOCAL. `toISOString()` daría la fecha en UTC, y a las
 *  01:00 de Madrid eso es el día anterior: los eventos de madrugada se
 *  pintarían en la casilla de ayer. */
const claveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sumarDias = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** El lunes de la semana de esa fecha. En España la semana empieza en lunes;
 *  `getDay()` cuenta el domingo como 0, de ahí el ajuste. */
const lunesDe = (d: Date) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(0, 0, 0, 0);
  return x;
};

const esHoy = (d: Date) => claveDia(d) === claveDia(new Date());

/** Un color estable por proyecto, para reconocer de un vistazo de qué es cada
 *  cosa sin tener que leer. El mismo proyecto tiene siempre el mismo color. */
const TONOS = [
  { fondo: 'bg-emerald-100', texto: 'text-emerald-800', barra: 'bg-emerald-500' },
  { fondo: 'bg-sky-100', texto: 'text-sky-800', barra: 'bg-sky-500' },
  { fondo: 'bg-violet-100', texto: 'text-violet-800', barra: 'bg-violet-500' },
  { fondo: 'bg-amber-100', texto: 'text-amber-800', barra: 'bg-amber-500' },
  { fondo: 'bg-rose-100', texto: 'text-rose-800', barra: 'bg-rose-500' },
  { fondo: 'bg-teal-100', texto: 'text-teal-800', barra: 'bg-teal-500' },
];
const tonoDe = (clave: string | null) => {
  if (!clave) return { fondo: 'bg-slate-100', texto: 'text-slate-700', barra: 'bg-slate-400' };
  let n = 0;
  for (const c of clave) n = (n + c.charCodeAt(0)) % 997;
  return TONOS[n % TONOS.length];
};

const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

export default function Calendario() {
  const { user } = useAuth();
  const navegar = useNavigate();
  const [vista, setVista] = useState<Vista>('mes');
  const [ancla, setAncla] = useState(() => new Date());
  const [items, setItems] = useState<Cosa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<Partial<Cosa> | null>(null);
  const [proyectos, setProyectos] = useState<Array<{ id: string; titulo: string }>>([]);
  const arrastrando = useRef<Cosa | null>(null);
  const [encima, setEncima] = useState<string | null>(null);

  /** El tramo que se pide, según la vista. En el mes se piden las 6 semanas
   *  completas de la rejilla, no solo del 1 al 31: si no, los días del mes
   *  anterior que asoman saldrían siempre vacíos. */
  const [desde, hasta, dias] = useMemo(() => {
    if (vista === 'dia') {
      const d = new Date(ancla); d.setHours(0, 0, 0, 0);
      return [claveDia(d), claveDia(d), [d]];
    }
    if (vista === 'semana') {
      const l = lunesDe(ancla);
      const ds = Array.from({ length: 7 }, (_, i) => sumarDias(l, i));
      return [claveDia(ds[0]), claveDia(ds[6]), ds];
    }
    const primero = new Date(ancla.getFullYear(), ancla.getMonth(), 1);
    const inicio = lunesDe(primero);
    const ds = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
    return [claveDia(ds[0]), claveDia(ds[41]), ds];
  }, [vista, ancla]);

  const cargar = useCallback(() => {
    if (!user) { setCargando(false); return; }
    setCargando(true);
    fetch(`/api/calendario?desde=${desde}&hasta=${hasta}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d?.error) { setError(d.error); setItems([]); return; }
        setError(null);
        setItems(Array.isArray(d.items) ? d.items : []);
      })
      .catch(() => setError('No se ha podido cargar el calendario.'))
      .finally(() => setCargando(false));
  }, [desde, hasta, user]);
  useEffect(cargar, [cargar]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/menu', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setProyectos(Array.isArray(d?.proyectos) ? d.proyectos : []))
      .catch(() => setProyectos([]));
  }, [user]);

  /** Lo de cada día, ya repartido. Un evento de varios días aparece en todos
   *  los días que ocupa, que es lo que se espera de un calendario. */
  const porDia = useMemo(() => {
    const mapa = new Map<string, Cosa[]>();
    for (const it of items) {
      const ini = new Date(it.inicio);
      const fin = it.fin ? new Date(it.fin) : ini;
      const d = new Date(ini); d.setHours(0, 0, 0, 0);
      // Tope de 60 días por si un evento tiene un fin absurdo: sin él, un año
      // de duración serían 365 vueltas por evento.
      for (let i = 0; i < 60 && d <= fin; i++) {
        const k = claveDia(d);
        if (!mapa.has(k)) mapa.set(k, []);
        mapa.get(k)!.push(it);
        d.setDate(d.getDate() + 1);
      }
    }
    // Dentro de un día: primero lo de todo el día, luego por hora.
    for (const lista of mapa.values()) {
      lista.sort((a, b) => (a.todoElDia === b.todoElDia
        ? String(a.inicio).localeCompare(String(b.inicio))
        : a.todoElDia ? -1 : 1));
    }
    return mapa;
  }, [items]);

  const mover = (paso: number) => {
    if (vista === 'mes') setAncla(a => new Date(a.getFullYear(), a.getMonth() + paso, 1));
    else setAncla(a => sumarDias(a, paso * (vista === 'semana' ? 7 : 1)));
  };

  /** Soltar algo en otro día. Un evento se mueve conservando su hora; una
   *  tarea cambia su fecha de vencimiento, que es la tarea de verdad y no una
   *  copia — el tablero lo ve al instante. */
  const soltarEn = async (dia: Date) => {
    const it = arrastrando.current;
    arrastrando.current = null;
    setEncima(null);
    if (!it) return;
    const destino = claveDia(dia);
    if (claveDia(new Date(it.inicio)) === destino) return;

    // Se pinta ya y se confirma después: arrastrar tiene que ir a la velocidad
    // de la mano.
    setItems(xs => xs.map(x => {
      if (x.id !== it.id) return x;
      if (x.clase === 'tarea') return { ...x, inicio: destino };
      const ini = new Date(x.inicio);
      const nuevo = new Date(`${destino}T00:00:00`);
      nuevo.setHours(ini.getHours(), ini.getMinutes(), 0, 0);
      const dur = x.fin ? new Date(x.fin).getTime() - ini.getTime() : 0;
      return {
        ...x,
        inicio: nuevo.toISOString(),
        fin: x.fin ? new Date(nuevo.getTime() + dur).toISOString() : null,
      };
    }));

    const r = it.clase === 'tarea'
      ? await fetch(`/api/tareas/${it.id}/vence`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vence_el: destino }),
        }).catch(() => null)
      : await (async () => {
          const ini = new Date(it.inicio);
          const nuevo = new Date(`${destino}T00:00:00`);
          nuevo.setHours(ini.getHours(), ini.getMinutes(), 0, 0);
          const dur = it.fin ? new Date(it.fin).getTime() - ini.getTime() : 0;
          return fetch(`/api/eventos/${it.id}`, {
            method: 'PUT', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inicio: nuevo.toISOString(),
              fin: it.fin ? new Date(nuevo.getTime() + dur).toISOString() : undefined,
            }),
          }).catch(() => null);
        })();
    if (!r?.ok) { setError('No se ha podido mover.'); cargar(); }
  };

  const guardar = async () => {
    if (!editando) return;
    const titulo = String(editando.titulo || '').trim();
    if (!titulo) { setError('Ponle un nombre.'); return; }
    const cuerpo = {
      titulo,
      descripcion: editando.descripcion || null,
      inicio: editando.inicio,
      fin: editando.fin || null,
      todo_el_dia: !!editando.todoElDia,
      lugar: editando.lugar || null,
      proyecto_id: editando.proyectoId || null,
    };
    const r = editando.id
      ? await fetch(`/api/eventos/${editando.id}`, {
          method: 'PUT', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
        })
      : await fetch('/api/eventos', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
        });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d?.error || 'No se ha podido guardar.'); return; }
    setEditando(null);
    setError(null);
    cargar();
  };

  const borrar = async () => {
    if (!editando?.id) return;
    const r = await fetch(`/api/eventos/${editando.id}`, { method: 'DELETE', credentials: 'include' })
      .catch(() => null);
    if (!r?.ok) { setError('No se ha podido borrar.'); return; }
    setEditando(null);
    cargar();
  };

  /** Nuevo evento a las 9:00 del día que pulses: una hora razonable evita
   *  tener que tocar la hora en el caso normal. */
  const nuevoEn = (dia: Date) => {
    const ini = new Date(dia);
    ini.setHours(9, 0, 0, 0);
    const fin = new Date(ini); fin.setHours(10, 0, 0, 0);
    setEditando({
      titulo: '', inicio: ini.toISOString(), fin: fin.toISOString(),
      todoElDia: false, clase: 'evento',
    });
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto w-full py-20 text-center">
        <CalendarDays className="w-8 h-8 mx-auto text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-500">Inicia sesión para ver tu calendario.</p>
      </div>
    );
  }

  const titulo = vista === 'mes'
    ? `${MESES[ancla.getMonth()]} de ${ancla.getFullYear()}`
    : vista === 'semana'
      ? `${dias[0].getDate()} – ${dias[6].getDate()} de ${MESES[dias[6].getMonth()]}`
      : ancla.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  /** Una cosa, pintada. Es la misma pieza en las tres vistas. */
  const Ficha = ({ it, compacta }: { it: Cosa; compacta?: boolean }) => {
    const tono = tonoDe(it.proyectoId || it.clase);
    const hecha = it.clase === 'tarea' && it.estado === 'hecho';
    return (
      <button
        draggable
        onDragStart={e => { arrastrando.current = it; e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { arrastrando.current = null; setEncima(null); }}
        onClick={e => {
          e.stopPropagation();
          // Una tarea se abre donde vive; un evento se edita aquí.
          if (it.clase === 'tarea') { if (it.url) navegar(it.url); return; }
          setEditando({ ...it });
        }}
        title={`${it.titulo}${it.proyecto ? ` · ${it.proyecto}` : ''}`}
        className={cn('w-full flex items-center gap-1 rounded px-1.5 text-left transition-opacity hover:opacity-80 cursor-grab active:cursor-grabbing',
          compacta ? 'py-0.5' : 'py-1',
          tono.fondo, tono.texto, hecha && 'opacity-50 line-through')}
      >
        {it.clase === 'tarea'
          ? <ListChecks className="w-3 h-3 shrink-0" />
          : it.icono
            ? <span className="text-[11px] leading-none shrink-0">{it.icono}</span>
            : <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tono.barra)} />}
        {!it.todoElDia && !compacta && (
          <span className="text-[9px] font-bold opacity-70 shrink-0">{hora(it.inicio)}</span>
        )}
        <span className="flex-1 truncate text-[11px] font-bold">{it.titulo}</span>
      </button>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col h-full px-4 sm:px-6 py-5">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center gap-2 mb-4 shrink-0">
        <h1 className="inline-flex items-center gap-2 text-xl font-black tracking-tight text-slate-900">
          <CalendarDays className="w-5 h-5 text-emerald-600" /> Calendario
        </h1>

        <div className="flex items-center gap-0.5 ml-2">
          <button onClick={() => mover(-1)} title="Anterior"
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setAncla(new Date())}
            className="px-3 h-8 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100">
            Hoy
          </button>
          <button onClick={() => mover(1)} title="Siguiente"
            className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm font-black text-slate-700 capitalize">{titulo}</p>
        {cargando && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />}

        <div className="flex-1" />

        <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
          {(['mes', 'semana', 'dia'] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={cn('px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors',
                vista === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {v === 'dia' ? 'día' : v}
            </button>
          ))}
        </div>

        <button onClick={() => nuevoEn(ancla)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
          <Plus className="w-4 h-4" /> Nuevo evento
        </button>
      </div>

      {error && (
        <p className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 shrink-0">{error}</p>
      )}

      {/* La rejilla */}
      <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">
        {vista !== 'dia' && (
          <div className="grid grid-cols-7 border-b border-slate-100 shrink-0">
            {DIAS.map(d => (
              <div key={d} className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">
                {d}
              </div>
            ))}
          </div>
        )}

        <div className={cn('flex-1 min-h-0 overflow-y-auto',
          vista === 'mes' ? 'grid grid-cols-7 grid-rows-6' : vista === 'semana' ? 'grid grid-cols-7' : '')}>
          {dias.map(d => {
            const k = claveDia(d);
            const cosas = porDia.get(k) || [];
            const otroMes = vista === 'mes' && d.getMonth() !== ancla.getMonth();
            return (
              <div
                key={k}
                onDragOver={e => { if (arrastrando.current) { e.preventDefault(); setEncima(k); } }}
                onDragLeave={() => setEncima(c => (c === k ? null : c))}
                onDrop={e => { e.preventDefault(); soltarEn(d); }}
                onClick={() => nuevoEn(d)}
                className={cn('border-b border-r border-slate-100 p-1 flex flex-col gap-0.5 cursor-pointer transition-colors',
                  vista === 'dia' ? 'min-h-full' : 'min-h-[5.5rem]',
                  otroMes && 'bg-slate-50/60',
                  encima === k && 'bg-emerald-50 ring-2 ring-inset ring-emerald-300',
                  !otroMes && encima !== k && 'hover:bg-slate-50/70')}
              >
                <div className="flex items-center gap-1 px-0.5">
                  <span className={cn('text-[11px] font-black grid place-items-center',
                    esHoy(d) ? 'w-5 h-5 rounded-full bg-emerald-600 text-white'
                      : otroMes ? 'text-slate-300' : 'text-slate-500')}>
                    {d.getDate()}
                  </span>
                  {vista === 'dia' && (
                    <span className="text-xs font-bold text-slate-400 capitalize">
                      {d.toLocaleDateString('es-ES', { weekday: 'long' })}
                    </span>
                  )}
                </div>

                {/* En el mes caben tres antes de tener que resumir; si no, una
                    semana cargada rompe la altura de la fila entera. */}
                {(vista === 'mes' ? cosas.slice(0, 3) : cosas).map(it => (
                  <Ficha key={`${it.clase}-${it.id}`} it={it} compacta={vista === 'mes'} />
                ))}
                {vista === 'mes' && cosas.length > 3 && (
                  <button
                    onClick={e => { e.stopPropagation(); setAncla(d); setVista('dia'); }}
                    className="px-1.5 text-[10px] font-bold text-slate-400 hover:text-emerald-700 text-left"
                  >
                    +{cosas.length - 3} más
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-400 shrink-0">
        Tus tareas con fecha salen aquí solas. Arrastra cualquier cosa a otro día para moverla:
        una tarea cambia de verdad, no una copia.
      </p>

      {/* Crear / editar un evento */}
      {editando && (
        <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setEditando(null)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-black text-slate-900">
                {editando.id ? 'Editar evento' : 'Nuevo evento'}
              </h2>
              <button onClick={() => setEditando(null)} className="ml-auto p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={e => { e.preventDefault(); guardar(); }} className="space-y-2.5">
              <input
                autoFocus
                value={editando.titulo || ''}
                onChange={e => setEditando(x => ({ ...x!, titulo: e.target.value }))}
                placeholder="¿Qué es?"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
              />

              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <input type="checkbox" checked={!!editando.todoElDia}
                  onChange={e => setEditando(x => ({ ...x!, todoElDia: e.target.checked }))} />
                Todo el día
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Empieza</span>
                  <input
                    type={editando.todoElDia ? 'date' : 'datetime-local'}
                    value={paraCampo(editando.inicio, !!editando.todoElDia)}
                    onChange={e => setEditando(x => ({ ...x!, inicio: deCampo(e.target.value) }))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                  />
                </label>
                <label className="block">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Acaba</span>
                  <input
                    type={editando.todoElDia ? 'date' : 'datetime-local'}
                    value={paraCampo(editando.fin || null, !!editando.todoElDia)}
                    onChange={e => setEditando(x => ({ ...x!, fin: e.target.value ? deCampo(e.target.value) : null }))}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                  />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  value={editando.lugar || ''}
                  onChange={e => setEditando(x => ({ ...x!, lugar: e.target.value }))}
                  placeholder="Dónde (opcional)"
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                />
              </div>

              <div className="flex items-center gap-2">
                <FolderKanban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={editando.proyectoId || ''}
                  onChange={e => setEditando(x => ({ ...x!, proyectoId: e.target.value || null }))}
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                >
                  <option value="">Sin proyecto</option>
                  {proyectos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </select>
              </div>

              <textarea
                value={editando.descripcion || ''}
                onChange={e => setEditando(x => ({ ...x!, descripcion: e.target.value }))}
                rows={2}
                placeholder="Notas (opcional)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none focus:outline-none focus:border-emerald-300"
              />

              <div className="flex gap-2 pt-1">
                {editando.id && (
                  <button type="button" onClick={borrar}
                    className="px-3 py-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-colors">
                  <Check className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/** Lo que espera un `<input type="datetime-local">`: hora LOCAL sin zona. Si se
 *  le diera el ISO en UTC, la hora aparecería desplazada al abrir el evento. */
function paraCampo(iso: string | null | undefined, soloDia: boolean) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  const fecha = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return soloDia ? fecha : `${fecha}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Y la vuelta: lo que escribe la persona es hora local. */
function deCampo(v: string) {
  return new Date(v.length === 10 ? `${v}T00:00:00` : v).toISOString();
}
