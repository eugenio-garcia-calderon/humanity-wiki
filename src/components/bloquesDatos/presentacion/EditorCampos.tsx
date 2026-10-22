import { useState, type ReactNode } from 'react';
import { ChevronDown, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';

// Los campos con los que se editan la presentación y la infografía: textos
// largos de verdad (no una línea), listas que se reordenan, y todo plegado
// para que en el editor se vea, sobre todo, cómo queda.

const CAMPO = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-sky-400 focus:outline-none disabled:opacity-50';

export function EditorPlegable({ titulo, children, abierto: inicial = false }: { titulo: string; children: ReactNode; abierto?: boolean }) {
  const [abierto, setAbierto] = useState(inicial);
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50">
      <button type="button" onClick={() => setAbierto(a => !a)} className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-bold text-slate-700">
        {titulo}
        <ChevronDown className={cn('h-4 w-4 transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && <div className="space-y-3 border-t border-slate-200 p-4">{children}</div>}
    </div>
  );
}

export function CampoTexto({ etiqueta, valor, cambiar, editable, largo }: { etiqueta: string; valor: string; cambiar: (v: string) => void; editable: boolean; largo?: boolean }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {etiqueta}
      {largo
        ? <textarea value={valor} disabled={!editable} onChange={e => cambiar(e.target.value)} rows={3} className={cn(CAMPO, 'normal-case tracking-normal')} />
        : <input value={valor} disabled={!editable} onChange={e => cambiar(e.target.value)} className={cn(CAMPO, 'normal-case tracking-normal')} />}
    </label>
  );
}

export type CampoItem = { clave: string; etiqueta: string; largo?: boolean; opciones?: Array<[string, string]> };

export function ListaItems({ items, campos, cambiar, editable, nuevo }: {
  items: Array<Record<string, any>>; campos: CampoItem[]; cambiar: (v: Array<Record<string, any>>) => void; editable: boolean; nuevo: string;
}) {
  const poner = (i: number, k: string, v: string) => cambiar(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const mover = (i: number, d: number) => { const n = [...items]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); cambiar(n); };
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {campos.map(c => (
              <label key={c.clave} className={cn('flex flex-col gap-1 text-[11px] font-bold text-slate-400', c.largo && 'sm:col-span-2')}>
                {c.etiqueta}
                {c.opciones ? (
                  <select value={it[c.clave] || ''} disabled={!editable} onChange={e => poner(i, c.clave, e.target.value)} className={CAMPO}>
                    {c.opciones.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : c.largo ? (
                  <textarea value={it[c.clave] || ''} disabled={!editable} rows={2} onChange={e => poner(i, c.clave, e.target.value)} className={CAMPO} />
                ) : (
                  <input value={it[c.clave] || ''} disabled={!editable} onChange={e => poner(i, c.clave, e.target.value)} className={CAMPO} />
                )}
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1 text-slate-400">
            <button type="button" disabled={!editable || i === 0} onClick={() => mover(i, -1)} aria-label="Subir" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" disabled={!editable || i === items.length - 1} onClick={() => mover(i, 1)} aria-label="Bajar" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" disabled={!editable} onClick={() => cambiar(items.filter((_, j) => j !== i))} aria-label="Quitar" className="ml-auto grid h-8 w-8 place-items-center rounded-lg hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      <button type="button" disabled={!editable} onClick={() => cambiar([...items, {}])}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 hover:border-sky-300 hover:text-sky-700">
        <Plus className="h-3.5 w-3.5" /> {nuevo}
      </button>
    </div>
  );
}
