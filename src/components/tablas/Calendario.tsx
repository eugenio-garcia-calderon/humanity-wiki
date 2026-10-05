import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Columna } from './Celda';
import { ValorCompacto, MarcaRecurrente } from './Tarjetas';
import { tituloDe, propiedadesTarjeta, deIso, isoLocal, sumarDias, MESES, type Fila, type Vista } from './vistaUtil';

// ============================================================================
// TABLAS · EL CALENDARIO (2026-10-05, carril «bd»)
// ============================================================================
// Un mes en rejilla de lunes a domingo, con cada fila en el día de su
// propiedad de fecha. Arrastrar una tarjeta a otro día CAMBIA esa fecha, y el
// «+» de un día crea una fila que nace ese día.
//
// LAS FECHAS INCOMPLETAS NO SE PINTAN EN UN DÍA. Una fila con «2026» o
// «07/2026» (la fecha admite solo año o mes, ver `bd/tipos.ts`) no tiene día:
// ponerla el día 1 afirmaría algo que nadie escribió. Se cuentan aparte, junto
// a las que no tienen fecha, y desde ahí se pueden arrastrar a un día.

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

export default function Calendario({ columnas, filas, vista, columnaTitulo, editable, onGuardar, onCrear, onAbrir, onCambiarVista }: {
  columnas: Columna[];
  filas: Fila[];
  vista: Vista;
  columnaTitulo: string | null;
  editable: boolean;
  onGuardar: (filaId: string, celdas: Record<string, any>) => Promise<{ error?: string } | void>;
  onCrear: (titulo: string, celdas: Record<string, any>) => Promise<void>;
  onAbrir: (f: Fila) => void;
  onCambiarVista: (c: Partial<Vista>) => void;
}) {
  const fechas = columnas.filter(c => c.tipo === 'fecha');
  const col = fechas.find(c => c.id === vista.config.fecha_columna) || fechas[0] || null;
  const props = propiedadesTarjeta(columnas, vista.config, columnaTitulo, col ? [col.id] : []).slice(0, 2);
  const hoy = isoLocal(new Date());
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [locales, setLocales] = useState(filas);
  useEffect(() => { setLocales(filas); }, [filas]);
  const [arrastrando, setArrastrando] = useState<Fila | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const [creandoEn, setCreandoEn] = useState<string | null>(null);
  const [verSinFecha, setVerSinFecha] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const { porDia, sinDia } = useMemo(() => {
    const porDia = new Map<string, Fila[]>();
    const sinDia: Fila[] = [];
    for (const f of locales) {
      const c = col ? f.celdas[col.id] : null;
      const d = c && c.estado === 'ok' ? deIso(c.valor) : null;
      if (!d) { sinDia.push(f); continue; }
      const k = isoLocal(d);
      if (!porDia.has(k)) porDia.set(k, []);
      porDia.get(k)!.push(f);
    }
    return { porDia, sinDia };
  }, [locales, col]);

  if (!col) {
    return (
      <div className="p-8 text-center">
        <CalendarDays className="w-8 h-8 mx-auto text-slate-300" />
        <p className="mt-2 text-sm font-bold text-slate-600">El calendario necesita una propiedad de fecha.</p>
        <p className="text-xs text-slate-400">Añade una columna de tipo «fecha» y cada fila aparecerá en su día.</p>
      </div>
    );
  }

  // De lunes a domingo, seis semanas como mucho: el mes empieza en el lunes
  // de su primera semana.
  const inicio = sumarDias(mes, -((mes.getDay() + 6) % 7));
  const finMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const semanas = Math.ceil((((mes.getDay() + 6) % 7) + finMes.getDate()) / 7);
  const dias = Array.from({ length: semanas * 7 }, (_, i) => sumarDias(inicio, i));

  const soltarEn = async (dia: string) => {
    const f = arrastrando;
    setArrastrando(null); setEncima(null);
    if (!f || !editable) return;
    const actual = f.celdas[col.id];
    if (actual?.estado === 'ok' && actual.valor === dia) return;
    setLocales(prev => prev.map(x => x.id === f.id ? { ...x, celdas: { ...x.celdas, [col.id]: { estado: 'ok', valor: dia } } } : x));
    const r = await onGuardar(f.id, { [col.id]: dia });
    if (r && r.error) { setFallo(r.error); setLocales(filas); }
  };

  const tarjeta = (f: Fila) => (
    <div key={f.id} draggable={editable}
      onDragStart={e => { setArrastrando(f); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.id); }}
      onDragEnd={() => { setArrastrando(null); setEncima(null); }}
      onClick={() => onAbrir(f)}
      className={cn('rounded-md bg-white border border-slate-200 px-1.5 py-1 shadow-sm text-left cursor-pointer hover:border-emerald-300',
        editable && 'active:cursor-grabbing', arrastrando?.id === f.id && 'opacity-40')}>
      <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{tituloDe(f, columnaTitulo)} <MarcaRecurrente fila={f} /></p>
      {props.map(p => <div key={p.id} className="flex min-w-0 mt-0.5"><ValorCompacto fila={f} columna={p} /></div>)}
    </div>
  );

  return (
    <div className="p-2">
      <div className="flex flex-wrap items-center gap-1 pb-2">
        <p className="text-sm font-black text-slate-800 capitalize mr-2">{MESES[mes.getMonth()]} {mes.getFullYear()}</p>
        <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} aria-label="Mes anterior" className="w-8 h-8 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={() => { const d = new Date(); setMes(new Date(d.getFullYear(), d.getMonth(), 1)); }} className="h-8 px-2 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-100">Hoy</button>
        <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} aria-label="Mes siguiente" className="w-8 h-8 grid place-items-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
        {fechas.length > 1 && editable && (
          <select value={col.id} onChange={e => onCambiarVista({ config: { ...vista.config, fecha_columna: e.target.value } })} aria-label="Propiedad de fecha"
            className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-600">
            {fechas.map(c => <option key={c.id} value={c.id}>Por {c.nombre}</option>)}
          </select>
        )}
        {!!sinDia.length && (
          <button onClick={() => setVerSinFecha(v => !v)} className={cn('ml-auto h-8 px-2 rounded-md text-xs font-bold', verSinFecha ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
            Sin día · {sinDia.length}
          </button>
        )}
      </div>
      {fallo && <p className="mb-2 text-xs font-bold text-rose-600">{fallo}</p>}
      {verSinFecha && (
        <div className="mb-2 flex gap-1.5 overflow-x-auto p-1.5 rounded-lg bg-slate-50 border border-slate-100">
          {sinDia.map(f => <div key={f.id} className="w-44 shrink-0">{tarjeta(f)}</div>)}
          {editable && <p className="self-center shrink-0 text-[11px] text-slate-400 px-2">Arrástralas a un día para ponerles fecha.</p>}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[42rem] border-l border-t border-slate-200 rounded-lg overflow-hidden">
          {DIAS.map(d => <div key={d} className="px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400 border-r border-b border-slate-200 bg-slate-50">{d}</div>)}
          {dias.map(d => {
            const k = isoLocal(d);
            const delMes = d.getMonth() === mes.getMonth();
            const lista = porDia.get(k) || [];
            return (
              <div key={k}
                onDragOver={e => { if (arrastrando) { e.preventDefault(); setEncima(k); } }}
                onDragLeave={() => setEncima(z => (z === k ? null : z))}
                onDrop={e => { e.preventDefault(); soltarEn(k); }}
                className={cn('group/dia relative min-h-[6.5rem] p-1 border-r border-b border-slate-200 flex flex-col gap-1',
                  !delMes && 'bg-slate-50/60', encima === k && 'bg-emerald-50 ring-2 ring-inset ring-emerald-300')}>
                <div className="flex items-center justify-between">
                  <span className={cn('text-[11px] font-bold w-6 h-6 grid place-items-center rounded-full',
                    k === hoy ? 'bg-rose-500 text-white' : delMes ? 'text-slate-600' : 'text-slate-300')}>{d.getDate()}</span>
                  {editable && (
                    <button onClick={() => setCreandoEn(k)} title="Nueva fila este día" aria-label={`Nueva fila el ${d.getDate()}`}
                      className="w-6 h-6 grid place-items-center rounded text-slate-300 hover:text-emerald-700 hover:bg-emerald-50 opacity-0 group-hover/dia:opacity-100 focus:opacity-100">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {lista.map(tarjeta)}
                {creandoEn === k && (
                  <input autoFocus placeholder="Nombre…" aria-label="Nombre de la fila nueva" maxLength={2000}
                    onKeyDown={async e => {
                      if (e.key === 'Escape') setCreandoEn(null);
                      if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                        const t = e.currentTarget.value.trim(); setCreandoEn(null);
                        await onCrear(t, { [col.id]: k });
                      }
                    }}
                    onBlur={() => setCreandoEn(null)}
                    className="w-full h-7 px-1.5 rounded-md border border-emerald-300 text-[11px] font-bold outline-none" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
