// ============================================================================
// EL MENÚ LATERAL EN 4 SECCIONES (2026-08-20, reestructuración pedida por
// Eugenio: «divide el menú izquierdo en 4 secciones: 1. los proyectos, 2. las
// herramientas, 3. los productos/servicios, 4. las personas»).
// ============================================================================
// Ésta es la forma de la plataforma, dicha en un sitio:
//
//   1. PROYECTOS     dónde pasa el trabajo. Se despliega y dentro está TODO lo
//                    que le cuelga: sus tareas, sus páginas, sus esquemas…
//   2. HERRAMIENTAS  con qué se trabaja. Fijas, iguales para todo el mundo.
//   3. PRODUCTOS     lo que un proyecto ofrece al mundo.
//   4. PERSONAS      quién hay dentro.
//
// Antes esto era un desplegable que salía del botón ☰ y se cerraba al pulsar
// nada. Ahora es una columna que se queda, porque con un árbol de proyectos
// dentro hay que poder mirar y volver sin que desaparezca.
//
// SIN SEMIPLEGADO (2026-08-21, decisión de Eugenio: «en versión móvil el menú
// lateral semicolapsado no queda bien, entonces vamos a hacer que se colapse
// del todo, tanto en escritorio como en móvil»). Antes había un estado
// intermedio de 56 px con solo iconos. Ya no: o está el menú o no está, en los
// dos tamaños. Quien decide si se pinta es `Layout`, y es también quien pone
// el botón grande de traerlo de vuelta.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban, Wrench, Store, Users2, PanelLeftClose,
  Globe2, Map as MapIcon, Gamepad2, ListChecks, FileText, Database, Sparkles, Layers, Target,
  Settings, Eye, EyeOff, GripVertical, X as Cerrar, RotateCcw, Table2,
  Compass, Globe, User, Plus, Package, MessageSquare, CalendarDays, Tag, Phone,
  Paperclip, Bookmark, Megaphone,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { iconoDeProyecto } from '../../utils/iconoDeNombre';
import { useAuth } from '../../contexts/AuthContext';
import { minimizarTodas, abrirVentana } from '../ventanas/bus';
import SeccionMenu from './menu/SeccionMenu';
import RamaMenu from './menu/RamaMenu';
import type { NodoMenu } from './menu/tipos';

/** LAS HERRAMIENTAS. Fijas y en el cliente: son las mismas para todo el mundo
 *  y no cambian nunca, así que pedírselas al servidor sería un viaje por nada. */
const HERRAMIENTAS: NodoMenu[] = [
  { id: 'h-paginas',   label: 'Páginas',   icono: FileText,     destino: '/paginas',   abrir: 'ventana' },
  { id: 'h-esquemas',  label: 'Esquemas',  icono: Globe2,       destino: '/esquemas',  abrir: 'ventana' },
  { id: 'h-mapas',     label: 'Mapas',     icono: MapIcon,      destino: '/mapas',     abrir: 'ventana' },
  { id: 'h-tareas',    label: 'Tareas',    icono: ListChecks,   destino: '/tareas',    abrir: 'ventana' },
  { id: 'h-tablas',    label: 'Tablas',    icono: Table2,       destino: '/tablas',    abrir: 'ventana' },
  // Vender estaba repartido en tres sitios: el Mercado común, el creador de
  // páginas y ningún sitio para los pedidos. Aquí está lo que vendes y lo que
  // te han comprado (Eugenio, 2026-08-22: «pon una herramienta nueva que sea
  // Comercio… la quiero en el menú lateral junto al resto de herramientas»).
  { id: 'h-comercio',  label: 'Comercio',  icono: Store,        destino: '/comercio',  abrir: 'ventana' },
  // El MISMO asistente de la columna derecha, a pantalla completa (2026-08-20).
  { id: 'h-ia',        label: 'IA',        icono: Sparkles,     destino: '/ia',        abrir: 'ventana' },
  { id: 'h-calendario', label: 'Calendario', icono: CalendarDays, destino: '/calendario', abrir: 'ventana' },
  { id: 'h-mundo',     label: 'Visor 3D',  icono: Gamepad2,     destino: '/juego',     abrir: 'ventana' },
  { id: 'h-archivos',  label: 'Archivos',  icono: Database,     destino: '/archivos',  abrir: 'ventana' },
  { id: 'h-navegador', label: 'Navegador', icono: Globe,        destino: 'about:inicio' },
  // «Publicaciones», no «Explorar» (Eugenio, 2026-08-20): es lo que hay dentro.
  { id: 'h-explorar',  label: 'Publicaciones', icono: Compass,  destino: '/explorar',  abrir: 'ventana' },
];

