import { useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { subirArchivo } from '../../utils/subir';
import { cn } from '../../utils/cn';

// ============================================================================
// AJUSTES DE LA PÁGINA (2026-09-30)
// ============================================================================
// Lo que decide cómo se ve la página cuando se publica, y cómo aparece cuando
// alguien la comparte en WhatsApp o la encuentra en Google. Vive en
// `config` de la página, junto a sus bloques, portada e icono.
//
// Eugenio: «quita por defecto el autor de la página o al menos da la opción
// de mostrarlo o no en configuración de la página». Por eso el autor y la
// fecha nacen APAGADOS: una web no lleva firma a menos que su dueño la quiera.

export type Ajustes = {
  mostrarAutor?: boolean;
  mostrarFecha?: boolean;
  anchoCompleto?: boolean;
  /** Para buscadores y para la vista previa al compartir. */
  descripcion?: string;
  /** La imagen de la vista previa. Sin ella, la portada. */
  imagenCompartir?: string;
};

/** Los campos de `config` que son ajustes, para copiarlos sin arrastrar más. */
export const CLAVES_AJUSTES: (keyof Ajustes)[] = ['mostrarAutor', 'mostrarFecha', 'anchoCompleto', 'descripcion', 'imagenCompartir'];

export default function AjustesPagina({ ajustes, portada, titulo, onCambio, onCerrar }: {
  ajustes: Ajustes;
  portada: string | null;
  titulo: string;
  onCambio: (a: Ajustes) => void;
  onCerrar: () => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const pon = (parcial: Partial<Ajustes>) => onCambio({ ...ajustes, ...parcial });
  const imagen = ajustes.imagenCompartir || portada;

  const subir = async (f: File) => {
    setSubiendo(true); setFallo(null);
    const r = await subirArchivo(f);
    setSubiendo(false);
    if (r.error) { setFallo(r.error); return; }
    pon({ imagenCompartir: r.url });
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/20" onClick={onCerrar}>
      <aside onClick={e => e.stopPropagation()} role="dialog" aria-label="Ajustes de la página"
        className="w-full max-w-sm h-full overflow-y-auto bg-white shadow-2xl p-5 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800">Ajustes de la página</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="w-11 h-11 grid place-items-center text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <section className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-2">Cómo se ve publicada</p>
          <Interruptor etiqueta="Mostrar el autor" ayuda="Tu nombre y tu foto bajo el título."
            valor={!!ajustes.mostrarAutor} onCambio={v => pon({ mostrarAutor: v })} />
          <Interruptor etiqueta="Mostrar la fecha" ayuda="La fecha de la última edición."
            valor={!!ajustes.mostrarFecha} onCambio={v => pon({ mostrarFecha: v })} />
          <Interruptor etiqueta="Ancho completo" ayuda="Usa todo el ancho de la pantalla, para galerías y tablas grandes."
            valor={!!ajustes.anchoCompleto} onCambio={v => pon({ anchoCompleto: v })} />
        </section>

        <section className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Al compartir y en Google</p>
          <label className="block">
            <span className="text-xs font-bold text-slate-700">Descripción</span>
            <textarea value={ajustes.descripcion || ''} maxLength={300} rows={3}
              onChange={e => pon({ descripcion: e.target.value })}
              placeholder="Si la dejas vacía se usa el primer párrafo de la página."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-400 resize-none" />
            <span className="text-[11px] text-slate-400">{(ajustes.descripcion || '').length}/300</span>
          </label>

          <div>
            <span className="text-xs font-bold text-slate-700">Imagen al compartir</span>
            <div className="mt-1 flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 h-11 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-slate-300 cursor-pointer">
                {subiendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                {ajustes.imagenCompartir ? 'Cambiar' : 'Elegir imagen'}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && subir(e.target.files[0])} />
              </label>
              {ajustes.imagenCompartir && (
                <button onClick={() => pon({ imagenCompartir: undefined })}
                  className="h-11 px-3 text-xs font-bold text-slate-400 hover:text-rose-600">Quitar</button>
              )}
            </div>
            {fallo && <p className="mt-1 text-xs font-bold text-rose-600">{fallo}</p>}
          </div>

          {/* Cómo quedará el enlace en WhatsApp o LinkedIn. */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="aspect-[1.91/1] bg-slate-50 grid place-items-center overflow-hidden">
              {imagen ? <img src={imagen} alt="" className="w-full h-full object-cover" />
                : <span className="text-[11px] text-slate-300">Sin imagen</span>}
            </div>
            <div className="p-3">
              <p className="text-sm font-bold text-slate-800 truncate">{titulo || 'Sin título'}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{ajustes.descripcion || 'El primer párrafo de la página.'}</p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Interruptor({ etiqueta, ayuda, valor, onCambio }: {
  etiqueta: string; ayuda: string; valor: boolean; onCambio: (v: boolean) => void;
}) {
  return (
    <button role="switch" aria-checked={valor} onClick={() => onCambio(!valor)}
      className="w-full flex items-center gap-3 py-2 text-left">
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-slate-700">{etiqueta}</span>
        <span className="block text-[11px] text-slate-400">{ayuda}</span>
      </span>
      <span className={cn('relative w-9 h-5 rounded-full transition-colors shrink-0', valor ? 'bg-emerald-500' : 'bg-slate-200')}>
        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', valor ? 'left-[1.125rem]' : 'left-0.5')} />
      </span>
    </button>
  );
}
