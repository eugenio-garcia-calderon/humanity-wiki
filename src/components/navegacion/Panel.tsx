import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Plus, Search, X, FolderKanban, FileText, Globe2,
  Map as MapIcon, ListChecks, Table2, Store, Users2, Paperclip, CalendarDays,
  Bookmark, Megaphone, Loader2, CircleDot, Receipt, Sparkles,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';
import { OBJETIVOS, hablaDe } from '../../utils/objetivos';
import { useContextoNavegacion, type Contexto } from '../../utils/contextoNavegacion';
import { HojaPanel, type Herramienta } from './Rail';

/*
 * EL PANEL (2026-08-23, agente de APP/UX)
 * ============================================================================
 * Lo que hay DENTRO de la herramienta que has elegido en el raíl. Fondo blanco
 * y letras negras por decisión de Eugenio, y es la correcta: aquí se lee y se
 * pulsa, y eso se hace sobre papel.
 *
 * CADA HERRAMIENTA TIENE SU PROPIO PANEL, y esa es la parte del encargo que no
 * se puede hacer de una vez: «tienes que ir herramienta a herramienta mirando
 * cuál es el diseño del submenú». Hoy van dos, Proyectos y Páginas, elegidas
 * por él. El resto navegan directamente hasta que tengan el suyo — un panel
 * vacío que dice «próximamente» es peor que no tener panel.
 *
 * NO SE PIDEN LOS DATOS HASTA QUE SE ABRE. Trece paneles cargando su contenido
 * al arrancar serían trece peticiones para enseñar una. Cada panel pide lo suyo
 * en su `useEffect`, la primera vez que se le mira.
 *
 * LA CASCADA. Cada nivel entra escalonado, ~28 ms entre hermanos. No es
 * decoración: encadenados así, el ojo sigue el orden de la lista en vez de que
 * aparezcan quince líneas de golpe y haya que releerlas. Se apaga entera con
 * `prefers-reduced-motion`.
 */

const CASCADA = `
  @keyframes pn-entra { from { opacity: 0; transform: translateX(-6px) } to { opacity: 1; transform: none } }
  .pn-cascada > * { animation: pn-entra .22s ease-out both; }
  .pn-cascada > *:nth-child(1) { animation-delay: 0ms }
  .pn-cascada > *:nth-child(2) { animation-delay: 28ms }
  .pn-cascada > *:nth-child(3) { animation-delay: 56ms }
  .pn-cascada > *:nth-child(4) { animation-delay: 84ms }
  .pn-cascada > *:nth-child(5) { animation-delay: 112ms }
  .pn-cascada > *:nth-child(6) { animation-delay: 140ms }
  .pn-cascada > *:nth-child(7) { animation-delay: 168ms }
  .pn-cascada > *:nth-child(n+8) { animation-delay: 196ms }
  @media (prefers-reduced-motion: reduce) { .pn-cascada > * { animation: none } }
`;

export function EstilosPanel() {
  return <style dangerouslySetInnerHTML={{ __html: CASCADA }} />;
}

/** Los iconos de cada rama del árbol de un proyecto. Los mismos que en el menú
 *  de siempre y que en la portada: la misma cosa se dibuja igual en los tres
 *  sitios, o deja de reconocerse al cambiar de pantalla. */
const ICONO_RAMA: Record<string, any> = {
  tareas: ListChecks, paginas: FileText, esquemas: Globe2, mapas: MapIcon,
  productos: Store, personas: Users2, archivos: Paperclip, tablas: Table2,
  eventos: CalendarDays, guardados: Bookmark, publicaciones: Megaphone,
};

