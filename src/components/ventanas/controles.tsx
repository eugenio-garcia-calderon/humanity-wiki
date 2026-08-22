// ============================================================================
// LOS BOTONES DE UNA VENTANA, UNA SOLA VEZ (2026-08-22)
// ============================================================================
// Eugenio, con una captura de dos botones —la flecha diagonal y la ✕—: «que
// permita luego expandirse a ventana superior con un botón tipo como el que te
// adjunto, también que permita cerrarlo con una X. Haz esto de la expansión
// para todas las ventanas que veas programadas».
//
// «PARA TODAS LAS VENTANAS» es la parte importante, y es la razón de que esto
// sea un fichero y no tres copias. Hoy hay tres clases de ventana en la
// plataforma —las del escritorio, el panel lateral y el navegador— y cada una
// dibujaba sus botones a mano. Tres dibujos del mismo gesto es cómo acaban
// significando cosas distintas: el escritorio usaba un cuadrado para maximizar
// y el panel lateral no tenía forma de agrandarse.
//
// POR QUÉ LA FLECHA DIAGONAL Y NO EL CUADRADO. Un cuadrado dice «esta ventana»;
// dos flechas que se separan dicen «hazla más grande», y las mismas flechas
// hacia dentro dicen «devuélvela». El dibujo cuenta el gesto y su vuelta, que
// es justo lo que hace el botón.
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export function ControlesVentana({ expandida, onExpandir, onMinimizar, onCerrar, tono = 'claro' }: {
  expandida: boolean;
  onExpandir: () => void;
  /** Solo las ventanas del escritorio se minimizan: el panel lateral no tiene
   *  barra donde quedarse esperando, así que allí no se pinta. Un botón que no
   *  lleva a ninguna parte enseña a no pulsar los botones. */
  onMinimizar?: () => void;
  onCerrar: () => void;
  /** `oscuro` para barras de fondo oscuro (el visor 3D). */
  tono?: 'claro' | 'oscuro';
}) {
  const base = cn('w-7 h-7 grid place-items-center rounded-lg transition-colors shrink-0',
    tono === 'oscuro' ? 'text-white/70 hover:bg-white/15 hover:text-white' : 'text-slate-500 hover:bg-slate-200');
  return (
    <>
      {onMinimizar && (
        <button onClick={onMinimizar} title="Minimizar" aria-label="Minimizar" className={base}>
          <Minus className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={onExpandir}
        title={expandida ? 'Devolverla a su sitio' : 'Expandir a ventana grande'}
        aria-label={expandida ? 'Devolverla a su sitio' : 'Expandir a ventana grande'}
        className={base}
      >
        {expandida ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>
      <button
        onClick={onCerrar}
        title="Cerrar"
        aria-label="Cerrar"
        className={cn(base, tono === 'oscuro' ? 'hover:bg-rose-500/30 hover:text-rose-200' : 'hover:bg-rose-100 hover:text-rose-600')}
      >
        <X className="w-4 h-4" />
      </button>
    </>
  );
}
