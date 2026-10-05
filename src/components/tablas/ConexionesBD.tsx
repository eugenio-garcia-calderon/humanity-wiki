import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowRight, ArrowLeft, Boxes, Check, Image as ImageIcon, AlignLeft, Type, Hash, Calendar, Tag, Link2, CheckSquare, Loader2, Eye } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// CON QUÉ OTRAS BASES DE DATOS ESTÁ CONECTADA ÉSTA (2026-10-05)
// ============================================================================
// Eugenio: «cuando se conecta una base de datos con otra, que se vea de forma
// visual qué bases de datos están conectadas, y que sea bidireccional: que en
// las dos aparezca, como en Notion, que está enlazada con la otra. Y ahí un
// selector para elegir componentes de esa base de datos de forma sencilla,
// visual, pero sofisticada».
//
// Una ficha por base de datos conectada, en la cabecera:
//   ⇄ en las dos  ·  → sólo se ve desde aquí  ·  ← llega de allí y aquí no
// Al pulsarla se abre su panel: de qué va el enlace, qué campos de la otra
// base de datos se ven en las tarjetas de ésta (con un interruptor cada uno)
// y, si sólo está de un lado, el botón para que se vea en los dos.

export type Conexion = { tabla_id: string; titulo: string; icono: string | null; columna_id: string | null; columna_remota: string | null; ambas: boolean };

const ICONO_TIPO: Record<string, any> = {
  texto: Type, numero: Hash, fecha: Calendar, seleccion: Tag, multiple: Tag, url: Link2, casilla: CheckSquare,
};
const NO_SE_MUESTRA = new Set(['relacion', 'persona', 'proyecto', 'publicacion', 'imagen', 'video', 'documento', 'formula', 'condicional', 'agregado']);

/** Un emoji se pinta tal cual; cualquier otra cosa, con el icono de base de datos. */
const IconoTabla = ({ icono, className }: { icono: string | null; className?: string }) =>
  icono && [...icono].length <= 2 && !/^[\w-]+$/.test(icono)
    ? <span className={cn('leading-none', className)}>{icono}</span>
    : <Boxes className={cn('w-3.5 h-3.5', className)} />;

