// ============================================================================
// CAMBIAR EL NOMBRE Y EL ICONO (2026-08-20, petición de Eugenio: «al hacer
// hover en un elemento debe aparecer 3 puntitos […] y permitir mediante una
// ventanita pop up cambiar el nombre e icono»).
// ============================================================================
// Una ventanita, no una página: renombrar algo es un gesto de dos segundos y
// mandarte a otro sitio para eso te saca de lo que estabas haciendo.
//
// LA REJILLA DE ICONOS SE MUDÓ (2026-08-26) a `ui/SelectorDeIcono`, el día que
// hizo falta la misma en la ventanita de editar una tarjeta de proyecto. Ahí
// está escrito por qué son iconos de trazo y no emojis.
import { useEffect, useState } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import Icono, { esImagen } from '../../ui/Icono';
import SelectorDeIcono from '../../ui/SelectorDeIcono';
import { iconoDeProyecto } from '../../../utils/iconoDeNombre';

export default function PopupRenombrar({ tipo, id, nombre, icono, onHecho, onCerrar }: {
  tipo: string;
  id: string;
  nombre: string;
  icono?: string | null;
  /** Se avisa con lo que quedó, para repintar sin recargar. */
  onHecho: (nombre: string, icono: string | null) => void;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState(nombre);
  // LO QUE SE ENSEÑA AQUÍ TIENE QUE SER LO QUE SE VE FUERA. Un proyecto con un
  // emoji antiguo guardado se pinta con su icono de trazo en el menú y en su
  // página (D90); si el popup siguiera enseñando el emoji, la misma cosa
  // tendría dos caras según por dónde la mires — y elegir «guardar» sin tocar
  // nada dejaría escrito algo distinto de lo que se ve.
  const [elegido, setElegido] = useState<string | null>(
    tipo === 'proyecto' ? iconoDeProyecto(icono, nombre) : (icono || null),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Escape cierra, como cualquier ventanita.
  useEffect(() => {
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [onCerrar]);

  const guardar = async () => {
    const n = texto.trim();
    if (!n) { setError('El nombre no puede quedar vacío.'); return; }
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch(`/api/elemento/${tipo}/${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: n, icono: elegido }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d?.error || 'No se ha podido guardar.'); return; }
      onHecho(n, elegido);
      onCerrar();
    } catch {
      setError('No se ha podido guardar.');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/30 backdrop-blur-[1px] grid place-items-center p-4"
      onClick={onCerrar}>
      <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-black text-slate-900">Nombre e icono</h2>
          <button onClick={onCerrar} disabled={guardando}
            className="ml-auto p-1 text-slate-400 hover:text-slate-600 disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); guardar(); }}>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 shrink-0 grid place-items-center rounded-xl bg-slate-100 overflow-hidden">
              {elegido ? <Icono valor={elegido} tamano={esImagen(elegido) ? 36 : 22} /> : <span className="text-lg text-slate-300">·</span>}
            </span>
            <input
              autoFocus
              value={texto}
              onChange={e => setTexto(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300"
            />
          </div>

          <div className="mt-3">
            <SelectorDeIcono valor={elegido} onElegir={setElegido} />
          </div>

          {error && (
            <p className="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800">{error}</p>
          )}

          <button type="submit" disabled={guardando || !texto.trim()}
            className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-40 transition-colors">
            {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
