import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCerrarAlPulsarFuera } from '../../hooks/useCerrarAlPulsarFuera';
import { useCerrarAlAlejarse } from '../../hooks/useAbrirAlAcercarse';
import {
  User, LogOut, Store, Map as MapIcon, Globe2, Database, Settings,
  Compass, Menu, X, FolderKanban, Users2, Gamepad2, AppWindow, Globe, ListChecks,
  FileText, ChevronDown, CalendarDays, ChevronsDownUp, ChevronsUpDown, Sparkles, Home, MessageSquare,
 PanelLeftOpen, Info, Search,} from 'lucide-react';
import { PAGINAS_INFO } from '../../paginasInfo';
import { abrirVentana, minimizarTodas, pulsarVentana, cerrarVentana, cerrarTodasLasVentanas, maximizarVentana, ordenarVentanas, pedirVentanas, type VentanaEstado } from '../ventanas/bus';
import GestorVentanas from '../ventanas/GestorVentanas';
import VentanaLateral from '../ventanas/VentanaLateral';
import MenuLateral from './MenuLateral';
import Rail, { type Herramienta } from '../navegacion/Rail';
import Panel, { EstilosPanel } from '../navegacion/Panel';
import TresCirculos, { type Circulo } from '../navegacion/TresCirculos';
import PanelExplorar, { OBJETIVOS_RAIL } from '../navegacion/PanelExplorar';
import HojaCrear from '../navegacion/HojaCrear';
import BuscadorSuperior from '../navegacion/BuscadorSuperior';
import BotonCalendario from '../navegacion/BotonCalendario';
import Campana from '../social/Campana';
import { cn } from '../../utils/cn';
import { IconoFeedback } from '../ui/IconoFeedback';
import { detectorDeGesto } from '../../utils/gestoAtrasAdelante';
import { useAuth } from '../../contexts/AuthContext';
import { useEdit } from '../../contexts/EditContext';
import { useEsMovil } from '../../hooks/useEsMovil';
import AIAssistant from '../ai/AIAssistant';
import CapaTelecom from '../telecom/CapaTelecom';

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
  { to: '/juego', label: 'Visor 3D', icon: Gamepad2 },
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
  /* Qué herramienta del raíl tiene el panel abierto. `null` = ninguno, y
     entonces el contenido ocupa todo lo que deja el raíl. No se guarda entre
     visitas a propósito: un panel que aparece solo al abrir la aplicación es
     una columna que nadie pidió esta vez. */
  const [panelAbierto, setPanelAbierto] = useState<Herramienta | null>(null);
  /*
   * CUÁL DE LOS TRES CÍRCULOS ESTÁ ABIERTO (2026-08-23).
   *
   * Uno o ninguno, nunca dos: los tres ocupan la pantalla y abrir el segundo
   * sin cerrar el primero dejaría dos menús discutiendo por el mismo sitio.
   * Volver a pulsar el que ya está abierto lo cierra, que es lo que hace
   * cualquiera cuando se ha equivocado de botón.
   */
  const [circulo, setCirculo] = useState<Circulo | null>(null);
  /** Qué objetivo tiene el panel abierto en el lado de Explorar. */
  const [objetivoAbierto, setObjetivoAbierto] = useState<string | null>(null);
  const pulsarCirculo = (c: Circulo) => {
    /*
     * PULSAR LO QUE YA ABRIÓ EL RATÓN LO CONFIRMA; NO LO CIERRA.
     *
     * Encontrado probándolo, y sólo se ve probándolo: para pulsar un círculo
     * hay que pasar el ratón por encima, y pasar el ratón por encima ya lo
     * abre. Así que al llegar el clic el menú **ya estaba abierto**, el
     * interruptor lo leía como «vuelve a pulsarlo para cerrar» y lo cerraba.
     * Resultado: pulsar el botón no hacía nada visible, nunca.
     *
     * Un clic sobre algo que se abrió rozando significa «esto lo quiero de
     * verdad»: deja de ser provisional y ya no se cierra al apartar el ratón.
     * Cerrar sigue siendo el segundo clic, o el botón de plegar.
     */
    if (circulo === c && porRoce) { setPorRoce(false); return; }
    setCirculo(a => (a === c ? null : c));
    setPorRoce(false);
    // Elegir un círculo cierra lo del anterior: el panel de la derecha es de
    // «Organizar», así que abrir «Explorar» tiene que llevárselo.
    if (c !== 'organizar') setPanelAbierto(null);
  };

  /*
   * ══ ABRIR LOS MENÚS SIN PULSAR (2026-08-24) ═══════════════════════════════
   *
   * Eugenio, en un solo mensaje, pidió tres cosas que son la misma: «haz que
   * cuando el ratón esté muy cercano al borde izquierdo se abra el menú lateral
   * izquierdo, y lo mismo con el derecho. Y lo mismo si pongo el ratón encima de
   * uno de los 3 botones, modo hover, sin hacer click se despliegan los menús
   * correspondientes según el botón que esté haciendo hover».
   *
   * Las tres acaban en la misma línea —`setCirculo(...)`—, porque en esta
   * pantalla los dos menús laterales SON los círculos: «Explorar» es el de la
   * izquierda y «Organizar» el de la derecha. Por eso no hay tres mecanismos:
   * hay uno con tres disparadores.
   *
   * ── LO QUE SE ABRE ROZANDO, SE CIERRA SOLO ────────────────────────────────
   * Y aquí está la única decisión de verdad. Un menú que aparece porque has
   * pasado cerca del borde y **se queda** es peor que no tenerlo: has ganado un
   * panel que no pediste y ahora tienes que ir a cerrarlo. Uno que se cierra al
   * alejarte y que ADEMÁS se cerrara aunque lo hubieras abierto pulsando sería
   * igual de malo por el otro lado: el que sí lo quería lo pierde en cuanto
   * mueve el ratón para trabajar.
   *
   * Así que se recuerda CÓMO se abrió. Rozando → se va solo al alejarse.
   * Pulsando → se queda. Y pulsar cualquier cosa dentro del menú lo asciende a
   * «lo quiero»: si ya has empezado a usarlo, deja de ser un accidente.
   */
  /*
   * ══ EL MENÚ DE TEMAS DE CADA UNO (2026-08-25) ═════════════════════════════
   * Eugenio: favoritos arriba, poder ocultar temas y poder reordenarlos.
   *
   * ── SE GUARDA FUERA Y SE PINTA YA ─────────────────────────────────────────
   * Al marcar un favorito, la lista se recoloca **antes** de que el servidor
   * conteste. Es lo correcto aquí: el orden de tu propio menú no es un dato que
   * haya que confirmar con nadie, y esperar medio segundo a que una estrella se
   * encienda hace que parezca que no ha funcionado y se pulse otra vez.
   * Si la grabación falla, lo que se pierde es una preferencia — y se recupera
   * volviéndola a pulsar.
   *
   * ── SIN SESIÓN NO SE GUARDA, PERO SE PUEDE MIRAR ──────────────────────────
   * Quien no ha entrado ve los catorce en su orden de siempre y no tiene
   * estrellas: no hay dónde guardar lo suyo. No se le enseñan controles que no
   * van a hacer nada.
   */
  const [prefsTemas, setPrefsTemas] = useState<Record<string, { favorito?: boolean; oculto?: boolean; orden?: number }>>({});

  useEffect(() => {
    if (!user) { setPrefsTemas({}); return; }
    let vivo = true;
    fetch('/api/temas/mio/objetivos', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        if (!vivo || !j?.preferencias) return;
        const m: Record<string, any> = {};
        for (const p of j.preferencias) m[p.clave] = { favorito: p.favorito, oculto: p.oculto, orden: p.orden };
        setPrefsTemas(m);
      })
      .catch(() => { /* sin preferencias, el menú es el de siempre */ });
    return () => { vivo = false; };
  }, [user]);

  /*
   * ══ LOS SUBTEMAS DEL MENÚ (2026-08-25, prog8) ═════════════════════════════
   * `0120_subtemas.sql` dejó el árbol y `GET /api/temas/:objetivo` que lo
   * sirve, y no había pantalla que lo pidiera: el árbol estaba en la base de
   * datos y no se veía por ningún sitio.
   *
   * ── SE PIDE AL ABRIR, NO AL CARGAR ────────────────────────────────────────
   * Catorce peticiones al pintar el menú, para catorce árboles que casi nadie
   * va a desplegar, es pagar la portada entera por adelantado. Se pide el de
   * un tema la primera vez que alguien pulsa su flecha, y se queda guardado.
   *
   * `null` mientras viaja y `[]` cuando ya se sabe que está vacío: sin esa
   * diferencia, un tema sin subtemas se volvería a pedir cada vez que se abre.
   */
  const [ramas, setRamas] = useState<Record<string, Array<{ id: string; padre_id: string | null; nombre: string; cosas: number }> | null>>({});
  const [ramasAbiertas, setRamasAbiertas] = useState<Record<string, boolean>>({});
  /** Cuántos subtemas tiene cada objetivo. Una sola consulta al arrancar, y es
   *  lo único que decide en qué filas se dibuja la flecha. */
  const [cuantasRamas, setCuantasRamas] = useState<Record<string, number>>({});

  useEffect(() => {
    let vivo = true;
    fetch('/api/agregador/temas/cuantos', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo && j?.cuantos) setCuantasRamas(j.cuantos); })
      .catch(() => { /* sin flechas; el menú es el de siempre */ });
    return () => { vivo = false; };
  }, []);

  const alternarRama = (clave: string) => {
    setRamasAbiertas(a => ({ ...a, [clave]: !a[clave] }));
    if (ramas[clave] !== undefined) return;
    setRamas(r => ({ ...r, [clave]: null }));
    fetch(`/api/temas/${encodeURIComponent(clave)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => setRamas(r => ({ ...r, [clave]: j?.subtemas ?? j?.temas ?? [] })))
      // Si falla, se queda en lista vacía: la flecha se apaga y el menú sigue
      // funcionando. Un menú que se rompe entero porque un árbol no cargó es
      // peor que un tema que hoy no despliega.
      .catch(() => setRamas(r => ({ ...r, [clave]: [] })));
  };

  const guardarPref = (clave: string, cambio: { favorito?: boolean; oculto?: boolean }) => {
    setPrefsTemas(p => ({ ...p, [clave]: { ...p[clave], ...cambio } }));
    fetch('/api/temas/preferencia', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ clave, ...cambio }),
    }).catch(() => { /* ver la nota de arriba */ });
  };

  /*
   * LA LISTA QUE SE PINTA. Tres reglas, en este orden:
   *   1. lo oculto no está;
   *   2. los favoritos arriba — que es lo que pidió Eugenio;
   *   3. dentro de cada grupo, el orden que haya puesto la persona, y si no,
   *      el de siempre.
   *
   * Favoritos arriba **por encima del orden manual** a propósito: marcar algo
   * favorito es decir «esto lo quiero a mano», y si se quedara donde estaba,
   * la estrella no habría hecho nada visible.
   */
  const temasDelMenu = useMemo(() => {
    const pos = (clave: string, i: number) => prefsTemas[clave]?.orden ?? i;
    return OBJETIVOS_RAIL
      .filter(o => !prefsTemas[o.clave]?.oculto)
      .map((o, i) => ({ o, i }))
      .sort((a, b) => {
        const fa = prefsTemas[a.o.clave]?.favorito ? 0 : 1;
        const fb = prefsTemas[b.o.clave]?.favorito ? 0 : 1;
        if (fa !== fb) return fa - fb;
        return pos(a.o.clave, a.i) - pos(b.o.clave, b.i);
      })
      .map(x => x.o);
  }, [prefsTemas]);

  /** Cuántos hay escondidos, para poder decirlo y poder recuperarlos. */
  const temasOcultos = OBJETIVOS_RAIL.filter(o => prefsTemas[o.clave]?.oculto);

  const reordenarTemas = (desde: string, hasta: string) => {
    const claves = temasDelMenu.map(o => o.clave);
    const i = claves.indexOf(desde);
    const j = claves.indexOf(hasta);
    if (i < 0 || j < 0) return;
    claves.splice(j, 0, ...claves.splice(i, 1));
    // Se escribe el orden de TODOS, no sólo del que se ha movido: así lo
    // guardado no depende de cómo estaba antes en el servidor.
    setPrefsTemas(p => {
      const m = { ...p };
      claves.forEach((c, k) => { m[c] = { ...m[c], orden: k }; });
      return m;
    });
    fetch('/api/temas/orden', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ claves }),
    }).catch(() => {});
  };

  const [porRoce, setPorRoce] = useState(false);

  const abrirPorRoce = (c: Circulo) => {
    // SI YA HAY ALGO ABIERTO, NO SE CAMBIA. Rozar el círculo de al lado
    // mientras lees un panel te lo cambiaría por otro sin haber pedido nada.
    setCirculo(a => {
      if (a !== null) return a;
      setPorRoce(true);
      if (c !== 'organizar') setPanelAbierto(null);
      return c;
    });
  };

  /*
   * ── DÓNDE CUENTA QUE ESTÉ EL RATÓN ────────────────────────────────────────
   * Dos sitios: el menú que se ha abierto y la tira de los tres círculos. Fuera
   * de esos dos, si el menú apareció rozando, se cierra solo.
   *
   * Los círculos entran en la cuenta porque son lo que lo abrió: sin ellos, el
   * menú se cerraría mientras tienes el ratón encima del botón que acaba de
   * abrirlo — que es de las pocas cosas que consiguen que una función parezca
   * estropeada estando bien.
   */
  const cajaMenu = useRef<HTMLDivElement>(null);
  const cajaCirculos = useRef<HTMLDivElement>(null);
  useCerrarAlAlejarse(porRoce, [cajaMenu, cajaCirculos], () => {
    setCirculo(null);
    setPorRoce(false);
    setObjetivoAbierto(null);
    setPanelAbierto(null);
  });

  /** Lo que se cuelga del menú abierto por roce. Tocar algo de dentro lo
   *  convierte en abierto a propósito: si ya has empezado a usarlo, deja de ser
   *  un accidente y se queda hasta que lo cierres tú. */
  const gestoDelMenu = { ref: cajaMenu, onClickCapture: () => setPorRoce(false) };

  /*
   * AQUÍ VIVÍAN LOS DOS DETECTORES DE BORDE (2026-08-24, retirados el mismo
   * día). Escuchaban el ratón para abrir el menú al acercarse a 8 px del canto
   * de la pantalla.
   *
   * Ya no hacen falta, y no porque la idea fuera mala: porque **desde que los
   * raíles están siempre puestos, el menú ES el borde**. Acercarse a él es
   * ponerle el ratón encima, y de eso se encarga el propio raíl, que además lo
   * hace mejor —sabe si el ratón sigue dentro—.
   *
   * Dejarlos habría sido tener dos cosas escuchando el mismo gesto para hacer
   * cosas parecidas pero no iguales: una desplegaría el raíl flotando y la otra
   * lo fijaría empujando la página, según cuál llegara antes.
   *
   * El hook sigue existiendo en `src/hooks/useAbrirAlAcercarse.ts` por si otra
   * pantalla lo necesita.
   */

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
  /** El menú de información (i): las páginas que explican la plataforma.
   *  Sus entradas salen de `src/paginasInfo.ts`, no de aquí. */
  const [infoAbierta, setInfoAbierta] = useState(false);
  /** El botón del nombre se pinta en negro cuando su menú está abierto o estás
   *  en una de sus páginas. Lo miran dos sitios —el fondo y el tono del verde
   *  de «Conocimiento»—, así que se decide aquí una vez. */
  const nombreEnNegro = infoAbierta || PAGINAS_INFO.some(p => location.pathname.startsWith(`/${p.ruta}`));
  const infoRef = useRef<HTMLDivElement>(null);
  const [confirmarCerrarTodas, setConfirmarCerrarTodas] = useState(false);
  /** Cuántas notas del hormiguero necesitan algo de una persona. Solo el
   *  número, como la campana: pedir el tablero entero para pintar un punto es
   *  traerse una lista para mirar un color. */
  const [incidencias, setIncidencias] = useState({ bloqueadas: 0, esperando: 0 });
  useEffect(() => {
    const pedir = () => fetch('/api/incidencias/cuenta', { credentials: 'include' })
      .then(r => r.json()).then(j => setIncidencias({ bloqueadas: j?.bloqueadas || 0, esperando: j?.esperando || 0 })).catch(() => {});
    pedir();
    const t = setInterval(pedir, 60000);
    return () => clearInterval(t);
  }, [location.pathname]);
  useCerrarAlPulsarFuera(cuentaRef, cuentaAbierta, () => setCuentaAbierta(false));
  useCerrarAlPulsarFuera(infoRef, infoAbierta, () => setInfoAbierta(false));
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
      {/* ══ EXPLORAR: EL MUNDO, POR LA IZQUIERDA (2026-08-23) ════════════
          Los catorce objetivos en cascada, igual que en el mapa. Ocupa la
          mitad de la pantalla en un móvil y un tercio en un ordenador, que es
          lo que pidió Eugenio: es un menú para leer, no una tira de iconos. */}
      {/* ══ EXPLORAR: EL ESPEJO DE ORGANIZAR (2026-08-23) ════════════════
          El MISMO `Rail`, con los catorce objetivos en vez de las
          herramientas, y su panel claro al lado. Eugenio: «que sea un menú que
          se abre de lado en vez de en cascada hacia abajo, y así tenemos como
          en un espejo ambos menús igual de diseñados».
          A la izquierda el raíl va primero y el panel después; a la derecha, al
          revés. Es la única diferencia entre los dos lados. */}
      {/* ══ SIEMPRE PUESTO, EN ICONOS ═════════════════════════════════════
          Eugenio: «haz que además los menús laterales estén siempre visibles
          enseñando solo los iconos, y cuando se haga hover ahí, se despliegue.
          Y también se despliegan cuando se toquen los botones de abajo».

          ── LO QUE CAMBIA DE VERDAD ──────────────────────────────────────────
          Hasta ahora estos dos menús **no existían** hasta que pulsabas su
          círculo. Eso deja la pantalla limpia, y a cambio esconde el mapa: para
          saber qué hay en la aplicación había que probar un botón. Un raíl de
          56 px pegado al borde cuesta muy poco sitio y contesta esa pregunta
          sin que nadie la haga.

          Y de paso desaparece un mecanismo entero: ya no hace falta detectar
          que el ratón se acerca al borde para abrir el menú, porque **el menú
          es el borde**. Acercarse a él es pasarle el ratón por encima, y de eso
          ya se encarga el propio raíl.

          Tres formas de tenerlo abierto, y no significan lo mismo:
            · con el ratón encima → se despliega FLOTANDO, sin mover la página;
            · pulsando su círculo de abajo → se queda abierto y EMPUJA;
            · con la chincheta → igual, y además se recuerda entre visitas.
          El botón de plegar deshace las dos últimas. */}
      {!esMovil && (
        <div className="flex h-full shrink-0" {...gestoDelMenu}>
          <Rail
            siempreAbierto={circulo === 'explorar'}
            claro
            titulo="Explorar"
            items={temasDelMenu}
            personal={user ? {
              esFavorito: c => !!prefsTemas[c]?.favorito,
              estaOculto: c => !!prefsTemas[c]?.oculto,
              marcarFavorito: (c, v) => guardarPref(c, { favorito: v }),
              ocultar: c => guardarPref(c, { oculto: true }),
              reordenar: reordenarTemas,
              ocultos: temasOcultos.map(o => ({ clave: o.clave, nombre: o.nombre })),
              mostrar: c => guardarPref(c, { oculto: false }),
              onPersonalizar: () => { navigate('/preferencias'); setCirculo(null); },
            } : undefined}
            ramas={{
              de: c => ramas[c] ?? [],
              hay: c => (cuantasRamas[c] ?? 0) > 0,
              abierto: c => !!ramasAbiertas[c],
              alternar: alternarRama,
            }}
            abierta={objetivoAbierto}
            // EL NOMBRE LLEVA AL TEMA. Eugenio: «de Energía te muestra todo lo
            // relacionado con energía».
            onElegir={h => navigate(`/explorar?objetivo=${encodeURIComponent(h.clave)}`)}
            // LA FLECHA ABRE SU PANEL — indicadores y marcadores— y no toca la
            // pantalla de detrás. Mirar lo que hay dentro de un tema y decidir
            // pasarte a él son dos cosas, y ahora tienen dos sitios donde
            // pulsar.
            onAbrirSubmenu={h => setObjetivoAbierto(a => (a === h.clave ? null : h.clave))}
            onPlegar={() => { setCirculo(null); setPorRoce(false); setObjetivoAbierto(null); }}
            onInicio={() => { navigate('/'); setObjetivoAbierto(null); setCirculo(null); }}
          />
          {objetivoAbierto && (
            <PanelExplorar objetivoId={objetivoAbierto} onCerrar={() => setObjetivoAbierto(null)} />
          )}
        </div>
      )}

      {/* ══ EL RAÍL Y SU PANEL (2026-08-23) ═══════════════════════════════
          Encargo de Eugenio: el patrón de Kpler — raíl oscuro de iconos, y al
          pulsar uno se abre a su lado un panel claro con lo que hay dentro.

          CONVIVE CON EL MENÚ DE SIEMPRE Y NO LO SUSTITUYE TODAVÍA. El menú
          lateral lleva cosas que el panel aún no hace —ventanas del escritorio,
          renombrar, favoritos, áreas— y cambiarlo entero de golpe sería
          apagarlas sin aviso. Hoy hay panel para dos herramientas, que es lo
          que él pidió probar; el raíl las abre y las demás navegan.

          EN MÓVIL EL PANEL VA A PANTALLA COMPLETA (decisión suya). A 375 px el
          raíl y el panel no caben juntos: el panel se pone encima y se cierra
          con su aspa, que es el gesto que ya conoce cualquiera. */}
      {/* ══ ORGANIZAR: LO TUYO, POR LA DERECHA ═══════════════════════════
          Eugenio: «el botón de la derecha sería el botón de organizar… coger
          exactamente ese mismo menú que ahora mismo está a la izquierda y
          ponerlo a la derecha, con la misma lógica».

          Es EL MISMO componente, no una copia: `Rail` y `Panel` sin tocar, con
          el orden invertido —panel primero y raíl después— para que el raíl
          quede pegado al borde derecho, que es de donde sale. Duplicarlos para
          espejarlos habría creado dos menús que se separan a la primera.

          Y ya no está siempre: aparece cuando pulsas su círculo. Ésa es la
          simplificación que pidió — la pantalla empieza vacía y tú decides qué
          traer. */}
      {/* (El bloque de «Organizar» está más abajo, DESPUÉS de la columna de
          contenido: en una fila flex el orden del documento es el orden en
          pantalla, y aquí arriba salía pegado al borde IZQUIERDO por mucho que
          su CSS dijera `right-0`. Se ve mirando la pantalla, no leyendo el
          `className`.) */}
      <EstilosPanel />

      {/* EL MENÚ TAMBIÉN SIN CUENTA (2026-08-23). Eugenio: «cuando se cierra
          la sesión desaparece, y creo que es un menú muy guay donde están
          todas las herramientas».
          Tenía razón y era un error de diseño, no una decisión: la lista de
          herramientas es EXACTAMENTE lo que quieres enseñarle a quien está
          decidiendo si se registra. Esconderla dejaba la pantalla más pobre
          justo para quien menos sabe qué hay aquí. Lo que cuelga de tu cuenta
          —tus proyectos, tus productos, tus personas— sale vacío y con su
          invitación, que lo resuelve `MenuLateral`. */}
      {/* EL MENÚ DE SIEMPRE SE APAGA EN ESCRITORIO (2026-08-23).
          Al montarlo se vio en pantalla lo que no se veía en el código: **tres
          columnas de navegación a la vez** —raíl, panel y menú— y el contenido
          aplastado en lo que sobraba. Tres formas de ir al mismo sitio no son
          tres ayudas: son tres sitios donde buscar.
          Por eso el raíl lleva también Áreas, Personas, Mensajes, Teléfono y Mi
          perfil, que sólo vivían en este menú: rediseñar la navegación sin
          llevarse lo que colgaba de ella no rompe nada visiblemente, sólo deja
          de haber camino.
          En MÓVIL se queda: allí no hay raíl, y el cajón sigue siendo la única
          forma de llegar a las herramientas.
          NO SE BORRA el componente. Lleva cosas que el panel todavía no hace
          —ventanas del escritorio, renombrar, favoritos— y volver es esta línea. */}
      {/* AQUÍ YA NO VA NADA (2026-08-23). Al retirar el menú de escritorio
          cambié `!esMovil` por `esMovil` y dejé este render en pie: en un móvil
          el menú se pintaba DOS VECES, una aquí dentro de la fila y otra en el
          cajón de abajo. No se veía porque el cajón tapaba al otro — dos menús
          vivos, los dos pidiendo sus datos, en el aparato con menos memoria.
          En escritorio manda el raíl; en móvil, el cajón. */}

      {/* MIENTRAS NO SE SABE SI HAY SESIÓN, UN HUECO (B21, parte 1). Sin esto
          la columna aparece de golpe cuando contesta el servidor y toda la
          página da un salto lateral de 240 px. Un hueco del mismo ancho no
          dice nada y no se mueve nada.
          Solo cuando el menú va a estar puesto: si lo tenías escondido, no hay
          columna que reservar y el hueco sería el salto que evitamos. */}
      {/* Ya no hace falta el hueco: la columna está puesta desde el principio,
          haya sesión o no, así que no hay nada que aparezca de golpe. */}

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
      {/* ══ A 320 px LA FILA NO CABÍA (2026-08-24) ════════════════════════
          Encontrado por prog3 preparando las capturas de Google Play y medido
          aquí: la cabecera pedía **358 px dentro de una ventana de 320** — 38
          fuera. Con la sesión cerrada lo que se salía era el botón de entrar;
          con ella abierta, la foto de la cuenta. Es el mismo sitio: el último
          de la fila es el que se cae por el borde.

          Y 320 no es un capricho: es el ancho mínimo que acepta Google Play,
          o sea el que se mira antes de publicar la aplicación.

          ── LO QUE SE HA DADO, Y LO QUE NO ────────────────────────────────
          No se quita ningún botón. Lo que se aprieta por debajo de `sm` es el
          **aire** entre ellos, de 8 px a 4. Ocho separan; cuatro también
          separan, y a 320 px el aire es lo único que sobra cuando lo demás son
          objetivos que hay que poder acertar con el dedo.

          El otro ahorro está en el botón de entrar: ahí abajo dice «Entrar» en
          vez de «Iniciar sesión». **Sigue siendo una palabra**, que es lo que
          no se podía perder — un icono de persona sin texto se lee como «tu
          cuenta», justo lo contrario de lo que ese botón hace.

          ── Y HACÍA FALTA UN TERCER RECORTE, MEDIDO ───────────────────────
          Con el aire a 4 px, **con la sesión abierta** la fila seguía pidiendo
          322 px: dos de más. Ahí hay tres botones que no existen sin sesión —
          calendario, avisos y tu cuenta— y ninguno sobra.

          Así que lo que se recorta es el margen de la propia barra, de 8 px a 4
          por lado. Ocho píxeles que no eran de nadie, en vez de encoger un
          botón por debajo de lo que se acierta con el dedo o quitar un control
          de la única barra que hay.

          Comprobado con las dos sesiones a 320 px, no calculado. */}
      <header className={cn('relative border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-1 sm:px-2 flex items-center gap-1 sm:gap-2 z-40 shrink-0 shadow-sm',
        !menuPuesto ? 'h-14' : compacto ? 'h-8' : 'h-10')}>

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
            así que un lector de pantalla lo dice igual que antes.

            SE ENSEÑA CUANDO EL MENÚ NO LO ESTÁ ENSEÑANDO, y eso no es lo mismo
            que «cuando el menú está escondido» (2026-08-22). La condición era
            `!menuPuesto`, dando por hecho que si el menú está puesto ya hay un
            logo dentro. Pero el menú lateral **solo se pinta con sesión**
            (`user && !esMovil && menuPuesto`, arriba): sin sesión no había logo
            en NINGUNA parte, así que **nadie que no hubiera entrado tenía cómo
            volver al inicio**. Encontrado reproduciendo lo que contaba Eugenio y
            mirando la barra: primero el aspa de cerrar ventanas, y ningún logo.

            Ahora la condición dice lo que de verdad importa: enséñalo salvo que
            el menú lateral lo esté enseñando él. */}
        {!menuPuesto && (
          <button
            /* IR AL INICIO ES LAS DOS COSAS (2026-08-22). Navegar no basta: las
               ventanas del escritorio se pintan encima y no se enteran de que la
               ruta ha cambiado, así que pulsabas el logo y no pasaba nada
               visible. Se apartan, no se cierran: siguen arriba a un clic. */
            onClick={() => { minimizarTodas(); navigate('/'); }}
            title="Red de Conocimiento — ir al inicio"
            aria-label="Red de Conocimiento — ir al inicio"
            className="shrink-0 w-7 h-7 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
          >
            {/* EL LOGO DE VERDAD (2026-08-22, Eugenio lo mandó). Antes era un
                globo genérico de la librería de iconos, que es lo que se pone
                cuando no hay marca. Ahora hay marca. */}
            <img src="/logo.svg" alt="" className="w-full h-full" />
          </button>
        )}

        {/* ══ EL NOMBRE, CENTRADO (2026-08-23) ════════════════════════════
            Eugenio: «vamos a llamarla Red de Conocimiento. Eso tiene que estar
            arriba en el menú superior centrado».

            `absolute` y `pointer-events-none`: está centrado respecto a la
            BARRA, no respecto a lo que quede libre entre los botones. Si fuera
            un hijo más del flex, se movería cada vez que aparece o desaparece
            algo a los lados —una ventana abierta, la campana de avisos— y un
            título que baila no parece un título.
            Y no intercepta el ratón, porque está por encima de botones que sí
            tienen que poder pulsarse. El texto en sí no es un enlace: para ir
            al inicio está el logo, que es donde todo el mundo lo busca. */}
        {/* EL NOMBRE, A LA IZQUIERDA Y CON LAS PÁGINAS DENTRO (2026-08-24).
            Eugenio: «el nombre de la plataforma pasa a estar a la izquierda… el
            botón de "i" ponlo como si fuese un desplegable del nombre de la
            plataforma, que se vea como una pestaña, y ahí metes las páginas que
            antes estaban en "i", y el "i" ya desaparece».

            Es mejor sitio del que tenía la «i»: esas páginas cuentan QUÉ ES
            esto, así que colgarlas del nombre las convierte en «sobre nosotros»,
            que es lo que la gente ya sabe buscar. Un icono de información suelto
            no dice de qué informa.

            EN MÓVIL SÓLO EL LOGO: a 375 px la barra lleva ya el buscador, y el
            nombre volvería a chocar. El desplegable sigue abriéndose desde el
            logo, así que no se pierde ninguna página. */}
        <div className="relative shrink-0" ref={infoRef}>
          {/* Se calcula una vez porque lo miran dos sitios: el fondo del botón
              y el tono del verde. Dos copias de la misma condición son dos
              sitios donde se olvida una página nueva. */}
          {/* EL DISPARADOR YA NO ES UNA «i» (2026-08-24). Eugenio: «el botón
              de "i" ponlo como si fuese un desplegable del nombre de la
              plataforma, que se vea como una pestaña, y el "i" ya desaparece».

              Es mejor sitio del que tenía: estas páginas cuentan QUÉ ES esto,
              así que colgarlas del nombre las convierte en «sobre nosotros»,
              que es lo que la gente ya sabe buscar. **Una «i» suelta no dice de
              qué informa.**

              En un móvil sólo se ve la flecha, pegada al logo: a 375 px la
              barra ya lleva el buscador y el nombre entero no cabe. Ninguna
              página se pierde — se abre igual. */}
          {/* DOS BOTONES DENTRO DE UNA PASTILLA (2026-08-24). Eugenio: «el
              logo de Red de Conocimiento debe actuar como botón de regresar a
              INICIO "/", y sólo cuando se pinche en la flecha desplegable de su
              derecha se abrirá el menú».

              Se ven como una sola pieza —el fondo y el redondeo los pone esta
              caja, no cada botón— y hacen dos cosas distintas. Que el nombre de
              un sitio lleve a su inicio es lo que hace todo el mundo desde hace
              treinta años; que además abriera un menú era lo raro, y se notaba:
              ir al inicio pidiendo el nombre te dejaba en la misma página con
              un panel abierto encima.

              La flecha se queda con el menú, que es lo que una flecha hacia
              abajo anuncia. En móvil el nombre no se pinta —no cabe— y sólo
              está la flecha: al inicio se va por el logo de al lado, que es
              donde se busca en un teléfono. */}
          <div
            className={cn('flex shrink-0 items-center rounded-lg transition-colors',
              compacto ? 'h-7' : 'h-9',
              nombreEnNegro ? 'bg-slate-900 text-white' : 'text-slate-800')}
          >
            {/* «CONOCIMIENTO» EN VERDE (2026-08-24). Eugenio: «el logo de Red
                de Conocimiento, pon Conocimiento en el verde que has utilizado
                en la página principal de sesión no iniciada».

                Es el `emerald-600` de la portada, que es donde ese verde ya
                significa algo —lo lleva el botón de entrar y los datos que sí
                están medidos—. Poner un verde parecido pero distinto sería
                empezar el segundo verde de la marca.

                Y va sólo en la segunda palabra: «Red de» es lo genérico y
                «Conocimiento» es el nombre. Cuando el botón está abierto o
                estás en una de sus páginas el fondo es negro, y ahí el verde
                oscuro no se leería: se sube a `emerald-400`. */}
            <button
              onClick={() => { setInfoAbierta(false); navigate('/'); }}
              title="Ir al inicio"
              className={cn('hidden h-full items-center rounded-l-lg pl-2 pr-1 transition-colors sm:flex',
                nombreEnNegro ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
            >
              <span className="whitespace-nowrap text-sm font-black tracking-tight">
                Red de{' '}
                <span className={cn(nombreEnNegro ? 'text-emerald-400' : 'text-emerald-600')}>
                  Conocimiento
                </span>
              </span>
            </button>
            <button
              onClick={() => setInfoAbierta(o => !o)}
              title="Sobre la Red de Conocimiento"
              aria-label="Sobre la Red de Conocimiento"
              aria-expanded={infoAbierta}
              className={cn('flex h-full items-center rounded-lg px-1.5 transition-colors sm:rounded-l-none',
                nombreEnNegro ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
            >
              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', infoAbierta && 'rotate-180')} />
            </button>
          </div>
          {infoAbierta && (
            /* SE ABRE HACIA LA DERECHA, PORQUE EL BOTÓN ESTÁ A LA IZQUIERDA
               (2026-08-24). Eugenio: «arregla este desplegable, no se ve bien
               el contenido».

               Colgaba de `right-0`, o sea con su borde derecho pegado al del
               botón: de ahí para la izquierda hay 224 px de panel y sólo 16 px
               de pantalla, así que la mitad de cada título quedaba cortada
               fuera del navegador. Esa alineación era correcta cuando el
               nombre vivía en la derecha de la barra; al mudarse a la
               izquierda dejó de serlo, y nada la avisó porque el panel seguía
               abriéndose.

               Abajo de `sm` sigue anclado a la pantalla y no al botón: a 375 px
               ni a un lado ni al otro cabe un panel de 224 px sin salirse. */
            <div className="fixed inset-x-2 top-14 sm:absolute sm:inset-x-auto sm:top-11 sm:left-0 sm:w-56 bg-white border border-slate-200 shadow-2xl rounded-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Información</p>
              {/* LAS ENTRADAS SALEN DE LA LISTA (2026-08-22): la misma
                  `src/paginasInfo.ts` que monta las rutas en App.tsx. Cinco
                  programadores necesitaban una entrada aquí la misma tarde;
                  con la lista, añadir una página es una línea al final de un
                  fichero que nadie más está editando, y no un cambio en estas
                  veinte. El marco, el tamaño y el ajuste al móvil de abajo se
                  quedan como estaban. */}
              {PAGINAS_INFO.filter(op => op.enMenu !== false).map(op => (
                <button key={op.ruta}
                  onClick={() => { setInfoAbierta(false); navigate(`/${op.ruta}`); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 text-left">
                  <op.icono className="w-3.5 h-3.5 text-slate-400" /> {op.titulo}
                </button>
              ))}
            </div>
          )}
        </div>

        <span
          aria-hidden
          /*
           * NO SE PINTA EN EL MÓVIL, Y ES UNA RENUNCIA, NO UN OLVIDO.
           *
           * Eugenio lo quería centrado arriba, y en un ordenador lo está. A
           * 375 px no cabe: la barra ya lleva el logo, el menú, buscar,
           * información, feedback, la campana y tu foto — quedan ~117 px libres
           * y el nombre pide ~140. Probado en dos pasos: primero recortándolo, y
           * seguía montándose encima de los iconos.
           *
           * **Texto superpuesto es peor que texto ausente**: uno no se lee y el
           * otro tampoco, pero además ensucia lo que sí se leía. Y el nombre no
           * se pierde en un teléfono: está en la portada, en la cabecera de los
           * dos raíles y en la pestaña del navegador.
           *
           * Si algún día tiene que estar sí o sí, la salida es quitar un icono
           * de la barra, no encoger el nombre hasta que no se lea.
           */
          className="hidden"
        >
          Red de Conocimiento
        </span>

        {/* ══ EL BUSCADOR, EN EL CENTRO (2026-08-24) ═══════════════════════
            Como en YouTube: el nombre a la izquierda, la búsqueda ocupando el
            centro y la cuenta a la derecha. El centro de la barra es el sitio
            más grande que hay y hasta hoy lo ocupaba un rótulo que no hace
            nada; ahora lo ocupa lo único de ahí arriba que se usa a diario. */}
        <BuscadorSuperior compacto={compacto} />

        {/* ══ EL MENÚ, A LA IZQUIERDA Y SIN PALABRA ═══════════════════════
            Eugenio, 2026-08-21: «vuelve a poner el menú colapsable superior a
            la izquierda, y el logo de Humanity Wiki a la izquierda del menú
            colapsable». Y sin la palabra «Menú»: tres rayas es el icono más
            reconocido que hay en una pantalla.

            SIGUE SIENDO GRANDE. Desde que no hay estado intermedio del menú,
            éste es el ÚNICO camino de vuelta, y este proyecto ya tiene
            catalogado que 83 de cada 100 de sus botones bajan de 24 px. */}
        {/* SIN `user` (2026-08-23). Eugenio: «el menú lateral izquierdo, cuando
            se pliega, no se vuelve a desplegar… todo esto con la sesión
            cerrada».
            Desde ayer el menú se pinta también sin sesión, pero esta condición
            se quedó como estaba: **se podía plegar y no había forma de volver a
            abrirlo**. Un callejón sin salida, y del peor tipo — el que se abre
            con un gesto normal y no tiene deshacer.
            Es la segunda vez hoy que quitar `user &&` de un sitio deja el fallo
            en otro que asumía lo mismo. Los otros dos de esta misma barra están
            justo debajo. */}
        {!menuPuesto && (
          <button
            onClick={ponerMenu}
            title="Ver el menú"
            aria-label="Ver el menú"
            aria-expanded={false}
            // SIN FONDO NEGRO (2026-08-22, hormiguero: «el icono del menú no
            // debería tener fondo negro»). Era la pastilla más oscura de toda
            // la barra y tiraba del ojo a la esquina, cuando lo que hay que
            // mirar está en el centro. Además el negro significa otra cosa en
            // esta plataforma —«aquí estás»—, y un botón que abre el menú no es
            // un sitio donde se esté.
            className={cn('shrink-0 grid place-items-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors',
              compacto ? 'w-8 h-8' : 'w-10 h-10')}
          >
            {/* EL MISMO DIBUJO QUE EL DE ESCONDERLO, DEL REVÉS (2026-08-22,
                Eugenio: «haz que el botón de menú lateral sea parecido al
                botón que hay de colapsar el menú lateral, en vez de las 3
                líneas»).

                Tres rayas es «un menú», en abstracto; este panel con la
                flecha es «el menú que se va por la izquierda» — y es
                exactamente el mismo dibujo que lo esconde, girado. Los dos
                botones son las dos mitades de un mismo gesto y ahora se
                parecen entre sí, que es lo que enseña que lo son. */}
            <PanelLeftOpen className={cn(compacto ? 'w-5 h-5' : 'w-6 h-6')} />
          </button>
        )}



        {/* Las ventanas abiertas del Escritorio, como ICONOS (2026-08-19,
            petición de Eugenio: «en ese uno es donde deben estar las ventanas
            en forma de iconos para que no ocupen mucho»). Pulsar uno trae la
            ventana; si ya está delante, la minimiza. */}
        {/* LA PESTAÑA DE INICIO SE HA IDO (2026-08-22, Eugenio: «en el menú
            de escritorio, quita el botón de inicio, y que cuando pulses en el
            logo te lleve a Inicio, pero quita ese botón permanente; si hay
            ventanas abiertas y se cierran todas pues te lleva a inicio
            directamente»).

            Se puso ayer para que con todo cerrado hubiera una forma de volver
            arriba. El agujero era real, pero la pestaña lo tapaba ocupando
            sitio SIEMPRE para un caso que dura un segundo. El logo ya lleva al
            inicio —está a dos centímetros y es lo primero que se mira—, y
            cerrar la última ventana ahora te deja allí solo. Dos caminos que
            no cuestan un píxel de barra. */}

        {/* CERRARLAS TODAS (2026-08-22, Eugenio: «añade en la parte izquierda
            una x con fondito rojo que si pinchas te dé la opción de cerrar
            todas las ventanas abiertas»). Va a la izquierda de las pestañas,
            pegada a la de Inicio, porque es la operación que las afecta a
            todas y no a ninguna en concreto.

            PIDE CONFIRMACIÓN, y por eso el rojo. Cerrar ocho ventanas de un
            clic no se deshace, y una ✕ roja junto a otras ✕ pequeñas se pulsa
            sin querer. Se enseña cuántas se van a cerrar: «8» es un número que
            frena y «cerrar todas» no. */}
        {ventanasAbiertas.length > 1 && (
          <div className="relative shrink-0 ml-1">
            <button
              onClick={() => setConfirmarCerrarTodas(v => !v)}
              title={`Cerrar las ${ventanasAbiertas.length} ventanas`}
              aria-label={`Cerrar las ${ventanasAbiertas.length} ventanas`}
              className={cn('grid place-items-center rounded-lg border transition-colors',
                compacto ? 'w-6 h-6' : 'w-7 h-7',
                confirmarCerrarTodas
                  ? 'bg-rose-600 border-rose-600 text-white'
                  : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100')}
            >
              <X className={cn(compacto ? 'w-3.5 h-3.5' : 'w-4 h-4')} />
            </button>
            {confirmarCerrarTodas && (
              <div className="absolute left-0 top-full mt-1 z-50 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <p className="text-[11px] text-slate-600 leading-snug px-1 pb-2">
                  ¿Cerrar las {ventanasAbiertas.length} ventanas abiertas?
                </p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setConfirmarCerrarTodas(false)}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
                  >
                    No
                  </button>
                  <button
                    onClick={() => { cerrarTodasLasVentanas(); setConfirmarCerrarTodas(false); }}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
                  >
                    Cerrar todas
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
        {/* ══ LA HORMIGA ══════════════════════════════════════════════════
            (2026-08-22, Eugenio: «crea un botón que sea de una hormiga en el
            menú superior junto a las notificaciones, y ahí permite al usuario
            crear tareas para el equipo de desarrollo».)

            EL PUNTO ES NARANJA CUANDO ALGO TE NECESITA A TI, y solo entonces.
            Si también se pintara por lo que está esperando a que lo programen,
            estaría encendido siempre y dejaría de significar nada. */}
        {/* ══ THE INFO «i» MENU ═══════════════════════════════════════════
            (2026-08-22, Eugenio asked for an information menu top right.)

            Groups the pages that EXPLAIN the platform — what it is, how it
            scores territories — which until today had no visible door:
            /sobre-red-humana existed and nothing linked to it. It goes
            BEFORE the ant: first understand, then ask. */}
        {/* BUSCAR, QUE VIVÍA EN LA BARRA DE ABAJO (2026-08-23). Al sustituir
            esa barra por los tres círculos se quedaba sin sitio, y una
            aplicación de conocimiento sin buscador es una biblioteca sin
            fichero. Va aquí, que es el otro lugar donde se busca un buscador, y
            lleva a la pantalla que ya tiene la caja de verdad. */}
        {/* (El botón suelto de buscar se ha ido: lo sustituye la caja del
            centro, que hace lo mismo y además deja escribir sin cambiar de
            pantalla primero.) */}


        <button
          onClick={() => navigate('/hormiguero')}
          title={incidencias.bloqueadas
            ? `${incidencias.bloqueadas} ${incidencias.bloqueadas === 1 ? 'nota necesita' : 'notas necesitan'} algo tuyo`
            : 'Lo que falla y lo que falta'}
          aria-label="Feedback: lo que falla y lo que falta"
          /* CON LA PALABRA AL LADO (2026-08-22, Eugenio: «pon la palabra
             Feedback en el menú, al lado del icono»). Un icono solo obliga a
             adivinar o a dejar el dedo encima esperando el globo de ayuda —y en
             un móvil no hay globo de ayuda, así que ahí simplemente no se sabe
             qué es. Con la palabra deja de haber adivinanza.
             En la barra estrecha la palabra se oculta: ahí no cabe, y es el
             único sitio donde el icono va solo. */
          className={cn('relative flex items-center gap-1.5 rounded-lg transition-colors shrink-0',
            compacto ? 'w-7 h-7 justify-center' : 'h-9 px-2.5',
            location.pathname === '/hormiguero'
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}
        >
          <IconoFeedback className={cn('shrink-0', compacto ? 'w-4 h-4' : 'w-5 h-5')} />
          {/* LA PALABRA SE VA EN EL MÓVIL (2026-08-23). Al centrar «Red de
              Conocimiento» en la barra, a 375 px el nombre se montaba encima de
              esta palabra: dos textos superpuestos y ninguno legible. Se ve en
              una captura, no compilando.
              Se quita la de aquí y no el nombre porque el nombre es la marca de
              la aplicación y esto es un botón que ya se entiende por su icono —
              y que además conserva la palabra en su `aria-label`. */}
          {!compacto && <span className="hidden text-xs font-bold sm:inline">Feedback</span>}
          {incidencias.bloqueadas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black grid place-items-center">
              {incidencias.bloqueadas > 9 ? '9+' : incidencias.bloqueadas}
            </span>
          )}
        </button>

        {/* ══ MENSAJERÍA Y LLAMADAS, A LA DERECHA DEL TODO (2026-08-24) ═══
            Eugenio: «pon en el menú superior a la derecha del todo el botón de
            mensajería y telecomunicaciones».

            Va PEGADO a la cuenta y después de la campana, y las tres cosas
            juntas cuentan lo mismo desde ángulos distintos: quién eres, qué te
            avisa y quién te habla. Antes vivía sólo en el menú lateral, o sea
            que para ver si alguien te había escrito había que abrir un menú —
            y un mensaje que hay que ir a buscar es un mensaje que llega tarde.

            Un solo botón para las dos cosas porque son la misma pantalla:
            `/mensajes` lleva el chat y desde ahí se llama. Dos botones serían
            dos puertas a la misma habitación. */}
        <button
          onClick={() => navigate('/mensajes')}
          title="Mensajes y llamadas"
          aria-label="Mensajes y llamadas"
          className={cn('grid shrink-0 place-items-center rounded-lg transition-colors',
            compacto ? 'w-7 h-7' : 'w-9 h-9',
            location.pathname.startsWith('/mensajes') || location.pathname.startsWith('/telefono')
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800')}
        >
          <MessageSquare className={cn(compacto ? 'w-4 h-4' : 'w-5 h-5')} />
        </button>

        {/* ══ EL CALENDARIO, ARRIBA A LA DERECHA (2026-08-24) ═══════════
            Eugenio: «pon el acceso al calendario arriba a la derecha, y que
            cuando se haga hover te dé una preview del día de hoy y si tienes
            algún evento, y si se pincha ya te lleva a la página de calendario».

            SÓLO CON LA SESIÓN ABIERTA, y no por prudencia: `/api/calendario`
            contesta 401 sin sesión, así que a un visitante este botón le
            enseñaría un panel vacío cada vez que pasara por encima. Un
            calendario que dice «hoy no tienes nada» a quien ni siquiera ha
            entrado no está informando de nada.

            Va junto a la campana y los mensajes porque las tres contestan la
            misma clase de pregunta —qué me espera— y se miran de un vistazo. */}
        {user && (
          <BotonCalendario compacto={compacto} activo={location.pathname.startsWith('/calendario')} />
        )}

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
              aria-label="Iniciar sesión"
              className="h-9 px-2.5 sm:px-3 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">
              <User className="w-3.5 h-3.5 shrink-0" />
              {/* Dos palabras distintas para lo mismo, y no un texto recortado:
                  «Iniciar ses…» no es más corto, es peor. El `aria-label` de
                  arriba dice la frase entera pase lo que pase, así que quien no
                  ve la pantalla oye siempre lo mismo. */}
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">Iniciar sesión</span>
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

        {/* EL PANEL LATERAL, FUERA DE <main> Y FUERA DEL GESTOR. Es una capa
            propia: no es una ventana del escritorio (no se arrastra, no se
            minimiza, no se guarda de un día para otro) y no debe heredar el
            recorte de la página. Lo abre cualquier sitio con `abrirLateral`. */}
        <VentanaLateral />

        {/* UN SOLO ASISTENTE, EL MISMO EN TODAS LAS HERRAMIENTAS. En la
            herramienta «IA» no se monta: esa página YA ES el asistente a
            pantalla completa, y tener además su botón flotante daría dos
            chats a la vez — el error que este proyecto ya pagó caro. */}
        {!isIAPage && <AIAssistant />}

        {/* EL TELÉFONO, EN TODA LA APLICACIÓN (2026-08-22). Va aquí y no en la
            pantalla de Mensajes porque una llamada tiene que sonar estés donde
            estés. Y va SOLO en este lado del `if`, no en el de las ventanas
            incrustadas: cada ventana es un iframe con su propia copia de la
            aplicación, y montarlo allí también significaría cuatro conexiones
            abiertas por persona y el mismo timbre sonando cuatro veces. */}
        <CapaTelecom />
      </div>

      {/* Sin pie de página (Eugenio, 2026-08-20: «que no haya otra barra
          abajo»). Solo hay UNA barra, la de arriba, y lleva las ventanas. */}
      </div>

      {/* ══ ORGANIZAR: LO TUYO, POR LA DERECHA (2026-08-23) ═══════════════
          Eugenio: «el botón de la derecha sería el de organizar… coger
          exactamente ese mismo menú que ahora está a la izquierda y ponerlo a
          la derecha, con la misma lógica».

          Es EL MISMO componente, no una copia espejada: `Rail` con
          `ladoDerecho` y `Panel` sin tocar. Dos raíles serían dos sitios donde
          arreglar el mismo fallo.

          Y va DESPUÉS de la columna de contenido a propósito: en una fila flex
          el orden del documento es el orden en pantalla. Ponerlo antes lo
          dejaba a la izquierda por mucho `right-0` que llevara dentro.

          Ya no está siempre: aparece al pulsar su círculo. Ésa es la
          simplificación — la pantalla empieza limpia y tú decides qué traer. */}
      {/* El espejo del de la izquierda, y siempre puesto por lo mismo. Ver la
          nota de allí. Aquí el panel va ANTES que el raíl: en una fila flex el
          orden del documento es el orden en pantalla, y el raíl tiene que
          quedar pegado al borde derecho. */}
      {!esMovil && (
        <div className="flex h-full shrink-0" {...gestoDelMenu}>
          {panelAbierto && (
            <Panel herramienta={panelAbierto} onCerrar={() => setPanelAbierto(null)} />
          )}
          {/* FONDO BLANCO EN LOS DOS (2026-08-24, Eugenio: «ponle el fondo
              blanco»). En blanco los colores del mapa se ven — un
              `text-yellow-500` sobre negro casi no existe. */}
          <Rail
            siempreAbierto={circulo === 'organizar'}
            claro
            ladoDerecho
            abierta={panelAbierto?.clave ?? null}
            // El nombre lleva a la herramienta; la flecha enseña lo que hay
            // dentro sin sacarte de donde estás.
            onElegir={h => navigate(h.ruta)}
            onAbrirSubmenu={h => setPanelAbierto(a => (a?.clave === h.clave ? null : h))}
            onPlegar={() => { setCirculo(null); setPorRoce(false); setPanelAbierto(null); }}
            onInicio={() => { navigate('/'); setPanelAbierto(null); setCirculo(null); }}
          />
        </div>
      )}

      {/* En móvil «Organizar» ocupa la pantalla: a 375 px un raíl y un panel
          uno al lado del otro no dejan nada para el contenido. */}
      {/* ══ Y SALE POR LA DERECHA, COMO EN EL ORDENADOR (2026-08-25) ══════
          Eugenio: «en versión móvil, cuando pulsas el botón de organizar, se
          abre el menú de izquierda a derecha. Cuando ese menú en realidad tiene
          que estar a la derecha».

          Tenía razón y era un despiste con consecuencias: en el ordenador
          «Explorar» vive a la izquierda y «Organizar» a la derecha, y esa
          posición es la mitad de lo que distingue a los dos menús — se aprende
          con la mano antes que con la cabeza. En el móvil los dos salían por la
          izquierda, así que el mismo botón abría el mismo sitio en dos lados
          distintos según el aparato.

          En una fila flex el orden del documento es el orden en pantalla, así
          que basta con invertirlo: primero el velo y después el menú. Es
          exactamente lo que ya hace la versión de escritorio, donde el panel va
          antes que el raíl por la misma razón.

          Y entra deslizándose desde su lado: un cajón que aparece por un borde
          y se va por el otro cuenta mal de dónde ha salido. */}
      {circulo === 'organizar' && esMovil && (
        <div className="fixed inset-0 z-[9997] flex bg-white">
          <div onClick={() => { setPanelAbierto(null); setCirculo(null); }} aria-hidden className="flex-1 bg-slate-900/30" />
          <div className="flex animate-in slide-in-from-right duration-200">
            {panelAbierto
              ? <Panel herramienta={panelAbierto} onCerrar={() => setPanelAbierto(null)} />
              : <Rail
                  siempreAbierto
                  claro
                  ladoDerecho
                  abierta={null}
                  // EN MÓVIL LA FLECHA HACE MÁS FALTA TODAVÍA: no hay ratón, así
                  // que no hay ningún gesto intermedio entre mirar y abrir. El
                  // nombre lleva a la herramienta y la flecha enseña lo que tiene
                  // dentro; sin ella, una de las dos cosas no tendría puerta.
                  onElegir={h => { if (h.ruta.startsWith('/')) { navigate(h.ruta); setCirculo(null); } else setPanelAbierto(h); }}
                  onAbrirSubmenu={h => setPanelAbierto(h)}
                  onInicio={() => { navigate('/'); setCirculo(null); }}
                />}
          </div>
        </div>
      )}

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
      {/* SIN `user` (2026-08-23): el raíl y sus paneles son también para quien
          no ha entrado, igual que en escritorio. */}
      {esMovil && menuPuesto && (
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
            {/* EL MISMO RAÍL QUE EN ESCRITORIO, desplegado. Antes aquí iba
                `MenuLateral`, y entonces en un móvil no había forma de llegar a
                los paneles: existían y no tenían puerta.
                Al elegir una herramienta el cajón se cierra y, si tiene panel,
                se abre a pantalla completa — que es lo que decidió Eugenio para
                móvil. Dejar el cajón abierto detrás sería dos capas de
                navegación en una pantalla de 375 px. */}
            <Rail
              siempreAbierto
              abierta={panelAbierto?.clave ?? null}
              onElegir={h => {
                setCajonAbierto(false);
                if (h.ruta.startsWith('/')) navigate(h.ruta);
                else setPanelAbierto(h);
              }}
              onAbrirSubmenu={h => { setCajonAbierto(false); setPanelAbierto(h); }}
              onInicio={() => { navigate('/'); setPanelAbierto(null); setCajonAbierto(false); }}
            />
          </div>
        </>
      )}

      {/* ══ LOS TRES CÍRCULOS, LO ÚLTIMO Y ENCIMA DE TODO ════════════════
          Van al final del documento a propósito: flotan sobre la página, sobre
          las ventanas y sobre los paneles, y en un navegador el que va después
          gana sin tener que subir el `z-index` de nadie. */}
      {/* El envoltorio no pinta nada: sólo sirve para poder preguntar «¿está el
          ratón todavía en los círculos?». Ver `useCerrarAlAlejarse`. */}
      <div ref={cajaCirculos}>
        <TresCirculos abierto={circulo} onPulsar={pulsarCirculo} onPasarPorEncima={abrirPorRoce} />
      </div>

      {/* La hoja recibe `gestoDelMenu` como cualquier otro menú abierto por
          roce: sin él, llevar el ratón desde el botón hasta las herramientas
          contaba como alejarse y la hoja se cerraba justo al ir a usarla. */}
      {circulo === 'crear' && <HojaCrear onCerrar={() => setCirculo(null)} gesto={gestoDelMenu} />}

      {/* Y en móvil, «Explorar» también ocupa media pantalla — pero encima del
          contenido, no al lado: a 375 px una columna del 50 % dejaría al
          contenido 187 px, que no es una pantalla, es una rendija. */}
      {esMovil && circulo === 'explorar' && (
        <div className="fixed inset-0 z-[9997] flex bg-white">
          {objetivoAbierto
            ? <PanelExplorar objetivoId={objetivoAbierto} onCerrar={() => setObjetivoAbierto(null)} />
            : <Rail
                siempreAbierto
                claro
                titulo="Explorar"
                items={OBJETIVOS_RAIL}
                abierta={null}
                onElegir={h => { navigate(`/explorar?objetivo=${encodeURIComponent(h.clave)}`); setCirculo(null); }}
                onAbrirSubmenu={h => setObjetivoAbierto(h.clave)}
                onInicio={() => { navigate('/'); setCirculo(null); }}
              />}
          <div onClick={() => { setObjetivoAbierto(null); setCirculo(null); }} aria-hidden className="flex-1 bg-slate-900/30" />
        </div>
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
    // FUERA DE UNA VENTANA, `window.parent` ES UNO MISMO (2026-08-22). Sin
    // iframe no hay app de fuera a la que avisar, y este `postMessage` se lo
    // mandaba a su propia ventana: el oyente de arriba lo recogía y volvía a
    // preguntar quién eres, por nada. Medido en Chrome con la sesión abierta:
    // 8 de los mensajes venían literalmente de sí misma, y seguían llegando
    // uno por segundo indefinidamente.
    //
    // Hoy eso no cuesta red —el arranque acaba y las peticiones paran—, pero
    // deja un oyente despertándose cada segundo para nada, y al primero que le
    // cuelgue un `fetch` se le convierte en una petición por segundo.
    if (window.parent === window) return;
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
