import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { cn } from '../../utils/cn';
import { enumerar, paisesDe, type DatosPortada, type ProyectoPortada } from './portadaEscaparate';
const MapaCapa = lazy(() => import('./MapaCapa'));

// ============================================================================
// «DÓNDE TRABAJAMOS» (2026-11-07, portada de luzhumanidad.com)
// ============================================================================
// Eugenio pidió subir el listón de la portada. Esta sección pone cada proyecto con
// un sitio físico en el mapa: España en grande (es donde está la mayoría) y el
// mundo al lado, con el recuadro de España y su número enlazados al detalle. Los
// países con proyectos se iluminan. Cada lugar sale de la página del proyecto
// (`config.lugar`): sin lugar, sin chincheta.
//
// Aquí va lo ligero (los títulos, el reparto por países, la lista para lectores
// de pantalla); el dibujo, con d3-geo y la trama de puntos, se descarga cuando la
// sección se acerca a la pantalla (`MapaCapa.tsx`). Los dos paneles guardan su
// sitio desde el principio (`aspect-ratio`), así que nada salta al llegar.

// La forma de los dos paneles (ancho / alto): España, la de su lienzo (`mapaPortadaPuntos.ts`); el
// mundo, la de su encuadre (`PROPORCION_MUNDO` en `MapaCapa.tsx`; no se importa de allí para no
// arrastrar d3-geo a la carga de la portada).
const PROPORCION = { espana: '1000 / 749', mundo: '1.6' };
// Lo que entra en el detalle de España: la península, Baleares y Canarias (las mismas cajas que
// `scripts/generar-mapa-portada.mjs` y `enDetalle` en `MapaCapa.tsx`).
const EN_DETALLE = (l: NonNullable<ProyectoPortada['lugar']>) =>
  (l.lon >= -9.75 && l.lon <= 4.6 && l.lat >= 35.55 && l.lat <= 44.05) || (l.lon >= -18.25 && l.lon <= -13.3 && l.lat >= 27.55 && l.lat <= 29.5);

