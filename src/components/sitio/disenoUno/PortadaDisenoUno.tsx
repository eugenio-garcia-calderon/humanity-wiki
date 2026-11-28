import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { HERRAMIENTAS, AREAS, areaDeIcono } from './herramientas';
import { IconoArea } from './visuales/iconosAreas';
import { miniatura } from '../../../utils/miniatura';

// ============================================================================
// DISEÑO 1 DE LA PORTADA DE luzhumanidad.com (2026-11-27, Eugenio)
// ============================================================================
// «Lo que me gusta de Política es la simpleza: se dice política y te enseña tres tarjetas muy bien generadas: una buena
// ilustración, un buen título, un buen subtítulo. Esto es lo que quiero para las herramientas fundamentales del
// laboratorio. Sacar pecho de ellas en cada ámbito: mostrar las tres más potentes de cada área y un botón debajo para
// que aparezcan más. Una ilustración de cada herramienta, profesional, en vez de imágenes reales de personas.»
// And, the same night: «un menú debajo de Luz y Humanidad con todas las áreas de innovación; al pinchar una te hace un
// scroll hacia esa sección. Tarjetas más estrechas y compactas, que en un ordenador se vea que debajo hay otra área.
// Quita texto innecesario: titular y subtítulo. Quita el "Ver más" de abajo: que aparezca en la imagen al pasar el ratón.»
//
// It receives the same groups the current home page builds (`agrupar` in VistaProyectosSitio): one per sector of
// `sitio.sectores`, inventions only. Each card takes its picture, title and line from `herramientas.tsx` by row id;
// a project that is not there yet gets its area's icon and its page's own description, so nothing new disappears.

export type FilaPortada = { id: string; pagina_id?: string | null; orden: number; pagina?: { titulo?: string | null; descripcion?: string | null; imagen?: string | null; encuadre?: { x?: number; y?: number } | null } | null };
/** The future an area works towards (`sitio.sectores[].vision`, `sitio.visionOtros`), 2026-11-28. */
export type VisionArea = { texto?: string; claves?: string[] };
export type GrupoPortada = { titulo: string; icono?: string; vision?: VisionArea | null; filas: FilaPortada[] };
type Destino = { href: string; fuera: boolean };

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** «Innovación en el sector energético» → «Energía» is not derivable: the area's own name comes from AREAS. */
const sinInnovacion = (t: string) => t.replace(/^Innovaci[oó]n en (?:el sector (?:de la |de los |del |de )?)?/i, '').replace(/^./, l => l.toUpperCase());

/** How many cards an area shows before «Ver más herramientas». */
const PRIMERAS = 3;

export default function PortadaDisenoUno({ grupos, beneficiarias, destino, nombreFila }: {
  grupos: GrupoPortada[];
  beneficiarias?: GrupoPortada[] | null;
  destino: (f: FilaPortada) => Destino | null;
  nombreFila: (f: FilaPortada) => string;
}) {
  const secciones = grupos.map(g => {
    const area = areaDeIcono(g.icono || '', g.titulo);
    const info = AREAS[area];
    // The most powerful first: the order chosen in herramientas.tsx, then the table's.
    const filas = [...g.filas].sort((a, b) => (HERRAMIENTAS[a.id]?.orden ?? 99) - (HERRAMIENTAS[b.id]?.orden ?? 99) || a.orden - b.orden);
    const nombre = info?.nombre || sinInnovacion(g.titulo);
    return { id: `area-${plano(nombre)}`, area, nombre, corto: info?.corto || nombre, lema: info?.lema || '', vision: g.vision || null, filas };
  });
  // 2026-11-27 the areas with one or two tools were packed side by side at the end. 2026-11-28, Eugenio: «debajo
  // de cada sección de innovación pon la visión de futuro… que tenga una relevancia grande, el título del área con
  // la visión justo debajo, y los proyectos debajo de esa visión». A vision does not fit in a third of the width, so
  // every area is a row again, in the order of `sitio.sectores`; an area with a single tool puts its title and
  // vision beside the card instead of above it, which keeps most of the compactness.

  return (
    <div data-diseno="1" className="pb-10">
      <MenuAreas secciones={secciones} />
      {secciones.map(s => <SeccionArea key={s.id} id={s.id} area={s.area} nombre={s.nombre} lema={s.lema} vision={s.vision} filas={s.filas} destino={destino} nombreFila={nombreFila} />)}
      {!!beneficiarias?.length && <Beneficiarias grupos={beneficiarias} destino={destino} nombreFila={nombreFila} />}
    </div>
  );
}

