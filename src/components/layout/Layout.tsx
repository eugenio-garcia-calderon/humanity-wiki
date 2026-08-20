import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  User, LogOut, Heart, Store, Map as MapIcon, Globe2, Orbit, Database,
  Home, BrainCircuit, Compass, Menu, X, FolderKanban, Users2, Gamepad2, AppWindow, Globe,
} from 'lucide-react';
import { abrirVentana, pulsarVentana, pedirVentanas, type VentanaEstado } from '../ventanas/bus';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { useEdit } from '../../contexts/EditContext';
import { useSettings, FontScaleKey, FONT_SCALE_LABELS } from '../../contexts/SettingsContext';
import AIAssistant from '../ai/AIAssistant';

// ============================================================================
// Layout — barra superior mínima (2026-08-05, decisión del usuario)
// ============================================================================
// Sin menú hamburguesa y sin buscador global: la marca «Humanity Wiki», dos
// destinos primarios (Mapa y Grafos) y las acciones. Todo lo demás se
// encuentra con el chat de IA de la parte inferior.

/** Todo lo que no son los dos destinos principales. */
const SECCIONES_COMUN = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/explorar', label: 'Explorar', icon: Compass },
  { to: '/mapa', label: 'Geolocalización de Datos', icon: MapIcon },
  { to: '/red', label: 'Red de Datos', icon: Globe2 },
  { to: '/base-de-datos', label: 'Base de Datos', icon: Database },
  { to: '/universo', label: 'Universo', icon: Orbit },
];
const SECCIONES_TUYO = [
  { to: '/mi-conocimiento', label: 'Mi Conocimiento', icon: BrainCircuit },
  { to: '/proyectos', label: 'Mis proyectos', icon: FolderKanban },
  { to: '/juego', label: 'Juego Vital', icon: Gamepad2 },
  { to: '/escritorio', label: 'Escritorio', icon: AppWindow },
];
const SECCIONES_PIE = [
  { to: '/vision', label: 'Visión y hoja de ruta', icon: Compass },
  { to: '/mercado', label: 'Mercado', icon: Store },
];
/** Para buscar el icono de una ventana abierta por su ruta. */
const TODAS_SECCIONES = [...SECCIONES_COMUN, ...SECCIONES_TUYO, ...SECCIONES_PIE];

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { updateCounter } = useEdit();
  const { fontScale, setFontScale } = useSettings();

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

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  // Al cambiar de página, el desplegable se cierra solo.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

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
  // Páginas de Grafos: el inicio y las fichas de grafo. Lienzo a sangre
  // completa y chat de IA como barra inferior.
  const isGrafosPage = location.pathname === '/red' || location.pathname.startsWith('/grafos');
  // /mapas (el grafo de mapas) y /universo también son lienzo a sangre con
  // la barra de IA.
  const isMapasPage = location.pathname === '/mapas';
  const isUniversoPage = location.pathname.startsWith('/universo');
  // /retos-vistas: el cruce de caminos de un reto con varias vistas (grafos).
  const isRetoVistasPage = location.pathname.startsWith('/retos-vistas');
  // Mi Conocimiento: el lienzo personal — a sangre completa y con barra de IA.
  const isMiConocimientoPage = location.pathname === '/mi-conocimiento';
  // La portada monta su propia barra de IA en línea, debajo de las ventanas.
  const isInicioPage = location.pathname === '/';
  // Juego Vital: mundo 3D a pantalla completa; el robot del juego ES el
  // asistente, así que la barra de IA vive abajo como en los lienzos.
  const isJuegoPage = location.pathname === '/juego';
  // El Escritorio son ventanas: necesita todo el alto, y trae su propio chat
  // (el que ve el navegador), así que la barra de IA de la app sobra aquí.
  const isEscritorioPage = location.pathname === '/escritorio';
  // Explorar/Mis publicaciones se fusionaron en una sola página con su propio
  // menú lateral de carpetas (2026-08-08): necesita el alto completo, no la
  // columna centrada con márgenes que llevan las páginas de lectura.
  const isExplorarPage = location.pathname === '/explorar' || location.pathname === '/mis-publicaciones';
  const fullBleed = isMapPage || isGrafosPage || isMapasPage || isUniversoPage || isRetoVistasPage || isMiConocimientoPage || isExplorarPage || isJuegoPage || isEscritorioPage;

  if (isEmbed) {
    return (
      <div className="h-screen w-full bg-white overflow-hidden relative">
        <Outlet />
        {/* El robot del juego y la barra de los lienzos SON el asistente:
            sin esto, la página dentro de una ventana del Escritorio se
            quedaría muda (2026-08-19). */}
        {(isGrafosPage || isMapasPage || isUniversoPage || isRetoVistasPage || isMiConocimientoPage || isJuegoPage) && (
          <AIAssistant mode="bar" />
        )}
      </div>
    );
  }

  /** Una entrada del menú ☰. En el ESCRITORIO no navega: abre esa sección
   *  como VENTANA (petición de Eugenio, 2026-08-19: «no están ahí por defecto,
   *  solo las que se abran al pinchar desde el menú colapsado»). En el resto
   *  de la app sigue siendo un enlace normal. La entrada del propio Escritorio
   *  siempre navega: abrirlo dentro de sí mismo sería una muñeca rusa. */
  const entradaMenu = (x: { to: string; label: string; icon: any }) => {
    const activo = location.pathname === x.to;
    const clases = cn('w-full flex items-center gap-2.5 px-4 py-2 text-sm font-bold transition-colors text-left',
      activo ? 'text-emerald-700 bg-emerald-50' : 'text-slate-700 hover:bg-slate-50');
    if (isEscritorioPage && x.to !== '/escritorio') {
      return (
        <button key={x.to} className={clases}
          onClick={() => { abrirVentana({ titulo: x.label, clase: 'app', destino: x.to }); setMenuOpen(false); }}>
          <x.icon className="w-4 h-4 shrink-0 text-slate-400" /> {x.label}
        </button>
      );
    }
    return (
      <Link key={x.to} to={x.to} className={clases}>
        <x.icon className="w-4 h-4 shrink-0 text-slate-400" /> {x.label}
      </Link>
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
                  const orden = { titulo: 'Navegador', clase: 'navegador' as const, destino: 'https://duckduckgo.com/' };
                  if (isEscritorioPage) abrirVentana(orden);
                  else {
                    localStorage.setItem('humanity:abrir-al-llegar', JSON.stringify(orden));
                    navigate('/escritorio');
                  }
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 text-left"
              >
                <Globe className="w-4 h-4 shrink-0 text-sky-600" /> Navegador
              </button>
              <div className="h-px bg-slate-100 my-1.5" />
              <p className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">El común</p>
              {SECCIONES_COMUN.map(entradaMenu)}
              <div className="h-px bg-slate-100 my-1.5" />
              <p className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Lo tuyo</p>
              {SECCIONES_TUYO.map(entradaMenu)}
              <div className="h-px bg-slate-100 my-1.5" />
              {SECCIONES_PIE.map(entradaMenu)}
              {entradaMenu({ to: '/contribuye', label: 'Contribuye', icon: Heart })}

              {/* Tu cuenta: lo que antes vivía a la derecha de la cabecera
                  (petición de Eugenio, 2026-08-20: «que no quede nada, solo
                  el logo»). */}
              <div className="h-px bg-slate-100 my-1.5" />
              <p className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Tu cuenta</p>
              {user ? (
                <>
                  {entradaMenu({ to: `/personas/${user.id}`, label: `Tu perfil (${user.roleLabel})`, icon: User })}
                  {user.isAdmin && entradaMenu({ to: '/admin/usuarios', label: 'Administrar usuarios', icon: Users2 })}
                  <div className="px-4 py-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Tamaño de letra</p>
                    <div className="flex gap-1">
                      {(Object.keys(FONT_SCALE_LABELS) as FontScaleKey[]).map(key => (
                        <button
                          key={key}
                          onClick={() => setFontScale(key)}
                          className={cn('flex-1 px-2 py-1 rounded-lg text-[11px] font-bold border transition-colors',
                            fontScale === key ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50')}
                        >
                          {FONT_SCALE_LABELS[key]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0 text-slate-400" /> Cerrar sesión
                  </button>
                </>
              ) : (
                entradaMenu({ to: '/login', label: 'Iniciar sesión', icon: User })
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
        {isEscritorioPage && ventanasAbiertas.length > 0 && (
          <div className="flex items-center gap-1 ml-1 overflow-x-auto">
            {ventanasAbiertas.map(v => {
              const Icono = v.clase === 'navegador'
                ? Globe
                : (TODAS_SECCIONES.find(sec => sec.to === v.destino)?.icon || AppWindow);
              return (
                <button
                  key={v.id}
                  onClick={() => pulsarVentana(v.id)}
                  title={v.titulo}
                  className={cn('w-8 h-8 grid place-items-center rounded-lg border shrink-0 transition-colors',
                    v.delante ? 'bg-slate-900 border-slate-900 text-white'
                      : v.minimizada ? 'bg-white border-slate-200 text-slate-300 hover:text-slate-500'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200')}
                >
                  <Icono className="w-4 h-4" />
                </button>
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
        <main key={updateCounter} className={`flex-1 flex flex-col overflow-y-auto bg-white relative min-w-0 ${fullBleed ? '' : 'p-4 sm:p-8'}`}>
          <div className={fullBleed ? 'w-full h-full' : 'max-w-7xl mx-auto w-full'}>
            <Outlet />
          </div>
        </main>
        {/* El Escritorio trae SU propio chat (el que ve el navegador), así que
            la barra global no se monta ahí: dos asistentes en la misma
            pantalla es una pregunta sin saber a cuál se la haces. */}
        {!isEscritorioPage && (
          <AIAssistant
            mode={
              isInicioPage ? 'inline'
                : isGrafosPage || isMapasPage || isUniversoPage || isRetoVistasPage || isMiConocimientoPage || isJuegoPage ? 'bar'
                  : 'dock'
            }
          />
        )}
      </div>

      {!fullBleed && (
        <footer className="h-10 border-t border-slate-100 px-4 sm:px-8 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex gap-6 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
             <span>humanity.wiki · Beta V1</span>
             <span className="hidden sm:inline">Arquitectura: Sistémica-Territorial</span>
          </div>
          <div className="flex gap-4 items-center">
             <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase hidden sm:inline">Sistema Operativo</span>
             </div>
          </div>
        </footer>
      )}
    </div>
  );
}
