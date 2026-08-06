import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe2, Map as MapIcon, Database, ArrowUpRight, Sparkles } from 'lucide-react';

// ============================================================================
// INICIO (2026-08-06, petición del usuario)
// ============================================================================
// La puerta de entrada: tres ventanas, una por cada forma de relacionarse con
// el conocimiento — la Red de Datos (conexiones), la Geolocalización (el
// territorio) y la Base de Datos (el dato crudo). Cada ventana lleva una
// previsualización viva de lo que hay dentro, con cifras reales.

interface Vista {
  to: string;
  label: string;
  claim: string;
  desc: string;
  color: string;
  icon: any;
  preview: (s: Stats) => React.ReactNode;
  cifra: (s: Stats) => string;
}

interface Stats { grafos: number; ventanas: number; territorios: number; indicadores: number; tablas: number }

/** Miniatura de la Red: esferas conectadas a un núcleo. */
function PreviewRed() {
  return (
    <svg viewBox="0 0 200 110" className="w-full h-full">
      <line x1="100" y1="55" x2="45" y2="30" stroke="#dc2626" strokeWidth="2" opacity=".5" />
      <line x1="100" y1="55" x2="158" y2="34" stroke="#dc2626" strokeWidth="3" opacity=".6" />
      <line x1="100" y1="55" x2="52" y2="86" stroke="#059669" strokeWidth="1.5" opacity=".45" />
      <line x1="100" y1="55" x2="152" y2="86" stroke="#dc2626" strokeWidth="2" opacity=".5" />
      <circle cx="100" cy="55" r="19" fill="#0f172a" />
      <circle cx="45" cy="30" r="11" fill="#dc2626" opacity=".9" />
      <circle cx="158" cy="34" r="14" fill="#dc2626" />
      <circle cx="52" cy="86" r="9" fill="#059669" opacity=".85" />
      <circle cx="152" cy="86" r="10" fill="#dc2626" opacity=".8" />
      {[[45, 30], [158, 34], [152, 86]].map(([x, y], i) => (
        <g key={i} opacity=".5">
          <rect x={x + 14} y={y - 9} width="16" height="11" rx="2" fill="#fff" stroke="#cbd5e1" />
          <rect x={x - 30} y={y + 4} width="16" height="11" rx="2" fill="#fff" stroke="#cbd5e1" />
        </g>
      ))}
    </svg>
  );
}

/** Miniatura del Mapa: una silueta con territorios coloreados. */
function PreviewMapa() {
  return (
    <svg viewBox="0 0 200 110" className="w-full h-full">
      <rect width="200" height="110" fill="#eff6ff" />
      <path d="M30 70 L48 34 L86 24 L120 36 L150 30 L172 52 L160 84 L120 92 L74 88 Z" fill="#bfdbfe" stroke="#60a5fa" strokeWidth="1.5" />
      <path d="M48 34 L86 24 L92 52 L60 60 Z" fill="#34d399" opacity=".85" />
      <path d="M92 52 L120 36 L150 30 L146 62 Z" fill="#fbbf24" opacity=".85" />
      <path d="M60 60 L92 52 L146 62 L120 92 L74 88 Z" fill="#60a5fa" opacity=".55" />
      {[[70, 45], [110, 50], [135, 70], [95, 74]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#0f172a" opacity=".65" />
      ))}
    </svg>
  );
}

/** Miniatura de la Base de Datos: una rejilla de tablas. */
function PreviewDatos() {
  const cols = ['#7c3aed', '#0284c7', '#2563eb', '#dc2626', '#f59e0b', '#16a34a', '#64748b', '#7c3aed'];
  return (
    <svg viewBox="0 0 200 110" className="w-full h-full">
      <rect width="200" height="110" fill="#f8fafc" />
      {Array.from({ length: 16 }).map((_, i) => {
        const x = 14 + (i % 4) * 46;
        const y = 12 + Math.floor(i / 4) * 24;
        return (
          <g key={i}>
            <rect x={x} y={y} width="38" height="17" rx="3" fill="#fff" stroke="#e2e8f0" />
            <rect x={x + 4} y={y + 4} width="4" height="4" rx="1" fill={cols[i % cols.length]} />
            <rect x={x + 11} y={y + 5} width="21" height="2.5" rx="1.25" fill="#cbd5e1" />
            <rect x={x + 11} y={y + 10} width="14" height="2" rx="1" fill="#e2e8f0" />
          </g>
        );
      })}
    </svg>
  );
}

const VISTAS: Vista[] = [
  {
    to: '/red', label: 'Red de Datos', claim: 'El conocimiento conectado',
    desc: 'Cada tema es una esfera. Acércate y sus publicaciones se despliegan; las líneas dicen si algo es una causa, un dato o una solución.',
    color: '#7c3aed', icon: Globe2, preview: () => <PreviewRed />,
    cifra: s => `${s.grafos} grafos · ${s.ventanas} publicaciones`,
  },
  {
    to: '/mapa', label: 'Geolocalización de Datos', claim: 'El conocimiento en el territorio',
    desc: 'Dónde pasa cada cosa: territorios, indicadores y mediciones sobre el mapa real, del planeta al municipio.',
    color: '#0284c7', icon: MapIcon, preview: () => <PreviewMapa />,
    cifra: s => `${s.territorios} territorios · ${s.indicadores} indicadores`,
  },
  {
    to: '/base-de-datos', label: 'Base de Datos', claim: 'El dato en crudo',
    desc: 'Todas las tablas que sostienen la plataforma, abiertas para inspeccionar. Sin capas: la verdad tal como está guardada.',
    color: '#16a34a', icon: Database, preview: () => <PreviewDatos />,
    cifra: s => `${s.tablas} tablas`,
  },
];

export default function Inicio() {
  const [stats, setStats] = useState<Stats>({ grafos: 0, ventanas: 0, territorios: 0, indicadores: 0, tablas: 0 });

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
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 pt-16 pb-40">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 mb-4">Humanity Wiki</p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter leading-[1.05] text-slate-900">
            Tres formas de mirar
            <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-sky-600 to-emerald-600">el mismo conocimiento</span>
          </h1>
          <p className="text-sm text-slate-500 mt-5 leading-relaxed">
            Conectado, situado en el territorio o en crudo. Elige por dónde entrar —
            <span className="text-slate-700 font-semibold"> es el mismo saber, contado de tres maneras.</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-14">
          {VISTAS.map(v => {
            const Icon = v.icon;
            return (
              <Link
                key={v.to}
                to={v.to}
                className="group rounded-3xl border border-slate-200 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ borderTopWidth: 3, borderTopColor: v.color }}
              >
                <div className="h-32 overflow-hidden bg-slate-50 group-hover:scale-105 transition-transform duration-500">
                  {v.preview(stats)}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color: v.color }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: v.color }}>{v.claim}</span>
                  </div>
                  <p className="text-lg font-black text-slate-900 leading-tight">{v.label}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-2 min-h-[48px]">{v.desc}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                    <span className="text-[10px] font-bold text-slate-400">{v.cifra(stats)}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black transition-all group-hover:gap-2" style={{ color: v.color }}>
                      Entrar <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-12 inline-flex items-center gap-1.5 w-full justify-center">
          <Sparkles className="w-3 h-3 text-emerald-500" />
          ¿Buscas un tema concreto? Pídeselo a la IA en la barra de abajo y lo construye contigo.
        </p>
      </div>
    </div>
  );
}
