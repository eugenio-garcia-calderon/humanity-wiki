import { useState } from 'react';
import { Minus, Plus, Check, ShoppingBag, Heart, Gift } from 'lucide-react';
import { useCarrito } from '../../hooks/useCarrito';
import { subdominioDeUsuario } from '../../utils/subdominio';
import { cn } from '../../utils/cn';
import { CestaDeBotones } from '../knowledge/Cesta';
import CheckoutPropio, { type LineaPago } from '../knowledge/CheckoutPropio';

// ============================================================================
// TABLAS · LOS BOTONES DE COMPRA (2026-10-06, cuatro formas desde 2026-10-08)
// ============================================================================
// Eugenio: «una propiedad puede ser botón de compra, donde se añade al carrito,
// y tiene que haber el selector de unidades». Y después: «que se pueda añadir
// un botón de compra, uno de añadir al carrito, uno de Donar y otro de
// Donación con recompensa; cada uno tiene su lógica: la donación no lleva IVA».
//
// El valor de la celda viene del servidor (`bd/tienda.ts`): el producto que hay
// detrás de la fila, su precio, sus variantes y su `modo`:
//   · `carrito`    — unidades y variante, y «Añadir a la cesta». Se paga al
//                    finalizar la compra, desde la cesta (en cualquier página:
//                    si la página no tiene cesta propia, sale una flotante).
//   · `comprar`    — lo mismo, pero «Comprar» va derecho al pago.
//   · `donar`      — cada uno elige cuánto (de 1 a 5.000 €), sin IVA y sin envío.
//   · `recompensa` — una cantidad fija a cambio de algo (lo que diga la fila),
//                    también sin IVA.
// El pago es SIEMPRE el nuestro, dentro de la página (`CheckoutPropio`).

type Datos = {
  producto_id: string | null; nombre: string; precio_centimos: number | null; moneda: string;
  envio_centimos: number | null; stock: number | null; variantes: { id: string; nombre: string }[]; motivo?: string;
  modo?: 'comprar' | 'carrito' | 'donar' | 'recompensa'; recompensa?: string | null;
};

const SUGERIDOS_EUROS = [5, 10, 25, 50];

