import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, Heart, Settings, Check, Store } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { useEdit } from '../../contexts/EditContext';
import { useSettings, FontScaleKey, FONT_SCALE_LABELS } from '../../contexts/SettingsContext';
import AIAssistant from '../ai/AIAssistant';
import GlobalSearch from '../ui/GlobalSearch';

// ============================================================================
// Layout — reestructuración Fase 11 (2026-08-05, decisión del usuario)
// ============================================================================
// El menú pasa ARRIBA en toda la aplicación, fusionado con el buscador global
// y los ajustes en una sola barra superior. La barra inferior desaparece: en
// las páginas de Grafos de Conocimiento (el nuevo inicio), abajo vive el
// chat/buscador de IA siempre desplegado; en el resto, el asistente sigue
// siendo el panel acoplado a la derecha.

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { updateCounter } = useEdit();
  const { fontScale, setFontScale } = useSettings();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Grafos de Conocimiento', path: '/' },
    { name: 'Mapa', path: '/mapa' },
    { name: 'Muro', path: '/muro' },
    { name: 'Objetivos', path: '/objetivos' },
    { name: 'Indicadores', path: '/indicadores' },
    { name: 'Retos', path: '/retos' },
    { name: 'Soluciones', path: '/soluciones' },
    { name: 'Territorios', path: '/territorios' },
    { name: 'Proyectos', path: '/proyectos' },
    { name: 'Organizaciones', path: '/organizaciones' },
    { name: 'Sobre la plataforma', path: '/sobre-red-humana' },
    { name: 'Contribuye', path: '/contribuye' }
  ];

  if (user) {
    navItems.push({ name: 'Diseño', path: '/admin/design' });
  }

  // Modo embed: la app se incrusta a sí misma (p. ej. el mapa dentro de una
  // ventana de conocimiento) sin barra superior ni asistente.
  const isEmbed = new URLSearchParams(location.search).get('embed') === '1';
  const isMapPage = location.pathname === '/mapa';
  // Páginas de Grafos: el inicio y las fichas de grafo. Lienzo a sangre
  // completa y chat de IA como barra inferior.
  const isGrafosPage = location.pathname === '/' || location.pathname.startsWith('/grafos');
  const fullBleed = isMapPage || isGrafosPage;

  if (isEmbed) {
    return (
      <div className="h-screen w-full bg-white overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      {/* Barra superior única: menú + marca + buscador global + acciones */}
      <header className="h-14 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-3 sm:px-6 flex items-center gap-3 z-40 shrink-0 shadow-sm">
        {/* Menú */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
            title="Menú principal"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden md:inline text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Menú</span>
          </button>
          {menuOpen && (
            <div className="absolute top-full left-0 mt-2 w-60 bg-white border border-slate-200 shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Navegación
              </div>
              {navItems.map(item => {
                const isActive = location.pathname === item.path || location.pathname + location.search === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block px-4 py-2.5 text-sm transition-colors font-medium",
                      isActive ? "bg-emerald-50 text-emerald-700 font-bold" : "text-slate-700 hover:bg-slate-50 hover:text-emerald-600"
                    )}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Marca */}
        <Link to="/" className="shrink-0 hover:opacity-85 transition-opacity">
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
            humanity<span className="text-emerald-600">.wiki</span>
          </span>
        </Link>

        {/* Buscador global centrado */}
        <div className="flex-1 flex justify-center min-w-0">
          <GlobalSearch />
        </div>

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
        <AIAssistant mode={isGrafosPage ? 'bar' : 'dock'} />
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
