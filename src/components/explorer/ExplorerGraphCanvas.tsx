import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, BackgroundVariant, Controls, Handle, Position,
  type Node, type Edge, type NodeProps, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Flame, Sprout, ChevronUp, Info, Layers, Maximize2, X } from 'lucide-react';
import { getColorForScore } from '../../utils/scoreColor';
import { cn } from '../../utils/cn';
import { AdminMenu } from '../ui/AdminMenu';

// ============================================================================
// EXPLORADOR COMO GRAFO (2026-08-06, petición del usuario)
// ============================================================================
// El panel central del mapa deja de ser una ficha de texto y pasa a ser un
// grafo con una espina vertical:
//
//        objetivo (viene de ARRIBA: estás dentro de Ecosistemas)
//              │
//        el indicador ACTUAL, con su dato en este territorio
//         ╱         ╲
//     reto rojo   reto rojo     ← si el reto tiene grafo de conocimiento,
//      ╱ │ ╲         │ ╲          el nodo lleva dentro una PREVISUALIZACIÓN
//   sol sol sol   sol  sol      ← soluciones en verde
//
// «Ventanas dinámicas»: el lienzo contiene más de lo que se ve y el encuadre
// viaja al trozo que toca — al cambiar de nivel en el menú de la izquierda, y
// al hacer clic en un reto (que enfoca su rama).

const PADRE_W = 230, PADRE_H = 62;
const ACTUAL_W = 320, ACTUAL_H = 150;
const FICHA_W = 250;
const HIJO_W = 220, HIJO_H = 44, HIJO_GAP = 10;
const RETO_W = 240, RETO_H = 84;
const RETO_GRAFO_W = 320, RETO_GRAFO_H = 250;   // con previsualización dentro
const SOL_W = 210, SOL_H = 78, SOL_GAP_X = 16, SOL_GAP_Y = 14;
const Y_PADRE = -230, Y_ACTUAL = 0, Y_RETO = 275, Y_SOL = 640;
const RAMA_GAP = 90;

const ROJO = '#dc2626';
const VERDE = '#16a34a';
const PIZARRA = '#94a3b8';

/** Ancho lógico del navegador que vive dentro de la previsualización. */
const PREVIEW_W = 1440;
const PREVIEW_H = 900;

function Puertos() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Left} id="izq" style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Right} id="der" style={{ opacity: 0, pointerEvents: 'none' }} />
    </>
  );
}

