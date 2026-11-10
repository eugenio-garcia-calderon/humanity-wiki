import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Copy, Download, FileUp, HandCoins, Loader2, Lock, Mail, RotateCcw } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { cn } from '../../../utils/cn';
import {
  limpiarConfig, faltaParaAbrir, validarPrestamista, contrato, aceptaciones, IDS_ACEPTACION, marca, conceptoTransferencia, RIESGOS, textoDatos,
  LIMITES_ADJUNTOS, TIPOS_JUSTIFICANTE, CAMPO_TRAMPA, euros, porcentaje, ibanBonito, interesesBrutos, normalizarIban,
  type Errores,
} from './contrato';

// ============================================================================
// «REALIZAR PRÉSTAMO» (2026-11-10, Eugenio en solarcrowd.com)
// ============================================================================
// «Divídelo en tres secciones dentro de la misma página e intenta simplificarlo al
// máximo, con desplegables de las condiciones, que sea fácil para que el usuario no
// se pierda.» Three numbered steps on the same page; each opens when the one before
// is complete, and the earlier ones stay editable:
//   1. Tus datos y tu préstamo
//   2. Condiciones y firma (the contract, risks and privacy in folds; three boxes; signature)
//   3. Transferencia y justificante → «Formalizar préstamo»
// The contract shown in step 2 is built by the same function the server signs with
// (`contrato.ts`), from the same block data, filled in with what the person typed.

type Campos = { nombre: string; documento: string; domicilio: string; email: string; telefono: string; importe: string; interes: string; plazo: string; ibanDevolucion: string };
const VACIO: Campos = { nombre: '', documento: '', domicilio: '', email: '', telefono: '', importe: '', interes: '', plazo: '', ibanDevolucion: '' };

const CAMPO = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] text-slate-900 outline-none transition-colors focus:border-slate-900 aria-[invalid=true]:border-rose-400';
const BOTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-bold transition-colors disabled:opacity-50';
const LLENO = `${BOTON} bg-slate-900 text-white hover:bg-slate-700`;

function Campo({ id, etiqueta, ayuda, error, children }: { id: string; etiqueta: string; ayuda?: string; error?: string; children: ReactNode }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-sm font-bold text-slate-800">{etiqueta}</span>
      {children}
      {error ? <span className="mt-1 block text-sm text-rose-700">{error}</span> : ayuda ? <span className="mt-1 block text-xs text-slate-500">{ayuda}</span> : null}
    </label>
  );
}

/** A fold: closed by default, works without JavaScript and Ctrl+F finds what is inside. */
function Pliegue({ titulo, children, abierto }: { titulo: string; children: ReactNode; abierto?: boolean }) {
  return (
    <details open={abierto} className="group rounded-xl border border-slate-200 bg-white">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-[15px] font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
        {titulo}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-700">{children}</div>
    </details>
  );
}

/** The signature pad: finger, pen or mouse. Returns a PNG, or null while empty. */
function Firma({ onCambio }: { onCambio: (png: string | null) => void }) {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const dibujando = useRef(false);
  const ultimo = useRef<{ x: number; y: number } | null>(null);
  const trazos = useRef(0);
  useEffect(() => {
    const c = lienzo.current; if (!c) return;
    const r = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * r; c.height = c.offsetHeight * r;
    const g = c.getContext('2d'); if (!g) return;
    g.scale(r, r); g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 2.4; g.strokeStyle = '#0f172a';
  }, []);
  const punto = (e: React.PointerEvent) => { const b = lienzo.current!.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const empezar = (e: React.PointerEvent) => { e.preventDefault(); lienzo.current?.setPointerCapture(e.pointerId); dibujando.current = true; ultimo.current = punto(e); };
  const mover = (e: React.PointerEvent) => {
    if (!dibujando.current) return;
    const g = lienzo.current?.getContext('2d'); const p = punto(e); const u = ultimo.current;
    if (!g || !u) return;
    g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(p.x, p.y); g.stroke();
    ultimo.current = p; trazos.current++;
  };
  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    // A dot or a slip is not a signature.
    if (trazos.current > 15) onCambio(lienzo.current!.toDataURL('image/png'));
  };
  const borrar = () => {
    const c = lienzo.current; const g = c?.getContext('2d'); if (!c || !g) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.restore();
    trazos.current = 0; onCambio(null);
  };
  return (
    <div>
      <canvas ref={lienzo} aria-label="Recuadro para firmar con el dedo, un lápiz o el ratón"
        onPointerDown={empezar} onPointerMove={mover} onPointerUp={terminar} onPointerLeave={terminar}
        className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-white" />
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>Firma con el dedo, un lápiz o el ratón.</span>
        <button type="button" onClick={borrar} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-bold text-slate-600 hover:bg-slate-100"><RotateCcw className="h-3.5 w-3.5" /> Borrar firma</button>
      </div>
    </div>
  );
}

