import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { HandHeart, HandCoins, Building2, Newspaper, MessageCircle, Send, Loader2, Check, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { validarMensaje, capaBasica, CAMPO_TRAMPA, MOTIVOS, LIMITES, type Errores, type Motivo } from './formularios';

// ============================================================================
// «QUIERO COLABORAR» (2026-11-07)
// ============================================================================
// Eugenio: «con alta calidad, no quiero nada cutre». El formulario de contacto
// de un escaparate (luzhumanidad.com): cómo quieres colaborar, tu nombre y tu
// correo, el proyecto (si es uno en concreto) y tu mensaje. Lo guarda
// `src/server/formulariosSitio.ts`; quien administra la web lo lee en
// Humanity.Wiki (`/paginas/:id/formularios`) y, el día que haya correo, le
// llega un aviso a la dirección de contacto del sitio.
//
// CÓMO SE USA (en una página o una vista del sitio):
//
//     import FormularioColabora from '../sitio/FormularioColabora';
//     <FormularioColabora raizId={pagina.sitio.raizId} />
//
//   · `raizId`: la página raíz del sitio (un escaparate publicado). Es lo único obligatorio.
//   · `titulo` / `entradilla`: la cabecera de la sección. `titulo={null}` la quita
//     (cuando la página ya tiene la suya).
//   · `proyecto`: el proyecto elegido de entrada (su nombre corto, `aeromovil`). Sin
//     él, se toma de la dirección: `/colabora?proyecto=aeromovil`.
//   · `motivo`: lo mismo para «¿Cómo quieres colaborar?» (`?motivo=voluntariado`).
// Pide al servidor la lista de proyectos (`GET /api/sitio/:raiz/formulario`) al
// montarse, así que puede ir en cualquier página del sitio sin pasarle nada más.

type Seccion = { area: string; proyectos: Array<{ slug: string; titulo: string }> };

const ICONO: Record<Motivo, typeof HandHeart> = {
  voluntariado: HandHeart, donacion: HandCoins, empresa: Building2, prensa: Newspaper, otro: MessageCircle,
};

const INICIAL = { motivo: '' as Motivo | '', nombre: '', email: '', proyecto: '', mensaje: '', consentimiento: false };

export default function FormularioColabora({ raizId, titulo = '¿Quieres colaborar?', entradilla, proyecto: proyectoDado, motivo: motivoDado, className }: {
  raizId: string;
  titulo?: string | null;
  entradilla?: ReactNode;
  proyecto?: string | null;
  motivo?: Motivo | null;
  className?: string;
}) {
  const id = useId();
  const [datos, setDatos] = useState(INICIAL);
  const [errores, setErrores] = useState<Errores>({});
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState<{ nombre: string; email: string } | null>(null);
  const [info, setInfo] = useState<{ responsable: string; secciones: Seccion[] } | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const montado = useRef(Date.now());
  const refForm = useRef<HTMLFormElement>(null);
  const refGracias = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/sitio/${encodeURIComponent(raizId)}/formulario`)
      .then(async r => {
        if (!vivo) return;
        if (r.status === 404) { setCerrado(true); return; }
        const j = r.ok ? await r.json() : null;
        if (vivo && j) setInfo({ responsable: j.responsable, secciones: Array.isArray(j.secciones) ? j.secciones : [] });
      }).catch(() => {});
    return () => { vivo = false; };
  }, [raizId]);

  // Lo que venga elegido de entrada: por las props o por la dirección (`?proyecto=…&motivo=…`).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = (proyectoDado ?? q.get('proyecto') ?? '').trim().toLowerCase();
    const m = (motivoDado ?? q.get('motivo') ?? '').trim();
    setDatos(d => ({
      ...d,
      ...(p && !d.proyecto ? { proyecto: p } : {}),
      ...(MOTIVOS.some(x => x.id === m) && !d.motivo ? { motivo: m as Motivo } : {}),
    }));
  }, [proyectoDado, motivoDado]);

  useEffect(() => { if (hecho) refGracias.current?.focus(); }, [hecho]);

  const proyectos = info?.secciones.flatMap(s => s.proyectos) || [];
  // Un `?proyecto=` que no está en la lista (ya no se ve, o mal escrito) no se queda elegido a escondidas.
  const proyectoValido = !datos.proyecto || !info || proyectos.some(p => p.slug === datos.proyecto);

  const poner = <K extends keyof typeof INICIAL>(k: K, v: (typeof INICIAL)[K]) => {
    setDatos(d => ({ ...d, [k]: v }));
    if (errores[k]) setErrores(e => { const n = { ...e }; delete n[k]; return n; });
    setAviso(null);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    const entrada = { ...datos, proyecto: proyectoValido ? datos.proyecto : '' };
    const v = validarMensaje(entrada, info ? proyectos.map(p => p.slug) : null);
    if ('errores' in v) {
      setErrores(v.errores);
      setAviso('Revisa los campos marcados.');
      enfocarPrimero(v.errores);
      return;
    }
    setErrores({});
    setAviso(null);
    setEnviando(true);
    try {
      const trampa = (refForm.current?.elements.namedItem(CAMPO_TRAMPA) as HTMLInputElement | null)?.value || '';
      const r = await fetch(`/api/sitio/${encodeURIComponent(raizId)}/mensaje`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...v.datos, consentimiento: true, tiempo: Date.now() - montado.current, origen: window.location.pathname, [CAMPO_TRAMPA]: trampa }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) { setHecho({ nombre: v.datos.nombre.split(' ')[0], email: v.datos.email }); return; }
      if (j.campos) { setErrores(j.campos); enfocarPrimero(j.campos); }
      if (r.status === 404) setCerrado(true);
      setAviso(j.error || 'No hemos podido enviar tu mensaje. Inténtalo de nuevo dentro de un momento.');
    } catch {
      setAviso('No hemos podido conectar. Revisa tu conexión y vuelve a intentarlo: lo que has escrito sigue aquí.');
    } finally { setEnviando(false); }
  };

  const enfocarPrimero = (errs: Errores) => {
    const orden = ['motivo', 'nombre', 'email', 'proyecto', 'mensaje', 'consentimiento'];
    const primero = orden.find(k => errs[k]);
    if (!primero) return;
    const el = primero === 'motivo'
      ? refForm.current?.querySelector<HTMLInputElement>('input[name="motivo"]:checked, input[name="motivo"]')
      : document.getElementById(`${id}-${primero}`);
    el?.focus();
  };

  const otro = () => {
    setHecho(null);
    // Otro mensaje de la misma persona: se quedan su nombre, su correo, la forma de colaborar y el proyecto.
    setDatos(d => ({ ...INICIAL, motivo: d.motivo, nombre: d.nombre, email: d.email, proyecto: d.proyecto }));
    montado.current = Date.now();
  };

  const idTitulo = `${id}-titulo`;
  const campo = (k: string) => cn(
    'block w-full rounded-xl border bg-white px-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400',
    'focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10',
    errores[k] ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-slate-300 hover:border-slate-400',
  );
  const error = (k: string) => errores[k]
    ? <p id={`${id}-${k}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{errores[k]}</p>
    : null;
  const describe = (k: string, extra?: string) => [errores[k] ? `${id}-${k}-error` : '', extra || ''].filter(Boolean).join(' ') || undefined;

  return (
    <section aria-labelledby={titulo !== null ? idTitulo : undefined} aria-label={titulo === null ? 'Colabora' : undefined}
      data-formulario-colabora className={cn('mx-auto w-full max-w-[52rem]', className)}>
      {titulo !== null && (
        <header className="mb-8 text-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-amber-700">
            <HandHeart className="h-3.5 w-3.5" aria-hidden /> Colabora
          </p>
          <h2 id={idTitulo} className="mx-auto mt-2 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{titulo}</h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-600">
            {entradilla ?? 'Cuéntanos cómo quieres sumarte —con tu tiempo, una donación, tu empresa o desde un medio— y te contestaremos.'}
          </p>
        </header>
      )}

      {cerrado ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-base text-slate-600">Este formulario no está disponible en esta web.</p>
      ) : hecho ? (
        <div role="status" className="rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white px-6 py-10 text-center shadow-sm sm:px-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25">
            <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
          </span>
          <h3 ref={refGracias} tabIndex={-1} className="mt-5 text-2xl font-black tracking-tight text-slate-900 outline-none">¡Gracias, {hecho.nombre}!</h3>
          <p className="mx-auto mt-2 max-w-md text-base leading-relaxed text-slate-600">
            Hemos recibido tu mensaje y te contestaremos en <strong className="font-bold text-slate-900 wrap-anywhere">{hecho.email}</strong>.
          </p>
          <button type="button" onClick={otro}
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900">
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <form ref={refForm} method="post" action={`/api/sitio/${encodeURIComponent(raizId)}/mensaje`} onSubmit={enviar} noValidate aria-busy={enviando || undefined}
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {aviso && (
            <div role="alert" className="mb-6 flex items-start gap-2.5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {aviso}
            </div>
          )}

          <fieldset aria-describedby={describe('motivo')}>
            <legend className="text-base font-black text-slate-900">¿Cómo quieres colaborar?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOTIVOS.map(m => {
                const I = ICONO[m.id];
                return (
                  <label key={m.id} className="relative">
                    <input type="radio" name="motivo" value={m.id} checked={datos.motivo === m.id} onChange={() => poner('motivo', m.id)}
                      aria-invalid={errores.motivo ? true : undefined} data-sin-contorno className="peer sr-only" />
                    <span className={cn('inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-bold transition-colors select-none',
                      'peer-checked:border-slate-900 peer-checked:bg-slate-900 peer-checked:text-white',
                      'peer-focus-visible:ring-4 peer-focus-visible:ring-amber-300',
                      errores.motivo ? 'border-rose-400 text-slate-700' : 'border-slate-300 text-slate-700 hover:border-slate-500')}>
                      <I className="h-4 w-4" aria-hidden /> {m.texto}
                    </span>
                  </label>
                );
              })}
            </div>
            {error('motivo')}
          </fieldset>

          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-nombre`} className="mb-1.5 block text-sm font-bold text-slate-800">Nombre</label>
              <input id={`${id}-nombre`} name="nombre" autoComplete="name" value={datos.nombre} onChange={e => poner('nombre', e.target.value)} maxLength={LIMITES.nombreMax}
                aria-invalid={errores.nombre ? true : undefined} aria-describedby={describe('nombre')} className={cn(campo('nombre'), 'h-12')} />
              {error('nombre')}
            </div>
            <div>
              <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-bold text-slate-800">Correo electrónico</label>
              <input id={`${id}-email`} name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} value={datos.email}
                onChange={e => poner('email', e.target.value)} maxLength={LIMITES.emailMax} placeholder="nombre@correo.com"
                aria-invalid={errores.email ? true : undefined} aria-describedby={describe('email')} className={cn(campo('email'), 'h-12')} />
              {error('email')}
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor={`${id}-proyecto`} className="mb-1.5 block text-sm font-bold text-slate-800">
              Proyecto <span className="font-semibold text-slate-500">(opcional)</span>
            </label>
            <div className="relative">
              <select id={`${id}-proyecto`} name="proyecto" value={proyectoValido ? datos.proyecto : ''} onChange={e => poner('proyecto', e.target.value)}
                aria-invalid={errores.proyecto ? true : undefined} aria-describedby={describe('proyecto')}
                className={cn(campo('proyecto'), 'h-12 cursor-pointer appearance-none pr-11')}>
                <option value="">Ninguno en concreto</option>
                {info?.secciones.map(s => (
                  <optgroup key={s.area} label={s.area}>
                    {s.proyectos.map(p => <option key={p.slug} value={p.slug}>{p.titulo}</option>)}
                  </optgroup>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
            </div>
            {error('proyecto')}
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor={`${id}-mensaje`} className="block text-sm font-bold text-slate-800">Mensaje</label>
              <span id={`${id}-cuenta`} className={cn('text-xs tabular-nums', datos.mensaje.length > LIMITES.mensajeMax * 0.9 ? 'font-bold text-amber-700' : 'text-slate-500')}>
                {datos.mensaje.length.toLocaleString('es-ES')} / {LIMITES.mensajeMax.toLocaleString('es-ES')}
              </span>
            </div>
            <textarea id={`${id}-mensaje`} name="mensaje" rows={6} value={datos.mensaje} onChange={e => poner('mensaje', e.target.value)} maxLength={LIMITES.mensajeMax}
              placeholder="Cuéntanos quién eres, qué te gustaría hacer y cómo podemos ponernos en contacto."
              aria-invalid={errores.mensaje ? true : undefined} aria-describedby={describe('mensaje')}
              className={cn(campo('mensaje'), 'min-h-[9.5rem] resize-y py-3 leading-relaxed')} />
            {error('mensaje')}
          </div>

          <div className={cn('mt-6 rounded-2xl border p-4 sm:p-5', errores.consentimiento ? 'border-rose-300 bg-rose-50/60' : 'border-slate-200 bg-slate-50')}>
            <div className="flex items-start gap-3">
              <input id={`${id}-consentimiento`} type="checkbox" name="consentimiento" checked={datos.consentimiento} onChange={e => poner('consentimiento', e.target.checked)}
                aria-invalid={errores.consentimiento ? true : undefined} aria-describedby={describe('consentimiento', `${id}-capa`)}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-slate-900" />
              <label htmlFor={`${id}-consentimiento`} className="cursor-pointer text-[15px] font-semibold leading-6 text-slate-800">
                He leído y acepto la{' '}
                <a href="#privacidad" className="text-emerald-700 underline decoration-2 underline-offset-2 hover:text-emerald-800">política de privacidad</a>
              </label>
            </div>
            {error('consentimiento')}
            <p id={`${id}-capa`} className="mt-2 pl-8 text-xs leading-relaxed text-slate-500">
              {capaBasica('mensaje', info?.responsable || 'el titular de esta web')}
            </p>
          </div>

          {/* El campo trampa (ver `formularios.ts`). */}
          <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
            <label>No escribas aquí <input type="text" name={CAMPO_TRAMPA} tabIndex={-1} autoComplete="off" defaultValue="" /></label>
          </div>

          <div className="mt-7 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button type="submit" disabled={enviando}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-slate-900 px-7 text-base font-black text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-wait disabled:opacity-80">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              {enviando ? 'Enviando…' : 'Enviar mensaje'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
