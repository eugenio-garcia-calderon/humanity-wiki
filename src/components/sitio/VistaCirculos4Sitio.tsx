import { useState } from 'react';
import type { Circulo } from './VistaCirculosSitio';
import { PanelCirculo, useCirculoElegido, useCirculosTerritorio } from './PanelCirculo';

// ============================================================================
// CÍRCULO 4.0 (2026-10-28, Eugenio)
// ============================================================================
// «En vez de círculos, representaciones de cada aspecto, de abajo arriba: abajo
// Personas con una personita, luego Hogar, Sociedad, Tecnología y arriba Ecología,
// cada uno con su ilustración. Y en vez de un círculo, un arco de unos 60 grados
// que va de abajo arriba: los mismos anillos, pero partidos; al ser un arco puede
// ser mucho más grande y dejar sitio a las ilustraciones.» El centro de los anillos
// queda abajo, fuera del dibujo: cada capa es una franja curva, más ancha cuanto
// más arriba. Las ilustraciones (de una línea, como las portadas) están en
// `public/circulos/<clave>.svg`; las genera `portadas-ilustraciones/grupos.py`.

const MEDIO = 28;          // medio ángulo del arco, en grados (56° en total, los «unos 60» que pidió Eugenio)
const R0 = 200, R1 = 1000; // radio del borde de abajo de Personas y del de arriba de Ecología
const PAD = 8;
const ANCHO = 2 * R1 * Math.sin(MEDIO * Math.PI / 180) + 2 * PAD;
const ALTO = R1 - R0 * Math.cos(MEDIO * Math.PI / 180) + 2 * PAD;
const CX = ANCHO / 2, CY = R1 + PAD; // el centro de los anillos, abajo
const polar = (r: number, a: number) => [CX + r * Math.sin(a * Math.PI / 180), CY - r * Math.cos(a * Math.PI / 180)];
const f = (n: number) => n.toFixed(1);
function franja(r1: number, r2: number) {
  const [x1, y1] = polar(r2, -MEDIO), [x2, y2] = polar(r2, MEDIO), [x3, y3] = polar(r1, MEDIO), [x4, y4] = polar(r1, -MEDIO);
  return `M${f(x1)} ${f(y1)}A${r2} ${r2} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r1} ${r1} 0 0 0 ${f(x4)} ${f(y4)}Z`;
}
const ILUSTRADOS = new Set(['personas', 'hogar', 'sociedad', 'tecnologia', 'ecologia', 'planeta']);
const dibujoCirculo = (clave: string) => (ILUSTRADOS.has(clave) ? `/circulos/${clave === 'planeta' ? 'ecologia' : clave}.svg` : null);

/** El arco: una franja por círculo, de Personas (abajo) a Ecología (arriba), con su ilustración y su nombre.
 *  También lo usa Círculo 5.0, con sus cuatro patas y sus dibujos (`dibujoDe`). */
export function Arco({ circulos, elegido, elegir, ver, dibujoDe = dibujoCirculo }: {
  circulos: Circulo[]; elegido: number; elegir: (i: number) => void; ver: (i: number) => void; dibujoDe?: (clave: string) => string | null;
}) {
  const [encima, setEncima] = useState<number | null>(null);
  const n = circulos.length, grosor = (R1 - R0) / n;
  return (
    <svg viewBox={`0 0 ${f(ANCHO)} ${f(ALTO)}`} className="mx-auto block h-auto w-full max-h-[calc(100dvh-150px)]" role="group" aria-label="Elige una capa" data-arco-c4>
      {/* La capa elegida, la última: así su borde no queda tapado por la de encima. */}
      {[...circulos.keys()].sort((a, b) => Number(a === elegido) - Number(b === elegido)).map(i => {
        const c = circulos[i];
        const r1 = R0 + i * grosor, r2 = r1 + grosor, rm = (r1 + r2) / 2;
        const on = i === elegido, sobre = i === encima && !on;
        const y = CY - rm;
        const dibujo = dibujoDe(c.clave);
        const altoDibujo = grosor * 0.56, anchoDibujo = altoDibujo * 1.6;
        return (
          <g key={c.clave} role="button" tabIndex={0} aria-pressed={on} aria-label={c.nombre}
            className="cursor-pointer outline-none [&:focus-visible>path]:stroke-slate-400"
            onClick={() => elegir(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(i); } }}
            onMouseEnter={() => { setEncima(i); ver(i); }} onMouseLeave={() => setEncima(null)} data-capa-c4={c.clave}>
            <path d={franja(r1, r2)} fill={on ? '#ffffff' : sobre ? '#e2e8f0' : i % 2 ? '#eef2f6' : '#f6f8fa'}
              stroke={on ? '#0f172a' : '#ffffff'} strokeWidth={on ? 7 : 10} strokeLinejoin="round" style={{ transition: 'fill .15s ease' }} />
            {dibujo && <image href={dibujo} x={CX - anchoDibujo / 2} y={y - grosor * 0.42} width={anchoDibujo} height={altoDibujo} preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }} />}
            {/* La letra, la que quepa en el ancho de la franja a esa altura (la de abajo es la más estrecha). */}
            <text x={CX} y={y + grosor * 0.36} textAnchor="middle" fontSize={Math.min(40, (2 * (rm - grosor * 0.36) * Math.sin(MEDIO * Math.PI / 180) * 0.86) / (c.nombre.length * 0.6))} fontWeight={800} fill={on ? '#0f172a' : '#334155'} style={{ pointerEvents: 'none' }}>{c.nombre}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function VistaCirculos4Sitio({ raizId }: { raizId: string }) {
  const t = useCirculosTerritorio(raizId);
  const { circulos } = t;
  const { elegido, ver, elegir } = useCirculoElegido(circulos, 'data-circulo-elegido-c4');
  if (!circulos) return <div className="py-24 text-center text-slate-400">Cargando…</div>;
  if (!circulos.length) return <div className="py-24 text-center text-slate-500">Los sistemas aún no tienen círculo: añade a su base de datos una columna de selección «Círculo».</div>;
  const c = circulos[Math.min(elegido, circulos.length - 1)];
  return (
    <div className="mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-start gap-6 pt-1 lg:grid-cols-[minmax(0,9fr)_minmax(0,11fr)] lg:gap-10" data-vista-circulos4>
      <div className="mx-auto w-full max-w-[520px] lg:sticky lg:top-24 lg:mx-0">
        <Arco circulos={circulos} elegido={elegido} elegir={elegir} ver={ver} />
      </div>
      <PanelCirculo c={c} t={t} compacto ancla="data-circulo-elegido-c4" />
    </div>
  );
}
