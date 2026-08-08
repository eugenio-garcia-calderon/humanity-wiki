import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Plus, Image as ImageIcon, Trash2, User as UserIcon,
  CircleDot, CircleCheck, Circle, Flame, Layers,
} from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// TABLERO KANBAN reutilizable (2026-08-08, petición del usuario)
// ============================================================================
// Nació como la hoja de ruta de humanity.wiki y ahora lo usa también cada
// proyecto de cada persona: los grupos los pone quien monta el tablero, así
// que sirve igual para «El lienzo / Los mapas / La IA» que para lo que sea.

// Orden de lectura natural (petición del usuario, 2026-08-08): Por hacer a
// la izquierda, Hecho a la derecha — el flujo de trabajo va de izquierda a
// derecha, no al revés.
const COLUMNAS = [
  { id: 'por_hacer', label: 'Por hacer', icon: Circle, color: '#64748b' },
  { id: 'en_curso', label: 'En curso', icon: CircleDot, color: '#d97706' },
  { id: 'hecho', label: 'Hecho', icon: CircleCheck, color: '#16a34a' },
] as const;


export interface Grupo { id: string; label: string; color: string; desc?: string }

export interface ItemTablero {
  id: string; grupo: string; titulo: string; resumen: string | null;
  estado: string; prioridad: string; bloques: any[]; proyecto_id?: string | null;
  autor_nombre: string | null; autor_email: string | null; autor_avatar: string | null;
}

