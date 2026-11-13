// ============================================================================
// MODELO SOCIOECONÓMICO OPTIMIZADO (2026-11-10, Eugenio)
// ============================================================================
// One tax on every payment, nothing else, in four tiers (10, 20, 40 or 60 %: by
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
import { ChevronRight, ListTodo, Maximize2, MessageSquarePlus, Minimize2 } from 'lucide-react';
import { useIntegracion } from '../components/sitio/AplicacionIncrustada';
import '@fontsource-variable/public-sans';
import { ImpuestosVentana } from '../components/modeloSocioeconomico/ImpuestosVentana';
import { PensionesVentana } from '../components/modeloSocioeconomico/PensionesVentana';
import { CategoriasVentana } from '../components/modeloSocioeconomico/CategoriasVentana';
import { AmbitoBloque, AmbitoPortada, SelectorAmbito, lemaAmbito, useAmbito } from '../components/modeloSocioeconomico/ambito';
import type { AreaId } from '../data/ambitos/tipos';
import { EconomiaVentana } from '../components/modeloSocioeconomico/EconomiaVentana';
import { EscalasVentana } from '../components/modeloSocioeconomico/EscalasVentana';
import { ViviendaVentana } from '../components/modeloSocioeconomico/ViviendaVentana';
import { SeguridadVentana } from '../components/modeloSocioeconomico/SeguridadVentana';
import { JusticiaVentana } from '../components/modeloSocioeconomico/JusticiaVentana';
import { SanidadVentana } from '../components/modeloSocioeconomico/SanidadVentana';
import { EducacionVentana } from '../components/modeloSocioeconomico/EducacionVentana';
import { LegalVentana } from '../components/modeloSocioeconomico/LegalVentana';
import { EspectroPropuestas } from '../components/modeloSocioeconomico/EspectroPropuestas';
import { ESPECTROS } from '../data/espectro';
import { DigitalVentana } from '../components/modeloSocioeconomico/DigitalVentana';
import { Presupuestos } from '../components/modeloSocioeconomico/Presupuestos';
import { BuzonProyecto } from '../components/modeloSocioeconomico/BuzonProyecto';
import { Boton, Libre } from '../components/modeloSocioeconomico/piezas';
import { VENTANAS, ALIAS, PARTES_ECONOMIA, parteDeAncla, ventanaDeAncla, Apartado } from '../components/modeloSocioeconomico/ventanas';
import { cn } from '../utils/cn';

// Each window's accent: its tab when lit, its cover card. Classes, not colours.
const ACENTO: Record<string, { tab: string; borde: string; texto: string }> = {
  impuestos: { tab: 'bg-amber-500 text-slate-950', borde: 'border-amber-400', texto: 'text-amber-600' },
  pensiones: { tab: 'bg-teal-600 text-white', borde: 'border-teal-500', texto: 'text-teal-700' },
  categorias: { tab: 'bg-orange-700 text-white', borde: 'border-orange-600', texto: 'text-orange-700' },
  presupuestos: { tab: 'bg-indigo-600 text-white', borde: 'border-indigo-500', texto: 'text-indigo-600' },
  deuda: { tab: 'bg-rose-700 text-white', borde: 'border-rose-600', texto: 'text-rose-700' },
  escalas: { tab: 'bg-emerald-700 text-white', borde: 'border-emerald-600', texto: 'text-emerald-700' },
  economia: { tab: 'bg-teal-700 text-white', borde: 'border-teal-600', texto: 'text-teal-700' },
  vivienda: { tab: 'bg-lime-700 text-white', borde: 'border-lime-600', texto: 'text-lime-700' },
  seguridad: { tab: 'bg-blue-800 text-white', borde: 'border-blue-700', texto: 'text-blue-800' },
  justicia: { tab: 'bg-violet-700 text-white', borde: 'border-violet-600', texto: 'text-violet-700' },
  sanidad: { tab: 'bg-cyan-700 text-white', borde: 'border-cyan-600', texto: 'text-cyan-700' },
  educacion: { tab: 'bg-yellow-500 text-slate-950', borde: 'border-yellow-400', texto: 'text-yellow-600' },
  legal: { tab: 'bg-stone-700 text-white', borde: 'border-stone-600', texto: 'text-stone-700' },
  digital: { tab: 'bg-sky-600 text-white', borde: 'border-sky-500', texto: 'text-sky-700' },
};

