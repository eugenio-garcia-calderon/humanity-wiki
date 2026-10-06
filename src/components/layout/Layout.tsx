import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCerrarAlPulsarFuera } from '../../hooks/useCerrarAlPulsarFuera';
import { useCerrarAlAlejarse } from '../../hooks/useAbrirAlAcercarse';
import {
  User, LogOut, Store, Map as MapIcon, Globe2, Database, Settings,
  Compass, Menu, X, FolderKanban, Folder, Users2, Gamepad2, AppWindow, Globe, ListChecks,
  FileText, ChevronDown, CalendarDays, ChevronsDownUp, ChevronsUpDown, Sparkles, Home, MessageSquare,
 PanelLeftOpen, PanelRightOpen, PanelRightClose, PanelLeftClose, Info, Search, Trash2, LayoutGrid, Phone,} from 'lucide-react';
import PieLegal, { ALTO_PIE } from './PieLegal';
import { abrirVentana, minimizarTodas, pulsarVentana, cerrarVentana, cerrarTodasLasVentanas, maximizarVentana, ordenarVentanas, pedirVentanas, type VentanaEstado } from '../ventanas/bus';
import GestorVentanas from '../ventanas/GestorVentanas';
import VentanaLateral from '../ventanas/VentanaLateral';
import MenuLateral from './MenuLateral';
import Rail, { type Herramienta } from '../navegacion/Rail';
import Panel, { EstilosPanel } from '../navegacion/Panel';
/*
 * LOS TRES CÍRCULOS SE HAN IDO (2026-08-25). Eugenio: «el anterior menú
 * inferior deja de tener sentido y se elimina, pasando a ser sustituido por
 * este nuevo menú» — el raíl de herramientas.
 *
 * `Circulo` sobrevive como tipo porque el estado sigue mandando en UNA cosa: en
 * el móvil, qué cajón está abierto. Lo que se ha ido son los tres botones, no
 * la idea de «hay un menú abierto».
 */
