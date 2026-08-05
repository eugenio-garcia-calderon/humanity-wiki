import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, Handle, Position, MarkerType,
  useNodesState, useEdgesState,
  type Node, type Edge, type NodeProps, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Network, Eye, AppWindow, User as UserIcon, Plus, Flame, PlayCircle, Map as MapIcon } from 'lucide-react';

// ============================================================================
// Meta-grafo (2026-08-05, petición del usuario): una página que ES un grafo.
// ============================================================================
// El índice de Grafos y la página de Mapas se presentan como un lienzo con un
// gran nodo central y los elementos existentes como tarjetas conectadas —
// clic en una tarjeta navega a su destino; un nodo «+» invita a crear.

export interface MetaItem {
  id: string;
  title: string;
  subtitle?: string | null;
  cover?: string | null;
  coverVideoId?: string | null;
  to: string;
  isReto?: boolean;
  kind?: 'grafo' | 'mapa';
  creator?: string | null;
  views?: number;
  windows?: number;
}

const CARD_W = 300;
const CENTER_SIZE = 230;

function InvisibleHandles() {
  const style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' as const };
  return (
    <>
      <Handle type="source" position={Position.Top} style={style} />
      <Handle type="target" position={Position.Top} style={style} />
    </>
  );
}

function MetaCenterNode({ data }: NodeProps<any>) {
  const d = data as any;
  return (
    <div className="flex flex-col items-center" style={{ width: CENTER_SIZE + 40 }}>
      <InvisibleHandles />
      <div
        className="rounded-full bg-slate-900 shadow-2xl flex flex-col items-center justify-center text-center px-6"
        style={{
          width: CENTER_SIZE, height: CENTER_SIZE,
          border: `4px solid ${d.accent}`,
          boxShadow: `0 0 70px ${d.accent}40, 0 25px 50px -12px rgb(0 0 0 / 0.4)`,
        }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] mb-1.5" style={{ color: d.accent }}>{d.sublabel}</p>
        <p className="text-2xl font-black text-white uppercase leading-none tracking-tight break-words w-full">{d.label}</p>
        {d.hint && <p className="text-[9px] text-slate-400 mt-2 leading-snug">{d.hint}</p>}
      </div>
    </div>
  );
}

function MetaItemNode({ data }: NodeProps<any>) {
  const it: MetaItem = (data as any).item;
  const cover = it.cover || (it.coverVideoId ? `https://img.youtube.com/vi/${it.coverVideoId}/hqdefault.jpg` : null);
  return (
    <div
      onClick={() => (data as any).onOpen(it.to)}
      className={`bg-white rounded-2xl border-2 shadow-xl overflow-hidden cursor-pointer transition-all duration-200 ease-out hover:scale-105 hover:shadow-2xl ${
        it.isReto ? 'border-red-300 hover:border-red-500' : 'border-slate-200 hover:border-emerald-400'
      }`}
      style={{ width: CARD_W }}
      title={`Abrir «${it.title}»`}
    >
      <InvisibleHandles />
      {cover ? (
        <div className="relative h-28 overflow-hidden">
          <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
          {!it.cover && it.coverVideoId && <PlayCircle className="absolute inset-0 m-auto w-8 h-8 text-white/90 drop-shadow" />}
        </div>
      ) : (
        <div className={`h-28 flex items-center justify-center ${
          it.kind === 'mapa' ? 'bg-gradient-to-br from-sky-600 via-indigo-700 to-slate-800' : 'bg-gradient-to-br from-emerald-600 via-teal-700 to-indigo-800'
        }`}>
          {it.kind === 'mapa'
            ? <MapIcon className="w-10 h-10 text-white/30" />
            : <Network className="w-10 h-10 text-white/30" />}
        </div>
      )}
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1">
          {it.isReto ? (
            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.18em] text-white bg-red-600 px-2 py-0.5 rounded-full">
              <Flame className="w-2.5 h-2.5" /> Reto
            </span>
          ) : it.kind === 'mapa' ? (
            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.18em] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
              <MapIcon className="w-2.5 h-2.5" /> Mapa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-[0.18em] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <Network className="w-2.5 h-2.5" /> Grafo
            </span>
          )}
        </div>
        <p className="text-sm font-black text-slate-900 leading-tight line-clamp-2">{it.title}</p>
        {it.subtitle && <p className="text-[10px] text-slate-500 leading-snug line-clamp-2 mt-1">{it.subtitle}</p>}
        <div className="flex items-center gap-2.5 mt-2 text-[9px] text-slate-400">
          {it.creator && <span className="inline-flex items-center gap-0.5 truncate max-w-[110px]"><UserIcon className="w-2.5 h-2.5 shrink-0" />{it.creator}</span>}
          {it.views != null && <span className="inline-flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{it.views}</span>}
          {it.windows != null && <span className="inline-flex items-center gap-0.5"><AppWindow className="w-2.5 h-2.5" />{it.windows}</span>}
        </div>
      </div>
    </div>
  );
}

