import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home, FolderKanban, FileText, Globe2, Map as MapIcon, ListChecks, Table2,
  Compass, Store, Sparkles, CalendarDays, Database, Gamepad2, Globe,
  Layers, Users2, MessageSquare, Phone, User, Pin, PanelLeftClose,
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
  { clave: 'esquemas',     nombre: 'Esquemas',      icono: Globe2,       ruta: '/esquemas' , conPanel: true },
  { clave: 'mapas',        nombre: 'Mapas',         icono: MapIcon,      ruta: '/mapas' , conPanel: true },
  { clave: 'tareas',       nombre: 'Tareas',        icono: ListChecks,   ruta: '/tareas' , conPanel: true },
  { clave: 'tablas',       nombre: 'Tablas',        icono: Table2,       ruta: '/tablas' , conPanel: true },
  { clave: 'publicaciones', nombre: 'Publicaciones', icono: Compass,     ruta: '/explorar' , conPanel: true },
  { clave: 'comercio',     nombre: 'Comercio',      icono: Store,        ruta: '/comercio' , conPanel: true },
  { clave: 'ia',           nombre: 'Asistente',     icono: Sparkles,     ruta: '/ia' , conPanel: true },
  { clave: 'calendario',   nombre: 'Calendario',    icono: CalendarDays, ruta: '/calendario' , conPanel: true },
  { clave: 'archivos',     nombre: 'Archivos',      icono: Database,     ruta: '/archivos' , conPanel: true },
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

