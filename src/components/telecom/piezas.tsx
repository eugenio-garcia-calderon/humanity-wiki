import { cn } from '../../utils/cn';

// ============================================================================
// LAS PIEZAS QUE SE REPITEN EN UNA LLAMADA (2026-08-22)
// ============================================================================
// La regla de dos de `src/components/ui/CLAUDE.md`: el botón redondo de una
// llamada sale seis veces entre el timbre y el panel. Vive aquí y no en
// `ui/core.tsx` porque es de esta herramienta —un botón de colgar no tiene
// sentido en una tabla de indicadores— y `ui/` es para lo que usa todo el
// mundo. Si algún día lo pide otra pantalla, sube.

export function BotonRedondo({
  icono: Icono, etiqueta, onClick, tono = 'neutro', grande, activo,
}: {
  icono: any;
  etiqueta: string;
  onClick: () => void;
  tono?: 'neutro' | 'colgar' | 'contestar' | 'apagado';
  grande?: boolean;
  activo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={etiqueta}
      aria-label={etiqueta}
      aria-pressed={activo}
      className={cn(
        'grid place-items-center rounded-full transition-colors shrink-0',
        grande ? 'w-14 h-14' : 'w-11 h-11',
        tono === 'colgar' && 'bg-rose-600 text-white hover:bg-rose-700',
        tono === 'contestar' && 'bg-emerald-600 text-white hover:bg-emerald-700',
        // APAGADO ES ROJO Y NO GRIS, y es una decisión: el micrófono silenciado
        // es la causa número uno de «no te oigo» en cualquier videollamada del
        // mundo. Tiene que gritar, no camuflarse.
        tono === 'apagado' && 'bg-rose-100 text-rose-700 hover:bg-rose-200',
        tono === 'neutro' && 'bg-white/15 text-white hover:bg-white/25 backdrop-blur',
      )}
    >
      <Icono className={grande ? 'w-6 h-6' : 'w-5 h-5'} />
    </button>
  );
}

/** «4:07». Los segundos de una llamada se leen como un reloj o no se leen. */
export const reloj = (s: number) => {
  const seg = Math.max(0, Math.floor(s));
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const r = seg % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`;
};

/** La foto de alguien, o sus iniciales. Sale en el timbre, en el panel y en el
 *  historial. */
export function Cara({ nombre, avatar, tam = 'md' }: { nombre: string; avatar?: string | null; tam?: 'sm' | 'md' | 'lg' }) {
  const clases = tam === 'lg' ? 'w-24 h-24 text-2xl' : tam === 'sm' ? 'w-9 h-9 text-xs' : 'w-14 h-14 text-lg';
  if (avatar) return <img src={avatar} alt="" className={cn(clases, 'rounded-full object-cover shrink-0')} />;
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  return (
    <span className={cn(clases, 'rounded-full bg-slate-200 text-slate-600 grid place-items-center font-black shrink-0')}>
      {iniciales || '?'}
    </span>
  );
}
