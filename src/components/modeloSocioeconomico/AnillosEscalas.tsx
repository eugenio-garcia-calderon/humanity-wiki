// The eight scales as nested rings, from the person (centre) to the planet
// (outside). The memorable thing of the page: the three tiers in the middle,
// and the same eighth going to each ring. Tap or hover a ring to read it.
import { useId } from 'react';
import { ESCALAS, type EscalaId } from '../../data/modeloSocioeconomico';

const R0 = 82; // radius of the centre disc
const ANCHO = 34; // width of each ring
const HUECO = 2; // white gap between rings

function anillo(r1: number, r2: number) {
  // Two full circles, the inner one reversed: an annulus with evenodd.
  const c = (r: number) => `M ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 Z`;
  return `${c(r2)} ${c(r1)}`;
}

export function AnillosEscalas({ activa, onActiva, className }: {
  activa: EscalaId | null; onActiva: (e: EscalaId | null) => void; className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const total = R0 + ESCALAS.length * ANCHO + 4;
  return (
    <svg viewBox={`${-total} ${-total} ${total * 2} ${total * 2}`} className={className} role="group" aria-label="Las ocho escalas del modelo, de la persona al planeta">
      <style>{`
        @keyframes ${uid}-crece { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: no-preference) { .${uid}-a { animation: ${uid}-crece .7s cubic-bezier(.2,.7,.2,1) both; } }
      `}</style>
      {[...ESCALAS].reverse().map((e, iRev) => {
        const i = ESCALAS.length - 1 - iRev;
        const r1 = R0 + i * ANCHO + HUECO / 2;
        const r2 = R0 + (i + 1) * ANCHO - HUECO / 2;
        const rm = (r1 + r2) / 2 - 5; // text baseline sits a little low so caps centre in the ring
        const apagado = activa && activa !== e.id;
        const idTexto = `${uid}-t${i}`;
        return (
          <g
            key={e.id}
            role="button"
            tabIndex={0}
            aria-label={`${e.nombre}: un octavo de lo recaudado`}
            aria-pressed={activa === e.id}
            className={`${uid}-a cursor-pointer outline-none [&:focus-visible>path.anillo]:stroke-slate-900 [&:focus-visible>path.anillo]:stroke-[3]`}
            style={{ animationDelay: `${120 + i * 70}ms`, transformOrigin: '0 0', transformBox: 'view-box' }}
            onMouseEnter={() => onActiva(e.id)}
            onMouseLeave={() => onActiva(null)}
            onFocus={() => onActiva(e.id)}
            onBlur={() => onActiva(null)}
            onClick={() => onActiva(activa === e.id ? null : e.id)}
            onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onActiva(activa === e.id ? null : e.id); } }}
          >
            <path className="anillo" d={anillo(r1, r2)} fillRule="evenodd" fill={e.color} stroke="white" strokeWidth={0}
              style={{ opacity: apagado ? 0.28 : 1, transition: 'opacity .2s' }} />
            <path id={idTexto} d={`M ${-rm} 0 A ${rm} ${rm} 0 1 1 ${rm} 0`} fill="none" />
            <text fontSize={15} fontWeight={650} letterSpacing=".02em" fill={e.tinta} style={{ opacity: apagado ? 0.4 : 1, pointerEvents: 'none' }}>
              <textPath href={`#${idTexto}`} startOffset="50%" textAnchor="middle">{e.corto}</textPath>
            </text>
          </g>
        );
      })}
      <g className={`${uid}-a`} style={{ transformOrigin: '0 0', transformBox: 'view-box', pointerEvents: 'none' }}>
        <circle r={R0 - HUECO} fill="white" />
        <text y={2} textAnchor="middle" fontSize={29} fontWeight={800} letterSpacing="-0.03em" className="fill-slate-900">10 · 25 · 40</text>
        <text y={26} textAnchor="middle" fontSize={13.5} className="fill-slate-600">% según el tramo</text>
      </g>
    </svg>
  );
}
