import { useEffect, useRef, useState } from 'react';
import { ChevronUp, MessageCircleWarning } from 'lucide-react';
import {
  FileText, Globe2, Map as MapIcon, ListChecks, Table2, Compass, Store,
  CalendarDays, Database, Sparkles, Gamepad2, Globe,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Herramienta } from './Rail';

/*
 * EL MENÚ DE ABAJO — LAS HERRAMIENTAS, A MANO (2026-08-25, agente de APP/UX)
 * ============================================================================
 * Eugenio: «vamos a trasladar todo lo que son las herramientas para la
 * visualización y creación de contenido —mapas, páginas, grafos, archivos, todo
 * lo que no sean proyectos— fuera del menú lateral derecho, a un nuevo menú
 * inferior, donde estarán todas esas herramientas a mano. El anterior menú
 * inferior deja de tener sentido y se elimina. Tiene la misma funcionalidad que
 * el menú lateral izquierdo y el derecho: cuando se hace hover se despliega más
 * allá de los iconos, y sin hover se ven los iconos de las herramientas».
 *
 * ── QUÉ SUSTITUYE, Y POR QUÉ ES MEJOR ──────────────────────────────────────
 * Abajo había tres círculos —Explorar, Crear, Organizar— que no eran destinos:
 * eran **mandos para abrir otros menús**. Ocupaban la mejor franja de la
 * pantalla —la que alcanza el pulgar— para no enseñar nada. Ahora esa misma
 * franja lleva las once herramientas, que sí son destinos.
 *
 * ── LA REGLA QUE ORDENA LAS TRES BARRAS ────────────────────────────────────
 * Izquierda: **de qué habla** (los catorce temas).
 * Abajo:     **con qué se hace** (las herramientas).
 * Derecha:   **qué tienes** (tus proyectos).
 * Tres preguntas distintas, tres sitios distintos. Mientras esa regla se
 * respete, nadie tiene que aprenderse dónde está cada cosa: se deduce.
 *
 * ── EL ALTO ES UN CONTRATO, NO UN DETALLE ──────────────────────────────────
 * 52 px en reposo, 12 de separación del borde, **64 px reservados abajo**, y al
 * pasar el ratón crece **hacia arriba** hasta 76 sin cambiar lo reservado. Ese
 * número se publica en `--hueco-muelle`, la variable que ya usaban los tres
 * círculos y que todas las páginas leen para no esconder su última fila. Si
 * cambia, cambia debajo de todo el mundo — de ahí que esté escrito aquí y
 * acordado con quien centra la rueda de preferencias contra esa misma variable.
 * Los círculos reservaban 92; esto reserva 64, así que el contenido gana 28 px.
 */

/*
 * LAS HERRAMIENTAS DE CONTENIDO. Todo lo que sirve para VER o CREAR algo, que
 * es lo que Eugenio pidió mover. Fuera queda «Proyectos», que se va al raíl de
 * la derecha, y fuera queda lo personal —mensajes, contactos, tu perfil—, que
 * sube junto a tu foto.
 *
 * El orden no es alfabético ni el del raíl viejo: manda con qué frecuencia se
 * abre cada cosa. Publicaciones primero, porque es a donde se vuelve; las de
 * escritorio —tablas, comercio, archivos— al final.
 */
