import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType, ConnectionMode, BaseEdge, EdgeLabelRenderer,
  applyNodeChanges, getSmoothStepPath, getStraightPath, useInternalNode, useStore,
  type Node, type Edge, type NodeProps, type EdgeProps, type NodeChange, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RotateCcw, X } from 'lucide-react';
import { getNodeIntersection } from '../knowledge/aristaFlotante';
import DibujoFlujo from './flujoDibujos';
import {
  VITALES, SISTEMAS, CONEXIONES, idDe,
  type Sistema, type Conexion, type Detalle, type Indicador, type Semaforo,
} from './flujoDatos';
import { cn } from '../../utils/cn';

// ============================================================================
// LA VISTA «FLUJO» (2026-10-30, Eugenio)
// ============================================================================
// «Haz una nueva vista que se llame Flujo basada en la vista Sociedad, con los post-its. Dales una conexión unos con
// otros: la línea que conecta, por ejemplo, la ley con la empresa, al pincharla abre un detalle con todo lo que se
// regula. Créalo como el sistema operativo de la humanidad al alcance de país, con España: un nivel de detalle muy
// grande, con indicadores del país, los fallos del sistema y las mejoras propuestas de cada sistema. Tiene que ser el
// centro de control del país.»
//
// La misma pizarra de post-its de la vista Sociedad, pero aquí lo importante son las CONEXIONES: cada flecha lleva su
// nombre en una pastilla y, al pincharla (la pastilla o la propia línea), se abre un panel con todo lo que pasa por
// ella. Cada sistema, igual: su tarjeta resume y el panel cuenta cómo funciona, sus piezas clave, los indicadores de
// España con semáforo, los fallos del sistema y las mejoras propuestas. Arriba, las constantes vitales del país.
// TODO EL CONTENIDO vive en `flujoDatos.ts` (para cambiar textos o datos) y los dibujos en `flujoDibujos.tsx`.
// Las tarjetas se pueden arrastrar (la colocación se recuerda en el navegador de cada uno); las flechas son fijas,
// porque son el mapa.

const LETRA_TITULO = "'Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif";

/** LA CADENA EN CÍRCULO (2026-10-30, Eugenio: «una especie de cadena, ordenada en un círculo que se acaba cerrando»,
 *  como la de su hoja): los 8 eslabones del ciclo en la rueda, y alrededor los que alimentan o reciben — valores y
 *  educación arriba, la justicia a la derecha, la ecología y los recursos a la izquierda, y las 7 técnicas en abanico
 *  junto a su tarjeta madre. */
const ANCHO = 300, ANCHO_TECNICA = 240;
const INICIO: Record<string, { x: number; y: number }> = {
  objetivos: { x: -150, y: -1295 },
  politica: { x: 663, y: -958 },
  ley: { x: 1000, y: -145 },
  economia: { x: 663, y: 668 },
  empresa: { x: -150, y: 1005 },
  administracion: { x: -963, y: 668 },
  servicios: { x: -1300, y: -145 },
  tecnicas: { x: -963, y: -958 },
  valores: { x: 200, y: -1745 },
  educacion: { x: 1000, y: -1745 },
  justicia: { x: 1600, y: 205 },
  ecologia: { x: -1650, y: 415 },
  recursos: { x: -2450, y: -45 },
  salud: { x: -1172, y: -2033 },
  agua: { x: -1593, y: -1850 },
  alimentacion: { x: -1908, y: -1517 },
  vivienda: { x: -2069, y: -1088 },
  energia: { x: -2049, y: -630 },
  movilidad: { x: -1851, y: -216 },
  comunicacion: { x: -1508, y: 88 },
};
/** Las 7 técnicas principales, desglosadas de la tarjeta madre (2026-10-30: «desglosa las técnicas»). */
const TECNICAS = ['salud', 'agua', 'alimentacion', 'vivienda', 'energia', 'movilidad', 'comunicacion'];
const esTecnica = (id: string) => TECNICAS.includes(id);
const anchoDe = (id: string) => (esTecnica(id) ? ANCHO_TECNICA : ANCHO);