interface DatosMenu {
  proyectos: Array<{ id: string; titulo: string; slug: string; publico: boolean; icono?: string | null }>;
  productos: Array<{ id: string; nombre: string; icono?: string | null }>;
  personas: Array<{ id: string; nombre: string; real: boolean; rol?: string; icono?: string | null }>;
  organizaciones: Array<{ id: string; nombre: string }>;
  gruposFavoritos: Array<{ id: string; nombre: string; icono: string | null; cuantos: number }>;
}

const VACIO: DatosMenu = { proyectos: [], productos: [], personas: [], organizaciones: [], gruposFavoritos: [] };

/** Las iniciales de algo, para la insignia cuando no hay icono propio. */
const iniciales = (t: string) =>
  t.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '·';

export default function MenuLateral({ activo, movil = false, onCerrar }: {
  activo?: string;
  /** EN MÓVIL EL MENÚ ES UN CAJÓN, NO UNA COLUMNA (2026-08-20, B41). En una
   *  pantalla de 390 px esta columna de 240 se comía el 62% y al contenido le
   *  quedaban 118 px útiles. El cambio de aquí dentro es pequeño a propósito:
   *  la columna se vuelve cajón —lo coloca `Layout`, que es quien pone el
   *  fondo oscuro— y todo lo demás (secciones, árbol, editar menú) es
   *  exactamente el mismo componente. */
  movil?: boolean;
  /** Esconder el menú. Ya no es «plegar»: ver la nota de SIN SEMIPLEGADO. */
  onCerrar?: () => void;
}) {
  const navigate = useNavigate();
  const { user, updateUiSettings } = useAuth();

  /*
   * LO QUE CUELGA DE TU CUENTA, CUANDO NO HAY CUENTA (2026-08-23).
   *
   * El menú ya no desaparece al cerrar sesión: la lista de herramientas es
   * justo lo que quiere ver quien está decidiendo si se registra. Pero sus
   * proyectos, sus productos y su gente sí dependen de tener cuenta, y ahí
   * «Todavía no tienes proyectos» es una frase falsa: no es que no tengas, es
   * que no has entrado.
   *
   * Así que en su sitio va la invitación. Enlace y no botón: lleva a otra
   * pantalla, y las tres llevan al mismo sitio — la portada dice que hay UN
   * botón de crear cuenta, y esto no compite con él, lo repite donde la
   * ausencia se nota.
   */
  const invitar = (que: string) => (
    <Link to="/login?crear=1"
      className="mx-2 my-1 block rounded-lg border border-dashed border-slate-200 px-2.5 py-2 text-[11px] font-bold leading-snug text-slate-400 transition-colors hover:border-emerald-300 hover:text-emerald-700">
      {que}
    </Link>
  );
  const [datos, setDatos] = useState<DatosMenu>(VACIO);
  const [plegadas, setPlegadas] = useState<Record<string, boolean>>({});
  // LAS ÁREAS (2026-08-20): los 14 objetivos con sus indicadores. Son el mapa
  // del conocimiento común —iguales para todo el mundo y no cambian cada
  // día—, así que se piden una vez y ya. No dependen de la sesión.
  const [areas, setAreas] = useState<Array<{ id: string; titulo: string; indicadores: Array<{ id: string; nombre: string }> }>>([]);

  // CÓMO TIENES TÚ EL MENÚ: en qué orden va cada cosa y cuánto sitio ocupa
  // cada sección. Es una preferencia TUYA, no del proyecto: que tú pongas
  // «Camión camperizado» el primero no cambia el menú de nadie más. Por eso va
  // en tus ajustes de usuario (jsonb) y no en una columna.
  const ajustes = (user?.uiSettings || {}) as any;
  const [orden, setOrden] = useState<Record<string, string[]>>(() => ajustes.ordenMenu || {});
  const [altos, setAltos] = useState<Record<string, number>>(() => ajustes.altosMenu || {});
  useEffect(() => {
    const a = (user?.uiSettings || {}) as any;
    if (a.ordenMenu) setOrden(a.ordenMenu);
    if (a.altosMenu) setAltos(a.altosMenu);
    if (a.seccionesMenu) setConfSecciones(a.seccionesMenu);
  }, [user?.id]);

  /** Coloca según tu orden. Lo que no esté en la lista va detrás, en el orden
   *  natural: algo nuevo aparece solo, sin tener que reordenar nada. */
  const colocar = useCallback((clave: string, nodos: NodoMenu[]) => {
    const guardado = orden[clave];
    if (!guardado?.length) return nodos;
    const puesto = new Map(guardado.map((id, i) => [id, i]));
    return [...nodos].sort((x, y) =>
      (puesto.has(x.id) ? puesto.get(x.id)! : 1e9) - (puesto.has(y.id) ? puesto.get(y.id)! : 1e9));
  }, [orden]);

  /** Guarda (optimista) el orden de una sección. */
  const guardarOrden = (clave: string, ids: string[]) => {
    const siguiente = { ...orden, [clave]: ids };
    setOrden(siguiente);
    updateUiSettings({ ordenMenu: siguiente });
  };
  const guardarAlto = (clave: string, alto: number) => {
    const siguiente = { ...altos, [clave]: alto };
    setAltos(siguiente);
    updateUiSettings({ altosMenu: siguiente });
  };

  /** El arrastre de una sección: qué se lleva y dónde está encima. */
  const llevando = useRef<{ clave: string; id: string } | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  /** Fabrica lo que necesita cada fila para poder colocarse. */
  const arrastreDe = (clave: string, nodos: NodoMenu[], nodo: NodoMenu) => ({
    encima: encima === nodo.id,
    onEmpezar: () => { llevando.current = { clave, id: nodo.id }; },
    onFin: () => { llevando.current = null; setEncima(null); },
    onSoltar: () => {
      const l = llevando.current;
      llevando.current = null;
      setEncima(null);
      if (!l || l.clave !== clave || l.id === nodo.id) return;
      const ids = nodos.map(n => n.id);
      const desde = ids.indexOf(l.id);
      const hasta = ids.indexOf(nodo.id);
      if (desde < 0 || hasta < 0) return;
      ids.splice(hasta, 0, ids.splice(desde, 1)[0]);
      guardarOrden(clave, ids);
    },
  });

  /** Pinta una sección entera con su arrastre. */
  const filas = (clave: string, nodos: NodoMenu[]) => {
    const puestos = colocar(clave, nodos);
    return puestos.map(n => (
      <div key={n.id} onDragOver={() => setEncima(n.id)}>
        <RamaMenu
          nodo={n} colapsado={false} activo={activo} onAbrir={abrir}
          arrastre={arrastreDe(clave, puestos, n)}
        />
      </div>
    ));
  };

  useEffect(() => {
    if (!user) { setDatos(VACIO); return; }
    fetch('/api/menu', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setDatos({ ...VACIO, ...d }))
      .catch(() => setDatos(VACIO));
  }, [user]);

  useEffect(() => {
    fetch('/api/areas')
      .then(r => r.json())
      .then(d => setAreas(Array.isArray(d) ? d : []))
      .catch(() => setAreas([]));
  }, []);

  // El menú se recarga cuando algo cambia por ahí fuera (creas un proyecto,
  // mueves una página): quien lo haga lanza este aviso y aquí se vuelve a
  // pedir. Sin esto habría que recargar la página para verlo.
  useEffect(() => {
    const refrescar = () => {
      if (!user) return;
      fetch('/api/menu', { credentials: 'include' })
        .then(r => r.json()).then(d => setDatos({ ...VACIO, ...d })).catch(() => null);
    };
    window.addEventListener('humanity:menu-cambiado', refrescar);
    return () => window.removeEventListener('humanity:menu-cambiado', refrescar);
  }, [user]);

  /** Abrir un nodo: las herramientas y lo que hay dentro de un proyecto se
   *  abren como VENTANA del escritorio; las páginas de cuenta navegan. */
  const abrir = useCallback((nodo: NodoMenu) => {
    if (!nodo.destino) return;
    if (nodo.destino === 'about:inicio') {
      abrirVentana({ titulo: 'Navegador', clase: 'navegador', destino: 'about:inicio' });
      return;
    }
    if (nodo.abrir === 'navegar') { navigate(nodo.destino); return; }
    abrirVentana({ titulo: nodo.label, clase: 'app', destino: nodo.destino });
  }, [navigate]);

  const plegar = (k: string) => setPlegadas(v => ({ ...v, [k]: !v[k] }));

  // --- 1. PROYECTOS: cada uno despliega lo que le cuelga -------------------
  const nodosProyectos: NodoMenu[] = datos.proyectos.map(p => ({
    id: p.id,
    label: p.titulo,
    // El icono que le hayas puesto manda; si no hay, el que le toca a su
    // nombre (D90, 2026-08-21, Eugenio: «que no sean letras»). Las iniciales
    // se quedan para las PERSONAS, donde son una inicial de verdad y no un
    // dibujo de lo que la cosa es.
    insignia: iconoDeProyecto(p.icono, p.titulo),
    destino: `/proyectos/${p.slug}`,
    editable: { tipo: 'proyecto', id: p.id },
    // Los hijos se piden al desplegar, no antes.
    cargarHijos: async () => {
      const r = await fetch(`/api/proyectos/${p.id}/arbol`, { credentials: 'include' });
      const d = await r.json();
      if (!Array.isArray(d?.ramas)) return [];
      // Las cuatro últimas se añadieron el 2026-08-23 con las ramas nuevas del
      // árbol. `guardados` ya existía y caía en el icono por defecto, o sea que
      // «Guardados» se pintaba con la carpeta de proyecto: parecía otro
      // proyecto dentro del proyecto.
      const ICONO: Record<string, any> = {
        tareas: ListChecks, paginas: FileText, esquemas: Globe2,
        mapas: MapIcon, productos: Package, personas: Users2,
        archivos: Paperclip, tablas: Table2, eventos: CalendarDays, guardados: Bookmark,
        // `publicaciones` la trae el Dashboard en su PR #300. El icono va aquí
        // y no en su rama porque este fichero es mío y así no chocan las dos.
        // Sin esta línea la rama sale con la carpeta de proyecto por defecto y
        // parece un proyecto dentro del proyecto — el mismo despiste que tuvo
        // «Guardados» hasta hoy.
        publicaciones: Megaphone,
      };
      return d.ramas.map((rama: any) => ({
        // La rama («Tareas») NO se renombra: es una categoría, no una cosa.
        // Lo que cuelga de ella sí.
        id: `${p.id}-${rama.clave}`,
        label: rama.label,
        icono: ICONO[rama.clave] || FolderKanban,
        cuantos: rama.hijos.length,
        hijos: rama.hijos.map((h: any) => ({
          id: h.id,
          label: h.label,
          insignia: h.icono || undefined,
          icono: ICONO[rama.clave] || FolderKanban,
          destino: h.destino,
          editable: rama.tipo ? { tipo: rama.tipo, id: h.id } : undefined,
        })),
      }));
    },
  }));

  // --- 3. PRODUCTOS --------------------------------------------------------
  // Un área es un objetivo, y dentro cuelgan sus indicadores: la misma cadena
  // que ya usa toda la plataforma (Objetivo → Indicador), no un árbol nuevo.
  const nodosAreas: NodoMenu[] = areas.map(a => ({
    id: `area-${a.id}`,
    label: a.titulo,
    icono: Target,
    destino: `/objetivos/${a.id}`,
    abrir: 'ventana',
    hijos: a.indicadores.map(i => ({
      id: `ind-${i.id}`,
      label: i.nombre,
      destino: `/indicadores/${i.id}`,
      abrir: 'ventana' as const,
    })),
  }));

  // ---- LAS SECCIONES DEL MENÚ, CONFIGURABLES -------------------------------
  // El catálogo fijo: qué secciones existen y cómo se llaman de fábrica.
  const SECCIONES_BASE = [
    { clave: 'proyectos', titulo: 'Proyectos', icono: FolderKanban },
    { clave: 'herramientas', titulo: 'Herramientas', icono: Wrench },
    { clave: 'areas', titulo: 'Áreas', icono: Layers },
    { clave: 'productos', titulo: 'Productos', icono: Store },
    { clave: 'personas', titulo: 'Personas', icono: Users2 },
  ];

  // TU configuración: orden, nombres, iconos y cuáles escondes. Va en tus
  // ajustes de usuario, como el orden de las filas: es una preferencia tuya y
  // no cambia el menú de nadie más.
  const [editandoMenu, setEditandoMenu] = useState(false);
  const [confSecciones, setConfSecciones] = useState<Record<string, { titulo?: string; icono?: string; oculta?: boolean; pos?: number }>>(
    () => ajustes.seccionesMenu || {});

  const secciones = SECCIONES_BASE
    .map((sec, i) => {
      const c = confSecciones[sec.clave] || {};
      return {
        clave: sec.clave,
        titulo: c.titulo || sec.titulo,
        // Un emoji tuyo gana al icono de fábrica; SeccionMenu pinta los dos.
        icono: (c.icono || sec.icono) as any,
        oculta: !!c.oculta,
        pos: typeof c.pos === 'number' ? c.pos : i,
      };
    })
    .sort((a, b) => a.pos - b.pos);

  const seccionesVisibles = secciones.filter(x => !x.oculta);

  const guardarSecciones = (nuevas: typeof secciones) => {
    const conf: Record<string, any> = {};
    nuevas.forEach((x, i) => {
      const base = SECCIONES_BASE.find(b => b.clave === x.clave)!;
      conf[x.clave] = {
        pos: i,
        oculta: x.oculta || undefined,
        // Solo se guarda lo que has CAMBIADO: si vuelves a poner el nombre de
        // siempre, deja de haber nombre propio y el día que se renombre en la
        // plataforma tú también lo verás.
        titulo: x.titulo !== base.titulo ? x.titulo : undefined,
        icono: typeof x.icono === 'string' ? x.icono : undefined,
      };
    });
    setConfSecciones(conf);
    updateUiSettings({ seccionesMenu: conf });
  };

  const nodosProductos: NodoMenu[] = datos.productos.map(p => ({
    id: p.id, label: p.nombre, icono: Package,
    insignia: p.icono || undefined,
    destino: `/mercado?producto=${encodeURIComponent(p.id)}`,
    editable: { tipo: 'producto', id: p.id },
  }));

  // --- 4. PERSONAS Y ORGANIZACIONES ---------------------------------------
  const nodosPersonas: NodoMenu[] = [
    ...(user ? [{
      // TU PERFIL SE NAVEGA, NO SE ABRE EN UNA VENTANA (2026-08-22, Eugenio:
      // «pincho en mi imagen en el menú, y le doy a perfil, y no me lleva a mi
      // perfil»). Sí llevaba: abría una ventana con el perfil dentro, y si
      // estaba minimizada o detrás no pasaba nada visible. Desde fuera eso es
      // exactamente «no funciona».
      //
      // Tu perfil no es una herramienta que se consulte al lado de otra cosa;
      // es un sitio al que se VA. Las herramientas siguen abriéndose en
      // ventana, que es para lo que están.
      id: 'yo', label: 'Mi Perfil', icono: User, abrir: 'navegar',
      destino: `/personas/${user.id}`,
    } as NodoMenu, {
      id: 'todas', label: 'Todas las personas', icono: Users2, destino: '/personas', abrir: 'ventana',
    } as NodoMenu, {
      id: 'mensajes', label: 'Mensajes', icono: MessageSquare, destino: '/mensajes',
    } as NodoMenu, {
      // EL TELÉFONO VA JUNTO A MENSAJES porque es lo mismo visto de otra
      // manera: a la misma persona se le escribe o se le llama (2026-08-22).
      id: 'telefono', label: 'Teléfono', icono: Phone, destino: '/telefono',
    } as NodoMenu] : []),
    // LOS GRUPOS FAVORITOS, aquí arriba (Eugenio: «ponerlo como favoritos,
    // entonces los grupos favoritos se añadirán»). Cada uno abre la lista ya
    // filtrada por él.
    ...datos.gruposFavoritos.map(g => ({
      id: `grp-${g.id}`,
      label: g.nombre,
      icono: Tag,
      insignia: g.icono || undefined,
      cuantos: g.cuantos,
      destino: `/personas?grupo=${encodeURIComponent(g.id)}`,
      abrir: 'ventana' as const,
    })),
    ...datos.personas.map(p => ({
      id: p.id,
      label: p.nombre,
      insignia: p.icono || iniciales(p.nombre),
      // Una persona REAL tiene su perfil público; una representación tuya
      // tiene su propia página, con su ficha y vuestra conversación. Antes
      // llevaba al Mundo 3D: un megabyte de escena para lo que son una ficha y
      // un chat (Eugenio, 2026-08-20).
      destino: p.real ? `/personas/${p.id}` : `/persona/${p.id}`,
      // Solo se renombra la REPRESENTACIÓN. El nombre de una persona de verdad
      // lo pone ella en su perfil, no quien la tiene en su lista.
      editable: p.real ? undefined : { tipo: 'persona', id: p.id },
    })),
    ...datos.organizaciones.map(o => ({
      id: o.id, label: o.nombre, icono: Users2,
      destino: `/organizaciones/${o.id}`,
    })),
  ];

  // Qué pinta cada sección. Se separa del ORDEN a propósito: así reordenarlas
  // o esconderlas no toca el contenido de ninguna.
  const CONTENIDOS: Record<string, { cuantos: number; hijos: React.ReactNode; accion?: React.ReactNode }> = {
    proyectos: {
      cuantos: nodosProyectos.length,
      // El «+» CREA (2026-08-20). Antes solo llevaba al índice, que es lo que
      // hace ya el nombre de la sección: un botón con un más tiene que crear
      // algo, o no ser un más.
      accion: (
        <button onClick={() => abrir({ id: 'p', label: 'Nuevo proyecto', destino: '/proyectos?nuevo=1' })}
          title="Crear un proyecto"
          className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      ),
      hijos: (
        <>
          {nodosProyectos.length === 0 && (
            user
              ? <p className="px-2 py-1 text-[11px] text-slate-400 italic">Todavía no tienes proyectos.</p>
              : invitar('Crea tu cuenta y empieza tu primer proyecto →')
          )}
          {filas('proyectos', nodosProyectos)}
        </>
      ),
    },
    herramientas: { cuantos: HERRAMIENTAS.length, hijos: filas('herramientas', HERRAMIENTAS) },
    areas: { cuantos: areas.length, hijos: filas('areas', nodosAreas) },
    productos: {
      cuantos: nodosProductos.length,
      accion: (
        <button onClick={() => abrir({ id: 'm', label: 'Mercado', destino: '/mercado' })}
          title="Ir al Mercado"
          className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors">
          <Store className="w-3.5 h-3.5" />
        </button>
      ),
      hijos: (
        <>
          {nodosProductos.length === 0 && (
            user
              ? <p className="px-2 py-1 text-[11px] text-slate-400 italic">Todavía no ofreces nada.</p>
              : invitar('Con una cuenta puedes vender lo que haces →')
          )}
          {filas('productos', nodosProductos)}
        </>
      ),
    },
    personas: { cuantos: nodosPersonas.length, hijos: filas('personas', nodosPersonas) },
  };

  return (
    <aside
      className={cn('shrink-0 h-full border-r border-slate-200 bg-white flex flex-col',
        // MÓVIL: cajón. Ancho cómodo pero SIEMPRE con un hueco a la derecha
        // (`max-w-[82vw]`), porque ver un trozo de la página de debajo es lo
        // que hace entender que esto se cierra.
        movil ? 'w-72 max-w-[82vw]' : 'w-60')}
    >
      {/* Marca + esconder */}
      <div className="h-14 shrink-0 flex items-center border-b border-slate-200 px-3 gap-2">
        {/* EL LOGO Y EL NOMBRE, Y LOS DOS LLEVAN AL INICIO (2026-08-22,
            Eugenio: «utiliza este logo para la web, tanto en el menú como en el
            favicon, si alguien lo pulsa le lleva a inicio»). Aquí dentro el
            nombre SÍ se queda: es el único sitio donde la plataforma dice cómo
            se llama, y quitarlo de los dos la dejaría sin nombre en ninguna
            parte. Arriba, en la barra, va solo el logo por sitio. */}
        {/* Las mismas dos cosas que el logo de la barra: navegar Y apartar las
            ventanas, que si no tapan el inicio al que acabas de ir. */}
        <button onClick={() => { minimizarTodas(); navigate('/'); }} title="Ir al inicio"
          className="min-w-0 flex-1 text-left flex items-center gap-2 hover:opacity-85 transition-opacity">
          <img src="/logo.svg" alt="" className="w-7 h-7 rounded-lg shrink-0" />
          <span className="text-sm font-extrabold tracking-tight text-slate-900 truncate">
            Humanity<span className="bg-gradient-to-b from-slate-500 via-slate-300 to-slate-600 bg-clip-text text-transparent"> Wiki</span>
          </span>
        </button>
        {/* ESCONDER EL MENÚ. Ya no hay «plegar»: o está o no está, en los dos
            tamaños. 44 px de lado, que es el mínimo de Apple para el dedo —y
            el que este proyecto incumple en 83 de cada 100 botones. */}
        <button
          onClick={() => onCerrar?.()}
          title="Esconder el menú"
          aria-label="Esconder el menú"
          className="w-11 h-11 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
        >
          <PanelLeftClose className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* LAS SECCIONES, EN EL ORDEN QUE TÚ QUIERAS (2026-08-20, petición de
            Eugenio: «un botón editar menú donde permita reordenar las
            categorías y ocultar categorías enteras […] y cambiar el nombre e
            icono»). Antes eran cinco bloques escritos a mano en este orden;
            ahora cada una es una entrada de esta lista y el orden, el nombre,
            el icono y si se ve salen de tus ajustes. */}
        {seccionesVisibles.map(sec => {
          const contenido = CONTENIDOS[sec.clave];
          if (!contenido) return null;
          return (
            <SeccionMenu
              key={sec.clave}
              titulo={sec.titulo}
              icono={sec.icono}
              colapsado={false}
              plegada={sec.clave === 'areas' ? plegadas.areas !== false : !!plegadas[sec.clave]}
              onPlegar={() => plegar(sec.clave)}
              cuantos={contenido.cuantos}
              alto={altos[sec.clave]} onAlto={a => guardarAlto(sec.clave, a)}
              accion={contenido.accion}
            >
              {contenido.hijos}
            </SeccionMenu>
          );
        })}
      </div>

      {/* EDITAR MENÚ — abajo del todo a la izquierda. */}
      <button
        onClick={() => setEditandoMenu(true)}
        title="Editar el menú"
        // Misma letra y mismo trazo que una fila del menú: es una fila más,
        // solo que vive abajo.
        className="shrink-0 flex items-center gap-2 px-3.5 py-2.5 border-t border-slate-100 text-[13px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
      >
        <Settings strokeWidth={1.75} className="shrink-0" style={{ width: 20, height: 20 }} />
        <span>Editar menú</span>
      </button>

      {editandoMenu && (
        <PopupEditarMenu
          secciones={secciones}
          onCambiar={guardarSecciones}
          onCerrar={() => setEditandoMenu(false)}
        />
      )}
    </aside>
  );
}

