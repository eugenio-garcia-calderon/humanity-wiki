// ============================================================================
// MODELO SOCIOECONÓMICO OPTIMIZADO (2026-11-10, Eugenio)
// ============================================================================
// One tax on every payment, nothing else, in three tiers (10, 25 or 40 %: by
// what is bought, and for wages by the size of the company that pays them),
// collected by the payment system itself and split in eight equal parts among
// eight scales: person, neighbourhood or family, municipality, province, region,
// nation, continent and planet. Each scale splits its part in thirds (produce,
// care, free); help goes from a larger scale to a smaller one as loans at the CPI
// and one-off donations. Each scale has a citizens' assembly that chooses
// priorities and a technical committee that carries them out.
//
// WINDOWS, NOT ONE LONG PAGE (2026-11-12, Eugenio): a menu of windows —
// Impuestos, Pensiones, Presupuestos, and room for Educación and Sanidad. The
// chosen one stays lit and the others dim; below it, its own page with its own
// submenu. Simple first, detail behind «Más» (`ventanas.tsx`). Without a window
// in the address, a cover with one card per window. Every number comes from
// `src/data/`.
//
// TWO HOMES, ONE COMPONENT, like the consciousness map: humanity.wiki/modelo-
// socioeconomico (App.tsx) and a project page of luzhumanidad.com whose
// `config.aplicacion` is 'modelo-socioeconomico' (SubpaginaSitio.tsx, migration
// 0184). `enSitio` is set in the second case.
//
// PÁGINA PROPIA: outside the platform Layout, like /conciencia.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Maximize2, MessageSquarePlus, Minimize2 } from 'lucide-react';
import { useIntegracion } from '../components/sitio/AplicacionIncrustada';
import '@fontsource-variable/public-sans';
import { TRAMOS_PENSION } from '../data/presupuestos';
import { SMI_MES } from '../data/pensionesPropuesta';
import { ImpuestosVentana } from '../components/modeloSocioeconomico/ImpuestosVentana';
import { PensionesVentana } from '../components/modeloSocioeconomico/PensionesVentana';
import { Presupuestos } from '../components/modeloSocioeconomico/Presupuestos';
import { BuzonProyecto } from '../components/modeloSocioeconomico/BuzonProyecto';
import { Boton, Libre } from '../components/modeloSocioeconomico/piezas';
import { VENTANAS, ALIAS, ventanaDeAncla, Apartado, type VentanaId } from '../components/modeloSocioeconomico/ventanas';
import { cn } from '../utils/cn';

// Each window's accent: its tab when lit, its cover card. Classes, not colours.
const ACENTO: Record<string, { tab: string; borde: string; texto: string }> = {
  impuestos: { tab: 'bg-amber-500 text-slate-950', borde: 'border-amber-400', texto: 'text-amber-600' },
  pensiones: { tab: 'bg-teal-600 text-white', borde: 'border-teal-500', texto: 'text-teal-700' },
  presupuestos: { tab: 'bg-indigo-600 text-white', borde: 'border-indigo-500', texto: 'text-indigo-600' },
  educacion: { tab: '', borde: 'border-slate-200', texto: 'text-slate-400' },
  sanidad: { tab: '', borde: 'border-slate-200', texto: 'text-slate-400' },
};

