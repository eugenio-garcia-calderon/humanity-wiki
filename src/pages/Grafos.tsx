import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, BackgroundVariant, Controls, MarkerType,
  useNodesState, useEdgesState,
  type Node, type Edge, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Network, Eye, AppWindow, User as UserIcon, Plus, Flame,
  X, ExternalLink, Globe2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import CreateGraphModal from '../components/knowledge/CreateGraphModal';
import WindowContent from '../components/knowledge/WindowContent';
import { cn } from '../utils/cn';
import { relStyle } from '../utils/relationStyle';
import {
  SPHERE, CENTER_SPHERE, REL_CIRCLE, REVEAL, ESFERA_CSS,
  esferaNodeTypes, esferaEdgeTypes, constelacion, relacionesPorVentana, KIND_TINT,
  type EsferaData,
} from '../components/knowledge/esferaKit';

// ============================================================================
// RED DE DATOS — la PIZARRA INFINITA (2026-08-06, petición del usuario)
// ============================================================================
// No hay tarjetas ni páginas que se abran: hay UN solo lienzo infinito.
// Cada grafo es una ESFERA con su previsualización (portada, título, pulso).
// Al acercarte —con la rueda o haciendo clic en la esfera— las publicaciones
// de ese grafo se DESPLIEGAN a su alrededor, en el mismo lienzo; al alejarte,
// se colapsan de nuevo dentro de la esfera y vuelves a la visión general.
// Solo se cambia de página al entrar en una publicación concreta o al abrir
// el grafo completo para editarlo.
//
// El lenguaje visual (esferas, satélites, círculos de categoría, membrana,
// electricidad) vive en `components/knowledge/esferaKit` — lo comparte con el
// explorador del mapa, para que sea el MISMO y no una copia parecida.

const ORBIT_X = 1050;        // semieje horizontal del anillo (elipse: la
const ORBIT_Y = 640;         // pantalla es más ancha que alta)
// La ESFERA que envuelve a todos los grafos: una membrana elíptica con el
// núcleo dentro.
const SHELL_X = ORBIT_X + SPHERE / 2 + 130;
const SHELL_Y = ORBIT_Y + SPHERE / 2 + 165;

interface GraphRow {
  id: string; title: string; slug: string; description: string | null;
  status: string; is_ai_generated: boolean; views: number; creator_name: string | null;
  window_count: number; cover_image: string | null; cover_video_id: string | null;
  is_reto: boolean; windows?: any[]; edges?: any[];
  center?: { short?: string; annex_of?: string } | null;
}

/** Un grafo, contado en el vocabulario de las esferas. */
const esferaDeGrafo = (g: GraphRow): EsferaData => ({
  title: g.title,
  short: g.center?.short || (g.is_reto ? 'Reto' : 'Grafo'),
  cover: g.cover_image,
  videoId: g.cover_video_id,
  accent: g.is_reto ? '#dc2626' : '#059669',
  kind: g.is_reto ? 'reto' : 'grafo',
  windows: g.window_count,
  views: g.views,
  ai: g.is_ai_generated,
  author: g.creator_name,
});

