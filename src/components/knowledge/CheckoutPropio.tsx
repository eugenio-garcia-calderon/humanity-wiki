import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '../../utils/cn';

// ============================================================================
// EL PAGO EN NUESTRO DOMINIO (2026-10-08)
// ============================================================================
// Eugenio: «que el checkout sea en nuestro propio dominio en vez de en el de
// Stripe: embébelo, cogiendo los datos de dirección de nuestra base de datos;
// y si no los hay, pedirlos y luego guardarlos para no pedirlos dos veces».
//
// Dos pasos dentro de la misma ventana, sin salir de la página:
//   1. TUS DATOS — el formulario es nuestro. Si hay sesión, vienen rellenos
//      con lo guardado (`/api/publicar/mis-direcciones`); si no, se piden, y
//      al pagar se guardan para la próxima. Envío y facturación pueden ser la
//      misma o distintas.
//   2. LA TARJETA — el formulario de pago de Stripe, incrustado aquí. Stripe
//      ya no pide dirección: sólo la tarjeta.
// Si no hay nada que preguntar (alguien con sesión que compra algo que no se
// envía, como una donación) el paso 1 se salta y se va derecho a pagar.

export type LineaPago = { producto_id: string; cantidad: number; variante_id?: string; importe_centimos?: number };

type Dir = { nombre: string; nif: string; linea1: string; linea2: string; cp: string; ciudad: string; provincia: string; pais: string; telefono: string };
const VACIA: Dir = { nombre: '', nif: '', linea1: '', linea2: '', cp: '', ciudad: '', provincia: '', pais: 'ES', telefono: '' };
const completa = (d: Dir) => !!(d.nombre.trim() && d.linea1.trim() && d.cp.trim() && d.ciudad.trim());

