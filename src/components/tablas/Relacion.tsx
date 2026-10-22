import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Check, Plus, Search, X, Loader2, FileText } from 'lucide-react';
import { useSitio } from '../sitio/ContextoSitio';
import { cn } from '../../utils/cn';
import { miniatura } from '../../utils/miniatura';

// ============================================================================
// RELACIONES ENTRE BASES DE DATOS (2026-10-01)
// ============================================================================
// Eugenio: «tengo una base de datos de áreas de innovación —movilidad,
// energía— y otra de proyectos —un coche volador, un barco—. Tengo que poder
// ligar el proyecto a su área, y luego en la galería mostrar ese enlace».
//
// El dato ya existía (columna «Otra tabla», `bd_enlaces`), pero la celda sólo
// sabía enseñar fichas —vacías, además— y no había forma de elegir. Aquí
// están las dos piezas que faltaban: la ficha, que lleva a la página del
// elemento enlazado, y el selector.

export type Apuntado = { id: string; etiqueta: string; extra?: any; existe?: boolean; miniatura?: string };

/** El color de la inicial cuando lo enlazado no tiene imagen: siempre el
 *  mismo para el mismo nombre, para que «Ana» se reconozca de un vistazo. */
const TONOS = ['bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700', 'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700', 'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700'];
const tonoDe = (texto: string) => TONOS[[...texto].reduce((n, c) => n + c.charCodeAt(0), 0) % TONOS.length];

/** LA FICHA CON IMAGEN (2026-10-18, Eugenio): en la página de un elemento, lo
 *  enlazado se ve con la imagen de su página —la de «Movilidad», la cara de
 *  una persona— y no solo con su nombre. Sin imagen, su inicial. */
export function FichaConImagen({ a }: { a: Apuntado }) {
  const sitio = useSitio();
  const pagina = a.extra?.pagina_id as string | undefined;
  const nombre = a.etiqueta || 'Sin título';
  const roto = a.existe === false;
  const clase = cn('group/ficha inline-flex items-center gap-2.5 rounded-xl border p-1 pr-3 max-w-full transition-colors',
    roto ? 'border-rose-100 bg-rose-50 text-rose-500' : 'border-slate-200/80 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40');
  const dentro = (
    <>
      {a.miniatura && !roto
        ? <img src={miniatura(a.miniatura, 48)} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-lg object-cover bg-slate-100" />
        : <span className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-lg text-base font-black', roto ? 'bg-rose-100' : tonoDe(nombre))}>
            {nombre.trim().charAt(0).toUpperCase() || '·'}
          </span>}
      <span className="min-w-0 text-[13px] font-bold leading-tight line-clamp-2 group-hover/ficha:text-emerald-800">{nombre}</span>
    </>
  );
  if (!pagina || roto) return <span className={clase}>{dentro}</span>;
  return (
    <Link to={sitio ? sitio.enlacePagina(pagina) : `/paginas/${pagina}`} className={clase} onClick={e => e.stopPropagation()}>
      {dentro}
    </Link>
  );
}

/** Una ficha enlazada. Lleva a la página del elemento: dentro del sitio si
 *  se está leyendo una web publicada, al editor si no. */
