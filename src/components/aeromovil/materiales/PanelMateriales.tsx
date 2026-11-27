/**
 * «Materiales y estructura» under the 3D view of «Chasis y carrocería» (2026-11-27). Everything it says is in `datos.ts`; this
 * file only draws it. Loaded with `lazy` from `pages/Aeromovil.tsx` (recharts is heavy and only this tab needs it).
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Layers, ShieldCheck } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ErrorBar, LabelList, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import {
  ARQUITECTURAS, CRITERIOS, FECHA, FUENTES, MATERIALES, PANELES, PANEL_REF, PRESETS, RECOMENDACION, RESINA, SEGURIDAD, UNIONES, ZONAS,
  material, puntuacion, type Arquitectura, type Criterio, type IdArquitectura,
} from './datos';

// Two series, validated (dataviz validator, light surface): fibres and metals. Text never wears these.
const FIBRA = 'var(--color-blue-600)', METAL = 'var(--color-orange-600)', REJILLA = 'var(--color-slate-200)', EJE = 'var(--color-slate-500)';
const fmt = (v: number, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
/** where each architecture's name goes beside its point, so two points at the same cost do not write on each other */
const LADO: Record<IdArquitectura, ['left' | 'right', number]> = { 'acero-vidrio': ['right', -6], 'aluminio-lino': ['left', -6], 'hibrido-vidrio': ['left', 15], 'hibrido-carbono': ['right', -6], 'monocasco-vidrio': ['right', -6], 'monocasco-carbono': ['left', -6] };

function Titulo({ n, children, nota }: { n: number; children: React.ReactNode; nota?: string }) {
  return <h3 className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold text-slate-900"><span className="font-mono text-xs text-slate-400">{n}</span>{children}{nota && <span className="text-xs font-normal text-slate-500">{nota}</span>}</h3>;
}
function Leyenda() {
  return (
    <p className="flex gap-4 text-xs text-slate-600">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: FIBRA }} />fibras</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: METAL }} />metales, para comparar</span>
    </p>
  );
}

/** One small horizontal bar chart of the six materials (same order in every one), with the range as a whisker. */
function Barras({ titulo, unidad, datos, decimales = 0, nota }: { titulo: string; unidad: string; nota: string; decimales?: number; datos: { nombre: string; v: number; r?: [number, number]; fibra: boolean }[] }) {
  const filas = datos.map(d => ({ ...d, err: d.r ? [d.v - d.r[0], d.r[1] - d.v] : [0, 0], color: d.fibra ? FIBRA : METAL }));
  return (
    <figure className="rounded-lg border border-slate-200 p-2">
      <figcaption className="px-1 text-sm font-semibold text-slate-800">{titulo} <span className="font-normal text-slate-500">({unidad})</span></figcaption>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} layout="vertical" margin={{ top: 6, right: 44, bottom: 0, left: 4 }} barCategoryGap={6}>
            <CartesianGrid stroke={REJILLA} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: EJE }} stroke={REJILLA} />
            <YAxis type="category" dataKey="nombre" width={64} tick={{ fontSize: 11, fill: 'var(--color-slate-700)' }} stroke={REJILLA} />
            <Tooltip cursor={{ fill: 'var(--color-slate-100)' }} formatter={(_v, _n, it) => { const p = it.payload as typeof filas[number]; return [`${fmt(p.v, decimales)} ${unidad}${p.r ? ` (de ${fmt(p.r[0], decimales)} a ${fmt(p.r[1], decimales)})` : ''}`, titulo]; }} />
            <Bar dataKey="v" radius={[0, 4, 4, 0]} isAnimationActive={false} shape={(p: { x?: number; y?: number; width?: number; height?: number; payload?: { color: string } }) => <rect x={p.x} y={p.y} width={Math.max(0, p.width ?? 0)} height={p.height} rx={3} fill={p.payload?.color} />}>
              <ErrorBar dataKey="err" direction="x" width={5} strokeWidth={1.5} stroke="var(--color-slate-700)" />
              {/* the value goes after the whisker, not on it */}
              <LabelList dataKey="v" content={((p: { x?: number; y?: number; width?: number; height?: number; index?: number }) => {
                const d = filas[p.index ?? 0], px = d.v ? (p.width ?? 0) / d.v : 0, fin = (p.x ?? 0) + Math.max(d.v, d.r?.[1] ?? d.v) * px;
                return <text x={fin + 6} y={(p.y ?? 0) + (p.height ?? 0) / 2 + 3.5} fontSize={10} fill="var(--color-slate-700)">{fmt(d.v, decimales)}</text>;
              }) as never} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="px-1 text-[11px] leading-snug text-slate-500">{nota}</p>
    </figure>
  );
}

