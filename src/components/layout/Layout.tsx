import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  User, LogOut, Store, Map as MapIcon, Globe2, Database, Settings,
  Compass, Menu, X, FolderKanban, Users2, Gamepad2, AppWindow, Globe, ListChecks,
  FileText, ChevronDown, CalendarDays, ChevronsDownUp, ChevronsUpDown, Sparkles,
} from 'lucide-react';
import { abrirVentana, pulsarVentana, cerrarVentana, maximizarVentana, ordenarVentanas, pedirVentanas, type VentanaEstado } from '../ventanas/bus';
import GestorVentanas from '../ventanas/GestorVentanas';
import MenuLateral from './MenuLateral';
import Campana from '../social/Campana';
import { cn } from '../../utils/cn';
import { detectorDeGesto } from '../../utils/gestoAtrasAdelante';
import { useAuth } from '../../contexts/AuthContext';
import { useEdit } from '../../contexts/EditContext';
import { useEsMovil } from '../../hooks/useEsMovil';
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
  if (camino.startsWith('/calendario')) return CalendarDays;
  if (camino.startsWith('/ia')) return Sparkles;
  if (camino.startsWith('/persona/')) return User;
  if (camino.startsWith('/paginas')) return FileText;
  if (camino.startsWith('/esquemas')) return Globe2;
  return AppWindow;
}

