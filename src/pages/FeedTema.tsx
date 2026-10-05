import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Search, Lock, Globe, Tag, FileText, Database, Megaphone, Folder, Network, Map as MapIcon,
  Users2, ExternalLink, Loader2, Plus, Compass, ChevronRight, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OBJETIVOS, hexDelColor } from '../utils/objetivos';
import { cn } from '../utils/cn';

// ============================================================================
// LA PÁGINA DE UN TEMA: TODO LO TUYO, O TODO LO PÚBLICO (2026-10-05)
// ============================================================================
// Eugenio: «cuando pinches en una de esas temáticas, que puedas ver todo tu
// contenido que habla sobre movilidad, ordenado en bases de datos, en
// páginas… una landing page de todo lo que tienes sobre movilidad, y todas las
// personas. Y un botón de contenido universal».
//
// Everything comes from `/api/feed-tema/:id` (`src/server/feedTema.ts`), by
// sections. This page only draws, keeps the three filters in the URL (so a
// link to «mi contenido de agua buscando riego» is a link), and asks for more
// of one section when you press «Ver más». The scope switch lives both here
// and in the right-hand theme menu; the URL is the single truth.

type Item = {
  tipo: string; id: string; titulo: string; extracto: string | null; ruta: string; fecha: string | null;
  imagen?: string | null; clasificado: boolean; publico?: boolean; extra?: string | null;
  autor?: { id: string; nombre: string; avatar: string | null } | null;
};
type Seccion = { clave: string; titulo: string; total: number; items: Item[] };
type Respuesta = {
  tema: { id: string; titulo: string }; ambito: 'mio' | 'todos'; q: string; subtema: string | null;
  subtemas: Array<{ id: string; nombre: string; cosas: number }>; porSeccion: number; secciones: Seccion[]; total: number;
};