const anclaActual = () => decodeURIComponent(window.location.hash.replace(/^#/, ''));

export default function ModeloSocioeconomico({ enSitio }: { enSitio?: { inicio: string } } = {}) {
  const [ancla, setAncla] = useState(() => (typeof window === 'undefined' ? '' : anclaActual()));
  const [verBuzon, setVerBuzon] = useState(false);
  const ventana = ventanaDeAncla(ancla);
  const actual = VENTANAS.find(v => v.id === ventana) || null;
  // In «Economía», the submenu shows the three parts and the open part's sections.
  const parte = ventana === 'economia' ? parteDeAncla(ancla) : null;
  const apartados = parte ? PARTES_ECONOMIA.find(p => p.id === parte)!.apartados : actual?.apartados ?? [];
  const [verLista, setVerLista] = useState(false);
  const [pendientes, setPendientes] = useState<number | null>(null);
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
    document.title = 'Modelo de optimización socioeconómica · Escalas, recaudación, pensiones, economía, servicios y leyes · Luz & Humanidad';
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const anterior = meta?.content;
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = 'Modelo de optimización socioeconómica: ocho escalas de la persona al planeta, un único impuesto en cuatro tramos (10, 20, 40 y 60 %), una pensión única, un país sin deuda, y propuestas para vivienda, seguridad, justicia, sanidad, educación, leyes y firma digital, comparadas con la España de hoy.';
    return () => { document.title = titulo; if (meta) meta.content = anterior ?? ''; };
  }, []);

  // How many improvements are pending, for the board's button.
  useEffect(() => {
    let vivo = true;
    fetch('/api/buzon/modelo-socioeconomico/comentarios', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (vivo && j) setPendientes((j.comentarios || []).filter((c: any) => c.estado === 'pendiente').length); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [verBuzon, verLista]);

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
      if (id === ventana || PARTES_ECONOMIA.some(p => p.id === id)) { window.scrollTo({ top: 0 }); return; }
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [ancla, ventana]);

  // Which section of the window is on screen: lit in the submenu.
  useEffect(() => {
    if (!actual) { setVisible(null); return; }
    const secciones = apartados.map(a => document.getElementById(a.id)).filter(Boolean) as HTMLElement[];
    const o = new IntersectionObserver(entradas => {
      const vistas = entradas.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vistas[0]) setVisible(vistas[0].target.id);
    }, { rootMargin: '-35% 0px -55% 0px' });
    secciones.forEach(s => o.observe(s));
    return () => o.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual, parte]);

  const inicioLuz = enSitio ? enSitio.inicio : 'https://luzhumanidad.com';
  const marca = enSitio
    ? <Link to={inicioLuz} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</Link>
    : <a href={inicioLuz} className="underline decoration-slate-300 underline-offset-2 hover:text-slate-900">Luz &amp; Humanidad</a>;
  const margen = (integracion?.altoBarra || 0) + altoCabecera + 12;

  // Where the person is, so a comment is saved against it (Eugenio, 2026-11-13): the section on screen, or the window.
  const nombreDe = (id: string): string | null => {
    if (id === 'inicio') return 'Inicio';
    for (const v of VENTANAS) {
      if (v.id === id) return v.titulo;
      const a = v.apartados.find(x => x.id === id);
      if (a) {
        const p = PARTES_ECONOMIA.find(q => q.id === id || id.startsWith(`${q.id}-`));
        return p && v.id === 'economia' ? `${v.titulo} › ${p.t}${a.id === p.id ? '' : ` › ${a.t}`}` : `${v.titulo} › ${a.t}`;
      }
    }
    return null;
  };
  const aqui = visible || parte || ventana || 'inicio';
  const paginaActual = { id: aqui, nombre: nombreDe(aqui) ?? 'Inicio' };

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
          {ventana && <SelectorAmbito />}
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
                {parte && PARTES_ECONOMIA.map(p => (
                  <li key={p.id} className="shrink-0">
                    <a href={`#${p.id}`} aria-current={p.id === parte ? 'page' : undefined}
                      className={cn('block whitespace-nowrap rounded-full border px-3 py-0.5 font-semibold', p.id === parte ? cn(ACENTO[actual.id].tab, 'border-transparent') : 'border-slate-200 text-slate-700 hover:bg-slate-100')}>
                      {p.t}
                    </a>
                  </li>
                ))}
                {parte && <li aria-hidden className="mx-1.5 shrink-0 self-center text-slate-300">|</li>}
                {apartados.map(a => (
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
        {(parte || ventana) && <AmbitoBloque key={`ambito-${parte || ventana}`} area={(parte || ventana) as AreaId} />}
        {ventana && ESPECTROS[ventana] && <EspectroPropuestas key={ventana} ventana={ventana} datos={ESPECTROS[ventana]!} />}
        {ventana === 'impuestos' && <ImpuestosVentana onProponer={() => setVerBuzon(true)} />}
        {ventana === 'categorias' && <CategoriasVentana />}
        {ventana === 'pensiones' && <PensionesVentana />}
        {ventana === 'economia' && <EconomiaVentana parte={parte!} />}
        {ventana === 'escalas' && <EscalasVentana />}
        {ventana === 'vivienda' && <ViviendaVentana />}
        {ventana === 'seguridad' && <SeguridadVentana />}
        {ventana === 'justicia' && <JusticiaVentana />}
        {ventana === 'sanidad' && <SanidadVentana />}
        {ventana === 'educacion' && <EducacionVentana />}
        {ventana === 'legal' && <LegalVentana />}
        {ventana === 'digital' && <DigitalVentana />}
        {ventana === 'presupuestos' && (
          <Apartado id="presupuestos" titulo="En qué se gasta cada escala"
            entradilla="El presupuesto de hoy de la Unión Europea, España, la Comunidad de Madrid, un municipio, una comunidad de vecinos y una familia, cada uno en su quesito. Abajo, todas juntas.">
            <Presupuestos />
          </Apartado>
        )}
        {!ventana && <Portada />}
      </main>

      <footer className="border-t border-slate-200 px-4 pb-24 pt-8 text-center text-sm text-slate-500">
        Modelo de optimización socioeconómica. Un proyecto de {marca}.
      </footer>

      {/* Bottom right: add a comment about the page you are on, and the board of pending improvements
          (Eugenio, 2026-11-13: «el botón de añadir comentarios flotante abajo … y al lado una lista pendiente de mejoras»). */}
      <div className="fixed bottom-4 right-4 z-30 flex items-center gap-2 sm:bottom-6 sm:right-6">
        <Boton onClick={() => setVerLista(true)} className="bg-white/95 shadow-lg shadow-slate-900/10 backdrop-blur">
          <ListTodo className="h-4 w-4" /><span className="hidden sm:inline">Mejoras pendientes</span>
          {pendientes !== null && <span className="rounded-full bg-slate-900 px-1.5 text-xs font-bold text-white tabular-nums">{pendientes}</span>}
          <span className="sr-only sm:hidden">Mejoras pendientes</span>
        </Boton>
        <Boton onClick={() => setVerBuzon(true)} tono="tinta" className="shadow-lg shadow-slate-900/20">
          <MessageSquarePlus className="h-4 w-4" /><span className="hidden sm:inline">Añadir comentario</span><span className="sr-only sm:hidden">Añadir comentario</span>
        </Boton>
      </div>

      {(verBuzon || verLista) && (
        <BuzonProyecto
          proyecto="modelo-socioeconomico"
          modo={verLista ? 'lista' : 'escribir'}
          pagina={paginaActual}
          nombreDe={nombreDe}
          titulo={verLista ? 'Mejoras pendientes' : 'Añadir un comentario'}
          invitacion={verLista
            ? 'Lo que falta por mejorar en el modelo: lo que propone la gente y lo que han encontrado quienes lo construyen. Cada punto lleva la página a la que se refiere.'
            : '¿Falta algo, sobra algo o se puede explicar mejor? Tu comentario se guarda junto a la página en la que estás y entra en la lista de mejoras pendientes.'}
          ejemplo="Por ejemplo: «En esta parte faltaría explicar…»"
          onCerrar={() => { setVerBuzon(false); setVerLista(false); }}
        />
      )}
    </div>
  );
}

/** The cover (Eugenio, 2026-11-13: «en la página principal, una especie de grid donde están todas las áreas, un poco más
 *  grandes, y arriba a la derecha el modelo para España, que se pueda cambiar»): the name, the scale selector, and one
 *  big card per area. With another scale chosen, its overview comes first and each card says what changes there. */
function Portada() {
  const [ambito] = useAmbito();
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="max-w-3xl text-[2.2rem] font-[800] leading-[1.03] tracking-[-0.035em] sm:text-[3.2rem]">Modelo de optimización socioeconómica</h1>
          <p className="mt-4 max-w-[62ch] text-[1.12rem] leading-relaxed text-slate-700">
            Cómo funcionan hoy la recaudación, las pensiones, la economía, los servicios y las leyes, y cómo podrían funcionar: más simple, más justo y repartiendo el poder entre las escalas, de la persona al planeta. Elige un área.
          </p>
        </div>
        <SelectorAmbito grande />
      </div>
      <AmbitoPortada />
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {VENTANAS.filter(v => !v.pronto).map(v => {
          const Icono = v.icono;
          const partes = v.id === 'economia' ? PARTES_ECONOMIA : null;
          const local = partes ? null : lemaAmbito(ambito, v.id as AreaId);
          return (
            <li key={v.id}>
              <a href={`#${v.id}`}
                className="group flex h-full flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:ring-slate-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-105 motion-reduce:group-hover:scale-100', ACENTO[v.id].tab)}>
                  <Icono aria-hidden className="h-7 w-7" />
                </span>
                <span className="mt-5 block text-[1.55rem] font-[800] leading-tight tracking-tight text-slate-900">{v.titulo}</span>
                <span className="mt-2 block text-[15px] leading-relaxed text-slate-600">{local ?? v.lema}</span>
                {partes && (
                  <span className="mt-4 flex flex-wrap gap-1.5">
                    {partes.map(p => <span key={p.id} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-semibold text-slate-700">{p.t}</span>)}
                  </span>
                )}
                <span className={cn('mt-auto pt-5 text-sm font-semibold', ACENTO[v.id].texto)}>Entrar en {v.titulo.toLowerCase()}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
