import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { HERRAMIENTAS, AREAS, areaDeIcono } from './herramientas';
import { IconoArea } from './visuales/iconosAreas';
import PrincipiosSitio, { type ConfigPrincipios } from '../PrincipiosSitio';

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

export type FilaPortada = { id: string; pagina_id?: string | null; orden: number; pagina?: { titulo?: string | null; descripcion?: string | null } | null };
export type GrupoPortada = { titulo: string; icono?: string; filas: FilaPortada[] };
type Destino = { href: string; fuera: boolean };

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** «Innovación en el sector energético» → «Energía» is not derivable: the area's own name comes from AREAS. */
const sinInnovacion = (t: string) => t.replace(/^Innovaci[oó]n en (?:el sector (?:de la |de los |del |de )?)?/i, '').replace(/^./, l => l.toUpperCase());

/** How many cards an area shows before «Ver más herramientas». */
const PRIMERAS = 3;

export default function PortadaDisenoUno({ grupos, beneficiarias, destino, principios, nombreFila }: {
  grupos: GrupoPortada[];
  beneficiarias?: GrupoPortada[] | null;
  destino: (f: FilaPortada) => Destino | null;
  principios?: ConfigPrincipios | null;
  nombreFila: (f: FilaPortada) => string;
}) {
  const secciones = grupos.map(g => {
    const area = areaDeIcono(g.icono || '', g.titulo);
    const info = AREAS[area];
    // The most powerful first: the order chosen in herramientas.tsx, then the table's.
    const filas = [...g.filas].sort((a, b) => (HERRAMIENTAS[a.id]?.orden ?? 99) - (HERRAMIENTAS[b.id]?.orden ?? 99) || a.orden - b.orden);
    const nombre = info?.nombre || sinInnovacion(g.titulo);
    return { id: `area-${plano(nombre)}`, area, nombre, corto: info?.corto || nombre, lema: info?.lema || '', filas };
  });

  return (
    <div data-diseno="1" className="pb-10">
      <MenuAreas secciones={secciones} />
      {secciones.map(s => <SeccionArea key={s.id} id={s.id} area={s.area} nombre={s.nombre} lema={s.lema} filas={s.filas} destino={destino} nombreFila={nombreFila} />)}
      <PrincipiosSitio cfg={principios} />
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
function SeccionArea({ id, area, nombre, lema, filas, destino, nombreFila }: {
  id: string; area: string; nombre: string; lema: string; filas: FilaPortada[];
  destino: (f: FilaPortada) => Destino | null; nombreFila: (f: FilaPortada) => string;
}) {
  const [todas, setTodas] = useState(false);
  const vistas = todas ? filas : filas.slice(0, PRIMERAS);
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="pt-8 sm:pt-10">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-t`} className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            <IconoArea area={area} className="hidden h-10 w-10 sm:block" />{nombre}
          </h2>
          {lema && <p className="mt-1.5 text-base text-slate-600 sm:text-lg">{lema}</p>}
        </div>
      </div>
      <ul className="mt-5 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {vistas.map(f => <li key={f.id}><Tarjeta f={f} area={area} destino={destino(f)} nombre={nombreFila(f)} /></li>)}
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

// ── The communities that already enjoy those inventions: names only, by area ──
function Beneficiarias({ grupos, destino, nombreFila }: { grupos: GrupoPortada[]; destino: (f: FilaPortada) => Destino | null; nombreFila: (f: FilaPortada) => string }) {
  return (
    <section aria-labelledby="beneficiarias-t" className="mt-14 sm:mt-20">
      <h2 id="beneficiarias-t" className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Comunidades beneficiadas</h2>
      <p className="mt-1.5 text-base text-slate-600">Personas, pueblos y comunidades que ya disfrutan de estas herramientas.</p>
      <div className="mt-5 space-y-4">
        {grupos.map(g => {
          const area = areaDeIcono(g.icono || '', g.titulo);
          return (
            <div key={g.titulo} className="flex flex-wrap items-center gap-2">
              <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500"><IconoArea area={area} className="h-6 w-6" />{AREAS[area]?.nombre || sinInnovacion(g.titulo)}</span>
              {g.filas.map(f => {
                const d = destino(f), n = nombreFila(f);
                const cl = 'inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-slate-400 hover:text-slate-950';
                return !d ? <span key={f.id} className={cl}>{n}</span>
                  : d.fuera ? <a key={f.id} href={d.href} className={cl}>{n}</a> : <Link key={f.id} to={d.href} className={cl}>{n}</Link>;
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