export default function TableroKanban({ items, grupos, puedeEditar, onRecargar, onCrear }: {
  items: ItemTablero[];
  grupos: Grupo[];
  puedeEditar: boolean;
  onRecargar: () => void;
  onCrear?: (grupo: string) => void;
}) {
  const [filtro, setFiltro] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<ItemTablero | null>(null);

  const grupoDe = (id: string) => grupos.find(g => g.id === id) || grupos[0] || { id, label: id, color: '#64748b' };
  const visibles = useMemo(() => (filtro ? items.filter(i => i.grupo === filtro) : items), [items, filtro]);

  return (
    <>
      {/* ---------------- FILTROS ---------------- */}
      <div className="flex flex-wrap gap-1.5 sticky top-0 bg-white/95 backdrop-blur z-20 py-3 -mx-2 px-2 rounded-2xl">
        <button
          onClick={() => setFiltro(null)}
          className={cn('px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
            !filtro ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400')}
        >
          Todo <span className="opacity-60">{items.length}</span>
        </button>
        {grupos.map(g => {
          const n = items.filter(i => i.grupo === g.id).length;
          const activo = filtro === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setFiltro(activo ? null : g.id)}
              title={g.desc}
              className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                activo ? 'text-white shadow' : 'bg-white text-slate-600 hover:border-slate-400')}
              style={activo ? { backgroundColor: g.color, borderColor: g.color } : { borderColor: '#e2e8f0' }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activo ? '#fff' : g.color }} />
              {g.label} <span className="opacity-60">{n}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------- KANBAN ---------------- */}
      <div className="grid md:grid-cols-3 gap-4 mt-3">
        {COLUMNAS.map(col => {
          const deLaColumna = visibles.filter(i => i.estado === col.id);
          return (
            <div key={col.id} className="min-w-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <col.icon className="w-4 h-4 shrink-0" style={{ color: col.color }} />
                <h2 className="text-sm font-black text-slate-900">{col.label}</h2>
                <span className="text-xs font-bold text-slate-400">{deLaColumna.length}</span>
                {puedeEditar && onCrear && col.id === 'por_hacer' && (
                  <button onClick={() => onCrear(filtro || grupos[0]?.id)} title="Añadir tarjeta"
                    className="ml-auto p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {deLaColumna.map(it => {
                  const g = grupoDe(it.grupo);
                  return (
                    <button
                      key={it.id}
                      onClick={() => setAbierta(it)}
                      className="w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all"
                      style={{ borderLeftWidth: 3, borderLeftColor: g.color }}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                        <span className="text-[8px] font-black uppercase tracking-[0.18em]" style={{ color: g.color }}>
                          {g.label}
                        </span>
                        {it.prioridad === 'alta' && <Flame className="w-3 h-3 text-red-500 ml-auto shrink-0" />}
                      </div>
                      <p className="text-[13px] font-black text-slate-900 leading-snug">{it.titulo}</p>
                      {it.resumen && (
                        <p className="text-[11px] text-slate-500 leading-relaxed mt-1 line-clamp-2">{it.resumen}</p>
                      )}
                      {(it.bloques?.length > 0 || it.autor_nombre) && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                          {it.autor_nombre && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <UserIcon className="w-2.5 h-2.5 shrink-0" />{it.autor_nombre.split(' ')[0]}
                            </span>
                          )}
                          {it.bloques?.length > 0 && <span className="ml-auto shrink-0">{it.bloques.length} nota(s)</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
                {!deLaColumna.length && (
                  <p className="text-[11px] text-slate-300 italic text-center py-8">Nada aquí todavía.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {abierta && (
        <FichaFuncionalidad
          item={abierta}
          grupo={grupoDe(abierta.grupo)}
          puedeEditar={puedeEditar}
          onCerrar={() => setAbierta(null)}
          onGuardado={it => { setAbierta(it); onRecargar(); }}
        />
      )}
    </>
  );
}

// ----------------------------------------------------------------------------
// La ficha central de una funcionalidad
// ----------------------------------------------------------------------------
function FichaFuncionalidad({ item, grupo: g, puedeEditar, onCerrar, onGuardado }: {
  item: ItemTablero; grupo: Grupo; puedeEditar: boolean;
  onCerrar: () => void; onGuardado: (it: ItemTablero) => void;
}) {
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onCerrar]);

  const guardar = async (patch: any) => {
    setGuardando(true); setError(null);
    try {
      const r = await fetch(`/api/roadmap/${item.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify(patch),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'No se pudo guardar.');
      onGuardado({ ...item, ...j });
    } catch (e: any) { setError(e.message); }
    finally { setGuardando(false); }
  };

  const bloques = Array.isArray(item.bloques) ? item.bloques : [];

  const anadirTexto = () => {
    if (!texto.trim()) return;
    guardar({ bloques: [...bloques, { tipo: 'texto', texto: texto.trim() }] });
    setTexto('');
  };

  const subirImagen = async (f: File) => {
    setGuardando(true); setError(null);
    try {
      const up = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/octet-stream' }, body: f,
      });
      const j = await up.json();
      if (!up.ok) throw new Error(j.error || 'No se pudo subir la imagen.');
      await guardar({ bloques: [...bloques, { tipo: 'imagen', url: j.url, pie: f.name }] });
    } catch (e: any) { setError(e.message); setGuardando(false); }
  };

  const quitarBloque = (i: number) => guardar({ bloques: bloques.filter((_, j) => j !== i) });

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onCerrar}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0"
          style={{ borderTopWidth: 4, borderTopColor: g.color }}>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: g.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} /> {g.label}
            </span>
            <h2 className="text-xl font-black text-slate-900 leading-tight mt-1">{item.titulo}</h2>
          </div>
          <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {item.resumen && <p className="text-sm text-slate-600 leading-relaxed">{item.resumen}</p>}

          {/* Estado y prioridad */}
          <div className="flex flex-wrap items-center gap-2">
            {COLUMNAS.map(c => (
              <button
                key={c.id}
                disabled={!puedeEditar || guardando}
                onClick={() => guardar({ estado: c.id })}
                className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors',
                  item.estado === c.id ? 'text-white' : 'bg-white text-slate-500 border-slate-200',
                  puedeEditar && item.estado !== c.id && 'hover:border-slate-400',
                  !puedeEditar && 'cursor-default')}
                style={item.estado === c.id ? { backgroundColor: c.color, borderColor: c.color } : undefined}
              >
                <c.icon className="w-3.5 h-3.5" /> {c.label}
              </button>
            ))}
            <span className={cn('ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full',
              item.prioridad === 'alta' ? 'bg-red-50 text-red-700'
                : item.prioridad === 'media' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500')}>
              Prioridad {item.prioridad}
            </span>
          </div>

          {/* Autor */}
          <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-2xl">
            {item.autor_avatar
              ? <img src={item.autor_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              : <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4" />
                </span>}
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Responsable</p>
              <p className="text-xs font-bold text-slate-800 truncate">{item.autor_nombre || 'Sin asignar'}</p>
              {item.autor_email && <p className="text-[10px] text-slate-400 truncate">{item.autor_email}</p>}
            </div>
          </div>

          {/* Bloques de detalle */}
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Detalle</p>
            {bloques.length === 0 && (
              <p className="text-xs text-slate-400 italic">
                Sin notas todavía. {puedeEditar ? 'Añade una explicación o una captura abajo.' : ''}
              </p>
            )}
            {bloques.map((b: any, i: number) => (
              <div key={i} className="group relative">
                {b.tipo === 'imagen' ? (
                  <figure className="rounded-2xl overflow-hidden border border-slate-200">
                    <img src={b.url} alt={b.pie || ''} className="w-full" />
                    {b.pie && <figcaption className="text-[10px] text-slate-400 px-3 py-1.5">{b.pie}</figcaption>}
                  </figure>
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-2xl p-3.5">
                    {b.texto}
                  </p>
                )}
                {puedeEditar && (
                  <button onClick={() => quitarBloque(i)} title="Quitar esta nota"
                    className="absolute top-2 right-2 p-1.5 bg-white/90 border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{error}</p>}
        </div>

        {puedeEditar && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0 space-y-2">
            <textarea
              value={texto} onChange={e => setTexto(e.target.value)} rows={2}
              placeholder="Añade una explicación, una decisión tomada, un detalle de cómo funciona…"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-emerald-300"
            />
            <div className="flex items-center gap-2">
              <input ref={archivo} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) subirImagen(f); e.target.value = ''; }} />
              <button onClick={() => archivo.current?.click()} disabled={guardando}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-white transition-colors disabled:opacity-40">
                <ImageIcon className="w-3.5 h-3.5" /> Imagen
              </button>
              <button onClick={anadirTexto} disabled={guardando || !texto.trim()}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40">
                {guardando ? 'Guardando…' : <><Plus className="w-3.5 h-3.5" /> Añadir nota</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
