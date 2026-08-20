import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  User, LogOut, Store, Map as MapIcon, Globe2, Database, Settings,
  Compass, Menu, X, FolderKanban, Users2, Gamepad2, AppWindow, Globe, ListChecks,
  FileText, ChevronDown,
} from 'lucide-react';
import { abrirVentana, pulsarVentana, cerrarVentana, maximizarVentana, ordenarVentanas, pedirVentanas, type VentanaEstado } from '../ventanas/bus';
import GestorVentanas from '../ventanas/GestorVentanas';
import MenuLateral from './MenuLateral';
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

// EL MENÚ SE HA IDO A `MenuLateral` (2026-08-20). Lo que queda aquí es solo la
// tabla de «qué icono lleva cada ruta», que es lo que necesitan las PESTAÑAS
// de arriba para pintarse.
const SECCIONES_COMUN = [
  { to: '/esquemas', label: 'Grafos', icon: Globe2 },
  { to: '/mapas', label: 'Mapas', icon: MapIcon },
  { to: '/juego', label: 'Mundo 3D', icon: Gamepad2 },
  { to: '/proyectos', label: 'Mis proyectos', icon: FolderKanban },
  { to: '/paginas', label: 'Páginas', icon: FileText },
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

/** Qué icono le toca a una ruta. Se mira primero la coincidencia exacta (una
 *  herramienta abierta en su portada) y después el PREFIJO, que es lo que
 *  identifica una cosa concreta: `/esquemas/ceuta` es un esquema. */
function iconoDeRuta(ruta: string) {
  const camino = ruta.split('?')[0];
  const exacta = TODAS_SECCIONES.find(sec => sec.to === camino);
  if (exacta) return exacta.icon;
  const porPrefijo: Array<[string, any]> = [
    ['/personas/', User], ['/proyectos/', FolderKanban], ['/paginas/', FileText],
    ['/esquemas/', Globe2], ['/mapas/', MapIcon], ['/documentos/', FileText],
    ['/organizaciones/', Users2],
  ];
  for (const [pre, icono] of porPrefijo) if (camino.startsWith(pre)) return icono;
  if (camino === '/configuracion') return Settings;
  if (camino === '/admin/usuarios') return Users2;
  if (camino.startsWith('/tareas')) return ListChecks;
  if (camino.startsWith('/paginas')) return FileText;
  if (camino.startsWith('/esquemas')) return Globe2;
  return AppWindow;
}

export default function Layout() {
  const location = useLocation();
  const { user, logout, refresh: refrescarSesion } = useAuth();
  const navigate = useNavigate();
  const { updateCounter } = useEdit();

  // El menú lateral, plegado o abierto. Se recuerda en tus ajustes de usuario
  // (jsonb, sin migración): el menú te encuentra como lo dejaste.
  const [menuColapsado, setColapsado] = useState<boolean>(() => {
    try { return localStorage.getItem('humanity:menu-colapsado') === '1'; } catch { return false; }
  });
  const setMenuColapsado = (v: boolean) => {
    setColapsado(v);
    try { localStorage.setItem('humanity:menu-colapsado', v ? '1' : '0'); } catch { /* lleno */ }
  };
  // Las ventanas abiertas del Escritorio, para pintarlas como ICONOS en la
  // única barra de arriba. El estado vive en el gestor; aquí llega solo el eco
  // (ver bus.ts).
  const [ventanasAbiertas, setVentanasAbiertas] = useState<VentanaEstado[]>([]);
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const cuentaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (cuentaRef.current && !cuentaRef.current.contains(e.target as Node)) setCuentaAbierta(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);
  useEffect(() => {
    const f = (e: Event) => setVentanasAbiertas([...((e as CustomEvent).detail as VentanaEstado[])]);
    window.addEventListener('humanity:ventanas', f);
    pedirVentanas();
    return () => window.removeEventListener('humanity:ventanas', f);
  }, []);

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

  // La otra punta del puente: lo que una ventana manda con `postMessage` se
  // vuelve a lanzar aquí como evento normal, y el asistente lo oye igual que
  // si hubiera pasado en esta misma página. Se comprueba el origen: solo se
  // escucha a nuestras propias ventanas, y solo estos dos avisos.
  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const t = (e.data || {}).humanity;
      // Alguien entró o salió DENTRO de una ventana: se vuelve a preguntar
      // quién eres y se avisa a las demás ventanas para que hagan lo mismo.
      if (t === 'humanity:sesion-cambiada') {
        refrescarSesion().then(() => {
          window.dispatchEvent(new Event('humanity:sesion-fuera'));
        });
        return;
      }
      // `humanity:ruta` NO se reenvía aquí: hay que saber de qué ventana viene,
      // y eso solo lo sabe quien tiene los marcos (el gestor de ventanas), que
      // lo escucha por su cuenta comparando `event.source` con cada iframe.
      if (t !== 'humanity:juego-contexto' && t !== 'humanity:asistente-focus') return;
      window.dispatchEvent(new CustomEvent(t, { detail: (e.data || {}).detalle }));
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, [refrescarSesion]);

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
  // El LIENZO de un grafo (`/esquemas/:slug`) y la Red de Datos: a sangre
  // completa, con el chat de IA como barra inferior.
  //
  // OJO: `/esquemas` a secas NO entra aquí. Es la lista de fichas, una página
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
  // La ficha de una persona: perfil arriba y conversación abajo. La
  // conversación necesita el alto real de la ventana para poder desplazarse
  // sola; con márgenes de página, el cuadro de escribir se iría fuera.
  const isPersonaPage = location.pathname.startsWith('/persona/');
  const fullBleed = isMapPage || isGrafosPage || isMapasPage || isRetoVistasPage || isMiConocimientoPage || isExplorarPage || isJuegoPage || isPersonaPage;

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

  return (
    // LA FORMA DE LA APP (2026-08-20): una FILA — menú lateral a la izquierda,
    // y a su derecha la columna de barra + contenido. Antes era una columna con
    // el menú metido en un desplegable del botón ☰; con un árbol de proyectos
    // dentro eso no vale, porque se cerraba en cuanto pulsabas nada.
    <div className="flex h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      <MenuLateral colapsado={menuColapsado} onColapsar={setMenuColapsado} activo={location.pathname} />

      <div className="flex-1 flex flex-col min-w-0">
      {/* Barra superior: SOLO las ventanas abiertas. La marca y las secciones
          se han ido al menú lateral. */}
      <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-3 flex items-center gap-3 z-40 shrink-0 shadow-sm">

        {/* Las ventanas abiertas del Escritorio, como ICONOS (2026-08-19,
            petición de Eugenio: «en ese uno es donde deben estar las ventanas
            en forma de iconos para que no ocupen mucho»). Pulsar uno trae la
            ventana; si ya está delante, la minimiza. */}
        {ventanasAbiertas.length > 0 && (
          <div className="flex items-center gap-1 ml-1 overflow-x-auto min-w-0">
            {ventanasAbiertas.map((v, i) => {
              // EL ICONO DE LA PESTAÑA ES EL DE LO QUE HAY DENTRO AHORA
              // (Eugenio, 2026-08-20: «que la ventana muestre el icono de la
              // página, grafo o proyecto en el que está específicamente»), no
              // el de dónde nació — como el favicon de una pestaña de Chrome,
              // que cambia al navegar. Por eso se mira `ruta` y no `destino`.
              const Icono = v.clase === 'navegador' ? Globe : iconoDeRuta(v.ruta || v.destino);
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

        <div className="flex-1" />

        {/* LA CUENTA, ARRIBA A LA DERECHA DEL TODO (Eugenio, 2026-08-20). Es
            donde la busca todo el mundo, y además es lo que hace visible de un
            vistazo si has entrado o no — que era justo lo que no se veía
            cuando iniciabas sesión dentro del Mundo 3D. */}
        <div className="relative shrink-0" ref={cuentaRef}>
          {user ? (
            <>
              <button
                onClick={() => setCuentaAbierta(o => !o)}
                title={`${user.displayName || user.email} · ${user.roleLabel}`}
                className={cn('h-9 pl-1 pr-2 flex items-center gap-1.5 rounded-full border transition-colors',
                  cuentaAbierta ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}
              >
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                  : <span className="w-7 h-7 rounded-full bg-slate-100 grid place-items-center text-slate-400">
                      <User className="w-3.5 h-3.5" />
                    </span>}
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>

              {cuentaAbierta && (
                <div className="absolute top-11 right-0 w-52 bg-white border border-slate-200 shadow-2xl rounded-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <p className="px-3 pb-1.5 text-[11px] font-black text-slate-800 truncate">
                    {user.displayName || user.email}
                  </p>
                  <p className="px-3 pb-2 text-[10px] text-slate-400 truncate border-b border-slate-100">{user.roleLabel}</p>
                  <button onClick={() => { setCuentaAbierta(false); navigate(`/personas/${user.id}`); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Mi Perfil
                  </button>
                  <button onClick={() => { setCuentaAbierta(false); navigate('/configuracion'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                    <Settings className="w-3.5 h-3.5 text-slate-400" /> Configuración
                  </button>
                  <button onClick={() => { setCuentaAbierta(false); logout(); navigate('/'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-left">
                    <LogOut className="w-3.5 h-3.5 text-slate-400" /> Cerrar sesión
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link to="/login"
              className="h-9 px-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">
              <User className="w-3.5 h-3.5" /> Iniciar sesión
            </Link>
          )}
        </div>
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
          abajo»). Solo hay UNA barra, la de arriba, y lleva las ventanas. */}
      </div>
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
  const location = useLocation();
  const { user: usuarioActual, refresh: refrescarSesion } = useAuth();
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

  // LA SESIÓN ES DE TODA LA APP (Eugenio, 2026-08-20: «he iniciado sesión en el
  // Mundo 3D pero no me ha hecho eso inicio de sesión en el resto»). La cookie
  // SÍ era compartida —es del dominio entero—, pero la app de fuera no se
  // enteraba: había preguntado quién eras al arrancar, le dijeron «nadie», y
  // no volvía a preguntar. Ahora la ventana avisa al entrar o salir, y fuera
  // se vuelve a preguntar. Se manda solo el hecho de que cambió, nunca la
  // cookie ni el token.
  useEffect(() => {
    try {
      window.parent?.postMessage({
        humanity: 'humanity:sesion-cambiada', detalle: usuarioActual?.id ?? null,
      }, window.location.origin);
    } catch { /* sin puente */ }
  }, [usuarioActual?.id]);

  // Y al revés: si la sesión cambia FUERA, esta ventana se entera. Llega por
  // `postMessage` desde la app de fuera, con el origen comprobado.
  useEffect(() => {
    const alMensaje = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if ((e.data || {}).humanity !== 'humanity:refresca-sesion') return;
      refrescarSesion();
    };
    window.addEventListener('message', alMensaje);
    return () => window.removeEventListener('message', alMensaje);
  }, [refrescarSesion]);

  // Y la RUTA: cada vez que la página de dentro navega, se lo dice a la de
  // fuera. Es lo que llena la barra de direcciones de la ventana y lo que le
  // da su historial de atrás/adelante — como una pestaña de un navegador.
  useEffect(() => {
    try {
      // SIN el `embed=1`: es una marca nuestra de «vas dentro de un marco», no
      // parte de la dirección. Si viajara, la de fuera la volvería a añadir al
      // reconstruir el `src` y la ventana se recargaría en bucle, acumulando
      // «&embed=1» sin fin (visto en pruebas, 2026-08-20).
      const limpio = new URLSearchParams(window.location.search);
      limpio.delete('embed');
      const cola = limpio.toString();
      window.parent?.postMessage({
        humanity: 'humanity:ruta',
        detalle: window.location.pathname + (cola ? `?${cola}` : ''),
      }, window.location.origin);
    } catch { /* sin puente */ }
  }, [location.pathname, location.search]);

  return null;
}
