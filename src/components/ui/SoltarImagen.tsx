import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, ClipboardPaste, Loader2, ImagePlus } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// PEGAR, ARRASTRAR O SUBIR UNA IMAGEN — el diálogo de portada e icono (2026-10-02)
// ============================================================================
// Eugenio: «que cuando se le dé a añadir portada o añadir icono te permita
// pegar lo que lleves en el portapapeles, o arrastrarla, o un botón bien
// grande de subir archivo — como hace OneDrive».
//
// Three ways in, all equal, because people arrive with the image in different
// places: a screenshot is in the clipboard, a downloaded photo is a file on
// the desktop, a phone has only the file picker.
//   · Paste: Ctrl/⌘+V anywhere while the dialog is open, or the «Pegar»
//     button (the async Clipboard API — on phones there is no keyboard).
//   · Drag: anywhere on the dialog, not only on the dashed box; a box you
//     have to hit exactly is the part of OneDrive nobody copies.
//   · The big «Subir archivo» button.
//
// The dialog does not upload by itself: it hands the File to `onArchivo`,
// which decides (the cover shows its own progress bar on the page; the icon
// resizes to 512 px). If `onArchivo` returns an error, it stays open and says
// it, instead of closing on a failure.

const ACEPTA = 'image/*,.heic,.heif';
const esImagen = (f: File) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name);
const esMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
// On a phone there is nothing to drag and no keyboard shortcut: the box says
// what does work there instead of promising what does not.
const esTactil = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

