import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  User, LogOut, Store, Map as MapIcon, Globe2, Database, Settings,
  Compass, Menu, X, FolderKanban, Users2, Gamepad2, AppWindow, Globe, ListChecks,
} from 'lucide-react';
import { abrirVentana, pulsarVentana, cerrarVentana, maximizarVentana, ordenarVentanas, pedirVentanas, type VentanaEstado } from '../ventanas/bus';
import GestorVentanas from '../ventanas/GestorVentanas';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { useEdit } from '../../contexts/EditContext';
import AIAssistant from '../ai/AIAssistant';

// ============================================================================
// Layout — barra superior mínima (2026-08-05, decisión del usuario)
// ============================================================================
// Sin menú hamburguesa y sin buscador global: la marca «Humanity Wiki», dos
// destinos primarios (Mapa y Grafos) y las acciones. Todo lo demás se
// encuentra con el chat de IA de la parte inferior.

/** Todo lo que no son los dos destinos principales. */
// LAS HERRAMIENTAS. La plataforma es un juego de aplicaciones sobre UNA base
// de datos: un proyecto, un grafo, un mapa o un mundo 3D son formas distintas
// de tocar lo mismo (petición de Eugenio, 2026-08-20). Cada entrada abre una
// VENTANA, estés donde estés — ya no hay una página «Escritorio» aparte.
const SECCIONES_COMUN = [
  { to: '/grafos', label: 'Grafos', icon: Globe2 },
  { to: '/mapas', label: 'Mapas', icon: MapIcon },
  { to: '/juego', label: 'Mundo 3D', icon: Gamepad2 },
  { to: '/proyectos', label: 'Mis proyectos', icon: FolderKanban },
  { to: '/tareas', label: 'Tareas', icon: ListChecks },
  { to: '/archivos', label: 'Archivos', icon: Database },
  { to: '/explorar', label: 'Explorar', icon: Compass },
];
const SECCIONES_TUYO: Array<{ to: string; label: string; icon: any }> = [];
const SECCIONES_PIE = [
  { to: '/mercado', label: 'Mercado', icon: Store },
  { to: '/vision', label: 'Visión y hoja de ruta', icon: Compass },
];
/** Para buscar el icono de una ventana abierta por su ruta. */
const TODAS_SECCIONES = [...SECCIONES_COMUN, ...SECCIONES_TUYO, ...SECCIONES_PIE];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { updateCounter } = useEdit();

  // Menú de tres líneas junto al logo: todo lo que no son los dos destinos
  // principales vive aquí (decisión del usuario, 2026-08-08).
  const [menuOpen, setMenuOpen] = useState(false);
  // Las ventanas abiertas del Escritorio, para pintarlas como ICONOS en la
  // única barra de arriba. El estado vive en el gestor; aquí llega solo el eco
  // (ver bus.ts).
  const [ventanasAbiertas, setVentanasAbiertas] = useState<VentanaEstado[]>([]);
  useEffect(() => {
    const f = (e: Event) => setVentanasAbiertas([...((e as CustomEvent).detail as VentanaEstado[])]);
    window.addEventListener('humanity:ventanas', f);
    pedirVentanas();
    return () => window.removeEventListener('humanity:ventanas', f);
  }, []);
  const menuRef = useRef<HTMLDivElement>(null);

  // ARRASTRAR PESTAÑAS (Eugenio, 2026-08-20: «también cambiarlas de posición
  // pinchando y arrastrando»). Con `draggable` del propio navegador: son diez
  // elementos en una fila, no hace falta traer una librería de arrastre para
  // esto. El id viaja en una referencia y no en `dataTransfer` porque Safari
  // no deja leer los datos hasta que sueltas, y así el destino no puede saber
  // durante el gesto si tiene que apartarse.
  const arrastrando = useRef<string | null>(null);

  // UN CLIC Y DOS CLICS EN LA MISMA PESTAÑA.
  //
  // Un clic en la pestaña que ya está delante la MINIMIZA (como la barra de
  // tareas de toda la vida), y eso choca con el doble clic: el navegador manda
  // clic, clic y doble clic, así que la ventana se escondía y volvía de golpe
  // antes de agrandarse. Feo, y a pantalla completa se ve como un parpadeo.
  //
  // Solución: traer al frente es INMEDIATO (que es el caso normal y tiene que
  // sentirse instantáneo) y solo se hace esperar el minimizar, que es el único
  // que se pisa con el doble clic. Si el doble clic llega, se cancela.
  const esperaMinimizar = useRef<number | null>(null);
  const cancelarEspera = () => {
    if (esperaMinimizar.current) { clearTimeout(esperaMinimizar.current); esperaMinimizar.current = null; }
  };
  const pulsarPestana = (v: VentanaEstado) => {
    cancelarEspera();
    if (!v.delante) { pulsarVentana(v.id); return; }
    esperaMinimizar.current = window.setTimeout(() => {
      esperaMinimizar.current = null;
      pulsarVentana(v.id);
    }, 220);
  };
  const doblePestana = (v: VentanaEstado) => { cancelarEspera(); maximizarVentana(v.id); };
  useEffect(() => cancelarEspera, []);
  const soltarPestana = (destino: number) => {
    const id = arrastrando.current;
    arrastrando.current = null;
    if (!id) return;
    const ids = ventanasAbiertas.map(v => v.id);
    const desde = ids.indexOf(id);
    if (desde < 0 || desde === destino) return;
    ids.splice(destino, 0, ids.splice(desde, 1)[0]);
    ordenarVentanas(ids);
  };

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  // Al cambiar de página, el desplegable se cierra solo.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  // La otra punta del puente: lo que una ventana manda con `postMessage` se
  // vuelve a lanzar aquí como evento normal, y el asistente lo oye igual que
  // si hubiera pasado en esta misma página. Se comprueba el origen: solo se
  // escucha a nuestras propias ventanas, y solo estos dos avisos.
  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const t = (e.data || {}).humanity;
      if (t !== 'humanity:juego-contexto' && t !== 'humanity:asistente-focus') return;
      window.dispatchEvent(new CustomEvent(t, { detail: (e.data || {}).detalle }));
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, []);

  // Modo embed: la app se incrusta a sí misma (p. ej. el mapa dentro de una
  // ventana de conocimiento, o cualquier sección en una ventana del Escritorio)
  // sin barra superior ni asistente.
  //
  // Se mira TAMBIÉN si vamos dentro de un marco, y no solo el `embed=1` de la
  // dirección (2026-08-20, segunda vez que Eugenio ve dos menús): el parámetro
  // se PIERDE en cuanto la página de dentro navega por su cuenta —iniciar
  // sesión, pulsar un enlace, una redirección— y a partir de ahí la ventana
  // volvía a pintar la app entera con su cabecera dentro de sí misma. Ir en un
  // marco es un hecho que no se puede perder al navegar; el parámetro sí.
  const enUnMarco = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const isEmbed = enUnMarco || new URLSearchParams(location.search).get('embed') === '1';
  const isMapPage = location.pathname === '/mapa';
  // El LIENZO de un grafo (`/grafos/:slug`) y la Red de Datos: a sangre
  // completa, con el chat de IA como barra inferior.
  //
  // OJO: `/grafos` a secas NO entra aquí. Es la lista de fichas, una página
  // normal — cuando entraba, salía a pantalla completa y con una barra de chat
  // pegada abajo, que es justo la «barra extra» que sobraba (Eugenio,
  // 2026-08-20).
  const isGrafosPage = location.pathname === '/red' || /^\/grafos\/.+/.test(location.pathname);
  // /mapas (el grafo de mapas) es lienzo a sangre con la barra de IA.
  const isMapasPage = location.pathname === '/mapas';
  // /retos-vistas: el cruce de caminos de un reto con varias vistas (grafos).
  const isRetoVistasPage = location.pathname.startsWith('/retos-vistas');
  // Mi Conocimiento: el lienzo personal — a sangre completa y con barra de IA.
  const isMiConocimientoPage = location.pathname === '/mi-conocimiento';
  // Ya no hay portada: «/» redirige a tu perfil (Eugenio, 2026-08-20:
  // «quita el botón de inicio y la página, la página por defecto Mi Perfil»).
  // Mundo 3D: a pantalla completa; el robot del mundo ES el
  // asistente, así que la barra de IA vive abajo como en los lienzos.
  const isJuegoPage = location.pathname === '/juego';
  // Explorar/Mis publicaciones se fusionaron en una sola página con su propio
  // menú lateral de carpetas (2026-08-08): necesita el alto completo, no la
  // columna centrada con márgenes que llevan las páginas de lectura.
  const isExplorarPage = location.pathname === '/explorar' || location.pathname === '/mis-publicaciones';
  const fullBleed = isMapPage || isGrafosPage || isMapasPage || isRetoVistasPage || isMiConocimientoPage || isExplorarPage || isJuegoPage;

  if (isEmbed) {
    return (
      // OJO con el desbordamiento: esto era `overflow-hidden` siempre, y por
      // eso una página normal abierta en una ventana —tu perfil, por ejemplo—
      // se quedaba cortada por abajo sin poder bajar (Eugenio, 2026-08-20:
      // «arregla que no me deja bajar en la página»). El lienzo y el Mundo 3D
      // sí quieren el alto exacto: ellos gestionan su propio desplazamiento.
      <div className={cn('h-screen w-full bg-white relative',
        fullBleed ? 'overflow-hidden' : 'overflow-y-auto')}>
        <Outlet />
        {/* DENTRO DE UNA VENTANA NO HAY ASISTENTE PROPIO (Eugenio, 2026-08-20:
            «que sea coherente en todas las herramientas»). Antes cada ventana
            montaba su propia barra de chat y acababas con dos asistentes, dos
            historiales y dos sitios donde arreglar lo mismo. Ahora el de fuera
            es el único, y sabe qué ventana tienes delante.

            Lo que sí cruza es la voz del robot del Mundo 3D: vive aquí dentro
            y el asistente vive fuera, así que sus avisos se reenvían a la app
            de fuera con `postMessage`. */}
        <PuenteAlAsistente />
      </div>
    );
  }

  /** Una entrada del menú ☰. SIEMPRE abre una ventana, estés donde estés
   *  (petición de Eugenio, 2026-08-20: «que cuando haces click en una de las
   *  apps ya se te quede arriba, sin necesidad de tener que estar en
   *  escritorio»).
   *
   *  TU PERFIL TAMBIÉN, y con razón (Eugenio, 2026-08-20: «la página de mi
   *  perfil no funciona bien como el resto de herramientas… es una página muy
   *  importante y tiene que tener la misma funcionalidad de escritorio»). Se
   *  había dejado navegando por creerla «un sitio donde vas una vez», y es al
   *  revés: es a donde más se vuelve.
   *
   *  Lo único que sigue navegando es INICIAR SESIÓN: mientras no hay sesión no
   *  hay escritorio al que volver, y entrar dentro de una ventana te deja la
   *  app de fuera sin enterarse de que ya has entrado. */
  const entradaMenu = (x: { to: string; label: string; icon: any; navega?: boolean }) => {
    const abierta = ventanasAbiertas.some(v => v.destino === x.to);
    const clases = cn('w-full flex items-center gap-2.5 px-4 py-2 text-sm font-bold transition-colors text-left',
      abierta || location.pathname === x.to ? 'text-emerald-700 bg-emerald-50' : 'text-slate-700 hover:bg-slate-50');
    if (x.navega) {
      return (
        <Link key={x.to} to={x.to} className={clases}>
          <x.icon className="w-4 h-4 shrink-0 text-slate-400" /> {x.label}
        </Link>
      );
    }
    return (
      <button key={x.to} className={clases}
        onClick={() => { abrirVentana({ titulo: x.label, clase: 'app', destino: x.to }); setMenuOpen(false); }}>
        <x.icon className="w-4 h-4 shrink-0 text-slate-400" /> {x.label}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      {/* Barra superior mínima: marca + Mapa/Grafos + acciones */}
      <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-3 sm:px-6 flex items-center gap-3 z-40 shrink-0 shadow-sm">
        {/* Menú de tres líneas: todo lo demás vive aquí */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            title="Todas las secciones"
            className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
              menuOpen ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}
          >
            {menuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
          </button>

          {menuOpen && (
            <div className="absolute top-11 left-0 w-64 max-h-[calc(100vh-70px)] overflow-y-auto bg-white border border-slate-200 shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* El Navegador, SIEMPRE a un clic (petición de Eugenio,
                  2026-08-20: «directamente en el menú, sin tener que ir
                  primero a escritorio»). Fuera del Escritorio deja la
                  apertura apuntada y navega; el gestor la recoge al montar. */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  abrirVentana({ titulo: 'Navegador', clase: 'navegador', destino: 'about:inicio' });
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 text-left"
              >
                <Globe className="w-4 h-4 shrink-0 text-sky-600" /> Navegador
              </button>
              <div className="h-px bg-slate-100 my-1.5" />
              <p className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">El común</p>
              {SECCIONES_COMUN.map(entradaMenu)}
              <div className="h-px bg-slate-100 my-1.5" />
              {SECCIONES_PIE.map(entradaMenu)}

              {/* Tu cuenta: lo que antes vivía a la derecha de la cabecera
                  (petición de Eugenio, 2026-08-20: «que no quede nada, solo
                  el logo»). */}
              <div className="h-px bg-slate-100 my-1.5" />
              <p className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Tu cuenta</p>
              {user ? (
                <>
                  {entradaMenu({ to: `/personas/${user.id}`, label: 'Mi Perfil', icon: User })}
                  {user.isAdmin && entradaMenu({ to: '/admin/usuarios', label: 'Administrar usuarios', icon: Users2 })}
                  {/* El inventario de tablas reales. Era «Base de Datos» en el
                      menú principal; ese sitio lo ocupa ahora «Archivos» (lo
                      tuyo). Sigue vivo aquí porque es una herramienta útil de
                      administración, no una página que nadie quisiera. */}
                  {user.isAdmin && entradaMenu({ to: '/base-de-datos', label: 'Base de datos (tablas)', icon: Database })}
                  {entradaMenu({ to: '/configuracion', label: 'Configuración', icon: Settings })}
                  <button
                    onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0 text-slate-400" /> Cerrar sesión
                  </button>
                </>
              ) : (
                entradaMenu({ to: '/login', label: 'Iniciar sesión', icon: User, navega: true })
              )}
            </div>
          )}
        </div>

        {/* Marca */}
        <Link to="/" className="shrink-0 hover:opacity-85 transition-opacity">
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
            {/* «Wiki» plateado (petición de Eugenio, 2026-08-20): degradado
                vertical claro en el centro — así es como se lee «metal pulido»
                sin salirse de la paleta slate de la app. */}
            Humanity<span className="bg-gradient-to-b from-slate-500 via-slate-300 to-slate-600 bg-clip-text text-transparent"> Wiki</span>
          </span>
        </Link>

        {/* Las ventanas abiertas del Escritorio, como ICONOS (2026-08-19,
            petición de Eugenio: «en ese uno es donde deben estar las ventanas
            en forma de iconos para que no ocupen mucho»). Pulsar uno trae la
            ventana; si ya está delante, la minimiza. */}
        {ventanasAbiertas.length > 0 && (
          <div className="flex items-center gap-1 ml-1 overflow-x-auto min-w-0">
            {ventanasAbiertas.map((v, i) => {
              // Las de la cuenta no están en TODAS_SECCIONES (su dirección
              // lleva tu id dentro), así que se reconocen por el principio.
              const Icono = v.clase === 'navegador'
                ? Globe
                : v.destino.startsWith('/personas/') ? User
                  : v.destino === '/configuracion' ? Settings
                    : v.destino === '/admin/usuarios' ? Users2
                      : (TODAS_SECCIONES.find(sec => sec.to === v.destino)?.icon || AppWindow);
              return (
                <div
                  key={v.id}
                  draggable
                  onDragStart={e => { arrastrando.current = v.id; e.dataTransfer.effectAllowed = 'move'; }}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                  onDrop={e => { e.preventDefault(); soltarPestana(i); }}
                  onDragEnd={() => { arrastrando.current = null; }}
                  onClick={() => pulsarPestana(v)}
                  onDoubleClick={() => doblePestana(v)}
                  title={`${v.titulo} — doble clic para verla a pantalla completa`}
                  className={cn('group h-8 flex items-center gap-1.5 pl-2.5 rounded-lg border shrink-0 cursor-pointer transition-colors',
                    // La ✕ solo en la pestaña que miras (Eugenio, 2026-08-20:
                    // «para que ocupe menos»): las demás no gastan esos 20 px.
                    v.delante ? 'pr-1' : 'pr-2.5',
                    v.delante
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : v.minimizada
                        ? 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')}
                >
                  <Icono className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-black tracking-tight max-w-[8rem] truncate">{v.titulo}</span>
                  {/* La ✕ de una pestaña de navegador, y SOLO en la que
                      miras. `stopPropagation` para que cerrar no cuente
                      además como pulsar la pestaña. */}
                  {v.delante && (
                    <button
                      onClick={e => { e.stopPropagation(); cerrarVentana(v.id); }}
                      title={`Cerrar ${v.titulo}`}
                      className="w-5 h-5 grid place-items-center rounded shrink-0 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Nada más (petición de Eugenio, 2026-08-20: «que no quede nada,
            solo el logo»): Explorar, Mercado, Contribuye, la cuenta y los
            ajustes viven ahora ordenados dentro del menú ☰. */}
        <div className="flex-1" />
      </header>

      {/* Contenido + Asistente IA: fila flex real — el panel acoplado empuja
          el contenido en vez de superponerse. En las páginas de Grafos el
          asistente se renderiza como barra inferior (dentro de la página,
          posición fija), no como columna. */}
      <div className="flex-1 flex overflow-hidden">
        {/* La página y las ventanas comparten el MISMO hueco: así una ventana
            maximizada tapa la página, pero nunca el panel del asistente, que
            es la columna de al lado. */}
        <div className="flex-1 flex flex-col relative min-w-0">
          <main key={updateCounter} className={`flex-1 flex flex-col overflow-y-auto bg-white relative min-w-0 ${fullBleed ? '' : 'p-4 sm:p-8'}`}>
            <div className={fullBleed ? 'w-full h-full' : 'max-w-7xl mx-auto w-full'}>
              <Outlet />
            </div>
          </main>

          {/* LAS VENTANAS, SIEMPRE. Ya no hay una página «Escritorio»: el
              gestor es una capa sobre toda la app (petición de Eugenio,
              2026-08-20). Sin ventanas abiertas no se ve ni estorba —no
              captura clics—, y la página de debajo funciona como siempre.
              Va DESPUÉS de <main> y con z propio: antes, al abrir algo desde
              el menú, la ventana nacía por debajo de la página que estabas
              mirando y parecía que no había pasado nada. */}
          <GestorVentanas />
        </div>

        {/* UN SOLO ASISTENTE, EL MISMO EN TODAS LAS HERRAMIENTAS. */}
        <AIAssistant />
      </div>

      {/* Sin pie de página (Eugenio, 2026-08-20: «que no haya otra barra
          abajo»). Solo hay UNA barra, la de arriba, y es la que lleva el menú
          y las ventanas abiertas. */}
    </div>
  );
}

/**
 * EL PUENTE ENTRE UNA VENTANA Y EL ASISTENTE DE FUERA.
 *
 * El robot del Mundo 3D y los lienzos hablan por eventos del navegador
 * (`humanity:juego-contexto`, `humanity:asistente-focus`), pero esos eventos se
 * quedan dentro del marco. Este puente los reenvía a la app de fuera, que es
 * donde vive el único asistente. Solo va HACIA FUERA y solo con esos dos
 * nombres: nada de dentro puede pedirle a la app de fuera ninguna otra cosa.
 */
function PuenteAlAsistente() {
  useEffect(() => {
    const reenviar = (e: Event) => {
      try {
        window.parent?.postMessage({
          humanity: (e as CustomEvent).type,
          detalle: (e as CustomEvent).detail ?? null,
        }, window.location.origin);
      } catch { /* si el marco es de otro origen, no hay puente y ya está */ }
    };
    window.addEventListener('humanity:juego-contexto', reenviar);
    window.addEventListener('humanity:asistente-focus', reenviar);
    return () => {
      window.removeEventListener('humanity:juego-contexto', reenviar);
      window.removeEventListener('humanity:asistente-focus', reenviar);
    };
  }, []);
  return null;
}
