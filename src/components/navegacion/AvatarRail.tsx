import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, MessageSquare, Phone, CalendarDays, Trash2, LayoutGrid,
  Users2, Settings, LogOut, ChevronDown, UserX,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

/*
 * TU FOTO, ARRIBA DEL RAÍL DE LA DERECHA (2026-08-25, agente de APP/UX)
 * ============================================================================
 * Eugenio: «la imagen de perfil se introduce en el menú derecho, y la parte de
 * mensajería y teléfono y calendario está justo debajo de la imagen de perfil
 * cuando se hace clic, y a continuación los proyectos. Así despejamos la parte
 * de arriba, que la dejamos principalmente para la barra de buscar».
 *
 * ── POR QUÉ ESTO DESPEJA DE VERDAD ─────────────────────────────────────────
 * La barra de arriba llevaba siete cosas —feedback, mensajes, contactos,
 * calendario, campana, tu foto y su menú— y el buscador se quedaba con lo que
 * sobraba. Medido antes de tocar nada: por debajo de 1024 px el campo de
 * escribir llegaba a medir CERO. Un buscador que ocupa sitio y no acepta una
 * letra es peor que no tenerlo.
 *
 * Bajando aquí las tres de la cuenta, la barra se queda con Explorar a la
 * izquierda, Mis proyectos a la derecha y el buscador en medio, que es lo que
 * él pidió.
 *
 * ── Y POR QUÉ AQUÍ Y NO EN OTRO MENÚ ───────────────────────────────────────
 * Porque son tuyas. El raíl de la derecha ya contesta «qué tienes» —tus
 * proyectos—, y tus mensajes, tus llamadas y tus fechas son la misma pregunta.
 * Tu cara arriba del todo es el título de esa columna.
 */
export default function AvatarRail({ desplegado }: { desplegado: boolean }) {
  const { user, logout } = useAuth();
  const navegar = useNavigate();
  const location = useLocation();
  const [abierto, setAbierto] = useState(false);

  if (!user) return null;

  /*
   * LAS TRES QUE BAJARON DE LA BARRA, más lo que ya vivía en el menú de la
   * cuenta. Se pintan sólo al pulsar la foto: si estuvieran siempre, esta
   * columna dejaría de ser «tus proyectos» para ser otra lista larga.
   */
  const DEBAJO = [
    { icono: MessageSquare, nombre: 'Mensajes', ruta: '/mensajes' },
    { icono: Phone,         nombre: 'Contactos', ruta: '/telefono' },
    { icono: CalendarDays,  nombre: 'Calendario', ruta: '/calendario' },
    { icono: Users2,        nombre: 'Todas las personas', ruta: '/personas' },
    { icono: Trash2,        nombre: 'Papelera', ruta: '/explorar?papelera=1' },
    { icono: LayoutGrid,    nombre: 'Tu portada', ruta: '/explorar?portada=1' },
    { icono: User,          nombre: 'Mi perfil', ruta: `/personas/${user.id}` },
    { icono: Settings,      nombre: 'Configuración', ruta: '/configuracion' },
    /*
     * BORRAR TU CUENTA, AQUÍ Y NO EN EL DESPLEGABLE DE INFORMACIÓN
     * (2026-08-25). Eugenio: «ponlo mejor en el apartado de Configuración de
     * cuenta, debajo del icono de usuario». Estaba entre las páginas que
     * EXPLICAN la plataforma, y esto no explica nada: hace algo con tu cuenta,
     * y además algo irreversible. Va detrás de Configuración porque es la
     * última cosa que se hace con una cuenta.
     *
     * La dirección `/borrar-cuenta` NO se ha movido: está pegada en la ficha de
     * Google Play, y cambiarla obligaría a pasar revisión otra vez. Lo que ha
     * cambiado es desde dónde se llega.
     */
    { icono: UserX,         nombre: 'Borrar tu cuenta', ruta: '/borrar-cuenta' },
  ];

  return (
    <div className="shrink-0 border-b border-slate-200 pb-1">
      <button
        onClick={() => setAbierto(a => !a)}
        title={user.displayName || user.email}
        aria-label="Tu cuenta"
        aria-expanded={abierto}
        className={cn('mb-1 flex h-11 items-center gap-2 rounded-xl px-1.5 transition-colors hover:bg-slate-100',
          desplegado ? 'w-full' : 'w-10 justify-center')}
      >
        {user.avatarUrl
          ? <img src={user.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
          : <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-black text-slate-500">
              {(user.displayName || user.email || '?').trim().charAt(0).toUpperCase()}
            </span>}
        {/* El nombre sólo cuando la columna está desplegada, como el resto del
            raíl: en reposo esto son iconos, y una cara ya dice de quién es. */}
        {desplegado && (
          <>
            <span className="min-w-0 flex-1 truncate text-left text-[12px] font-black text-slate-800">
              {user.displayName || user.email}
            </span>
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', abierto && 'rotate-180')} />
          </>
        )}
      </button>

      {abierto && DEBAJO.map(e => {
        const aqui = location.pathname === e.ruta.split('?')[0];
        return (
          <button
            key={e.nombre}
            onClick={() => { setAbierto(false); navegar(e.ruta); }}
            title={e.nombre}
            aria-label={e.nombre}
            className={cn('flex h-9 items-center gap-3 rounded-xl px-[10px] transition-colors',
              desplegado ? 'w-full' : 'w-10 justify-center',
              aqui ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900')}
          >
            <e.icono className="h-4 w-4 shrink-0" />
            <span className={cn('overflow-hidden whitespace-nowrap text-left text-[12px] font-bold transition-all duration-200',
              desplegado ? 'w-auto opacity-100' : 'w-0 opacity-0')}>
              {e.nombre}
            </span>
          </button>
        );
      })}

      {abierto && (
        <button
          onClick={() => { setAbierto(false); logout(); navegar('/'); }}
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className={cn('flex h-9 items-center gap-3 rounded-xl px-[10px] text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600',
            desplegado ? 'w-full' : 'w-10 justify-center')}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className={cn('overflow-hidden whitespace-nowrap text-left text-[12px] font-bold transition-all duration-200',
            desplegado ? 'w-auto opacity-100' : 'w-0 opacity-0')}>
            Cerrar sesión
          </span>
        </button>
      )}
    </div>
  );
}
