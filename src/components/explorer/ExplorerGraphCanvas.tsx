import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow, Background, BackgroundVariant, Controls, MarkerType,
  type Node, type Edge, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X } from 'lucide-react';
import { relStyle } from '../../utils/relationStyle';
import {
  SPHERE, SPHERE_SM, CENTER_SPHERE, REL_CIRCLE, REVEAL, ESFERA_CSS,
  esferaNodeTypes, esferaEdgeTypes, constelacion, relacionesPorVentana, VentanaPopup,
  type EsferaData,
} from '../knowledge/esferaKit';

// ============================================================================
// EXPLORADOR DEL MAPA — la misma pizarra que la Red de Datos
// ============================================================================
// (2026-08-06, petición del usuario: rehacerlo con la estética y las
//  funcionalidades de «Red de Datos», no con tarjetas.)
//
// La entidad que miras (p. ej. Bosques) es el NÚCLEO, dentro de la membrana.
// A su alrededor orbitan sus RETOS como esferas rojas; de cada reto orbitan
// sus SOLUCIONES en verde; y, si ese reto tiene grafo de conocimiento, al
// acercarte sus PUBLICACIONES REALES se despliegan con sus círculos de
// categoría. El objetivo del que vienes queda como esfera enlazada arriba.
//
// Todo el vocabulario visual (esferas, satélites, electricidad, membrana,
// círculos de categoría, pop-up) es el del kit compartido: si cambia allí,
// cambia aquí.

/**
 * La órbita se adapta al hueco: este lienzo vive en una columna que puede ser
 * estrecha y alta (junto al mapa) o ancha y baja (a pantalla completa). Una
 * elipse fija se sale en un caso y desperdicia sitio en el otro, así que el
 * anillo toma la forma del contenedor.
 */
function orbita(w: number, h: number) {
  const R = Math.max(560, Math.min(1150, Math.min(w, h) * 1.55));
  const k = Math.max(0.62, Math.min(1.6, Math.sqrt(w / Math.max(h, 1))));
  return { ox: R * k, oy: R / k };
}

/** Anillo de soluciones de un reto: crece con cuántas hay, para que nunca se
 *  monten unas sobre otras ni sobre la esfera del reto. Con pocas se abren en
 *  abanico hacia fuera del núcleo; con muchas, rodean el reto entero. */
function anilloSoluciones(n: number, orbitaMin: number) {
  const span = n > 6 ? Math.PI * 2 : Math.PI * 1.3;
  const r = Math.min(orbitaMin * 0.62, Math.max(SPHERE * 0.85, (n * 215) / span));
  return { span, r };
}

const ROJO = '#dc2626';
const VERDE = '#16a34a';
const PIZARRA = '#64748b';

export interface ExplorerGraphProps {
  data: any;
  level: string;
  levelLabel: string;
  parent: { level: string; id: string; name: string; levelLabel: string } | null;
  graphsByChallenge: Record<string, any>;
  onNavigate: (level: any, id: string) => void;
  onOpenChallenge: (challengeId: string) => void;
  onOpenSolution: (solution: any) => void;
  onOpenGraph: (slug: string) => void;
}

