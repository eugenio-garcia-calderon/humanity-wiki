/**
 * «Carrocería impresa en 3D y chasis de tubo» under the 3D of «Chasis y carrocería», Aeromóvil bicicleta only (2026-11-27).
 * Everything it says is in `impresion3d.ts`; the skin's area, length and today's body mass come from the open design.
 * Loaded with `lazy` from `pages/Aeromovil.tsx` (recharts).
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Printer } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '../../ui/core';
import { cn } from '../../../utils/cn';
import {
  CHASIS, DISENO, FECHA_IMPRESION, FUENTES_IMPRESION, IMPRESORAS, PAREDES, PLASTICOS, RIESGOS, RUTAS,
  calcular, holguraDilatacion, ruta, type IdImpresora, type IdPared, type IdPlastico,
} from './impresion3d';

const fmt = (v: number, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const eur = (v: number) => `${fmt(Math.round(v / 10) * 10)} €`;
const COLOR = 'var(--color-blue-600)', REJILLA = 'var(--color-slate-200)', EJE = 'var(--color-slate-500)';

function Elegir<T extends string>({ etiqueta, valor, opciones, alCambiar }: { etiqueta: string; valor: T; opciones: { id: T; n: string; aviso?: boolean }[]; alCambiar: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{etiqueta}</span>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={etiqueta}>
        {opciones.map(o => (
          <Button key={o.id} variant="outline" role="radio" aria-checked={valor === o.id} onClick={() => alCambiar(o.id)}
            className={cn('px-2 py-1 text-[11px] normal-case tracking-normal', valor === o.id ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800' : o.aviso ? 'text-slate-400' : 'text-slate-800')}>{o.n}</Button>
        ))}
      </div>
    </div>
  );
}

function Barras({ titulo, unidad, datos }: { titulo: string; unidad: string; datos: { nombre: string; v: number; texto: string }[] }) {
  return (
    <figure className="rounded-lg border border-slate-200 p-2">
      <figcaption className="px-1 text-sm font-semibold text-slate-800">{titulo} <span className="font-normal text-slate-500">({unidad})</span></figcaption>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 64, bottom: 0, left: 4 }} barCategoryGap={6}>
            <CartesianGrid stroke={REJILLA} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: EJE }} stroke={REJILLA} />
            <YAxis type="category" dataKey="nombre" width={104} tick={{ fontSize: 11, fill: 'var(--color-slate-700)' }} stroke={REJILLA} />
            <Tooltip cursor={{ fill: 'var(--color-slate-100)' }} formatter={(_v, _n, it) => [(it.payload as { texto: string }).texto, titulo]} />
            <Bar dataKey="v" fill={COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList dataKey="texto" position="right" style={{ fontSize: 10, fill: 'var(--color-slate-700)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export default function PanelImpresion3D({ area, largo, kgActual }: {
  /** the design's opaque skin, m² (body without the glass); null when the open vehicle does not give it */
  area: number | null;
  /** the body's length, m */
  largo: number;
  /** today's body skin, kg (the design's own laminate, without the wheel pods: the same surface as `area`), for comparison */
  kgActual: number | null;
}) {
  const A = area ?? 10;
  const [plastico, setPlastico] = useState<IdPlastico>('asa');
  const [pared, setPared] = useState<IdPared>('sandwich');
  const [impresora, setImpresora] = useState<IdImpresora>('mediana');
  const [n, setN] = useState(4);
  const [verFuentes, setVerFuentes] = useState(false);
  const c = useMemo(() => calcular(A, plastico, pared, impresora, n), [A, plastico, pared, impresora, n]);
  const base = useMemo(() => calcular(A, 'asa', 'sandwich', 'mediana', 4), [A]);
  const rutas = RUTAS.map(r => ({ r, x: ruta(r, A) }));
  const holgura = holguraDilatacion(largo);
  const pl = PLASTICOS.find(p => p.id === plastico)!, w = PAREDES.find(p => p.id === pared)!, im = IMPRESORAS.find(p => p.id === impresora)!;

  return (
    <section aria-label="Carrocería impresa en 3D" className="mt-3 flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
      <header className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Printer className="h-5 w-5 text-teal-700" />Carrocería impresa en 3D sobre chasis de tubo</h2>
        <p className="text-sm text-slate-600">Para el Aeromóvil bicicleta: la piel impresa en paneles de plástico y un bastidor de tubo metálico que lleva todo el peso. Calculado con la piel de este diseño: {fmt(A, 1)} m² opacos{area == null ? ' (estimados: este vehículo no da su área)' : ''} y {fmt(largo, 2)} m de largo.</p>
        <p className="text-xs text-slate-500">Cifras típicas y estimaciones del proyecto (precios de compra en poca cantidad, velocidades de impresión medias), no presupuestos. Revisado el {FECHA_IMPRESION}; las fuentes se vieron en el buscador, sin abrirlas.</p>
      </header>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
        <p className="font-semibold">Sí, para el prototipo: es el camino más barato y rápido a una carrocería con tu forma exacta</p>
        <ul className="ml-4 mt-1 list-disc space-y-1 text-[13px]">
          <li>En ASA y en sándwich (dos pieles finas con relleno ligero): ≈ {fmt(base.kgPiel)} kg de piel{kgActual != null ? `, frente a los ${fmt(kgActual)} kg del laminado que lleva hoy el diseño (${base.kgPiel - kgActual > kgActual * 0.1 ? `≈ ${fmt(base.kgPiel - kgActual)} kg más` : 'prácticamente lo mismo'})` : ''}, sin contar los carenados de las ruedas. No hacen falta ni macho ni molde.</li>
          <li>Con 4 impresoras medianas: ≈ {fmt(base.horasImpresora)} horas de máquina, {fmt(base.dias)} días imprimiendo sin parar, {fmt(base.piezas)} paneles. Material ≈ {eur(base.eurMaterial)}; con las impresoras compradas, ≈ {eur(base.eurTotal)}. Encargarla a un taller se estima en 22.000–47.000 €.</li>
          <li>El chasis de tubo (cromoly soldado o, para el prototipo 0, atornillado) lleva todas las cargas; la piel va flotando sobre tacos de goma, porque se dilata {fmt(holgura)} mm más que el acero entre un día frío y uno de sol.</li>
          <li>Para la serie: imprimir la forma como macho, sacar un molde y laminar en fibra. La piel impresa es para aprender, probar y enseñar.</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-slate-900">Calculadora</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Elegir<IdPlastico> etiqueta="Plástico" valor={plastico} alCambiar={setPlastico} opciones={PLASTICOS.map(p => ({ id: p.id, n: p.nombre, aviso: !p.apto }))} />
          <Elegir<IdPared> etiqueta="Pared" valor={pared} alCambiar={setPared} opciones={PAREDES.map(p => ({ id: p.id, n: p.nombre }))} />
          <Elegir<IdImpresora> etiqueta="Impresora" valor={impresora} alCambiar={setImpresora} opciones={IMPRESORAS.map(p => ({ id: p.id, n: p.nombre }))} />
          {impresora !== 'pellets' && <Elegir<string> etiqueta="Cuántas" valor={String(n)} alCambiar={v => setN(Number(v))} opciones={[1, 2, 4, 6, 8].map(k => ({ id: String(k), n: String(k) }))} />}
        </div>
        <p className="text-xs text-slate-600"><strong>{pl.nombre}:</strong> {pl.veredicto} Se ablanda a ≈ {pl.tg} °C. · <strong>{w.nombre}:</strong> {w.que} · <strong>{im.nombre}:</strong> {im.nota}</p>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ['Piel', `${fmt(c.kgPiel)} kg`, kgActual != null ? `hoy ${fmt(kgActual)} kg en laminado` : ''],
            ['Paneles', fmt(c.piezas), `de ${im.cama} mm`],
            ['Horas de máquina', fmt(c.horasImpresora), impresora === 'pellets' ? 'en el servicio' : `${fmt(c.dias, 1)} días con ${n}`],
            ['Horas de persona', fmt(c.horasPersona), 'unir, lijar, pintar'],
            ['Plástico', eur(c.eurMaterial), impresora === 'pellets' ? 'servicio, por kg' : `${fmt(c.kgPlastico)} kg`],
            ['Impresoras', impresora === 'pellets' ? '—' : eur(c.eurImpresoras), impresora === 'pellets' ? '' : 'si hay que comprarlas'],
            ['Acabado', eur(c.eurAcabado), 'masilla, pintura, adhesivo'],
            ['Total', eur(c.eurTotal), `luz ${eur(c.eurLuz)}`],
          ] as [string, string, string][]).map(([k, v, nota]) => (
            <div key={k} className="rounded-lg border border-slate-200 px-2.5 py-1.5">
              <dt className="text-[11px] text-slate-500">{k}</dt>
              <dd className="font-mono text-base font-semibold tabular-nums text-slate-900">{v}</dd>
              {nota && <dd className="text-[11px] text-slate-500">{nota}</dd>}
            </div>
          ))}
        </dl>
        {!pl.apto && <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900">El {pl.nombre} no sirve para la piel que va a la calle: {pl.sol.toLowerCase()}.</p>}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-base font-semibold text-slate-900">Cuatro maneras de tener la piel, para este diseño</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Barras titulo="Peso de la piel" unidad="kg" datos={rutas.map(({ r, x }) => ({ nombre: r.corto, v: x.kg, texto: `${fmt(x.kg)} kg` }))} />
          <Barras titulo="Primera unidad" unidad="€" datos={rutas.map(({ r, x }) => ({ nombre: r.corto, v: x.eur, texto: eur(x.eur) }))} />
          <Barras titulo="Trabajo propio" unidad="horas" datos={rutas.map(({ r, x }) => ({ nombre: r.corto, v: x.horas, texto: `${fmt(x.horas)} h` }))} />
        </div>
        <p className="text-[11px] text-slate-500">Las tres impresas incluyen comprar 4 impresoras medianas. «Macho impreso» = la piel final en vidrio de 2 mm, sacada de un molde hecho sobre la forma impresa. «Taller» = punto medio de la estimación de «Compras».</p>
        <div className="grid gap-2 md:grid-cols-2">
          {RUTAS.map(r => (
            <article key={r.id} className="rounded-lg border border-slate-200 p-3 text-xs text-slate-700">
              <p className="text-sm font-semibold text-slate-900">{r.nombre}</p>
              <p className="mt-0.5 text-slate-600">{r.que}</p>
              <p className="mt-1 text-slate-500">{r.repetible}</p>
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <ul className="ml-4 list-disc text-emerald-900">{r.pros.map(t => <li key={t}>{t}</li>)}</ul>
                <ul className="ml-4 list-disc text-red-900">{r.contras.map(t => <li key={t}>{t}</li>)}</ul>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-slate-900">Qué plástico</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead><tr className="border-b border-slate-200 text-left text-slate-500"><th className="py-1 pr-2 font-medium">Plástico</th><th className="px-2 font-medium">Sol y calor</th><th className="px-2 font-medium">Golpes</th><th className="px-2 font-medium">Imprimir</th><th className="px-2 font-medium">€/kg</th><th className="pl-2 font-medium">Para qué</th></tr></thead>
            <tbody>{PLASTICOS.map(p => (
              <tr key={p.id} className="border-b border-slate-100 align-top">
                <td className="py-1.5 pr-2 font-semibold text-slate-900">{p.nombre}</td><td className="px-2 text-slate-700">{p.sol}</td><td className="px-2 text-slate-700">{p.golpes}</td>
                <td className="px-2 text-slate-700">{p.imprimir}</td><td className="px-2 font-mono tabular-nums text-slate-700">≈ {p.eurKg}</td><td className={cn('pl-2', p.apto ? 'text-slate-800' : 'text-red-800')}>{p.veredicto}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-slate-900">El chasis de tubo</h3>
          <ul className="space-y-1.5 text-xs text-slate-700">{CHASIS.map(o => <li key={o.nombre}><strong className="text-slate-900">{o.nombre}.</strong> {o.que} <span className="text-emerald-900">{o.pros}</span> <span className="text-red-900">{o.contras}</span></li>)}</ul>
          <p className="text-[11px] text-slate-500">El bastidor del diseño (tubos, material y uniones) está en el panel de la derecha, en «Chasis · Bastidor».</p>
        </div>
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold text-slate-900">Diseñar la piel para imprimirla</h3>
          <ul className="ml-4 list-disc space-y-1 text-xs text-slate-700">{DISENO.map(t => <li key={t}>{t}</li>)}</ul>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="font-semibold text-slate-900">Riesgos</p>
        <ul className="ml-4 mt-1 list-disc space-y-1">{RIESGOS.map(t => <li key={t}>{t}</li>)}</ul>
      </div>

      <div>
        <Button variant="ghost" aria-expanded={verFuentes} onClick={() => setVerFuentes(v => !v)} className="gap-1 px-1 py-0.5 text-xs normal-case tracking-normal text-slate-700">
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', verFuentes && 'rotate-180')} />Ejemplos y fuentes ({FUENTES_IMPRESION.length})
        </Button>
        {verFuentes && (
          <ul className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
            {FUENTES_IMPRESION.map(f => <li key={f.url}><a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-baseline gap-1 text-teal-800 underline-offset-2 hover:underline">{f.titulo}<ExternalLink className="h-3 w-3 shrink-0" /></a> <span className="text-slate-500">· {f.sobre}</span></li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
