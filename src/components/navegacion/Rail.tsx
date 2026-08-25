import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home, FolderKanban, FileText, Globe2, Map as MapIcon, ListChecks, Table2,
  Compass, Store, Sparkles, CalendarDays, Database, Gamepad2, Globe,
  Layers, Users2, MessageSquare, Phone, User, Pin, PanelLeftClose, PanelRightClose,
  ChevronLeft, ChevronRight, Trash2, LayoutGrid, Star, EyeOff, MoreVertical, GripVertical,
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
  /** Su color, cuando lo tiene. Los catorce temas lo traen del mapa. */
  color?: string;
  /** A dónde va si la herramienta no tiene panel propio todavía. */
  ruta: string;
  /** Si tiene panel, al pulsarla se abre en vez de navegar. */
  conPanel?: boolean;
}

/*
 * LO TUYO — EL MENÚ DE LA DERECHA (2026-08-24)
 * ---------------------------------------------------------------------------
 * Eugenio: «el menú lateral derecho tiene que ser de los proyectos y
 * publicaciones propias, no de las herramientas. Elimina el link a las
 * herramientas desde ese menú, y haz que se acceda a las herramientas desde el
 * botón crear».
 *
 * La separación es la que hacía falta: **una herramienta es algo que se USA y
 * un proyecto es algo que se TIENE**. Este menú contesta «¿qué tengo?»; el
 * botón de Crear contesta «¿qué quiero hacer?». Mezclarlos obligaba a leer
 * trece nombres para encontrar tus dos proyectos.
 *
 * Se han ido de aquí el **Asistente**, el **Visor 3D** y el **Navegador**: son
 * herramientas puras, no producen nada que sea tuyo y esté en una lista. Se
 * abren desde el botón del centro.
 */
export const HERRAMIENTAS: Herramienta[] = [
  { clave: 'proyectos',    nombre: 'Proyectos',     icono: FolderKanban, ruta: '/proyectos',    conPanel: true },
  { clave: 'paginas',      nombre: 'Páginas',       icono: FileText,     ruta: '/paginas',      conPanel: true },
  { clave: 'esquemas',     nombre: 'Esquemas',      icono: Globe2,       ruta: '/esquemas' , conPanel: true },
  { clave: 'mapas',        nombre: 'Mapas',         icono: MapIcon,      ruta: '/mapas' , conPanel: true },
  { clave: 'tareas',       nombre: 'Tareas',        icono: ListChecks,   ruta: '/tareas' , conPanel: true },
  { clave: 'tablas',       nombre: 'Tablas',        icono: Table2,       ruta: '/tablas' , conPanel: true },
  { clave: 'publicaciones', nombre: 'Publicaciones', icono: Compass,     ruta: '/explorar' , conPanel: true },
  { clave: 'comercio',     nombre: 'Comercio',      icono: Store,        ruta: '/comercio' , conPanel: true },
  { clave: 'calendario',   nombre: 'Calendario',    icono: CalendarDays, ruta: '/calendario' , conPanel: true },
  { clave: 'archivos',     nombre: 'Archivos',      icono: Database,     ruta: '/archivos' , conPanel: true },
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
  // CONTACTOS, NO «TELÉFONO» (2026-08-24, Eugenio: «antes era Teléfono,
  // llámalo contactos a partir de ahora»). Es mejor nombre: un teléfono es el
  // aparato y lo que hay dentro son personas.
  { clave: 'contactos', nombre: 'Contactos',        icono: Phone,          ruta: '/telefono' },
  { clave: 'perfil',    nombre: 'Mi perfil',        icono: User,           ruta: '/persona/yo' },
  /*
   * LAS DOS QUE BAJARON DE LA BARRA DE LA PORTADA (2026-08-24). Al vaciar la
   * parte de arriba de «Explorar» —petición de Eugenio— la papelera y el
   * personalizador se quedaban sin ningún botón que los abriera. Aquí es su
   * sitio natural: las dos son sobre lo tuyo, que es de lo que va este menú.
   * Van por dirección (`?papelera=1`, `?portada=1`) y no por un evento, para
   * que además se puedan guardar en favoritos y compartir.
   */
  { clave: 'papelera',  nombre: 'Papelera',         icono: Trash2,         ruta: '/explorar?papelera=1' },
  { clave: 'portada',   nombre: 'Tu portada',       icono: LayoutGrid,     ruta: '/explorar?portada=1' },
];

