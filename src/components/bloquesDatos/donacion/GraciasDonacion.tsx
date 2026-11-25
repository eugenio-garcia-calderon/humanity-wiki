import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Clock, Mail, Repeat, Share2 } from 'lucide-react';

// ============================================================================
// LA PÁGINA DE GRACIAS DE UNA DONACIÓN (2026-11-25)
// ============================================================================
// Eugenio, tras donar 1 € de prueba: «no ha habido thank you page; créala, que
// sea muy elegante y que confirme la donación».
//
// Stripe vuelve a la misma página con `?donacion=gracias&sesion=cs_…`. Antes
// solo cambiaba el bloque «Donación», que en Sol Solidario está muy abajo: quien
// volvía veía el principio de la página como si nada. Ahora la vuelta abre esta
// pantalla entera, encima de la página, y pregunta al servidor qué se ha pagado
// (`GET /api/stripe/donacion/confirmar`): el importe, si es cada mes, la causa y
// a qué correo va el justificante. Al cerrarla se quita lo de la dirección y se
// queda la página de siempre. La monta `MontarGraciasDonacion` en cada raíz.

type Confirmacion = {
  pagada: boolean; importe: number | null; moneda: string; mensual: boolean; causa: string | null;
  nombre: string | null; correo: string | null; fecha: string | null; referencia: string; real: boolean;
};
type Estado = { fase: 'cargando' } | { fase: 'lista'; datos: Confirmacion } | { fase: 'error' };

const dinero = (centimos: number, moneda: string) => {
  const n = centimos / 100;
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: moneda, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
  } catch { return `${n} ${moneda}`; }
};
const fechaLarga = (iso: string | null) => {
  if (!iso) return '';
  try { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)); } catch { return ''; }
};

/** La dirección de la página sin lo que añadió Stripe. */
function direccionLimpia() {
  const u = new URL(window.location.href);
  u.searchParams.delete('donacion'); u.searchParams.delete('sesion');
  return u.pathname + (u.search ? u.search : '') + u.hash;
}

