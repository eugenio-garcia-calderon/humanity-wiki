import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Menu, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// LOS BOTONES DE LA CABECERA (2026-10-20, Eugenio)
// ============================================================================
// «Que en las páginas, además de portada, título, icono y descripción, se
// puedan añadir botones; que cada botón abra un pop-up con una página nueva
// sin título; como un submenú de la página, en botones.»
//
// Cada botón ES una subpágina: se guarda en `config.botones` con la misma forma
// que un bloque «Página» (`{ tipo: 'subpagina', entityId }`). Por eso el
// servidor la trata como hija en todo —visibilidad heredada al publicar, su
// madre, el árbol del proyecto— sin una regla nueva (`bloquesSql.ts` los suma).
// El rótulo del botón es el título de esa página.

export type BotonCabecera = { id: string; tipo: 'subpagina'; entityId: string; pubTitulo?: string };
export type TallaBotones = 'xs' | 's' | 'sm' | 'm' | 'l' | 'xl';
export type EstiloBotones = 'relleno' | 'contorno' | 'suave';

export const botonesDe = (config: any): BotonCabecera[] =>
  (Array.isArray(config?.botones) ? config.botones : []).filter((b: any) => b && typeof b.entityId === 'string');

const TALLA: Record<TallaBotones, string> = { xs: 'h-7 px-2.5 text-[11px]', s: 'h-8 px-3 text-xs', sm: 'h-9 px-3.5 text-[13px]', m: 'h-10 px-4 text-sm', l: 'h-12 px-5 text-base', xl: 'h-14 px-6 text-lg' };
const ESTILO: Record<EstiloBotones, string> = {
  relleno: 'bg-slate-900 text-white hover:bg-slate-800',
  contorno: 'border-2 border-slate-900 text-slate-900 hover:bg-slate-50',
  suave: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
};

/** La fila de botones, bajo el título y la descripción. */
export function FilaBotones({ botones, talla = 'm', estilo = 'relleno', centrado = false, derecha = false, derechaAncho = false, sinMargen = false, enLinea = false, plegado = false, acento, onAbrir, onQuitar, onAnadir }: {
  botones: BotonCabecera[];
  talla?: TallaBotones;
  estilo?: EstiloBotones;
  centrado?: boolean;
  /** A la derecha, de derecha a izquierda: el primero, el de más a la derecha (2026-10-20). */
  derecha?: boolean;
  /** Lo mismo, pero sólo cuando la cabecera es ancha (en un teléfono, de izquierda a derecha). */
  derechaAncho?: boolean;
  sinMargen?: boolean;
  /** En una sola línea (la barra fija): sin saltar de renglón. */
  enLinea?: boolean;
  /** Todos los botones recogidos en un menú ☰ que se abre en cascada (2026-10-21). */
  plegado?: boolean;
  /** El color de la web publicada, para el estilo «relleno». */
  acento?: string | null;
  onAbrir: (b: BotonCabecera) => void;
  /** Sólo quien edita. */
  onQuitar?: (b: BotonCabecera) => void;
  onAnadir?: () => void;
}) {
  if (!botones.length && !onAnadir) return null;
  if (plegado) {
    return (
      <div className={cn('flex', !sinMargen && 'mt-3', centrado && 'justify-center', (derecha || derechaAncho) && 'justify-end')} role="navigation" aria-label="Apartados de la página">
        <MenuPlegado botones={botones} talla={talla} estilo={estilo} acento={acento} onAbrir={onAbrir} onQuitar={onQuitar} onAnadir={onAnadir} />
      </div>
    );
  }
  return (
    <div className={cn('flex items-center gap-2', enLinea ? 'flex-nowrap' : 'flex-wrap', !sinMargen && 'mt-3', centrado && 'justify-center', derecha && 'flex-row-reverse', derechaAncho && '@xl:flex-row-reverse')} role="navigation" aria-label="Apartados de la página">
      {botones.map(b => (
        <span key={b.id} className="group/boton relative shrink-0">
          <button type="button" onClick={() => onAbrir(b)}
            style={estilo === 'relleno' && acento ? { backgroundColor: acento } : undefined}
            className={cn('inline-flex items-center rounded-full font-bold shadow-sm transition-colors', TALLA[talla], ESTILO[estilo])}>
            {b.pubTitulo?.trim() || 'Sin título'}
          </button>
          {onQuitar && (
            <button type="button" onClick={() => onQuitar(b)} aria-label={`Quitar el botón ${b.pubTitulo || 'Sin título'}`} title="Quitar el botón"
              className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full bg-white text-slate-400 shadow ring-1 ring-slate-200 hover:text-rose-600 group-hover/boton:grid">
              <X className="h-3 w-3" />
            </button>
          )}
        </span>
      ))}
      {onAnadir && (botones.length > 0 || sinMargen) && (
        <button type="button" onClick={onAnadir} title="Añadir otro botón"
          className={cn('inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 font-bold text-slate-400 hover:border-emerald-400 hover:text-emerald-700', TALLA[talla])}>
          <Plus className="h-4 w-4" /> {botones.length ? 'Botón' : 'Añadir botón'}
        </button>
      )}
    </div>
  );
}