export const HERRAMIENTAS_ABAJO: Herramienta[] = [
  { clave: 'publicaciones', nombre: 'Publicaciones', icono: Compass,      ruta: '/explorar',    conPanel: true },
  { clave: 'paginas',       nombre: 'Páginas',       icono: FileText,     ruta: '/paginas',     conPanel: true },
  { clave: 'esquemas',      nombre: 'Esquemas',      icono: Globe2,       ruta: '/esquemas',    conPanel: true },
  { clave: 'mapas',         nombre: 'Mapas',         icono: MapIcon,      ruta: '/mapas',       conPanel: true },
  { clave: 'tareas',        nombre: 'Tareas',        icono: ListChecks,   ruta: '/tareas',      conPanel: true },
  { clave: 'tablas',        nombre: 'Tablas',        icono: Table2,       ruta: '/tablas',      conPanel: true },
  { clave: 'calendario',    nombre: 'Calendario',    icono: CalendarDays, ruta: '/calendario',  conPanel: true },
  { clave: 'archivos',      nombre: 'Archivos',      icono: Database,     ruta: '/archivos',    conPanel: true },
  { clave: 'comercio',      nombre: 'Comercio',      icono: Store,        ruta: '/comercio',    conPanel: true },
  // LAS TRES QUE NO ESTABAN EN NINGÚN MENÚ y sólo se abrían desde el cajetín de
  // crear. Son herramientas de contenido como las demás: aquí es su sitio.
  { clave: 'ia',            nombre: 'Asistente',     icono: Sparkles,     ruta: '/ia' },
  { clave: 'visor3d',       nombre: 'Visor 3D',      icono: Gamepad2,     ruta: '/juego' },
  { clave: 'navegador',     nombre: 'Navegador',     icono: Globe,        ruta: '/navegador' },
];

/** Lo que reserva abajo, para que ninguna página esconda su última fila. */
export const ALTO_RESERVADO = 64;

