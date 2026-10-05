import { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatear, type Columna } from './Celda';
import { agruparFilas, agrupable, type ConfigVista, type Fila, type Vista } from './vistaUtil';

// ============================================================================
// TABLAS · LA VISTA GRÁFICO (2026-10-05, carril «bd»)
// ============================================================================
// Barras, líneas, área, circular o una cifra sola, sacadas de las filas que
// deja pasar el filtro de la vista. Se agrupa por una propiedad (la misma
// cuenta que hacen el tablero y los grupos de la tabla, `agruparFilas`) y en
// cada grupo se cuenta, se suma o se hace la media de otra.
//
// ES UNA VISTA, NO UNA FOTO: se calcula al pintar, con los datos de ahora.
// Una gráfica guardada como imagen se queda vieja el día que alguien cambia
// una fila, y nadie se da cuenta. Y como es una vista, una página puede llevar
// varias —varios bloques de la misma base de datos, cada uno con su vista— y
// eso es un panel.
//
// LOS HUECOS NO SON CEROS. Una fila sin importe no suma cero a la media: no
// cuenta. Si un grupo no tiene ningún número, su media es «sin datos», no 0,
// por la misma regla de los cuatro estados de una celda (`bd/celdas.ts`).
//
// recharts pesa: este fichero se carga aparte (`lazy` en `Rejilla.tsx`), solo
// cuando hay un gráfico en pantalla.

const PALETA = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#dc2626', '#64748b', '#0d9488', '#db2777', '#65a30d', '#9333ea'];
const NUMERICOS = new Set(['numero', 'moneda', 'porcentaje', 'duracion', 'valoracion', 'formula', 'agregado', 'condicional']);
const OPERACIONES: Array<{ id: NonNullable<NonNullable<ConfigVista['grafico']>['operacion']>; label: string }> = [
  { id: 'contar', label: 'Recuento' }, { id: 'suma', label: 'Suma' }, { id: 'media', label: 'Media' },
  { id: 'minimo', label: 'Mínimo' }, { id: 'maximo', label: 'Máximo' },
];
const TIPOS: Array<{ id: NonNullable<NonNullable<ConfigVista['grafico']>['tipo']>; label: string }> = [
  { id: 'barras', label: 'Barras' }, { id: 'barras_h', label: 'Barras horizontales' }, { id: 'lineas', label: 'Líneas' },
  { id: 'area', label: 'Área' }, { id: 'circular', label: 'Circular' }, { id: 'anillo', label: 'Anillo' }, { id: 'numero', label: 'Una cifra' },
];

const claseSelect = 'h-8 min-w-0 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-400';

/** Lo que vale un grupo según la operación. `null` = no hay con qué. */
function medir(filas: Fila[], op: string, col: Columna | null): number | null {
  if (op === 'contar' || !col) return filas.length;
  const nums: number[] = [];
  for (const f of filas) {
    const c = f.celdas[col.id];
    if (c?.estado === 'ok' && typeof c.valor === 'number' && Number.isFinite(c.valor)) nums.push(c.valor);
    else if (c?.estado === 'ok' && typeof c.valor === 'boolean') nums.push(c.valor ? 1 : 0);
  }
  if (op === 'suma') return nums.reduce((a, b) => a + b, 0);
  if (!nums.length) return null;
  if (op === 'media') return nums.reduce((a, b) => a + b, 0) / nums.length;
  if (op === 'minimo') return Math.min(...nums);
  return Math.max(...nums);
}