/**
 * EL MENÚ ☰ EN CASCADA (2026-10-21, Eugenio: «la posibilidad de un menú
 * colapsable con tres rayitas en vez de tantos botones, que se abra en
 * cascada»). Las opciones caen una detrás de otra. El panel va en un portal
 * con posición fija: dentro de la barra fija lo cortaría su `overflow`.
 */
function MenuPlegado({ botones, talla, estilo, acento, onAbrir, onQuitar, onAnadir }: {
  botones: BotonCabecera[]; talla: TallaBotones; estilo: EstiloBotones; acento?: string | null;
  onAbrir: (b: BotonCabecera) => void; onQuitar?: (b: BotonCabecera) => void; onAnadir?: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) { setListo(false); return; }
    const r = boton.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
    const raf = requestAnimationFrame(() => setListo(true));
    const fuera = (e: PointerEvent) => { if (!panel.current?.contains(e.target as Node) && !boton.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    const cerrar = () => setAbierto(false);
    window.addEventListener('pointerdown', fuera);
    window.addEventListener('keydown', tecla);
    window.addEventListener('scroll', cerrar, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', tecla); window.removeEventListener('scroll', cerrar, true); };
  }, [abierto]);
  const elegir = (b: BotonCabecera) => { setAbierto(false); onAbrir(b); };
  return (
    <>
      <button ref={boton} type="button" onClick={() => setAbierto(a => !a)} aria-expanded={abierto} aria-haspopup="menu" data-menu-plegado
        style={estilo === 'relleno' && acento ? { backgroundColor: acento } : undefined}
        className={cn('inline-flex items-center gap-2 rounded-full font-bold shadow-sm transition-colors', TALLA[talla], ESTILO[estilo])}>
        <Menu className="h-4 w-4" /> Menú
      </button>
      {abierto && pos && createPortal(
        <div ref={panel} role="menu" style={{ top: pos.top, right: pos.right }}
          className="fixed z-[9996] w-64 max-w-[calc(100vw-1rem)] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          {botones.map((b, i) => (
            <div key={b.id} style={{ transitionDelay: `${i * 45}ms` }}
              className={cn('group/op flex items-center rounded-xl transition-[opacity,transform] duration-200 ease-out', listo ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')}>
              <button type="button" role="menuitem" onClick={() => elegir(b)}
                className="min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-700 hover:bg-slate-50">
                {b.pubTitulo?.trim() || 'Sin título'}
              </button>
              {onQuitar && (
                <button type="button" onClick={() => { setAbierto(false); onQuitar(b); }} aria-label={`Quitar el botón ${b.pubTitulo || 'Sin título'}`}
                  className="mr-1 hidden h-7 w-7 place-items-center rounded-full text-slate-400 hover:text-rose-600 group-hover/op:grid"><X className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          {onAnadir && (
            <button type="button" onClick={() => { setAbierto(false); onAnadir(); }} style={{ transitionDelay: `${botones.length * 45}ms` }}
              className={cn('flex w-full items-center gap-1.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-400 transition-[opacity,transform] duration-200 hover:bg-slate-50 hover:text-emerald-700', listo ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')}>
              <Plus className="h-4 w-4" /> Añadir botón
            </button>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

/** La ventana que abre un botón: grande, en el centro, con la página dentro.
 *  EXPANDIR (2026-10-21, Eugenio: «una opción de expandir página: ahora se abre
 *  en un pop-up central»): ocupa toda la pantalla, y el contenido sabe que tiene
 *  sitio (`children` puede ser una función que recibe `grande`). */
export function VentanaBoton({ titulo, onCerrar, children, inicialGrande = false }: {
  titulo: string; onCerrar: () => void; children: ReactNode | ((grande: boolean) => ReactNode); inicialGrande?: boolean;
}) {
  const [grande, setGrande] = useState(inicialGrande);
  useEffect(() => { if (inicialGrande) setGrande(true); }, [inicialGrande]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [onCerrar]);
  const boton = 'grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-500 shadow ring-1 ring-slate-200 hover:text-slate-900';
  return createPortal(
    <div className={cn('fixed inset-0 z-[9995] flex items-center justify-center bg-slate-900/40', !grande && 'p-2 sm:p-6')} onClick={onCerrar}>
      <div role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()} data-ventana-boton={grande ? 'grande' : 'centro'}
        className={cn('relative flex flex-col overflow-hidden bg-white shadow-2xl', grande ? 'h-full w-full' : 'h-[min(92vh,60rem)] w-[min(72rem,100%)] rounded-3xl')}>
        <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
          <button type="button" onClick={() => setGrande(g => !g)} aria-label={grande ? 'Reducir la ventana' : 'Expandir a pantalla completa'}
            title={grande ? 'Reducir' : 'Expandir a pantalla completa'} className={boton}>
            {grande ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className={boton}><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{typeof children === 'function' ? children(grande) : children}</div>
      </div>
    </div>,
    document.body,
  );
}
