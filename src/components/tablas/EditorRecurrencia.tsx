import { useState } from 'react';
import { Repeat, Loader2 } from 'lucide-react';
import type { Columna } from './Celda';
import type { Fila, Recurrencia } from './vistaUtil';

// ============================================================================
// TABLAS · REPETIR UNA FILA (2026-10-05, carril «bd»)
// ============================================================================
// El panel de «Repetir…» de una fila. Las dos maneras (al completarla, o cada
// N días en el calendario) y lo que hace cada una están explicadas en
// `src/server/bd/recurrencia.ts`; aquí se eligen con palabras de persona.

const claseSelect = 'h-9 min-w-0 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400';

export default function EditorRecurrencia({ fila, columnas, onHecho }: {
  fila: Fila; columnas: Columna[]; onHecho: () => void;
}) {
  const r = fila.recurrencia;
  const fechas = columnas.filter(c => c.tipo === 'fecha');
  const hechos = columnas.filter(c => c.tipo === 'casilla' || c.tipo === 'seleccion');
  const [modo, setModo] = useState<Recurrencia['modo']>(r?.modo || 'al_completar');
  const [cada, setCada] = useState(r?.cada || 1);
  const [unidad, setUnidad] = useState<Recurrencia['unidad']>(r?.unidad || 'semana');
  const [fecha, setFecha] = useState(r?.columna_fecha || fechas[0]?.id || '');
  const [hecho, setHecho] = useState(r?.columna_hecho || hechos.find(c => c.tipo === 'casilla')?.id || hechos[0]?.id || '');
  const [valorHecho, setValorHecho] = useState((r as any)?.valor_hecho || '');
  const [guardando, setGuardando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const colHecho = columnas.find(c => c.id === hecho);

  const guardar = async (quitar = false) => {
    setGuardando(true); setFallo(null);
    const res = await fetch(`/api/bd/filas/${fila.id}/recurrencia`, {
      method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recurrencia: quitar ? null : { modo, cada, unidad, columna_fecha: fecha || null, columna_hecho: modo === 'al_completar' ? hecho : (hecho || null), valor_hecho: colHecho?.tipo === 'seleccion' ? valorHecho || null : null } }),
    });
    const j = await res.json().catch(() => ({}));
    setGuardando(false);
    if (!res.ok) { setFallo(j.error || 'No se pudo guardar.'); return; }
    onHecho();
  };

  return (
    <div className="space-y-2.5 p-1">
      <p className="flex items-center gap-1.5 text-xs font-black text-slate-700"><Repeat className="w-3.5 h-3.5 text-violet-500" /> Repetir esta fila</p>
      <div className="grid grid-cols-2 gap-1">
        {([['al_completar', 'Al completarla'], ['calendario', 'En el calendario']] as const).map(([m, l]) => (
          <button key={m} onClick={() => setModo(m)}
            className={`h-9 rounded-md text-xs font-bold border ${modo === m ? 'bg-violet-50 border-violet-300 text-violet-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{l}</button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 leading-snug">
        {modo === 'al_completar'
          ? 'Cuando la marques como hecha nacerá la siguiente, con la fecha avanzada y sin marcar. Ésta se queda como está.'
          : 'Esta fila hace de plantilla: cada periodo se crea una copia con la fecha que toca, se haya completado o no la anterior.'}
      </p>
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        Cada
        <input type="number" min={1} max={365} value={cada} onChange={e => setCada(Math.max(1, Number(e.target.value) || 1))} aria-label="Cada cuánto"
          className="h-9 w-16 rounded-md border border-slate-200 px-2 text-xs font-bold" />
        <select value={unidad} onChange={e => setUnidad(e.target.value as Recurrencia['unidad'])} aria-label="Unidad" className={claseSelect}>
          <option value="dia">{cada === 1 ? 'día' : 'días'}</option>
          <option value="semana">{cada === 1 ? 'semana' : 'semanas'}</option>
          <option value="mes">{cada === 1 ? 'mes' : 'meses'}</option>
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <span className="w-24 shrink-0">Fecha que avanza</span>
        <select value={fecha} onChange={e => setFecha(e.target.value)} aria-label="Fecha que avanza" className={`${claseSelect} flex-1`}>
          <option value="">Ninguna</option>
          {fechas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <span className="w-24 shrink-0">Hecho es</span>
        <select value={hecho} onChange={e => setHecho(e.target.value)} aria-label="Propiedad de hecho" className={`${claseSelect} flex-1`}>
          {modo === 'calendario' && <option value="">Ninguna</option>}
          {hechos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </label>
      {colHecho?.tipo === 'seleccion' && (
        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <span className="w-24 shrink-0">cuando vale</span>
          <select value={valorHecho} onChange={e => setValorHecho(e.target.value)} aria-label="Opción de hecho" className={`${claseSelect} flex-1`}>
            <option value="">La que se llame «Hecho»</option>
            {(colHecho.opciones || []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </label>
      )}
      {modo === 'al_completar' && !hechos.length && <p className="text-[11px] font-bold text-amber-700">Añade a la tabla una casilla o una selección que diga cuándo está hecha.</p>}
      {fallo && <p className="text-[11px] font-bold text-rose-600">{fallo}</p>}
      <div className="flex items-center gap-1 pt-1">
        <button disabled={guardando || (modo === 'al_completar' && !hecho)} onClick={() => guardar()}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-slate-900 text-white text-xs font-bold disabled:opacity-50">
          {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} {r ? 'Guardar' : 'Repetir'}
        </button>
        {r && <button onClick={() => guardar(true)} className="h-9 px-2 rounded-md text-xs font-bold text-slate-400 hover:text-rose-600">Dejar de repetir</button>}
      </div>
    </div>
  );
}
