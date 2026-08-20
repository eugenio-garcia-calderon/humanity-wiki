import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Plus, Image as ImageIcon, Trash2, User as UserIcon,
  CircleDot, CircleCheck, Circle, Flame, Layers, MoreVertical, Pencil, Check, ChevronDown,
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

/** Los nombres que le haya puesto el proyecto a sus columnas. Solo rótulos:
 *  el estado que se guarda sigue siendo por_hacer / en_curso / hecho. */
export type NombresDeColumna = Partial<Record<'por_hacer' | 'en_curso' | 'hecho', string>>;

export default function TableroKanban({
  items, grupos, puedeEditar, onRecargar, onCrear, columnas, onColumnas,
}: {
  items: ItemTablero[];
  grupos: Grupo[];
  puedeEditar: boolean;
  onRecargar: () => void;
  /** Abre el formulario de tarjeta nueva, ya apuntando a una columna. */
  onCrear?: (grupo: string, estado: string) => void;
  /** Nombres propios de las columnas. Sin esto salen los de siempre. */
  columnas?: NombresDeColumna | null;
  /** Si se pasa, las columnas se pueden renombrar pinchando en su texto. */
  onColumnas?: (nombres: NombresDeColumna) => void;
}) {
  const [filtro, setFiltro] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<ItemTablero | null>(null);
  const [eligiendoColumna, setEligiendoColumna] = useState(false);

  // ARRASTRAR DE UNA COLUMNA A OTRA (2026-08-20, petición de Eugenio:
  // «permitir arrastrar tarjetas del to do list de un estado a otro como en
  // Trello»).
  //
  // La tarjeta se mueve EN PANTALLA antes de que el servidor conteste. Un
  // tablero en el que sueltas la tarjeta y se queda medio segundo en su sitio
  // se siente roto, aunque acabe funcionando. Si la petición falla, vuelve
  // sola y se dice por qué.
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const [movidas, setMovidas] = useState<Record<string, string>>({});
  const [avisoMover, setAvisoMover] = useState<string | null>(null);

  const soltarEn = async (estado: string) => {
    const id = arrastrando;
    setArrastrando(null);
    setEncima(null);
    if (!id) return;
    const original = items.find(i => i.id === id);
    if (!original || (movidas[id] || original.estado) === estado) return;
    setMovidas(m => ({ ...m, [id]: estado }));
    try {
      const r = await fetch(`/api/roadmap/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ estado }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || 'No se ha podido mover.');
      onRecargar();
    } catch (e: any) {
      setMovidas(m => { const { [id]: _, ...resto } = m; return resto; });
      setAvisoMover(e.message);
    }
  };

  // Cuando llegan datos nuevos del servidor, la foto provisional sobra.
  useEffect(() => { setMovidas({}); }, [items]);

  useEffect(() => {
    if (!eligiendoColumna) return;
    const fuera = () => setEligiendoColumna(false);
    window.addEventListener('click', fuera);
    return () => window.removeEventListener('click', fuera);
  }, [eligiendoColumna]);

  const estadoDe = (it: ItemTablero) => movidas[it.id] || it.estado;
  const nombreDe = (col: { id: string; label: string }) => columnas?.[col.id as keyof NombresDeColumna] || col.label;

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

      {/* AÑADIR UNA TAREA (2026-08-20, petición de Eugenio: «hacer el botón de
          añadir tarea más grande y centrado en la página, y que te dé la
          opción de ponerlo en una columna u otra»). Antes era un «+» gris del
          tamaño de un icono, escondido en la esquina de una sola columna. */}
      {puedeEditar && onCrear && (
        <div className="mt-4 flex justify-center">
          <div className="inline-flex rounded-2xl shadow-sm">
            <button
              onClick={() => onCrear(filtro || grupos[0]?.id, 'por_hacer')}
              className="inline-flex items-center gap-2 pl-5 pr-4 py-2.5 rounded-l-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-colors"
            >
              <Plus className="w-4 h-4" /> Añadir tarea
            </button>
            {/* La flecha elige columna. Un clic sigue creando en «Por hacer»,
                que es donde va casi todo: elegir es la excepción. */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setEligiendoColumna(v => !v); }}
                title="Elegir la columna"
                className="h-full px-2.5 rounded-r-2xl bg-emerald-600 hover:bg-emerald-700 text-white border-l border-emerald-500/60 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              {eligiendoColumna && (
                <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1"
                  onClick={e => e.stopPropagation()}>
                  {COLUMNAS.map(col => (
                    <button
                      key={col.id}
                      onClick={() => { setEligiendoColumna(false); onCrear(filtro || grupos[0]?.id, col.id); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                    >
                      <col.icon className="w-3.5 h-3.5 shrink-0" style={{ color: col.color }} />
                      {nombreDe(col)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {avisoMover && (
        <p className="mt-3 mx-auto max-w-md px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 text-center">
          {avisoMover}
        </p>
      )}

      {/* ---------------- KANBAN ---------------- */}
      <div className="grid md:grid-cols-3 gap-4 mt-3">
        {COLUMNAS.map(col => {
          const deLaColumna = visibles.filter(i => estadoDe(i) === col.id);
          const dianaActiva = arrastrando && encima === col.id;
          return (
            <div
              key={col.id}
              className="min-w-0"
              // La columna entera es la diana, no solo el hueco entre tarjetas:
              // apuntar a una franja de dos píxeles con el ratón es un castigo.
              onDragOver={e => { if (arrastrando) { e.preventDefault(); setEncima(col.id); } }}
              onDragLeave={() => setEncima(c => (c === col.id ? null : c))}
              onDrop={e => { e.preventDefault(); soltarEn(col.id); }}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <col.icon className="w-4 h-4 shrink-0" style={{ color: col.color }} />
                <NombreDeColumna
                  nombre={nombreDe(col)}
                  editable={!!(puedeEditar && onColumnas)}
                  onNombre={n => onColumnas?.({ ...(columnas || {}), [col.id]: n })}
                />
                <span className="text-xs font-bold text-slate-400">{deLaColumna.length}</span>
              </div>
              <div className={cn('space-y-2 rounded-2xl transition-colors min-h-[4rem] p-1 -m-1',
                dianaActiva && 'bg-emerald-50/70 ring-2 ring-emerald-300 ring-dashed')}>
                {deLaColumna.map(it => {
                  const g = grupoDe(it.grupo);
                  return (
                    <button
                      key={it.id}
                      onClick={() => setAbierta(it)}
                      draggable={puedeEditar}
                      onDragStart={e => { setArrastrando(it.id); e.dataTransfer.effectAllowed = 'move'; }}
                      onDragEnd={() => { setArrastrando(null); setEncima(null); }}
                      className={cn(
                        'w-full text-left bg-white border border-slate-200 rounded-2xl p-3.5 transition-all',
                        'hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5',
                        puedeEditar && 'cursor-grab active:cursor-grabbing',
                        arrastrando === it.id && 'opacity-40')}
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

  // Editar el título y el resumen de la tarjeta (petición del usuario,
  // 2026-08-08): el menú de tres puntos abre la caja de texto en el sitio,
  // sin cambiar de ventana. Antes solo se podían cambiar estado/prioridad/
  // notas — el título y el resumen quedaban fijos aunque fueras el admin.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [editandoTexto, setEditandoTexto] = useState(false);
  const [tituloEdit, setTituloEdit] = useState(item.titulo);
  const [resumenEdit, setResumenEdit] = useState(item.resumen || '');

  useEffect(() => { setTituloEdit(item.titulo); setResumenEdit(item.resumen || ''); }, [item.titulo, item.resumen]);

  useEffect(() => {
    if (!menuAbierto) return;
    const fuera = () => setMenuAbierto(false);
    window.addEventListener('click', fuera);
    return () => window.removeEventListener('click', fuera);
  }, [menuAbierto]);

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
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: g.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} /> {g.label}
            </span>
            {editandoTexto ? (
              <input
                value={tituloEdit} onChange={e => setTituloEdit(e.target.value)} autoFocus
                className="block w-full text-xl font-black text-slate-900 leading-tight mt-1 px-2 py-1 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-400"
              />
            ) : (
              <h2 className="text-xl font-black text-slate-900 leading-tight mt-1">{item.titulo}</h2>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {puedeEditar && !editandoTexto && (
              <div className="relative">
                <button onClick={() => setMenuAbierto(v => !v)} title="Opciones"
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50">
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuAbierto && (
                  <div className="absolute right-0 top-8 z-10 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-1"
                    onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => { setEditandoTexto(true); setMenuAbierto(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar título y resumen
                    </button>
                  </div>
                )}
              </div>
            )}
            {editandoTexto ? (
              <button
                onClick={async () => {
                  await guardar({ titulo: tituloEdit.trim() || item.titulo, resumen: resumenEdit.trim() || null });
                  setEditandoTexto(false);
                }}
                disabled={guardando}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> Guardar
              </button>
            ) : (
              <button onClick={onCerrar} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {editandoTexto ? (
            <textarea
              value={resumenEdit} onChange={e => setResumenEdit(e.target.value)} rows={2}
              placeholder="Resumen breve de la tarjeta…"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm leading-relaxed resize-none focus:outline-none focus:border-emerald-300"
            />
          ) : (
            item.resumen && <p className="text-sm text-slate-600 leading-relaxed">{item.resumen}</p>
          )}

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

// ----------------------------------------------------------------------------
// EL NOMBRE DE UNA COLUMNA (2026-08-20, petición de Eugenio: «permitir cambiar
// el nombre de las columnas de tareas al pinchar en la parte de texto»).
// ----------------------------------------------------------------------------
// Se edita EN EL SITIO, no en una ventanita: cambiar un rótulo de dos palabras
// no merece abrir un formulario, y así ves el tablero mientras lo escribes.
//
// Vacío no se guarda. Una columna sin nombre no dice a nadie qué va dentro, y
// el rótulo de siempre siempre es mejor que un hueco.
function NombreDeColumna({ nombre, editable, onNombre }: {
  nombre: string; editable: boolean; onNombre: (n: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(nombre);

  useEffect(() => { setTexto(nombre); }, [nombre]);

  const cerrar = (guardar: boolean) => {
    setEditando(false);
    const n = texto.trim();
    if (guardar && n && n !== nombre) onNombre(n);
    else setTexto(nombre);
  };

  if (!editable) return <h2 className="text-sm font-black text-slate-900">{nombre}</h2>;

  return editando ? (
    <input
      value={texto}
      autoFocus
      onChange={e => setTexto(e.target.value)}
      onBlur={() => cerrar(true)}
      onKeyDown={e => {
        if (e.key === 'Enter') cerrar(true);
        if (e.key === 'Escape') cerrar(false);
      }}
      className="min-w-0 flex-1 text-sm font-black text-slate-900 bg-white px-1.5 py-0.5 -my-0.5 border border-emerald-300 rounded-lg focus:outline-none"
    />
  ) : (
    <h2
      onClick={() => setEditando(true)}
      title="Pincha para cambiar el nombre"
      className="text-sm font-black text-slate-900 cursor-text hover:bg-slate-100 rounded px-1 -mx-1 transition-colors"
    >
      {nombre}
    </h2>
  );
}
