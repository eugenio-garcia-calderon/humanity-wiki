/**
 * EDITOR DE VARIANTES (2026-08-23, comercio fase 2).
 *
 * Talla, color, tamaño… Cada fila es una variante: nombre (obligatorio), SKU
 * (opcional), precio propio (vacío = el del producto) y stock propio (vacío =
 * no se lleva la cuenta). Lo usan CrearProducto (al crear) y el panel de
 * Comercio (para un producto que ya existe). No sabe de la red: recibe la
 * lista y devuelve la lista; quien lo usa decide cuándo guardar.
 */
import { Plus, X } from 'lucide-react';

export type VarianteForm = { id?: string; nombre: string; sku: string; precio: string; stock: string };

export const VARIANTE_VACIA: VarianteForm = { nombre: '', sku: '', precio: '', stock: '' };

/** De lo que devuelve el servidor a lo que edita el formulario. */
export function variantesAFormulario(xs: any[] | undefined | null): VarianteForm[] {
  return (Array.isArray(xs) ? xs : []).map(v => ({
    id: v.id, nombre: String(v.nombre || ''), sku: String(v.sku || ''),
    precio: v.precio_centimos === null || v.precio_centimos === undefined ? '' : (Number(v.precio_centimos) / 100).toFixed(2).replace('.', ','),
    stock: v.stock === null || v.stock === undefined ? '' : String(v.stock),
  }));
}

/** De lo que edita el formulario a lo que espera el servidor. */
export function variantesAlServidor(xs: VarianteForm[]) {
  const aCent = (t: string) => { const n = Number(String(t).replace(',', '.')); return Number.isFinite(n) && t.trim() !== '' ? Math.round(n * 100) : null; };
  return xs.filter(v => v.nombre.trim()).map(v => ({
    ...(v.id ? { id: v.id } : {}),
    nombre: v.nombre.trim(), sku: v.sku.trim() || null,
    precio_centimos: aCent(v.precio), stock: v.stock.trim() === '' ? null : Math.max(0, Math.round(Number(v.stock) || 0)),
  }));
}

export default function EditorVariantes({ valor, onCambio, precioBase }: { valor: VarianteForm[]; onCambio: (v: VarianteForm[]) => void; precioBase?: string }) {
  const cambiar = (i: number, campo: keyof VarianteForm, texto: string) => onCambio(valor.map((v, j) => j === i ? { ...v, [campo]: texto } : v));
  return (
    <div className="space-y-2">
      {valor.length === 0 && (
        <p className="text-[11px] text-slate-400">Sin variantes: se vende tal cual. Añade una si hay tallas, colores o tamaños.</p>
      )}
      {valor.map((v, i) => (
        <div key={v.id || i} className="grid grid-cols-[1fr_auto] gap-1.5 items-start">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <input value={v.nombre} onChange={e => cambiar(i, 'nombre', e.target.value)} placeholder="Talla M · Rojo" aria-label="Nombre de la variante"
              className="h-10 px-2.5 rounded-lg border border-slate-200 text-sm col-span-2 sm:col-span-1" />
            <input value={v.sku} onChange={e => cambiar(i, 'sku', e.target.value)} placeholder="SKU (opcional)" aria-label="SKU"
              className="h-10 px-2.5 rounded-lg border border-slate-200 text-sm" />
            <input value={v.precio} onChange={e => cambiar(i, 'precio', e.target.value.replace(/[^\d,.]/g, ''))} inputMode="decimal" placeholder={precioBase ? `${precioBase} €` : 'precio €'} aria-label="Precio propio (vacío = el del producto)"
              className="h-10 px-2.5 rounded-lg border border-slate-200 text-sm" />
            <input value={v.stock} onChange={e => cambiar(i, 'stock', e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="stock" aria-label="Stock propio (vacío = sin cuenta)"
              className="h-10 px-2.5 rounded-lg border border-slate-200 text-sm" />
          </div>
          <button type="button" onClick={() => onCambio(valor.filter((_, j) => j !== i))} aria-label="Quitar variante"
            className="w-10 h-10 grid place-items-center rounded-lg hover:bg-slate-100"><X className="w-3.5 h-3.5 text-slate-400" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onCambio([...valor, { ...VARIANTE_VACIA }])}
        className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-slate-500">
        <Plus className="w-3.5 h-3.5" /> Añadir variante
      </button>
      {valor.length > 0 && <p className="text-[11px] text-slate-400">Precio vacío = el del producto. Stock vacío = no se lleva la cuenta. Una variante que alguien ya compró no se borra: se retira.</p>}
    </div>
  );
}
