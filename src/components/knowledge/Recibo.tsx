/**
 * EL RECIBO (2026-08-23, comercio F4): qué se compró, qué se pagó y con qué.
 * NO es una factura y lo dice arriba. Lo mismo para comprador y vendedor.
 * «Imprimir / guardar en PDF» usa la impresión del navegador: al imprimir,
 * solo se ve el recibo (regla @media print de abajo).
 */
import { Printer } from 'lucide-react';

const dinero = (c: number, m = 'EUR') => new Intl.NumberFormat('es-ES', { style: 'currency', currency: m }).format((c || 0) / 100);
const fecha = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }); };

export default function Recibo({ datos, onCerrar }: { datos: any; onCerrar?: () => void }) {
  if (!datos) return null;
  const m = datos.moneda || 'EUR';
  const dir = datos.comprador?.direccion;
  return (
    <section className="recibo-imprimible mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-800">
      <style>{`@media print { body * { visibility: hidden !important; } .recibo-imprimible, .recibo-imprimible * { visibility: visible !important; } .recibo-imprimible { position: absolute; left: 0; top: 0; width: 100%; border: 0; } .recibo-no-imprimir { display: none !important; } }`}</style>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Recibo de compra</p>
          <p className="text-lg font-black text-slate-900 font-mono tracking-wider">{datos.codigo}</p>
          <p className="text-xs text-slate-500">{fecha(datos.fecha)} · estado: {datos.estado}</p>
        </div>
        <div className="recibo-no-imprimir flex items-center gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-900 text-white text-xs font-black">
            <Printer className="w-3.5 h-3.5" /> Imprimir / guardar en PDF
          </button>
          {onCerrar && <button type="button" onClick={onCerrar} className="h-9 px-3 rounded-xl text-xs font-bold text-slate-500">Cerrar</button>}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">{datos.aviso}</p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vende</p>
          {datos.vendedor?.fiscal ? (
            <>
              <p className="font-bold">{datos.vendedor.fiscal.nombre_fiscal}</p>
              <p className="text-xs text-slate-600">NIF {datos.vendedor.fiscal.nif}</p>
              <p className="text-xs text-slate-600">{datos.vendedor.fiscal.direccion}, {datos.vendedor.fiscal.cp} {datos.vendedor.fiscal.ciudad} ({datos.vendedor.fiscal.pais})</p>
            </>
          ) : (
            <p className="font-bold">{datos.vendedor?.nombre || datos.vendedor?.tienda || '—'}</p>
          )}
          {datos.vendedor?.tienda && <p className="text-xs text-slate-500">{datos.vendedor.tienda}.humanity.wiki</p>}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compra</p>
          <p className="font-bold">{datos.comprador?.nombre || datos.comprador?.email || '—'}</p>
          {datos.comprador?.email && <p className="text-xs text-slate-600">{datos.comprador.email}</p>}
          {dir && <p className="text-xs text-slate-600">{[dir.line1, dir.line2, `${dir.postal_code || ''} ${dir.city || ''}`.trim(), dir.country].filter(Boolean).join(', ')}</p>}
        </div>
      </div>

      <table className="mt-4 w-full text-xs">
        <thead><tr className="text-left text-[10px] uppercase tracking-widest text-slate-400 border-b border-slate-200">
          <th className="py-1.5 font-black">Concepto</th><th className="py-1.5 font-black text-right">Uds.</th><th className="py-1.5 font-black text-right">Precio</th>{datos.desglose_iva && <th className="py-1.5 font-black text-right">IVA</th>}<th className="py-1.5 font-black text-right">Total</th>
        </tr></thead>
        <tbody>
          {(datos.lineas || []).map((l: any, i: number) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="py-1.5">{l.nombre}{l.variante && !String(l.nombre).includes(l.variante) ? ` — ${l.variante}` : ''}</td>
              <td className="py-1.5 text-right tabular-nums">{l.unidades}</td>
              <td className="py-1.5 text-right tabular-nums">{dinero(l.precio_unitario_centimos, m)}</td>
              {datos.desglose_iva && <td className="py-1.5 text-right tabular-nums">{l.iva_pct} %</td>}
              <td className="py-1.5 text-right tabular-nums font-bold">{dinero(l.total_centimos, m)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3 ml-auto max-w-xs space-y-1 text-xs">
        <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="tabular-nums">{dinero(datos.subtotal_centimos, m)}</span></div>
        {datos.descuento_centimos > 0 && <div className="flex justify-between"><span className="text-slate-500">Descuento{datos.cupon ? ` (${datos.cupon})` : ''}</span><span className="tabular-nums">−{dinero(datos.descuento_centimos, m)}</span></div>}
        {datos.envio_centimos > 0 && <div className="flex justify-between"><span className="text-slate-500">Envío</span><span className="tabular-nums">{dinero(datos.envio_centimos, m)}</span></div>}
        {datos.puntos_usados > 0 && <div className="flex justify-between"><span className="text-slate-500">Pagado con puntos</span><span className="tabular-nums">{Number(datos.puntos_usados).toLocaleString('es-ES')} puntos</span></div>}
        <div className="flex justify-between border-t border-slate-200 pt-1 font-black text-sm"><span>Pagado en euros</span><span className="tabular-nums">{dinero(datos.total_euros_centimos, m)}</span></div>
        {datos.desglose_iva && (
          <div className="pt-1 text-[11px] text-slate-500">
            <p className="font-bold text-slate-600">IVA incluido (informativo)</p>
            {datos.desglose_iva.map((d: any) => (
              <div key={d.tipo} className="flex justify-between"><span>{d.tipo} % · base {dinero(d.base_centimos, m)}</span><span className="tabular-nums">cuota {dinero(d.cuota_centimos, m)}</span></div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
