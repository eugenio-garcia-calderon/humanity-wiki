import { useEffect, useMemo, useRef, useState, type PointerEvent as EventoPuntero, type MouseEvent as EventoRaton } from 'react';
import { GanttChart } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Columna } from './Celda';
import { MarcaRecurrente } from './Tarjetas';
import { agruparFilas, tituloDe, deIso, isoLocal, sumarDias, diasEntre, MESES, type Fila, type Vista } from './vistaUtil';

// ============================================================================
// TABLAS · LA LÍNEA DE TIEMPO (2026-10-05, carril «bd»)
// ============================================================================
// Una barra por fila, de su fecha de inicio a su fecha de fin. Se arrastra la
// barra entera para moverla en el tiempo y sus bordes para cambiar el inicio o
// el fin; al soltar se escriben las fechas en la fila, como si se hubieran
// tecleado en la tabla.
//
// La fecha de fin es OPCIONAL: sin ella cada fila es un hito de un día. La
// propiedad de fecha guarda un solo día (ver `bd/tipos.ts`), así que inicio y
// fin son dos columnas, que es también como lo hace Notion por dentro.
//
// LAS DEPENDENCIAS SE DIBUJAN COMO FLECHAS («bloqueada por», ver
// `FuncionesBD`): de dónde acaba la que bloquea a dónde empieza la bloqueada.
// En rojo si la bloqueada empieza antes de que acabe la otra, que es justo el
// conflicto que alguien quiere ver de un vistazo.

const ANCHO_DIA = { dia: 36, semana: 14, mes: 5 } as const;
const ALTO_FILA = 36;
const ANCHO_NOMBRES = 220;

type Barra = { fila: Fila; inicio: Date | null; fin: Date | null };
type Gesto = { filaId: string; modo: 'mover' | 'inicio' | 'fin'; x0: number; delta: number };