import { type Circulo } from '../navegacion/TresCirculos';
import AvatarRail from '../navegacion/AvatarRail';
import TodasMisPaginas from '../navegacion/MarcaRail';
import Logo from '../navegacion/Logo';
import FiltroAmbito, { leerAmbito, type Ambito } from '../navegacion/FiltroAmbito';
import { useProyectos, PanelProyecto, PieProyectos } from '../navegacion/ProyectosRail';
import ArbolPaginas from '../navegacion/ArbolPaginas';
import PanelExplorar, { OBJETIVOS_RAIL } from '../navegacion/PanelExplorar';
import HojaCrear from '../navegacion/HojaCrear';
import HojaExplorar from '../navegacion/HojaExplorar';
import BuscadorSuperior from '../navegacion/BuscadorSuperior';
import PaletaBusqueda from '../espacio/PaletaBusqueda';
import { SincronizarPreferencias } from '../espacio/AparienciaIdioma';
import AvisoBorradores from '../espacio/AvisoBorradores';
import { t as tr } from '../../i18n';
import BotonCalendario from '../navegacion/BotonCalendario';
import DialogoNuevoTema from '../navegacion/DialogoNuevoTema';
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
  { to: '/carpetas', label: 'Mis carpetas', icon: Folder },
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
    ['/personas/', User], ['/carpetas/', Folder], ['/paginas/', FileText],
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

  /*
   * TUS PROYECTOS, QUE AHORA SON EL MENÚ DE LA DERECHA (2026-08-25).
   * Se piden una vez desde aquí y no desde el raíl, porque el mismo dato lo
   * necesitan el raíl (para los iconos) y el panel (para saber cuál abrir).
   * Dos peticiones para lo mismo son dos listas que se pueden contradecir.
   */
  const { estado: proyectos, recargar: recargarProyectos } = useProyectos(!!user);
  const listaProyectos = Array.isArray(proyectos) ? proyectos : [];
  // TUS PÁGINAS, EN ÁRBOL (2026-10-05): carpetas y páginas las pinta
  // `ArbolPaginas` —acordeón sin fondo y arrastrar una dentro de otra—, en el
  // hueco del pie del raíl. Antes eran entradas del raíl y una carpeta abría
  // otro panel al lado (`PanelProyecto`), que es lo que Eugenio pidió quitar.
  const proyectosDe = (clave: string) => listaProyectos.find(p => `proyecto-${p.id}` === clave);
  const [proyectoAbierto, setProyectoAbierto] = useState<ReturnType<typeof proyectosDe>>(undefined);
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
    // Sólo se pide el árbol de un OBJETIVO. Al abrir una rama de dentro no hay
    // nada que pedir: el árbol entero del objetivo ya llegó en esa primera
    // petición, y volver a pedirlo por cada rama que alguien abra sería una
    // llamada por clic para datos que ya están en memoria.
    if (!/^O\d{3}$/.test(clave)) return;
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
  /** Tus páginas, plegadas del todo a la izquierda (2026-10-02). */
  // ══ EL MENÚ DE TEMAS, A LA DERECHA (2026-10-05) ═══════════════════════
  // Eugenio: «en la parte derecha, un menú desplegable idéntico al de la
  // izquierda, pero con los 14 temas; arriba un filtro mío / todo». Plegable y
  // recordado como el de la izquierda; el ámbito se comparte con la página
  // del tema a través de `humanity:temas-ambito`.
  const [temasPlegado, setTemasPlegadoState] = useState<boolean>(() => {
    try { return localStorage.getItem('humanity:temas-plegado') === '1'; } catch { return false; }
  });
  const setTemasPlegado = (v: boolean) => {
    setTemasPlegadoState(v);
    try { localStorage.setItem('humanity:temas-plegado', v ? '1' : '0'); } catch { /* sin almacenamiento */ }
  };
  const [ambitoTemas, setAmbitoTemasState] = useState<Ambito>(() => leerAmbito(false));
  useEffect(() => { setAmbitoTemasState(leerAmbito(!!user)); }, [user]);
  const setAmbitoTemas = (a: Ambito) => {
    setAmbitoTemasState(a);
    try { localStorage.setItem('humanity:temas-ambito', a); } catch { /* sin almacenamiento */ }
    // Si estás viendo un tema, el cambio se aplica ahí mismo.
    const m = /^\/temas\/(O\d{3})\/contenido$/.exec(location.pathname);
    if (m) navigate(`/temas/${m[1]}/contenido?ambito=${a}`, { replace: true });
  };
  // La página del tema avisa cuando el ámbito cambia desde ella.
  useEffect(() => {
    const al = (e: Event) => { const a = (e as CustomEvent).detail; if (a === 'mio' || a === 'todos') setAmbitoTemasState(a); };
    window.addEventListener('humanity:temas-ambito', al);
    return () => window.removeEventListener('humanity:temas-ambito', al);
  }, []);
  // El panel de la IA se pega al borde derecho: con el menú de temas abierto
  // se corre a su izquierda, para no taparlo.
  const temasVisible = !esMovil && !temasPlegado;
  // Lo que ocupa el menú izquierdo, para que el Feedback flotante no caiga
  // encima de él (se define abajo, donde ya se sabe si está plegado).
  // The theme you are looking at, so the menu can say so.
  const temaActivo = /^\/temas\/(O\d{3})(\/|$)/.exec(location.pathname)?.[1] ?? null;
  const subtemaActivo = new URLSearchParams(location.search).get('subtema');
  // Landing on a subtopic (a shared link): its theme opens in the menu so
  // the marked subtopic can be seen.
  useEffect(() => {
    if (temaActivo && subtemaActivo && !ramasAbiertas[temaActivo]) alternarRama(temaActivo);
  }, [temaActivo, subtemaActivo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.documentElement.style.setProperty('--hueco-temas', temasVisible ? '256px' : '0px');
    return () => { document.documentElement.style.setProperty('--hueco-temas', '0px'); };
  }, [temasVisible]);

  const [paginasPlegado, setPaginasPlegadoState] = useState<boolean>(() => {
    try { return localStorage.getItem('humanity:paginas-plegado') === '1'; } catch { return false; }
  });
  const setPaginasPlegado = (v: boolean | ((x: boolean) => boolean)) => setPaginasPlegadoState(x => {
    const n = typeof v === 'function' ? v(x) : v;
    try { localStorage.setItem('humanity:paginas-plegado', n ? '1' : '0'); } catch { /* sin almacenamiento */ }
    return n;
  });
  // El ancho del menú izquierdo, publicado para el Feedback flotante.
  useEffect(() => {
    const abierto = !esMovil && !!user && !paginasPlegado;
    document.documentElement.style.setProperty('--hueco-paginas', abierto ? '256px' : '0px');
    return () => { document.documentElement.style.setProperty('--hueco-paginas', '0px'); };
  }, [esMovil, user, paginasPlegado]);

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

  /** El diálogo de crear un tema, abierto desde el menú de la izquierda. */
  const [nuevoTema, setNuevoTema] = useState(false);
  /** Cuando el «+» sale de una rama concreta, el diálogo abre colgado de ella. */
  const [nuevoTemaEn, setNuevoTemaEn] = useState<string | null>(null);

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
  /** El botón del nombre se pinta en negro cuando su menú está abierto o estás
   *  en una de sus páginas. Lo miran dos sitios —el fondo y el tono del verde
   *  de «Conocimiento»—, así que se decide aquí una vez. */
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
      {/* ══ TUS PÁGINAS, A LA IZQUIERDA (2026-10-02) ══════════════════════
          Eugenio: «el menú de la derecha pasa a estar en la izquierda, y el de
          la izquierda oculto, que solo se abra al darle a Explorar. Y que ese
          menú izquierdo, donde están las páginas del usuario, se pueda
          colapsar del todo con un botón como el de Claude».
          Abierto, a lo ancho; plegado, no ocupa nada. Se recuerda entre visitas
          (`humanity:paginas-plegado`). Lo común —los temas— se abre por abajo
          desde «Explorar» (`HojaExplorar`); la derecha queda para la IA. */}
      {!esMovil && user && !paginasPlegado && (
        <div className="flex h-full shrink-0" {...gestoDelMenu}>
          <Rail
            siempreAbierto
            claro
            titulo="Mis páginas"
            items={[]}
            // 2026-10-05: la marca, en la fila de arriba junto a plegar; y debajo
            // tu perfil, tus avisos y «Todas mis páginas», en ese orden.
            // `relative -top-1`: el mismo píxel que el logo de la barra
            // (medido: 4 px más abajo sin esto).
            junto={<Logo className="relative -top-1 mr-auto" onClick={() => { minimizarTodas(); navigate('/'); setProyectoAbierto(null); setCirculo(null); }} />}
            cabeza={<><AvatarRail desplegado /><TodasMisPaginas /></>}
            abierta={proyectoAbierto ? `proyecto-${proyectoAbierto.id}` : null}
            onElegir={h => navigate(h.ruta)}
            onAbrirSubmenu={h => {
              const p = proyectosDe(h.clave);
              setProyectoAbierto(a => (a?.id === p?.id ? null : p ?? null));
            }}
            onPlegar={() => { setPaginasPlegado(true); setProyectoAbierto(null); }}
            onInicio={() => { navigate('/'); setProyectoAbierto(null); setCirculo(null); }}
            pie={<><ArbolPaginas /><PieProyectos estado={proyectos} desplegado onReintentar={recargarProyectos} /></>}
          />
          {proyectoAbierto && (
            <PanelProyecto proyecto={proyectoAbierto} onCerrar={() => setProyectoAbierto(null)} />
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

        {/* ══ «EXPLORAR», FUSIONADO CON LA COLUMNA DE LA IZQUIERDA ═══════════
            (2026-08-25) Eugenio: «el botón de explorar tiene que estar
            fusionado con el menú izquierdo, y el logo de humanity.wiki a la
            derecha de explorar. Y tiene que tener el logo de la exploración, no
            el de una casa: utiliza una brújula. Piensa cómo hacer esta fusión
            de forma elegante y eficiente para que, cuando el usuario pinche, se
            fije el menú que le corresponde y le lleve a su página».

            ── CÓMO SE HACE LA FUSIÓN, Y POR QUÉ ASÍ ────────────────────────
            No es un botón que esté «cerca» del raíl: es **su remate**. Va el
            primero de la barra, pegado al mismo borde del que nace la columna,
            y cuando está activo se pinta como ella y **sin línea abajo**
            (`-mb-px` se come el borde de la cabecera), de modo que el color
            corre sin corte desde el rótulo hasta el último tema. Eso es lo que
            hace que se lean como una sola pieza y no como dos cosas alineadas.

            Y hace las DOS cosas que pidió, en este orden: **fija** el menú —que
            deja de depender del ratón— y **navega**. Fijar sin navegar dejaría
            el menú abierto sobre la misma página; navegar sin fijar cerraría el
            menú justo al llegar a la página que va de eso.

            La brújula y no la casa: una casa es «inicio», que es otro sitio
            —el logo de al lado ya lleva ahí—. Explorar es buscar sin saber
            todavía qué. */}
        {/* ══ PLEGAR TUS PÁGINAS Y «MIS PÁGINAS», ARRIBA A LA IZQUIERDA (2026-10-02)
            Eugenio: «el botón de mis páginas, arriba a la izquierda, que te
            lleve a una página con todas tus páginas en formato tabla», y «un
            botón como el de Claude, como una ventanita, que colapse o expanda
            el menú izquierdo». El primero pliega; el segundo lleva a la tabla. */}
        {/* Como en Claude: abierto, el botón de plegar vive dentro del menú;
            plegado, aparece aquí para volver a abrirlo. */}
        {/* EL LOGO, EN LA ESQUINA (2026-10-05). En el mismo sitio que ocupa
            dentro del menú izquierdo abierto: al abrirlo no salta. */}
        {(!user || esMovil || paginasPlegado) && (
          <Logo onClick={() => { minimizarTodas(); navigate('/'); setCirculo(null); }} />
        )}
        {user && (esMovil || paginasPlegado) && (
          <button
            onClick={() => {
              setPorRoce(false);
              if (esMovil) { setCirculo(c => (c === 'organizar' ? null : 'organizar')); return; }
              setPaginasPlegado(v => !v);
            }}
            title={paginasPlegado || esMovil ? 'Mostrar tus páginas' : 'Ocultar tus páginas'}
            aria-label={paginasPlegado || esMovil ? 'Mostrar tus páginas' : 'Ocultar tus páginas'}
            aria-expanded={esMovil ? circulo === 'organizar' : !paginasPlegado}
            // «Mis páginas» junto al icono (2026-10-05): que se entienda que
            // pulsando ahí se abre el menú de la izquierda.
            className="inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-lg px-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
            {paginasPlegado || esMovil ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            <span className="hidden whitespace-nowrap text-[13px] font-black sm:inline">{tr('Mis páginas')}</span>
          </button>
        )}
        {/* «Mis páginas» ya no está aquí (2026-10-05): vive dentro del menú
            izquierdo como «Todas mis páginas» (`MarcaRail`). */}

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
        {/* 2026-10-02: en el ordenador el raíl de la izquierda es el de tus
            páginas y lleva su propio logo; si está plegado, o no hay sesión, el
            logo va aquí. */}
        {/* EL LOGO SE HA IDO (2026-10-05). Eugenio: «el icono del logo
            elimínalo, solo permite ir al inicio; que si la gente pincha en
            humanity.wiki vaya a la página de inicio». El nombre hace de
            inicio: en el menú izquierdo (`MarcaRail`) y, cuando ese menú no
            está a la vista, aquí abajo. */}

        {/* ══ EL NOMBRE, CENTRADO (2026-08-23) ════════════════════════════
            Eugenio, 2026-08-26: el nombre vuelve a ser humanity.wiki, y «la
            red de conocimiento» se queda sólo en la portada, debajo del nombre,
            como lo que esto es. Lo de arriba identifica; lo de la portada
            explica. Antes: «vamos a llamarla Red de Conocimiento. Eso tiene que estar
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
        {/* El desplegable de la marca se ha ido (2026-10-05): sus páginas, las
            que quedan, están en el pie (`PieLegal`). */}

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
          humanity.wiki
        </span>

        {/* ══ EL BUSCADOR, EN EL CENTRO (2026-08-24) ═══════════════════════
            Como en YouTube: el nombre a la izquierda, la búsqueda ocupando el
            centro y la cuenta a la derecha. El centro de la barra es el sitio
            más grande que hay y hasta hoy lo ocupaba un rótulo que no hace
            nada; ahora lo ocupa lo único de ahí arriba que se usa a diario. */}
        {/* ══ «EXPLORAR», FIJO ARRIBA A LA IZQUIERDA (2026-08-25) ═════════
            Eugenio: «donde el menú lateral izquierdo se fusiona con el menú
            superior, ahí es donde está la parte de explorar; tiene que aparecer
            el icono de explorar, un icono de una casa, y que aparezca también
            la palabra explorar fija. Si se pulsa, se abre ese menú y te lleva a
            la página donde está la rueda de todos los temas — la página de
            personalizar, realmente».

            Va justo encima de la columna de los catorce temas, así que la
            palabra es el rótulo de esa columna. Y lleva a `/preferencias`, que
            es donde vive la rueda: él se corrigió a sí mismo en la frase y
            **manda la corrección**, no la primera versión. */}
        <BuscadorSuperior compacto={compacto} />
        {/* ⌘K y ⌘P: la paleta de búsqueda rápida (#15). Es un modal; aquí solo escucha. */}
        <PaletaBusqueda />
        <SincronizarPreferencias />
        <AvisoBorradores />

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
        {/* Sólo en el móvil (2026-10-02): abre el cajón de herramientas. En el
            ordenador ya no hay menú de herramientas a la izquierda —están en la
            barra de abajo— y el botón de al lado pliega tus páginas. */}
        {esMovil && !menuPuesto && (
          <button
            onClick={ponerMenu}
            title={tr('Herramientas')}
            aria-label={tr('Herramientas')}
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
            <LayoutGrid className={cn(compacto ? 'w-5 h-5' : 'w-6 h-6')} />
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
                    {tr('Cerrar todas')}
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

        {/* ══ ESTE HUECO YA NO CRECE, PARA QUE EL BUSCADOR QUEDE CENTRADO ══
            (2026-08-25, Eugenio: «haz que el chat de búsqueda sea un 30 % más
            largo, y que esté centrado».)

            Aquí había un `flex-1` vacío cuyo único trabajo era empujar los
            iconos a la derecha. Pero el contenedor del buscador **también** es
            `flex-1`, así que los dos se repartían el hueco a partes iguales: el
            buscador se quedaba con la mitad izquierda de ese espacio y su
            centro caía a 448 px en una ventana de 1440 — a 272 px del centro
            de la pantalla. Se veía torcido porque lo estaba.

            Sin crecer, el buscador se lleva todo el hueco libre y su caja queda
            centrada dentro. Los iconos siguen a la derecha exactamente igual:
            los empuja el buscador, que ahora es el único que crece. */}
        <div className="shrink-0 xl:flex-1" />

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

        {/* ══ LA BARRA DE ARRIBA SE HA VACIADO (2026-08-25) ═══════════════
            Eugenio: «así despejamos la parte de arriba, que la dejamos
            principalmente para la barra de buscar, que, por cierto, ha
            empeorado su aspecto».

            Tenía razón y la causa era ésta: aquí había siete cosas —feedback,
            mensajes, contactos, calendario, campana, tu foto y su menú— y el
            buscador se quedaba con lo que sobraba. Medido antes de tocar nada:
            **por debajo de 1024 px el campo de escribir llegaba a medir cero**.
            No era que el buscador fuera feo: es que no cabía.

            Dónde ha ido cada cosa, y ninguna se ha perdido:
              · Feedback  → al raíl de abajo, en rojo, que es donde él lo pidió.
              · Mensajes, Contactos y Calendario → debajo de tu foto, en el raíl
                de la derecha.
              · Tu foto y su menú → arriba del raíl de la derecha.
            Se queda **la campana**, que él no nombró y que es lo único que
            avisa: esconder un aviso detrás de un clic es dejar de avisar. */}

        {/* La campana y el Feedback se han ido de aquí (2026-10-05): la campana
            vive en el menú izquierdo y el Feedback es un botón flotante abajo a
            la izquierda. */}


        {/* ══ «MIS PROYECTOS», FIJO ARRIBA A LA DERECHA (2026-08-25) ══════
            Eugenio: «arriba a la derecha, mis proyectos, que también debe estar
            fijo arriba a la derecha esa palabra; te lleva a tus proyectos».

            La palabra va escrita y no es un icono: es el rótulo de la columna
            que tiene debajo, igual que «Explorar» lo es de la de la izquierda.
            Un icono aquí obligaría a adivinar de qué es esa columna, que es
            justo lo que estas dos palabras quitan.

            Tu foto ya no está aquí: se ha mudado a lo alto de esa misma columna
            (ver `AvatarRail`), con mensajes, contactos y calendario debajo. */}
            {/* ══ Y EN EL MÓVIL, SIN LA PALABRA PERO CON EL BOTÓN ══════════
                (2026-08-25) Eugenio: «arregla el menú de la versión móvil,
                porque no se puede acceder al menú derecho desde el móvil».

                Y era literal: este botón llevaba `hidden … sm:flex`, así que por
                debajo de 640 px **no se dibujaba**. En un ordenador el raíl de
                la derecha se despliega al acercar el ratón; en un teléfono no
                hay ratón, así que este botón era la única puerta — y no estaba.
                Tus proyectos existían y no había forma de llegar a ellos.

                Lo mismo le pasaba a «Explorar». El izquierdo al menos conservaba
                el botón de las tres rayas; el derecho no tenía nada.

                Ahora el botón se dibuja siempre y lo que se esconde es **la
                palabra**, que es lo que no cabe. El icono se queda, y con él la
                puerta. */}
        {/* EL MISMO REMATE, POR EL OTRO LADO. Fija el raíl de la derecha y
            lleva a tus proyectos, con el mismo par de gestos que «Explorar»:
            las dos esquinas se comportan igual porque son la misma idea. */}
        {/* «EXPLORAR», ARRIBA A LA DERECHA (2026-10-02). Abre por abajo los
            temas de la humanidad (`HojaExplorar`); pulsarlo otra vez lo cierra. */}
        {/* ══ «EXPLORAR», QUE ABRE EL MENÚ DE LA DERECHA (2026-10-05) ════════
            Eugenio: «en vez de poner Temas y el botón de descolapsar, pon
            Explorar y el botón de descolapsar». Con el menú abierto no se ve:
            «Explorar» está entonces dentro del menú, junto a su botón de
            plegar. En el teléfono no hay menú derecho: abre la hoja de temas. */}
        <button
          onClick={() => {
            setPorRoce(false);
            if (esMovil) { setCirculo(c => (c === 'explorar' ? null : 'explorar')); return; }
            setTemasPlegado(!temasPlegado);
          }}
          title={esMovil ? 'Explorar los temas' : temasPlegado ? 'Abrir el menú de temas' : 'Plegar el menú de temas'}
          aria-label={esMovil ? 'Explorar los temas' : temasPlegado ? 'Abrir el menú de temas' : 'Plegar el menú de temas'}
          aria-expanded={esMovil ? circulo === 'explorar' : !temasPlegado}
          className={cn('ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-lg px-2 transition-colors hover:bg-slate-100 hover:text-slate-900',
            !esMovil && !temasPlegado ? 'text-slate-900' : 'text-slate-600')}>
          {!esMovil && <Compass className="h-4 w-4" />}
          <span className="hidden whitespace-nowrap text-[13px] font-black sm:inline">Explorar</span>
          {esMovil ? <Compass className="h-5 w-5" /> : temasPlegado ? <PanelRightOpen className="h-5 w-5" /> : <PanelRightClose className="h-5 w-5" />}
        </button>

        {!user && !cargandoSesion && (
          <Link to="/login"
            aria-label={tr('Iniciar sesión')}
            className="h-9 px-2.5 sm:px-3 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">{tr('Entrar')}</span>
            <span className="hidden sm:inline">{tr('Iniciar sesión')}</span>
          </Link>
        )}
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
            style={{ paddingBottom: `calc(var(--hueco-muelle, 0px) + ${ALTO_PIE}px)`, paddingRight: 'var(--hueco-lateral, 0px)' }}
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
        {temasVisible && (
          <div className="flex h-full shrink-0">
            <Rail
              ladoDerecho
              siempreAbierto
              claro
              titulo="Temas"
              items={temasDelMenu}
              // «EXPLORAR» SE QUEDA ARRIBA (2026-10-05). Eugenio: «que el texto de
              // explorar, cuando se despliega, no baje a su menú, sino que se quede
              // en la parte de arriba; más elegante, y libera espacio». El menú
              // empieza debajo de la barra, así que no tiene fila propia: lo abre
              // y lo pliega el «Explorar» de la barra, que no se mueve.
              sinFilaSuperior
              cabeza={(
                <>
                  <FiltroAmbito ambito={ambitoTemas} onCambiar={setAmbitoTemas} conSesion={!!user} />
                  {/* «Ver todos los temas» en lugar de «Personalizar», y sin
                      «Nuevo tema» (2026-10-05): abre la hoja con los quince. */}
                  <button
                    onClick={() => { setPorRoce(false); setCirculo(c => (c === 'explorar' ? null : 'explorar')); }}
                    aria-expanded={circulo === 'explorar'}
                    className={cn('mb-1 flex h-9 w-full shrink-0 items-center gap-3 rounded-xl px-[10px] text-[12px] font-bold transition-colors',
                      circulo === 'explorar' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}
                  >
                    <LayoutGrid className="h-4 w-4 shrink-0" />
                    <span className="truncate">{tr('Ver todos los temas')}</span>
                  </button>
                </>
              )}
              personal={user ? {
                esFavorito: c => !!prefsTemas[c]?.favorito,
                estaOculto: c => !!prefsTemas[c]?.oculto,
                marcarFavorito: (c, v) => guardarPref(c, { favorito: v }),
                ocultar: c => guardarPref(c, { oculto: true }),
                reordenar: reordenarTemas,
                ocultos: temasOcultos.map(o => ({ clave: o.clave, nombre: o.nombre })),
                mostrar: c => guardarPref(c, { oculto: false }),
              } : undefined}
              ramas={{
                de: c => ramas[c] ?? [],
                hay: c => (cuantasRamas[c] ?? 0) > 0,
                abierto: c => !!ramasAbiertas[c],
                alternar: alternarRama,
                onAnadir: (user?.roleLevel ?? 0) >= 4 ? (padreId => setNuevoTemaEn(padreId)) : undefined,
                // A subtopic opens the theme's feed narrowed to it — same page,
                // same scope — instead of the old wheel page.
                ruta: (t, clave) => `/temas/${clave}/contenido?ambito=${ambitoTemas}&subtema=${encodeURIComponent(t.id)}`,
              }}
              abierta={temaActivo}
              onElegir={h => navigate(`/temas/${encodeURIComponent(h.clave)}/contenido?ambito=${ambitoTemas}`)}
              onInicio={() => navigate('/')}
            />
          </div>
        )}

        <VentanaLateral />

        {/* UN SOLO ASISTENTE, EL MISMO EN TODAS LAS HERRAMIENTAS. En la
            herramienta «IA» no se monta: esa página YA ES el asistente a
            pantalla completa, y tener además su botón flotante daría dos
            chats a la vez — el error que este proyecto ya pagó caro. */}
        {!isIAPage && <AIAssistant />}

        {/* EL CÍRCULO FLOTANTE SE HA IDO (2026-08-25). Eugenio: «mejor pon
            el botón de IA dentro del menú inferior». Estuvo suelto abajo a la
            derecha unas horas y él tenía razón: flotando era un elemento más
            que esquivar —se apartaba del raíl derecho y del inferior leyendo
            sus medidas—, y dentro de la barra no hay nada que esquivar porque
            es la barra. La puerta es la misma: el aviso `ai:abrir`. */}

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
      {/* ══ EL RAÍL DE LA DERECHA SON TUS PROYECTOS (2026-08-25) ═══════════
          Eugenio: «el menú lateral derecho pasa a ser un visor de todos los
          proyectos del usuario, cada uno con su icono, y si se hace hover se
          ven los nombres; y sigue teniendo el submenú para ver dentro de cada
          proyecto lo que hay, sin necesidad de pinchar en él».

          Las herramientas que vivían aquí se han bajado al raíl inferior. La
          regla que ordena ahora las tres barras: izquierda **de qué habla**,
          abajo **con qué se hace**, derecha **qué tienes**. */}
      {/* El raíl de la derecha («Organizar») se ha ido a la izquierda (2026-10-02): ver arriba. */}

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
        // Por la izquierda, como en el ordenador (2026-10-02): tus páginas viven ahí.
        <div className="fixed inset-0 z-[9997] flex flex-row-reverse bg-white">
          <div onClick={() => { setPanelAbierto(null); setCirculo(null); }} aria-hidden className="flex-1 bg-slate-900/30" />
          <div className="flex animate-in slide-in-from-left duration-200">
            {proyectoAbierto
              ? <PanelProyecto proyecto={proyectoAbierto} onCerrar={() => setProyectoAbierto(null)} />
              : <Rail
                  siempreAbierto
                  claro
                  titulo="Mis páginas"
                  items={[]}
                  junto={<Logo className="mr-auto" onClick={() => { navigate('/'); setCirculo(null); }} />}
                  cabeza={<><AvatarRail desplegado /><TodasMisPaginas /></>}
                  abierta={null}
                  // EN MÓVIL LA FLECHA HACE MÁS FALTA TODAVÍA: no hay ratón, así
                  // que no hay ningún gesto intermedio entre mirar y abrir. El
                  // nombre abre el proyecto y la flecha enseña lo que tiene
                  // dentro; sin ella, una de las dos cosas no tendría puerta.
                  onElegir={h => { navigate(h.ruta); setCirculo(null); }}
                  onAbrirSubmenu={h => setProyectoAbierto(proyectosDe(h.clave) ?? null)}
                  onInicio={() => { navigate('/'); setCirculo(null); }}
                  pie={<><ArbolPaginas onIr={() => setCirculo(null)} /><PieProyectos estado={proyectos} desplegado onReintentar={recargarProyectos} /></>}
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
            aria-label={tr('Menú')}
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
      {nuevoTema && <DialogoNuevoTema onCerrar={() => setNuevoTema(false)} />}
      {nuevoTemaEn && (
        <DialogoNuevoTema
          padreInicial={nuevoTemaEn}
          onCerrar={() => setNuevoTemaEn(null)}
          // Al crearlo, se recarga el árbol de ese objetivo: si no, el tema
          // nuevo existe en la base y no está en el menú desde el que se acaba
          // de crear, que es el único sitio donde su autor lo va a buscar.
          onCreado={() => {
            const obj = Object.keys(ramas).find(o => (ramas[o] ?? []).some(t => t.id === nuevoTemaEn));
            setNuevoTemaEn(null);
            if (!obj) return;
            fetch(`/api/temas/${encodeURIComponent(obj)}`, { credentials: 'include' })
              .then(r => (r.ok ? r.json() : null))
              .then(j => { if (j?.subtemas) setRamas(r => ({ ...r, [obj]: j.subtemas })); })
              .catch(() => {});
          }}
        />
      )}

      {/* ══ EL MENÚ DE ABAJO: LAS HERRAMIENTAS ═════════════════════════════
          Sustituye a los tres círculos. Aquéllos no eran destinos: eran mandos
          para abrir otros menús, y ocupaban la franja que alcanza el pulgar
          para no enseñar nada. Ahora esa franja lleva las once herramientas,
          que sí son destinos. Reserva 64 px abajo en vez de 92, así que el
          contenido de todas las páginas gana 28. */}
      {/* ══ DENTRO DEL EDITOR, LA BARRA ES OTRA (2026-08-25) ═══════════════
          Eugenio: «sólo una vez que estás en el editor de una página aparece el
          menú inferior con todas las herramientas para poder agregar a esa
          página». En `/paginas/:id` la barra global se retira y el editor pinta
          la suya —con los bloques que se pueden AÑADIR, no con las páginas a
          las que se puede IR—. Dos barras a la vez serían dos filas de iconos
          compitiendo por el mismo pulgar. */}
      {/* ══ SIN BARRA DE ABAJO: DOS BOTONES FLOTANTES (2026-10-05) ════════
          Eugenio: «quita la barra de creación de abajo y deja solo el botón de
          IA abajo a la derecha, como un botón flotante para abrir el chat; y el
          feedback flotante abajo a la izquierda, simétrico». Cada uno se aparta
          de su menú lateral cuando está abierto (`--hueco-paginas`,
          `--hueco-temas`). En el editor de páginas el de la IA no se pinta: el
          editor ya lleva el suyo, que abre la IA sabiendo qué página tienes
          abierta. */}
      <div ref={cajaCirculos} />
      <PieLegal />
      <button
        onClick={() => navigate('/hormiguero')}
        title={tr('Feedback: cuéntanos qué falla o qué falta')}
        aria-label={tr('Feedback')}
        style={{ left: 'calc(var(--hueco-paginas, 0px) + 16px)', bottom: `calc(${ALTO_PIE + 12}px + env(safe-area-inset-bottom))` }}
        className={cn('fixed z-[9990] inline-flex h-12 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800 shadow-lg transition-colors hover:bg-amber-100',
          location.pathname === '/hormiguero' && 'bg-amber-200')}
      >
        <IconoFeedback className="h-5 w-5 shrink-0" />
        <span className="hidden sm:inline">{tr('Feedback')}</span>
      </button>
      {!/^\/paginas\/[^/]+/.test(location.pathname) && !isIAPage && (
        <button
          onClick={() => window.dispatchEvent(new Event('ai:abrir'))}
          title={tr('Hablar con la IA')}
          aria-label={tr('Abrir el chat de la IA')}
          style={{ right: 'calc(var(--hueco-temas, 0px) + 16px)', bottom: `calc(${ALTO_PIE + 12}px + env(safe-area-inset-bottom))` }}
          className="fixed z-[9990] inline-flex h-12 items-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-600/30 transition-colors hover:bg-violet-700"
        >
          <Sparkles className="h-5 w-5 shrink-0" />
          <span className="hidden sm:inline">{tr('IA')}</span>
        </button>
      )}

      {/* ══ EL PANEL SUBE DESDE ABAJO (2026-08-25) ═════════════════════════
          Eugenio: «esa ventana emergente que aparece cuando se le da a ampliar
          una de las herramientas del menú inferior, en vez de que aparezca en
          el lateral izquierdo, haz que aparezca de abajo arriba hasta la mitad
          de la pantalla».

          Y tiene razón de sobra: **sale del menú de abajo y aparecía arriba a
          la izquierda**, o sea en la otra punta de la pantalla, sin nada que lo
          uniera al botón que acababas de pulsar. Ahora nace justo encima de su
          barra, del mismo ancho máximo, y sube. El gesto y lo que ocurre pasan
          en el mismo sitio.

          MEDIA PANTALLA Y NO MÁS: lo que estabas mirando sigue detrás y se ve.
          A pantalla completa habría que cerrarlo para recordar de dónde venías.

          Arranca en `--hueco-muelle`, que es lo que mide la barra: si un día
          cambia de alto, este panel sube con ella y no hay que acordarse. */}
      {!esMovil && panelAbierto && (
        <>
          <div
            onClick={() => setPanelAbierto(null)}
            aria-hidden
            className="fixed inset-0 z-[9990] bg-slate-900/20 animate-in fade-in duration-150"
          />
          <div
            {...gestoDelMenu}
            className="fixed inset-x-0 z-[9991] mx-auto flex h-[50vh] max-w-3xl overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in slide-in-from-bottom duration-200 [&>*]:w-full [&>*]:border-0"
            style={{ bottom: 'calc(var(--hueco-muelle, 64px) + 8px)' }}
          >
            <Panel herramienta={panelAbierto} onCerrar={() => setPanelAbierto(null)} />
          </div>
        </>
      )}

      {/* La hoja recibe `gestoDelMenu` como cualquier otro menú abierto por
          roce: sin él, llevar el ratón desde el botón hasta las herramientas
          contaba como alejarse y la hoja se cerraba justo al ir a usarla. */}
      {circulo === 'crear' && <HojaCrear onCerrar={() => setCirculo(null)} gesto={gestoDelMenu} />}

      {/* Y en móvil, «Explorar» también ocupa media pantalla — pero encima del
          contenido, no al lado: a 375 px una columna del 50 % dejaría al
          contenido 187 px, que no es una pantalla, es una rendija. */}
      {/* EXPLORAR SUBE DESDE ABAJO, en el ordenador y en el móvil (2026-10-02). */}
      {circulo === 'explorar' && (
        <HojaExplorar temas={temasDelMenu}
          // The sheet lands on the theme's feed too (2026-10-05): on a phone
          // there is no right-hand menu, and this is how you reach it.
          onElegir={c => { navigate(`/temas/${encodeURIComponent(c)}/contenido?ambito=${ambitoTemas}`); setCirculo(null); }}
          onCerrar={() => setCirculo(null)}
          onPersonalizar={user ? () => { navigate('/preferencias'); setCirculo(null); } : undefined} />
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