export default function ConexionesBD({ conexiones, columnas, editable, onCambio }: {
  conexiones: Conexion[];
  /** Las columnas de ESTA tabla, para leer qué enseña ya cada relación. */
  columnas: any[];
  editable: boolean;
  onCambio: () => void;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierta) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierta(null); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierta]);
  if (!conexiones.length) return null;

  return (
    <div ref={caja} className="relative flex flex-wrap items-center gap-1.5">
      {conexiones.map(c => {
        const clave = `${c.tabla_id}:${c.columna_id || c.columna_remota}`;
        const Flecha = c.ambas ? ArrowLeftRight : c.columna_id ? ArrowRight : ArrowLeft;
        return (
          <div key={clave} className="relative">
            <button type="button" onClick={() => setAbierta(a => (a === clave ? null : clave))} aria-expanded={abierta === clave}
              title={c.ambas ? `Enlazada en las dos con «${c.titulo}»` : c.columna_id ? `Enlaza con «${c.titulo}» (sólo se ve desde aquí)` : `«${c.titulo}» enlaza con ésta`}
              className={cn('inline-flex items-center gap-1.5 h-7 pl-1.5 pr-2.5 rounded-full border text-[11px] font-bold transition-colors max-w-[14rem]',
                abierta === clave ? 'border-violet-300 bg-violet-50 text-violet-800'
                  : c.ambas ? 'border-violet-200 bg-white text-slate-700 hover:bg-violet-50'
                  : 'border-dashed border-slate-300 bg-white text-slate-500 hover:bg-slate-50')}>
              <span className={cn('grid place-items-center w-5 h-5 rounded-full shrink-0', c.ambas ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500')}>
                <Flecha className="w-3 h-3" />
              </span>
              <IconoTabla icono={c.icono} className="text-slate-400 shrink-0" />
              <span className="truncate">{c.titulo}</span>
            </button>
            {abierta === clave && (
              <PanelConexion c={c} columna={columnas.find(x => x.id === c.columna_id)} editable={editable}
                onCambio={() => { onCambio(); }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PanelConexion({ c, columna, editable, onCambio }: { c: Conexion; columna: any; editable: boolean; onCambio: () => void }) {
  const [campos, setCampos] = useState<any[] | null>(null);
  const [mostrar, setMostrar] = useState<string[]>(Array.isArray(columna?.config?.mostrar) ? columna.config.mostrar : []);
  const [ocupado, setOcupado] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  useEffect(() => {
    if (!columna) return;
    fetch(`/api/bd/tablas/${c.tabla_id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => setCampos((j.columnas || []).filter((x: any) => x.id !== j.columna_titulo && !NO_SE_MUESTRA.has(x.tipo))))
      .catch(() => setCampos([]));
  }, [c.tabla_id, columna?.id]);

  const alternar = async (k: string) => {
    if (!editable || !columna) return;
    const nuevo = mostrar.includes(k) ? mostrar.filter(x => x !== k) : [...mostrar, k];
    setMostrar(nuevo);
    const r = await fetch(`/api/bd/columnas/${columna.id}`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { ...(columna.config || {}), mostrar: nuevo } }),
    }).catch(() => null);
    if (!r?.ok) { setFallo('No se ha podido guardar.'); setMostrar(mostrar); return; }
    onCambio();
  };

  /** Que el enlace se vea en las dos bases de datos. */
  const enLasDos = async () => {
    const col = c.columna_id || c.columna_remota;
    if (!col) return;
    setOcupado(true); setFallo(null);
    const r = await fetch(`/api/bd/columnas/${col}/reciproca`, { method: 'POST', credentials: 'include' }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setOcupado(false);
    if (!r?.ok) { setFallo(j.error || 'No se ha podido.'); return; }
    onCambio();
  };

  const opciones = [
    { id: 'imagen', nombre: 'Imagen', Icono: ImageIcon },
    { id: 'texto', nombre: 'Texto', Icono: AlignLeft },
    ...(campos || []).map(x => ({ id: x.id, nombre: x.nombre, Icono: ICONO_TIPO[x.tipo] || Type })),
  ];

  return (
    <div role="dialog" aria-label={`Enlace con ${c.titulo}`}
      className="absolute left-0 top-full mt-1.5 z-40 w-[19rem] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-left">
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-slate-100 bg-gradient-to-b from-violet-50/70 to-white">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-violet-100 text-violet-700 text-base shrink-0">
          <IconoTabla icono={c.icono} className="w-4 h-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-800 truncate">{c.titulo}</span>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            {c.ambas ? <><ArrowLeftRight className="w-3 h-3 text-violet-500" /> Enlazadas en las dos</>
              : c.columna_id ? <><ArrowRight className="w-3 h-3" /> Sólo se ve desde aquí</>
              : <><ArrowLeft className="w-3 h-3" /> Enlaza con ésta; aquí aún no se ve</>}
          </span>
        </span>
      </div>

      {columna && (
        <div className="p-2">
          <p className="px-1.5 pt-1 pb-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Qué se ve de «{c.titulo}» aquí</p>
          <div className="grid grid-cols-2 gap-1">
            {opciones.map(o => {
              const puesta = mostrar.includes(o.id);
              return (
                <button key={o.id} type="button" onClick={() => alternar(o.id)} disabled={!editable} aria-pressed={puesta}
                  className={cn('flex items-center gap-2 h-10 px-2.5 rounded-xl border text-xs font-bold text-left transition-colors',
                    puesta ? 'border-violet-300 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                    !editable && 'cursor-default')}>
                  <o.Icono className={cn('w-3.5 h-3.5 shrink-0', puesta ? 'text-violet-500' : 'text-slate-400')} />
                  <span className="flex-1 truncate">{o.nombre}</span>
                  {puesta && <Check className="w-3.5 h-3.5 text-violet-600 shrink-0" />}
                </button>
              );
            })}
          </div>
          {campos === null && <p className="px-1.5 pt-2 text-[11px] text-slate-400 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Cargando sus campos…</p>}
          <p className="px-1.5 pt-2 text-[11px] text-slate-400">El nombre sale siempre. Lo marcado aparece en cada tarjeta enlazada.</p>
        </div>
      )}

      {editable && !c.ambas && (
        <div className="p-2 border-t border-slate-100">
          <button type="button" onClick={enLasDos} disabled={ocupado}
            className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-700 disabled:opacity-60">
            {ocupado ? <Loader2 className="w-4 h-4 animate-spin" /> : c.columna_id ? <ArrowLeftRight className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {c.columna_id ? `Mostrar también en «${c.titulo}»` : 'Mostrar también aquí'}
          </button>
        </div>
      )}
      {fallo && <p className="px-3.5 pb-3 text-[11px] font-bold text-rose-600">{fallo}</p>}
    </div>
  );
}