export default function ExplorerGraphCanvas({
  data, level, levelLabel, parent, graphsByChallenge,
  onNavigate, onOpenChallenge, onOpenSolution, onOpenGraph,
}: ExplorerGraphProps) {
  const rf = useRef<ReactFlowInstance | null>(null);
  const [focused, setFocused] = useState<string | null>(null);   // id del reto enfocado
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ win: any; graph: any } | null>(null);
  const [caja, setCaja] = useState({ w: 900, h: 700 });

  // Al cambiar de entidad (menú de la izquierda) se suelta el foco.
  useEffect(() => { setFocused(null); setPopup(null); }, [level, data?.entity?.id]);

  const { nodes, edges } = useMemo(() => {
    const ns: Node[] = [];
    const es: Edge[] = [];
    if (!data?.entity) return { nodes: ns, edges: es };
    const { ox: ORBIT_X, oy: ORBIT_Y } = orbita(caja.w, caja.h);
    const HIJO_X = ORBIT_X * 0.44, HIJO_Y = ORBIT_Y * 0.44;

    const retos: any[] = data.challenges || [];
    const soluciones: any[] = data.solutions || [];
    const hijos: any[] = data.children || [];
    const score = level === 'objetivo' ? data.score : data.observation?.score ?? null;

    const solsDe = (retoId: string) =>
      soluciones.filter(s => !Array.isArray(s.challenge_ids) || s.challenge_ids.includes(retoId));

    // Relevancia de cada reto (0..1): gobierna el grosor y la velocidad de su
    // electricidad. Prioridad declarada + volumen de conocimiento y respuesta.
    const relevancia = (r: any) => {
      const p = r.priority === 'high' ? 1 : r.priority === 'medium' ? 0.6 : 0.35;
      const g = graphsByChallenge[r.id];
      const vol = Math.min(1, ((g?.window_count || 0) + solsDe(r.id).length * 2) / 20);
      return Math.max(0.18, Math.min(1, p * 0.62 + vol * 0.38));
    };

    // --- el núcleo: la entidad que estás mirando ---------------------------
    ns.push({
      id: '__nucleo__', type: 'nucleo',
      position: { x: -CENTER_SPHERE / 2, y: -CENTER_SPHERE / 2 },
      draggable: false, selectable: false, zIndex: 30,
      data: {
        label: data.entity.name,
        sublabel: `${levelLabel} · ${data.territory?.name || ''}`,
        accent: score != null ? ROJO : '#059669',
        score,
        hint: retos.length
          ? <>acércate a un reto —<br />se despliega su conocimiento</>
          : <>sin retos registrados<br />todavía aquí</>,
      },
    });

    // --- los hijos de la jerarquía, en el anillo interior -------------------
    hijos.forEach((h, i) => {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(hijos.length, 1);
      const x = Math.cos(ang) * HIJO_X, y = Math.sin(ang) * HIJO_Y;
      const esfera: EsferaData = {
        title: h.name,
        subtitle: h.subtitle || null,
        accent: '#0284c7',
        kind: 'objetivo',
        size: SPHERE_SM,
        short: h.score != null ? `${h.score}%` : (h.riskLabel || null),
        labelNear: true,
      };
      ns.push({
        id: `hijo-${h.id}`, type: 'esfera',
        position: { x: x - SPHERE_SM / 2, y: y - SPHERE_SM / 2 },
        draggable: false, selectable: false, zIndex: 12,
        data: { esfera, hijo: h },
      });
      es.push({
        id: `e-hijo-${h.id}`, source: '__nucleo__', target: `hijo-${h.id}`,
        style: { stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '4 6' },
      });
    });

    // --- los retos, en el anillo principal ---------------------------------
    const centros: Record<string, { x: number; y: number }> = {};
    retos.forEach((r, i) => {
      // Se rota medio hueco para que ningún reto caiga justo arriba, que es
      // por donde baja la conexión del objetivo.
      const n = Math.max(retos.length, 1);
      const ang = -Math.PI / 2 + Math.PI / n + (2 * Math.PI * i) / n;
      centros[r.id] = { x: Math.cos(ang) * ORBIT_X, y: Math.sin(ang) * ORBIT_Y };
    });

    retos.forEach(r => {
      const { x: cx, y: cy } = centros[r.id];
      const g = graphsByChallenge[r.id] || null;
      const abierto = focused === r.id;
      const esfera: EsferaData = {
        title: r.title,
        short: r.title.length <= 18 ? r.title : 'Reto',
        cover: g?.cover_image || null,
        videoId: g?.cover_video_id || null,
        accent: ROJO,
        kind: 'reto',
        windows: g?.window_count,
        views: g?.views,
        author: g?.creator_name || null,
        subtitle: g ? null : (r.description && r.description !== r.title ? r.description : null),
      };
      ns.push({
        id: `reto-${r.id}`, type: 'esfera',
        position: { x: cx - SPHERE / 2, y: cy - SPHERE / 2 },
        draggable: false, selectable: false, zIndex: 20,
        data: { esfera, reto: r, graph: g, desplegable: !!g, forceOpen: abierto },
      });
      es.push({
        id: `e-reto-${r.id}`, source: '__nucleo__', target: `reto-${r.id}`, type: 'flujo',
        data: { t: relevancia(r), accent: ROJO },
      });

      // --- las soluciones, orbitando su reto -------------------------------
      const sols = solsDe(r.id);
      const { span, r: solR } = anilloSoluciones(sols.length, Math.min(ORBIT_X, ORBIT_Y));
      sols.forEach((s, j) => {
        // Se reparten en el arco que mira hacia fuera del núcleo, para no
        // meterse entre el reto y el centro.
        const base = Math.atan2(cy, cx);
        const a = base - span / 2 + (span * (j + 0.5)) / Math.max(sols.length, 1);
        const sx = cx + Math.cos(a) * solR;
        const sy = cy + Math.sin(a) * solR;
        const esferaSol: EsferaData = {
          title: s.title, accent: VERDE, kind: 'solucion', size: SPHERE_SM,
          subtitle: s.impact ? `Impacto ${s.impact}` : null,
          labelNear: true,   // de lejos, puntos verdes; de cerca, sus nombres
        };
        ns.push({
          id: `sol-${r.id}-${s.id}`, type: 'esfera',
          position: { x: sx - SPHERE_SM / 2, y: sy - SPHERE_SM / 2 },
          draggable: false, selectable: false, zIndex: 14,
          data: { esfera: esferaSol, solucion: s },
        });
        es.push({
          id: `e-sol-${r.id}-${s.id}`, source: `reto-${r.id}`, target: `sol-${r.id}-${s.id}`, type: 'fade',
          style: { stroke: VERDE, strokeWidth: 1.8, opacity: 0.6 },
          data: { forceOpen: abierto },
        });
      });

      // --- las publicaciones del grafo del reto ----------------------------
      if (!g?.windows?.length) return;
      const wins = g.windows.slice(0, 14);
      // Las publicaciones viven MÁS ALLÁ del anillo de soluciones: nunca se
      // pisan, y al alejarte los satélites tampoco.
      const winInner = solR + SPHERE_SM / 2 + 230;
      const { boxes, cw: CW, ch: CH } = constelacion(wins, winInner);
      const relPorVentana = relacionesPorVentana(g.edges);

      wins.forEach((w: any, j: number) => {
        ns.push({
          id: `w-${r.id}-${w.id}`, type: 'ventana',
          position: { x: cx + boxes[j].x, y: cy + boxes[j].y },
          draggable: false, selectable: false, zIndex: 10,
          data: {
            win: w, graph: g, forceOpen: abierto,
            hoverPreview: hoverId === r.id && !abierto,
            dx: boxes[j].x + CW / 2, dy: boxes[j].y + CH / 2,
            ring: (solR + SPHERE_SM / 2 + 120) * (hoverId === r.id && !abierto ? 1.22 : 1),
          },
        });

        const rel = relPorVentana[w.id];
        if (rel) {
          // El círculo va entre la esfera del reto y la publicación: se lee la
          // cadena reto → categoría de conocimiento → publicación.
          const mx = boxes[j].x + CW / 2, my = boxes[j].y + CH / 2;
          const dist = Math.hypot(mx, my) || 1;
          const t = Math.min(0.5, (solR + SPHERE_SM / 2 + 70) / dist);
          const relId = `r-${r.id}-${w.id}`;
          const rs = relStyle(rel.relation);
          ns.push({
            id: relId, type: 'relacion',
            position: { x: cx + mx * t - REL_CIRCLE / 2, y: cy + my * t - REL_CIRCLE / 2 },
            draggable: false, selectable: false, zIndex: 15,
            data: { relation: rel.relation, label: rel.label, forceOpen: abierto },
          });
          es.push({
            id: `er1-${r.id}-${w.id}`, source: `reto-${r.id}`, target: relId, type: 'fade',
            style: { stroke: rs.color, strokeWidth: 1.5, opacity: 0.5 },
            data: { forceOpen: abierto },
          });
          es.push({
            id: `er2-${r.id}-${w.id}`, source: relId, target: `w-${r.id}-${w.id}`, type: 'fade',
            style: { stroke: rs.color, strokeWidth: 2, opacity: 0.75 },
            markerEnd: { type: MarkerType.ArrowClosed, color: rs.color, width: 12, height: 12 },
            data: { forceOpen: abierto },
          });
        } else {
          es.push({
            id: `ew-${r.id}-${w.id}`, source: `reto-${r.id}`, target: `w-${r.id}-${w.id}`, type: 'fade',
            style: { stroke: ROJO, strokeWidth: 1, opacity: 0.22 },
            data: { forceOpen: abierto },
          });
        }
      });
    });

    // --- la membrana, ajustada a las ESFERAS (no a las publicaciones, que
    //     son satélites y viajan mucho más lejos) --------------------------
    const puntos = ns
      .filter(n => n.type === 'esfera' && n.id !== '__padre__')
      .map(n => ({ x: n.position.x, y: n.position.y }));
    const rx = Math.max(ORBIT_X, ...puntos.map(p => Math.abs(p.x) + SPHERE_SM)) + SPHERE / 2 + 150;
    const ry = Math.max(ORBIT_Y, ...puntos.map(p => Math.abs(p.y) + SPHERE_SM)) + SPHERE / 2 + 180;
    ns.unshift({
      id: '__envoltura__', type: 'envoltura',
      position: { x: -rx, y: -ry },
      draggable: false, selectable: false, zIndex: -20,
      data: { rx, ry },
    });

    // --- el objetivo del que vienes: esfera enlazada arriba -----------------
    if (parent) {
      const py = -ry;
      ns.push({
        id: '__padre__', type: 'esfera',
        position: { x: -SPHERE_SM / 2, y: py - SPHERE_SM / 2 },
        draggable: false, selectable: false, zIndex: 25,
        data: {
          esfera: {
            title: parent.name, short: parent.levelLabel,
            accent: PIZARRA, kind: 'objetivo', size: SPHERE_SM,
            subtitle: 'estás dentro',
          } as EsferaData,
          padre: parent,
        },
      });
      es.push({
        id: 'e-padre', source: '__padre__', target: '__nucleo__', type: 'flujo',
        data: { t: 0.55, accent: PIZARRA },
      });
    }

    return { nodes: ns, edges: es };
  }, [data, level, levelLabel, parent, graphsByChallenge, focused, hoverId, caja]);

  // «Ventanas dinámicas»: el encuadre viaja al trozo que toca — la vista
  // general (núcleo, retos, hijos y el objetivo de arriba) o, con un reto
  // enfocado, ese reto con sus soluciones y sus publicaciones.
  const encuadrar = useCallback((animar = true) => {
    const inst = rf.current;
    if (!inst) return;
    let intentos = 0;
    let timer: any;
    const probar = () => {
      intentos++;
      const todos = inst.getNodes();
      const sel = (focused
        ? todos.filter(n => n.id === `reto-${focused}` || n.id.startsWith(`sol-${focused}-`) || n.id.startsWith(`w-${focused}-`))
        : todos.filter(n => (n.type === 'nucleo' || n.id === '__padre__' || n.id.startsWith('reto-') || n.id.startsWith('hijo-')))
      ).map(n => ({ id: n.id }));
      const reintentar = () => { if (intentos < 25) timer = setTimeout(probar, 120); };
      if (!sel.length) { reintentar(); return; }
      // fitView devuelve false mientras React Flow no ha medido los nodos.
      Promise.resolve(
        inst.fitView({ nodes: sel, duration: animar ? 800 : 0, padding: focused ? 0.18 : 0.3, maxZoom: focused ? 0.95 : 0.75 }),
      ).then(ok => { if (!ok) reintentar(); }).catch(reintentar);
    };
    probar();
    return () => clearTimeout(timer);
  }, [focused]);

  useEffect(() => {
    const t = setTimeout(() => encuadrar(true), 90);
    return () => clearTimeout(t);
  }, [encuadrar, data?.entity?.id, level]);

  // El panel es redimensionable (y tiene pantalla completa): si cambia de
  // tamaño, el lienzo se reencuadra en vez de quedarse fuera de cuadro.
  const marco = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = marco.current;
    if (!el) return;
    let t: any;
    const medir = () => {
      setCaja(c => (c.w === el.clientWidth && c.h === el.clientHeight ? c : { w: el.clientWidth, h: el.clientHeight }));
      clearTimeout(t);
      t = setTimeout(() => encuadrar(false), 200);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [encuadrar]);

  return (
    <div ref={marco} className="w-full h-full relative bg-slate-50">
      <style>{ESFERA_CSS}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={esferaNodeTypes}
        edgeTypes={esferaEdgeTypes}
        onInit={inst => { rf.current = inst; encuadrar(false); }}
        onNodeClick={(_, node) => {
          const d: any = node.data;
          if (node.type === 'nucleo') { setFocused(null); return; }
          if (node.id === '__padre__') { onNavigate(d.padre.level, d.padre.id); return; }
          if (d.hijo) { if (!d.hijo.noNavega) onNavigate(d.hijo.level, d.hijo.id); return; }
          if (d.solucion) { onOpenSolution(d.solucion); return; }
          if (d.reto) {
            // Primer clic: vuela al reto y despliega su conocimiento.
            // Segundo clic: abre el grafo entero, o sus causas si no lo tiene.
            if (focused === d.reto.id) {
              if (d.graph) onOpenGraph(d.graph.slug); else onOpenChallenge(d.reto.id);
            } else setFocused(d.reto.id);
            return;
          }
          if (node.type === 'ventana' && (d.forceOpen || (rf.current?.getZoom() ?? 0) >= REVEAL)) {
            setPopup({ win: d.win, graph: d.graph });
          }
        }}
        onNodeMouseEnter={(_, node) => { const d: any = node.data; if (d.reto) setHoverId(d.reto.id); }}
        onNodeMouseLeave={(_, node) => { const d: any = node.data; if (d.reto) setHoverId(null); }}
        nodesConnectable={false}
        elevateNodesOnSelect={false}
        minZoom={0.06}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#cbd5e1" />
        <Controls position="bottom-left" showInteractive={false} />
      </ReactFlow>

      {focused && (
        <button
          onClick={() => setFocused(null)}
          className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/95 backdrop-blur border border-slate-200 shadow-lg text-[11px] font-black text-slate-600 hover:text-slate-900 transition-colors"
        >
          <X className="w-3 h-3" /> Ver todo
        </button>
      )}

      {popup && (
        <VentanaPopup
          win={popup.win}
          contexto={popup.graph?.title}
          onOpenGraph={popup.graph ? () => onOpenGraph(popup.graph.slug) : undefined}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
