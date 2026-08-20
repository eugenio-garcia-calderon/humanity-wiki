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
// PLEGADO son 56 px de iconos, con el nombre al pasar el ratón. El estado se
// guarda en tus ajustes, así que el menú te recuerda como lo dejaste.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Wrench, Store, Users2, PanelLeftClose, PanelLeftOpen,
  Globe2, Map as MapIcon, Gamepad2, ListChecks, FileText, Database,
  Compass, Globe, User, Plus, Package,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../contexts/AuthContext';
import { abrirVentana } from '../ventanas/bus';
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
  { id: 'h-mundo',     label: 'Mundo 3D',  icono: Gamepad2,     destino: '/juego',     abrir: 'ventana' },
  { id: 'h-archivos',  label: 'Archivos',  icono: Database,     destino: '/archivos',  abrir: 'ventana' },
  { id: 'h-navegador', label: 'Navegador', icono: Globe,        destino: 'about:inicio' },
  { id: 'h-explorar',  label: 'Explorar',  icono: Compass,      destino: '/explorar',  abrir: 'ventana' },
];

interface DatosMenu {
  proyectos: Array<{ id: string; titulo: string; slug: string; publico: boolean }>;
  productos: Array<{ id: string; nombre: string }>;
  personas: Array<{ id: string; nombre: string; real: boolean; rol?: string }>;
  organizaciones: Array<{ id: string; nombre: string }>;
}

const VACIO: DatosMenu = { proyectos: [], productos: [], personas: [], organizaciones: [] };

/** Las iniciales de algo, para la insignia cuando no hay icono propio. */
const iniciales = (t: string) =>
  t.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '·';