const GRIS = '#94a3b8', TINTA = '#334155';
/** El ciclo principal del país, numerado del 1 al 8: la rueda que se cierra. */
const CICLO = ['objetivos>politica', 'politica>ley', 'ley>economia', 'economia>empresa', 'empresa>administracion', 'administracion>servicios', 'servicios>tecnicas', 'tecnicas>objetivos'];
/** Dónde va la pastilla de cada flecha (0 = salida, 1 = llegada): las largas la llevan cerca de un extremo
 *  para no caer encima de otra tarjeta. */
const PASTILLA_EN: Record<string, number> = { 'recursos>politica': 0.85, 'ley>administracion': 0.42, 'empresa>tecnicas': 0.45, 'tecnicas>ecologia': 0.6 };
const COLOR_SEMAFORO: Record<Semaforo, string> = { bien: '#10b981', regular: '#f59e0b', mal: '#ef4444' };
/** EL ESPECTRO (2026-10-30, Eugenio): un color por sistema, de lo morado (abstracto, subjetivo) a lo rojo (vital).
 *  Las técnicas comparten el naranja de su familia. */
const ESPECTRO: Record<string, string> = {
  valores: '#7c3aed', educacion: '#9333ea', politica: '#4f46e5', ley: '#2563eb', justicia: '#0284c7',
  administracion: '#0891b2', servicios: '#0d9488', ecologia: '#16a34a', recursos: '#65a30d',
  economia: '#ca8a04', empresa: '#d97706', tecnicas: '#ea580c', objetivos: '#dc2626',
};
const colorDe = (id: string) => (esTecnica(id) ? '#f97316' : ESPECTRO[id] || TINTA);
/** El fondo blanco hueso de las tarjetas y el gris del tablero. */
const HUESO = '#fbf9f3', TABLERO = '#eceef0';

// Cada uno deja la pizarra a su gusto en su navegador; «Recolocar» la devuelve al mapa original.
const LLAVE = 'luz-flujo-v2';
function leer(): Record<string, { x: number; y: number }> | null {
  try { const j = JSON.parse(localStorage.getItem(LLAVE) || 'null'); return j && typeof j === 'object' ? j : null; } catch { return null; }
}
function guardar(pos: Record<string, { x: number; y: number }> | null) {
  try { if (pos) localStorage.setItem(LLAVE, JSON.stringify(pos)); else localStorage.removeItem(LLAVE); } catch { /* sin almacenamiento */ }
}

/** Lo que está abierto en el panel: un sistema (`s:ley`) o una conexión (`c:ley>empresa`). */
type Abierto = { tipo: 's'; s: Sistema } | { tipo: 'c'; c: Conexion } | null;
const Ctx = createContext<{ abrir: (clave: string) => void }>({ abrir: () => {} });

const POR_ID = Object.fromEntries(SISTEMAS.map(s => [s.id, s])) as Record<string, Sistema>;
/** Las parejas fallo→mejora de un detalle. */
const paresDe = (d: Detalle) => d.arreglos;
const CONEX = Object.fromEntries(CONEXIONES.map(c => [idDe(c), c])) as Record<string, Conexion>;

/** Las asas invisibles del centro: las flechas flotantes no las usan, pero React Flow necesita que existan. */
function AsasCentro() {
  const st = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' as const };
  return (<><Handle type="source" position={Position.Top} style={st} /><Handle type="target" position={Position.Top} style={st} /></>);
}

function Punto({ s }: { s: Semaforo }) {
  return <span aria-label={s} title={s} className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COLOR_SEMAFORO[s] }} />;
}

/** La barra de salud de un sistema: un segmento por semáforo, al ancho de cuántos indicadores tiene de cada color. */
function BarraSalud({ s }: { s: Sistema }) {
  const c = { bien: 0, regular: 0, mal: 0 };
  for (const i of s.detalle.indicadores) c[i.s]++;
  return (
    <span aria-hidden data-salud={`${c.bien}-${c.regular}-${c.mal}`} className="absolute inset-x-0 top-0 flex h-[5px]">
      {(['bien', 'regular', 'mal'] as const).map(k => c[k] > 0 && <span key={k} style={{ flexGrow: c[k], background: COLOR_SEMAFORO[k] }} />)}
    </span>
  );
}

/** EL POST-IT de un sistema: la franja de su estado, el dibujo, el resumen, dos datos gancho y cuántos fallos y
 *  mejoras esperan dentro. */