const leerComoDataUrl = (f: File) => new Promise<string>((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => mal(r.error); r.readAsDataURL(f); });

export default function Lectura({ bloque, datos, paginaId }: PropsLectura) {
  const cfg = useMemo(() => limpiarConfig(datos), [datos]);
  const falta = faltaParaAbrir(cfg);
  const abiertoAlPublico = cfg.abierto && !falta;
  const m = marca(cfg);
  const casillas = aceptaciones(cfg);
  const [desplegado, setDesplegado] = useState(false);
  const [campos, setCampos] = useState<Campos>(() => ({ ...VACIO, interes: String(cfg.intereses[0] ?? ''), plazo: String(cfg.plazoMin) }));
  const [errores, setErrores] = useState<Errores>({});
  const [paso, setPaso] = useState(1);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [firma, setFirma] = useState<string | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [trampa, setTrampa] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ ref: string; copiaEnviada: boolean; email: string; pdf: string; nombrePdf: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const inicio = useRef(Date.now());
  const raiz = useRef<HTMLDivElement>(null);
  const s2 = useRef<HTMLElement>(null);
  const s3 = useRef<HTMLElement>(null);

  const poner = (k: keyof Campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setCampos(c => ({ ...c, [k]: e.target.value })); setErrores(x => ({ ...x, [k]: undefined })); };
  const v = validarPrestamista(campos, cfg);
  const p = 'datos' in v ? v.datos : null;
  // Once valid, the preview shows exactly what the server will sign (normalised phone, DNI, IBAN).
  const vistaPrevia = p ?? { importe: Number(campos.importe.replace(/\./g, '').replace(',', '.')) || undefined, interes: Number(campos.interes), plazo: Number(campos.plazo), nombre: campos.nombre || undefined, documento: campos.documento || undefined, domicilio: campos.domicilio || undefined, email: campos.email || undefined, telefono: campos.telefono || undefined, ibanDevolucion: normalizarIban(campos.ibanDevolucion) || undefined };
  const secciones = useMemo(() => contrato(cfg, vistaPrevia), [cfg, JSON.stringify(vistaPrevia)]); // eslint-disable-line react-hooks/exhaustive-deps

  const ir = (n: number, ref: React.RefObject<HTMLElement | null>) => { setPaso(x => Math.max(x, n)); setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
  const seguir1 = () => { if ('errores' in v) { setErrores(v.errores); return; } setErrores({}); ir(2, s2); };
  const todasMarcadas = IDS_ACEPTACION.every(id => marcadas.has(id));
  const seguir2 = () => {
    const e: Errores = {};
    if (!todasMarcadas) e.acepta = 'Marca las tres casillas para seguir.';
    if (!firma) e.firma = 'Firma en el recuadro.';
    setErrores(x => ({ ...x, ...e }));
    if (!Object.keys(e).length) ir(3, s3);
  };

  const formalizar = async () => {
    setFallo(null);
    // Never fold the steps back: the signature pad would come back empty while the signature is kept.
    if ('errores' in v) { setErrores(v.errores); raiz.current?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (!todasMarcadas || !firma) { seguir2(); return; }
    if (!archivo) { setErrores(x => ({ ...x, justificante: 'Adjunta el justificante de la transferencia.' })); return; }
    if (!TIPOS_JUSTIFICANTE[archivo.type] || archivo.size > LIMITES_ADJUNTOS.justificanteBytes) { setErrores(x => ({ ...x, justificante: 'Tiene que ser un PDF, JPG o PNG de hasta 8 MB.' })); return; }
    setEnviando(true);
    try {
      const r = await fetch(`/api/prestamo/${encodeURIComponent(paginaId || '')}/${encodeURIComponent(String(bloque.id || ''))}`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-prestamo-json' },
        body: JSON.stringify({
          datos: campos, aceptaciones: [...marcadas], firma,
          justificante: { tipo: archivo.type, datos: await leerComoDataUrl(archivo) },
          tiempo: Date.now() - inicio.current, [CAMPO_TRAMPA]: trampa,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.campos) setErrores(j.campos);
        setFallo(j.error || 'No se ha podido formalizar el préstamo. Vuelve a intentarlo.');
        return;
      }
      setHecho(j);
      setTimeout(() => raiz.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch {
      setFallo('No hay conexión. Comprueba tu internet y vuelve a intentarlo: no se ha guardado nada.');
    } finally { setEnviando(false); }
  };

  const copiarIban = () => { navigator.clipboard?.writeText(cfg.iban).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); }).catch(() => {}); };

  const descargarPdf = () => {
    if (!hecho?.pdf) return;
    const bytes = Uint8Array.from(atob(hecho.pdf), ch => ch.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = hecho.nombrePdf || 'contrato-prestamo.pdf'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // ── Closed, or not configured yet ─────────────────────────────────────────
  if (!abiertoAlPublico) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <Lock className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
          <div>
            <h3 className="text-lg font-black text-slate-900">Este préstamo se abrirá pronto</h3>
            <p className="mt-1 text-[15px] text-slate-600">Cuando se abra, desde aquí podrás formalizarlo en tres pasos: tus datos, las condiciones con tu firma y el justificante de la transferencia.</p>
            {/* The account number stays hidden while closed: a transfer without a signed contract is a loan nobody can prove. */}
            {cfg.correoEntidad && <p className="mt-2 text-sm text-slate-600">Correo de {cfg.entidad || 'la entidad'}: <a href={`mailto:${cfg.correoEntidad}`} className="font-semibold text-slate-900 underline">{cfg.correoEntidad}</a></p>}
            {(cfg.contacto || cfg.avisar) && (
              <a href={`mailto:${cfg.avisar || ''}?subject=${encodeURIComponent(`Avisadme cuando se abra el préstamo a ${cfg.entidad || 'la entidad'}`)}`}
                className={cn(BOTON, 'mt-3 border border-slate-300 bg-white text-slate-900 hover:border-slate-900')}><Mail className="h-4 w-4" /> Avísame cuando se abra</a>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (hecho) {
    return (
      <section ref={raiz as any} className="scroll-mt-24 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Check className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h3 className="text-xl font-black text-emerald-950">¡Préstamo formalizado!</h3>
            <p className="mt-1 text-[15px] text-emerald-900">Referencia <strong>{hecho.ref}</strong>.{' '}
              {hecho.copiaEnviada
                ? <>Te hemos enviado una copia del contrato firmado a <strong>{hecho.email}</strong>.</>
                : <>No hemos podido enviarte la copia por correo ahora mismo: descárgala aquí y guárdala. Te escribiremos.</>}
            </p>
            <p className="mt-2 text-[15px] text-emerald-900">Ahora comprobamos que tu transferencia ha llegado a la cuenta de {cfg.entidad} y te confirmamos. {cfg.entidad} te devolverá el dinero directamente, como tarde al vencimiento.</p>
            <button type="button" onClick={descargarPdf} className={cn(LLENO, 'mt-4')}><Download className="h-4 w-4" /> Descargar mi copia (PDF)</button>
          </div>
        </div>
      </section>
    );
  }

  const numero = (n: number, activo: boolean) => (
    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black', activo ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500')}>{n}</span>
  );
  const err = (k: keyof Errores) => errores[k];

  return (
    <section ref={raiz as any} data-prestamo className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      {/* What is on offer, in one look, and the button. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-black text-slate-900">Presta a {cfg.entidad}</h3>
          <p className="mt-1 text-[15px] text-slate-600">
            {cfg.intereses.map(i => (i === 0 ? '0 % (solidario)' : `${porcentaje(i)} anual`)).join(' o ')} · de {cfg.plazoMin} a {cfg.plazoMax} meses · desde {euros(cfg.importeMin)}
          </p>
          {/* Public on purpose (Eugenio, 2026-11-10): the money goes straight to the entity, so who and where is part of the offer. */}
          <dl className="mt-3 space-y-1 text-sm text-slate-700">
            <div className="flex flex-wrap items-center gap-x-2"><dt className="text-slate-500">Cuenta de {cfg.titularCuenta}:</dt>
              <dd className="flex items-center gap-1 font-mono font-semibold text-slate-900">{ibanBonito(cfg.iban)}
                <button type="button" onClick={copiarIban} className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1.5 font-sans text-xs font-bold text-slate-600 hover:bg-slate-100"><Copy className="h-3.5 w-3.5" /> {copiado ? 'Copiado' : 'Copiar'}</button>
              </dd></div>
            <div className="flex flex-wrap gap-x-2"><dt className="text-slate-500">Correo de {cfg.entidad}:</dt>
              <dd><a href={`mailto:${cfg.correoEntidad}`} className="font-semibold text-slate-900 underline">{cfg.correoEntidad}</a></dd></div>
          </dl>
        </div>
        {!desplegado && (
          <button type="button" onClick={() => { setDesplegado(true); inicio.current = Date.now(); }} className={cn(BOTON, 'bg-amber-300 text-slate-900 hover:bg-amber-400')}>
            <HandCoins className="h-5 w-5" /> Realizar préstamo
          </button>
        )}
      </div>

      {desplegado && (
        <div className="mt-6 space-y-5">
          <p className="text-sm text-slate-500">Tres pasos y unos cinco minutos. Ten a mano tu DNI y la app de tu banco.</p>
          {/* The trap: invisible to people, irresistible to scripts. */}
          <input type="text" name={CAMPO_TRAMPA} value={trampa} onChange={e => setTrampa(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

          {/* ── 1 ── */}
          <section className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            <h4 className="flex items-center gap-3 text-lg font-black text-slate-900">{numero(1, true)} Tus datos y tu préstamo</h4>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Campo id="pr-nombre" etiqueta="Nombre y apellidos" error={err('nombre')}><input id="pr-nombre" autoComplete="name" value={campos.nombre} onChange={poner('nombre')} aria-invalid={!!err('nombre')} className={CAMPO} /></Campo>
              <Campo id="pr-doc" etiqueta="DNI o NIE" error={err('documento')}><input id="pr-doc" value={campos.documento} onChange={poner('documento')} aria-invalid={!!err('documento')} className={CAMPO} /></Campo>
              <div className="sm:col-span-2"><Campo id="pr-dom" etiqueta="Domicilio" ayuda="Calle, número, código postal y localidad." error={err('domicilio')}><input id="pr-dom" autoComplete="street-address" value={campos.domicilio} onChange={poner('domicilio')} aria-invalid={!!err('domicilio')} className={CAMPO} /></Campo></div>
              <Campo id="pr-email" etiqueta="Correo" ayuda="Aquí te llegará la copia del contrato." error={err('email')}><input id="pr-email" type="email" autoComplete="email" value={campos.email} onChange={poner('email')} aria-invalid={!!err('email')} className={CAMPO} /></Campo>
              <Campo id="pr-tel" etiqueta="Teléfono" error={err('telefono')}><input id="pr-tel" type="tel" autoComplete="tel" value={campos.telefono} onChange={poner('telefono')} aria-invalid={!!err('telefono')} className={CAMPO} /></Campo>
              <Campo id="pr-imp" etiqueta="Cuánto prestas (€)" ayuda={`De ${euros(cfg.importeMin)} a ${euros(cfg.importeMax)}.`} error={err('importe')}><input id="pr-imp" inputMode="decimal" value={campos.importe} onChange={poner('importe')} aria-invalid={!!err('importe')} className={CAMPO} placeholder={String(cfg.importeMin)} /></Campo>
              <Campo id="pr-int" etiqueta="Interés" error={err('interes')}>
                <select id="pr-int" value={campos.interes} onChange={poner('interes')} className={CAMPO}>
                  {cfg.intereses.map(i => <option key={i} value={String(i)}>{i === 0 ? '0 % · solidario' : `${porcentaje(i)} anual`}</option>)}
                </select>
              </Campo>
              <Campo id="pr-plazo" etiqueta="Duración" error={err('plazo')}>
                <select id="pr-plazo" value={campos.plazo} onChange={poner('plazo')} className={CAMPO}>
                  {Array.from({ length: cfg.plazoMax - cfg.plazoMin + 1 }, (_, k) => cfg.plazoMin + k).map(m => <option key={m} value={String(m)}>{m} meses</option>)}
                </select>
              </Campo>
              <Campo id="pr-iban" etiqueta="Tu IBAN, para devolverte el dinero" ayuda="Una cuenta a tu nombre." error={err('ibanDevolucion')}><input id="pr-iban" value={campos.ibanDevolucion} onChange={poner('ibanDevolucion')} aria-invalid={!!err('ibanDevolucion')} className={CAMPO} placeholder="ES00 0000 0000 0000 0000 0000" /></Campo>
            </div>
            {p && p.interes > 0 && <p className="mt-3 text-sm text-slate-600">Con estos datos, {cfg.entidad} te devolvería {euros(p.importe)} más unos {euros(interesesBrutos(p))} de intereses brutos al vencimiento.</p>}
            {paso === 1 && <button type="button" onClick={seguir1} className={cn(LLENO, 'mt-4')}>Continuar</button>}
          </section>

          {/* ── 2 ── */}
          <section ref={s2} className={cn('scroll-mt-24 rounded-2xl border p-4 sm:p-5', paso >= 2 ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60')}>
            <h4 className="flex items-center gap-3 text-lg font-black text-slate-900">{numero(2, paso >= 2)} Condiciones y firma</h4>
            {paso >= 2 && (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-4 text-[15px] text-slate-800">
                  <strong>En resumen:</strong> prestas {p ? euros(p.importe) : '—'} a {cfg.entidad}{p ? (p.interes === 0 ? ', sin intereses' : ` al ${porcentaje(p.interes)} anual`) : ''}, durante {p ? `${p.plazo} meses` : '—'}. Transfieres tú directamente a {cfg.entidad}, que te devuelve el dinero en un único pago, como tarde al vencimiento. {m} supervisa el contrato y media si hay cualquier problema.
                </div>
                <Pliegue titulo="Leer el contrato completo">
                  <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                    {secciones.map(s => (
                      <div key={s.titulo}>
                        <p className="font-bold text-slate-900">{s.titulo}</p>
                        {s.parrafos.map((t, k) => <p key={k} className="mt-1">{t}</p>)}
                      </div>
                    ))}
                  </div>
                </Pliegue>
                <Pliegue titulo="Los riesgos de prestar"><ul className="list-disc space-y-1 pl-5">{RIESGOS.map(r => <li key={r}>{r}</li>)}</ul></Pliegue>
                <Pliegue titulo="Qué pasa con tus datos"><p>{textoDatos(cfg)}</p></Pliegue>
                <fieldset className="space-y-2 pt-1">
                  <legend className="sr-only">Lo que aceptas</legend>
                  {casillas.map(a => (
                    <label key={a.id} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-1 py-1.5 text-[15px] text-slate-800">
                      <input type="checkbox" checked={marcadas.has(a.id)} className="mt-1 h-5 w-5 shrink-0 accent-slate-900"
                        onChange={e => { setMarcadas(m => { const n = new Set(m); if (e.target.checked) n.add(a.id); else n.delete(a.id); return n; }); setErrores(x => ({ ...x, acepta: undefined })); }} />
                      {a.texto}
                    </label>
                  ))}
                  {err('acepta') && <p className="text-sm text-rose-700">{err('acepta')}</p>}
                </fieldset>
                <div>
                  <p className="mb-1 text-sm font-bold text-slate-800">Tu firma</p>
                  <Firma onCambio={f => { setFirma(f); setErrores(x => ({ ...x, firma: undefined })); }} />
                  {err('firma') && <p className="text-sm text-rose-700">{err('firma')}</p>}
                </div>
                {paso === 2 && <button type="button" onClick={seguir2} className={LLENO}>Continuar</button>}
              </div>
            )}
          </section>

          {/* ── 3 ── */}
          <section ref={s3} className={cn('scroll-mt-24 rounded-2xl border p-4 sm:p-5', paso >= 3 ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60')}>
            <h4 className="flex items-center gap-3 text-lg font-black text-slate-900">{numero(3, paso >= 3)} Transferencia y justificante</h4>
            {paso >= 3 && (
              <div className="mt-4 space-y-4">
                <p className="text-[15px] text-slate-700">Haz la transferencia desde tu banco con estos datos. El dinero va directamente a {cfg.entidad}: {m} no lo toca.</p>
                <dl className="grid gap-3 rounded-xl bg-amber-50 p-4 text-[15px] sm:grid-cols-2">
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-amber-900/70">Titular</dt><dd className="font-bold text-slate-900">{cfg.titularCuenta}</dd></div>
                  <div><dt className="text-xs font-bold uppercase tracking-wider text-amber-900/70">Importe</dt><dd className="font-bold text-slate-900">{p ? euros(p.importe) : '—'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wider text-amber-900/70">IBAN</dt>
                    <dd className="flex flex-wrap items-center gap-2 font-mono font-bold text-slate-900">{ibanBonito(cfg.iban)}
                      <button type="button" onClick={copiarIban}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-sans text-xs font-bold text-amber-900 hover:bg-amber-100"><Copy className="h-3.5 w-3.5" /> {copiado ? 'Copiado' : 'Copiar'}</button>
                    </dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wider text-amber-900/70">Concepto</dt><dd className="font-bold text-slate-900">{conceptoTransferencia(cfg, campos.nombre)}</dd></div>
                </dl>
                <Campo id="pr-just" etiqueta="Justificante de la transferencia" ayuda="El PDF o una captura que te da tu banco (PDF, JPG o PNG, hasta 8 MB)." error={err('justificante')}>
                  <span className={cn('flex min-h-11 items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-[15px]', archivo ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-slate-300 text-slate-600')}>
                    <FileUp className="h-4 w-4 shrink-0" /> {archivo ? archivo.name : 'Elegir archivo'}
                  </span>
                  <input id="pr-just" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only"
                    onChange={e => { setArchivo(e.target.files?.[0] || null); setErrores(x => ({ ...x, justificante: undefined })); }} />
                </Campo>
                {fallo && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{fallo}</p>}
                <button type="button" onClick={formalizar} disabled={enviando} className={cn(BOTON, 'w-full bg-amber-300 text-slate-900 hover:bg-amber-400 sm:w-auto')}>
                  {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} {enviando ? 'Formalizando…' : 'Formalizar préstamo'}
                </button>
                <p className="text-xs text-slate-500">Al pulsar, se guarda tu firma y se genera el contrato. Te llega una copia a tu correo, y otra a {cfg.entidad} ({cfg.correoEntidad}) y a {m}.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
