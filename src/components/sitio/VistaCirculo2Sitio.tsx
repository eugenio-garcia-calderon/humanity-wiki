import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import ElegirTerritorio from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { miniatura } from '../../utils/miniatura';
import { useSitio } from './ContextoSitio';
import { Arco } from './ArcoCapas';
import { PanelCirculo, useCirculoElegido, useCirculosTerritorio } from './PanelCirculo';
import { leerSistemas, type Circulo, type Sistema } from './circulosDatos';
import NotaCirculo from './NotaCirculo';

// ============================================================================
// LA VISTA «CÍRCULO» — TRES BLOQUES EN LA MISMA PÁGINA (nació como Círculo 2.0, 2026-10-28, Eugenio;
// el mismo día, «elimina el 1.0», y pasó a ser la vista «Círculo», `?vista=circulos`)
// ============================================================================
// «El arco con las cinco categorías todavía más a la izquierda y un poco más
// pequeño; las ramas en el centro, un poco más pequeñas; y cuando pinche, por
// ejemplo, en Economía y luego en Finanzas, que en vez de abrir la página de
// Finanzas me abra sus indicadores en esta misma página, en el lateral derecho:
// tres bloques. El tercero solo se muestra al pinchar: Ser humano → Salud → sus
// bloques; y si pincho en Salud mental, debajo, en la misma página, sus proyectos,
// personas, herramientas… sin llevarme a otra página.»
// Es la vista «Círculo» (arco y panel) con dos piezas más. A la derecha, el sector
// elegido y sus objetivos, que son sus bloques. Debajo, a todo lo ancho, las
// relaciones del objetivo elegido (o del sector, si aún no se ha elegido ninguno):
// indicadores, proyectos, personas, herramientas… Las relaciones salen de la misma
// red que pinta las pestañas de cada página (`GET /api/bd/paginas/:id/red`).
// Lo elegido va en la dirección (`?circulo=`, `?sector=` y `?bloque=`) para poder compartirlo. Los bloques se abren
// según se pincha: primero solo el arco, luego dos columnas y luego tres.
//
// MEDIA PANTALLA, PESTAÑAS Y RUTA FIJA (2026-10-28, Eugenio: «que los tres bloques ocupen solo la mitad de arriba de la
// pantalla, con una sola palabra en cada tarjeta, y dejar la mitad de abajo para el submenú de pestañas: proyectos,
// soluciones, indicadores, personas y publicaciones, con sus pantallitas; y al bajar, que Técnica › Movilidad ›
// Eficiencia se quede fijo y en pequeño debajo del menú, como una ruta, para que no te pierdas»). Desde 768 px los
// bloques miden media pantalla; debajo, las relaciones en pestañas, cuya barra se queda pegada bajo la cabecera con la
// ruta delante en cuanto los bloques salen de la vista. El territorio se elige en la barra de arriba.

// SECTORES, CATEGORÍAS Y TEMÁTICAS (2026-10-28, Eugenio): los cinco del arco son los sectores (la columna «Sector»,
// antes «Pata»); dentro, las categorías (las filas de Sistemas, como mucho seis por sector); y dentro de cada una,
// sus temáticas (la relación «Temáticas», antes «Objetivos», como mucho seis).
const PATAS = /^(patas?|sector(es)?)$/i;
const TEMATICAS = /^(objetivos?|tem[aá]ticas?)$/i;
const DIBUJOS: Record<string, string> = {
  'ser-humano': 'personas', sociedad: 'sociedad', economia: 'economia', tecnologia: 'tecnologia', tecnica: 'tecnologia', naturaleza: 'ecologia', ecosistema: 'ecologia',
};
const dibujoPata = (clave: string) => (DIBUJOS[clave] ? `/circulos/${DIBUJOS[clave]}.svg` : null);

type Entrada = { fila_id: string; pagina_id: string | null; titulo: string; imagen: string | null; icono: string | null; descripcion: string | null; corto?: string | null };
type Grupo = { columna_id: string; nombre: string; entradas: Entrada[] };

