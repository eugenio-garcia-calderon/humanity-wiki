import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import { Button } from '../../ui/core';

// The settings strip every sheet block shows above itself in the editor.
// Small and the same everywhere: a block's settings are two or three choices,
// never a form.

export const CLASE_CAMPO = 'rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-sky-400 focus:outline-none disabled:opacity-50';

export function Ajustes({ children }: { children: ReactNode }) {
  return <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">{children}</div>;
}

export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <span className="font-semibold">{etiqueta}</span>
      {children}
    </label>
  );
}

export function Elegir({ valor, opciones, cambiar, editable, className }: {
  valor: string; opciones: Array<[string, string]>; cambiar: (v: string) => void; editable: boolean; className?: string;
}) {
  return (
    <select value={valor} disabled={!editable} onChange={e => cambiar(e.target.value)} className={cn(CLASE_CAMPO, className)}>
      {opciones.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

export function Escribir({ valor, cambiar, editable, placeholder }: {
  valor: string; cambiar: (v: string) => void; editable: boolean; placeholder?: string;
}) {
  return (
    <input value={valor} disabled={!editable} placeholder={placeholder} onChange={e => cambiar(e.target.value)} className={cn(CLASE_CAMPO, 'w-48')} />
  );
}

/** The databases the author can see, for a «which database» picker. */
export function useTablasPropias(): Array<{ id: string; titulo: string }> {
  const [tablas, setTablas] = useState<Array<{ id: string; titulo: string }>>([]);
  useEffect(() => {
    let vivo = true;
    fetch('/api/bd/tablas', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : []))
      .then(j => { if (vivo && Array.isArray(j)) setTablas(j.map((t: any) => ({ id: t.id, titulo: t.titulo }))); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);
  return tablas;
}

/** A short list of hand-written items (a claim, a recall) for the blocks'
 *  «manual» mode, on a page that is not a database row. */
export function EditorItems({ items, campos, cambiar, editable, nuevo }: {
  items: Array<Record<string, string>>;
  campos: Array<{ clave: string; etiqueta: string; opciones?: string[]; largo?: boolean }>;
  cambiar: (items: Array<Record<string, string>>) => void;
  editable: boolean;
  nuevo: string;
}) {
  const poner = (i: number, clave: string, v: string) => cambiar(items.map((x, j) => (j === i ? { ...x, [clave]: v } : x)));
  return (
    <div className="mb-2 space-y-2">
      {items.map((it, i) => (
        <div key={i} className="grid gap-1.5 rounded-xl border border-slate-100 p-2 sm:grid-cols-2">
          {campos.map(c => (
            <label key={c.clave} className={cn('flex flex-col gap-0.5 text-[11px] font-semibold text-slate-500', c.largo && 'sm:col-span-2')}>
              {c.etiqueta}
              {c.opciones ? (
                <Elegir valor={it[c.clave] || ''} editable={editable} cambiar={v => poner(i, c.clave, v)} opciones={[['', '—'], ...c.opciones.map(o => [o, o] as [string, string])]} />
              ) : (
                <input value={it[c.clave] || ''} disabled={!editable} onChange={e => poner(i, c.clave, e.target.value)} className={CLASE_CAMPO} />
              )}
            </label>
          ))}
          <Button variant="ghost" disabled={!editable} className="justify-self-start px-2 py-1 text-xs text-slate-500" onClick={() => cambiar(items.filter((_, j) => j !== i))}>Quitar</Button>
        </div>
      ))}
      <Button variant="outline" disabled={!editable} className="px-2.5 py-1 text-xs" onClick={() => cambiar([...items, {}])}>{nuevo}</Button>
    </div>
  );
}
