import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow, Background, BackgroundVariant, Handle, Position, useNodesState, useEdgesState, useStore,
  type Node, type Edge, type NodeProps, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Flame, Lightbulb, Network, Map as MapIcon, Gauge, MessageSquare, Sparkles,
  User as UserIcon, X, Orbit, PlayCircle,
} from 'lucide-react';
import { useHelpers } from '../contexts/DataContext';
import { challengeLinkTo } from '../utils/entityLinks';
import { slugify } from '../utils/slugify';
import UniversoSwitcher from '../components/universo/UniversoSwitcher';

// ============================================================================
// UNIVERSO — la tercera forma de ver la wiki de la humanidad (2026-08-06)
// ============================================================================
// Un cosmos navegable con ZOOM SEMÁNTICO: de lejos ves la constelación —
// el núcleo (la unión de inteligencia natural y artificial) rodeado de seis
// esferas de dominio con la paleta semántica de la plataforma (retos rojo,
// soluciones verde, datos azul…). Al sumergirte con la rueda, cada esfera
// revela su contenido REAL: grafos con portada, mapas, retos, soluciones,
// indicadores y las voces de la comunidad. Clic en una esfera = viaje
// animado a su órbita; clic en el núcleo = volver a ver el todo.
// Todo son datos vivos de la plataforma — no hay nada decorativo inventado.

const CORE_R = 360;          // diámetro del núcleo
const SPHERE_R = 200;        // diámetro de las esferas de dominio
const ORBIT_1 = 780;         // radio de la órbita de esferas
const ORBIT_2 = 1330;        // radio medio de los contenidos
const REVEAL_ZOOM = 0.42;    // zoom a partir del cual emergen los contenidos

interface Dominio {
  key: string;
  label: string;
  sub: string;
  color: string;
  dark: string;
  icon: any;
  items: Array<{ id: string; title: string; sub?: string | null; cover?: string | null; videoId?: string | null; to: string; ia?: boolean }>;
}

function InvisibleHandles() {
  const style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' as const };
  return (
    <>
      <Handle type="source" position={Position.Top} style={style} />
      <Handle type="target" position={Position.Top} style={style} />
    </>
  );
}

/** Zoom actual del lienzo — cada nodo decide qué revela según la distancia. */
const useZoom = () => useStore(s => s.transform[2]);

