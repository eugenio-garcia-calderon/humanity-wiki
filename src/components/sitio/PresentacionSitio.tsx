import type { MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, HeartHandshake } from 'lucide-react';
import { useSitio, type Sitio } from './ContextoSitio';
import { anosDe, numero, paisesDe, type DatosPortada } from './portadaEscaparate';

// ============================================================================
// LA PRESENTACIÓN DE LA PORTADA (2026-11-07, luzhumanidad.com)
// ============================================================================
// Lo primero que se ve, encima de los proyectos: qué es el Laboratorio de
// Innovación Ecosocial en una frase, cuatro cifras y dos botones. Compacta, para
// que las tarjetas sigan asomando en la primera pantalla.
//
//   · La frase es `config.sitio.portada.lema` de la raíz; sin ella, lo que dice
//     la descripción del sitio (`sitio.seo.descripcion`) tras los dos puntos.
//     Nunca un eslogan inventado aquí.
//   · Las cifras salen de los datos (`/api/sitio/portada/:raiz`): los proyectos
//     visibles, los países con algún proyecto en el mapa, las noticias y vídeos
//     de «En los medios» y el año del primer proyecto. Ninguna se escribe a mano.
//   · «Ver proyectos» baja a las tarjetas. «Colaborar» lleva a
//     `config.sitio.colabora` y no se enseña mientras no exista esa página.

/** La frase de la presentación: el lema propio o la descripción del sitio tras los dos puntos. */
export function lemaDe(cfg: any): string {
  const propio = cfg?.sitio?.portada?.lema;
  if (typeof propio === 'string' && propio.trim()) return propio.trim();
  const d = String(cfg?.sitio?.seo?.descripcion || cfg?.descripcion || '').trim();
  const resto = d.includes(':') ? d.slice(d.indexOf(':') + 1).trim() : d;
  return resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : '';
}

/** Adónde lleva «Colaborar»: una dirección, una página del sitio (su id) o `{ url }` / `{ pagina }`. */
export function enlaceColabora(v: unknown, sitio: Sitio | null): { href: string; fuera: boolean } | null {
  const pagina = (id: string) => ({ href: sitio ? sitio.enlacePagina(id) : `/p/${id}`, fuera: false });
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    if (/^https?:\/\//.test(s)) return { href: s, fuera: true };
    if (s.startsWith('/')) return { href: s, fuera: false };
    if (/^[A-Z0-9]{8,}$/.test(s)) return pagina(s);
    return null;
  }
  if (v && typeof v === 'object') {
    const o = v as { url?: unknown; pagina?: unknown; id?: unknown };
    if (typeof o.url === 'string') return enlaceColabora(o.url, sitio);
    const id = typeof o.pagina === 'string' ? o.pagina : typeof o.id === 'string' ? o.id : '';
    if (id) return pagina(id);
  }
  return null;
}

/** Baja hasta un ancla de la portada (`data-ancla`) sin recargar, y deja el `#` en la dirección. */
export function bajarA(nombre: string) {
  return (e: MouseEvent) => {
    const el = document.querySelector(`[data-ancla="${CSS.escape(nombre)}"]`);
    if (!el) return;
    e.preventDefault();
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${nombre}`);
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
  };
}

function Cifra({ valor, texto, ancla }: { valor: ReactNode; texto: string; ancla?: string }) {
  const numeroEl = <dd className="text-[1.4rem] font-black leading-none tracking-tight tabular-nums text-slate-900 sm:text-[2.6rem]">{valor}</dd>;
  // El número arriba y lo que cuenta debajo; en el HTML, primero lo que cuenta (`dt`) y luego el número (`dd`).
  return (
    <div className="flex min-w-0 flex-col-reverse justify-end gap-1.5 border-l-2 border-amber-400 pl-2 sm:gap-2 sm:pl-4">
      <dt className="text-[10.5px] font-bold leading-tight text-slate-500 sm:text-sm">
        {ancla ? <a href={`#${ancla}`} onClick={bajarA(ancla)} className="underline-offset-2 hover:text-slate-800 hover:underline">{texto}</a> : texto}
      </dt>
      {numeroEl}
    </div>
  );
}

