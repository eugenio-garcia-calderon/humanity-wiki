import { useState } from 'react';
import { Check, Plus, Loader2, Repeat } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatear, type Columna } from './Celda';
import { APUNTAN, FICHEROS, type Fila } from './vistaUtil';

// ============================================================================
// TABLAS · LO QUE COMPARTEN LAS TARJETAS (2026-10-05, carril «bd»)
// ============================================================================
// El tablero, la lista y el calendario enseñan cada fila como una tarjeta
// pequeña con unas pocas propiedades. Cómo se ve un valor en esa tarjeta se
// decide aquí, una vez: si el tablero pintara una etiqueta de un color y la
// lista de otro, la misma fila parecería dos cosas distintas.

/** Un valor en pequeño: pastillas de color para las opciones, fichas para lo
 *  enlazado, una marca para la casilla y texto para lo demás. `null` si no
 *  hay nada: una tarjeta llena de guiones se lee peor que una corta. */
export function ValorCompacto({ fila, columna, conNombre = false }: { fila: Fila; columna: Columna; conNombre?: boolean }) {
  const c = fila.celdas[columna.id];
  if (!c || c.estado === 'vacia' || c.estado === 'sin_calcular') return null;
  if (c.estado === 'error') return <span className="text-[11px] font-bold text-rose-500 truncate" title={c.mensaje}>⚠ {columna.nombre}</span>;
  const etiqueta = conNombre && <span className="text-slate-400 font-bold mr-1">{columna.nombre}:</span>;

  if (columna.tipo === 'seleccion' || columna.tipo === 'seleccion_multiple') {
    const ids: string[] = Array.isArray(c.valor) ? c.valor : [c.valor];
    return (
      <span className="inline-flex flex-wrap items-center gap-1 min-w-0">
        {etiqueta}
        {ids.map(id => {
          const o = columna.opciones?.find(x => x.id === id);
          return (
            <span key={id} className="px-1.5 py-0.5 rounded-md text-[11px] font-bold truncate max-w-[10rem]"
              style={{ backgroundColor: (o?.color || '#e2e8f0') + '33', color: o?.color || '#475569' }}>
              {o?.label ?? id}
            </span>
          );
        })}
      </span>
    );
  }
  if (columna.tipo === 'casilla') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
        <span className={cn('w-3.5 h-3.5 rounded border grid place-items-center', c.valor ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300')}>
          {c.valor && <Check className="w-2.5 h-2.5" />}
        </span>
        {columna.nombre}
      </span>
    );
  }
  if (APUNTAN.has(columna.tipo)) {
    const ap = fila.apuntados?.[columna.id] || [];
    if (!ap.length) return null;
    return (
      <span className="inline-flex flex-wrap items-center gap-1 min-w-0">
        {etiqueta}
        {ap.slice(0, 4).map((a: any) => (
          <span key={a.id} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[11px] font-bold text-slate-600 truncate max-w-[9rem]">{a.etiqueta || 'Sin nombre'}</span>
        ))}
        {ap.length > 4 && <span className="text-[11px] text-slate-400">+{ap.length - 4}</span>}
      </span>
    );
  }
  if (FICHEROS.has(columna.tipo)) {
    const n = (fila.archivos?.[columna.id] || []).length;
    return n ? <span className="text-[11px] text-slate-500">{etiqueta}{n} {n === 1 ? 'archivo' : 'archivos'}</span> : null;
  }
  const texto = formatear(c, columna, { apuntados: fila.apuntados?.[columna.id], archivos: fila.archivos?.[columna.id] });
  if (!texto) return null;
  return <span className="text-[11px] text-slate-600 truncate min-w-0">{etiqueta}{texto}</span>;
}

/** El aviso de que una fila se repite (ver `bd.ts`, filas recurrentes). */
export function MarcaRecurrente({ fila }: { fila: Fila }) {
  const r = fila.recurrencia;
  if (!r) return null;
  const u = r.unidad === 'dia' ? (r.cada === 1 ? 'día' : 'días') : r.unidad === 'semana' ? (r.cada === 1 ? 'semana' : 'semanas') : (r.cada === 1 ? 'mes' : 'meses');
  return (
    <span title={r.modo === 'al_completar' ? `Al completarla se crea la siguiente, ${r.cada} ${u} después` : `Se crea una cada ${r.cada} ${u}`}
      className="inline-flex items-center text-violet-500"><Repeat className="w-3 h-3" /></span>
  );
}

/** «+ Nuevo» que se convierte en un campo para escribir el nombre. */
export function NuevoElemento({ onCrear, texto = 'Nuevo', className }: {
  onCrear: (titulo: string) => Promise<void> | void; texto?: string; className?: string;
}) {
  const [escribiendo, setEscribiendo] = useState(false);
  const [valor, setValor] = useState('');
  const [creando, setCreando] = useState(false);
  const crear = async () => {
    const t = valor.trim();
    if (!t) { setEscribiendo(false); return; }
    setCreando(true);
    await onCrear(t);
    setCreando(false); setValor('');
    // Sigue abierto: se suelen crear varios seguidos.
  };
  if (!escribiendo) {
    return (
      <button onClick={() => setEscribiendo(true)}
        className={cn('w-full flex items-center gap-1.5 px-2 h-9 rounded-lg text-xs font-bold text-slate-400 hover:text-emerald-700 hover:bg-emerald-50/60 transition-colors', className)}>
        <Plus className="w-3.5 h-3.5" /> {texto}
      </button>
    );
  }
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <input autoFocus value={valor} onChange={e => setValor(e.target.value)} placeholder="Nombre…" maxLength={2000} aria-label="Nombre del elemento nuevo"
        onKeyDown={e => { if (e.key === 'Enter') crear(); if (e.key === 'Escape') { setEscribiendo(false); setValor(''); } }}
        onBlur={() => { if (!valor.trim()) setEscribiendo(false); }}
        className="flex-1 min-w-0 h-9 px-2 rounded-lg border border-emerald-300 bg-white text-xs font-bold outline-none" />
      {creando && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
    </div>
  );
}
