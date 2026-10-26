import { useState } from 'react';
import { Heart, Loader2, Lock } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { cn } from '../../../utils/cn';

// ============================================================================
// DONAR (2026-10-26, Eugenio)
// ============================================================================
// Se elige un importe (o se escribe otro) y se paga en la página de Stripe
// (`POST /api/stripe/checkout/donacion`, sin cuenta). Al volver, `?donacion=gracias`.
export default function Lectura({ datos, paginaId }: PropsLectura) {
  const importes = (Array.isArray(datos.importes) ? datos.importes : [5, 10, 25, 50, 100]).map(Number).filter(n => n > 0);
  const [importe, setImporte] = useState<number>(importes[1] || importes[0] || 10);
  const [otro, setOtro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const vuelta = (() => { try { return new URLSearchParams(window.location.search).get('donacion'); } catch { return null; } })();
  const euros = otro ? Number(otro.replace(',', '.')) : importe;
  const valido = Number.isFinite(euros) && euros >= 1 && euros <= 10000;
  const donar = async () => {
    if (!valido) return;
    setEnviando(true); setFallo(null);
    try {
      const r = await fetch('/api/stripe/checkout/donacion', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importe_cents: Math.round(euros * 100), pagina_id: paginaId || '', ruta: window.location.pathname }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'No se ha podido abrir el pago.');
      window.location.href = j.url;
    } catch (e: any) { setFallo(e.message); setEnviando(false); }
  };
  if (vuelta === 'gracias') {
    return (
      <div data-donacion className="mx-auto my-6 max-w-lg rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <Heart className="mx-auto h-8 w-8 text-rose-600" fill="currentColor" />
        <p className="mt-2 text-xl font-black text-slate-900">¡Gracias por tu donación!</p>
        <p className="mt-1 text-sm text-slate-600">Recibirás el justificante por correo electrónico.</p>
      </div>
    );
  }
  return (
    <div data-donacion className="mx-auto my-6 max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {vuelta === 'cancelada' && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">El pago no se ha completado. Puedes intentarlo de nuevo.</p>}
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Elige un importe</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {importes.map(n => (
          <button key={n} type="button" onClick={() => { setImporte(n); setOtro(''); }} aria-pressed={!otro && importe === n}
            className={cn('h-12 rounded-2xl text-lg font-black tabular-nums transition-colors', !otro && importe === n ? 'bg-[#f8e038] text-slate-900 shadow-sm ring-1 ring-black/5' : 'border border-slate-200 text-slate-800 hover:border-slate-300')}>
            {n} €
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-[#f8e038]">
        <span className="text-sm font-bold text-slate-500">Otro importe</span>
        <input inputMode="decimal" value={otro} onChange={e => setOtro(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="€" aria-label="Otro importe en euros"
          className="h-11 min-w-0 flex-1 bg-transparent text-right text-lg font-black tabular-nums outline-none" />
      </label>
      <button type="button" onClick={donar} disabled={!valido || enviando}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#f8e038] text-base font-black text-slate-900 shadow-sm ring-1 ring-black/5 hover:bg-[#efd320] disabled:opacity-50">
        {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" fill="currentColor" />}
        {valido ? `Donar ${String(euros).replace('.', ',')} €` : 'Donar'}
      </button>
      {fallo && <p role="alert" className="mt-2 text-sm font-bold text-rose-700">{fallo}</p>}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><Lock className="h-3 w-3" /> Pago seguro con tarjeta a través de Stripe. No hace falta cuenta.</p>
    </div>
  );
}