const nodeTypes = esferaNodeTypes;
const edgeTypes = esferaEdgeTypes;

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
    // Grafos ANEXOS (petición del usuario): otra vista de la misma realidad
    // (p. ej. «Estrecho Gibraltar» es una lectura de «Frontera Ceuta»).
    // No son retos de España aparte: cuelgan de su grafo padre.
    const isAnnex = (g: GraphRow) => !!g.center?.annex_of &&
      graphs.some(p => p.slug === g.center!.annex_of);
    const principales = graphs.filter(g => !isAnnex(g));
    const anexos = graphs.filter(isAnnex);
    const N = Math.max(principales.length, 1);

    // Relevancia relativa de cada grafo (0..1): visitas + volumen de
    // conocimiento. Gobierna el grosor y el flujo de su línea de energía.
    const score = (g: GraphRow) => g.views + g.window_count * 8;
    const maxScore = Math.max(...graphs.map(score), 1);
    const relevance: Record<string, number> = Object.fromEntries(
      graphs.map(g => [g.id, score(g) / maxScore]));

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

    // Centro de cada esfera: los principales en el anillo; los anexos, a un
    // lado de su padre (se resuelven después, cuando ya se conoce el padre).
    const centers: Record<string, { x: number; y: number }> = {};
    principales.forEach((g, i) => {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / N;
      centers[g.id] = { x: Math.cos(ang) * ORBIT_X, y: Math.sin(ang) * ORBIT_Y };
    });
    anexos.forEach(g => {
      const padre = graphs.find(p => p.slug === g.center!.annex_of)!;
      const pc = centers[padre.id] || { x: 0, y: 0 };
      // Se aparta del centro, en la misma dirección que su padre: queda
      // claramente "detrás" de él, colgando.
      const d = Math.hypot(pc.x, pc.y) || 1;
      centers[g.id] = { x: pc.x + (pc.x / d) * 620, y: pc.y + (pc.y / d) * 380 };
    });

    // La membrana se ajusta a las esferas que hay de verdad, para que ningún
    // grafo —tampoco un anexo— quede fuera de la esfera común.
    const all = Object.values(centers);
    const shellRx = Math.max(SHELL_X, ...all.map(c => Math.abs(c.x))) + SPHERE / 2 + 130;
    const shellRy = Math.max(SHELL_Y, ...all.map(c => Math.abs(c.y))) + SPHERE / 2 + 165;
    ns.push({
      id: '__envoltura__', type: 'envoltura',
      position: { x: -shellRx, y: -shellRy },
      draggable: false, selectable: false, zIndex: -20,
      data: { rx: shellRx, ry: shellRy },
    });

    graphs.forEach(g => {
      const cx = centers[g.id].x;
      const cy = centers[g.id].y;
      const accent = g.is_reto ? '#dc2626' : '#059669';

      ns.push({
        id: `esf-${g.id}`, type: 'esfera',
        position: { x: cx - SPHERE / 2, y: cy - SPHERE / 2 },
        draggable: false, selectable: false, zIndex: 20,
        data: { graph: g, esfera: esferaDeGrafo(g), desplegable: true, forceOpen: focused === g.id },
      });
      // Un anexo no cuelga del núcleo: cuelga de su grafo padre, porque es
      // otra lectura del mismo reto, no un reto de España aparte.
      const padre = isAnnex(g) ? graphs.find(p => p.slug === g.center!.annex_of) : null;
      es.push({
        // Electricidad núcleo → reto: grosor y flujo según la relevancia.
        id: `e-${g.id}`,
        source: padre ? `esf-${padre.id}` : '__nucleo__',
        target: `esf-${g.id}`, type: 'flujo',
        data: { t: padre ? 0.32 : (relevance[g.id] ?? 0.5), accent },
      });

      // Las publicaciones del grafo, con su disposición original encogida
      // y centrada en la esfera: la misma constelación, en miniatura.
      const wins = (g.windows || []).slice(0, 14);

      // Anti-solape: las tarjetas se repelen entre sí y ninguna puede
      // taparle la cara a su esfera (el imán compartido del kit).
      const { boxes, cw: CW, ch: CH } = constelacion(wins, SPHERE / 2 + 130);

      // La CATEGORÍA de conocimiento con la que el grafo sostiene cada
      // publicación (contexto, causa, dato…), tomada de las aristas del
      // centro del grafo original.
      const relByWindow = relacionesPorVentana(g.edges);

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
      <style>{ESFERA_CSS}</style>
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
            <Globe2 className="w-4 h-4 text-emerald-600" /> Grafos
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
            <button onClick={() => navigate(`/esquemas/${focusedGraph.slug}`)} title="Abrir el grafo completo"
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
                <button onClick={() => navigate(`/esquemas/${popup.graph.slug}`)} title="Abrir el grafo completo"
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
        <CreateGraphModal onClose={() => setShowCreate(false)} onCreated={slug => navigate(`/esquemas/${slug}`)} />
      )}
    </div>
  );
}
