import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ImageDown, FolderOpen, X } from 'lucide-react';
import { LIMITE_IMAGEN, tamanoLegible } from '../../utils/prepararImagen';

// ============================================================================
// «ESTA IMAGEN PESA MUCHO» (2026-10-02)
// ============================================================================
// Eugenio: «si el usuario sube un archivo muy grande, dale la opción de
// escoger otro archivo o comprimir la imagen».
//
// Se abre DESDE `subirArchivo`, que no es un componente, así que se monta por
// su cuenta encima de todo y devuelve una promesa con lo que se eligió. Así
// las quince pantallas que suben imágenes lo tienen sin cambiar ni una.
//
// «Elegir otro» abre el selector de archivos en el mismo clic: el navegador
// sólo deja abrirlo como respuesta directa a un gesto de la persona.

export type Eleccion = { tipo: 'comprimir' } | { tipo: 'otro'; archivo: File } | { tipo: 'cancelar' };

export function preguntarImagenGrande(archivo: File): Promise<Eleccion> {
  return new Promise(resolver => {
    const caja = document.createElement('div');
    document.body.appendChild(caja);
    const raiz = createRoot(caja);
    const cerrar = (e: Eleccion) => { raiz.unmount(); caja.remove(); resolver(e); };
    raiz.render(<Dialogo archivo={archivo} onElegir={cerrar} />);
  });
}

function Dialogo({ archivo, onElegir }: { archivo: File; onElegir: (e: Eleccion) => void }) {
  const [vista] = useState(() => URL.createObjectURL(archivo));
  const elegirOtro = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.heic,.heif';
    input.onchange = () => { const f = input.files?.[0]; if (f) onElegir({ tipo: 'otro', archivo: f }); };
    input.click();
  };
  return (
    <div className="fixed inset-0 z-[10050] bg-slate-900/50 flex items-center justify-center p-4" onClick={() => onElegir({ tipo: 'cancelar' })}>
      <div role="dialog" aria-label="La imagen pesa mucho" onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <img src={vista} alt="" className="w-16 h-16 rounded-xl object-cover bg-slate-100 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-slate-800">Esta imagen pesa mucho</h2>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              Ocupa <b>{tamanoLegible(archivo.size)}</b> y el máximo recomendado es {tamanoLegible(LIMITE_IMAGEN)}:
              la página tardaría en cargar, sobre todo en el móvil.
            </p>
          </div>
          <button onClick={() => onElegir({ tipo: 'cancelar' })} aria-label="Cancelar"
            className="w-9 h-9 -mr-2 -mt-2 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          <button autoFocus onClick={() => onElegir({ tipo: 'comprimir' })}
            className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-bold inline-flex items-center justify-center gap-2 hover:bg-slate-800">
            <ImageDown className="w-4 h-4" /> Comprimir la imagen
          </button>
          <button onClick={elegirOtro}
            className="w-full h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 inline-flex items-center justify-center gap-2 hover:border-slate-300">
            <FolderOpen className="w-4 h-4" /> Elegir otro archivo
          </button>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Comprimir la deja en un tamaño adecuado para la web sin que se note en la pantalla. La original no se toca.
        </p>
      </div>
    </div>
  );
}
