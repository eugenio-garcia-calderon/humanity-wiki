import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, Lightbulb, Target, TrendingUp, Undo2 } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { tonosDeNota, textoNota, textoSobre, colorDeNota } from '../../../utils/nota';
import { useSitio } from '../../sitio/ContextoSitio';
import { cn } from '../../../utils/cn';
import { miniatura } from '../../../utils/miniatura';
import ElegirTerritorio, { territorioGuardado, guardarTerritorio, useTerritorios } from '../filtroTerritorio/ElegirTerritorio';

// ============================================================================
// EL TERMÓMETRO DE UN SISTEMA (2026-10-25, Eugenio)
// ============================================================================
// «Cuando pinchas en Movilidad en España: la nota más grande, un termómetro del
// 0 al 10 a la izquierda con dónde está España; al pasar por los números, el
// título de cada nivel; al pinchar uno, lo que significa (el 10, la máxima
// aspiración). Y los fallos actuales, las medidas correctoras para subir de
// nivel y las soluciones adaptadas a cada nivel.»
//
// Los datos salen de `/api/evolucion/:pagina` (`bd.ts`): la nota y el
// diagnóstico de la fila, los once niveles del sistema (tabla de niveles del
// bloque) y la red del sistema (fallos, objetivos de mejora, proyectos).
//
// LA CABECERA DE LA PÁGINA (2026-10-25, Eugenio): «el termómetro arriba a la
// izquierda, y arriba centrado el título con el icono de portada y la
// descripción; y ya debajo las bases de datos enlazadas». Si es el primer
// bloque, `VistaPagina` no pinta su cabecera y le pasa `comoCabecera`: el
// título (h1), la portada, la descripción y el territorio van aquí dentro.

/** La escala común: el nombre de cada nivel, el mismo para todos los sistemas. */
export const ESCALA = ['Colapso', 'Crítico', 'Muy deficiente', 'Deficiente', 'Insuficiente', 'En transición', 'Aceptable', 'Bueno', 'Muy bueno', 'Excelente', 'Máxima aspiración'];

type Nivel = { nivel: number; titulo: string; descripcion: string; medidas: string; soluciones: string };
type Entrada = { fila_id: string; pagina_id: string | null; titulo: string; slug: string };
type Grupo = { nombre: string; slug: string; entradas: Entrada[] };
type Datos = { nombre: string; nota: number | null; territorio: string | null; territorio_id: string | null; tabla_territorios: string | null;
  pagina?: { icono: string | null; portada: string | null; subtitulo: string }; diagnostico: string; niveles: Nivel[]; red: Grupo[] };

/** Un texto con una idea por línea (o separadas por «;»), como lista. */
// Cada idea empieza en mayúscula aunque venga tras un «;» (bot de UX: «reducir…», «corregir…»).
const ideas = (t: string) => String(t || '').split(/\n+|;\s*/).map(x => x.replace(/^[-•·]\s*/, '').trim()).filter(Boolean).map(x => x.charAt(0).toUpperCase() + x.slice(1));

// TODO EN LA PRIMERA PANTALLA (2026-10-25, Eugenio: «mucho más compacta, que se
// vea casi todo en primera página; y las pestañas de las bases de datos de
// abajo, para que no haga falta bajar para ver que hay mucho donde pinchar»).
// Un solo recuadro de tres columnas: el termómetro; la cabecera con el
// territorio, la nota y el nivel elegido; y unas pestañas (el salto, las
// soluciones de cada nivel, los fallos, las mejoras) que no alargan la página.
// Justo debajo, `VistaPagina` pone las pestañas de la red.
//
// Bot evaluador de UX, ronda 1 (6,3/10): el cartel del termómetro tapaba el
// título y el selector → pasar por un número enseña ese nivel en la tarjeta de
// la descripción; en el móvil el termómetro es una barra horizontal; el salto
// se lee de arriba abajo (1, 2, 3…) con marcas neutras, no con círculos del
// color de los niveles; teclado: un solo tabulador por grupo y flechas.

