import { useState } from 'react';
import type { Circulo } from './VistaCirculosSitio';
import { PanelCirculo, useCirculoElegido, useCirculosTerritorio } from './PanelCirculo';

// ============================================================================
// CÍRCULO 3.0 (2026-10-28, Eugenio)
// ============================================================================
// «Los círculos con los nombres, sin la nota; anillos más gordos y sin los colores
// de las notas: que sea simplemente un selector. Sin título ni subtítulo, sin
// "círculo 4 de 5"; encima de las tarjetas, "Tecnología en España" y su nota en
// la misma línea; las tarjetas más compactas, que se vean todas sin bajar; el
// círculo más a la izquierda y un 60 % del ancho para las tarjetas.» Se hizo
// aparte de Círculo 2.0 para poder compararlas. El territorio se elige en el
// título y el círculo, como cuenta `PanelCirculo.tsx`.

const C = 500, R0 = 112, R1 = 496; // centro y radios del círculo del centro y del último

/** El selector: cinco anillos grises con su nombre; el elegido, en negro. */
function Selector({ circulos, elegido, elegir, ver }: { circulos: Circulo[]; elegido: number; elegir: (i: number) => void; ver: (i: number) => void }) {
  const [encima, setEncima] = useState<number | null>(null);
  const n = circulos.length, paso = (R1 - R0) / Math.max(1, n - 1);
  const radio = (i: number) => R0 + paso * i;
  return (
    <svg viewBox="0 0 1000 1000" className="block h-auto w-full" role="group" aria-label="Elige un círculo" data-circulos-c3>
      {[...circulos.keys()].reverse().map(i => {
        const c = circulos[i];
        const on = i === elegido, sobre = i === encima && !on;
        const r = radio(i), rDentro = i === 0 ? 0 : radio(i - 1);
        const y = i === 0 ? C : C - (r + rDentro) / 2; // el nombre, en medio de su anillo, arriba
        return (
          <g key={c.clave} role="button" tabIndex={0} aria-pressed={on} aria-label={c.nombre}
            className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-slate-400"
            onClick={() => elegir(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(i); } }}
            onMouseEnter={() => { setEncima(i); ver(i); }} onMouseLeave={() => setEncima(null)} data-anillo-c3={c.clave}>
            <circle cx={C} cy={C} r={r} fill={on ? '#0f172a' : sobre ? '#cbd5e1' : i % 2 ? '#e8edf3' : '#f1f5f9'} stroke="#fff" strokeWidth={10}
              style={{ transition: 'fill .15s ease' }} />
            <text x={C} y={y + 15} textAnchor="middle" fontSize={i === 0 ? 40 : 42} fontWeight={800} fill={on ? '#fff' : '#334155'}>{c.nombre}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function VistaCirculos3Sitio({ raizId }: { raizId: string }) {
  const t = useCirculosTerritorio(raizId);
  const { circulos } = t;
  const { elegido, ver, elegir } = useCirculoElegido(circulos, 'data-circulo-elegido-c3');
  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando los círculos…</div>;
  if (!circulos.length) return <div className="py-24 text-center text-slate-500">Los sistemas aún no tienen círculo: añade a su base de datos una columna de selección «Círculo».</div>;
  const c = circulos[Math.min(elegido, circulos.length - 1)];
  return (
    <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-start gap-6 pt-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-10" data-vista-circulos3>
      <div className="mx-auto w-full max-w-[440px] lg:sticky lg:top-28 lg:mx-0">
        <Selector circulos={circulos} elegido={elegido} elegir={elegir} ver={ver} />
      </div>
      <PanelCirculo c={c} t={t} compacto ancla="data-circulo-elegido-c3" />
    </div>
  );
}
