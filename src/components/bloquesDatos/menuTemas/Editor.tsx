import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { PropsEditor } from '../tipos';
import { Ajustes, Campo, CLASE_CAMPO, Elegir, Escribir } from '../ficha/editor';
import SelectorDeIcono from '../../ui/SelectorDeIcono';
import Icono from '../../ui/Icono';
import { VistaMenuTemas } from './Lectura';
import { nuevoIdTema, temasDe, temasDeLaHumanidad, type Tema } from './temas';

const BOTON = 'grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30';

export default function Editor({ datos, editable, cambiarDatos }: PropsEditor) {
  const temas = temasDe(datos);
  const [editando, setEditando] = useState(false);
  const [iconoDe, setIconoDe] = useState<string | null>(null);
  const poner = (lista: Tema[]) => cambiarDatos({ temas: lista });
  const cambiar = (id: string, c: Partial<Tema>) => poner(temas.map(t => (t.id === id ? { ...t, ...c } : t)));
  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= temas.length) return;
    const n = [...temas]; [n[i], n[j]] = [n[j], n[i]]; poner(n);
  };

  return (
    <div className="space-y-3">
      <Ajustes>
        <Campo etiqueta="Título">
          <Escribir valor={String(datos.titulo ?? '')} editable={editable} cambiar={v => cambiarDatos({ titulo: v })} placeholder="Temas" />
        </Campo>
        <Campo etiqueta="Forma">
          <Elegir valor={datos.forma === 'rejilla' ? 'rejilla' : 'lista'} editable={editable} cambiar={v => cambiarDatos({ forma: v })}
            opciones={[['lista', 'Lista lateral'], ['rejilla', 'Rejilla']]} />
        </Campo>
      </Ajustes>

      {editable && (
        <div>
          <button type="button" onClick={() => setEditando(e => !e)} aria-expanded={editando}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
            {editando ? 'Cerrar la edición de temas' : `Editar los temas (${temas.length})`}
          </button>
          {editando && (
            <div className="mt-2 space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2">
              {temas.map((t, i) => (
                <div key={t.id} className="space-y-1.5 rounded-lg bg-white p-2 shadow-sm">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" onClick={() => setIconoDe(iconoDe === t.id ? null : t.id)} aria-label={`Icono de ${t.nombre}`} title="Icono"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200" style={{ color: t.color }}>
                      {t.icono ? <Icono valor={t.icono} tamano={16} /> : <span className="text-[10px] text-slate-400">Icono</span>}
                    </button>
                    <input type="color" value={t.color || '#64748b'} onChange={e => cambiar(t.id, { color: e.target.value })} aria-label={`Color de ${t.nombre}`}
                      className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5" />
                    <input value={t.nombre} onChange={e => cambiar(t.id, { nombre: e.target.value })} aria-label="Nombre del tema" placeholder="Nombre del tema"
                      className={`${CLASE_CAMPO} h-8 min-w-0 flex-1`} />
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${t.nombre}`} className={BOTON}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === temas.length - 1} aria-label={`Bajar ${t.nombre}`} className={BOTON}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => poner(temas.filter(x => x.id !== t.id))} aria-label={`Quitar ${t.nombre}`} className={`${BOTON} hover:text-rose-600`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <input value={t.enlace || ''} onChange={e => cambiar(t.id, { enlace: e.target.value })} aria-label={`Adónde lleva ${t.nombre}`}
                    placeholder="Adónde lleva: la dirección de una página (/p/… o https://…)" className={`${CLASE_CAMPO} h-8 w-full`} />
                  {iconoDe === t.id && (
                    <SelectorDeIcono valor={t.icono || null} onElegir={v => { cambiar(t.id, { icono: v ?? undefined }); setIconoDe(null); }} />
                  )}
                  {/* Los subtemas: se despliegan bajo el tema en la lista lateral. */}
                  {(t.hijos || []).map(h => (
                    <div key={h.id} className="ml-6 flex items-center gap-1.5">
                      <input value={h.nombre} onChange={e => cambiar(t.id, { hijos: t.hijos!.map(x => (x.id === h.id ? { ...x, nombre: e.target.value } : x)) })}
                        aria-label="Nombre del subtema" placeholder="Subtema" className={`${CLASE_CAMPO} h-8 min-w-0 flex-1`} />
                      <input value={h.enlace || ''} onChange={e => cambiar(t.id, { hijos: t.hijos!.map(x => (x.id === h.id ? { ...x, enlace: e.target.value } : x)) })}
                        aria-label="Adónde lleva el subtema" placeholder="Dirección" className={`${CLASE_CAMPO} h-8 min-w-0 flex-1`} />
                      <button type="button" onClick={() => cambiar(t.id, { hijos: t.hijos!.filter(x => x.id !== h.id) })} aria-label={`Quitar ${h.nombre || 'el subtema'}`} className={`${BOTON} hover:text-rose-600`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => cambiar(t.id, { hijos: [...(t.hijos || []), { id: nuevoIdTema(), nombre: '' }] })}
                    className="ml-6 inline-flex h-7 items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-700"><Plus className="h-3 w-3" /> Añadir subtema</button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => poner([...temas, { id: nuevoIdTema(), nombre: 'Nuevo tema', icono: 'lucide:Circle', color: '#64748b' }])}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> Añadir tema</button>
                <button type="button" onClick={() => { if (window.confirm('¿Cambiar estos temas por los temas de la humanidad?')) poner(temasDeLaHumanidad()); }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600"><RotateCcw className="h-3.5 w-3.5" /> Los temas de la humanidad</button>
              </div>
            </div>
          )}
        </div>
      )}

      <VistaMenuTemas datos={datos} enEditor />
    </div>
  );
}
