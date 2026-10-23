import { useEffect, useRef, useState } from 'react';
import { Link2, Check, Layers, Search, Loader2, Plus } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import RedRelaciones, { type Grupo } from '../sitio/RedRelaciones';
import PropiedadesFila from './PropiedadesFila';
import Rejilla from './Rejilla';

// ============================================================================
// LA RED DE UNA ENTRADA, EN EL EDITOR (2026-10-23, Eugenio)
// ============================================================================
// «La vista de una entrada con todos sus enlaces es distinta en el editor que
// en la página publicada. Haz que sea la misma.» → la misma `RedRelaciones`.
//
// Y LA VISTA ENLAZADA (el mismo día): «que desde ahí se pueda modificar la base
// de datos, crear entradas, cambiar la vista… que sea una vista de la
// original, como hace Notion». Al abrir una pestaña, en vez de tarjetas sale la
// base de datos ORIGINAL (`Rejilla`) filtrada a lo conectado con esta entrada:
//   - editar una celda edita la original (es la misma tabla);
//   - «Añadir» crea la entrada en la original y ya conectada con esta
//     (como un filtro «Relación contiene esta página» de Notion);
//   - galería, tabla, tablero… y sus filtros y orden propios, y la forma
//     elegida se recuerda por pestaña (`vista-red`).
export default function RedEnEditor({ paginaId, titulo, tablaId, filaId, editable }: {
  paginaId: string; titulo: string; tablaId: string; filaId: string; editable: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [vuelta, setVuelta] = useState(0);
  // La vista propia de cada pestaña (forma, filtros, orden…), como una vista
  // enlazada de Notion: no toca las vistas de la tabla original. Se guarda en
  // la tabla de ESTA entrada (`vista-red`), medio segundo después del último cambio.
  const propias = useRef<Record<string, any>>({});
  const relojes = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // Lo que cambie una base de datos (aquí o en otra parte de la página) se ve en las pestañas.
  useEffect(() => {
    const otra = () => setVuelta(v => v + 1);
    window.addEventListener('bd:cambio', otra);
    return () => window.removeEventListener('bd:cambio', otra);
  }, []);

  const guardarVista = (g: Grupo, v: any) => {
    propias.current[g.columna_id] = v;
    if (!editable) return;
    clearTimeout(relojes.current[g.columna_id]);
    relojes.current[g.columna_id] = setTimeout(() => {
      fetch(`/api/bd/tablas/${encodeURIComponent(tablaId)}/vista-red`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columna_id: g.columna_id, vista: v }),
      }).catch(() => {});
    }, 500);
  };

  const vistaEnlazada = (g: Grupo, fila: string) => {
    if (!g.tabla_destino) return null;
    // Enlace de un solo lado (sin columna de vuelta en la otra tabla): se
    // filtra por las entradas conectadas y la nueva se conecta desde aquí.
    const directas = g.entradas.filter(e => !e.via).map(e => e.fila_id);
    const vinculo = g.vinculo ? { columna_id: g.vinculo, valor: fila } : { ids: g.entradas.map(e => e.fila_id) };
    const conectar = g.vinculo ? undefined : async (nueva: string) => {
      await fetch(`/api/bd/filas/${encodeURIComponent(fila)}`, {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ celdas: { [g.columna_id]: [...directas, nueva] } }),
      });
    };
    const guardada = propias.current[g.columna_id] ?? g.vista;
    // Sin vista guardada: galería, y sin la columna que apunta a esta entrada (diría lo mismo en todas las filas).
    const inicial = guardada && typeof guardada === 'object' ? guardada
      : { forma: typeof guardada === 'string' && !guardada.startsWith('vista:') ? guardada : 'galeria', ocultas: g.vinculo ? [g.vinculo] : [] };
    const nombre = titulo || 'esta entrada';
    const n = g.entradas.length;
    return (
      <div key={g.slug} data-vista-enlazada={g.slug}>
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
          <Layers className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span><b className="text-slate-800">{g.tabla_titulo || g.nombre}</b> · {n} {n === 1 ? 'conectada' : 'conectadas'} con «{nombre}»</span>
          {editable && <span className="text-slate-400">Es una vista de la base de datos original: lo que cambies o añadas aquí, cambia allí.</span>}
          {editable && (
            <ConectarExistente key={g.slug} destino={g.tabla_destino} titulo={g.tabla_titulo || g.nombre} nombreEntrada={nombre}
              conectadas={directas} heredadas={g.entradas.filter(e => e.via).map(e => e.fila_id)}
              onCambiar={async ids => {
                const r = await fetch(`/api/bd/filas/${encodeURIComponent(fila)}`, {
                  method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ celdas: { [g.columna_id]: ids } }),
                });
                if (r.ok) { setVuelta(v => v + 1); window.dispatchEvent(new CustomEvent('bd:cambio', { detail: { desde: tablaId } })); }
                return r.ok;
              }} />
          )}
        </div>
        <Rejilla key={g.slug} tablaId={g.tabla_destino} editable={editable} sinTitulo tamano="pequeno"
          vistaPropia={inicial} onCambiarVistaPropia={v => guardarVista(g, v)}
          etiquetaFijo={`Conectadas con «${nombre}»`} textoAlCrear={`Se conectará con «${nombre}»`}
          vinculo={vinculo} alCrearEnVinculo={conectar} />
      </div>
    );
  };

  return (
    <div data-red-editor className="mb-6">
      <RedRelaciones paginaId={paginaId} titulo={titulo} enEditor recarga={vuelta} renderGrupo={vistaEnlazada} />
      {editable && (
        <div className="-mt-4 mb-2">
          <button type="button" onClick={() => setEditando(e => !e)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-emerald-300 hover:text-emerald-700">
            {editando ? <><Check className="h-3.5 w-3.5" /> Hecho</> : <><Link2 className="h-3.5 w-3.5" /> Editar enlaces</>}
          </button>
          {editando && (
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <PropiedadesFila tablaId={tablaId} filaId={filaId} editable soloRelaciones alCambiar={() => setVuelta(v => v + 1)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CONECTAR UNA ENTRADA QUE YA EXISTE (2026-10-23, Eugenio: «no existe la opción
 * de conectar con una entrada ya existente»). El buscador de las entradas de la
 * base de datos original: marcar conecta, desmarcar desconecta. Se escribe en la
 * columna de ESTA entrada, que es la misma relación vista desde aquí: la otra
 * base de datos se entera sola (la cara de vuelta).
 */
function ConectarExistente({ destino, titulo, nombreEntrada, conectadas, heredadas, onCambiar }: {
  destino: string; titulo: string; nombreEntrada: string;
  /** Las conectadas directamente (se pueden quitar) y las que llegan por un subtema (solo se enseñan). */
  conectadas: string[]; heredadas: string[];
  onCambiar: (ids: string[]) => Promise<boolean>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [opciones, setOpciones] = useState<Array<{ id: string; nombre: string }> | null>(null);
  const [q, setQ] = useState('');
  const [guardando, setGuardando] = useState<string | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [marcada, setMarcada] = useState(0);
  const boton = useRef<HTMLButtonElement>(null);
  const hoja = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxH: number } | null>(null);
  const cerrar = () => { setAbierto(false); setQ(''); setMarcada(0); };
  // La lista es de ESTA tabla: si cambia, se vuelve a pedir (bot evaluador, ronda 2).
  useEffect(() => { setOpciones(null); }, [destino]);
  useEffect(() => {
    if (!abierto) return;
    // Hacia abajo si cabe; si no, hacia arriba (en el teléfono se cortaba).
    const r = boton.current?.getBoundingClientRect();
    if (r) {
      const vh = window.innerHeight, abajo = vh - r.bottom - 12, arriba = r.top - 12;
      const left = Math.max(8, Math.min(r.left + r.width - 320, window.innerWidth - 328));
      setPos(abajo >= 320 || abajo >= arriba ? { top: r.bottom + 6, left, maxH: Math.max(180, abajo) } : { bottom: vh - r.top + 6, left, maxH: Math.max(180, arriba) });
    }
    const fuera = (e: MouseEvent) => { const t = e.target as Node; if (!hoja.current?.contains(t) && !boton.current?.contains(t)) cerrar(); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', tecla);
    if (!opciones) {
      fetch(`/api/bd/tablas/${encodeURIComponent(destino)}`, { credentials: 'include' }).then(r2 => r2.json()).then(j => {
        const colT = j.columna_titulo;
        setOpciones((j.filas || []).map((f: any) => ({ id: f.id, nombre: (colT && f.celdas?.[colT]?.estado === 'ok' ? String(f.celdas[colT].valor) : '') || f.pagina?.titulo || 'Sin título' })));
      }).catch(() => setFallo('No se ha podido leer la base de datos.'));
    }
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  const buscado = q.trim().toLowerCase();
  const lista = (opciones || []).filter(o => !buscado || o.nombre.toLowerCase().includes(buscado))
    // Primero las que ya están conectadas, luego el resto por nombre.
    .sort((a, b) => Number(conectadas.includes(b.id)) - Number(conectadas.includes(a.id)) || a.nombre.localeCompare(b.nombre, 'es'));
  const alternar = async (id: string) => {
    if (heredadas.includes(id) && !conectadas.includes(id)) return;
    setGuardando(id); setFallo(null);
    const ok = await onCambiar(conectadas.includes(id) ? conectadas.filter(x => x !== id) : [...conectadas, id]);
    setGuardando(null);
    if (!ok) setFallo('No se ha podido guardar.');
  };
  /** Flechas para moverse por la lista e Intro para conectar o desconectar. */
  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setMarcada(m => Math.min(lista.length - 1, m + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMarcada(m => Math.max(0, m - 1)); }
    else if (e.key === 'Enter' && lista[marcada]) { e.preventDefault(); alternar(lista[marcada].id); }
  };
  return (
    <>
      <button ref={boton} type="button" onClick={() => (abierto ? cerrar() : setAbierto(true))} aria-expanded={abierto}
        className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700">
        <Link2 className="h-3.5 w-3.5" /> Conectar existente
      </button>
      {abierto && pos && createPortal(
        <div ref={hoja} role="dialog" aria-label={`Conectar entradas de ${titulo}`} style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, maxHeight: pos.maxH }}
          className="z-[10050] flex w-80 max-w-[calc(100vw-16px)] flex-col rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          <p className="px-2 pb-1 pt-1 text-[11px] font-bold text-slate-400">Entradas de «{titulo}» conectadas con «{nombreEntrada}»</p>
          <label className="mb-1 flex h-9 items-center gap-1.5 border-b border-slate-100 px-2">
            <Search className="h-3.5 w-3.5 text-slate-300" />
            <input autoFocus value={q} onChange={e => { setQ(e.target.value); setMarcada(0); }} onKeyDown={teclas} placeholder="Buscar… (↑↓ e Intro)" aria-label="Buscar una entrada" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!opciones && !fallo && <p className="inline-flex items-center gap-1.5 p-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…</p>}
            {lista.map((o, i) => {
              const puesta = conectadas.includes(o.id), heredada = !puesta && heredadas.includes(o.id);
              return (
                <button key={o.id} type="button" disabled={heredada || guardando !== null} onClick={() => alternar(o.id)} onMouseEnter={() => setMarcada(i)}
                  title={heredada ? 'Ya llega por un subtema' : puesta ? 'Desconectar' : 'Conectar'}
                  className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-bold text-slate-600 disabled:opacity-60', i === marcada ? 'bg-blue-50' : 'hover:bg-slate-50')}>
                  <span className={cn('grid h-3.5 w-3.5 shrink-0 place-items-center rounded border', puesta || heredada ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300')}>
                    {(puesta || heredada) && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="truncate">{o.nombre}</span>
                  {heredada && <span className="ml-auto shrink-0 text-[10px] font-semibold text-slate-400">por un subtema</span>}
                  {guardando === o.id && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-slate-300" />}
                </button>
              );
            })}
            {opciones && !lista.length && <p className="p-2 text-xs text-slate-400">No hay nada con ese nombre. Créala con «<Plus className="inline h-3 w-3" /> Añadir».</p>}
          </div>
          {fallo && <p className="px-2 py-1 text-[11px] font-bold text-rose-600">{fallo}</p>}
        </div>,
        document.body)}
    </>
  );
}
