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
// aparece en cuanto el TÍTULO se va por arriba (no toda la cabecera: el bot
// evaluador vio 275 px en un teléfono sin título a la vista): la portada en
// miniatura, el icono, el título (y la descripción en una línea en pantallas
// anchas) y los botones, en pequeño.
//
// Va JUSTO ANTES de la cabecera, con `position: sticky` y alto cero: se pega
// arriba en cuanto se empieza a bajar y no ocupa nada. Funciona igual en la
// ventana (página publicada), en el editor (que baja dentro de `main`) y en la
// vista previa del creador del menú. Si el menú del sitio es fijo, la barra va
// debajo de él, y si el menú ya enseña el mismo nombre, la barra no lo repite.

export function BarraFija({ icono, titulo, subtitulo, portada, botones, estilo, acento, onAbrir, plegado = false, margenes = '-mx-5 sm:-mx-8' }: {
  icono: string | null;
  titulo: string;
  subtitulo?: string | null;
  portada?: string | null;
  botones: BotonCabecera[];
  estilo?: EstiloBotones;
  acento?: string | null;
  onAbrir: (b: BotonCabecera) => void;
  /** Los botones en un menú ☰ en cascada (2026-10-21). */
  plegado?: boolean;
  /** Para que el fondo blanco llegue a los bordes de la columna. */
  margenes?: string;
}) {
  const pegajosa = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [arriba, setArriba] = useState(0);
  const [repetida, setRepetida] = useState(false);
  /** Lo que ocupa la píldora de la cuenta, arriba a la derecha, para no tapar los botones. */
  const [sinMenu, setSinMenu] = useState(false);
  /** En un teléfono los botones van en el menú ☰: sueltos se comen el título (2026-10-21). */
  const [estrecha, setEstrecha] = useState(false);
  useEffect(() => {
    const m = window.matchMedia('(max-width: 639px)');
    const v = () => setEstrecha(m.matches);
    v(); m.addEventListener('change', v);
    return () => m.removeEventListener('change', v);
  }, []);
  useEffect(() => {
    let raf = 0;
    let ahora = false;
    let ultimo = '';
    const medir = () => {
      const p = pegajosa.current;
      if (!p) return;
      const menu = p.closest('[data-marco-sitio]')?.querySelector<HTMLElement>('[data-menu-fijo]');
      const altoMenu = menu ? Math.round(menu.getBoundingClientRect().height) : 0;
      // Lo «sticky» se pega al borde de DENTRO del relleno de la caja que baja
      // (en el editor, `main` lleva 32 px arriba): se descuenta.
      let caja: HTMLElement | null = p.parentElement;
      while (caja && !/(auto|scroll)/.test(getComputedStyle(caja).overflowY)) caja = caja.parentElement;
      const relleno = caja ? parseFloat(getComputedStyle(caja).paddingTop) || 0 : 0;
      setArriba(altoMenu - relleno);
      setRepetida(!!menu && !!titulo && (menu.textContent || '').includes(titulo));
      // LA CUENTA, EN LA BARRA (2026-10-21): sin menú del sitio, la barra deja un hueco al
      // final (`data-hueco-cuenta="barra"`) y `BarraMiembro` se pinta dentro mientras se ve.
      setSinMenu(!altoMenu);
      // El título es lo que manda: la cabecera es la que va justo detrás de la barra.
      const t = (p.nextElementSibling as HTMLElement | null)?.querySelector<HTMLElement>('h1, textarea, [data-elemento-cabecera="titulo"]');
      if (!t) return;
      const borde = (caja ? caja.getBoundingClientRect().top : 0) + altoMenu;
      const fondo = t.getBoundingClientRect().bottom;
      // Con 20 px de margen entre aparecer y desaparecer: justo en el límite no parpadea.
      const v = ahora ? fondo < borde + 28 : fondo < borde + 8;
      if (v !== ahora) { ahora = v; setVisible(v); }
      if (!altoMenu && String(ahora) !== ultimo) { ultimo = String(ahora); window.dispatchEvent(new CustomEvent('barra-fija', { detail: { visible: ahora } })); }
    };
    const alMover = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(medir); };
    medir();
    window.addEventListener('scroll', alMover, true);
    window.addEventListener('resize', alMover);
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('scroll', alMover, true); window.removeEventListener('resize', alMover);
      window.dispatchEvent(new CustomEvent('barra-fija', { detail: { visible: false } }));
    };
  }, [titulo]);
  const subir = () => pegajosa.current?.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const esUrl = !!icono && /^(https?:|\/)/.test(icono);
  return (
    <div ref={pegajosa} className="sticky z-30 h-0" style={{ top: arriba }}>
      <div data-barra-fija aria-hidden={!visible} inert={!visible || undefined}
        className={cn('absolute inset-x-0 top-0 transition-[opacity,transform] duration-200', margenes,
          visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0')}>
        <div className="flex h-14 items-center gap-3.5 border-b border-slate-200/80 bg-white/95 px-5 shadow-[0_6px_16px_-12px_rgba(15,23,42,0.35)] backdrop-blur sm:h-16 sm:px-8">
          <button type="button" onClick={subir} title="Volver arriba"
            className={cn('flex min-w-0 items-center gap-3 text-left', repetida ? 'shrink' : 'flex-1')}>
            {portada && (
              <span className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-50 sm:block [&_img]:h-full [&_img]:w-full [&_img]:object-contain [&_video]:h-full [&_video]:w-full [&_video]:object-cover">
                <MediaPortada src={portada} ancho={40} className="h-full w-full object-contain" />
              </span>
            )}
            {/* Si el menú fijo ya dice cómo se llama, aquí no se repite. */}
            {!repetida && icono && (esUrl
              ? <img src={icono} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
              : <span className="shrink-0 text-[28px] leading-none">{icono}</span>)}
            <span className="min-w-0">
              {!repetida && <span className="block truncate text-[17px] font-black leading-tight tracking-tight text-slate-900">{titulo || 'Sin título'}</span>}
              {subtitulo && (
                <span className={cn('truncate leading-tight text-slate-500', repetida ? 'hidden text-base md:block' : 'hidden text-[14px] md:block')}>
                  {subtitulo.replace(/[*_`#[\]]/g, '')}
                </span>
              )}
            </span>
          </button>
          {botones.length > 0 && (
            <div className={cn('min-w-0', !(plegado || estrecha) && 'overflow-x-auto [scrollbar-width:none]', repetida ? 'flex-1' : 'max-w-[60%] shrink')}>
              {/* En un teléfono, de izquierda a derecha y algo más grandes (se tocan con el dedo). */}
              <FilaBotones botones={botones} talla="sm" estilo={estilo} acento={acento} derecha={!repetida} sinMargen enLinea plegado={plegado || (estrecha && botones.length > 1)} onAbrir={onAbrir} />
            </div>
          )}
          {sinMenu && <span data-hueco-cuenta="barra" className="ml-3 flex shrink-0 items-center" />}
        </div>
      </div>
    </div>
  );
}
