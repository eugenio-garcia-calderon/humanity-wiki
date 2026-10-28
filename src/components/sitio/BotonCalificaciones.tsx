import { Eye, EyeOff } from 'lucide-react';
import { ponerCalificacionesOcultas, useCalificacionesOcultas } from '../../utils/calificaciones';

/** Mostrar u ocultar las calificaciones, en la barra del sitio (2026-10-28, `utils/calificaciones.ts`).
 *  Pequeño y escueto (Eugenio: «el botón de mostrarlas, más escueto, simple, pequeño»): el ojo y «Calificaciones»;
 *  la frase entera va en el título. Oscuro mientras las notas se ven. */
export default function BotonCalificaciones() {
  const ocultas = useCalificacionesOcultas();
  const texto = ocultas ? 'Mostrar las calificaciones' : 'Ocultar las calificaciones';
  return (
    <button type="button" onClick={() => ponerCalificacionesOcultas(!ocultas)} aria-pressed={!ocultas} title={texto} aria-label={texto} data-boton-calificaciones
      className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-bold transition-colors ${ocultas ? 'border-slate-200 bg-white text-slate-500 hover:text-slate-900' : 'border-slate-900 bg-slate-900 text-white hover:bg-slate-700'}`}>
      {ocultas ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">Calificaciones</span>
    </button>
  );
}