// La red de una página, una vez por visita.
const redes = new Map<string, Promise<Grupo[]>>();
function leerRed(paginaId: string) {
  let p = redes.get(paginaId);
  if (!p) {
    p = fetch(`/api/bd/paginas/${encodeURIComponent(paginaId)}/red`, { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { grupos: [] })).then(j => (j.grupos || []) as Grupo[]).catch(() => []);
    redes.set(paginaId, p);
  }
  return p;
}
function useRed(paginaId: string | null) {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  useEffect(() => {
    if (!paginaId) { setGrupos(null); return; }
    let vivo = true; setGrupos(null);
    leerRed(paginaId).then(g => { if (vivo) setGrupos(g); });
    return () => { vivo = false; };
  }, [paginaId]);
  return grupos;
}

/** La nota de cada objetivo (por su página), de la base de datos de Objetivos que enlaza la de Sistemas. */
const notasObjetivos = new Map<string, Promise<Map<string, number>>>();
function useNotasObjetivos(raizId: string) {
  const [notas, setNotas] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    let p = notasObjetivos.get(raizId);
    if (!p) {
      p = leerSistemas(raizId).then(async j => {
        const tabla = (j?.columnas || []).find((c: any) => c.tipo === 'relacion' && TEMATICAS.test(String(c.nombre).trim()))?.config?.tabla_destino;
        if (!tabla) return new Map();
        const o = await fetch(`/api/bd/tablas/${encodeURIComponent(tabla)}?lectura=1`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
        const col = (o?.columnas || []).find((c: any) => c.tipo === 'nota');
        const m = new Map<string, number>();
        for (const f of o?.filas || []) { const v = col ? f.celdas?.[col.id]?.valor : null; if (f.pagina_id && typeof v === 'number') m.set(f.pagina_id, v); }
        return m;
      }).catch(() => new Map());
      notasObjetivos.set(raizId, p);
    }
    let vivo = true; p.then(m => { if (vivo) setNotas(m); });
    return () => { vivo = false; };
  }, [raizId]);
  return notas;
}

const esObjetivos = (g: Grupo) => TEMATICAS.test(g.nombre.trim());
const SIN_INTERES = /^(sistema|territorio|tema superior)$/i; // lo que ya se sabe por el contexto
/** El nombre de una palabra: el «Nombre en la ruta» de la entrada, si lo tiene. */
const corto = (e: Entrada) => e.corto || e.titulo;

/** El tercer bloque: la categoría elegida y sus temáticas, que se eligen aquí mismo. Igual de simple que el segundo
 *  (2026-10-28, Eugenio: «no hace falta que pongas de nuevo Tecnología, ni el icono, ni subtítulo, ni el número de
 *  temáticas: que ponga Movilidad y que aparezcan sus seis»). */
