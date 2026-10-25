import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, X, Menu as IconoMenu, LayoutGrid } from 'lucide-react';
import { cn } from '../../utils/cn';
import { miniatura } from '../../utils/miniatura';
import type { BotonCabecera } from './BotonesCabecera';
import { useSitio } from '../sitio/ContextoSitio';

// ============================================================================
// LAS PÁGINAS HIJAS (2026-10-23, Eugenio)
// ============================================================================
// «Permitir crear páginas dentro de esa página desde la cabecera: reciclando lo
// de añadir botón, ahora va a ser añadir entrada, creándose así una base de
// datos dentro de esa página, enlazada desde la cabecera y no en un bloque. Esa
// tabla pertenece a la página y todas las páginas que cuelgan son hijas. Que se
// puedan ver como galería con la portada de cada una, o como menú con botones.
// Y que al pinchar se abran con todas sus funcionalidades: un árbol de páginas
// dentro de páginas.»
//
// `config.hijas = { tipo: 'basedatos', tabla_id, vista }`. Tiene la forma de un
// bloque «basedatos» a propósito: el servidor la cuenta como una base de datos
// de la página en todo (`bloquesSql.ts`) — visibilidad al publicar, «dónde
// vive», el árbol del proyecto. Cada entrada es una fila de esa tabla con su
// página: abrirla es abrir una página completa, con sus propias hijas, su red
// de enlaces con otras bases de datos y lo demás. Así el árbol no tiene fondo.
//
// Los botones de antes (`config.botones`) se convierten en entradas la primera
// vez que se añade una (sin perder sus páginas): una sola lista, no dos.

export type VistaHijas = 'menu' | 'galeria';
export type ConfigHijas = { tipo: 'basedatos'; tabla_id: string; vista?: VistaHijas };
export type Hija = { fila_id: string; pagina_id: string; titulo: string; imagen: string | null; icono: string | null; descripcion: string };

export const vistaDeHijas = (c?: ConfigHijas | null): VistaHijas => (c?.vista === 'galeria' ? 'galeria' : 'menu');

// Varias piezas de la misma página (la cabecera, la barra fija, la galería)
// piden las mismas hijas: una sola petición por tabla, y todas se enteran al cambiar.
const enCurso = new Map<string, Promise<Hija[]>>();
function pedir(tablaId: string): Promise<Hija[]> {
  let p = enCurso.get(tablaId);
  if (!p) {
    p = fetch(`/api/bd/tablas/${encodeURIComponent(tablaId)}`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        const colT = j?.columna_titulo;
        return (Array.isArray(j?.filas) ? j.filas : []).filter((f: any) => f.pagina_id && !f.oculta).map((f: any) => ({
          fila_id: f.id, pagina_id: f.pagina_id,
          titulo: String(f.pagina?.titulo || (colT && f.celdas?.[colT]?.estado === 'ok' ? f.celdas[colT].valor : '') || 'Sin título'),
          imagen: f.pagina?.imagen || null, icono: f.pagina?.icono || null,
          descripcion: String(f.pagina?.descripcion || f.pagina?.resumen || ''),
        }));
      })
      .catch(() => []);
    enCurso.set(tablaId, p);
    setTimeout(() => { if (enCurso.get(tablaId) === p) enCurso.delete(tablaId); }, 15000);
  }
  return p;
}
/** Vuelve a pedir las hijas (tras crear, borrar, ordenar o renombrar). */
export function recargarHijas(tablaId?: string | null) {
  if (!tablaId) return;
  enCurso.delete(tablaId);
  window.dispatchEvent(new CustomEvent('hijas:cambio', { detail: tablaId }));
}
export function useHijas(tablaId?: string | null): Hija[] | null {
  const [hijas, setHijas] = useState<Hija[] | null>(null);
  useEffect(() => {
    if (!tablaId) { setHijas(null); return; }
    let vivo = true;
    const cargar = () => pedir(tablaId).then(h => { if (vivo) setHijas(h); });
    cargar();
    const oir = (e: Event) => { if ((e as CustomEvent).detail === tablaId) cargar(); };
    window.addEventListener('hijas:cambio', oir);
    return () => { vivo = false; window.removeEventListener('hijas:cambio', oir); };
  }, [tablaId]);
  return hijas;
}

/** Las hijas con la forma de los botones de la cabecera (vista «menú»). */
export const botonesDeHijas = (hijas: Hija[] | null): BotonCabecera[] =>
  (hijas || []).map(h => ({ id: h.fila_id, tipo: 'subpagina', entityId: h.pagina_id, pubTitulo: h.titulo }));

