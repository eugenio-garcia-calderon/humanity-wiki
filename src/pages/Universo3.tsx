import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Lightbulb, Network, Map as MapIcon, Gauge, MessageSquare, Sparkles } from 'lucide-react';
import { useHelpers } from '../contexts/DataContext';
import { challengeLinkTo } from '../utils/entityLinks';
import { slugify } from '../utils/slugify';
import UniversoSwitcher from '../components/universo/UniversoSwitcher';

// ============================================================================
// UNIVERSO III — «La Esfera» (2026-08-06)
// ============================================================================
// El conocimiento como una esfera que gira lentamente a tu alrededor:
// un anillo TRIDIMENSIONAL (CSS puro: perspective + preserve-3d) donde
// todo el contenido real de la plataforma — grafos, mapas, retos,
// soluciones, indicadores y voces — orbita en tarjetas de cristal.
// Pasa el ratón para detener el mundo; haz clic para entrar.
// Minimalismo inmersivo: un solo elemento, un solo movimiento, cero ruido.

interface Carta {
  id: string;
  kind: string;
  color: string;
  icon: any;
  title: string;
  sub?: string | null;
  cover?: string | null;
  to: string;
  ia?: boolean;
}

const RING_R = 620; // translateZ del anillo

export default function Universo3() {
  const helpers = useHelpers();
  const navigate = useNavigate();
  const [graphs, setGraphs] = useState<any[]>([]);
  const [maps, setMaps] = useState<any[]>([]);
  const [pubs, setPubs] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/graphs', { credentials: 'include' }).then(r => r.json()).then(j => setGraphs(Array.isArray(j) ? j : [])).catch(() => {});
    fetch('/api/maps', { credentials: 'include' }).then(r => r.json()).then(j => setMaps(Array.isArray(j) ? j : [])).catch(() => {});
    fetch('/api/feed?limit=4', { credentials: 'include' }).then(r => r.json()).then(j => setPubs(Array.isArray(j) ? j : [])).catch(() => {});
  }, []);

  // Una sola órbita con TODO el conocimiento, intercalado por tipo para que
  // el color semántico vaya alternando mientras gira.
  const cartas: Carta[] = useMemo(() => {
    const g: Carta[] = graphs.slice(0, 3).map((x: any) => ({
      id: `g-${x.id}`, kind: 'Grafo', color: '#7c3aed', icon: Network, title: x.title, sub: x.creator_name,
      cover: x.cover_image || (x.cover_video_id ? `https://img.youtube.com/vi/${x.cover_video_id}/hqdefault.jpg` : null),
      to: `/grafos/${x.slug}`, ia: x.is_ai_generated,
    }));
    const r: Carta[] = (helpers.challenges || []).slice(0, 3).map((c: any) => ({
      id: `r-${c.id}`, kind: 'Reto', color: '#dc2626', icon: Flame, title: c.title, to: challengeLinkTo(c),
    }));
    const s: Carta[] = (helpers.solutions || []).slice(0, 3).map((x: any, i: number) => ({
      id: `s-${i}`, kind: 'Solución', color: '#16a34a', icon: Lightbulb, title: x.title, to: `/soluciones/${slugify(x.title)}`,
    }));
    const m: Carta[] = [
      { id: 'm-main', kind: 'Mapa', color: '#0284c7', icon: MapIcon, title: 'Mapa de Indicadores de la Humanidad', to: '/mapa' },
      ...maps.slice(0, 1).map((x: any) => ({
        id: `m-${x.id}`, kind: 'Mapa', color: '#0284c7', icon: MapIcon, title: x.title, sub: x.creator_name, to: `/mapas/${x.slug}`,
      })),
    ];
    const d: Carta[] = (helpers.indicators || []).slice(0, 2).map((x: any) => ({
      id: `d-${x.id}`, kind: 'Indicador', color: '#2563eb', icon: Gauge, title: x.name, to: `/indicadores/${x.id}`,
    }));
    const v: Carta[] = pubs.slice(0, 2).map((p: any) => ({
      id: `v-${p.id}`, kind: 'Voz', color: '#f59e0b', icon: MessageSquare,
      title: p.title || (p.body || '').slice(0, 60), sub: p.author_name, to: '/muro',
      ia: String(p.author_user_id || '').startsWith('U_IA'),
    }));
    // Intercalado round-robin de los seis tipos.
    const pools = [g, r, s, m, d, v];
    const out: Carta[] = [];
    for (let i = 0; i < 4; i++) for (const pool of pools) if (pool[i]) out.push(pool[i]);
    return out.slice(0, 14);
  }, [helpers.challenges, helpers.solutions, helpers.indicators, graphs, maps, pubs]);

  const N = Math.max(cartas.length, 1);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 42%, #101726 0%, #070b14 55%, #04060c 100%)' }}>
      <style>{`
        @keyframes u3spin { from { transform: rotateX(-7deg) rotateY(0deg); } to { transform: rotateX(-7deg) rotateY(-360deg); } }
        .u3-scene { perspective: 1500px; }
        .u3-ring { transform-style: preserve-3d; animation: u3spin 80s linear infinite; }
        .u3-scene:hover .u3-ring { animation-play-state: paused; }
        .u3-card { backface-visibility: hidden; }
        @keyframes u3glow { 0%,100% { opacity: .55; transform: scale(1); } 50% { opacity: .85; transform: scale(1.06); } }
        .u3-core { animation: u3glow 7s ease-in-out infinite; }
      `}</style>

      <UniversoSwitcher current={3} dark />

      {/* título — arriba, sereno */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none">
        <p className="text-[9px] font-bold uppercase tracking-[0.5em] text-slate-500">Universo III · La esfera</p>
        <p className="text-2xl font-black text-white tracking-tight mt-2">El mundo gira contigo dentro</p>
        <p className="text-[10px] text-slate-500 mt-1.5">detén el giro con el ratón · clic para entrar</p>
      </div>

      {/* resplandor central */}
      <div className="u3-core absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.28) 0%, rgba(37,99,235,0.14) 50%, transparent 72%)' }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[5] text-center pointer-events-none">
        <div className="relative w-12 h-7 mx-auto mb-1.5">
          <span className="absolute left-0 top-0 w-7 h-7 rounded-full border-2 border-amber-400/80" />
          <span className="absolute right-0 top-0 w-7 h-7 rounded-full border-2 border-emerald-400/80" />
        </div>
        <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-slate-400">humano × IA</p>
      </div>

      {/* el anillo 3D */}
      <div className="u3-scene absolute inset-0 flex items-center justify-center">
        <div className="u3-ring relative" style={{ width: 0, height: 0 }}>
          {cartas.map((c, i) => {
            const Icon = c.icon;
            const ang = (360 * i) / N;
            return (
              <div
                key={c.id}
                className="u3-card absolute"
                style={{
                  width: 230,
                  marginLeft: -115,
                  marginTop: c.cover ? -130 : -80,
                  transform: `rotateY(${ang}deg) translateZ(${RING_R}px)`,
                }}
              >
                <div
                  onClick={() => navigate(c.to)}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-110"
                  style={{
                    background: 'rgba(15,23,42,0.72)',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${c.color}66`,
                    boxShadow: `0 0 35px ${c.color}26, 0 20px 40px rgba(0,0,0,0.4)`,
                  }}
                  title={c.title}
                >
                  {c.cover && (
                    <div className="relative h-28 overflow-hidden">
                      <img src={c.cover} alt="" loading="lazy" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent" />
                    </div>
                  )}
                  <div className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3 h-3" style={{ color: c.color }} />
                      <span className="text-[8px] font-black uppercase tracking-[0.25em]" style={{ color: c.color }}>{c.kind}</span>
                      {c.ia && <Sparkles className="w-2.5 h-2.5 text-emerald-300 ml-auto" />}
                    </div>
                    <p className="text-[13px] font-black text-white leading-tight line-clamp-2">{c.title}</p>
                    {c.sub && <p className="text-[9px] text-slate-400 mt-1 truncate">{c.sub}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* suelo: reflejo suave */}
      <div className="absolute left-1/2 bottom-16 -translate-x-1/2 w-[70%] h-24 rounded-[100%] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(37,99,235,0.10) 0%, transparent 70%)' }} />

      {/* línea de datos vivos */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-5 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 pointer-events-none">
        <span><span className="text-violet-400">{graphs.length}</span> grafos</span>
        <span><span className="text-red-400">{(helpers.challenges || []).length}</span> retos</span>
        <span><span className="text-green-400">{(helpers.solutions || []).length}</span> soluciones</span>
        <span><span className="text-sky-400">{maps.length + 1}</span> mapas</span>
      </div>
    </div>
  );
}