// ---------------------------------------------------------------------------
// El objetivo del que cuelga todo: la conexión que baja desde aquí es la que
// dice «estás dentro de Ecosistemas».
// ---------------------------------------------------------------------------
function PadreNode({ data }: NodeProps<any>) {
  const d = data as any;
  return (
    <div
      className="rounded-2xl bg-white border-2 border-slate-200 shadow-sm px-4 flex items-center gap-2.5 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer"
      style={{ width: PADRE_W, height: PADRE_H }}
      title={`Subir a ${d.name}`}
    >
      <Puertos />
      <ChevronUp className="w-4 h-4 text-slate-300 shrink-0" />
      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">{d.levelLabel}</p>
        <p className="text-sm font-black text-slate-800 truncate">{d.name}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// El nodo ACTUAL: nombre + el dato de este territorio, que antes era la
// tarjeta «Datos en España».
// ---------------------------------------------------------------------------
function ActualNode({ data }: NodeProps<any>) {
  const d = data as any;
  const color = d.score != null ? getColorForScore(d.score) : PIZARRA;
  return (
    <div
      className="rounded-3xl bg-white border-[3px] shadow-xl px-5 py-4 flex flex-col justify-center"
      style={{ width: ACTUAL_W, height: ACTUAL_H, borderColor: color }}
    >
      <Puertos />
      <p className="text-[9px] font-black uppercase tracking-[0.24em]" style={{ color }}>{d.levelLabel}</p>
      <p className="text-2xl font-black text-slate-900 leading-tight truncate" title={d.name}>{d.name}</p>
      {d.score != null ? (
        <div className="mt-2.5">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${d.score}%`, backgroundColor: color }} />
            </div>
            <span className="text-xl font-black shrink-0" style={{ color }}>{d.score}%</span>
          </div>
          <p className="text-[9px] text-slate-400 mt-1 truncate">
            en {d.territoryName}{d.source ? ` · ${d.source}` : ''}
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 italic mt-2">Sin datos en {d.territoryName} todavía.</p>
      )}
    </div>
  );
}

/** La ficha de metodología: lo que antes era «Información general». */
function FichaNode({ data }: NodeProps<any>) {
  const d = data as any;
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3" style={{ width: FICHA_W }}>
      <Puertos />
      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 inline-flex items-center gap-1 mb-1">
        <Info className="w-2.5 h-2.5" /> Información general
      </p>
      <p className="text-[11px] text-slate-600 leading-relaxed">{d.texto}</p>
      {d.metadatos?.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {d.metadatos.map((m: string, i: number) => (
            <p key={i} className="text-[10px] text-slate-400">{m}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Un hijo de la jerarquía (indicador, marcador o métrica). */
function HijoNode({ data }: NodeProps<any>) {
  const d = data as any;
  return (
    <div
      className="rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 shadow-sm px-3 flex items-center gap-2 transition-colors cursor-pointer"
      style={{ width: HIJO_W, height: HIJO_H }}
      title={d.name}
    >
      <Puertos />
      <Layers className="w-3 h-3 text-slate-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-slate-700 truncate">{d.name}</p>
        {d.subtitle && <p className="text-[9px] text-slate-400 truncate">{d.subtitle}</p>}
      </div>
      {d.score != null && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white shrink-0"
          style={{ backgroundColor: getColorForScore(d.score) }}>{d.score}%</span>
      )}
      {d.riskLabel && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 shrink-0">{d.riskLabel}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Un RETO. Si tiene grafo de conocimiento, el nodo lleva dentro una ventana
// viva con ese grafo — la previsualización que pidió el usuario.
// ---------------------------------------------------------------------------
function RetoNode({ data }: NodeProps<any>) {
  const d = data as any;
  const marco = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(0.2);
  const conGrafo = !!d.graph;

  useEffect(() => {
    const el = marco.current;
    if (!el) return;
    const medir = () => { if (el.clientWidth) setEscala(el.clientWidth / PREVIEW_W); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [conGrafo]);

  return (
    <div
      className={cn(
        'rounded-2xl bg-white border-2 shadow-lg overflow-hidden transition-all cursor-pointer',
        d.focused ? 'ring-4 ring-red-200' : 'hover:shadow-xl hover:-translate-y-0.5',
      )}
      style={{
        width: conGrafo ? RETO_GRAFO_W : RETO_W,
        height: conGrafo ? RETO_GRAFO_H : RETO_H,
        borderColor: ROJO,
      }}
      title={d.title}
    >
      <Puertos />
      <div className="px-3.5 py-2.5 flex items-center gap-2" style={{ backgroundColor: ROJO }}>
        <Flame className="w-3.5 h-3.5 text-white shrink-0" />
        <span className="flex-1 text-[12px] font-black text-white uppercase tracking-wide truncate">{d.title}</span>
        {conGrafo && <Maximize2 className="w-3 h-3 text-white/70 shrink-0" />}
        {d.isAdmin && (
          <span onClick={e => e.stopPropagation()} className="shrink-0">
            <AdminMenu className="text-white/80" onEdit={() => d.onEdit?.(d.raw)} />
          </span>
        )}
      </div>
      {conGrafo ? (
        <div ref={marco} className="relative bg-slate-50" style={{ height: RETO_GRAFO_H - 44 }}>
          <iframe
            src={`/grafos/${d.graph.slug}?embed=1`}
            title=""
            tabIndex={-1}
            aria-hidden="true"
            scrolling="no"
            className="absolute top-0 left-1/2 border-0 pointer-events-none transition-transform duration-500 ease-out"
            style={{
              width: PREVIEW_W,
              height: PREVIEW_H,
              transformOrigin: 'top center',
              transform: `translateX(-50%) scale(${escala * (d.focused ? 1.12 : 1)})`,
            }}
          />
          <div className="absolute inset-x-0 bottom-0 px-2.5 py-1.5 bg-gradient-to-t from-white via-white/90 to-transparent">
            <p className="text-[9px] font-bold text-slate-500 truncate">
              {d.graph.window_count} publicaciones · clic para abrir el grafo
            </p>
          </div>
        </div>
      ) : (
        <div className="px-3.5 py-2 flex items-center">
          <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
            {d.description || 'Sin descripción todavía.'}
          </p>
        </div>
      )}
    </div>
  );
}

/** Una SOLUCIÓN, en verde, colgando de su reto. */
function SolucionNode({ data }: NodeProps<any>) {
  const d = data as any;
  return (
    <div
      className="rounded-2xl bg-white border-2 shadow-sm px-3 py-2 flex flex-col justify-center hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
      style={{ width: SOL_W, height: SOL_H, borderColor: VERDE }}
      title={d.title}
    >
      <Puertos />
      <div className="flex items-center gap-1.5 mb-0.5">
        <Sprout className="w-3 h-3 shrink-0" style={{ color: VERDE }} />
        <span className="flex-1 text-[8px] font-black uppercase tracking-[0.16em]" style={{ color: VERDE }}>Solución</span>
        {d.isAdmin && (
          <span onClick={e => e.stopPropagation()} className="shrink-0 -mr-1">
            <AdminMenu onEdit={() => d.onEdit?.(d.raw)} />
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{d.title}</p>
      {d.impact && <p className="text-[9px] text-slate-400 mt-0.5">Impacto {d.impact}</p>}
    </div>
  );
}

const nodeTypes = {
  padre: PadreNode, actual: ActualNode, ficha: FichaNode,
  hijo: HijoNode, reto: RetoNode, solucion: SolucionNode,
};

// ---------------------------------------------------------------------------

export interface ExplorerGraphProps {
  data: any;
  level: string;
  levelLabel: string;
  parent: { level: string; id: string; name: string; levelLabel: string } | null;
  ficha: { texto: string; metadatos: string[] } | null;
  graphsByChallenge: Record<string, any>;
  isAdmin: boolean;
  onNavigate: (level: any, id: string) => void;
  onOpenChallenge: (challengeId: string) => void;
  onOpenSolution: (solution: any) => void;
  onEditChallenge: (challenge: any) => void;
  onEditSolution: (solution: any) => void;
}

export default function ExplorerGraphCanvas({
  data, level, levelLabel, parent, ficha, graphsByChallenge, isAdmin,
  onNavigate, onOpenChallenge, onOpenSolution, onEditChallenge, onEditSolution,
}: ExplorerGraphProps) {
  const navigate = useNavigate();
  const rf = useRef<ReactFlowInstance | null>(null);
  const [ramaFoco, setRamaFoco] = useState<string | null>(null);

  // Al cambiar de entidad (menú de la izquierda) se suelta el foco de rama.
  useEffect(() => { setRamaFoco(null); }, [level, data?.entity?.id]);

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    if (!data?.entity) return { nodes: ns, edges: es };

    const retos: any[] = data.challenges || [];
    const soluciones: any[] = data.solutions || [];
    const score = level === 'objetivo' ? data.score : data.observation?.score ?? null;

    // --- la espina: padre → actual -----------------------------------------
    if (parent) {
      ns.push({
        id: '__padre__', type: 'padre',
        position: { x: -PADRE_W / 2, y: Y_PADRE },
        draggable: false, selectable: false,
        data: { name: parent.name, levelLabel: parent.levelLabel, level: parent.level, id: parent.id },
      });
      es.push({
        id: 'e-padre', source: '__padre__', target: '__actual__',
        style: { stroke: PIZARRA, strokeWidth: 2.5 }, animated: true,
      });
    }

    ns.push({
      id: '__actual__', type: 'actual',
      position: { x: -ACTUAL_W / 2, y: Y_ACTUAL },
      draggable: false, selectable: false, zIndex: 10,
      data: {
        name: data.entity.name, levelLabel, score,
        territoryName: data.territory?.name || '',
        source: data.observation?.source || null,
      },
    });

    if (ficha) {
      ns.push({
        id: '__ficha__', type: 'ficha',
        position: { x: -ACTUAL_W / 2 - FICHA_W - 70, y: Y_ACTUAL + 6 },
        draggable: false, selectable: false,
        data: ficha,
      });
      es.push({
        id: 'e-ficha', source: '__ficha__', sourceHandle: 'der', target: '__actual__', targetHandle: 'izq',
        style: { stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '3 5' },
      });
    }

    // --- hijos de la jerarquía, en columna a la derecha ---------------------
    const hijos: any[] = data.children || [];
    hijos.forEach((h, i) => {
      ns.push({
        id: `hijo-${h.id}`, type: 'hijo',
        position: {
          x: ACTUAL_W / 2 + 80,
          y: Y_ACTUAL + (ACTUAL_H - (hijos.length * HIJO_H + (hijos.length - 1) * HIJO_GAP)) / 2 + i * (HIJO_H + HIJO_GAP),
        },
        draggable: false, selectable: false,
        data: { ...h },
      });
      es.push({
        id: `e-hijo-${h.id}`, source: '__actual__', sourceHandle: 'der',
        target: `hijo-${h.id}`, targetHandle: 'izq',
        style: { stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '3 5' },
      });
    });

    // --- retos y, bajo cada uno, sus soluciones -----------------------------
    // Cada reto ocupa el ancho de lo que cuelga de él, para que dos ramas
    // vecinas no se pisen nunca.
    const solsDe = (retoId: string) =>
      soluciones.filter(s => !Array.isArray(s.challenge_ids) || s.challenge_ids.includes(retoId));

    // Con una sola rama caben 3 soluciones por fila; con varias, 2, para que
    // el árbol entero no se vuelva tan ancho que haya que alejarlo demasiado.
    const porFila = retos.length <= 1 ? 3 : 2;
    const ramas = retos.map(r => {
      const sols = solsDe(r.id);
      const cols = Math.max(1, Math.min(sols.length, porFila));
      const anchoSols = cols * SOL_W + (cols - 1) * SOL_GAP_X;
      const anchoReto = graphsByChallenge[r.id] ? RETO_GRAFO_W : RETO_W;
      return { reto: r, sols, cols, ancho: Math.max(anchoSols, anchoReto) };
    });

    const anchoTotal = ramas.reduce((a, r) => a + r.ancho, 0) + Math.max(0, ramas.length - 1) * RAMA_GAP;
    let x = -anchoTotal / 2;

    ramas.forEach(({ reto, sols, cols, ancho }) => {
      const cx = x + ancho / 2;
      const grafo = graphsByChallenge[reto.id] || null;
      const rw = grafo ? RETO_GRAFO_W : RETO_W;

      ns.push({
        id: `reto-${reto.id}`, type: 'reto',
        position: { x: cx - rw / 2, y: Y_RETO },
        draggable: false, selectable: false, zIndex: 5,
        data: { ...reto, graph: grafo, focused: ramaFoco === reto.id, isAdmin, onEdit: onEditChallenge, raw: reto },
      });
      es.push({
        id: `e-reto-${reto.id}`, source: '__actual__', target: `reto-${reto.id}`,
        style: { stroke: ROJO, strokeWidth: 2.5 }, animated: true,
      });

      const anchoSols = cols * SOL_W + (cols - 1) * SOL_GAP_X;
      sols.forEach((s, i) => {
        const col = i % cols;
        const fila = Math.floor(i / cols);
        ns.push({
          id: `sol-${reto.id}-${s.id}`, type: 'solucion',
          position: {
            x: cx - anchoSols / 2 + col * (SOL_W + SOL_GAP_X),
            y: Y_SOL + fila * (SOL_H + SOL_GAP_Y),
          },
          draggable: false, selectable: false,
          data: { ...s, isAdmin, onEdit: onEditSolution, raw: s },
        });
        es.push({
          id: `e-sol-${reto.id}-${s.id}`, source: `reto-${reto.id}`, target: `sol-${reto.id}-${s.id}`,
          style: { stroke: VERDE, strokeWidth: 1.8 },
        });
      });

      x += ancho + RAMA_GAP;
    });

    return { nodes: ns, edges: es };
  }, [data, level, levelLabel, parent, ficha, graphsByChallenge, ramaFoco, isAdmin, onEditChallenge, onEditSolution]);

  // «Ventanas dinámicas»: el encuadre viaja al trozo que toca.
  //  · sin rama enfocada → la ESPINA (padre, actual, hijos y retos). Las
  //    soluciones quedan fuera de cuadro a propósito: en una columna
  //    estrecha, meterlas todas encoge el grafo hasta lo ilegible.
  //  · con una rama enfocada → ese reto y sus soluciones.
  // Se reintenta hasta que React Flow ha medido los nodos (si no, encuadra
  // sobre cajas de tamaño cero y el resultado sale descuadrado).
  const encuadrar = useCallback((animar = true) => {
    const inst = rf.current;
    if (!inst) return () => {};
    let intentos = 0;
    let timer: any;
    const probar = () => {
      intentos++;
      const todos = inst.getNodes();
      // Por defecto se encuadra la ESPINA: el objetivo del que vienes, la
      // entidad actual y sus retos. La ficha, los hijos y las soluciones
      // quedan fuera de cuadro a propósito — en una columna estrecha,
      // meterlo todo encoge el grafo hasta lo ilegible. Están ahí: el botón
      // de ajustar de los controles los trae de vuelta.
      const espina = todos.filter(n => n.id === '__padre__' || n.id === '__actual__' || n.id.startsWith('reto-'));
      // Al enfocar una rama se encuadra el reto y SUS soluciones, sin el nodo
      // de arriba: incluirlo estira el cuadro y obliga a alejarse tanto que
      // las soluciones dejan de leerse.
      const sel = (ramaFoco
        ? todos.filter(n => n.id === `reto-${ramaFoco}` || n.id.startsWith(`sol-${ramaFoco}-`))
        : espina.length > 1 ? espina : todos.filter(n => !n.id.startsWith('sol-'))
      ).map(n => ({ id: n.id }));
      const reintentar = () => { if (intentos < 25) timer = setTimeout(probar, 120); };
      if (!sel.length) { reintentar(); return; }
      // fitView devuelve false mientras React Flow no ha medido los nodos:
      // se reintenta hasta que confirma que ha encuadrado de verdad.
      Promise.resolve(
        inst.fitView({ nodes: sel, duration: animar ? 700 : 0, padding: 0.14, maxZoom: ramaFoco ? 1 : 0.9 }),
      ).then(ok => { if (!ok) reintentar(); }).catch(reintentar);
    };
    probar();
    return () => clearTimeout(timer);
  }, [ramaFoco]);

  useEffect(() => {
    const t = setTimeout(() => encuadrar(true), 90);
    return () => clearTimeout(t);
  }, [encuadrar, data?.entity?.id, level]);

  // El panel es redimensionable: si cambia de ancho, el grafo se reencuadra
  // en vez de quedarse fuera de cuadro.
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    let t: any;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => encuadrar(false), 160);
    });
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [encuadrar]);

  return (
    <div ref={caja} className="w-full h-full relative">
      <style>{`
        .explorador-lienzo .react-flow__edge,
        .explorador-lienzo .react-flow__edge-path,
        .explorador-lienzo .react-flow__edge-interaction { pointer-events: none !important; }
      `}</style>
      <ReactFlow
        className="explorador-lienzo"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={inst => { rf.current = inst; encuadrar(false); }}
        onNodeClick={(_, node) => {
          const d: any = node.data;
          if (node.type === 'padre') onNavigate(d.level, d.id);
          else if (node.type === 'hijo') { if (!d.noNavega) onNavigate(d.level, d.id); }
          else if (node.type === 'actual') setRamaFoco(null);
          else if (node.type === 'reto') {
            // Primer clic enfoca la rama; el segundo abre su grafo (o su ficha).
            if (ramaFoco === d.id && d.graph) navigate(`/grafos/${d.graph.slug}`);
            else if (ramaFoco === d.id) onOpenChallenge(d.id);
            else setRamaFoco(d.id);
          } else if (node.type === 'solucion') onOpenSolution(d);
        }}
        nodesConnectable={false}
        elevateNodesOnSelect={false}
        minZoom={0.15}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#e2e8f0" />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>

      {ramaFoco && (
        <button
          onClick={() => setRamaFoco(null)}
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <X className="w-3 h-3" /> Ver todo
        </button>
      )}
    </div>
  );
}
