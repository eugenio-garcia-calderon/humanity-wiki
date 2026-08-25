import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Loader2, Plus, X } from 'lucide-react';
import { componenteDeTrazo } from '../ui/iconosDeTrazo';
import { HojaPanel, type Herramienta } from './Rail';
import { cn } from '../../utils/cn';

/*
 * EL RAÍL DE LA DERECHA SON TUS PROYECTOS (2026-08-25, agente de APP/UX)
 * ============================================================================
 * Eugenio: «el menú lateral derecho pasa a ser un visor de todos los proyectos
 * del usuario, donde ahí están todos, cada uno con su icono, y de nuevo, si se
 * hace hover, se explica y se ven los nombres de cada proyecto. Y, al igual que
 * el izquierdo, sigue teniendo esa componente de poder desplegarlo en el
 * submenú, para poder ver dentro de cada proyecto lo que hay dentro, sin
 * necesidad de pinchar en él».
 *
 * ── POR QUÉ ESTO ES UN CAMBIO DE FONDO Y NO DE SITIO ───────────────────────
 * Hasta hoy el raíl de la derecha llevaba las herramientas y «Proyectos» era
 * UNA de ellas: para llegar a tu proyecto había que abrir una lista y buscarlo
 * dentro. Ahora **cada proyecto es una entrada del menú**, con su icono, y lo
 * que hay dentro se ve sin entrar. La diferencia práctica: pasas de dos gestos
 * y una lectura a un vistazo.
 *
 * ── LO QUE NO SE INVENTA ───────────────────────────────────────────────────
 * El icono sale del que cada proyecto tiene guardado (`icono`), el mismo que se
 * ve en su ficha. Si no tiene, cae en la carpeta genérica — nunca se elige uno
 * «que pegue» con el nombre, porque entonces dos proyectos parecidos saldrían
 * con dibujos distintos según qué palabra llevaran en el título.
 *
 * ── Y SI LA PETICIÓN FALLA, SE DICE ────────────────────────────────────────
 * Tres estados, no dos: cargando, la lista, y **el fallo**. Un `catch` que
 * devuelve lista vacía convierte «no hemos podido preguntar» en «no tienes
 * proyectos», y eso ya pasó en esta aplicación: Eugenio vio «todavía no tienes
 * proyectos» con cinco proyectos en la pantalla de al lado.
 */

export interface Proyecto {
  id: string;
  titulo: string;
  slug: string;
  icono?: string | null;
}

/** Lo que devuelve el enganche: la lista, `null` mientras carga, `'fallo'` si no se pudo. */
export type EstadoProyectos = Proyecto[] | 'fallo' | null;

