import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Loader2, ChevronRight, PlayCircle, FileText, BarChart3, Map as MapIcon,
  Image as ImageIcon, ExternalLink, Sparkles, FolderKanban, LayoutGrid,
  Search, ShieldAlert,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { OBJETIVOS } from '../utils/objetivos';

// ============================================================================
// LA PÁGINA DE UN TEMA — `/temas/:id` (2026-08-25)
// ============================================================================
// Eugenio: «cuando alguien busque eso o pinche en ese subtema a través del menú
// tú le tienes que presentar el estado del arte de este tema con el contenido
// más potente, relevante y de calidad posible», y «también tienes que tener en
// cuenta si el usuario tiene alguna publicación, proyecto, mapa o página […]
// que le tengas que refrescar y mostrar como contenido propio».
//
// Tres carriles, en este orden: LO TUYO, LA HUMANIDAD, DE FUERA. El porqué del
// orden está escrito en `src/server/agregador.ts`, que es quien los arma.
//
// ── LO ENCONTRADO SE DISTINGUE DE LO CLASIFICADO ───────────────────────────
// Casi nada está clasificado todavía, así que buena parte de lo de dentro llega
// por búsqueda de palabras. Eso se dice en la pantalla, con su marca, y no se
// disimula: `utils/objetivos.ts` ya tomó esta decisión para el filtro por
// objetivo —«las palabras son para buscar, no para clasificar»— y una pantalla
// que llamara categoría a una búsqueda estaría afirmando una clasificación que
// nadie ha hecho.

type Pieza = {
  id: string; origen: string; formato: string; url: string; origen_id: string | null;
  titulo: string; fuente: string | null; idioma: string | null;
  publicado_el: string | null; nota_ia: string | null; calidad: number; estado: string;
};

type Cosa = {
  tipo: string; id: string; titulo: string; extracto: string; autor?: string | null;
  fecha: string | null; ruta: string; por_busqueda: boolean;
};

type Respuesta = {
  tema: { id: string; objetivo_id: string; padre_id: string | null; nombre: string };
  camino: Array<{ id: string; nombre: string }>;
  hijos: Array<{ id: string; nombre: string; cosas: number }>;
  palabras: string[];
  tuyo: Cosa[];
  humanidad: Cosa[];
  fuera: Pieza[];
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

export default function Tema() {
  const { id = '' } = useParams();
  const [datos, setDatos] = useState<Respuesta | null>(null);
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

  const objetivo = useMemo(
    () => OBJETIVOS.find(o => o.id === datos?.tema.objetivo_id),
    [datos?.tema.objetivo_id],
  );

  /** Cuántas piezas hay de cada forma, para el filtro de arriba. */
  const cuentas = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of datos?.fuera ?? []) m[p.formato] = (m[p.formato] ?? 0) + 1;
    return m;
  }, [datos?.fuera]);

  const piezas = useMemo(
    () => (datos?.fuera ?? []).filter(p => formato === 'todo' || p.formato === formato),
    [datos?.fuera, formato],
  );

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
          Ver los catorce temas
        </Link>
      </div>
    );
  }

  const Icono = objetivo?.icono;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">

      {/* ── MIGAS DE PAN ─────────────────────────────────────────────────
          El camino entero, porque el árbol no tiene límite de profundidad y
          desde «GBFS» nadie adivina que está dentro de Movilidad. */}
      <nav className="flex flex-wrap items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <Link to={`/objetivos/${datos.tema.objetivo_id}`} className="hover:text-slate-700">
          {objetivo?.titulo ?? datos.tema.objetivo_id}
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

      <header className="mt-3 flex items-start gap-3">
        {Icono && <Icono className={cn('mt-1 h-8 w-8 shrink-0', objetivo?.color)} />}
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {datos.tema.nombre}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {datos.fuera.length} publicaciones recogidas de fuera
            {datos.hijos.length > 0 && ` · ${datos.hijos.length} subtemas dentro`}
          </p>
        </div>
      </header>

      {/* ── LAS RAMAS DE DENTRO ──────────────────────────────────────────── */}
      {datos.hijos.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {datos.hijos.map(h => (
            <Link
              key={h.id}
              to={`/temas/${h.id}`}
              className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              {h.nombre}
              <span className="text-[11px] font-black text-slate-300 group-hover:text-slate-400">
                {h.cosas}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* ══ CARRIL 1 — LO TUYO ═══════════════════════════════════════════ */}
      {datos.tuyo.length > 0 && (
        <Carril
          titulo="Lo tuyo en este tema"
          apunte="Tus publicaciones, proyectos y ventanas. Sale lo primero para que veas si sigue al día."
          acento="emerald"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {datos.tuyo.map(c => <FichaDeDentro key={`${c.tipo}-${c.id}`} cosa={c} mia />)}
          </div>
        </Carril>
      )}

      {/* ══ CARRIL 2 — LA HUMANIDAD ══════════════════════════════════════ */}
      {datos.humanidad.length > 0 && (
        <Carril
          titulo="Lo que ha puesto la Humanidad"
          apunte="Publicaciones, proyectos y ventanas del resto de la plataforma sobre este mismo tema."
          acento="slate"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {datos.humanidad.map(c => <FichaDeDentro key={`${c.tipo}-${c.id}`} cosa={c} />)}
          </div>
        </Carril>
      )}

      {/* ══ CARRIL 3 — DE FUERA ══════════════════════════════════════════ */}
      <Carril
        titulo="El estado del arte, de fuera"
        apunte="Ordenado por calidad, no por visitas. La nota de la IA dice por qué cada pieza está aquí."
        acento="slate"
      >
        {/* Filtro por forma: las cinco que pidió Eugenio, y sólo las que hay. */}
        <div className="mb-4 flex flex-wrap gap-1.5">
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
        </div>

        <ol className="divide-y divide-slate-100">
          {piezas.map(p => <FichaDeFuera key={p.id} pieza={p} />)}
        </ol>

        {piezas.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            Nada de esa forma en este tema todavía.
          </p>
        )}
      </Carril>

      {/* ── DE DÓNDE SALE LO DE DENTRO ───────────────────────────────────
          Se dice al pie y no en una alerta: es una explicación del método, no
          un aviso de que algo va mal. */}
      {datos.palabras.length > 0 && (
        <p className="mt-10 flex items-start gap-2 border-t border-slate-100 pt-4 text-[12px] leading-relaxed text-slate-400">
          <Search className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Lo de dentro marcado como <b className="font-bold text-slate-500">encontrado</b> no está
            clasificado en este tema: sale de buscar {datos.palabras.map(p => `«${p}»`).join(', ')} en
            títulos y textos. Lo demás sí está clasificado.
          </span>
        </p>
      )}
    </div>
  );
}

function Carril({ titulo, apunte, acento, children }: {
  titulo: string; apunte: string; acento: 'emerald' | 'slate'; children: any;
}) {
  return (
    <section className="mt-10">
      <div className={cn('border-l-4 pl-3', acento === 'emerald' ? 'border-emerald-500' : 'border-slate-800')}>
        <h2 className="text-lg font-black tracking-tight text-slate-900">{titulo}</h2>
        <p className="mt-0.5 text-[12.5px] text-slate-500">{apunte}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
          {/* Un 403 no es un enlace roto: es una puerta que no abre a los
              robots. Se dice, para que nadie lo tome por caído. */}
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
