import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Link2, Check, ArrowRight, FileText, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSitio } from './ContextoSitio';
import { cn } from '../../utils/cn';
import { usePestanasExtra, useGruposOcultos, useOpcionesRed, EVENTO_ABRIR_PESTANA } from './pestanasExtra';
import { miniatura } from '../../utils/miniatura';
import CompartirRedes from './CompartirRedes';

// ============================================================================
// LA RED DE UNA PÁGINA (2026-10-21, Eugenio)
// ============================================================================
// «Un menú justo debajo del título con todas las relaciones de la página: si
// pinchas en una pestaña te lleva a las entradas de esa base de datos, en
// galería y con más información; y si bajas, ves eso mismo desplegado. La URL
// tiene que coincidir con la pestaña: movilidad/lineas-de-desarrollo, y una
// entrada, movilidad/lineas-de-desarrollo/su-nombre.»
//
// Cada columna de relación de la entrada es un grupo (`GET /api/bd/paginas/:id/red`).
// «Todo» enseña todos los grupos uno debajo de otro; una pestaña, sólo el
// suyo y en grande. Cambiar de pestaña escribe la dirección sin recargar
// (`history.pushState`); entrar por la dirección abre ya la pestaña (el
// servidor la resuelve en `porContexto`, `sitios.ts`). Pinchar una entrada va
// a `pestaña/entrada`, que es su página con esta en las migas.
//
// No es el menú de arriba de la web (ése es del sitio): es la ramificación de
// ESTA página.

type Entrada = { fila_id: string; pagina_id: string | null; titulo: string; slug: string; imagen: string | null; icono: string | null; resumen: string; descripcion: string | null;
  /** Llega por un subtema (`bd/temas.ts`): «vía Fotovoltaica». */
  via?: string | null };
export type Grupo = { columna_id: string; nombre: string; slug: string; tabla_titulo: string | null; tabla_destino?: string | null; entradas: Entrada[]; vinculo?: string | null; vista?: string | null };
export type { Entrada as EntradaRedCliente };

/** EL NOMBRE CORTO EN LA PESTAÑA (bot de UX, 2026-10-25: «Líneas de trabajo de las …»
 *  truncado y la fila cortada en seco). «Puntos de Trabajo dentro de las Líneas de
 *  Desarrollo» → «Puntos de Trabajo»; el nombre entero va en el título del grupo. */
export const nombreCorto = (t: string) => {
  const c = t.replace(/\s+(de los|de las|del|de la|dentro de)\s.*$/i, '').trim();
  return c.length >= 3 ? c : t;
};
const TONOS = ['bg-emerald-50 text-emerald-600', 'bg-sky-50 text-sky-600', 'bg-amber-50 text-amber-600', 'bg-rose-50 text-rose-600', 'bg-violet-50 text-violet-600', 'bg-teal-50 text-teal-600'];

