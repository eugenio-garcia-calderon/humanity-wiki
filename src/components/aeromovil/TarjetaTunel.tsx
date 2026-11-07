import { useState } from 'react';
import { Wind, X } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';

/** Un coche en la comparación del túnel: de dónde sale cada cifra va en `fuente`. */
export interface FilaTunel { id: string; nombre: string; cd: number; area: number; fuente: string }

const RHO = 1.2; // kg/m³, la misma densidad que usa el cálculo del Aeromóvil
const fmt = (v: number, d = 0) => v.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * La tarjeta del túnel de viento: lo que cuesta empujar el aire a una
 * velocidad, coche por coche. Las líneas de humo del visor son una
 * ilustración; las cifras son estas, y cada una dice de dónde sale.
 */
export function TarjetaTunel({ filas, alCerrar, className }: { filas: FilaTunel[]; alCerrar: () => void; className?: string }) {
  const [kmh, setKmh] = useState(80);
  const v = kmh / 3.6;
  const calc = filas.map(f => {
    const cda = f.cd * f.area, fuerza = 0.5 * RHO * v * v * cda;
    return { ...f, cda, fuerza, kw: (fuerza * v) / 1000, kwh100: (fuerza * 100000) / 3.6e6 };
  });
  const menor = calc.length > 1 ? calc.reduce((a, b) => (a.cda < b.cda ? a : b)) : null;
  const mayor = calc.length > 1 ? calc.reduce((a, b) => (a.cda > b.cda ? a : b)) : null;
  return (
    <div className={cn('absolute z-10 w-[min(94%,440px)] rounded-xl border border-slate-200 bg-white/95 p-3 text-slate-800 shadow-sm backdrop-blur', className)} role="region" aria-label="Túnel de viento">
      <div className="flex items-center gap-2">
        <Wind className="h-4 w-4 text-sky-700" />
        <span className="text-sm font-semibold">Túnel de viento</span>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-500">
          a
          {[50, 80, 120].map(k => (
            <Button key={k} variant="outline" aria-pressed={kmh === k} onClick={() => setKmh(k)}
              className={cn('px-1.5 py-0.5 text-[11px] normal-case tracking-normal', kmh === k && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>{k} km/h</Button>
          ))}
        </span>
        <Button variant="ghost" aria-label="Cerrar el túnel de viento" onClick={alCerrar} className="px-1 py-1"><X className="h-4 w-4" /></Button>
      </div>
      <table className="mt-2 w-full text-[11px]">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-0.5 font-medium">Vehículo</th>
            <th className="py-0.5 text-right font-medium">Cd</th>
            <th className="py-0.5 text-right font-medium">Área</th>
            <th className="py-0.5 text-right font-medium">CdA</th>
            <th className="py-0.5 text-right font-medium">Fuerza</th>
            <th className="py-0.5 text-right font-medium">Potencia</th>
            <th className="py-0.5 text-right font-medium" title="Solo lo que cuesta empujar el aire, sin rodadura ni pérdidas">Aire/100 km</th>
          </tr>
        </thead>
        <tbody>
          {calc.map(f => (
            <tr key={f.id} className="border-t border-slate-100 tabular-nums" title={f.fuente}>
              <td className="py-1 pr-1 font-medium text-slate-900">{f.nombre}</td>
              <td className="py-1 text-right">{fmt(f.cd, 2)}</td>
              <td className="py-1 text-right">{fmt(f.area, 2)} m²</td>
              <td className="py-1 text-right font-semibold">{fmt(f.cda, 3)}</td>
              <td className="py-1 text-right">{fmt(f.fuerza)} N</td>
              <td className="py-1 text-right">{fmt(f.kw, 1)} kW</td>
              <td className="py-1 text-right">{fmt(f.kwh100, 1)} kWh</td>
            </tr>
          ))}
        </tbody>
      </table>
      {menor && mayor && menor.id !== mayor.id && (
        <p className="mt-1.5 text-[11px] text-slate-700">
          A {kmh} km/h el {mayor.nombre} gasta <b>{fmt(mayor.cda / menor.cda, 1)} veces</b> más energía que el {menor.nombre} solo en apartar el aire.
        </p>
      )}
      {calc.length < 2 && <p className="mt-1.5 text-[11px] text-slate-500">Saca otro vehículo del garaje para compararlo.</p>}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-600">
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-red-600" />el aire choca y frena</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-blue-700" />acelera pegado a la carrocería</span>
        <span className="flex items-center gap-1"><i className="inline-block h-2 w-3 rounded-sm bg-violet-600" />estela: aire revuelto que tira hacia atrás</span>
      </div>
      <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
        Las líneas son una ilustración, no una simulación: muestran cómo se aparta el aire según la forma de cada coche. Las cifras son las de la tabla; pasa el ratón por cada fila para ver de dónde salen.
      </p>
    </div>
  );
}