/** Un sol que respira: el círculo y sus rayos, que giran muy despacio. */
function Sol({ latiendo }: { latiendo: boolean }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className="h-24 w-24 sm:h-28 sm:w-28">
      <g className="origin-center motion-safe:animate-[spin_40s_linear_infinite]" style={{ transformBox: 'fill-box' }}>
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="60" y1="8" x2="60" y2="22" stroke="#e8c516" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${i * 30} 60 60)`} />
        ))}
      </g>
      <circle cx="60" cy="60" r="28" fill="#f8e038" className={latiendo ? 'motion-safe:animate-pulse' : undefined} />
      <circle cx="60" cy="60" r="28" fill="none" stroke="#e8c516" strokeWidth="2" />
    </svg>
  );
}

export default function GraciasDonacion({ sesion, onCerrar }: { sesion: string; onCerrar: () => void }) {
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const [copiado, setCopiado] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let vivo = true;
    // Stripe ya ha cobrado cuando vuelve, pero un pago con banco puede tardar: se pregunta dos veces como mucho.
    const pedir = (intento: number) => fetch(`/api/stripe/donacion/confirmar?sesion=${encodeURIComponent(sesion)}`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Confirmacion) => {
        if (!vivo) return;
        if (!d.pagada && intento === 0) { setTimeout(() => vivo && pedir(1), 2500); return; }
        setEstado({ fase: 'lista', datos: d });
      })
      .catch(() => { if (vivo) setEstado({ fase: 'error' }); });
    pedir(0);
    return () => { vivo = false; };
  }, [sesion]);

  // Una página encima de la página: sin que se mueva la de debajo, y Esc para volver.
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', tecla);
    return () => { document.body.style.overflow = antes; window.removeEventListener('keydown', tecla); };
  }, [onCerrar]);
  useEffect(() => { if (estado.fase !== 'cargando') titulo.current?.focus(); }, [estado.fase]);

  const d = estado.fase === 'lista' ? estado.datos : null;
  const causa = d?.causa || null;
  const importe = d?.importe != null ? dinero(d.importe, d.moneda) : null;
  const compartir = async () => {
    const url = window.location.origin + direccionLimpia();
    const texto = causa ? `Acabo de apoyar ${causa}. Si quieres sumarte:` : 'Acabo de hacer una donación. Si quieres sumarte:';
    try {
      if (navigator.share) { await navigator.share({ title: causa || document.title, text: texto, url }); return; }
      await navigator.clipboard.writeText(`${texto} ${url}`);
      setCopiado(true); setTimeout(() => setCopiado(false), 2500);
    } catch { /* cancelado */ }
  };

  return (
    <div data-gracias-donacion role="dialog" aria-modal="true" aria-labelledby="gracias-titulo"
      className="fixed inset-0 z-[200] overflow-y-auto bg-[#fbf8ef] text-slate-900">
      {/* La luz que entra por arriba. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60vh] bg-[radial-gradient(ellipse_at_top,rgba(248,224,56,0.35),transparent_65%)]" />
      <div className="relative mx-auto flex min-h-full max-w-xl flex-col items-center px-5 py-12 text-center sm:py-14">
        <Sol latiendo={estado.fase === 'cargando' || (!!d && !d.pagada)} />

        {estado.fase === 'cargando' && (
          <p role="status" className="mt-8 text-base font-semibold text-slate-500">Confirmando tu donación…</p>
        )}

        {estado.fase === 'error' && <>
          <h1 id="gracias-titulo" ref={titulo} tabIndex={-1} className="mt-8 font-serif text-4xl font-semibold tracking-tight outline-none sm:text-5xl">Gracias.</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">Hemos recibido tu vuelta desde Stripe, pero ahora mismo no podemos mostrar el detalle del pago. Si se ha completado, lo verás en el extracto de tu tarjeta.</p>
        </>}

        {d && <>
          <p className={d.pagada ? 'mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1.5 text-[13px] font-bold text-emerald-800 ring-1 ring-emerald-200' : 'mt-8 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3.5 py-1.5 text-[13px] font-bold text-amber-900 ring-1 ring-amber-200'}>
            {d.pagada ? <Check className="h-4 w-4" strokeWidth={3} /> : <Clock className="h-4 w-4" />}
            {d.pagada ? (d.mensual ? 'Donación mensual activada' : 'Donación confirmada') : 'Pago en proceso'}
          </p>
          <h1 id="gracias-titulo" ref={titulo} tabIndex={-1} className="mt-5 font-serif text-5xl font-semibold leading-[1.05] tracking-tight outline-none sm:text-6xl">
            {d.nombre ? <>Gracias,<br />{d.nombre}.</> : 'Gracias.'}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600 sm:text-xl">
            {d.pagada
              ? (d.mensual
                ? <>Tu donación de <b className="font-bold text-slate-900">{importe} al mes</b>{causa ? <> a <b className="font-bold text-slate-900">{causa}</b></> : null} ya está en marcha.</>
                : <>Tu donación de <b className="font-bold text-slate-900">{importe}</b>{causa ? <> a <b className="font-bold text-slate-900">{causa}</b></> : null} se ha completado.</>)
              : <>Tu banco aún está confirmando el pago{importe ? <> de <b className="font-bold text-slate-900">{importe}</b></> : null}. En cuanto lo haga, la donación quedará completada.</>}
          </p>

          {/* El justificante, como un recibo. */}
          <dl className="mt-8 w-full max-w-md overflow-hidden rounded-3xl bg-white text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5">
            {[
              ['Importe', importe ? `${importe}${d.mensual ? ' / mes' : ''}` : '—'],
              ['Frecuencia', d.mensual ? 'Cada mes' : 'Una vez'],
              ...(causa ? [['Destino', causa]] : []),
              ...(d.fecha ? [['Fecha', fechaLarga(d.fecha)]] : []),
              ['Referencia', d.referencia],
            ].map(([k, v], i) => (
              <div key={k} className={i ? 'flex items-baseline justify-between gap-4 border-t border-dashed border-slate-200 px-6 py-3.5' : 'flex items-baseline justify-between gap-4 px-6 py-3.5 pt-5'}>
                <dt className="text-sm text-slate-500">{k}</dt>
                <dd className={k === 'Referencia' ? 'font-mono text-sm font-semibold tracking-wider text-slate-800' : 'text-right text-[15px] font-semibold text-slate-900'}>{v}</dd>
              </div>
            ))}
            {d.correo && (
              <div className="flex items-center gap-3 bg-slate-50 px-6 py-4 text-sm text-slate-600">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                <span>Stripe te envía el recibo a <b className="font-semibold text-slate-800">{d.correo}</b></span>
              </div>
            )}
          </dl>

          {d.mensual && d.pagada && (
            <p className="mt-5 inline-flex items-center gap-2 text-[13px] text-slate-500"><Repeat className="h-3.5 w-3.5" /> Puedes cambiarla o cancelarla cuando quieras desde el correo de Stripe.</p>
          )}
          {!d.real && <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Pago de prueba · no se ha cobrado</p>}

          <p className="mt-8 max-w-sm font-serif text-xl italic leading-relaxed text-slate-700">
            {causa ? <>Con tu ayuda, {causa} llega un poco más lejos.</> : <>Lo que das hoy se convierte en luz para alguien mañana.</>}
          </p>
        </>}

        {estado.fase !== 'cargando' && (
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onCerrar}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-slate-800">
              <ArrowLeft className="h-4 w-4" /> {causa ? `Volver a ${causa}` : 'Volver a la página'}
            </button>
            <button type="button" onClick={compartir}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#f8e038] px-5 text-[15px] font-bold text-slate-900 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-[#efd320]">
              <Share2 className="h-4 w-4" /> {copiado ? 'Enlace copiado' : 'Invita a alguien'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Quita `?donacion=gracias&sesion=…` de la dirección sin recargar. */
export function cerrarGracias() {
  window.history.replaceState(window.history.state, '', direccionLimpia());
}