const ICONO_SECCION: Record<string, any> = {
  paginas: FileText, basedatos: Database, publicaciones: Megaphone, carpetas: Folder,
  lienzos: Network, personas: Users2, fuera: ExternalLink,
};
const ICONO_TIPO: Record<string, any> = { pagina: FileText, fila: Database, publicacion: Megaphone, carpeta: Folder, esquema: Network, mapa: MapIcon, persona: Users2, usuario: Users2 };
const NOMBRE_TIPO: Record<string, string> = {
  pagina: 'Página', fila: 'Entrada', publicacion: 'Publicación', carpeta: 'Carpeta', esquema: 'Esquema', mapa: 'Mapa',
  persona: 'Persona', usuario: 'Persona', 'fuera:video': 'Vídeo', 'fuera:imagen': 'Imagen', 'fuera:texto': 'Artículo', 'fuera:grafica': 'Gráfica', 'fuera:mapa': 'Mapa',
};
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const titular = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();
const fechaCorta = (f: string | null) => (f ? new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export default function FeedTema() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const tema = OBJETIVOS.find(o => o.id === id);

  // The URL is the state. `mio` needs a session: without one, it falls to
  // `todos` and says why, instead of showing a login wall over an empty page.
  const ambito: 'mio' | 'todos' = params.get('ambito') === 'mio' && user ? 'mio' : 'todos';
  const q = (params.get('q') || '').slice(0, 80);
  const qCorta = q.length > 40 ? `${q.slice(0, 40)}…` : q;
  const subtema = params.get('subtema') || '';
  const cambiar = (c: Record<string, string | null>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(c)) { if (v) n.set(k, v); else n.delete(k); }
    setParams(n, { replace: true });
  };

  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [masDe, setMasDe] = useState<string | null>(null);
  const [borrador, setBorrador] = useState(q);
  useEffect(() => { setBorrador(q); }, [q]);
  // Searching as you type (2026-10-05): the reviewer thought the box was
  // broken because nothing happened until Enter. Half a second of quiet
  // after the last key, and it searches; Enter still works for the impatient.
  useEffect(() => {
    if (borrador.trim() === q) return;
    const t = window.setTimeout(() => cambiar({ q: borrador.trim() || null }), 450);
    return () => window.clearTimeout(t);
  }, [borrador]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new theme starts from a blank page: the previous theme's chips showed
  // for a moment under the new title.
  useEffect(() => { setDatos(null); }, [id]);

  const url = useMemo(() => {
    const u = new URLSearchParams({ ambito });
    if (q) u.set('q', q);
    if (subtema) u.set('subtema', subtema);
    return `/api/feed-tema/${encodeURIComponent(id)}?${u}`;
  }, [id, ambito, q, subtema]);

  useEffect(() => {
    let vivo = true;
    setCargando(true); setFallo(null);
    fetch(url, { credentials: 'include' })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'No se ha podido cargar.'); return j; })
      .then(j => { if (vivo) setDatos(j); })
      .catch(e => { if (vivo) setFallo(e.message); })
      .finally(() => { if (vivo) setCargando(false); });
    return () => { vivo = false; };
  }, [url]);

  // Remember the scope for the right-hand menu, which reads the same key.
  useEffect(() => {
    try { localStorage.setItem('humanity:temas-ambito', ambito); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new CustomEvent('humanity:temas-ambito', { detail: ambito }));
  }, [ambito]);

  const verMas = async (s: Seccion) => {
    setMasDe(s.clave);
    try {
      const r = await fetch(`${url}&seccion=${s.clave}&offset=${s.items.length}`, { credentials: 'include' });
      const j: Respuesta = await r.json();
      const nueva = j.secciones.find(x => x.clave === s.clave);
      if (nueva) setDatos(d => d && ({ ...d, secciones: d.secciones.map(x => (x.clave === s.clave ? { ...x, total: Math.max(x.total, nueva.total), items: [...x.items, ...nueva.items] } : x)) }));
    } finally { setMasDe(null); }
  };

  const nuevaPagina = async () => {
    const r = await fetch('/api/documentos', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: `Sobre ${titular(tema?.titulo || 'el tema').toLowerCase()}` }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.id) navigate(`/paginas/${j.id}`);
  };

  if (!tema) {
    return <div className="p-8 text-center text-sm text-slate-500">Ese tema no existe. <Link to="/explorar" className="font-black text-emerald-700">Explorar</Link></div>;
  }
  const color = hexDelColor(tema.color);
  const Icono = tema.icono;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-36 pt-4 sm:px-6">
      {/* ── CABECERA: el tema, el ámbito y la búsqueda ─────────────────── */}
      <header className="rounded-3xl p-5 sm:p-7" style={{ background: `linear-gradient(135deg, ${color}1a, ${color}05)` }}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white shadow-sm" style={{ color }}>
            <Icono className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Tema</p>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{titular(tema.titulo)}</h1>
            <p className="text-sm text-slate-500" aria-live="polite">
              {cargando ? `Buscando${q ? ` «${qCorta}»` : ''}…` : datos ? (
                q ? `${plural(datos.total, 'resultado', 'resultados')} para «${qCorta}» en ${ambito === 'mio' ? 'lo tuyo' : 'todo lo público'}${subtema ? ', dentro del subtema' : ''}`
                  : ambito === 'mio'
                    ? `${plural(datos.total, 'cosa tuya', 'cosas tuyas')} sobre este tema${subtema ? ', en este subtema' : ''}`
                    : `${plural(datos.total, 'cosa pública', 'cosas públicas')} en humanity.wiki sobre este tema${subtema ? ', en este subtema' : ''}`
              ) : ''}
            </p>
          </div>
          <Link to={`/temas/${id}`} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50">
            <Compass className="h-4 w-4" /> Explorar el tema
          </Link>
        </div>

        {/* EL FILTRO: mío / todos. Dos pestañas, no un desplegable: son las
            dos únicas respuestas y se cambia entre ellas veinte veces. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Qué contenido ver" className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
            {([['mio', 'Mi contenido', Lock], ['todos', 'Todo el contenido', Globe]] as const).map(([k, etiqueta, I]) => (
              <button key={k} role="tab" aria-selected={ambito === k}
                onClick={() => { if (k === 'mio' && !user) { navigate('/login'); return; } cambiar({ ambito: k }); }}
                className={cn('inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-black transition-colors',
                  ambito === k ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                <I className="h-3.5 w-3.5" /> {etiqueta}
              </button>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); cambiar({ q: borrador.trim() || null }); }} role="search"
            className="flex h-11 min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-shadow focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-200">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input type="search" value={borrador} onChange={e => setBorrador(e.target.value.slice(0, 80))} maxLength={80}
              aria-label={`Buscar dentro de ${titular(tema.titulo).toLowerCase()}`}
              placeholder={`Buscar dentro de ${titular(tema.titulo).toLowerCase()}… (filtra al escribir)`}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-slate-500 sm:text-sm [&::-webkit-search-cancel-button]:hidden" />
            {q && <button type="button" onClick={() => { setBorrador(''); cambiar({ q: null }); }} aria-label="Quitar la búsqueda" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
          </form>
        </div>

        {/* LOS SUBTEMAS, COMO FICHAS. Pulsar una estrecha el feed a esa rama;
            volver a pulsarla lo abre otra vez. */}
        {!!datos?.subtemas.length && (
          <div className="relative mt-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {datos.subtemas.map(s => (
              <button key={s.id} onClick={() => cambiar({ subtema: subtema === s.id ? null : s.id })} aria-pressed={subtema === s.id}
                className={cn('inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[11px] font-bold transition-colors',
                  subtema === s.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400')}>
                {s.nombre}{s.cosas > 0 && <span className={cn('ml-0.5 text-[10px]', subtema === s.id ? 'text-slate-300' : 'text-slate-400')}>{s.cosas}</span>}
              </button>
            ))}
          </div>
          {/* On phones the row scrolls: a fade says there is more to the right. */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white/90 to-transparent sm:hidden" />
          </div>
        )}
      </header>

      {fallo && <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{fallo}</p>}

      {cargando && !datos && <div className="flex justify-center py-20 text-slate-300"><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {/* ── VACÍO, Y QUÉ HACER ──────────────────────────────────────────── */}
      {datos && !cargando && datos.secciones.length === 0 && (
        <div className="mt-8 rounded-3xl border-2 border-dashed border-slate-200 px-6 py-14 text-center">
          <Icono className="mx-auto mb-3 h-9 w-9" style={{ color }} />
          {ambito === 'mio' ? (
            <>
              <p className="text-base font-black text-slate-800">Todavía no tienes nada sobre {titular(tema.titulo).toLowerCase()}{q ? ` que hable de «${qCorta}»` : ''}.</p>
              <p className="mt-1 text-sm text-slate-500">{q ? 'Prueba con otra palabra, o quita la búsqueda.' : 'Lo que escribas aquí con estas palabras aparecerá solo. O mira lo que ya hay publicado.'}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {q && <button onClick={() => { setBorrador(''); cambiar({ q: null }); }} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-black text-white hover:bg-slate-800"><X className="h-4 w-4" /> Borrar búsqueda</button>}
                {!q && <button onClick={nuevaPagina} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Nueva página sobre esto</button>}
                <button onClick={() => cambiar({ ambito: 'todos' })} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><Globe className="h-4 w-4" /> Ver todo el contenido</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-base font-black text-slate-800">{q ? `Nada público sobre ${titular(tema.titulo).toLowerCase()} habla de «${qCorta}».` : `Nadie ha publicado todavía sobre ${titular(tema.titulo).toLowerCase()}.`}</p>
              {q && <button onClick={() => { setBorrador(''); cambiar({ q: null }); }} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-black text-white hover:bg-slate-800"><X className="h-4 w-4" /> Borrar búsqueda</button>}
              {user && !q && <button onClick={nuevaPagina} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white hover:bg-emerald-700"><Plus className="h-4 w-4" /> Sé la primera persona</button>}
            </>
          )}
        </div>
      )}

      {/* ── LAS SECCIONES ───────────────────────────────────────────────── */}
      {datos && datos.secciones.map(s => {
        const I = ICONO_SECCION[s.clave] || FileText;
        return (
          <section key={s.clave} className={cn('mt-8', cargando && 'opacity-60')} aria-labelledby={`sec-${s.clave}`}>
            <div className="mb-3 flex items-center gap-2">
              <I className="h-4 w-4 text-slate-400" />
              <h2 id={`sec-${s.clave}`} className="text-[13px] font-black uppercase tracking-[0.14em] text-slate-500">{s.titulo}</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{s.total}</span>
            </div>
            <div className={cn('grid gap-3', s.clave === 'personas' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3')}>
              {s.items.map(it => <Tarjeta key={`${it.tipo}-${it.id}`} it={it} ambito={ambito} color={color} />)}
            </div>
            {s.items.length < s.total && (
              <button onClick={() => { if (masDe !== s.clave) verMas(s); }} aria-busy={masDe === s.clave}
                className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 aria-busy:opacity-60">
                {masDe === s.clave ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Ver {Math.min(datos.porSeccion * 2, s.total - s.items.length)} más · {s.items.length} de {s.total}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

/** Una tarjeta. Dice de dónde sale (clasificado o por palabras) y, en lo tuyo,
 *  si es privado — las dos cosas que alguien querría saber antes de abrirla. */
function Tarjeta({ it, ambito, color }: { it: Item; ambito: 'mio' | 'todos'; color: string }) {
  const externo = it.tipo.startsWith('fuera:');
  const persona = it.tipo === 'persona' || it.tipo === 'usuario';
  const I = ICONO_TIPO[it.tipo] || ExternalLink;
  const ref = useRef<HTMLAnchorElement>(null);

  const cuerpo = persona ? (
    <div className="flex flex-col items-center gap-2 p-4 text-center">
      {it.imagen
        ? <img src={it.imagen} alt="" loading="lazy" className="h-16 w-16 rounded-full object-cover" />
        : <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-xl font-black text-slate-400">{it.titulo.charAt(0).toUpperCase()}</span>}
      <span className="line-clamp-1 text-sm font-black text-slate-800">{it.titulo}</span>
      {it.extracto && <span className="line-clamp-2 text-[11px] text-slate-500">{it.extracto}</span>}
    </div>
  ) : (
    <>
      {it.imagen && (
        <div className="h-36 w-full overflow-hidden bg-slate-100">
          <img src={it.imagen} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          <I className="h-3 w-3" /> {externo ? (it.extra || NOMBRE_TIPO[it.tipo] || 'Fuera') : it.extra || NOMBRE_TIPO[it.tipo] || it.tipo}
          {ambito === 'mio' && it.publico === false && <Lock className="ml-auto h-3 w-3 text-amber-600" aria-label="Privado" />}
        </div>
        <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-slate-900">{it.titulo}</h3>
        {it.extracto && <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-slate-500">{it.extracto}</p>}
        <div className="mt-auto flex items-center gap-2 pt-3 text-[11px] text-slate-500">
          {it.autor && ambito === 'todos' && (
            <span className="flex min-w-0 items-center gap-1.5">
              {it.autor.avatar ? <img src={it.autor.avatar} alt="" className="h-5 w-5 rounded-full object-cover" /> : <span className="h-5 w-5 rounded-full bg-slate-200" />}
              <span className="truncate">{it.autor.nombre}</span>
            </span>
          )}
          {it.fecha && <span className="shrink-0">{fechaCorta(it.fecha)}</span>}
          <span className={cn('ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold', it.clasificado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}
            title={it.clasificado ? 'Alguien lo colgó de este tema' : 'Coincide por las palabras que usa'}>
            <Tag className="h-3 w-3" /> {it.clasificado ? 'Del tema' : 'Por palabras'}
          </span>
        </div>
      </div>
    </>
  );

  const clase = 'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg';
  const borde = { borderTopColor: color, borderTopWidth: 3 } as const;
  return externo
    ? <a ref={ref} href={it.ruta} target="_blank" rel="noopener noreferrer" className={clase} style={borde}>{cuerpo}</a>
    : <Link to={it.ruta} className={clase} style={borde}>{cuerpo}</Link>;
}