/** Elegir cómo se ven las hijas: menú de botones o galería con portada. */
export function ElegirVistaHijas({ vista, onCambiar }: { vista: VistaHijas; onCambiar: (v: VistaHijas) => void }) {
  const op = (v: VistaHijas, texto: string, Icono: typeof IconoMenu) => (
    <button type="button" onClick={() => onCambiar(v)} aria-pressed={vista === v}
      className={cn('inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition-colors',
        vista === v ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
      <Icono className="h-3.5 w-3.5" /> {texto}
    </button>
  );
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5" role="group" aria-label="Cómo se ven las páginas hijas">
      {op('menu', 'Menú', IconoMenu)}{op('galeria', 'Galería', LayoutGrid)}
    </span>
  );
}

/** La galería de las hijas: cada una con su portada, y al pulsar se abre su página. */
export function GaleriaHijas({ hijas, enlace, onAnadir, onQuitar, extra }: {
  hijas: Hija[]; enlace: (paginaId: string) => string;
  onAnadir?: () => void; onQuitar?: (h: Hija) => void;
  /** Lo que va arriba a la derecha (el selector de vista, en el editor). */
  extra?: React.ReactNode;
}) {
  if (!hijas.length && !onAnadir) return null;
  return (
    <section data-galeria-hijas className="mb-8">
      {extra && <div className="mb-3 flex justify-end">{extra}</div>}
      <div className="grid grid-cols-2 gap-4 sm:gap-5 sm:[grid-template-columns:repeat(auto-fill,minmax(min(14rem,100%),1fr))]">
        {hijas.map(h => (
          <div key={h.fila_id} className="group/hija relative min-w-0">
            <Link to={enlace(h.pagina_id)} data-interno className="flex flex-col">
              <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 transition-shadow group-hover/hija:shadow-md">
                {h.imagen
                  ? <img src={miniatura(h.imagen, 320)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover/hija:scale-[1.02]" />
                  : h.icono && !/^(https?:|\/)/.test(h.icono)
                    ? <span className="text-5xl">{h.icono}</span>
                    : h.icono ? <img src={miniatura(h.icono, 96)} alt="" className="h-16 w-16 object-contain" />
                    : <FileText className="h-8 w-8 text-slate-300" />}
              </div>
              <p className="mt-2.5 text-sm font-bold leading-snug text-slate-900 line-clamp-2 group-hover/hija:underline sm:text-base">{h.titulo}</p>
              {h.descripcion && <p className="mt-1 text-[13px] leading-snug text-slate-500 line-clamp-2">{h.descripcion}</p>}
            </Link>
            {onQuitar && (
              <button type="button" onClick={() => onQuitar(h)} aria-label={`Quitar «${h.titulo}»`} title="Quitar la entrada"
                className="absolute right-2 top-2 hidden h-7 w-7 place-items-center rounded-full bg-white/95 text-slate-400 shadow ring-1 ring-slate-200 hover:text-rose-600 group-hover/hija:grid">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
        {onAnadir && (
          <button type="button" onClick={onAnadir}
            className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-slate-300 text-sm font-bold text-slate-400 hover:border-emerald-400 hover:bg-emerald-50/40 hover:text-emerald-700">
            <span className="inline-flex flex-col items-center gap-1"><Plus className="h-5 w-5" /> Añadir entrada</span>
          </button>
        )}
      </div>
    </section>
  );
}

/** En la página publicada: la galería de las hijas, si la página la quiere en galería. */
export function GaleriaHijasLectura({ config, titulo }: { config: any; titulo?: string }) {
  const sitio = useSitio();
  const c = config?.hijas as ConfigHijas | undefined;
  const hijas = useHijas(c?.tabla_id && vistaDeHijas(c) === 'galeria' ? c.tabla_id : null);
  if (!hijas?.length) return null;
  const galeria = <GaleriaHijas hijas={hijas} enlace={id => (sitio ? sitio.enlacePagina(id) : `/p/${id}`)} />;
  // Debajo de otras secciones, con su título (bot de UX: una tarjeta suelta sin decir qué era).
  return titulo ? <div><h2 className="mb-3 flex items-baseline gap-2 text-base font-black tracking-tight text-slate-900">{titulo}<span className="text-sm font-semibold text-slate-500">{hijas.length}</span></h2>{galeria}</div> : galeria;
}
