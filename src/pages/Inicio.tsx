import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe2, Map as MapIcon, Database, ArrowUpRight } from 'lucide-react';
import { ANCLA_IA_EN_LINEA } from '../components/ai/AIAssistant';

// ============================================================================
// INICIO (2026-08-06, petición del usuario)
// ============================================================================
// La puerta de entrada: tres VENTANAS VIVAS, una por cada forma de relacionarse
// con el conocimiento — el dato en crudo (Base de Datos), el conocimiento
// conectado (Red de Datos) y el conocimiento situado (Geolocalización).
// No son ilustraciones: dentro de cada tarjeta se carga la página de verdad
// (`?embed=1`, sin barra ni asistente) encogida para caber. Al pasar el ratón,
// la ventana se amplía — se ve lo que hay dentro antes de entrar.

interface Stats { grafos: number; ventanas: number; territorios: number; indicadores: number; tablas: number }

/** Tamaño lógico del «navegador» que vive dentro de cada ventana: la página
 *  se dibuja a esta anchura de escritorio y luego se encoge para caber. */
const VENTANA_W = 1440;

interface Vista {
  to: string;
  src: string;
  label: string;
  claim: string;
  color: string;
  icon: typeof Database;
  cifra: (s: Stats) => string;
}

const VISTAS: Vista[] = [
  {
    to: '/base-de-datos', src: '/base-de-datos?embed=1',
    label: 'Base de Datos', claim: 'El dato en crudo',
    color: '#16a34a', icon: Database,
    cifra: s => `${s.tablas} tablas`,
  },
  {
    to: '/red', src: '/red?embed=1',
    label: 'Red de Datos', claim: 'El conocimiento conectado',
    color: '#7c3aed', icon: Globe2,
    cifra: s => `${s.grafos} grafos · ${s.ventanas} publicaciones`,
  },
  {
    to: '/mapa', src: '/mapa?embed=1',
    label: 'Geolocalización de Datos', claim: 'El conocimiento en el territorio',
    color: '#0284c7', icon: MapIcon,
    cifra: s => `${s.territorios} territorios · ${s.indicadores} indicadores`,
  },
];

/**
 * Ventana viva: la página real, encogida para caber en la tarjeta.
 * `retraso` escalona el arranque para que las tres no compitan por la red.
 */
function VentanaViva({ src, retraso, hover }: { src: string; retraso: number; hover: boolean }) {
  const marco = useRef<HTMLDivElement>(null);
  const [caja, setCaja] = useState({ escala: 0.28, alto: 1024 });
  const [montada, setMontada] = useState(retraso === 0);

  useEffect(() => {
    if (montada) return;
    const t = setTimeout(() => setMontada(true), retraso);
    return () => clearTimeout(t);
  }, [retraso, montada]);

  // La escala se mide sobre el hueco real, así la ventana encaja exacta con
  // cualquier ancho de pantalla y el alto lógico se deduce de ella.
  useEffect(() => {
    const el = marco.current;
    if (!el) return;
    const medir = () => {
      const escala = el.clientWidth / VENTANA_W;
      if (escala > 0) setCaja({ escala, alto: Math.round(el.clientHeight / escala) });
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={marco}
      className="relative overflow-hidden bg-slate-50"
      style={{ height: 'clamp(230px, 40vh, 460px)' }}
    >
      {montada ? (
        <iframe
          src={src}
          title=""
          tabIndex={-1}
          aria-hidden="true"
          scrolling="no"
          className="absolute top-0 left-1/2 border-0 pointer-events-none transition-transform duration-500 ease-out"
          style={{
            width: VENTANA_W,
            height: caja.alto,
            transformOrigin: 'top center',
            transform: `translateX(-50%) scale(${caja.escala * (hover ? 1.16 : 1)})`,
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-400 animate-spin" />
        </div>
      )}
      {/* Velo suave hacia el pie de la tarjeta, para que el texto respire */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
    </div>
  );
}

export default function Inicio() {
  const [stats, setStats] = useState<Stats>({ grafos: 0, ventanas: 0, territorios: 0, indicadores: 0, tablas: 0 });
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/graphs', { credentials: 'include' }).then(r => r.json()).then(j => {
      if (!Array.isArray(j)) return;
      setStats(s => ({ ...s, grafos: j.length, ventanas: j.reduce((n: number, g: any) => n + (g.window_count || 0), 0) }));
    }).catch(() => {});
    fetch('/api/data/territories').then(r => r.json())
      .then(j => setStats(s => ({ ...s, territorios: Array.isArray(j) ? j.length : 0 }))).catch(() => {});
    fetch('/api/data/indicators').then(r => r.json())
      .then(j => setStats(s => ({ ...s, indicadores: Array.isArray(j) ? j.length : 0 }))).catch(() => {});
    fetch('/api/db/tables', { credentials: 'include' }).then(r => r.json())
      .then(j => setStats(s => ({ ...s, tablas: Array.isArray(j) ? j.length : 0 }))).catch(() => {});
  }, []);

  return (
    <div className="h-full">
      {/* el ancho ya lo pone el Layout (max-w-7xl) */}
      <div className="w-full">
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
          {VISTAS.map((v, i) => {
            const Icon = v.icon;
            const activa = hover === v.to;
            return (
              <div
                key={v.to}
                onMouseEnter={() => setHover(v.to)}
                onMouseLeave={() => setHover(h => (h === v.to ? null : h))}
                className="group relative rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.045] hover:z-20"
                style={{
                  borderTopWidth: 3,
                  borderTopColor: v.color,
                  boxShadow: activa ? `0 24px 50px -18px ${v.color}66` : undefined,
                }}
              >
                <VentanaViva src={v.src} retraso={i * 700} hover={activa} />

                <div className="px-5 py-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5" style={{ color: v.color }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: v.color }}>{v.claim}</span>
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xl font-black text-slate-900 leading-tight truncate">{v.label}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-1">{v.cifra(stats)}</p>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 text-[11px] font-black shrink-0 transition-all group-hover:gap-2"
                      style={{ color: v.color }}
                    >
                      Entrar <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Toda la tarjeta es el enlace: así la ventana de dentro no
                    captura el clic y el destino es uno solo. */}
                <Link to={v.to} className="absolute inset-0 z-10" aria-label={v.label} />
              </div>
            );
          })}
        </div>

        {/* El buscador/chat, justo debajo de las tres ventanas. El asistente
            vive en el Layout y se pinta aquí con un portal, para no perder la
            conversación al cambiar de página. */}
        <div id={ANCLA_IA_EN_LINEA} className="mt-6" />
      </div>
    </div>
  );
}
