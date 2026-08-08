import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType,
  useNodesState, useEdgesState, useInternalNode, getStraightPath,
  BaseEdge, EdgeLabelRenderer,
  type Node, type Edge, type NodeProps, type EdgeProps, type InternalNode,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft, X, Eye, MessageCircle, Sparkles, User as UserIcon, Network,
  Image as ImageIcon, PlayCircle, BookOpen, Link2, Map as MapIcon, MapPin,
  PieChart as PieChartIcon, Info, CalendarClock, Users as UsersIcon,
  FileText, MessageSquare, Plus, GitBranch, Pencil, ShoppingBag, Lightbulb, ChevronDown, Flame,
  CheckSquare, Table2, Rocket,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { RELATION_STYLE, RELATIONS } from '../utils/relationStyle';
import { useHelpers } from '../contexts/DataContext';
import { resolveEntityLink } from '../utils/entityLinks';
import WindowContent from '../components/knowledge/WindowContent';
import RatingWidget from '../components/knowledge/RatingWidget';
import EntityComments from '../components/knowledge/EntityComments';
import AddWindowPanel from '../components/knowledge/AddWindowPanel';

// ============================================================================
// Lienzo de un Grafo de Conocimiento (Fase 11, rediseño 11c-11e)
// ============================================================================
// Diseño pedido por el usuario (2026-08-05):
//  - Centro = FUSIÓN de dos grandes nodos (territorio × concepto), técnica,
//    con la atribución al creador sutil debajo.
//  - Las relaciones del centro son CÍRCULOS grandes, equidistantes y en
//    ángulos iguales. Son PROTAGONISTAS: clic en el círculo o en la flecha
//    abre el panel con los atributos de esa unión (descripción, autor,
//    valoración, comentarios) — las conexiones unen conceptos y son
//    conocimiento de primera clase.
//  - Flechas RECTAS y gruesas directas al borde de cada ventana (aristas
//    flotantes por intersección, sin engancharse a un punto fijo).
//  - Herramientas de creación para el dueño del grafo: añadir ventanas
//    (incl. sus publicaciones y referencias a otros grafos) y conectarlas.

const KIND_META: Record<string, { label: string; icon: any; chip: string }> = {
  publicacion: { label: 'Publicación', icon: MessageSquare,  chip: 'bg-emerald-50 text-emerald-700' },
  imagen:      { label: 'Imagen',      icon: ImageIcon,      chip: 'bg-violet-50 text-violet-700' },
  video:       { label: 'Vídeo',       icon: PlayCircle,     chip: 'bg-red-50 text-red-600' },
  wikipedia:   { label: 'Wikipedia',   icon: BookOpen,       chip: 'bg-slate-100 text-slate-600' },
  enlace:      { label: 'Enlace',      icon: Link2,          chip: 'bg-sky-50 text-sky-700' },
  mapa:        { label: 'Mapa',        icon: MapIcon,        chip: 'bg-emerald-50 text-emerald-700' },
  grafica:     { label: 'Datos',       icon: PieChartIcon,   chip: 'bg-amber-50 text-amber-700' },
  ficha:       { label: 'Ficha',       icon: Info,           chip: 'bg-slate-100 text-slate-600' },
  cronologia:  { label: 'Cronología',  icon: CalendarClock,  chip: 'bg-violet-50 text-violet-700' },
  autores:     { label: 'Autores',     icon: UsersIcon,      chip: 'bg-indigo-50 text-indigo-700' },
  documento:   { label: 'Documento',   icon: FileText,       chip: 'bg-rose-50 text-rose-700' },
  grafo:       { label: 'Grafo',       icon: Network,        chip: 'bg-emerald-50 text-emerald-700' },
  producto:    { label: 'Producto',    icon: ShoppingBag,     chip: 'bg-amber-50 text-amber-700' },
  soluciones:  { label: 'Soluciones',  icon: Lightbulb,       chip: 'bg-emerald-50 text-emerald-700' },
  texto:       { label: 'Texto',       icon: FileText,       chip: 'bg-slate-100 text-slate-600' },
  tarea:       { label: 'Tarea',       icon: CheckSquare,    chip: 'bg-emerald-50 text-emerald-700' },
  tabla:       { label: 'Tabla',       icon: Table2,         chip: 'bg-sky-50 text-sky-700' },
  proyecto:    { label: 'Proyecto',    icon: Rocket,         chip: 'bg-indigo-50 text-indigo-700' },
};


// Geometría del anillo de relaciones: círculos grandes y cerca del centro
// (petición del usuario, 2026-08-06).
const RING_RADIUS = 300;
const CIRCLE_SIZE = 144;
const CENTER_W = 300;
const CENTER_H = 190;

/** Ventanas de la rama de una conexión del centro: la ventana destino y todo
 *  lo conectado a ella (BFS sin dirección, máx. 2 saltos para no arrastrar
 *  medio grafo cuando las ramas se tocan entre sí). */
function branchWindowIds(edges: any[], centerEdgeId: number): Set<string> {
  const e = edges.find((x: any) => x.id === centerEdgeId && !x.from_window_id);
  const seen = new Set<string>();
  if (!e) return seen;
  const adj: Record<string, string[]> = {};
  for (const x of edges) {
    if (!x.from_window_id) continue;
    (adj[x.from_window_id] ||= []).push(x.to_window_id);
    (adj[x.to_window_id] ||= []).push(x.from_window_id);
  }
  seen.add(e.to_window_id);
  let frontier = [e.to_window_id];
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = [];
    for (const cur of frontier) for (const n of adj[cur] || []) {
      if (!seen.has(n)) { seen.add(n); next.push(n); }
    }
    frontier = next;
  }
  return seen;
}

// ----------------------------------------------------------------------------
// Arista flotante: línea RECTA entre los bordes reales de los dos nodos.
// ----------------------------------------------------------------------------
function getNodeIntersection(intersectionNode: InternalNode, targetNode: InternalNode) {
  const w = (intersectionNode.measured.width ?? 0) / 2;
  const h = (intersectionNode.measured.height ?? 0) / 2;
  const x2 = intersectionNode.internals.positionAbsolute.x + w;
  const y2 = intersectionNode.internals.positionAbsolute.y + h;
  const x1 = targetNode.internals.positionAbsolute.x + (targetNode.measured.width ?? 0) / 2;
  const y1 = targetNode.internals.positionAbsolute.y + (targetNode.measured.height ?? 0) / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1);
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return { x: w * (xx3 + yy3) + x2, y: h * (-xx3 + yy3) + y2 };
}

