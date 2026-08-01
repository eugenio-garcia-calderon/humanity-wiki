import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, ArrowRight, Heart, Sparkles, AlertCircle } from 'lucide-react';

export default function SocioConfirmacion() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/stripe/checkout-session/${sessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error('No se pudo verificar la sesión de suscripción.');
          return res.json();
        })
        .then((data) => {
          setSession(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err.message);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium text-sm">Verificando tu suscripción en Stripe...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-xl text-center">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Membresía Activada Correctamente</span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 mb-3">
          ¡Gracias por hacerte socio!
        </h1>
        <p className="text-slate-600 text-base mb-8 max-w-md mx-auto leading-relaxed">
          Tu apoyo continuado impulsa la Red Humana y nos acerca a garantizar el acceso a las necesidades básicas en todos los territorios.
        </p>

        {session && (
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 mb-8 text-left space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-200/60">
              Detalles de la Suscripción
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Estado de pago:</span>
              <span className="font-bold text-emerald-600 uppercase text-xs tracking-wider bg-emerald-50 px-2 py-0.5 rounded">
                {session.paymentStatus === 'paid' ? 'Pagado y Activo' : session.paymentStatus}
              </span>
            </div>
            {session.customerEmail && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Correo asociado:</span>
                <span className="font-semibold text-slate-800">{session.customerEmail}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Membresía:</span>
              <span className="font-semibold text-slate-800">Socio Regular (10€/mes)</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/mapa"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>Explorar el Mapa Planetario</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/contribuye"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
          >
            Volver a Contribuye
          </Link>
        </div>
      </div>
    </div>
  );
}
