import { Eye, EyeOff } from 'lucide-react';
import { ponerCalificacionesOcultas, useCalificacionesOcultas } from '../../utils/calificaciones';

/** «Ocultar calificaciones» / «Mostrar calificaciones», en la barra del sitio (2026-10-28, `utils/calificaciones.ts`). */
export default function BotonCalificaciones() {
  const ocultas = useCalificacionesOcultas();
  const texto = ocultas ? 'Mostrar calificaciones' : 'Ocultar calificaciones';
  return (
    <button type="button" onClick={() => ponerCalificacionesOcultas(!ocultas)} aria-pressed={!ocultas} title={texto} aria-label={texto} data-boton-calificaciones
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold transition-colors ${ocultas ? 'bg-slate-900 text-white hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
      {ocultas ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      <span className="hidden whitespace-nowrap lg:inline">{texto}</span>
    </button>
  );
}
