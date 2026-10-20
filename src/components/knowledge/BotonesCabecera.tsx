import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
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
export type TallaBotones = 'xs' | 's' | 'm' | 'l' | 'xl';
export type EstiloBotones = 'relleno' | 'contorno' | 'suave';

export const botonesDe = (config: any): BotonCabecera[] =>
  (Array.isArray(config?.botones) ? config.botones : []).filter((b: any) => b && typeof b.entityId === 'string');

const TALLA: Record<TallaBotones, string> = { xs: 'h-7 px-2.5 text-[11px]', s: 'h-8 px-3 text-xs', m: 'h-10 px-4 text-sm', l: 'h-12 px-5 text-base', xl: 'h-14 px-6 text-lg' };
const ESTILO: Record<EstiloBotones, string> = {
  relleno: 'bg-slate-900 text-white hover:bg-slate-800',
  contorno: 'border-2 border-slate-900 text-slate-900 hover:bg-slate-50',
  suave: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
};

/** La fila de botones, bajo el título y la descripción. */
export function FilaBotones({ botones, talla = 'm', estilo = 'relleno', centrado = false, derecha = false, sinMargen = false, enLinea = false, acento, onAbrir, onQuitar, onAnadir }: {
  botones: BotonCabecera[];
  talla?: TallaBotones;
  estilo?: EstiloBotones;
  centrado?: boolean;
  /** A la derecha, de derecha a izquierda: el primero, el de más a la derecha (2026-10-20). */
  derecha?: boolean;
  sinMargen?: boolean;
  /** En una sola línea (la barra fija): sin saltar de renglón. */
  enLinea?: boolean;
  /** El color de la web publicada, para el estilo «relleno». */
  acento?: string | null;
  onAbrir: (b: BotonCabecera) => void;
  /** Sólo quien edita. */
  onQuitar?: (b: BotonCabecera) => void;
  onAnadir?: () => void;
}) {
  if (!botones.length && !onAnadir) return null;
  return (
    <div className={cn('flex items-center gap-2', enLinea ? 'flex-nowrap' : 'flex-wrap', !sinMargen && 'mt-3', centrado && 'justify-center', derecha && 'flex-row-reverse')} role="navigation" aria-label="Apartados de la página">
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

/** La ventana que abre un botón: grande, en el centro, con la página dentro. */
export function VentanaBoton({ titulo, onCerrar, children }: { titulo: string; onCerrar: () => void; children: ReactNode }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', tecla); document.body.style.overflow = antes; };
  }, [onCerrar]);
  return createPortal(
    <div className="fixed inset-0 z-[9995] flex items-center justify-center bg-slate-900/40 p-2 sm:p-6" onClick={onCerrar}>
      <div role="dialog" aria-label={titulo} onClick={e => e.stopPropagation()}
        className="relative flex h-[min(92vh,60rem)] w-[min(72rem,100%)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <button type="button" onClick={onCerrar} aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-500 shadow ring-1 ring-slate-200 hover:text-slate-900"><X className="h-5 w-5" /></button>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
