import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Heart, Settings, Check, Store, Map as MapIcon, Globe2, Orbit, Database, Home } from 'lucide-react';
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

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { updateCounter } = useEdit();
  const { fontScale, setFontScale } = useSettings();

  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const fullBleed = isMapPage || isGrafosPage || isMapasPage || isUniversoPage || isRetoVistasPage;

  if (isEmbed) {
    return (
      <div className="h-screen w-full bg-white overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      {/* Barra superior mínima: marca + Mapa/Grafos + acciones */}
      <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-3 sm:px-6 flex items-center gap-3 z-40 shrink-0 shadow-sm">
        {/* Marca */}
        <Link to="/" className="shrink-0 hover:opacity-85 transition-opacity">
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
            Humanity<span className="text-emerald-600"> Wiki</span>
          </span>
        </Link>

        {/* Destinos primarios */}
        <nav className="flex items-center gap-1.5 ml-1 sm:ml-3">
          <Link
            to="/"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              location.pathname === '/'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            <Home className="w-3.5 h-3.5" /> Inicio
          </Link>
          <Link
            to="/mapa"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              location.pathname === '/mapa'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            <MapIcon className="w-3.5 h-3.5" /> Geolocalización de Datos
          </Link>
          <Link
            to="/red"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              location.pathname === '/red' || location.pathname.startsWith('/grafos')
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            <Globe2 className="w-3.5 h-3.5" /> Red de Datos
          </Link>
          <Link
            to="/base-de-datos"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              location.pathname === '/base-de-datos'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            <Database className="w-3.5 h-3.5" /> Base de Datos
          </Link>
          <Link
            to="/universo"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
              location.pathname.startsWith('/universo')
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white shadow'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            <Orbit className="w-3.5 h-3.5" /> Universo
          </Link>
        </nav>

        <div className="flex-1" />

        {/* Acciones a la derecha */}
        <div className="flex items-center gap-2 shrink-0">
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
        <AIAssistant mode={isGrafosPage || isMapasPage || isUniversoPage || isRetoVistasPage ? 'bar' : 'dock'} />
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