const dinero = (c: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(c / 100);

function Campo({ valor, onCambio, placeholder, ancho = 'w-full', auto, tipo }: {
  valor: string; onCambio: (v: string) => void; placeholder: string; ancho?: string; auto?: string; tipo?: string;
}) {
  return (
    <input value={valor} onChange={e => onCambio(e.target.value)} placeholder={placeholder} aria-label={placeholder} autoComplete={auto} type={tipo}
      className={cn('h-11 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:border-emerald-400 outline-none', ancho)} />
  );
}

function FormDireccion({ valor, onCambio, prefijo, conNif }: { valor: Dir; onCambio: (d: Dir) => void; prefijo: 'shipping' | 'billing'; conNif?: boolean }) {
  const p = (k: keyof Dir) => (v: string) => onCambio({ ...valor, [k]: v });
  return (
    <div className="space-y-2">
      <Campo valor={valor.nombre} onCambio={p('nombre')} placeholder="Nombre y apellidos" auto={`${prefijo} name`} />
      {conNif && <Campo valor={valor.nif} onCambio={p('nif')} placeholder="NIF o CIF (si quieres factura)" ancho="w-full" auto="off" />}
      <Campo valor={valor.linea1} onCambio={p('linea1')} placeholder="Calle, número, piso" auto={`${prefijo} address-line1`} />
      <Campo valor={valor.linea2} onCambio={p('linea2')} placeholder="Más señas (opcional)" auto={`${prefijo} address-line2`} />
      <div className="flex gap-2">
        <Campo valor={valor.cp} onCambio={p('cp')} placeholder="Código postal" ancho="w-32" auto={`${prefijo} postal-code`} />
        <Campo valor={valor.ciudad} onCambio={p('ciudad')} placeholder="Ciudad" ancho="flex-1 min-w-0" auto={`${prefijo} address-level2`} />
      </div>
      <div className="flex gap-2">
        <Campo valor={valor.provincia} onCambio={p('provincia')} placeholder="Provincia (opcional)" ancho="flex-1 min-w-0" auto={`${prefijo} address-level1`} />
        <Campo valor={valor.pais} onCambio={v => onCambio({ ...valor, pais: v.toUpperCase().slice(0, 2) })} placeholder="País (ES)" ancho="w-24" auto={`${prefijo} country`} />
      </div>
    </div>
  );
}

/** El formulario de pago de Stripe, dentro de nuestra ventana. El SDK se baja sólo cuando hace falta. */
function PagoEmbebido({ clientSecret, onFallo }: { clientSecret: string; onFallo: (m: string) => void }) {
  const caja = useRef<HTMLDivElement>(null);
  const [cargando, setCargando] = useState(true);
  useEffect(() => {
    let vivo = true;
    let checkout: any = null;
    (async () => {
      try {
        const clave = (import.meta as any).env.VITE_STRIPE_PUBLISHABLE_KEY;
        if (!clave) throw new Error('Falta la clave pública de Stripe.');
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe: any = await loadStripe(clave, { locale: 'es' } as any);
        if (!stripe) throw new Error('No se ha podido cargar el pago seguro.');
        // El nombre del método cambió entre versiones del SDK; se prueba el nuevo primero.
        checkout = typeof stripe.createEmbeddedCheckoutPage === 'function'
          ? await stripe.createEmbeddedCheckoutPage({ clientSecret })
          : await stripe.initEmbeddedCheckout({ clientSecret });
        if (!vivo || !caja.current) return;
        checkout.mount(caja.current);
        setCargando(false);
      } catch (e: any) { if (vivo) { onFallo(e.message || 'No se ha podido abrir el pago.'); setCargando(false); } }
    })();
    return () => { vivo = false; try { checkout?.destroy?.(); } catch { /* ya no estaba */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret]);
  return (
    <>
      {cargando && (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-xs">Abriendo el pago seguro…</p>
        </div>
      )}
      <div ref={caja} className={cargando ? 'hidden' : 'min-h-[360px]'} />
    </>
  );
}

export default function CheckoutPropio({ lineas, extra, titulo = 'Finalizar compra', onCerrar, onPagadoConPuntos }: {
  lineas: LineaPago[];
  /** El resto del cuerpo de `comprar`: cupón, puntos, recogida en persona. */
  extra?: Record<string, any>;
  titulo?: string;
  onCerrar: () => void;
  onPagadoConPuntos?: (url: string) => void;
}) {
  const [cot, setCot] = useState<any>(null);
  const [cuenta, setCuenta] = useState<{ con_sesion: boolean; email: string | null } | null>(null);
  const [envio, setEnvio] = useState<Dir>(VACIA);
  const [factura, setFactura] = useState<Dir>(VACIA);
  const [igual, setIgual] = useState(true);
  const [quiereFactura, setQuiereFactura] = useState(false);
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardar, setGuardar] = useState(true);
  const [paso, setPaso] = useState<'datos' | 'pago'>('datos');
  const [secreto, setSecreto] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const recogida = extra?.entrega === 'recogida';
  const clave = JSON.stringify(lineas);

  // Lo guardado y la cotización, a la vez: lo primero rellena el formulario, lo segundo dice si hay algo que enviar.
  useEffect(() => {
    let vivo = true;
    Promise.all([
      fetch('/api/publicar/mis-direcciones', { credentials: 'include' }).then(r => r.json()).catch(() => null),
      fetch('/api/publicar/cotizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineas }) }).then(r => r.json()).catch(() => null),
    ]).then(([g, c]) => {
      if (!vivo) return;
      setCuenta({ con_sesion: !!g?.con_sesion, email: g?.email || null });
      if (g?.envio) setEnvio({ ...VACIA, ...g.envio });
      if (g?.facturacion) setFactura({ ...VACIA, ...g.facturacion });
      if (g && g.con_sesion) {
        setIgual(g.facturacion_igual !== false);
        if (g.facturacion?.nif) { setNif(g.facturacion.nif); }
        if (g.envio?.telefono) setTelefono(g.envio.telefono);
      }
      if (c && typeof c.subtotal_centimos === 'number') setCot(c);
      setListo(true);
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);

  // El porte depende de a dónde va: se vuelve a pedir al escribir el código postal.
  useEffect(() => {
    if (!cot?.es_fisico || recogida || envio.cp.trim().length < 4) return;
    const t = window.setTimeout(() => {
      fetch('/api/publicar/cotizar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lineas, pais: envio.pais || undefined, cp: envio.cp || undefined }) })
        .then(r => r.json()).then(j => { if (typeof j?.subtotal_centimos === 'number') setCot(j); }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envio.cp, envio.pais, cot?.es_fisico, recogida]);

  const hayEnvio = !!cot?.es_fisico && !recogida;
  const invitado = !cuenta?.con_sesion;
  const hayQueAsk = hayEnvio || invitado;
  const emailBueno = !invitado || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const sinLlegar = hayEnvio && cot?.se_envia === false;
  const faltaFactura = (hayEnvio ? !igual : quiereFactura) && !completa(factura);
  const puedeContinuar = emailBueno && (!hayEnvio || completa(envio)) && !faltaFactura && !sinLlegar && !trabajando;

  async function crear() {
    setTrabajando(true); setError(null);
    const conFactura = hayEnvio ? !igual : quiereFactura;
    try {
      const r = await fetch('/api/publicar/comprar', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineas, embebido: true, volver_a: window.location.href,
          ...(extra || {}),
          ...(invitado ? { email: email.trim() } : {}),
          ...(hayEnvio ? { direccion: { ...envio, telefono } } : {}),
          facturacion_igual: !conFactura,
          ...(conFactura ? { facturacion: factura } : {}),
          ...(!conFactura && nif.trim() ? { nif: nif.trim() } : {}),
          ...(telefono.trim() ? { telefono: telefono.trim() } : {}),
          guardar_direcciones: guardar,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.pagado_con_puntos) { onPagadoConPuntos?.(j.url); return; }
      if (!r.ok || !j.clientSecret) { setError(j.error || 'No se ha podido abrir el pago.'); setTrabajando(false); return; }
      setSecreto(j.clientSecret); setPaso('pago'); setTrabajando(false);
    } catch { setError('No hay conexión con el servidor.'); setTrabajando(false); }
  }

  // Sin nada que preguntar (con sesión y sin envío), se va derecho a pagar.
  const saltado = useRef(false);
  useEffect(() => {
    if (listo && !hayQueAsk && !saltado.current && !error) { saltado.current = true; crear(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, hayQueAsk]);

  const envioCent = cot?.envio_centimos || 0;
  const total = (cot?.subtotal_centimos || 0) + (hayEnvio && cot?.envio_centimos ? envioCent : 0);

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center sm:justify-center"
      onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()} role="dialog" aria-label={titulo}>
      <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute inset-0 bg-slate-900/50" />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-5 h-14 border-b border-slate-100 shrink-0">
          {paso === 'pago' && (
            <button type="button" onClick={() => { setPaso('datos'); setSecreto(null); setError(null); saltado.current = true; }} aria-label="Volver a mis datos"
              className="w-9 h-9 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><ArrowLeft className="w-4 h-4" /></button>
          )}
          <h2 className="text-base font-black text-slate-900">{paso === 'datos' ? titulo : 'Pago'}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="ml-auto w-11 h-11 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!listo && <div className="py-14 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>}

          {listo && paso === 'datos' && hayQueAsk && (
            <div className="space-y-5">
              {cot && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold tabular-nums">{dinero(cot.subtotal_centimos)}</span></div>
                  {hayEnvio && cot.se_envia !== false && cot.envio_centimos !== null && (
                    <div className="flex justify-between text-slate-500"><span>Envío{cot.envio_estimado ? ' (a falta del código postal)' : ''}</span><span className="tabular-nums">{cot.envio_centimos === 0 ? 'Gratis' : dinero(cot.envio_centimos)}</span></div>
                  )}
                  <div className="flex justify-between mt-1 pt-1 border-t border-slate-200"><span className="font-black">Total</span><span className="font-black tabular-nums">{dinero(total)}</span></div>
                  {cot.con_donacion && <p className="mt-1 text-[11px] text-slate-400">Las donaciones no llevan IVA.</p>}
                </div>
              )}

              {invitado && (
                <div>
                  <p className="text-xs font-black text-slate-700 mb-1.5">Tu correo</p>
                  <Campo valor={email} onCambio={setEmail} placeholder="correo@ejemplo.com" auto="email" tipo="email" />
                  <p className="mt-1 text-[11px] text-slate-400">Aquí te mandamos el recibo. No hace falta cuenta.</p>
                </div>
              )}
              {!invitado && cuenta?.email && <p className="text-xs text-slate-500">Te mandamos el recibo a <b>{cuenta.email}</b>.</p>}

              {hayEnvio && (
                <div>
                  <p className="text-xs font-black text-slate-700 mb-1.5">¿A dónde lo enviamos?</p>
                  <FormDireccion valor={envio} onCambio={setEnvio} prefijo="shipping" />
                  <div className="mt-2"><Campo valor={telefono} onCambio={setTelefono} placeholder="Teléfono (opcional, para avisarte por WhatsApp)" auto="tel" tipo="tel" /></div>
                  {sinLlegar && (
                    <p className="mt-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1.5">
                      «{cot.no_llega}» no se envía a {cot.zona_nombre || 'ese destino'}. Quítalo de la cesta o escribe a quien lo vende.
                    </p>
                  )}
                </div>
              )}

              {/* LA FACTURACIÓN: la misma que el envío, o distinta. Si no hay nada que enviar, sólo se pide si se quiere factura. */}
              <div>
                <p className="text-xs font-black text-slate-700 mb-1.5">Facturación</p>
                {hayEnvio ? (
                  <div className="space-y-1.5">
                    {([[true, 'La misma que la de envío'], [false, 'Otra dirección']] as const).map(([v, l]) => (
                      <label key={String(v)} className={cn('flex items-center gap-2 h-11 px-3 rounded-lg border cursor-pointer text-sm', igual === v ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-bold' : 'border-slate-200 text-slate-600')}>
                        <input type="radio" name="fact" checked={igual === v} onChange={() => setIgual(v)} className="accent-emerald-600" /> {l}
                      </label>
                    ))}
                  </div>
                ) : (
                  <label className="flex items-center gap-2 h-11 px-3 rounded-lg border border-slate-200 cursor-pointer text-sm text-slate-600">
                    <input type="checkbox" checked={quiereFactura} onChange={e => setQuiereFactura(e.target.checked)} className="accent-emerald-600" /> Quiero factura con mis datos
                  </label>
                )}
                {(hayEnvio ? !igual : quiereFactura) ? (
                  <div className="mt-2"><FormDireccion valor={factura} onCambio={setFactura} prefijo="billing" conNif /></div>
                ) : hayEnvio ? (
                  <div className="mt-2"><Campo valor={nif} onCambio={setNif} placeholder="NIF o CIF (si quieres factura)" auto="off" /></div>
                ) : null}
              </div>

              {cuenta?.con_sesion ? (
                <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={guardar} onChange={e => setGuardar(e.target.checked)} className="mt-0.5 accent-emerald-600" />
                  <span>Guardar mis direcciones para la próxima compra.</span>
                </label>
              ) : (
                <p className="text-[11px] text-slate-400">Si entras en tu cuenta, tus direcciones se guardan y no tendrás que escribirlas otra vez.</p>
              )}

              {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
            </div>
          )}

          {listo && !hayQueAsk && paso === 'datos' && !secreto && (
            <div className="py-14 grid place-items-center gap-3 text-slate-400">
              {error ? <p className="text-xs font-bold text-rose-600 max-w-xs text-center">{error}</p> : <><Loader2 className="w-6 h-6 animate-spin" /><p className="text-xs">Preparando el pago…</p></>}
            </div>
          )}

          {paso === 'pago' && secreto && <PagoEmbebido clientSecret={secreto} onFallo={m => { setError(m); setPaso('datos'); setSecreto(null); }} />}
        </div>

        {listo && paso === 'datos' && hayQueAsk && (
          <div className="px-5 py-3 border-t border-slate-100 shrink-0">
            <button type="button" onClick={crear} disabled={!puedeContinuar}
              className="w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {trabajando ? <><Loader2 className="w-4 h-4 animate-spin" /> Abriendo el pago…</> : 'Continuar al pago'}
            </button>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><ShieldCheck className="w-3 h-3" /> Pago seguro con tarjeta, procesado por Stripe</p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
