import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType,
  useNodesState, useEdgesState, useInternalNode, getStraightPath,
  BaseEdge, EdgeLabelRenderer,
  type Node, type Edge, type NodeProps, type EdgeProps, type InternalNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft, X, Eye, MessageCircle, Sparkles, User as UserIcon, Network,
  Image as ImageIcon, PlayCircle, BookOpen, Link2, Map as MapIcon,
  PieChart as PieChartIcon, Info, CalendarClock, Users as UsersIcon,
  FileText, MessageSquare, Plus, GitBranch, Pencil, ShoppingBag,
} from 'lucide-react';
import { cn } from '../utils/cn';
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
  texto:       { label: 'Texto',       icon: FileText,       chip: 'bg-slate-100 text-slate-600' },
};

const RELATION_STYLE: Record<string, { color: string; label: string }> = {
  contexto:   { color: '#64748b', label: 'contexto' },
  causa:      { color: '#7c3aed', label: 'causa' },
  dato:       { color: '#0284c7', label: 'dato' },
  fuente:     { color: '#475569', label: 'fuente' },
  apoya:      { color: '#059669', label: 'apoya' },
  contradice: { color: '#dc2626', label: 'contradice' },
  matiza:     { color: '#d97706', label: 'matiza' },
};

const RELATIONS = Object.keys(RELATION_STYLE);

// Geometría del anillo de relaciones.
const RING_RADIUS = 330;
const CIRCLE_SIZE = 104;
const CENTER_W = 300;
const CENTER_H = 190;

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
  const left = g.center?.left;
  const right = g.center?.right;

  if (left?.label && right?.label) {
    return (
      <div className="flex flex-col items-center" style={{ width: CENTER_W }}>
        <CenterHandles />
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
      onClick={() => d.onOpenEdge?.(d.edgeId)}
      className="rounded-full bg-white shadow-xl flex items-center justify-center text-center p-3 cursor-pointer transition-transform hover:scale-105"
      style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, border: `3px solid ${rel.color}` }}
      title="Ver los atributos de esta conexión"
    >
      <CenterHandles />
      <span className="text-[11px] font-black uppercase leading-tight tracking-wide" style={{ color: rel.color }}>
        {d.label || rel.label}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Nodo ventana (miniatura).
// ----------------------------------------------------------------------------
function VentanaNode({ data }: NodeProps<any>) {
  const { win, onOpen } = data as any;
  const meta = KIND_META[win.kind] || KIND_META.texto;
  const Icon = meta.icon;
  return (
    <div
      onClick={() => onOpen(win.id)}
      className="w-64 bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer overflow-hidden"
    >
      <CenterHandles />
      <div className="px-3 pt-2.5 flex items-center justify-between gap-2">
        <span className={cn('inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded', meta.chip)}>
          <Icon className="w-2.5 h-2.5" /> {meta.label}
        </span>
        {win.is_ai_generated && (
          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.5 rounded" title="Contenido generado por IA, pendiente de revisión">
            <Sparkles className="w-2 h-2" /> IA
          </span>
        )}
      </div>
      <div className="px-3 pt-1.5">
        <p className="text-sm font-black text-slate-900 leading-tight line-clamp-2">{win.title}</p>
      </div>
      <div className="px-3 py-2">
        <WindowContent kind={win.kind} config={win.config} variant="node" />
      </div>
      <div className="px-3 py-1.5 border-t border-slate-50 flex items-center gap-2.5 text-[9px] text-slate-400">
        <span className="inline-flex items-center gap-0.5 truncate max-w-[80px]"><UserIcon className="w-2.5 h-2.5 shrink-0" />{win.creator_name || '—'}</span>
        <RatingWidget entityType="knowledge_windows" entityId={win.id}
          avg={win.rating?.avg ?? null} count={win.rating?.count ?? 0} myScore={null} compact />
        <span className="inline-flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{win.views}</span>
        <span className="inline-flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{win.comment_count}</span>
      </div>
    </div>
  );
}

const nodeTypes = { centro: CenterNode, relacion: RelacionNode, ventana: VentanaNode };
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

export default function GrafoCanvas() {
  const { slug } = useParams();
  const helpers = useHelpers();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedEdge, setSelectedEdge] = useState<any>(null);
  const [editingEdge, setEditingEdge] = useState(false);
  const [edgeForm, setEdgeForm] = useState({ relation: 'contexto', label: '', description: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
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
      draggable: false, selectable: false,
      data: { graph: data.graph },
    };

    const winNodes: Node[] = data.windows.map((w: any) => ({
      id: w.id, type: 'ventana',
      position: { x: w.x, y: w.y },
      draggable: !!data.can_edit,
      data: { win: w, onOpen: openWindow },
    }));

    const centerEdges = (data.edges as any[]).filter(e => !e.from_window_id && winById[e.to_window_id]);
    const restEdges = (data.edges as any[]).filter(e => e.from_window_id);

    const angleOfTarget = (e: any) => {
      const w = winById[e.to_window_id];
      return Math.atan2(w.y + 110, w.x + 128);
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
        draggable: false, selectable: false,
        data: { relation: e.relation, label: e.label, edgeId: e.id, onOpenEdge: openEdge },
      };
    });

    const flowEdges: Edge[] = [];
    for (const e of sortedCenter) {
      const rel = RELATION_STYLE[e.relation] || RELATION_STYLE.contexto;
      flowEdges.push({
        id: `ec-${e.id}`, source: '__center__', target: `rel-${e.id}`, type: 'flotante',
        style: { stroke: rel.color, strokeWidth: 1.75, opacity: 0.75 },
      });
      flowEdges.push({
        id: `e-${e.id}`, source: `rel-${e.id}`, target: e.to_window_id, type: 'flotante',
        style: { stroke: rel.color, strokeWidth: 4 },
        markerEnd: { type: MarkerType.ArrowClosed, color: rel.color, width: 16, height: 16 },
      });
    }
    for (const e of restEdges) {
      const rel = RELATION_STYLE[e.relation] || RELATION_STYLE.contexto;
      flowEdges.push({
        id: `e-${e.id}`, source: e.from_window_id, target: e.to_window_id, type: 'flotante',
        style: { stroke: rel.color, strokeWidth: 3 },
        markerEnd: { type: MarkerType.ArrowClosed, color: rel.color, width: 15, height: 15 },
        animated: e.relation === 'contradice',
        data: { label: e.label || rel.label },
      });
    }

    setNodes([centerNode, ...relNodes, ...winNodes]);
    setEdges(flowEdges);
  }, [data, openWindow, openEdge, setNodes, setEdges]);

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
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesConnectable={false}
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
      {data.can_edit && (
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

      {/* Cabecera del grafo */}
      <div className="absolute top-4 left-4 z-10 max-w-sm bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-lg px-4 py-3">
        <Link to="/" className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-emerald-600 transition-colors uppercase tracking-widest mb-1">
          <ArrowLeft className="w-3 h-3" /> Grafos
        </Link>
        <h1 className="text-lg font-black text-slate-900 leading-tight">{data.graph.title}</h1>
        <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[10px] text-slate-400">
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
            <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <X className="w-4 h-4" />
            </button>
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

            <WindowContent kind={selected.kind} config={selected.config} variant="full" />

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

      {showAdd && (
        <AddWindowPanel graphId={data.graph.id} onClose={() => setShowAdd(false)} onAdded={load} />
      )}
      {showConnect && (
        <ConnectModal windows={data.windows} graphId={data.graph.id} onClose={() => setShowConnect(false)} onDone={load} />
      )}
    </div>
  );
}
