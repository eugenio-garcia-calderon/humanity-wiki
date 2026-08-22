import { useEffect, useState } from 'react';
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
  // PUNTOS EN LA CESTA (2026-08-22). El servidor dice si está activo y cuánto
  // saldo hay; aquí solo se enseña el control cuando puede usarse, y lo que
  // se manda es cuántos puntos quiere gastar la persona — el servidor acota.
  const [caja, setCaja] = useState<{ activo: boolean; con_sesion: boolean; saldo: number | null; puntos_por_euro: number } | null>(null);
  const [usarPuntos, setUsarPuntos] = useState('');
  // CUPÓN DEL VENDEDOR (2026-08-22): se comprueba contra el servidor antes de
  // pagar, para que la cesta diga el descuento y no lo adivine.
  const [cupon, setCupon] = useState('');
  const [cuponOk, setCuponOk] = useState<{ codigo: string; descuento_centimos: number } | null>(null);
  const [cuponAviso, setCuponAviso] = useState<string | null>(null);
  async function comprobarCupon() {
    setCuponAviso(null); setCuponOk(null);
    const codigo = cupon.trim().toUpperCase();
    if (!codigo) return;
    try {
      const r = await fetch('/api/publicar/cupon/comprobar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, lineas: lineas.map(l => ({ producto_id: l.producto_id, cantidad: l.cantidad })) }),
      });
      const j = await r.json().catch(() => ({}));
      if (j.valido) setCuponOk({ codigo: j.codigo, descuento_centimos: j.descuento_centimos });
      else setCuponAviso(j.motivo || 'Ese código no vale aquí.');
    } catch { setCuponAviso('No hay conexión con el servidor.'); }
  }
  useEffect(() => {
    if (!abierta) return;
    fetch('/api/publicar/puntos-en-caja').then(r => r.json()).then(j => { if (typeof j?.activo === 'boolean') setCaja(j); }).catch(() => {});
  }, [abierta]);

  if (lineas.length === 0) return null;

  const puntosPedidos = Number(String(usarPuntos).replace(',', '.')) || 0;
  const maxPuntos = caja?.saldo != null
    ? Math.floor(Math.min(caja.saldo, (subtotal / 100) * caja.puntos_por_euro) * 100) / 100
    : 0;
  const descuentoCent = caja ? Math.min(subtotal, Math.round((Math.min(puntosPedidos, maxPuntos) / caja.puntos_por_euro) * 100)) : 0;

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
          ...(caja?.activo && puntosPedidos > 0 ? { usar_puntos: Math.min(puntosPedidos, maxPuntos) } : {}),
          ...(cuponOk ? { cupon: cuponOk.codigo } : {}),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.pagado_con_puntos) {
        // Todo pagado con puntos: no hay pasarela. La cesta SÍ se vacía aquí,
        // porque la compra ya está hecha — y se va a la tienda con el código.
        vaciar();
        window.location.href = j.url;
        return;
      }
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

              <div className="mt-3">
                <div className="flex gap-2">
                  <input value={cupon} onChange={e => { setCupon(e.target.value); setCuponOk(null); setCuponAviso(null); }}
                    placeholder="Código de descuento" aria-label="Código de descuento"
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); comprobarCupon(); } }}
                    className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm uppercase" />
                  <button type="button" onClick={comprobarCupon} disabled={!cupon.trim()}
                    className="h-10 px-3 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 disabled:opacity-40">
                    Aplicar
                  </button>
                </div>
                {cuponOk && <p className="mt-1 text-[11px] font-bold text-emerald-700">Cupón {cuponOk.codigo}: −{dinero(cuponOk.descuento_centimos)}</p>}
                {cuponAviso && <p className="mt-1 text-[11px] font-bold text-rose-600">{cuponAviso}</p>}
              </div>

              {caja?.activo && caja.con_sesion && caja.saldo != null && (
                <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50/60">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="cesta-puntos" className="text-xs font-bold text-amber-900">
                      Pagar con puntos <span className="font-normal text-amber-700">(tienes {caja.saldo.toLocaleString('es-ES', { maximumFractionDigits: 2 })})</span>
                    </label>
                    <button type="button" onClick={() => setUsarPuntos(String(maxPuntos))}
                      className="text-[11px] font-bold text-amber-800 underline">usar el máximo</button>
                  </div>
                  <input id="cesta-puntos" inputMode="decimal" value={usarPuntos}
                    onChange={e => setUsarPuntos(e.target.value)} placeholder="0"
                    className="mt-1.5 w-32 h-10 px-3 rounded-lg border border-amber-200 bg-white text-sm" />
                  {puntosPedidos > 0 && (
                    <p className="mt-1 text-[11px] text-amber-800">
                      −{dinero(descuentoCent)} de descuento{puntosPedidos > maxPuntos ? ` (máximo ${maxPuntos.toLocaleString('es-ES')} puntos aquí)` : ''}.
                      Solo lo que el vendedor acepta en puntos puede pagarse así; el envío va siempre en euros.
                    </p>
                  )}
                </div>
              )}

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
