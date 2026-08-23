import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, FolderKanban, FileText, Globe2, Map as MapIcon, ListChecks, Table2,
  Compass, Store, Sparkles, CalendarDays, Database, Gamepad2, Globe,
  Layers, Users2, MessageSquare, Phone, User,
} from 'lucide-react';
import { cn } from '../../utils/cn';

/*
 * EL RAÍL (2026-08-23, agente de APP/UX)
 * ============================================================================
 * Encargo de Eugenio: «un menú lateral izquierdo como el de Kpler, con un fondo
 * negro y letras blancas, y cuando se haga click en alguno de esos elementos
 * del menú entonces éste se contrae y solo se ven los iconos y se expande el
 * submenú de forma lateral, esta vez con fondo blanco y letras negras».
 *
 * DOS PIEZAS Y CADA UNA HACE UNA COSA. El raíl dice DÓNDE ESTÁS y a qué
 * herramienta puedes ir: es corto, oscuro y no cambia nunca. El panel de al
 * lado dice QUÉ HAY DENTRO de la que has elegido: es claro, cambia con cada
 * herramienta y es donde se trabaja.
 *
 * Esa separación es la razón de los dos colores, y no un adorno. El oscuro es
 * el marco de la aplicación —siempre igual, siempre ahí—; el claro es papel, y
 * en papel se lee y se pulsa. Mezclarlos haría que la lista de tus proyectos
 * pareciera parte del armazón, cuando es tu contenido.
 *
 * SIEMPRE EN ICONOS. En Kpler el raíl se ensancha al pasar el ratón; aquí no,
 * a propósito. El nombre de la herramienta ya sale en el panel en cuanto la
 * pulsas, y un raíl que se ensancha empuja la página entera cada vez que el
 * ratón lo roza de camino a otro sitio.
 *
 * EL ORDEN NO ES CASUAL: primero lo que casi todo el mundo abre (proyectos,
 * páginas, esquemas, mapas), y al final lo que se usa de vez en cuando. En una
 * columna de iconos, el sitio de arriba es el único que se recuerda sin mirar.
 */

export interface Herramienta {
  clave: string;
  nombre: string;
  icono: any;
  /** A dónde va si la herramienta no tiene panel propio todavía. */
  ruta: string;
  /** Si tiene panel, al pulsarla se abre en vez de navegar. */
  conPanel?: boolean;
}

export const HERRAMIENTAS: Herramienta[] = [
  { clave: 'proyectos',    nombre: 'Proyectos',     icono: FolderKanban, ruta: '/proyectos',    conPanel: true },
  { clave: 'paginas',      nombre: 'Páginas',       icono: FileText,     ruta: '/paginas',      conPanel: true },
  { clave: 'esquemas',     nombre: 'Esquemas',      icono: Globe2,       ruta: '/esquemas' },
  { clave: 'mapas',        nombre: 'Mapas',         icono: MapIcon,      ruta: '/mapas' },
  { clave: 'tareas',       nombre: 'Tareas',        icono: ListChecks,   ruta: '/tareas' },
  { clave: 'tablas',       nombre: 'Tablas',        icono: Table2,       ruta: '/tablas' },
  { clave: 'publicaciones', nombre: 'Publicaciones', icono: Compass,     ruta: '/explorar' },
  { clave: 'comercio',     nombre: 'Comercio',      icono: Store,        ruta: '/comercio' },
  { clave: 'ia',           nombre: 'Asistente',     icono: Sparkles,     ruta: '/ia' },
  { clave: 'calendario',   nombre: 'Calendario',    icono: CalendarDays, ruta: '/calendario' },
  { clave: 'archivos',     nombre: 'Archivos',      icono: Database,     ruta: '/archivos' },
  { clave: 'mundo',        nombre: 'Visor 3D',      icono: Gamepad2,     ruta: '/juego' },
  { clave: 'navegador',    nombre: 'Navegador',     icono: Globe,        ruta: 'about:inicio' },
];

