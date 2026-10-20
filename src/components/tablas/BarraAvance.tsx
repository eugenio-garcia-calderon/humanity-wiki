import { useState } from 'react';
import { cn } from '../../utils/cn';

// ============================================================================
// LA BARRA DE AVANCE DE UN PORCENTAJE (2026-10-18, Eugenio)
// ============================================================================
// «Que la propiedad de porcentaje completado o de avance se pueda poner como una
// barra: verde al 100 %, azul entre el 50 y el 100, y naranja tirando a amarillo
// entre el 0 y el 50. Un selector en el editor para moverla de 10 en 10. Que se
// vea en la galería y que sea gorda al ampliar la tarjeta, como un crowdfunding.»
//
// Una columna «porcentaje» se pinta así salvo que se apague en su editor
// (`config.barra === false`): un porcentaje de comisión, por ejemplo, no es un
// avance. El valor se guarda como siempre, en fracción (0,25 = 25 %).

/** ¿Esta columna se enseña como barra? */
export const esBarra = (c: { tipo: string; config?: any }) => c.tipo === 'porcentaje' && c.config?.barra !== false;

/** El color según lo que falta: completado, más de la mitad, menos de la mitad. */
export const colorAvance = (pct: number) =>
  pct >= 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-sky-500' : 'bg-amber-400';

const aPct = (fraccion: number) => Math.max(0, Math.round(fraccion * 100));

/** El color de la cifra, a juego con la barra. */
const colorCifra = (pct: number) => (pct >= 100 ? 'text-emerald-600' : pct >= 50 ? 'text-sky-600' : 'text-amber-600');

/** La cifra: el número grande y el «%» pegado, sin partirse nunca en dos líneas
 *  (2026-10-18, Eugenio: «el 100 % sale con el % debajo»). */
function Cifra({ pct, grande = false }: { pct: number; grande?: boolean }) {
  return (
    <span className={cn('inline-flex shrink-0 items-baseline whitespace-nowrap font-black tabular-nums leading-none', colorCifra(pct), grande ? 'text-3xl' : 'text-xs')}>
      {pct}<span className={cn('font-bold', grande ? 'ml-0.5 text-base' : 'ml-px text-[10px]')}>%</span>
    </span>
  );
}

/** La barra. `grande` es la de la página del elemento: gruesa y con la cifra grande. */
export function BarraAvance({ fraccion, grande = false, centrada = false }: { fraccion: number; grande?: boolean; centrada?: boolean }) {
  const pct = aPct(fraccion);
  const ancho = `${Math.min(100, pct)}%`;
  if (grande) {
    return (
      <div className="w-full min-w-[13rem] py-1" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct} % completado`}>
        <div className={cn('mb-2 flex items-baseline gap-2', centrada ? 'justify-center' : 'justify-between')}>
          <Cifra pct={pct} grande />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{pct >= 100 ? 'completado' : 'de avance'}</span>
        </div>
        <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-200/70 shadow-inner">
          <div className={cn('h-full rounded-full transition-[width] duration-500', colorAvance(pct))} style={{ width: ancho }} />
        </div>
      </div>
    );
  }
  // En la tarjeta: la barra a lo ancho y la cifra a su derecha, en una sola línea.
  return (
    <div className="flex w-full min-w-[6rem] items-center gap-2" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${pct} % completado`}>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/80">
        <div className={cn('h-full rounded-full', colorAvance(pct))} style={{ width: ancho }} />
      </div>
      <Cifra pct={pct} />
    </div>
  );
}

/** El selector: de 0 a 100 de 10 en 10. Guarda al soltar (o con las flechas). */
export function SelectorAvance({ fraccion, grande = false, onGuardar, onCerrar }: {
  fraccion: number | null; grande?: boolean; onGuardar: (pct: number) => void; onCerrar: () => void;
}) {
  const [v, setV] = useState(() => Math.round(aPct(fraccion ?? 0) / 10) * 10);
  return (
    <div className={cn('w-full px-2 py-1.5', grande && 'py-2')} onClick={e => e.stopPropagation()}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={cn('font-black tabular-nums text-slate-900', grande ? 'text-xl' : 'text-xs')}>{v} %</span>
        <button type="button" onClick={onCerrar} className="text-[11px] font-bold text-slate-400 hover:text-slate-700">Listo</button>
      </div>
      <input type="range" min={0} max={100} step={10} value={v} autoFocus aria-label="Porcentaje completado"
        onChange={e => setV(Number(e.target.value))}
        onPointerUp={() => onGuardar(v)}
        onKeyUp={e => { if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End') onGuardar(v); if (e.key === 'Enter' || e.key === 'Escape') onCerrar(); }}
        className={cn('w-full cursor-pointer', grande ? 'h-3' : 'h-2',
          v >= 100 ? 'accent-emerald-500' : v >= 50 ? 'accent-sky-500' : 'accent-amber-400')} />
      <div className="mt-0.5 flex justify-between text-[9px] font-bold text-slate-300"><span>0</span><span>50</span><span>100</span></div>
    </div>
  );
}
