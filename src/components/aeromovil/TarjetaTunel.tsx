import { Wind, X } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';

/**
 * Un coche en la comparación del túnel. `masa` es la total en marcha (vacío +
 * ocupantes) y `crr` el coeficiente de rodadura: sin ellos no hay total y la
 * fila lo dice. `vmax` sirve para avisar de una velocidad a la que no llega.
 */
export interface FilaTunel { id: string; nombre: string; cd: number; area: number; fuente: string; masa?: number; crr?: number; vmax?: number; estimado?: boolean }

const RHO = 1.2, G = 9.81; // kg/m³ y m/s², los mismos que usa el cálculo del Aeromóvil
const fmt = (v: number, d = 1) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * La tarjeta del túnel de viento (2026-11-07, Eugenio: «que el comparador sea
 * de energía a los 100 km y potencia necesaria para mantener la velocidad»).
 * Todo es en las ruedas: aire (½·ρ·v²·CdA) más rodadura (Crr·m·g), sin las
 * pérdidas del motor ni los equipos, que no se conocen igual para todos.
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

export function TarjetaTunel({ filas, base, kmh, alCambiarKmh, alCerrar, className }: { filas: FilaTunel[]; base: string; kmh: number; alCambiarKmh: (k: number) => void; alCerrar: () => void; className?: string }) {
  const v = kmh / 3.6, setKmh = alCambiarKmh;
  const calc = filas.map(f => gastoEnRuedas(f, kmh));
  const ref = calc.find(c => c.id === base);
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-3 text-slate-800', className)} role="region" aria-label="Túnel de viento">
      <div className="flex items-center gap-2">
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
      <div className="mt-2 grid gap-x-6 gap-y-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
        <table className="w-full text-[11px] tabular-nums">
          <thead>
            <tr className="text-left align-bottom text-slate-500">
              <th className="py-0.5 font-medium">Vehículo</th>
              <th className="py-0.5 text-right font-medium">Potencia para ir a {kmh} km/h</th>
              <th className="py-0.5 text-right font-medium">Energía cada 100 km</th>
              {ref && <th className="py-0.5 text-right font-medium">Frente al {ref.nombre}</th>}
            </tr>
          </thead>
          <tbody>
            {calc.map(f => (
              <tr key={f.id} className={cn('border-t border-slate-100 align-top', f.noLlega && 'text-slate-400')}>
                <td className="py-1 pr-1 font-medium text-slate-900">{f.nombre}{f.noLlega && <span className="font-normal text-amber-700"> *</span>}</td>
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
            ))}
          </tbody>
        </table>
        {calc.some(c => c.noLlega) && (
          <p className="mt-1 text-[10.5px] text-amber-800">* {calc.filter(c => c.noLlega).map(c => `el ${c.nombre} no pasa de ${fmt(c.vmax!, 0)} km/h`).join('; ')}: su fila dice lo que costaría, no algo que pueda hacer.</p>
        )}
        {calc.length < 2 && <p className="mt-1.5 text-[11px] text-slate-500">Saca otro vehículo del garaje para compararlo.</p>}
        </div>
        <div>
        <p className="text-[11px] leading-snug text-slate-600">
          <b>Por qué crece con la velocidad:</b> «solo aire» da siempre el mismo múltiplo, porque el aire frena a todos en la misma proporción. Las ruedas cuestan lo mismo por kilómetro a cualquier velocidad; cuanto más rápido, más pesa el aire en el total y más se separan.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-600">
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-red-600" />el aire choca y frena</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-blue-700" />acelera pegado a la carrocería</span>
          <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-violet-600" />estela: aire revuelto</span>
        </div>
        <details className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
          <summary className="cursor-pointer text-slate-600">De dónde sale cada cifra</summary>
          <p className="mt-1">En las ruedas: aire + rodadura, sin las pérdidas del motor ni los equipos. Las líneas de humo son una ilustración, no una simulación.</p>
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
