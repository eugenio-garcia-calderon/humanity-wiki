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
  tono?: 'neutro' | 'colgar' | 'contestar' | 'apagado' | 'claro';
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
        // `neutro` es blanco translúcido: se ve sobre el vídeo oscuro del panel
        // y **desaparece** sobre la tarjeta blanca del timbre. `claro` es el
        // mismo botón para fondo claro; sin él, «Solo voz» era un botón
        // invisible con su etiqueta debajo.
        tono === 'claro' && 'bg-slate-100 text-slate-600 hover:bg-slate-200',
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

// ── LAS BARRITAS DE COBERTURA ───────────────────────────────────────────────
// Tres barras, como las del móvil, y por la misma razón: es el único dibujo que
// todo el mundo ya sabe leer sin que nadie se lo explique. Un número («2,4 % de
// pérdida») no lo entiende nadie que no sepa qué es un paquete, y un semáforo de
// colores sin forma no se distingue si no distingues los colores.
//
// Por eso las barras cambian de ALTURA además de color: quien no ve bien el
// rojo y el verde sigue viendo que hay una barra encendida en vez de tres.
export function Cobertura({ calidad, className }: { calidad: string; className?: string }) {
  if (calidad === 'sin-datos') return null;
  const encendidas = calidad === 'buena' ? 3 : calidad === 'regular' ? 2 : 1;
  const color =
    calidad === 'buena' ? 'bg-emerald-400'
    : calidad === 'regular' ? 'bg-amber-400'
    : 'bg-rose-400';
  const titulo =
    calidad === 'buena' ? 'La conexión va bien'
    : calidad === 'regular' ? 'La conexión va justa: puede que se corte alguna palabra'
    : 'La conexión va mal: se están perdiendo palabras';
  return (
    <span
      className={cn('inline-flex items-end gap-[2px] h-3', className)}
      title={titulo}
      role="img"
      aria-label={titulo}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={cn(
            'w-[3px] rounded-[1px] transition-colors',
            i === 0 ? 'h-1.5' : i === 1 ? 'h-2.5' : 'h-3',
            i < encendidas ? color : 'bg-white/25',
          )}
        />
      ))}
    </span>
  );
}

/**
 * Una frase que aparece encima de la llamada cuando pasa algo.
 *
 * Un solo sitio para los tres avisos —conexión mala, reconectando, y el error
 * suelto— porque si cada uno se pintara donde le tocara acabarían solapándose:
 * la conexión se pone mala JUSTO antes de reconectar, siempre.
 */
export function Aviso({ tono, children }: { tono: 'malo' | 'aviso'; children: any }) {
  return (
    <p
      role="status"
      className={cn(
        'px-3 py-1.5 rounded-full text-[11px] font-bold text-center shadow-lg backdrop-blur',
        'animate-in fade-in slide-in-from-top-1 duration-200',
        tono === 'malo' ? 'bg-rose-500/95 text-white' : 'bg-amber-400/95 text-slate-900',
      )}
    >
      {children}
    </p>
  );
}
