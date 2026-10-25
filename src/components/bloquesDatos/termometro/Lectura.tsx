import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowUpRight, TrendingUp, Undo2 } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { tonosDeNota, textoNota, textoSobre, colorDeNota } from '../../../utils/nota';
import { useSitio } from '../../sitio/ContextoSitio';
import { cn } from '../../../utils/cn';
import { miniatura } from '../../../utils/miniatura';
import ElegirTerritorio, { territorioGuardado, guardarTerritorio, useTerritorios } from '../filtroTerritorio/ElegirTerritorio';
import { ponerPestanasExtra, quitarPestanasExtra, abrirPestanaRed, type PestanaExtra } from '../../sitio/pestanasExtra';

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
const FILA = 1.5;
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
                className={cn('grid h-6 w-6 place-items-center rounded-full text-xs font-black tabular-nums transition-colors',
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
          <span aria-hidden className="pointer-events-none absolute left-[2rem] w-5 rounded-sm border-2 border-dashed border-amber-600"
            style={{ top: `${(10 - sig) * FILA + 0.125}rem`, height: `${FILA}rem` }} />
          <span aria-hidden className="pointer-events-none absolute left-[3.35rem] rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-slate-900"
            style={{ top: `${(10 - sig) * FILA + FILA / 2}rem`, transform: 'translateY(-50%)' }}>meta</span>
        </>
      )}
      {/* «Hoy», siempre a la vista junto al tubo, aunque se mire otro nivel (bot de UX, ronda 2). */}
      {actual !== null && (
        <span aria-hidden className="pointer-events-none absolute left-[3.35rem] rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black uppercase leading-none text-white"
          style={{ top: `${(10 - Math.floor(actual)) * FILA + FILA / 2}rem`, transform: 'translateY(-50%)' }}>hoy</span>
      )}
    </div>
  );
}