/** Peso frente a coste del prototipo: the trade-off in one picture. */
function Compromiso({ mejor }: { mejor: IdArquitectura }) {
  const puntos = ARQUITECTURAS.map(a => {
    const x = (a.prototipo[0] + a.prototipo[1]) / 2, y = (a.masa[0] + a.masa[1]) / 2;
    return { id: a.id, corto: a.corto, x, y, ex: [x - a.prototipo[0], a.prototipo[1] - x], ey: [y - a.masa[0], a.masa[1] - y], mejor: a.id === mejor };
  });
  const Etiqueta = (p: { x?: number; y?: number; index?: number }) => {
    const d = puntos[p.index ?? 0], [lado, dy] = LADO[d.id], izq = lado === 'left';
    return <text x={(p.x ?? 0) + (izq ? -9 : 9)} y={(p.y ?? 0) + dy} textAnchor={izq ? 'end' : 'start'} fontSize={11} fontWeight={d.mejor ? 700 : 400} fill="var(--color-slate-800)">{d.corto}{d.mejor ? ' ★' : ''}</text>;
  };
  return (
    <figure className="rounded-lg border border-slate-200 p-2">
      <figcaption className="px-1 text-sm font-semibold text-slate-800">Peso frente a coste del prototipo <span className="font-normal text-slate-500">(estructura + piel; abajo a la izquierda es mejor)</span></figcaption>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 16, right: 24, bottom: 18, left: 0 }}>
            <CartesianGrid stroke={REJILLA} />
            <XAxis type="number" dataKey="x" domain={[0, 24]} ticks={[0, 4, 8, 12, 16, 20, 24]} tick={{ fontSize: 10, fill: EJE }} stroke={REJILLA}
              label={{ value: 'materiales y moldes de una unidad, miles de €', position: 'insideBottom', offset: -10, fontSize: 10, fill: EJE }} />
            <YAxis type="number" dataKey="y" domain={[20, 80]} ticks={[20, 30, 40, 50, 60, 70, 80]} tick={{ fontSize: 10, fill: EJE }} stroke={REJILLA} width={44}
              label={{ value: 'kg', position: 'insideTopLeft', offset: 4, fontSize: 10, fill: EJE }} />
            <ZAxis range={[90, 90]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
              const d = payload?.[0]?.payload as typeof puntos[number] | undefined; if (!d) return null;
              const a = ARQUITECTURAS.find(x => x.id === d.id)!;
              return <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm"><p className="font-semibold text-slate-900">{a.nombre}</p><p className="text-slate-600">{a.masa.join('–')} kg · {a.prototipo.join('–')} mil € · {a.horas.join('–')} h de taller</p></div>;
            }} />
            <Scatter data={puntos} fill={FIBRA} isAnimationActive={false} shape={(p: { cx?: number; cy?: number; payload?: { mejor: boolean } }) => <circle cx={p.cx} cy={p.cy} r={p.payload?.mejor ? 7 : 5} fill={FIBRA} stroke="white" strokeWidth={2} />}>
              <ErrorBar dataKey="ex" direction="x" width={0} strokeWidth={1} stroke="var(--color-slate-400)" />
              <ErrorBar dataKey="ey" direction="y" width={0} strokeWidth={1} stroke="var(--color-slate-400)" />
              <LabelList dataKey="corto" content={Etiqueta as never} />
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="px-1 text-[11px] leading-snug text-slate-500">Cada punto es el centro de una horquilla estimada (las líneas grises): no hay presupuestos todavía. ★ = la mejor con las prioridades de abajo. Sin mano de obra: las horas de taller están en la tabla.</p>
    </figure>
  );
}

