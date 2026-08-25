import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Loader2, ChevronRight, PlayCircle, FileText, BarChart3, Map as MapIcon,
  Image as ImageIcon, ExternalLink, Sparkles, FolderKanban, LayoutGrid,
  Search, ShieldAlert, Gauge, Play, User as UserIcon, CircleDashed, Flag,
  Orbit, X as Cerrar, Minimize2, Plus, Minus, Pencil, Check, Move,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth, ROLE } from '../contexts/AuthContext';
import { OBJETIVOS } from '../utils/objetivos';

// ============================================================================
// LA PÁGINA DE UN TEMA — `/temas/:id` (2026-08-25)
// ============================================================================
// Eugenio, en dos encargos que hicieron falta los dos:
//
//   «cuando alguien busque eso o pinche en ese subtema a través del menú tú le
//    tienes que presentar el estado del arte de este tema con el contenido más
//    potente, relevante y de calidad posible»;
//
//   «no solo tienes que poner el estado del arte, sino publicaciones con vídeos
//    chulos […] en una especie de grid, haz lo que sea compacto y donde la
//    gente pueda elegir si aprender más sobre el estado del arte o si ve
//    publicaciones o si ver indicadores o si explorar el grid de subtemas […]
//    visualmente atractivo y moderno, como un dashboard».
//
// ── POR QUÉ PESTAÑAS Y NO UNA COLUMNA LARGA ────────────────────────────────
// La primera versión era una lista: cincuenta fichas seguidas, y la de abajo no
// la veía nadie. Un tema no se lee de arriba abajo, se consulta — y quien entra
// ya sabe a qué viene: a ver vídeos, a mirar los números, o a bajar un nivel
// más. Cinco entradas y que elija.
//
// ── LA PESTAÑA QUE SE ABRE DEPENDE DE LO QUE HAY ───────────────────────────
// Un tema con ramas abre en la rejilla, porque lo primero es saber qué hay
// dentro. Uno sin ramas —una hoja— abre en los vídeos si los tiene y en el
// estado del arte si no. Abrir siempre en la misma pestaña obligaría a la mitad
// de la gente a pulsar antes de ver nada.
//
// ── Y VA EN LA URL ─────────────────────────────────────────────────────────
// `?ver=videos`. Sin esto, mandar a alguien «mira los vídeos de esto» es mandar
// un enlace y una instrucción, y volver atrás desde un vídeo te devuelve a la
// pestaña que no era.

type Pieza = {
  id: string; origen: string; formato: string; url: string; origen_id: string | null;
  titulo: string; fuente: string | null; idioma: string | null;
  publicado_el: string | null; nota_ia: string | null; calidad: number; estado: string;
  medio_url?: string | null; licencia?: string | null; autor?: string | null;
  cluster_id?: string | null; genero?: string | null;
  mapa_x?: number | null; mapa_y?: number | null; a_mano?: boolean;
};

type Cluster = {
  id: string; nombre: string; frase: string | null;
  x: number; y: number; cuantas: number; modelo: string | null; a_mano?: boolean;
};

type Vecino = {
  id: string; vecino_id: string; parecido: number;
  titulo: string; formato: string; fuente: string | null;
};

type Cosa = {
  tipo: string; id: string; titulo: string; extracto: string; autor?: string | null;
  fecha: string | null; ruta: string; por_busqueda: boolean;
};

type Reto = { id: string; title: string; description: string | null; scope: string | null; priority: number | null };

type Respuesta = {
  tema: {
    id: string; objetivo_id: string; padre_id: string | null; nombre: string;
    objetivo_nombre?: string; es_objetivo?: boolean;
  };
  retos: Reto[];
  clusters: Cluster[];
  vecinos: Vecino[];
  camino: Array<{ id: string; nombre: string }>;
  hijos: Array<{ id: string; nombre: string; cosas: number }>;
  palabras: string[];
  tuyo: Cosa[];
  humanidad: Cosa[];
  fuera: Pieza[];
};

type Indicador = {
  id: string; name: string; unit: string | null; value: number | null;
  objective_id: string; direction?: string;
};

const ICONO_FORMATO: Record<string, any> = {
  video: PlayCircle, texto: FileText, grafica: BarChart3, mapa: MapIcon, imagen: ImageIcon,
};
const NOMBRE_FORMATO: Record<string, string> = {
  video: 'Vídeo', texto: 'Texto', grafica: 'Gráfica', mapa: 'Mapa', imagen: 'Imagen',
};
const ICONO_TIPO: Record<string, any> = {
  publicacion: FileText, proyecto: FolderKanban, ventana: LayoutGrid,
  mapa: MapIcon, grafica: BarChart3,
};

type Pestanya = 'mapa' | 'explorar' | 'videos' | 'imagenes' | 'arte' | 'tuyo' | 'retos' | 'indicadores';

