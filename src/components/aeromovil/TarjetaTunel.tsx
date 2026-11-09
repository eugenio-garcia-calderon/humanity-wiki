import { useState } from 'react';
import { Wind, X } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';
import type { CuerpoTunel } from './tunel/cuerpos';
import { puntosDe, type TipoPunto } from './tunel/puntos';
import type { SeleccionPunto } from './tunel/PanelPunto';
import type { OpcionesTunel } from './tunel/cliente';
import type { ResultadoTunel } from './tunel/calculo';
import { RESOLUCION } from './tunel/malla';
import { CONSTANTES } from './tunel/arrastre';
import { CALIBRACION } from './tunel/calibracion';
import { ESCALA_CP } from './tunel/colores';

/**
 * Un coche en la comparación del túnel. `masa` es la total en marcha (vacío +
 * ocupantes) y `crr` el coeficiente de rodadura: sin ellos no hay total y la
 * fila lo dice. `vmax` sirve para avisar de una velocidad a la que no llega.
 */
export interface FilaTunel {
  id: string; nombre: string; cd: number; area: number; fuente: string; masa?: number; crr?: number; vmax?: number; estimado?: boolean;
  /** Where our design's Cd comes from, when it is not the editor's formula (the Cuadriciclo Bala: the tunnel itself). */
  origenCd?: string;
}