// ----------------------------------------------------------------------------
// Núcleo: la humanidad — inteligencia natural × artificial, con datos vivos.
// ----------------------------------------------------------------------------
function NucleoNode({ data }: NodeProps<any>) {
  const d = data as any;
  const zoom = useZoom();
  return (
    <div
      onClick={() => d.onReset()}
      className="relative flex flex-col items-center justify-center text-center cursor-pointer select-none"
      style={{ width: CORE_R, height: CORE_R }}
      title="Ver todo el universo"
    >
      <InvisibleHandles />
      {/* halo respirando */}
      <div className="absolute inset-0 rounded-full uni-breathe"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(37,99,235,0.16) 45%, transparent 70%)' }} />
      <div
        className="absolute inset-6 rounded-full"
        style={{
          background: 'radial-gradient(circle at 32% 28%, #164e63 0%, #0f172a 55%, #020617 100%)',
          border: '1px solid rgba(148,163,184,0.35)',
          boxShadow: '0 0 90px rgba(16,185,129,0.35), 0 0 160px rgba(37,99,235,0.25), inset 0 0 60px rgba(2,6,23,0.9)',
        }}
      />
      <div className="relative z-10 px-10">
        {/* La unión: dos anillos entrelazados — natural (ámbar) y artificial (esmeralda) */}
        <div className="relative w-16 h-9 mx-auto mb-2.5">
          <span className="absolute left-0 top-0 w-9 h-9 rounded-full border-[3px] border-amber-400/90" />
          <span className="absolute right-0 top-0 w-9 h-9 rounded-full border-[3px] border-emerald-400/90" />
          <Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-[9px] font-bold uppercase tracking-[0.35em] text-emerald-300">Humanity Wiki</p>
        <p className="text-3xl font-black text-white uppercase tracking-tight leading-none mt-1">Universo</p>
        <p className="text-[10px] text-slate-300 mt-1.5 leading-snug">
          inteligencia natural <span className="text-amber-300 font-bold">×</span> artificial
          <br />para la prosperidad de la humanidad
        </p>
        <div className="flex items-center justify-center gap-3 mt-3 text-[9px] font-bold text-slate-200">
          <span className="inline-flex items-center gap-1"><UserIcon className="w-3 h-3 text-amber-300" />{d.humanas} humanas</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3 text-emerald-300" />{d.ia} de IA</span>
        </div>
        <p className={`text-[9px] text-slate-400 mt-2.5 transition-opacity duration-500 ${zoom < REVEAL_ZOOM ? 'opacity-100' : 'opacity-0'}`}>
          acércate con la rueda — el conocimiento emerge
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Esfera de dominio: un mundo de conocimiento con su color semántico.
// ----------------------------------------------------------------------------
function EsferaNode({ data }: NodeProps<any>) {
  const d = data as any;
  const dom: Dominio = d.dominio;
  const Icon = dom.icon;
  const zoom = useZoom();
  return (
    <div
      onClick={() => d.onFocus(dom.key)}
      className="uni-float group relative flex flex-col items-center justify-center text-center cursor-pointer select-none transition-transform duration-200 ease-out hover:scale-110"
      style={{ width: SPHERE_R, height: SPHERE_R, animationDelay: d.delay }}
      title={`Explorar ${dom.label}`}
    >
      <InvisibleHandles />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 30% 26%, ${dom.color} 0%, ${dom.dark} 68%, #020617 130%)`,
          border: '1px solid rgba(255,255,255,0.25)',
          boxShadow: `0 0 55px ${dom.color}66, inset -14px -18px 45px rgba(2,6,23,0.55), inset 10px 12px 30px rgba(255,255,255,0.18)`,
        }}
      />
      <div className="relative z-10 px-5">
        <Icon className="w-7 h-7 text-white/95 mx-auto mb-1.5 drop-shadow" />
        <p className="text-lg font-black text-white uppercase tracking-wide leading-none drop-shadow">{dom.label}</p>
        <p className="text-[9px] font-bold text-white/75 mt-1 leading-snug">{dom.sub}</p>
        <span className="inline-flex items-center justify-center mt-2 min-w-7 h-7 px-2 rounded-full bg-slate-950/60 border border-white/25 text-xs font-black text-white">
          {dom.items.length}
        </span>
      </div>
      <span className={`absolute -bottom-7 text-[9px] font-bold uppercase tracking-[0.25em] text-white/0 group-hover:text-white/70 transition-colors ${zoom < REVEAL_ZOOM ? '' : 'hidden'}`}>
        entrar
      </span>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Contenido en órbita: emerge del vacío al acercarte (zoom semántico).
// ----------------------------------------------------------------------------
function OrbitaItemNode({ data }: NodeProps<any>) {
  const d = data as any;
  const dom: Dominio = d.dominio;
  const it = d.item;
  const zoom = useZoom();
  const visible = zoom >= REVEAL_ZOOM;
  const media = it.cover || (it.videoId ? `https://img.youtube.com/vi/${it.videoId}/hqdefault.jpg` : null);
  return (
    <div
      onClick={() => visible && d.onOpen(it.to)}
      className="w-[260px] rounded-2xl overflow-hidden select-none transition-all duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.6)',
        pointerEvents: visible ? 'auto' : 'none',
        background: 'rgba(15,23,42,0.92)',
        border: `1.5px solid ${dom.color}88`,
        boxShadow: `0 0 30px ${dom.color}30`,
        cursor: 'pointer',
      }}
      title={it.title}
    >
      <InvisibleHandles />
      {media && (
        <div className="relative h-28 overflow-hidden">
          <img src={media} alt="" loading="lazy" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
          {!it.cover && it.videoId && <PlayCircle className="absolute inset-0 m-auto w-8 h-8 text-white/90" />}
        </div>
      )}
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dom.color }} />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: dom.color }}>{dom.label}</span>
          {it.ia && (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-bold text-emerald-300 ml-auto">
              <Sparkles className="w-2.5 h-2.5" /> IA
            </span>
          )}
        </div>
        <p className="text-[13px] font-black text-white leading-tight line-clamp-2">{it.title}</p>
        {it.sub && <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-1">{it.sub}</p>}
      </div>
    </div>
  );
}

