import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mail, MailCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight, MailX } from 'lucide-react';
import { cn } from '../../utils/cn';
import {
  validarAlta, capaBasica, CAMPO_TRAMPA,
  ANCLA_CONFIRMAR, ANCLA_BAJA, ANCLA_RESULTADO, TESTIGO,
} from './formularios';

// ============================================================================
// EL BOLETÍN, EN EL PIE DEL ESCAPARATE (2026-11-07)
// ============================================================================
// Eugenio: «con alta calidad, no quiero nada cutre». Una franja al principio del
// pie (`PieSitio` sencillo, `MenuSitio.tsx`): el titular a la izquierda y el
// correo a la derecha; en el teléfono, una debajo de otra y sin ocupar de más.
//
// Lo pinta TAMBIÉN el servidor, dentro del HTML (`cabeceraSitio.tsx`), así que
// aquí no se toca nada del navegador al pintar: la dirección (`#…`) se lee en un
// efecto. Y el formulario funciona sin JavaScript: es un POST de los de siempre
// a la API, que vuelve a la misma página con el resultado detrás de `#`
// (`formulariosSitio.ts`). Nunca un GET: el correo acabaría en la dirección.
//
// Los enlaces de los correos traen el testigo detrás de `#` (`#boletin-confirmar=…`,
// `#boletin-baja=…`): al abrirlos, aquí se pregunta antes de hacer nada. Un
// programa que revisa los enlaces de un correo los abre, pero no pulsa botones.

type Resultado = 'guardado' | 'enviado' | 'reciente' | 'fallo' | 'error' | 'rapido' | 'espera';

const TEXTOS: Record<Resultado, { titulo: string; texto: (email: string | null, nombre: string) => string; bien: boolean }> = {
  guardado: { bien: true, titulo: '¡Apuntado!', texto: e => `Hemos guardado ${e || 'tu correo'}. Antes de enviarte nada te pediremos que confirmes la suscripción.` },
  enviado: { bien: true, titulo: 'Revisa tu correo', texto: e => `Te hemos enviado un enlace a ${e || 'tu correo'} para confirmar la suscripción. Si no lo ves en unos minutos, mira en la carpeta de correo no deseado.` },
  reciente: { bien: true, titulo: 'Revisa tu correo', texto: () => 'Te enviamos el enlace para confirmar hace un momento. Si no lo ves, mira en la carpeta de correo no deseado.' },
  fallo: { bien: false, titulo: 'Casi está', texto: () => 'Hemos guardado tu suscripción, pero ahora mismo no hemos podido enviarte el correo para confirmarla. Inténtalo de nuevo dentro de un rato.' },
  error: { bien: false, titulo: 'No ha podido ser', texto: () => 'No hemos podido apuntarte. Revisa tu correo y vuelve a intentarlo.' },
  rapido: { bien: false, titulo: 'Un momento', texto: () => 'Has ido muy rápido. Espera un segundo y vuelve a intentarlo.' },
  espera: { bien: false, titulo: 'Un momento', texto: () => 'Has hecho varios intentos seguidos. Prueba dentro de un rato.' },
};

/** `#boletin-confirmar=…` o `#boletin-baja=…` o `#boletin-resultado=…`, si lo hay. */
function leerAncla(): { clase: 'confirmar' | 'baja'; token: string } | { clase: 'resultado'; resultado: Resultado } | null {
  const h = window.location.hash.slice(1);
  const [clave, valor = ''] = h.split('=');
  if (clave === ANCLA_CONFIRMAR && TESTIGO.test(valor)) return { clase: 'confirmar', token: valor };
  if (clave === ANCLA_BAJA && TESTIGO.test(valor)) return { clase: 'baja', token: valor };
  if (clave === ANCLA_RESULTADO && valor in TEXTOS) return { clase: 'resultado', resultado: valor as Resultado };
  return null;
}
/** Quita el `#…` de la dirección sin mover la página ni dejar rastro en el historial. */
const limpiarAncla = () => window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);

