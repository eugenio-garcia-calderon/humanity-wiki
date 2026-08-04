import { cn } from '../../utils/cn';

/**
 * Asa de redimensionado vertical: se coloca en el borde de un panel lateral.
 * `edge` es el borde FÍSICO del panel donde vive el asa — el mismo valor que
 * se le pasa a `usePanelWidth().startResize(edge)`, para que el centro visual
 * del asa quede exactamente sobre la línea divisoria y no se desplace hacia
 * dentro o fuera del panel.
 */
export default function ResizeHandle({
  onMouseDown,
  edge,
  active,
  className,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  edge: 'left' | 'right';
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      onMouseDown={onMouseDown}
      title="Arrastra para cambiar el ancho"
      className={cn(
        'group absolute inset-y-0 w-1.5 cursor-col-resize z-20 flex items-center justify-center select-none',
        edge === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2',
        className
      )}
    >
      <div
        className={cn(
          'w-[3px] h-10 rounded-full transition-colors',
          active ? 'bg-emerald-500' : 'bg-slate-200 group-hover:bg-emerald-400'
        )}
      />
    </div>
  );
}