export default function Layout() {
  const location = useLocation();
  // `cargandoSesion` es lo que arregla el DESTELLO DE SESIÓN CERRADA (B21).
  // Ver la nota larga donde se usa: mientras esto sea `true` no sabemos aún si
  // hay sesión, y la interfaz no puede afirmar ninguna de las dos cosas.
  const { user, loading: cargandoSesion, logout, refresh: refrescarSesion } = useAuth();
  const navigate = useNavigate();
  const { updateCounter } = useEdit();
  const esMovil = useEsMovil();

  // EL CAJÓN DEL MENÚ EN MÓVIL (B41). Empieza cerrado SIEMPRE y no se recuerda,
  // porque en un teléfono el menú abierto tapa la pantalla entera y nadie
  // quiere empezar cada visita mirando un menú.
  const [cajonAbierto, setCajonAbierto] = useState(false);

  // El menú lateral: puesto o escondido. YA NO HAY ESTADO INTERMEDIO
  // (2026-08-21, Eugenio: «vamos a hacer que se colapse del todo, tanto en
  // escritorio como en móvil»). El nombre `menuColapsado` y su clave en
  // localStorage se quedan como estaban a propósito: quien ya tenía el menú
  // plegado se lo encuentra escondido, que es lo más parecido a lo que eligió.
  const [menuColapsado, setColapsado] = useState<boolean>(() => {
    try { return localStorage.getItem('humanity:menu-colapsado') === '1'; } catch { return false; }
  });
  const setMenuColapsado = (v: boolean) => {
    setColapsado(v);
    try { localStorage.setItem('humanity:menu-colapsado', v ? '1' : '0'); } catch { /* lleno */ }
  };

  // ── UN SOLO CONCEPTO: EL MENÚ ESTÁ O NO ESTÁ ──────────────────────────────
  // Debajo hay dos estados distintos, y es a propósito. El de escritorio se
  // recuerda entre visitas; el de móvil no se recuerda NUNCA. Es la misma
  // disciplina que con las ventanas: el móvil LEE las preferencias del
  // escritorio pero no las ESCRIBE, así que mirar la plataforma desde el
  // teléfono no te recoloca el escritorio al volver a él.
  const menuPuesto = esMovil ? cajonAbierto : !menuColapsado;
  const ponerMenu = () => (esMovil ? setCajonAbierto(true) : setMenuColapsado(false));
  const esconderMenu = () => (esMovil ? setCajonAbierto(false) : setMenuColapsado(true));

  // Las ventanas abiertas del Escritorio, para pintarlas como ICONOS en la
  // única barra de arriba. El estado vive en el gestor; aquí llega solo el eco
  // (ver bus.ts).
  const [ventanasAbiertas, setVentanasAbiertas] = useState<VentanaEstado[]>([]);
  // MODO COMPACTO (Eugenio, 2026-08-20: «haz que se pueda ocultar con un botón
  // que haga que colapse en algo todavía más sencillo, con solo iconos de las
  // ventanas»). Las pestañas se quedan en iconos y la barra de dirección de
  // cada ventana desaparece: dos filas se vuelven una tira de 32 px.
  const [compacto, setCompacto] = useState<boolean>(() => {
    try { return localStorage.getItem('humanity:barra-compacta') === '1'; } catch { return false; }
  });
  const cambiarCompacto = (v: boolean) => {
    setCompacto(v);
    try { localStorage.setItem('humanity:barra-compacta', v ? '1' : '0'); } catch { /* lleno */ }
  };
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

  // EL CAJÓN SE CIERRA SOLO AL IR A ALGÚN SITIO. En un teléfono el menú tapa
  // la pantalla, así que dejarlo abierto encima de la página a la que acabas
  // de ir sería esconder justo lo que has pedido ver.
  useEffect(() => { setCajonAbierto(false); }, [location.pathname]);

  // Y TAMBIÉN AL ABRIR ALGO DESDE EL MENÚ, aunque no cambie la dirección.
  // Casi todas las entradas del menú no navegan: piden «abre esto» por el bus,
  // y en móvil eso acaba en una navegación (ver GestorVentanas). Pero si ya
  // estás en esa misma página, la ruta no cambia, el efecto de arriba no se
  // dispara y el cajón se quedaba abierto tapando la respuesta. Visto al
  // probarlo con el dedo: pulsar «Mi Perfil» dejaba el menú puesto encima.
  useEffect(() => {
    const alAbrir = () => setCajonAbierto(false);
    window.addEventListener('humanity:abrir-ventana', alAbrir);
    return () => window.removeEventListener('humanity:abrir-ventana', alAbrir);
  }, []);

  // Y con la tecla de escape, que es donde la busca cualquiera que abra esto
  // en un portátil estrechado.
  useEffect(() => {
    if (!cajonAbierto) return;
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') setCajonAbierto(false); };
    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [cajonAbierto]);

  // AL VOLVER A ESCRITORIO, EL CAJÓN NO SE QUEDA COLGADO. Girar el teléfono o
  // ensanchar la ventana con el cajón abierto dejaría un fondo oscuro sobre un
  // menú que ya vuelve a ser columna: dos menús a la vez.
  useEffect(() => { if (!esMovil) setCajonAbierto(false); }, [esMovil]);

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
  // El calendario ocupa el alto entero: la rejilla del mes se desplaza dentro
  // de sí misma, no arrastrando la página.
  const isCalendarioPage = location.pathname === '/calendario';
  // La herramienta «IA» va a pantalla completa como el calendario: es un chat
  // con su propio desplazamiento dentro, no un documento que se lea scrolleando.
  const isIAPage = location.pathname.startsWith('/ia');
  const fullBleed = isMapPage || isGrafosPage || isMapasPage || isRetoVistasPage || isMiConocimientoPage || isExplorarPage || isJuegoPage || isPersonaPage || isCalendarioPage || isIAPage;

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
      {/* EL MENÚ DE TRABAJO ES PARA QUIEN HA ENTRADO (2026-08-20). Antes se
          pintaba igual a un visitante anónimo —hasta en /login— con «Todavía
          no tienes proyectos» y «Todavía no ofreces nada» hablándole de tú a
          alguien que no tiene nada porque ni siquiera ha entrado. Sin sesión
          no hay proyectos, ni productos, ni personas: enseñar el armazón vacío
          no informa, confunde. */}
      {/* EN ESCRITORIO, LA COLUMNA DE SIEMPRE. En móvil no ocupa sitio en la
          fila: se pinta más abajo como cajón por encima del contenido (B41).
          En una pantalla de 390 px esta columna se comía 240 y al contenido le
          quedaban 118 px útiles: el texto salía a una palabra por línea y en
          /login ni «CONTRASEÑA» ni el botón de entrar cabían enteros. */}
      {user && !esMovil && menuPuesto && (
        <MenuLateral activo={location.pathname} onCerrar={esconderMenu} />
      )}

      {/* MIENTRAS NO SE SABE SI HAY SESIÓN, UN HUECO (B21, parte 1). Sin esto
          la columna aparece de golpe cuando contesta el servidor y toda la
          página da un salto lateral de 240 px. Un hueco del mismo ancho no
          dice nada y no se mueve nada.
          Solo cuando el menú va a estar puesto: si lo tenías escondido, no hay
          columna que reservar y el hueco sería el salto que evitamos. */}
      {!user && cargandoSesion && !esMovil && menuPuesto && (
        <div aria-hidden className="shrink-0 h-full w-60 border-r border-slate-200 bg-white" />
      )}

      <div className="flex-1 flex flex-col min-w-0">
      {/* Barra superior: SOLO las ventanas abiertas. La marca y las secciones
          se han ido al menú lateral. */}
      {/* Más baja que antes (56 → 40 px, y 32 en compacto): eran tres filas de
          cosas para lo mismo y ahora son dos, así que cada una tiene que pesar
          lo mínimo. */}
      {/* LA BARRA CRECE CUANDO NO ESTÁ EL MENÚ, y es a propósito. El botón de
          traerlo de vuelta tiene que ser grande (Eugenio, 2026-08-21), y algo
          de 52 px no cabe en una barra de 40 sin salirse por debajo y taparle
          el contenido a la página. Se probó primero flotando sobre la página y
          se vio el daño en una captura: en /explorar tapaba las tres primeras
          carpetas. Crecer 16 px una sola vez es un precio que se paga donde se
          ve; tapar contenido es un precio que se paga a escondidas. */}
      <header className={cn('border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-2 flex items-center gap-2 z-40 shrink-0 shadow-sm',
        user && !menuPuesto ? 'h-14' : compacto ? 'h-8' : 'h-10')}>

        {/* ══ TRAER EL MENÚ DE VUELTA ═══════════════════════════════════════
            Eugenio, 2026-08-21: «haremos el botón de descolapsar todavía más
            llamativo y grande».

            POR QUÉ ES GRANDE Y NO UN ICONO DISCRETO: desde que no hay estado
            intermedio, éste es el ÚNICO camino de vuelta al menú. Antes, con
            el semiplegado, siempre quedaba una tira de iconos que decía «el
            menú sigue aquí»; ahora no queda nada. Un icono de 20 px en una
            esquina sería justo el fallo que este proyecto ya tiene
            catalogado: 83 de cada 100 botones por debajo de 24 px. */}
        {/* LA MARCA, SOLO EL LOGO (2026-08-21, Eugenio: «quita la palabra
            humanity.wiki, pon solo el logo minimalista»). El nombre completo
            vive dentro del menú lateral; aquí arriba, con el menú escondido,
            lo que hace falta es una tecla de vuelta al inicio, y para eso una
            marca de 28 px basta. La palabra se llevaba el ancho que necesitan
            las ventanas abiertas de al lado.

            EL NOMBRE NO SE PIERDE: sigue en el `title` y en el `aria-label`,
            así que un lector de pantalla lo dice igual que antes. */}
        {!menuPuesto && (
          <button
            onClick={() => navigate('/')}
            title="Humanity Wiki — ir al inicio"
            aria-label="Humanity Wiki — ir al inicio"
            className="shrink-0 w-7 h-7 grid place-items-center rounded-lg bg-slate-900 text-white hover:bg-emerald-600 transition-colors"
          >
            <Globe className="w-4 h-4" />
          </button>
        )}

        {/* ══ EL MENÚ, A LA IZQUIERDA Y SIN PALABRA ═══════════════════════
            Eugenio, 2026-08-21: «vuelve a poner el menú colapsable superior a
            la izquierda, y el logo de Humanity Wiki a la izquierda del menú
            colapsable». Y sin la palabra «Menú»: tres rayas es el icono más
            reconocido que hay en una pantalla.

            SIGUE SIENDO GRANDE. Desde que no hay estado intermedio del menú,
            éste es el ÚNICO camino de vuelta, y este proyecto ya tiene
            catalogado que 83 de cada 100 de sus botones bajan de 24 px. */}
        {user && !menuPuesto && (
          <button
            onClick={ponerMenu}
            title="Ver el menú"
            aria-label="Ver el menú"
            aria-expanded={false}
            className={cn('shrink-0 grid place-items-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-colors',
              compacto ? 'w-8 h-8' : 'w-10 h-10')}
          >
            <Menu className={cn(compacto ? 'w-5 h-5' : 'w-6 h-6')} />
          </button>
        )}



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
                  className={cn('group flex items-center gap-1.5 rounded-lg border shrink-0 cursor-pointer transition-colors',
                    // COMPACTO: solo el icono, un cuadrado de 24 px.
                    compacto ? 'w-6 h-6 justify-center' : 'h-7 pl-2',
                    // La ✕ solo en la pestaña que miras (Eugenio, 2026-08-20:
                    // «para que ocupe menos»): las demás no gastan esos 20 px.
                    !compacto && (v.delante ? 'pr-1' : 'pr-2'),
                    v.delante
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : v.minimizada
                        ? 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')}
                >
                  <Icono className={cn('shrink-0', compacto ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
                  {!compacto && (
                    <span className="text-[11px] font-black tracking-tight max-w-[8rem] truncate">{v.titulo}</span>
                  )}
                  {/* La ✕ de una pestaña de navegador, y SOLO en la que
                      miras. `stopPropagation` para que cerrar no cuente
                      además como pulsar la pestaña. */}
                  {v.delante && !compacto && (
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

        {/* EL BOTÓN DE COLAPSAR. Solo aparece si hay ventanas: sin ellas no hay
            nada que encoger. */}
        {ventanasAbiertas.length > 0 && (
          <button
            onClick={() => cambiarCompacto(!compacto)}
            title={compacto ? 'Ver los nombres y la dirección' : 'Encoger a solo iconos'}
            className={cn('grid place-items-center rounded-lg shrink-0 transition-colors',
              compacto ? 'w-6 h-6 bg-slate-900 text-white' : 'w-7 h-7 text-slate-400 hover:bg-slate-100 hover:text-slate-700')}
          >
            {compacto ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* EL BOTÓN DE LA IA SE FUE DE AQUÍ (2026-08-21). Estuvo unas horas
            en esta barra, mientras el chat era un panel que había que abrir.
            Desde que el chat vive en un muelle SIEMPRE presente abajo, este
            botón era la segunda puerta a una habitación con la puerta ya
            abierta — y encima la de arriba, lejos del pulgar. */}

        {/* LA CUENTA, ARRIBA A LA DERECHA DEL TODO (Eugenio, 2026-08-20). Es
            donde la busca todo el mundo, y además es lo que hace visible de un
            vistazo si has entrado o no — que era justo lo que no se veía
            cuando iniciabas sesión dentro del Mundo 3D. */}
        {/* EL MENÚ VOLVIÓ A LA IZQUIERDA (2026-08-21, Eugenio: «vuelve a
            poner el menú colapsable superior a la izquierda»). Estuvo un rato
            a la derecha; a la izquierda es donde lo busca la mano y donde no
            compite con la cuenta. Está más arriba en este mismo fichero. */}
        {/* LA CAMPANA, JUNTO A LA CUENTA (2026-08-21, Eugenio: «crea una
            campanita arriba a la derecha en el menú»). Va antes de la foto
            porque es lo que cambia: la cuenta siempre está, los avisos van y
            vienen, y lo que cambia se mira primero. */}
        <Campana compacto={compacto} />

        <div className="relative shrink-0" ref={cuentaRef}>
          {user ? (
            <>
              <button
                onClick={() => setCuentaAbierta(o => !o)}
                title={`${user.displayName || user.email} · ${user.roleLabel}`}
                className={cn('block rounded-full transition-all',
                  cuentaAbierta ? 'ring-2 ring-slate-900 ring-offset-1' : 'hover:ring-2 hover:ring-slate-200')}
              >
                {/* SOLO LA FOTO (2026-08-21, Eugenio: «en la foto de perfil
                    elimina la flecha lateral y deja solo la foto»). Una foto
                    redonda en la esquina ya se entiende como «tu cuenta» sin
                    que nadie tenga que explicarlo, y la flecha obligaba a
                    llevar un borde y un relleno alrededor para que no quedara
                    suelta. Sin ella, la foto es el botón. */}
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt="" className={cn('rounded-full object-cover', compacto ? 'w-7 h-7' : 'w-9 h-9')} />
                  : <span className={cn('rounded-full bg-slate-100 grid place-items-center text-slate-400', compacto ? 'w-7 h-7' : 'w-9 h-9')}>
                      <User className="w-4 h-4" />
                    </span>}
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
          ) : cargandoSesion ? (
            /* EL DESTELLO DE SESIÓN CERRADA (B21). Aquí estaba el daño: durante
               los ~5 segundos que tarda en cargar la aplicación, `user` todavía
               es null y esto pintaba «Iniciar sesión» a alguien que SÍ tenía la
               sesión abierta. En el primer contacto de cada visita, la
               plataforma le decía al usuario que había perdido su trabajo.

               No sabemos aún si hay sesión, así que no se afirma ninguna de las
               dos cosas: un hueco de la medida exacta del botón que va a venir.
               Y no es que /api/auth/me sea lento (tarda 0,38 s): son los 3,7 MB
               del paquete de la aplicación en un solo trozo. Eso es otra
               conversación; esto es no mentir mientras tanto. */
            <div
              aria-hidden
              className={cn('rounded-full bg-slate-100 animate-pulse', compacto ? 'h-6 w-14' : 'h-8 w-16')}
            />
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
          {/* EL HUECO DEL MUELLE DE LA IA (2026-08-21). El chat vive pegado
              abajo y es `fixed`, así que sin esto taparía el final de cada
              página — la última fila de una tabla, el último párrafo. La
              altura la publica `AIAssistant` en `--hueco-muelle` y vale 0
              cuando el chat está cerrado, así que en reposo no cuesta nada. */}
          <main
            key={updateCounter}
            style={{ paddingBottom: 'var(--hueco-muelle, 0px)', paddingRight: 'var(--hueco-lateral, 0px)' }}
            className={`flex-1 flex flex-col overflow-y-auto bg-white relative min-w-0 ${fullBleed ? '' : 'p-4 sm:p-8'}`}
          >
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
          <GestorVentanas compacto={compacto} />
        </div>

        {/* UN SOLO ASISTENTE, EL MISMO EN TODAS LAS HERRAMIENTAS. En la
            herramienta «IA» no se monta: esa página YA ES el asistente a
            pantalla completa, y tener además su botón flotante daría dos
            chats a la vez — el error que este proyecto ya pagó caro. */}
        {!isIAPage && <AIAssistant />}
      </div>

      {/* Sin pie de página (Eugenio, 2026-08-20: «que no haya otra barra
          abajo»). Solo hay UNA barra, la de arriba, y lleva las ventanas. */}
      </div>

      {/* ══ EL CAJÓN DEL MENÚ EN MÓVIL (B41) ══════════════════════════════
          Va aquí, el último y fuera de la columna de contenido, para que se
          pinte POR ENCIMA de todo: de la página, de las ventanas y del panel
          del asistente.

          Se monta y se desmonta con `cajonAbierto` en vez de esconderse con
          CSS. Es a propósito: el menú pide sus datos al montarse, y dejarlo
          montado y oculto sería tener el menú entero vivo y pidiendo datos
          en un teléfono, que es exactamente el problema que estamos
          arreglando en las ventanas (B28).

          NO SE TOCA EL ESCRITORIO: por encima de 768 px `esMovil` es false y
          nada de este bloque llega a existir. */}
      {user && esMovil && menuPuesto && (
        <>
          {/* El fondo oscuro. Tocar fuera cierra, que es lo que todo el mundo
              intenta primero. */}
          <div
            onClick={() => setCajonAbierto(false)}
            aria-hidden
            className="fixed inset-0 z-50 bg-slate-900/40 animate-in fade-in duration-150"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="fixed inset-y-0 left-0 z-50 flex animate-in slide-in-from-left duration-200"
          >
            <MenuLateral
              activo={location.pathname}
              movil
              onCerrar={esconderMenu}
            />
          </div>
        </>
      )}
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

  // DOS DEDOS PARA IR ATRÁS, desde dentro del marco. Los eventos de rueda de
  // una página embebida NO salen al marco de fuera: se quedan dentro. Por eso
  // el gesto se detecta aquí, donde de verdad ocurre, y solo se manda hacia
  // fuera la conclusión —«atrás» o «adelante»—, que es quien tiene el historial
  // de la ventana.
  useEffect(() => {
    const alRodar = detectorDeGesto(sentido => {
      try {
        window.parent?.postMessage(
          { humanity: 'humanity:gesto-navegacion', detalle: sentido },
          window.location.origin);
      } catch { /* sin puente */ }
    });
    window.addEventListener('wheel', alRodar, { passive: true });
    return () => window.removeEventListener('wheel', alRodar);
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
