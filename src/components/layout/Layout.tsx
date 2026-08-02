import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, User, LogOut, Heart } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { useEdit } from '../../contexts/EditContext';
import { ChatAssistant } from '../ui/ChatAssistant';

export default function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { updateCounter } = useEdit();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Mapa', path: '/' },
    { name: 'Objetivos', path: '/objetivos' },
    { name: 'Indicadores', path: '/indicadores' },
    { name: 'Retos', path: '/retos' },
    { name: 'Soluciones', path: '/soluciones' },
    { name: 'Territorios', path: '/territorios' },
    { name: 'Proyectos', path: '/proyectos' },
    { name: 'Organizaciones', path: '/organizaciones' },
    { name: 'Sobre Red Humana', path: '/sobre-red-humana' },
    { name: 'Contribuye', path: '/contribuye' }
  ];

  if (user) {
    navItems.push({ name: 'Diseño', path: '/admin/design' });
  }

  const isMapPage = location.pathname === '/' || location.pathname === '/mapa';

  return (
    <div className="flex flex-col h-screen w-full bg-white text-slate-900 font-sans overflow-hidden">
      {/* Main Content View */}
      <main key={updateCounter} className={`flex-1 flex flex-col overflow-y-auto bg-white relative ${isMapPage ? '' : 'p-4 sm:p-8'}`}>
        <div className={isMapPage ? 'w-full h-full' : 'max-w-7xl mx-auto w-full'}>
          <Outlet />
        </div>
      </main>

      {!isMapPage && (
        <footer className="h-10 border-t border-slate-100 px-4 sm:px-8 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex gap-6 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
             <span>Versión MVP 0.1</span>
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

      {/* Compact Bottom Navigation Bar */}
      <nav className="h-11 border-t border-slate-200/80 bg-white/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-[0_-1px_6px_rgba(0,0,0,0.05)] relative">
        {/* Left: Menu Toggle */}
        <div className="flex items-center gap-2 w-1/4">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
              title="Menú principal"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden md:inline text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Menú</span>
            </button>
            {menuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-56 bg-white border border-slate-200 shadow-2xl rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
        </div>

        {/* Center: Brand Name */}
        <div className="w-2/4 text-center">
          <Link to="/" className="inline-block hover:opacity-85 transition-opacity">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900">
              Red Humana
            </span>
          </Link>
        </div>

        {/* Right: Contribuye Button & User Actions */}
        <div className="flex items-center justify-end gap-2 w-1/4">
          <Link
            to="/contribuye"
            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-[11px] px-2.5 py-1 rounded-full shadow-sm hover:shadow-md transition-all shrink-0"
          >
            <Heart className="w-3 h-3 fill-white text-white" />
            <span className="hidden sm:inline">Contribuye</span>
          </Link>

          {user ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60">Admin</span>
              <button onClick={() => { logout(); navigate('/'); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors" title="Cerrar sesión">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link to="/login" className="hidden sm:flex w-6 h-6 rounded-full border border-slate-200 items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-emerald-600 transition-colors" title="Acceso Admin">
              <User className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </nav>

      <ChatAssistant />
    </div>
  );
}