/*
 * EL SEGUNDO GRUPO: TÚ Y LA GENTE.
 *
 * Va separado por una línea porque no son herramientas: son las personas y tu
 * cuenta. Mezclarlos con las trece de arriba haría que «Mensajes» pareciera una
 * herramienta más de trabajo, y no lo es.
 *
 * ESTÁ AQUÍ PORQUE EL RAÍL SUSTITUYE AL MENÚ DE SIEMPRE, y ese menú tenía estas
 * cuatro entradas más las Áreas. Si el raíl no las lleva, **dejan de existir
 * para quien no se sepa la dirección de memoria** — que es la forma más silenciosa
 * de romper una aplicación al rediseñar su navegación: no falla nada, solo deja
 * de haber camino.
 */
export const PERSONALES: Herramienta[] = [
  { clave: 'areas',     nombre: 'Áreas',            icono: Layers,         ruta: '/objetivos' },
  { clave: 'personas',  nombre: 'Todas las personas', icono: Users2,       ruta: '/personas' },
  { clave: 'mensajes',  nombre: 'Mensajes',         icono: MessageSquare,  ruta: '/mensajes' },
  { clave: 'telefono',  nombre: 'Teléfono',         icono: Phone,          ruta: '/telefono' },
  { clave: 'perfil',    nombre: 'Mi perfil',        icono: User,           ruta: '/persona/yo' },
];

export default function Rail({ abierta, onElegir, onInicio }: {
  /** Qué herramienta tiene el panel abierto, si hay alguno. */
  abierta: string | null;
  onElegir: (h: Herramienta) => void;
  onInicio: () => void;
}) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label="Herramientas"
      className="flex h-full w-14 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-r border-slate-800 bg-slate-950 py-2
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {/* La marca es también el botón de inicio: es lo que la gente ya espera
          de un logo arriba a la izquierda, y aquí además es la única salida
          hacia la portada desde una herramienta abierta. */}
      <button
        onClick={onInicio}
        title="Inicio"
        aria-label="Inicio"
        className="mb-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        <Home className="h-5 w-5" />
      </button>

      <div className="mb-1 h-px w-7 shrink-0 bg-slate-800" />

      {[...HERRAMIENTAS, null, ...PERSONALES].map((h, i) => {
        if (h === null) return <div key="sep" className="my-1 h-px w-7 shrink-0 bg-slate-800" />;
        void i;
        const Icono = h.icono;
        const activa = abierta === h.clave;
        return (
          <button
            key={h.clave}
            onClick={() => (h.conPanel ? onElegir(h) : h.ruta.startsWith('/') ? navigate(h.ruta) : onElegir(h))}
            title={h.nombre}
            aria-label={h.nombre}
            aria-current={activa ? 'true' : undefined}
            className={cn(
              // 40 px: por debajo de eso este proyecto ya tiene catalogado que
              // los botones dejan de acertarse con el dedo.
              'relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors',
              activa ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white',
            )}
          >
            {/* La marca de «aquí estás» es una barra a la izquierda, no un
                fondo distinto: el fondo ya lo usa el ratón al pasar por encima,
                y dos cosas que se pintan igual dejan de significar. */}
            {activa && <span className="absolute left-0 top-2 h-6 w-0.5 rounded-r bg-emerald-400" />}
            <Icono className="h-5 w-5" />
          </button>
        );
      })}
    </nav>
  );
}

/** El enlace de una hoja del panel. Aquí porque lo usan los dos paneles. */
export function HojaPanel({ a, children, icono: Icono, insignia }: {
  a: string; children: any; icono?: any; insignia?: string | number;
}) {
  return (
    <NavLink
      to={a}
      className={({ isActive }) => cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors',
        isActive ? 'bg-emerald-50 font-bold text-emerald-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
      )}
    >
      {Icono && <Icono className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {insignia !== undefined && insignia !== '' && (
        <span className="shrink-0 text-[10px] font-bold text-slate-300">{insignia}</span>
      )}
    </NavLink>
  );
}
