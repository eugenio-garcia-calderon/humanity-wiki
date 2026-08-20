import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  User, LogOut, Heart, Settings, Check, Store, Map as MapIcon, Globe2, Orbit, Database,
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

  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  // ventana de conocimiento) sin barra superior ni asistente.
  const isEmbed = new URLSearchParams(location.search).get('embed') === '1';
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
            <div className="absolute top-11 left-0 w-64 bg-white border border-slate-200 shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {isEscritorioPage && (
                <>
                  <p className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Escritorio</p>
                  <button
                    onClick={() => { abrirVentana({ titulo: 'Navegador', clase: 'navegador', destino: 'https://es.wikipedia.org/wiki/Portada' }); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Globe className="w-4 h-4 shrink-0 text-slate-400" /> Navegador
                  </button>
                  <div className="h-px bg-slate-100 my-1.5" />
                </>
              )}
              <p className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">El común</p>
              {SECCIONES_COMUN.map(entradaMenu)}
              <div className="h-px bg-slate-100 my-1.5" />
              <p className="px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Lo tuyo</p>
              {SECCIONES_TUYO.map(entradaMenu)}
              <div className="h-px bg-slate-100 my-1.5" />
              {SECCIONES_PIE.map(entradaMenu)}
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

        {/* El único destino principal: Explorar y Mis publicaciones eran la
            misma página con un interruptor dentro (2026-08-08) — un botón
            de menú no debía apuntar a dos sitios que ya son uno.
            EN EL ESCRITORIO no se enseña (2026-08-19, petición de Eugenio:
            «comprímelo todo en el botón de las 3 líneas, y así queda todo
            arriba limpio en un solo menú»): allí arriba manda la barra de
            ventanas, y dos filas de menús compitiendo es justo lo que pidió
            quitar. Sigue estando dentro de la hamburguesa, que ya lo lleva. */}
        <nav className={cn('items-center gap-1.5 ml-1 sm:ml-4', isEscritorioPage ? 'hidden' : 'flex')}>
          <Link
            to="/explorar"
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-colors',
              isExplorarPage
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            <Compass className="w-3.5 h-3.5" /> Explorar
          </Link>
        </nav>

        <div className="flex-1" />

        {/* Acciones a la derecha. En el Escritorio se queda SOLO lo que no
            está en la hamburguesa (el ajuste de la cuenta y salir): el resto
            baja al menú para dejar la franja de arriba limpia. */}
        <div className={cn('items-center gap-2 shrink-0', isEscritorioPage ? 'hidden sm:flex' : 'flex')}>
          <Link
            to="/mercado"
            className="hidden sm:inline-flex items-center gap-1 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-[11px] px-2.5 py-1 rounded-full border border-slate-200 shadow-sm hover:shadow-md transition-all"
          >
            <Store className="w-3 h-3" />
            <span className="hidden lg:inline">Mercado</span>
          </Link>
          <Link
            to="/contribuye"
            className="hidden sm:inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-sm hover:shadow-md transition-all"
          >
            <Heart className="w-3 h-3 fill-white text-white" />
            <span className="hidden lg:inline">Contribuye</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-1.5">
              {user.isAdmin && (
                <Link
                  to="/admin/usuarios"
                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                  title="Administrar usuarios"
                >
                  <Users2 className="w-3.5 h-3.5" />
                </Link>
              )}
              <Link
                to={`/personas/${user.id}`}
                className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 hover:bg-emerald-100 transition-colors"
                title={user.email}
              >
                {user.roleLabel}
              </Link>
              <button onClick={() => { logout(); navigate('/'); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Cerrar sesión">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="flex w-6 h-6 rounded-full border border-slate-200 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-colors" title="Iniciar sesión">
              <User className="w-3.5 h-3.5" />
            </Link>
          )}

          {/* Ajustes (tamaño de letra) */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
              title="Configuración"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            {settingsOpen && (
              <div className="absolute top-9 right-0 w-52 bg-white border border-slate-200 shadow-2xl rounded-2xl py-2 z-50">
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Tamaño de letra
                </div>
                {(Object.keys(FONT_SCALE_LABELS) as FontScaleKey[]).map(key => (
                  <button
                    key={key}
                    onClick={() => setFontScale(key)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2 text-sm transition-colors font-medium",
                      fontScale === key ? "bg-emerald-50 text-emerald-700 font-bold" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {FONT_SCALE_LABELS[key]}
                    {fontScale === key && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