/** The priorities and the score they give each architecture. */
function Prioridades({ imp, setImp }: { imp: Record<Criterio, number>; setImp: (i: Record<Criterio, number>) => void }) {
  const filas = useMemo(() => [...ARQUITECTURAS].map(a => ({ corto: a.corto, id: a.id, v: puntuacion(a, imp) })).sort((a, b) => b.v - a.v), [imp]);
  const preset = PRESETS.find(p => CRITERIOS.every(c => p.importancia[c.id] === imp[c.id]));
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Prioridades ya hechas">
          {PRESETS.map(p => (
            <Button key={p.id} variant="outline" aria-pressed={preset?.id === p.id} title={p.que} onClick={() => setImp({ ...p.importancia })}
              className={cn('px-2 py-1 text-[11px] normal-case tracking-normal', preset?.id === p.id && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>{p.nombre}</Button>
          ))}
        </div>
        <ul className="flex flex-col gap-1">
          {CRITERIOS.map(c => (
            <li key={c.id} className="flex flex-col gap-0.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <span className="min-w-0 text-slate-700" title={c.que}>{c.nombre}</span>
              <span className="grid shrink-0 grid-cols-4 gap-0.5 sm:flex" role="radiogroup" aria-label={`Importancia de ${c.nombre}`}>
                {[0, 1, 2, 3].map(n => (
                  <Button key={n} variant="outline" role="radio" aria-checked={imp[c.id] === n} onClick={() => setImp({ ...imp, [c.id]: n })}
                    className={cn('h-7 px-1 py-0 text-[10px] normal-case tracking-normal sm:w-[4.2rem]', imp[c.id] === n && 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800')}>
                    {['no cuenta', 'poco', 'bastante', 'mucho'][n]}
                  </Button>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500">Cada opción tiene una nota de 1 a 5 en cada criterio (en la tabla de abajo); la puntuación es la media pesada con esta importancia, de 0 a 100.</p>
      </div>
      <figure className="rounded-lg border border-slate-200 p-2">
        <figcaption className="px-1 text-sm font-semibold text-slate-800">Puntuación con estas prioridades <span className="font-normal text-slate-500">(0–100)</span></figcaption>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 36, bottom: 0, left: 4 }} barCategoryGap={6}>
              <CartesianGrid stroke={REJILLA} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 10, fill: EJE }} stroke={REJILLA} />
              <YAxis type="category" dataKey="corto" width={112} tick={{ fontSize: 11, fill: 'var(--color-slate-700)' }} stroke={REJILLA} />
              <Tooltip cursor={{ fill: 'var(--color-slate-100)' }} formatter={(v: unknown) => [`${v} de 100`, 'Puntuación']} />
              <Bar dataKey="v" fill={FIBRA} radius={[0, 4, 4, 0]} isAnimationActive={false}>
                <LabelList dataKey="v" position="right" style={{ fontSize: 10, fill: 'var(--color-slate-700)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="px-1 text-[11px] text-slate-500">Con {preset ? `«${preset.nombre}»` : 'estas prioridades'} gana <strong className="text-slate-800">{filas[0].corto}</strong>{filas[1] && filas[0].v - filas[1].v <= 5 ? `, casi empatado con ${filas[1].corto}` : ''}.</p>
      </figure>
    </div>
  );
}

function Nota({ n }: { n: number }) {
  return <span className="inline-flex gap-0.5" aria-label={`${n} de 5`}>{[1, 2, 3, 4, 5].map(i => <span key={i} className={cn('h-1.5 w-1.5 rounded-full', i <= n ? 'bg-slate-700' : 'bg-slate-200')} />)}</span>;
}

function TablaArquitecturas({ abierta, setAbierta }: { abierta: IdArquitectura | null; setAbierta: (a: IdArquitectura | null) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-xs">
        <thead><tr className="border-b border-slate-200 text-left text-slate-500">
          <th className="py-1 pr-2 font-medium">Arquitectura</th><th className="px-2 font-medium">kg</th><th className="px-2 font-medium">mil €</th><th className="px-2 font-medium">horas</th>
          {CRITERIOS.map(c => <th key={c.id} className="px-1 font-medium" title={c.que}>{c.nombre}</th>)}
        </tr></thead>
        <tbody>
          {ARQUITECTURAS.map(a => (
            <tr key={a.id} className="border-b border-slate-100 align-middle">
              <td className="py-1 pr-2"><Button variant="ghost" aria-expanded={abierta === a.id} onClick={() => setAbierta(abierta === a.id ? null : a.id)} className="gap-1 px-1 py-0.5 text-left text-xs font-semibold normal-case tracking-normal text-slate-800">
                <ChevronDown className={cn('h-3 w-3 shrink-0 transition-transform', abierta === a.id && 'rotate-180')} />{a.corto}</Button></td>
              <td className="px-2 font-mono tabular-nums text-slate-700">{a.masa.join('–')}</td>
              <td className="px-2 font-mono tabular-nums text-slate-700">{a.prototipo.join('–')}</td>
              <td className="px-2 font-mono tabular-nums text-slate-700">{a.horas.join('–')}</td>
              {CRITERIOS.map(c => <td key={c.id} className="px-1"><Nota n={a.notas[c.id]} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetalleArquitectura({ a }: { a: Arquitectura }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
      <p className="text-sm font-semibold text-slate-900">{a.nombre}</p>
      <p className="mt-1">{a.que}</p>
      <p className="mt-1 text-slate-500">De dónde sale el peso: {a.comoMasa}.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div><p className="font-semibold text-emerald-800">A favor</p><ul className="ml-4 list-disc">{a.pros.map(t => <li key={t}>{t}</li>)}</ul></div>
        <div><p className="font-semibold text-red-800">En contra</p><ul className="ml-4 list-disc">{a.contras.map(t => <li key={t}>{t}</li>)}</ul></div>
      </div>
      <p className="mt-2 text-slate-500">Quién lo hace así: {a.ejemplos.join('; ')}.</p>
    </div>
  );
}

export default function PanelMateriales() {
  const [imp, setImp] = useState<Record<Criterio, number>>({ ...PRESETS[0].importancia });
  const [abierta, setAbierta] = useState<IdArquitectura | null>('hibrido-vidrio');
  const [verFuentes, setVerFuentes] = useState(false);
  const mejor = useMemo(() => [...ARQUITECTURAS].sort((a, b) => puntuacion(b, imp) - puntuacion(a, imp))[0].id, [imp]);
  const ref = material(PANEL_REF.material);
  const datos = (v: (i: number) => number, r?: (i: number) => [number, number]) => MATERIALES.map((m, i) => ({ nombre: m.corto, v: v(i), r: r?.(i), fibra: m.fibra }));

  return (
    <section aria-label="Materiales y estructura" className="mt-3 flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <header className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Layers className="h-5 w-5 text-teal-700" />Materiales y estructura</h2>
        <p className="text-sm text-slate-600">Qué fibra va en cada parte del cuadriciclo (carbono, vidrio, aramida o lino), y si conviene un chasis todo de fibra o un híbrido de metal y fibra: peso, seguridad y coste, con gráficas.</p>
        <p className="text-xs text-slate-500">Las cifras son valores típicos de la literatura técnica para un laminado de tejido hecho a mano con bolsa de vacío, y horquillas estimadas por el proyecto, no presupuestos ni fichas de un producto concreto. Revisado el {FECHA}. Antes de hacer un molde, pedir la ficha técnica del tejido y la resina que se vayan a comprar.</p>
      </header>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
        <p className="font-semibold">{RECOMENDACION.titulo}</p>
        <ul className="ml-4 mt-1 list-disc space-y-1 text-[13px]">{RECOMENDACION.frases.map(f => <li key={f}>{f}</li>)}</ul>
      </div>

      <div className="flex flex-col gap-3">
        <Titulo n={1} nota="mueve las prioridades: cambia la estrella del gráfico">Todo de fibra o metal y fibra: el compromiso</Titulo>
        <Compromiso mejor={mejor} />
        <Prioridades imp={imp} setImp={setImp} />
        <TablaArquitecturas abierta={abierta} setAbierta={setAbierta} />
        {abierta && <DetalleArquitectura a={ARQUITECTURAS.find(a => a.id === abierta)!} />}
      </div>

      <div className="flex flex-col gap-3">
        <Titulo n={2} nota={`un panel igual de rígido a flexión que ${fmt(PANEL_REF.espesor)} mm de ${ref.corto.toLowerCase()}`}>Las cuatro fibras, frente al aluminio y el acero</Titulo>
        <Leyenda />
        <div className="grid gap-3 md:grid-cols-2">
          <Barras titulo="Peso del panel" unidad="kg/m²" decimales={1} datos={datos(i => PANELES[i].kg)}
            nota="Igual rigidez = mismo E·t³: el espesor crece con la raíz cúbica de lo que le falta de rigidez. No aplica un espesor mínimo: el carbono de menos de dos capas se rompe con una piedra." />
          <Barras titulo="Coste del material" unidad="€/m²" datos={datos(i => PANELES[i].eur, i => PANELES[i].eurRango)}
            nota={`Tejido comprado en poca cantidad más la resina (${RESINA.eurKg.join('–')} €/kg), que en un panel es casi la mitad del peso. Estimación, no presupuesto: en serie la fibra cuesta varias veces menos.`} />
          <Barras titulo="Energía que absorbe al aplastarse" unidad="kJ/kg" datos={datos(i => MATERIALES[i].seaMedio, i => MATERIALES[i].sea)}
            nota="Un tubo aplastado por la punta, como una caja de choque. Depende mucho de la forma y de cómo empieza la rotura: las horquillas son anchas a propósito." />
          <Barras titulo="CO₂ de fabricar el panel" unidad="kg CO₂/m²" decimales={1} datos={datos(i => PANELES[i].co2, i => PANELES[i].co2Rango)}
            nota={`De la fábrica de la fibra (o del metal) a la puerta, más la resina (≈ ${RESINA.co2} kg CO₂/kg). El aluminio es nuevo; reciclado emite una fracción.`} />
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {MATERIALES.filter(m => m.fibra).map(m => (
            <article key={m.id} className="rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
              <p className="text-sm font-semibold text-slate-900">{m.nombre}</p>
              <p className="mt-0.5 text-slate-500">{m.rotura}</p>
              <p className="mt-2 font-semibold text-emerald-800">Dónde usarla</p><ul className="ml-4 list-disc">{m.usar.map(t => <li key={t}>{t}</li>)}</ul>
              <p className="mt-1 font-semibold text-red-800">Dónde no</p><ul className="ml-4 list-disc">{m.evitar.map(t => <li key={t}>{t}</li>)}</ul>
              {m.ojo && <p className="mt-1 text-amber-900">Ojo: {m.ojo}</p>}
            </article>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Titulo n={3}>Qué material en cada parte del vehículo</Titulo>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-1 pr-2 font-medium">Parte</th><th className="px-2 font-medium">Su trabajo</th><th className="px-2 font-medium">Primera opción</th><th className="px-2 font-medium">Alternativa</th><th className="pl-2 font-medium">No</th></tr></thead>
            <tbody>{ZONAS.map(z => (
              <tr key={z.zona} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-2 font-semibold text-slate-800">{z.zona}</td><td className="px-2 text-slate-500">{z.trabajo}</td>
                <td className="px-2 text-slate-800">{z.primera}</td><td className="px-2 text-slate-600">{z.alternativa}</td><td className="pl-2 text-red-800">{z.no}</td>
              </tr>))}</tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">En el diseño de hoy, «Material de la carrocería» ofrece carbono-lino, vidrio y carbono, y «Material de los tubos» del bastidor aluminio 6061, acero cromoly y tubo de carbono (en el panel de la derecha). El lino solo y la aramida no están todavía en esos selectores.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Titulo n={4}><ShieldCheck className="h-4 w-4 text-teal-700" />Seguridad</Titulo>
          <ul className="ml-4 list-disc space-y-1 text-xs text-slate-700">{SEGURIDAD.map(t => <li key={t}>{t}</li>)}</ul>
        </div>
        <div className="flex flex-col gap-2">
          <Titulo n={5}>Cómo unir metal y fibra</Titulo>
          <ul className="space-y-1.5 text-xs text-slate-700">{UNIONES.map(u => <li key={u.titulo}><strong className="text-slate-900">{u.titulo}.</strong> {u.texto}</li>)}</ul>
        </div>
      </div>

      <div>
        <Button variant="ghost" aria-expanded={verFuentes} onClick={() => setVerFuentes(v => !v)} className="gap-1 px-1 py-0.5 text-xs normal-case tracking-normal text-slate-700">
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', verFuentes && 'rotate-180')} />Fuentes ({FUENTES.length}): dónde comprobarlo
        </Button>
        {verFuentes && (
          <>
            <p className="mt-1 text-[11px] text-slate-500">Encontradas con el buscador el {FECHA} y vistas solo por su título: dicen dónde mirar cada tema, no que se haya leído la página.</p>
            <ul className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
              {FUENTES.map(f => <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-baseline gap-1 text-teal-800 underline-offset-2 hover:underline">{f.titulo}<ExternalLink className="h-3 w-3 shrink-0" /></a> <span className="text-slate-500">· {f.sobre}</span></li>)}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
