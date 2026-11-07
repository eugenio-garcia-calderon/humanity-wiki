import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { geoConicConformal, geoNaturalEarth1, type GeoProjection } from 'd3-geo';
import { ArrowRight, MapPin } from 'lucide-react';
import { PUNTOS_PORTADA as P, type PuntosPortada } from './mapaPortadaPuntos';
import { miniatura } from '../../utils/miniatura';
import { cn } from '../../utils/cn';
import useCerrarAlPulsarFuera from '../../hooks/useCerrarAlPulsarFuera';
import { enumerar, fotoPropia, type LugarPortada, type ProyectoPortada } from './portadaEscaparate';

// ============================================================================
// EL MAPA DE «DÓNDE TRABAJAMOS», DIBUJADO (2026-11-07, portada del escaparate)
// ============================================================================
// La parte pesada del mapa, que se descarga solo cuando la sección se acerca a la
// pantalla (`MapaProyectosSitio`): las proyecciones de d3-geo y la trama de puntos
// (`mapaPortadaPuntos.ts`, calculada sin conexión con Natural Earth). No se pide nada
// a terceros: ni teselas, ni tipografías, ni rastreadores.
//
// Cada proyecto con `lugar` es una chincheta del color de su estado (el mismo punto
// que su tarjeta). Las que caen tan cerca que se pisarían se juntan en un círculo con
// el número, y al pulsarlo se ven todas. Al pasar el ratón, al llegar con el teclado
// o al tocar, sale una ficha con la portada, el nombre, el lugar y el enlace.
//
// El mundo se encuadra solo: enseña la parte del planeta donde hay proyectos (hoy, de
// América a África), con un ancho mínimo para que siga leyéndose como el mundo. Si
// mañana hay un proyecto en Asia, el encuadre se abre hasta él.

type Vista = 'mundo' | 'espana';
type Caja = [[number, number], [number, number]];
type Marco = { x: number; y: number; w: number; h: number };

const conicaEspana = () => geoConicConformal().parallels(P.espana.paralelos).rotate(P.espana.giro).scale(P.espana.escala);
const PROYECCION: Record<Vista | 'canarias', GeoProjection> = {
  mundo: geoNaturalEarth1().scale(P.mundo.escala).translate(P.mundo.traslado),
  espana: conicaEspana().translate(P.espana.traslado),
  canarias: conicaEspana().translate(P.canarias.traslado),
};
const dentro = (l: LugarPortada, [[x0, y0], [x1, y1]]: Caja) => l.lon >= x0 && l.lon <= x1 && l.lat >= y0 && l.lat <= y1;
/** ¿Sale en el detalle de España (la península y Baleares, o las Canarias)? */
export const enDetalle = (l: LugarPortada) => dentro(l, P.espana.caja) || dentro(l, P.canarias.caja);

/** La proporción del panel del mundo (ancho / alto); la de España es la de su lienzo. */
export const PROPORCION_MUNDO = 1.6;
const ANCHO_MINIMO_MUNDO = 600;

// El recuadro de las Canarias, abajo a la izquierda y a media escala. Siempre, aunque no haya
// proyectos allí (2026-11-07, revisión): un mapa de España sin las Canarias se nota enseguida.
const CANARIAS_ESCALA = 0.55;
const CANARIAS_EN = { x: 10, y: P.espana.alto - P.canarias.alto * CANARIAS_ESCALA - 10 };

/** El nombre de cada país de la trama en español (`Intl`), para iluminar los que tienen proyectos. */
function codigosDe(paises: string[]): Set<string> {
  const plano = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const buscados = new Set(paises.map(plano));
  const out = new Set<string>();
  try {
    const dn = new Intl.DisplayNames(['es'], { type: 'region' });
    const codigos = new Set<string>();
    for (const t of [P.mundo, P.espana, P.canarias]) for (const fila of t.filas) for (const [c] of fila) codigos.add(c);
    for (const c of codigos) if (/^[A-Z]{2}$/.test(c) && buscados.has(plano(dn.of(c) || ''))) out.add(c);
  } catch { /* un navegador sin `Intl.DisplayNames`: el mapa sin países iluminados */ }
  return out;
}