export function useProyectos(activo = true) {
  const [estado, setEstado] = useState<EstadoProyectos>(null);

  const recargar = () => {
    setEstado(null);
    fetch('/api/proyectos', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(j => {
        // El servidor los llama `grupos` en algunos sitios y `proyectos` en
        // otros. Se aceptan los dos nombres y también la lista pelada: leer
        // sólo uno fue exactamente el fallo que dejó el panel diciendo «no
        // tienes páginas» con las páginas delante.
        const lista = Array.isArray(j) ? j : (j?.proyectos ?? j?.grupos ?? null);
        setEstado(Array.isArray(lista) ? lista : 'fallo');
      })
      .catch(() => setEstado('fallo'));
  };

  useEffect(() => { if (activo) recargar(); }, [activo]);
  return { estado, recargar };
}

/**
 * Los proyectos, con la forma que entiende el raíl. Así el raíl sigue siendo
 * UN componente que pinta una lista, y no hay un segundo raíl «igual pero para
 * proyectos» que se separaría del primero en la primera corrección.
 */
export function comoItems(proyectos: Proyecto[]): Herramienta[] {
  return proyectos.map(p => ({
    clave: `proyecto-${p.id}`,
    nombre: p.titulo || 'Sin título',
    icono: p.icono ? componenteDeTrazo(p.icono) : FolderKanban,
    ruta: `/proyectos/${p.slug}`,
    conPanel: true,
  }));
}

const ICONO_RAMA_ID: Record<string, string> = {
  tareas: 'Tareas', paginas: 'Páginas', esquemas: 'Esquemas', mapas: 'Mapas',
  productos: 'Productos', personas: 'Personas', archivos: 'Archivos',
  tablas: 'Tablas', eventos: 'Fechas', guardados: 'Guardados',
  publicaciones: 'Publicaciones',
};

/**
 * EL SUBMENÚ DE UN PROYECTO: lo que hay dentro, sin entrar.
 *
 * Pide `/api/proyectos/:id/arbol`, el mismo endpoint que usa la ficha del
 * proyecto. Un segundo endpoint «parecido» sería una segunda verdad sobre qué
 * contiene un proyecto, y esas dos siempre acaban discrepando.
 */
export function PanelProyecto({ proyecto, onCerrar }: { proyecto: Proyecto; onCerrar: () => void }) {
  const [arbol, setArbol] = useState<any[] | 'fallo' | null>(null);

  useEffect(() => {
    setArbol(null);
    fetch(`/api/proyectos/${proyecto.id}/arbol`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(d => setArbol(Array.isArray(d?.ramas) ? d.ramas : 'fallo'))
      .catch(() => setArbol('fallo'));
  }, [proyecto.id]);

  const vacio = Array.isArray(arbol) && arbol.every(r => !r.hijos?.length);

  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <h2 className="min-w-0 truncate text-sm font-black text-slate-900">{proyecto.titulo}</h2>
        <button onClick={onCerrar} title="Cerrar" aria-label="Cerrar el panel"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Abrir el proyecto entero sigue a un clic: el submenú enseña, no
          sustituye. */}
      <Link
        to={`/proyectos/${proyecto.slug}`}
        className="mx-3 mb-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-center text-[12px] font-bold text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
      >
        Abrir el proyecto
      </Link>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {arbol === null && (
          <p className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" /> Abriendo…
          </p>
        )}

        {/* NO SE DICE «ESTÁ VACÍO» CUANDO LO QUE PASA ES QUE NO SE PUDO
            PREGUNTAR. Son dos frases distintas porque son dos situaciones
            distintas, y confundirlas hace que alguien crea que ha perdido su
            trabajo. */}
        {arbol === 'fallo' && (
          <div className="px-2 py-3">
            <p className="text-[11px] leading-relaxed text-amber-700">
              No hemos podido abrir este proyecto. No es que esté vacío: es que
              no hemos podido preguntarlo.
            </p>
          </div>
        )}

        {vacio && <p className="px-2 py-2 text-[11px] text-slate-400">Este proyecto está vacío todavía.</p>}

        {Array.isArray(arbol) && arbol.map((rama: any) => (
          rama.hijos?.length ? (
            <div key={rama.clave} className="py-0.5">
              <p className="px-2 pb-0.5 pt-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                {rama.label || ICONO_RAMA_ID[rama.clave] || rama.clave}{' '}
                <span className="text-slate-300">{rama.hijos.length}</span>
              </p>
              {/* OCHO Y UN «VER TODO», no los cien que caben. Un submenú que
                  hay que recorrer con la rueda deja de ser un vistazo. */}
              {rama.hijos.slice(0, 8).map((h: any) => (
                <HojaPanel key={h.id} a={h.destino}>{h.label || 'Sin título'}</HojaPanel>
              ))}
              {rama.hijos.length > 8 && (
                <Link to={`/proyectos/${proyecto.slug}`}
                  className="block px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:underline">
                  Ver los {rama.hijos.length}
                </Link>
              )}
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}

/** El pie del raíl: crear un proyecto, y el aviso cuando la lista no cargó. */
export function PieProyectos({ estado, desplegado, onReintentar }: {
  estado: EstadoProyectos;
  desplegado: boolean;
  onReintentar: () => void;
}) {
  if (estado === 'fallo') {
    return (
      <div className="px-1.5 py-2">
        <button
          onClick={onReintentar}
          title="Volver a cargar tus proyectos"
          className={cn('flex h-9 items-center gap-2 rounded-xl px-[10px] text-[12px] font-bold text-amber-700 hover:bg-amber-50',
            desplegado ? 'w-full' : 'w-10 justify-center')}
        >
          <Loader2 className="h-4 w-4 shrink-0" />
          {desplegado && <span className="truncate">Reintentar</span>}
        </button>
      </div>
    );
  }
  return (
    <Link
      to="/proyectos?nuevo=1"
      title="Nuevo proyecto"
      className={cn('mb-1 flex h-9 shrink-0 items-center gap-3 rounded-xl px-[10px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900',
        desplegado ? 'w-full' : 'w-10 justify-center')}
    >
      <Plus className="h-4 w-4 shrink-0" />
      <span className={cn('overflow-hidden whitespace-nowrap text-left text-[12px] font-bold transition-all duration-200',
        desplegado ? 'w-auto opacity-100' : 'w-0 opacity-0')}>
        Nuevo proyecto
      </span>
    </Link>
  );
}