// ----------------------------------------------------------------------------
// EDITAR EL MENÚ (2026-08-20, petición de Eugenio: «un botón editar menú con
// símbolo de rueda dentada, abajo a la izquierda, donde permita reordenar las
// categorías y ocultar categorías enteras o visibilizarlas si estaban ocultas,
// y cambiar el nombre e icono de las categorías»).
// ----------------------------------------------------------------------------
// Los cambios se ven EN EL MENÚ mientras los haces, con la ventanita abierta:
// reordenar a ciegas y cerrar para comprobar sería probar a tientas.
//
// Esconder no borra nada: la sección sigue ahí con todo lo suyo y vuelve con
// un clic. Es lo que hace que esconder no dé miedo.
const EMOJIS_SECCION = ['📁', '🛠️', '🎯', '🏪', '👥', '🌍', '💡', '📚', '⚡', '❤️', '🧭', '🔬'];

function PopupEditarMenu({ secciones, onCambiar, onCerrar }: {
  secciones: Array<{ clave: string; titulo: string; icono: any; oculta: boolean; pos: number }>;
  onCambiar: (s: any[]) => void;
  onCerrar: () => void;
}) {
  const [lista, setLista] = useState(secciones);
  const [editando, setEditando] = useState<string | null>(null);
  const arrastrando = useRef<number | null>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  /** Cada cambio se aplica al momento: el menú de detrás se reordena mientras
   *  miras, sin botón de guardar. */
  const aplicar = (nueva: typeof lista) => { setLista(nueva); onCambiar(nueva); };

  const mover = (desde: number, hasta: number) => {
    if (desde === hasta) return;
    const copia = [...lista];
    const [x] = copia.splice(desde, 1);
    copia.splice(hasta, 0, x);
    aplicar(copia);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={onCerrar}>
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-black text-slate-900">Editar menú</h2>
          <button onClick={onCerrar} className="ml-auto p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50">
            <Cerrar className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {lista.map((sec, i) => (
            <div
              key={sec.clave}
              draggable
              onDragStart={() => { arrastrando.current = i; }}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (arrastrando.current !== null) mover(arrastrando.current, i); arrastrando.current = null; }}
              className={cn('rounded-2xl border p-2.5 transition-colors cursor-grab active:cursor-grabbing',
                sec.oculta ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200')}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                <span className="w-6 text-center shrink-0">
                  {typeof sec.icono === 'string'
                    ? <span className="text-base">{sec.icono}</span>
                    : <sec.icono className="w-4 h-4 mx-auto text-slate-400" />}
                </span>
                {editando === sec.clave ? (
                  <input
                    autoFocus
                    value={sec.titulo}
                    onChange={e => aplicar(lista.map(x => x.clave === sec.clave ? { ...x, titulo: e.target.value } : x))}
                    onBlur={() => setEditando(null)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditando(null); }}
                    className="flex-1 min-w-0 px-2 py-1 border border-emerald-300 rounded-lg text-xs font-bold focus:outline-none"
                  />
                ) : (
                  <button onClick={() => setEditando(sec.clave)}
                    className="flex-1 min-w-0 text-left text-xs font-bold text-slate-800 truncate hover:text-emerald-700">
                    {sec.titulo}
                  </button>
                )}
                <button
                  onClick={() => aplicar(lista.map(x => x.clave === sec.clave ? { ...x, oculta: !x.oculta } : x))}
                  title={sec.oculta ? 'Mostrar esta sección' : 'Ocultar esta sección'}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                >
                  {sec.oculta ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {editando === sec.clave && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => aplicar(lista.map(x => x.clave === sec.clave ? { ...x, icono: undefined } : x))}
                      title="Volver al icono de siempre"
                      className="w-7 h-7 grid place-items-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    {EMOJIS_SECCION.map(em => (
                      <button
                        key={em}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => aplicar(lista.map(x => x.clave === sec.clave ? { ...x, icono: em } : x))}
                        className={cn('w-7 h-7 grid place-items-center rounded-lg text-base hover:bg-slate-100',
                          sec.icono === em && 'bg-emerald-100 ring-2 ring-emerald-400')}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="px-4 pb-3 text-[10px] text-slate-400 leading-relaxed">
          Arrastra para cambiar el orden, pincha el nombre para cambiarlo o ponerle
          un emoji, y el ojo para esconder una sección. Esconder no borra nada.
        </p>
      </div>
    </div>
  );
}