// ── The areas menu: right under the site's bar, sticky, one pill per area; a click scrolls to it ──
function MenuAreas({ secciones }: { secciones: Array<{ id: string; area: string; nombre: string; corto: string }> }) {
  const [activa, setActiva] = useState<string>(secciones[0]?.id || '');
  const fila = useRef<HTMLDivElement>(null);
  const [alto, setAlto] = useState(64);
  const [bordes, setBordes] = useState({ izq: false, der: false });

  // Sticks just under the site's bar, whose height changes with the screen.
  useEffect(() => {
    const cab = document.querySelector('[data-cabecera-sitio]') as HTMLElement | null;
    if (!cab) return;
    const medir = () => setAlto(cab.getBoundingClientRect().height);
    medir();
    const ro = new ResizeObserver(medir); ro.observe(cab);
    return () => ro.disconnect();
  }, []);

  // The pill of the area on screen lights up while scrolling.
  useEffect(() => {
    const io = new IntersectionObserver(es => {
      const vis = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActiva(vis.target.id);
    }, { rootMargin: `-${alto + 70}px 0px -55% 0px` });
    secciones.forEach(s => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [secciones.map(s => s.id).join(','), alto]);

  // Arrows only when the pills do not fit.
  useEffect(() => {
    const el = fila.current; if (!el) return;
    const ver = () => setBordes({ izq: el.scrollLeft > 4, der: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    ver(); el.addEventListener('scroll', ver, { passive: true }); window.addEventListener('resize', ver);
    return () => { el.removeEventListener('scroll', ver); window.removeEventListener('resize', ver); };
  }, []);
  useEffect(() => { fila.current?.querySelector(`[data-area="${activa}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [activa]);

  const ir = (id: string) => {
    const el = document.getElementById(id); if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - alto - 64;
    window.scrollTo({ top: y, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setActiva(id);
    history.replaceState(null, '', `#${id}`);
  };
  const mover = (d: number) => fila.current?.scrollBy({ left: d * fila.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <nav aria-label="Áreas de innovación" className="sticky z-30 -mx-4 mb-2 border-b border-slate-200 bg-slate-50/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6"
      style={{ top: alto, width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      <div className="relative mx-auto max-w-6xl">
        {bordes.izq && <Flecha lado="izq" onClick={() => mover(-1)} />}
        <div ref={fila} className="flex gap-1.5 overflow-x-auto scroll-smooth px-0.5 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>:first-child]:ml-auto [&>:last-child]:mr-auto">
          {secciones.map(s => (
            <a key={s.id} href={`#${s.id}`} data-area={s.id} onClick={e => { e.preventDefault(); ir(s.id); }}
              aria-current={activa === s.id ? 'true' : undefined}
              className={cn('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border bg-white pl-1 pr-3 text-[14px] font-semibold text-slate-700 shadow-sm transition',
                'hover:border-slate-300 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
                activa === s.id ? 'border-sky-300 text-slate-950 ring-2 ring-sky-200' : 'border-slate-200')}>
              <IconoArea area={s.area} className="h-7 w-7" />
              {s.corto}
            </a>
          ))}
        </div>
        {bordes.der && <Flecha lado="der" onClick={() => mover(1)} />}
      </div>
    </nav>
  );
}

function Flecha({ lado, onClick }: { lado: 'izq' | 'der'; onClick: () => void }) {
  const Icono = lado === 'izq' ? ChevronLeft : ChevronRight;
  return (
    <button type="button" onClick={onClick} aria-label={lado === 'izq' ? 'Áreas anteriores' : 'Más áreas'}
      className={cn('absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-md hover:text-slate-950',
        lado === 'izq' ? 'left-0' : 'right-0')}>
      <Icono className="h-5 w-5" />
    </button>
  );
}

// ── One area: its name big, one line, three cards and «Ver más herramientas» for the rest ──
/** Per area: the colour of the vision's bar, its eyebrow and its key words. Literal classes, for Tailwind. */
const TINTA: Record<string, { barra: string; texto: string; chip: string }> = {
  energia: { barra: 'border-amber-400', texto: 'text-amber-600', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
  movilidad: { barra: 'border-sky-400', texto: 'text-sky-600', chip: 'bg-sky-50 text-sky-800 ring-sky-200' },
  vivienda: { barra: 'border-emerald-400', texto: 'text-emerald-600', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  politica: { barra: 'border-rose-400', texto: 'text-rose-600', chip: 'bg-rose-50 text-rose-800 ring-rose-200' },
  economia: { barra: 'border-indigo-400', texto: 'text-indigo-600', chip: 'bg-indigo-50 text-indigo-800 ring-indigo-200' },
  agricultura: { barra: 'border-lime-500', texto: 'text-lime-700', chip: 'bg-lime-50 text-lime-800 ring-lime-200' },
  informatica: { barra: 'border-cyan-400', texto: 'text-cyan-700', chip: 'bg-cyan-50 text-cyan-800 ring-cyan-200' },
  conciencia: { barra: 'border-violet-400', texto: 'text-violet-600', chip: 'bg-violet-50 text-violet-800 ring-violet-200' },
  salud: { barra: 'border-red-400', texto: 'text-red-600', chip: 'bg-red-50 text-red-800 ring-red-200' },
  seguridad: { barra: 'border-blue-400', texto: 'text-blue-700', chip: 'bg-blue-50 text-blue-800 ring-blue-200' },
};

/** The vision: big, right under the area's name, with its key words. */
function Vision({ area, vision }: { area: string; vision: VisionArea }) {
  const t = TINTA[area] || TINTA.informatica;
  return (
    <div className={cn('mt-4 border-l-4 pl-4 sm:pl-5', t.barra)}>
      <p className={cn('text-xs font-black uppercase tracking-[0.18em]', t.texto)}>La visión</p>
      <p className="mt-1.5 max-w-4xl text-lg font-semibold leading-snug text-slate-800 [text-wrap:pretty] sm:text-[21px] sm:leading-[1.4]">{vision.texto}</p>
      {!!vision.claves?.length && (
        <ul className="mt-3 flex list-none flex-wrap gap-1.5 p-0">
          {vision.claves.map(c => <li key={c} className={cn('rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ring-inset', t.chip)}>{c}</li>)}
        </ul>
      )}
    </div>
  );
}

function SeccionArea({ id, area, nombre, lema, vision, filas, destino, nombreFila }: {
  id: string; area: string; nombre: string; lema: string; vision: VisionArea | null; filas: FilaPortada[];
  destino: (f: FilaPortada) => Destino | null; nombreFila: (f: FilaPortada) => string;
}) {
  const [todas, setTodas] = useState(false);
  const vistas = todas ? filas : filas.slice(0, PRIMERAS);
  const conVision = !!vision?.texto;
  const cabecera = (
    <>
      <h2 id={`${id}-t`} className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        <IconoArea area={area} className="hidden h-10 w-10 sm:block" />{nombre}
      </h2>
      {conVision ? <Vision area={area} vision={vision!} /> : lema && <p className="mt-1.5 text-base text-slate-600 sm:text-lg">{lema}</p>}
    </>
  );
  const tarjeta = (f: FilaPortada) => <li key={f.id}><Tarjeta f={f} area={area} destino={destino(f)} nombre={nombreFila(f)} /></li>;
  // One tool: the title and the vision take two columns and the card the third.
  if (filas.length === 1) return (
    <section id={id} aria-labelledby={`${id}-t`} className="pt-10 sm:pt-14">
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 sm:col-span-1 lg:col-span-2">{cabecera}</div>
        <ul className="m-0 grid list-none content-start p-0">{filas.map(tarjeta)}</ul>
      </div>
    </section>
  );
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="pt-10 sm:pt-14">
      {cabecera}
      {conVision && <p className="mt-6 text-sm font-semibold text-slate-500">Los proyectos que nos acercan a esa visión</p>}
      <ul className={cn('grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3', conVision ? 'mt-3' : 'mt-5')}>
        {vistas.map(tarjeta)}
      </ul>
      {filas.length > PRIMERAS && (
        <button type="button" onClick={() => setTodas(v => !v)} aria-expanded={todas}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-500 hover:text-slate-950">
          {todas ? 'Ver menos' : `Ver más herramientas de ${nombre.toLowerCase()} (${filas.length - PRIMERAS})`}
          <ChevronDown aria-hidden className={cn('h-4 w-4 transition-transform', todas && 'rotate-180')} />
        </button>
      )}
    </section>
  );
}

// ── The card: picture, title, one line. «Ver más» appears big over the picture on hover ──
function Tarjeta({ f, area, destino, nombre }: { f: FilaPortada; area: string; destino: Destino | null; nombre: string }) {
  const h = HERRAMIENTAS[f.id];
  const titulo = h?.titulo || nombre;
  const texto = h?.texto || (f.pagina?.descripcion || '').trim();
  const Visual: ComponentType | null = h?.Visual || null;
  const cuerpo: ReactNode = (
    <>
      <span className={cn('relative block h-36 overflow-hidden border-b border-slate-100', h?.fondo || 'bg-gradient-to-br from-slate-50 via-white to-sky-50')}>
        {Visual ? <Visual /> : <span className="grid h-full place-items-center"><IconoArea area={area} className="h-16 w-16" /></span>}
        <span aria-hidden className="absolute inset-0 grid place-items-center bg-slate-950/0 opacity-0 transition duration-300 group-hover:bg-slate-950/35 group-hover:opacity-100 group-focus-visible:bg-slate-950/35 group-focus-visible:opacity-100">
          <span className="inline-flex scale-90 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-lg font-bold text-slate-900 shadow-xl transition duration-300 group-hover:scale-100">
            Ver más <ArrowRight className="h-5 w-5" />
          </span>
        </span>
      </span>
      <span className="block px-4 pb-4 pt-3">
        <span className="block text-[17px] font-bold leading-snug text-slate-900">{titulo}</span>
        {texto && <span className="mt-1 line-clamp-2 block text-[13.5px] leading-snug text-slate-600">{texto}</span>}
      </span>
    </>
  );
  const clases = 'group block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900';
  if (!destino) return <div className={clases}>{cuerpo}</div>;
  return destino.fuera
    ? <a href={destino.href} className={clases} aria-label={`${titulo}: ver más`}>{cuerpo}</a>
    : <Link to={destino.href} className={clases} aria-label={`${titulo}: ver más`}>{cuerpo}</Link>;
}

// ── The communities that already enjoy those inventions ──
// Eugenio, 2026-11-27: «Las comunidades beneficiadas ponlas con imágenes reales y en formato galería. Una galería
// compacta donde se ven ahí todas. Todas juntas, y dentro de la imagen, en pequeñito, si corresponde a energía,
// vivienda, agricultura…». So: one grid in the table's order (not one row per area), each tile the cover photo of
// the community's page with its name over it and a small area tag in the corner. These are real photographs: the
// tools above are illustrated, the people who use them are not.
function Beneficiarias({ grupos, destino, nombreFila }: { grupos: GrupoPortada[]; destino: (f: FilaPortada) => Destino | null; nombreFila: (f: FilaPortada) => string }) {
  const todas = grupos
    .flatMap(g => { const area = areaDeIcono(g.icono || '', g.titulo); return g.filas.map(f => ({ f, area })); })
    .sort((a, b) => a.f.orden - b.f.orden);
  return (
    <section data-ancla="comunidades" aria-labelledby="beneficiarias-t" className="mt-14 scroll-mt-36 outline-none sm:mt-20 sm:scroll-mt-24">
      <h2 id="beneficiarias-t" className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Comunidades beneficiadas</h2>
      <p className="mt-1.5 text-base text-slate-600">Personas, pueblos y comunidades que ya disfrutan de estas herramientas.</p>
      <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 lg:grid-cols-5">
        {todas.map(({ f, area }, i) => <FotoComunidad key={f.id} fila={f} area={area} nombre={nombreFila(f)} destino={destino(f)} prioridad={i} />)}
      </ul>
    </section>
  );
}

function FotoComunidad({ fila, area, nombre, destino, prioridad }: { fila: FilaPortada; area: string; nombre: string; destino: Destino | null; prioridad: number }) {
  const img = fila.pagina?.imagen || null;
  const enc = fila.pagina?.encuadre;
  const etiqueta = AREAS[area]?.corto || AREAS[area]?.nombre || '';
  const clases = 'group relative block aspect-[4/3] overflow-hidden rounded-xl bg-slate-200 outline-none ring-slate-900 focus-visible:ring-2';
  const cuerpo = (
    <>
      {img
        ? <img src={miniatura(img, 280)} alt="" loading={prioridad < 5 ? 'eager' : 'lazy'} decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ objectPosition: `${enc?.x ?? 50}% ${enc?.y ?? 40}%` }} />
        : <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200"><IconoArea area={area} className="h-12 w-12 opacity-70" /></span>}
      <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
      {etiqueta && (
        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-white/90 py-0.5 pl-0.5 pr-2 text-[10.5px] font-semibold text-slate-700 shadow-sm backdrop-blur">
          <IconoArea area={area} className="h-4 w-4" />{etiqueta}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 line-clamp-2 px-2.5 pb-2 text-[13px] font-bold leading-tight text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">{nombre}</span>
    </>
  );
  return (
    <li>
      {!destino ? <span className={clases}>{cuerpo}</span>
        : destino.fuera ? <a href={destino.href} className={clases}>{cuerpo}</a>
        : <Link to={destino.href} className={clases}>{cuerpo}</Link>}
    </li>
  );
}
