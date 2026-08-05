import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { CreditCard, TrendingUp, TrendingDown, Heart, RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================================================
// Panel financiero — Fase 6
// ============================================================================
// 08_ECONOMY.md: "Cada usuario tendrá acceso a: Balance, Ventas, Compras,
// Donaciones, Suscripciones, Facturación, Pagos pendientes." Incluye también
// el onboarding de Stripe Connect (09_STRIPE.md) para poder vender o recibir
// apoyo.

const money = (cents: number, currency = 'EUR') =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(cents / 100);

const TX_STATUS_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', procesando: 'Procesando', pagado: 'Pagado',
  reembolsado: 'Reembolsado', cancelado: 'Cancelado', fallido: 'Fallido',
};

export default function PanelFinanciero() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [connect, setConnect] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refunding, setRefunding] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [dash, status] = await Promise.all([
        fetch('/api/stripe/dashboard', { credentials: 'include' }).then(r => r.json()),
        fetch('/api/stripe/connect/status', { credentials: 'include' }).then(r => r.json()),
      ]);
      setData(dash);
      setConnect(status);
    } catch { /* deja los datos previos si falla */ }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const startOnboarding = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
    } finally {
      setConnecting(false);
    }
  };

  const openStripeDashboard = async () => {
    const res = await fetch('/api/stripe/connect/dashboard-link', { method: 'POST', credentials: 'include' });
    const json = await res.json();
    if (json.url) window.open(json.url, '_blank');
  };

  const requestRefund = async (transactionId: string) => {
    setRefunding(transactionId);
    try {
      const res = await fetch('/api/stripe/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transaction_id: transactionId }),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error); return; }
      await load();
    } finally {
      setRefunding(null);
    }
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-400 mb-4">Necesitas iniciar sesión para ver tu panel financiero.</p>
        <Link to="/login" className="text-emerald-600 font-bold text-sm hover:underline">Iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-16 space-y-6 max-w-4xl">
      <div>
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 mb-2">Panel financiero</h2>
        <p className="text-base text-slate-500">Tu balance, ventas, compras, donaciones y suscripciones en Humanity.wiki.</p>
      </div>

      {/* Stripe Connect */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" /> Cuenta para recibir pagos
          </h3>
          {connect?.connected && connect.chargesEnabled && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Activa
            </span>
          )}
        </div>
        {!connect?.connected && (
          <>
            <p className="text-xs text-slate-500 mb-3">Conecta una cuenta de Stripe para poder vender productos o recibir apoyo de otros usuarios.</p>
            <button onClick={startOnboarding} disabled={connecting} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50">
              {connecting ? 'Redirigiendo…' : 'Conectar con Stripe'}
            </button>
          </>
        )}
        {connect?.connected && !connect.chargesEnabled && (
          <>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Tu cuenta está creada pero el onboarding no se ha completado todavía.
            </p>
            <button onClick={startOnboarding} disabled={connecting} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50">
              Completar onboarding
            </button>
          </>
        )}
        {connect?.connected && connect.chargesEnabled && (
          <button onClick={openStripeDashboard} className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors">
            Ver panel de Stripe <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-slate-400 text-center py-8">Cargando…</p>}

      {data && (
        <>
          {/* Balance */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Ventas', value: data.balance.ventas_cents, n: data.counts.ventas, icon: TrendingUp, color: 'text-emerald-600' },
              { label: 'Compras', value: data.balance.compras_cents, n: data.counts.compras, icon: TrendingDown, color: 'text-slate-600' },
              { label: 'Donaciones recibidas', value: data.balance.donaciones_recibidas_cents, n: data.counts.donaciones_recibidas, icon: Heart, color: 'text-rose-500' },
              { label: 'Donaciones hechas', value: data.balance.donaciones_realizadas_cents, n: data.counts.donaciones_realizadas, icon: Heart, color: 'text-slate-400' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <card.icon className={`w-4 h-4 mb-2 ${card.color}`} />
                <p className="text-lg font-black text-slate-900 leading-none">{money(card.value)}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">{card.label} ({card.n})</p>
              </div>
            ))}
          </div>

          {data.counts.suscripciones_activas > 0 && (
            <p className="text-xs text-slate-500">
              <RefreshCw className="w-3 h-3 inline mr-1" />
              {data.counts.suscripciones_activas} suscripción(es) activa(s) de apoyo recurrente.
            </p>
          )}

          {/* Transacciones recientes */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Transacciones recientes</h3>
            {data.recentTransactions.length === 0 && (
              <p className="text-sm text-slate-400 italic">Todavía no hay transacciones.</p>
            )}
            <div className="space-y-2">
              {data.recentTransactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/60">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{tx.concept || tx.kind}</p>
                    <p className="text-[11px] text-slate-400">{new Date(tx.created_at).toLocaleDateString('es-ES')} · {TX_STATUS_LABEL[tx.status] || tx.status}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-slate-900">{money(tx.amount_cents, tx.currency)}</span>
                    {tx.status === 'pagado' && (
                      <button
                        onClick={() => requestRefund(tx.id)}
                        disabled={refunding === tx.id}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-widest disabled:opacity-40"
                      >
                        {refunding === tx.id ? '…' : 'Reembolsar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