function FloatingEdge({ id, source, target, style, markerEnd, data }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  const s = getNodeIntersection(sourceNode, targetNode);
  const t = getNodeIntersection(targetNode, sourceNode);
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX: s.x, sourceY: s.y, targetX: t.x, targetY: t.y,
  });

  return (
    <>
      {/* Trazo invisible ancho debajo: hace la flecha fácil de clicar. */}
      <path d={edgePath} fill="none" strokeWidth={18} stroke="transparent" className="react-flow__edge-interaction" />
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {(data as any)?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: (style as any)?.stroke,
            }}
            className="nodrag nopan bg-white/90 border border-current rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
          >
            {(data as any).label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/** Handles invisibles centrados (las aristas flotantes no usan su posición,
 *  pero React Flow exige que existan). */
function CenterHandles() {
  const style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' as const };
  return (
    <>
      <Handle type="source" position={Position.Top} style={style} />
      <Handle type="target" position={Position.Top} style={style} />
    </>
  );
}

// ----------------------------------------------------------------------------
// Nodo central: la FUSIÓN de dos grandes nodos (territorio × concepto).
// ----------------------------------------------------------------------------
function CenterNode({ data }: NodeProps<any>) {
  const g = (data as any).graph;
  // Grafo de RETO: anclado a un challenge — identidad visual roja y la
  // palabra «Reto» presente en el propio centro (petición del usuario).
  const isReto = !!(data as any).isReto;
  const left = g.center?.left;
  const right = g.center?.right;
  const cat = g.center?.category;
  const vari = g.center?.variable;

  const retoChip = isReto ? (
    <span className="mb-1.5 inline-flex items-center gap-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-[0.22em] px-2.5 py-0.5 rounded-full shadow-lg">
      <Flame className="w-2.5 h-2.5" /> Reto
    </span>
  ) : null;

  // Jerarquía: una gran CATEGORÍA con su variable (p. ej. territorio) como
  // etiqueta subordinada debajo — para títulos largos que no caben en la
  // fusión de dos círculos iguales.
  if (cat?.label) {
    const accent = isReto ? '#ef4444' : (cat.color || '#10b981');
    return (
      <div className="flex flex-col items-center" style={{ width: CENTER_W }}>
        <CenterHandles />
        <div
          className="w-[215px] h-[215px] rounded-full bg-slate-900 shadow-2xl flex flex-col items-center justify-center text-center px-5"
          style={{ border: `4px solid ${accent}`, boxShadow: `0 0 60px ${accent}33, 0 25px 50px -12px rgb(0 0 0 / 0.4)` }}
        >
          {retoChip}
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: accent }}>
            {cat.sublabel || 'Categoría'}
          </p>
          <p className={cn('font-black text-white uppercase leading-none tracking-tight break-words w-full',
            String(cat.label).length > 11 ? 'text-xl' : 'text-3xl')}>
            {cat.label}
          </p>
        </div>
        {vari?.label && (
          <div className="-mt-4 z-10 inline-flex items-center gap-1.5 bg-slate-900 border-2 border-emerald-500 rounded-full px-3.5 py-1.5 shadow-xl">
            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400">{vari.sublabel || 'Territorio'}</span>
            <span className="text-xs font-black text-white">{vari.label}</span>
          </div>
        )}
        {g.creator_name && (
          <p className="mt-2 text-[10px] text-slate-400">
            grafo de <span className="font-semibold text-slate-500">{g.creator_name}</span>
          </p>
        )}
      </div>
    );
  }

  if (left?.label && right?.label) {
    return (
      <div className="flex flex-col items-center" style={{ width: CENTER_W }}>
        <CenterHandles />
        {retoChip && <div className="mb-1 z-20">{retoChip}</div>}
        <div className="flex items-center">
          <div className="w-[150px] h-[150px] rounded-full bg-slate-900 border-4 border-emerald-500 shadow-2xl flex flex-col items-center justify-center text-center px-4 z-10">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-1">{left.sublabel || 'Entidad'}</p>
            <p className="text-xl font-black text-white leading-tight">{left.label}</p>
          </div>
          <div className="w-[150px] h-[150px] rounded-full bg-slate-900 border-4 border-red-500 shadow-2xl flex flex-col items-center justify-center text-center px-4 -ml-9">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400 mb-1">{right.sublabel || 'Concepto'}</p>
            <p className="text-xl font-black text-white leading-tight">{right.label}</p>
          </div>
        </div>
        {g.creator_name && (
          <p className="mt-2.5 text-[10px] text-slate-400">
            fusión de <span className="font-semibold text-slate-500">{g.creator_name}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-full bg-slate-900 text-white shadow-2xl px-8 py-7 max-w-[260px] text-center border-4 border-emerald-500/60">
      <CenterHandles />
      <Network className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
      <p className="text-base font-black leading-tight">{g.title}</p>
      {g.creator_name && <p className="text-[10px] text-slate-300 mt-1.5">Grafo de {g.creator_name}</p>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Círculo de relación: protagonista clicable — abre los atributos de la unión.
// ----------------------------------------------------------------------------
function RelacionNode({ data }: NodeProps<any>) {
  const d = data as any;
  const rel = RELATION_STYLE[d.relation] || RELATION_STYLE.contexto;
  return (
    <div
      onClick={() => (d.active ? d.onOpenEdge?.(d.edgeId) : d.onFocus?.(d.edgeId))}
      className={cn(
        'group rounded-full flex flex-col items-center justify-center text-center px-3 cursor-pointer',
        'transition-all duration-200 ease-out hover:scale-110 active:scale-95',
      )}
      style={{
        width: CIRCLE_SIZE, height: CIRCLE_SIZE,
        backgroundColor: rel.bg,
        border: '4px solid rgba(255,255,255,0.9)',
        boxShadow: d.active
          ? `0 0 0 8px ${rel.color}40, 0 0 45px ${rel.color}80, 0 20px 25px -5px rgb(0 0 0 / 0.3)`
          : `0 0 25px ${rel.color}40, 0 10px 15px -3px rgb(0 0 0 / 0.2)`,
      }}
      title={d.active ? 'Ver los atributos de esta conexión' : 'Hacer zoom a esta rama'}
    >
      <CenterHandles />
      {d.label ? (
        <>
          <p className="text-[8px] font-bold uppercase tracking-[0.2em] mb-0.5 opacity-75" style={{ color: rel.text }}>
            {rel.label}
          </p>
          <p className="text-[11px] font-black uppercase leading-tight tracking-wide break-words w-full" style={{ color: rel.text }}>
            {d.label}
          </p>
        </>
      ) : (
        <p className="text-xs font-black uppercase leading-tight tracking-wide" style={{ color: rel.text }}>
          {rel.label}
        </p>
      )}
      <span className="text-[7px] font-bold uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-70 transition-opacity" style={{ color: rel.text }}>
        {d.active ? 'ver conexión' : 'explorar rama'}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Nodo ventana (miniatura).
// ----------------------------------------------------------------------------
/** Tipos de ventana donde manda lo VISUAL: tarjeta más grande, con la
 *  imagen/gráfica/mapa como protagonista (petición del usuario, 2026-08-06). */
const MEDIA_KINDS = new Set(['imagen', 'video', 'mapa', 'grafica']);

function VentanaNode({ data }: NodeProps<any>) {
  const { win, onOpen, onConnectFrom } = data as any;
  const meta = KIND_META[win.kind] || KIND_META.texto;
  const Icon = meta.icon;
  const isMedia = MEDIA_KINDS.has(win.kind);
  return (
    <div
      onClick={() => onOpen(win.id)}
      className={cn(
        'group relative bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer overflow-hidden',
        isMedia ? 'w-[420px]' : 'w-80',
      )}
    >
      <CenterHandles />
      {/* Crecer desde aquí: nace un elemento nuevo YA conectado a este. */}
      {onConnectFrom && (
        <button
          onClick={e => { e.stopPropagation(); onConnectFrom(win); }}
          title={`Crear algo nuevo conectado a «${win.title}»`}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}
      <div className="px-3.5 pt-3 flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded', meta.chip)}>
          <Icon className="w-2.5 h-2.5" /> {meta.label}
        </span>
        {win.is_ai_generated && (
          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded" title="Contenido generado por IA, pendiente de revisión">
            <Sparkles className="w-2 h-2" /> IA
          </span>
        )}
      </div>
      <div className="px-3.5 pt-1.5">
        <p className="text-[15px] font-black text-slate-900 leading-tight line-clamp-2">{win.title}</p>
      </div>
      <div className="px-3.5 py-2">
        <WindowContent kind={win.kind} config={win.config} variant="node" />
      </div>
      <div className="px-3.5 py-1.5 border-t border-slate-50 flex items-center gap-2.5 text-[9px] text-slate-400">
        <span className="inline-flex items-center gap-0.5 truncate max-w-[80px]"><UserIcon className="w-2.5 h-2.5 shrink-0" />{win.creator_name || '—'}</span>
        <RatingWidget entityType="knowledge_windows" entityId={win.id}
          avg={win.rating?.avg ?? null} count={win.rating?.count ?? 0} myScore={null} compact />
        <span className="inline-flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{win.views}</span>
        <span className="inline-flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{win.comment_count}</span>
      </div>
    </div>
  );
}

/** Línea del SUELO para grafos en forma de árbol (center.ground): separa las
 *  ramas visibles (hechos, arriba) de las raíces (intereses, abajo). */
function SueloNode({ data }: NodeProps<any>) {
  const g = (data as any).ground || {};
  return (
    <div className="pointer-events-none" style={{ width: 5200 }}>
      <CenterHandles />
      <div className="border-t-2 border-dashed" style={{ borderColor: '#a1620788' }} />
      <p className="absolute -top-7 left-10 text-[11px] font-black uppercase tracking-[0.3em] text-sky-700/80">
        ☀ {g.above || 'Lo visible'}
      </p>
      <p className="absolute top-3 left-10 text-[11px] font-black uppercase tracking-[0.3em] text-amber-700/80">
        ⌄ {g.below || 'Las raíces'}
      </p>
    </div>
  );
}

const nodeTypes = { centro: CenterNode, relacion: RelacionNode, ventana: VentanaNode, suelo: SueloNode };
const edgeTypes = { flotante: FloatingEdge };

// ----------------------------------------------------------------------------
// Modal para conectar dos ventanas existentes.
// ----------------------------------------------------------------------------
function ConnectModal({ windows, graphId, onClose, onDone }: {
  windows: any[]; graphId: string; onClose: () => void; onDone: () => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [relation, setRelation] = useState('contexto');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!to || saving) return;
    if (from && from === to) { setError('Una ventana no puede conectarse consigo misma.'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/graphs/${graphId}/edges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          from_window_id: from || null, to_window_id: to,
          relation, label: label.trim() || null, description: description.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo crear la conexión.');
      onDone();
      onClose();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const input = 'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-300';
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-3" onClick={e => e.stopPropagation()}>
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-600" /> Conectar conocimiento
        </h2>
        <select value={from} onChange={e => setFrom(e.target.value)} className={input}>
          <option value="">Desde: el centro del grafo</option>
          {windows.map(w => <option key={w.id} value={w.id}>Desde: {w.title}</option>)}
        </select>
        <select value={to} onChange={e => setTo(e.target.value)} className={input}>
          <option value="">Hasta: elige una ventana…</option>
          {windows.filter(w => w.id !== from).map(w => <option key={w.id} value={w.id}>Hasta: {w.title}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select value={relation} onChange={e => setRelation(e.target.value)} className={input}>
            {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Etiqueta (opcional)" className={input} />
        </div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          placeholder="¿Qué significa esta unión? (visible al hacer clic en ella)" className={cn(input, 'resize-none')} />
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600">Cancelar</button>
          <button onClick={submit} disabled={saving || !to}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold disabled:opacity-40">
            {saving ? 'Conectando…' : 'Conectar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** API que el lienzo ofrece a una barra de herramientas externa
 *  (Mi Conocimiento monta la suya estilo Miro sobre este mismo lienzo). */
export interface LienzoApi {
  graphId: string;
  windows: any[];
  reload: () => void;
  openAdd: (kind?: string) => void;
  openConnect: () => void;
}

export function GrafoLienzo({ slug, toolbar }: {
  slug: string;
  /** Sustituye los botones Ventana/Conectar por una barra propia. */
  toolbar?: (api: LienzoApi) => React.ReactNode;
}) {
  const helpers = useHelpers();
  // Instancia real de React Flow (via onInit): controla el viewport (fitView).
  const rf = useRef<ReactFlowInstance | null>(null);
  const fitView = useCallback((opts?: any) => { rf.current?.fitView(opts); }, []);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [editingEdge, setEditingEdge] = useState(false);
  const [edgeForm, setEdgeForm] = useState({ relation: 'contexto', label: '', description: '' });
  const [showAdd, setShowAdd] = useState<boolean | string>(false);
  // Ventana de la que nace la siguiente (el «+» de un nodo). null = del centro.
  const [connectFrom, setConnectFrom] = useState<{ id: string; title: string; pos?: { x: number; y: number } } | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  // Cabecera del grafo: colapsada por defecto (solo título) para no tapar
  // el lienzo; se expande con un clic para ver descripción/etiquetas.
  const [infoOpen, setInfoOpen] = useState(false);
  // Rama activa: círculo de relación clicado — el lienzo hace zoom a su rama
  // y el resto se atenúa para no perder el hilo de dónde estás.
  const [activeBranch, setActiveBranch] = useState<{ edgeId: number; relation: string; label: string } | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const load = useCallback(() => {
    fetch(`/api/graphs/${slug}`, { credentials: 'include' })
      .then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'No se pudo cargar el grafo.');
        return json;
      })
      .then(json => { setData(json); setError(null); })
      .catch(e => setError(e.message));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // ==========================================================================
  // TRAER COSAS AL LIENZO: PEGAR y ARRASTRAR (2026-08-07, petición del usuario)
  // ==========================================================================
  // Ctrl/Cmd+V pega; arrastrar un archivo desde el escritorio lo suelta EN EL
  // PUNTO donde lo sueltas. En ambos casos se crea la ventana que toque:
  // una imagen se sube y se ve; un PDF u hoja de cálculo se sube y queda como
  // enlace descargable; un .txt o .md se lee y se convierte en nota; un enlace
  // de YouTube en vídeo; cualquier otra URL en enlace; y el texto suelto en
  // una nota. Todo queda conectado al centro, como cualquier creación.
  const [pegando, setPegando] = useState<string | null>(null);
  const [soltando, setSoltando] = useState(false);
  const arrastres = useRef(0);   // dragenter/dragleave se disparan por cada hijo

  const crearVentana = useCallback(async (
    win: { title: string; kind: string; config: any },
    pos?: { x: number; y: number },
  ) => {
    if (!data?.graph?.id) return;
    const ang = Math.random() * 2 * Math.PI;
    const res = await fetch(`/api/graphs/${data.graph.id}/windows`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({
        ...win,
        x: Math.round(pos ? pos.x : Math.cos(ang) * 640 - 128),
        y: Math.round(pos ? pos.y : Math.sin(ang) * 500 - 110),
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'No se pudo crear la ventana.');
    await fetch(`/api/graphs/${data.graph.id}/edges`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ from_window_id: null, to_window_id: json.id, relation: 'contexto', label: null }),
    }).catch(() => {});
  }, [data?.graph?.id]);

  /** Sube el archivo y lo convierte en la ventana que corresponda. */
  const traerArchivo = useCallback(async (f: File, pos?: { x: number; y: number }) => {
    const esTexto = f.type.startsWith('text/plain') || /\.(md|txt)$/i.test(f.name);
    if (esTexto) {
      // Un .txt o .md no hace falta subirlo: su contenido ES la nota.
      const cuerpo = (await f.text()).trim();
      if (!cuerpo) return;
      await crearVentana({
        title: f.name.replace(/\.(md|txt)$/i, '').slice(0, 60) || 'Nota',
        kind: 'texto', config: { body: cuerpo },
      }, pos);
      return;
    }
    const up = await fetch(`/api/uploads?type=${encodeURIComponent(f.type)}`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: f,
    });
    const j = await up.json();
    if (!up.ok) throw new Error(j.error || 'No se pudo subir el archivo.');
    if (j.esImagen && f.type !== 'image/svg+xml') {
      await crearVentana({
        title: f.name.replace(/\.[^.]+$/, '').slice(0, 60) || 'Imagen',
        kind: 'imagen', config: { image_url: j.url, caption: null },
      }, pos);
    } else {
      const kb = Math.max(1, Math.round(j.bytes / 1024));
      await crearVentana({
        title: f.name.slice(0, 60),
        kind: 'enlace',
        config: { url: j.url, description: `Archivo subido · ${kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB'}` },
      }, pos);
    }
  }, [crearVentana]);

  /** Convierte texto suelto (o una URL) en la ventana que corresponda. */
  const traerTexto = useCallback(async (texto: string, pos?: { x: number; y: number }) => {
    const yt = texto.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
    if (yt && /^https?:\/\//i.test(texto)) {
      await crearVentana({ title: 'Vídeo', kind: 'video', config: { youtube_id: yt[1] } }, pos);
    } else if (/^https?:\/\/\S+$/i.test(texto)) {
      await crearVentana({ title: texto.replace(/^https?:\/\//, '').slice(0, 60), kind: 'enlace', config: { url: texto } }, pos);
    } else {
      await crearVentana({ title: texto.split('\n')[0].slice(0, 60) || 'Nota', kind: 'texto', config: { body: texto } }, pos);
    }
  }, [crearVentana]);

  /** El camino común de pegar y soltar. */
  const traer = useCallback(async (dt: DataTransfer, pos?: { x: number; y: number }) => {
    const archivos = Array.from(dt.files || []);
    if (archivos.length) {
      setPegando(archivos.length > 1 ? `Subiendo ${archivos.length} archivos…` : 'Subiendo…');
      try {
        // En cascada, para que varios archivos no caigan uno encima de otro.
        for (let i = 0; i < archivos.length; i++) {
          await traerArchivo(archivos[i], pos ? { x: pos.x + i * 48, y: pos.y + i * 48 } : undefined);
        }
        setPegando(null);
      } catch (e: any) { setPegando(e.message); setTimeout(() => setPegando(null), 5000); }
      load();
      return true;
    }
    const texto = (dt.getData('text/plain') || '').trim();
    if (!texto) return false;
    setPegando('Creando…');
    try { await traerTexto(texto, pos); setPegando(null); }
    catch (e: any) { setPegando(e.message); setTimeout(() => setPegando(null), 5000); }
    load();
    return true;
  }, [traerArchivo, traerTexto, load]);

  useEffect(() => {
    if (!data?.can_edit) return;
    const onPaste = async (e: ClipboardEvent) => {
      // Nunca robar el pegado de un campo de texto (el chat, los formularios).
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (!e.clipboardData) return;
      if (await traer(e.clipboardData)) e.preventDefault();
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [data?.can_edit, traer]);

  /** Soltar sobre el lienzo: la ventana nace justo donde la sueltas. */
  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    arrastres.current = 0;
    setSoltando(false);
    if (!data?.can_edit || !e.dataTransfer) return;
    const p = rf.current?.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    await traer(e.dataTransfer, p ? { x: p.x - 160, y: p.y - 90 } : undefined);
  }, [data?.can_edit, traer]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!data?.can_edit || !Array.from(e.dataTransfer?.types || []).includes('Files')) return;
    arrastres.current++;
    setSoltando(true);
  }, [data?.can_edit]);

  const onDragLeave = useCallback(() => {
    arrastres.current = Math.max(0, arrastres.current - 1);
    if (arrastres.current === 0) setSoltando(false);
  }, []);

  const openWindow = useCallback((winId: string) => {
    setData((d: any) => {
      const win = d?.windows?.find((w: any) => w.id === winId);
      if (win) {
        setSelected(win);
        setSelectedEdge(null);
        fetch(`/api/windows/${winId}/view`, { method: 'POST' }).catch(() => {});
      }
      return d;
    });
  }, []);

  /** Clic en un círculo de relación: zoom animado a esa rama (círculo +
   *  sus publicaciones), manteniendo el círculo en pantalla como ancla. */
  const focusBranch = useCallback((edgeId: number) => {
    setData((d: any) => {
      const e = d?.edges?.find((x: any) => x.id === edgeId && !x.from_window_id);
      if (!e) return d;
      const rel = RELATION_STYLE[e.relation] || RELATION_STYLE.contexto;
      setActiveBranch({ edgeId, relation: e.relation, label: e.label || rel.label });
      const ids = [`rel-${edgeId}`, ...branchWindowIds(d.edges, edgeId)];
      requestAnimationFrame(() => {
        fitView({ nodes: ids.map(id => ({ id })), duration: 800, padding: 0.18, maxZoom: 1.1 });
      });
      return d;
    });
  }, [fitView]);

  /** Salir de la rama: vuelve a la vista completa del grafo. */
  const clearBranch = useCallback(() => {
    setActiveBranch(null);
    fitView({ duration: 800, padding: 0.12 });
  }, [fitView]);

  /** Abre el panel de atributos de una conexión (desde el círculo o la flecha). */
  const openEdge = useCallback((edgeId: number) => {
    setData((d: any) => {
      const e = d?.edges?.find((x: any) => x.id === edgeId);
      if (e) {
        setSelectedEdge(e);
        setSelected(null);
        setEditingEdge(false);
        setEdgeForm({ relation: e.relation, label: e.label || '', description: e.description || '' });
      }
      return d;
    });
  }, []);

  // Construcción del lienzo.
  useEffect(() => {
    if (!data) return;
    const winById: Record<string, any> = Object.fromEntries(data.windows.map((w: any) => [w.id, w]));

    const centerNode: Node = {
      id: '__center__', type: 'centro',
      position: { x: -CENTER_W / 2, y: -CENTER_H / 2 },
      // Centro y círculos SIEMPRE por encima de las ventanas (las tarjetas
      // nunca deben tapar los protagonistas del grafo).
      zIndex: 20,
      draggable: false, selectable: false,
      data: {
        graph: data.graph,
        isReto: (data.entity_links || []).some((l: any) => l.entity_type === 'challenges'),
      },
    };

    const branchIds = activeBranch ? branchWindowIds(data.edges, activeBranch.edgeId) : null;

    // ------------------------------------------------------------------
    // Anti-solape «imán» (petición del usuario, 2026-08-06): las ventanas
    // se repelen entre sí hasta no compartir espacio, y ninguna puede
    // invadir la zona del anillo de círculos. Relajación iterativa de
    // rectángulos con tamaños estimados por tipo (las de medios son
    // más grandes). Solo afecta a la presentación — no se persiste.
    // ------------------------------------------------------------------
    const estSize = (w: any) => MEDIA_KINDS.has(w.kind)
      ? { w: 420, h: 400 }
      : { w: 320, h: 220 };
    const PAD = 28;
    const INNER_R = RING_RADIUS + CIRCLE_SIZE / 2 + 32;
    const boxes = data.windows.map((w: any) => ({ id: w.id, x: w.x, y: w.y, ...estSize(w) }));
    for (let it = 0; it < 150; it++) {
      let moved = false;
      for (let a = 0; a < boxes.length; a++) {
        for (let b = a + 1; b < boxes.length; b++) {
          const A = boxes[a], B = boxes[b];
          const dx = (A.x + A.w / 2) - (B.x + B.w / 2);
          const dy = (A.y + A.h / 2) - (B.y + B.h / 2);
          const ox = (A.w + B.w) / 2 + PAD - Math.abs(dx);
          const oy = (A.h + B.h) / 2 + PAD - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            moved = true;
            if (ox < oy) { const s = ((dx || (a - b)) >= 0 ? 1 : -1) * ox / 2; A.x += s; B.x -= s; }
            else { const s = ((dy || (a - b)) >= 0 ? 1 : -1) * oy / 2; A.y += s; B.y -= s; }
          }
        }
      }
      for (const A of boxes) {
        // Punto del rectángulo más cercano al origen: si entra en la zona
        // del anillo, la tarjeta entera se empuja radialmente hacia fuera.
        const nx = Math.max(A.x, Math.min(0, A.x + A.w));
        const ny = Math.max(A.y, Math.min(0, A.y + A.h));
        const d = Math.hypot(nx, ny);
        if (d < INNER_R) {
          moved = true;
          const cx = A.x + A.w / 2, cy = A.y + A.h / 2;
          const cd = Math.hypot(cx, cy) || 1;
          const push = INNER_R - d + 8;
          A.x += (cx / cd) * push;
          A.y += (cy / cd) * push;
        }
      }
      if (!moved) break;
    }
    const posById: Record<string, { x: number; y: number; w: number; h: number }> =
      Object.fromEntries(boxes.map((b: any) => [b.id, b]));

    const winNodes: Node[] = data.windows.map((w: any) => ({
      id: w.id, type: 'ventana',
      position: { x: posById[w.id]?.x ?? w.x, y: posById[w.id]?.y ?? w.y },
      draggable: !!data.can_edit,
      data: {
        win: w, onOpen: openWindow,
        onConnectFrom: data.can_edit
          ? (v: any) => setConnectFrom({ id: v.id, title: v.title, pos: posById[v.id] || { x: v.x, y: v.y } })
          : undefined,
      },
      // Con una rama activa, lo que no pertenece a ella se atenúa para
      // que sepas visualmente en qué tema estás sin perder el contexto.
      style: branchIds && !branchIds.has(w.id) ? { opacity: 0.25, transition: 'opacity 0.4s' } : { transition: 'opacity 0.4s' },
    }));

    const centerEdges = (data.edges as any[]).filter(e => !e.from_window_id && winById[e.to_window_id]);
    const restEdges = (data.edges as any[]).filter(e => e.from_window_id);

    const angleOfTarget = (e: any) => {
      const b = posById[e.to_window_id];
      const w = winById[e.to_window_id];
      return b ? Math.atan2(b.y + b.h / 2, b.x + b.w / 2) : Math.atan2(w.y + 110, w.x + 160);
    };
    const sortedCenter = [...centerEdges].sort((a, b) => angleOfTarget(a) - angleOfTarget(b));
    const N = Math.max(sortedCenter.length, 1);
    const startAngle = sortedCenter.length ? angleOfTarget(sortedCenter[0]) : 0;

    const relNodes: Node[] = sortedCenter.map((e, i) => {
      const ang = startAngle + (2 * Math.PI * i) / N;
      return {
        id: `rel-${e.id}`, type: 'relacion',
        position: {
          x: Math.cos(ang) * RING_RADIUS - CIRCLE_SIZE / 2,
          y: Math.sin(ang) * RING_RADIUS - CIRCLE_SIZE / 2,
        },
        zIndex: 10,
        draggable: false, selectable: false,
        data: {
          relation: e.relation, label: e.label, edgeId: e.id,
          onOpenEdge: openEdge, onFocus: focusBranch,
          active: activeBranch?.edgeId === e.id,
        },
        style: activeBranch && activeBranch.edgeId !== e.id ? { opacity: 0.3, transition: 'opacity 0.4s' } : { transition: 'opacity 0.4s' },
      };
    });

    const flowEdges: Edge[] = [];
    for (const e of sortedCenter) {
      const rel = RELATION_STYLE[e.relation] || RELATION_STYLE.contexto;
      const dim = activeBranch && activeBranch.edgeId !== e.id;
      flowEdges.push({
        id: `ec-${e.id}`, source: '__center__', target: `rel-${e.id}`, type: 'flotante',
        style: { stroke: rel.color, strokeWidth: 1.75, opacity: dim ? 0.15 : 0.75 },
      });
      flowEdges.push({
        id: `e-${e.id}`, source: `rel-${e.id}`, target: e.to_window_id, type: 'flotante',
        style: { stroke: rel.color, strokeWidth: 4, opacity: dim ? 0.15 : 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: rel.color, width: 16, height: 16 },
      });
    }
    for (const e of restEdges) {
      const rel = RELATION_STYLE[e.relation] || RELATION_STYLE.contexto;
      const dim = branchIds && !(branchIds.has(e.from_window_id) && branchIds.has(e.to_window_id));
      flowEdges.push({
        id: `e-${e.id}`, source: e.from_window_id, target: e.to_window_id, type: 'flotante',
        style: { stroke: rel.color, strokeWidth: 3, opacity: dim ? 0.15 : 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: rel.color, width: 15, height: 15 },
        animated: e.relation === 'contradice',
        data: { label: e.label || rel.label },
      });
    }

    const extraNodes: Node[] = [];
    if (data.graph.center?.ground) {
      extraNodes.push({
        id: '__suelo__', type: 'suelo',
        position: { x: -2600, y: -1 },
        draggable: false, selectable: false, zIndex: 1,
        data: { ground: data.graph.center.ground },
      });
    }

    setNodes([centerNode, ...extraNodes, ...relNodes, ...winNodes]);
    setEdges(flowEdges);
  }, [data, openWindow, openEdge, focusBranch, activeBranch, setNodes, setEdges]);

  // Encuadre inicial: con ReactFlowProvider externo, la prop fitView no se
  // aplica a nodos que llegan tras el montaje — se lanza a mano una vez.
  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current || nodes.length === 0) return;
    didFitRef.current = true;
    const t = setTimeout(() => fitView({ padding: 0.12 }), 80);
    return () => clearTimeout(t);
  }, [nodes, fitView]);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    if (!data?.can_edit || node.type !== 'ventana') return;
    setData((d: any) => ({
      ...d,
      windows: d.windows.map((w: any) => w.id === node.id ? { ...w, x: node.position.x, y: node.position.y } : w),
    }));
    fetch(`/api/graphs/${data.graph.id}/layout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ positions: [{ window_id: node.id, x: node.position.x, y: node.position.y }] }),
    }).catch(() => {});
  }, [data]);

  const patchWindow = (winId: string, patch: any) => {
    setData((d: any) => ({
      ...d,
      windows: d.windows.map((w: any) => w.id === winId ? { ...w, ...patch } : w),
    }));
    setSelected((s: any) => (s && s.id === winId ? { ...s, ...patch } : s));
  };

  const patchEdge = (edgeId: number, patch: any) => {
    setData((d: any) => ({
      ...d,
      edges: d.edges.map((e: any) => e.id === edgeId ? { ...e, ...patch } : e),
    }));
    setSelectedEdge((s: any) => (s && s.id === edgeId ? { ...s, ...patch } : s));
  };

  const saveEdge = async () => {
    if (!selectedEdge) return;
    const res = await fetch(`/api/graphs/${data.graph.id}/edges/${selectedEdge.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        relation: edgeForm.relation,
        label: edgeForm.label.trim() || null,
        description: edgeForm.description.trim() || null,
      }),
    });
    if (res.ok) {
      patchEdge(selectedEdge.id, { relation: edgeForm.relation, label: edgeForm.label.trim() || null, description: edgeForm.description.trim() || null });
      setEditingEdge(false);
    }
  };

  /** Clic en cualquier flecha: abre los atributos de su conexión. */
  const onEdgeClick = useCallback((_: any, edge: Edge) => {
    const m = String(edge.id).match(/^ec?-(\d+)$/);
    if (m) openEdge(Number(m[1]));
  }, [openEdge]);

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
        <Network className="w-10 h-10 text-slate-200" />
        <p className="text-sm text-slate-500">{error}</p>
        <Link to="/" className="text-xs font-bold text-emerald-600 hover:underline">← Volver a Grafos de Conocimiento</Link>
      </div>
    );
  }
  if (!data) return <p className="text-sm text-slate-400 py-16 text-center">Cargando grafo…</p>;

  const meta = selected ? (KIND_META[selected.kind] || KIND_META.texto) : null;
  const edgeRel = selectedEdge ? (RELATION_STYLE[selectedEdge.relation] || RELATION_STYLE.contexto) : null;
  const winTitle = (id: string | null) =>
    id ? (data.windows.find((w: any) => w.id === id)?.title || id) : 'Centro del grafo';

  return (
    <div
      className="relative w-full h-full"
      onDrop={onDrop}
      onDragOver={e => { if (data.can_edit) e.preventDefault(); }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onInit={inst => { rf.current = inst; }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={false}
        elevateNodesOnSelect={false}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.12}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1.5} color="#e2e8f0" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="top-right" pannable zoomable className="!w-40 !h-28" />
      </ReactFlow>

      {/* Herramientas de creación (solo creador o admin) */}
      {toolbar && data.can_edit && toolbar({
        graphId: data.graph.id,
        windows: data.windows || [],
        reload: load,
        openAdd: (kind?: string) => setShowAdd(kind || true),
        openConnect: () => setShowConnect(true),
      })}
      {!toolbar && data.can_edit && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-bold shadow-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Ventana
          </button>
          <button onClick={() => setShowConnect(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-700 text-white rounded-full text-xs font-bold shadow-lg transition-colors">
            <GitBranch className="w-3.5 h-3.5" /> Conectar
          </button>
        </div>
      )}

      {/* Píldora de rama activa: te dice en qué tema estás mientras exploras
          con zoom, y te devuelve a la vista completa de un clic. */}
      {activeBranch && (() => {
        const rel = RELATION_STYLE[activeBranch.relation] || RELATION_STYLE.contexto;
        return (
          <div className={cn('absolute left-1/2 -translate-x-1/2 z-10 animate-in fade-in slide-in-from-top-2 duration-300', data.can_edit ? 'top-16' : 'top-4')}>
            <div
              className="bg-slate-900/95 backdrop-blur text-white rounded-full shadow-2xl pl-3.5 pr-1.5 py-1.5 flex items-center gap-2"
              style={{ border: `2px solid ${rel.color}` }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ backgroundColor: rel.color }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: rel.color }}>{rel.label}</span>
              <span className="text-xs font-black max-w-[180px] truncate">{activeBranch.label}</span>
              <button onClick={() => openEdge(activeBranch.edgeId)} title="Ver los atributos de esta conexión"
                className="p-1.5 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                <GitBranch className="w-3.5 h-3.5" />
              </button>
              <button onClick={clearBranch} title="Salir de la rama — ver todo el grafo"
                className="p-1.5 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Cabecera del grafo: colapsada por defecto — solo el título — para
          no tapar el lienzo; un clic la expande con todo el detalle. */}
      <div className="absolute top-4 left-4 z-10 max-w-sm">
        <div className="bg-white/95 backdrop-blur border border-slate-200 rounded-full shadow-lg pl-1 pr-3 py-1 flex items-center gap-1.5">
          <Link to="/" title="Volver a Grafos" className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-full hover:bg-slate-50 transition-colors shrink-0">
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setInfoOpen(v => !v)}
            className="flex items-center gap-1.5 min-w-0 py-0.5"
            title={infoOpen ? 'Ocultar detalles' : 'Ver detalles del grafo'}
          >
            <h1 className="text-xs font-black text-slate-900 leading-tight truncate max-w-[220px]">{data.graph.title}</h1>
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform', infoOpen && 'rotate-180')} />
          </button>
        </div>

        {infoOpen && (
          <div className="mt-1.5 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-400">
              <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" />{data.graph.creator_name || 'Anónimo'}</span>
              <RatingWidget entityType="knowledge_graphs" entityId={data.graph.id}
                avg={data.graph.rating?.avg ?? null} count={data.graph.rating?.count ?? 0} myScore={null} compact />
              <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{data.graph.views}</span>
              {data.graph.is_ai_generated && (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  <Sparkles className="w-2.5 h-2.5" /> IA · pendiente de revisión
                </span>
              )}
              {data.graph.status === 'borrador' && (
                <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Borrador</span>
              )}
            </div>
            {data.graph.description && (
              <p className="text-xs text-slate-500 leading-relaxed mt-1.5 line-clamp-3">{data.graph.description}</p>
            )}

            {data.entity_links?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.entity_links.map((l: any, i: number) => {
                  const resolved = resolveEntityLink(l.entity_type, l.entity_id, helpers);
                  const chip = (
                    <span className="text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded-full hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                      {resolved.label}
                    </span>
                  );
                  return resolved.to ? <Link key={i} to={resolved.to}>{chip}</Link> : <span key={i}>{chip}</span>;
                })}
              </div>
            )}

            {data.related_graphs?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Grafos relacionados</p>
                {data.related_graphs.map((g: any) => (
                  <Link key={g.id} to={`/grafos/${g.slug}`} className="flex items-center gap-1 text-[11px] text-emerald-700 hover:underline">
                    <Network className="w-3 h-3 shrink-0" /> {g.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Panel lateral: atributos de una CONEXIÓN */}
      {selectedEdge && edgeRel && (
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[440px] bg-white border-l border-slate-200 shadow-2xl z-20 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2 z-10">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded text-white" style={{ backgroundColor: edgeRel.color }}>
              <GitBranch className="w-2.5 h-2.5" /> Conexión · {edgeRel.label}
            </span>
            <div className="flex items-center gap-1">
              {data.can_edit && (
                <button onClick={() => setEditingEdge(v => !v)} title="Editar esta conexión"
                  className={cn('p-1.5 rounded-lg transition-colors', editingEdge ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50')}>
                  <Pencil className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setSelectedEdge(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-4 space-y-4 pb-32">
            <div>
              <h2 className="text-xl font-black leading-tight" style={{ color: edgeRel.color }}>
                {selectedEdge.label || edgeRel.label}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                <span className="font-bold text-slate-700">{winTitle(selectedEdge.from_window_id)}</span>
                <span className="mx-1.5 font-black" style={{ color: edgeRel.color }}>→</span>
                <span className="font-bold text-slate-700">{winTitle(selectedEdge.to_window_id)}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[10px] text-slate-400">
                {selectedEdge.creator_name && (
                  <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" />conexión de {selectedEdge.creator_name}</span>
                )}
                {selectedEdge.created_at && (
                  <span>{new Date(selectedEdge.created_at).toLocaleDateString('es-ES')}</span>
                )}
              </div>
            </div>

            {!editingEdge && (
              selectedEdge.description
                ? <p className="text-sm text-slate-700 leading-relaxed border-l-2 pl-3" style={{ borderColor: edgeRel.color }}>{selectedEdge.description}</p>
                : <p className="text-xs text-slate-400 italic">Esta conexión aún no tiene descripción.</p>
            )}

            {editingEdge && (
              <div className="space-y-2 border border-slate-100 rounded-xl p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select value={edgeForm.relation} onChange={e => setEdgeForm(f => ({ ...f, relation: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none">
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input value={edgeForm.label} onChange={e => setEdgeForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="Etiqueta" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" />
                </div>
                <textarea value={edgeForm.description} onChange={e => setEdgeForm(f => ({ ...f, description: e.target.value }))}
                  rows={4} placeholder="¿Qué significa esta unión? ¿Por qué existe?"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none" />
                <button onClick={saveEdge}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors">
                  Guardar conexión
                </button>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3">
              <RatingWidget
                entityType="graph_edges"
                entityId={String(selectedEdge.id)}
                avg={selectedEdge.rating?.avg ?? null}
                count={selectedEdge.rating?.count ?? 0}
                myScore={selectedEdge.my_score ?? null}
                onRated={(rating, myScore) => patchEdge(selectedEdge.id, { rating, my_score: myScore })}
              />
            </div>

            <div className="border-t border-slate-100 pt-3">
              <EntityComments entityType="graph_edges" entityId={String(selectedEdge.id)} />
            </div>
          </div>
        </div>
      )}

      {/* POP-UP CENTRAL: la ventana expandida — el grafo sigue visible detrás;
          clic fuera o en la X cierra (petición del usuario, 2026-08-05). */}
      {selected && meta && (
        <div
          className="absolute inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelected(null)}
        >
        <div
          className="bg-white w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2 z-10">
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded', meta.chip)}>
              <meta.icon className="w-2.5 h-2.5" /> {meta.label}
            </span>
            <div className="flex items-center gap-1">
              {data.can_edit && (
                <button
                  onClick={() => { setConnectFrom({ id: selected.id, title: selected.title }); setSelected(null); }}
                  title="Crear algo nuevo conectado a esta ventana"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 border border-emerald-200 hover:border-emerald-400 rounded-full transition-colors"
                >
                  <Plus className="w-3 h-3" /> Conectar algo nuevo
                </button>
              )}
              <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-4 space-y-4 pb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{selected.title}</h2>
              <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3" />{selected.creator_name || 'Anónimo'}</span>
                <span className="inline-flex items-center gap-1"><Eye className="w-3 h-3" />{selected.views}</span>
                {selected.is_ai_generated && (
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                    <Sparkles className="w-2.5 h-2.5" /> Generado por IA · pendiente de revisión
                  </span>
                )}
              </div>
            </div>

            <WindowContent
              kind={selected.kind} config={selected.config} variant="full"
              onConfigChange={data.can_edit ? (config => {
                // Optimista: se pinta ya y se guarda detrás.
                patchWindow(selected.id, { config });
                setSelected((sel: any) => ({ ...sel, config }));
                fetch(`/api/windows/${selected.id}`, {
                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                  credentials: 'include', body: JSON.stringify({ config }),
                }).catch(() => {});
              }) : undefined}
            />

            <div className="border-t border-slate-100 pt-3">
              <RatingWidget
                entityType="knowledge_windows"
                entityId={selected.id}
                avg={selected.rating?.avg ?? null}
                count={selected.rating?.count ?? 0}
                myScore={selected.my_score ?? null}
                onRated={(rating, myScore) => patchWindow(selected.id, { rating, my_score: myScore })}
              />
            </div>

            <div className="border-t border-slate-100 pt-3">
              <EntityComments
                entityType="knowledge_windows"
                entityId={selected.id}
                onCountChange={n => patchWindow(selected.id, { comment_count: n })}
              />
            </div>
          </div>
        </div>
        </div>
      )}

      {soltando && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-emerald-50/70 backdrop-blur-[1px] border-4 border-dashed border-emerald-400 rounded-2xl animate-in fade-in duration-150">
          <div className="text-center">
            <Plus className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-black text-emerald-800">Suelta aquí</p>
            <p className="text-[11px] text-emerald-700/80 mt-0.5">
              Imágenes, PDF, hojas de cálculo o notas de texto
            </p>
          </div>
        </div>
      )}

      {pegando && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {pegando}
        </div>
      )}

      {(showAdd !== false || connectFrom) && (
        <AddWindowPanel
          graphId={data.graph.id}
          initialKind={typeof showAdd === 'string' ? showAdd : undefined}
          from={connectFrom}
          onClose={() => { setShowAdd(false); setConnectFrom(null); }}
          onAdded={load}
        />
      )}
      {showConnect && (
        <ConnectModal windows={data.windows} graphId={data.graph.id} onClose={() => setShowConnect(false)} onDone={load} />
      )}
    </div>
  );
}

export default function GrafoCanvas() {
  const { slug } = useParams();
  if (!slug) return null;
  return <GrafoLienzo slug={slug} />;
}
