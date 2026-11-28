import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { miniatura } from '../../utils/miniatura';
import BuscarBarra from './BuscarBarra';
import BotonCalificaciones from './BotonCalificaciones';
import { VistasMenu, vistasDe, type Vista } from './VistaMapaSitio';
import SelectorIdioma from './SelectorIdioma';
import { enlaceColabora } from './PresentacionSitio';
import { useSitio } from './ContextoSitio';
import { useDiseno, elegirDiseno, type Diseno } from './disenoUno/diseno';
import { useBarraOculta } from './barraAlBajar';
import { Menu, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const BotonesLectura = lazy(() => import('./BotonesLectura'));

// ============================================================================
// LA BARRA DEL SITIO EN SUS PÁGINAS (2026-10-26, Eugenio)
// ============================================================================
// «Luz & Humanidad más pequeño arriba a la izquierda; a continuación el territorio
// (sin la palabra Cambiar); luego la ruta de dónde estás, sin “Inicio”; a la
// derecha, Donar y el menú siempre plegado con todas las páginas; y la cuenta sin
// la palabra Entrar.» Una sola línea. El logo, el nombre y el menú son los de la
// página raíz del sitio (`/api/sitio/pagina/:raiz`).
//
// Dos huecos que llena quien sabe qué poner: el territorio (`data-ranura-territorio`,
// el termómetro) y la ruta (`data-ranura-ruta`, el termómetro o `ruta`). La cuenta
// (`BarraMiembro`) se pinta en `data-hueco-cuenta="cabecera"`.

type Raiz = { titulo: string; config: any };
const cache = new Map<string, Promise<Raiz | null>>();
export function raizDe(id: string) {
  let p = cache.get(id);
  if (!p) {
    p = fetch(`/api/sitio/pagina/${encodeURIComponent(id)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(j => (j ? { titulo: String(j.titulo || ''), config: j.config || {} } : null)).catch(() => null);
    cache.set(id, p);
  }
  return p;
}

// EUGINI FETTUCCINI (2026-11-25, Eugenio: «un botón arriba a la derecha muy pequeñito y difícil de ver; si lo pulsas
// se cambia el logo de Luz y Humanidad y, con ese mismo logo, pone Eugini Fettuccini, y debajo, como eslogan, Los
// inventos locos»). Solo en la barra del escaparate; se recuerda en este navegador y vale en todas sus pestañas.
const LOCO = 'eugini-fettuccini';
const NOMBRE_LOCO = 'Eugini Fettuccini', ESLOGAN_LOCO = 'Los inventos locos';
function leerLoco() { try { return window.localStorage.getItem(LOCO) === '1'; } catch { return false; } }
function useNombreLoco(): [boolean, () => void] {
  const [loco, setLoco] = useState(leerLoco);
  useEffect(() => {
    const oir = () => setLoco(leerLoco());
    window.addEventListener(LOCO, oir); window.addEventListener('storage', oir);
    return () => { window.removeEventListener(LOCO, oir); window.removeEventListener('storage', oir); };
  }, []);
  const cambiar = () => {
    try { window.localStorage.setItem(LOCO, leerLoco() ? '0' : '1'); } catch { /* sin almacenamiento: solo esta vez */ }
    setLoco(v => !v); window.dispatchEvent(new Event(LOCO));
  };
  return [loco, cambiar];
}
/** El botón casi invisible: un puntito gris que apenas se ve. */
function BotonLoco({ loco, cambiar }: { loco: boolean; cambiar: () => void }) {
  return (
    <button type="button" onClick={cambiar} data-boton-loco aria-pressed={loco}
      aria-label={loco ? 'Volver a Luz & Humanidad' : 'Eugini Fettuccini'} title={loco ? 'Luz & Humanidad' : '¿?'}
      className="grid h-5 w-5 shrink-0 place-items-center rounded-full opacity-25 transition-opacity hover:opacity-70 focus-visible:opacity-100">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
    </button>
  );
}

/** The ☰ of the phone bar (2026-11-28): Participa, the languages and whatever else the bar carries on a computer,
 *  folded into one button at the right. Only below `sm`; closes on a tap outside, on Esc and on choosing. */
function MenuMovil({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('pointerdown', fuera); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);
  return (
    <div ref={caja} className="relative justify-self-end [grid-area:menu] sm:hidden">
      <button type="button" onClick={() => setAbierto(v => !v)} aria-expanded={abierto} aria-haspopup="true"
        aria-label={abierto ? 'Cerrar el menú' : 'Abrir el menú'}
        className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 hover:text-slate-950">
        {abierto ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
      </button>
      {abierto && (
        <div onClick={e => { if ((e.target as HTMLElement).closest('a')) setAbierto(false); }}
          className="absolute right-0 top-full z-50 mt-2 flex w-56 flex-col items-stretch gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl [&>a]:justify-center [&>button]:self-center [&>nav]:justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

/** The logo as a button: a small menu to try the two designs of the home page (disenoUno/diseno.ts). */
function SelectorDiseno({ titulo, children }: { titulo: string; children: ReactNode }) {
  const diseno = useDiseno();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', esc); };
  }, [abierto]);
  const opcion = (d: Diseno, nombre: string, nota: string) => (
    <button type="button" role="menuitemradio" aria-checked={diseno === d}
      onClick={() => { elegirDiseno(d); setAbierto(false); if (window.location.pathname !== '/') window.location.assign('/'); }}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${diseno === d ? 'bg-slate-100' : ''}`}>
      <span className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${diseno === d ? 'border-slate-900' : 'border-slate-300'}`}>
        {diseno === d && <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />}
      </span>
      <span><span className="block text-sm font-bold text-slate-900">{nombre}</span><span className="block text-xs text-slate-500">{nota}</span></span>
    </button>
  );
  return (
    <div ref={caja} className="relative shrink-0">
      <button type="button" onClick={() => setAbierto(v => !v)} aria-haspopup="menu" aria-expanded={abierto}
        aria-label={`${titulo ? `Logo de ${titulo}: ` : ''}elegir diseño de la portada`} title="Elegir diseño"
        className="block rounded-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
        {children}
      </button>
      {abierto && (
        <div role="menu" aria-label="Diseño de la portada" className="absolute left-1/2 top-full z-50 mt-2 w-60 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          <p className="px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Diseño de la portada</p>
          {opcion('1', 'Diseño 1', 'Herramientas por área, con ilustraciones')}
          {opcion('2', 'Diseño 2', 'El diseño anterior')}
        </div>
      )}
    </div>
  );
}

export default function CabeceraSitio({ raizId, ruta, simple = false, vistaInicial = 'tabla', proyecto }: { raizId: string; ruta?: ReactNode;
  /** A project shown inside the site (2026-11-13, Eugenio, on the socioeconomic model: «Luz & Humanidad en la esquina
   *  superior izquierda, "proyecto impulsado por Luz & Humanidad", y en el centro el nombre del proyecto, que lleve a
   *  su página principal»). Only the showcase bar uses it. */
  proyecto?: { titulo: string; href: string };
  /** La vista sin `?vista=` en esta página (la portada puede abrir en otra que la tabla). */
  vistaInicial?: Vista;
  /** Solo el logo, la cuenta y el menú (2026-10-26, Eugenio: «en la página de donar, quita el territorio y buscar»). */
  simple?: boolean;
}) {
  const [raiz, setRaiz] = useState<Raiz | null>(null);
  const sitio = useSitio();
  const [loco, cambiarLoco] = useNombreLoco();
  const oculta = useBarraOculta();
  useEffect(() => { let vivo = true; raizDe(raizId).then(r => { if (vivo) setRaiz(r); }); return () => { vivo = false; }; }, [raizId]);
  const c = raiz?.config || {}, icono: string | null = c.icono || null;
  // EL ESCAPARATE (`sitio.escaparate`, 2026-11-06, Eugenio en luzhumanidad.com: «quita el menú
  // entero y la opción de iniciar sesión»): sin el ☰ y sin el hueco de la cuenta.
  const escaparate = c.sitio?.escaparate === true;
  // EL ESLOGAN DE LA BARRA (2026-11-12, Eugenio: «debajo de Luz Humanidad pon Evolución, Sistemas, Humanidad, sin
  // determinantes»): `sitio.eslogan` manda en la barra; `subtitulo` sigue siendo el de la página (título, buscadores).
  const eslogan: string | null = (typeof c.sitio?.eslogan === 'string' && c.sitio.eslogan.trim()) || c.subtitulo || null;
  // EL ESCAPARATE, CENTRADO (2026-11-06, Eugenio: «el logotipo con el nombre y el subtítulo en el
  // centro, y la barra de buscar más hacia la derecha»): tres columnas, la marca en medio y el
  // buscador pegado a la derecha. (El móvil, desde el 2026-11-28: una sola línea, ver más abajo.)
  // 2026-11-12 (Eugenio): «cambia el colaborar por Participa en el menú, y reduce un 25 % el tamaño del logo».
  // LA BARRA DEL ESCAPARATE, TERCERA FORMA (2026-11-12, Eugenio: «la barra de buscar, más grande y a la izquierda
  // del todo; lo de colaborar, arriba a la derecha; y el logo un poco más grande para que no quede tan pequeña la
  // letra inferior»). En el ordenador, tres columnas: buscador | marca | Colaborar e idiomas. En el móvil, desde el
  // 2026-11-28, logo | buscador | ☰ (abajo). `sitio.colaborarEnBarra` pone el botón (lo quita de la portada).
  const colabora = c.sitio?.colaborarEnBarra === true ? enlaceColabora(c.sitio?.colabora, sitio) : null;
  const botonColabora = 'inline-flex h-10 shrink-0 items-center rounded-full bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-700 sm:px-5';
  const participa = colabora && (colabora.fuera
    ? <a href={colabora.href} target="_blank" rel="noopener noreferrer" className={botonColabora}>Participa</a>
    : <Link to={colabora.href} data-interno="" className={botonColabora}>Participa</Link>);
  if (escaparate && proyecto) return <CabeceraProyecto raiz={raiz && loco ? { ...raiz, titulo: NOMBRE_LOCO } : raiz} icono={icono} proyecto={proyecto} participa={participa} oculta={oculta} />;
  // EN EL MÓVIL, UNA SOLA LÍNEA (2026-11-28, Eugenio: «en la versión móvil colapsa el menú de participa, donde pone
  // también lo de los idiomas, para que solo se quede arriba el logotipo, un poquito más pequeño, un menú colapsado
  // con 3 rayas a la derecha y la barra de buscar, todo en primera línea, que no haya 2 líneas»): logo | buscar | ☰.
  // Participa, los idiomas y el puntito escondido van dentro del ☰ (`MenuMovil`). Sin eslogan en el móvil: a ese
  // ancho no se leería. Desde `sm`, la barra de siempre: buscador | marca | Participa e idiomas.
  // Y se esconde al bajar y vuelve al subir (`barraAlBajar.ts`), solo en el móvil.
  if (escaparate) return (
    <header data-cabecera-sitio className={cn("sticky top-0 z-40 -mt-[18px] mb-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur transition-transform duration-300 [grid-template-areas:'marca_buscar_menu'] sm:-mt-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-6 sm:px-6 sm:[grid-template-areas:'buscar_marca_acciones']",
      oculta && 'max-sm:-translate-y-full')}
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      <style>{'html { overflow-x: clip; }'}</style>
      <div className="min-w-0 [grid-area:buscar]"><BuscarBarra raizId={raizId} enLinea ancha /></div>
      {/* La marca y el eslogan del mismo ancho que el nombre (2026-11-06, Eugenio). */}
      <div className="flex min-w-0 items-center justify-center gap-1.5 [grid-area:marca] sm:gap-3">
        {/* TOCANDO EL LOGO SE ELIGE EL DISEÑO (2026-11-27, Eugenio): the picture opens «Diseño 1 / Diseño 2»;
            the name still goes home. */}
        {icono && <SelectorDiseno titulo={raiz?.titulo || ''}>{(/^(https?:|\/)/.test(icono)
          ? <img src={miniatura(icono, 128)} alt={raiz ? `Logo de ${raiz.titulo}` : ''} className="h-[30px] w-[30px] shrink-0 rounded-lg object-contain sm:h-[44px] sm:w-[44px] lg:h-[48px] lg:w-[48px]" />
          : <span className="text-[1.6rem] leading-none">{icono}</span>)}</SelectorDiseno>}
      <Link to="/" className="flex min-w-0 items-center" aria-label={raiz ? `${raiz.titulo} · inicio` : 'Inicio'}>
        {raiz && (
          <span className="inline-grid min-w-0 leading-none">
            <span className="whitespace-nowrap text-[1rem] font-black tracking-tight text-slate-900 min-[380px]:text-[1.08rem] sm:text-[1.76rem] lg:text-[2rem]">{loco ? NOMBRE_LOCO : raiz.titulo}</span>
            {(loco || eslogan) && <Eslogan key={loco ? 'loco' : 'luz'} texto={loco ? ESLOGAN_LOCO : eslogan!} />}
          </span>
        )}
      </Link>
      </div>
      <div className="hidden min-w-0 items-center justify-end gap-2 [grid-area:acciones] sm:flex">
        {participa}
        <SelectorIdioma />
        <BotonLoco loco={loco} cambiar={cambiarLoco} />
      </div>
      <MenuMovil>
        {participa}
        <SelectorIdioma />
        <BotonLoco loco={loco} cambiar={cambiarLoco} />
      </MenuMovil>
    </header>
  );
  return (
    // FIJA AL BAJAR (2026-10-26, Eugenio: «en la entrada de una base de datos el menú no se mantiene fijo al hacer
    // scroll»): pegada arriba y con fondo para que no se mezcle.
    // LA RUTA EN EL CENTRO (2026-10-28, Eugenio): tres columnas. A la izquierda del todo el menú ☰ (con las vistas
    // dentro: «mételo en el menú colapsable»); luego el logo con el nombre de la plataforma y el ojo de las
    // calificaciones. En el centro, la pastilla de la ruta (el territorio y el sistema o la temática, o en la vista
    // Círculo lo que se va pinchando). Pegado a su derecha, el buscador; y a la derecha del todo, Donar y la cuenta
    // («Donar y perfil a la derecha»). En el móvil, la ruta baja a su propia línea.
    <header data-cabecera-sitio className="sticky top-0 z-40 -mt-[18px] mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 bg-white/95 px-4 py-1.5 backdrop-blur sm:-mt-5 sm:px-6 md:grid md:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)]"
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      {/* A todo lo ancho de la ventana, sin barra de desplazamiento de lado. Pegada arriba del todo, sin el hueco del margen
          de la página (2026-10-29, Eugenio: «reduce el espacio superior del menú»). */}
      <style>{'html { overflow-x: clip; }'}</style>
      {/* En el móvil los grupos se deshacen (`contents`) para repartir sus piezas en líneas: arriba el menú, el logo,
          Donar y la cuenta; debajo las calificaciones y el buscador; y al final la ruta. */}
      <div className="contents md:col-start-1 md:flex md:min-w-0 md:items-center md:gap-2">
        {raiz && !escaparate && <span className="flex shrink-0 items-center"><Suspense fallback={null}><BotonesLectura config={c} centrado={false} parte="menu"
          cabezaMenu={simple ? undefined : cerrar => <VistasMenu porDefecto={vistaInicial} vistas={vistasDe(c.sitio)} cerrar={cerrar} />} /></Suspense></span>}
        <Link to="/" className="ml-1 flex min-w-0 shrink-0 items-center gap-2.5" aria-label={raiz ? `${raiz.titulo} · inicio` : 'Inicio'}>
          {icono && (/^(https?:|\/)/.test(icono)
            ? <img src={miniatura(icono, 112)} alt="" className="h-[34px] w-[34px] shrink-0 rounded-lg object-contain" />
            : <span className="text-[1.6rem] leading-none">{icono}</span>)}
          {/* El nombre de la plataforma (de vuelta el mismo día: «recupera el nombre»); el eslogan, si sobra sitio. */}
          {raiz && (
            <span className="hidden min-w-0 flex-col leading-none lg:flex">
              <span className="whitespace-nowrap text-[1.4rem] font-black tracking-tight text-slate-900">{raiz.titulo}</span>
              {/* El eslogan, debajo del nombre (2026-11-05, Eugenio: «que esté debajo de Luz y
                  Humanidad, del logo de arriba a la izquierda»). Antes solo salía en pantallas 2xl. */}
              {eslogan && <span className="mt-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{eslogan}</span>}
            </span>
          )}
        </Link>
        {!simple && <span aria-hidden className="basis-full max-md:order-1 md:hidden" />}
        {/* El ojo de las calificaciones, salvo que el sitio lo apague (`sitio.calificaciones: false`;
            2026-11-05, Eugenio: «quítalo de ocultar y mostrar las calificaciones» en el laboratorio). */}
        {!simple && c.sitio?.calificaciones !== false && <span className="flex shrink-0 items-center max-md:order-1"><BotonCalificaciones /></span>}
      </div>
      {/* LA RUTA: el territorio y el sistema (o la temática), cada uno con su desplegable. La ponen quienes saben (el
          termómetro, el filtro de la portada o la vista Círculo) en sus ranuras; sin nada dentro, no se ve. */}
      {!simple && <div data-ruta-barra className="hidden min-w-0 justify-center has-[[data-eslabon]]:flex max-md:order-last max-md:basis-full md:col-start-2">
        <div className="flex min-w-0 max-w-full items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1.5 shadow-sm">
          <div data-ranura-territorio className="contents" />
          <nav data-ranura-ruta aria-label="Estás en" className="flex min-w-0 items-center gap-1">{ruta}</nav>
        </div>
      </div>}
      <div className="contents md:col-start-3 md:flex md:min-w-0 md:items-center md:gap-2">
        {!simple && <div className="flex min-w-0 max-md:order-1 max-md:ml-auto"><BuscarBarra raizId={raizId} enLinea /></div>}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {raiz && !simple && <Suspense fallback={null}><BotonesLectura config={c} centrado={false} parte="donar" /></Suspense>}
          {!escaparate && <span data-hueco-cuenta="cabecera" className="contents" />}
        </span>
      </div>
    </header>
  );
}

/** EL ESLOGAN DEL ANCHO DEL NOMBRE, CON LAS LETRAS A LA MISMA DISTANCIA (2026-11-06, Eugenio:
 *  «que las letras tengan la misma distancia entre ellas y encajen debajo del logotipo; hazlo
 *  un poco más grande para que se cumpla»). Se mide lo que ocupa a su tamaño y el hueco que
 *  falta hasta el ancho del nombre se reparte por igual entre todas las letras. */
function Eslogan({ texto }: { texto: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // El tamaño que llena un 88 % del ancho del nombre; el 12 % restante, repartido entre las letras.
  const [medida, setMedida] = useState<{ tam: number; espacio: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current, nombre = el?.previousElementSibling as HTMLElement | null;
    if (!el || !nombre) return;
    // La letra del sistema cambia de dibujo según el tamaño (SF Text / SF Display), así que no
    // escala en línea recta: se mide al tamaño de verdad y se corrige un par de veces.
    const ancho = (tam: number) => {
      const prueba = document.createElement('span');
      prueba.textContent = texto;
      const cs = getComputedStyle(el);
      prueba.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;letter-spacing:0';
      prueba.style.fontFamily = cs.fontFamily; prueba.style.fontWeight = cs.fontWeight; prueba.style.fontSize = `${tam}px`;
      document.body.appendChild(prueba);
      const w = prueba.getBoundingClientRect().width;
      prueba.remove();
      return w;
    };
    const medir = () => {
      const total = nombre.getBoundingClientRect().width;
      if (!total) return;
      let tam = 12;
      for (let i = 0; i < 3; i++) { const w = ancho(tam); if (!w) return; tam = Math.min(15, tam * (total * 0.88) / w); }
      const huecos = Math.max(1, [...texto].length - 1);
      setMedida({ tam, espacio: Math.max(0, (total - ancho(tam)) / huecos) });
    };
    medir();
    document.fonts?.ready.then(medir).catch(() => {});
  }, [texto]);
  return (
    <span ref={ref} data-eslogan className="mt-1 w-0 min-w-full whitespace-nowrap font-semibold text-slate-500 max-sm:hidden"
      style={{ fontSize: medida ? `${medida.tam}px` : '11.5px', letterSpacing: medida ? `${medida.espacio}px` : undefined }}>{texto}</span>
  );
}

/** The site bar over a project: the site, small, top left («Proyecto impulsado por …»); the project's name in the
 *  middle, back to the project's own front page; Participa and the languages on the right. */
function CabeceraProyecto({ raiz, icono, proyecto, participa, oculta }: {
  raiz: Raiz | null; icono: string | null; proyecto: { titulo: string; href: string };
  participa: ReactNode; oculta: boolean;
}) {
  // The project's front page is the same address without a section (#…): going there from inside the project
  // must not reload the app, only clear the section, so the app hears it as a hash change.
  const alInicio = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname.replace(/\/$/, '') !== proyecto.href.replace(/\/$/, '')) return;
    e.preventDefault();
    window.history.pushState(null, '', proyecto.href);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.scrollTo({ top: 0 });
  };
  return (
    <header data-cabecera-sitio className={cn("sticky top-0 z-40 -mt-[18px] mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-slate-100 bg-white/95 px-4 py-2 backdrop-blur transition-transform duration-300 [grid-template-areas:'sitio_menu'_'proyecto_proyecto'] sm:-mt-5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-x-6 sm:px-6 sm:[grid-template-areas:'sitio_proyecto_acciones']",
      oculta && 'max-sm:-translate-y-full')}
      style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }}>
      <style>{'html { overflow-x: clip; }'}</style>
      <Link to="/" className="flex min-w-0 items-center gap-2 [grid-area:sitio]" aria-label={raiz ? `Proyecto impulsado por ${raiz.titulo}: ir a su inicio` : 'Inicio'}>
        {icono && (/^(https?:|\/)/.test(icono)
          ? <img src={miniatura(icono, 96)} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain sm:h-9 sm:w-9" />
          : <span className="text-[1.3rem] leading-none">{icono}</span>)}
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[11px] font-medium text-slate-500">Proyecto impulsado por</span>
          <span className="truncate text-[15px] font-black tracking-tight text-slate-900 sm:text-base">{raiz?.titulo ?? ''}</span>
        </span>
      </Link>
      <a href={proyecto.href} onClick={alInicio}
        className="min-w-0 justify-self-center text-center text-[1.15rem] font-black leading-tight tracking-tight text-slate-900 hover:text-slate-700 [grid-area:proyecto] sm:text-[1.5rem] lg:text-[1.75rem]">
        {proyecto.titulo}
      </a>
      <div className="hidden min-w-0 items-center justify-end gap-2 [grid-area:acciones] sm:flex">
        {participa}
        <SelectorIdioma />
      </div>
      <MenuMovil>
        {participa}
        <SelectorIdioma />
      </MenuMovil>
    </header>
  );
}
