import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { useSitio } from './ContextoSitio';
import { raizDe } from './CabeceraSitio';

// ============================================================================
// LA VISTA «PROYECTOS» — EL LABORATORIO (2026-11-05, la reestructuración)
// ============================================================================
// Eugenio: «luzhumanidad.com pasa a ser una landing page donde se puede hacer
// clic y ver sus proyectos; con varias vistas para verlos por categoría o ver
// todos». La portada del laboratorio: todos los proyectos de la base de datos
// de Proyectos (`sitio.proyectos`) en tarjetas, con las categorías —sus Áreas
// de innovación, las filas de Sistemas— como filtros arriba. «Todos» es el
// filtro de inicio, y el elegido viaja en la dirección (`?area=`) para poder
// compartirlo. El filtro cambia con `replaceState`, no con el enrutador, por
// la misma razón que el selector de actores de la vista Sociedad.
//
// Los datos salen de las mismas tablas de siempre, por la lectura pública
// (`/api/bd/tablas/:id?lectura=1`): nada se duplica. La columna de categorías
// se encuentra sola: es la relación que apunta a la tabla de Sistemas del
// sitio (`sitio.sistemas`), así que si un día cambia de nombre, esto sigue.

const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

type Celda = { estado?: string; valor?: unknown };
type Fila = {
  id: string; pagina_id: string | null; orden: number;
  pagina?: { titulo?: string; imagen?: string | null; resumen?: string | null; encuadre?: { x?: number; y?: number } | null } | null;
  celdas: Record<string, Celda>;
};
type Columna = { id: string; nombre: string; tipo: string; opciones?: Array<{ id: string; color?: string | null; label: string }> };
type Tabla = {
  columna_titulo?: string | null;
  columnas: Columna[];
  filas: Fila[];
  conexiones?: Array<{ tabla_id: string; columna_id: string }>;
};

const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

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

