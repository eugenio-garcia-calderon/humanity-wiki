// ============================================================================
// JUEGO VITAL — EL DINERO (2026-08-19, fase 10, petición de Eugenio: «un
// sistema de dinero a lo Grand Theft Auto donde uno pueda ver los recursos que
// tiene. También un sistema donde pueda establecer objetivos financieros y de
// adquisiciones. Y donde pueda ver el cómputo total de necesidades económicas
// de cada proyecto; cada proyecto tiene un presupuesto para los próximos años
// que se añadirá»).
//
// Dos piezas:
//   · HudDinero    — el contador de la esquina, siempre visible, estilo GTA.
//   · PanelFinanzas— lo que hay detrás: tus recursos, tus objetivos con su
//                    barra de progreso, y el presupuesto de cada proyecto año
//                    a año con el total de lo que pide tu mundo entero.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { Wallet, Target, Building2, Plus, Trash2, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, Button } from '../ui/core';
import { cn } from '../../utils/cn';

export interface Recursos {
  efectivo: number | string;
  banco: number | string;
  ingresos_mes: number | string;
  gastos_mes: number | string;
  moneda: string;
}
export interface ObjetivoFin {
  id: string;
  titulo: string;
  tipo: string;
  objetivo: number | string;
  acumulado: number | string;
  fecha_limite: string | null;
  proyecto_id: string | null;
  nota: string | null;
}
interface AnioTotal { anio: number; gasto: number | string; ingreso: number | string }

const n = (v: unknown) => Number(v ?? 0) || 0;

/** El dinero, escrito como se escribe en España: 12.480,50 €. */
export function euros(v: unknown, moneda = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: moneda || 'EUR', maximumFractionDigits: 0,
  }).format(n(v));
}

/** Todo lo del dinero en una llamada: recursos, objetivos y totales por año. */
export function useFinanzas() {
  const [recursos, setRecursos] = useState<Recursos | null>(null);
  const [objetivos, setObjetivos] = useState<ObjetivoFin[]>([]);
  const [porAnio, setPorAnio] = useState<AnioTotal[]>([]);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch('/api/finanzas', { credentials: 'include' });
      if (!r.ok) return;
      const j = await r.json();
      setRecursos(j.recursos);
      setObjetivos(j.objetivos || []);
      setPorAnio(j.porAnio || []);
    } catch { /* sin conexión: el HUD se queda como estaba */ }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  return { recursos, objetivos, porAnio, cargar, setRecursos };
}