export default function SoltarImagen({ titulo, onArchivo, onCerrar, children, pie }: {
  titulo: string;
  /** Devuelve un mensaje de error si no ha ido bien; si no, el diálogo se cierra. */
  onArchivo: (archivo: File) => Promise<string | void> | string | void;
  onCerrar: () => void;
  /** Lo que va antes de la imagen (los emojis, en el icono). */
  children?: ReactNode;
  /** Lo que va al final (p. ej. «Quitar»). */
  pie?: ReactNode;
}) {
  const [encima, setEncima] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  // Contar entradas y salidas: `dragleave` salta al pasar sobre cada hijo, y
  // con un booleano el recuadro parpadearía al mover el ratón por dentro.
  const profundidad = useRef(0);

  const usar = async (f: File | null | undefined) => {
    if (!f) return;
    if (!esImagen(f)) { setError('Eso no es una imagen. Prueba con un JPG, PNG, WebP o HEIC.'); return; }
    setError(null); setSubiendo(true);
    try {
      const fallo = await onArchivo(f);
      if (fallo) setError(fallo); else onCerrar();
    } catch (e: any) {
      setError(e?.message || 'No se ha podido subir la imagen.');
    } finally { setSubiendo(false); }
  };

  // Pegar con el teclado, esté donde esté el foco mientras el diálogo vive.
  useEffect(() => {
    const alPegar = (e: ClipboardEvent) => {
      // While the dialog is open the paste is ITS paste. The page editor also
      // listens on `window` and turned the same image into a block too —
      // measured 2026-10-02: one paste, two uploads. Capture phase + stopping
      // here means the editor never sees it.
      e.stopImmediatePropagation();
      const datos = e.clipboardData;
      if (!datos) return;
      const f = Array.from(datos.files).find(esImagen)
        || Array.from(datos.items).find(i => i.kind === 'file' && i.type.startsWith('image/'))?.getAsFile();
      if (f) { e.preventDefault(); usar(f); }
      else if (datos.types.includes('text/plain')) setError('En el portapapeles hay texto, no una imagen. Copia la imagen (no su enlace) y vuelve a pegar.');
    };
    const alTecla = (e: KeyboardEvent) => { if (e.key === 'Escape' && !subiendo) onCerrar(); };
    window.addEventListener('paste', alPegar, true);
    window.addEventListener('keydown', alTecla);
    return () => { window.removeEventListener('paste', alPegar, true); window.removeEventListener('keydown', alTecla); };
  }, [subiendo]); // eslint-disable-line react-hooks/exhaustive-deps

  /** El botón «Pegar»: para quien no usa atajos, y en el móvil, donde no hay. */
  const pegarConBoton = async () => {
    setError(null);
    try {
      const elementos = await (navigator.clipboard as any).read();
      for (const el of elementos) {
        const tipo = (el.types as string[]).find(t => t.startsWith('image/'));
        if (tipo) {
          const blob: Blob = await el.getType(tipo);
          await usar(new File([blob], `pegada.${tipo.split('/')[1] || 'png'}`, { type: tipo }));
          return;
        }
      }
      setError('No hay ninguna imagen en el portapapeles. Copia una imagen y vuelve a pulsar.');
    } catch {
      // Algunos navegadores no dejan leer el portapapeles desde un botón (o la
      // persona dijo que no). El atajo sí funciona siempre: se le dice cuál.
      setError(`Tu navegador no deja pegar desde este botón. Pulsa ${esMac ? '⌘' : 'Ctrl'}+V aquí mismo.`);
    }
  };

  // `stopPropagation` in all four: React events bubble through the COMPONENT
  // tree, and the page editor has its own `onDrop` that turned the same image
  // into a block too (measured 2026-10-02). The portal below is the other half.
  const arrastre = {
    onDragEnter: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); profundidad.current++; setEncima(true); },
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; },
    onDragLeave: (e: React.DragEvent) => { e.stopPropagation(); profundidad.current = Math.max(0, profundidad.current - 1); if (!profundidad.current) setEncima(false); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); profundidad.current = 0; setEncima(false);
      usar(Array.from(e.dataTransfer.files).find(esImagen) || e.dataTransfer.files[0]);
    },
  };

  // Drawn on `document.body`: outside the editor's DOM, so no ancestor's
  // transform, overflow or z-index can clip or trap it.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm"
      onClick={() => !subiendo && onCerrar()} {...arrastre}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-soltar-imagen"
        className="w-full max-w-lg rounded-3xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 id="titulo-soltar-imagen" className="inline-flex items-center gap-1.5 text-sm font-black text-slate-900">
            <ImagePlus className="h-4 w-4 text-emerald-600" /> {titulo}
          </h2>
          <button onClick={onCerrar} disabled={subiendo} aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          {children}

          <div className={cn('flex h-44 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 text-center transition-colors',
            encima ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50/60')}>
            {subiendo ? (
              <><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /><p className="text-sm font-bold text-slate-600">Subiendo…</p></>
            ) : encima ? (
              <><Upload className="h-7 w-7 text-emerald-600" /><p className="text-sm font-black text-emerald-800">Suéltala aquí</p></>
            ) : (
              <>
                <Upload className="h-7 w-7 text-slate-300" />
                {esTactil ? (
                  <>
                    <p className="text-sm font-bold text-slate-600">Elige una foto con el botón de abajo</p>
                    <p className="text-xs text-slate-400">o pégala si la has copiado</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-slate-600">Arrastra una imagen aquí</p>
                    <p className="text-xs text-slate-400">
                      o pégala con <kbd className="rounded border border-slate-200 bg-white px-1 font-sans">{esMac ? '⌘' : 'Ctrl'}</kbd>
                      {' + '}<kbd className="rounded border border-slate-200 bg-white px-1 font-sans">V</kbd>
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          <input ref={entrada} type="file" accept={ACEPTA} className="hidden"
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; usar(f); }} />
          <button onClick={() => entrada.current?.click()} disabled={subiendo}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow hover:bg-emerald-700 disabled:opacity-50">
            <Upload className="h-4 w-4" /> Subir archivo
          </button>
          <button onClick={pegarConBoton} disabled={subiendo}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            <ClipboardPaste className="h-4 w-4" /> Pegar del portapapeles
          </button>

          {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700">{error}</p>}
          {pie}
        </div>
      </div>
    </div>,
    document.body,
  );
}