export default function RedRelaciones({ paginaId, titulo, autorHandle, esRaiz, enEditor = false, recarga = 0, renderGrupo }: {
  paginaId: string; titulo: string; autorHandle?: string; esRaiz?: boolean;
  /** Sube y la red se vuelve a pedir sin perder la pestaña abierta (editor). */
  recarga?: number;
  /** En el editor, una pestaña abierta enseña esto (la vista enlazada) en vez de las tarjetas. */
  renderGrupo?: (g: Grupo, filaId: string) => ReactNode;
  /** (2026-10-23) En el editor: la misma vista que la página publicada, pero las
   *  pestañas no tocan la dirección y las entradas abren su página en el editor. */
  enEditor?: boolean;
}) {
  // ORDENAR LAS PESTAÑAS ARRASTRANDO (2026-10-23, Eugenio). Solo en el editor y
  // para quien puede editar la tabla; el orden es de la tabla (`orden-red`).
  const [tablaId, setTablaId] = useState<string | null>(null);
  const [filaId, setFilaId] = useState<string | null>(null);
  const [falloOrden, setFalloOrden] = useState<string | null>(null);
  const [ordenable, setOrdenable] = useState(false);
  const [arrastrada, setArrastrada] = useState<string | null>(null);
  const [encima, setEncima] = useState<{ slug: string; antes: boolean } | null>(null);
  const sitio = useSitio();
  const [grupos_, setGrupos] = useState<Grupo[] | null>(null);
  const [slugPagina, setSlugPagina] = useState<string | null>(null);
  // «todo» ya no es una pestaña (2026-10-25, Eugenio: «quita la pestaña de Todo»): quiere decir
  // «la de por defecto», que es la primera (las del termómetro, si las hay; si no, la primera base de datos).
  const [activa, setActiva] = useState<string>('todo');
  // Las pestañas que pone un bloque de la página (el termómetro): van delante, en la misma barra.
  const extra = usePestanasExtra(paginaId);
  // Y los grupos que esas pestañas ya enseñan (p. ej. «Objetivos», en galería con su nota): no se repiten.
  const ocultos = useGruposOcultos(paginaId);
  const plano = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // El filtro y el tamaño que pide un bloque de la página (el perfil: «los proyectos de este área»).
  const opcionesRed = useOpcionesRed(paginaId);
  const filtro = opcionesRed.filtro || null;
  const grupos = useMemo(() => {
    if (!grupos_) return grupos_;
    let l = ocultos.length ? grupos_.filter(g => !ocultos.includes(plano(g.nombre))) : grupos_;
    if (filtro) {
      const si = new Set(filtro.filas);
      l = l.map(g => ({ ...g, entradas: g.entradas.filter(x => si.has(x.fila_id)) })).filter(g => g.entradas.length > 0);
    }
    // PRIMERO LAS QUE TIENEN IMAGEN (2026-10-26, Eugenio: «los proyectos sin imagen, más abajo»).
    return l.map(g => ({ ...g, entradas: [...g.entradas].sort((a, b) => Number(!a.imagen) - Number(!b.imagen)) }));
  }, [grupos_, ocultos, filtro]);

  const barra = useRef<HTMLDivElement>(null);
  const fila = useRef<HTMLElement>(null);
  const [hayMas, setHayMas] = useState(false);
  const medirFila = () => { const f = fila.current; setHayMas(!!f && f.scrollWidth - f.scrollLeft - f.clientWidth > 4); };
  useEffect(() => { medirFila(); window.addEventListener('resize', medirFila); return () => window.removeEventListener('resize', medirFila); });

  useEffect(() => {
    let vivo = true;
    fetch(`/api/bd/paginas/${encodeURIComponent(paginaId)}/red${enEditor ? '?editor=1' : ''}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { grupos: [] }))
      .then(j => { if (vivo) { setGrupos(j.grupos || []); setSlugPagina(j.slug || null); setTablaId(j.tabla_id || null); setFilaId(j.fila_id || null); setOrdenable(!!j.ordenable); } })
      .catch(() => { if (vivo) setGrupos([]); });
    return () => { vivo = false; };
  }, [paginaId, recarga, enEditor]);

  /** Dónde vive la página: las pestañas y las entradas cuelgan de aquí. */
  const base = useMemo(() => {
    if (!sitio || esRaiz || !slugPagina) return null;
    return sitio.enlaceSlug(slugPagina, autorHandle || '');
  }, [sitio, esRaiz, slugPagina, autorHandle]);

  // La pestaña sale de la dirección (también al ir atrás y adelante).
  // En el editor la pestaña abierta va en `?seccion=` (bot evaluador: recargar volvía siempre a «Todo»).
  const leidaEditor = useRef(false);
  useEffect(() => {
    if (!grupos || !enEditor || leidaEditor.current) return;
    leidaEditor.current = true;
    const q = new URLSearchParams(window.location.search).get('seccion');
    if (q && grupos.some(g => g.slug === q)) setActiva(q);
  }, [grupos, enEditor]);
  useEffect(() => {
    if (!grupos || enEditor) return;
    const leer = () => {
      const t = window.location.pathname.split('/').filter(Boolean).map(x => { try { return decodeURIComponent(x); } catch { return x; } });
      const ultimo = t[t.length - 1];
      const q = new URLSearchParams(window.location.search).get('seccion');
      setActiva(grupos.some(g => g.slug === ultimo) ? ultimo : q && grupos.some(g => g.slug === q) ? q : 'todo');
    };
    leer();
    const alVolver = () => { leer(); ponerCanonica(); };
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, [grupos, enEditor]);
  // «Qué hace falta para llegar al nivel 5» abre su pestaña aquí abajo y baja hasta ella.
  useEffect(() => {
    const oir = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      if (d.paginaId !== paginaId) return;
      setActiva(`x:${d.id}`);
      const y = (barra.current?.getBoundingClientRect().top || 0) + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    };
    window.addEventListener(EVENTO_ABRIR_PESTANA, oir);
    return () => window.removeEventListener(EVENTO_ABRIR_PESTANA, oir);
  }, [paginaId]);
  // La pestaña activa, a la vista en la barra (en el teléfono la barra se desplaza).
  useEffect(() => {
    barra.current?.querySelector<HTMLElement>('a[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activa]);

  if (!grupos || (!grupos.length && !extra.length)) return null;

  const caminoDe = (g?: Grupo) => {
    if (!base) return g ? `?seccion=${g.slug}` : window.location.pathname;
    return g ? `${base}/${g.slug}` : base;
  };
  const elegir = (e: React.MouseEvent, g: Grupo | null) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    if (enEditor) {
      setActiva(g ? g.slug : 'todo');
      const u = new URL(window.location.href);
      if (g) u.searchParams.set('seccion', g.slug); else u.searchParams.delete('seccion');
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
      return;
    }
    const destino = caminoDe(g || undefined);
    if (destino !== window.location.pathname + window.location.search) window.history.pushState(null, '', destino);
    setActiva(g ? g.slug : 'todo');
    document.title = g ? `${g.nombre} · ${titulo}` : titulo;
    ponerCanonica();
    // Que la barra quede arriba y se vea lo que se ha abierto.
    const y = (barra.current?.getBoundingClientRect().top || 0) + window.scrollY - 80;
    if (window.scrollY > y) window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };
  const enlaceEntrada = (g: Grupo, x: Entrada) =>
    enEditor ? (x.pagina_id ? `/paginas/${x.pagina_id}` : '#')
      : base ? `${base}/${g.slug}/${x.slug}` : x.pagina_id && sitio ? sitio.enlacePagina(x.pagina_id) : '#';
  const arrastrable = enEditor && ordenable && !!tablaId && grupos.length > 1;
  const soltar = (destino: string, antes: boolean) => {
    const desde = arrastrada;
    setArrastrada(null); setEncima(null);
    if (!desde || desde === destino) return;
    const lista = grupos.filter(g => g.slug !== desde);
    const movida = grupos.find(g => g.slug === desde)!;
    const i = lista.findIndex(g => g.slug === destino);
    lista.splice(antes ? i : i + 1, 0, movida);
    guardarOrden(lista);
  };
  /** Pone el orden en pantalla y lo guarda; si no se puede, vuelve al de antes y lo dice. */
  const guardarOrden = (lista: Grupo[]) => {
    const antes = grupos;
    setGrupos(lista); setFalloOrden(null);
    fetch(`/api/bd/tablas/${encodeURIComponent(tablaId!)}/orden-red`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orden: lista.map(g => g.columna_id) }),
    }).then(r => { if (!r.ok) throw new Error(); }).catch(() => { setGrupos(antes); setFalloOrden('No se ha podido guardar el orden de las pestañas.'); });
  };
  /** Mover la pestaña abierta un sitio (teclado y teléfono, donde no se arrastra). */
  const mover = (slug: string, paso: -1 | 1) => {
    const i = grupos.findIndex(g => g.slug === slug), j = i + paso;
    if (i < 0 || j < 0 || j >= grupos.length) return;
    const lista = [...grupos];
    [lista[i], lista[j]] = [lista[j], lista[i]];
    guardarOrden(lista);
  };
  const arrastre = (g: Grupo) => arrastrable ? {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { setArrastrada(g.slug); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', g.slug); },
    onDragOver: (e: React.DragEvent) => {
      if (!arrastrada) return;
      e.preventDefault();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const antes = e.clientX < r.left + r.width / 2;
      if (encima?.slug !== g.slug || encima.antes !== antes) setEncima({ slug: g.slug, antes });
    },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); soltar(g.slug, encima?.slug === g.slug ? encima.antes : true); },
    onDragEnd: () => { setArrastrada(null); setEncima(null); },
    marca: (encima?.slug === g.slug && arrastrada !== g.slug ? (encima.antes ? 'antes' : 'despues') : null) as Arrastre['marca'],
    moviendo: arrastrada === g.slug,
  } : undefined;
  // Una pestaña que ya no está (el filtro del perfil la ha vaciado) cuenta como la de por defecto.
  const efectiva = activa === 'todo' || (activa.startsWith('x:') && !extra.some(x => `x:${x.id}` === activa))
    || (!activa.startsWith('x:') && !grupos.some(g => g.slug === activa))
    ? (extra[0] ? `x:${extra[0].id}` : grupos[0]?.slug) : activa;
  const grupo = grupos.find(g => g.slug === efectiva) || null;
  const pestanaExtra = extra.find(x => `x:${x.id}` === efectiva) || null;

  return (
    <section className="mb-8" data-red-relaciones>
      {/* LAS PESTAÑAS */}
      {/* En el teléfono, un degradado a la derecha avisa de que hay más pestañas. */}
      <div ref={barra} className="relative mb-5 border-b border-slate-200">
        <nav ref={fila} onScroll={medirFila} aria-label={`Relacionado con ${titulo}`} className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
          {extra.map(x => (
            <Pestana key={`x:${x.id}`} href={`#${x.id}`} activa={efectiva === `x:${x.id}`} texto={x.titulo} n={x.n}
              onClick={e => { if (e.button !== 0 || e.metaKey || e.ctrlKey) return; e.preventDefault(); setActiva(`x:${x.id}`); }} />
          ))}
          {grupos.map(g => (
            <Pestana key={g.slug} href={caminoDe(g)} activa={efectiva === g.slug} onClick={e => elegir(e, g)} texto={enEditor ? g.nombre : nombreCorto(g.nombre)} completo={g.nombre} n={g.entradas.length} arrastre={arrastre(g)}
              mover={arrastrable && efectiva === g.slug ? { izquierda: grupos[0].slug !== g.slug ? () => mover(g.slug, -1) : undefined, derecha: grupos[grupos.length - 1].slug !== g.slug ? () => mover(g.slug, 1) : undefined } : undefined} />
          ))}
        </nav>
        {/* Si no caben, un degradado y una flecha dicen que hay más pestañas (en el ordenador también). */}
        {hayMas && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-16 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent">
            <button type="button" aria-label="Ver más pestañas" onClick={() => fila.current?.scrollBy({ left: 260, behavior: 'smooth' })}
              className="pointer-events-auto grid h-8 w-8 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-slate-900">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {falloOrden && <p role="alert" className="-mt-3 mb-4 text-xs font-bold text-rose-600">{falloOrden}</p>}

      {pestanaExtra ? (
        <div data-pestana-extra={pestanaExtra.id}>{pestanaExtra.contenido}</div>
      ) : grupo ? (
        // UNA PESTAÑA: sólo su grupo, en grande.
        <div>
          {/* En el editor la vista enlazada ya lleva el nombre de su base de datos. */}
          {!(renderGrupo && filaId) && (
          <div className="mb-4 flex items-baseline gap-2">
            <h2 className="text-xl font-black tracking-tight text-slate-900">{grupo.nombre}{filtro && <span className="font-semibold text-slate-400"> · {filtro.etiqueta}</span>}</h2>
            <span className="text-sm font-semibold text-slate-400">{grupo.entradas.length}</span>
          </div>
          )}
          {renderGrupo && filaId ? renderGrupo(grupo, filaId) : (
          sinImagenes(grupo) ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.entradas.map(x => <FilaEntrada key={x.fila_id} x={x} href={enlaceEntrada(grupo, x)} />)}
            </div>
          ) : (
          <div className={cn('grid gap-4 sm:gap-5', opcionesRed.compacta
            ? 'grid-cols-3 sm:[grid-template-columns:repeat(auto-fill,minmax(min(9.5rem,100%),1fr))]'
            : 'grid-cols-2 sm:[grid-template-columns:repeat(auto-fill,minmax(min(15rem,100%),1fr))]')}>
            {grupo.entradas.map(x => <Tarjeta key={x.fila_id} x={x} href={enlaceEntrada(grupo, x)} grande={!opcionesRed.compacta} />)}
          </div>
          )
          )}
        </div>
      ) : null}
    </section>
  );
}

