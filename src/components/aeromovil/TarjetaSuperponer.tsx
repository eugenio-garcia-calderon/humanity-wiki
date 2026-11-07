import { Layers, X } from 'lucide-react';
import { Button } from '../ui/core';
import { cn } from '../../utils/cn';

export type Alineacion = 'eje' | 'morro' | 'cola';
/** Una fila de la leyenda: el color con el que se pinta el coche y sus medidas (m). */
export interface FilaSuperpuesta { id: string; nombre: string; color: string; largo: number; ancho: number; alto: number; batalla: number; visible?: boolean }

const fmt = (v: number) => v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ALINEACIONES: [Alineacion, string][] = [['eje', 'Eje delantero'], ['morro', 'Morro'], ['cola', 'Cola']];

/**
 * La tarjeta del modo «superponer»: cómo se alinean los coches y la leyenda de
 * colores con sus medidas, para leer las siluetas sin adivinar cuál es cuál.
 */
export function TarjetaSuperponer({ filas, alineacion, alCambiar, alAlternar, alCerrar, className }: {
  filas: FilaSuperpuesta[]; alineacion: Alineacion; alCambiar: (a: Alineacion) => void; alAlternar?: (id: string) => void; alCerrar: () => void; className?: string;
}) {
  return (
    <div className={cn('absolute z-10 w-[min(94%,420px)] rounded-xl border border-slate-200 bg-white/95 p-3 text-slate-800 shadow-sm backdrop-blur', className)} role="region" aria-label="Coches superpuestos">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-sky-700" />
        <span className="text-sm font-semibold">Superpuestos</span>
        <Button variant="ghost" aria-label="Dejar de superponer" onClick={alCerrar} className="ml-auto px-1 py-1"><X className="h-4 w-4" /></Button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500" role="group" aria-label="Alinear por">
        Alinear por
        {ALINEACIONES.map(([k, n]) => (
          <Button key={k} variant="outline" aria-pressed={alineacion === k} onClick={() => alCambiar(k)}
            className={cn('px-1.5 py-0.5 text-[11px] normal-case tracking-normal', alineacion === k && 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800')}>{n}</Button>
        ))}
      </div>
      <table className="mt-2 w-full text-[11px] tabular-nums">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-0.5 font-medium">Vehículo</th>
            <th className="py-0.5 text-right font-medium">Largo</th>
            <th className="py-0.5 text-right font-medium">Ancho</th>
            <th className="py-0.5 text-right font-medium">Alto</th>
            <th className="py-0.5 text-right font-medium">Batalla</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(f => (
            <tr key={f.id} className={cn('border-t border-slate-100', f.visible === false && 'text-slate-400')}>
              <td className="py-0.5 pr-1">
                {f.visible === undefined || !alAlternar ? (
                  <span className="font-medium text-slate-900"><span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: f.color }} />{f.nombre}</span>
                ) : (
                  <Button variant="ghost" aria-pressed={f.visible} onClick={() => alAlternar(f.id)} title={f.visible ? 'Quitarlo de la superposición' : 'Ponerlo encima'}
                    className={cn('px-1 py-0.5 text-[11px] font-medium normal-case tracking-normal', f.visible ? 'text-slate-900' : 'text-slate-400')}>
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: f.visible ? f.color : 'transparent', boxShadow: `inset 0 0 0 1.5px ${f.color}` }} />{f.nombre}
                  </Button>
                )}
              </td>
              <td className="py-1 text-right">{fmt(f.largo)} m</td>
              <td className="py-1 text-right">{fmt(f.ancho)} m</td>
              <td className="py-1 text-right">{fmt(f.alto)} m</td>
              <td className="py-1 text-right">{fmt(f.batalla)} m</td>
            </tr>
          ))}
        </tbody>
      </table>
      {filas.filter(f => f.visible !== false).length < 2 && <p className="mt-1.5 text-[11px] text-slate-500">Pincha en un coche de la lista para superponerlo.</p>}
      {alAlternar && <p className="mt-1 text-[10.5px] text-slate-500">Pincha en el nombre de un coche para ponerlo o quitarlo.</p>}
      <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500">
        Se leen mejor en las vistas Lateral, Planta y Frontal: la línea de cada color es la silueta de ese coche. Con «Rayos X» se ve también lo que queda dentro del Aeromóvil.
      </p>
    </div>
  );
}