/** En el móvil: el mismo termómetro, tumbado (del 0 a la izquierda al 10 a la derecha). */
function TuboHorizontal({ actual, elegido, onElegir }: { actual: number | null; elegido: number; onElegir: (n: number) => void }) {
  const hoy = actual !== null ? Math.floor(actual) : null, sig = hoy !== null && hoy < 10 ? hoy + 1 : null;
  return (
    <div>
    <div role="radiogroup" aria-label="Niveles del 0 al 10" data-flechas className="flex gap-0.5">
      {Array.from({ length: 11 }, (_, n) => (
        <button key={n} type="button" role="radio" aria-checked={elegido === n} tabIndex={elegido === n ? 0 : -1} data-pos={n}
          aria-label={`Nivel ${n} · ${ESCALA[n]}`} onClick={() => onElegir(n)} onKeyDown={e => conFlechas(e, n, 10, onElegir, 'h')}
          className={cn('grid h-11 min-w-0 flex-1 place-items-center rounded-lg text-xs font-black tabular-nums', elegido === n && 'ring-2 ring-slate-900 ring-offset-1', actual !== null && Math.floor(actual) === n && elegido !== n && 'outline outline-2 outline-offset-1 outline-slate-500', n === sig && elegido !== n && 'border-2 border-dashed border-amber-600')}
          style={actual !== null && n <= actual ? { backgroundColor: colorDeNota(n), color: textoSobre(colorDeNota(n)) } : { backgroundColor: vacio(n), color: '#475569' }}>
          {n}
        </button>
      ))}
    </div>
    {/* «HOY» y «META» debajo, como en el termómetro del ordenador (bot de UX, ronda 4). */}
    <div aria-hidden className="mt-1 flex gap-0.5">
      {Array.from({ length: 11 }, (_, n) => (
        <span key={n} className="min-w-0 flex-1 text-center text-[9px] font-black uppercase leading-none">
          {n === hoy ? <span className="text-slate-900">hoy</span> : n === sig ? <span className="text-amber-700">meta</span> : null}
        </span>
      ))}
    </div>
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
  // Cortada por una palabra entera, nunca a media palabra (bot de UX, ronda 4).
  if (frase && frase.length > 90) { const c = frase.slice(0, 90); return `${c.slice(0, c.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`; }
  return frase || v.titulo || ESCALA[v.nivel];
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



// LAS PESTAÑAS, ABAJO CON LAS DEMÁS (2026-10-25, Eugenio: «reduce el nivel de
// información en la cabecera, quita las pestañas del lateral derecho y deja esas
// pestañas solo abajo junto con las otras»). La cabecera se queda con el
// termómetro, la nota y el nivel; el salto, las soluciones, el diagnóstico y el
// plan van a la barra de la red (`pestanasExtra.ts`), delante de las bases de datos.

function PanelSoluciones({ solNiveles, nivelActual, proyectos }: { solNiveles: Nivel[]; nivelActual: number | null; proyectos: Grupo[] }) {
  // El nivel de hoy y el siguiente; los de más arriba, al pedirlos (bot de UX, ronda 2).
  const [todos, setTodos] = useState(false);
  const sig = (nivelActual ?? -1) + 1;
  const arriba = solNiveles.filter(v => v.nivel > sig);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div>
        <p className="mb-2 text-sm text-slate-600">Tecnologías y soluciones que encajan en cada nivel, de la máxima aspiración al de hoy.</p>
        {!todos && arriba.length > 0 && (
          <button type="button" onClick={() => setTodos(true)} className="mb-2 w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-left text-[13px] font-bold text-slate-600 hover:border-slate-400 hover:text-slate-900">
            Ver niveles {sig + 1}–10 ({arriba.length}) ↑
          </button>
        )}
        <ol className="space-y-2">
          {solNiveles.filter(v => todos || v.nivel <= sig).map(v => {
            const t = tonosDeNota(v.nivel), esSig = v.nivel === sig;
            return (
              <li key={v.nivel} className={cn('flex gap-3 rounded-xl p-3', esSig && 'ring-2 ring-emerald-400')} style={{ backgroundColor: t.fondo }}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black" style={{ backgroundColor: t.color, color: textoSobre(t.color) }}>{v.nivel}</span>
                <div className="min-w-0">
                  <p className="text-sm font-black leading-snug text-slate-900">{v.titulo || ESCALA[v.nivel]}{esSig && <span className="ml-1.5 rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">siguiente</span>}{v.nivel === nivelActual && <span className="ml-1.5 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">hoy</span>}</p>
                  <p className="text-[13px] leading-snug text-slate-700">{ideas(v.soluciones).join(' · ')}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      {proyectos.some(g => g.entradas.length) && <div><Grupos grupos={proyectos} sufijo=" · ya en marcha" /></div>}
    </div>
  );
}

function PanelDiagnostico({ fallos, grupos, territorio }: { fallos: string[]; grupos: Grupo[]; territorio: string | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      {fallos.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Lo que falla hoy en {territorio || 'este territorio'}</p>
          <ul className="space-y-2">
            {fallos.map((t, i) => <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />{t}</li>)}
          </ul>
        </div>
      )}
      {grupos.some(g => g.entradas.length) && <div><Grupos grupos={grupos} /></div>}
    </div>
  );
}

export function VistaTermometro({ datos: d, paginaId }: { datos: Record<string, unknown>; paginaId?: string }) {
  const comoCabecera = d.comoCabecera === true;
  // El título ya está arriba, en la línea de la ruta (`VistaPagina`): aquí solo la nota y el nivel.
  const sinTitulo = d.sinTitulo === true;
  const [x, setX] = useState<Datos | null | 'fallo'>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [encima, setEncima] = useState<number | null>(null);
  const [leerMas, setLeerMas] = useState(false);
  // Con el título arriba, el territorio va a su lado, en el hueco que deja `VistaPagina` (2026-10-25, Eugenio).
  const [ranura, setRanura] = useState<HTMLElement | null>(null);
  useEffect(() => { if (sinTitulo) setRanura(document.querySelector<HTMLElement>('[data-ranura-territorio]')); }, [sinTitulo]);
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
  const territorioNombre = opciones.find(o => o.id === elegidoT)?.nombre || (x && x !== 'fallo' ? x.territorio : null);
  // El título de la pestaña del navegador dice el territorio y la nota (bot de UX: mejor al compartir).
  useEffect(() => {
    if (!comoCabecera || !x || x === 'fallo' || actual === null || !territorioNombre) return;
    const antes = document.title, nuevo = `${x.nombre} en ${territorioNombre} · ${textoNota(actual)}/10`;
    if (!antes.includes(nuevo)) document.title = antes.replace(x.nombre, nuevo);
    return () => { document.title = antes; };
  }, [comoCabecera, x, actual, territorioNombre]);

  // Las pestañas que van abajo, en la barra de la red. Solo las que tienen algo.
  const medidas = useMemo(() => (nivelActual !== null && nivelActual < 10 ? ideas(niveles.find(v => v.nivel === nivelActual)?.medidas || '') : []), [niveles, nivelActual]);
  useEffect(() => {
    if (!paginaId || !x || x === 'fallo' || sinNota) { if (paginaId) quitarPestanasExtra(paginaId); return; }
    const red = x.red;
    const de = (re: RegExp) => red.filter(g => re.test(sinTilde(g.nombre)));
    const fallos = de(/fallo|consecuen/), mejoras = de(/mejora|linea|punto|objetivo/), proyectos = de(/proyecto|soluci/);
    const cuenta = (gs: Grupo[]) => gs.reduce((a, g) => a + g.entradas.length, 0);
    const solNiveles = x.niveles.filter(v => v.soluciones && (nivelActual === null || v.nivel >= nivelActual)).sort((a, b) => b.nivel - a.nivel);
    const nSol = solNiveles.reduce((a, v) => a + ideas(v.soluciones).length, 0) + cuenta(proyectos);
    const fallosTexto = ideas(x.diagnostico);
    const lista: PestanaExtra[] = [];
    if (medidas.length && nivelActual !== null) lista.push({
      id: 'salto', titulo: `Salto ${nivelActual}→${nivelActual + 1}`,
      contenido: <div className="max-w-3xl"><Salto desde={x.niveles.find(v => v.nivel === nivelActual) || { nivel: nivelActual, titulo: '' }}
        hasta={x.niveles.find(v => v.nivel === nivelActual + 1) || { nivel: nivelActual + 1, titulo: '' }} medidas={medidas} /></div>,
    });
    if (nSol) lista.push({ id: 'soluciones', titulo: 'Soluciones', n: nSol, contenido: <PanelSoluciones solNiveles={solNiveles} nivelActual={nivelActual} proyectos={proyectos} /> });
    if (fallosTexto.length || cuenta(fallos)) lista.push({ id: 'diagnostico', titulo: 'Diagnóstico', n: fallosTexto.length + cuenta(fallos), contenido: <PanelDiagnostico fallos={fallosTexto} grupos={fallos} territorio={territorioNombre} /> });
    if (cuenta(mejoras)) lista.push({ id: 'plan', titulo: 'Plan', n: cuenta(mejoras), contenido: <div className="max-w-3xl"><p className="mb-3 text-sm text-slate-600">Las mejoras propuestas, sus líneas de trabajo y los puntos concretos.</p><Grupos grupos={mejoras} /></div> });
    ponerPestanasExtra(paginaId, lista);
  }, [paginaId, x, sinNota, nivelActual, medidas, territorioNombre]);
  useEffect(() => () => { if (paginaId) quitarPestanasExtra(paginaId); }, [paginaId]);

  if (!paginaId) return <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs font-bold text-slate-400">El termómetro va en la página de un sistema.</p>;
  if (x === null) return <div className="mb-6 h-64 animate-pulse rounded-3xl bg-slate-50" />;
  if (x === 'fallo') return null;
  const tonos = actual !== null ? tonosDeNota(actual) : null;
  const tonosN = tonosDeNota(n);
  const portada = x.pagina?.portada || (x.pagina?.icono && /^(https?:|\/)/.test(x.pagina.icono) ? x.pagina.icono : null);
  const icono = x.pagina?.icono && !/^(https?:|\/)/.test(x.pagina.icono) ? x.pagina.icono : null;
  const elegirNivel = (v: number) => { setElegido(v === nivelActual ? null : v); setEncima(null); };
  const rotulo = n === nivelActual ? `Hoy en ${territorioNombre || 'este territorio'}` : n === 10 ? 'Nivel 10 · máxima aspiración' : n > (nivelActual ?? -1) ? `Nivel ${n} · meta posible` : `Nivel ${n} · por debajo de hoy`;
  const selector = x.tabla_territorios && opciones.length > 0 ? (
    <ElegirTerritorio compacto opciones={opciones} conDatos={conDatos} elegido={elegidoT}
      onElegir={id => { setTerr(id); guardarTerritorio(id, ''); setElegido(null); }} />
  ) : null;
  return (
    <div data-termometro className={cn(comoCabecera ? 'mb-5' : 'my-6')}>
      {ranura && selector && createPortal(selector, ranura)}
      <section className="grid grid-cols-1 gap-4 rounded-3xl border p-4 sm:p-5 lg:grid-cols-[auto_auto_minmax(0,1fr)] lg:items-center lg:gap-x-8"
        style={tonos ? { backgroundColor: tonos.fondo, borderColor: tonos.borde } : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
        {/* Sin el título arriba (en el editor de un bloque suelto, por ejemplo), aquí la cabecera entera. */}
        {!sinTitulo && (
          <header className="flex flex-wrap items-center justify-center gap-3 lg:col-span-3">
            {portada ? <img src={miniatura(portada, 160)} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-sm ring-1 ring-black/10" /> : icono && <span className="text-4xl leading-none">{icono}</span>}
            <div className="min-w-0 text-left">
              {comoCabecera ? <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900">{x.nombre}</h1> : <p className="text-2xl font-black leading-tight tracking-tight text-slate-900">{x.nombre}</p>}
              {x.pagina?.subtitulo && <p className="text-sm leading-snug text-slate-600">{x.pagina.subtitulo}</p>}
            </div>
            {!ranura && selector}
          </header>
        )}

        {/* El termómetro (en el móvil, tumbado). */}
        <div className="hidden lg:block lg:pr-8">
          <Tubo niveles={niveles} actual={actual} elegido={fijo} onElegir={elegirNivel} onEncima={setEncima} />
        </div>

        {/* La nota, grande. */}
        {actual !== null && tonos && (
          <div className="flex items-center justify-center gap-3 lg:flex-col lg:gap-1.5">
            <span data-nota-sistema aria-label={`Nota ${textoNota(actual)} sobre 10`} className="inline-flex items-baseline rounded-2xl px-4 py-2 font-black leading-none tabular-nums shadow-sm"
              style={{ backgroundColor: tonos.color, color: textoSobre(tonos.color) }}>
              <span className="text-5xl lg:text-6xl">{textoNota(actual)}</span><span className="ml-1 text-base opacity-75">/10</span>
            </span>
            <p className="text-sm font-black" style={{ color: tonos.tinta }}>Nivel {nivelActual}</p>
          </div>
        )}

        {/* El nivel que se señala en el termómetro (el de hoy, si no se ha pulsado otro). */}
        <div className="min-w-0">
          {sinNota ? (
            <div data-sin-nota className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center">
              <p className="font-black text-slate-800">Todavía no hay nota de {x.nombre} para {territorioNombre}.</p>
              {propio && <button type="button" onClick={() => { setTerr(propio); guardarTerritorio(propio, ''); }} className="mt-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-700">Ver {x.territorio}</button>}
            </div>
          ) : (
            <>
              <div className="mb-3 lg:hidden"><TuboHorizontal actual={actual} elegido={fijo} onElegir={elegirNivel} /></div>
              <div data-nivel-elegido aria-live="polite" className="flex flex-col rounded-2xl bg-white/90 p-4 ring-1 ring-black/5 sm:p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: tonosN.tinta }}>{rotulo}</p>
                <h2 className="mt-0.5 text-lg font-black leading-snug text-slate-900">{info?.titulo || ESCALA[n]}</h2>
                {info?.descripcion && <p className={cn('mt-1 text-sm leading-relaxed text-slate-700', !leerMas && 'max-lg:line-clamp-3')}>{info.descripcion}</p>}
                {info?.descripcion && !leerMas && <button type="button" onClick={() => setLeerMas(true)} className="-mb-2 inline-flex min-h-11 items-center self-start text-xs font-bold text-slate-700 underline lg:hidden">Leer más</button>}
                {!info && <p className="mt-1 text-sm text-slate-500">Aún no se ha descrito este nivel.</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {n === nivelActual && medidas.length > 0 && (
                    <button type="button" onClick={() => abrirPestanaRed(paginaId, 'salto')}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 text-[13px] font-bold text-white hover:bg-slate-700">
                      <TrendingUp className="h-4 w-4" /> Qué hace falta para llegar al nivel {nivelActual! + 1}
                    </button>
                  )}
                  {elegido !== null && nivelActual !== null && encima === null && (
                    <button type="button" onClick={() => setElegido(null)} className="inline-flex min-h-9 items-center gap-1 text-[13px] font-bold text-slate-600 hover:text-slate-900"><Undo2 className="h-3.5 w-3.5" /> Volver a hoy (nivel {nivelActual})</button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export default function Lectura({ datos, paginaId }: PropsLectura) {
  return <VistaTermometro datos={datos} paginaId={paginaId} />;
}