function BloqueSector({ s, c, grupos, notas, bloque, alElegir }: {
  s: Sistema; c: Circulo; grupos: Grupo[] | null; notas: Map<string, number>; bloque: string | null; alElegir: (e: Entrada) => void;
}) {
  const objetivos = grupos?.find(esObjetivos)?.entradas || [];
  return (
    <section data-bloque-sector className="flex min-h-0 min-w-0 flex-col md:h-full">
      <div className="mb-3 flex items-center gap-2" title={`${c.nombre} › ${s.titulo}`}>
        <h3 className="text-xl font-black tracking-tight text-slate-900">{s.titulo}</h3>
        {s.nota != null && <NotaCirculo nota={s.nota} tam="barra" titulo={s.titulo} />}
      </div>
      {!grupos ? <p className="py-6 text-sm text-slate-400">Cargando…</p>
        : objetivos.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">{s.titulo} todavía no tiene temáticas. Debajo, lo que ya tiene enlazado.</p>
        : (
          <>
            {/* Una palabra por temática (su «Nombre en la ruta»); el nombre entero, al pasar el ratón. TARJETAS GRANDES
                (2026-10-28, Eugenio: «hay más hueco en el bloque 3 para hacer las tarjetas más grandes y visibles»): en
                tres columnas y con filas iguales que llenan el alto del bloque, el dibujo arriba y la palabra debajo. */}
            <ul className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 md:grid-cols-3 md:[grid-template-rows:repeat(var(--filas),minmax(0,1fr))]"
              style={{ ['--filas' as string]: Math.ceil(objetivos.length / 3) }} data-objetivos-sector>
              {objetivos.map(o => {
                const on = bloque === o.pagina_id, nota = o.pagina_id ? notas.get(o.pagina_id) : undefined;
                return (
                  <li key={o.fila_id} className="min-h-0">
                    <button type="button" onClick={() => alElegir(o)} aria-pressed={on} data-objetivo-sector={o.titulo} title={o.titulo}
                      className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg ${on ? 'border-[#3b82c4] ring-2 ring-[#3b82c4]' : bloque ? 'border-slate-200 opacity-70 hover:opacity-100' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className="relative block w-full bg-slate-50 max-md:aspect-[2/1] md:min-h-[40px] md:flex-1">
                        {o.imagen ? <img src={miniatura(o.imagen, 380)} alt="" className="absolute inset-0 h-full w-full object-contain p-2" /> : o.icono ? <span className="grid h-full place-items-center text-3xl">{o.icono}</span> : null}
                      </span>
                      <span className="flex min-w-0 items-center justify-between gap-2 px-3 py-1.5">
                        <span lang="es" className="min-w-0 truncate text-base font-extrabold leading-tight text-slate-900">{corto(o)}</span>
                        {nota != null && <NotaCirculo nota={nota} tam="barra" titulo={o.titulo} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
    </section>
  );
}

// LAS FILAS DE ABAJO: primero las cinco de siempre, con su nombre corto (las vacías no se pintan); después,
// cualquier otra relación que tenga algo.
const PESTANAS: Array<[RegExp, string]> = [[/proyecto/i, 'Proyectos'], [/soluci/i, 'Soluciones'], [/indicador/i, 'Indicadores'], [/persona/i, 'Personas'], [/publicaci/i, 'Publicaciones']];
type Pestana = { clave: string; nombre: string; completo?: string; entradas: Entrada[] };
function pestanasDe(grupos: Grupo[], quitarObjetivos: boolean): Pestana[] {
  const lista = grupos.filter(g => !SIN_INTERES.test(g.nombre.trim()) && !(quitarObjetivos && esObjetivos(g)));
  const usados = new Set<Grupo>();
  const fijas = PESTANAS.map(([re, nombre]) => {
    const gs = lista.filter(g => re.test(g.nombre) && !usados.has(g));
    gs.forEach(g => usados.add(g));
    return { clave: nombre.toLowerCase(), nombre, entradas: gs.flatMap(g => g.entradas) };
  });
  // También de una palabra («Mejoras de los Sistemas» → «Mejoras»); el nombre entero, al pasar el ratón.
  const otras = lista.filter(g => !usados.has(g) && g.entradas.length).map(g => ({ clave: g.columna_id, nombre: g.nombre.trim().split(/\s+/)[0], completo: g.nombre, entradas: g.entradas }));
  return [...fijas, ...otras];
}

type OpcionRuta = { id: string; nombre: string; imagen?: string | null };
type PasoRuta = { nombre: string; imagen?: string | null; opciones: OpcionRuta[]; elegido: string | null; alElegir: (id: string) => void };

const fotoRuta = (imagen: string, lado = 80) => (imagen.startsWith('/circulos/') ? imagen : miniatura(imagen, lado));

/** La ruta de la barra pegada: sector › categoría › temática. Cada paso es un desplegable (2026-10-28, Eugenio: «que el
 *  menú colapsado sea también un desplegable donde puedes cambiar y seleccionar otros elementos»): se cambia de sector,
 *  de categoría o de temática sin subir a los bloques. La flecha del final sí sube. En el móvil, la lista va a todo lo
 *  ancho bajo la barra (su `backdrop-blur` hace de marco para el `fixed`). */
function Ruta({ pasos }: { pasos: PasoRuta[] }) {
  const [abierto, setAbierto] = useState<number | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (abierto == null) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(null); };
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(null); };
    document.addEventListener('keydown', tecla); document.addEventListener('mousedown', fuera);
    return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('mousedown', fuera); };
  }, [abierto]);
  return (
    <div ref={caja} className="flex min-w-0 items-center gap-1 text-sm font-bold text-slate-600" data-ruta-circulo>
      {pasos.map((p, i) => (
        <div key={i} className="relative flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
          <button type="button" onClick={() => setAbierto(abierto === i ? null : i)} aria-expanded={abierto === i} aria-haspopup="listbox" data-paso-ruta={i}
            className={`flex min-w-0 items-center gap-1.5 rounded-lg py-0.5 pl-1 pr-1.5 hover:bg-slate-100 hover:text-slate-900 ${abierto === i ? 'bg-slate-100 text-slate-900' : ''}`}>
            {p.imagen && <img src={fotoRuta(p.imagen)} alt="" className="h-7 w-9 shrink-0 rounded bg-slate-50 object-contain" />}
            <span className={`truncate ${p.elegido ? (i === pasos.length - 1 ? 'text-slate-900' : '') : 'italic text-slate-400'}`}>{p.nombre}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${abierto === i ? 'rotate-180' : ''}`} />
          </button>
          {abierto === i && (
            <ul role="listbox" className="absolute left-0 top-full z-50 mt-1.5 max-h-[60dvh] w-72 max-sm:fixed max-sm:inset-x-4 max-sm:w-auto overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_-12px_rgba(15,23,42,0.3)]" data-desplegable-ruta>
              {p.opciones.map(o => {
                const on = o.id === p.elegido;
                return (
                  <li key={o.id}>
                    <button type="button" role="option" aria-selected={on} onClick={() => { setAbierto(null); if (!on) p.alElegir(o.id); }} data-opcion-ruta={o.nombre}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-sm font-bold ${on ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
                      <span className="grid h-8 w-10 shrink-0 place-items-center rounded-md bg-white">
                        {o.imagen && <img src={fotoRuta(o.imagen)} alt="" className="h-full w-full object-contain p-0.5" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{o.nombre}</span>
                      {on && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
              {!p.opciones.length && <li className="px-2 py-1.5 text-sm text-slate-400">Cargando…</li>}
            </ul>
          )}
        </div>
      ))}
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} title="Volver arriba" aria-label="Volver arriba"
        className="ml-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-900">
        <ArrowUp className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Una fila de abajo: el titular grande a la izquierda y sus entradas en carrusel, tres a la vista. */
function FilaCarrusel({ p, enlace }: { p: Pestana; enlace: (id: string) => string }) {
  const pista = useRef<HTMLUListElement>(null);
  const [bordes, setBordes] = useState({ ini: true, fin: true });
  const medir = () => {
    const el = pista.current;
    if (el) setBordes({ ini: el.scrollLeft <= 2, fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };
  useEffect(() => {
    medir();
    const el = pista.current;
    if (!el) return;
    const o = new ResizeObserver(medir); o.observe(el);
    return () => o.disconnect();
  }, [p.entradas.length]);
  const mover = (dir: number) => pista.current?.scrollBy({ left: dir * pista.current.clientWidth, behavior: 'smooth' });
  const flecha = 'grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-30';
  return (
    <section className="grid gap-4 border-t border-slate-200 py-7 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-8" data-fila-detalle={p.nombre}>
      <div className="flex items-start justify-between gap-3 md:flex-col md:justify-start">
        <h3 className="text-3xl font-black uppercase tracking-tight text-slate-900 md:text-4xl" title={p.completo}>
          {p.nombre} <span className="align-middle text-lg font-bold text-slate-400">{p.entradas.length}</span>
        </h3>
        {!(bordes.ini && bordes.fin) && (
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => mover(-1)} disabled={bordes.ini} aria-label="Anteriores" className={flecha}><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => mover(1)} disabled={bordes.fin} aria-label="Siguientes" className={flecha}><ChevronRight className="h-5 w-5" /></button>
          </div>
        )}
      </div>
      <ul ref={pista} onScroll={medir} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]" data-carrusel>
        {p.entradas.map(x => {
          const tarjeta = (
            <>
              <span className="relative block aspect-[16/10] w-full bg-slate-50">
                {x.imagen ? <img src={miniatura(x.imagen, 480)} alt="" className="absolute inset-0 h-full w-full object-contain p-3" /> : x.icono ? <span className="grid h-full place-items-center text-5xl">{x.icono}</span> : null}
              </span>
              <span lang="es" className="hyphens-auto px-4 py-3 text-base font-bold leading-snug text-slate-900">{x.titulo}</span>
            </>
          );
          const clase = 'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white';
          return (
            <li key={x.fila_id} className="shrink-0 snap-start basis-[82%] sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)]">
              {x.pagina_id
                ? <Link to={enlace(x.pagina_id)} onClick={() => window.scrollTo(0, 0)} className={`${clase} transition hover:-translate-y-0.5 hover:shadow-md`}>{tarjeta}</Link>
                : <span className={clase}>{tarjeta}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Debajo: las relaciones de lo elegido (proyectos, soluciones, indicadores, personas, publicaciones…), una fila cada una
 *  (2026-10-28, Eugenio: «una fila por cada uno en vez de pestañas, en carrusel con 3 entradas, el titular grande a la
 *  izquierda y una línea de separación entre filas»). Las filas vacías no se pintan. */
function Detalle({ paginaId, titulo, grupos, quitarObjetivos, ruta, rutaVisible, arriba }: {
  paginaId: string; titulo: string; grupos: Grupo[] | null; quitarObjetivos: boolean;
  ruta: PasoRuta[]; rutaVisible: boolean; arriba: number;
}) {
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const filas = useMemo(() => pestanasDe(grupos || [], quitarObjetivos).filter(p => p.entradas.length), [grupos, quitarObjetivos]);
  return (
    // Al menos una pantalla de alto: al cambiar a una categoría con poco dentro, la ruta no se va con el desplazamiento.
    <section data-detalle-circulo2 className="mt-6" style={{ minHeight: `calc(100dvh - ${arriba}px)` }}>
      {/* LA RUTA AL BAJAR (Eugenio: «arriba la barra con el buscador y el territorio; debajo, el menú Tecnología ›
          Movilidad › Eficiencia»): fija bajo la cabecera, solo cuando los bloques ya no se ven, y sin empujar nada. */}
      {rutaVisible && (
        <div className="fixed inset-x-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-1.5 backdrop-blur animate-in fade-in sm:px-8" style={{ top: arriba }} data-menu-ruta>
          <Ruta pasos={ruta} />
        </div>
      )}
      <div className="flex justify-end pb-3">
        <Link to={enlace(paginaId)} onClick={() => window.scrollTo(0, 0)} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900" title={`Abrir la página de ${titulo}`}>
          <span className="max-w-[16rem] truncate">{titulo}</span> <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {!grupos ? <p className="border-t border-slate-200 py-6 text-sm text-slate-400">Cargando…</p>
        : !filas.length ? <p className="border-t border-slate-200 py-6 text-sm text-slate-500">Todavía no tiene proyectos, soluciones, indicadores, personas ni publicaciones enlazados.</p>
        : filas.map(p => <FilaCarrusel key={p.clave} p={p} enlace={enlace} />)}
    </section>
  );
}

/** El alto de la cabecera fija del sitio, para pegar debajo la barra de las pestañas. */
function useAltoCabecera() {
  const [alto, setAlto] = useState(72);
  useEffect(() => {
    const h = document.querySelector('[data-cabecera-sitio]') as HTMLElement | null;
    if (!h) return;
    const medir = () => setAlto(h.offsetHeight);
    medir();
    const o = new ResizeObserver(medir); o.observe(h);
    return () => o.disconnect();
  }, []);
  return alto;
}

export default function VistaCirculo2Sitio({ raizId }: { raizId: string }) {
  const t = useCirculosTerritorio(raizId, PATAS);
  const { circulos } = t;
  const { elegido, ver } = useCirculoElegido(circulos, 'data-circulo-elegido-c2');
  const { search, pathname, hash } = useLocation();
  const ir = useNavigate();
  const q = new URLSearchParams(search);
  const sectorId = q.get('sector'), bloqueId = q.get('bloque');
  const poner = (cambios: Record<string, string | null>) => {
    const n = new URLSearchParams(search);
    for (const [k, v] of Object.entries(cambios)) { if (v) n.set(k, v); else n.delete(k); }
    ir(`${pathname}?${n.toString()}${hash}`, { replace: true });
  };
  const notas = useNotasObjetivos(raizId);
  const c = circulos?.length ? circulos[Math.min(elegido, circulos.length - 1)] : null; // la pinchada (o, sin pinchar, la del ratón)
  // El sector elegido, esté en la rama que se ve o no (se puede haber pasado el ratón por otra).
  const sector = useMemo(() => {
    for (const x of circulos || []) { const s = x.sistemas.find(y => y.id === sectorId); if (s) return { s, c: x }; }
    return null;
  }, [circulos, sectorId]);
  const gruposSector = useRed(sector?.s.id || null);
  const objetivo = useMemo(() => gruposSector?.find(esObjetivos)?.entradas.find(e => e.pagina_id === bloqueId) || null, [gruposSector, bloqueId]);
  const gruposObjetivo = useRed(objetivo?.pagina_id || null);

  // El selector de territorio, en la barra de arriba (su hueco lo deja `CabeceraSitio`).
  const [hueco, setHueco] = useState<Element | null>(null);
  useEffect(() => { setHueco(document.querySelector('[data-ranura-territorio-barra]')); }, []);
  // La ruta de la barra pegada sale cuando los bloques ya no se ven.
  const arriba = useAltoCabecera();
  const bloques = useRef<HTMLDivElement>(null);
  const [bloquesFuera, setBloquesFuera] = useState(false);
  useEffect(() => {
    const el = bloques.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => setBloquesFuera(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: `-${arriba + 60}px 0px 0px 0px` });
    o.observe(el);
    return () => o.disconnect();
  }, [arriba, !!circulos?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const selector = hueco && t.conTerritorio ? createPortal(
    <ElegirTerritorio mini alinear="izquierda" opciones={t.opciones} conDatos={t.conDatos} elegido={t.territorio} onElegir={t.elegirTerritorio} />, hueco) : null;
  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando…</div>;
  if (!circulos.length || !c) return <div className="py-24 text-center text-slate-500">{selector}Las categorías aún no tienen sector: añade a su base de datos una columna de selección «Sector».</div>;
  // SE ABRE SEGÚN SE PINCHA (2026-10-28, Eugenio: «al principio, según pinchas en una categoría, se divide la pantalla
  // en dos; si pinchas en una de sus secciones, en tres; así el tamaño se mantiene grande cuando no profundizamos y se
  // hace más pequeño a medida que profundizamos»). Paso 0: solo el arco, grande. Paso 1: el arco y la rama pinchada.
  // Paso 2: los tres bloques. Volver a pinchar lo elegido lo cierra (la rama, o el sector).
  const ramaPinchada = circulos.some(x => x.clave === q.get('circulo'));
  const paso = sector ? 2 : ramaPinchada ? 1 : 0;
  const pincharRama = (i: number) => {
    const x = circulos[i];
    if (ramaPinchada && x.clave === q.get('circulo')) poner({ circulo: null, sector: null, bloque: null });
    else poner({ circulo: x.clave, sector: null, bloque: null });
    if (window.innerWidth < 768) setTimeout(() => document.querySelector('[data-circulo-elegido-c2]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };
  // Desde 768 px en columnas; el tercer bloque, el más ancho (Eugenio: «un hueco más grande para la tercera parte»),
  // y el arco, más grande que al principio (Eugenio: «haz que el bloque 1 sea más grande»).
  const rejilla = paso === 2 ? 'md:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(0,8fr)] md:gap-6 xl:gap-8'
    : paso === 1 ? 'md:grid-cols-[minmax(0,6fr)_minmax(0,9fr)] md:gap-10' : '';
  // Con algo pinchado, los bloques miden un tercio largo de la pantalla (antes la mitad; Eugenio: «que sea más pequeño
  // este menú expansivo de arriba, para ver fácilmente el contenido de abajo»): con seis categorías y seis temáticas,
  // caben en dos o tres filas.
  const medio = paso > 0 ? 'md:h-[max(250px,calc(36dvh))]' : '';
  // Cada paso de la ruta con sus hermanos, para el desplegable. Otro sector sube a los bloques (aún no hay categoría
  // elegida); otra categoría o temática cambia lo de abajo sin moverse.
  const rama = sector?.c || c;
  const tematicas = gruposSector?.find(esObjetivos)?.entradas.filter(e => e.pagina_id) || [];
  const ruta: PasoRuta[] = [
    { nombre: rama.nombre, imagen: dibujoPata(rama.clave), elegido: rama.clave,
      opciones: circulos.map(x => ({ id: x.clave, nombre: x.nombre, imagen: dibujoPata(x.clave) })),
      alElegir: id => { poner({ circulo: id, sector: null, bloque: null }); window.scrollTo({ top: 0, behavior: 'smooth' }); } },
    ...(sector ? [{ nombre: sector.s.titulo, imagen: sector.s.imagen, elegido: sector.s.id,
      opciones: rama.sistemas.map(x => ({ id: x.id, nombre: x.titulo, imagen: x.imagen })),
      alElegir: (id: string) => poner({ circulo: rama.clave, sector: id, bloque: null }) }] : []),
    ...(sector ? [{ nombre: objetivo ? corto(objetivo) : 'Temática', imagen: objetivo?.imagen, elegido: objetivo?.pagina_id || null,
      opciones: tematicas.map(e => ({ id: e.pagina_id!, nombre: corto(e), imagen: e.imagen })),
      alElegir: (id: string) => poner({ bloque: id }) }] : []),
  ];
  return (
    // A todo lo ancho de la ventana (como el mapa): el arco pegado a la izquierda y sitio para los tres bloques.
    <div className="px-4 pt-1 sm:px-8" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }} data-vista-circulo2 data-paso={paso}>
      {selector}
      <div ref={bloques} className={`grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 ${rejilla} ${medio}`} data-bloques-circulo>
        <div className={`mx-auto flex w-full min-h-0 items-start ${paso === 0 ? 'max-w-[680px]' : 'max-w-[560px] md:mx-0'}`}>
          {/* Sin nada pinchado, ninguna rama marcada (el ratón solo la ilumina). */}
          <div className="w-full">
            <Arco circulos={circulos} elegido={paso === 0 ? -1 : elegido} elegir={pincharRama} ver={ver} dibujoDe={dibujoPata}
              clase={paso === 0 ? undefined : 'md:max-h-[max(250px,calc(36dvh))]'} />
            {paso === 0 && <p className="mt-3 text-center text-sm font-semibold text-slate-500">Pincha una rama para ver sus sectores.</p>}
          </div>
        </div>
        {paso >= 1 && (
          <div className="min-h-0 min-w-0 animate-in fade-in duration-300">
            <PanelCirculo c={c} t={t} apretado={paso === 2} ancla="data-circulo-elegido-c2" elegidoId={sector?.s.id || null}
              alElegir={s => {
                poner({ sector: s.id === sectorId ? null : s.id, bloque: null, circulo: c.clave });
                if (window.innerWidth < 768) setTimeout(() => document.querySelector('[data-bloque-sector]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
              }} />
          </div>
        )}
        {paso === 2 && sector && (
          <div className="min-h-0 min-w-0 animate-in fade-in duration-300">
            <BloqueSector s={sector.s} c={sector.c} grupos={gruposSector} notas={notas} bloque={bloqueId}
              alElegir={o => {
                poner({ bloque: o.pagina_id === bloqueId ? null : o.pagina_id });
                // Las pestañas ya asoman en la mitad de abajo; solo en el móvil hay que bajar hasta ellas.
                if (window.innerWidth < 768) setTimeout(() => document.querySelector('[data-detalle-circulo2]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
              }} />
          </div>
        )}
      </div>
      {sector && (objetivo
        ? <Detalle paginaId={objetivo.pagina_id!} titulo={objetivo.titulo} grupos={gruposObjetivo} quitarObjetivos={false} ruta={ruta} rutaVisible={bloquesFuera} arriba={arriba} />
        : <Detalle paginaId={sector.s.id} titulo={sector.s.titulo} grupos={gruposSector} quitarObjetivos ruta={ruta} rutaVisible={bloquesFuera} arriba={arriba} />)}
    </div>
  );
}