function MetaCreateNode({ data }: NodeProps<any>) {
  const d = data as any;
  return (
    <div
      onClick={() => d.onCreate()}
      className="rounded-full bg-white border-4 border-dashed border-emerald-400 shadow-xl flex flex-col items-center justify-center text-center px-4 cursor-pointer transition-all duration-200 ease-out hover:scale-110 hover:border-emerald-600 hover:bg-emerald-50"
      style={{ width: 150, height: 150 }}
      title={d.label}
    >
      <InvisibleHandles />
      <span className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-lg">
        <Plus className="w-5 h-5" />
      </span>
      <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wide leading-tight">{d.label}</p>
    </div>
  );
}

const nodeTypes = { metaCentro: MetaCenterNode, metaItem: MetaItemNode, metaCrear: MetaCreateNode };

export default function MetaGraphCanvas({ centerLabel, centerSublabel, centerHint, accent = '#10b981', items, createLabel, onCreate }: {
  centerLabel: string;
  centerSublabel: string;
  centerHint?: string;
  accent?: string;
  items: MetaItem[];
  createLabel: string;
  onCreate: () => void;
}) {
  const navigate = useNavigate();
  const rf = useRef<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onOpen = useCallback((to: string) => navigate(to), [navigate]);

  const built = useMemo(() => {
    const N = items.length + 1; // + nodo crear
    const radius = Math.max(420, 90 * N);
    const nodes: Node[] = [{
      id: '__meta_center__', type: 'metaCentro',
      position: { x: -(CENTER_SIZE + 40) / 2, y: -CENTER_SIZE / 2 },
      draggable: false, selectable: false,
      data: { label: centerLabel, sublabel: centerSublabel, hint: centerHint, accent },
    }];
    const edges: Edge[] = [];
    items.forEach((it, i) => {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / N;
      nodes.push({
        id: it.id, type: 'metaItem',
        position: { x: Math.cos(ang) * radius - CARD_W / 2, y: Math.sin(ang) * radius - 110 },
        draggable: false,
        data: { item: it, onOpen },
      });
      const color = it.isReto ? '#dc2626' : it.kind === 'mapa' ? '#0284c7' : '#059669';
      edges.push({
        id: `me-${it.id}`, source: '__meta_center__', target: it.id, type: 'straight',
        style: { stroke: color, strokeWidth: 3, opacity: 0.85 },
        markerEnd: { type: MarkerType.ArrowClosed, color, width: 15, height: 15 },
      });
    });
    const angC = -Math.PI / 2 + (2 * Math.PI * items.length) / N;
    nodes.push({
      id: '__meta_create__', type: 'metaCrear',
      position: { x: Math.cos(angC) * radius - 75, y: Math.sin(angC) * radius - 75 },
      draggable: false,
      data: { label: createLabel, onCreate },
    });
    edges.push({
      id: 'me-create', source: '__meta_center__', target: '__meta_create__', type: 'straight',
      style: { stroke: '#10b981', strokeWidth: 2.5, strokeDasharray: '8 6', opacity: 0.7 },
    });
    return { nodes, edges };
  }, [items, centerLabel, centerSublabel, centerHint, accent, createLabel, onCreate, onOpen]);

  useEffect(() => {
    setNodes(built.nodes);
    setEdges(built.edges);
  }, [built, setNodes, setEdges]);

  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current || nodes.length <= 1) return;
    didFitRef.current = true;
    const t = setTimeout(() => rf.current?.fitView({ padding: 0.15 }), 80);
    return () => clearTimeout(t);
  }, [nodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onInit={inst => { rf.current = inst; }}
      nodeTypes={nodeTypes}
      nodesConnectable={false}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.15}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={24} size={1.5} color="#e2e8f0" />
      <Controls position="bottom-left" showInteractive={false} />
    </ReactFlow>
  );
}