export default function Tema() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [indicadores, setIndicadores] = useState<Indicador[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formato, setFormato] = useState<string>('todo');
  /** Sube cuando alguien corrige el mapa: es lo que vuelve a pedir el tema. */
  const [vuelta, setVuelta] = useState(0);
  const recargar = () => setVuelta(v => v + 1);

  useEffect(() => {
    let vivo = true;
    setCargando(true); setError(null); setDatos(null); setFormato('todo');
    fetch(`/api/agregador/tema/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(async r => {
        const j = await r.json().catch(() => null);
        if (!r.ok) throw new Error(j?.error || 'No se ha podido abrir el tema.');
        return j;
      })
      .then(j => { if (vivo) { setDatos(j); setCargando(false); } })
      .catch(e => { if (vivo) { setError(e.message); setCargando(false); } });
    return () => { vivo = false; };
  }, [id, vuelta]);

  // Los indicadores son del OBJETIVO, no del subtema: hoy no hay ninguna tabla
  // que los una a un subtema, y decir que estos siete son de «Bicicleta de
  // carga» sería afirmar una relación que nadie ha hecho. Se dice de quién son.
  useEffect(() => {
    if (!datos) return;
    let vivo = true;
    fetch('/api/data/indicators')
      .then(r => (r.ok ? r.json() : []))
      .then((j: Indicador[]) => {
        if (vivo) setIndicadores(j.filter(i => i.objective_id === datos.tema.objetivo_id));
      })
      .catch(() => { if (vivo) setIndicadores([]); });
    return () => { vivo = false; };
  }, [datos?.tema.objetivo_id]);

  const objetivo = useMemo(
    () => OBJETIVOS.find(o => o.id === datos?.tema.objetivo_id),
    [datos?.tema.objetivo_id],
  );

  const videos = useMemo(
    () => (datos?.fuera ?? []).filter(p => p.formato === 'video' && p.origen_id),
    [datos?.fuera],
  );

  /*
   * ── EL ORDEN: CALIDAD, PERO SIN TRES SEGUIDAS DE LO MISMO ────────────────
   * Ordenar sólo por `calidad` ponía los cuatro informes del ITF uno detrás de
   * otro y cinco vídeos del mismo canal a continuación. Cada uno estaba en su
   * sitio y la primera pantalla no servía: quien llega no quiere lo mejor
   * cuatro veces, quiere saber qué hay.
   *
   * Así que se baja una pieza si algo MUY parecido acaba de salir — se usa el
   * grafo de vecinos que ya viene calculado, no se recalcula nada aquí. Es
   * relevancia con variedad, y la penalización es pequeña a propósito: cambia
   * el orden, nunca esconde.
   *
   * Y va AQUÍ ARRIBA, con los demás hooks, no junto al bloque que lo usa: lo
   * puse ahí y la página se quedó en blanco con «Rendered more hooks than
   * during the previous render», porque más arriba hay dos `return` para
   * «cargando» y «error». Un hook detrás de un `return` no se ejecuta siempre,
   * y React cuenta. No lo vio `tsc`: lo vio abrir la pestaña.
   */
  const piezas = useMemo(() => {
    const base = (datos?.fuera ?? []).filter(p => formato === 'todo' || p.formato === formato);
    const parecidoCon: Record<string, Set<string>> = {};
    for (const v of datos?.vecinos ?? []) {
      if (v.parecido >= 0.62) (parecidoCon[v.id] ||= new Set()).add(v.vecino_id);
    }
    const quedan = [...base].sort((a, b) => b.calidad - a.calidad);
    const salida: Pieza[] = [];
    while (quedan.length) {
      const ultimos = salida.slice(-3).map(p => p.id);
      // El primero que no se parezca a los tres anteriores; si todos se
      // parecen, el primero y ya — nunca se descarta nada.
      const i = quedan.findIndex(p => !ultimos.some(u => parecidoCon[p.id]?.has(u) || parecidoCon[u]?.has(p.id)));
      salida.push(...quedan.splice(i < 0 ? 0 : i, 1));
    }
    return salida;
  }, [datos?.fuera, datos?.vecinos, formato]);

  const imagenes = useMemo(
    () => (datos?.fuera ?? []).filter(p => p.formato === 'imagen' && p.medio_url),
    [datos?.fuera],
  );

  const cuentas = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of datos?.fuera ?? []) m[p.formato] = (m[p.formato] ?? 0) + 1;
    return m;
  }, [datos?.fuera]);

  /* Qué pestañas existen para ESTE tema, en orden. */
  const pestanyas = useMemo(() => {
    if (!datos) return [] as Array<{ id: Pestanya; nombre: string; icono: any; cuantos?: number }>;
    const l: Array<{ id: Pestanya; nombre: string; icono: any; cuantos?: number }> = [];
    // El mapa va PRIMERO cuando hay grupos: es lo que contesta «¿de qué va
    // todo esto?» sin leer nada, y esa es la primera pregunta de quien llega.
    if ((datos.clusters ?? []).length) {
      l.push({ id: 'mapa', nombre: 'Mapa', icono: Orbit, cuantos: datos.clusters.length });
    }
    if (datos.hijos.length) l.push({ id: 'explorar', nombre: 'Explorar', icono: LayoutGrid, cuantos: datos.hijos.length });
    if (videos.length) l.push({ id: 'videos', nombre: 'Vídeos', icono: PlayCircle, cuantos: videos.length });
    if (imagenes.length) l.push({ id: 'imagenes', nombre: 'Imágenes', icono: ImageIcon, cuantos: imagenes.length });
    if (datos.fuera.length) l.push({ id: 'arte', nombre: 'Estado del arte', icono: Sparkles, cuantos: datos.fuera.length });
    if (datos.tuyo.length || datos.humanidad.length) {
      l.push({ id: 'tuyo', nombre: 'En la plataforma', icono: UserIcon, cuantos: datos.tuyo.length + datos.humanidad.length });
    }
    // Retos e Indicadores van SIEMPRE, tengan o no. Son las dos pestañas que
    // pueden estar vacías con sentido: enseñar que MOVILIDAD no tiene ni un
    // reto escrito es información, y esconder la pestaña la convertiría en un
    // hueco que nadie ve y que por tanto nadie llena.
    l.push({ id: 'retos', nombre: 'Retos', icono: Flag, cuantos: datos.retos?.length ?? 0 });
    l.push({ id: 'indicadores', nombre: 'Indicadores', icono: Gauge, cuantos: indicadores?.length });
    return l;
  }, [datos, videos.length, imagenes.length, indicadores?.length]);

  const pedida = params.get('ver') as Pestanya | null;
  const pestanya: Pestanya = useMemo(() => {
    if (pedida && pestanyas.some(p => p.id === pedida)) return pedida;
    return pestanyas[0]?.id ?? 'arte';
  }, [pedida, pestanyas]);

  const irA = (p: Pestanya) => {
    const n = new URLSearchParams(params);
    n.set('ver', p);
    setParams(n, { replace: true });
  };

  if (cargando) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-sm font-bold text-slate-700">{error || 'Ese tema no existe.'}</p>
        <Link to="/objetivos" className="mt-3 inline-block text-sm font-bold text-emerald-700 hover:underline">
          Ver todos los temas
        </Link>
      </div>
    );
  }

  const Icono = objetivo?.icono;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6">

      {/* ══ CABECERA COMPACTA ═══════════════════════════════════════════════
          Todo en dos renglones: dónde estás, cómo se llama y cuánto hay. La
          versión anterior gastaba media pantalla en un título enorme antes de
          enseñar nada. */}
      <nav className="flex flex-wrap items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Link to={`/objetivos/${datos.tema.objetivo_id}`} className="hover:text-slate-700">
          {objetivo?.titulo ?? datos.tema.objetivo_nombre ?? datos.tema.objetivo_id}
        </Link>
        {datos.camino.map((c, i) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-slate-300" />
            {i === datos.camino.length - 1
              ? <span className="text-slate-700">{c.nombre}</span>
              : <Link to={`/temas/${c.id}`} className="hover:text-slate-700">{c.nombre}</Link>}
          </span>
        ))}
      </nav>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {Icono && <Icono className={cn('h-7 w-7 shrink-0', objetivo?.color)} />}
          {datos.tema.nombre}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
          {datos.hijos.length > 0 && <Dato n={datos.hijos.length} que="subtemas" />}
          {videos.length > 0 && <Dato n={videos.length} que="vídeos" />}
          {datos.fuera.length > 0 && <Dato n={datos.fuera.length} que="de fuera" />}
          {datos.tuyo.length > 0 && <Dato n={datos.tuyo.length} que="tuyas" acento />}
        </div>
      </div>

      {/* ══ LAS PESTAÑAS ═════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 -mx-4 mt-4 overflow-x-auto border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex gap-1">
          {pestanyas.map(p => {
            const IconoP = p.icono;
            const activa = p.id === pestanya;
            return (
              <button
                key={p.id}
                onClick={() => irA(p.id)}
                aria-current={activa ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-bold transition-colors',
                  activa
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-700',
                )}
              >
                <IconoP className="h-3.5 w-3.5" />
                {p.nombre}
                {p.cuantos !== undefined && p.cuantos > 0 && (
                  <span className={cn('rounded px-1 text-[10px] font-black tabular-nums',
                    activa ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400')}>
                    {p.cuantos}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">

        {/* ── EL MAPA ──────────────────────────────────────────────────── */}
        {pestanya === 'mapa' && (
          <Constelacion
            piezas={datos.fuera}
            clusters={datos.clusters}
            vecinos={datos.vecinos}
            onCambiado={() => recargar()}
          />
        )}

        {/* ── EXPLORAR: LA REJILLA DE SUBTEMAS ─────────────────────────── */}
        {pestanya === 'explorar' && (
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {datos.hijos.map(h => (
              <Link
                key={h.id}
                to={`/temas/${h.id}`}
                className="group flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              >
                <span className="text-[15px] font-bold leading-snug text-slate-800 group-hover:text-emerald-700">
                  {h.nombre}
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="tabular-nums">{h.cosas}</span>
                  {h.cosas === 1 ? 'publicación' : 'publicaciones'}
                  <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ── VÍDEOS ───────────────────────────────────────────────────── */}
        {pestanya === 'videos' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map(v => <FichaVideo key={v.id} pieza={v} />)}
          </div>
        )}

        {/* ── IMÁGENES ─────────────────────────────────────────────────────
            Columnas de mampostería (`columns-*`) y no una rejilla: estas fotos
            vienen de Commons con la proporción que tenía la cámara, y una
            rejilla de celdas iguales sólo puede recortarlas o dejar huecos. En
            columnas cada una entra con su forma. */}
        {pestanya === 'imagenes' && (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
            {imagenes.map(p => <FichaImagen key={p.id} pieza={p} />)}
          </div>
        )}

        {/* ── ESTADO DEL ARTE ──────────────────────────────────────────── */}
        {pestanya === 'arte' && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <BotonFormato activo={formato === 'todo'} onClick={() => setFormato('todo')}>
                Todo <span className="opacity-50">{datos.fuera.length}</span>
              </BotonFormato>
              {['video', 'texto', 'grafica', 'mapa', 'imagen'].map(f => (
                cuentas[f] ? (
                  <BotonFormato key={f} activo={formato === f} onClick={() => setFormato(f)} icono={ICONO_FORMATO[f]}>
                    {NOMBRE_FORMATO[f]} <span className="opacity-50">{cuentas[f]}</span>
                  </BotonFormato>
                ) : null
              ))}
              <span className="ml-auto text-[11.5px] text-slate-400">
                Por calidad y sin repetir lo parecido — nunca por visitas
              </span>
            </div>
            <ol className="divide-y divide-slate-100">
              {piezas.map(p => <FichaDeFuera key={p.id} pieza={p} />)}
            </ol>
            {piezas.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">Nada de esa forma en este tema todavía.</p>
            )}
          </>
        )}

        {/* ── EN LA PLATAFORMA ─────────────────────────────────────────── */}
        {pestanya === 'tuyo' && (
          <div className="flex flex-col gap-8">
            {datos.tuyo.length > 0 && (
              <section>
                <h2 className="mb-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-emerald-700">Lo tuyo</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {datos.tuyo.map(c => <FichaDeDentro key={`${c.tipo}-${c.id}`} cosa={c} mia />)}
                </div>
              </section>
            )}
            {datos.humanidad.length > 0 && (
              <section>
                <h2 className="mb-2.5 text-[12px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Lo que ha puesto la Humanidad
                </h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {datos.humanidad.map(c => <FichaDeDentro key={`${c.tipo}-${c.id}`} cosa={c} />)}
                </div>
              </section>
            )}
            {datos.palabras.length > 0 && (
              <p className="flex items-start gap-2 border-t border-slate-100 pt-4 text-[12px] leading-relaxed text-slate-400">
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Lo marcado <b className="font-bold text-slate-500">encontrado</b> no está clasificado en este
                  tema: sale de buscar {datos.palabras.map(p => `«${p}»`).join(', ')} en títulos y textos.
                </span>
              </p>
            )}
          </div>
        )}

        {/* ── RETOS ────────────────────────────────────────────────────── */}
        {pestanya === 'retos' && (
          <div className="flex flex-col gap-4">
            <p className="text-[12.5px] leading-relaxed text-slate-500">
              Los retos van por objetivo y no por subtema: no existe ninguna tabla que una un reto
              con un subtema, y decir que éstos son de aquí sería afirmar una relación que nadie ha hecho.
            </p>
            {(datos.retos ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
                <Flag className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-[15px] font-bold text-slate-700">
                  Ningún reto escrito todavía en {objetivo?.titulo ?? datos.tema.objetivo_nombre}
                </p>
                <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-slate-500">
                  Se enseña el hueco en vez de esconder la pestaña. Hay 26 retos en la plataforma y
                  ninguno cuelga de este objetivo: eso no es un fallo de la pantalla, es trabajo
                  que falta.
                </p>
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {datos.retos.map(r => (
                  <Link
                    key={r.id}
                    to={`/retos/${r.id}`}
                    className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span className="text-[15px] font-bold leading-snug text-slate-800">{r.title}</span>
                    {r.description && (
                      <span className="line-clamp-3 text-[12.5px] leading-relaxed text-slate-500">{r.description}</span>
                    )}
                    <span className="mt-1 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                      {r.scope && <span>{r.scope}</span>}
                      {r.priority != null && (
                        <>
                          <span className="text-slate-200">·</span>
                          <span className="tabular-nums">prioridad {r.priority}</span>
                        </>
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── INDICADORES ──────────────────────────────────────────────── */}
        {pestanya === 'indicadores' && (
          <Indicadores
            lista={indicadores}
            objetivo={objetivo?.titulo ?? datos.tema.objetivo_nombre ?? datos.tema.objetivo_id}
            objetivoId={datos.tema.objetivo_id}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LA CONSTELACIÓN
   ══════════════════════════════════════════════════════════════════════════
   Eugenio: «que sea muy muy muy visual, y que den ganas de explorar esos
   clusters, que se vean claro los nombres de los grupos, y que haciendo hover o
   zoom se pueda expandir y ver más detalle».

   ── QUÉ SIGNIFICA LA POSICIÓN ─────────────────────────────────────────────
   Dos piezas están cerca porque **hablan de lo mismo**, medido: se convierte
   cada una en un vector con lo que dice y se proyecta a dos dimensiones. No es
   una decoración con las cosas repartidas bonito — si dos puntos se tocan, es
   que se parecen.

   ── POR QUÉ NO HAY LIBRERÍA DE GRAFOS ─────────────────────────────────────
   Las posiciones vienen **ya calculadas** de la base, así que pintar esto es
   colocar divs en porcentajes y una transformación de CSS para el zoom. Meter
   una librería de fuerzas costaría cientos de kilobytes en el paquete para
   recolocar en cada visita unos puntos que ya están colocados — y encima
   saldrían en un sitio distinto cada vez.

   ── TRES NIVELES DE DETALLE, Y NINGUNO ESCONDE NADA ───────────────────────
   Lejos: los nombres de los grupos, grandes. Al pasar por encima: la pieza, con
   su nota y sus vecinas. Al entrar en un grupo: sus piezas con título. Es la
   misma información acercándose, no información que aparece y desaparece.
*/

/**
 * Un color por grupo. Fijos y en orden: si se calcularan del id, un grupo
 * cambiaría de color al recalcular la constelación y el mapa parecería otro.
 *
 * ── ELEGIDOS POR DISTANCIA DE TONO, NO POR BONITOS ─────────────────────────
 * La primera lista llevaba `emerald` y `teal`, y también `sky` y `blue`. Sobre
 * un punto de doce píxeles **son el mismo color**: la leyenda decía dos grupos
 * distintos y en el mapa no se distinguían. Un mapa cuyos grupos no se separan
 * a simple vista no es un mapa, es una decoración.
 *
 * Estos seis van repartidos por la rueda de color —verde, cian, amarillo,
 * violeta, magenta, rojo— sin dos vecinos. Si algún día hacen falta más de
 * seis grupos, el siguiente color no se añade al final: se replantea, porque a
 * partir de ahí el color deja de poder distinguirlos y hay que separar por
 * forma o por posición.
 */
const COLORES = [
  { punto: 'bg-emerald-500', suave: 'bg-emerald-500/[0.07]', anillo: 'border-emerald-300', texto: 'text-emerald-700' },
  { punto: 'bg-sky-500',     suave: 'bg-sky-500/[0.07]',     anillo: 'border-sky-300',     texto: 'text-sky-700' },
  { punto: 'bg-amber-400',   suave: 'bg-amber-400/[0.07]',   anillo: 'border-amber-300',   texto: 'text-amber-700' },
  { punto: 'bg-violet-500',  suave: 'bg-violet-500/[0.07]',  anillo: 'border-violet-300',  texto: 'text-violet-700' },
  { punto: 'bg-fuchsia-500', suave: 'bg-fuchsia-500/[0.07]', anillo: 'border-fuchsia-300', texto: 'text-fuchsia-700' },
  { punto: 'bg-red-500',     suave: 'bg-red-500/[0.07]',     anillo: 'border-red-300',     texto: 'text-red-700' },
];

function Constelacion({ piezas, clusters, vecinos, onCambiado }: {
  piezas: Pieza[]; clusters: Cluster[]; vecinos: Vecino[]; onCambiado?: () => void;
}) {
  const { user } = useAuth();
  const puedeCorregir = (user?.roleLevel ?? 0) >= ROLE.ADMIN;

  const [dentro, setDentro] = useState<string | null>(null);
  const [encima, setEncima] = useState<Pieza | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreNuevo, setNombreNuevo] = useState('');
  const [moviendo, setMoviendo] = useState(false);
  const arrastre = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const enElMapa = useMemo(
    () => piezas.filter(p => p.mapa_x != null && p.mapa_y != null),
    [piezas],
  );

  const colorDe = useMemo(() => {
    const m: Record<string, typeof COLORES[0]> = {};
    clusters.forEach((c, i) => { m[c.id] = COLORES[i % COLORES.length]; });
    return m;
  }, [clusters]);

  /*
   * ══ LA COLOCACIÓN: GRUPOS SEPARADOS, PIEZAS JUNTAS ═══════════════════════
   * Eugenio: «haz que los clusters estén visualmente más separados, quizá con
   * un círculo de ese color que los envuelva a todos, y no estén tan
   * dispersos».
   *
   * Tenía razón y el problema estaba en usar la proyección en crudo. PCA
   * reparte las 64 piezas por todo el cuadro **maximizando la varianza**, que
   * es justo lo contrario de agrupar: los grupos existen en las 768 dimensiones
   * pero al aplastarlos a dos se solapan, y el mapa se veía como una nube de
   * colores mezclados con unos nombres flotando encima.
   *
   * Aquí se separan en dos pasos, y ninguno inventa nada:
   *
   *   1. **Los centros se alejan** del centro del mapa multiplicando su
   *      distancia. Los grupos que la proyección puso cerca siguen cerca y los
   *      que puso lejos, lejos — se conserva quién es vecino de quién, sólo se
   *      estira el espacio entre ellos.
   *   2. **Las piezas se encogen hacia su centro.** Cada una mantiene su
   *      posición relativa dentro del grupo —dos que se parecen mucho siguen
   *      pegadas— pero el grupo entero ocupa un disco pequeño en vez de medio
   *      cuadro.
   *
   * El círculo que se dibuja es exactamente ese disco: no es un adorno alrededor
   * de las piezas, es **dónde caben todas las suyas**. Por eso se calcula del
   * radio máximo y no de un número escrito a mano.
   */
  const LEJOS = 1.55;   // cuánto se apartan los grupos entre sí
  const APRETADO = 0.42; // cuánto se juntan las piezas dentro del suyo

  const trazado = useMemo(() => {
    const centroMapa = { x: 50, y: 50 };
    const sitio: Record<string, { x: number; y: number }> = {};
    const discos: Array<{ id: string; x: number; y: number; r: number }> = [];

    for (const c of clusters) {
      const suyas = enElMapa.filter(p => p.cluster_id === c.id);
      if (!suyas.length) continue;

      // El centro real de sus piezas, no el guardado: si alguien ha movido una
      // pieza de grupo, el centro guardado ya no es el de lo que hay dentro.
      const cx = suyas.reduce((a, p) => a + (p.mapa_x as number), 0) / suyas.length;
      const cy = suyas.reduce((a, p) => a + (p.mapa_y as number), 0) / suyas.length;

      const nx = centroMapa.x + (cx - centroMapa.x) * LEJOS;
      const ny = centroMapa.y + (cy - centroMapa.y) * LEJOS;

      let r = 0;
      for (const p of suyas) {
        const x = nx + ((p.mapa_x as number) - cx) * APRETADO;
        const y = ny + ((p.mapa_y as number) - cy) * APRETADO;
        sitio[p.id] = { x, y };
        r = Math.max(r, Math.hypot(x - nx, y - ny));
      }
      // Un grupo de una sola pieza tendría radio cero y no se vería: mínimo 7.
      discos.push({ id: c.id, x: nx, y: ny, r: Math.max(6, r * 1.3) });
    }

    // ── QUE NO SE PISEN ───────────────────────────────────────────────────
    // Tres grupos caían montados unos sobre otros y sus nombres eran
    // ilegibles. Se separan empujándolos por su eje **sólo cuando se solapan**,
    // y moviendo también sus piezas con ellos.
    //
    // Esto SÍ falsea un poco la distancia, y conviene tenerlo claro: dos grupos
    // que estaban muy juntos acaban un poco más lejos de lo que dice la
    // medida. Se hace igual porque un círculo es una forma de dibujar un
    // conjunto, no una coordenada — y dos nombres superpuestos no informan de
    // nada. Lo que no se toca es el ORDEN: quien estaba a la izquierda sigue a
    // la izquierda, y las piezas de dentro conservan su sitio relativo.
    for (let vuelta = 0; vuelta < 60; vuelta++) {
      let quieto = true;
      for (let i = 0; i < discos.length; i++) {
        for (let j = i + 1; j < discos.length; j++) {
          const a = discos[i], b = discos[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.01;
          const falta = a.r + b.r + 2 - dist;
          if (falta <= 0) continue;
          quieto = false;
          const ux = dx / dist, uy = dy / dist, m = falta / 2;
          a.x -= ux * m; a.y -= uy * m;
          b.x += ux * m; b.y += uy * m;
          for (const p of enElMapa) {
            const s2 = sitio[p.id];
            if (!s2) continue;
            if (p.cluster_id === a.id) { s2.x -= ux * m; s2.y -= uy * m; }
            if (p.cluster_id === b.id) { s2.x += ux * m; s2.y += uy * m; }
          }
        }
      }
      if (quieto) break;
    }

    // ── Y AHORA TODO CABE ─────────────────────────────────────────────────
    // Separar los grupos los saca del cuadro: en la primera versión dos
    // círculos se salían por los lados y uno quedaba cortado por abajo. Se
    // mide lo que ocupa el conjunto **contando el radio de cada círculo**, no
    // sólo los centros —un centro dentro con un radio grande sigue saliéndose—
    // y se encoge todo hasta que entra con margen.
    if (discos.length) {
      const x0 = Math.min(...discos.map(d => d.x - d.r));
      const x1 = Math.max(...discos.map(d => d.x + d.r));
      const y0 = Math.min(...discos.map(d => d.y - d.r));
      const y1 = Math.max(...discos.map(d => d.y + d.r));
      const MARGEN = 4;
      const k = Math.min((100 - MARGEN * 2) / (x1 - x0 || 1), (100 - MARGEN * 2) / (y1 - y0 || 1));
      // Se centra lo que sobra, para que el mapa no quede pegado a una esquina.
      const dx = MARGEN + (100 - MARGEN * 2 - (x1 - x0) * k) / 2 - x0 * k;
      const dy = MARGEN + (100 - MARGEN * 2 - (y1 - y0) * k) / 2 - y0 * k;
      for (const d of discos) { d.x = d.x * k + dx; d.y = d.y * k + dy; d.r *= k; }
      for (const id of Object.keys(sitio)) {
        sitio[id] = { x: sitio[id].x * k + dx, y: sitio[id].y * k + dy };
      }
    }
    return { sitio, discos };
  }, [clusters, enElMapa]);

  const vecinasDe = useMemo(() => {
    const m: Record<string, Vecino[]> = {};
    for (const v of vecinos) (m[v.id] ||= []).push(v);
    return m;
  }, [vecinos]);

  const grupo = clusters.find(c => c.id === dentro) ?? null;

  // Escape cierra la ficha. Es lo que hace todo el mundo cuando algo se queda
  // abierto, y aquí lo hará más gente de lo normal: la versión anterior no se
  // dejaba cerrar y enseñó a desconfiar de esa ventana.
  useEffect(() => {
    if (!encima) return;
    const alPulsar = (e: KeyboardEvent) => { if (e.key === 'Escape') setEncima(null); };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [encima]);

  /* El zoom tiene dos mandos y no se estorban: los botones y la rueda cambian
     `zoom`; entrar en un grupo pone `zoom` y `pan` para encuadrarlo. Salirse
     del grupo devuelve la vista entera. */
  const encuadrar = (c: Cluster | null) => {
    const d = c ? trazado.discos.find(x => x.id === c.id) : null;
    if (!c || !d) { setDentro(null); setZoom(1); setPan({ x: 0, y: 0 }); return; }
    setDentro(c.id);
    const z = Math.min(3.2, 46 / d.r);
    setZoom(z);
    setPan({ x: 50 - d.x, y: 50 - d.y });
  };

  const cambiarZoom = (paso: number) => {
    setZoom(z => Math.min(4, Math.max(0.6, +(z + paso).toFixed(2))));
  };

  const guardarNombre = async (c: Cluster) => {
    const nombre = nombreNuevo.trim();
    setEditando(null);
    if (!nombre || nombre === c.nombre) return;
    await fetch(`/api/agregador/cluster/${encodeURIComponent(c.id)}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    }).catch(() => {});
    onCambiado?.();
  };

  const moverPieza = async (p: Pieza, clusterId: string) => {
    setMoviendo(true);
    await fetch(`/api/agregador/pieza/${encodeURIComponent(p.id)}/cluster`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cluster_id: clusterId }),
    }).catch(() => {});
    setMoviendo(false);
    setEncima(null);
    onCambiado?.();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-[12.5px] leading-relaxed text-slate-500">
          Cada punto es una publicación y <b className="font-bold text-slate-700">dos puntos están
          cerca porque hablan de lo mismo</b> — medido, no colocado a ojo. Pasa por encima de uno
          para verlo; entra en un grupo para acercarte.
          {puedeCorregir && <> Como administrador puedes <b className="font-bold text-slate-700">renombrar
          un grupo y mover una publicación</b> de uno a otro.</>}
        </p>
        {grupo && (
          <button
            onClick={() => { encuadrar(null); setEncima(null); }}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-slate-700"
          >
            <Minimize2 className="h-3.5 w-3.5" />
            Ver el mapa entero
          </button>
        )}
      </div>

      <div
        className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white sm:aspect-[16/10]"
        onWheel={e => { e.preventDefault(); cambiarZoom(e.deltaY > 0 ? -0.15 : 0.15); }}
        onPointerDown={e => {
          arrastre.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          const a = arrastre.current;
          if (!a) return;
          const caja = (e.currentTarget as HTMLElement).getBoundingClientRect();
          // El arrastre se mide en porcentaje del cuadro y dividido por el zoom:
          // acercado, el mismo gesto del dedo tiene que mover menos mapa o se
          // sale de la pantalla al primer tirón.
          setPan({
            x: a.px + ((e.clientX - a.x) / caja.width) * 100 / zoom,
            y: a.py + ((e.clientY - a.y) / caja.height) * 100 / zoom,
          });
        }}
        onPointerUp={() => { arrastre.current = null; }}
        onPointerCancel={() => { arrastre.current = null; }}
        // Pulsar el fondo cierra la ficha. Los puntos y los nombres paran el
        // clic con `stopPropagation`, así que sólo llega hasta aquí lo que de
        // verdad es «he pulsado fuera».
        onClick={() => setEncima(null)}
      >
        <div
          className="absolute inset-0 origin-center transition-transform duration-500 ease-out"
          style={{ transform: `scale(${zoom}) translate(${pan.x}%, ${pan.y}%)` }}
        >
          {/* EL CÍRCULO DE CADA GRUPO. Es el disco donde caben sus piezas, con
              el borde en su color: es lo que hace que un grupo se lea como un
              grupo y no como puntos del mismo color repartidos. */}
          {trazado.discos.map(d => (
            <span
              key={`disco-${d.id}`}
              aria-hidden
              className={cn('absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-opacity duration-500',
                colorDe[d.id]?.suave, colorDe[d.id]?.anillo,
                dentro && dentro !== d.id ? 'opacity-25' : 'opacity-100')}
              style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.r * 2}%`, height: `${d.r * 2}%` }}
            />
          ))}

          {encima && trazado.sitio[encima.id] && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              {(vecinasDe[encima.id] ?? []).map(v => {
                const a = trazado.sitio[encima.id];
                const b = trazado.sitio[v.vecino_id];
                if (!b) return null;
                return (
                  <line
                    key={v.vecino_id}
                    x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`}
                    className="stroke-slate-400" strokeWidth={1} strokeDasharray="3 3"
                  />
                );
              })}
            </svg>
          )}

          {enElMapa.map(p => {
            const s = trazado.sitio[p.id];
            if (!s) return null;
            const c = colorDe[p.cluster_id ?? ''] ?? COLORES[0];
            const apagado = !!dentro && p.cluster_id !== dentro;
            const d = 8 + Math.round((p.calidad / 100) * 12);
            return (
              /*
               * ── EL RATÓN ENCIMA NO ABRE NADA. SÓLO EL CLIC. ─────────────
               * Estaba en `onMouseEnter` y la ficha **no había forma de
               * cerrarla**: para llegar a su aspa el ratón cruzaba otros
               * puntos, y cada uno la volvía a abrir con otra publicación. El
               * aspa funcionaba; lo que fallaba es que algo la reabría medio
               * píxel después.
               *
               * Eugenio: «elimina esa funcionalidad, y que sólo cuando se haga
               * clic se abra esa ventana. Mientras se hace hover, que la pelota
               * se haga un poquito más grande y se ensanche el título, e invite
               * a hacer clic».
               *
               * Lo que queda al pasar por encima es **puro CSS**: ni un estado
               * de React, ni un `re-render` por cada punto que cruza el ratón.
               * Mover el ratón por el mapa vuelve a ser gratis.
               */
              <button
                key={p.id}
                onClick={e => { e.stopPropagation(); setEncima(p); }}
                title={p.titulo}
                aria-label={`Ver ${p.titulo}`}
                className={cn('group/punto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-500 hover:z-30 focus-visible:z-30',
                  apagado ? 'opacity-20' : 'opacity-95',
                  encima?.id === p.id && 'z-30')}
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <span
                  className={cn('block rounded-full ring-2 ring-white transition-transform duration-200 ease-out group-hover/punto:scale-[1.45] group-focus-visible/punto:scale-[1.45]',
                    c.punto, encima?.id === p.id && 'scale-[1.6] ring-slate-900',
                    // Una pieza colocada a mano lleva su marca: quien mire el
                    // mapa tiene derecho a saber qué puso una persona y qué una
                    // máquina.
                    p.a_mano && 'ring-slate-900')}
                  style={{ width: d, height: d }}
                />
                {/* EL TÍTULO, AL PASAR POR ENCIMA DE CUALQUIERA.
                    Antes sólo salía dentro de un grupo abierto, y con el ratón
                    ya no abriendo la ficha hacía falta que el mapa dijera qué
                    hay en cada punto **antes** de pulsarlo. Es lo que invita a
                    pulsar: si un punto no dice nada, nadie lo pulsa. */}
                <span
                    className={cn('pointer-events-none absolute left-1/2 top-full z-30 mt-1 block w-32 -translate-x-1/2 scale-95 rounded-md bg-white/95 px-1.5 py-0.5 text-center font-bold leading-tight text-slate-700 opacity-0 shadow-sm ring-1 ring-slate-200 transition-all duration-200 ease-out group-hover/punto:scale-100 group-hover/punto:opacity-100 group-focus-visible/punto:scale-100 group-focus-visible/punto:opacity-100',
                      encima?.id === p.id && 'scale-100 opacity-100')}
                    style={{ fontSize: `${Math.max(0.17, 0.58 / zoom)}rem` }}
                  >
                    {p.titulo.length > 46 ? p.titulo.slice(0, 46) + '…' : p.titulo}
                </span>
              </button>
            );
          })}

          {/* Los nombres, encima del círculo de su grupo. El tamaño se divide
              por el zoom para que al acercarse no crezcan hasta taparlo todo. */}
          {trazado.discos.map(d => {
            const c = clusters.find(x => x.id === d.id);
            if (!c) return null;
            return (
              <button
                key={`nom-${d.id}`}
                onClick={e => { e.stopPropagation(); encuadrar(dentro === d.id ? null : c); setEncima(null); }}
                className={cn('absolute z-10 max-w-[26%] -translate-x-1/2 rounded-xl px-2 py-0.5 text-center transition-opacity duration-500 hover:bg-white/80',
                  dentro && dentro !== d.id ? 'opacity-30' : 'opacity-100')}
                style={{
                  left: `${d.x}%`, top: `${d.y - d.r - 1}%`,
                  fontSize: `${Math.max(0.3, 0.85 / zoom)}rem`,
                }}
              >
                <span className={cn('block font-black leading-tight tracking-tight', colorDe[d.id]?.texto)}>
                  {c.nombre}
                </span>
                <span className="block text-[0.62em] font-bold text-slate-400">{c.cuantas}</span>
              </button>
            );
          })}
        </div>

        {/* ── LOS MANDOS DEL ZOOM ─────────────────────────────────────────
            Botones además de la rueda: en un portátil sin ratón la rueda es un
            gesto de dos dedos que la página se traga, y en un móvil no existe. */}
        <div className="absolute right-3 top-3 z-30 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <button onClick={() => cambiarZoom(0.3)} title="Acercar" aria-label="Acercar"
            className="grid h-8 w-8 place-items-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
            <Plus className="h-4 w-4" />
          </button>
          <span className="border-y border-slate-200 px-1 py-0.5 text-center text-[9px] font-black tabular-nums text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button onClick={() => cambiarZoom(-0.3)} title="Alejar" aria-label="Alejar"
            className="grid h-8 w-8 place-items-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
            <Minus className="h-4 w-4" />
          </button>
          <button onClick={() => { encuadrar(null); setEncima(null); }} title="Volver al mapa entero" aria-label="Volver al mapa entero"
            className="grid h-8 w-8 place-items-center border-t border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900">
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {encima && (
          <div className="absolute bottom-3 left-3 right-3 z-30 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur sm:right-auto sm:max-w-md">
            <button
              onClick={() => setEncima(null)} aria-label="Cerrar"
              className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-lg text-slate-300 hover:text-slate-600"
            >
              <Cerrar className="h-3.5 w-3.5" />
            </button>

            <p className="flex flex-wrap items-center gap-1.5 pr-6 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              <span className="text-slate-600">{NOMBRE_FORMATO[encima.formato] ?? encima.formato}</span>
              {encima.genero && (
                <>
                  <span className="text-slate-200">·</span>
                  <span className="rounded bg-slate-100 px-1 py-px normal-case tracking-normal text-slate-500">{encima.genero}</span>
                </>
              )}
              {encima.fuente && <><span className="text-slate-200">·</span><span>{encima.fuente}</span></>}
              {encima.a_mano && (
                <span className="rounded bg-slate-900 px-1 py-px normal-case tracking-normal text-white">colocada a mano</span>
              )}
            </p>

            <a href={encima.url} target="_blank" rel="noopener noreferrer"
              className="mt-1 block text-[14.5px] font-bold leading-snug text-slate-800 hover:text-emerald-700 hover:underline">
              {encima.titulo}
            </a>

            {encima.nota_ia && (
              <p className="mt-1.5 line-clamp-3 border-l-2 border-emerald-300 pl-2 text-[12px] leading-relaxed text-slate-500">
                {encima.nota_ia}
              </p>
            )}

            {/* MOVERLA DE GRUPO. Un desplegable y no arrastrar: arrastrar sobre
                un mapa que además se arrastra entero es un gesto encima de otro,
                y en un móvil no hay forma de distinguirlos. */}
            {puedeCorregir && (
              <div className="mt-2.5 flex items-center gap-2 border-t border-slate-100 pt-2">
                <Move className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <select
                  value={encima.cluster_id ?? ''}
                  disabled={moviendo}
                  onChange={e => moverPieza(encima, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11.5px] font-bold text-slate-700"
                >
                  {clusters.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            )}

            {(vecinasDe[encima.id] ?? []).length > 0 && (
              <div className="mt-2.5 border-t border-slate-100 pt-2">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Habla de lo mismo que</p>
                <ul className="mt-1 flex flex-col gap-1">
                  {(vecinasDe[encima.id] ?? []).map(v => (
                    <li key={v.vecino_id}>
                      <button
                        onClick={() => setEncima(enElMapa.find(p => p.id === v.vecino_id) ?? null)}
                        className="flex w-full items-baseline gap-2 text-left text-[11.5px] text-slate-600 hover:text-emerald-700"
                      >
                        <span className="min-w-0 flex-1 truncate">{v.titulo}</span>
                        <span className="shrink-0 tabular-nums text-slate-300">{Math.round(v.parecido * 100)}%</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {clusters.map(c => (
          <div
            key={`ley-${c.id}`}
            className={cn('flex items-center gap-2 rounded-xl border px-3 py-2 transition-all',
              dentro === c.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white')}
          >
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', colorDe[c.id]?.punto)} />

            {editando === c.id ? (
              <>
                <input
                  autoFocus
                  value={nombreNuevo}
                  onChange={e => setNombreNuevo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') guardarNombre(c); if (e.key === 'Escape') setEditando(null); }}
                  className="w-44 rounded border border-slate-300 px-1.5 py-0.5 text-[12.5px] font-bold text-slate-800"
                />
                <button onClick={() => guardarNombre(c)} aria-label="Guardar el nombre"
                  className="grid h-6 w-6 place-items-center rounded text-emerald-600 hover:bg-emerald-50">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { encuadrar(dentro === c.id ? null : c); setEncima(null); }}
                  className="text-[12.5px] font-bold">
                  {c.nombre}
                </button>
                <span className={cn('text-[11px] font-black tabular-nums', dentro === c.id ? 'text-white/60' : 'text-slate-300')}>
                  {c.cuantas}
                </span>
                {puedeCorregir && (
                  <button
                    onClick={() => { setEditando(c.id); setNombreNuevo(c.nombre); }}
                    title={`Cambiar el nombre de ${c.nombre}`} aria-label={`Cambiar el nombre de ${c.nombre}`}
                    className={cn('grid h-6 w-5 place-items-center rounded', dentro === c.id ? 'text-white/50 hover:text-white' : 'text-slate-300 hover:text-slate-700')}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {grupo?.frase && (
        <p className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[13px] leading-relaxed text-slate-600">
          <b className="font-bold text-slate-800">{grupo.nombre}.</b> {grupo.frase}
        </p>
      )}

      {/* LO QUE HAY DENTRO DEL GRUPO, EN LISTA.
          Trece títulos no caben alrededor de trece puntos, y ése era el fallo
          de la primera versión. El mapa enseña la forma; la lista enseña los
          nombres. Las dos cosas a la vez, no una escondiendo a la otra. */}
      {grupo && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {enElMapa
            .filter(p => p.cluster_id === grupo.id)
            .sort((a, b) => b.calidad - a.calidad)
            .map(p => (
              <button
                key={`lista-${p.id}`}
                onClick={() => setEncima(p)}
                className={cn('flex items-start gap-2 rounded-xl border p-2.5 text-left transition-colors',
                  encima?.id === p.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white hover:bg-slate-50')}
              >
                <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', colorDe[grupo.id]?.punto)} />
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold leading-snug text-slate-800">{p.titulo}</span>
                  <span className="mt-0.5 block text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    {p.genero ?? NOMBRE_FORMATO[p.formato]}
                    {p.fuente && <> · {p.fuente}</>}
                    {p.a_mano && <> · a mano</>}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}

      {clusters[0]?.modelo && (
        <p className="text-[11px] leading-relaxed text-slate-400">
          Grupos y posiciones calculados con {clusters[0].modelo}. La cercanía mide de qué habla
          cada pieza, no su calidad ni su fecha — y se equivoca: si dos que no pegan salen juntas,
          es que se parecen en las palabras y no en el fondo.
          {puedeCorregir && ' Por eso puedes corregirlo: lo que muevas queda marcado y no se pierde al recalcular.'}
        </p>
      )}
    </div>
  );
}

function Dato({ n, que, acento }: { n: number; que: string; acento?: boolean }) {
  return (
    <span className="flex items-baseline gap-1">
      <b className={cn('text-[15px] font-black tabular-nums', acento ? 'text-emerald-600' : 'text-slate-800')}>{n}</b>
      {que}
    </span>
  );
}

/**
 * UNA FICHA DE VÍDEO.
 *
 * ── LA MINIATURA NO SE PIDE HASTA QUE ESTA PESTAÑA SE ABRE ─────────────────
 * Y el vídeo no se carga hasta que se pulsa. Están las dos cosas a propósito:
 * `memory/` ya tiene anotado que la portada llamaba a `img.youtube.com` en cada
 * primera visita sin que nadie lo hubiera decidido. Aquí llamar a YouTube es
 * justo lo que la persona ha pedido — ha entrado en la pestaña de vídeos— y
 * hasta entonces no se llama.
 *
 * `youtube-nocookie.com`, como ya hace `WindowContent.tsx`.
 */
function FichaVideo({ pieza }: { pieza: Pieza }) {
  const [dentro, setDentro] = useState(false);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-md">
      <div className="relative aspect-video bg-slate-900">
        {dentro ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${pieza.origen_id}?autoplay=1`}
            title={pieza.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            onClick={() => setDentro(true)}
            aria-label={`Reproducir ${pieza.titulo}`}
            className="absolute inset-0 h-full w-full"
          >
            <img
              src={`https://i.ytimg.com/vi/${pieza.origen_id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <span className="absolute inset-0 grid place-items-center bg-slate-900/25 transition-colors group-hover:bg-slate-900/10">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 shadow-lg transition-transform group-hover:scale-110">
                <Play className="ml-0.5 h-5 w-5 fill-slate-900 text-slate-900" />
              </span>
            </span>
            <span className="absolute bottom-2 left-2 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-white">
              {pieza.calidad}
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
          <span className="text-slate-600">{pieza.fuente}</span>
          {pieza.publicado_el && (
            <>
              <span className="text-slate-200">·</span>
              <span className="normal-case tracking-normal tabular-nums">{String(pieza.publicado_el).slice(0, 10)}</span>
            </>
          )}
          {pieza.idioma === 'es' && (
            <span className="rounded bg-amber-100 px-1 py-px normal-case tracking-normal text-amber-700">castellano</span>
          )}
        </p>

        <a
          href={pieza.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14.5px] font-bold leading-snug text-slate-800 hover:text-emerald-700 hover:underline"
        >
          {pieza.titulo}
        </a>

        {pieza.nota_ia && (
          <p className="mt-auto flex gap-1.5 border-t border-slate-100 pt-2 text-[12px] leading-relaxed text-slate-500">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
            <span className="line-clamp-4">{pieza.nota_ia}</span>
          </p>
        )}
      </div>
    </article>
  );
}

/**
 * UNA FICHA DE IMAGEN.
 *
 * ── LA ATRIBUCIÓN SE PINTA SIEMPRE, NO AL PASAR EL RATÓN ───────────────────
 * Casi todas estas fotos son CC BY-SA, que **obliga** a nombrar al autor y a
 * decir la licencia. Esconder eso detrás de un `hover` no cumple —en un móvil
 * no hay ratón— y ponerlo en una página de créditos aparte tampoco: el
 * requisito es que acompañe a la obra. Ocupa un renglón de once píxeles y
 * resuelve el asunto entero.
 *
 * Y el enlace lleva a la página de Commons, no al fichero: ahí es donde están
 * la licencia completa y el historial, que es lo que hay que poder comprobar.
 */
function FichaImagen({ pieza }: { pieza: Pieza }) {
  return (
    <figure className="break-inside-avoid overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <a href={pieza.url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={pieza.medio_url ?? ''}
          alt={pieza.titulo}
          loading="lazy"
          className="w-full bg-slate-100 transition-opacity hover:opacity-90"
        />
      </a>
      <figcaption className="flex flex-col gap-2 p-3.5">
        <p className="text-[14px] font-bold leading-snug text-slate-800">{pieza.titulo}</p>
        {pieza.nota_ia && (
          <p className="flex gap-1.5 text-[12px] leading-relaxed text-slate-500">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
            <span>{pieza.nota_ia}</span>
          </p>
        )}
        <p className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-[10.5px] text-slate-400">
          <a href={pieza.url} target="_blank" rel="noopener noreferrer" className="font-bold hover:text-slate-600 hover:underline">
            Wikimedia Commons
          </a>
          {pieza.autor && <><span className="text-slate-200">·</span><span className="truncate">{pieza.autor}</span></>}
          {pieza.licencia && (
            <>
              <span className="text-slate-200">·</span>
              <span className="rounded bg-slate-100 px-1 py-px font-bold text-slate-500">{pieza.licencia}</span>
            </>
          )}
        </p>
      </figcaption>
    </figure>
  );
}

/**
 * LOS INDICADORES DEL OBJETIVO.
 *
 * ── AQUÍ NO HAY NÚMEROS, Y ESO ES LO QUE HAY QUE ENSEÑAR ───────────────────
 * Los siete de MOVILIDAD están **definidos y sin medir**: `value` viene `null`.
 * La tentación es esconder la pestaña o pintar un cero, y las dos mienten: un
 * cero es una medición y un hueco no lo es.
 *
 * El `CLAUDE.md` de la raíz lo dice como principio del producto: todo tiene que
 * poder decir «no lo sé» de una forma que se distinga de un resultado válido.
 * Esta pestaña es exactamente eso — enseña los siete, dice que están sin medir,
 * y así se ve que existe el hueco. Escondido, nadie lo llenaría nunca.
 */
function Indicadores({ lista, objetivo, objetivoId }: {
  lista: Indicador[] | null; objetivo: string; objetivoId: string;
}) {
  if (lista === null) {
    return <div className="flex justify-center py-10 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!lista.length) {
    return <p className="py-10 text-center text-sm text-slate-400">No hay indicadores definidos para {objetivo}.</p>;
  }

  const medidos = lista.filter(i => i.value !== null && i.value !== undefined);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[12.5px] leading-relaxed text-slate-500">
        Estos indicadores son de <Link to={`/objetivos/${objetivoId}`} className="font-bold text-slate-700 hover:underline">{objetivo}</Link> entero,
        no de este subtema: hoy no existe ninguna tabla que una un indicador con un subtema, y decir que
        son de aquí sería afirmar una relación que nadie ha hecho.
      </p>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(i => {
          const hay = i.value !== null && i.value !== undefined;
          return (
            <div
              key={i.id}
              className={cn('flex items-center justify-between gap-3 rounded-2xl border p-4',
                hay ? 'border-slate-200 bg-white' : 'border-dashed border-slate-200 bg-slate-50/60')}
            >
              <span className="text-[14px] font-bold text-slate-700">{i.name}</span>
              {hay ? (
                <span className="text-xl font-black tabular-nums text-slate-900">
                  {i.value}
                  <span className="ml-0.5 text-[12px] font-bold text-slate-400">{i.unit}</span>
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <CircleDashed className="h-3.5 w-3.5" />
                  sin medir
                </span>
              )}
            </div>
          );
        })}
      </div>

      {medidos.length === 0 && (
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3.5 text-[12.5px] leading-relaxed text-amber-800">
          <b className="font-bold">Los {lista.length} están definidos y ninguno medido.</b> Se enseñan igual, y en
          vez de un cero: un cero sería una medición, y esto es un hueco. Enseñarlo es la forma de que
          alguien pueda llenarlo.
        </p>
      )}
    </div>
  );
}

function BotonFormato({ activo, onClick, icono: Icono, children }: {
  activo: boolean; onClick: () => void; icono?: any; children: any;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-colors',
        activo ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {Icono && <Icono className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function FichaDeDentro({ cosa, mia }: { cosa: Cosa; mia?: boolean }) {
  const Icono = ICONO_TIPO[cosa.tipo] ?? FileText;
  return (
    <Link
      to={cosa.ruta}
      className={cn(
        'flex gap-2.5 rounded-xl border p-3 transition-colors',
        mia ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50'
            : 'border-slate-200 bg-white hover:bg-slate-50',
      )}
    >
      <Icono className={cn('mt-0.5 h-4 w-4 shrink-0', mia ? 'text-emerald-600' : 'text-slate-400')} />
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-bold text-slate-800">{cosa.titulo}</p>
        {cosa.extracto && (
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-slate-500">{cosa.extracto}</p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
          <span>{cosa.tipo}</span>
          {cosa.autor && !mia && <><span className="text-slate-200">·</span><span>{cosa.autor}</span></>}
          {cosa.fecha && (
            <>
              <span className="text-slate-200">·</span>
              <span className="normal-case tracking-normal">
                {new Date(cosa.fecha).toLocaleDateString('es-ES')}
              </span>
            </>
          )}
          {cosa.por_busqueda && (
            <span className="rounded border border-dashed border-slate-300 px-1 py-px normal-case tracking-normal text-slate-400">
              encontrado
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

function FichaDeFuera({ pieza }: { pieza: Pieza }) {
  const Icono = ICONO_FORMATO[pieza.formato] ?? FileText;
  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <div className="w-8 shrink-0 pt-0.5 text-right sm:w-10">
        <span className="text-[12px] font-black tabular-nums text-slate-300">{pieza.calidad}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1 text-slate-500">
            <Icono className="h-3 w-3" />
            {NOMBRE_FORMATO[pieza.formato] ?? pieza.formato}
          </span>
          {pieza.genero && (
            <>
              <span className="text-slate-200">·</span>
              <span className="rounded bg-slate-100 px-1 py-px normal-case tracking-normal text-slate-500">
                {pieza.genero}
              </span>
            </>
          )}
          {pieza.fuente && <><span className="text-slate-200">·</span><span>{pieza.fuente}</span></>}
          {pieza.publicado_el && (
            <>
              <span className="text-slate-200">·</span>
              <span className="normal-case tracking-normal tabular-nums">
                {String(pieza.publicado_el).slice(0, 10)}
              </span>
            </>
          )}
          {pieza.idioma === 'es' && (
            <span className="rounded bg-amber-100 px-1 py-px normal-case tracking-normal text-amber-700">
              en castellano
            </span>
          )}
          {pieza.estado === 'bloquea_robots' && (
            <span
              title="Esta fuente rechaza a los programas automáticos y abre con normalidad en un navegador."
              className="flex items-center gap-1 rounded border border-dashed border-slate-300 px-1 py-px normal-case tracking-normal text-slate-400"
            >
              <ShieldAlert className="h-3 w-3" />
              bloquea robots
            </span>
          )}
        </p>

        <a
          href={pieza.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-start gap-1.5 text-[15px] font-bold leading-snug text-slate-800 hover:text-emerald-700 hover:underline"
        >
          <span className="min-w-0">{pieza.titulo}</span>
          <ExternalLink className="mt-1 h-3 w-3 shrink-0 text-slate-300" />
        </a>

        {pieza.nota_ia && (
          <p className="mt-1.5 flex gap-2 border-l-2 border-emerald-300 pl-2.5 text-[12.5px] leading-relaxed text-slate-500">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
            <span>{pieza.nota_ia}</span>
          </p>
        )}
      </div>
    </li>
  );
}