/** Alto de cada nivel del termómetro, en rem. */
const FILA = 1.75;
const sinTilde = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Flechas para moverse por un grupo (los niveles, las pestañas): un solo tabulador. */
function conFlechas(e: React.KeyboardEvent, actual: number, max: number, ir: (n: number) => void, eje: 'v' | 'h', inverso = false) {
  const mas = eje === 'v' ? (inverso ? 'ArrowUp' : 'ArrowDown') : 'ArrowRight', menos = eje === 'v' ? (inverso ? 'ArrowDown' : 'ArrowUp') : 'ArrowLeft';
  let n: number | null = null;
  if (e.key === mas) n = Math.min(max, actual + 1);
  else if (e.key === menos) n = Math.max(0, actual - 1);
  else if (e.key === 'Home') n = 0;
  else if (e.key === 'End') n = max;
  if (n === null) return;
  e.preventDefault(); ir(n);
  // `currentTarget` ya no existe cuando llega el siguiente fotograma: se guarda el grupo antes.
  const grupo = (e.currentTarget as HTMLElement).closest('[data-flechas]');
  requestAnimationFrame(() => (grupo?.querySelector(`[data-pos="${n}"]`) as HTMLElement | null)?.focus());
}

/** El color de un nivel aún no alcanzado: el suyo, muy claro (se ve hacia dónde se va). */
const vacio = (n: number) => `color-mix(in srgb, ${colorDeNota(n)} 18%, white)`;

function Tubo({ niveles, actual, elegido, onElegir, onEncima }: {
  niveles: Nivel[]; actual: number | null; elegido: number; onElegir: (n: number) => void; onEncima: (n: number | null) => void;
}) {
  const filas = Array.from({ length: 11 }, (_, i) => 10 - i);
  const sig = actual !== null && Math.floor(actual) < 10 ? Math.floor(actual) + 1 : null;
  return (
    <div data-tubo className="relative flex select-none items-stretch gap-2" onMouseLeave={() => onEncima(null)}>
      {/* Los números, del 10 arriba al 0 abajo: pasar el ratón enseña el nivel, pulsar lo deja abierto. */}
      <div role="radiogroup" aria-label="Niveles del 0 al 10" data-flechas className="flex flex-col">
        {filas.map(n => {
          const info = niveles.find(x => x.nivel === n);
          return (
            <div key={n} style={{ height: `${FILA}rem` }}>
              <button type="button" role="radio" aria-checked={elegido === n} tabIndex={elegido === n ? 0 : -1} data-pos={n}
                aria-label={`Nivel ${n} · ${ESCALA[n]}${info?.titulo ? ` — ${info.titulo}` : ''}${actual !== null && Math.floor(actual) === n ? ' (ahora)' : n === sig ? ' (siguiente)' : ''}`}
                onClick={() => onElegir(n)} onMouseEnter={() => onEncima(n)}
                onKeyDown={e => conFlechas(e, n, 10, onElegir, 'v', true)}
                className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-black tabular-nums transition-colors',
                  elegido === n ? 'bg-slate-900 text-white' : actual !== null && Math.floor(actual) === n ? 'bg-white text-slate-900 ring-2 ring-slate-900' : 'text-slate-600 hover:bg-white hover:text-slate-900',
                  n === sig && elegido !== n && '[outline:2px_dashed_rgb(71_85_105/.7)] [outline-offset:-2px]')}>
                {n}
              </button>
            </div>
          );
        })}
      </div>
      {/* El tubo: lleno con el color de cada nivel hasta la nota; por encima, el mismo color muy claro. */}
      <div className="relative w-5">
        <div className="absolute inset-x-0 top-0.5 bottom-5 overflow-hidden rounded-full ring-1 ring-black/5">
          {filas.map(n => (
            <div key={n} className="border-b border-white/80 last:border-0" style={{ height: `${FILA}rem`, backgroundColor: actual !== null && n <= actual ? colorDeNota(n) : vacio(n) }} />
          ))}
        </div>
        <div className="absolute -bottom-1 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full ring-4 ring-white"
          style={{ backgroundColor: actual !== null ? colorDeNota(actual) : '#e2e8f0' }} />
      </div>
      {/* La meta (el nivel siguiente), con un tramo discontinuo en el tubo: el salto se ve aquí también (bot de UX, ronda 3). */}
      {sig !== null && (
        <>
          <span aria-hidden className="pointer-events-none absolute left-[2.25rem] w-5 rounded-sm border-2 border-dashed border-amber-600"
            style={{ top: `${(10 - sig) * FILA + 0.125}rem`, height: `${FILA}rem` }} />
          <span aria-hidden className="pointer-events-none absolute left-[3.6rem] rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-slate-900"
            style={{ top: `${(10 - sig) * FILA + FILA / 2}rem`, transform: 'translateY(-50%)' }}>meta</span>
        </>
      )}
      {/* «Hoy», siempre a la vista junto al tubo, aunque se mire otro nivel (bot de UX, ronda 2). */}
      {actual !== null && (
        <span aria-hidden className="pointer-events-none absolute left-[3.6rem] rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-white"
          style={{ top: `${(10 - Math.floor(actual)) * FILA + FILA / 2}rem`, transform: 'translateY(-50%)' }}>hoy</span>
      )}
    </div>
  );
}