const RHO = 1.2, G = 9.81; // kg/m³ y m/s², los mismos que usa el cálculo del Aeromóvil
const fmt = (v: number, d = 1) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${fmt(Math.abs(v) * 100, 0)} %`;

/**
 * La tarjeta del túnel de viento (2026-11-07, Eugenio: «que el comparador sea
 * de energía a los 100 km y potencia necesaria para mantener la velocidad»).
 * Todo es en las ruedas: aire (½·ρ·v²·CdA) más rodadura (Crr·m·g), sin las
 * pérdidas del motor ni los equipos, que no se conocen igual para todos.
 *
 * 2026-11-09 (Eugenio: «un mejor túnel de viento, con mayor precisión, datos y
 * visualizaciones de los puntos críticos con una mayor granularidad»): debajo, lo
 * que calcula el túnel (Cd desglosado, sustentación, gráfica de la sección y la
 * calibración contra los Cd publicados), y los mandos de resolución y de qué se ve.
 * El consumo sigue con el Cd publicado (o el de la fórmula del editor para este
 * diseño): el del túnel se pone al lado, no lo sustituye.
 */
/**
 * Lo que cuesta mover un coche a una velocidad, en las ruedas: fuerza del aire
 * y de la rodadura (N), potencia para mantenerla (kW) y energía cada 100 km
 * (kWh). Una sola fórmula para la tarjeta del túnel y para los carteles.
 */
export function gastoEnRuedas(f: FilaTunel, kmh: number) {
  const v = kmh / 3.6;
  const cda = f.cd * f.area, aire = 0.5 * RHO * v * v * cda;                  // N
  const rueda = f.masa != null && f.crr != null ? f.crr * f.masa * G : null;  // N
  const total = rueda != null ? aire + rueda : null;
  // P = F·v (kW); E = F·100 km (kWh): 1 N durante 100 km son 100 000 J = 0,0278 kWh
  return { ...f, cda, aire, rueda, total, kWaire: aire * v / 1000, kWtotal: total != null ? total * v / 1000 : null, kWhAire: aire / 36, kWhTotal: total != null ? total / 36 : null, noLlega: f.vmax != null && kmh > f.vmax };
}

export const VELOCIDADES = [50, 80, 120];

const NOMBRE_RES = { baja: 'baja', media: 'media', alta: 'alta' } as const;
const NOMBRE_LIN = { pocas: 'pocas', normal: 'normales', muchas: 'muchas' } as const;

function Pildora({ activo, children, onClick, titulo }: { activo: boolean; children: React.ReactNode; onClick: () => void; titulo?: string }) {
  return (
    <Button variant="outline" aria-pressed={activo} onClick={onClick} title={titulo}
      className={cn('px-1.5 py-0.5 text-[11px] normal-case tracking-normal', activo && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>{children}</Button>
  );
}

/** Cp a lo largo de la línea de arriba, del costado y de abajo, con los puntos críticos. */
function GraficaSeccion({ R, kmh }: { R: ResultadoTunel; kmh: number }) {
  const q = R.porVelocidad.find(v => v.kmh === kmh) ?? R.porVelocidad[1];
  const W = 860, H = 250, m = { l: 40, r: 12, t: 12, b: 34 };
  const L = R.geometria.largo, x0 = R.geometria.xMorro;
  const todos = [...R.perfiles.techo.cp, ...R.perfiles.lado.cp, ...R.perfiles.bajos.cp];
  const cpMin = Math.max(-2.5, Math.min(-1, Math.floor(Math.min(...todos) * 2) / 2)), cpMax = 1;
  const X = (x: number) => m.l + (x0 - x) / L * (W - m.l - m.r);
  const Y = (cp: number) => m.t + (Math.max(cpMin, Math.min(cpMax, cp)) - cpMin) / (cpMax - cpMin) * (H - m.t - m.b);
  // Up to the separation, the ideal flow is a fair guide; behind it the real air has left the body and the
  // ideal flow's pressure recovery onto the tail does not happen, so that stretch is drawn faint.
  const camino = (p: { x: number[]; cp: number[] }, sep: number, antes: boolean) => {
    const pts = p.x.map((x, i) => ({ x, cp: p.cp[i] })).filter(q => !Number.isFinite(sep) || (antes ? q.x >= sep - 0.03 : q.x <= sep + 0.03));
    return pts.map((q, i) => `${i ? 'L' : 'M'}${X(q.x).toFixed(1)},${Y(q.cp).toFixed(1)}`).join(' ');
  };
  const series = [
    { k: 'techo', n: 'arriba (eje)', p: R.perfiles.techo, cls: 'stroke-sky-700', dash: '', sep: q.sepTecho, adv: q.advTecho },
    { k: 'lado', n: 'costado', p: R.perfiles.lado, cls: 'stroke-emerald-700', dash: '6 4', sep: q.sepLado, adv: q.advLado },
    { k: 'bajos', n: 'abajo (eje)', p: R.perfiles.bajos, cls: 'stroke-slate-500', dash: '2 3', sep: q.sepBajos, adv: q.advBajos },
  ];
  const ticksCp: number[] = []; for (let c = Math.ceil(cpMin * 2) / 2; c <= cpMax + 1e-9; c += 0.5) ticksCp.push(Math.round(c * 10) / 10);
  const ticksX: number[] = []; for (let d = 0; d <= L + 1e-9; d += L > 3 ? 1 : 0.5) ticksX.push(d);
  const rem = R.criticos.find(c => c.tipo === 'remanso');
  // strongest suction before the separation and ahead of the cap that closes the tail
  const minimo = (p: { x: number[]; cp: number[] }, sep: number) => { let i = 0; p.cp.forEach((c, k) => { if (c < p.cp[i] && !(p.x[k] < sep) && p.x[k] > R.geometria.xUltima + 0.01) i = k; }); return { x: p.x[i], cp: p.cp[i] }; };
  return (
    <div>
      {/* On a phone the chart keeps a readable size and scrolls sideways. */}
      <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[600px]" role="img" aria-label="Cp a lo largo del coche: arriba, en el costado y abajo">
        {ticksCp.map(c => (
          <g key={c}>
            <line x1={m.l} x2={W - m.r} y1={Y(c)} y2={Y(c)} className={c === 0 ? 'stroke-slate-400' : 'stroke-slate-200'} strokeWidth={1} />
            <text x={m.l - 6} y={Y(c) + 3.5} textAnchor="end" className="fill-slate-500 text-[11px]">{fmt(c, 1)}</text>
          </g>
        ))}
        {ticksX.map(d => <text key={d} x={X(x0 - d)} y={H - m.b + 14} textAnchor="middle" className="fill-slate-500 text-[11px]">{fmt(d, d % 1 ? 1 : 0)}</text>)}
        <text x={(W + m.l) / 2} y={H - 4} textAnchor="middle" className="fill-slate-500 text-[11px]">metros desde el morro →  (el aire va en este sentido)</text>
        <text x={m.l + 6} y={m.t + 11} className="fill-slate-400 text-[11px]">↑ succión (Cp negativo)</text>
        <text x={m.l + 6} y={H - m.b - 5} className="fill-slate-400 text-[11px]">↓ presión (Cp positivo)</text>
        {series.map(s => (
          <g key={s.k}>
            <path d={camino(s.p, s.sep, true)} fill="none" className={s.cls} strokeWidth={2} strokeDasharray={s.dash || undefined} />
            {Number.isFinite(s.sep) && <path d={camino(s.p, s.sep, false)} fill="none" className={s.cls} strokeWidth={1.5} strokeDasharray={s.dash || undefined} opacity={0.25} />}
            {Number.isFinite(s.adv) && <line x1={X(s.adv)} x2={X(s.adv)} y1={m.t} y2={H - m.b} className="stroke-amber-500" strokeDasharray="3 3" strokeWidth={1} />}
            {Number.isFinite(s.sep) && <line x1={X(s.sep)} x2={X(s.sep)} y1={m.t} y2={H - m.b} className="stroke-rose-700" strokeWidth={1.4} />}
            {(() => { const mn = minimo(s.p, s.sep); return <circle cx={X(mn.x)} cy={Y(mn.cp)} r={3.5} className="fill-blue-700" />; })()}
          </g>
        ))}
        {rem && <circle cx={X(rem.p[0])} cy={Y(rem.cp)} r={4} className="fill-red-600" />}
      </svg>
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-600">
        <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 bg-sky-700" />arriba, por el eje</span>
        <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 border-t-2 border-dashed border-emerald-700" />costado</span>
        <span className="flex items-center gap-1"><i className="inline-block h-0.5 w-4 border-t-2 border-dotted border-slate-500" />abajo, por el eje</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-red-600" />remanso</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full bg-blue-700" />succión máxima</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-0 border-l border-dashed border-amber-500" />el aire empieza a frenarse</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-0 border-l-2 border-rose-700" />separación prevista</span>
        <span>Tras la separación la línea se aclara: el aire real ya se ha despegado y esa parte del cálculo ideal no ocurre.</span>
      </div>
    </div>
  );
}

const PUNTO: Record<TipoPunto, string> = { remanso: 'bg-red-600', succion: 'bg-blue-700', adverso: 'bg-amber-600', separacion: 'bg-pink-700', estela: 'bg-violet-600', burbuja: 'bg-teal-700' };

export function TarjetaTunel({ filas, base, kmh, alCambiarKmh, alCerrar, className, cuerpos = [], resultados = {}, opciones, alCambiarOpciones, punto, alElegirPunto }: {
  filas: FilaTunel[]; base: string; kmh: number; alCambiarKmh: (k: number) => void; alCerrar: () => void; className?: string;
  cuerpos?: CuerpoTunel[]; resultados?: Record<string, ResultadoTunel | undefined>; opciones?: OpcionesTunel; alCambiarOpciones?: (o: OpcionesTunel) => void;
  /** The point whose explanation is open, and what a row of «Puntos críticos» does (open it in the 3D view). */
  punto?: SeleccionPunto | null; alElegirPunto?: (s: SeleccionPunto) => void;
}) {
  const v = kmh / 3.6, setKmh = alCambiarKmh;
  const calc = filas.map(f => gastoEnRuedas(f, kmh));
  const ref = calc.find(c => c.id === base);
  const [verGrafica, setVerGrafica] = useState<string>('aeromovil');
  const cdTunel = (id: string) => { const R = resultados[id]; return R ? (R.porVelocidad.find(q => q.kmh === kmh) ?? R.porVelocidad[1]).cd : undefined; };
  const listos = cuerpos.filter(c => resultados[c.id]).length;
  const banda = CALIBRACION.banda;
  const cambiar = (o: Partial<OpcionesTunel>) => opciones && alCambiarOpciones?.({ ...opciones, ...o });
  const graficaDe = resultados[verGrafica] ? verGrafica : cuerpos.find(c => resultados[c.id])?.id;
  const maxCd = Math.max(0.2, ...cuerpos.map(c => cdTunel(c.id)?.total ?? 0));
  const ms = cuerpos.map(c => resultados[c.id]?.ms.total ?? 0);
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-3 text-slate-800', className)} role="region" aria-label="Túnel de viento">
      <div className="flex flex-wrap items-center gap-2">
        <Wind className="h-4 w-4 text-sky-700" />
        <span className="text-sm font-semibold">Túnel de viento</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-500">
          a
          {VELOCIDADES.map(k => (
            <Button key={k} variant="outline" aria-pressed={kmh === k} onClick={() => setKmh(k)}
              className={cn('px-1.5 py-0.5 text-[11px] normal-case tracking-normal', kmh === k && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>{k} km/h</Button>
          ))}
        </span>
        <Button variant="ghost" aria-label="Cerrar el túnel de viento" onClick={alCerrar} className="px-1 py-1"><X className="h-4 w-4" /></Button>
      </div>

      {/* ---------------- consumo (con el Cd publicado o el de la fórmula del editor, como antes) */}
      <div className="mt-2 grid gap-x-6 gap-y-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 overflow-x-auto">
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr className="text-left align-bottom text-slate-500">
              <th className="py-0.5 font-medium">Vehículo</th>
              <th className="py-0.5 text-right font-medium">Cd usado<span className="block font-normal text-slate-400">túnel al lado</span></th>
              <th className="py-0.5 text-right font-medium">Potencia para ir a {kmh} km/h</th>
              <th className="py-0.5 text-right font-medium">Energía cada 100 km</th>
              {ref && <th className="py-0.5 text-right font-medium">Frente al {ref.nombre}</th>}
            </tr>
          </thead>
          <tbody>
            {calc.map(f => {
              const t = cdTunel(f.id);
              return (
                <tr key={f.id} className={cn('border-t border-slate-100 align-top', f.noLlega && 'text-slate-400')}>
                  <td className="py-1 pr-1 font-medium text-slate-900">{f.nombre}{f.noLlega && <span className="font-normal text-amber-700"> *</span>}</td>
                  <td className="py-1 text-right">
                    <b className="text-[12px]">{fmt(f.cd, 3)}</b>
                    <div className="text-[10px] text-slate-500">{f.id === base ? (f.origenCd ?? 'fórmula del editor') : 'publicado'}{t && !f.origenCd ? ` · túnel ${fmt(t.total, 3)}` : !t && cuerpos.some(c => c.id === f.id) ? ' · túnel…' : ''}</div>
                  </td>
                  <td className="py-1 text-right">
                    <b className="text-[12px]">{f.kWtotal != null ? `${fmt(f.kWtotal)} kW` : '—'}</b>
                    <div className="text-[10px] text-slate-500">aire {fmt(f.kWaire)}{f.rueda != null && ` · ruedas ${fmt(f.rueda * v / 1000)}`}</div>
                  </td>
                  <td className="py-1 text-right">
                    <b className="text-[12px]">{f.kWhTotal != null ? `${fmt(f.kWhTotal)} kWh` : '—'}</b>
                    <div className="text-[10px] text-slate-500">aire {fmt(f.kWhAire)}{f.rueda != null && ` · ruedas ${fmt(f.rueda / 36)}`}</div>
                  </td>
                  {ref && (
                    <td className="py-1 text-right">
                      {f.id === base ? <span className="text-slate-400">—</span> : (
                        <>
                          <b className="text-[12px]">{f.kWhTotal != null && ref.kWhTotal != null ? `×${fmt(f.kWhTotal / ref.kWhTotal)}` : '—'}</b>
                          <div className="text-[10px] text-slate-500">solo aire ×{fmt(f.cda / ref.cda)}</div>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {calc.some(c => c.noLlega) && (
          <p className="mt-1 text-[10.5px] text-amber-800">* {calc.filter(c => c.noLlega).map(c => `el ${c.nombre} no pasa de ${fmt(c.vmax!, 0)} km/h`).join('; ')}: su fila dice lo que costaría, no algo que pueda hacer.</p>
        )}
        {calc.length < 2 && <p className="mt-1.5 text-[11px] text-slate-500">Saca otro vehículo del garaje para compararlo.</p>}
        </div>
        <div>
        <p className="text-[11px] leading-snug text-slate-600">
          {filas.find(f => f.id === base)?.origenCd
            ? <><b>El consumo usa el Cd publicado</b> de cada coche y, para este diseño, el que calcula el túnel (no hay otro: la fórmula del editor no vale para su forma), sin masa: solo el aire.</>
            : <><b>El consumo usa el Cd publicado</b> de cada coche y, para este diseño, el de la fórmula del editor; el que calcula el túnel va al lado y abajo, desglosado. Decidir si el editor adopta el del túnel es cosa tuya.</>}
        </p>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
          <b>Por qué crece con la velocidad:</b> «solo aire» da siempre el mismo múltiplo, porque el aire frena a todos en la misma proporción. Las ruedas cuestan lo mismo por kilómetro a cualquier velocidad; cuanto más rápido, más pesa el aire en el total y más se separan.
        </p>
        </div>
      </div>

      {/* ---------------- lo que calcula el túnel */}
      <div className="mt-3 border-t border-slate-100 pt-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-[12px] font-semibold text-slate-900">Lo que calcula el túnel a {kmh} km/h</span>
          <span className="text-[10.5px] text-slate-500">
            {listos < cuerpos.length ? `calculando el flujo: ${listos} de ${cuerpos.length} listos…` : cuerpos.length ? `${cuerpos.length} calculados · ${fmt(Math.max(...ms) / 1000, 1)} s el más lento · ${RESOLUCION[opciones?.resolucion ?? 'media'].nI * RESOLUCION[opciones?.resolucion ?? 'media'].nJ * 2} paneles por coche` : ''}
          </span>
        </div>
        <div className="mt-1 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[11px] tabular-nums">
          <thead>
            <tr className="text-left align-bottom text-slate-500">
              <th className="py-0.5 font-medium">Vehículo</th>
              <th className="py-0.5 font-medium">Cd del túnel, desglosado</th>
              <th className="py-0.5 text-right font-medium">Frente al Cd de referencia</th>
              <th className="py-0.5 text-right font-medium" title="Sustentación: positiva levanta el coche, negativa lo pega al suelo">Cl del. / tras.</th>
            </tr>
          </thead>
          <tbody>
            {cuerpos.map(c => {
              const R = resultados[c.id], d = cdTunel(c.id), nuestro = c.id === 'aeromovil';
              // our design is compared with the editor's formula; when its only Cd is the tunel's own (the Bala), there is nothing to compare with
              const filaNuestra = filas.find(f => f.id === base), refCd = nuestro ? (filaNuestra?.origenCd ? undefined : filaNuestra?.cd) : c.cdPublicado;
              return (
                <tr key={c.id} className="border-t border-slate-100 align-top">
                  <td className="py-1 pr-2 font-medium text-slate-900">{c.nombre}</td>
                  <td className="py-1 pr-2">
                    {!R || !d ? <span className="text-slate-400">calculando…</span> : (
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <b className="text-[12px]">{fmt(d.total, 3)}</b>
                          {nuestro && <span className="text-slate-500">± {fmt(d.total * banda, 3)} ({fmt(d.total * (1 - banda), 3)}–{fmt(d.total * (1 + banda), 3)})</span>}
                          {!nuestro && c.cdPublicado == null && <span className="text-amber-800">estimado por el túnel, sin dato publicado</span>}
                        </div>
                        <div className="mt-0.5 flex h-2 w-full max-w-[260px] overflow-hidden rounded-sm bg-slate-100" aria-hidden>
                          {([['friccion', 'bg-sky-500'], ['estela', 'bg-violet-500'], ['ruedas', 'bg-amber-500'], ['detalles', 'bg-slate-400']] as const).map(([k, cls]) => {
                            const val = k === 'estela' ? d.forma + d.estela : d[k];
                            return <i key={k} className={cn('block h-full', cls)} style={{ width: `${(val / maxCd) * 100}%` }} />;
                          })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          rozamiento {fmt(d.friccion, 3)} · forma y estela {fmt(d.forma + d.estela, 3)} · ruedas {fmt(d.ruedas, 3)} · detalles {fmt(d.detalles, 3)}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="py-1 text-right">
                    {d && refCd != null ? (
                      <>
                        <b className="text-[12px]">{pct((d.total - refCd) / refCd)}</b>
                        <div className="text-[10px] text-slate-500">{nuestro ? 'fórmula del editor' : 'publicado'} {fmt(refCd, 3)}</div>
                      </>
                    ) : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="py-1 text-right">
                    {R ? <><b className="text-[12px]">{fmt(R.clDel, 2)} / {fmt(R.clTras, 2)}</b><div className="text-[10px] text-slate-500">total {fmt(R.cl, 2)}</div></> : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-slate-600">
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-sky-500" />rozamiento de la piel</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-violet-500" />forma y estela</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-amber-500" />ruedas</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-slate-400" />detalles que no ve</span>
        </div>
      </div>

      {/* ---------------- critical points: the same as the 3D labels, reachable when labels overlap and from the keyboard */}
      {alElegirPunto && cuerpos.some(c => resultados[c.id]) && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <p className="text-[12px] font-semibold text-slate-900">Puntos críticos <span className="font-normal text-slate-500">· pincha uno (o su cartel en el 3D) para ver qué es y cómo mejorarlo</span></p>
          <div className="mt-1 space-y-1">
            {cuerpos.filter(c => resultados[c.id]).map(c => (
              <div key={c.id} className="flex flex-wrap items-center gap-1">
                <span className="mr-1 w-full text-[11px] font-medium text-slate-700 sm:w-36 sm:shrink-0">{c.nombre}</span>
                {puntosDe(resultados[c.id]!, kmh).map(pt => {
                  const activo = punto?.cuerpo === c.id && punto?.punto === pt.id;
                  return (
                    <Button key={pt.id} variant="outline" aria-pressed={activo} onClick={() => alElegirPunto({ cuerpo: c.id, punto: pt.id })}
                      className={cn('gap-1 px-1.5 py-0.5 text-[11px] font-normal normal-case tracking-normal', activo && 'border-sky-700 bg-sky-50')}>
                      <i className={cn('inline-block h-2 w-2 shrink-0 rounded-full', PUNTO[pt.tipo])} />{pt.etiqueta}
                    </Button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- mandos y leyenda */}
      {opciones && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
          <span className="flex items-center gap-1" role="group" aria-label="Resolución de la malla">
            Malla:
            {(Object.keys(RESOLUCION) as (keyof typeof RESOLUCION)[]).map(k => (
              <Pildora key={k} activo={opciones.resolucion === k} onClick={() => cambiar({ resolucion: k })} titulo={`${RESOLUCION[k].nI * RESOLUCION[k].nJ * 2} paneles por coche`}>{NOMBRE_RES[k]}</Pildora>
            ))}
          </span>
          <span className="flex items-center gap-1" role="group" aria-label="Número de líneas de corriente">
            Líneas:
            {(Object.keys(NOMBRE_LIN) as (keyof typeof NOMBRE_LIN)[]).map(k => (
              <Pildora key={k} activo={opciones.lineas === k} onClick={() => cambiar({ lineas: k })}>{NOMBRE_LIN[k]}</Pildora>
            ))}
          </span>
          <span className="flex flex-wrap items-center gap-1" role="group" aria-label="Qué se ve">
            Ver:
            <Pildora activo={opciones.piel} onClick={() => cambiar({ piel: !opciones.piel })}>presión en la piel</Pildora>
            <Pildora activo={opciones.verLineas} onClick={() => cambiar({ verLineas: !opciones.verLineas })}>líneas</Pildora>
            <Pildora activo={opciones.criticos} onClick={() => cambiar({ criticos: !opciones.criticos })}>puntos críticos</Pildora>
            <Pildora activo={opciones.estela} onClick={() => cambiar({ estela: !opciones.estela })}>estela</Pildora>
            <Pildora activo={opciones.grafica} onClick={() => cambiar({ grafica: !opciones.grafica })}>gráfica</Pildora>
          </span>
          <span className="flex items-center gap-1.5" aria-label="Leyenda de presión">
            <span>Cp</span>
            <span className="flex flex-col">
              <span className="flex h-2.5 w-44 overflow-hidden rounded-sm">{ESCALA_CP.map(e => <i key={e.cp} className={cn('block h-full flex-1', e.clase)} />)}</span>
              <span className="flex w-44 justify-between text-[9.5px] text-slate-500"><span>−1 succión</span><span>0</span><span>+1 choca</span></span>
            </span>
          </span>
        </div>
      )}

      {/* ---------------- gráfica de la sección */}
      {opciones?.grafica && graficaDe && resultados[graficaDe] && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-600">
            <span className="mr-1 font-semibold text-slate-900">Presión a lo largo del coche</span>
            {cuerpos.filter(c => resultados[c.id]).map(c => (
              <Pildora key={c.id} activo={graficaDe === c.id} onClick={() => setVerGrafica(c.id)}>{c.nombre}</Pildora>
            ))}
          </div>
          <GraficaSeccion R={resultados[graficaDe]!} kmh={kmh} />
        </div>
      )}

      {/* ---------------- calibración y método */}
      <div className="mt-2 grid gap-x-6 gap-y-2 border-t border-slate-100 pt-2 lg:grid-cols-2">
        <div>
          <p className="text-[12px] font-semibold text-slate-900">Cuánto se equivoca, con los coches que publican su Cd</p>
          <table className="mt-1 w-full text-[11px] tabular-nums">
            <thead><tr className="text-left text-slate-500"><th className="py-0.5 font-medium">Coche</th><th className="py-0.5 text-right font-medium">Publicado</th><th className="py-0.5 text-right font-medium">Túnel</th><th className="py-0.5 text-right font-medium">Error</th><th className="py-0.5 text-right font-medium" title="El cálculo de ese coche cuando se le deja fuera del ajuste">Sin él</th></tr></thead>
            <tbody>
              {CALIBRACION.coches.map(k => (
                <tr key={k.id} className={cn('border-t border-slate-100', !k.enAjuste && 'text-slate-500')}>
                  <td className="py-0.5 pr-1">{k.nombre}{!k.enAjuste && ' *'}</td>
                  <td className="py-0.5 text-right">{fmt(k.publicado, 3)}</td>
                  <td className="py-0.5 text-right">{fmt(k.estimado, 3)}</td>
                  <td className="py-0.5 text-right font-medium">{pct((k.estimado - k.publicado) / k.publicado)}</td>
                  <td className="py-0.5 text-right">{pct((k.sinEl - k.publicado) / k.publicado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
            Calculado el {CALIBRACION.fecha.split('-').reverse().join('/')} con malla {CALIBRACION.resolucion} a {CALIBRACION.kmh} km/h. «Sin él»: lo que sale si ese coche no se usa para ajustar; con los cuatro cerrados da un error medio de ±{fmt(banda * 100, 0)} %, y esa es la banda que lleva este diseño.
            * El Twizy va abierto por los lados y con las ruedas al aire: el método no ve el aire que entra en la cabina ni el que revuelven las ruedas sueltas, y se queda en la mitad. No se usa para ajustar.
            El Cd del Aptera (0,13) lo declara la marca sin ensayo publicado.
          </p>
        </div>
        <div className="text-[11px] leading-snug text-slate-600">
          <p className="text-[12px] font-semibold text-slate-900">Qué es este túnel</p>
          <p className="mt-1">
            Un cálculo aproximado del aire, hecho en tu navegador. <b>No es un túnel de viento de verdad ni un CFD</b> (la simulación completa del aire). El ordenador cubre la silueta de cada coche con paneles y resuelve el aire ideal, sin rozamiento, con la carretera como un espejo: de ahí salen los colores de la piel (la presión), las líneas de corriente y los puntos críticos. Después estima la capa fina de aire pegada a la carrocería a lo largo de cada línea de la superficie, para prever dónde se despega (la línea de separación).
          </p>
          <p className="mt-1">
            El Cd suma cuatro partes: el rozamiento de la piel (como una placa lisa del mismo tamaño, corregida por la forma); la estela (el hueco que queda detrás de la línea de separación × {fmt(CONSTANTES.K_BASE, 2)}); las ruedas ({fmt(CONSTANTES.K_RUEDA, 2)} por cada rueda que da al aire); y {fmt(CONSTANTES.DCD_DETALLES, 3)} fijo de lo que el método no ve (retrovisores, juntas, bajos rugosos, refrigeración), el único número ajustado con los coches de la tabla.
          </p>
          <details className="mt-1 text-[10.5px] text-slate-500">
            <summary className="cursor-pointer text-slate-600">Lo que no sabe</summary>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Cada coche es su silueta: lo más alto, lo más bajo y lo más ancho a cada distancia del morro, con secciones redondeadas. No tiene ruedas, retrovisores, huecos ni la forma exacta de cada sección.</li>
              <li>La forma de la estela (la burbuja de aire revuelto detrás y cómo se abre luego) es un modelo, no un cálculo: el aire ideal no tiene estela.</li>
              <li>La sustentación sale del aire ideal con la carretera como espejo, sin estela ni ruedas: sirve para comparar, no como cifra de diseño.</li>
              <li>El suelo no se mueve como en la carretera de verdad y el aire no tiene viento de costado.</li>
              <li>La malla importa poco en el Cd: con los dos diseños por defecto, la alta lo cambia menos de un 1 % frente a la media y la baja un 2 %. Lo que más gana con la alta es el detalle de los colores y de los puntos críticos.</li>
            </ul>
          </details>
          <details className="mt-1 text-[10.5px] leading-snug text-slate-500">
            <summary className="cursor-pointer text-slate-600">De dónde sale cada cifra del consumo</summary>
            <p className="mt-1">En las ruedas: aire + rodadura, sin las pérdidas del motor ni los equipos.</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {calc.map(f => (
                <li key={f.id}><b className="font-medium text-slate-700">{f.nombre}</b>: Cd {fmt(f.cd, 2)} × {fmt(f.area, 2)} m² = CdA {fmt(f.cda, 3)} m²{f.masa != null && `; ${fmt(f.masa, 0)} kg en marcha, rodadura ${fmt(f.crr!, 3)}`}. {f.fuente}</li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
