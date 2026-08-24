import { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';

/*
 * ABRIR ALGO EN EL CENTRO (2026-08-24)
 * ============================================================================
 * Eugenio: «hay una información abajo que es dónde está integrada esa
 * publicación, puede estar integrada dentro de un grafo o un mapa. También se
 * debe de poder pinchar en esa etiqueta y que se abra ese grafo o ese mapa de
 * forma central como un pop-up».
 *
 * ── POR QUÉ NO VALÍA `abrirLateral` ─────────────────────────────────────────
 * Ya existe, y abre cosas **al lado**, en una columna estrecha. Para un PDF o
 * una foto está bien; un lienzo o un mapa se miran, se arrastran y se hace zoom
 * en ellos, y eso en una columna de 380 px no se puede hacer. Pidió «de forma
 * central» y es la petición correcta, no un capricho de colocación.
 *
 * ── SE VE, PERO NO SE PIERDE DE DÓNDE VIENES ────────────────────────────────
 * Un pop-up y no una navegación: quien pincha esa etiqueta está mirando una
 * lista de publicaciones y quiere ver dónde vive ésta, no abandonar la lista.
 * Al cerrar sigue donde estaba, con el mismo desplazamiento y los mismos
 * filtros. Si de verdad quiere irse, ahí está el botón de abrirlo entero.
 *
 * ── `embed=1` ───────────────────────────────────────────────────────────────
 * La aplicación ya sabe pintarse sin su armazón cuando lleva ese parámetro; es
 * lo mismo que usan las ventanas del escritorio y el panel lateral. Así el
 * lienzo se ve sin una segunda barra de menús dentro del pop-up.
 */

export default function VentanaCentral({ titulo, destino, onCerrar, onAbrirEntero }: {
  titulo: string;
  /** Una ruta de la propia aplicación, sin `embed=1`: se añade aquí. */
  destino: string;
  onCerrar: () => void;
  /** Irse de verdad a esa página. Si no se pasa, no sale el botón. */
  onAbrirEntero?: () => void;
}) {
  // Escape cierra, como en el resto de la plataforma. Y el fondo de detrás no
  // se desplaza mientras esto está abierto: un pop-up que deja rodar la página
  // de debajo te devuelve a otro sitio al cerrarlo.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = antes;
    };
  }, [onCerrar]);

  const url = destino + (destino.includes('?') ? '&' : '?') + 'embed=1';

  return (
    // z-[10000], POR ENCIMA DE LOS TRES CÍRCULOS (que van a 9999). Ellos son
    // lo más alto de la aplicación a propósito —tienen que verse siempre—, pero
    // esto es un diálogo modal: mientras está abierto, es la aplicación. Visto
    // en la pantalla antes de arreglarlo, el botón verde de Crear se plantaba
    // encima de la barra de herramientas del lienzo.
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-8">
      <div onClick={onCerrar} aria-hidden className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-2.5">
          <h2 className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{titulo}</h2>
          {onAbrirEntero && (
            <button
              onClick={onAbrirEntero}
              title="Abrirlo entero"
              aria-label="Abrirlo entero"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onCerrar}
            title="Cerrar"
            aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* `title` no es decoración: es lo que lee un lector de pantalla al
            entrar en el marco, y sin él dice «marco sin título». */}
        <iframe src={url} title={titulo} className="min-h-0 flex-1 w-full border-0" />
      </div>
    </div>
  );
}
