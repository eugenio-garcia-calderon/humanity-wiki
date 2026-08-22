// ============================================================================
// LA VENTANA LATERAL (2026-08-22)
// ============================================================================
// Eugenio: «cuando estoy en una página y he insertado por ejemplo una
// publicación de proyecto, y luego le doy a verla, y luego le doy atrás, me
// tiene que devolver a la página, no atrás de la página de todos los proyectos.
// Arréglalo, y además haz que se abra en una ventana lateral, y que permita
// luego expandirse a ventana superior».
//
// EL ARREGLO DE VERDAD ES NO IRSE. Aquello no era un fallo del botón «atrás»:
// era que ver una publicación insertada te SACABA del documento, y volver
// dependía de que el historial estuviera como uno se imagina —y no lo estaba,
// porque la tarjeta llevaba a `/proyectos/:slug`, cuya propia pantalla te
// devuelve al índice de proyectos. Un panel al lado no te saca de ningún sitio,
// así que no hay a dónde volver.
//
// PERO «ATRÁS» TIENE QUE CERRARLO. Si abrir esto no tocara el historial, el
// gesto de volver —la flecha del navegador, el deslizamiento en el trackpad—
// se llevaría por delante el documento entero con el panel abierto encima.
// Al abrir se empuja una entrada de historial, y al volver se cierra el panel:
// «atrás» te devuelve a la página, que es literalmente lo que se pidió.
//
// POR DENTRO ES UN `<iframe>` con `embed=1`, lo mismo que las ventanas del
// escritorio. No es pereza: es lo que hace que la página de dentro sea LA
// página de verdad, con sus permisos y sus datos, sin montar aquí una segunda
// copia que se quedaría vieja el día que aquella cambie.
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { useEsMovil } from '../../hooks/useEsMovil';
import { ControlesVentana } from './controles';
import { type AbrirLateral } from './bus';

/** Ancho de partida del panel, en % de la pantalla. La mitad justa: lo que
 *  estabas leyendo se sigue leyendo al lado. */
const ANCHO_PCT = 46;

export default function VentanaLateral() {
  const esMovil = useEsMovil();
  const [abierta, setAbierta] = useState<AbrirLateral | null>(null);
  const [expandida, setExpandida] = useState(false);
  /** Si el panel fue quien empujó la entrada de historial. Sin esto, cerrarlo
   *  con la ✕ dejaría una entrada muerta y el siguiente «atrás» no haría nada
   *  visible — el fallo clásico de los diálogos que se cierran solos. */
  const empujado = useRef(false);

  const cerrar = useCallback((porHistorial = false) => {
    setAbierta(null);
    setExpandida(false);
    if (!porHistorial && empujado.current) {
      empujado.current = false;
      // Se deshace la entrada que metimos al abrir. `history.back()` y no
      // `navigate(-1)`: aquí no se cambia de página, solo se retira la marca.
      window.history.back();
    }
    empujado.current = false;
  }, []);

  useEffect(() => {
    const alAbrir = (e: Event) => {
      const d = (e as CustomEvent).detail as AbrirLateral;
      if (!d?.destino) return;
      setAbierta(d);
      setExpandida(false);
      if (!empujado.current) {
        window.history.pushState({ lateral: true }, '');
        empujado.current = true;
      }
    };
    const alVolver = () => { if (empujado.current) cerrar(true); };
    window.addEventListener('humanity:abrir-lateral', alAbrir);
    window.addEventListener('popstate', alVolver);
    return () => {
      window.removeEventListener('humanity:abrir-lateral', alAbrir);
      window.removeEventListener('popstate', alVolver);
    };
  }, [cerrar]);

  // Escape cierra, como cualquier panel de la plataforma.
  useEffect(() => {
    if (!abierta) return;
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [abierta, cerrar]);

  if (!abierta) return null;

  const src = abierta.crudo
    ? abierta.destino
    : `${abierta.destino}${abierta.destino.includes('?') ? '&' : '?'}embed=1`;

  return (
    <>
      {/* EL VELO SOLO CUANDO ESTÁ EXPANDIDA. De lado, la página de detrás se
          sigue usando —esa es la gracia de abrirlo al lado—; expandida, es una
          ventana encima y el velo dice que lo es. */}
      {expandida && (
        <div className="fixed inset-0 z-[9000] bg-slate-900/30" onClick={() => setExpandida(false)} />
      )}
      <aside
        className={cn('fixed z-[9001] flex flex-col bg-white shadow-2xl transition-all duration-200',
          expandida
            // «Ventana superior»: grande y centrada, por encima de todo.
            ? 'inset-4 sm:inset-8 rounded-2xl border border-slate-200'
            : esMovil
              // En un teléfono no hay «al lado»: ocupa la pantalla, dejando ver
              // la barra de abajo para poder salir sin buscar la ✕.
              ? 'inset-x-0 top-0 bottom-11 border-t border-slate-200'
              : 'top-0 right-0 bottom-0 border-l border-slate-200')}
        style={!expandida && !esMovil ? { width: `${ANCHO_PCT}%`, minWidth: 360 } : undefined}
        role="dialog"
        aria-label={abierta.titulo}
      >
        <div className="shrink-0 h-11 px-2.5 flex items-center gap-2 border-b border-slate-200 bg-slate-50">
          <span className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-800">{abierta.titulo}</span>
          <ControlesVentana
            expandida={expandida}
            onExpandir={() => setExpandida(v => !v)}
            onCerrar={() => cerrar()}
          />
        </div>
        <iframe
          src={src}
          title={abierta.titulo}
          className="flex-1 min-h-0 w-full border-0 bg-white"
          allow="autoplay; fullscreen; xr-spatial-tracking; clipboard-write"
        />
      </aside>
    </>
  );
}