/** La trama de una vista en dos caminos SVG: los países con proyectos y el resto. */
function caminos(t: PuntosPortada['mundo'] | PuntosPortada['canarias'], activos: Set<string>) {
  const dy = t.paso * Math.sqrt(3) / 2;
  const on: string[] = [], off: string[] = [];
  t.filas.forEach((tramos, r) => {
    const y = (r * dy).toFixed(1), des = r % 2 ? t.paso / 2 : 0;
    for (const [pais, c0, n] of tramos) {
      const a = activos.has(pais) ? on : off;
      for (let c = c0; c < c0 + n; c++) a.push(`M${(c * t.paso + des).toFixed(1)} ${y}h0`);
    }
  });
  return { on: on.join(''), off: off.join('') };
}

type Grupo = { clave: string; x: number; y: number; proyectos: ProyectoPortada[] };

/** El radio en pantalla de lo que se dibuja: el círculo de un grupo (26 px) o el punto de uno solo
 *  (14 px y su anillo blanco). */
const radioMarca = (n: number) => (n > 1 ? 13 : 9);

/** Las chinchetas de una vista, juntas cuando se pisarían (a menos de `umbral` px en pantalla). */
export function agrupar(puntos: Array<{ p: ProyectoPortada; x: number; y: number }>, escala: number, umbral: number): Grupo[] {
  const grupos: Array<Grupo & { sx: number; sy: number }> = [];
  for (const pt of [...puntos].sort((a, b) => a.x - b.x || a.y - b.y)) {
    const cerca = grupos.find(g => Math.hypot((g.x - pt.x) * escala, (g.y - pt.y) * escala) < umbral);
    if (cerca) {
      cerca.proyectos.push(pt.p); cerca.sx += pt.x; cerca.sy += pt.y;
      cerca.x = cerca.sx / cerca.proyectos.length; cerca.y = cerca.sy / cerca.proyectos.length;
    } else grupos.push({ clave: pt.p.pagina, x: pt.x, y: pt.y, sx: pt.x, sy: pt.y, proyectos: [pt.p] });
  }
  // EL SEGUNDO PASE (2026-11-07, revisión de la portada): el primero junta los puntos al irlos
  // añadiendo, pero dos grupos ya hechos pueden quedar pegados. A 1440 px Madrid salía partido en
  // dos círculos, «6» y «2», con el rótulo «Madrid» en los dos. Se funden mientras sus marcas se
  // toquen en pantalla (la suma de sus radios y 4 px de aire), hasta que no quede ninguna pareja así.
  for (let otra = true; otra;) {
    otra = false;
    busca: for (let i = 0; i < grupos.length; i++) {
      for (let j = i + 1; j < grupos.length; j++) {
        const a = grupos[i], b = grupos[j];
        if (Math.hypot((a.x - b.x) * escala, (a.y - b.y) * escala) >= radioMarca(a.proyectos.length) + radioMarca(b.proyectos.length) + 4) continue;
        a.proyectos.push(...b.proyectos); a.sx += b.sx; a.sy += b.sy;
        a.x = a.sx / a.proyectos.length; a.y = a.sy / a.proyectos.length;
        grupos.splice(j, 1);
        otra = true;
        break busca;
      }
    }
  }
  return grupos.map(({ sx: _x, sy: _y, ...g }) => ({ ...g, clave: g.proyectos.map(p => p.pagina).sort().join('-') }));
}