export default function RailInferior({
  abierta, onElegir, onAbrirSubmenu, fijo = false, onPasarPorEncima, onFeedback,
}: {
  /** Qué herramienta tiene su panel abierto, si hay alguno. */
  abierta: string | null;
  onElegir: (h: Herramienta) => void;
  /** La flechita: enseña lo que hay dentro sin sacarte de donde estás. */
  onAbrirSubmenu?: (h: Herramienta) => void;
  /** Desplegado y quieto, sin depender del ratón. */
  fijo?: boolean;
  onPasarPorEncima?: () => void;
  /** El botón rojo. Bajó de la barra de arriba para despejarla. */
  onFeedback: () => void;
}) {
  const [encima, setEncima] = useState(false);
  const desplegado = fijo || encima;
  const reloj = useRef<number | null>(null);

  /*
   * SE ABRE CON UN RETRASO Y SE CIERRA AL INSTANTE (los mismos 140 ms que el
   * raíl de la izquierda). Cruzar la barra de camino a otro sitio no debe
   * abrirla; pararse encima, sí. Al revés —abrir al instante y cerrar tarde—
   * la barra parpadearía cada vez que el ratón pasa por abajo.
   */
  const entrar = () => {
    if (reloj.current !== null) return;
    reloj.current = window.setTimeout(() => { reloj.current = null; setEncima(true); onPasarPorEncima?.(); }, 140);
  };
  const salir = () => {
    if (reloj.current !== null) { window.clearTimeout(reloj.current); reloj.current = null; }
    setEncima(false);
  };
  useEffect(() => () => { if (reloj.current !== null) window.clearTimeout(reloj.current); }, []);

  /*
   * QUIEN TAPA, RESERVA. Esta barra flota sobre el contenido, así que sin esto
   * la última fila de cada página queda debajo y no se puede pulsar.
   * `--hueco-muelle` ya la leen todas las pantallas —la publicaban los tres
   * círculos que esta barra sustituye—, así que se sigue publicando desde aquí
   * y ninguna página tiene que cambiar.
   */
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.style.setProperty('--hueco-muelle', `calc(${ALTO_RESERVADO}px + env(safe-area-inset-bottom))`);
    return () => { raiz.style.setProperty('--hueco-muelle', '0px'); };
  }, []);

  return (
    <div
      onMouseEnter={entrar}
      onMouseLeave={salir}
      /*
       * ANCLADO ABAJO Y CENTRADO. `bottom` fijo y el alto variable: así crece
       * hacia arriba y lo que hay debajo —lo reservado— no se mueve nunca.
       * `max-w` y no de borde a borde: pegada a los lados competiría con los
       * dos raíles laterales, que nacen justo en esos bordes.
       */
      className="pointer-events-none fixed inset-x-0 z-[9990] flex justify-center px-3"
      style={{ bottom: `calc(12px + env(safe-area-inset-bottom))` }}
    >
      <nav
        aria-label="Herramientas"
        className={cn(
          'pointer-events-auto flex max-w-full items-end gap-0.5 overflow-x-auto rounded-2xl bg-slate-900 px-2 shadow-2xl ring-1 ring-white/10 transition-all duration-200',
          desplegado ? 'py-2' : 'py-1.5',
        )}
      >
        {/* ══ FEEDBACK, AQUÍ Y EN ROJO (2026-08-25) ═══════════════════════
            Eugenio: «el feedback, mételo en la barra de herramientas inferior
            con un color distinto, que sea en rojo, que destaque. Y así también
            la liberamos de arriba».

            El rojo no es decoración: es el único botón de esta barra que no
            crea nada — sirve para decir que algo está roto. Que se distinga de
            las once herramientas es exactamente lo que hace que se encuentre el
            día que hace falta, que es un día malo. */}
        <div className="relative flex shrink-0 flex-col items-center">
          <button
            onClick={onFeedback}
            title="Lo que falla y lo que falta"
            aria-label="Feedback: lo que falla y lo que falta"
            className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-rose-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
          >
            <MessageCircleWarning className="h-5 w-5 shrink-0" />
            <span className={cn(
              'overflow-hidden whitespace-nowrap text-[10px] font-bold leading-none transition-all duration-200',
              desplegado ? 'max-h-4 opacity-100' : 'max-h-0 opacity-0',
            )}>
              Feedback
            </span>
          </button>
        </div>
        <div className="mx-1 h-8 w-px shrink-0 self-center bg-slate-700" />

        {HERRAMIENTAS_ABAJO.map(h => {
          const activa = abierta === h.clave;
          return (
            <div key={h.clave} className="relative flex shrink-0 flex-col items-center">
              <button
                onClick={() => onElegir(h)}
                title={h.nombre}
                aria-label={h.nombre}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-colors',
                  activa ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                )}
              >
                <h.icono className="h-5 w-5 shrink-0" />
                {/*
                  EL NOMBRE APARECE AL ACERCARSE, y ocupa sitio sólo entonces.
                  `max-h` y no `hidden`: con `hidden` la barra daría un salto de
                  16 px al aparecer el texto, y un menú que salta debajo del
                  ratón es un menú que se pulsa mal.
                */}
                <span className={cn(
                  'overflow-hidden whitespace-nowrap text-[10px] font-bold leading-none transition-all duration-200',
                  desplegado ? 'max-h-4 opacity-100' : 'max-h-0 opacity-0',
                )}>
                  {h.nombre}
                </span>
              </button>

              {/*
                LA FLECHITA, COMO EN LOS LATERALES (2026-08-24, decisión de
                Eugenio para los otros dos raíles): el icono lleva a la
                herramienta y la flecha enseña lo que hay dentro. Dos gestos con
                dos destinos, y ninguno ocurre por accidente. Sólo se pinta con
                la barra desplegada: en reposo no hay sitio y, sobre todo, no
                habría forma de saber cuál de los dos vas a pulsar.
              */}
              {desplegado && h.conPanel && onAbrirSubmenu && (
                <button
                  onClick={e => { e.stopPropagation(); onAbrirSubmenu(h); }}
                  title={`Ver lo que hay en ${h.nombre}`}
                  aria-label={`Ver lo que hay en ${h.nombre}`}
                  className={cn(
                    'absolute -top-1.5 right-0 grid h-4 w-4 place-items-center rounded-full transition-colors',
                    activa ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white',
                  )}
                >
                  <ChevronUp className={cn('h-3 w-3 transition-transform', activa && 'rotate-180')} />
                </button>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