/** Monta lo de dentro cuando la caja está a menos de `margen` px de la pantalla. */
function useCerca<T extends HTMLElement>(margen = 700) {
  const ref = useRef<T>(null);
  const [cerca, setCerca] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || cerca) return;
    if (typeof IntersectionObserver === 'undefined') { setCerca(true); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setCerca(true); io.disconnect(); } }, { rootMargin: `${margen}px 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [cerca, margen]);
  return [ref, cerca] as const;
}

export default function MapaProyectosSitio({ datos, enlace }: { datos: DatosPortada; enlace: (p: ProyectoPortada) => string }) {
  const [caja, cerca] = useCerca<HTMLElement>();
  const espana = useRef<HTMLDivElement>(null);
  const [destello, setDestello] = useState(false);
  const conLugar = datos.proyectos.filter(p => p.lugar);
  if (!conLugar.length) return null;

  const paises = paisesDe(conLugar);
  const enDetalle = conLugar.filter(p => EN_DETALLE(p.lugar!)).length;
  const fuera = conLugar.length - enDetalle;
  const sinLugar = datos.proyectos.length - conLugar.length;
  // Los estados que hay en el mapa, con su color (la leyenda).
  const estados = [...new Map(conLugar.filter(p => p.estado).map(p => [p.estado!, p.color || '#94a3b8'])).entries()];
  const maximo = Math.max(...paises.map(p => p.n));

  // Del recuadro del mundo al detalle: se baja hasta España y se ilumina un momento.
  const irEspana = () => {
    const el = espana.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const tope = (document.querySelector('[data-cabecera-sitio]')?.getBoundingClientRect().bottom ?? 0) + 8;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (r.top < tope || r.bottom > window.innerHeight) el.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
    setDestello(true);
    window.setTimeout(() => setDestello(false), 1600);
  };

  const panel = 'relative rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-100';
  const rotulo = 'pointer-events-none absolute left-3 top-2.5 z-[5] text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 sm:left-4 sm:top-3.5';
  const carga = <div className="absolute inset-0 animate-pulse rounded-2xl bg-slate-100/70" />;
  // La leyenda de los colores: el estado de cada proyecto, como en su tarjeta.
  const leyenda = estados.length > 0 && (
    <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] font-bold text-slate-600 sm:text-xs">
      {estados.map(([e, c]) => (
        <span key={e} className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full shadow-[0_0_0_1.5px_white,0_0_0_2.5px_rgba(15,23,42,0.12)]" style={{ background: c }} />{e}
        </span>
      ))}
    </p>
  );

  return (
    <section ref={caja} data-ancla="mapa" aria-labelledby="titulo-mapa" className="mt-20 scroll-mt-36 outline-none sm:scroll-mt-24">
      <div className="text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-slate-500"><MapPin className="h-3.5 w-3.5" aria-hidden /> Dónde trabajamos</p>
        <h2 id="titulo-mapa" className="mx-auto mt-2 max-w-2xl text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
          {paises.length === 1 ? `Proyectos en ${paises[0].pais}` : `Proyectos en ${paises.length} países`}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold text-slate-500">{enumerar(paises.map(p => p.pais))}</p>
      </div>

      <div className="mt-8 grid gap-3 rounded-3xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-4">
        {/* ESPAÑA, EN GRANDE: aquí está la mayoría de los proyectos. */}
        {enDetalle > 0 && (
          <div ref={espana} tabIndex={-1} role="group" aria-label={`España: ${enDetalle} proyectos`}
            className={cn(panel, 'outline-none transition-shadow duration-500', destello && 'shadow-[0_0_0_3px_rgba(245,158,11,0.85)]')}
            style={{ aspectRatio: PROPORCION.espana }}>
            <p className={rotulo}>España · {enDetalle}</p>
            {cerca ? <Suspense fallback={carga}><MapaCapa vista="espana" proyectos={conLugar} enlace={enlace} /></Suspense> : carga}
            {/* La leyenda, abajo a la derecha, sobre el Mediterráneo: abajo a la izquierda están las Canarias. */}
            {leyenda && <div className="pointer-events-none absolute bottom-3.5 right-4 z-[5] hidden rounded-full bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur-sm sm:block">{leyenda}</div>}
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-3 lg:gap-4">
          {/* EL MUNDO: los proyectos de fuera y el recuadro de España, que lleva al detalle. */}
          <div className={panel} style={{ aspectRatio: PROPORCION.mundo }} role="group" aria-label={fuera ? `El mundo: ${fuera} proyectos fuera de España` : 'El mundo'}>
            <p className={rotulo}>El mundo{fuera ? ` · ${fuera}` : ''}</p>
            {cerca ? <Suspense fallback={carga}><MapaCapa vista="mundo" proyectos={conLugar} enlace={enlace} detalle={enDetalle} alIrDetalle={irEspana} /></Suspense> : carga}
            {!enDetalle && leyenda && <div className="pointer-events-none absolute bottom-2.5 left-3 z-[5] rounded-full bg-white/85 px-3 py-1.5 shadow-sm">{leyenda}</div>}
          </div>

          {/* El reparto por países, de más a menos proyectos (y en el móvil, la leyenda de colores,
              que encima del mapa taparía Andalucía). */}
          <div className="px-2 pb-1 sm:px-3">
            {leyenda && enDetalle > 0 && <div className="mb-4 sm:hidden">{leyenda}</div>}
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Proyectos por país</p>
            <ul role="list" className="mt-2.5 list-none space-y-1 p-0">
              {paises.map(p => (
                <li key={p.pais} className="grid grid-cols-[minmax(6.5rem,8rem)_minmax(0,1fr)_1.75rem] items-center gap-3 text-sm">
                  <span className="truncate font-bold text-slate-700">{p.pais}</span>
                  <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-amber-400" style={{ width: `${Math.max(5, (p.n / maximo) * 100)}%` }} />
                  </span>
                  <span className="text-right font-black tabular-nums text-slate-900">{p.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {sinLugar > 0 && (
        <p className="mx-auto mt-3 max-w-2xl px-2 text-center text-xs leading-snug text-slate-500">
          {sinLugar === 1
            ? 'Otro proyecto no sale en el mapa: no tiene un lugar fijo o aún no lo hemos situado.'
            : `Los otros ${sinLugar} proyectos no salen en el mapa: no tienen un lugar fijo —plataformas, diseños, campañas itinerantes— o aún no lo hemos situado.`}
        </p>
      )}

      {/* LA LISTA, PARA QUIEN NO VE EL MAPA: cada proyecto con su lugar y su enlace. Sus enlaces no
          son paradas del Tab (2026-11-07, revisión): serían 20 paradas que no se ven. El lector de
          pantalla los lee y los abre igual, y el teclado llega a todo por las chinchetas. */}
      <ul role="list" className="sr-only">
        {conLugar.map(p => (
          <li key={p.pagina}>
            <Link to={enlace(p)} data-interno="" tabIndex={-1}>{p.titulo}</Link>: {[p.lugar!.nombre, p.lugar!.region !== p.lugar!.nombre ? p.lugar!.region : null, p.lugar!.pais].filter(Boolean).join(', ')}
          </li>
        ))}
      </ul>
    </section>
  );
}