const anclaActual = () => decodeURIComponent(window.location.hash.replace(/^#/, ''));

export default function ModeloSocioeconomico({ enSitio }: { enSitio?: { inicio: string } } = {}) {
  const [ancla, setAncla] = useState(() => (typeof window === 'undefined' ? '' : anclaActual()));
  const [verBuzon, setVerBuzon] = useState(false);
  const ventana = ventanaDeAncla(ancla);
  const actual = VENTANAS.find(v => v.id === ventana) || null;
  const integracion = useIntegracion();
  const cabecera = useRef<HTMLElement>(null);
  const [altoCabecera, setAltoCabecera] = useState(0);
  const [visible, setVisible] = useState<string | null>(null);
  const tiraVentanas = useRef<HTMLUListElement>(null);
  const tiraApartados = useRef<HTMLUListElement>(null);

  // Keep the lit window and the lit section in view inside their scrolling rows (phones).
  useEffect(() => {
    for (const tira of [tiraVentanas.current, tiraApartados.current]) {
      const el = tira?.querySelector<HTMLElement>('[aria-current]');
      if (tira && el) tira.scrollTo({ left: el.offsetLeft - tira.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    }
  }, [ventana, visible]);

  useEffect(() => {
    const titulo = document.title;
    document.title = 'Modelo socioeconómico optimizado · Impuestos, pensiones y presupuestos · Luz & Humanidad';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const anterior = meta?.content;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Un único impuesto en tres tramos (10, 25 y 40 %) repartido entre ocho escalas, una pensión única igual al salario mínimo y los presupuestos de cada escala, comparados con el sistema español de hoy.';
    return () => { document.title = titulo; if (meta) meta.content = anterior ?? ''; };
  }, []);

  // The window and the section live in the address (#pensiones-fondo).
  useEffect(() => {
    const cambio = () => setAncla(anclaActual());
    window.addEventListener('hashchange', cambio);
    return () => window.removeEventListener('hashchange', cambio);
  }, []);

  // How tall our own header is, so a section lands right below it.
  useLayoutEffect(() => {
    const el = cabecera.current; if (!el) return;
    const medir = () => setAltoCabecera(Math.round(el.getBoundingClientRect().height));
    medir();
    const o = new ResizeObserver(medir); o.observe(el);
    return () => o.disconnect();
  }, []);

  // After the window is drawn, go to the section in the address, or to its top.
  // A window opens at its top; a section, below both headers — after they
  // have been measured (on luzhumanidad.com the site bar is measured late).
  useEffect(() => {
    if (!ventana) return;
    const id = ALIAS[ancla] || ancla;
    const t = window.setTimeout(() => {
      if (id === ventana) { window.scrollTo({ top: 0 }); return; }
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [ancla, ventana]);

  // Which section of the window is on screen: lit in the submenu.
  useEffect(() => {
    if (!actual) { setVisible(null); return; }
    const secciones = actual.apartados.map(a => document.getElementById(a.id)).filter(Boolean) as HTMLElement[];
    const o = new IntersectionObserver(entradas => {
      const vistas = entradas.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vistas[0]) setVisible(vistas[0].target.id);
    }, { rootMargin: '-35% 0px -55% 0px' });
    secciones.forEach(s => o.observe(s));
    return () => o.disconnect();
  }, [actual]);

  const inicioLuz = enSitio ? enSitio.inicio : 'https://luzhumanidad.com';
  const marca = enSitio
    ? <Link to={inicioLuz} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</Link>
    : <a href={inicioLuz} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</a>;
  const margen = (integracion?.altoBarra || 0) + altoCabecera + 12;

  return (
    <div data-modelo className="min-h-screen bg-slate-100 text-slate-900 antialiased" style={{ fontFamily: '"Public Sans Variable", ui-sans-serif, system-ui, sans-serif' }}>
      <style>{`[data-modelo] section[id], [data-modelo] [id].scroll-mt-40 { scroll-margin-top: ${margen}px; }`}</style>

      {/* ── The header: the windows and the open window's sections; the project's name is in the cover and the footer ── */}
      <header ref={cabecera} className="sticky top-0 z-40 border-b border-slate-200 bg-white" style={integracion ? { top: integracion.altoBarra } : undefined}>
        {/* The windows. The open one is lit; the others dim until you point at them. */}
        {/* One row: the windows, and a small full-screen switch at the end (Eugenio: «compacta el menú»). */}
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-2 sm:px-4">
          <nav aria-label="Ventanas" className="relative min-w-0 flex-1">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-14 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-1 text-slate-400 sm:hidden"><ChevronRight className="h-5 w-5" /></span>
            <ul ref={tiraVentanas} className="flex gap-0.5 overflow-x-auto py-1 pr-12 [scrollbar-width:none] sm:pr-0">
              {VENTANAS.map(v => {
                const Icono = v.icono;
                const activa = v.id === ventana;
                if (v.pronto) return (
                  <li key={v.id} className="shrink-0">
                    <span aria-disabled title="Próximamente" className="flex cursor-default items-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-300">
                      <Icono aria-hidden className="h-4 w-4" />{v.titulo}
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">pronto</span>
                    </span>
                  </li>
                );
                return (
                  <li key={v.id} className="shrink-0">
                    <a href={`#${v.id}`} aria-current={activa ? 'page' : undefined}
                      className={cn('flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900',
                        activa ? cn(ACENTO[v.id].tab, 'shadow-sm') : ventana ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-900' : 'text-slate-800 hover:bg-slate-100')}>
                      <Icono aria-hidden className="h-4 w-4" />{v.titulo}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
          {integracion && (
            <Libre onClick={integracion.alternar} aria-pressed={integracion.completa}
              title={integracion.completa ? 'Salir de pantalla completa' : 'Pantalla completa'}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              {integracion.completa ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="sr-only">{integracion.completa ? 'Salir de pantalla completa' : 'Pantalla completa'}</span>
            </Libre>
          )}
        </div>

        {/* The open window's sections. */}
        {actual && (
          <div className="relative border-t border-slate-100">
            <nav aria-label={`Apartados de ${actual.titulo}`} className="mx-auto max-w-6xl px-2 sm:px-4">
              <ul ref={tiraApartados} className="flex gap-0.5 overflow-x-auto py-1 pr-8 text-[13px] [scrollbar-width:none]">
                {actual.apartados.map(a => (
                  <li key={a.id} className="shrink-0">
                    <a href={`#${a.id}`} aria-current={visible === a.id ? 'location' : undefined}
                      className={cn('block whitespace-nowrap rounded-full px-2.5 py-0.5', visible === a.id ? cn('font-semibold', ACENTO[actual.id].texto, 'bg-slate-100') : 'text-slate-600 hover:bg-slate-100')}>
                      {a.t}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-1 text-slate-400 lg:hidden"><ChevronRight className="h-4 w-4" /></span>
          </div>
        )}
      </header>

      <main>
        {ventana === 'impuestos' && <ImpuestosVentana onProponer={() => setVerBuzon(true)} />}
        {ventana === 'pensiones' && <PensionesVentana />}
        {ventana === 'presupuestos' && (
          <Apartado id="presupuestos" titulo="En qué se gasta cada escala"
            entradilla="El presupuesto de hoy de la Unión Europea, España, la Comunidad de Madrid, un municipio, una comunidad de vecinos y una familia, cada uno en su quesito. Abajo, todas juntas.">
            <Presupuestos />
          </Apartado>
        )}
        {!ventana && <Portada />}
      </main>

      <footer className="border-t border-slate-200 px-4 pb-24 pt-8 text-center text-sm text-slate-500">
        Modelo socioeconómico optimizado. Un proyecto de {marca}.
      </footer>

      {/* The mailbox, floating at the bottom (Eugenio: «lo de proponer una mejora, abajo como un botón flotante»). */}
      <Boton onClick={() => setVerBuzon(true)} tono="tinta"
        className="fixed bottom-4 right-4 z-30 shadow-lg shadow-slate-900/20 sm:bottom-6 sm:right-6">
        <MessageSquarePlus className="h-4 w-4" /><span className="hidden sm:inline">Proponer una mejora</span><span className="sr-only sm:hidden">Proponer una mejora</span>
      </Boton>

      {verBuzon && (
        <BuzonProyecto
          proyecto="modelo-socioeconomico"
          titulo="Proponer una mejora al modelo"
          invitacion="¿Falta algo, sobra algo o se puede explicar mejor? Escríbelo: cada propuesta se revisa y se aplica a la página."
          ejemplo="Por ejemplo: «La escala provincial debería encargarse también de…»"
          onCerrar={() => setVerBuzon(false)}
        />
      )}
    </div>
  );
}

/** The cover: what this is, and one card per window with a small picture of it. */
function Portada() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <h1 className="max-w-3xl text-[2.3rem] font-[800] leading-[1.03] tracking-[-0.035em] sm:text-[3.4rem]">Un sistema más simple, más justo y que reparte abundancia</h1>
      <p className="mt-5 max-w-[60ch] text-[1.15rem] leading-relaxed text-slate-700">
        Cómo funcionan hoy los impuestos, las pensiones y el gasto público en España, y cómo podrían funcionar. Elige por dónde empezar: cada ventana empieza por lo esencial y se abre en detalle cuando lo pidas.
      </p>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {VENTANAS.map(v => {
          const Icono = v.icono;
          const contenido = (
            <>
              <span className={cn('flex h-36 items-center justify-center rounded-xl', v.pronto ? 'bg-slate-50' : 'bg-slate-50')}>
                {v.id === 'impuestos' ? <DibujoImpuestos /> : v.id === 'pensiones' ? <DibujoPensiones /> : v.id === 'presupuestos' ? <DibujoPresupuestos /> : <Icono aria-hidden className="h-12 w-12 text-slate-300" />}
              </span>
              <span className={cn('mt-4 flex items-center gap-2 text-lg font-bold', v.pronto ? 'text-slate-400' : 'text-slate-900')}>
                <Icono aria-hidden className={cn('h-5 w-5', ACENTO[v.id].texto)} />{v.titulo}
                {v.pronto && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">pronto</span>}
              </span>
              <span className={cn('mt-1 block text-[15px] leading-relaxed', v.pronto ? 'text-slate-400' : 'text-slate-600')}>{v.lema}</span>
            </>
          );
          return (
            <li key={v.id}>
              {v.pronto
                ? <div className="h-full rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">{contenido}</div>
                : <a href={`#${v.id}`} className={cn('block h-full rounded-2xl border-2 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900', ACENTO[v.id].borde)}>{contenido}</a>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Three bars: the three tiers. */
function DibujoImpuestos() {
  return (
    <svg viewBox="0 0 160 100" className="h-28" aria-hidden>
      {[{ v: 10, x: 20 }, { v: 25, x: 65 }, { v: 40, x: 110 }].map(b => (
        <g key={b.v}>
          <rect x={b.x} y={88 - b.v * 1.8} width={30} height={b.v * 1.8} rx={4} className="fill-amber-400" />
          <text x={b.x + 15} y={82 - b.v * 1.8} textAnchor="middle" className="fill-slate-700 text-[12px] font-bold">{b.v} %</text>
        </g>
      ))}
      <line x1={10} x2={150} y1={88} y2={88} className="stroke-slate-300" />
    </svg>
  );
}
/** Today's uneven steps and the proposal's flat line. */
function DibujoPensiones() {
  const tramos = [...TRAMOS_PENSION].reverse();
  const total = tramos.reduce((s, t) => s + t.pensiones, 0);
  let x = 10;
  const y = (e: number) => 90 - e / 3600 * 80;
  return (
    <svg viewBox="0 0 160 100" className="h-28" aria-hidden>
      {tramos.map(t => { const w = t.pensiones / total * 140; const r = <rect key={t.id} x={x + 0.5} y={y(t.media)} width={w - 1} height={90 - y(t.media)} className="fill-slate-300" />; x += w; return r; })}
      <line x1={10} x2={150} y1={y(SMI_MES)} y2={y(SMI_MES)} className="stroke-teal-600" strokeWidth={3} />
    </svg>
  );
}
/** A donut. */
function DibujoPresupuestos() {
  const partes = [{ v: 28, c: 'stroke-amber-400' }, { v: 14, c: 'stroke-emerald-600' }, { v: 13, c: 'stroke-teal-500' }, { v: 9, c: 'stroke-sky-600' }, { v: 6, c: 'stroke-rose-600' }, { v: 30, c: 'stroke-slate-300' }];
  const C = 2 * Math.PI * 32;
  let acum = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-28" aria-hidden>
      {partes.map((p, i) => { const el = <circle key={i} cx={50} cy={50} r={32} fill="none" strokeWidth={16} className={p.c} strokeDasharray={`${p.v / 100 * C - 1.5} ${C}`} strokeDashoffset={-acum / 100 * C} transform="rotate(-90 50 50)" />; acum += p.v; return el; })}
    </svg>
  );
}