export default function PresentacionSitio({ cfg, datos }: { cfg: any; datos: DatosPortada | null | undefined }) {
  const sitio = useSitio();
  const lema = lemaDe(cfg);
  const seo = cfg?.sitio?.seo || {};
  const organizacion = String(seo.organizacion || '').trim();
  const quien = [String(cfg?.subtitulo || '').trim(), organizacion].filter(Boolean);
  const antetitulo = quien.length === 2 ? `${quien[0]} de ${quien[1]}` : quien[0] || '';
  const colabora = enlaceColabora(cfg?.sitio?.colabora, sitio);
  if (!lema && !datos) return null;

  // Mientras llegan los datos, cada cifra guarda su sitio (nada salta al llegar).
  const hueco = <span aria-hidden className="inline-block h-[0.8em] w-[2.2ch] animate-pulse rounded bg-slate-200 align-middle" />;
  const anos = datos ? anosDe(datos.proyectos) : [];
  const paises = datos ? paisesDe(datos.proyectos).length : 0;
  const cifras: Array<{ valor: ReactNode; texto: string; ancla?: string }> = datos === null ? [] : [
    { valor: datos ? numero(datos.proyectos.length) : hueco, texto: datos?.proyectos.length === 1 ? 'proyecto' : 'proyectos', ancla: 'proyectos' },
    ...(datos && paises === 0 ? [] : [{ valor: datos ? numero(paises) : hueco, texto: paises === 1 ? 'país' : 'países', ancla: 'mapa' }]),
    ...(datos && !datos.noticias ? [] : [{ valor: datos ? numero(datos.noticias) : hueco, texto: 'noticias y vídeos', ancla: 'medios' }]),
    ...(datos && !anos.length ? [] : [{ valor: datos ? String(anos[0]) : hueco, texto: 'primer proyecto', ancla: 'historia' }]),
  ];

  const boton = 'inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';
  return (
    <section aria-label="Presentación" className="relative isolate mt-1 overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white px-5 py-7 sm:px-10 sm:py-10">
      {/* El sol de la marca, de fondo y muy suave (los anillos del logotipo). */}
      <svg aria-hidden viewBox="0 0 400 400" className="pointer-events-none absolute -right-32 -top-40 -z-10 h-[440px] w-[440px] text-amber-300/30 sm:-right-16 sm:-top-40 sm:h-[460px] sm:w-[460px]">
        <circle cx="200" cy="200" r="70" fill="currentColor" opacity="0.5" />
        {[110, 150, 190].map((r, i) => <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeWidth={22 - i * 6} opacity={0.45 - i * 0.12} />)}
      </svg>

      {/* En el móvil la cabecera ya dice «Laboratorio de Innovación Ecosocial»: aquí basta con quién lo hace. */}
      {antetitulo && (
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700 sm:text-xs">
          {organizacion ? <><span className="sm:hidden">{organizacion}</span><span className="hidden sm:inline">{antetitulo}</span></> : antetitulo}
        </p>
      )}
      {lema && (
        <p className="mt-2.5 max-w-[30ch] text-[1.5rem] font-black leading-[1.1] tracking-tight text-slate-900 [text-wrap:balance] sm:mt-4 sm:max-w-[34ch] sm:text-[2.55rem] sm:leading-[1.08]">
          {lema}
        </p>
      )}

      <div className="mt-5 flex flex-col gap-5 sm:mt-8 sm:gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        {cifras.length > 0 && (
          <dl className="grid gap-2 sm:gap-7" style={{ gridTemplateColumns: `repeat(${cifras.length}, minmax(0, 1fr))` }} aria-busy={datos === undefined || undefined}>
            {cifras.map(c => <Cifra key={c.texto} {...c} />)}
          </dl>
        )}
        <div className="flex shrink-0 gap-2.5">
          <a href="#proyectos" onClick={bajarA('proyectos')} className={`${boton} bg-slate-900 text-white hover:bg-slate-700`}>
            Ver proyectos <ArrowDown aria-hidden className="h-4 w-4" />
          </a>
          {colabora && (colabora.fuera
            ? <a href={colabora.href} target="_blank" rel="noopener noreferrer" className={`${boton} border border-slate-300 bg-white text-slate-900 hover:border-slate-900`}><HeartHandshake aria-hidden className="h-4 w-4" /> Colaborar</a>
            : <Link to={colabora.href} data-interno="" className={`${boton} border border-slate-300 bg-white text-slate-900 hover:border-slate-900`}><HeartHandshake aria-hidden className="h-4 w-4" /> Colaborar</Link>)}
        </div>
      </div>
    </section>
  );
}