/** El trozo del mundo que se enseña: el que abarca las chinchetas y el recuadro de España, con aire. */
function encuadrar(cosas: Array<{ x: number; y: number }>): Marco {
  const T = P.mundo;
  if (!cosas.length) return { x: 0, y: 0, w: T.ancho, h: T.alto };
  const xs = cosas.map(c => c.x), ys = cosas.map(c => c.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const w = Math.min(T.ancho, Math.max(ANCHO_MINIMO_MUNDO, x1 - x0 + 160, (y1 - y0 + 110) * PROPORCION_MUNDO));
  const h = w / PROPORCION_MUNDO;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const x = Math.max(0, Math.min(cx - w / 2, T.ancho - w));
  // Si el trozo es más alto que el mundo, se centra (sobra cielo y mar por arriba y por abajo).
  const y = h >= T.alto ? (T.alto - h) / 2 : Math.max(0, Math.min(cy - h / 2, T.alto - h));
  return { x, y, w, h };
}

/** «Cañada Real Galiana, Madrid · España». */
export function textoLugar(l: LugarPortada, conPais = true): string {
  const sitio = l.region && l.region !== l.nombre ? `${l.nombre}, ${l.region}` : l.nombre;
  return conPais && l.pais !== l.nombre ? `${sitio} · ${l.pais}` : sitio;
}

/** El nombre de un grupo: su lugar si es uno solo; si no, su provincia en común; si no, la que más
 *  se repite «y alrededores» (Madrid y Toledo, juntos en el móvil). Si son de países distintos, los
 *  países («Honduras y Colombia», juntos en un móvil pequeño). */
function nombreGrupo(g: Grupo): string {
  const ls = g.proyectos.map(p => p.lugar!);
  if (ls.every(l => l.nombre === ls[0].nombre)) return ls[0].nombre;
  if (ls[0].region && ls.every(l => l.region === ls[0].region)) return ls[0].region;
  if (!ls.every(l => l.pais === ls[0].pais)) return enumerar([...new Set(ls.map(l => l.pais))]);
  const veces = new Map<string, number>();
  for (const l of ls) { const k = l.region || l.nombre; veces.set(k, (veces.get(k) || 0) + 1); }
  return `${[...veces.entries()].sort((a, b) => b[1] - a[1])[0][0]} y alrededores`;
}

/** Lo que se escribe junto a una chincheta: en el mundo, el país; en España, el lugar. */
function rotuloGrupo(g: Grupo, vista: Vista): string {
  const ls = g.proyectos.map(p => p.lugar!);
  if (vista === 'mundo' && ls.every(l => l.pais === ls[0].pais)) return ls[0].pais;
  return nombreGrupo(g).replace(/ y alrededores$/, '');
}

let lienzo: CanvasRenderingContext2D | null = null;
/** El ancho de un rótulo a 11 px en negrita, medido con la letra de la página. */
function anchoTexto(t: string): number {
  try {
    lienzo ||= document.createElement('canvas').getContext('2d');
    if (lienzo) {
      lienzo.font = `700 11px ${getComputedStyle(document.body).fontFamily}`;
      return lienzo.measureText(t).width;
    }
  } catch { /* sin lienzo: se estima */ }
  return t.length * 6.4;
}

const GRIS_ESTADO = '#94a3b8';

export default function MapaCapa({ vista, proyectos, enlace, detalle, alIrDetalle, etiquetaDetalle }: {
  vista: Vista;
  /** Los proyectos con lugar (todos: cada vista coge los suyos). */
  proyectos: ProyectoPortada[];
  enlace: (p: ProyectoPortada) => string;
  /** En el mundo: cuántos hay en el detalle de España (el recuadro con su número). */
  detalle?: number;
  alIrDetalle?: () => void;
  etiquetaDetalle?: string;
}) {
  const t = vista === 'mundo' ? P.mundo : P.espana;
  const caja = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    // `clientWidth` y no `getBoundingClientRect`: la página puede ir con `zoom` (`.pagina-chica`,
    // un 90 %), y los rótulos y las fichas se colocan en los píxeles de la propia capa.
    const medir = () => setAncho(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const suyos = useMemo(() => proyectos.filter(p => p.lugar && (vista === 'espana' ? enDetalle(p.lugar) : !enDetalle(p.lugar))), [proyectos, vista]);
  const conCanarias = vista === 'espana';
  const activos = useMemo(() => codigosDe(proyectos.map(p => p.lugar!.pais)), [proyectos]);
  const trama = useMemo(() => caminos(t, activos), [t, activos]);
  const tramaCanarias = useMemo(() => (conCanarias ? caminos(P.canarias, activos) : null), [conCanarias, activos]);

  // Cada proyecto, en el lienzo de su vista (las Canarias, dentro de su recuadro).
  const puntos = useMemo(() => suyos.map(p => {
    const l = p.lugar!;
    if (vista === 'espana' && dentro(l, P.canarias.caja)) {
      const [x, y] = PROYECCION.canarias([l.lon, l.lat]) || [0, 0];
      return { p, x: CANARIAS_EN.x + x * CANARIAS_ESCALA, y: CANARIAS_EN.y + y * CANARIAS_ESCALA };
    }
    const [x, y] = PROYECCION[vista]([l.lon, l.lat]) || [-1, -1];
    return { p, x, y };
  }).filter(q => q.x >= 0 && q.x <= t.ancho && q.y >= 0 && q.y <= t.alto), [suyos, vista, t]);

  // El recuadro de España en el mundo, con su número: lleva al detalle.
  const recuadro = useMemo(() => {
    if (vista !== 'mundo' || !detalle) return null;
    const [[x0, y0], [x1, y1]] = P.espana.caja;
    const esquinas = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(c => PROYECCION.mundo(c as [number, number])!);
    const xs = esquinas.map(e => e[0]), ys = esquinas.map(e => e[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }, [vista, detalle]);

  // Lo que se ve del lienzo: el mundo, encuadrado; España, entera.
  const marco: Marco = useMemo(() => (vista === 'mundo'
    ? encuadrar([...puntos, ...(recuadro ? [{ x: recuadro.x, y: recuadro.y }, { x: recuadro.x + recuadro.w, y: recuadro.y + recuadro.h }] : [])])
    : { x: 0, y: 0, w: t.ancho, h: t.alto }), [vista, puntos, recuadro, t]);
  const escala = ancho / marco.w;
  const grupos = useMemo(() => (escala ? agrupar(puntos, escala, vista === 'mundo' ? 12 : 19) : []), [puntos, escala, vista]);

  // LOS RÓTULOS, COMO EN UN MAPA DE PERIÓDICO: el nombre junto a cada chincheta, a la derecha,
  // a la izquierda, encima o debajo, donde quepa sin pisar otra chincheta ni otro rótulo. Si no
  // cabe, no se escribe (el nombre sigue en la ficha y en la etiqueta del botón).
  const rotulos = useMemo(() => {
    if (!escala || ancho < 280) return [];
    const altoPx = marco.h * escala, H = 14, M = 3;
    const cajaDe = (g: Grupo) => {
      // El radio de la marca y un píxel de aire: el rótulo queda a 4 px del punto, no pegado a él.
      const x = (g.x - marco.x) * escala, y = (g.y - marco.y) * escala, r = radioMarca(g.proyectos.length) + 1;
      return { x, y, r };
    };
    const ocupado = grupos.map(g => { const { x, y, r } = cajaDe(g); return [x - r, y - r, x + r, y + r]; });
    const pisa = (a: number[]) => ocupado.some(b => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]);
    // El recuadro de España en el mundo (y su número) también ocupa sitio, y el de las Canarias.
    if (recuadro) ocupado.push([(recuadro.x - marco.x) * escala - 4, (recuadro.y - marco.y) * escala - 26, (recuadro.x + recuadro.w - marco.x) * escala + 70, (recuadro.y + recuadro.h - marco.y) * escala + 4]);
    if (conCanarias) ocupado.push([CANARIAS_EN.x * escala, CANARIAS_EN.y * escala, (CANARIAS_EN.x + P.canarias.ancho * CANARIAS_ESCALA) * escala, (CANARIAS_EN.y + P.canarias.alto * CANARIAS_ESCALA) * escala]);
    const out: Array<{ clave: string; texto: string; x: number; y: number }> = [];
    // Un nombre se escribe una sola vez: dos rótulos «Madrid» seguidos parecen un error.
    const escritos = new Set<string>();
    for (const g of [...grupos].sort((a, b) => b.proyectos.length - a.proyectos.length)) {
      const texto = rotuloGrupo(g, vista), w = anchoTexto(texto) + 2;
      if (escritos.has(texto)) continue;
      const { x, y, r } = cajaDe(g);
      const sitios = [[x + r + M, y - H / 2], [x - r - M - w, y - H / 2], [x - w / 2, y - r - M - H], [x - w / 2, y + r + M]];
      for (const [lx, ly] of sitios) {
        const c = [lx, ly, lx + w, ly + H];
        if (lx < 4 || ly < 26 || lx + w > ancho - 4 || ly + H > altoPx - 4 || pisa(c)) continue;
        ocupado.push(c);
        escritos.add(texto);
        out.push({ clave: g.clave, texto, x: lx, y: ly });
        break;
      }
    }
    return out;
  }, [grupos, escala, ancho, marco, recuadro, vista, conCanarias]);

  // La ficha abierta: al pasar (se cierra sola al salir) o fija (al pulsar o tocar).
  const [abierta, setAbierta] = useState<{ clave: string; fija: boolean } | null>(null);
  const salida = useRef<number | undefined>(undefined);
  const entrada = useRef<number | undefined>(undefined);
  const activa = useRef<HTMLDivElement>(null);
  const abrir = (clave: string, fija: boolean) => { window.clearTimeout(salida.current); window.clearTimeout(entrada.current); setAbierta({ clave, fija }); };
  const soltar = () => { window.clearTimeout(salida.current); salida.current = window.setTimeout(() => setAbierta(a => (a?.fija ? a : null)), 220); };
  // Al cerrar con Escape desde dentro de la ficha, el foco vuelve a su chincheta (2026-11-07,
  // revisión): si no, caía en <body> y quien navega con el teclado o un lector perdía el sitio.
  useCerrarAlPulsarFuera(activa, !!abierta, () => {
    const envoltorio = activa.current;
    const boton = envoltorio?.contains(document.activeElement) ? envoltorio.querySelector<HTMLButtonElement>('button') : null;
    setAbierta(null);
    boton?.focus({ preventScroll: true });
  });
  useEffect(() => () => { window.clearTimeout(salida.current); window.clearTimeout(entrada.current); }, []);
  // Una ficha abierta a propósito (al pulsar o tocar) se ve entera: si queda bajo la barra fija
  // de arriba o se sale por abajo, la página se mueve lo justo. Al pasar el ratón, no.
  useEffect(() => {
    if (!abierta?.fija) return;
    const ficha = activa.current?.querySelector<HTMLElement>('[role="group"]');
    if (!ficha) return;
    const r = ficha.getBoundingClientRect();
    const tope = (document.querySelector('[data-cabecera-sitio]')?.getBoundingClientRect().bottom ?? 0) + 8;
    const fondo = window.innerHeight - 8;
    const mover = r.top < tope ? r.top - tope : r.bottom > fondo ? Math.min(r.bottom - fondo, r.top - tope) : 0;
    if (mover) window.scrollBy({ top: mover, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [abierta]);
  const base = useId();

  const izqPct = (x: number) => `${((x - marco.x) / marco.w) * 100}%`;
  const arribaPct = (y: number) => `${((y - marco.y) / marco.h) * 100}%`;
  const grosor = t.paso * (vista === 'mundo' ? 0.56 : 0.44);

  return (
    <div ref={caja} className="absolute inset-0">
      <svg viewBox={`${marco.x} ${marco.y} ${marco.w} ${marco.h}`} className="absolute inset-0 h-full w-full" aria-hidden focusable="false">
        <path d={trama.off} className={vista === 'mundo' ? 'stroke-slate-300' : 'stroke-slate-200'} strokeWidth={grosor} strokeLinecap="round" fill="none" />
        <path d={trama.on} className={vista === 'mundo' ? 'stroke-amber-400' : 'stroke-amber-300/65'} strokeWidth={grosor} strokeLinecap="round" fill="none" />
        {tramaCanarias && (
          <g transform={`translate(${CANARIAS_EN.x} ${CANARIAS_EN.y}) scale(${CANARIAS_ESCALA})`}>
            <rect x={0} y={0} width={P.canarias.ancho} height={P.canarias.alto} rx={14} className="fill-white stroke-slate-300" strokeWidth={3} />
            <path d={tramaCanarias.off} className="stroke-slate-200" strokeWidth={grosor / CANARIAS_ESCALA * 0.9} strokeLinecap="round" fill="none" />
            <path d={tramaCanarias.on} className="stroke-amber-300/80" strokeWidth={grosor / CANARIAS_ESCALA * 0.9} strokeLinecap="round" fill="none" />
          </g>
        )}
      </svg>
      {/* Su nombre, arriba a la izquierda del recuadro (en el mar): sin él, parecía una caja vacía. En
          un recuadro estrecho (el móvil), más pequeño y menos espaciado, para que no se salga. */}
      {tramaCanarias && P.canarias.ancho * CANARIAS_ESCALA * escala >= 70 && (
        <span aria-hidden className={cn('pointer-events-none absolute font-black uppercase leading-none text-slate-500',
          P.canarias.ancho * CANARIAS_ESCALA * escala < 110 ? 'text-[8px] tracking-[0.08em]' : 'text-[9px] tracking-[0.16em]')}
          style={{ left: izqPct(CANARIAS_EN.x + 12), top: arribaPct(CANARIAS_EN.y + 12) }}>Canarias</span>
      )}

      {/* El recuadro de España en el mundo: se ve dónde cae el detalle y cuántos proyectos hay dentro. */}
      {recuadro && ancho > 0 && (
        <>
          <span aria-hidden className="pointer-events-none absolute rounded-[3px] border-[1.5px] border-amber-600"
            style={{ left: izqPct(recuadro.x - 2), top: arribaPct(recuadro.y - 2), width: Math.max(14, (recuadro.w + 4) * escala), height: Math.max(10, (recuadro.h + 4) * escala) }} />
          <button type="button" onClick={alIrDetalle} aria-label={`${etiquetaDetalle || 'España'}: ${detalle} proyectos. Ver el detalle`}
            className="absolute z-10 inline-flex -translate-y-full items-center gap-1 whitespace-nowrap rounded-full bg-slate-900 py-0.5 pl-2 pr-1 text-[11px] font-black text-white shadow-md outline-none ring-offset-2 transition-colors hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-amber-500"
            style={{ left: izqPct(recuadro.x + recuadro.w + 3), top: arribaPct(recuadro.y - 1) }}>
            {etiquetaDetalle || 'España'}
            <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[10px] text-slate-950">{detalle}</span>
          </button>
        </>
      )}

      {rotulos.map(r => (
        <span key={r.clave} aria-hidden
          className="pointer-events-none absolute z-[6] whitespace-nowrap text-[11px] font-bold leading-[14px] text-slate-700 [text-shadow:0_0_2px_#f8fafc,0_0_4px_#f8fafc,0_0_6px_#f8fafc]"
          style={{ left: r.x, top: r.y }}>{r.texto}</span>
      ))}

      {ancho > 0 && grupos.map((g, i) => {
        const abierto = abierta?.clave === g.clave;
        const solo = g.proyectos.length === 1;
        const nombre = nombreGrupo(g);
        const id = `${base}-ficha-${i}`;
        const px = (g.x - marco.x) * escala, py = (g.y - marco.y) * escala, alto = marco.h * escala;
        const etiqueta = solo
          ? `${g.proyectos[0].titulo}: ${textoLugar(g.proyectos[0].lugar!)}`
          : `${g.proyectos.length} proyectos en ${nombre}: ${g.proyectos.map(p => p.titulo).join(', ')}`;
        // Los colores de sus estados, en el borde del círculo de un grupo.
        const colores = g.proyectos.map(p => p.color || GRIS_ESTADO);
        const anillo = colores.map((c, k) => `${c} ${(k / colores.length) * 360}deg ${((k + 1) / colores.length) * 360}deg`).join(', ');
        // La ficha, junto al punto: hacia donde haya más sitio (arriba o abajo), sin salirse por los
        // lados; la lista de un grupo, como mucho tan alta como ese sitio (y se desliza).
        const anchoFicha = Math.min(solo ? 256 : 288, ancho - 16);
        const izq = Math.max(8, Math.min(px - anchoFicha / 2, ancho - anchoFicha - 8));
        const arriba = py > alto - py;
        const espacio = Math.max(260, (arriba ? py : alto - py) - 24);
        const posFicha: CSSProperties = { width: anchoFicha, left: izq - px, ...(arriba ? { bottom: 16 } : { top: 16 }), ...(solo ? {} : { maxHeight: espacio }) };
        return (
          <div key={g.clave} ref={abierto ? activa : undefined}
            className={cn('absolute', abierto ? 'z-30' : 'z-10')}
            style={{ left: izqPct(g.x), top: arribaPct(g.y) }}
            onMouseEnter={() => {
              if (!window.matchMedia('(hover: hover)').matches) return;
              window.clearTimeout(entrada.current);
              // Con otra ficha abierta, se cambia a esta solo si el ratón se queda encima 150 ms: de
              // camino a la ficha de Madrid se roza la chincheta de Toledo, y no debe cambiarla.
              if (abierta && abierta.clave !== g.clave) entrada.current = window.setTimeout(() => abrir(g.clave, false), 150);
              else abrir(g.clave, abierta?.clave === g.clave && !!abierta?.fija);
            }}
            onMouseLeave={() => { window.clearTimeout(entrada.current); if (!abierta?.fija) soltar(); }}
            onFocus={() => { if (!abierto) abrir(g.clave, false); }}
            onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null) && !abierta?.fija) setAbierta(null); }}>
            <button type="button" aria-label={etiqueta} aria-expanded={abierto} aria-controls={abierto ? id : undefined}
              onClick={() => (abierto && abierta?.fija ? setAbierta(null) : abrir(g.clave, true))}
              className="group absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              {solo ? (
                <span aria-hidden className={cn('block h-3.5 w-3.5 rounded-full shadow-[0_1px_3px_rgba(15,23,42,0.45)] ring-2 ring-white transition-transform duration-150 group-hover:scale-125', abierto && 'scale-125')}
                  style={{ background: colores[0] }} />
              ) : (
                <span aria-hidden className={cn('grid h-[26px] w-[26px] place-items-center rounded-full p-[2.5px] shadow-[0_1px_4px_rgba(15,23,42,0.45)] transition-transform duration-150 group-hover:scale-110', abierto && 'scale-110')}
                  style={{ background: `conic-gradient(${anillo})` }}>
                  <span className="grid h-full w-full place-items-center rounded-full bg-slate-900 text-[11px] font-black leading-none text-white ring-[1.5px] ring-white">{g.proyectos.length}</span>
                </span>
              )}
            </button>
            {abierto && (
              <div id={id} role="group" aria-label={solo ? g.proyectos[0].titulo : `${nombre}: ${g.proyectos.length} proyectos`}
                className="absolute flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xl"
                style={posFicha}>
                {solo ? <FichaProyecto p={g.proyectos[0]} enlace={enlace} /> : <FichaGrupo nombre={nombre} proyectos={g.proyectos} enlace={enlace} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FichaProyecto({ p, enlace }: { p: ProyectoPortada; enlace: (p: ProyectoPortada) => string }) {
  return (
    <Link to={enlace(p)} data-interno="" className="group/ficha block outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
        {fotoPropia(p.portada) && <img src={miniatura(fotoPropia(p.portada), 256)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover/ficha:scale-[1.03]" />}
      </div>
      <div className="p-3.5">
        <p className="text-[15px] font-black leading-tight tracking-tight text-slate-900">{p.titulo}</p>
        <p className="mt-1 flex items-start gap-1 text-xs font-semibold leading-snug text-slate-500">
          <MapPin aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600" />{textoLugar(p.lugar!)}
        </p>
        {(p.ano || p.estado) && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
            {p.estado && <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: p.color || GRIS_ESTADO }} />}
            {[p.estado, p.ano].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="mt-2.5 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 group-hover/ficha:underline">
          Ver el proyecto <ArrowRight aria-hidden className="h-4 w-4" />
        </p>
      </div>
    </Link>
  );
}

function FichaGrupo({ nombre, proyectos, enlace }: { nombre: string; proyectos: ProyectoPortada[]; enlace: (p: ProyectoPortada) => string }) {
  // Dentro del grupo «Madrid» (o «Madrid y alrededores», en el móvil), cada uno con su pueblo, sin
  // repetir «Madrid»: así cabe también el año.
  const base = nombre.replace(/ y alrededores$/, '');
  const lugar = (l: LugarPortada) => (l.region && l.region !== base && l.region !== l.nombre ? `${l.nombre}, ${l.region}` : l.nombre);
  return (
    <div className="flex min-h-0 flex-col">
      <p className="shrink-0 border-b border-slate-100 px-3.5 py-2.5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {nombre} · {proyectos.length} proyectos
      </p>
      <ul role="list" className="min-h-0 list-none overflow-y-auto overscroll-contain p-1.5">
        {proyectos.map(p => (
          <li key={p.pagina}>
            <Link to={enlace(p)} data-interno="" className="flex items-center gap-3 rounded-xl p-2 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500">
              {fotoPropia(p.portada)
                ? <img src={miniatura(fotoPropia(p.portada), 48)} alt="" loading="lazy" decoding="async" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                : <span aria-hidden className="h-11 w-11 shrink-0 rounded-lg bg-slate-100" />}
              <span className="min-w-0">
                <span className="block text-sm font-black leading-tight text-slate-900">{p.titulo}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color || GRIS_ESTADO }} />
                  <span className="truncate">{[lugar(p.lugar!), p.ano].filter(Boolean).join(' · ')}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
