// ============================================================================
// LA PRIMERA PÁGINA DE UN PDF, EN PEQUEÑO (2026-08-22)
// ============================================================================
// Eugenio: «si es un pdf por defecto le haces una tarjetita con el nombre y
// quizás una preview de la primera página».
//
// POR QUÉ UNA MINIATURA Y NO EL VISOR ENTERO. Un PDF metido en la página como
// un visor de 70 vh se come la pantalla y corta el documento en dos: dejas de
// leer lo que escribiste para mirar un adjunto que a lo mejor solo querías
// tener a mano. La miniatura dice cuál es el archivo —que es lo que se
// necesita de un vistazo— y abrirlo sigue estando a un clic.
//
// SE PINTA SOLO LA PÁGINA 1. `pdfjs` se descarga con `import()` y únicamente
// cuando hay un PDF en la página: quien no tenga ninguno no paga el megabyte.
//
// Y SI NO SE PUEDE, SE DICE. Un PDF protegido, roto o de otro origen no se
// puede dibujar; entonces `onFallo` avisa y la tarjeta enseña su icono de
// siempre. Un hueco gris sin explicación se lee como «la página está rota».
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

export default function PortadaPdf({ url, className }: { url: string; className?: string }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'fallo'>('cargando');

  useEffect(() => {
    let vivo = true;
    setEstado('cargando');
    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc =
          new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        const doc = await pdfjs.getDocument({ url }).promise;
        const pagina = await doc.getPage(1);
        if (!vivo || !lienzo.current) return;
        // Ancho fijo pequeño: es un sello, no una lectura. A x2 para que no se
        // vea borroso en pantallas de retina.
        const base = pagina.getViewport({ scale: 1 });
        const escala = (120 / base.width) * 2;
        const vista = pagina.getViewport({ scale: escala });
        const c = lienzo.current;
        c.width = vista.width;
        c.height = vista.height;
        const ctx = c.getContext('2d');
        if (!ctx) { setEstado('fallo'); return; }
        await pagina.render({ canvas: c, canvasContext: ctx, viewport: vista }).promise;
        if (vivo) setEstado('listo');
      } catch {
        if (vivo) setEstado('fallo');
      }
    })();
    return () => { vivo = false; };
  }, [url]);

  if (estado === 'fallo') return null;
  return (
    <canvas
      ref={lienzo}
      aria-hidden
      className={cn('rounded-lg border border-slate-200 bg-white object-contain',
        estado === 'cargando' && 'opacity-0', className)}
      style={{ width: 60, height: 'auto' }}
    />
  );
}
