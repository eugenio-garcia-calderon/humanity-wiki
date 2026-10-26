import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check, ChevronDown, ChevronRight, Target, TrendingUp, Undo2 } from 'lucide-react';
import type { PropsLectura } from '../tipos';
import { tonosDeNota, textoNota, textoSobre, colorDeNota } from '../../../utils/nota';
import { useSitio } from '../../sitio/ContextoSitio';
import { createPortal } from 'react-dom';
import { Eslabon, Union, NotaEslabon } from '../../sitio/Eslabon';
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
  fila_id?: string; columna_nota?: string | null; padre?: { nombre: string; pagina_id: string | null; fila_id: string; tabla_id: string | null } | null;
  tabla_id?: string; ruta_nombre?: string | null;
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
 *  Una barra fina con los once niveles de color, como la del resumen del
 *  territorio; «HOY» y «META» debajo. Pasar el ratón enseña el nivel, pulsarlo lo deja abierto. */
function Escala({ niveles, actual, elegido, onElegir, onEncima }: {
  niveles: Nivel[]; actual: number | null; elegido: number; onElegir: (n: number) => void; onEncima: (n: number | null) => void;
}) {
  const hoy = actual !== null ? Math.floor(actual) : null, sig = hoy !== null && hoy < 10 ? hoy + 1 : null;
  return (
    <div data-escala onMouseLeave={() => onEncima(null)}>
      <div role="radiogroup" aria-label="Niveles del 0 al 10" data-flechas className="flex items-center">
        {Array.from({ length: 11 }, (_, n) => {
          const info = niveles.find(x => x.nivel === n);
          const c = colorDeNota(n);
          return (
            <button key={n} type="button" role="radio" aria-checked={elegido === n} tabIndex={elegido === n ? 0 : -1} data-pos={n}
              aria-label={`Nivel ${n}${info?.titulo ? ` — ${info.titulo}` : ''}${n === hoy ? ' (hoy)' : n === sig ? ' (meta)' : ''}`}
              onClick={() => onElegir(n)} onMouseEnter={() => onEncima(n)} onKeyDown={e => conFlechas(e, n, 10, onElegir, 'h')}
              className={cn('relative grid h-5 min-w-0 flex-1 place-items-center text-[10px] font-black tabular-nums transition-all hover:h-7',
                n === 0 && 'rounded-l-full', n === 10 && 'rounded-r-full',
                n === hoy && 'z-[1] h-8 rounded-md text-sm shadow-md ring-2 ring-slate-900 ring-offset-2 hover:h-8',
                elegido === n && n !== hoy && 'z-[1] h-7 rounded-md ring-2 ring-slate-500 ring-offset-1',
                n === sig && elegido !== n && 'z-[1] rounded-sm [outline:2px_dashed_rgb(180_83_9)] [outline-offset:2px]')}
              style={{ backgroundColor: c, color: textoSobre(c) }}>
              {n}
            </button>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 flex text-[10px] font-black uppercase leading-none">
        {Array.from({ length: 11 }, (_, n) => (
          // «urgente» y «resuelto» se alinean hacia dentro: en el móvil no caben en su casilla y no deben salirse de la página.
          <span key={n} className={cn('flex min-w-0 flex-1 whitespace-nowrap', n === 0 && n !== hoy && n !== sig ? 'justify-start' : n === 10 && n !== hoy && n !== sig ? 'justify-end' : 'justify-center')}>
            {n === hoy ? <span className="text-slate-900">hoy</span> : n === sig ? <span className="text-amber-700">meta</span>
              : n === 0 ? <span className="font-bold normal-case text-slate-500">lo más urgente</span> : n === 10 ? <span className="font-bold normal-case text-slate-500">resuelto</span> : null}
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

// LOS OBJETIVOS Y SUS INDICADORES (2026-10-26, Eugenio: «en cada sistema, una galería de
// sus objetivos estratégicos con su nota, como la de la página principal; y al pinchar
// un objetivo, lo mismo: el territorio, la temperatura con la nota y sus proyectos»).
// `datos.tabla_objetivos`: la base de datos de objetivos; se enseñan los que enlazan con
// esta entrada y con el territorio elegido. `datos.tabla_indicadores`: la de indicadores;
// se enseñan los de este objetivo, cumplidos o no. Nota = 1 + 0,9 × indicadores cumplidos.
type Objetivo = { fila_id: string; pagina_id: string | null; titulo: string; numero: number | null; nota: number | null; imagen: string | null; icono: string | null; descripcion: string };
type Estado = 'Acreditado' | 'No acreditado' | 'Parcial' | 'Sin evaluar';
type Indicador = { fila_id: string; pagina_id: string | null; titulo: string; numero: number | null; codigo: string; icono: string | null; unidad: string; estado: Estado; descripcion: string };
const ESTADOS: Record<Estado, { clase: string; corto: string }> = {
  'Acreditado': { clase: 'bg-emerald-600 text-white', corto: '✓ Acreditado' },
  'Parcial': { clase: 'bg-amber-400 text-slate-900', corto: '◐ Parcial' },
  'No acreditado': { clase: 'bg-rose-100 text-rose-800', corto: '✗ No acreditado' },
  'Sin evaluar': { clase: 'bg-slate-100 text-slate-600', corto: 'Sin evaluar' },
};
type FilasTabla = { columnas: any[]; filas: any[]; columna_titulo: string | null };
const tablas = new Map<string, Promise<FilasTabla | null>>();
const leerTabla = (id: string) => {
  let p = tablas.get(id);
  if (!p) { p = fetch(`/api/bd/tablas/${encodeURIComponent(id)}`, { credentials: 'include' }).then(r => (r.ok ? r.json() : null)).catch(() => null); tablas.set(id, p); }
  return p;
};
/** Las filas de `t` que enlazan con `filaId` (por cualquier relación), y con el territorio si la tabla lo tiene. */
function enlazadas(t: FilasTabla, filaId: string, territorio?: string) {
  const rel = t.columnas.filter((c: any) => c.tipo === 'relacion');
  const colTerr = rel.find((c: any) => /territor/.test(sinTilde(c.nombre)));
  return t.filas.filter((f: any) => !f.oculta
    && rel.some((c: any) => (f.apuntados?.[c.id] || []).some((a: any) => a.id === filaId))
    && (!colTerr || !territorio || (f.apuntados?.[colTerr.id] || []).some((a: any) => a.id === territorio)));
}
const celda = (f: any, c?: any) => (c && f.celdas?.[c.id]?.estado === 'ok' ? f.celdas[c.id].valor : null);

function PanelObjetivos({ objetivos }: { objetivos: Objetivo[] }) {
  const sitio = useSitio();
  // (2026-10-26, Eugenio) Sin el texto de arriba («12 objetivos…», la media y el más bajo): solo las tarjetas,
  // pequeñas, blancas con contorno y sombra, y solo la nota con su color.
  const orden = [...objetivos].sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || (a.numero ?? 99) - (b.numero ?? 99));
  return (
    <div data-objetivos className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {orden.map(o => {
        const t = o.nota !== null ? tonosDeNota(o.nota) : null;
        const contenido = (
          <div data-objetivo={o.numero ?? undefined} className="flex h-full flex-col rounded-2xl bg-white p-2 ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_18px_-8px_rgba(15,23,42,0.18)] transition-shadow hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_12px_28px_-10px_rgba(15,23,42,0.25)]">
            <div lang="es" className="flex min-h-[2.5rem] items-start justify-between gap-1.5 px-1 pt-0.5">
              <p className="min-w-0 hyphens-auto text-[13px] font-black leading-tight text-slate-900">{o.titulo}</p>
              {o.nota !== null && t && (
                <span className="inline-flex h-7 shrink-0 items-center rounded-full px-2 text-sm font-black tabular-nums leading-none shadow-sm" style={{ backgroundColor: t.color, color: textoSobre(t.color) }}>
                  {textoNota(o.nota)}<span className="ml-0.5 text-[8px] font-bold opacity-75">/10</span>
                </span>
              )}
            </div>
            <div className="relative mt-1.5 grid aspect-[16/10] place-items-center overflow-hidden rounded-xl p-1.5">
              {/* Su portada o, si no la tiene, su icono (los objetivos de los demás sistemas llevan un emoji).
                  The cover is absolutely positioned: `h-full` inside an auto-height grid
                  track does not resolve, so an image with its own size (an SVG with
                  width/height 240) overflowed the 16:10 box and was cut at the bottom. */}
              {o.imagen ? <img src={miniatura(o.imagen, 200)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain p-1.5" />
                : o.icono && !/^(https?:|\/)/.test(o.icono) ? <span className="text-5xl leading-none" aria-hidden>{o.icono}</span>
                : o.icono ? <img src={miniatura(o.icono, 120)} alt="" className="h-14 w-14 object-contain" /> : <Target className="h-8 w-8 text-slate-300" />}
            </div>
          </div>
        );
        return o.pagina_id
          ? <Link key={o.fila_id} to={sitio ? sitio.enlacePagina(o.pagina_id) : `/paginas/${o.pagina_id}`} title={o.descripcion || o.titulo}>{contenido}</Link>
          : <div key={o.fila_id}>{contenido}</div>;
      })}
    </div>
  );
}

/** LOS INDICADORES DE UN OBJETIVO, EN GALERÍA (2026-10-26, Eugenio: «a cada indicador, un icono;
 *  y la vista de galería con esos iconos en todos los objetivos»): su icono, código, nombre y
 *  estado en el territorio (de «Evaluaciones de indicadores»); al pulsar, su ficha técnica. */
function PanelIndicadores({ indicadores, territorio }: { indicadores: Indicador[]; territorio: string | null }) {
  const sitio = useSitio();
  const cuenta = (e: Estado) => indicadores.filter(i => i.estado === e).length;
  const n = cuenta('Acreditado');
  const nota = Math.round((1 + 0.9 * n) * 10) / 10;
  const orden = [...indicadores].sort((a, b) => (a.numero ?? 99) - (b.numero ?? 99));
  const resto = (['Parcial', 'No acreditado', 'Sin evaluar'] as Estado[]).filter(e => cuenta(e)).map(e => `${cuenta(e)} ${e.toLowerCase()}${cuenta(e) > 1 && e !== 'Sin evaluar' ? 's' : ''}`);
  return (
    <div data-indicadores>
      <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <b className="font-black text-slate-900">{n} de {indicadores.length} indicadores acreditados{territorio ? ` en ${territorio}` : ''}</b>
        {resto.length > 0 && <span>({resto.join(' · ')})</span>}
        <span>→ nota 1 + 0,9 × {n} =</span>
        <span className="rounded-full px-2.5 py-0.5 font-black tabular-nums" style={{ backgroundColor: colorDeNota(nota), color: textoSobre(colorDeNota(nota)) }}>{textoNota(nota)}</span>
      </p>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {orden.map(i => {
          const e = ESTADOS[i.estado];
          const tarjeta = (
            <div data-indicador={i.codigo || undefined} className={cn('flex h-full flex-col rounded-2xl border bg-white p-3 transition-shadow hover:shadow-md', i.estado === 'Acreditado' ? 'border-emerald-200' : 'border-slate-200')}>
              <div className="flex items-start justify-between gap-2">
                <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl', i.estado === 'Acreditado' ? 'bg-emerald-50' : 'bg-slate-50')} aria-hidden>{i.icono || '📏'}</span>
                <span className="text-[11px] font-black tabular-nums text-slate-400">{i.codigo || (i.numero !== null ? `#${i.numero}` : '')}</span>
              </div>
              <p lang="es" className="mt-2 hyphens-auto text-[13px] font-black leading-snug text-slate-900">{i.titulo}</p>
              {i.unidad && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{i.unidad}</p>}
              <div className="mt-auto pt-3"><span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-black', e.clase)}>{e.corto}</span></div>
            </div>
          );
          return (
            <li key={i.fila_id} title={i.descripcion || undefined}>
              {i.pagina_id ? <Link to={sitio ? sitio.enlacePagina(i.pagina_id) : `/paginas/${i.pagina_id}`} className="block h-full">{tarjeta}</Link> : tarjeta}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** UN PASO DE LA RUTA DE LA BARRA, DESPLEGABLE (2026-10-26, Eugenio: «que Movilidad sea un desplegable
 *  y pueda elegir otro sistema, igual que el territorio»). Una palabra; al pulsar, sus hermanos. */
type OpcionRuta = { id: string; nombre: string; pagina_id: string; icono?: string | null };
/** El icono de un paso: su portada (un dibujo) o su emoji. */
function IconoPaso({ icono }: { icono?: string | null }) {
  if (!icono) return null;
  return /^(https?:|\/)/.test(icono) ? <img src={miniatura(icono, 48)} alt="" className="h-6 w-6 shrink-0 object-contain" /> : <span className="text-lg leading-none" aria-hidden>{icono}</span>;
}
function PasoRuta({ etiqueta, titulo, opciones, actual, h1, apagado, icono }: { etiqueta: string; titulo: string; opciones: OpcionRuta[]; actual: string | null; h1?: boolean; apagado?: boolean; icono?: string | null }) {
  const sitio = useSitio();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera); document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);
  const Texto = h1 ? 'h1' : 'span';
  const contenido = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="hidden sm:contents"><IconoPaso icono={icono} /></span>
      {/* La misma letra que el territorio (2026-10-26): base y negrita. */}
      <Texto title={titulo} className={cn('truncate text-base font-black tracking-tight sm:text-lg', apagado ? 'text-slate-600' : 'text-slate-900')}>
        {etiqueta}{h1 && etiqueta !== titulo && <span className="sr-only"> · {titulo}</span>}
      </Texto>
    </span>
  );
  if (opciones.length < 2) return <span className="inline-flex min-w-0 items-center px-1.5">{contenido}</span>;
  return (
    <div ref={caja} className="relative min-w-0">
      <button type="button" onClick={() => setAbierto(a => !a)} aria-haspopup="listbox" aria-expanded={abierto} title={`Cambiar: ${titulo}`}
        className="inline-flex h-9 min-w-0 max-w-full items-center gap-1 rounded-full px-2 hover:bg-slate-100">
        {contenido}<ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', abierto && 'rotate-180')} />
      </button>
      {abierto && (
        <ul role="listbox" className="absolute left-1/2 top-full z-50 mt-2 max-h-80 w-64 -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-2xl">
          {opciones.map(o => (
            <li key={o.id}>
              <Link to={sitio ? sitio.enlacePagina(o.pagina_id) : `/paginas/${o.pagina_id}`} role="option" aria-selected={o.id === actual} onClick={() => setAbierto(false)}
                className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold', o.id === actual ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50')}>
                <span className="flex-1 truncate">{o.nombre}</span>{o.id === actual && <Check className="h-4 w-4" />}
              </Link>
            </li>
          ))}
        </ul>
      )}
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
  // LA BARRA DEL SITIO (2026-10-26): el territorio y la ruta van arriba, en sus huecos (`CabeceraSitio`).
  const [ranuras, setRanuras] = useState<{ terr: HTMLElement | null; ruta: HTMLElement | null; mirado?: boolean }>({ terr: null, ruta: null });
  useEffect(() => {
    if (!comoCabecera || edicion) return;
    const mirar = () => setRanuras({ terr: document.querySelector<HTMLElement>('[data-ranura-territorio]'), ruta: document.querySelector<HTMLElement>('[data-ranura-ruta]'), mirado: true });
    mirar();
    const t = window.setTimeout(mirar, 400);
    return () => window.clearTimeout(t);
  }, [comoCabecera, !!edicion]); // eslint-disable-line react-hooks/exhaustive-deps
  // Los hermanos de cada paso de la ruta: los sistemas (los de arriba del todo) y, en un objetivo, los de su sistema.
  const [opcPadre, setOpcPadre] = useState<OpcionRuta[]>([]);
  const [opcActual, setOpcActual] = useState<OpcionRuta[]>([]);
  useEffect(() => {
    if (!ranuras.ruta || !x || x === 'fallo') return;
    let vivo = true;
    const opcion = (t: FilasTabla, f: any): OpcionRuta => {
      const cRuta = (t.columnas || []).find((c: any) => c.tipo === 'texto' && /ruta/.test(sinTilde(c.nombre)));
      return { id: f.id, pagina_id: f.pagina_id, icono: f.pagina?.imagen || f.pagina?.icono || null, nombre: String(celda(f, cRuta) || f.pagina?.titulo || celda(f, (t.columnas || []).find((c: any) => c.id === t.columna_titulo)) || 'Sin título') };
    };
    const deArriba = (t: FilasTabla) => {
      const madre = (t.columnas || []).find((c: any) => c.config?.rol === 'madre');
      return t.filas.filter((f: any) => f.pagina_id && !f.oculta && !(madre && (f.apuntados?.[madre.id] || []).length)).map((f: any) => opcion(t, f))
        .sort((a: OpcionRuta, b: OpcionRuta) => a.nombre.localeCompare(b.nombre, 'es'));
    };
    if (x.padre?.tabla_id) {
      leerTabla(x.padre.tabla_id).then(t => { if (vivo && t) setOpcPadre(deArriba(t)); });
      if (x.tabla_id) leerTabla(x.tabla_id).then(t => { if (vivo && t) setOpcActual(enlazadas(t, x.padre!.fila_id).filter((f: any) => f.pagina_id).map((f: any) => opcion(t, f))); });
    } else if (x.tabla_id) leerTabla(x.tabla_id).then(t => { if (vivo && t) setOpcActual(deArriba(t)); });
    return () => { vivo = false; };
  }, [ranuras.ruta, x]);
  const sitioRuta = useSitio();
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
  // Los objetivos de este sistema y los indicadores de este objetivo (si el bloque los pide).
  const [objetivos, setObjetivos] = useState<Objetivo[] | null>(null);
  const [indicadores, setIndicadores] = useState<Indicador[] | null>(null);
  const tObj = d.tabla_objetivos ? String(d.tabla_objetivos) : null, tInd = d.tabla_indicadores ? String(d.tabla_indicadores) : null;
  const filaId = x && x !== 'fallo' ? x.fila_id || null : null;
  useEffect(() => {
    if (!tObj || !filaId) { setObjetivos(null); return; }
    let vivo = true;
    leerTabla(tObj).then(t => {
      if (!vivo || !t) return;
      const cols = t.columnas || [];
      const cNota = cols.find((c: any) => c.tipo === 'nota'), cNum = cols.find((c: any) => c.tipo === 'numero'), cDesc = cols.find((c: any) => c.tipo === 'texto_largo');
      const cTit = cols.find((c: any) => c.id === t.columna_titulo);
      setObjetivos(enlazadas(t, filaId, elegidoT || undefined).map((f: any) => ({
        fila_id: f.id, pagina_id: f.pagina_id || null, titulo: String(f.pagina?.titulo || celda(f, cTit) || 'Sin título'),
        numero: celda(f, cNum) !== null ? Number(celda(f, cNum)) : null, nota: celda(f, cNota) !== null ? Number(celda(f, cNota)) : null,
        imagen: f.pagina?.imagen || null, icono: f.pagina?.icono || null, descripcion: String(f.pagina?.descripcion || celda(f, cDesc) || ''),
      })));
    });
    return () => { vivo = false; };
  }, [tObj, filaId, elegidoT]);
  const tEval = d.tabla_evaluaciones ? String(d.tabla_evaluaciones) : null;
  useEffect(() => {
    if (!tInd || !filaId) { setIndicadores(null); return; }
    let vivo = true;
    Promise.all([leerTabla(tInd), tEval ? leerTabla(tEval) : Promise.resolve(null)]).then(([t, ev]) => {
      if (!vivo || !t) return;
      const cols = t.columnas || [];
      const cNum = cols.find((c: any) => c.tipo === 'numero'), cOk = cols.find((c: any) => c.tipo === 'casilla');
      const cDesc = cols.find((c: any) => c.tipo === 'texto_largo' && /finalidad|descrip/.test(sinTilde(c.nombre)));
      const cCod = cols.find((c: any) => /^codigo/.test(sinTilde(c.nombre))), cUni = cols.find((c: any) => /^unidad/.test(sinTilde(c.nombre)));
      const cTit = cols.find((c: any) => c.id === t.columna_titulo);
      // El estado de cada indicador en el territorio elegido: la evaluación más reciente.
      const estados = new Map<string, Estado>();
      if (ev) {
        const ce = ev.columnas || [];
        const cInd = ce.find((c: any) => c.tipo === 'relacion' && c.config?.tabla_destino === tInd);
        const cTer = ce.find((c: any) => c.tipo === 'relacion' && /territor/.test(sinTilde(c.nombre)));
        const cEst = ce.find((c: any) => c.tipo === 'seleccion'), cFec = ce.find((c: any) => c.tipo === 'fecha');
        const etiqueta = (v: any) => (cEst?.opciones || []).find((o: any) => o.id === v)?.label || v;
        const fecha = new Map<string, string>();
        for (const f of ev.filas || []) {
          if (!cInd || !(cTer && elegidoT ? (f.apuntados?.[cTer.id] || []).some((a: any) => a.id === elegidoT) : true)) continue;
          const est = String(etiqueta(celda(f, cEst)) || 'Sin evaluar') as Estado, fe = String(celda(f, cFec) || '');
          for (const a of f.apuntados?.[cInd.id] || []) if (!fecha.has(a.id) || fe > fecha.get(a.id)!) { fecha.set(a.id, fe); estados.set(a.id, (ESTADOS[est] ? est : 'Sin evaluar')); }
        }
      }
      setIndicadores(enlazadas(t, filaId).map((f: any) => ({
        fila_id: f.id, pagina_id: f.pagina_id || null, titulo: String(celda(f, cTit) || f.pagina?.titulo || 'Sin título'),
        numero: celda(f, cNum) !== null ? Number(celda(f, cNum)) : null, codigo: String(celda(f, cCod) || ''), unidad: String(celda(f, cUni) || ''),
        icono: f.pagina?.icono || null, descripcion: String(celda(f, cDesc) || ''),
        estado: ev ? (estados.get(f.id) || 'Sin evaluar') : (celda(f, cOk) === true ? 'Acreditado' : 'No acreditado'),
      })));
    });
    return () => { vivo = false; };
  }, [tInd, tEval, filaId, elegidoT]);
  const medidas = useMemo(() => (nivelActual !== null && nivelActual < 10 ? ideas(niveles.find(v => v.nivel === nivelActual)?.medidas || '') : []), [niveles, nivelActual]);
  useEffect(() => {
    if (!paginaId || !x || x === 'fallo' || sinNota) { if (paginaId) quitarPestanasExtra(paginaId); return; }
    const red = x.red;
    const de = (re: RegExp) => red.filter(g => re.test(sinTilde(g.nombre)));
    const fallos = de(/fallo|consecuen/), mejoras = de(/mejora|linea|punto/), proyectos = de(/proyecto|soluci/);
    const cuenta = (gs: Grupo[]) => gs.reduce((a, g) => a + g.entradas.length, 0);
    const solNiveles = x.niveles.filter(v => v.soluciones && (nivelActual === null || v.nivel >= nivelActual)).sort((a, b) => b.nivel - a.nivel);
    const nSol = solNiveles.reduce((a, v) => a + ideas(v.soluciones).length, 0) + cuenta(proyectos);
    const fallosTexto = ideas(x.diagnostico);
    const lista: PestanaExtra[] = [];
    const ocultar: string[] = [];
    if (objetivos?.length) { lista.push({ id: 'objetivos', titulo: 'Objetivos', n: objetivos.length, contenido: <PanelObjetivos objetivos={objetivos} /> }); ocultar.push('objetivos'); }
    if (indicadores?.length) { lista.push({ id: 'indicadores', titulo: 'Indicadores', n: indicadores.length, contenido: <PanelIndicadores indicadores={indicadores} territorio={territorioNombre} /> }); ocultar.push('indicadores'); }
    if (medidas.length && nivelActual !== null) lista.push({
      id: 'salto', titulo: `Salto ${nivelActual}→${nivelActual + 1}`,
      contenido: <div className="max-w-3xl"><Salto desde={x.niveles.find(v => v.nivel === nivelActual) || { nivel: nivelActual, titulo: '' }}
        hasta={x.niveles.find(v => v.nivel === nivelActual + 1) || { nivel: nivelActual + 1, titulo: '' }} medidas={medidas} /></div>,
    });
    if (nSol) lista.push({ id: 'soluciones', titulo: 'Soluciones', n: nSol, contenido: <PanelSoluciones solNiveles={solNiveles} nivelActual={nivelActual} proyectos={proyectos} /> });
    if (fallosTexto.length || cuenta(fallos)) lista.push({ id: 'diagnostico', titulo: 'Diagnóstico', n: fallosTexto.length + cuenta(fallos), contenido: <PanelDiagnostico fallos={fallosTexto} grupos={fallos} territorio={territorioNombre} /> });
    if (cuenta(mejoras)) lista.push({ id: 'plan', titulo: 'Plan', n: cuenta(mejoras), contenido: <div className="max-w-3xl"><p className="mb-3 text-sm text-slate-600">Las mejoras propuestas, sus líneas de trabajo y los puntos concretos.</p><Grupos grupos={mejoras} /></div> });
    ponerPestanasExtra(paginaId, lista, ocultar);
  }, [paginaId, x, sinNota, nivelActual, medidas, territorioNombre, objetivos, indicadores]);
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
  const imagen = portada
    ? <img src={miniatura(portada, 160)} alt="" className="h-full w-full object-contain" />
    : icono ? <span className="text-4xl leading-none">{icono}</span> : <span className="text-[10px] font-bold text-slate-400">Imagen</span>;
  const circulo = actual !== null && tonos ? (
    <span data-nota-sistema aria-label={`Nota ${textoNota(actual)} sobre 10`}
      className="relative grid h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-full font-black tabular-nums shadow-md lg:h-24 lg:w-24"
      style={{ backgroundColor: tonos.color, color: textoSobre(tonos.color) }}>
      <span className="flex items-baseline text-3xl lg:text-4xl">{textoNota(actual)}<span className="ml-0.5 text-sm font-semibold">/10</span></span>
      {edicion && x.columna_nota && (
        <select aria-label="Cambiar la nota" title="Cambiar la nota" value={Math.round(actual)} onChange={e => cambiarNota(Number(e.target.value))}
          className="absolute inset-0 cursor-pointer rounded-full opacity-0">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      )}
    </span>
  ) : null;

  // Dónde va el texto del nivel: con el territorio dentro del recuadro, debajo en el móvil y en medio en el ordenador.
  const centro = ranuras.ruta ? 'col-span-2' : 'col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-1';
  return (
    <div data-termometro className={cn(comoCabecera ? 'mb-5' : 'my-6', 'space-y-3')}>
      {/* EL ESLABÓN DE LA BARRA (2026-10-26): «España ⛓ Movilidad · 5/10» (o «España ⛓ Movilidad › Intermodalidad · 6,4»):
          el territorio y el sistema unidos, con la misma letra, cada uno con su icono y su desplegable, y la nota al lado. */}
      {ranuras.ruta && createPortal(
        <Eslabon>
          {x.tabla_territorios && opciones.length > 0 && (
            <ElegirTerritorio segmento alinear="izquierda" opciones={opciones} conDatos={conDatos} elegido={elegidoT}
              onElegir={id => { setTerr(id); guardarTerritorio(id, ''); setElegido(null); }} />
          )}
          <Union />
          {x.padre?.nombre && (
            <>
              {opcPadre.length > 1
                ? <PasoRuta etiqueta={x.padre.nombre} titulo={x.padre.nombre} opciones={opcPadre} actual={x.padre.fila_id} apagado icono={opcPadre.find(o => o.id === x.padre!.fila_id)?.icono} />
                : x.padre.pagina_id
                  ? <Link to={sitioRuta ? sitioRuta.enlacePagina(x.padre.pagina_id) : `/paginas/${x.padre.pagina_id}`} className="shrink-0 truncate px-1.5 text-base font-black text-slate-600 hover:underline">{x.padre.nombre}</Link>
                  : <span className="shrink-0 truncate px-1.5 text-base font-black text-slate-600">{x.padre.nombre}</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </>
          )}
          <PasoRuta h1={comoCabecera} etiqueta={x.ruta_nombre || x.nombre} titulo={x.nombre} opciones={opcActual} actual={x.fila_id || null} icono={x.pagina?.portada || x.pagina?.icono} />
          {actual !== null && <NotaEslabon nota={actual} titulo={`${x.nombre} en ${territorioNombre || ''}`} />}
        </Eslabon>, ranuras.ruta)}
      {/* En el editor, el título y la imagen arriba y centrados, para cambiarlos ahí mismo (sin color, sobrio). */}
      {edicion && (
        <div className="flex items-center justify-center gap-2.5">
          <button type="button" onClick={edicion.onPortada} title="Cambiar la imagen" className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg hover:ring-2 hover:ring-slate-300">{imagen}</button>
          <input aria-label="Título" value={titulo} onChange={e => edicion.onTitulo(e.target.value)}
            style={{ width: `${Math.max(6, titulo.length + 1)}ch` }}
            className="min-w-0 max-w-full rounded-md bg-transparent px-1 text-3xl font-black tracking-tight text-slate-900 outline-none hover:bg-slate-50 focus:bg-slate-50 focus:ring-2 focus:ring-slate-200" />
        </div>
      )}

      {/* EL RECUADRO (2026-10-26, Eugenio: «así, como el del territorio»): el territorio, pequeño,
          a un lado; en el medio el nivel y la barra; a la derecha la nota en su círculo. */}
      {/* Sin la barra del sitio (una página fuera de un sitio), el título va aquí. */}
      {comoCabecera && !edicion && ranuras.mirado && !ranuras.ruta && <h1 className="text-center text-3xl font-black tracking-tight text-slate-900">{x.nombre}</h1>}
      <section data-resumen-sistema className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:gap-8', !ranuras.ruta && 'lg:grid-cols-[auto_minmax(0,1fr)_auto]')}>
        {/* Sin la barra del sitio (el editor), el territorio va aquí, a la izquierda. */}
        {!ranuras.ruta && <div className="col-start-1 row-start-1 flex lg:border-r lg:border-slate-100 lg:pr-6">
          {x.tabla_territorios && opciones.length > 0 && (
            <ElegirTerritorio compacto sinMarco alinear="izquierda" opciones={opciones} conDatos={conDatos} elegido={elegidoT}
              onElegir={id => { setTerr(id); guardarTerritorio(id, ''); setElegido(null); }} />
          )}
        </div>}

        {sinNota ? (
          <div data-sin-nota className={cn('text-center lg:text-left', centro)}>
            <p className="font-black text-slate-800">Todavía no hay nota de {x.nombre} para {territorioNombre}.</p>
            {propio && <button type="button" onClick={() => { setTerr(propio); guardarTerritorio(propio, ''); }} className="mt-2 rounded-full bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-700">Ver {x.territorio}</button>}
          </div>
        ) : (
          <div data-nivel-elegido aria-live="polite" className={cn('min-w-0', centro)}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                {n === nivelActual ? `${titulo} en ${territorioNombre || 'este territorio'} · nivel ${n}` : rotulo}
              </p>
              {elegido !== null && nivelActual !== null && encima === null ? (
                <button type="button" onClick={() => setElegido(null)} className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"><Undo2 className="h-3 w-3" /> Volver a hoy</button>
              ) : n === nivelActual && medidas.length > 0 ? (
                <button type="button" onClick={() => abrirPestanaRed(paginaId, 'salto')} className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline">
                  <TrendingUp className="h-3.5 w-3.5" /> Qué hace falta para llegar al {nivelActual! + 1}
                </button>
              ) : null}
            </div>
            <p className={cn('mt-1 text-sm leading-snug text-slate-700', !leerMas && 'line-clamp-2')} title={info?.descripcion || undefined}>
              {/* Sin niveles descritos (un objetivo), su descripción en vez del nombre genérico de la escala. */}
              {niveles.length ? <b className="font-black" style={{ color: tonosN.tinta }}>{info?.titulo || ESCALA[n]}</b> : x.pagina?.subtitulo ? <span>{x.pagina.subtitulo}</span> : null}
              {info?.descripcion && <>{' · '}{info.descripcion}</>}
            </p>
            {info?.descripcion && !leerMas && info.descripcion.length > 140 && (
              <button type="button" onClick={() => setLeerMas(true)} className="text-xs font-bold text-slate-500 underline hover:text-slate-800">Leer más</button>
            )}
            <div className="mt-3"><Escala niveles={niveles} actual={actual} elegido={fijo} onElegir={elegirNivel} onEncima={setEncima} /></div>
          </div>
        )}

        {/* La nota grande, solo sin la barra (el editor): con la barra va arriba, en el eslabón. */}
        {!ranuras.ruta && <div className="col-start-2 row-start-1 flex justify-end lg:col-start-3 lg:justify-center">{circulo}</div>}
      </section>
      {falloNota && <p role="alert" className="text-xs font-bold text-rose-600">{falloNota}</p>}

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