function PostIt({ data, selected }: NodeProps<Node<{ s: Sistema }>>) {
  const s = data.s;
  // De lejos (el mapa entero) el detalle sería ilegible: la tarjeta enseña solo el nombre y un dato, en grande.
  const zoom = useStore(st => st.transform[2]);
  const lejos = zoom < 0.45;
  return (
    <div data-postit={s.id} style={{ width: anchoDe(s.id), background: HUESO, borderTopColor: colorDe(s.id) }}
      className={cn('relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 border-t-[6px] text-slate-900 transition-shadow',
        esTecnica(s.id) ? 'px-4 pb-3 pt-3' : 'px-5 pb-3.5 pt-3.5',
        selected ? 'shadow-[0_18px_40px_-12px_rgba(15,23,42,0.4)] ring-2 ring-slate-900/60' : 'shadow-[0_12px_26px_-16px_rgba(15,23,42,0.45)] hover:shadow-[0_16px_32px_-14px_rgba(15,23,42,0.5)]')}>
      <AsasCentro />
      <BarraSalud s={s} />
      {lejos && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-2 text-center" data-lejos>
          <h3 className={cn('font-black uppercase leading-[0.95] tracking-wide', esTecnica(s.id) ? 'text-[34px]' : s.titulo.length > 11 ? 'text-[31px]' : 'text-[44px]')} style={{ fontFamily: LETRA_TITULO, color: colorDe(s.id) }}>{s.titulo}</h3>
          <p className="text-[26px] font-black leading-none text-slate-900">{s.destacados[0][0]}</p>
          <p className="max-w-full text-[15px] font-semibold leading-tight text-slate-600">{s.destacados[0][1]}</p>
        </div>
      )}
      <div className={cn('flex items-start justify-between gap-3', lejos && 'opacity-0')}>
        <div className="min-w-0">
          <h3 className={cn('font-black uppercase leading-none tracking-wide', esTecnica(s.id) ? 'text-[22px]' : 'text-[28px]')} style={{ fontFamily: LETRA_TITULO, color: colorDe(s.id) }}>{s.titulo}</h3>
          <p className={cn('mt-1.5 font-semibold leading-snug text-slate-700', esTecnica(s.id) ? 'text-[12px]' : 'text-[13.5px]')}>{s.resumen}</p>
        </div>
        <DibujoFlujo id={s.id} alto={esTecnica(s.id) ? 36 : 46} />
      </div>
      <div className={cn('mt-2.5 flex items-stretch gap-2 border-t border-slate-900/10 pt-2', lejos && 'opacity-0')}>
        {s.destacados.map(([v, e]) => (
          <p key={e} className="min-w-0 flex-1 leading-tight">
            <span className={cn('block font-black', esTecnica(s.id) ? 'text-[16px]' : 'text-[19px]')}>{v}</span>
            <span className="block text-[11px] font-semibold text-slate-600">{e}</span>
          </p>
        ))}
      </div>
      <p className={cn('mt-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-wide', lejos && 'opacity-0')}>
        <span className="rounded-full bg-red-600/10 px-2 py-0.5 text-red-700">{paresDe(s.detalle).length} fallos</span>
        <span aria-hidden className="text-slate-400">→</span>
        <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-emerald-700">{paresDe(s.detalle).length} mejoras</span>
        <span className="ml-auto font-bold normal-case tracking-normal text-slate-500">abrir →</span>
      </p>
    </div>
  );
}

/** LA FLECHA PINCHABLE: la línea recta entre los bordes de los dos sistemas, con su nombre en una pastilla.
 *  Pinchar la pastilla (o la línea) abre el detalle de la conexión. */
