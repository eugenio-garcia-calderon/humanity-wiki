import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Loader2, ChevronRight, PlayCircle, FileText, BarChart3, Map as MapIcon,
  Image as ImageIcon, ExternalLink, Sparkles, FolderKanban, LayoutGrid,
  Search, ShieldAlert, Gauge, Play, User as UserIcon, CircleDashed,
} from 'lucide-react';
import { cn } from '../utils/cn';
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
};

type Cosa = {
  tipo: string; id: string; titulo: string; extracto: string; autor?: string | null;
  fecha: string | null; ruta: string; por_busqueda: boolean;
};

type Respuesta = {
  tema: { id: string; objetivo_id: string; padre_id: string | null; nombre: string; objetivo_nombre?: string };
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

type Pestanya = 'explorar' | 'videos' | 'imagenes' | 'arte' | 'indicadores' | 'tuyo';

export default function Tema() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [indicadores, setIndicadores] = useState<Indicador[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formato, setFormato] = useState<string>('todo');

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
  }, [id]);

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
    if (datos.hijos.length) l.push({ id: 'explorar', nombre: 'Explorar', icono: LayoutGrid, cuantos: datos.hijos.length });
    if (videos.length) l.push({ id: 'videos', nombre: 'Vídeos', icono: PlayCircle, cuantos: videos.length });
    if (imagenes.length) l.push({ id: 'imagenes', nombre: 'Imágenes', icono: ImageIcon, cuantos: imagenes.length });
    if (datos.fuera.length) l.push({ id: 'arte', nombre: 'Estado del arte', icono: Sparkles, cuantos: datos.fuera.length });
    if (datos.tuyo.length || datos.humanidad.length) {
      l.push({ id: 'tuyo', nombre: 'En la plataforma', icono: UserIcon, cuantos: datos.tuyo.length + datos.humanidad.length });
    }
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
  const piezas = (datos.fuera ?? []).filter(p => formato === 'todo' || p.formato === formato);

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
                Ordenado por calidad, no por visitas
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
