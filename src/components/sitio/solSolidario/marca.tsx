import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HandCoins, Heart } from 'lucide-react';
import { useSitio } from '../ContextoSitio';
import { columnaMadre } from '../SubproyectosSitio';
import { cn } from '../../../utils/cn';

// ============================================================================
// SOL SOLIDARIO, LA MARCA (2026-11-12, Eugenio en luzhumanidad.com)
// ============================================================================
// «Crea el proyecto de Sol Solidario con su página web, dentro de Luz &
// Humanidad, con el menú arriba y abajo el Sol Solidario… crea toda una marca
// alrededor… hazlo con una especie de submenú debajo de Luz Humanidad.»
//
// Sol Solidario is the branch of Light for Humanity that takes solar energy to
// people in energy poverty: shelters in Spain, rural communities without
// electricity in Latin America and Africa. It is a row of «Proyectos» (its
// projects hang from it as «subelementos») whose page is the app
// `sol-solidario` (src/pages/SolSolidario.tsx). This file is what every page
// of the brand shares: the logo, the colours and the sub-menu bar that sits
// right under the site's own header, on the brand page and on each of its
// projects (VistaPagina.tsx).

/** The brand page and its row. */
export const PAGINA_SOL_SOLIDARIO = 'KWSOLSOLIDARIO1';
export const FILA_SOL_SOLIDARIO = 'BDFSOLSOLIDAR01';

/** The sun with a heart: eight rays, the heart in the middle. Two colours, so it
 *  reads on white and on a dark photo alike. */
export function LogoSolSolidario({ className, corazon = '#0f172a' }: { className?: string; corazon?: string }) {
  const rayos = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {rayos.map(a => (
        <rect key={a} x="29.5" y="2" width="5" height="11" rx="2.5" fill="#f59e0b" transform={`rotate(${a} 32 32)`} />
      ))}
      <circle cx="32" cy="32" r="17" fill="#fbbf24" />
      <path d="M32 42.5c-.5 0-1-.2-1.4-.5C25.4 37.6 22 34.6 22 30.4c0-3.1 2.4-5.4 5.3-5.4 1.9 0 3.6 1 4.7 2.5 1.1-1.5 2.8-2.5 4.7-2.5 2.9 0 5.3 2.3 5.3 5.4 0 4.2-3.4 7.2-8.6 11.6-.4.3-.9.5-1.4.5z" fill={corazon} />
    </svg>
  );
}

/** The sections of the brand page, in order. The bar links to them. */
export const SECCIONES_SOL = [
  { id: 'impacto', texto: 'Impacto' },
  { id: 'proyectos', texto: 'Proyectos' },
  { id: 'pobreza', texto: 'Pobreza energética' },
  { id: 'herramientas', texto: 'Cómo lo hacemos' },
] as const;

/** Where the site's sticky header ends, so the bar can stick right under it. */
function useAltoCabecera() {
  const [alto, setAlto] = useState(0);
  useEffect(() => {
    const c = document.querySelector('[data-cabecera-sitio]') as HTMLElement | null;
    if (!c) return;
    const medir = () => setAlto(Math.round(c.getBoundingClientRect().height));
    medir();
    const o = new ResizeObserver(medir); o.observe(c);
    return () => o.disconnect();
  }, []);
  return alto;
}

/**
 * THE SUB-MENU BAR: the brand on the left, its sections in the middle and the
 * two ways to help (donate, lend) on the right. On the brand page the links
 * scroll to its sections; on a project of the brand they go to the brand page.
 */
export function BarraSolSolidario({ enPortada = false }: { enPortada?: boolean }) {
  const sitio = useSitio();
  const top = useAltoCabecera();
  const inicio = sitio ? sitio.enlacePagina(PAGINA_SOL_SOLIDARIO) : `/p/${PAGINA_SOL_SOLIDARIO}`;
  const a = (id: string) => (enPortada ? `#${id}` : `${inicio}#${id}`);
  const enlace = (id: string, contenido: React.ReactNode, clase: string) => enPortada
    ? <a href={`#${id}`} className={clase}>{contenido}</a>
    : <Link to={a(id)} className={clase}>{contenido}</Link>;
  return (
    <nav aria-label="Sol Solidario" data-barra-sol style={{ top, width: '100vw', marginLeft: 'calc(50% - 50vw)' }}
      className="sticky z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1840px] items-center gap-3 px-4 py-2 sm:px-6">
        {enPortada
          ? <a href="#inicio" className="flex shrink-0 items-center gap-2"><LogoSolSolidario className="h-8 w-8" /><span className="text-lg font-black tracking-tight text-slate-900">Sol Solidario</span></a>
          : <Link to={inicio} className="flex shrink-0 items-center gap-2"><LogoSolSolidario className="h-8 w-8" /><span className="text-lg font-black tracking-tight text-slate-900">Sol Solidario</span></Link>}
        <ul className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto md:flex [scrollbar-width:none]">
          {SECCIONES_SOL.map(s => (
            <li key={s.id}>{enlace(s.id, s.texto, 'block whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900')}</li>
          ))}
        </ul>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {enlace('presta', <><HandCoins className="h-4 w-4" /><span>Presta</span></>,
            'inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 px-3.5 text-sm font-black text-slate-800 hover:border-slate-500')}
          {enlace('dona', <><Heart className="h-4 w-4" fill="currentColor" /><span>Dona</span></>,
            cn('inline-flex h-9 items-center gap-1.5 rounded-full bg-amber-400 px-4 text-sm font-black text-slate-950 ring-1 ring-black/5 hover:bg-amber-300'))}
        </div>
      </div>
      {/* On a phone the sections go in a second row that scrolls sideways. */}
      <ul className="flex items-center gap-1 overflow-x-auto px-3 pb-2 md:hidden [scrollbar-width:none]">
        {SECCIONES_SOL.map(s => (
          <li key={s.id} className="shrink-0">{enlace(s.id, s.texto, 'block whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-[13px] font-bold text-slate-700')}</li>
        ))}
      </ul>
    </nav>
  );
}

/** On a project page: the bar, if the project hangs from Sol Solidario («Elemento madre»). */
export function BarraSiEsDeSol({ filaId, tablaId }: { filaId: string; tablaId: string }) {
  const [es, setEs] = useState(false);
  useEffect(() => {
    let vivo = true;
    fetch(`/api/bd/tablas/${encodeURIComponent(tablaId)}?lectura=1`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(t => {
        if (!vivo || !t) return;
        const m = columnaMadre(t);
        const f = (t.filas || []).find((x: any) => x.id === filaId);
        const v = f?.celdas?.[m]?.valor;
        setEs(Array.isArray(v) && v.map(String).includes(FILA_SOL_SOLIDARIO));
      }).catch(() => {});
    return () => { vivo = false; };
  }, [filaId, tablaId]);
  return es ? <div className="-mt-4 mb-6"><BarraSolSolidario /></div> : null;
}