function FlechaFlujo({ id, source, target, style, markerEnd, data }: EdgeProps) {
  const { abrir } = useContext(Ctx);
  const zoom = useStore(st => st.transform[2]);
  const a = useInternalNode(source), b = useInternalNode(target);
  if (!a || !b) return null;
  const escala = Math.min(Math.max(1 / Math.max(zoom, 0.05), 1), 2.6);
  const lejos = zoom < 0.45;
  const s = getNodeIntersection(a, b), t = getNodeIntersection(b, a);
  const [d] = getStraightPath({ sourceX: s.x, sourceY: s.y, targetX: t.x, targetY: t.y });
  const f = PASTILLA_EN[id] ?? 0.5;
  const lx = s.x + (t.x - s.x) * f, ly = s.y + (t.y - s.y) * f;
  const num = CICLO.indexOf(id) + 1;
  return (
    <>
      <path d={d} fill="none" strokeWidth={22} stroke="transparent" className="react-flow__edge-interaction" style={{ cursor: 'pointer' }} />
      <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {(data as any)?.nombre && <button type="button" onClick={() => abrir(`c:${id}`)} data-flecha={id}
          style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)${num > 0 ? ` scale(${escala})` : ''}`, pointerEvents: lejos && num === 0 ? 'none' : 'all' }}
          className={cn('nodrag nopan cursor-pointer whitespace-nowrap rounded-full border bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide shadow-sm transition-colors hover:border-slate-900 hover:text-slate-900',
            num > 0 ? 'border-slate-700 text-slate-900' : 'border-slate-300 text-slate-500', lejos && num === 0 && 'opacity-0')}>
          {num > 0 && <span className="mr-1 inline-grid h-4 w-4 place-items-center rounded-full bg-slate-900 text-[10px] text-white">{num}</span>}
          {(data as any)?.nombre}
        </button>}
      </EdgeLabelRenderer>
    </>
  );
}

/** El arco por encima de la rueda: educación → técnicas (el talento viaja por fuera para no cruzar el círculo). */
function ArcoFlujo({ id, source, target, style, markerEnd, data }: EdgeProps) {
  const { abrir } = useContext(Ctx);
  const zoom = useStore(st => st.transform[2]);
  const a = useInternalNode(source), b = useInternalNode(target);
  if (!a || !b) return null;
  const lejos = zoom < 0.45;
  const sx = a.internals.positionAbsolute.x + (a.measured.width ?? 0) / 2, sy = a.internals.positionAbsolute.y;
  const tx = b.internals.positionAbsolute.x + (b.measured.width ?? 0) / 2, ty = b.internals.positionAbsolute.y;
  const [d, lx, ly] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition: Position.Top, targetX: tx, targetY: ty, targetPosition: Position.Top, offset: 130, borderRadius: 40 });
  return (
    <>
      <path d={d} fill="none" strokeWidth={22} stroke="transparent" className="react-flow__edge-interaction" style={{ cursor: 'pointer' }} />
      <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <button type="button" onClick={() => abrir(`c:${id}`)} data-flecha={id}
          style={{ position: 'absolute', transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, pointerEvents: 'all' }}
          className={cn('nodrag nopan cursor-pointer whitespace-nowrap rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500 shadow-sm transition-colors hover:border-slate-900 hover:text-slate-900', lejos && 'opacity-0')}>
          {(data as any)?.nombre}
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

const nodeTypes = { postit: PostIt };
const edgeTypes = { flujo: FlechaFlujo, arco: ArcoFlujo };

const nodosIniciales = (pos?: Record<string, { x: number; y: number }> | null): Node[] => SISTEMAS.map(s => ({
  id: s.id, type: 'postit', position: pos?.[s.id] || INICIO[s.id] || { x: 0, y: 0 }, data: { s }, deletable: false,
}));
const flechas = (): Edge[] => [
  ...CONEXIONES.filter(c => POR_ID[c.de] && POR_ID[c.a]).map(c => {
    const id = idDe(c), principal = CICLO.includes(id), color = principal ? TINTA : GRIS;
    return {
      id, source: c.de, target: c.a, data: { nombre: c.nombre },
      type: id === 'educacion>tecnicas' ? 'arco' : 'flujo', deletable: false, selectable: false,
      style: { stroke: color, strokeWidth: principal ? 2.8 : 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    } as Edge;
  }),
  // Los radios finos de la tarjeta madre a sus 7 técnicas: sin pastilla y sin detalle propio.
  ...TECNICAS.filter(t => POR_ID[t]).map(t => ({
    id: `radio-${t}`, source: 'tecnicas', target: t, type: 'flujo', data: {},
    deletable: false, selectable: false, style: { stroke: '#cbd5e1', strokeWidth: 1.3 },
  } as Edge)),
];

// ----------------------------------------------------------------------------
// EL PANEL DE DETALLE: lo que se abre al pinchar un sistema o una flecha.
// ----------------------------------------------------------------------------
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="mb-2 text-[15px] font-black uppercase tracking-[0.08em] text-slate-900" style={{ fontFamily: LETRA_TITULO }}>{titulo}</h4>
      {children}
    </section>
  );
}

/** Una pieza clave «Nombre — explicación»: el nombre en negrita. */
function Pieza({ texto }: { texto: string }) {
  const i = texto.indexOf(' — ');
  if (i < 0) return <span>{texto}</span>;
  return <span><b className="font-black">{texto.slice(0, i)}</b> — {texto.slice(i + 3)}</span>;
}

function FilaIndicador({ i }: { i: Indicador }) {
  return (
    <li className="flex items-baseline gap-2.5 border-b border-slate-100 py-1.5 text-[14px] leading-snug last:border-0">
      <span className="translate-y-[1px]"><Punto s={i.s} /></span>
      <span className="min-w-0 flex-1 text-slate-700">{i.n}{i.nota && <span className="block text-[12px] text-slate-500">{i.nota}</span>}</span>
      <span className="text-right font-black text-slate-900">{i.v}{(i.ano || i.f) && <span className="ml-1.5 whitespace-nowrap font-semibold text-slate-400 text-[12px]">{i.ano}{i.f ? ` · ${i.f}` : ''}</span>}</span>
    </li>
  );
}

function CuerpoDetalle({ d, claves }: { d: Detalle; claves: string }) {
  return (
    <>
      <Seccion titulo="Cómo funciona">
        <div className="space-y-2 text-[14.5px] leading-relaxed text-slate-800">{d.como.map(p => <p key={p.slice(0, 24)}>{p}</p>)}</div>
      </Seccion>
      <Seccion titulo={claves}>
        <ul className="space-y-1.5 text-[14px] leading-snug text-slate-800">
          {d.claves.map(c => <li key={c.slice(0, 24)} className="flex gap-2"><span aria-hidden className="text-slate-400">·</span><Pieza texto={c} /></li>)}
        </ul>
      </Seccion>
      <Seccion titulo="Indicadores · España">
        <ul data-indicadores>{d.indicadores.map(i => <FilaIndicador key={i.n} i={i} />)}</ul>
        <p className="mt-1.5 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1"><Punto s="bien" /> bien</span>
          <span className="flex items-center gap-1"><Punto s="regular" /> regular</span>
          <span className="flex items-center gap-1"><Punto s="mal" /> mal</span>
          <span className="ml-auto">comparado con la UE</span>
        </p>
      </Seccion>
      <Seccion titulo="Fallos del sistema → mejoras propuestas">
        <ul className="space-y-3" data-arreglos>
          {paresDe(d).map(([f, m]) => (
            <li key={f.slice(0, 24)}>
              <p className="rounded-r-lg border-l-[3px] border-red-500/70 bg-red-50/60 py-1.5 pl-3 pr-2 text-[14px] leading-snug text-slate-800">{f}</p>
              {(
                <p className="ml-4 mt-1 flex gap-2 rounded-r-lg border-l-[3px] border-emerald-500/70 bg-emerald-50/60 py-1.5 pl-2.5 pr-2 text-[14px] leading-snug text-slate-800">
                  <span aria-hidden className="font-black text-emerald-600">↳</span>{m}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Seccion>
    </>
  );
}

function PanelDetalle({ abierto, cerrar }: { abierto: NonNullable<Abierto>; cerrar: () => void }) {
  const { abrir } = useContext(Ctx);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [cerrar]);
  const es = abierto.tipo === 's';
  const titulo = es ? abierto.s.titulo : abierto.c.nombre;
  return (
    <aside role="dialog" aria-label={titulo} data-panel-detalle
      className="soc-panel absolute inset-y-0 right-0 z-20 flex w-full flex-col overflow-hidden bg-white shadow-[-12px_0_40px_-18px_rgba(15,23,42,0.4)] sm:w-[480px] sm:border-l sm:border-slate-200">
      <header className={cn('shrink-0 border-t-[6px] px-5 pb-4 pt-3.5', es ? '' : 'bg-slate-900 text-white')}
        style={es ? { borderTopColor: colorDe(abierto.s.id), background: `${colorDe(abierto.s.id)}14` } : { borderTopColor: '#0f172a' }}>
        <div className="flex items-start justify-between gap-3">
          {es ? (
            <div className="flex items-center gap-3">
              <DibujoFlujo id={abierto.s.id} alto={52} />
              <div>
                <h3 className="text-[30px] font-black uppercase leading-none tracking-wide" style={{ fontFamily: LETRA_TITULO, color: colorDe(abierto.s.id) }}>{abierto.s.titulo}</h3>
                {abierto.s.quien && <p className="mt-1 text-[12.5px] font-semibold text-slate-600">{abierto.s.quien}</p>}
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-black uppercase tracking-wide text-slate-300">
                <button type="button" onClick={() => abrir(`s:${abierto.c.de}`)} className="rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/30">{POR_ID[abierto.c.de]?.titulo}</button>
                <span aria-hidden>→</span>
                <button type="button" onClick={() => abrir(`s:${abierto.c.a}`)} className="rounded-full bg-white/15 px-2 py-0.5 hover:bg-white/30">{POR_ID[abierto.c.a]?.titulo}</button>
              </p>
              <h3 className="mt-1.5 text-[26px] font-black uppercase leading-none tracking-wide" style={{ fontFamily: LETRA_TITULO }}>{abierto.c.nombre}</h3>
            </div>
          )}
          <button type="button" onClick={cerrar} aria-label="Cerrar el detalle" data-cerrar-detalle
            className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-full', es ? 'text-slate-700 hover:bg-slate-900/10' : 'text-white hover:bg-white/15')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className={cn('mt-2 text-[14px] font-semibold leading-snug', es ? 'text-slate-700' : 'text-slate-200')}>{es ? abierto.s.resumen : abierto.c.resumen}</p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-1">
        {/* Las conexiones del sistema, para seguir navegando el mapa desde el panel. */}
        {es && (
          <p className="mt-3 flex flex-wrap gap-1.5" data-conexiones-sistema>
            {CONEXIONES.filter(c => c.de === abierto.s.id || c.a === abierto.s.id).map(c => (
              <button key={idDe(c)} type="button" onClick={() => abrir(`c:${idDe(c)}`)}
                className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-600 hover:border-slate-900 hover:text-slate-900">
                {c.de === abierto.s.id ? `${c.nombre} → ${POR_ID[c.a]?.titulo}` : `← ${c.nombre} · ${POR_ID[c.de]?.titulo}`}
              </button>
            ))}
          </p>
        )}
        <CuerpoDetalle d={es ? abierto.s.detalle : abierto.c.detalle} claves={es ? 'Las piezas clave' : 'Qué pasa por esta conexión'} />
      </div>
    </aside>
  );
}

// ----------------------------------------------------------------------------
// LA COLUMNA DEL MÓVIL: los sistemas en el orden del ciclo, con sus conexiones como pastillas.
// ----------------------------------------------------------------------------
const ORDEN_MOVIL = ['objetivos', 'valores', 'educacion', 'politica', 'ley', 'justicia', 'economia', 'empresa', 'administracion', 'servicios', 'tecnicas', ...TECNICAS, 'ecologia', 'recursos'];
function ColumnaMovil() {
  const { abrir } = useContext(Ctx);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3" data-columna-flujo>
      {ORDEN_MOVIL.filter(id => POR_ID[id]).map(id => {
        const s = POR_ID[id];
        const salientes = CONEXIONES.filter(c => c.de === id && POR_ID[c.a]);
        return (
          <div key={id} className="mb-4">
            <button type="button" onClick={() => abrir(`s:${id}`)} data-postit={id} style={{ background: HUESO, borderTopColor: colorDe(id) }}
              className={cn('relative block w-full overflow-hidden rounded-2xl border border-slate-200 border-t-[6px] px-4 pb-3 pt-3 text-left text-slate-900 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.45)]', esTecnica(id) && 'ml-4 w-[calc(100%-16px)]')}>
              <BarraSalud s={s} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[24px] font-black uppercase leading-none tracking-wide" style={{ fontFamily: LETRA_TITULO, color: colorDe(id) }}>{s.titulo}</h3>
                  <p className="mt-1 text-[13px] font-semibold leading-snug text-slate-700">{s.resumen}</p>
                </div>
                <DibujoFlujo id={id} alto={40} />
              </div>
              <div className="mt-2 flex gap-3 border-t border-slate-900/15 pt-2">
                {s.destacados.map(([v, e]) => <p key={e} className="leading-tight"><span className="block text-[17px] font-black">{v}</span><span className="block text-[11px] font-semibold text-slate-600">{e}</span></p>)}
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] font-black uppercase tracking-wide">
                <span className="rounded-full bg-red-600/10 px-2 py-0.5 text-red-700">{paresDe(s.detalle).length} fallos</span>
                <span aria-hidden className="text-slate-400">→</span>
                <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-emerald-700">{paresDe(s.detalle).length} mejoras</span>
                <span className="ml-auto font-bold normal-case tracking-normal text-slate-500">abrir →</span>
              </p>
            </button>
            {salientes.length > 0 && (
              <p className="mt-1.5 flex flex-wrap gap-1.5 px-1">
                {salientes.map(c => {
                  const num = CICLO.indexOf(idDe(c)) + 1;
                  return (
                    <button key={idDe(c)} type="button" onClick={() => abrir(`c:${idDe(c)}`)}
                      className={cn('rounded-full border bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide', num > 0 ? 'border-slate-700 text-slate-900' : 'border-slate-400 text-slate-600')}>
                      {num > 0 && <span className="mr-1 inline-grid h-4 w-4 place-items-center rounded-full bg-slate-900 text-[10px] text-white">{num}</span>}
                      {c.nombre} → {POR_ID[c.a].titulo}
                    </button>
                  );
                })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function useMovil() {
  const consulta = '(max-width: 767px)';
  const [movil, setMovil] = useState(() => typeof window !== 'undefined' && window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const f = () => setMovil(m.matches);
    m.addEventListener('change', f); return () => m.removeEventListener('change', f);
  }, []);
  return movil;
}

export default function VistaFlujoSitio() {
  const movil = useMovil();
  const [nodos, setNodos] = useState<Node[]>(() => nodosIniciales(leer()));
  const [tocada, setTocada] = useState(() => !!leer());
  // Lo abierto va en la dirección (`?detalle=ley` o `?detalle=ley>empresa`), para poder compartirlo.
  const [abierto, setAbierto] = useState<Abierto>(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('detalle');
      if (v && CONEX[v]) return { tipo: 'c', c: CONEX[v] };
      if (v && POR_ID[v]) return { tipo: 's', s: POR_ID[v] };
    } catch { /* sin dirección */ }
    return null;
  });
  const apuntar = (v: string | null) => {
    try {
      const u = new URL(window.location.href);
      if (v) u.searchParams.set('detalle', v); else u.searchParams.delete('detalle');
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
    } catch { /* sin dirección que tocar */ }
  };
  const abrir = useCallback((clave: string) => {
    const [tipo, id] = [clave.slice(0, 1), clave.slice(2)];
    if (tipo === 's' && POR_ID[id]) { setAbierto({ tipo: 's', s: POR_ID[id] }); apuntar(id); }
    if (tipo === 'c' && CONEX[id]) { setAbierto({ tipo: 'c', c: CONEX[id] }); apuntar(id); }
  }, []);
  const cerrar = useCallback(() => { setAbierto(null); apuntar(null); }, []);
  const ctx = useMemo(() => ({ abrir }), [abrir]);

  const onNodesChange = useCallback((ch: NodeChange[]) => {
    setNodos(ns => applyNodeChanges(ch, ns));
    if (ch.some(c => c.type === 'position' && c.dragging === false)) setTocada(true);
  }, []);
  useEffect(() => {
    if (!tocada) return;
    guardar(Object.fromEntries(nodos.map(n => [n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) }])));
  }, [nodos, tocada]);
  const recolocar = () => { guardar(null); setNodos(nodosIniciales()); setTocada(false); };

  // Dónde acaba la barra: la vista llena lo que queda de ventana (como el mapa y la sociedad).
  const [barra, setBarra] = useState(80);
  useEffect(() => {
    const el = document.querySelector<HTMLElement>('[data-cabecera-sitio]');
    if (!el) return;
    window.scrollTo(0, 0);
    const medir = () => setBarra(Math.round(el.getBoundingClientRect().bottom));
    medir();
    const ro = new ResizeObserver(medir); ro.observe(el);
    document.documentElement.classList.add('vista-pizarra');
    return () => { ro.disconnect(); document.documentElement.classList.remove('vista-pizarra'); };
  }, []);

  // Al abrir se encuadra el corazón del mapa (objetivos → economía); la rueda baja hacia la empresa y las técnicas.
  const encuadrar = useCallback((rf: ReactFlowInstance) => {
    rf.fitBounds({ x: -2470, y: -2060, width: 4390, height: 3560 }, { padding: 0.01 });
  }, []);

  return (
    <Ctx.Provider value={ctx}>
      <div data-vista-flujo className="relative flex flex-col" style={{ background: TABLERO }}
        ref={el => { if (el) { el.style.width = '100vw'; el.style.marginLeft = 'calc(50% - 50vw)'; el.style.marginTop = '-16px'; el.style.marginBottom = '-64px'; el.style.height = `calc(100dvh - ${barra}px)`; } }}>
        <style>{`html.vista-pizarra, html.vista-pizarra body { overflow: hidden; } html.vista-pizarra footer { display: none; }
          [data-vista-flujo] .react-flow__edgelabel-renderer { z-index: 1001; }
          @keyframes soc-panel { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }
          .soc-panel { animation: soc-panel .22s ease-out; }`}</style>
        {/* LAS CONSTANTES VITALES DEL PAÍS, como la banda de arriba de un centro de control. */}
        <header data-constantes className="relative z-10 shrink-0 border-b border-slate-200 bg-white/95">
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent md:hidden" />
          <div className="flex items-center gap-4 overflow-x-auto px-4 py-2 sm:px-5">
          <div className="shrink-0 leading-none">
            <p className="text-[22px] font-black uppercase tracking-wide" style={{ fontFamily: LETRA_TITULO }}>España</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">el sistema operativo del país</p>
          </div>
          <ul className="flex items-center gap-4">
            {VITALES.map(v => (
              <li key={v.n} className="shrink-0 leading-tight" title={v.nota ? `${v.nota} (${v.ano})` : String(v.ano || '')}>
                <p className="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-black text-slate-900"><Punto s={v.s} /> {v.v}</p>
                <p className="whitespace-nowrap text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{v.n}</p>
              </li>
            ))}
          </ul>
          <div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">
            <p className="hidden items-center gap-2 text-[11px] font-semibold text-slate-500 lg:flex" data-leyenda>
              <span className="flex items-center gap-1"><Punto s="bien" /> bien</span>
              <span className="flex items-center gap-1"><Punto s="regular" /> regular</span>
              <span className="flex items-center gap-1"><Punto s="mal" /> mal</span>
              <span>· vs UE</span>
            </p>
            <p className="max-w-52 text-right text-[11px] font-semibold leading-tight text-slate-500">Pincha un sistema o una flecha para abrir su detalle. Arrastra para recolocar.</p>
            <button type="button" onClick={recolocar} data-recolocar title="Recolocar el mapa como al principio"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-bold text-slate-700 hover:bg-slate-50">
              <RotateCcw className="h-3.5 w-3.5" /> Recolocar
            </button>
          </div>
          </div>
        </header>
        <div className="relative flex min-h-0 flex-1">
          {movil ? <ColumnaMovil /> : (
            <div className="relative min-h-0 flex-1" data-pizarra-flujo>
              <ReactFlow nodes={nodos} edges={flechas()} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
                onNodesChange={onNodesChange} onInit={encuadrar}
                onNodeClick={(_, n) => abrir(`s:${n.id}`)} onEdgeClick={(_, e) => { if (CONEX[e.id]) abrir(`c:${e.id}`); }}
                connectionMode={ConnectionMode.Loose} nodesConnectable={false} minZoom={0.15} maxZoom={1.6}
                translateExtent={[[-3100, -2700], [2700, 2100]]}
                panOnScroll zoomOnScroll={false} zoomOnPinch zoomOnDoubleClick={false}
                proOptions={{ hideAttribution: true }} elevateNodesOnSelect>
                <Background color="#d4d7dd" gap={28} size={1.4} />
                <MiniMap position="bottom-left" pannable nodeColor="#fde047" maskColor="rgba(246,241,231,0.75)" bgColor="#ffffff" style={{ width: 132, height: 92 }} className="opacity-70 transition-opacity hover:opacity-100" />
                <Controls showInteractive={false} position="bottom-right" fitViewOptions={{ padding: 0.04 }} />
              </ReactFlow>
            </div>
          )}
          {abierto && <PanelDetalle abierto={abierto} cerrar={cerrar} />}
        </div>
      </div>
    </Ctx.Provider>
  );
}