export default function MenuLateral({ colapsado, onColapsar, activo }: {
  colapsado: boolean;
  onColapsar: (v: boolean) => void;
  activo?: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [datos, setDatos] = useState<DatosMenu>(VACIO);
  const [plegadas, setPlegadas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) { setDatos(VACIO); return; }
    fetch('/api/menu', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setDatos({ ...VACIO, ...d }))
      .catch(() => setDatos(VACIO));
  }, [user]);

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
    insignia: iniciales(p.titulo),
    destino: `/proyectos/${p.slug}`,
    // Los hijos se piden al desplegar, no antes.
    cargarHijos: async () => {
      const r = await fetch(`/api/proyectos/${p.id}/arbol`, { credentials: 'include' });
      const d = await r.json();
      if (!Array.isArray(d?.ramas)) return [];
      const ICONO: Record<string, any> = {
        tareas: ListChecks, paginas: FileText, esquemas: Globe2,
        mapas: MapIcon, productos: Package, personas: Users2,
      };
      return d.ramas.map((rama: any) => ({
        id: `${p.id}-${rama.clave}`,
        label: rama.label,
        icono: ICONO[rama.clave] || FolderKanban,
        cuantos: rama.hijos.length,
        hijos: rama.hijos.map((h: any) => ({
          id: h.id, label: h.label, icono: ICONO[rama.clave] || FolderKanban, destino: h.destino,
        })),
      }));
    },
  }));

  // --- 3. PRODUCTOS --------------------------------------------------------
  const nodosProductos: NodoMenu[] = datos.productos.map(p => ({
    id: p.id, label: p.nombre, icono: Package,
    destino: `/mercado?producto=${encodeURIComponent(p.id)}`,
  }));

  // --- 4. PERSONAS Y ORGANIZACIONES ---------------------------------------
  const nodosPersonas: NodoMenu[] = [
    ...(user ? [{
      id: 'yo', label: 'Mi Perfil', icono: User,
      destino: `/personas/${user.id}`,
    } as NodoMenu] : []),
    ...datos.personas.map(p => ({
      id: p.id,
      label: p.nombre,
      insignia: iniciales(p.nombre),
      // Una persona REAL tiene su perfil; una representación del Mundo 3D
      // vive dentro del mundo. No son lo mismo y no llevan al mismo sitio.
      destino: p.real ? `/personas/${p.id}` : `/juego?agente=${encodeURIComponent(p.id)}`,
    })),
    ...datos.organizaciones.map(o => ({
      id: o.id, label: o.nombre, icono: Users2,
      destino: `/organizaciones/${o.id}`,
    })),
  ];

  return (
    <aside
      className={cn('shrink-0 h-full border-r border-slate-200 bg-white flex flex-col transition-[width] duration-150',
        colapsado ? 'w-14' : 'w-60')}
    >
      {/* Marca + plegar */}
      <div className={cn('h-14 shrink-0 flex items-center border-b border-slate-200',
        colapsado ? 'justify-center' : 'px-3 gap-2')}>
        {!colapsado && (
          <button onClick={() => navigate('/')} className="min-w-0 flex-1 text-left hover:opacity-85 transition-opacity">
            <span className="text-sm font-extrabold tracking-tight text-slate-900">
              Humanity<span className="bg-gradient-to-b from-slate-500 via-slate-300 to-slate-600 bg-clip-text text-transparent"> Wiki</span>
            </span>
          </button>
        )}
        <button
          onClick={() => onColapsar(!colapsado)}
          title={colapsado ? 'Abrir el menú' : 'Plegar el menú'}
          className="w-9 h-9 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
        >
          {colapsado ? <PanelLeftOpen className="w-4.5 h-4.5" /> : <PanelLeftClose className="w-4.5 h-4.5" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 1 — PROYECTOS, arriba del todo */}
        <SeccionMenu
          titulo="Proyectos" icono={FolderKanban} colapsado={colapsado}
          plegada={!!plegadas.proyectos} onPlegar={() => plegar('proyectos')}
          cuantos={nodosProyectos.length}
          accion={!colapsado ? (
            <button onClick={() => abrir({ id: 'p', label: 'Mis proyectos', destino: '/proyectos' })}
              title="Ver todos los proyectos"
              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          ) : undefined}
        >
          {nodosProyectos.length === 0 && !colapsado && (
            <p className="px-2 py-1 text-[11px] text-slate-400 italic">Todavía no tienes proyectos.</p>
          )}
          {nodosProyectos.map(n => (
            <RamaMenu key={n.id} nodo={n} colapsado={colapsado} activo={activo} onAbrir={abrir} />
          ))}
        </SeccionMenu>

        {/* 2 — HERRAMIENTAS */}
        <SeccionMenu
          titulo="Herramientas" icono={Wrench} colapsado={colapsado}
          plegada={!!plegadas.herramientas} onPlegar={() => plegar('herramientas')}
          cuantos={HERRAMIENTAS.length}
        >
          {HERRAMIENTAS.map(n => (
            <RamaMenu key={n.id} nodo={n} colapsado={colapsado} activo={activo} onAbrir={abrir} />
          ))}
        </SeccionMenu>

        {/* 3 — PRODUCTOS Y SERVICIOS */}
        <SeccionMenu
          titulo="Productos" icono={Store} colapsado={colapsado}
          plegada={!!plegadas.productos} onPlegar={() => plegar('productos')}
          cuantos={nodosProductos.length}
          accion={!colapsado ? (
            <button onClick={() => abrir({ id: 'm', label: 'Mercado', destino: '/mercado' })}
              title="Ir al Mercado"
              className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-slate-100 transition-colors">
              <Store className="w-3.5 h-3.5" />
            </button>
          ) : undefined}
        >
          {nodosProductos.length === 0 && !colapsado && (
            <p className="px-2 py-1 text-[11px] text-slate-400 italic">Todavía no ofreces nada.</p>
          )}
          {nodosProductos.map(n => (
            <RamaMenu key={n.id} nodo={n} colapsado={colapsado} activo={activo} onAbrir={abrir} />
          ))}
        </SeccionMenu>

        {/* 4 — PERSONAS Y ORGANIZACIONES */}
        <SeccionMenu
          titulo="Personas" icono={Users2} colapsado={colapsado}
          plegada={!!plegadas.personas} onPlegar={() => plegar('personas')}
          cuantos={nodosPersonas.length}
        >
          {nodosPersonas.map(n => (
            <RamaMenu key={n.id} nodo={n} colapsado={colapsado} activo={activo} onAbrir={abrir} />
          ))}
        </SeccionMenu>
      </div>
    </aside>
  );
}
