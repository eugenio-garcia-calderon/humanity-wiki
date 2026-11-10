import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Pencil, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useSitio } from './ContextoSitio';
import { raizDe } from './CabeceraSitio';
import { miniatura } from '../../utils/miniatura';
import PresentacionSitio from './PresentacionSitio';
import TarjetaPortada, { CLASE_TARJETA_PORTADA, type EstadoTarjeta } from '../tablas/TarjetaPortada';
import MapaProyectosSitio from './MapaProyectosSitio';
import HistoriaSitio from './HistoriaSitio';
import { useDatosPortada, type ProyectoPortada } from './portadaEscaparate';
import { iconoCategoria } from './iconoCategoria';
const NoticiasSitio = lazy(() => import('./NoticiasSitio'));

// ============================================================================
// LA VISTA «PROYECTOS» — EL LABORATORIO (2026-11-05, la reestructuración)
// ============================================================================
// Eugenio: «luzhumanidad.com pasa a ser una landing page donde se puede hacer
// clic y ver sus proyectos; con varias vistas para verlos por categoría o ver
// todos». Y en la segunda vuelta (mismo día): sin titular —el nombre ya está
// en la barra—, el selector de categorías en UNA sola línea compacta (el
// nombre, su ilustración debajo y el número de proyectos), las portadas por
// su miniatura y cargadas de arriba abajo, y la base de datos de Personas al
// final de la página (el menú baja hasta ella en vez de abrirla aparte).
//
// Los datos salen de las mismas tablas de siempre, por la lectura pública
// (`/api/bd/tablas/:id?lectura=1`): nada se duplica. La columna de categorías
// se encuentra sola: es la relación que apunta a la tabla de Sistemas del
// sitio (`sitio.sistemas`); las ilustraciones de las categorías son las
// portadas de esas filas de Sistemas. El filtro viaja en la dirección
// (`?area=`, con `replaceState`, como el selector de actores de Sociedad).
//
// Quien gestiona la web (`es_equipo` en `/api/sitio-miembros/:raiz/estado`)
// ve el lápiz de cada proyecto y «Añadir»: se abren en el editor de
// humanity.wiki, que es donde se escribe.

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Celda = { estado?: string; valor?: unknown };
type Fila = {
  id: string; pagina_id: string | null; orden: number; oculta?: boolean;
  pagina?: { titulo?: string; imagen?: string | null; resumen?: string | null; descripcion?: string | null; encuadre?: { x?: number; y?: number } | null } | null;
  celdas: Record<string, Celda>;
};
type Columna = { id: string; nombre: string; tipo: string; opciones?: Array<{ id: string; color?: string | null; label: string }> };
type Tabla = {
  columna_titulo?: string | null;
  columnas: Columna[];
  filas: Fila[];
  conexiones?: Array<{ tabla_id: string; columna_id: string }>;
};

const ANCHO_TARJETAS = 'min(100vw - 2.5rem, 1840px)';

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const pide = (t: string) => fetch(`/api/bd/tablas/${encodeURIComponent(t)}?lectura=1`, { credentials: 'include' })
  .then(x => (x.ok ? x.json() : null)).catch(() => null);

