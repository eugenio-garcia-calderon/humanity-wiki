import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  fila_id?: string; columna_nota?: string | null;
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


/** LA ESCALA EN HORIZONTAL (2026-10-26, Eugenio: «la barra de la galería, donde
 *  indica el lugar en el que está, en horizontal en la página de cada entrada»).
 *  Sustituye al termómetro vertical: los once niveles con su color, «HOY» y
 *  «META» debajo; pasar el ratón enseña el nivel, pulsarlo lo deja abierto. */
function Escala({ niveles, actual, elegido, onElegir, onEncima }: {
  niveles: Nivel[]; actual: number | null; elegido: number; onElegir: (n: number) => void; onEncima: (n: number | null) => void;
}) {
  const hoy = actual !== null ? Math.floor(actual) : null, sig = hoy !== null && hoy < 10 ? hoy + 1 : null;
  return (
    <div data-escala onMouseLeave={() => onEncima(null)}>
      <div role="radiogroup" aria-label="Niveles del 0 al 10" data-flechas className="flex gap-1">
        {Array.from({ length: 11 }, (_, n) => {
          const info = niveles.find(x => x.nivel === n);
          const c = colorDeNota(n);
          return (
            <button key={n} type="button" role="radio" aria-checked={elegido === n} tabIndex={elegido === n ? 0 : -1} data-pos={n}
              aria-label={`Nivel ${n}${info?.titulo ? ` — ${info.titulo}` : ''}${n === hoy ? ' (hoy)' : n === sig ? ' (meta)' : ''}`}
              onClick={() => onElegir(n)} onMouseEnter={() => onEncima(n)} onKeyDown={e => conFlechas(e, n, 10, onElegir, 'h')}
              className={cn('grid h-9 min-w-0 flex-1 place-items-center rounded-lg text-xs font-black tabular-nums transition-transform hover:-translate-y-0.5',
                n === hoy && 'h-11 -my-1 text-base shadow-md ring-2 ring-slate-900 ring-offset-2',
                elegido === n && n !== hoy && 'ring-2 ring-slate-500 ring-offset-1',
                n === sig && elegido !== n && '[outline:2px_dashed_rgb(180_83_9)] [outline-offset:2px]')}
              style={{ backgroundColor: c, color: textoSobre(c) }}>
              {n}
            </button>
          );
        })}
      </div>
      <div aria-hidden className="mt-1.5 flex gap-1 text-[10px] font-black uppercase leading-none">
        {Array.from({ length: 11 }, (_, n) => (
          // «urgente» y «resuelto» se alinean hacia dentro: en el móvil no caben en su casilla y no deben salirse de la página.
          <span key={n} className={cn('flex min-w-0 flex-1 whitespace-nowrap', n === 0 && n !== hoy && n !== sig ? 'justify-start' : n === 10 && n !== hoy && n !== sig ? 'justify-end' : 'justify-center')}>
            {n === hoy ? <span className="text-slate-900">hoy</span> : n === sig ? <span className="text-amber-700">meta</span>
              : n === 0 ? <span className="font-bold normal-case text-slate-500">urgente</span> : n === 10 ? <span className="font-bold normal-case text-slate-500">resuelto</span> : null}
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

/** Lo que el editor pasa para cambiar la cabecera ahí mismo (2026-10-26, Eugenio:
 *  «los elementos para modificar estas propiedades, mucho más sencillos y sobrios»). */
export type EdicionCabecera = {
  titulo: string; onTitulo: (v: string) => void;
  subtitulo: string; onSubtitulo: (v: string) => void;
  onPortada: () => void;
  /** Las demás propiedades de la fila (diagnóstico, enlaces…), plegadas. */
  propiedades?: React.ReactNode;
};

export function VistaTermometro({ datos: d, paginaId }: { datos: Record<string, unknown>; paginaId?: string }) {
  const comoCabecera = d.comoCabecera === true;
  const edicion = (d.edicion || null) as EdicionCabecera | null;
  const [x, setX] = useState<Datos | null | 'fallo'>(null);
  const [elegido, setElegido] = useState<number | null>(null);
  const [encima, setEncima] = useState<number | null>(null);
  const [leerMas, setLeerMas] = useState(false);
  const [verProps, setVerProps] = useState(false);
  const [falloNota, setFalloNota] = useState<string | null>(null);
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
    if (!comoCabecera || edicion || !x || x === 'fallo' || actual === null || !territorioNombre) return;
    const antes = document.title, nuevo = `${x.nombre} en ${territorioNombre} · ${textoNota(actual)}/10`;
    if (!antes.includes(nuevo)) document.title = antes.replace(x.nombre, nuevo);
    return () => { document.title = antes; };
  }, [comoCabecera, edicion, x, actual, territorioNombre]);

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
  if (x === null) return <div className="mb-6 h-56 animate-pulse rounded-3xl bg-slate-50" />;
  if (x === 'fallo') return null;
  const tonos = actual !== null ? tonosDeNota(actual) : null;
  const tonosN = tonosDeNota(n);
  const portada = x.pagina?.portada || (x.pagina?.icono && /^(https?:|\/)/.test(x.pagina.icono) ? x.pagina.icono : null);
  const icono = x.pagina?.icono && !/^(https?:|\/)/.test(x.pagina.icono) ? x.pagina.icono : null;
  const elegirNivel = (v: number) => { setElegido(v === nivelActual ? null : v); setEncima(null); };
  const rotulo = n === nivelActual ? `Hoy en ${territorioNombre || 'este territorio'}` : n === 10 ? 'Nivel 10 · máxima aspiración' : n > (nivelActual ?? -1) ? `Nivel ${n} · meta posible` : `Nivel ${n} · por debajo de hoy`;
  const titulo = edicion ? edicion.titulo : x.nombre;
  const subtitulo = edicion ? edicion.subtitulo : (x.pagina?.subtitulo || '');
  // La nota, desde la propia tarjeta (editor): una lista del 1 al 10, nada más.
  const cambiarNota = async (v: number) => {
    if (!x.fila_id || !x.columna_nota) return;
    setFalloNota(null);
    const antes = x.nota;
    setX({ ...x, nota: v });
    const r = await fetch(`/api/bd/filas/${encodeURIComponent(x.fila_id)}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ celdas: { [x.columna_nota]: v } }) }).catch(() => null);
    if (!r?.ok) { setX({ ...x, nota: antes }); setFalloNota('No se ha podido guardar la nota.'); }
  };
  const campo = 'w-full rounded-md bg-transparent outline-none transition-colors hover:bg-white/25 focus:bg-white/35 focus:ring-2 focus:ring-white/70';
  const notaPildora = actual !== null && tonos ? (
    <span data-nota-sistema aria-label={`Nota ${textoNota(actual)} sobre 10`}
      className="relative inline-flex shrink-0 items-baseline rounded-full bg-white px-4 py-1.5 font-black leading-none tabular-nums shadow-sm" style={{ color: tonos.tinta }}>
      <span className="text-4xl">{textoNota(actual)}</span><span className="ml-0.5 text-xs font-bold opacity-70">/10</span>
      {edicion && x.columna_nota && (
        <select aria-label="Cambiar la nota" value={Math.round(actual)} onChange={e => cambiarNota(Number(e.target.value))}
          className="absolute inset-0 cursor-pointer opacity-0">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      )}
    </span>
  ) : null;
  const imagen = portada
    ? <img src={miniatura(portada, 240)} alt="" className="h-full w-full object-contain" />
    : icono ? <span className="text-5xl leading-none">{icono}</span> : <span className="text-xs font-bold text-slate-400">{edicion ? 'Añadir imagen' : ''}</span>;

  return (
    <div data-termometro className={cn(comoCabecera ? 'mb-5' : 'my-6', 'space-y-3')}>
      {/* Arriba: el territorio a la izquierda y, a la derecha, la tarjeta de la galería en horizontal. */}
      <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
        <div className="min-w-0">
          {x.tabla_territorios && opciones.length > 0 && (
            <ElegirTerritorio alinear="izquierda" opciones={opciones} conDatos={conDatos} elegido={elegidoT}
              onElegir={id => { setTerr(id); guardarTerritorio(id, ''); setElegido(null); }} />
          )}
        </div>
        <div data-tarjeta-sistema className="flex items-center gap-4 rounded-3xl p-3 shadow-sm"
          style={tonos ? { backgroundColor: tonos.color, color: textoSobre(tonos.color) } : { backgroundColor: '#e2e8f0' }}>
          {edicion
            ? <button type="button" onClick={edicion.onPortada} title="Cambiar la imagen" className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1.5 sm:h-24 sm:w-24 hover:ring-2 hover:ring-white/80">{imagen}</button>
            : <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white p-1.5 sm:h-24 sm:w-24">{imagen}</div>}
          <div className="min-w-0 flex-1">
            {edicion
              ? <input aria-label="Título" value={titulo} onChange={e => edicion.onTitulo(e.target.value)} className={cn(campo, 'px-1 text-2xl font-black tracking-tight')} />
              : comoCabecera ? <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl">{titulo}</h1> : <p className="text-2xl font-black leading-tight tracking-tight">{titulo}</p>}
            {edicion
              ? <input aria-label="Descripción" value={subtitulo} placeholder="Añadir una descripción" onChange={e => edicion.onSubtitulo(e.target.value)} className={cn(campo, 'mt-0.5 px-1 text-sm font-semibold placeholder:opacity-60')} />
              : subtitulo && <p className="mt-0.5 text-sm font-semibold leading-snug opacity-90">{subtitulo}</p>}
          </div>
          {notaPildora}
        </div>
      </div>
      {falloNota && <p role="alert" className="text-xs font-bold text-rose-600">{falloNota}</p>}

      {sinNota ? (
        <div data-sin-nota className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-center">
          <p className="font-black text-slate-800">Todavía no hay nota de {x.nombre} para {territorioNombre}.</p>
          {propio && <button type="button" onClick={() => { setTerr(propio); guardarTerritorio(propio, ''); }} className="mt-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-700">Ver {x.territorio}</button>}
        </div>
      ) : (
        <>
          {/* La barra con el lugar en el que está, en horizontal. */}
          <Escala niveles={niveles} actual={actual} elegido={fijo} onElegir={elegirNivel} onEncima={setEncima} />
          {/* El nivel que se señala (el de hoy, si no se ha pulsado otro), en una franja. */}
          <div data-nivel-elegido aria-live="polite" className="flex flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center"
            style={{ backgroundColor: tonosN.fondo }}>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: tonosN.tinta }}>{rotulo}</p>
              <h2 className="text-base font-black leading-snug text-slate-900">{info?.titulo || ESCALA[n]}</h2>
              {info?.descripcion && <p className={cn('mt-0.5 text-sm leading-relaxed text-slate-700', !leerMas && 'line-clamp-2')}>{info.descripcion}</p>}
              {info?.descripcion && !leerMas && info.descripcion.length > 160 && <button type="button" onClick={() => setLeerMas(true)} className="inline-flex min-h-8 items-center text-xs font-bold text-slate-700 underline">Leer más</button>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {elegido !== null && nivelActual !== null && encima === null && (
                <button type="button" onClick={() => setElegido(null)} className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-[13px] font-bold text-slate-600 hover:bg-white/60 hover:text-slate-900"><Undo2 className="h-3.5 w-3.5" /> Volver a hoy</button>
              )}
              {n === nivelActual && medidas.length > 0 && (
                <button type="button" onClick={() => abrirPestanaRed(paginaId, 'salto')}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-slate-900 px-3.5 text-[13px] font-bold text-white hover:bg-slate-700">
                  <TrendingUp className="h-4 w-4" /> Qué hace falta para llegar al {nivelActual! + 1}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* En el editor, las demás propiedades de la entrada, plegadas y sin ruido. */}
      {edicion?.propiedades && (
        <div>
          <button type="button" onClick={() => setVerProps(v => !v)} aria-expanded={verProps}
            className="text-xs font-bold text-slate-500 hover:text-slate-800">{verProps ? 'Ocultar las propiedades' : 'Más propiedades de la entrada'}</button>
          {verProps && <div className="mt-2 rounded-2xl border border-slate-200 p-3">{edicion.propiedades}</div>}
        </div>
      )}
    </div>
  );
}

export default function Lectura({ datos, paginaId }: PropsLectura) {
  return <VistaTermometro datos={datos} paginaId={paginaId} />;
}
