// The four tiers (Eugenio, 2026-11-12: 10 / 20 / 40 / 60 %): what each one covers
// for purchases and for wages, and a few everyday payments worked through to the eight scales.
import {
  ESCALAS, TRAMOS, type Tramo, cuotasTramo, euros, porcentaje, OCTAVO,
} from '../../data/modeloSocioeconomico';
import { cn } from '../../utils/cn';

/** Ordinal greys for the tiers: more tax, darker. Tailwind tokens, not hex. */
export const TONO_TRAMO: Record<Tramo, string> = { 1: 'bg-slate-200 text-slate-900', 2: 'bg-slate-400 text-slate-950', 3: 'bg-slate-700 text-white', 4: 'bg-slate-950 text-white' };

export function TresTramos() {
  const cuotas = cuotasTramo();
  return (
    <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TRAMOS.map(t => (
        <li key={t.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900">{t.nombre}</h3>
            <span className={cn('rounded-lg px-2.5 py-1 text-xl font-[800] tabular-nums', TONO_TRAMO[t.id])}>{porcentaje(t.tipo * 100, 0)}</span>
          </div>
          <dl className="mt-3 space-y-2 text-[15px] leading-relaxed">
            <div><dt className="text-sm font-semibold text-slate-500">En las compras</dt><dd className="text-slate-800">{t.compras}</dd></div>
            {t.sueldos !== '—' && <div><dt className="text-sm font-semibold text-slate-500">En los sueldos</dt><dd className="text-slate-800">{t.sueldos}</dd></div>}
          </dl>
          <p className="mt-auto pt-3 text-sm text-slate-600">≈ {porcentaje(cuotas[t.id] * 100, 0)} de lo que pagan hoy los hogares cae en este tramo.</p>
        </li>
      ))}
    </ol>
  );
}

const PAGOS: { que: string; importe: number; tramo: Tramo; nota: string }[] = [
  { que: 'Un pan', importe: 2, tramo: 1, nota: 'comida' },
  { que: 'Una chaqueta', importe: 50, tramo: 2, nota: 'ropa' },
  { que: 'Una cena para dos', importe: 40, tramo: 3, nota: 'restaurante' },
  { que: 'Un reloj de lujo', importe: 5_000, tramo: 4, nota: 'lujo' },
  { que: 'Un sueldo de un mes en una empresa pequeña', importe: 2_000, tramo: 1, nota: 'sueldo' },
  { que: 'El mismo sueldo en una empresa grande', importe: 2_000, tramo: 3, nota: 'sueldo' },
];

export function CincoPagos() {
  const tipo = (t: Tramo) => TRAMOS[t - 1].tipo;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[680px] text-sm tabular-nums">
        <caption className="px-5 pt-5 text-left text-lg font-bold text-slate-900">Seis pagos, de principio a fin <span className="block text-sm font-normal text-slate-500">Precios y sueldos sin impuesto; el tramo se suma encima, como el IVA.</span></caption>
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            <th scope="col" className="px-5 py-2 font-medium">Pago</th>
            <th scope="col" className="px-4 py-2 font-medium">Tramo</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Impuesto, al fondo</th>
            <th scope="col" className="px-4 py-2 text-right font-medium">Se paga en total</th>
            <th scope="col" className="px-5 py-2 text-right font-medium">A cada una de las {ESCALAS.length} escalas</th>
          </tr>
        </thead>
        <tbody>
          {PAGOS.map(p => {
            const fondo = p.importe * tipo(p.tramo);
            return (
              <tr key={p.que} className="border-b border-slate-100 last:border-0">
                <th scope="row" className="px-5 py-2.5 text-left font-normal">
                  <span className="font-semibold text-slate-900">{p.que}</span> <span className="text-slate-500">({p.nota}), {euros(p.importe, p.importe < 10 ? 2 : 0)}</span>
                </th>
                <td className="px-4 py-2.5"><span className={cn('rounded px-1.5 py-0.5 text-xs font-bold', TONO_TRAMO[p.tramo])}>{p.tramo}: {porcentaje(tipo(p.tramo) * 100, 0)}</span></td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-900">{euros(fondo, fondo % 1 ? 2 : 0)}</td>
                <td className="px-4 py-2.5 text-right text-slate-700">{euros(p.importe + fondo, p.importe < 10 ? 2 : 0)}</td>
                <td className="px-5 py-2.5 text-right text-slate-700">{euros(fondo * OCTAVO, 2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
