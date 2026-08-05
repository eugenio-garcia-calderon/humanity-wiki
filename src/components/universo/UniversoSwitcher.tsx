import { Link } from 'react-router-dom';

// Conmutador entre las versiones del Universo (I cosmos · II pulso · III esfera).
export default function UniversoSwitcher({ current, dark }: { current: 1 | 2 | 3; dark?: boolean }) {
  const versions: Array<{ n: 1 | 2 | 3; to: string; label: string }> = [
    { n: 1, to: '/universo', label: 'I' },
    { n: 2, to: '/universo-2', label: 'II' },
    { n: 3, to: '/universo-3', label: 'III' },
  ];
  return (
    <div
      className={`absolute top-4 right-4 z-20 flex items-center gap-0.5 rounded-full p-1 backdrop-blur border ${
        dark ? 'bg-slate-950/70 border-slate-700/70' : 'bg-white/80 border-slate-200'
      }`}
      title="Versiones del Universo"
    >
      {versions.map(v => (
        <Link
          key={v.n}
          to={v.to}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
            v.n === current
              ? 'bg-emerald-600 text-white'
              : dark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          {v.label}
        </Link>
      ))}
    </div>
  );
}
