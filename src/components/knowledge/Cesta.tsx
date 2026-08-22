import { useState } from 'react';
import { ShoppingBag, X, Minus, Plus, Loader2 } from 'lucide-react';
import { useCarrito } from '../../hooks/useCarrito';

// ============================================================================
// LA CESTA — fase 7 del plan de tiendas (2026-08-22)
// ============================================================================
// Flota abajo a la derecha y sólo existe cuando hay algo dentro. Una cesta
// vacía permanente en pantalla ocupa sitio para no decir nada, y en una página
// que también se lee —no sólo se compra— estorba.
//
// El precio que enseña es el SUBTOTAL, y lo dice con esa palabra. El envío lo
// pone Stripe al saber a dónde va, así que prometer aquí un total sería
// prometer un número que puede cambiar en la pantalla siguiente. Enseñar un
// total que luego sube es la forma más rápida de que alguien cierre la página.
//
// ── TODO LO QUE SE TOCA MIDE 44 px ──────────────────────────────────────────
// Salió a 36 y estaba mal. Es el mínimo que Apple lleva pidiendo desde 2010, y
// aquí importa más que en otras pantallas: «uno menos» y «quitar» están a dos
// dedos de distancia, y fallar el tiro no molesta —borra la línea—. Quien lo
// sufre es alguien comprando con una mano en el autobús.

export default function Cesta({ tienda }: { tienda: string }) {
  const { lineas, unidades, subtotal, cambiar, quitar, vaciar } = useCarrito(tienda);
  const [abierta, setAbierta] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lineas.length === 0) return null;

  const dinero = (c: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c / 100);

  async function pagar() {
    setPagando(true); setError(null);
    try {
      const r = await fetch('/api/publicar/comprar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineas: lineas.map(l => ({ producto_id: l.producto_id, cantidad: l.cantidad })),
          volver_a: window.location.href,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) {
        // El motivo se enseña tal cual: «de la miel solo quedan 2» es lo que
        // hace falta saber para arreglarlo. Un «ha habido un error» obligaría
        // a adivinar cuál de las cinco cosas del carrito es la que falla.
        setError(j.error || 'No se ha podido abrir el pago.');
        setPagando(false);
        return;
      }
      // El carrito NO se vacía aquí. Si alguien se arrepiente en la pantalla
      // de Stripe y vuelve, tiene que encontrar su cesta como la dejó.
      window.location.href = j.url;
    } catch {
      setError('No hay conexión con el servidor.');
      setPagando(false);
    }
  }

  return (
    <>
      {!abierta && (
        <button type="button" onClick={() => setAbierta(true)}
          className="fixed bottom-5 right-5 z-40 h-14 pl-4 pr-5 rounded-2xl bg-slate-900 text-white
                     shadow-lg flex items-center gap-3 text-sm font-bold">
          <span className="relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-400
                             text-slate-900 text-[11px] font-black grid place-items-center">
              {unidades}
            </span>
          </span>
          {dinero(subtotal)}
        </button>
      )}

      {abierta && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
          <button type="button" aria-label="Cerrar" onClick={() => setAbierta(false)}
                  className="absolute inset-0 bg-slate-900/40" />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Tu cesta</h2>
              <button type="button" onClick={() => setAbierta(false)} aria-label="Cerrar la cesta"
                      className="w-11 h-11 grid place-items-center rounded-xl hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <ul className="space-y-3">
              {lineas.map(l => (
                <li key={l.producto_id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800 truncate">{l.nombre}</p>
                    <p className="text-xs text-slate-400">{dinero(l.precio_centimos)} cada uno</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => cambiar(l.producto_id, l.cantidad - 1)}
                            aria-label="Uno menos"
                            className="w-11 h-11 grid place-items-center rounded-lg border border-slate-200">
                      <Minus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                    <span className="w-7 text-center text-sm font-bold tabular-nums">{l.cantidad}</span>
                    <button type="button" onClick={() => cambiar(l.producto_id, l.cantidad + 1)}
                            aria-label="Uno más"
                            className="w-11 h-11 grid place-items-center rounded-lg border border-slate-200">
                      <Plus className="w-3.5 h-3.5 text-slate-600" />
                    </button>
                  </div>
                  {/* Separado del «uno menos» con `ml-1`: pegados, un dedo que
                      falla el menos borra la línea entera. */}
                  <button type="button" onClick={() => quitar(l.producto_id)} aria-label="Quitar"
                          className="w-11 h-11 ml-1 grid place-items-center rounded-lg hover:bg-slate-100 shrink-0">
                    <X className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-slate-500">Subtotal</span>
                <span className="text-xl font-black text-slate-900">{dinero(subtotal)}</span>
              </div>
              {/* Se dice ANTES, no en la última pantalla: un total que sube al
                  final es la primera causa de cesta abandonada. */}
              <p className="mt-1 text-[11px] text-slate-400">
                El envío se calcula al pagar, cuando sepamos a dónde va.
              </p>

              {error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}

              <button type="button" onClick={pagar} disabled={pagando}
                className="mt-4 w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60">
                {pagando
                  ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Abriendo el pago…</span>
                  : 'Pagar'}
              </button>
              <p className="mt-2 text-center text-[11px] text-slate-400">
                Pago seguro con tarjeta. No hace falta cuenta.
              </p>
              <button type="button" onClick={vaciar}
                      className="mt-2 w-full h-11 text-xs font-bold text-slate-400 hover:text-slate-600">
                Vaciar la cesta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
