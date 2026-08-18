// ============================================================================
// JUEGO VITAL — visor de PDF propio (2026-08-18). El visor nativo del
// navegador dentro de un iframe es una lotería: Chrome lo bloqueaba con
// nuestra CSP (pantalla en negro, lo vio Eugenio), y en el móvil directamente
// no existe. PDF.js pinta cada página en un canvas: se ve igual en todos
// lados. El chunk se carga con lazy() solo al abrir un PDF.
// ============================================================================
import { useEffect, useRef, useState } from 'react';

export default function VisorPdf({ url }: { url: string }) {
  const cont = useRef<HTMLDivElement>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'error'>('cargando');

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const doc = await pdfjs.getDocument({ url }).promise;
        if (!vivo || !cont.current) return;
        cont.current.innerHTML = '';
        // Nítido también en pantallas retina: se pinta a devicePixelRatio y
        // se encoge por CSS. Tope de escala para no comernos la memoria.
        const ancho = Math.max(280, cont.current.clientWidth - 24);
        const paginas = Math.min(doc.numPages, 50);
        for (let i = 1; i <= paginas; i++) {
          const pag = await doc.getPage(i);
          const base = pag.getViewport({ scale: 1 });
          const escala = Math.min(3, (ancho / base.width) * Math.min(2, window.devicePixelRatio || 1));
          const vista = pag.getViewport({ scale: escala });
          const canvas = document.createElement('canvas');
          canvas.width = vista.width;
          canvas.height = vista.height;
          canvas.style.width = '100%';
          canvas.style.display = 'block';
          canvas.className = 'rounded-lg shadow mb-3 bg-white';
          if (!vivo || !cont.current) return;
          cont.current.appendChild(canvas);
          await pag.render({ canvas, viewport: vista }).promise;
        }
        if (vivo) setEstado('listo');
      } catch {
        if (vivo) setEstado('error');
      }
    })();
    return () => { vivo = false; };
  }, [url]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-100 px-3 py-3">
      {estado === 'cargando' && (
        <p className="text-xs text-slate-400 text-center py-8">Cargando el documento…</p>
      )}
      {estado === 'error' && (
        <p className="text-xs text-rose-600 text-center py-8">
          No se ha podido leer el PDF aquí dentro. Usa el botón de abrir fuera.
        </p>
      )}
      <div ref={cont} className="max-w-3xl mx-auto" />
    </div>
  );
}