/** Anillos orbitales de fondo, puramente decorativos. */
function AnillosNode() {
  return (
    <div className="pointer-events-none" style={{ width: ORBIT_2 * 2 + 500, height: ORBIT_2 * 2 + 500 }}>
      <InvisibleHandles />
      {[ORBIT_1, ORBIT_2].map(r => (
        <div
          key={r}
          className="absolute rounded-full"
          style={{
            left: '50%', top: '50%',
            width: r * 2, height: r * 2,
            transform: 'translate(-50%, -50%)',
            border: '1px dashed rgba(148,163,184,0.14)',
          }}
        />
      ))}
    </div>
  );
}

const nodeTypes = { nucleo: NucleoNode, esfera: EsferaNode, orbitaItem: OrbitaItemNode, anillos: AnillosNode };

export default function Universo() {
  const helpers = useHelpers();
  const navigate = useNavigate();
  const rf = useRef<ReactFlowInstance | null>(null);
  const [graphs, setGraphs] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [pubs, setPubs] = useState<any[]>([]);
  const [activeSphere, setActiveSphere] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    fetch('/api/graphs', { credentials: 'include' }).then(r => r.json()).then(j => setGraphs(Array.isArray(j) ? j : [])).catch(() => {});
    fetch('/api/maps', { credentials: 'include' }).then(r => r.json()).then(j => setMaps(Array.isArray(j) ? j : [])).catch(() => {});
    fetch('/api/feed?limit=8', { credentials: 'include' }).then(r => r.json()).then(j => setPubs(Array.isArray(j) ? j : [])).catch(() => {});
  }, []);

  // Los seis dominios del universo, con la paleta semántica de la plataforma.
  const dominios: Dominio[] = useMemo(() => [
    {
      key: 'retos', label: 'Retos', sub: 'lo que nos amenaza', color: '#dc2626', dark: '#7f1d1d', icon: Flame,
      items: (helpers.challenges || []).slice(0, 5).map((c: any) => ({ id: c.id, title: c.title, to: challengeLinkTo(c) })),
    },
    {
      key: 'soluciones', label: 'Soluciones', sub: 'lo que funciona', color: '#16a34a', dark: '#14532d', icon: Lightbulb,
      items: (helpers.solutions || []).slice(0, 5).map((s: any, i: number) => ({ id: `sol-${i}`, title: s.title, to: `/soluciones/${slugify(s.title)}` })),
    },
    {
      key: 'grafos', label: 'Grafos', sub: 'conocimiento conectado', color: '#7c3aed', dark: '#4c1d95', icon: Network,
      items: graphs.slice(0, 5).map((g: any) => ({
        id: g.id, title: g.title, sub: g.creator_name, cover: g.cover_image, videoId: g.cover_video_id,
        to: `/grafos/${g.slug}`, ia: g.is_ai_generated,
      })),
    },
    {
      key: 'mapas', label: 'Mapas', sub: 'el territorio vivo', color: '#0284c7', dark: '#075985', icon: MapIcon,
      items: [
        { id: 'mapa-humanidad', title: 'Mapa de Indicadores de la Humanidad', sub: 'el mapa principal', to: '/mapa' },
        ...maps.slice(0, 4).map((m: any) => ({ id: m.id, title: m.title, sub: m.creator_name, to: `/mapas/${m.slug}`, ia: m.is_ai_generated })),
      ],
    },
    {
      key: 'datos', label: 'Indicadores', sub: 'medir para mejorar', color: '#2563eb', dark: '#1e3a8a', icon: Gauge,
      items: (helpers.indicators || []).slice(0, 6).map((ind: any) => ({ id: ind.id, title: ind.name, to: `/indicadores/${ind.id}` })),
    },
    {
      key: 'voces', label: 'Voces', sub: 'la conversación', color: '#f59e0b', dark: '#78350f', icon: MessageSquare,
      items: pubs.slice(0, 4).map((p: any) => ({
        id: p.id, title: p.title || (p.body || '').slice(0, 70), sub: p.author_name,
        to: '/muro', ia: String(p.author_user_id || '').startsWith('U_IA'),
      })),
    },
  // OJO: depender de los ARRAYS concretos, no del objeto `helpers` — este
  // cambia de identidad en cada render y provocaba un bucle infinito de
  // reconstrucción del lienzo (Maximum update depth exceeded).
  ], [helpers.challenges, helpers.solutions, helpers.indicators, graphs, maps, pubs]);

  const humanas = pubs.filter(p => !String(p.author_user_id || '').startsWith('U_IA')).length;
  const ia = pubs.length - humanas;

  const onOpen = useCallback((to: string) => navigate(to), [navigate]);

  const focusSphere = useCallback((key: string) => {
    setActiveSphere(key);
    const ids = [`esf-${key}`];
    rf.current?.getNodes().forEach(n => { if (String(n.id).startsWith(`it-${key}-`)) ids.push(n.id); });
    rf.current?.fitView({ nodes: ids.map(id => ({ id })), duration: 900, padding: 0.18, maxZoom: 0.95 });
  }, []);

  const resetView = useCallback(() => {
    setActiveSphere(null);
    rf.current?.fitView({ nodes: [{ id: '__nucleo__' }, ...dominios.map(d => ({ id: `esf-${d.key}` }))], duration: 900, padding: 0.16 });
  }, [dominios]);

  // Construcción del cosmos.
  useEffect(() => {
    const built: Node[] = [];
    const builtEdges: Edge[] = [];

    built.push({
      id: '__anillos__', type: 'anillos',
      position: { x: -(ORBIT_2 + 250), y: -(ORBIT_2 + 250) },
      draggable: false, selectable: false, zIndex: -10,
      data: {},
    });
    built.push({
      id: '__nucleo__', type: 'nucleo',
      position: { x: -CORE_R / 2, y: -CORE_R / 2 },
      draggable: false, selectable: false, zIndex: 20,
      data: { humanas, ia, onReset: resetView },
    });

    dominios.forEach((dom, i) => {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / dominios.length;
      built.push({
        id: `esf-${dom.key}`, type: 'esfera',
        position: { x: Math.cos(ang) * ORBIT_1 - SPHERE_R / 2, y: Math.sin(ang) * ORBIT_1 - SPHERE_R / 2 },
        draggable: false, selectable: false, zIndex: 10,
        data: { dominio: dom, delay: `${i * 0.7}s`, onFocus: focusSphere },
      });
      builtEdges.push({
        id: `en-${dom.key}`, source: '__nucleo__', target: `esf-${dom.key}`, type: 'straight',
        style: { stroke: dom.color, strokeWidth: 1.5, strokeDasharray: '4 8', opacity: 0.4 },
      });

      // Los contenidos, en abanico hacia fuera de su esfera.
      const spread = Math.PI / 4.4;
      const n = dom.items.length;
      dom.items.forEach((it, j) => {
        const a = n > 1 ? ang - spread / 2 + (spread * j) / (n - 1) : ang;
        const r = ORBIT_2 + (j % 2 === 0 ? -70 : 90);
        built.push({
          id: `it-${dom.key}-${it.id}`, type: 'orbitaItem',
          position: { x: Math.cos(a) * r - 130, y: Math.sin(a) * r - 70 },
          draggable: false, selectable: false, zIndex: 5,
          data: { dominio: dom, item: it, onOpen },
        });
        builtEdges.push({
          id: `ei-${dom.key}-${it.id}`, source: `esf-${dom.key}`, target: `it-${dom.key}-${it.id}`, type: 'straight',
          style: { stroke: dom.color, strokeWidth: 1, opacity: 0.28 },
        });
      });
    });

    setNodes(built);
    setEdges(builtEdges);
  }, [dominios, humanas, ia, focusSphere, resetView, onOpen, setNodes, setEdges]);

  // Encuadre inicial: la constelación completa (núcleo + esferas). En frío
  // la instancia/medidas pueden tardar — se reintenta hasta que el fitView
  // se aplique de verdad.
  const didFitRef = useRef(false);
  useEffect(() => {
    if (didFitRef.current || nodes.length < 3) return;
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (tries > 25) { clearInterval(t); return; }
      rf.current?.fitView({ nodes: [{ id: '__nucleo__' }, ...dominios.map(d => ({ id: `esf-${d.key}` }))], padding: 0.16 })
        .then(ok => { if (ok) { didFitRef.current = true; clearInterval(t); } });
    }, 120);
    return () => clearInterval(t);
  }, [nodes, dominios]);

  const activo = dominios.find(d => d.key === activeSphere);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: '#020617' }}>
      {/* cielo estrellado + nebulosas */}
      <style>{`
        .uni-breathe { animation: uniBreathe 6s ease-in-out infinite; }
        @keyframes uniBreathe { 0%,100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.07); opacity: 1 } }
        .uni-float { animation: uniFloat 9s ease-in-out infinite; }
        @keyframes uniFloat { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-14px) } }
        .uni-stars {
          background-image:
            radial-gradient(1.5px 1.5px at 22% 31%, rgba(255,255,255,.7) 50%, transparent 51%),
            radial-gradient(1px 1px at 68% 12%, rgba(255,255,255,.5) 50%, transparent 51%),
            radial-gradient(1px 1px at 84% 64%, rgba(255,255,255,.6) 50%, transparent 51%),
            radial-gradient(1.5px 1.5px at 41% 82%, rgba(255,255,255,.45) 50%, transparent 51%),
            radial-gradient(1px 1px at 8% 71%, rgba(255,255,255,.5) 50%, transparent 51%),
            radial-gradient(1px 1px at 55% 48%, rgba(255,255,255,.35) 50%, transparent 51%);
          background-size: 520px 520px;
        }
      `}</style>
      <div className="absolute inset-0 uni-stars opacity-70" />
      <div className="absolute -top-1/4 -left-1/4 w-[70%] h-[70%] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 65%)' }} />
      <div className="absolute -bottom-1/4 -right-1/4 w-[70%] h-[70%] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 65%)' }} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={inst => { rf.current = inst; }}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        elevateNodesOnSelect={false}
        minZoom={0.08}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'transparent' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={40} size={1} color="rgba(148,163,184,0.10)" />
      </ReactFlow>

      <UniversoSwitcher current={1} dark />

      {/* identidad + esfera activa */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <div className="bg-slate-950/80 backdrop-blur border border-slate-700/70 rounded-full pl-3 pr-3.5 py-1.5 inline-flex items-center gap-1.5">
          <Orbit className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black text-white">Universo</span>
          <span className="text-[9px] text-slate-400 hidden sm:inline">· la wiki de la humanidad, de un vistazo</span>
        </div>
        {activo && (
          <div className="bg-slate-950/80 backdrop-blur rounded-full pl-3 pr-1.5 py-1 inline-flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300"
            style={{ border: `1.5px solid ${activo.color}` }}>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activo.color }} />
            <span className="text-xs font-black text-white">{activo.label}</span>
            <button onClick={resetView} title="Volver al universo"
              className="p-1.5 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <p className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 pointer-events-none">
        rueda para sumergirte · clic en una esfera para viajar
      </p>
    </div>
  );
}
