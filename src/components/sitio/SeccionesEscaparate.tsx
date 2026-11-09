import { Fragment, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  HandHeart, Building2, Newspaper, Briefcase, ArrowRight, Mail, Download, History, MapPin, FileText,
  Instagram, Youtube, Linkedin, Facebook, Twitter, Globe, Scale, ChevronDown, Landmark, Play,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { miniatura } from '../../utils/miniatura';
import { PortadaNoticia } from './TarjetaNoticia';
import FormularioColabora from './FormularioColabora';
import { EVENTO_ELEGIR_MOTIVO, enlaceCorreo } from './formularios';
import { enumerar } from './portadaEscaparate';
import { SolDeFondo } from './CabeceraPaginaEscaparate';
import {
  formasDe, enlaceDeForma, enlaceMotivo, documentosDe, pesoDe, rutaDelSitio, excluidasDe, formatoDe,
  type DatosSeccion, type SeccionEscaparate, type Red, type MedioNoticia,
} from './reglasPaginasEscaparate';

// ============================================================================
// LAS SECCIONES DE LAS PÁGINAS PROPIAS DEL ESCAPARATE (2026-11-07)
// ============================================================================
// Colabora, Sala de prensa y Quiénes somos (ver `reglasPaginasEscaparate.ts`). Cada
// sección es un componente que solo recibe sus datos: no pregunta nada, no usa el
// enrutador ni el `window` al pintarse. Por eso el servidor pinta EL MISMO dibujo
// dentro del HTML (`renderToStaticMarkup`, `server/paginasEscaparate.tsx`) y, al
// arrancar React, nada salta ni cambia: lo que lee un buscador es lo que ve quien
// visita. Los enlaces del propio sitio llevan `data-interno` (la página los abre sin
// recargar, `VistaPagina`).
//
// El aspecto, el de la portada del escaparate: tarjetas `rounded-2xl` con borde
// suave, rótulos en mayúsculas espaciadas, el ámbar del logo para los acentos y
// botones redondos en pizarra. Nada de terceros: las imágenes son de la propia web.

const ROTULO = 'text-[11px] font-black uppercase tracking-[0.18em] text-slate-500';
const BOTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold leading-tight transition-colors';
const LLENO = `${BOTON} bg-slate-900 text-white hover:bg-slate-700`;
const BORDE = `${BOTON} border border-slate-300 bg-white text-slate-900 hover:border-slate-900`;
const ENLACE = 'inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-emerald-800 underline decoration-emerald-700/30 decoration-2 underline-offset-4 hover:decoration-emerald-700';

/** Solo direcciones que no ejecutan nada: de la web, `https`, `mailto:` o un ancla. Los datos los calcula
 *  el servidor, pero el bloque se pinta también en el editor y nada de aquí se da por bueno sin mirar. */
const dir = (u: unknown): string => (typeof u === 'string' && /^(https?:\/\/|\/(?!\/)|mailto:|#)/i.test(u.trim()) ? u.trim() : '#');
/** Una imagen de la propia web (o, si acaso, `https`): nunca un `data:` ni otra cosa. */
const imagen = (u: unknown): string | null => (typeof u === 'string' && /^(\/uploads\/(?!privado\/)|https:\/\/)[^\s"<>]*$/i.test(u) ? u : null);
const LEGALES = new Set(['aviso-legal', 'privacidad', 'cookies']);
/** Un texto que quien edita pone en el bloque (`datos.titulo`, `datos.texto`), si lo puso. */
const propio = (v: unknown, n: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : null);
/** EL TÍTULO DE UNA PARTE DEL KIT DE PRENSA («Logotipo», «Fotos de los proyectos»), dentro de su sección
 *  (revisión del 2026-11-07): eran bloques sueltos y, con la sección vacía, el título se quedaba solo.
 *  `data-subtitulo`: la página le quita el margen de arriba cuando va justo debajo de un título. */
const SUBTITULO = 'mt-10 text-xl font-black tracking-tight text-slate-900 sm:mt-12';

const ICONO_RED: Record<string, typeof Instagram> = {
  instagram: Instagram, youtube: Youtube, linkedin: Linkedin, facebook: Facebook, x: Twitter, twitter: Twitter,
};

/** Los perfiles en redes: solo el icono (con su nombre para quien no ve) o el icono y el nombre. */
function Redes({ redes, conNombre, className }: { redes: Red[]; conNombre?: boolean; className?: string }) {
  if (!redes.length) return null;
  return (
    <ul className={cn('flex list-none flex-wrap gap-2 p-0', className)}>
      {redes.map(r => {
        const I = ICONO_RED[r.red.toLowerCase()] || Globe;
        return (
          <li key={r.url}>
            <a href={dir(r.url)} target="_blank" rel="noopener noreferrer me" title={r.red} aria-label={conNombre ? undefined : `${r.red} (se abre en otra pestaña)`}
              className={cn('inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:border-slate-900 hover:text-slate-900',
                conNombre ? 'px-4 text-sm font-bold' : 'w-11 justify-center')}>
              <I className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {conNombre && r.red}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Un correo que, si no cabe, se parte justo después de la @ (no a mitad de una palabra). */
function Correo({ email }: { email: string }) {
  const i = email.lastIndexOf('@');
  return i > 0 ? <>{email.slice(0, i + 1)}<wbr />{email.slice(i + 1)}</> : <>{email}</>;
}

// ── COLABORA ─────────────────────────────────────────────────────────────────

const ICONO_FORMA = { voluntariado: HandHeart, empresa: Building2, prensa: Newspaper, trabajo: Briefcase };

/** Una tarjeta elige su motivo en el formulario de la misma página, baja hasta él y deja allí el
 *  foco. Sin formulario en la página (o con la tecla de abrir en otra pestaña), el enlace hace lo
 *  suyo: lleva a `…?motivo=…#formulario` de la página de colaborar, que el formulario también entiende. */
function elegirEnFormulario(motivo: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const caja = document.querySelector<HTMLElement>('[data-ancla="formulario"]');
    if (!caja) return;
    e.preventDefault();
    // La dirección dice el motivo elegido (se puede compartir) y conserva lo demás: el proyecto
    // de `?proyecto=aeromovil` sigue elegido (revisión del 2026-11-07: se perdía).
    const u = new URL(window.location.href);
    u.searchParams.set('motivo', motivo);
    u.hash = 'formulario';
    window.history.replaceState(window.history.state, '', `${u.pathname}${u.search}${u.hash}`);
    window.dispatchEvent(new CustomEvent(EVENTO_ELEGIR_MOTIVO, { detail: { motivo } }));
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    caja.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
    // El foco, en la opción elegida: con el teclado se sigue desde ahí (nombre, correo…).
    window.setTimeout(() => caja.querySelector<HTMLInputElement>(`input[name="motivo"][value="${motivo}"]`)?.focus({ preventScroll: true }), 30);
  };
}

function Formas({ d, datos }: { d: DatosSeccion['formas'] | null | undefined; datos: any }) {
  // Al formulario de la página de colaborar del sitio (`sitio.colabora`): desde ella, el clic se
  // queda en la misma página (`elegirEnFormulario`); desde otra, lleva allí. Sin ella, a la misma.
  // Sin `data-interno`: `VistaPagina` coge esos enlaces al capturar el clic, ANTES que el de la
  // tarjeta, y navegaba a la misma página sin elegir el motivo (y perdía `?proyecto=`).
  const colabora = rutaDelSitio(d?.colabora);
  return (
    <>
    {/* El título de la lista para quien navega por títulos: sin él, de la cabecera (h1) se saltaba
        a las tarjetas (h3). */}
    <h2 className="sr-only">Formas de colaborar</h2>
    <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:gap-5">
      {formasDe(datos).map(f => {
        const I = ICONO_FORMA[f.motivo];
        const fuera = enlaceDeForma(datos, f);
        return (
          <li key={f.motivo} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            {/* En el móvil, el icono al lado del título; en pantalla ancha, encima. */}
            <div className="flex items-center gap-4 sm:block">
              <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200/70">
                <I className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h3 className="text-xl font-black tracking-tight text-slate-900 sm:mt-5">{f.titulo}</h3>
            </div>
            <p className="mt-2 text-base leading-relaxed text-slate-600">{f.texto}</p>
            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-6">
              {fuera && f.enlace && (
                <a href={fuera} data-interno="" className={LLENO}>{f.enlace.texto} <ArrowRight className="h-4 w-4" aria-hidden /></a>
              )}
              <a href={`${colabora || ''}${enlaceMotivo(f.motivo)}`} onClick={elegirEnFormulario(f.motivo)} className={fuera ? ENLACE : LLENO}>
                {f.accion}{!fuera && <ArrowRight className="h-4 w-4" aria-hidden />}
              </a>
            </div>
          </li>
        );
      })}
    </ul>
    </>
  );
}

/** El formulario «Quiero colaborar» y, al lado, el correo y las redes. En el servidor, el hueco del
 *  formulario con su alto (el formulario es solo de navegador, ver `FormularioColabora`). El alto,
 *  medido con el formulario de verdad (revisión del 2026-11-07; antes era menor y lo de debajo
 *  saltaba al arrancar): 1.217 px a 360, 1.165 a 390, 925 a 640, 886 a 768, 906 a 1.024 y 834 a 1.280. */
function Formulario({ d, raiz, servidor }: { d: DatosSeccion['formulario']; raiz: string | null; servidor?: boolean }) {
  // Quien llega a `…#formulario` desde otra página del sitio (sin recargar) baja hasta aquí.
  useEffect(() => {
    if (window.location.hash !== '#formulario') return;
    const t = window.setTimeout(() => document.querySelector('[data-ancla="formulario"]')?.scrollIntoView({ block: 'start' }), 60);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div id="formulario" data-ancla="formulario" className="grid scroll-mt-36 gap-10 sm:scroll-mt-24 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-12">
      <div className="min-w-0">
        {servidor || !raiz
          ? <div aria-hidden className="min-h-[73rem] rounded-3xl border border-slate-200 bg-white shadow-sm sm:min-h-[57rem] lg:min-h-[56rem] xl:min-h-[52rem]" />
          : <FormularioColabora raizId={raiz} titulo={null} className="mx-0 max-w-none" />}
      </div>
      <aside aria-label="Otras formas de escribirnos" className="space-y-7 lg:pt-1">
        {d.email && (
          <div>
            <p className={ROTULO}>¿Prefieres el correo?</p>
            <a href={enlaceCorreo(d.email)} className="mt-2 inline-flex items-start gap-2 text-base font-bold leading-snug text-slate-900 underline-offset-4 hover:underline">
              <Mail className="mt-1 h-4 w-4 shrink-0 text-amber-700" aria-hidden /><span className="min-w-0"><Correo email={d.email} /></span>
            </a>
          </div>
        )}
        {d.redes.length > 0 && (
          <div>
            <p className={ROTULO}>Síguenos</p>
            <Redes redes={d.redes} className="mt-3" />
          </div>
        )}
      </aside>
    </div>
  );
}

// ── SALA DE PRENSA ───────────────────────────────────────────────────────────

function Contacto({ d }: { d: DatosSeccion['contacto'] }) {
  if (!d.email) return null;
  const correo = enlaceCorreo(d.email, 'Prensa');
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-slate-900 px-6 py-7 text-white sm:px-10 sm:py-9">
      <SolDeFondo className="-right-36 -top-36 h-[420px] w-[420px] text-amber-400/15 sm:-right-20" />
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300 sm:text-xs">Contacto de prensa</p>
      <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <a href={correo} className="block text-2xl font-black leading-tight tracking-tight underline-offset-4 hover:underline sm:text-[2rem]"><Correo email={d.email} /></a>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-white/80">Para entrevistas, datos o imágenes de los proyectos, escríbenos.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5">
          <a href={correo} className={cn(BOTON, 'bg-amber-400 text-slate-900 hover:bg-amber-300')}><Mail className="h-4 w-4" aria-hidden /> Escribir un correo</a>
          {rutaDelSitio(d.colabora) && (
            <a href={`${rutaDelSitio(d.colabora)}${enlaceMotivo('prensa')}`} data-interno="" className={cn(BOTON, 'border border-white/30 text-white hover:border-white')}>Usar el formulario</a>
          )}
        </div>
      </div>
    </div>
  );
}

function Cifras({ d }: { d: DatosSeccion['cifras'] }) {
  if (!d.cifras.length) return null;
  return (
    <div>
      {/* Cada cifra: lo que cuenta (`dt`) y el número (`dd`); se ve el número arriba. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-6">
        {d.cifras.map((c, i) => (
          <div key={c.texto} className={cn('flex flex-col-reverse justify-end gap-1.5 border-l-2 border-amber-400 pl-3 sm:pl-4', i === 0 && d.cifras.length % 2 === 1 && 'col-span-2 sm:col-span-1')}>
            <dt className="text-sm font-bold leading-tight text-slate-600">{c.texto}</dt>
            <dd className="text-[2.1rem] font-black leading-none tracking-tight tabular-nums text-slate-900 sm:text-[2.6rem]">{c.valor}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-[13px] leading-snug text-slate-500">Se actualizan solas con cada proyecto y cada noticia que se publican en esta web.</p>
    </div>
  );
}

const NOTAS_DE_ENTRADA = 8;

function Notas({ d }: { d: DatosSeccion['notas'] }) {
  const [todas, setTodas] = useState(false);
  // Al abrir las demás, el foco va a la primera nueva (revisión del 2026-11-07): el botón desaparece
  // y el foco se quedaba en la página, así que el siguiente Tab saltaba las notas recién abiertas.
  const primeraNueva = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (todas) primeraNueva.current?.focus(); }, [todas]);
  if (!d.notas.length) return null;
  return (
    <div>
      <ol className="list-none border-b border-slate-200 p-0">
        {d.notas.map((n, i) => !todas && i >= NOTAS_DE_ENTRADA ? (
          // Las de después, hasta «Ver las…», como un enlace suelto y escondido (ver «En los medios»).
          <li key={n.pagina} className="hidden"><a href={dir(n.url)} data-interno="">{n.titular || n.titulo}</a></li>
        ) : (
          <li key={n.pagina} className="group relative flex items-start gap-4 border-t border-slate-200 py-5 sm:gap-6 sm:py-6">
            <div className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-40 lg:w-48">
              {imagen(n.portada)
                ? <img src={miniatura(imagen(n.portada), 200)} alt="" loading="lazy" decoding="async" width={192} height={144}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                : <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-300" />}
            </div>
            <div className="min-w-0 flex-1 sm:self-center">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-bold leading-snug text-slate-500">
                <span className="text-amber-800">{n.titulo}</span>
                {n.ano && <span className="tabular-nums">{n.ano}</span>}
                {n.estado && (
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: n.color || '#94a3b8' }} />{n.estado}
                  </span>
                )}
              </p>
              <h3 className="mt-1.5 text-[1.05rem] font-black leading-snug tracking-tight text-slate-900 sm:text-xl">
                <a href={dir(n.url)} data-interno="" ref={i === NOTAS_DE_ENTRADA ? primeraNueva : undefined}
                  className="decoration-2 underline-offset-4 after:absolute after:inset-0 group-hover:underline">{n.titular || n.titulo}</a>
              </h3>
              {n.entradilla && <p className="mt-1.5 hidden text-[15px] leading-snug text-slate-600 sm:block"><span className="line-clamp-2">{n.entradilla}</span></p>}
            </div>
          </li>
        ))}
      </ol>
      {d.notas.length > NOTAS_DE_ENTRADA && !todas && (
        <div className="mt-6">
          <button type="button" onClick={() => setTodas(true)} className={BORDE}>
            Ver las {d.notas.length} notas <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/** «YouTube · Canal» → «YouTube»: el medio, corto (como en `TarjetaNoticia`). */
const medioCorto = (m: string) => m.split(' · ')[0].trim();

/** Una aparición en los medios. En pantalla ancha, la tarjeta de siempre: la portada con el logo y
 *  el nombre del medio (`PortadaNoticia`), el titular y los proyectos de los que habla. En el móvil,
 *  una fila: la portada pequeña a la izquierda y el medio, la fecha y el titular al lado (con
 *  tarjetas enteras, «En los medios» medía 25.000 px de alto en un teléfono). */
function TarjetaMedio({ n: original, enfocar }: { n: MedioNoticia; enfocar?: boolean }) {
  const enlace = useRef<HTMLAnchorElement>(null);
  useEffect(() => { if (enfocar) enlace.current?.focus(); }, [enfocar]);
  const n = { ...original, url: dir(original.url), imagen: imagen(original.imagen), logo: imagen(original.logo) };
  const mini = n.imagen ? miniatura(n.imagen, 120) : null;
  return (
    <article className="group relative flex h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:flex-col">
      <div aria-hidden className="relative min-h-[6.5rem] w-28 shrink-0 overflow-hidden bg-slate-100 sm:hidden">
        {mini
          ? <img src={mini} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          : n.logo
            ? <span className="absolute inset-0 grid place-items-center bg-white"><img src={n.logo} alt="" loading="lazy" className="h-12 w-12 object-contain" /></span>
            : <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-200 to-slate-300 text-2xl font-black text-slate-600">{medioCorto(n.medio).charAt(0).toUpperCase()}</span>}
        {n.video && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-900 shadow-md"><Play className="ml-0.5 h-4 w-4 fill-current" /></span>
          </span>
        )}
      </div>
      <div className="hidden sm:block"><PortadaNoticia n={n} /></div>
      <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-4">
        <p className="flex min-w-0 items-center gap-1.5 text-[12px] font-bold leading-tight text-slate-500 sm:hidden">
          {n.logo && <img src={n.logo} alt="" loading="lazy" className="h-4 w-4 shrink-0 rounded-sm object-contain" />}
          <span className="truncate">{medioCorto(n.medio)}{n.fechaTexto ? ` · ${n.fechaTexto}` : ''}</span>
        </p>
        <h4 className="mt-1 line-clamp-3 text-[15px] font-bold leading-snug text-slate-900 group-hover:underline sm:mt-0">
          <a ref={enlace} href={n.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0">
            {n.titulo}<span className="sr-only"> ({n.medio}; se abre en otra pestaña)</span>
          </a>
        </h4>
        {n.proyectos.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-2.5 sm:pt-3">
            {n.proyectos.slice(0, 3).map((p, i) => (
              <a key={p.url} href={dir(p.url)} data-interno=""
                className={cn('relative z-10 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-900 hover:text-white', i > 0 && 'hidden sm:inline-block')}>
                {p.titulo}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

const MEDIOS_POR_ANO = 6;

function Medios({ d }: { d: DatosSeccion['medios'] }) {
  const [abiertos, setAbiertos] = useState<string[]>([]);
  // El año que se acaba de abrir: el foco va a su primera tarjeta nueva (como en las notas).
  const [recien, setRecien] = useState<string | null>(null);
  if (!d.noticias.length) return null;
  // Por años, del más reciente al más antiguo; las que no dicen su fecha, al final.
  const grupos = new Map<string, MedioNoticia[]>();
  for (const n of d.noticias) {
    const a = n.fecha?.slice(0, 4) || 'sin-fecha';
    grupos.set(a, [...(grupos.get(a) || []), n]);
  }
  const claves = [...grupos.keys()].sort((a, b) => (a === 'sin-fecha' ? 1 : b === 'sin-fecha' ? -1 : b.localeCompare(a)));
  const anos = claves.filter(a => a !== 'sin-fecha');
  const nombre = (a: string) => (a === 'sin-fecha' ? 'Sin fecha' : a);
  return (
    <div>
      <p className="text-[13px] font-bold text-slate-500">
        {d.noticias.length} noticias y vídeos · {d.medios} medios{anos.length > 1 ? ` · ${anos[anos.length - 1]}–${anos[0]}` : ''}
      </p>
      <nav aria-label="Años" className="mt-4">
        <ul className="flex list-none flex-wrap gap-2 p-0">
          {claves.map(a => (
            <li key={a}>
              <a href={`#medios-${a}`} className="inline-flex h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition-colors hover:border-slate-900">
                {nombre(a)} <span className="text-xs font-semibold text-slate-500">{grupos.get(a)!.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      {claves.map(a => {
        const items = grupos.get(a)!;
        const abierto = abiertos.includes(a);
        return (
          <section key={a} id={`medios-${a}`} aria-labelledby={`medios-${a}-titulo`} className="scroll-mt-36 pt-10 sm:scroll-mt-24">
            <h3 id={`medios-${a}-titulo`} className="flex items-baseline gap-3 border-b border-slate-200 pb-3 text-2xl font-black tracking-tight text-slate-900">
              {nombre(a)} <span className="text-sm font-bold tracking-normal text-slate-500">{items.length === 1 ? '1 publicación' : `${items.length} publicaciones`}</span>
            </h3>
            <ul className="mt-5 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {/* Las que no se ven hasta «Ver las…» van como un enlace suelto (escondido): están en el HTML
                  para quien lo lee sin mirar, pero sin cargar 170 tarjetas con su portada. */}
              {items.map((n, i) => !abierto && i >= MEDIOS_POR_ANO
                ? <li key={n.url} className="hidden"><a href={dir(n.url)}>{n.titulo} ({n.medio})</a></li>
                : <li key={n.url}><TarjetaMedio n={n} enfocar={recien === a && i === MEDIOS_POR_ANO} /></li>)}
            </ul>
            {items.length > MEDIOS_POR_ANO && !abierto && (
              <button type="button" onClick={() => { setAbiertos(x => [...x, a]); setRecien(a); }} className={cn(BORDE, 'mt-5')}>
                {a === 'sin-fecha' ? `Ver las ${items.length} sin fecha` : `Ver las ${items.length} de ${a}`} <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Marca({ d, datos }: { d: DatosSeccion['marca']; datos: any }) {
  if (!d.logos.length) return null;
  return (
    <div>
    <h3 data-subtitulo="" className={SUBTITULO}>{propio(datos?.titulo, 80) || 'Logotipo'}</h3>
    <div className="mt-4 grid gap-5 lg:grid-cols-2">
      <ul className="grid list-none gap-4 p-0">
        {d.logos.map(l => (
          <li key={l.url} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-2">
              <div className="grid aspect-[4/3] place-items-center bg-white p-6">
                <img src={imagen(l.url) || ''} alt={`Logotipo de ${d.marca} sobre fondo claro`} width={96} height={96} loading="lazy" className="h-24 w-24 object-contain" />
              </div>
              <div className="grid aspect-[4/3] place-items-center bg-slate-900 p-6">
                <img src={imagen(l.url) || ''} alt={`Logotipo de ${d.marca} sobre fondo oscuro`} width={96} height={96} loading="lazy" className="h-24 w-24 object-contain" />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
              <p className="min-w-0 leading-snug">
                <span className="block text-base font-black text-slate-900">{l.formato}</span>
                <span className="block text-[13px] font-semibold text-slate-500">
                  {[l.ancho && l.alto ? `${l.ancho} × ${l.alto} px` : null, pesoDe(l.bytes)].filter(Boolean).join(' · ')}
                </span>
              </p>
              <a href={dir(l.url)} download={l.descarga} className={BORDE}><Download className="h-4 w-4" aria-hidden /> Descargar<span className="sr-only"> el logotipo ({l.formato})</span></a>
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl bg-slate-50 p-6 text-base leading-relaxed text-slate-600 ring-1 ring-inset ring-slate-100 sm:p-7">
        <p className="font-black text-slate-900">Cómo usarlo</p>
        <p className="mt-2">Úsalo para hablar de {d.organizacion} y de sus proyectos, sin deformarlo ni cambiar sus colores.</p>
        {d.email && (
          <p className="mt-3">
            ¿Lo necesitas en otro formato o más grande? Escríbenos a{' '}
            <a href={enlaceCorreo(d.email, 'Logotipo')} className="font-bold text-emerald-800 underline decoration-2 underline-offset-2"><Correo email={d.email} /></a>.
          </p>
        )}
      </div>
    </div>
    </div>
  );
}

function Fotos({ d, datos }: { d: DatosSeccion['fotos']; datos: any }) {
  // Las que quitó quien edita (`datos.excluir`). En la página ya llegan quitadas (el servidor pone otra
  // en su lugar); esto es para la vista previa del editor, que pide la sección sin el bloque.
  const fuera = excluidasDe(datos);
  const fotos = d.fotos.filter(f => !fuera.has(f.url));
  if (!fotos.length) return null;
  const quien = d.organizacion || 'la organización';
  return (
    <div>
      <h3 data-subtitulo="" className={SUBTITULO}>{propio(datos?.titulo, 80) || 'Fotos de los proyectos'}</h3>
      <p className="mt-1.5 max-w-3xl text-[15px] leading-relaxed text-slate-700">
        {propio(datos?.texto, 400) || `Una selección de fotos de los proyectos, con crédito de ${quien}.`}
      </p>
      <ul className="mt-5 grid list-none grid-cols-2 gap-x-4 gap-y-7 p-0 sm:grid-cols-3 lg:grid-cols-4">
        {fotos.map(f => (
          <li key={f.url} className="min-w-0">
            <figure>
              <div className="overflow-hidden rounded-xl bg-slate-100">
                <img src={miniatura(imagen(f.url), 320)} alt={f.alt} loading="lazy" decoding="async" width={400} height={300} className="aspect-[4/3] w-full object-cover" />
              </div>
              <figcaption className="mt-2.5 text-[13px] leading-snug">
                <span className="block font-bold text-slate-900">{f.etiqueta}: {f.credito}</span>
                <a href={dir(f.proyecto.url)} data-interno="" className="block text-slate-600 underline-offset-2 hover:underline">{f.proyecto.titulo}</a>
                {/* En el enlace, solo «Descargar»; el formato y la medida, en su línea (a 390 px se partían al lado). */}
                <a href={dir(f.url)} download={f.descarga} className="mt-1 inline-flex min-h-9 items-center gap-1.5 font-bold text-emerald-800 hover:underline">
                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden /> Descargar<span className="sr-only">: {f.alt}</span>
                </a>
                <span className="block text-[12px] font-semibold text-slate-500">
                  {[formatoDe(f.url), f.ancho && f.alto ? `${f.ancho} × ${f.alto} px` : null].filter(Boolean).join(' · ')}
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] leading-snug text-slate-500">Cada foto lleva su crédito: cítalo si la publicas.</p>
    </div>
  );
}

// ── QUIÉNES SOMOS ────────────────────────────────────────────────────────────

function Organizacion({ d }: { d: DatosSeccion['organizacion'] }) {
  const filas: Array<[string, ReactNode]> = [];
  if (d.nombreLegal) filas.push(['Nombre legal', d.nombreLegal]);
  // Cada nombre entero: a 390 px «Luz de / Humanidad» se partía por la mitad.
  if (d.nombres.length) filas.push(['También nos conocen como', <>{d.nombres.map((n, i) => (
    <Fragment key={n}>{i > 0 && ' '}<span className="whitespace-nowrap">{n}{i < d.nombres.length - 1 ? ' ·' : ''}</span></Fragment>
  ))}</>]);
  if (d.fundador) filas.push(['Fundador', d.fundador.url
    ? <a href={dir(d.fundador.url)} data-interno="" className="underline decoration-slate-300 decoration-2 underline-offset-4 hover:decoration-slate-900">{d.fundador.nombre}</a>
    : d.fundador.nombre]);
  if (d.sede) filas.push(['Sede', d.sede]);
  if (!filas.length && !d.redes.length) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
      <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
        {filas.map(([t, v]) => (
          <div key={t} className="min-w-0">
            <dt className={ROTULO}>{t}</dt>
            <dd className="mt-1 text-base font-bold leading-snug text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      {d.redes.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-5">
          <p className={ROTULO}>En las redes</p>
          <Redes redes={d.redes} conNombre className="mt-3" />
        </div>
      )}
    </div>
  );
}

function Areas({ d }: { d: DatosSeccion['areas'] }) {
  if (!d.areas.length) return null;
  return (
    // De dos en dos: con tres por fila, diez áreas dejaban una sola en la última. Si son impares,
    // la última va a lo ancho.
    <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
      {d.areas.map(a => (
        <li key={a.nombre} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 sm:[&:last-child:nth-child(odd)]:col-span-2">
          <div className="flex items-center gap-4">
            {imagen(a.imagen)
              ? <img src={imagen(a.imagen)!} alt="" width={80} height={56} loading="lazy" className="h-14 w-20 shrink-0 object-contain" />
              : <span aria-hidden className="h-14 w-20 shrink-0 rounded-xl bg-amber-50" />}
            <div className="min-w-0">
              <h3 className="text-lg font-black leading-tight tracking-tight text-slate-900">{a.nombre}</h3>
              <p className="mt-0.5 text-[13px] font-bold text-slate-500">{a.proyectos.length === 1 ? '1 proyecto' : `${a.proyectos.length} proyectos`}</p>
            </div>
          </div>
          {a.descripcion && <p className="mt-4 text-[15px] leading-snug text-slate-600">{a.descripcion}</p>}
          <ul className="mt-4 flex list-none flex-wrap gap-1.5 p-0">
            {a.proyectos.map(p => (
              <li key={p.url}>
                <a href={dir(p.url)} data-interno="" className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-700 transition-colors hover:bg-slate-900 hover:text-white">{p.titulo}</a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function Equipo({ d }: { d: DatosSeccion['equipo'] }) {
  if (!d.personas.length) return null;
  return (
    // Centrado, como un mural: la última fila (la que no se llena) queda en medio y no colgando a un lado.
    <ul className="flex list-none flex-wrap justify-center gap-x-4 gap-y-8 p-0">
      {d.personas.map(p => (
        <li key={p.pagina} className="w-[calc((100%-2rem)/3)] min-w-0 sm:w-40 lg:w-[11.5rem]">
          <a href={dir(p.url)} data-interno="" className="group flex flex-col items-center text-center">
            {imagen(p.foto)
              ? <img src={miniatura(imagen(p.foto), 112)} alt="" width={96} height={96} loading="lazy" decoding="async"
                  className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200 transition-shadow group-hover:ring-4 group-hover:ring-amber-300 sm:h-24 sm:w-24" />
              : <span aria-hidden className="grid h-20 w-20 place-items-center rounded-full bg-slate-100 text-2xl font-black text-slate-500 sm:h-24 sm:w-24">{p.titulo.slice(0, 1)}</span>}
            <span className="mt-2.5 text-[14px] font-bold leading-tight text-slate-900 group-hover:underline sm:mt-3 sm:text-[15px]">{p.titulo}</span>
            {p.cargo && <span className="mt-1 line-clamp-3 text-[12px] leading-snug text-slate-500 sm:text-[13px]">{p.cargo}</span>}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Portada({ d }: { d: DatosSeccion['portada'] }) {
  const tarjetas: Array<{ href: string; Icono: typeof History; rotulo: string; titulo: string; texto: string; accion: string }> = [];
  if (d.primerAno) tarjetas.push({
    href: '/#historia', Icono: History, rotulo: 'Nuestra historia', titulo: `Desde ${d.primerAno}`,
    texto: `Los ${d.proyectos} proyectos del laboratorio, año a año.`, accion: 'Ver la historia',
  });
  if (d.paises.length) tarjetas.push({
    href: '/#mapa', Icono: MapPin, rotulo: 'Dónde trabajamos', titulo: d.paises.length === 1 ? `En ${d.paises[0]}` : `En ${d.paises.length} países`,
    texto: enumerar(d.paises), accion: 'Ver el mapa',
  });
  if (!tarjetas.length) return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tarjetas.map(t => (
        <a key={t.href} href={t.href} data-interno=""
          className="group relative isolate flex flex-col overflow-hidden rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7">
          <SolDeFondo className="-right-24 -top-24 h-64 w-64 text-amber-300/25" />
          <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800"><t.Icono className="h-3.5 w-3.5" aria-hidden /> {t.rotulo}</p>
          <p className="mt-3 text-[1.75rem] font-black leading-none tracking-tight text-slate-900 sm:text-[2rem]">{t.titulo}</p>
          <p className="mt-2 text-[15px] leading-snug text-slate-600">{t.texto}</p>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-slate-900 group-hover:underline">{t.accion} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
        </a>
      ))}
    </div>
  );
}

function Transparencia({ d, datos }: { d: DatosSeccion['transparencia']; datos: any }) {
  const documentos = documentosDe(datos);
  const filas: Array<[string, ReactNode, boolean?]> = [];
  if (d.nombre) filas.push(['Titular', d.nombre]);
  if (d.nif) filas.push(['NIF', d.nif]);
  if (d.domicilio) filas.push(['Domicilio', d.domicilio, true]);
  if (d.registro) filas.push(['Datos registrales', d.registro, true]);
  if (d.email) filas.push(['Correo', <a href={enlaceCorreo(d.email)} className="underline decoration-slate-300 decoration-2 underline-offset-4 hover:decoration-slate-900"><Correo email={d.email} /></a>, true]);
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {filas.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="flex items-center gap-2 text-base font-black text-slate-900"><Landmark className="h-5 w-5 text-amber-700" aria-hidden /> Datos de la entidad</p>
          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {filas.map(([t, v, ancha]) => (
              <div key={t} className={cn('min-w-0', ancha && 'sm:col-span-2')}>
                <dt className={ROTULO}>{t}</dt>
                <dd className="mt-1 text-base font-bold leading-snug text-slate-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <div className="space-y-5">
        {d.legales.length > 0 && (
          <div className="rounded-3xl bg-slate-50 p-6 ring-1 ring-inset ring-slate-100 sm:p-8">
            <p className="flex items-center gap-2 text-base font-black text-slate-900"><Scale className="h-5 w-5 text-amber-700" aria-hidden /> Textos legales</p>
            <ul className="mt-3 list-none p-0">
              {d.legales.filter(l => LEGALES.has(l.id)).map(l => (
                <li key={l.id}>
                  <a href={`#${l.id}`} className="inline-flex min-h-11 items-center gap-2 text-base font-bold text-emerald-800 underline decoration-emerald-700/30 decoration-2 underline-offset-4 hover:decoration-emerald-700">
                    <FileText className="h-4 w-4 shrink-0" aria-hidden /> {l.nombre}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Solo los documentos que existen de verdad (`datos.documentos`): nunca un hueco «próximamente». */}
        {documentos.length > 0 && (
          <div className="rounded-3xl bg-slate-50 p-6 ring-1 ring-inset ring-slate-100 sm:p-8">
            <p className="flex items-center gap-2 text-base font-black text-slate-900"><FileText className="h-5 w-5 text-amber-700" aria-hidden /> Documentos</p>
            <ul className="mt-3 list-none p-0">
              {documentos.map(x => (
                <li key={x.url}>
                  <a href={x.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-base font-bold text-emerald-800 underline decoration-emerald-700/30 decoration-2 underline-offset-4 hover:decoration-emerald-700">
                    <Download className="h-4 w-4 shrink-0" aria-hidden /> {x.titulo}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/** El cierre de una página: invitar a colaborar, con el botón a la página de colaborar del sitio.
 *  El título y el texto se pueden cambiar en el bloque (`datos.titulo`, `datos.texto`). */
function Llamada({ d, datos }: { d: DatosSeccion['llamada']; datos: any }) {
  const colabora = rutaDelSitio(d.colabora);
  if (!colabora) return null;
  const titulo = typeof datos?.titulo === 'string' && datos.titulo.trim() ? datos.titulo.trim() : '¿Quieres sumarte?';
  const texto = typeof datos?.texto === 'string' && datos.texto.trim() ? datos.texto.trim()
    : 'Con tu tiempo, con una donación, desde tu empresa o desde un medio: cuéntanos cómo te gustaría colaborar con el laboratorio.';
  return (
    <div className="relative isolate mt-6 overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-white px-6 py-8 sm:mt-10 sm:px-10 sm:py-10">
      <SolDeFondo className="-right-28 -top-32 h-80 w-80 text-amber-300/30" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="min-w-0">
          <p className="text-2xl font-black tracking-tight text-slate-900 sm:text-[2rem]">{titulo}</p>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">{texto}</p>
        </div>
        <a href={colabora} data-interno="" className={cn(LLENO, 'shrink-0 self-start lg:self-auto')}>
          Colabora con nosotros <ArrowRight className="h-4 w-4" aria-hidden />
        </a>
      </div>
    </div>
  );
}

// ── LA SECCIÓN QUE TOCA ──────────────────────────────────────────────────────

/** Pinta una sección con sus datos (`d`, los de `DatosSeccion[seccion]`). `datos` es el del bloque
 *  (los textos propios de las tarjetas, los documentos…); `raiz`, la página raíz del sitio. */
export default function SeccionEscaparateVista({ seccion, datos, d, raiz, servidor }: {
  seccion: SeccionEscaparate; datos: any; d: any; raiz: string | null; servidor?: boolean;
}) {
  const cuerpo = (() => {
    switch (seccion) {
      case 'formas': return <Formas d={d} datos={datos} />;
      case 'formulario': return <Formulario d={d} raiz={raiz} servidor={servidor} />;
      case 'contacto': return <Contacto d={d} />;
      case 'cifras': return <Cifras d={d} />;
      case 'notas': return <Notas d={d} />;
      case 'medios': return <Medios d={d} />;
      case 'marca': return <Marca d={d} datos={datos} />;
      case 'fotos': return <Fotos d={d} datos={datos} />;
      case 'organizacion': return <Organizacion d={d} />;
      case 'areas': return <Areas d={d} />;
      case 'equipo': return <Equipo d={d} />;
      case 'portada': return <Portada d={d} />;
      case 'transparencia': return <Transparencia d={d} datos={datos} />;
      case 'llamada': return <Llamada d={d} datos={datos} />;
      default: return null;
    }
  })();
  return cuerpo ? <div data-seccion-escaparate={seccion} className="pb-2 pt-3 sm:pt-4">{cuerpo}</div> : null;
}
