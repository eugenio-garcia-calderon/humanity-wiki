import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import ElegirTerritorio from '../bloquesDatos/filtroTerritorio/ElegirTerritorio';
import { miniatura } from '../../utils/miniatura';
import { useSitio } from './ContextoSitio';
import { Arco } from './ArcoCapas';
import { colsUnaFila, PanelCirculo, useCirculoElegido, useCirculosTerritorio } from './PanelCirculo';
import { leerSistemas, type Circulo, type Sistema } from './circulosDatos';
import NotaCirculo from './NotaCirculo';
import { Eslabon, Union } from './Eslabon';
import { PasoRuta } from './PasoRuta';

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
            <ul className="grid min-h-0 flex-1 grid-cols-2 gap-2.5 md:grid-cols-3 md:[grid-template-rows:repeat(var(--filas3),minmax(0,1fr))] lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] lg:[grid-template-rows:repeat(var(--filas),minmax(0,1fr))]"
              style={{ ['--filas3' as string]: Math.ceil(objetivos.length / 3), ['--cols' as string]: colsUnaFila(objetivos.length), ['--filas' as string]: Math.ceil(objetivos.length / colsUnaFila(objetivos.length)) }} data-objetivos-sector>
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

// LAS PESTAÑAS DE ABAJO: primero las cinco de siempre, con su nombre corto, aunque estén vacías (se ven apagadas); después,
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

/** Debajo: las relaciones de lo elegido en pestañas horizontales (proyectos, soluciones, indicadores, personas,
 *  publicaciones…). Las filas en carrusel duraron una tarde (2026-10-28, Eugenio: «muestra los proyectos, herramientas,
 *  personas y fallos en modo de pestaña en horizontal, como estaba antes»). */
