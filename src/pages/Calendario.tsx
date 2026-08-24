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
  MapPin, FolderKanban, ListChecks, Clock, Repeat,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../contexts/AuthContext';

type Vista = 'dia' | 'semana' | 'mes' | 'anio';

interface Cosa {
  // 'google' se añadió en la fase 5 (2026-08-23): las citas de tu calendario de
  // Google, pintadas JUNTO a lo de aquí y no en otra pestaña. Ver dos agendas
  // por separado es exactamente el problema que tiene la gente hoy.
  clase: 'evento' | 'tarea' | 'google';
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
  repeticion?: string | null;
  /** En una repetición, el id del evento de verdad. */
  idBase?: string;
  esRepeticion?: boolean;
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
const esFinDeSemana = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/** El número de semana ISO, como en el calendario de macOS. Es la cuenta que
 *  usa media Europa para decir «la semana 33», y se calcula contra el jueves
 *  de esa semana: es la regla de la norma ISO-8601. */
function semanaISO(d: Date) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  x.setUTCDate(x.getUTCDate() + 4 - (x.getUTCDay() || 7));
  const enero = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x.getTime() - enero.getTime()) / 86400000 + 1) / 7);
}

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

  // PINTAR DÍAS PARA CREAR UN EVENTO (Eugenio, 2026-08-20: «cuando pinche en
  // un día y arrastre hacia otro día que se genere un nuevo evento en esos
  // días, y también si hago doble click»).
  //
  // Un clic suelto NO crea nada: crear con un solo clic hace que se te llene
  // el calendario de eventos vacíos sin querer. Crear es doble clic, o pintar
  // un tramo — dos gestos que no se hacen sin querer.
  const pintando = useRef<string | null>(null);
  const [tramo, setTramo] = useState<{ a: string; b: string } | null>(null);
  // EL TRAMO TAMBIÉN EN UNA REFERENCIA, y no es un capricho: al soltar hay que
  // leer el tramo ACTUAL, y el estado de React puede no haberse repintado
  // todavía si el gesto va rápido. Leyendo el estado desde el manejador de
  // «soltar» se veía el valor viejo y no se creaba nada: el calendario se
  // quedaba pintado y no pasaba nada (visto en pruebas, 2026-08-20). La
  // referencia es siempre la de ahora.
  const tramoRef = useRef<{ a: string; b: string } | null>(null);
  const marcarTramo = useCallback((t: { a: string; b: string } | null) => {
    tramoRef.current = t;
    setTramo(t);
  }, []);

  /** ¿Está este día dentro de lo que se está pintando? */
  const enTramo = useCallback((k: string) => {
    if (!tramo) return false;
    const [x, y] = tramo.a <= tramo.b ? [tramo.a, tramo.b] : [tramo.b, tramo.a];
    return k >= x && k <= y;
  }, [tramo]);

  // Se suelta EN LA VENTANA y no en la celda: si sueltas fuera de la rejilla,
  // el gesto tiene que terminar igual y no quedarse pintando para siempre.
  useEffect(() => {
    const soltar = () => {
      const t = tramoRef.current;
      if (!pintando.current || !t) { pintando.current = null; return; }
      const [x, y] = t.a <= t.b ? [t.a, t.b] : [t.b, t.a];
      pintando.current = null;
      marcarTramo(null);
      // Un solo día es un clic, no un tramo: lo deja para el doble clic.
      if (x === y) return;
      const ini = new Date(`${x}T09:00:00`);
      const fin = new Date(`${y}T10:00:00`);
      setEditando({
        titulo: '', inicio: ini.toISOString(), fin: fin.toISOString(),
        todoElDia: true, clase: 'evento',
      });
    };
    // Los DOS: un ratón dispara `pointerup` y después `mouseup`, pero no todos
    // los caminos de entrada mandan los dos. Soltar tiene que terminar el
    // gesto siempre — si no, el calendario se queda pintado y no responde.
    // Si llegan los dos, el segundo se encuentra el gesto ya cerrado y sale.
    window.addEventListener('pointerup', soltar);
    window.addEventListener('mouseup', soltar);
    return () => {
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('mouseup', soltar);
    };
    // Sin dependencias: el manejador ya no lee estado, lee la referencia. Así
    // se registra UNA vez y nunca puede quedarse viejo.
  }, [marcarTramo]);

  /** El tramo que se pide, según la vista. En el mes se piden las 6 semanas
   *  completas de la rejilla, no solo del 1 al 31: si no, los días del mes
   *  anterior que asoman saldrían siempre vacíos. */
  const [desde, hasta, dias] = useMemo(() => {
    if (vista === 'anio') {
      // El año entero: del 1 de enero al 31 de diciembre. Se piden todos los
      // eventos de una vez porque la vista los enseña todos a la vez.
      const a0 = new Date(ancla.getFullYear(), 0, 1);
      const a1 = new Date(ancla.getFullYear(), 11, 31);
      return [claveDia(a0), claveDia(a1), [] as Date[]];
    }
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
    // ── LAS DOS AGENDAS, EN PARALELO Y SIN QUE UNA TUMBE A LA OTRA ──────────
    // Lo de aquí y lo de Google se piden a la vez. Si Google falla —o no hay
    // cuenta conectada, que es lo normal— el calendario de la plataforma se
    // pinta igual: encadenarlas dejaría la pantalla vacía por algo opcional.
    Promise.allSettled([
      fetch(`/api/calendario?desde=${desde}&hasta=${hasta}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/calendario/google?desde=${new Date(desde).toISOString()}&hasta=${new Date(hasta).toISOString()}`,
        { credentials: 'include' }).then(r => (r.ok ? r.json() : null)),
    ])
      .then(([mio, google]) => {
        const d: any = mio.status === 'fulfilled' ? mio.value : null;
        if (d?.error) { setError(d.error); setItems([]); return; }
        setError(null);
        const propios: Cosa[] = Array.isArray(d?.items) ? d.items : [];

        const g: any = google.status === 'fulfilled' ? google.value : null;
        const deGoogle: Cosa[] = (g?.citas || []).map((c: any) => ({
          clase: 'google' as const,
          id: `g-${c.id}`,
          titulo: c.titulo,
          descripcion: null,
          inicio: c.empieza,
          fin: c.acaba,
          todoElDia: Boolean(c.todoElDia),
          lugar: c.donde,
          // Un color propio para que se distinga de un vistazo de qué agenda
          // viene cada cosa, sin tener que abrirla.
          color: '#4285F4',
          icono: null,
          proyectoId: null, proyecto: null, proyectoSlug: null,
          url: c.enlace,
        }));
        setItems([...propios, ...deGoogle]);
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
    if (vista === 'anio') setAncla(a => new Date(a.getFullYear() + paso, 0, 1));
    else if (vista === 'mes') setAncla(a => new Date(a.getFullYear(), a.getMonth() + paso, 1));
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
    // UNA CITA DE GOOGLE NO SE ARRASTRA DESDE AQUÍ. Sin esto caería en la rama
    // de «evento nuestro» y se pintaría movida mientras el servidor no cambia
    // nada: la pantalla diría una cosa y tu Google otra, que es peor que no
    // dejar moverla. Se mueve en Google, y al recargar se ve.
    if (it.clase === 'google') return;

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
      repeticion: editando.repeticion || null,
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

  const titulo = vista === 'anio'
    ? String(ancla.getFullYear())
    : vista === 'mes'
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
        data-ficha
        // Y NO SE DEJA NI EMPEZAR A ARRASTRARLA. Bloquearlo solo al soltar
        // funciona, pero la cita se ve moverse con el ratón y volver de golpe:
        // parece que la aplicación se ha equivocado, cuando está acertando.
        draggable={it.clase !== 'google'}
        onDragStart={e => { arrastrando.current = it; e.dataTransfer.effectAllowed = 'move'; }}
        onDragEnd={() => { arrastrando.current = null; setEncima(null); }}
        onClick={e => {
          e.stopPropagation();
          // Una tarea se abre donde vive; un evento se edita aquí.
          if (it.clase === 'tarea') { if (it.url) navegar(it.url); return; }
          // Y una cita de Google se abre EN GOOGLE. Abrirla en nuestro editor
          // dejaría «guardar» un cambio que no llegaría a ninguna parte —o
          // peor, crearía un evento nuestro duplicado al lado del suyo.
          if (it.clase === 'google') {
            if (it.url) window.open(it.url, '_blank', 'noopener');
            return;
          }
          // Si es una repetición, se edita EL EVENTO, no esa vez suelta: su id
          // lleva la fecha detrás y no existe como fila.
          setEditando({ ...it, id: (it as any).idBase || it.id });
        }}
        title={`${it.titulo}${it.proyecto ? ` · ${it.proyecto}` : ''}`}
        className={cn('w-full flex items-center gap-1 rounded px-1.5 text-left transition-opacity hover:opacity-80 cursor-grab active:cursor-grabbing',
          compacta ? 'py-0.5' : 'py-1',
          tono.fondo, tono.texto, hecha && 'opacity-50 line-through')}
      >
        {it.esRepeticion && <Repeat className="w-2.5 h-2.5 shrink-0 opacity-60" />}
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
          {(['dia', 'semana', 'mes', 'anio'] as Vista[]).map(v => (
            <button key={v} onClick={() => setVista(v)}
              className={cn('px-3 py-1 rounded-full text-xs font-bold capitalize transition-colors',
                vista === v ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50')}>
              {v === 'dia' ? 'día' : v === 'anio' ? 'año' : v}
            </button>
          ))}
        </div>

        <button onClick={() => nuevoEn(vista === 'anio' ? new Date() : ancla)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors">
          <Plus className="w-4 h-4" /> Nuevo evento
        </button>
      </div>

      {error && (
        <p className="mb-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 shrink-0">{error}</p>
      )}

      {/* EL AÑO ENTERO: doce meses pequeños. No caben los títulos de los
          eventos, así que lo que se enseña es DÓNDE hay algo — un punto bajo
          el día. Es un mapa del año para saltar, no para leer. */}
      {vista === 'anio' ? (
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 12 }, (_, m) => {
              const primero = new Date(ancla.getFullYear(), m, 1);
              const inicio = lunesDe(primero);
              const celdas = Array.from({ length: 42 }, (_, i) => sumarDias(inicio, i));
              // Se corta en la última semana con días del mes: casi ningún mes
              // necesita las seis filas y con ellas los doce meses no caben.
              const ultimas = celdas.filter(d => d.getMonth() === m);
              const filas = Math.ceil((celdas.indexOf(ultimas[ultimas.length - 1]) + 1) / 7);
              return (
                <div key={m}>
                  <button
                    onClick={() => { setAncla(primero); setVista('mes'); }}
                    className="text-sm font-black text-slate-800 capitalize hover:text-emerald-700 transition-colors mb-1"
                  >
                    {MESES[m]}
                  </button>
                  <div className="grid grid-cols-7 gap-px">
                    {DIAS.map(x => (
                      <span key={x} className="text-[8px] font-black uppercase text-slate-300 text-center">
                        {x[0]}
                      </span>
                    ))}
                    {celdas.slice(0, filas * 7).map(d => {
                      const k = claveDia(d);
                      const fuera = d.getMonth() !== m;
                      const tiene = (porDia.get(k) || []).length > 0;
                      return (
                        <button
                          key={k}
                          onClick={() => { setAncla(d); setVista('dia'); }}
                          className={cn('relative h-6 grid place-items-center text-[10px] font-bold rounded transition-colors tabular-nums',
                            fuera ? 'text-slate-200'
                              : esHoy(d) ? 'bg-rose-600 text-white'
                                : 'text-slate-700 hover:bg-slate-100')}
                        >
                          {d.getDate()}
                          {tiene && !fuera && !esHoy(d) && (
                            <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-emerald-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
      /* La rejilla */
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
          {dias.map((d, i) => {
            const k = claveDia(d);
            const cosas = porDia.get(k) || [];
            const otroMes = vista === 'mes' && d.getMonth() !== ancla.getMonth();
            const primeraColumna = vista === 'mes' && i % 7 === 0;
            return (
              <div
                key={k}
                onDragOver={e => { if (arrastrando.current) { e.preventDefault(); setEncima(k); } }}
                onDragLeave={() => setEncima(c => (c === k ? null : c))}
                onDrop={e => { e.preventDefault(); soltarEn(d); }}
                // Pintar un tramo: empieza en el fondo de la celda, no encima
                // de un evento (ahí manda el arrastre del propio evento).
                onPointerDown={e => {
                  if ((e.target as HTMLElement).closest('[data-ficha]')) return;
                  pintando.current = k;
                  marcarTramo({ a: k, b: k });
                }}
                // `pointerenter` Y `pointermove`: el primero es el que manda,
                // pero no burbujea y hay ratones y trackpads que se saltan la
                // entrada si el salto entre fotogramas es grande. Con los dos,
                // el tramo sigue al dedo pase lo que pase.
                onPointerEnter={() => { if (pintando.current && tramoRef.current?.b !== k) marcarTramo({ a: tramoRef.current!.a, b: k }); }}
                onPointerMove={() => { if (pintando.current && tramoRef.current?.b !== k) marcarTramo({ a: tramoRef.current!.a, b: k }); }}
                onDoubleClick={() => nuevoEn(d)}
                className={cn('relative border-b border-r border-slate-100 p-1 pt-6 flex flex-col gap-0.5 cursor-pointer transition-colors select-none',
                  vista === 'dia' ? 'min-h-full' : 'min-h-[5.5rem]',
                  // El fin de semana con fondo, como en el calendario de macOS:
                  // localizar el sábado de un vistazo sin leer la cabecera.
                  esFinDeSemana(d) && !otroMes && 'bg-slate-50/70',
                  otroMes && 'bg-slate-50/40',
                  (encima === k || enTramo(k)) && 'bg-emerald-50 ring-2 ring-inset ring-emerald-300',
                )}
              >
                {/* EL NÚMERO DEL DÍA, ARRIBA A LA DERECHA Y CON CONTRASTE
                    (Eugenio, 2026-08-20, con la captura del calendario de
                    macOS). Antes iba a la izquierda y en gris claro: en una
                    rejilla llena, el número es lo primero que buscas y era lo
                    que menos se veía. */}
                <span className={cn('absolute top-1 right-1.5 text-[13px] font-bold grid place-items-center tabular-nums',
                  esHoy(d) ? 'w-6 h-6 rounded-full bg-rose-600 text-white'
                    : otroMes ? 'text-slate-300' : 'text-slate-800')}>
                  {d.getDate()}
                </span>

                {/* El número de semana, a la izquierda de la primera columna. */}
                {primeraColumna && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold text-slate-300 tabular-nums">
                    {semanaISO(d)}
                  </span>
                )}

                {vista === 'dia' && (
                  <span className="absolute top-1.5 left-2 text-xs font-bold text-slate-400 capitalize">
                    {d.toLocaleDateString('es-ES', { weekday: 'long' })}
                  </span>
                )}

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
      )}

      <p className="mt-2 text-[11px] text-slate-400 shrink-0">
        Doble clic en un día para crear algo, o pincha y arrastra para pintar varios días.
        Tus tareas con fecha salen solas; arrastrarlas a otro día las cambia de verdad, no una copia.
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

              {/* SE REPITE (fase 3). Se guarda la REGLA, no una copia por
                  semana: un evento semanal durante dos años serían 104 filas
                  que mantener. La regla va en el formato de iCalendar, que es
                  el que entienden Google y Apple. */}
              <div className="flex items-center gap-2">
                <Repeat className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={editando.repeticion || ''}
                  onChange={e => setEditando(x => ({ ...x!, repeticion: e.target.value || null }))}
                  className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-300"
                >
                  <option value="">No se repite</option>
                  <option value="FREQ=DAILY">Cada día</option>
                  <option value="FREQ=WEEKLY">Cada semana</option>
                  <option value="FREQ=WEEKLY;INTERVAL=2">Cada dos semanas</option>
                  <option value="FREQ=MONTHLY">Cada mes</option>
                  <option value="FREQ=YEARLY">Cada año</option>
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