/** La dirección canónica, al día al cambiar de pestaña sin recargar. */
function ponerCanonica() {
  const l = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (l) l.href = window.location.origin + window.location.pathname.replace(/\/+$/, '');
}

type Arrastre = {
  draggable: boolean; onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void; onDragEnd: () => void; marca: 'antes' | 'despues' | null; moviendo: boolean;
};

function Pestana({ href, activa, onClick, texto, completo, n, arrastre, mover }: {
  href: string; activa: boolean; onClick: (e: React.MouseEvent) => void; texto: string; completo?: string; n?: number; arrastre?: Arrastre;
  /** La pestaña abierta, en el editor: moverla un sitio sin arrastrar. */
  mover?: { izquierda?: () => void; derecha?: () => void };
}) {
  const { marca, moviendo, ...eventos } = arrastre || ({} as Partial<Arrastre>);
  const flecha = 'grid h-6 w-6 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-800';
  return (
    <span className="group/pestana inline-flex shrink-0 items-center">
    {mover?.izquierda && <button type="button" onClick={mover.izquierda} aria-label={`Mover «${texto}» a la izquierda`} title="Mover a la izquierda" className={flecha}><ChevronLeft className="h-3.5 w-3.5" /></button>}
    <a href={href} onClick={onClick} aria-current={activa ? 'page' : undefined}
      title={arrastre ? `${completo || texto} · arrastra para cambiarla de sitio` : (completo || texto)}
      {...(arrastre ? eventos : {})}
      data-pestana-red={arrastre ? texto : undefined}
      className={cn('relative inline-flex h-12 max-w-[16rem] shrink-0 items-center gap-1.5 border-b-2 px-3 text-[15px] font-semibold transition-colors',
        activa ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
        arrastre && 'cursor-grab active:cursor-grabbing', moviendo && 'opacity-40',
        marca === 'antes' && 'before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded before:bg-emerald-500',
        marca === 'despues' && 'after:absolute after:inset-y-2 after:right-0 after:w-0.5 after:rounded after:bg-emerald-500')}>
      {arrastre && <GripVertical aria-hidden className="-ml-1.5 h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover/pestana:opacity-100" />}
      <span className="truncate">{texto}</span>
      {n !== undefined && <span className={cn('shrink-0 rounded-full px-1.5 text-[11px] font-bold', activa ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600')}>{n}</span>}
    </a>
    {mover?.derecha && <button type="button" onClick={mover.derecha} aria-label={`Mover «${texto}» a la derecha`} title="Mover a la derecha" className={flecha}><ChevronRight className="h-3.5 w-3.5" /></button>}
    </span>
  );
}

/** Un grupo sin ninguna imagen se enseña en filas, no en cuadros con una letra
 *  gigante (bot de UX: «parecen imágenes rotas y alargan la página»). */
const sinImagenes = (g: Grupo) => g.entradas.length > 0 && g.entradas.every(x => !x.imagen && !(x.icono && !/^(https?:|\/)/.test(x.icono)));

function FilaEntrada({ x, href }: { x: Entrada; href: string }) {
  const texto = (x.descripcion || x.resumen || '').trim();
  const tono = TONOS[(x.titulo.charCodeAt(0) || 0) % TONOS.length];
  return (
    <Link to={href} data-interno className="group flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition-shadow hover:border-slate-300 hover:shadow-sm">
      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-black', tono)}>{x.titulo.trim().charAt(0).toUpperCase() || <FileText className="h-4 w-4" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-snug text-slate-900 line-clamp-2 group-hover:underline">{x.titulo}</span>
        {texto && <span className="block truncate text-[12px] text-slate-500">{texto}</span>}
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-700" />
    </Link>
  );
}

function Tarjeta({ x, href, grande = false }: { x: Entrada; href: string; grande?: boolean }) {
  const texto = (x.descripcion || x.resumen || '').trim();
  const conImagen = !!x.imagen || (!!x.icono && !/^(https?:|\/)/.test(x.icono));
  // SIN IMAGEN, LA INICIAL EN SU COLOR: todas las tarjetas con el mismo formato
  // (bot evaluador: mezclar fotos y fichas de texto descolocaba la rejilla).
  const tono = TONOS[(x.titulo.charCodeAt(0) || 0) % TONOS.length];
  return (
    <Link to={href} data-interno className="group flex min-w-0 flex-col">
      {/* Cuadrada y sin recortar, como en las galerías (2026-10-21). */}
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-white transition-shadow group-hover:shadow-md">
        {x.imagen
          ? <img src={miniatura(x.imagen, grande ? 320 : 220)} alt="" loading="lazy" className="h-full w-full object-contain transition-transform group-hover:scale-[1.02]" />
          : conImagen
            ? <span className="text-5xl">{x.icono}</span>
            : <span className={cn('grid h-full w-full place-items-center text-5xl font-black', tono)}>{x.titulo.trim().charAt(0).toUpperCase() || <FileText className="h-8 w-8" />}</span>}
      </div>
      {x.via && <p className="mt-2 truncate text-[11px] font-bold uppercase tracking-wide text-slate-400" title={`Conectado a través de «${x.via}»`}>vía {x.via}</p>}
      <p className={cn('font-bold leading-snug text-slate-900 line-clamp-3 group-hover:underline', x.via ? 'mt-0.5' : 'mt-2.5', grande ? 'text-base' : 'text-sm')}>{x.titulo}</p>
      {texto && <p className={cn('mt-1 text-slate-500 leading-snug', grande ? 'line-clamp-3 text-sm' : 'line-clamp-2 text-[13px]')}>{texto}</p>}
    </Link>
  );
}

// ============================================================================
// SEGUIR Y COMPARTIR (2026-10-21, Eugenio: «botones de funcionalidades básicas
// de red social, como seguir la página: cuando hay una actualización, te avisan»)
// ============================================================================
// Seguir es lo de siempre (`/api/seguir/pagina/:id`, `seguir.ts`): un aviso en
// la campana cuando la página cambia, como mucho uno cada seis horas. Sin
// sesión, se abre el «Entrar» de la web (miembros) o se explica.
export function AccionesPagina({ paginaId, nombre, extra }: { paginaId: string;
  /** «Seguir a Eugenio» en el perfil de una persona (2026-10-26). */
  nombre?: string;
  /** Más botones en la misma fila (el perfil: «Conectar», «Editar perfil»). */
  extra?: ReactNode;
}) {
  const [estado, setEstado] = useState<{ seguidores: number; siguiendo: boolean; es_duenyo: boolean } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    const cargar = () => fetch(`/api/seguir/pagina/${encodeURIComponent(paginaId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(j => { if (vivo && j) setEstado(j); }).catch(() => {});
    cargar();
    window.addEventListener('sitio:sesion', cargar);
    return () => { vivo = false; window.removeEventListener('sitio:sesion', cargar); };
  }, [paginaId]);
  const seguir = async () => {
    setAviso(null);
    const r = await fetch(`/api/seguir/pagina/${encodeURIComponent(paginaId)}`, { method: 'POST', credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) {
      // La web con miembros abre su «Entrar»; si nadie lo atiende, se explica.
      const ev = new Event('sitio:entrar', { cancelable: true });
      window.dispatchEvent(ev);
      if (!ev.defaultPrevented) setAviso('Entra con tu cuenta para seguir esta página.');
      return;
    }
    if (!r.ok) { setAviso(j.error || 'No se ha podido.'); return; }
    setEstado(e => ({ ...(e || { es_duenyo: false }), seguidores: j.seguidores, siguiendo: j.siguiendo }));
  };
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" data-acciones-pagina>
      {estado && !estado.es_duenyo && (
        <button type="button" onClick={seguir} aria-pressed={estado.siguiendo}
          className={cn('inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors',
            estado.siguiendo ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800')}>
          {estado.siguiendo ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {estado.siguiendo ? 'Siguiendo' : nombre ? `Seguir a ${nombre}` : 'Seguir'}
        </button>
      )}
      {estado && estado.seguidores > 0 && (
        <span className="text-sm text-slate-500">{estado.seguidores} {estado.seguidores === 1 ? 'persona la sigue' : 'personas la siguen'}</span>
      )}
      {extra}
      {/* Compartir como en las redes: un icono con la lista de redes (`CompartirRedes.tsx`). */}
      <CompartirRedes />
      {aviso && <span className="text-sm font-semibold text-rose-600">{aviso}</span>}
    </div>
  );
}