// ---------------------------------------------------------------------------
// EL HUD: el contador de la esquina
// ---------------------------------------------------------------------------
export function HudDinero({ recursos, onAbrir }: { recursos: Recursos | null; onAbrir: () => void }) {
  const total = n(recursos?.efectivo) + n(recursos?.banco);
  const balance = n(recursos?.ingresos_mes) - n(recursos?.gastos_mes);
  return (
    <button
      onClick={onAbrir}
      title="Tus finanzas: recursos, objetivos y presupuestos"
      className="pointer-events-auto flex flex-col items-end gap-0.5 px-3 py-2 rounded-2xl bg-slate-900/72 backdrop-blur-sm border border-emerald-400/25 shadow-2xl hover:border-emerald-300/60 transition-colors"
    >
      <div className="flex items-center gap-1.5">
        <Wallet className="w-3.5 h-3.5 text-emerald-300" />
        {/* Tipografía tabular y monospace: el dinero no debe bailar al cambiar */}
        <span className="text-[17px] font-black tabular-nums text-emerald-300 leading-none tracking-tight">
          {euros(total, recursos?.moneda)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {balance >= 0
          ? <TrendingUp className="w-3 h-3 text-emerald-400" />
          : <TrendingDown className="w-3 h-3 text-rose-400" />}
        <span className={cn('text-[10px] font-bold tabular-nums', balance >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90')}>
          {balance >= 0 ? '+' : ''}{euros(balance, recursos?.moneda)}/mes
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// EL PANEL
// ---------------------------------------------------------------------------
export function PanelFinanzas({ recursos, objetivos, porAnio, proyectos, onCerrar, onRecargar, avisar }: {
  recursos: Recursos | null;
  objetivos: ObjetivoFin[];
  porAnio: AnioTotal[];
  proyectos: Array<{ id: string; titulo: string }>;
  onCerrar: () => void;
  onRecargar: () => void;
  avisar: (t: string) => void;
}) {
  const [pestana, setPestana] = useState<'recursos' | 'objetivos' | 'proyectos'>('recursos');
  const [borrador, setBorrador] = useState<Recursos>(() => recursos || {
    efectivo: 0, banco: 0, ingresos_mes: 0, gastos_mes: 0, moneda: 'EUR',
  });
  const [guardando, setGuardando] = useState(false);
  useEffect(() => { if (recursos) setBorrador(recursos); }, [recursos]);

  const guardarRecursos = async () => {
    setGuardando(true);
    try {
      const r = await fetch('/api/finanzas', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(borrador),
      });
      if (r.ok) { avisar('Recursos guardados.'); onRecargar(); }
      else avisar('No se han podido guardar.');
    } finally { setGuardando(false); }
  };

  // --- Objetivos
  const [nuevoObj, setNuevoObj] = useState({ titulo: '', objetivo: '', tipo: 'ahorro', proyecto_id: '' });
  const crearObjetivo = async () => {
    if (!nuevoObj.titulo.trim() || !Number(nuevoObj.objetivo)) return;
    const r = await fetch('/api/finanzas/objetivos', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nuevoObj, proyecto_id: nuevoObj.proyecto_id || null }),
    });
    if (r.ok) { setNuevoObj({ titulo: '', objetivo: '', tipo: 'ahorro', proyecto_id: '' }); onRecargar(); }
    else avisar('No se ha podido crear el objetivo.');
  };
  const avanzar = async (o: ObjetivoFin, cuanto: number) => {
    const nuevo = Math.max(0, n(o.acumulado) + cuanto);
    await fetch(`/api/finanzas/objetivos/${o.id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acumulado: nuevo }),
    });
    onRecargar();
  };
  const borrarObjetivo = async (id: string) => {
    await fetch(`/api/finanzas/objetivos/${id}`, { method: 'DELETE', credentials: 'include' });
    onRecargar();
  };

  // --- Presupuestos de un proyecto
  const [proySel, setProySel] = useState(proyectos[0]?.id || '');
  const [lineas, setLineas] = useState<Array<{ id: string; anio: number; concepto: string; importe: number | string; tipo: string }>>([]);
  const [nuevaLinea, setNuevaLinea] = useState({ anio: String(new Date().getFullYear()), concepto: '', importe: '', tipo: 'gasto' });
  const cargarPresupuesto = useCallback(async (pid: string) => {
    if (!pid) return setLineas([]);
    const r = await fetch(`/api/finanzas/presupuestos?proyecto=${encodeURIComponent(pid)}`, { credentials: 'include' });
    if (r.ok) { const j = await r.json(); setLineas(j.lineas || []); }
  }, []);
  useEffect(() => { if (pestana === 'proyectos') cargarPresupuesto(proySel); }, [pestana, proySel, cargarPresupuesto]);

  const anadirLinea = async () => {
    if (!proySel || !nuevaLinea.concepto.trim() || !Number(nuevaLinea.importe)) return;
    const r = await fetch('/api/finanzas/presupuestos', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...nuevaLinea, proyecto_id: proySel }),
    });
    if (r.ok) {
      setNuevaLinea({ ...nuevaLinea, concepto: '', importe: '' });
      cargarPresupuesto(proySel);
      onRecargar();
    } else {
      const j = await r.json().catch(() => ({}));
      avisar(j.error || 'No se ha podido añadir.');
    }
  };
  const borrarLinea = async (id: string) => {
    await fetch(`/api/finanzas/presupuestos/${id}`, { method: 'DELETE', credentials: 'include' });
    cargarPresupuesto(proySel);
    onRecargar();
  };

  const moneda = recursos?.moneda || 'EUR';
  const totalGeneral = porAnio.reduce((a, x) => a + n(x.gasto) - n(x.ingreso), 0);
  // Las líneas del proyecto elegido, agrupadas por año.
  const anios = [...new Set(lineas.map(l => l.anio))].sort();

  const campo = 'w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm tabular-nums focus:outline-none focus:border-emerald-300';

  return (
    <div data-ui-juego className="absolute inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/50 backdrop-blur-[2px]" onClick={onCerrar}>
      <Card className="w-[94vw] max-w-3xl max-h-[88vh] p-0 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="flex-1 text-sm font-black text-slate-900">Tus finanzas</p>
          <Button variant="ghost" onClick={onCerrar} className="p-1"><X className="w-3.5 h-3.5" /></Button>
        </div>

        {/* Las tres pestañas */}
        <div className="flex gap-1 px-4 py-2 border-b border-slate-100">
          {([
            { id: 'recursos', txt: 'Lo que tengo', icono: Wallet },
            { id: 'objetivos', txt: 'Mis objetivos', icono: Target },
            { id: 'proyectos', txt: 'Presupuestos', icono: Building2 },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setPestana(t.id)}
              className={cn(
                'flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-full border transition-colors',
                pestana === t.id ? 'bg-emerald-600 text-white border-emerald-600' : 'text-slate-500 border-slate-200 hover:bg-slate-50',
              )}
            >
              <t.icono className="w-3.5 h-3.5" />{t.txt}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {/* ---------------- LO QUE TENGO ---------------- */}
          {pestana === 'recursos' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {([
                  { k: 'efectivo', txt: 'Efectivo' },
                  { k: 'banco', txt: 'En el banco' },
                  { k: 'ingresos_mes', txt: 'Ingresos al mes' },
                  { k: 'gastos_mes', txt: 'Gastos al mes' },
                ] as const).map(c => (
                  <label key={c.k} className="block">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.txt}</span>
                    <input
                      type="number"
                      value={String(borrador[c.k] ?? 0)}
                      onChange={e => setBorrador({ ...borrador, [c.k]: e.target.value })}
                      className={campo}
                    />
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total disponible</p>
                  <p className="text-xl font-black tabular-nums text-emerald-700">
                    {euros(n(borrador.efectivo) + n(borrador.banco), moneda)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Balance mensual</p>
                  <p className={cn('text-lg font-black tabular-nums',
                    n(borrador.ingresos_mes) - n(borrador.gastos_mes) >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                    {euros(n(borrador.ingresos_mes) - n(borrador.gastos_mes), moneda)}
                  </p>
                </div>
              </div>
              <Button onClick={guardarRecursos} disabled={guardando} className="w-full">
                {guardando ? 'Guardando…' : 'Guardar mis recursos'}
              </Button>
              {!!porAnio.length && (
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tus proyectos necesitan <b className="tabular-nums">{euros(totalGeneral, moneda)}</b> netos
                  en total según sus presupuestos. Mira la pestaña «Presupuestos».
                </p>
              )}
            </div>
          )}

          {/* ---------------- MIS OBJETIVOS ---------------- */}
          {pestana === 'objetivos' && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 p-2.5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nuevo objetivo</p>
                <div className="grid grid-cols-[1fr,110px] gap-2">
                  <input
                    value={nuevoObj.titulo}
                    onChange={e => setNuevoObj({ ...nuevoObj, titulo: e.target.value })}
                    placeholder="Comprar la furgoneta, ahorrar para…"
                    className={campo}
                  />
                  <input
                    type="number" value={nuevoObj.objetivo}
                    onChange={e => setNuevoObj({ ...nuevoObj, objetivo: e.target.value })}
                    placeholder="Cuánto" className={campo}
                  />
                </div>
                <div className="grid grid-cols-[130px,1fr,auto] gap-2">
                  <select value={nuevoObj.tipo} onChange={e => setNuevoObj({ ...nuevoObj, tipo: e.target.value })} className={campo}>
                    <option value="ahorro">Ahorro</option>
                    <option value="adquisicion">Adquisición</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                  <select value={nuevoObj.proyecto_id} onChange={e => setNuevoObj({ ...nuevoObj, proyecto_id: e.target.value })} className={campo}>
                    <option value="">Sin proyecto</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                  </select>
                  <Button onClick={crearObjetivo} className="px-3"><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              {!objetivos.length && (
                <p className="text-xs text-slate-400 text-center py-6">
                  Sin objetivos todavía. Escribe arriba lo que quieres conseguir y cuánto cuesta.
                </p>
              )}
              {objetivos.map(o => {
                const pct = Math.min(100, Math.round((n(o.acumulado) / Math.max(1, n(o.objetivo))) * 100));
                const listo = pct >= 100;
                return (
                  <div key={o.id} className="rounded-xl border border-slate-200 p-2.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{o.titulo}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {o.tipo === 'adquisicion' ? 'Adquisición' : o.tipo === 'ingreso' ? 'Ingreso' : 'Ahorro'}
                          {o.proyecto_id ? ` · ${proyectos.find(p => p.id === o.proyecto_id)?.titulo || 'proyecto'}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-black tabular-nums text-slate-700 shrink-0">
                        {euros(o.acumulado, moneda)} <span className="text-slate-400">/ {euros(o.objetivo, moneda)}</span>
                      </p>
                      <button onClick={() => borrarObjetivo(o.id)} title="Quitar objetivo"
                        className="p-1 text-slate-300 hover:text-rose-600 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', listo ? 'bg-emerald-500' : 'bg-amber-400')}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={cn('text-[10px] font-black tabular-nums', listo ? 'text-emerald-600' : 'text-slate-400')}>
                        {pct}%{listo ? ' · conseguido' : ''}
                      </span>
                      <div className="ml-auto flex gap-1">
                        {[50, 100, 500].map(c => (
                          <button key={c} onClick={() => avanzar(o, c)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 tabular-nums">
                            +{c}
                          </button>
                        ))}
                        <button onClick={() => avanzar(o, -50)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 hover:bg-rose-50 hover:border-rose-300">
                          −50
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ---------------- PRESUPUESTOS ---------------- */}
          {pestana === 'proyectos' && (
            <div className="space-y-3">
              {/* El cómputo total de TODO tu mundo, año a año */}
              {!!porAnio.length && (
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Lo que necesita tu mundo entero
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {porAnio.map(a => {
                      // Gasto e ingreso por separado: un año con ingresos no debe
                      // leerse como «-5.000 €», que despista.
                      const gasto = n(a.gasto), ingreso = n(a.ingreso), neto = gasto - ingreso;
                      return (
                        <div key={a.anio} className="rounded-lg bg-white border border-slate-200 px-2.5 py-1.5">
                          <p className="text-[10px] font-black text-slate-400">{a.anio}</p>
                          <p className={cn('text-sm font-black tabular-nums', neto > 0 ? 'text-rose-600' : 'text-emerald-700')}>
                            {neto > 0 ? `pones ${euros(neto, moneda)}` : neto < 0 ? `te sobran ${euros(-neto, moneda)}` : 'en equilibrio'}
                          </p>
                          <p className="text-[10px] tabular-nums text-slate-500">
                            cuesta {euros(gasto, moneda)}{ingreso > 0 && ` · gana ${euros(ingreso, moneda)}`}
                          </p>
                        </div>
                      );
                    })}
                    <div className="rounded-lg bg-slate-900 px-2.5 py-1.5">
                      <p className="text-[10px] font-black text-slate-400">Total</p>
                      <p className="text-sm font-black tabular-nums text-white">{euros(totalGeneral, moneda)}</p>
                      <p className="text-[10px] text-slate-400">{totalGeneral > 0 ? 'que tienes que poner' : 'a favor'}</p>
                    </div>
                  </div>
                </div>
              )}

              <select value={proySel} onChange={e => setProySel(e.target.value)} className={campo}>
                {!proyectos.length && <option value="">No tienes proyectos todavía</option>}
                {proyectos.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
              </select>

              {/* Añadir línea de presupuesto */}
              <div className="grid grid-cols-[80px,1fr,110px,110px,auto] gap-2">
                <input type="number" value={nuevaLinea.anio}
                  onChange={e => setNuevaLinea({ ...nuevaLinea, anio: e.target.value })} className={campo} />
                <input value={nuevaLinea.concepto}
                  onChange={e => setNuevaLinea({ ...nuevaLinea, concepto: e.target.value })}
                  placeholder="Concepto (obra, licencias, sueldos…)" className={campo} />
                <input type="number" value={nuevaLinea.importe}
                  onChange={e => setNuevaLinea({ ...nuevaLinea, importe: e.target.value })}
                  placeholder="Importe" className={campo} />
                <select value={nuevaLinea.tipo}
                  onChange={e => setNuevaLinea({ ...nuevaLinea, tipo: e.target.value })} className={campo}>
                  <option value="gasto">Gasto</option>
                  <option value="ingreso">Ingreso</option>
                </select>
                <Button onClick={anadirLinea} className="px-3"><Plus className="w-3.5 h-3.5" /></Button>
              </div>

              {!lineas.length && (
                <p className="text-xs text-slate-400 text-center py-6">
                  Este proyecto no tiene presupuesto todavía. Añade arriba lo que va a costar cada año.
                </p>
              )}
              {anios.map(anio => {
                const delAnio = lineas.filter(l => l.anio === anio);
                const gasto = delAnio.filter(l => l.tipo === 'gasto').reduce((a, l) => a + n(l.importe), 0);
                const ingreso = delAnio.filter(l => l.tipo === 'ingreso').reduce((a, l) => a + n(l.importe), 0);
                return (
                  <div key={anio} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50">
                      <p className="text-xs font-black text-slate-700">{anio}</p>
                      <p className="text-xs font-black tabular-nums">
                        {gasto > 0 && <span className="text-rose-600">−{euros(gasto, moneda)}</span>}
                        {ingreso > 0 && <span className="text-emerald-700 ml-2">+{euros(ingreso, moneda)}</span>}
                      </p>
                    </div>
                    {delAnio.map(l => (
                      <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 border-t border-slate-100">
                        <span className="flex-1 text-xs text-slate-700 truncate">{l.concepto}</span>
                        <span className={cn('text-xs font-bold tabular-nums', l.tipo === 'gasto' ? 'text-rose-600' : 'text-emerald-700')}>
                          {l.tipo === 'gasto' ? '−' : '+'}{euros(l.importe, moneda)}
                        </span>
                        <button onClick={() => borrarLinea(l.id)} className="p-0.5 text-slate-300 hover:text-rose-600">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
