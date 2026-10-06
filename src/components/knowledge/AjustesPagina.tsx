import { useState } from 'react';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { subirArchivo } from '../../utils/subir';
import { cn } from '../../utils/cn';
import type { Cabecera } from './CabeceraPagina';
import { textoLectura, type Letra, type Ancho } from '../../utils/ajustesPagina';

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
  /** El título no se enseña en la página publicada (2026-10-02). Sigue en la
   *  pestaña, en Google y para los lectores de pantalla. */
  ocultarTitulo?: boolean;
  mostrarFecha?: boolean;
  /** Ya no se usa (se leía antes de `ancho`). */
  anchoCompleto?: boolean;
  /** 2026-10-06 (#29, como Notion). Cómo se ve la página, en el editor y
   *  publicada (`utils/ajustesPagina.ts`). Sin valor: letra de siempre,
   *  tamaño normal y ancho COMPLETO, que es lo que ya tenían todas. */
  letra?: Letra;
  textoPequeno?: boolean;
  ancho?: Ancho;
  /** Nadie la edita hasta que se desbloquee. Es un seguro contra los
   *  descuidos de quien edita (como el candado de Notion), no una barrera de
   *  seguridad: quien puede editar la página puede desbloquearla. */
  bloqueada?: boolean;
  /** Publicada, «320 palabras · 2 min de lectura» bajo el título. */
  tiempoLectura?: boolean;
  /** Para buscadores y para la vista previa al compartir. */
  descripcion?: string;
  /** La imagen de la vista previa. Sin ella, la portada. */
  imagenCompartir?: string;
  /** Cómo se colocan imagen, icono y título. Ver `CabeceraPagina.tsx`. */
  cabecera?: Cabecera;
  /** La descripción que va bajo el título (2026-09-30). Distinta de
   *  `descripcion`, que es para Google y las redes y no se ve en la página. */
  subtitulo?: string;
  /** Ya no se usa (2026-10-01: si está escrita, es pública). Se lee para
   *  poder borrarlo de las páginas que lo tenían. */
  subtituloOculto?: boolean;
  /** El menú y el pie de la web (2026-10-02). Ver `sitio/sitioWeb.ts`. */
  sitio?: any;
};

/** Los campos de `config` que son ajustes, para copiarlos sin arrastrar más. */
export const CLAVES_AJUSTES: (keyof Ajustes)[] = ['mostrarAutor', 'ocultarTitulo', 'mostrarFecha', 'anchoCompleto', 'letra', 'textoPequeno', 'ancho', 'bloqueada', 'tiempoLectura', 'descripcion', 'imagenCompartir', 'cabecera', 'subtitulo', 'subtituloOculto', 'sitio'];

export default function AjustesPagina({ ajustes, portada, titulo, resumen, onCambio, onCerrar }: {
  ajustes: Ajustes;
  portada: string | null;
  titulo: string;
  /** Palabras y minutos de lectura de la página ahora mismo. */
  resumen?: { palabras: number; caracteres: number; minutos: number };
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

        {/* ══ LA PÁGINA, COMO NOTION (2026-10-06, #29) ═══════════════════════
            Letra, tamaño y ancho valen en el editor y publicada. */}
        <section className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Estilo de la página</p>
          <div>
            <span className="text-xs font-bold text-slate-700">Tipo de letra</span>
            <div role="radiogroup" aria-label="Tipo de letra" className="mt-1 grid grid-cols-3 gap-1.5">
              {([['defecto', 'Ag', 'Por defecto', ''], ['serif', 'Ag', 'Serif', 'font-serif'], ['mono', 'Ag', 'Mono', 'font-mono']] as const).map(([v, muestra, nombre, clase]) => (
                <button key={v} type="button" role="radio" aria-checked={(ajustes.letra || 'defecto') === v}
                  onClick={() => pon({ letra: v === 'defecto' ? undefined : v })}
                  className={cn('h-16 rounded-xl border text-center transition-colors',
                    (ajustes.letra || 'defecto') === v ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300')}>
                  <span className={cn('block text-xl text-slate-800 leading-6', clase)}>{muestra}</span>
                  <span className="block text-[11px] font-bold text-slate-500">{nombre}</span>
                </button>
              ))}
            </div>
          </div>
          <Interruptor etiqueta="Texto pequeño" ayuda="Todo el contenido un poco más pequeño."
            valor={!!ajustes.textoPequeno} onCambio={v => pon({ textoPequeno: v || undefined })} />
          <div>
            <span className="text-xs font-bold text-slate-700">Ancho de la página</span>
            <div role="radiogroup" aria-label="Ancho de la página" className="mt-1 grid grid-cols-2 gap-1.5">
              {([['normal', 'Normal', 'Una columna de lectura'], ['completo', 'Completo', 'Todo el ancho']] as const).map(([v, nombre, ayuda]) => (
                <button key={v} type="button" role="radio" aria-checked={(ajustes.ancho || 'completo') === v}
                  onClick={() => pon({ ancho: v === 'completo' ? undefined : v })}
                  className={cn('h-14 rounded-xl border text-center transition-colors',
                    (ajustes.ancho || 'completo') === v ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300')}>
                  <span className="block text-xs font-bold text-slate-800">{nombre}</span>
                  <span className="block text-[11px] text-slate-400">{ayuda}</span>
                </button>
              ))}
            </div>
          </div>
          <Interruptor etiqueta="Bloquear la página" ayuda="Nadie la edita hasta que se desbloquee: un seguro contra descuidos."
            valor={!!ajustes.bloqueada} onCambio={v => pon({ bloqueada: v || undefined })} />
          {resumen && (
            <p className="text-[11px] text-slate-500 rounded-lg bg-slate-50 px-3 py-2" data-resumen-pagina>
              {textoLectura(resumen.palabras, resumen.minutos)} · {resumen.caracteres.toLocaleString('es-ES')} caracteres
            </p>
          )}
        </section>

        <section className="space-y-1">
          <p className="text-[11px] font-black uppercase tracking-wide text-slate-400 mb-2">Cómo se ve publicada</p>
          <Interruptor etiqueta="Mostrar el tiempo de lectura" ayuda="«320 palabras · 2 min de lectura» bajo el título."
            valor={!!ajustes.tiempoLectura} onCambio={v => pon({ tiempoLectura: v || undefined })} />
          <Interruptor etiqueta="Mostrar el autor" ayuda="Tu nombre y tu foto bajo el título."
            valor={!!ajustes.mostrarAutor} onCambio={v => pon({ mostrarAutor: v })} />
          <Interruptor etiqueta="Mostrar el título" ayuda="Apágalo si la portada o el logotipo ya dicen cómo se llama."
            valor={!ajustes.ocultarTitulo} onCambio={v => pon({ ocultarTitulo: v ? undefined : true })} />
          {/* La fecha ya no se publica (2026-10-02, Eugenio: «quita la fecha
              que está debajo del icono»): sin interruptor que no haría nada. */}
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
                <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={e => e.target.files?.[0] && subir(e.target.files[0])} />
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