/** En el móvil: el mismo termómetro, tumbado (del 0 a la izquierda al 10 a la derecha). */
function TuboHorizontal({ actual, elegido, onElegir }: { actual: number | null; elegido: number; onElegir: (n: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Niveles del 0 al 10" data-flechas className="flex gap-0.5">
      {Array.from({ length: 11 }, (_, n) => (
        <button key={n} type="button" role="radio" aria-checked={elegido === n} tabIndex={elegido === n ? 0 : -1} data-pos={n}
          aria-label={`Nivel ${n} · ${ESCALA[n]}`} onClick={() => onElegir(n)} onKeyDown={e => conFlechas(e, n, 10, onElegir, 'h')}
          className={cn('grid h-11 min-w-0 flex-1 place-items-center rounded-lg text-xs font-black tabular-nums', elegido === n && 'ring-2 ring-slate-900 ring-offset-1', actual !== null && Math.floor(actual) === n && elegido !== n && 'outline outline-2 outline-offset-1 outline-slate-500')}
          style={actual !== null && n <= actual ? { backgroundColor: colorDeNota(n), color: textoSobre(colorDeNota(n)) } : { backgroundColor: vacio(n), color: '#475569' }}>
          {n}
        </button>
      ))}
    </div>
  );
}

function Tarjetas({ entradas }: { entradas: Entrada[] }) {
  const sitio = useSitio();
  return (
    <ul className="space-y-1.5">
      {entradas.map(e => (
        <li key={e.fila_id}>
          {e.pagina_id ? (
            <Link to={sitio ? sitio.enlacePagina(e.pagina_id) : `/paginas/${e.pagina_id}`}
              className="group flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold leading-snug text-slate-700 hover:border-slate-300 hover:shadow-sm">
              <span className="flex-1">{e.titulo}</span><ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-700" />
            </Link>
          ) : <span className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700">{e.titulo}</span>}
        </li>
      ))}
    </ul>
  );
}

function Grupos({ grupos, sufijo = '' }: { grupos: Grupo[]; sufijo?: string }) {
  return <>{grupos.map(g => g.entradas.length > 0 && (
    <div key={g.slug} className="mt-3 first:mt-0"><p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">{g.nombre}{sufijo}</p><Tarjetas entradas={g.entradas} /></div>
  ))}</>;
}

/** El nombre de un nivel para el salto: si solo repite el de la escala común
 *  («Insuficiente»), mejor la primera frase de su descripción (bot de UX, ronda 3). */
function nombreNivel(v: { nivel: number; titulo: string; descripcion?: string }) {
  if (v.titulo && sinTilde(v.titulo) !== sinTilde(ESCALA[v.nivel] || '')) return v.titulo;
  const frase = String(v.descripcion || '').split(/(?<=\.)\s/)[0]?.replace(/\.$/, '').trim();
  return frase ? (frase.length > 110 ? `${frase.slice(0, 107).trim()}…` : frase) : (v.titulo || ESCALA[v.nivel]);
}

/** EL SALTO DE NIVEL (2026-10-25, Eugenio: «de forma visual las mejoras necesarias
 *  para hacer el salto de un nivel a otro»): de «hoy» (arriba) a la meta (abajo),
 *  cada medida un escalón algo más a la derecha, del color de un nivel al del otro. */
function Salto({ desde, hasta, medidas }: { desde: { nivel: number; titulo: string; descripcion?: string }; hasta: { nivel: number; titulo: string; descripcion?: string }; medidas: string[] }) {
  const c1 = colorDeNota(desde.nivel), c2 = colorDeNota(hasta.nivel);
  const mezcla = (i: number) => `color-mix(in srgb, ${c2} ${Math.round(((i + 1) / (medidas.length + 1)) * 100)}%, ${c1})`;
  return (
    <div data-salto>
      <p className="mb-2 text-sm font-black leading-snug text-slate-900">Qué hace falta para pasar del {desde.nivel} al {hasta.nivel} <span className="font-bold text-slate-500">· {medidas.length} medidas</span></p>
      <div className="relative pl-4">
        {/* La barra del salto: del color de hoy (arriba) al de la meta (abajo). */}
        <span aria-hidden className="absolute bottom-3 left-0 top-3 w-1.5 rounded-full" style={{ background: `linear-gradient(180deg, ${c1}, ${c2})` }} />
        <p className="flex items-center gap-2 text-[12px] text-slate-600">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-black" style={{ backgroundColor: c1, color: textoSobre(c1) }}>{desde.nivel}</span>
          <span><b className="font-bold text-slate-800">Hoy · nivel {desde.nivel}:</b> {nombreNivel(desde)}</span>
        </p>
        <ol className="my-1.5 space-y-1" aria-label={`${medidas.length} medidas para pasar del nivel ${desde.nivel} al ${hasta.nivel}`}>
          {medidas.map((m, i) => (
            // Sin cifras: los números son de los niveles (bot de UX, ronda 2: el paso «5» chocaba con la meta 5).
            <li key={i} className="flex items-start gap-2 rounded-lg border-l-4 py-1.5 pl-2 pr-2.5 text-[13px] font-semibold leading-snug text-slate-800"
              style={{ borderLeftColor: mezcla(i), backgroundColor: `color-mix(in srgb, ${mezcla(i)} 12%, white)` }}>
              <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: mezcla(i) }} />
              <span className="min-w-0">{m}</span>
            </li>
          ))}
        </ol>
        <p className="flex items-center gap-2 text-[12px] text-slate-600">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[11px] font-black" style={{ backgroundColor: c2, color: textoSobre(c2) }}>{hasta.nivel}</span>
          <span><b className="font-bold text-slate-800">Meta · nivel {hasta.nivel}:</b> {nombreNivel(hasta)}</span>
        </p>
      </div>
    </div>
  );
}