function Detalle({ paginaId, titulo, grupos, quitarObjetivos, arriba }: {
  paginaId: string; titulo: string; grupos: Grupo[] | null; quitarObjetivos: boolean; arriba: number;
}) {
  const sitio = useSitio();
  const enlace = (id: string) => (sitio ? sitio.enlacePagina(id) : `/p/${id}`);
  const pestanas = useMemo(() => pestanasDe(grupos || [], quitarObjetivos), [grupos, quitarObjetivos]);
  const [activa, setActiva] = useState<string | null>(null);
  // Al cambiar de temática o de categoría, la primera pestaña con algo dentro.
  useEffect(() => { setActiva(null); }, [paginaId]);
  const elegida = pestanas.find(p => p.clave === activa) || pestanas.find(p => p.entradas.length) || pestanas[0];
  return (
    // Al menos una pantalla de alto, para que la barra de las pestañas se quede pegada aunque haya pocas tarjetas.
    <section data-detalle-circulo2 className="mt-5" style={{ minHeight: `calc(100dvh - ${arriba}px)` }}>
      <div className="sticky z-30 -mx-4 border-y border-slate-200 bg-white/95 backdrop-blur sm:-mx-8" style={{ top: arriba }} data-pestanas-circulo>
        <div className="flex items-center gap-3 px-4 py-2 sm:px-8">
          <div role="tablist" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {pestanas.map(p => {
              const on = p === elegida, vacia = !p.entradas.length;
              return (
                <button key={p.clave} type="button" role="tab" aria-selected={on} disabled={vacia} onClick={() => setActiva(p.clave)} data-pestana={p.nombre} title={p.completo}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-colors ${on ? 'bg-slate-900 text-white' : vacia ? 'text-slate-300' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                  {p.nombre} <span className={`text-xs ${on ? 'text-slate-300' : 'text-slate-400'}`}>{p.entradas.length}</span>
                </button>
              );
            })}
          </div>
          <Link to={enlace(paginaId)} onClick={() => window.scrollTo(0, 0)} className="hidden shrink-0 items-center gap-1 text-sm font-bold text-slate-600 hover:text-slate-900 sm:inline-flex" title={`Abrir la página de ${titulo}`}>
            <span className="max-w-[16rem] truncate">{titulo}</span> <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="pt-4" role="tabpanel">
        {!grupos ? <p className="py-6 text-sm text-slate-400">Cargando…</p>
          : !elegida?.entradas.length ? <p className="py-6 text-sm text-slate-500">Todavía no tiene proyectos, soluciones, indicadores, personas ni publicaciones enlazados.</p>
          : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" data-grupo-detalle={elegida.nombre}>
              {elegida.entradas.map(x => (
                <li key={x.fila_id}>
                  {x.pagina_id ? (
                    <Link to={enlace(x.pagina_id)} onClick={() => window.scrollTo(0, 0)}
                      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
                      <span className="relative block aspect-[16/10] w-full bg-slate-50">
                        {x.imagen ? <img src={miniatura(x.imagen, 240)} alt="" className="absolute inset-0 h-full w-full object-contain p-1.5" /> : x.icono ? <span className="grid h-full place-items-center text-3xl">{x.icono}</span> : null}
                      </span>
                      <span lang="es" className="hyphens-auto px-2.5 py-2 text-[13px] font-bold leading-tight text-slate-900">{x.titulo}</span>
                    </Link>
                  ) : <span className="block rounded-xl border border-slate-200 px-2.5 py-2 text-[13px] font-bold text-slate-900">{x.titulo}</span>}
                </li>
              ))}
            </ul>
          )}
      </div>
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

  // LA RUTA, EN LA CABECERA (2026-10-28, Eugenio: «a medida que se va haciendo clic, la ruta arriba, centrada, como en
  // las páginas de las temáticas»): el territorio y, según se pincha, sector › categoría › temática, cada uno con su
  // desplegable para cambiar a un hermano. Va en el hueco `data-ranura-ruta` de `CabeceraSitio`.
  const [hueco, setHueco] = useState<Element | null>(null);
  useEffect(() => { setHueco(document.querySelector('[data-ranura-ruta]')); }, []);
  const arriba = useAltoCabecera();
  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando…</div>;
  if (!circulos.length || !c) return <div className="py-24 text-center text-slate-500">Las categorías aún no tienen sector: añade a su base de datos una columna de selección «Sector».</div>;
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
  // UN SOLO SELECTOR A LA VEZ (2026-10-28, Eugenio: «quita el bloque 1, que esa información ya está arriba, y deja solo
  // las categorías; y al elegir una, quita el bloque 2 y deja solo el 3: siempre solo un selector»). La ruta de la
  // cabecera dice dónde se está y deja volver o cambiar. Con algo elegido, el bloque mide un tercio de la pantalla y
  // reparte sus tarjetas en una fila.
  const medio = paso > 0 ? 'md:h-[max(250px,calc(36dvh))]' : '';
  // Cada paso con sus hermanos. Otro sector sube a los bloques (aún no hay categoría elegida); otra categoría o temática
  // cambia lo de abajo sin moverse.
  const rama = sector?.c || c;
  const tematicas = gruposSector?.find(esObjetivos)?.entradas.filter(e => e.pagina_id) || [];
  const selector = hueco ? createPortal(
    <Eslabon circulo>
      {t.conTerritorio && <ElegirTerritorio segmento alinear="izquierda" opciones={t.opciones} conDatos={t.conDatos} elegido={t.territorio} onElegir={t.elegirTerritorio} />}
      {paso > 0 && (
        <>
          {t.conTerritorio && <Union />}
          <PasoRuta etiqueta={rama.nombre} titulo={rama.nombre} icono={dibujoPata(rama.clave)} actual={rama.clave} apagado={!!sector}
            opciones={circulos.map(x => ({ id: x.clave, nombre: x.nombre, icono: dibujoPata(x.clave) }))}
            alElegir={id => { poner({ circulo: id, sector: null, bloque: null }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
        </>
      )}
      {sector && (
        <>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <PasoRuta etiqueta={sector.s.titulo} titulo={sector.s.titulo} icono={sector.s.imagen} actual={sector.s.id} apagado={!!objetivo}
            opciones={rama.sistemas.map(x => ({ id: x.id, nombre: x.titulo, icono: x.imagen }))}
            alElegir={id => poner({ circulo: rama.clave, sector: id, bloque: null })} />
        </>
      )}
      {objetivo && (
        <>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <PasoRuta etiqueta={corto(objetivo)} titulo={objetivo.titulo} icono={objetivo.imagen} actual={objetivo.pagina_id}
            opciones={tematicas.map(e => ({ id: e.pagina_id!, nombre: corto(e), icono: e.imagen }))}
            alElegir={id => poner({ bloque: id })} />
        </>
      )}
    </Eslabon>, hueco) : null;
  return (
    // A todo lo ancho de la ventana (como el mapa): el arco pegado a la izquierda y sitio para los tres bloques.
    <div className="px-4 pt-1 sm:px-8" style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)' }} data-vista-circulo2 data-paso={paso}>
      {selector}
      <div className={`grid grid-cols-[minmax(0,1fr)] items-stretch ${medio}`} data-bloques-circulo>
        {paso === 0 && (
          <div className="mx-auto w-full max-w-[680px]">
            {/* Sin nada pinchado, ninguna rama marcada (el ratón solo la ilumina). */}
            <Arco circulos={circulos} elegido={-1} elegir={pincharRama} ver={ver} dibujoDe={dibujoPata} />
            <p className="mt-3 text-center text-sm font-semibold text-slate-500">Pincha una rama para ver sus categorías.</p>
          </div>
        )}
        {paso === 1 && (
          <div className="min-h-0 min-w-0 animate-in fade-in duration-300">
            <PanelCirculo c={c} t={t} ancho ancla="data-circulo-elegido-c2" elegidoId={null}
              alElegir={s => {
                poner({ sector: s.id, bloque: null, circulo: c.clave });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} />
          </div>
        )}
        {paso === 2 && sector && (
          <div className="min-h-0 min-w-0 animate-in fade-in duration-300">
            <BloqueSector s={sector.s} c={sector.c} grupos={gruposSector} notas={notas} bloque={bloqueId}
              alElegir={o => {
                poner({ bloque: o.pagina_id === bloqueId ? null : o.pagina_id });
                // Las pestañas ya asoman debajo; solo en el móvil hay que bajar hasta ellas.
                if (window.innerWidth < 768) setTimeout(() => document.querySelector('[data-detalle-circulo2]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
              }} />
          </div>
        )}
      </div>
      {sector && (objetivo
        ? <Detalle paginaId={objetivo.pagina_id!} titulo={objetivo.titulo} grupos={gruposObjetivo} quitarObjetivos={false} arriba={arriba} />
        : <Detalle paginaId={sector.s.id} titulo={sector.s.titulo} grupos={gruposSector} quitarObjetivos arriba={arriba} />)}
    </div>
  );
}
