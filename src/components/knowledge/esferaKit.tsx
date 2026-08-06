import {
  Handle, Position, useStore, BaseEdge, getStraightPath,
  type NodeProps, type EdgeProps,
} from '@xyflow/react';
import {
  Network, Flame, PlayCircle, Sparkles, Eye, AppWindow, ZoomIn, Sprout, Layers,
  X, ExternalLink, User as UserIcon,
} from 'lucide-react';
import WindowContent from './WindowContent';
import { cn } from '../../utils/cn';
import { relStyle } from '../../utils/relationStyle';

// ============================================================================
// ESFERA KIT — el lenguaje visual de la Red de Datos, compartido
// ============================================================================
// Nació en la página «Red de Datos» (la pizarra infinita) y vive aquí para que
// el explorador del mapa use LOS MISMOS componentes, no una imitación: si un
// día cambia el aspecto de una esfera o el flujo de electricidad, cambia en
// los dos sitios a la vez.
//
// El vocabulario:
//   núcleo      la esfera grande del centro (de qué va esta pizarra)
//   esfera      una entidad: un grafo, un reto, una solución, un objetivo
//   ventana     una publicación desplegada (tarjeta)
//   relación    el círculo con la CATEGORÍA de conocimiento entre ambas
//   envoltura   la membrana de cristal que lo envuelve todo
//   flujo       la electricidad del núcleo a cada esfera, según su relevancia
//   fade        la arista que aparece y desaparece con las publicaciones

export const SPHERE = 340;          // diámetro de una esfera principal
export const SPHERE_SM = 168;       // esfera secundaria (solución, hijo)
export const CENTER_SPHERE = 380;   // diámetro del núcleo
export const REL_CIRCLE = 86;       // círculo de la categoría de conocimiento
export const WIN_SCALE = 0.3;       // posiciones del grafo original, encogidas
export const REVEAL = 0.46;         // zoom a partir del cual emergen las publicaciones

/** Etiqueta compensada por zoom: se lee igual de lejos que de cerca
 *  (como los nombres de ciudad en un mapa). */
export const labelScale = (zoom: number) => Math.min(3.4, Math.max(1, 0.85 / Math.max(zoom, 0.05)));

export const KIND_TINT: Record<string, string> = {
  publicacion: '#059669', imagen: '#7c3aed', video: '#dc2626', wikipedia: '#475569',
  enlace: '#0284c7', mapa: '#0284c7', grafica: '#eab308', ficha: '#64748b',
  cronologia: '#7c3aed', autores: '#4f46e5', documento: '#e11d48', grafo: '#059669',
  producto: '#f59e0b', soluciones: '#16a34a', texto: '#64748b',
};

/** CSS que necesita cualquier lienzo que use el kit. */
export const ESFERA_CSS = `
  @keyframes esferaFlujo { to { stroke-dashoffset: -26; } }
  /* Aquí se hace clic en las ESFERAS y en las publicaciones, nunca en una
     línea. React Flow da a cada arista un trazo de clic ancho que, al
     converger muchas en cada esfera, se comía el clic. */
  .react-flow__edge, .react-flow__edge-path, .react-flow__edge-interaction { pointer-events: none !important; }
`;

export function Handles() {
  const style = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0, pointerEvents: 'none' as const };
  return (
    <>
      <Handle type="source" position={Position.Top} style={style} />
      <Handle type="target" position={Position.Top} style={style} />
    </>
  );
}

export const useZoom = () => useStore(s => s.transform[2]);

/** Lo que necesita saber una esfera para dibujarse, venga de donde venga
 *  (un grafo de conocimiento, un reto del mapa, una solución, un objetivo). */
