import { useState } from 'react';
import { Heart, Loader2, Lock, Mail, Repeat } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { cn } from '../../../utils/cn';
import { miniatura } from '../../../utils/miniatura';
import TextoEnriquecido from '../../knowledge/TextoEnriquecido';

// ============================================================================
// DONAR (2026-10-26, Eugenio)
// ============================================================================
// Se elige un importe (o se escribe otro) y se paga en la página de Stripe
// (`POST /api/stripe/checkout/donacion`, sin cuenta). Al volver, `?donacion=gracias`.
//
// Segunda vuelta (2026-10-26, Eugenio: «el logo, donaciones recurrentes, pulir
// la puntual, el correo para empresas y los contadores de 4.000 personas y 60
// organizaciones»): arriba el logo y las cifras; «Una vez» o «Cada mes» (una
// suscripción mensual); y abajo, el correo para empresas y organizaciones.
// Todo sale de `datos` y se cambia en el editor (`Editor.tsx`).

export type Cifra = { valor: string; texto: string };
const IMPORTES = [10, 25, 50, 100, 250];
const MENSUALES = [5, 10, 20, 50, 100];
const numeros = (v: unknown, def: number[]) => (Array.isArray(v) && v.length ? v : def).map(Number).filter(n => n > 0);

export default function Lectura({ datos, paginaId }: PropsLectura) {
  const unaVez = numeros(datos.importes, IMPORTES), mes = numeros(datos.importesMes, MENSUALES);
  const cifras = (Array.isArray(datos.cifras) ? datos.cifras : []).filter((c: any) => c?.valor) as Cifra[];
  const logo = typeof datos.logo === 'string' && datos.logo ? datos.logo : null;
  const titulo = typeof datos.titulo === 'string' ? datos.titulo : '';
  const email = typeof datos.email === 'string' ? datos.email.trim() : '';
  // CADA MES, POR DEFECTO (2026-10-26, Eugenio: «que la donación de cada mes sea la seleccionada por defecto,
  // con una cantidad mayor»): `frecuencia: 'mes'` y el importe de partida de cada lista (`importeMes`, `importeUnaVez`).
  const inicial = (l: number[], v: unknown, i: number) => (l.includes(Number(v)) ? Number(v) : l[i] || l[0] || 10);
  const [mensual, setMensual] = useState(datos.frecuencia === 'mes');
  const lista = mensual ? mes : unaVez;
  const [importe, setImporte] = useState<number>(() => (datos.frecuencia === 'mes' ? inicial(mes, datos.importeMes, 1) : inicial(unaVez, datos.importeUnaVez, 1)));
  const nota = typeof datos.nota === 'string' ? datos.nota.trim() : '';
  const [otro, setOtro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const vuelta = (() => { try { return new URLSearchParams(window.location.search).get('donacion'); } catch { return null; } })();
  const euros = otro ? Number(otro.replace(',', '.')) : importe;
  const valido = Number.isFinite(euros) && euros >= 1 && euros <= 10000;
  const cambiarFrecuencia = (m: boolean) => {
    setMensual(m); setOtro('');
    setImporte(m ? inicial(mes, datos.importeMes, 1) : inicial(unaVez, datos.importeUnaVez, 1));
  };
  const donar = async () => {
    if (!valido) return;
    setEnviando(true); setFallo(null);
    try {
      const r = await fetch('/api/stripe/checkout/donacion', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importe_cents: Math.round(euros * 100), recurrente: mensual, pagina_id: paginaId || '', ruta: window.location.pathname }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) throw new Error(j.error || 'No se ha podido abrir el pago.');
      window.location.href = j.url;
    } catch (e: any) { setFallo(e.message); setEnviando(false); }
  };
  const importeTxt = `${String(euros).replace('.', ',')} €`;

  const cabeza = (logo || titulo || cifras.length > 0) && (
    <div className="mb-5 text-center">
      {logo && <img src={miniatura(logo, 192)} alt="" className="mx-auto h-20 w-20 object-contain" />}
      {titulo && <p className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-[28px]">{titulo}</p>}
      {cifras.length > 0 && (
        <dl data-cifras className="mx-auto mt-4 flex max-w-md flex-wrap justify-center gap-x-8 gap-y-3">
          {cifras.map((c, i) => (
            <div key={i} className="min-w-0">
              <dt className="sr-only">{c.texto}</dt>
              <dd className="text-3xl font-black tabular-nums leading-none text-slate-900">{c.valor}</dd>
              <dd className="mt-1 text-[13px] font-semibold text-slate-500">{c.texto}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );

  if (vuelta === 'gracias') {
    return (
      <div data-donacion className="mx-auto my-6 max-w-lg">
        {cabeza}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
          <Heart className="mx-auto h-8 w-8 text-rose-600" fill="currentColor" />
          <p className="mt-2 text-xl font-black text-slate-900">¡Gracias por tu donación!</p>
          <p className="mt-1 text-sm text-slate-600">Recibirás el justificante por correo electrónico.</p>
        </div>
      </div>
    );
  }
  return (
    <div data-donacion className="mx-auto my-6 max-w-lg">
      {cabeza}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        {vuelta === 'cancelada' && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">El pago no se ha completado. Puedes intentarlo de nuevo.</p>}
        {/* Una vez o cada mes. */}
        <div role="radiogroup" aria-label="Frecuencia" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          {[false, true].map(m => (
            <button key={String(m)} type="button" role="radio" aria-checked={mensual === m} onClick={() => cambiarFrecuencia(m)}
              className={cn('inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-black transition-colors',
                mensual === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}>
              {m && <Repeat className="h-4 w-4" />}{m ? 'Cada mes' : 'Una vez'}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs font-black uppercase tracking-[0.16em] text-slate-500">Elige un importe{mensual ? ' al mes' : ''}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {lista.map(n => (
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
          {valido ? (mensual ? `Donar ${importeTxt} al mes` : `Donar ${importeTxt}`) : 'Donar'}
        </button>
        {fallo && <p role="alert" className="mt-2 text-sm font-bold text-rose-700">{fallo}</p>}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
          <Lock className="h-3 w-3 shrink-0" />
          {mensual ? 'Pago seguro con Stripe. Puedes cancelar la donación mensual cuando quieras.' : 'Pago seguro con tarjeta a través de Stripe. No hace falta cuenta.'}
        </p>
        {/* El certificado para desgravar y el teléfono para dudas (2026-10-26). */}
        {nota && <div data-nota-donacion className="mt-3 border-t border-slate-100 pt-3 text-[12px] leading-relaxed text-slate-500 [white-space:pre-line]"><TextoEnriquecido texto={nota} /></div>}
      </div>
      {email && (
        <a href={`mailto:${email}`} className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"><Mail className="h-4 w-4" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900">¿Empresa u organización?</span>
            <span className="block truncate text-[13px] text-slate-500">Escríbenos a {email}</span>
          </span>
        </a>
      )}
    </div>
  );
}