export default function LineaTiempo({ columnas, filas, vista, columnaTitulo, editable, onGuardar, onAbrir, onCambiarVista, dependencias = [] }: {
  columnas: Columna[];
  filas: Fila[];
  vista: Vista;
  columnaTitulo: string | null;
  editable: boolean;
  onGuardar: (filaId: string, celdas: Record<string, any>) => Promise<{ error?: string } | void>;
  onAbrir: (f: Fila) => void;
  onCambiarVista: (c: Partial<Vista>) => void;
  /** Pares «la fila `de` bloquea a la fila `a`». */
  dependencias?: Array<{ de: string; a: string }>;
}) {
  const cfg = vista.config;
  const fechas = columnas.filter(c => c.tipo === 'fecha');
  const colIni = fechas.find(c => c.id === cfg.fecha_columna) || fechas[0] || null;
  // Sin elegir (undefined), la segunda fecha hace de fin: es lo que casi
  // siempre se quiere («Inicio» y «Fin»). Elegir «Sin fin» guarda null.
  const colFin = cfg.fecha_fin_columna === undefined
    ? fechas.find(c => c.id !== colIni?.id) || null
    : fechas.find(c => c.id === cfg.fecha_fin_columna && c.id !== colIni?.id) || null;
  const escala = cfg.escala || 'semana';
  const W = ANCHO_DIA[escala];
  const [locales, setLocales] = useState(filas);
  useEffect(() => { setLocales(filas); }, [filas]);
  const [gesto, setGesto] = useState<Gesto | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);

  const barras: Barra[] = useMemo(() => locales.map(f => {
    const ci = colIni ? f.celdas[colIni.id] : null;
    const cf = colFin ? f.celdas[colFin.id] : null;
    const inicio = ci && ci.estado === 'ok' ? deIso(ci.valor) : null;
    let fin = cf && cf.estado === 'ok' ? deIso(cf.valor) : null;
    if (inicio && (!fin || fin < inicio)) fin = inicio;
    return { fila: f, inicio, fin };
  }), [locales, colIni, colFin]);

  // El tramo que se enseña: de una semana antes de lo primero a tres después
  // de lo último, y siempre con hoy dentro.
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const conFecha = barras.filter(b => b.inicio);
  const min = conFecha.reduce((m, b) => (b.inicio! < m ? b.inicio! : m), hoy);
  const max = conFecha.reduce((m, b) => (b.fin! > m ? b.fin! : m), hoy);
  const desde = sumarDias(min, -7 - ((min.getDay() + 6) % 7));
  const total = Math.max(diasEntre(desde, max) + 28, escala === 'mes' ? 180 : escala === 'semana' ? 84 : 42);
  const ancho = total * W;

  // Al abrir, hoy a la vista.
  useEffect(() => {
    if (scroll.current) scroll.current.scrollLeft = Math.max(0, diasEntre(desde, hoy) * W - 120);
  }, [escala]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!colIni) {
    return (
      <div className="p-8 text-center">
        <GanttChart className="w-8 h-8 mx-auto text-slate-300" />
        <p className="mt-2 text-sm font-bold text-slate-600">La línea de tiempo necesita una propiedad de fecha.</p>
        <p className="text-xs text-slate-400">Con una, cada fila es un hito; con dos (inicio y fin), una barra.</p>
      </div>
    );
  }

  // Las filas en pantalla, con los encabezados de grupo intercalados.
  const colAgr = columnas.find(c => c.id === vista.agrupar_por) || null;
  type Linea = { tipo: 'grupo'; etiqueta: string; color?: string | null; n: number } | { tipo: 'fila'; barra: Barra };
  const lineas: Linea[] = [];
  if (colAgr) {
    const porId = new Map(barras.map(b => [b.fila.id, b]));
    for (const g of agruparFilas(locales, colAgr, cfg)) {
      if ((cfg.grupos_ocultos || []).includes(g.clave)) continue;
      lineas.push({ tipo: 'grupo', etiqueta: g.etiqueta, color: g.color, n: g.filas.length });
      for (const f of g.filas) lineas.push({ tipo: 'fila', barra: porId.get(f.id)! });
    }
  } else for (const b of barras) lineas.push({ tipo: 'fila', barra: b });

  /** Las fechas de una barra con el gesto en curso aplicado. */
  const conGesto = (b: Barra): { inicio: Date | null; fin: Date | null } => {
    if (!gesto || gesto.filaId !== b.fila.id || !b.inicio || !b.fin) return b;
    const d = gesto.delta;
    if (gesto.modo === 'mover') return { inicio: sumarDias(b.inicio, d), fin: sumarDias(b.fin, d) };
    if (gesto.modo === 'inicio') { const i = sumarDias(b.inicio, d); return { inicio: i > b.fin ? b.fin : i, fin: b.fin }; }
    const f = sumarDias(b.fin, d); return { inicio: b.inicio, fin: f < b.inicio ? b.inicio : f };
  };

  const empezar = (e: EventoPuntero, b: Barra, modo: Gesto['modo']) => {
    if (!editable) return;
    e.preventDefault(); e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setGesto({ filaId: b.fila.id, modo, x0: e.clientX, delta: 0 });
  };
  const mover = (e: EventoPuntero) => {
    if (!gesto) return;
    const delta = Math.round((e.clientX - gesto.x0) / W);
    if (delta !== gesto.delta) setGesto({ ...gesto, delta });
  };
  const terminar = async (b: Barra) => {
    const g = gesto;
    setGesto(null);
    if (!g || g.filaId !== b.fila.id) return;
    // Un toque sin mover es «abrir», no «mover cero días».
    if (g.delta === 0) { if (g.modo === 'mover') onAbrir(b.fila); return; }
    const d = g.delta;
    const fechasNuevas = g.modo === 'mover' ? { inicio: sumarDias(b.inicio!, d), fin: sumarDias(b.fin!, d) }
      : g.modo === 'inicio' ? { inicio: sumarDias(b.inicio!, d) > b.fin! ? b.fin! : sumarDias(b.inicio!, d), fin: b.fin! }
      : { inicio: b.inicio!, fin: sumarDias(b.fin!, d) < b.inicio! ? b.inicio! : sumarDias(b.fin!, d) };
    const celdas: Record<string, any> = { [colIni.id]: isoLocal(fechasNuevas.inicio) };
    // Sin columna de fin, mover un hito solo cambia su día.
    if (colFin) celdas[colFin.id] = isoLocal(fechasNuevas.fin);
    setLocales(prev => prev.map(x => x.id !== b.fila.id ? x : {
      ...x, celdas: { ...x.celdas, ...Object.fromEntries(Object.entries(celdas).map(([k, v]) => [k, { estado: 'ok' as const, valor: v }])) },
    }));
    const res = await onGuardar(b.fila.id, celdas);
    if (res && res.error) { setFallo(res.error); setLocales(filas); }
  };

  /** Poner fecha a una fila que no tiene, pinchando en su carril. */
  const ponerFecha = async (e: EventoRaton, b: Barra) => {
    if (!editable || b.inicio) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const dia = sumarDias(desde, Math.floor((e.clientX - rect.left) / W));
    const celdas: Record<string, any> = { [colIni.id]: isoLocal(dia) };
    if (colFin) celdas[colFin.id] = isoLocal(sumarDias(dia, escala === 'dia' ? 2 : 6));
    const res = await onGuardar(b.fila.id, celdas);
    if (res && res.error) setFallo(res.error);
  };

  // Las marcas de arriba: meses, y días o semanas según la escala.
  const marcas: Array<{ x: number; texto: string; mes: boolean }> = [];
  for (let i = 0; i < total; i++) {
    const d = sumarDias(desde, i);
    if (d.getDate() === 1) marcas.push({ x: i * W, texto: `${MESES[d.getMonth()]} ${d.getFullYear()}`, mes: true });
    else if (escala === 'dia' || (escala === 'semana' && d.getDay() === 1)) marcas.push({ x: i * W, texto: String(d.getDate()), mes: false });
  }
  const xHoy = diasEntre(desde, hoy) * W;

  // Dónde está cada fila, para las flechas.
  const posY = new Map<string, number>();
  lineas.forEach((l, i) => { if (l.tipo === 'fila') posY.set(l.barra.fila.id, i * ALTO_FILA + ALTO_FILA / 2); });
  const barraDe = new Map(barras.map(b => [b.fila.id, b]));

  return (
    <div className="p-2">
      <div className="flex flex-wrap items-center gap-1 pb-2">
        {(['dia', 'semana', 'mes'] as const).map(e => (
          <button key={e} onClick={() => onCambiarVista({ config: { ...cfg, escala: e } })}
            className={cn('h-8 px-2 rounded-md text-xs font-bold', escala === e ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100')}>
            {e === 'dia' ? 'Días' : e === 'semana' ? 'Semanas' : 'Meses'}
          </button>
        ))}
        <button onClick={() => { if (scroll.current) scroll.current.scrollLeft = Math.max(0, xHoy - 120); }} className="h-8 px-2 rounded-md text-xs font-bold text-slate-500 hover:bg-slate-100">Hoy</button>
        {editable && (
          <span className="ml-auto flex flex-wrap items-center gap-1 text-[11px] font-bold text-slate-400">
            Inicio
            <select value={colIni.id} onChange={e => onCambiarVista({ config: { ...cfg, fecha_columna: e.target.value } })} aria-label="Fecha de inicio"
              className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-600">
              {fechas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            Fin
            <select value={colFin?.id || ''} onChange={e => onCambiarVista({ config: { ...cfg, fecha_fin_columna: e.target.value || null } })} aria-label="Fecha de fin"
              className="h-8 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-600">
              <option value="">Sin fin (hitos)</option>
              {fechas.filter(c => c.id !== colIni.id).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </span>
        )}
      </div>
      {fallo && <p className="mb-2 text-xs font-bold text-rose-600">{fallo}</p>}
      <div className="flex border border-slate-200 rounded-lg overflow-hidden">
        {/* Los nombres, fijos a la izquierda. */}
        <div className="shrink-0 border-r border-slate-200 bg-white" style={{ width: ANCHO_NOMBRES }}>
          <div className="h-12 border-b border-slate-200 bg-slate-50" />
          {lineas.map((l, i) => l.tipo === 'grupo' ? (
            <div key={'g' + i} className="flex items-center gap-1.5 px-2 bg-slate-50/80 border-b border-slate-100" style={{ height: ALTO_FILA }}>
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-black truncate" style={l.color ? { backgroundColor: l.color + '33', color: l.color } : undefined}>{l.etiqueta}</span>
              <span className="text-[11px] font-bold text-slate-400">{l.n}</span>
            </div>
          ) : (
            <button key={l.barra.fila.id} onClick={() => onAbrir(l.barra.fila)}
              className="w-full flex items-center gap-1 px-2 text-left text-xs font-bold text-slate-700 truncate border-b border-slate-100 hover:bg-slate-50" style={{ height: ALTO_FILA }}>
              <span className="truncate">{tituloDe(l.barra.fila, columnaTitulo)}</span> <MarcaRecurrente fila={l.barra.fila} />
            </button>
          ))}
        </div>
        {/* El tiempo, que se desplaza. */}
        <div ref={scroll} className="flex-1 overflow-x-auto">
          <div className="relative" style={{ width: ancho }}>
            <div className="relative h-12 border-b border-slate-200 bg-slate-50">
              {marcas.map((m, i) => (
                <span key={i} className={cn('absolute whitespace-nowrap', m.mes ? 'top-1 text-[11px] font-black text-slate-600 capitalize' : 'top-6 text-[10px] font-bold text-slate-400')}
                  style={{ left: m.x + 2 }}>{m.texto}</span>
              ))}
            </div>
            <div className="relative" style={{ height: lineas.length * ALTO_FILA }}>
              {/* Las líneas de los meses y la de hoy. */}
              {marcas.filter(m => m.mes).map((m, i) => <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: m.x }} />)}
              <div className="absolute top-0 bottom-0 border-l-2 border-rose-400 z-[1]" style={{ left: xHoy + W / 2 }} title="Hoy" />
              {lineas.map((l, i) => {
                if (l.tipo === 'grupo') return <div key={'g' + i} className="absolute left-0 right-0 bg-slate-50/80 border-b border-slate-100" style={{ top: i * ALTO_FILA, height: ALTO_FILA }} />;
                const b = l.barra;
                const { inicio, fin } = conGesto(b);
                return (
                  <div key={b.fila.id} onClick={e => ponerFecha(e, b)}
                    className={cn('absolute left-0 right-0 border-b border-slate-100', !b.inicio && editable && 'cursor-copy hover:bg-emerald-50/40')}
                    style={{ top: i * ALTO_FILA, height: ALTO_FILA }}
                    title={!b.inicio && editable ? 'Pincha en un día para ponerle fecha' : undefined}>
                    {inicio && fin && (
                      <div
                        onPointerDown={e => empezar(e, b, 'mover')} onPointerMove={mover} onPointerUp={() => terminar(b)}
                        className={cn('absolute top-1.5 bottom-1.5 rounded-md bg-emerald-500/85 text-white shadow-sm flex items-center select-none touch-none',
                          editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer', gesto?.filaId === b.fila.id && 'ring-2 ring-emerald-700')}
                        style={{ left: diasEntre(desde, inicio) * W, width: Math.max(W, (diasEntre(inicio, fin) + 1) * W) }}
                        title={`${tituloDe(b.fila, columnaTitulo)} · ${isoLocal(inicio).split('-').reverse().join('/')}${colFin ? ' → ' + isoLocal(fin).split('-').reverse().join('/') : ''}`}>
                        {editable && colFin && <span onPointerDown={e => empezar(e, b, 'inicio')} onPointerMove={e => { e.stopPropagation(); mover(e); }} onPointerUp={e => { e.stopPropagation(); terminar(b); }} className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md hover:bg-black/20" />}
                        <span className="px-2 text-[11px] font-bold truncate">{tituloDe(b.fila, columnaTitulo)}</span>
                        {editable && colFin && <span onPointerDown={e => empezar(e, b, 'fin')} onPointerMove={e => { e.stopPropagation(); mover(e); }} onPointerUp={e => { e.stopPropagation(); terminar(b); }} className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md hover:bg-black/20" />}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Las flechas de las dependencias, por encima de todo. */}
              {!!dependencias.length && (
                <svg className="absolute inset-0 pointer-events-none z-[2]" width={ancho} height={lineas.length * ALTO_FILA}>
                  <defs>
                    <marker id="punta-ok" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#64748b" /></marker>
                    <marker id="punta-mal" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#e11d48" /></marker>
                  </defs>
                  {dependencias.map(({ de, a }) => {
                    const bd = barraDe.get(de), ba = barraDe.get(a);
                    const yd = posY.get(de), ya = posY.get(a);
                    if (!bd || !ba || yd === undefined || ya === undefined) return null;
                    const fd = conGesto(bd), fa = conGesto(ba);
                    if (!fd.fin || !fa.inicio) return null;
                    const x1 = (diasEntre(desde, fd.fin) + 1) * W;
                    const x2 = diasEntre(desde, fa.inicio) * W;
                    const mal = fa.inicio <= fd.fin;
                    const medio = Math.max(x1 + 10, x2 - 10);
                    return (
                      <path key={de + a} d={`M${x1},${yd} H${medio} V${ya} H${x2}`} fill="none"
                        stroke={mal ? '#e11d48' : '#64748b'} strokeWidth={1.5} strokeDasharray={mal ? '4 3' : undefined}
                        markerEnd={`url(#${mal ? 'punta-mal' : 'punta-ok'})`} />
                    );
                  })}
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
      {!conFecha.length && <p className="pt-2 text-xs text-slate-400">Ninguna fila tiene fecha todavía{editable ? ': pincha en el carril de una fila para ponérsela.' : '.'}</p>}
    </div>
  );
}