export default function Rail({ abierta, onElegir, onInicio, siempreAbierto = false }: {
  /** Qué herramienta tiene el panel abierto, si hay alguno. */
  abierta: string | null;
  onElegir: (h: Herramienta) => void;
  onInicio: () => void;
  /**
   * EN MÓVIL EL RAÍL VA SIEMPRE DESPLEGADO (2026-08-23).
   *
   * Eugenio: «¿por qué en versión móvil no está?». No estaba porque lo monté
   * sólo en escritorio: implementé la mitad de lo que él había decidido —el
   * panel a pantalla completa— y me dejé la otra mitad, que es cómo se llega
   * a ese panel.
   *
   * Y va desplegado, no en iconos, porque **en un móvil no hay ratón**: el raíl
   * de iconos funciona en escritorio precisamente porque puedes pasar por
   * encima y leer los nombres sin comprometerte. Sin esa posibilidad, trece
   * iconos sin texto son trece adivinanzas. Aquí ocupa el cajón entero, que es
   * el sitio donde ya estaba el menú de siempre.
   */
  siempreAbierto?: boolean;
}) {
  const navigate = useNavigate();

  /*
   * ABRIRSE AL PASAR EL RATÓN, Y QUEDARSE ABIERTO SI SE FIJA (2026-08-23).
   *
   * Eugenio: «si haces hover el menú lateral con fondo negro se tiene que
   * abrir, también si pulsas el botón de expansión se debe quedar abierto y
   * desplegado sin hover».
   *
   * LA PRIMERA VERSIÓN NO LO HACÍA, y fue decisión mía escrita en un comentario:
   * un raíl que se ensancha empuja la página entera cada vez que el ratón lo
   * roza de camino a otro sitio. **El problema era real y la solución era
   * equivocada.** Quitarle el hover resolvía el empujón cargándose lo que hace
   * útil un raíl de iconos: que puedas leer los nombres sin comprometerte.
   *
   * LO QUE SÍ LO RESUELVE: separar el ANCHO QUE OCUPA del ANCHO QUE SE VE.
   *
   *   · Con el ratón encima → el raíl se despliega **por encima** del contenido.
   *     El hueco que ocupa sigue siendo de 56 px, así que la página no se mueve.
   *   · Fijado con el botón → ocupa de verdad los 224 px y **empuja** el
   *     contenido, que es lo que quieres cuando has decidido tenerlo abierto.
   *
   * Un caso es mirar y el otro es quedarse, y por eso no se comportan igual.
   *
   * SE RECUERDA ENTRE VISITAS. Fijar el menú es una preferencia sobre cómo
   * trabajas, no algo que se decida cada mañana. En `localStorage` y no en el
   * servidor a propósito: depende de la pantalla que tengas delante, y la del
   * portátil y la del monitor grande no piden lo mismo.
   */
  const [fijado, setFijado] = useState(() => {
    try { return localStorage.getItem('hw_rail_fijado') === '1'; } catch { return false; }
  });
  const [encima, setEncima] = useState(false);
  const desplegado = siempreAbierto || fijado || encima;

  const fijar = () => {
    setFijado(v => {
      const n = !v;
      try { localStorage.setItem('hw_rail_fijado', n ? '1' : '0'); } catch { /* modo privado */ }
      return n;
    });
  };

  const boton = (h: Herramienta) => {
    const Icono = h.icono;
    const activa = abierta === h.clave;
    return (
      <button
        key={h.clave}
        onClick={() => (h.conPanel ? onElegir(h) : h.ruta.startsWith('/') ? navigate(h.ruta) : onElegir(h))}
        title={desplegado ? undefined : h.nombre}
        aria-label={h.nombre}
        aria-current={activa ? 'true' : undefined}
        className={cn(
          // 40 px de alto: por debajo de eso este proyecto ya tiene catalogado
          // que los botones dejan de acertarse con el dedo.
          'relative flex h-10 shrink-0 items-center gap-3 rounded-xl px-[10px] transition-colors',
          desplegado ? 'w-full' : 'w-10 justify-center',
          activa ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white',
        )}
      >
        {/* La marca de «aquí estás» es una barra a la izquierda, no un fondo
            distinto: el fondo ya lo usa el ratón al pasar por encima, y dos
            cosas que se pintan igual dejan de significar. */}
        {activa && <span className="absolute left-0 top-2 h-6 w-0.5 rounded-r bg-emerald-400" />}
        <Icono className="h-5 w-5 shrink-0" />
        {/* El nombre NO se desmonta al plegar: se hace transparente y se le
            quita el ancho. Desmontarlo hace que el texto aparezca de golpe al
            final de la animación en vez de acompañarla. */}
        <span className={cn(
          'overflow-hidden whitespace-nowrap text-left text-[13px] font-bold transition-all duration-200',
          desplegado ? 'w-auto opacity-100' : 'w-0 opacity-0',
        )}>
          {h.nombre}
        </span>
      </button>
    );
  };

  return (
    // El HUECO. Mide 56 px salvo que esté fijado: es lo que decide si el raíl
    // empuja el contenido o se le pone encima.
    <div className={cn('relative h-full shrink-0 transition-[width] duration-200',
      siempreAbierto ? 'w-64' : fijado ? 'w-56' : 'w-14')}>
      <nav
        aria-label="Herramientas"
        onMouseEnter={() => setEncima(true)}
        onMouseLeave={() => setEncima(false)}
        className={cn(
          // z-50, POR ENCIMA DE LA BARRA SUPERIOR (2026-08-23). La barra
          // también es z-40 y va después en el documento, así que al
          // desplegarse el raíl por encima del contenido, la barra le tapaba
          // los primeros 40 px: el nombre salía cortado y **el botón de fijar
          // no se veía**, o sea que la mitad de lo que Eugenio pidió existía y
          // no se podía usar. Se ve mirando, no compilando.
          'absolute left-0 top-0 z-50 flex h-full flex-col gap-0.5 overflow-y-auto overflow-x-hidden',
          'border-r border-slate-800 bg-slate-950 px-2 py-2 transition-[width] duration-200',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          siempreAbierto ? 'w-64' : desplegado ? 'w-56' : 'w-14',
          // La sombra sólo cuando está flotando por encima: fijado forma parte
          // de la página y una sombra ahí lo despegaría de ella sin motivo.
          !fijado && encima && 'shadow-2xl shadow-black/40',
        )}
      >
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onInicio}
            title="Inicio"
            aria-label="Inicio"
            className={cn(
              'flex h-10 items-center gap-3 rounded-xl px-[10px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white',
              desplegado ? 'flex-1' : 'w-10 justify-center',
            )}
          >
            <Home className="h-5 w-5 shrink-0" />
            <span className={cn(
              'overflow-hidden whitespace-nowrap text-[13px] font-black transition-all duration-200',
              desplegado ? 'w-auto opacity-100' : 'w-0 opacity-0',
            )}>
              humanity.wiki
            </span>
          </button>

          {/* EL BOTÓN DE FIJAR. Sólo existe desplegado, y es a propósito: es la
              acción de «quédate así», y plegado no hay ningún «así» que
              mantener. Aparece con el hover, que es cuando la mano ya está ahí. */}
          {/* La chincheta no existe en móvil: no hay nada que fijar cuando ya
              está siempre abierto. */}
          {desplegado && !siempreAbierto && (
            <button
              onClick={fijar}
              title={fijado ? 'Soltar el menú' : 'Dejar el menú abierto'}
              aria-label={fijado ? 'Soltar el menú' : 'Dejar el menú abierto'}
              aria-pressed={fijado}
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
                fijado ? 'bg-slate-800 text-emerald-400' : 'text-slate-500 hover:bg-slate-800 hover:text-white',
              )}
            >
              {fijado ? <PanelLeftClose className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          )}
        </div>

        <div className="my-1 h-px shrink-0 bg-slate-800" />

        {HERRAMIENTAS.map(boton)}
        <div className="my-1 h-px shrink-0 bg-slate-800" />
        {PERSONALES.map(boton)}
      </nav>
    </div>
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
