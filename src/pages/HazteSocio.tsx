import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Heart, ShieldCheck, Sparkles, Check, ArrowRight, Lock, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const publishableKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_iDi7hxy87hT19E0rqb2O3LJJ';

export default function HazteSocio() {
  const { user } = useAuth();
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const embeddedCheckoutInstanceRef = useRef<any>(null);

  const effectiveEmail = user?.email || emailInput;
  const effectiveUserId = (user as any)?.id || (user?.email ? `user_${user.email}` : `anon_${Date.now()}`);

  const handleStartCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!effectiveEmail) {
      setError("Por favor, introduce un correo electrónico válido para asociar a tu membresía.");
      return;
    }

    setLoading(true);
    setError(null);
    setMountError(null);

    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          email: effectiveEmail,
          membershipType: 'socio_regular',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || 'No se pudo iniciar la sesión de pago.');
      }

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error al conectar con el servidor de pago.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientSecret && checkoutRef.current) {
      let isMounted = true;
      setCheckoutLoading(true);
      setMountError(null);

      (async () => {
        try {
          const stripe = await loadStripe(publishableKey);
          if (!stripe) throw new Error('No se pudo cargar el SDK de Stripe.');

          // El SDK de Stripe se carga desde su propio CDN en tiempo de
          // ejecución (no desde node_modules), así que su API puede cambiar
          // sin que cambie la versión instalada de @stripe/stripe-js.
          // `initEmbeddedCheckout` sigue existiendo como función pero LANZA
          // al llamarla ("ha sido eliminada, usa createEmbeddedCheckoutPage")
          // en vez de no existir — comprobado en directo el 2026-08-04, por
          // eso se prueba primero el nombre nuevo. Ver también
          // EmbeddedCheckoutModal.tsx, que sigue el mismo orden.
          const stripeAny = stripe as any;
          let checkout: any;

          if (typeof stripeAny.createEmbeddedCheckoutPage === 'function') {
            checkout = await stripeAny.createEmbeddedCheckoutPage({
              clientSecret,
            });
          } else if (typeof stripeAny.initEmbeddedCheckout === 'function') {
            checkout = await stripeAny.initEmbeddedCheckout({
              fetchClientSecret: () => Promise.resolve(clientSecret),
            });
          } else {
            throw new Error('Esta versión del SDK de Stripe no soporta Checkout embebido.');
          }

          if (isMounted && checkoutRef.current && checkout) {
            checkout.mount(checkoutRef.current);
            embeddedCheckoutInstanceRef.current = checkout;
          }
        } catch (err: any) {
          console.error("Stripe Embedded Checkout Mount Error:", err);
          if (isMounted) {
            setMountError(err.message || "No se pudo cargar la pasarela de pago embebida.");
          }
        } finally {
          if (isMounted) {
            setCheckoutLoading(false);
          }
        }
      })();

      return () => {
        isMounted = false;
        if (embeddedCheckoutInstanceRef.current) {
          try {
            embeddedCheckoutInstanceRef.current.destroy();
          } catch (e) {}
        }
      };
    }
  }, [clientSecret]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header section */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold mb-4">
          <Heart className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
          <span>Comunidad Conocimiento de la Humanidad</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Hazte Socio de Conocimiento de la Humanidad
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Forma parte activa del movimiento planetario para garantizar el acceso libre a las necesidades básicas en todos los territorios.
        </p>
      </div>

      {!clientSecret ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-12">
          {/* Card: Membership Plan Info */}
          <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="w-48 h-48 text-emerald-400" />
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6">
                Membresía Continuada
              </div>
              <h2 className="text-2xl font-bold mb-2">Socio Regular</h2>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black text-white">10€</span>
                <span className="text-slate-400 text-sm">/ mes</span>
              </div>

              <div className="space-y-4 mb-8 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Sostenimiento técnico de la plataforma de datos abiertos y mapas territoriales.</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Impulso directo a proyectos regenerativos de agua, vivienda, energía y salud.</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Voto y participación en asambleas de diagnóstico y priorización sistémica.</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>Cancelación transparente e inmediata en cualquier momento.</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Plataforma 100% independiente y sin ánimo de lucro.</span>
            </div>
          </div>

          {/* Form / Trigger Section */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Datos de suscripción
              </h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Asocia tu correo para acceder al estado de tu membresía de socio dentro de Conocimiento de la Humanidad.
              </p>

              {user ? (
                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Sesión Iniciada</div>
                    <div className="text-sm font-semibold text-slate-900">{user.email}</div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleStartCheckout} className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="tu@correo.org"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    ¿Ya tienes cuenta en Conocimiento de la Humanidad? <Link to="/login" className="text-emerald-600 font-semibold underline">Inicia sesión</Link>
                  </p>
                </form>
              )}

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mb-6">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <div>
              <button
                onClick={handleStartCheckout}
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Hazte Socio Ahora</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-4">
                <Lock className="w-3.5 h-3.5" />
                <span>Pago procesado de forma segura con Stripe Checkout</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Stripe Embedded Checkout Container */
        <div className="bg-white rounded-3xl p-4 sm:p-8 border border-slate-200/80 shadow-lg min-h-[500px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Pasarela de Pago Segura</h2>
                <p className="text-xs text-slate-500">Completa tu suscripción directamente sin salir de Conocimiento de la Humanidad</p>
              </div>
              <button
                onClick={() => {
                  setClientSecret(null);
                  setMountError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
              >
                Cambiar datos
              </button>
            </div>

            {checkoutLoading && (
              <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-3">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Cargando pasarela de pago segura de Stripe...</span>
              </div>
            )}

            {mountError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm mb-6 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>Error al montar la pasarela Embedded Checkout</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed">{mountError}</p>
                <div className="pt-2">
                  <button
                    onClick={() => setClientSecret(null)}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            <div ref={checkoutRef} id="checkout" className="w-full min-h-[400px]" />
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conexión cifrada SSL de 256 bits</span>
            </div>
            <span>Stripe Payments</span>
          </div>
        </div>
      )}
    </div>
  );
}