export default function Grafico({ columnas, filas, vista, editable, onCambiarVista }: {
  columnas: Columna[];
  filas: Fila[];
  vista: Vista;
  editable: boolean;
  onCambiarVista: (c: Partial<Vista>) => void;
}) {
  const g = vista.config.grafico || {};
  const tipo = g.tipo || 'barras';
  const op = g.operacion || 'contar';
  const eje = columnas.find(c => c.id === g.eje && agrupable(c))
    // Sin elegir, la primera selección: es casi siempre lo que se quiere contar.
    || (g.eje === undefined ? columnas.find(c => c.tipo === 'seleccion' || c.tipo === 'seleccion_multiple') : null) || null;
  const numericas = columnas.filter(c => NUMERICOS.has(c.tipo) || c.tipo === 'casilla');
  const colValor = op === 'contar' ? null : numericas.find(c => c.id === g.valor) || numericas[0] || null;
  const cambiar = (c: Partial<NonNullable<ConfigVista['grafico']>>) => onCambiarVista({ config: { ...vista.config, grafico: { ...g, ...c } } });

  /** Cómo se escribe una cifra: con el formato de la columna medida. */
  const fmt = (v: number | null) => {
    if (v === null || v === undefined) return 'sin datos';
    if (colValor && op !== 'contar') return formatear({ estado: 'ok', valor: op === 'media' ? Math.round(v * 100) / 100 : v }, colValor) || String(v);
    return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }).format(v);
  };

  const datos = useMemo(() => {
    if (!eje) return [];
    const grupos = agruparFilas(filas, eje, { ...vista.config, ocultar_vacios: false })
      // «Sin …» solo si tiene filas: una barra vacía al final no dice nada.
      .filter(x => !x.vacio || x.filas.length)
      .filter(x => !(vista.config.grupos_ocultos || []).includes(x.clave));
    let out = grupos.map((x, i) => ({ nombre: x.etiqueta, valor: medir(x.filas, op, colValor), color: x.color || PALETA[i % PALETA.length], n: x.filas.length }));
    if (g.orden === 'valor_desc') out = [...out].sort((a, b) => (b.valor ?? -Infinity) - (a.valor ?? -Infinity));
    if (g.orden === 'valor_asc') out = [...out].sort((a, b) => (a.valor ?? Infinity) - (b.valor ?? Infinity));
    if (g.acumulado && (tipo === 'lineas' || tipo === 'area')) {
      let suma = 0;
      out = out.map(d => ({ ...d, valor: d.valor === null ? suma : (suma += d.valor) }));
    }
    return out;
  }, [filas, eje, op, colValor, g.orden, g.acumulado, tipo, vista.config]);

  const total = medir(filas, op, colValor);
  const alto = g.alto || 300;
  const nombreMedida = op === 'contar' ? 'Filas' : `${OPERACIONES.find(o => o.id === op)?.label} de ${colValor?.nombre || '—'}`;

  const mandos = editable && (
    <div className="flex flex-wrap items-center gap-1.5 pb-3">
      <select value={tipo} onChange={e => cambiar({ tipo: e.target.value as any })} aria-label="Tipo de gráfico" className={claseSelect}>
        {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
      {tipo !== 'numero' && (
        <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
          por
          <select value={eje?.id || ''} onChange={e => cambiar({ eje: e.target.value || null })} aria-label="Agrupar por" className={claseSelect}>
            <option value="">Elige…</option>
            {columnas.filter(agrupable).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
      )}
      <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
        mide
        <select value={op} onChange={e => cambiar({ operacion: e.target.value as any })} aria-label="Qué se mide" className={claseSelect}>
          {OPERACIONES.map(o => <option key={o.id} value={o.id} disabled={o.id !== 'contar' && !numericas.length}>{o.label}</option>)}
        </select>
      </label>
      {op !== 'contar' && (
        <select value={colValor?.id || ''} onChange={e => cambiar({ valor: e.target.value })} aria-label="De qué propiedad" className={claseSelect}>
          {numericas.map(c => <option key={c.id} value={c.id}>de {c.nombre}</option>)}
        </select>
      )}
      {tipo !== 'numero' && (
        <select value={g.orden || 'eje'} onChange={e => cambiar({ orden: e.target.value as any })} aria-label="Orden" className={claseSelect}>
          <option value="eje">En el orden de los grupos</option>
          <option value="valor_desc">De mayor a menor</option>
          <option value="valor_asc">De menor a mayor</option>
        </select>
      )}
      {(tipo === 'lineas' || tipo === 'area') && (
        <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer">
          <input type="checkbox" checked={!!g.acumulado} onChange={e => cambiar({ acumulado: e.target.checked })} /> Acumulado
        </label>
      )}
      <select value={String(alto)} onChange={e => cambiar({ alto: Number(e.target.value) })} aria-label="Alto" className={claseSelect}>
        <option value="200">Bajo</option><option value="300">Mediano</option><option value="420">Alto</option>
      </select>
    </div>
  );

  if (tipo === 'numero') {
    return (
      <div className="p-3">
        {mandos}
        <div className="py-6 text-center">
          <p className="text-5xl font-black tracking-tight text-slate-900 tabular-nums">{fmt(total)}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{nombreMedida}</p>
        </div>
      </div>
    );
  }

  if (!eje) {
    return (
      <div className="p-3">
        {mandos}
        <div className="p-8 text-center">
          <BarChart3 className="w-8 h-8 mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-bold text-slate-600">Elige por qué propiedad agrupar.</p>
          <p className="text-xs text-slate-400">Cada valor será una barra o un trozo del círculo.</p>
        </div>
      </div>
    );
  }

  const tooltip = <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: any) => [fmt(v as number | null), nombreMedida]} />;
  const ejes = (horizontal = false) => horizontal ? (
    <>
      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} />
      <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={110} />
    </>
  ) : (
    <>
      <XAxis dataKey="nombre" tick={{ fontSize: 11 }} interval={0} angle={datos.length > 6 ? -25 : 0} textAnchor={datos.length > 6 ? 'end' : 'middle'} height={datos.length > 6 ? 56 : 30} />
      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmt(v)} width={64} />
    </>
  );

  return (
    <div className="p-3">
      {mandos}
      {!datos.length ? <p className="p-6 text-center text-sm text-slate-400">No hay filas que dibujar con estos filtros.</p> : (
        <div className={cn('w-full')} style={{ height: alto }}>
          <ResponsiveContainer width="100%" height="100%">
            {tipo === 'lineas' ? (
              <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />{ejes()}{tooltip}
                <Line type="monotone" dataKey="valor" stroke="#059669" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
              </LineChart>
            ) : tipo === 'area' ? (
              <AreaChart data={datos} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />{ejes()}{tooltip}
                <Area type="monotone" dataKey="valor" stroke="#059669" fill="#05966933" strokeWidth={2} />
              </AreaChart>
            ) : tipo === 'circular' || tipo === 'anillo' ? (
              <PieChart>
                <Pie data={datos.filter(d => (d.valor ?? 0) > 0)} dataKey="valor" nameKey="nombre" innerRadius={tipo === 'anillo' ? '55%' : 0} outerRadius="85%" paddingAngle={tipo === 'anillo' ? 2 : 0}
                  label={({ name, percent }: any) => `${name} · ${Math.round((percent || 0) * 100)} %`} labelLine={false}>
                  {datos.filter(d => (d.valor ?? 0) > 0).map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                {tooltip}<Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            ) : (
              <BarChart data={datos} layout={tipo === 'barras_h' ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />{ejes(tipo === 'barras_h')}{tooltip}
                <Bar dataKey="valor" radius={tipo === 'barras_h' ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
                  {datos.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <p className="pt-1 text-[11px] text-slate-400 text-right">{nombreMedida} · total {fmt(total)} · {filas.length} {filas.length === 1 ? 'fila' : 'filas'}</p>
    </div>
  );
}
