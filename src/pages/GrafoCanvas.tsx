import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position, MarkerType,
  useNodesState, useEdgesState, type Node, type Edge, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft, X, Eye, MessageCircle, Sparkles, User as UserIcon, Network,
  Image as ImageIcon, PlayCircle, BookOpen, Link2, Map as MapIcon,
  PieChart as PieChartIcon, Info, CalendarClock, Users as UsersIcon,
  FileText, MessageSquare,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useHelpers } from '../contexts/DataContext';
import { resolveEntityLink } from '../utils/entityLinks';
import WindowContent from '../components/knowledge/WindowContent';
import RatingWidget from '../components/knowledge/RatingWidget';
import EntityComments from '../components/knowledge/EntityComments';

// ============================================================================
// Lienzo de un Grafo de Conocimiento (Fase 11) — canvas libre con React Flow
// ============================================================================
// Nodo central = el tema. Alrededor, las Ventanas de Conocimiento (con autor,
// valoración 0-10, vistas y comentarios), conectadas por aristas tipadas.
// Clic en una ventana → panel lateral derecho con el contenido completo.
// El creador del grafo (o un administrador) puede arrastrar las ventanas y la
// posición queda grabada — esa es la memoria espacial del grafo.

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
  texto:       { label: 'Texto',       icon: FileText,       chip: 'bg-slate-100 text-slate-600' },
};

/** Colores de las aristas por tipo de relación — la controversia se ve. */
const RELATION_STYLE: Record<string, { color: string; label: string }> = {
  contexto:   { color: '#94a3b8', label: 'contexto' },
  causa:      { color: '#7c3aed', label: 'causa' },
  dato:       { color: '#0284c7', label: 'dato' },
  fuente:     { color: '#64748b', label: 'fuente' },
  apoya:      { color: '#059669', label: 'apoya' },
  contradice: { color: '#dc2626', label: 'contradice' },
  matiza:     { color: '#d97706', label: 'matiza' },
};

// --- Nodo central: el tema del grafo -----------------------------------------
function CenterNode({ data }: NodeProps<any>) {
  const g = (data as any).graph;
  return (
    <div className="rounded-full bg-slate-900 text-white shadow-2xl px-8 py-7 max-w-[260px] text-center border-4 border-emerald-500/60">
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Network className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
      <p className="text-base font-black leading-tight">{g.title}</p>
      {g.creator_name && (
        <p className="text-[10px] text-slate-300 mt-1.5">Grafo de {g.creator_name}</p>
      )}
    </div>
  );
}

// --- Nodo ventana: la miniatura ----------------------------------------------
function VentanaNode({ data }: NodeProps<any>) {
  const { win, onOpen } = data as any;
  const meta = KIND_META[win.kind] || KIND_META.texto;
  const Icon = meta.icon;
  return (
    <div
      onClick={() => onOpen(win.id)}
      className="w-64 bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer overflow-hidden"
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
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

const nodeTypes = { centro: CenterNode, ventana: VentanaNode };

export default function GrafoCanvas() {
  const { slug } = useParams();
  const helpers = useHelpers();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const openWindow = useCallback((winId: string) => {
    setData((d: any) => {
      const win = d?.windows?.find((w: any) => w.id === winId);
      if (win) {
        setSelected(win);
        fetch(`/api/windows/${winId}/view`, { method: 'POST' }).catch(() => {});
      }
      return d;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/graphs/${slug}`, { credentials: 'include' })
      .then(async r => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'No se pudo cargar el grafo.');
        return json;
      })
      .then(json => { if (!cancelled) { setData(json); setError(null); } })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [slug]);

  // Construir nodos y aristas cuando llegan los datos.
  useEffect(() => {
    if (!data) return;
    const winNodes: Node[] = data.windows.map((w: any) => ({
      id: w.id,
      type: 'ventana',
      position: { x: w.x, y: w.y },
      draggable: !!data.can_edit,
      data: { win: w, onOpen: openWindow },
    }));
    const centerNode: Node = {
      id: '__center__',
      type: 'centro',
      position: { x: 0, y: 0 },
      draggable: false,
      data: { graph: data.graph },
    };
    const flowEdges: Edge[] = data.edges.map((e: any) => {
      const rel = RELATION_STYLE[e.relation] || RELATION_STYLE.contexto;
      return {
        id: `e${e.id}`,
        source: e.from_window_id || '__center__',
        target: e.to_window_id,
        label: e.label || (e.relation !== 'contexto' ? rel.label : undefined),
        style: { stroke: rel.color, strokeWidth: e.relation === 'contradice' || e.relation === 'apoya' ? 2 : 1.5 },
        labelStyle: { fontSize: 10, fontWeight: 700, fill: rel.color },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
        markerEnd: { type: MarkerType.ArrowClosed, color: rel.color },
        animated: e.relation === 'contradice',
      };
    });
    setNodes([centerNode, ...winNodes]);
    setEdges(flowEdges);
  }, [data, openWindow, setNodes, setEdges]);

  /** Al soltar una ventana arrastrada, se graba su posición (la memoria del lienzo). */
  const onNodeDragStop = useCallback((_: any, node: Node) => {
    if (!data?.can_edit || node.id === '__center__') return;
    // También en el estado local: si no, cualquier re-render posterior (una
    // valoración, un comentario) devolvería el nodo a su posición antigua.
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

  /** Propagar una valoración nueva al nodo del lienzo y al panel. */
  const patchWindow = (winId: string, patch: any) => {
    setData((d: any) => ({
      ...d,
      windows: d.windows.map((w: any) => w.id === winId ? { ...w, ...patch } : w),
    }));
    setSelected((s: any) => (s && s.id === winId ? { ...s, ...patch } : s));
  };

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

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={1.75}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1.5} color="#e2e8f0" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap position="top-right" pannable zoomable className="!w-40 !h-28" />
      </ReactFlow>

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

        {/* Ontología: entidades de la plataforma de las que trata el grafo */}
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

        {/* Inferencia: grafos que comparten entidades con este */}
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

      {/* Panel lateral derecho: la ventana expandida */}
      {selected && meta && (
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-[440px] bg-white border-l border-slate-200 shadow-2xl z-20 overflow-y-auto animate-in slide-in-from-right duration-200">
          <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-4 py-3 flex items-center justify-between gap-2 z-10">
            <span className={cn('inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded', meta.chip)}>
              <meta.icon className="w-2.5 h-2.5" /> {meta.label}
            </span>
            <button onClick={() => setSelected(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 py-4 space-y-4 pb-32">
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
      )}
    </div>
  );
}
