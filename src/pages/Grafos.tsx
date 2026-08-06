import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, BackgroundVariant, Controls, Handle, Position, MarkerType,
  useNodesState, useEdgesState, useStore, BaseEdge, getStraightPath,
  type Node, type Edge, type NodeProps, type EdgeProps, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network, Eye, AppWindow, User as UserIcon, Plus, Flame, PlayCircle, Sparkles,
  X, ExternalLink, ZoomIn, Globe2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CreateGraphModal from '../components/knowledge/CreateGraphModal';
import WindowContent from '../components/knowledge/WindowContent';
import { cn } from '../utils/cn';
import { relStyle } from '../utils/relationStyle';

// ============================================================================
// GRAFOS — la PIZARRA INFINITA (2026-08-06, petición del usuario)
// ============================================================================
// No hay tarjetas ni páginas que se abran: hay UN solo lienzo infinito.
// Cada grafo es una ESFERA con su previsualización (portada, título, pulso).
// Al acercarte —con la rueda o haciendo clic en la esfera— las publicaciones
// de ese grafo se DESPLIEGAN a su alrededor, en el mismo lienzo; al alejarte,
// se colapsan de nuevo dentro de la esfera y vuelves a la visión general.
// Solo se cambia de página al entrar en una publicación concreta o al abrir
// el grafo completo para editarlo.

const SPHERE = 340;          // diámetro de la esfera de un grafo
const CENTER_SPHERE = 380;   // diámetro del núcleo
const ORBIT_X = 1050;        // semieje horizontal del anillo (elipse: la
const ORBIT_Y = 640;         // pantalla es más ancha que alta)
// La ESFERA que envuelve a todos los grafos (petición del usuario): una
// membrana elíptica —una esfera vista en perspectiva— con el núcleo dentro.
const SHELL_X = ORBIT_X + SPHERE / 2 + 130;
const SHELL_Y = ORBIT_Y + SPHERE / 2 + 165;
const REL_CIRCLE = 86;       // círculo de la categoría de conocimiento
const WIN_SCALE = 0.3;       // las posiciones del grafo original, encogidas
const REVEAL = 0.46;         // zoom a partir del cual emergen las publicaciones

/** Etiqueta compensada por zoom: se lee igual de lejos que de cerca
 *  (como los nombres de ciudad en un mapa). */
const labelScale = (zoom: number) => Math.min(3.4, Math.max(1, 0.85 / Math.max(zoom, 0.05)));

const KIND_TINT: Record<string, string> = {
  publicacion: '#059669', imagen: '#7c3aed', video: '#dc2626', wikipedia: '#475569',
  enlace: '#0284c7', mapa: '#0284c7', grafica: '#eab308', ficha: '#64748b',
  cronologia: '#7c3aed', autores: '#4f46e5', documento: '#e11d48', grafo: '#059669',
  producto: '#f59e0b', soluciones: '#16a34a', texto: '#64748b',
};

interface GraphRow {
  id: string; title: string; slug: string; description: string | null;
  status: string; is_ai_generated: boolean; views: number; creator_name: string | null;
  window_count: number; cover_image: string | null; cover_video_id: string | null;
  is_reto: boolean; windows?: any[]; edges?: any[];
}

function Handles() {
  const style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' as const };
  return (
    <>
      <Handle type="source" position={Position.Top} style={style} />
      <Handle type="target" position={Position.Top} style={style} />
    </>
  );
}

const useZoom = () => useStore(s => s.transform[2]);

