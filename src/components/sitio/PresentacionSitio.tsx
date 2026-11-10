import { Link } from 'react-router-dom';
import { useSitio, type Sitio } from './ContextoSitio';
import { TextoEnLinea } from '../tablas/TarjetaPortada';

// ============================================================================
// LA PRESENTACIÓN DE LA PORTADA (2026-11-07, luzhumanidad.com)
// ============================================================================
// Lo primero que se ve, encima de los proyectos. Desde el 2026-11-09 («con menos
// texto y menos números, más elegante y simple, y que ocupe menos para que se vean
// las tarjetas») es una sola línea: el titular y el botón de colaborar. Sin caja,
// sin cifras y sin «Ver proyectos», porque las tarjetas ya están a la vista.
//
//   · El titular es `config.sitio.portada.titular` de la raíz; sin él, el lema.
//   · El lema (`config.sitio.portada.lema`) sigue siendo la frase larga de la
//     tarjeta al compartir (`seoEscaparate.ts`): el titular no la cambia.
//   · «Colaborar» lleva a `config.sitio.colabora` y no se enseña sin esa página.

/** La frase de la presentación: el lema propio o la descripción del sitio tras los dos puntos. */
export function lemaDe(cfg: any): string {
  const propio = cfg?.sitio?.portada?.lema;
  if (typeof propio === 'string' && propio.trim()) return propio.trim();
  const d = String(cfg?.sitio?.seo?.descripcion || cfg?.descripcion || '').trim();
  const resto = d.includes(':') ? d.slice(d.indexOf(':') + 1).trim() : d;
  return resto ? resto.charAt(0).toUpperCase() + resto.slice(1) : '';
}

/** El titular de la portada: el suyo o, si no hay, el lema. */
export function titularDe(cfg: any): string {
  const propio = cfg?.sitio?.portada?.titular;
  return typeof propio === 'string' && propio.trim() ? propio.trim() : lemaDe(cfg);
}

/** Adónde lleva «Colaborar»: una dirección, una página del sitio (su id) o `{ url }` / `{ pagina }`. */
export function enlaceColabora(v: unknown, sitio: Sitio | null): { href: string; fuera: boolean } | null {
  const pagina = (id: string) => ({ href: sitio ? sitio.enlacePagina(id) : `/p/${id}`, fuera: false });
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    if (/^https?:\/\//.test(s)) return { href: s, fuera: true };
    // Una ruta del sitio; «//otro-sitio.com» no lo es (el navegador la lleva fuera).
    if (/^\/(?!\/)/.test(s)) return { href: s, fuera: false };
    if (/^[A-Z0-9_]{6,40}$/.test(s)) return pagina(s);
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

export default function PresentacionSitio({ cfg, edicion }: { cfg: any; edicion?: { titular: string; onTitular: (v: string) => void } }) {
  const sitio = useSitio();
  const titular = edicion ? edicion.titular || titularDe(cfg) : titularDe(cfg);
  const colabora = enlaceColabora(cfg?.sitio?.colabora, sitio);
  if (!titular && !colabora) return null;

  const boton = 'inline-flex h-11 shrink-0 items-center self-start rounded-full bg-slate-900 px-6 text-sm font-bold text-white outline-none transition-colors hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:self-auto';
  return (
    <section aria-label="Presentación" className="flex flex-col gap-4 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:pt-5">
      {edicion ? (
        <TextoEnLinea valor={titular} onGuardar={edicion.onTitular} etiqueta="Titular de la portada"
          className="flex-1 text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-[2.25rem]" />
      ) : titular && (
        <p className="max-w-[34ch] text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-slate-900 [text-wrap:balance] sm:max-w-none sm:text-[2.25rem]">
          {titular}
        </p>
      )}
      {colabora && edicion ? <span className={boton}>Colaborar</span> : colabora && (colabora.fuera
        ? <a href={colabora.href} target="_blank" rel="noopener noreferrer" className={boton}>Colaborar</a>
        : <Link to={colabora.href} data-interno="" className={boton}>Colaborar</Link>)}
    </section>
  );
}