type Pestana = 'salto' | 'soluciones' | 'fallos' | 'mejoras';

export function VistaTermometro({ datos: d, paginaId }: { datos: Record<string, unknown>; paginaId?: string }) {
  const comoCabecera = d.comoCabecera === true;
  // El título ya está arriba, en la línea de la ruta (`VistaPagina`): aquí solo el territorio y la nota.
  const sinTitulo = d.sinTitulo === true;
  const [x, setX] = useState<Datos | null | 'fallo'>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [encima, setEncima] = useState<number | null>(null);
  const [pestana, setPestana] = useState<Pestana | null>(null);
  const [leerMas, setLeerMas] = useState(false);
  // Las soluciones enseñan el nivel de hoy y el siguiente; los de más arriba, al pedirlos (bot de UX, ronda 2).
  const [todosNiveles, setTodosNiveles] = useState(false);
  const [verProyectos, setVerProyectos] = useState(false);
  const [masAbajo, setMasAbajo] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!paginaId) return;
    const q = d.tabla_niveles ? `?niveles=${encodeURIComponent(String(d.tabla_niveles))}` : '';
    fetch(`/api/evolucion/${encodeURIComponent(paginaId)}${q}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).then(j => setX(j || 'fallo')).catch(() => setX('fallo'));
  }, [paginaId, d.tabla_niveles]);
  // El territorio elegido (el mismo que en la galería). Si no es el de esta nota, aún no hay nota para él.
  const [terr, setTerr] = useState<string | null>(() => { const t = territorioGuardado(''); return t || null; });
  const propio = x && x !== 'fallo' ? x.territorio_id : null;
  const elegidoT = terr || propio || '';
  const usados = useMemo(() => (x && x !== 'fallo' && x.territorio_id ? [{ id: x.territorio_id, nombre: x.territorio || '' }] : []), [x]);
  const opciones = useTerritorios(x && x !== 'fallo' ? x.tabla_territorios : null, usados);
  const conDatos = useMemo(() => new Set(usados.map(o => o.id)), [usados]);
  const sinNota = !!(propio && elegidoT && elegidoT !== propio && opciones.some(o => o.id === elegidoT));
  const actual = x && x !== 'fallo' && x.nota !== null && !sinNota ? x.nota : null;
  const nivelActual = actual !== null ? Math.max(0, Math.min(10, Math.floor(actual))) : null;
  const fijo = elegido ?? nivelActual ?? 10;
  const n = encima ?? fijo;
  const niveles = x && x !== 'fallo' ? x.niveles : [];
  const info = niveles.find(v => v.nivel === n);
  const grupos = useMemo(() => {
    const red = x && x !== 'fallo' ? x.red : [];
    const de = (re: RegExp) => red.filter(g => re.test(sinTilde(g.nombre)));
    return { fallos: de(/fallo|consecuen/), mejoras: de(/mejora|linea|punto|objetivo/), proyectos: de(/proyecto|soluci/) };
  }, [x]);
  const territorioNombre = opciones.find(o => o.id === elegidoT)?.nombre || (x && x !== 'fallo' ? x.territorio : null);
  // El título de la pestaña del navegador dice el territorio y la nota (bot de UX: mejor al compartir).
  useEffect(() => {
    if (!comoCabecera || !x || x === 'fallo' || actual === null || !territorioNombre) return;
    const antes = document.title, nuevo = `${x.nombre} en ${territorioNombre} · ${textoNota(actual)}/10`;
    if (!antes.includes(nuevo)) document.title = antes.replace(x.nombre, nuevo);
    return () => { document.title = antes; };
  }, [comoCabecera, x, actual, territorioNombre]);
  // ¿Queda contenido por debajo en el panel de pestañas? Entonces un degradado lo avisa.
  const medirPanel = () => { const p = panel.current; setMasAbajo(!!p && p.scrollHeight - p.scrollTop - p.clientHeight > 8); };
  const abiertaCalc = (ps: Array<{ id: Pestana }>) => ps.find(p => p.id === pestana)?.id || ps[0]?.id;
  useEffect(() => {
    const p = panel.current; if (!p) return;
    // Las soluciones se abren en el nivel siguiente (bot de UX: empezaba en el 10 y el siguiente quedaba escondido).
    const sig = p.querySelector('[data-siguiente]') as HTMLElement | null;
    p.scrollTop = sig ? Math.max(0, sig.offsetTop - p.offsetTop - 56) : 0;
    medirPanel();
  }, [pestana, x, sinNota]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!paginaId) return <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs font-bold text-slate-400">El termómetro va en la página de un sistema.</p>;
  if (x === null) return <div className="mb-6 h-80 animate-pulse rounded-3xl bg-slate-50" />;
  if (x === 'fallo') return null;
  const tonos = actual !== null ? tonosDeNota(actual) : null;
  const tonosN = tonosDeNota(n);
  const portada = x.pagina?.portada || (x.pagina?.icono && /^(https?:|\/)/.test(x.pagina.icono) ? x.pagina.icono : null);
  const icono = x.pagina?.icono && !/^(https?:|\/)/.test(x.pagina.icono) ? x.pagina.icono : null;
  const medidas = nivelActual !== null && nivelActual < 10 ? ideas(niveles.find(v => v.nivel === nivelActual)?.medidas || '') : [];
  const fallosTexto = ideas(x.diagnostico);
  const cuenta = (gs: Grupo[]) => gs.reduce((a, g) => a + g.entradas.length, 0);
  const solNiveles = niveles.filter(v => v.soluciones && (nivelActual === null || v.nivel >= nivelActual)).sort((a, b) => b.nivel - a.nivel);
  const nSoluciones = solNiveles.reduce((a, v) => a + ideas(v.soluciones).length, 0) + cuenta(grupos.proyectos);
  // Las pestañas que tienen algo, con cuántas cosas hay en cada una.
  const pestanas: Array<{ id: Pestana; titulo: string; icono: typeof Target; n?: number }> = [
    ...(medidas.length ? [{ id: 'salto' as const, titulo: `Salto ${nivelActual}→${nivelActual! + 1}`, icono: TrendingUp }] : []),
    ...(nSoluciones ? [{ id: 'soluciones' as const, titulo: 'Soluciones', icono: Lightbulb, n: nSoluciones }] : []),
    // Nombres que no chocan con las pestañas de abajo (bot de UX, ronda 2: «Fallos 7» arriba y «Fallos 1» abajo).
    ...(fallosTexto.length || cuenta(grupos.fallos) ? [{ id: 'fallos' as const, titulo: 'Diagnóstico', icono: AlertTriangle, n: fallosTexto.length + cuenta(grupos.fallos) || undefined }] : []),
    ...(cuenta(grupos.mejoras) ? [{ id: 'mejoras' as const, titulo: 'Plan', icono: Target, n: cuenta(grupos.mejoras) }] : []),
  ];
  const abierta = abiertaCalc(pestanas);
  const iAbierta = Math.max(0, pestanas.findIndex(p => p.id === abierta));
  const idp = `termo-${paginaId}`;
  const elegirNivel = (v: number) => { setElegido(v === nivelActual ? null : v); setEncima(null); };
  const rotulo = n === nivelActual ? `Hoy en ${territorioNombre || 'este territorio'}` : n === 10 ? 'Nivel 10 · máxima aspiración' : n > (nivelActual ?? -1) ? `Nivel ${n} · meta posible` : `Nivel ${n} · por debajo de hoy`;
  return (
    <div data-termometro className={cn(comoCabecera ? 'mb-5' : 'my-6')}>
      <section className="grid grid-cols-1 gap-4 rounded-3xl border p-4 sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[auto_1fr] lg:gap-x-6"
        style={tonos ? { backgroundColor: tonos.fondo, borderColor: tonos.borde } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>

        {/* Arriba, centrados: la portada y el título, la descripción; debajo, el territorio y la nota. */}
        <header className="flex flex-col items-center text-center lg:col-start-2 lg:row-start-1">
          {!sinTitulo && <>
          <div className="flex items-center justify-center gap-2.5">
            {portada
              ? <img src={miniatura(portada, 160)} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm ring-1 ring-black/10" />
              : icono && <span className="text-4xl leading-none">{icono}</span>}
            {comoCabecera
              ? <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 sm:text-[2.25rem]">{x.nombre}</h1>
              : <p className="text-2xl font-black leading-tight tracking-tight text-slate-900">{x.nombre}</p>}
          </div>
          {x.pagina?.subtitulo && <p className="mt-1 text-sm leading-snug text-slate-600">{x.pagina.subtitulo}</p>}
          </>}
          <div className={cn(!sinTitulo && 'mt-3', 'flex items-center justify-center gap-x-3 gap-y-2 sm:flex-wrap')}>
            {x.tabla_territorios && opciones.length > 0 && (
              <ElegirTerritorio compacto opciones={opciones} conDatos={conDatos} elegido={elegidoT}
                onElegir={id => { setTerr(id); guardarTerritorio(id, ''); setElegido(null); }} />
            )}
            {actual !== null && tonos && (
              <div className="flex items-center gap-2.5">
                <span data-nota-sistema aria-label={`Nota ${textoNota(actual)} sobre 10`} className="inline-flex items-baseline rounded-2xl px-4 py-1.5 font-black leading-none tabular-nums shadow-sm"
                  style={{ backgroundColor: tonos.color, color: textoSobre(tonos.color) }}>
                  <span className="text-[2.75rem] sm:text-5xl">{textoNota(actual)}</span><span className="ml-1 text-base opacity-75">/10</span>
                </span>
                <p className="hidden text-left text-sm font-black leading-tight sm:block" style={{ color: tonos.tinta }}>Nivel {nivelActual}<br /><span className="font-bold">{ESCALA[nivelActual!]}</span></p>
              </div>
            )}
          </div>
        </header>

        {/* A la izquierda, el termómetro (en el móvil, tumbado encima de la descripción). */}
        <div className="hidden lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:block lg:pr-5">
          <Tubo niveles={niveles} actual={actual} elegido={fijo} onElegir={elegirNivel} onEncima={setEncima} />
        </div>

        {/* El nivel que se señala en el termómetro (el de hoy, si no se ha pulsado otro). */}
        <div className="min-w-0 self-start lg:col-start-2 lg:row-start-2">
          {sinNota ? (
            <div data-sin-nota className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center">
              <p className="font-black text-slate-800">Todavía no hay nota de {x.nombre} para {territorioNombre}.</p>
              {propio && <button type="button" onClick={() => { setTerr(propio); guardarTerritorio(propio, ''); }} className="mt-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-700">Ver {x.territorio}</button>}
            </div>
          ) : (
            <>
              <div className="mb-3 lg:hidden"><TuboHorizontal actual={actual} elegido={fijo} onElegir={elegirNivel} /></div>
              <div data-nivel-elegido aria-live="polite" className="flex flex-col rounded-2xl bg-white/90 p-4 ring-1 ring-black/5">
                <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: tonosN.tinta }}>{rotulo}{n === nivelActual && <span className="sm:hidden"> · nivel {n} · {ESCALA[n]}</span>}</p>
                <h2 className="mt-0.5 text-base font-black leading-snug text-slate-900">{info?.titulo || ESCALA[n]}</h2>
                {info?.descripcion && <p className={cn('mt-1 text-[13px] leading-relaxed text-slate-700', !leerMas && 'max-lg:line-clamp-3')}>{info.descripcion}</p>}
                {info?.descripcion && !leerMas && <button type="button" onClick={() => setLeerMas(true)} className="-mb-2 inline-flex min-h-11 items-center text-xs font-bold text-slate-700 underline lg:hidden">Leer más</button>}
                {!info && <p className="mt-1 text-sm text-slate-500">Aún no se ha descrito este nivel.</p>}
                {/* Del nivel de hoy, un atajo al salto (llena el hueco que quedaba y une las dos columnas). */}
                {n === nivelActual && medidas.length > 0 && (
                  <button type="button" onClick={() => { setPestana('salto'); panel.current?.focus(); }}
                    className="mt-2 inline-flex min-h-8 items-center gap-1.5 self-start rounded-full bg-slate-900 px-3 text-[12px] font-bold text-white hover:bg-slate-700">
                    <TrendingUp className="h-3.5 w-3.5" /> Qué hace falta para llegar al nivel {nivelActual! + 1}
                  </button>
                )}
                <p className="pt-2 text-[11px] text-slate-600">
                  {elegido !== null && nivelActual !== null && encima === null
                    ? <button type="button" onClick={() => setElegido(null)} className="inline-flex min-h-6 items-center gap-1 font-bold text-slate-600 hover:text-slate-900"><Undo2 className="h-3 w-3" /> Volver a hoy (nivel {nivelActual})</button>
                    : <span><span className="hidden lg:inline">Pasa por el termómetro o pulsa un número</span><span className="lg:hidden">Pulsa un número</span> para ver cada nivel.</span>}
                </p>
              </div>
            </>
          )}
        </div>

        {/* A la derecha, en pestañas: el salto, las soluciones, los fallos y las mejoras. */}
        {!sinNota && pestanas.length > 0 && (
          <div data-pestanas-termometro className="flex min-w-0 flex-col rounded-2xl bg-white/90 ring-1 ring-black/5 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <div role="tablist" aria-label={`Cómo mejorar ${x.nombre}`} data-flechas
              className="flex gap-1 overflow-x-auto border-b border-slate-100 p-1.5 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(90deg,#000_85%,transparent)] max-sm:pr-8">
              {pestanas.map((p, i) => (
                <button key={p.id} type="button" role="tab" id={`${idp}-t-${p.id}`} aria-controls={`${idp}-panel`} aria-selected={abierta === p.id}
                  tabIndex={abierta === p.id ? 0 : -1} data-pos={i} onClick={() => setPestana(p.id)}
                  onKeyDown={e => conFlechas(e, i, pestanas.length - 1, j => setPestana(pestanas[j].id), 'h')}
                  className={cn('inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[13px] font-bold transition-colors',
                    abierta === p.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                  <p.icono className="h-3.5 w-3.5" />{p.titulo}
                  {p.n ? <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', abierta === p.id ? 'bg-white/20' : 'bg-slate-100 text-slate-600')}>{p.n}</span> : null}
                </button>
              ))}
            </div>
            <div className="relative min-h-0 flex-1">
              <div ref={panel} role="tabpanel" id={`${idp}-panel`} aria-labelledby={`${idp}-t-${pestanas[iAbierta]?.id}`} tabIndex={0} onScroll={medirPanel}
                className="p-3 outline-none lg:max-h-[19.25rem] lg:overflow-y-auto">
                {abierta === 'salto' && nivelActual !== null && (
                  <Salto desde={niveles.find(v => v.nivel === nivelActual) || { nivel: nivelActual, titulo: '' }}
                    hasta={niveles.find(v => v.nivel === nivelActual + 1) || { nivel: nivelActual + 1, titulo: '' }} medidas={medidas} />
                )}
                {abierta === 'soluciones' && (
                  <>
                    <p className="mb-2 text-[12px] text-slate-600">Tecnologías y proyectos que encajan en cada nivel, de la máxima aspiración al de hoy.</p>
                    {cuenta(grupos.proyectos) > 0 && (verProyectos
                      ? <div className="mb-3"><Grupos grupos={grupos.proyectos} sufijo=" · ya en marcha" /></div>
                      : <button type="button" onClick={() => setVerProyectos(true)} className="mb-2 flex w-full items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-left text-[13px] font-bold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100">
                          <span>{cuenta(grupos.proyectos)} proyectos ya en marcha</span><span className="inline-flex items-center gap-1">Ver <ArrowUpRight className="h-3.5 w-3.5" /></span>
                        </button>)}
                    {!todosNiveles && solNiveles.some(v => v.nivel > (nivelActual ?? -1) + 1) && (
                      <button type="button" onClick={() => setTodosNiveles(true)} className="mb-1.5 w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-[12px] font-bold text-slate-600 hover:border-slate-400 hover:text-slate-900">
                        Ver niveles {(nivelActual ?? -1) + 2}–10 ({solNiveles.filter(v => v.nivel > (nivelActual ?? -1) + 1).length}) ↑
                      </button>
                    )}
                    <ol className="space-y-1.5">
                      {solNiveles.filter(v => todosNiveles || v.nivel <= (nivelActual ?? -1) + 1).map(v => {
                        const t = tonosDeNota(v.nivel), sig = v.nivel === (nivelActual ?? -1) + 1;
                        return (
                          <li key={v.nivel} data-siguiente={sig || undefined} className={cn('flex gap-2.5 rounded-xl p-2', sig && 'ring-2 ring-emerald-400')} style={{ backgroundColor: t.fondo }}>
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black" style={{ backgroundColor: t.color, color: textoSobre(t.color) }}>{v.nivel}</span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-black leading-snug text-slate-900">{v.titulo || ESCALA[v.nivel]}{sig && <span className="ml-1.5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">siguiente</span>}{v.nivel === nivelActual && <span className="ml-1.5 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">hoy</span>}</p>
                              <p className="text-[12px] leading-snug text-slate-700">{ideas(v.soluciones).join(' · ')}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </>
                )}
                {abierta === 'fallos' && (
                  <>
                    {fallosTexto.length > 0 && <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-slate-500">Lo que falla hoy en {territorioNombre || 'este territorio'}</p>}
                    {fallosTexto.length > 0 && (
                      <ul className="mb-3 space-y-1.5">
                        {fallosTexto.map((t, i) => <li key={i} className="flex gap-2 text-[13px] leading-snug text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />{t}</li>)}
                      </ul>
                    )}
                    <Grupos grupos={grupos.fallos} />
                  </>
                )}
                {abierta === 'mejoras' && <><p className="mb-2 text-[12px] text-slate-600">Las mejoras propuestas, sus líneas de trabajo y los puntos concretos.</p><Grupos grupos={grupos.mejoras} /></>}
              </div>
              {masAbajo && <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-2xl bg-gradient-to-t from-white to-transparent" />}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function Lectura({ datos, paginaId }: PropsLectura) {
  return <VistaTermometro datos={datos} paginaId={paginaId} />;
}