// ----------------------------------------------------------------------------
// Núcleo de la pizarra.
// ----------------------------------------------------------------------------
function NucleoNode({ data }: NodeProps<any>) {
  const d = data as any;
  const zoom = useZoom();
  return (
    <div
      className="relative flex flex-col items-center justify-center text-center cursor-pointer select-none"
      style={{ width: CENTER_SPHERE, height: CENTER_SPHERE }}
      title="Ver toda la pizarra"
    >
      <Handles />
      <div className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 28%, ${d.accent}dd 0%, #0f172a 62%, #020617 100%)`,
          border: '3px solid rgba(255,255,255,0.85)',
          boxShadow: `0 0 70px ${d.accent}55, 0 25px 50px -12px rgb(0 0 0 / 0.35)`,
        }} />
      {/* el núcleo ya es grande: se compensa poco para no desbordarlo */}
      <div className="relative z-10 px-8" style={{ transform: `scale(${Math.min(1.5, labelScale(zoom))})` }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-white/70">{d.sublabel}</p>
        <p className="text-2xl font-black text-white uppercase leading-none tracking-tight mt-1.5">{d.label}</p>
        <p className={cn('text-[10px] text-white/60 mt-2.5 leading-snug transition-opacity duration-300', zoom >= REVEAL && 'opacity-0')}>
          acércate a una esfera —<br />el conocimiento se despliega
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Esfera de un grafo: previsualización redonda. Al acercarse, se abre.
// ----------------------------------------------------------------------------
function EsferaNode({ data }: NodeProps<any>) {
  const d = data as any;
  const g: GraphRow = d.graph;
  const zoom = useZoom();
  const open = d.forceOpen || zoom >= REVEAL;
  const ls = labelScale(zoom);
  const cover = g.cover_image || (g.cover_video_id ? `https://img.youtube.com/vi/${g.cover_video_id}/hqdefault.jpg` : null);
  const accent = g.is_reto ? '#dc2626' : '#059669';
  return (
    <div
      className="group relative flex flex-col items-center justify-center text-center cursor-pointer select-none transition-transform duration-300 ease-out hover:scale-105"
      style={{ width: SPHERE, height: SPHERE }}
      title={open ? 'Ver toda la pizarra' : `Acercarse a «${g.title}» — clic para hacer zoom`}
    >
      <Handles />
      {/* la esfera: portada recortada en círculo */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          border: `4px solid ${accent}`,
          boxShadow: `0 0 45px ${accent}44, 0 18px 30px -10px rgb(0 0 0 / 0.35)`,
          background: cover ? '#0f172a' : `radial-gradient(circle at 32% 28%, ${accent} 0%, #0f172a 70%)`,
        }}
      >
        {cover && (
          <>
            <img src={cover} alt="" loading="lazy"
              className="w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-110 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
          </>
        )}
        {!cover && !g.cover_video_id && <Network className="absolute inset-0 m-auto w-10 h-10 text-white/25" />}
        {!cover && g.cover_video_id && <PlayCircle className="absolute inset-0 m-auto w-10 h-10 text-white/40" />}
      </div>

      {/* dentro de la esfera solo la identidad visual: al alejarte, el
          título sería ilegible — vive fuera, con escala compensada. */}
      <div className="relative z-10">
        <span className={cn('inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full',
          g.is_reto ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white')}
          style={{ transform: `scale(${ls})` }}>
          {g.is_reto ? <><Flame className="w-3 h-3" /> Reto</> : <><Network className="w-3 h-3" /> Grafo</>}
        </span>
      </div>

      {/* etiqueta bajo la esfera: legible a cualquier distancia */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none"
        style={{ top: SPHERE + 14, width: SPHERE * 1.5, transform: `translateX(-50%) scale(${ls})`, transformOrigin: 'top center' }}
      >
        <p className="text-[15px] font-black text-slate-900 leading-tight line-clamp-2">{g.title}</p>
        <div className="flex items-center justify-center gap-2.5 mt-1 text-[10px] text-slate-400">
          <span className="inline-flex items-center gap-0.5"><AppWindow className="w-3 h-3" />{g.window_count}</span>
          <span className="inline-flex items-center gap-0.5"><Eye className="w-3 h-3" />{g.views}</span>
          {g.is_ai_generated && <Sparkles className="w-3 h-3 text-amber-500" />}
          {g.creator_name && <span className="truncate max-w-[130px]">{g.creator_name}</span>}
        </div>
        <span className={cn('inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-[0.2em] transition-opacity',
          open ? 'opacity-0' : 'text-emerald-600 opacity-0 group-hover:opacity-100')}>
          <ZoomIn className="w-3 h-3" /> desplegar
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Publicación desplegada: aparece al acercarse, se colapsa al alejarse.
// ----------------------------------------------------------------------------
function VentanaNode({ data }: NodeProps<any>) {
  const d = data as any;
  const w = d.win;
  const zoom = useZoom();
  // Enfocar un grafo lo despliega SIEMPRE: al abrirse, su constelación
  // ocupa mucho y el zoom de encuadre puede caer bajo el umbral.
  const open = d.forceOpen || zoom >= REVEAL;
  const tint = KIND_TINT[w.kind] || '#64748b';

  // SEMI-DESPLIEGUE (petición del usuario): colapsada, la publicación no
  // desaparece — se convierte en un satélite en miniatura pegado a su
  // esfera, para que se VEA que ahí hay información agregada. Con hover
  // sobre la esfera, los satélites se abren un poco más (invitan al clic).
  // d.dx/d.dy = desplazamiento del centro de la tarjeta respecto al centro
  // de su esfera; el satélite viaja a un anillo fijo alrededor de ella,
  // esquivando el arco inferior donde vive el título.
  const dist = Math.hypot(d.dx, d.dy) || 1;
  let ang = Math.atan2(d.dy, d.dx);
  const lo = Math.PI * 0.32, hi = Math.PI * 0.68; // arco del título, abajo
  if (ang > lo && ang < hi) ang = ang < Math.PI / 2 ? lo : hi;
  // Compensación por zoom: de lejos los satélites crecen un poco para
  // seguir viéndose (señal de que hay información agregada ahí).
  const comp = Math.min(2.4, Math.max(1, 0.42 / Math.max(zoom, 0.05)));
  const miniScale = (d.hoverPreview ? 0.34 : 0.16) * comp;
  const ringR = (d.hoverPreview ? 262 : 208) + (comp - 1) * 55;
  const tx = Math.cos(ang) * ringR - d.dx;
  const ty = Math.sin(ang) * ringR - d.dy;

  return (
    <div
      className="w-64 bg-white rounded-2xl overflow-hidden transition-all ease-out"
      style={{
        opacity: open ? 1 : d.hoverPreview ? 1 : 0.9,
        transform: open ? 'translate(0px, 0px) scale(1)' : `translate(${tx}px, ${ty}px) scale(${miniScale})`,
        transitionDuration: '450ms',
        pointerEvents: open ? 'auto' : 'none',
        border: `1.5px solid ${tint}55`,
        boxShadow: `0 0 24px ${tint}22, 0 10px 20px -8px rgb(0 0 0 / 0.18)`,
        cursor: 'pointer',
      }}
      title={w.title}
    >
      <Handles />
      <div className="px-3 pt-2.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tint }} />
        <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: tint }}>{w.kind}</span>
        {w.is_ai_generated && <Sparkles className="w-2.5 h-2.5 text-amber-500 ml-auto" />}
      </div>
      <div className="px-3 pt-1">
        <p className="text-[13px] font-black text-slate-900 leading-tight line-clamp-2">{w.title}</p>
      </div>
      <div className="px-3 py-2">
        <WindowContent kind={w.kind} config={w.config} variant="node" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// La ESFERA que lo envuelve todo: la membrana del conocimiento común.
// ----------------------------------------------------------------------------
function EnvolturaNode() {
  return (
    <div
      className="pointer-events-none rounded-[50%]"
      style={{
        width: SHELL_X * 2, height: SHELL_Y * 2,
        border: '2px solid rgba(16,185,129,0.35)',
        background: 'radial-gradient(ellipse at 42% 32%, rgba(255,255,255,0.9) 0%, rgba(236,253,245,0.55) 45%, rgba(219,234,254,0.35) 78%, rgba(224,231,255,0.15) 100%)',
        boxShadow: 'inset -30px -40px 90px rgba(15,23,42,0.06), inset 30px 40px 90px rgba(255,255,255,0.9), 0 0 70px rgba(16,185,129,0.12)',
      }}
    >
      <Handles />
      {/* brillo de esfera */}
      <div
        className="absolute rounded-[50%]"
        style={{
          left: '14%', top: '9%', width: '30%', height: '22%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.95) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Círculo de relación: la CATEGORÍA de conocimiento que une el grafo con
// cada publicación (contexto, causa, dato, fuente, apoya, contradice, matiza).
// ----------------------------------------------------------------------------
function RelacionNode({ data }: NodeProps<any>) {
  const d = data as any;
  const rel = relStyle(d.relation);
  const zoom = useZoom();
  const open = d.forceOpen || zoom >= REVEAL;
  return (
    <div
      className="rounded-full flex flex-col items-center justify-center text-center px-2 transition-all ease-out"
      style={{
        width: REL_CIRCLE, height: REL_CIRCLE,
        backgroundColor: rel.bg,
        border: '3px solid rgba(255,255,255,0.92)',
        boxShadow: `0 0 20px ${rel.color}55, 0 8px 14px -6px rgb(0 0 0 / 0.25)`,
        opacity: open ? 1 : 0,
        transform: open ? 'scale(1)' : 'scale(0.3)',
        transitionDuration: '450ms',
        pointerEvents: 'none',
      }}
      title={d.label || rel.label}
    >
      <Handles />
      <p className="text-[8px] font-black uppercase tracking-[0.16em] opacity-80" style={{ color: rel.text }}>
        {rel.label}
      </p>
      {d.label && (
        <p className="text-[9px] font-black uppercase leading-tight tracking-wide break-words w-full" style={{ color: rel.text }}>
          {d.label}
        </p>
      )}
    </div>
  );
}

/** Arista que aparece y desaparece con las publicaciones: cuando están
 *  colapsadas, la vista general queda limpia (solo esferas). Abierta,
 *  lleva un flujo animado de partículas (conexiones VIVAS). */
function FadeEdge({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data }: EdgeProps) {
  const zoom = useZoom();
  const open = (data as any)?.forceOpen || zoom >= REVEAL;
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const stroke = (style as any)?.stroke || '#64748b';
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={open ? markerEnd : undefined}
        interactionWidth={0}
        style={{ ...style, opacity: open ? (style as any)?.opacity ?? 1 : 0, transition: 'opacity 450ms ease-out' }}
      />
      {open && (
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={Math.max(1.5, Number((style as any)?.strokeWidth || 1.5))}
          strokeLinecap="round"
          style={{ strokeDasharray: '2 12', animation: 'esferaFlujo 1.6s linear infinite', opacity: 0.9, pointerEvents: 'none' }}
        />
      )}
    </>
  );
}

/** La ELECTRICIDAD del conocimiento: la línea del núcleo «Retos de España»
 *  a cada reto. Su GROSOR y la velocidad/densidad del flujo de partículas
 *  dependen de la intensidad y relevancia actual del reto (visitas y
 *  volumen de conocimiento) — se ve de un vistazo qué reto late más. */
function FlujoEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const d = data as any;
  const t = Math.max(0, Math.min(1, d?.t ?? 0.5)); // relevancia 0..1
  const color = d?.accent || '#059669';
  const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const width = 2 + t * 7;                    // más relevante = más gorda
  const dur = (2.6 - t * 2).toFixed(2);       // más relevante = más rápida
  const dash = t > 0.66 ? '3 10' : t > 0.33 ? '3 14' : '2 18'; // y más densa
  return (
    <>
      <BaseEdge id={id} path={path} interactionWidth={0} style={{ stroke: color, strokeWidth: width, opacity: 0.28, pointerEvents: 'none' }} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={Math.max(2, width * 0.6)}
        strokeLinecap="round"
        style={{ strokeDasharray: dash, animation: `esferaFlujo ${dur}s linear infinite`, opacity: 0.95, filter: `drop-shadow(0 0 ${2 + t * 4}px ${color})`, pointerEvents: 'none' }}
      />
    </>
  );
}

const edgeTypes = { fade: FadeEdge, flujo: FlujoEdge };

const nodeTypes = { nucleo: NucleoNode, esfera: EsferaNode, ventana: VentanaNode, envoltura: EnvolturaNode, relacion: RelacionNode };

export default function Grafos() {
  const [graphs, setGraphs] = useState<GraphRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [popup, setPopup] = useState<{ win: any; graph: GraphRow } | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  // Esfera bajo el ratón: sus satélites se abren en pequeño (invitación).
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const rf = useRef<ReactFlowInstance | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/graphs?with_windows=1', { credentials: 'include' })
      .then(r => r.json())
      .then(j => setGraphs(Array.isArray(j) ? j : []))
      .catch(() => setGraphs([]))
      .finally(() => setLoading(false));
  }, []);

  // El nombre del centro: «Retos de España» cuando la esfera es, sobre todo,
  // de retos (petición del usuario).
  const allRetos = graphs.length > 0 && graphs.filter(g => g.is_reto).length * 2 >= graphs.length;

  /** La visión general encuadra SOLO el núcleo y las esferas: las
   *  publicaciones están colapsadas y no deben estirar el encuadre. */
  const overviewNodes = useCallback(() => {
    const ids = (rf.current?.getNodes() || [])
      .filter(n => n.type === 'nucleo' || n.type === 'esfera' || n.type === 'envoltura')
      .map(n => ({ id: n.id }));
    return ids.length ? ids : undefined;
  }, []);

  /** El clic SOLO cambia el estado. El vuelo lo hace el efecto de abajo,
   *  una vez React Flow ha aplicado los nodos nuevos — si se animara aquí,
   *  la reconstrucción del lienzo (forceOpen, satélites) cancelaría el
   *  fitView a medio camino y el zoom no llegaba a ocurrir. */
  const focusGraph = useCallback((graphId: string) => {
    setFocused(prev => (prev === graphId ? null : graphId));
  }, []);

  const resetView = useCallback(() => setFocused(null), []);

  // El VUELO: depende SOLO del foco. No puede depender de `nodes`, porque
  // el propio cambio de foco los reconstruye y la limpieza del efecto
  // cancelaría el vuelo antes de empezar. Un respiro corto basta para que
  // React Flow haya aplicado ya las posiciones nuevas.
  const firstFit = useRef(false);
  useEffect(() => {
    if (!firstFit.current) return;   // el encuadre inicial lo hace su efecto
    const t = setTimeout(() => {
      const inst = rf.current;
      if (!inst) return;
      if (!focused) {
        inst.fitView({ nodes: overviewNodes(), duration: 800, padding: 0.26 });
        return;
      }
      const ids = inst.getNodes()
        .filter(n => n.id === `esf-${focused}` || String(n.id).startsWith(`w-${focused}-`))
        .map(n => ({ id: n.id }));
      if (ids.length) inst.fitView({ nodes: ids, duration: 900, padding: 0.16, maxZoom: 0.95 });
    }, 80);
    return () => clearTimeout(t);
  }, [focused, overviewNodes]);

  const openWindow = useCallback((win: any, graph: GraphRow) => setPopup({ win, graph }), []);

  // Construcción de la pizarra: núcleo + esferas + publicaciones de cada una.
  const built = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    const N = Math.max(graphs.length, 1);

    // Relevancia relativa de cada grafo (0..1): visitas + volumen de
    // conocimiento. Gobierna el grosor y el flujo de su línea de energía.
    const score = (g: GraphRow) => g.views + g.window_count * 8;
    const maxScore = Math.max(...graphs.map(score), 1);
    const relevance: Record<string, number> = Object.fromEntries(
      graphs.map(g => [g.id, score(g) / maxScore]));

    ns.push({
      id: '__envoltura__', type: 'envoltura',
      position: { x: -SHELL_X, y: -SHELL_Y },
      draggable: false, selectable: false, zIndex: -20,
      data: {},
    });

    ns.push({
      id: '__nucleo__', type: 'nucleo',
      position: { x: -CENTER_SPHERE / 2, y: -CENTER_SPHERE / 2 },
      draggable: false, selectable: false, zIndex: 30,
      data: {
        label: allRetos ? 'Retos de España' : 'Grafos',
        sublabel: 'Conocimiento de la Humanidad',
        accent: allRetos ? '#dc2626' : '#059669',
        onReset: resetView,
      },
    });

    graphs.forEach((g, i) => {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / N;
      const cx = Math.cos(ang) * ORBIT_X;
      const cy = Math.sin(ang) * ORBIT_Y;
      const accent = g.is_reto ? '#dc2626' : '#059669';

      ns.push({
        id: `esf-${g.id}`, type: 'esfera',
        position: { x: cx - SPHERE / 2, y: cy - SPHERE / 2 },
        draggable: false, selectable: false, zIndex: 20,
        data: { graph: g, onFocus: focusGraph, forceOpen: focused === g.id },
      });
      es.push({
        // Electricidad núcleo → reto: grosor y flujo según la relevancia.
        id: `e-${g.id}`, source: '__nucleo__', target: `esf-${g.id}`, type: 'flujo',
        data: { t: relevance[g.id] ?? 0.5, accent },
      });

      // Las publicaciones del grafo, con su disposición original encogida
      // y centrada en la esfera: la misma constelación, en miniatura.
      const wins = (g.windows || []).slice(0, 14);
      const n = wins.length;

      // Anti-solape: las tarjetas se repelen entre sí y ninguna puede
      // taparle la cara a su esfera (mismo imán que en el lienzo del grafo).
      const CW = 256, CH = 190, PAD = 26;
      const INNER = SPHERE / 2 + 130;
      const boxes = wins.map((w: any, j: number) => {
        const hasPos = Number.isFinite(w.x) && Number.isFinite(w.y) && (w.x !== 0 || w.y !== 0);
        const wa = -Math.PI / 2 + (2 * Math.PI * j) / Math.max(n, 1);
        return {
          x: (hasPos ? w.x * WIN_SCALE : Math.cos(wa) * 620) - CW / 2,
          y: (hasPos ? w.y * WIN_SCALE : Math.sin(wa) * 480) - CH / 2,
        };
      });
      for (let it = 0; it < 120; it++) {
        let moved = false;
        for (let a = 0; a < boxes.length; a++) {
          for (let b = a + 1; b < boxes.length; b++) {
            const A = boxes[a], B = boxes[b];
            const dx = A.x - B.x, dy = A.y - B.y;
            const ox = CW + PAD - Math.abs(dx), oy = CH + PAD - Math.abs(dy);
            if (ox > 0 && oy > 0) {
              moved = true;
              if (ox < oy) { const s = ((dx || (a - b)) >= 0 ? 1 : -1) * ox / 2; A.x += s; B.x -= s; }
              else { const s = ((dy || (a - b)) >= 0 ? 1 : -1) * oy / 2; A.y += s; B.y -= s; }
            }
          }
        }
        for (const A of boxes) {
          const nx = Math.max(A.x, Math.min(0, A.x + CW));
          const ny = Math.max(A.y, Math.min(0, A.y + CH));
          const dist = Math.hypot(nx, ny);
          if (dist < INNER) {
            moved = true;
            const ccx = A.x + CW / 2, ccy = A.y + CH / 2;
            const cd = Math.hypot(ccx, ccy) || 1;
            const push = INNER - dist + 10;
            A.x += (ccx / cd) * push;
            A.y += (ccy / cd) * push;
          }
        }
        if (!moved) break;
      }

      // La CATEGORÍA de conocimiento con la que el grafo sostiene cada
      // publicación (contexto, causa, dato…), tomada de las aristas del
      // centro del grafo original.
      const relByWindow: Record<string, any> = {};
      for (const e of (g.edges || [])) {
        if (!e.from_window_id && e.to_window_id) relByWindow[e.to_window_id] = e;
      }

      wins.forEach((w: any, j: number) => {
        ns.push({
          id: `w-${g.id}-${w.id}`, type: 'ventana',
          position: { x: cx + boxes[j].x, y: cy + boxes[j].y },
          draggable: false, selectable: false, zIndex: 10,
          data: {
            win: w, graph: g, onOpenWindow: openWindow, forceOpen: focused === g.id,
            hoverPreview: hoverId === g.id && focused !== g.id,
            dx: boxes[j].x + CW / 2, dy: boxes[j].y + CH / 2,
          },
        });

        const rel = relByWindow[w.id];
        if (rel) {
          // El círculo va a medio camino entre la esfera y la publicación:
          // se ve la cadena grafo → categoría → publicación.
          const mx = boxes[j].x + CW / 2, my = boxes[j].y + CH / 2;
          const dist = Math.hypot(mx, my) || 1;
          const t = Math.min(0.5, (SPHERE / 2 + 105) / dist);
          const rx = cx + mx * t - REL_CIRCLE / 2;
          const ry = cy + my * t - REL_CIRCLE / 2;
          const relId = `r-${g.id}-${w.id}`;
          const rs = relStyle(rel.relation);
          ns.push({
            id: relId, type: 'relacion',
            position: { x: rx, y: ry },
            draggable: false, selectable: false, zIndex: 15,
            data: { relation: rel.relation, label: rel.label, forceOpen: focused === g.id },
          });
          es.push({
            id: `er1-${g.id}-${w.id}`, source: `esf-${g.id}`, target: relId, type: 'fade',
            style: { stroke: rs.color, strokeWidth: 1.5, opacity: 0.5 },
            data: { forceOpen: focused === g.id },
          });
          es.push({
            id: `er2-${g.id}-${w.id}`, source: relId, target: `w-${g.id}-${w.id}`, type: 'fade',
            style: { stroke: rs.color, strokeWidth: 2, opacity: 0.75 },
            markerEnd: { type: MarkerType.ArrowClosed, color: rs.color, width: 12, height: 12 },
            data: { forceOpen: focused === g.id },
          });
        } else {
          es.push({
            id: `ew-${g.id}-${w.id}`, source: `esf-${g.id}`, target: `w-${g.id}-${w.id}`, type: 'fade',
            style: { stroke: accent, strokeWidth: 1, opacity: 0.22 },
            data: { forceOpen: focused === g.id },
          });
        }
      });
    });

    return { ns, es };
  }, [graphs, allRetos, focusGraph, resetView, openWindow, focused, hoverId]);

  useEffect(() => { setNodes(built.ns); setEdges(built.es); }, [built, setNodes, setEdges]);

  // Encuadre inicial: la visión general (todas las esferas colapsadas).
  const didFit = useRef(false);
  useEffect(() => {
    if (didFit.current || nodes.length < 2) return;
    let tries = 0;
    const t = setInterval(() => {
      if (++tries > 25) { clearInterval(t); return; }
      rf.current?.fitView({ nodes: overviewNodes(), padding: 0.26 })
        .then(ok => { if (ok) { didFit.current = true; firstFit.current = true; clearInterval(t); } });
    }, 120);
    return () => clearInterval(t);
  }, [nodes]);

  const openCreate = () => (user ? setShowCreate(true) : navigate('/login'));
  const focusedGraph = graphs.find(g => g.id === focused);

  return (
    <div className="relative w-full h-full bg-slate-50">
      <style>{`
        @keyframes esferaFlujo { to { stroke-dashoffset: -26; } }
        /* En la Esfera se hace clic en las ESFERAS y en las publicaciones,
           nunca en una línea. React Flow da a cada arista un trazo de clic
           ancho que, al converger muchas en cada esfera, se comía el clic
           y el zoom al reto no llegaba a ocurrir. */
        .react-flow__edge, .react-flow__edge-path, .react-flow__edge-interaction { pointer-events: none !important; }
      `}</style>
      {loading ? (
        <p className="text-sm text-slate-400 py-16 text-center">Cargando la pizarra…</p>
      ) : (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onInit={inst => { rf.current = inst; }}
          onNodeClick={(_, node) => {
            const d: any = node.data;
            if (node.type === 'esfera') focusGraph(d.graph.id);
            else if (node.type === 'nucleo') resetView();
            else if (node.type === 'ventana' && (d.forceOpen || (rf.current?.getZoom() ?? 0) >= REVEAL)) {
              openWindow(d.win, d.graph);
            }
          }}
          onNodeMouseEnter={(_, node) => { if (node.type === 'esfera') setHoverId((node.data as any).graph.id); }}
          onNodeMouseLeave={(_, node) => { if (node.type === 'esfera') setHoverId(null); }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesConnectable={false}
          elevateNodesOnSelect={false}
          minZoom={0.1}
          maxZoom={1.6}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#cbd5e1" />
          <Controls position="bottom-left" showInteractive={false} />
        </ReactFlow>
      )}

      {/* cabecera + crear */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-lg pl-3 pr-1.5 py-1.5 flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-900">
            <Globe2 className="w-4 h-4 text-emerald-600" /> Esfera de Conocimiento
          </span>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-black shadow hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Crear grafo
          </button>
        </div>
        {focusedGraph && (
          <div
            className="bg-white/95 backdrop-blur rounded-full shadow-lg pl-3 pr-1.5 py-1.5 flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300"
            style={{ border: `1.5px solid ${focusedGraph.is_reto ? '#dc2626' : '#059669'}` }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: focusedGraph.is_reto ? '#dc2626' : '#059669' }} />
            <span className="text-xs font-black text-slate-900 max-w-[220px] truncate">{focusedGraph.title}</span>
            <button onClick={() => navigate(`/grafos/${focusedGraph.slug}`)} title="Abrir el grafo completo"
              className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-slate-50 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button onClick={resetView} title="Alejarse — ver toda la pizarra"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-50 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {!loading && graphs.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-slate-400 italic bg-white/90 rounded-2xl px-6 py-4 border border-dashed border-slate-200">
            La pizarra está vacía. Crea el primer grafo o pídeselo a la IA abajo.
          </p>
        </div>
      )}

      <p className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 pointer-events-none">
        rueda para acercarte · clic en una esfera para desplegarla
      </p>

      {/* Publicación abierta: pop-up sobre la misma pizarra */}
      {popup && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setPopup(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-3 flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded"
                style={{ color: KIND_TINT[popup.win.kind] || '#64748b', backgroundColor: `${KIND_TINT[popup.win.kind] || '#64748b'}18` }}>
                {popup.win.kind}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => navigate(`/grafos/${popup.graph.slug}`)} title="Abrir el grafo completo"
                  className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button onClick={() => setPopup(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-5">
              <h2 className="text-xl font-black text-slate-900 leading-tight mb-1">{popup.win.title}</h2>
              <p className="text-[11px] text-slate-400 mb-4 inline-flex items-center gap-1">
                <UserIcon className="w-3 h-3" /> en «{popup.graph.title}»
              </p>
              <WindowContent kind={popup.win.kind} config={popup.win.config} variant="full" />
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateGraphModal onClose={() => setShowCreate(false)} onCreated={slug => navigate(`/grafos/${slug}`)} />
      )}
    </div>
  );
}