export function FichaRelacion({ a, grande = false, legible = false }: { a: Apuntado; grande?: boolean; /** 14 px, for cards on a published site. */ legible?: boolean }) {
  const sitio = useSitio();
  const pagina = a.extra?.pagina_id as string | undefined;
  const clase = cn('inline-flex items-center gap-1 rounded-lg font-bold max-w-[14rem] transition-colors',
    legible ? 'px-2.5 min-h-11 text-base' : grande ? 'px-2 py-1 text-xs' : 'px-2 py-0.5 text-[11px]',
    a.existe === false ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700');
  const dentro = <><FileText className="w-3 h-3 shrink-0 opacity-60" /><span className="truncate">{a.etiqueta || 'Sin título'}</span></>;
  if (!pagina || a.existe === false) return <span className={clase}>{dentro}</span>;
  return (
    <Link to={sitio ? sitio.enlacePagina(pagina) : `/paginas/${pagina}`} className={clase}
      onClick={e => e.stopPropagation()}>
      {dentro}
    </Link>
  );
}

/**
 * La celda de una relación: las fichas y, para quien puede editar, un
 * selector con buscador de los elementos de la otra base de datos.
 */
export function CeldaRelacion({ columna, apuntados, editable, onGuardar, conImagen = false }: {
  columna: { id: string; nombre: string; config?: any };
  apuntados: Apuntado[];
  editable: boolean;
  /** Fichas grandes con la imagen de lo enlazado (la página del elemento). */
  conImagen?: boolean;
  onGuardar: (ids: string[]) => Promise<boolean>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [opciones, setOpciones] = useState<{ id: string; nombre: string }[] | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [guardando, setGuardando] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  const [donde, setDonde] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const destino = columna.config?.tabla_destino as string | undefined;
  const varios = !!columna.config?.varios;
  const elegidos = apuntados.map(a => a.id);

  useEffect(() => {
    if (!abierto || opciones || !destino) return;
    fetch(`/api/bd/tablas/${destino}`, { credentials: 'include' })
      .then(async r => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'No se pudo leer la otra base de datos.');
        const colT = j.columna_titulo;
        setOpciones((j.filas || []).map((f: any) => ({
          id: f.id,
          nombre: (colT && f.celdas?.[colT]?.estado === 'ok' ? String(f.celdas[colT].valor) : '') || f.pagina?.titulo || 'Sin título',
        })));
      })
      .catch(e => setFallo(e.message));
  }, [abierto, opciones, destino]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (caja.current?.contains(t) || hoja.current?.contains(t)) return;
      setAbierto(false);
    };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  // EL DESPLEGABLE VA EN SU PROPIA CAPA (2026-10-18, Eugenio: «la imagen que
  // está justo debajo oculta el selector»). Dentro de la celda, cualquier cosa
  // de más abajo con su propia capa —una imagen, una tarjeta— o un contenedor
  // que recorta lo tapaban. Ahora se pinta encima de todo, pegado a la celda,
  // y se abre hacia arriba si abajo no cabe.
  useLayoutEffect(() => {
    if (!abierto) { setDonde(null); return; }
    const colocar = () => {
      const r = caja.current?.getBoundingClientRect();
      if (!r) return;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 264));
      setDonde(window.innerHeight - r.bottom < 320 && r.top > 320
        ? { left, bottom: window.innerHeight - r.top + 4 }
        : { left, top: r.bottom + 4 });
    };
    colocar();
    window.addEventListener('scroll', colocar, true);
    window.addEventListener('resize', colocar);
    return () => { window.removeEventListener('scroll', colocar, true); window.removeEventListener('resize', colocar); };
  }, [abierto]);

  const alternar = async (id: string) => {
    const siguiente = elegidos.includes(id)
      ? elegidos.filter(x => x !== id)
      : (varios ? [...elegidos, id] : [id]);
    setGuardando(true);
    await onGuardar(siguiente);
    setGuardando(false);
    if (!varios) setAbierto(false);
  };

  const filtradas = (opciones || []).filter(o => !q.trim() || o.nombre.toLowerCase().includes(q.trim().toLowerCase()));

  // ══ CREAR LO QUE AÚN NO EXISTE (2026-10-06, Eugenio) ═════════════════════
  // «Desde Proyectos, añadir al equipo una persona que aún no está en Equipo
  // Humano»: si lo escrito no está en la otra base de datos, abajo sale
  // «Crear: <nombre>», que crea la entrada allí (con su página) y la conecta
  // aquí, sin salir de la celda. Solo si nadie se llama EXACTAMENTE así: crear
  // un «Ana» cuando ya hay una «Ana» haría dos personas que parecen una.
  const nombreNuevo = q.trim().replace(/\s+/g, ' ');
  const yaExiste = !!nombreNuevo && (opciones || []).some(o => o.nombre.trim().toLowerCase() === nombreNuevo.toLowerCase());
  const crear = async () => {
    if (!destino || !nombreNuevo) return;
    setGuardando(true); setFallo(null);
    const r = await fetch(`/api/bd/tablas/${destino}/filas`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nombreNuevo }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) {
      setGuardando(false);
      setFallo(r.status === 403 ? 'No puedes añadir entradas en esa otra base de datos.' : (j.error || 'No se pudo crear.'));
      return;
    }
    setOpciones(o => [...(o || []), { id: j.id, nombre: nombreNuevo }]);
    setQ('');
    await onGuardar(varios ? [...elegidos, j.id] : [j.id]);
    setGuardando(false);
    // La otra base de datos, si está en la misma página, se entera sola.
    window.dispatchEvent(new CustomEvent('bd:cambio', { detail: { desde: destino } }));
    if (!varios) setAbierto(false);
  };

  return (
    <div ref={caja} className="relative">
      <div onClick={() => editable && setAbierto(v => !v)}
        className={cn('flex flex-wrap items-center px-2 py-1.5 min-h-[38px]', conImagen ? 'gap-1.5' : 'gap-1', editable && 'cursor-pointer')}>
        {apuntados.map(a => conImagen ? <FichaConImagen key={a.id} a={a} /> : <FichaRelacion key={a.id} a={a} />)}
        {!apuntados.length && editable && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300"><Plus className="w-3 h-3" /> Enlazar</span>
        )}
        {/* AÑADIR OTRA (2026-10-18, Eugenio): con fichas ya puestas no se veía
            dónde pulsar para enlazar una más. */}
        {!!apuntados.length && editable && conImagen && (
          <button type="button" onClick={e => { e.stopPropagation(); setAbierto(v => !v); }}
            title={varios ? 'Buscar y enlazar otra entrada' : 'Cambiar la entrada enlazada'} aria-label={varios ? `Enlazar otra entrada en ${columna.nombre}` : `Cambiar ${columna.nombre}`}
            className="grid h-[54px] w-[54px] shrink-0 place-items-center rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700">
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
      {abierto && donde && createPortal(
        <div ref={hoja} style={donde} onClick={e => e.stopPropagation()}
          className="fixed z-[10050] w-64 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5">
          {!destino ? (
            <p className="p-2 text-xs text-slate-500">Esta columna no sabe a qué base de datos apunta. Edítala y elige una.</p>
          ) : fallo && !opciones ? (
            <p className="p-2 text-xs font-bold text-rose-600">{fallo}</p>
          ) : !opciones ? (
            <p className="p-2 text-xs text-slate-400 inline-flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando…</p>
          ) : (
            <>
              <label className="flex items-center gap-1.5 px-2 h-9 border-b border-slate-100 mb-1">
                <Search className="w-3.5 h-3.5 text-slate-300" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar o crear…"
                  onKeyDown={e => { if (e.key === 'Enter' && nombreNuevo && !yaExiste && !filtradas.length) crear(); }}
                  className="flex-1 min-w-0 text-xs outline-none bg-transparent" />
                {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-300" />}
              </label>
              <div className="max-h-60 overflow-y-auto">
                {filtradas.map(o => {
                  const puesto = elegidos.includes(o.id);
                  return (
                    <button key={o.id} onClick={() => alternar(o.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-bold text-slate-600 text-left hover:bg-slate-50">
                      <span className={cn('w-3.5 h-3.5 rounded border grid place-items-center shrink-0',
                        puesto ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300')}>
                        {puesto && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span className="truncate">{o.nombre}</span>
                    </button>
                  );
                })}
                {!filtradas.length && !nombreNuevo && <p className="p-2 text-xs text-slate-400">No hay nada con ese nombre.</p>}
              </div>
              {nombreNuevo && !yaExiste && (
                <button onClick={crear} disabled={guardando}
                  className="mt-1 w-full flex items-center gap-2 px-2 py-1.5 rounded-md border-t border-slate-100 text-xs font-bold text-emerald-700 text-left hover:bg-emerald-50 disabled:opacity-50">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Crear: <span className="text-slate-800">{nombreNuevo}</span></span>
                </button>
              )}
              {fallo && <p className="px-2 py-1 text-[11px] font-bold text-rose-600">{fallo}</p>}
              {elegidos.length > 0 && (
                <button onClick={async () => { setGuardando(true); await onGuardar([]); setGuardando(false); }}
                  className="mt-1 w-full inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50">
                  <X className="w-3 h-3" /> Quitar todos los enlaces
                </button>
              )}
            </>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
