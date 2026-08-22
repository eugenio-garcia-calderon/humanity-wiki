import React, { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';

// ============================================================================
// Modal de Checkout Embebido — Fase 6
// ============================================================================
// 09_STRIPE.md: "Todo el proceso utilizará Stripe Embedded Checkout. El
// usuario nunca abandonará la aplicación." Generaliza el patrón que ya usaba
// HazteSocio.tsx (loadStripe + initEmbeddedCheckout + mount) para poder
// reutilizarlo también en la compra de productos del mercado y en el apoyo a
// creadores, en vez de duplicar la lógica de montaje en cada sitio.

interface Props {
  /** Debe devolver el clientSecret de una sesión de Checkout ya creada en el servidor. */
  createSession: () => Promise<{ clientSecret: string }>;
  title: string;
  onClose: () => void;
}

export default function EmbeddedCheckoutModal({ createSession, title, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const checkoutInstanceRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const { clientSecret } = await createSession();
        if (!isMounted || !containerRef.current) return;

        const publishableKey = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!publishableKey) throw new Error('Falta VITE_STRIPE_PUBLISHABLE_KEY en el cliente.');

        // STRIPE SE CARGA AQUÍ, NO AL ARRANCAR LA APP (2026-08-20). Con el
          // import arriba, el paquete entraba en el paquete principal Y su
          // script se inyectaba en TODAS las páginas: el Tester encontró el
          // iframe de Stripe vivo en /tareas, una pantalla que no vende nada.
          // Son ~1 MB de red y un marco de terceros en cada pantalla, por algo
          // que solo hace falta cuando alguien va a pagar.
          const { loadStripe } = await import('@stripe/stripe-js');
          const stripe = await loadStripe(publishableKey);
        if (!stripe) throw new Error('No se pudo cargar el SDK de Stripe.');

        // El SDK de Stripe se carga en tiempo de ejecución desde su propio
        // CDN (js.stripe.com), no desde node_modules, así que su superficie
        // de API puede cambiar de un despliegue a otro sin que cambie la
        // versión de @stripe/stripe-js instalada. `initEmbeddedCheckout`
        // sigue existiendo como función en algunas versiones pero LANZA al
        // llamarla ("ha sido eliminada, usa createEmbeddedCheckoutPage") en
        // vez de no existir — por eso se prueba primero el nombre nuevo.
        const stripeAny = stripe as any;
        let checkout: any;
        if (typeof stripeAny.createEmbeddedCheckoutPage === 'function') {
          checkout = await stripeAny.createEmbeddedCheckoutPage({ clientSecret });
        } else if (typeof stripeAny.initEmbeddedCheckout === 'function') {
          checkout = await stripeAny.initEmbeddedCheckout({ clientSecret });
        } else {
          throw new Error('Esta versión del SDK de Stripe no soporta Checkout embebido.');
        }

        if (isMounted && containerRef.current) {
          checkout.mount(containerRef.current);
          checkoutInstanceRef.current = checkout;
          setLoading(false);
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message || 'No se pudo iniciar el pago.');
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      checkoutInstanceRef.current?.destroy?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">{error}</div>
          )}
          {loading && !error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-xs">Cargando pasarela de pago segura de Stripe…</p>
            </div>
          )}
          <div ref={containerRef} className={loading || error ? 'hidden' : 'min-h-[420px]'} />
        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
          <ShieldCheck className="w-3 h-3" />
          Pago procesado de forma segura por Stripe · modo de pruebas
        </div>
      </div>
    </div>
  );
}
