import { useState } from 'react';
import type { Circulo } from './circulosDatos';

// ============================================================================
// EL ARCO DE CAPAS (nació con Círculo 4.0, 2026-10-28; hoy es el de la vista «Círculo»)
// ============================================================================
// «En vez de círculos, representaciones de cada aspecto, de abajo arriba, cada uno
// con su ilustración; y en vez de un círculo, un arco de unos 60 grados: los mismos
// anillos, pero partidos; al ser un arco puede ser mucho más grande y dejar sitio a
// las ilustraciones.» El centro de los anillos queda abajo, fuera del dibujo: cada
// capa es una franja curva, más ancha cuanto más arriba. Las ilustraciones (de una
// línea, como las portadas) están en `public/circulos/<clave>.svg`; las genera
// `portadas-ilustraciones/grupos.py`.

// EL CENTRO, LEJOS (2026-10-28, Eugenio: «que Humanología tenga el mismo tamaño que el resto; que el centro esté más
// lejos de Humanología y así los anillos de abajo sean más grandes: una proporción mucho más igual entre el corte de
// arriba y el de abajo»). Antes el centro estaba a 200 del borde de abajo y a 1.000 del de arriba: la capa de abajo
// era cinco veces más estrecha que la de arriba y su nombre no cabía. Ahora, a 700 y 1.500, la diferencia es de
// poco más del doble y todas las capas llevan la misma letra.
const MEDIO = 20;          // medio ángulo del arco, en grados
const R0 = 700, R1 = 1500; // radio del borde de abajo de la capa de dentro y del de arriba de la de fuera
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

/** El arco: una franja por capa, de la de dentro (abajo) a la de fuera (arriba), con su ilustración y su nombre. */
export function Arco({ circulos, elegido, elegir, ver, dibujoDe }: {
  circulos: Circulo[]; elegido: number; elegir: (i: number) => void; ver: (i: number) => void; dibujoDe: (clave: string) => string | null;
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
            className="cursor-pointer outline-none [&:focus-visible>path]:stroke-[#3b82c4]"
            onClick={() => elegir(i)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(i); } }}
            onMouseEnter={() => { setEncima(i); ver(i); }} onMouseLeave={() => setEncima(null)} data-capa-c4={c.clave}>
            {/* La elegida, blanca y con el borde del azul de las ilustraciones (2026-10-28, Eugenio). */}
            <path d={franja(r1, r2)} fill={on ? '#ffffff' : sobre ? '#e2e8f0' : i % 2 ? '#eef2f6' : '#f6f8fa'}
              stroke={on ? '#3b82c4' : '#ffffff'} strokeWidth={on ? 8 : 10} strokeLinejoin="round" style={{ transition: 'fill .15s ease' }} />
            {dibujo && <image href={dibujo} x={CX - anchoDibujo / 2} y={y - grosor * 0.42} width={anchoDibujo} height={altoDibujo} preserveAspectRatio="xMidYMid meet" style={{ pointerEvents: 'none' }} />}
            {/* La letra, la que quepa en el ancho de la franja a esa altura (la de abajo es la más estrecha). */}
            <text x={CX} y={y + grosor * 0.36} textAnchor="middle" fontSize={Math.min(40, (2 * (rm - grosor * 0.36) * Math.sin(MEDIO * Math.PI / 180) * 0.86) / (c.nombre.length * 0.6))} fontWeight={800} fill={on ? '#0f172a' : '#334155'} style={{ pointerEvents: 'none' }}>{c.nombre}</text>
          </g>
        );
      })}
    </svg>
  );
}
