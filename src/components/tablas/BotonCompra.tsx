import { useState } from 'react';
import { Minus, Plus, Check, ShoppingBag, Loader2 } from 'lucide-react';
import { useCarrito } from '../../hooks/useCarrito';
import { subdominioDeUsuario } from '../../utils/subdominio';
import { cn } from '../../utils/cn';

// ============================================================================
// TABLAS · EL BOTÓN DE COMPRA (2026-10-06)
// ============================================================================
// Eugenio: «una propiedad puede ser botón de compra, donde se añade al carrito,
// y tiene que haber el selector de unidades».
//
// The cell's value comes from the server (`bd/tienda.ts`): the product behind
// the row, its price and its variants. This component only chooses units and a
// variant, then does what the product block already does:
//   · inside a shop (a seller's subdomain or own domain) → into that shop's
//     cart, which is the floating «Cesta» the page already shows;
//   · anywhere else there is no cart to add to (a cart belongs to one seller),
//     so it buys straight away with the same checkout as the product page.

type Datos = {
  producto_id: string | null; nombre: string; precio_centimos: number | null; moneda: string;
  envio_centimos: number | null; stock: number | null; variantes: { id: string; nombre: string }[]; motivo?: string;
};

export default function BotonCompra({ datos, compacto, centrado }: { datos: Datos; compacto?: boolean; centrado?: boolean }) {
  const tienda = subdominioDeUsuario();
  const { anadir } = useCarrito(tienda || 'general');
  const [unidades, setUnidades] = useState(1);
  const [variante, setVariante] = useState('');
  const [hecho, setHecho] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);

  const dinero = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: datos.moneda || 'EUR' }).format(c / 100);
  const aviso = (t: string) => <span className="block px-2 py-1.5 text-[11px] text-slate-400 leading-snug">{t}</span>;

  if (datos.motivo) return aviso(datos.motivo);
  if (!datos.producto_id) return aviso('—');
  if (datos.precio_centimos === null) return aviso('Ponle un precio para venderlo');
  const agotado = datos.stock === 0;
  if (agotado) return aviso('Agotado');

  const tope = Math.min(99, datos.stock ?? 99);
  const hayVariantes = datos.variantes.length > 0;
  const elegida = datos.variantes.find(v => v.id === variante);

  const pulsar = async () => {
    setFallo(null);
    if (hayVariantes && !elegida) { setFallo('Elige una opción'); return; }
    if (tienda) {
      const ok = anadir({
        producto_id: datos.producto_id!, cantidad: unidades, nombre: datos.nombre, precio_centimos: datos.precio_centimos!,
        ...(elegida ? { variante_id: elegida.id, variante_nombre: elegida.nombre } : {}),
      });
      if (ok === false) { setFallo('La cesta está llena'); return; }
      fetch(`/api/publicar/producto/${encodeURIComponent(datos.producto_id!)}/encestado`, { method: 'POST' }).catch(() => {});
      setHecho(true);
      window.setTimeout(() => setHecho(false), 1600);
      return;
    }
    setAbriendo(true);
    try {
      const r = await fetch('/api/publicar/comprar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineas: [{ producto_id: datos.producto_id, cantidad: unidades, ...(elegida ? { variante_id: elegida.id } : {}) }],
          volver_a: window.location.href,
        }),
      });
      const j = await r.json().catch(() => ({}));
      // The server's reason is shown as it is: «solo quedan 2» is something
      // the buyer needs to read, not a generic failure.
      if (!r.ok || !j.url) { setFallo(j.error || 'No se ha podido abrir el pago.'); setAbriendo(false); return; }
      window.location.href = j.url;
    } catch { setFallo('No hay conexión con el servidor.'); setAbriendo(false); }
  };

  // 44 px targets, as in the cart: «one less» and «buy» sit two fingers apart.
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', compacto ? 'px-1.5 py-1' : 'py-1', centrado && 'justify-center')} onClick={e => e.stopPropagation()}>
      <span className="text-xs font-black text-slate-800 tabular-nums mr-0.5">{dinero(datos.precio_centimos * unidades)}</span>
      {hayVariantes && (
        <select value={variante} onChange={e => { setVariante(e.target.value); setFallo(null); }} aria-label="Opción"
          className={cn('h-9 max-w-[9rem] px-2 rounded-lg border text-sm bg-white', fallo && !elegida ? 'border-rose-400' : 'border-slate-200')}>
          <option value="">Elige…</option>
          {datos.variantes.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      )}
      <div className="flex items-center h-9 rounded-lg border border-slate-200">
        <button type="button" aria-label="Una unidad menos" disabled={unidades <= 1} onClick={() => setUnidades(u => Math.max(1, u - 1))}
          className="w-8 h-full grid place-items-center text-slate-500 disabled:opacity-30"><Minus className="w-3.5 h-3.5" /></button>
        <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">{unidades}</span>
        <button type="button" aria-label="Una unidad más" disabled={unidades >= tope} onClick={() => setUnidades(u => Math.min(tope, u + 1))}
          className="w-8 h-full grid place-items-center text-slate-500 disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
      </div>
      <button type="button" onClick={pulsar} disabled={abriendo}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-black disabled:opacity-60">
        {abriendo ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : hecho ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <ShoppingBag className="w-3.5 h-3.5" />}
        {hecho ? 'Añadido' : tienda ? 'Añadir a la cesta' : 'Comprar'}
      </button>
      {fallo && <span className="w-full text-[11px] font-bold text-rose-600">{fallo}</span>}
    </div>
  );
}