export default function BotonCompra({ datos, compacto, centrado }: { datos: Datos; compacto?: boolean; centrado?: boolean }) {
  const tienda = subdominioDeUsuario() || 'general';
  const { anadir, quitar } = useCarrito(tienda);
  const modo = datos.modo || 'carrito';
  const donacion = modo === 'donar' || modo === 'recompensa';
  const [unidades, setUnidades] = useState(1);
  const [variante, setVariante] = useState('');
  const [hecho, setHecho] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [pago, setPago] = useState<LineaPago[] | null>(null);
  // Lo que se dona: el sugerido de la fila, o lo que se escriba.
  const [importe, setImporte] = useState<number>(Math.round((datos.precio_centimos ?? 500)) / 100);
  const [libre, setLibre] = useState('');

  const dinero = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: datos.moneda || 'EUR' }).format(c / 100);
  const aviso = (t: string) => <span className="block px-2 py-1.5 text-[11px] text-slate-400 leading-snug">{t}</span>;

  if (datos.motivo) return aviso(datos.motivo);
  if (!datos.producto_id) return aviso('—');
  if (datos.precio_centimos === null) return aviso('Ponle un precio para venderlo');
  if (datos.stock === 0) return aviso('Agotado');

  const tope = Math.min(99, datos.stock ?? 99);
  const hayVariantes = datos.variantes.length > 0;
  const elegida = datos.variantes.find(v => v.id === variante);
  // Quien dona escribe euros; el servidor trabaja en céntimos y acota de 1 a 5.000 €.
  const euros = libre.trim() ? Number(libre.replace(',', '.')) : importe;
  const importeCent = Number.isFinite(euros) ? Math.round(euros * 100) : 0;
  const importeBueno = importeCent >= 100 && importeCent <= 500000;
  const unitario = modo === 'donar' ? importeCent : datos.precio_centimos;
  const cantidad = donacion ? 1 : unidades;

  const lineaCesta = () => ({
    producto_id: datos.producto_id!, cantidad, nombre: datos.nombre, precio_centimos: unitario,
    ...(modo === 'donar' ? { importe_centimos: importeCent } : {}),
    ...(elegida ? { variante_id: elegida.id, variante_nombre: elegida.nombre } : {}),
  });
  const validar = () => {
    setFallo(null);
    if (hayVariantes && !elegida) { setFallo('Elige una opción'); return false; }
    if (modo === 'donar' && !importeBueno) { setFallo('Elige cuánto quieres donar (de 1 a 5.000 €)'); return false; }
    return true;
  };

  const alCesta = () => {
    if (!validar()) return;
    // Dar otra vez no suma: cambia lo que se da (ver `anadir`).
    if (modo === 'donar') quitar(datos.producto_id!, elegida?.id);
    if (anadir(lineaCesta()) === false) { setFallo('La cesta está llena'); return; }
    fetch(`/api/publicar/producto/${encodeURIComponent(datos.producto_id!)}/encestado`, { method: 'POST' }).catch(() => {});
    setHecho(true);
    window.setTimeout(() => setHecho(false), 1600);
  };
  const alPago = () => {
    if (!validar()) return;
    setPago([{ producto_id: datos.producto_id!, cantidad, ...(elegida ? { variante_id: elegida.id } : {}), ...(modo === 'donar' ? { importe_centimos: importeCent } : {}) }]);
  };

  const principal = modo === 'carrito' ? alCesta : alPago;
  const etiqueta = hecho ? 'Añadido'
    : modo === 'carrito' ? 'Añadir a la cesta'
    : modo === 'comprar' ? 'Comprar'
    : modo === 'donar' ? (importeBueno ? `Donar ${dinero(importeCent)}` : 'Donar')
    : `Apoyar con ${dinero(datos.precio_centimos)}`;
  const Icono = hecho ? Check : modo === 'donar' ? Heart : modo === 'recompensa' ? Gift : ShoppingBag;

  // 44 px de blanco alrededor, como en la cesta: «uno menos» y «comprar» están a dos dedos de distancia.
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', compacto ? 'px-1.5 py-1' : 'py-1', centrado && 'justify-center')}
      onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
      {modo === 'recompensa' && datos.recompensa && (
        <p className="w-full text-[11px] text-slate-600 leading-snug"><span className="font-black text-slate-800">A cambio:</span> {datos.recompensa}</p>
      )}

      {modo === 'donar' ? (
        <div className="w-full flex flex-wrap items-center gap-1.5">
          {[...new Set([Math.round((datos.precio_centimos ?? 500)) / 100, ...SUGERIDOS_EUROS])].sort((a, b) => a - b).slice(0, 5).map(e => (
            <button key={e} type="button" onClick={() => { setImporte(e); setLibre(''); setFallo(null); }}
              className={cn('h-9 px-2.5 rounded-lg border text-xs font-black tabular-nums', !libre.trim() && importe === e ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50')}>
              {e} €
            </button>
          ))}
          <input value={libre} onChange={e => { setLibre(e.target.value); setFallo(null); }} inputMode="decimal" placeholder="Otra" aria-label="Otra cantidad, en euros"
            className={cn('h-9 w-20 px-2 rounded-lg border text-xs font-bold tabular-nums', libre.trim() && !importeBueno ? 'border-rose-400' : 'border-slate-200')} />
        </div>
      ) : (
        <span className="text-xs font-black text-slate-800 tabular-nums mr-0.5">{dinero(datos.precio_centimos * cantidad)}</span>
      )}

      {hayVariantes && (
        <select value={variante} onChange={e => { setVariante(e.target.value); setFallo(null); }} aria-label="Opción"
          className={cn('h-9 max-w-[9rem] px-2 rounded-lg border text-sm bg-white', fallo && !elegida ? 'border-rose-400' : 'border-slate-200')}>
          <option value="">Elige…</option>
          {datos.variantes.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      )}
      {!donacion && (
        <div className="flex items-center h-9 rounded-lg border border-slate-200">
          <button type="button" aria-label="Una unidad menos" disabled={unidades <= 1} onClick={() => setUnidades(u => Math.max(1, u - 1))}
            className="w-8 h-full grid place-items-center text-slate-500 disabled:opacity-30"><Minus className="w-3.5 h-3.5" /></button>
          <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">{unidades}</span>
          <button type="button" aria-label="Una unidad más" disabled={unidades >= tope} onClick={() => setUnidades(u => Math.min(tope, u + 1))}
            className="w-8 h-full grid place-items-center text-slate-500 disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
        </div>
      )}
      <button type="button" onClick={principal}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-black">
        <Icono className={cn('w-3.5 h-3.5', hecho && 'text-emerald-300')} />
        {etiqueta}
      </button>
      {donacion && (
        <button type="button" onClick={alCesta} className="h-9 px-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2">
          {hecho ? 'Añadida' : 'Añadir a la cesta'}
        </button>
      )}
      {donacion && <span className="w-full text-[10px] text-slate-400">Sin IVA.</span>}
      {fallo && <span className="w-full text-[11px] font-bold text-rose-600">{fallo}</span>}

      {/* La cesta, para quien no tenga una en su página (una sola por tienda). */}
      <CestaDeBotones tienda={tienda} />
      {pago && (
        <CheckoutPropio lineas={pago} titulo={modo === 'donar' ? 'Tu donación' : modo === 'recompensa' ? 'Tu apoyo' : 'Finalizar compra'}
          onCerrar={() => setPago(null)} onPagadoConPuntos={url => { window.location.href = url; }} />
      )}
    </div>
  );
}