export default function VistaProyectosSitio({ raizId }: { raizId: string }) {
  const sitio = useSitio();
  const [raiz, setRaiz] = useState<{ titulo: string; config: any } | null>(null);
  const [proyectos, setProyectos] = useState<Tabla | null>(null);
  const [sistemas, setSistemas] = useState<Tabla | null>(null);
  const [fallo, setFallo] = useState(false);
  const [area, setArea] = useState(() => areaDeLaDireccion());

  useEffect(() => {
    let vivo = true;
    raizDe(raizId).then(async r => {
      if (!vivo) return;
      setRaiz(r);
      const tProyectos = r?.config?.sitio?.proyectos, tSistemas = r?.config?.sitio?.sistemas;
      if (!tProyectos) { setFallo(true); return; }
      const pide = (t: string) => fetch(`/api/bd/tablas/${encodeURIComponent(t)}?lectura=1`, { credentials: 'include' })
        .then(x => (x.ok ? x.json() : null)).catch(() => null);
      const [p, s] = await Promise.all([pide(tProyectos), tSistemas ? pide(tSistemas) : null]);
      if (!vivo) return;
      if (!p) { setFallo(true); return; }
      setProyectos(p); setSistemas(s);
    });
    return () => { vivo = false; };
  }, [raizId]);

  const modelo = useMemo(() => {
    if (!proyectos) return null;
    const cols = proyectos.columnas || [];
    const colNombre = proyectos.columna_titulo || cols.find(c => c.tipo === 'texto')?.id || '';
    // La columna de categorías: la relación que apunta a la tabla de Sistemas.
    const tSistemas = raiz?.config?.sitio?.sistemas;
    const colArea = (proyectos.conexiones || []).find(c => c.tabla_id === tSistemas)?.columna_id || '';
    const colEstado = cols.find(c => c.tipo === 'seleccion' && c.nombre === 'Estado') || cols.find(c => c.tipo === 'seleccion');
    const colProgreso = cols.find(c => c.tipo === 'porcentaje' && c.nombre === 'Progreso') || cols.find(c => c.tipo === 'porcentaje');

    // Las categorías con nombre, en el orden de la tabla de Sistemas, solo las que tienen proyectos.
    const nombreDe = new Map<string, { nombre: string; orden: number }>();
    (sistemas?.filas || []).forEach((f, i) => {
      const n = String(f.pagina?.titulo || f.celdas[sistemas?.columna_titulo || '']?.valor || '').trim();
      if (n) nombreDe.set(f.id, { nombre: n, orden: i });
    });
    const usos = new Map<string, number>();
    for (const f of proyectos.filas) for (const a of lista(f.celdas[colArea]?.valor)) usos.set(a, (usos.get(a) || 0) + 1);
    const areas = [...usos.keys()]
      .map(id => ({ id, slug: plano(nombreDe.get(id)?.nombre || id), nombre: nombreDe.get(id)?.nombre || '', n: usos.get(id) || 0, orden: nombreDe.get(id)?.orden ?? 999 }))
      .filter(a => a.nombre)
      .sort((a, b) => a.orden - b.orden);

    // Los proyectos: activos primero, y dentro el orden de la tabla.
    const opciones = new Map((colEstado?.opciones || []).map(o => [o.id, o]));
    const peso = (f: Fila) => {
      const o = opciones.get(String(f.celdas[colEstado?.id || '']?.valor || ''));
      return o?.label === 'Activo' ? 0 : o?.label === 'Completado' ? 1 : 2;
    };
    const filas = [...proyectos.filas]
      .filter(f => f.pagina_id && String(f.celdas[colNombre]?.valor || f.pagina?.titulo || '').trim())
      .sort((a, b) => peso(a) - peso(b) || a.orden - b.orden);
    return { colNombre, colArea, colEstado, colProgreso, opciones, areas, filas };
  }, [proyectos, sistemas, raiz]);

  if (fallo) return <div className="py-24 text-center text-sm text-slate-500">No se han podido cargar los proyectos. Inténtalo dentro de un momento.</div>;
  if (!modelo || !raiz) return <div className="grid min-h-[50vh] place-items-center py-24 text-sm text-slate-400 animate-pulse">Cargando los proyectos…</div>;

  const activa = modelo.areas.find(a => a.slug === area) || null;
  const visibles = activa ? modelo.filas.filter(f => lista(f.celdas[modelo.colArea]?.valor).includes(activa.id)) : modelo.filas;
  const elegir = (slug: string) => { setArea(slug); ponerArea(slug); window.scrollTo({ top: 0 }); };

  return (
    <div data-vista-proyectos className="mx-auto w-full max-w-[1280px] px-4 pb-20 sm:px-6">
      {/* La presentación del laboratorio: el nombre y el subtítulo de la portada, editables desde la página. */}
      <header className="mx-auto max-w-3xl pb-8 pt-10 text-center sm:pt-14">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">{raiz.titulo}</h1>
        {raiz.config?.subtitulo && <p className="mt-3 text-lg font-medium text-slate-600">{String(raiz.config.subtitulo)}</p>}
        <p className="mt-2 text-sm text-slate-400">{modelo.filas.length} proyectos · {modelo.areas.length} categorías</p>
      </header>

      {/* Las categorías: «Todos» y un botón por área de innovación, con su cuenta. */}
      <nav aria-label="Categorías" className="sticky top-0 z-30 -mx-4 mb-8 overflow-x-auto bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:px-0 sm:[scrollbar-width:none]">
        <div className="flex w-max min-w-full items-center justify-start gap-1.5 sm:w-full sm:flex-wrap sm:justify-center">
          <button type="button" onClick={() => elegir('')} aria-pressed={!activa}
            className={cn('h-9 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors',
              !activa ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900')}>
            Todos
          </button>
          {modelo.areas.map(a => (
            <button key={a.id} type="button" onClick={() => elegir(a.slug)} aria-pressed={activa?.id === a.id}
              className={cn('h-9 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors',
                activa?.id === a.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900')}>
              {a.nombre} <span className={cn('font-semibold', activa?.id === a.id ? 'text-slate-300' : 'text-slate-400')}>{a.n}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Las tarjetas: la portada del proyecto, su nombre, su estado y su avance. */}
      <ul className="grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {visibles.map(f => {
          const nombre = String(f.celdas[modelo.colNombre]?.valor || f.pagina?.titulo || '').trim();
          const img = f.pagina?.imagen || null;
          const enc = f.pagina?.encuadre;
          const estadoId = String(f.celdas[modelo.colEstado?.id || '']?.valor || '');
          const estado = modelo.opciones.get(estadoId) || null;
          const progreso = Number(f.celdas[modelo.colProgreso?.id || '']?.valor);
          const sus = lista(f.celdas[modelo.colArea]?.valor).map(id => modelo.areas.find(a => a.id === id)?.nombre).filter(Boolean) as string[];
          return (
            <li key={f.id}>
              <Link to={sitio ? sitio.enlacePagina(f.pagina_id!) : `/p/${f.pagina_id}`}
                className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  {img ? (
                    <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      style={enc ? { objectPosition: `${enc.x ?? 50}% ${enc.y ?? 50}%` } : undefined} />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-3xl font-black text-slate-300">{nombre.slice(0, 1)}</div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-black leading-snug text-slate-900">{nombre}</h2>
                  {sus.length > 0 && <p className="mt-0.5 truncate text-xs font-semibold text-slate-400">{sus.join(' · ')}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    {estado && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: estado.color || '#94a3b8' }} />
                        {estado.label}
                      </span>
                    )}
                    {Number.isFinite(progreso) && (
                      <span className="flex min-w-0 flex-1 items-center gap-2" title={`Avance: ${Math.round(progreso)}%`}>
                        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, progreso))}%` }} />
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-400">{Math.round(progreso)}%</span>
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {visibles.length === 0 && <p className="py-16 text-center text-sm text-slate-500">No hay proyectos en esta categoría.</p>}
    </div>
  );
}
