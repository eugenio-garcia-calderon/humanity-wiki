import { esArchivoVideo, reproductorPortada } from '../../utils/videoPortada';
import { miniatura } from '../../utils/miniatura';

// La portada, sea lo que sea: una imagen, un vídeo subido o un reproductor de YouTube o Vimeo.
// Sin ganchos: la cabecera pública también se pinta en el servidor (`cabeceraSitio.tsx`).
export default function MediaPortada({ src, className = '', prioridad = false, ancho = 1600 }: {
  src: string;
  /** El ancho al que se ve, para pedir su miniatura WebP (2026-10-22). */
  ancho?: number;
  className?: string;
  /** Lo primero que se ve de la página: que no espere detrás de otras imágenes. */
  prioridad?: boolean;
}) {
  const reproductor = reproductorPortada(src);
  if (reproductor) {
    // El reproductor llena el marco 16:9; el marco toma el ancho y el alto que le dé quien lo pinta.
    return (
      <div className={`relative overflow-hidden bg-slate-900 aspect-video ${className}`}>
        <iframe src={reproductor} title="Vídeo de portada" loading={prioridad ? 'eager' : 'lazy'}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen" referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0" />
      </div>
    );
  }
  if (esArchivoVideo(src)) {
    return <video src={src} autoPlay muted loop playsInline preload="metadata" className={`object-cover bg-slate-900 ${className}`} />;
  }
  return <img src={miniatura(src, ancho)} alt="" fetchPriority={prioridad ? 'high' : undefined} className={className} />;
}