export default function Rail({
  abierta, onElegir, onInicio, siempreAbierto = false, ladoDerecho = false,
  items, titulo = 'Red de Conocimiento', claro = false, onAbrirSubmenu, onPlegar,
  personal,
}: {
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
  /**
   * EL RAÍL, PEGADO AL BORDE DERECHO (2026-08-23).
   *
   * Eugenio movió «lo tuyo» a la derecha: «coger exactamente ese mismo menú que
   * ahora mismo está a la izquierda y ponerlo a la derecha, con la misma
   * lógica». Es este mismo componente con tres cosas del revés —el borde, el
   * lado por el que se despliega y la barra de «aquí estás»—, no una copia
   * espejada. Dos raíles serían dos sitios donde arreglar el mismo fallo.
   */
  ladoDerecho?: boolean;
  /**
   * QUÉ LISTA PINTA (2026-08-23). Por defecto las herramientas —el raíl de la
   * derecha—. «Explorar» le pasa los catorce objetivos.
   *
   * Eugenio: «haz que el menú de la izquierda tenga también ese fondo negro…
   * y así tenemos como en un espejo ambos menús igual de diseñados, solo que
   * uno está a la izquierda y otro a la derecha».
   *
   * ES EL MISMO COMPONENTE, no dos parecidos. Un segundo raíl «igual pero para
   * objetivos» sería igual el día que se escribe y distinto al mes siguiente:
   * la primera corrección de sombra, de ancho o de accesibilidad entraría en
   * uno solo, y ahí el espejo deja de serlo.
   */
  items?: Herramienta[];
  titulo?: string;
  /**
   * FONDO BLANCO (2026-08-24). Eugenio, para el menú de la derecha: «ponle el
   * fondo blanco». Es el mismo componente con otra piel — no un segundo raíl —
   * por lo mismo de siempre: dos que se parecen empiezan iguales y acaban
   * distintos en la primera corrección que entra sólo en uno.
   */
  claro?: boolean;
  /**
   * EL SUBMENÚ SE ABRE CON LA FLECHITA, NO PASANDO EL RATÓN (2026-08-24).
   *
   * Eugenio: «que el submenú no se despliegue con HOVER, sino que haya que
   * hacer click en una flechita lateral que estará al lado de cada elemento del
   * menú para que se abra el submenú lateral».
   *
   * ── POR QUÉ ESTO ES MEJOR, Y NO SÓLO DISTINTO ─────────────────────────────
   * Antes el submenú salía al pasar el ratón por encima de un elemento. Con
   * catorce elementos en columna, bajar la lista para llegar al último es pasar
   * por trece: trece paneles abriéndose y cerrándose por el camino, cada uno
   * pidiendo sus datos. La espera de 140 ms tapaba lo peor, pero el gesto
   * seguía estando mal repartido: **mirar la lista** disparaba **abrir cosas**.
   *
   * Ahora hay dos gestos con dos destinos, y se ven los dos:
   *
   *   · el NOMBRE te lleva a esa herramienta o a ese tema;
   *   · la FLECHITA de al lado abre su submenú al lado, sin moverte.
   *
   * Y ninguno de los dos ocurre por accidente.
   *
   * La flecha apunta hacia donde va a salir el panel —a la derecha en el raíl
   * izquierdo, a la izquierda en el derecho— y se gira cuando ya está abierto,
   * porque entonces lo que hace es cerrarlo.
   */
  onAbrirSubmenu?: (h: Herramienta) => void;
  /**
   * PLEGARSE (2026-08-24). Eugenio: «permite que ambos menús, el de la derecha
   * y la izquierda, tengan el botón de volverse a plegar cuando se despliegan».
   *
   * El raíl sabe deshacer lo suyo —quitar la chincheta— pero no sabe deshacer
   * lo de fuera: cuando está abierto porque se ha pulsado un círculo de abajo,
   * el que tiene que enterarse es quien guarda ese estado. Por eso el botón
   * está aquí y la consecuencia la decide el Layout.
   */
  onPlegar?: () => void;
  /*
   * ══ EL MENÚ DE CADA UNO (2026-08-25) ══════════════════════════════════════
   * Eugenio: «haz que el menú izquierdo, donde están todas las temáticas, el
   * usuario lo pueda reordenar y pueda darle a un botón de favorito… no se le
   * puede dar a favorito en los tres puntos que tienes que añadir para poder
   * modificar cada uno de estos temas, porque igual hay algún tema que el
   * usuario quiere ocultar».
   *
   * Son dos gestos y por eso son dos sitios, exactamente como los pidió:
   *
   *   · la ESTRELLA sale al pasar el ratón y hace una sola cosa. Marcar
   *     favorito es lo que se hace a menudo y de un vistazo; esconderlo detrás
   *     de un menú costaría dos pulsaciones para algo de una;
   *   · los TRES PUNTOS abren lo demás — ocultar, y lo que venga después.
   *     Ahí va lo que se hace una vez y se piensa antes.
   *
   * Sólo lo lleva el menú de los temas. En el de las herramientas no tendría
   * sentido: sus trece entradas no son gustos de nadie, son lo que hay.
   */
  personal?: {
    esFavorito: (clave: string) => boolean;
    estaOculto: (clave: string) => boolean;
    marcarFavorito: (clave: string, valor: boolean) => void;
    ocultar: (clave: string) => void;
    /** Al soltar un elemento sobre otro. La lista nueva la calcula el Layout. */
    reordenar?: (desde: string, hasta: string) => void;
    /** Los que están escondidos, para poder traerlos de vuelta. Sin esto,
     *  ocultar sería una puerta de un solo sentido: el tema desaparece del
     *  único sitio desde el que se podría recuperar. */
    ocultos?: Array<{ clave: string; nombre: string }>;
    mostrar?: (clave: string) => void;
  };
}) {

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

  /*
   * ── FLOTAR O QUEDARSE ─────────────────────────────────────────────────────
   * Y hay una tercera razón para quedarse, además de la chincheta y el círculo:
   * **que haya un submenú abierto**.
   *
   * Sin eso, el raíl desplegado por el ratón se pinta POR ENCIMA del contenido
   * y el submenú sale justo detrás, tapado. Es literalmente lo que Eugenio
   * describió en su día —«se superpone el menú al submenú»— y volvía a pasar
   * ahora que el raíl está siempre puesto: se arregló para el caso de pulsar el
   * círculo y reaparecía por el camino nuevo.
   *
   * Abrir un submenú es haber decidido: has pulsado una flecha. A partir de ahí
   * el raíl forma parte de la página, empuja como cualquier columna y nadie
   * tapa a nadie. Y se queda desplegado aunque apartes el ratón, porque si no,
   * el submenú quedaría abierto sin que se vea de cuál de los catorce es.
   */
  const anclado = siempreAbierto || fijado || abierta !== null;
  const desplegado = anclado || encima;

  const fijar = () => {
    setFijado(v => {
      const n = !v;
      try { localStorage.setItem('hw_rail_fijado', n ? '1' : '0'); } catch { /* modo privado */ }
      return n;
    });
  };

  /*
   * AQUÍ VIVÍA UNA ESPERA DE 140 ms antes de abrir el submenú al pasar el
   * ratón. Ya no hace falta: el submenú se abre con la flecha, y una flecha no
   * se pulsa sin querer al cruzar la lista. La espera existía para tapar un
   * gesto mal repartido; quitado el gesto, sobra la tirita.
   */

  /** Qué elemento tiene abierto su menú de tres puntos, si hay alguno. */
  const [menuDe, setMenuDe] = useState<string | null>(null);
  /** Cuál se está arrastrando. Se guarda aquí y no en el evento porque en un
   *  arrastre de HTML el dato viaja como texto y hay que volver a leerlo. */
  const arrastrado = useRef<string | null>(null);

  const boton = (h: Herramienta) => {
    const Icono = h.icono;
    const activa = abierta === h.clave;
    // La flecha sólo existe desplegado, y no es una renuncia: plegado no caben
    // dos objetivos de 40 px en 56 de ancho sin que uno se falle. Y no hace
    // falta, porque acercar el ratón despliega el raíl — la flecha está siempre
    // a un gesto de distancia.
    const conFlecha = !!onAbrirSubmenu && h.conPanel && desplegado;
    const Flecha = ladoDerecho
      ? (activa ? ChevronRight : ChevronLeft)
      : (activa ? ChevronLeft : ChevronRight);
    const conPersonal = !!personal && desplegado;
    return (
      <div
        key={h.clave}
        // ── ARRASTRAR PARA REORDENAR ────────────────────────────────────
        // Con el arrastre del propio navegador y no con una librería: son
        // catorce elementos en una columna, no una tabla con miles. Lo que
        // hace falta —cógelo, suéltalo encima de otro— ya lo trae el
        // navegador, y una dependencia más para esto sería pagar un peso de
        // carga por algo que ya está.
        draggable={!!personal?.reordenar && desplegado}
        onDragStart={personal?.reordenar ? e => {
          arrastrado.current = h.clave;
          e.dataTransfer.effectAllowed = 'move';
          // Firefox no empieza el arrastre si no se escribe algo.
          try { e.dataTransfer.setData('text/plain', h.clave); } catch { /* da igual */ }
        } : undefined}
        onDragOver={personal?.reordenar ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } : undefined}
        onDrop={personal?.reordenar ? e => {
          e.preventDefault();
          const desde = arrastrado.current || e.dataTransfer.getData('text/plain');
          if (desde && desde !== h.clave) personal.reordenar!(desde, h.clave);
          arrastrado.current = null;
        } : undefined}
        className={cn('group/fila relative flex shrink-0 items-center',
          desplegado ? 'w-full' : 'w-10')}>
        {/* La marca de «aquí estás» es una barra a la izquierda, no un fondo
            distinto: el fondo ya lo usa el ratón al pasar por encima, y dos
            cosas que se pintan igual dejan de significar. */}
        {activa && (
          <span className={cn('absolute top-2 z-10 h-6 w-0.5 bg-emerald-400',
            ladoDerecho ? 'right-0 rounded-l' : 'left-0 rounded-r')} />
        )}
        <button
          // EL NOMBRE LLEVA AL SITIO. Antes, en las herramientas con panel, no
          // llevaba a ninguna parte: sólo abría el panel, y la herramienta
          // entera sólo se alcanzaba desde dentro de él. Con la flecha haciendo
          // ya ese trabajo, el nombre puede volver a hacer el suyo.
          //
          // Y A DÓNDE LLEVA LO DECIDE QUIEN LO PINTA, no el raíl. Aquí ponía
          // `h.ruta.startsWith('/') ? navigate(h.ruta) : onElegir(h)`, y con eso
          // los catorce temas se iban a `/objetivos/<id>` —su `ruta`— cuando lo
          // que Eugenio pidió para ellos es `/explorar?objetivo=<id>`, la
          // rejilla con todo lo que habla del tema. El raíl adivinaba, y
          // adivinaba mal en catorce de veinticuatro casos.
          onClick={() => onElegir(h)}
          title={desplegado ? undefined : h.nombre}
          aria-label={h.nombre}
          aria-current={activa ? 'true' : undefined}
          className={cn(
            // 40 px de alto: por debajo de eso este proyecto ya tiene catalogado
            // que los botones dejan de acertarse con el dedo.
            'flex h-10 min-w-0 items-center gap-3 rounded-xl px-[10px] transition-colors',
            desplegado ? 'flex-1' : 'w-10 justify-center',
            claro
              ? (activa ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
              : (activa ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'),
          )}
        >
          {/* EL COLOR DEL TEMA, cuando lo tiene: el mismo azul del agua que en
              el mapa. Sobre fondo oscuro no se usa —un `text-yellow-500` sobre
              negro casi no se ve— y ahí manda el estado del botón. */}
          <Icono className={cn('h-5 w-5 shrink-0', claro && h.color && !activa && h.color)} />
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

        {/* ══ LA ESTRELLA Y LOS TRES PUNTOS ══════════════════════════════
            Aparecen al pasar el ratón por la fila. En reposo el menú es una
            lista de temas, no una lista de controles: catorce estrellas
            siempre visibles convierten un índice en un panel de mandos.
            La estrella SÍ se queda cuando ya es favorito — ahí ya no es un
            control, es el estado. */}
        {conPersonal && (
          <>
            <button
              onClick={e => { e.stopPropagation(); personal!.marcarFavorito(h.clave, !personal!.esFavorito(h.clave)); }}
              title={personal!.esFavorito(h.clave) ? 'Quitar de favoritos' : 'Marcar como favorito'}
              aria-label={personal!.esFavorito(h.clave) ? 'Quitar de favoritos' : 'Marcar como favorito'}
              aria-pressed={personal!.esFavorito(h.clave)}
              className={cn('grid h-7 w-6 shrink-0 place-items-center rounded-lg transition-all',
                personal!.esFavorito(h.clave)
                  ? 'text-amber-400'
                  : 'text-slate-300 opacity-0 hover:text-amber-400 group-hover/fila:opacity-100')}
            >
              <Star className="h-3.5 w-3.5" fill={personal!.esFavorito(h.clave) ? 'currentColor' : 'none'} />
            </button>

            <div className="relative shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setMenuDe(v => (v === h.clave ? null : h.clave)); }}
                title="Más"
                aria-label={`Más sobre ${h.nombre}`}
                aria-expanded={menuDe === h.clave}
                className={cn('grid h-7 w-5 place-items-center rounded-lg text-slate-300 transition-all hover:text-slate-600',
                  menuDe === h.clave ? 'opacity-100 text-slate-600' : 'opacity-0 group-hover/fila:opacity-100')}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
              {menuDe === h.clave && (
                <div className={cn('absolute top-7 z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl',
                  ladoDerecho ? 'right-0' : 'left-0')}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuDe(null); personal!.marcarFavorito(h.clave, !personal!.esFavorito(h.clave)); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <Star className="h-3.5 w-3.5 text-slate-400" />
                    {personal!.esFavorito(h.clave) ? 'Quitar de favoritos' : 'Favorito'}
                  </button>
                  {/* OCULTAR ES SÓLO DEL MENÚ, y se dice aquí mismo. Decisión de
                      Eugenio: sus publicaciones siguen saliendo en el muro y en
                      el buscador. Sin esta línea, «ocultar» se lee como «no
                      quiero ver nada de esto» y luego sorprende. */}
                  <button
                    onClick={e => { e.stopPropagation(); setMenuDe(null); personal!.ocultar(h.clave); }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50">
                    <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span>
                      Quitar del menú
                      <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                        Sigue saliendo en el muro
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            {personal!.reordenar && (
              <span
                aria-hidden
                title="Arrastra para ordenar"
                className="grid h-7 w-4 shrink-0 cursor-grab place-items-center text-slate-200 opacity-0 transition-opacity group-hover/fila:opacity-100"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
            )}
          </>
        )}

        {conFlecha && (
          <button
            onClick={() => onAbrirSubmenu!(h)}
            title={activa ? `Cerrar ${h.nombre}` : `Ver lo que hay en ${h.nombre}`}
            aria-label={activa ? `Cerrar ${h.nombre}` : `Ver lo que hay en ${h.nombre}`}
            aria-expanded={activa}
            className={cn(
              'grid h-8 w-7 shrink-0 place-items-center rounded-lg transition-colors',
              claro
                ? (activa ? 'text-emerald-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700')
                : (activa ? 'text-emerald-400' : 'text-slate-500 hover:bg-slate-800 hover:text-white'),
            )}
          >
            <Flecha className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  };

  return (
    // El HUECO. Mide 56 px salvo que esté fijado: es lo que decide si el raíl
    // empuja el contenido o se le pone encima.
    <div className={cn('relative h-full shrink-0 transition-[width] duration-200',
      siempreAbierto ? 'w-64' : anclado ? 'w-56' : 'w-14')}>
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
          // Anclado al borde que le toca: a la izquierda crece hacia la
          // derecha y al revés. Si se quedara en `left-0` estando a la derecha,
          // al desplegarse se metería en el contenido en vez de salir de él.
          ladoDerecho ? 'absolute right-0 top-0' : 'absolute left-0 top-0',
          'z-50 flex h-full flex-col gap-0.5 overflow-y-auto overflow-x-hidden',
          claro
            ? (ladoDerecho ? 'border-l border-slate-200 bg-white' : 'border-r border-slate-200 bg-white')
            : (ladoDerecho ? 'border-l border-slate-800 bg-slate-950' : 'border-r border-slate-800 bg-slate-950'),
          'px-2 py-2 transition-[width] duration-200',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          siempreAbierto ? 'w-64' : desplegado ? 'w-56' : 'w-14',
          // La sombra sólo cuando está flotando por encima: fijado forma parte
          // de la página y una sombra ahí lo despegaría de ella sin motivo.
          !anclado && encima && 'shadow-2xl shadow-black/40',
        )}
      >
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onInicio}
            title="Inicio"
            aria-label="Inicio"
            // `min-w-0` NO ES DECORACIÓN. Sin él este botón no baja de lo que
            // mide su texto —«Red de Conocimiento» son ~190 px con el icono— y
            // en un raíl de 224 px eso deja 34 para lo que venga detrás. Con un
            // solo botón al lado cabía por los pelos; al añadir el de plegar,
            // la fila se desbordó y, como el raíl recorta lo que se sale, **el
            // botón nuevo acabó fuera de la pantalla**: existía, respondía al
            // teclado y no se veía. Medido en el navegador: `x = 1299` en una
            // ventana de 1280.
            className={cn(
              'flex h-10 min-w-0 items-center gap-3 rounded-xl px-[10px] transition-colors',
              claro ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              desplegado ? 'flex-1' : 'w-10 justify-center',
            )}
          >
            <Home className="h-5 w-5 shrink-0" />
            <span className={cn(
              'truncate whitespace-nowrap text-[13px] font-black transition-all duration-200',
              desplegado ? 'w-auto opacity-100' : 'w-0 opacity-0',
            )}>
              {titulo}
            </span>
          </button>

          {/* ══ PLEGAR, Y FIJAR ═══════════════════════════════════════════
              Eugenio: «permite que ambos menús, el de la derecha y la
              izquierda, tengan el botón de volverse a plegar cuando se
              despliegan».

              SON DOS BOTONES PORQUE SON DOS COSAS, aunque se parezcan:

                · la CHINCHETA dice «quédate abierto aunque quite el ratón»;
                · el de PLEGAR dice «ciérrate ahora».

              Y el de plegar hace falta precisamente porque el otro existe: un
              menú fijado ya no se cierra solo al alejarse, así que sin este
              botón la única salida sería volver a buscar la chincheta. Lo mismo
              cuando el menú está abierto porque se ha pulsado un círculo de
              abajo: ahí quien lo tiene que cerrar es el Layout, y por eso la
              consecuencia viaja hacia fuera (`onPlegar`).

              La flecha apunta hacia donde se va a ir el menú, que en el raíl de
              la derecha es al contrario.

              En móvil no sale ninguno de los dos: allí el menú es un cajón que
              ocupa la pantalla y se cierra tocando fuera o con su aspa. */}
          {desplegado && !siempreAbierto && (
            <button
              onClick={fijar}
              title={fijado ? 'Soltar el menú' : 'Dejar el menú abierto'}
              aria-label={fijado ? 'Soltar el menú' : 'Dejar el menú abierto'}
              aria-pressed={fijado}
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
                fijado
                  ? (claro ? 'bg-slate-100 text-emerald-600' : 'bg-slate-800 text-emerald-400')
                  : (claro ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-slate-500 hover:bg-slate-800 hover:text-white'),
              )}
            >
              <Pin className="h-4 w-4" />
            </button>
          )}
          {desplegado && anclado && (onPlegar || fijado) && (
            <button
              onClick={() => { if (fijado) fijar(); onPlegar?.(); }}
              title="Plegar el menú"
              aria-label="Plegar el menú"
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
                claro
                  ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                  : 'text-slate-500 hover:bg-slate-800 hover:text-white',
              )}
            >
              {ladoDerecho ? <PanelRightClose className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
        </div>

        <div className={cn('my-1 h-px shrink-0', claro ? 'bg-slate-200' : 'bg-slate-800')} />

        {(items ?? HERRAMIENTAS).map(boton)}
        {/* El separador y lo personal sólo en el raíl de las herramientas: el
            de Explorar es una sola lista de catorce y una raya ahí no separa
            nada. */}
        {!items && <div className={cn('my-1 h-px shrink-0', claro ? 'bg-slate-200' : 'bg-slate-800')} />}
        {!items && PERSONALES.map(boton)}

        {/* ── LO QUE HAS QUITADO, AL FINAL ─────────────────────────────────
            Un renglón pequeño y en gris, no una sección: no es contenido, es
            la forma de deshacer. Y tiene que estar, porque un tema oculto
            desaparece del único sitio desde el que se podría recuperar. */}
        {desplegado && personal?.ocultos && personal.ocultos.length > 0 && (
          <div className={cn('mt-1 shrink-0 border-t pt-1.5', claro ? 'border-slate-200' : 'border-slate-800')}>
            <p className="px-2.5 pb-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Quitados del menú
            </p>
            {personal.ocultos.map(o => (
              <button
                key={o.clave}
                onClick={() => personal.mostrar?.(o.clave)}
                title={`Devolver ${o.nombre} al menú`}
                className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-bold transition-colors',
                  claro ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-700' : 'text-slate-500 hover:bg-slate-800 hover:text-white')}
              >
                <EyeOff className="h-3 w-3 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{o.nombre}</span>
                <span className="shrink-0 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">Devolver</span>
              </button>
            ))}
          </div>
        )}
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