/** El área elegida, en la dirección (`?area=energia`). */
function areaDeLaDireccion(): string {
  return new URLSearchParams(window.location.search).get('area') || '';
}
function ponerArea(slug: string) {
  const q = new URLSearchParams(window.location.search);
  if (slug) q.set('area', slug); else q.delete('area');
  const s = q.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${s ? `?${s}` : ''}${window.location.hash}`);
}

/** Baja hasta el ancla del `#` de la dirección (p. ej. `#personas`, desde el menú). */
function useBajarAlAncla(listo: boolean) {
  useEffect(() => {
    if (!listo) return;
    const bajar = () => {
      const nombre = window.location.hash.slice(1);
      if (!nombre) return;
      document.querySelector(`[data-ancla="${CSS.escape(nombre)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    bajar();
    window.addEventListener('hashchange', bajar);
    return () => window.removeEventListener('hashchange', bajar);
  }, [listo]);
}

export default function VistaProyectosSitio({ raizId, edicion }: { raizId: string; edicion?: { titular: string; onTitular: (v: string) => void } }) {
  const sitio = useSitio();
  const [raiz, setRaiz] = useState<{ titulo: string; config: any } | null>(null);
  // LA PORTADA DEL ESCAPARATE (2026-11-07): la presentación, el mapa y la historia leen
  // `/api/sitio/portada/:raiz`; solo en el escaparate (los demás sitios siguen como estaban).
  const datos = useDatosPortada(raiz?.config?.sitio?.escaparate === true ? raizId : null);
  const [proyectos, setProyectos] = useState<Tabla | null>(null);
  const [sistemas, setSistemas] = useState<Tabla | null>(null);
  const [personas, setPersonas] = useState<Tabla | null>(null);
  const [equipo, setEquipo] = useState(false);
  const [fallo, setFallo] = useState(false);
  const [area, setArea] = useState(() => areaDeLaDireccion());
  const [aviso, setAviso] = useState<string | null>(null);

  // EDITAR EN EL MISMO SITIO (2026-11-10, `TarjetaPortada.tsx`): en el editor esta vista es la de la
  // web, y cada texto se guarda en su celda o en su página nada más salir de él.
  const cambiarFila = (id: string, cambio: (f: Fila) => Fila) => setProyectos(t => (t ? { ...t, filas: t.filas.map(f => (f.id === id ? cambio(f) : f)) } : t));
  const guardarCelda = async (filaId: string, columna: string, valor: unknown) => {
    setAviso(null);
    cambiarFila(filaId, f => ({ ...f, celdas: { ...f.celdas, [columna]: { estado: valor === null ? 'vacia' : 'ok', valor } } }));
    const r = await fetch(`/api/bd/filas/${encodeURIComponent(filaId)}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ celdas: { [columna]: valor } }) }).catch(() => null);
    if (!r?.ok) setAviso('No se ha podido guardar el cambio. Inténtalo otra vez.');
  };
  const guardarDescripcion = async (filaId: string, subtitulo: string) => {
    setAviso(null);
    cambiarFila(filaId, f => ({ ...f, pagina: { ...(f.pagina || {}), descripcion: subtitulo || null } }));
    const r = await fetch(`/api/bd/filas/${encodeURIComponent(filaId)}/subtitulo`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subtitulo }) }).catch(() => null);
    if (!r?.ok) setAviso('No se ha podido guardar la descripción. Inténtalo otra vez.');
  };
  const anadirProyecto = async () => {
    const t = raiz?.config?.sitio?.proyectos;
    if (!t) return;
    setAviso(null);
    const r = await fetch(`/api/bd/tablas/${encodeURIComponent(t)}/filas`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: 'Nuevo proyecto' }) }).catch(() => null);
    if (!r?.ok) { setAviso('No se ha podido crear el proyecto.'); return; }
    const p = await pide(t);
    if (p) setProyectos(p);
  };

  useEffect(() => {
    let vivo = true;
    raizDe(raizId).then(async r => {
      if (!vivo) return;
      setRaiz(r);
      const tProyectos = r?.config?.sitio?.proyectos, tSistemas = r?.config?.sitio?.sistemas, tPersonas = r?.config?.sitio?.personas;
      if (!tProyectos) { setFallo(true); return; }
      const [p, s] = await Promise.all([pide(tProyectos), tSistemas ? pide(tSistemas) : null]);
      if (!vivo) return;
      if (!p) { setFallo(true); return; }
      setProyectos(p); setSistemas(s);
      // Las personas, después de los proyectos: la página carga de arriba abajo.
      if (tPersonas) pide(tPersonas).then(x => { if (vivo) setPersonas(x); });
    });
    // El lápiz y «Añadir», solo para quien gestiona la web.
    fetch(`/api/sitio-miembros/${encodeURIComponent(raizId)}/estado`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null)).then(j => { if (vivo) setEquipo(!!j?.es_equipo); }).catch(() => {});
    return () => { vivo = false; };
  }, [raizId]);

  const modelo = useMemo(() => {
    if (!proyectos) return null;
    const cols = proyectos.columnas || [];
    const colNombre = proyectos.columna_titulo || cols.find(c => c.tipo === 'texto')?.id || '';
    // La columna de categorías: la relación que apunta a la tabla de Sistemas.
    const tSistemas = raiz?.config?.sitio?.sistemas;
    const colArea = (proyectos.conexiones || []).find(c => c.tabla_id === tSistemas)?.columna_id || '';

    // Las categorías: nombre e ilustración (la portada de su fila de Sistemas), solo las que tienen proyectos.
    const sistemaDe = new Map<string, { nombre: string; imagen: string | null; orden: number }>();
    (sistemas?.filas || []).forEach((f, i) => {
      const n = String(f.pagina?.titulo || f.celdas[sistemas?.columna_titulo || '']?.valor || '').trim();
      if (n) sistemaDe.set(f.id, { nombre: n, imagen: f.pagina?.imagen || null, orden: i });
    });
    const usos = new Map<string, number>();
    for (const f of proyectos.filas) for (const a of lista(f.celdas[colArea]?.valor)) usos.set(a, (usos.get(a) || 0) + 1);
    const areas = [...usos.keys()]
      .map(id => ({ id, slug: plano(sistemaDe.get(id)?.nombre || id), nombre: sistemaDe.get(id)?.nombre || '', imagen: sistemaDe.get(id)?.imagen || null, n: usos.get(id) || 0, orden: sistemaDe.get(id)?.orden ?? 999 }))
      .filter(a => a.nombre)
      // De más a menos proyectos, de izquierda a derecha (2026-11-05, Eugenio: «Energía tiene 16,
      // está lo más a la izquierda posible»); a igualdad, el orden de la tabla de Sistemas.
      .sort((a, b) => b.n - a.n || a.orden - b.orden);

    // LOS PROYECTOS, JUNTOS POR CATEGORÍA (2026-11-10, Eugenio: «el orden ya no es el estado»): las
    // categorías en el orden de arriba y, dentro de cada una, el de la tabla. Los que no tienen
    // categoría, al final. Las entradas ocultas solo salen en el editor.
    const lugar = new Map(areas.map((a, i) => [a.id, i]));
    const categoriaDe = (f: Fila) => lista(f.celdas[colArea]?.valor).find(id => lugar.has(id)) || null;
    const posicion = (f: Fila) => { const c = categoriaDe(f); return c ? lugar.get(c)! : areas.length; };
    const filas = [...proyectos.filas]
      .filter(f => (edicion ? true : !f.oculta && f.pagina_id) && String(f.celdas[colNombre]?.valor || f.pagina?.titulo || '').trim())
      .sort((a, b) => posicion(a) - posicion(b) || a.orden - b.orden);
    const opcionesArea: EstadoTarjeta[] = [...sistemaDe.entries()].map(([id, x]) => ({ id, label: x.nombre })).sort((a, b) => a.label.localeCompare(b.label, 'es'));
    return { colNombre, colArea, areas, filas, categoriaDe, opcionesArea, nombreArea: (id: string) => sistemaDe.get(id)?.nombre || '' };
  }, [proyectos, sistemas, raiz]);

  // Las personas: su foto (la portada de su página) y su nombre.
  const gente = useMemo(() => {
    if (!personas) return null;
    // Sus columnas se encuentran por la tabla a la que apuntan: Sistemas (sus áreas) y Proyectos.
    const tSistemas = raiz?.config?.sitio?.sistemas, tProyectos = raiz?.config?.sitio?.proyectos;
    const colAreas = (personas.conexiones || []).find(c => c.tabla_id === tSistemas)?.columna_id || '';
    const colProy = (personas.conexiones || []).find(c => c.tabla_id === tProyectos)?.columna_id || '';
    return personas.filas
      .filter(f => !f.oculta && f.pagina_id && String(f.pagina?.titulo || '').trim())
      .map(f => ({ id: f.pagina_id!, nombre: String(f.pagina?.titulo || '').trim(), foto: f.pagina?.imagen || null,
        areas: lista(f.celdas[colAreas]?.valor), proyectos: lista(f.celdas[colProy]?.valor) }));
  }, [personas, raiz]);

  // En el escaparate se espera también a la presentación, el mapa y la historia: si no, un
  // `#personas` bajaría antes de que se pintaran y la página se movería después.
  const esEscaparate = raiz?.config?.sitio?.escaparate === true;
  useBajarAlAncla(!!modelo && (!esEscaparate || datos !== undefined));

  if (fallo) return <div className="py-24 text-center text-sm text-slate-500">No se han podido cargar los proyectos. Inténtalo dentro de un momento.</div>;
  if (!modelo || !raiz) return <div className="grid min-h-[50vh] place-items-center py-24 text-sm text-slate-400 animate-pulse">Cargando los proyectos…</div>;

  // EL ESCAPARATE (2026-11-06, Eugenio: «quita los filtros de energía, vivienda, movilidad…»):
  // sin categorías, todos los proyectos.
  const escaparate = raiz.config?.sitio?.escaparate === true;
  const activa = escaparate ? null : modelo.areas.find(a => a.slug === area) || null;
  const visibles = activa ? modelo.filas.filter(f => lista(f.celdas[modelo.colArea]?.valor).includes(activa.id)) : modelo.filas;
  // LAS PERSONAS DEL ÁREA ELEGIDA (2026-11-05, Eugenio: «si se escoge Movilidad, que solo te
  // enseñe personas relacionadas con esa categoría»): las que tienen esa área en sus Áreas, o
  // trabajan en un proyecto de esa área.
  const proyectosDelArea = activa ? new Set(visibles.map(f => f.id)) : null;
  const genteVisible = gente && activa
    ? gente.filter(p => p.areas.includes(activa.id) || p.proyectos.some(x => proyectosDelArea!.has(x)))
    : gente;
  const elegir = (slug: string) => { setArea(slug); ponerArea(slug); window.scrollTo({ top: 0 }); };
  // En el escaparate las tarjetas cuelgan del «Proyectos» oculto (h2), así que su título es h3; en
  // los demás sitios siguen siendo h2 (2026-11-07, revisión de la portada).
  const Titulo = escaparate ? 'h3' : 'h2';
  // La dirección de un proyecto en el mapa y en la historia: la misma que la de su tarjeta; si el
  // navegador aún no conoce su nombre corto, el que da el servidor (el del mapa del pie).
  const enlaceProyecto = (p: ProyectoPortada) => {
    const e = sitio ? sitio.enlacePagina(p.pagina) : '';
    return e && !e.includes('/p/') ? e : p.url;
  };

  const tile = (activo: boolean) => cn(
    'flex h-[72px] w-[84px] shrink-0 flex-col items-center justify-between rounded-xl border px-1 py-1.5 transition-colors',
    activo ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
  );

  return (
    <div data-vista-proyectos className="mx-auto w-full max-w-[1280px] px-4 pb-20 sm:px-6">
      {/* LAS CATEGORÍAS, EN UNA SOLA LÍNEA (2026-11-05, Eugenio: «que ocupe solo una línea…
          que ponga igual energía y debajo esté la ilustración y que aparezca el número de
          proyectos, todo mucho más compacto»). El nombre arriba, su ilustración debajo y la
          cuenta; si no caben, la línea se desliza de lado. */}
      {!escaparate && <nav aria-label="Categorías" className="sticky top-0 z-30 -mx-4 overflow-x-auto bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0 [scrollbar-width:none]">
        <div className="flex w-max min-w-full items-center justify-start gap-1.5 lg:justify-center">
          <button type="button" onClick={() => elegir('')} aria-pressed={!activa} className={tile(!activa)}>
            <span className="text-[11px] font-black leading-none">Todos</span>
            <LayoutGrid className={cn('h-6 w-6', !activa ? 'text-white/80' : 'text-slate-400')} strokeWidth={1.5} />
            <span className={cn('text-[10px] font-bold leading-none', !activa ? 'text-white/70' : 'text-slate-400')}>{modelo.filas.length}</span>
          </button>
          {modelo.areas.map(a => (
            <button key={a.id} type="button" onClick={() => elegir(a.slug)} aria-pressed={activa?.id === a.id} title={`${a.nombre}: ${a.n} proyectos`} className={tile(activa?.id === a.id)}>
              <span className="max-w-full truncate text-[11px] font-black leading-none">{a.nombre}</span>
              {a.imagen
                ? <img src={miniatura(a.imagen, 72)} alt="" loading="lazy" decoding="async" className={cn('h-7 w-14 rounded object-cover', activa?.id === a.id && 'opacity-90')} />
                : <span aria-hidden className="h-7 w-14 rounded bg-slate-100" />}
              <span className={cn('text-[10px] font-bold leading-none', activa?.id === a.id ? 'text-white/70' : 'text-slate-400')}>{a.n}</span>
            </button>
          ))}
        </div>
      </nav>}

      {/* Quien gestiona la web añade o edita desde aquí; se abre en el editor de humanity.wiki. */}
      {equipo && !escaparate && (
        <div className="mt-2 flex items-center justify-end gap-2">
          <a href={`https://humanity.wiki/paginas/${encodeURIComponent(raizId)}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:border-slate-300 hover:text-slate-900">
            <Plus className="h-3.5 w-3.5" /> Añadir proyecto
          </a>
        </div>
      )}

      {/* A TODO EL ANCHO DEL ESCRITORIO (2026-11-10, Eugenio: «tres por fila, pero aprovecha el ancho total»):
          la portada y las tarjetas se salen de la columna de lectura; lo de debajo sigue en ella. En el
          editor, no: allí el ancho lo marcan sus paneles. */}
      <div style={escaparate && !edicion ? { width: ANCHO_TARJETAS, marginLeft: `calc((100% - ${ANCHO_TARJETAS}) / 2)` } : undefined}>
      {/* LA PRESENTACIÓN (2026-11-07, Eugenio: «haz todas las propuestas… con alta calidad, no
          quiero nada cutre»): qué es el laboratorio en una línea y el botón de colaborar,
          encima de las tarjetas y sin empujarlas fuera de la primera pantalla. */}
      {escaparate && <PresentacionSitio cfg={raiz.config} edicion={edicion} />}

      {/* LAS TARJETAS (2026-11-06, Eugenio: «el título en blanco con un poco de sombra y de fondo
          la portada, como en la página del proyecto; debajo la descripción en letra pequeña sobre
          blanco; el estado y el año arriba de la imagen y algo más grandes; todas del mismo tamaño,
          dos por fila»). Las primeras cargan ya y con prioridad; el resto, al acercarse. */}
      {escaparate && <h2 className="sr-only">Proyectos</h2>}
      <ul data-ancla="proyectos" className={cn('grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2', escaparate ? 'lg:grid-cols-3 ' + 'mt-6 scroll-mt-36 outline-none sm:mt-8 sm:scroll-mt-24' : 'mt-4')}>
        {visibles.map((f, i) => {
          const nombre = String(f.celdas[modelo.colNombre]?.valor || f.pagina?.titulo || '').trim();
          const img = f.pagina?.imagen || null;
          const enc = f.pagina?.encuadre;
          const categoria = modelo.categoriaDe(f);
          const nombreCategoria = categoria ? modelo.nombreArea(categoria) : '';
          const descripcion = (f.pagina?.descripcion || '').trim();
          return (
            <li key={f.id} className="relative">
              {(() => {
                const tarjeta = (
                  <TarjetaPortada nombre={nombre} imagen={img} encuadre={enc} descripcion={descripcion} Titulo={Titulo} prioridad={i}
                    pildora={categoria ? { id: categoria, label: nombreCategoria } : null} iconoPildora={nombreCategoria ? iconoCategoria(nombreCategoria) : undefined} nombrePildora="Categoría"
                    edicion={edicion ? {
                      onNombre: v => guardarCelda(f.id, modelo.colNombre, v),
                      onDescripcion: v => guardarDescripcion(f.id, v),
                      opciones: modelo.opcionesArea,
                      onPildora: modelo.colArea ? id => guardarCelda(f.id, modelo.colArea, id ? [id] : []) : undefined,
                    } : undefined}
                    esquina={edicion ? <>
                      {f.oculta && <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-bold text-white">Oculta</span>}
                      {f.pagina_id && <Link to={`/paginas/${f.pagina_id}`} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-3 text-xs font-bold text-slate-700 shadow-sm backdrop-blur hover:bg-white">
                        <Pencil className="h-3.5 w-3.5" /> Abrir
                      </Link>}
                    </> : undefined} />
                );
                return edicion
                  ? <div className={cn(CLASE_TARJETA_PORTADA, f.oculta && 'opacity-60')}>{tarjeta}</div>
                  : <Link to={sitio ? sitio.enlacePagina(f.pagina_id!) : `/p/${f.pagina_id}`} className={CLASE_TARJETA_PORTADA}>{tarjeta}</Link>;
              })()}
              {equipo && !edicion && f.pagina_id && (
                <a href={`https://humanity.wiki/paginas/${encodeURIComponent(f.pagina_id)}`} target="_blank" rel="noopener noreferrer"
                  title={`Editar «${nombre}»`} aria-label={`Editar «${nombre}»`}
                  className="absolute right-3 top-12 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur hover:text-slate-900">
                  <Pencil className="h-4 w-4" />
                </a>
              )}
            </li>
          );
        })}
        {edicion && (
          <li>
            <button type="button" onClick={anadirProyecto}
              className="grid aspect-[3/2] h-full w-full place-items-center rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-500 transition-colors hover:border-slate-500 hover:text-slate-800">
              <span className="inline-flex items-center gap-2"><Plus className="h-4 w-4" /> Añadir proyecto</span>
            </button>
          </li>
        )}
      </ul>
      {edicion && aviso && <p role="alert" className="mt-3 text-sm font-bold text-rose-600">{aviso}</p>}
      </div>
      {visibles.length === 0 && <p className="py-16 text-center text-sm text-slate-500">No hay proyectos en esta categoría.</p>}

      {/* DÓNDE TRABAJAMOS Y NUESTRA HISTORIA (2026-11-07): el dónde y el cuándo de los proyectos,
          después de verlos y antes de las personas y los medios. */}
      {escaparate && datos && <MapaProyectosSitio datos={datos} enlace={enlaceProyecto} />}
      {escaparate && datos && <HistoriaSitio datos={datos} enlace={enlaceProyecto} />}

      {/* LAS PERSONAS, AL FINAL DE LA PORTADA (2026-11-05, Eugenio: «que la base de datos de
          personas esté en la página inicial y que te haga un scroll down hasta allí»). El menú
          baja hasta aquí (`sitio.anclas`, en `VistaPagina`) en vez de abrir otra página. */}
      {gente && gente.length > 0 && genteVisible && (
        <section data-ancla="personas" className="mt-16 scroll-mt-36 sm:scroll-mt-24">
          <h2 className="text-center text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            {activa ? <>Personas del área de <span className="text-slate-700">{activa.nombre}</span></> : 'Personas'}
          </h2>
          {genteVisible.length === 0 && <p className="mt-4 text-center text-sm text-slate-400">Todavía no hay personas en esta área.</p>}
          <ul className="mt-6 grid list-none grid-cols-3 gap-x-3 gap-y-6 p-0 sm:grid-cols-5 lg:grid-cols-8">
            {genteVisible.map(p => (
              <li key={p.id}>
                <Link to={sitio ? sitio.enlacePagina(p.id) : `/p/${p.id}`} className="group flex flex-col items-center gap-2 text-center">
                  {p.foto
                    ? <img src={miniatura(p.foto, 96)} alt={p.nombre} loading="lazy" decoding="async" className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200 transition-transform group-hover:scale-105" />
                    : <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-400">{p.nombre.slice(0, 1)}</span>}
                  <span className="text-xs font-bold leading-tight text-slate-700 group-hover:text-slate-950">{p.nombre}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* EN LOS MEDIOS (2026-11-06): todas las noticias de los proyectos, debajo de las personas. */}
      <Suspense fallback={null}><NoticiasSitio raizId={raizId} /></Suspense>
    </div>
  );
}