export interface EsferaData {
  title: string;                 // etiqueta grande, bajo la esfera
  short?: string | null;         // texto del chip, dentro
  cover?: string | null;         // portada recortada en círculo
  videoId?: string | null;
  accent: string;                // color de la entidad
  kind?: 'reto' | 'grafo' | 'solucion' | 'objetivo';
  size?: number;                 // diámetro (por defecto SPHERE)
  windows?: number;
  views?: number;
  ai?: boolean;
  author?: string | null;
  subtitle?: string | null;      // segunda línea bajo el título
  /** El título solo se dibuja de cerca. Para anillos con muchas esferas
   *  pequeñas: de lejos se ven los puntos, no una maraña de texto. */
  labelNear?: boolean;
}

const KIND_ICON = { reto: Flame, grafo: Network, solucion: Sprout, objetivo: Layers } as const;

// ----------------------------------------------------------------------------
// Núcleo: de qué va esta pizarra.
// ----------------------------------------------------------------------------
export function NucleoNode({ data }: NodeProps<any>) {
  const d = data as any;
  const zoom = useZoom();
  const size = d.size ?? CENTER_SPHERE;
  return (
    <div
      className="relative flex flex-col items-center justify-center text-center cursor-pointer select-none"
      style={{ width: size, height: size }}
      title={d.title || 'Ver toda la pizarra'}
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
        {d.score != null && (
          <div className="mt-2.5 px-2">
            <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-white/90" style={{ width: `${d.score}%` }} />
            </div>
            <p className="text-[13px] font-black text-white mt-1">{d.score}%</p>
          </div>
        )}
        <p className={cn('text-[10px] text-white/60 mt-2.5 leading-snug transition-opacity duration-300', zoom >= REVEAL && 'opacity-0')}>
          {d.hint || <>acércate a una esfera —<br />el conocimiento se despliega</>}
        </p>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Esfera: previsualización redonda. Al acercarse, se abre.
// ----------------------------------------------------------------------------
export function EsferaNode({ data }: NodeProps<any>) {
  const d = data as any;
  const e: EsferaData = d.esfera;
  const zoom = useZoom();
  const open = d.forceOpen || zoom >= REVEAL;
  const ls = labelScale(zoom);
  const size = e.size ?? SPHERE;
  const cover = e.cover || (e.videoId ? `https://img.youtube.com/vi/${e.videoId}/hqdefault.jpg` : null);
  const Icon = KIND_ICON[e.kind || 'grafo'] || Network;
  const hasStats = e.windows != null || e.views != null || e.ai || e.author;
  return (
    <div
      className="group relative flex flex-col items-center justify-center text-center cursor-pointer select-none transition-transform duration-300 ease-out hover:scale-105"
      style={{ width: size, height: size }}
      title={open ? e.title : `Acercarse a «${e.title}» — clic para hacer zoom`}
    >
      <Handles />
      {/* la esfera: portada recortada en círculo */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          border: `4px solid ${e.accent}`,
          boxShadow: `0 0 45px ${e.accent}44, 0 18px 30px -10px rgb(0 0 0 / 0.35)`,
          background: cover ? '#0f172a' : `radial-gradient(circle at 32% 28%, ${e.accent} 0%, #0f172a 70%)`,
        }}
      >
        {cover && (
          <>
            <img src={cover} alt="" loading="lazy"
              className="w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-110 transition-all duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/20" />
          </>
        )}
        {!cover && !e.videoId && <Icon className="absolute inset-0 m-auto w-10 h-10 text-white/25" />}
        {!cover && e.videoId && <PlayCircle className="absolute inset-0 m-auto w-10 h-10 text-white/40" />}
      </div>

      {/* dentro de la esfera solo la identidad visual: al alejarte, el
          título sería ilegible — vive fuera, con escala compensada. */}
      {e.short && (
        <div className="relative z-10">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] px-2.5 py-1 rounded-full max-w-[240px] text-white"
            style={{ transform: `scale(${ls})`, backgroundColor: e.accent }}
          >
            <Icon className="w-3 h-3 shrink-0" />
            <span className="truncate">{e.short}</span>
          </span>
        </div>
      )}

      {/* etiqueta bajo la esfera: legible a cualquier distancia */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none transition-opacity duration-300"
        style={{
          top: size + 14, width: size * 1.5,
          transform: `translateX(-50%) scale(${ls})`, transformOrigin: 'top center',
          opacity: e.labelNear && !open ? 0 : 1,
        }}
      >
        <p className="text-[15px] font-black text-slate-900 leading-tight line-clamp-2">{e.title}</p>
        {e.subtitle && <p className="text-[11px] font-bold text-slate-500 leading-tight mt-0.5">{e.subtitle}</p>}
        {hasStats && (
          <div className="flex items-center justify-center gap-2.5 mt-1 text-[10px] text-slate-400">
            {e.windows != null && <span className="inline-flex items-center gap-0.5"><AppWindow className="w-3 h-3" />{e.windows}</span>}
            {e.views != null && <span className="inline-flex items-center gap-0.5"><Eye className="w-3 h-3" />{e.views}</span>}
            {e.ai && <Sparkles className="w-3 h-3 text-amber-500" />}
            {e.author && <span className="truncate max-w-[130px]">{e.author}</span>}
          </div>
        )}
        <span className={cn('inline-flex items-center gap-1 mt-1 text-[9px] font-bold uppercase tracking-[0.2em] transition-opacity',
          open || !d.desplegable ? 'opacity-0' : 'text-emerald-600 opacity-0 group-hover:opacity-100')}>
          <ZoomIn className="w-3 h-3" /> desplegar
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Publicación desplegada: aparece al acercarse, se colapsa al alejarse.
// ----------------------------------------------------------------------------
export function VentanaNode({ data }: NodeProps<any>) {
  const d = data as any;
  const w = d.win;
  const zoom = useZoom();
  // Enfocar una esfera la despliega SIEMPRE: al abrirse, su constelación
  // ocupa mucho y el zoom de encuadre puede caer bajo el umbral.
  const open = d.forceOpen || zoom >= REVEAL;
  const tint = KIND_TINT[w.kind] || '#64748b';

  // SEMI-DESPLIEGUE: colapsada, la publicación no desaparece — se convierte
  // en un satélite en miniatura pegado a su esfera, para que se VEA que ahí
  // hay información agregada. Con hover sobre la esfera, los satélites se
  // abren un poco más (invitan al clic).
  const dist = Math.hypot(d.dx, d.dy) || 1;
  let ang = Math.atan2(d.dy, d.dx);
  const lo = Math.PI * 0.32, hi = Math.PI * 0.68; // arco del título, abajo
  if (ang > lo && ang < hi) ang = ang < Math.PI / 2 ? lo : hi;
  const comp = Math.min(2.4, Math.max(1, 0.42 / Math.max(zoom, 0.05)));
  const miniScale = (d.hoverPreview ? 0.34 : 0.16) * comp;
  const ringR = (d.ring ?? (d.hoverPreview ? 262 : 208)) + (comp - 1) * 55;
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
export function EnvolturaNode({ data }: NodeProps<any>) {
  const d = data as any;
  return (
    <div
      className="pointer-events-none rounded-[50%]"
      style={{
        width: (d?.rx ?? 1200) * 2, height: (d?.ry ?? 800) * 2,
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
// Círculo de relación: la CATEGORÍA de conocimiento que une la esfera con
// cada publicación (contexto, causa, dato, fuente, apoya, contradice, matiza).
// ----------------------------------------------------------------------------
export function RelacionNode({ data }: NodeProps<any>) {
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
export function FadeEdge({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, data }: EdgeProps) {
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

/** La ELECTRICIDAD del conocimiento: la línea del núcleo a cada esfera. Su
 *  GROSOR y la velocidad/densidad del flujo de partículas dependen de la
 *  intensidad y relevancia actual — se ve de un vistazo qué late más. */
export function FlujoEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
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

export const esferaNodeTypes = {
  nucleo: NucleoNode, esfera: EsferaNode, ventana: VentanaNode,
  envoltura: EnvolturaNode, relacion: RelacionNode,
};
export const esferaEdgeTypes = { fade: FadeEdge, flujo: FlujoEdge };

/**
 * Constelación de publicaciones alrededor de una esfera: conserva la
 * disposición original del grafo, encogida, y aplica el «imán» anti-solape —
 * las tarjetas se repelen entre sí y ninguna puede taparle la cara a su
 * esfera. Devuelve el desplazamiento de cada tarjeta respecto al centro.
 */
export function constelacion(wins: any[], innerRadius: number, cw = 256, ch = 190, pad = 26) {
  const n = wins.length;
  const boxes = wins.map((w: any, j: number) => {
    const hasPos = Number.isFinite(w.x) && Number.isFinite(w.y) && (w.x !== 0 || w.y !== 0);
    const wa = -Math.PI / 2 + (2 * Math.PI * j) / Math.max(n, 1);
    return {
      x: (hasPos ? w.x * WIN_SCALE : Math.cos(wa) * 620) - cw / 2,
      y: (hasPos ? w.y * WIN_SCALE : Math.sin(wa) * 480) - ch / 2,
    };
  });
  for (let it = 0; it < 120; it++) {
    let moved = false;
    for (let a = 0; a < boxes.length; a++) {
      for (let b = a + 1; b < boxes.length; b++) {
        const A = boxes[a], B = boxes[b];
        const dx = A.x - B.x, dy = A.y - B.y;
        const ox = cw + pad - Math.abs(dx), oy = ch + pad - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          moved = true;
          if (ox < oy) { const s = ((dx || (a - b)) >= 0 ? 1 : -1) * ox / 2; A.x += s; B.x -= s; }
          else { const s = ((dy || (a - b)) >= 0 ? 1 : -1) * oy / 2; A.y += s; B.y -= s; }
        }
      }
    }
    for (const A of boxes) {
      const nx = Math.max(A.x, Math.min(0, A.x + cw));
      const ny = Math.max(A.y, Math.min(0, A.y + ch));
      const dist = Math.hypot(nx, ny);
      if (dist < innerRadius) {
        moved = true;
        const ccx = A.x + cw / 2, ccy = A.y + ch / 2;
        const cd = Math.hypot(ccx, ccy) || 1;
        const push = innerRadius - dist + 10;
        A.x += (ccx / cd) * push;
        A.y += (ccy / cd) * push;
      }
    }
    if (!moved) break;
  }
  return { boxes, cw, ch };
}

/** Índice ventana → arista del centro, con su categoría de conocimiento. */
export function relacionesPorVentana(edges: any[] = []) {
  const out: Record<string, any> = {};
  for (const e of edges) if (!e.from_window_id && e.to_window_id) out[e.to_window_id] = e;
  return out;
}

/**
 * Pop-up de una publicación, sobre el mismo lienzo: no se cambia de página
 * para leer algo. Lo usan la Red de Datos y el explorador del mapa.
 */
export function VentanaPopup({ win, contexto, onOpenGraph, onClose }: {
  win: any;
  contexto?: string | null;      // «en «Incendios en España»»
  onOpenGraph?: () => void;
  onClose: () => void;
}) {
  const tint = KIND_TINT[win.kind] || '#64748b';
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-3 flex items-center justify-between gap-3">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded"
            style={{ color: tint, backgroundColor: `${tint}18` }}>
            {win.kind}
          </span>
          <div className="flex items-center gap-1">
            {onOpenGraph && (
              <button onClick={onOpenGraph} title="Abrir el grafo completo"
                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition-colors">
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="px-6 py-5">
          <h2 className="text-xl font-black text-slate-900 leading-tight mb-1">{win.title}</h2>
          {contexto && (
            <p className="text-[11px] text-slate-400 mb-4 inline-flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> en «{contexto}»
            </p>
          )}
          <WindowContent kind={win.kind} config={win.config} variant="full" />
        </div>
      </div>
    </div>
  );
}