function Cabecera({ titulo, onCerrar }: { titulo: string; onCerrar: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 pb-2 pt-3">
      <h2 className="text-sm font-black text-slate-900">{titulo}</h2>
      <button onClick={onCerrar} title="Cerrar" aria-label="Cerrar el panel"
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Buscador({ valor, onCambiar, placeholder }: { valor: string; onCambiar: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative px-3 pb-2">
      <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        value={valor} onChange={e => onCambiar(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:outline-none"
      />
    </div>
  );
}

function Vacio({ children }: { children: any }) {
  return <p className="px-3 py-6 text-center text-xs leading-relaxed text-slate-400">{children}</p>;
}

/** El botón de crear. Uno por panel, siempre el mismo sitio y el mismo aspecto:
 *  si cada herramienta lo pone donde le parece, hay que buscarlo cada vez. */
function BotonCrear({ a, children }: { a: string; children: any }) {
  const navegar = useNavigate();
  return (
    <button
      onClick={() => navegar(a)}
      className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-[13px] font-bold text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
    >
      <Plus className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

/** El título de un grupo dentro de la lista. */
function Grupo({ icono: Icono, titulo, cuantos, a }: { icono?: any; titulo: string; cuantos?: number; a?: string }) {
  const clase = 'truncate text-[9px] font-black uppercase tracking-[0.15em] text-slate-400';
  return (
    <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-2">
      {Icono && <Icono className="h-3 w-3 shrink-0 text-slate-300" />}
      {a ? <Link to={a} className={cn(clase, 'hover:text-emerald-700')}>{titulo}</Link> : <span className={clase}>{titulo}</span>}
      {cuantos !== undefined && <span className="text-[10px] text-slate-300">{cuantos}</span>}
    </div>
  );
}

/*
 * PEDIR UNA LISTA, CON LOS TRES ESTADOS QUE TIENE DE VERDAD.
 *
 * Existe para que ningún panel pueda saltarse la regla raíz de la casa: **todo
 * tiene que poder decir «no lo sé» de forma distinguible de un resultado
 * válido**. Ya la incumplí una vez —el panel de Proyectos pintaba «todavía no
 * tienes proyectos» cuando lo que fallaba era la petición, y Eugenio lo vio en
 * producción con cinco proyectos en la pantalla de al lado—, así que aquí la
 * regla no se cumple por disciplina: se cumple porque no hay otra forma de
 * pedir datos en este fichero.
 *
 * `extrae` es para las respuestas que no son un array pelado. Se le pasa la
 * respuesta entera y devuelve la lista; si no puede, que lance — y entonces
 * sale «no lo sé», que es la verdad.
 */
/*
 * ══ EL CONTEXTO FILTRA LO QUE SE ENSEÑA (2026-08-25) ═══════════════════════
 * Eugenio: «si estoy explorando movilidad y le doy a páginas, me tienen que
 * aparecer todas las páginas de movilidad».
 *
 * DOS FILTROS, PORQUE SON DOS COSAS DISTINTAS:
 *
 *   · Por PROYECTO se filtra por el dato: cada cosa sabe en qué proyecto está
 *     (`proyecto_slug` o `proyecto_id`). Es exacto.
 *   · Por TEMA se filtra por las PALABRAS, con `hablaDe`, exactamente igual que
 *     el muro y las etiquetas de las tarjetas. **Y esto no es un atajo: es que
 *     no existe ninguna tabla que una una página con un objetivo.** Está escrito
 *     en `utils/objetivos.ts` desde que se creó. Filtrar aquí de otra forma
 *     inventaría una relación que la base no tiene, y además diría cosas
 *     distintas que el muro para el mismo contenido.
 *
 * Si el contexto no aplica —una lista cuyas cosas no llevan proyecto—, NO se
 * filtra y se devuelve todo. Devolver una lista vacía porque el dato no viaja
 * sería decir «no tienes nada» cuando lo cierto es «no lo sé».
 */
function aplicaContexto<T extends Record<string, any>>(lista: T[], ctx: Contexto, texto: (x: T) => string): T[] {
  if (ctx.proyecto) {
    const suyas = lista.filter(x => x.proyecto_slug === ctx.proyecto!.slug || x.proyecto?.slug === ctx.proyecto!.slug);
    // Si NINGUNA lleva proyecto, es que ese dato no viaja en esta lista: se
    // enseña entera en vez de fingir que está vacía.
    const alguienLoTrae = lista.some(x => 'proyecto_slug' in x || 'proyecto_id' in x || 'proyecto' in x);
    return alguienLoTrae ? suyas : lista;
  }
  if (ctx.tema) {
    const obj = OBJETIVOS.find(o => o.id === ctx.tema!.id);
    if (!obj) return lista;
    return lista.filter(x => hablaDe(texto(x), obj));
  }
  return lista;
}

function useLista<T = any>(url: string, extrae?: (j: any) => T[]) {
  const [estado, setEstado] = useState<T[] | 'fallo' | null>(null);
  const pedir = () => {
    setEstado(null);
    fetch(url, { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        const l = extrae ? extrae(j) : j;
        if (!Array.isArray(l)) throw new Error('respuesta inesperada');
        return l as T[];
      })
      .then(setEstado)
      .catch(() => setEstado('fallo'));
  };
  useEffect(pedir, [url]);
  return { estado, datos: Array.isArray(estado) ? estado : [], recargar: pedir };
}

/** Lo que se pinta mientras la lista no es una lista. */
function Estado({ estado, que, onReintentar }: { estado: any; que: string; onReintentar: () => void }) {
  if (estado === null) return <Vacio>Cargando…</Vacio>;
  if (estado !== 'fallo') return null;
  return (
    <div className="px-3 py-4">
      <p className="text-xs leading-relaxed text-amber-700">
        No hemos podido cargar {que}. No es que no tengas: es que no hemos podido preguntarlo.
      </p>
      <button onClick={onReintentar}
        className="mt-2 rounded-lg border border-amber-300 px-2.5 py-1.5 text-[12px] font-bold text-amber-800 hover:bg-amber-50">
        Volver a intentarlo
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PROYECTOS — el que describió Eugenio: «cuando haces click en uno de ellos
// tiene que aparecerte cierta información relativa a poder ver las tareas,
// personas asociadas, todo en cascada».
//
// Se despliega pidiendo `/api/proyectos/:id/arbol`, el MISMO endpoint que usan
// el menú de siempre y la página del proyecto. Escribir aquí una tercera
// consulta sería la tercera lista de «qué hay en un proyecto» que se separa de
// las otras dos en cuanto alguien añada una tabla a una y no a las demás.
// ---------------------------------------------------------------------------
function PanelProyectos({ onCerrar }: { onCerrar: () => void }) {
  /*
   * TRES ESTADOS, NO DOS: cargando (`null`), una lista, o un FALLO.
   *
   * La primera versión hacía `.catch(() => setProyectos([]))`, y eso pinta
   * «Todavía no tienes proyectos» cuando lo que ha pasado es que la petición
   * se ha caído. Eugenio lo vio en producción: el panel decía que no tenía
   * ninguno mientras la página de al lado enseñaba cinco.
   *
   * Es la regla raíz de esta plataforma incumplida por mí, y está escrita en
   * `src/server/CLAUDE.md`: **todo tiene que poder decir «no lo sé» de una
   * forma distinguible de un resultado válido**. Un fallo convertido en cero
   * no es un cero: es una mentira que además parece un dato.
   */
  const [proyectos, setProyectos] = useState<any[] | 'fallo' | null>(null);
  const [busca, setBusca] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [arboles, setArboles] = useState<Record<string, any[] | 'cargando'>>({});
  const navegar = useNavigate();

  const recargar = () => {
    fetch('/api/proyectos', { credentials: 'include' })
      .then(async r => {
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        // Si un día deja de ser un array, quiero enterarme, no enseñar cero.
        if (!Array.isArray(j)) throw new Error('respuesta inesperada');
        return j;
      })
      .then(setProyectos)
      .catch(() => setProyectos('fallo'));
  };

  useEffect(recargar, []);

  const desplegar = (p: any) => {
    if (abierto === p.id) { setAbierto(null); return; }
    setAbierto(p.id);
    if (arboles[p.id]) return;
    setArboles(a => ({ ...a, [p.id]: 'cargando' }));
    fetch(`/api/proyectos/${p.id}/arbol`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { ramas: [] })
      .then(d => setArboles(a => ({ ...a, [p.id]: Array.isArray(d?.ramas) ? d.ramas : [] })))
      .catch(() => setArboles(a => ({ ...a, [p.id]: [] })));
  };

  const lista = Array.isArray(proyectos) ? proyectos : [];
  const visibles = lista.filter(p =>
    !busca.trim() || (p.titulo || '').toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <>
      <Cabecera titulo="Proyectos" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar un proyecto…" />

      <button
        onClick={() => navegar('/proyectos?nuevo=1')}
        className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-[13px] font-bold text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
      >
        <Plus className="h-3.5 w-3.5" /> Nuevo proyecto
      </button>

      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {proyectos === null && <Vacio>Cargando…</Vacio>}
        {proyectos === 'fallo' && (
          <div className="px-3 py-4">
            <p className="text-xs leading-relaxed text-amber-700">
              No hemos podido cargar tus proyectos. No es que no tengas: es que
              no hemos podido preguntarlo.
            </p>
            <button onClick={() => { setProyectos(null); recargar(); }}
              className="mt-2 rounded-lg border border-amber-300 px-2.5 py-1.5 text-[12px] font-bold text-amber-800 hover:bg-amber-50">
              Volver a intentarlo
            </button>
          </div>
        )}
        {Array.isArray(proyectos) && visibles.length === 0 && (
          <Vacio>{busca ? 'Ningún proyecto con ese nombre.' : 'Todavía no tienes proyectos. Empieza por el botón de arriba.'}</Vacio>
        )}
        {visibles.map(p => {
          const desplegado = abierto === p.id;
          const arbol = arboles[p.id];
          return (
            <div key={p.id}>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => desplegar(p)}
                  aria-expanded={desplegado}
                  aria-label={desplegado ? `Plegar ${p.titulo}` : `Desplegar ${p.titulo}`}
                  className="grid h-7 w-6 shrink-0 place-items-center rounded text-slate-400 hover:text-slate-800"
                >
                  <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', desplegado && 'rotate-90')} />
                </button>
                {/* El nombre NAVEGA y la flecha DESPLIEGA: son dos cosas
                    distintas y por eso son dos zonas distintas. Un solo botón
                    que hiciera las dos obliga a elegir cuál de las dos sorprende. */}
                <Link
                  to={`/proyectos/${p.slug}`}
                  className="min-w-0 flex-1 truncate rounded-lg px-1.5 py-1.5 text-[13px] font-bold text-slate-800 hover:bg-slate-100"
                >
                  {p.titulo}
                </Link>
              </div>

              {desplegado && (
                <div className="pn-cascada ml-6 border-l border-slate-100 pl-2">
                  {arbol === 'cargando' && (
                    <p className="flex items-center gap-1.5 px-2 py-2 text-[11px] text-slate-400">
                      <Loader2 className="h-3 w-3 animate-spin" /> Abriendo…
                    </p>
                  )}
                  {Array.isArray(arbol) && arbol.length === 0 && (
                    <p className="px-2 py-2 text-[11px] text-slate-400">Este proyecto está vacío todavía.</p>
                  )}
                  {Array.isArray(arbol) && arbol.map((rama: any) => (
                    <div key={rama.clave} className="py-0.5">
                      <p className="px-2 pb-0.5 pt-1 text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                        {rama.label} <span className="text-slate-300">{rama.hijos.length}</span>
                      </p>
                      {rama.hijos.slice(0, 8).map((h: any) => (
                        <HojaPanel key={h.id} a={h.destino} icono={ICONO_RAMA[rama.clave]}>{h.label || 'Sin título'}</HojaPanel>
                      ))}
                      {rama.hijos.length > 8 && (
                        <Link to={`/proyectos/${p.slug}`} className="block px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:underline">
                          y {rama.hijos.length - 8} más →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// PÁGINAS — agrupadas por el proyecto del que cuelgan, y las sueltas al final.
// `/api/paginas` ya devuelve ese reparto hecho, incluido el grupo `__sueltas__`
// y los proyectos vacíos: un cajón vacío tiene que verse para poder usarlo.
// ---------------------------------------------------------------------------
function PanelPaginas({ onCerrar }: { onCerrar: () => void }) {
  const [grupos, setGrupos] = useState<any[] | null>(null);
  const [busca, setBusca] = useState('');
  const navegar = useNavigate();

  useEffect(() => {
    fetch('/api/paginas', { credentials: 'include' })
      .then(r => r.json())
      // LA CLAVE ES `proyectos`, NO `grupos` (2026-08-23). Escribí `grupos`
      // porque así se llama la variable DENTRO del servidor —`const grupos = new
      // Map()`— y no miré cómo sale. El panel decía «todavía no tienes páginas»
      // con toda la calma del mundo, que es exactamente el fallo peor: una
      // respuesta correcta leída mal se ve igual que un cajón vacío.
      .then(j => setGrupos(Array.isArray(j?.proyectos) ? j.proyectos : Array.isArray(j) ? j : []))
      .catch(() => setGrupos([]));
  }, []);

  const q = busca.trim().toLowerCase();
  /* EL CONTEXTO MANDA ANTES QUE EL BUSCADOR: primero se decide QUÉ lista es
     ésta —las de este proyecto, las de este tema o todas— y después se busca
     dentro. Al revés, escribir una palabra sacaría cosas de otros proyectos. */
  const contexto = useContextoNavegacion();
  const visibles = (grupos || [])
    .filter((g: any) => !contexto.proyecto || g.slug === contexto.proyecto.slug)
    .map(g => ({
      ...g,
      paginas: aplicaContexto<any>(g.paginas || [], contexto, (p: any) => p.title || '')
        .filter((p: any) => !q || (p.title || '').toLowerCase().includes(q)),
    }))
    // Con búsqueda, un grupo sin resultados estorba. Sin búsqueda, un proyecto
    // vacío se enseña: es donde vas a soltar la primera página.
    .filter(g => (q ? g.paginas.length > 0 : true));

  const cuantas = visibles.reduce((n, g) => n + g.paginas.length, 0);

  return (
    <>
      <Cabecera titulo="Páginas" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar en tus páginas…" />

      <button
        onClick={() => navegar('/paginas?nueva=1')}
        className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-2 text-[13px] font-bold text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-700"
      >
        <Plus className="h-3.5 w-3.5" /> Nueva página
      </button>

      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {grupos === null && <Vacio>Cargando…</Vacio>}
        {grupos !== null && cuantas === 0 && (
          <Vacio>{q ? 'Ninguna página con ese texto.' : 'Todavía no tienes páginas. Empieza por el botón de arriba.'}</Vacio>
        )}
        {visibles.map(g => (
          <div key={g.id} className="py-0.5">
            <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-1.5">
              {g.sueltas
                ? <FileText className="h-3 w-3 shrink-0 text-slate-300" />
                : <FolderKanban className="h-3 w-3 shrink-0 text-slate-300" />}
              {g.url
                ? <Link to={g.url} className="truncate text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 hover:text-emerald-700">{g.titulo}</Link>
                : <span className="truncate text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">{g.titulo}</span>}
              <span className="text-[10px] text-slate-300">{g.paginas.length}</span>
            </div>
            {g.paginas.length === 0 && (
              <p className="px-2.5 py-1 text-[11px] italic text-slate-300">Sin páginas todavía</p>
            )}
            {g.paginas.map((p: any) => (
              <HojaPanel key={p.id} a={`/paginas/${p.id}`} icono={FileText} insignia={p.publico ? '' : undefined}>
                {p.title || 'Sin título'}
              </HojaPanel>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}


// ---------------------------------------------------------------------------
// MAPAS — se agrupan por DE QUIÉN SON, no por proyecto: `/api/maps` no
// devuelve `proyecto_id`, y además lo que distingue un mapa aquí es si es tuyo
// o es de la plataforma. El Mapa de Indicadores de la Humanidad no es «uno de
// tus mapas»: es el mapa común, y mezclarlo con los tuyos haría pensar que lo
// puedes editar.
// ---------------------------------------------------------------------------
function PanelMapas({ onCerrar }: { onCerrar: () => void }) {
  const { estado, datos, recargar } = useLista<any>('/api/maps');
  const [busca, setBusca] = useState('');
  const { user } = useAuth();
  const q = busca.trim().toLowerCase();

  const filtra = (l: any[]) => l.filter(m => !q || (m.title || '').toLowerCase().includes(q));
  const mios = filtra(datos.filter(m => user && m.creator_user_id === user.id));
  const comunes = filtra(datos.filter(m => !user || m.creator_user_id !== user.id));

  return (
    <>
      <Cabecera titulo="Mapas" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar un mapa…" />
      <BotonCrear a="/mapas?nuevo=1">Nuevo mapa</BotonCrear>

      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={estado} que="los mapas" onReintentar={recargar} />
        {Array.isArray(estado) && mios.length === 0 && comunes.length === 0 && (
          <Vacio>{q ? 'Ningún mapa con ese nombre.' : 'Todavía no hay mapas.'}</Vacio>
        )}
        {/* «Tuyos» se enseña aunque esté vacío cuando no hay búsqueda: es el
            cajón donde va a caer el primero, y un cajón vacío tiene que verse
            para poder usarlo. */}
        {Array.isArray(estado) && user && (mios.length > 0 || !q) && (
          <div>
            <Grupo icono={MapIcon} titulo="Tuyos" cuantos={mios.length} />
            {mios.length === 0 && <p className="px-2.5 py-1 text-[11px] italic text-slate-300">Sin mapas todavía</p>}
            {mios.map(m => <HojaPanel key={m.id} a={`/mapas/${m.slug}`} icono={MapIcon}>{m.title || 'Sin título'}</HojaPanel>)}
          </div>
        )}
        {Array.isArray(estado) && comunes.length > 0 && (
          <div>
            <Grupo icono={Globe2} titulo="De la plataforma" cuantos={comunes.length} />
            {comunes.map(m => <HojaPanel key={m.id} a={`/mapas/${m.slug}`} icono={MapIcon}>{m.title || 'Sin título'}</HojaPanel>)}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// TAREAS — la única de las cinco que NO agrupa por dónde vive la cosa, sino por
// EN QUÉ ESTADO ESTÁ. Y es a propósito: a las tareas se les pregunta «¿qué me
// queda?», no «¿dónde está esto?». Agruparlas por proyecto sería repetir el
// panel de Proyectos con otro nombre.
//
// «Por hacer» va primero y «Hecho» al final, porque el orden de una lista es una
// afirmación sobre qué mirar antes.
// ---------------------------------------------------------------------------
const ESTADOS_TAREA = [
  { clave: 'por_hacer', label: 'Por hacer', color: 'text-slate-400' },
  { clave: 'en_curso',  label: 'En curso',  color: 'text-amber-500' },
  { clave: 'hecho',     label: 'Hecho',     color: 'text-emerald-500' },
];

function PanelTareas({ onCerrar }: { onCerrar: () => void }) {
  const { estado, datos, recargar } = useLista<any>('/api/roadmap');
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const visibles = datos.filter(t => !q || (t.titulo || '').toLowerCase().includes(q));

  return (
    <>
      <Cabecera titulo="Tareas" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar una tarea…" />
      <BotonCrear a="/tareas?nueva=1">Nueva tarea</BotonCrear>

      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={estado} que="las tareas" onReintentar={recargar} />
        {Array.isArray(estado) && visibles.length === 0 && (
          <Vacio>{q ? 'Ninguna tarea con ese texto.' : 'No tienes tareas. Se crean dentro de un proyecto.'}</Vacio>
        )}
        {Array.isArray(estado) && ESTADOS_TAREA.map(e => {
          const suyas = visibles.filter(t => (t.estado || 'por_hacer') === e.clave);
          // Aquí un grupo vacío SÍ se esconde: «Hecho 0» no es un cajón donde
          // soltar nada, es una línea que ocupa sitio para decir que no hay nada.
          if (!suyas.length) return null;
          return (
            <div key={e.clave}>
              <Grupo icono={CircleDot} titulo={e.label} cuantos={suyas.length} />
              {suyas.slice(0, 30).map(t => (
                <HojaPanel key={t.id} a={`/tareas?tarea=${encodeURIComponent(t.id)}`} icono={ListChecks}>
                  {t.titulo || 'Sin título'}
                </HojaPanel>
              ))}
              {suyas.length > 30 && (
                <Link to="/tareas" className="block px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:underline">
                  y {suyas.length - 30} más →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// COMERCIO — el panel de GESTIÓN, y por eso es el que más se sale del molde.
// Los otros cuatro contestan «¿qué tengo?»; éste contesta «¿qué me falta por
// atender?», y la respuesta de arriba del todo es un número: los pedidos que
// esperan. Un panel de comercio que enseñe tus productos y esconda los pedidos
// sin enviar está ordenado y es inútil.
//
// LAS DOS LISTAS SE PIDEN POR SEPARADO y cada una puede fallar sola. Si caen las
// ventas, tus productos se siguen viendo — y se dice cuál de las dos falta, en
// vez de dejar el panel a medias sin explicación.
// ---------------------------------------------------------------------------
function PanelComercio({ onCerrar }: { onCerrar: () => void }) {
  const productos = useLista<any>('/api/publicar/mis-productos', j => (Array.isArray(j) ? j : j?.productos ?? j?.items));
  const ventas = useLista<any>('/api/publicar/mis-ventas', j => (Array.isArray(j) ? j : j?.ventas ?? j?.pedidos ?? j?.items));
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();

  const mis = productos.datos.filter(p => !q || (p.nombre || p.name || '').toLowerCase().includes(q));
  // «Pendiente» es todo lo que no está entregado ni cancelado: prefiero contar de
  // más y que mires, a contar de menos y que se te pase un pedido.
  const pendientes = ventas.datos.filter(v => !['entregado', 'cancelado', 'reembolsado'].includes(String(v.estado || '')));

  return (
    <>
      <Cabecera titulo="Comercio" onCerrar={onCerrar} />

      {/* LO QUE HAY QUE ATENDER, ANTES QUE LO QUE TIENES. */}
      {Array.isArray(ventas.estado) && (
        <Link
          to="/comercio"
          className={cn(
            'mx-3 mb-2 flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors',
            pendientes.length > 0
              ? 'bg-amber-50 text-amber-900 hover:bg-amber-100'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100',
          )}
        >
          <span className="text-[13px] font-bold">
            {pendientes.length > 0 ? 'Pedidos por atender' : 'Nada pendiente'}
          </span>
          <span className={cn('text-lg font-black', pendientes.length > 0 ? 'text-amber-700' : 'text-slate-300')}>
            {pendientes.length}
          </span>
        </Link>
      )}
      <Estado estado={ventas.estado} que="tus ventas" onReintentar={ventas.recargar} />

      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar en lo que vendes…" />
      <BotonCrear a="/comercio?nuevo=1">Nuevo producto</BotonCrear>

      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={productos.estado} que="tus productos" onReintentar={productos.recargar} />
        {Array.isArray(productos.estado) && (
          <div>
            <Grupo icono={Store} titulo="Lo que vendes" cuantos={mis.length} a="/comercio" />
            {mis.length === 0 && (
              <p className="px-2.5 py-1 text-[11px] italic text-slate-300">
                {q ? 'Nada con ese nombre' : 'Todavía no vendes nada'}
              </p>
            )}
            {mis.map(p => (
              <HojaPanel key={p.id} a={`/comercio?producto=${encodeURIComponent(p.id)}`} icono={Store}>
                {p.nombre || p.name || 'Sin nombre'}
              </HojaPanel>
            ))}
          </div>
        )}
        {Array.isArray(ventas.estado) && ventas.datos.length > 0 && (
          <div>
            <Grupo icono={Receipt} titulo="Últimas ventas" cuantos={ventas.datos.length} a="/comercio" />
            {ventas.datos.slice(0, 8).map((v: any) => (
              <HojaPanel key={v.id} a="/comercio" icono={Receipt}>
                {v.producto_nombre || v.titulo || `Pedido ${String(v.codigo || v.id).slice(0, 8)}`}
              </HojaPanel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}


// ---------------------------------------------------------------------------
// ESQUEMAS — igual que Mapas, y a propósito: son la misma clase de cosa (un
// lienzo que alguien construyó) y lo que las distingue es de quién son. Dos
// herramientas parecidas con dos formas distintas de panel obligarían a
// aprender dos veces lo mismo.
// ---------------------------------------------------------------------------
function PanelEsquemas({ onCerrar }: { onCerrar: () => void }) {
  const { estado, datos, recargar } = useLista<any>('/api/graphs');
  const [busca, setBusca] = useState('');
  const { user } = useAuth();
  const q = busca.trim().toLowerCase();
  const filtra = (l: any[]) => l.filter(g => !q || (g.title || '').toLowerCase().includes(q));
  const mios = filtra(datos.filter(g => user && g.creator_user_id === user.id));
  const otros = filtra(datos.filter(g => !user || g.creator_user_id !== user.id));

  return (
    <>
      <Cabecera titulo="Esquemas" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar un esquema…" />
      <BotonCrear a="/esquemas?nuevo=1">Nuevo esquema</BotonCrear>
      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={estado} que="los esquemas" onReintentar={recargar} />
        {Array.isArray(estado) && !mios.length && !otros.length && (
          <Vacio>{q ? 'Ningún esquema con ese nombre.' : 'Todavía no hay esquemas.'}</Vacio>
        )}
        {Array.isArray(estado) && user && (mios.length > 0 || !q) && (
          <div>
            <Grupo icono={Globe2} titulo="Tuyos" cuantos={mios.length} />
            {!mios.length && <p className="px-2.5 py-1 text-[11px] italic text-slate-300">Sin esquemas todavía</p>}
            {mios.map(g => (
              <HojaPanel key={g.id} a={`/esquemas/${g.slug}`} icono={Globe2} insignia={g.window_count || undefined}>
                {g.title || 'Sin título'}
              </HojaPanel>
            ))}
          </div>
        )}
        {Array.isArray(estado) && otros.length > 0 && (
          <div>
            <Grupo icono={Globe2} titulo="De la plataforma" cuantos={otros.length} />
            {otros.map(g => (
              <HojaPanel key={g.id} a={`/esquemas/${g.slug}`} icono={Globe2} insignia={g.window_count || undefined}>
                {g.title || 'Sin título'}
              </HojaPanel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// TABLAS — por el proyecto del que cuelgan, como las Páginas. Hacen falta DOS
// peticiones porque `/api/bd/tablas` devuelve `proyecto_id` y no el nombre del
// proyecto, y agrupar por un identificador que nadie reconoce no es agrupar.
// Si falla la de proyectos, las tablas se siguen viendo: caen todas al grupo
// «Sueltas», que es peor que lo ideal y mejor que una pantalla vacía.
// ---------------------------------------------------------------------------
function PanelTablas({ onCerrar }: { onCerrar: () => void }) {
  const tablas = useLista<any>('/api/bd/tablas', j => (Array.isArray(j) ? j : j?.tablas));
  const proyectos = useLista<any>('/api/proyectos');
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const nombreDe = new Map(proyectos.datos.map((p: any) => [p.id, p]));

  const visibles = tablas.datos.filter(t => !q || (t.titulo || '').toLowerCase().includes(q));
  const grupos = new Map<string, { titulo: string; url: string | null; items: any[] }>();
  for (const t of visibles) {
    const p = t.proyecto_id ? nombreDe.get(t.proyecto_id) : null;
    const clave = p ? String(t.proyecto_id) : '__sueltas__';
    if (!grupos.has(clave)) {
      grupos.set(clave, p
        ? { titulo: (p as any).titulo, url: `/proyectos/${(p as any).slug}`, items: [] }
        : { titulo: 'Sueltas', url: null, items: [] });
    }
    grupos.get(clave)!.items.push(t);
  }

  return (
    <>
      <Cabecera titulo="Tablas" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar una tabla…" />
      <BotonCrear a="/tablas?nueva=1">Nueva tabla</BotonCrear>
      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={tablas.estado} que="las tablas" onReintentar={tablas.recargar} />
        {Array.isArray(tablas.estado) && visibles.length === 0 && (
          <Vacio>{q ? 'Ninguna tabla con ese nombre.' : 'Todavía no tienes tablas.'}</Vacio>
        )}
        {[...grupos.values()].map(g => (
          <div key={g.titulo}>
            <Grupo icono={g.url ? FolderKanban : Table2} titulo={g.titulo} cuantos={g.items.length} a={g.url ?? undefined} />
            {g.items.map(t => (
              <HojaPanel key={t.id} a={`/tablas?tabla=${encodeURIComponent(t.id)}`} icono={Table2} insignia={t.filas || undefined}>
                {t.titulo || 'Sin título'}
              </HojaPanel>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// PUBLICACIONES — el muro es de todos, así que el panel no lo repite: enseña
// LO TUYO, que es lo único de esa herramienta sobre lo que puedes actuar.
// Meter aquí las publicaciones de los demás sería una segunda copia del muro
// en una columna de 288 px, donde se lee peor que en la página.
// ---------------------------------------------------------------------------
function PanelPublicaciones({ onCerrar }: { onCerrar: () => void }) {
  const { user } = useAuth();
  const url = user ? `/api/publicaciones?autor=${encodeURIComponent(user.id)}&limit=120` : '/api/publicaciones?limit=40';
  const { estado, datos, recargar } = useLista<any>(url);
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const visibles = datos.filter(p => !q || (p.titulo || '').toLowerCase().includes(q));

  return (
    <>
      <Cabecera titulo="Publicaciones" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar en lo tuyo…" />
      <BotonCrear a="/explorar?crear=1">Publicar algo</BotonCrear>
      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={estado} que="tus publicaciones" onReintentar={recargar} />
        {Array.isArray(estado) && (
          <>
            <Grupo icono={Megaphone} titulo={user ? 'Lo que has publicado' : 'Lo último'} cuantos={visibles.length} a="/explorar" />
            {visibles.length === 0 && (
              <p className="px-2.5 py-1 text-[11px] italic text-slate-300">
                {q ? 'Nada con ese texto' : 'Todavía no has publicado nada'}
              </p>
            )}
            {visibles.slice(0, 40).map(p => (
              <HojaPanel key={`${p.tipo}-${p.id}`} a={p.ruta || `/explorar?abrir=${encodeURIComponent(p.id)}`} icono={Megaphone}>
                {p.titulo || 'Sin título'}
              </HojaPanel>
            ))}
          </>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// ASISTENTE — tus conversaciones, de la más reciente a la más vieja. Es la
// herramienta cuyo contenido envejece más rápido, así que se agrupa por CUÁNDO,
// que es como se busca una conversación: «la de esta mañana».
// ---------------------------------------------------------------------------
function PanelIA({ onCerrar }: { onCerrar: () => void }) {
  const { estado, datos, recargar } = useLista<any>('/api/ai/conversations');
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const visibles = datos.filter(c => !q || (c.title || '').toLowerCase().includes(q));

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const semana = new Date(hoy.getTime() - 6 * 864e5);
  const cuando = (c: any) => {
    const f = new Date(c.updated_at || c.created_at || 0);
    return f >= hoy ? 'Hoy' : f >= semana ? 'Esta semana' : 'Antes';
  };
  const bloques = ['Hoy', 'Esta semana', 'Antes'];

  return (
    <>
      <Cabecera titulo="Asistente" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar una conversación…" />
      <BotonCrear a="/ia">Nueva conversación</BotonCrear>
      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={estado} que="tus conversaciones" onReintentar={recargar} />
        {Array.isArray(estado) && visibles.length === 0 && (
          <Vacio>{q ? 'Ninguna conversación con ese texto.' : 'Todavía no has hablado con el asistente.'}</Vacio>
        )}
        {Array.isArray(estado) && bloques.map(b => {
          const suyas = visibles.filter(c => cuando(c) === b);
          if (!suyas.length) return null;
          return (
            <div key={b}>
              <Grupo icono={Sparkles} titulo={b} cuantos={suyas.length} />
              {suyas.slice(0, 25).map(c => (
                <HojaPanel key={c.id} a={`/ia?conversacion=${encodeURIComponent(c.id)}`} icono={Sparkles} insignia={c.message_count || undefined}>
                  {c.title || 'Sin título'}
                </HojaPanel>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// CALENDARIO — el único que agrupa por TIEMPO, y es el que más lo pide: a una
// fecha se le pregunta «¿qué tengo hoy?». Lo pasado va al final y plegado en la
// cuenta, porque estorba sin llegar a sobrar del todo.
// ---------------------------------------------------------------------------
function PanelCalendario({ onCerrar }: { onCerrar: () => void }) {
  /*
   * `/api/calendario` PIDE UN TRAMO y devuelve `{ items }`, no un array pelado.
   * Lo escribí sin mirar y contestó **400 «Faltan las fechas del tramo»** — que
   * el panel enseñó como «no hemos podido cargar el calendario», que es
   * exactamente lo que tenía que hacer. La señal funcionó: fue el único de los
   * once que se quejó, y por eso se encontró en un minuto en vez de quedarse
   * vacío y en silencio como habría pasado con la versión de ayer.
   *
   * El tramo va de tres meses atrás a un año adelante: lo pasado se enseña
   * plegado en su grupo, y un año por delante cubre cualquier cosa que alguien
   * apunte de verdad sin traerse el calendario entero.
   */
  const tramo = useMemo(() => {
    const d = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
    const h = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
    return `/api/calendario?desde=${d}&hasta=${h}`;
  }, []);
  const { estado, datos, recargar } = useLista<any>(tramo, j => (Array.isArray(j) ? j : j?.items));
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const visibles = datos.filter(e => !q || (e.titulo || '').toLowerCase().includes(q));

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy.getTime() + 864e5);
  const semana = new Date(hoy.getTime() + 7 * 864e5);
  const grupo = (e: any) => {
    const f = new Date(e.inicio || 0);
    if (f < hoy) return 'Pasadas';
    if (f < manana) return 'Hoy';
    if (f < semana) return 'Esta semana';
    return 'Más adelante';
  };
  const orden = ['Hoy', 'Esta semana', 'Más adelante', 'Pasadas'];
  const dia = (e: any) => new Date(e.inicio).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

  return (
    <>
      <Cabecera titulo="Calendario" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar una fecha…" />
      <BotonCrear a="/calendario?nuevo=1">Nueva fecha</BotonCrear>
      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={estado} que="el calendario" onReintentar={recargar} />
        {Array.isArray(estado) && visibles.length === 0 && (
          <Vacio>{q ? 'Ninguna fecha con ese texto.' : 'No tienes nada en el calendario.'}</Vacio>
        )}
        {Array.isArray(estado) && orden.map(g => {
          const suyas = visibles.filter(e => grupo(e) === g)
            .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
          if (!suyas.length) return null;
          return (
            <div key={g}>
              <Grupo icono={CalendarDays} titulo={g} cuantos={suyas.length} />
              {suyas.slice(0, 20).map(e => (
                <HojaPanel key={e.id} a="/calendario" icono={CalendarDays} insignia={dia(e)}>
                  {e.titulo || 'Sin título'}
                </HojaPanel>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// ARCHIVOS — por TIPO, no por proyecto. Es lo que distingue este panel del de
// Proyectos: cuando buscas un archivo suelto sabes qué era —una foto, un
// vídeo, un PDF— antes de acordarte de dónde estaba.
// ---------------------------------------------------------------------------
const TIPOS_ARCHIVO: Array<{ kind: string[]; label: string; icono: any }> = [
  { kind: ['imagen'], label: 'Imágenes', icono: Paperclip },
  { kind: ['video'], label: 'Vídeos', icono: Paperclip },
  { kind: ['enlace'], label: 'Enlaces', icono: Bookmark },
  { kind: ['pagina', 'documento'], label: 'Documentos', icono: FileText },
];

function PanelArchivos({ onCerrar }: { onCerrar: () => void }) {
  const { estado, datos, recargar } = useLista<any>('/api/archivos', j => (Array.isArray(j) ? j : j?.archivos ?? j?.items));
  const [busca, setBusca] = useState('');
  const q = busca.trim().toLowerCase();
  const visibles = datos.filter(a => !q || (a.title || '').toLowerCase().includes(q));
  const conocidos = TIPOS_ARCHIVO.flatMap(t => t.kind);
  const otros = visibles.filter(a => !conocidos.includes(a.kind));

  return (
    <>
      <Cabecera titulo="Archivos" onCerrar={onCerrar} />
      <Buscador valor={busca} onCambiar={setBusca} placeholder="Buscar un archivo…" />
      <BotonCrear a="/archivos">Subir un archivo</BotonCrear>
      <div className="pn-cascada min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <Estado estado={estado} que="tus archivos" onReintentar={recargar} />
        {Array.isArray(estado) && visibles.length === 0 && (
          <Vacio>{q ? 'Nada con ese nombre.' : 'Todavía no has subido nada.'}</Vacio>
        )}
        {Array.isArray(estado) && TIPOS_ARCHIVO.map(t => {
          const suyos = visibles.filter(a => t.kind.includes(a.kind));
          if (!suyos.length) return null;
          return (
            <div key={t.label}>
              <Grupo icono={t.icono} titulo={t.label} cuantos={suyos.length} />
              {suyos.slice(0, 20).map(a => (
                <HojaPanel key={a.id} a={`/archivos?abrir=${encodeURIComponent(a.id)}`} icono={t.icono}>
                  {a.title || 'Sin título'}
                </HojaPanel>
              ))}
            </div>
          );
        })}
        {/* «Otros» existe para que nada desaparezca por no encajar en la lista
            de tipos de arriba. Un archivo que no se ve en ninguna parte porque
            su `kind` es nuevo es peor que un grupo con nombre feo. */}
        {Array.isArray(estado) && otros.length > 0 && (
          <div>
            <Grupo icono={Paperclip} titulo="Otros" cuantos={otros.length} />
            {otros.slice(0, 20).map(a => (
              <HojaPanel key={a.id} a={`/archivos?abrir=${encodeURIComponent(a.id)}`} icono={Paperclip}>
                {a.title || 'Sin título'}
              </HojaPanel>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/*
 * Y DOS QUE NO TIENEN PANEL, A PROPÓSITO (2026-08-23)
 * ---------------------------------------------------------------------------
 * **Visor 3D** y **Navegador** no llevan panel y no es que falten: es que no
 * tienen nada que listar. El Visor es UN sitio por el que se camina, no una
 * colección; el Navegador es una ventana que se abre en una dirección.
 *
 * Un panel para ellos sería una columna vacía o, peor, un «próximamente» — que
 * enseña que los paneles a veces no sirven, y a partir de ahí nadie los abre.
 * Pulsar su icono navega, que es exactamente lo que se espera de ellos.
 */

export default function Panel({ herramienta, onCerrar }: { herramienta: Herramienta; onCerrar: () => void }) {
  return (
    <aside
      aria-label={`Panel de ${herramienta.nombre}`}
      className="flex h-full w-full shrink-0 flex-col border-r border-slate-200 bg-white sm:w-72"
    >
      {herramienta.clave === 'proyectos' && <PanelProyectos onCerrar={onCerrar} />}
      {herramienta.clave === 'paginas' && <PanelPaginas onCerrar={onCerrar} />}
      {herramienta.clave === 'mapas' && <PanelMapas onCerrar={onCerrar} />}
      {herramienta.clave === 'tareas' && <PanelTareas onCerrar={onCerrar} />}
      {herramienta.clave === 'comercio' && <PanelComercio onCerrar={onCerrar} />}
      {herramienta.clave === 'esquemas' && <PanelEsquemas onCerrar={onCerrar} />}
      {herramienta.clave === 'tablas' && <PanelTablas onCerrar={onCerrar} />}
      {herramienta.clave === 'publicaciones' && <PanelPublicaciones onCerrar={onCerrar} />}
      {herramienta.clave === 'ia' && <PanelIA onCerrar={onCerrar} />}
      {herramienta.clave === 'calendario' && <PanelCalendario onCerrar={onCerrar} />}
      {herramienta.clave === 'archivos' && <PanelArchivos onCerrar={onCerrar} />}
    </aside>
  );
}