export default function AltaBoletin({ raizId, nombre, responsable, oscuro = true }: {
  /** La raíz del sitio. Sin ella (la vista previa del editor), el formulario se ve pero no envía. */
  raizId: string | null;
  /** El nombre del sitio, «Luz & Humanidad». */
  nombre: string;
  /** Quién responde de los datos (el titular), para la información de protección de datos. */
  responsable: string;
  /** Sobre un pie oscuro (por defecto) o claro. */
  oscuro?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; consentimiento?: string }>({});
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ r: Resultado; email: string | null; mensaje?: string } | null>(null);
  const [dialogo, setDialogo] = useState<{ clase: 'confirmar' | 'baja'; token: string } | null>(null);
  // La hora a la que se pintó: con JavaScript se manda lo que se ha tardado; sin él, el servidor la compara con la suya.
  const [inicio] = useState(() => Date.now());
  const montado = useRef(inicio);
  const refResultado = useRef<HTMLDivElement>(null);
  const refEmail = useRef<HTMLInputElement>(null);
  const refSeccion = useRef<HTMLElement>(null);
  // Sin JavaScript (el HTML del servidor) valida el navegador; con él, los mensajes son los nuestros.
  const [vivo, setVivo] = useState(false);

  useEffect(() => {
    montado.current = Date.now();
    setVivo(true);
    // Al abrir la página desde el correo, y también si el enlace se abre en una pestaña que ya la tenía.
    const mirar = () => {
      const a = leerAncla();
      if (!a) return;
      if (a.clase === 'resultado') {
        setResultado({ r: a.resultado, email: null });
        limpiarAncla();
        refSeccion.current?.scrollIntoView({ block: 'center' });
      } else setDialogo(a);
    };
    mirar();
    window.addEventListener('hashchange', mirar);
    return () => window.removeEventListener('hashchange', mirar);
  }, []);
  useEffect(() => { if (resultado) refResultado.current?.focus(); }, [resultado]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!raizId || enviando) return;
    const trampa = (e.currentTarget as HTMLFormElement).elements.namedItem(CAMPO_TRAMPA) as HTMLInputElement | null;
    const v = validarAlta({ email, consentimiento: acepta });
    if ('errores' in v) {
      setErrores(v.errores);
      if (v.errores.email) refEmail.current?.focus();
      else document.getElementById('boletin-acepto')?.focus();
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      const r = await fetch(`/api/sitio/${encodeURIComponent(raizId)}/boletin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v.email, consentimiento: true, tiempo: Date.now() - montado.current, origen: window.location.pathname, [CAMPO_TRAMPA]: trampa?.value || '' }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) setResultado({ r: (j.resultado in TEXTOS ? j.resultado : 'guardado') as Resultado, email: v.email });
      else if (j.campos) { setErrores(j.campos); refEmail.current?.focus(); }
      else setResultado({ r: r.status === 429 ? 'espera' : j.codigo === 'rapido' ? 'rapido' : 'error', email: v.email, mensaje: j.error });
    } catch {
      setResultado({ r: 'error', email: v.email, mensaje: 'No hemos podido conectar. Revisa tu conexión y vuelve a intentarlo.' });
    } finally { setEnviando(false); }
  };

  const otraVez = () => { setResultado(null); setTimeout(() => refEmail.current?.focus(), 0); };

  // Los colores del pie los elige quien publica: la franja se lee sobre uno oscuro y sobre uno claro.
  const t = oscuro
    ? { titulo: 'text-white', texto: 'text-slate-300', suave: 'text-slate-400', marca: 'text-amber-300', caja: 'bg-white/[0.07] ring-white/20 focus-within:ring-amber-300', input: 'text-white placeholder:text-slate-400', error: 'text-rose-300', enlace: 'text-white decoration-amber-300/70 hover:decoration-amber-300', borde: 'border-white/10', foco: 'focus-visible:ring-offset-slate-900' }
    : { titulo: 'text-slate-900', texto: 'text-slate-600', suave: 'text-slate-500', marca: 'text-amber-700', caja: 'bg-white ring-slate-300 focus-within:ring-slate-900', input: 'text-slate-900 placeholder:text-slate-500', error: 'text-rose-700', enlace: 'text-slate-900 decoration-amber-500 hover:decoration-slate-900', borde: 'border-slate-200', foco: 'focus-visible:ring-offset-white' };
  const anillo = cn('outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2', t.foco);
  const info = TEXTOS[resultado?.r || 'guardado'];

  return (
    <section ref={refSeccion} aria-labelledby="boletin-titulo" data-boletin className={cn('border-b', t.borde)}>
      <div className="mx-auto grid max-w-[calc(576px+50vw)] gap-6 px-5 py-9 @2xl:px-8 @2xl:py-12 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,29rem)] @4xl:items-center @4xl:gap-14">
        <div className="min-w-0">
          <p className={cn('inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em]', t.marca)}>
            <Mail className="h-3.5 w-3.5" aria-hidden /> Boletín
          </p>
          <h2 id="boletin-titulo" className={cn('mt-2 text-balance text-[22px] font-black leading-tight tracking-tight @2xl:text-[28px]', t.titulo)}>
            {/* El nombre del sitio no se parte en dos líneas («Luz & / Humanidad»), si es corto. */}
            Las novedades de {nombre.length <= 24 ? nombre.replace(/ /g, '\u00a0') : nombre}, en tu correo
          </h2>
          <p className={cn('mt-2 max-w-md text-[15px] leading-relaxed', t.texto)}>
            Lo nuevo de los proyectos, cuando haya algo que contar. Te das de baja cuando quieras.
          </p>
        </div>

        <div className="min-w-0">
          {resultado ? (
            <div ref={refResultado} tabIndex={-1} role="status" className="outline-none">
              <p className={cn('flex items-center gap-2 text-lg font-black', t.titulo)}>
                {info.bien
                  ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
                  : <AlertCircle className="h-5 w-5 shrink-0 text-amber-300" aria-hidden />}
                {info.titulo}
              </p>
              <p className={cn('mt-1.5 text-[15px] leading-relaxed', t.texto)}>{resultado.mensaje && !info.bien ? resultado.mensaje : info.texto(resultado.email, nombre)}</p>
              <button type="button" onClick={otraVez} className={cn('mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full text-sm font-bold underline decoration-2 underline-offset-4', t.enlace, anillo)}>
                {info.bien ? 'Apuntar otro correo' : 'Volver a intentarlo'}
              </button>
            </div>
          ) : (
            <form method="post" action={raizId ? `/api/sitio/${encodeURIComponent(raizId)}/boletin` : undefined} onSubmit={enviar} noValidate={vivo}
              aria-busy={enviando || undefined} aria-label="Suscribirme al boletín">
              <div className={cn('flex items-center gap-1.5 rounded-full p-1.5 ring-1 transition-shadow', t.caja, errores.email && 'ring-2 ring-rose-400 focus-within:ring-rose-400')}>
                <label htmlFor="boletin-correo" className="sr-only">Tu correo electrónico</label>
                <input ref={refEmail} id="boletin-correo" type="email" name="email" required autoComplete="email" inputMode="email" spellCheck={false}
                  placeholder="tu@correo.com" value={email} onChange={e => { setEmail(e.target.value); if (errores.email) setErrores(x => ({ ...x, email: undefined })); }}
                  aria-invalid={errores.email ? true : undefined} aria-describedby={errores.email ? 'boletin-error-correo' : undefined}
                  disabled={!raizId} data-sin-contorno
                  className={cn('h-11 min-w-0 flex-1 bg-transparent pl-4 text-base outline-none', t.input)} />
                <button type="submit" disabled={!raizId || enviando} data-sin-contorno
                  className={cn('inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-5 text-[15px] font-black text-slate-900 transition-colors hover:bg-amber-300',
                    enviando ? 'cursor-wait' : !raizId && 'cursor-not-allowed opacity-60', anillo)}>
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                  {enviando ? 'Enviando…' : <>Suscribirme <ArrowRight className="hidden h-4 w-4 @md:block" aria-hidden /></>}
                </button>
              </div>
              {errores.email && <p id="boletin-error-correo" className={cn('mt-2 pl-4 text-sm font-semibold', t.error)}>{errores.email}</p>}

              <div className="mt-3 flex items-start gap-3 pl-1">
                <input id="boletin-acepto" type="checkbox" name="consentimiento" required checked={acepta} disabled={!raizId}
                  onChange={e => { setAcepta(e.target.checked); if (errores.consentimiento) setErrores(x => ({ ...x, consentimiento: undefined })); }}
                  aria-invalid={errores.consentimiento ? true : undefined} aria-describedby={errores.consentimiento ? 'boletin-error-acepto boletin-capa' : 'boletin-capa'}
                  data-sin-contorno className={cn('mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-amber-400', anillo)} />
                {/* El texto es `TEXTO_CASILLA` (`formularios.ts`), el que se guarda como aceptado; aquí, con el enlace. */}
                <label htmlFor="boletin-acepto" className={cn('cursor-pointer text-sm leading-6', t.texto)}>
                  He leído y acepto la{' '}
                  <a href="#privacidad" className={cn('font-semibold underline decoration-2 underline-offset-2', t.enlace)}>política de privacidad</a>
                </label>
              </div>
              {errores.consentimiento && <p id="boletin-error-acepto" className={cn('mt-1 pl-9 text-sm font-semibold', t.error)}>{errores.consentimiento}</p>}
              <p id="boletin-capa" className={cn('mt-2 pl-9 text-xs leading-relaxed', t.suave)}>{capaBasica('boletin', responsable)}</p>

              {/* El campo trampa (ver `formularios.ts`). */}
              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                <label>No escribas aquí <input type="text" name={CAMPO_TRAMPA} tabIndex={-1} autoComplete="off" defaultValue="" /></label>
              </div>
              <input type="hidden" name="inicio" value={inicio} />
            </form>
          )}
        </div>
      </div>
      {dialogo && raizId && <DialogoBoletin {...dialogo} raizId={raizId} nombre={nombre} onCerrar={() => { setDialogo(null); limpiarAncla(); }} />}
    </section>
  );
}

/** Confirmar el alta o darse de baja, desde el enlace del correo. Pregunta antes de hacer nada. */
function DialogoBoletin({ clase, token, raizId, nombre, onCerrar }: {
  clase: 'confirmar' | 'baja'; token: string; raizId: string; nombre: string; onCerrar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [estado, setEstado] = useState<'pregunta' | 'enviando' | 'hecho' | 'error'>('pregunta');
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } }
  }, []);

  const hacer = async () => {
    setEstado('enviando');
    try {
      const r = await fetch(`/api/sitio/${encodeURIComponent(raizId)}/boletin/${clase}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setEstado('hecho'); setAviso(clase === 'confirmar' && j.ya ? 'ya' : ''); }
      else { setEstado('error'); setAviso(j.error || 'No ha podido ser. Inténtalo de nuevo dentro de un momento.'); }
    } catch { setEstado('error'); setAviso('No hemos podido conectar. Revisa tu conexión y vuelve a intentarlo.'); }
  };
  const cerrar = () => { ref.current?.close(); onCerrar(); };

  const baja = clase === 'baja';
  const titulo = estado === 'hecho'
    ? (baja ? 'Te hemos dado de baja' : aviso === 'ya' ? 'Ya estaba confirmada' : '¡Suscripción confirmada!')
    : estado === 'error' ? 'No ha podido ser'
    : baja ? '¿Darte de baja del boletín?' : 'Confirma tu suscripción';
  const texto = estado === 'hecho'
    ? (baja ? `Hemos borrado tu dirección. No volverás a recibir el boletín de ${nombre}.` : `Ya estás suscrito al boletín de ${nombre}. Cada correo lleva un enlace para darte de baja cuando quieras.`)
    : estado === 'error' ? aviso
    : baja ? `Dejarás de recibir el boletín de ${nombre} y borraremos tu dirección.` : `Pulsa el botón para empezar a recibir el boletín de ${nombre} en tu correo.`;
  const Icono = estado === 'hecho' ? CheckCircle2 : estado === 'error' ? AlertCircle : baja ? MailX : MailCheck;

  return (
    <dialog ref={ref} aria-labelledby="boletin-dialogo-titulo" aria-describedby="boletin-dialogo-texto" onCancel={e => { e.preventDefault(); cerrar(); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-3xl border-0 bg-white p-0 text-slate-700 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-[2px]">
      <div className="p-6 sm:p-8">
        <span className={cn('grid h-12 w-12 place-items-center rounded-2xl',
          estado === 'hecho' ? 'bg-emerald-100 text-emerald-700' : estado === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800')}>
          <Icono className="h-6 w-6" aria-hidden />
        </span>
        <h2 id="boletin-dialogo-titulo" className="mt-4 text-xl font-black tracking-tight text-slate-900">{titulo}</h2>
        <p id="boletin-dialogo-texto" className="mt-2 text-base leading-relaxed text-slate-600">{texto}</p>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {estado === 'pregunta' || estado === 'enviando' ? (
            <>
              <button type="button" onClick={hacer} disabled={estado === 'enviando'} autoFocus
                className={cn('inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-black transition-colors disabled:opacity-70',
                  baja ? 'bg-slate-900 text-white hover:bg-slate-700' : 'bg-amber-400 text-slate-900 hover:bg-amber-300')}>
                {estado === 'enviando' && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {baja ? 'Darme de baja' : 'Confirmar suscripción'}
              </button>
              <button type="button" onClick={cerrar} className="inline-flex h-11 items-center rounded-full px-4 text-[15px] font-bold text-slate-600 hover:bg-slate-100">
                {baja ? 'Seguir suscrito' : 'Ahora no'}
              </button>
            </>
          ) : (
            <button type="button" onClick={cerrar} autoFocus className="inline-flex h-11 items-center rounded-full bg-slate-900 px-5 text-[15px] font-black text-white hover:bg-slate-700">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
