import { useEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import MediaPortada from '../ui/MediaPortada';
import { FilaBotones, type BotonCabecera, type EstiloBotones } from './BotonesCabecera';

// ============================================================================
// LA CABECERA FIJA AL BAJAR (2026-10-20, Eugenio)
// ============================================================================
// «Que el título con la cabecera y los botones se quede arriba como un menú
// fijo al bajar; y que al bajar la portada se reduzca y ocupe muy poquito.»
//
// No es la cabecera grande pegada arriba: una cabecera que encoge MIENTRAS se
// baja cambia el alto de la página y la hace dar saltos. Es una barra fina que
// aparece cuando la cabecera grande ya se ha ido por arriba: la portada en
// miniatura, el icono, el título (y la descripción en una línea en
// pantallas anchas) y los botones, en pequeño.
//
// Va justo DESPUÉS de la cabecera, con `position: sticky` y alto cero: se pega
// arriba exactamente cuando la cabecera acaba de salir. Funciona igual en la
// ventana (página publicada), en el editor (que baja dentro de su caja) y en
// la vista previa del creador del menú. Si el menú del sitio es fijo, la barra
// va debajo de él.

export function BarraFija({ icono, titulo, subtitulo, portada, botones, estilo, acento, onAbrir, margenes = '-mx-5 sm:-mx-8' }: {
  icono: string | null;
  titulo: string;
  subtitulo?: string | null;
  portada?: string | null;
  botones: BotonCabecera[];
  estilo?: EstiloBotones;
  acento?: string | null;
  onAbrir: (b: BotonCabecera) => void;
  /** Para que el fondo blanco llegue a los bordes de la columna. */
  margenes?: string;
}) {
  const centinela = useRef<HTMLDivElement>(null);
  const pegajosa = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [arriba, setArriba] = useState(0);
  useEffect(() => {
    let raf = 0;
    const medir = () => {
      const c = centinela.current, p = pegajosa.current;
      if (!c || !p) return;
      const menu = c.closest('[data-marco-sitio]')?.querySelector<HTMLElement>('[data-menu-fijo]');
      // Lo «sticky» se pega al borde de DENTRO del relleno de la caja que baja
      // (en el editor, `main` lleva 32 px arriba): se descuenta para que la
      // barra quede pegada al borde de verdad.
      let caja: HTMLElement | null = c.parentElement;
      while (caja && !/(auto|scroll)/.test(getComputedStyle(caja).overflowY)) caja = caja.parentElement;
      const relleno = caja ? parseFloat(getComputedStyle(caja).paddingTop) || 0 : 0;
      setArriba((menu ? Math.round(menu.getBoundingClientRect().height) : 0) - relleno);
      // Pegada: la barra se ha quedado arriba y el centinela (su sitio de verdad) sigue subiendo.
      setVisible(c.getBoundingClientRect().top < p.getBoundingClientRect().top - 2);
    };
    const alMover = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener('scroll', alMover, true);
    window.addEventListener('resize', alMover);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', alMover, true); window.removeEventListener('resize', alMover); };
  }, []);
  const subir = () => (centinela.current?.previousElementSibling as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const esUrl = !!icono && /^(https?:|\/)/.test(icono);
  return (
    <>
      <div ref={centinela} aria-hidden />
      <div ref={pegajosa} className="sticky z-30 h-0" style={{ top: arriba }}>
        <div data-barra-fija aria-hidden={!visible} inert={!visible || undefined}
          className={cn('absolute inset-x-0 top-0 transition-[opacity,transform] duration-200', margenes,
            visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0')}>
          <div className="flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-5 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.35)] backdrop-blur sm:px-8">
            <button type="button" onClick={subir} title="Volver arriba" className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              {portada && <MediaPortada src={portada} className="hidden h-9 w-14 shrink-0 rounded-md object-cover sm:block" />}
              {icono && (esUrl
                ? <img src={icono} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
                : <span className="shrink-0 text-2xl leading-none">{icono}</span>)}
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-black leading-tight tracking-tight text-slate-900">{titulo || 'Sin título'}</span>
                {subtitulo && <span className="hidden truncate text-xs leading-tight text-slate-500 md:block">{subtitulo.replace(/[*_`#[\]]/g, '')}</span>}
              </span>
            </button>
            {botones.length > 0 && (
              <div className="min-w-0 max-w-[60%] shrink overflow-x-auto [scrollbar-width:none]">
                <FilaBotones botones={botones} talla="xs" estilo={estilo} acento={acento} derecha sinMargen enLinea onAbrir={onAbrir} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
