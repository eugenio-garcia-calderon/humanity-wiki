/**
 * EDITOR DE VARIANTES (2026-08-23, comercio fase 2).
 *
 * Talla, color, tamaño… Cada fila es una variante: nombre (obligatorio), SKU
 * (opcional), precio propio (vacío = el del producto) y stock propio (vacío =
 * no se lleva la cuenta). Lo usan CrearProducto (al crear) y el panel de
 * Comercio (para un producto que ya existe). No sabe de la red: recibe la
 * lista y devuelve la lista; quien lo usa decide cuándo guardar.
 */
import { useState } from 'react';
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

// Quick-fill presets: the three lists people type over and over. One tap adds
// the whole set; names already present are skipped, so pressing twice is safe.
const PLANTILLAS: { etiqueta: string; nombres: string[] }[] = [
  { etiqueta: 'Tallas S–XL', nombres: ['S', 'M', 'L', 'XL'] },
  { etiqueta: 'Tallas 36–44', nombres: ['36', '38', '40', '42', '44'] },
  { etiqueta: 'Colores', nombres: ['Negro', 'Blanco', 'Rojo', 'Azul'] },
];

// LAYOUT (2026-10-06, Eugenio: «mejora esto de las variantes»). The old row
// squeezed four bare inputs into half the dialog, so they read «S · M · 3( ·
// st» with no way to know which box was which. Now: one row per variant with
// a column header (Nombre · Precio · Stock), the name taking the room it
// needs, and the SKU — which almost nobody uses — behind a toggle instead of
// eating a quarter of every row. 16 px text everywhere: under that, iOS zooms.
export default function EditorVariantes({ valor, onCambio, precioBase }: { valor: VarianteForm[]; onCambio: (v: VarianteForm[]) => void; precioBase?: string }) {
  const [verSku, setVerSku] = useState(() => valor.some(v => v.sku.trim()));
  const cambiar = (i: number, campo: keyof VarianteForm, texto: string) => onCambio(valor.map((v, j) => j === i ? { ...v, [campo]: texto } : v));
  const anadir = (nombres: string[]) => {
    const ya = new Set(valor.map(v => v.nombre.trim().toLowerCase()));
    // An untouched empty row is replaced rather than left dangling above the preset.
    const base = valor.filter(v => v.id || v.nombre.trim() || v.sku.trim() || v.precio.trim() || v.stock.trim());
    onCambio([...base, ...nombres.filter(n => !ya.has(n.toLowerCase())).map(nombre => ({ ...VARIANTE_VACIA, nombre }))]);
  };
  const columnas = verSku ? 'grid-cols-[1fr_4.5rem_5rem_4rem_2.25rem]' : 'grid-cols-[1fr_5.5rem_4.5rem_2.25rem]';
  const campo = 'h-11 w-full min-w-0 px-2.5 rounded-lg border border-slate-200 text-base focus:border-emerald-400 focus:outline-none';
  return (
    <div className="space-y-2">
      {valor.length === 0 ? (
        <p className="text-xs text-slate-500">Sin variantes: se vende tal cual. Añádelas si hay tallas, colores o tamaños.</p>
      ) : (
        <div className="space-y-1.5">
          <div className={`grid ${columnas} gap-1.5 px-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400`}>
            <span>Nombre</span>
            {verSku && <span>SKU</span>}
            <span>Precio €</span>
            <span>Stock</span>
            <span />
          </div>
          {valor.map((v, i) => (
            <div key={v.id || i} className={`grid ${columnas} gap-1.5 items-center`}>
              <input value={v.nombre} onChange={e => cambiar(i, 'nombre', e.target.value)} placeholder={i === 0 ? 'Talla M · Rojo' : 'Nombre'}
                aria-label={`Nombre de la variante ${i + 1}`} autoFocus={!v.nombre && i === valor.length - 1 && i > 0} className={campo} />
              {verSku && (
                <input value={v.sku} onChange={e => cambiar(i, 'sku', e.target.value)} placeholder="—" aria-label={`SKU de la variante ${i + 1}`} className={campo} />
              )}
              <input value={v.precio} onChange={e => cambiar(i, 'precio', e.target.value.replace(/[^\d,.]/g, ''))} inputMode="decimal"
                placeholder={precioBase || '—'} aria-label={`Precio de la variante ${i + 1} (vacío = el del producto)`} className={campo} />
              <input value={v.stock} onChange={e => cambiar(i, 'stock', e.target.value.replace(/\D/g, ''))} inputMode="numeric"
                placeholder="∞" aria-label={`Stock de la variante ${i + 1} (vacío = sin cuenta)`} className={campo} />
              <button type="button" onClick={() => onCambio(valor.filter((_, j) => j !== i))} aria-label={`Quitar la variante ${i + 1}`}
                className="w-9 h-11 grid place-items-center rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onCambio([...valor, { ...VARIANTE_VACIA }])}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:border-slate-500">
          <Plus className="w-3.5 h-3.5" /> Añadir variante
        </button>
        {PLANTILLAS.map(p => (
          <button key={p.etiqueta} type="button" onClick={() => anadir(p.nombres)}
            className="h-9 px-2.5 rounded-lg bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200">
            + {p.etiqueta}
          </button>
        ))}
        {valor.length > 0 && (
          <button type="button" onClick={() => setVerSku(s => !s)} className="h-9 px-1.5 text-xs font-bold text-slate-400 hover:text-slate-700">
            {verSku ? 'Ocultar SKU' : 'Añadir SKU'}
          </button>
        )}
      </div>
      {valor.length > 0 && (
        <p className="text-[11px] leading-relaxed text-slate-400">
          Precio vacío = el del producto{precioBase ? ` (${precioBase} €)` : ''}. Stock vacío (∞) = no llevas la cuenta.
          Una variante que alguien ya compró no se borra: se retira.
        </p>
      )}
    </div>
  );
}
